import { NextResponse } from "next/server";
import { query } from "@/lib/postgres";
import { requireOfficeModule } from "@/lib/moduleAccess";
import { canAccessResource } from "@/lib/resourceAuthorization";
import { decryptPII } from "@/lib/piiEncryption";

export const runtime = "nodejs";

export async function GET(req) {
  const access = await requireOfficeModule("document_requests", { officeId: "registrar" }, req);
  if (access === null) return NextResponse.json({ ok: false, error: "Authentication required" }, { status: 401 });
  if (!access) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  const rows = await query(`
    SELECT
      dr.*,
      s.name AS s_name,
      sa.first_name AS sa_first_name,
      sa.last_name AS sa_last_name,
      sa.email AS sa_email,
      COALESCE(dr.course_code, s.course_code) AS course_code,
      c.name AS course_name
    FROM document_requests dr
    LEFT JOIN students s ON s.student_no = dr.student_no
    LEFT JOIN student_accounts sa ON sa.id = dr.student_account_id
    LEFT JOIN courses c ON c.code = COALESCE(dr.course_code, s.course_code)
    WHERE dr.office_id = 'registrar'
    ORDER BY dr.created_at DESC
  `);
  const processedRows = rows
    .filter((row) => canAccessResource(access, "request", row))
    .map((row) => {
      const sName = row.s_name ? decryptPII(row.s_name) : null;
      const saFirst = row.sa_first_name ? decryptPII(row.sa_first_name) : "";
      const saLast = row.sa_last_name ? decryptPII(row.sa_last_name) : "";
      const saEmail = row.sa_email ? decryptPII(row.sa_email) : "";
      const saFullName = [saFirst, saLast].filter(Boolean).join(" ");
      const resolvedName = sName || saFullName || saEmail || "Requester";
      return {
        ...row,
        student_name: resolvedName,
        requester_email: saEmail || null,
      };
    });
  return NextResponse.json({ ok: true, data: processedRows });
}
