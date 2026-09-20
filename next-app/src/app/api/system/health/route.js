import { NextResponse } from "next/server";
import { exec, execFile } from "node:child_process";
import { promisify } from "node:util";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { query, queryOne } from "@/lib/postgres";
import { dbGet } from "@/lib/postgresCompat";

import { getHealthCache, setHealthCache, clearHealthCache } from "@/lib/healthCache";
import { requireAdmin, createAuthErrorResponse } from "../../../../lib/authHelpers";
import { decryptPII } from "@/lib/piiEncryption";

export const runtime = "nodejs";

const execAsync = promisify(exec);
const execFileAsync = promisify(execFile);
const HEALTH_TTL_MS = 15000;

export { clearHealthCache };

function getLocalDataRoot() {
  return process.env.LOCAL_DATA_DIR
    ? path.resolve(process.env.LOCAL_DATA_DIR)
    : path.join(process.cwd(), ".local");
}

let lastCpuSample = null;

function sampleCpu() {
  const cpus = os.cpus();
  let idle = 0;
  let total = 0;
  for (const cpu of cpus) {
    const t = cpu.times;
    idle += t.idle;
    total += t.user + t.nice + t.sys + t.idle + t.irq;
  }
  return { idle, total };
}

/** Cross-platform CPU %: instantaneous delta against previous sample, or short 50ms sample on cold start. */
async function readCpuUsage() {
  const current = sampleCpu();
  if (!lastCpuSample) {
    lastCpuSample = current;
    await new Promise((r) => setTimeout(r, 50));
    const next = sampleCpu();
    lastCpuSample = next;
    const idleDiff = next.idle - current.idle;
    const totalDiff = next.total - current.total;
    if (totalDiff <= 0) return 0;
    const pct = Math.round((100 * (totalDiff - idleDiff)) / totalDiff);
    return Math.max(0, Math.min(100, pct));
  }

  const prev = lastCpuSample;
  lastCpuSample = current;
  const idleDiff = current.idle - prev.idle;
  const totalDiff = current.total - prev.total;
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

async function readDbInfo() {
  const t0 = Date.now();
  try {
    const [sizeRow, verRow] = await Promise.all([
      dbGet("SELECT pg_database_size(current_database()) AS bytes"),
      dbGet("SELECT version() AS ver"),
    ]);
    const latencyMs = Math.max(1, Date.now() - t0);
    const bytes = Number(sizeRow?.bytes || 0);
    const dbSize = bytes > 1024 * 1024
      ? `${(bytes / (1024 * 1024)).toFixed(2)} MB`
      : `${(bytes / 1024).toFixed(2)} KB`;

    let dbEngine = "PostgreSQL";
    if (verRow?.ver) {
      const match = verRow.ver.match(/PostgreSQL\s+([\d.]+)/i);
      if (match) dbEngine = `PostgreSQL ${match[1]}`;
    }

    return { dbSize, dbEngine, dbStatus: "Healthy", latencyMs };
  } catch (err) {
    return { dbSize: "0 KB", dbEngine: "PostgreSQL", dbStatus: "Degraded", latencyMs: 12 };
  }
}

async function readDbSize() {
  try {
    const info = await readDbInfo();
    return info.dbSize;
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

async function getDirectoryStats(primaryPath, fallbackPaths = [], displayPath = "") {
  try {
    const seenFiles = new Set();
    let totalBytes = 0;
    let fileCount = 0;
    const allPaths = [primaryPath, ...(fallbackPaths || [])].filter(Boolean);

    for (const dirPath of allPaths) {
      try {
        const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });
        for (const entry of entries) {
          if (entry.isFile() && !seenFiles.has(entry.name)) {
            seenFiles.add(entry.name);
            fileCount++;
            try {
              const stat = await fs.promises.stat(path.join(dirPath, entry.name));
              totalBytes += stat.size;
            } catch {}
          }
        }
      } catch {}
    }
    const formatted = totalBytes > 1024 * 1024
      ? `${(totalBytes / (1024 * 1024)).toFixed(2)} MB`
      : `${(totalBytes / 1024).toFixed(1)} KB`;
    return {
      fileCount,
      totalBytes,
      formatted,
      path: displayPath || primaryPath,
    };
  } catch {
    return {
      fileCount: 0,
      totalBytes: 0,
      formatted: "0 KB",
      path: displayPath || primaryPath,
    };
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
          COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '24 hours')::int AS today,
          MAX(created_at) AS latest_at
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
    const latestAt = counts?.latest_at || null;

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
      latestAt,
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
      latestAt: null,
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
          COUNT(DISTINCT organization_name)::int AS total_orgs,
          MAX(created_at) AS latest_at
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
    const latestAt = counts?.latest_at || null;

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
      latestAt,
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
      latestAt: null,
      topOrganizations: [],
    };
  }
}

async function readStudentPortalStats() {
  try {
    const row = await queryOne(`
      SELECT 
        COUNT(*)::int AS total_accounts,
        COUNT(*) FILTER (WHERE status = 'Active')::int AS active_accounts,
        MAX(last_active) AS last_active_at,
        MAX(created_at) AS latest_registered_at
      FROM student_accounts
    `);
    const total = Number(row?.total_accounts || 0);
    const active = Number(row?.active_accounts || 0);
    return {
      status: active > 0 || total > 0 ? "Operational" : "Idle",
      totalAccounts: total,
      activeAccounts: active,
      lastActiveAt: row?.last_active_at || null,
      latestRegisteredAt: row?.latest_registered_at || null,
    };
  } catch (err) {
    console.error("[readStudentPortalStats Error]:", err);
    return {
      status: "Operational",
      totalAccounts: 0,
      activeAccounts: 0,
      lastActiveAt: null,
      latestRegisteredAt: null,
    };
  }
}

async function readOfficeModuleStatuses() {
  try {
    const rows = await query(`
      SELECT 
        o.id AS office_id,
        o.name AS office_name,
        o.short_name,
        o.status AS office_status,
        o.station_name,
        o.last_station_ping,
        COALESCE(bool_or(om.enabled) FILTER (WHERE om.module_id = 'document_requests'), false) AS odrs_enabled,
        COALESCE(bool_or(om.enabled) FILTER (WHERE om.module_id = 'osas_monitoring'), false) AS osas_enabled,
        COALESCE(bool_or(om.enabled) FILTER (WHERE om.module_id = 'records_review'), false) AS review_enabled
      FROM offices o
      LEFT JOIN office_modules om ON om.office_id = o.id
      GROUP BY o.id, o.name, o.short_name, o.status, o.station_name, o.last_station_ping
      ORDER BY o.created_at ASC
    `);
    return rows || [];
  } catch (err) {
    console.error("[readOfficeModuleStatuses Error]:", err);
    return [];
  }
}

async function readArchiveStats() {
  try {
    const [docRow, studentRow, backupRow] = await Promise.all([
      queryOne(`
        SELECT 
          COUNT(*)::int AS total_documents,
          COUNT(*) FILTER (WHERE approval_status = 'Approved')::int AS approved_documents,
          COUNT(*) FILTER (WHERE approval_status = 'Pending')::int AS pending_documents,
          MAX(created_at) AS latest_document_at
        FROM documents
      `),
      queryOne(`
        SELECT 
          COUNT(*)::int AS total_students,
          COUNT(*) FILTER (WHERE status = 'Active')::int AS active_students
        FROM students
      `),
      queryOne(`
        SELECT 
          COUNT(*)::int AS total_backups,
          MAX(created_at) AS last_backup_at,
          (SELECT filename FROM backups ORDER BY created_at DESC LIMIT 1) AS latest_filename,
          (SELECT status_local FROM backups ORDER BY created_at DESC LIMIT 1) AS latest_status
        FROM backups
      `),
    ]);

    return {
      totalDocuments: Number(docRow?.total_documents || 0),
      approvedDocuments: Number(docRow?.approved_documents || 0),
      pendingDocuments: Number(docRow?.pending_documents || 0),
      latestDocumentAt: docRow?.latest_document_at || null,
      totalStudents: Number(studentRow?.total_students || 0),
      activeStudents: Number(studentRow?.active_students || 0),
      totalBackups: Number(backupRow?.total_backups || 0),
      lastBackupAt: backupRow?.last_backup_at || null,
      latestBackupFilename: backupRow?.latest_filename || null,
      latestBackupStatus: backupRow?.latest_status || "Secure",
    };
  } catch (err) {
    console.error("[readArchiveStats Error]:", err);
    return {
      totalDocuments: 0,
      approvedDocuments: 0,
      pendingDocuments: 0,
      latestDocumentAt: null,
      totalStudents: 0,
      activeStudents: 0,
      totalBackups: 0,
      lastBackupAt: null,
      latestBackupFilename: null,
      latestBackupStatus: "Secure",
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
          COALESCE(dr.office_id, 'registrar') AS office_id,
          COALESCE(o.name, 'Office of the Registrar') AS office_name,
          dr.student_no,
          COALESCE(s.name, 'Student ' || dr.student_no) AS student_name,
          dr.doc_type AS title,
          NULL AS organization_name,
          dr.status,
          dr.notes,
          NULL AS original_filename,
          NULL::bigint AS size_bytes,
          NULL::date AS event_date,
          s.storage_room::text AS storage_room,
          s.storage_cabinet::text AS storage_cabinet,
          s.storage_drawer::text AS storage_drawer,
          dr.created_at
        FROM document_requests dr
        LEFT JOIN students s ON s.student_no = dr.student_no
        LEFT JOIN offices o ON o.id = dr.office_id
      )
      UNION ALL
      (
        SELECT 
          'prop-' || ep.id::text AS id,
          ep.id AS original_id,
          'event_proposal' AS type,
          COALESCE(ep.office_id, 'osas') AS office_id,
          COALESCE(o.name, 'Office of Student Affairs and Services') AS office_name,
          ep.student_no,
          COALESCE(s.name, 'Student ' || ep.student_no) AS student_name,
          ep.title,
          ep.organization_name,
          ep.status,
          ep.description AS notes,
          ep.original_filename,
          ep.size_bytes,
          ep.event_date,
          NULL::text AS storage_room,
          NULL::text AS storage_cabinet,
          NULL::text AS storage_drawer,
          ep.created_at
        FROM event_proposals ep
        LEFT JOIN students s ON s.student_no = ep.student_no
        LEFT JOIN offices o ON o.id = ep.office_id
      )
      ORDER BY created_at DESC
      LIMIT 25
    `);

    return rows.map((r) => {
      let resolvedName = r.student_name ? decryptPII(r.student_name) : null;
      if (!resolvedName || resolvedName.startsWith("enc:")) {
        resolvedName = r.student_no ? `Student ${r.student_no}` : "Student";
      }
      return {
        id: r.id,
        originalId: r.original_id,
        type: r.type,
        officeId: r.office_id,
        officeName: r.office_name,
        studentNo: r.student_no,
        studentName: resolvedName,
        title: r.title,
        organizationName: r.organization_name,
        status: r.status,
        notes: r.notes,
        originalFilename: r.original_filename,
        sizeBytes: r.size_bytes ? Number(r.size_bytes) : null,
        eventDate: r.event_date,
        storageRoom: r.storage_room,
        storageCabinet: r.storage_cabinet,
        storageDrawer: r.storage_drawer,
        createdAt: r.created_at,
      };
    });
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
    dbInfo,
    lastRestorationAt,
    odrs,
    osas,
    transactions,
    allOffices,
    studentPortal,
    officeModules,
    archiveStats,
  ] = await Promise.all([
    readCpuUsage(),
    readDiskStats(),
    readDbInfo(),
    readLastRestoration(),
    readOdrsStats(),
    readOsasStats(),
    readRecentTransactions(),
    query("SELECT id, name, short_name, storage_path FROM offices ORDER BY created_at ASC").catch(() => []),
    readStudentPortalStats(),
    readOfficeModuleStatuses(),
    readArchiveStats(),
  ]);

  const resolveAbs = (p) => {
    if (!p) return "";
    return path.isAbsolute(p) ? p : path.join(process.cwd(), p);
  };

  const officesList = allOffices && allOffices.length > 0 ? allOffices : [
    { id: "registrar", name: "Office of the Registrar", short_name: "Registrar", storage_path: ".local/storage/registrar/uploads" },
    { id: "osas", name: "Office of Student Affairs and Services", short_name: "OSAS", storage_path: ".local/storage/osas/uploads" },
  ];

  const volumes = await Promise.all(
    officesList.map(async (office) => {
      const defaultPartition = `.local/storage/${office.id}/uploads`;
      const configuredPath = office.storage_path || defaultPartition;
      const primary = resolveAbs(configuredPath);
      const fallbacks = [
        path.join(localRoot, "storage", office.id, "uploads"),
        office.id === "registrar" ? path.join(localRoot, "uploads") : null,
        office.id === "osas" ? path.join(localRoot, "osas", "uploads") : null,
      ].filter((p) => p && p !== primary);

      const stats = await getDirectoryStats(primary, fallbacks, configuredPath);
      return {
        id: office.id,
        name: office.name,
        shortName: office.short_name,
        volumeLabel: `${office.short_name || office.name} Volume`,
        ...stats,
      };
    })
  );

  const registrarVolume = volumes.find((v) => v.id === "registrar") || {
    fileCount: 0,
    totalBytes: 0,
    formatted: "0 KB",
    path: ".local/storage/registrar/uploads",
  };
  const osasVolume = volumes.find((v) => v.id === "osas") || {
    fileCount: 0,
    totalBytes: 0,
    formatted: "0 KB",
    path: ".local/storage/osas/uploads",
  };

  const totalFiles = volumes.reduce((sum, v) => sum + (v.fileCount || 0), 0);
  const totalBytes = volumes.reduce((sum, v) => sum + (v.totalBytes || 0), 0);
  const totalFormatted = totalBytes > 1024 * 1024
    ? `${(totalBytes / (1024 * 1024)).toFixed(2)} MB`
    : `${(totalBytes / 1024).toFixed(1)} KB`;

  // Read memory usage
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;
  const memPercent = Math.round((usedMem / totalMem) * 100);

  // Compute live departmental module and portal statuses from DB
  const regOffice = (officeModules || []).find((o) => o.office_id === "registrar") || {};
  const osasOffice = (officeModules || []).find((o) => o.office_id === "osas") || {};

  const isOdrsActive = (regOffice.office_status !== "Inactive") && (regOffice.odrs_enabled !== false);
  const isOsasActive = (osasOffice.office_status !== "Inactive") && (osasOffice.osas_enabled !== false);
  const isPortalActive = studentPortal.activeAccounts > 0 || studentPortal.totalAccounts > 0;
  const isArchiveActive = archiveStats.totalDocuments > 0 || archiveStats.totalStudents > 0;

  const servicesList = [
    { key: "portal", active: isPortalActive },
    { key: "odrs", active: isOdrsActive },
    { key: "osas", active: isOsasActive },
    { key: "archive", active: isArchiveActive },
  ];

  const activeServicesCount = servicesList.filter((s) => s.active).length;
  const totalServicesCount = servicesList.length;
  const allActive = activeServicesCount === totalServicesCount;

  const onlineServices = {
    allActive,
    activeCount: activeServicesCount,
    totalCount: totalServicesCount,
    studentPortal: {
      status: isPortalActive ? "Operational" : "Offline",
      totalAccounts: studentPortal.totalAccounts,
      activeAccounts: studentPortal.activeAccounts,
      lastActiveAt: studentPortal.lastActiveAt,
      latestRegisteredAt: studentPortal.latestRegisteredAt,
    },
    odrs: {
      status: !isOdrsActive ? "Offline" : odrs.status,
      enabled: isOdrsActive,
      officeStatus: regOffice.office_status || "Active",
      stationName: regOffice.station_name || "Registrar Terminal",
      lastStationPing: regOffice.last_station_ping || null,
      totalRequests: odrs.total,
      activeBacklog: odrs.activeBacklog,
      pending: odrs.pending,
      inProgress: odrs.inProgress,
      ready: odrs.ready,
      completed: odrs.completed,
      cancelled: odrs.cancelled,
      today: odrs.today,
      latestRequestAt: odrs.latestAt,
      topDocTypes: odrs.topDocTypes,
    },
    osas: {
      status: !isOsasActive ? "Offline" : osas.status,
      enabled: isOsasActive,
      officeStatus: osasOffice.office_status || "Active",
      stationName: osasOffice.station_name || "OSAS Terminal",
      lastStationPing: osasOffice.last_station_ping || null,
      totalProposals: osas.total,
      activePending: osas.activePending,
      submitted: osas.submitted,
      underReview: osas.underReview,
      needsRevision: osas.needsRevision,
      approved: osas.approved,
      declined: osas.declined,
      today: osas.today,
      totalOrgs: osas.totalOrgs,
      latestProposalAt: osas.latestAt,
      topOrganizations: osas.topOrganizations,
    },
    archive: {
      status: isArchiveActive ? "Operational" : "Idle",
      totalDocuments: archiveStats.totalDocuments,
      approvedDocuments: archiveStats.approvedDocuments,
      pendingDocuments: archiveStats.pendingDocuments,
      latestDocumentAt: archiveStats.latestDocumentAt,
      totalStudents: archiveStats.totalStudents,
      activeStudents: archiveStats.activeStudents,
      totalBackups: archiveStats.totalBackups,
      lastBackupAt: archiveStats.lastBackupAt,
      latestBackupFilename: archiveStats.latestBackupFilename,
      latestBackupStatus: archiveStats.latestBackupStatus,
    },
    lastVerifiedAt: new Date().toISOString(),
  };

  const services = {
    gateway: {
      name: "Institutional Online Gateway",
      status: "Operational",
      latencyMs: dbInfo.latencyMs,
    },
    odrs: { name: "Registrar Document Request Service", status: onlineServices.odrs.status, office: "Registrar" },
    osas: { name: "OSAS Student Org Proposal Gateway", status: onlineServices.osas.status, office: "OSAS" },
    studentPortal: { name: "Student Online Portal & Auth", status: onlineServices.studentPortal.status, office: "Campus-wide" },
    storage: { name: "Uploads & Artifact Subsystem", status: onlineServices.archive.status, office: "System-wide" },
    database: { name: `${dbInfo.dbEngine} Connection Pool`, status: dbInfo.dbStatus, office: "System-wide" },
  };

  const storage = {
    volumes,
    registrar: registrarVolume,
    osas: osasVolume,
    totalFiles,
    totalBytes,
    totalFormatted,
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
    dbSize: dbInfo.dbSize,
    dbEngine: dbInfo.dbEngine,
    dbStatus: dbInfo.dbStatus,
    lastRestorationAt,
    services,
    onlineServices,
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
    const access = await requireAdmin(req);
    if (access.error || !access.user) return createAuthErrorResponse(access.error || "Administrator access required", access.error?.startsWith("Access denied") ? 403 : 401);
    const url = new URL(req.url);
    const force = url.searchParams.get("force") === "true";
    const now = Date.now();
    const { healthCache, healthCacheAt } = getHealthCache();
    if (!force && healthCache && now - healthCacheAt < HEALTH_TTL_MS) {
      return NextResponse.json({ ok: true, data: healthCache });
    }
    const data = await buildHealthData();
    setHealthCache(data, now);

    return NextResponse.json({
      ok: true,
      data,
    });
  } catch (error) {
    console.error("[HealthAPI Error]:", error);
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}
