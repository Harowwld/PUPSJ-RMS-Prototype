import { NextResponse } from "next/server";
import { requireStaff, createAuthErrorResponse, getPrincipalOfficeId } from "@/lib/authHelpers";
import { listArchiveDocuments, listOsasArchiveDocuments } from "@/lib/documentsRepo";
import { isValidCalendarDateRange } from "@/lib/timeFormat";
import { canAccessResource } from "@/lib/resourceAuthorization";

export const runtime = "nodejs";

export async function GET(req) {
  const { user, error } = await requireStaff(req);
  if (error || !user) return createAuthErrorResponse(error || "Staff authentication required", 401);
  const officeId = getPrincipalOfficeId(user);
  if (!officeId) return createAuthErrorResponse("Office scope is required", 403);
  const params = new URL(req.url).searchParams;
  const year = params.has("year") ? Number(params.get("year")) : null;
  if (year != null && (!Number.isInteger(year) || year < 1900 || year > 2200)) {
    return NextResponse.json({ ok: false, error: "Invalid year" }, { status: 400 });
  }
  const startDate = params.get("startDate") || "";
  const endDate = params.get("endDate") || "";
  if (!isValidCalendarDateRange(startDate, endDate)) {
    return NextResponse.json({ ok: false, error: "Invalid date range" }, { status: 400 });
  }
  let filterRules;
  try {
    filterRules = JSON.parse(params.get("rules") || "[]");
    if (!Array.isArray(filterRules)) throw new Error("Invalid rules");
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid filters" }, { status: 400 });
  }
  const options = {
    filterRules, startDate, endDate,
    sortBy: params.get("sortBy"),
    sortOrder: params.get("sortOrder"),
    officeId,
    q: params.get("q") || "",
    year,
    page: Math.max(1, Number.parseInt(params.get("page") || "1", 10) || 1),
    pageSize: Math.max(1, Math.min(100, Number.parseInt(params.get("pageSize") || "10", 10) || 10)),
    groupBy: params.get("groupBy"),
    organizationId: params.get("organizationId") || "",
    allForOrganization: params.get("mode") === "organization" && Boolean(params.get("organizationId")),
  };
  const data = officeId === "osas"
    ? await listOsasArchiveDocuments(options)
    : await listArchiveDocuments(options);
  return NextResponse.json({ ok: true, data: { rows: data.rows.filter((row) => canAccessResource(user, "document", row)), total: data.total } }, { headers: { "Cache-Control": "private, no-store" } });
}
