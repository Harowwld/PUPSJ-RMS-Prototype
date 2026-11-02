import test, { mock } from "node:test"
import assert from "node:assert/strict"

let snapshot
const calls = []
mock.module("../src/lib/postgres.js", {
  namedExports: {
    queryOne: async (sql, params) => {
      calls.push({ sql, params })
      return structuredClone(snapshot)
    },
  },
})
mock.module("../src/lib/studentAuth.js", {
  namedExports: { decryptStudentRow: (row) => row },
})
const { getDigitizationComplianceSummary, getStudentComplianceReport } =
  await import("../src/lib/digitizationComplianceRepo.js")
const types = [
  { id: 11, name: "Birth Certificate", office_id: "registrar" },
  { id: 12, name: "Report Card", office_id: "registrar" },
]
const student = (number, states) => ({
  student_no: String(number).padStart(4, "0"),
  name: `Student ${number}`,
  course_code: "BSIT",
  section: "1",
  year_level: 2025,
  requirements: types.map((type, index) => ({
    documentTypeId: type.id,
    docType: type.name,
    doc: states[index]
      ? { id: number * 10 + index, approval_status: states[index] }
      : null,
  })),
})
const fixture = () => {
  calls.length = 0
  snapshot = {
    types,
    students: [
      student(1, ["Approved", "Approved"]),
      student(2, ["Pending", "Declined"]),
      student(3, []),
    ],
  }
}

test("summary, type roster, and matrix share approved-only compliance by default", async () => {
  fixture()
  const summary = await getDigitizationComplianceSummary({
    officeId: "registrar",
  })
  const roster = await getStudentComplianceReport({ officeId: "registrar" })
  const type = await getStudentComplianceReport({
    officeId: "registrar",
    documentTypeId: 11,
  })
  const matrix = await getStudentComplianceReport({
    officeId: "registrar",
    complianceStatus: "all",
  })
  assert.equal(summary.summary.fullyDigitizedStudents, 1)
  assert.equal(summary.summary.notDigitizedStudents, roster.total)
  assert.equal(summary.summary.percentDigitized, 33)
  assert.equal(summary.missingByDocumentType[0].missingStudents, type.total)
  assert.equal(
    matrix.records.filter((record) => !record.isCompliant).length,
    roster.total
  )
  assert.deepEqual(
    roster.students[0].outstandingRequirements.map((r) => r.status),
    ["pending", "declined"]
  )
})

test("upload coverage explicitly accepts Pending but never Declined", async () => {
  fixture()
  const result = await getStudentComplianceReport({
    requireApproved: false,
    documentTypeId: 11,
  })
  assert.equal(result.total, 1)
  assert.equal(result.students[0].studentNo, "0003")
  assert.equal(result.summary.totalDigitizedDocsCount, 3)
})

test("pagination happens after compliance calculation; export includes every matching student", async () => {
  fixture()
  snapshot.students = Array.from({ length: 205 }, (_, index) =>
    student(index + 1, [])
  )
  const page = await getStudentComplianceReport({ limit: 20, offset: 200 })
  const all = await getStudentComplianceReport({
    limit: 20,
    offset: 200,
    exportAll: true,
  })
  assert.equal(page.total, 205)
  assert.equal(page.students.length, 5)
  assert.equal(page.students[0].studentNo, "0201")
  assert.equal(all.students.length, 205)
  assert.equal(all.summary.notDigitizedStudents, 205)
})

test("empty requirements never invent mandatory documents or classify students as incomplete", async () => {
  fixture()
  snapshot.types = []
  snapshot.students.forEach((row) => {
    row.requirements = []
  })
  const result = await getStudentComplianceReport()
  assert.equal(result.meta.configured, false)
  assert.equal(result.total, 0)
  assert.equal(result.summary.notDigitizedStudents, 0)
  assert.equal(result.summary.percentDigitized, 0)
})

test("invalid and out-of-scope document identifiers return no report", async () => {
  fixture()
  assert.equal(
    await getStudentComplianceReport({ documentTypeId: "11oops" }),
    null
  )
  assert.equal(calls.length, 0)
  assert.equal(await getStudentComplianceReport({ documentTypeId: 99 }), null)
})

test("search, outstanding filters and sorting operate before pagination", async () => {
  fixture()
  const result = await getStudentComplianceReport({
    search: "student 2",
    missingDocTypes: ["Report Card"],
    limit: 1,
    sortBy: "name",
    sortOrder: "DESC",
  })
  assert.equal(result.total, 1)
  assert.equal(result.students[0].studentNo, "0002")
})

test("one database statement supplies types, membership, evidence and population filters", async () => {
  fixture()
  await getDigitizationComplianceSummary({
    officeId: "REGISTRAR",
    studentStatus: "Archived",
    courseCodes: ["bsit", "BSENT"],
  })
  assert.equal(calls.length, 1)
  assert.deepEqual(calls[0].params, [
    "registrar",
    "Archived",
    ["BSIT", "BSENT"],
  ])
  assert.match(calls[0].sql, /d.office_id = t.office_id/)
})

test("configured types remain available when population is empty", async () => {
  fixture()
  snapshot.students = []
  const result = await getDigitizationComplianceSummary()
  assert.equal(result.missingByDocumentType.length, 2)
  assert.equal(result.missingByDocumentType[0].missingStudents, 0)
})
