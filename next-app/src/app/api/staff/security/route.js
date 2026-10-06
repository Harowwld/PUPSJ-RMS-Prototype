import { NextResponse } from "next/server";
import { dbGet as sysDbGet, dbAll as sysDbAll } from "@/lib/postgresCompat";
import { writeAuditLog } from "@/lib/auditLogRequest";
import { hasAllSecurityAnswers } from "@/lib/staffRepo";
import { hashPassword } from "@/lib/passwordHash";
import { requireAuth, createAuthErrorResponse } from "@/lib/authHelpers";
import { requireTOTP, extractTOTPToken } from "@/lib/totpMiddleware";
import { transaction } from "@/lib/postgres";

export const runtime = "nodejs";

async function saveSecurityAnswers(answers, applyChanges) {
  return transaction(async ({ query: run }) => {
    const ids = answers.map((answer) => answer.questionId);
    const result = await run(
      "SELECT id, is_required FROM security_questions WHERE id = ANY($1::bigint[])",
      [ids]
    );
    const questions = new Map(result.rows.map((row) => [Number(row.id), row]));
    if (questions.size !== ids.length) {
      return { error: "One or more security questions no longer exist. Refresh and try again." };
    }
    await applyChanges(run, questions);
    return { ok: true };
  });
}

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

    const body = await req.json().catch(() => null);
    const { answers } = body || {};
    if (!answers || !Array.isArray(answers)) {
      return NextResponse.json({ ok: false, error: "Answers array is required" }, { status: 400 });
    }

    const normalizedAnswers = [];
    const seenQuestionIds = new Set();
    for (const answer of answers) {
      const questionId = Number(answer?.questionId);
      if (!Number.isSafeInteger(questionId) || questionId < 1) {
        return NextResponse.json({ ok: false, error: "Each answer must include a valid questionId" }, { status: 400 });
      }
      if (seenQuestionIds.has(questionId)) {
        return NextResponse.json({ ok: false, error: "Each question can only be submitted once" }, { status: 400 });
      }
      seenQuestionIds.add(questionId);
      normalizedAnswers.push({ questionId, answer: String(answer?.answer ?? "").trim() });
    }

    if (isStudent) {
      const studentAccountId = user.accountId || user.account_id || (Number.isFinite(Number(user.id)) ? Number(user.id) : null);
      if (!studentAccountId) {
        return NextResponse.json({ ok: false, error: "Student account not found" }, { status: 404 });
      }

      const result = await saveSecurityAnswers(normalizedAnswers, async (run, questionRows) => {
        for (const answer of normalizedAnswers) {
          const question = questionRows.get(answer.questionId);
          if (!answer.answer) {
            if (question.is_required) continue;
            await run(
              "DELETE FROM student_security_answers WHERE student_account_id = $1 AND question_id = $2",
              [studentAccountId, answer.questionId]
            );
            continue;
          }
          await run(
            `INSERT INTO student_security_answers (student_account_id, question_id, answer_hash, updated_at)
             VALUES ($1, $2, $3, NOW())
             ON CONFLICT (student_account_id, question_id) DO UPDATE SET
               answer_hash = EXCLUDED.answer_hash, updated_at = EXCLUDED.updated_at`,
            [studentAccountId, answer.questionId, hashPassword(answer.answer.toLowerCase())]
          );
        }
      });
      if (result.error) return NextResponse.json({ ok: false, error: result.error }, { status: 400 });

      await writeAuditLog(req, "Updated Security Question", {
        role: "Student"
      });

      return NextResponse.json({ ok: true, data: { success: true } });
    }

    // Staff path
    const uid = user.sub || user.id;

    const result = await saveSecurityAnswers(normalizedAnswers, async (run, questionRows) => {
      for (const answer of normalizedAnswers) {
        const question = questionRows.get(answer.questionId);
        if (!answer.answer) {
          if (question.is_required) continue;
          await run("DELETE FROM staff_security_answers WHERE staff_id = $1 AND question_id = $2", [uid, answer.questionId]);
          continue;
        }
        await run(
          `INSERT INTO staff_security_answers (staff_id, question_id, answer_hash, updated_at)
           VALUES ($1, $2, $3, NOW())
           ON CONFLICT (staff_id, question_id) DO UPDATE SET
             answer_hash = EXCLUDED.answer_hash, updated_at = EXCLUDED.updated_at`,
          [uid, answer.questionId, hashPassword(answer.answer.toLowerCase())]
        );
      }
    });
    if (result.error) return NextResponse.json({ ok: false, error: result.error }, { status: 400 });

    await writeAuditLog(req, "Updated Security Question", {
      role: user.role
    });

    return NextResponse.json({ ok: true, data: { success: true } });
  } catch (error) {
    console.error("[PUT /api/staff/security Error]:", error);
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}
