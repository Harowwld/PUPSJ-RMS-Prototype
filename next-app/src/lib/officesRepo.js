/**
 * Offices Repository
 *
 * CRUD operations for the offices table in system.sqlite.
 *
 * Creating an office also:
 *   1. Provisions a dedicated SQLite database + folders at .local/<id>/ (db.sqlite,
 *      uploads/, backups/) via the office DB connection manager.
 *   2. Seeds a default Admin account for that office (e.g. PUPOSAS-001) so the
 *      SuperAdmin doesn't have to manually create one for every new office.
 */
import crypto from "node:crypto";
import { sysDbAll, sysDbGet, sysDbRun, getSystemDb } from "./systemDb.js";
import { getOfficeDb } from "./officeDb.js";

/** Default password used for newly-provisioned accounts (matches staff API). */
export const DEFAULT_STAFF_PASSWORD = process.env.DEFAULT_STAFF_PASSWORD || "pupstaff";

function hashPassword(password) {
  return crypto.createHash("sha256").update(String(password)).digest("hex");
}

/**
 * Returns the default admin account id for an office, e.g. "osas" -> "PUPOSAS-001".
 */
export function getDefaultOfficeAdminId(officeId) {
  return `PUP${String(officeId || "").trim().toUpperCase()}-001`;
}

/**
 * List all offices with optional filters.
 */
export async function listOffices({ status, q } = {}) {
  const filters = [];
  const params = [];

  if (status) {
    filters.push("status = ?");
    params.push(status);
  }

  if (q) {
    filters.push("(id LIKE ? OR name LIKE ? OR short_name LIKE ?)");
    const like = `%${q}%`;
    params.push(like, like, like);
  }

  const where = filters.length ? `WHERE ${filters.join(" AND ")}` : "";
  return await sysDbAll(
    `SELECT * FROM offices ${where} ORDER BY created_at ASC`,
    params
  );
}

/**
 * Get a single office by ID.
 */
export async function getOfficeById(id) {
  return await sysDbGet("SELECT * FROM offices WHERE id = ?", [id]);
}

/**
 * Seed a default Admin account for an office.
 *
 * Idempotent: if an account with the computed id or email already exists,
 * it is left untouched and returned.
 *
 * @returns {{ id, email, defaultPassword, created }} info about the admin account
 */
export async function createDefaultOfficeAdmin({ officeId, shortName }) {
  const adminId = getDefaultOfficeAdminId(officeId);
  const email = `admin.${officeId}@pup.local`;

  const existingById = await sysDbGet("SELECT * FROM staff WHERE id = ?", [adminId]);
  if (existingById) {
    return { id: adminId, email: existingById.email, defaultPassword: null, created: false };
  }

  const existingByEmail = await sysDbGet(
    "SELECT * FROM staff WHERE lower(email) = lower(?)",
    [email]
  );
  if (existingByEmail) {
    return { id: existingByEmail.id, email, defaultPassword: null, created: false };
  }

  const label = shortName || officeId;
  const passwordHash = hashPassword(DEFAULT_STAFF_PASSWORD);

  await sysDbRun(
    `INSERT INTO staff (id, office_id, fname, lname, role, section, status, email, password_hash, password_last_changed)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
    [adminId, officeId, label, "Admin", "Admin", "Administrative", "Active", email, passwordHash]
  );

  return { id: adminId, email, defaultPassword: DEFAULT_STAFF_PASSWORD, created: true };
}

/**
 * Create a new office.
 *
 * Besides inserting the registry row, this provisions the office's dedicated
 * database (.local/<id>/db.sqlite) and a default Admin account.
 *
 * The created admin info is attached to the returned object under `_admin`
 * (non-enumerable on the DB row otherwise) so callers can surface credentials.
 */
export async function createOffice({ id, name, short_name, description, icon, accent_color }) {
  if (!id || !name || !short_name) {
    throw new Error("Office id, name, and short_name are required.");
  }

  // Normalize id: lowercase, letters/numbers only — this is also the folder name
  // under .local/ and must match getOfficeDb()'s internal lowercasing.
  const officeId = String(id).trim().toLowerCase();
  if (!/^[a-z0-9]+$/.test(officeId)) {
    throw new Error("Office id must contain only letters and numbers (no spaces or symbols).");
  }

  const existing = await getOfficeById(officeId);
  if (existing) {
    throw new Error(`Office with id '${officeId}' already exists.`);
  }

  await sysDbRun(
    `INSERT INTO offices (id, name, short_name, description, icon, accent_color)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [officeId, name, short_name, description || null, icon || null, accent_color || "#800000"]
  );

  // 1) Provision the office's dedicated SQLite database + folders (.local/<id>/...).
  let dbProvisioned = false;
  try {
    await getOfficeDb(officeId);
    dbProvisioned = true;
  } catch (err) {
    console.error(
      `[createOffice] Failed to provision database for '${officeId}':`,
      err?.message || err
    );
  }

  // 2) Seed a default Admin account so the office is usable immediately.
  let admin = null;
  try {
    admin = await createDefaultOfficeAdmin({ officeId, shortName: short_name });
  } catch (err) {
    console.error(
      `[createOffice] Failed to create default admin for '${officeId}':`,
      err?.message || err
    );
  }

  const office = await getOfficeById(officeId);
  if (office) {
    Object.defineProperty(office, "_admin", { value: admin, enumerable: false });
    Object.defineProperty(office, "_dbProvisioned", { value: dbProvisioned, enumerable: false });
  }
  return office;
}

/**
 * Update an existing office.
 */
export async function updateOffice(id, patch) {
  const existing = await getOfficeById(id);
  if (!existing) return null;

  const next = {
    name: patch.name ?? existing.name,
    short_name: patch.short_name ?? existing.short_name,
    description: patch.description !== undefined ? patch.description : existing.description,
    icon: patch.icon !== undefined ? patch.icon : existing.icon,
    accent_color: patch.accent_color ?? existing.accent_color,
    status: patch.status ?? existing.status,
  };

  await sysDbRun(
    `UPDATE offices
     SET name = ?, short_name = ?, description = ?, icon = ?, accent_color = ?, status = ?, updated_at = datetime('now')
     WHERE id = ?`,
    [next.name, next.short_name, next.description, next.icon, next.accent_color, next.status, id]
  );

  return await getOfficeById(id);
}

/**
 * Deactivate an office (soft delete).
 */
export async function deactivateOffice(id) {
  return await updateOffice(id, { status: "Inactive" });
}

/**
 * Activate an office.
 */
export async function activateOffice(id) {
  return await updateOffice(id, { status: "Active" });
}

/**
 * Get the count of active staff in an office.
 */
export async function getOfficeStaffCount(officeId) {
  const row = await sysDbGet(
    "SELECT COUNT(*) as count FROM staff WHERE office_id = ? AND status = 'Active'",
    [officeId]
  );
  return row?.count || 0;
}

/**
 * Get all offices with their enabled module count and staff count.
 */
export async function listOfficesWithStats() {
  const db = await getSystemDb();
  return db.prepare(`
    SELECT 
      o.*,
      (SELECT COUNT(*) FROM office_modules om WHERE om.office_id = o.id AND om.enabled = 1) as module_count,
      (SELECT COUNT(*) FROM staff s WHERE s.office_id = o.id AND s.status = 'Active') as staff_count
    FROM offices o
    ORDER BY o.created_at ASC
  `).all();
}
