import { NextResponse } from "next/server";
import { clearRateLimitViolation } from "@/lib/rateLimitRepo";
import { writeAuditLog } from "@/lib/auditLogRequest";
import { requireAdmin, createAuthErrorResponse } from "@/lib/authHelpers";

export const runtime = "nodejs";

export async function POST(req) {
  const access = await requireAdmin(req);
  if (access.error || !access.user) return createAuthErrorResponse(access.error || "Admin access required", access.error?.startsWith("Access denied") ? 403 : 401);

  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ ok: false, error: "Invalid request body" }, { status: 400 });
    }
    if (Object.keys(body).some((field) => !["endpointType", "identifier"].includes(field))) {
      return NextResponse.json({ ok: false, error: "Unsupported rate limit field" }, { status: 400 });
    }
    const { endpointType, identifier } = body;

    if (typeof endpointType !== "string" || !endpointType.trim() || typeof identifier !== "string" || !identifier.trim()) {
      return NextResponse.json({ 
        ok: false, 
        error: "Missing required fields: endpointType, identifier" 
      }, { status: 400 });
    }

    // Clear the violation
    const result = await clearRateLimitViolation(endpointType.trim(), identifier.trim());

    // Log the admin action
    await writeAuditLog(req, `Security Maintenance`, {
      details: `manually purged brute-force protection locks for '${identifier.trim()}' (Endpoint: ${endpointType.trim()}) and restored access permissions`,
      severity: "WARNING",
      entity_type: "Security",
      entity_id: identifier.trim()
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
