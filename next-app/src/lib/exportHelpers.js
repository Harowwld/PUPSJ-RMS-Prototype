import { formatPHDateTime } from "./timeFormat.js"

/**
 * Generates a standardized export filename
 * Format: PUP-[ENTITY]-[TYPE]-[YYYY]-[MM]-[DD]-[HHmm].[EXT]
 * @param {string} entity - The entity name (e.g. "AUDIT-LOGS", "STAFF")
 * @param {string} type - The report type (e.g. "REPORT", "DATA")
 * @param {string} extension - The file extension (e.g. "csv", "pdf")
 */
export const generateExportFilename = (entity, type, extension) => {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, "0")
  const day = String(now.getDate()).padStart(2, "0")
  const hours = String(now.getHours()).padStart(2, "0")
  const minutes = String(now.getMinutes()).padStart(2, "0")

  const entityPart = String(entity || "GENERIC").toUpperCase().replace(/\s+/g, "-")
  const typePart = String(type || "EXPORT").toUpperCase().replace(/\s+/g, "-")

  return `PUP-${entityPart}-${typePart}-${year}-${month}-${day}-${hours}${minutes}.${extension}`
}

/**
 * Exports SLA analytics data to CSV
 * @param {Object} data - The analytics data object
 * @param {number} total - Total lifetime requests
 * @param {number} completionRate - Completion percentage
 * @param {Function} onLogAction - Callback to log the action
 * @param {string} fileName - Optional custom filename
 */
export const downloadSlaCsv = (data, total, completionRate, onLogAction, fileName) => {
  if (!data) return
  
  const finalFileName = fileName || generateExportFilename("SLA-ANALYTICS", "REPORT", "csv");
  const q = (cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`
  const row = (cells) => cells.map(q).join(",")

  const lines = [
    row(["Service Level Agreement Analytics", ""]),
    row(["Generated (Local)", formatPHDateTime(new Date().toISOString())]),
    "",
    row(["Summary Metrics", "Value"]),
    row(["Total Lifetime Requests", total ?? 0]),
    row(["Overall Completion Rate", `${completionRate ?? 0}%`]),
    "",
    row(["Status Distribution", "Count"]),
  ]

  for (const [st, val] of Object.entries(data.statusCounts || {})) {
    if (val > 0) lines.push(row([st, val ?? 0]))
  }

  lines.push("")
  lines.push(row(["Top Requested Documents", "Count"]))
  for (const dt of data.topDocTypes || []) {
    lines.push(row([dt?.name || "Unspecified Document", dt?.count ?? 0]))
  }

  if (data?.feedback) {
    lines.push("")
    lines.push(row(["Client Satisfaction Measurement (CSM)", "Value"]))
    lines.push(row(["Average Satisfaction Score", `${data.feedback.averageRating ?? 0} / 5.0`]))
    lines.push(row(["Total Client Ratings", data.feedback.totalResponses ?? 0]))
    lines.push(row(["Positive Rating Rate", `${data.feedback.satisfactionRate ?? 0}%`]))
    lines.push("")
    lines.push(row(["Star Rating Breakdown", "Count"]))
    for (const [star, count] of Object.entries(data.feedback.ratingBreakdown || {})) {
      lines.push(row([`${star} Star`, count ?? 0]))
    }
  }

  const blob = new Blob([lines.join("\n")], {
    type: "text/csv;charset=utf-8;",
  })
  const link = document.createElement("a")
  const url = URL.createObjectURL(blob)
  link.href = url
  link.download = finalFileName
  link.click()
  URL.revokeObjectURL(url)

  onLogAction?.({
    action: "Export CSV",
    details:
      `exported comprehensive SLA compliance dataset (${finalFileName}) to local CSV storage volume`,
    entityType: "Report",
  })
}

/**
 * Exports OSAS Student Organization Compliance data to CSV
 * @param {Object} data - The organization compliance payload
 * @param {Function} onLogAction - Callback to log the action
 * @param {string} fileName - Optional custom filename
 */
export const downloadOrganizationComplianceCsv = (data, onLogAction, fileName, options = {}) => {
  if (!data) return
  
  const finalFileName = fileName || generateExportFilename("OSAS-ORG-COMPLIANCE", "REPORT", "csv");
  const q = (cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`
  const row = (cells) => cells.map(q).join(",")

  const summary = options.summary || data.summary || {}
  const targetOrgs = options.organizations || data.organizations || []

  const lines = [
    row(["OSAS Student Organization Compliance & Accreditation Report", ""]),
    row(["Generated (Local)", formatPHDateTime(new Date().toISOString())]),
  ]

  if (options.scopeNote) {
    lines.push(row(["Report Scope", options.scopeNote]))
  }

  lines.push(
    "",
    row(["Summary Metrics", "Value"]),
    row(["Total Recognized Organizations", summary.totalOrganizations ?? summary.totalOrgs ?? 0]),
    row(["Active Organizations", summary.activeOrganizations ?? (summary.statusDistribution?.Active || 0)]),
    row(["Fully Compliant Organizations", summary.fullyCompliantCount ?? summary.compliantCount ?? 0]),
    row(["Overall Institutional Compliance Rate", `${summary.overallComplianceRate ?? summary.fullyCompliantRate ?? 0}%`]),
    row(["Constitution & By-Laws (CBL) Archival Rate", `${summary.cblArchivedRate ?? 0}% (${summary.cblArchivedCount ?? 0} archived)`]),
    row(["Accredited Officer Leadership Roster", `${summary.withOfficersRate ?? 0}% (${summary.totalActiveOfficers ?? 0} active leaders)`]),
    row(["Faculty Adviser Endorsements", `${summary.withAdviserRate ?? 0}% (${summary.withAdviserCount ?? summary.withAdvisersCount ?? 0} appointed)`]),
    "",
    row([
      "Organization ID",
      "Organization Name",
      "Acronym",
      "Category",
      "Accreditation Standing",
      "Faculty Adviser",
      "Adviser Email",
      "CBL Archived",
      "Active Officers Count",
      "Compliance Score (%)",
      "Compliance Status",
      "Missing Requirements",
    ])
  )

  for (const org of targetOrgs) {
    lines.push(
      row([
        org.id ?? "",
        org.name ?? "Unnamed Organization",
        org.acronym || "",
        org.category || "—",
        org.status || "Active",
        org.adviserName || org.adviser_name || "",
        org.adviserEmail || org.adviser_email || "",
        (org.hasCbl ?? org.checklist?.cbl ?? org.checklist?.has_cbl) ? "Yes" : "No",
        org.activeOfficerCount ?? org.officers?.length ?? 0,
        `${org.complianceScore ?? 0}%`,
        org.complianceStatus || "Pending",
        (org.missingRequirements || []).join("; "),
      ])
    )
  }

  const blob = new Blob([lines.join("\n")], {
    type: "text/csv;charset=utf-8;",
  })
  const link = document.createElement("a")
  const url = URL.createObjectURL(blob)
  link.href = url
  link.download = finalFileName
  link.click()
  URL.revokeObjectURL(url)

  onLogAction?.({
    action: "Export CSV",
    details: options.scopeNote
      ? `exported filtered student organization compliance dataset (${finalFileName}) to local CSV storage volume`
      : `exported student organization compliance dataset (${finalFileName}) to local CSV storage volume`,
    entityType: "Report",
  })
}

