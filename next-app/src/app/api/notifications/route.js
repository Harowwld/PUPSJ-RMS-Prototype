import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSessionCookieName, verifySessionToken } from "../../../lib/jwt";
import { getStaffById } from "../../../lib/staffRepo";
import {
  getStaffReviewNotificationsState,
  listDocumentReviewNotifications,
  markStaffReviewNotificationsSeen,
} from "../../../lib/notificationsRepo";

export const runtime = "nodejs";

async function getSessionStaff() {
  const cookieName = getSessionCookieName();
  const store = await cookies();
  const token = store.get(cookieName)?.value || "";
  if (!token) return null;
  const payload = await verifySessionToken(token);
  const userId = String(payload?.sub || "").trim();
  if (!userId) return null;
  return await getStaffById(userId);
}

export async function GET(req) {
  let staff = null;
  try {
    staff = await getSessionStaff();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid session" }, { status: 401 });
  }
  if (!staff) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const limit = searchParams.get("limit") || "20";
  const offset = searchParams.get("offset") || "0";

  const state = await getStaffReviewNotificationsState(staff.id);
  const res = await listDocumentReviewNotifications({
    limit,
    offset,
    lastSeenReviewedAt: state.lastSeenReviewedAt,
  });

  return NextResponse.json({
    ok: true,
    data: {
      items: res.items,
      total: res.total,
      unreadCount: res.unreadCount,
      lastSeenReviewedAt: state.lastSeenReviewedAt,
    },
  });
}

export async function POST(req) {
  let staff = null;
  try {
    staff = await getSessionStaff();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid session" }, { status: 401 });
  }
  if (!staff) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const contentType = String(req.headers.get("content-type") || "").toLowerCase();
  let action = "markSeen";
  if (contentType.includes("application/json")) {
    const body = await req.json().catch(() => null);
    if (body && typeof body === "object" && body.action) {
      action = String(body.action || "markSeen");
    }
  }

  if (action !== "markSeen") {
    return NextResponse.json({ ok: false, error: "Invalid action" }, { status: 400 });
  }

  const state = await markStaffReviewNotificationsSeen(staff.id);
  const meta = await listDocumentReviewNotifications({
    limit: 1,
    offset: 0,
    lastSeenReviewedAt: state.lastSeenReviewedAt,
  });

  return NextResponse.json({
    ok: true,
    data: {
      lastSeenReviewedAt: state.lastSeenReviewedAt,
      unreadCount: meta.unreadCount,
    },
  });
}

