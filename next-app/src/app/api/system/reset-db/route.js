import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getDb, DEFAULT_SECURITY_QUESTIONS } from "../../../../lib/sqlite";
import fs from "node:fs";
import path from "node:path";
import { buildDefaultStorageLayout } from "../../../../lib/storageLayoutDefaults";
import { hashPasswordForStorage } from "../../../../lib/staffRepo";
import { getSessionCookieName, verifySessionToken } from "../../../../lib/jwt";
import { requireTOTP, extractTOTPToken } from "../../../../lib/totpMiddleware";

export const runtime = "nodejs";

export async function GET(req) {
  const store = await cookies();
  const token = store.get(getSessionCookieName())?.value || "";
  let userId = null;
  if (token) {
    try {
      const payload = await verifySessionToken(token);
      userId = payload?.sub;
    } catch {}
  }

  const totpToken = extractTOTPToken(req.headers);
  const totpResult = await requireTOTP(userId, totpToken);
  if (!totpResult.valid) {
    return NextResponse.json(
      { ok: false, error: "TOTP verification required: " + totpResult.error, requiresTOTP: true },
      { status: 403 }
    );
  }

  try {
    const db = await getDb();

    // Disable foreign keys for bulk deletion
    db.exec("PRAGMA foreign_keys = OFF;");

    const tables = [
      "documents",
      "students",
      "staff",
      "audit_logs",
      "backups",
      "settings",
      "document_types",
      "courses",
      "sections",
      "document_requests",
      "staff_security_answers",
      "security_questions"
    ];

    for (const table of tables) {
      try {
        db.exec(`DELETE FROM ${table};`);
        db.exec(`DELETE FROM sqlite_sequence WHERE name = '${table}';`);
      } catch (e) {
        console.error(`Error clearing table ${table}:`, e);
      }
    }

    // Set schema version back to current (8) so migrations don't re-run and cause double seeding
    db.exec("INSERT OR REPLACE INTO settings (key, value) VALUES ('schema_version', '8')");

    // Seed default Admin staff account (bootstrap)
    try {
      const id = "PUPREGISTRAR-001";
      const fname = "Elias";
      const lname = "Austria";
      const role = "Admin";
      const section = "Administrative";
      const status = "Active";
      const email = "admin.eli@pup.local";
      const defaultPassword = process.env.DEFAULT_STAFF_PASSWORD || "pupstaff";
      const passwordHash = hashPasswordForStorage(defaultPassword).replace(/'/g, "''");
      const idEsc = id.replace(/'/g, "''");
      const fnameEsc = fname.replace(/'/g, "''");
      const lnameEsc = lname.replace(/'/g, "''");
      const roleEsc = role.replace(/'/g, "''");
      const sectionEsc = section.replace(/'/g, "''");
      const statusEsc = status.replace(/'/g, "''");
      const emailEsc = email.replace(/'/g, "''");

      db.exec(`
        INSERT INTO staff (
          id, fname, lname, role, section, status, email, last_active, password_hash, updated_at
        ) VALUES (
          '${idEsc}',
          '${fnameEsc}',
          '${lnameEsc}',
          '${roleEsc}',
          '${sectionEsc}',
          '${statusEsc}',
          '${emailEsc}',
          datetime('now'),
          '${passwordHash}',
          datetime('now')
        );
      `);
    } catch (e) {
      console.error("Failed to seed admin staff account:", e?.message || e);
    }

    // Seed default security questions
    try {
      for (const q of DEFAULT_SECURITY_QUESTIONS) {
        db.exec(`INSERT INTO security_questions (question) VALUES ('${q.replace(/'/g, "''")}')`);
      }
    } catch (e) {
      console.error("Failed to seed default security questions:", e?.message || e);
    }

    // Export and persist the empty database
    const bytes = db.export();
    const dbPath = path.join(process.cwd(), ".local", "db.sqlite");
    fs.writeFileSync(dbPath, Buffer.from(bytes));

    // Clear physical files again just in case
    const uploadsDir = path.join(process.cwd(), ".local", "uploads");
    if (fs.existsSync(uploadsDir)) {
      const files = fs.readdirSync(uploadsDir);
      for (const file of files) {
        fs.unlinkSync(path.join(uploadsDir, file));
      }
    }

    const defaultPasswordForMessage = process.env.DEFAULT_STAFF_PASSWORD || "pupstaff";
    return NextResponse.json({
      ok: true,
      message: `Database wiped and physical uploads cleared successfully. Please RESTART your Next.js server now. The default admin account is: admin.eli@pup.local / ${defaultPasswordForMessage}`
    });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
