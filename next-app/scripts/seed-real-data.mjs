import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";

dotenv.config({ path: ".env" });

const { pool, query, queryOne, transaction } = await import("../src/lib/postgres.js");
const { generateDocumentPdfByType } = await import("../src/lib/pdfDocumentGenerators.js");

const CSV_TAXONOMY_PATH = fs.existsSync(path.resolve(process.cwd(), "../_SAMPLE_DATA/registrar_system_data - final.csv"))
  ? path.resolve(process.cwd(), "../_SAMPLE_DATA/registrar_system_data - final.csv")
  : path.resolve(process.cwd(), "../_SAMPLE_DATA/system_data - final.csv");
const CSV_OSAS_PATH = path.resolve(process.cwd(), "../_SAMPLE_DATA/osas_system_data - final.csv");
const CSV_STUDENTS_PATH = path.resolve(process.cwd(), "../_SAMPLE_DATA/cleaned_student_data.csv");
const REAL_PDF_PATH = path.resolve(process.cwd(), "../_SAMPLE_DATA/sample pdf.pdf");
const UPLOADS_DIR = path.resolve(process.cwd(), process.env.LOCAL_DATA_DIR || ".local", "uploads");

function normalizeCourseCode(raw) {
  const c = String(raw || "").trim().toUpperCase();
  if (c === "BSEDUC") return "BSEDEN";
  if (c === "BSPSYCH" || c === "BS PSY" || c === "BSPSY") return "BS Psy";
  if (c === "DIT") return "DICT";
  if (c === "BSBA" || c === "BSBA-FM") return "BSBA-FM";
  if (c === "BSHM") return "BSHM";
  if (c === "BSA") return "BSA";
  if (c === "BSENT") return "BSENT";
  if (c === "BSIT") return "BSIT";
  return c;
}

async function main() {
  console.log("Starting real data population...");
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });

  const realPdfBytes = fs.readFileSync(REAL_PDF_PATH);
  console.log(`Read sample PDF from ${REAL_PDF_PATH} (${(realPdfBytes.length / 1024).toFixed(1)} KB)`);

  // 1. Load taxonomy: Courses, Sections, Document Types
  console.log(`Loading registrar taxonomy from ${path.basename(CSV_TAXONOMY_PATH)}...`);
  const taxContent = fs.readFileSync(CSV_TAXONOMY_PATH, "utf8");
  const taxLines = taxContent.split(/\r?\n/).filter(Boolean);

  // 8 Official Degree Programs for Registrar
  const coursesToInsert = [
    { code: "BSA", name: "Bachelor of Science in Accountancy" },
    { code: "BSEDEN", name: "Bachelor in Secondary Education major in English" },
    { code: "BSENT", name: "Bachelor of Science in Entrepreneurship" },
    { code: "BSBA-FM", name: "Bachelor of Science in Business Education major in Financial Management" },
    { code: "BSIT", name: "Bachelor of Science in Information Technology" },
    { code: "BSHM", name: "Bachelor of Science in Hospitality Management" },
    { code: "BS Psy", name: "Bachelor of Science in Psychology" },
    { code: "DICT", name: "Diploma in Information and Communications Technology" },
  ];

  for (const c of coursesToInsert) {
    await query(
      `INSERT INTO courses (office_id, code, name, status)
       VALUES ('registrar', $1, $2, 'Active')
       ON CONFLICT (office_id, code) DO UPDATE SET name = EXCLUDED.name, status = 'Active'`,
      [c.code, c.name]
    );
  }

  // OSAS office does not handle degree programs or sections
  await query("DELETE FROM courses WHERE office_id = 'osas'");
  await query("DELETE FROM sections WHERE office_id = 'osas'");

  // Insert Registrar document types (strictly the 11 compliance docs)
  for (const line of taxLines.slice(1)) {
    const parts = line.split(",").map(p => p.trim());
    const category = parts[0];
    const name = parts[1];
    const isCompliance = parts[3] === "true";
    const isRequestable = parts[4] === "true";
    const complianceCategory = parts[5] || "General Requirements";

    if (!category || !name) continue;

    if (category.toLowerCase() === "documenttype") {
      const nameNorm = name.toLowerCase();
      await query(
        `INSERT INTO document_types (office_id, name, name_norm, status, is_compliance, is_requestable, compliance_category)
         VALUES ('registrar', $1, $2, 'Active', $3, $4, $5)
         ON CONFLICT (office_id, name_norm) DO UPDATE SET
           name = EXCLUDED.name,
           status = 'Active',
           is_compliance = EXCLUDED.is_compliance,
           is_requestable = EXCLUDED.is_requestable,
           compliance_category = EXCLUDED.compliance_category`,
        [name, nameNorm, isCompliance, isRequestable, complianceCategory]
      );
    }
  }

  // Insert OSAS document types from OSAS CSV (strictly student organization documents)
  if (fs.existsSync(CSV_OSAS_PATH)) {
    console.log(`Loading OSAS taxonomy from ${path.basename(CSV_OSAS_PATH)}...`);
    const osasContent = fs.readFileSync(CSV_OSAS_PATH, "utf8");
    const osasLines = osasContent.split(/\r?\n/).filter(Boolean);
    for (const line of osasLines.slice(1)) {
      const parts = line.split(",").map(p => p.trim());
      const category = parts[0];
      const name = parts[1];
      const isCompliance = parts[3] === "true";
      const isRequestable = parts[4] === "true";
      const complianceCategory = parts[5] || "Student Governance & Activities";

      if (!category || !name) continue;

      if (category.toLowerCase() === "documenttype") {
        const nameNorm = name.toLowerCase();
        await query(
          `INSERT INTO document_types (office_id, name, name_norm, status, is_compliance, is_requestable, compliance_category)
           VALUES ('osas', $1, $2, 'Active', $3, $4, $5)
           ON CONFLICT (office_id, name_norm) DO UPDATE SET
             name = EXCLUDED.name,
             status = 'Active',
             is_compliance = EXCLUDED.is_compliance,
             is_requestable = EXCLUDED.is_requestable,
             compliance_category = EXCLUDED.compliance_category`,
          [name, nameNorm, isCompliance, isRequestable, complianceCategory]
        );
      }
    }
  }

  // Remove individual student requirements from OSAS
  await query(`
    UPDATE document_types
    SET status = 'Archived', is_compliance = FALSE, is_requestable = FALSE
    WHERE office_id = 'osas' AND name_norm IN ('good moral certificate', 'certificate of good moral', 'clearance form', 'student disciplinary clearance')
  `);

  // Insert 64 Registrar Sections (1-1 to 4-2 for 8 degree programs)
  const sectionsToInsert = [];
  for (const line of taxLines.slice(1)) {
    const parts = line.split(",").map(p => p.trim());
    if (parts[0] === "Section" && parts[1] && parts[2]) {
      sectionsToInsert.push({ name: parts[1], course_code: parts[2] });
    }
  }

  for (const s of sectionsToInsert) {
    await query(
      `INSERT INTO sections (office_id, name, course_code, status)
       VALUES ('registrar', $1, $2, 'Active')
       ON CONFLICT (office_id, name, course_code) DO UPDATE SET status = 'Active'`,
      [s.name, s.course_code]
    );
  }

  console.log(`Taxonomy populated: ${coursesToInsert.length} programs, ${sectionsToInsert.length} sections.`);

  // 2. Load Students from cleaned_student_data.csv
  console.log("Loading students from cleaned_student_data.csv...");
  const studentsContent = fs.readFileSync(CSV_STUDENTS_PATH, "utf8");
  const studentLines = studentsContent.split(/\r?\n/).filter(Boolean);

  const studentsList = [];
  const seenStudentNos = new Set();

  for (let i = 1; i < studentLines.length; i++) {
    const cols = studentLines[i].split(",").map(c => c.trim());
    if (cols.length < 8) continue;
    const [rawStudentNo, rawName, rawCourseCode, academicYear, section, room, cabinet, drawer] = cols;
    let studentNo = rawStudentNo.replace(/-(MN|IT)-/gi, "-SJ-");
    if (!studentNo.endsWith("-0") && !studentNo.endsWith("-1")) {
      studentNo = `${studentNo}-0`;
    }

    if (seenStudentNos.has(studentNo)) continue;
    seenStudentNos.add(studentNo);

    const courseCode = normalizeCourseCode(rawCourseCode);

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
        1,
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

  // 3. Create Documents for these students using strictly the 11 Registrar compliance document types
  console.log("Generating realistic compliance documents for digital records review...");

  const docTypeTemplates = [
    { docType: "CAEPUP 2023 Application Form", code: "CAEPUP" },
    { docType: "SAR Form (circled)", code: "SAR" },
    { docType: "Health and Information Sheet", code: "HIS" },
    { docType: "Undertaking and Waiver of Right", code: "UWR" },
    { docType: "CTC Grade 10 Report Card", code: "G10RC" },
    { docType: "CTC Grade 11 Report Card", code: "G11RC" },
    { docType: "Grade 12 Report Card (1st and 2nd Semester)", code: "G12RC" },
    { docType: "SHS Diploma or Certificate of Graduation", code: "DIP" },
    { docType: "Certificate of Good Moral Character", code: "CGMC" },
    { docType: "PSA Birth Certificate (circled)", code: "PSA" },
    { docType: "Photocopy of ID", code: "ID" },
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

    const uniqueStorageName = `real_${student.studentNo}_${template.code}_${Date.now()}.pdf`;
    const targetFilePath = path.join(UPLOADS_DIR, uniqueStorageName);
    const pdfBytes = await generateDocumentPdfByType({
      docType: template.docType,
      studentNo: student.studentNo,
      studentName: student.name,
      courseCode: student.courseCode,
      section: student.section,
      dateStr: "AY 2023-2024",
    });
    fs.writeFileSync(targetFilePath, pdfBytes);

    const docResult = await query(
      `INSERT INTO documents (
        office_id, student_no, student_name, doc_type, original_filename,
        storage_filename, mime_type, size_bytes, approval_status,
        reviewed_by, reviewed_at, review_note, created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW() - ($13 || ' hours')::INTERVAL)
      RETURNING id`,
      [
        "registrar",
        student.studentNo,
        student.name,
        template.docType,
        `${student.studentNo}_${template.code}.pdf`,
        uniqueStorageName,
        "application/pdf",
        pdfBytes.length,
        approvalStatus,
        reviewedBy,
        reviewedAt,
        reviewNote,
        idx * 2,
      ]
    );

    docCount++;
  }

  console.log(`Seeded ${docCount} documents (${pendingCount} Pending, ${approvedCount} Approved, ${declinedCount} Declined).`);
  console.log("Real data seeding completed successfully.");
}

main().catch((err) => {
  console.error("Failed to seed real data:", err);
  process.exit(1);
}).finally(async () => {
  await pool.end();
});
