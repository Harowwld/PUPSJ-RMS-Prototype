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
  const filterText = `Role: ${options.role || "All"} | Severity: ${options.severity || "All"} | Range: ${options.startDate || "Any"} to ${options.endDate || "Any"} | Search: ${options.search || "None"}`
  doc.text(filterText, 130, y)

  const tableData = logs.map((log) => [
    formatPHDateTime(log.created_at),
    log.severity || "INFO",
    log.actor,
    log.role,
    log.action,
    log.details || "—",
  ])

  autoTable(doc, {
    startY: y + 25,
    head: [["Timestamp", "Severity", "Actor", "Role", "Action", "Details"]],
    body: tableData,
    theme: "striped",
    headStyles: { fillColor: [122, 30, 40] },
    styles: { fontSize: 8, cellPadding: 4 },
    columnStyles: {
      0: { cellWidth: 90 }, 1: { cellWidth: 60 }, 2: { cellWidth: 100 },
      3: { cellWidth: 70 }, 4: { cellWidth: 100 }, 5: { cellWidth: "auto" },
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
  doc.text("I. Executive Summary", 40, y)
  doc.setLineWidth(0.5)
  doc.setDrawColor(200, 200, 200)
  doc.line(40, y + 5, doc.internal.pageSize.getWidth() - 40, y + 5)
  
  y += 25
  doc.setFontSize(10)
  doc.setFont("helvetica", "normal")
  const intro = "This document serves as the official compliance assessment regarding the digitization of student records at the Polytechnic University of the Philippines - San Juan City Campus."
  const splitIntro = doc.splitTextToSize(intro, doc.internal.pageSize.getWidth() - 80)
  doc.text(splitIntro, 40, y)
  y += splitIntro.length * 14 + 10
  
  doc.setFont("helvetica", "bold")
  doc.text("Student Population Distribution:", 40, y)
  y += 20
  if (data?.byYear) {
    data.byYear.forEach(yearData => {
      doc.setFont("helvetica", "bold")
      doc.text(`Batch ${yearData.year}`, 60, y)
      doc.setFont("helvetica", "normal")
      doc.text(`${yearData.count} Students`, doc.internal.pageSize.getWidth() - 60, y, { align: "right" })
      y += 15
    })
  }
  
  y += 15
  doc.setFont("helvetica", "normal")
  const p2 = `The primary objective of this audit is to measure the completeness of the digital archives. The system requires ${meta?.definitions?.configuredDocTypes?.length || 0} unique document types per student.`
  const splitP2 = doc.splitTextToSize(p2, doc.internal.pageSize.getWidth() - 80)
  doc.text(splitP2, 40, y)
  y += splitP2.length * 14 + 10

  const p3 = `The total percentage of digitized records currently stands at ${summary?.percentDigitized}%. This represents a verified volume of ${summary?.totalDigitizedDocsCount?.toLocaleString()} digital files.`
  const splitP3 = doc.splitTextToSize(p3, doc.internal.pageSize.getWidth() - 80)
  doc.text(splitP3, 40, y)

  doc.addPage()
  y = 60
  doc.setFontSize(12)
  doc.setFont("helvetica", "bold")
  doc.text("II. Program-Specific Breakdown", 40, y)
  doc.line(40, y + 5, doc.internal.pageSize.getWidth() - 40, y + 5)
  y += 20
  
  const tableData = byCourse.map((c) => [c.courseCode, c.total, c.digitized, `${c.percent}%`])
  autoTable(doc, {
    startY: y,
    head: [["Academic Program", "Enrolled", "Complete", "Avg. Progress"]],
    body: tableData,
    theme: "striped",
    headStyles: { fillColor: [240, 240, 240], textColor: [100, 100, 100], fontStyle: "bold" },
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
  doc.text("III. Certification Statement", 40, y)
  doc.line(40, y + 5, doc.internal.pageSize.getWidth() - 40, y + 5)
  y += 20
  doc.setFontSize(10)
  doc.setFont("helvetica", "normal")
  const cert = "We hereby certify that the data presented in this report is an accurate representation of the digital archives maintained by the Polytechnic University of the Philippines - San Juan City Campus."
  const splitCert = doc.splitTextToSize(cert, doc.internal.pageSize.getWidth() - 80)
  doc.text(splitCert, 40, y)
  y += splitCert.length * 14 + 60
  addSignatures(doc, y)

  return doc.output("blob")
}

/**
 * Generates a SLA Analytics PDF Report
 */
export const generateSLAAnalyticsPdf = async (data, total, slaHours, completionRate) => {
  const doc = new jsPDF("p", "pt", "a4")
  const logoData = await getLogoAsPng()
  
  const docId = `PUP-RKS-SLA-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`
  addPUPReportHeader(doc, "Fulfillment SLA Analytics Report", { documentId: docId, logoData })

  let y = 215
  doc.setFont("helvetica", "bold")
  doc.setFontSize(9)
  doc.setTextColor(150, 150, 150)
  doc.text("DATE", 40, y)
  doc.setTextColor(0, 0, 0)
  doc.text(formatPHDateTime(new Date().toISOString()), 40, y + 12)
  
  y += 40
  doc.setFontSize(12)
  doc.text("I. Service Efficiency Summary", 40, y)
  doc.setLineWidth(0.5)
  doc.setDrawColor(200, 200, 200)
  doc.line(40, y + 5, doc.internal.pageSize.getWidth() - 40, y + 5)
  
  y += 25
  doc.setFontSize(10)
  doc.setFont("helvetica", "normal")
  const intro = `This document details the registry's fulfillment efficiency across ${total} total documented requests.`
  const splitIntro = doc.splitTextToSize(intro, doc.internal.pageSize.getWidth() - 80)
  doc.text(splitIntro, 40, y)
  y += splitIntro.length * 14 + 20
  
  doc.setDrawColor(200, 200, 200)
  doc.setFillColor(250, 250, 250)
  doc.roundedRect(40, y, (doc.internal.pageSize.getWidth() - 90) / 2, 70, 5, 5, "FD")
  doc.roundedRect(doc.internal.pageSize.getWidth() / 2 + 5, y, (doc.internal.pageSize.getWidth() - 90) / 2, 70, 5, 5, "FD")
  
  doc.setFontSize(9)
  doc.setFont("helvetica", "bold")
  doc.setTextColor(150, 150, 150)
  doc.text("AVERAGE TURNAROUND (SLA)", 50, y + 20)
  doc.text("FULFILLMENT COMPLETION", doc.internal.pageSize.getWidth() / 2 + 15, y + 20)
  
  doc.setFontSize(18)
  doc.setTextColor(0, 0, 0)
  doc.text(slaHours != null ? `${slaHours.toFixed(1)} hrs` : "N/A", 50, y + 45)
  doc.setTextColor(16, 185, 129)
  doc.text(`${completionRate}%`, doc.internal.pageSize.getWidth() / 2 + 15, y + 45)
  
  y += 100
  doc.setFontSize(9)
  doc.setFont("helvetica", "italic")
  const note = "Note: Continued tracking of these analytics will help properly balance human resources during peak enrollment periods."
  const splitNote = doc.splitTextToSize(note, doc.internal.pageSize.getWidth() - 80)
  doc.text(splitNote, 40, y)

  doc.addPage()
  y = 60
  doc.setFontSize(12)
  doc.setFont("helvetica", "bold")
  doc.text("II. Top Demand Analysis", 40, y)
  doc.line(40, y + 5, doc.internal.pageSize.getWidth() - 40, y + 5)
  y += 20
  
  const topDemandData = (data?.topDocTypes || []).map((dt, i) => [`${i + 1}. ${dt.name}`, dt.count])
  autoTable(doc, {
    startY: y,
    head: [["Document Type", "Total Requests"]],
    body: topDemandData,
    theme: "striped",
    headStyles: { fillColor: [240, 240, 240], textColor: [100, 100, 100], fontStyle: "bold" },
    styles: { fontSize: 10, cellPadding: 6 },
    columnStyles: { 0: { fontStyle: "bold" }, 1: { halign: "right", fontStyle: "bold", textColor: [122, 30, 40] } },
  })
  
  y = doc.lastAutoTable.finalY + 40
  doc.setFontSize(12)
  doc.setFont("helvetica", "bold")
  doc.text("III. Recent Historical Volume", 40, y)
  doc.line(40, y + 5, doc.internal.pageSize.getWidth() - 40, y + 5)
  y += 20
  
  const volumeData = (data?.volumeTrend || []).map((v) => [v.label, v.received, v.completed])
  autoTable(doc, {
    startY: y,
    head: [["Period", "Received", "Completed"]],
    body: volumeData,
    theme: "striped",
    headStyles: { fillColor: [240, 240, 240], textColor: [100, 100, 100], fontStyle: "bold" },
    styles: { fontSize: 10, cellPadding: 6 },
    columnStyles: { 0: { fontStyle: "bold" }, 1: { halign: "center" }, 2: { halign: "center", textColor: [16, 185, 129], fontStyle: "bold" } },
  })
  
  y = doc.lastAutoTable.finalY + 60
  addSignatures(doc, y)

  return doc.output("blob")
}
