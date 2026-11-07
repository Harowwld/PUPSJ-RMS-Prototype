import test from "node:test"
import assert from "node:assert/strict"
import {
  buildComplianceRosterCsv,
  complianceRequirementLabel,
} from "../src/lib/complianceReportExport.js"

test("roster CSV preserves all rows, multiline names and correction reasons without spreadsheet formulas", () => {
  const requirement = {
    docType: "Required Form",
    status: "declined",
    doc: { review_note: 'Replace "blurry" scan' },
  }
  const report = {
    total: 205,
    meta: {
      generatedAt: "2026-11-02T00:00:00Z",
      studentStatus: "Active",
      requireApproved: true,
    },
    students: Array.from({ length: 205 }, (_, i) => ({
      studentNo: String(i),
      name: i ? "A, Student\nJr." : "=1+1",
      courseCode: "BSIT",
      outstandingRequirements: [requirement],
    })),
  }
  const csv = buildComplianceRosterCsv(report)
  assert.match(csv, /"'\=1\+1"/)
  assert.match(csv, /Needs correction \(Replace ""blurry"" scan\)/)
  assert.match(csv, /"204"/)
  assert.match(csv, /"A, Student\nJr\."/)
  assert.equal(
    complianceRequirementLabel({ docType: "Required Form", status: "pending" }),
    "Required Form: Awaiting review"
  )
})
