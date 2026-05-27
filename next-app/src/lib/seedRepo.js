import { dbGet, dbRun, getDb } from "./sqlite";
import { setStorageLayout } from "./storageLayoutRepo";
import { buildDefaultStorageLayout } from "./storageLayoutDefaults";
import { createStudent } from "./studentsRepo";
import { createStaff } from "./staffRepo";
import { createDocument } from "./documentsRepo";

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

export async function populateSampleData({ force = false } = {}) {
  const db = await getDb();
  
  // Check if students already exist
  const studentCountRow = await dbGet("SELECT COUNT(*) AS count FROM students");
  const studentCount = studentCountRow?.count || 0;
  
  if (studentCount > 0 && !force) {
    throw new Error(`${studentCount} student(s) already in the database. Use force=true to override.`);
  }

  // Ensure bootstrap admin exists (or skip if we're just seeding data)
  const bootstrapAdmin = await dbGet("SELECT id FROM staff WHERE email = ?", ["admin.eli@pup.local"]);
  if (!bootstrapAdmin) {
    console.warn("[seedRepo] No default admin found. Seeding may be incomplete if staff relationships are required.");
  }

  // 1. Storage Layout
  await setStorageLayout(buildDefaultStorageLayout());

  // 2. Courses
  const courses = [
    ["BSIT", "Bachelor of Science in Information Technology"],
    ["BSCS", "Bachelor of Science in Computer Science"],
  ];
  for (const [code, name] of courses) {
    await dbRun("INSERT OR IGNORE INTO courses (code, name) VALUES (?, ?)", [code, name]);
  }

  // 3. Sections
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

  // 4. Document Types
  const docTypes = [
    "Transcript of Records",
    "Diploma",
    "Certificate of Good Moral",
    "Form 137",
    "Certificate of Enrollment",
    "Birth Certificate",
  ];
  for (const name of docTypes) {
    await dbRun("INSERT OR IGNORE INTO document_types (name, name_norm) VALUES (?, ?)", [
      name,
      normDocTypeName(name),
    ]);
  }

  // 5. Sample Staff
  try {
    await createStaff({
      id: "PUPREGISTRAR-002",
      fname: "Marcus",
      lname: "Reyes",
      role: "Staff",
      section: "Records",
      status: "Active",
      email: "records.marcus@pup.local",
      password: "pupstaff",
    });
  } catch (e) {
    console.warn("[seedRepo] Skipped sample staff (may already exist):", e?.message || e);
  }

  // 6. Students
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
    // Check if student exists before creating to avoid unique constraint error
    const existing = await dbGet("SELECT student_no FROM students WHERE student_no = ?", [s.studentNo]);
    if (!existing) {
      await createStudent(s);
    }
  }

  // 7. Sample Documents
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
    // Check if document already exists to avoid duplicates
    const existing = await dbGet(
      "SELECT id FROM documents WHERE student_no = ? AND doc_type = ? AND original_filename = ?",
      [d.studentNo, d.docType, d.originalFilename]
    );
    if (!existing) {
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
  }

  // 8. Document Requests
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

  // Ready - 85 days old (5 days left)
  const date85DaysAgo = new Date();
  date85DaysAgo.setDate(date85DaysAgo.getDate() - 85);
  const date85Str = date85DaysAgo.toISOString().replace('T', ' ').substring(0, 19);

  await dbRun(
    `INSERT INTO document_requests (
      student_no, doc_type, status, notes, created_by, updated_by, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      "2022-10001-MN-1",
      "Transcript of Records",
      "Ready",
      "Urgent: Alumni pickup requested. Almost due for ODRS shredding (85 days old).",
      "records.marcus@pup.local",
      "records.marcus@pup.local",
      date85Str,
      date85Str,
    ],
  );

  // Ready - 95 days old (Expired / Scheduled for Shredding)
  const date95DaysAgo = new Date();
  date95DaysAgo.setDate(date95DaysAgo.getDate() - 95);
  const date95Str = date95DaysAgo.toISOString().replace('T', ' ').substring(0, 19);

  await dbRun(
    `INSERT INTO document_requests (
      student_no, doc_type, status, notes, created_by, updated_by, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      "2023-20003-MN-0",
      "Certificate of Good Moral",
      "Ready",
      "Expired: Retained past 90 days. Scheduled for secure ODRS shredding.",
      "records.marcus@pup.local",
      "records.marcus@pup.local",
      date95Str,
      date95Str,
    ],
  );

  // Ready - 2 days old (Plenty of time)
  const date2DaysAgo = new Date();
  date2DaysAgo.setDate(date2DaysAgo.getDate() - 2);
  const date2Str = date2DaysAgo.toISOString().replace('T', ' ').substring(0, 19);

  await dbRun(
    `INSERT INTO document_requests (
      student_no, doc_type, status, notes, created_by, updated_by, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      "2021-30004-MN-1",
      "Diploma",
      "Ready",
      "Processed and ready for pickup.",
      "records.marcus@pup.local",
      "records.marcus@pup.local",
      date2Str,
      date2Str,
    ],
  );

  // 9. Audit Logs
  await dbRun(
    `INSERT INTO audit_logs (actor, role, action, ip) VALUES (?, ?, ?, ?)`,
    ["System Administrator", "Admin", "Sample data populated (API)", "127.0.0.1"],
  );

  return {
    ok: true,
    summary: {
      students: students.length,
      documents: docRows.length,
      requests: 2
    }
  };
}
