import { NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import { getBackupById, getBackupsDir } from "../../../../../lib/backupsRepo";

export const runtime = "nodejs";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ ok: false, error: "Missing ID" }, { status: 400 });

    const backup = await getBackupById(id);
    if (!backup) return NextResponse.json({ ok: false, error: "Backup not found" }, { status: 404 });

    const backupsDir = getBackupsDir();
    const filePath = path.join(backupsDir, backup.filename);

    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ ok: false, error: "File not found on disk" }, { status: 404 });
    }

    const fileBuffer = fs.readFileSync(filePath);
    
    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${backup.filename}"`,
      },
    });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
