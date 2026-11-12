import { NextResponse } from "next/server";
import { isValidCalendarDateRange } from "@/lib/timeFormat";
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
  if (raw === null || raw === undefined) return true;
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

    const startDate = searchParams.get("startDate") || "";
    const endDate = searchParams.get("endDate") || "";
    if (!isValidCalendarDateRange(startDate, endDate)) {
      return NextResponse.json({ ok: false, error: "Invalid student record date range." }, { status: 400 });
    }

    const statusParam = searchParams.get("status");
    const studentStatus =
      statusParam === null || statusParam === ""
        ? "Active"
        : String(statusParam).trim();

    // Support multiple course codes (comma-separated or repeated parameters: courseCode, courseCodes, course)
    const courseCodeParams = [
      ...searchParams.getAll("courseCode"),
      ...searchParams.getAll("courseCodes"),
      ...searchParams.getAll("course"),
    ];
    const courseCodes = courseCodeParams
      .flatMap((c) => c.split(","))
      .map((c) => c.trim())
      .filter(Boolean);

    const requireApproved = parseBool(searchParams.get("requireApproved"));

    const data = await getDigitizationComplianceSummary({
      studentStatus,
      startDate,
      endDate,
      courseCodes: courseCodes.length ? courseCodes : undefined,
      requireApproved,
      officeId,
    });

    return NextResponse.json({ ok: true, data });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Failed to load digitization compliance" },
      { status: 500 }
    );
  }
}
