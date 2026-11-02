import test, { mock } from "node:test"
import assert from "node:assert/strict"
mock.module("../src/lib/postgres.js", {
  namedExports: { queryOne: async () => null },
})
mock.module("../src/lib/studentAuth.js", {
  namedExports: { decryptStudentRow: (row) => row },
})
const { calculateStudentCompliance } =
  await import("../src/lib/digitizationComplianceRepo.js")

test("production matrix distinguishes missing, pending, approved and declined evidence", () => {
  const [record] = calculateStudentCompliance([
    {
      student_no: "2025-1",
      name: "A Student",
      requirements: [null, "Pending", "Approved", "Declined"].map(
        (status, index) => ({
          documentTypeId: index,
          docType: `Requirement ${index}`,
          doc: status ? { approval_status: status } : null,
        })
      ),
    },
  ])
  assert.deepEqual(
    record.requirements.map((r) => r.status),
    ["missing", "pending", "verified", "declined"]
  )
  assert.equal(record.isCompliant, false)
  assert.equal(record.completionPercent, 25)
  assert.equal(record.missingCount, 1)
  assert.equal(record.declinedCount, 1)
})

test("replacement returning to Pending makes verified compliance incomplete", () => {
  const student = {
    student_no: "2025-1",
    requirements: [
      { docType: "Required Form", doc: { approval_status: "Approved" } },
    ],
  }
  assert.equal(calculateStudentCompliance([student])[0].isCompliant, true)
  student.requirements[0].doc.approval_status = "Pending"
  assert.equal(calculateStudentCompliance([student])[0].isCompliant, false)
})
