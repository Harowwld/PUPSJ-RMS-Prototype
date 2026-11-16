import { NextResponse } from "next/server";
import { requireStudent, createAuthErrorResponse } from "@/lib/authHelpers";
import { query, queryOne } from "@/lib/postgres";
import { workflowEvents, workflowNotificationReference } from "@/lib/workflowNotificationEvents";

async function listInbox(req) {
  const access = await requireStudent(req);
  const accountId = access.user?.accountId;
  if (!accountId) return createAuthErrorResponse(access.error || "Authentication required");
  const url = new URL(req.url);
  const before = url.searchParams.get("before");
  const cursor = before && /^\d{1,18}$/.test(before) ? before : null;
  if (url.searchParams.get("count") === "1") {
    const count = await queryOne(
      "SELECT count(*)::int AS unread FROM portal_workflow_notifications WHERE account_id = $1 AND in_app AND read_at IS NULL",
      [accountId],
    );
    return NextResponse.json({ ok: true, data: count });
  }
  const parsedLimit = Number(url.searchParams.get("limit"));
  const pageSize = Number.isInteger(parsedLimit) && parsedLimit >= 1 && parsedLimit <= 100 ? parsedLimit : 100;
  const [rows, counts] = await Promise.all([
    query(
      `SELECT id, event_key, target_path, to_jsonb(notification)->>'detail' AS detail, read_at, created_at
         FROM portal_workflow_notifications notification WHERE account_id = $1 AND in_app
           AND ($2::bigint IS NULL OR id < $2) ORDER BY id DESC LIMIT $3`,
      [accountId, cursor, pageSize + 1],
    ),
    queryOne(
      `SELECT count(*) FILTER (WHERE read_at IS NULL)::int AS unread,
              count(*) FILTER (WHERE read_at IS NOT NULL)::int AS read
         FROM portal_workflow_notifications
        WHERE account_id = $1 AND in_app`,
      [accountId],
    ),
  ]);
  const items = rows.slice(0, pageSize).map((row) => ({
    ...row,
    title: workflowEvents[row.event_key]?.label || "Workflow update",
    reference: workflowNotificationReference(row.target_path),
  }));
  return NextResponse.json({
    ok: true,
    data: {
      items,
      unread: counts?.unread ?? 0,
      read: counts?.read ?? 0,
      next: rows.length > pageSize ? items.at(-1).id : null,
    },
  });
}

async function markInboxRead(req) {
  const access = await requireStudent(req);
  const accountId = access.user?.accountId;
  if (!accountId) return createAuthErrorResponse(access.error || "Authentication required");
  const body = await req.json().catch(() => null);
  if (body?.all !== true && !/^\d{1,18}$/.test(String(body?.id ?? ""))) {
    return NextResponse.json({ ok: false, error: "Choose a notification to update." }, { status: 400 });
  }
  const markUnread = body?.unread === true;
  await query(
    markUnread
      ? `UPDATE portal_workflow_notifications SET read_at = NULL
          WHERE account_id = $1 AND in_app AND read_at IS NOT NULL AND ($2::bigint IS NULL OR id = $2)`
      : `UPDATE portal_workflow_notifications SET read_at = now()
          WHERE account_id = $1 AND in_app AND read_at IS NULL AND ($2::bigint IS NULL OR id = $2)`,
    [accountId, body.all === true ? null : String(body.id)],
  );
  const counts = await queryOne(
    `SELECT count(*) FILTER (WHERE read_at IS NULL)::int AS unread,
            count(*) FILTER (WHERE read_at IS NOT NULL)::int AS read
       FROM portal_workflow_notifications
      WHERE account_id = $1 AND in_app`,
    [accountId],
  );
  return NextResponse.json({ ok: true, data: { unread: counts?.unread ?? 0, read: counts?.read ?? 0 } });
}

async function inboxResponse(handler, req) {
  try {
    return await handler(req);
  } catch (error) {
    console.error("Student notification request failed", { code: error.code });
    return NextResponse.json({
      ok: false,
      error: error.code === "42P01" ? "Notifications are unavailable until the database is updated." : "Notifications are temporarily unavailable.",
    }, { status: 503 });
  }
}

export async function GET(req) {
  return inboxResponse(listInbox, req);
}

export async function PATCH(req) {
  return inboxResponse(markInboxRead, req);
}
