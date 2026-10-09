import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { execFileSync } from "node:child_process";

const FLAG_FILENAME = "external_drive_simulation.flag";

function getFlagPath() {
  const localData = process.env.LOCAL_DATA_DIR
    ? path.resolve(/*turbopackIgnore: true*/ process.cwd(), process.env.LOCAL_DATA_DIR)
    : path.resolve(/*turbopackIgnore: true*/ process.cwd(), ".local");
  return path.join(/*turbopackIgnore: true*/ localData, FLAG_FILENAME);
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
export function formatBytes(bytes) {
  if (!bytes || isNaN(bytes)) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

/**
 * Get disk space information for a directory
 */
export function getDiskSpace(dirPath) {
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
  } catch {
    // Ignore statfs errors
  }
  return null;
}

/**
 * Check if a directory is writable
 */
export function isDirectoryWritable(dirPath) {
  try {
    fs.accessSync(dirPath, fs.constants.W_OK);
    return true;
  } catch {
    return false;
  }
}

/**
 * Helper to check if a block device in Linux is attached via USB bus
 */
export function isLinuxBlockDeviceUsb(devName) {
  if (!devName) return false;
  try {
    const cleanName = path.basename(devName).replace(/[0-9]+$/, "");
    const sysBlockPath = path.join("/sys/block", cleanName);
    if (fs.existsSync(sysBlockPath)) {
      const realPath = fs.realpathSync(sysBlockPath);
      if (/\/usb[0-9]*\//i.test(realPath)) {
        return true;
      }
      const removableFile = path.join(sysBlockPath, "removable");
      if (fs.existsSync(removableFile)) {
        const val = fs.readFileSync(removableFile, "utf8").trim();
        if (val === "1") return true;
      }
    }
  } catch {}
  return false;
}

/**
 * Read kernel mount table from /proc/mounts or /proc/self/mounts
 */
export function getLinuxMounts() {
  const mounts = [];
  try {
    const mountsPath = fs.existsSync("/proc/self/mounts")
      ? "/proc/self/mounts"
      : fs.existsSync("/proc/mounts")
      ? "/proc/mounts"
      : null;

    if (mountsPath) {
      const content = fs.readFileSync(mountsPath, "utf8");
      for (const line of content.split("\n")) {
        const parts = line.trim().split(/\s+/);
        if (parts.length >= 3) {
          const device = parts[0];
          // /proc/mounts encodes spaces as \040 and tabs as \011
          const mountPoint = parts[1].replace(/\\040/g, " ").replace(/\\011/g, "\t");
          const fstype = parts[2];
          mounts.push({ device, mountPoint, fstype, options: parts[3] || "" });
        }
      }
    }
  } catch {}
  return mounts;
}

/**
 * Attempt to auto-mount an unmounted Linux partition via udisksctl
 */
export function tryAutoMountLinux(devicePath) {
  if (!devicePath) return null;
  try {
    const out = execFileSync(
      "udisksctl",
      ["mount", "-b", devicePath, "--no-user-interaction"],
      { encoding: "utf8", timeout: 3000 }
    );
    const match = out.match(/Mounted\s+.+?\s+at\s+(.+?)[\.\r\n]/);
    if (match && match[1]) {
      const target = match[1].trim();
      if (fs.existsSync(target)) return target;
    }
  } catch {}
  return null;
}

/**
 * Linux: scan for removable and USB block devices
 */
export function detectLinuxDrives() {
  const drives = [];
  const allMounts = getLinuxMounts();

  // 1. Run lsblk JSON query
  try {
    const raw = execFileSync(
      "lsblk",
      ["-J", "-o", "NAME,MODEL,TRAN,RM,HOTPLUG,SIZE,TYPE,MOUNTPOINTS,MOUNTPOINT,LABEL,FSTYPE,SUBSYSTEMS,PATH"],
      { encoding: "utf8", timeout: 2500 }
    );
    const parsed = JSON.parse(raw);

    for (const dev of parsed.blockdevices || []) {
      const isSysfsUsb = isLinuxBlockDeviceUsb(dev.name);
      const isTranUsb = dev.tran === "usb" || (typeof dev.subsystems === "string" && dev.subsystems.includes("usb"));
      const isRemovable = Boolean(dev.rm) || Boolean(dev.hotplug) || isSysfsUsb || isTranUsb;
      const isUsb = isTranUsb || isSysfsUsb;

      // Check partitions under this device
      const partitions = Array.isArray(dev.children) && dev.children.length > 0 ? dev.children : [dev];

      for (const part of partitions) {
        // Collect mount points from lsblk (both modern array and older string)
        const rawMounts = [];
        if (Array.isArray(part.mountpoints)) {
          for (const m of part.mountpoints) {
            if (m && !m.startsWith("[")) rawMounts.push(m);
          }
        }
        if (part.mountpoint && typeof part.mountpoint === "string" && !part.mountpoint.startsWith("[")) {
          rawMounts.push(part.mountpoint);
        }

        // Also check /proc/mounts matching part.path or /dev/<name>
        const partPath = part.path || `/dev/${part.name}`;
        for (const m of allMounts) {
          if ((m.device === partPath || m.device === `/dev/${part.name}`) && !rawMounts.includes(m.mountPoint)) {
            if (!m.mountPoint.startsWith("[")) rawMounts.push(m.mountPoint);
          }
        }

        // If this is a USB/removable device with a filesystem but no mount, attempt auto-mount
        if (rawMounts.length === 0 && (isUsb || isRemovable) && part.fstype && part.fstype !== "swap") {
          const autoMounted = tryAutoMountLinux(partPath);
          if (autoMounted && !rawMounts.includes(autoMounted)) {
            rawMounts.push(autoMounted);
          }
        }

        // If mounted, inspect and add
        if (rawMounts.length > 0 && (isUsb || isRemovable)) {
          const mount = rawMounts[0];
          const space = getDiskSpace(mount);
          const isWritable = isDirectoryWritable(mount);

          drives.push({
            name: part.name || dev.name,
            label: part.label || dev.model || part.name || "USB Drive",
            mountPoint: mount,
            size: space?.totalFormatted || part.size || dev.size || "Unknown",
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

  // 2. Scan standard removable mount locations: /run/media, /media, and /mnt
  try {
    const rootDev = fs.existsSync("/") ? fs.statSync("/").dev : null;
    for (const base of ["/run/media", "/media", "/mnt"]) {
      if (!fs.existsSync(/*turbopackIgnore: true*/ base)) continue;
      const baseStat = fs.statSync(/*turbopackIgnore: true*/ base);
      const entries = fs.readdirSync(/*turbopackIgnore: true*/ base);

      for (const entry of entries) {
        const entryPath = path.join(/*turbopackIgnore: true*/ base, entry);
        try {
          const entryStat = fs.statSync(/*turbopackIgnore: true*/ entryPath);
          if (!entryStat.isDirectory()) continue;

          // Check if entryPath is itself a mount point (1-level, e.g. /media/USB_DRIVE or /mnt/backup)
          const isDirectMount = allMounts.some((m) => m.mountPoint === entryPath) ||
            (entryStat.dev !== baseStat.dev && (!rootDev || entryStat.dev !== rootDev));

          if (isDirectMount) {
            const alreadyFound = drives.some((d) => d.mountPoint === entryPath);
            if (!alreadyFound) {
              const space = getDiskSpace(entryPath);
              const isWritable = isDirectoryWritable(entryPath);
              drives.push({
                name: entry,
                label: entry,
                mountPoint: entryPath,
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
          } else {
            // Check 2-level mounts (e.g. /run/media/<user>/<drive> or /media/<user>/<drive>)
            try {
              const subEntries = fs.readdirSync(/*turbopackIgnore: true*/ entryPath);
              for (const sub of subEntries) {
                const fullMount = path.join(/*turbopackIgnore: true*/ entryPath, sub);
                try {
                  const subStat = fs.statSync(/*turbopackIgnore: true*/ fullMount);
                  if (subStat.isDirectory() && (subStat.dev !== entryStat.dev || allMounts.some((m) => m.mountPoint === fullMount))) {
                    const alreadyFound = drives.some((d) => d.mountPoint === fullMount);
                    if (!alreadyFound) {
                      const space = getDiskSpace(fullMount);
                      const isWritable = isDirectoryWritable(fullMount);
                      drives.push({
                        name: sub,
                        label: sub,
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
        } catch {}
      }
    }
  } catch {}

  return drives;
}

/**
 * macOS: Scan /Volumes
 */
export function detectMacDrives() {
  const drives = [];
  try {
    const volumesDir = "/Volumes";
    if (!fs.existsSync(/*turbopackIgnore: true*/ volumesDir)) return drives;

    const entries = fs.readdirSync(/*turbopackIgnore: true*/ volumesDir);
    const rootDev = fs.existsSync("/") ? fs.statSync("/").dev : null;

    for (const entry of entries) {
      if (entry.startsWith(".")) continue;
      const fullPath = path.join(/*turbopackIgnore: true*/ volumesDir, entry);
      try {
        const stat = fs.statSync(/*turbopackIgnore: true*/ fullPath);
        if (!stat.isDirectory()) continue;
        if (rootDev && stat.dev === rootDev) continue;

        let info = "";
        try {
          info = execFileSync("diskutil", ["info", "-plist", fullPath], { encoding: "utf8", timeout: 2500 });
        } catch {}

        if (info) {
          // Reject internal fixed drives
          if (/<key>Internal<\/key>\s*<true\s*\/>/.test(info)) continue;
          // Reject disk images / virtual DMG images
          if (/<key>VirtualOrPhysical<\/key>\s*<string>Virtual<\/string>/.test(info)) continue;
        }

        const space = getDiskSpace(fullPath);
        const isWritable = isDirectoryWritable(fullPath);

        let fstype = "external";
        const fsMatch = info.match(/<key>FilesystemName<\/key>\s*<string>([^<]+)<\/string>/) ||
                        info.match(/<key>FilesystemType<\/key>\s*<string>([^<]+)<\/string>/);
        if (fsMatch && fsMatch[1]) fstype = fsMatch[1];

        let volName = entry;
        const nameMatch = info.match(/<key>VolumeName<\/key>\s*<string>([^<]+)<\/string>/);
        if (nameMatch && nameMatch[1]) volName = nameMatch[1];

        drives.push({
          name: entry,
          label: volName,
          mountPoint: fullPath,
          size: space?.totalFormatted || "External",
          fstype,
          isUsb: true,
          isRemovable: true,
          isWritable,
          freeBytes: space?.freeBytes ?? null,
          totalBytes: space?.totalBytes ?? null,
          freeFormatted: space?.freeFormatted ?? null,
          totalFormatted: space?.totalFormatted ?? null,
        });
      } catch {}
    }
  } catch {}
  return drives;
}

/**
 * Windows: USB disks and removable volumes only
 */
export function detectWindowsDrives() {
  const drives = [];
  try {
    const script = `
      $letters = @()
      try {
        Get-Disk | Where-Object { $_.BusType -eq 'USB' } | ForEach-Object {
          $diskNumber = $_.Number
          Get-Partition -DiskNumber $diskNumber -ErrorAction SilentlyContinue | Where-Object DriveLetter | ForEach-Object {
            $letters += [string]$_.DriveLetter
          }
        }
      } catch {}
      try {
        Get-CimInstance Win32_DiskDrive -ErrorAction SilentlyContinue | Where-Object { $_.InterfaceType -eq 'USB' } | ForEach-Object {
          Get-Partition -DiskNumber $_.Index -ErrorAction SilentlyContinue | Where-Object DriveLetter | ForEach-Object {
            $letters += [string]$_.DriveLetter
          }
        }
      } catch {}
      try {
        Get-Volume -ErrorAction SilentlyContinue | Where-Object { $_.DriveType -eq 'Removable' -and $_.DriveLetter } | ForEach-Object {
          $letters += [string]$_.DriveLetter
        }
      } catch {}
      $unique = @($letters | Select-Object -Unique | Where-Object { $_ -match '^[A-Za-z]$' })
      ConvertTo-Json -Compress -InputObject $unique
    `.replace(/\r?\n\s*/g, " ");

    const raw = execFileSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", script], { encoding: "utf8", timeout: 5000 });
    const parsed = JSON.parse(raw.trim() || "[]");
    const letters = Array.isArray(parsed) ? parsed : (parsed ? [parsed] : []);

    for (const driveLetter of letters) {
      if (!/^[A-Z]$/i.test(driveLetter)) continue;
      const letter = `${driveLetter.toUpperCase()}:\\`;
      try {
        if (fs.existsSync(/*turbopackIgnore: true*/ letter)) {
          const space = getDiskSpace(letter);
          const isWritable = isDirectoryWritable(letter);
          drives.push({
            name: letter,
            label: `Drive ${driveLetter.toUpperCase()}`,
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
  const rawConfiguredPath = process.env.EXTERNAL_BACKUP_PATH || null;

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
      configured: Boolean(rawConfiguredPath && rawConfiguredPath.trim()),
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
  const isConfigured = Boolean(rawConfiguredPath && rawConfiguredPath.trim());
  let configuredDrive = null;

  if (isConfigured) {
    const trimmed = rawConfiguredPath.trim();
    // Validate path against current OS (e.g. ignore Windows drive letter paths on POSIX systems)
    const isWindowsPathOnPosix = os.platform() !== "win32" && /^[A-Za-z]:/i.test(trimmed);
    if (!isWindowsPathOnPosix) {
      try {
        const resolved = path.resolve(/*turbopackIgnore: true*/ trimmed);
        const root = path.parse(resolved).root;

        if (fs.existsSync(/*turbopackIgnore: true*/ resolved)) {
          const stats = fs.statSync(/*turbopackIgnore: true*/ resolved);
          const requireMount = process.env.EXTERNAL_BACKUP_REQUIRE_MOUNT === "true" && os.platform() !== "win32";
          if (fs.existsSync(root) && stats.isDirectory() && (!requireMount || stats.dev !== fs.statSync(path.dirname(resolved)).dev)) {
            const isWritable = isDirectoryWritable(resolved);
            const space = getDiskSpace(resolved);
            let label = path.basename(resolved);
            if (os.platform() === "win32") {
              label = `Drive ${root.replace(/\\/g, "")}`;
            }

            configuredDrive = {
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
        }
      } catch {
        // Unreachable configured path
      }
    }
  }

  // If a valid configured path exists and is mounted/reachable, return it immediately
  if (configuredDrive) {
    return configuredDrive;
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
    const primary = detectedDrives.find((drive) => drive.isWritable) || detectedDrives[0];
    return {
      configured: isConfigured,
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
  const message = isConfigured
    ? `Configured external backup volume ("${rawConfiguredPath}") is unavailable or not mounted, and no physical USB drive was detected.`
    : "No external volume detected. Attach a physical USB storage drive or configure EXTERNAL_BACKUP_PATH.";

  return {
    configured: isConfigured,
    connected: false,
    path: null,
    mountPoint: null,
    label: null,
    isWritable: false,
    isRemovable: false,
    isEmulated: false,
    freeBytes: null,
    totalBytes: null,
    freeFormatted: null,
    totalFormatted: null,
    drives: [],
    message,
  };
}
