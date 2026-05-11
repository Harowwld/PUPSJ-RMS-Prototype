import { NextResponse } from "next/server";
import { getAuditLogStats } from "../../../../lib/auditLogsRepo";
import { getSessionActorName } from "../../../../lib/authHelpers";

export const runtime = "nodejs";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const mine = searchParams.get("mine") === "1";
    let actor = "";
    
    if (mine) {
      actor = await getSessionActorName();
      if (!actor) {
        return NextResponse.json({ ok: true, data: { totalLogs: 0, logsToday: 0, authEvents: 0, systemChanges: 0, criticalEvents: 0 } });
      }
    }

    const stats = await getAuditLogStats(actor);
    return NextResponse.json({ ok: true, data: stats });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err.message },
      { status: 500 }
    );
  }
}
