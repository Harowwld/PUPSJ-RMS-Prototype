import dotenv from "dotenv";
dotenv.config({ path: ".env" });

import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";

const { listDocTypes, listAllDocTypes, createDocTypeFull } = await import("../src/lib/docTypesRepo.js");

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:3000";
const STAFF_PASSWORD = process.env.DEFAULT_STAFF_PASSWORD || "pupstaff";
const CSV_PATH = path.resolve(process.cwd(), "../_SAMPLE_DATA/system_data - final.csv");

function extractCookies(res) {
  const setCookies = res.headers.getSetCookie();
  const cookies = {};
  for (const sc of setCookies) {
    const [pair] = sc.split(";");
    const [k, v] = pair.split("=");
    if (k && v) cookies[k.trim()] = v.trim();
  }
  return {
    cookieHeader: Object.entries(cookies).map(([k, v]) => `${k}=${v}`).join("; "),
    csrfToken: cookies["pup_csrf"] || "",
  };
}

async function runTests() {
  console.log("=== STARTING BULK IMPORT CLASSIFICATION TEST ===");

  // 1. Validate _SAMPLE_DATA/system_data - final.csv integrity
  console.log("\n[Test 1] Validating CSV file format and content in _SAMPLE_DATA/system_data - final.csv...");
  assert.ok(fs.existsSync(CSV_PATH), "system_data - final.csv must exist");
  const rawCsv = fs.readFileSync(CSV_PATH, "utf8");
  const lines = rawCsv.split(/\r?\n/).filter((l) => l.trim().length > 0);
  assert.ok(lines.length > 50, "CSV should contain headers and rows (> 50)");

  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
  assert.deepEqual(
    headers,
    ["category", "name", "code", "iscompliance", "isrequestable", "compliancecategory"],
    "CSV must declare explicit classification headers"
  );

  let docTypeCount = 0;
  let complianceCount = 0;
  let requestableCount = 0;
  let dualPurposeCount = 0;
  let courseCount = 0;
  let sectionCount = 0;

  for (const line of lines.slice(1)) {
    const parts = line.split(",").map((p) => p.trim());
    const [category, name, code, isComp, isReq, compCat] = parts;
    if (category.toLowerCase() === "documenttype") {
      docTypeCount++;
      const comp = isComp.toLowerCase() === "true";
      const req = isReq.toLowerCase() === "true";
      if (comp && req) dualPurposeCount++;
      else if (comp) complianceCount++;
      else if (req) requestableCount++;
      assert.ok(compCat.length > 0, `Document type '${name}' must have a complianceCategory`);
    } else if (category.toLowerCase() === "course") {
      courseCount++;
      assert.ok(code.length > 0, `Course '${name}' must have a code`);
    } else if (category.toLowerCase() === "section") {
      sectionCount++;
      assert.ok(code.length > 0, `Section '${name}' must reference a program code`);
    }
  }

  console.log(`CSV Statistics:
    - Document Types: ${docTypeCount} (Compliance: ${complianceCount}, Requestable: ${requestableCount}, Dual: ${dualPurposeCount})
    - Courses: ${courseCount}
    - Sections: ${sectionCount}`);

  assert.ok(docTypeCount >= 25, "Must have at least 25 document types");
  assert.ok(complianceCount >= 10, "Must have at least 10 compliance document types");
  assert.ok(requestableCount >= 10, "Must have at least 10 requestable document types");
  assert.ok(courseCount >= 7, "Must have all 7 standard courses");
  assert.ok(sectionCount >= 30, "Must have sections populated");
  console.log("✓ CSV file structure and classification coverage verified.");

  // 2. Test createDocTypeFull upsert capabilities
  console.log("\n[Test 2] Testing createDocTypeFull with upsert: true...");
  const upsertedTest = await createDocTypeFull("Test Ingestion Credential", "registrar", {
    isCompliance: true,
    isRequestable: false,
    complianceCategory: "Admission & Identity",
    upsert: true,
  });
  assert.equal(upsertedTest.name, "Test Ingestion Credential");
  assert.equal(upsertedTest.is_compliance, true);
  assert.equal(upsertedTest.is_requestable, false);

  // Now upsert again with modified purpose
  const updatedTest = await createDocTypeFull("Test Ingestion Credential", "registrar", {
    isCompliance: false,
    isRequestable: true,
    complianceCategory: "Graduation & Exit Records",
    upsert: true,
  });
  assert.equal(updatedTest.id, upsertedTest.id, "ID must remain unchanged across upserts");
  assert.equal(updatedTest.is_compliance, false, "is_compliance should be updated to false");
  assert.equal(updatedTest.is_requestable, true, "is_requestable should be updated to true");
  assert.equal(updatedTest.compliance_category, "Graduation & Exit Records");
  console.log("✓ createDocTypeFull gracefully upserts without throwing duplicate error.");

  // 3. Test Bulk Import API endpoint (/api/system/bulk-import)
  console.log("\n[Test 3] Authenticating as Registrar Admin...");
  const adminLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: "admin.registrar@pup.local", password: STAFF_PASSWORD }),
  });
  assert.equal(adminLoginRes.status, 200, "Admin login must succeed");
  const adminAuth = extractCookies(adminLoginRes);

  const { dbRun } = await import("../src/lib/postgresCompat.js");
  // Clean up test records from any previous runs
  await dbRun("DELETE FROM sections WHERE office_id = 'registrar' AND name = '1-1' AND course_code = 'BSTEST'");
  await dbRun("DELETE FROM courses WHERE office_id = 'registrar' AND code = 'BSTEST'");
  await dbRun("DELETE FROM document_types WHERE office_id = 'registrar' AND name_norm IN ('bulk test compliance document', 'bulk test requestable document')");

  console.log("\n[Test 4] Executing Bulk Import API with new classification rows...");
  const payloadRows = [
    {
      category: "DocumentType",
      name: "Bulk Test Compliance Document",
      code: "",
      isCompliance: true,
      isRequestable: false,
    },
    {
      category: "DocumentType",
      name: "Bulk Test Requestable Document",
      code: "",
      isCompliance: false,
      isRequestable: true,
    },
    {
      category: "Course",
      name: "Bachelor of Science in Testing",
      code: "BSTEST",
    },
    {
      category: "Section",
      name: "1-1",
      code: "BSTEST",
    },
  ];

  const importRes = await fetch(`${BASE_URL}/api/system/bulk-import`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      cookie: adminAuth.cookieHeader,
    },
    body: JSON.stringify({
      officeId: "registrar",
      rows: payloadRows,
    }),
  });

  assert.equal(importRes.status, 200, "Bulk import API must return 200");
  const importJson = await importRes.json();
  assert.equal(importJson.ok, true, "Bulk import response ok must be true");
  console.log("Import response:", importJson.data);
  assert.equal(importJson.data.successCount, 4, "All 4 new rows must be successfully imported");
  assert.equal(importJson.data.failCount, 0, "Fail count must be 0 on first import");
  console.log("✓ Bulk import API parsed and applied classification metadata.");

  // 4. Verify in DB that document types reflect the imported classification
  console.log("\n[Test 5] Verifying DB records reflect classification...");
  const allRegistrarDocs = await listAllDocTypes({ officeId: "registrar" });
  const waiverDoc = allRegistrarDocs.find((d) => d.name === "Bulk Test Compliance Document");
  assert.ok(waiverDoc, "Bulk Test Compliance Document must exist");
  assert.equal(waiverDoc.is_compliance, true);
  assert.equal(waiverDoc.is_requestable, false);

  const diplomaDoc = allRegistrarDocs.find((d) => d.name === "Bulk Test Requestable Document");
  assert.ok(diplomaDoc, "Bulk Test Requestable Document must exist");
  assert.equal(diplomaDoc.is_compliance, false);
  assert.equal(diplomaDoc.is_requestable, true);
  console.log("✓ Database records verified with accurate purpose attributes.");

  // 5. Test Re-importing the same CSV content: must report all 4 as duplicates (failCount: 4, successCount: 0)
  console.log("\n[Test 6] Re-importing identical batch: verifying duplicate detection...");
  const duplicateRes = await fetch(`${BASE_URL}/api/system/bulk-import`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      cookie: adminAuth.cookieHeader,
    },
    body: JSON.stringify({
      officeId: "registrar",
      rows: payloadRows,
    }),
  });
  assert.equal(duplicateRes.status, 200, "Duplicate bulk import must return 200");
  const duplicateJson = await duplicateRes.json();
  assert.equal(duplicateJson.ok, true, "Duplicate response ok must be true");
  console.log("Duplicate import response:", duplicateJson.data);
  assert.equal(duplicateJson.data.successCount, 0, "0 new records must be added on duplicate re-import");
  assert.equal(duplicateJson.data.failCount, 4, "All 4 records must be identified as duplicates/skipped");
  console.log("✓ Duplicate detection verified: identical records are correctly skipped as duplicates.");

  // Clean up test records
  await dbRun("DELETE FROM sections WHERE office_id = 'registrar' AND name = '1-1' AND course_code = 'BSTEST'");
  await dbRun("DELETE FROM courses WHERE office_id = 'registrar' AND code = 'BSTEST'");
  await dbRun("DELETE FROM document_types WHERE office_id = 'registrar' AND name_norm IN ('bulk test compliance document', 'bulk test requestable document')");

  // 6. Test Bulk Import and duplicate detection for OSAS office
  console.log("\n[Test 7] Authenticating as OSAS Admin...");
  const osasLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: "admin.osas@pup.local", password: STAFF_PASSWORD }),
  });
  assert.equal(osasLoginRes.status, 200, "OSAS Admin login must succeed");
  const osasAuth = extractCookies(osasLoginRes);

  await dbRun("DELETE FROM document_types WHERE office_id = 'osas' AND name_norm IN ('osas test compliance doc', 'osas test requestable doc')");

  const osasPayloadRows = [
    {
      category: "DocumentType",
      name: "OSAS Test Compliance Doc",
      code: "",
      isCompliance: true,
      isRequestable: false,
    },
    {
      category: "DocumentType",
      name: "OSAS Test Requestable Doc",
      code: "",
      isCompliance: false,
      isRequestable: true,
    },
  ];

  console.log("\n[Test 8] Executing OSAS Bulk Import and duplicate detection...");
  const osasImportRes = await fetch(`${BASE_URL}/api/system/bulk-import`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      cookie: osasAuth.cookieHeader,
    },
    body: JSON.stringify({
      officeId: "osas",
      rows: osasPayloadRows,
    }),
  });
  assert.equal(osasImportRes.status, 200, "OSAS bulk import must succeed");
  const osasImportJson = await osasImportRes.json();
  assert.equal(osasImportJson.data.successCount, 2, "2 OSAS rows must be successfully imported");
  assert.equal(osasImportJson.data.failCount, 0, "0 failures on first OSAS import");

  // Re-importing identical OSAS rows
  const osasDuplicateRes = await fetch(`${BASE_URL}/api/system/bulk-import`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      cookie: osasAuth.cookieHeader,
    },
    body: JSON.stringify({
      officeId: "osas",
      rows: osasPayloadRows,
    }),
  });
  const osasDuplicateJson = await osasDuplicateRes.json();
  assert.equal(osasDuplicateJson.data.successCount, 0, "0 new records added on duplicate OSAS re-import");
  assert.equal(osasDuplicateJson.data.failCount, 2, "Both OSAS records skipped as duplicates");
  console.log("✓ OSAS bulk import and duplicate detection verified.");

  await dbRun("DELETE FROM document_types WHERE office_id = 'osas' AND name_norm IN ('osas test compliance doc', 'osas test requestable doc')");

  console.log("\n=== ALL BULK IMPORT CLASSIFICATION TESTS PASSED ===");
  process.exit(0);
}

runTests().catch((err) => {
  console.error("Test failed with error:", err);
  process.exit(1);
});
