import jsPDFRaw from "jspdf"
import autoTableRaw from "jspdf-autotable"
import { formatPHDateTime } from "./timeFormat.js"

const jsPDF = typeof jsPDFRaw === "function" ? jsPDFRaw : (jsPDFRaw?.jsPDF || jsPDFRaw?.default || jsPDFRaw)
const autoTable = typeof autoTableRaw === "function" ? autoTableRaw : (autoTableRaw?.default || autoTableRaw)

/**
 * Institutional Branding Defaults:
 * - Default Logo: PUP Logo (/assets/pup-logo.webp)
 * - Fallback Logo: Official Black eManage Logo (/assets/branding/black-icon.png)
 */
export const DEFAULT_BRANDING_LOGO = "/assets/pup-logo.webp"
export const OFFICIAL_FALLBACK_LOGO = "/assets/branding/black-icon.png"
const BRANDING_CACHE_KEY = "institution_branding_cache"

/**
 * Automatically derives a clean, uppercase document tracking prefix from the institution and campus names.
 * e.g. "Polytechnic University of the Philippines", "San Juan City Campus" -> "PUPSJ"
 *      "University of the Philippines", "Diliman" -> "UPD"
 */
export function deriveDocumentPrefix(institutionName = "", campusName = "") {
  const getInitials = (str) => {
    if (!str || typeof str !== "string") return ""
    const clean = str.replace(/[^a-zA-Z0-9\s]/g, " ")
    const words = clean.split(/\s+/).filter(Boolean)
    const stopWords = new Set(["of", "the", "and", "in", "at", "for", "ng", "mga", "city", "campus", "branch"])
    const significant = words.filter((w) => !stopWords.has(w.toLowerCase()))
    if (significant.length === 0) return words.map((w) => w[0]).join("").toUpperCase().slice(0, 4)
    return significant.map((w) => w[0]).join("").toUpperCase().slice(0, 5)
  }

  const instInitials = getInitials(institutionName) || "RMS"
  const campusInitials = getInitials(campusName)
  const combined = `${instInitials}${campusInitials}`.slice(0, 8)
  return combined || "RMS"
}

/**
 * Resolves active institutional branding from localStorage or API.
 * Guaranteed to return safe values even if completely offline.
 */
export async function getInstitutionalBranding() {
  if (typeof window !== "undefined") {
    try {
      const cached = localStorage.getItem(BRANDING_CACHE_KEY)
      if (cached) {
        const parsed = JSON.parse(cached)
        if (parsed && typeof parsed === "object" && parsed.institutionName) {
          if (!parsed.documentCodePrefix) {
            parsed.documentCodePrefix = deriveDocumentPrefix(parsed.institutionName, parsed.campusName)
          }
          return parsed
        }
      }
    } catch (e) {
      // ignore cache read failure
    }
  }

  if (typeof window !== "undefined") {
    try {
      const res = await fetch("/api/system/branding", { cache: "no-store" })
      if (res.ok) {
        const json = await res.json()
        if (json.ok && json.data) {
          if (!json.data.documentCodePrefix) {
            json.data.documentCodePrefix = deriveDocumentPrefix(json.data.institutionName, json.data.campusName)
          }
          try {
            localStorage.setItem(BRANDING_CACHE_KEY, JSON.stringify(json.data))
          } catch (e) {}
          return json.data
        }
      }
    } catch (e) {
      // Offline or network error - fallback gracefully
    }
  }

  const fallbackInst = "Polytechnic University of the Philippines"
  const fallbackCampus = "San Juan City Campus"

  return {
    institutionName: fallbackInst,
    campusName: fallbackCampus,
    tagline: "OFFICIAL ACADEMIC ARCHIVES & RECORDS",
    jurisdictionHeader: "Republic of the Philippines",
    documentCodePrefix: deriveDocumentPrefix(fallbackInst, fallbackCampus),
    brandColor: "#7A1E28",
    logoUrl: DEFAULT_BRANDING_LOGO,
    fallbackLogoUrl: OFFICIAL_FALLBACK_LOGO,
    logoBase64: null,
    secondaryLogoUrl: null,
    secondaryLogoBase64: null,
    signatoryRegistrarTitle: "",
    signatoryHeadTitle: "",
  }
}

/**
 * Helper to convert hex color to RGB array
 */
function hexToRgb(hex) {
  if (!hex || typeof hex !== "string") return [122, 30, 40]
  const clean = hex.replace("#", "").trim()
  if (clean.length === 3) {
    const r = parseInt(clean[0] + clean[0], 16)
    const g = parseInt(clean[1] + clean[1], 16)
    const b = parseInt(clean[2] + clean[2], 16)
    return [r, g, b]
  }
  if (clean.length === 6) {
    const r = parseInt(clean.substring(0, 2), 16)
    const g = parseInt(clean.substring(2, 4), 16)
    const b = parseInt(clean.substring(4, 6), 16)
    return [r, g, b]
  }
  return [122, 30, 40]
}

/**
 * Helper to convert a source image or base64 to a PNG data URL (preserves transparency in jsPDF).
 * Cascades: customSrc -> default PUP logo -> official eManage fallback logo.
 * If fallbackToDefault is false and customSrc is not provided, returns null.
 */
export const getLogoAsPng = async (customSrc = null, fallbackToDefault = true) => {
  if (!customSrc && !fallbackToDefault) {
    return null
  }

  if (customSrc && typeof customSrc === "string" && customSrc.startsWith("data:image/")) {
    return customSrc
  }

  if (typeof window === "undefined" || typeof Image === "undefined") {
    return fallbackToDefault ? "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==" : null
  }

  const primarySrc = customSrc || (fallbackToDefault ? DEFAULT_BRANDING_LOGO : null)
  if (!primarySrc) {
    return null
  }

  return new Promise((resolve) => {

    const tryLoad = (src, onFail) => {
      const img = new Image()
      img.crossOrigin = "Anonymous"
      img.onload = () => {
        try {
          const canvas = document.createElement("canvas")
          canvas.width = img.width || 192
          canvas.height = img.height || 192
          const ctx = canvas.getContext("2d")
          ctx.drawImage(img, 0, 0)
          resolve(canvas.toDataURL("image/png"))
        } catch (err) {
          onFail()
        }
      }
      img.onerror = () => onFail()
      img.src = src
    }

    tryLoad(primarySrc, () => {
      if (primarySrc !== DEFAULT_BRANDING_LOGO && fallbackToDefault) {
        tryLoad(DEFAULT_BRANDING_LOGO, () => {
          tryLoad(OFFICIAL_FALLBACK_LOGO, () => resolve(OFFICIAL_FALLBACK_LOGO))
        })
      } else {
        resolve(fallbackToDefault ? OFFICIAL_FALLBACK_LOGO : null)
      }
    })
  })
}

/**
 * Generates a standardized RMS report header (Master Layout)
 * Supports Single-Logo (Centered) and Dual-Logo (Split Left/Right) modes.
 * @param {jsPDF} doc - The jsPDF instance
 * @param {string} reportTitle - The main report title
 * @param {Object} options - Metadata like documentId, logoData (Base64 PNG), secondaryLogoData, institutionName, etc.
 */
export const addPUPReportHeader = (doc, reportTitle, options = {}) => {
  const pageWidth = doc.internal.pageSize.getWidth()
  const instName = options?.institutionName || "Polytechnic University of the Philippines"
  const campName = options?.campusName || "San Juan City Campus"
  const autoPrefix = deriveDocumentPrefix(instName, campName)
  const documentId = options?.documentId || `${autoPrefix}-${Date.now()}`
  const charSpace = options?.charSpace ?? 2
  const logoData = options?.logoData
  const secondaryLogoData = options?.secondaryLogoData
  const jurisdictionHeader = options?.jurisdictionHeader || "Republic of the Philippines"
  const officeName = options?.officeName || "ADMISSION AND REGISTRATION OFFICE"
  const brandColor = options?.brandColor || "#7A1E28"

  const [brandR, brandG, brandB] = hexToRgb(brandColor)

  if (secondaryLogoData) {
    // DUAL-LOGO SPLIT MASTHEAD (Philippine SUC / DepEd / Regulatory standard)
    const logoSize = 46
    const logoY = 18

    // 1. Left Primary Logo (aligned with left margin 40)
    try {
      if (logoData) {
        doc.addImage(logoData, "PNG", 40, logoY, logoSize, logoSize, undefined, "FAST")
      }
    } catch (e) {
      console.error("Primary logo failed to load", e)
    }

    // 2. Right Secondary Logo (aligned with right margin)
    try {
      doc.addImage(secondaryLogoData, "PNG", pageWidth - 40 - logoSize, logoY, logoSize, logoSize, undefined, "FAST")
    } catch (e) {
      console.error("Secondary logo failed to load", e)
    }

    // 3. Centered School Information (between Left and Right seals)
    let currentY = 24
    if (jurisdictionHeader && jurisdictionHeader.trim()) {
      doc.setTextColor(120, 120, 120)
      doc.setFontSize(7.5)
      doc.setFont("helvetica", "normal")
      doc.text(jurisdictionHeader.trim(), pageWidth / 2, currentY, { align: "center", charSpace: 1.2 })
      currentY += 13
    } else {
      currentY = 28
    }

    // School Name
    doc.setTextColor(brandR, brandG, brandB)
    doc.setFontSize(13.5)
    doc.setFont("helvetica", "bold")
    doc.text(instName, pageWidth / 2, currentY, { align: "center" })

    // Campus (if provided)
    if (campName && campName.trim()) {
      currentY += 12
      doc.setFontSize(9.5)
      doc.setFont("helvetica", "bold")
      doc.setTextColor(100, 100, 100)
      doc.text(campName.trim(), pageWidth / 2, currentY, { align: "center" })
    }

    // Office Subheader
    currentY += 13
    doc.setTextColor(130, 130, 130)
    doc.setFontSize(8)
    doc.setFont("helvetica", "bold")
    doc.text(officeName, pageWidth / 2, currentY, { align: "center", charSpace })

    // 4. Report Title
    currentY = Math.max(currentY + 22, logoY + logoSize + 20)
    doc.setTextColor(0, 0, 0)
    doc.setFontSize(13.5)
    doc.setFont("helvetica", "bold")
    doc.text(reportTitle || "Report", pageWidth / 2, currentY, { align: "center" })

    // 5. Document ID
    currentY += 14
    doc.setTextColor(110, 110, 110)
    doc.setFontSize(8.5)
    doc.setFont("helvetica", "italic")
    doc.text(`Document ID: ${documentId}`, pageWidth / 2, currentY, { align: "center" })

    // 6. Master Divider Line
    currentY += 15
    doc.setDrawColor(brandR, brandG, brandB)
    doc.setLineWidth(1.8)
    doc.line(40, currentY, pageWidth - 40, currentY)
  } else {
    // SINGLE-LOGO CENTERED MASTHEAD (Original Standard)
    try {
      if (logoData) {
        doc.addImage(logoData, "PNG", pageWidth / 2 - 24, 18, 48, 48, undefined, 'FAST')
      }
    } catch (e) {
      console.error("Logo failed to load", e)
    }

    let currentY = 78
    if (jurisdictionHeader && jurisdictionHeader.trim()) {
      doc.setTextColor(120, 120, 120)
      doc.setFontSize(8)
      doc.setFont("helvetica", "normal")
      doc.text(jurisdictionHeader.trim(), pageWidth / 2, currentY, { align: "center", charSpace: 1.5 })
      currentY += 15
    } else {
      currentY = 82
    }

    doc.setTextColor(brandR, brandG, brandB)
    doc.setFontSize(14.5)
    doc.setFont("helvetica", "bold")
    const fullTitle = campName
      ? `${instName} · ${campName}`
      : instName
    doc.text(fullTitle, pageWidth / 2, currentY, { align: "center" })

    currentY += 16
    doc.setTextColor(130, 130, 130)
    doc.setFontSize(8.5)
    doc.setFont("helvetica", "bold")
    doc.text(officeName, pageWidth / 2, currentY, { align: "center", charSpace })

    currentY += 28
    doc.setTextColor(0, 0, 0)
    doc.setFontSize(13.5)
    doc.setFont("helvetica", "bold")
    doc.text(reportTitle || "Report", pageWidth / 2, currentY, { align: "center" })

    currentY += 15
    doc.setTextColor(110, 110, 110)
    doc.setFontSize(8.5)
    doc.setFont("helvetica", "italic")
    doc.text(`Document ID: ${documentId}`, pageWidth / 2, currentY, { align: "center" })

    currentY += 15
    doc.setDrawColor(brandR, brandG, brandB)
    doc.setLineWidth(1.8)
    doc.line(40, currentY, pageWidth - 40, currentY)
  }
}

/**
 * Common Signature Section
 * Supports dynamic signatory titles with intelligent auto-fallbacks.
 */
const addSignatures = (doc, startY, options = {}) => {
  const pageWidth = doc.internal.pageSize.getWidth()
  const hasCampus = !!options.campusName
  const staffTitle = options.staffTitle || "ADMINISTRATIVE STAFF"
  const registrarTitle =
    options.signatoryRegistrarTitle ||
    options.registrarTitle ||
    (hasCampus ? "CAMPUS REGISTRAR" : "REGISTRAR")
  const headTitle =
    options.signatoryHeadTitle ||
    options.headTitle ||
    (hasCampus ? "CAMPUS DIRECTOR" : "HEAD OF INSTITUTION")

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
  doc.text(staffTitle, 40, startY + 52)
  doc.text(registrarTitle, pageWidth / 2, startY + 52)

  doc.setTextColor(150, 150, 150)
  doc.text("NOTED BY", 40, startY + 100)
  doc.line(40, startY + 140, 200, startY + 140)
  doc.setTextColor(0, 0, 0)
  doc.text(headTitle, 40, startY + 152)
}

/**
 * Generates an Audit Logs PDF Report
 */
export const generateAuditLogsPdf = async (logs = [], options = {}) => {
  const doc = new jsPDF("l", "pt", "a4")
  const branding = options.branding || await getInstitutionalBranding()
  const logoData = await getLogoAsPng(branding?.logoBase64 || branding?.logoUrl)
  const secondaryLogoSrc = branding?.secondaryLogoBase64 || branding?.secondaryLogoUrl
  const secondaryLogoData = secondaryLogoSrc ? await getLogoAsPng(secondaryLogoSrc, false) : null
  const instName = branding?.institutionName || "Polytechnic University of the Philippines"
  const campName = branding?.campusName || "San Juan City Campus"
  const prefix = deriveDocumentPrefix(instName, campName)
  const [brandR, brandG, brandB] = hexToRgb(branding?.brandColor || "#7A1E28")
  
  const docId = `${prefix}-LOG-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`
  addPUPReportHeader(doc, "Audit Logs Summary Report", {
    documentId: docId,
    logoData,
    secondaryLogoData,
    jurisdictionHeader: branding?.jurisdictionHeader,
    institutionName: instName,
    campusName: campName,
    brandColor: branding?.brandColor,
    officeName: branding?.tagline || "OFFICIAL ACADEMIC ARCHIVES & RECORDS",
  })

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

  const logList = Array.isArray(logs) ? logs : []
  const hasScope = logList.some((l) => l && (l.officeName || l.office_name || l.scope || l.office_id))
  const head = hasScope
    ? [["Timestamp", "Severity", "Actor", "Role", "Scope", "Action", "Details"]]
    : [["Timestamp", "Severity", "Actor", "Role", "Action", "Details"]]

  const tableData = logList.map((log) => {
    const timeVal = log?.created_at || log?.time || log?.timestamp || new Date().toISOString()
    const base = [
      formatPHDateTime(timeVal),
      log?.severity || "INFO",
      log?.actor || log?.user || log?.actor_name || "System",
      log?.role || "Staff",
    ]
    if (hasScope) {
      base.push(log?.officeName || log?.office_name || log?.scope || (log?.office_id ? "Office" : "Global"))
    }
    base.push(log?.action || "Activity")
    base.push(log?.details || "—")
    return base
  })

  autoTable(doc, {
    startY: y + 25,
    head: head,
    body: tableData,
    theme: "striped",
    headStyles: { fillColor: [brandR, brandG, brandB], textColor: [255, 255, 255], fontStyle: "bold" },
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
  const branding = meta?.branding || await getInstitutionalBranding()
  const logoData = await getLogoAsPng(branding?.logoBase64 || branding?.logoUrl)
  const secondaryLogoSrc = branding?.secondaryLogoBase64 || branding?.secondaryLogoUrl
  const secondaryLogoData = secondaryLogoSrc ? await getLogoAsPng(secondaryLogoSrc, false) : null
  const instName = branding?.institutionName || "Polytechnic University of the Philippines"
  const campName = branding?.campusName || "San Juan City Campus"
  const prefix = deriveDocumentPrefix(instName, campName)
  const [brandR, brandG, brandB] = hexToRgb(branding?.brandColor || "#7A1E28")
  const institutionFull = campName ? `${instName} - ${campName}` : instName
  
  const docId = `${prefix}-ANL-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`
  addPUPReportHeader(doc, "Digitization Compliance Report", {
    documentId: docId,
    logoData,
    secondaryLogoData,
    jurisdictionHeader: branding?.jurisdictionHeader,
    institutionName: instName,
    campusName: campName,
    brandColor: branding?.brandColor,
    officeName: branding?.tagline || "OFFICIAL ACADEMIC ARCHIVES & RECORDS",
  })

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
  doc.setTextColor(brandR, brandG, brandB)
  doc.text("I. Executive Summary", 40, y)
  doc.setLineWidth(1.5)
  doc.setDrawColor(brandR, brandG, brandB)
  doc.line(40, y + 5, doc.internal.pageSize.getWidth() - 40, y + 5)
  
  y += 30
  doc.setFontSize(10)
  doc.setFont("helvetica", "normal")
  doc.setTextColor(60, 60, 60)
  const intro = `This document serves as the official compliance assessment regarding the digitization of student records at ${institutionFull}. The analysis evaluates the current state of digital archives against institutional standards.`
  const splitIntro = doc.splitTextToSize(intro, doc.internal.pageSize.getWidth() - 80)
  doc.text(splitIntro, 40, y)
  y += splitIntro.length * 14 + 10
  
  doc.setFont("helvetica", "bold")
  doc.setTextColor(80, 80, 80)
  doc.text("Student Population Distribution:", 40, y)
  y += 20
  if (data?.byYear && Array.isArray(data.byYear)) {
    data.byYear.forEach(yearData => {
      doc.setFont("helvetica", "bold")
      doc.setTextColor(brandR, brandG, brandB)
      doc.text(`Batch ${yearData?.year || "—"}`, 60, y)
      doc.setFont("helvetica", "normal")
      doc.setTextColor(60, 60, 60)
      doc.text(`${(yearData?.count ?? 0).toLocaleString()} Students`, doc.internal.pageSize.getWidth() - 60, y, { align: "right" })
      y += 15
    })
  }
  
  y += 15
  doc.setFont("helvetica", "normal")
  doc.setTextColor(60, 60, 60)
  const reqDocCount = meta?.definitions?.configuredDocTypes?.length ?? 0
  const p2 = `The primary objective of this audit is to measure the completeness of the digital archives against the mandatory document set defined by university policy and accreditation requirements. The system currently requires ${reqDocCount} unique document types per student record.`
  const splitP2 = doc.splitTextToSize(p2, doc.internal.pageSize.getWidth() - 80)
  doc.text(splitP2, 40, y)
  y += splitP2.length * 14 + 15

  const percentDig = summary?.percentDigitized ?? 0
  const totalDigDocs = (summary?.totalDigitizedDocsCount ?? 0).toLocaleString()
  const totalExpDocs = (summary?.totalExpectedDocsCount ?? 0).toLocaleString()
  const p3 = `Based on the comprehensive audit performed by the ${prefix} Records Keeping System, the total percentage of digitized records currently stands at ${percentDig}%. This represents a verified volume of ${totalDigDocs} digital files out of the ${totalExpDocs} documents required for full compliance.`
  const splitP3 = doc.splitTextToSize(p3, doc.internal.pageSize.getWidth() - 80)
  doc.text(splitP3, 40, y)

  doc.addPage()
  y = 60
  doc.setFontSize(12)
  doc.setFont("helvetica", "bold")
  doc.setTextColor(brandR, brandG, brandB)
  doc.text("II. Program-Specific Breakdown", 40, y)
  doc.setLineWidth(1.5)
  doc.setDrawColor(brandR, brandG, brandB)
  doc.line(40, y + 5, doc.internal.pageSize.getWidth() - 40, y + 5)
  y += 25

  doc.setFontSize(10)
  doc.setFont("helvetica", "normal")
  doc.setTextColor(60, 60, 60)
  const programDesc = "The following table provides a detailed analysis of digitization progress categorized by Academic Program. This breakdown identifies areas of high performance and highlights programs that may require additional resources to meet compliance targets."
  const splitProgram = doc.splitTextToSize(programDesc, doc.internal.pageSize.getWidth() - 80)
  doc.text(splitProgram, 40, y)
  y += splitProgram.length * 14 + 10
  
  const courseList = Array.isArray(byCourse) ? byCourse : []
  const tableData = courseList.map((c) => [
    c?.courseCode || "—",
    c?.total ?? 0,
    c?.digitized ?? 0,
    `${c?.percent ?? 0}%`
  ])
  autoTable(doc, {
    startY: y,
    head: [["Academic Program", "Enrolled", "Complete", "Avg. Progress"]],
    body: tableData,
    theme: "striped",
    headStyles: { fillColor: [brandR, brandG, brandB], textColor: [255, 255, 255], fontStyle: "bold" },
    styles: { fontSize: 10, cellPadding: 6 },
    columnStyles: {
      0: { fontStyle: "bold" },
      1: { halign: "center" },
      2: { halign: "center", textColor: [16, 185, 129], fontStyle: "bold" },
      3: { halign: "right", fontStyle: "bold", textColor: [brandR, brandG, brandB] }
    },
  })
  
  y = doc.lastAutoTable.finalY + 40
  doc.setFontSize(12)
  doc.setFont("helvetica", "bold")
  doc.setTextColor(brandR, brandG, brandB)
  doc.text("III. Certification Statement", 40, y)
  doc.setLineWidth(1.5)
  doc.setDrawColor(brandR, brandG, brandB)
  doc.line(40, y + 5, doc.internal.pageSize.getWidth() - 40, y + 5)
  y += 25
  doc.setFontSize(10)
  doc.setFont("helvetica", "normal")
  doc.setTextColor(60, 60, 60)
  const cert = `We hereby certify that the data presented in this report is an accurate representation of the digital archives maintained by ${institutionFull}. The metrics have been generated through the ${prefix} Records Keeping System audit engine, reflecting real-time synchronization with physical folders.`
  const splitCert = doc.splitTextToSize(cert, doc.internal.pageSize.getWidth() - 80)
  doc.text(splitCert, 40, y)
  y += splitCert.length * 14 + 60
  addSignatures(doc, y, {
    campusName: campName,
    signatoryRegistrarTitle: branding?.signatoryRegistrarTitle,
    signatoryHeadTitle: branding?.signatoryHeadTitle,
  })

  return doc.output("blob")
}

/**
 * Generates an OSAS Student Organization Compliance & Accreditation PDF Report
 */
export const generateOrganizationCompliancePdf = async (data, summary, meta, organizations, byCategory, options = {}) => {
  const doc = new jsPDF("p", "pt", "a4")
  const branding = meta?.branding || await getInstitutionalBranding()
  const logoData = await getLogoAsPng(branding?.logoBase64 || branding?.logoUrl)
  const secondaryLogoSrc = branding?.secondaryLogoBase64 || branding?.secondaryLogoUrl
  const secondaryLogoData = secondaryLogoSrc ? await getLogoAsPng(secondaryLogoSrc, false) : null
  const instName = branding?.institutionName || "Polytechnic University of the Philippines"
  const campName = branding?.campusName || "San Juan City Campus"
  const prefix = deriveDocumentPrefix(instName, campName)
  const [brandR, brandG, brandB] = hexToRgb(branding?.brandColor || "#7A1E28")

  const docId = `${prefix}-CMP-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`
  addPUPReportHeader(doc, "Student Organization Compliance Report", {
    documentId: docId,
    logoData,
    secondaryLogoData,
    jurisdictionHeader: branding?.jurisdictionHeader,
    institutionName: instName,
    campusName: campName,
    brandColor: branding?.brandColor,
    officeName: "OFFICE OF STUDENT AFFAIRS AND SERVICES",
  })

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

  if (options?.scopeNote) {
    y += 16
    doc.setTextColor(150, 150, 150)
    doc.text("REPORT SCOPE:", 40, y)
    doc.setTextColor(brandR, brandG, brandB)
    doc.text(options.scopeNote, 150, y)
  }

  y += 35
  doc.setFontSize(12)
  doc.setFont("helvetica", "bold")
  doc.setTextColor(brandR, brandG, brandB)
  doc.text("I. Executive Accreditation Summary", 40, y)
  doc.setLineWidth(1.5)
  doc.setDrawColor(brandR, brandG, brandB)
  doc.line(40, y + 5, doc.internal.pageSize.getWidth() - 40, y + 5)

  y += 25
  doc.setFontSize(10)
  doc.setFont("helvetica", "normal")
  doc.setTextColor(60, 60, 60)
  const institutionFull = campName ? `${instName} - ${campName}` : instName
  const intro = `This document presents the official compliance and accreditation assessment of recognized student organizations under the jurisdiction of the Office of Student Affairs and Services (OSAS) at ${institutionFull}. Organizations are audited across institutional pillars: Constitution & By-Laws (CBL) archival, accredited officer roster, designated faculty adviser, and active accreditation standing.`
  const splitIntro = doc.splitTextToSize(intro, doc.internal.pageSize.getWidth() - 80)
  doc.text(splitIntro, 40, y)
  y += splitIntro.length * 14 + 15

  // Key performance indicators
  doc.setFont("helvetica", "bold")
  doc.setTextColor(80, 80, 80)
  doc.text("Key Institutional Compliance Indicators:", 40, y)
  y += 18

  const orgList = Array.isArray(organizations) ? organizations : []
  const totalOrgs = summary?.totalOrganizations ?? orgList.length ?? 0
  const fullyCompliant = summary?.fullyCompliantCount ?? 0
  const fullyCompliantRate = summary?.fullyCompliantRate ?? (totalOrgs > 0 ? Math.round((fullyCompliant / totalOrgs) * 100) : 0)
  const cblArchived = summary?.cblArchivedCount ?? 0
  const cblRate = summary?.cblArchivedRate ?? (totalOrgs > 0 ? Math.round((cblArchived / totalOrgs) * 100) : 0)
  const withOfficers = summary?.withOfficersCount ?? 0
  const totalOfficers = summary?.totalActiveOfficers ?? 0
  const withAdvisers = summary?.withAdviserCount ?? summary?.withAdvisersCount ?? 0
  const withAdviserRate = summary?.withAdviserRate ?? (totalOrgs > 0 ? Math.round((withAdvisers / totalOrgs) * 100) : 0)
  const overallRate = summary?.overallComplianceRate ?? (totalOrgs > 0 ? Math.round((fullyCompliant / totalOrgs) * 100) : 0)

  const kpis = [
    { label: "Total Recognized Organizations", val: `${totalOrgs} Organizations` },
    { label: "Overall Institutional Compliance Rate", val: `${overallRate}%` },
    { label: "Fully Compliant Organizations", val: `${fullyCompliant} (${fullyCompliantRate}%)` },
    { label: "Constitution & By-Laws (CBL) Archival", val: `${cblArchived} of ${totalOrgs} (${cblRate}%)` },
    { label: "Accredited Officer Leadership Roster", val: `${withOfficers} Orgs (${totalOfficers} active leaders)` },
    { label: "Faculty Adviser Endorsements", val: `${withAdvisers} of ${totalOrgs} (${withAdviserRate}%)` },
  ]

  kpis.forEach(item => {
    doc.setFont("helvetica", "bold")
    doc.setTextColor(brandR, brandG, brandB)
    doc.text(item.label, 50, y)
    doc.setFont("helvetica", "normal")
    doc.setTextColor(40, 40, 40)
    doc.text(item.val, doc.internal.pageSize.getWidth() - 50, y, { align: "right" })
    y += 16
  })

  y += 20
  doc.setFontSize(12)
  doc.setFont("helvetica", "bold")
  doc.setTextColor(brandR, brandG, brandB)
  doc.text("II. Category Performance Distribution", 40, y)
  doc.setLineWidth(1.5)
  doc.setDrawColor(brandR, brandG, brandB)
  doc.line(40, y + 5, doc.internal.pageSize.getWidth() - 40, y + 5)
  y += 20

  const catList = Array.isArray(byCategory) ? byCategory : []
  const catTableData = catList.map((c) => {
    const orgCount = c?.totalOrganizations ?? c?.totalOrgs ?? 0
    const compliant = c?.fullyCompliantCount ?? c?.compliantCount ?? 0
    const cblArchivedRate = c?.cblArchivedRate ?? (orgCount > 0 ? Math.round(((c?.cblArchivedCount ?? 0) / orgCount) * 100) : 0)
    const withOfficersRate = c?.withOfficersRate ?? (orgCount > 0 ? Math.round(((c?.withOfficersCount ?? 0) / orgCount) * 100) : 0)
    const complianceRate = c?.complianceRate ?? (orgCount > 0 ? Math.round((compliant / orgCount) * 100) : 0)
    return [
      c?.category || "—",
      String(orgCount),
      String(compliant),
      `${cblArchivedRate}%`,
      `${withOfficersRate}%`,
      `${complianceRate}%`,
    ]
  })

  autoTable(doc, {
    startY: y,
    head: [["Category", "Total Orgs", "Fully Compliant", "CBL Archived", "Officers Whitelisted", "Compliance Rate"]],
    body: catTableData,
    theme: "striped",
    headStyles: { fillColor: [brandR, brandG, brandB], textColor: [255, 255, 255], fontStyle: "bold" },
    styles: { fontSize: 9, cellPadding: 5 },
    columnStyles: {
      0: { fontStyle: "bold" },
      1: { halign: "center" },
      2: { halign: "center" },
      3: { halign: "center" },
      4: { halign: "center" },
      5: { halign: "right", fontStyle: "bold", textColor: [brandR, brandG, brandB] },
    },
  })

  doc.addPage()
  y = 60
  doc.setFontSize(12)
  doc.setFont("helvetica", "bold")
  doc.setTextColor(brandR, brandG, brandB)
  doc.text("III. Detailed Organization Compliance Matrix", 40, y)
  doc.setLineWidth(1.5)
  doc.setDrawColor(brandR, brandG, brandB)
  doc.line(40, y + 5, doc.internal.pageSize.getWidth() - 40, y + 5)
  y += 20

  const orgTableData = orgList.map((o) => {
    const orgName = o?.name || "Unnamed Organization"
    const orgAcronym = o?.acronym ? ` (${o.acronym})` : ""
    const adviser = o?.adviserName || o?.adviser_name || "Pending"
    const cblStatus = (o?.hasCbl ?? o?.checklist?.cbl ?? o?.checklist?.has_cbl) ? "Archived" : "Pending"
    const officerCount = o?.activeOfficerCount ?? o?.officers?.length ?? 0
    const standing = o?.status || "Active"
    const score = o?.complianceScore ?? 0
    const status = o?.complianceStatus || "Pending"
    return [
      `${orgName}${orgAcronym}`,
      o?.category || "—",
      adviser,
      cblStatus,
      `${officerCount} Officers`,
      standing,
      `${score}% (${status})`,
    ]
  })

  autoTable(doc, {
    startY: y,
    head: [["Organization", "Category", "Adviser", "CBL", "Officers", "Standing", "Compliance"]],
    body: orgTableData,
    theme: "striped",
    headStyles: { fillColor: [brandR, brandG, brandB], textColor: [255, 255, 255], fontStyle: "bold" },
    styles: { fontSize: 8.5, cellPadding: 4.5 },
    columnStyles: {
      0: { fontStyle: "bold" },
      3: { halign: "center" },
      4: { halign: "center" },
      5: { halign: "center" },
      6: { halign: "right", fontStyle: "bold", textColor: [brandR, brandG, brandB] },
    },
  })

  y = doc.lastAutoTable.finalY + 35
  if (y > 700) {
    doc.addPage()
    y = 60
  }

  doc.setFontSize(12)
  doc.setFont("helvetica", "bold")
  doc.setTextColor(brandR, brandG, brandB)
  doc.text("IV. Certification & Attestation", 40, y)
  doc.setLineWidth(1.5)
  doc.setDrawColor(brandR, brandG, brandB)
  doc.line(40, y + 5, doc.internal.pageSize.getWidth() - 40, y + 5)
  y += 20
  doc.setFontSize(9.5)
  doc.setFont("helvetica", "normal")
  doc.setTextColor(60, 60, 60)
  const cert = `This official accreditation audit has been prepared by the Office of Student Affairs and Services (OSAS). The compliance metrics documented herein represent active organizational records and official submissions validated by the ${prefix} Records Keeping System.`
  const splitCert = doc.splitTextToSize(cert, doc.internal.pageSize.getWidth() - 80)
  doc.text(splitCert, 40, y)
  y += splitCert.length * 13 + 50
  addSignatures(doc, y, {
    campusName: branding?.campusName,
    signatoryRegistrarTitle: branding?.signatoryRegistrarTitle,
    signatoryHeadTitle: branding?.signatoryHeadTitle,
  })

  return doc.output("blob")
}

/**
 * Generates a SLA Analytics PDF Report
 */
export const generateSLAAnalyticsPdf = async (data = {}, total = 0, completionRate = 0, options = {}) => {
  const doc = new jsPDF("p", "pt", "a4")
  const branding = options?.branding || await getInstitutionalBranding()
  const logoData = await getLogoAsPng(branding.logoBase64 || branding.logoUrl)
  const secondaryLogoSrc = branding?.secondaryLogoBase64 || branding?.secondaryLogoUrl
  const secondaryLogoData = secondaryLogoSrc ? await getLogoAsPng(secondaryLogoSrc, false) : null
  const prefix = deriveDocumentPrefix(branding.institutionName, branding.campusName)
  const [brandR, brandG, brandB] = hexToRgb(branding.brandColor || "#7A1E28")
  
  const docId = `${prefix}-SLA-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`
  addPUPReportHeader(doc, "Fulfillment SLA Analytics Report", {
    documentId: docId,
    logoData,
    secondaryLogoData,
    jurisdictionHeader: branding.jurisdictionHeader,
    institutionName: branding.institutionName,
    campusName: branding.campusName,
    brandColor: branding.brandColor,
    officeName: branding.tagline || "OFFICIAL ACADEMIC ARCHIVES & RECORDS",
  })

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
  doc.setTextColor(brandR, brandG, brandB)
  doc.text("I. Service Efficiency Summary", 40, y)
  doc.setLineWidth(1.5)
  doc.setDrawColor(brandR, brandG, brandB)
  doc.line(40, y + 5, doc.internal.pageSize.getWidth() - 40, y + 5)
  
  y += 30
  doc.setFontSize(10)
  doc.setFont("helvetica", "normal")
  doc.setTextColor(60, 60, 60)
  const dataScope = isFiltered 
    ? "during the specified reporting period" 
    : "aggregated from all available historical records";
  const frameworkTitle = data?.sla?.standards?.frameworkName || "Service Level Agreement (SLA)";
  const safeTotal = typeof total === "number" ? total : (Number(total) || 0);
  const safeCompletionRate = typeof completionRate === "number" ? completionRate : (Number(completionRate) || 0);
  const intro = `This document details the registry's fulfillment efficiency across ${safeTotal.toLocaleString()} total documented requests ${dataScope}. Public service operations and timeliness are measured against the institutional ${frameworkTitle} fulfillment standard.`;
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
  doc.setTextColor(brandR, brandG, brandB)
  doc.text(`${safeTotal.toLocaleString()}`, 50, y + 55)
  doc.setTextColor(16, 185, 129) // Emerald for completion
  doc.text(`${safeCompletionRate}%`, doc.internal.pageSize.getWidth() / 2 + 15, y + 55)
  
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
  doc.setTextColor(brandR, brandG, brandB)
  doc.text("II. Top Demand Analysis", 40, y)
  doc.setLineWidth(1.5)
  doc.setDrawColor(brandR, brandG, brandB)
  doc.line(40, y + 5, doc.internal.pageSize.getWidth() - 40, y + 5)
  y += 25
  
  doc.setFontSize(10)
  doc.setFont("helvetica", "normal")
  doc.setTextColor(60, 60, 60)
  const demandDesc = "The following table aggregates the most frequently requested documents, identifying the highest administrative priorities based on volume. This data is critical for prioritizing document template optimization."
  const splitDemand = doc.splitTextToSize(demandDesc, doc.internal.pageSize.getWidth() - 80)
  doc.text(splitDemand, 40, y)
  y += splitDemand.length * 14 + 10

  const rawTopDocs = Array.isArray(data?.topDocTypes) ? data.topDocTypes : []
  const topDemandData = rawTopDocs.length > 0
    ? rawTopDocs.map((dt, i) => [`${i + 1}. ${dt?.name || "Unspecified Document"}`, Number(dt?.count || 0).toLocaleString()])
    : [["No request records found", "0"]]
  autoTable(doc, {
    startY: y,
    head: [["Document Type", "Total Requests"]],
    body: topDemandData,
    theme: "striped",
    headStyles: { fillColor: [brandR, brandG, brandB], textColor: [255, 255, 255], fontStyle: "bold" },
    styles: { fontSize: 10, cellPadding: 6 },
    columnStyles: { 0: { fontStyle: "bold" }, 1: { halign: "right", fontStyle: "bold", textColor: [brandR, brandG, brandB] } },
  })
  
  // Section III: Client Satisfaction Measurement (CSM)
  if (doc.lastAutoTable.finalY + 240 > doc.internal.pageSize.getHeight() - 80) {
    doc.addPage()
    y = 60
  } else {
    y = doc.lastAutoTable.finalY + 35
  }

  doc.setFontSize(12)
  doc.setFont("helvetica", "bold")
  doc.setTextColor(brandR, brandG, brandB)
  doc.text("III. Client Satisfaction Measurement (CSM)", 40, y)
  doc.setLineWidth(1.5)
  doc.setDrawColor(brandR, brandG, brandB)
  doc.line(40, y + 5, doc.internal.pageSize.getWidth() - 40, y + 5)
  y += 25

  doc.setFontSize(10)
  doc.setFont("helvetica", "normal")
  doc.setTextColor(60, 60, 60)
  const csmDesc = "The following metrics represent student client feedback collected via the online document request portal, reflecting service quality, promptness, and administrative satisfaction."
  const splitCsm = doc.splitTextToSize(csmDesc, doc.internal.pageSize.getWidth() - 80)
  doc.text(splitCsm, 40, y)
  y += splitCsm.length * 14 + 10

  const feedbackTotal = Number(data?.feedback?.totalResponses || 0)
  const avgRating = feedbackTotal > 0 && data?.feedback?.averageRating != null ? `${data.feedback.averageRating} / 5.0` : "No ratings"
  const satRate = feedbackTotal > 0 && data?.feedback?.satisfactionRate != null ? `${data.feedback.satisfactionRate}% Positive` : "N/A"

  const csmRows = [
    ["Average Client Satisfaction Score", avgRating],
    ["Total Student Evaluations Received", `${feedbackTotal.toLocaleString()}`],
    ["Overall Positive Sentiment Rate", satRate],
    ["5-Star Evaluations", `${Number(data?.feedback?.ratingBreakdown?.[5] || 0).toLocaleString()}`],
    ["4-Star Evaluations", `${Number(data?.feedback?.ratingBreakdown?.[4] || 0).toLocaleString()}`],
    ["3-Star Evaluations", `${Number(data?.feedback?.ratingBreakdown?.[3] || 0).toLocaleString()}`],
    ["2-Star Evaluations", `${Number(data?.feedback?.ratingBreakdown?.[2] || 0).toLocaleString()}`],
    ["1-Star Evaluations", `${Number(data?.feedback?.ratingBreakdown?.[1] || 0).toLocaleString()}`],
  ]

  autoTable(doc, {
    startY: y,
    head: [["Evaluation Metric", "Recorded Result"]],
    body: csmRows,
    theme: "striped",
    headStyles: { fillColor: [brandR, brandG, brandB], textColor: [255, 255, 255], fontStyle: "bold" },
    styles: { fontSize: 9.5, cellPadding: 5 },
    columnStyles: { 0: { fontStyle: "bold" }, 1: { halign: "right", fontStyle: "bold", textColor: [brandR, brandG, brandB] } },
  })

  y = doc.lastAutoTable.finalY + 50
  if (y + 120 > doc.internal.pageSize.getHeight()) {
    doc.addPage()
    y = 60
  }
  addSignatures(doc, y, {
    campusName: branding?.campusName,
    signatoryRegistrarTitle: branding?.signatoryRegistrarTitle,
    signatoryHeadTitle: branding?.signatoryHeadTitle,
  })

  return doc.output("blob")
}

/**
 * Generates a Sample Branding Verification PDF Report
 */
export const generateSampleBrandingPdf = async (branding) => {
  const doc = new jsPDF("p", "pt", "a4")
  const activeBranding = branding || await getInstitutionalBranding() || {}
  const logoData = await getLogoAsPng(activeBranding?.logoBase64 || activeBranding?.logoUrl)
  const secondaryLogoSrc = activeBranding?.secondaryLogoBase64 || activeBranding?.secondaryLogoUrl
  const secondaryLogoData = secondaryLogoSrc ? await getLogoAsPng(secondaryLogoSrc, false) : null
  const instName = activeBranding?.institutionName || "Polytechnic University of the Philippines"
  const campusName = activeBranding?.campusName || "San Juan Campus"
  const accentColor = activeBranding?.brandColor || "#7A1E28"
  const tagline = activeBranding?.tagline || "OFFICIAL ACADEMIC ARCHIVES & RECORDS"
  const jurisdictionHeader = activeBranding?.jurisdictionHeader || "Republic of the Philippines"
  const prefix = deriveDocumentPrefix(instName, campusName)
  
  const docId = `${prefix}-SPEC-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`
  addPUPReportHeader(doc, "Official Document Header Specification", {
    documentId: docId,
    logoData,
    secondaryLogoData,
    jurisdictionHeader,
    institutionName: instName,
    campusName,
    brandColor: accentColor,
    officeName: tagline,
  })

  let y = 205
  doc.setFont("helvetica", "bold")
  doc.setFontSize(9)
  doc.setTextColor(150, 150, 150)
  doc.text("GENERATED ON:", 40, y)
  doc.setTextColor(0, 0, 0)
  doc.text(formatPHDateTime(new Date().toISOString()), 135, y)

  y += 18
  doc.setTextColor(150, 150, 150)
  doc.text("INSTITUTION:", 40, y)
  doc.setTextColor(0, 0, 0)
  doc.text(`${instName} (${campusName})`, 135, y)

  y += 18
  doc.setTextColor(150, 150, 150)
  doc.text("ACCENT COLOR:", 40, y)
  doc.setTextColor(0, 0, 0)
  doc.text(accentColor, 135, y)

  y += 35
  doc.setFontSize(12)
  doc.setFont("helvetica", "bold")
  const [brandR, brandG, brandB] = hexToRgb(accentColor)
  doc.setTextColor(brandR, brandG, brandB)
  doc.text("I. Institutional Branding Verification", 40, y)
  doc.setLineWidth(1.5)
  doc.setDrawColor(brandR, brandG, brandB)
  doc.line(40, y + 5, doc.internal.pageSize.getWidth() - 40, y + 5)

  y += 25
  doc.setFontSize(10)
  doc.setFont("helvetica", "normal")
  doc.setTextColor(60, 60, 60)
  const intro = "This sample document verifies that your custom university seal, institution name, and official brand accent color render with high fidelity across all official PDF transcripts, audit logs, and compliance records generated by the eManage Records Management System."
  const splitIntro = doc.splitTextToSize(intro, doc.internal.pageSize.getWidth() - 80)
  doc.text(splitIntro, 40, y)
  y += splitIntro.length * 14 + 20

  autoTable(doc, {
    startY: y,
    head: [["Configuration Key", "Configured Value", "Status"]],
    body: [
      ["Super-Header / Jurisdiction", jurisdictionHeader || "—", "Active"],
      ["School / University Name", instName, "Active"],
      ["Campus / Branch", campusName || "—", "Active"],
      ["Administrative Office Line", tagline || "—", "Active"],
      ["Automated Document Prefix", prefix, "Auto-Derived"],
      ["Primary Brand Color", accentColor, "Applied"],
      ["Primary Seal", activeBranding?.logoBase64 ? "Custom High-Res Image Uploaded" : "Default PUP Seal (eManage Fallback)", "Verified"],
      ["Secondary / Partner Seal", activeBranding?.secondaryLogoBase64 ? "Custom Image Uploaded (Dual-Seal Masthead)" : "None (Single-Logo Mode)", "Active"],
      ["Records / Registrar Signatory", activeBranding?.signatoryRegistrarTitle || (campusName ? "Campus Registrar (Auto)" : "Registrar (Auto)"), "Active"],
      ["Executive Approver Signatory", activeBranding?.signatoryHeadTitle || (campusName ? "Campus Director (Auto)" : "Head of Institution (Auto)"), "Active"],
    ],
    theme: "striped",
    headStyles: { fillColor: [brandR, brandG, brandB], textColor: 255 },
    styles: { fontSize: 9 },
  })

  y = doc.lastAutoTable.finalY + 40
  addSignatures(doc, y, {
    campusName: campusName,
    signatoryRegistrarTitle: activeBranding?.signatoryRegistrarTitle,
    signatoryHeadTitle: activeBranding?.signatoryHeadTitle,
  })

  return doc.output("blob")
}

/**
 * Generates an Official Student Requirements Compliance Summary PDF
 * (Matches Admin header standard, clean 4-column table, 3-column student meta, no signatures, official footer note)
 */
export const generateStudentComplianceSlipPdf = async (student = {}, requirements = [], summary = {}, options = {}) => {
  const doc = new jsPDF("p", "pt", "a4")
  const branding = options?.branding || (await getInstitutionalBranding()) || {}
  const logoData = await getLogoAsPng(branding?.logoBase64 || branding?.logoUrl)
  const secondaryLogoSrc = branding?.secondaryLogoBase64 || branding?.secondaryLogoUrl
  const secondaryLogoData = secondaryLogoSrc ? await getLogoAsPng(secondaryLogoSrc, false) : null
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()

  const instName = branding?.institutionName || "Polytechnic University of the Philippines"
  const campusName = branding?.campusName || "San Juan Campus"
  const prefix = deriveDocumentPrefix(instName, campusName)
  const studentIdClean = (student?.studentNo || student?.student_no) ? String(student?.studentNo || student?.student_no).replace(/[^0-9A-Za-z]/g, "") : "STD"
  const docId = `${prefix}-CMP-${studentIdClean}-${new Date().getFullYear()}`
  const brandColor = branding?.brandColor || "#800000"
  const [brandR, brandG, brandB] = hexToRgb(brandColor)

  addPUPReportHeader(doc, "Student Requirements Compliance Summary", {
    documentId: docId,
    logoData,
    secondaryLogoData,
    jurisdictionHeader: branding?.jurisdictionHeader,
    institutionName: instName,
    campusName,
    brandColor,
    officeName: branding?.tagline || "OFFICE OF THE CAMPUS REGISTRAR",
  })

  let y = 188

  // Student Meta Details Box (3 columns: Student Name, Student Number, Compliance Status)
  doc.setFillColor(249, 250, 251)
  doc.setDrawColor(229, 231, 235)
  doc.roundedRect(40, y, pageWidth - 80, 48, 6, 6, "FD")

  const colWidth = (pageWidth - 80) / 3

  // Col 1: Student Name
  doc.setFont("helvetica", "bold")
  doc.setFontSize(7.5)
  doc.setTextColor(107, 114, 128)
  doc.text("STUDENT NAME", 52, y + 18)
  doc.setFontSize(9.5)
  doc.setTextColor(17, 24, 39)
  doc.text(String(student?.name || "—"), 52, y + 34)

  // Col 2: Student Number
  doc.setFont("helvetica", "bold")
  doc.setFontSize(7.5)
  doc.setTextColor(107, 114, 128)
  doc.text("STUDENT NUMBER", 52 + colWidth, y + 18)
  doc.setFontSize(9.5)
  doc.setTextColor(brandR, brandG, brandB)
  doc.text(String(student?.studentNo || student?.student_no || "—"), 52 + colWidth, y + 34)

  // Col 3: Compliance Status
  doc.setFont("helvetica", "bold")
  doc.setFontSize(7.5)
  doc.setTextColor(107, 114, 128)
  doc.text("COMPLIANCE STATUS", 52 + colWidth * 2, y + 18)
  doc.setFontSize(9.5)
  doc.setTextColor(17, 24, 39)
  const reqList = Array.isArray(requirements) ? requirements : []
  const submittedCount = Number(summary?.submittedCount ?? summary?.approvedCount ?? 0)
  const totalRequired = Number(summary?.totalRequired ?? reqList.length)
  const complianceRate = Number(summary?.complianceRate ?? (totalRequired > 0 ? Math.round((submittedCount / totalRequired) * 100) : 0))
  const statusStr = `${complianceRate}% (${submittedCount}/${totalRequired} Submitted)`
  doc.text(statusStr, 52 + colWidth * 2, y + 34)

  // Submissions Checklist Table (4 columns: #, Requirement / Credential, Category, Status)
  const head = [["#", "Requirement / Credential", "Category", "Status"]]
  const tableData = reqList.length > 0
    ? reqList.map((r, idx) => [
        idx + 1,
        r?.docType || r?.name || "—",
        r?.category || "—",
        r?.status === "Submitted" || r?.submitted ? "Submitted" : "Not Submitted",
      ])
    : [["—", "No requirements listed", "—", "—"]]

  autoTable(doc, {
    startY: y + 60,
    head: head,
    body: tableData,
    theme: "striped",
    headStyles: {
      fillColor: [brandR, brandG, brandB],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 8.5,
    },
    styles: {
      fontSize: 8.5,
      cellPadding: 6,
      overflow: "linebreak",
    },
    columnStyles: {
      0: { cellWidth: 32, halign: "center", textColor: [107, 114, 128] },
      1: { cellWidth: 260, fontStyle: "bold", textColor: [17, 24, 39] },
      2: { cellWidth: 125, textColor: [75, 85, 99] },
      3: { cellWidth: "auto", halign: "center", fontStyle: "bold" },
    },
    didParseCell: (data) => {
      if (data.section === "body" && data.column.index === 3) {
        if (data.cell.raw === "Submitted") {
          data.cell.styles.textColor = [6, 95, 70]
        } else {
          data.cell.styles.textColor = [180, 83, 9]
        }
      }
    },
    margin: { left: 40, right: 40 },
  })

  const finalY = doc.lastAutoTable.finalY + 25
  const noteY = Math.min(finalY, pageHeight - 40)

  doc.setFont("helvetica", "italic")
  doc.setFontSize(8)
  doc.setTextColor(156, 163, 175)
  const noteText =
    `Note: This is an official system-generated student compliance summary from the ${prefix} Records Keeping System for institutional verification. Alteration or unauthorized reproduction is strictly prohibited.`
  doc.text(noteText, pageWidth / 2, noteY, { align: "center", maxWidth: pageWidth - 80 })

  return doc.output("blob")
}

