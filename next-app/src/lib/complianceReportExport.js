import { formatReportOffice } from "./exportHelpers.js"

export const complianceRequirementLabel = (requirement) => {
  const state =
    requirement.status === "pending"
      ? "Awaiting review"
      : requirement.status === "declined"
        ? "Needs correction"
        : "Missing"
  return `${requirement.docType}: ${state}${requirement.status === "declined" && requirement.doc?.review_note ? ` (${requirement.doc.review_note})` : ""}`
}

export function buildComplianceRosterCsv(report) {
  // Quoting alone does not prevent spreadsheets from interpreting user content as formulas.
  const cell = (value) => {
    const text = String(value ?? "")
    return `"${(/^[\s]*[=+@-]/.test(text) ? "'" + text : text).replace(/"/g, '""')}"`
  }
  const rows = [
    ["Incomplete Records", report.documentType || "All requirements"],
    ["Generated (UTC)", report.meta.generatedAt],
    ["Office", formatReportOffice(report.meta.officeId, report.meta.officeName) || "All authorized offices"],
    ["Student status", report.meta.studentStatus],
    ["Programs", report.meta.courseCode || "All"],
    ...(report.meta.startDate || report.meta.endDate
      ? [["Student records created (Manila)", `${report.meta.startDate || "Any"} to ${report.meta.endDate || "Any"}`]]
      : []),
    ["Approved only", report.meta.requireApproved ? "Yes" : "No"],
    ["Students", report.total],
    [],
    [
      "Student Number",
      "Student Name",
      "Program",
      "Section",
      "Academic Year",
      "Outstanding Requirements",
    ],
    ...report.students.map((student) => [
      student.studentNo,
      student.name,
      student.courseCode,
      student.section,
      student.yearLevel,
      student.outstandingRequirements
        .map(complianceRequirementLabel)
        .join("; "),
    ]),
  ]
  return "\uFEFF" + rows.map((row) => row.map(cell).join(",")).join("\r\n")
}
