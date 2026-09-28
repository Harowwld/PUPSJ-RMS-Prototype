import { NextResponse } from "next/server";
import { query } from "@/lib/postgres";
import { dbAll } from "@/lib/postgresCompat";
import { writeAuditLog } from "@/lib/auditLogRequest";
import { requireTOTP, extractTOTPToken } from "@/lib/totpMiddleware";
import { requireSystemAdmin, requireAuth, createAuthErrorResponse } from "@/lib/authHelpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req) {
  try {
    const access = await requireAuth(req);
    if (access.error || !access.user) return createAuthErrorResponse(access.error || "Authentication required", 401);
    const rows = await dbAll("SELECT id, question, is_required FROM security_questions ORDER BY id ASC");
    const questions = rows.map((row) => ({
      id: row.id,
      question: row.question || "",
      is_required: row.is_required !== undefined && row.is_required !== null ? Boolean(row.is_required) : true,
    }));
    while (questions.length < 2) {
      questions.push({
        id: questions.length + 1,
        question: "",
        is_required: true,
      });
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

    const body = await req.json().catch(() => ({}));
    const rawQuestions = body.questions;
    if (!Array.isArray(rawQuestions)) {
      return NextResponse.json({ ok: false, error: "Invalid data format" }, { status: 400 });
    }

    const parsedQuestions = rawQuestions.map((item, idx) => {
      if (typeof item === "string") {
        return {
          id: idx + 1,
          question: item.trim(),
          is_required: idx < 2,
        };
      }
      return {
        id: item?.id ? Number(item.id) : null,
        question: String(item?.question || "").trim(),
        is_required: item?.is_required !== undefined ? Boolean(item.is_required) : true,
      };
    });

    const nonEmpty = parsedQuestions.filter((q) => q.question.length > 0);

    if (nonEmpty.length === 0) {
      return NextResponse.json({ 
        ok: false, 
        error: "At least one security challenge question is required." 
      }, { status: 400 });
    }

    const requiredCount = nonEmpty.filter((q) => q.is_required).length;
    if (requiredCount < 1) {
      return NextResponse.json({ 
        ok: false, 
        error: "At least one question must be marked as Required." 
      }, { status: 400 });
    }

    for (let i = 0; i < nonEmpty.length; i++) {
      const q = nonEmpty[i].question;
      if (q.length < 10) {
        return NextResponse.json({ 
          ok: false, 
          error: `Question ${i + 1} is too short. Minimum 10 characters required.` 
        }, { status: 400 });
      }

      const uniqueChars = new Set(q.toLowerCase().replace(/\s/g, "")).size;
      if (uniqueChars < 5) {
        return NextResponse.json({ 
          ok: false, 
          error: `Question ${i + 1} is too simple or repetitive. Please provide a more complex question.` 
        }, { status: 400 });
      }
    }

    // Preserve existing IDs or allocate sequential IDs
    const existingRows = await dbAll("SELECT id FROM security_questions ORDER BY id ASC");
    const existingIdSet = new Set((existingRows || []).map((r) => r.id));

    let nextAvailableId = 1;
    const findNextId = () => {
      while (existingIdSet.has(nextAvailableId)) {
        nextAvailableId++;
      }
      existingIdSet.add(nextAvailableId);
      return nextAvailableId;
    };

    const keepIds = [];
    const saved = [];

    for (let i = 0; i < nonEmpty.length; i++) {
      const item = nonEmpty[i];
      let targetId = item.id;
      if (!targetId || !Number.isInteger(targetId) || targetId <= 0) {
        targetId = findNextId();
      }
      keepIds.push(targetId);

      await query(
        `INSERT INTO security_questions (id, question, is_required)
         VALUES ($1, $2, $3)
         ON CONFLICT (id) DO UPDATE SET question = EXCLUDED.question, is_required = EXCLUDED.is_required`,
        [targetId, item.question, item.is_required]
      );

      saved.push({
        id: targetId,
        question: item.question,
        is_required: item.is_required,
      });
    }

    if (keepIds.length > 0) {
      await query(`DELETE FROM security_questions WHERE id NOT IN (${keepIds.join(",")})`);
    }

    const reqCount = saved.filter((q) => q.is_required).length;
    const optCount = saved.length - reqCount;
    await writeAuditLog(req, "Updated Global Security Questions", {
      role: user.role,
      details: `Configured ${saved.length} institutional challenge questions (${reqCount} required, ${optCount} optional).`,
      entity_type: "security_questions",
    });

    return NextResponse.json({ ok: true, data: saved });
  } catch (error) {
    console.error("[PUT /api/system/security-questions Error]:", error);
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}
