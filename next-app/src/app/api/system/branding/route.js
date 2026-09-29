import { NextResponse } from "next/server";
import { systemConfigRepo } from "@/lib/systemConfigRepo";
import { writeAuditLog } from "@/lib/auditLogRequest";
import { requireSystemAdmin, createAuthErrorResponse } from "@/lib/authHelpers";

export const BRANDING_SETTING_KEY = "institution_branding_config";

export const DEFAULT_BRANDING = {
  institutionName: "Polytechnic University of the Philippines",
  campusName: "San Juan City Campus",
  tagline: "OFFICIAL ACADEMIC ARCHIVES & RECORDS",
  brandColor: "#7A1E28",
  logoUrl: "/assets/pup-logo.webp",
  fallbackLogoUrl: "/assets/branding/black-icon.png",
  logoBase64: null,
};

function sanitizeBranding(raw) {
  if (!raw || typeof raw !== "object") return DEFAULT_BRANDING;

  const institutionName =
    typeof raw.institutionName === "string" && raw.institutionName.trim() !== ""
      ? raw.institutionName.trim().slice(0, 120)
      : typeof raw.schoolName === "string" && raw.schoolName.trim() !== ""
      ? raw.schoolName.trim().slice(0, 120)
      : DEFAULT_BRANDING.institutionName;

  const campusName =
    typeof raw.campusName === "string" && raw.campusName.trim() !== ""
      ? raw.campusName.trim().slice(0, 100)
      : DEFAULT_BRANDING.campusName;

  const tagline =
    typeof raw.tagline === "string" && raw.tagline.trim() !== ""
      ? raw.tagline.trim().slice(0, 100)
      : DEFAULT_BRANDING.tagline;

  const hexRegex = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/;
  const brandColor =
    typeof raw.brandColor === "string" && hexRegex.test(raw.brandColor.trim())
      ? raw.brandColor.trim().toUpperCase()
      : typeof raw.primaryColor === "string" && hexRegex.test(raw.primaryColor.trim())
      ? raw.primaryColor.trim().toUpperCase()
      : DEFAULT_BRANDING.brandColor;

  let logoBase64 = null;
  if (
    typeof raw.logoBase64 === "string" &&
    raw.logoBase64.startsWith("data:image/") &&
    raw.logoBase64.length <= 4 * 1024 * 1024 // 4MB safety limit
  ) {
    logoBase64 = raw.logoBase64;
  }

  const logoUrl = logoBase64 ? null : DEFAULT_BRANDING.logoUrl;
  const fallbackLogoUrl = DEFAULT_BRANDING.fallbackLogoUrl;

  return {
    institutionName,
    campusName,
    tagline,
    brandColor,
    logoUrl,
    fallbackLogoUrl,
    logoBase64,
  };
}

export async function GET() {
  try {
    const rawSetting = await systemConfigRepo.getSetting(BRANDING_SETTING_KEY);
    let branding = DEFAULT_BRANDING;

    if (rawSetting) {
      try {
        const parsed = JSON.parse(rawSetting);
        branding = sanitizeBranding(parsed);
      } catch (e) {
        console.warn("[branding] Failed to parse branding setting, using defaults:", e);
      }
    }

    return NextResponse.json({ ok: true, data: branding });
  } catch (error) {
    console.error("[branding] GET error:", error);
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req) {
  try {
    const access = await requireSystemAdmin(req);
    if (access.error || !access.user) {
      return createAuthErrorResponse(
        access.error || "System administrator access required",
        access.error?.startsWith("Access denied") ? 403 : 401
      );
    }

    const body = await req.json();

    if (body.reset) {
      await systemConfigRepo.setSetting(BRANDING_SETTING_KEY, JSON.stringify(DEFAULT_BRANDING));
      await writeAuditLog(req, "Reset Institutional Branding", {
        details: "Reverted institutional branding configuration to defaults.",
        entity_type: "branding",
        entity_id: BRANDING_SETTING_KEY,
      });
      return NextResponse.json({ ok: true, data: DEFAULT_BRANDING });
    }

    const sanitized = sanitizeBranding(body);
    await systemConfigRepo.setSetting(BRANDING_SETTING_KEY, JSON.stringify(sanitized));

    await writeAuditLog(req, "Updated Institutional Branding", {
      details: `Updated institutional branding for '${sanitized.institutionName}' (${sanitized.campusName}).`,
      entity_type: "branding",
      entity_id: BRANDING_SETTING_KEY,
    });

    return NextResponse.json({ ok: true, data: sanitized });
  } catch (error) {
    console.error("[branding] PUT error:", error);
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req) {
  return PUT(req);
}
