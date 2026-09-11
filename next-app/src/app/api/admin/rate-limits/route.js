import { NextResponse } from "next/server";
import { 
  getAllRateLimitConfigs, 
  getRateLimitViolations, 
  getRateLimitStats,
  createRateLimitConfig 
} from "../../../../lib/rateLimitRepo";
import { writeAuditLog } from "@/lib/auditLogRequest";
import { requireAdmin, createAuthErrorResponse } from "@/lib/authHelpers";

export const runtime = "nodejs";

export async function GET(req) {
  const access = await requireAdmin(req);
  if (access.error || !access.user) return createAuthErrorResponse(access.error || "Admin access required", access.error?.startsWith("Access denied") ? 403 : 401);

  const { searchParams } = new URL(req.url);
  const action = searchParams.get('action');

  try {
    switch (action) {
      case 'violations':
        const limit = parseInt(searchParams.get('limit') || '50');
        const offset = parseInt(searchParams.get('offset') || '0');
        const violations = await getRateLimitViolations(limit, offset);
        return NextResponse.json({ ok: true, data: violations });

      case 'stats':
        const hours = parseInt(searchParams.get('hours') || '24');
        const endpointType = searchParams.get('endpointType') || null;
        const stats = await getRateLimitStats(endpointType, hours);
        return NextResponse.json({ ok: true, data: stats });

      case 'configs':
        const configs = await getAllRateLimitConfigs();
        return NextResponse.json({ ok: true, data: configs });

      default:
        // Return dashboard overview
        const [violationsData, statsData, configsData] = await Promise.all([
          getRateLimitViolations(20, 0),
          getRateLimitStats(null, 24),
          getAllRateLimitConfigs()
        ]);

        return NextResponse.json({ 
          ok: true, 
          data: {
            recentViolations: violationsData,
            stats: statsData,
            configs: configsData
          }
        });
    }
  } catch (error) {
    console.error('[RateLimits API] GET error:', error);
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req) {
  const access = await requireAdmin(req);
  if (access.error || !access.user) return createAuthErrorResponse(access.error || "Admin access required", access.error?.startsWith("Access denied") ? 403 : 401);

  try {
    const body = await req.json();
    const { endpointType, identifier, windowSeconds, maxRequests } = body;

    if (!endpointType || !identifier || !windowSeconds || !maxRequests) {
      return NextResponse.json({ 
        ok: false, 
        error: "Missing required fields: endpointType, identifier, windowSeconds, maxRequests" 
      }, { status: 400 });
    }

    if (windowSeconds < 1 || maxRequests < 1) {
      return NextResponse.json({ 
        ok: false, 
        error: "windowSeconds and maxRequests must be positive integers" 
      }, { status: 400 });
    }

    const result = await createRateLimitConfig(endpointType, identifier, windowSeconds, maxRequests);
    await writeAuditLog(req, "Create Rate Limit Configuration", {
      details: `${endpointType}/${identifier}: ${maxRequests} requests per ${windowSeconds} seconds.`,
      entity_type: "rate_limit_config",
      entity_id: `${endpointType}:${identifier}`,
    });
    
    return NextResponse.json({ 
      ok: true, 
      data: { 
        message: "Rate limit configuration updated successfully",
        changes: result.changes
      }
    });
  } catch (error) {
    console.error('[RateLimits API] POST error:', error);
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}
