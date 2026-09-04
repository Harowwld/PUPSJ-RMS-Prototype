import { NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import { 
  executeBackup, 
  executeSystemBackup,
  executeOfficeBackup,
  listBackups, 
  syncBackupExternally,
  getBackupById,
  getBackupsDir,
  deleteBackupRecord
} from "../../../../lib/backupsRepo";
import { writeAuditLog } from "../../../../lib/auditLogRequest";
import { requireTOTP, extractTOTPToken } from "../../../../lib/totpMiddleware";
import { requireAdmin, createAuthErrorResponse } from "../../../../lib/authHelpers";
import { isSystemAdminRole } from "../../../../lib/roleUtils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getUserOfficeId(user) {
  if (user?.office_id) return String(user.office_id).toLowerCase().trim();
  if (user?.section) return String(user.section).toLowerCase().trim();
  return "registrar";
}

/**
 * GET: List all backups from database
 * SuperAdmin can view all or filter by scope/office
 * Office Admin can only view their own office partition backups
 */
export async function GET(req) {
  try {
    const { user, error } = await requireAdmin(req);
    if (error || !user) {
      return createAuthErrorResponse(error || "Admin access required", 403);
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const startDate = searchParams.get("startDate") || "";
    const endDate = searchParams.get("endDate") || "";

    const isSuper = isSystemAdminRole(user.role);

    let scope = undefined;
    let officeId = undefined;

    if (isSuper) {
      const qScope = searchParams.get("scope");
      const qOffice = searchParams.get("officeId") || searchParams.get("office");
      if (qScope) scope = qScope;
      if (qOffice) officeId = qOffice.toLowerCase();
    } else {
      // Office Admin is strictly isolated to their own office partition
      scope = "office";
      officeId = getUserOfficeId(user);
    }

    const data = await listBackups({ 
      search, 
      startDate, 
      endDate, 
      scope, 
      officeId 
    });

    return NextResponse.json({ ok: true, data });
  } catch (error) {
    console.error("Backup List Error:", error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}

/**
 * POST: Create a new AES-256 encrypted ZIP backup
 * SuperAdmin creates system governance backups (or office backups if specified)
 * Office Admin creates isolated office partition backups (documents + data)
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

  // Parse request body for scope/office preferences
  const body = await req.json().catch(() => ({}));
  const isSuper = isSystemAdminRole(user.role);

  console.log(`[BACKUP API] TOTP verified. Initiating backup (isSuper=${isSuper}, requestedScope=${body?.scope})...`);

  try {
    let record = null;
    let logDescription = "";

    if (isSuper) {
      const requestedScope = body?.scope || "system";
      if (requestedScope === "system") {
        record = await executeSystemBackup({ actorId: user.id });
        logDescription = `initiated platform governance backup (Package: ${record?.filename})`;
      } else {
        const targetOffice = (body?.officeId || "registrar").toLowerCase();
        record = await executeOfficeBackup({ officeId: targetOffice, actorId: user.id });
        logDescription = `initiated [${targetOffice}] office partition backup (Package: ${record?.filename})`;
      }
    } else {
      // Enforce office isolation: office admin can only backup their own partition
      const officeId = getUserOfficeId(user);
      record = await executeOfficeBackup({ officeId, actorId: user.id });
      logDescription = `initiated [${officeId}] office partition backup (Package: ${record?.filename})`;
    }

    const filename = record?.filename || "unknown-backup.zip.enc";
    const recordId = record?.id || null;
    
    console.log("[BACKUP API] Backup executed successfully:", filename);
    
    // Background automatic external synchronization
    if (recordId) {
      syncBackupExternally(recordId).catch(err => {
        console.error(`[BACKUP API] Background auto-sync failed for ${recordId}:`, err.message);
      });
    }

    await writeAuditLog(req, `Create Backup`, { 
      details: `${logDescription} and distributed to primary storage`,
      entity_type: "Backup",
      entity_id: recordId
    });

    return NextResponse.json({
      ok: true,
      message: "Encrypted backup created successfully. Automatic external synchronization initiated in background.",
      data: record || { filename, id: recordId }
    });
  } catch (error) {
    console.error("[BACKUP API] Backup Creation Error:", error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}

/**
 * DELETE: Bulk delete multiple backups
 * SuperAdmin can delete any
 * Office Admin can only delete their office's backups
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

    const isSuper = isSystemAdminRole(user.role);
    const userOffice = getUserOfficeId(user);

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

        // Office isolation check
        if (!isSuper) {
          if (backup.scope === "system" || (backup.office_id && backup.office_id.toLowerCase() !== userOffice)) {
            errors.push(`Permission denied: Backup ${id} does not belong to your office`);
            continue;
          }
        }

        const backupsDir = getBackupsDir();
        const filePath = path.resolve(backupsDir, backup.filename);
        
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }

        const changes = await deleteBackupRecord(id);
        if (changes >= 0) {
          deletedFiles.push(backup.filename);
          if (changes === 0) {
            console.log(`[BULK DELETE BACKUP] Warning: DB record for ${backup.filename} was already removed.`);
          }
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
        entity_id: ids[0]
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
