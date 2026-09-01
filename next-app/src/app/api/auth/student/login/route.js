import { NextResponse } from "next/server";
import { authenticateStudent, createStudentSession, setStudentSessionCookie } from "@/lib/studentAuth";

export const runtime = "nodejs";

export async function POST(req) {
  const body = await req.json().catch(() => null);
  const student = await authenticateStudent(body || {});
  if (!student) return NextResponse.json({ ok: false, error: "Invalid student number or password." }, { status: 401 });
  const token = await createStudentSession(student);
  return setStudentSessionCookie(NextResponse.json({ ok: true, data: { student_no: student.student_no, name: student.name } }), token);
}
