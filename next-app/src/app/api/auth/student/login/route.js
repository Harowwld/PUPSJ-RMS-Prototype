import { NextResponse } from "next/server";
import { authenticateStudent, createStudentSession, setStudentSessionCookie } from "@/lib/studentAuth";
import { writeGlobalAuditLog } from "@/lib/auditLogRequest";

export const runtime = "nodejs";

export async function POST(req) {
  const body = await req.json().catch(() => null);
  const student = await authenticateStudent(body || {});
  if (!student) return NextResponse.json({ ok: false, error: "Invalid student number or password." }, { status: 401 });
  const token = await createStudentSession(student);
  await writeGlobalAuditLog(req, "Student signed in", { actor: student.student_no, role: "Student", details: "Student ODRS session started", entity_type: "student_account", entity_id: student.student_no });
  return setStudentSessionCookie(NextResponse.json({ ok: true, data: { role: "Student", student_no: student.student_no, name: student.name } }), token);
}
