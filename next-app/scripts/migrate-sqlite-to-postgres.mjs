import dotenv from "dotenv";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import Database from "better-sqlite3";
import { decryptPII, encryptPII } from "../src/lib/piiEncryption.js";

dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

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

const report = { source: dataDir, dryRun, startedAt: new Date().toISOString(), tables: {}, files: { copied: 0, missing: 0 }, conflicts: [], warnings: [] };
const studentAccountProfiles = new Map();
const count = (name, amount = 1) => { report.tables[name] = (report.tables[name] || 0) + amount; };
const normalizeName = value => String(value || "").trim().replace(/\s+/g, " ").toLocaleLowerCase();
const tableExists = (db, table) => !!db.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?").get(table);
const rows = (db, table) => tableExists(db, table) ? db.prepare(`SELECT * FROM ${table}`).all() : [];
const sourceDb = file => fs.existsSync(file) ? new Database(file, { readonly: true }) : null;

function storageCandidates(officeId, filename) {
  return [
    path.join(dataDir, officeId, "uploads", filename),
    path.join(dataDir, "uploads", filename),
  ];
}

function copyStorageFile(officeId, filename) {
  if (!filename) return;
  const source = storageCandidates(officeId, filename).find(file => fs.existsSync(file));
  if (!source) {
    report.files.missing += 1;
    report.warnings.push(`Missing ${officeId} upload: ${filename}`);
    return;
  }
  const target = path.join(dataDir, officeId, "uploads", filename);
  if (!dryRun) {
    fs.mkdirSync(path.dirname(target), { recursive: true });
    if (path.resolve(source) !== path.resolve(target)) fs.copyFileSync(source, target);
  }
  report.files.copied += 1;
}

const system = sourceDb(path.join(dataDir, "system.sqlite"));
// Support both the newer multi-office backup layout and the original
// single-office `.local/db.sqlite` layout used by the first prototype.
const registrar = sourceDb(path.join(dataDir, "registrar", "db.sqlite")) || sourceDb(path.join(dataDir, "db.sqlite"));
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
      const sourceName = clearImportedPii(row.name, "student name", officeId, row.student_no);
      const existingName = existing ? clearImportedPii(existing.name, "registry name", officeId, row.student_no) : null;
      if (existing && normalizeName(existingName) !== normalizeName(sourceName)) {
        report.conflicts.push({ type: "student_identity", student_no: row.student_no, source_office: officeId });
        continue;
      }
      await sql(`INSERT INTO students (student_no,name,course_code,year_level,section,status,storage_room,storage_cabinet,storage_drawer,created_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,COALESCE($10::timestamptz,NOW()))
        ON CONFLICT (student_no) DO UPDATE SET name=EXCLUDED.name, course_code=COALESCE(EXCLUDED.course_code,students.course_code),
        year_level=COALESCE(EXCLUDED.year_level,students.year_level),section=COALESCE(EXCLUDED.section,students.section),
        status=EXCLUDED.status,storage_room=COALESCE(EXCLUDED.storage_room,students.storage_room),
        storage_cabinet=COALESCE(EXCLUDED.storage_cabinet,students.storage_cabinet),storage_drawer=COALESCE(EXCLUDED.storage_drawer,students.storage_drawer),updated_at=NOW()`,
        [row.student_no, encryptPII(sourceName), row.course_code || null, row.year_level ?? null, row.section || null, row.status || "Active", row.room ?? null, row.cabinet ?? null, row.drawer ?? null, row.created_at || null]);
      await sql(`INSERT INTO student_office_memberships (student_no, office_id, status)
        VALUES ($1, $2, 'Active')
        ON CONFLICT (student_no, office_id) DO UPDATE SET status = 'Active', updated_at = NOW()`,
        [row.student_no, officeId]);
      count(`students:${officeId}`);
    }
  }
}

function clearImportedPii(value, field, officeId, accountId) {
  if (!value) return null;
  const clearValue = decryptPII(value);
  if (String(value).startsWith("enc:v1:") && clearValue === value) {
    throw new Error(`Cannot decrypt ${field} in ${officeId} student account ${accountId}; migration was rolled back.`);
  }
  return String(clearValue).trim() || null;
}

async function importStudentAccounts() {
  for (const [officeId, db] of [["registrar", registrar], ["osas", osas]]) {
    if (!db || !tableExists(db, "student_accounts")) continue;
    for (const row of rows(db, "student_accounts")) {
      const legacyId = row.id ?? row.student_no;
      if (legacyId == null) {
        report.warnings.push(`Skipped ${officeId} student account without a source ID.`);
        continue;
      }
      if (!dryRun) {
        const prior = await client.query(
          "SELECT identity_profile_id FROM student_accounts WHERE legacy_source = $1 AND legacy_id = $2",
          [officeId, String(legacyId)],
        );
        if (prior.rows[0]) {
          studentAccountProfiles.set(`${officeId}:${legacyId}`, prior.rows[0].identity_profile_id);
          continue;
        }
      }
      if (!row.password_hash) {
        report.warnings.push(`Skipped ${officeId} student account ${legacyId} because it has no password hash.`);
        continue;
      }

      const firstName = clearImportedPii(row.first_name, "first_name", officeId, legacyId);
      const middleName = clearImportedPii(row.middle_name, "middle_name", officeId, legacyId);
      const lastName = clearImportedPii(row.last_name, "last_name", officeId, legacyId);
      const displayName = clearImportedPii(row.display_name, "display_name", officeId, legacyId)
        || [firstName, middleName, lastName].filter(Boolean).join(" ")
        || clearImportedPii(row.name, "name", officeId, legacyId);
      const email = clearImportedPii(row.email, "email", officeId, legacyId)?.toLowerCase() || null;
      const encryptedEmail = encryptPII(email);
      const originalStudentNo = row.student_no || null;

      if (dryRun) {
        count(`student_accounts:${officeId}`);
        continue;
      }

      const student = originalStudentNo
        ? (await client.query("SELECT identity_profile_id FROM students WHERE student_no = $1", [originalStudentNo])).rows[0]
        : null;
      let profileId = null;
      if (student?.identity_profile_id) {
        const accountOnStudentProfile = await client.query(
          "SELECT 1 FROM student_accounts WHERE identity_profile_id = $1 LIMIT 1",
          [student.identity_profile_id],
        );
        const registryProfile = (await client.query(
          "SELECT id, email FROM student_identity_profiles WHERE id = $1",
          [student.identity_profile_id],
        )).rows[0];
        const registryEmail = registryProfile?.email ? String(decryptPII(registryProfile.email)).trim().toLowerCase() : null;
        if (!accountOnStudentProfile.rows.length && (!registryEmail || registryEmail === email)) {
          profileId = student.identity_profile_id;
        }
      }

      if (encryptedEmail) {
        const emailOwner = (await client.query(
          "SELECT id FROM student_identity_profiles WHERE email = $1 LIMIT 1",
          [encryptedEmail],
        )).rows[0];
        if (emailOwner && emailOwner.id !== profileId) {
          report.conflicts.push({ type: "student_account_email_collision", source_office: officeId, source_account_id: String(legacyId) });
          throw new Error(`Duplicate student account email in source ${officeId}, account ${legacyId}; resolve the email collision before retrying.`);
        }
      }

      if (!profileId) {
        const profile = await client.query(
          `INSERT INTO student_identity_profiles (first_name, middle_name, last_name, display_name, email, client_type)
           VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
          [encryptPII(firstName), encryptPII(middleName), encryptPII(lastName), encryptPII(displayName), encryptedEmail, row.client_type || "Student"],
        );
        profileId = profile.rows[0].id;
      } else {
        await client.query(
          `UPDATE student_identity_profiles
              SET first_name = COALESCE(first_name, $1), middle_name = COALESCE(middle_name, $2),
                  last_name = COALESCE(last_name, $3), display_name = COALESCE(display_name, $4),
                  email = COALESCE(email, $5), client_type = $6, updated_at = NOW()
            WHERE id = $7`,
          [encryptPII(firstName), encryptPII(middleName), encryptPII(lastName), encryptPII(displayName), encryptedEmail, row.client_type || "Student", profileId],
        );
      }

      const validStudentNo = student ? originalStudentNo : null;
      const inserted = await client.query(
        `INSERT INTO student_accounts (
           student_no, identity_profile_id, password_hash, status, last_active,
           created_at, updated_at, avatar_filename, legacy_source, legacy_id
         ) VALUES ($1, $2, $3, $4, $5::timestamptz,
                   COALESCE($6::timestamptz, NOW()), COALESCE($7::timestamptz, NOW()), $8, $9, $10)
         RETURNING id`,
        [validStudentNo, profileId, row.password_hash, row.status || "Active", row.last_active || null,
          row.created_at || null, row.updated_at || null, row.avatar_filename || null, officeId, String(legacyId)],
      );
      studentAccountProfiles.set(`${officeId}:${legacyId}`, profileId);
      if (originalStudentNo && (!student || student.identity_profile_id !== profileId)) {
        await client.query(
          `INSERT INTO student_identity_link_reviews (
             entity_type, entity_id, student_no, student_account_id,
             registry_profile_id, account_profile_id
           ) VALUES ('student_account', $1, $2, $1, $3, $4)
           ON CONFLICT (entity_type, entity_id) DO NOTHING`,
          [inserted.rows[0].id, originalStudentNo, student?.identity_profile_id || null, profileId],
        );
      }
      if (originalStudentNo && !student) {
        report.warnings.push(`Imported ${officeId} student account ${legacyId} without a matching registry student; its original student number is queued for review.`);
      }
      count(`student_accounts:${officeId}`);
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
    copyStorageFile(officeId, row.storage_filename);
    count(`documents:${officeId}`);
  }
  const proposalIds = new Map();
  for (const row of rows(db, "event_proposals")) {
    const accountProfileId = row.student_account_id
      ? studentAccountProfiles.get(`${officeId}:${row.student_account_id}`) || null
      : null;
    const result = await sql(`INSERT INTO event_proposals (office_id,student_no,identity_profile_id,title,organization_name,event_date,venue,description,storage_filename,original_filename,mime_type,size_bytes,status,reviewed_by,reviewed_at,review_note,created_at,updated_at)
      VALUES ($1,$2,COALESCE($18,(SELECT identity_profile_id FROM students WHERE student_no=$2)),$3,$4,$5::date,$6,$7,$8,$9,$10,$11,$12,$13,$14::timestamptz,$15,COALESCE($16::timestamptz,NOW()),COALESCE($17::timestamptz,NOW()))
      ON CONFLICT DO NOTHING RETURNING id,identity_profile_id`,
      [officeId, row.student_no, row.title, row.organization_name, row.event_date || null, row.venue || null, row.description || null, row.storage_filename, row.original_filename, row.mime_type || "application/pdf", row.size_bytes || 0, row.status || "Submitted", row.reviewed_by || null, row.reviewed_at || null, row.review_note || null, row.created_at || null, row.updated_at || null, accountProfileId]);
    if (result.rows[0]) {
      proposalIds.set(row.id, result.rows[0].id);
      if (!result.rows[0].identity_profile_id) {
        await sql(`INSERT INTO student_identity_link_reviews (entity_type,entity_id,student_no)
          VALUES ('event_proposal',$1,$2) ON CONFLICT (entity_type,entity_id) DO NOTHING`,
          [result.rows[0].id, row.student_no || null]);
      }
    }
    copyStorageFile(officeId, row.storage_filename);
    count(`event_proposals:${officeId}`);
  }
  for (const row of rows(db, "document_requests")) {
    const linked = row.linked_document_id ? documentIds.get(row.linked_document_id) || null : null;
    const accountProfileId = row.student_account_id
      ? studentAccountProfiles.get(`${officeId}:${row.student_account_id}`) || null
      : null;
    const result = await sql(`INSERT INTO document_requests (office_id,student_no,doc_type,status,notes,linked_document_id,created_by,updated_by,legacy_id,created_at,updated_at,identity_profile_id)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,COALESCE($10::timestamptz,NOW()),COALESCE($11::timestamptz,NOW()),COALESCE($12,(SELECT identity_profile_id FROM students WHERE student_no=$2)))
      ON CONFLICT (office_id,legacy_id) DO UPDATE SET status=EXCLUDED.status,notes=EXCLUDED.notes,linked_document_id=EXCLUDED.linked_document_id,identity_profile_id=EXCLUDED.identity_profile_id,updated_by=EXCLUDED.updated_by,updated_at=EXCLUDED.updated_at
      RETURNING id,identity_profile_id`,
      [officeId,row.student_no,row.doc_type,row.status || "Pending",row.notes || null,linked,row.created_by || null,row.updated_by || null,row.id,row.created_at || null,row.updated_at || null,accountProfileId]);
    if (result.rows[0] && !result.rows[0].identity_profile_id) {
      await sql(`INSERT INTO student_identity_link_reviews (entity_type,entity_id,student_no)
        VALUES ('document_request',$1,$2) ON CONFLICT (entity_type,entity_id) DO NOTHING`,
        [result.rows[0].id, row.student_no || null]);
    }
    count(`document_requests:${officeId}`);
  }
  for (const row of rows(db, "transaction_updates")) {
    const documentRequestId = row.document_request_id ? await mappedId("document_requests", officeId, row.document_request_id) : null;
    const eventProposalId = row.event_proposal_id ? proposalIds.get(row.event_proposal_id) || null : null;
    if (!documentRequestId && !eventProposalId) {
      report.warnings.push(`Skipped transaction update ${row.id} because its parent was not migrated.`);
      continue;
    }
    await sql(`INSERT INTO transaction_updates (document_request_id,event_proposal_id,status,message,created_by,created_at)
      VALUES ($1,$2,$3,$4,$5,COALESCE($6::timestamptz,NOW()))`,
      [documentRequestId, eventProposalId, row.status, row.message || null, row.created_by || null, row.created_at || null]);
    count(`transaction_updates:${officeId}`);
  }
}

async function mappedId(table, officeId, legacyId) {
  if (dryRun) return legacyId;
  const result = await client.query(`SELECT id FROM ${table} WHERE office_id = $1 AND legacy_id = $2`, [officeId, legacyId]);
  return result.rows[0]?.id || null;
}

try {
  if (!dryRun) await client.query("BEGIN");
  await importSystem();
  await importStudents();
  await importStudentAccounts();
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
