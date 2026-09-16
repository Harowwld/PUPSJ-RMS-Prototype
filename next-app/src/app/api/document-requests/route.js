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

export const runtime = "nodejs";

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

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const clientType = String(body.clientType || "Student").trim();
  const studentNo = String(body.studentNo || "").trim().toUpperCase() || null;
  const docType = String(body.docType || "").trim();
  const courseCode = String(body.courseCode || "").trim().toUpperCase() || null;
  const requesterName = String(body.requesterName || "").trim();
  const notes =
    body.notes != null ? String(body.notes).trim() || null : null;
  const officeId = isSystemAdminRole(staff.role)
    ? String(body.officeId || "registrar").trim().toLowerCase()
    : getPrincipalOfficeId(staff);

  if (!officeId) {
    return NextResponse.json({ ok: false, error: "Staff office is required" }, { status: 403 });
  }

  if (!docType) {
    return NextResponse.json(
      { ok: false, error: "Document type is required" },
      { status: 400 }
    );
  }

  if (clientType === "Student" && !studentNo) {
    return NextResponse.json(
      { ok: false, error: "Student number is required for enrolled student requests" },
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
      excludeDeclined: true,
      limit: 1,
      offset: 0,
    });
    autoLinkedId =
      Array.isArray(existingDocs) && existingDocs[0]?.id != null
        ? Number(existingDocs[0].id)
        : null;
  }

  const row = await createDocumentRequest({
    officeId,
    studentNo,
    docType,
    notes,
    createdBy: staff.id,
    linkedDocumentId: Number.isFinite(autoLinkedId) ? autoLinkedId : null,
    clientType,
    courseCode: courseCode || student?.course_code || null,
    requesterName: requesterName || student?.name || null,
  });

  if (!row) {
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

  return NextResponse.json({ ok: true, data: row });
}
