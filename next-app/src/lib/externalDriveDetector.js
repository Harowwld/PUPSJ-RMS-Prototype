import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { execFileSync } from "node:child_process";

const FLAG_FILENAME = "external_drive_simulation.flag";

function getFlagPath() {
  const localData = process.env.LOCAL_DATA_DIR
    ? path.resolve(/*turbopackIgnore: true*/ process.cwd(), process.env.LOCAL_DATA_DIR)
    : path.resolve(/*turbopackIgnore: true*/ process.cwd(), ".local");
  return path.join(localData, FLAG_FILENAME);
}

export function setSimulationMode(enabled) {
  const isEnabled = Boolean(enabled);
  if (typeof globalThis !== "undefined") {
    globalThis.__PUPSJ_SIMULATION_ENABLED = isEnabled;
  }
  try {
    const flagPath = getFlagPath();
    const dir = path.dirname(flagPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    if (isEnabled) {
      fs.writeFileSync(flagPath, "true", "utf8");
    } else if (fs.existsSync(flagPath)) {
      fs.unlinkSync(flagPath);
    }
  } catch (err) {
    console.error("[externalDriveDetector] Failed to write simulation flag:", err);
  }
}

export function isSimulationMode() {
  try {
    const flagPath = getFlagPath();
    if (fs.existsSync(flagPath)) {
      if (typeof globalThis !== "undefined") globalThis.__PUPSJ_SIMULATION_ENABLED = true;
      return true;
    } else if (typeof globalThis !== "undefined" && globalThis.__PUPSJ_SIMULATION_ENABLED !== undefined) {
      if (process.env.EXTERNAL_BACKUP_SIMULATE !== "true") {
        globalThis.__PUPSJ_SIMULATION_ENABLED = false;
      }
    }
  } catch {}
  if (typeof globalThis !== "undefined" && globalThis.__PUPSJ_SIMULATION_ENABLED !== undefined) {
    return Boolean(globalThis.__PUPSJ_SIMULATION_ENABLED);
  }
  return process.env.EXTERNAL_BACKUP_SIMULATE === "true";
}

/**
 * Format bytes to readable size
 */
function formatBytes(bytes) {
  if (!bytes || isNaN(bytes)) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

/**
 * Get disk space information for a directory
 */
function getDiskSpace(dirPath) {
  try {
    if (!fs.existsSync(dirPath)) return null;
    if (typeof fs.statfsSync === "function") {
      const stats = fs.statfsSync(dirPath);
      const bsize = stats.bsize || 4096;
      const freeBytes = Number(stats.bavail || 0) * bsize;
      const totalBytes = Number(stats.blocks || 0) * bsize;
      return {
        freeBytes,
        totalBytes,
        freeFormatted: formatBytes(freeBytes),
        totalFormatted: formatBytes(totalBytes),
      };
    }
  } catch (e) {
    // Ignore statfs errors
  }
  return null;
}

/**
 * Check if a directory is writable
 */
function isDirectoryWritable(dirPath) {
  try {
    fs.accessSync(dirPath, fs.constants.W_OK);
    return true;
  } catch {
    return false;
  }
}

/**
 * Linux: scan for removable and USB block devices
 */
function detectLinuxDrives() {
  const drives = [];

  // 1. Run lsblk JSON query
  try {
    const raw = execFileSync(
      "lsblk",
      ["-J", "-o", "NAME,MODEL,TRAN,RM,HOTPLUG,SIZE,TYPE,MOUNTPOINTS,LABEL,FSTYPE"],
      { encoding: "utf8", timeout: 2500 }
    );
    const parsed = JSON.parse(raw);

    for (const dev of parsed.blockdevices || []) {
      const isUsb = dev.tran === "usb";
      const isRemovable = Boolean(dev.rm) || Boolean(dev.hotplug);

      // Check partitions under this device
      const partitions = Array.isArray(dev.children) && dev.children.length > 0 ? dev.children : [dev];

      for (const part of partitions) {
        const mountpoints = Array.isArray(part.mountpoints)
          ? part.mountpoints.filter((m) => m && !m.startsWith("["))
          : [];

        if (mountpoints.length > 0 && (isUsb || isRemovable)) {
          const mount = mountpoints[0];
          const space = getDiskSpace(mount);
          const isWritable = isDirectoryWritable(mount);

          drives.push({
            name: part.name || dev.name,
            label: part.label || dev.model || part.name || "USB Drive",
            mountPoint: mount,
            size: part.size || dev.size,
            fstype: part.fstype || "unknown",
            isUsb,
            isRemovable: true,
            isWritable,
            freeBytes: space?.freeBytes ?? null,
            totalBytes: space?.totalBytes ?? null,
            freeFormatted: space?.freeFormatted ?? null,
            totalFormatted: space?.totalFormatted ?? null,
          });
        }
      }
    }
  } catch {
    // lsblk might fail or be missing in some environments
  }

  // 2. Scan standard removable mount locations: /run/media and /media
  try {
    for (const base of ["/run/media", "/media"]) {
      if (!fs.existsSync(base)) continue;
      const userDirs = fs.readdirSync(base);

      for (const u of userDirs) {
        const userPath = path.join(base, u);
        try {
          if (!fs.statSync(userPath).isDirectory()) continue;
          const mounts = fs.readdirSync(userPath);

          for (const m of mounts) {
            const fullMount = path.join(userPath, m);
            try {
              if (fs.statSync(fullMount).isDirectory()) {
                const alreadyFound = drives.some((d) => d.mountPoint === fullMount);
                if (!alreadyFound) {
                  const space = getDiskSpace(fullMount);
                  const isWritable = isDirectoryWritable(fullMount);
                  drives.push({
                    name: m,
                    label: m,
                    mountPoint: fullMount,
                    size: space?.totalFormatted || "Unknown",
                    fstype: "external",
                    isUsb: true,
                    isRemovable: true,
                    isWritable,
                    freeBytes: space?.freeBytes ?? null,
                    totalBytes: space?.totalBytes ?? null,
                    freeFormatted: space?.freeFormatted ?? null,
                    totalFormatted: space?.totalFormatted ?? null,
                  });
                }
              }
            } catch {}
          }
        } catch {}
      }
    }
  } catch {}

  return drives;
}

/**
 * macOS: Scan /Volumes
 */
function detectMacDrives() {
  const drives = [];
  try {
    const volumesDir = "/Volumes";
    if (!fs.existsSync(volumesDir)) return drives;

    const entries = fs.readdirSync(volumesDir);
    for (const entry of entries) {
      // Ignore internal system root and recovery
      if (entry === "Macintosh HD" || entry === "Macintosh HD - Data" || entry.startsWith(".")) {
        continue;
      }
      const fullPath = path.join(volumesDir, entry);
      try {
        if (fs.statSync(fullPath).isDirectory()) {
          const space = getDiskSpace(fullPath);
          const isWritable = isDirectoryWritable(fullPath);
          drives.push({
            name: entry,
            label: entry,
            mountPoint: fullPath,
            size: space?.totalFormatted || "External",
            fstype: "apfs/exfat",
            isUsb: true,
            isRemovable: true,
            isWritable,
            freeBytes: space?.freeBytes ?? null,
            totalBytes: space?.totalBytes ?? null,
            freeFormatted: space?.freeFormatted ?? null,
            totalFormatted: space?.totalFormatted ?? null,
          });
        }
      } catch {}
    }
  } catch {}
  return drives;
}

/**
 * Windows: Check drive letters D:\ through Z:\
 */
function detectWindowsDrives() {
  const drives = [];
  try {
    // Check drive letters
    for (let c = 68; c <= 90; c++) {
      const letter = `${String.fromCharCode(c)}:\\`;
      try {
        if (fs.existsSync(letter)) {
          const space = getDiskSpace(letter);
          const isWritable = isDirectoryWritable(letter);
          drives.push({
            name: letter,
            label: `Drive ${String.fromCharCode(c)}`,
            mountPoint: letter,
            size: space?.totalFormatted || "External",
            fstype: "ntfs/exfat",
            isUsb: true,
            isRemovable: true,
            isWritable,
            freeBytes: space?.freeBytes ?? null,
            totalBytes: space?.totalBytes ?? null,
            freeFormatted: space?.freeFormatted ?? null,
            totalFormatted: space?.totalFormatted ?? null,
          });
        }
      } catch {}
    }
  } catch {}
  return drives;
}

/**
 * Main External Drive Detection Function
 * Detects whether an actual external drive is attached.
 */
export function detectExternalDrive(options = {}) {
  const allowSimulation = options.simulate !== undefined ? options.simulate : isSimulationMode();
  const configuredPath = process.env.EXTERNAL_BACKUP_PATH || null;

  // 1. If simulation mode is explicitly requested/enabled, use the simulated volume
  if (allowSimulation) {
    const localData = process.env.LOCAL_DATA_DIR
      ? path.resolve(/*turbopackIgnore: true*/ process.cwd(), process.env.LOCAL_DATA_DIR)
      : path.resolve(/*turbopackIgnore: true*/ process.cwd(), ".local");
    const emulatedPath = path.resolve(/*turbopackIgnore: true*/ localData, "external_media");
    if (!fs.existsSync(emulatedPath)) {
      fs.mkdirSync(emulatedPath, { recursive: true });
    }
    const space = getDiskSpace(emulatedPath);
    return {
      configured: Boolean(configuredPath),
      connected: true,
      path: emulatedPath,
      mountPoint: emulatedPath,
      label: "Simulated External Media (Dev Node)",
      isWritable: true,
      freeBytes: space?.freeBytes ?? null,
      totalBytes: space?.totalBytes ?? null,
      freeFormatted: space?.freeFormatted ?? null,
      totalFormatted: space?.totalFormatted ?? null,
      isRemovable: false,
      isEmulated: true,
      drives: [
        {
          name: "simulated_node",
          label: "Simulated External Media (Dev Node)",
          mountPoint: emulatedPath,
          isWritable: true,
          freeFormatted: space?.freeFormatted,
          totalFormatted: space?.totalFormatted,
        },
      ],
    };
  }

  // 2. Check if configured EXTERNAL_BACKUP_PATH exists on disk and is reachable
  if (configuredPath) {
    try {
      const resolved = path.resolve(/*turbopackIgnore: true*/ configuredPath);
      const root = path.parse(resolved).root;

      // Verify root exists
      if (fs.existsSync(root) && fs.existsSync(resolved)) {
        const isWritable = isDirectoryWritable(resolved);
        const space = getDiskSpace(resolved);
        let label = path.basename(resolved);
        if (os.platform() === "win32") {
          label = `Drive ${root.replace(/\\/g, "")}`;
        }

        return {
          configured: true,
          connected: true,
          path: resolved,
          mountPoint: resolved,
          label: label || "Configured External Drive",
          isWritable,
          freeBytes: space?.freeBytes ?? null,
          totalBytes: space?.totalBytes ?? null,
          freeFormatted: space?.freeFormatted ?? null,
          totalFormatted: space?.totalFormatted ?? null,
          isRemovable: true,
          isEmulated: false,
          drives: [
            {
              name: label,
              label,
              mountPoint: resolved,
              isWritable,
              freeFormatted: space?.freeFormatted,
              totalFormatted: space?.totalFormatted,
            },
          ],
        };
      }
    } catch {
      // Unreachable configured path
    }
  }

  // 3. Scan physical hardware / removable USB devices
  let detectedDrives = [];
  const platform = os.platform();

  if (platform === "linux") {
    detectedDrives = detectLinuxDrives();
  } else if (platform === "darwin") {
    detectedDrives = detectMacDrives();
  } else if (platform === "win32") {
    detectedDrives = detectWindowsDrives();
  }

  // If physical drives are found
  if (detectedDrives.length > 0) {
    const primary = detectedDrives[0];
    return {
      configured: Boolean(configuredPath),
      connected: true,
      path: primary.mountPoint,
      mountPoint: primary.mountPoint,
      label: primary.label,
      isWritable: primary.isWritable,
      freeBytes: primary.freeBytes,
      totalBytes: primary.totalBytes,
      freeFormatted: primary.freeFormatted,
      totalFormatted: primary.totalFormatted,
      isRemovable: true,
      isEmulated: false,
      drives: detectedDrives,
    };
  }

  // 4. Physical detection found NO drives and simulation is OFF
  return {
    configured: Boolean(configuredPath),
    connected: false,
    path: null,
    mountPoint: null,
    label: null,
    isWritable: false,
    freeBytes: null,
    totalBytes: null,
    freeFormatted: null,
    totalFormatted: null,
    isRemovable: false,
    isEmulated: false,
    drives: [],
    message: "No external volume detected. Attach a physical USB storage drive or configure EXTERNAL_BACKUP_PATH.",
  };
}
