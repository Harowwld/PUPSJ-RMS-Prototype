import { NextResponse } from "next/server";
import { dbGet, dbRun, dbAll } from "@/lib/sqlite";
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

    const res = await dbGet(`
      SELECT q.question 
      FROM staff_security_answers ssa
      JOIN security_questions q ON ssa.question_id = q.id
      WHERE ssa.staff_id = ?
    `, [user.id]);
    
    return NextResponse.json({ 
      ok: true, 
      data: {
        hasSecurityQuestion: !!res?.question,
        securityQuestion: res?.question || null
      } 
    });
  } catch (error) {
    console.error("[GET /api/staff/security Error]:", error);
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

    // Find the question ID from the text
    const qRow = await dbGet("SELECT id FROM security_questions WHERE question = ?", [question]);
    if (!qRow) {
        return NextResponse.json({ ok: false, error: "Invalid security question" }, { status: 400 });
    }

    const answerNormalized = String(answer).trim().toLowerCase();
    const answerHash = crypto.createHash("sha256").update(answerNormalized).digest("hex");

    // Clear old answers first (since we only support 1 question for now as per choice)
    await dbRun("DELETE FROM staff_security_answers WHERE staff_id = ?", [user.id]);
    
    await dbRun(`
      INSERT INTO staff_security_answers (staff_id, question_id, answer_hash)
      VALUES (?, ?, ?)
    `, [user.id, qRow.id, answerHash]);

    await writeAuditLog(req, "Updated Security Question", {
      actor: `${user.fname || ""} ${user.lname || ""}`.trim() || user.id,
      role: user.role
    });

    return NextResponse.json({ ok: true, data: { success: true } });
  } catch (error) {
    console.error("[PUT /api/staff/security Error]:", error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}