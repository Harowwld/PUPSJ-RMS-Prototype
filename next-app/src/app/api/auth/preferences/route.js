import { NextResponse } from "next/server";
import { getStaffById, parseStaffPreferences, updateStaffPreferences } from "@/lib/staffRepo";
import { requireAuth, createAuthErrorResponse } from "@/lib/authHelpers";
import { queryOne, query } from "@/lib/postgres";
import {
  DEFAULT_SOUND_CATEGORIES,
  DEFAULT_SOUND_VOLUME,
  isValidSoundCategoriesPreference,
} from "@/lib/soundPreferences";

export const runtime = "nodejs";

const DEFAULT_USER_PREFERENCES = {
  theme: "light",
  navigation_layout: "sidebar",
  skip_registration_confirmation: false,
  high_contrast: false,
  reduce_motion: false,
  zoom_node: 3,
  default_home_view: "default",
  display_name_format: "full_name",
  font_size: "default",
  pointer_cursor: true,
  sound_enabled: false,
  sound_volume: DEFAULT_SOUND_VOLUME,
  sound_categories: { ...DEFAULT_SOUND_CATEGORIES },
};
const DEFAULT_STUDENT_PREFERENCES = { selected_osas_org_id: "" };

const PREFERENCE_VALIDATORS = {
  theme: (value) => ["light", "dark", "system"].includes(value),
  navigation_layout: (value) => ["sidebar", "topbar"].includes(value),
  skip_registration_confirmation: (value) => typeof value === "boolean",
  high_contrast: (value) => typeof value === "boolean",
  reduce_motion: (value) => typeof value === "boolean",
  zoom_node: (value) => typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 6,
  default_home_view: (value) => typeof value === "string" && value.length <= 50,
  display_name_format: (value) => ["full_name", "first_only", "last_only", "last_first"].includes(value),
  font_size: (value) => ["smaller", "small", "default", "large", "larger"].includes(value),
  pointer_cursor: (value) => typeof value === "boolean",
  sound_enabled: (value) => typeof value === "boolean",
  sound_volume: (value) => typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 1,
  sound_categories: (value) => isValidSoundCategoriesPreference(value),
  selected_osas_org_id: (value) => typeof value === "string" && value.length <= 100,
};

async function getStudentAccountPreferences(principal) {
  const accountId = principal?.accountId || (Number.isFinite(Number(principal?.id)) ? Number(principal.id) : null);
  const studentNo = principal?.studentNo || principal?.student_no || null;

  const row = await queryOne(
    `SELECT id, preferences
       FROM student_accounts
      WHERE (id = $1 AND $1 IS NOT NULL)
         OR (student_no IS NOT NULL AND upper(student_no) = upper($2) AND $2 IS NOT NULL)
      LIMIT 1`,
    [accountId, studentNo]
  ).catch(() => null);

  return {
    accountId: row?.id || accountId,
    preferences: {
      ...DEFAULT_USER_PREFERENCES,
      ...DEFAULT_STUDENT_PREFERENCES,
      ...parseStaffPreferences(row?.preferences),
    },
  };
}

export async function GET(req) {
  try {
    const access = await requireAuth(req);
    if (access.error || !access.user) {
      return createAuthErrorResponse(
        access.error || "Authentication required",
        access.error?.startsWith("Access denied") ? 403 : 401
      );
    }

    if (access.user.principalType !== "staff") {
      const { preferences } = await getStudentAccountPreferences(access.user);
      return NextResponse.json({ ok: true, data: preferences });
    }

    const userId = access.user.id;
    const staff = await getStaffById(userId);
    const preferences = {
      ...DEFAULT_USER_PREFERENCES,
      ...parseStaffPreferences(staff?.preferences),
    };

    return NextResponse.json({ ok: true, data: preferences });
  } catch {
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const access = await requireAuth(req);
    if (access.error || !access.user) {
      return createAuthErrorResponse(
        access.error || "Authentication required",
        access.error?.startsWith("Access denied") ? 403 : 401
      );
    }

    const body = (await req.json().catch(() => null)) || {};
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

    if (access.user.principalType !== "staff") {
      const { accountId, preferences: currentPrefs } = await getStudentAccountPreferences(access.user);
      const mergedCategories = preferences.sound_categories
        ? {
            ...DEFAULT_SOUND_CATEGORIES,
            ...(currentPrefs.sound_categories || {}),
            ...preferences.sound_categories,
          }
        : currentPrefs.sound_categories || { ...DEFAULT_SOUND_CATEGORIES };

      const updatedPrefs = {
        ...DEFAULT_USER_PREFERENCES,
        ...currentPrefs,
        ...preferences,
        sound_categories: mergedCategories,
      };

      if (accountId) {
        await query(
          `UPDATE student_accounts
              SET preferences = $1::jsonb,
                  updated_at = NOW()
            WHERE id = $2`,
          [JSON.stringify(updatedPrefs), accountId]
        ).catch(() => {});
      }

      return NextResponse.json({ ok: true, data: updatedPrefs });
    }

    if (Object.hasOwn(preferences, "selected_osas_org_id")) {
      return NextResponse.json({ ok: false, error: "This preference is only available to student accounts." }, { status: 400 });
    }

    const userId = access.user.id;
    const updatedPrefs = await updateStaffPreferences(userId, preferences);
    return NextResponse.json({ ok: true, data: updatedPrefs });
  } catch {
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}
