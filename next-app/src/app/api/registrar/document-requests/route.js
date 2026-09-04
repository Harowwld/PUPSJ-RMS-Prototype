import { NextResponse } from "next/server";
import { query } from "@/lib/postgres";
import { requireOfficeModule } from "@/lib/moduleAccess";

export const runtime = "nodejs";

export async function GET(req) {
  const access = await requireOfficeModule("alumni_requests", { officeId: "registrar" }, req);
  if (!access) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  const rows = await query(`
    SELECT
      dr.*,
      COALESCE(s.name, NULLIF(TRIM(CONCAT_WS(' ', sa.first_name, sa.last_name)), ''), sa.email, 'Alumni Requester') AS student_name,
      sa.email AS requester_email
    FROM document_requests dr
    LEFT JOIN students s ON s.student_no = dr.student_no
    LEFT JOIN student_accounts sa ON sa.id = dr.student_account_id
    WHERE dr.office_id = 'registrar'
    ORDER BY dr.created_at DESC
  `);
  return NextResponse.json({ ok: true, data: rows });
}
