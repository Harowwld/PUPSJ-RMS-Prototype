import { NextResponse } from "next/server";
import {
  deleteStudent,
  getStudentByStudentNo,
  updateStudent,
} from "../../../../lib/studentsRepo";
import { writeAuditLog } from "../../../../lib/auditLogRequest";

export const runtime = "nodejs";

export async function GET(_req, ctx) {
  const params = await ctx.params;
  const studentNo = decodeURIComponent(params.studentNo || "");
  if (!studentNo) {
    return NextResponse.json(
      { ok: false, error: "Invalid studentNo" },
      { status: 400 }
    );
  }

  const row = await getStudentByStudentNo(studentNo);
  if (!row) {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }
  await writeAuditLog(req, `Updated student: ${studentNo}`);

  return NextResponse.json({ ok: true, data: row });
}

export async function PATCH(req, ctx) {
  const params = await ctx.params;
  const studentNo = decodeURIComponent(params.studentNo || "");
  if (!studentNo) {
    return NextResponse.json(
      { ok: false, error: "Invalid studentNo" },
      { status: 400 }
    );
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const row = await updateStudent(studentNo, {
    name: body.name === undefined ? undefined : String(body.name).trim(),
    courseCode:
      body.courseCode === undefined ? undefined : String(body.courseCode).trim(),
    yearLevel: body.yearLevel,
    section: body.section === undefined ? undefined : String(body.section).trim(),
    room: body.room,
    cabinet: body.cabinet === undefined ? undefined : String(body.cabinet).trim(),
    drawer: body.drawer,
    status: body.status === undefined ? undefined : String(body.status).trim(),
  });

  if (!row) {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, data: row });
}

export async function DELETE(_req, ctx) {
  const params = await ctx.params;
  const studentNo = decodeURIComponent(params.studentNo || "");
  if (!studentNo) {
    return NextResponse.json(
      { ok: false, error: "Invalid studentNo" },
      { status: 400 }
    );
  }

  const row = await deleteStudent(studentNo);
  if (!row) {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }
  await writeAuditLog(_req, `Deleted student: ${studentNo}`);

  return NextResponse.json({ ok: true, data: row });
}
