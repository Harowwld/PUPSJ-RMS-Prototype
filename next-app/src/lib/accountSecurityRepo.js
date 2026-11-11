import crypto from "node:crypto";
import { query, queryOne } from "./postgres.js";

const PRINCIPALS = {
  staff: { table: "staff", recoveryTable: "staff_recovery_codes", foreignKey: "staff_id" },
  student: { table: "student_accounts", recoveryTable: "student_recovery_codes", foreignKey: "student_account_id" },
};

function principalRecord(principalType, id) {
  const config = PRINCIPALS[principalType];
  if (!config) throw new Error("Unsupported account type");
  const normalizedId = principalType === "student" ? Number(id) : String(id || "").trim();
  if ((principalType === "student" && (!Number.isSafeInteger(normalizedId) || normalizedId <= 0)) ||
      (principalType === "staff" && !normalizedId)) {
    throw new Error("Invalid account identifier");
  }
  return { ...config, id: normalizedId };
}

function hash(value) {
  return crypto.createHash("sha256").update(String(value).trim().toUpperCase()).digest("hex");
}

export async function getAccountSecurity(principalType, id) {
  const principal = principalRecord(principalType, id);
  return queryOne(
    `SELECT id::text AS id, totp_secret, totp_enabled, serial_key_hash FROM ${principal.table} WHERE id = $1`,
    [principal.id],
  );
}

export async function updateAccountTOTPSecret(principalType, id, secret) {
  const principal = principalRecord(principalType, id);
  await query(`UPDATE ${principal.table} SET totp_secret = $1, updated_at = NOW() WHERE id = $2`, [secret, principal.id]);
}

export async function updateAccountTOTPEnabled(principalType, id, enabled) {
  const principal = principalRecord(principalType, id);
  await query(`UPDATE ${principal.table} SET totp_enabled = $1, updated_at = NOW() WHERE id = $2`, [Boolean(enabled), principal.id]);
}

export async function clearAccountTOTP(principalType, id) {
  const principal = principalRecord(principalType, id);
  await query(
    `UPDATE ${principal.table} SET totp_secret = NULL, serial_key_hash = NULL, updated_at = NOW() WHERE id = $1`,
    [principal.id],
  );
}

export async function getAccountRecoveryCodesCount(principalType, id) {
  const principal = principalRecord(principalType, id);
  const row = await queryOne(
    `SELECT COUNT(*)::int AS count FROM ${principal.recoveryTable} WHERE ${principal.foreignKey} = $1 AND used_at IS NULL`,
    [principal.id],
  );
  return Number(row?.count || 0);
}

export async function deleteAccountRecoveryCodes(principalType, id) {
  const principal = principalRecord(principalType, id);
  await query(`DELETE FROM ${principal.recoveryTable} WHERE ${principal.foreignKey} = $1`, [principal.id]);
}

export async function generateAccountRecoveryCodes(principalType, id) {
  const principal = principalRecord(principalType, id);
  const codes = Array.from({ length: 10 }, () => crypto.randomBytes(4).toString("hex").toUpperCase());
  await query(
    `DELETE FROM ${principal.recoveryTable} WHERE ${principal.foreignKey} = $1 AND used_at IS NULL`,
    [principal.id],
  );
  for (const code of codes) {
    await query(
      `INSERT INTO ${principal.recoveryTable} (${principal.foreignKey}, code_hash) VALUES ($1, $2)`,
      [principal.id, hash(code)],
    );
  }
  return codes;
}

export async function verifyAccountRecoveryCode(principalType, id, code) {
  if (!code || typeof code !== "string") return false;
  const principal = principalRecord(principalType, id);
  const row = await queryOne(
    `UPDATE ${principal.recoveryTable}
        SET used_at = NOW()
      WHERE id = (
        SELECT id FROM ${principal.recoveryTable}
         WHERE ${principal.foreignKey} = $1 AND code_hash = $2 AND used_at IS NULL
         LIMIT 1 FOR UPDATE SKIP LOCKED
      )
      RETURNING id`,
    [principal.id, hash(code)],
  );
  return Boolean(row);
}

export async function setAccountSerialKey(principalType, id, serialKey) {
  if (!serialKey) return false;
  const principal = principalRecord(principalType, id);
  await query(`UPDATE ${principal.table} SET serial_key_hash = $1, updated_at = NOW() WHERE id = $2`, [hash(serialKey), principal.id]);
  return true;
}

export async function verifyAccountSerialKey(principalType, id, serialKey) {
  if (!serialKey) return false;
  const account = await getAccountSecurity(principalType, id);
  return Boolean(account?.serial_key_hash && account.serial_key_hash === hash(serialKey));
}
