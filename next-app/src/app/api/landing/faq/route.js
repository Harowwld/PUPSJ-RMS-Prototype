import { NextResponse } from "next/server";
import { landingContentRepo, DEFAULT_FAQ_CONTENT, validateLandingContentUpdate } from "@/lib/landingContentRepo";
import { requireSystemAdmin, createAuthErrorResponse } from "@/lib/authHelpers";
import { writeGlobalAuditLog } from "@/lib/auditLogRequest";

export const runtime = "nodejs";

export async function GET() {
  try {
    const content = await landingContentRepo.getFaqContent();
    return NextResponse.json({ ok: true, data: content });
  } catch (err) {
    console.error("[api/landing/faq] GET error:", err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}

export async function PUT(req) {
  const access = await requireSystemAdmin(req);
  if (access.error || !access.user) return createAuthErrorResponse(access.error || "System administrator access required", 403);

  try {
    const body = await req.json();
    validateLandingContentUpdate(body, DEFAULT_FAQ_CONTENT);

    let updated;
    if (body?.reset === true) {
      updated = await landingContentRepo.resetFaqContent();
      await writeGlobalAuditLog(req, "Reset Landing Page FAQ CMS", {
        entity_type: "LandingCMS",
        entity_id: "faq",
        details: "Reverted Landing Page Frequently Asked Questions to default institutional guidelines.",
      });
    } else {
      updated = await landingContentRepo.updateFaqContent(body);
      await writeGlobalAuditLog(req, "Update Landing Page FAQ CMS", {
        entity_type: "LandingCMS",
        entity_id: "faq",
        details: `Updated Landing Page FAQs: heading, description, and ${updated.faqs?.length || 0} questions.`,
      });
    }

    return NextResponse.json({ ok: true, data: updated });
  } catch (err) {
    console.error("[api/landing/faq] PUT error:", err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 400 });
  }
}
