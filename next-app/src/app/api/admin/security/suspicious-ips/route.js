import { NextResponse } from "next/server";
import { getSuspiciousIPs } from "../../../../../lib/bruteForceDetector";
import { requireAdmin, createAuthErrorResponse } from "../../../../../lib/authHelpers";

export const runtime = "nodejs";

export async function GET(req) {
  const access = await requireAdmin(req);
  if (access.error || !access.user) return createAuthErrorResponse(access.error || "Admin access required", access.error?.startsWith("Access denied") ? 403 : 401);

  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const timeWindowMinutes = parseInt(searchParams.get('timeWindowMinutes') || '60');

    const suspiciousIPs = await getSuspiciousIPs(limit, timeWindowMinutes);
    
    return NextResponse.json({ 
      ok: true, 
      data: suspiciousIPs 
    });
  } catch (error) {
    console.error('[Suspicious IPs API] GET error:', error);
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}
