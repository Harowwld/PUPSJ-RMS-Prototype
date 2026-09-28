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
      c.name AS course_name,
      rf.id AS feedback_id,
      rf.rating AS feedback_rating,
      rf.aspect_tags AS feedback_aspect_tags,
      rf.comments AS feedback_comments,
      rf.created_at AS feedback_created_at
    FROM document_requests dr
    LEFT JOIN students s ON s.student_no = dr.student_no
    LEFT JOIN student_accounts sa ON sa.id = dr.student_account_id
    LEFT JOIN courses c ON c.code = COALESCE(dr.course_code, s.course_code)
    LEFT JOIN document_request_feedback rf ON rf.document_request_id = dr.id
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
        feedback: row.feedback_id
          ? {
              id: row.feedback_id,
              rating: row.feedback_rating,
              aspect_tags: row.feedback_aspect_tags || [],
              comments: row.feedback_comments,
              created_at: row.feedback_created_at,
            }
          : null,
      };
    });
  return NextResponse.json({ ok: true, data: processedRows });
}
