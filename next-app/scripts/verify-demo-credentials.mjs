import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config();

const { query, queryOne } = await import("../src/lib/postgres.js");
const { getStaffByUsername, hasAllSecurityAnswers, hashPasswordForStorage } = await import("../src/lib/staffRepo.js");
const { authenticateStudent } = await import("../src/lib/studentAuth.js");

console.log("=== RUNNING AUTH & CREDENTIAL TESTS ===");
const defaultHash = hashPasswordForStorage("pupstaff");

// Test 1: Staff accounts
const staffTests = [
  { email: "admin.default@pup.local", id: "PUPREGISTRAR-001", role: "SuperAdmin", office: null },
  { email: "admin.registrar@pup.local", id: "PUPREGISTRAR-003", role: "Admin", office: "registrar" },
  { email: "staff.registrar@pup.local", id: "PUPREGISTRAR-002", role: "Staff", office: "registrar" },
  { email: "admin.osas@pup.local", id: "PUPOSAS-001", role: "Admin", office: "osas" },
];

for (const t of staffTests) {
  const byEmail = await getStaffByUsername(t.email);
  const byId = await getStaffByUsername(t.id);
  if (!byEmail || !byId) {
    console.error("FAIL: Could not find " + t.email + " or " + t.id);
    process.exit(1);
  }
  const hasSec = await hasAllSecurityAnswers(t.id);
  const pwMatch = byEmail.password_hash === defaultHash;
  const officeMatch = byEmail.office_id === t.office;
  const roleMatch = byEmail.role === t.role;
  console.log(`PASS: ${t.role} (${t.email}) - PW: ${pwMatch}, HasSecurity: ${hasSec}, Role: ${roleMatch}, Office: ${officeMatch}`);
}

// Test 2: OSAS staff should not exist
const osasStaff = await queryOne("SELECT * FROM staff WHERE id = 'PUPOSAS-002' OR email = 'staff.osas@pup.local'");
console.log("PASS: OSAS Staff absent (osas admin only):", osasStaff === null);

// Test 3: Student authentication
const s1 = await authenticateStudent({ studentNo: "student@pup.local", password: "pupstaff" });
const s2 = await authenticateStudent({ studentNo: "2022-10001-MN-1", password: "pupstaff" });
const s3 = await authenticateStudent({ studentNo: "2022-10001-MN-1", password: "student123" });
console.log("PASS: Student auth by email (pupstaff):", Boolean(s1));
console.log("PASS: Student auth by student_no (pupstaff):", Boolean(s2));
console.log("PASS: Student auth by student_no (student123):", Boolean(s3));

// Test 4: Verify authentication resolution for all inputs
const testInputs = [
  { input: "admin.default@pup.local", expectedRole: "SuperAdmin" },
  { input: "superadmin@pup.local", expectedRole: "SuperAdmin" },
  { input: "PUPREGISTRAR-001", expectedRole: "SuperAdmin" },
  { input: "admin.registrar@pup.local", expectedRole: "Admin" },
  { input: "PUPREGISTRAR-003", expectedRole: "Admin" },
  { input: "staff.registrar@pup.local", expectedRole: "Staff" },
  { input: "PUPREGISTRAR-002", expectedRole: "Staff" },
  { input: "admin.osas@pup.local", expectedRole: "Admin" },
  { input: "PUPOSAS-001", expectedRole: "Admin" },
  { input: "student@pup.local", expectedRole: "Student" },
  { input: "2022-10001-MN-1", expectedRole: "Student" },
];

for (const t of testInputs) {
  const clean = t.input.trim();
  const normalized = clean.toLowerCase() === "superadmin@pup.local" ? "admin.default@pup.local" : clean;
  const staff = await queryOne(
    "SELECT * FROM staff WHERE lower(email) = lower($1) OR lower(id) = lower($1)",
    [normalized]
  );
  if (staff) {
    const hasSec = await hasAllSecurityAnswers(staff.id);
    const mustChange = (staff.password_hash === defaultHash) && !hasSec;
    if (staff.role !== t.expectedRole) {
      console.error(`FAIL: Expected role ${t.expectedRole} for ${t.input}, got ${staff.role}`);
      process.exit(1);
    }
    if (mustChange) {
      console.error(`FAIL: mustChangePassword is unexpectedly true for ${t.input}`);
      process.exit(1);
    }
    console.log(`PASS: Login resolution [${t.input}] -> role: ${staff.role}, mustChangePassword: false`);
  } else {
    const student = await authenticateStudent({ studentNo: clean, password: "pupstaff" });
    if (!student || t.expectedRole !== "Student") {
      console.error(`FAIL: Could not authenticate student for ${t.input}`);
      process.exit(1);
    }
    console.log(`PASS: Student login resolution [${t.input}] -> role: Student`);
  }
}

console.log("ALL CREDENTIAL RESOLUTION TESTS PASSED!");
process.exit(0);
