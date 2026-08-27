import { NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import { closeAllOfficeDbs, getOfficeDb } from "@/lib/officeDb";
import { reloadSystemDb, getSystemDb } from "@/lib/systemDb";

export const runtime = "nodejs";

function getLocalDataRoot() {
  return process.env.LOCAL_DATA_DIR
    ? process.env.LOCAL_DATA_DIR
    : path.join(process.cwd(), ".local");
}

function deleteIfExists(filePath) {
  if (fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath);
      console.log(`[reset-db] Deleted: ${filePath}`);
    } catch (e) {
      console.warn(`[reset-db] Failed to delete: ${filePath}`, e.message);
    }
  }
}

function clearDir(dirPath) {
  if (fs.existsSync(dirPath)) {
    try {
      const files = fs.readdirSync(dirPath);
      for (const file of files) {
        fs.rmSync(path.join(dirPath, file), { recursive: true, force: true });
      }
      console.log(`[reset-db] Cleared directory: ${dirPath}`);
    } catch (e) {
      console.warn(`[reset-db] Failed to clear directory: ${dirPath}`, e.message);
    }
  }
}

export async function GET(req) {
  try {
    console.log("[reset-db] Starting database reset protocol...");

    // 1. Close all database connections
    closeAllOfficeDbs();
    reloadSystemDb();

    // 2. Resolve paths
    const localRoot = getLocalDataRoot();
    const systemDbPath = path.join(localRoot, "system.sqlite");

    // 3. Delete database files
    deleteIfExists(systemDbPath);
    deleteIfExists(`${systemDbPath}-wal`);
    deleteIfExists(`${systemDbPath}-shm`);

    const offices = ["registrar", "osas"];
    for (const office of offices) {
      const officeDbPath = path.join(localRoot, office, "db.sqlite");
      deleteIfExists(officeDbPath);
      deleteIfExists(`${officeDbPath}-wal`);
      deleteIfExists(`${officeDbPath}-shm`);

      // Clear uploads & backups
      clearDir(path.join(localRoot, office, "uploads"));
      clearDir(path.join(localRoot, office, "backups"));
    }

    // Clear legacy database if present
    deleteIfExists(path.join(localRoot, "db.sqlite"));
    deleteIfExists(path.join(localRoot, "db.sqlite-wal"));
    deleteIfExists(path.join(localRoot, "db.sqlite-shm"));
    clearDir(path.join(localRoot, "uploads"));

    // Reset rate limiter cache
    try {
      const { destroyRateLimiter } = await import("@/lib/rateLimiter");
      destroyRateLimiter();
    } catch (e) {
      console.warn("[reset-db] Rate limiter reset skipped:", e.message);
    }

    // 4. Bootstrap databases fresh
    console.log("[reset-db] Bootstrapping system database...");
    await getSystemDb();

    console.log("[reset-db] Bootstrapping office databases...");
    await getOfficeDb("registrar");
    await getOfficeDb("osas");

    const defaultPasswordForMessage = process.env.DEFAULT_STAFF_PASSWORD || "pupstaff";
    
    return NextResponse.json({
      ok: true,
      message: `All databases wiped, files cleared, and tables re-bootstrapped successfully. The default SystemAdmin account is: admin.default@pup.local / ${defaultPasswordForMessage}`
    });
  } catch (error) {
    console.error("[reset-db] Reset failed:", error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
