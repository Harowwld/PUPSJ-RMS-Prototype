import { createReportDocument } from "./reportDocument.js"
import { formatPHDateTime } from "./timeFormat.js"

export async function generateStudentRecordsReportPdf(report, options = {}) {
  const { student, digitizedDocuments, outstandingRequirements, meta } = report
  const document = await createReportDocument({ title: "Student Records Report", branding: options.branding, generatedAt: meta.generatedAt })
  document.section("Student Metadata Summary")
  document.metadata([
    ["Full Name", student.name || "N/A"],
    ["Student Number", student.studentNo],
    ["Year / Section", `${student.yearLevel || "N/A"} / ${student.section || "N/A"}`],
    ["Program / Record Status", `${student.courseCode || "N/A"} / ${student.status || "N/A"}`],
  ])
  document.section(`Digitized Records (${digitizedDocuments.length})`, "Approved scanned and archived documents.")
  document.table(["Document Type", "Upload Timestamp (Asia/Manila)"], digitizedDocuments.map((record) => [record.doc_type, formatPHDateTime(record.created_at)]), {
    empty: "No approved digitized records on file.", columnStyles: { 1: { cellWidth: 180 } },
  })
  document.section(`Missing / Pending Requirements (${outstandingRequirements.length})`, meta.configured
    ? `${meta.verifiedCount} of ${meta.requiredCount} mandatory requirements verified.`
    : "Mandatory requirements are defined in system preferences.")
  document.table(["Mandatory Document Type", "Status", "Details"], outstandingRequirements.map((requirement) => [
    requirement.docType,
    requirement.status === "pending" ? "Awaiting Review" : requirement.status === "declined" ? "Needs Correction" : "Missing",
    requirement.status === "declined" && requirement.doc?.review_note ? requirement.doc.review_note
      : requirement.status === "pending" ? "Submitted; awaiting verification." : "No approved record on file.",
  ]), {
    empty: meta.configured ? "All configured requirements have approved records on file."
      : "No mandatory document types are configured for this office. Compliance cannot be evaluated.",
    columnStyles: { 0: { cellWidth: 175 }, 1: { cellWidth: 100 } },
  })
  return document.finish()
}
