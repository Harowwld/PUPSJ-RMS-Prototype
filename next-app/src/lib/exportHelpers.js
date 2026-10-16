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
/**
 * Exports dedicated Citizen's Charter SLA compliance data to CSV
 */
export const downloadSlaComplianceCsv = (data, total, completionRate, onLogAction, fileName) => {
  if (!data) return;

  const finalFileName = fileName || generateExportFilename("SLA-COMPLIANCE", "DATA", "csv");
  const q = (cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`;
  const row = (cells) => cells.map(q).join(",");

  const compliantCount = data?.sla?.compliantCompleted ?? (Number.isFinite(data?.sla?.totalCompleted) ? data.sla.totalCompleted : 0);
  const activeOverdue = data?.sla?.activeOverdue || 0;
  const delayedCompleted = data?.sla?.delayedCompleted || 0;

  const lines = [
    row(["Citizen's Charter SLA Compliance Dataset", ""]),
    row(["Legal Mandate", "Republic Act No. 11032 / Anti-Red Tape Authority (ARTA)"]),
    row(["Generated (Local)", formatPHDateTime(new Date().toISOString())]),
    "",
    row(["Summary Operational Metrics", "Value"]),
    row(["Total Document Inflow", total ?? 0]),
    row(["Overall SLA Compliance Rate", `${completionRate ?? 0}%`]),
    row(["On-Time Fulfillments", compliantCount]),
    row(["Delayed / Exceeded Window", delayedCompleted + activeOverdue]),
    row(["Active Overdue Watchlist", activeOverdue]),
    "",
    row(["Transaction Status Distribution", "Count"]),
  ];

  for (const [st, val] of Object.entries(data.statusCounts || {})) {
    if (val > 0) lines.push(row([st, val ?? 0]));
  }

  const tierStats = data?.sla?.tierStats || {};
  if (Object.keys(tierStats).length > 0) {
    lines.push("");
    lines.push(row(["Service Classification Tier", "Statutory Window", "Total", "Compliant", "Delayed", "Compliance Rate"]));
    for (const [key, stat] of Object.entries(tierStats)) {
      const rate = stat.total > 0 ? Math.round((stat.compliant / stat.total) * 100) : 100;
      const delayed = (stat.delayed || 0) + (stat.overdue || 0);
      lines.push(row([
        stat.label || key,
        stat.windowDays ? `${stat.windowDays} Working Days` : "Standard",
        stat.total ?? 0,
        stat.compliant ?? 0,
        delayed,
        `${rate}%`
      ]));
    }
  }

  lines.push("");
  lines.push(row(["Top Academic Credential Demand", "Request Count", "Workload Share"]));
  for (const dt of data.topDocTypes || []) {
    const count = dt?.count ?? 0;
    const share = total > 0 ? `${Math.round((count / total) * 100)}%` : "0%";
    lines.push(row([dt?.name || "Unspecified Document", count, share]));
  }

  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.href = url;
  link.download = finalFileName;
  link.click();
  URL.revokeObjectURL(url);

  onLogAction?.({
    action: "Export CSV",
    details: `exported dedicated Citizen's Charter SLA compliance dataset (${finalFileName}) to local CSV storage volume`,
    entityType: "Report",
  });
};

/**
 * Exports dedicated Client Satisfaction Measurement (CSM) feedback data to CSV
 */
export const downloadCsmRatingsCsv = (data, onLogAction, fileName) => {
  if (!data?.feedback) return;

  const finalFileName = fileName || generateExportFilename("CSM-RATINGS", "DATA", "csv");
  const q = (cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`;
  const row = (cells) => cells.map(q).join(",");

  const fb = data.feedback;
  const feedbackTotal = fb.totalResponses ?? 0;
  const satRate = fb.satisfactionRate ?? 0;
  const avgRating = fb.averageRating ?? 0;

  const lines = [
    row(["Client Satisfaction Measurement (CSM) & Service Quality Dataset", ""]),
    row(["Regulatory Standard", "ARTA Memorandum Circular No. 2019-002 / ISO 9001:2015"]),
    row(["Generated (Local)", formatPHDateTime(new Date().toISOString())]),
    "",
    row(["Executive Quality Index", "Value"]),
    row(["Mean Client Satisfaction Score", `${avgRating} / 5.0 Stars`]),
    row(["Positive Sentiment Rate", `${satRate}% Positive`]),
    row(["Total Verified Evaluations", feedbackTotal]),
    row(["Quality Standing", satRate >= 90 ? "Exceeded Target" : (satRate >= 75 ? "Satisfactory" : "Needs Action")]),
    "",
    row(["Five-Point Likert Rating Distribution", "Count", "Percentage"]),
  ];

  const labels = {
    5: "5 Stars (Outstanding)",
    4: "4 Stars (Very Satisfactory)",
    3: "3 Stars (Satisfactory)",
    2: "2 Stars (Unsatisfactory)",
    1: "1 Star (Poor)",
  };

  for (const star of [5, 4, 3, 2, 1]) {
    const count = fb.ratingBreakdown?.[star] ?? 0;
    const pct = feedbackTotal > 0 ? `${Math.round((count / feedbackTotal) * 100)}%` : "0%";
    lines.push(row([labels[star], count, pct]));
  }

  if (Array.isArray(fb.topAspects) && fb.topAspects.length > 0) {
    lines.push("");
    lines.push(row(["Service Quality Dimension (SQD)", "Recorded Positive %", "Statutory Benchmark"]));
    for (const aspect of fb.topAspects) {
      lines.push(row([aspect.label || aspect.tag, `${aspect.percentage ?? 0}%`, "≥ 90.0%"]));
    }
  }

  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.href = url;
  link.download = finalFileName;
  link.click();
  URL.revokeObjectURL(url);

  onLogAction?.({
    action: "Export CSV",
    details: `exported dedicated Client Satisfaction Measurement (CSM) ratings dataset (${finalFileName}) to local CSV storage volume`,
    entityType: "Report",
  });
};

/**
 * Exports comprehensive combined SLA and CSM dataset to CSV
 */
export const downloadComprehensiveSlaCsv = (data, total, completionRate, onLogAction, fileName) => {
  if (!data) return;

  const finalFileName = fileName || generateExportFilename("SLA-CSM-COMBINED", "REPORT", "csv");
  const q = (cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`;
  const row = (cells) => cells.map(q).join(",");

  const lines = [
    row(["Comprehensive Service Level Agreement & Client Satisfaction Analytics", ""]),
    row(["Generated (Local)", formatPHDateTime(new Date().toISOString())]),
    "",
    row(["Section I: Operational SLA Metrics", "Value"]),
    row(["Total Inflow Requests", total ?? 0]),
    row(["Overall Completion Rate", `${completionRate ?? 0}%`]),
    row(["On-Time Fulfillments", data?.sla?.compliantCompleted ?? 0]),
    row(["Active Overdue Watchlist", data?.sla?.activeOverdue ?? 0]),
    "",
    row(["Status Distribution", "Count"]),
  ];

  for (const [st, val] of Object.entries(data.statusCounts || {})) {
    if (val > 0) lines.push(row([st, val ?? 0]));
  }

  lines.push("");
  lines.push(row(["Top Requested Academic Credentials", "Count"]));
  for (const dt of data.topDocTypes || []) {
    lines.push(row([dt?.name || "Unspecified Document", dt?.count ?? 0]));
  }

  if (data?.feedback) {
    lines.push("");
    lines.push(row(["Section II: Client Satisfaction Measurement (CSM)", "Value"]));
    lines.push(row(["Mean Satisfaction Score", `${data.feedback.averageRating ?? 0} / 5.0`]));
    lines.push(row(["Positive Sentiment Rate", `${data.feedback.satisfactionRate ?? 0}%`]));
    lines.push(row(["Total Evaluations Recorded", data.feedback.totalResponses ?? 0]));
    lines.push("");
    lines.push(row(["Star Rating Breakdown", "Count"]));
    for (const star of [5, 4, 3, 2, 1]) {
      lines.push(row([`${star} Star`, data.feedback.ratingBreakdown?.[star] ?? 0]));
    }
  }

  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.href = url;
  link.download = finalFileName;
  link.click();
  URL.revokeObjectURL(url);

  onLogAction?.({
    action: "Export CSV",
    details: `exported comprehensive SLA and CSM dataset (${finalFileName}) to local CSV storage volume`,
    entityType: "Report",
  });
};

/**
 * Backward compatibility alias for downloadSlaCsv
 */
export const downloadSlaCsv = (data, total, completionRate, onLogAction, fileName) => {
  return downloadComprehensiveSlaCsv(data, total, completionRate, onLogAction, fileName);
};

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
        org.category || "N/A",
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

