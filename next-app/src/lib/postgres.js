import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL;

const pool = global.__pupsjPostgresPool || new Pool({
  connectionString,
  max: 10,
});

global.__pupsjPostgresPool = pool;

/** Execute a parameterized PostgreSQL query. */
export async function query(text, params = []) {
  return (await pool.query(text, params)).rows;
}

/** Return the first row from a parameterized PostgreSQL query, or null. */
export async function queryOne(text, params = []) {
  const result = await pool.query(text, params);
  return result.rows[0] || null;
}

/** Execute a callback in one PostgreSQL transaction. */
export async function transaction(callback) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
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
