import { NextResponse } from "next/server";
import { getPrincipalOfficeId, requireAdmin, requireStaff, createAuthErrorResponse } from "../../../../lib/authHelpers";
import { isSystemAdminRole } from "../../../../lib/roleUtils";
import { createRecognitionTemplate, listRecognitionTemplates } from "../../../../lib/recognitionTemplatesRepo";
import { canAccessResource } from "../../../../lib/resourceAuthorization";

export const runtime = "nodejs";

function resolveOfficeId(user, req, requestedOfficeId) {
  const requested = String(requestedOfficeId || new URL(req.url).searchParams.get("officeId") || "").trim().toLowerCase();
  if (isSystemAdminRole(user.role)) return requested || "registrar";
  return getPrincipalOfficeId(user);
}

export async function GET(req) {
  const { user, error } = await requireStaff(req);
  if (error || !user) return createAuthErrorResponse(error || "Authentication required", 401);
  const params = new URL(req.url).searchParams;
  const officeId = resolveOfficeId(user, req);
  if (!officeId) return createAuthErrorResponse("Office scope is required", 403);
  const rows = await listRecognitionTemplates({
    includeArchived: params.get("includeArchived") === "true",
    documentTypeId: params.get("documentTypeId") || undefined,
    officeId,
  });
  const documentType = params.get("documentType");
  const authorizedRows = rows.filter((row) => canAccessResource(user, "recognitionTemplate", { ...row, office_id: row.office_id || officeId }));
  return NextResponse.json({
    ok: true,
    data: documentType
      ? authorizedRows.filter((row) => String(row.document_type).toLowerCase() === documentType.toLowerCase())
      : authorizedRows,
  });
}

export async function POST(req) {
  const { user, error } = await requireAdmin(req);
  if (error || !user) return createAuthErrorResponse(error || "Admin access required", 403);
  const body = await req.json().catch(() => null);
  if (!body || !body.documentTypeId) return NextResponse.json({ ok: false, error: "documentTypeId is required" }, { status: 400 });
  const officeId = resolveOfficeId(user, req, body.officeId || body.office_id);
  if (!officeId) return createAuthErrorResponse("Office scope is required", 403);
  try {
    const row = await createRecognitionTemplate({
      documentTypeId: body.documentTypeId,
      name: body.name,
      version: body.version,
      pageIndex: body.pageIndex,
      rotation: body.rotation,
      regions: body.regions,
      officeId,
      actorId: user.id,
    });
    if (!row || !canAccessResource(user, "recognitionTemplate", row)) {
      return NextResponse.json({ ok: false, error: "Template not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, data: row }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ ok: false, error: "Request could not be completed" }, { status: 400 });
  }
}
