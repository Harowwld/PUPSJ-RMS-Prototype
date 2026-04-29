import { NextResponse } from "next/server";
import { dbRun } from "../../../../lib/sqlite";

export const runtime = "nodejs";

export async function POST(req) {
  try {
    // Clear all rate limit violations (lockouts)
    const result = await dbRun("DELETE FROM rate_limit_violations");
    
    // Clear all rate limit hits
    const hitsResult = await dbRun("DELETE FROM rate_limit_hits");
    
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
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
