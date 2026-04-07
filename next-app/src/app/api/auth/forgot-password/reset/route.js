import { NextResponse } from "next/server";
import { dbGet, dbRun } from "@/lib/sqlite";
import { writeAuditLog } from "@/lib/auditLogRequest";
import crypto from "node:crypto";

export const runtime = "nodejs";

export async function POST(req) {
  try {
    const { id, answer, newPassword } = await req.json();

    if (!id || !answer || !newPassword) {
      return NextResponse.json({ ok: false, error: "Missing required fields" }, { status: 400 });
    }

    if (newPassword.length < 8) {
        return NextResponse.json({ ok: false, error: "Password must be at least 8 characters long." }, { status: 400 });
    }

    const staff = await dbGet(
      "SELECT id, role, security_answer_hash FROM staff WHERE id = ?",
      [id]
    );

    if (!staff || !staff.security_answer_hash) {
      return NextResponse.json({ ok: false, error: "Invalid request" }, { status: 400 });
    }

    const answerNormalized = String(answer).trim().toLowerCase();
    const providedHash = crypto.createHash("sha256").update(answerNormalized).digest("hex");

    if (providedHash !== staff.security_answer_hash) {
      return NextResponse.json({ ok: false, error: "Incorrect security answer" }, { status: 401 });
    }

    const newPasswordHash = crypto.createHash("sha256").update(newPassword).digest("hex");

    await dbRun("UPDATE staff SET password_hash = ?, updated_at = (datetime('now')) WHERE id = ?", [
      newPasswordHash, staff.id
    ]);

    await writeAuditLog(staff.id, staff.role, "Reset Password via Security Question");

    return NextResponse.json({ ok: true, data: { success: true } });
  } catch (error) {
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}