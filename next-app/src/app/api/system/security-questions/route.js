import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { dbAll, dbRun } from "@/lib/sqlite";
import { writeAuditLog } from "@/lib/auditLogRequest";
import { verifySessionToken, getSessionCookieName } from "@/lib/jwt";
import { requireTOTP, extractTOTPToken } from "@/lib/totpMiddleware";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req) {
  try {
    const rows = await dbAll("SELECT id, question FROM security_questions ORDER BY id ASC");
    // Ensure we return exactly 5, in order, padding with empty strings if needed
    const questions = ["", "", "", "", ""];
    rows.forEach((row, i) => {
      if (i < 5) questions[i] = row.question || "";
    });
    
    return NextResponse.json({ ok: true, data: questions });
  } catch (error) {
    console.error("[GET /api/system/security-questions Error]:", error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(req) {
  try {
    const store = await cookies();
    const token = store.get(getSessionCookieName())?.value;
    if (!token) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
    
    const user = await verifySessionToken(token);
    const userRole = String(user?.role || "").toLowerCase();
    if (!user || userRole !== "admin") {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const totpToken = extractTOTPToken(req.headers);
    const totpResult = await requireTOTP(user.sub, totpToken);
    if (!totpResult.valid) {
      return NextResponse.json(
        { ok: false, error: "TOTP verification required: " + totpResult.error, requiresTOTP: true },
        { status: 403 }
      );
    }

    const { questions } = await req.json();
    if (!Array.isArray(questions)) {
      return NextResponse.json({ ok: false, error: "Invalid data format" }, { status: 400 });
    }

    // Clear and re-insert to keep it simple and ordered
    await dbRun("DELETE FROM security_questions");
    for (let i = 0; i < 5; i++) {
      const q = String(questions[i] || "").trim();
      if (q) {
        await dbRun("INSERT INTO security_questions (id, question) VALUES (?, ?)", [i + 1, q]);
      }
    }

    await writeAuditLog(req, "Updated Global Security Questions", {
      role: user.role
    });

    return NextResponse.json({ ok: true, data: questions.slice(0, 5) });
  } catch (error) {
    console.error("[PUT /api/system/security-questions Error]:", error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}