import { NextResponse } from "next/server";
import { getDb } from "../../../../lib/sqlite";
import fs from "node:fs";
import path from "node:path";

export const runtime = "nodejs";

export async function GET() {
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

    return NextResponse.json({
      ok: true,
      message: "Database wiped and physical uploads cleared successfully. Please RESTART your Next.js server now."
    });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
