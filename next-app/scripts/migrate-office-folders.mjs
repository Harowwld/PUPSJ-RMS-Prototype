import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import dotenv from "dotenv";
import { Pool } from "pg";
import { getHotFolderRoot, getLocalDataDir, getOfficeHotFolderDirs, getOfficeUploadsDir } from "../src/lib/officePaths.js";

dotenv.config({ path: ".env" });

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
const apply = process.argv.includes("--confirm");
const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1 });

function savedPath(value) {
  return value ? path.resolve(String(value)) : null;
}

async function filesIn(directory) {
  try {
    return await fs.readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
}

async function checksum(filePath) {
  return crypto.createHash("sha256").update(await fs.readFile(filePath)).digest("hex");
}

async function copyFileVerified(from, to) {
  const expected = await checksum(from);
  try {
    const existing = await checksum(to);
    if (existing !== expected) throw new Error(`Conflicting destination file: ${to}`);
    return false;
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  await fs.mkdir(path.dirname(to), { recursive: true });
  const temp = `${to}.migrating-${process.pid}`;
  await fs.copyFile(from, temp);
  if (await checksum(temp) !== expected || await checksum(from) !== expected) {
    await fs.rm(temp, { force: true });
    throw new Error(`Source changed during migration: ${from}`);
  }
  await fs.rename(temp, to);
  return true;
}

async function copyVerified(source, destination) {
  if (!source || source === destination) return 0;
  const entries = await filesIn(source);
  if (!entries.length) return 0;
  await fs.mkdir(destination, { recursive: true });
  let copied = 0;
  for (const entry of entries) {
    if (entry.isDirectory() && !(await filesIn(path.join(source, entry.name))).length) continue;
    if (!entry.isFile()) throw new Error(`Cannot migrate non-file item in ${source}: ${entry.name}`);
    const from = path.join(source, entry.name);
    const to = path.join(destination, entry.name);
    if (await copyFileVerified(from, to)) copied++;
  }
  return copied;
}

try {
  const result = await pool.query("SELECT id, storage_path, inbound_path FROM offices ORDER BY id");
  const legacyShared = path.join(getHotFolderRoot(), "INBOUND");
  const plans = result.rows.map((office) => {
    const targetStorage = getOfficeUploadsDir(office.id);
    const targetInbound = getOfficeHotFolderDirs(office.id).inbound;
    const oldStorage = savedPath(office.storage_path);
    const oldInbound = savedPath(office.inbound_path);
    return {
      id: office.id,
      oldStorage,
      oldInbound,
      targetStorage,
      targetInbound,
      storageChanged: oldStorage !== targetStorage,
      inboundChanged: oldInbound !== targetInbound,
      sharedInbound: oldInbound === legacyShared,
    };
  });
  const pending = plans.filter((plan) => plan.storageChanged || plan.inboundChanged);
  for (const directory of [legacyShared, path.join(path.dirname(legacyShared), "PROCESSING")]) {
    const entries = await filesIn(directory);
    const pendingEntries = [];
    for (const entry of entries) {
      if (entry.isFile() || (entry.isDirectory() && (await filesIn(path.join(directory, entry.name))).length)) {
        pendingEntries.push(entry);
      }
    }
    if (pendingEntries.length) {
      throw new Error(`Shared scanner folder contains ${pendingEntries.length} file(s) or populated subfolder(s): ${directory}. Sort them into the correct office INBOUND folder before starting the watcher.`);
    }
  }
  const documentRows = await pool.query("SELECT office_id, storage_filename FROM documents ORDER BY office_id, id");
  const legacyUploads = path.join(getLocalDataDir(), "uploads");
  const legacyDocuments = [];
  for (const row of documentRows.rows) {
    if (!row.storage_filename || path.basename(row.storage_filename) !== row.storage_filename) {
      throw new Error(`Invalid stored document filename for office ${row.office_id}`);
    }
    const target = path.join(getOfficeUploadsDir(row.office_id), row.storage_filename);
    try {
      await fs.access(target);
    } catch {
      const plan = plans.find((item) => item.id === row.office_id);
      const candidates = [plan?.oldStorage, legacyUploads].filter(Boolean);
      let source = null;
      for (const directory of candidates) {
        const candidate = path.join(directory, row.storage_filename);
        try {
          await fs.access(candidate);
          source = candidate;
          break;
        } catch {}
      }
      if (source) legacyDocuments.push({ source, target });
      else {
        throw new Error(`Document file is missing for office ${row.office_id}; resolve this before migrating`);
      }
    }
  }
  const bylawsDir = path.join(getLocalDataDir(), "storage", "osas", "bylaws");
  const bylawsRows = await pool.query("SELECT storage_filename FROM organization_bylaws_versions");
  const legacyBylaws = [];
  for (const row of bylawsRows.rows) {
    const filename = row.storage_filename;
    if (!filename || path.basename(filename) !== filename) throw new Error("Invalid bylaws filename in database");
    const target = path.join(bylawsDir, filename);
    try {
      await fs.access(target);
    } catch {
      const candidates = [
        path.join(getLocalDataDir(), "osas", "bylaws", filename),
        path.join(getOfficeUploadsDir("osas"), filename),
      ];
      let source = null;
      for (const candidate of candidates) {
        try {
          await fs.access(candidate);
          source = candidate;
          break;
        } catch {}
      }
      if (!source) throw new Error(`OSAS bylaws file is missing: ${filename}`);
      legacyBylaws.push({ source, target });
    }
  }
  if (!pending.length && !legacyDocuments.length && !legacyBylaws.length) {
    console.log("[office-folders] All offices use fixed local paths.");
  } else if (!apply) {
    for (const plan of pending) console.log(`[office-folders] ${plan.id}: path migration required`);
    if (legacyDocuments.length) console.log(`[office-folders] ${legacyDocuments.length} referenced document files require verified legacy copies`);
    if (legacyBylaws.length) console.log(`[office-folders] ${legacyBylaws.length} referenced OSAS bylaws files require verified legacy copies`);
    console.error("[office-folders] Stop scanner output, then run: node scripts/migrate-office-folders.mjs --confirm");
    process.exitCode = 1;
  } else {
    for (const plan of pending) {
      const oldProcessing = plan.oldInbound && path.join(path.dirname(plan.oldInbound), "PROCESSING");
      if (plan.inboundChanged && oldProcessing && !plan.sharedInbound && (await filesIn(oldProcessing)).length) {
        throw new Error(`${plan.id}: finish files in ${oldProcessing} before migrating`);
      }
      const storageCount = await copyVerified(plan.oldStorage, plan.targetStorage);
      const inboundCount = plan.sharedInbound ? 0 : await copyVerified(plan.oldInbound, plan.targetInbound);
      await pool.query(
        "UPDATE offices SET storage_path = $1, inbound_path = $2, updated_at = NOW() WHERE id = $3",
        [plan.targetStorage, plan.targetInbound, plan.id],
      );
      console.log(`[office-folders] ${plan.id}: verified ${storageCount} storage and ${inboundCount} inbound file copies`);
    }
    let copiedLegacyDocuments = 0;
    for (const file of legacyDocuments) {
      if (await copyFileVerified(file.source, file.target)) copiedLegacyDocuments++;
    }
    let copiedBylaws = 0;
    for (const file of legacyBylaws) {
      if (await copyFileVerified(file.source, file.target)) copiedBylaws++;
    }
    console.log(`[office-folders] Verified ${copiedLegacyDocuments} referenced legacy document copies`);
    console.log(`[office-folders] Verified ${copiedBylaws} referenced OSAS bylaws copies`);
    console.log("[office-folders] Configure scanner profiles to save into each office's new INBOUND folder. Old files were retained.");
  }
} finally {
  await pool.end();
}
