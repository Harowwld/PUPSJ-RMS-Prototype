import { NextResponse } from "next/server";
import {
  archiveStudent,
  restoreStudent,
  getStudentByStudentNo,
  updateStudent,
} from "../../../../lib/studentsRepo";
import { writeAuditLog } from "../../../../lib/auditLogRequest";
import { canonicalizeCabinetId } from "../../../../lib/storageLayoutUtils";
import { requireAdmin, requireStaff, createAuthErrorResponse } from "../../../../lib/authHelpers";
import { isSystemAdminRole } from "../../../../lib/roleUtils";
import { canAccessResource } from "@/lib/resourceAuthorization";
import { sanitizeUser } from "@/lib/dataSanitizer";

export const runtime = "nodejs";

function resolveOfficeId(user, req) {
  const requested = String(new URL(req.url).searchParams.get("officeId") || "").trim().toLowerCase();
  if (isSystemAdminRole(user.role)) return requested || "registrar";
  const ownOffice = String(user.officeId || user.office_id || "").trim().toLowerCase();
  if (requested && requested !== ownOffice) return null;
  return ownOffice || null;
}

export async function GET(req, ctx) {
  const access = await requireStaff(req);
  if (access.error || !access.user) return createAuthErrorResponse(access.error || "Staff authentication required", access.error?.startsWith("Access denied") ? 403 : 401);
  const params = await ctx.params;
  const studentNo = decodeURIComponent(params.studentNo || "");
  if (!studentNo) {
    return NextResponse.json(
      { ok: false, error: "Invalid studentNo" },
      { status: 400 }
    );
  }

  const officeId = resolveOfficeId(access.user, req);
  if (!officeId) return createAuthErrorResponse("Office scope is required", 403);
  const row = await getStudentByStudentNo(studentNo, {
    officeId: isSystemAdminRole(access.user.role) ? undefined : officeId,
  });
  if (!row || !canAccessResource(access.user, "student", { ...row, office_id: officeId })) {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, data: sanitizeUser(row) });
}

export async function PATCH(req, ctx) {
  const access = await requireAdmin(req);
  if (access.error || !access.user) return createAuthErrorResponse(access.error || "Admin access required", access.error?.startsWith("Access denied") ? 403 : 401);
  const officeId = resolveOfficeId(access.user, req);
  if (!officeId) return createAuthErrorResponse("Office scope is required", 403);
  const params = await ctx.params;
  const studentNo = decodeURIComponent(params.studentNo || "");
  if (!studentNo) {
    return NextResponse.json(
      { ok: false, error: "Invalid studentNo" },
      { status: 400 }
    );
  }

  const existingStudent = await getStudentByStudentNo(studentNo, {
    officeId: isSystemAdminRole(access.user.role) ? undefined : officeId,
  });
  if (!existingStudent || !canAccessResource(access.user, "student", { ...existingStudent, office_id: officeId })) {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  // Handle explicit status toggle (archiving/restoring)
  if (body.status === "Active") {
    const row = await restoreStudent(studentNo, {
      officeId: isSystemAdminRole(access.user.role) ? undefined : officeId,
    });
    if (!row) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
    await writeAuditLog(req, `Restore Student`, {
      details: `restored active system status for student record '${row.name}' (ID: ${studentNo})`,
      entity_type: "Student",
      entity_id: studentNo
    });
    return NextResponse.json({ ok: true, data: sanitizeUser(row) });
  } else if (body.status === "Archived") {
    const row = await archiveStudent(studentNo, {
      officeId: isSystemAdminRole(access.user.role) ? undefined : officeId,
    });
    if (!row) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
    await writeAuditLog(req, `Archive Student`, {
      details: `moved student record '${row.name}' (ID: ${studentNo}) to the system archive and disabled associated processing`,
      severity: "WARNING",
      entity_type: "Student",
      entity_id: studentNo
    });
    return NextResponse.json({ ok: true, data: sanitizeUser(row) });
  }

  const row = await updateStudent(studentNo, {
    name: body.name === undefined ? undefined : String(body.name).trim(),
    courseCode:
      body.courseCode === undefined ? undefined : String(body.courseCode).trim(),
    yearLevel: body.yearLevel,
    section: body.section === undefined ? undefined : String(body.section).trim(),
    room: body.room,
    cabinet: body.cabinet === undefined ? undefined : canonicalizeCabinetId(body.cabinet),
    drawer: body.drawer,
    status: body.status === undefined ? undefined : String(body.status).trim(),
    officeId,
  });

  if (!row) {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }
  await writeAuditLog(req, `Update Student`, {
    details: `modified profile and registry metadata for student '${row.name}' (ID: ${studentNo})`,
    entity_type: "Student",
    entity_id: studentNo
  });

  return NextResponse.json({ ok: true, data: sanitizeUser(row) });
}

export async function DELETE(req, ctx) {
  const access = await requireAdmin(req);
  if (access.error || !access.user) return createAuthErrorResponse(access.error || "Admin access required", access.error?.startsWith("Access denied") ? 403 : 401);
  const params = await ctx.params;
  const studentNo = decodeURIComponent(params.studentNo || "");
  if (!studentNo) {
    return NextResponse.json(
      { ok: false, error: "Invalid studentNo" },
      { status: 400 }
    );
  }

  const officeId = resolveOfficeId(access.user, req);
  if (!officeId) return createAuthErrorResponse("Office scope is required", 403);
  const existingStudent = await getStudentByStudentNo(studentNo, {
    officeId: isSystemAdminRole(access.user.role) ? undefined : officeId,
  });
  if (!existingStudent || !canAccessResource(access.user, "student", { ...existingStudent, office_id: officeId })) {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }
  const row = await archiveStudent(studentNo, {
    officeId: isSystemAdminRole(access.user.role) ? undefined : officeId,
  });
  if (!row || !canAccessResource(access.user, "student", { ...row, office_id: officeId })) {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }
  await writeAuditLog(req, `Archive Student`, {
    details: `moved student record '${row.name}' (ID: ${studentNo}) to the system archive and disabled its requirement logic`,
    severity: "WARNING",
    entity_type: "Student",
    entity_id: studentNo
  });

  return NextResponse.json({ ok: true, data: sanitizeUser(row) });
}
