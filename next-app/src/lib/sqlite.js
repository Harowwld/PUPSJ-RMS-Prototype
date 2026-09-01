// Compatibility exports for legacy imports. Runtime persistence is PostgreSQL.
export { getSystemDb, sysDbAll, sysDbGet, sysDbRun, reloadSystemDb } from "./systemDb.js";
export { getOfficeDb, officeDbAll, officeDbGet, officeDbRun } from "./officeDb.js";
export { dbAll, dbGet, dbRun } from "./postgresCompat.js";

export async function getDb() {
  const { dbAll, dbGet, dbRun } = await import("./postgresCompat.js");
  return { prepare(sql) { return { all: (params) => dbAll(sql, params), get: (params) => dbGet(sql, params), run: (params) => dbRun(sql, params) }; } };
}
export function reloadDb() {}
export function setMaintenanceMode(enabled) { global.__systemMaintenanceMode = Boolean(enabled); }
