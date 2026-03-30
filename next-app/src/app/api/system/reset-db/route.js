import { NextResponse } from "next/server";
import { getDb } from "../../../../lib/sqlite";
import fs from "node:fs";
import path from "node:path";
import { writeAuditLog } from "../../../../lib/auditLogRequest";
import { buildDefaultStorageLayout } from "../../../../lib/storageLayoutDefaults";
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
      "document_types"
    ];

    for (const table of tables) {
      try {
        db.exec(`DELETE FROM ${table};`);
        db.exec(`DELETE FROM sqlite_sequence WHERE name = '${table}';`);
      } catch (e) {
        console.error(`Error clearing table ${table}:`, e);
      }
    }

    // Seed default document types
    const defaults = [
      "Form 137", "Transcript of Records", "Good Moral Certificate",
      "Diploma", "Honorable Dismissal", "Medical Certificate", "Birth Certificate"
    ];
    for (const name of defaults) {
      const nameNorm = name.trim().toLowerCase().replace(/\s+/g, " ");
      db.exec(`INSERT INTO document_types (name, name_norm) VALUES ('${name.replace(/'/g, "''")}', '${nameNorm.replace(/'/g, "''")}')`);
    }

    // Set schema version back to 1
    db.exec("INSERT OR REPLACE INTO settings (key, value) VALUES ('schema_version', '1')");

    // Seed default storage layout (SLV)
    try {
      const layout = buildDefaultStorageLayout();
      const json = JSON.stringify(layout).replace(/'/g, "''");
      db.exec(
        `INSERT OR REPLACE INTO settings (key, value) VALUES ('storage_layout', '${json}')`
      );
    } catch (e) {
      // If defaults fail for any reason, still allow reset to succeed.
      console.error("Failed to seed storage_layout defaults:", e?.message || e);
    }

    // Seed default Admin staff account (bootstrap)
    try {
      const id = "admin.eli@pup.local";
      const fname = "System";
      const lname = "Administrator";
      const role = "Admin";
      const section = "Administrative";
      const status = "Active";
      const email = "admin.eli@pup.local";
      const passwordHash = hashPasswordForStorage("pupstaff").replace(/'/g, "''");
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

    await writeAuditLog(req, "Reset database and cleared uploads");
    return NextResponse.json({
      ok: true,
      message: "Database wiped and physical uploads cleared successfully. Please RESTART your Next.js server now."
    });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
