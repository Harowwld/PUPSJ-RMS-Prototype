import { NextResponse } from "next/server";
import {
  getBackupById,
  syncBackupExternally,
} from "../../../../../lib/backupsRepo";
import { writeAuditLog } from "../../../../../lib/auditLogRequest";
import { requireAdmin, createAuthErrorResponse } from "../../../../../lib/authHelpers";
import { requireTOTP, extractTOTPToken } from "../../../../../lib/totpMiddleware";
import { canAccessResource } from "../../../../../lib/resourceAuthorization";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req) {
  try {
    const { user, error } = await requireAdmin(req);
    if (error || !user) {
      return createAuthErrorResponse(error || "Admin access required", 403);
    }

    const totpResult = await requireTOTP(user.id, extractTOTPToken(req.headers), { requireEnabled: true });
    if (!totpResult.valid) {
      return NextResponse.json(
        { 
          ok: false, 
          error: "TOTP verification required: " + totpResult.error, 
          requiresTOTP: !totpResult.notConfigured, 
          totpNotConfigured: !!totpResult.notConfigured,
          missingToken: !!totpResult.missing 
        }, 
        { status: 403 }
      );
    }

    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
    }
    const id = body?.id;
    if (!id) return NextResponse.json({ ok: false, error: "Missing ID" }, { status: 400 });

    const backup = await getBackupById(id);
    if (!backup || !canAccessResource(user, "backup", backup)) return NextResponse.json({ ok: false, error: "Backup not found" }, { status: 404 });

    // Verify that an external drive is actually connected and writable
    const { detectExternalDrive } = await import("@/lib/externalDriveDetector");
    const driveInfo = detectExternalDrive();
    if (!driveInfo.connected || !driveInfo.path) {
      return NextResponse.json({
        ok: false,
        error: "Cannot sync: No external hard drive detected. Please connect an external storage drive to sync.",
        driveOffline: true,
      }, { status: 400 });
    }
    if (!driveInfo.isWritable) {
      return NextResponse.json({
        ok: false,
        error: "Cannot sync: The detected external drive is read-only or not writable.",
        notWritable: true,
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
    const message = error instanceof Error && error.message 
      ? error.message 
      : "Failed to sync backup to external hardware";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
