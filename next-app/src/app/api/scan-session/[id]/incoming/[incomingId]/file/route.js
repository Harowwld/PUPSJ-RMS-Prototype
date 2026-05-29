import fs from "node:fs";
import { NextResponse } from "next/server";
import { getSessionStaff, isActiveStaff } from "../../../../../../lib/scanSessionAuth.js";
import { getIncomingById, getScanSessionByIdForStaff } from "../../../../../../lib/scanSessionRepo.js";
import { getScanFilePath } from "../../../../../../lib/scanSessionFiles.js";

export const runtime = "nodejs";

export async function GET(_req, ctx) {
  const staff = await getSessionStaff();
  if (!staff || !isActiveStaff(staff)) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const params = await ctx.params;
  const sessionId = parseInt(String(params?.id || ""), 10);
  const incomingId = parseInt(String(params?.incomingId || ""), 10);
  if (!Number.isFinite(sessionId) || !Number.isFinite(incomingId)) {
    return NextResponse.json({ ok: false, error: "Invalid id" }, { status: 400 });
  }

  const session = await getScanSessionByIdForStaff(sessionId, staff.id);
  if (!session) {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }

  const incoming = await getIncomingById(incomingId);
  if (!incoming || Number(incoming.session_id) !== Number(sessionId)) {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }
  const storageFilename = String(incoming.storage_filename || "").trim();
  if (!storageFilename) {
    return NextResponse.json(
      { ok: false, error: "Incoming item has no file" },
      { status: 404 }
    );
  }
  const absPath = getScanFilePath(storageFilename);
  if (!fs.existsSync(absPath)) {
    return NextResponse.json({ ok: false, error: "File missing on disk" }, { status: 404 });
  }
  const bytes = fs.readFileSync(absPath);
  return new NextResponse(bytes, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Length": String(bytes.length),
      "Content-Disposition": `inline; filename=\"${String(incoming.filename || "scan.pdf").replaceAll('"', "")}\"`,
    },
  });
}

