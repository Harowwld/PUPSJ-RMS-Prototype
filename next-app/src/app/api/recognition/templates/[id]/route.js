import { NextResponse } from "next/server";
import { requireAdmin, createAuthErrorResponse } from "../../../../../lib/authHelpers";
import { archiveRecognitionTemplate, updateRecognitionTemplate } from "../../../../../lib/recognitionTemplatesRepo";

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
  const row = await archiveRecognitionTemplate((await params).id, user.id);
  if (!row) return NextResponse.json({ ok: false, error: "Template not found" }, { status: 404 });
  return NextResponse.json({ ok: true, data: row });
}
