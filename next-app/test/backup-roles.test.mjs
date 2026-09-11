import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config();

import fs from "node:fs";
import path from "node:path";
const { signSessionToken, verifySessionToken } = await import("../src/lib/jwt.js");
const { getStaffById } = await import("../src/lib/staffRepo.js");
const { getBackupsDir } = await import("../src/lib/backupsRepo.js");
const { query } = await import("../src/lib/postgres.js");
const { registerSessionToken } = await import("../src/lib/authSessions.js");
const { generateCSRFToken } = await import("../src/lib/csrfProtection.js");

async function testBackupEndpoints() {
  console.log("=== Testing Backup API Role-Based Authorization ===");

  // 1. Get accounts
  const registrarAdmin = await getStaffById("PUPREGISTRAR-003");
  const superAdmin = await getStaffById("PUPSUPERADMIN-001");

  if (!registrarAdmin || !superAdmin) {
    throw new Error("Missing test accounts PUPREGISTRAR-003 or PUPSUPERADMIN-001");
  }

  const registrarToken = await signSessionToken({
    sub: registrarAdmin.id,
    role: registrarAdmin.role,
    office_id: registrarAdmin.office_id || "registrar",
    officeId: registrarAdmin.office_id || "registrar",
    username: registrarAdmin.email,
  });
  const regPayload = await verifySessionToken(registrarToken);
  await registerSessionToken(registrarToken, {
    principalId: registrarAdmin.id,
    role: registrarAdmin.role,
    username: registrarAdmin.email,
  });
  const regCsrf = generateCSRFToken(regPayload.jti);

  const superToken = await signSessionToken({
    sub: superAdmin.id,
    role: superAdmin.role,
    office_id: null,
    username: superAdmin.email,
  });
  const supPayload = await verifySessionToken(superToken);
  await registerSessionToken(superToken, {
    principalId: superAdmin.id,
    role: superAdmin.role,
    username: superAdmin.email,
  });
  const supCsrf = generateCSRFToken(supPayload.jti);

  const speakeasy = (await import("speakeasy")).default;
  const { encryptSecret } = await import("../src/lib/totp.js");

  // Set up temporary TOTP for both test accounts
  const regSecret = speakeasy.generateSecret({ length: 32 });
  await query("UPDATE staff SET totp_enabled = true, totp_secret = $1 WHERE id = $2", [
    encryptSecret(regSecret.base32),
    registrarAdmin.id,
  ]);

  const supSecret = speakeasy.generateSecret({ length: 32 });
  await query("UPDATE staff SET totp_enabled = true, totp_secret = $1 WHERE id = $2", [
    encryptSecret(supSecret.base32),
    superAdmin.id,
  ]);

  try {
    const baseUrl = "http://localhost:3000";

    // Test 0: Registrar Admin with totp_enabled: false creates office backup without TOTP token
    console.log("\n[Test 0] Registrar Admin (totp_enabled = false) creates office backup without TOTP token...");
    await query("UPDATE staff SET totp_enabled = false, totp_secret = NULL WHERE id = $1", [registrarAdmin.id]);
    const res0 = await fetch(`${baseUrl}/api/system/backup`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: "http://localhost:3000",
        Cookie: `pup_session=${registrarToken}; pup_csrf=${regCsrf}`,
      },
      body: JSON.stringify({ scope: "office", officeId: "registrar" }),
    });
    const json0 = await res0.json();
    console.log("Status:", res0.status, "Response:", json0);
    if (!res0.ok || !json0.ok || json0.data?.scope !== "office") {
      throw new Error("Test 0 FAILED: Registrar Admin without TOTP could not create office backup");
    }
    console.log(">> PASSED: Office backup created successfully without TOTP when totp_enabled = false!");
    const test0BackupId = json0.data.id;

    // Set up temporary TOTP for Test 1
    await query("UPDATE staff SET totp_enabled = true, totp_secret = $1 WHERE id = $2", [
      encryptSecret(regSecret.base32),
      registrarAdmin.id,
    ]);

    // Test 1: Registrar Admin creates Office Partition Backup with TOTP token
    console.log("\n[Test 1] Registrar Admin (totp_enabled = true) creates office backup with TOTP token...");
    const regTotp1 = speakeasy.totp({ secret: regSecret.base32, encoding: "base32" });
    const res1 = await fetch(`${baseUrl}/api/system/backup`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: "http://localhost:3000",
        Cookie: `pup_session=${registrarToken}; pup_csrf=${regCsrf}`,
        "x-totp-token": regTotp1,
      },
      body: JSON.stringify({ scope: "office", officeId: "registrar" }),
    });
    const json1 = await res1.json();
    console.log("Status:", res1.status, "Response:", json1);
    if (!res1.ok || !json1.ok || json1.data?.scope !== "office" || json1.data?.office_id !== "registrar") {
      throw new Error("Test 1 FAILED: Registrar Admin could not create office backup");
    }
    console.log(">> PASSED: Office backup created successfully by Registrar Admin!");
    const registrarBackupId = json1.data.id;

    // Test 2: Registrar Admin attempts to create System Governance Backup (MUST FAIL 403)
    console.log("\n[Test 2] Registrar Admin attempts to create platform governance backup...");
    const res2 = await fetch(`${baseUrl}/api/system/backup`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: "http://localhost:3000",
        Cookie: `pup_session=${registrarToken}; pup_csrf=${regCsrf}`,
      },
      body: JSON.stringify({ scope: "system" }),
    });
    const json2 = await res2.json();
    console.log("Status:", res2.status, "Response:", json2);
    if (res2.status !== 403 || !json2.error?.includes("System Administrator")) {
      throw new Error("Test 2 FAILED: Registrar Admin was not blocked from creating platform backup");
    }
    console.log(">> PASSED: Registrar Admin properly blocked from creating platform backup!");

    // Test 3: SuperAdmin creates Platform Governance Backup
    console.log("\n[Test 3] SuperAdmin creates platform governance backup...");
    const supTotp = speakeasy.totp({ secret: supSecret.base32, encoding: "base32" });
    const res3 = await fetch(`${baseUrl}/api/system/backup`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: "http://localhost:3000",
        Cookie: `pup_session=${superToken}; pup_csrf=${supCsrf}`,
        "x-totp-token": supTotp,
      },
      body: JSON.stringify({ scope: "system" }),
    });
    const json3 = await res3.json();
    console.log("Status:", res3.status, "Response:", json3);
    if (!res3.ok || !json3.ok || json3.data?.scope !== "system") {
      throw new Error("Test 3 FAILED: SuperAdmin could not create platform backup");
    }
    console.log(">> PASSED: SuperAdmin created platform governance backup!");
    const systemBackupId = json3.data.id;

    // Test 4: Registrar Admin downloads their office backup (MUST SUCCEED 200)
    console.log("\n[Test 4] Registrar Admin downloads their office backup...");
    const res4 = await fetch(`${baseUrl}/api/system/backup/download?id=${registrarBackupId}`, {
      headers: {
        Cookie: `pup_session=${registrarToken}`,
      },
    });
    console.log("Status:", res4.status, "Content-Type:", res4.headers.get("content-type"));
    if (!res4.ok) {
      throw new Error("Test 4 FAILED: Registrar Admin could not download their own office backup");
    }
    console.log(">> PASSED: Registrar Admin successfully downloaded their office backup!");

    // Test 5: Registrar Admin attempts to download System Governance Backup (MUST FAIL 404 via canAccessResource)
    console.log("\n[Test 5] Registrar Admin attempts to download platform governance backup...");
    const res5 = await fetch(`${baseUrl}/api/system/backup/download?id=${systemBackupId}`, {
      headers: {
        Cookie: `pup_session=${registrarToken}`,
      },
    });
    console.log("Status:", res5.status);
    if (res5.status !== 404) {
      throw new Error("Test 5 FAILED: Registrar Admin was able to download platform backup!");
    }
    console.log(">> PASSED: Registrar Admin blocked from downloading platform governance backup!");

    // Test 6: Registrar Admin checks external drive status (MUST SUCCEED 200)
    console.log("\n[Test 6] Registrar Admin accesses external drive status...");
    const res6 = await fetch(`${baseUrl}/api/system/external-drive`, {
      headers: {
        Cookie: `pup_session=${registrarToken}`,
      },
    });
    const json6 = await res6.json();
    console.log("Status:", res6.status, "Data:", json6);
    if (!res6.ok || !json6.ok) {
      throw new Error("Test 6 FAILED: Registrar Admin could not access external drive status");
    }
    console.log(">> PASSED: Registrar Admin accessed external drive status!");

    // Test 7: Registrar Admin checks system health status (MUST SUCCEED 200)
    console.log("\n[Test 7] Registrar Admin accesses system health status...");
    const res7 = await fetch(`${baseUrl}/api/system/health`, {
      headers: {
        Cookie: `pup_session=${registrarToken}`,
      },
    });
    const json7 = await res7.json();
    console.log("Status:", res7.status, "Has Data:", Boolean(json7?.data));
    if (!res7.ok || !json7.ok) {
      throw new Error("Test 7 FAILED: Registrar Admin could not access system health status");
    }
    console.log(">> PASSED: Registrar Admin accessed system health status!");

    // Cleanup test backups from DB and disk
    console.log("\n--- Cleaning up test backup records ---");
    const backupsDir = getBackupsDir();
    if (json0.data?.filename) {
      const f0 = path.join(backupsDir, json0.data.filename);
      if (fs.existsSync(f0)) fs.unlinkSync(f0);
    }
    if (json1.data?.filename) {
      const f1 = path.join(backupsDir, json1.data.filename);
      if (fs.existsSync(f1)) fs.unlinkSync(f1);
    }
    if (json3.data?.filename) {
      const f3 = path.join(backupsDir, json3.data.filename);
      if (fs.existsSync(f3)) fs.unlinkSync(f3);
    }
    await query("DELETE FROM backups WHERE id IN ($1, $2, $3)", [test0BackupId, registrarBackupId, systemBackupId]);
    console.log(">> Backup file and row cleanup complete!");

    console.log("\n=== ALL BACKUP ROLE AUTHORIZATION TESTS PASSED ===");
  } finally {
    // Always reset TOTP settings
    await query("UPDATE staff SET totp_enabled = false, totp_secret = NULL WHERE id IN ($1, $2)", [
      registrarAdmin.id,
      superAdmin.id,
    ]);
    console.log(">> Reset TOTP settings for test accounts.");
  }
  process.exit(0);
}

testBackupEndpoints().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
