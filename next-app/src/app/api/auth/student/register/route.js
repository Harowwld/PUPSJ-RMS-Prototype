import { NextResponse } from "next/server";
import { registerStudent, createStudentSession, setStudentSessionCookie } from "@/lib/studentAuth";
import { writeGlobalAuditLog } from "@/lib/auditLogRequest";

export const runtime = "nodejs";

export async function POST(req) {
  try {
    const body = await req.json();
    const student = await registerStudent(body || {});
    await writeGlobalAuditLog(req, "Student account registered", { actor: student.student_no, role: "Student", details: "Created Student ODRS account", entity_type: "student_account", entity_id: student.student_no });
    const token = await createStudentSession(student);
    return setStudentSessionCookie(NextResponse.json({ ok: true, data: { student_no: student.student_no, name: student.name } }, { status: 201 }), token);
  } catch (error) {
    return NextResponse.json({ ok: false, error: error.message || "Registration failed" }, { status: 400 });
  }
}
