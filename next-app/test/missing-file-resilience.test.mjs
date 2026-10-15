import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { queryOne } from "../src/lib/postgres.js";
import { signSessionToken } from "../src/lib/jwt.js";
import { registerSessionToken } from "../src/lib/authSessions.js";
import { getDocumentFilePath } from "../src/lib/documentsRepo.js";

async function run() {
  console.log("=== STARTING MISSING FILE RESILIENCE TEST ===");

  // 1. Find a test document with student account in registrar
  const doc = await queryOne(`
    SELECT d.id, d.student_no, d.original_filename, d.storage_filename, d.office_id, d.mime_type
    FROM documents d
    WHERE d.office_id = 'registrar' AND d.student_no IS NOT NULL
    LIMIT 1
  `);
  if (!doc) throw new Error("No test document found in DB");
  console.log(`[Setup] Using test document id=${doc.id}, student_no=${doc.student_no}`);

  // 2. Prepare Staff Session Token
  const staffJti = crypto.randomUUID();
  const staffPayload = {
    sub: "PUPREGISTRAR-002",
    role: "Staff",
    username: "staff.registrar@pup.local",
    officeId: "registrar",
    office_id: "registrar",
    jti: staffJti,
    purpose: "access",
  };
  const staffToken = await signSessionToken(staffPayload);
  await registerSessionToken(staffToken);

  const filePath = getDocumentFilePath(doc);
  console.log(`[Setup] Document file path on disk: ${filePath}`);

  // Ensure file exists for baseline test
  let tempBackupPath = null;
  const fileExistsOriginally = filePath && fs.existsSync(filePath);
  if (!fileExistsOriginally) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, "%PDF-1.4 baseline test document content");
  }

  try {
    // --- Test 1: Baseline HEAD when file exists ---
    console.log("\n[Test 1] Testing HEAD when file exists on disk...");
    const headResExisting = await fetch(`http://localhost:3000/api/documents/${doc.id}`, {
      method: "HEAD",
      headers: {
        cookie: `pup_session=${staffToken}`,
      },
    });
    assert.equal(headResExisting.status, 200, `Expected 200 for existing file, got ${headResExisting.status}`);
    assert.equal(headResExisting.headers.get("x-frame-options"), "SAMEORIGIN");
    assert.ok(headResExisting.headers.get("content-security-policy")?.includes("frame-ancestors 'self'"));
    console.log("✓ HEAD on existing file returned 200 with security headers.");

    // --- Test 2: HEAD when file is missing from disk ---
    console.log("\n[Test 2] Simulating missing file on disk (renaming file)...");
    tempBackupPath = `${filePath}.bak_test_${Date.now()}`;
    fs.renameSync(filePath, tempBackupPath);

    const headResMissing = await fetch(`http://localhost:3000/api/documents/${doc.id}`, {
      method: "HEAD",
      headers: {
        cookie: `pup_session=${staffToken}`,
      },
    });
    assert.equal(headResMissing.status, 404, `Expected 404 for missing file, got ${headResMissing.status}`);
    assert.equal(headResMissing.headers.get("x-file-missing"), "true", "Expected X-File-Missing header to be 'true'");
    console.log("✓ HEAD on missing file returned 404 with X-File-Missing: true header.");

    // --- Test 3: GET when file is missing from disk ---
    console.log("\n[Test 3] Testing GET when file is missing from disk...");
    const getResMissing = await fetch(`http://localhost:3000/api/documents/${doc.id}`, {
      method: "GET",
      headers: {
        cookie: `pup_session=${staffToken}`,
      },
    });
    assert.equal(getResMissing.status, 404, `Expected 404 for missing file, got ${getResMissing.status}`);
    assert.equal(getResMissing.headers.get("x-file-missing"), "true", "Expected X-File-Missing header to be 'true'");
    const getBody = await getResMissing.json();
    assert.equal(getBody.ok, false);
    assert.equal(getBody.error, "File missing on disk");
    console.log("✓ GET on missing file returned 404 JSON with X-File-Missing header.");
  } finally {
    // Restore file
    if (tempBackupPath && fs.existsSync(tempBackupPath)) {
      fs.renameSync(tempBackupPath, filePath);
    }
  }

  // --- Test 4: Verify System Health Storage Integrity ---
  console.log("\n[Test 4] Testing system health storage integrity metrics...");
  const adminJti = crypto.randomUUID();
  const adminPayload = {
    sub: "PUPREGISTRAR-003",
    role: "Admin",
    username: "admin.registrar@pup.local",
    officeId: "registrar",
    office_id: "registrar",
    jti: adminJti,
    purpose: "access",
  };
  const adminToken = await signSessionToken(adminPayload);
  await registerSessionToken(adminToken);

  const healthRes = await fetch("http://localhost:3000/api/system/health", {
    method: "GET",
    headers: {
      cookie: `pup_session=${adminToken}`,
    },
  });
  const healthData = await healthRes.json();
  assert.ok(healthData.ok, "Expected health check to succeed");
  assert.ok(healthData.data.storage?.integrity, "Expected storage.integrity in health data");
  assert.ok(healthData.data.onlineServices?.archive?.storageIntegrity, "Expected onlineServices.archive.storageIntegrity in health data");
  console.log("✓ Storage integrity reported:", healthData.data.storage.integrity);

  console.log("\n=== ALL MISSING FILE RESILIENCE TESTS PASSED ===");
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Test failed:", err);
    process.exit(1);
  });
