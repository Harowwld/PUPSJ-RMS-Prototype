import test from "node:test";
import assert from "node:assert/strict";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config();

const {
  listOrganizations,
  getOrganizationById,
  getOfficersByOrganizationId,
  addOfficer,
  removeOfficer,
  getOrganizationsForStudentEmail,
  isStudentOfficerForOrg,
  updateOrganizationBylaws,
} = await import("../src/lib/organizationsRepo.js");

const { query, queryOne } = await import("../src/lib/postgres.js");

test("OSAS Organization & Whitelist Architecture", async (t) => {
  await t.test("1. Seeded student organizations exist in PostgreSQL", async () => {
    const orgs = await listOrganizations();
    assert.ok(Array.isArray(orgs), "Should return array of organizations");
    assert.ok(orgs.length >= 5, "Should have at least 5 seeded organizations");

    const hhco = orgs.find((o) => o.id === "helping-hands");
    assert.ok(hhco, "Helping Hands Community Organization should exist");
    assert.equal(hhco.acronym, "HHCO");
    assert.equal(hhco.category, "Non-Academic");
    assert.equal(hhco.status, "Active");

    const jpcs = orgs.find((o) => o.id === "jpcs");
    assert.ok(jpcs, "JPCS should exist");
    assert.equal(jpcs.acronym, "JPCS");
    assert.equal(jpcs.category, "Academic");
  });

  await t.test("2. Whitelist correctly identifies marianocedrick412@gmail.com as President of Helping Hands", async () => {
    const orgs = await getOrganizationsForStudentEmail("marianocedrick412@gmail.com");
    assert.ok(Array.isArray(orgs), "Should return array");
    assert.equal(orgs.length, 1, "Should have exactly 1 whitelisted organization");
    assert.equal(orgs[0].organization_id, "helping-hands");
    assert.equal(orgs[0].officer_position, "President");
    assert.equal(orgs[0].student_name, "Cedrick Mariano");

    const isOfficer = await isStudentOfficerForOrg("marianocedrick412@gmail.com", "helping-hands");
    assert.ok(isOfficer, "Should be verified officer for helping-hands");
    assert.equal(isOfficer.position, "President");

    // Should NOT be officer for JPCS
    const isJpcsOfficer = await isStudentOfficerForOrg("marianocedrick412@gmail.com", "jpcs");
    assert.equal(isJpcsOfficer, null, "Should NOT be verified officer for jpcs");
  });

  await t.test("3. Whitelist correctly returns multiple affiliations for test.student@pup.local", async () => {
    const orgs = await getOrganizationsForStudentEmail("test.student@pup.local");
    assert.ok(orgs.length >= 2, "Should have at least 2 affiliations (Helping Hands & JPCS)");

    const hhco = orgs.find((o) => o.organization_id === "helping-hands");
    assert.ok(hhco, "Should be affiliated with Helping Hands");
    assert.equal(hhco.officer_position, "Secretary");

    const jpcs = orgs.find((o) => o.organization_id === "jpcs");
    assert.ok(jpcs, "Should be affiliated with JPCS");
    assert.equal(jpcs.officer_position, "Vice President");
  });

  await t.test("4. Unwhitelisted student email returns empty array and null verification", async () => {
    const orgs = await getOrganizationsForStudentEmail("unauthorized.student@pup.local");
    assert.deepEqual(orgs, [], "Unwhitelisted email should have no affiliations");

    const isOfficer = await isStudentOfficerForOrg("unauthorized.student@pup.local", "helping-hands");
    assert.equal(isOfficer, null, "Should return null for unwhitelisted student");
  });

  await t.test("5. Dynamic add and remove officer on whitelist", async () => {
    const tempEmail = `temp.auditor.${Date.now()}@pup.local`;
    const newOfficer = await addOfficer("helping-hands", {
      email: tempEmail,
      position: "Auditor",
      studentName: "Audit Test Student",
      studentNo: "2024-99999-SJ-0",
    });
    assert.ok(newOfficer?.id, "New officer should have an ID");
    assert.equal(newOfficer.email, tempEmail);
    assert.equal(newOfficer.position, "Auditor");

    // Verify lookup succeeds
    const checkBefore = await isStudentOfficerForOrg(tempEmail, "helping-hands");
    assert.ok(checkBefore, "Should find newly added officer");

    // Remove officer
    const removed = await removeOfficer("helping-hands", newOfficer.id);
    assert.equal(removed, true, "Removal should succeed");

    // Verify lookup fails
    const checkAfter = await isStudentOfficerForOrg(tempEmail, "helping-hands");
    assert.equal(checkAfter, null, "Officer should no longer be found");
  });

  await t.test("6. Constitution & By-Laws (CBL) metadata updates", async () => {
    const testFilename = `test-cbl-${Date.now()}.pdf`;
    const updated = await updateOrganizationBylaws("helping-hands", {
      storageFilename: testFilename,
      originalFilename: "Helping-Hands-Official-CBL-2026.pdf",
      sizeBytes: 1048576,
      mimeType: "application/pdf",
    });
    assert.ok(updated, "Update should succeed");
    assert.equal(updated.bylaws_storage_filename, testFilename);
    assert.equal(updated.bylaws_original_filename, "Helping-Hands-Official-CBL-2026.pdf");

    const org = await getOrganizationById("helping-hands");
    assert.equal(org.bylaws_storage_filename, testFilename);
  });

  await t.test("7. Module assignment: student_organizations is enabled for OSAS and disabled for Registrar", async () => {
    const osasModule = await queryOne(
      "SELECT enabled FROM office_modules WHERE office_id = 'osas' AND module_id = 'student_organizations'"
    );
    assert.ok(osasModule, "OSAS module entry must exist");
    assert.equal(osasModule.enabled, true, "student_organizations must be enabled for OSAS");

    const regModule = await queryOne(
      "SELECT enabled FROM office_modules WHERE office_id = 'registrar' AND module_id = 'student_organizations'"
    );
    assert.ok(regModule, "Registrar module entry must exist");
    assert.equal(regModule.enabled, false, "student_organizations must NOT be enabled for Registrar");
  });
});
