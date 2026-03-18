import { NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import { getBackupById, getBackupsDir, deleteBackupRecord } from "../../../../../lib/backupsRepo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE(req, { params }) {
  try {
    const { id } = await params;
    console.log(`[DELETE BACKUP] Attempting to delete backup with ID: ${id}`);

    if (!id) return NextResponse.json({ ok: false, error: "Missing ID" }, { status: 400 });

    const backup = await getBackupById(id);
    if (!backup) {
      console.log(`[DELETE BACKUP] Backup not found in DB for ID: ${id}`);
      return NextResponse.json({ ok: false, error: "Backup record not found" }, { status: 409 });
    }

    console.log(`[DELETE BACKUP] Found backup in DB: ${backup.filename}`);
    const filePath = path.join(backupsDir, backup.filename);

    // Delete file from disk if it exists
    if (fs.existsSync(filePath)) {
      console.log(`[DELETE BACKUP] Deleting file from disk: ${filePath}`);
      fs.unlinkSync(filePath);
    } else {
      console.log(`[DELETE BACKUP] File not found on disk, skipping file deletion: ${filePath}`);
    }

    // Delete record from database
    console.log(`[DELETE BACKUP] Deleting record from database for ID: ${id}`);
    const changes = await deleteBackupRecord(id);
    console.log(`[DELETE BACKUP] DB Changes: ${changes}`);

    if (changes === 0) {
      throw new Error("Record was not removed from database");
    }

    return NextResponse.json({
      ok: true,
      message: "Backup deleted successfully"
    });
  } catch (error) {
    console.error("[DELETE BACKUP] Error:", error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
