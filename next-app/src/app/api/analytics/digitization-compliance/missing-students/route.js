import { NextResponse } from "next/server";
import {
  createAuthErrorResponse,
  getPrincipalOfficeId,
  requireAdmin,
} from "../../../../../lib/authHelpers";
import { isSystemAdminRole } from "../../../../../lib/roleUtils";
import { queryOne } from "../../../../../lib/postgres";
import { getMissingStudentsForDocumentType } from "../../../../../lib/digitizationComplianceRepo";

export const runtime = "nodejs";

export async function GET(req) {
  const access = await requireAdmin(req);
  if (access.error || !access.user) {
    return createAuthErrorResponse(
      access.error || "Admin access required",
      access.error?.startsWith("Access denied") ? 403 : 401,
    );
  }

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

    const rawCourseCodes = [
      ...searchParams.getAll("courseCode"),
      ...searchParams.getAll("courseCodes"),
    ];
    const courseCodes = rawCourseCodes
      .flatMap((value) => value.split(","))
      .map((value) => value.trim())
      .filter(Boolean);
    const rawOffset = Number.parseInt(searchParams.get("offset") || "0", 10);
    const rawLimit = Number.parseInt(searchParams.get("limit") || "20", 10);
    const data = await getMissingStudentsForDocumentType({
      documentTypeId: searchParams.get("documentTypeId"),
      studentStatus: searchParams.get("status") || "Active",
      courseCodes: courseCodes.length ? courseCodes : undefined,
      requireApproved: ["1", "true", "yes"].includes(
        String(searchParams.get("requireApproved") || "").trim().toLowerCase(),
      ),
      officeId,
      limit: Number.isFinite(rawLimit) ? rawLimit : 20,
      offset: Number.isFinite(rawOffset) ? rawOffset : 0,
    });

    if (!data) {
      return NextResponse.json({ ok: false, error: "Compliance document type not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, data });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Failed to load students missing this document" },
      { status: 500 },
    );
  }
}
