import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { getSessionCookieName, verifySessionToken } from "../../../lib/jwt";
import { getStaffById } from "../../../lib/staffRepo";
import { writeAuditLog } from "../../../lib/auditLogRequest";
import {
  listDocumentRequests,
  countDocumentRequests,
  createDocumentRequest,
} from "../../../lib/documentRequestsRepo";
import { getStudentByStudentNo } from "../../../lib/studentsRepo";
import { dbGet } from "../../../lib/sqlite";
import { listDocuments } from "../../../lib/documentsRepo";

export const runtime = "nodejs";

async function getSessionStaff() {
  const cookieName = getSessionCookieName();
  const store = await cookies();
  const token = store.get(cookieName)?.value || "";
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

function isActiveStaff(staff) {
  return staff && String(staff.status || "").toLowerCase() === "active";
}

export async function GET(req) {
  const staff = await getSessionStaff();
  if (!staff || !isActiveStaff(staff)) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") || "";
  const status = searchParams.get("status") || "";
  const studentNo = searchParams.get("studentNo") || "";
  const limit = searchParams.get("limit") || "50";
  const offset = searchParams.get("offset") || "0";

  const [rows, total] = await Promise.all([
    listDocumentRequests({
      q: q || undefined,
      status: status || undefined,
      studentNo: studentNo || undefined,
      limit,
      offset,
    }),
    countDocumentRequests({
      q: q || undefined,
      status: status || undefined,
      studentNo: studentNo || undefined,
    }),
  ]);

  return NextResponse.json({ ok: true, data: rows, total });
}

export async function POST(req) {
  const staff = await getSessionStaff();
  if (!staff || !isActiveStaff(staff)) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const studentNo = String(body.studentNo || "").trim().toUpperCase();
  const docType = String(body.docType || "").trim();
  const notes =
    body.notes != null ? String(body.notes).trim() || null : null;

  if (!studentNo || !docType) {
    return NextResponse.json(
      { ok: false, error: "studentNo and docType are required" },
      { status: 400 }
    );
  }

  const student = await getStudentByStudentNo(studentNo);
  if (!student) {
    return NextResponse.json(
      { ok: false, error: "Student not found" },
      { status: 400 }
    );
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

  const existingDocs = await listDocuments({
    studentNo,
    docType,
    excludeDeclined: true,
    limit: 1,
    offset: 0,
  });
  const autoLinkedId =
    Array.isArray(existingDocs) && existingDocs[0]?.id != null
      ? Number(existingDocs[0].id)
      : null;

  const row = await createDocumentRequest({
    studentNo,
    docType,
    notes,
    createdBy: staff.id,
    linkedDocumentId: Number.isFinite(autoLinkedId) ? autoLinkedId : null,
  });

  if (!row) {
    return NextResponse.json(
      { ok: false, error: "Failed to create request" },
      { status: 500 }
    );
  }

  await writeAuditLog(
    req,
    `Created document request #${row.id} for ${studentNo} (${docType})`
  );

  return NextResponse.json({ ok: true, data: row });
}
