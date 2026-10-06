import { NextResponse } from "next/server";
import { landingContentRepo, DEFAULT_CATALOG_CONTENT, validateLandingContentUpdate } from "@/lib/landingContentRepo";
import { requireSystemAdmin, createAuthErrorResponse } from "@/lib/authHelpers";
import { writeGlobalAuditLog } from "@/lib/auditLogRequest";

export const runtime = "nodejs";

export async function GET() {
  try {
    const content = await landingContentRepo.getCatalogContent();
    return NextResponse.json({ ok: true, data: content });
  } catch (err) {
    console.error("[api/landing/catalog] GET error:", err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}

export async function PUT(req) {
  const access = await requireSystemAdmin(req);
  if (access.error || !access.user) return createAuthErrorResponse(access.error || "System administrator access required", 403);

  try {
    const body = await req.json();
    validateLandingContentUpdate(body, DEFAULT_CATALOG_CONTENT);

    let updated;
    if (body?.reset === true) {
      updated = await landingContentRepo.resetCatalogContent();
      await writeGlobalAuditLog(req, "Reset Landing Page Catalog CMS", {
        entity_type: "LandingCMS",
        entity_id: "catalog",
        details: "Reverted Landing Page Academic Document Catalog to default institutional branding.",
      });
    } else {
      updated = await landingContentRepo.updateCatalogContent(body);
      await writeGlobalAuditLog(req, "Update Landing Page Catalog CMS", {
        entity_type: "LandingCMS",
        entity_id: "catalog",
        details: `Updated Landing Page Academic Catalog: headline, CTA buttons, and ${updated.items?.length || 0} document credentials.`,
      });
    }

    return NextResponse.json({ ok: true, data: updated });
  } catch (err) {
    console.error("[api/landing/catalog] PUT error:", err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 400 });
  }
}
