import { NextResponse } from "next/server";
import { executeBackup, listBackups, syncBackupExternally } from "../../../../lib/backupsRepo";
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
