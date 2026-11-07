import { createReportDocument } from "./reportDocument.js"
import { formatPHDateTime } from "./timeFormat.js"
import { formatLogDetails } from "./auditLogFormatting.js"
import { getReportFont } from "./reportFontOptions.js"
import { getRequestCharterStatus, buildSlaTiers } from "./citizenCharter.js"

export { DEFAULT_BRANDING_LOGO, OFFICIAL_FALLBACK_LOGO, getInstitutionalBranding, deriveDocumentPrefix, hexToRgb, getLogoAsPng } from "./institutionalBranding.js"
export { drawReportHeader as addPUPReportHeader } from "./reportDocument.js"

const list = (value) => Array.isArray(value) ? value : []
const number = (value) => Number.isFinite(Number(value)) ? Number(value) : 0
const count = (value) => number(value).toLocaleString("en-US")
const percent = (value) => value == null || !Number.isFinite(Number(value)) ? "N/A" : `${number(value)}%`
const coverage = (options) => options.startDate || options.endDate
  ? `${options.startDate || "Beginning of records"} to ${options.endDate || "Present"}` : "All available records"
const numericColumns = (...indices) => Object.fromEntries(indices.map((index) => [index, { halign: "right" }]))
const analyticsSection = (report, heading, note) => report.section(heading, note, { spaceBefore: 14 })

export async function generateAuditLogsPdf(logs = [], options = {}) {
  const report = await createReportDocument({ title: "Activity History Summary Report", branding: options.branding, orientation: "landscape" })
  report.metadata([
    ["Coverage", coverage(options)],
    ["Scope", options.scope || "Authorized activity history"],
    ["Role", options.role || "All roles"],
    ["Severity", options.severity || "All severities"],
    ["Search", options.search || "None"],
  ])
  report.section("Activity History", `${count(list(logs).length)} recorded actions match the selected criteria.`)
  const scoped = list(logs).some((log) => log && (log.officeName || log.office_name || log.scope || log.office_id))
  const head = ["Timestamp (Asia/Manila)", "Severity", "Actor", "Role", ...(scoped ? ["Scope"] : []), "Action", "Details"]
  report.table(head, list(logs).map((log) => [
    log?.created_at || log?.time || log?.timestamp ? formatPHDateTime(log.created_at || log.time || log.timestamp) : "Not recorded",
    log?.severity || "INFO", log?.actor || log?.user || log?.actor_name || "System", log?.role || "Not recorded",
    ...(scoped ? [log?.officeName || log?.office_name || log?.scope || log?.office_id || "Global"] : []),
    log?.action || "Activity", formatLogDetails(log?.details) || "No additional details",
  ]), { fontSize: 8.5, columnStyles: { 0: { cellWidth: 90 }, 1: { cellWidth: 55 }, 2: { cellWidth: 85 }, 3: { cellWidth: 60 } } })
  report.paragraph("Source: Recorded system activity. This report reflects the selected records at the time of generation.", { size: 9 })
  return report.finish()
}

export async function generateDigitizationCompliancePdf(data = {}, summary = {}, meta = {}, byCourse = []) {
  const report = await createReportDocument({ title: "Digitization Compliance Report", branding: meta.branding, generatedAt: meta.generatedAt })
  report.metadata([["Office", meta.officeId || "Authorized office"], ["Coverage", "Student records included in the current analysis"]])
  analyticsSection(report, "Summary")
  report.paragraph("This report summarizes student record digitization against the mandatory document types configured for the selected office.")
  report.table(["Measure", "Recorded Result"], [
    ["Students", count(summary.totalStudents)],
    ["Students with complete records", count(summary.digitizedStudents)],
    ["Students with incomplete records", count(summary.notDigitizedStudents)],
    ["Digitization progress", percent(summary.percentDigitized)],
    ["Digitized documents", count(summary.totalDigitizedDocsCount)],
    ["Expected documents", count(summary.totalExpectedDocsCount)],
    ["Configured mandatory document types", count(list(meta.definitions?.configuredDocTypes).length)],
  ], { columnStyles: numericColumns(1) })
  analyticsSection(report, "Student Population by Academic Year")
  report.table(["Academic Year", "Students"], list(data.byYear).map((year) => [year?.year || "Not recorded", count(year?.count)]), { columnStyles: numericColumns(1) })
  analyticsSection(report, "Program-Specific Breakdown")
  report.table(["Academic Program", "Students", "Complete Records", "Progress"], list(byCourse).map((course) => [course?.courseCode || "Not recorded", count(course?.total), count(course?.digitized), percent(course?.percent)]), { columnStyles: numericColumns(1, 2, 3) })
  report.review("Source: Student records, configured mandatory requirements, and digitized document entries. Missing or pending requirements should be reviewed against the student's current record before notification.")
  return report.finish()
}

export async function generateOrganizationCompliancePdf(data = {}, summary = {}, meta = {}, organizations = [], byCategory = [], options = {}) {
  const report = await createReportDocument({ title: "Student Organization Compliance Report", branding: meta.branding || options.branding, generatedAt: meta.generatedAt })
  report.metadata([["Office", "Office of Student Affairs and Services (OSAS)"], ["Scope", options.scopeNote || "Organizations included in the current analysis"]])
  const orgs = list(organizations)
  const total = number(summary.totalOrganizations ?? orgs.length)
  const rate = (value) => total > 0 ? `${Math.round(number(value) / total * 100)}%` : "N/A"
  analyticsSection(report, "Compliance Summary")
  report.paragraph("The assessment covers Constitution and By-Laws records, officer rosters, faculty advisers, and organizational standing recorded in the system.")
  report.table(["Measure", "Recorded Result"], [
    ["Recognized organizations", count(total)],
    ["Overall compliance rate", percent(summary.overallComplianceRate)],
    ["Fully compliant organizations", `${count(summary.fullyCompliantCount)} (${summary.fullyCompliantRate == null ? rate(summary.fullyCompliantCount) : percent(summary.fullyCompliantRate)})`],
    ["Organizations with CBL on file", `${count(summary.cblArchivedCount)} of ${count(total)}`],
    ["Organizations with officers", count(summary.withOfficersCount)],
    ["Active officers", count(summary.totalActiveOfficers)],
    ["Organizations with faculty advisers", count(summary.withAdviserCount ?? summary.withAdvisersCount)],
  ], { columnStyles: numericColumns(1) })
  analyticsSection(report, "Category Performance")
  report.table(["Category", "Organizations", "Complete", "CBL on File", "With Officers", "Compliance"], list(byCategory).map((category) => {
    const total = number(category?.totalOrganizations ?? category?.totalOrgs)
    const complete = number(category?.fullyCompliantCount ?? category?.compliantCount)
    return [category?.category || "Not recorded", count(total), count(complete), count(category?.cblArchivedCount), count(category?.withOfficersCount), percent(category?.complianceRate ?? (total ? Math.round(complete / total * 100) : null))]
  }), { columnStyles: numericColumns(1, 2, 3, 4, 5) })
  analyticsSection(report, "Organization Compliance Matrix")
  report.table(["Organization", "Category", "Faculty Adviser", "CBL", "Officers", "Standing", "Compliance"], orgs.map((org) => [
    `${org?.name || "Unnamed Organization"}${org?.acronym ? ` (${org.acronym})` : ""}`,
    org?.category || "Not recorded", org?.adviserName || org?.adviser_name || "Not recorded",
    (org?.hasCbl ?? org?.checklist?.cbl ?? org?.checklist?.has_cbl) ? "Archived" : "Pending",
    count(org?.activeOfficerCount ?? org?.officers?.length), org?.status || "Not recorded",
    `${percent(org?.complianceScore)} (${org?.complianceStatus || "Pending"})`,
  ]), { fontSize: 8.5, columnStyles: { 0: { cellWidth: 125 }, 4: { halign: "right" } } })
  report.review("Source: OSAS organization profiles and recorded submissions. This report summarizes the selected records and does not replace review of the supporting documents.")
  return report.finish()
}

function processingSummary(report, data, total, completionRate) {
  const sla = data.sla || {}
  analyticsSection(report, "Processing Time Summary")
  report.paragraph("Request processing results are measured against the service windows configured in the system for the selected reporting period.")
  report.table(["Measure", "Recorded Result"], [
    ["Total document requests", count(total)],
    ["Completed requests", count(sla.totalCompleted)],
    ["Completed on time", count(sla.compliantCompleted)],
    ["On-time completion rate", number(sla.totalCompleted) > 0 ? percent(completionRate) : "N/A"],
    ["Delayed completed requests", count(sla.delayedCompleted)],
    ["Active overdue requests", count(sla.activeOverdue)],
    ["Requests due soon", count(sla.activeDueSoon)],
  ], { columnStyles: numericColumns(1) })
}

function processingTiers(report, data) {
  analyticsSection(report, "Service Classification and Turnaround", "Classification totals follow the system's SLA flags, including active requests and requests closed without fulfillment. Completed-request performance is reported separately in the summary.")
  const tiers = data.sla?.tierStats || {}
  const unit = data.sla?.standards?.workingDaysOnly === false ? "calendar days" : "working days"
  report.table(["Service Classification", "Configured Window", "Requests", "System Compliant / Exempt", "Recorded Rate"], Object.entries(tiers).map(([key, stat]) => [
    stat.label || key, (stat.days ?? stat.windowDays) ? `${stat.days ?? stat.windowDays} ${unit}` : "Not configured", count(stat.total), count(stat.compliant),
    number(stat.total) > 0 ? `${Math.round(number(stat.compliant) / number(stat.total) * 100)}%` : "N/A",
  ]), { empty: "No service classification results were recorded for this period.", columnStyles: numericColumns(2, 3, 4) })
}

function documentDemand(report, data, total) {
  analyticsSection(report, "Document Request Volume")
  const hasWindows = list(data.topDocTypes).some((type) => type?.slaWindow)
  report.table(["Document Type", "Requests", "Share of Requests", ...(hasWindows ? ["Configured Window"] : [])], list(data.topDocTypes).map((type) => [
    type?.name || "Unspecified Document", count(type?.count), number(total) > 0 ? `${Math.round(number(type?.count) / number(total) * 100)}%` : "N/A",
    ...(hasWindows ? [type?.slaWindow ? `${type.slaWindow} ${data.sla?.standards?.workingDaysOnly === false ? "calendar days" : "working days"}` : "Not recorded"] : []),
  ]), { columnStyles: { 0: { cellWidth: 210 }, ...numericColumns(1, 2) } })
}

function satisfactionSummary(report, data) {
  const feedback = data.feedback || {}
  const responses = number(feedback.totalResponses)
  analyticsSection(report, "Client Satisfaction Summary")
  report.paragraph("This section summarizes the feedback recorded for completed document requests. No satisfaction result is inferred when no feedback is available.")
  report.table(["Measure", "Recorded Result"], [
    ["Feedback responses", count(responses)],
    ["Mean rating (1 to 5)", responses > 0 && feedback.averageRating != null ? number(feedback.averageRating).toFixed(1) : "N/A"],
    ["Positive ratings (4 and 5)", responses > 0 ? percent(feedback.satisfactionRate) : "N/A"],
  ], { columnStyles: numericColumns(1) })
}

function ratingDistribution(report, data) {
  const feedback = data.feedback || {}
  const responses = number(feedback.totalResponses)
  analyticsSection(report, "Five-Point Rating Distribution")
  report.table(["Rating", "Responses", "Share of Responses"], [5, 4, 3, 2, 1].map((rating) => [
    `${rating} of 5`, count(feedback.ratingBreakdown?.[rating]), responses > 0 ? `${Math.round(number(feedback.ratingBreakdown?.[rating]) / responses * 100)}%` : "N/A",
  ]), { columnStyles: numericColumns(1, 2) })
}

function qualityDimensions(report, data) {
  analyticsSection(report, "Service Quality Dimensions")
  report.table(["Recorded Feedback Aspect", "Mentions", "Share of Responses"], list(data.feedback?.topAspects).map((aspect) => [aspect?.label || aspect?.tag || "Not recorded", count(aspect?.count), percent(aspect?.percentage)]), {
    empty: "No service quality dimension results were recorded for this period.", columnStyles: numericColumns(1, 2),
  })
}

async function analyticsReport(title, options) {
  const report = await createReportDocument({ title, branding: options.branding })
  report.metadata([["Coverage", coverage(options)]])
  return report
}

export async function generateSLACompliancePdf(data = {}, total = 0, completionRate = 0, options = {}) {
  const report = await analyticsReport("Citizen's Charter Processing Time and Fulfillment Report", options)
  processingSummary(report, data, total, completionRate)
  processingTiers(report, data)
  documentDemand(report, data, total)
  report.review(`Source: Document requests and recorded processing outcomes. Framework: ${data.sla?.standards?.frameworkName || "Configured service standards"}.`)
  return report.finish()
}

export async function generateCSMReportPdf(data = {}, options = {}) {
  const report = await analyticsReport("Client Satisfaction Measurement (CSM) Evaluation Report", options)
  satisfactionSummary(report, data)
  ratingDistribution(report, data)
  qualityDimensions(report, data)
  report.review("Source: Feedback submitted through the document request workflow. Results reflect recorded responses for the selected coverage period.")
  return report.finish()
}

export async function generateComprehensiveSLAPdf(data = {}, total = 0, completionRate = 0, options = {}) {
  const report = await analyticsReport("Processing Time and Client Satisfaction Report", options)
  processingSummary(report, data, total, completionRate)
  processingTiers(report, data)
  documentDemand(report, data, total)
  satisfactionSummary(report, data)
  ratingDistribution(report, data)
  qualityDimensions(report, data)
  report.review("Source: Document request processing outcomes and submitted client feedback for the selected coverage period.")
  return report.finish()
}

export const generateSLAAnalyticsPdf = generateComprehensiveSLAPdf

export async function generateSampleBrandingPdf(branding) {
  const report = await createReportDocument({ title: "Institutional Document Style Sample", branding })
  report.metadata([["Document", "Branding preview - sample content"], ["Report font", getReportFont(report.branding.reportFont).label]])
  report.section("Document Purpose")
  report.paragraph("This sample demonstrates the shared institutional report format. The letterhead, typeface, margins, section headings, tables, continuation headers, and page footer follow the same document style.")
  report.section("Report Structure")
  report.table(["Document Element", "Standard Format"], [
    ["Letterhead", "Institutional seals, jurisdiction, institution, campus, and office"],
    ["Report identification", "Descriptive title, report date, and scope"],
    ["Body", "Numbered sections, readable paragraphs, and consistent data tables"],
    ["Continuation pages", "Institution and report title with repeated table headings"],
    ["Footer", "Page X of Y"],
  ])
  report.review("Where review is required, space is provided for the responsible personnel. Signature lines remain blank until the document is reviewed and signed.", "Review and Signatures")
  return report.finish()
}

export async function generateStudentComplianceSlipPdf(student = {}, requirements = [], summary = {}, options = {}) {
  const report = await createReportDocument({ title: "Student Requirements Compliance Summary", branding: options.branding })
  report.section("Student Metadata Summary")
  const reqs = list(requirements)
  const submitted = number(summary.submittedCount ?? summary.approvedCount)
  const total = number(summary.totalRequired ?? reqs.length)
  report.metadata([
    ["Full Name", student.name || "Not recorded"], ["Student Number", student.studentNo || student.student_no || "Not recorded"],
    ["Program / Year / Section", [student.courseCode || student.course_code, student.yearLevel || student.year_level, student.section].filter(Boolean).join(" / ") || "Not recorded"],
    ["Submission progress", total > 0 ? `${submitted} of ${total} submitted (${percent(summary.complianceRate ?? Math.round(submitted / total * 100))})` : "No mandatory requirements configured"],
  ])
  report.section("Document Requirements")
  report.table(["Requirement / Credential", "Category", "Status"], reqs.map((requirement) => [
    requirement?.docType || requirement?.name || "Not recorded", requirement?.category || "Not recorded",
    requirement?.status === "Submitted" || requirement?.submitted ? "Submitted" : "Not Submitted",
  ]), { empty: "No requirements are configured for this record.", columnStyles: { 0: { cellWidth: 225 } } })
  report.paragraph("Source: The student's recorded document requirements. Submission status does not replace verification of the uploaded documents.", { size: 9 })
  return report.finish()
}

export async function generateCampusOperationsPdf(transactions = [], options = {}) {
  const report = await createReportDocument({
    title: "Campus Operations & Turnaround Standards Report",
    branding: options.branding,
    orientation: "landscape",
  })

  const slaStandards = options.slaStandards || {
    frameworkName: "Citizen's Charter (ARTA RA 11032)",
    simpleDays: 3,
    complexDays: 7,
    highlyTechnicalDays: 20,
    workingDaysOnly: true,
  }
  const tiers = buildSlaTiers(slaStandards)

  report.metadata([
    ["Framework", slaStandards.frameworkName || "Citizen's Charter (ARTA RA 11032)"],
    ["Lifecycle Scope", options.lifecycle ? String(options.lifecycle).toUpperCase() : "ALL OPERATIONS"],
    ["Total Records", count(list(transactions).length)],
    ["Target SLA Tiers", `${slaStandards.simpleDays || 3}d Simple · ${slaStandards.complexDays || 7}d Complex · ${slaStandards.highlyTechnicalDays || 20}d Technical`],
    ["Generated At", formatPHDateTime(new Date().toISOString())],
    ["Active Filters", options.search || options.filters || "None"],
  ])

  report.section(
    "Campus Operations Activity Stream",
    `${count(list(transactions).length)} transactions matching the selected scope across University Registrar and OSAS departments.`
  )

  const head = [
    "ID",
    "Department",
    "Student Requester",
    "Document / Proposal Title",
    "Stage Status",
    "Citizen's Charter SLA",
    "Submitted",
  ]

  const body = list(transactions).map((tx) => {
    const charter = getRequestCharterStatus(
      {
        doc_type: tx.title,
        tier: tx.type === "event_proposal" ? tiers.COMPLEX : undefined,
        created_at: tx.createdAt,
        updated_at: tx.updatedAt,
        status: tx.status,
      },
      slaStandards
    )

    const num = tx.originalId ?? (typeof tx.id === "string" ? tx.id.replace(/^[a-z]+-/, "") : tx.id)
    const padded = String(num || 0).padStart(3, "0")
    const txId = (tx.officeId === "registrar" || tx.type === "document_request")
      ? `#ODRS-${padded}`
      : (tx.officeId === "osas" || tx.type === "event_proposal")
      ? `#OSAS-${padded}`
      : `#TX-${padded}`

    const dept = tx.officeName || (tx.officeId === "registrar" ? "Registrar" : "OSAS")
    const requester = tx.studentName && !tx.studentName.startsWith("enc:")
      ? tx.studentName
      : (tx.studentNo ? `Student (${tx.studentNo})` : "Student")

    return [
      txId,
      dept,
      requester,
      tx.title || "Untitled",
      tx.status || "Pending",
      charter.label || charter.status || "Standard",
      tx.createdAt ? formatPHDateTime(tx.createdAt) : "Not recorded",
    ]
  })

  report.table(head, body, {
    fontSize: 8,
    columnStyles: {
      0: { cellWidth: 50 },
      1: { cellWidth: 75 },
      2: { cellWidth: 85 },
      3: { cellWidth: 120 },
      4: { cellWidth: 65 },
      5: { cellWidth: 75 },
      6: { cellWidth: 80 },
    },
  })

  report.paragraph(
    "Source: Official PUPSJ Records Keeping System - SuperAdmin Campus Operations & SLA Compliance Telemetry. This report reflects recorded transactions at the time of generation.",
    { size: 8 }
  )

  return report.finish()
}
