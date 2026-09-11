import { dbAll, dbGet, dbRun } from "./postgresCompat.js";

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

export async function setNotificationItemState(staffId, notificationIds, field, value, officeId) {
  if (!staffId || !notificationIds || !officeId) return;
  const ids = Array.isArray(notificationIds) ? notificationIds : [notificationIds];
  const columnName = field === "read" ? "is_read" : "is_archived";
  const booleanValue = Boolean(value);
  
  for (const id of ids) {
    await dbRun(
      `
        INSERT INTO staff_notification_item_states (staff_id, notification_id, ${columnName})
        SELECT ?, d.id, ?
        FROM documents d
        WHERE d.id = ?
          AND d.office_id = ?
          AND d.reviewed_at IS NOT NULL
          AND d.approval_status IN ('Approved', 'Declined')
        ON CONFLICT(staff_id, notification_id) DO UPDATE SET
          ${columnName} = ?
      `,
      [staffId, booleanValue, id, officeId, booleanValue]
    );
  }
}

export async function markAllStaffNotificationsReadState(staffId, officeId, isRead) {
  if (!staffId || !officeId) return;
  const value = Boolean(isRead);
  
  // Notification visibility is office-wide. Read/archive state remains
  // personal to the staff member who is viewing the notification center.
  await dbRun(
    `
      INSERT INTO staff_notification_item_states (staff_id, notification_id, is_read)
      SELECT ?, d.id, ? FROM documents d
      LEFT JOIN staff_notification_item_states ns ON d.id = ns.notification_id AND ns.staff_id = ?
      WHERE d.office_id = ?
        AND d.reviewed_at IS NOT NULL 
        AND d.approval_status IN ('Approved', 'Declined')
        AND COALESCE(ns.is_archived, FALSE) = FALSE
      ON CONFLICT(staff_id, notification_id) DO UPDATE SET
        is_read = excluded.is_read
    `,
    [staffId, value, staffId, officeId]
  );
}

export async function listDocumentReviewNotifications({
  limit = 20,
  offset = 0,
  lastSeenReviewedAt = null,
  staffId = null,
  officeId = null,
  sortBy = "reviewed_at",
  sortOrder = "DESC",
  tab = "inbox",
  search = "",
  decision = "",
  readStatus = "",
} = {}) {
  const lim = Math.min(Math.max(parseInt(limit) || 20, 1), 100);
  const off = Math.max(parseInt(offset) || 0, 0);

  const baseFilters = ["d.reviewed_at IS NOT NULL", "d.approval_status IN ('Approved', 'Declined')"];
  const baseParams = [];

  if (officeId) {
    baseFilters.push("d.office_id = ?");
    baseParams.push(officeId);
  }

  const archiveCondition = tab === "archive" ? "COALESCE(ns.is_archived, FALSE) = TRUE" : "COALESCE(ns.is_archived, FALSE) = FALSE";
  const baseWhereClause = baseFilters.join(" AND ");

  // Inbox & Archive counts for tab headers remain unaffected by active filters
  const inboxCountRow = await dbGet(
    `
      SELECT COUNT(1) AS total
      FROM documents d
      LEFT JOIN staff_notification_item_states ns ON d.id = ns.notification_id AND ns.staff_id = ?
      WHERE ${baseWhereClause} AND COALESCE(ns.is_archived, FALSE) = FALSE
    `,
    [staffId, ...baseParams]
  );
  const inboxCount = Number(inboxCountRow?.total || 0);

  const archiveCountRow = await dbGet(
    `
      SELECT COUNT(1) AS total
      FROM documents d
      LEFT JOIN staff_notification_item_states ns ON d.id = ns.notification_id AND ns.staff_id = ?
      WHERE ${baseWhereClause} AND COALESCE(ns.is_archived, FALSE) = TRUE
    `,
    [staffId, ...baseParams]
  );
  const archiveCount = Number(archiveCountRow?.total || 0);

  // Active view filters
  const filters = [...baseFilters];
  const params = [...baseParams];

  const trimmedSearch = String(search || "").trim();
  if (trimmedSearch) {
    const s = `%${trimmedSearch}%`;
    filters.push("(d.student_no LIKE ? OR d.student_name LIKE ? OR d.original_filename LIKE ? OR d.doc_type LIKE ? OR d.review_note LIKE ? OR d.reviewed_by LIKE ?)");
    params.push(s, s, s, s, s, s);
  }

  if (decision && ["Approved", "Declined"].includes(decision)) {
    filters.push("d.approval_status = ?");
    params.push(decision);
  }

  if (readStatus === "unread") {
    filters.push("COALESCE(ns.is_read, FALSE) = FALSE");
  } else if (readStatus === "read") {
    filters.push("COALESCE(ns.is_read, FALSE) = TRUE");
  }

  const whereClause = filters.join(" AND ");

  const totalRow = await dbGet(
    `
      SELECT COUNT(1) AS total
      FROM documents d
      LEFT JOIN staff_notification_item_states ns ON d.id = ns.notification_id AND ns.staff_id = ?
      WHERE ${whereClause} AND ${archiveCondition}
    `,
    [staffId, ...params]
  );
  const total = Number(totalRow?.total || 0);

  const unreadRow = await dbGet(
    `
      SELECT COUNT(1) AS unread
      FROM documents d
      LEFT JOIN staff_notification_item_states ns ON d.id = ns.notification_id AND ns.staff_id = ?
      WHERE ${whereClause} AND COALESCE(ns.is_read, FALSE) = FALSE AND ${archiveCondition}
    `,
    [staffId, ...params]
  );
  const unreadCount = Number(unreadRow?.unread || 0);

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
        d.office_id,
        d.student_no,
        d.student_name,
        d.doc_type,
        d.original_filename,
        d.approval_status,
        d.reviewed_by,
        d.reviewed_at,
        d.review_note,
        d.mime_type,
        d.created_at,
        d.uploaded_by,
        d.is_previewed,
        COALESCE(ns.is_read, FALSE) AS is_read,
        COALESCE(ns.is_archived, FALSE) AS is_archived
      FROM documents d
      LEFT JOIN staff_notification_item_states ns ON d.id = ns.notification_id AND ns.staff_id = ?
      WHERE ${whereClause} AND ${archiveCondition}
      ORDER BY ${sortCol} ${order}, d.id DESC
      LIMIT ? OFFSET ?
    `,
    [staffId, ...params, lim, off]
  );

  return { items, total, unreadCount, inboxCount, archiveCount };
}
