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
    const questions = rows.map((row) => row.question || "");
    while (questions.length < 2) {
      questions.push("");
    }
    
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

    // Validation: 10-character minimum and entropy check
    for (let i = 0; i < questions.length; i++) {
      const q = String(questions[i] || "").trim();
      if (q) {
        if (q.length < 10) {
          return NextResponse.json({ 
            ok: false, 
            error: `Question ${i + 1} is too short. Minimum 10 characters required.` 
          }, { status: 400 });
        }

        // Basic Entropy Check: Count unique characters
        const uniqueChars = new Set(q.toLowerCase().replace(/\s/g, "")).size;
        if (uniqueChars < 5) {
          return NextResponse.json({ 
            ok: false, 
            error: `Question ${i + 1} is too simple or repetitive. Please provide a more complex question.` 
          }, { status: 400 });
        }
      } else if (i < 2) {
        // First two are required
        return NextResponse.json({ 
          ok: false, 
          error: `Question ${i + 1} is required.` 
        }, { status: 400 });
      }
    }

    // Clear and re-insert to keep it simple and ordered
    await dbRun("DELETE FROM security_questions");
    for (let i = 0; i < questions.length; i++) {
      const q = String(questions[i] || "").trim();
      if (q) {
        // Any question provided is now considered a potential recovery challenge
        await dbRun("INSERT INTO security_questions (id, question, is_required) VALUES (?, ?, ?)", [i + 1, q, 1]);
      }
    }

    await writeAuditLog(req, "Updated Global Security Questions", {
      role: user.role
    });

    return NextResponse.json({ ok: true, data: questions });
  } catch (error) {
    console.error("[PUT /api/system/security-questions Error]:", error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}