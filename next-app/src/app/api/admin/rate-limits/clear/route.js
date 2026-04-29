import { NextResponse } from "next/server";
import { clearRateLimitViolation } from "@/lib/rateLimitRepo";
import { verifySessionToken } from "@/lib/jwt";
import { writeAuditLog } from "@/lib/auditLogRequest";

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

export async function POST(req) {
  const auth = await verifyAdmin(req);
  if (!auth.valid) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { endpointType, identifier } = body;

    if (!endpointType || !identifier) {
      return NextResponse.json({ 
        ok: false, 
        error: "Missing required fields: endpointType, identifier" 
      }, { status: 400 });
    }

    // Clear the violation
    const result = await clearRateLimitViolation(endpointType, identifier);

    // Log the admin action
    await writeAuditLog(req, `Cleared rate limit violation for ${endpointType}:${identifier}`, {
      actor: auth.payload.sub || 'Unknown Admin',
      role: 'Admin',
      details: {
        endpointType,
        identifier,
        changes: result.changes
      }
    });

    return NextResponse.json({ 
      ok: true, 
      data: { 
        message: "Rate limit violation cleared successfully",
        changes: result.changes
      }
    });
  } catch (error) {
    console.error('[RateLimits Clear API] POST error:', error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
