import crypto from "node:crypto";
import { dbAll, dbGet, dbRun } from "./sqlite.js";

function hashPassword(password) {
  return crypto.createHash("sha256").update(String(password)).digest("hex");
}

export function hashPasswordForStorage(password) {
  return hashPassword(password);
}

export async function setStaffPasswordById(id, newPassword) {
  const existing = await getStaffById(id);
  if (!existing) return null;

  await dbRun(
    `UPDATE staff
     SET password_hash = ?, updated_at = datetime('now')
     WHERE id = ?`,
    [hashPassword(newPassword), id]
  );

  return await getStaffById(id);
}

export async function verifyStaffPasswordById(id, password) {
  const existing = await getStaffById(id);
  if (!existing) return false;
  if (!existing.password_hash) return false;
  return existing.password_hash === hashPassword(password);
}

export async function createStaff({
  id,
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
      fname,
      lname,
      role,
      section,
      status,
      email,
      last_active,
      password_hash,
      updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
  `,
    [
      id,
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
  q,
  role,
  status,
  limit = 200,
  offset = 0,
} = {}) {
  const filters = [];
  const params = [];

  if (role) {
    filters.push("role = ?");
    params.push(role);
  }

  if (status) {
    filters.push("status = ?");
    params.push(status);
  }

  if (q) {
    filters.push("(id LIKE ? OR fname LIKE ? OR lname LIKE ? OR email LIKE ?)");
    const like = `%${q}%`;
    params.push(like, like, like, like);
  }

  const where = filters.length ? `WHERE ${filters.join(" AND ")}` : "";
  const lim = Math.min(Math.max(parseInt(limit) || 200, 1), 500);
  const off = Math.max(parseInt(offset) || 0, 0);

  return await dbAll(
    `
      SELECT *
      FROM staff
      ${where}
      ORDER BY lname ASC, fname ASC
      LIMIT ? OFFSET ?
    `,
    [...params, lim, off]
  );
}

export async function getStaffById(id) {
  const row = await dbGet("SELECT * FROM staff WHERE id = ?", [id]);
  return row || null;
}

export async function getStaffByUsername(username) {
  const u = String(username || "").trim();
  if (!u) return null;
  const row = await dbGet("SELECT * FROM staff WHERE lower(email) = lower(?)", [u]);
  return row || null;
}

export async function updateStaff(originalId, patch) {
  const existing = await getStaffById(originalId);
  if (!existing) return null;

  const nextId = patch.id ?? existing.id;
  const next = {
    id: nextId,
    fname: patch.fname ?? existing.fname,
    lname: patch.lname ?? existing.lname,
    role: patch.role ?? existing.role,
    section: patch.section ?? existing.section,
    status: patch.status ?? existing.status,
    email: patch.email ?? existing.email,
    last_active:
      patch.lastActive === undefined ? existing.last_active : patch.lastActive,
  };

  await dbRun(
    `
    UPDATE staff
    SET id = ?, fname = ?, lname = ?, role = ?, section = ?, status = ?, email = ?, last_active = ?, updated_at = datetime('now')
    WHERE id = ?
  `,
    [
      next.id,
      next.fname,
      next.lname,
      next.role,
      next.section,
      next.status,
      next.email,
      next.last_active,
      originalId,
    ]
  );

  return await getStaffById(next.id);
}

export async function deleteStaff(id) {
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

export function getStaffDisplayName(staff) {
  if (!staff) return "System";
  const fullName = `${staff.fname || ""} ${staff.lname || ""}`.trim();
  return fullName || staff.email || staff.id;
}

export async function hasAllSecurityAnswers(id) {
  const allQuestions = await dbGet("SELECT COUNT(*) as count FROM security_questions");
  const totalGlobal = allQuestions?.count || 0;

  // If no global questions are defined, we consider the requirement "satisfied"
  if (totalGlobal === 0) return true;

  const answers = await dbGet("SELECT COUNT(*) as count FROM staff_security_answers WHERE staff_id = ?", [id]);
  return answers?.count >= totalGlobal;
}
