import fs from "node:fs";
import { performNativeOcr } from "./appleVisionOcr.js";
import { createDocument } from "./documentsRepo.js";
import {
  detectDocType,
  detectName,
  detectStudentNo,
  extractNameFromCoordinates,
  rotateOcrPages,
  findStudentsInText,
  findStudentsByOcrName,
} from "./ocrClient.js";
import { query } from "./postgres.js";
import { calculateOcrConfidence } from "./ocrConfidence.js";
import {
  claimNextBatchItem,
  findDuplicateIngest,
  getIngestFilePath,
  markIngestFailed,
  markIngestPromoted,
  saveOcrResult,
} from "./ingestQueueRepo.js";
import { rotateDocumentBuffer } from "./documentOrientation.js";

function extractNameCandidate(text) {
  return String(text || "")
    .split(/\r?\n/)
    .map((line) => line.replace(/[^A-Za-z,.' -]/g, " ").replace(/\s+/g, " ").trim())
    .find((line) => {
      const words = line.split(/\s+/).filter(Boolean);
      return words.length >= 2 && words.length <= 6 && words.every((word) => word.length > 1 || /^[A-Z]\.?$/i.test(word));
    }) || null;
}

async function promoteUniqueMatch(item, student, docType, officeId, rotation = 0) {
  const sourcePath = getIngestFilePath(item.storage_filename);
  if (!fs.existsSync(sourcePath)) throw new Error("Ingest source file is missing from disk.");
  const sourceBuffer = fs.readFileSync(sourcePath);
  const buffer = await rotateDocumentBuffer(sourceBuffer, item.original_filename, rotation);
  const document = await createDocument({
    officeId,
    studentNo: student.student_no,
    studentName: student.name,
    docType,
    originalFilename: item.original_filename,
    mimeType: item.mime_type,
    sizeBytes: buffer.length,
    buffer,
  });
  await markIngestPromoted(item.id, document.id);
  try { fs.unlinkSync(sourcePath); } catch {}
  return document;
}

export async function processNextBatchItem(batchId, officeId = "registrar") {
  const item = await claimNextBatchItem(batchId, officeId);
  if (!item) return null;

  const filePath = getIngestFilePath(item.storage_filename);
  if (!fs.existsSync(filePath)) {
    return markIngestFailed(item.id, "Ingest source file is missing from disk.");
  }

  try {
    const [ocrResult, students, docTypes] = await Promise.all([
      performNativeOcr(filePath),
      query("SELECT student_no, name, course_code, year_level, section, status, storage_room AS room, storage_cabinet AS cabinet, storage_drawer AS drawer FROM students WHERE status = 'Active'"),
      query("SELECT name FROM document_types WHERE office_id = $1 AND status = 'Active' ORDER BY lower(name)", [officeId]),
    ]);
    const text = String(ocrResult?.text || "").trim();
    if (!text && (!ocrResult?.pages || !ocrResult.pages.some((page) => page.observations?.length))) {
      return saveOcrResult(item.id, { text, name: null, studentNo: null, docType: null, confidence: 0, candidates: [], error: "OCR engine returned no text or observations." });
    }

    const studentNo = detectStudentNo(text);
    const exactStudent = studentNo ? students.find((student) => String(student.student_no).toUpperCase() === studentNo) : null;
    const docType = detectDocType(text, docTypes.map((row) => row.name));

    // Continuous Scanning must use the same saved coordinate recognition setup
    // as Scan & Upload. Templates are selected after document-type detection.
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
    let templateName = null;
    let coordinateRecognition = null;
    let detectedRotation = 0;
    const orientationCandidates = [0, 90, 180, 270].flatMap((rotation) =>
      templates.flatMap((template) => {
        const recognition = extractNameFromCoordinates(rotateOcrPages(ocrResult.pages, rotation), template);
        if (!recognition?.extractedName) return [];
        const templateMatches = findStudentsByOcrName(recognition.extractedName, students);
        return templateMatches.length > 0 ? [{ rotation, recognition, templateMatches }] : [];
      })
    );
    const selectedOrientation = orientationCandidates[0];
    if (selectedOrientation) {
      templateName = selectedOrientation.recognition.extractedName;
      coordinateRecognition = selectedOrientation.recognition;
      detectedRotation = selectedOrientation.rotation;
    } else {
      for (const template of templates) {
        const recognition = extractNameFromCoordinates(ocrResult.pages, template);
        if (!coordinateRecognition && recognition) coordinateRecognition = recognition;
      }
    }

    const fullPageName = detectName(text.split(/\r?\n/).filter(Boolean), { engine: "apple-vision" }) || extractNameCandidate(text);
    const templateApplied = Boolean(coordinateRecognition);
    // If the configured template regions are empty, fall back to the
    // natural-language full-page name detector instead of abandoning the item.
    const fallbackName = templateName || fullPageName;
    const templateMatches = templateName ? findStudentsByOcrName(templateName, students) : [];
    const fallbackNameMatches = fallbackName ? findStudentsByOcrName(fallbackName, students) : [];
    const textMatches = findStudentsInText(text, students, fallbackName);
    const fuzzyMatches = exactStudent
      ? [exactStudent]
      : templateMatches.length
        ? templateMatches
        : templateApplied
            ? (textMatches.length ? textMatches : fallbackNameMatches)
            : textMatches.length
              ? textMatches
              : fallbackNameMatches;
    const candidates = fuzzyMatches.map((student) => ({ studentNo: student.student_no, name: student.name }));
    const proposed = exactStudent || (fuzzyMatches.length === 1 ? fuzzyMatches[0] : null);
    // Preserve the OCR/template extraction for review. The database candidate
    // must not overwrite the name that was actually read from the document.
    const ocrName = templateName || fallbackName || proposed?.name;
    const conflictingCandidates = templateName
      ? textMatches.filter((student) => String(student.student_no) !== String(proposed?.student_no || ""))
        .map((student) => ({ studentNo: student.student_no, name: student.name }))
      : [];
    const reviewCandidates = [...new Map([...candidates, ...conflictingCandidates].map((candidate) => [candidate.studentNo, candidate])).values()];
    const hasMultipleMatches = reviewCandidates.length > 1;
    const resolvedProposed = hasMultipleMatches ? null : proposed;
    const fallbackSingleMatch = templateApplied && !templateMatches.length && !hasMultipleMatches && Boolean(resolvedProposed);
    const scored = calculateOcrConfidence({
      extractedName: templateName || fallbackName || ocrName,
      candidate: resolvedProposed,
      candidates: reviewCandidates,
      studentNumberMatched: Boolean(exactStudent),
      extractionSource: exactStudent ? "student_number" : templateName && templateMatches.length ? "template" : templateApplied && (textMatches.length || fallbackNameMatches.length) ? "full_document" : fallbackName ? "full_page" : "none",
      templateFields: coordinateRecognition?.regions || {},
      text,
      observations: ocrResult.pages?.flatMap((page) => page.observations || []) || [],
      conflictingCandidates,
    });
    scored.evidence = { ...scored.evidence, detectedRotation };
    const duplicate = await findDuplicateIngest(item.id, item.content_sha256);

    const saved = await saveOcrResult(item.id, {
      text,
      name: ocrName,
      studentNo: resolvedProposed?.student_no || null,
      docType: docType || null,
      confidence: scored.matchConfidence,
      qualityScore: scored.ocrQualityScore,
      evidence: scored.evidence,
      method: scored.matchMethod,
      matchStatus: hasMultipleMatches ? "Conflict" : fallbackSingleMatch ? "Matched" : scored.matchStatus,
      candidates: reviewCandidates,
      regions: coordinateRecognition?.regions || null,
      pageIndex: coordinateRecognition?.pageIndex ?? null,
      status: duplicate ? "Duplicate" : hasMultipleMatches ? "Conflict" : fallbackSingleMatch ? "Confirmed" : "Needs Review",
      error: duplicate ? `Duplicate content matches ingest item #${duplicate.id}.` : null,
    });

    const canAutoUpload = !duplicate
      && reviewCandidates.length === 1
      && resolvedProposed
      && Boolean(docType);
    if (!canAutoUpload) return saved;

    try {
      const document = await promoteUniqueMatch(item, resolvedProposed, docType, officeId, detectedRotation);
      return { ...saved, status: "promoted", review_status: "Confirmed", promoted_document_id: document.id, auto_promoted: true };
    } catch (error) {
      return saveOcrResult(item.id, {
        text,
        name: ocrName,
        studentNo: resolvedProposed.student_no,
        docType: docType || null,
        confidence: scored.matchConfidence,
        qualityScore: scored.ocrQualityScore,
        evidence: { ...scored.evidence, autoUploadError: error.message || "Automatic upload failed." },
        method: scored.matchMethod,
        matchStatus: "Matched",
        candidates: reviewCandidates,
        regions: coordinateRecognition?.regions || null,
        pageIndex: coordinateRecognition?.pageIndex ?? null,
        status: "Needs Review",
        error: `Automatic student-folder upload failed: ${error.message || "Unknown error"}`,
      });
    }
  } catch (error) {
    return saveOcrResult(item.id, {
      text: "",
      name: null,
      studentNo: null,
      docType: null,
      confidence: 0,
      candidates: [],
      error: error?.message || "OCR processing failed.",
    });
  }
}
