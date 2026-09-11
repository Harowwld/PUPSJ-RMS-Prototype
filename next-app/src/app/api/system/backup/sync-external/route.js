import { NextResponse } from "next/server";
import {
  getBackupById,
  syncBackupExternally,
} from "../../../../../lib/backupsRepo";
import { writeAuditLog } from "../../../../../lib/auditLogRequest";
import { requireAdmin, createAuthErrorResponse } from "../../../../../lib/authHelpers";
import { requireTOTP, extractTOTPToken } from "../../../../../lib/totpMiddleware";
import { isSystemAdminRole } from "../../../../../lib/roleUtils";
import { canAccessResource } from "../../../../../lib/resourceAuthorization";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req) {
  try {
    const { user, error } = await requireAdmin(req);
    if (error || !user) {
      return createAuthErrorResponse(error || "Admin access required", 403);
    }

    if (!isSystemAdminRole(user.role)) {
      return createAuthErrorResponse("System Administrator authorization required", 403);
    }

    const totpResult = await requireTOTP(user.id, extractTOTPToken(req.headers), { requireEnabled: true });
    if (!totpResult.valid) {
      return NextResponse.json({ ok: false, error: "TOTP verification required", requiresTOTP: true, missingToken: !!totpResult.missing }, { status: 403 });
    }

    const { id } = await req.json();
    if (!id) return NextResponse.json({ ok: false, error: "Missing ID" }, { status: 400 });

    const backup = await getBackupById(id);
    if (!backup || !canAccessResource(user, "backup", backup)) return NextResponse.json({ ok: false, error: "Backup not found" }, { status: 404 });

    // Verify that an external drive is actually connected
    const { detectExternalDrive } = await import("@/lib/externalDriveDetector");
    const driveInfo = detectExternalDrive();
    if (!driveInfo.connected || !driveInfo.path) {
      return NextResponse.json({
        ok: false,
        error: "Cannot sync: No external hard drive detected. Please connect an external storage drive to sync.",
        driveOffline: true,
      }, { status: 400 });
    }

    // Perform sync
    await syncBackupExternally(id);

    await writeAuditLog(req, `Sync Backup External`, { 
      details: `synchronized encrypted backup '${backup.filename}' (ID: ${id}) to external hardware storage node`,
      entity_type: "Backup",
      entity_id: id
    });

    return NextResponse.json({
      ok: true,
      message: "Synced to external hardware successfully",
    });
  } catch (error) {
    console.error("[SYNC EXTERNAL] Error:", error);
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}
