import { formatPHDateTime } from "./timeFormat"

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
  
  const finalFileName = fileName || `sla-analytics-${new Date().toISOString().split("T")[0]}.csv`;
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
