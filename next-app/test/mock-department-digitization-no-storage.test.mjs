import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config();

import assert from "node:assert/strict";

const { getOfficeById } = await import("../src/lib/officesRepo.js");
const { listDocTypes, listAllDocTypes } = await import("../src/lib/docTypesRepo.js");
const { query } = await import("../src/lib/postgres.js");

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:3000";

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
  console.log("=== STARTING MOCK DEPARTMENT DIGITIZATION WITHOUT STORAGE TEST ===");

  // 1. Verify Office Registration & Station Workstation Binding
  console.log("\n[Test 1] Verifying Accounting Office & Station Workstation binding in database...");
  const office = await getOfficeById("accounting");
  assert.ok(office, "Accounting office must exist in offices table");
  assert.equal(office.id, "accounting");
  assert.equal(office.short_name, "Accounting");
  assert.equal(office.station_name, "ACCT-DIGISCAN-01");
  assert.ok(office.scanner_model.includes("Fujitsu fi-8170"), "Scanner model must be Fujitsu fi-8170");
  assert.equal(office.storage_path, ".local/storage/accounting/uploads");
  assert.equal(office.inbound_path, ".local/hot-folder/INBOUND/ACCOUNTING");
  assert.equal(office.status, "Active");
  console.log("✓ Accounting office and station hardware configuration verified.");

  // 2. Verify Module Matrix Configuration (Digitization ON, Storage Layout OFF)
  console.log("\n[Test 2] Verifying Module Matrix: Digitization ON, Physical Storage OFF...");
  const modules = await query(
    `SELECT module_id, enabled FROM office_modules WHERE office_id = 'accounting'`
  );
  const moduleMap = new Map(modules.map((m) => [m.module_id, m.enabled]));

  // Digitization modules MUST be enabled
  assert.equal(moduleMap.get("scan_upload"), true, "scan_upload must be enabled");
  assert.equal(moduleMap.get("records_review"), true, "records_review must be enabled");
  assert.equal(moduleMap.get("documents"), true, "documents must be enabled");
  assert.equal(moduleMap.get("compliance_analytics"), true, "compliance_analytics must be enabled");
  assert.equal(moduleMap.get("system_config"), true, "system_config must be enabled");

  // Physical storage modules MUST be disabled
  assert.equal(moduleMap.get("storage_layout"), false, "storage_layout MUST be disabled");
  assert.equal(moduleMap.get("storage_explorer"), false, "storage_explorer MUST be disabled");
  assert.equal(moduleMap.get("records_archive"), false, "records_archive MUST be disabled");
  console.log("✓ Module matrix successfully isolates digitization from physical storage layout.");

  // 3. Test Admin Authentication & Module Gating
  console.log("\n[Test 3] Authenticating as Accounting Admin (admin.accounting@pup.local)...");
  const adminLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: "admin.accounting@pup.local", password: "pupstaff" }),
  });
  assert.equal(adminLoginRes.status, 200, "Admin login must succeed");
  const adminAuth = extractCookies(adminLoginRes);

  const adminMeRes = await fetch(`${BASE_URL}/api/auth/me`, {
    headers: { cookie: adminAuth.cookieHeader },
  });
  assert.equal(adminMeRes.status, 200);
  const adminMeJson = await adminMeRes.json();
  assert.equal(adminMeJson.ok, true);
  assert.equal(adminMeJson.data.office_id, "accounting");
  assert.equal(adminMeJson.data.station_name, "ACCT-DIGISCAN-01");

  const adminModules = adminMeJson.data.enabled_modules || [];
  assert.ok(adminModules.includes("records_review"), "Admin must have records_review");
  assert.ok(adminModules.includes("compliance_analytics"), "Admin must have compliance_analytics");
  assert.ok(adminModules.includes("scan_upload"), "Admin must have scan_upload");
  assert.ok(adminModules.includes("documents"), "Admin must have documents");
  assert.ok(!adminModules.includes("storage_layout"), "Admin must NOT have storage_layout");
  assert.ok(!adminModules.includes("storage_explorer"), "Admin must NOT have storage_explorer");
  assert.ok(!adminModules.includes("records_archive"), "Admin must NOT have records_archive");
  console.log("✓ Accounting Admin receives digitization features without storage layout.");

  // 4. Test Staff Authentication & Module Gating
  console.log("\n[Test 4] Authenticating as Accounting Staff (staff.accounting@pup.local)...");
  const staffLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: "staff.accounting@pup.local", password: "pupstaff" }),
  });
  assert.equal(staffLoginRes.status, 200, "Staff login must succeed");
  const staffAuth = extractCookies(staffLoginRes);

  const staffMeRes = await fetch(`${BASE_URL}/api/auth/me`, {
    headers: { cookie: staffAuth.cookieHeader },
  });
  assert.equal(staffMeRes.status, 200);
  const staffMeJson = await staffMeRes.json();
  assert.equal(staffMeJson.ok, true);
  assert.equal(staffMeJson.data.office_id, "accounting");
  assert.equal(staffMeJson.data.station_name, "ACCT-DIGISCAN-01");

  const staffModules = staffMeJson.data.enabled_modules || [];
  assert.ok(staffModules.includes("scan_upload"), "Staff must have scan_upload");
  assert.ok(staffModules.includes("documents"), "Staff must have documents");
  assert.ok(!staffModules.includes("storage_layout"), "Staff must NOT have storage_layout");
  assert.ok(!staffModules.includes("storage_explorer"), "Staff must NOT have storage_explorer");
  assert.ok(!staffModules.includes("records_archive"), "Staff must NOT have records_archive");
  console.log("✓ Accounting Staff receives digitization intake tools without physical storage tabs.");

  // 5. Test Document Types Scoping for Accounting
  console.log("\n[Test 5] Querying document types for accounting department...");
  const acctDocTypes = await listDocTypes({ officeId: "accounting" });
  console.log("Accounting Document Types:", acctDocTypes);
  assert.ok(acctDocTypes.includes("Disbursement Voucher"));
  assert.ok(acctDocTypes.includes("Official Receipt (OR)"));
  assert.ok(acctDocTypes.includes("Purchase Order (PO)"));
  assert.ok(!acctDocTypes.includes("Form 137"), "Accounting must NOT see Registrar documents");
  assert.ok(!acctDocTypes.includes("Event Proposal"), "Accounting must NOT see OSAS documents");
  console.log("✓ Accounting document types are isolated and accurately configured.");

  // 6. Test Digital Documents Repository for Accounting
  console.log("\n[Test 6] Fetching digital documents for Accounting...");
  const docsRes = await fetch(`${BASE_URL}/api/documents?officeId=accounting`, {
    headers: { cookie: adminAuth.cookieHeader },
  });
  assert.equal(docsRes.status, 200);
  const docsJson = await docsRes.json();
  assert.equal(docsJson.ok, true);
  assert.ok(docsJson.data.length >= 4, "Accounting must have at least 4 sample documents");
  const docTypesInRepo = docsJson.data.map((d) => d.doc_type);
  assert.ok(docTypesInRepo.includes("Disbursement Voucher"));
  assert.ok(docTypesInRepo.includes("Official Receipt (OR)"));
  assert.ok(docTypesInRepo.includes("Purchase Order (PO)"));
  console.log("✓ Digital documents retrieved successfully from accounting digital repository.");

  console.log("\n=== ALL MOCK DEPARTMENT DIGITIZATION TESTS PASSED ===");
  process.exit(0);
}

runTests().catch((err) => {
  console.error("Test failed with error:", err);
  process.exit(1);
});
