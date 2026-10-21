import { NextResponse } from "next/server";
import { writeAuditLog } from "@/lib/auditLogRequest";
import {
  getStaffReviewNotificationsState,
  listNotifications,
  markStaffReviewNotificationsSeen,
  setNotificationReadState,
  markAllNotificationsReadState,
} from "../../../lib/notificationsRepo";
import { requireStaff, createAuthErrorResponse, getPrincipalOfficeId } from "../../../lib/authHelpers";
import { canAccessResource } from "@/lib/resourceAuthorization";

export const runtime = "nodejs";

export async function GET(req) {
  const access = await requireStaff(req);
  if (access.error || !access.user) {
    return createAuthErrorResponse(access.error || "Staff authentication required", access.error?.startsWith("Access denied") ? 403 : 401);
  }
  const staff = access.user;
  const officeId = getPrincipalOfficeId(staff);
  if (!officeId) return createAuthErrorResponse("Office scope is required", 403);

  const { searchParams } = new URL(req.url);
  const limit = searchParams.get("limit") || "50";
  const offset = searchParams.get("offset") || "0";
  const sortBy = searchParams.get("sortBy") || "created_at";
  const sortOrder = searchParams.get("sortOrder") || "DESC";
  const tab = searchParams.get("tab") || "unread"; // "unread" or "read"
  const search = searchParams.get("search") || searchParams.get("q") || "";
  const type = searchParams.get("type") || "";
  const decision = searchParams.get("decision") || "";
  const severity = searchParams.get("severity") || "";

  const state = await getStaffReviewNotificationsState(staff.id);
  const res = await listNotifications({
    limit,
    offset,
    staffId: staff.id,
    officeId,
    sortBy,
    sortOrder,
    tab,
    search,
    type,
    decision,
    severity,
  });

  return NextResponse.json({
    ok: true,
    data: {
      items: res.items.filter((item) => canAccessResource(staff, "notification", item)),
      total: res.total,
      unreadCount: res.unreadCount,
      readCount: res.readCount,
      lastSeenReviewedAt: state.lastSeenReviewedAt,
      inboxCount: res.unreadCount, // for legacy callers
      archiveCount: 0,
    },
  });
}

export async function POST(req) {
  const access = await requireStaff(req);
  if (access.error || !access.user) {
    return createAuthErrorResponse(access.error || "Staff authentication required", access.error?.startsWith("Access denied") ? 403 : 401);
  }
  const staff = access.user;
  const officeId = getPrincipalOfficeId(staff);
  if (!officeId) return createAuthErrorResponse("Office scope is required", 403);

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }
  const action = String(body.action || "");
  let ids = [];
  if (["markRead", "markUnread"].includes(action)) {
    if (!Array.isArray(body.ids) || body.ids.length === 0) {
      return NextResponse.json({ ok: false, error: "At least one notification ID is required." }, { status: 400 });
    }
    const normalizedIds = body.ids.map((id) => {
      if (typeof id !== "number" && typeof id !== "string") return null;
      const value = String(id).trim();
      if (!/^\d+$/.test(value)) return null;
      const numericId = Number(value);
      return Number.isSafeInteger(numericId) && numericId > 0 ? numericId : null;
    });
    if (normalizedIds.some((id) => id === null)) {
      return NextResponse.json({ ok: false, error: "Notification IDs must be positive integers." }, { status: 400 });
    }
    ids = [...new Set(normalizedIds)];
  }

  if (action === "markSeen" || action === "markAllRead") {
    await markAllNotificationsReadState(staff.id, officeId, true);
    await markStaffReviewNotificationsSeen(staff.id);
  } else if (action === "markAllUnread") {
    await markAllNotificationsReadState(staff.id, officeId, false);
  } else if (action === "markRead") {
    await setNotificationReadState(staff.id, ids, true);
  } else if (action === "markUnread") {
    await setNotificationReadState(staff.id, ids, false);
  } else {
    return NextResponse.json({ ok: false, error: "Invalid action" }, { status: 400 });
  }

  if (["markSeen", "markAllRead", "markAllUnread", "markRead", "markUnread"].includes(action)) {
    await writeAuditLog(req, `Notifications ${action}`, {
      details: ids.length ? `Notification IDs: ${ids.join(", ")}` : "Notification state updated.",
      entity_type: "notification",
      entity_id: ids.length === 1 ? String(ids[0]) : "",
    });
  }

  const meta = await listNotifications({
    limit: 1,
    offset: 0,
    staffId: staff.id,
    officeId,
  });

  return NextResponse.json({
    ok: true,
    data: {
      unreadCount: meta.unreadCount,
      readCount: meta.readCount,
    },
  });
}
