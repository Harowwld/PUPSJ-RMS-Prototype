import { NextResponse } from "next/server";
import { query } from "@/lib/postgres";
import { requireOfficeModule } from "@/lib/moduleAccess";
import { canAccessResource } from "@/lib/resourceAuthorization";

export const runtime = "nodejs";

export async function GET(req) {
  const access = await requireOfficeModule("document_requests", { officeId: "registrar" }, req);
  if (access === null) return NextResponse.json({ ok: false, error: "Authentication required" }, { status: 401 });
  if (!access) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  const rows = await query(`
    SELECT
      dr.*,
      COALESCE(s.name, NULLIF(TRIM(CONCAT_WS(' ', sa.first_name, sa.last_name)), ''), sa.email, 'Requester') AS student_name,
      COALESCE(dr.course_code, s.course_code) AS course_code,
      c.name AS course_name,
      sa.email AS requester_email
    FROM document_requests dr
    LEFT JOIN students s ON s.student_no = dr.student_no
    LEFT JOIN student_accounts sa ON sa.id = dr.student_account_id
    LEFT JOIN courses c ON c.code = COALESCE(dr.course_code, s.course_code)
    WHERE dr.office_id = 'registrar'
    ORDER BY dr.created_at DESC
  `);
  return NextResponse.json({ ok: true, data: rows.filter((row) => canAccessResource(access, "request", row)) });
}
