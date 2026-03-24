import { NextResponse } from "next/server";
import { executeBackup, listBackups } from "../../../../lib/backupsRepo";

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
 * POST: Create a new standard ZIP backup (No Encryption)
 */
export async function POST() {
  try {
    const record = await executeBackup();
    return NextResponse.json({
      ok: true,
      message: "Standard backup created successfully",
      data: record
    });
  } catch (error) {
    console.error("Backup Creation Error:", error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
