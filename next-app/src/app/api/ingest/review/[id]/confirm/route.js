import fs from "node:fs";
import { NextResponse } from "next/server";
import { requireStaff, createAuthErrorResponse } from "../../../../../../lib/authHelpers";
import { getIngestById, getIngestFilePath, markIngestPromoted } from "../../../../../../lib/ingestQueueRepo";
import { createDocument, getDocumentById } from "../../../../../../lib/documentsRepo";
import { queryOne } from "../../../../../../lib/postgres";
import { writeAuditLog } from "@/lib/auditLogRequest";

export const runtime = "nodejs";

export async function POST(req, ctx) {
  const { user, error } = await requireStaff(req);
  if (error || !user) return createAuthErrorResponse(error || "Authentication required");
  const id = Number((await ctx.params).id);
  if (!Number.isInteger(id) || id < 1) return NextResponse.json({ ok: false, error: "Invalid id" }, { status: 400 });
  const item = await getIngestById(id);
  if (!item || (item.office_id && item.office_id !== (user.office_id || "registrar"))) return NextResponse.json({ ok: false, error: "Review item not found" }, { status: 404 });
  if (item.promoted_document_id) return NextResponse.json({ ok: true, data: { ingestId: id, document: await getDocumentById(item.promoted_document_id), idempotent: true } });
  const body = await req.json().catch(() => ({}));
  const studentNo = String(body.studentNo || item.proposed_student_no || "").trim().toUpperCase();
  const studentName = String(body.studentName || item.ocr_name || "").trim();
  const docType = String(body.docType || item.proposed_doc_type || "").trim();
  if (!studentNo || !docType) return NextResponse.json({ ok: false, error: "Student and document type are required before confirmation." }, { status: 400 });
  const student = await queryOne("SELECT student_no, name FROM students WHERE student_no = $1 AND status = 'Active'", [studentNo]);
  if (!student) return NextResponse.json({ ok: false, error: "Selected student does not exist or is inactive." }, { status: 400 });
  const sourcePath = getIngestFilePath(item.storage_filename);
  if (!fs.existsSync(sourcePath)) return NextResponse.json({ ok: false, error: "Source file is missing from disk." }, { status: 404 });
  try {
    const buffer = fs.readFileSync(sourcePath);
    const document = await createDocument({ officeId: user.office_id || "registrar", studentNo, studentName: studentName || student.name, docType, originalFilename: item.original_filename, mimeType: item.mime_type, sizeBytes: buffer.length, buffer, uploadedBy: user.id });
    await markIngestPromoted(id, document.id, user.id);
    try { fs.unlinkSync(sourcePath); } catch {}
    await writeAuditLog(req, "Batch review item confirmed", { details: `Confirmed ingest item #${id} as document #${document.id}.`, entity_type: "ingest_item", entity_id: id });
    return NextResponse.json({ ok: true, data: { ingestId: id, document } }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err.message || "Unable to create document" }, { status: 500 });
  }
}
