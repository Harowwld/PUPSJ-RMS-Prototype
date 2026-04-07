import { NextResponse } from "next/server";
import { dbGet, dbRun } from "@/lib/sqlite";
import { writeAuditLog } from "@/lib/auditLogRequest";
import { verifySessionToken } from "@/lib/jwt";
import crypto from "node:crypto";

export const runtime = "nodejs";

export async function GET(req) {
  try {
    const token = req.cookies.get("session_token")?.value;
    const user = await verifySessionToken(token);
    if (!user) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const res = await dbGet("SELECT security_question FROM staff WHERE id = ?", [user.id]);
    
    return NextResponse.json({ 
      ok: true, 
      data: {
        hasSecurityQuestion: !!res?.security_question,
        securityQuestion: res?.security_question || null
      } 
    });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(req) {
  try {
    const token = req.cookies.get("session_token")?.value;
    const user = await verifySessionToken(token);
    if (!user) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const { question, answer } = await req.json();
    if (!question || !answer) {
      return NextResponse.json({ ok: false, error: "Question and answer are required" }, { status: 400 });
    }

    // Verify the question is one of the allowed global questions
    const resSettings = await dbGet("SELECT value FROM settings WHERE key = 'security_questions'");
    const globalQs = resSettings?.value ? JSON.parse(resSettings.value) : [];
    if (!globalQs.includes(question)) {
        return NextResponse.json({ ok: false, error: "Invalid security question" }, { status: 400 });
    }

    const answerNormalized = String(answer).trim().toLowerCase();
    const answerHash = crypto.createHash("sha256").update(answerNormalized).digest("hex");

    await dbRun("UPDATE staff SET security_question = ?, security_answer_hash = ? WHERE id = ?", [
      question, answerHash, user.id
    ]);

    await writeAuditLog(user.id, user.role, "Updated Security Question");

    return NextResponse.json({ ok: true, data: { success: true } });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}