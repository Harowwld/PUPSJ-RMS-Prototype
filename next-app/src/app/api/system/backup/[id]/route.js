import { NextResponse } from "next/server";
import fs from "node:fs";
import {
  getBackupById,
  getBackupsDir,
  getBackupFilePath,
  deleteBackupRecord,
} from "../../../../../lib/backupsRepo";
import { writeAuditLog } from "../../../../../lib/auditLogRequest";
import { requireAdmin, createAuthErrorResponse } from "../../../../../lib/authHelpers";
import { requireTOTP, extractTOTPToken } from "../../../../../lib/totpMiddleware";
import { canAccessResource } from "../../../../../lib/resourceAuthorization";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE(req, { params }) {
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

    const { id: idStr } = await params;
    const id = Number(idStr);
    console.log(`[DELETE BACKUP] Attempting to delete backup with ID: ${id} by user ${user.id}`);

    if (isNaN(id)) return NextResponse.json({ ok: false, error: "Invalid ID" }, { status: 400 });

    const backup = await getBackupById(id);
    if (!backup || !canAccessResource(user, "backup", backup)) {
      return NextResponse.json({ ok: false, error: "Backup record not found" }, { status: 404 });
    }

    const backupsDir = getBackupsDir();
    const filePath = getBackupFilePath(backup.filename, backupsDir);

    // Strict deletion: if any existing file cannot be removed, fail and keep DB record.
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // NOTE: External backups are intentionally left untouched (Immutable Archive approach).
    // The web application does not have the authority to delete synced files from the external drive.

    // Delete record from database
    const changes = await deleteBackupRecord(id);
    await writeAuditLog(req, `Delete Backup`, { 
      details: `permanently deleted local backup package '${backup.filename}' (ID: ${id}) from primary storage`,
      severity: "WARNING",
      entity_type: "Backup",
      entity_id: id
    });

    return NextResponse.json({
      ok: true,
      message: "Backup deleted successfully"
    });
  } catch (error) {
    console.error("[DELETE BACKUP] Error:", error);
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}
