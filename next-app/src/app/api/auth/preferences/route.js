import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSessionCookieName, verifySessionToken } from "@/lib/jwt";
import { getStaffById, updateStaffPreferences } from "@/lib/staffRepo";

export const runtime = "nodejs";

async function getAuthUser(req) {
  const cookieName = getSessionCookieName();
  const cookieStore = await cookies();
  const token = cookieStore.get(cookieName)?.value || "";
  if (!token) return null;
  try {
    const payload = await verifySessionToken(token);
    return payload.sub || null;
  } catch {
    return null;
  }
}

export async function GET(req) {
  try {
    const userId = await getAuthUser(req);
    if (!userId) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const staff = await getStaffById(userId);
    let preferences = {};
    try {
      preferences = JSON.parse(staff?.preferences || "{}");
    } catch (e) {
      preferences = {};
    }

    return NextResponse.json({ ok: true, data: preferences });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const userId = await getAuthUser(req);
    if (!userId) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => null) || {};
    const { preferences } = body;

    if (!preferences || typeof preferences !== "object") {
      return NextResponse.json({ ok: false, error: "Preferences object is required" }, { status: 400 });
    }

    const updatedPrefs = await updateStaffPreferences(userId, preferences);
    return NextResponse.json({ ok: true, data: updatedPrefs });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
