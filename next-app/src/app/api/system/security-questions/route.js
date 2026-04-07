import { NextResponse } from "next/server";
import { dbGet, dbRun } from "@/lib/sqlite";
import { writeAuditLog } from "@/lib/auditLogRequest";
import { verifySessionToken } from "@/lib/jwt";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req) {
  try {
    const res = await dbGet("SELECT value FROM settings WHERE key = 'security_questions'");
    if (res && res.value) {
      return NextResponse.json({ ok: true, data: JSON.parse(res.value) });
    }
    return NextResponse.json({ ok: true, data: [] });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(req) {
  try {
    const token = req.cookies.get("session_token")?.value;
    const user = await verifySessionToken(token);
    if (!user || user.role !== "admin") {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const { questions } = await req.json();
    if (!Array.isArray(questions)) {
      return NextResponse.json({ ok: false, error: "Invalid data format" }, { status: 400 });
    }

    // Limit to 5 questions, filter empty
    const filteredQuestions = questions.map(q => String(q || "").trim()).filter(Boolean).slice(0, 5);

    await dbRun("INSERT OR REPLACE INTO settings (key, value) VALUES ('security_questions', ?)", [
      JSON.stringify(filteredQuestions),
    ]);

    await writeAuditLog(user.id, user.role, "Updated Global Security Questions");

    return NextResponse.json({ ok: true, data: filteredQuestions });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}