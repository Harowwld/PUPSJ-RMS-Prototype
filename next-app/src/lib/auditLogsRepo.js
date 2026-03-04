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

export async function listAuditLogs({ limit = 200, offset = 0 } = {}) {
  const lim = Math.min(Math.max(parseInt(limit) || 200, 1), 500);
  const off = Math.max(parseInt(offset) || 0, 0);

  return await dbAll(
    `
      SELECT *
      FROM audit_logs
      ORDER BY datetime(created_at) DESC, id DESC
      LIMIT ? OFFSET ?
    `,
    [lim, off]
  );
}
