import { NextResponse } from "next/server";
import { exec } from "node:child_process";
import { promisify } from "node:util";
import fs from "node:fs";
import path from "node:path";

export const runtime = "nodejs";

const execAsync = promisify(exec);
const HEALTH_TTL_MS = 10000;
let healthCache = null;
let healthCacheAt = 0;

async function readCpuUsage() {
  try {
    const cpuCmd =
      "powershell -NoProfile -Command \"(Get-Counter '\\Processor(_Total)\\% Processor Time').CounterSamples.CookedValue\"";
    const { stdout } = await execAsync(cpuCmd, { timeout: 1200 });
    return Math.round(parseFloat(String(stdout).trim()) || 0);
  } catch {
    return 0;
  }
}

async function readDiskStats() {
  try {
    const diskCmd =
      "powershell -NoProfile -Command \"Get-Volume -DriveLetter C | Select-Object Size, SizeRemaining | ConvertTo-Json -Compress\"";
    const { stdout } = await execAsync(diskCmd, { timeout: 1200 });
    const diskResult = JSON.parse(String(stdout).trim() || "{}");
    const total = diskResult.Size || 1;
    const free = diskResult.SizeRemaining || 0;
    return {
      total: Math.round(total / 1024 ** 3),
      free: Math.round(free / 1024 ** 3),
      percent: Math.round(((total - free) / total) * 100),
    };
  } catch {
    return { total: 0, free: 0, percent: 0 };
  }
}

async function readDbSize() {
  try {
    const dbPath = path.join(process.cwd(), ".local", "db.sqlite");
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
