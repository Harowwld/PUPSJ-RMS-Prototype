import { NextResponse } from "next/server";
import { registerStudent, createStudentSession, setStudentSessionCookie } from "@/lib/studentAuth";

export const runtime = "nodejs";

export async function POST(req) {
  try {
    const body = await req.json();
    const student = await registerStudent(body || {});
    const token = await createStudentSession(student);
    return setStudentSessionCookie(NextResponse.json({ ok: true, data: { student_no: student.student_no, name: student.name } }, { status: 201 }), token);
  } catch (error) {
    return NextResponse.json({ ok: false, error: error.message || "Registration failed" }, { status: 400 });
  }
}
