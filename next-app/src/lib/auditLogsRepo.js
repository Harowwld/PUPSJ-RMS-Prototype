import { dbAll, dbRun } from "./sqlite";

export async function createAuditLog({ actor, role, action, ip }) {
  await dbRun(
    `
    INSERT INTO audit_logs (
      actor,
      role,
      action,
      ip
    ) VALUES (?, ?, ?, ?)
  `,
    [actor, role, action, ip || null]
  );

  return true;
}

export async function countAuditLogs(search = "") {
  let query = `SELECT COUNT(*) as count FROM audit_logs`;
  let params = [];

  if (search) {
    query += ` WHERE actor LIKE ? OR action LIKE ? OR ip LIKE ?`;
    const term = `%${search}%`;
    params = [term, term, term];
  }

  const rows = await dbAll(query, params);
  return rows?.[0]?.count || 0;
}

export async function listAuditLogs({ limit = 200, offset = 0, search = "" } = {}) {
  const lim = Math.min(Math.max(parseInt(limit) || 200, 1), 500);
  const off = Math.max(parseInt(offset) || 0, 0);

  let query = `
    SELECT *
    FROM audit_logs
  `;
  let params = [];

  if (search) {
    query += ` WHERE actor LIKE ? OR action LIKE ? OR ip LIKE ?`;
    const term = `%${search}%`;
    params = [term, term, term];
  }

  query += ` ORDER BY datetime(created_at) DESC, id DESC LIMIT ? OFFSET ?`;
  params.push(lim, off);

  return await dbAll(query, params);
}
