import { NextResponse } from "next/server";
import { getStudentSession } from "@/lib/studentAuth";
import { query } from "@/lib/postgres";

export const runtime = "nodejs";

export async function GET(req) {
  const session = await getStudentSession(req);
  if (!session) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  const rows = await query(
    `SELECT id, created_at, action, details, severity, office_id, entity_type, entity_id
     FROM global_audit_logs WHERE actor = $1 AND role = 'Student'
     ORDER BY created_at DESC LIMIT 200`,
    [session.studentNo]
  );
  return NextResponse.json({ ok: true, data: rows });
}
