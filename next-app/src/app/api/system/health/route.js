import { NextResponse } from "next/server";
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

export const runtime = "nodejs";

export async function GET() {
  try {
    // 1. Get CPU Usage (Windows specific)
    let cpuUsage = 0;
    try {
      const cpuCmd = "powershell -NoProfile -Command \"(Get-Counter '\\Processor(_Total)\\% Processor Time').CounterSamples.CookedValue\"";
      const cpuResult = execSync(cpuCmd).toString().trim();
      cpuUsage = Math.round(parseFloat(cpuResult) || 0);
    } catch (e) {
      console.error("CPU Error:", e);
    }

    // 2. Get Disk Usage (C: drive where the app likely is)
    let diskStats = { total: 0, free: 0, percent: 0 };
    try {
      const diskCmd = "powershell -NoProfile -Command \"Get-Volume -DriveLetter C | Select-Object Size, SizeRemaining | ConvertTo-Json\"";
      const diskResult = JSON.parse(execSync(diskCmd).toString().trim());
      const total = diskResult.Size || 1;
      const free = diskResult.SizeRemaining || 0;
      diskStats = {
        total: Math.round(total / (1024 ** 3)), // GB
        free: Math.round(free / (1024 ** 3)), // GB
        percent: Math.round(((total - free) / total) * 100)
      };
    } catch (e) {
      console.error("Disk Error:", e);
    }

    // 3. Database Size
    let dbSize = "0 KB";
    try {
      const dbPath = path.join(process.cwd(), ".local", "db.sqlite");
      if (fs.existsSync(dbPath)) {
        const stats = fs.statSync(dbPath);
        if (stats.size > 1024 * 1024) {
          dbSize = (stats.size / (1024 * 1024)).toFixed(2) + " MB";
        } else {
          dbSize = (stats.size / 1024).toFixed(2) + " KB";
        }
      }
    } catch (e) {
      console.error("DB Error:", e);
    }

    return NextResponse.json({
      ok: true,
      data: {
        cpu: cpuUsage,
        disk: diskStats,
        dbSize: dbSize,
        dbStatus: "Healthy",
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
