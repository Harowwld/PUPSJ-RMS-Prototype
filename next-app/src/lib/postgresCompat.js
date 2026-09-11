import { query, queryOne } from "./postgres.js";

export function postgresSql(sql) {
  let index = 0;
  return sql.replace(/\?/g, () => `$${++index}`)
    .replace(/datetime\('now'\)/g, "CURRENT_TIMESTAMP")
    .replace(/\bIFNULL\(/g, "COALESCE(")
    .replace(/\btotp_enabled\s*=\s*1\b/gi, "totp_enabled = TRUE")
    .replace(/\btotp_enabled\s*=\s*0\b/gi, "totp_enabled = FALSE");
}

export const dbAll = (sql, params = []) => query(postgresSql(sql), params);
export const dbGet = (sql, params = []) => queryOne(postgresSql(sql), params);
export async function dbRun(sql, params = []) {
  const rows = await query(`${postgresSql(sql)} RETURNING *`, params);
  return { lastInsertRowid: rows[0]?.id, changes: rows.length };
}
