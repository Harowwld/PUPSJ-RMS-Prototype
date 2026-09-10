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
    const content = await landingContentRepo.getFooterContent();
    return NextResponse.json({ ok: true, data: content });
  } catch (err) {
    console.error("[api/landing/footer] GET error:", err);
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
      updated = await landingContentRepo.resetFooterContent();
      await writeGlobalAuditLog(req, "Reset Landing Page Footer CMS", {
        entity_type: "LandingCMS",
        entity_id: "footer",
        details: "Reverted Landing Page Footer to default institutional branding and schedule.",
      });
    } else {
      updated = await landingContentRepo.updateFooterContent(body);
      await writeGlobalAuditLog(req, "Update Landing Page Footer CMS", {
        entity_type: "LandingCMS",
        entity_id: "footer",
        details: `Updated Landing Page Footer: brand "${updated.brandName}", schedule hours, contacts, and navigation links.`,
      });
    }

    return NextResponse.json({ ok: true, data: updated });
  } catch (err) {
    console.error("[api/landing/footer] PUT error:", err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 400 });
  }
}
