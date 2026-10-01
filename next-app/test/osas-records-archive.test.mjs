import test from "node:test";
import assert from "node:assert/strict";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config();

const { listOrganizations, getOrganizationById, updateOrganization, archiveOrganization, restoreOrganization } =
  await import("../src/lib/organizationsRepo.js");

test("OSAS Records & Archive: Organization-Centric Records Management", async (t) => {
  await t.test("1. listOrganizations returns physical archive coordinates and CBL details", async () => {
    const orgs = await listOrganizations({ status: "Active,Inactive,Archived" });
    assert.ok(Array.isArray(orgs), "Should return array of organizations");
    assert.ok(orgs.length >= 5, "Should have seeded organizations");

    const jpcs = orgs.find((o) => (o.acronym || "").toUpperCase() === "JPCS");
    assert.ok(jpcs, "JPCS organization should be present");
    assert.equal(jpcs.storage_room, 1, "JPCS should be stored in Room 1");
    assert.equal(jpcs.storage_cabinet, "ACADEMIC ORGANIZATIONS", "JPCS should be in Academic Organizations cabinet");
    assert.equal(jpcs.storage_drawer, "1", "JPCS should be in Drawer 1");
    assert.ok(typeof jpcs.active_officer_count === "number", "Should compute active officer count");
    assert.ok(typeof jpcs.proposal_count === "number", "Should compute proposal count");
  });

  await t.test("2. getOrganizationById supports ID, lowercase, and acronym lookup", async () => {
    const byId = await getOrganizationById("jpcs");
    assert.ok(byId, "Should find by id 'jpcs'");
    assert.equal(byId.name, "Junior Philippine Computer Society");

    const byAcronym = await getOrganizationById("JPCS");
    assert.ok(byAcronym, "Should find by acronym 'JPCS'");
    assert.equal(byAcronym.id, "jpcs");

    const byUpperId = await getOrganizationById("HELPING-HANDS");
    assert.ok(byUpperId, "Should find case-insensitively");
    assert.equal(byUpperId.id, "helping-hands");
  });

  await t.test("3. updateOrganization updates storage location coordinates", async () => {
    const updated = await updateOrganization("jpcs", {
      storage_room: 1,
      storage_cabinet: "ACADEMIC ORGANIZATIONS",
      storage_drawer: "2",
    });
    assert.equal(updated.storage_drawer, "2", "Drawer should be updated to 2");

    // Revert back to 1
    const reverted = await updateOrganization("jpcs", {
      storage_drawer: "1",
    });
    assert.equal(reverted.storage_drawer, "1", "Drawer should be reverted to 1");
  });

  await t.test("4. Archive and Restore workflow for organizations", async () => {
    // Archive
    const archived = await archiveOrganization("helping-hands");
    assert.equal(archived.status, "Archived", "Status should be Archived");
    assert.ok(archived.archived_at, "archived_at timestamp must be set");

    // Check list filtered by Archived
    const archivedList = await listOrganizations({ status: "Archived" });
    assert.ok(archivedList.some((o) => o.id === "helping-hands"), "Archived list should contain helping-hands");

    // Restore
    const restored = await restoreOrganization("helping-hands");
    assert.equal(restored.status, "Active", "Status should be restored to Active");
    assert.equal(restored.archived_at, null, "archived_at should be cleared");

    // Check list filtered by Active
    const activeList = await listOrganizations({ status: "Active" });
    assert.ok(activeList.some((o) => o.id === "helping-hands"), "Active list should contain helping-hands");
  });
});
