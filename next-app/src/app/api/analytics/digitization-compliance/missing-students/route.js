import { NextResponse } from "next/server";
import { isValidCalendarDateRange } from "@/lib/timeFormat";
import {
  createAuthErrorResponse,
  getPrincipalOfficeId,
  requireStaff,
} from "../../../../../lib/authHelpers";
import { isSystemAdminRole } from "../../../../../lib/roleUtils";
import { queryOne } from "../../../../../lib/postgres";
import { getMissingStudentsForDocumentType } from "../../../../../lib/digitizationComplianceRepo";
import { buildComplianceRosterCsv } from "../../../../../lib/complianceReportExport";
import { writeAuditLog } from "../../../../../lib/auditLogRequest";

export const runtime = "nodejs";

export async function GET(req) {
  const access = await requireStaff(req);
  if (access.error || !access.user) {
    return createAuthErrorResponse(
      access.error || "Staff authentication required",
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
    if (!isGlobalAdmin && requestedOfficeId && requestedOfficeId !== officeId) {
      return createAuthErrorResponse("Access denied to that office", 403);
    }
    if (isGlobalAdmin && requestedOfficeId) {
      const office = await queryOne(
        "SELECT id FROM offices WHERE lower(id) = lower($1) AND status = 'Active'",
        [requestedOfficeId],
      );
      if (!office) return NextResponse.json({ ok: false, error: "Office not found" }, { status: 404 });
    }

    const startDate = searchParams.get("startDate") || "";
    const endDate = searchParams.get("endDate") || "";
    if (!isValidCalendarDateRange(startDate, endDate)) {
      return NextResponse.json({ ok: false, error: "Invalid student record date range." }, { status: 400 });
    }

    const rawCourseCodes = [
      ...searchParams.getAll("courseCode"),
      ...searchParams.getAll("courseCodes"),
      ...searchParams.getAll("course"),
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
      startDate,
      endDate,
      courseCodes: courseCodes.length ? courseCodes : undefined,
      requireApproved: !["0", "false", "no"].includes(
        String(searchParams.get("requireApproved") || "").trim().toLowerCase(),
      ),
      officeId,
      limit: Number.isFinite(rawLimit) ? rawLimit : 20,
      offset: Number.isFinite(rawOffset) ? rawOffset : 0,
      complianceStatus: searchParams.get("complianceStatus") || "incomplete",
      search: searchParams.get("search") || "",
      excludedCourseCodes: searchParams.getAll("excludeCourseCode"),
      excludedMissingDocTypes: searchParams.getAll("excludeMissingDocType"),
      missingDocTypes: searchParams.getAll("missingDocType"),
      sortBy: searchParams.get("sortBy"),
      groupBy: searchParams.get("groupBy"),
      sortOrder: searchParams.get("sortOrder"),
      exportAll: searchParams.get("export") === "1" || searchParams.get("format") === "csv",
    });

    if (!data) {
      return NextResponse.json({ ok: false, error: "Compliance document type not found" }, { status: 404 });
    }
    if (searchParams.get("export") === "1" || searchParams.get("format") === "csv") {
      if (!data.meta.configured) {
        return NextResponse.json({ ok: false, error: "Configure compliance requirements before exporting a roster" }, { status: 409 });
      }
      await writeAuditLog(req, "Export compliance roster", {
        details: `${data.total} students; office=${officeId || "all"}; type=${data.documentTypeId || "all"}; status=${data.meta.studentStatus}; courses=${data.meta.courseCodes.join(",") || "all"}; approvedOnly=${data.meta.requireApproved}; generatedAt=${data.meta.generatedAt}`,
      });
    }
    if (searchParams.get("format") === "csv") {
      return new Response(buildComplianceRosterCsv(data), { headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="incomplete-records.csv"',
        "Cache-Control": "no-store",
      } });
    }
    return NextResponse.json({ ok: true, data });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Failed to load students missing this document" },
      { status: 500 },
    );
  }
}
