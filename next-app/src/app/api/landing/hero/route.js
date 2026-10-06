import { NextResponse } from "next/server";
import { landingContentRepo, DEFAULT_HERO_CONTENT, validateLandingContentUpdate } from "@/lib/landingContentRepo";
import { requireSystemAdmin, createAuthErrorResponse } from "@/lib/authHelpers";
import { writeGlobalAuditLog } from "@/lib/auditLogRequest";

export const runtime = "nodejs";

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
  const access = await requireSystemAdmin(req);
  if (access.error || !access.user) return createAuthErrorResponse(access.error || "System administrator access required", 403);

  try {
    const body = await req.json();
    validateLandingContentUpdate(body, DEFAULT_HERO_CONTENT);

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
