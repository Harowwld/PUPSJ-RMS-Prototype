/**
 * Script: generate-sample-osas-documents.mjs
 *
 * Generates realistic, professionally formatted PDF sample documents for OSAS:
 * 1. Event Submissions (Pre-Event Proposals, Activity Requests)
 * 2. Post-Event Documents (Narrative Accomplishment Reports, Financial Liquidation Reports, Clearance Certificates)
 *
 * All output files are saved directly in `_SAMPLE_DATA/`.
 *
 * Usage:
 *   node scripts/generate-sample-osas-documents.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const outputDir = path.resolve(__dirname, "../../_SAMPLE_DATA");

// Color Palette
const Maroon = rgb(128 / 255, 0, 0);
const DarkSlate = rgb(30 / 255, 41 / 255, 59 / 255);
const MediumGray = rgb(100 / 255, 116 / 255, 139 / 255);
const LightGray = rgb(241 / 255, 245 / 255, 249 / 255);
const BorderGray = rgb(203 / 255, 213 / 255, 225 / 255);
const White = rgb(1, 1, 1);
const Gold = rgb(202 / 255, 138 / 255, 4 / 255);
const Green = rgb(22 / 255, 101 / 255, 52 / 255);

async function createBaseDoc() {
  const doc = await PDFDocument.create();
  const fontRegular = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const fontOblique = await doc.embedFont(StandardFonts.HelveticaOblique);
  return { doc, fontRegular, fontBold, fontOblique };
}

function drawHeader(page, fonts, { formCode, title, subtitle, refNo, dateStr }) {
  const { fontRegular, fontBold, fontOblique } = fonts;
  const width = page.getWidth();

  // Top Accent Bar
  page.drawRectangle({
    x: 40,
    y: 755,
    width: width - 80,
    height: 3,
    color: Maroon,
  });

  // University Header
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

  // Form Code & Ref No in top right
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

  // Document Title Banner Box
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
    y: 697,
    size: 11,
    font: fontBold,
    color: DarkSlate,
  });

  page.drawText(subtitle || `Official Student Document — Form ${formCode || "OSAS"}`, {
    x: 52,
    y: 686,
    size: 7.5,
    font: fontRegular,
    color: MediumGray,
  });
}

function drawFooter(page, fonts, formCode) {
  const { fontOblique } = fonts;
  page.drawLine({
    start: { x: 40, y: 45 },
    end: { x: page.getWidth() - 40, y: 45 },
    thickness: 0.5,
    color: BorderGray,
  });
  page.drawText(`Form ${formCode || "OSAS"} · Records Management System (RMS) · PUP San Juan OSAS Archival Repository`, {
    x: 40,
    y: 34,
    size: 7,
    font: fontOblique,
    color: MediumGray,
  });
}

function drawFieldGrid(page, fonts, startY, fields) {
  const { fontRegular, fontBold } = fonts;
  let curY = startY;

  for (const item of fields) {
    page.drawText(item.label, {
      x: 50,
      y: curY,
      size: 8,
      font: fontBold,
      color: MediumGray,
    });
    page.drawText(String(item.value || "—"), {
      x: 180,
      y: curY,
      size: 8.5,
      font: item.bold ? fontBold : fontRegular,
      color: item.bold ? Maroon : DarkSlate,
    });
    page.drawLine({
      start: { x: 50, y: curY - 5 },
      end: { x: page.getWidth() - 50, y: curY - 5 },
      thickness: 0.5,
      color: BorderGray,
    });
    curY -= 20;
  }
  return curY;
}

function drawSectionHeading(page, fonts, y, title) {
  const { fontBold } = fonts;
  page.drawText(title.toUpperCase(), {
    x: 40,
    y: y,
    size: 8.5,
    font: fontBold,
    color: Maroon,
  });
  page.drawLine({
    start: { x: 40, y: y - 4 },
    end: { x: page.getWidth() - 40, y: y - 4 },
    thickness: 1,
    color: Maroon,
  });
  return y - 16;
}

function drawSignatures(page, fonts, y, signatories) {
  const { fontRegular, fontBold } = fonts;
  const colWidth = (page.getWidth() - 80) / signatories.length;

  for (let i = 0; i < signatories.length; i++) {
    const s = signatories[i];
    const colX = 40 + i * colWidth;
    const lineX = colX + 10;
    const lineWidth = colWidth - 20;

    page.drawLine({
      start: { x: lineX, y: y },
      end: { x: lineX + lineWidth, y: y },
      thickness: 1,
      color: DarkSlate,
    });

    page.drawText(s.name, {
      x: lineX,
      y: y - 12,
      size: 7.5,
      font: fontBold,
      color: DarkSlate,
    });

    page.drawText(s.title, {
      x: lineX,
      y: y - 22,
      size: 6.5,
      font: fontRegular,
      color: MediumGray,
    });
  }
}

// ============================================================================
// 1. EVENT PROPOSAL: JFINEX
// ============================================================================
async function generateProposalJfinex() {
  const { doc, fontRegular, fontBold, fontOblique } = await createBaseDoc();
  const page = doc.addPage([595.28, 841.89]); // A4
  const fonts = { fontRegular, fontBold, fontOblique };

  drawHeader(page, fonts, {
    formCode: "OSAS-EP-2026",
    title: "Student Activity & Event Proposal",
    subtitle: "Junior Financial Executives (JFINEX) — Academic Year 2026-2027",
    refNo: "OSAS-EP-2026-0042",
    dateStr: "October 14, 2026",
  });

  let y = 660;
  y = drawSectionHeading(page, fonts, y, "I. Event Overview & Logistics");

  y = drawFieldGrid(page, fonts, y, [
    { label: "Host Organization:", value: "Junior Financial Executives (JFINEX)", bold: true },
    { label: "Acronym & Category:", value: "JFINEX  •  Academic (BSBA-FM)", bold: false },
    { label: "Project Title:", value: "National Financial Literacy Summit & Investment Colloquium 2026", bold: true },
    { label: "Target Event Date:", value: "November 14, 2026 (Saturday, 8:00 AM – 5:00 PM)", bold: false },
    { label: "Target Venue:", value: "PUP San Juan Audio-Visual Theater & Function Hall", bold: false },
    { label: "Expected Attendance:", value: "185 Participants (BSBA Financial Management Students)", bold: false },
    { label: "Proposed Budget:", value: "PHP 18,500.00 (Fund Source: Org Operational Funds)", bold: true },
    { label: "Faculty Adviser:", value: "Dr. Milton Friedman (mfriedman@pup.edu.ph)", bold: false },
  ]);

  y -= 8;
  y = drawSectionHeading(page, fonts, y, "II. Project Rationale & Objectives");
  const paragraphs = [
    "The 2026 National Financial Literacy Summit is organized to equip business students with actionable",
    "insights into macroeconomic policies, equity market investments, fintech applications, and responsible",
    "wealth building. It features keynote addresses from certified financial analysts and an interactive forum.",
  ];
  for (const p of paragraphs) {
    page.drawText(p, { x: 50, y, size: 8, font: fontRegular, color: DarkSlate });
    y -= 13;
  }

  y -= 8;
  y = drawSectionHeading(page, fonts, y, "III. Key Milestones & Program Agenda");
  const agenda = [
    ["08:00 AM – 09:00 AM", "Registration, Kit Distribution, and Welcoming Remarks"],
    ["09:00 AM – 11:30 AM", "Keynote Session 1: Navigating Global Capital Markets & Digital Assets"],
    ["01:00 PM – 03:30 PM", "Panel Discussion: Financial Discipline, Personal Budgeting & Startup Funding"],
    ["03:30 PM – 04:30 PM", "Open Floor Q&A, Networking, and Awarding of Certificates"],
  ];
  for (const [time, desc] of agenda) {
    page.drawText(time, { x: 50, y, size: 7.5, font: fontBold, color: Maroon });
    page.drawText(desc, { x: 180, y, size: 7.5, font: fontRegular, color: DarkSlate });
    y -= 15;
  }

  y -= 8;
  y = drawSectionHeading(page, fonts, y, "IV. Safety, Logistics & Physical Archive Filing");
  const safetyPoints = [
    "• Room Capacity: Maximum occupancy verified with University Safety & Physical Plant Office.",
    "• Digital & Physical Records: Filed under Archive Room 1, Cabinet: ACADEMIC ORGANIZATIONS, Drawer 1.",
    "• Liquidations: Mandatory post-event submission within 10 school days following event execution.",
  ];
  for (const sp of safetyPoints) {
    page.drawText(sp, { x: 50, y, size: 7.5, font: fontRegular, color: DarkSlate });
    y -= 13;
  }

  // Signatures
  y -= 25;
  drawSignatures(page, fonts, y, [
    { name: "REGINA C. DE LEON", title: "President, JFINEX" },
    { name: "DR. MILTON FRIEDMAN", title: "Faculty Adviser" },
    { name: "DR. SANDRA GOMEZ", title: "OSAS Director / Head" },
  ]);

  drawFooter(page, fonts, "OSAS-EP-2026");
  return Buffer.from(await doc.save());
}

// ============================================================================
// 2. EVENT PROPOSAL: GLITCH
// ============================================================================
async function generateProposalGlitch() {
  const { doc, fontRegular, fontBold, fontOblique } = await createBaseDoc();
  const page = doc.addPage([595.28, 841.89]);
  const fonts = { fontRegular, fontBold, fontOblique };

  drawHeader(page, fonts, {
    formCode: "OSAS-EP-2026",
    title: "Student Activity & Event Proposal",
    subtitle: "Governing League of I.T. Challengers (GLITCH) — Academic Year 2026-2027",
    refNo: "OSAS-EP-2026-0038",
    dateStr: "October 08, 2026",
  });

  let y = 660;
  y = drawSectionHeading(page, fonts, y, "I. Event Overview & Specifications");

  y = drawFieldGrid(page, fonts, y, [
    { label: "Host Organization:", value: "Governing League of I.T. Challengers (GLITCH)", bold: true },
    { label: "Category & Filing:", value: "Academic (BSIT)  •  Cabinet: ACADEMIC ORGANIZATIONS  •  Drawer: 6", bold: false },
    { label: "Project Title:", value: "CodeCraft 2026: Inter-Departmental Hackathon & Innovation Expo", bold: true },
    { label: "Target Event Date:", value: "October 28, 2026 (Wednesday, 8:00 AM – 8:00 PM)", bold: false },
    { label: "Venue & Reservation:", value: "Computer Laboratories 1 & 2  •  Campus Gymnasium Exhibition Area", bold: false },
    { label: "Estimated Participants:", value: "140 Student Developers & Designers across BSIT and BSCS", bold: false },
    { label: "Operational Budget:", value: "PHP 24,000.00 (Zero Student Assessment — Org Funds & Sponsor Backing)", bold: true },
    { label: "Faculty Adviser:", value: "Prof. Alan Turing (aturing@pup.edu.ph)", bold: false },
  ]);

  y -= 8;
  y = drawSectionHeading(page, fonts, y, "II. Technical Objectives & Hackathon Tracks");
  const tracks = [
    "Track 1: Civic & Smart Campus Solutions (Next-gen student services and administrative automation)",
    "Track 2: AI & Machine Learning for Disaster Preparedness (Flood routing and early emergency alerts)",
    "Track 3: Open Data & Cybersecurity Hygiene (Zero-trust access and identity verification prototypes)",
  ];
  for (const t of tracks) {
    page.drawText(`• ${t}`, { x: 50, y, size: 7.5, font: fontRegular, color: DarkSlate });
    y -= 13;
  }

  y -= 8;
  y = drawSectionHeading(page, fonts, y, "III. Laboratory Safety & Network Infrastructure Clearance");
  const infraNotes = [
    "1. Dedicated isolated VLAN provisioned by ICT Office to prevent campus intranet congestion.",
    "2. Strict curfew check: Hackathon concludes promptly at 8:00 PM in compliance with security guidelines.",
    "3. First aid responder deployed on standby at Clinic Station adjacent to Computer Laboratory 1.",
  ];
  for (const n of infraNotes) {
    page.drawText(n, { x: 50, y, size: 7.5, font: fontRegular, color: DarkSlate });
    y -= 13;
  }

  y -= 8;
  y = drawSectionHeading(page, fonts, y, "IV. Estimated Budget Breakdown");
  const budgetTable = [
    ["Food & Meals for Participants / Mentors (140 pax)", "PHP 14,000.00"],
    ["Trophies, Cash Prizes & Certificate Plaques", "PHP 6,500.00"],
    ["Network Patch Cables, Surge Strips, Lanyards", "PHP 2,500.00"],
    ["Logistics & Miscellaneous Emergency Contingency", "PHP 1,000.00"],
  ];
  for (const [item, amt] of budgetTable) {
    page.drawText(item, { x: 60, y, size: 7.5, font: fontRegular, color: DarkSlate });
    page.drawText(amt, { x: 440, y, size: 7.5, font: fontBold, color: DarkSlate });
    y -= 13;
  }

  y -= 25;
  drawSignatures(page, fonts, y, [
    { name: "CEDRICK MARIANO", title: "President, GLITCH" },
    { name: "PROF. ALAN TURING", title: "Faculty Adviser" },
    { name: "DR. SANDRA GOMEZ", title: "OSAS Director / Head" },
  ]);

  drawFooter(page, fonts, "OSAS-EP-2026");
  return Buffer.from(await doc.save());
}

// ============================================================================
// 3. EVENT PROPOSAL: PYLON E-SPORTS
// ============================================================================
async function generateProposalPylon() {
  const { doc, fontRegular, fontBold, fontOblique } = await createBaseDoc();
  const page = doc.addPage([595.28, 841.89]);
  const fonts = { fontRegular, fontBold, fontOblique };

  drawHeader(page, fonts, {
    formCode: "OSAS-EP-2026",
    title: "Student Activity & Event Proposal",
    subtitle: "PYLON E-Sports — Special Interest / Non-Academic Organization",
    refNo: "OSAS-EP-2026-0049",
    dateStr: "October 16, 2026",
  });

  let y = 660;
  y = drawSectionHeading(page, fonts, y, "I. Tournament Details & Event Overview");

  y = drawFieldGrid(page, fonts, y, [
    { label: "Host Organization:", value: "PYLON E-Sports", bold: true },
    { label: "Acronym & Category:", value: "PYLON  •  Non-Academic (Esports & Gaming)", bold: false },
    { label: "Project Title:", value: "San Juan Collegiate Esports Cup: Mobile Legends & Valorant Invitational 2026", bold: true },
    { label: "Target Event Date:", value: "November 20, 2026 (Friday, 9:00 AM – 6:00 PM)", bold: false },
    { label: "Venue / Area:", value: "PUP San Juan Gymnasium & Covered Court Stage", bold: false },
    { label: "Expected Players & Audience:", value: "120 Competing Players  •  200 Spectators (Within capacity limits)", bold: false },
    { label: "Allocated Budget:", value: "PHP 15,000.00 (Self-funded through registered team tournament entries)", bold: true },
    { label: "Faculty Adviser:", value: "Engr. Kevin Lim (klim@pup.edu.ph)", bold: false },
    { label: "Physical Filing Location:", value: "Archive Room 1  •  Cabinet: NON-ACADEMIC ORGANIZATIONS  •  Drawer: 1", bold: false },
  ]);

  y -= 8;
  y = drawSectionHeading(page, fonts, y, "II. Health, Sportsmanship & Campus Conduct Code");
  const codeItems = [
    "• Zero Overnight Policy: Event concludes strictly at 6:00 PM with all students departing campus by 6:30 PM.",
    "• Strict Anti-Toxicity & Academic Standing: All players must be enrolled students in good moral standing.",
    "• Electrical Load Inspection: Physical Plant and Maintenance Office inspection scheduled 48 hours prior.",
  ];
  for (const c of codeItems) {
    page.drawText(c, { x: 50, y, size: 7.5, font: fontRegular, color: DarkSlate });
    y -= 13;
  }

  y -= 8;
  y = drawSectionHeading(page, fonts, y, "III. Equipment Manifest & Power Safety");
  page.drawText("Equipment to be brought onto campus: 10 Gaming PCs (Production Broadcast), 2 Audio Mixing Consoles, 4 HDMI Monitors.", {
    x: 50,
    y,
    size: 7.5,
    font: fontRegular,
    color: DarkSlate,
  });
  y -= 14;
  page.drawText("All items cleared with Property & Procurement Office gate pass clearance #GP-2026-118.", {
    x: 50,
    y,
    size: 7.5,
    font: fontOblique,
    color: MediumGray,
  });

  y -= 45;
  drawSignatures(page, fonts, y, [
    { name: "AXEL R. BAUTISTA", title: "President, PYLON E-Sports" },
    { name: "ENGR. KEVIN LIM", title: "Faculty Adviser" },
    { name: "DR. SANDRA GOMEZ", title: "OSAS Director / Head" },
  ]);

  drawFooter(page, fonts, "OSAS-EP-2026");
  return Buffer.from(await doc.save());
}

// ============================================================================
// 4. EVENT PROPOSAL: LENTE FILIKULAS
// ============================================================================
async function generateProposalLente() {
  const { doc, fontRegular, fontBold, fontOblique } = await createBaseDoc();
  const page = doc.addPage([595.28, 841.89]);
  const fonts = { fontRegular, fontBold, fontOblique };

  drawHeader(page, fonts, {
    formCode: "OSAS-EP-2026",
    title: "Student Activity & Event Proposal",
    subtitle: "PUP Lente Filikulas — Film, Arts & Photography Guild",
    refNo: "OSAS-EP-2026-0055",
    dateStr: "October 18, 2026",
  });

  let y = 660;
  y = drawSectionHeading(page, fonts, y, "I. Production Details & Overview");

  y = drawFieldGrid(page, fonts, y, [
    { label: "Host Organization:", value: "PUP Lente Filikulas", bold: true },
    { label: "Acronym & Category:", value: "LENTE FILIKULAS  •  Non-Academic (Arts & Film)", bold: false },
    { label: "Project Title:", value: "PelikuLektura: Campus Indie Film Showcase & Cinematography Masterclass", bold: true },
    { label: "Target Event Date:", value: "December 04, 2026 (Friday, 1:00 PM – 7:00 PM)", bold: false },
    { label: "Venue:", value: "AVR Room 201 & Campus Amphitheater", bold: false },
    { label: "Projected Audience:", value: "95 Students (Arts, Communication, Humanities, General Public)", bold: false },
    { label: "Budget Requirement:", value: "PHP 12,000.00 (Self-funded / Partner Sponsorship)", bold: true },
    { label: "Faculty Adviser:", value: "Prof. Ishmael Bernal (ibernal@pup.edu.ph)", bold: false },
    { label: "Physical Archive Filing:", value: "Archive Room 1  •  Cabinet: NON-ACADEMIC ORGANIZATIONS  •  Drawer: 7", bold: false },
  ]);

  y -= 8;
  y = drawSectionHeading(page, fonts, y, "II. Showcase Lineup & Masterclass Modules");
  const modules = [
    "1. Lighting & Visual Composition for Low-Budget Filmmaking (Speaker: Director Carlo O.)",
    "2. Scriptwriting & Storyboard Translation: Crafting Authentic Local Narratives",
    "3. Screening of 5 Student Short Documentaries produced by PUP San Juan undergraduates",
    "4. Open Forum & Filmmaker Mentorship Session",
  ];
  for (const m of modules) {
    page.drawText(m, { x: 50, y, size: 7.5, font: fontRegular, color: DarkSlate });
    y -= 13;
  }

  y -= 45;
  drawSignatures(page, fonts, y, [
    { name: "MA. ELENA SANTOS", title: "President, Lente Filikulas" },
    { name: "PROF. ISHMAEL BERNAL", title: "Faculty Adviser" },
    { name: "DR. SANDRA GOMEZ", title: "OSAS Director / Head" },
  ]);

  drawFooter(page, fonts, "OSAS-EP-2026");
  return Buffer.from(await doc.save());
}

// ============================================================================
// 5. ACTIVITY REQUEST & SAFETY CLEARANCE: HHC
// ============================================================================
async function generateSafetyClearanceHhc() {
  const { doc, fontRegular, fontBold, fontOblique } = await createBaseDoc();
  const page = doc.addPage([595.28, 841.89]);
  const fonts = { fontRegular, fontBold, fontOblique };

  drawHeader(page, fonts, {
    formCode: "OSAS-AR-2026",
    title: "Campus Activity & Safety Clearance Endorsement",
    subtitle: "Helping Hands Community (HHC) — Outreach & Civic Extension Mission",
    refNo: "OSAS-AR-2026-0021",
    dateStr: "October 19, 2026",
  });

  let y = 660;
  y = drawSectionHeading(page, fonts, y, "I. Outreach Mission Details");

  y = drawFieldGrid(page, fonts, y, [
    { label: "Organization:", value: "Helping Hands Community (HHC)", bold: true },
    { label: "Mission Title:", value: "Balik-Eskwela Outreach & School Supply Drive 2026", bold: true },
    { label: "Off-Campus Mission Date:", value: "November 07, 2026 (Saturday, 7:00 AM – 3:00 PM)", bold: false },
    { label: "Destination / Location:", value: "Barangay Addition Hills Multi-Purpose Community Center, San Juan", bold: false },
    { label: "Lead Student Proponent:", value: "Cedrick Mariano (President, Helping Hands Community)", bold: false },
    { label: "Faculty Chaperone:", value: "Dr. Maria Santos (Director for Civic Engagement)", bold: false },
    { label: "Physical Archive Filing:", value: "Archive Room 1  •  Cabinet: NON-ACADEMIC ORGANIZATIONS  •  Drawer: 3", bold: false },
  ]);

  y -= 8;
  y = drawSectionHeading(page, fonts, y, "II. Institutional Safety & Clearance Checklist");
  const checks = [
    "[COMPLIED] Parental / Guardian Waiver and Consent Slips on file for all participating student volunteers.",
    "[COMPLIED] University Clinic first-aid kit, emergency medical protocol, and portable hydration station deployed.",
    "[COMPLIED] Barangay Local Government Unit (LGU) and Police Clearance letter formally acknowledged and filed.",
    "[COMPLIED] Dedicated point-to-point university vehicle / transportation chartered and inspected.",
  ];
  for (const chk of checks) {
    page.drawText(chk, { x: 50, y, size: 7.5, font: fontRegular, color: Green });
    y -= 14;
  }

  y -= 45;
  drawSignatures(page, fonts, y, [
    { name: "CEDRICK MARIANO", title: "HHC Lead Proponent" },
    { name: "DR. MARIA SANTOS", title: "Faculty Chaperone" },
    { name: "ENGR. EDGAR FLORES", title: "Campus Safety & Security" },
    { name: "DR. SANDRA GOMEZ", title: "OSAS Director / Head" },
  ]);

  drawFooter(page, fonts, "OSAS-AR-2026");
  return Buffer.from(await doc.save());
}

// ============================================================================
// 6. POST-EVENT NARRATIVE REPORT: GLITCH
// ============================================================================
async function generatePostEventNarrativeGlitch() {
  const { doc, fontRegular, fontBold, fontOblique } = await createBaseDoc();
  const page = doc.addPage([595.28, 841.89]);
  const fonts = { fontRegular, fontBold, fontOblique };

  drawHeader(page, fonts, {
    formCode: "OSAS-PNR-2026",
    title: "Post-Event Narrative & Accomplishment Report",
    subtitle: "Official Student Organization Post-Activity Documentation Form",
    refNo: "OSAS-PNR-2026-0038",
    dateStr: "November 03, 2026",
  });

  let y = 660;
  y = drawSectionHeading(page, fonts, y, "I. Post-Event Summary & Verification");

  y = drawFieldGrid(page, fonts, y, [
    { label: "Organization Name:", value: "Governing League of I.T. Challengers (GLITCH)", bold: true },
    { label: "Approved Event Title:", value: "CodeCraft 2026: Inter-Departmental Hackathon & Innovation Expo", bold: true },
    { label: "Associated Proposal Ref:", value: "OSAS-EP-2026-0038 (Approved on October 12, 2026)", bold: false },
    { label: "Date Executed:", value: "October 28, 2026 (Completed within approved schedule)", bold: false },
    { label: "Approved Venue:", value: "Computer Laboratories 1 & 2, PUP San Juan Campus", bold: false },
    { label: "Actual Attendance:", value: "138 Registered Student Participants (Target: 140)", bold: true },
    { label: "Overall Evaluation Score:", value: "4.86 / 5.00 (Exemplary Rating based on 124 feedback forms)", bold: true },
    { label: "Submitted by:", value: "cedrick.mariano@pup.local (GLITCH President)", bold: false },
  ]);

  y -= 8;
  y = drawSectionHeading(page, fonts, y, "II. Executive Narrative & Major Highlights");
  const highlights = [
    "CodeCraft 2026 commenced promptly at 8:00 AM with 28 interdisciplinary teams presenting working code",
    "by 6:30 PM. A total of 138 students successfully deployed functioning web and mobile prototypes addressing",
    "smart campus governance, emergency medical routing, and student record request workflows.",
    "",
    "Winning Prototypes Recognized by Jury Panel:",
    "• 1st Place (Champion): Team 'Sentinel' — Automated Student Disciplinary Log & Audit Trail",
    "• 2nd Place: Team 'AgriByte' — Smart Hydroponics Telemetry Dashboard for Campus Science Lab",
    "• 3rd Place: Team 'PUP-Connect' — Offline-First P2P Campus Notes Exchange App",
  ];
  for (const h of highlights) {
    page.drawText(h, { x: 50, y, size: 7.5, font: fontRegular, color: DarkSlate });
    y -= 12;
  }

  y -= 8;
  y = drawSectionHeading(page, fonts, y, "III. Challenges Encountered & Corrective Actions");
  const challenges = [
    "• Bandwidth Peak: Around 2:00 PM, concurrent package downloads exceeded initial lab quota.",
    "  Action: ICT Administrator promptly bridged the backup fiber gateway without interrupting the contest.",
    "• Food Distribution Flow: First-floor queue produced temporary bottleneck.",
    "  Recommendation: Stagger lunch distribution across two dedicated classroom lounges in future editions.",
  ];
  for (const c of challenges) {
    page.drawText(c, { x: 50, y, size: 7.5, font: fontRegular, color: DarkSlate });
    y -= 12;
  }

  y -= 25;
  drawSignatures(page, fonts, y, [
    { name: "CEDRICK MARIANO", title: "President, GLITCH" },
    { name: "PROF. ALAN TURING", title: "Faculty Adviser" },
    { name: "DR. SANDRA GOMEZ", title: "OSAS Director / Head" },
  ]);

  drawFooter(page, fonts, "OSAS-PNR-2026");
  return Buffer.from(await doc.save());
}

// ============================================================================
// 7. FINANCIAL LIQUIDATION REPORT: GLITCH
// ============================================================================
async function generateLiquidationGlitch() {
  const { doc, fontRegular, fontBold, fontOblique } = await createBaseDoc();
  const page = doc.addPage([595.28, 841.89]);
  const fonts = { fontRegular, fontBold, fontOblique };

  drawHeader(page, fonts, {
    formCode: "OSAS-FLR-2026",
    title: "Official Financial Liquidation Report",
    subtitle: "Itemized Statement of Incurred Disbursements & Proofs of Purchase",
    refNo: "OSAS-FLR-2026-0038",
    dateStr: "November 03, 2026",
  });

  let y = 660;
  y = drawSectionHeading(page, fonts, y, "I. Liquidation Overview");

  y = drawFieldGrid(page, fonts, y, [
    { label: "Host Organization:", value: "Governing League of I.T. Challengers (GLITCH)", bold: true },
    { label: "Activity Reference:", value: "CodeCraft 2026 Hackathon (OSAS-EP-2026-0038)", bold: true },
    { label: "Approved Working Budget:", value: "PHP 24,000.00", bold: false },
    { label: "Total Actual Disbursements:", value: "PHP 22,850.00 (95.2% Utilization)", bold: true },
    { label: "Unexpended Balance / Surplus:", value: "PHP 1,150.00 (Returned to Organization Bank Account)", bold: true },
    { label: "Attached Receipts Count:", value: "6 Official Receipts & 2 BIR Invoices", bold: false },
  ]);

  y -= 8;
  y = drawSectionHeading(page, fonts, y, "II. Itemized Statement of Disbursements");

  // Table Header Box
  page.drawRectangle({
    x: 40,
    y: y - 14,
    width: page.getWidth() - 80,
    height: 18,
    color: Maroon,
  });

  page.drawText("OR / REF NO.", { x: 45, y: y - 10, size: 7.5, font: fontBold, color: White });
  page.drawText("PARTICULARS & SUPPLIER", { x: 130, y: y - 10, size: 7.5, font: fontBold, color: White });
  page.drawText("CATEGORY", { x: 370, y: y - 10, size: 7.5, font: fontBold, color: White });
  page.drawText("AMOUNT (PHP)", { x: 470, y: y - 10, size: 7.5, font: fontBold, color: White });
  y -= 22;

  const rows = [
    ["OR-2026-8812", "Jollibee San Juan — 140 Packed Meals & Drinks", "Meals & Catering", "13,650.00"],
    ["OR-2026-0194", "Merit Awards Manila — 3 Acrylic Plaques & Medals", "Awards & Trophies", "4,200.00"],
    ["INV-44021-B", "Octagon Computer Superstore — 6 Surge Protectors", "Technical Logistics", "2,150.00"],
    ["OR-2026-9041", "National Book Store — Lanyards, Badges & Sharpies", "Materials & Supplies", "1,850.00"],
    ["OR-2026-3112", "Mercury Drug — Bandages, Alcohol, Paracetamol", "First Aid Kit", "1,000.00"],
  ];

  for (let i = 0; i < rows.length; i++) {
    const [ref, desc, cat, amt] = rows[i];
    const rowBg = i % 2 === 0 ? LightGray : White;
    page.drawRectangle({
      x: 40,
      y: y - 10,
      width: page.getWidth() - 80,
      height: 16,
      color: rowBg,
    });
    page.drawText(ref, { x: 45, y: y - 6, size: 7, font: fontBold, color: DarkSlate });
    page.drawText(desc, { x: 130, y: y - 6, size: 7, font: fontRegular, color: DarkSlate });
    page.drawText(cat, { x: 370, y: y - 6, size: 7, font: fontRegular, color: MediumGray });
    page.drawText(amt, { x: 485, y: y - 6, size: 7, font: fontBold, color: DarkSlate });
    y -= 16;
  }

  // Summary Total Line
  page.drawLine({
    start: { x: 40, y: y - 2 },
    end: { x: page.getWidth() - 40, y: y - 2 },
    thickness: 1,
    color: Maroon,
  });
  page.drawText("TOTAL DISBURSED AMOUNT:", { x: 330, y: y - 12, size: 8, font: fontBold, color: Maroon });
  page.drawText("PHP 22,850.00", { x: 475, y: y - 12, size: 8.5, font: fontBold, color: Maroon });

  y -= 30;
  y = drawSectionHeading(page, fonts, y, "III. Certification of Authenticity & Signatures");
  page.drawText("We hereby certify on our official honor that the foregoing disbursements are true, complete, and incurred", {
    x: 40,
    y,
    size: 7.5,
    font: fontRegular,
    color: DarkSlate,
  });
  y -= 12;
  page.drawText("solely for the sanctioned objectives of the approved student organization activity.", {
    x: 40,
    y,
    size: 7.5,
    font: fontRegular,
    color: DarkSlate,
  });

  y -= 30;
  drawSignatures(page, fonts, y, [
    { name: "CLARISSE V. RAMOS", title: "Treasurer, GLITCH" },
    { name: "MARK ANTHONY TAN", title: "Auditor, GLITCH" },
    { name: "CEDRICK MARIANO", title: "President, GLITCH" },
    { name: "DR. SANDRA GOMEZ", title: "OSAS Director / Head" },
  ]);

  drawFooter(page, fonts, "OSAS-FLR-2026");
  return Buffer.from(await doc.save());
}

// ============================================================================
// 8. POST-EVENT NARRATIVE REPORT: JFINEX
// ============================================================================
async function generatePostEventNarrativeJfinex() {
  const { doc, fontRegular, fontBold, fontOblique } = await createBaseDoc();
  const page = doc.addPage([595.28, 841.89]);
  const fonts = { fontRegular, fontBold, fontOblique };

  drawHeader(page, fonts, {
    formCode: "OSAS-PNR-2026",
    title: "Post-Event Narrative & Accomplishment Report",
    subtitle: "Junior Financial Executives (JFINEX) — Official Accomplishment Report",
    refNo: "OSAS-PNR-2026-0042",
    dateStr: "November 18, 2026",
  });

  let y = 660;
  y = drawSectionHeading(page, fonts, y, "I. Accomplishment Summary");

  y = drawFieldGrid(page, fonts, y, [
    { label: "Host Organization:", value: "Junior Financial Executives (JFINEX)", bold: true },
    { label: "Event Name:", value: "National Financial Literacy Summit & Investment Colloquium 2026", bold: true },
    { label: "Proposal Authorization:", value: "OSAS-EP-2026-0042 (Approved October 15, 2026)", bold: false },
    { label: "Execution Date & Venue:", value: "November 14, 2026  •  PUP San Juan Audio-Visual Theater", bold: false },
    { label: "Verified Attendance:", value: "182 Students Attended (174 BSBA-FM, 8 Guests)", bold: true },
    { label: "Faculty Adviser in Attendance:", value: "Dr. Milton Friedman (mfriedman@pup.edu.ph)", bold: false },
    { label: "Submitted by:", value: "regina.deleon@pup.local (JFINEX President)", bold: false },
  ]);

  y -= 8;
  y = drawSectionHeading(page, fonts, y, "II. Executive Narrative & Session Takeaways");
  const highlights = [
    "The 2026 Financial Literacy Summit concluded with resounding success. Keynote Speaker Atty. Rafael S.",
    "of the Securities and Exchange Commission delivered a comprehensive address on investor protection against",
    "unlicensed online investment scams. A second masterclass tackled index funds, dividend investing, and personal",
    "tax management for fresh graduates.",
  ];
  for (const h of highlights) {
    page.drawText(h, { x: 50, y, size: 7.5, font: fontRegular, color: DarkSlate });
    y -= 13;
  }

  y -= 8;
  y = drawSectionHeading(page, fonts, y, "III. Quantitative Student Evaluation Results");
  const stats = [
    ["Relevance of Topics to Business Curriculum", "4.92 / 5.00"],
    ["Quality and Clarity of Guest Speakers", "4.88 / 5.00"],
    ["Venue Ambiance & Audio-Visual Quality", "4.65 / 5.00"],
    ["Overall Event Organization & Timeliness", "4.79 / 5.00"],
  ];
  for (const [metric, score] of stats) {
    page.drawText(`• ${metric}`, { x: 60, y, size: 7.5, font: fontRegular, color: DarkSlate });
    page.drawText(score, { x: 440, y, size: 7.5, font: fontBold, color: Maroon });
    y -= 13;
  }

  y -= 25;
  drawSignatures(page, fonts, y, [
    { name: "REGINA C. DE LEON", title: "President, JFINEX" },
    { name: "DR. MILTON FRIEDMAN", title: "Faculty Adviser" },
    { name: "DR. SANDRA GOMEZ", title: "OSAS Director / Head" },
  ]);

  drawFooter(page, fonts, "OSAS-PNR-2026");
  return Buffer.from(await doc.save());
}

// ============================================================================
// 9. FINANCIAL LIQUIDATION REPORT: JFINEX
// ============================================================================
async function generateLiquidationJfinex() {
  const { doc, fontRegular, fontBold, fontOblique } = await createBaseDoc();
  const page = doc.addPage([595.28, 841.89]);
  const fonts = { fontRegular, fontBold, fontOblique };

  drawHeader(page, fonts, {
    formCode: "OSAS-FLR-2026",
    title: "Official Financial Liquidation Report",
    subtitle: "Junior Financial Executives (JFINEX) — Financial Compliance Statement",
    refNo: "OSAS-FLR-2026-0042",
    dateStr: "November 18, 2026",
  });

  let y = 660;
  y = drawSectionHeading(page, fonts, y, "I. Budget Summary");

  y = drawFieldGrid(page, fonts, y, [
    { label: "Host Organization:", value: "Junior Financial Executives (JFINEX)", bold: true },
    { label: "Event Name:", value: "National Financial Literacy Summit 2026 (OSAS-EP-2026-0042)", bold: true },
    { label: "Approved Working Budget:", value: "PHP 18,500.00", bold: false },
    { label: "Total Incurred Disbursements:", value: "PHP 18,120.00 (97.9% Utilization)", bold: true },
    { label: "Unexpended Balance / Surplus:", value: "PHP 380.00 (Returned to Organization General Fund)", bold: true },
    { label: "Proof Documents Attached:", value: "5 Official Invoices & Verified Supplier Slips", bold: false },
  ]);

  y -= 8;
  y = drawSectionHeading(page, fonts, y, "II. Schedule of Expenditures");

  page.drawRectangle({
    x: 40,
    y: y - 14,
    width: page.getWidth() - 80,
    height: 18,
    color: Maroon,
  });

  page.drawText("RECEIPT REF", { x: 45, y: y - 10, size: 7.5, font: fontBold, color: White });
  page.drawText("EXPENSE DESCRIPTION & SUPPLIER", { x: 130, y: y - 10, size: 7.5, font: fontBold, color: White });
  page.drawText("ACCOUNT CODE", { x: 370, y: y - 10, size: 7.5, font: fontBold, color: White });
  page.drawText("AMOUNT (PHP)", { x: 470, y: y - 10, size: 7.5, font: fontBold, color: White });
  y -= 22;

  const rows = [
    ["OR-2026-4421", "Goldilocks Bakeshop — 185 Snack Packs & Bottled Water", "Catering & Snacks", "9,250.00"],
    ["OR-2026-1102", "Plaque Palace — 3 Glass Trophies for Keynote Speakers", "Honorarium & Tokens", "4,500.00"],
    ["INV-88912-C", "QuickPrint San Juan — Stage Backdrop Banner & Programs", "Collateral & Print", "2,470.00"],
    ["OR-2026-5501", "Office Warehouse — Specialty Paper, Certificate Folders", "Materials & Office", "1,900.00"],
  ];

  for (let i = 0; i < rows.length; i++) {
    const [ref, desc, cat, amt] = rows[i];
    const rowBg = i % 2 === 0 ? LightGray : White;
    page.drawRectangle({
      x: 40,
      y: y - 10,
      width: page.getWidth() - 80,
      height: 16,
      color: rowBg,
    });
    page.drawText(ref, { x: 45, y: y - 6, size: 7, font: fontBold, color: DarkSlate });
    page.drawText(desc, { x: 130, y: y - 6, size: 7, font: fontRegular, color: DarkSlate });
    page.drawText(cat, { x: 370, y: y - 6, size: 7, font: fontRegular, color: MediumGray });
    page.drawText(amt, { x: 485, y: y - 6, size: 7, font: fontBold, color: DarkSlate });
    y -= 16;
  }

  page.drawLine({
    start: { x: 40, y: y - 2 },
    end: { x: page.getWidth() - 40, y: y - 2 },
    thickness: 1,
    color: Maroon,
  });
  page.drawText("TOTAL DISBURSEMENTS:", { x: 340, y: y - 12, size: 8, font: fontBold, color: Maroon });
  page.drawText("PHP 18,120.00", { x: 475, y: y - 12, size: 8.5, font: fontBold, color: Maroon });

  y -= 30;
  y = drawSectionHeading(page, fonts, y, "III. Financial Certification & Signatures");

  page.drawText("Certified correct and audited in compliance with PUP San Juan OSAS financial management guidelines.", {
    x: 40,
    y,
    size: 7.5,
    font: fontRegular,
    color: DarkSlate,
  });

  y -= 30;
  drawSignatures(page, fonts, y, [
    { name: "MARIA L. CRUZ", title: "Treasurer, JFINEX" },
    { name: "LEANDRO M. SANTOS", title: "Auditor, JFINEX" },
    { name: "REGINA C. DE LEON", title: "President, JFINEX" },
    { name: "DR. SANDRA GOMEZ", title: "OSAS Director / Head" },
  ]);

  drawFooter(page, fonts, "OSAS-FLR-2026");
  return Buffer.from(await doc.save());
}

// ============================================================================
// 10. POST-EVENT COMPLIANCE & CLEARANCE CERTIFICATE: OSAS
// ============================================================================
async function generateComplianceCertificate() {
  const { doc, fontRegular, fontBold, fontOblique } = await createBaseDoc();
  const page = doc.addPage([595.28, 841.89]);
  const fonts = { fontRegular, fontBold, fontOblique };

  // Ornate Gold / Maroon Border
  const width = page.getWidth();
  const height = page.getHeight();

  page.drawRectangle({
    x: 25,
    y: 25,
    width: width - 50,
    height: height - 50,
    borderColor: Maroon,
    borderWidth: 2,
  });

  page.drawRectangle({
    x: 30,
    y: 30,
    width: width - 60,
    height: height - 60,
    borderColor: Gold,
    borderWidth: 1,
  });

  // Institution Banner
  page.drawText("POLYTECHNIC UNIVERSITY OF THE PHILIPPINES", {
    x: 120,
    y: 740,
    size: 13,
    font: fontBold,
    color: Maroon,
  });

  page.drawText("SAN JUAN CAMPUS  •  OFFICE OF STUDENT AFFAIRS AND SERVICES", {
    x: 135,
    y: 724,
    size: 9,
    font: fontBold,
    color: DarkSlate,
  });

  page.drawLine({
    start: { x: 80, y: 710 },
    end: { x: width - 80, y: 710 },
    thickness: 1.5,
    color: Maroon,
  });

  page.drawText("CERTIFICATE OF POST-EVENT CLEARANCE & COMPLIANCE", {
    x: 75,
    y: 660,
    size: 13,
    font: fontBold,
    color: Maroon,
  });

  page.drawText("Certificate Control Number: OSAS-CLR-2026-0084", {
    x: 180,
    y: 642,
    size: 8,
    font: fontOblique,
    color: MediumGray,
  });

  const bodyText = [
    "THIS IS TO CERTIFY that the recognized student organization",
    "",
    "GOVERNING LEAGUE OF I.T. CHALLENGERS (GLITCH)",
    "",
    "has satisfactorily submitted, completed, and audited all post-activity requirements for the event:",
    "",
    "\"CodeCraft 2026: Inter-Departmental Hackathon & Innovation Expo\"",
    "Conducted on October 28, 2026 at PUP San Juan Computer Laboratories",
    "",
    "Upon comprehensive evaluation of the Post-Event Narrative Accomplishment Report (OSAS-PNR-2026-0038)",
    "and Financial Liquidation Statement (OSAS-FLR-2026-0038), the aforementioned student organization is hereby",
    "granted FULL CLEARANCE and declared in GOOD STANDING with zero outstanding obligations for this activity.",
    "",
    "This certificate is issued this 4th day of November 2026 at PUP San Juan Campus.",
  ];

  let textY = 590;
  for (const line of bodyText) {
    if (line === "GOVERNING LEAGUE OF I.T. CHALLENGERS (GLITCH)") {
      page.drawText(line, { x: 100, y: textY, size: 12, font: fontBold, color: DarkSlate });
    } else if (line.startsWith("\"CodeCraft 2026")) {
      page.drawText(line, { x: 95, y: textY, size: 10, font: fontBold, color: Maroon });
    } else if (line.startsWith("Conducted on")) {
      page.drawText(line, { x: 125, y: textY, size: 8.5, font: fontOblique, color: MediumGray });
    } else {
      page.drawText(line, { x: 60, y: textY, size: 8.5, font: fontRegular, color: DarkSlate });
    }
    textY -= 17;
  }

  // Official Stamp Box
  page.drawRectangle({
    x: 215,
    y: 240,
    width: 165,
    height: 45,
    borderColor: Green,
    borderWidth: 1.5,
    color: LightGray,
  });

  page.drawText("OSAS AUDIT VERIFIED", { x: 235, y: 268, size: 10, font: fontBold, color: Green });
  page.drawText("CLEARED & FILED IN ARCHIVE ROOM 1", { x: 222, y: 252, size: 6.5, font: fontBold, color: Green });

  // Signatures
  textY = 150;
  drawSignatures(page, fonts, textY, [
    { name: "PROF. JUAN DELA CRUZ", title: "Student Development Coordinator" },
    { name: "DR. SANDRA GOMEZ", title: "OSAS Director / Head" },
  ]);

  drawFooter(page, fonts, "OSAS-CLR-2026");
  return Buffer.from(await doc.save());
}

// ============================================================================
// MAIN GENERATION SUITE
// ============================================================================
async function main() {
  console.log("=== GENERATING REALISTIC OSAS PDF DOCUMENTS IN _SAMPLE_DATA/ ===");
  fs.mkdirSync(outputDir, { recursive: true });

  const docs = [
    // Pre-Event Submissions
    { filename: "sample_event_proposal_jfinex.pdf", generate: generateProposalJfinex, desc: "JFINEX Event Proposal" },
    { filename: "sample_event_proposal_glitch.pdf", generate: generateProposalGlitch, desc: "GLITCH Event Proposal" },
    { filename: "sample_event_proposal_pylon_esports.pdf", generate: generateProposalPylon, desc: "PYLON E-Sports Proposal" },
    { filename: "sample_event_proposal_lente_filikulas.pdf", generate: generateProposalLente, desc: "Lente Filikulas Proposal" },
    { filename: "sample_activity_request_and_safety_clearance.pdf", generate: generateSafetyClearanceHhc, desc: "HHC Safety Clearance" },

    // Post-Event Compliance & Liquidation
    { filename: "sample_post_event_narrative_report_glitch.pdf", generate: generatePostEventNarrativeGlitch, desc: "GLITCH Narrative Report" },
    { filename: "sample_financial_liquidation_report_glitch.pdf", generate: generateLiquidationGlitch, desc: "GLITCH Liquidation Report" },
    { filename: "sample_post_event_narrative_report_jfinex.pdf", generate: generatePostEventNarrativeJfinex, desc: "JFINEX Narrative Report" },
    { filename: "sample_financial_liquidation_report_jfinex.pdf", generate: generateLiquidationJfinex, desc: "JFINEX Liquidation Report" },
    { filename: "sample_post_event_compliance_clearance_certificate.pdf", generate: generateComplianceCertificate, desc: "OSAS Clearance Certificate" },
  ];

  for (let i = 0; i < docs.length; i++) {
    const d = docs[i];
    const filePath = path.join(outputDir, d.filename);
    const pdfBytes = await d.generate();
    fs.writeFileSync(filePath, pdfBytes);
    const kb = (pdfBytes.length / 1024).toFixed(1);
    console.log(`[${i + 1}/${docs.length}] Generated ${d.filename.padEnd(52, " ")} (${kb} KB) — ${d.desc}`);
  }

  console.log(`\n✓ All ${docs.length} sample documents successfully created in:`);
  console.log(`  ${outputDir}\n`);
}

main().catch((err) => {
  console.error("PDF generation failed:", err);
  process.exit(1);
});
