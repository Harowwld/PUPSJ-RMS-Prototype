import { test, after } from "node:test";
import assert from "node:assert/strict";
import { getOfficePrefix, getOfficeRoleLabel, registerOffices } from "../src/lib/roleUtils.js";
import { getStaffById, createStaff, hardDeleteStaff } from "../src/lib/staffRepo.js";
import { pool, query } from "../src/lib/postgres.js";

after(async () => {
  await pool?.end();
});

test("Office prefix mapping handles all offices, acronyms, and heuristics", () => {
  assert.equal(getOfficePrefix("registrar"), "Registrar");
  assert.equal(getOfficePrefix("REGISTRAR"), "Registrar");
  assert.equal(getOfficePrefix("osas"), "OSAS");
  assert.equal(getOfficePrefix("OSAS"), "OSAS");
  assert.equal(getOfficePrefix("admissions"), "Admissions");
  assert.equal(getOfficePrefix("accounting"), "Accounting");
  assert.equal(getOfficePrefix("research"), "Research");
  assert.equal(getOfficePrefix("guidance"), "Guidance");
  assert.equal(getOfficePrefix("custom_dept"), "Custom DEPT");
  assert.equal(getOfficePrefix(null), "Registrar");
  assert.equal(getOfficePrefix(undefined), "Registrar");
  assert.equal(getOfficePrefix(""), "Registrar");
});

test("Dynamic Office registration and runtime resolution", () => {
  // 1. Dynamic list passed directly into getOfficePrefix
  assert.equal(
    getOfficePrefix("scholarship", [{ id: "scholarship", short_name: "Scholarship" }]),
    "Scholarship"
  );

  // 2. Dynamic registry via registerOffices
  registerOffices([{ id: "health_services", short_name: "Health Services" }]);
  assert.equal(getOfficePrefix("health_services"), "Health Services");

  // 3. Object resolution (staff or office objects)
  assert.equal(getOfficePrefix({ office_short_name: "Guidance" }), "Guidance");
  assert.equal(getOfficePrefix({ short_name: "Alumni Affairs" }), "Alumni Affairs");
  assert.equal(getOfficePrefix({ office_name: "Office of the Chancellor" }), "Office of the Chancellor");
});

test("getOfficeRoleLabel returns distinct office-scoped roles dynamically", () => {
  // OSAS roles
  assert.equal(getOfficeRoleLabel("Staff", "osas"), "OSAS Staff");
  assert.equal(getOfficeRoleLabel("staff", "osas"), "OSAS Staff");
  assert.equal(getOfficeRoleLabel("Admin", "osas"), "OSAS Admin");
  assert.equal(getOfficeRoleLabel("admin", "osas"), "OSAS Admin");

  // Registrar roles
  assert.equal(getOfficeRoleLabel("Staff", "registrar"), "Registrar Staff");
  assert.equal(getOfficeRoleLabel("Admin", "registrar"), "Registrar Admin");

  // Other offices
  assert.equal(getOfficeRoleLabel("Staff", "admissions"), "Admissions Staff");
  assert.equal(getOfficeRoleLabel("Admin", "admissions"), "Admissions Admin");

  // Dynamic offices with passed list
  assert.equal(
    getOfficeRoleLabel("Staff", "scholarship", [{ id: "scholarship", short_name: "Scholarship" }]),
    "Scholarship Staff"
  );
  assert.equal(
    getOfficeRoleLabel("Admin", "scholarship", [{ id: "scholarship", short_name: "Scholarship" }]),
    "Scholarship Admin"
  );

  // Dynamic office from staff object
  assert.equal(
    getOfficeRoleLabel("Staff", { role: "Staff", office_short_name: "Guidance" }),
    "Guidance Staff"
  );

  // System Administrator roles bypass office prefixing
  assert.equal(getOfficeRoleLabel("SystemAdmin", "osas"), "System Admin");
  assert.equal(getOfficeRoleLabel("SuperAdmin", "registrar"), "System Admin");

  // Unknown or custom roles fallback
  assert.equal(getOfficeRoleLabel("Student", "registrar"), "Student");
});

test("Staff accounts in database have correct office_id and section scoping", async () => {
  // Registrar Staff: Marcus Reyes
  const registrarStaff = await getStaffById("PUPREGISTRAR-002");
  if (registrarStaff) {
    assert.equal(registrarStaff.office_id, "registrar");
    assert.equal(registrarStaff.office_short_name, "Registrar");
    assert.equal(getOfficeRoleLabel(registrarStaff.role, registrarStaff), "Registrar Staff");
  }

  // Registrar Admin: Elias Austria
  const registrarAdmin = await getStaffById("PUPREGISTRAR-003");
  if (registrarAdmin) {
    assert.equal(registrarAdmin.office_id, "registrar");
    assert.equal(registrarAdmin.office_short_name, "Registrar");
    assert.equal(getOfficeRoleLabel(registrarAdmin.role, registrarAdmin), "Registrar Admin");
  }

  // OSAS Admin: Sandra Gomez
  const osasAdmin = await getStaffById("PUPOSAS-001");
  if (osasAdmin) {
    assert.equal(osasAdmin.office_id, "osas");
    assert.equal(osasAdmin.office_short_name, "OSAS");
    assert.equal(getOfficeRoleLabel(osasAdmin.role, osasAdmin), "OSAS Admin");
  }

  // OSAS Staff: Paulo Masculino (migrated from PUPREGISTRAR-004)
  const osasStaff = await getStaffById("PUPOSAS-004");
  if (osasStaff) {
    assert.equal(osasStaff.office_id, "osas");
    assert.equal(osasStaff.office_short_name, "OSAS");
    assert.equal(osasStaff.section, "Student Affairs");
    assert.equal(getOfficeRoleLabel(osasStaff.role, osasStaff), "OSAS Staff");
  }

  // SuperAdmin: System Administrator
  const superAdmin = await getStaffById("PUPSUPERADMIN-001");
  if (superAdmin) {
    assert.equal(getOfficeRoleLabel(superAdmin.role, superAdmin), "System Admin");
  }
});

test("SuperAdmin dynamically created office reflects in staff queries and role labels", async () => {
  const testOfficeId = "guidance_test";
  const testStaffId = "PUPGUIDANCE-999";

  try {
    // 1. Insert dynamically created office into offices table
    await query(
      "INSERT INTO offices (id, name, short_name) VALUES ($1, $2, $3) ON CONFLICT (id) DO UPDATE SET short_name = $3",
      [testOfficeId, "Guidance and Counseling Testing Office", "Guidance"]
    );

    // 2. Create a staff member under this dynamic office
    await createStaff({
      id: testStaffId,
      officeId: testOfficeId,
      fname: "Test",
      lname: "Counselor",
      role: "Staff",
      section: "Guidance Office",
      status: "Active",
      email: "guidance.test@pup.local",
      password: "pupstaff",
    });

    // 3. Query staff and verify LEFT JOIN offices populates office_name and office_short_name
    const staff = await getStaffById(testStaffId);
    assert.ok(staff);
    assert.equal(staff.office_id, testOfficeId);
    assert.equal(staff.office_short_name, "Guidance");
    assert.equal(staff.office_name, "Guidance and Counseling Testing Office");

    // 4. Verify getOfficeRoleLabel returns "Guidance Staff" dynamically without hardcoding!
    assert.equal(getOfficeRoleLabel(staff.role, staff), "Guidance Staff");

  } finally {
    // Cleanup
    await hardDeleteStaff(testStaffId);
    await query("DELETE FROM offices WHERE id = $1", [testOfficeId]);
  }
});
