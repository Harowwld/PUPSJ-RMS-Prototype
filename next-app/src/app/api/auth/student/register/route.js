import { NextResponse } from "next/server";
import { registerStudent, createStudentSession, setStudentSessionCookie } from "@/lib/studentAuth";
import { writeGlobalAuditLog } from "@/lib/auditLogRequest";
import { sendAccountCredentialsNotice } from "@/lib/accountEmail";

export const runtime = "nodejs";

export async function POST(req) {
  try {
    const body = await req.json();

    const student = await registerStudent(body || {});
    const credentialEmail = await sendAccountCredentialsNotice({
      to: student.email,
      fullName: student.name,
      accountType: "student account",
      accountId: student.student_no,
      username: student.email,
    });
    await writeGlobalAuditLog(req, "Student account registered", { actor: student.student_no || student.email, role: "Student", details: "Created Student ODRS account", entity_type: "student_account", entity_id: String(student.id) });
    const token = await createStudentSession(student);
    return setStudentSessionCookie(NextResponse.json({
      ok: true,
      data: { student_no: student.student_no, name: student.name },
      credentialEmail,
    }, { status: 201 }), token, req);
  } catch {
    return NextResponse.json({ ok: false, error: "Registration failed" }, { status: 400 });
  }
}
