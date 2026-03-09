import { NextResponse } from "next/server";
import { createStudent } from "../../../../lib/studentsRepo";

export const runtime = "nodejs";

function validateStudentPayload(body) {
  const studentNo = String(body?.studentNo || "").trim();
  const name = String(body?.name || "").trim();
  const courseCode = String(body?.courseCode || "").trim();
  const yearLevel = parseInt(body?.yearLevel);
  const section = String(body?.section || "").trim();
  const room = parseInt(body?.room);
  const cabinet = String(body?.cabinet || "").trim();
  const drawer = parseInt(body?.drawer);
  const status = String(body?.status || "Active").trim() || "Active";

  const studentNoPattern = /^\d{4}-\d{5}-[A-Z]{2}-\d$/;

  if (!studentNo || !name || !courseCode || !section) {
    return { ok: false, error: "Missing required fields" };
  }

  if (!studentNoPattern.test(studentNo.toUpperCase())) {
    return { ok: false, error: "Invalid studentNo format" };
  }

  if (!Number.isFinite(yearLevel) || yearLevel < 2000 || yearLevel > 2100) {
    return { ok: false, error: "Invalid yearLevel" };
  }

  if (!Number.isFinite(room) || room < 1) {
    return { ok: false, error: "Invalid room" };
  }

  if (!cabinet) {
    return { ok: false, error: "Invalid cabinet" };
  }

  if (!Number.isFinite(drawer) || drawer < 1) {
    return { ok: false, error: "Invalid drawer" };
  }

  return {
    ok: true,
    value: {
      studentNo,
      name,
      courseCode,
      yearLevel,
      section,
      room,
      cabinet,
      drawer,
      status,
    },
  };
}

export async function POST(req) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const rows = Array.isArray(body.rows) ? body.rows : null;
  if (!rows) {
    return NextResponse.json(
      { ok: false, error: "Missing rows" },
      { status: 400 }
    );
  }

  const results = [];
  for (let i = 0; i < rows.length; i++) {
    const raw = rows[i];
    const validated = validateStudentPayload(raw);
    if (!validated.ok) {
      results.push({ index: i, ok: false, error: validated.error });
      continue;
    }

    try {
      const created = await createStudent(validated.value);
      results.push({ index: i, ok: true, data: created });
    } catch (e) {
      const msg = String(e?.message || "");
      if (msg.includes("UNIQUE") || msg.includes("PRIMARY")) {
        results.push({ index: i, ok: false, error: "Student already exists" });
      } else {
        results.push({ index: i, ok: false, error: "Failed to create student" });
      }
    }
  }

  return NextResponse.json({ ok: true, data: results });
}
