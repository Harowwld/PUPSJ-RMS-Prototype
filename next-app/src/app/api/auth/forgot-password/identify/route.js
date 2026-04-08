import { NextResponse } from "next/server";
import { dbGet, dbAll } from "@/lib/sqlite";

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