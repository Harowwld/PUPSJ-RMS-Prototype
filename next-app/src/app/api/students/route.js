import { NextResponse } from "next/server";
import { createStudent, listStudents } from "../../../lib/studentsRepo";

export const runtime = "nodejs";

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") || "";
  const courseCode = searchParams.get("courseCode") || "";
  const yearLevel = searchParams.get("yearLevel") || "";
  const section = searchParams.get("section") || "";
  const limit = searchParams.get("limit") || "200";
  const offset = searchParams.get("offset") || "0";

  const rows = await listStudents({
    q: q || undefined,
    courseCode: courseCode || undefined,
    yearLevel: yearLevel || undefined,
    section: section || undefined,
    limit,
    offset,
  });

  return NextResponse.json({ ok: true, data: rows });
}

export async function POST(req) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const studentNo = String(body.studentNo || "").trim();
  const name = String(body.name || "").trim();
  const courseCode = String(body.courseCode || "").trim();
  const yearLevel = parseInt(body.yearLevel);
  const section = String(body.section || "").trim();
  const room = parseInt(body.room);
  const cabinet = String(body.cabinet || "").trim();
  const drawer = parseInt(body.drawer);
  const status = String(body.status || "Active").trim() || "Active";

  if (!studentNo || !name || !courseCode || !section) {
    return NextResponse.json(
      { ok: false, error: "Missing required fields" },
      { status: 400 }
    );
  }

  if (!Number.isFinite(yearLevel) || yearLevel < 1 || yearLevel > 6) {
    return NextResponse.json(
      { ok: false, error: "Invalid yearLevel" },
      { status: 400 }
    );
  }

  if (!Number.isFinite(room) || room < 1) {
    return NextResponse.json({ ok: false, error: "Invalid room" }, { status: 400 });
  }

  if (!cabinet) {
    return NextResponse.json(
      { ok: false, error: "Invalid cabinet" },
      { status: 400 }
    );
  }

  if (!Number.isFinite(drawer) || drawer < 1) {
    return NextResponse.json(
      { ok: false, error: "Invalid drawer" },
      { status: 400 }
    );
  }

  try {
    const row = await createStudent({
      studentNo,
      name,
      courseCode,
      yearLevel,
      section,
      room,
      cabinet,
      drawer,
      status,
    });

    return NextResponse.json({ ok: true, data: row }, { status: 201 });
  } catch (e) {
    const msg = String(e?.message || "");
    if (msg.includes("UNIQUE") || msg.includes("PRIMARY")) {
      return NextResponse.json(
        { ok: false, error: "Student already exists" },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { ok: false, error: "Failed to create student" },
      { status: 500 }
    );
  }
}
