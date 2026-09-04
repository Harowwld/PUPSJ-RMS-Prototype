import { NextResponse } from "next/server";
import { requireAdmin, createAuthErrorResponse } from "@/lib/authHelpers";
import { requireTOTP, extractTOTPToken } from "@/lib/totpMiddleware";
import { executeRestoreBackup } from "@/lib/backupsRepo";
import { writeAuditLog } from "@/lib/auditLogRequest";

export const runtime = "nodejs";

export async function POST(req) {
  try {
    const { user, error } = await requireAdmin(req);
    if (error || !user) {
      return createAuthErrorResponse(error || "Admin access required", 403);
    }

    const totpToken = extractTOTPToken(req.headers);
    const totpResult = await requireTOTP(user.id, totpToken);
    if (!totpResult.valid) {
      return NextResponse.json(
        {
          ok: false,
          error: "TOTP verification required: " + totpResult.error,
          requiresTOTP: true,
          missingToken: !!totpResult.missing,
        },
        { status: 403 }
      );
    }

    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || typeof file === "string") {
      return NextResponse.json(
        { ok: false, error: "No backup archive file provided in form data." },
        { status: 400 }
      );
    }

    const fileBuffer = Buffer.from(await file.arrayBuffer());

    const result = await executeRestoreBackup(fileBuffer, {
      actorId: user.id,
      userRole: user.role,
      userOffice: user.office_id || user.section || "registrar",
    });

    const fileName = file.name || "backup-archive";
    await writeAuditLog(req, "Restore System Backup", {
      details: `Restored backup package '${fileName}' (${result.tablesRestored.length} tables, ${result.filesRestored} files)`,
      severity: "CRITICAL",
      entity_type: "Backup",
      officeId: user.office_id || user.section || null,
    });

    return NextResponse.json({
      ok: true,
      message: `System restored successfully from backup package (${result.tablesRestored.length} tables, ${result.filesRestored} partition files).`,
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
