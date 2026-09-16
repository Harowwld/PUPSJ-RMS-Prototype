import { NextResponse } from "next/server";
import { getStudentSession } from "@/lib/studentAuth";
import { query } from "@/lib/postgres";
import { requireStudent, createAuthErrorResponse } from "@/lib/authHelpers";

export const runtime = "nodejs";

export async function GET(req) {
  const access = await requireStudent(req);
  if (access.error || !access.user) return createAuthErrorResponse(access.error || "Student authentication required", access.error?.startsWith("Access denied") ? 403 : 401);
  const session = { studentNo: access.user.studentNo };
  const rows = await query(
    `SELECT id, created_at, action, details, severity, office_id, entity_type, entity_id
     FROM global_audit_logs WHERE actor = $1 AND role = 'Student'
     ORDER BY created_at DESC LIMIT 200`,
    [session.studentNo]
  );
  return NextResponse.json({ ok: true, data: rows });
}
