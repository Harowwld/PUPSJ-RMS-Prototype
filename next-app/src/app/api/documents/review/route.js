import { NextResponse } from "next/server";
import { requireAdmin, createAuthErrorResponse, getPrincipalOfficeId } from "@/lib/authHelpers";
import { listReviewDocuments } from "@/lib/documentsRepo";
import { isSystemAdminRole } from "@/lib/roleUtils";

export const runtime = "nodejs";

export async function GET(req) {
  const access = await requireAdmin(req);
  if (access.error || !access.user) return createAuthErrorResponse(access.error || "Admin access required", 403);
  const officeId = getPrincipalOfficeId(access.user);
  if (!officeId && !isSystemAdminRole(access.user.role)) return createAuthErrorResponse("Office scope is required", 403);

  const params = new URL(req.url).searchParams;
  const dateFrom = params.get("dateFrom") || "";
  const dateTo = params.get("dateTo") || "";
  if ([dateFrom, dateTo].some((date) => date && !/^\d{4}-\d{2}-\d{2}$/.test(date))) {
    return NextResponse.json({ ok: false, error: "Invalid date filter" }, { status: 400 });
  }
  let statusFilters = [];
  let docTypeFilters = [];
  let filterRules = [];
  try {
    statusFilters = JSON.parse(params.get("statuses") || "[]");
    docTypeFilters = JSON.parse(params.get("docTypes") || "[]");
    filterRules = JSON.parse(params.get("rules") || "[]");
    if (![statusFilters, docTypeFilters, filterRules].every(Array.isArray)) throw new Error("Invalid filters");
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid filters" }, { status: 400 });
  }
  const data = await listReviewDocuments({
    officeId,
    page: params.get("page"),
    pageSize: params.get("pageSize"),
    statusFilters,
    docTypeFilters,
    filterRules,
    search: params.get("search") || "",
    dateFrom,
    dateTo,
    sortBy: params.get("sortBy") || "created_at",
    sortOrder: params.get("sortOrder") || "DESC",
  });
  return NextResponse.json({ ok: true, data });
}
