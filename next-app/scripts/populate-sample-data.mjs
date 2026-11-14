/**
 * Seed the complete local PostgreSQL sample dataset.
 *
 * Run from next-app/:
 *   pnpm populate-sample-data
 *   pnpm populate-sample-data --force   # also replaces storage_layout
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import { hashPassword } from "../src/lib/passwordHash.js";
import { encryptPII, decryptPII } from "../src/lib/piiEncryption.js";
import { getOfficeUploadsDir, getLocalDataDir } from "../src/lib/officePaths.js";
import { buildSampleSlaRequests } from "./sampleSlaRequests.mjs";
import { getSampleComplianceReview } from "./sampleDataPdf.mjs";

dotenv.config({ path: ".env" });

const { pool, query, queryOne, transaction } = await import("../src/lib/postgres.js");
const { slaStandardsRepo } = await import("../src/lib/slaStandardsRepo.js");
const { buildDefaultStorageLayout, buildDefaultOsasStorageLayout, isLegacyOsasStorageLayout } = await import("../src/lib/storageLayoutDefaults.js");
const { generateDocumentPdfByType } = await import("../src/lib/pdfDocumentGenerators.js");

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required. Start PostgreSQL and check next-app/.env.");
}

const passwordHash = hashPassword(process.env.DEFAULT_STAFF_PASSWORD || "pupstaff");
const studentPasswordHash = hashPassword("student123");
const staffPassword = process.env.DEFAULT_STAFF_PASSWORD || "pupstaff";

const officialStaff = [
  ["PUPSUPERADMIN-001", null, "Ramon", "Villanueva", "SuperAdmin", "System Administration", "superadmin@pup.com"],
  ["PUPREGISTRAR-003", "registrar", "Elias", "Austria", "Admin", "Administrative", "admin.registrar@pup.com"],
  ["PUPREGISTRAR-002", "registrar", "Marcus", "Reyes", "Staff", "Records", "staff.registrar@pup.com"],
  ["PUPOSAS-001", "osas", "Sandra", "Gomez", "Admin", "OSAS Admin", "admin.osas@pup.com"],
  ["PUPOSAS-002", "osas", "Juanito", "Rizal", "Staff", "Student Affairs", "staff.osas@pup.com"],
];

const demoStudentAccounts = [
  ["2023-00001-SJ-0", "test.student@pup.com"],
  ["2022-10001-SJ-0", "student@pup.com"],
];

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const demoComplianceTypes = [
  ["Confirmation Slip", "Admission & Identity", "SAR Form (circled)"],
  ["Student Health Information Form", "Certificates & Clearances", "Health and Information Sheet"],
  ["Route and Approval Slip", "Admission & Identity"],
  ["Certification and Undertaking", "Admission & Identity"],
  ["Undertaking and Waiver of Right", "Admission & Identity"],
  ["CAEPUP Application Form", "Admission & Identity", "CAEPUP 2023 Application Form"],
  ["SF10 JHS Permanent Record", "Academic Records"],
  ["Form 137 SHS Permanent Record", "Academic Records"],
  ["SF9 Progress Report Card", "Academic Records", "Grade 12 Report Card (1st and 2nd Semester)"],
  ["Senior High School Diploma", "Academic Records", "SHS Diploma or Certificate of Graduation"],
  ["Graduation and Good Moral Certification", "Certificates & Clearances", "Certificate of Good Moral Character"],
  ["Certificate of Live Birth", "Admission & Identity", "PSA Birth Certificate (circled)"],
  ["Student ID Front and Back", "Admission & Identity", "Photocopy of ID"],
];
const retiredDemoTypes = [
  ...demoComplianceTypes.flatMap(([, , previousName]) => previousName ? [previousName] : []),
  "CTC Grade 10 Report Card",
  "CTC Grade 11 Report Card",
];
const specimenStudentNo = "2025-10001-SJ-0";

const registrarTaxonomyPath = path.join(repoRoot, "_SAMPLE_DATA", "registrar_system_data - final.csv");
const registrarRequestableDocTypes = fs.readFileSync(registrarTaxonomyPath, "utf8")
  .split(/\r?\n/)
  .map((line) => line.split(",").map((value) => value.trim()))
  .filter(([kind, , , compliance, requestable]) => kind === "DocumentType" && compliance === "false" && requestable === "true")
  .map(([, name, , , , category]) => [name, category]);
const studentRosterPath = path.join(repoRoot, "_SAMPLE_DATA", "cleaned_student_data.csv");
const studentRosterRows = fs.readFileSync(studentRosterPath, "utf8").trim().split(/\r?\n/).slice(1);
const sectionByCohort = {
  2020: "4-1",
  2021: "3-1",
  2022: "3-2",
  2023: "2-1",
  2024: "2-2",
  2025: "1-1",
  2026: "1-2",
};
const rosterStudents = studentRosterRows.map((line, index) => {
  const [studentNo, name, odrsEmail, courseCode, academicYear, section, room, cabinet, drawer] = line.split(",");
  if (![studentNo, name, odrsEmail, courseCode, academicYear, section, room, cabinet, drawer].every(Boolean)) {
    throw new Error(`Invalid student roster row ${index + 2} in ${studentRosterPath}`);
  }
  if (!/^[^\s@]+@[^\s@]+\.com$/i.test(odrsEmail.trim())) {
    throw new Error(`Invalid .com student email on roster row ${index + 2} in ${studentRosterPath}`);
  }
  if (name.includes(",")) {
    throw new Error(`Student name must be First Middle Last on roster row ${index + 2}`);
  }
  const cleanNo = studentNo.trim().replace(/-(MN|IT)-/g, "-SJ-").replace(/-SJ-[12]$/, "-SJ-0");
  const cohort = Number(cleanNo.slice(0, 4));
  if (section.trim() !== sectionByCohort[cohort] || Number(academicYear) !== cohort || Number(room) !== 1 || cabinet.trim() !== String(cohort)) {
    throw new Error(`Invalid cohort section or storage assignment on roster row ${index + 2} in ${studentRosterPath}`);
  }
  return [cleanNo, name.trim(), courseCode.trim().toUpperCase(), cohort, section.trim(), 1, cabinet.trim(), Number(drawer), odrsEmail.trim().toLowerCase()];
});
if (!rosterStudents.length) {
  throw new Error(`No valid students found in ${studentRosterPath}`);
}
if (new Set(rosterStudents.map(([studentNo]) => studentNo)).size !== rosterStudents.length) {
  throw new Error(`Duplicate student number in ${studentRosterPath}`);
}
const students = rosterStudents;
const rosterCourses = [
  ["BSA", "Bachelor of Science in Accountancy"],
  ["BSEDEN", "Bachelor in Secondary Education major in English"],
  ["BSENT", "Bachelor of Science in Entrepreneurship"],
  ["BSBA-FM", "Bachelor of Science in Business Education major in Financial Management"],
  ["BSIT", "Bachelor of Science in Information Technology"],
  ["BSHM", "Bachelor of Science in Hospitality Management"],
  ["BS Psy", "Bachelor of Science in Psychology"],
  ["DICT", "Diploma in Information and Communications Technology"],
];
const rosterSections = [...new Set(rosterStudents.map(([, , courseCode, , section]) => `${courseCode}\t${section}`))]
  .map((entry) => entry.split("\t"));

const requests = [
  [1, "2023-20003-SJ-0", "Diploma", "Pending", "Alumni document request for employment verification", "PUPREGISTRAR-002"],
  [2, "2024-40005-SJ-0", "Transcript of Records", "InProgress", "Under processing by records evaluation section", "PUPREGISTRAR-003"],
  [3, "2022-10001-SJ-0", "Certificate of Enrollment", "Ready", "Ready for campus registrar counter pickup", "PUPREGISTRAR-002"],
  [4, "2022-10002-SJ-0", "Certified True Copy of Records", "Completed", "Released and acknowledged by student", "PUPREGISTRAR-003"],
  [5, "2020-50006-SJ-0", "Certificate of Good Moral", "Pending", "Requested for a scholarship application.", "PUPREGISTRAR-002"],
  [6, "2023-00001-SJ-0", "Certificate of Transfer Credentials (Honorable Dismissal)", "Cancelled", "Registrar declined processing because the applicant already had transfer credentials issued for this enrollment.", "PUPREGISTRAR-003"],
  [7, "2023-00001-SJ-0", "Certificate of Registration", "InProgress", "Registrar is checking the enrollment record for the requested term.", "PUPREGISTRAR-002"],
  [8, "2022-10001-SJ-0", "Transcript of Records", "Completed", "Sealed transcript released to the requester at the Registrar counter.", "PUPREGISTRAR-003"],
];

async function generateProposalPdf({ title, orgName, eventDate, venue, desc, studentNo, studentName, status }) {
  const doc = await PDFDocument.create();
  const page = doc.addPage([612, 792]);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await doc.embedFont(StandardFonts.Helvetica);
  const fontOblique = await doc.embedFont(StandardFonts.HelveticaOblique);

  const maroon = rgb(0.502, 0, 0);
  const darkGray = rgb(0.2, 0.2, 0.2);
  const lightGray = rgb(0.4, 0.4, 0.4);
  const strokeGray = rgb(0.85, 0.85, 0.85);
  const bgBox = rgb(0.97, 0.97, 0.98);

  // Institution Header
  page.drawText("POLYTECHNIC UNIVERSITY OF THE PHILIPPINES", { x: 50, y: 745, size: 12, font: fontBold, color: maroon });
  page.drawText("SAN JUAN CAMPUS  |  OFFICE OF STUDENT AFFAIRS AND SERVICES", { x: 50, y: 730, size: 8, font: fontBold, color: darkGray });
  page.drawLine({ start: { x: 50, y: 720 }, end: { x: 562, y: 720 }, thickness: 1.5, color: maroon });

  // Title
  page.drawText("STUDENT ACTIVITY & EVENT PROPOSAL", { x: 50, y: 698, size: 13, font: fontBold, color: darkGray });
  page.drawText("Form OSAS-EP-2026 | San Juan Campus Student Activity Clearance", { x: 50, y: 684, size: 8, font: fontOblique, color: lightGray });

  // Event Details Card
  page.drawRectangle({ x: 50, y: 550, width: 512, height: 120, borderColor: strokeGray, borderWidth: 1, color: bgBox });

  const drawField = (label, val, y, isBold = false) => {
    page.drawText(label, { x: 62, y, size: 8.5, font: fontBold, color: darkGray });
    page.drawText(String(val || ""), { x: 170, y, size: 8.5, font: isBold ? fontBold : fontRegular, color: isBold ? maroon : darkGray });
  };

  drawField("Organization:", orgName, 650, true);
  drawField("Event Title:", title, 632, true);
  drawField("Target Event Date:", `${eventDate} (Scheduled Activity)`, 614);
  drawField("Venue / Room:", venue, 596);
  drawField("Lead Proponent:", `${studentName || "Student Proponent"} (${studentNo})`, 578);
  drawField("Workflow Status:", `${status} - OSAS Directorate Review`, 560);

  // Section: Rationale & Objectives
  page.drawText("PROJECT RATIONALE & OBJECTIVES", { x: 50, y: 528, size: 9.5, font: fontBold, color: maroon });
  page.drawLine({ start: { x: 50, y: 520 }, end: { x: 562, y: 520 }, thickness: 0.5, color: strokeGray });
  page.drawText(desc.slice(0, 95), { x: 50, y: 505, size: 8.5, font: fontRegular, color: darkGray });
  if (desc.length > 95) {
    page.drawText(desc.slice(95, 190), { x: 50, y: 492, size: 8.5, font: fontRegular, color: darkGray });
  }

  // Section: Estimated Budget & Capacity
  page.drawText("ESTIMATED BUDGET & PARTICIPANT CAPACITY", { x: 50, y: 460, size: 9.5, font: fontBold, color: maroon });
  page.drawLine({ start: { x: 50, y: 452 }, end: { x: 562, y: 452 }, thickness: 0.5, color: strokeGray });
  page.drawText("Expected Participants: Accredited PUP San Juan Students and Registered Org Members", { x: 50, y: 436, size: 8.5, font: fontRegular, color: darkGray });
  page.drawText("Funding Source: Organization Operational Fund (Zero Mandatory Student Assessment)", { x: 50, y: 421, size: 8.5, font: fontRegular, color: darkGray });

  // Section: Safety & Logistics Confirmation
  page.drawText("FACILITY & SAFETY CLEARANCE COMPLIANCE", { x: 50, y: 390, size: 9.5, font: fontBold, color: maroon });
  page.drawLine({ start: { x: 50, y: 382 }, end: { x: 562, y: 382 }, thickness: 0.5, color: strokeGray });
  page.drawText("1. Building Administration clearance for venue console and facility reservation.", { x: 50, y: 366, size: 8, font: fontRegular, color: darkGray });
  page.drawText("2. University Health & Safety protocols, first aid emergency standby, and campus security notification.", { x: 50, y: 351, size: 8, font: fontRegular, color: darkGray });
  page.drawText("3. Pre-event briefing and waste segregation compliance supervised by the organizing committee.", { x: 50, y: 336, size: 8, font: fontRegular, color: darkGray });

  // Signatures
  page.drawRectangle({ x: 50, y: 190, width: 512, height: 110, borderColor: strokeGray, borderWidth: 1, color: rgb(1, 1, 1) });
  page.drawText("SIGNATORIES & ENDORSEMENTS", { x: 62, y: 282, size: 8.5, font: fontBold, color: darkGray });

  page.drawLine({ start: { x: 62, y: 235 }, end: { x: 200, y: 235 }, thickness: 1, color: darkGray });
  page.drawText("Organization President", { x: 75, y: 222, size: 7.5, font: fontRegular, color: lightGray });
  page.drawText(studentName ? studentName.split(",")[0] : "STUDENT LEADER", { x: 80, y: 240, size: 8, font: fontBold, color: darkGray });

  page.drawLine({ start: { x: 235, y: 235 }, end: { x: 375, y: 235 }, thickness: 1, color: darkGray });
  page.drawText("Faculty Adviser", { x: 275, y: 222, size: 7.5, font: fontRegular, color: lightGray });
  page.drawText("PROF. ENGR. R. ALVAREZ", { x: 245, y: 240, size: 8, font: fontBold, color: darkGray });

  page.drawLine({ start: { x: 410, y: 235 }, end: { x: 545, y: 235 }, thickness: 1, color: darkGray });
  page.drawText("OSAS Director / Head", { x: 440, y: 222, size: 7.5, font: fontRegular, color: lightGray });
  page.drawText("DR. SANDRA GOMEZ", { x: 440, y: 240, size: 8, font: fontBold, color: maroon });

  // Footer
  page.drawText("Polytechnic University of the Philippines San Juan | Records Keeping System - OSAS Archival Copy", { x: 50, y: 155, size: 7, font: fontOblique, color: lightGray });

  return Buffer.from(await doc.save());
}

async function generateCblPdf({ orgName, acronym, category, adviserName, ratifiedDate = "August 15, 2026" }) {
  const doc = await PDFDocument.create();
  const page = doc.addPage([595.28, 841.89]);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await doc.embedFont(StandardFonts.Helvetica);
  const fontOblique = await doc.embedFont(StandardFonts.HelveticaOblique);

  const maroon = rgb(0.502, 0, 0);
  const darkSlate = rgb(0.12, 0.16, 0.22);
  const mediumGray = rgb(0.4, 0.45, 0.5);
  const lightGray = rgb(0.96, 0.97, 0.98);
  const strokeGray = rgb(0.85, 0.88, 0.9);
  const green = rgb(0.08, 0.5, 0.25);
  const width = 595.28;

  // Header
  page.drawText("POLYTECHNIC UNIVERSITY OF THE PHILIPPINES", {
    x: 40,
    y: 742,
    size: 11,
    font: fontBold,
    color: maroon,
  });
  page.drawText("SAN JUAN CAMPUS  |  OFFICE OF STUDENT AFFAIRS AND SERVICES", {
    x: 40,
    y: 726,
    size: 8,
    font: fontBold,
    color: darkSlate,
  });
  page.drawText(`REF: CBL-${acronym}-2026`, {
    x: width - 180,
    y: 742,
    size: 8,
    font: fontBold,
    color: maroon,
  });
  page.drawText(`DATE: ${ratifiedDate}`, {
    x: width - 180,
    y: 726,
    size: 8,
    font: fontRegular,
    color: mediumGray,
  });

  page.drawRectangle({
    x: 40,
    y: 678,
    width: width - 80,
    height: 36,
    color: lightGray,
    borderColor: strokeGray,
    borderWidth: 1,
  });
  page.drawText("CONSTITUTION AND BY-LAWS (CBL)", {
    x: 52,
    y: 694,
    size: 11,
    font: fontBold,
    color: darkSlate,
  });
  page.drawText("FORM OSAS-CBL-2026", {
    x: width - 170,
    y: 694,
    size: 8,
    font: fontBold,
    color: maroon,
  });

  let y = 650;
  page.drawText("ORGANIZATION CONSTITUTION & BY-LAWS CHARTER", { x: 50, y, size: 10, font: fontBold, color: maroon });
  y -= 16;
  page.drawText(`${orgName.toUpperCase()} (${acronym})`, { x: 50, y, size: 12, font: fontBold, color: darkSlate });
  y -= 14;
  page.drawText(`Classification: ${category} Student Organization  |  PUP San Juan Campus`, { x: 50, y, size: 8, font: fontRegular, color: mediumGray });

  y -= 20;
  const articles = [
    { title: "ARTICLE I — NAME, DOMICILE, AND NATURE", text: `The name of this organization shall be ${orgName} (${acronym}). Its official seat of leadership and operations shall be at the Polytechnic University of the Philippines San Juan Campus.` },
    { title: "ARTICLE II — PURPOSE AND OBJECTIVES", text: "To foster academic excellence, ethical professional leadership, holistic student welfare, civic empowerment, and proactive engagement in university initiatives in alignment with PUP institutional goals." },
    { title: "ARTICLE III — MEMBERSHIP AND PRIVILEGES", text: "Membership shall be open to all duly enrolled PUP San Juan students satisfying the curriculum or special-interest eligibility criteria, without discrimination based on gender, ethnicity, creed, or socioeconomic status." },
    { title: "ARTICLE IV — EXECUTIVE BOARD AND GOVERNANCE", text: "The Executive Board shall be composed of the President, Vice President, Secretary, Treasurer, Auditor, and Public Relations Officer, elected through a general democratic vote of active members." },
    { title: "ARTICLE V — MEETINGS, ELECTIONS, AND QUORUM", text: "A simple majority of active members shall constitute a quorum for general assemblies. Executive meetings shall be conducted monthly or upon special call by the President with adviser concurrence." },
    { title: "ARTICLE VI — AMENDMENTS AND RATIFICATION", text: "Amendments to this Constitution require a two-thirds majority vote of the general membership and official endorsement by the Faculty Adviser and approval by the OSAS Director." },
  ];

  for (const art of articles) {
    page.drawText(art.title, { x: 50, y, size: 8.5, font: fontBold, color: darkSlate });
    y -= 12;
    page.drawText(art.text.slice(0, 110), { x: 50, y, size: 7.5, font: fontRegular, color: darkSlate });
    if (art.text.length > 110) {
      y -= 10;
      page.drawText(art.text.slice(110, 220), { x: 50, y, size: 7.5, font: fontRegular, color: darkSlate });
    }
    y -= 16;
  }

  y = 170;
  page.drawRectangle({ x: 50, y: y - 5, width: 495, height: 42, color: lightGray, borderColor: strokeGray, borderWidth: 1 });
  page.drawText("OSAS DIRECTORATE RATIFICATION & VERIFICATION SEAL", { x: 60, y: y + 20, size: 8, font: fontBold, color: green });
  page.drawText(`This document serves as the official, ratified Constitution & By-Laws of ${acronym} registered with OSAS for AY 2026-2027.`, { x: 60, y: y + 8, size: 7, font: fontRegular, color: darkSlate });

  y = 100;
  page.drawLine({ start: { x: 60, y: y + 15 }, end: { x: 220, y: y + 15 }, thickness: 1, color: darkSlate });
  page.drawText(adviserName || "FACULTY ADVISER", { x: 60, y, size: 8, font: fontBold, color: darkSlate });
  page.drawText("Designated Faculty Adviser", { x: 60, y: y - 10, size: 7, font: fontRegular, color: mediumGray });

  page.drawLine({ start: { x: 335, y: y + 15 }, end: { x: 495, y: y + 15 }, thickness: 1, color: darkSlate });
  page.drawText("DR. SANDRA GOMEZ", { x: 335, y, size: 8, font: fontBold, color: darkSlate });
  page.drawText("OSAS Director / Head", { x: 335, y: y - 10, size: 7, font: fontRegular, color: mediumGray });

  page.drawLine({ start: { x: 40, y: 50 }, end: { x: width - 40, y: 50 }, thickness: 0.5, color: strokeGray });
  page.drawText("Polytechnic University of the Philippines San Juan | Records Keeping System — OSAS Official Repository", {
    x: 40,
    y: 38,
    size: 7,
    font: fontOblique,
    color: mediumGray,
  });
  page.drawText("FORM ID: OSAS-CBL-2026", {
    x: width - 150,
    y: 38,
    size: 7,
    font: fontRegular,
    color: mediumGray,
  });

  return Buffer.from(await doc.save());
}

const postEventExamples = [
  ["glitch", "Student Technology Help Desk", "Submitted", null, 48, 3200],
  ["sa", "Student Leadership Workshop", "Under Review", "Checking the attendance sheet against the narrative report.", 76, 8400],
  ["jfinex", "Budgeting Basics Seminar", "Needs Revision", "Attach the missing receipts and reconcile the transportation subtotal.", 63, 5100],
  ["yes", "Campus Reading Outreach", "Cleared", "Attendance and expenses were verified. All requirements are complete.", 52, 4600],
  ["hhc", "Community Food Drive", "Declined", "The submitted receipts were for a different activity. Submit the records for this event.", 42, 6800],
];

const proposals = [
  [
    "2022-10001-SJ-0",
    "Annual Tech Summit & Hackathon 2026",
    "glitch",
    "2026-10-15",
    "PUP San Juan Audio-Visual Room",
    "Inter-collegiate programming contest, tech symposium, and innovation showcase for IT and CS majors.",
    "sample-jpcs-tech-summit.pdf",
    "Under Review",
    "Initial safety and venue clearance verified. Endorsement letter pending OSAS head sign-off.",
    null,
    [
      ["Submitted", "Event proposal submitted by organization president."],
      ["Under Review", "Initial safety and venue clearance verified. Endorsement letter pending OSAS head sign-off."],
    ],
  ],
  [
    "2023-00001-SJ-0",
    "University Leadership Congress & General Assembly",
    "sa",
    "2026-09-28",
    "PUP San Juan Gymnasium",
    "Mandatory leadership development and student council budget consultation for accredited org leaders.",
    "sample-csc-leadership-congress.pdf",
    "Approved",
    "Approved by OSAS Director. Activity permit #OSAS-2026-042 issued.",
    null,
    [
      ["Submitted", "Event proposal submitted by Student Assembly."],
      ["Under Review", "Gymnasium booking requested from Facilities Office."],
      ["Approved", "Approved by OSAS Director. Activity permit #OSAS-2026-042 issued."],
    ],
  ],
  [
    "2022-10001-SJ-0",
    "Freshmen Orientation & Welcoming Gala",
    "glitch",
    "2026-09-20",
    "Campus Quadrangle",
    "Welcoming event for batch 2026 freshmen, campus tour, and student organization fair.",
    "sample-acss-freshmen-gala.pdf",
    "Submitted",
    null,
    null,
    [
      ["Submitted", "Event proposal submitted for the first-year student orientation."],
    ],
  ],
  [
    "2023-00001-SJ-0",
    "Financial Literacy & Investment Forum",
    "jfinex",
    "2026-11-05",
    "Room 304 Seminar Hall",
    "Educational forum on personal wealth management, stock investing, and digital banking literacy.",
    "sample-jfinex-finance-forum.pdf",
    "Needs Revision",
    "Please attach the certified guest speaker profile and updated venue sanitation plan.",
    null,
    [
      ["Submitted", "Proposal submitted for JFINEX forum."],
      ["Under Review", "Evaluating invited speaker credentials and room capacity."],
      ["Needs Revision", "Please attach the certified guest speaker profile and updated venue sanitation plan."],
    ],
  ],
  [
    "2022-10001-SJ-0",
    "Cybersecurity Defense & Ethical Hacking Workshop",
    "glitch",
    "2026-10-22",
    "Computer Laboratory 2",
    "Hands-on technical workshop on network security fundamentals and cyber hygiene.",
    "sample-acss-cyber-defense.pdf",
    "Approved",
    "Security protocols approved. Laboratory reservation confirmed.",
    null,
    [
      ["Submitted", "Proposal submitted for cybersecurity lab session."],
      ["Under Review", "IT laboratory administrator coordinating workstation network isolation."],
      ["Approved", "Security protocols approved. Laboratory reservation confirmed."],
    ],
  ],
  [
    "2023-00001-SJ-0",
    "Campus Mental Health Awareness Week & Wellness Fair",
    "hhc",
    "2026-10-08",
    "Student Center & University Clinic Lobby",
    "Interactive wellness booths, peer counseling orientation, and stress-reduction workshops.",
    "sample-rcy-mental-health-fair.pdf",
    "Submitted",
    null,
    null,
    [
      ["Submitted", "Event proposal and volunteer roster submitted."],
    ],
  ],
  [
    "2022-10001-SJ-0",
    "Inter-College Debate Championship: The San Juan Cup",
    "yes",
    "2026-11-12",
    "PUP San Juan Amphitheater",
    "Parliamentary debate tournament featuring inter-departmental student teams discussing youth and education issues.",
    "sample-gem-debate-cup.pdf",
    "Under Review",
    "Judging panel guidelines under evaluation by Student Affairs Committee.",
    null,
    [
      ["Submitted", "Proposal submitted with preliminary rulebook."],
      ["Under Review", "Judging panel guidelines under evaluation by Student Affairs Committee."],
    ],
  ],
  [
    "2023-00001-SJ-0",
    "Overnight E-Sports LAN Tournament & Gaming Festival",
    "pylon-esports",
    "2026-10-30",
    "University Gymnasium",
    "Collegiate gaming tournament and live exhibition match for PC and mobile games.",
    "sample-gaming-guild-lan.pdf",
    "Declined",
    "Campus security regulations strictly prohibit overnight student gatherings past 10:00 PM. Please restructure into a day-time program.",
    null,
    [
      ["Submitted", "Tournament proposal and equipment manifest submitted."],
      ["Under Review", "Coordinating with Security Office on event duration."],
      ["Declined", "Campus security regulations strictly prohibit overnight student gatherings past 10:00 PM. Please restructure into a day-time program."],
    ],
  ],
  ...[
    ["2023-00001-SJ-0", "Campus Volunteer Orientation", "hhc", "2026-11-24", "Student Center",
      "Volunteer briefing on registration, outreach assignments, and event safety.", "hhc-volunteer-orientation.pdf"],
    ["2023-00001-SJ-0", "Inter-Program Strategy Games Day", "pylon-esports", "2026-11-27", "Student Activity Center",
      "Daytime campus tournament with scheduled matches and student volunteer marshals.", "pylon-strategy-games.pdf"],
    ["2023-00001-SJ-0", "Peer Accounting Review Clinic", "jpia", "2026-12-02", "Room 304 Seminar Hall",
      "Peer tutoring sessions for first-year accounting students ahead of their examinations.", "jpia-review-clinic.pdf"],
    ["2023-00001-SJ-0", "Student Budget Consultation", "sa", "2026-12-04", "PUP San Juan Audio-Visual Room",
      "Open consultation with organization treasurers on activity funding and reporting.", "sa-budget-consultation.pdf"],
  ].map((proposal) => [
    ...proposal, "Submitted", null, null,
    [["Submitted", "Activity proposal submitted for OSAS evaluation."]],
  ]),
  ...postEventExamples.map(([orgId, title], index) => [
    demoStudentAccounts[index % demoStudentAccounts.length][0],
    title,
    orgId,
    `2026-08-${17 + index}`,
    "PUP San Juan Campus",
    `${title} organized for the campus community.`,
    `post-event-${orgId}.pdf`,
    "Approved",
    "Activity proposal approved by OSAS.",
    null,
    [
      ["Submitted", "Activity proposal submitted by the organization."],
      ["Approved", "Activity proposal approved by OSAS."],
    ],
  ]),
];

const osasDocuments = [
  [101, "2025-90001-SJ-0", "yes", "Organization Registration Certificate", "sample-org-cert-angela.pdf"],
  [102, "2022-10001-SJ-0", "glitch", "Organization Registration Certificate", "glitch-registration.pdf"],
  [103, "2022-10001-SJ-0", "glitch", "Activity Permit", "glitch-tech-help-desk-permit.pdf", "Student Technology Help Desk"],
  [104, "2023-00001-SJ-0", "sa", "Organization Registration Certificate", "sa-registration.pdf"],
  [105, "2023-00001-SJ-0", "sa", "Activity Permit", "sa-leadership-congress-permit.pdf", "University Leadership Congress & General Assembly"],
  [106, "2023-00001-SJ-0", "hhc", "Organization Registration Certificate", "hhc-registration.pdf"],
  [107, "2023-00001-SJ-0", "hhc", "Activity Permit", "hhc-food-drive-permit.pdf", "Community Food Drive"],
  [108, "2023-00001-SJ-0", "jfinex", "Organization Registration Certificate", "jfinex-registration.pdf"],
  [109, "2023-00001-SJ-0", "pylon-esports", "Organization Registration Certificate", "pylon-registration.pdf"],
];

const minimalPdf = Buffer.from(
  ["%PDF-1.4", "1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj", "2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj", "3 0 obj<</Type/Page/MediaBox[0 0 612 792]>>endobj", "xref", "0 4", "0000000000 65535 f ", "0000000009 00000 n ", "0000000052 00000 n ", "0000000101 00000 n ", "trailer<</Size 4/Root 1 0 R>>", "startxref", "178", "%%EOF"].join("\n"),
);

export async function seed({ force: forceOverride } = {}) {
  const force = forceOverride ?? process.argv.includes("--force");
  const demoComplianceFiles = await Promise.all(demoComplianceTypes.map(async ([name], index) => {
    const filename = `${String(index + 1).padStart(2, "0")} - ${name}.pdf`;
    const bytes = fs.readFileSync(path.join(repoRoot, "Demo PDFs by Document", filename));
    await PDFDocument.load(bytes);
    return { filename, bytes };
  }));
  const slaRequests = buildSampleSlaRequests(students, await slaStandardsRepo.getStandards());
  await transaction(async ({ query: run, queryOne: runOne }) => {
    await run("SELECT pg_advisory_xact_lock(hashtext('populate-sample-data'))");
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
        const aHash = hashPassword(ans.toLowerCase());
        await run(
          `INSERT INTO staff_security_answers (staff_id, question_id, answer_hash, updated_at)
           VALUES ($1, $2, $3, NOW())
           ON CONFLICT (staff_id, question_id) DO UPDATE SET answer_hash = EXCLUDED.answer_hash, updated_at = NOW()`,
          [staffId, qid, aHash],
        );
      }
    }

    for (const [code, name] of rosterCourses) {
      await run(`INSERT INTO courses (office_id, code, name, status) VALUES ('registrar', $1, $2, 'Active') ON CONFLICT (office_id, code) DO UPDATE SET name=EXCLUDED.name, status='Active'`, [code, name]);
      for (const sec of ["1-1", "1-2", "2-1", "2-2", "3-1", "3-2", "4-1", "4-2"]) {
        await run(`INSERT INTO sections (office_id, name, course_code, status) VALUES ('registrar', $1, $2, 'Active') ON CONFLICT (office_id, name, course_code) DO UPDATE SET status='Active'`, [sec, code]);
      }
    }

    await run(`DELETE FROM courses WHERE office_id = 'osas'`);
    await run(`DELETE FROM sections WHERE office_id = 'osas'`);

    await run(
      `DELETE FROM document_types
       WHERE office_id='registrar' AND name=ANY($1::text[])`,
      [retiredDemoTypes],
    );
    for (const [name, category] of demoComplianceTypes) {
      await run(
        `INSERT INTO document_types (office_id, name, name_norm, status, is_compliance, is_requestable, compliance_category)
         VALUES ('registrar', $1, $2, 'Active', true, false, $3)
         ON CONFLICT (office_id, name_norm) DO UPDATE SET name=EXCLUDED.name, status='Active', is_compliance=true,
           is_requestable=false, compliance_category=EXCLUDED.compliance_category`,
        [name, name.toLowerCase(), category],
      );
    }
    for (const [name, category] of registrarRequestableDocTypes) {
      await run(
        `INSERT INTO document_types (office_id, name, name_norm, status, is_compliance, is_requestable, compliance_category)
         VALUES ('registrar', $1, $2, 'Active', false, true, $3)
         ON CONFLICT (office_id, name_norm) DO UPDATE SET name=EXCLUDED.name, status='Active',
           is_compliance=false, is_requestable=true, compliance_category=EXCLUDED.compliance_category`,
        [name, name.toLowerCase(), category],
      );
    }

    // Recognized OSAS student organizations from the campus list.
    const organizations = [
      ["jfinex", "Junior Financial Executives (JFINEX)", "JFINEX", "Academic", "ACADEMIC ORGANIZATIONS", "1", "Dr. Milton Friedman", "mfriedman@pup.edu.ph"],
      ["yes", "Young Educators Society (YES)", "YES", "Academic", "ACADEMIC ORGANIZATIONS", "2", "Prof. Maria Montessori", "mmontessori@pup.edu.ph"],
      ["jpia", "Junior Philippine Institute of Accountants (JPIA)", "JPIA", "Academic", "ACADEMIC ORGANIZATIONS", "3", "Prof. Pacioli Luca", "pluca@pup.edu.ph"],
      ["ceo", "Collegiate Entrepreneurs' Organization (CEO)", "CEO", "Academic", "ACADEMIC ORGANIZATIONS", "4", "Prof. Joseph Schumpeter", "jschumpeter@pup.edu.ph"],
      ["hm-society", "Hospitality Management Society (HM Society)", "HM SOCIETY", "Academic", "ACADEMIC ORGANIZATIONS", "5", "Prof. Cesar Ritz", "critz@pup.edu.ph"],
      ["glitch", "Governing League of I.T. Challengers (GLITCH)", "GLITCH", "Academic", "ACADEMIC ORGANIZATIONS", "6", "Prof. Alan Turing", "aturing@pup.edu.ph"],
      ["psysoc", "Psychological Society (PSYSOC)", "PSYSOC", "Academic", "ACADEMIC ORGANIZATIONS", "7", "Dr. Carl Rogers", "crogers@pup.edu.ph"],
      ["pylon-esports", "PYLON E-Sports", "PYLON", "Non-Academic", "NON-ACADEMIC ORGANIZATIONS", "1", "Engr. Kevin Lim", "klim@pup.edu.ph"],
      ["rotaract", "Rotaract Club of PUP San Juan", "ROTARACT", "Non-Academic", "NON-ACADEMIC ORGANIZATIONS", "2", "Dr. Clara Barton", "cbarton@pup.edu.ph"],
      ["hhc", "Helping Hands Community (HHC)", "HHC", "Non-Academic", "NON-ACADEMIC ORGANIZATIONS", "3", "Dr. Maria Santos", "msantos@pup.edu.ph"],
      ["adc", "Alab Danse Club (ADC)", "ADC", "Non-Academic", "NON-ACADEMIC ORGANIZATIONS", "4", "Prof. Francisca Reyes-Aquino", "faquino@pup.edu.ph"],
      ["paraseist", "The Paraseist", "PARASEIST", "Non-Academic", "NON-ACADEMIC ORGANIZATIONS", "5", "Prof. Marcelo H. Del Pilar", "mdelpilar@pup.edu.ph"],
      ["sa", "Student Assembly (SA)", "SA", "Non-Academic", "NON-ACADEMIC ORGANIZATIONS", "6", "Dr. Jose Rizal", "jrizal@pup.edu.ph"],
      ["lente-filikulas", "PUP Lente Filikulas", "LENTE FILIKULAS", "Non-Academic", "NON-ACADEMIC ORGANIZATIONS", "7", "Prof. Ishmael Bernal", "ibernal@pup.edu.ph"],
    ];
    for (const [id, name, acronym, category, cabinet, drawer, adviserName, adviserEmail] of organizations) {
      await run(
        `INSERT INTO student_organizations (id, name, acronym, category, status, storage_room, storage_cabinet, storage_drawer, description, adviser_name, adviser_email)
         VALUES ($1, $2, $3, $4, 'Active', 1, $5, $6, 'Recognized PUP San Juan student organization under OSAS.', $7, $8)
         ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, acronym=EXCLUDED.acronym,
           category=EXCLUDED.category, storage_room=EXCLUDED.storage_room,
           storage_cabinet=EXCLUDED.storage_cabinet, storage_drawer=EXCLUDED.storage_drawer,
           adviser_name=EXCLUDED.adviser_name, adviser_email=EXCLUDED.adviser_email,
           status='Active', updated_at=NOW()`,
        [id, name, acronym, category, cabinet, drawer, adviserName, adviserEmail],
      );
    }

    await run(`DELETE FROM sections WHERE office_id = 'osas'`);
    await run(`DELETE FROM courses WHERE office_id = 'osas'`);
    const osasDocTypes = [
      "Constitution & By-Laws (CBL)",
      "Event Proposal",
      "Activity Request",
      "Activity Permit",
      "Financial Liquidation Report",
      "Post-Event Narrative Report",
      "Post-Event Compliance Clearance Certificate",
      "Organization Registration Certificate",
    ];
    for (const name of osasDocTypes) {
      await run(
        `INSERT INTO document_types (office_id, name, name_norm, status, is_compliance, is_requestable, compliance_category)
         VALUES ('osas', $1, $2, 'Active', true, false, 'Student Governance & Activities')
         ON CONFLICT (office_id, name_norm) DO UPDATE SET name=EXCLUDED.name, status='Active', is_compliance=true, is_requestable=false, compliance_category=EXCLUDED.compliance_category`,
        [name, name.toLowerCase()]
      );
    }
    await run(`
      DELETE FROM document_types
      WHERE office_id = 'osas' AND name_norm IN ('good moral certificate', 'certificate of good moral', 'clearance form', 'student disciplinary clearance')
    `);
    await run(`
      DELETE FROM document_types
      WHERE (is_compliance = false AND is_requestable = false)
         OR (is_compliance = true AND is_requestable = true)
    `);

    for (const student of students) {
      const rawCourse = student[2];
      let normalizedCourse = rawCourse;
      if (rawCourse === "BSEDUC") normalizedCourse = "BSEDEN";
      if (rawCourse === "BSPSYCH" || rawCourse === "BS PSY") normalizedCourse = "BS Psy";
      if (rawCourse === "DIT") normalizedCourse = "DICT";
      if (rawCourse === "BSCS") normalizedCourse = "BSIT";
      const studentData = [student[0], student[1], normalizedCourse, student[3], student[4], student[5], student[6], student[7]];
      await run(
        `INSERT INTO students (student_no, name, course_code, year_level, section, status, storage_room, storage_cabinet, storage_drawer)
         VALUES ($1,$2,$3,$4,$5,'Active',$6,$7,$8)
         ON CONFLICT (student_no) DO UPDATE SET name=EXCLUDED.name, course_code=EXCLUDED.course_code, year_level=EXCLUDED.year_level,
           section=EXCLUDED.section, status='Active', storage_room=EXCLUDED.storage_room, storage_cabinet=EXCLUDED.storage_cabinet,
           storage_drawer=EXCLUDED.storage_drawer, updated_at=NOW()`,
        studentData,
      );
      await run(
        `INSERT INTO student_office_memberships (student_no, office_id, status)
         VALUES ($1, 'registrar', 'Active')
         ON CONFLICT (student_no, office_id) DO UPDATE SET status='Active', updated_at=NOW()`,
        [student[0]],
      );
      await run(
        `INSERT INTO registrar_odrs_contacts (student_no, email) VALUES ($1, $2)
         ON CONFLICT (student_no) DO UPDATE SET email=EXCLUDED.email`,
        [student[0], encryptPII(student[8])],
      );
    }

    for (const [sNo, sEmail] of demoStudentAccounts) {
      const profile = await runOne(
        `UPDATE student_identity_profiles sip
         SET email = $1, client_type = 'Student', updated_at = NOW()
         FROM students s
         WHERE s.student_no = $2 AND sip.id = s.identity_profile_id
         RETURNING sip.id`,
        [encryptPII(sEmail.toLowerCase()), sNo],
      );
      await run(
        `INSERT INTO student_accounts (student_no, identity_profile_id, password_hash, status, updated_at)
         VALUES ($1, $2, $3, 'Active', NOW())
         ON CONFLICT (identity_profile_id) DO UPDATE SET student_no=EXCLUDED.student_no, password_hash=EXCLUDED.password_hash, status='Active', updated_at=NOW()`,
        [sNo, profile?.id, studentPasswordHash],
      );
    }

    // Sample portal accounts use reserved email domains and never replace existing credentials.
    const demoStudentNumbers = new Set(demoStudentAccounts.map(([number]) => number));
    const portalStudents = Object.keys(sectionByCohort).flatMap((cohort) =>
      students.filter(([number, , , year]) => year === Number(cohort) && !demoStudentNumbers.has(number)).slice(0, 5),
    );
    for (const [index, [studentNo, , , , , , , , email]] of portalStudents.entries()) {
      const status = index % 10 === 8 ? "Inactive" : index % 10 === 9 ? "Archived" : "Active";
      await run(
        `WITH created AS (
           INSERT INTO student_accounts (student_no, identity_profile_id, password_hash, status)
           SELECT s.student_no, s.identity_profile_id, $2, $3
           FROM students s JOIN student_identity_profiles sip ON sip.id=s.identity_profile_id
           WHERE s.student_no=$1 AND (sip.email IS NULL OR sip.email=$4 OR lower(sip.email)=$5)
             AND NOT EXISTS (
               SELECT 1 FROM student_identity_profiles other
               WHERE other.id<>sip.id AND (other.email=$4 OR lower(other.email)=$5)
             )
           ON CONFLICT DO NOTHING RETURNING identity_profile_id
         )
         UPDATE student_identity_profiles SET email=$4, client_type='Student', updated_at=NOW()
         FROM created WHERE id=created.identity_profile_id`,
        [studentNo, studentPasswordHash, status, encryptPII(email), email],
      );
    }

    const externalPortalAccounts = [
      ["Isabel Mendoza", "isabel.mendoza@example.com", "Alumni", "Active"],
      ["Gabriel Navarro", "gabriel.navarro@example.com", "Alumni", "Active"],
      ["Camille Aquino", "camille.aquino@example.com", "Alumni", "Inactive"],
      ["Elena Bautista", "elena.bautista@example.com", "Parent", "Active"],
      ["Roberto Santiago", "roberto.santiago@example.com", "Parent", "Active"],
      ["Lourdes Villanueva", "lourdes.villanueva@example.com", "Parent", "Archived"],
    ];
    for (const [name, email, affiliation, status] of externalPortalAccounts) {
      await run(
        `WITH profile AS (
           INSERT INTO student_identity_profiles (display_name, email, client_type)
           SELECT $1, $2, $3 WHERE NOT EXISTS (
             SELECT 1 FROM student_identity_profiles WHERE email=$2 OR lower(email)=$4
           )
           RETURNING id
         )
         INSERT INTO student_accounts (identity_profile_id, password_hash, status)
         SELECT id, $5, $6 FROM profile`,
        [encryptPII(name), encryptPII(email), affiliation, email, studentPasswordHash, status],
      );
    }

    const registrarUploadsDir = getOfficeUploadsDir("registrar");
    const osasUploadsDir = path.join(process.env.LOCAL_DATA_DIR || ".local", "osas", "uploads");
    const osasStorageDir = getOfficeUploadsDir("osas");
    fs.mkdirSync(registrarUploadsDir, { recursive: true });
    fs.mkdirSync(osasUploadsDir, { recursive: true });
    fs.mkdirSync(osasStorageDir, { recursive: true });

    let generatedDocumentCount = 0;
    const incompleteStudentCount = students.filter(([number], index) => number !== specimenStudentNo && index % 4 === 0).length;
    for (const [studentIndex, [studentNo, studentName]] of students.entries()) {
      const ownsSpecimens = studentNo === specimenStudentNo;
      const typeCount = demoComplianceTypes.length;
      const missingTypeIndexes = !ownsSpecimens && studentIndex % 4 === 0
        ? new Set([studentIndex % typeCount, (studentIndex + 3) % typeCount])
        : new Set();

      for (const [typeIndex, [docType, , previousName]] of demoComplianceTypes.entries()) {
        if (missingTypeIndexes.has(typeIndex)) continue;
        const { filename, bytes: pdfBytes } = demoComplianceFiles[typeIndex];
        const review = ownsSpecimens ? { status: "Approved", note: "Demo specimen." }
          : getSampleComplianceReview(studentIndex, typeIndex, typeCount);
        const storageFilename = `sample-demo-${studentNo}-${typeIndex + 1}.pdf`;
        fs.writeFileSync(path.join(registrarUploadsDir, storageFilename), pdfBytes);

        // Reuse matching sample rows so existing links to their document IDs survive.
        const existing = await runOne(
          `SELECT id FROM documents
           WHERE office_id='registrar' AND student_no=$1
             AND (storage_filename=$2 OR (
               storage_filename ~ '^sample-compliance-[0-9]+[.]pdf$' AND doc_type IN ($3,$4)
             ))
           ORDER BY (storage_filename=$2) DESC, id LIMIT 1`,
          [studentNo, storageFilename, docType, previousName ?? docType],
        );
        const values = [studentNo, studentName, docType, filename, storageFilename, pdfBytes.length, review.status, review.note];
        if (existing) {
          await run(
            `UPDATE documents SET student_no=$1, student_name=$2, doc_type=$3, original_filename=$4,
               storage_filename=$5, size_bytes=$6, approval_status=$7, review_note=$8,
               reviewed_by=CASE WHEN $7 <> 'Pending' THEN 'PUPREGISTRAR-003' END,
               reviewed_at=CASE WHEN $7 <> 'Pending' THEN NOW() END
             WHERE id=$9`,
            [...values, existing.id],
          );
        } else {
          await run(
            `INSERT INTO documents (office_id, student_no, student_name, doc_type, original_filename, storage_filename,
               mime_type, size_bytes, approval_status, review_note, reviewed_by, reviewed_at)
             VALUES ('registrar',$1,$2,$3,$4,$5,'application/pdf',$6,$7,$8,
               CASE WHEN $7 <> 'Pending' THEN 'PUPREGISTRAR-003' END,
               CASE WHEN $7 <> 'Pending' THEN NOW() END)`,
            values,
          );
        }
        generatedDocumentCount += 1;
      }
    }

    await run(
      `DELETE FROM documents
       WHERE office_id='registrar' AND student_no=ANY($1::text[])
         AND storage_filename ~ '^sample-compliance-[0-9]+[.]pdf$'
         AND doc_type=ANY($2::text[])`,
      [students.map(([number]) => number), [...retiredDemoTypes, ...demoComplianceTypes.map(([name]) => name)]],
    );
    console.log(`Seeded ${generatedDocumentCount} Registrar demo PDFs across ${demoComplianceTypes.length} document types. ${incompleteStudentCount} sample students have incomplete checklists.`);

    for (const [legacyId, studentNo, organizationId, docType, filename, eventName = null] of osasDocuments) {
      const [, orgName] = organizations.find(([id]) => id === organizationId);
      const [, studentName] = students.find(([number]) => number === studentNo);
      const storageFilename = `sample-${legacyId}-${filename}`;
      const pdfBytes = await generateDocumentPdfByType({
        docType,
        studentNo,
        studentName,
        orgName,
        eventName,
        dateStr: "AY 2026-2027",
      });
      fs.writeFileSync(path.join(osasUploadsDir, storageFilename), pdfBytes);
      fs.writeFileSync(path.join(osasStorageDir, storageFilename), pdfBytes);
      await run(
        `INSERT INTO documents (office_id, student_no, student_name, doc_type, original_filename, storage_filename, mime_type, size_bytes, approval_status, reviewed_by, reviewed_at, review_note, legacy_id, organization_id, event_name)
         VALUES ('osas',$1,$2,$3,$4,$5,'application/pdf',$6,'Approved','PUPOSAS-001',NOW(),'Sample OSAS organization record approved.',$7,$8,$9)
         ON CONFLICT (office_id, legacy_id) DO UPDATE SET student_no=EXCLUDED.student_no, student_name=EXCLUDED.student_name, organization_id=EXCLUDED.organization_id,
           doc_type=EXCLUDED.doc_type, event_name=EXCLUDED.event_name, original_filename=EXCLUDED.original_filename, storage_filename=EXCLUDED.storage_filename, size_bytes=EXCLUDED.size_bytes, approval_status='Approved'`,
        [studentNo, studentName, docType, filename, storageFilename, pdfBytes.length, legacyId, organizationId, eventName],
      );
    }

    for (const [legacyId, studentNo, docType, status, notes, actor] of requests) {
      const [, name, , , , , , , rosterEmail] = students.find(([number]) => number === studentNo);
      const email = demoStudentAccounts.find(([number]) => number === studentNo)?.[1] || rosterEmail;
      const reqRow = await runOne(
        `INSERT INTO document_requests (office_id, student_no, doc_type, status, notes, created_by, updated_by, legacy_id,
           identity_profile_id, course_code, requester_name, requester_contact)
         SELECT 'registrar',student_no,$2,$3,$4,$5,$5,$6,identity_profile_id,course_code,$7,$8 FROM students WHERE student_no=$1
         ON CONFLICT (office_id, legacy_id) DO UPDATE SET student_no=EXCLUDED.student_no, identity_profile_id=EXCLUDED.identity_profile_id,
           doc_type=EXCLUDED.doc_type, status=EXCLUDED.status, notes=EXCLUDED.notes, updated_by=EXCLUDED.updated_by,
           course_code=EXCLUDED.course_code, requester_name=EXCLUDED.requester_name, requester_contact=EXCLUDED.requester_contact, updated_at=NOW()
         RETURNING id`,
        [studentNo, docType, status, notes, actor, legacyId, encryptPII(name), encryptPII(email)],
      );
      if (reqRow?.id) {
        await run(
          `INSERT INTO transaction_updates (document_request_id, status, message)
           SELECT $1, $2, $3 WHERE NOT EXISTS (
             SELECT 1 FROM transaction_updates WHERE document_request_id=$1 AND status=$2 AND message=$3
           )`,
          [reqRow.id, status, notes],
        );
      }
    }

    for (const { legacyId, student, docType, status, createdAt, updatedAt, updates, feedback } of slaRequests) {
      const [studentNo, name, , , , , , , rosterEmail] = student;
      const email = demoStudentAccounts.find(([number]) => number === studentNo)?.[1] || rosterEmail;
      const actor = legacyId % 3 === 0 ? "PUPREGISTRAR-003" : "PUPREGISTRAR-002";
      const request = await runOne(
        `INSERT INTO document_requests (office_id, student_no, doc_type, status, notes, created_by, updated_by,
           legacy_id, identity_profile_id, course_code, requester_name, requester_contact, created_at, updated_at)
         SELECT 'registrar',student_no,$2,$3,$4,$5,$5,$6,identity_profile_id,course_code,$7,$8,$9,$10
         FROM students WHERE student_no=$1
         ON CONFLICT (office_id, legacy_id) DO NOTHING
         RETURNING id, identity_profile_id`,
        [studentNo, docType, status, updates.at(-1).message, actor, legacyId,
          encryptPII(name), encryptPII(email), createdAt, updatedAt],
      );
      if (!request) continue;

      for (const update of updates) {
        await run(
          `INSERT INTO transaction_updates (document_request_id, status, message, created_by, created_at)
           VALUES ($1,$2,$3,$4,$5)`,
          [request.id, update.status, update.message, actor, update.at],
        );
      }
      if (feedback) {
        await run(
          `INSERT INTO document_request_feedback
             (document_request_id, student_no, identity_profile_id, rating, aspect_tags, comments, created_at, updated_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$7)`,
          [request.id, studentNo, request.identity_profile_id, feedback.rating, feedback.tags, feedback.comments, feedback.at],
        );
      }
    }

    for (const [studentNo, title, orgId, eventDate, venue, desc, filename, status, reviewNote, archivedAt, updates] of proposals) {
      const storageFilename = `sample-prop-${filename}`;
      const [, studentName] = students.find(([number]) => number === studentNo);
      const [, orgName] = organizations.find(([id]) => id === orgId);
      const [, email] = demoStudentAccounts.find(([number]) => number === studentNo);
      const officer = await runOne(
        `INSERT INTO organization_officers (organization_id, email, student_name, student_no, position, status)
         VALUES ($1, $2, $3, $4, 'Events Coordinator', 'Active')
         ON CONFLICT (organization_id, email) DO UPDATE SET student_name=EXCLUDED.student_name,
           student_no=EXCLUDED.student_no, status='Active', updated_at=NOW()
         RETURNING position`,
        [orgId, email, studentName, studentNo],
      );
      const pdfBytes = await generateProposalPdf({
        title, orgName, eventDate, venue, desc, studentNo, studentName, status
      });
      fs.writeFileSync(path.join(osasUploadsDir, storageFilename), pdfBytes);
      fs.writeFileSync(path.join(osasStorageDir, storageFilename), pdfBytes);

      const existing = await runOne(`SELECT id FROM event_proposals WHERE office_id='osas' AND storage_filename=$1`, [storageFilename]);
      let propId = existing?.id;
      const reviewedAt = reviewNote ? (archivedAt || new Date().toISOString()) : null;

      if (!propId) {
        const propRow = await runOne(
          `INSERT INTO event_proposals (
             office_id, student_no, identity_profile_id, organization_id, title, organization_name, event_date, venue,
             description, storage_filename, original_filename, mime_type, size_bytes,
             status, review_note, reviewed_at, archived_at
           )
           VALUES ('osas', $1, (SELECT identity_profile_id FROM students WHERE student_no=$1), $2, $3, $4, $5, $6, $7, $8, $9, 'application/pdf', $10, $11, $12, $13, $14)
           RETURNING id`,
          [studentNo, orgId, title, orgName, eventDate, venue, desc, storageFilename, filename, pdfBytes.length, status, reviewNote, reviewedAt, archivedAt || null],
        );
        propId = propRow?.id;
      } else {
        await run(
          `UPDATE event_proposals
           SET student_no=$1, identity_profile_id=(SELECT identity_profile_id FROM students WHERE student_no=$1), organization_id=$2, event_date=$3, venue=$4, description=$5, status=$6, review_note=$7, reviewed_at=$8, archived_at=$9, size_bytes=$10, updated_at=NOW()
           WHERE id=$11`,
          [studentNo, orgId, eventDate, venue, desc, status, reviewNote, reviewedAt, archivedAt || null, pdfBytes.length, propId],
        );
      }
      await run(
        `UPDATE event_proposals SET organization_name=$2, submitted_by_email=$3, officer_position=$4,
           is_verified_officer=true, reviewed_by=$5 WHERE id=$1`,
        [propId, orgName, email, officer.position, reviewNote ? "PUPOSAS-001" : null],
      );
      if (propId && Array.isArray(updates)) {
        await run(`DELETE FROM transaction_updates WHERE event_proposal_id = $1`, [propId]);
        for (const [uStatus, uMsg] of updates) {
          await run(
            `INSERT INTO transaction_updates (event_proposal_id, status, message, created_by)
             VALUES ($1, $2, $3, $4)`,
            [propId, uStatus, uMsg, uStatus === "Submitted" ? null : "PUPOSAS-001"],
          );
        }
      }

      const report = postEventExamples.find(([reportOrgId, reportTitle]) => reportOrgId === orgId && reportTitle === title);
      if (!report) continue;
      const [, , reportStatus, reportNote, attendance, expenses] = report;
      const narrativeFilename = `sample-report-${orgId}-narrative.pdf`;
      const liquidationFilename = `sample-report-${orgId}-liquidation.pdf`;
      for (const [reportFilename, docType] of [
        [narrativeFilename, "Post-Event Narrative Report"],
        [liquidationFilename, "Financial Liquidation Report"],
      ]) {
        const pdfBytes = await generateDocumentPdfByType({
          docType: `Sample ${docType}: ${title}`, studentNo, studentName, orgName, dateStr: eventDate,
        });
        fs.writeFileSync(path.join(osasStorageDir, reportFilename), pdfBytes);
      }
      const reviewer = reportStatus === "Submitted" ? null : "PUPOSAS-001";
      const reportReviewedAt = reviewer ? new Date().toISOString() : null;
      await run(
        `WITH updated AS (
           UPDATE osas_post_event_reports SET organization_id=$2, submitted_by_email=$3, actual_attendance=$4,
             total_expenses=$5, status=$8, review_note=$9, reviewed_by=$10, reviewed_at=$11, updated_at=NOW()
           WHERE event_proposal_id=$1 AND narrative_storage_filename=$6 RETURNING id
         )
         INSERT INTO osas_post_event_reports (event_proposal_id, organization_id, submitted_by_email, actual_attendance,
           total_expenses, narrative_storage_filename, narrative_original_filename, liquidation_storage_filename,
           liquidation_original_filename, status, review_note, reviewed_by, reviewed_at)
         SELECT $1,$2,$3,$4,$5,$6,'Narrative Report.pdf',$7,'Financial Liquidation Report.pdf',$8,$9,$10,$11
         WHERE NOT EXISTS (SELECT 1 FROM updated)`,
        [propId, orgId, email, attendance, expenses, narrativeFilename, liquidationFilename, reportStatus, reportNote, reviewer, reportReviewedAt],
      );
      const parentStatus = reportStatus === "Declined" ? "Pending Submission" : reportStatus;
      await run(
        `UPDATE event_proposals SET post_event_status=$2, post_event_due_date=event_date+10,
           post_event_cleared_by=$3, post_event_cleared_at=$4 WHERE id=$1`,
        [propId, parentStatus, reportStatus === "Cleared" ? reviewer : null, reportStatus === "Cleared" ? reportReviewedAt : null],
      );
      await run(
        `INSERT INTO transaction_updates (event_proposal_id, status, message, created_by)
         VALUES ($1,$2,$3,$4)`,
        [propId, `Post-Event ${reportStatus}`, reportNote || "Narrative and financial liquidation reports submitted.", reviewer],
      );
    }

    await run(`INSERT INTO global_audit_logs (office_id, actor, role, action, ip) VALUES ('registrar', 'System Administrator', 'Admin', 'Sample data populated (PostgreSQL)', '127.0.0.1')`);

    if (force || !(await runOne("SELECT 1 FROM settings WHERE key = 'storage_layout'"))) {
      const defaultLayoutJson = JSON.stringify(buildDefaultStorageLayout());
      await run(`INSERT INTO settings (key, value) VALUES ('storage_layout', $1) ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value, updated_at=NOW()`, [defaultLayoutJson]);
      await run(`INSERT INTO settings (key, value) VALUES ('storage_layout:registrar', $1) ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value, updated_at=NOW()`, [defaultLayoutJson]);
    }

    const savedOsasLayout = await runOne("SELECT value FROM settings WHERE key = 'storage_layout:osas'");
    let legacyOsasLayout = false;
    if (savedOsasLayout?.value) {
      try {
        legacyOsasLayout = isLegacyOsasStorageLayout(JSON.parse(savedOsasLayout.value));
      } catch {
        // The layout reader already falls back to the office default for invalid JSON.
      }
    }
    if (force || !savedOsasLayout || legacyOsasLayout) {
      await run(
        `INSERT INTO settings (key, value) VALUES ('storage_layout:osas', $1)
         ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value, updated_at=NOW()
         WHERE $2 OR settings.value = $3`,
        [JSON.stringify(buildDefaultOsasStorageLayout()), force, savedOsasLayout?.value ?? null],
      );
    }

    // ------------------------------------------------------------------------
    // Seed Authoritative Constitution & By-Laws (CBL) Versions
    // ------------------------------------------------------------------------
    const localDataDir = getLocalDataDir();
    const osasBylawsStorageDir = path.join(localDataDir, "storage", "osas", "bylaws");
    const osasBylawsLegacyDir = path.join(localDataDir, "osas", "bylaws");
    fs.mkdirSync(osasBylawsStorageDir, { recursive: true });
    fs.mkdirSync(osasBylawsLegacyDir, { recursive: true });

    const writeCblFile = (filename, buffer) => {
      const dirs = [
        osasBylawsStorageDir,
        osasBylawsLegacyDir,
        osasStorageDir,
        osasUploadsDir,
        path.resolve(repoRoot, ".local/storage/osas/bylaws"),
        path.resolve(repoRoot, ".local/storage/osas/uploads"),
      ];
      for (const dir of dirs) {
        try {
          fs.mkdirSync(dir, { recursive: true });
          fs.writeFileSync(path.join(dir, filename), buffer);
        } catch {
          // ignore directory write errors if duplicate
        }
      }
    };

    await run(`DELETE FROM organization_bylaws_versions WHERE organization_id = ANY($1::text[])`, [organizations.map(([id]) => id)]);

    const approvedCblOrgs = [
      { id: "jfinex", ratifiedDate: "August 15, 2026" },
      { id: "jpia", ratifiedDate: "August 18, 2026" },
      { id: "glitch", ratifiedDate: "August 20, 2026" },
      { id: "hm-society", ratifiedDate: "August 22, 2026" },
      { id: "psysoc", ratifiedDate: "August 25, 2026" },
      { id: "pylon-esports", ratifiedDate: "September 02, 2026" },
      { id: "rotaract", ratifiedDate: "September 05, 2026" },
      { id: "hhc", ratifiedDate: "September 10, 2026" },
      { id: "adc", ratifiedDate: "September 12, 2026" },
    ];

    for (const cblEntry of approvedCblOrgs) {
      const org = organizations.find(([id]) => id === cblEntry.id);
      if (!org) continue;
      const [orgId, orgName, acronym, category, , , adviserName] = org;
      const storageFilename = `cbl_${orgId}_ay2026.pdf`;
      const originalFilename = `${acronym}_CBL_AY2026.pdf`;

      const cblBytes = await generateCblPdf({
        orgName,
        acronym,
        category,
        adviserName,
        ratifiedDate: cblEntry.ratifiedDate,
      });

      writeCblFile(storageFilename, cblBytes);

      await run(
        `INSERT INTO organization_bylaws_versions (
           organization_id, version_tag, storage_filename, original_filename,
           size_bytes, mime_type, amendment_summary, status, approved_by,
           effective_date, created_at, updated_at
         )
         VALUES ($1, 'AY 2026-2027 Ratification', $2, $3, $4, 'application/pdf',
           'Official Constitution and By-Laws ratified by General Membership and approved by OSAS Directorate.',
           'Approved', 'PUPOSAS-001', $5, NOW() - INTERVAL '60 days', NOW() - INTERVAL '60 days')`,
        [orgId, storageFilename, originalFilename, cblBytes.length, cblEntry.ratifiedDate],
      );
    }

    // Seed a pending/revision amendment for variety (lente-filikulas)
    const lenteOrg = organizations.find(([id]) => id === "lente-filikulas");
    if (lenteOrg) {
      const [lenteId, lenteName, lenteAcronym, lenteCategory, , , lenteAdviser] = lenteOrg;
      const lenteStorageFilename = `cbl_lente_rev2.pdf`;
      const lenteOriginalFilename = `LENTE_CBL_2026_Rev2.pdf`;
      const lenteBytes = await generateCblPdf({
        orgName: lenteName,
        acronym: lenteAcronym,
        category: lenteCategory,
        adviserName: lenteAdviser,
        ratifiedDate: "October 20, 2026",
      });

      writeCblFile(lenteStorageFilename, lenteBytes);

      await run(
        `INSERT INTO organization_bylaws_versions (
           organization_id, version_tag, storage_filename, original_filename,
           size_bytes, mime_type, amendment_summary, status, review_note,
           effective_date, created_at, updated_at
         )
         VALUES ($1, '2026-Rev2 Amendment', $2, $3, $4, 'application/pdf',
           'Proposed amendment to Article IV Section 2 regarding cinematographic production equipment checkout protocol.',
           'Needs Revision',
           'Please clarify the custodian responsibility and equipment liability clauses in Section 2.4 before resubmission.',
           CURRENT_DATE, NOW() - INTERVAL '5 days', NOW() - INTERVAL '2 days')`,
        [lenteId, lenteStorageFilename, lenteOriginalFilename, lenteBytes.length],
      );
    }

    // ------------------------------------------------------------------------
    // Seed Unified Notifications & Default Staff Read States
    // ------------------------------------------------------------------------
    await run("DELETE FROM staff_notification_reads");
    await run("DELETE FROM notifications");

    const formatReqStatus = (st) => {
      if (st === "InProgress") return "In Progress";
      if (st === "PendingPayment") return "Pending Payment";
      return st || "Pending";
    };

    // 1. Seed Registrar Document Request Notifications
    const { rows: seededRequests } = await run(`
      SELECT id, student_no, doc_type, status, notes, created_by, updated_by, requester_name, course_code, created_at, updated_at
      FROM document_requests
      WHERE office_id = 'registrar'
      ORDER BY id ASC
    `);

    for (const req of seededRequests) {
      let requesterName = req.student_no || "Student";
      try {
        requesterName = decryptPII(req.requester_name) || requesterName;
      } catch {
        requesterName = req.requester_name || requesterName;
      }
      const actorId = req.updated_by || req.created_by || "PUPREGISTRAR-002";
      const actorName = actorId === "PUPREGISTRAR-003" ? "Elias Austria" : "Marcus Reyes";
      const formattedStatus = formatReqStatus(req.status);
      const sev = req.status === "Completed" || req.status === "Ready" ? "success"
        : req.status === "Cancelled" ? "error"
        : req.status === "Deficient" ? "warning"
        : "info";

      const title = req.status === "Pending"
        ? `Document Request: ${req.doc_type} (Pending)`
        : `Request ${formattedStatus}: ${req.doc_type}`;
      const message = req.status === "Pending"
        ? `Request #${req.id} for ${req.doc_type} (${requesterName}) was submitted.`
        : `Request #${req.id} for ${req.doc_type} (${requesterName}) was updated to ${formattedStatus}.`;

      await run(
        `INSERT INTO notifications (
           office_id, type, title, message, severity,
           actor_name, actor_id, entity_type, entity_id,
           metadata, created_at
         )
         VALUES ('registrar', 'document_request', $1, $2, $3, $4, $5, 'document_request', $6, $7, $8)`,
        [
          title,
          message,
          sev,
          actorName,
          actorId,
          String(req.id),
          JSON.stringify({
            request_id: req.id,
            student_no: req.student_no,
            requester_name: requesterName,
            doc_type: req.doc_type,
            status: req.status,
            notes: req.notes,
            course_code: req.course_code,
          }),
          req.updated_at || req.created_at || new Date().toISOString(),
        ],
      );
    }

    // 2. Seed Registrar Document Review Notifications
    const { rows: seededDocs } = await run(`
      SELECT id, student_no, student_name, doc_type, original_filename, approval_status, reviewed_by, reviewed_at, review_note, mime_type, created_at
      FROM documents
      WHERE office_id = 'registrar'
        AND (
          student_no = '${specimenStudentNo}'
          OR approval_status IN ('Declined', 'Pending')
          OR (approval_status = 'Approved' AND id % 25 = 0)
        )
      ORDER BY id ASC
      LIMIT 30
    `);

    for (const doc of seededDocs) {
      const isApproved = doc.approval_status === "Approved";
      const isDeclined = doc.approval_status === "Declined";
      const reviewerName = doc.reviewed_by === "PUPREGISTRAR-002" ? "Marcus Reyes" : "Elias Austria";
      const reviewerId = doc.reviewed_by || "PUPREGISTRAR-003";

      const title = isApproved
        ? `Document Approved: ${doc.doc_type}`
        : isDeclined
        ? `Document Declined: ${doc.doc_type}`
        : `Document Uploaded: ${doc.doc_type}`;

      const message = isApproved
        ? `${reviewerName} approved ${doc.doc_type} for student ${doc.student_name} (${doc.student_no}).`
        : isDeclined
        ? `${reviewerName} declined ${doc.doc_type} for student ${doc.student_name} (${doc.student_no}): "${doc.review_note || "Requirements incomplete"}"`
        : `New submission for ${doc.doc_type} uploaded for ${doc.student_name} (${doc.student_no}) awaiting verification.`;

      const sev = isApproved ? "success" : isDeclined ? "error" : "info";

      await run(
        `INSERT INTO notifications (
           office_id, type, title, message, severity,
           actor_name, actor_id, entity_type, entity_id,
           metadata, created_at
         )
         VALUES ('registrar', 'document_review', $1, $2, $3, $4, $5, 'document', $6, $7, $8)`,
        [
          title,
          message,
          sev,
          doc.approval_status === "Pending" ? "Student Submission" : reviewerName,
          doc.approval_status === "Pending" ? null : reviewerId,
          String(doc.id),
          JSON.stringify({
            document_id: doc.id,
            student_no: doc.student_no,
            student_name: doc.student_name,
            doc_type: doc.doc_type,
            original_filename: doc.original_filename,
            approval_status: doc.approval_status,
            reviewed_by: doc.reviewed_by || "PUPREGISTRAR-003",
            reviewer_name: reviewerName,
            reviewed_at: doc.reviewed_at,
            review_note: doc.review_note,
            mime_type: doc.mime_type,
          }),
          doc.reviewed_at || doc.created_at || new Date().toISOString(),
        ],
      );
    }

    // 3. Seed Registrar Scan Upload Notifications
    const scanIngestions = [
      {
        title: "Batch Scan Ingestion: Batch #2026-08",
        message: "Marcus Reyes completed batch scanning and OCR processing for 12 enrollment forms in Station REG-ARCHIVE-PC01.",
        severity: "success",
        metadata: { batch_id: "BATCH-2026-08", total_files: 12, station: "REG-ARCHIVE-PC01" },
        createdAt: new Date(Date.now() - 3600000 * 36).toISOString(),
      },
      {
        title: "Batch Scan Ingestion: Batch #2026-09",
        message: "Marcus Reyes queued and matched 8 student documents in Station REG-ARCHIVE-PC01.",
        severity: "info",
        metadata: { batch_id: "BATCH-2026-09", total_files: 8, station: "REG-ARCHIVE-PC01" },
        createdAt: new Date(Date.now() - 3600000 * 12).toISOString(),
      },
    ];
    for (const scan of scanIngestions) {
      await run(
        `INSERT INTO notifications (
           office_id, type, title, message, severity,
           actor_name, actor_id, entity_type, entity_id,
           metadata, created_at
         )
         VALUES ('registrar', 'scan_upload', $1, $2, $3, 'Marcus Reyes', 'PUPREGISTRAR-002', 'system', NULL, $4, $5)`,
        [scan.title, scan.message, scan.severity, JSON.stringify(scan.metadata), scan.createdAt],
      );
    }

    // 4. Seed OSAS Event Proposal Notifications
    const { rows: seededProposals } = await run(`
      SELECT ep.id, ep.title, ep.organization_id, ep.organization_name, ep.status, ep.review_note,
             ep.reviewed_at, ep.event_date, ep.venue, ep.reviewed_by, ep.created_at, ep.student_no
      FROM event_proposals ep
      WHERE ep.office_id = 'osas'
      ORDER BY ep.id ASC
    `);

    for (const prop of seededProposals) {
      const isApproved = prop.status === "Approved";
      const isDeclined = prop.status === "Declined";
      const isRevision = prop.status === "Needs Revision";
      const isUnderReview = prop.status === "Under Review";

      const title = isApproved
        ? `Event Proposal Approved: ${prop.title}`
        : isDeclined
        ? `Event Proposal Declined: ${prop.title}`
        : isRevision
        ? `Event Proposal Needs Revision: ${prop.title}`
        : isUnderReview
        ? `Event Proposal Under Review: ${prop.title}`
        : `Event Proposal Submitted: ${prop.title}`;

      const message = isApproved
        ? `Dr. Sandra Gomez approved event proposal "${prop.title}" for ${prop.organization_name}.`
        : isDeclined
        ? `Dr. Sandra Gomez declined event proposal "${prop.title}" for ${prop.organization_name}: "${prop.review_note || "Does not comply with campus guidelines."}"`
        : isRevision
        ? `Dr. Sandra Gomez requested revisions for "${prop.title}" (${prop.organization_name}): "${prop.review_note || "Update event logistics."}"`
        : isUnderReview
        ? `Event proposal "${prop.title}" for ${prop.organization_name} is under review by OSAS.`
        : `New event proposal "${prop.title}" submitted by ${prop.organization_name} for OSAS evaluation.`;

      const sev = isApproved ? "success" : isDeclined ? "error" : isRevision ? "warning" : "info";

      await run(
        `INSERT INTO notifications (
           office_id, type, title, message, severity,
           actor_name, actor_id, entity_type, entity_id,
           metadata, created_at
         )
         VALUES ('osas', 'document_review', $1, $2, $3, $4, $5, 'document', $6, $7, $8)`,
        [
          title,
          message,
          sev,
          prop.status === "Submitted" ? "Student Organization" : "Dr. Sandra Gomez",
          prop.status === "Submitted" ? null : "PUPOSAS-001",
          String(prop.id),
          JSON.stringify({
            proposal_id: prop.id,
            title: prop.title,
            organization_id: prop.organization_id,
            organization_name: prop.organization_name,
            status: prop.status,
            approval_status: prop.status,
            review_note: prop.review_note,
            event_date: prop.event_date,
            venue: prop.venue,
            reviewed_by: prop.reviewed_by,
          }),
          prop.reviewed_at || prop.created_at || new Date().toISOString(),
        ],
      );
    }

    // 5. Seed OSAS Post-Event Compliance Notifications
    const { rows: seededReports } = await run(`
      SELECT r.id, r.event_proposal_id, r.organization_id, r.status, r.review_note, r.reviewed_by,
             r.reviewed_at, r.created_at, ep.title as event_title, so.name as organization_name
      FROM osas_post_event_reports r
      JOIN event_proposals ep ON ep.id = r.event_proposal_id
      LEFT JOIN student_organizations so ON so.id = r.organization_id
      ORDER BY r.id ASC
    `);

    for (const rep of seededReports) {
      const isCleared = rep.status === "Cleared";
      const isDeclined = rep.status === "Declined";
      const isRevision = rep.status === "Needs Revision";

      const title = `Post-Event Report ${rep.status}: ${rep.event_title}`;
      const message = isCleared
        ? `Dr. Sandra Gomez cleared post-event compliance for "${rep.event_title}" (${rep.organization_name || rep.organization_id}).`
        : isDeclined
        ? `Dr. Sandra Gomez declined post-event submission for "${rep.event_title}": "${rep.review_note || "Invalid receipts."}"`
        : isRevision
        ? `Dr. Sandra Gomez requested revision for post-event report "${rep.event_title}": "${rep.review_note || "Reconcile budget."}"`
        : `Post-event narrative and financial reports submitted for "${rep.event_title}".`;

      const sev = isCleared ? "success" : isDeclined ? "error" : isRevision ? "warning" : "info";

      await run(
        `INSERT INTO notifications (
           office_id, type, title, message, severity,
           actor_name, actor_id, entity_type, entity_id,
           metadata, created_at
         )
         VALUES ('osas', 'document_review', $1, $2, $3, 'Dr. Sandra Gomez', 'PUPOSAS-001', 'document', $4, $5, $6)`,
        [
          title,
          message,
          sev,
          String(rep.event_proposal_id),
          JSON.stringify({
            proposal_id: rep.event_proposal_id,
            title: rep.event_title,
            organization_id: rep.organization_id,
            status: rep.status,
            approval_status: rep.status,
            review_note: rep.review_note,
          }),
          rep.reviewed_at || rep.created_at || new Date().toISOString(),
        ],
      );
    }

    // 6. Seed OSAS Organization Document Approvals
    const { rows: seededOsasDocs } = await run(`
      SELECT id, student_no, student_name, doc_type, original_filename, approval_status, reviewed_by, reviewed_at, review_note, mime_type, event_name, organization_id, created_at
      FROM documents
      WHERE office_id = 'osas'
      ORDER BY id ASC
    `);

    for (const doc of seededOsasDocs) {
      const title = `Document Approved: ${doc.doc_type}`;
      const orgLabel = doc.event_name ? `event "${doc.event_name}"` : `organization ${doc.organization_id?.toUpperCase() || "record"}`;
      const message = `Dr. Sandra Gomez approved ${doc.doc_type} for ${orgLabel}.`;

      await run(
        `INSERT INTO notifications (
           office_id, type, title, message, severity,
           actor_name, actor_id, entity_type, entity_id,
           metadata, created_at
         )
         VALUES ('osas', 'document_review', $1, $2, 'success', 'Dr. Sandra Gomez', 'PUPOSAS-001', 'document', $3, $4, $5)`,
        [
          title,
          message,
          String(doc.id),
          JSON.stringify({
            document_id: doc.id,
            student_no: doc.student_no,
            student_name: doc.student_name,
            doc_type: doc.doc_type,
            original_filename: doc.original_filename,
            approval_status: "Approved",
            reviewed_by: "PUPOSAS-001",
            reviewer_name: "Dr. Sandra Gomez",
            reviewed_at: doc.reviewed_at,
            review_note: doc.review_note,
            mime_type: doc.mime_type,
          }),
          doc.reviewed_at || doc.created_at || new Date().toISOString(),
        ],
      );
    }

    // 6b. Seed OSAS Constitution & By-Laws (CBL) Notifications
    const { rows: seededBylaws } = await run(`
      SELECT obv.id, obv.organization_id, obv.version_tag, obv.storage_filename, obv.original_filename,
             obv.status, obv.review_note, obv.effective_date, obv.created_at, so.name AS org_name, so.acronym
      FROM organization_bylaws_versions obv
      JOIN student_organizations so ON so.id = obv.organization_id
      ORDER BY obv.id ASC
    `);

    for (const bylaw of seededBylaws) {
      const isApproved = bylaw.status === "Approved";
      const title = isApproved
        ? `Constitution & By-Laws Approved: ${bylaw.acronym || bylaw.org_name}`
        : `Constitution & By-Laws Revision: ${bylaw.acronym || bylaw.org_name}`;
      const message = isApproved
        ? `Dr. Sandra Gomez approved Constitution & By-Laws (${bylaw.version_tag}) for ${bylaw.org_name}.`
        : `Constitution & By-Laws (${bylaw.version_tag}) for ${bylaw.org_name} requires revision: ${bylaw.review_note}`;
      const severity = isApproved ? "success" : "warning";

      await run(
        `INSERT INTO notifications (
           office_id, type, title, message, severity,
           actor_name, actor_id, entity_type, entity_id,
           metadata, created_at
         )
         VALUES ('osas', 'document_review', $1, $2, $3, 'Dr. Sandra Gomez', 'PUPOSAS-001', 'organization_bylaws', $4, $5, $6)`,
        [
          title,
          message,
          severity,
          String(bylaw.id),
          JSON.stringify({
            bylaws_version_id: bylaw.id,
            organization_id: bylaw.organization_id,
            organization_name: bylaw.org_name,
            version_tag: bylaw.version_tag,
            original_filename: bylaw.original_filename,
            storage_filename: bylaw.storage_filename,
            status: bylaw.status,
            review_note: bylaw.review_note,
            effective_date: bylaw.effective_date,
            reviewer_name: "Dr. Sandra Gomez",
            reviewed_by: "PUPOSAS-001",
          }),
          bylaw.created_at || new Date().toISOString(),
        ],
      );
    }

    // 7. Seed System Notifications (SuperAdmin Platform Alerts)
    const systemNotifs = [
      {
        title: "Automated Database Backup Complete",
        message: "Nightly AES-256 encrypted database snapshot verified and stored to primary archive storage.",
        severity: "success",
        metadata: { backup_type: "automated", encryption: "AES-256-CBC" },
        createdAt: new Date(Date.now() - 3600000 * 20).toISOString(),
      },
      {
        title: "Station Diagnostics: All Stations Healthy",
        message: "Heartbeat ping verified for REG-ARCHIVE-PC01 and OSAS-OPERATIONS-PC01 scanners.",
        severity: "info",
        metadata: { stations: ["REG-ARCHIVE-PC01", "OSAS-OPERATIONS-PC01"], status: "healthy" },
        createdAt: new Date(Date.now() - 3600000 * 8).toISOString(),
      },
    ];
    for (const sys of systemNotifs) {
      await run(
        `INSERT INTO notifications (
           office_id, type, title, message, severity,
           actor_name, actor_id, entity_type, entity_id,
           metadata, created_at
         )
         VALUES (NULL, 'system', $1, $2, $3, 'System Administrator', 'PUPSUPERADMIN-001', 'system', NULL, $4, $5)`,
        [sys.title, sys.message, sys.severity, JSON.stringify(sys.metadata), sys.createdAt],
      );
    }

    // 8. Seed staff_notification_reads for Default Personnel
    const { rows: registrarNotifs } = await run(`SELECT id, created_at FROM notifications WHERE office_id = 'registrar' ORDER BY created_at DESC`);
    const { rows: osasNotifs } = await run(`SELECT id, created_at FROM notifications WHERE office_id = 'osas' ORDER BY created_at DESC`);
    const { rows: allNotifs } = await run(`SELECT id, created_at FROM notifications ORDER BY created_at DESC`);

    const seedStaffReads = async (staffId, notifList, unreadTarget) => {
      const readItems = notifList.slice(unreadTarget);
      for (const item of readItems) {
        await run(
          `INSERT INTO staff_notification_reads (staff_id, notification_id, is_read, read_at, updated_at)
           VALUES ($1, $2, TRUE, NOW(), NOW())
           ON CONFLICT (staff_id, notification_id) DO UPDATE SET is_read = TRUE, read_at = NOW(), updated_at = NOW()`,
          [staffId, item.id],
        );
      }
    };

    // Default Personnel:
    // PUPREGISTRAR-002 (Marcus Reyes - Registrar Staff): 8 unread, rest read
    await seedStaffReads("PUPREGISTRAR-002", registrarNotifs, 8);

    // PUPREGISTRAR-003 (Elias Austria - Registrar Admin): 6 unread, rest read
    await seedStaffReads("PUPREGISTRAR-003", registrarNotifs, 6);

    // PUPOSAS-001 (Sandra Gomez - OSAS Admin): 5 unread, rest read
    await seedStaffReads("PUPOSAS-001", osasNotifs, 5);

    // PUPOSAS-002 (Juanito Rizal - OSAS Staff): 7 unread, rest read
    await seedStaffReads("PUPOSAS-002", osasNotifs, 7);

    // PUPSUPERADMIN-001 (Ramon Villanueva - SuperAdmin): 4 unread, rest read
    await seedStaffReads("PUPSUPERADMIN-001", allNotifs, 4);

    // Any other staff accounts in the database:
    const { rows: otherStaff } = await run(`
      SELECT id, office_id FROM staff
      WHERE id NOT IN ('PUPREGISTRAR-002', 'PUPREGISTRAR-003', 'PUPOSAS-001', 'PUPOSAS-002', 'PUPSUPERADMIN-001')
    `);
    for (const st of otherStaff) {
      if (st.office_id === "registrar") await seedStaffReads(st.id, registrarNotifs, 8);
      else if (st.office_id === "osas") await seedStaffReads(st.id, osasNotifs, 6);
      else await seedStaffReads(st.id, allNotifs, 4);
    }
  });

  const [studentCount, documentCount, requestCount, proposalCount, portalAccountCount, notificationCount, bylawsCount, settings] = await Promise.all([
    queryOne("SELECT COUNT(*)::int AS count FROM students"),
    queryOne("SELECT COUNT(*)::int AS count FROM documents"),
    queryOne("SELECT COUNT(*)::int AS count FROM document_requests"),
    queryOne("SELECT COUNT(*)::int AS count FROM event_proposals"),
    queryOne("SELECT COUNT(*)::int AS count FROM student_accounts"),
    queryOne("SELECT COUNT(*)::int AS count FROM notifications"),
    queryOne("SELECT COUNT(*)::int AS count FROM organization_bylaws_versions"),
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
    portalAccounts: Number(portalAccountCount.count),
    notifications: Number(notificationCount.count),
    bylaws: Number(bylawsCount.count),
    rooms: layout.rooms.length,
    cabinets: cabinetCount,
    drawers: drawerCount,
  };
  console.log(`[populate-sample-data] PostgreSQL sample data ready: ${summary.students} students, ${summary.documents} documents, ${summary.requests} requests, ${summary.proposals} proposals, ${summary.portalAccounts} ODRS portal accounts, ${summary.bylaws} bylaws versions, ${summary.rooms} rooms, ${summary.cabinets} cabinets, ${summary.drawers} drawers.`);
  return summary;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  try {
    await seed();
    console.log("\n[populate-sample-data] Demo login credentials:");
    console.log("Staff accounts:");
    for (const [id, , fname, lname, role, , email] of officialStaff) {
      console.log(`  ${role}: ${fname} ${lname} (${id}) | login: ${email} | password: ${staffPassword}`);
    }
    console.log("Student accounts (login with email or student number):");
    for (const [studentNo, email] of demoStudentAccounts) {
      console.log(`  ${studentNo} / ${email} | password: student123`);
    }
  } catch (error) {
    console.error("[populate-sample-data] Failed:", error);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}
