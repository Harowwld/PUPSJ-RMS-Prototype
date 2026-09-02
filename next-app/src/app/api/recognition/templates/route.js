import { NextResponse } from "next/server";
import { requireAdmin, requireStaff, createAuthErrorResponse } from "../../../../lib/authHelpers";
import { createRecognitionTemplate, listRecognitionTemplates } from "../../../../lib/recognitionTemplatesRepo";

export const runtime = "nodejs";

export async function GET(req) {
  const { user, error } = await requireStaff(req);
  if (error || !user) return createAuthErrorResponse(error || "Authentication required", 401);
  const params = new URL(req.url).searchParams;
  const rows = await listRecognitionTemplates({
    includeArchived: params.get("includeArchived") === "true",
    documentTypeId: params.get("documentTypeId") || undefined,
  });
  const documentType = params.get("documentType");
  return NextResponse.json({
    ok: true,
    data: documentType
      ? rows.filter((row) => String(row.document_type).toLowerCase() === documentType.toLowerCase())
      : rows,
  });
}

export async function POST(req) {
  const { user, error } = await requireAdmin(req);
  if (error || !user) return createAuthErrorResponse(error || "Admin access required", 403);
  const body = await req.json().catch(() => null);
  if (!body || !body.documentTypeId) return NextResponse.json({ ok: false, error: "documentTypeId is required" }, { status: 400 });
  try {
    const row = await createRecognitionTemplate({ ...body, actorId: user.id });
    return NextResponse.json({ ok: true, data: row }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 400 });
  }
}
