import { NextResponse } from "next/server";
import { requireAdmin, requireStaff, createAuthErrorResponse } from "../../../../lib/authHelpers";
import { getStorageTemplates, setStorageTemplates, restoreDefaultStorageTemplates } from "../../../../lib/storageLayoutRepo";
import { writeAuditLog } from "../../../../lib/auditLogRequest";

export const runtime = "nodejs";

export async function GET(req) {
  const { user, error } = await requireStaff(req);
  if (error || !user) {
    return createAuthErrorResponse(error || "Authentication required", 401);
  }

  try {
    const templates = await getStorageTemplates();
    return NextResponse.json({ ok: true, data: templates });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err?.message || "Failed to load storage templates" },
      { status: 500 }
    );
  }
}

export async function PUT(req) {
  const { user, error } = await requireAdmin(req);
  if (error || !user) {
    return createAuthErrorResponse(error || "Admin access required", 403);
  }

  try {
    const body = await req.json().catch(() => null);
    if (!body || !Array.isArray(body)) {
      return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
    }

    const saved = await setStorageTemplates(body);

    await writeAuditLog(req, `Update Storage Templates`, {
      details: `updated physical archive templates (${saved.length} templates)`,
      entity_type: "StorageTemplates",
      severity: "INFO"
    });

    return NextResponse.json({ ok: true, data: saved });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err?.message || "Failed to update storage templates" },
      { status: 400 }
    );
  }
}

export async function DELETE(req) {
  const { user, error } = await requireAdmin(req);
  if (error || !user) {
    return createAuthErrorResponse(error || "Admin access required", 403);
  }

  try {
    const restored = await restoreDefaultStorageTemplates();

    await writeAuditLog(req, `Restore Default Storage Templates`, {
      details: `restored physical archive templates to factory defaults (${restored.length} templates)`,
      entity_type: "StorageTemplates",
      severity: "WARNING"
    });

    return NextResponse.json({ ok: true, data: restored });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err?.message || "Failed to restore storage templates" },
      { status: 400 }
    );
  }
}
