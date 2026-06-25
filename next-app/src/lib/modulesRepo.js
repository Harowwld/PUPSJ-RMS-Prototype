/**
 * Modules Repository
 *
 * Manages the global module registry and per-office module assignments
 * in system.sqlite.
 */
import { sysDbAll, sysDbGet, sysDbRun, getSystemDb } from "./systemDb.js";

/**
 * List all modules in the global registry.
 */
export async function listAllModules({ category } = {}) {
  if (category) {
    return await sysDbAll(
      "SELECT * FROM modules WHERE category = ? ORDER BY sort_order ASC",
      [category]
    );
  }
  return await sysDbAll("SELECT * FROM modules ORDER BY category, sort_order ASC");
}

/**
 * Get a single module by ID.
 */
export async function getModuleById(id) {
  return await sysDbGet("SELECT * FROM modules WHERE id = ?", [id]);
}

/**
 * Get all enabled modules for an office.
 * Returns module details merged with office_modules config.
 */
export async function getOfficeModules(officeId) {
  const db = await getSystemDb();
  return db.prepare(`
    SELECT 
      m.*,
      om.enabled,
      om.config,
      COALESCE(om.sort_order, m.sort_order) as effective_sort_order
    FROM modules m
    INNER JOIN office_modules om ON om.module_id = m.id
    WHERE om.office_id = ?
      AND om.enabled = 1
    ORDER BY m.category, COALESCE(om.sort_order, m.sort_order) ASC
  `).all(officeId);
}

/**
 * Get all modules for an office (enabled AND disabled).
 * Used by SuperAdmin module configuration UI.
 */
export async function getAllOfficeModuleAssignments(officeId) {
  const db = await getSystemDb();
  return db.prepare(`
    SELECT 
      m.*,
      COALESCE(om.enabled, 0) as enabled,
      om.config,
      COALESCE(om.sort_order, m.sort_order) as effective_sort_order
    FROM modules m
    LEFT JOIN office_modules om ON om.module_id = m.id AND om.office_id = ?
    ORDER BY m.category, m.sort_order ASC
  `).all(officeId);
}

/**
 * Check if a specific module is enabled for an office.
 */
export async function isModuleEnabled(officeId, moduleId) {
  const row = await sysDbGet(
    "SELECT enabled FROM office_modules WHERE office_id = ? AND module_id = ?",
    [officeId, moduleId]
  );
  return row?.enabled === 1;
}

/**
 * Set the enabled modules for an office.
 * Takes an array of module IDs to enable; all others are disabled.
 * System modules (is_system = 1) are always force-enabled.
 *
 * @param {string} officeId
 * @param {string[]} enabledModuleIds - IDs of modules to enable
 */
export async function setOfficeModules(officeId, enabledModuleIds) {
  const db = await getSystemDb();

  // Get all modules to check system flags
  const allModules = db.prepare("SELECT id, is_system FROM modules").all();
  const systemModuleIds = allModules.filter(m => m.is_system === 1).map(m => m.id);

  // Merge: user selections + always-on system modules
  const finalEnabled = new Set([...enabledModuleIds, ...systemModuleIds]);

  const upsert = db.prepare(`
    INSERT INTO office_modules (office_id, module_id, enabled, sort_order)
    VALUES (?, ?, ?, ?)
    ON CONFLICT (office_id, module_id) 
    DO UPDATE SET enabled = excluded.enabled, sort_order = excluded.sort_order
  `);

  const updateMany = db.transaction((offId, moduleMap) => {
    let sortIdx = 0;
    for (const mod of allModules) {
      const enabled = moduleMap.has(mod.id) ? 1 : 0;
      upsert.run(offId, mod.id, enabled, sortIdx);
      sortIdx++;
    }
  });

  updateMany(officeId, finalEnabled);

  return await getOfficeModules(officeId);
}

/**
 * Enable a single module for an office.
 */
export async function enableModule(officeId, moduleId) {
  await sysDbRun(
    `INSERT INTO office_modules (office_id, module_id, enabled)
     VALUES (?, ?, 1)
     ON CONFLICT (office_id, module_id) 
     DO UPDATE SET enabled = 1`,
    [officeId, moduleId]
  );
}

/**
 * Disable a single module for an office.
 * System modules cannot be disabled.
 */
export async function disableModule(officeId, moduleId) {
  // Check if system module
  const mod = await getModuleById(moduleId);
  if (mod?.is_system === 1) {
    throw new Error(`Module '${moduleId}' is a system module and cannot be disabled.`);
  }

  await sysDbRun(
    `UPDATE office_modules SET enabled = 0 WHERE office_id = ? AND module_id = ?`,
    [officeId, moduleId]
  );
}

/**
 * Get the enabled module IDs for an office as a flat array.
 * Useful for including in JWT/auth responses.
 */
export async function getEnabledModuleIds(officeId) {
  const rows = await sysDbAll(
    `SELECT module_id FROM office_modules WHERE office_id = ? AND enabled = 1 ORDER BY sort_order ASC`,
    [officeId]
  );
  return rows.map(r => r.module_id);
}

/**
 * Get a summary of all offices and their module configurations.
 * Used by the SuperAdmin module config matrix UI.
 */
export async function getModuleConfigMatrix() {
  const db = await getSystemDb();

  const offices = db.prepare("SELECT id, short_name, accent_color, status FROM offices ORDER BY created_at ASC").all();
  const modules = db.prepare("SELECT * FROM modules ORDER BY category, sort_order ASC").all();
  const assignments = db.prepare("SELECT * FROM office_modules").all();

  // Build a lookup: { [officeId]: { [moduleId]: { enabled, config } } }
  const lookup = {};
  for (const a of assignments) {
    if (!lookup[a.office_id]) lookup[a.office_id] = {};
    lookup[a.office_id][a.module_id] = {
      enabled: a.enabled === 1,
      config: a.config,
    };
  }

  return { offices, modules, assignments: lookup };
}
