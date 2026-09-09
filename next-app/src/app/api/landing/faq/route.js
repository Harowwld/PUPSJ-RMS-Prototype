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
    const content = await landingContentRepo.getFaqContent();
    return NextResponse.json({ ok: true, data: content });
  } catch (err) {
    console.error("[api/landing/faq] GET error:", err);
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
        details: `Updated Landing Page FAQs: headline, support desk, and ${updated.faqs?.length || 0} questions.`,
      });
    }

    return NextResponse.json({ ok: true, data: updated });
  } catch (err) {
    console.error("[api/landing/faq] PUT error:", err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 400 });
  }
}
