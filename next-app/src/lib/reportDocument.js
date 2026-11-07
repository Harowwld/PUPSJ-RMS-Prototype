import { jsPDF } from "jspdf"
import autoTable from "jspdf-autotable"
import { getInstitutionalBranding, resolveBranding, getLogoAsPng, hexToRgb } from "./institutionalBranding.js"
import { registerReportFont } from "./pdfFonts.js"

export const REPORT_STYLE = Object.freeze({ margin: 54, bottom: 72, body: 10.5, lineHeight: 14.7, table: 9, section: 11.5 })

export function getReportInkColor(value) {
  const color = hexToRgb(value)
  const channels = color.map((channel) => channel / 255 <= 0.04045 ? channel / 255 / 12.92 : ((channel / 255 + 0.055) / 1.055) ** 2.4)
  const luminance = channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722
  return 1.05 / (luminance + 0.05) >= 2.0 ? color : [31, 31, 31]
}

function textStyle(doc, font, size, style = "normal", color = [31, 31, 31]) {
  doc.setFont(font, style)
  doc.setFontSize(size)
  doc.setTextColor(...color)
}

export function drawReportHeader(doc, title, options = {}) {
  const branding = resolveBranding(options)
  const font = options.fontName || doc.getFont().fontName
  const width = doc.internal.pageSize.getWidth()
  const margin = REPORT_STYLE.margin
  const seal = 46
  const textWidth = width - margin * 2 - 124
  const top = 44
  const brandInk = getReportInkColor(branding.brandColor)
  const brandColor = hexToRgb(branding.brandColor)
  const lineColor = (brandColor[0] >= 240 && brandColor[1] >= 240 && brandColor[2] >= 240) ? brandInk : brandColor
  const drawSeal = (data, x) => {
    if (!data) return
    const image = doc.getImageProperties(data)
    const scale = Math.min(seal / image.width, seal / image.height)
    const w = image.width * scale, h = image.height * scale
    doc.addImage(data, "PNG", x + (seal - w) / 2, top + (seal - h) / 2, w, h, undefined, "FAST")
  }
  drawSeal(options.logoData, margin)
  drawSeal(options.secondaryLogoData, width - margin - seal)
  let y = top + 3
  for (const [text, size, style, color] of [
    [branding.jurisdictionHeader, 9, "normal", [65, 65, 65]],
    [branding.institutionName, 13, "bold", brandInk],
    [branding.campusName, 10, "normal", [31, 31, 31]],
    [options.officeName ?? branding.tagline, 9, "bold", [45, 45, 45]],
  ]) {
    if (!text) continue
    textStyle(doc, font, size, style, color)
    const lines = doc.splitTextToSize(String(text), textWidth)
    doc.text(lines, width / 2, y, { align: "center", lineHeightFactor: 1.25 })
    y += lines.length * size * 1.25 + 3
  }
  y = Math.max(y + 8, top + seal + 10)
  doc.setDrawColor(...lineColor)
  doc.setLineWidth(0.8)
  doc.line(margin, y, width - margin, y)
  y += 24
  textStyle(doc, font, 14, "bold")
  const lines = doc.splitTextToSize(String(title || "Report"), width - margin * 2)
  doc.text(lines, width / 2, y, { align: "center", lineHeightFactor: 1.25 })
  y += lines.length * 17.5 + 4
  return y
}

export async function createReportDocument({ title, branding: suppliedBranding, orientation = "portrait", generatedAt }) {
  const branding = resolveBranding(suppliedBranding || await getInstitutionalBranding())
  const doc = new jsPDF({ orientation, unit: "pt", format: "a4", putOnlyUsedFonts: true })
  const font = await registerReportFont(doc, branding.reportFont)
  const [logoData, secondaryLogoData] = await Promise.all([
    getLogoAsPng(branding.logoBase64 || branding.logoUrl),
    getLogoAsPng(branding.secondaryLogoBase64 || branding.secondaryLogoUrl, false),
  ])
  const date = generatedAt || new Date().toISOString()
  const reportDate = new Intl.DateTimeFormat("en-PH", { timeZone: "Asia/Manila", year: "numeric", month: "long", day: "numeric" }).format(new Date(date))
  const width = doc.internal.pageSize.getWidth(), height = doc.internal.pageSize.getHeight()
  const margin = REPORT_STYLE.margin, usable = width - margin * 2, bottom = height - REPORT_STYLE.bottom
  const drawnPages = new Set([1])
  let y = drawReportHeader(doc, title, { ...branding, logoData, secondaryLogoData, fontName: font })
  let sectionNumber = 0
  let lastBlock

  const continuation = (draw = true) => {
    let top = 36
    for (const [text, style] of [[`${branding.institutionName}${branding.campusName ? ` - ${branding.campusName}` : ""}`, "bold"], [title, "normal"]]) {
      textStyle(doc, font, 8, style)
      const lines = doc.splitTextToSize(String(text), usable)
      if (draw) doc.text(lines, margin, top, { lineHeightFactor: 1.25 })
      top += lines.length * 10 + 4
    }
    if (draw) {
      doc.setDrawColor(180, 180, 180)
      doc.setLineWidth(0.4)
      doc.line(margin, top, width - margin, top)
    }
    return top + 22
  }
  const continuationTop = continuation(false)
  const ensure = (needed) => {
    if (y + needed <= bottom) return
    doc.addPage()
    y = continuation()
    drawnPages.add(doc.internal.getCurrentPageInfo().pageNumber)
  }
  const paragraph = (value, { size = REPORT_STYLE.body, color, gap = 12 } = {}) => {
    lastBlock = "paragraph"
    textStyle(doc, font, size, "normal", color)
    const lines = doc.splitTextToSize(String(value ?? ""), usable)
    const lineHeight = size * 1.4
    for (const line of lines) {
      ensure(lineHeight)
      textStyle(doc, font, size, "normal", color)
      doc.text(line, margin, y)
      y += lineHeight
    }
    y += gap
  }
  const section = (heading, note, { spaceBefore = 0 } = {}) => {
    lastBlock = "section"
    y += spaceBefore
    textStyle(doc, font, REPORT_STYLE.section, "bold")
    const lines = doc.splitTextToSize(`${++sectionNumber}. ${heading}`, usable)
    ensure(lines.length * 15 + 68)
    textStyle(doc, font, REPORT_STYLE.section, "bold")
    doc.text(lines, margin, y, { lineHeightFactor: 1.3 })
    y += lines.length * 15 + 12
    if (note) paragraph(note, { size: 9.5, gap: 9 })
  }
  const table = (head, rows, { columnStyles = {}, empty = "No records match the selected report criteria.", plain = false, fontSize = REPORT_STYLE.table } = {}) => {
    lastBlock = "table"
    ensure(60)
    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin, top: continuationTop, bottom: REPORT_STYLE.bottom },
      head: plain ? undefined : [head],
      body: rows.length ? rows : [[{ content: empty, colSpan: head.length }]],
      theme: plain ? "plain" : "grid",
      showHead: "everyPage",
      rowPageBreak: "avoid",
      styles: { font, fontStyle: "normal", fontSize, cellPadding: { top: 6, bottom: 6, left: 7, right: 7 }, overflow: "linebreak", textColor: [31, 31, 31], lineColor: [200, 200, 200], lineWidth: plain ? 0 : 0.35, valign: "top" },
      headStyles: { font, fontStyle: "bold", fontSize, fillColor: [239, 239, 239], textColor: [20, 20, 20], lineColor: [170, 170, 170], lineWidth: plain ? 0 : 0.4 },
      bodyStyles: { font, fontStyle: "normal" },
      columnStyles,
      willDrawPage: () => {
        const page = doc.internal.getCurrentPageInfo().pageNumber
        if (!drawnPages.has(page)) {
          continuation()
          drawnPages.add(page)
        }
      },
    })
    y = doc.lastAutoTable.finalY + 20
  }
  const metadata = (rows) => {
    if (lastBlock === "metadata") y -= 20
    table(["Field", "Details"], rows.filter(([, value]) => value !== undefined && value !== null && value !== ""), {
      plain: true,
      columnStyles: { 0: { cellWidth: 112, fontStyle: "bold" } },
      fontSize: 9.5,
    })
    lastBlock = "metadata"
  }
  const signatureLayout = () => {
    const titles = [
      branding.signatoryPreparerTitle || "Administrative Staff",
      branding.signatoryRegistrarTitle || (branding.campusName ? "Campus Registrar" : "Registrar"),
      branding.signatoryHeadTitle || (branding.campusName ? "Campus Director" : "Head of Institution"),
    ]
    const gap = 20, cellWidth = (usable - gap * 2) / 3
    textStyle(doc, font, 9)
    const wrapped = titles.map((text) => doc.splitTextToSize(text, cellWidth))
    const blockHeight = 75 + Math.max(...wrapped.map((lines) => lines.length)) * 12
    return { gap, cellWidth, wrapped, blockHeight }
  }
  const signatures = () => {
    const labels = ["Prepared by", "Reviewed by", "Noted by"]
    const { gap, cellWidth, wrapped, blockHeight } = signatureLayout()
    ensure(blockHeight)
    for (let index = 0; index < 3; index++) {
      const x = margin + index * (cellWidth + gap)
      textStyle(doc, font, 9, "bold")
      doc.text(labels[index], x, y)
      doc.setDrawColor(95, 95, 95)
      doc.setLineWidth(0.4)
      doc.line(x, y + 35, x + cellWidth, y + 35)
      textStyle(doc, font, 9)
      doc.text(wrapped[index], x, y + 49, { lineHeightFactor: 1.3 })
    }
    y += blockHeight
  }
  const review = (note, heading = "Record Basis and Review") => {
    textStyle(doc, font, 9)
    const noteHeight = doc.splitTextToSize(note, usable).length * 12.6 + 12
    ensure(35 + noteHeight + signatureLayout().blockHeight)
    section(heading)
    paragraph(note, { size: 9 })
    signatures()
  }
  const finish = () => {
    const pages = doc.internal.getNumberOfPages()
    for (let page = 1; page <= pages; page++) {
      doc.setPage(page)
      textStyle(doc, font, 7.5, "normal", [70, 70, 70])
      doc.setDrawColor(170, 170, 170)
      doc.setLineWidth(0.35)
      doc.line(margin, height - 53, width - margin, height - 53)
      doc.text(`Page ${page} of ${pages}`, width - margin, height - 27, { align: "right" })
    }
    doc.setProperties({ title, subject: "Institutional report", author: branding.institutionName, creator: "Records Keeping System" })
    return doc.output("blob")
  }
  metadata([["Report Date", reportDate]])
  return { doc, branding, font, paragraph, section, table, metadata, signatures, review, finish }
}
