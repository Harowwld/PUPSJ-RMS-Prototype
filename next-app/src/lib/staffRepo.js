import crypto from "node:crypto";
import { query, queryOne } from "./postgres.js";
import { dbAll, dbGet, dbRun } from "./postgresCompat.js";
import { encryptPII, decryptPII } from "./piiEncryption.js";
import { hashPassword, verifyPasswordHash as verifyPasswordHashValue } from "./passwordHash.js";

function buildStaffScope(officeId) {
  if (officeId === undefined) return { clause: "", params: [] };
  if (officeId === null) return { clause: " AND office_id IS NULL", params: [] };
  return { clause: " AND office_id = ?", params: [officeId] };
}

export function hashPasswordForStorage(password) {
  return hashPassword(password);
}

export function verifyPasswordHash(password, stored) {
  return verifyPasswordHashValue(password, stored);
}


function decryptStaffRow(row) {
  if (!row) return row;
  if (row.fname) row.fname = decryptPII(row.fname);
  if (row.lname) row.lname = decryptPII(row.lname);
  if (row.email) row.email = decryptPII(row.email);
  return row;
}

export async function setStaffPasswordById(id, newPassword) {
  const existing = await getStaffById(id);
  if (!existing) return null;

  await query(
    `UPDATE staff SET password_hash = $1, updated_at = NOW(), password_last_changed = NOW() WHERE id = $2`,
    [hashPassword(newPassword), id]
  );

  return await getStaffById(id);
}

export async function verifyStaffPasswordById(id, password) {
  const existing = await getStaffById(id);
  if (!existing) return false;
  if (!existing.password_hash) return false;
  const result = verifyPasswordHashValue(password, existing.password_hash);
  if (result.valid && result.needsRehash) {
    await setStaffPasswordById(id, password);
  }
  return result.valid;
}

export async function createStaff({
  id,
  officeId,
  fname,
  lname,
  role,
  section,
  status,
  email,
  lastActive,
  password,
}) {
  await dbRun(
    `
    INSERT INTO staff (
      id,
      office_id,
      fname,
      lname,
      role,
      section,
      status,
      email,
      last_active,
      password_hash,
      password_last_changed,
      updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
  `,
    [
      id,
      officeId || null,
      fname,
      lname,
      role,
      section,
      status || "Active",
      email,
      lastActive || null,
      password ? hashPassword(password) : null,
    ]
  );

  return await getStaffById(id);
}

export async function listStaff({
  officeId,
  q,
  role,
  status,
  limit = 200,
  offset = 0,
} = {}) {
  const filters = [];
  const params = [];

  if (officeId !== undefined) {
    if (officeId === null) {
      filters.push("office_id IS NULL");
    } else {
      filters.push("LOWER(office_id) = LOWER(?)");
      params.push(officeId);
    }
  }

  if (role) {
    filters.push("role = ?");
    params.push(role);
  }

  if (status) {
    filters.push("status = ?");
    params.push(status);
  }



  const where = filters.length ? `WHERE ${filters.join(" AND ")}` : "";
  const lim = Math.min(Math.max(parseInt(limit) || 200, 1), 500);
  const off = Math.max(parseInt(offset) || 0, 0);

  let rows;
  if (!q) {
    rows = await dbAll(
      `SELECT * FROM staff ${where} ORDER BY updated_at DESC LIMIT ? OFFSET ?`,
      [...params, lim, off]
    );
  } else {
    rows = await dbAll(`SELECT * FROM staff ${where}`, [...params]);
  }

  let decryptedRows = (rows || []).map(decryptStaffRow);

  if (q) {
    const search = q.toLowerCase();
    decryptedRows = decryptedRows.filter(r => {
      if (r.id && r.id.toLowerCase().includes(search)) return true;
      if (r.fname && r.fname.toLowerCase().includes(search)) return true;
      if (r.lname && r.lname.toLowerCase().includes(search)) return true;
      if (r.email && r.email.toLowerCase().includes(search)) return true;
      return false;
    });

    decryptedRows.sort((a, b) => {
      const nameA = (a.lname || '').toLowerCase();
      const nameB = (b.lname || '').toLowerCase();
      return nameA < nameB ? -1 : (nameA > nameB ? 1 : 0);
    });

    return decryptedRows.slice(off, off + lim);
  }

  return decryptedRows;
}

export async function getStaffById(id, { officeId } = {}) {
  const scope = buildStaffScope(officeId);
  const row = await dbGet(`SELECT * FROM staff WHERE id = ?${scope.clause}`, [id, ...scope.params]);
  return decryptStaffRow(row) || null;
}

export async function getStaffByUsername(username) {
  const u = String(username || "").trim();
  if (!u) return null;
  const normalized = u.toLowerCase();
  const row = await dbGet(
    "SELECT * FROM staff WHERE email = ? OR lower(email) = lower(?) OR lower(id) = lower(?)",
    [encryptPII(normalized), u, u],
  );
  return decryptStaffRow(row) || null;
}

export async function updateStaff(originalId, patch, { officeId } = {}) {
  const existing = await getStaffById(originalId, { officeId });
  if (!existing) return null;

  const nextId = patch.id ?? existing.id;
  const next = {
    id: nextId,
    office_id: patch.officeId !== undefined ? patch.officeId : (patch.office_id !== undefined ? patch.office_id : existing.office_id),
    fname: patch.fname ?? existing.fname,
    lname: patch.lname ?? existing.lname,
    role: patch.role ?? existing.role,
    section: patch.section ?? existing.section,
    status: patch.status ?? existing.status,
    email: patch.email ?? existing.email,
    last_active:
      patch.lastActive === undefined ? existing.last_active : patch.lastActive,
    avatar_filename:
      patch.avatarFilename !== undefined
        ? patch.avatarFilename
        : patch.avatar_filename !== undefined
        ? patch.avatar_filename
        : existing.avatar_filename,
  };

  const scope = buildStaffScope(officeId);
  await dbRun(
    `
    UPDATE staff
    SET id = ?, office_id = ?, fname = ?, lname = ?, role = ?, section = ?, status = ?, email = ?, last_active = ?, avatar_filename = ?, updated_at = datetime('now')
    WHERE id = ?${scope.clause}
  `,
    [
      next.id,
      next.office_id,
      next.fname,
      next.lname,
      next.role,
      next.section,
      next.status,
      next.email,
      next.last_active,
      next.avatar_filename,
      originalId,
      ...scope.params,
    ]
  );

  return await getStaffById(next.id, { officeId: next.office_id });
}

export async function archiveStaff(id, { officeId } = {}) {
  const existing = await getStaffById(id, { officeId });
  if (!existing) return null;
  const scope = buildStaffScope(officeId);
  await dbRun(
    `UPDATE staff SET status = 'Archived', updated_at = datetime('now') WHERE id = ?${scope.clause}`,
    [id, ...scope.params]
  );
  return await getStaffById(id, { officeId });
}

export async function restoreStaff(id, { officeId } = {}) {
  const existing = await getStaffById(id, { officeId });
  if (!existing) return null;
  const scope = buildStaffScope(officeId);
  await dbRun(
    `UPDATE staff SET status = 'Active', updated_at = datetime('now') WHERE id = ?${scope.clause}`,
    [id, ...scope.params]
  );
  return await getStaffById(id, { officeId });
}

export async function deleteStaff(id) {
  // We prefer archiving (soft-delete) to preserve audit trails, 
  // but we keep this method name for compatibility with existing code.
  return await archiveStaff(id);
}

export async function hardDeleteStaff(id) {
  const existing = await getStaffById(id);
  if (!existing) return null;
  await dbRun(
    `DELETE FROM staff WHERE id = ?`,
    [id]
  );
  return true;
}

export async function touchStaffLastActiveById(id) {
  const existing = await getStaffById(id);
  if (!existing) return null;
  await dbRun(
    `UPDATE staff
     SET last_active = datetime('now'), updated_at = datetime('now'), status = 'Active'
     WHERE id = ?`,
    [id]
  );
  return await getStaffById(id);
}

export async function setStaffStatus(id, status) {
  const existing = await getStaffById(id);
  if (!existing) return null;
  await dbRun(
    `UPDATE staff
     SET status = ?, updated_at = datetime('now')
     WHERE id = ?`,
    [status, id]
  );
  return await getStaffById(id);
}

export async function updateStaffPreferences(staffId, prefs) {
  const staff = await getStaffById(staffId);
  if (!staff) return null;

  const defaultPreferences = {
    theme: "light",
    navigation_layout: "sidebar",
    skip_registration_confirmation: false,
    high_contrast: false
  };

  let currentPrefs = {};
  try {
    currentPrefs = JSON.parse(staff.preferences || "{}");
  } catch (e) {
    currentPrefs = {};
  }

  const nextPrefs = { ...defaultPreferences, ...currentPrefs, ...prefs };
  
  await dbRun(
    "UPDATE staff SET preferences = ?, updated_at = datetime('now') WHERE id = ?",
    [JSON.stringify(nextPrefs), staffId]
  );

  return nextPrefs;
}

export function getStaffDisplayName(staff) {
  if (!staff) return "System";
  const fullName = `${staff.fname || ""} ${staff.lname || ""}`.trim();
  return fullName || staff.email || staff.id;
}

export async function hasAllSecurityAnswers(id, role = "Staff") {
  // Only check for questions marked as required
  // PostgreSQL stores this field as BOOLEAN (SQLite used INTEGER 1/0).
  // Comparing a boolean column to the integer literal 1 causes auth/me to
  // fail during the first-login setup flow, leaving the user stuck at login.
  const requiredQuestions = await dbAll("SELECT id FROM security_questions WHERE is_required = TRUE");
  const totalRequired = requiredQuestions?.length || 0;

  // If no required global questions are defined, we consider the requirement "satisfied"
  if (totalRequired === 0) return true;

  let answers = [];
  if (role === "Student" || (typeof id === "number" && !isNaN(id))) {
    try {
      answers = await dbAll("SELECT question_id FROM student_security_answers WHERE student_account_id = ?", [Number(id)]);
    } catch {
      answers = [];
    }
  } else {
    answers = await dbAll("SELECT question_id FROM staff_security_answers WHERE staff_id = ?", [id]);
  }
  const answeredSet = new Set((answers || []).map(a => a.question_id));

  // Check if every required question has an answer
  for (const q of requiredQuestions) {
    if (!answeredSet.has(q.id)) return false;
  }

  return true;
}

/**
 * Generates 10 single-use recovery codes for a staff member.
 * Existing unused codes are invalidated.
 */
export async function generateRecoveryCodes(staffId) {
  const codes = [];
  for (let i = 0; i < 10; i++) {
    // Generate 8-character alphanumeric code
    const code = crypto.randomBytes(4).toString("hex").toUpperCase();
    codes.push(code);
  }

  // Delete existing unused codes
  await dbRun("DELETE FROM staff_recovery_codes WHERE staff_id = ? AND used_at IS NULL", [staffId]);

  // Insert new codes
  for (const code of codes) {
    const hash = crypto.createHash("sha256").update(code).digest("hex");
    await dbRun(
      "INSERT INTO staff_recovery_codes (staff_id, code_hash) VALUES (?, ?)",
      [staffId, hash]
    );
  }

  return codes;
}

/**
 * Gets the count of unused recovery codes for a staff member.
 */
export async function getRecoveryCodesCount(staffId) {
  const res = await dbGet(
    "SELECT COUNT(*) as count FROM staff_recovery_codes WHERE staff_id = ? AND used_at IS NULL",
    [staffId]
  );
  return res?.count || 0;
}

/**
 * Verifies a recovery code and marks it as used if valid.
 */
export async function verifyRecoveryCode(staffId, code) {
  if (!code || typeof code !== "string") return false;
  
  const hash = crypto.createHash("sha256").update(code.trim().toUpperCase()).digest("hex");
  const match = await dbGet(
    "SELECT id FROM staff_recovery_codes WHERE staff_id = ? AND code_hash = ? AND used_at IS NULL",
    [staffId, hash]
  );

  if (!match) return false;

  await dbRun(
    "UPDATE staff_recovery_codes SET used_at = datetime('now') WHERE id = ?",
    [match.id]
  );

  return true;
}

/**
 * Sets a new serial key for a staff member.
 */
export async function setSerialKey(staffId, serialKey) {
  if (!serialKey) return null;
  const hash = crypto.createHash("sha256").update(serialKey.trim().toUpperCase()).digest("hex");
  await dbRun(
    "UPDATE staff SET serial_key_hash = ?, updated_at = datetime('now') WHERE id = ?",
    [hash, staffId]
  );
  return true;
}

/**
 * Verifies a serial key against the stored hash.
 */
export async function verifySerialKey(staffId, serialKey) {
  if (!serialKey) return false;
  const staff = await getStaffById(staffId);
  if (!staff || !staff.serial_key_hash) return false;
  
  const hash = crypto.createHash("sha256").update(serialKey.trim().toUpperCase()).digest("hex");
  return staff.serial_key_hash === hash;
}
