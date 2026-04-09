import { NextResponse } from "next/server";
import { executeBackup, listBackups } from "../../../../lib/backupsRepo";
import { writeAuditLog } from "../../../../lib/auditLogRequest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET: List all backups from database
 */
export async function GET() {
  try {
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
  try {
    const record = await executeBackup();
    await writeAuditLog(req, `Created system backup: ${record?.filename || "unknown"}`);
    return NextResponse.json({
      ok: true,
      message: "Encrypted backup created successfully",
      data: record
    });
  } catch (error) {
    console.error("Backup Creation Error:", error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
