import { NextResponse } from "next/server";
import { exec, execFile } from "node:child_process";
import { promisify } from "node:util";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

export const runtime = "nodejs";

const execAsync = promisify(exec);
const execFileAsync = promisify(execFile);
const HEALTH_TTL_MS = 10000;
let healthCache = null;
let healthCacheAt = 0;

function getLocalDataRoot() {
  return process.env.LOCAL_DATA_DIR
    ? path.resolve(process.env.LOCAL_DATA_DIR)
    : path.join(process.cwd(), ".local");
}

/** Cross-platform CPU %: delta of idle vs total ticks between two samples (~250ms). */
async function readCpuUsage() {
  const sample = () => {
    const cpus = os.cpus();
    let idle = 0;
    let total = 0;
    for (const cpu of cpus) {
      const t = cpu.times;
      idle += t.idle;
      total += t.user + t.nice + t.sys + t.idle + t.irq;
    }
    return { idle, total };
  };
  const a = sample();
  await new Promise((r) => setTimeout(r, 250));
  const b = sample();
  const idleDiff = b.idle - a.idle;
  const totalDiff = b.total - a.total;
  if (totalDiff <= 0) return 0;
  const pct = Math.round((100 * (totalDiff - idleDiff)) / totalDiff);
  return Math.max(0, Math.min(100, pct));
}

function gbFromBytes(bytes) {
  return bytes / 1024 ** 3;
}

async function readDiskStatsStatfs(localRoot) {
  const fn = fs.promises.statfs;
  if (typeof fn !== "function") return null;
  try {
    await fs.promises.mkdir(localRoot, { recursive: true });
    const s = await fn(localRoot);
    const bsize = Number(s.bsize);
    const blocks = Number(s.blocks);
    const bavail = Number(s.bavail);
    const bfree = Number(s.bfree);
    const freeBlocks = Number.isFinite(bavail) && bavail > 0 ? bavail : bfree;
    const totalBytes = blocks * bsize;
    const freeBytes = freeBlocks * bsize;
    if (!Number.isFinite(totalBytes) || totalBytes <= 0) return null;
    const totalGb = roundGbFromFloat(gbFromBytes(totalBytes));
    const freeGb = roundGbFromFloat(gbFromBytes(freeBytes));
    const usedBytes = totalBytes - freeBytes;
    const percent = Math.min(
      100,
      Math.max(0, Math.round((usedBytes / totalBytes) * 100)),
    );
    return { total: totalGb, free: freeGb, percent };
  } catch {
    return null;
  }
}

function roundGbFromFloat(gb) {
  if (!Number.isFinite(gb) || gb < 0) return 0;
  return Math.max(0, Math.round(gb));
}

async function readDiskStatsDf(localRoot) {
  if (os.platform() === "win32") return null;
  try {
    const quoted = localRoot.replace(/'/g, `'\\''`);
    const { stdout } = await execAsync(`df -Pk '${quoted}'`, { timeout: 2500 });
    const lines = String(stdout).trim().split(/\r?\n/).filter(Boolean);
    if (lines.length < 2) return null;
    const parts = lines[lines.length - 1].split(/\s+/).filter(Boolean);
    if (parts.length < 4) return null;
    const totalKb = parseInt(parts[1], 10);
    const availKb = parseInt(parts[3], 10);
    if (!Number.isFinite(totalKb) || totalKb <= 0) return null;
    const totalBytes = totalKb * 1024;
    const freeBytes = availKb * 1024;
    const totalGb = roundGbFromFloat(gbFromBytes(totalBytes));
    const freeGb = roundGbFromFloat(gbFromBytes(freeBytes));
    const percent = Math.min(
      100,
      Math.max(0, Math.round(((totalBytes - freeBytes) / totalBytes) * 100)),
    );
    return { total: totalGb, free: freeGb, percent };
  } catch {
    return null;
  }
}

/** Windows: volume that contains LOCAL_DATA_DIR / .local via PSDrive (avoids wrong drive letter). */
async function readDiskStatsWinPs(localRoot) {
  if (os.platform() !== "win32") return null;
  try {
    await fs.promises.mkdir(localRoot, { recursive: true });
    const abs = path.resolve(localRoot);
    const escaped = abs.replace(/'/g, "''");
    const script = [
      "$ErrorActionPreference = 'Stop'",
      `$p = '${escaped}'`,
      `$i = Get-Item -LiteralPath $p`,
      `$d = $i.PSDrive.Name`,
      `$dr = Get-PSDrive -Name $d`,
      "$total = [int64]$dr.Used + [int64]$dr.Free",
      "$free = [int64]$dr.Free",
      "@{ Size = $total; SizeRemaining = $free } | ConvertTo-Json -Compress",
    ].join("; ");
    const { stdout } = await execFileAsync(
      "powershell.exe",
      ["-NoProfile", "-NonInteractive", "-Command", script],
      { timeout: 5000, windowsHide: true, encoding: "utf8" },
    );
    const diskResult = JSON.parse(String(stdout).trim() || "{}");
    const total = Number(diskResult.Size) || 0;
    const free = Number(diskResult.SizeRemaining) || 0;
    if (total <= 0) return null;
    const totalGb = roundGbFromFloat(gbFromBytes(total));
    const freeGb = roundGbFromFloat(gbFromBytes(free));
    const percent = Math.min(
      100,
      Math.max(0, Math.round(((total - free) / total) * 100)),
    );
    return { total: totalGb, free: freeGb, percent };
  } catch {
    return null;
  }
}

async function readDiskStats() {
  const localRoot = getLocalDataRoot();
  const tryOrder = [
    () => readDiskStatsStatfs(localRoot),
    () => readDiskStatsWinPs(localRoot),
    () => readDiskStatsDf(localRoot),
  ];
  for (const fn of tryOrder) {
    try {
      const r = await fn();
      if (r && r.total > 0) return r;
    } catch {
      /* next */
    }
  }
  return { total: 0, free: 0, percent: 0 };
}

async function readDbSize() {
  try {
    const dbPath = path.join(getLocalDataRoot(), "db.sqlite");
    const stats = await fs.promises.stat(dbPath);
    if (stats.size > 1024 * 1024) {
      return `${(stats.size / (1024 * 1024)).toFixed(2)} MB`;
    }
    return `${(stats.size / 1024).toFixed(2)} KB`;
  } catch {
    return "0 KB";
  }
}

async function buildHealthData() {
  const [cpu, disk, dbSize] = await Promise.all([
    readCpuUsage(),
    readDiskStats(),
    readDbSize(),
  ]);
  return {
    cpu,
    disk,
    dbSize,
    dbStatus: "Healthy",
    timestamp: new Date().toISOString(),
  };
}

export async function GET() {
  try {
    const now = Date.now();
    if (healthCache && now - healthCacheAt < HEALTH_TTL_MS) {
      return NextResponse.json({ ok: true, data: healthCache });
    }
    const data = await buildHealthData();
    healthCache = data;
    healthCacheAt = now;

    return NextResponse.json({
      ok: true,
      data,
    });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
