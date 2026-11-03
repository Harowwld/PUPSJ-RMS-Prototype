import { NextResponse } from "next/server";
import { systemConfigRepo } from "@/lib/systemConfigRepo";
import { writeAuditLog } from "@/lib/auditLogRequest";
import { requireSystemAdmin, createAuthErrorResponse } from "@/lib/authHelpers";
import { DEFAULT_BRANDING as BRANDING_DEFAULTS } from "@/lib/institutionalBranding";
import { getReportFont, isReportFont } from "@/lib/reportFontOptions";

export const BRANDING_SETTING_KEY = "institution_branding_config";

export const DEFAULT_BRANDING = BRANDING_DEFAULTS;

function deriveDocumentPrefix(institutionName = "", campusName = "") {
  const getInitials = (str) => {
    if (!str || typeof str !== "string") return ""
    const clean = str.replace(/[^a-zA-Z0-9\s]/g, " ")
    const words = clean.split(/\s+/).filter(Boolean)
    const stopWords = new Set(["of", "the", "and", "in", "at", "for", "ng", "mga", "city", "campus", "branch"])
    const significant = words.filter((w) => !stopWords.has(w.toLowerCase()))
    if (significant.length === 0) return words.map((w) => w[0]).join("").toUpperCase().slice(0, 4)
    return significant.map((w) => w[0]).join("").toUpperCase().slice(0, 5)
  }
  const instInitials = getInitials(institutionName) || "RMS"
  const campusInitials = getInitials(campusName)
  const combined = `${instInitials}${campusInitials}`.slice(0, 8)
  return combined || "RMS"
}

function sanitizeBranding(raw) {
  if (!raw || typeof raw !== "object") return DEFAULT_BRANDING;

  const jurisdictionHeader =
    typeof raw.jurisdictionHeader === "string"
      ? raw.jurisdictionHeader.trim().slice(0, 100)
      : typeof raw.superHeader === "string"
      ? raw.superHeader.trim().slice(0, 100)
      : DEFAULT_BRANDING.jurisdictionHeader;

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

  const documentCodePrefix = deriveDocumentPrefix(institutionName, campusName);

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

  let secondaryLogoBase64 = null;
  if (
    typeof raw.secondaryLogoBase64 === "string" &&
    raw.secondaryLogoBase64.startsWith("data:image/") &&
    raw.secondaryLogoBase64.length <= 4 * 1024 * 1024
  ) {
    secondaryLogoBase64 = raw.secondaryLogoBase64;
  }

  const secondaryLogoUrl = secondaryLogoBase64
    ? null
    : typeof raw.secondaryLogoUrl === "string" && raw.secondaryLogoUrl.trim() !== ""
    ? raw.secondaryLogoUrl.trim()
    : null;

  const signatoryRegistrarTitle =
    typeof raw.signatoryRegistrarTitle === "string"
      ? raw.signatoryRegistrarTitle.trim().slice(0, 80)
      : "";

  const signatoryHeadTitle =
    typeof raw.signatoryHeadTitle === "string"
      ? raw.signatoryHeadTitle.trim().slice(0, 80)
      : "";

  return {
    jurisdictionHeader,
    institutionName,
    campusName,
    tagline,
    documentCodePrefix,
    brandColor,
    reportFont: getReportFont(raw.reportFont).value,
    logoUrl,
    fallbackLogoUrl,
    logoBase64,
    secondaryLogoUrl,
    secondaryLogoBase64,
    signatoryRegistrarTitle,
    signatoryHeadTitle,
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

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ ok: false, error: "Invalid request body" }, { status: 400 });
    }
    const allowedFields = new Set([...Object.keys(DEFAULT_BRANDING), "reset"]);
    const unsupportedField = Object.keys(body).find((field) => !allowedFields.has(field));
    if (unsupportedField) {
      return NextResponse.json({ ok: false, error: `Unsupported field: ${unsupportedField}` }, { status: 400 });
    }
    if (Object.keys(body).length === 0) {
      return NextResponse.json({ ok: false, error: "At least one branding field is required" }, { status: 400 });
    }
    if (body.reset !== undefined && typeof body.reset !== "boolean") {
      return NextResponse.json({ ok: false, error: "reset must be a boolean" }, { status: 400 });
    }
    if (body.reportFont !== undefined && !isReportFont(body.reportFont)) {
      return NextResponse.json({ ok: false, error: "Choose a supported report font." }, { status: 400 });
    }
    if (body.institutionName !== undefined && (typeof body.institutionName !== "string" || !body.institutionName.trim())) {
      return NextResponse.json({ ok: false, error: "Institution name is required." }, { status: 400 });
    }
    if (body.brandColor !== undefined && (typeof body.brandColor !== "string" || !/^#[0-9a-fA-F]{6}$/.test(body.brandColor.trim()))) {
      return NextResponse.json({ ok: false, error: "Enter a six-digit brand color, such as #7A1E28." }, { status: 400 });
    }
    for (const field of ["logoBase64", "secondaryLogoBase64"]) {
      if (typeof body[field] === "string" && body[field].length > 4 * 1024 * 1024) {
        return NextResponse.json({ ok: false, error: "The uploaded seal is too large. Choose a smaller image." }, { status: 400 });
      }
    }

    if (body.reset) {
      if (Object.keys(body).length !== 1) {
        return NextResponse.json({ ok: false, error: "Reset cannot be combined with branding changes" }, { status: 400 });
      }
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
