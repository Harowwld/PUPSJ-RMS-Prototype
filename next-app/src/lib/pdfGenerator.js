import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import { formatPHDateTime } from "./timeFormat"

/**
 * Helper to convert a source image to a PNG data URL (preserves transparency in jsPDF better than WebP)
 */
const getLogoAsPng = () => {
  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = "Anonymous"
    img.onload = () => {
      const canvas = document.createElement("canvas")
      canvas.width = img.width
      canvas.height = img.height
      const ctx = canvas.getContext("2d")
      ctx.drawImage(img, 0, 0)
      resolve(canvas.toDataURL("image/png"))
    }
    img.onerror = () => resolve("/assets/pup-logo.webp") // Fallback
    img.src = "/assets/pup-logo.webp"
  })
}

/**
 * Generates a standardized PUP RMS report header (Master Layout)
 * @param {jsPDF} doc - The jsPDF instance
 * @param {string} reportTitle - The main report title
 * @param {Object} options - Metadata like documentId, logoData (Base64 PNG)
 */
export const addPUPReportHeader = (doc, reportTitle, options = {}) => {
  const pageWidth = doc.internal.pageSize.getWidth()
  const { documentId = `PUP-RKS-${Date.now()}`, charSpace = 2, logoData } = options

  // 1. Centered Logo (Using provided Base64 PNG data if available)
  try {
    if (logoData) {
      doc.addImage(logoData, "PNG", pageWidth / 2 - 30, 30, 60, 60, undefined, 'FAST')
    } else {
      // Fallback if logo loading fails
      doc.addImage("/assets/pup-logo.webp", "WEBP", pageWidth / 2 - 30, 30, 60, 60, undefined, 'FAST')
    }
  } catch (e) {
    console.error("Logo failed to load", e)
  }

  // 2. University Name (Maroon, Centered)
  doc.setTextColor(122, 30, 40)
  doc.setFontSize(16)
  doc.setFont("helvetica", "bold")
  doc.text("Polytechnic University of the Philippines - San Juan City Campus", pageWidth / 2, 105, { align: "center" })

  // 3. Office Name (Gray, Centered, tracking-widest style)
  doc.setTextColor(150, 150, 150)
  doc.setFontSize(9)
  doc.text("ADMISSION AND REGISTRATION OFFICE", pageWidth / 2, 120, { align: "center", charSpace })

  // 4. Report Title (Black, Centered)
  doc.setTextColor(0, 0, 0)
  doc.setFontSize(14)
  doc.text(reportTitle, pageWidth / 2, 150, { align: "center" })

  // 5. Document ID (Italic, Gray, Centered)
  doc.setTextColor(100, 100, 100)
  doc.setFontSize(9)
  doc.setFont("helvetica", "italic")
  doc.text(`Document ID: ${documentId}`, pageWidth / 2, 165, { align: "center" })

  // 6. Master Divider Line (Maroon)
  doc.setDrawColor(122, 30, 40)
  doc.setLineWidth(2)
  doc.line(40, 185, pageWidth - 40, 185)
}

/**
 * Common Signature Section
 */
const addSignatures = (doc, startY) => {
  const pageWidth = doc.internal.pageSize.getWidth()
  doc.setFontSize(9)
  doc.setTextColor(150, 150, 150)
  doc.setFont("helvetica", "bold")

  doc.text("PREPARED BY", 40, startY)
  doc.text("CHECKED BY", pageWidth / 2, startY)

  doc.setDrawColor(0, 0, 0)
  doc.setLineWidth(1)

  doc.line(40, startY + 40, 200, startY + 40)
  doc.line(pageWidth / 2, startY + 40, pageWidth / 2 + 160, startY + 40)

  doc.setTextColor(0, 0, 0)
  doc.text("ADMINISTRATIVE STAFF", 40, startY + 52)
  doc.text("CAMPUS REGISTRAR", pageWidth / 2, startY + 52)

  doc.setTextColor(150, 150, 150)
  doc.text("NOTED BY", 40, startY + 100)
  doc.line(40, startY + 140, 200, startY + 140)
  doc.setTextColor(0, 0, 0)
  doc.text("CAMPUS DIRECTOR", 40, startY + 152)
}

/**
 * Generates an Audit Logs PDF Report
 */
export const generateAuditLogsPdf = async (logs, options = {}) => {
  const doc = new jsPDF("l", "pt", "a4")
  const logoData = await getLogoAsPng()
  
  const docId = `PUP-RKS-LOG-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`
  addPUPReportHeader(doc, "Audit Logs Summary Report", { documentId: docId, logoData })

  let y = 215
  doc.setFont("helvetica", "bold")
  doc.setFontSize(9)
  doc.setTextColor(150, 150, 150)
  doc.text("GENERATED ON:", 40, y)
  doc.setTextColor(0, 0, 0)
  doc.text(formatPHDateTime(new Date().toISOString()), 130, y)
  
  y += 15
  doc.setTextColor(150, 150, 150)
  doc.text("FILTER CRITERIA:", 40, y)
  doc.setTextColor(0, 0, 0)
  const filterParts = []
  if (options.scope) filterParts.push(`Scope: ${options.scope}`)
  if (options.role) filterParts.push(`Role: ${options.role}`)
  if (options.severity) filterParts.push(`Severity: ${options.severity}`)
  filterParts.push(`Range: ${options.startDate || "Any"} to ${options.endDate || "Any"}`)
  filterParts.push(`Search: ${options.search || "None"}`)
  const filterText = filterParts.join(" | ")
  doc.text(filterText, 130, y)

  const hasScope = logs.some((l) => l.officeName || l.scope || l.office_id)
  const head = hasScope
    ? [["Timestamp", "Severity", "Actor", "Role", "Scope", "Action", "Details"]]
    : [["Timestamp", "Severity", "Actor", "Role", "Action", "Details"]]

  const tableData = logs.map((log) => {
    const base = [
      formatPHDateTime(log.created_at || log.time),
      log.severity || "INFO",
      log.actor || log.user,
      log.role,
    ]
    if (hasScope) {
      base.push(log.officeName || log.scope || (log.office_id ? "Office" : "Global"))
    }
    base.push(log.action)
    base.push(log.details || "—")
    return base
  })

  autoTable(doc, {
    startY: y + 25,
    head: head,
    body: tableData,
    theme: "striped",
    headStyles: { fillColor: [122, 30, 40] },
    styles: { fontSize: 8, cellPadding: 4 },
    columnStyles: hasScope
      ? {
          0: { cellWidth: 85 },
          1: { cellWidth: 55 },
          2: { cellWidth: 85 },
          3: { cellWidth: 65 },
          4: { cellWidth: 75 },
          5: { cellWidth: 85 },
          6: { cellWidth: "auto" },
        }
      : {
          0: { cellWidth: 90 },
          1: { cellWidth: 60 },
          2: { cellWidth: 100 },
          3: { cellWidth: 70 },
          4: { cellWidth: 100 },
          5: { cellWidth: "auto" },
        },
  })

  return doc.output("blob")
}

/**
 * Generates a Digitization Compliance PDF Report
 */
export const generateDigitizationCompliancePdf = async (data, summary, meta, byCourse) => {
  const doc = new jsPDF("p", "pt", "a4")
  const logoData = await getLogoAsPng()
  
  const docId = `PUP-RKS-ANL-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`
  addPUPReportHeader(doc, "Digitization Compliance Report", { documentId: docId, logoData })

  let y = 215
  doc.setFont("helvetica", "bold")
  doc.setFontSize(9)
  doc.setTextColor(150, 150, 150)
  doc.text("DATE", 40, y)
  doc.setTextColor(0, 0, 0)
  doc.text(formatPHDateTime(new Date().toISOString()), 40, y + 12)
  
  y += 40
  doc.setFontSize(12)
  doc.setFont("helvetica", "bold")
  doc.setTextColor(122, 30, 40) // PUP Maroon
  doc.text("I. Executive Summary", 40, y)
  doc.setLineWidth(1.5)
  doc.setDrawColor(122, 30, 40)
  doc.line(40, y + 5, doc.internal.pageSize.getWidth() - 40, y + 5)
  
  y += 30
  doc.setFontSize(10)
  doc.setFont("helvetica", "normal")
  doc.setTextColor(60, 60, 60)
  const intro = "This document serves as the official compliance assessment regarding the digitization of student records at the Polytechnic University of the Philippines - San Juan City Campus. The analysis evaluates the current state of digital archives against institutional standards."
  const splitIntro = doc.splitTextToSize(intro, doc.internal.pageSize.getWidth() - 80)
  doc.text(splitIntro, 40, y)
  y += splitIntro.length * 14 + 10
  
  doc.setFont("helvetica", "bold")
  doc.setTextColor(80, 80, 80)
  doc.text("Student Population Distribution:", 40, y)
  y += 20
  if (data?.byYear) {
    data.byYear.forEach(yearData => {
      doc.setFont("helvetica", "bold")
      doc.setTextColor(122, 30, 40)
      doc.text(`Batch ${yearData.year}`, 60, y)
      doc.setFont("helvetica", "normal")
      doc.setTextColor(60, 60, 60)
      doc.text(`${yearData.count} Students`, doc.internal.pageSize.getWidth() - 60, y, { align: "right" })
      y += 15
    })
  }
  
  y += 15
  doc.setFont("helvetica", "normal")
  doc.setTextColor(60, 60, 60)
  const p2 = `The primary objective of this audit is to measure the completeness of the digital archives against the mandatory document set defined by university policy and accreditation requirements. The system currently requires ${meta?.definitions?.configuredDocTypes?.length || 0} unique document types per student record.`
  const splitP2 = doc.splitTextToSize(p2, doc.internal.pageSize.getWidth() - 80)
  doc.text(splitP2, 40, y)
  y += splitP2.length * 14 + 15

  const p3 = `Based on the comprehensive audit performed by the Records Keeping System (RKS), the total percentage of digitized records currently stands at ${summary?.percentDigitized}%. This represents a verified volume of ${summary?.totalDigitizedDocsCount?.toLocaleString()} digital files out of the ${summary?.totalExpectedDocsCount?.toLocaleString()} documents required for full compliance.`
  const splitP3 = doc.splitTextToSize(p3, doc.internal.pageSize.getWidth() - 80)
  doc.text(splitP3, 40, y)

  doc.addPage()
  y = 60
  doc.setFontSize(12)
  doc.setFont("helvetica", "bold")
  doc.setTextColor(122, 30, 40)
  doc.text("II. Program-Specific Breakdown", 40, y)
  doc.setLineWidth(1.5)
  doc.setDrawColor(122, 30, 40)
  doc.line(40, y + 5, doc.internal.pageSize.getWidth() - 40, y + 5)
  y += 25

  doc.setFontSize(10)
  doc.setFont("helvetica", "normal")
  doc.setTextColor(60, 60, 60)
  const programDesc = "The following table provides a detailed analysis of digitization progress categorized by Academic Program. This breakdown identifies areas of high performance and highlights programs that may require additional resources to meet compliance targets."
  const splitProgram = doc.splitTextToSize(programDesc, doc.internal.pageSize.getWidth() - 80)
  doc.text(splitProgram, 40, y)
  y += splitProgram.length * 14 + 10
  
  const tableData = byCourse.map((c) => [c.courseCode, c.total, c.digitized, `${c.percent}%`])
  autoTable(doc, {
    startY: y,
    head: [["Academic Program", "Enrolled", "Complete", "Avg. Progress"]],
    body: tableData,
    theme: "striped",
    headStyles: { fillColor: [122, 30, 40], textColor: [255, 255, 255], fontStyle: "bold" },
    styles: { fontSize: 10, cellPadding: 6 },
    columnStyles: {
      0: { fontStyle: "bold" },
      1: { halign: "center" },
      2: { halign: "center", textColor: [16, 185, 129], fontStyle: "bold" },
      3: { halign: "right", fontStyle: "bold", textColor: [122, 30, 40] }
    },
  })
  
  y = doc.lastAutoTable.finalY + 40
  doc.setFontSize(12)
  doc.setFont("helvetica", "bold")
  doc.setTextColor(122, 30, 40)
  doc.text("III. Certification Statement", 40, y)
  doc.setLineWidth(1.5)
  doc.setDrawColor(122, 30, 40)
  doc.line(40, y + 5, doc.internal.pageSize.getWidth() - 40, y + 5)
  y += 25
  doc.setFontSize(10)
  doc.setFont("helvetica", "normal")
  doc.setTextColor(60, 60, 60)
  const cert = "We hereby certify that the data presented in this report is an accurate representation of the digital archives maintained by the Polytechnic University of the Philippines - San Juan City Campus. The metrics have been generated through the Records Keeping System (RKS) audit engine, reflecting real-time synchronization with physical folders."
  const splitCert = doc.splitTextToSize(cert, doc.internal.pageSize.getWidth() - 80)
  doc.text(splitCert, 40, y)
  y += splitCert.length * 14 + 60
  addSignatures(doc, y)

  return doc.output("blob")
}

/**
 * Generates an OSAS Student Organization Compliance & Accreditation PDF Report
 */
export const generateOrganizationCompliancePdf = async (data, summary, meta, organizations, byCategory) => {
  const doc = new jsPDF("p", "pt", "a4")
  const logoData = await getLogoAsPng()

  const docId = `PUPSJ-OSAS-CMP-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`
  addPUPReportHeader(doc, "Student Organization Compliance Report", { documentId: docId, logoData })

  let y = 215
  doc.setFont("helvetica", "bold")
  doc.setFontSize(9)
  doc.setTextColor(150, 150, 150)
  doc.text("DATE GENERATED:", 40, y)
  doc.setTextColor(0, 0, 0)
  doc.text(formatPHDateTime(new Date().toISOString()), 150, y)

  y += 16
  doc.setTextColor(150, 150, 150)
  doc.text("OFFICE:", 40, y)
  doc.setTextColor(0, 0, 0)
  doc.text("Office of Student Affairs and Services (OSAS)", 150, y)

  y += 35
  doc.setFontSize(12)
  doc.setFont("helvetica", "bold")
  doc.setTextColor(122, 30, 40) // PUP Maroon
  doc.text("I. Executive Accreditation Summary", 40, y)
  doc.setLineWidth(1.5)
  doc.setDrawColor(122, 30, 40)
  doc.line(40, y + 5, doc.internal.pageSize.getWidth() - 40, y + 5)

  y += 25
  doc.setFontSize(10)
  doc.setFont("helvetica", "normal")
  doc.setTextColor(60, 60, 60)
  const intro = "This document presents the official compliance and accreditation assessment of recognized student organizations under the jurisdiction of the Office of Student Affairs and Services (OSAS) at the Polytechnic University of the Philippines - San Juan City Campus. Organizations are audited across institutional pillars: Constitution & By-Laws (CBL) archival, accredited officer roster, designated faculty adviser, and active accreditation standing."
  const splitIntro = doc.splitTextToSize(intro, doc.internal.pageSize.getWidth() - 80)
  doc.text(splitIntro, 40, y)
  y += splitIntro.length * 14 + 15

  // Key performance indicators
  doc.setFont("helvetica", "bold")
  doc.setTextColor(80, 80, 80)
  doc.text("Key Institutional Compliance Indicators:", 40, y)
  y += 18

  const kpis = [
    { label: "Total Recognized Organizations", val: `${summary?.totalOrganizations || 0} Organizations` },
    { label: "Overall Institutional Compliance Rate", val: `${summary?.overallComplianceRate || 0}%` },
    { label: "Fully Compliant Organizations", val: `${summary?.fullyCompliantCount || 0} (${summary?.fullyCompliantRate || 0}%)` },
    { label: "Constitution & By-Laws (CBL) Archival", val: `${summary?.cblArchivedCount || 0} of ${summary?.totalOrganizations || 0} (${summary?.cblArchivedRate || 0}%)` },
    { label: "Accredited Officer Leadership Roster", val: `${summary?.withOfficersCount || 0} Orgs (${summary?.totalActiveOfficers || 0} active leaders)` },
    { label: "Faculty Adviser Endorsements", val: `${summary?.withAdviserCount || 0} of ${summary?.totalOrganizations || 0} (${summary?.withAdviserRate || 0}%)` },
  ]

  kpis.forEach(item => {
    doc.setFont("helvetica", "bold")
    doc.setTextColor(122, 30, 40)
    doc.text(item.label, 50, y)
    doc.setFont("helvetica", "normal")
    doc.setTextColor(40, 40, 40)
    doc.text(item.val, doc.internal.pageSize.getWidth() - 50, y, { align: "right" })
    y += 16
  })

  y += 20
  doc.setFontSize(12)
  doc.setFont("helvetica", "bold")
  doc.setTextColor(122, 30, 40)
  doc.text("II. Category Performance Distribution", 40, y)
  doc.setLineWidth(1.5)
  doc.setDrawColor(122, 30, 40)
  doc.line(40, y + 5, doc.internal.pageSize.getWidth() - 40, y + 5)
  y += 20

  const catTableData = (byCategory || []).map((c) => [
    c.category,
    String(c.totalOrganizations),
    String(c.fullyCompliantCount),
    `${c.cblArchivedRate || 0}%`,
    `${c.withOfficersRate || 0}%`,
    `${c.complianceRate}%`,
  ])

  autoTable(doc, {
    startY: y,
    head: [["Category", "Total Orgs", "Fully Compliant", "CBL Archived", "Officers Whitelisted", "Compliance Rate"]],
    body: catTableData,
    theme: "striped",
    headStyles: { fillColor: [122, 30, 40], textColor: [255, 255, 255], fontStyle: "bold" },
    styles: { fontSize: 9, cellPadding: 5 },
    columnStyles: {
      0: { fontStyle: "bold" },
      1: { halign: "center" },
      2: { halign: "center" },
      3: { halign: "center" },
      4: { halign: "center" },
      5: { halign: "right", fontStyle: "bold", textColor: [122, 30, 40] },
    },
  })

  doc.addPage()
  y = 60
  doc.setFontSize(12)
  doc.setFont("helvetica", "bold")
  doc.setTextColor(122, 30, 40)
  doc.text("III. Detailed Organization Compliance Matrix", 40, y)
  doc.setLineWidth(1.5)
  doc.setDrawColor(122, 30, 40)
  doc.line(40, y + 5, doc.internal.pageSize.getWidth() - 40, y + 5)
  y += 20

  const orgTableData = (organizations || []).map((o) => [
    `${o.name} (${o.acronym || "—"})`,
    o.category,
    o.adviserName || "Pending",
    o.hasCbl ? "Archived" : "Pending",
    `${o.activeOfficerCount} Officers`,
    o.status,
    `${o.complianceScore}% (${o.complianceStatus})`,
  ])

  autoTable(doc, {
    startY: y,
    head: [["Organization", "Category", "Adviser", "CBL", "Officers", "Standing", "Compliance"]],
    body: orgTableData,
    theme: "striped",
    headStyles: { fillColor: [122, 30, 40], textColor: [255, 255, 255], fontStyle: "bold" },
    styles: { fontSize: 8.5, cellPadding: 4.5 },
    columnStyles: {
      0: { fontStyle: "bold" },
      3: { halign: "center" },
      4: { halign: "center" },
      5: { halign: "center" },
      6: { halign: "right", fontStyle: "bold", textColor: [122, 30, 40] },
    },
  })

  y = doc.lastAutoTable.finalY + 35
  if (y > 700) {
    doc.addPage()
    y = 60
  }

  doc.setFontSize(12)
  doc.setFont("helvetica", "bold")
  doc.setTextColor(122, 30, 40)
  doc.text("IV. Certification & Attestation", 40, y)
  doc.setLineWidth(1.5)
  doc.setDrawColor(122, 30, 40)
  doc.line(40, y + 5, doc.internal.pageSize.getWidth() - 40, y + 5)
  y += 20
  doc.setFontSize(9.5)
  doc.setFont("helvetica", "normal")
  doc.setTextColor(60, 60, 60)
  const cert = "This official accreditation audit has been prepared by the Office of Student Affairs and Services (OSAS). The compliance metrics documented herein represent active organizational records and official submissions validated by the PUPSJ Records Keeping System."
  const splitCert = doc.splitTextToSize(cert, doc.internal.pageSize.getWidth() - 80)
  doc.text(splitCert, 40, y)
  y += splitCert.length * 13 + 50
  addSignatures(doc, y)

  return doc.output("blob")
}

/**
 * Generates a SLA Analytics PDF Report
 */
export const generateSLAAnalyticsPdf = async (data, total, completionRate, options = {}) => {
  const doc = new jsPDF("p", "pt", "a4")
  const logoData = await getLogoAsPng()
  
  const docId = `PUP-RKS-SLA-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`
  addPUPReportHeader(doc, "Fulfillment SLA Analytics Report", { documentId: docId, logoData })

  let y = 215
  doc.setFont("helvetica", "bold")
  doc.setFontSize(9)
  doc.setTextColor(150, 150, 150)
  doc.text("GENERATED ON:", 40, y)
  doc.setTextColor(0, 0, 0)
  doc.text(formatPHDateTime(new Date().toISOString()), 130, y)

  const isFiltered = !!(options.startDate || options.endDate);
  
  y += 15
  doc.setTextColor(150, 150, 150)
  doc.text("REPORTING PERIOD:", 40, y)
  doc.setTextColor(0, 0, 0)
  const period = isFiltered 
    ? `${options.startDate || "Beginning"} to ${options.endDate || "Present"}`
    : "Cumulative / All available historical records";
  doc.text(period, 130, y)
  
  y += 40
  doc.setFontSize(12)
  doc.setFont("helvetica", "bold")
  doc.setTextColor(122, 30, 40) // PUP Maroon
  doc.text("I. Service Efficiency Summary", 40, y)
  doc.setLineWidth(1.5)
  doc.setDrawColor(122, 30, 40) // PUP Maroon
  doc.line(40, y + 5, doc.internal.pageSize.getWidth() - 40, y + 5)
  
  y += 30
  doc.setFontSize(10)
  doc.setFont("helvetica", "normal")
  doc.setTextColor(60, 60, 60)
  const dataScope = isFiltered 
    ? "during the specified reporting period" 
    : "aggregated from all available historical records";
  const intro = `This document details the registry's fulfillment efficiency across ${total} total documented requests ${dataScope}. The key performance indicator for public service operations is measured through our Service Level Agreement (SLA) fulfillment completion rate.`
  const splitIntro = doc.splitTextToSize(intro, doc.internal.pageSize.getWidth() - 80)
  doc.text(splitIntro, 40, y)
  y += splitIntro.length * 14 + 25
  
  doc.setDrawColor(230, 230, 230)
  doc.setFillColor(252, 252, 252)
  doc.roundedRect(40, y, (doc.internal.pageSize.getWidth() - 90) / 2, 80, 5, 5, "FD")
  doc.roundedRect(doc.internal.pageSize.getWidth() / 2 + 5, y, (doc.internal.pageSize.getWidth() - 90) / 2, 80, 5, 5, "FD")
  
  doc.setFontSize(9)
  doc.setFont("helvetica", "bold")
  doc.setTextColor(100, 100, 100)
  doc.text("TOTAL VOLUME (REQUESTS)", 50, y + 25)
  doc.text("FULFILLMENT COMPLETION", doc.internal.pageSize.getWidth() / 2 + 15, y + 25)
  
  doc.setFontSize(22)
  doc.setTextColor(122, 30, 40) // PUP Maroon
  doc.text(`${total.toLocaleString()}`, 50, y + 55)
  doc.setTextColor(16, 185, 129) // Emerald for completion
  doc.text(`${completionRate}%`, doc.internal.pageSize.getWidth() / 2 + 15, y + 55)
  
  y += 110
  doc.setFontSize(9)
  doc.setFont("helvetica", "italic")
  doc.setTextColor(100, 100, 100)
  const note = "Note: Continued tracking of these analytics will help properly balance human resources during peak enrollment periods. The data provides a historical baseline for public service efficiency and administrative accountability."
  const splitNote = doc.splitTextToSize(note, doc.internal.pageSize.getWidth() - 80)
  doc.text(splitNote, 40, y)

  doc.addPage()
  y = 60
  doc.setFontSize(12)
  doc.setFont("helvetica", "bold")
  doc.setTextColor(122, 30, 40) // PUP Maroon
  doc.text("II. Top Demand Analysis", 40, y)
  doc.setLineWidth(1.5)
  doc.setDrawColor(122, 30, 40)
  doc.line(40, y + 5, doc.internal.pageSize.getWidth() - 40, y + 5)
  y += 25
  
  doc.setFontSize(10)
  doc.setFont("helvetica", "normal")
  doc.setTextColor(60, 60, 60)
  const demandDesc = "The following table aggregates the most frequently requested documents, identifying the highest administrative priorities based on volume. This data is critical for prioritizing document template optimization."
  const splitDemand = doc.splitTextToSize(demandDesc, doc.internal.pageSize.getWidth() - 80)
  doc.text(splitDemand, 40, y)
  y += splitDemand.length * 14 + 10

  const topDemandData = (data?.topDocTypes || []).map((dt, i) => [`${i + 1}. ${dt.name}`, dt.count])
  autoTable(doc, {
    startY: y,
    head: [["Document Type", "Total Requests"]],
    body: topDemandData,
    theme: "striped",
    headStyles: { fillColor: [122, 30, 40], textColor: [255, 255, 255], fontStyle: "bold" },
    styles: { fontSize: 10, cellPadding: 6 },
    columnStyles: { 0: { fontStyle: "bold" }, 1: { halign: "right", fontStyle: "bold", textColor: [122, 30, 40] } },
  })
  
  y = doc.lastAutoTable.finalY + 60
  addSignatures(doc, y)

  return doc.output("blob")
}
