import fs from "node:fs";
import { performNativeOcr } from "./appleVisionOcr.js";
import { createDocument } from "./documentsRepo.js";
import { rotateDocumentBuffer } from "./documentOrientation.js";
import { createAuditLog } from "./auditLogsRepo.js";
import {
  detectDocType,
  extractNameFromCoordinates,
  rotateOcrPages,
} from "./ocrClient.js";
import { query } from "./postgres.js";
import { matchStudentsByConfiguredOcrName } from "./studentNameMatcher.js";
import { getOcrStudentRoster } from "./ocrStudentRoster.js";
import {
  claimNextBatchItem,
  findDuplicateIngest,
  getIngestFilePath,
  markIngestFailed,
  markIngestPromoted,
  saveOcrResult,
} from "./ingestQueueRepo.js";

function extractNameCandidate(text) {
  return String(text || "")
    .split(/\r?\n/)
    .map((line) => line.replace(/[^A-Za-z,.' -]/g, " ").replace(/\s+/g, " ").trim())
    .find((line) => {
      const words = line.split(/\s+/).filter(Boolean);
      return words.length >= 2 && words.length <= 6 && words.every((word) => word.length > 1 || /^[A-Z]\.?$/i.test(word));
    }) || null;
}

export async function processNextBatchItem(batchId, officeId) {
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
      performNativeOcr(filePath).then((result) => {
        ocrMs = performance.now() - ocrStartedAt;
        return result;
      }),
      query("SELECT name FROM document_types WHERE office_id = $1 AND status = 'Active' ORDER BY lower(name)", [officeId]),
    ]);
    const text = String(ocrResult?.text || "").trim();
    if (!text && (!ocrResult?.pages || !ocrResult.pages.some((page) => page.observations?.length))) {
      return saveOcrResult(item.id, { text, name: null, docType: null, error: "OCR engine returned no text or observations." }, { officeId });
    }

    const docType = detectDocType(text, docTypes.map((row) => row.name));

    // Continuous Scanning must use the same saved coordinate recognition setup
    // as Scan & Upload. Templates are selected after document-type detection.
    const templateStartedAt = performance.now();
    const templates = docType
      ? await query(
        `SELECT rt.*, dt.name AS document_type
         FROM recognition_templates rt
         JOIN document_types dt ON dt.id = rt.document_type_id
         WHERE rt.office_id = $1 AND rt.status = 'Active' AND lower(dt.name) = lower($2)
         ORDER BY rt.version DESC`,
        [officeId, docType],
      )
      : [];
    const templateMs = performance.now() - templateStartedAt;
    let templateName = null;
    let coordinateRecognition = null;
    let detectedRotation = 0;
    for (const rotation of [0, 90, 180, 270]) {
      for (const template of templates) {
        const recognition = extractNameFromCoordinates(rotateOcrPages(ocrResult.pages, rotation), template);
        if (!coordinateRecognition && recognition) coordinateRecognition = recognition;
        if (recognition?.extractedName) {
          templateName = recognition.extractedName;
          coordinateRecognition = recognition;
          detectedRotation = rotation;
          break;
        }
      }
      if (templateName) break;
    }

    let studentMatches = [];
    let matchingMs = 0;
    if (templateName) {
      const matchingStartedAt = performance.now();
      studentMatches = matchStudentsByConfiguredOcrName(templateName, await getOcrStudentRoster(officeId));
      matchingMs = performance.now() - matchingStartedAt;
    }
    const confidentMatches = studentMatches.filter((match) => match.mismatchRatio < 0.10);
    const autoMatchedStudent = confidentMatches.length === 1 ? confidentMatches[0] : null;
    const studentCandidates = studentMatches.map(({ studentNo, mismatchPercent }) => ({ studentNo, mismatchPercent }));
    const duplicate = await findDuplicateIngest(item.id, item.content_sha256, { officeId });

    const saved = await saveOcrResult(item.id, {
      text,
      name: templateName || extractNameCandidate(text),
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
