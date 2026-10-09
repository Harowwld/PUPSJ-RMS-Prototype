/**
 * Office Database Connection Manager
 *
 * Office-scoped storage paths are retained for local uploaded files and legacy
 * compatibility. Runtime office data is now queried from the shared PostgreSQL
 * database through the connection pool below.
 *
 * The old SQLite schema templates remain only for compatibility with legacy
 * local-storage helpers; PostgreSQL migrations define the active schema.
 */
import path from "node:path";
import { AsyncLocalStorage } from "node:async_hooks";
import { query, queryOne } from "./postgres.js";
import { postgresSql } from "./postgresCompat.js";

export const officeLocalStorage = new AsyncLocalStorage();

/**
 * Connection pool: { [officeId]: Database }
 * Cached on the global object to survive HMR in development.
 */
const pool = global.__officeDbPool || {};
global.__officeDbPool = pool;

function getLocalDataRoot() {
  return process.env.LOCAL_DATA_DIR
    ? process.env.LOCAL_DATA_DIR
    : path.join(process.cwd(), ".local");
}

/**
 * Returns the filesystem path for an office's database.
 */
export function getOfficeDbPath(officeId) {
  const localRoot = getLocalDataRoot();
  return path.join(localRoot, officeId, "db.sqlite");
}

/**
 * Returns the uploads directory for an office.
 */
export function getOfficeUploadsDir(officeId) {
  const localRoot = getLocalDataRoot();
  return path.join(localRoot, officeId, "uploads");
}

/**
 * Returns the backups directory for an office.
 */
export function getOfficeBackupsDir(officeId) {
  const localRoot = getLocalDataRoot();
  return path.join(localRoot, officeId, "backups");
}

/**
 * Get or initialize a database connection/**
 * Get or initialize a database connection for a specific office.
 *
 * @param {string} officeId - Office identifier (e.g., 'registrar', 'osas')
 * @returns {object} PostgreSQL office context handle
 */
export async function getOfficeDb(officeId) {
  if (!officeId || typeof officeId !== "string") {
    throw new Error("getOfficeDb: officeId is required");
  }

  const id = officeId.trim().toLowerCase();

  const db = { officeId: id, postgres: true };
  pool[id] = db;
  return db;
}

/**
 * Close and remove an office database connection from the pool.
 */
export function closeOfficeDb(officeId) {
  const id = officeId.trim().toLowerCase();
  if (pool[id]) {
    try {
      pool[id].close();
    } catch {
      // ignore
    }
    delete pool[id];
    console.log(`[OfficeDB:${id}] Connection closed.`);
  }
}

/**
 * Close all office database connections.
 */
export function closeAllOfficeDbs() {
  for (const id of Object.keys(pool)) {
    closeOfficeDb(id);
  }
  console.log("[OfficeDB] All connections closed.");
}

/**
 * Helper: run a query returning all rows on an office database.
 */
export async function officeDbAll(officeId, sql, params) {
  const normalized = params === undefined || params === null ? [] : Array.isArray(params) ? params : [params];
  return query(postgresSql(sql), normalized);
}

/**
 * Helper: run a query returning one row on an office database.
 */
export async function officeDbGet(officeId, sql, params) {
  const normalized = params === undefined || params === null ? [] : Array.isArray(params) ? params : [params];
  return queryOne(postgresSql(sql), normalized);
}

/**
 * Helper: run a write query on an office database.
 */
export async function officeDbRun(officeId, sql, params) {
  const normalized = params === undefined || params === null ? [] : Array.isArray(params) ? params : [params];
  const rows = await query(`${postgresSql(sql)} RETURNING *`, normalized);
  return {
    changes: rows.length,
    lastInsertRowid: rows[0]?.id,
  };
}
