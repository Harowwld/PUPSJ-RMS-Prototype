import { NextResponse } from "next/server";
import { getSuspiciousIPs } from "../../../../../lib/bruteForceDetector";
import { verifySessionToken } from "../../../../../lib/jwt";

export const runtime = "nodejs";

// Helper function to verify admin access
async function verifyAdmin(req) {
  const token = req.cookies.get('pup_session')?.value;
  if (!token) {
    return { valid: false, error: "Not authenticated" };
  }

  try {
    const payload = await verifySessionToken(token);
    if (payload?.role !== 'Admin') {
      return { valid: false, error: "Admin access required" };
    }
    return { valid: true, payload };
  } catch (error) {
    return { valid: false, error: "Invalid session" };
  }
}

export async function GET(req) {
  const auth = await verifyAdmin(req);
  if (!auth.valid) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: 401 });
  }

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
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
