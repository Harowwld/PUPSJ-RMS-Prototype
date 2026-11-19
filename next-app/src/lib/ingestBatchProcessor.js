import fs from "node:fs";
import { performNativeOcrWithRetry } from "./appleVisionOcr.js";
import { createDocument } from "./documentsRepo.js";
import { rotateDocumentBuffer } from "./documentOrientation.js";
import { createAuditLog } from "./auditLogsRepo.js";
import {
  detectDocType,
  detectName,
  formatToLNFnMi,
  recognizeNameFromTemplates,
} from "./ocrClient.js";
import { query, transaction } from "./postgres.js";
import { claimNotificationOccurrence, queueOfficeWorkflowNotification } from "./workflowNotificationsRepo.js";
import { matchOcrStudents, uniqueOcrStudentMatch } from "./studentNameMatcher.js";
import { getOcrStudentRoster } from "./ocrStudentRoster.js";
import {
  claimNextBatchItem,
  findDuplicateIngest,
  getIngestFilePath,
  markIngestFailed,
  markIngestPromoted,
  saveOcrResult,
} from "./ingestQueueRepo.js";

export async function processNextBatchItem(batchId, officeId) {
  const item = await processBatchItem(batchId, officeId);
  try {
    await notifyCompletedBatch(batchId, officeId);
  } catch (error) {
    console.warn("Could not record scan batch notification", { code: error.code });
  }
  return item;
}

async function notifyCompletedBatch(batchId, officeId) {
  if (officeId !== "registrar" && officeId !== "osas") return;
  await transaction(async (db) => {
    const counts = await db.queryOne(
      `SELECT count(*) FILTER (WHERE status = 'processing'
          OR (status = 'pending' AND lower(coalesce(review_status, 'Processing')) IN ('processing', 'pending'))
          OR (status IN ('pending', 'failed') AND review_status = 'Failed' AND coalesce(auto_retry_count, 0) < 1))::int AS remaining,
              count(*) FILTER (WHERE review_status IN ('Needs Review', 'Conflict', 'Duplicate'))::int AS review,
              count(*) FILTER (WHERE review_status = 'Failed' AND coalesce(auto_retry_count, 0) >= 1)::int AS failed
         FROM ingest_queue WHERE office_id = $1 AND batch_id = $2`,
      [officeId, batchId],
    );
    if (counts.remaining || !(counts.review || counts.failed)) return;
    const eventKey = `queue_${officeId}_scan`;
    if (!await claimNotificationOccurrence(db, eventKey, String(batchId))) return;
    await queueOfficeWorkflowNotification(db, {
      officeId, eventKey, entityType: "ingest_batch", entityId: batchId, title: "Scan Batch Needs Attention",
      detail: `${counts.review} files need review and ${counts.failed} failed processing.`,
    });
  });
}

async function processBatchItem(batchId, officeId) {
  if (!String(officeId || "").trim()) throw new Error("Office scope is required");
  const item = await claimNextBatchItem(batchId, officeId);
  if (!item) return null;

  const filePath = getIngestFilePath(item.storage_filename);
  if (!fs.existsSync(filePath)) {
    return markIngestFailed(item.id, "Ingest source file is missing from disk.", { officeId });
  }

  try {
    const totalStartedAt = performance.now();
    const ocrStartedAt = performance.now();
    let ocrMs = 0;
    const [ocrResult, docTypes] = await Promise.all([
      performNativeOcrWithRetry(filePath).then((result) => {
        ocrMs = performance.now() - ocrStartedAt;
        return result;
      }),
      query("SELECT name FROM document_types WHERE office_id = $1 AND status = 'Active' ORDER BY lower(name)", [officeId]),
    ]);
    const text = String(ocrResult?.text || "").trim();
    if (!text && (!ocrResult?.pages || !ocrResult.pages.some((page) => page.observations?.length))) {
      return saveOcrResult(item.id, { text, name: null, docType: null, error: "OCR engine returned no text or observations." }, { officeId });
    }

    const docType = detectDocType(text, docTypes.map((row) => row.name), { requireEvidence: true });

    // Continuous Scanning must use the same saved coordinate recognition setup
    // as Scan & Upload. Templates are selected after document-type detection.
    const templateStartedAt = performance.now();
    const templates = docType
      ? await query(
        `SELECT rt.*, dt.name AS document_type
         FROM recognition_templates rt
         JOIN document_types dt ON dt.id = rt.document_type_id AND dt.office_id = rt.office_id
         WHERE rt.office_id = $1 AND rt.status = 'Active' AND dt.status = 'Active' AND lower(dt.name) = lower($2)
         ORDER BY rt.version DESC`,
        [officeId, docType],
      )
      : [];
    const templateMs = performance.now() - templateStartedAt;
    const { coordinateRecognition, detectedRotation } = recognizeNameFromTemplates(ocrResult.pages, templates);
    const templateName = coordinateRecognition?.extractedName || null;

    let matchingMs = 0;
    const matchingStartedAt = performance.now();
    const studentRoster = await getOcrStudentRoster(officeId);
    const rosterMatchName = templateName || formatToLNFnMi(detectName(text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean)));
    const studentMatches = matchOcrStudents(rosterMatchName, text, studentRoster);
    matchingMs = performance.now() - matchingStartedAt;
    // A unique roster match from either the configured OCR fields or the
    // whole-page OCR text is sufficient for automatic assignment. Multiple
    // plausible roster records remain in review for staff to disambiguate.
    const autoMatchedStudent = uniqueOcrStudentMatch(studentMatches);
    const studentCandidates = studentMatches.map(({ studentNo, mismatchPercent }) => ({ studentNo, mismatchPercent }));
    const ocrName = templateName || (studentMatches.length === 1 ? studentMatches[0].name : null);
    const duplicate = await findDuplicateIngest(item.id, item.content_sha256, { officeId });

    const saved = await saveOcrResult(item.id, {
      text,
      name: ocrName,
      docType: docType || null,
      studentNo: !duplicate ? autoMatchedStudent?.studentNo : null,
      studentCandidates,
      detectedRotation,
      regions: coordinateRecognition?.regions || null,
      pageIndex: coordinateRecognition?.pageIndex ?? null,
      status: duplicate ? "Duplicate" : "Needs Review",
      error: duplicate ? `Duplicate content matches ingest item #${duplicate.id}.` : null,
    }, { officeId });

    if (!duplicate && autoMatchedStudent && docType) {
      try {
        const sourceBuffer = fs.readFileSync(filePath);
        const promotedBuffer = await rotateDocumentBuffer(sourceBuffer, item.original_filename, detectedRotation);
        const document = await createDocument({
          officeId,
          studentNo: autoMatchedStudent.studentNo,
          studentName: autoMatchedStudent.name,
          docType,
          originalFilename: item.original_filename,
          mimeType: item.mime_type,
          sizeBytes: promotedBuffer.length,
          buffer: promotedBuffer,
          sourceIngestId: item.id,
        });
        const promoted = await markIngestPromoted(item.id, document.id, null, { officeId });
        try { fs.unlinkSync(filePath); } catch {}
        try {
          await createAuditLog({
            actor: "OCR Auto Confirmation",
            role: "System",
            officeId,
            action: "Batch scan auto-confirmed",
            details: `Automatically matched scanned name '${templateName}' to student '${autoMatchedStudent.name}' (${autoMatchedStudent.studentNo}) at ${autoMatchedStudent.mismatchPercent}% difference and created document #${document.id}.`,
            entity_type: "Document",
            entity_id: document.id,
          });
        } catch (auditError) {
          console.warn("[OCR] Could not record auto-confirmation audit entry:", auditError.message);
        }
        console.info("[OCR timing] Continuous Scan", JSON.stringify({
          officeId,
          itemId: item.id,
          ocrMs,
          templateMs,
          matchingMs,
          totalMs: performance.now() - totalStartedAt,
          autoConfirmed: true,
        }));
        return promoted;
      } catch (promotionError) {
        console.warn(`[OCR] Auto-confirmation failed for ingest item ${item.id}; leaving it in Needs Review:`, promotionError.message);
      }
    }

    console.info("[OCR timing] Continuous Scan", JSON.stringify({
      officeId,
      itemId: item.id,
      ocrMs,
      templateMs,
      matchingMs,
      totalMs: performance.now() - totalStartedAt,
    }));
    return saved;
  } catch (error) {
    return saveOcrResult(item.id, {
      text: "",
      name: null,
      docType: null,
      error: error?.message || "OCR processing failed.",
    }, { officeId });
  }
}
