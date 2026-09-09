import { NextResponse } from "next/server";
import { landingContentRepo } from "@/lib/landingContentRepo";
import { verifySessionToken, getSessionCookieName } from "@/lib/jwt";
import { isSystemAdminRole } from "@/lib/roleUtils";
import { writeGlobalAuditLog } from "@/lib/auditLogRequest";

export const runtime = "nodejs";

async function isSuperAdmin(req) {
  try {
    const token = req.cookies.get(getSessionCookieName())?.value;
    if (!token) return false;
    const payload = await verifySessionToken(token);
    return isSystemAdminRole(payload?.role);
  } catch {
    return false;
  }
}

export async function GET() {
  try {
    const content = await landingContentRepo.getHeroContent();
    return NextResponse.json({ ok: true, data: content });
  } catch (err) {
    console.error("[api/landing/hero] GET error:", err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}

export async function PUT(req) {
  if (!(await isSuperAdmin(req))) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized. SuperAdmin privileges required." },
      { status: 403 }
    );
  }

  try {
    const body = await req.json();

    let updated;
    if (body?.reset === true) {
      updated = await landingContentRepo.resetHeroContent();
      await writeGlobalAuditLog(req, "Reset Landing Page Hero CMS", {
        entity_type: "LandingCMS",
        entity_id: "hero",
        details: "Reverted Landing Page Hero Section content to default institutional branding.",
      });
    } else {
      updated = await landingContentRepo.updateHeroContent(body);
      await writeGlobalAuditLog(req, "Update Landing Page Hero CMS", {
        entity_type: "LandingCMS",
        entity_id: "hero",
        details: `Updated Landing Page Hero Section: headlines, description, and ${updated.slides?.length || 0} carousel slides.`,
      });
    }

    return NextResponse.json({ ok: true, data: updated });
  } catch (err) {
    console.error("[api/landing/hero] PUT error:", err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 400 });
  }
}
