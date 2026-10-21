import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

import { writeAuditLog } from "../../../lib/auditLogRequest";
import { isSystemAdminRole } from "../../../lib/roleUtils";
import {
  listDocumentRequests,
  countDocumentRequests,
  createDocumentRequest,
} from "../../../lib/documentRequestsRepo";
import { getStudentByStudentNo } from "../../../lib/studentsRepo";
import { dbGet } from "../../../lib/postgresCompat";
import { listDocuments } from "../../../lib/documentsRepo";
import { getPrincipalOfficeId, requireStaff, createAuthErrorResponse } from "../../../lib/authHelpers";
import { canAccessResource } from "@/lib/resourceAuthorization";
import { PersonNameSchema, PhoneSchema, StudentNoSchema } from "@/lib/validationSchemas";

export const runtime = "nodejs";

const MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024;
const ALLOWED_ATTACHMENT_TYPES = new Map([
  ["application/pdf", ".pdf"],
  ["image/png", ".png"],
  ["image/jpeg", ".jpg"],
  ["image/webp", ".webp"],
]);

function requestAttachmentsDir() {
  const localDir = process.env.LOCAL_DATA_DIR || path.join(process.cwd(), ".local");
  return path.join(localDir, "storage", "registrar", "request_attachments");
}

export async function GET(req) {
  const access = await requireStaff(req);
  if (access.error || !access.user) return createAuthErrorResponse(access.error || "Staff authentication required", access.error?.startsWith("Access denied") ? 403 : 401);
  const staff = access.user;
  const officeId = isSystemAdminRole(staff.role) ? "" : getPrincipalOfficeId(staff);
  if (!isSystemAdminRole(staff.role) && !officeId) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") || "";
  const status = searchParams.get("status") || "";
  const studentNo = searchParams.get("studentNo") || "";
  const clientType = searchParams.get("clientType") || "";
  const docType = searchParams.get("docType") || "";
  const limit = searchParams.get("limit") || "50";
  const offset = searchParams.get("offset") || "0";
  const sortBy = searchParams.get("sortBy") || "created_at";
  const sortOrder = searchParams.get("sortOrder") || "DESC";

  const [rows, total] = await Promise.all([
    listDocumentRequests({
      q: q || undefined,
      status: status || undefined,
      studentNo: studentNo || undefined,
      clientType: clientType || undefined,
      docType: docType || undefined,
      officeId,
      limit,
      offset,
      sortBy,
      sortOrder,
    }),
    countDocumentRequests({
      q: q || undefined,
      status: status || undefined,
      studentNo: studentNo || undefined,
      clientType: clientType || undefined,
      docType: docType || undefined,
      officeId,
    }),
  ]);

  const authorizedRows = rows.filter((row) => canAccessResource(staff, "request", row));
  return NextResponse.json({ ok: true, data: authorizedRows, total });
}

export async function POST(req) {
  const access = await requireStaff(req);
  if (access.error || !access.user) return createAuthErrorResponse(access.error || "Staff authentication required", access.error?.startsWith("Access denied") ? 403 : 401);
  const staff = access.user;

  const uploadedFiles = [];
  let body;
  if ((req.headers.get("content-type") || "").includes("multipart/form-data")) {
    const form = await req.formData().catch(() => null);
    if (!form) {
      return NextResponse.json({ ok: false, error: "Invalid form data" }, { status: 400 });
    }
    body = Object.fromEntries(
      ["clientType", "studentNo", "docType", "courseCode", "requesterName", "requesterRelationship", "requesterContact", "notes", "officeId"]
        .map((key) => [key, form.get(key)])
    );
    const files = form.getAll("files");
    const fileTypes = form.getAll("file_types");
    files.forEach((file, index) => {
      if (file && typeof file.arrayBuffer === "function" && file.size > 0) {
        uploadedFiles.push({ file, attachmentType: String(fileTypes[index] || "evidence").trim() });
      }
    });
  } else {
    body = await req.json().catch(() => null);
  }
  if (!body || typeof body !== "object") {
    return NextResponse.json({ ok: false, error: "Invalid request body" }, { status: 400 });
  }

  const clientType = String(body.clientType || "Student").trim();
  const studentNo = String(body.studentNo || "").trim().toUpperCase() || null;
  const docType = String(body.docType || "").trim();
  const courseCode = String(body.courseCode || "").trim().toUpperCase() || null;
  const requesterName = String(body.requesterName || "").trim();
  const requesterRelationship = String(body.requesterRelationship || "").trim() || null;
  const requesterContact = String(body.requesterContact || "").trim() || null;
  const notes = body.notes != null ? String(body.notes).trim() : "";
  const officeId = isSystemAdminRole(staff.role)
    ? String(body.officeId || "registrar").trim().toLowerCase()
    : getPrincipalOfficeId(staff);

  if (!officeId) {
    return NextResponse.json({ ok: false, error: "Staff office is required" }, { status: 403 });
  }

  if (uploadedFiles.length > 0 && officeId !== "registrar") {
    return NextResponse.json({ ok: false, error: "Supporting attachments are only supported for Registrar requests." }, { status: 400 });
  }
  if (!["Student", "Alumni", "Parent", "Faculty", "External"].includes(clientType)) {
    return NextResponse.json({ ok: false, error: "Unsupported client type." }, { status: 400 });
  }
  if (clientType === "Parent" && officeId !== "registrar") {
    return NextResponse.json({ ok: false, error: "Parent or guardian requests are only supported by the Registrar office." }, { status: 400 });
  }
  if (notes.length < 5 || notes.length > 1000) {
    return NextResponse.json({ ok: false, error: "Please provide a meaningful purpose description between 5 and 1000 characters." }, { status: 400 });
  }
  if (studentNo) {
    const studentNoCheck = StudentNoSchema.safeParse(studentNo);
    if (!studentNoCheck.success) {
      return NextResponse.json({ ok: false, error: studentNoCheck.error.issues[0]?.message || "Invalid student number." }, { status: 400 });
    }
  }
  if (clientType === "Student" && !studentNo) {
    return NextResponse.json({ ok: false, error: "Student number is required for enrolled student requests." }, { status: 400 });
  }
  if (clientType === "Alumni" && !requesterName) {
    return NextResponse.json({ ok: false, error: "Alumni requester name is required." }, { status: 400 });
  }
  if (clientType === "Alumni" && !studentNo && !courseCode) {
    return NextResponse.json({ ok: false, error: "Academic program is required for alumni without a student number." }, { status: 400 });
  }
  if (clientType === "Parent") {
    if (!studentNo) {
      return NextResponse.json({ ok: false, error: "Student number is required for parent or guardian requests." }, { status: 400 });
    }
    if (!requesterName || !requesterRelationship) {
      return NextResponse.json({ ok: false, error: "Requester name and relationship to the student are required." }, { status: 400 });
    }
    const hasSpa = uploadedFiles.some(({ attachmentType }) => attachmentType === "spa");
    const hasValidId = uploadedFiles.some(({ attachmentType }) => attachmentType === "valid_id");
    if (!hasSpa || !hasValidId) {
      return NextResponse.json({ ok: false, error: "Attach both an SPA / authorization letter and a valid government ID." }, { status: 400 });
    }
  }
  if (requesterName) {
    const requesterNameCheck = PersonNameSchema("Requester name").safeParse(requesterName);
    if (!requesterNameCheck.success) {
      return NextResponse.json({ ok: false, error: requesterNameCheck.error.issues[0]?.message || "Invalid requester name." }, { status: 400 });
    }
  }
  if (requesterContact) {
    const contactCheck = PhoneSchema.safeParse(requesterContact);
    if (!contactCheck.success) {
      return NextResponse.json({ ok: false, error: contactCheck.error.issues[0]?.message || "Invalid contact number." }, { status: 400 });
    }
  }
  if (uploadedFiles.length > 5) {
    return NextResponse.json({ ok: false, error: "A maximum of 5 supporting files can be attached." }, { status: 400 });
  }
  const preparedAttachments = [];
  for (const { file, attachmentType } of uploadedFiles) {
    const mimeType = String(file.type || "").toLowerCase();
    const extension = ALLOWED_ATTACHMENT_TYPES.get(mimeType);
    if (!extension) {
      return NextResponse.json({ ok: false, error: "Attachments must be PDF, PNG, JPG, or WEBP files." }, { status: 415 });
    }
    if (file.size > MAX_ATTACHMENT_SIZE) {
      return NextResponse.json({ ok: false, error: "Each attachment must be 10 MB or smaller." }, { status: 400 });
    }
    if (clientType === "Parent" && !["spa", "valid_id"].includes(attachmentType)) {
      return NextResponse.json({ ok: false, error: "Parent or guardian attachments must be categorized as SPA / authorization or valid government ID." }, { status: 400 });
    }
    preparedAttachments.push({
      file,
      attachmentType,
      mimeType,
      extension,
      originalFilename: path.basename(String(file.name || `supporting-document${extension}`)).slice(0, 255),
    });
  }

  if (!docType) {
    return NextResponse.json(
      { ok: false, error: "Document type is required" },
      { status: 400 }
    );
  }

  const typeRecord = await dbGet(
    "SELECT id, name, is_requestable, is_compliance FROM document_types WHERE office_id = ? AND lower(name) = lower(?) AND status = 'Active'",
    [officeId, docType]
  );
  if (!typeRecord) {
    return NextResponse.json(
      { ok: false, error: "The selected document type is not active in this office." },
      { status: 400 }
    );
  }
  if (!typeRecord.is_requestable || typeRecord.is_compliance) {
    return NextResponse.json(
      {
        ok: false,
        error: `'${typeRecord.name}' is designated as an inward compliance document and cannot be issued through document requests.`,
      },
      { status: 400 }
    );
  }

  let student = null;
  if (studentNo) {
    student = await getStudentByStudentNo(studentNo, { officeId });
    if (!student && clientType === "Student") {
      return NextResponse.json(
        { ok: false, error: "Student record not found" },
        { status: 400 }
      );
    }
  }

  const typeRow = await dbGet(
    "SELECT name FROM document_types WHERE office_id = ? AND name = ?",
    [officeId, docType]
  );
  if (!typeRow) {
    return NextResponse.json(
      { ok: false, error: "Invalid document type" },
      { status: 400 }
    );
  }

  let autoLinkedId = null;
  if (studentNo) {
    const existingDocs = await listDocuments({
      officeId,
      studentNo,
      docType,
      approvalStatus: "Approved",
      limit: 1,
      offset: 0,
    });
    autoLinkedId =
      Array.isArray(existingDocs) && existingDocs[0]?.id != null
        ? Number(existingDocs[0].id)
        : null;
  }

  const createdPaths = [];
  let row;
  try {
    for (const attachment of preparedAttachments) {
      const storageFilename = `${crypto.randomUUID()}${attachment.extension}`;
      const filePath = path.join(requestAttachmentsDir(), storageFilename);
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      createdPaths.push(filePath);
      await fs.writeFile(filePath, Buffer.from(await attachment.file.arrayBuffer()), { flag: "wx" });
      attachment.storageFilename = storageFilename;
      attachment.sizeBytes = attachment.file.size;
    }

    row = await createDocumentRequest({
      officeId,
      studentNo,
      docType,
      notes,
      createdBy: staff.id,
      linkedDocumentId: Number.isFinite(autoLinkedId) ? autoLinkedId : null,
      clientType,
      courseCode: courseCode || student?.course_code || null,
      requesterName: requesterName || student?.name || null,
      requesterRelationship,
      requesterContact,
      attachments: preparedAttachments.map(({ originalFilename, storageFilename, mimeType, sizeBytes, attachmentType }) => ({
        originalFilename,
        storageFilename,
        mimeType,
        sizeBytes,
        attachmentType,
      })),
    });
  } catch (error) {
    await Promise.all(createdPaths.map((filePath) => fs.unlink(filePath).catch((cleanupError) => {
      console.error("Document request attachment cleanup failed:", cleanupError);
    })));
    console.error("Staff document request creation failed:", error);
    return NextResponse.json({ ok: false, error: "Failed to create request." }, { status: 500 });
  }

  if (!row) {
    await Promise.all(createdPaths.map((filePath) => fs.unlink(filePath).catch((cleanupError) => {
      console.error("Document request attachment cleanup failed:", cleanupError);
    })));
    return NextResponse.json(
      { ok: false, error: "Failed to create request" },
      { status: 500 }
    );
  }

  const displayName = requesterName || student?.name || studentNo || "Requester";
  if (!canAccessResource(staff, "request", row)) {
    return NextResponse.json({ ok: false, error: "Request could not be created" }, { status: 500 });
  }
  await writeAuditLog(req, `Create Document Request`, { 
    details: `initiated document request for '${displayName}' (${clientType})${studentNo ? ` (ID: ${studentNo})` : ""}${courseCode ? ` - Program: ${courseCode}` : ""} - Category: ${docType}`,
    entity_type: "DocumentRequest",
    entity_id: row.id
  });

  return NextResponse.json({ ok: true, data: row }, { status: 201 });
}
