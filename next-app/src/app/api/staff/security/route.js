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

    const questions = await dbAll("SELECT id, question FROM security_questions ORDER BY id ASC");
    
    // Also fetch what they have answered so far, if any
    const answeredRows = await dbAll("SELECT question_id FROM staff_security_answers WHERE staff_id = ?", [user.id]);
    const answeredSet = new Set((answeredRows || []).map(r => r.question_id));
    
    return NextResponse.json({ 
      ok: true, 
      data: {
        questions: questions || [],
        answeredIds: Array.from(answeredSet)
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

    const { answers } = await req.json();
    if (!answers || !Array.isArray(answers)) {
      return NextResponse.json({ ok: false, error: "Answers array is required" }, { status: 400 });
    }

    // Clear old answers first
    await dbRun("DELETE FROM staff_security_answers WHERE staff_id = ?", [user.id]);
    
    for (const ans of answers) {
      if (!ans.questionId || !ans.answer) continue;

      // Verify the question exists
      const qRow = await dbGet("SELECT id FROM security_questions WHERE id = ?", [ans.questionId]);
      if (!qRow) continue;

      const answerNormalized = String(ans.answer).trim().toLowerCase();
      const answerHash = crypto.createHash("sha256").update(answerNormalized).digest("hex");

      await dbRun(`
        INSERT INTO staff_security_answers (staff_id, question_id, answer_hash)
        VALUES (?, ?, ?)
      `, [user.id, qRow.id, answerHash]);
    }

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