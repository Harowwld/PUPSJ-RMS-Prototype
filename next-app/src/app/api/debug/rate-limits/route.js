import { NextResponse } from "next/server";
import { dbGet, dbAll } from "../../../../lib/sqlite";
import { getRateLimitConfig, getRateLimitHits } from "../../../../lib/rateLimitRepo";
import { requireSystemAdmin, createAuthErrorResponse } from "../../../../lib/authHelpers";

export const runtime = "nodejs";

export async function GET(req) {
  const access = await requireSystemAdmin(req);
  if (access.error || !access.user) return createAuthErrorResponse(access.error || "System administrator access required", access.error?.startsWith("Access denied") ? 403 : 401);
  try {
    // Check if rate limit tables exist
    const tables = await dbAll(`
      SELECT table_name AS name FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN ('rate_limits', 'rate_limit_hits', 'rate_limit_violations')
    `);
    
    // Check rate limit config
    const config = await getRateLimitConfig('auth_login', 'default');
    
    // Check recent hits
    const hits = await getRateLimitHits('auth_login', '::1', 900);
    
    // Get all rate limit configs
    const allConfigs = await dbAll("SELECT * FROM rate_limits");
    
    // Get recent rate limit hits
    const recentHits = await dbAll("SELECT * FROM rate_limit_hits ORDER BY created_at DESC LIMIT 10");
    
    return NextResponse.json({
      ok: true,
      data: {
        tables: tables.map(t => t.name),
        authLoginConfig: config,
        recentHitsForIP: hits,
        allConfigs,
        recentHits
      }
    });
  } catch (error) {
    console.error('[Debug Rate Limits] Error:', error);
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}
