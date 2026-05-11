import { dbAll, dbRun, dbGet } from "./sqlite";

/**
 * Creates a new audit log entry.
 * @param {Object} data - Log data
 * @param {string} data.actor - Who performed the action
 * @param {string} data.role - Role of the actor
 * @param {string} data.action - Brief label of the action
 * @param {string} data.details - Rich, human-readable description
 * @param {string} [data.severity='INFO'] - INFO, WARNING, CRITICAL
 * @param {string} [data.user_agent] - Browser/Device info
 * @param {string} [data.entity_type] - e.g., 'Student', 'Document', 'Course'
 * @param {string} [data.entity_id] - ID of the affected record
 * @param {string} [data.ip] - IP address
 */
export async function createAuditLog(data) {
  const actor = data.actor;
  const role = data.role;
  const action = data.action;
  const details = data.details || "";
  const severity = data.severity || "INFO";
  const user_agent = data.user_agent || "";
  const entity_type = data.entity_type || "";
  const entity_id = data.entity_id || "";
  const ip = data.ip || "localhost";

  const sql = "INSERT INTO audit_logs (actor, role, action, details, severity, user_agent, entity_type, entity_id, ip) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)";
  await dbRun(sql, [actor, role, action, details, severity, user_agent, entity_type, entity_id, ip]);
}

export async function countAuditLogs(options) {
  const opt = options || {};
  const search = opt.search || "";
  const actorExact = opt.actorExact || "";
  const role = opt.role || "";
  const severity = opt.severity || "";

  let query = "SELECT COUNT(*) as count FROM audit_logs";
  let params = [];
  let whereClauses = [];

  if (actorExact) {
    whereClauses.push("actor = ?");
    params.push(actorExact);
  }

  if (role && role !== "All") {
    whereClauses.push("role = ?");
    params.push(role);
  }

  if (severity && severity !== "All") {
    whereClauses.push("severity = ?");
    params.push(severity);
  }

  if (search) {
    whereClauses.push("(actor LIKE ? OR action LIKE ? OR details LIKE ? OR ip LIKE ? OR entity_type LIKE ? OR entity_id LIKE ?)");
    const term = "%" + search + "%";
    params.push(term, term, term, term, term, term);
  }

  if (whereClauses.length > 0) {
    query += " WHERE " + whereClauses.join(" AND ");
  }

  const row = await dbGet(query, params);
  return row ? (row.count || 0) : 0;
}

export async function listAuditLogs(options) {
  const opt = options || {};
  const limit = opt.limit !== undefined ? opt.limit : 20;
  const offset = opt.offset !== undefined ? opt.offset : 0;
  const search = opt.search || "";
  const actorExact = opt.actorExact || "";
  const role = opt.role || "";
  const severity = opt.severity || "";

  const lim = Math.min(Math.max(parseInt(limit) || 20, 1), 500);
  const off = Math.max(parseInt(offset) || 0, 0);

  let query = "SELECT * FROM audit_logs";
  let params = [];
  let whereClauses = [];

  if (actorExact) {
    whereClauses.push("actor = ?");
    params.push(actorExact);
  }

  if (role && role !== "All") {
    whereClauses.push("role = ?");
    params.push(role);
  }

  if (severity && severity !== "All") {
    whereClauses.push("severity = ?");
    params.push(severity);
  }

  if (search) {
    whereClauses.push("(actor LIKE ? OR action LIKE ? OR details LIKE ? OR ip LIKE ? OR entity_type LIKE ? OR entity_id LIKE ?)");
    const term = "%" + search + "%";
    params.push(term, term, term, term, term, term);
  }

  if (whereClauses.length > 0) {
    query += " WHERE " + whereClauses.join(" AND ");
  }

  query += " ORDER BY datetime(created_at) DESC, id DESC LIMIT ? OFFSET ?";
  params.push(lim, off);

  return await dbAll(query, params);
}

export async function getAuditLogStats(actor = "") {
  let query = "SELECT " +
    "COUNT(*) as totalLogs, " +
    "COALESCE(SUM(CASE WHEN date(created_at, 'localtime') = date('now', 'localtime') THEN 1 ELSE 0 END), 0) as logsToday, " +
    "COALESCE(SUM(CASE WHEN LOWER(action) LIKE '%login%' OR LOWER(action) LIKE '%logout%' THEN 1 ELSE 0 END), 0) as authEvents, " +
    "COALESCE(SUM(CASE WHEN LOWER(action) LIKE '%delete%' OR LOWER(action) LIKE '%remove%' OR LOWER(action) LIKE '%archive%' OR LOWER(action) LIKE '%update%' OR LOWER(action) LIKE '%edit%' OR LOWER(action) LIKE '%modify%' THEN 1 ELSE 0 END), 0) as systemChanges, " +
    "COALESCE(SUM(CASE WHEN severity = 'CRITICAL' THEN 1 ELSE 0 END), 0) as criticalEvents " +
    "FROM audit_logs";
  
  let params = [];
  if (actor) {
    query += " WHERE actor = ?";
    params.push(actor);
  }

  const rows = await dbAll(query, params);
  return (rows && rows.length > 0) ? rows[0] : { totalLogs: 0, logsToday: 0, authEvents: 0, systemChanges: 0, criticalEvents: 0 };
}
