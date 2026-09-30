import { NextResponse } from "next/server";
import { requireAdmin, createAuthErrorResponse } from "@/lib/authHelpers";
import { requireTOTP, extractTOTPToken } from "@/lib/totpMiddleware";
import {
  executeRestoreBackup,
  inspectBackupBuffer,
  getBackupBufferById,
  getPrincipalOfficeId,
} from "@/lib/backupsRepo";
import { writeAuditLog } from "@/lib/auditLogRequest";
import { isSystemAdminRole } from "@/lib/roleUtils";

export const runtime = "nodejs";

export async function POST(req) {
  try {
    const { user, error } = await requireAdmin(req);
    if (error || !user) {
      return createAuthErrorResponse(error || "Admin access required", 403);
    }

    const userOffice = getPrincipalOfficeId(user);
    if (!isSystemAdminRole(user.role) && !userOffice) {
      return createAuthErrorResponse("Office scope is required", 403);
    }

    const contentType = req.headers.get("content-type") || "";
    let fileBuffer = null;
    let fileName = "backup-archive";
    let mode = "merge"; // Default to Safe Merge
    let action = "restore";
    let backupId = null;

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file");
      mode = formData.get("mode") || "merge";
      action = formData.get("action") || "restore";
      const idParam = formData.get("backupId");
      if (idParam) backupId = Number(idParam);

      if (file && typeof file !== "string") {
        fileBuffer = Buffer.from(await file.arrayBuffer());
        fileName = file.name || "uploaded-backup.zip.enc";
      } else if (backupId) {
        const item = await getBackupBufferById(backupId);
        fileBuffer = item.buffer;
        fileName = item.backup.filename;
      }
    } else {
      const body = await req.json().catch(() => ({}));
      mode = body.mode || "merge";
      action = body.action || "restore";
      if (body.backupId) {
        backupId = Number(body.backupId);
        const item = await getBackupBufferById(backupId);
        fileBuffer = item.buffer;
        fileName = item.backup.filename;
      }
    }

    if (!fileBuffer) {
      return NextResponse.json(
        { ok: false, error: "No backup archive provided (neither file upload nor backupId)." },
        { status: 400 }
      );
    }

    // Check if client is requesting an inspection/diff preview
    const isPreview = action === "preview" || req.nextUrl?.searchParams?.get("preview") === "1";
    if (isPreview) {
      const preview = await inspectBackupBuffer(fileBuffer, {
        userRole: user.role,
        userOffice,
      });
      return NextResponse.json({
        ok: true,
        data: {
          ...preview,
          filename: fileName,
        },
      });
    }

    // For actual execution of restoration, verify TOTP security
    const totpToken = extractTOTPToken(req.headers);
    const totpResult = await requireTOTP(user.id, totpToken, { requireEnabled: true });
    if (!totpResult.valid) {
      return NextResponse.json(
        {
          ok: false,
          error: "TOTP verification required: " + totpResult.error,
          requiresTOTP: !totpResult.notConfigured,
          totpNotConfigured: !!totpResult.notConfigured,
          missingToken: !!totpResult.missing,
        },
        { status: 403 }
      );
    }

    const result = await executeRestoreBackup(fileBuffer, {
      actorId: user.id,
      userRole: user.role,
      userOffice,
      mode,
      createSafetySnapshot: true,
    });

    const modeLabel = mode === "merge" ? "Safe Merge (Reconciliation)" : "Full Overwrite";
    await writeAuditLog(req, "Restore System Backup", {
      details: `Restored backup '${fileName}' via ${modeLabel}. (${result.tablesRestored.length} tables, ${result.filesRestored} files restored. Safety snapshot: ${result.safetySnapshot || "none"})`,
      severity: "CRITICAL",
      entity_type: "Backup",
      officeId: userOffice,
    });

    return NextResponse.json({
      ok: true,
      message: `System restored successfully via ${modeLabel} (${result.tablesRestored.length} tables processed, ${result.filesRestored} files extracted). Safety snapshot preserved.`,
      data: result,
    });
  } catch (err) {
    console.error("[RESTORE API] Restoration Error:", err);
    return NextResponse.json(
      { ok: false, error: err.message || "Failed to restore backup archive." },
      { status: 500 }
    );
  }
}
