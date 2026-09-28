import { NextResponse } from "next/server";
import {
  getPrincipalOfficeId,
  requireAdmin,
  createAuthErrorResponse,
} from "../../../../lib/authHelpers";
import { isSystemAdminRole } from "../../../../lib/roleUtils";
import { queryOne } from "../../../../lib/postgres";

import { getDigitizationComplianceSummary } from "../../../../lib/digitizationComplianceRepo";
import { getOrganizationComplianceSummary } from "../../../../lib/organizationComplianceRepo";

export const runtime = "nodejs";

function parseBool(raw) {
  if (raw === null || raw === undefined) return false;
  const s = String(raw).trim().toLowerCase();
  return s === "1" || s === "true" || s === "yes";
}

export async function GET(req) {
  const access = await requireAdmin(req);
  if (access.error || !access.user) return createAuthErrorResponse(access.error || "Admin access required", access.error?.startsWith("Access denied") ? 403 : 401);
  try {
    const { searchParams } = new URL(req.url);
    const requestedOfficeId = String(searchParams.get("officeId") || "").trim().toLowerCase();
    const isGlobalAdmin = isSystemAdminRole(access.user.role);
    const officeId = isGlobalAdmin ? requestedOfficeId || null : getPrincipalOfficeId(access.user);
    if (!isGlobalAdmin && !officeId) {
      return createAuthErrorResponse("Office scope is required", 403);
    }
    if (isGlobalAdmin && requestedOfficeId) {
      const office = await queryOne(
        "SELECT id FROM offices WHERE lower(id) = lower($1) AND status = 'Active'",
        [requestedOfficeId],
      );
      if (!office) return NextResponse.json({ ok: false, error: "Office not found" }, { status: 404 });
    }

    if (officeId === "osas") {
      const status = searchParams.get("status") || undefined;
      const category = searchParams.get("category") || undefined;
      const complianceStatus = searchParams.get("complianceStatus") || undefined;
      const search = searchParams.get("search") || undefined;

      const data = await getOrganizationComplianceSummary({
        status,
        category,
        complianceStatus,
        search,
        officeId,
      });

      return NextResponse.json({ ok: true, data });
    }

    const statusParam = searchParams.get("status");
    const studentStatus =
      statusParam === null || statusParam === ""
        ? "Active"
        : String(statusParam).trim();

    const courseCode = searchParams.get("courseCode") || "";
    const requireApproved = parseBool(searchParams.get("requireApproved"));

    const thresholdRaw = searchParams.get("threshold");
    let threshold = 0.95;
    if (thresholdRaw !== null && thresholdRaw !== "") {
      const t = parseFloat(thresholdRaw);
      if (Number.isFinite(t)) threshold = t;
    }

    const data = await getDigitizationComplianceSummary({
      studentStatus,
      courseCode: courseCode.trim() || undefined,
      requireApproved,
      threshold,
      officeId,
    });

    return NextResponse.json({ ok: true, data });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: "Failed to load digitization compliance" },
      { status: 500 }
    );
  }
}
