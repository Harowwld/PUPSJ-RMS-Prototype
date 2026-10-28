import { test, after } from "node:test";
import assert from "node:assert/strict";
import { pool, query } from "../src/lib/postgres.js";
import { resetDatabase } from "../src/lib/resetDatabase.js";
import { createOffice } from "../src/lib/officesRepo.js";

after(async () => {
  await pool?.end();
});

test("resetDatabase completely wipes superadmin departments and restores baseline stations", async () => {
  // 1. Create a custom superadmin department with custom station
  const customOffice = await createOffice({
    id: "test-superadmin-dept",
    name: "Custom Superadmin Department",
    short_name: "SuperDept",
    station_name: "SUPER-STATION-888",
    scanner_model: "Specialized Book Scanner",
    storage_path: ".local/storage/superdept/uploads",
    inbound_path: ".local/hot-folder/INBOUND/SUPERDEPT",
    adminEmail: "admin.superdept@pup.local",
  });
  assert.ok(customOffice);

  // 2. Tamper with baseline registrar station settings
  await query(
    `UPDATE offices
     SET station_name = 'TAMPERED-REG-STATION',
         scanner_model = 'Tampered Scanner',
         ingest_paused = true
     WHERE id = 'registrar'`
  );

  // Verify custom department and tampered station exist before reset
  const preOffices = await query("SELECT id FROM offices WHERE id = 'test-superadmin-dept'");
  assert.equal(preOffices.length, 1);

  const preReg = await query("SELECT station_name, ingest_paused FROM offices WHERE id = 'registrar'");
  assert.equal(preReg[0].station_name, "TAMPERED-REG-STATION");
  assert.equal(preReg[0].ingest_paused, true);

  // 3. Execute database reset
  await resetDatabase();

  // 4. Verify custom department is completely wiped
  const postCustom = await query("SELECT id FROM offices WHERE id = 'test-superadmin-dept'");
  assert.equal(postCustom.length, 0);

  const allOffices = await query("SELECT id, name, station_name, scanner_model, ingest_paused, status FROM offices ORDER BY id");
  assert.equal(allOffices.length, 2);
  assert.deepEqual(allOffices.map((o) => o.id), ["osas", "registrar"]);

  // 5. Verify registrar station is restored to pristine baseline
  const regOffice = allOffices.find((o) => o.id === "registrar");
  assert.equal(regOffice.station_name, "REG-ARCHIVE-PC01");
  assert.equal(regOffice.scanner_model, "Fujitsu fi-7160 Batch Duplex");
  assert.equal(regOffice.ingest_paused, false);
  assert.equal(regOffice.status, "Active");

  // 6. Verify osas station is pristine baseline
  const osasOffice = allOffices.find((o) => o.id === "osas");
  assert.equal(osasOffice.station_name, "OSAS-OPERATIONS-PC01");
  assert.equal(osasOffice.scanner_model, "Canon imageFORMULA Flatbed/ADF");
  assert.equal(osasOffice.ingest_paused, false);
  assert.equal(osasOffice.status, "Active");

  // 7. Verify office_modules only belong to registrar and osas
  const customModules = await query("SELECT * FROM office_modules WHERE office_id NOT IN ('registrar', 'osas')");
  assert.equal(customModules.length, 0);

  // 8. Verify the 7 default demo accounts (5 personnel + 2 students)
  const staff = await query("SELECT id FROM staff ORDER BY id");
  assert.equal(staff.length, 5);

  const students = await query("SELECT student_no FROM students ORDER BY student_no");
  assert.equal(students.length, 2);
});
