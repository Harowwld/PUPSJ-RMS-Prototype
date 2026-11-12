import { formatReportOffice } from "./exportHelpers.js"
import { createReportDocument } from "./reportDocument.js"
import { complianceRequirementLabel } from "./complianceReportExport.js"

export async function generateComplianceRosterPdf(report, options = {}) {
  const document = await createReportDocument({ title: "Incomplete Records Report", branding: options.branding, orientation: "landscape", generatedAt: report.meta.generatedAt })
  document.metadata([
    ["Office", formatReportOffice(report.meta.officeId, report.meta.officeName) || "All authorized offices"],
    ["Document requirement", report.documentType || "All mandatory requirements"],
    ["Student status", report.meta.studentStatus || "All"],
    ["Academic programs", report.meta.courseCode || "All"],
    ...(report.meta.startDate || report.meta.endDate
      ? [["Student records created (Manila)", `${report.meta.startDate || "Any"} to ${report.meta.endDate || "Any"}`]]
      : []),
    ["Evidence rule", report.meta.requireApproved ? "Approved evidence required" : "Pending uploads count as submitted"],
    ["Students in report", String(report.total)],
  ])
  document.section("Students with Incomplete Records")
  document.table(["Student Number", "Student Name", "Program / Year / Section", "Outstanding Requirements"], report.students.map((student) => [
    student.studentNo, student.name,
    [student.courseCode, student.yearLevel, student.section].filter(Boolean).join(" / "),
    student.outstandingRequirements.map(complianceRequirementLabel).join("\n"),
  ]), { columnStyles: { 0: { cellWidth: 120 }, 1: { cellWidth: 150 }, 2: { cellWidth: 115 } } })
  document.paragraph("Source: The selected office's mandatory requirements and student document records. Review outstanding requirements before sending notifications.", { size: 9 })
  return document.finish()
}
