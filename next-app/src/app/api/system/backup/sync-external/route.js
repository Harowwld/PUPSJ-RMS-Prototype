import { NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import {
  getBackupById,
  getBackupsDir,
  getExternalBackupsDir,
  updateBackupStatus,
} from "../../../../../lib/backupsRepo";
import { writeAuditLog } from "../../../../../lib/auditLogRequest";

export const runtime = "nodejs";

export async function POST(req) {
  try {
    const { id } = await req.json();
    if (!id) return NextResponse.json({ ok: false, error: "Missing ID" }, { status: 400 });

    const backup = await getBackupById(id);
    if (!backup) return NextResponse.json({ ok: false, error: "Backup not found" }, { status: 404 });

    const backupsDir = getBackupsDir();
    const sourcePath = path.join(backupsDir, backup.filename);
    console.log(`[SYNC EXTERNAL] source path: ${sourcePath}`);

    if (!fs.existsSync(sourcePath)) {
      console.log(`[SYNC EXTERNAL] source file NOT FOUND at: ${sourcePath}`);
      return NextResponse.json({ ok: false, error: "Source file not found" }, { status: 404 });
    }

    const externalDir = getExternalBackupsDir();

    const destPath = path.join(externalDir, backup.filename);
    console.log(`[SYNC EXTERNAL] destination path: ${destPath}`);

    await new Promise(r => setTimeout(r, 2000));

    fs.copyFileSync(sourcePath, destPath);

    await updateBackupStatus(id, "status_external", "Success");
    await writeAuditLog(req, `Synced backup to external: ${backup.filename} (id ${id})`);

    return NextResponse.json({
      ok: true,
      message: "Synced to external hardware successfully",
      path: destPath
    });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
