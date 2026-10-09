import {
  dbAll as postgresDbAll,
  dbGet as postgresDbGet,
  dbRun as postgresDbRun,
} from "./postgresCompat.js";

// Multi-office architecture: re-export system and office DB utilities
// so consumers can import from the familiar "./sqlite" path if needed.
export { getSystemDb, sysDbAll, sysDbGet, sysDbRun } from "./systemDb.js";
export { getOfficeDb, officeDbAll, officeDbGet, officeDbRun } from "./officeDb.js";

let db = global.sqliteDb || null;

export const DEFAULT_SECURITY_QUESTIONS = [
  "What was the name of your first pet?",
  "What is your mother's maiden name?",
  "What high school did you attend?",
  "What is the name of the street you grew up on?",
  "What was your childhood nickname?",
];

export async function getDb() {
  if (global.sqliteMaintenanceMode) {
    throw new Error("Database is undergoing scheduled maintenance/restoration. Please try again in a moment.");
  }

  // 1. Check if office context is set in AsyncLocalStorage (for manual script/task scopes)
  try {
    const { officeLocalStorage } = await import("./officeDb.js");
    const store = officeLocalStorage.getStore();
    if (store && store.officeId) {
      const { getOfficeDb } = await import("./officeDb.js");
      return getOfficeDb(store.officeId);
    }
  } catch {
    // Ignore
  }

  // Request handlers must pass an authenticated office scope explicitly. This
  // legacy helper is reserved for scripts and local maintenance tasks.
  // Fallback to the default Registrar partition only outside request context.
  if (db) {
    try {
      if (typeof db.pragma !== "function") {
        throw new Error("Stale database connection.");
      }
      db.prepare("SELECT 1").get();
      return db;
    } catch {
      db = null;
      global.sqliteDb = null;
    }
  }

  const { getOfficeDb } = await import("./officeDb.js");
  db = getOfficeDb("registrar");
  global.sqliteDb = db;
  return db;
}

export async function dbAll(sql, params) {
  return postgresDbAll(sql, params);
}

export async function dbGet(sql, params) {
  return postgresDbGet(sql, params);
}

export async function dbRun(sql, params) {
  return postgresDbRun(sql, params);
}

export function reloadDb() {
  if (db) {
    try {
      db.close();
      console.log("[DB] better-sqlite3 connection closed.");
    } catch {
      // ignore
    }
  }
  db = null;
  global.sqliteDb = null;
  console.log("[DB] In-memory connection cache cleared for reload.");
}

export function setMaintenanceMode(enabled) {
  global.sqliteMaintenanceMode = enabled;
  if (enabled) {
    reloadDb();
    console.log("[DB] Maintenance mode ENABLED. Connection closed.");
  } else {
    console.log("[DB] Maintenance mode DISABLED. Ready for connections.");
  }
}
