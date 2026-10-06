import test from "node:test";
import assert from "node:assert/strict";
import dotenv from "dotenv";

dotenv.config({ path: ".env" });

const {
  addOfficer,
  archiveOrganization,
  createOrganization,
  getOrganizationById,
  getOrganizationsForStudentEmail,
  isStudentOfficerForOrg,
  listOrganizations,
  removeOfficer,
  restoreOrganization,
  updateOrganization,
  updateOrganizationBylaws,
} = await import("../src/lib/organizationsRepo.js");

const { pool, query, queryOne } = await import("../src/lib/postgres.js");

test.after(async () => pool.end());

test("OSAS organization and officer CRUD", async (t) => {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const orgAId = `crud-audit-${suffix}-a`;
  const orgBId = `crud-audit-${suffix}-b`;
  const orgCId = `crud-audit-${suffix}-c`;
  const orgDId = `crud-audit-${suffix}-d`;
  const orgEId = `crud-audit-${suffix}-e`;
  const officerEmail = `crud-audit-${suffix}@pup.local`;
  const testFilename = `crud-audit-${suffix}.pdf`;
  const orgIds = [orgAId, orgBId, orgCId, orgDId, orgEId];

  t.after(async () => {
    await query("DELETE FROM organization_bylaws_versions WHERE organization_id = ANY($1::text[])", [orgIds]);
    await query("DELETE FROM organization_officers WHERE organization_id = ANY($1::text[])", [orgIds]);
    await query("DELETE FROM student_organizations WHERE id = ANY($1::text[])", [orgIds]);
  });

  await t.test("creates, lists, reads, updates, archives, restores, and deletes organizations", async () => {
    const created = await createOrganization({
      id: orgAId,
      name: `CRUD Audit Organization ${suffix}`,
      acronym: `CRUD${suffix}`,
      category: "Academic",
      description: "Temporary fixture for the OSAS organization CRUD test.",
    });
    assert.equal(created.id, orgAId);
    assert.ok((await listOrganizations({ search: `CRUD Audit Organization ${suffix}` })).some((org) => org.id === orgAId));

    const read = await getOrganizationById(orgAId);
    assert.equal(read.name, `CRUD Audit Organization ${suffix}`);

    const updated = await updateOrganization(orgAId, {
      name: `Updated CRUD Audit Organization ${suffix}`,
      description: "Updated temporary fixture.",
    });
    assert.equal(updated.name, `Updated CRUD Audit Organization ${suffix}`);
    assert.equal((await getOrganizationById(orgAId)).description, "Updated temporary fixture.");

    await archiveOrganization(orgAId);
    assert.equal((await getOrganizationById(orgAId)).status, "Archived");
    assert.ok(!(await listOrganizations({ search: `Updated CRUD Audit Organization ${suffix}` })).some((org) => org.id === orgAId));
    assert.ok((await listOrganizations({ status: "Archived", search: `Updated CRUD Audit Organization ${suffix}` })).some((org) => org.id === orgAId));

    await restoreOrganization(orgAId);
    assert.equal((await getOrganizationById(orgAId)).status, "Active");
    assert.ok((await listOrganizations({ search: `Updated CRUD Audit Organization ${suffix}` })).some((org) => org.id === orgAId));

    await query("DELETE FROM student_organizations WHERE id = $1", [orgAId]);
    assert.equal(await getOrganizationById(orgAId), null);
  });

  await t.test("adds, reads, and removes officer affiliations", async () => {
    await createOrganization({ id: orgCId, name: `CRUD Officer Organization A ${suffix}` });
    await createOrganization({ id: orgDId, name: `CRUD Officer Organization B ${suffix}` });

    const officerA = await addOfficer(orgCId, {
      email: officerEmail,
      position: "President",
      studentName: "CRUD Audit Student",
      studentNo: `CRUD-${suffix}`,
    });
    const officerB = await addOfficer(orgDId, {
      email: officerEmail,
      position: "Secretary",
      studentName: "CRUD Audit Student",
      studentNo: `CRUD-${suffix}`,
    });
    assert.ok(officerA.id);
    assert.ok(officerB.id);

    const affiliations = await getOrganizationsForStudentEmail(officerEmail);
    assert.deepEqual(
      affiliations.map((entry) => entry.organization_id).sort(),
      [orgCId, orgDId].sort(),
    );
    assert.equal((await isStudentOfficerForOrg(officerEmail, orgCId)).position, "President");

    assert.equal(await removeOfficer(orgCId, officerA.id), true);
    assert.equal(await isStudentOfficerForOrg(officerEmail, orgCId), null);
    assert.equal((await isStudentOfficerForOrg(officerEmail, orgDId)).position, "Secretary");
    assert.equal(await removeOfficer(orgDId, officerB.id), true);
    assert.deepEqual(await getOrganizationsForStudentEmail(officerEmail), []);
  });

  await t.test("updates bylaws metadata and reads the approved version", async () => {
    await createOrganization({ id: orgEId, name: `CRUD Bylaws Organization ${suffix}` });
    const updated = await updateOrganizationBylaws(orgEId, {
      storageFilename: testFilename,
      originalFilename: "Temporary-CRUD-Audit-CBL.pdf",
      sizeBytes: 32,
      mimeType: "application/pdf",
    });
    assert.equal(updated.bylaws_storage_filename, testFilename);
    assert.equal(updated.bylaws_original_filename, "Temporary-CRUD-Audit-CBL.pdf");
    assert.equal((await getOrganizationById(orgEId)).bylaws_size_bytes, "32");
  });

  await t.test("keeps OSAS module assignment enabled and Registrar disabled", async () => {
    const osasModule = await queryOne(
      "SELECT enabled FROM office_modules WHERE office_id = 'osas' AND module_id = 'student_organizations'",
    );
    assert.equal(osasModule?.enabled, true);

    const registrarModule = await queryOne(
      "SELECT enabled FROM office_modules WHERE office_id = 'registrar' AND module_id = 'student_organizations'",
    );
    assert.equal(registrarModule?.enabled, false);
  });
});
