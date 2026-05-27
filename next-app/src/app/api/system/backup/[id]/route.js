import { NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import {
  getBackupById,
  getBackupsDir,
  getExternalBackupsDir,
  deleteBackupRecord,
} from "../../../../../lib/backupsRepo";
import { writeAuditLog } from "../../../../../lib/auditLogRequest";
import { requireAdmin, createAuthErrorResponse } from "../../../../../lib/authHelpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE(req, { params }) {
  try {
    const { user, error } = await requireAdmin(req);
    if (error || !user) {
      return createAuthErrorResponse(error || "Admin access required", 403);
    }

    const { id: idStr } = await params;
    const id = Number(idStr);
    console.log(`[DELETE BACKUP] Attempting to delete backup with ID: ${id} by user ${user.id}`);

    if (isNaN(id)) return NextResponse.json({ ok: false, error: "Invalid ID" }, { status: 400 });

    const backup = await getBackupById(id);
    if (!backup) {
      console.log(`[DELETE BACKUP] Backup record not found in DB for ID: ${id}`);
      return NextResponse.json({ ok: false, error: "Backup record not found" }, { status: 409 });
    }

    console.log(`[DELETE BACKUP] Found backup in DB: ${backup.filename}`);
    const backupsDir = getBackupsDir();
    const filePath = path.resolve(backupsDir, backup.filename);
    console.log(`[DELETE BACKUP] Resolved absolute file path: ${filePath}`);

    // Strict deletion: if any existing file cannot be removed, fail and keep DB record.
    if (fs.existsSync(filePath)) {
      console.log(`[DELETE BACKUP] File exists. Attempting to unlink: ${filePath}`);
      fs.unlinkSync(filePath);
      console.log(`[DELETE BACKUP] Successfully unlinked local file: ${filePath}`);
    } else {
      console.log(`[DELETE BACKUP] Local file NOT FOUND on disk at: ${filePath}`);
    }

    // NOTE: External backups are intentionally left untouched (Immutable Archive approach).
    // The web application does not have the authority to delete synced files from the external drive.

    // Delete record from database
    console.log(`[DELETE BACKUP] Deleting record from database for ID: ${id}`);
    const changes = await deleteBackupRecord(id);
    console.log(`[DELETE BACKUP] DB Changes: ${changes}`);

    if (changes === 0) {
      console.log(`[DELETE BACKUP] Record was not found or already removed from database for ID: ${id}`);
    }
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
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
