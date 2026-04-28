import { NextResponse } from "next/server";
import { 
  getAllRateLimitConfigs, 
  getRateLimitViolations, 
  getRateLimitStats,
  createRateLimitConfig 
} from "../../../../lib/rateLimitRepo";
import { verifySessionToken } from "../../../../lib/jwt";

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
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req) {
  const auth = await verifyAdmin(req);
  if (!auth.valid) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: 401 });
  }

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
    
    return NextResponse.json({ 
      ok: true, 
      data: { 
        message: "Rate limit configuration updated successfully",
        changes: result.changes
      }
    });
  } catch (error) {
    console.error('[RateLimits API] POST error:', error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
