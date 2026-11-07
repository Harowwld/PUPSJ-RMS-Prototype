import test from "node:test"
import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs"
import { generateStudentRecordsReportPdf } from "../src/lib/studentRecordsReportPdf.js"
import { installReportAssets } from "./helpers/reportAssets.mjs"

const branding = {
  institutionName: "Polytechnic University of the Philippines",
  campusName: "San Juan City Campus",
  tagline: "OFFICE OF THE CAMPUS REGISTRAR",
  jurisdictionHeader: "Republic of the Philippines",
  brandColor: "#800000",
  logoBase64: `data:image/png;base64,${(await readFile(new URL("../public/assets/branding/black-icon.png", import.meta.url))).toString("base64")}`,
}
test.beforeEach(installReportAssets)

const fixture = () => ({
  student: { name: "Report validation student", studentNo: "2026-TEST", yearLevel: 2026, section: "1", courseCode: "BSIT", status: "Active" },
  digitizedDocuments: [{ doc_type: "Archived Form", created_at: "2026-11-02T00:00:00Z" }],
  outstandingRequirements: [
    { docType: "Missing Form", status: "missing" },
    { docType: "Submitted Form", status: "pending" },
    { docType: "Rejected Form", status: "declined", doc: { review_note: "Replace the unreadable scan." } },
  ],
  meta: { configured: true, requiredCount: 4, verifiedCount: 1, generatedAt: "2026-11-02T00:00:00Z" },
})

async function render(report, brand = branding) {
  const blob = await generateStudentRecordsReportPdf(report, { branding: brand })
  assert.equal(blob.type, "application/pdf")
  const pdf = await getDocument({ data: new Uint8Array(await blob.arrayBuffer()), useSystemFonts: false }).promise
  const pages = []
  try {
    for (let number = 1; number <= pdf.numPages; number++) {
      const page = await pdf.getPage(number)
      const content = await page.getTextContent()
      pages.push(content.items)
    }
    return { text: pages.flat().map((item) => item.str).join(" ").replace(/\s+/g, " "), pages }
  } finally {
    await pdf.destroy()
  }
}

test("PDF uses institutional letterhead and all three report zones with distinct outstanding states", async () => {
  const { text, pages } = await render(fixture())
  for (const expected of [
    branding.institutionName, branding.campusName, branding.jurisdictionHeader, branding.tagline,
    "Student Records Report", "Report Date", "Student Metadata Summary", "Digitized Records",
    "Missing / Pending Requirements", "Report validation student", "2026-TEST", "2026 / 1",
    "Archived Form", "Upload Timestamp (Asia/Manila)", "Missing Form", "Submitted Form",
    "Awaiting Review", "Needs Correction", "Replace the unreadable scan.", "Page 1 of 1",
  ]) assert.ok(text.replace(/\s/g, "").includes(expected.replace(/\s/g, "")), expected)
  assert.equal(pages.length, 1)
  assert.ok(text.indexOf("Student Metadata Summary") < text.indexOf("Digitized Records"))
  assert.ok(text.indexOf("Digitized Records") < text.indexOf("Missing / Pending Requirements"))
})

test("unconfigured requirements and empty archives do not claim compliance", async () => {
  const report = fixture()
  report.meta.configured = false
  report.digitizedDocuments = []
  report.outstandingRequirements = []
  const { text } = await render(report)
  assert.ok(text.includes("No approved digitized records on file."))
  assert.ok(text.includes("Compliance cannot be evaluated."))
  assert.equal(text.includes("All configured requirements have approved records on file."), false)
})

test("fully compliant students still receive a complete PDF", async () => {
  const report = fixture()
  report.outstandingRequirements = []
  const { text } = await render(report)
  assert.ok(text.includes("Archived Form"))
  assert.ok(text.includes("All configured requirements have approved records on file."))
})

test("long names wrap and more than 200 archived records retain headers, final requirements, and page numbers", async () => {
  const report = fixture()
  report.student.name = "Report validation student with a deliberately long full name that requires wrapping across the available space"
  report.digitizedDocuments = Array.from({ length: 205 }, (_, index) => ({
    doc_type: `Archived Requirement ${index + 1}`,
    created_at: "2026-11-02T00:00:00Z",
  }))
  const { text, pages } = await render(report)
  assert.ok(pages.length > 1)
  assert.ok(text.includes("Archived Requirement 205"))
  assert.ok(text.includes("Replace the unreadable scan."))
  for (const [index, items] of pages.entries()) {
    assert.ok(items.some((item) => item.str === `Page ${index + 1} of ${pages.length}`))
    for (const item of items.filter((entry) => entry.str.trim())) {
      assert.ok(item.transform[4] >= 39, `Left clipping: ${item.str}`)
      assert.ok(item.transform[4] + item.width <= 556.5, `Right clipping: ${item.str}`)
      assert.ok(item.transform[5] >= 18, `Bottom clipping: ${item.str}`)
    }
  }
  assert.ok(pages.slice(1, -1).every((items) => items.some((item) => item.str === "Document Type")))
})
