import { NextResponse } from "next/server";
import { requireAdmin, createAuthErrorResponse } from "../../../../../lib/authHelpers";
import { archiveRecognitionTemplate, deleteRecognitionTemplate, updateRecognitionTemplate } from "../../../../../lib/recognitionTemplatesRepo";

export const runtime = "nodejs";

export async function PATCH(req, { params }) {
  const { user, error } = await requireAdmin(req);
  if (error || !user) return createAuthErrorResponse(error || "Admin access required", 403);
  const body = await req.json().catch(() => null);
  try {
    const row = await updateRecognitionTemplate((await params).id, { ...body, actorId: user.id });
    if (!row) return NextResponse.json({ ok: false, error: "Template not found" }, { status: 404 });
    return NextResponse.json({ ok: true, data: row });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 400 });
  }
}

export async function DELETE(req, { params }) {
  const { user, error } = await requireAdmin(req);
  if (error || !user) return createAuthErrorResponse(error || "Admin access required", 403);
  const templateId = (await params).id;
  const permanent = new URL(req.url).searchParams.get("permanent") === "true";
  const row = permanent
    ? await deleteRecognitionTemplate(templateId)
    : await archiveRecognitionTemplate(templateId, user.id);
  if (!row) return NextResponse.json({ ok: false, error: "Template not found" }, { status: 404 });
  return NextResponse.json({ ok: true, data: row });
}
