import { NextResponse } from "next/server";
import {
  archiveStudent,
  restoreStudent,
  getStudentByStudentNo,
  updateStudent,
} from "../../../../lib/studentsRepo";
import { writeAuditLog } from "../../../../lib/auditLogRequest";
import { canonicalizeCabinetId, areCabinetsEqual } from "../../../../lib/storageLayoutUtils";
import { getStorageLayout } from "../../../../lib/storageLayoutRepo";
import { requireStaff, createAuthErrorResponse } from "../../../../lib/authHelpers";
import { isSystemAdminRole } from "../../../../lib/roleUtils";
import { canAccessResource } from "@/lib/resourceAuthorization";
import { sanitizeUser } from "@/lib/dataSanitizer";
import { PersonNameSchema } from "@/lib/validationSchemas";
import { normalizeStudentRecordName } from "@/lib/studentRecordName";

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
  const row = await getStudentByStudentNo(studentNo, { officeId, includeArchivedMembership: true });
  if (!row || !canAccessResource(access.user, "student", { ...row, office_id: officeId })) {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, data: sanitizeUser(row) });
}

export async function PATCH(req, ctx) {
  const access = await requireStaff(req);
  if (access.error || !access.user) return createAuthErrorResponse(access.error || "Staff authentication required", access.error?.startsWith("Access denied") ? 403 : 401);
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

  const existingStudent = await getStudentByStudentNo(studentNo, { officeId, includeArchivedMembership: true });
  if (!existingStudent || !canAccessResource(access.user, "student", { ...existingStudent, office_id: officeId })) {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const allowedFields = new Set([
    "name",
    "firstName", "middleName", "lastName",
    "courseCode",
    "yearLevel",
    "section",
    "room",
    "cabinet",
    "drawer",
    "status",
  ]);
  const unsupportedFields = Object.keys(body).filter((field) => !allowedFields.has(field));
  if (unsupportedFields.length) {
    return NextResponse.json({ ok: false, error: `Unsupported field: ${unsupportedFields[0]}` }, { status: 400 });
  }
  if (Object.keys(body).length === 0) {
    return NextResponse.json({ ok: false, error: "At least one field is required" }, { status: 400 });
  }

  const validStatuses = new Set(["Active", "Archived"]);
  if (body.status !== undefined && !validStatuses.has(String(body.status).trim())) {
    return NextResponse.json({ ok: false, error: "Invalid status" }, { status: 400 });
  }
  let nameParts;
  if (["firstName", "middleName", "lastName"].some((key) => body[key] !== undefined)) {
    try {
      nameParts = normalizeStudentRecordName(body);
      body.name = nameParts.name;
    } catch (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    }
  }
  if (body.name !== undefined) {
    const nameCheck = PersonNameSchema("Student Name", 200).safeParse(body.name);
    if (!nameCheck.success) {
      return NextResponse.json({ ok: false, error: nameCheck.error.issues[0]?.message || "Invalid student name" }, { status: 400 });
    }
  }
  if (body.courseCode !== undefined && !String(body.courseCode).trim()) {
    return NextResponse.json({ ok: false, error: "Course code is required" }, { status: 400 });
  }
  if (body.section !== undefined && !String(body.section).trim()) {
    return NextResponse.json({ ok: false, error: "Section is required" }, { status: 400 });
  }
  if (body.yearLevel !== undefined) {
    const yearLevel = Number(body.yearLevel);
    if (!Number.isInteger(yearLevel) || yearLevel < 2000 || yearLevel > 2100) {
      return NextResponse.json({ ok: false, error: "Invalid yearLevel" }, { status: 400 });
    }
  }
  if (body.room !== undefined) {
    const room = Number(body.room);
    if (!Number.isInteger(room) || room < 1) {
      return NextResponse.json({ ok: false, error: "Invalid room" }, { status: 400 });
    }
  }
  if (body.cabinet !== undefined && !canonicalizeCabinetId(body.cabinet)) {
    return NextResponse.json({ ok: false, error: "Invalid cabinet" }, { status: 400 });
  }
  if (body.drawer !== undefined) {
    const drawer = Number(body.drawer);
    if (!Number.isInteger(drawer) || drawer < 1) {
      return NextResponse.json({ ok: false, error: "Invalid drawer" }, { status: 400 });
    }
  }

  const isStatusChanging =
    body.status !== undefined &&
    String(body.status).trim() !== String(existingStudent.status).trim();
  const hasProfileFields = Object.keys(body).some((field) => field !== "status");
  if (isStatusChanging && (body.status === "Active" || body.status === "Archived") && hasProfileFields) {
    return NextResponse.json(
      { ok: false, error: "Archive and restore status changes must be submitted separately" },
      { status: 400 }
    );
  }
  if (hasProfileFields && existingStudent.status !== "Active") {
    return NextResponse.json({ ok: false, error: "Restore the student in this office before editing their record" }, { status: 400 });
  }

  if (body.room !== undefined || body.cabinet !== undefined || body.drawer !== undefined) {
    const room = Number(body.room ?? existingStudent.room);
    const cabinet = canonicalizeCabinetId(body.cabinet ?? existingStudent.cabinet);
    const drawer = Number(body.drawer ?? existingStudent.drawer);
    const layout = await getStorageLayout({ officeId });
    const roomDef = layout?.rooms?.find((entry) => Number(entry.id) === room);
    if (!roomDef) {
      return NextResponse.json({ ok: false, error: `Storage Room ${room} does not exist in the system` }, { status: 400 });
    }
    const cabinetDef = roomDef.cabinets?.find((entry) => areCabinetsEqual(entry.id, cabinet, roomDef.cabinets));
    if (!cabinetDef) {
      return NextResponse.json({ ok: false, error: `Cabinet ${cabinet} does not exist in Room ${room}` }, { status: 400 });
    }
    if (!cabinetDef.drawerIds?.some((id) => String(id) === String(drawer))) {
      return NextResponse.json({ ok: false, error: `Drawer ${drawer} does not exist in Cabinet ${cabinet} (Room ${room})` }, { status: 400 });
    }
  }

  // Handle explicit status toggle (archiving/restoring) when submitted as a standalone lifecycle action
  if (!hasProfileFields) {
    if (body.status === "Active") {
      const layout = await getStorageLayout({ officeId });
      const roomDef = layout?.rooms?.find((entry) => Number(entry.id) === Number(existingStudent.room));
      const cabinetDef = roomDef?.cabinets?.find((entry) => areCabinetsEqual(entry.id, existingStudent.cabinet, roomDef.cabinets));
      const drawerValid = cabinetDef?.drawerIds?.some((id) => String(id) === String(existingStudent.drawer));

      if (!roomDef || !cabinetDef || !drawerValid) {
        return NextResponse.json({
          ok: false,
          error: `Cannot restore student: their assigned physical location (Room ${existingStudent.room || "N/A"}, Cabinet ${existingStudent.cabinet || "N/A"}, Drawer ${existingStudent.drawer || "N/A"}) no longer exists in the storage layout. Please update their room, cabinet, and drawer before restoring.`,
        }, { status: 400 });
      }

      const row = await restoreStudent(studentNo, { officeId });
      if (!row) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
      await writeAuditLog(req, `Restore Student`, {
        details: `restored student record '${row.name}' (ID: ${studentNo}) in office '${officeId}'`,
        entity_type: "Student",
        entity_id: studentNo
      });
      return NextResponse.json({ ok: true, data: sanitizeUser(row) });
    } else if (body.status === "Archived") {
      const row = await archiveStudent(studentNo, { officeId });
      if (!row) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
      await writeAuditLog(req, `Archive Student`, {
        details: `archived student record '${row.name}' (ID: ${studentNo}) in office '${officeId}'`,
        severity: "WARNING",
        entity_type: "Student",
        entity_id: studentNo
      });
      return NextResponse.json({ ok: true, data: sanitizeUser(row) });
    }
  }

  const row = await updateStudent(studentNo, {
    ...nameParts,
    name: body.name === undefined ? undefined : String(body.name).trim(),
    courseCode:
      body.courseCode === undefined ? undefined : String(body.courseCode).trim(),
    yearLevel: body.yearLevel,
    section: body.section === undefined ? undefined : String(body.section).trim(),
    room: body.room,
    cabinet: body.cabinet === undefined ? undefined : canonicalizeCabinetId(body.cabinet),
    drawer: body.drawer,
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
  const existingStudent = await getStudentByStudentNo(studentNo, { officeId, includeArchivedMembership: true });
  if (!existingStudent || !canAccessResource(access.user, "student", { ...existingStudent, office_id: officeId })) {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }
  const row = await archiveStudent(studentNo, { officeId });
  if (!row || !canAccessResource(access.user, "student", { ...row, office_id: officeId })) {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }
  await writeAuditLog(req, `Archive Student`, {
    details: `archived student record '${row.name}' (ID: ${studentNo}) in office '${officeId}'`,
    severity: "WARNING",
    entity_type: "Student",
    entity_id: studentNo
  });

  return NextResponse.json({ ok: true, data: sanitizeUser(row) });
}
