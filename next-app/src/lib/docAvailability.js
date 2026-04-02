/**
 * Shared logic for "does this student have this document type on file?"
 * Keep in sync with DocumentsTab / staff document matrix (declined docs excluded upstream).
 */

export function findMatchingDocument(staffDocs, studentNo, docType) {
  const sn = String(studentNo || "").trim();
  const dt = String(docType || "").trim();
  if (!sn || !dt) return null;
  return (
    staffDocs.find(
      (d) =>
        String(d.student_no || "") === sn && String(d.doc_type || "") === dt
    ) ?? null
  );
}

/**
 * @returns {{ status: 'uploaded'|'missing', doc: object|null, approvalStatus: string }}
 */
export function getDocAvailabilityForType(staffDocs, studentNo, docType) {
  const doc = findMatchingDocument(staffDocs, studentNo, docType);
  if (!doc) {
    return { status: "missing", doc: null, approvalStatus: "" };
  }
  return {
    status: "uploaded",
    doc,
    approvalStatus: String(doc.approval_status || ""),
  };
}
