import { NextResponse } from "next/server";
import { archiveStaff, restoreStaff, getStaffById, updateStaff } from "../../../../lib/staffRepo";
import { writeAuditLog } from "../../../../lib/auditLogRequest";
import { requireTOTP, extractTOTPToken } from "../../../../lib/totpMiddleware";
import { isUniqueViolation } from "../../../../lib/dbErrors";
import { requireAdmin, createAuthErrorResponse, getPrincipalOfficeId } from "../../../../lib/authHelpers";
import { canManageStaffRole, canAccessOffice, canDeactivateStaffAccount, isSystemAdminRole, normalizeRole } from "../../../../lib/roleUtils";
import { canAccessResource } from "../../../../lib/resourceAuthorization";
import { bumpSessionVersion } from "@/lib/authSessions";
import { queryOne } from "@/lib/postgres";

export const runtime = "nodejs";

async function getStaffDisplayNameById(id, officeId) {
  try {
    const s = await getStaffById(id, officeId ? { officeId } : {});
    return s ? `${s.fname} ${s.lname}` : id;
  } catch {
    return id;
  }
}

async function getScopedTargetStaff(id, user) {
  const officeId = isSystemAdminRole(user.role) ? null : getPrincipalOfficeId(user);
  if (!isSystemAdminRole(user.role) && !officeId) {
    return { error: "Office scope is required" };
  }
  const row = await getStaffById(id, officeId ? { officeId } : {});
  return {
    officeId,
    row: row && canAccessResource(user, "staff", row) ? row : null,
  };
}

async function getActiveGlobalAdminCount() {
  const row = await queryOne(
    `SELECT COUNT(*)::int AS count
       FROM staff
      WHERE status = 'Active'
        AND lower(role) IN ('systemadmin', 'system_admin', 'system admin', 'superadmin', 'super admin')`,
  );
  return Number(row?.count || 0);
}

async function canDeactivateTarget(actorId, targetStaff) {
  if (!canDeactivateStaffAccount({
    actorId,
    targetId: targetStaff?.id,
    targetRole: targetStaff?.role,
    activeGlobalAdminCount: Number.POSITIVE_INFINITY,
  })) return false;
  if (String(targetStaff?.status || "").toLowerCase() !== "active") return true;
  const activeGlobalAdminCount = await getActiveGlobalAdminCount();
  return canDeactivateStaffAccount({ actorId, targetId: targetStaff.id, targetRole: targetStaff.role, activeGlobalAdminCount });
}

export async function PATCH(req, ctx) {
  const access = await requireAdmin(req);
  if (access.error || !access.user) return createAuthErrorResponse(access.error || "Admin access required", access.error?.startsWith("Access denied") ? 403 : 401);
  const params = await ctx.params;
  const raw = params.id;
  const id = String(raw || "").trim();
  if (!id) {
    return NextResponse.json(
      { ok: false, error: `Invalid id: ${raw}` },
      { status: 400 }
    );
  }

  const currentUserId = access.user.id;

  const targetAccess = await getScopedTargetStaff(id, access.user);
  if (targetAccess.error) return createAuthErrorResponse(targetAccess.error, 403);
  const targetStaff = targetAccess.row;
  if (!targetStaff) {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }

  const currentUser = access.user;
  const isSuper = isSystemAdminRole(currentUser.role);
  const isAdmin = normalizeRole(currentUser.role) === "Admin";

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  // Permission Check
  if (currentUserId !== id) {
    if (!isSuper && (!isAdmin || currentUser.office_id !== targetStaff.office_id)) {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }
  } else {
    // If self-update, do not allow changing role, office_id, or status
    if (body.role !== undefined || body.officeId !== undefined || body.office_id !== undefined || body.status !== undefined) {
      return NextResponse.json({ ok: false, error: "You cannot change your own role, office, or status." }, { status: 403 });
    }
  }

  const name = await getStaffDisplayNameById(id, targetStaff.office_id);

  // Handle explicit status toggle (archiving/restoring)
  const isStatusToggle = body.status !== undefined && Object.keys(body).length === 1;
  if (isStatusToggle) {
    try {
      const totpToken = extractTOTPToken(req.headers);
      const totpResult = await requireTOTP(currentUserId, totpToken, { requireEnabled: true });
      if (!totpResult.valid) {
        return NextResponse.json(
          { ok: false, error: "TOTP verification required: " + totpResult.error, requiresTOTP: true },
          { status: 403 }
        );
      }
      if (body.status === "Inactive" || body.status === "Archived") {
        if (!(await canDeactivateTarget(currentUserId, targetStaff))) {
          return NextResponse.json({ ok: false, error: "You cannot disable yourself or the last active system administrator." }, { status: 403 });
        }
      }
      if (body.status === "Active") {
        const row = await restoreStaff(id, { officeId: targetStaff.office_id });
        if (!row) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
        await bumpSessionVersion(id);
        await writeAuditLog(req, `Restore Account`, { 
          details: `restored system access permissions for personnel account '${name}' (ID: ${id})`,
          entity_type: "User",
          entity_id: id
        });
        return NextResponse.json({ ok: true, data: row });
      } else if (body.status === "Inactive" || body.status === "Archived") {
        const row = await archiveStaff(id, { officeId: targetStaff.office_id });
        if (!row) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
        await bumpSessionVersion(id);
        await writeAuditLog(req, `Archive Account`, { 
          details: `archived personnel profile for '${name}' (ID: ${id}) and suspended all associated credentials`,
          severity: "WARNING",
          entity_type: "User",
          entity_id: id
        });
        return NextResponse.json({ ok: true, data: row });
      }
    } catch (statusErr) {
      console.error("[api/staff/[id]] status toggle error:", statusErr);
      return NextResponse.json(
        { ok: false, error: "Failed to update personnel status" },
        { status: 500 }
      );
    }
  }

  const patch = {
    id: body.id === undefined ? undefined : String(body.id).trim(),
    fname: body.fname === undefined ? undefined : String(body.fname).trim(),
    lname: body.lname === undefined ? undefined : String(body.lname).trim(),
    role: body.role === undefined ? undefined : String(body.role).trim(),
    officeId: body.officeId !== undefined ? body.officeId : (body.office_id !== undefined ? body.office_id : undefined),
    section: body.section === undefined ? undefined : String(body.section).trim(),
    email: body.email === undefined ? undefined : String(body.email).trim(),
    lastActive: body.lastActive === undefined ? undefined : String(body.lastActive).trim(),
  };

  if (patch.role !== undefined && !canManageStaffRole(currentUser.role, patch.role)) {
    return NextResponse.json({ ok: false, error: "You are not authorized to assign that role." }, { status: 403 });
  }
  if (
    patch.role !== undefined &&
    isSystemAdminRole(targetStaff.role) &&
    !isSystemAdminRole(patch.role) &&
    !(await canDeactivateTarget(currentUserId, targetStaff))
  ) {
    return NextResponse.json({ ok: false, error: "You cannot remove the last active system administrator." }, { status: 403 });
  }
  if (patch.officeId !== undefined && !isSuper && String(patch.officeId || "") !== String(targetStaff.office_id || "")) {
    return NextResponse.json({ ok: false, error: "You cannot move staff between offices." }, { status: 403 });
  }

  const needsTOTP = Object.keys(patch).some((key) => patch[key] !== undefined);
  if (needsTOTP) {
    const totpToken = extractTOTPToken(req.headers);
    const totpResult = await requireTOTP(currentUserId, totpToken, { requireEnabled: true });
    if (!totpResult.valid) {
      return NextResponse.json(
        { ok: false, error: "TOTP verification required: " + totpResult.error, requiresTOTP: true },
        { status: 403 }
      );
    }
  }

  try {
    const row = await updateStaff(id, patch, { officeId: targetStaff.office_id });
    if (!row) {
      return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
    }
    if (patch.role !== undefined || patch.officeId !== undefined || patch.status !== undefined) {
      await bumpSessionVersion(id);
    }
    await writeAuditLog(req, `Update Account`, { 
      details: `modified profile configuration and registry metadata for personnel '${name}' (ID: ${id})`,
      entity_type: "User",
      entity_id: id
    });

    return NextResponse.json({ ok: true, data: row });
  } catch (e) {
    const msg = String(e?.message || "");
    if (isUniqueViolation(e)) {
      return NextResponse.json(
        { ok: false, error: "Staff ID already exists" },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { ok: false, error: "Failed to update staff" },
      { status: 500 }
    );
  }
}

export async function DELETE(req, ctx) {
  const access = await requireAdmin(req);
  if (access.error || !access.user) return createAuthErrorResponse(access.error || "Admin access required", access.error?.startsWith("Access denied") ? 403 : 401);
  const params = await ctx.params;
  const raw = params.id;
  const id = String(raw || "").trim();
  if (!id) {
    return NextResponse.json(
      { ok: false, error: `Invalid id: ${raw}` },
      { status: 400 }
    );
  }

  const currentUserId = access.user.id;

  const targetAccess = await getScopedTargetStaff(id, access.user);
  if (targetAccess.error) return createAuthErrorResponse(targetAccess.error, 403);
  const targetStaff = targetAccess.row;
  if (!targetStaff) {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }

  const currentUser = access.user;
  const isSuper = isSystemAdminRole(currentUser.role);
  const isAdmin = normalizeRole(currentUser.role) === "Admin";

  if (!isSuper && (!isAdmin || currentUser.office_id !== targetStaff.office_id)) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const totpToken = extractTOTPToken(req.headers);
  const totpResult = await requireTOTP(currentUserId, totpToken, { requireEnabled: true });
  if (!totpResult.valid) {
    return NextResponse.json(
      { ok: false, error: "TOTP verification required: " + totpResult.error, requiresTOTP: true },
      { status: 403 }
    );
  }

  if (currentUserId === id) {
    return NextResponse.json(
      { ok: false, error: "You cannot archive your own account." },
      { status: 403 }
    );
  }

  if (!(await canDeactivateTarget(currentUserId, targetStaff))) {
    return NextResponse.json({ ok: false, error: "You cannot disable yourself or the last active system administrator." }, { status: 403 });
  }

  const row = await archiveStaff(id, { officeId: targetStaff.office_id });
  if (!row) {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }
  await bumpSessionVersion(id);
  const name = `${targetStaff.fname} ${targetStaff.lname}`;
  await writeAuditLog(req, `Archive Account`, { 
    details: `archived personnel profile for '${name}' (ID: ${id}) via administrative DELETE protocol`,
    severity: "WARNING",
    entity_type: "User",
    entity_id: id
  });

  return NextResponse.json({ ok: true, data: row });
}

export async function GET(req, ctx) {
  const access = await requireAdmin(req);
  if (access.error || !access.user) return createAuthErrorResponse(access.error || "Admin access required", access.error?.startsWith("Access denied") ? 403 : 401);
  const params = await ctx.params;
  const raw = params.id;
  const id = String(raw || "").trim();
  if (!id) {
    return NextResponse.json(
      { ok: false, error: `Invalid id: ${raw}` },
      { status: 400 }
    );
  }

  const currentUserId = access.user.id;

  const targetAccess = await getScopedTargetStaff(id, access.user);
  if (targetAccess.error) return createAuthErrorResponse(targetAccess.error, 403);
  const row = targetAccess.row;
  if (!row) {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }

  // Permission Check
  if (currentUserId !== id) {
    const currentUser = access.user;
    const isSuper = isSystemAdminRole(currentUser.role);
    const isAdmin = normalizeRole(currentUser.role) === "Admin";
    if (!isSuper && (!isAdmin || currentUser.office_id !== row.office_id)) {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }
  }

  return NextResponse.json({ ok: true, data: row });
}
