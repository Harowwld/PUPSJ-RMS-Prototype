import { NextResponse } from "next/server";
import { getStaffById, parseStaffPreferences, updateStaffPreferences } from "@/lib/staffRepo";
import { writeAuditLog } from "@/lib/auditLogRequest";
import { requireAuth, createAuthErrorResponse } from "@/lib/authHelpers";

export const runtime = "nodejs";

const PREFERENCE_VALIDATORS = {
  theme: (value) => ["light", "dark", "system"].includes(value),
  navigation_layout: (value) => ["sidebar", "topbar"].includes(value),
  skip_registration_confirmation: (value) => typeof value === "boolean",
  high_contrast: (value) => typeof value === "boolean",
  zoom_node: (value) => typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 6,
};

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
      high_contrast: false,
      zoom_node: 3,
    };

    const preferences = {
      ...defaultPreferences,
      ...parseStaffPreferences(staff?.preferences),
    };

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

    if (!preferences || typeof preferences !== "object" || Array.isArray(preferences)) {
      return NextResponse.json({ ok: false, error: "Preferences object is required" }, { status: 400 });
    }
    const entries = Object.entries(preferences);
    if (entries.length === 0) {
      return NextResponse.json({ ok: false, error: "At least one preference is required" }, { status: 400 });
    }
    const invalidKey = entries.find(([key, value]) => !PREFERENCE_VALIDATORS[key]?.(value));
    if (invalidKey) {
      return NextResponse.json({ ok: false, error: `Invalid value for preference '${invalidKey[0]}'.` }, { status: 400 });
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
