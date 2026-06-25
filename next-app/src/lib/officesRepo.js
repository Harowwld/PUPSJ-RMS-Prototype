/**
 * Offices Repository
 *
 * CRUD operations for the offices table in system.sqlite.
 */
import { sysDbAll, sysDbGet, sysDbRun, getSystemDb } from "./systemDb.js";

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
 * Create a new office.
 */
export async function createOffice({ id, name, short_name, description, icon, accent_color }) {
  if (!id || !name || !short_name) {
    throw new Error("Office id, name, and short_name are required.");
  }

  const existing = await getOfficeById(id);
  if (existing) {
    throw new Error(`Office with id '${id}' already exists.`);
  }

  await sysDbRun(
    `INSERT INTO offices (id, name, short_name, description, icon, accent_color)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [id, name, short_name, description || null, icon || null, accent_color || "#800000"]
  );

  return await getOfficeById(id);
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
