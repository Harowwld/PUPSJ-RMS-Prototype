import { NextResponse } from "next/server";
import { createStudent, listStudents } from "../../../lib/studentsRepo";
import { writeAuditLog } from "../../../lib/auditLogRequest";
import { canonicalizeCabinetId } from "../../../lib/storageLayoutUtils";
import { isUniqueViolation } from "../../../lib/dbErrors";
import { requireAdmin, requireStaff, createAuthErrorResponse } from "../../../lib/authHelpers";
import { isSystemAdminRole, normalizeRole } from "../../../lib/roleUtils";
import { canAccessResource } from "../../../lib/resourceAuthorization";

export const runtime = "nodejs";

function resolveOfficeId(user, req, requestedOfficeId) {
  const requested = String(requestedOfficeId || new URL(req.url).searchParams.get("officeId") || "").trim().toLowerCase();
  if (isSystemAdminRole(user.role)) return requested || "registrar";
  const ownOffice = String(user.officeId || user.office_id || "").trim().toLowerCase();
  if (requested && requested !== ownOffice) return null;
  return ownOffice || null;
}

export async function GET(req) {
  const access = await requireStaff(req);
  if (access.error || !access.user) return createAuthErrorResponse(access.error || "Staff authentication required", access.error?.startsWith("Access denied") ? 403 : 401);
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") || "";
  const courseCode = searchParams.get("courseCode") || "";
  const yearLevel = searchParams.get("yearLevel") || "";
  const section = searchParams.get("section") || "";
  const includeArchived = searchParams.get("includeArchived") === "true";
  if (includeArchived && !isSystemAdminRole(access.user.role) && normalizeRole(access.user.role) !== "Admin") {
    return createAuthErrorResponse("Admin access required", 403);
  }
  const limit = searchParams.get("limit") || "200";
  const offset = searchParams.get("offset") || "0";
  const officeId = resolveOfficeId(access.user, req);
  if (!officeId) return createAuthErrorResponse("Office scope is required", 403);

  const rows = await listStudents({
    officeId,
    q: q || undefined,
    courseCode: courseCode || undefined,
    yearLevel: yearLevel || undefined,
    section: section || undefined,
    includeArchived,
    limit,
    offset,
  });

  return NextResponse.json({ ok: true, data: rows.filter((row) => canAccessResource(access.user, "student", { ...row, office_id: officeId })) });
}

export async function POST(req) {
  const access = await requireAdmin(req);
  if (access.error || !access.user) return createAuthErrorResponse(access.error || "Admin access required", access.error?.startsWith("Access denied") ? 403 : 401);
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const studentNo = String(body.studentNo || "").trim();
  const name = String(body.name || "").trim().replace(/\s+/g, " ").toUpperCase();
  const courseCode = String(body.courseCode || "").trim().toUpperCase();
  const yearLevel = parseInt(body.yearLevel);
  const section = String(body.section || "").trim();
  const room = parseInt(body.room);
  const cabinet = canonicalizeCabinetId(body.cabinet);
  const drawer = parseInt(body.drawer);
  const status = String(body.status || "Active").trim() || "Active";
  const officeId = resolveOfficeId(access.user, req, body.officeId || body.office_id);
  if (!officeId) return createAuthErrorResponse("You cannot access that office", 403);

  const studentNoPattern = /^[A-Z0-9][A-Z0-9\-_/.]{1,30}$/i;

  if (!studentNo || !name || !courseCode || !section) {
    return NextResponse.json(
      { ok: false, error: "Missing required fields" },
      { status: 400 }
    );
  }

  if (!studentNoPattern.test(studentNo.toUpperCase())) {
    return NextResponse.json(
      { ok: false, error: "Invalid studentNo format" },
      { status: 400 }
    );
  }

  if (!Number.isFinite(yearLevel) || yearLevel < 2000 || yearLevel > 2100) {
    return NextResponse.json(
      { ok: false, error: "Invalid yearLevel" },
      { status: 400 }
    );
  }

  if (!Number.isFinite(room) || room < 1) {
    return NextResponse.json({ ok: false, error: "Invalid room" }, { status: 400 });
  }

  if (!cabinet) {
    return NextResponse.json(
      { ok: false, error: "Invalid cabinet" },
      { status: 400 }
    );
  }

  if (!Number.isFinite(drawer) || drawer < 1) {
    return NextResponse.json(
      { ok: false, error: "Invalid drawer" },
      { status: 400 }
    );
  }

  try {
    const row = await createStudent({
      studentNo,
      name,
      courseCode,
      yearLevel,
      section,
      room,
      cabinet,
      drawer,
      status,
      officeId,
    });
    if (!row || !canAccessResource(access.user, "student", { ...row, office_id: officeId })) {
      return NextResponse.json({ ok: false, error: "Student could not be created" }, { status: 500 });
    }
    await writeAuditLog(req, `Created student`, { details: `${studentNo}` });

    return NextResponse.json({ ok: true, data: row }, { status: 201 });
  } catch (e) {
    const msg = String(e?.message || "");
    if (isUniqueViolation(e)) {
      return NextResponse.json(
        { ok: false, error: "Student already exists" },
        { status: 409 }
      );
    }
    if (
      msg.includes("Invalid courseCode") ||
      msg.includes("Invalid section") ||
      msg.includes("is linked to")
    ) {
      return NextResponse.json({ ok: false, error: "Invalid course or section relationship" }, { status: 400 });
    }

    return NextResponse.json(
      { ok: false, error: "Failed to create student" },
      { status: 500 }
    );
  }
}
