import { NextResponse } from "next/server";
import { createStudent } from "../../../../lib/studentsRepo";
import { listCourses } from "../../../../lib/coursesRepo";
import { writeAuditLog } from "../../../../lib/auditLogRequest";
import { getStorageLayout } from "../../../../lib/storageLayoutRepo";
import { canonicalizeCabinetId } from "../../../../lib/storageLayoutUtils";
import { isUniqueViolation } from "../../../../lib/dbErrors";
import { requireAdmin, requireStaff, createAuthErrorResponse } from "../../../../lib/authHelpers";
import { isSystemAdminRole } from "../../../../lib/roleUtils";
import { canAccessResource } from "@/lib/resourceAuthorization";

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
  const officeId = resolveOfficeId(access.user, req);
  if (!officeId) return createAuthErrorResponse("Office scope is required", 403);
  try {
    const courses = await listCourses({ officeId });
    return NextResponse.json({ ok: true, data: courses.map(c => c.code) });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: "Failed to load courses" },
      { status: 500 }
    );
  }
}

function validateStudentPayload(body, layout) {
  const studentNo = String(body?.studentNo || "").trim();
  const name = String(body?.name || "")
    .trim()
    .replace(/\s+/g, " ")
    .toUpperCase();
  const courseCode = String(body?.courseCode || "").trim().toUpperCase();
  const yearLevel = parseInt(body?.yearLevel);
  const section = String(body?.section || "").trim();
  const room = parseInt(body?.room);
  const cabinet = canonicalizeCabinetId(body?.cabinet);
  const drawer = parseInt(body?.drawer);
  const status = String(body?.status || "Active").trim() || "Active";

  const studentNoPattern = /^[A-Z0-9][A-Z0-9\-_/.]{1,30}$/i;

  if (!studentNo || !name || !courseCode || !section) {
    return { ok: false, error: "Missing required fields" };
  }

  if (!studentNoPattern.test(studentNo.toUpperCase())) {
    return { ok: false, error: "Invalid studentNo format" };
  }

  if (!Number.isFinite(yearLevel) || yearLevel < 2000 || yearLevel > 2100) {
    return { ok: false, error: "Invalid yearLevel" };
  }

  // Storage Location Validation
  if (!Number.isFinite(room) || room < 1) {
    return { ok: false, error: "Invalid room" };
  }
  if (!cabinet) {
    return { ok: false, error: "Invalid cabinet" };
  }
  if (!Number.isFinite(drawer) || drawer < 1) {
    return { ok: false, error: "Invalid drawer" };
  }

  // Physical Layout Verification
  const roomDef = layout?.rooms?.find(r => r.id === room);
  if (!roomDef) {
    return { ok: false, error: `Storage Room ${room} does not exist in the system` };
  }
  const cabDef = roomDef.cabinets?.find(c => c.id === cabinet);
  if (!cabDef) {
    return { ok: false, error: `Cabinet ${cabinet} does not exist in Room ${room}` };
  }
  if (!cabDef.drawerIds?.includes(drawer)) {
    return { ok: false, error: `Drawer ${drawer} does not exist in Cabinet ${cabinet} (Room ${room})` };
  }

  return {
    ok: true,
    value: {
      studentNo,
      name,
      courseCode,
      yearLevel,
      section,
      room,
      cabinet,
      drawer,
      status,
    },
  };
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

  const rows = Array.isArray(body.rows) ? body.rows : null;
  if (!rows) {
    return NextResponse.json(
      { ok: false, error: "Missing rows" },
      { status: 400 }
    );
  }

  const officeId = resolveOfficeId(access.user, req, body.officeId || body.office_id);
  if (!officeId) return createAuthErrorResponse("You cannot access that office", 403);

  const layout = await getStorageLayout({ officeId }).catch(() => null);

  const results = [];
  for (let i = 0; i < rows.length; i++) {
    const raw = rows[i];
    const validated = validateStudentPayload(raw, layout);
    if (!validated.ok) {
      results.push({ index: i, ok: false, error: validated.error });
      continue;
    }

    try {
      const created = await createStudent({ ...validated.value, officeId });
      if (!created || !canAccessResource(access.user, "student", { ...created, office_id: officeId })) {
        results.push({ index: i, ok: false, error: "Student could not be created" });
      } else {
        results.push({ index: i, ok: true, data: created });
      }
    } catch (e) {
      const msg = String(e?.message || "");
      if (isUniqueViolation(e)) {
        results.push({ index: i, ok: false, error: "Student already exists" });
      } else if (
        msg.includes("Invalid courseCode") ||
        msg.includes("Invalid section") ||
        msg.includes("is linked to")
      ) {
        results.push({ index: i, ok: false, error: "Invalid course or section relationship" });
      } else {
        results.push({ index: i, ok: false, error: "Failed to create student" });
      }
    }
  }
  const successCount = results.filter((r) => r.ok).length;
  const failCount = results.length - successCount;
  await writeAuditLog(req, `Batch student import`, { details: `${rows.length} rows (${successCount} success, ${failCount} failed)` });

  return NextResponse.json({ ok: true, data: results });
}
