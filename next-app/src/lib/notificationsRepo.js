import { dbAll, dbGet, dbRun } from "./sqlite.js";

export async function getStaffReviewNotificationsState(staffId) {
  if (!staffId) return { lastSeenReviewedAt: null };
  const row = await dbGet(
    "SELECT last_seen_reviewed_at AS lastSeenReviewedAt FROM staff_notification_state WHERE staff_id = ?",
    [staffId],
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
    [staffId],
  );
  return await getStaffReviewNotificationsState(staffId);
}

export async function setNotificationItemState(staffId, notificationIds, field, value) {
  if (!staffId || !notificationIds) return;
  const ids = Array.isArray(notificationIds) ? notificationIds : [notificationIds];
  const columnName = field === "read" ? "is_read" : "is_archived";
  
  for (const id of ids) {
    await dbRun(
      `
        INSERT INTO staff_notification_item_states (staff_id, notification_id, ${columnName})
        VALUES (?, ?, ?)
        ON CONFLICT(staff_id, notification_id) DO UPDATE SET
          ${columnName} = ?
      `,
      [staffId, id, value, value]
    );
  }
}

export async function listDocumentReviewNotifications({
  limit = 20,
  offset = 0,
  lastSeenReviewedAt = null,
  uploadedBy = null,
  sortBy = "reviewed_at",
  sortOrder = "DESC",
  tab = "inbox",
} = {}) {
  const lim = Math.min(Math.max(parseInt(limit) || 20, 1), 100);
  const off = Math.max(parseInt(offset) || 0, 0);

  const filters = ["d.reviewed_at IS NOT NULL", "d.approval_status IN ('Approved', 'Declined')"];
  const params = [];

  if (uploadedBy) {
    filters.push("d.uploaded_by = ?");
    params.push(uploadedBy);
  }

  const whereClause = filters.join(" AND ");
  const archiveCondition = tab === "archive" ? "COALESCE(ns.is_archived, 0) = 1" : "COALESCE(ns.is_archived, 0) = 0";

  const totalRow = await dbGet(
    `
      SELECT COUNT(1) AS total
      FROM documents d
      LEFT JOIN staff_notification_item_states ns ON d.id = ns.notification_id AND ns.staff_id = ?
      WHERE ${whereClause} AND ${archiveCondition}
    `,
    [uploadedBy, ...params]
  );
  const total = Number(totalRow?.total || 0);

  const unreadRow = await dbGet(
    `
      SELECT COUNT(1) AS unread
      FROM documents d
      LEFT JOIN staff_notification_item_states ns ON d.id = ns.notification_id AND ns.staff_id = ?
      WHERE ${whereClause} AND COALESCE(ns.is_read, 0) = 0 AND ${archiveCondition}
    `,
    [uploadedBy, ...params]
  );
  const unreadCount = Number(unreadRow?.unread || 0);

  const inboxCountRow = await dbGet(
    `
      SELECT COUNT(1) AS total
      FROM documents d
      LEFT JOIN staff_notification_item_states ns ON d.id = ns.notification_id AND ns.staff_id = ?
      WHERE ${whereClause} AND COALESCE(ns.is_archived, 0) = 0
    `,
    [uploadedBy, ...params]
  );
  const inboxCount = Number(inboxCountRow?.total || 0);

  const archiveCountRow = await dbGet(
    `
      SELECT COUNT(1) AS total
      FROM documents d
      LEFT JOIN staff_notification_item_states ns ON d.id = ns.notification_id AND ns.staff_id = ?
      WHERE ${whereClause} AND COALESCE(ns.is_archived, 0) = 1
    `,
    [uploadedBy, ...params]
  );
  const archiveCount = Number(archiveCountRow?.total || 0);

  const allowedSortCols = {
    decision: "d.approval_status",
    approval_status: "d.approval_status",
    student_no: "d.student_no",
    student_name: "d.student_name",
    doc_type: "d.doc_type",
    original_filename: "d.original_filename",
    file: "d.original_filename",
    reviewed_by: "d.reviewed_by",
    reviewed_at: "d.reviewed_at",
    reviewed: "d.reviewed_at"
  };
  const sortCol = allowedSortCols[sortBy] || "d.reviewed_at";
  const order = sortOrder?.toUpperCase() === "ASC" ? "ASC" : "DESC";

  const items = await dbAll(
    `
      SELECT
        d.id,
        d.student_no,
        d.student_name,
        d.doc_type,
        d.original_filename,
        d.approval_status,
        d.reviewed_by,
        d.reviewed_at,
        d.review_note,
        d.created_at,
        d.uploaded_by,
        COALESCE(ns.is_read, 0) AS is_read,
        COALESCE(ns.is_archived, 0) AS is_archived
      FROM documents d
      LEFT JOIN staff_notification_item_states ns ON d.id = ns.notification_id AND ns.staff_id = ?
      WHERE ${whereClause} AND ${archiveCondition}
      ORDER BY ${sortCol} ${order}, d.id DESC
      LIMIT ? OFFSET ?
    `,
    [uploadedBy, ...params, lim, off]
  );

  return { items, total, unreadCount, inboxCount, archiveCount };
}

