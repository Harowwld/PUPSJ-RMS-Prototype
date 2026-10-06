import { NextResponse } from "next/server";
import { landingContentRepo, DEFAULT_WORKFLOW_CONTENT, validateLandingContentUpdate } from "@/lib/landingContentRepo";
import { requireSystemAdmin, createAuthErrorResponse } from "@/lib/authHelpers";
import { writeGlobalAuditLog } from "@/lib/auditLogRequest";

export const runtime = "nodejs";

export async function GET() {
  try {
    const content = await landingContentRepo.getWorkflowContent();
    return NextResponse.json({ ok: true, data: content });
  } catch (err) {
    console.error("[api/landing/workflow] GET error:", err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}

export async function PUT(req) {
  const access = await requireSystemAdmin(req);
  if (access.error || !access.user) return createAuthErrorResponse(access.error || "System administrator access required", 403);

  try {
    const body = await req.json();
    validateLandingContentUpdate(body, DEFAULT_WORKFLOW_CONTENT);

    let updated;
    if (body?.reset === true) {
      updated = await landingContentRepo.resetWorkflowContent();
      await writeGlobalAuditLog(req, "Reset Landing Page Workflow CMS", {
        entity_type: "LandingCMS",
        entity_id: "workflow",
        details: "Reverted Landing Page How-To-Request Workflow to default institutional branding.",
      });
    } else {
      updated = await landingContentRepo.updateWorkflowContent(body);
      await writeGlobalAuditLog(req, "Update Landing Page Workflow CMS", {
        entity_type: "LandingCMS",
        entity_id: "workflow",
        details: `Updated Landing Page How-To-Request Workflow: headlines, buttons, and ${updated.steps?.length || 0} process steps.`,
      });
    }

    return NextResponse.json({ ok: true, data: updated });
  } catch (err) {
    console.error("[api/landing/workflow] PUT error:", err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 400 });
  }
}
