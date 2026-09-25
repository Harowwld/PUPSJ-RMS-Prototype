import test from "node:test";
import assert from "node:assert/strict";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config();

const { query, queryOne } = await import("../src/lib/postgres.js");
const { getStorageLayout, setStorageLayout } = await import("../src/lib/storageLayoutRepo.js");
const { listDocTypes } = await import("../src/lib/docTypesRepo.js");
const { DEFAULT_OFFICE_MODULES } = await import("../src/lib/systemDb.js");

test("OSAS Storage Suite & Workflow Specialization", async (t) => {
  await t.test("1. DEFAULT_OFFICE_MODULES includes storage modules for OSAS", () => {
    assert.ok(Array.isArray(DEFAULT_OFFICE_MODULES.osas), "OSAS modules should be an array");
    assert.ok(DEFAULT_OFFICE_MODULES.osas.includes("storage_layout"), "storage_layout must be in OSAS modules");
    assert.ok(DEFAULT_OFFICE_MODULES.osas.includes("storage_explorer"), "storage_explorer must be in OSAS modules");
    assert.ok(DEFAULT_OFFICE_MODULES.osas.includes("records_archive"), "records_archive must be in OSAS modules");
    assert.ok(DEFAULT_OFFICE_MODULES.osas.includes("student_organizations"), "student_organizations must be in OSAS modules");
    assert.ok(DEFAULT_OFFICE_MODULES.osas.includes("osas_monitoring"), "osas_monitoring must be in OSAS modules");
  });

  await t.test("2. PostgreSQL office_modules has storage suite enabled for OSAS", async () => {
    const modules = await query(
      "SELECT module_id, enabled FROM office_modules WHERE office_id = 'osas' AND module_id IN ('storage_layout', 'storage_explorer', 'records_archive')"
    );
    assert.equal(modules.length, 3, "All 3 storage modules must be registered in office_modules for OSAS");
    for (const m of modules) {
      assert.equal(m.enabled, true, `Module ${m.module_id} must be enabled for OSAS`);
    }
  });

  await t.test("3. OSAS storage layout matches Registrar cabinet dimensions (0.075 x 0.12) and Room 1 naming", async () => {
    const layout = await getStorageLayout({ officeId: "osas" });
    assert.ok(layout, "Layout must be returned");
    assert.equal(layout.version, 2, "Layout version must be 2");
    assert.ok(Array.isArray(layout.rooms), "Rooms must be an array");
    assert.ok(layout.rooms.length >= 1, "Must have at least 1 room");

    const room = layout.rooms[0];
    assert.equal(room.name, "Room 1", "Default room name should match Registrar standard 'Room 1'");
    assert.ok(room.cabinets.length >= 4, "Must have cabinets installed");

    for (const cab of room.cabinets) {
      assert.equal(cab.rect.w, 0.075, `Cabinet ${cab.id} width must match Registrar 0.075`);
      assert.equal(cab.rect.h, 0.12, `Cabinet ${cab.id} height must match Registrar 0.12`);
      assert.ok(Array.isArray(cab.drawerIds), `Cabinet ${cab.id} must have drawerIds`);
    }
  });

  await t.test("4. Registrar storage layout remains isolated from OSAS", async () => {
    const regLayout = await getStorageLayout({ officeId: "registrar" });
    assert.ok(regLayout, "Registrar layout must exist");
    assert.notEqual(regLayout.rooms.length, 0, "Registrar should have its own rooms");
    const regRoom1 = regLayout.rooms.find((r) => r.id === 1);
    assert.ok(regRoom1, "Registrar should have Room 1");
    assert.equal(regRoom1.name, "Room 1");
  });

  await t.test("5. Comprehensive OSAS document types are seeded in PostgreSQL", async () => {
    const osasDocTypes = await listDocTypes({ officeId: "osas" });
    assert.ok(Array.isArray(osasDocTypes), "Should return doc types array");
    
    const requiredTypes = [
      "Event Proposal",
      "Constitution & By-Laws (CBL)",
      "Activity Request",
      "Financial Liquidation Report",
      "Student Disciplinary Clearance",
      "Organization Registration Certificate",
      "Good Moral Certificate",
      "Clearance Form",
    ];

    for (const expected of requiredTypes) {
      assert.ok(
        osasDocTypes.some((dt) => dt.toLowerCase() === expected.toLowerCase()),
        `OSAS document types must include '${expected}'`
      );
    }
  });

  await t.test("6. Mutating OSAS storage layout does not mutate Registrar storage layout", async () => {
    const originalOsas = await getStorageLayout({ officeId: "osas" });
    const originalReg = await getStorageLayout({ officeId: "registrar" });

    // Update OSAS layout with modified cabinet
    const updatedOsas = JSON.parse(JSON.stringify(originalOsas));
    updatedOsas.rooms[0].cabinets[0].rotation = 90;

    await setStorageLayout(updatedOsas, { officeId: "osas" });

    const fetchedOsas = await getStorageLayout({ officeId: "osas" });
    assert.equal(fetchedOsas.rooms[0].cabinets[0].rotation, 90, "OSAS cabinet rotation should update");

    const fetchedReg = await getStorageLayout({ officeId: "registrar" });
    assert.deepEqual(fetchedReg, originalReg, "Registrar layout must remain completely unchanged");

    // Revert rotation
    updatedOsas.rooms[0].cabinets[0].rotation = 0;
    await setStorageLayout(updatedOsas, { officeId: "osas" });
  });

  await t.test("7. OSAS has zero course blocks (sections) in database", async () => {
    const osasSections = await query("SELECT * FROM sections WHERE office_id = 'osas'");
    assert.equal(osasSections.length, 0, "OSAS must have 0 sections in database");

    const regSections = await query("SELECT * FROM sections WHERE office_id = 'registrar'");
    assert.ok(regSections.length > 0, "Registrar must retain its sections");
  });

  await t.test("8. Storage Room Renaming: Allows custom room names and persists in PostgreSQL", async () => {
    const osasLayout = await getStorageLayout({ officeId: "osas" });
    const updated = JSON.parse(JSON.stringify(osasLayout));
    updated.rooms[0].name = "OSAS Student Records Archive 102";

    await setStorageLayout(updated, { officeId: "osas" });

    const fetched = await getStorageLayout({ officeId: "osas" });
    assert.equal(fetched.rooms[0].name, "OSAS Student Records Archive 102", "Custom room name must persist");

    // Revert to Room 1
    updated.rooms[0].name = "Room 1";
    await setStorageLayout(updated, { officeId: "osas" });
  });

  await t.test("9. Drawer Renaming & Years (e.g. 2015): Accepts custom/year drawer IDs", async () => {
    const osasLayout = await getStorageLayout({ officeId: "osas" });
    const updated = JSON.parse(JSON.stringify(osasLayout));
    // Set cabinet 2020 drawers to consecutive years 2015, 2016, 2017, 2018
    updated.rooms[0].cabinets[0].drawerIds = [2015, 2016, 2017, 2018];

    await setStorageLayout(updated, { officeId: "osas" });

    const fetched = await getStorageLayout({ officeId: "osas" });
    assert.deepEqual(
      fetched.rooms[0].cabinets[0].drawerIds,
      [2015, 2016, 2017, 2018],
      "Drawers should be successfully saved with years 2015-2018"
    );

    // Revert to [1, 2, 3, 4]
    updated.rooms[0].cabinets[0].drawerIds = [1, 2, 3, 4];
    await setStorageLayout(updated, { officeId: "osas" });
  });

  await t.test("10. Database student drawer column supports custom year/text (e.g. 2015)", async () => {
    // Check students.storage_drawer column type in Postgres
    const colInfo = await queryOne(
      "SELECT data_type FROM information_schema.columns WHERE table_name = 'students' AND column_name = 'storage_drawer'"
    );
    assert.equal(colInfo.data_type, "text", "students.storage_drawer must be TEXT in PostgreSQL");
  });
});
