import { dbAll, dbGet, dbRun } from "./postgresCompat.js";
import { query, queryOne } from "./postgres.js";

/**
 * Creates a new system or workflow notification.
 */
export async function createNotification({
  officeId = null,
  type,
  title,
  message,
  severity = "info",
  actorName = null,
  actorId = null,
  entityType = null,
  entityId = null,
  metadata = {},
  createdAt = null,
}) {
  if (!type || !title || !message) {
    throw new Error("type, title, and message are required to create a notification");
  }

  const rows = await query(
    `
      INSERT INTO notifications (
        office_id, type, title, message, severity,
        actor_name, actor_id, entity_type, entity_id,
        metadata, created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, COALESCE($11, NOW()))
      RETURNING *
    `,
    [
      officeId,
      type,
      title,
      message,
      severity,
      actorName,
      actorId,
      entityType,
      entityId ? String(entityId) : null,
      JSON.stringify(metadata || {}),
      createdAt,
    ]
  );

  return rows[0] || null;
}

/**
 * Toggles or sets read state for specific notification IDs for a staff member.
 */
export async function setNotificationReadState(staffId, notificationIds, isRead = true) {
  if (!staffId || !notificationIds) return;
  const rawIds = Array.isArray(notificationIds) ? notificationIds : [notificationIds];
  const ids = rawIds
    .map((id) => Number(id))
    .filter((id) => Number.isSafeInteger(id) && id > 0);
  if (ids.length === 0) return;

  const value = Boolean(isRead);
  await query(
    `
      INSERT INTO staff_notification_reads (staff_id, notification_id, is_read, read_at, updated_at)
      SELECT $1, n.id, $2, CASE WHEN $2 THEN NOW() ELSE NULL END, NOW()
      FROM notifications n
      WHERE n.id = ANY($3::bigint[])
      ON CONFLICT (staff_id, notification_id) DO UPDATE SET
        is_read = EXCLUDED.is_read,
        read_at = EXCLUDED.read_at,
        updated_at = NOW()
    `,
    [staffId, value, ids]
  );
}

/**
 * Marks all notifications for a staff's office as read or unread.
 */
export async function markAllNotificationsReadState(staffId, officeId, isRead = true) {
  if (!staffId) return;
  const value = Boolean(isRead);
  const whereOffice = officeId ? "WHERE office_id = $3" : "";
  const params = officeId ? [staffId, value, officeId] : [staffId, value];

  await query(
    `
      INSERT INTO staff_notification_reads (staff_id, notification_id, is_read, read_at, updated_at)
      SELECT $1, id, $2, CASE WHEN $2 THEN NOW() ELSE NULL END, NOW()
      FROM notifications
      ${whereOffice}
      ON CONFLICT (staff_id, notification_id) DO UPDATE SET
        is_read = EXCLUDED.is_read,
        read_at = EXCLUDED.read_at,
        updated_at = NOW()
    `,
    params
  );
}

/**
 * Lists unified notifications with office scoping, Read/Unread tab segmentation,
 * full-text search, and type/decision filters.
 */
export async function listNotifications({
  limit = 50,
  offset = 0,
  staffId = null,
  officeId = null,
  sortBy = "created_at",
  sortOrder = "DESC",
  tab = "unread", // "unread" or "read"
  search = "",
  type = "",
  decision = "",
  severity = "",
} = {}) {
  const lim = Math.min(Math.max(parseInt(limit) || 50, 1), 100);
  const off = Math.max(parseInt(offset) || 0, 0);

  // 1. Calculate overall Unread and Read tab counters
  const countOfficeFilter = officeId ? "AND n.office_id = $2" : "";
  const countParams = officeId ? [staffId, officeId] : [staffId];

  const countsRow = await queryOne(
    `
      SELECT
        COUNT(1) FILTER (WHERE COALESCE(nr.is_read, FALSE) = FALSE) AS unread_count,
        COUNT(1) FILTER (WHERE COALESCE(nr.is_read, FALSE) = TRUE) AS read_count,
        COUNT(1) AS total_count
      FROM notifications n
      LEFT JOIN staff_notification_reads nr ON n.id = nr.notification_id AND nr.staff_id = $1
      WHERE 1=1 ${countOfficeFilter}
    `,
    countParams
  );

  const unreadCount = Number(countsRow?.unread_count || 0);
  const readCount = Number(countsRow?.read_count || 0);

  // 2. Active filters for current tab view
  const params = [staffId]; // $1 = staffId
  const filters = [];

  if (officeId) {
    params.push(officeId);
    filters.push(`n.office_id = $${params.length}`);
  }

  // Tab filtering: unread vs read
  const normalizedTab = String(tab || "unread").trim().toLowerCase();
  if (normalizedTab === "read") {
    filters.push("COALESCE(nr.is_read, FALSE) = TRUE");
  } else if (normalizedTab === "unread") {
    filters.push("COALESCE(nr.is_read, FALSE) = FALSE");
  }

  // Type filter
  const trimmedType = String(type || "").trim();
  if (trimmedType && trimmedType !== "all") {
    params.push(trimmedType);
    filters.push(`n.type = $${params.length}`);
  }

  // Decision filter (for document reviews e.g. Approved / Declined)
  const trimmedDecision = String(decision || "").trim();
  if (trimmedDecision) {
    const decisions = trimmedDecision.split(",").map((d) => d.trim()).filter(Boolean);
    if (decisions.length === 1) {
      params.push(decisions[0]);
      filters.push(`(n.metadata->>'approval_status') = $${params.length}`);
    } else if (decisions.length > 1) {
      const placeholders = decisions.map((d) => {
        params.push(d);
        return `$${params.length}`;
      }).join(", ");
      filters.push(`(n.metadata->>'approval_status') IN (${placeholders})`);
    }
  }

  // Severity filter
  const trimmedSeverity = String(severity || "").trim();
  if (trimmedSeverity) {
    params.push(trimmedSeverity);
    filters.push(`n.severity = $${params.length}`);
  }

  // Search filter
  const trimmedSearch = String(search || "").trim();
  if (trimmedSearch) {
    params.push(`%${trimmedSearch}%`);
    const searchIdx = params.length;
    filters.push(`(
      n.title ILIKE $${searchIdx} OR
      n.message ILIKE $${searchIdx} OR
      COALESCE(n.actor_name, '') ILIKE $${searchIdx} OR
      COALESCE(n.metadata->>'student_no', '') ILIKE $${searchIdx} OR
      COALESCE(n.metadata->>'student_name', '') ILIKE $${searchIdx} OR
      COALESCE(n.metadata->>'doc_type', '') ILIKE $${searchIdx} OR
      COALESCE(n.metadata->>'original_filename', '') ILIKE $${searchIdx} OR
      COALESCE(n.metadata->>'review_note', '') ILIKE $${searchIdx}
    )`);
  }

  const whereClause = filters.length > 0 ? `WHERE ${filters.join(" AND ")}` : "";

  // 3. Total matching active filters
  const totalRow = await queryOne(
    `
      SELECT COUNT(1) AS total
      FROM notifications n
      LEFT JOIN staff_notification_reads nr ON n.id = nr.notification_id AND nr.staff_id = $1
      ${whereClause}
    `,
    params
  );
  const total = Number(totalRow?.total || 0);

  // 4. Sort columns
  const allowedSortCols = {
    created_at: "n.created_at",
    date: "n.created_at",
    title: "n.title",
    type: "n.type",
    student_no: "(n.metadata->>'student_no')",
    reviewed_at: "n.created_at",
  };
  const sortCol = allowedSortCols[sortBy] || "n.created_at";
  const order = sortOrder?.toUpperCase() === "ASC" ? "ASC" : "DESC";

  // 5. Query items
  params.push(lim);
  const queryLimitIdx = params.length;
  params.push(off);
  const queryOffsetIdx = params.length;

  const items = await query(
    `
      SELECT
        n.id,
        n.office_id,
        n.type,
        n.title,
        n.message,
        n.severity,
        n.actor_name,
        n.actor_id,
        n.entity_type,
        n.entity_id,
        n.metadata,
        n.created_at,
        COALESCE(nr.is_read, FALSE) AS is_read,
        nr.read_at,
        -- Backward-compatible projections for existing consumers:
        COALESCE(n.metadata->>'student_no', '') AS student_no,
        COALESCE(n.metadata->>'student_name', '') AS student_name,
        COALESCE(n.metadata->>'doc_type', '') AS doc_type,
        COALESCE(n.metadata->>'original_filename', '') AS original_filename,
        COALESCE(n.metadata->>'approval_status', '') AS approval_status,
        COALESCE(n.actor_name, n.metadata->>'reviewed_by', '') AS reviewed_by,
        COALESCE(n.metadata->>'reviewed_at', n.created_at::text) AS reviewed_at,
        COALESCE(n.metadata->>'review_note', '') AS review_note,
        COALESCE(n.metadata->>'mime_type', 'application/pdf') AS mime_type,
        CASE WHEN (n.metadata->>'is_previewed')::boolean THEN 1 ELSE 0 END AS is_previewed
      FROM notifications n
      LEFT JOIN staff_notification_reads nr ON n.id = nr.notification_id AND nr.staff_id = $1
      ${whereClause}
      ORDER BY ${sortCol} ${order}, n.id DESC
      LIMIT $${queryLimitIdx} OFFSET $${queryOffsetIdx}
    `,
    params
  );

  return {
    items,
    total,
    unreadCount,
    readCount,
    inboxCount: unreadCount, // alias for backwards compatibility
    archiveCount: 0,        // archive is removed
  };
}

// -------------------------------------------------------------
// Legacy Backward-Compatibility Adapters
// -------------------------------------------------------------

export async function listDocumentReviewNotifications(opts = {}) {
  return await listNotifications(opts);
}

export async function getStaffReviewNotificationsState(staffId) {
  if (!staffId) return { lastSeenReviewedAt: null };
  const row = await dbGet(
    "SELECT last_seen_reviewed_at AS lastSeenReviewedAt FROM staff_notification_state WHERE staff_id = ?",
    [staffId]
  );
  return { lastSeenReviewedAt: row?.lastSeenReviewedAt || null };
}

export async function markStaffReviewNotificationsSeen(staffId) {
  if (!staffId) return { lastSeenReviewedAt: null };
  await dbRun(
    `
      INSERT INTO staff_notification_state (staff_id, last_seen_reviewed_at, updated_at)
      VALUES (?, datetime('now'), datetime('now'))
      ON CONFLICT(staff_id) DO UPDATE SET
        last_seen_reviewed_at = datetime('now'),
        updated_at = datetime('now')
    `,
    [staffId]
  );
  return await getStaffReviewNotificationsState(staffId);
}

export async function setNotificationItemState(staffId, notificationIds, field, value) {
  if (field === "read") {
    await setNotificationReadState(staffId, notificationIds, Boolean(value));
  }
}

export async function markAllStaffNotificationsReadState(staffId, officeId, isRead) {
  await markAllNotificationsReadState(staffId, officeId, isRead);
}
