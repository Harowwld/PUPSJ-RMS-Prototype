import { NextResponse } from "next/server";
import { getStaffById, updateStaffPreferences } from "@/lib/staffRepo";
import { writeAuditLog } from "@/lib/auditLogRequest";
import { requireAuth, createAuthErrorResponse } from "@/lib/authHelpers";

export const runtime = "nodejs";

export async function GET(req) {
  try {
    const access = await requireAuth(req);
    if (access.error || !access.user) return createAuthErrorResponse(access.error || "Authentication required", access.error?.startsWith("Access denied") ? 403 : 401);
    if (access.user.principalType !== "staff") return createAuthErrorResponse("Access denied", 403);
    const userId = access.user.id;

    const staff = await getStaffById(userId);
    const defaultPreferences = {
      theme: "light",
      navigation_layout: "sidebar",
      skip_registration_confirmation: false,
      high_contrast: false
    };

    let preferences = {};
    try {
      preferences = {
        ...defaultPreferences,
        ...JSON.parse(staff?.preferences || "{}")
      };
    } catch (e) {
      preferences = defaultPreferences;
    }

    return NextResponse.json({ ok: true, data: preferences });
  } catch (error) {
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const access = await requireAuth(req);
    if (access.error || !access.user) return createAuthErrorResponse(access.error || "Authentication required", access.error?.startsWith("Access denied") ? 403 : 401);
    if (access.user.principalType !== "staff") return createAuthErrorResponse("Access denied", 403);
    const userId = access.user.id;

    const body = await req.json().catch(() => null) || {};
    const { preferences } = body;

    if (!preferences || typeof preferences !== "object") {
      return NextResponse.json({ ok: false, error: "Preferences object is required" }, { status: 400 });
    }

    const updatedPrefs = await updateStaffPreferences(userId, preferences);
    await writeAuditLog(req, "Updated Account Preferences", {
      details: "Updated personal dashboard preferences.",
      entity_type: "staff_preferences",
      entity_id: String(userId),
    });
    return NextResponse.json({ ok: true, data: updatedPrefs });
  } catch (error) {
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}
