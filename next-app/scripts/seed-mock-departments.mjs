import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

dotenv.config({ path: ".env.local" });
dotenv.config();

const { query, queryOne } = await import("../src/lib/postgres.js");
const { hashPassword } = await import("../src/lib/passwordHash.js");
const { encryptPII } = await import("../src/lib/piiEncryption.js");

const defaultPassword = process.env.DEFAULT_STAFF_PASSWORD || "pupstaff";
const defaultPasswordHash = hashPassword(defaultPassword);

async function generateSamplePdf({ title, subtitle, docNumber, dateStr, amountStr, category, notes, approvedBy }) {
  const doc = await PDFDocument.create();
  const page = doc.addPage([595.28, 841.89]); // A4
  const fontRegular = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const fontOblique = await doc.embedFont(StandardFonts.HelveticaOblique);

  const maroon = rgb(128 / 255, 0, 0);
  const darkGray = rgb(31 / 255, 41 / 255, 55 / 255);
  const mediumGray = rgb(107 / 255, 114 / 255, 128 / 255);
  const lightGray = rgb(243 / 255, 244 / 255, 246 / 255);
  const borderGray = rgb(229 / 255, 231 / 255, 235 / 255);
  const green = rgb(21 / 255, 128 / 255, 61 / 255);

  // Top header banner
  page.drawRectangle({
    x: 40,
    y: 775,
    width: 515,
    height: 3,
    color: maroon,
  });

  // Institution title
  page.drawText("POLYTECHNIC UNIVERSITY OF THE PHILIPPINES", {
    x: 40,
    y: 755,
    size: 13,
    font: fontBold,
    color: maroon,
  });
  page.drawText("SAN JUAN CAMPUS · FINANCIAL SERVICES & ACCOUNTING OFFICE", {
    x: 40,
    y: 742,
    size: 9,
    font: fontRegular,
    color: mediumGray,
  });

  // Document Badge
  page.drawRectangle({
    x: 40,
    y: 690,
    width: 515,
    height: 38,
    color: lightGray,
    borderColor: borderGray,
    borderWidth: 1,
  });

  page.drawText(title.toUpperCase(), {
    x: 52,
    y: 708,
    size: 13,
    font: fontBold,
    color: darkGray,
  });

  page.drawText(subtitle || "Official Digitized Electronic Copy", {
    x: 52,
    y: 697,
    size: 8,
    font: fontRegular,
    color: mediumGray,
  });

  // Tracking Box
  page.drawText(`REF NO: ${docNumber}`, {
    x: 410,
    y: 708,
    size: 9,
    font: fontBold,
    color: maroon,
  });
  page.drawText(`DATE: ${dateStr}`, {
    x: 410,
    y: 697,
    size: 8,
    font: fontRegular,
    color: darkGray,
  });

  // Details Grid
  const drawRow = (label, val, y, isBoldVal = false) => {
    page.drawText(label, { x: 50, y, size: 9, font: fontBold, color: mediumGray });
    page.drawText(val, { x: 190, y, size: 9.5, font: isBoldVal ? fontBold : fontRegular, color: darkGray });
    page.drawLine({ start: { x: 50, y: y - 6 }, end: { x: 555, y: y - 6 }, thickness: 0.5, color: borderGray });
  };

  let curY = 660;
  drawRow("Classification Category:", category, curY);
  curY -= 28;
  drawRow("Transaction Reference:", docNumber, curY, true);
  curY -= 28;
  drawRow("Posting / Effective Date:", dateStr, curY);
  curY -= 28;
  if (amountStr) {
    drawRow("Total Amount Involved:", amountStr, curY, true);
    curY -= 28;
  }
  drawRow("Archival Processing Mode:", "Pure Digital Repository (Zero Physical Storage)", curY);
  curY -= 28;
  drawRow("Digital Ingest Workstation:", "ACCT-DIGISCAN-01 (Duplex Production Scanner)", curY);
  curY -= 35;

  // Notes Box
  page.drawText("TRANSACTION SUMMARY & PARTICULARS", { x: 50, y: curY, size: 9.5, font: fontBold, color: maroon });
  curY -= 12;
  page.drawRectangle({
    x: 45,
    y: curY - 70,
    width: 510,
    height: 70,
    color: rgb(250 / 255, 250 / 255, 250 / 255),
    borderColor: borderGray,
    borderWidth: 0.5,
  });

  page.drawText(notes || "General university accounting ledger record, certified correct by accounting officer.", {
    x: 55,
    y: curY - 20,
    size: 8.5,
    font: fontRegular,
    color: darkGray,
  });
  curY -= 90;

  // Signatures Box
  page.drawRectangle({
    x: 45,
    y: curY - 95,
    width: 510,
    height: 95,
    color: rgb(1, 1, 1),
    borderColor: borderGray,
    borderWidth: 1,
  });

  page.drawText("ACCOUNTING CERTIFICATION & CLEARANCE", { x: 55, y: curY - 18, size: 8.5, font: fontBold, color: darkGray });

  page.drawLine({ start: { x: 60, y: curY - 65 }, end: { x: 230, y: curY - 65 }, thickness: 1, color: darkGray });
  page.drawText("DANIELLE MORALES", { x: 80, y: curY - 60, size: 8.5, font: fontBold, color: darkGray });
  page.drawText("Financial Ingestion Specialist", { x: 80, y: curY - 76, size: 7.5, font: fontRegular, color: mediumGray });

  page.drawLine({ start: { x: 310, y: curY - 65 }, end: { x: 490, y: curY - 65 }, thickness: 1, color: darkGray });
  page.drawText(approvedBy || "CARMELA SANTOS, CPA", { x: 330, y: curY - 60, size: 8.5, font: fontBold, color: maroon });
  page.drawText("Chief Accountant / Office Head", { x: 340, y: curY - 76, size: 7.5, font: fontRegular, color: mediumGray });

  // Security Footer
  page.drawText("Document authenticity certified electronically via PUP San Juan RMS · Pure Digital Archive · Confidential", {
    x: 50,
    y: 35,
    size: 7,
    font: fontOblique,
    color: mediumGray,
  });

  return Buffer.from(await doc.save());
}

async function main() {
  console.log("=== SEEDING MOCK DEPARTMENTS & STATIONS ===");

  // 1. Ensure Table Columns exist
  await query(`
    ALTER TABLE offices ADD COLUMN IF NOT EXISTS station_name TEXT;
    ALTER TABLE offices ADD COLUMN IF NOT EXISTS storage_path TEXT;
    ALTER TABLE offices ADD COLUMN IF NOT EXISTS ingest_token TEXT;
    ALTER TABLE offices ADD COLUMN IF NOT EXISTS scanner_model TEXT;
    ALTER TABLE offices ADD COLUMN IF NOT EXISTS last_station_ping TIMESTAMPTZ;
    ALTER TABLE offices ADD COLUMN IF NOT EXISTS inbound_path TEXT;
  `);

  // 2. Upsert Accounting Department (Pure Digitization Office without Storage Layout)
  console.log("\n[1/6] Registering Accounting Office (Pure Digitization)...");
  await query(`
    INSERT INTO offices (
      id, name, short_name, description, icon, accent_color,
      station_name, storage_path, inbound_path, ingest_token, scanner_model,
      last_station_ping, status
    ) VALUES (
      'accounting',
      'Accounting and Financial Services Office',
      'Accounting',
      'Manages institutional financial disbursements, fee assessments, student accounts, and procurement vouchers via an end-to-end paperless digital repository.',
      'ti ti-calculator',
      '#15803d',
      'ACCT-DIGISCAN-01',
      '.local/storage/accounting/uploads',
      '.local/hot-folder/INBOUND/ACCOUNTING',
      'token_acct_84920412e8',
      'Fujitsu fi-8170 Duplex Production Scanner (600 DPI / 90 PPM)',
      NOW(),
      'Active'
    ) ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      short_name = EXCLUDED.short_name,
      description = EXCLUDED.description,
      icon = EXCLUDED.icon,
      accent_color = EXCLUDED.accent_color,
      station_name = EXCLUDED.station_name,
      storage_path = EXCLUDED.storage_path,
      inbound_path = EXCLUDED.inbound_path,
      ingest_token = EXCLUDED.ingest_token,
      scanner_model = EXCLUDED.scanner_model,
      last_station_ping = NOW(),
      status = 'Active';
  `);

  // 3. Upsert Admissions Department
  console.log("[2/6] Registering Admissions Office...");
  await query(`
    INSERT INTO offices (
      id, name, short_name, description, icon, accent_color,
      station_name, storage_path, inbound_path, ingest_token, scanner_model,
      last_station_ping, status
    ) VALUES (
      'admissions',
      'Office of Admissions and Testing',
      'Admissions',
      'Processes incoming student applications, CAEPUP entrance examination score evaluations, and high school academic qualification records.',
      'ti ti-user-check',
      '#7c3aed',
      'ADM-SCAN-01',
      '.local/storage/admissions/uploads',
      '.local/hot-folder/INBOUND/ADMISSIONS',
      'token_admissions_31f9b8c0',
      'Canon imageFORMULA DR-M160II High-Speed Document Scanner',
      NOW(),
      'Active'
    ) ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      short_name = EXCLUDED.short_name,
      description = EXCLUDED.description,
      icon = EXCLUDED.icon,
      accent_color = EXCLUDED.accent_color,
      station_name = EXCLUDED.station_name,
      storage_path = EXCLUDED.storage_path,
      inbound_path = EXCLUDED.inbound_path,
      ingest_token = EXCLUDED.ingest_token,
      scanner_model = EXCLUDED.scanner_model,
      last_station_ping = NOW(),
      status = 'Active';
  `);

  // 4. Configure Module Matrix for Accounting:
  // DIGITIZATION IS FULLY ENABLED, BUT STORAGE LAYOUT, STORAGE EXPLORER, AND RECORDS ARCHIVE ARE DISABLED!
  console.log("\n[3/6] Configuring Module Matrix for Accounting (Disabling Storage Layout)...");
  const allModules = await query("SELECT id, is_system FROM modules");

  const accountingModules = {
    // Digitization Suite: ENABLED
    scan_upload: true,
    records_review: true,
    documents: true,
    compliance_analytics: true,
    system_config: true,
    staff_directory: true,
    backup: true,
    audit_logs: true,
    notifications: true,

    // Physical Storage Suite: DISABLED (Pure Digital Archive)
    storage_layout: false,
    storage_explorer: false,
    records_archive: false,

    // Student Services / ODRS: DISABLED
    document_requests: false,
    request_analytics: false,
    student_directory: false,
    student_organizations: false,
    osas_monitoring: false,
  };

  for (const m of allModules) {
    const isEnabled = accountingModules[m.id] !== undefined ? accountingModules[m.id] : Boolean(m.is_system);
    await query(`
      INSERT INTO office_modules (office_id, module_id, enabled, updated_at)
      VALUES ('accounting', $1, $2, NOW())
      ON CONFLICT (office_id, module_id) DO UPDATE SET
        enabled = EXCLUDED.enabled,
        updated_at = NOW()
    `, [m.id, isEnabled]);
  }

  // Also configure Admissions modules (Digitization without storage layout)
  const admissionsModules = {
    scan_upload: true,
    records_review: true,
    documents: true,
    compliance_analytics: true,
    system_config: true,
    staff_directory: true,
    backup: true,
    audit_logs: true,
    notifications: true,
    storage_layout: false,
    storage_explorer: false,
    records_archive: false,
    document_requests: false,
    request_analytics: false,
    student_directory: true, // Needs student lookup
    student_organizations: false,
    osas_monitoring: false,
  };

  for (const m of allModules) {
    const isEnabled = admissionsModules[m.id] !== undefined ? admissionsModules[m.id] : Boolean(m.is_system);
    await query(`
      INSERT INTO office_modules (office_id, module_id, enabled, updated_at)
      VALUES ('admissions', $1, $2, NOW())
      ON CONFLICT (office_id, module_id) DO UPDATE SET
        enabled = EXCLUDED.enabled,
        updated_at = NOW()
    `, [m.id, isEnabled]);
  }

  // 5. Seed Staff Accounts for Accounting
  console.log("\n[4/6] Seeding Personnel Accounts for Accounting...");
  const accountingStaff = [
    {
      id: "PUPACCOUNTING-001",
      office_id: "accounting",
      fname: "Carmela",
      lname: "Santos",
      role: "Admin",
      section: "Administrative",
      email: "admin.accounting@pup.local",
    },
    {
      id: "PUPACCOUNTING-002",
      office_id: "accounting",
      fname: "Danielle",
      lname: "Morales",
      role: "Staff",
      section: "Disbursement & Invoicing",
      email: "staff.accounting@pup.local",
    },
    {
      id: "PUPADMISSIONS-001",
      office_id: "admissions",
      fname: "Eduardo",
      lname: "Torres",
      role: "Admin",
      section: "Administrative",
      email: "admin.admissions@pup.local",
    },
    {
      id: "PUPADMISSIONS-002",
      office_id: "admissions",
      fname: "Clarissa",
      lname: "Mendoza",
      role: "Staff",
      section: "Applicant Intake & Testing",
      email: "staff.admissions@pup.local",
    },
  ];

  for (const s of accountingStaff) {
    await query(`
      INSERT INTO staff (
        id, office_id, fname, lname, role, section, status,
        email, password_hash, password_last_changed, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, 'Active',
        $7, $8, NOW(), NOW()
      ) ON CONFLICT (id) DO UPDATE SET
        office_id = EXCLUDED.office_id,
        fname = EXCLUDED.fname,
        lname = EXCLUDED.lname,
        role = EXCLUDED.role,
        section = EXCLUDED.section,
        status = 'Active',
        email = EXCLUDED.email,
        password_hash = EXCLUDED.password_hash,
        updated_at = NOW();
    `, [
      s.id,
      s.office_id,
      encryptPII(s.fname),
      encryptPII(s.lname),
      s.role,
      s.section,
      encryptPII(s.email.toLowerCase()),
      defaultPasswordHash,
    ]);
  }

  // 6. Seed Accounting Document Types
  console.log("\n[5/6] Seeding Accounting & Admissions Document Types...");
  const accountingDocTypes = [
    { name: "Disbursement Voucher", isComp: true, isReq: false, cat: "Disbursements & Payables" },
    { name: "Official Receipt (OR)", isComp: true, isReq: false, cat: "Revenue & Collections" },
    { name: "Purchase Order (PO)", isComp: true, isReq: false, cat: "Procurement & Assets" },
    { name: "Certificate of Full Payment", isComp: false, isReq: true, cat: "Student Billing & Clearances" },
    { name: "Tuition Fee Assessment Form", isComp: true, isReq: false, cat: "Student Billing & Clearances" },
    { name: "Budget Liquidation Report", isComp: true, isReq: false, cat: "Disbursements & Payables" },
  ];

  for (const dt of accountingDocTypes) {
    await query(`
      INSERT INTO document_types (office_id, name, name_norm, status, is_compliance, is_requestable, compliance_category)
      VALUES ('accounting', $1, $2, 'Active', $3, $4, $5)
      ON CONFLICT (office_id, name_norm) DO UPDATE SET
        name = EXCLUDED.name,
        status = 'Active',
        is_compliance = EXCLUDED.is_compliance,
        is_requestable = EXCLUDED.is_requestable,
        compliance_category = EXCLUDED.compliance_category;
    `, [dt.name, dt.name.toLowerCase(), dt.isComp, dt.isReq, dt.cat]);
  }

  const admissionsDocTypes = [
    { name: "CAEPUP Application Slip", isComp: true, isReq: false, cat: "Application & Identity" },
    { name: "Entrance Exam Test Permit", isComp: true, isReq: false, cat: "Application & Identity" },
    { name: "High School General Average Certification", isComp: true, isReq: false, cat: "Academic Qualifications" },
    { name: "Certificate of Non-Enrollment", isComp: true, isReq: false, cat: "Academic Qualifications" },
  ];

  for (const dt of admissionsDocTypes) {
    await query(`
      INSERT INTO document_types (office_id, name, name_norm, status, is_compliance, is_requestable, compliance_category)
      VALUES ('admissions', $1, $2, 'Active', $3, $4, $5)
      ON CONFLICT (office_id, name_norm) DO UPDATE SET
        name = EXCLUDED.name,
        status = 'Active',
        is_compliance = EXCLUDED.is_compliance,
        is_requestable = EXCLUDED.is_requestable,
        compliance_category = EXCLUDED.compliance_category;
    `, [dt.name, dt.name.toLowerCase(), dt.isComp, dt.isReq, dt.cat]);
  }

  // 7. Map students into student_office_memberships for accounting and admissions
  console.log("\n[6/6] Linking Students to Accounting and Admissions Office Memberships...");
  await query(`
    INSERT INTO student_office_memberships (student_no, office_id, status)
    SELECT student_no, 'accounting', 'Active'
    FROM students
    ON CONFLICT (student_no, office_id) DO NOTHING;
  `);

  await query(`
    INSERT INTO student_office_memberships (student_no, office_id, status)
    SELECT student_no, 'admissions', 'Active'
    FROM students
    ON CONFLICT (student_no, office_id) DO NOTHING;
  `);

  // 8. Create Realistic Sample PDFs & Ingested Document Records
  console.log("\nGenerating sample digitized PDFs for Accounting in .local/storage/accounting/uploads...");
  const uploadDir = path.resolve(process.cwd(), ".local/storage/accounting/uploads");
  const hotFolderDir = path.resolve(process.cwd(), ".local/hot-folder/INBOUND/ACCOUNTING");
  fs.mkdirSync(uploadDir, { recursive: true });
  fs.mkdirSync(hotFolderDir, { recursive: true });

  const sampleDocs = [
    {
      studentNo: "2022-10001-MN-1",
      studentName: "DELA CRUZ, JUAN A.",
      docType: "Disbursement Voucher",
      title: "Disbursement Voucher (DV-2026-0814)",
      subtitle: "University Capital Expenditure & IT Lab Upgrades",
      docNumber: "DV-2026-0814",
      dateStr: "2026-09-28",
      amountStr: "PHP 145,800.00",
      category: "Disbursements & Payables",
      notes: "Payment for delivery and installation of 40 high-speed dual-band network access points and server rack equipment for Computer Laboratory 3.",
      approvalStatus: "Approved",
      reviewedBy: "PUPACCOUNTING-001",
      reviewNote: "Verified against procurement purchase order, delivery receipts, and inspection acceptance committee report. Approved for treasury release.",
    },
    {
      studentNo: "2022-10002-MN-2",
      studentName: "SANTOS, MARIA B.",
      docType: "Official Receipt (OR)",
      title: "Official Receipt (OR-2026-9912)",
      subtitle: "Student Tuition & Term Laboratory Assessment Payment",
      docNumber: "OR-2026-9912",
      dateStr: "2026-10-01",
      amountStr: "PHP 4,250.00",
      category: "Revenue & Collections",
      notes: "Full payment received for 1st Semester A.Y. 2026-2027 miscellaneous fees and special laboratory accreditation assessment.",
      approvalStatus: "Approved",
      reviewedBy: "PUPACCOUNTING-001",
      reviewNote: "Validated cash collection deposit against bank electronic transaction reference.",
    },
    {
      studentNo: "2023-00001-IT-1",
      studentName: "TEST STUDENT",
      docType: "Purchase Order (PO)",
      title: "Purchase Order (PO-2026-0312)",
      subtitle: "Workstation Maintenance Consumables & Optical Pickups",
      docNumber: "PO-2026-0312",
      dateStr: "2026-10-02",
      amountStr: "PHP 28,400.00",
      category: "Procurement & Assets",
      notes: "Order placement for 6 sets of replacement feed rollers and separation pads for Fujitsu fi-8170 and fi-7160 document scanning workstations.",
      approvalStatus: "Pending",
      reviewedBy: null,
      reviewNote: null,
    },
    {
      studentNo: "2021-30004-MN-1",
      studentName: "GARCIA, ANA D.",
      docType: "Tuition Fee Assessment Form",
      title: "Tuition Fee Assessment Form",
      subtitle: "Special Assessment for Graduating Senior Clearance",
      docNumber: "ASSESS-2026-0041",
      dateStr: "2026-10-02",
      amountStr: "PHP 1,800.00",
      category: "Student Billing & Clearances",
      notes: "Assessment verification for mid-year graduation clearance and diploma release audit.",
      approvalStatus: "Pending",
      reviewedBy: null,
      reviewNote: null,
    },
  ];

  for (const item of sampleDocs) {
    const filename = `accounting_${item.docNumber.toLowerCase().replace(/[^a-z0-9]/g, "_")}.pdf`;
    const fullPath = path.join(uploadDir, filename);

    const pdfBuffer = await generateSamplePdf({
      title: item.title,
      subtitle: item.subtitle,
      docNumber: item.docNumber,
      dateStr: item.dateStr,
      amountStr: item.amountStr,
      category: item.category,
      notes: item.notes,
      approvedBy: "CARMELA SANTOS, CPA",
    });

    fs.writeFileSync(fullPath, pdfBuffer);

    // Also write a copy to the hot-folder inbound to simulate pending scanner files
    const hotPath = path.join(hotFolderDir, filename);
    fs.writeFileSync(hotPath, pdfBuffer);

    await query(`
      INSERT INTO documents (
        office_id, student_no, student_name, doc_type, original_filename,
        storage_filename, mime_type, size_bytes, approval_status,
        reviewed_by, reviewed_at, review_note, created_at
      ) VALUES (
        'accounting', $1, $2, $3, $4,
        $5, 'application/pdf', $6, $7,
        $8, $9, $10, NOW() - interval '2 hours'
      ) ON CONFLICT DO NOTHING;
    `, [
      item.studentNo,
      encryptPII(item.studentName),
      item.docType,
      filename,
      filename,
      pdfBuffer.length,
      item.approvalStatus,
      item.reviewedBy,
      item.reviewedBy ? new Date() : null,
      item.reviewNote,
    ]);
  }

  // 9. Write Sample CSV Files for Demos in _SAMPLE_DATA
  const sampleDataDir = path.resolve(process.cwd(), "../_SAMPLE_DATA");
  const publicDir = path.resolve(process.cwd(), "public");

  const deptCsvContent = `ID,Name,ShortName,Icon,AccentColor,StationName,ScannerModel,StoragePath,InboundPath,StorageLayoutEnabled,Description
accounting,Accounting and Financial Services Office,Accounting,ti ti-calculator,#15803d,ACCT-DIGISCAN-01,Fujitsu fi-8170 Duplex Production Scanner (600 DPI / 90 PPM),.local/storage/accounting/uploads,.local/hot-folder/INBOUND/ACCOUNTING,false,Manages institutional financial disbursements fee assessments student accounts and procurement vouchers via an end-to-end paperless digital repository.
admissions,Office of Admissions and Testing,Admissions,ti ti-user-check,#7c3aed,ADM-SCAN-01,Canon imageFORMULA DR-M160II High-Speed Document Scanner,.local/storage/admissions/uploads,.local/hot-folder/INBOUND/ADMISSIONS,false,Processes incoming student applications CAEPUP entrance examination score evaluations and high school academic qualification records.
registrar,Office of the Registrar,Registrar,ph-bold ph-certificate,#800000,REG-ARCHIVE-PC01,Fujitsu fi-7160 Batch Duplex,.local/storage/registrar/uploads,.local/hot-folder/INBOUND,true,Manages student academic records transcripts and physical 201 file archives in Room 102.
osas,Office of Student Affairs and Services,OSAS,ph-bold ph-student,#3B82F6,OSAS-OPERATIONS-PC01,Canon imageFORMULA Flatbed/ADF,.local/storage/osas/uploads,.local/hot-folder/INBOUND,true,Manages student activities organizations clearances and student affairs documents in Room 204.
`;

  fs.writeFileSync(path.join(sampleDataDir, "mock_departments_and_stations.csv"), deptCsvContent, "utf8");
  fs.writeFileSync(path.join(publicDir, "mock_departments_and_stations.csv"), deptCsvContent, "utf8");

  const acctDocTypesCsv = `Category,Name,Code,IsCompliance,IsRequestable,ComplianceCategory
DocumentType,Disbursement Voucher,,true,false,Disbursements & Payables
DocumentType,Official Receipt (OR),,true,false,Revenue & Collections
DocumentType,Purchase Order (PO),,true,false,Procurement & Assets
DocumentType,Certificate of Full Payment,,false,true,Student Billing & Clearances
DocumentType,Tuition Fee Assessment Form,,true,false,Student Billing & Clearances
DocumentType,Budget Liquidation Report,,true,false,Disbursements & Payables
`;

  fs.writeFileSync(path.join(sampleDataDir, "accounting_document_types.csv"), acctDocTypesCsv, "utf8");
  fs.writeFileSync(path.join(publicDir, "accounting_document_types.csv"), acctDocTypesCsv, "utf8");

  console.log("\n✓ Seeding complete!");
  console.log("Mock data created:");
  console.log("  - Office: Accounting and Financial Services Office (ID: accounting)");
  console.log("  - Station: ACCT-DIGISCAN-01 (Fujitsu fi-8170 Duplex Production Scanner)");
  console.log("  - Storage Layout Module: DISABLED (Pure Digitization)");
  console.log("  - Digitization Modules: Scan & Upload, Records Review, Documents, Compliance Analytics (ENABLED)");
  console.log("  - Admin Login: admin.accounting@pup.local / pupstaff");
  console.log("  - Staff Login: staff.accounting@pup.local / pupstaff");
  console.log("  - CSV Files Created in _SAMPLE_DATA/ and public/:");
  console.log("    * mock_departments_and_stations.csv");
  console.log("    * accounting_document_types.csv");
  process.exit(0);
}

main().catch((err) => {
  console.error("Seeding failed:", err);
  process.exit(1);
});
