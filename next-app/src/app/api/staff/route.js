import { NextResponse } from "next/server";
import { createStaff, listStaff } from "../../../lib/staffRepo";
import { writeAuditLog } from "../../../lib/auditLogRequest";
import { requireTOTP, extractTOTPToken } from "../../../lib/totpMiddleware";
import { getPrincipalOfficeId, requireAdmin, requireStaff, createAuthErrorResponse } from "../../../lib/authHelpers";
import { isUniqueViolation } from "../../../lib/dbErrors";
import { canManageStaffRole, canAccessOffice, isSystemAdminRole, normalizeRole } from "../../../lib/roleUtils";
import { validatePasswordPolicy } from "@/lib/passwordPolicy";
import { canAccessResource } from "@/lib/resourceAuthorization";
import { sanitizeUser } from "@/lib/dataSanitizer";

export const runtime = "nodejs";

const DEFAULT_PASSWORD = process.env.DEFAULT_STAFF_PASSWORD || "pupstaff";

export async function GET(req) {
  const { user, error } = await requireAdmin(req);
  if (error || !user) {
    return createAuthErrorResponse(error || "Admin access required", 403);
  }

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") || "";
  const role = searchParams.get("role") || "";
  const status = searchParams.get("status") || "";
  const limit = searchParams.get("limit") || "200";
  const offset = searchParams.get("offset") || "0";

  // Resolve office filter context
  let officeId = getPrincipalOfficeId(user); // default to user's own office
  if (!isSystemAdminRole(user.role) && !officeId) {
    return createAuthErrorResponse("Office scope is required", 403);
  }
  if (isSystemAdminRole(user.role)) {
    const officeFilter = searchParams.get("officeId");
    if (officeFilter === "global" || officeFilter === "null") {
      officeId = null;
    } else if (officeFilter && officeFilter !== "All") {
      officeId = officeFilter;
    } else {
      officeId = undefined; // SuperAdmin sees all by default
    }
  } else {
    // Non-SuperAdmin (e.g. Registrar Admin) is strictly scoped to their office
    officeId = user.office_id || officeFilter || "registrar";
  }

  const rows = await listStaff({
    officeId,
    q: q || undefined,
    role: role || undefined,
    status: status || undefined,
    limit,
    offset,
  });

  const accessibleRows = rows.filter((row) => canAccessResource(user, "staff", row));
  return NextResponse.json({ ok: true, data: sanitizeUser(accessibleRows) });
}

export async function POST(req) {
  const { user, error } = await requireAdmin(req);
  if (error || !user) {
    return createAuthErrorResponse(error || "Admin access required", 403);
  }

  const totpToken = extractTOTPToken(req.headers);
  const totpResult = await requireTOTP(user.id, totpToken, { requireEnabled: true });
  if (!totpResult.valid) {
    return NextResponse.json(
      { ok: false, error: "TOTP verification required: " + totpResult.error, requiresTOTP: true },
      { status: 403 }
    );
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const id = String(body.id || "").trim();
  const fname = String(body.fname || "").trim();
  const lname = String(body.lname || "").trim();
  const role = String(body.role || "").trim();
  const section = String(body.section || "").trim();
  const status = "Inactive";
  const email = String(body.email || "").trim();
  const password =
    body.password === undefined || body.password === null || String(body.password) === ""
      ? DEFAULT_PASSWORD
      : String(body.password);
  const passwordPolicy = validatePasswordPolicy(password, { allowDefault: process.env.NODE_ENV !== "production" });
  const lastActive =
    body.lastActive === undefined ? undefined : String(body.lastActive).trim();

  if (!id || !fname || !lname || !role || !section || !email) {
    return NextResponse.json(
      { ok: false, error: "Missing required fields" },
      { status: 400 }
    );
  }
  if (!passwordPolicy.valid || (process.env.NODE_ENV === "production" && body.password === undefined)) {
    return NextResponse.json({ ok: false, error: "A non-default password is required." }, { status: 400 });
  }

  if (!canManageStaffRole(user.role, role)) {
    return NextResponse.json({ ok: false, error: "You are not authorized to assign that role." }, { status: 403 });
  }

  // Resolve officeId for new staff
  let officeId = getPrincipalOfficeId(user); // Default: user's own office
  if (isSystemAdminRole(user.role)) {
    officeId = String(body.officeId || body.office_id || "").trim().toLowerCase() || null;
    if (!officeId && !isSystemAdminRole(role)) {
      return NextResponse.json({ ok: false, error: "Office scope is required for office staff accounts." }, { status: 400 });
    }
  } else if (!officeId) {
    return createAuthErrorResponse("Office scope is required", 403);
  } else if (body.officeId !== undefined || body.office_id !== undefined) {
    const requestedOffice = body.officeId ?? body.office_id;
    if (!canAccessOffice(user, requestedOffice)) {
      return NextResponse.json({ ok: false, error: "You cannot assign staff outside your office." }, { status: 403 });
    }
  }

  try {
    const row = await createStaff({
      id,
      officeId,
      fname,
      lname,
      role,
      section,
      status,
      email,
      lastActive,
      password,
    });
    if (!row || !canAccessResource(user, "staff", row)) {
      return NextResponse.json({ ok: false, error: "Staff account could not be created" }, { status: 500 });
    }
    await writeAuditLog(req, `Create Staff Account`, {
      details: `provisioned new personnel account for '${fname} ${lname}' (ID: ${id}, Role: ${normalizeRole(role)}, Section: ${section}, Office: ${officeId || "Global"})`,
      entity_type: "User",
      entity_id: id
    });

    return NextResponse.json({ ok: true, data: row }, { status: 201 });
  } catch (e) {
    const msg = String(e?.message || "");
    if (isUniqueViolation(e)) {
      return NextResponse.json(
        { ok: false, error: "Staff ID already exists" },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { ok: false, error: "Failed to create staff" },
      { status: 500 }
    );
  }
}
