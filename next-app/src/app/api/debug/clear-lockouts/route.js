import { NextResponse } from "next/server";
import { dbRun } from "../../../../lib/sqlite";
import { writeAuditLog } from "@/lib/auditLogRequest";
import { requireSystemAdmin, createAuthErrorResponse } from "../../../../lib/authHelpers";

export const runtime = "nodejs";

export async function POST(req) {
  const access = await requireSystemAdmin(req);
  if (access.error || !access.user) return createAuthErrorResponse(access.error || "System administrator access required", access.error?.startsWith("Access denied") ? 403 : 401);
  try {
    // Clear all rate limit violations (lockouts)
    const result = await dbRun("DELETE FROM rate_limit_violations");
    
    // Clear all rate limit hits
    const hitsResult = await dbRun("DELETE FROM rate_limit_hits");
    await writeAuditLog(req, "Cleared Rate Limit Lockouts", {
      details: `Cleared ${result.changes || 0} violations and ${hitsResult.changes || 0} rate-limit hits.`,
      entity_type: "rate_limit_violations",
    });
    
    return NextResponse.json({
      ok: true,
      data: {
        message: "All rate limit lockouts and hits cleared",
        violationsDeleted: result.changes,
        hitsDeleted: hitsResult.changes
      }
    });
  } catch (error) {
    console.error('[Clear Lockouts] Error:', error);
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}
