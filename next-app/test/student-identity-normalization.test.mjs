import test from "node:test";
import assert from "node:assert/strict";
import dotenv from "dotenv";
import { execFileSync } from "node:child_process";

dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

const { pool, query, queryOne } = await import("../src/lib/postgres.js");
const { encryptPII } = await import("../src/lib/piiEncryption.js");
const { hashPassword } = await import("../src/lib/passwordHash.js");
const { authenticateStudent, registerStudent } = await import("../src/lib/studentAuth.js");
const {
  getOfficersByOrganizationId,
  listOrganizationBylawsVersions,
} = await import("../src/lib/organizationsRepo.js");
const { getOrganizationComplianceSummary } = await import("../src/lib/organizationComplianceRepo.js");

test.after(async () => pool.end());

test("normalized identity lookup supports plaintext legacy and encrypted emails", async (t) => {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const orgId = `identity-audit-${suffix}`;
  const legacyEmail = `legacy-${suffix}@pup.local`;
  const encryptedEmail = `encrypted-${suffix}@pup.local`;
  const legacyName = `Legacy Student ${suffix}`;
  const encryptedName = `Encrypted Student ${suffix}`;
  const accountPassword = "Identity-test-password-1!";
  const profileIds = [];
  const accountIds = [];
  const requestIds = [];

  t.after(async () => {
    if (requestIds.length) await query("DELETE FROM document_requests WHERE id = ANY($1::bigint[])", [requestIds]);
    await query("DELETE FROM organization_bylaws_versions WHERE organization_id = $1", [orgId]);
    await query("DELETE FROM organization_officers WHERE organization_id = $1", [orgId]);
    await query("DELETE FROM student_organizations WHERE id = $1", [orgId]);
    if (accountIds.length) await query("DELETE FROM student_accounts WHERE id = ANY($1::bigint[])", [accountIds]);
    if (profileIds.length) await query("DELETE FROM student_identity_profiles WHERE id = ANY($1::bigint[])", [profileIds]);
  });

  for (const [email, name, storedEmail] of [
    [legacyEmail, legacyName, legacyEmail],
    [encryptedEmail, encryptedName, encryptPII(encryptedEmail)],
  ]) {
    const profile = await queryOne(
      `INSERT INTO student_identity_profiles (display_name, email, client_type)
       VALUES ($1, $2, 'Alumni') RETURNING id`,
      [encryptPII(name), storedEmail]
    );
    profileIds.push(profile.id);
    const account = await queryOne(
      `INSERT INTO student_accounts (identity_profile_id, password_hash, status)
       VALUES ($1, $2, 'Active') RETURNING id`,
      [profile.id, hashPassword(accountPassword)]
    );
    accountIds.push(account.id);
  }

  const alumniRequest = await queryOne(
    `INSERT INTO document_requests (
       office_id, student_no, doc_type, status, notes, client_type,
       requester_name, identity_profile_id
     ) VALUES ('registrar', NULL, 'Identity Test Credential', 'Pending', $1,
       'Alumni', $2, $3) RETURNING id`,
    ["Account-only alumni verifier fixture", encryptPII(legacyName), profileIds[0]]
  );
  requestIds.push(alumniRequest.id);

  await query(
    "INSERT INTO student_organizations (id, name) VALUES ($1, $2)",
    [orgId, `Identity Mapping Test ${suffix}`]
  );
  await query(
    `INSERT INTO organization_officers (organization_id, email, position)
     VALUES ($1, $2, 'President'), ($1, $3, 'Secretary')`,
    [orgId, legacyEmail, encryptedEmail]
  );
  await query(
    `INSERT INTO organization_bylaws_versions (
       organization_id, version_tag, storage_filename, original_filename,
       submitted_by_email, status
     ) VALUES ($1, 'Identity Test', $2, $3, $4, 'Pending')`,
    [orgId, `identity-${suffix}.pdf`, `identity-${suffix}.pdf`, encryptedEmail]
  );

  const officers = await getOfficersByOrganizationId(orgId);
  assert.deepEqual(officers.map((officer) => officer.student_name).sort(), [legacyName, encryptedName].sort());
  assert.ok(officers.every((officer) => officer.student_account_id));
  assert.equal((await authenticateStudent({ email: legacyEmail, password: accountPassword }))?.id, accountIds[0]);
  assert.equal((await authenticateStudent({ email: encryptedEmail, password: accountPassword }))?.id, accountIds[1]);

  const bylaws = await listOrganizationBylawsVersions(orgId);
  assert.equal(bylaws[0].submitted_by_name, encryptedName);

  const compliance = await getOrganizationComplianceSummary({ search: `Identity Mapping Test ${suffix}` });
  assert.equal(compliance.organizations[0].officers[0].studentAccountId != null, true);

  const verifierOutput = execFileSync(process.execPath, ["scripts/verify-local-postgres.mjs"], {
    cwd: process.cwd(),
    env: process.env,
    encoding: "utf8",
  });
  assert.match(verifierOutput, /invariant checks passed/i);
});

test("registration detects a legacy plaintext email duplicate", async (t) => {
  const email = `duplicate-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@pup.local`;
  const profile = await queryOne(
    `INSERT INTO student_identity_profiles (display_name, email, client_type)
     VALUES ($1, $2, 'Alumni') RETURNING id`,
    [encryptPII("Existing User"), email]
  );
  const account = await queryOne(
    `INSERT INTO student_accounts (identity_profile_id, password_hash, status)
     VALUES ($1, $2, 'Active') RETURNING id`,
    [profile.id, hashPassword("Unused-test-password-1!")]
  );
  t.after(async () => {
    await query("DELETE FROM student_accounts WHERE id = $1", [account.id]);
    await query("DELETE FROM student_identity_profiles WHERE id = $1", [profile.id]);
  });

  await assert.rejects(
    registerStudent({
      name: "Duplicate User",
      firstName: "Duplicate",
      lastName: "User",
      password: "Valid-test-password-1!",
      email,
    }),
    /already exists/i
  );
});

test("login rejects an ambiguous student number with multiple linked accounts", async (t) => {
  const student = await queryOne(
    `SELECT s.student_no FROM students s
     WHERE s.status = 'Active'
       AND NOT EXISTS (SELECT 1 FROM student_accounts sa WHERE sa.student_no = s.student_no)
     ORDER BY s.student_no LIMIT 1`
  );
  assert.ok(student?.student_no, "an active registry student is needed for this integration test");
  const profileIds = [];
  const accountIds = [];
  t.after(async () => {
    if (accountIds.length) {
      await query(
        "DELETE FROM student_identity_link_reviews WHERE entity_type = 'student_account' AND entity_id = ANY($1::bigint[])",
        [accountIds]
      );
    }
    if (accountIds.length) await query("DELETE FROM student_accounts WHERE id = ANY($1::bigint[])", [accountIds]);
    if (profileIds.length) await query("DELETE FROM student_identity_profiles WHERE id = ANY($1::bigint[])", [profileIds]);
  });

  for (let index = 0; index < 2; index += 1) {
    const profile = await queryOne(
      `INSERT INTO student_identity_profiles (display_name, client_type)
       VALUES ($1, 'Student') RETURNING id`,
      [`Ambiguous Login ${index}`]
    );
    profileIds.push(profile.id);
    const account = await queryOne(
      `INSERT INTO student_accounts (student_no, identity_profile_id, password_hash, status)
       VALUES ($1, $2, $3, 'Active') RETURNING id`,
      [student.student_no, profile.id, hashPassword("Unused-test-password-1!")]
    );
    accountIds.push(account.id);
  }

  const registryProfile = await queryOne(
    "SELECT identity_profile_id FROM students WHERE student_no = $1",
    [student.student_no]
  );
  await query(
    `INSERT INTO student_identity_link_reviews (
       entity_type, entity_id, student_no, student_account_id,
       registry_profile_id, account_profile_id
     ) VALUES ('student_account', $1, $2, $1, $3, $4)`,
    [accountIds[1], student.student_no, registryProfile.identity_profile_id, profileIds[1]]
  );

  assert.equal(
    await authenticateStudent({ studentNo: student.student_no, password: "Unused-test-password-1!" }),
    null
  );
  const verifierOutput = execFileSync(process.execPath, ["scripts/verify-local-postgres.mjs"], {
    cwd: process.cwd(),
    env: process.env,
    encoding: "utf8",
  });
  assert.match(verifierOutput, /invariant checks passed/i);
});

test("login still accepts one account linked to a registry number", async (t) => {
  const student = await queryOne(
    `SELECT s.student_no FROM students s
     WHERE s.status = 'Active'
       AND NOT EXISTS (SELECT 1 FROM student_accounts sa WHERE sa.student_no = s.student_no)
     ORDER BY s.student_no LIMIT 1`
  );
  assert.ok(student?.student_no, "an active registry student without an account is needed for this integration test");

  const profile = await queryOne(
    `INSERT INTO student_identity_profiles (display_name, email, client_type)
     VALUES ($1, $2, 'Student') RETURNING id`,
    [encryptPII("Unique Login Test"), `unique-login-${Date.now()}@pup.local`]
  );
  const password = "Unique-test-password-1!";
  const account = await queryOne(
    `INSERT INTO student_accounts (student_no, identity_profile_id, password_hash, status)
     VALUES ($1, $2, $3, 'Active') RETURNING id`,
    [student.student_no, profile.id, hashPassword(password)]
  );
  t.after(async () => {
    await query("DELETE FROM student_accounts WHERE id = $1", [account.id]);
    await query("DELETE FROM student_identity_profiles WHERE id = $1", [profile.id]);
  });

  const authenticated = await authenticateStudent({ studentNo: student.student_no, password });
  assert.equal(authenticated?.id, account.id);
});
