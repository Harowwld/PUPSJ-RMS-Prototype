import { NextResponse } from "next/server";
import { query } from "@/lib/postgres";
import { requireStudent, createAuthErrorResponse } from "@/lib/authHelpers";
import { getPrincipalActorIdentities } from "@/lib/auditActor";

export const runtime = "nodejs";

export async function GET(req) {
  const access = await requireStudent(req);
  if (access.error || !access.user) return createAuthErrorResponse(access.error || "Student authentication required", access.error?.startsWith("Access denied") ? 403 : 401);

  const studentNo = access.user.studentNo || access.user.student_no || access.user.id;
  const actors = await getPrincipalActorIdentities(access.user);
  const rows = await query(
    `SELECT id, actor_id, created_at, action, details, severity, office_id, entity_type, entity_id
     FROM global_audit_logs 
     WHERE (actor_id = $1 OR (actor_id IS NULL AND LOWER(TRIM(actor)) = ANY($2::text[])))
       AND role = 'Student'
     ORDER BY created_at DESC LIMIT 200`,
    [studentNo, actors.map((a) => a.toLowerCase().trim())]
  );
  return NextResponse.json({ ok: true, data: rows });
}
