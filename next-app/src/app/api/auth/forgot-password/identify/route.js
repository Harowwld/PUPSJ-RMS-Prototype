import { NextResponse } from "next/server";
import { dbGet } from "@/lib/sqlite";

export const runtime = "nodejs";

export async function POST(req) {
  try {
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

    const res = await dbGet(`
      SELECT q.question 
      FROM staff_security_answers ssa
      JOIN security_questions q ON ssa.question_id = q.id
      WHERE ssa.staff_id = ?
    `, [staff.id]);

    if (!res || !res.question) {
      return NextResponse.json({ ok: false, error: "This account has not set up a security question. Please contact an administrator." }, { status: 400 });
    }

    return NextResponse.json({ 
      ok: true, 
      data: {
        id: staff.id,
        name: `${staff.fname} ${staff.lname}`,
        question: res.question
      } 
    });
  } catch (error) {
    console.error("[Forgot-Password Identify Error]:", error);
    return NextResponse.json({ ok: false, error: error.message || "Internal server error" }, { status: 500 });
  }
}