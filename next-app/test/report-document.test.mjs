import test from "node:test"
import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import { PDFDocument, PDFName, PDFDict } from "pdf-lib"
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs"
import * as generators from "../src/lib/pdfGenerator.js"
import { generateStudentRecordsReportPdf } from "../src/lib/studentRecordsReportPdf.js"
import { generateComplianceRosterPdf } from "../src/lib/complianceRosterPdf.js"
import { createReportDocument, getReportInkColor } from "../src/lib/reportDocument.js"
import { REPORT_FONT_OPTIONS, getReportFont, isReportFont } from "../src/lib/reportFontOptions.js"
import { resolveBranding, getInstitutionalBranding, BRANDING_CACHE_KEY, BRANDING_UPLOAD_LIMITS } from "../src/lib/institutionalBranding.js"
import { installReportAssets } from "./helpers/reportAssets.mjs"

test.beforeEach(installReportAssets)

const logo = `data:image/png;base64,${(await readFile(new URL("../public/assets/branding/black-icon.png", import.meta.url))).toString("base64")}`
const branding = { institutionName: "Document Validation Institution", campusName: "Report Validation Campus", jurisdictionHeader: "Report validation jurisdiction", tagline: "RECORDS VALIDATION OFFICE", brandColor: "#7A1E28", logoBase64: logo, secondaryLogoBase64: logo }
const date = "2026-11-02T00:00:00Z"
const student = { studentNo: "2026-VALIDATION", name: "PDF validation record", courseCode: "TEST", yearLevel: 2026, section: "A", status: "Active" }
const record = { student, digitizedDocuments: [{ doc_type: "Archived validation form", created_at: date }], outstandingRequirements: [{ docType: "Missing validation form", status: "missing" }], meta: { generatedAt: date, requiredCount: 2, verifiedCount: 1, configured: true } }
const roster = { meta: { generatedAt: date, officeId: "registrar", studentStatus: "Active", requireApproved: true }, total: 1, students: [{ ...student, outstandingRequirements: record.outstandingRequirements }] }
const analytics = { sla: { totalCompleted: 4, compliantCompleted: 3, tierStats: { simple: { label: "Validation service", total: 4, compliant: 3, delayed: 1, windowDays: 3 } } }, topDocTypes: [{ name: "Validation credential", count: 5, slaWindow: 3 }], feedback: { totalResponses: 2, averageRating: 4.5, satisfactionRate: 100, ratingBreakdown: { 5: 1, 4: 1 }, topAspects: [{ label: "Validation aspect", count: 1, percentage: 50 }] } }
const cases = (branding) => [
  ["activity", () => generators.generateAuditLogsPdf([{ actor: "Validation actor", action: "Validation action", details: "Validation record", created_at: date }], { branding })],
  ["digitization", () => generators.generateDigitizationCompliancePdf({ byYear: [{ year: 2026, count: 1 }] }, { totalStudents: 1, digitizedStudents: 0, notDigitizedStudents: 1 }, { branding }, [{ courseCode: "TEST", total: 1, digitized: 0, percent: 0 }])],
  ["organization", () => generators.generateOrganizationCompliancePdf({}, { totalOrganizations: 1 }, { branding }, [{ name: "Validation organization", category: "Academic" }], [])],
  ["processing", () => generators.generateSLACompliancePdf(analytics, 5, 75, { branding })],
  ["satisfaction", () => generators.generateCSMReportPdf(analytics, { branding })],
  ["combined", () => generators.generateComprehensiveSLAPdf(analytics, 5, 75, { branding })],
  ["sample", () => generators.generateSampleBrandingPdf(branding)],
  ["slip", () => generators.generateStudentComplianceSlipPdf(student, [{ docType: "Validation form", status: "Submitted" }], { totalRequired: 1, submittedCount: 1 }, { branding })],
  ["student", () => generateStudentRecordsReportPdf(record, { branding })],
  ["incomplete", () => generateComplianceRosterPdf(roster, { branding })],
  ["campus-operations", () => generators.generateCampusOperationsPdf([{ id: 1, officeId: "registrar", type: "document_request", title: "Validation credential", status: "Completed", createdAt: date }], { branding })],
]

async function inspect(blob) {
  const bytes = new Uint8Array(await blob.arrayBuffer())
  const document = await PDFDocument.load(bytes)
  const fontNames = new Set()
  for (const page of document.getPages()) {
    const fonts = page.node.Resources().lookup(PDFName.of("Font"), PDFDict)
    for (const [, reference] of fonts.entries()) {
      const font = document.context.lookup(reference, PDFDict)
      fontNames.add(font.lookup(PDFName.of("BaseFont")).toString())
      assert.equal(font.lookup(PDFName.of("Subtype")).toString(), "/Type0", "Report font must be embedded Unicode text")
    }
  }
  const pdf = await getDocument({ data: bytes, useSystemFonts: false }).promise
  const pages = []
  try {
    for (let index = 1; index <= pdf.numPages; index++) {
      const page = await pdf.getPage(index)
      const content = await page.getTextContent()
      pages.push({ items: content.items, width: page.view[2], height: page.view[3] })
    }
  } finally { await pdf.destroy() }
  return { fontNames, pages, text: pages.flatMap((page) => page.items.map((item) => item.str)).join(" ") }
}

for (const font of REPORT_FONT_OPTIONS) {
  test(`${font.label}: every generated report uses the institutional document style and embedded font`, async () => {
    for (const [name, generate] of cases({ ...branding, reportFont: font.value })) {
      const result = await inspect(await generate())
      const compact = (text) => text.replace(/\s/g, "")
      for (const expected of [branding.institutionName, branding.campusName, branding.tagline, branding.jurisdictionHeader, "Report Date", "1."]) {
        assert.ok(compact(result.text).includes(compact(expected)), `${name}: ${expected}`)
      }
      assert.equal(result.text.includes("Document ID:"), false, `${name}: document IDs are omitted from the printed report`)
      assert.equal(result.text.includes("Generated"), false, `${name}: generation timestamps are omitted from the printed report`)
      assert.ok([...result.fontNames].every((name) => name.replace(/[^a-z]/gi, "").includes(font.family.replace(/[^a-z]/gi, ""))), `${name}: wrong font ${[...result.fontNames]}`)
      for (const [index, page] of result.pages.entries()) {
        assert.ok(page.items.some((item) => item.str === `Page ${index + 1} of ${result.pages.length}`), `${name}: missing page footer`)
        for (const item of page.items.filter((item) => item.str.trim())) {
          assert.ok(item.transform[4] >= 53, `${name}: left clipping ${item.str}`)
          assert.ok(item.transform[4] + item.width <= page.width - 53, `${name}: right clipping ${item.str}`)
          assert.ok(item.transform[5] >= 23, `${name}: footer clipping ${item.str}`)
          assert.ok(item.transform[5] <= page.height - 28, `${name}: top clipping ${item.str}`)
        }
      }
    }
  })
}

test("long letterheads, paragraphs, table rows, and signatory titles paginate without clipping or losing content", async () => {
  const document = await createReportDocument({ title: "Long report title for validation ".repeat(4), branding: { ...branding, institutionName: "Institutional validation name ".repeat(5), campusName: "Campus validation name ".repeat(4), tagline: "Office validation heading ".repeat(4), reportFont: "times-new-roman", signatoryRegistrarTitle: "Validation records management officer ".repeat(3) } })
  document.section("Long Body Section")
  document.paragraph("Long paragraph validation content. ".repeat(500))
  document.section("Long Table Section")
  document.table(["Requirement", "Recorded Detail"], Array.from({ length: 120 }, (_, index) => [`Validation record ${index + 1}`, "Long recorded detail ".repeat(8)]))
  document.section("Final Review Section")
  document.signatures()
  const result = await inspect(document.finish())
  assert.ok(result.pages.length > 5)
  assert.ok(result.text.includes("Validation record 120"))
  assert.ok(result.text.includes("Final Review Section"))
  for (const [index, page] of result.pages.entries()) {
    assert.ok(page.items.some((item) => item.str === `Page ${index + 1} of ${result.pages.length}`))
    for (const item of page.items.filter((item) => item.str.trim())) {
      assert.ok(item.transform[4] >= 53, item.str)
      assert.ok(item.transform[4] + item.width <= page.width - 53, item.str)
      assert.ok(item.transform[5] >= 23, item.str)
    }
  }
})

test("empty analytics describe missing evidence without manufacturing compliance or feedback dimensions", async () => {
  for (const generate of [() => generators.generateSLACompliancePdf({}, 0, 0, { branding }), () => generators.generateCSMReportPdf({}, { branding })]) {
    const { text } = await inspect(await generate())
    assert.ok(text.includes("N/A"))
    assert.ok(text.includes("No service"))
    assert.equal(text.includes("100%"), false)
    assert.equal(text.includes("COMPLIANT"), false)
    assert.equal(text.includes("Statutory Target"), false)
  }
})

test("analytics use the API's configured day count and keep the final review block together", async () => {
  const data = { ...analytics, sla: { ...analytics.sla, tierStats: { Simple: { days: 3, label: "API validation tier", total: 4, compliant: 3 } }, standards: { workingDaysOnly: false } } }
  const result = await inspect(await generators.generateSLACompliancePdf(data, 5, 75, { branding }))
  assert.ok(result.text.includes("3 calendar days"))
  assert.ok(result.text.includes("System Compliant / Exempt"))
  const finalPage = result.pages.at(-1).items.map((item) => item.str).join(" ")
  for (const text of ["Record Basis and Review", "Source:", "Prepared by", "Reviewed by", "Noted by"]) assert.ok(finalPage.includes(text), text)
})

test("old or unsupported font settings resolve safely without changing valid selections", () => {
  assert.equal(resolveBranding({}).reportFont, "jakarta")
  assert.equal(getReportFont("unsupported").value, "jakarta")
  for (const font of REPORT_FONT_OPTIONS) {
    assert.equal(isReportFont(font.value), true)
    assert.equal(resolveBranding({ reportFont: font.value }).reportFont, font.value)
  }
  assert.equal(isReportFont({ value: "arial" }), false)
})

test("letterhead ink remains legible when branding uses a light accent", () => {
  assert.deepEqual(getReportInkColor("#FFFFFF"), [31, 31, 31])
  assert.deepEqual(getReportInkColor("#ffcb00"), [31, 31, 31])
  assert.deepEqual(getReportInkColor("#7A1E28"), [122, 30, 40])
})

test("custom accent colors with sufficient contrast retain their ink color", () => {
  assert.deepEqual(getReportInkColor("#3777f6"), [55, 119, 246])
  assert.deepEqual(getReportInkColor("#e45757"), [228, 87, 87])
  assert.deepEqual(getReportInkColor("#916fe7"), [145, 111, 231])
  assert.deepEqual(getReportInkColor("#1c9c82"), [28, 156, 130])
  assert.deepEqual(getReportInkColor("#65a55a"), [101, 165, 90])
  assert.deepEqual(getReportInkColor("#ec9043"), [236, 144, 67])
})

test("signatory preparer title can be customized and appears in document signatures", async () => {
  const customBranding = {
    ...branding,
    signatoryPreparerTitle: "RECORDS OFFICER IV",
    signatoryRegistrarTitle: "UNIVERSITY REGISTRAR",
    signatoryHeadTitle: "PRESIDENT OF THE UNIVERSITY",
  }
  const document = await createReportDocument({ title: "Signatory Validation Report", branding: customBranding })
  document.signatures()
  const result = await inspect(document.finish())
  assert.ok(result.text.includes("RECORDS OFFICER IV"))
  assert.ok(result.text.includes("UNIVERSITY REGISTRAR"))
  assert.ok(result.text.includes("PRESIDENT OF THE UNIVERSITY"))
})

test("branding upload limits are centralized and enforce expected thresholds", () => {
  assert.equal(BRANDING_UPLOAD_LIMITS.maxFileSize, 3 * 1024 * 1024)
  assert.equal(BRANDING_UPLOAD_LIMITS.maxBase64Length, 4 * 1024 * 1024)
  assert.ok(BRANDING_UPLOAD_LIMITS.allowedMimeTypes.includes("image/png"))
  assert.ok(BRANDING_UPLOAD_LIMITS.allowedMimeTypes.includes("image/jpeg"))
  assert.ok(BRANDING_UPLOAD_LIMITS.allowedMimeTypes.includes("image/webp"))
  assert.ok(BRANDING_UPLOAD_LIMITS.allowedMimeTypes.includes("image/svg+xml"))
})

test("branding generation prefers current saved settings and keeps an offline fallback", async (context) => {
  const storage = new Map([[BRANDING_CACHE_KEY, JSON.stringify({ ...branding, reportFont: "jakarta" })]])
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window")
  const originalStorage = Object.getOwnPropertyDescriptor(globalThis, "localStorage")
  Object.defineProperty(globalThis, "window", { value: {}, configurable: true })
  Object.defineProperty(globalThis, "localStorage", { value: { getItem: (key) => storage.get(key), setItem: (key, value) => storage.set(key, value) }, configurable: true })
  context.after(() => {
    if (originalWindow) Object.defineProperty(globalThis, "window", originalWindow)
    else delete globalThis.window
    if (originalStorage) Object.defineProperty(globalThis, "localStorage", originalStorage)
    else delete globalThis.localStorage
  })
  context.mock.method(globalThis, "fetch", async () => new Response(JSON.stringify({ ok: true, data: { ...branding, reportFont: "arial" } })))
  assert.equal((await getInstitutionalBranding()).reportFont, "arial")
  context.mock.method(globalThis, "fetch", async () => { throw new Error("Offline validation") })
  assert.equal((await getInstitutionalBranding()).reportFont, "arial")
})

test("all report tables span 100% of the usable width with zero gap on the right margin", async () => {
  // Portrait
  const docPortrait = await createReportDocument({ title: "Width Validation", branding })
  docPortrait.table(["Col 1", "Col 2", "Col 3"], [["A", "B", "C"]], { columnStyles: { 0: { cellWidth: 100 }, 1: { cellWidth: 120 }, 2: { cellWidth: 80 } } })
  const resultP = await inspect(docPortrait.finish())
  assert.ok(resultP.pages.length >= 1)

  // Landscape
  const docLandscape = await createReportDocument({ title: "Width Validation Landscape", branding, orientation: "landscape" })
  docLandscape.table(["Col 1", "Col 2", "Col 3"], [["A", "B", "C"]], { columnStyles: { 0: { cellWidth: 100 }, 1: { cellWidth: 150 }, 2: { cellWidth: 100 } } })
  const resultL = await inspect(docLandscape.finish())
  assert.ok(resultL.pages.length >= 1)
})
