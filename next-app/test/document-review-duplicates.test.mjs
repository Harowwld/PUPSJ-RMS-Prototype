import test, { before, beforeEach, after } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { Pool } from "pg";

const enabled = Boolean(process.env.DATABASE_URL);
const schema = `review_duplicates_${crypto.randomBytes(8).toString("hex")}`;
let adminPool;
let pool;
let reviewDocument;

before(async () => {
  if (!enabled) return;
  adminPool = new Pool({ connectionString: process.env.DATABASE_URL });
  await adminPool.query(`CREATE SCHEMA ${schema}`);
  const connection = new URL(process.env.DATABASE_URL);
  connection.searchParams.set("options", `-c search_path=${schema}`);
  process.env.DATABASE_URL = connection.toString();
  ({ pool } = await import("../src/lib/postgres.js"));
  ({ reviewDocument } = await import("../src/lib/documentsRepo.js"));
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
