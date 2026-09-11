import { NextResponse } from "next/server";

import { getSessionCookieName, verifySessionToken } from "../../../lib/jwt";
import { getStaffById } from "../../../lib/staffRepo";
import { writeAuditLog } from "../../../lib/auditLogRequest";
import { isAdminRole } from "../../../lib/roleUtils";
import {
  listDocumentRequests,
  countDocumentRequests,
  createDocumentRequest,
} from "../../../lib/documentRequestsRepo";
import { getStudentByStudentNo } from "../../../lib/studentsRepo";
import { dbGet } from "../../../lib/postgresCompat";
import { listDocuments } from "../../../lib/documentsRepo";

export const runtime = "nodejs";

async function getSessionStaff(req) {
  const token = req.cookies.get(getSessionCookieName())?.value || "";
  if (!token) return null;
  try {
    const payload = await verifySessionToken(token);
    const userId = String(payload?.sub || "").trim();
    if (!userId) return null;
    return await getStaffById(userId);
  } catch {
    return null;
  }
}

function isActiveStaffOrAdmin(staff) {
  if (!staff) return false;
  if (isAdminRole(staff.role)) return true;
  return String(staff.status || "").toLowerCase() === "active";
}

export async function GET(req) {
  const staff = await getSessionStaff(req);
  if (!staff || !isActiveStaffOrAdmin(staff)) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

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
      officeId: "registrar",
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
      officeId: "registrar",
    }),
  ]);

  return NextResponse.json({ ok: true, data: rows, total });
}

export async function POST(req) {
  const staff = await getSessionStaff(req);
  if (!staff || !isActiveStaffOrAdmin(staff)) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

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
    student = await getStudentByStudentNo(studentNo);
    if (!student && clientType === "Student") {
      return NextResponse.json(
        { ok: false, error: "Student record not found" },
        { status: 400 }
      );
    }
  }

  const typeRow = await dbGet(
    "SELECT name FROM document_types WHERE name = ?",
    [docType]
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
    studentNo,
    docType,
    notes,
    createdBy: staff.id,
    linkedDocumentId: Number.isFinite(autoLinkedId) ? autoLinkedId : null,
    clientType,
    courseCode: courseCode || student?.course_code || null,
    requesterName: requesterName || student?.name || null,
    officeId: "registrar",
  });

  if (!row) {
    return NextResponse.json(
      { ok: false, error: "Failed to create request" },
      { status: 500 }
    );
  }

  const displayName = requesterName || student?.name || studentNo || "Alumni Requester";
  await writeAuditLog(req, `Create Document Request`, { 
    details: `initiated document request for '${displayName}' (${clientType})${studentNo ? ` (ID: ${studentNo})` : ""}${courseCode ? ` - Program: ${courseCode}` : ""} - Category: ${docType}`,
    entity_type: "DocumentRequest",
    entity_id: row.id
  });

  return NextResponse.json({ ok: true, data: row });
}
