import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config();

const { pool, query, queryOne, transaction } = await import("../src/lib/postgres.js");

const CSV_TAXONOMY_PATH = path.resolve(process.cwd(), "../_SAMPLE_DATA/system_data - final.csv");
const CSV_STUDENTS_PATH = path.resolve(process.cwd(), "../_SAMPLE_DATA/cleaned_student_data.csv");
const REAL_PDF_PATH = path.resolve(process.cwd(), "../_SAMPLE_DATA/sample pdf.pdf");
const UPLOADS_DIR = path.resolve(process.cwd(), process.env.LOCAL_DATA_DIR || ".local", "uploads");

async function main() {
  console.log("Starting real data population...");
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });

  const realPdfBytes = fs.readFileSync(REAL_PDF_PATH);
  console.log(`Read sample PDF from ${REAL_PDF_PATH} (${(realPdfBytes.length / 1024).toFixed(1)} KB)`);

  // 1. Load taxonomy: Courses, Sections, Document Types
  console.log("Loading taxonomy from system_data - final.csv...");
  const taxContent = fs.readFileSync(CSV_TAXONOMY_PATH, "utf8");
  const taxLines = taxContent.split(/\r?\n/).filter(Boolean);

  const coursesToInsert = [
    { code: "BSIT", name: "Bachelor of Science in Information Technology" },
    { code: "BSCS", name: "Bachelor of Science in Computer Science" },
    { code: "BSBA-FM", name: "Bachelor of Science in Business Administration major in Financial Management" },
    { code: "BSENT", name: "Bachelor of Science in Entrepreneurship" },
    { code: "BSPsych", name: "Bachelor of Science in Psychology" },
    { code: "BSEDUC", name: "Bachelor in Secondary Education major in English" },
    { code: "DIT", name: "Diploma in Information Technology" },
  ];

  for (const c of coursesToInsert) {
    await query(
      `INSERT INTO courses (office_id, code, name, status)
       VALUES ('registrar', $1, $2, 'Active')
       ON CONFLICT (office_id, code) DO UPDATE SET name = EXCLUDED.name, status = 'Active'`,
      [c.code, c.name]
    );
  }

  const docTypesToInsert = [
    "CAEPUP Application Form",
    "SAR Form",
    "Health and Information Sheet",
    "Undertaking and Waiver of Right",
    "CTC Grade 10 Report Card",
    "CTC Grade 11 Report Card",
    "Grade 12 Report Card",
    "Certification of Graduation",
    "Certificate of Good Moral Character",
    "PSA Birth Certificate",
    "Diploma",
    "Form 137",
    "Transcript of Records",
    "Certificate of Enrollment",
  ];

  for (const dt of docTypesToInsert) {
    await query(
      `INSERT INTO document_types (office_id, name, name_norm, status)
       VALUES ('registrar', $1, $2, 'Active')
       ON CONFLICT (office_id, name_norm) DO UPDATE SET name = EXCLUDED.name, status = 'Active'`,
      [dt, dt.toLowerCase()]
    );
  }

  // Sections
  const sectionsToInsert = [];
  for (const line of taxLines.slice(1)) {
    const parts = line.split(",").map(p => p.trim());
    if (parts[0] === "Section" && parts[1] && parts[2]) {
      sectionsToInsert.push({ name: parts[1], course_code: parts[2] });
    }
  }
  // Standard sections for IT and CS if not in csv
  for (const s of ["1-1", "1-2", "2-1", "2-2", "3-1", "3-2", "4-1", "4-2"]) {
    sectionsToInsert.push({ name: s, course_code: "BSIT" });
    sectionsToInsert.push({ name: s, course_code: "BSCS" });
  }

  for (const s of sectionsToInsert) {
    await query(
      `INSERT INTO sections (office_id, name, course_code, status)
       VALUES ('registrar', $1, $2, 'Active')
       ON CONFLICT (office_id, name, course_code) DO UPDATE SET status = 'Active'`,
      [s.name, s.course_code]
    );
  }

  console.log("Taxonomy populated.");

  // 2. Load Students from cleaned_student_data.csv
  console.log("Loading students from cleaned_student_data.csv...");
  const studentsContent = fs.readFileSync(CSV_STUDENTS_PATH, "utf8");
  const studentLines = studentsContent.split(/\r?\n/).filter(Boolean);

  const studentsList = [];
  const seenStudentNos = new Set();

  for (let i = 1; i < studentLines.length; i++) {
    const cols = studentLines[i].split(",").map(c => c.trim());
    if (cols.length < 8) continue;
    const [studentNo, rawName, courseCode, academicYear, section, room, cabinet, drawer] = cols;

    if (seenStudentNos.has(studentNo)) continue;
    seenStudentNos.add(studentNo);

    // Format student name to "LASTNAME, FIRSTNAME M."
    const words = rawName.toUpperCase().split(/\s+/).filter(Boolean);
    let lastName = "";
    let restWords = [];

    if (words[0] === "DEL" && words[1] === "ROSARIO") {
      lastName = "DEL ROSARIO";
      restWords = words.slice(2);
    } else if (words[0] === "DE" && words[1] === "LEON") {
      lastName = "DE LEON";
      restWords = words.slice(2);
    } else if (words[0] === "DELA" && (words[1] === "PENA" || words[1] === "PEÑA")) {
      lastName = "DELA PEÑA";
      restWords = words.slice(2);
    } else if (words[0] === "DE" || words[0] === "DEL" || words[0] === "DELA") {
      lastName = words.slice(0, 2).join(" ");
      restWords = words.slice(2);
    } else {
      lastName = words[0];
      restWords = words.slice(1);
    }

    let firstName = restWords.join(" ");
    let mi = "";
    if (restWords.length > 1 && restWords[restWords.length - 1].length === 1) {
      mi = restWords.pop() + ".";
      firstName = restWords.join(" ");
    }
    const formattedName = `${lastName}, ${firstName}${mi ? " " + mi : ""}`;

    await query(
      `INSERT INTO students (student_no, name, course_code, year_level, section, status, storage_room, storage_cabinet, storage_drawer)
       VALUES ($1, $2, $3, $4, $5, 'Active', $6, $7, $8)
       ON CONFLICT (student_no) DO UPDATE SET
         name = EXCLUDED.name,
         course_code = EXCLUDED.course_code,
         year_level = EXCLUDED.year_level,
         section = EXCLUDED.section,
         status = 'Active',
         storage_room = EXCLUDED.storage_room,
         storage_cabinet = EXCLUDED.storage_cabinet,
         storage_drawer = EXCLUDED.storage_drawer,
         updated_at = NOW()`,
      [
        studentNo,
        formattedName,
        courseCode,
        parseInt(academicYear, 10) || 2024,
        section,
        parseInt(room, 10) || 1,
        cabinet || "A",
        parseInt(drawer, 10) || 1,
      ]
    );

    await query(
      `INSERT INTO student_office_memberships (student_no, office_id, status)
       VALUES ($1, 'registrar', 'Active')
       ON CONFLICT (student_no, office_id) DO UPDATE SET status = 'Active', updated_at = NOW()`,
      [studentNo]
    );

    studentsList.push({
      studentNo,
      name: formattedName,
      courseCode,
      section,
    });
  }

  console.log(`Loaded ${studentsList.length} real students from CSV.`);

  // 3. Create Documents for these students
  console.log("Generating realistic documents for digital records review...");

  const docTypeTemplates = [
    { docType: "Transcript of Records", code: "TOR" },
    { docType: "Form 137", code: "F137" },
    { docType: "PSA Birth Certificate", code: "PSA" },
    { docType: "Diploma", code: "DIPLOMA" },
    { docType: "Certificate of Good Moral Character", code: "CGMC" },
    { docType: "Certificate of Enrollment", code: "COE" },
    { docType: "Grade 12 Report Card", code: "G12RC" },
  ];

  // Distribute approval statuses
  let docCount = 0;
  let pendingCount = 0;
  let approvedCount = 0;
  let declinedCount = 0;

  for (let idx = 0; idx < Math.min(studentsList.length, 30); idx++) {
    const student = studentsList[idx];
    const template = docTypeTemplates[idx % docTypeTemplates.length];
    
    let approvalStatus = "Pending";
    let reviewedBy = null;
    let reviewedAt = null;
    let reviewNote = null;

    if (idx >= 18 && idx < 24) {
      approvalStatus = "Approved";
      reviewedBy = "PUPREGISTRAR-003";
      reviewedAt = new Date(Date.now() - (idx * 3600000)).toISOString();
      reviewNote = "Legible copy, complete student details verified.";
      approvedCount++;
    } else if (idx >= 24 && idx < 28) {
      approvalStatus = "Declined";
      reviewedBy = "PUPREGISTRAR-003";
      reviewedAt = new Date(Date.now() - (idx * 3600000)).toISOString();
      reviewNote = "Scan is too blurry; registrar seal cannot be verified.";
      declinedCount++;
    } else {
      pendingCount++;
    }

    const safeStudentNo = student.studentNo.replace(/[^A-Za-z0-9_-]/g, "_");
    const originalFilename = `${safeStudentNo}_${template.code}.pdf`;
    const storageFilename = `doc_${safeStudentNo}_${template.code}_${Date.now()}_${idx}.pdf`;

    // Write real PDF file to uploads
    fs.writeFileSync(path.join(UPLOADS_DIR, storageFilename), realPdfBytes);

    await query(
      `INSERT INTO documents (
         office_id, student_no, student_name, doc_type,
         original_filename, storage_filename, mime_type, size_bytes,
         approval_status, reviewed_by, reviewed_at, review_note, is_previewed, created_at
       )
       VALUES ('registrar', $1, $2, $3, $4, $5, 'application/pdf', $6, $7, $8, $9, $10, FALSE, NOW() - interval '${idx * 2} hours')`,
      [
        student.studentNo,
        student.name,
        template.docType,
        originalFilename,
        storageFilename,
        realPdfBytes.length,
        approvalStatus,
        reviewedBy,
        reviewedAt,
        reviewNote,
      ]
    );

    docCount++;
  }

  console.log(`Created ${docCount} real documents (Pending: ${pendingCount}, Approved: ${approvedCount}, Declined: ${declinedCount}).`);

  // 4. Create realistic document requests
  const requestTypes = [
    { docType: "Transcript of Records", note: "Required for job application and background investigation" },
    { docType: "Diploma", note: "Certified true copy for board exam registration" },
    { docType: "Certificate of Enrollment", note: "Scholarship renewal requirement" },
    { docType: "Certificate of Good Moral Character", note: "For transfer credentials" },
    { docType: "Form 137", note: "Secondary school records request" },
  ];

  const reqStatuses = ["Pending", "InProgress", "Ready", "Completed", "Pending", "InProgress"];

  for (let rIdx = 0; rIdx < 10; rIdx++) {
    const student = studentsList[rIdx % studentsList.length];
    const reqInfo = requestTypes[rIdx % requestTypes.length];
    const status = reqStatuses[rIdx % reqStatuses.length];

    await query(
      `INSERT INTO document_requests (
         office_id, student_no, doc_type, status, notes,
         created_by, updated_by, created_at, updated_at
       )
       VALUES ('registrar', $1, $2, $3, $4, 'PUPREGISTRAR-002', 'PUPREGISTRAR-003', NOW() - interval '${rIdx * 5} hours', NOW())`,
      [student.studentNo, reqInfo.docType, status, reqInfo.note]
    );
  }

  console.log("Document requests created.");
  console.log("Real data seeding complete!");
  process.exit(0);
}

main().catch(err => {
  console.error("Failed to seed real data:", err);
  process.exit(1);
});
