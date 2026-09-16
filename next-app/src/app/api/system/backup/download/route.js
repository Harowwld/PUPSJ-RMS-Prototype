import { NextResponse } from "next/server";
import fs from "node:fs";
import { getBackupById, getBackupsDir, getBackupFilePath } from "../../../../../lib/backupsRepo";
import { writeAuditLog } from "../../../../../lib/auditLogRequest";
import { requireAdmin, createAuthErrorResponse } from "../../../../../lib/authHelpers";
import { isSystemAdminRole } from "../../../../../lib/roleUtils";
import { canAccessResource } from "../../../../../lib/resourceAuthorization";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req) {
  try {
    const { user, error } = await requireAdmin(req);
    if (error || !user) {
      return createAuthErrorResponse(error || "Admin access required", 403);
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ ok: false, error: "Missing ID" }, { status: 400 });

    const backup = await getBackupById(id);
    if (!backup || !canAccessResource(user, "backup", backup)) return NextResponse.json({ ok: false, error: "Backup not found" }, { status: 404 });

    const backupsDir = getBackupsDir();
    const filePath = getBackupFilePath(backup.filename, backupsDir);

    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ ok: false, error: "File not found on disk" }, { status: 404 });
    }

    const fileBuffer = fs.readFileSync(filePath);

    await writeAuditLog(req, `Download Backup`, {
      details: `downloaded encrypted backup package '${backup.filename}' from local storage`,
      entity_type: "Backup",
      entity_id: id
    });

    const filename = String(backup.filename || "backup.bin");
    const isEncrypted = filename.endsWith(".enc");

    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": isEncrypted ? "application/octet-stream" : "application/zip",
        "Content-Disposition": `attachment; filename=\"${filename}\"`,
      },
    });
  } catch (error) {
    console.error("Backup Download Error:", error);
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}
