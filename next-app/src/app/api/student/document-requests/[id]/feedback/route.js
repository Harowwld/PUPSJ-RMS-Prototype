import { NextResponse } from "next/server";
import { query, queryOne } from "@/lib/postgres";
import { requireStudent, createAuthErrorResponse } from "@/lib/authHelpers";
import { canAccessResource } from "@/lib/resourceAuthorization";
import { writeGlobalAuditLog } from "@/lib/auditLogRequest";

export const runtime = "nodejs";

export async function POST(req, props) {
  const access = await requireStudent(req);
  if (access.error || !access.user) {
    return createAuthErrorResponse(
      access.error || "Student authentication required",
      access.error?.startsWith("Access denied") ? 403 : 401
    );
  }

  const params = await (props?.params || {});
  const requestId = Number.parseInt(params.id, 10);
  if (!requestId || Number.isNaN(requestId)) {
    return NextResponse.json({ ok: false, error: "Invalid request ID." }, { status: 400 });
  }

  const docRequest = await queryOne(
    `SELECT dr.*, s.course_code AS student_course_code
     FROM document_requests dr
     LEFT JOIN students s ON s.student_no = dr.student_no
     WHERE dr.id = $1 AND dr.office_id = 'registrar'`,
    [requestId]
  );

  if (!docRequest || !canAccessResource(access.user, "request", docRequest)) {
    return NextResponse.json({ ok: false, error: "Document request not found or access denied." }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  const rawRating = Number.parseInt(body?.rating, 10);
  if (!rawRating || Number.isNaN(rawRating) || rawRating < 1 || rawRating > 5) {
    return NextResponse.json(
      { ok: false, error: "Rating must be a whole number between 1 and 5." },
      { status: 400 }
    );
  }

  const aspectTags = Array.isArray(body?.aspectTags)
    ? body.aspectTags
        .map((tag) => String(tag || "").trim())
        .filter((tag) => tag.length > 0 && tag.length <= 60)
        .slice(0, 10)
    : [];

  const comments = String(body?.comments || "").trim().slice(0, 1000) || null;

  const studentNo = access.user.studentNo || docRequest.student_no || null;

  const feedback = await queryOne(
    `INSERT INTO document_request_feedback (
       document_request_id,
       student_no,
       identity_profile_id,
       rating,
       aspect_tags,
       comments,
       created_at,
       updated_at
     )
     VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
     ON CONFLICT (document_request_id)
     DO UPDATE SET
       rating = EXCLUDED.rating,
       aspect_tags = EXCLUDED.aspect_tags,
       comments = EXCLUDED.comments,
       identity_profile_id = EXCLUDED.identity_profile_id,
       updated_at = NOW()
     RETURNING *`,
    [requestId, studentNo, access.user.identityProfileId || docRequest.identity_profile_id, rawRating, aspectTags, comments]
  );

  await writeGlobalAuditLog(req, "Student document request feedback submitted", {
    actor: access.user.studentNo || access.user.email || "Student",
    role: "Student",
    officeId: "registrar",
    details: `Rated request #${requestId} (${rawRating}/5 stars)${aspectTags.length ? ` - Tags: ${aspectTags.join(", ")}` : ""}`,
    entity_type: "document_request_feedback",
    entity_id: String(feedback.id),
  });

  return NextResponse.json({ ok: true, data: feedback });
}

export async function GET(req, props) {
  const access = await requireStudent(req);
  if (access.error || !access.user) {
    return createAuthErrorResponse(
      access.error || "Student authentication required",
      access.error?.startsWith("Access denied") ? 403 : 401
    );
  }

  const params = await (props?.params || {});
  const requestId = Number.parseInt(params.id, 10);
  if (!requestId || Number.isNaN(requestId)) {
    return NextResponse.json({ ok: false, error: "Invalid request ID." }, { status: 400 });
  }

  const docRequest = await queryOne(
    `SELECT dr.* FROM document_requests dr WHERE dr.id = $1 AND dr.office_id = 'registrar'`,
    [requestId]
  );

  if (!docRequest || !canAccessResource(access.user, "request", docRequest)) {
    return NextResponse.json({ ok: false, error: "Document request not found or access denied." }, { status: 404 });
  }

  const feedback = await queryOne(
    `SELECT * FROM document_request_feedback WHERE document_request_id = $1`,
    [requestId]
  );

  return NextResponse.json({ ok: true, data: feedback || null });
}
