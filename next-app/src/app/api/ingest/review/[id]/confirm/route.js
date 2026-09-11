import fs from "node:fs";
import { NextResponse } from "next/server";
import { requireStaff, createAuthErrorResponse, getPrincipalOfficeId } from "../../../../../../lib/authHelpers";
import { getIngestById, getIngestFilePath, markIngestPromoted } from "../../../../../../lib/ingestQueueRepo";
import { createDocument, getDocumentById } from "../../../../../../lib/documentsRepo";
import { queryOne } from "../../../../../../lib/postgres";
import { writeAuditLog } from "@/lib/auditLogRequest";
import { rotateDocumentBuffer } from "@/lib/documentOrientation";
import { canAccessResource } from "@/lib/resourceAuthorization";

export const runtime = "nodejs";

export async function POST(req, ctx) {
  const { user, error } = await requireStaff(req);
  if (error || !user) return createAuthErrorResponse(error || "Authentication required");
  const officeId = getPrincipalOfficeId(user);
  if (!officeId) return createAuthErrorResponse("Office scope is required", 403);
  const id = Number((await ctx.params).id);
  if (!Number.isInteger(id) || id < 1) return NextResponse.json({ ok: false, error: "Invalid id" }, { status: 400 });
  const item = await getIngestById(id, { officeId });
  if (!item || !canAccessResource(user, "ingest", item)) return NextResponse.json({ ok: false, error: "Review item not found" }, { status: 404 });
  if (item.promoted_document_id) {
    const document = await getDocumentById(item.promoted_document_id, { officeId });
    if (!document || !canAccessResource(user, "document", document)) return NextResponse.json({ ok: false, error: "Review item not found" }, { status: 404 });
    return NextResponse.json({ ok: true, data: { ingestId: id, document, idempotent: true } });
  }
  const body = await req.json().catch(() => ({}));
  const studentNo = String(body.studentNo || item.proposed_student_no || "").trim().toUpperCase();
  const studentName = String(body.studentName || item.ocr_name || "").trim();
  const docType = String(body.docType || item.proposed_doc_type || "").trim();
  if (!studentNo || !docType) return NextResponse.json({ ok: false, error: "Student and document type are required before confirmation." }, { status: 400 });
  const student = await queryOne(
    `SELECT s.student_no, s.name
       FROM students s
      WHERE s.student_no = $1 AND s.status = 'Active'
        AND EXISTS (SELECT 1 FROM student_office_memberships som
                     WHERE som.student_no = s.student_no
                       AND som.office_id = $2
                       AND som.status = 'Active')`,
    [studentNo, officeId],
  );
  if (!student) return NextResponse.json({ ok: false, error: "Selected student does not exist or is inactive." }, { status: 400 });
  const sourcePath = getIngestFilePath(item.storage_filename);
  if (!fs.existsSync(sourcePath)) return NextResponse.json({ ok: false, error: "Source file is missing from disk." }, { status: 404 });
  try {
    const sourceBuffer = fs.readFileSync(sourcePath);
    const rotation = Number(item.match_evidence?.detectedRotation || 0);
    const buffer = await rotateDocumentBuffer(sourceBuffer, item.original_filename, rotation);
    const document = await createDocument({ officeId, studentNo, studentName: studentName || student.name, docType, originalFilename: item.original_filename, mimeType: item.mime_type, sizeBytes: buffer.length, buffer, uploadedBy: user.id });
    await markIngestPromoted(id, document.id, user.id, { officeId });
    try { fs.unlinkSync(sourcePath); } catch {}
    await writeAuditLog(req, "Batch review item confirmed", { details: `Confirmed ingest item #${id} as document #${document.id}.`, entity_type: "ingest_item", entity_id: id });
    return NextResponse.json({ ok: true, data: { ingestId: id, document } }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ ok: false, error: "Unable to create document" }, { status: 500 });
  }
}
