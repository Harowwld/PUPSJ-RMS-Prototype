import { NextResponse } from "next/server";
import { writeAuditLog } from "@/lib/auditLogRequest";
import {
  getStaffReviewNotificationsState,
  listDocumentReviewNotifications,
  markStaffReviewNotificationsSeen,
  setNotificationItemState,
  markAllStaffNotificationsReadState,
} from "../../../lib/notificationsRepo";
import { requireStaff, createAuthErrorResponse, getPrincipalOfficeId } from "../../../lib/authHelpers";
import { canAccessResource } from "@/lib/resourceAuthorization";

export const runtime = "nodejs";

export async function GET(req) {
  const access = await requireStaff(req);
  if (access.error || !access.user) return createAuthErrorResponse(access.error || "Staff authentication required", access.error?.startsWith("Access denied") ? 403 : 401);
  const staff = access.user;
  const officeId = getPrincipalOfficeId(staff);
  if (!officeId) return createAuthErrorResponse("Office scope is required", 403);

  const { searchParams } = new URL(req.url);
  const limit = searchParams.get("limit") || "20";
  const offset = searchParams.get("offset") || "0";
  const sortBy = searchParams.get("sortBy") || "reviewed_at";
  const sortOrder = searchParams.get("sortOrder") || "DESC";
  const tab = searchParams.get("tab") || "inbox";
  const search = searchParams.get("search") || searchParams.get("q") || "";
  const decision = searchParams.get("decision") || "";
  const readStatus = searchParams.get("readStatus") || "";

  const state = await getStaffReviewNotificationsState(staff.id);
  const res = await listDocumentReviewNotifications({
    limit,
    offset,
    lastSeenReviewedAt: state.lastSeenReviewedAt,
    staffId: staff.id,
    officeId,
    sortBy,
    sortOrder,
    tab,
    search,
    decision,
    readStatus,
  });

  return NextResponse.json({
    ok: true,
    data: {
      items: res.items.filter((item) => canAccessResource(staff, "notification", item)),
      total: res.total,
      unreadCount: res.unreadCount,
      lastSeenReviewedAt: state.lastSeenReviewedAt,
      inboxCount: res.inboxCount,
      archiveCount: res.archiveCount,
    },
  });
}

export async function POST(req) {
  const access = await requireStaff(req);
  if (access.error || !access.user) return createAuthErrorResponse(access.error || "Staff authentication required", access.error?.startsWith("Access denied") ? 403 : 401);
  const staff = access.user;
  const officeId = getPrincipalOfficeId(staff);
  if (!officeId) return createAuthErrorResponse("Office scope is required", 403);

  const contentType = String(req.headers.get("content-type") || "").toLowerCase();
  let action = "markSeen";
  let ids = [];
  if (contentType.includes("application/json")) {
    const body = await req.json().catch(() => null);
    if (body && typeof body === "object") {
      action = String(body.action || "markSeen");
      ids = Array.isArray(body.ids) ? body.ids : [];
    }
  }

  if (action === "markSeen") {
    await markAllStaffNotificationsReadState(staff.id, officeId, true);
    await markStaffReviewNotificationsSeen(staff.id);
  } else if (action === "markAllUnread") {
    await markAllStaffNotificationsReadState(staff.id, officeId, false);
  } else if (action === "markRead") {
    if (ids.length > 0) {
      await setNotificationItemState(staff.id, ids, "read", 1, officeId);
    }
  } else if (action === "markUnread") {
    if (ids.length > 0) {
      await setNotificationItemState(staff.id, ids, "read", 0, officeId);
    }
  } else if (action === "archive") {
    if (ids.length > 0) {
      await setNotificationItemState(staff.id, ids, "archive", 1, officeId);
    }
  } else if (action === "unarchive") {
    if (ids.length > 0) {
      await setNotificationItemState(staff.id, ids, "archive", 0, officeId);
    }
  } else {
    return NextResponse.json({ ok: false, error: "Invalid action" }, { status: 400 });
  }

  if (["markSeen", "markAllUnread", "markRead", "markUnread", "archive", "unarchive"].includes(action)) {
    await writeAuditLog(req, `Notifications ${action}`, {
      details: ids.length ? `Notification IDs: ${ids.join(", ")}` : "Notification state updated.",
      entity_type: "notification",
      entity_id: ids.length === 1 ? String(ids[0]) : "",
    });
  }

  const state = await getStaffReviewNotificationsState(staff.id);
  const meta = await listDocumentReviewNotifications({
    limit: 1,
    offset: 0,
    lastSeenReviewedAt: state.lastSeenReviewedAt,
    staffId: staff.id,
    officeId,
  });

  return NextResponse.json({
    ok: true,
    data: {
      lastSeenReviewedAt: state.lastSeenReviewedAt,
      unreadCount: meta.unreadCount,
    },
  });
}
