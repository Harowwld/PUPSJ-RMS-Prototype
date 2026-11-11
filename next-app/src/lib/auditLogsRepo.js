import { dbAll, dbRun, dbGet } from "./postgresCompat.js";
import { formatLogDetails } from "./auditLogFormatting.js";

// PostgreSQL migration currently provides global_audit_logs (not the legacy
// office-local audit_logs table). Keep the public API while using that table.
const sysDbAll = dbAll;
const sysDbGet = dbGet;
const sysDbRun = dbRun;

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
  return createGlobalAuditLog(data);
}

function applyActorFilter(whereClauses, params, { actorId, actorExact }) {
  const cleanActorId = String(actorId || "").trim();
  const actorList = (Array.isArray(actorExact) ? actorExact : [actorExact])
    .map((a) => String(a || "").trim())
    .filter(Boolean);

  if (cleanActorId && actorList.length > 0) {
    whereClauses.push(
      `(actor_id = ? OR (actor_id IS NULL AND LOWER(TRIM(actor)) IN (${actorList.map(() => "LOWER(TRIM(?))").join(", ")})))`
    );
    params.push(cleanActorId, ...actorList);
  } else if (cleanActorId) {
    whereClauses.push("actor_id = ?");
    params.push(cleanActorId);
  } else if (actorList.length === 1) {
    whereClauses.push("LOWER(TRIM(actor)) = LOWER(TRIM(?))");
    params.push(actorList[0]);
  } else if (actorList.length > 1) {
    whereClauses.push(`LOWER(TRIM(actor)) IN (${actorList.map(() => "LOWER(TRIM(?))").join(", ")})`);
    params.push(...actorList);
  }
}

export async function countAuditLogs(options) {
  const opt = options || {};
  const search = opt.search || "";
  const actorId = opt.actorId || opt.actor_id || "";
  const actorExact = opt.actorExact || "";
  const officeId = opt.officeId || opt.office_id || "";
  const role = opt.role || "";
  const severity = opt.severity || "";
  const excludeSeverity = opt.excludeSeverity || "";
  const startDate = opt.startDate || "";
  const endDate = opt.endDate || "";

  let query = "SELECT COUNT(*)::int as count FROM global_audit_logs";
  let params = [];
  let whereClauses = [];

  if (officeId) {
    whereClauses.push("office_id = ?");
    params.push(officeId);
  }

  applyActorFilter(whereClauses, params, { actorId, actorExact });

  if (role && role !== "All") {
    const roleList = Array.isArray(role) ? role : String(role).split(",").map((s) => s.trim()).filter(Boolean);
    if (roleList.length === 1) {
      whereClauses.push("role = ?");
      params.push(roleList[0]);
    } else if (roleList.length > 1) {
      whereClauses.push(`role IN (${roleList.map(() => "?").join(", ")})`);
      params.push(...roleList);
    }
  }

  if (severity && severity !== "All") {
    const sevList = Array.isArray(severity) ? severity : String(severity).split(",").map((s) => s.trim()).filter(Boolean);
    if (sevList.length === 1) {
      whereClauses.push("severity = ?");
      params.push(sevList[0]);
    } else if (sevList.length > 1) {
      whereClauses.push(`severity IN (${sevList.map(() => "?").join(", ")})`);
      params.push(...sevList);
    }
  }

  if (excludeSeverity) {
    const sevList = Array.isArray(excludeSeverity) ? excludeSeverity : String(excludeSeverity).split(",").map((s) => s.trim()).filter(Boolean);
    if (sevList.length === 1) {
      whereClauses.push("(severity IS NULL OR severity <> ?)");
      params.push(sevList[0]);
    } else if (sevList.length > 1) {
      whereClauses.push(`(severity IS NULL OR severity NOT IN (${sevList.map(() => "?").join(", ")}))`);
      params.push(...sevList);
    }
  }

  if (startDate) {
    if (startDate.includes("T") || startDate.includes(":")) {
      whereClauses.push("created_at >= ?::timestamptz");
    } else {
      whereClauses.push("(created_at AT TIME ZONE 'Asia/Manila')::date >= ?::date");
    }
    params.push(startDate);
  }

  if (endDate) {
    if (endDate.includes("T") || endDate.includes(":")) {
      whereClauses.push("created_at <= ?::timestamptz");
    } else {
      whereClauses.push("(created_at AT TIME ZONE 'Asia/Manila')::date <= ?::date");
    }
    params.push(endDate);
  }

  if (search) {
    whereClauses.push("(actor ILIKE ? OR actor_id ILIKE ? OR action ILIKE ? OR details ILIKE ? OR ip ILIKE ? OR entity_type ILIKE ? OR entity_id ILIKE ?)");
    const term = "%" + search + "%";
    params.push(term, term, term, term, term, term, term);
  }

  if (whereClauses.length > 0) {
    query += " WHERE " + whereClauses.join(" AND ");
  }

  const row = await dbGet(query, params);
  return row ? (Number(row.count) || 0) : 0;
}

export async function listAuditLogs(options) {
  const opt = options || {};
  const limit = opt.limit !== undefined ? opt.limit : 20;
  const offset = opt.offset !== undefined ? opt.offset : 0;
  const search = opt.search || "";
  const actorId = opt.actorId || opt.actor_id || "";
  const actorExact = opt.actorExact || "";
  const officeId = opt.officeId || opt.office_id || "";
  const role = opt.role || "";
  const severity = opt.severity || "";
  const excludeSeverity = opt.excludeSeverity || "";
  const startDate = opt.startDate || "";
  const endDate = opt.endDate || "";
  const sortBy = opt.sortBy || "created_at";
  const sortOrder = String(opt.sortOrder || "DESC").toUpperCase() === "ASC" ? "ASC" : "DESC";

  const lim = Math.min(Math.max(parseInt(limit) || 20, 1), 500);
  const off = Math.max(parseInt(offset) || 0, 0);

  let query = "SELECT * FROM global_audit_logs";
  let params = [];
  let whereClauses = [];

  if (officeId) {
    whereClauses.push("office_id = ?");
    params.push(officeId);
  }

  applyActorFilter(whereClauses, params, { actorId, actorExact });

  if (role && role !== "All") {
    const roleList = Array.isArray(role) ? role : String(role).split(",").map((s) => s.trim()).filter(Boolean);
    if (roleList.length === 1) {
      whereClauses.push("role = ?");
      params.push(roleList[0]);
    } else if (roleList.length > 1) {
      whereClauses.push(`role IN (${roleList.map(() => "?").join(", ")})`);
      params.push(...roleList);
    }
  }

  if (severity && severity !== "All") {
    const sevList = Array.isArray(severity) ? severity : String(severity).split(",").map((s) => s.trim()).filter(Boolean);
    if (sevList.length === 1) {
      whereClauses.push("severity = ?");
      params.push(sevList[0]);
    } else if (sevList.length > 1) {
      whereClauses.push(`severity IN (${sevList.map(() => "?").join(", ")})`);
      params.push(...sevList);
    }
  }

  if (excludeSeverity) {
    const sevList = Array.isArray(excludeSeverity) ? excludeSeverity : String(excludeSeverity).split(",").map((s) => s.trim()).filter(Boolean);
    if (sevList.length === 1) {
      whereClauses.push("(severity IS NULL OR severity <> ?)");
      params.push(sevList[0]);
    } else if (sevList.length > 1) {
      whereClauses.push(`(severity IS NULL OR severity NOT IN (${sevList.map(() => "?").join(", ")}))`);
      params.push(...sevList);
    }
  }

  if (startDate) {
    if (startDate.includes("T") || startDate.includes(":")) {
      whereClauses.push("created_at >= ?::timestamptz");
    } else {
      whereClauses.push("(created_at AT TIME ZONE 'Asia/Manila')::date >= ?::date");
    }
    params.push(startDate);
  }

  if (endDate) {
    if (endDate.includes("T") || endDate.includes(":")) {
      whereClauses.push("created_at <= ?::timestamptz");
    } else {
      whereClauses.push("(created_at AT TIME ZONE 'Asia/Manila')::date <= ?::date");
    }
    params.push(endDate);
  }

  if (search) {
    whereClauses.push("(actor ILIKE ? OR actor_id ILIKE ? OR action ILIKE ? OR details ILIKE ? OR ip ILIKE ? OR entity_type ILIKE ? OR entity_id ILIKE ?)");
    const term = "%" + search + "%";
    params.push(term, term, term, term, term, term, term);
  }

  if (whereClauses.length > 0) {
    query += " WHERE " + whereClauses.join(" AND ");
  }

  // Sanitize sortBy
  const validSortCols = ["id", "created_at", "actor", "role", "action", "severity", "ip"];
  const sortCol = validSortCols.includes(sortBy) ? sortBy : "created_at";

  if (sortCol === "created_at") {
    query += ` ORDER BY created_at ${sortOrder}, id ${sortOrder}`;
  } else {
    query += ` ORDER BY ${sortCol} ${sortOrder}, id DESC`;
  }

  query += " LIMIT ? OFFSET ?";
  params.push(lim, off);

  return await dbAll(query, params);
}

export async function getAuditLogStats(actor = "", officeId = "", options = {}) {
  let optActorId = "";
  let optActor = actor;
  let optOfficeId = officeId;

  if (typeof actor === "object" && !Array.isArray(actor) && actor !== null) {
    optActorId = actor.actorId || actor.actor_id || "";
    optActor = actor.actorExact || actor.actor || "";
    optOfficeId = actor.officeId || actor.office_id || "";
  } else if (typeof options === "object") {
    optActorId = options.actorId || options.actor_id || "";
  }

  const cleanActorId = String(optActorId || "").trim();
  const actorList = (Array.isArray(optActor) ? optActor : [optActor])
    .map((a) => String(a || "").trim())
    .filter(Boolean);

  // Main stats
  let mainQuery = "SELECT " +
    'COUNT(*)::int as "totalLogs", ' +
    'COALESCE(SUM(CASE WHEN (created_at AT TIME ZONE \'Asia/Manila\')::date = (CURRENT_TIMESTAMP AT TIME ZONE \'Asia/Manila\')::date THEN 1 ELSE 0 END), 0)::int as "logsToday", ' +
    'COALESCE(SUM(CASE WHEN LOWER(action) LIKE \'%login%\' OR LOWER(action) LIKE \'%logout%\' THEN 1 ELSE 0 END), 0)::int as "authEvents", ' +
    'COALESCE(SUM(CASE WHEN LOWER(action) LIKE \'%delete%\' OR LOWER(action) LIKE \'%remove%\' OR LOWER(action) LIKE \'%archive%\' OR LOWER(action) LIKE \'%update%\' OR LOWER(action) LIKE \'%edit%\' OR LOWER(action) LIKE \'%modify%\' THEN 1 ELSE 0 END), 0)::int as "systemChanges", ' +
    'COALESCE(SUM(CASE WHEN severity = \'CRITICAL\' THEN 1 ELSE 0 END), 0)::int as "criticalEvents", ' +
    'COALESCE(COUNT(DISTINCT actor), 0)::int as "activeActorsCount" ' +
    "FROM global_audit_logs";
  
  let mainParams = [];
  if (optOfficeId) {
    mainQuery += " WHERE office_id = ?";
    mainParams.push(optOfficeId);
  }

  if (cleanActorId && actorList.length > 0) {
    const clause = `(actor_id = ? OR (actor_id IS NULL AND LOWER(TRIM(actor)) IN (${actorList.map(() => "LOWER(TRIM(?))").join(", ")})))`;
    mainQuery += mainParams.length ? ` AND ${clause}` : ` WHERE ${clause}`;
    mainParams.push(cleanActorId, ...actorList);
  } else if (cleanActorId) {
    mainQuery += mainParams.length ? " AND actor_id = ?" : " WHERE actor_id = ?";
    mainParams.push(cleanActorId);
  } else if (actorList.length === 1) {
    mainQuery += mainParams.length ? " AND LOWER(TRIM(actor)) = LOWER(TRIM(?))" : " WHERE LOWER(TRIM(actor)) = LOWER(TRIM(?))";
    mainParams.push(actorList[0]);
  } else if (actorList.length > 1) {
    mainQuery += mainParams.length
      ? ` AND LOWER(TRIM(actor)) IN (${actorList.map(() => "LOWER(TRIM(?))").join(", ")})`
      : ` WHERE LOWER(TRIM(actor)) IN (${actorList.map(() => "LOWER(TRIM(?))").join(", ")})`;
    mainParams.push(...actorList);
  }

  const mainRows = await dbAll(mainQuery, mainParams);
  const row = (mainRows && mainRows.length > 0) ? mainRows[0] : {};
  const totalLogs = Number(row?.totalLogs ?? row?.totallogs ?? 0);
  const logsToday = Number(row?.logsToday ?? row?.logstoday ?? 0);
  const authEvents = Number(row?.authEvents ?? row?.authevents ?? 0);
  const systemChanges = Number(row?.systemChanges ?? row?.systemchanges ?? 0);
  const criticalEvents = Number(row?.criticalEvents ?? row?.criticalevents ?? 0);
  const activeActorsCount = Number(row?.activeActorsCount ?? row?.activeactorscount ?? 0);

  // 7-day trend data
  let trendQuery = "SELECT " +
    '(created_at AT TIME ZONE \'Asia/Manila\')::date as "day", ' +
    'COUNT(*)::int as "count", ' +
    'COALESCE(SUM(CASE WHEN LOWER(action) LIKE \'%login%\' OR LOWER(action) LIKE \'%logout%\' THEN 1 ELSE 0 END), 0)::int as "authCount", ' +
    'COALESCE(SUM(CASE WHEN severity = \'CRITICAL\' THEN 1 ELSE 0 END), 0)::int as "criticalCount" ' +
    "FROM global_audit_logs " +
    "WHERE (created_at AT TIME ZONE 'Asia/Manila')::date >= (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Manila')::date - INTERVAL '6 days' ";
  
  let trendParams = [];
  if (optOfficeId) {
    trendQuery += " AND office_id = ? ";
    trendParams.push(optOfficeId);
  }

  if (cleanActorId && actorList.length > 0) {
    const clause = `(actor_id = ? OR (actor_id IS NULL AND LOWER(TRIM(actor)) IN (${actorList.map(() => "LOWER(TRIM(?))").join(", ")})))`;
    trendQuery += ` AND ${clause} `;
    trendParams.push(cleanActorId, ...actorList);
  } else if (cleanActorId) {
    trendQuery += " AND actor_id = ? ";
    trendParams.push(cleanActorId);
  } else if (actorList.length === 1) {
    trendQuery += " AND LOWER(TRIM(actor)) = LOWER(TRIM(?)) ";
    trendParams.push(actorList[0]);
  } else if (actorList.length > 1) {
    trendQuery += ` AND LOWER(TRIM(actor)) IN (${actorList.map(() => "LOWER(TRIM(?))").join(", ")}) `;
    trendParams.push(...actorList);
  }
  
  trendQuery += "GROUP BY day ORDER BY day ASC";
  
  const trendRows = await dbAll(trendQuery, trendParams);
  
  const phFormatter = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila" });
  const trends = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dayStr = phFormatter.format(d);
    const match = trendRows.find(r => String(r.day).slice(0, 10) === dayStr);
    trends.push({
      day: dayStr,
      total: Number(match?.count ?? match?.total ?? 0),
      auth: Number(match?.authCount ?? match?.authcount ?? 0),
      critical: Number(match?.criticalCount ?? match?.criticalcount ?? 0)
    });
  }
  
  return {
    totalLogs,
    logsToday,
    authEvents,
    systemChanges,
    criticalEvents,
    activeActorsCount,
    trends
  };
}

/**
 * Creates a new global audit log entry.
 */
export async function createGlobalAuditLog(data) {
  const actor = data.actor;
  const actor_id = data.actor_id || data.actorId || null;
  const role = data.role;
  const officeId = data.officeId || data.office_id || null;
  const action = data.action;
  const details = formatLogDetails(data.details || "");
  const severity = data.severity || "INFO";
  const ip = data.ip || "localhost";
  const user_agent = data.user_agent || "";
  const entity_type = data.entity_type || "";
  const entity_id = data.entity_id || "";

  const sql = "INSERT INTO global_audit_logs (actor, actor_id, role, office_id, action, details, severity, user_agent, entity_type, entity_id, ip) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
  await sysDbRun(sql, [actor, actor_id, role, officeId, action, details, severity, user_agent, entity_type, entity_id, ip]);
}

function expandAuditRoleList(raw) {
  const list = Array.isArray(raw) ? raw : String(raw).split(",").map((s) => s.trim()).filter(Boolean);
  const expanded = new Set();
  for (const r of list) {
    if (r === "SuperAdmin" || r === "SystemAdmin") {
      expanded.add("SuperAdmin");
      expanded.add("SystemAdmin");
    } else {
      expanded.add(r);
    }
  }
  return [...expanded];
}

function applyGlobalAuditWhereClauses(whereClauses, params, { officeId, excludeOfficeId, severity, excludeSeverity, role, excludeRole, startDate, endDate, search }) {
  if (officeId && officeId !== "All") {
    const rawList = Array.isArray(officeId) ? officeId : String(officeId).split(",").map((s) => s.trim()).filter(Boolean);
    const hasGlobal = rawList.includes("global");
    const specificOffices = rawList.filter((o) => o !== "global");

    if (hasGlobal && specificOffices.length > 0) {
      whereClauses.push(`(office_id IS NULL OR office_id = '' OR office_id IN (${specificOffices.map(() => "?").join(", ")}))`);
      params.push(...specificOffices);
    } else if (hasGlobal) {
      whereClauses.push("(office_id IS NULL OR office_id = '')");
    } else if (specificOffices.length === 1) {
      whereClauses.push("office_id = ?");
      params.push(specificOffices[0]);
    } else if (specificOffices.length > 1) {
      whereClauses.push(`office_id IN (${specificOffices.map(() => "?").join(", ")})`);
      params.push(...specificOffices);
    }
  }

  if (excludeOfficeId) {
    const rawList = Array.isArray(excludeOfficeId) ? excludeOfficeId : String(excludeOfficeId).split(",").map((s) => s.trim()).filter(Boolean);
    const hasGlobal = rawList.includes("global");
    const specificOffices = rawList.filter((o) => o !== "global");

    if (hasGlobal && specificOffices.length > 0) {
      whereClauses.push(`(office_id IS NOT NULL AND office_id <> '' AND office_id NOT IN (${specificOffices.map(() => "?").join(", ")}))`);
      params.push(...specificOffices);
    } else if (hasGlobal) {
      whereClauses.push("office_id IS NOT NULL AND office_id <> ''");
    } else if (specificOffices.length === 1) {
      whereClauses.push("(office_id IS NULL OR office_id <> ?)");
      params.push(specificOffices[0]);
    } else if (specificOffices.length > 1) {
      whereClauses.push(`(office_id IS NULL OR office_id NOT IN (${specificOffices.map(() => "?").join(", ")}))`);
      params.push(...specificOffices);
    }
  }

  if (severity && severity !== "All") {
    const sevList = Array.isArray(severity) ? severity : String(severity).split(",").map((s) => s.trim()).filter(Boolean);
    if (sevList.length === 1) {
      whereClauses.push("severity = ?");
      params.push(sevList[0]);
    } else if (sevList.length > 1) {
      whereClauses.push(`severity IN (${sevList.map(() => "?").join(", ")})`);
      params.push(...sevList);
    }
  }

  if (excludeSeverity) {
    const sevList = Array.isArray(excludeSeverity) ? excludeSeverity : String(excludeSeverity).split(",").map((s) => s.trim()).filter(Boolean);
    if (sevList.length === 1) {
      whereClauses.push("(severity IS NULL OR severity <> ?)");
      params.push(sevList[0]);
    } else if (sevList.length > 1) {
      whereClauses.push(`(severity IS NULL OR severity NOT IN (${sevList.map(() => "?").join(", ")}))`);
      params.push(...sevList);
    }
  }

  if (excludeSeverity) {
    const sevList = Array.isArray(excludeSeverity) ? excludeSeverity : String(excludeSeverity).split(",").map((s) => s.trim()).filter(Boolean);
    if (sevList.length === 1) {
      whereClauses.push("(severity IS NULL OR severity <> ?)");
      params.push(sevList[0]);
    } else if (sevList.length > 1) {
      whereClauses.push(`(severity IS NULL OR severity NOT IN (${sevList.map(() => "?").join(", ")}))`);
      params.push(...sevList);
    }
  }

  if (role && role !== "All") {
    const roleList = expandAuditRoleList(role);
    if (roleList.length === 1) {
      whereClauses.push("role = ?");
      params.push(roleList[0]);
    } else if (roleList.length > 1) {
      whereClauses.push(`role IN (${roleList.map(() => "?").join(", ")})`);
      params.push(...roleList);
    }
  }

  if (excludeRole) {
    const roleList = expandAuditRoleList(excludeRole);
    if (roleList.length === 1) {
      whereClauses.push("(role IS NULL OR role <> ?)");
      params.push(roleList[0]);
    } else if (roleList.length > 1) {
      whereClauses.push(`(role IS NULL OR role NOT IN (${roleList.map(() => "?").join(", ")}))`);
      params.push(...roleList);
    }
  }

  if (startDate) {
    whereClauses.push(startDate.includes("T") || startDate.includes(":") ? "created_at >= ?::timestamptz" : "(created_at AT TIME ZONE 'Asia/Manila')::date >= ?::date");
    params.push(startDate);
  }

  if (endDate) {
    whereClauses.push(endDate.includes("T") || endDate.includes(":") ? "created_at <= ?::timestamptz" : "(created_at AT TIME ZONE 'Asia/Manila')::date <= ?::date");
    params.push(endDate);
  }

  if (search) {
    whereClauses.push("(actor ILIKE ? OR action ILIKE ? OR details ILIKE ? OR ip ILIKE ?)");
    const term = `%${search}%`;
    params.push(term, term, term, term);
  }
}

/**
 * List global audit logs with filtering and pagination.
 */
export async function listGlobalAuditLogs(options = {}) {
  const limit = options.limit !== undefined ? options.limit : 50;
  const offset = options.offset !== undefined ? options.offset : 0;
  const search = options.search || "";
  const officeId = options.officeId || options.office_id || "";
  const excludeOfficeId = options.excludeOfficeId || "";
  const severity = options.severity || "";
  const excludeSeverity = options.excludeSeverity || "";
  const role = options.role || "";
  const excludeRole = options.excludeRole || "";
  const startDate = options.startDate || "";
  const endDate = options.endDate || "";
  const sortBy = options.sortBy || "created_at";
  const sortOrder = String(options.sortOrder || "DESC").toUpperCase() === "ASC" ? "ASC" : "DESC";

  let query = "SELECT * FROM global_audit_logs";
  let params = [];
  let whereClauses = [];

  applyGlobalAuditWhereClauses(whereClauses, params, { officeId, excludeOfficeId, severity, excludeSeverity, role, excludeRole, startDate, endDate, search });

  if (whereClauses.length > 0) {
    query += " WHERE " + whereClauses.join(" AND ");
  }

  const allowedSortColumns = {
    created_at: "created_at",
    severity: "severity",
    actor: "actor",
    action: "action",
    office_id: "office_id",
  };
  const sortCol = allowedSortColumns[sortBy] || "created_at";

  query += ` ORDER BY ${sortCol} ${sortOrder}, id DESC LIMIT ? OFFSET ?`;
  params.push(limit, offset);

  return await sysDbAll(query, params);
}

/**
 * Count global audit logs matching criteria.
 */
export async function countGlobalAuditLogs(options = {}) {
  const search = options.search || "";
  const officeId = options.officeId || options.office_id || "";
  const excludeOfficeId = options.excludeOfficeId || "";
  const severity = options.severity || "";
  const excludeSeverity = options.excludeSeverity || "";
  const role = options.role || "";
  const excludeRole = options.excludeRole || "";
  const startDate = options.startDate || "";
  const endDate = options.endDate || "";

  let query = "SELECT COUNT(*) as count FROM global_audit_logs";
  let params = [];
  let whereClauses = [];

  applyGlobalAuditWhereClauses(whereClauses, params, { officeId, excludeOfficeId, severity, excludeSeverity, role, excludeRole, startDate, endDate, search });

  if (whereClauses.length > 0) {
    query += " WHERE " + whereClauses.join(" AND ");
  }

  const row = await sysDbGet(query, params);
  return row ? (row.count || 0) : 0;
}

/**
 * Calculates filtered global audit-log statistics and a seven-day trend.
 * This is PostgreSQL-native; the equivalent remote implementation used
 * SQLite date functions that are not available after the database migration.
 */
export async function getGlobalAuditLogStats(options = {}) {
  const officeId = options.officeId || options.office_id || "";
  const severity = options.severity || "";
  const role = options.role || "";
  const startDate = options.startDate || "";
  const endDate = options.endDate || "";
  const search = options.search || "";
  const params = [];
  const whereClauses = [];

  applyGlobalAuditWhereClauses(whereClauses, params, { officeId, severity, role, startDate, endDate, search });

  const filter = whereClauses.length ? ` WHERE ${whereClauses.join(" AND ")}` : "";
  const [statsRow] = await sysDbAll(
    'SELECT COUNT(*)::int AS "totalLogs", ' +
      'COALESCE(SUM(CASE WHEN (created_at AT TIME ZONE \'Asia/Manila\')::date = (CURRENT_TIMESTAMP AT TIME ZONE \'Asia/Manila\')::date THEN 1 ELSE 0 END), 0)::int AS "logsToday", ' +
      'COALESCE(SUM(CASE WHEN LOWER(action) LIKE \'%login%\' OR LOWER(action) LIKE \'%logout%\' THEN 1 ELSE 0 END), 0)::int AS "authEvents", ' +
      'COALESCE(SUM(CASE WHEN LOWER(action) LIKE \'%delete%\' OR LOWER(action) LIKE \'%remove%\' OR LOWER(action) LIKE \'%archive%\' OR LOWER(action) LIKE \'%update%\' OR LOWER(action) LIKE \'%edit%\' OR LOWER(action) LIKE \'%modify%\' THEN 1 ELSE 0 END), 0)::int AS "systemChanges", ' +
      'COALESCE(SUM(CASE WHEN severity = \'CRITICAL\' THEN 1 ELSE 0 END), 0)::int AS "criticalEvents", ' +
      'COALESCE(COUNT(DISTINCT actor), 0)::int AS "activeActorsCount" FROM global_audit_logs' + filter,
    params
  );

  const totalLogs = Number(statsRow?.totalLogs ?? statsRow?.totallogs ?? 0);
  const logsToday = Number(statsRow?.logsToday ?? statsRow?.logstoday ?? 0);
  const authEvents = Number(statsRow?.authEvents ?? statsRow?.authevents ?? 0);
  const systemChanges = Number(statsRow?.systemChanges ?? statsRow?.systemchanges ?? 0);
  const criticalEvents = Number(statsRow?.criticalEvents ?? statsRow?.criticalevents ?? 0);
  const activeActorsCount = Number(statsRow?.activeActorsCount ?? statsRow?.activeactorscount ?? 0);

  // The trend uses the same filters plus a seven-day window. Parameters must
  // be copied because the compatibility adapter maps positional placeholders.
  const trendFilter = whereClauses.length
    ? ` AND ${whereClauses.join(" AND ")}`
    : "";
  const trendRows = await sysDbAll(
    'SELECT (created_at AT TIME ZONE \'Asia/Manila\')::date AS "day", COUNT(*)::int AS "count", ' +
      'COALESCE(SUM(CASE WHEN LOWER(action) LIKE \'%login%\' OR LOWER(action) LIKE \'%logout%\' THEN 1 ELSE 0 END), 0)::int AS "authCount", ' +
      'COALESCE(SUM(CASE WHEN severity = \'CRITICAL\' THEN 1 ELSE 0 END), 0)::int AS "criticalCount" ' +
      'FROM global_audit_logs WHERE (created_at AT TIME ZONE \'Asia/Manila\')::date >= (CURRENT_TIMESTAMP AT TIME ZONE \'Asia/Manila\')::date - INTERVAL \'6 days\'' + trendFilter + ' GROUP BY day ORDER BY day ASC',
    params
  );

  const phFormatter = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila" });
  const trends = [];
  for (let i = 6; i >= 0; i -= 1) {
    const day = new Date();
    day.setDate(day.getDate() - i);
    const dayStr = phFormatter.format(day);
    const match = trendRows.find((row) => String(row.day).slice(0, 10) === dayStr);
    trends.push({
      day: dayStr,
      total: Number(match?.count ?? match?.total ?? 0),
      auth: Number(match?.authCount ?? match?.authcount ?? 0),
      critical: Number(match?.criticalCount ?? match?.criticalcount ?? 0)
    });
  }
  return {
    totalLogs,
    logsToday,
    authEvents,
    systemChanges,
    criticalEvents,
    activeActorsCount,
    trends
  };
}

function applyStaffActivityWhereClauses(whereClauses, params, { staffId, staffName, staffEmail, actors, search, severity }) {
  const rawTerms = Array.isArray(actors) && actors.length > 0
    ? actors
    : [staffName, staffEmail, staffId];
  const actorTerms = rawTerms
    .map((s) => String(s || "").trim())
    .filter(Boolean);

  const identityClauses = [];
  if (staffId) {
    identityClauses.push("actor_id = ?");
    params.push(String(staffId).trim());
  }

  if (actorTerms.length === 1) {
    identityClauses.push("(actor_id IS NULL AND LOWER(TRIM(actor)) = LOWER(TRIM(?)))");
    params.push(actorTerms[0]);
  } else if (actorTerms.length > 1) {
    identityClauses.push(`(actor_id IS NULL AND LOWER(TRIM(actor)) IN (${actorTerms.map(() => "LOWER(TRIM(?))").join(", ")}))`);
    params.push(...actorTerms);
  }

  if (staffId) {
    identityClauses.push("entity_id = ?");
    params.push(String(staffId).trim());

    identityClauses.push("(entity_type = 'User' AND details ILIKE ?)");
    params.push(`%${String(staffId).trim()}%`);
  }

  if (identityClauses.length > 0) {
    whereClauses.push(`(${identityClauses.join(" OR ")})`);
  }

  if (severity && severity !== "All") {
    const sevList = (Array.isArray(severity) ? severity : String(severity).split(","))
      .map((s) => s.trim().toUpperCase())
      .filter(Boolean);
    if (sevList.length === 1) {
      whereClauses.push("UPPER(TRIM(severity)) = ?");
      params.push(sevList[0]);
    } else if (sevList.length > 1) {
      whereClauses.push(`UPPER(TRIM(severity)) IN (${sevList.map(() => "?").join(", ")})`);
      params.push(...sevList);
    }
  }

  if (search) {
    whereClauses.push("(action ILIKE ? OR details ILIKE ? OR ip ILIKE ?)");
    const term = `%${String(search).trim()}%`;
    params.push(term, term, term);
  }
}

/**
 * List audit activity logs for a specific personnel account.
 */
export async function listStaffActivityLogs(options = {}) {
  const limit = options.limit !== undefined ? options.limit : 20;
  const offset = options.offset !== undefined ? options.offset : 0;
  const whereClauses = [];
  const params = [];

  applyStaffActivityWhereClauses(whereClauses, params, options);

  let query = "SELECT * FROM global_audit_logs";
  if (whereClauses.length > 0) {
    query += " WHERE " + whereClauses.join(" AND ");
  }

  query += " ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?";
  params.push(limit, offset);

  return await sysDbAll(query, params);
}

/**
 * Count audit activity logs for a specific personnel account.
 */
export async function countStaffActivityLogs(options = {}) {
  const whereClauses = [];
  const params = [];

  applyStaffActivityWhereClauses(whereClauses, params, options);

  let query = "SELECT COUNT(*)::int as count FROM global_audit_logs";
  if (whereClauses.length > 0) {
    query += " WHERE " + whereClauses.join(" AND ");
  }

  const row = await sysDbGet(query, params);
  return Number(row?.count || 0);
}

