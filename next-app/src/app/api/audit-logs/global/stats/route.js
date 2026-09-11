import { NextResponse } from "next/server";
import { getGlobalAuditLogStats } from "@/lib/auditLogsRepo";
import {
  getPrincipalOfficeId,
  requireAdmin,
  createAuthErrorResponse,
} from "@/lib/authHelpers";
import { isSystemAdminRole } from "@/lib/roleUtils";

export const runtime = "nodejs";

export async function GET(req) {
  const access = await requireAdmin(req);
  if (access.error || !access.user) return createAuthErrorResponse(access.error || "Admin access required", access.error?.startsWith("Access denied") ? 403 : 401);

  try {
    const { searchParams } = new URL(req.url);
    const requestedOfficeId = searchParams.get("officeId") || "";
    const officeId = isSystemAdminRole(access.user.role)
      ? requestedOfficeId
      : getPrincipalOfficeId(access.user);
    if (!isSystemAdminRole(access.user.role) && !officeId) {
      return createAuthErrorResponse("Office scope is required", 403);
    }
    const severity = searchParams.get("severity") || "";
    const role = searchParams.get("role") || "";
    const startDate = searchParams.get("startDate") || "";
    const endDate = searchParams.get("endDate") || "";
    const search = searchParams.get("search") || "";

    const stats = await getGlobalAuditLogStats({
      officeId,
      severity,
      role,
      startDate,
      endDate,
      search,
    });
    return NextResponse.json({ ok: true, data: stats });
  } catch (err) {
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}
