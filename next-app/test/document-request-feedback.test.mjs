import test from "node:test";
import assert from "node:assert/strict";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config();

const { query, queryOne } = await import("../src/lib/postgres.js");

test("Student Document Request Feedback & Rating Test Suite", async (t) => {
  let testStudentAccount = null;
  let testRequest = null;

  t.before(async () => {
    // 1. Get or create a test student account and document request
    testStudentAccount = await queryOne(
      "SELECT id, student_no, email FROM student_accounts WHERE status = 'Active' LIMIT 1"
    );
    assert.ok(testStudentAccount, "A test student account must exist in the database");

    // Create a disposable document request for this student
    testRequest = await queryOne(
      `INSERT INTO document_requests (office_id, student_no, doc_type, status, notes, client_type, student_account_id)
       VALUES ('registrar', $1, 'Certificate of Grades', 'Pending', 'Test request for feedback unit test', 'Student', $2)
       RETURNING *`,
      [testStudentAccount.student_no, testStudentAccount.id]
    );
    assert.ok(testRequest, "Disposable document request should be created");
  });

  t.after(async () => {
    // Cleanup disposable test records
    if (testRequest?.id) {
      await query("DELETE FROM document_request_feedback WHERE document_request_id = $1", [testRequest.id]);
      await query("DELETE FROM document_requests WHERE id = $1", [testRequest.id]);
    }
  });

  await t.test("1. Table constraint: rating must be between 1 and 5", async () => {
    await assert.rejects(
      async () => {
        await query(
          `INSERT INTO document_request_feedback (document_request_id, student_account_id, rating)
           VALUES ($1, $2, 0)`,
          [testRequest.id, testStudentAccount.id]
        );
      },
      /check constraint.*rating/i,
      "Rating 0 must violate check constraint"
    );

    await assert.rejects(
      async () => {
        await query(
          `INSERT INTO document_request_feedback (document_request_id, student_account_id, rating)
           VALUES ($1, $2, 6)`,
          [testRequest.id, testStudentAccount.id]
        );
      },
      /check constraint.*rating/i,
      "Rating 6 must violate check constraint"
    );
  });

  await t.test("2. Successful feedback insertion with aspect tags and comments", async () => {
    const inserted = await queryOne(
      `INSERT INTO document_request_feedback (
         document_request_id,
         student_account_id,
         student_no,
         rating,
         aspect_tags,
         comments,
         created_at,
         updated_at
       )
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
       RETURNING *`,
      [
        testRequest.id,
        testStudentAccount.id,
        testStudentAccount.student_no,
        5,
        ["Easy process", "Fast submission"],
        "Very smooth and seamless document request experience.",
      ]
    );

    assert.ok(inserted, "Feedback record should be inserted");
    assert.equal(inserted.rating, 5, "Rating should be 5");
    assert.deepEqual(inserted.aspect_tags, ["Easy process", "Fast submission"]);
    assert.equal(inserted.comments, "Very smooth and seamless document request experience.");
    assert.equal(Number(inserted.document_request_id), Number(testRequest.id));
  });

  await t.test("3. Unique constraint: only one feedback per document request", async () => {
    await assert.rejects(
      async () => {
        await query(
          `INSERT INTO document_request_feedback (document_request_id, student_account_id, rating)
           VALUES ($1, $2, 4)`,
          [testRequest.id, testStudentAccount.id]
        );
      },
      /unique constraint|duplicate key/i,
      "Duplicate feedback insertion for same request must violate unique constraint"
    );
  });

  await t.test("4. Upsert feedback: updating rating and aspect tags", async () => {
    const updated = await queryOne(
      `INSERT INTO document_request_feedback (
         document_request_id,
         student_account_id,
         student_no,
         rating,
         aspect_tags,
         comments,
         created_at,
         updated_at
       )
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
       ON CONFLICT (document_request_id)
       DO UPDATE SET
         rating = EXCLUDED.rating,
         aspect_tags = EXCLUDED.aspect_tags,
         comments = EXCLUDED.comments,
         updated_at = NOW()
       RETURNING *`,
      [
        testRequest.id,
        testStudentAccount.id,
        testStudentAccount.student_no,
        4,
        ["Clear requirements"],
        "Updated: good overall.",
      ]
    );

    assert.ok(updated, "Feedback record should be updated");
    assert.equal(updated.rating, 4, "Rating should be updated to 4");
    assert.deepEqual(updated.aspect_tags, ["Clear requirements"]);
    assert.equal(updated.comments, "Updated: good overall.");

    // Verify only 1 row exists
    const rows = await query(
      "SELECT id FROM document_request_feedback WHERE document_request_id = $1",
      [testRequest.id]
    );
    assert.equal(rows.length, 1, "There must be exactly one feedback record per document request");
  });

  await t.test("5. Student query LEFT JOIN returns mapped feedback object", async () => {
    const rows = await query(
      `SELECT dr.*,
              rf.id AS feedback_id,
              rf.rating AS feedback_rating,
              rf.aspect_tags AS feedback_aspect_tags,
              rf.comments AS feedback_comments,
              rf.created_at AS feedback_created_at
       FROM document_requests dr
       LEFT JOIN document_request_feedback rf ON rf.document_request_id = dr.id
       WHERE dr.id = $1`,
      [testRequest.id]
    );

    assert.equal(rows.length, 1);
    const row = rows[0];
    assert.ok(row.feedback_id, "feedback_id must be populated");
    assert.equal(row.feedback_rating, 4);
    assert.deepEqual(row.feedback_aspect_tags, ["Clear requirements"]);
    assert.equal(row.feedback_comments, "Updated: good overall.");
  });

  await t.test("6. Registrar query LEFT JOIN returns feedback for staff view", async () => {
    const rows = await query(
      `SELECT dr.*,
              rf.id AS feedback_id,
              rf.rating AS feedback_rating,
              rf.aspect_tags AS feedback_aspect_tags,
              rf.comments AS feedback_comments
       FROM document_requests dr
       LEFT JOIN document_request_feedback rf ON rf.document_request_id = dr.id
       WHERE dr.id = $1 AND dr.office_id = 'registrar'`,
      [testRequest.id]
    );

    assert.equal(rows.length, 1);
    assert.equal(rows[0].feedback_rating, 4);
  });

  await t.test("7. Cascade deletion: deleting document_request deletes feedback", async () => {
    // Create a temporary request and feedback
    const tempReq = await queryOne(
      `INSERT INTO document_requests (office_id, student_no, doc_type, status, notes, client_type)
       VALUES ('registrar', $1, 'Certificate of Enrollment', 'Pending', 'Cascade test', 'Student')
       RETURNING id`,
      [testStudentAccount.student_no]
    );

    await query(
      `INSERT INTO document_request_feedback (document_request_id, rating)
       VALUES ($1, 5)`,
      [tempReq.id]
    );

    // Verify feedback exists
    const before = await queryOne(
      "SELECT id FROM document_request_feedback WHERE document_request_id = $1",
      [tempReq.id]
    );
    assert.ok(before, "Feedback must exist before deletion");

    // Delete the request
    await query("DELETE FROM document_requests WHERE id = $1", [tempReq.id]);

    // Verify feedback was cascade-deleted
    const after = await queryOne(
      "SELECT id FROM document_request_feedback WHERE document_request_id = $1",
      [tempReq.id]
    );
    assert.equal(after, null, "Feedback must be automatically cascade-deleted when document request is removed");
  });
});
