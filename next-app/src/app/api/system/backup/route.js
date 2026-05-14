import { NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import { 
  executeBackup, 
  listBackups, 
  syncBackupExternally,
  getBackupById,
  getBackupsDir,
  deleteBackupRecord
} from "../../../../lib/backupsRepo";
import { writeAuditLog } from "../../../../lib/auditLogRequest";
import { requireTOTP, extractTOTPToken } from "../../../../lib/totpMiddleware";
import { requireAdmin, createAuthErrorResponse } from "../../../../lib/authHelpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET: List all backups from database
 */
export async function GET(req) {
  try {
    const { user, error } = await requireAdmin(req);
    if (error || !user) {
      return createAuthErrorResponse(error || "Admin access required", 403);
    }

    const data = await listBackups();
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    console.error("Backup List Error:", error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}

/**
 * POST: Create a new AES-256 encrypted ZIP backup
 */
export async function POST(req) {
  console.log("[BACKUP API] POST request received");
  const { user, error } = await requireAdmin(req);
  if (error || !user) {
    console.log("[BACKUP API] Admin check failed:", error);
    return createAuthErrorResponse(error || "Admin access required", 403);
  }

  console.log("[BACKUP API] Admin verified:", user.id);
  const totpToken = extractTOTPToken(req.headers);
  console.log("[BACKUP API] Extracted TOTP token:", totpToken ? "PRESENT" : "MISSING");
  
  if (!totpToken) {
    const allHeaders = {};
    req.headers.forEach((val, key) => { allHeaders[key] = val; });
    console.log("[BACKUP API] Missing token. Available headers:", JSON.stringify(allHeaders));
  }
  
  const totpResult = await requireTOTP(user.id, totpToken);
  if (!totpResult.valid) {
    console.log("[BACKUP API] TOTP verification failed:", totpResult.error);
    return NextResponse.json(
      { 
        ok: false, 
        error: "TOTP verification required: " + totpResult.error, 
        requiresTOTP: true,
        missingToken: !!totpResult.missing
      },
      { status: 403 }
    );
  }

  console.log("[BACKUP API] TOTP verified, executing backup...");
  try {
    const record = await executeBackup();
    console.log("[BACKUP API] Backup executed successfully:", record.filename);
    
    // --- AUTOMATED BACKGROUND SYNC ---
    // We intentionally do NOT 'await' this call so the user gets an immediate response.
    // The sync will happen in the background and update the status in the DB when done.
    syncBackupExternally(record.id).catch(err => {
      console.error(`[BACKUP API] Background auto-sync failed for ${record.id}:`, err.message);
    });

    await writeAuditLog(req, `Create Backup`, { 
      details: `initiated full system state capture (Package: ${record?.filename || "unknown"}) and distributed to primary storage`,
      entity_type: "Backup",
      entity_id: record?.id
    });

    return NextResponse.json({
      ok: true,
      message: "Encrypted backup created successfully. Automatic external synchronization initiated in background.",
      data: record
    });
  } catch (error) {
    console.error("[BACKUP API] Backup Creation Error:", error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}

/**
 * DELETE: Bulk delete multiple backups
 */
export async function DELETE(req) {
  try {
    const { user, error: authError } = await requireAdmin(req);
    if (authError || !user) {
      return createAuthErrorResponse(authError || "Admin access required", 403);
    }

    const body = await req.json();
    const { ids } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ ok: false, error: "No IDs provided" }, { status: 400 });
    }

    console.log(`[BULK DELETE BACKUP] User ${user.id} attempting to delete backups: ${ids.join(", ")}`);

    const deletedFiles = [];
    const errors = [];

    for (const id of ids) {
      try {
        const backup = await getBackupById(id);
        if (!backup) {
          errors.push(`Backup ${id} not found`);
          continue;
        }

        const backupsDir = getBackupsDir();
        const filePath = path.resolve(backupsDir, backup.filename);
        
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }

        const changes = await deleteBackupRecord(id);
        if (changes > 0) {
          deletedFiles.push(backup.filename);
        } else {
          errors.push(`Failed to remove DB record for ${backup.filename}`);
        }
      } catch (err) {
        errors.push(`Error deleting ${id}: ${err.message}`);
      }
    }

    if (deletedFiles.length > 0) {
      await writeAuditLog(req, `Bulk Delete Backups`, {
        details: `permanently deleted ${deletedFiles.length} backup packages: ${deletedFiles.join(", ")}`,
        severity: "WARNING",
        entity_type: "Backup",
        entity_id: ids[0] // Reference first ID for relation
      });
    }

    return NextResponse.json({
      ok: true,
      deletedCount: deletedFiles.length,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    console.error("[BULK DELETE BACKUP] Global Error:", error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
