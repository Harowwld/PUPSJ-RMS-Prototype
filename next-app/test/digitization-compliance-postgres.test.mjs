import test, { mock } from "node:test"
import assert from "node:assert/strict"
import { Client } from "pg"

let client
mock.module("../src/lib/postgres.js", {
  namedExports: {
    queryOne: async (sql, params) => (await client.query(sql, params)).rows[0],
  },
})
mock.module("../src/lib/studentAuth.js", {
  namedExports: { decryptStudentRow: (row) => row },
})
const {
  getDigitizationComplianceSummary,
  getStudentComplianceReport,
  getStudentRecordsReport,
} = await import("../src/lib/digitizationComplianceRepo.js")

test(
  "PostgreSQL: full-population reports agree and preserve office/evidence boundaries",
  { skip: !process.env.DATABASE_URL },
  async () => {
    client = new Client({ connectionString: process.env.DATABASE_URL })
    await client.connect()
    try {
      await client.query("BEGIN")
      // Temporary tables shadow application tables on this connection; all fixtures roll back.
      await client.query(`
      CREATE TEMP TABLE students (student_no text, name text, course_code text, year_level int, section text, status text,
        storage_room int, storage_cabinet text, storage_drawer int);
      CREATE TEMP TABLE document_types (id int, name text, office_id text, status text, is_compliance boolean, is_requestable boolean);
      CREATE TEMP TABLE student_office_memberships (student_no text, office_id text, status text);
      CREATE TEMP TABLE documents (id serial, student_no text, office_id text, doc_type text, approval_status text,
        original_filename text, mime_type text, size_bytes int, created_at timestamptz, review_note text, reviewed_at timestamptz);
      INSERT INTO students (student_no, name, course_code, year_level, section, status)
        SELECT lpad(i::text, 4, '0'), 'Student ' || i, 'BSIT', 2025, '1', 'Active' FROM generate_series(1, 205) i;
      INSERT INTO students (student_no, name, course_code, year_level, section, status)
        VALUES ('9999', 'Archived Student', 'BSENT', 2024, '2', 'Archived');
      INSERT INTO student_office_memberships SELECT student_no, 'registrar', 'Active' FROM students;
      INSERT INTO document_types VALUES (11, 'Required A', 'registrar', 'Active', true, false),
        (12, 'Required B', 'registrar', 'Active', true, false), (21, 'Required B', 'osas', 'Active', true, false),
        (22, 'Outward Credential', 'registrar', 'Active', false, true);
      INSERT INTO documents (student_no, office_id, doc_type, approval_status)
        SELECT student_no, 'registrar', 'Required A', 'Approved' FROM students WHERE status = 'Active';
      INSERT INTO documents (student_no, office_id, doc_type, approval_status)
        SELECT student_no, 'registrar', 'Required B', 'Approved' FROM students WHERE student_no <= '0200';
      INSERT INTO documents (student_no, office_id, doc_type, approval_status) VALUES
        ('0201', 'registrar', 'Required B', 'Pending'), ('0202', 'registrar', 'Required B', 'Declined'),
        ('0203', 'registrar', 'Required B', 'Approved'), ('0203', 'registrar', 'Required B', 'Pending'),
        ('0204', 'osas', 'Required B', 'Approved');
    `)
      const options = { officeId: "registrar" }
      const summary = await getDigitizationComplianceSummary(options)
      const roster = await getStudentComplianceReport({
        ...options,
        exportAll: true,
      })
      const byType = await getStudentComplianceReport({
        ...options,
        documentTypeId: 12,
        exportAll: true,
      })
      const page = await getStudentComplianceReport({
        ...options,
        complianceStatus: "all",
        offset: 200,
        limit: 20,
      })
      assert.equal(summary.summary.totalStudents, 205)
      assert.equal(summary.summary.notDigitizedStudents, 4)
      assert.equal(roster.total, 4)
      assert.equal(
        byType.total,
        summary.missingByDocumentType.find((t) => t.documentTypeId === 12)
          .missingStudents
      )
      assert.deepEqual(
        roster.students.map((s) => s.studentNo),
        ["0201", "0202", "0204", "0205"]
      )
      assert.equal(page.students.length, 5)
      assert.equal(
        page.records.find((r) => r.student.studentNo === "0203").isCompliant,
        true
      )
      assert.equal(
        (
          await getStudentComplianceReport({
            ...options,
            requireApproved: false,
          })
        ).total,
        3
      )
      assert.equal(
        await getStudentComplianceReport({ ...options, documentTypeId: 21 }),
        null
      )
      assert.equal(
        (
          await getStudentComplianceReport({
            ...options,
            studentStatus: "Archived",
          })
        ).total,
        1
      )
      assert.equal(
        (
          await getStudentComplianceReport({
            ...options,
            courseCodes: ["BSENT"],
          })
        ).total,
        0
      )
      await client.query(
        "INSERT INTO student_office_memberships VALUES ('0204', 'osas', 'Active')"
      )
      const global = await getDigitizationComplianceSummary()
      assert.equal(
        global.missingByDocumentType.find((t) => t.documentTypeId === 21)
          .totalStudents,
        1
      )
      assert.equal(
        global.missingByDocumentType.find((t) => t.documentTypeId === 12)
          .missingStudents,
        4
      )
      await client.query(`
        INSERT INTO documents (student_no, office_id, doc_type, approval_status, created_at)
          SELECT '0201', 'registrar', 'Additional archived document ' || i, 'Approved', '2026-11-02T00:00:00Z'::timestamptz
          FROM generate_series(1, 201) i;
        INSERT INTO documents (student_no, office_id, doc_type, approval_status)
          VALUES ('0201', 'osas', 'Other office document', 'Approved');
      `)
      const studentReport = await getStudentRecordsReport({
        studentNo: "0201",
        officeId: "registrar",
      })
      assert.equal(studentReport.student.studentNo, "0201")
      assert.equal(studentReport.digitizedDocuments.length, 202)
      assert.equal(studentReport.outstandingRequirements[0].status, "pending")
      assert.equal(
        studentReport.outstandingRequirements[0].docType,
        "Required B"
      )
      assert.equal(
        studentReport.digitizedDocuments.some(
          (d) => d.doc_type === "Other office document"
        ),
        false
      )
      assert.equal(
        await getStudentRecordsReport({ studentNo: "0201", officeId: "osas" }),
        null
      )
      assert.equal(
        await getStudentRecordsReport({
          studentNo: "NOT-REGISTERED",
          officeId: "registrar",
        }),
        null
      )
      assert.equal(
        (
          await getStudentRecordsReport({
            studentNo: "9999",
            officeId: "registrar",
          })
        ).student.status,
        "Archived"
      )
      await client.query(
        "UPDATE document_types SET status = 'Archived' WHERE office_id = 'registrar'"
      )
      const noRequirements = await getStudentRecordsReport({
        studentNo: "0201",
        officeId: "registrar",
      })
      assert.equal(noRequirements.meta.configured, false)
      assert.equal(noRequirements.outstandingRequirements.length, 0)
      assert.equal(noRequirements.digitizedDocuments.length, 202)
    } finally {
      await client.query("ROLLBACK")
      await client.end()
    }
  }
)
