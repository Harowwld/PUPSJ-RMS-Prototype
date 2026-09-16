import { NextResponse } from "next/server";
import { dbGet as sysDbGet, dbRun as sysDbRun, dbAll as sysDbAll } from "@/lib/postgresCompat";
import { writeAuditLog } from "@/lib/auditLogRequest";
import { hasAllSecurityAnswers } from "@/lib/staffRepo";
import { hashPassword } from "@/lib/passwordHash";
import { requireAuth, createAuthErrorResponse } from "@/lib/authHelpers";
import { requireTOTP, extractTOTPToken } from "@/lib/totpMiddleware";

export const runtime = "nodejs";

export async function GET(req) {
  try {
    const access = await requireAuth(req);
    if (access.error || !access.user) return createAuthErrorResponse(access.error || "Authentication required", 401);
    const user = access.user;

    const questions = await sysDbAll("SELECT id, question, is_required FROM security_questions ORDER BY id ASC");
    
    let answeredSet = new Set();
    let hasAllQuestions = false;
    const isStudent = user.role === "Student" || user.principalType === "student";

    if (isStudent) {
      const studentAccountId = user.accountId || user.account_id || (Number.isFinite(Number(user.id)) ? Number(user.id) : null);
      if (studentAccountId) {
        const answeredRows = await sysDbAll("SELECT question_id FROM student_security_answers WHERE student_account_id = ?", [studentAccountId]);
        answeredSet = new Set((answeredRows || []).map(r => r.question_id));
        hasAllQuestions = await hasAllSecurityAnswers(studentAccountId, "Student");
      }
    } else {
      const uid = user.sub || user.id;
      const answeredRows = await sysDbAll("SELECT question_id FROM staff_security_answers WHERE staff_id = ?", [uid]);
      answeredSet = new Set((answeredRows || []).map(r => r.question_id));
      hasAllQuestions = await hasAllSecurityAnswers(uid, user.role);
    }

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
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req) {
  try {
    const access = await requireAuth(req);
    if (access.error || !access.user) return createAuthErrorResponse(access.error || "Authentication required", 401);
    const user = access.user;
    const isStudent = user.role === "Student" || user.principalType === "student";

    if (!isStudent) {
      const totpResult = await requireTOTP(user.id, extractTOTPToken(req.headers), { requireEnabled: true });
      if (!totpResult.valid) {
        return NextResponse.json(
          { ok: false, error: "TOTP verification required: " + totpResult.error, requiresTOTP: true },
          { status: 403 }
        );
      }
    }

    const { answers } = await req.json();
    if (!answers || !Array.isArray(answers)) {
      return NextResponse.json({ ok: false, error: "Answers array is required" }, { status: 400 });
    }

    if (isStudent) {
      const studentAccountId = user.accountId || user.account_id || (Number.isFinite(Number(user.id)) ? Number(user.id) : null);
      if (!studentAccountId) {
        return NextResponse.json({ ok: false, error: "Student account not found" }, { status: 404 });
      }

      for (const ans of answers) {
        if (!ans.questionId) continue;

        const qRow = await sysDbGet("SELECT id, is_required FROM security_questions WHERE id = ?", [ans.questionId]);
        if (!qRow) continue;

        const answerRaw = String(ans.answer || "").trim();
        if (answerRaw === "") {
          if (qRow.is_required) continue;
          await sysDbRun("DELETE FROM student_security_answers WHERE student_account_id = ? AND question_id = ?", [studentAccountId, qRow.id]);
          continue;
        }

        const answerNormalized = answerRaw.toLowerCase();
        const answerHash = hashPassword(answerNormalized);

        await sysDbRun(`
          INSERT INTO student_security_answers (student_account_id, question_id, answer_hash, updated_at)
          VALUES (?, ?, ?, datetime('now'))
          ON CONFLICT (student_account_id, question_id) DO UPDATE SET
            answer_hash = EXCLUDED.answer_hash,
            updated_at = EXCLUDED.updated_at
        `, [studentAccountId, qRow.id, answerHash]);
      }

      await writeAuditLog(req, "Updated Security Question", {
        role: "Student"
      });

      return NextResponse.json({ ok: true, data: { success: true } });
    }

    // Staff path
    const uid = user.sub || user.id;

    for (const ans of answers) {
      if (!ans.questionId) continue;

      // Verify the question exists
      const qRow = await sysDbGet("SELECT id, is_required FROM security_questions WHERE id = ?", [ans.questionId]);
      if (!qRow) continue;

      const answerRaw = String(ans.answer || "").trim();
      
      if (answerRaw === "") {
        // If it's a required question, we shouldn't allow deleting it
        if (qRow.is_required) continue;

        // Otherwise, delete the answer if it exists
        await sysDbRun("DELETE FROM staff_security_answers WHERE staff_id = ? AND question_id = ?", [uid, qRow.id]);
        continue;
      }

      const answerNormalized = answerRaw.toLowerCase();
      const answerHash = hashPassword(answerNormalized);

      // PostgreSQL upsert for the composite staff/question key.
      await sysDbRun(`
        INSERT INTO staff_security_answers (staff_id, question_id, answer_hash, updated_at)
        VALUES (?, ?, ?, datetime('now'))
        ON CONFLICT (staff_id, question_id) DO UPDATE SET
          answer_hash = EXCLUDED.answer_hash,
          updated_at = EXCLUDED.updated_at
      `, [uid, qRow.id, answerHash]);
    }

    await writeAuditLog(req, "Updated Security Question", {
      role: user.role
    });

    return NextResponse.json({ ok: true, data: { success: true } });
  } catch (error) {
    console.error("[PUT /api/staff/security Error]:", error);
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}
