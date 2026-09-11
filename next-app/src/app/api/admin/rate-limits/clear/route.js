import { NextResponse } from "next/server";
import { clearRateLimitViolation } from "@/lib/rateLimitRepo";
import { writeAuditLog } from "@/lib/auditLogRequest";
import { requireAdmin, createAuthErrorResponse } from "@/lib/authHelpers";

export const runtime = "nodejs";

export async function POST(req) {
  const access = await requireAdmin(req);
  if (access.error || !access.user) return createAuthErrorResponse(access.error || "Admin access required", access.error?.startsWith("Access denied") ? 403 : 401);

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
    await writeAuditLog(req, `Security Maintenance`, {
      details: `manually purged brute-force protection locks for '${identifier}' (Endpoint: ${endpointType}) and restored access permissions`,
      severity: "WARNING",
      entity_type: "Security",
      entity_id: identifier
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
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}
