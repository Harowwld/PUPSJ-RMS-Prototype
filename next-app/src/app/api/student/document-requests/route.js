import { NextResponse } from "next/server";
import { getStudentSession } from "@/lib/studentAuth";
import { query, queryOne } from "@/lib/postgres";
import { writeGlobalAuditLog } from "@/lib/auditLogRequest";
import { requireStudent, createAuthErrorResponse } from "@/lib/authHelpers";
import { canAccessResource } from "@/lib/resourceAuthorization";

export const runtime = "nodejs";

export async function GET(req) {
  const access = await requireStudent(req);
  if (access.error || !access.user) return createAuthErrorResponse(access.error || "Student authentication required", access.error?.startsWith("Access denied") ? 403 : 401);
  const session = { accountId: access.user.accountId, studentNo: access.user.studentNo, email: access.user.email };

  let accountId = session.accountId;
  let studentNo = session.studentNo;
  const email = session.email;

  if (!accountId && email) {
    const acc = await queryOne(
      "SELECT id, student_no FROM student_accounts WHERE lower(coalesce(email, '')) = lower($1)",
      [email]
    );
    if (acc) {
      accountId = acc.id;
      studentNo = studentNo || acc.student_no;
    }
  }

  const requests = await query(
    `SELECT dr.*, d.approval_status AS linked_document_status,
            COALESCE(dr.course_code, s.course_code) AS course_code,
            c.name AS course_name
     FROM document_requests dr
     LEFT JOIN documents d ON d.id = dr.linked_document_id AND d.office_id = 'registrar'
     LEFT JOIN students s ON s.student_no = dr.student_no
     LEFT JOIN courses c ON c.code = COALESCE(dr.course_code, s.course_code)
     WHERE dr.office_id = 'registrar'
       AND (
         (dr.student_account_id IS NOT NULL AND dr.student_account_id = $1)
         OR ($2::text IS NOT NULL AND dr.student_no = $2)
       )
     ORDER BY dr.created_at DESC`,
    [accountId, studentNo]
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
  authorizedRequests.forEach((item) => {
    item.updates = updatesByRequest[String(item.id)] || [];
  });

  return NextResponse.json({ ok: true, data: { requests: authorizedRequests, documents } });
}

export async function POST(req) {
  const access = await requireStudent(req);
  if (access.error || !access.user) return createAuthErrorResponse(access.error || "Student authentication required", access.error?.startsWith("Access denied") ? 403 : 401);
  const session = { accountId: access.user.accountId, studentNo: access.user.studentNo, email: access.user.email };

  const body = await req.json().catch(() => null);
  const requestedStudentNo = String(body?.studentNo || "").trim().toUpperCase() || null;
  const studentNo = session.studentNo || null;
  const docType = String(body?.docType || "").trim();
  const notes = String(body?.notes || body?.description || "").trim();
  const requestedClientType = String(body?.clientType || "").trim();
  const courseCode = String(body?.courseCode || "").trim().toUpperCase() || null;

  let accountId = session.accountId;
  let acc = null;
  if (accountId) {
    acc = await queryOne(
      "SELECT id, first_name, middle_name, last_name, email, client_type, student_no FROM student_accounts WHERE id = $1",
      [accountId]
    );
  } else if (session.email) {
    acc = await queryOne(
      "SELECT id, first_name, middle_name, last_name, email, client_type, student_no FROM student_accounts WHERE lower(coalesce(email, '')) = lower($1)",
      [session.email]
    );
    if (acc) accountId = acc.id;
  }

  const clientType = acc?.client_type || (studentNo && studentNo.startsWith("ALUM-") ? "Alumni" : "Student");

  if (requestedStudentNo && requestedStudentNo !== studentNo) {
    return NextResponse.json({ ok: false, error: "Student identity is taken from the authenticated account." }, { status: 403 });
  }

  if (!clientType) {
    return NextResponse.json({ ok: false, error: "Client type is required." }, { status: 400 });
  }

  if (clientType === "Alumni" && !studentNo && !courseCode) {
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
    "SELECT id FROM document_types WHERE office_id = 'registrar' AND name = $1 AND status = 'Active'",
    [docType]
  );
  if (!validType) {
    return NextResponse.json({ ok: false, error: "Invalid document type." }, { status: 400 });
  }

  // If a student number is provided, ensure the student record exists in students table
  if (studentNo) {
    const existingStudent = await queryOne("SELECT student_no, course_code FROM students WHERE upper(student_no) = upper($1)", [studentNo]);
    if (!existingStudent) {
      const studentName = [acc?.first_name, acc?.middle_name, acc?.last_name].filter(Boolean).join(" ") || acc?.email || studentNo;
      await query(
        `INSERT INTO students (student_no, name, status, course_code)
         VALUES ($1, $2, 'Active', $3)
         ON CONFLICT (student_no) DO NOTHING`,
        [studentNo, studentName, courseCode || null]
      );
    }
  }

  const requesterName = [acc?.first_name, acc?.middle_name, acc?.last_name].filter(Boolean).join(" ") || acc?.email || null;
  const request = await queryOne(
    `INSERT INTO document_requests (office_id, student_no, doc_type, status, notes, client_type, student_account_id, course_code, requester_name)
     VALUES ('registrar', $1, $2, 'Pending', $3, $4, $5, $6, $7) RETURNING *`,
    [studentNo, docType, notes, clientType, accountId || null, courseCode, requesterName]
  );
  if (!request || !canAccessResource(access.user, "request", request)) {
    return NextResponse.json({ ok: false, error: "Request could not be completed" }, { status: 500 });
  }

  await query(
    `INSERT INTO transaction_updates (document_request_id, status, message)
     VALUES ($1, 'Pending', 'Request submitted.')`,
    [request.id]
  );

  await writeGlobalAuditLog(req, "Student document request created", {
    actor: acc?.email || session.email || studentNo || "Student",
    role: "Student",
    officeId: "registrar",
    details: `Requested ${docType} (${clientType})${studentNo ? ` for ${studentNo}` : ""}${courseCode ? ` - Program: ${courseCode}` : ""}`,
    entity_type: "document_request",
    entity_id: String(request.id),
  });

  return NextResponse.json({ ok: true, data: request }, { status: 201 });
}
