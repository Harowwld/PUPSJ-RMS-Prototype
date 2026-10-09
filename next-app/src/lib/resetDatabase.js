import { query, queryOne, transaction } from "./postgres.js";
import { createStaff } from "./staffRepo.js";
import { clearHealthCache } from "./healthCache.js";
import { buildDefaultStorageLayout, buildDefaultOsasStorageLayout } from "./storageLayoutDefaults.js";
import { hashPassword } from "./passwordHash.js";
import { encryptPII } from "./piiEncryption.js";
import { invalidateOcrStudentRoster } from "./ocrStudentRoster.js";

export async function resetDatabase() {
  invalidateOcrStudentRoster();
  await transaction(async ({ query: txQuery }) => {
    await txQuery(`TRUNCATE TABLE
      auth_refresh_tokens, auth_sessions, auth_session_versions, auth_session_revocations,
      transaction_updates, event_proposals, document_requests, documents,
      student_identity_link_reviews, student_accounts, student_office_memberships,
      students, student_identity_profiles, staff, global_audit_logs, backups,
      staff_notification_item_states, staff_notification_state, settings
      RESTART IDENTITY CASCADE`);
  });

  const defaultPassword = process.env.DEFAULT_STAFF_PASSWORD || "pupstaff";

  // 1. SuperAdmin (Global)
  await createStaff({
    id: "PUPSUPERADMIN-001",
    officeId: null,
    fname: "System",
    lname: "Administrator",
    role: "SuperAdmin",
    section: "System Administration",
    status: "Active",
    email: "superadmin@pup.local",
    password: defaultPassword,
  });

  // 2. Registrar Admin
  await createStaff({
    id: "PUPREGISTRAR-003",
    officeId: "registrar",
    fname: "Elias",
    lname: "Austria",
    role: "Admin",
    section: "Administrative",
    status: "Active",
    email: "admin.registrar@pup.local",
    password: defaultPassword,
  });

  // 3. Registrar Staff
  await createStaff({
    id: "PUPREGISTRAR-002",
    officeId: "registrar",
    fname: "Marcus",
    lname: "Reyes",
    role: "Staff",
    section: "Records",
    status: "Active",
    email: "staff.registrar@pup.local",
    password: defaultPassword,
  });

  // 4. OSAS Admin
  await createStaff({
    id: "PUPOSAS-001",
    officeId: "osas",
    fname: "Sandra",
    lname: "Gomez",
    role: "Admin",
    section: "OSAS Admin",
    status: "Active",
    email: "admin.osas@pup.local",
    password: defaultPassword,
  });

  // 5. OSAS Staff
  await createStaff({
    id: "PUPOSAS-002",
    officeId: "osas",
    fname: "Juanito",
    lname: "Rizal",
    role: "Staff",
    section: "Student Affairs",
    status: "Active",
    email: "staff.osas@pup.local",
    password: defaultPassword,
  });

  // Baseline courses, sections, and document types
  for (const [code, name] of [
    ["BSIT", "Bachelor of Science in Information Technology"],
    ["BSCS", "Bachelor of Science in Computer Science"],
  ]) {
    await query(
      `INSERT INTO courses (office_id, code, name, status)
       VALUES ('registrar', $1, $2, 'Active')
       ON CONFLICT (office_id, code) DO UPDATE SET name=EXCLUDED.name, status='Active'`,
      [code, name]
    );
  }
  for (const [name, code] of [
    ["BSIT-4A", "BSIT"],
    ["BSIT-4B", "BSIT"],
    ["BSCS-3A", "BSCS"],
  ]) {
    await query(
      `INSERT INTO sections (office_id, name, course_code, status)
       VALUES ('registrar', $1, $2, 'Active')
       ON CONFLICT (office_id, name, course_code) DO UPDATE SET status='Active'`,
      [name, code]
    );
  }
  const registrarDocTypes = [
    { name: "Birth Certificate", isCompliance: true, isRequestable: false, category: "Admission & Identity" },
    { name: "Form 137", isCompliance: true, isRequestable: false, category: "Academic Records" },
    { name: "Grade 12 Report Card", isCompliance: true, isRequestable: false, category: "Academic Records" },
    { name: "Health Information Sheet", isCompliance: true, isRequestable: false, category: "Certificates & Clearances" },
    { name: "Certified True Copy of Records", isCompliance: false, isRequestable: true, category: "Academic Records" },
    { name: "Certificate of Transfer Credentials (Honorable Dismissal)", isCompliance: false, isRequestable: true, category: "Graduation & Exit Records" },
    { name: "Certificate of Enrollment", isCompliance: false, isRequestable: true, category: "Certificates & Clearances" },
    { name: "Certification of Grades (Cross-Enrollee)", isCompliance: false, isRequestable: true, category: "Academic Records" },
    { name: "Transcript of Records", isCompliance: false, isRequestable: true, category: "Academic Records" },
    { name: "Diploma", isCompliance: false, isRequestable: true, category: "Graduation & Exit Records" },
    { name: "Certificate of Graduation", isCompliance: false, isRequestable: true, category: "Graduation & Exit Records" },
  ];
  for (const dt of registrarDocTypes) {
    await query(
      `INSERT INTO document_types (office_id, name, name_norm, status, is_compliance, is_requestable, compliance_category)
       VALUES ('registrar', $1, $2, 'Active', $3, $4, $5)
       ON CONFLICT (office_id, name_norm) DO UPDATE SET
         name = EXCLUDED.name,
         status = 'Active',
         is_compliance = EXCLUDED.is_compliance,
         is_requestable = EXCLUDED.is_requestable,
         compliance_category = EXCLUDED.compliance_category`,
      [dt.name, dt.name.toLowerCase(), dt.isCompliance, dt.isRequestable, dt.category]
    );
  }

  for (const [code, name] of [["BSA", "Bachelor of Science in Accountancy"]]) {
    await query(
      `INSERT INTO courses (office_id, code, name, status)
       VALUES ('osas', $1, $2, 'Active')
       ON CONFLICT (office_id, code) DO UPDATE SET name=EXCLUDED.name, status='Active'`,
      [code, name]
    );
  }
  await query(`DELETE FROM sections WHERE office_id = 'osas'`);
  const osasDocTypes = [
    { name: "Event Proposal", isCompliance: true, isRequestable: false, category: "Student Governance & Activities" },
    { name: "Constitution & By-Laws (CBL)", isCompliance: true, isRequestable: false, category: "Student Governance & Activities" },
    { name: "Activity Request", isCompliance: true, isRequestable: false, category: "Student Governance & Activities" },
    { name: "Financial Liquidation Report", isCompliance: true, isRequestable: false, category: "Student Governance & Activities" },
    { name: "Student Disciplinary Clearance", isCompliance: false, isRequestable: true, category: "Certificates & Clearances" },
    { name: "Organization Registration Certificate", isCompliance: false, isRequestable: true, category: "Certificates & Clearances" },
    { name: "Good Moral Certificate", isCompliance: false, isRequestable: true, category: "Certificates & Clearances" },
    { name: "Clearance Form", isCompliance: true, isRequestable: false, category: "Certificates & Clearances" },
  ];
  for (const dt of osasDocTypes) {
    await query(
      `INSERT INTO document_types (office_id, name, name_norm, status, is_compliance, is_requestable, compliance_category)
       VALUES ('osas', $1, $2, 'Active', $3, $4, $5)
       ON CONFLICT (office_id, name_norm) DO UPDATE SET
         name = EXCLUDED.name,
         status = 'Active',
         is_compliance = EXCLUDED.is_compliance,
         is_requestable = EXCLUDED.is_requestable,
         compliance_category = EXCLUDED.compliance_category`,
      [dt.name, dt.name.toLowerCase(), dt.isCompliance, dt.isRequestable, dt.category]
    );
  }

  // Ensure security questions and pre-seed recovery answers
  const securityQuestions = [
    [1, "What is your mother's maiden name?", true],
    [2, "What was the name of your first school?", true],
    [3, "What is your favorite color?", false],
  ];
  for (const [qid, qtext, req] of securityQuestions) {
    await query(
      `INSERT INTO security_questions (id, question, is_required)
       VALUES ($1, $2, $3)
       ON CONFLICT (id) DO UPDATE SET question = EXCLUDED.question, is_required = EXCLUDED.is_required`,
      [qid, qtext, req]
    );
  }

  const staffIds = ["PUPSUPERADMIN-001", "PUPREGISTRAR-003", "PUPREGISTRAR-002", "PUPOSAS-001", "PUPOSAS-002"];
  const defaultAnswers = [
    [1, "answer1"],
    [2, "answer2"],
    [3, "blue"],
  ];
  for (const staffId of staffIds) {
    for (const [qid, ans] of defaultAnswers) {
      const aHash = hashPassword(ans.toLowerCase());
      await query(
        `INSERT INTO staff_security_answers (staff_id, question_id, answer_hash, updated_at)
         VALUES ($1, $2, $3, NOW())
         ON CONFLICT (staff_id, question_id) DO UPDATE SET answer_hash = EXCLUDED.answer_hash, updated_at = NOW()`,
        [staffId, qid, aHash]
      );
    }
  }

  // Seed students & student accounts for demo
  const studentHash = hashPassword("student123");
  const demoStudents = [
    ["2022-10001-MN-1", "DELA CRUZ, JUAN A.", "BSIT", 2024, "BSIT-4A", "student@pup.local"],
    ["2023-00001-IT-1", "TEST STUDENT", "BSIT", 4, "BSIT-4A", "test.student@pup.local"],
    ["2021-00123-SJ-0", "MARIANO, CEDRICK", "BSIT", 4, "BSIT-4A", "marianocedrick412@gmail.com"],
  ];

  for (const [sNo, sName, cCode, yLevel, sSec, sEmail] of demoStudents) {
    let fName = sName;
    let lName = "";
    let mName = "";
    if (sName.includes(",")) {
      const parts = sName.split(",");
      lName = (parts[0] || "").trim();
      const firstParts = (parts[1] || "").trim().split(" ");
      if (firstParts.length > 1 && firstParts[firstParts.length - 1].length <= 2) {
        mName = firstParts.pop();
      }
      fName = firstParts.join(" ");
    }
    const clientType = cCode === "ALUMNI" || sNo.startsWith("ALUM-") ? "Alumni" : "Student";
    const encryptedName = encryptPII(sName);

    await query(
      `INSERT INTO students (student_no, name, course_code, year_level, section, status)
       VALUES ($1, $2, $3, $4, $5, 'Active')
       ON CONFLICT (student_no) DO UPDATE SET name = EXCLUDED.name, course_code = EXCLUDED.course_code,
         year_level = EXCLUDED.year_level, section = EXCLUDED.section, status = 'Active', updated_at = NOW()`,
      [sNo, encryptedName, cCode, yLevel, sSec]
    );
    await query(
      `INSERT INTO student_office_memberships (student_no, office_id, status)
       VALUES ($1, 'registrar', 'Active')
       ON CONFLICT (student_no, office_id) DO UPDATE SET status = 'Active', updated_at = NOW()`,
      [sNo],
    );
    const profile = await queryOne(
      `UPDATE student_identity_profiles sip
       SET first_name = $1, middle_name = $2, last_name = $3, display_name = $4,
           email = $5, client_type = $6, updated_at = NOW()
       FROM students s
       WHERE s.student_no = $7 AND sip.id = s.identity_profile_id
       RETURNING sip.id`,
      [encryptPII(fName), encryptPII(mName), encryptPII(lName), encryptedName, encryptPII(sEmail.toLowerCase()), clientType, sNo]
    );
    await query(
      `INSERT INTO student_accounts (student_no, identity_profile_id, password_hash, status)
       VALUES ($1, $2, $3, 'Active')
       ON CONFLICT (identity_profile_id) DO UPDATE SET student_no = EXCLUDED.student_no,
         password_hash = EXCLUDED.password_hash, status = 'Active', updated_at = NOW()`,
      [sNo, profile.id, studentHash]
    );
  }

  // Re-seed default storage layouts and record reset timestamp
  const defaultLayout = buildDefaultStorageLayout();
  const defaultOsasLayout = buildDefaultOsasStorageLayout();
  await query(
    `INSERT INTO settings (key, value)
     VALUES ('storage_layout:registrar', $1)
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
    [JSON.stringify(defaultLayout)]
  );
  await query(
    `INSERT INTO settings (key, value)
     VALUES ('storage_layout:osas', $1)
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
    [JSON.stringify(defaultOsasLayout)]
  );
  await query(
    `INSERT INTO settings (key, value)
     VALUES ('last_reset_at', $1)
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
    [new Date().toISOString()]
  );

  clearHealthCache();
  invalidateOcrStudentRoster();
}
