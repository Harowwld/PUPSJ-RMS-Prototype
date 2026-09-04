/**
 * Seed the complete local PostgreSQL sample dataset.
 *
 * Run from next-app/:
 *   pnpm populate-sample-data
 *   pnpm populate-sample-data --force   # also replaces storage_layout
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config();

const { pool, query, queryOne, transaction } = await import("../src/lib/postgres.js");
const { buildDefaultStorageLayout } = await import("../src/lib/storageLayoutDefaults.js");

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required. Start PostgreSQL and check next-app/.env.local.");
}

const passwordHash = crypto
  .createHash("sha256")
  .update(process.env.DEFAULT_STAFF_PASSWORD || "pupstaff")
  .digest("hex");
const studentSalt = "local-test-student-salt";
const studentPasswordHash = `${studentSalt}:${crypto.scryptSync("student123", studentSalt, 64).toString("hex")}`;

const students = [
  ["2023-00001-IT-1", "TEST STUDENT", "BSIT", 4, "BSIT-4A", 1, "2027", 1],
  ["2022-10001-MN-1", "DELA CRUZ, JUAN A.", "BSIT", 2024, "BSIT-4A", 1, "2020", 1],
  ["2022-10002-MN-2", "SANTOS, MARIA B.", "BSIT", 2024, "BSIT-4A", 1, "2021", 2],
  ["2023-20003-MN-0", "REYES, CARLOS C.", "BSIT", 2025, "BSIT-4B", 2, "2022", 3],
  ["2021-30004-MN-1", "GARCIA, ANA D.", "BSCS", 2024, "BSCS-3A", 3, "2023", 4],
  ["2024-40005-MN-2", "TORRES, LUIS E.", "BSCS", 2025, "BSCS-3A", 1, "2024", 1],
  ["2020-50006-MN-0", "FLORES, ELENA F.", "BSIT", 2024, "BSIT-4B", 4, "2025", 2],
  // OCR matching fixtures from the PSA birth-certificate samples.
  ["2025-60007-MN-0", "BAUTISTA, JULIANNE MARIE MERCADO", "BSIT", 2025, "BSIT-4A", 5, "2026", 1],
  ["2025-60008-MN-1", "DE LEON, JULIAN CARLO SANTOS", "BSIT", 2025, "BSIT-4A", 5, "2026", 2],
  ["2025-60009-MN-2", "RAMIREZ, GABRIEL MATEO SANTOS", "BSIT", 2025, "BSIT-4B", 5, "2026", 3],
  ["2025-60010-MN-0", "MERCADO, LIAM CARTER VALENCIA", "BSIT", 2025, "BSIT-4B", 5, "2026", 4],
];

const documents = [
  [1, "2022-10001-MN-1", "DELA CRUZ, JUAN A.", "Transcript of Records", "sample-tor-juan.pdf"],
  [2, "2022-10001-MN-1", "DELA CRUZ, JUAN A.", "Certificate of Enrollment", "sample-coe-juan.pdf"],
  [3, "2022-10002-MN-2", "SANTOS, MARIA B.", "Form 137", "sample-form137-maria.pdf"],
  [4, "2021-30004-MN-1", "GARCIA, ANA D.", "Diploma", "sample-diploma-ana.pdf"],
];

const requests = [
  [1, "2023-20003-MN-0", "Diploma", "Pending", "Alumni document request for employment verification", "PUPREGISTRAR-002"],
  [2, "2024-40005-MN-2", "Transcript of Records", "InProgress", "Under processing by records evaluation section", "PUPREGISTRAR-003"],
  [3, "2022-10001-MN-1", "Certificate of Enrollment", "Ready", "Ready for campus registrar counter pickup", "PUPREGISTRAR-002"],
  [4, "2022-10002-MN-2", "Form 137", "Completed", "Released and acknowledged by student", "PUPREGISTRAR-003"],
  [5, "2020-50006-MN-0", "Certificate of Good Moral", "Pending", "Urgent request for scholarship application", "PUPREGISTRAR-002"],
];

const proposals = [
  [
    "2022-10001-MN-1",
    "Annual Tech Summit & Hackathon 2026",
    "Junior Philippine Computer Society (JPCS)",
    "2026-10-15",
    "PUP San Juan Audio-Visual Room",
    "Inter-collegiate programming contest, tech symposium, and innovation showcase for IT and CS majors.",
    "sample-jpcs-tech-summit.pdf",
    "Under Review",
    "Initial safety and venue clearance verified. Endorsement letter pending OSAS head sign-off."
  ],
  [
    "2022-10002-MN-2",
    "University Leadership Congress & General Assembly",
    "Central Student Council (CSC)",
    "2026-09-28",
    "PUP San Juan Gymnasium",
    "Mandatory leadership development and student council budget consultation for accredited org leaders.",
    "sample-csc-leadership-congress.pdf",
    "Approved",
    "Approved by OSAS Director. Activity permit issued."
  ],
  [
    "2023-20003-MN-0",
    "Freshmen Orientation & Welcoming Gala",
    "Association of Computer Science Students (ACSS)",
    "2026-09-20",
    "Campus Quadrangle",
    "Welcoming event for batch 2026 freshmen, campus tour, and student organization fair.",
    "sample-acss-freshmen-gala.pdf",
    "Submitted",
    null
  ],
  [
    "2024-40005-MN-2",
    "Financial Literacy & Investment Forum",
    "Junior Financial Executives (JFINEX)",
    "2026-11-05",
    "Room 304 Seminar Hall",
    "Educational forum on personal wealth management, stock investing, and digital banking literacy.",
    "sample-jfinex-finance-forum.pdf",
    "Needs Revision",
    "Please attach the certified guest speaker profile and updated venue sanitation plan."
  ],
  [
    "2021-30004-MN-1",
    "Cybersecurity Defense & Ethical Hacking Workshop",
    "Association of Computer Science Students (ACSS)",
    "2026-10-22",
    "Computer Laboratory 2",
    "Hands-on technical workshop on network security fundamentals and cyber hygiene.",
    "sample-acss-cyber-defense.pdf",
    "Approved",
    "Security protocols approved. Laboratory reservation confirmed."
  ],
];

const osasDocuments = [
  [101, "2025-90001-MN-0", "DE LA ROSA, ANGELA M.", "Organization Registration Certificate", "sample-org-cert-angela.pdf"],
];

const minimalPdf = Buffer.from(
  ["%PDF-1.4", "1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj", "2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj", "3 0 obj<</Type/Page/MediaBox[0 0 612 792]>>endobj", "xref", "0 4", "0000000000 65535 f ", "0000000009 00000 n ", "0000000052 00000 n ", "0000000101 00000 n ", "trailer<</Size 4/Root 1 0 R>>", "startxref", "178", "%%EOF"].join("\n"),
);

export async function seed({ force: forceOverride } = {}) {
  const force = forceOverride ?? process.argv.includes("--force");
  await transaction(async ({ query: run, queryOne: runOne }) => {
    const officialStaff = [
      ["PUPSUPERADMIN-001", null, "System", "Administrator", "SuperAdmin", "System Administration", "superadmin@pup.local"],
      ["PUPREGISTRAR-003", "registrar", "Elias", "Austria", "Admin", "Administrative", "admin.registrar@pup.local"],
      ["PUPREGISTRAR-002", "registrar", "Marcus", "Reyes", "Staff", "Records", "staff.registrar@pup.local"],
      ["PUPOSAS-001", "osas", "Sandra", "Gomez", "Admin", "OSAS Admin", "admin.osas@pup.local"],
    ];

    for (const [id, office, fname, lname, role, section, email] of officialStaff) {
      await run(
        `INSERT INTO staff (id, office_id, fname, lname, role, section, status, email, password_hash, password_last_changed, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, 'Active', $7, $8, NOW(), NOW())
         ON CONFLICT (id) DO UPDATE SET
           office_id=EXCLUDED.office_id, fname=EXCLUDED.fname, lname=EXCLUDED.lname,
           role=EXCLUDED.role, section=EXCLUDED.section, status='Active', email=EXCLUDED.email,
           password_hash=EXCLUDED.password_hash, password_last_changed=NOW(), updated_at=NOW()`,
        [id, office, fname, lname, role, section, email, passwordHash],
      );
    }

    // Remap legacy request actors and purge old demo accounts
    await run(`UPDATE document_requests SET created_by = 'PUPREGISTRAR-002' WHERE created_by = 'records.marcus@pup.local' OR created_by = 'PUPREGISTRAR-001'`);
    await run(`UPDATE document_requests SET updated_by = 'PUPREGISTRAR-002' WHERE updated_by = 'records.marcus@pup.local' OR updated_by = 'PUPREGISTRAR-001'`);
    await run(`DELETE FROM staff_security_answers WHERE staff_id = 'PUPREGISTRAR-001'`);
    await run(`DELETE FROM staff WHERE id = 'records.marcus@pup.local' OR email = 'records.marcus@pup.local' OR id = 'PUPREGISTRAR-001' OR email = 'admin.default@pup.local'`);
    await run(`DELETE FROM staff WHERE id = 'PUPOSAS-002' OR email = 'staff.osas@pup.local'`);

    // Ensure security questions and recovery answers
    const securityQuestions = [
      [1, "What is your mother's maiden name?", true],
      [2, "What was the name of your first school?", true],
      [3, "What is your favorite color?", false],
    ];
    for (const [qid, qtext, req] of securityQuestions) {
      await run(
        `INSERT INTO security_questions (id, question, is_required)
         VALUES ($1, $2, $3)
         ON CONFLICT (id) DO UPDATE SET question = EXCLUDED.question, is_required = EXCLUDED.is_required`,
        [qid, qtext, req],
      );
    }

    const defaultAnswers = [
      [1, "answer1"],
      [2, "answer2"],
      [3, "blue"],
    ];
    for (const [staffId] of officialStaff) {
      for (const [qid, ans] of defaultAnswers) {
        const aHash = crypto.createHash("sha256").update(ans.toLowerCase()).digest("hex");
        await run(
          `INSERT INTO staff_security_answers (staff_id, question_id, answer_hash, updated_at)
           VALUES ($1, $2, $3, NOW())
           ON CONFLICT (staff_id, question_id) DO UPDATE SET answer_hash = EXCLUDED.answer_hash, updated_at = NOW()`,
          [staffId, qid, aHash],
        );
      }
    }

    for (const [code, name] of [["BSIT", "Bachelor of Science in Information Technology"], ["BSCS", "Bachelor of Science in Computer Science"]]) {
      await run(`INSERT INTO courses (office_id, code, name, status) VALUES ('registrar', $1, $2, 'Active') ON CONFLICT (office_id, code) DO UPDATE SET name=EXCLUDED.name, status='Active'`, [code, name]);
    }

    for (const [name, code] of [["BSIT-4A", "BSIT"], ["BSIT-4B", "BSIT"], ["BSCS-3A", "BSCS"]]) {
      await run(`INSERT INTO sections (office_id, name, course_code, status) VALUES ('registrar', $1, $2, 'Active') ON CONFLICT (office_id, name, course_code) DO UPDATE SET status='Active'`, [name, code]);
    }

    for (const name of ["Transcript of Records", "Diploma", "Certificate of Good Moral", "Form 137", "Certificate of Enrollment", "Birth Certificate"]) {
      await run(`INSERT INTO document_types (office_id, name, name_norm, status) VALUES ('registrar', $1, $2, 'Active') ON CONFLICT (office_id, name_norm) DO UPDATE SET name=EXCLUDED.name, status='Active'`, [name, name.toLowerCase()]);
    }

    for (const [code, name] of [["BSA", "Bachelor of Science in Accountancy"]]) {
      await run(`INSERT INTO courses (office_id, code, name, status) VALUES ('osas', $1, $2, 'Active') ON CONFLICT (office_id, code) DO UPDATE SET name=EXCLUDED.name, status='Active'`, [code, name]);
    }
    await run(`INSERT INTO sections (office_id, name, course_code, status) VALUES ('osas', 'BSA-2A', 'BSA', 'Active') ON CONFLICT (office_id, name, course_code) DO UPDATE SET status='Active'`);
    for (const name of ["Good Moral Certificate", "Clearance Form", "Organization Registration Certificate", "Activity Permit"]) {
      await run(`INSERT INTO document_types (office_id, name, name_norm, status) VALUES ('osas', $1, $2, 'Active') ON CONFLICT (office_id, name_norm) DO UPDATE SET name=EXCLUDED.name, status='Active'`, [name, name.toLowerCase()]);
    }

    for (const student of students) {
      await run(
        `INSERT INTO students (student_no, name, course_code, year_level, section, status, storage_room, storage_cabinet, storage_drawer)
         VALUES ($1,$2,$3,$4,$5,'Active',$6,$7,$8)
         ON CONFLICT (student_no) DO UPDATE SET name=EXCLUDED.name, course_code=EXCLUDED.course_code, year_level=EXCLUDED.year_level,
           section=EXCLUDED.section, status='Active', storage_room=EXCLUDED.storage_room, storage_cabinet=EXCLUDED.storage_cabinet,
           storage_drawer=EXCLUDED.storage_drawer, updated_at=NOW()`,
        student,
      );
    }

    for (const [sNo, sEmail] of [
      ["2023-00001-IT-1", "test.student@pup.local"],
      ["2022-10001-MN-1", "student@pup.local"],
    ]) {
      await run(
        `INSERT INTO student_accounts (student_no, email, password_hash, status, updated_at)
         VALUES ($1, $2, $3, 'Active', NOW())
         ON CONFLICT (student_no) DO UPDATE SET email=EXCLUDED.email, password_hash=EXCLUDED.password_hash, status='Active', updated_at=NOW()`,
        [sNo, sEmail, studentPasswordHash],
      );
    }

    const uploadsDir = path.join(process.env.LOCAL_DATA_DIR || ".local", "uploads");
    const osasUploadsDir = path.join(process.env.LOCAL_DATA_DIR || ".local", "osas", "uploads");
    fs.mkdirSync(uploadsDir, { recursive: true });
    fs.mkdirSync(osasUploadsDir, { recursive: true });

    for (const [legacyId, studentNo, studentName, docType, filename] of documents) {
      const storageFilename = `sample-${legacyId}-${filename}`;
      fs.writeFileSync(path.join(uploadsDir, storageFilename), minimalPdf);
      await run(
        `INSERT INTO documents (office_id, student_no, student_name, doc_type, original_filename, storage_filename, mime_type, size_bytes, approval_status, legacy_id)
         VALUES ('registrar',$1,$2,$3,$4,$5,'application/pdf',$6,'Pending',$7)
         ON CONFLICT (office_id, legacy_id) DO UPDATE SET student_no=EXCLUDED.student_no, student_name=EXCLUDED.student_name,
           doc_type=EXCLUDED.doc_type, original_filename=EXCLUDED.original_filename, storage_filename=EXCLUDED.storage_filename, size_bytes=EXCLUDED.size_bytes`,
        [studentNo, studentName, docType, filename, storageFilename, minimalPdf.length, legacyId],
      );
    }

    await run(
      `INSERT INTO students (student_no, name, course_code, year_level, section, status)
       VALUES ('2025-90001-MN-0', 'DE LA ROSA, ANGELA M.', 'BSA', 2026, 'BSA-2A', 'Active')
       ON CONFLICT (student_no) DO UPDATE SET name=EXCLUDED.name, course_code=EXCLUDED.course_code,
         year_level=EXCLUDED.year_level, section=EXCLUDED.section, status='Active', updated_at=NOW()`,
    );

    for (const [legacyId, studentNo, studentName, docType, filename] of osasDocuments) {
      const storageFilename = `sample-${legacyId}-${filename}`;
      fs.writeFileSync(path.join(uploadsDir, storageFilename), minimalPdf);
      await run(
        `INSERT INTO documents (office_id, student_no, student_name, doc_type, original_filename, storage_filename, mime_type, size_bytes, approval_status, legacy_id)
         VALUES ('osas',$1,$2,$3,$4,$5,'application/pdf',$6,'Pending',$7)
         ON CONFLICT (office_id, legacy_id) DO UPDATE SET student_no=EXCLUDED.student_no, student_name=EXCLUDED.student_name,
           doc_type=EXCLUDED.doc_type, original_filename=EXCLUDED.original_filename, storage_filename=EXCLUDED.storage_filename, size_bytes=EXCLUDED.size_bytes`,
        [studentNo, studentName, docType, filename, storageFilename, minimalPdf.length, legacyId],
      );
    }

    for (const [legacyId, studentNo, docType, status, notes, actor] of requests) {
      const reqRow = await runOne(
        `INSERT INTO document_requests (office_id, student_no, doc_type, status, notes, created_by, updated_by, legacy_id)
         VALUES ('registrar',$1,$2,$3,$4,$5,$5,$6)
         ON CONFLICT (office_id, legacy_id) DO UPDATE SET student_no=EXCLUDED.student_no, doc_type=EXCLUDED.doc_type, status=EXCLUDED.status, notes=EXCLUDED.notes, updated_by=EXCLUDED.updated_by, updated_at=NOW()
         RETURNING id`,
        [studentNo, docType, status, notes, actor, legacyId],
      );
      if (reqRow?.id) {
        await run(
          `INSERT INTO transaction_updates (document_request_id, status, message)
           VALUES ($1, $2, $3)`,
          [reqRow.id, status, notes || `Status updated to ${status}`],
        ).catch(() => {});
      }
    }

    for (const [studentNo, title, orgName, eventDate, venue, desc, filename, status, reviewNote] of proposals) {
      const storageFilename = `sample-prop-${filename}`;
      fs.writeFileSync(path.join(osasUploadsDir, storageFilename), minimalPdf);
      const existing = await runOne(`SELECT id FROM event_proposals WHERE title = $1 AND organization_name = $2`, [title, orgName]);
      let propId = existing?.id;
      if (!propId) {
        const reviewedAt = reviewNote ? new Date().toISOString() : null;
        const propRow = await runOne(
          `INSERT INTO event_proposals (
             office_id, student_no, title, organization_name, event_date, venue,
             description, storage_filename, original_filename, mime_type, size_bytes,
             status, review_note, reviewed_at
           )
           VALUES ('osas', $1, $2, $3, $4, $5, $6, $7, $8, 'application/pdf', $9, $10, $11, $12)
           RETURNING id`,
          [studentNo, title, orgName, eventDate, venue, desc, storageFilename, filename, minimalPdf.length, status, reviewNote, reviewedAt],
        );
        propId = propRow?.id;
      } else {
        await run(
          `UPDATE event_proposals
           SET student_no=$1, event_date=$2, venue=$3, description=$4, status=$5, review_note=$6, updated_at=NOW()
           WHERE id=$7`,
          [studentNo, eventDate, venue, desc, status, reviewNote, propId],
        );
      }
      if (propId) {
        await run(
          `INSERT INTO transaction_updates (event_proposal_id, status, message)
           VALUES ($1, $2, $3)`,
          [propId, status, reviewNote || `Proposal submitted for ${orgName}`],
        ).catch(() => {});
      }
    }

    await run(`INSERT INTO global_audit_logs (office_id, actor, role, action, ip) VALUES ('registrar', 'System Administrator', 'Admin', 'Sample data populated (PostgreSQL)', '127.0.0.1')`);

    if (force || !(await runOne("SELECT 1 FROM settings WHERE key = 'storage_layout'"))) {
      await run(`INSERT INTO settings (key, value) VALUES ('storage_layout', $1) ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value, updated_at=NOW()`, [JSON.stringify(buildDefaultStorageLayout())]);
    }
  });

  const [studentCount, documentCount, requestCount, proposalCount, settings] = await Promise.all([
    queryOne("SELECT COUNT(*)::int AS count FROM students"),
    queryOne("SELECT COUNT(*)::int AS count FROM documents"),
    queryOne("SELECT COUNT(*)::int AS count FROM document_requests"),
    queryOne("SELECT COUNT(*)::int AS count FROM event_proposals"),
    queryOne("SELECT value FROM settings WHERE key = 'storage_layout'"),
  ]);
  const layout = settings?.value ? JSON.parse(settings.value) : { rooms: [] };
  const cabinetCount = layout.rooms.reduce((sum, room) => sum + room.cabinets.length, 0);
  const drawerCount = layout.rooms.reduce((sum, room) => sum + room.cabinets.reduce((n, cabinet) => n + cabinet.drawerIds.length, 0), 0);
  const summary = {
    students: Number(studentCount.count),
    documents: Number(documentCount.count),
    requests: Number(requestCount.count),
    proposals: Number(proposalCount?.count || 0),
    rooms: layout.rooms.length,
    cabinets: cabinetCount,
    drawers: drawerCount,
  };
  console.log(`[populate-sample-data] PostgreSQL sample data ready: ${summary.students} students, ${summary.documents} documents, ${summary.requests} requests, ${summary.proposals} proposals, ${summary.rooms} rooms, ${summary.cabinets} cabinets, ${summary.drawers} drawers.`);
  return summary;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  try {
    await seed();
  } catch (error) {
    console.error("[populate-sample-data] Failed:", error);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}
