import { NextResponse } from "next/server";
import { getAuditLogStats } from "../../../../lib/auditLogsRepo";
import { isAdmin, requireAuth, createAuthErrorResponse } from "../../../../lib/authHelpers";
import { getPrincipalOfficeId } from "../../../../lib/authHelpers";
import { isSystemAdminRole } from "../../../../lib/roleUtils";

export const runtime = "nodejs";

export async function GET(req) {
  try {
    const auth = await requireAuth(req);
    if (auth.error || !auth.user) return createAuthErrorResponse(auth.error || "Authentication required", auth.error?.startsWith("Access denied") ? 403 : 401);
    const { searchParams } = new URL(req.url);
    const mine = searchParams.get("mine") === "1";
    const isStudent = auth.user.principalType === "student";
    const isGlobalAdmin = isSystemAdminRole(auth.user.role);
    const officeId = isGlobalAdmin || isStudent ? "" : getPrincipalOfficeId(auth.user);
    if (!mine && !isAdmin(auth.user)) return createAuthErrorResponse("Access denied", 403);
    if (!isStudent && !isGlobalAdmin && !officeId) return createAuthErrorResponse("Office scope is required", 403);
    let actor = "";
    
    if (mine) {
      actor = auth.user.studentNo || `${auth.user.fname || ""} ${auth.user.lname || ""}`.trim();
      if (!actor) {
        return NextResponse.json({ ok: true, data: { totalLogs: 0, logsToday: 0, authEvents: 0, systemChanges: 0, criticalEvents: 0 } });
      }
    }

    const stats = await getAuditLogStats(actor, officeId);
    return NextResponse.json({ ok: true, data: stats });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
