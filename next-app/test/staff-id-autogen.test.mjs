import test from "node:test";
import assert from "node:assert/strict";
import { getNextStaffId, createStaff, getStaffById, hardDeleteStaff } from "../src/lib/staffRepo.js";
import { query, pool } from "../src/lib/postgres.js";

test.after(async () => {
  await pool.end();
});

test("Staff ID auto-generation - getNextStaffId per-office sequence", async () => {
  // Test format and dynamic sequence matching
  const registrarNext = await getNextStaffId({ officeId: "registrar" });
  assert.match(registrarNext, /^PUPREGISTRAR-\d{3,}$/, "Registrar ID format must match PUPREGISTRAR-NNN");

  const osasNext = await getNextStaffId({ officeId: "osas" });
  assert.match(osasNext, /^PUPOSAS-\d{3,}$/, "OSAS ID format must match PUPOSAS-NNN");

  const superAdminNext = await getNextStaffId({ role: "SuperAdmin" });
  assert.match(superAdminNext, /^PUPSUPERADMIN-\d{3,}$/, "SuperAdmin ID format must match PUPSUPERADMIN-NNN");

  const newOfficeNext = await getNextStaffId({ officeId: "isolated_test_office" });
  assert.equal(newOfficeNext, "PUPISOLATEDTESTOFFICE-001", "New office without staff should start at 001");
});

test("Staff creation without ID auto-assigns sequential ID in database", async () => {
  const testEmail = "autogen.test@pup.local";
  // Clean up if left over
  const existing = await query("SELECT id FROM staff WHERE email LIKE $1", ["%autogen.test%"]);
  for (const row of existing) {
    await hardDeleteStaff(row.id).catch(() => {});
  }

  const expectedId = await getNextStaffId({ officeId: "registrar" });

  const staff = await createStaff({
    officeId: "registrar",
    fname: "Autogen",
    lname: "Tester",
    role: "Staff",
    section: "Records",
    email: testEmail,
    password: "pupstaff",
  });

  try {
    assert.ok(staff, "Created staff record should be returned");
    assert.equal(staff.id, expectedId, `Assigned ID should match expected sequence: ${expectedId}`);
    assert.equal(staff.office_id, "registrar");

    // Next ID should now have incremented
    const afterNext = await getNextStaffId({ officeId: "registrar" });
    assert.notEqual(afterNext, expectedId, "Next ID should advance after insertion");

    // Fetch by assigned ID
    const fetched = await getStaffById(staff.id);
    assert.ok(fetched);
    assert.equal(fetched.id, staff.id);
  } finally {
    // Clean up test staff
    await hardDeleteStaff(staff.id).catch(() => {});
  }
});

test("Concurrent staff creation allocates distinct sequential IDs without collision", async () => {
  const count = 4;
  const emails = Array.from({ length: count }, (_, i) => `concurrent.${i}.${Date.now()}@pup.local`);

  // Clean up any leftovers
  for (const email of emails) {
    const existing = await query("SELECT id FROM staff WHERE email = $1", [email]);
    for (const row of existing) {
      await hardDeleteStaff(row.id).catch(() => {});
    }
  }

  // Launch all creations in parallel at the exact same instant
  const createdStaff = await Promise.all(
    emails.map((email, i) =>
      createStaff({
        officeId: "registrar",
        fname: "Concurrent",
        lname: `Worker${i}`,
        role: "Staff",
        section: "Records",
        email,
        password: "pupstaff",
      })
    )
  );

  try {
    const ids = createdStaff.map((s) => s.id);
    const uniqueIds = new Set(ids);
    assert.equal(uniqueIds.size, count, `All ${count} parallel creations must receive unique IDs`);

    for (const s of createdStaff) {
      assert.match(s.id, /^PUPREGISTRAR-\d{3,}$/);
    }
  } finally {
    for (const s of createdStaff) {
      await hardDeleteStaff(s.id).catch(() => {});
    }
  }
});
