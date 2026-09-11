import { NextResponse } from "next/server";
import { getPrincipalOfficeId, requireAdmin, createAuthErrorResponse } from "../../../../../lib/authHelpers";
import { isSystemAdminRole } from "../../../../../lib/roleUtils";
import { archiveRecognitionTemplate, deleteRecognitionTemplate, getRecognitionTemplateById, updateRecognitionTemplate } from "../../../../../lib/recognitionTemplatesRepo";
import { canAccessResource } from "../../../../../lib/resourceAuthorization";

export const runtime = "nodejs";

function resolveOfficeId(user, req) {
  const requested = String(new URL(req.url).searchParams.get("officeId") || "").trim().toLowerCase();
  if (isSystemAdminRole(user.role)) return requested || "registrar";
  return getPrincipalOfficeId(user);
}

export async function PATCH(req, { params }) {
  const { user, error } = await requireAdmin(req);
  if (error || !user) return createAuthErrorResponse(error || "Admin access required", 403);
  const officeId = resolveOfficeId(user, req);
  if (!officeId) return createAuthErrorResponse("Office scope is required", 403);
  const existing = await getRecognitionTemplateById((await params).id, officeId);
  if (!existing || !canAccessResource(user, "recognitionTemplate", existing)) return NextResponse.json({ ok: false, error: "Template not found" }, { status: 404 });
  const body = await req.json().catch(() => null);
  try {
    const row = await updateRecognitionTemplate((await params).id, { ...body, officeId, actorId: user.id });
    if (!row) return NextResponse.json({ ok: false, error: "Template not found" }, { status: 404 });
    return NextResponse.json({ ok: true, data: row });
  } catch (err) {
    return NextResponse.json({ ok: false, error: "Request could not be completed" }, { status: 400 });
  }
}

export async function DELETE(req, { params }) {
  const { user, error } = await requireAdmin(req);
  if (error || !user) return createAuthErrorResponse(error || "Admin access required", 403);
  const officeId = resolveOfficeId(user, req);
  if (!officeId) return createAuthErrorResponse("Office scope is required", 403);
  const templateId = (await params).id;
  const existing = await getRecognitionTemplateById(templateId, officeId);
  if (!existing || !canAccessResource(user, "recognitionTemplate", existing)) return NextResponse.json({ ok: false, error: "Template not found" }, { status: 404 });
  const permanent = new URL(req.url).searchParams.get("permanent") === "true";
  const row = permanent
    ? await deleteRecognitionTemplate(templateId, officeId)
    : await archiveRecognitionTemplate(templateId, user.id, officeId);
  if (!row) return NextResponse.json({ ok: false, error: "Template not found" }, { status: 404 });
  return NextResponse.json({ ok: true, data: row });
}
