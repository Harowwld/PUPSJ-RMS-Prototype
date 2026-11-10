import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

dotenv.config({ path: path.join(rootDir, ".env") });

const { pool, query, queryOne } = await import("../src/lib/postgres.js");
const { updateDocType, createDocType } = await import("../src/lib/docTypesRepo.js");
const { createCourse, updateCourse } = await import("../src/lib/coursesRepo.js");

test("Phase 3: Referential Cascades for Document Types & Courses Suite", async (t) => {
  t.after(async () => {
    await pool.end();
  });

  await t.test("1. Static code contract verification", () => {
    const docTypesPath = path.join(rootDir, "src/lib/docTypesRepo.js");
    const docTypesContent = fs.readFileSync(docTypesPath, "utf8");

    assert.ok(
      docTypesContent.includes("UPDATE documents SET doc_type = $1 WHERE office_id = $2 AND doc_type = $3"),
      "updateDocType must cascade rename to documents"
    );
    assert.ok(
      docTypesContent.includes("UPDATE document_requests SET doc_type = $1 WHERE office_id = $2 AND doc_type = $3"),
      "updateDocType must cascade rename to document_requests"
    );
    assert.ok(
      docTypesContent.includes("UPDATE ingest_queue SET proposed_doc_type = $1 WHERE office_id = $2 AND proposed_doc_type = $3"),
      "updateDocType must cascade rename to ingest_queue"
    );

    const coursesPath = path.join(rootDir, "src/lib/coursesRepo.js");
    const coursesContent = fs.readFileSync(coursesPath, "utf8");

    assert.ok(
      coursesContent.includes("UPDATE sections SET course_code = $1 WHERE office_id = $2 AND course_code = $3"),
      "updateCourse in coursesRepo must cascade to sections"
    );
    assert.ok(
      coursesContent.includes("UPDATE students s") &&
      coursesContent.includes("SET course_code = $1"),
      "updateCourse in coursesRepo must cascade to students"
    );
    assert.ok(
      coursesContent.includes("UPDATE document_requests SET course_code = $1 WHERE office_id = $2 AND course_code = $3"),
      "updateCourse in coursesRepo must cascade to document_requests"
    );

    const coursesRoutePath = path.join(rootDir, "src/app/api/courses/route.js");
    const coursesRouteContent = fs.readFileSync(coursesRoutePath, "utf8");

    assert.ok(
      coursesRouteContent.includes("UPDATE sections SET course_code = $1 WHERE office_id = $2 AND course_code = $3"),
      "api/courses/route.js must cascade to sections"
    );
    assert.ok(
      coursesRouteContent.includes("UPDATE document_requests SET course_code = $1 WHERE office_id = $2 AND course_code = $3"),
      "api/courses/route.js must cascade to document_requests"
    );
  });

  await t.test("2. Dynamic cascade: Renaming a document type cascades to documents and document_requests", async () => {
    const suffix = `${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    const oldDocTypeName = `Test Doc Old ${suffix}`;
    const newDocTypeName = `Test Doc New ${suffix}`;
    const studentNo = `STU-DT-${suffix}`;

    let createdDocType = null;
    let createdDocId = null;
    let createdReqId = null;

    try {
      // 1. Create student record
      await query(
        `INSERT INTO students (student_no, name, course_code, year_level, section, status)
         VALUES ($1, $2, 'BSIT', 2026, '1-1', 'Active')`,
        [studentNo, `Test Student ${suffix}`]
      );
      await query(
        `INSERT INTO student_office_memberships (student_no, office_id, status)
         VALUES ($1, 'registrar', 'Active')`,
        [studentNo]
      );

      // 2. Create document type
      createdDocType = await createDocType(oldDocTypeName, "registrar");
      assert.ok(createdDocType?.id);

      // 3. Create document record
      const docRes = await query(
        `INSERT INTO documents (office_id, student_no, student_name, doc_type, original_filename, storage_filename, mime_type, size_bytes, approval_status)
         VALUES ('registrar', $1, 'Test Student', $2, 'test.pdf', 'test-uuid.pdf', 'application/pdf', 1024, 'Approved')
         RETURNING id`,
        [studentNo, oldDocTypeName]
      );
      createdDocId = docRes[0].id;

      // 4. Create document request record
      const reqRes = await query(
        `INSERT INTO document_requests (office_id, student_no, doc_type, status, requester_name)
         VALUES ('registrar', $1, $2, 'Pending', 'Test Student')
         RETURNING id`,
        [studentNo, oldDocTypeName]
      );
      createdReqId = reqRes[0].id;

      // 5. Perform updateDocType rename
      const updated = await updateDocType(createdDocType.id, newDocTypeName, "Active", "registrar");
      assert.equal(updated.name, newDocTypeName);

      // 6. Verify cascade onto documents
      const docCheck = await queryOne(
        `SELECT doc_type FROM documents WHERE id = $1`,
        [createdDocId]
      );
      assert.equal(docCheck.doc_type, newDocTypeName, "Document record must reflect cascaded doc_type rename");

      // 7. Verify cascade onto document_requests
      const reqCheck = await queryOne(
        `SELECT doc_type FROM document_requests WHERE id = $1`,
        [createdReqId]
      );
      assert.equal(reqCheck.doc_type, newDocTypeName, "Document request record must reflect cascaded doc_type rename");
    } finally {
      if (createdReqId) await query("DELETE FROM document_requests WHERE id = $1", [createdReqId]);
      if (createdDocId) await query("DELETE FROM documents WHERE id = $1", [createdDocId]);
      if (createdDocType?.id) await query("DELETE FROM document_types WHERE id = $1", [createdDocType.id]);
      await query("DELETE FROM student_office_memberships WHERE student_no = $1", [studentNo]);
      await query("DELETE FROM students WHERE student_no = $1", [studentNo]);
    }
  });

  await t.test("3. Dynamic cascade: Renaming a course code cascades to sections, students, and document_requests", async () => {
    const suffix = `${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    const oldCode = `CR${suffix}`;
    const newCode = `CN${suffix}`;
    const blockName = `SEC-${suffix}`;
    const studentNo = `STU-CR-${suffix}`;

    let createdCourse = null;
    let createdReqId = null;

    try {
      // 1. Create course
      createdCourse = await createCourse(oldCode, `Course ${suffix}`, "registrar");
      assert.ok(createdCourse?.id);

      // 2. Create section linked to oldCode
      await query(
        `INSERT INTO sections (office_id, name, course_code, status)
         VALUES ('registrar', $1, $2, 'Active')`,
        [blockName, oldCode]
      );

      // 3. Create student linked to oldCode
      await query(
        `INSERT INTO students (student_no, name, course_code, year_level, section, status)
         VALUES ($1, $2, $3, 2026, $4, 'Active')`,
        [studentNo, `Student ${suffix}`, oldCode, blockName]
      );
      await query(
        `INSERT INTO student_office_memberships (student_no, office_id, status)
         VALUES ($1, 'registrar', 'Active')`,
        [studentNo]
      );

      // 4. Create document request linked to oldCode
      const reqRes = await query(
        `INSERT INTO document_requests (office_id, student_no, course_code, doc_type, status, requester_name)
         VALUES ('registrar', $1, $2, 'Certificate of Grades', 'Pending', 'Test Student')
         RETURNING id`,
        [studentNo, oldCode]
      );
      createdReqId = reqRes[0].id;

      // 5. Perform updateCourse rename
      const updated = await updateCourse(createdCourse.id, newCode, `Course Updated ${suffix}`, "Active", "registrar");
      assert.equal(updated.code, newCode);

      // 6. Verify cascade onto sections
      const secCheck = await queryOne(
        `SELECT course_code FROM sections WHERE office_id = 'registrar' AND name = $1`,
        [blockName]
      );
      assert.equal(secCheck.course_code, newCode, "Section must reflect cascaded course_code rename");

      // 7. Verify cascade onto students
      const stuCheck = await queryOne(
        `SELECT course_code FROM students WHERE student_no = $1`,
        [studentNo]
      );
      assert.equal(stuCheck.course_code, newCode, "Student must reflect cascaded course_code rename");

      // 8. Verify cascade onto document_requests
      const reqCheck = await queryOne(
        `SELECT course_code FROM document_requests WHERE id = $1`,
        [createdReqId]
      );
      assert.equal(reqCheck.course_code, newCode, "Document request must reflect cascaded course_code rename");
    } finally {
      if (createdReqId) await query("DELETE FROM document_requests WHERE id = $1", [createdReqId]);
      await query("DELETE FROM student_office_memberships WHERE student_no = $1", [studentNo]);
      await query("DELETE FROM students WHERE student_no = $1", [studentNo]);
      await query("DELETE FROM sections WHERE office_id = 'registrar' AND course_code = ANY($1::text[])", [[oldCode, newCode]]);
      if (createdCourse?.id) await query("DELETE FROM courses WHERE id = $1", [createdCourse.id]);
    }
  });
});
