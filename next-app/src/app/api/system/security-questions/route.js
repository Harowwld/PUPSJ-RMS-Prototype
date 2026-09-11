import { NextResponse } from "next/server";
import { dbAll, dbRun } from "@/lib/postgresCompat";
import { writeAuditLog } from "@/lib/auditLogRequest";
import { requireTOTP, extractTOTPToken } from "@/lib/totpMiddleware";
import { requireSystemAdmin, createAuthErrorResponse } from "@/lib/authHelpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req) {
  try {
    const access = await requireSystemAdmin(req);
    if (access.error || !access.user) return createAuthErrorResponse(access.error || "System administrator access required", access.error?.startsWith("Access denied") ? 403 : 401);
    const rows = await dbAll("SELECT id, question FROM security_questions ORDER BY id ASC");
    const questions = rows.map((row) => row.question || "");
    while (questions.length < 2) {
      questions.push("");
    }
    
    return NextResponse.json({ ok: true, data: questions });
  } catch (error) {
    console.error("[GET /api/system/security-questions Error]:", error);
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req) {
  try {
    const access = await requireSystemAdmin(req);
    if (access.error || !access.user) return createAuthErrorResponse(access.error || "System administrator access required", access.error?.startsWith("Access denied") ? 403 : 401);
    const user = access.user;

    const totpToken = extractTOTPToken(req.headers);
    const totpResult = await requireTOTP(user.id, totpToken, { requireEnabled: true });
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
        await dbRun("INSERT INTO security_questions (id, question) VALUES (?, ?)", [i + 1, q]);
      }
    }

    await writeAuditLog(req, "Updated Global Security Questions", {
      role: user.role
    });

    return NextResponse.json({ ok: true, data: questions });
  } catch (error) {
    console.error("[PUT /api/system/security-questions Error]:", error);
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}
