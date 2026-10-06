import { NextResponse } from "next/server";
import { landingContentRepo, DEFAULT_BENTO_CONTENT, validateLandingContentUpdate } from "@/lib/landingContentRepo";
import { requireSystemAdmin, createAuthErrorResponse } from "@/lib/authHelpers";
import { writeGlobalAuditLog } from "@/lib/auditLogRequest";

export const runtime = "nodejs";

export async function GET() {
  try {
    const content = await landingContentRepo.getBentoContent();
    return NextResponse.json({ ok: true, data: content });
  } catch (err) {
    console.error("[api/landing/bento] GET error:", err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}

export async function PUT(req) {
  const access = await requireSystemAdmin(req);
  if (access.error || !access.user) return createAuthErrorResponse(access.error || "System administrator access required", 403);

  try {
    const body = await req.json();
    validateLandingContentUpdate(body, DEFAULT_BENTO_CONTENT);

    let updated;
    if (body?.reset === true) {
      updated = await landingContentRepo.resetBentoContent();
      await writeGlobalAuditLog(req, "Reset Landing Page Bento CMS", {
        entity_type: "LandingCMS",
        entity_id: "bento",
        details: "Reverted Landing Page Bento Grid content to default institutional branding.",
      });
    } else {
      updated = await landingContentRepo.updateBentoContent(body);
      await writeGlobalAuditLog(req, "Update Landing Page Bento CMS", {
        entity_type: "LandingCMS",
        entity_id: "bento",
        details: "Updated Landing Page Bento Grid: headlines, cards, SLA chips, and legal safeguard commitments.",
      });
    }

    return NextResponse.json({ ok: true, data: updated });
  } catch (err) {
    console.error("[api/landing/bento] PUT error:", err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 400 });
  }
}
