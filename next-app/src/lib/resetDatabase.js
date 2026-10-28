import { query, queryOne, transaction } from "./postgres.js";
import { createStaff } from "./staffRepo.js";
import { clearHealthCache } from "./healthCache.js";
import { buildDefaultStorageLayout, buildDefaultOsasStorageLayout } from "./storageLayoutDefaults.js";
import { hashPassword } from "./passwordHash.js";
import { encryptPII } from "./piiEncryption.js";
import { invalidateOcrStudentRoster } from "./ocrStudentRoster.js";
import { clearDynamicOffices } from "./roleUtils.js";

/**
 * Wipes all application tables in the database without seeding extra data.
 * Resets departments and stations back to the pristine baseline (registrar & osas).
 * Seeds strictly the 7 default demo accounts (5 personnel + 2 student accounts)
 * and essential system settings (storage layouts, security questions).
 */
export async function resetDatabase({ demoAccountsOnly = false } = {}) {
  invalidateOcrStudentRoster();
  clearDynamicOffices();

  await transaction(async ({ query: txQuery }) => {
    const result = await txQuery(`
      SELECT string_agg(format('%I.%I', schemaname, tablename), ', ' ORDER BY tablename) AS tables
      FROM pg_tables
      WHERE schemaname = 'public'
        AND tablename NOT IN ('schema_migrations', 'modules')
    `);
    if (result.rows[0]?.tables) {
      await txQuery(`TRUNCATE TABLE ${result.rows[0].tables} RESTART IDENTITY CASCADE`);
    }

    // Seed default baseline institutional offices with pristine hardware stations
    await txQuery(`
      INSERT INTO offices (
        id, name, short_name, description, icon, accent_color,
        status, station_name, storage_path, inbound_path, ingest_token,
        scanner_model, last_station_ping, ingest_paused, created_at, updated_at
      ) VALUES
      (
        'registrar',
        'Office of the Registrar',
        'Registrar',
        'Manages student academic records and document requests',
        'ph-bold ph-certificate',
        '#E5484D',
        'Active',
        'REG-ARCHIVE-PC01',
        '.local/storage/registrar/uploads',
        '.local/hot-folder/INBOUND',
        NULL,
        'Fujitsu fi-7160 Batch Duplex',
        NULL,
        FALSE,
        NOW(),
        NOW()
      ),
      (
        'osas',
        'Office of Student Affairs and Services',
        'OSAS',
        'Manages student affairs records and event proposals',
        'ph-bold ph-student',
        '#3B82F6',
        'Active',
        'OSAS-OPERATIONS-PC01',
        '.local/storage/osas/uploads',
        '.local/hot-folder/INBOUND',
        NULL,
        'Canon imageFORMULA Flatbed/ADF',
        NULL,
        FALSE,
        NOW(),
        NOW()
      )
    `);

    // Seed default baseline office_modules
    await txQuery(`
      INSERT INTO office_modules (office_id, module_id, enabled, updated_at)
      SELECT o.id, m.id,
        CASE
          WHEN o.id = 'registrar' AND m.id IN ('osas_monitoring', 'student_organizations') THEN FALSE
          WHEN o.id = 'osas' AND m.id IN ('document_requests', 'request_analytics', 'student_directory') THEN FALSE
          ELSE TRUE
        END,
        NOW()
      FROM offices o
      CROSS JOIN modules m
    `);
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

  // Ensure security questions and pre-seed recovery answers for staff
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

  // 6 & 7. Seed 2 students & student accounts for demo
  const studentHash = hashPassword("student123");
  const demoStudents = [
    ["2022-10001-SJ-0", "DELA CRUZ, JUAN A.", "BSIT", 2024, "BSIT-4A", "student@pup.local"],
    ["2023-00001-SJ-0", "SANTOS, MARIA CLARA L.", "BSIT", 4, "BSIT-4A", "test.student@pup.local"],
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
      `INSERT INTO students (student_no, name, course_code, year_level, section, status, storage_room, storage_cabinet, storage_drawer)
       VALUES ($1, $2, $3, $4, $5, 'Active', 1, 'A', 1)
       ON CONFLICT (student_no) DO UPDATE SET name = EXCLUDED.name, course_code = EXCLUDED.course_code,
         year_level = EXCLUDED.year_level, section = EXCLUDED.section, status = 'Active',
         storage_room = 1, storage_cabinet = 'A', storage_drawer = 1, updated_at = NOW()`,
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
