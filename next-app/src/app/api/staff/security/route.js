import { NextResponse } from "next/server";
import { dbGet, dbRun, dbAll } from "@/lib/sqlite";
import { writeAuditLog } from "@/lib/auditLogRequest";
import { verifySessionToken } from "@/lib/jwt";
import crypto from "node:crypto";

export const runtime = "nodejs";

export async function GET(req) {
  try {
    const token = req.cookies.get("pup_session")?.value;
    if (!token) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
    const user = await verifySessionToken(token);
    if (!user) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const questions = await dbAll("SELECT id, question FROM security_questions ORDER BY id ASC");
    
    // Also fetch what they have answered so far, if any
    const uid = user.sub || user.id;
    const answeredRows = await dbAll("SELECT question_id FROM staff_security_answers WHERE staff_id = ?", [uid]);
    const answeredSet = new Set((answeredRows || []).map(r => r.question_id));
    
    const hasAllQuestions = questions.length > 0 && answeredSet.size === questions.length;

    const formattedQuestions = (questions || []).map(q => ({
      ...q,
      hasAnswer: answeredSet.has(q.id)
    }));

    return NextResponse.json({ 
      ok: true, 
      data: {
        questions: formattedQuestions,
        answeredIds: Array.from(answeredSet),
        hasAllQuestions
      } 
    });
  } catch (error) {
    console.error("[GET /api/staff/security Error]:", error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(req) {
  try {
    const token = req.cookies.get("pup_session")?.value;
    if (!token) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
    const user = await verifySessionToken(token);
    if (!user) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const { answers } = await req.json();
    if (!answers || !Array.isArray(answers)) {
      return NextResponse.json({ ok: false, error: "Answers array is required" }, { status: 400 });
    }

    const uid = user.sub || user.id;

    for (const ans of answers) {
      if (!ans.questionId || !ans.answer) continue;

      // Verify the question exists
      const qRow = await dbGet("SELECT id FROM security_questions WHERE id = ?", [ans.questionId]);
      if (!qRow) continue;

      const answerNormalized = String(ans.answer).trim().toLowerCase();
      const answerHash = crypto.createHash("sha256").update(answerNormalized).digest("hex");

      // Use INSERT OR REPLACE since PRIMARY KEY is (staff_id, question_id)
      await dbRun(`
        INSERT OR REPLACE INTO staff_security_answers (staff_id, question_id, answer_hash, updated_at)
        VALUES (?, ?, ?, datetime('now'))
      `, [uid, qRow.id, answerHash]);
    }

    await writeAuditLog(req, "Updated Security Question", {
      role: user.role
    });

    return NextResponse.json({ ok: true, data: { success: true } });
  } catch (error) {
    console.error("[PUT /api/staff/security Error]:", error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}