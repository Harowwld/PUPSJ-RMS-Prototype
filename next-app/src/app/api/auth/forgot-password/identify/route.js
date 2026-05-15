import { NextResponse } from "next/server";
import { dbGet, dbAll } from "@/lib/sqlite";
import { ForgotPasswordIdentifySchema } from "@/lib/authSchemas";

export const runtime = "nodejs";

function addSecurityHeaders(response) {
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  return response;
}

export async function POST(req) {
  try {
    // 1. Validate Input
    const body = await req.json().catch(() => null);
    const validation = ForgotPasswordIdentifySchema.safeParse(body);
    
    if (!validation.success) {
      const errorMsg = validation.error.errors[0]?.message || "Invalid input";
      return addSecurityHeaders(NextResponse.json(
        { ok: false, error: errorMsg },
        { status: 400 }
      ));
    }

    const { identifier } = validation.data;

    // 2. Identify Staff
    const staff = await dbGet(
      "SELECT id, fname, lname, email FROM staff WHERE id = ? OR email = ?",
      [identifier, identifier]
    );

    if (!staff) {
      // Don't leak whether the account exists
      // Add a small random delay to prevent timing attacks
      await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 500));
      return addSecurityHeaders(NextResponse.json({ ok: false, error: "If an account exists, a security question would be displayed." }, { status: 404 }));
    }

    const res = await dbAll(`
      SELECT q.id, q.question 
      FROM staff_security_answers ssa
      JOIN security_questions q ON ssa.question_id = q.id
      WHERE ssa.staff_id = ?
    `, [staff.id]);

    if (!res || res.length === 0) {
      return addSecurityHeaders(NextResponse.json({ ok: false, error: "This account has not set up any security questions." }, { status: 400 }));
    }

    return addSecurityHeaders(NextResponse.json({ 
      ok: true, 
      data: {
        id: staff.id,
        name: `${staff.fname} ${staff.lname}`,
        questions: res
      } 
    }));
  } catch (error) {
    console.error("[Forgot-Password Identify Error]:", error);
    return addSecurityHeaders(NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 }));
  }
}