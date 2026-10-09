import test from "node:test";
import assert from "node:assert/strict";
import dotenv from "dotenv";

dotenv.config({ path: ".env" });

import {
  normalizeSearchText,
  condenseAlphanumeric,
  tokenizeSearchQuery,
  matchesSearchQuery,
  getDocTypeSearchAliases,
} from "../src/lib/searchUtils.js";

const { postgresSql } = await import("../src/lib/postgresCompat.js");
const { listStudents, createStudent } = await import("../src/lib/studentsRepo.js");
const { listDocuments, createDocument } = await import("../src/lib/documentsRepo.js");
const { listDocumentRequests, createDocumentRequest } = await import("../src/lib/documentRequestsRepo.js");
const { pool, query } = await import("../src/lib/postgres.js");

test("searchUtils unit tests", async (t) => {
  await t.test("normalizeSearchText normalizes case, diacritics, and punctuation", () => {
    assert.equal(
      normalizeSearchText("DELA CRUZ, JUAN M."),
      "dela cruz juan m"
    );
    assert.equal(
      normalizeSearchText("Peña, José!"),
      "pena jose!"
    );
    assert.equal(
      normalizeSearchText("2024-0001-SJ-0"),
      "2024 0001 sj 0"
    );
  });

  await t.test("condenseAlphanumeric extracts purely alphanumeric chars", () => {
    assert.equal(condenseAlphanumeric("2024-0001-SJ-0"), "20240001sj0");
    assert.equal(condenseAlphanumeric("DELA CRUZ, JUAN"), "delacruzjuan");
  });

  await t.test("tokenizeSearchQuery splits queries into tokens", () => {
    assert.deepEqual(tokenizeSearchQuery("  dela   cruz,  juan  "), [
      "dela",
      "cruz",
      "juan",
    ]);
  });

  await t.test("matchesSearchQuery handles case insensitivity on all-caps names", () => {
    const student = ["2024-0001", "DELA CRUZ, JUAN", "BSIT", "1-1"];
    assert.equal(matchesSearchQuery(student, "dela cruz"), true);
    assert.equal(matchesSearchQuery(student, "juan"), true);
    assert.equal(matchesSearchQuery(student, "DELA"), true);
  });

  await t.test("matchesSearchQuery handles queries without commas against names with commas", () => {
    const student = ["2024-0001", "DELA CRUZ, JUAN", "BSIT", "1-1"];
    assert.equal(matchesSearchQuery(student, "dela cruz juan"), true);
    assert.equal(matchesSearchQuery(student, "dela cruz, juan"), true);
  });

  await t.test("matchesSearchQuery handles inverted word order (Firstname Lastname)", () => {
    const student = ["2024-0001", "DELA CRUZ, JUAN", "BSIT", "1-1"];
    assert.equal(matchesSearchQuery(student, "juan dela cruz"), true);
  });

  await t.test("matchesSearchQuery matches unhyphenated student numbers", () => {
    const student = ["2024-0001-SJ-0", "DELA CRUZ, JUAN"];
    assert.equal(matchesSearchQuery(student, "20240001"), true);
    assert.equal(matchesSearchQuery(student, "2024-0001"), true);
  });

  await t.test("matchesSearchQuery handles combined multi-field queries", () => {
    const student = ["2024-0001", "DELA CRUZ, JUAN", "BSIT", "1-1"];
    assert.equal(matchesSearchQuery(student, "BSIT juan"), true);
    assert.equal(matchesSearchQuery(student, "2024 juan"), true);
  });

  await t.test("matchesSearchQuery rejects non-matching queries", () => {
    const student = ["2024-0001", "DELA CRUZ, JUAN", "BSIT", "1-1"];
    assert.equal(matchesSearchQuery(student, "santos"), false);
    assert.equal(matchesSearchQuery(student, "BSBA"), false);
  });
});

test("getDocTypeSearchAliases unit tests", () => {
  assert.ok(getDocTypeSearchAliases("Transcript of Records").includes("tor"));
  assert.ok(getDocTypeSearchAliases("Birth Certificate").includes("psa"));
  assert.ok(getDocTypeSearchAliases("Birth Certificate").includes("birth cert"));
  assert.ok(getDocTypeSearchAliases("Certificate of Registration").includes("cor"));
  assert.ok(getDocTypeSearchAliases("Good Moral Certificate").includes("gmc"));
  assert.ok(getDocTypeSearchAliases("Form 137 / SF10").includes("sf10"));
  assert.deepEqual(getDocTypeSearchAliases(""), []);
});

test("Universal document matrix search matching", () => {
  const student = {
    studentNo: "2024-0001-SJ-0",
    name: "DELA CRUZ, JUAN",
    courseCode: "BSIT",
    section: "1-1",
  };
  const uploadedDoc = {
    doc_type: "Birth Certificate",
    original_filename: "psa_birth_cert_2024.pdf",
    review_note: "verified original copy",
    storage_filename: "uuid-123.pdf",
  };
  const docTargets = [
    student.studentNo,
    student.name,
    student.courseCode,
    student.section,
    uploadedDoc.doc_type,
    ...getDocTypeSearchAliases(uploadedDoc.doc_type),
    uploadedDoc.original_filename,
    uploadedDoc.review_note,
    uploadedDoc.storage_filename,
  ];

  // 1. Matches by document type
  assert.equal(matchesSearchQuery(docTargets, "Birth Certificate"), true);
  assert.equal(matchesSearchQuery(docTargets, "birth"), true);

  // 2. Matches by document alias / acronym
  assert.equal(matchesSearchQuery(docTargets, "PSA"), true);
  assert.equal(matchesSearchQuery(docTargets, "birth cert"), true);

  // 3. Matches by filename
  assert.equal(matchesSearchQuery(docTargets, "psa_birth_cert_2024.pdf"), true);
  assert.equal(matchesSearchQuery(docTargets, "psa_birth"), true);
  assert.equal(matchesSearchQuery(docTargets, ".pdf"), true);

  // 4. Matches by student name + document combined
  assert.equal(matchesSearchQuery(docTargets, "Juan Birth Certificate"), true);
  assert.equal(matchesSearchQuery(docTargets, "Dela Cruz PSA"), true);
  assert.equal(matchesSearchQuery(docTargets, "2024-0001 Birth Certificate"), true);

  // 5. Matches by review note
  assert.equal(matchesSearchQuery(docTargets, "verified original"), true);

  // 6. Rejects unrelated queries
  assert.equal(matchesSearchQuery(docTargets, "Transcript"), false);
  assert.equal(matchesSearchQuery(docTargets, "TOR"), false);
  assert.equal(matchesSearchQuery(docTargets, "Santos"), false);
});

test("postgresCompat translates LIKE to ILIKE for case-insensitivity", () => {
  const sql = "SELECT * FROM documents WHERE original_filename LIKE ? AND doc_type LIKE ?";
  const translated = postgresSql(sql);
  assert.equal(
    translated,
    "SELECT * FROM documents WHERE original_filename ILIKE $1 AND doc_type ILIKE $2"
  );

  const ddl = "CREATE TABLE temp (LIKE public.documents INCLUDING DEFAULTS)";
  const translatedDdl = postgresSql(ddl);
  assert.equal(translatedDdl, ddl, "DDL (LIKE table) must not be corrupted to ILIKE");
});

test("repository integration tests with case-insensitive and comma-tolerant search", async (t) => {
  const suffix = `${Date.now().toString(36).toUpperCase()}`;
  const studentNo = `2024-TEST-${suffix}`;
  const rawStudentNoDigits = `2024TEST${suffix}`;
  const studentName = `DELA CRUZ, JUAN ${suffix}`;
  let docId = null;
  let reqId = null;

  t.after(async () => {
    if (reqId) await query("DELETE FROM document_requests WHERE id = $1", [reqId]);
    if (docId) await query("DELETE FROM documents WHERE id = $1", [docId]);
    await query("DELETE FROM student_office_memberships WHERE student_no = $1", [studentNo]);
    await query("DELETE FROM students WHERE student_no = $1", [studentNo]);
    await pool.end();
  });

  // Ensure course and section exist for registrar
  const courseCode = "BSIT";
  const sectionName = "1-1";

  // Create student
  await createStudent({
    studentNo,
    name: studentName,
    courseCode,
    yearLevel: 2024,
    section: sectionName,
    officeId: "registrar",
  });

  // Create document for student
  const doc = await createDocument({
    studentNo,
    studentName,
    docType: "Transcript of Records",
    originalFilename: `TOR_${suffix}.pdf`,
    storageFilename: `test_${suffix}.pdf`,
    mimeType: "application/pdf",
    sizeBytes: 1024,
    officeId: "registrar",
  });
  docId = doc.id;

  // Create document request for student
  const req = await createDocumentRequest({
    studentNo,
    requesterName: studentName,
    docType: "Transcript of Records",
    notes: `Test request notes ${suffix}`,
    officeId: "registrar",
  });
  reqId = req.id;

  // 1. Verify listStudents with lowercase search without comma ("dela cruz juan")
  const matchedStudents1 = await listStudents({
    officeId: "registrar",
    q: `dela cruz juan ${suffix.toLowerCase()}`,
  });
  assert.ok(
    matchedStudents1.some((s) => s.student_no === studentNo),
    "listStudents should match student using lowercase query without comma"
  );

  // 2. Verify listStudents with inverted name ("juan dela cruz")
  const matchedStudents2 = await listStudents({
    officeId: "registrar",
    q: `juan dela cruz ${suffix.toLowerCase()}`,
  });
  assert.ok(
    matchedStudents2.some((s) => s.student_no === studentNo),
    "listStudents should match student using inverted word order"
  );

  // 3. Verify listStudents with unhyphenated student number
  const matchedStudents3 = await listStudents({
    officeId: "registrar",
    q: rawStudentNoDigits.toLowerCase(),
  });
  assert.ok(
    matchedStudents3.some((s) => s.student_no === studentNo),
    "listStudents should match student using unhyphenated student number"
  );

  // 4. Verify listDocuments with lowercase search without comma
  const matchedDocs = await listDocuments({
    officeId: "registrar",
    q: `dela cruz juan ${suffix.toLowerCase()}`,
  });
  assert.ok(
    matchedDocs.some((d) => d.id === docId),
    "listDocuments should find document using lowercase student name without comma"
  );

  // 5. Verify listDocumentRequests with lowercase search without comma
  const matchedReqs = await listDocumentRequests({
    officeId: "registrar",
    q: `dela cruz juan ${suffix.toLowerCase()}`,
  });
  assert.ok(
    matchedReqs.some((r) => r.id === reqId),
    "listDocumentRequests should find request using lowercase requester name without comma"
  );
});
