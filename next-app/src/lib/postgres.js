import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL;

const pool = global.__pupsjPostgresPool || new Pool({
  connectionString,
  max: 10,
  connectionTimeoutMillis: 5000,
  idleTimeoutMillis: 30000,
});

global.__pupsjPostgresPool = pool;

import { getRlsContext } from "./rlsContext.js";

/** Execute a parameterized PostgreSQL query. */
export async function query(text, params = []) {
  const ctx = await getRlsContext();
  if (!ctx) return (await pool.query(text, params)).rows;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    if (ctx.userId) await client.query("SELECT set_config('app.current_user_id', $1, true)", [String(ctx.userId)]);
    if (ctx.role) await client.query("SELECT set_config('app.current_role', $1, true)", [String(ctx.role)]);
    if (ctx.officeId) await client.query("SELECT set_config('app.current_office_id', $1, true)", [String(ctx.officeId)]);
    const result = await client.query(text, params);
    await client.query("COMMIT");
    return result.rows;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

/** Return the first row from a parameterized PostgreSQL query, or null. */
export async function queryOne(text, params = []) {
  const rows = await query(text, params);
  return rows[0] || null;
}

/** Execute a callback in one PostgreSQL transaction. */
export async function transaction(callback) {
  const ctx = await getRlsContext();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    if (ctx) {
      if (ctx.userId) await client.query("SELECT set_config('app.current_user_id', $1, true)", [String(ctx.userId)]);
      if (ctx.role) await client.query("SELECT set_config('app.current_role', $1, true)", [String(ctx.role)]);
      if (ctx.officeId) await client.query("SELECT set_config('app.current_office_id', $1, true)", [String(ctx.officeId)]);
    }
    const result = await callback({
      query: (text, params = []) => client.query(text, params),
      queryOne: async (text, params = []) => (await client.query(text, params)).rows[0] || null,
    });
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

// Compatibility alias for the former system database facade.
export const withTransaction = transaction;

export { pool };
