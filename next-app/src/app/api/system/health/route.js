import { NextResponse } from "next/server";
import { exec, execFile } from "node:child_process";
import { promisify } from "node:util";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { query, queryOne } from "@/lib/postgres";
import { dbGet } from "@/lib/postgresCompat";

export const runtime = "nodejs";

const execAsync = promisify(exec);
const execFileAsync = promisify(execFile);
const HEALTH_TTL_MS = 5000;
let healthCache = null;
let healthCacheAt = 0;

export function clearHealthCache() {
  healthCache = null;
  healthCacheAt = 0;
}

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
    const row = await dbGet("SELECT pg_database_size(current_database()) AS bytes");
    const bytes = Number(row?.bytes || 0);
    return bytes > 1024 * 1024
      ? `${(bytes / (1024 * 1024)).toFixed(2)} MB`
      : `${(bytes / 1024).toFixed(2)} KB`;
  } catch {
    return "0 KB";
  }
}

async function readLastRestoration() {
  try {
    const res = await dbGet("SELECT value FROM settings WHERE key = 'last_restoration_at'");
    return res?.value || null;
  } catch {
    return null;
  }
}

async function getDirectoryStats(dirPath) {
  try {
    const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });
    let totalBytes = 0;
    let fileCount = 0;
    for (const entry of entries) {
      if (entry.isFile()) {
        fileCount++;
        try {
          const stat = await fs.promises.stat(path.join(dirPath, entry.name));
          totalBytes += stat.size;
        } catch {}
      }
    }
    const formatted = totalBytes > 1024 * 1024
      ? `${(totalBytes / (1024 * 1024)).toFixed(2)} MB`
      : `${(totalBytes / 1024).toFixed(1)} KB`;
    return { fileCount, totalBytes, formatted };
  } catch {
    return { fileCount: 0, totalBytes: 0, formatted: "0 KB" };
  }
}

async function readOdrsStats() {
  try {
    const [counts, topTypes] = await Promise.all([
      queryOne(`
        SELECT 
          COUNT(*)::int AS total,
          COUNT(*) FILTER (WHERE status = 'Pending')::int AS pending,
          COUNT(*) FILTER (WHERE status = 'InProgress')::int AS in_progress,
          COUNT(*) FILTER (WHERE status = 'Ready')::int AS ready,
          COUNT(*) FILTER (WHERE status = 'Completed')::int AS completed,
          COUNT(*) FILTER (WHERE status = 'Cancelled')::int AS cancelled,
          COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '24 hours')::int AS today
        FROM document_requests
      `),
      query(`
        SELECT doc_type, COUNT(*)::int AS count
        FROM document_requests
        GROUP BY doc_type
        ORDER BY count DESC
        LIMIT 5
      `),
    ]);

    const total = Number(counts?.total || 0);
    const pending = Number(counts?.pending || 0);
    const inProgress = Number(counts?.in_progress || 0);
    const ready = Number(counts?.ready || 0);
    const completed = Number(counts?.completed || 0);
    const cancelled = Number(counts?.cancelled || 0);
    const today = Number(counts?.today || 0);

    return {
      status: "Operational",
      total,
      pending,
      inProgress,
      ready,
      completed,
      cancelled,
      today,
      activeBacklog: pending + inProgress,
      topDocTypes: topTypes || [],
    };
  } catch (err) {
    console.error("[readOdrsStats Error]:", err);
    return {
      status: "Degraded",
      total: 0,
      pending: 0,
      inProgress: 0,
      ready: 0,
      completed: 0,
      cancelled: 0,
      today: 0,
      activeBacklog: 0,
      topDocTypes: [],
    };
  }
}

async function readOsasStats() {
  try {
    const [counts, topOrgs] = await Promise.all([
      queryOne(`
        SELECT 
          COUNT(*)::int AS total,
          COUNT(*) FILTER (WHERE status = 'Submitted')::int AS submitted,
          COUNT(*) FILTER (WHERE status = 'Under Review')::int AS under_review,
          COUNT(*) FILTER (WHERE status = 'Needs Revision')::int AS needs_revision,
          COUNT(*) FILTER (WHERE status = 'Approved')::int AS approved,
          COUNT(*) FILTER (WHERE status = 'Declined')::int AS declined,
          COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '24 hours')::int AS today,
          COUNT(DISTINCT organization_name)::int AS total_orgs
        FROM event_proposals
      `),
      query(`
        SELECT organization_name, COUNT(*)::int AS count
        FROM event_proposals
        GROUP BY organization_name
        ORDER BY count DESC
        LIMIT 5
      `),
    ]);

    const total = Number(counts?.total || 0);
    const submitted = Number(counts?.submitted || 0);
    const underReview = Number(counts?.under_review || 0);
    const needsRevision = Number(counts?.needs_revision || 0);
    const approved = Number(counts?.approved || 0);
    const declined = Number(counts?.declined || 0);
    const today = Number(counts?.today || 0);
    const totalOrgs = Number(counts?.total_orgs || 0);

    return {
      status: "Operational",
      total,
      submitted,
      underReview,
      needsRevision,
      approved,
      declined,
      today,
      activePending: submitted + underReview + needsRevision,
      totalOrgs,
      topOrganizations: topOrgs || [],
    };
  } catch (err) {
    console.error("[readOsasStats Error]:", err);
    return {
      status: "Degraded",
      total: 0,
      submitted: 0,
      underReview: 0,
      needsRevision: 0,
      approved: 0,
      declined: 0,
      today: 0,
      activePending: 0,
      totalOrgs: 0,
      topOrganizations: [],
    };
  }
}

async function readRecentTransactions() {
  try {
    const rows = await query(`
      (
        SELECT 
          'req-' || dr.id::text AS id,
          dr.id AS original_id,
          'document_request' AS type,
          'registrar' AS office_id,
          dr.student_no,
          COALESCE(s.name, 'Student ' || dr.student_no) AS student_name,
          dr.doc_type AS title,
          NULL AS organization_name,
          dr.status,
          dr.notes,
          NULL AS original_filename,
          NULL::bigint AS size_bytes,
          NULL::date AS event_date,
          dr.created_at
        FROM document_requests dr
        LEFT JOIN students s ON s.student_no = dr.student_no
      )
      UNION ALL
      (
        SELECT 
          'prop-' || ep.id::text AS id,
          ep.id AS original_id,
          'event_proposal' AS type,
          'osas' AS office_id,
          ep.student_no,
          COALESCE(s.name, 'Student ' || ep.student_no) AS student_name,
          ep.title,
          ep.organization_name,
          ep.status,
          ep.description AS notes,
          ep.original_filename,
          ep.size_bytes,
          ep.event_date,
          ep.created_at
        FROM event_proposals ep
        LEFT JOIN students s ON s.student_no = ep.student_no
      )
      ORDER BY created_at DESC
      LIMIT 25
    `);

    return rows.map((r) => ({
      id: r.id,
      originalId: r.original_id,
      type: r.type,
      officeId: r.office_id,
      studentNo: r.student_no,
      studentName: r.student_name,
      title: r.title,
      organizationName: r.organization_name,
      status: r.status,
      notes: r.notes,
      originalFilename: r.original_filename,
      sizeBytes: r.size_bytes ? Number(r.size_bytes) : null,
      eventDate: r.event_date,
      createdAt: r.created_at,
    }));
  } catch (err) {
    console.error("[readRecentTransactions Error]:", err);
    return [];
  }
}

async function buildHealthData() {
  const localRoot = getLocalDataRoot();
  const [
    cpu,
    disk,
    dbSize,
    lastRestorationAt,
    odrs,
    osas,
    transactions,
    registrarStorage,
    osasStorage,
  ] = await Promise.all([
    readCpuUsage(),
    readDiskStats(),
    readDbSize(),
    readLastRestoration(),
    readOdrsStats(),
    readOsasStats(),
    readRecentTransactions(),
    getDirectoryStats(path.join(localRoot, "uploads")),
    getDirectoryStats(path.join(localRoot, "osas", "uploads")),
  ]);

  // Read memory usage
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;
  const memPercent = Math.round((usedMem / totalMem) * 100);

  const services = {
    gateway: { name: "Institutional Online Gateway", status: "Operational", latencyMs: 14 },
    odrs: { name: "Registrar Document Request Service", status: odrs.status, office: "Registrar" },
    osas: { name: "OSAS Student Org Proposal Gateway", status: osas.status, office: "OSAS" },
    studentPortal: { name: "Student Online Portal & Auth", status: "Operational", office: "Campus-wide" },
    storage: { name: "Uploads & Artifact Subsystem", status: "Operational", office: "System-wide" },
    database: { name: "PostgreSQL Database Pool", status: "Operational", office: "System-wide" },
  };

  const storage = {
    registrar: registrarStorage,
    osas: osasStorage,
    totalFiles: registrarStorage.fileCount + osasStorage.fileCount,
    totalBytes: registrarStorage.totalBytes + osasStorage.totalBytes,
    totalFormatted: (registrarStorage.totalBytes + osasStorage.totalBytes) > 1024 * 1024
      ? `${((registrarStorage.totalBytes + osasStorage.totalBytes) / (1024 * 1024)).toFixed(2)} MB`
      : `${((registrarStorage.totalBytes + osasStorage.totalBytes) / 1024).toFixed(1)} KB`,
  };

  return {
    cpu,
    memory: {
      percent: memPercent,
      total: Math.round(totalMem / 1024 ** 3),
      used: Math.round(usedMem / 1024 ** 3),
      free: Math.round(freeMem / 1024 ** 3),
    },
    disk,
    dbSize,
    lastRestorationAt,
    dbStatus: "Healthy",
    services,
    odrs,
    osas,
    transactions,
    storage,
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  };
}

export async function GET(req) {
  try {
    const url = new URL(req.url);
    const force = url.searchParams.get("force") === "true";
    const now = Date.now();
    if (!force && healthCache && now - healthCacheAt < HEALTH_TTL_MS) {
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
    console.error("[HealthAPI Error]:", error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
