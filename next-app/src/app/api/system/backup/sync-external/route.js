import { NextResponse } from "next/server";
import {
  getBackupById,
  syncBackupExternally,
} from "../../../../../lib/backupsRepo";
import { writeAuditLog } from "../../../../../lib/auditLogRequest";
import { requireAdmin, createAuthErrorResponse } from "../../../../../lib/authHelpers";
import { isSystemAdminRole } from "../../../../../lib/roleUtils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req) {
  try {
    const { user, error } = await requireAdmin(req);
    if (error || !user) {
      return createAuthErrorResponse(error || "Admin access required", 403);
    }

    const { id } = await req.json();
    if (!id) return NextResponse.json({ ok: false, error: "Missing ID" }, { status: 400 });

    const backup = await getBackupById(id);
    if (!backup) return NextResponse.json({ ok: false, error: "Backup not found" }, { status: 404 });

    if (!isSystemAdminRole(user.role)) {
      const userOffice = String(user.office_id || user.section || "registrar").toLowerCase().trim();
      if (backup.scope === "system" || (backup.office_id && backup.office_id.toLowerCase() !== userOffice)) {
        return NextResponse.json({ ok: false, error: "Forbidden: You do not have permission to sync this backup" }, { status: 403 });
      }
    }

    // Perform sync
    const result = await syncBackupExternally(id);

    await writeAuditLog(req, `Sync Backup External`, { 
      details: `synchronized encrypted backup '${backup.filename}' (ID: ${id}) to external hardware storage node`,
      entity_type: "Backup",
      entity_id: id
    });

    return NextResponse.json({
      ok: true,
      message: "Synced to external hardware successfully",
      path: result.path
    });
  } catch (error) {
    console.error("[SYNC EXTERNAL] Error:", error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
