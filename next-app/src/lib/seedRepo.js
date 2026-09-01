import { dbGet, dbRun, getDb } from "./sqlite";
import { setStorageLayout } from "./storageLayoutRepo";
import { buildDefaultStorageLayout } from "./storageLayoutDefaults";
import { createStudent } from "./studentsRepo";
import { createStaff } from "./staffRepo";
import { createDocument } from "./documentsRepo";
import { officeLocalStorage } from "./officeDb";

// Touch to force recompile of imports
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

/**
 * Helper to run seeding logic in a specific office database context.
 */
async function runInOfficeContext(officeId, fn) {
  return officeLocalStorage.run({ officeId }, fn);
}

/**
 * Main seeding function that seeds global data, then Registrar, then OSAS data.
 */
export async function populateSampleData({ force = false } = {}) {
  // 1. Seed Global Staff Accounts in system.sqlite
  console.log("[seedRepo] Seeding global staff accounts...");
  
  try {
    await createStaff({
      id: "PUPREGISTRAR-002",
      officeId: "registrar",
      fname: "Marcus",
      lname: "Reyes",
      role: "Staff",
      section: "Records",
      status: "Active",
      email: "records.marcus@pup.local",
      password: "pupstaff",
    });
  } catch (e) {
    console.warn("[seedRepo] Skipped Marcus Reyes (may already exist):", e?.message || e);
  }

  try {
    await createStaff({
      id: "PUPREGISTRAR-003",
      officeId: "registrar",
      fname: "Elias",
      lname: "Austria",
      role: "Admin",
      section: "Administrative",
      status: "Active",
      email: "admin.registrar@pup.local",
      password: "pupstaff",
    });
  } catch (e) {
    console.warn("[seedRepo] Skipped Elias Austria (Registrar Admin) (may already exist):", e?.message || e);
  }

  try {
    await createStaff({
      id: "PUPOSAS-001",
      officeId: "osas",
      fname: "Sandra",
      lname: "Gomez",
      role: "Admin",
      section: "OSAS Admin",
      status: "Active",
      email: "admin.osas@pup.local",
      password: "pupstaff",
    });
  } catch (e) {
    console.warn("[seedRepo] Skipped Sandra Gomez (OSAS Admin) (may already exist):", e?.message || e);
  }

  try {
    await createStaff({
      id: "PUPOSAS-002",
      officeId: "osas",
      fname: "Juanito",
      lname: "Rizal",
      role: "Staff",
      section: "Student Affairs",
      status: "Active",
      email: "staff.osas@pup.local",
      password: "pupstaff",
    });
  } catch (e) {
    console.warn("[seedRepo] Skipped Juanito Rizal (OSAS Staff) (may already exist):", e?.message || e);
  }

  // 2. Seed Registrar specific data (registrar/db.sqlite)
  console.log("[seedRepo] Seeding Registrar office database...");
  await runInOfficeContext("registrar", async () => {
    await seedRegistrarOfficeData({ force });
  });

  // 3. Seed OSAS specific data (osas/db.sqlite)
  console.log("[seedRepo] Seeding OSAS office database...");
  await runInOfficeContext("osas", async () => {
    await seedOsasOfficeData({ force });
  });

  return {
    ok: true,
    summary: {
      registrarSeeded: true,
      osasSeeded: true,
    }
  };
}

/**
 * Seeds Registrar-specific tables
 */
async function seedRegistrarOfficeData({ force = false }) {
  const db = await getDb();
  
  // Check if students already exist
  const studentCountRow = await dbGet("SELECT COUNT(*) AS count FROM students");
  const studentCount = studentCountRow?.count || 0;
  
  if (studentCount > 0 && !force) {
    console.log("[seedRepo] Registrar already has students. Skipping...");
    return;
  }

  // 1. Storage Layout
  await setStorageLayout(buildDefaultStorageLayout());

  // 2. Courses
  const courses = [
    ["BSIT", "Bachelor of Science in Information Technology"],
    ["BSCS", "Bachelor of Science in Computer Science"],
  ];
  for (const [code, name] of courses) {
    await dbRun("INSERT INTO courses (code, name) VALUES (?, ?) ON CONFLICT (code) DO NOTHING", [code, name]);
  }

  // 3. Sections
  const sections = [
    ["BSIT-4A", "BSIT"],
    ["BSIT-4B", "BSIT"],
    ["BSCS-3A", "BSCS"],
  ];
  for (const [name, courseCode] of sections) {
    await dbRun("INSERT INTO sections (name, course_code) VALUES (?, ?) ON CONFLICT (name, course_code) DO NOTHING", [
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
    await dbRun("INSERT INTO document_types (name, name_norm) VALUES (?, ?) ON CONFLICT (name) DO NOTHING", [
      name,
      normDocTypeName(name),
    ]);
  }

  // 5. Students
  const students = [
    {
      studentNo: "2022-10001-MN-1",
      name: "DELA CRUZ, JUAN A.",
      courseCode: "BSIT",
      yearLevel: 2024,
      section: "BSIT-4A",
      room: 1,
      cabinet: "2020",
      drawer: 1,
    },
    {
      studentNo: "2022-10002-MN-2",
      name: "SANTOS, MARIA B.",
      courseCode: "BSIT",
      yearLevel: 2024,
      section: "BSIT-4A",
      room: 1,
      cabinet: "2021",
      drawer: 2,
    },
    {
      studentNo: "2023-20003-MN-0",
      name: "REYES, CARLOS C.",
      courseCode: "BSIT",
      yearLevel: 2025,
      section: "BSIT-4B",
      room: 2,
      cabinet: "2022",
      drawer: 3,
    },
    {
      studentNo: "2021-30004-MN-1",
      name: "GARCIA, ANA D.",
      courseCode: "BSCS",
      yearLevel: 2024,
      section: "BSCS-3A",
      room: 3,
      cabinet: "2023",
      drawer: 4,
    },
    {
      studentNo: "2024-40005-MN-2",
      name: "TORRES, LUIS E.",
      courseCode: "BSCS",
      yearLevel: 2025,
      section: "BSCS-3A",
      room: 1,
      cabinet: "2024",
      drawer: 1,
    },
    {
      studentNo: "2020-50006-MN-0",
      name: "FLORES, ELENA F.",
      courseCode: "BSIT",
      yearLevel: 2024,
      section: "BSIT-4B",
      room: 4,
      cabinet: "2025",
      drawer: 2,
    },
  ];

  for (const s of students) {
    const existing = await dbGet("SELECT student_no FROM students WHERE student_no = ?", [s.studentNo]);
    if (!existing) {
      await createStudent(s);
    }
  }

  // 6. Sample Documents
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

  // 7. Document Requests
  await dbRun(
    `INSERT INTO document_requests (
      student_no, doc_type, status, notes, created_by, updated_by
    ) VALUES (?, ?, ?, ?, ?, ?)`,
    [
      "2023-20003-MN-0",
      "Diploma",
      "Pending",
      "Sample: alumni counter request",
      "admin.default@pup.local",
      "admin.default@pup.local",
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

  // 8. Audit Logs
  await dbRun(
    `INSERT INTO audit_logs (actor, role, action, ip) VALUES (?, ?, ?, ?)`,
    ["System Administrator", "Admin", "Registrar sample data populated", "127.0.0.1"],
  );
}

/**
 * Seeds OSAS-specific tables
 */
async function seedOsasOfficeData({ force = false }) {
  const db = await getDb();

  // Check if students already exist
  const studentCountRow = await dbGet("SELECT COUNT(*) AS count FROM students");
  const studentCount = studentCountRow?.count || 0;
  
  if (studentCount > 0 && !force) {
    console.log("[seedRepo] OSAS already has students. Skipping...");
    return;
  }

  // 1. Courses
  const courses = [
    ["BSIT", "Bachelor of Science in Information Technology"],
    ["BSCS", "Bachelor of Science in Computer Science"],
    ["BSA", "Bachelor of Science in Accountancy"],
  ];
  for (const [code, name] of courses) {
    await dbRun("INSERT INTO courses (code, name) VALUES (?, ?) ON CONFLICT (code) DO NOTHING", [code, name]);
  }

  // 2. Sections
  const sections = [
    ["BSIT-4A", "BSIT"],
    ["BSIT-4B", "BSIT"],
    ["BSCS-3A", "BSCS"],
    ["BSA-2A", "BSA"],
  ];
  for (const [name, courseCode] of sections) {
    await dbRun("INSERT INTO sections (name, course_code) VALUES (?, ?) ON CONFLICT (name, course_code) DO NOTHING", [
      name,
      courseCode,
    ]);
  }

  // 3. Document Types (OSAS specific)
  const docTypes = [
    "Good Moral Certificate",
    "Clearance Form",
    "Organization Registration Certificate",
    "Activity Permit",
  ];
  for (const name of docTypes) {
    await dbRun("INSERT INTO document_types (name, name_norm) VALUES (?, ?) ON CONFLICT (name) DO NOTHING", [
      name,
      normDocTypeName(name),
    ]);
  }

  // 4. Students (OSAS-specific simplified schema, room/cabinet/drawer not filled in)
  const students = [
    {
      studentNo: "2022-10001-MN-1",
      name: "DELA CRUZ, JUAN A.",
      courseCode: "BSIT",
      yearLevel: 2024,
      section: "BSIT-4A",
    },
    {
      studentNo: "2022-10002-MN-2",
      name: "SANTOS, MARIA B.",
      courseCode: "BSIT",
      yearLevel: 2024,
      section: "BSIT-4A",
    },
    {
      studentNo: "2023-20003-MN-0",
      name: "REYES, CARLOS C.",
      courseCode: "BSIT",
      yearLevel: 2025,
      section: "BSIT-4B",
    },
    {
      studentNo: "2025-90001-MN-0",
      name: "DE LA ROSA, ANGELA M.",
      courseCode: "BSA",
      yearLevel: 2026,
      section: "BSA-2A",
    }
  ];

  for (const s of students) {
    const existing = await dbGet("SELECT student_no FROM students WHERE student_no = ?", [s.studentNo]);
    if (!existing) {
      await dbRun(
        "INSERT INTO students (student_no, name, course_code, year_level, section, status) VALUES (?, ?, ?, ?, ?, ?)",
        [s.studentNo, s.name.toUpperCase(), s.courseCode, s.yearLevel, s.section, "Active"]
      );
    }
  }

  // 5. Sample Documents
  const docRows = [
    {
      studentNo: "2022-10001-MN-1",
      studentName: "DELA CRUZ, JUAN A.",
      docType: "Good Moral Certificate",
      originalFilename: "juan-good-moral.pdf",
    },
    {
      studentNo: "2022-10002-MN-2",
      studentName: "SANTOS, MARIA B.",
      docType: "Clearance Form",
      originalFilename: "maria-clearance.pdf",
    },
    {
      studentNo: "2025-90001-MN-0",
      studentName: "DE LA ROSA, ANGELA M.",
      docType: "Organization Registration Certificate",
      originalFilename: "angel-org-cert.pdf",
    }
  ];

  for (const d of docRows) {
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

  // 6. Audit Logs
  await dbRun(
    `INSERT INTO audit_logs (actor, role, action, ip) VALUES (?, ?, ?, ?)`,
    ["System Administrator", "Admin", "OSAS sample data populated", "127.0.0.1"],
  );
}
