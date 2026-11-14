import test, { before, beforeEach, after } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { Pool } from "pg";

const enabled = Boolean(process.env.DATABASE_URL);
const schema = `review_duplicates_${crypto.randomBytes(8).toString("hex")}`;
let adminPool;
let pool;
let reviewDocument;
let listReviewDocuments;

before(async () => {
  if (!enabled) return;
  adminPool = new Pool({ connectionString: process.env.DATABASE_URL });
  await adminPool.query(`CREATE SCHEMA ${schema}`);
  const connection = new URL(process.env.DATABASE_URL);
  connection.searchParams.set("options", `-c search_path=${schema}`);
  process.env.DATABASE_URL = connection.toString();
  ({ pool } = await import("../src/lib/postgres.js"));
  ({ reviewDocument, listReviewDocuments } = await import("../src/lib/documentsRepo.js"));
  // A private schema exercises real repository SQL without changing application records.
  await pool.query(`
    CREATE TABLE student_organizations (id text, acronym text, name text);
    CREATE TABLE documents (
      id serial PRIMARY KEY, office_id text, student_no text, student_name text,
      organization_id text, doc_type text, approval_status text DEFAULT 'Pending',
      original_filename text, storage_filename text, created_at timestamptz DEFAULT now(),
      reviewed_by text, reviewed_at timestamptz, review_note text, is_previewed boolean, mime_type text
    );
    CREATE TABLE notifications (
      id serial PRIMARY KEY, office_id text, type text, title text, message text, severity text,
      actor_name text, actor_id text, entity_type text, entity_id text, metadata jsonb, created_at timestamptz
    );
  `);
});

beforeEach(async () => {
  if (enabled) await pool.query("TRUNCATE documents, notifications RESTART IDENTITY");
});

after(async () => {
  if (pool) await pool.end();
  if (adminPool) {
    await adminPool.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);
    await adminPool.end();
  }
});

async function addDocument({ student = "2026-00001", type = "Form 137", office = "registrar", organization = null, status = "Pending" } = {}) {
  const { rows } = await pool.query(
    `INSERT INTO documents (office_id, student_no, organization_id, doc_type, approval_status)
     VALUES ($1, $2, $3, $4, $5) RETURNING id`,
    [office, student, organization, type, status],
  );
  return rows[0].id;
}

const approve = (id, officeId = "registrar") => reviewDocument(
  id, { approvalStatus: "Approved", reviewedBy: "test-reviewer" }, { officeId },
);

test("a second copy for the same student and document type cannot be approved", { skip: !enabled }, async () => {
  const first = await addDocument();
  const second = await addDocument();
  await approve(first);
  await assert.rejects(approve(second), (error) => {
    assert.equal(error.code, "DUPLICATE_DOCUMENT");
    assert.equal(error.duplicateId, first);
    assert.equal(error.existingStatus, "Approved");
    return true;
  });
  const { rows } = await pool.query("SELECT approval_status FROM documents ORDER BY id");
  assert.deepEqual(rows.map((row) => row.approval_status), ["Approved", "Pending"]);
  assert.equal((await pool.query("SELECT * FROM notifications")).rowCount, 1);
});

test("simultaneous approvals leave exactly one approved copy", { skip: !enabled }, async () => {
  for (let attempt = 0; attempt < 10; attempt++) {
    const student = `concurrent-${attempt}`;
    const first = await addDocument({ student });
    const second = await addDocument({ student });
    const outcomes = await Promise.allSettled([approve(first), approve(second)]);
    assert.equal(outcomes.filter((result) => result.status === "fulfilled").length, 1);
    const rejected = outcomes.find((result) => result.status === "rejected");
    assert.equal(rejected.reason.code, "DUPLICATE_DOCUMENT");
    const { rows } = await pool.query(
      "SELECT id FROM documents WHERE student_no = $1 AND approval_status = 'Approved'", [student],
    );
    assert.equal(rows.length, 1);
  }
});

test("document type matching ignores case and surrounding whitespace", { skip: !enabled }, async () => {
  const first = await addDocument();
  const second = await addDocument({ type: " form 137 " });
  await approve(first);
  await assert.rejects(approve(second), { code: "DUPLICATE_DOCUMENT" });
});

test("different students, document types, and offices can each be approved", { skip: !enabled }, async () => {
  const ids = await Promise.all([
    addDocument(),
    addDocument({ student: "2026-00002" }),
    addDocument({ type: "Birth Certificate" }),
    addDocument({ office: "osas" }),
  ]);
  for (const [index, id] of ids.entries()) {
    assert.equal((await approve(id, index === 3 ? "osas" : "registrar")).approval_status, "Approved");
  }
});

test("declining the approved copy permits its pending replacement", { skip: !enabled }, async () => {
  const first = await addDocument();
  const second = await addDocument();
  await approve(first);
  await reviewDocument(first, { approvalStatus: "Declined", reviewedBy: "test-reviewer" }, { officeId: "registrar" });
  assert.equal((await approve(second)).approval_status, "Approved");
});

test("returning an approved copy to Pending permits its replacement", { skip: !enabled }, async () => {
  const first = await addDocument();
  const second = await addDocument();
  await approve(first);
  await reviewDocument(first, { approvalStatus: "Pending" }, { officeId: "registrar" });
  assert.equal((await approve(second)).approval_status, "Approved");
});

test("the same row is excluded from duplicate matching and office scope is preserved", { skip: !enabled }, async () => {
  const id = await addDocument();
  assert.equal(await approve(id, "osas"), null);
  assert.equal((await approve(id)).approval_status, "Approved");
  assert.equal((await approve(id)).approval_status, "Approved");
});

test("organization records have the same approval protection without blocking other organizations", { skip: !enabled }, async () => {
  const options = { student: null, organization: "org-a", office: "osas" };
  const first = await addDocument(options);
  const second = await addDocument(options);
  const other = await addDocument({ ...options, organization: "org-b" });
  await approve(first, "osas");
  await assert.rejects(approve(second, "osas"), { code: "DUPLICATE_DOCUMENT" });
  assert.equal((await approve(other, "osas")).approval_status, "Approved");
});

test("Records Review groups across pages and sorts OSAS records by organization", { skip: !enabled }, async () => {
  await pool.query(`
    INSERT INTO student_organizations (id, name) VALUES ('alpha', 'Alpha Club'), ('zeta', 'Zeta Club');
    INSERT INTO documents (office_id, organization_id, student_name, doc_type, approval_status, created_at)
    VALUES ('osas', 'alpha', 'Zara', 'Certificate', 'Pending', '2025-01-01'),
           ('osas', 'zeta', 'Ava', 'Certificate', 'Approved', '2025-01-02'),
           ('osas', 'zeta', 'Bea', 'Minutes', 'Pending', '2025-01-03');
  `);

  const options = { officeId: "osas", pageSize: 2, sortBy: "student_name", sortOrder: "ASC", groupBy: "status" };
  const firstPage = await listReviewDocuments(options);
  const secondPage = await listReviewDocuments({ ...options, page: 2 });
  assert.equal(firstPage.total, 3);
  assert.deepEqual(firstPage.rows.map(({ organization_name, approval_status }) => [organization_name, approval_status]), [
    ["Alpha Club", "Pending"],
    ["Zeta Club", "Pending"],
  ]);
  assert.equal(secondPage.rows[0].approval_status, "Approved");

  const groupedByType = await listReviewDocuments({ ...options, groupBy: "docType", search: "Club" });
  assert.deepEqual(groupedByType.rows.map(({ doc_type }) => doc_type), ["Certificate", "Certificate"]);

  const ungrouped = await listReviewDocuments({ ...options, sortBy: "created_at", groupBy: "none" });
  assert.deepEqual(ungrouped.rows.map(({ approval_status }) => approval_status), ["Approved", "Pending"]);
});

test("All Records Kanban fills each status lane before paging through remaining records", { skip: !enabled }, async () => {
  await pool.query(`
    INSERT INTO documents (office_id, student_name, doc_type, approval_status, created_at)
    VALUES ('registrar', 'Zoe', 'Form 137', 'Pending', '2025-01-01'),
           ('registrar', 'Ben', 'Form 137', 'Declined', '2025-01-02'),
           ('registrar', 'Cal', 'Form 137', 'Approved', '2025-01-03'),
           ('registrar', 'Dan', 'Form 137', 'Approved', '2025-01-04'),
           ('registrar', 'Amy', 'Form 137', 'Approved', '2025-01-05'),
           ('registrar', 'Eve', 'Transcript', 'Approved', '2025-01-06'),
           ('osas', 'Other office', 'Form 137', 'Approved', '2025-01-07');
  `);
  const options = { officeId: "registrar", pageSize: 3, groupBy: "kanban" };
  const statuses = (result) => result.rows.map((row) => row.approval_status);
  const firstPage = await listReviewDocuments(options);
  const secondPage = await listReviewDocuments({ ...options, page: 2 });
  assert.equal(firstPage.total, 6);
  assert.deepEqual(statuses(firstPage), ["Approved", "Declined", "Pending"]);
  assert.deepEqual(secondPage.rows.map((row) => row.student_name), ["Amy", "Dan", "Cal"]);

  const searched = await listReviewDocuments({ ...options, search: "Form 137" });
  assert.deepEqual(searched.rows.map((row) => row.student_name), ["Amy", "Ben", "Zoe"]);

  const sorted = await listReviewDocuments({ ...options, sortBy: "student_name", sortOrder: "ASC" });
  assert.deepEqual(sorted.rows.map((row) => row.student_name), ["Amy", "Ben", "Zoe"]);

  const declined = await listReviewDocuments({ ...options, statusFilters: ["Declined"] });
  assert.deepEqual(statuses(declined), ["Declined"]);
});
