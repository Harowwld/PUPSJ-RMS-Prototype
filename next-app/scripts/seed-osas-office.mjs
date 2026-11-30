/**
 * Standalone & Integrated Seed Script for the OSAS Office (Office of Student Affairs and Services).
 *
 * Populates complete, realistic OSAS institutional records:
 * 1. OSAS Document Types (Student Governance & Activities)
 * 2. 14 Official Whiteboard Organizations + Test Fixtures
 * 3. Whitelisted Student Officers for every organization (linking demo student accounts)
 * 4. Ratified Constitution & By-Laws (CBL) versions with authentic PDF documents
 * 5. Event Proposals across all Kanban statuses (Submitted, Under Review, Needs Revision, Approved, Declined, Archived)
 * 6. Transaction Update history timelines for every proposal
 * 7. Post-Event Compliance & Financial Liquidation reports (Cleared, Under Review, Needs Revision)
 * 8. Official OSAS Archival Documents in the documents repository with physical storage coordinates
 * 9. Administrative Audit Trail entries for OSAS staff
 *
 * Usage:
 *   node scripts/seed-osas-office.mjs
 *   pnpm db:seed:osas
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

dotenv.config({ path: ".env" });

const { pool, query, queryOne, transaction } = await import("../src/lib/postgres.js");
const { encryptPII, decryptPII } = await import("../src/lib/piiEncryption.js");
const { buildDefaultOsasStorageLayout } = await import("../src/lib/storageLayoutDefaults.js");

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Storage directories
const ROOT_DIR = path.resolve(__dirname, "..");
const DATA_DIR = process.env.LOCAL_DATA_DIR || ".local";
const UPLOADS_DIR = path.resolve(ROOT_DIR, DATA_DIR, "uploads");
const OSAS_UPLOADS_DIR = path.resolve(ROOT_DIR, DATA_DIR, "osas", "uploads");
const OSAS_STORAGE_DIR = path.resolve(ROOT_DIR, DATA_DIR, "storage", "osas", "uploads");
const SAMPLE_OSAS_PDFS_DIR = path.resolve(ROOT_DIR, "../_SAMPLE_DATA/pdfs/osas");

function ensureDirectories() {
  for (const dir of [UPLOADS_DIR, OSAS_UPLOADS_DIR, OSAS_STORAGE_DIR]) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function writeToAllUploadDirs(filename, buffer) {
  for (const dir of [UPLOADS_DIR, OSAS_UPLOADS_DIR, OSAS_STORAGE_DIR]) {
    try {
      fs.writeFileSync(path.join(dir, filename), buffer);
    } catch (err) {
      console.warn(`Warning: Could not write to ${dir}/${filename}:`, err.message);
    }
  }
}

// ============================================================================
// PDF GENERATION UTILITIES
// ============================================================================

const Maroon = rgb(128 / 255, 0, 0);
const DarkSlate = rgb(30 / 255, 41 / 255, 59 / 255);
const MediumGray = rgb(100 / 255, 116 / 255, 139 / 255);
const LightGray = rgb(245 / 255, 247 / 255, 250 / 255);
const BorderGray = rgb(215 / 255, 222 / 255, 230 / 255);
const Green = rgb(22 / 255, 101 / 255, 52 / 255);
const Blue = rgb(30 / 255, 64 / 255, 175 / 255);

async function createBaseDoc() {
  const doc = await PDFDocument.create();
  const fontRegular = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const fontOblique = await doc.embedFont(StandardFonts.HelveticaOblique);
  return { doc, fontRegular, fontBold, fontOblique };
}

function drawHeader(page, fonts, { formCode, title, refNo, dateStr }) {
  const { fontRegular, fontBold } = fonts;
  const width = page.getWidth();

  page.drawRectangle({ x: 40, y: 755, width: width - 80, height: 3, color: Maroon });

  page.drawText("POLYTECHNIC UNIVERSITY OF THE PHILIPPINES", {
    x: 40,
    y: 738,
    size: 11,
    font: fontBold,
    color: Maroon,
  });

  page.drawText("SAN JUAN CAMPUS  •  OFFICE OF STUDENT AFFAIRS AND SERVICES", {
    x: 40,
    y: 726,
    size: 8,
    font: fontBold,
    color: DarkSlate,
  });

  if (refNo) {
    page.drawText(`REF: ${refNo}`, {
      x: width - 180,
      y: 738,
      size: 8,
      font: fontBold,
      color: Maroon,
    });
  }
  if (dateStr) {
    page.drawText(`DATE: ${dateStr}`, {
      x: width - 180,
      y: 726,
      size: 8,
      font: fontRegular,
      color: MediumGray,
    });
  }

  page.drawRectangle({
    x: 40,
    y: 678,
    width: width - 80,
    height: 36,
    color: LightGray,
    borderColor: BorderGray,
    borderWidth: 1,
  });

  page.drawText(title.toUpperCase(), {
    x: 52,
    y: 694,
    size: 11,
    font: fontBold,
    color: DarkSlate,
  });

  if (formCode) {
    page.drawText(formCode, {
      x: width - 160,
      y: 694,
      size: 8,
      font: fontBold,
      color: Maroon,
    });
  }
}

function drawFooter(page, fonts, code) {
  const { fontRegular, fontOblique } = fonts;
  page.drawLine({
    start: { x: 40, y: 50 },
    end: { x: page.getWidth() - 40, y: 50 },
    thickness: 0.5,
    color: BorderGray,
  });
  page.drawText("Polytechnic University of the Philippines San Juan | Records Keeping System — OSAS Official Repository", {
    x: 40,
    y: 38,
    size: 7,
    font: fontOblique,
    color: MediumGray,
  });
  if (code) {
    page.drawText(`FORM ID: ${code}`, {
      x: page.getWidth() - 140,
      y: 38,
      size: 7,
      font: fontRegular,
      color: MediumGray,
    });
  }
}

async function generateCblPdf({ orgName, acronym, category, adviserName, ratifiedDate = "August 15, 2026" }) {
  const { doc, fontRegular, fontBold, fontOblique } = await createBaseDoc();
  const page = doc.addPage([595.28, 841.89]);
  const fonts = { fontRegular, fontBold, fontOblique };

  drawHeader(page, fonts, {
    formCode: "OSAS-CBL-2026",
    title: "CONSTITUTION AND BY-LAWS",
    refNo: `CBL-${acronym}-2026`,
    dateStr: ratifiedDate,
  });

  let y = 650;
  page.drawText("ORGANIZATION CONSTITUTION & BY-LAWS CHARTER", { x: 50, y, size: 10, font: fontBold, color: Maroon });
  y -= 16;
  page.drawText(`${orgName.toUpperCase()} (${acronym})`, { x: 50, y, size: 12, font: fontBold, color: DarkSlate });
  y -= 14;
  page.drawText(`Classification: ${category} Student Organization  •  PUP San Juan Campus`, { x: 50, y, size: 8, font: fontRegular, color: MediumGray });

  y -= 20;
  const articles = [
    { title: "ARTICLE I — NAME, DOMICILE, AND NATURE", text: `The name of this organization shall be ${orgName} (${acronym}). Its official seat of leadership and administrative operations shall be at the Polytechnic University of the Philippines San Juan Campus.` },
    { title: "ARTICLE II — PURPOSE AND OBJECTIVES", text: "To foster academic excellence, ethical professional leadership, holistic student welfare, civic empowerment, and proactive engagement in university initiatives in alignment with PUP institutional goals." },
    { title: "ARTICLE III — MEMBERSHIP AND PRIVILEGES", text: "Membership shall be open to all duly enrolled PUP San Juan students satisfying the curriculum or special-interest eligibility criteria, without discrimination based on gender, ethnicity, creed, or socioeconomic status." },
    { title: "ARTICLE IV — EXECUTIVE BOARD AND GOVERNANCE", text: "The Executive Board shall be composed of the President, Vice President, Secretary, Treasurer, Auditor, and Public Relations Officer, elected through a general democratic vote of active members." },
    { title: "ARTICLE V — MEETINGS, ELECTIONS, AND QUORUM", text: "A simple majority of active members shall constitute a quorum for general assemblies. Executive meetings shall be conducted monthly or upon special call by the President with adviser concurrence." },
    { title: "ARTICLE VI — AMENDMENTS AND RATIFICATION", text: "Amendments to this Constitution require a two-thirds majority vote of the general membership and official endorsement by the Faculty Adviser and approval by the OSAS Director." },
  ];

  for (const art of articles) {
    page.drawText(art.title, { x: 50, y, size: 8.5, font: fontBold, color: DarkSlate });
    y -= 12;
    page.drawText(art.text.slice(0, 110), { x: 50, y, size: 7.5, font: fontRegular, color: DarkSlate });
    if (art.text.length > 110) {
      y -= 10;
      page.drawText(art.text.slice(110, 220), { x: 50, y, size: 7.5, font: fontRegular, color: DarkSlate });
    }
    y -= 16;
  }

  y = 170;
  page.drawRectangle({ x: 50, y: y - 5, width: 495, height: 42, color: LightGray, borderColor: BorderGray, borderWidth: 1 });
  page.drawText("OSAS DIRECTORATE RATIFICATION & VERIFICATION SEAL", { x: 60, y: y + 20, size: 8, font: fontBold, color: Green });
  page.drawText(`This document serves as the official, ratified Constitution & By-Laws of ${acronym} registered with OSAS for AY 2026-2027.`, { x: 60, y: y + 8, size: 7, font: fontRegular, color: DarkSlate });

  y = 100;
  page.drawLine({ start: { x: 60, y: y + 15 }, end: { x: 220, y: y + 15 }, thickness: 1, color: DarkSlate });
  page.drawText(adviserName || "FACULTY ADVISER", { x: 60, y, size: 8, font: fontBold, color: DarkSlate });
  page.drawText("Designated Faculty Adviser", { x: 60, y: y - 10, size: 7, font: fontRegular, color: MediumGray });

  page.drawLine({ start: { x: 335, y: y + 15 }, end: { x: 495, y: y + 15 }, thickness: 1, color: DarkSlate });
  page.drawText("DR. SANDRA GOMEZ", { x: 335, y, size: 8, font: fontBold, color: DarkSlate });
  page.drawText("OSAS Director / Head", { x: 335, y: y - 10, size: 7, font: fontRegular, color: MediumGray });

  drawFooter(page, fonts, "OSAS-CBL-2026");
  return Buffer.from(await doc.save());
}

async function generateProposalPdf({ title, orgName, eventDate, venue, desc, studentNo, studentName, status }) {
  const { doc, fontRegular, fontBold, fontOblique } = await createBaseDoc();
  const page = doc.addPage([595.28, 841.89]);
  const fonts = { fontRegular, fontBold, fontOblique };

  drawHeader(page, fonts, {
    formCode: "OSAS-EP-2026",
    title: "STUDENT ACTIVITY & EVENT PROPOSAL",
    refNo: `EP-${Date.now().toString().slice(-6)}`,
    dateStr: eventDate,
  });

  page.drawRectangle({ x: 40, y: 535, width: 515, height: 125, borderColor: BorderGray, borderWidth: 1, color: LightGray });

  const drawField = (label, val, yPos, isBold = false) => {
    page.drawText(label, { x: 55, y: yPos, size: 8.5, font: fontBold, color: DarkSlate });
    page.drawText(String(val || ""), { x: 180, y: yPos, size: 8.5, font: isBold ? fontBold : fontRegular, color: isBold ? Maroon : DarkSlate });
  };

  drawField("Organization:", orgName, 635, true);
  drawField("Event Title:", title, 617, true);
  drawField("Scheduled Date:", `${eventDate} (Activity Proper)`, 599);
  drawField("Venue / Room:", venue, 581);
  drawField("Lead Proponent:", `${studentName || "Student Officer"} (${studentNo || "Authorized"})`, 563);
  drawField("Workflow Status:", `${status} — OSAS Administrative Review`, 545);

  let y = 510;
  page.drawText("PROJECT RATIONALE & OBJECTIVES", { x: 40, y, size: 9, font: fontBold, color: Maroon });
  page.drawLine({ start: { x: 40, y: y - 4 }, end: { x: 555, y: y - 4 }, thickness: 0.5, color: BorderGray });
  y -= 18;
  page.drawText(desc.slice(0, 105), { x: 40, y, size: 8, font: fontRegular, color: DarkSlate });
  if (desc.length > 105) {
    y -= 12;
    page.drawText(desc.slice(105, 210), { x: 40, y, size: 8, font: fontRegular, color: DarkSlate });
  }

  y -= 25;
  page.drawText("FACILITY, HEALTH & SAFETY PROTOCOL CLEARANCES", { x: 40, y, size: 9, font: fontBold, color: Maroon });
  page.drawLine({ start: { x: 40, y: y - 4 }, end: { x: 555, y: y - 4 }, thickness: 0.5, color: BorderGray });
  y -= 18;
  page.drawText("1. Building Administration reservation endorsement verified for venue lighting and audio equipment.", { x: 40, y, size: 7.5, font: fontRegular, color: DarkSlate });
  y -= 12;
  page.drawText("2. University Clinic and Campus Security standby protocols coordinated for attendee health monitoring.", { x: 40, y, size: 7.5, font: fontRegular, color: DarkSlate });
  y -= 12;
  page.drawText("3. Eco-friendly waste management and strict zero-single-use plastics compliance agreed by organizers.", { x: 40, y, size: 7.5, font: fontRegular, color: DarkSlate });

  y = 150;
  page.drawLine({ start: { x: 50, y: y + 20 }, end: { x: 210, y: y + 20 }, thickness: 1, color: DarkSlate });
  page.drawText(studentName || "STUDENT OFFICER", { x: 50, y: y + 6, size: 8, font: fontBold, color: DarkSlate });
  page.drawText("Lead Student Proponent", { x: 50, y: y - 4, size: 7, font: fontRegular, color: MediumGray });

  page.drawLine({ start: { x: 345, y: y + 20 }, end: { x: 505, y: y + 20 }, thickness: 1, color: DarkSlate });
  page.drawText("DR. SANDRA GOMEZ", { x: 345, y: y + 6, size: 8, font: fontBold, color: DarkSlate });
  page.drawText("Director, OSAS San Juan", { x: 345, y: y - 4, size: 7, font: fontRegular, color: MediumGray });

  drawFooter(page, fonts, "OSAS-EP-2026");
  return Buffer.from(await doc.save());
}

async function generateOrgCertPdf({ orgName, acronym, category, adviserName }) {
  const { doc, fontRegular, fontBold, fontOblique } = await createBaseDoc();
  const page = doc.addPage([595.28, 841.89]);
  const fonts = { fontRegular, fontBold, fontOblique };

  drawHeader(page, fonts, {
    formCode: "OSAS-ORC-2026",
    title: "CERTIFICATE OF ACCREDITATION & RECOGNITION",
    refNo: `ACCRED-${acronym}-2026`,
    dateStr: "AY 2026-2027",
  });

  let y = 630;
  page.drawText("THIS IS TO CERTIFY THAT", { x: 50, y, size: 10, font: fontBold, color: Maroon });
  y -= 25;

  const oName = (orgName || "STUDENT ORGANIZATION").toUpperCase();
  page.drawText(oName, { x: 50, y, size: 13, font: fontBold, color: DarkSlate });
  y -= 20;

  const body = [
    "has fully satisfied institutional accreditation requirements, filed an approved Constitution & By-Laws,",
    "established an authorized executive roster, and demonstrated designated faculty mentorship under the",
    "Office of Student Affairs and Services for Academic Year 2026-2027 at PUP San Juan Campus.",
    "",
    "The organization is fully entitled to university facilities, event proposal processing, student bulletin privileges,",
    "and leadership representation across university affairs.",
  ];
  for (const b of body) {
    if (!b) {
      y -= 6;
      continue;
    }
    page.drawText(b, { x: 50, y, size: 8.5, font: fontRegular, color: DarkSlate });
    y -= 15;
  }

  y -= 15;
  page.drawRectangle({ x: 50, y: y - 55, width: 495, height: 60, color: LightGray, borderColor: BorderGray, borderWidth: 1 });
  page.drawText("RECORD CLASSIFICATION & ARCHIVAL DATA", { x: 60, y: y - 5, size: 8, font: fontBold, color: Maroon });
  page.drawText(`Organization Category: ${category}  •  Status: ACTIVE & ACCREDITED`, { x: 60, y: y - 20, size: 7.5, font: fontRegular, color: DarkSlate });
  page.drawText(`Faculty Adviser: ${adviserName || "Designated"}  •  Valid: August 2026 to July 2027`, { x: 60, y: y - 35, size: 7.5, font: fontRegular, color: DarkSlate });
  page.drawText("Physical Archive: Room 1 (OSAS Records Keeping Repository)", { x: 60, y: y - 50, size: 7.5, font: fontRegular, color: MediumGray });

  y = 120;
  page.drawLine({ start: { x: 60, y: y + 15 }, end: { x: 220, y: y + 15 }, thickness: 1, color: DarkSlate });
  page.drawText(adviserName || "FACULTY ADVISER", { x: 60, y, size: 8, font: fontBold, color: DarkSlate });
  page.drawText("Faculty Adviser", { x: 60, y: y - 10, size: 7, font: fontRegular, color: MediumGray });

  page.drawLine({ start: { x: 335, y: y + 15 }, end: { x: 495, y: y + 15 }, thickness: 1, color: DarkSlate });
  page.drawText("DR. SANDRA GOMEZ", { x: 335, y, size: 8, font: fontBold, color: DarkSlate });
  page.drawText("Director, OSAS", { x: 335, y: y - 10, size: 7, font: fontRegular, color: MediumGray });

  drawFooter(page, fonts, "OSAS-ORC-2026");
  return Buffer.from(await doc.save());
}

async function generateReportDocPdf({ docType, orgName, acronym, title, dateStr, notes }) {
  const { doc, fontRegular, fontBold, fontOblique } = await createBaseDoc();
  const page = doc.addPage([595.28, 841.89]);
  const fonts = { fontRegular, fontBold, fontOblique };

  drawHeader(page, fonts, {
    formCode: "OSAS-DOC-2026",
    title: docType || "OSAS OFFICIAL COMPLIANCE DOCUMENT",
    refNo: `${acronym}-${Date.now().toString().slice(-6)}`,
    dateStr: dateStr || "Academic Year 2026-2027",
  });

  let y = 640;
  page.drawText("DOCUMENT SUMMARY & CERTIFICATION", { x: 50, y, size: 10, font: fontBold, color: Maroon });
  y -= 16;
  page.drawText(`${title || docType}`, { x: 50, y, size: 12, font: fontBold, color: DarkSlate });
  y -= 14;
  page.drawText(`Organization: ${orgName} (${acronym})`, { x: 50, y, size: 8.5, font: fontRegular, color: DarkSlate });

  y -= 20;
  page.drawRectangle({ x: 50, y: y - 80, width: 495, height: 85, color: LightGray, borderColor: BorderGray, borderWidth: 1 });
  page.drawText("OFFICIAL EVALUATION & ARCHIVAL VERIFICATION", { x: 60, y: y - 5, size: 8, font: fontBold, color: Maroon });
  page.drawText(`Filing Date: ${dateStr || "AY 2026-2027"}  •  Office: Office of Student Affairs and Services`, { x: 60, y: y - 22, size: 7.5, font: fontRegular, color: DarkSlate });
  page.drawText(`Reviewer: Dr. Sandra Gomez (PUPOSAS-001, OSAS Director)`, { x: 60, y: y - 36, size: 7.5, font: fontRegular, color: DarkSlate });
  page.drawText(`Compliance Notes: ${notes || "Fully vetted against student organization governance standards."}`, { x: 60, y: y - 52, size: 7.5, font: fontRegular, color: DarkSlate });
  page.drawText("Physical Archive: Archive Room 1 (PUP San Juan Records Repository)", { x: 60, y: y - 68, size: 7, font: fontRegular, color: Green });

  y = 120;
  page.drawLine({ start: { x: 335, y: y + 15 }, end: { x: 495, y: y + 15 }, thickness: 1, color: DarkSlate });
  page.drawText("DR. SANDRA GOMEZ", { x: 335, y, size: 8, font: fontBold, color: DarkSlate });
  page.drawText("Director, OSAS San Juan", { x: 335, y: y - 10, size: 7, font: fontRegular, color: MediumGray });

  drawFooter(page, fonts, "OSAS-DOC-2026");
  return Buffer.from(await doc.save());
}

// ============================================================================
// DATA DEFINITIONS
// ============================================================================

export const OSAS_DOC_TYPES = [
  { name: "Constitution & By-Laws (CBL)", category: "Student Governance & Activities" },
  { name: "Event Proposal", category: "Student Governance & Activities" },
  { name: "Activity Request", category: "Student Governance & Activities" },
  { name: "Activity Permit", category: "Student Governance & Activities" },
  { name: "Financial Liquidation Report", category: "Student Governance & Activities" },
  { name: "Post-Event Narrative Report", category: "Student Governance & Activities" },
  { name: "Post-Event Compliance Clearance Certificate", category: "Student Governance & Activities" },
  { name: "Organization Registration Certificate", category: "Student Governance & Activities" },
];

export const OSAS_ORGANIZATIONS = [
  // 14 Whiteboard Student Organizations
  {
    id: "jfinex",
    name: "Junior Financial Executives (JFINEX)",
    acronym: "JFINEX",
    category: "Academic",
    adviserName: "Dr. Milton Friedman",
    adviserEmail: "mfriedman@pup.edu.ph",
    description: "Academic student organization for Financial Management (BSBA-FM) students at PUP San Juan.",
    storageRoom: 1,
    storageCabinet: "ACADEMIC ORGANIZATIONS",
    storageDrawer: "1",
  },
  {
    id: "yes",
    name: "Young Educators Society (YES)",
    acronym: "YES",
    category: "Academic",
    adviserName: "Prof. Maria Montessori",
    adviserEmail: "mmontessori@pup.edu.ph",
    description: "Academic student organization for Teacher Education (BSEDUC) students at PUP San Juan.",
    storageRoom: 1,
    storageCabinet: "ACADEMIC ORGANIZATIONS",
    storageDrawer: "2",
  },
  {
    id: "jpia",
    name: "Junior Philippine Institute of Accountants (JPIA)",
    acronym: "JPIA",
    category: "Academic",
    adviserName: "Prof. Pacioli Luca",
    adviserEmail: "pluca@pup.edu.ph",
    description: "Academic student organization for Accountancy (BSA) students at PUP San Juan.",
    storageRoom: 1,
    storageCabinet: "ACADEMIC ORGANIZATIONS",
    storageDrawer: "3",
  },
  {
    id: "ceo",
    name: "Collegiate Entrepreneurs' Organization (CEO)",
    acronym: "CEO",
    category: "Academic",
    adviserName: "Prof. Joseph Schumpeter",
    adviserEmail: "jschumpeter@pup.edu.ph",
    description: "Academic student organization for Entrepreneurship (BSENT) students at PUP San Juan.",
    storageRoom: 1,
    storageCabinet: "ACADEMIC ORGANIZATIONS",
    storageDrawer: "4",
  },
  {
    id: "hm-society",
    name: "Hospitality Management Society (HM Society)",
    acronym: "HM SOCIETY",
    category: "Academic",
    adviserName: "Prof. Cesar Ritz",
    adviserEmail: "critz@pup.edu.ph",
    description: "Academic student organization for Hospitality Management students at PUP San Juan.",
    storageRoom: 1,
    storageCabinet: "ACADEMIC ORGANIZATIONS",
    storageDrawer: "5",
  },
  {
    id: "glitch",
    name: "Governing League of I.T. Challengers (GLITCH)",
    acronym: "GLITCH",
    category: "Academic",
    adviserName: "Prof. Alan Turing",
    adviserEmail: "aturing@pup.edu.ph",
    description: "Academic student organization representing Information Technology (BSIT) students at PUP San Juan.",
    storageRoom: 1,
    storageCabinet: "ACADEMIC ORGANIZATIONS",
    storageDrawer: "6",
  },
  {
    id: "psysoc",
    name: "Psychological Society (PSYSOC)",
    acronym: "PSYSOC",
    category: "Academic",
    adviserName: "Dr. Carl Rogers",
    adviserEmail: "crogers@pup.edu.ph",
    description: "Academic student organization for Psychology (BSPSYCH) students at PUP San Juan.",
    storageRoom: 1,
    storageCabinet: "ACADEMIC ORGANIZATIONS",
    storageDrawer: "7",
  },
  {
    id: "pylon-esports",
    name: "PYLON E-Sports",
    acronym: "PYLON",
    category: "Non-Academic",
    adviserName: "Engr. Kevin Lim",
    adviserEmail: "klim@pup.edu.ph",
    description: "Special interest organization promoting competitive gaming, esports tournaments, and digital recreation.",
    storageRoom: 1,
    storageCabinet: "NON-ACADEMIC ORGANIZATIONS",
    storageDrawer: "1",
  },
  {
    id: "rotaract",
    name: "Rotaract Club of PUP San Juan",
    acronym: "ROTARACT",
    category: "Non-Academic",
    adviserName: "Dr. Clara Barton",
    adviserEmail: "cbarton@pup.edu.ph",
    description: "Civic and youth leadership organization affiliated with Rotary International committed to community service.",
    storageRoom: 1,
    storageCabinet: "NON-ACADEMIC ORGANIZATIONS",
    storageDrawer: "2",
  },
  {
    id: "hhc",
    name: "Helping Hands Community (HHC)",
    acronym: "HHC",
    category: "Non-Academic",
    adviserName: "Dr. Maria Santos",
    adviserEmail: "msantos@pup.edu.ph",
    description: "Civic and outreach organization dedicated to community extension programs and student volunteerism.",
    storageRoom: 1,
    storageCabinet: "NON-ACADEMIC ORGANIZATIONS",
    storageDrawer: "3",
  },
  {
    id: "adc",
    name: "Alab Danse Club (ADC)",
    acronym: "ADC",
    category: "Non-Academic",
    adviserName: "Prof. Francisca Reyes-Aquino",
    adviserEmail: "faquino@pup.edu.ph",
    description: "Official university dance troupe and performing arts organization representing PUP San Juan.",
    storageRoom: 1,
    storageCabinet: "NON-ACADEMIC ORGANIZATIONS",
    storageDrawer: "4",
  },
  {
    id: "paraseist",
    name: "The Paraseist",
    acronym: "PARASEIST",
    category: "Non-Academic",
    adviserName: "Prof. Lamberto Avellana",
    adviserEmail: "lavellana@pup.edu.ph",
    description: "Official student publication and independent campus journalism organization of PUP San Juan.",
    storageRoom: 1,
    storageCabinet: "NON-ACADEMIC ORGANIZATIONS",
    storageDrawer: "5",
  },
  {
    id: "sa",
    name: "Student Assembly (SA)",
    acronym: "SA",
    category: "Non-Academic",
    adviserName: "Dean Roberto Gomez",
    adviserEmail: "rgomez@pup.edu.ph",
    description: "Campus student assembly and student representation body under OSAS.",
    storageRoom: 1,
    storageCabinet: "NON-ACADEMIC ORGANIZATIONS",
    storageDrawer: "6",
  },
  {
    id: "lente-filikulas",
    name: "PUP Lente Filikulas",
    acronym: "LENTE FILIKULAS",
    category: "Non-Academic",
    adviserName: "Prof. Ishmael Bernal",
    adviserEmail: "ibernal@pup.edu.ph",
    description: "Creative arts and cinematography guild fostering student talent in photography and film production.",
    storageRoom: 1,
    storageCabinet: "NON-ACADEMIC ORGANIZATIONS",
    storageDrawer: "7",
  },

  // Test & Legacy Compatibility Fixtures (Ensures test suites pass smoothly)
  {
    id: "helping-hands",
    name: "Helping Hands Community Organization",
    acronym: "HHCO",
    category: "Non-Academic",
    adviserName: "Dr. Maria Santos",
    adviserEmail: "maria.santos@pup.local",
    description: "Dedicated to student community outreach, volunteerism, and civic empowerment across PUP San Juan and surrounding communities.",
    storageRoom: 1,
    storageCabinet: "NON-ACADEMIC ORGANIZATIONS",
    storageDrawer: "3",
  },
  {
    id: "jpcs",
    name: "Junior Philippine Computer Society",
    acronym: "JPCS",
    category: "Academic",
    adviserName: "Prof. Juan Dela Cruz",
    adviserEmail: "juan.delacruz@pup.local",
    description: "Official academic student organization for Computer Science and Information Technology students at PUP San Juan.",
    storageRoom: 1,
    storageCabinet: "ACADEMIC ORGANIZATIONS",
    storageDrawer: "1",
  },
  {
    id: "ssc",
    name: "Supreme Student Council",
    acronym: "SSC",
    category: "Non-Academic",
    adviserName: "Dean Roberto Gomez",
    adviserEmail: "roberto.gomez@pup.local",
    description: "The apex student governing body representing all student councils and organizations of PUP San Juan.",
    storageRoom: 1,
    storageCabinet: "NON-ACADEMIC ORGANIZATIONS",
    storageDrawer: "6",
  },
  {
    id: "rcy",
    name: "Red Cross Youth - PUPSJ Chapter",
    acronym: "RCY",
    category: "Non-Academic",
    adviserName: "Ms. Elena Torres",
    adviserEmail: "elena.torres@pup.local",
    description: "Promoting humanitarian values, youth leadership, first aid readiness, and health advocacy.",
    storageRoom: 1,
    storageCabinet: "NON-ACADEMIC ORGANIZATIONS",
    storageDrawer: "2",
  },
];

export const OSAS_OFFICERS = [
  // Helping Hands & HHC
  { orgId: "helping-hands", email: "marianocedrick412@gmail.com", name: "Cedrick Mariano", position: "President", studentNo: "2022-10001-SJ-0" },
  { orgId: "helping-hands", email: "test.student@pup.com", name: "Maria Clara Santos", position: "Secretary", studentNo: "2023-00001-SJ-0" },
  { orgId: "hhc", email: "test.student@pup.com", name: "Maria Clara Santos", position: "Secretary", studentNo: "2023-00001-SJ-0" },
  { orgId: "hhc", email: "student@pup.com", name: "Juan Dela Cruz", position: "Treasurer", studentNo: "2022-10001-SJ-0" },
  { orgId: "hhc", email: "hhc.pres@pup.local", name: "Nicole Angela Reyes", position: "President", studentNo: "2022-69082-SJ-0" },

  // JPCS & GLITCH
  { orgId: "jpcs", email: "student@pup.com", name: "Juan Dela Cruz", position: "President", studentNo: "2022-10001-SJ-0" },
  { orgId: "jpcs", email: "test.student@pup.com", name: "Maria Clara Santos", position: "Vice President", studentNo: "2023-00001-SJ-0" },
  { orgId: "glitch", email: "student@pup.com", name: "Juan Dela Cruz", position: "President", studentNo: "2022-10001-SJ-0" },
  { orgId: "glitch", email: "alyssa.valenzuela@pup.local", name: "Alyssa Valenzuela", position: "Vice President", studentNo: "2022-69082-SJ-0" },
  { orgId: "glitch", email: "daphne.cruz@pup.local", name: "Daphne Cruz", position: "Secretary", studentNo: "2023-20382-SJ-0" },
  { orgId: "glitch", email: "cynthia.quizon@pup.local", name: "Cynthia Quizon", position: "Treasurer", studentNo: "2023-38462-SJ-0" },

  // JFINEX
  { orgId: "jfinex", email: "carmelo.reyes@pup.local", name: "Carmelo Reyes", position: "President", studentNo: "2022-25152-SJ-0" },
  { orgId: "jfinex", email: "arnel.deleon@pup.local", name: "Arnel De Leon", position: "Vice President", studentNo: "2023-70215-SJ-0" },
  { orgId: "jfinex", email: "cynthia.sison@pup.local", name: "Cynthia Sison", position: "Secretary", studentNo: "2023-34236-SJ-0" },
  { orgId: "jfinex", email: "edgar.pineda@pup.local", name: "Edgar Pineda", position: "Treasurer", studentNo: "2023-99337-SJ-0" },

  // YES
  { orgId: "yes", email: "efren.lim@pup.local", name: "Efren Lim", position: "President", studentNo: "2021-19500-SJ-0" },
  { orgId: "yes", email: "maria.bautista@pup.local", name: "Maria Theresa Bautista", position: "Vice President", studentNo: "2022-10001-SJ-0" },
  { orgId: "yes", email: "joshua.soriano@pup.local", name: "Joshua Soriano", position: "Secretary", studentNo: "2023-00001-SJ-0" },

  // JPIA
  { orgId: "jpia", email: "beatrice.ramos@pup.local", name: "Beatrice Nicole Ramos", position: "President", studentNo: "2022-10001-SJ-0" },
  { orgId: "jpia", email: "christian.mercado@pup.local", name: "Christian Paul Mercado", position: "Vice President", studentNo: "2023-00001-SJ-0" },
  { orgId: "jpia", email: "patricia.castro@pup.local", name: "Patricia Mae Castro", position: "Treasurer", studentNo: "2022-69082-SJ-0" },

  // CEO
  { orgId: "ceo", email: "dominic.tan@pup.local", name: "Dominic Gabriel Tan", position: "President", studentNo: "2022-25152-SJ-0" },
  { orgId: "ceo", email: "sofia.cruz@pup.local", name: "Sofia Bianca Cruz", position: "Vice President", studentNo: "2023-20382-SJ-0" },

  // HM SOCIETY
  { orgId: "hm-society", email: "rafael.garcia@pup.local", name: "Rafael Antonio Garcia", position: "President", studentNo: "2022-10001-SJ-0" },
  { orgId: "hm-society", email: "samantha.reyes@pup.local", name: "Samantha Joy Reyes", position: "Vice President", studentNo: "2023-38462-SJ-0" },

  // PSYSOC
  { orgId: "psysoc", email: "katrina.santos@pup.local", name: "Katrina Isabel Santos", position: "President", studentNo: "2023-00001-SJ-0" },
  { orgId: "psysoc", email: "miguel.perez@pup.local", name: "Miguel Lorenzo Perez", position: "Vice President", studentNo: "2022-69082-SJ-0" },

  // PYLON E-SPORTS
  { orgId: "pylon-esports", email: "daniel.mendoza@pup.local", name: "Daniel Joshua Mendoza", position: "President", studentNo: "2022-10001-SJ-0" },
  { orgId: "pylon-esports", email: "mark.villanueva@pup.local", name: "Mark Anthony Villanueva", position: "Vice President", studentNo: "2023-70215-SJ-0" },

  // ROTARACT
  { orgId: "rotaract", email: "andrea.fernandez@pup.local", name: "Andrea Nicole Fernandez", position: "President", studentNo: "2023-00001-SJ-0" },
  { orgId: "rotaract", email: "john.david@pup.local", name: "John Gabriel David", position: "Vice President", studentNo: "2022-25152-SJ-0" },

  // ADC
  { orgId: "adc", email: "chloe.salazar@pup.local", name: "Chloe Dominique Salazar", position: "President", studentNo: "2023-20382-SJ-0" },
  { orgId: "adc", email: "kyle.aguilar@pup.local", name: "Kyle Vincent Aguilar", position: "Vice President", studentNo: "2022-69082-SJ-0" },

  // PARASEIST
  { orgId: "paraseist", email: "marianne.navarro@pup.local", name: "Marianne Louise Navarro", position: "President", studentNo: "2022-10001-SJ-0" },
  { orgId: "paraseist", email: "aaron.ocampo@pup.local", name: "Aaron Joseph Ocampo", position: "Vice President", studentNo: "2023-00001-SJ-0" },

  // SA
  { orgId: "sa", email: "timothy.castillo@pup.local", name: "Timothy James Castillo", position: "President", studentNo: "2022-10001-SJ-0" },
  { orgId: "sa", email: "angela.villanueva@pup.local", name: "Angela Mae Villanueva", position: "Vice President", studentNo: "2023-00001-SJ-0" },

  // LENTE FILIKULAS
  { orgId: "lente-filikulas", email: "vincent.morales@pup.local", name: "Vincent Edward Morales", position: "President", studentNo: "2022-10001-SJ-0" },
  { orgId: "lente-filikulas", email: "erika.pascual@pup.local", name: "Erika Joy Pascual", position: "Vice President", studentNo: "2023-00001-SJ-0" },

  // SSC
  { orgId: "ssc", email: "gabriel.santos@pup.local", name: "Gabriel Marco Santos", position: "President", studentNo: "2022-10001-SJ-0" },
  { orgId: "ssc", email: "katrina.alcantara@pup.local", name: "Katrina Joy Alcantara", position: "Vice President", studentNo: "2023-00001-SJ-0" },

  // RCY
  { orgId: "rcy", email: "patricia.david@pup.local", name: "Patricia Ann David", position: "President", studentNo: "2022-10001-SJ-0" },
];

export const OSAS_PROPOSALS = [
  // 1. Submitted Proposals
  {
    orgId: "pylon-esports",
    title: "PUP San Juan Inter-Collegiate Esports Championship 2026",
    eventDate: "2026-11-20",
    venue: "PUP San Juan Multi-Purpose Gymnasium & E-Hub",
    desc: "Collegiate esports championship featuring competitive mobile and PC titles, promoting digital sportsmanship, team strategy, and student broadcast production.",
    studentNo: "2022-10001-SJ-0",
    submittedByEmail: "student@pup.com",
    officerPosition: "President",
    status: "Submitted",
    samplePdfFile: "sample_event_proposal_pylon_esports.pdf",
    updates: [
      ["Submitted", "Event proposal and equipment manifest submitted for OSAS review."],
    ],
  },
  {
    orgId: "lente-filikulas",
    title: "Kislap Sinag: Annual Campus Short Film Festival & Screening",
    eventDate: "2026-11-28",
    venue: "Audio-Visual Hall & Amphitheater",
    desc: "Inter-collegiate short film exhibition showcasing original narrative, documentary, and cinematography works created by PUP San Juan student filmmakers.",
    studentNo: "2023-00001-SJ-0",
    submittedByEmail: "test.student@pup.com",
    officerPosition: "Vice President",
    status: "Submitted",
    samplePdfFile: "sample_event_proposal_lente_filikulas.pdf",
    updates: [
      ["Submitted", "Proposal and screening program submitted for venue reservation."],
    ],
  },

  // 2. Under Review Proposals
  {
    orgId: "rotaract",
    title: "Dugong San Juaneño: Campus-Wide Blood Donation Drive & Medical Mission",
    eventDate: "2026-11-15",
    venue: "Campus Quadrangle & University Clinic",
    desc: "Voluntary mobile blood donation and health wellness orientation conducted in partnership with the Philippine Red Cross and San Juan City Health Department.",
    studentNo: "2023-00001-SJ-0",
    submittedByEmail: "test.student@pup.com",
    officerPosition: "President",
    status: "Under Review",
    updates: [
      ["Submitted", "Event proposal and medical partner clearance submitted."],
      ["Under Review", "Campus Medical Officer and OSAS reviewing clinical protocol checklist."],
    ],
  },
  {
    orgId: "yes",
    title: "Tudling Dunong: Community Literacy Outreach & Book Drive",
    eventDate: "2026-11-22",
    venue: "Barangay Addition Hills Community Center",
    desc: "Off-campus educational storytelling and remedial reading program organized by education majors for disadvantaged basic education learners.",
    studentNo: "2022-10001-SJ-0",
    submittedByEmail: "student@pup.com",
    officerPosition: "President",
    status: "Under Review",
    updates: [
      ["Submitted", "Community outreach proposal and parent waiver templates submitted."],
      ["Under Review", "OSAS Directorate evaluating off-campus travel security protocol."],
    ],
  },

  // 3. Needs Revision Proposals
  {
    orgId: "jfinex",
    title: "Capital Summit 2026: Investment Literacy & Fintech Expo",
    eventDate: "2026-11-10",
    venue: "Campus Auditorium & Room 304",
    desc: "Full-day academic summit covering personal financial management, algorithmic trading, crypto asset regulation, and student entrepreneurship financing.",
    studentNo: "2022-10001-SJ-0",
    submittedByEmail: "student@pup.com",
    officerPosition: "President",
    status: "Needs Revision",
    reviewNote: "Please attach certified guest speaker credentials and updated venue sanitation plan.",
    samplePdfFile: "sample_event_proposal_jfinex.pdf",
    updates: [
      ["Submitted", "Proposal submitted for JFINEX annual summit."],
      ["Under Review", "Evaluating invited speaker credentials and room capacity."],
      ["Needs Revision", "Please attach certified guest speaker credentials and updated venue sanitation plan."],
    ],
  },
  {
    orgId: "adc",
    title: "Sayaw Himig 2026: Inter-Departmental Dance Showcase & Workshop",
    eventDate: "2026-11-18",
    venue: "Campus Gymnasium",
    desc: "Cultural dance workshops and inter-departmental choreography showcase highlighting Philippine indigenous and modern theatrical dance disciplines.",
    studentNo: "2023-00001-SJ-0",
    submittedByEmail: "test.student@pup.com",
    officerPosition: "Vice President",
    status: "Needs Revision",
    reviewNote: "Please coordinate with Facilities Office regarding acoustic sound system decibel limit after 6:00 PM.",
    updates: [
      ["Submitted", "Performance schedule and guest choreographer list submitted."],
      ["Under Review", "Facilities and Security reviewing evening sound curfew requirements."],
      ["Needs Revision", "Please coordinate with Facilities Office regarding acoustic sound system decibel limit after 6:00 PM."],
    ],
  },

  // 4. Approved Proposals (with Post-Event Reporting)
  {
    orgId: "glitch",
    title: "CodeCraft 2026: Annual Hackathon & TechSummit",
    eventDate: "2026-10-15",
    venue: "Computer Laboratories 1-3 & Audiovisual Hall",
    desc: "48-hour collaborative programming hackathon, technical workshops, and digital solutions showcase focusing on open-source public service software.",
    studentNo: "2022-10001-SJ-0",
    submittedByEmail: "student@pup.com",
    officerPosition: "President",
    status: "Approved",
    reviewNote: "Approved by OSAS Director. Activity permit #OSAS-2026-014 issued.",
    samplePdfFile: "sample_event_proposal_glitch.pdf",
    postEvent: {
      status: "Cleared",
      actualAttendance: 142,
      totalExpenses: 18500.0,
      narrativePdf: "sample_post_event_narrative_report_glitch.pdf",
      liquidationPdf: "sample_financial_liquidation_report_glitch.pdf",
      reviewNote: "All narrative requirements, attendee rosters, and official financial receipts verified. Cleared.",
    },
    updates: [
      ["Submitted", "Hackathon proposal and laboratory reservation submitted."],
      ["Under Review", "IT laboratory administrator coordinating workstation network isolation."],
      ["Approved", "Approved by OSAS Director. Activity permit #OSAS-2026-014 issued."],
      ["Post-Event Submitted", "Official Post-Event Narrative Report and Liquidation package submitted by student@pup.com."],
      ["Cleared", "Post-event compliance cleared and filed under OSAS Archive Room 1."],
    ],
  },
  {
    orgId: "jpia",
    title: "National Accounting Standards Symposium & Mock Board Challenge",
    eventDate: "2026-10-24",
    venue: "Campus Gymnasium",
    desc: "Intensive board examination review simulation, accounting standards updates, and career opportunities fair for accountancy students.",
    studentNo: "2023-00001-SJ-0",
    submittedByEmail: "test.student@pup.com",
    officerPosition: "Treasurer",
    status: "Approved",
    reviewNote: "Approved by OSAS Director. Activity permit #OSAS-2026-021 issued.",
    postEvent: {
      status: "Under Review",
      actualAttendance: 98,
      totalExpenses: 12450.0,
      reviewNote: "Currently validating liquidation receipts against submitted budget breakdown.",
    },
    updates: [
      ["Submitted", "Symposium proposal and mock exam questionnaire submitted."],
      ["Under Review", "Reviewing invited CPA resource speaker accreditations."],
      ["Approved", "Approved by OSAS Director. Activity permit #OSAS-2026-021 issued."],
      ["Post-Event Submitted", "Post-event narrative and liquidation documentation submitted."],
    ],
  },
  {
    orgId: "hhc",
    title: "Paskong San Juaneño: Community Gift Giving & Relief Mission",
    eventDate: "2026-10-28",
    venue: "Barangay Batis Sports Complex",
    desc: "Community volunteer drive providing school kits, food packages, and basic primary health assistance to adopted community families.",
    studentNo: "2023-00001-SJ-0",
    submittedByEmail: "test.student@pup.com",
    officerPosition: "Secretary",
    status: "Approved",
    reviewNote: "Approved by OSAS Director. Activity permit #OSAS-2026-033 issued.",
    samplePdfFile: "sample_activity_request_and_safety_clearance.pdf",
    postEvent: {
      status: "Needs Revision",
      actualAttendance: 120,
      totalExpenses: 24000.0,
      reviewNote: "Please attach official BIR receipts for venue tokens and food catering; acknowledgment receipts alone cannot be liquidated.",
    },
    updates: [
      ["Submitted", "Safety clearance and barangay endorsement submitted."],
      ["Under Review", "Local government coordinating with PUP security."],
      ["Approved", "Approved by OSAS Director. Activity permit #OSAS-2026-033 issued."],
      ["Post-Event Submitted", "Initial post-event documentation submitted."],
      ["Needs Revision", "Please attach official BIR receipts for venue tokens and food catering; acknowledgment receipts alone cannot be liquidated."],
    ],
  },
  {
    orgId: "hm-society",
    title: "Flavors of San Juan: Hospitality & Culinary Skills Expo",
    eventDate: "2026-11-04",
    venue: "HM Laboratory & Quadrangle",
    desc: "Live culinary demonstration, table setting competition, and guest lectures from premier hospitality industry executives.",
    studentNo: "2022-10001-SJ-0",
    submittedByEmail: "student@pup.com",
    officerPosition: "President",
    status: "Approved",
    reviewNote: "Approved by OSAS Director. Activity permit #OSAS-2026-045 issued.",
    postEvent: {
      status: "Pending Submission",
      dueDate: "2026-11-14",
    },
    updates: [
      ["Submitted", "Culinary competition guidelines and sanitation plan submitted."],
      ["Under Review", "Safety inspector verified kitchen fire extinguisher readiness."],
      ["Approved", "Approved by OSAS Director. Activity permit #OSAS-2026-045 issued."],
    ],
  },

  // 5. Declined Proposal
  {
    orgId: "psysoc",
    title: "Overnight Peer Support Retreat & Midnight Bonfire Session",
    eventDate: "2026-10-30",
    venue: "PUP San Juan Open Grounds",
    desc: "Overnight mental health retreat and campfire bonding session for psychology student peers.",
    studentNo: "2023-00001-SJ-0",
    submittedByEmail: "test.student@pup.com",
    officerPosition: "President",
    status: "Declined",
    reviewNote: "Campus security regulations strictly prohibit overnight student gatherings on campus premises. Please restructure into a day-time program.",
    updates: [
      ["Submitted", "Overnight camp proposal and equipment list submitted."],
      ["Under Review", "Security office evaluating curfew guidelines."],
      ["Declined", "Campus security regulations strictly prohibit overnight student gatherings on campus premises. Please restructure into a day-time program."],
    ],
  },

  // 6. Archived Proposal
  {
    orgId: "sa",
    title: "1st Semester Student Leaders Congress & Budget Ratification 2025",
    eventDate: "2025-09-12",
    venue: "Campus Gymnasium",
    desc: "Mandatory general assembly and institutional budget consultation for all accredited student organization executive officers.",
    studentNo: "2022-10001-SJ-0",
    submittedByEmail: "student@pup.com",
    officerPosition: "President",
    status: "Archived",
    archivedAt: "2025-10-15T08:00:00Z",
    reviewNote: "Completed and archived in institutional records.",
    updates: [
      ["Submitted", "Congress agenda submitted."],
      ["Approved", "Approved by OSAS Director."],
      ["Archived", "Event successfully completed and archived."],
    ],
  },
];

// ============================================================================
// MAIN SEED FUNCTION
// ============================================================================

export async function seedOsasOffice() {
  console.log("==========================================================");
  console.log("   POPULATING OSAS OFFICE (RECORDS, WORKFLOWS, COMPLIANCE)");
  console.log("==========================================================");

  ensureDirectories();

  // 1. Seed OSAS Document Types
  console.log("\n[1/7] Seeding OSAS Document Types in document_types...");
  for (const dt of OSAS_DOC_TYPES) {
    await query(
      `INSERT INTO document_types (office_id, name, name_norm, status, is_compliance, is_requestable, compliance_category)
       VALUES ('osas', $1, $2, 'Active', true, false, $3)
       ON CONFLICT (office_id, name_norm) DO UPDATE SET
         name = EXCLUDED.name,
         status = 'Active',
         is_compliance = true,
         is_requestable = false,
         compliance_category = EXCLUDED.compliance_category`,
      [dt.name, dt.name.toLowerCase().trim(), dt.category]
    );
  }

  // Purge/archive any legacy individual student documents from OSAS
  await query(`
    UPDATE document_types
    SET status = 'Archived', is_compliance = FALSE, is_requestable = FALSE
    WHERE office_id = 'osas' AND name_norm IN ('good moral certificate', 'certificate of good moral', 'clearance form', 'student disciplinary clearance')
  `);
  console.log(`  ✓ Seeded ${OSAS_DOC_TYPES.length} official OSAS document types.`);

  // 2. Seed Student Organizations
  console.log("\n[2/7] Seeding Student Organizations in student_organizations...");
  const orgMap = new Map();
  for (const org of OSAS_ORGANIZATIONS) {
    const res = await query(
      `INSERT INTO student_organizations (
         id, name, acronym, category, status, adviser_name, adviser_email,
         description, storage_room, storage_cabinet, storage_drawer,
         created_at, updated_at
       ) VALUES ($1, $2, $3, $4, 'Active', $5, $6, $7, $8, $9, $10, NOW(), NOW())
       ON CONFLICT (id) DO UPDATE SET
         name = EXCLUDED.name,
         acronym = EXCLUDED.acronym,
         category = EXCLUDED.category,
         status = 'Active',
         adviser_name = EXCLUDED.adviser_name,
         adviser_email = EXCLUDED.adviser_email,
         description = EXCLUDED.description,
         storage_room = EXCLUDED.storage_room,
         storage_cabinet = EXCLUDED.storage_cabinet,
         storage_drawer = EXCLUDED.storage_drawer,
         updated_at = NOW()
       RETURNING *`,
      [
        org.id,
        org.name,
        org.acronym,
        org.category,
        org.adviserName,
        org.adviserEmail,
        org.description,
        org.storageRoom,
        org.storageCabinet,
        org.storageDrawer,
      ]
    );
    orgMap.set(org.id, res[0]);
  }
  console.log(`  ✓ Seeded ${OSAS_ORGANIZATIONS.length} student organizations.`);

  // 3. Seed Whitelisted Student Officers
  console.log("\n[3/7] Seeding Whitelisted Officers in organization_officers...");
  let officerCount = 0;
  for (const off of OSAS_OFFICERS) {
    await query(
      `INSERT INTO organization_officers (
         organization_id, email, student_name, student_no, position, status, created_at, updated_at
       ) VALUES ($1, $2, $3, $4, $5, 'Active', NOW(), NOW())
       ON CONFLICT (organization_id, email) DO UPDATE SET
         student_name = EXCLUDED.student_name,
         student_no = EXCLUDED.student_no,
         position = EXCLUDED.position,
         status = 'Active',
         updated_at = NOW()`,
      [off.orgId, off.email.toLowerCase(), off.name, off.studentNo, off.position]
    );
    officerCount++;
  }
  console.log(`  ✓ Seeded ${officerCount} whitelisted student officers.`);

  // 4. Seed Ratified Constitution & By-Laws (CBL) Versions
  console.log("\n[4/7] Generating and Seeding Authoritative CBL Versions...");
  let cblCount = 0;
  for (const org of OSAS_ORGANIZATIONS) {
    const cblFilename = `cbl_${org.id}_ay2026.pdf`;
    const cblBytes = await generateCblPdf({
      orgName: org.name,
      acronym: org.acronym,
      category: org.category,
      adviserName: org.adviserName,
      ratifiedDate: "August 15, 2026",
    });
    writeToAllUploadDirs(cblFilename, cblBytes);

    await query(
      `INSERT INTO organization_bylaws_versions (
         organization_id, version_tag, storage_filename, original_filename,
         size_bytes, mime_type, amendment_summary, status, approved_by,
         effective_date, created_at, updated_at
       )
       VALUES ($1, 'AY 2026-2027 Ratification', $2, $3, $4, 'application/pdf', $5, 'Approved', 'PUPOSAS-001', '2026-08-15', NOW(), NOW())
       ON CONFLICT DO NOTHING`,
      [
        org.id,
        cblFilename,
        `${org.acronym}_CBL_AY2026.pdf`,
        cblBytes.length,
        "Ratified by General Membership and approved by OSAS Directorate.",
      ]
    );
    cblCount++;
  }

  // Seed a pending amendment for variety on one organization (e.g. lente-filikulas)
  const revCblFilename = `cbl_lente_rev2.pdf`;
  const revCblBytes = await generateCblPdf({
    orgName: "PUP Lente Filikulas",
    acronym: "LENTE FILIKULAS",
    category: "Non-Academic",
    adviserName: "Prof. Ishmael Bernal",
    ratifiedDate: "October 20, 2026",
  });
  writeToAllUploadDirs(revCblFilename, revCblBytes);
  await query(
    `INSERT INTO organization_bylaws_versions (
       organization_id, version_tag, storage_filename, original_filename,
       size_bytes, mime_type, amendment_summary, status, effective_date, created_at, updated_at
     )
     VALUES ('lente-filikulas', '2026-Rev2 Amendment', $1, 'LENTE_CBL_2026_Rev2.pdf', $2, 'application/pdf',
       'Proposed amendment to Article IV Section 2 regarding cinematographic production equipment checkout protocol.',
       'Needs Revision', CURRENT_DATE, NOW(), NOW())
     ON CONFLICT DO NOTHING`,
    [revCblFilename, revCblBytes.length]
  );

  console.log(`  ✓ Generated and seeded ${cblCount} authoritative Constitution & By-Laws records with authentic PDFs.`);

  // 5. Seed Event Proposals & Workflow Timelines
  console.log("\n[5/7] Seeding Event Proposals in event_proposals...");
  let proposalCount = 0;
  for (const p of OSAS_PROPOSALS) {
    const org = orgMap.get(p.orgId) || { name: p.orgId, acronym: p.orgId };
    const uniqueStorageName = `prop_${p.orgId}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}.pdf`;

    let pdfBytes;
    if (p.samplePdfFile && fs.existsSync(path.join(SAMPLE_OSAS_PDFS_DIR, p.samplePdfFile))) {
      pdfBytes = fs.readFileSync(path.join(SAMPLE_OSAS_PDFS_DIR, p.samplePdfFile));
    } else {
      pdfBytes = await generateProposalPdf({
        title: p.title,
        orgName: org.name,
        eventDate: p.eventDate,
        venue: p.venue,
        desc: p.desc,
        studentNo: p.studentNo,
        studentName: p.submittedByEmail === "student@pup.com" ? "DELA CRUZ, JUAN A." : "SANTOS, MARIA CLARA L.",
        status: p.status,
      });
    }
    writeToAllUploadDirs(uniqueStorageName, pdfBytes);

    const postEventStatus = p.postEvent?.status || (p.status === "Approved" ? "Pending Submission" : "Not Applicable");
    const postEventDueDate = p.postEvent?.dueDate || (p.status === "Approved" ? "2026-11-25" : null);
    const postEventClearedAt = p.postEvent?.status === "Cleared" ? new Date().toISOString() : null;
    const postEventClearedBy = p.postEvent?.status === "Cleared" ? "PUPOSAS-001" : null;

    const propRow = await query(
      `INSERT INTO event_proposals (
         office_id, student_no, identity_profile_id, organization_id, title, organization_name,
         event_date, venue, description, storage_filename, original_filename, mime_type, size_bytes,
         status, review_note, reviewed_at, archived_at, submitted_by_email, officer_position, is_verified_officer,
         post_event_status, post_event_due_date, post_event_cleared_at, post_event_cleared_by,
         created_at, updated_at
       )
       VALUES (
         'osas', $1, (SELECT identity_profile_id FROM students WHERE student_no = $1 LIMIT 1),
         $2, $3, $4, $5, $6, $7, $8, $9, 'application/pdf', $10,
         $11, $12, $13, $14, $15, $16, true,
         $17, $18, $19, $20,
         NOW() - INTERVAL '5 days', NOW()
       )
       RETURNING id`,
      [
        p.studentNo,
        p.orgId,
        p.title,
        org.name,
        p.eventDate,
        p.venue,
        p.desc,
        uniqueStorageName,
        `${org.acronym}_Proposal_${p.eventDate}.pdf`,
        pdfBytes.length,
        p.status,
        p.reviewNote || null,
        p.status !== "Submitted" ? new Date().toISOString() : null,
        p.archivedAt || null,
        p.submittedByEmail.toLowerCase(),
        p.officerPosition,
        postEventStatus,
        postEventDueDate,
        postEventClearedAt,
        postEventClearedBy,
      ]
    );

    const propId = propRow[0]?.id;
    proposalCount++;

    // Seed transaction updates timeline
    if (propId && Array.isArray(p.updates)) {
      await query(`DELETE FROM transaction_updates WHERE event_proposal_id = $1`, [propId]);
      for (const [uStatus, uMsg] of p.updates) {
        await query(
          `INSERT INTO transaction_updates (event_proposal_id, status, message, created_by, created_at)
           VALUES ($1, $2, $3, $4, NOW() - INTERVAL '3 days')`,
          [propId, uStatus, uMsg, uStatus === "Submitted" ? null : "PUPOSAS-001"]
        );
      }
    }

    // Seed Post-Event Report if applicable
    if (propId && p.postEvent && ["Cleared", "Under Review", "Needs Revision"].includes(p.postEvent.status)) {
      let narrativeBytes;
      let liquidationBytes;
      const narrFilename = `narrative_${p.orgId}_${propId}.pdf`;
      const liqFilename = `liquidation_${p.orgId}_${propId}.pdf`;

      if (p.postEvent.narrativePdf && fs.existsSync(path.join(SAMPLE_OSAS_PDFS_DIR, p.postEvent.narrativePdf))) {
        narrativeBytes = fs.readFileSync(path.join(SAMPLE_OSAS_PDFS_DIR, p.postEvent.narrativePdf));
      } else {
        narrativeBytes = await generateReportDocPdf({
          docType: "Post-Event Narrative Report",
          orgName: org.name,
          acronym: org.acronym,
          title: `Narrative Accomplishment Report: ${p.title}`,
          dateStr: p.eventDate,
          notes: "Official narrative summary of proceedings, attendance metrics, and community feedback.",
        });
      }

      if (p.postEvent.liquidationPdf && fs.existsSync(path.join(SAMPLE_OSAS_PDFS_DIR, p.postEvent.liquidationPdf))) {
        liquidationBytes = fs.readFileSync(path.join(SAMPLE_OSAS_PDFS_DIR, p.postEvent.liquidationPdf));
      } else {
        liquidationBytes = await generateReportDocPdf({
          docType: "Financial Liquidation Report",
          orgName: org.name,
          acronym: org.acronym,
          title: `Financial Liquidation & Receipts: ${p.title}`,
          dateStr: p.eventDate,
          notes: `Itemized audit schedule of disbursements totaling PHP ${(p.postEvent.totalExpenses || 15000).toFixed(2)}.`,
        });
      }

      writeToAllUploadDirs(narrFilename, narrativeBytes);
      writeToAllUploadDirs(liqFilename, liquidationBytes);

      await query(
        `INSERT INTO osas_post_event_reports (
           event_proposal_id, organization_id, submitted_by_email, actual_attendance,
           total_expenses, narrative_storage_filename, narrative_original_filename,
           liquidation_storage_filename, liquidation_original_filename,
           status, review_note, reviewed_by, reviewed_at, created_at, updated_at
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW() - INTERVAL '2 days', NOW())`,
        [
          propId,
          p.orgId,
          p.submittedByEmail.toLowerCase(),
          p.postEvent.actualAttendance || 100,
          p.postEvent.totalExpenses || 10000.0,
          narrFilename,
          `${org.acronym}_Narrative_Report.pdf`,
          liqFilename,
          `${org.acronym}_Financial_Liquidation.pdf`,
          p.postEvent.status,
          p.postEvent.reviewNote || null,
          p.postEvent.status !== "Submitted" ? "PUPOSAS-001" : null,
          p.postEvent.status !== "Submitted" ? new Date().toISOString() : null,
        ]
      );
    }
  }
  console.log(`  ✓ Seeded ${proposalCount} event proposals across all Kanban columns with full post-event reports.`);

  // 6. Seed Official OSAS Documents into documents table
  console.log("\n[6/7] Seeding Official OSAS Documents in documents table...");
  let osasDocCount = 0;
  for (const org of OSAS_ORGANIZATIONS) {
    const certFilename = `osas_cert_${org.id}.pdf`;
    const certBytes = await generateOrgCertPdf({
      orgName: org.name,
      acronym: org.acronym,
      category: org.category,
      adviserName: org.adviserName,
    });
    writeToAllUploadDirs(certFilename, certBytes);

    await query(
      `INSERT INTO documents (
         office_id, organization_id, student_no, student_name, doc_type,
         original_filename, storage_filename, mime_type, size_bytes,
         approval_status, reviewed_by, reviewed_at, review_note,
         created_at
       )
       VALUES (
         'osas', $1, NULL, $2, 'Organization Registration Certificate',
         $3, $4, 'application/pdf', $5,
         'Approved', 'PUPOSAS-001', NOW() - INTERVAL '10 days',
         'Official OSAS Recognition Certificate issued for AY 2026-2027.',
         NOW() - INTERVAL '10 days'
       )
       ON CONFLICT DO NOTHING`,
      [
        org.id,
        org.name,
        `${org.acronym}_Registration_Certificate_2026.pdf`,
        certFilename,
        certBytes.length,
      ]
    );
    osasDocCount++;
  }

  // Also add approved activity permits and clearance certificates
  const sampleClearancePdf = path.join(SAMPLE_OSAS_PDFS_DIR, "sample_post_event_compliance_clearance_certificate.pdf");
  if (fs.existsSync(sampleClearancePdf)) {
    const clearanceBytes = fs.readFileSync(sampleClearancePdf);
    const clearanceFilename = "osas_clearance_cert_glitch.pdf";
    writeToAllUploadDirs(clearanceFilename, clearanceBytes);

    await query(
      `INSERT INTO documents (
         office_id, organization_id, student_no, student_name, doc_type,
         original_filename, storage_filename, mime_type, size_bytes,
         approval_status, reviewed_by, reviewed_at, review_note, created_at
       )
       VALUES (
         'osas', 'glitch', '2022-10001-SJ-0', 'Governing League of I.T. Challengers (GLITCH)',
         'Post-Event Compliance Clearance Certificate',
         'GLITCH_CodeCraft_2026_Clearance_Certificate.pdf',
         $1, 'application/pdf', $2,
         'Approved', 'PUPOSAS-001', NOW() - INTERVAL '2 days',
         'Activity cleared. All liquidation receipts verified against OSAS budget guidelines.',
         NOW() - INTERVAL '2 days'
       )
       ON CONFLICT DO NOTHING`,
      [clearanceFilename, clearanceBytes.length]
    );
    osasDocCount++;
  }

  console.log(`  ✓ Seeded ${osasDocCount} official OSAS documents into archive.`);

  // 7. Verify & Ensure OSAS Storage Layout & Audit Trail
  console.log("\n[7/7] Ensuring OSAS Physical Storage Layout & Audit Logs...");
  const osasLayout = buildDefaultOsasStorageLayout();
  await query(
    `INSERT INTO settings (key, value)
     VALUES ('storage_layout:osas', $1)
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
    [JSON.stringify(osasLayout)]
  );

  const auditActions = [
    "Populated OSAS office baseline records, organizations, and compliance documents",
    "Issued Annual Recognition Certificates for 14 student organizations",
    "Ratified AY 2026-2027 Constitution & By-Laws for all active organizations",
    "Evaluated and approved CodeCraft 2026 Hackathon (GLITCH) activity permit",
    "Issued Post-Event Compliance Clearance Certificate #OSAS-CLR-2026-004",
  ];

  for (const act of auditActions) {
    await query(
      `INSERT INTO global_audit_logs (office_id, actor, role, action, ip, created_at)
       VALUES ('osas', 'Sandra Gomez (OSAS Director)', 'Admin', $1, '127.0.0.1', NOW() - INTERVAL '1 hour')`,
      [act]
    );
  }

  console.log("\n==========================================================");
  console.log("   ✓ OSAS OFFICE POPULATION COMPLETED SUCCESSFULLY!");
  console.log("==========================================================");
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/^[./\\]+/, ""))) {
  try {
    await seedOsasOffice();
    process.exit(0);
  } catch (err) {
    console.error("Failed to seed OSAS office:", err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

