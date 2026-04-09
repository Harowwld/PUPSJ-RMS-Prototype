/**
 * Inserts sample courses, sections, document types, storage layout, students,
 * optional staff, sample PDFs, document requests, and a few audit log rows.
 *
 * Run from next-app/ after DB reset (or on an empty taxonomy):
 *   pnpm populate-sample-data
 *
 * If students already exist, the script exits unless you pass --force.
 * Restart the dev server after running if it was already running (sql.js cache).
 */

import { dbGet, dbRun, getDb, reloadDb } from "../src/lib/sqlite.js";
import { setStorageLayout } from "../src/lib/storageLayoutRepo.js";
import { buildDefaultStorageLayout } from "../src/lib/storageLayoutDefaults.js";
import { createStudent } from "../src/lib/studentsRepo.js";
import { createStaff } from "../src/lib/staffRepo.js";
import { createDocument } from "../src/lib/documentsRepo.js";

const MINIMAL_PDF = Buffer.from(
  [
    "%PDF-1.4",
    "1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj",
    "2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj",
    "3 0 obj<</Type/Page/MediaBox[0 0 612 792]>>endobj",
    "xref",
    "0 4",
    "0000000000 65535 f ",
    "0000000009 00000 n ",
    "0000000052 00000 n ",
    "0000000101 00000 n ",
    "trailer<</Size 4/Root 1 0 R>>",
    "startxref",
    "178",
    "%%EOF",
  ].join("\n"),
);

function normDocTypeName(name) {
  return String(name || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

async function countStudents() {
  const db = await getDb();
  const r = db.exec("SELECT COUNT(*) AS c FROM students");
  const v = r?.[0]?.values?.[0]?.[0];
  return v != null ? Number(v) : 0;
}

async function main() {
  const force = process.argv.includes("--force");
  const n = await countStudents();
  if (n > 0 && !force) {
    console.error(
      `[populate-sample-data] Refusing: ${n} student(s) already in the database. ` +
        "Run reset first, or pass --force (not recommended on non-empty DBs).",
    );
    process.exit(1);
  }

  const bootstrapAdmin = await dbGet("SELECT id FROM staff WHERE id = ?", [
    "admin.eli@pup.local",
  ]);
  if (!bootstrapAdmin) {
    console.error(
      "[populate-sample-data] No default admin (admin.eli@pup.local). " +
        "Run `pnpm reset-db` with the app running, then restart the server, then run this script again.",
    );
    process.exit(1);
  }

  await setStorageLayout(buildDefaultStorageLayout());

  const courses = [
    ["BSIT", "Bachelor of Science in Information Technology"],
    ["BSCS", "Bachelor of Science in Computer Science"],
  ];
  for (const [code, name] of courses) {
    await dbRun("INSERT OR IGNORE INTO courses (code, name) VALUES (?, ?)", [code, name]);
  }

  const sections = [
    ["BSIT-4A", "BSIT"],
    ["BSIT-4B", "BSIT"],
    ["BSCS-3A", "BSCS"],
  ];
  for (const [name, courseCode] of sections) {
    await dbRun("INSERT OR IGNORE INTO sections (name, course_code) VALUES (?, ?)", [
      name,
      courseCode,
    ]);
  }

  const docTypes = [
    "Transcript of Records",
    "Diploma",
    "Certificate of Good Moral",
    "Form 137",
    "Certificate of Enrollment",
  ];
  for (const name of docTypes) {
    await dbRun("INSERT OR IGNORE INTO document_types (name, name_norm) VALUES (?, ?)", [
      name,
      normDocTypeName(name),
    ]);
  }

  try {
    await createStaff({
      id: "records.marcus@pup.local",
      fname: "Marcus",
      lname: "Reyes",
      role: "Staff",
      section: "Records",
      status: "Active",
      email: "records.marcus@pup.local",
      password: "pupstaff",
    });
  } catch (e) {
    console.warn("[populate-sample-data] Skipped sample staff (may already exist):", e?.message || e);
  }

  const students = [
    {
      studentNo: "2022-10001-MN-1",
      name: "DELA CRUZ, JUAN A.",
      courseCode: "BSIT",
      yearLevel: 2024,
      section: "BSIT-4A",
      room: 1,
      cabinet: "A",
      drawer: 1,
    },
    {
      studentNo: "2022-10002-MN-2",
      name: "SANTOS, MARIA B.",
      courseCode: "BSIT",
      yearLevel: 2024,
      section: "BSIT-4A",
      room: 1,
      cabinet: "B",
      drawer: 2,
    },
    {
      studentNo: "2023-20003-MN-0",
      name: "REYES, CARLOS C.",
      courseCode: "BSIT",
      yearLevel: 2025,
      section: "BSIT-4B",
      room: 2,
      cabinet: "C",
      drawer: 3,
    },
    {
      studentNo: "2021-30004-MN-1",
      name: "GARCIA, ANA D.",
      courseCode: "BSCS",
      yearLevel: 2024,
      section: "BSCS-3A",
      room: 3,
      cabinet: "D",
      drawer: 4,
    },
    {
      studentNo: "2024-40005-MN-2",
      name: "TORRES, LUIS E.",
      courseCode: "BSCS",
      yearLevel: 2025,
      section: "BSCS-3A",
      room: 1,
      cabinet: "E",
      drawer: 1,
    },
    {
      studentNo: "2020-50006-MN-0",
      name: "FLORES, ELENA F.",
      courseCode: "BSIT",
      yearLevel: 2024,
      section: "BSIT-4B",
      room: 4,
      cabinet: "F",
      drawer: 2,
    },
  ];

  for (const s of students) {
    await createStudent(s);
  }

  const docRows = [
    {
      studentNo: "2022-10001-MN-1",
      studentName: "DELA CRUZ, JUAN A.",
      docType: "Transcript of Records",
      originalFilename: "sample-tor-juan.pdf",
    },
    {
      studentNo: "2022-10001-MN-1",
      studentName: "DELA CRUZ, JUAN A.",
      docType: "Certificate of Enrollment",
      originalFilename: "sample-coe-juan.pdf",
    },
    {
      studentNo: "2022-10002-MN-2",
      studentName: "SANTOS, MARIA B.",
      docType: "Form 137",
      originalFilename: "sample-form137-maria.pdf",
    },
    {
      studentNo: "2021-30004-MN-1",
      studentName: "GARCIA, ANA D.",
      docType: "Diploma",
      originalFilename: "sample-diploma-ana.pdf",
    },
  ];

  for (const d of docRows) {
    await createDocument({
      studentNo: d.studentNo,
      studentName: d.studentName,
      docType: d.docType,
      originalFilename: d.originalFilename,
      mimeType: "application/pdf",
      sizeBytes: MINIMAL_PDF.length,
      buffer: MINIMAL_PDF,
    });
  }

  await dbRun(
    `INSERT INTO document_requests (
      student_no, doc_type, status, notes, created_by, updated_by
    ) VALUES (?, ?, ?, ?, ?, ?)`,
    [
      "2023-20003-MN-0",
      "Diploma",
      "Pending",
      "Sample: alumni counter request",
      "admin.eli@pup.local",
      "admin.eli@pup.local",
    ],
  );

  await dbRun(
    `INSERT INTO document_requests (
      student_no, doc_type, status, notes, created_by, updated_by
    ) VALUES (?, ?, ?, ?, ?, ?)`,
    [
      "2024-40005-MN-2",
      "Transcript of Records",
      "InProgress",
      "Sample: being prepared",
      "records.marcus@pup.local",
      "records.marcus@pup.local",
    ],
  );

  await dbRun(
    `INSERT INTO audit_logs (actor, role, action, ip) VALUES (?, ?, ?, ?)`,
    ["System Administrator", "Admin", "Sample data populated (script)", "127.0.0.1"],
  );

  await dbRun(
    `INSERT INTO audit_logs (actor, role, action, ip) VALUES (?, ?, ?, ?)`,
    ["Marcus Reyes", "Staff", "Sample audit entry", "127.0.0.1"],
  );

  console.log("[populate-sample-data] Done.");
  console.log(
    "  Logins: admin.eli@pup.local / pupstaff   |   records.marcus@pup.local / pupstaff",
  );
  console.log("[populate-sample-data] Restart the Next.js server if it was running so it reloads the DB file.");
}

main()
  .catch((err) => {
    console.error("[populate-sample-data] Failed:", err?.message || err);
    process.exit(1);
  })
  .finally(() => {
    reloadDb();
  });
