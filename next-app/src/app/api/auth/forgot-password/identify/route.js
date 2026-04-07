import { NextResponse } from "next/server";
import { dbGet } from "@/lib/sqlite";

export const runtime = "nodejs";

export async function POST(req) {
  try {
    const { identifier } = await req.json();
    if (!identifier) {
      return NextResponse.json({ ok: false, error: "Email or Staff ID is required" }, { status: 400 });
    }

    const res = await dbGet(
      "SELECT id, fname, lname, email, security_question FROM staff WHERE id = ? OR email = ?",
      [identifier, identifier]
    );

    if (!res) {
      // Don't leak whether the account exists
      return NextResponse.json({ ok: false, error: "If an account exists, a security question would be displayed." }, { status: 404 });
    }

    if (!res.security_question) {
      return NextResponse.json({ ok: false, error: "This account has not set up a security question. Please contact an administrator." }, { status: 400 });
    }

    return NextResponse.json({ 
      ok: true, 
      data: {
        id: res.id,
        name: `${res.fname} ${res.lname}`,
        question: res.security_question
      } 
    });
  } catch (error) {
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}