import { NextResponse } from "next/server";
import { getDb, DEFAULT_SECURITY_QUESTIONS } from "../../../../lib/sqlite";
import fs from "node:fs";
import path from "node:path";
import { hashPasswordForStorage } from "../../../../lib/staffRepo";

export const runtime = "nodejs";

export async function GET(req) {
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
      "security_questions",
      "rate_limit_hits",
      "rate_limit_violations"
    ];

    for (const table of tables) {
      try {
        db.exec(`DELETE FROM ${table};`);
        db.exec(`DELETE FROM sqlite_sequence WHERE name = '${table}';`);
      } catch (e) {
        console.error(`Error clearing table ${table}:`, e);
      }
    }

    // Reset the in-memory rate limiter cache
    try {
      const { destroyRateLimiter } = await import("../../../../lib/rateLimiter");
      destroyRateLimiter();
    } catch (limiterErr) {
      console.error("Failed to destroy rate limiter:", limiterErr);
    }

    // Set schema version back to current (14) so migrations don't re-run and cause double seeding
    db.exec("INSERT OR REPLACE INTO settings (key, value) VALUES ('schema_version', '14')");

    // Seed default Admin staff account (bootstrap)
    try {
      const id = "PUPREGISTRAR-001";
      const fname = "Elias";
      const lname = "Austria";
      const role = "Admin";
      const section = "Administrative";
      const status = "Active";
      const email = "admin.default@pup.local";
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
      DEFAULT_SECURITY_QUESTIONS.forEach((q, i) => {
        const isRequired = i < 2 ? 1 : 0;
        db.exec(`INSERT INTO security_questions (question, is_required) VALUES ('${q.replace(/'/g, "''")}', ${isRequired})`);
      });
    } catch (e) {
      console.error("Failed to seed default security questions:", e?.message || e);
    }

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
      message: `Database wiped and physical uploads cleared successfully. Please RESTART your Next.js server now. The default admin account is: admin.default@pup.local / ${defaultPasswordForMessage}`
    });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
