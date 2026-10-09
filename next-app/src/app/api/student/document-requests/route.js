import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { query, queryOne, transaction } from "@/lib/postgres";
import { writeGlobalAuditLog } from "@/lib/auditLogRequest";
import { requireStudent, createAuthErrorResponse } from "@/lib/authHelpers";
import { canAccessResource } from "@/lib/resourceAuthorization";
import { decryptPII, encryptPII } from "@/lib/piiEncryption";

export const runtime = "nodejs";

function decryptField(val) {
  if (!val || typeof val !== "string") return val;
  return decryptPII(val);
}

function requestAttachmentsDir() {
  const localDir = process.env.LOCAL_DATA_DIR || path.join(process.cwd(), ".local");
  const dir = path.join(localDir, "storage", "registrar", "request_attachments");
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export async function GET(req) {
  const access = await requireStudent(req);
  if (access.error || !access.user) return createAuthErrorResponse(access.error || "Student authentication required", access.error?.startsWith("Access denied") ? 403 : 401);
  const session = { accountId: access.user.accountId, studentNo: access.user.studentNo, email: access.user.email };

  let accountId = session.accountId;
  let studentNo = session.studentNo;
  const email = session.email;

  if (!accountId && email) {
    const acc = await queryOne(
      `SELECT sa.id, sa.student_no
         FROM student_accounts sa
         JOIN student_identity_profiles sip ON sip.id = sa.identity_profile_id
        WHERE sip.email = $1 OR lower(coalesce(sip.email, '')) = lower($2)`,
      [encryptPII(email.toLowerCase()), email]
    );
    if (acc) {
      accountId = acc.id;
      studentNo = studentNo || acc.student_no;
    }
  }

  const requests = await query(
    `SELECT dr.*, d.approval_status AS linked_document_status,
            COALESCE(dr.course_code, s.course_code) AS course_code,
            c.name AS course_name,
            rf.id AS feedback_id,
            rf.rating AS feedback_rating,
            rf.aspect_tags AS feedback_aspect_tags,
            rf.comments AS feedback_comments,
            rf.created_at AS feedback_created_at
     FROM document_requests dr
     LEFT JOIN documents d ON d.id = dr.linked_document_id AND d.office_id = 'registrar'
     LEFT JOIN students s ON s.student_no = dr.student_no
     LEFT JOIN courses c ON c.code = COALESCE(dr.course_code, s.course_code)
     LEFT JOIN document_request_feedback rf ON rf.document_request_id = dr.id
     WHERE dr.office_id = 'registrar'
       AND dr.identity_profile_id = $1
     ORDER BY dr.created_at DESC`,
    [access.user.identityProfileId]
  );
  const authorizedRequests = requests.filter((item) => canAccessResource(access.user, "request", item));

  const studentNos = Array.from(
    new Set([studentNo, ...authorizedRequests.map((r) => r.student_no)].filter(Boolean))
  );

  const documents = studentNos.length
    ? (await query(
        "SELECT * FROM documents WHERE office_id = 'registrar' AND student_no = ANY($1::text[]) ORDER BY created_at DESC",
        [studentNos]
      )).filter((item) => canAccessResource(access.user, "document", item))
    : [];

  const ids = authorizedRequests.map((item) => item.id);
  const updates = ids.length
    ? await query(
        "SELECT * FROM transaction_updates WHERE document_request_id = ANY($1::bigint[]) ORDER BY created_at ASC",
        [ids]
      )
    : [];
  const updatesByRequest = updates.reduce((grouped, item) => {
    const key = String(item.document_request_id);
    (grouped[key] ||= []).push(item);
    return grouped;
  }, {});

  const attachmentRows = ids.length
    ? await query(
        "SELECT * FROM document_request_attachments WHERE document_request_id = ANY($1::bigint[]) ORDER BY created_at ASC",
        [ids]
      )
    : [];
  const attachmentsByRequest = attachmentRows.reduce((grouped, item) => {
    const key = String(item.document_request_id);
    (grouped[key] ||= []).push({
      ...item,
      url: `/api/document-requests/${item.document_request_id}/attachments/${item.id}`,
    });
    return grouped;
  }, {});

  authorizedRequests.forEach((item) => {
    const safeVal = (v) => (v && typeof v === "string" && !v.startsWith("enc:v1:") ? v.trim() : null);
    item.requester_name = safeVal(decryptField(item.requester_name)) || "Student / Alumnus";
    item.updates = updatesByRequest[String(item.id)] || [];
    item.attachments = attachmentsByRequest[String(item.id)] || [];
    item.feedback = item.feedback_id
      ? {
          id: item.feedback_id,
          rating: item.feedback_rating,
          aspect_tags: item.feedback_aspect_tags || [],
          comments: item.feedback_comments,
          created_at: item.feedback_created_at,
        }
      : null;
  });

  return NextResponse.json({ ok: true, data: { requests: authorizedRequests, documents } });
}

export async function POST(req) {
  const access = await requireStudent(req);
  if (access.error || !access.user) return createAuthErrorResponse(access.error || "Student authentication required", access.error?.startsWith("Access denied") ? 403 : 401);
  const session = { accountId: access.user.accountId, studentNo: access.user.studentNo, email: access.user.email };

  let body = {};
  const uploadedFiles = [];
  const contentType = req.headers.get("content-type") || "";

  if (contentType.includes("multipart/form-data")) {
    const form = await req.formData().catch(() => null);
    if (form) {
      body.studentNo = form.get("studentNo");
      body.docType = form.get("docType");
      body.notes = form.get("notes") || form.get("description");
      body.clientType = form.get("clientType");
      body.courseCode = form.get("courseCode");
      body.requesterName = form.get("requesterName");
      body.requesterRelationship = form.get("requesterRelationship");
      body.requesterContact = form.get("requesterContact");

      const files = form.getAll("files");
      const fileTypes = form.getAll("file_types");

      files.forEach((file, idx) => {
        if (file && typeof file === "object" && typeof file.arrayBuffer === "function" && file.size > 0) {
          uploadedFiles.push({
            file,
            attachmentType: String(fileTypes[idx] || "evidence").trim(),
          });
        }
      });
    }
  } else {
    body = (await req.json().catch(() => null)) || {};
  }

  const requestedClientType = String(body?.clientType || "").trim();
  const requestedStudentNo = String(body?.studentNo || "").trim().toUpperCase() || null;
  const docType = String(body?.docType || "").trim();
  const notes = String(body?.notes || body?.description || "").trim();
  const courseCode = String(body?.courseCode || "").trim().toUpperCase() || null;
  const requesterRelationship = String(body?.requesterRelationship || "").trim() || null;
  const requesterContact = String(body?.requesterContact || "").trim() || null;

  let accountId = session.accountId;
  let acc = null;
  if (accountId) {
    acc = await queryOne(
      `SELECT sa.id, sip.first_name, sip.middle_name, sip.last_name, sip.email, sip.client_type, sa.student_no
         FROM student_accounts sa
         JOIN student_identity_profiles sip ON sip.id = sa.identity_profile_id
        WHERE sa.id = $1`,
      [accountId]
    );
  } else if (session.email) {
    acc = await queryOne(
      `SELECT sa.id, sip.first_name, sip.middle_name, sip.last_name, sip.email, sip.client_type, sa.student_no
         FROM student_accounts sa
         JOIN student_identity_profiles sip ON sip.id = sa.identity_profile_id
        WHERE sip.email = $1 OR lower(coalesce(sip.email, '')) = lower($2)`,
      [encryptPII(session.email.toLowerCase()), session.email]
    );
    if (acc) accountId = acc.id;
  }

  const clientType = requestedClientType || acc?.client_type || (session.studentNo && session.studentNo.startsWith("ALUM-") ? "Alumni" : "Student");

  if (!clientType) {
    return NextResponse.json({ ok: false, error: "Client type is required." }, { status: 400 });
  }

  // Determine effective student number based on client type
  const effectiveStudentNo = (clientType === "Parent" && requestedStudentNo) ? requestedStudentNo : (session.studentNo || requestedStudentNo);

  if (clientType !== "Parent" && requestedStudentNo && session.studentNo && requestedStudentNo !== session.studentNo) {
    return NextResponse.json({ ok: false, error: "Student identity is taken from the authenticated account." }, { status: 403 });
  }

  if (clientType === "Parent") {
    if (!effectiveStudentNo) {
      return NextResponse.json(
        { ok: false, error: "Student Number of the student whose records are being requested is required." },
        { status: 400 }
      );
    }
    if (!requesterRelationship) {
      return NextResponse.json(
        { ok: false, error: "Relationship to student (e.g. Mother, Father, Legal Guardian) is required for parent/guardian requests." },
        { status: 400 }
      );
    }
    // Mandatory Special Power of Attorney / Authorization document check
    const hasSpaAttachment = uploadedFiles.some(
      (f) => f.attachmentType === "spa" || f.attachmentType === "valid_id" || f.file.name.toLowerCase().includes("spa") || f.file.name.toLowerCase().includes("power") || f.file.name.toLowerCase().includes("auth")
    );
    if (uploadedFiles.length === 0 || !hasSpaAttachment) {
      return NextResponse.json(
        {
          ok: false,
          error: "Under RA 10173 (Data Privacy Act) and University Policy, third-party requests submitted by parents or guardians strictly require an attached Special Power of Attorney (SPA) / Authorization Letter and valid government ID.",
        },
        { status: 400 }
      );
    }
  }

  if (clientType === "Alumni" && !effectiveStudentNo && !courseCode) {
    return NextResponse.json(
      { ok: false, error: "Degree / academic program is required for alumni without a student number." },
      { status: 400 }
    );
  }

  if (!docType) {
    return NextResponse.json({ ok: false, error: "Document type is required." }, { status: 400 });
  }

  if (!notes) {
    return NextResponse.json(
      { ok: false, error: "Description / purpose of request is required." },
      { status: 400 }
    );
  }

  const validType = await queryOne(
    "SELECT id, name, is_requestable, is_compliance FROM document_types WHERE office_id = 'registrar' AND name = $1 AND status = 'Active'",
    [docType]
  );
  if (!validType) {
    return NextResponse.json({ ok: false, error: "Invalid document type." }, { status: 400 });
  }
  if (!validType.is_requestable || validType.is_compliance) {
    return NextResponse.json(
      {
        ok: false,
        error: `'${validType.name}' is an inward compliance requirement (not an issuable credential) and cannot be requested online. Please submit it through the Compliance Checklist or visit the Registrar counter (Room 102).`,
      },
      { status: 400 }
    );
  }

  const accFirst = acc?.first_name ? decryptPII(acc.first_name) : "";
  const accMiddle = acc?.middle_name ? decryptPII(acc.middle_name) : "";
  const accLast = acc?.last_name ? decryptPII(acc.last_name) : "";
  const accEmail = acc?.email ? decryptPII(acc.email) : decryptPII(session.email || "");
  const accFullName = [accFirst, accMiddle, accLast].filter(Boolean).join(" ");
  const defaultRequesterName = accFullName || accEmail || null;
  const rawBodyName = body?.requesterName ? decryptField(String(body.requesterName).trim()) : null;
  const finalRequesterName = rawBodyName || defaultRequesterName;

  const createdPaths = [];
  let request;
  let savedAttachments = [];
  try {
    const preparedAttachments = [];
    for (const item of uploadedFiles) {
      const buffer = Buffer.from(await item.file.arrayBuffer());
      const ext = path.extname(item.file.name) || ".pdf";
      const storageFilename = `${crypto.randomUUID()}${ext}`;
      const destPath = path.join(requestAttachmentsDir(), storageFilename);
      fs.writeFileSync(destPath, buffer, { flag: "wx" });
      createdPaths.push(destPath);
      preparedAttachments.push({
        originalFilename: item.file.name,
        storageFilename,
        mimeType: item.file.type || "application/octet-stream",
        sizeBytes: buffer.length,
        attachmentType: item.attachmentType || "evidence",
      });
    }

    const result = await transaction(async ({ query: run, queryOne: runOne }) => {
      if (effectiveStudentNo) {
        const existingStudent = await runOne(
          "SELECT student_no FROM students WHERE upper(student_no) = upper($1)",
          [effectiveStudentNo],
        );
        if (!existingStudent) {
          const studentDisplayName = finalRequesterName || effectiveStudentNo;
          await run(
            `INSERT INTO students (student_no, name, status, course_code)
             VALUES ($1, $2, 'Active', $3)
             ON CONFLICT (student_no) DO NOTHING`,
            [effectiveStudentNo, encryptPII(studentDisplayName), courseCode || null],
          );
        }
      }

      const createdRequest = await runOne(
        `INSERT INTO document_requests (
           office_id, student_no, doc_type, status, notes, client_type, course_code, requester_name, requester_relationship, requester_contact, identity_profile_id
         ) VALUES ('registrar', $1, $2, 'Pending', $3, $4, $6, $7, $8, $9,
           COALESCE(
             (SELECT identity_profile_id FROM student_accounts WHERE id = $5),
             (SELECT identity_profile_id FROM students WHERE student_no = $1)
           )) RETURNING *`,
        [
          effectiveStudentNo,
          docType,
          notes,
          clientType,
          accountId || null,
          courseCode,
          finalRequesterName,
          requesterRelationship,
          requesterContact,
        ],
      );
      if (!createdRequest || !canAccessResource(access.user, "request", createdRequest)) {
        throw new Error("Request could not be completed");
      }

      const attachments = [];
      for (const item of preparedAttachments) {
        attachments.push(await runOne(
          `INSERT INTO document_request_attachments (
             document_request_id, original_filename, storage_filename, mime_type,
             size_bytes, attachment_type, uploaded_by
           ) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
          [
            createdRequest.id,
            item.originalFilename,
            item.storageFilename,
            item.mimeType,
            item.sizeBytes,
            item.attachmentType,
            finalRequesterName || access.user.email || "Requester",
          ],
        ));
      }

      const initialMessage = attachments.length > 0
        ? `Request submitted with ${attachments.length} supporting attachment(s)${clientType === "Parent" ? " including Special Power of Attorney (SPA)" : ""}.`
        : "Request submitted.";
      await run(
        `INSERT INTO transaction_updates (document_request_id, status, message)
         VALUES ($1, 'Pending', $2)`,
        [createdRequest.id, initialMessage],
      );
      return { request: createdRequest, attachments };
    });
    request = result.request;
    savedAttachments = result.attachments;
  } catch (error) {
    for (const filePath of createdPaths) {
      try { fs.unlinkSync(filePath); } catch {}
    }
    console.error("Student document request creation failed:", error);
    return NextResponse.json({ ok: false, error: "Request could not be completed" }, { status: 500 });
  }

  try {
    await writeGlobalAuditLog(req, "Student document request created", {
      actor: accEmail || effectiveStudentNo || "Requester",
      role: "Student",
      officeId: "registrar",
      details: `Requested ${docType} (${clientType})${effectiveStudentNo ? ` for ${effectiveStudentNo}` : ""}${savedAttachments.length > 0 ? ` with ${savedAttachments.length} attachment(s)` : ""}`,
      entity_type: "document_request",
      entity_id: String(request.id),
    });
  } catch (error) {
    console.error("Student document request audit log failed:", error);
  }

  request.attachments = savedAttachments;
  return NextResponse.json({ ok: true, data: request }, { status: 201 });
}
