import { NextResponse } from "next/server";
import { dbGet, dbRun } from "@/lib/sqlite";
import { writeAuditLog } from "@/lib/auditLogRequest";
import crypto from "node:crypto";

export const runtime = "nodejs";

export async function POST(req) {
  try {
    const { id, questionId, answer, newPassword } = await req.json();

    if (!id || !questionId || !answer || !newPassword) {
      return NextResponse.json({ ok: false, error: "Missing required fields" }, { status: 400 });
    }

    if (newPassword.length < 8) {
        return NextResponse.json({ ok: false, error: "Password must be at least 8 characters long." }, { status: 400 });
    }

    const staff = await dbGet(
      "SELECT id, fname, lname, role FROM staff WHERE id = ?",
      [id]
    );

    if (!staff) {
      return NextResponse.json({ ok: false, error: "Invalid request" }, { status: 400 });
    }

    const resAnswer = await dbGet(`
      SELECT answer_hash 
      FROM staff_security_answers
      WHERE staff_id = ? AND question_id = ?
    `, [staff.id, questionId]);

    if (!resAnswer || !resAnswer.answer_hash) {
      return NextResponse.json({ ok: false, error: "Security answer not found" }, { status: 400 });
    }

    const answerNormalized = String(answer).trim().toLowerCase();
    const providedHash = crypto.createHash("sha256").update(answerNormalized).digest("hex");

    if (providedHash !== resAnswer.answer_hash) {
      return NextResponse.json({ ok: false, error: "Incorrect security answer" }, { status: 401 });
    }

    const newPasswordHash = crypto.createHash("sha256").update(newPassword).digest("hex");

    await dbRun("UPDATE staff SET password_hash = ?, updated_at = (datetime('now')) WHERE id = ?", [
      newPasswordHash, staff.id
    ]);

    await writeAuditLog(req, "Reset Password via Security Question", {
      actor: `${staff.fname || ""} ${staff.lname || ""}`.trim() || staff.id,
      role: staff.role
    });

    return NextResponse.json({ ok: true, data: { success: true } });
  } catch (error) {
    console.error("[Forgot-Password Reset Error]:", error);
    return NextResponse.json({ ok: false, error: error.message || "Internal server error" }, { status: 500 });
  }
}