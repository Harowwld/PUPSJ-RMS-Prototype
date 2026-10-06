import { NextResponse } from "next/server";
import { transaction } from "@/lib/postgres";
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

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ ok: false, error: "Invalid data format" }, { status: 400 });
    }
    const rawQuestions = body.questions;
    if (!Array.isArray(rawQuestions)) {
      return NextResponse.json({ ok: false, error: "Invalid data format" }, { status: 400 });
    }

    let invalidRequiredFlag = false;
    const parsedQuestions = rawQuestions.map((item, idx) => {
      if (typeof item === "string") {
        return {
          id: idx + 1,
          question: item.trim(),
          is_required: idx < 2,
        };
      }
      if (!item || typeof item !== "object" || Array.isArray(item)) {
        invalidRequiredFlag = true;
        return { id: null, question: "", is_required: true };
      }
      const requiredInput = item.is_required === undefined ? true : item.is_required;
      let isRequired;
      if (typeof requiredInput === "boolean") isRequired = requiredInput;
      else if (requiredInput === "true") isRequired = true;
      else if (requiredInput === "false") isRequired = false;
      else invalidRequiredFlag = true;
      return {
        id: item?.id ? Number(item.id) : null,
        question: String(item?.question || "").trim(),
        is_required: isRequired ?? true,
      };
    });

    if (invalidRequiredFlag) {
      return NextResponse.json({ ok: false, error: "Each question must be an object with a boolean is_required value." }, { status: 400 });
    }

    const nonEmpty = parsedQuestions.filter((q) => q.question.length > 0);

    const submittedIds = nonEmpty.map((question) => question.id).filter((id) => Number.isInteger(id) && id > 0);
    if (new Set(submittedIds).size !== submittedIds.length) {
      return NextResponse.json({ ok: false, error: "Each security question must have a unique ID." }, { status: 400 });
    }

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
    const saved = await transaction(async ({ query: run }) => {
      const existingRows = (await run("SELECT id FROM security_questions ORDER BY id ASC")).rows;
      const existingIdSet = new Set(existingRows.map((row) => Number(row.id)));
      let nextAvailableId = 1;
      const findNextId = () => {
        while (existingIdSet.has(nextAvailableId)) nextAvailableId++;
        existingIdSet.add(nextAvailableId);
        return nextAvailableId;
      };

      const keepIds = [];
      const result = [];
      for (const item of nonEmpty) {
        const targetId = Number.isInteger(item.id) && item.id > 0 ? item.id : findNextId();
        keepIds.push(targetId);
        await run(
          `INSERT INTO security_questions (id, question, is_required)
           VALUES ($1, $2, $3)
           ON CONFLICT (id) DO UPDATE SET question = EXCLUDED.question, is_required = EXCLUDED.is_required`,
          [targetId, item.question, item.is_required]
        );
        result.push({ id: targetId, question: item.question, is_required: item.is_required });
      }

      await run("DELETE FROM security_questions WHERE NOT (id = ANY($1::int[]))", [keepIds]);
      return result;
    });

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
