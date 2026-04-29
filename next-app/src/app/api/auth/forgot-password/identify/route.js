import { NextResponse } from "next/server";
import { dbGet, dbAll } from "@/lib/sqlite";
import { checkAuthForgotPasswordRateLimit } from "@/lib/rateLimiter";

export const runtime = "nodejs";

export async function POST(req) {
  try {
    // Get client IP for rate limiting
    const forwardedFor = req.headers.get('x-forwarded-for');
    const realIP = req.headers.get('x-real-ip');
    const ipAddress = forwardedFor ? forwardedFor.split(',')[0].trim() : 
                      realIP ? realIP.trim() : 
                      req.ip || 'unknown';

    // Check rate limit
    const rateLimitResult = await checkAuthForgotPasswordRateLimit(ipAddress);
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { 
          ok: false, 
          error: rateLimitResult.reason === 'locked_out' 
            ? `Too many password reset attempts. Account temporarily locked. Please try again later.`
            : 'Too many password reset attempts. Please try again later.',
          retryAfter: rateLimitResult.resetTime ? Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000) : undefined
        },
        { 
          status: 429,
          headers: rateLimitResult.resetTime ? {
            'Retry-After': Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000),
            'X-RateLimit-Limit': rateLimitResult.limit,
            'X-RateLimit-Remaining': Math.max(0, rateLimitResult.remaining || 0),
            'X-RateLimit-Reset': new Date(rateLimitResult.resetTime).toISOString()
          } : {}
        }
      );
    }

    const { identifier } = await req.json();
    if (!identifier) {
      return NextResponse.json({ ok: false, error: "Email or Staff ID is required" }, { status: 400 });
    }

    const staff = await dbGet(
      "SELECT id, fname, lname, email FROM staff WHERE id = ? OR email = ?",
      [identifier, identifier]
    );

    if (!staff) {
      // Don't leak whether the account exists
      return NextResponse.json({ ok: false, error: "If an account exists, a security question would be displayed." }, { status: 404 });
    }

    const res = await dbAll(`
      SELECT q.id, q.question 
      FROM staff_security_answers ssa
      JOIN security_questions q ON ssa.question_id = q.id
      WHERE ssa.staff_id = ?
    `, [staff.id]);

    if (!res || res.length === 0) {
      return NextResponse.json({ ok: false, error: "This account has not set up any security questions." }, { status: 400 });
    }

    return NextResponse.json({ 
      ok: true, 
      data: {
        id: staff.id,
        name: `${staff.fname} ${staff.lname}`,
        questions: res
      } 
    });
  } catch (error) {
    console.error("[Forgot-Password Identify Error]:", error);
    return NextResponse.json({ ok: false, error: error.message || "Internal server error" }, { status: 500 });
  }
}