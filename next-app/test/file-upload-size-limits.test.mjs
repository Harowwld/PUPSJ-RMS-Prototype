import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  DOCUMENT_MAX_SIZE_BYTES,
  DOCUMENT_PAGE_MAX_SIZE_BYTES,
  DOCUMENT_MAX_SIZE_LABEL,
  DOCUMENT_PAGE_MAX_SIZE_LABEL,
  AVATAR_MAX_SIZE_BYTES,
  AVATAR_MAX_SIZE_LABEL,
  ATTACHMENT_MAX_SIZE_BYTES,
  ATTACHMENT_MAX_SIZE_LABEL,
  CSV_IMPORT_MAX_SIZE_BYTES,
  CSV_IMPORT_MAX_SIZE_LABEL,
  HOT_FOLDER_MAX_SIZE_BYTES,
  HOT_FOLDER_MAX_SIZE_LABEL,
  DB_DOCUMENT_MAX_SIZE_BYTES,
  formatBytes,
  validateDocumentFileSize,
} from "../src/lib/uploadLimits.js";
import { query, queryOne, pool } from "../src/lib/postgres.js";
import { createDocument, replaceDocumentFile } from "../src/lib/documentsRepo.js";

test("Upload Limits Constants: Proper byte calculations and human labels", () => {
  assert.equal(DOCUMENT_MAX_SIZE_BYTES, 15 * 1024 * 1024, "Document limit must be 15 MB");
  assert.equal(DOCUMENT_MAX_SIZE_LABEL, "15 MB");

  assert.equal(DOCUMENT_PAGE_MAX_SIZE_BYTES, 10 * 1024 * 1024, "Page image limit must be 10 MB");
  assert.equal(DOCUMENT_PAGE_MAX_SIZE_LABEL, "10 MB");

  assert.equal(AVATAR_MAX_SIZE_BYTES, 5 * 1024 * 1024, "Avatar limit must be 5 MB");
  assert.equal(AVATAR_MAX_SIZE_LABEL, "5 MB");

  assert.equal(ATTACHMENT_MAX_SIZE_BYTES, 10 * 1024 * 1024, "Attachment limit must be 10 MB");
  assert.equal(ATTACHMENT_MAX_SIZE_LABEL, "10 MB");

  assert.equal(CSV_IMPORT_MAX_SIZE_BYTES, 5 * 1024 * 1024, "CSV limit must be 5 MB");
  assert.equal(CSV_IMPORT_MAX_SIZE_LABEL, "5 MB");

  assert.equal(HOT_FOLDER_MAX_SIZE_BYTES, 25 * 1024 * 1024, "Hot folder limit must be 25 MB");
  assert.equal(HOT_FOLDER_MAX_SIZE_LABEL, "25 MB");

  assert.equal(DB_DOCUMENT_MAX_SIZE_BYTES, 25 * 1024 * 1024, "DB ceiling must be 25 MB");
});

test("formatBytes: Accurately formats varied byte amounts", () => {
  assert.equal(formatBytes(0), "0 B");
  assert.equal(formatBytes(-10), "0 B");
  assert.equal(formatBytes(500), "500 B");
  assert.equal(formatBytes(1024), "1 KB");
  assert.equal(formatBytes(1536), "1.5 KB");
  assert.equal(formatBytes(10 * 1024 * 1024), "10 MB");
  assert.equal(formatBytes(15 * 1024 * 1024), "15 MB");
  assert.equal(formatBytes(25 * 1024 * 1024), "25 MB");
});

test("validateDocumentFileSize: Accepts files within limit and rejects oversized files", () => {
  // Document within 15 MB
  const okDoc = validateDocumentFileSize({ size: 14 * 1024 * 1024 });
  assert.equal(okDoc.valid, true);

  // Document exceeding 15 MB
  const oversizedDoc = validateDocumentFileSize({ size: 16 * 1024 * 1024 });
  assert.equal(oversizedDoc.valid, false);
  assert.match(oversizedDoc.error, /exceeds the 15 MB limit/);

  // Raw image page within 10 MB
  const okPage = validateDocumentFileSize({ size: 9 * 1024 * 1024 }, { isImagePage: true });
  assert.equal(okPage.valid, true);

  // Raw image page exceeding 10 MB
  const oversizedPage = validateDocumentFileSize({ size: 11 * 1024 * 1024 }, { isImagePage: true });
  assert.equal(oversizedPage.valid, false);
  assert.match(oversizedPage.error, /exceeds the 10 MB limit/);
});

test("Codebase Contract: ScanUploadTab enforces pre-validation on file selection", () => {
  const filePath = path.resolve(process.cwd(), "src/components/staff/ScanUploadTab.js");
  const content = fs.readFileSync(filePath, "utf8");

  assert.match(content, /DOCUMENT_MAX_SIZE_BYTES/, "ScanUploadTab must reference DOCUMENT_MAX_SIZE_BYTES");
  assert.match(content, /DOCUMENT_PAGE_MAX_SIZE_BYTES/, "ScanUploadTab must reference DOCUMENT_PAGE_MAX_SIZE_BYTES");
  assert.match(content, /oversizedFiles\.length > 0/, "ScanUploadTab must detect oversized files");
  assert.match(content, /File Too Large/, "ScanUploadTab must alert user with File Too Large toast");
});

test("Codebase Contract: staff/page.js intercepts oversized files before queueing and OCR", () => {
  const filePath = path.resolve(process.cwd(), "src/app/staff/page.js");
  const content = fs.readFileSync(filePath, "utf8");

  assert.match(content, /DOCUMENT_MAX_SIZE_BYTES[\s\S]*?from "@\/lib\/uploadLimits"/, "staff/page.js must import upload limits");
  assert.match(content, /const oversized = incomingFiles\.filter/, "handleFileSelect must filter oversized files");
  assert.match(content, /fileToUpload\.size > DOCUMENT_MAX_SIZE_BYTES/, "processSubmission must validate prepared document size before POST");
});

test("Codebase Contract: ResilientPDFViewer enforces 15 MB limit before document re-attachment", () => {
  const filePath = path.resolve(process.cwd(), "src/components/shared/ResilientPDFViewer.js");
  const content = fs.readFileSync(filePath, "utf8");

  assert.match(content, /import.*DOCUMENT_MAX_SIZE_BYTES.*from "@\/lib\/uploadLimits"/, "ResilientPDFViewer must import upload limits");
  assert.match(content, /file\.size > DOCUMENT_MAX_SIZE_BYTES/, "ResilientPDFViewer must check file size before PATCH");
  assert.match(content, /File Too Large/, "ResilientPDFViewer must show toast for oversized replacement PDF");
});

test("Codebase Contract: BulkImport modals enforce 5 MB limit on CSV files", () => {
  const studentModal = fs.readFileSync(path.resolve(process.cwd(), "src/components/staff/BulkImportStudentsModal.js"), "utf8");
  const orgModal = fs.readFileSync(path.resolve(process.cwd(), "src/components/staff/BulkImportOrganizationsModal.js"), "utf8");

  assert.match(studentModal, /CSV_IMPORT_MAX_SIZE_BYTES/, "BulkImportStudentsModal must import CSV_IMPORT_MAX_SIZE_BYTES");
  assert.match(studentModal, /f\.size > CSV_IMPORT_MAX_SIZE_BYTES/, "BulkImportStudentsModal must check CSV size");

  assert.match(orgModal, /CSV_IMPORT_MAX_SIZE_BYTES/, "BulkImportOrganizationsModal must import CSV_IMPORT_MAX_SIZE_BYTES");
  assert.match(orgModal, /f\.size > CSV_IMPORT_MAX_SIZE_BYTES/, "BulkImportOrganizationsModal must check CSV size");
});

test("Codebase Contract: API routes enforce status 413 on payload limit violations", () => {
  const docRoute = fs.readFileSync(path.resolve(process.cwd(), "src/app/api/documents/route.js"), "utf8");
  assert.match(docRoute, /file\.size > DOCUMENT_MAX_SIZE_BYTES/, "POST /api/documents must check file.size");
  assert.match(docRoute, /status:\s*413/, "POST /api/documents must return HTTP 413");

  const docIdRoute = fs.readFileSync(path.resolve(process.cwd(), "src/app/api/documents/[id]/route.js"), "utf8");
  assert.match(docIdRoute, /replacementFile\.size > DOCUMENT_MAX_SIZE_BYTES/, "PATCH /api/documents/[id] must check replacement file size");
  assert.match(docIdRoute, /status:\s*413/, "PATCH /api/documents/[id] must return HTTP 413");

  const ocrRoute = fs.readFileSync(path.resolve(process.cwd(), "src/app/api/ingest/ocr/route.js"), "utf8");
  assert.match(ocrRoute, /file\.size > DOCUMENT_MAX_SIZE_BYTES/, "POST /api/ingest/ocr must check file.size");
  assert.match(ocrRoute, /status:\s*413/, "POST /api/ingest/ocr must return HTTP 413");

  const avatarRoute = fs.readFileSync(path.resolve(process.cwd(), "src/app/api/account/avatar/route.js"), "utf8");
  assert.match(avatarRoute, /file\.size > AVATAR_MAX_SIZE_BYTES/, "POST /api/account/avatar must check file.size against AVATAR_MAX_SIZE_BYTES");
  assert.match(avatarRoute, /status:\s*413/, "POST /api/account/avatar must return HTTP 413");
});

test("Repository Layer: createDocument and replaceDocumentFile reject oversized payloads", async () => {
  // Test createDocument rejection
  await assert.rejects(
    async () => {
      await createDocument({
        officeId: "registrar",
        studentNo: "2024-00001-SJ-0",
        docType: "Transcript of Records",
        sizeBytes: 16 * 1024 * 1024, // 16 MB > 15 MB
      });
    },
    (err) => {
      assert.equal(err.status, 413);
      assert.equal(err.code, "PAYLOAD_TOO_LARGE");
      assert.match(err.message, /exceeds the 15 MB limit/);
      return true;
    }
  );

  // Test replaceDocumentFile rejection
  await assert.rejects(
    async () => {
      await replaceDocumentFile(
        999999,
        {
          originalFilename: "test.pdf",
          sizeBytes: 16 * 1024 * 1024, // 16 MB > 15 MB
        },
        { officeId: "registrar" }
      );
    },
    (err) => {
      assert.equal(err.status, 413);
      assert.equal(err.code, "PAYLOAD_TOO_LARGE");
      assert.match(err.message, /exceeds the 15 MB limit/);
      return true;
    }
  );
});

test("PostgreSQL Schema: Check constraints enforce 25 MB upper bound across tables", async () => {
  const tables = [
    { name: "documents", constraint: "documents_size_bytes_check" },
    { name: "ingest_queue", constraint: "ingest_queue_size_bytes_check" },
    { name: "document_request_attachments", constraint: "doc_req_attachments_size_bytes_check" },
    { name: "event_proposals", constraint: "event_proposals_size_bytes_check" },
    { name: "organization_bylaws_versions", constraint: "organization_bylaws_versions_size_bytes_check" },
    { name: "scan_session_incoming", constraint: "scan_session_incoming_size_bytes_check" },
  ];

  for (const item of tables) {
    const row = await queryOne(
      `SELECT conname, pg_get_constraintdef(c.oid) as def
         FROM pg_constraint c
         JOIN pg_class t ON c.conrelid = t.oid
        WHERE t.relname = $1 AND c.conname = $2`,
      [item.name, item.constraint]
    );

    assert.ok(row, `Constraint ${item.constraint} must exist on table ${item.name}`);
    assert.match(row.def, /26214400/, `Constraint definition on ${item.name} must specify 26214400 bytes`);
  }
});

test("PostgreSQL Schema: Database blocks inserting size_bytes exceeding 25 MB constraint", async () => {
  // Attempting to directly insert 26,214,401 bytes into documents table
  await assert.rejects(
    async () => {
      await query(
        `INSERT INTO documents (
           office_id, student_no, student_name, doc_type, original_filename,
           storage_filename, mime_type, size_bytes
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          "registrar",
          "2024-TEST-SJ-0",
          "TEST STUDENT",
          "Certificate of Registration",
          "test.pdf",
          "test_storage.pdf",
          "application/pdf",
          26214401, // 1 byte over 25 MB limit
        ]
      );
    },
    (err) => {
      // PostgreSQL error code 23514 is check_violation
      assert.equal(err.code, "23514", "PostgreSQL must raise check_violation (23514)");
      assert.match(err.message, /documents_size_bytes_check/, "Error must identify documents_size_bytes_check");
      return true;
    }
  );
});

test("PostgreSQL Schema: Database permits inserting documents within 25 MB constraint", async () => {
  // First ensure student exists
  await query(
    `INSERT INTO students (student_no, name, course_code, year_level, section, storage_room, storage_cabinet, storage_drawer)
     VALUES ('2024-PERM-SJ-0', 'PERMITTED STUDENT', 'BSIT', 2024, '1', 1, 'A', 1)
     ON CONFLICT (student_no) DO NOTHING`
  );
  await query(
    `INSERT INTO student_office_memberships (student_no, office_id, status)
     VALUES ('2024-PERM-SJ-0', 'registrar', 'Active')
     ON CONFLICT (student_no, office_id) DO NOTHING`
  );

  const res = await query(
    `INSERT INTO documents (
       office_id, student_no, student_name, doc_type, original_filename,
       storage_filename, mime_type, size_bytes
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING id, size_bytes`,
    [
      "registrar",
      "2024-PERM-SJ-0",
      "PERMITTED STUDENT",
      "Certificate of Registration",
      "permitted.pdf",
      "permitted_storage.pdf",
      "application/pdf",
      15 * 1024 * 1024, // 15 MB (allowed)
    ]
  );

  assert.ok(res.length > 0, "Insert should succeed");
  const docId = res[0].id;

  // Cleanup
  await query("DELETE FROM documents WHERE id = $1", [docId]);
  await query("DELETE FROM student_office_memberships WHERE student_no = '2024-PERM-SJ-0'");
  await query("DELETE FROM students WHERE student_no = '2024-PERM-SJ-0'");
});

test.after(async () => {
  await pool.end();
});
