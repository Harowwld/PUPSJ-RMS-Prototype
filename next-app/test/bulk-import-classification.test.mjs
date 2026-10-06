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

  console.log("\n[Test 4] Executing Bulk Import API with classification fields...");
  const payloadRows = [
    {
      category: "DocumentType",
      name: "Undertaking and Waiver of Right",
      code: "",
      isCompliance: true,
      isRequestable: false,
      complianceCategory: "Admission & Identity",
    },
    {
      category: "DocumentType",
      name: "Diploma",
      code: "",
      isCompliance: false,
      isRequestable: true,
      complianceCategory: "Graduation & Exit Records",
    },
    {
      category: "Course",
      name: "Bachelor of Science in Information Technology",
      code: "BSIT",
    },
    {
      category: "Section",
      name: "1-1",
      code: "BSIT",
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
  assert.equal(importJson.data.successCount, 4, "All 4 rows must be successfully imported/upserted");
  assert.equal(importJson.data.failCount, 0, "Fail count must be 0");
  console.log("✓ Bulk import API parsed and applied classification metadata.");

  // 4. Verify in DB that document types reflect the imported classification
  console.log("\n[Test 5] Verifying DB records reflect classification...");
  const allRegistrarDocs = await listAllDocTypes({ officeId: "registrar" });
  const waiverDoc = allRegistrarDocs.find((d) => d.name === "Undertaking and Waiver of Right");
  assert.ok(waiverDoc, "Undertaking and Waiver of Right must exist");
  assert.equal(waiverDoc.is_compliance, true);
  assert.equal(waiverDoc.is_requestable, false);
  assert.equal(waiverDoc.compliance_category, "Admission & Identity");

  const diplomaDoc = allRegistrarDocs.find((d) => d.name === "Diploma");
  assert.ok(diplomaDoc, "Diploma must exist");
  assert.equal(diplomaDoc.is_compliance, false);
  assert.equal(diplomaDoc.is_requestable, true);
  assert.equal(diplomaDoc.compliance_category, "Graduation & Exit Records");
  console.log("✓ Database records verified with accurate purpose and category attributes.");

  console.log("\n=== ALL BULK IMPORT CLASSIFICATION TESTS PASSED ===");
  process.exit(0);
}

runTests().catch((err) => {
  console.error("Test failed with error:", err);
  process.exit(1);
});
