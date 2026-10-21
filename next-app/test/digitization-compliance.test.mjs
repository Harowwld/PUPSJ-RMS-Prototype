import test, { mock } from "node:test";
import assert from "node:assert/strict";

const queryCalls = [];
let totalStudentFixture = 2;

mock.module("../src/lib/postgresCompat.js", {
  namedExports: {
    dbAll: async (sql, params = []) => {
      queryCalls.push({ sql, params });
      if (sql.includes("GROUP BY s.course_code")) {
        return [{
          course_code: "BSIT",
          total_students: totalStudentFixture,
          fully_digitized_count: 0,
          total_digitized_docs: totalStudentFixture,
        }];
      }
      if (sql.includes("GROUP BY s.year_level")) return [{ year_level: 2025, count: totalStudentFixture }];
      if (sql.includes("GROUP BY dt.id, dt.name")) {
        return [
          { document_type_id: 11, document_type: "Birth Certificate", total_students: 2, digitized_students: 1, missing_students: 1 },
          { document_type_id: 12, document_type: "Transcript of Records", total_students: 2, digitized_students: 1, missing_students: 1 },
        ];
      }
      if (sql.includes("SELECT s.student_no, s.name, s.course_code")) {
        return [{ student_no: "2025-00001", name: "A STUDENT", course_code: "BSIT" }];
      }
      throw new Error(`Unexpected query: ${sql}`);
    },
    dbGet: async (sql, params = []) => {
      queryCalls.push({ sql, params });
      return { total: 1 };
    },
  },
});

mock.module("../src/lib/postgres.js", {
  namedExports: {
    query: async (sql, params = []) => {
      queryCalls.push({ sql, params });
      return [
        { id: 11, name: "Birth Certificate" },
        { id: 12, name: "Transcript of Records" },
      ];
    },
    queryOne: async (sql, params = []) => {
      queryCalls.push({ sql, params });
      return { id: Number(params[0]), name: "Birth Certificate" };
    },
  },
});

mock.module("../src/lib/studentAuth.js", {
  namedExports: {
    decryptStudentRow: (row) => row,
  },
});

const {
  getDigitizationComplianceSummary,
  getMissingStudentsForDocumentType,
} = await import("../src/lib/digitizationComplianceRepo.js");

test("compliance summary separates document coverage from fully digitized students", async () => {
  queryCalls.length = 0;
  const result = await getDigitizationComplianceSummary({
    studentStatus: "Active",
    courseCodes: ["BSIT"],
    officeId: "registrar",
  });

  assert.equal(result.summary.totalStudents, 2);
  assert.equal(result.summary.totalDigitizedDocsCount, 2);
  assert.equal(result.summary.totalExpectedDocsCount, 4);
  assert.equal(result.summary.percentDigitized, 50);
  assert.equal(result.summary.fullyDigitizedStudents, 0);
  assert.equal(result.summary.fullyDigitizedRate, 0);
  assert.deepEqual(result.missingByDocumentType, [
    {
      documentTypeId: 11,
      documentType: "Birth Certificate",
      totalStudents: 2,
      digitizedStudents: 1,
      missingStudents: 1,
    },
    {
      documentTypeId: 12,
      documentType: "Transcript of Records",
      totalStudents: 2,
      digitizedStudents: 1,
      missingStudents: 1,
    },
  ]);

  const breakdownQuery = queryCalls.find(({ sql }) => sql.includes("GROUP BY dt.id, dt.name"));
  assert.match(breakdownQuery.sql, /d\.approval_status IS NULL OR d\.approval_status != 'Declined'/);
  assert.deepEqual(breakdownQuery.params, ["registrar", "registrar", "registrar", "BSIT"]);
});

test("approved-only missing-student results preserve filters and use bounded pagination", async () => {
  queryCalls.length = 0;
  const result = await getMissingStudentsForDocumentType({
    documentTypeId: "11",
    studentStatus: "Archived",
    courseCodes: ["BSIT"],
    requireApproved: true,
    officeId: "registrar",
    limit: 500,
    offset: 20,
  });

  assert.equal(result.documentType, "Birth Certificate");
  assert.equal(result.total, 1);
  assert.deepEqual(result.students, [
    { student_no: "2025-00001", name: "A STUDENT", course_code: "BSIT" },
  ]);
  assert.equal(result.limit, 100);
  assert.equal(result.offset, 20);

  const listQuery = queryCalls.find(({ sql }) => sql.includes("SELECT s.student_no, s.name, s.course_code"));
  assert.match(listQuery.sql, /d\.approval_status = 'Approved'/);
  assert.match(listQuery.sql, /d\.office_id = \?/);
  assert.match(listQuery.sql, /s\.course_code = \?/);
  assert.match(listQuery.sql, /s\.status != 'Active'/);
  assert.deepEqual(listQuery.params, ["registrar", "BSIT", "Birth Certificate", "registrar", 100, 20]);
});

test("invalid document type identifiers return no results without querying", async () => {
  queryCalls.length = 0;
  const result = await getMissingStudentsForDocumentType({ documentTypeId: "bad-id" });
  assert.equal(result, null);
  assert.equal(queryCalls.length, 0);
});

test("configured document types remain visible when no students match the filters", async () => {
  queryCalls.length = 0;
  totalStudentFixture = 0;
  const result = await getDigitizationComplianceSummary({
    studentStatus: "Active",
    courseCodes: ["BSIT"],
    officeId: "registrar",
  });
  totalStudentFixture = 2;

  assert.equal(result.summary.totalStudents, 0);
  assert.deepEqual(result.missingByDocumentType, [
    { documentTypeId: 11, documentType: "Birth Certificate", totalStudents: 0, digitizedStudents: 0, missingStudents: 0 },
    { documentTypeId: 12, documentType: "Transcript of Records", totalStudents: 0, digitizedStudents: 0, missingStudents: 0 },
  ]);
});
