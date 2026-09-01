import dotenv from "dotenv";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import Database from "better-sqlite3";

dotenv.config({ path: ".env.local" });
dotenv.config();

const args = new Set(process.argv.slice(2));
const option = name => {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : null;
};
const dataDir = path.resolve(option("--source") || process.env.LOCAL_DATA_DIR || ".local");
const reportPath = path.resolve(option("--report") || path.join(dataDir, "migration-reports", `sqlite-to-postgres-${new Date().toISOString().replaceAll(":", "-")}.json`));
const dryRun = args.has("--dry-run");

if (!process.env.DATABASE_URL && !dryRun) throw new Error("DATABASE_URL is required unless --dry-run is used.");
const { pool } = dryRun ? { pool: null } : await import("../src/lib/postgres.js");

const report = { source: dataDir, dryRun, startedAt: new Date().toISOString(), tables: {}, conflicts: [], warnings: [] };
const count = (name, amount = 1) => { report.tables[name] = (report.tables[name] || 0) + amount; };
const normalizeName = value => String(value || "").trim().replace(/\s+/g, " ").toLocaleLowerCase();
const tableExists = (db, table) => !!db.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?").get(table);
const rows = (db, table) => tableExists(db, table) ? db.prepare(`SELECT * FROM ${table}`).all() : [];
const sourceDb = file => fs.existsSync(file) ? new Database(file, { readonly: true }) : null;

const system = sourceDb(path.join(dataDir, "system.sqlite"));
const registrar = sourceDb(path.join(dataDir, "registrar", "db.sqlite"));
const osas = sourceDb(path.join(dataDir, "osas", "db.sqlite"));
if (!system && !registrar && !osas) throw new Error(`No SQLite files found under ${dataDir}. Nothing was changed.`);

const client = dryRun ? null : await pool.connect();
const sql = async (text, params = []) => {
  if (dryRun) return { rows: [], rowCount: 0 };
  return client.query(text, params);
};

async function importSystem() {
  if (!system) return;
  for (const row of rows(system, "offices")) {
    await sql(`INSERT INTO offices (id,name,short_name,description,icon,accent_color,status,created_at,updated_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,COALESCE($8::timestamptz,NOW()),COALESCE($9::timestamptz,NOW()))
      ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, short_name=EXCLUDED.short_name, description=EXCLUDED.description,
      icon=EXCLUDED.icon, accent_color=EXCLUDED.accent_color, status=EXCLUDED.status, updated_at=EXCLUDED.updated_at`,
      [row.id, row.name, row.short_name, row.description, row.icon, row.accent_color || "#800000", row.status || "Active", row.created_at || null, row.updated_at || null]);
    count("offices");
  }
  for (const row of rows(system, "modules")) {
    await sql(`INSERT INTO modules (id,name,description,category,icon,sidebar_group,sort_order,is_system,component_key)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name,description=EXCLUDED.description,
      category=EXCLUDED.category,icon=EXCLUDED.icon,sidebar_group=EXCLUDED.sidebar_group,sort_order=EXCLUDED.sort_order,
      is_system=EXCLUDED.is_system,component_key=EXCLUDED.component_key`,
      [row.id, row.name, row.description, row.category, row.icon, row.sidebar_group, row.sort_order || 0, Boolean(row.is_system), row.component_key]);
    count("modules");
  }
  for (const row of rows(system, "office_modules")) {
    await sql(`INSERT INTO office_modules (office_id,module_id,enabled,config,sort_order) VALUES ($1,$2,$3,$4::jsonb,$5)
      ON CONFLICT (office_id,module_id) DO UPDATE SET enabled=EXCLUDED.enabled,config=EXCLUDED.config,sort_order=EXCLUDED.sort_order,updated_at=NOW()`,
      [row.office_id, row.module_id, Boolean(row.enabled), row.config || null, row.sort_order ?? null]);
    count("office_modules");
  }
  for (const row of rows(system, "staff")) {
    await sql(`INSERT INTO staff (id,office_id,fname,lname,role,section,status,email,password_hash,password_last_changed,last_active,created_at,updated_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::timestamptz,$11::timestamptz,COALESCE($12::timestamptz,NOW()),COALESCE($13::timestamptz,NOW()))
      ON CONFLICT (id) DO UPDATE SET office_id=EXCLUDED.office_id,fname=EXCLUDED.fname,lname=EXCLUDED.lname,role=EXCLUDED.role,
      section=EXCLUDED.section,status=EXCLUDED.status,email=EXCLUDED.email,password_hash=EXCLUDED.password_hash,updated_at=EXCLUDED.updated_at`,
      [row.id, row.office_id || null, row.fname, row.lname, row.role, row.section || "", row.status || "Active", row.email, row.password_hash || null, row.password_last_changed || null, row.last_active || null, row.created_at || null, row.updated_at || null]);
    count("staff");
  }
  for (const row of rows(system, "global_audit_logs")) {
    await sql(`INSERT INTO global_audit_logs (office_id,actor,role,action,details,severity,entity_type,entity_id,ip,user_agent,created_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,COALESCE($11::timestamptz,NOW()))`,
      [row.office_id || null, row.actor, row.role, row.action, row.details || null, row.severity || "INFO", row.entity_type || null, row.entity_id || null, row.ip || null, row.user_agent || null, row.created_at || null]);
    count("global_audit_logs");
  }
}

async function importStudents() {
  for (const [officeId, db] of [["registrar", registrar], ["osas", osas]]) {
    if (!db) continue;
    for (const row of rows(db, "students")) {
      const existing = dryRun ? null : (await client.query("SELECT * FROM students WHERE student_no = $1", [row.student_no])).rows[0];
      if (existing && normalizeName(existing.name) !== normalizeName(row.name)) {
        report.conflicts.push({ type: "student_identity", student_no: row.student_no, canonical_name: existing.name, source_name: row.name, source_office: officeId });
        continue;
      }
      await sql(`INSERT INTO students (student_no,name,course_code,year_level,section,status,storage_room,storage_cabinet,storage_drawer,created_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,COALESCE($10::timestamptz,NOW()))
        ON CONFLICT (student_no) DO UPDATE SET name=EXCLUDED.name, course_code=COALESCE(EXCLUDED.course_code,students.course_code),
        year_level=COALESCE(EXCLUDED.year_level,students.year_level),section=COALESCE(EXCLUDED.section,students.section),
        status=EXCLUDED.status,storage_room=COALESCE(EXCLUDED.storage_room,students.storage_room),
        storage_cabinet=COALESCE(EXCLUDED.storage_cabinet,students.storage_cabinet),storage_drawer=COALESCE(EXCLUDED.storage_drawer,students.storage_drawer),updated_at=NOW()`,
        [row.student_no, row.name, row.course_code || null, row.year_level ?? null, row.section || null, row.status || "Active", row.room ?? null, row.cabinet ?? null, row.drawer ?? null, row.created_at || null]);
      count(`students:${officeId}`);
    }
  }
}

async function importOfficeRecords(officeId, db) {
  if (!db) return;
  for (const row of rows(db, "courses")) {
    await sql(`INSERT INTO courses (office_id,code,name,status,created_at) VALUES ($1,$2,$3,$4,COALESCE($5::timestamptz,NOW()))
      ON CONFLICT (office_id,code) DO UPDATE SET name=EXCLUDED.name,status=EXCLUDED.status`,
      [officeId, row.code, row.name, row.status || "Active", row.created_at || null]);
    count(`courses:${officeId}`);
  }
  for (const row of rows(db, "sections")) {
    await sql(`INSERT INTO sections (office_id,name,course_code,status,created_at) VALUES ($1,$2,$3,$4,COALESCE($5::timestamptz,NOW()))
      ON CONFLICT (office_id,name,course_code) DO UPDATE SET status=EXCLUDED.status`,
      [officeId, row.name, row.course_code || null, row.status || "Active", row.created_at || null]);
    count(`sections:${officeId}`);
  }
  for (const row of rows(db, "document_types")) {
    await sql(`INSERT INTO document_types (office_id,name,name_norm,status,created_at) VALUES ($1,$2,$3,$4,COALESCE($5::timestamptz,NOW()))
      ON CONFLICT (office_id,name_norm) DO UPDATE SET name=EXCLUDED.name,status=EXCLUDED.status`,
      [officeId, row.name, row.name_norm || normalizeName(row.name), row.status || "Active", row.created_at || null]);
    count(`document_types:${officeId}`);
  }
  const documentIds = new Map();
  for (const row of rows(db, "documents")) {
    const result = await sql(`INSERT INTO documents (office_id,student_no,student_name,doc_type,original_filename,storage_filename,mime_type,size_bytes,approval_status,reviewed_by,reviewed_at,review_note,uploaded_by,is_previewed,legacy_id,created_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::timestamptz,$12,$13,$14,$15,COALESCE($16::timestamptz,NOW()))
      ON CONFLICT (office_id,legacy_id) DO UPDATE SET approval_status=EXCLUDED.approval_status,reviewed_by=EXCLUDED.reviewed_by,reviewed_at=EXCLUDED.reviewed_at,review_note=EXCLUDED.review_note
      RETURNING id`, [officeId,row.student_no || null,row.student_name || null,row.doc_type,row.original_filename,row.storage_filename,row.mime_type,row.size_bytes,row.approval_status || "Pending",row.reviewed_by || null,row.reviewed_at || null,row.review_note || null,row.uploaded_by || null,Boolean(row.is_previewed),row.id,row.created_at || null]);
    if (result.rows[0]) documentIds.set(row.id, result.rows[0].id);
    count(`documents:${officeId}`);
  }
  for (const row of rows(db, "document_requests")) {
    const linked = row.linked_document_id ? documentIds.get(row.linked_document_id) || null : null;
    await sql(`INSERT INTO document_requests (office_id,student_no,doc_type,status,notes,linked_document_id,created_by,updated_by,legacy_id,created_at,updated_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,COALESCE($10::timestamptz,NOW()),COALESCE($11::timestamptz,NOW()))
      ON CONFLICT (office_id,legacy_id) DO UPDATE SET status=EXCLUDED.status,notes=EXCLUDED.notes,linked_document_id=EXCLUDED.linked_document_id,updated_by=EXCLUDED.updated_by,updated_at=EXCLUDED.updated_at`,
      [officeId,row.student_no,row.doc_type,row.status || "Pending",row.notes || null,linked,row.created_by || null,row.updated_by || null,row.id,row.created_at || null,row.updated_at || null]);
    count(`document_requests:${officeId}`);
  }
}

try {
  if (!dryRun) await client.query("BEGIN");
  await importSystem();
  await importStudents();
  await importOfficeRecords("registrar", registrar);
  await importOfficeRecords("osas", osas);
  if (!dryRun) await client.query("COMMIT");
} catch (error) {
  if (!dryRun) await client.query("ROLLBACK");
  throw error;
} finally {
  system?.close(); registrar?.close(); osas?.close();
  client?.release(); await pool?.end();
}

report.finishedAt = new Date().toISOString();
report.sourceSha256 = crypto.createHash("sha256").update(JSON.stringify(report.tables)).digest("hex");
fs.mkdirSync(path.dirname(reportPath), { recursive: true });
fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(`SQLite migration ${dryRun ? "dry-run " : ""}complete. Report: ${reportPath}`);
if (report.conflicts.length) console.warn(`${report.conflicts.length} student identity conflict(s) were skipped; review the report before resolving them.`);
