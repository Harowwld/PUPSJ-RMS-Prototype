import { NextResponse } from "next/server";
import { query } from "@/lib/postgres";
import { requireOfficeModule } from "@/lib/moduleAccess";
import { canAccessResource } from "@/lib/resourceAuthorization";
import { decryptPII } from "@/lib/piiEncryption";

export const runtime = "nodejs";

function decryptField(val) {
  if (!val || typeof val !== "string") return val;
  if (!val.includes("enc:v1:")) return val;
  if (val.startsWith("enc:v1:") && !val.includes(" ")) {
    return decryptPII(val);
  }
  return val
    .split(/\s+/)
    .map((part) => (part.startsWith("enc:v1:") ? decryptPII(part) : part))
    .join(" ")
    .trim();
}

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
      rf.created_at AS feedback_created_at,
      (SELECT COUNT(*)::int FROM document_request_attachments dra WHERE dra.document_request_id = dr.id) AS attachment_count
    FROM document_requests dr
    LEFT JOIN students s ON s.student_no = dr.student_no
    LEFT JOIN student_accounts sa ON sa.id = dr.student_account_id
    LEFT JOIN courses c ON c.code = COALESCE(dr.course_code, s.course_code)
    LEFT JOIN document_request_feedback rf ON rf.document_request_id = dr.id
    WHERE dr.office_id = 'registrar'
    ORDER BY dr.created_at DESC
  `);

  const requestIds = rows.map((r) => r.id);
  const attachmentRows = requestIds.length
    ? await query(
        `SELECT id, document_request_id, original_filename, mime_type, size_bytes, attachment_type, created_at
         FROM document_request_attachments
         WHERE document_request_id = ANY($1::bigint[])
         ORDER BY created_at ASC`,
        [requestIds]
      )
    : [];

  const attachmentsByRequest = attachmentRows.reduce((grouped, item) => {
    const key = String(item.document_request_id);
    (grouped[key] ||= []).push({
      ...item,
      url: `/api/document-requests/${item.document_request_id}/attachments/${item.id}`,
    });
    return grouped;
  }, {});

  const processedRows = rows
    .filter((row) => canAccessResource(access, "request", row))
    .map((row) => {
      const reqName = row.requester_name ? decryptField(row.requester_name) : null;
      const sName = row.s_name ? decryptField(row.s_name) : null;
      const saFirst = row.sa_first_name ? decryptField(row.sa_first_name) : "";
      const saLast = row.sa_last_name ? decryptField(row.sa_last_name) : "";
      const saEmail = row.sa_email ? decryptField(row.sa_email) : "";
      const saFullName = [saFirst, saLast].filter(Boolean).join(" ");
      const resolvedName = reqName || sName || saFullName || saEmail || "Requester";
      return {
        ...row,
        requester_name: reqName || resolvedName,
        student_name: resolvedName,
        requester_email: saEmail || null,
        requester_contact: decryptField(row.requester_contact),
        attachment_count: Number(row.attachment_count || 0),
        attachments: attachmentsByRequest[String(row.id)] || [],
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
