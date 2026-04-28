import { NextResponse } from "next/server";
import { dbGet, dbAll } from "../../../../lib/sqlite";
import { getRateLimitConfig, getRateLimitHits } from "../../../../lib/rateLimitRepo";

export const runtime = "nodejs";

export async function GET(req) {
  try {
    // Check if rate limit tables exist
    const tables = await dbAll(`
      SELECT name FROM sqlite_master 
      WHERE type='table' 
      AND name IN ('rate_limits', 'rate_limit_hits', 'rate_limit_violations')
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
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
