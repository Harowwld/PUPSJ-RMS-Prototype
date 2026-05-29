import { NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

export const runtime = "nodejs";

function getExternalDriveInfo() {
  const configuredPath = process.env.EXTERNAL_BACKUP_PATH;

  // No path configured — report not configured
  if (!configuredPath) {
    return { configured: false, connected: false, path: null, label: null };
  }

  try {
    // On Windows, the root is the drive letter (e.g. "E:\"). On Unix, resolve the mount point.
    const normalized = path.resolve(configuredPath);
    const parsed = path.parse(normalized);
    const root = parsed.root || "/";

    const rootExists = fs.existsSync(root);
    const dirExists = rootExists && fs.existsSync(normalized);

    // Derive a friendly label from the path
    let label = null;
    if (os.platform() === "win32") {
      // e.g. "E:\" → "Drive E:"
      label = `Drive ${parsed.root.replace(/\\/g, "")}`;
    } else {
      // On macOS/Linux e.g. /Volumes/BACKUP_DRIVE → "BACKUP_DRIVE"
      const parts = normalized.split(path.sep).filter(Boolean);
      label = parts[parts.length - 1] || normalized;
    }

    return {
      configured: true,
      connected: rootExists && dirExists,
      rootReachable: rootExists,
      path: normalized,
      label,
    };
  } catch {
    return { configured: true, connected: false, path: configuredPath, label: null };
  }
}

export async function GET() {
  try {
    const info = getExternalDriveInfo();
    return NextResponse.json({ ok: true, data: info });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
