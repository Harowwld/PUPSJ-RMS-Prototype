import { NextResponse } from "next/server";
import {
  getPrincipalOfficeId,
  requireAdmin,
  requireStaff,
  createAuthErrorResponse,
} from "../../../../lib/authHelpers";
import { isSystemAdminRole } from "../../../../lib/roleUtils";
import { getStorageTemplates, setStorageTemplates, restoreDefaultStorageTemplates } from "../../../../lib/storageLayoutRepo";
import { writeAuditLog } from "../../../../lib/auditLogRequest";
import { canAccessResource } from "@/lib/resourceAuthorization";

export const runtime = "nodejs";

function resolveOfficeId(user, req) {
  const requested = String(new URL(req.url).searchParams.get("officeId") || "").trim().toLowerCase();
  if (isSystemAdminRole(user.role)) return requested || "registrar";
  return getPrincipalOfficeId(user);
}

export async function GET(req) {
  const { user, error } = await requireStaff(req);
  if (error || !user) {
    return createAuthErrorResponse(error || "Authentication required", 401);
  }
  const officeId = resolveOfficeId(user, req);
  if (!officeId) return createAuthErrorResponse("Office scope is required", 403);
  if (!canAccessResource(user, "storageLayout", { office_id: officeId })) return createAuthErrorResponse("Forbidden", 403);

  try {
    const templates = await getStorageTemplates({ officeId });
    return NextResponse.json({ ok: true, data: templates });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: "Failed to load storage templates" },
      { status: 500 }
    );
  }
}

export async function PUT(req) {
  const { user, error } = await requireAdmin(req);
  if (error || !user) {
    return createAuthErrorResponse(error || "Admin access required", 403);
  }
  const officeId = resolveOfficeId(user, req);
  if (!officeId) return createAuthErrorResponse("Office scope is required", 403);
  if (!canAccessResource(user, "storageLayout", { office_id: officeId })) return createAuthErrorResponse("Forbidden", 403);

  try {
    const body = await req.json().catch(() => null);
    if (!body || !Array.isArray(body)) {
      return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
    }

    const saved = await setStorageTemplates(body, { officeId });

    await writeAuditLog(req, `Update Storage Templates`, {
      details: `updated physical archive templates (${saved.length} templates)`,
      entity_type: "StorageTemplates",
      severity: "INFO"
    });

    return NextResponse.json({ ok: true, data: saved });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: "Failed to update storage templates" },
      { status: 400 }
    );
  }
}

export async function DELETE(req) {
  const { user, error } = await requireAdmin(req);
  if (error || !user) {
    return createAuthErrorResponse(error || "Admin access required", 403);
  }
  const officeId = resolveOfficeId(user, req);
  if (!officeId) return createAuthErrorResponse("Office scope is required", 403);
  if (!canAccessResource(user, "storageLayout", { office_id: officeId })) return createAuthErrorResponse("Forbidden", 403);

  try {
    const restored = await restoreDefaultStorageTemplates({ officeId });

    await writeAuditLog(req, `Restore Default Storage Templates`, {
      details: `restored physical archive templates to factory defaults (${restored.length} templates)`,
      entity_type: "StorageTemplates",
      severity: "WARNING"
    });

    return NextResponse.json({ ok: true, data: restored });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: "Failed to restore storage templates" },
      { status: 400 }
    );
  }
}
