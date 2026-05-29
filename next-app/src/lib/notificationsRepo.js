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

export async function listDocumentReviewNotifications({
  limit = 20,
  offset = 0,
  lastSeenReviewedAt = null,
  uploadedBy = null,
} = {}) {
  const lim = Math.min(Math.max(parseInt(limit) || 20, 1), 100);
  const off = Math.max(parseInt(offset) || 0, 0);

  const filters = ["reviewed_at IS NOT NULL", "approval_status IN ('Approved', 'Declined')"];
  const params = [];

  if (uploadedBy) {
    filters.push("uploaded_by = ?");
    params.push(uploadedBy);
  }

  const whereClause = filters.join(" AND ");

  const totalRow = await dbGet(
    `
      SELECT COUNT(1) AS total
      FROM documents
      WHERE ${whereClause}
    `,
    params
  );
  const total = Number(totalRow?.total || 0);

  const unreadFilters = [...filters];
  const unreadParams = [...params];
  unreadFilters.push("(? IS NULL OR reviewed_at > ?)");
  unreadParams.push(lastSeenReviewedAt, lastSeenReviewedAt);

  const unreadRow = await dbGet(
    `
      SELECT COUNT(1) AS unread
      FROM documents
      WHERE ${unreadFilters.join(" AND ")}
    `,
    unreadParams
  );
  const unreadCount = Number(unreadRow?.unread || 0);

  const items = await dbAll(
    `
      SELECT
        id,
        student_no,
        student_name,
        doc_type,
        original_filename,
        approval_status,
        reviewed_by,
        reviewed_at,
        review_note,
        created_at,
        uploaded_by
      FROM documents
      WHERE ${whereClause}
      ORDER BY reviewed_at DESC, id DESC
      LIMIT ? OFFSET ?
    `,
    [...params, lim, off]
  );

  return { items, total, unreadCount };
}

