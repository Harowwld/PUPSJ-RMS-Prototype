import { formatPHDateTime } from "./timeFormat"

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
 * @param {number} slaHours - Average turnaround hours
 * @param {number} completionRate - Completion percentage
 * @param {Function} onLogAction - Callback to log the action
 * @param {string} fileName - Optional custom filename
 */
export const downloadSlaCsv = (data, total, slaHours, completionRate, onLogAction, fileName) => {
  if (!data) return
  
  const finalFileName = fileName || generateExportFilename("SLA-ANALYTICS", "REPORT", "csv");
  const q = (cell) => `"${String(cell).replace(/"/g, '""')}"`
  const row = (cells) => cells.map(q).join(",")

  const lines = [
    row(["Service Level Agreement Analytics", ""]),
    row(["Generated (Local)", formatPHDateTime(new Date().toISOString())]),
    "",
    row(["Summary Metrics", "Value"]),
    row(["Total Lifetime Requests", total]),
    row(["Overall Completion Rate", `${completionRate}%`]),
    row([
      "Average Turnaround (SLA)",
      slaHours != null ? `${slaHours.toFixed(1)} hrs` : "N/A",
    ]),
    "",
    row(["Status Distribution", "Count"]),
  ]

  for (const [st, val] of Object.entries(data.statusCounts || {})) {
    if (val > 0) lines.push(row([st, val]))
  }

  lines.push("")
  lines.push(row(["Top Requested Documents", "Count"]))
  for (const dt of data.topDocTypes || []) {
    lines.push(row([dt.name, dt.count]))
  }

  lines.push("")
  lines.push(row(["Trend Data", "Period", "Received", "Completed"]))
  for (const trend of data.volumeTrend || []) {
    lines.push(row(["Monthly Trend", trend.label, trend.received, trend.completed]))
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
