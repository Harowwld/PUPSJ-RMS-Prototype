import { NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

export const runtime = "nodejs";

function getDriveMountPoint(normalized) {
  const platform = os.platform();

  if (platform === "darwin" || platform === "linux") {
    const parts = normalized.split(path.sep).filter(Boolean);
    // On macOS: /Volumes/<DriveName>/... → mount point is /Volumes/<DriveName>
    if (parts[0] === "Volumes" && parts.length >= 2) {
      return path.join("/", parts[0], parts[1]);
    }
    // Fallback: use the path itself
    return normalized;
  }

  // Windows: root is the drive letter, e.g. "E:\"
  return path.parse(normalized).root || normalized;
}

function getExternalDriveInfo() {
  const configuredPath = process.env.EXTERNAL_BACKUP_PATH;

  if (!configuredPath) {
    return { configured: false, connected: false, path: null, label: null };
  }

  try {
    const normalized = path.resolve(configuredPath);
    const mountPoint = getDriveMountPoint(normalized);
    const connected = fs.existsSync(mountPoint);

    // Derive a friendly label from the mount point
    let label;
    if (os.platform() === "win32") {
      label = `Drive ${path.parse(normalized).root.replace(/\\/g, "")}`;
    } else {
      const parts = mountPoint.split(path.sep).filter(Boolean);
      label = parts[parts.length - 1] || mountPoint;
    }

    return { configured: true, connected, path: normalized, label, mountPoint };
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
