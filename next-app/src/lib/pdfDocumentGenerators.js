/**
 * Professional institutional PDF document generator for PUPSJ Records Keeping System.
 * Generates realistic, fully-rendered, branded PDFs with layout and content tailored
 * to each document type (Registrar compliance documents and OSAS organization records).
 */
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

// Color Palette
const Maroon = rgb(128 / 255, 0, 0);
const DarkSlate = rgb(30 / 255, 41 / 255, 59 / 255);
const MediumGray = rgb(100 / 255, 116 / 255, 139 / 255);
const LightGray = rgb(245 / 255, 247 / 255, 250 / 255);
const BorderGray = rgb(215 / 255, 222 / 255, 230 / 255);
const CrimsonStamp = rgb(185 / 255, 28 / 255, 28 / 255);
const DarkBlue = rgb(30 / 255, 64 / 255, 175 / 255);
const ForestGreen = rgb(21 / 255, 128 / 255, 61 / 255);
const GoldSeal = rgb(180 / 255, 120 / 255, 10 / 255);

async function createBaseDoc() {
  const doc = await PDFDocument.create();
  const fontRegular = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const fontOblique = await doc.embedFont(StandardFonts.HelveticaOblique);
  return { doc, fontRegular, fontBold, fontOblique };
}

function drawInstitutionalHeader(page, fonts, { office = "Office of the Campus Registrar", formCode = "RMS-FORM", refNo, dateStr }) {
  const { fontRegular, fontBold } = fonts;
  const width = page.getWidth();

  // Top Maroon Accent Bar
  page.drawRectangle({
    x: 40,
    y: 752,
    width: width - 80,
    height: 3,
    color: Maroon,
  });

  // University Header
  page.drawText("POLYTECHNIC UNIVERSITY OF THE PHILIPPINES", {
    x: 40,
    y: 736,
    size: 11,
    font: fontBold,
    color: Maroon,
  });

  page.drawText(`SAN JUAN CAMPUS  •  ${office.toUpperCase()}`, {
    x: 40,
    y: 724,
    size: 8,
    font: fontBold,
    color: DarkSlate,
  });

  if (refNo) {
    page.drawText(`REF: ${refNo}`, {
      x: width - 180,
      y: 736,
      size: 8,
      font: fontBold,
      color: Maroon,
    });
  }
  if (dateStr) {
    page.drawText(`DATE: ${dateStr}`, {
      x: width - 180,
      y: 724,
      size: 8,
      font: fontRegular,
      color: MediumGray,
    });
  }
}

function drawTitleBanner(page, fonts, { title, subtitle, formCode }) {
  const { fontRegular, fontBold } = fonts;
  const width = page.getWidth();

  page.drawRectangle({
    x: 40,
    y: 672,
    width: width - 80,
    height: 40,
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

  page.drawText(subtitle || `Official Academic Archive Document · Form ${formCode || "RMS"}`, {
    x: 52,
    y: 681,
    size: 7.5,
    font: fontRegular,
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
    page.drawText(String(item.value ?? "N/A"), {
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

function drawFooter(page, fonts, formCode) {
  const { fontOblique } = fonts;
  page.drawLine({
    start: { x: 40, y: 45 },
    end: { x: page.getWidth() - 40, y: 45 },
    thickness: 0.5,
    color: BorderGray,
  });
  page.drawText(
    `Form ${formCode || "RMS"} · Polytechnic University of the Philippines San Juan · Records Keeping System (RMS)`,
    {
      x: 40,
      y: 34,
      size: 7,
      font: fontOblique,
      color: MediumGray,
    }
  );
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

// ----------------------------------------------------------------------------
// 1. CAEPUP 2023 Application Form
// ----------------------------------------------------------------------------
async function generateCaepupForm({ studentNo, studentName, courseCode, dateStr }) {
  const { doc, fontRegular, fontBold, fontOblique } = await createBaseDoc();
  const page = doc.addPage([595.28, 841.89]);
  const fonts = { fontRegular, fontBold, fontOblique };

  drawInstitutionalHeader(page, fonts, {
    office: "Admissions & Registration Office",
    formCode: "CAEPUP-2023",
    refNo: `CAEPUP-${studentNo || "2023-00000"}`,
    dateStr: dateStr || "October 2023",
  });

  drawTitleBanner(page, fonts, {
    title: "College Admission Evaluation Program (CAEPUP) Application Form",
    subtitle: "Official Undergraduate Admission Entry Application · Academic Year 2023-2024",
    formCode: "CAEPUP-2023",
  });

  let y = 650;
  y = drawSectionHeading(page, fonts, y, "I. Applicant Identification & Personal Data");
  y = drawFieldGrid(page, fonts, y, [
    { label: "Full Name:", value: studentName || "DELA CRUZ, JUAN A.", bold: true },
    { label: "Assigned Student No:", value: studentNo || "2023-00001-SJ-0", bold: true },
    { label: "Learner Reference No (LRN):", value: "136489201552", bold: false },
    { label: "Date of Birth & Gender:", value: "September 15, 2004  •  Male", bold: false },
    { label: "Citizenship & Civil Status:", value: "Filipino  •  Single", bold: false },
    { label: "Permanent Address:", value: "San Juan City, Metro Manila, Philippines", bold: false },
    { label: "Contact Phone & Email:", value: "+63 917 123 4567  •  applicant@pup.local", bold: false },
  ]);

  y -= 8;
  y = drawSectionHeading(page, fonts, y, "II. Academic Background & High School Record");
  y = drawFieldGrid(page, fonts, y, [
    { label: "Senior High School:", value: "San Juan National High School", bold: false },
    { label: "Track & Strand:", value: "Academic Track — Information & Communications Tech (ICT)", bold: false },
    { label: "General Weighted Average (GWA):", value: "91.85 (Senior High School Completer)", bold: true },
    { label: "Year Graduated / Completed:", value: "July 2023", bold: false },
  ]);

  y -= 8;
  y = drawSectionHeading(page, fonts, y, "III. Program Choice & Admissions Evaluation");
  y = drawFieldGrid(page, fonts, y, [
    { label: "First Choice Program:", value: courseCode || "BSIT (Bachelor of Science in Information Technology)", bold: true },
    { label: "Campus Applied:", value: "San Juan City Campus", bold: false },
    { label: "CAEPUP Evaluation Rating:", value: "88.75% Percentile Composite Score", bold: true },
    { label: "Admissions Status:", value: "QUALIFIED AND ADMITTED FOR REGISTRATION", bold: true },
  ]);

  // Red Verification Stamp Box
  page.drawRectangle({
    x: 340,
    y: 130,
    width: 215,
    height: 55,
    borderColor: CrimsonStamp,
    borderWidth: 1.5,
    color: LightGray,
  });
  page.drawText("PUP ADMISSIONS OFFICE", { x: 355, y: 168, size: 8, font: fontBold, color: CrimsonStamp });
  page.drawText("VERIFIED & OFFICIALLY ADMITTED", { x: 355, y: 154, size: 8, font: fontBold, color: CrimsonStamp });
  page.drawText(`ID: ${studentNo || "2023-SJ"} • AY 2023-2024`, { x: 355, y: 140, size: 7, font: fontRegular, color: CrimsonStamp });

  // Signatures
  y = 120;
  drawSignatures(page, fonts, y, [
    { name: studentName || "DELA CRUZ, JUAN A.", title: "Applicant Signature" },
    { name: "PROF. ELIAS AUSTRIA", title: "Registrar / Admissions Evaluator" },
  ]);

  drawFooter(page, fonts, "CAEPUP-2023");
  return Buffer.from(await doc.save());
}

// ----------------------------------------------------------------------------
// 2. SAR Form (circled)
// ----------------------------------------------------------------------------
async function generateSarForm({ studentNo, studentName, courseCode, section, dateStr }) {
  const { doc, fontRegular, fontBold, fontOblique } = await createBaseDoc();
  const page = doc.addPage([595.28, 841.89]);
  const fonts = { fontRegular, fontBold, fontOblique };

  drawInstitutionalHeader(page, fonts, {
    office: "Office of the Campus Registrar",
    formCode: "SAR-01",
    refNo: `SAR-${studentNo || "2023-00000"}`,
    dateStr: dateStr || "First Semester AY 2023-2024",
  });

  drawTitleBanner(page, fonts, {
    title: "Student Admission Record (SAR)",
    subtitle: "Official Registration & Document Submission Record · Registrar Counter Copy",
    formCode: "PUP-SAR-01",
  });

  let y = 650;
  y = drawSectionHeading(page, fonts, y, "I. Student Matriculation Profile");
  y = drawFieldGrid(page, fonts, y, [
    { label: "Student Number:", value: studentNo || "2023-00001-SJ-0", bold: true },
    { label: "Student Name:", value: studentName || "DELA CRUZ, JUAN A.", bold: true },
    { label: "Degree Program:", value: courseCode || "BSIT", bold: true },
    { label: "Year Level & Section:", value: section ? `Year 1 · Section ${section}` : "Year 1 · Section 1-1", bold: false },
    { label: "Registration Classification:", value: "[ FRESHMAN ENROLLEE ]  •  Regular Student", bold: true },
    { label: "Archive Location:", value: "Archive Room 1  •  Drawer Filing", bold: false },
  ]);

  // RED CIRCLE around the Admission Classification
  page.drawEllipse({
    x: 245,
    y: 574,
    xScale: 75,
    yScale: 12,
    borderColor: CrimsonStamp,
    borderWidth: 1.5,
  });

  y -= 8;
  y = drawSectionHeading(page, fonts, y, "II. Document Submission Checklist (Circled Requirements)");
  const checkItems = [
    ["[ X ]", "CAEPUP 2023 Application Form with Admissions Rating", "Complete / On File"],
    ["[ X ]", "PSA Birth Certificate (Original on Security Paper)", "Complete / Circled"],
    ["[ X ]", "Senior High School Grade 12 Report Card (SF-9)", "Complete / Verified"],
    ["[ X ]", "Certificate of Good Moral Character", "Complete / On File"],
    ["[ X ]", "Health and Information Sheet (MDSS Form)", "Complete / Cleared"],
    ["[ X ]", "Undertaking and Waiver of Right", "Complete / Notarized"],
    ["[ X ]", "Photocopy of Valid Identification", "Complete / Verified"],
  ];

  for (const [mark, desc, status] of checkItems) {
    page.drawText(mark, { x: 50, y, size: 8, font: fontBold, color: ForestGreen });
    page.drawText(desc, { x: 80, y, size: 8, font: fontRegular, color: DarkSlate });
    page.drawText(status, { x: 420, y, size: 8, font: fontBold, color: Maroon });
    page.drawLine({ start: { x: 50, y: y - 4 }, end: { x: 545, y: y - 4 }, thickness: 0.5, color: BorderGray });
    y -= 18;
  }

  // Draw circle around the PSA Birth Certificate row check
  page.drawEllipse({
    x: 285,
    y: 494,
    xScale: 235,
    yScale: 9,
    borderColor: CrimsonStamp,
    borderWidth: 1.2,
  });

  y -= 15;
  y = drawSectionHeading(page, fonts, y, "III. Registrar Official Certification");
  const certLines = [
    "This confirms that the above-named student has complied with the primary documentary requirements",
    "for admission to the Polytechnic University of the Philippines San Juan Campus for the current academic year.",
    "Original credentials are acknowledged, verified, and placed in the student physical 201 filing archive.",
  ];
  for (const l of certLines) {
    page.drawText(l, { x: 50, y, size: 8, font: fontRegular, color: DarkSlate });
    y -= 14;
  }

  y = 120;
  drawSignatures(page, fonts, y, [
    { name: studentName || "DELA CRUZ, JUAN A.", title: "Student / Registrant Signature" },
    { name: "MARCUS REYES", title: "Registrar Receiving Officer" },
    { name: "ELIAS AUSTRIA", title: "Campus Registrar Head" },
  ]);

  drawFooter(page, fonts, "PUP-SAR-01");
  return Buffer.from(await doc.save());
}

// ----------------------------------------------------------------------------
// 3. Health and Information Sheet
// ----------------------------------------------------------------------------
async function generateHealthSheet({ studentNo, studentName, courseCode, dateStr }) {
  const { doc, fontRegular, fontBold, fontOblique } = await createBaseDoc();
  const page = doc.addPage([595.28, 841.89]);
  const fonts = { fontRegular, fontBold, fontOblique };

  drawInstitutionalHeader(page, fonts, {
    office: "Medical & Dental Services Section",
    formCode: "MDSS-HIS-2024",
    refNo: `MED-${studentNo || "2023-00000"}`,
    dateStr: dateStr || "AY 2023-2024",
  });

  drawTitleBanner(page, fonts, {
    title: "Student Health and Information Sheet",
    subtitle: "Official Medical Examination Record · PUP Medical & Dental Services",
    formCode: "MDSS-HIS-2024",
  });

  let y = 650;
  y = drawSectionHeading(page, fonts, y, "I. General Student Information");
  y = drawFieldGrid(page, fonts, y, [
    { label: "Student Name:", value: studentName || "DELA CRUZ, JUAN A.", bold: true },
    { label: "Student Number:", value: studentNo || "2023-00001-SJ-0", bold: true },
    { label: "Degree Program:", value: courseCode || "BSIT", bold: false },
    { label: "Emergency Contact Person:", value: "Luzviminda Dela Cruz (Mother)  •  +63 918 555 1234", bold: false },
  ]);

  y -= 8;
  y = drawSectionHeading(page, fonts, y, "II. Vital Statistics & Physical Examination");
  y = drawFieldGrid(page, fonts, y, [
    { label: "Blood Type:", value: "Type O+ (Rh Positive)", bold: true },
    { label: "Height & Weight:", value: "172 cm  •  65 kg  •  BMI: 22.0 (Normal Range)", bold: false },
    { label: "Blood Pressure & Pulse:", value: "118/76 mmHg  •  74 bpm (Normal / Regular)", bold: false },
    { label: "Visual Acuity:", value: "OD: 20/20  •  OS: 20/20  (Uncorrected)", bold: false },
    { label: "Known Allergies:", value: "None reported / No known drug or food allergies", bold: false },
    { label: "Chronic Conditions / Illnesses:", value: "None reported / Cleared for physical activity", bold: false },
  ]);

  y -= 8;
  y = drawSectionHeading(page, fonts, y, "III. Diagnostic Laboratory Results & Immunization");
  y = drawFieldGrid(page, fonts, y, [
    { label: "Chest X-Ray Findings:", value: "NORMAL CHEST — No active parenchymal or pleural lesions", bold: true },
    { label: "Complete Blood Count (CBC):", value: "Within normal limits (WNL)", bold: false },
    { label: "Urinalysis & Fecalysis:", value: "Negative for abnormalities", bold: false },
    { label: "Hepatitis B & Tetanus Toxoid:", value: "Immunized / Complete immunization doses", bold: false },
    { label: "Medical Clearance Status:", value: "PHYSICALLY FIT FOR ENROLLMENT AND CAMPUS ACTIVITIES", bold: true },
  ]);

  // Medical Stamp Box
  page.drawRectangle({
    x: 340,
    y: 125,
    width: 215,
    height: 50,
    borderColor: DarkBlue,
    borderWidth: 1.5,
    color: LightGray,
  });
  page.drawText("PUP MEDICAL SERVICES", { x: 355, y: 158, size: 8, font: fontBold, color: DarkBlue });
  page.drawText("PHYSICALLY FIT — CLEARED", { x: 355, y: 145, size: 8, font: fontBold, color: ForestGreen });
  page.drawText("Lic. No. 0087412 · University Physician", { x: 355, y: 133, size: 7, font: fontRegular, color: DarkBlue });

  y = 115;
  drawSignatures(page, fonts, y, [
    { name: studentName || "DELA CRUZ, JUAN A.", title: "Student Declaration Signature" },
    { name: "DR. ROSA VALDEZ, MD", title: "University Medical Officer" },
  ]);

  drawFooter(page, fonts, "MDSS-HIS-2024");
  return Buffer.from(await doc.save());
}

// ----------------------------------------------------------------------------
// 4. Undertaking and Waiver of Right
// ----------------------------------------------------------------------------
async function generateUndertakingPdf({ studentNo, studentName, courseCode, dateStr }) {
  const { doc, fontRegular, fontBold, fontOblique } = await createBaseDoc();
  const page = doc.addPage([595.28, 841.89]);
  const fonts = { fontRegular, fontBold, fontOblique };

  drawInstitutionalHeader(page, fonts, {
    office: "Office of the University Registrar",
    formCode: "OUR-UWR-2023",
    refNo: `UWR-${studentNo || "2023-00000"}`,
    dateStr: dateStr || "Academic Year 2023-2024",
  });

  drawTitleBanner(page, fonts, {
    title: "Deed of Undertaking and Waiver of Right",
    subtitle: "Conditional Admission & Document Submission Commitment · Legal Document",
    formCode: "PUP-UWR-2023",
  });

  let y = 645;
  y = drawSectionHeading(page, fonts, y, "I. Student & Admission Details");
  y = drawFieldGrid(page, fonts, y, [
    { label: "Student Name:", value: studentName || "DELA CRUZ, JUAN A.", bold: true },
    { label: "Student Number:", value: studentNo || "2023-00001-SJ-0", bold: true },
    { label: "Degree Program:", value: courseCode || "BSIT", bold: false },
    { label: "Campus:", value: "PUP San Juan Campus", bold: false },
  ]);

  y -= 8;
  y = drawSectionHeading(page, fonts, y, "II. Legal Undertaking & Stipulations");
  const paragraphs = [
    `I, ${studentName || "the undersigned"}, of legal age, Filipino, and bona fide applicant of Polytechnic`,
    "University of the Philippines San Juan Campus, hereby solemnly depose, undertake, and stipulate that:",
    "",
    "1. I am conditionally admitted to PUP San Juan pending complete submission of all authentic documents",
    "   specified under the University Academic Admissions Charter.",
    "",
    "2. I bind myself to submit all lacking original documents (including Form 137/SF10, Honorable Dismissal,",
    "   and PSA Birth Certificate on Security Paper) within the period specified by the Office of the Registrar.",
    "",
    "3. In the event that any credential submitted is discovered to be fraudulent, spurious, or irregular,",
    "   I hereby expressly WAIVE my right to matriculation and accept full forfeiture of all subjects enrolled",
    "   and units earned, without prejudice to administrative or legal sanctions pursuant to the Student Handbook.",
    "",
    "4. I voluntarily execute this Undertaking with full knowledge and comprehension of its legal consequences.",
  ];

  for (const p of paragraphs) {
    if (!p) {
      y -= 6;
      continue;
    }
    const isBold = p.startsWith("1.") || p.startsWith("2.") || p.startsWith("3.") || p.startsWith("4.");
    page.drawText(p, {
      x: 50,
      y,
      size: 7.8,
      font: isBold ? fontBold : fontRegular,
      color: DarkSlate,
    });
    y -= 13;
  }

  // Notary Public Acknowledgment Box
  y -= 10;
  page.drawRectangle({
    x: 40,
    y: y - 55,
    width: 515,
    height: 55,
    borderColor: BorderGray,
    borderWidth: 1,
    color: LightGray,
  });
  page.drawText("JURAT / NOTARIAL ACKNOWLEDGMENT", { x: 50, y: y - 14, size: 7.5, font: fontBold, color: Maroon });
  page.drawText("Subscribed and sworn to before me this day in San Juan City, Metro Manila, Philippines.", { x: 50, y: y - 26, size: 7, font: fontRegular, color: DarkSlate });
  page.drawText("Doc. No. 412 · Page No. 85 · Book No. XXIV · Series of 2023 · Notary Public of San Juan City", { x: 50, y: y - 38, size: 7, font: fontOblique, color: MediumGray });

  y -= 85;
  drawSignatures(page, fonts, y, [
    { name: studentName || "DELA CRUZ, JUAN A.", title: "Affiant / Student Signature" },
    { name: "PARENT / GUARDIAN", title: "Conforme Signature" },
    { name: "ATTY. CESAR VILLANUEVA", title: "Notary Public" },
  ]);

  drawFooter(page, fonts, "PUP-UWR-2023");
  return Buffer.from(await doc.save());
}

// ----------------------------------------------------------------------------
// 5. Report Cards (Grade 10, Grade 11, Grade 12)
// ----------------------------------------------------------------------------
async function generateReportCardPdf({ docType, studentNo, studentName, courseCode, dateStr }) {
  const { doc, fontRegular, fontBold, fontOblique } = await createBaseDoc();
  const page = doc.addPage([595.28, 841.89]);
  const fonts = { fontRegular, fontBold, fontOblique };

  const isG10 = (docType || "").includes("10");
  const isG11 = (docType || "").includes("11");
  const gradeLevel = isG10 ? "Grade 10 (Junior High School)" : isG11 ? "Grade 11 (Senior High School)" : "Grade 12 (Senior High School)";
  const formCode = isG10 ? "DEPED-SF9-JHS" : "DEPED-SF9-SHS";

  drawInstitutionalHeader(page, fonts, {
    office: "Department of Education  •  Secondary Student Progress Report",
    formCode,
    refNo: `SF9-${studentNo || "2023-00000"}`,
    dateStr: dateStr || "School Year 2022-2023",
  });

  drawTitleBanner(page, fonts, {
    title: docType || "Senior High School Student Progress Report (SF-9)",
    subtitle: `Official Academic Transcript & Progress Rating · ${gradeLevel}`,
    formCode,
  });

  let y = 650;
  y = drawSectionHeading(page, fonts, y, "I. Learner Profile & School Data");
  y = drawFieldGrid(page, fonts, y, [
    { label: "Learner Name:", value: studentName || "DELA CRUZ, JUAN A.", bold: true },
    { label: "Student Number / LRN:", value: `${studentNo || "2023-00001-SJ-0"}  •  LRN: 136489201552`, bold: true },
    { label: "School Name & ID:", value: "San Juan National High School  •  School ID: 300482", bold: false },
    { label: "Grade Level & Track:", value: `${gradeLevel}  •  Academic ICT Track`, bold: false },
  ]);

  y -= 8;
  y = drawSectionHeading(page, fonts, y, "II. Learning Areas & Periodic Ratings (Grades)");

  // Grades Table Header
  page.drawRectangle({ x: 40, y: y - 16, width: 515, height: 16, color: Maroon });
  page.drawText("LEARNING AREA / SUBJECT", { x: 50, y: y - 12, size: 7.5, font: fontBold, color: rgb(1, 1, 1) });
  page.drawText("Q1", { x: 300, y: y - 12, size: 7.5, font: fontBold, color: rgb(1, 1, 1) });
  page.drawText("Q2", { x: 340, y: y - 12, size: 7.5, font: fontBold, color: rgb(1, 1, 1) });
  page.drawText("Q3", { x: 380, y: y - 12, size: 7.5, font: fontBold, color: rgb(1, 1, 1) });
  page.drawText("Q4", { x: 420, y: y - 12, size: 7.5, font: fontBold, color: rgb(1, 1, 1) });
  page.drawText("FINAL", { x: 460, y: y - 12, size: 7.5, font: fontBold, color: rgb(1, 1, 1) });
  page.drawText("REMARKS", { x: 505, y: y - 12, size: 7.5, font: fontBold, color: rgb(1, 1, 1) });

  y -= 22;

  const subjects = isG10
    ? [
        ["Filipino 10", "91", "90", "92", "93", "91.5", "PASSED"],
        ["English 10", "92", "93", "91", "94", "92.5", "PASSED"],
        ["Mathematics 10", "88", "89", "90", "91", "89.5", "PASSED"],
        ["Science 10", "90", "91", "89", "92", "90.5", "PASSED"],
        ["Araling Panlipunan 10", "93", "92", "94", "95", "93.5", "PASSED"],
        ["Edukasyon sa Pagpapakatao 10", "94", "95", "93", "96", "94.5", "PASSED"],
        ["Technology & Livelihood Educ (TLE)", "93", "94", "92", "95", "93.5", "PASSED"],
        ["MAPEH (Music, Arts, PE, Health)", "92", "91", "93", "94", "92.5", "PASSED"],
      ]
    : [
        ["Oral Communication in Context", "93", "94", "92", "95", "93.5", "PASSED"],
        ["Komunikasyon at Pananaliksik", "90", "91", "92", "93", "91.5", "PASSED"],
        ["General Mathematics", "91", "90", "92", "93", "91.5", "PASSED"],
        ["Earth and Life Science", "89", "91", "90", "92", "90.5", "PASSED"],
        ["21st Century Literature from PH & World", "94", "93", "95", "96", "94.5", "PASSED"],
        ["Empowerment Technologies (ICT)", "96", "95", "97", "98", "96.5", "PASSED"],
        ["Practical Research 2", "93", "94", "95", "96", "94.5", "PASSED"],
        ["Physical Education & Health", "95", "96", "94", "97", "95.5", "PASSED"],
      ];

  for (let idx = 0; idx < subjects.length; idx++) {
    const s = subjects[idx];
    const rowBg = idx % 2 === 0 ? LightGray : rgb(1, 1, 1);
    page.drawRectangle({ x: 40, y: y - 13, width: 515, height: 15, color: rowBg });

    page.drawText(s[0], { x: 50, y: y - 10, size: 7.5, font: fontRegular, color: DarkSlate });
    page.drawText(s[1], { x: 300, y: y - 10, size: 7.5, font: fontRegular, color: DarkSlate });
    page.drawText(s[2], { x: 340, y: y - 10, size: 7.5, font: fontRegular, color: DarkSlate });
    page.drawText(s[3], { x: 380, y: y - 10, size: 7.5, font: fontRegular, color: DarkSlate });
    page.drawText(s[4], { x: 420, y: y - 10, size: 7.5, font: fontRegular, color: DarkSlate });
    page.drawText(s[5], { x: 460, y: y - 10, size: 7.5, font: fontBold, color: Maroon });
    page.drawText(s[6], { x: 505, y: y - 10, size: 7, font: fontBold, color: ForestGreen });
    y -= 16;
  }

  // Summary Row
  y -= 4;
  page.drawRectangle({ x: 40, y: y - 16, width: 515, height: 18, color: BorderGray });
  page.drawText("GENERAL WEIGHTED AVERAGE (GWA):", { x: 50, y: y - 12, size: 8, font: fontBold, color: DarkSlate });
  page.drawText("92.85", { x: 460, y: y - 12, size: 8.5, font: fontBold, color: Maroon });
  page.drawText("PASSED WITH HONORS", { x: 505, y: y - 12, size: 7, font: fontBold, color: ForestGreen });

  // Certified True Copy Rubber Stamp in RED
  page.drawRectangle({
    x: 40,
    y: 110,
    width: 230,
    height: 52,
    borderColor: CrimsonStamp,
    borderWidth: 1.5,
    color: LightGray,
  });
  page.drawText("CERTIFIED TRUE COPY OF ORIGINAL", { x: 50, y: 145, size: 7.5, font: fontBold, color: CrimsonStamp });
  page.drawText("Verified against Official Student File on Record", { x: 50, y: 133, size: 6.5, font: fontRegular, color: CrimsonStamp });
  page.drawText("POLYTECHNIC UNIVERSITY OF THE PHILIPPINES", { x: 50, y: 121, size: 6.5, font: fontBold, color: CrimsonStamp });

  y = 110;
  drawSignatures(page, fonts, y, [
    { name: "REGINA C. MENDOZA", title: "Class Adviser" },
    { name: "DR. ARNALDO SANTOS", title: "School Principal" },
  ]);

  drawFooter(page, fonts, formCode);
  return Buffer.from(await doc.save());
}

// ----------------------------------------------------------------------------
// 6. SHS Diploma or Certificate of Graduation
// ----------------------------------------------------------------------------
async function generateDiplomaPdf({ studentNo, studentName, courseCode, dateStr }) {
  const { doc, fontRegular, fontBold, fontOblique } = await createBaseDoc();
  const page = doc.addPage([792, 612]); // Landscape
  const fonts = { fontRegular, fontBold, fontOblique };

  const width = page.getWidth();
  const height = page.getHeight();

  // Ornamental Double Border
  page.drawRectangle({
    x: 25,
    y: 25,
    width: width - 50,
    height: height - 50,
    borderColor: Maroon,
    borderWidth: 3,
  });
  page.drawRectangle({
    x: 32,
    y: 32,
    width: width - 64,
    height: height - 64,
    borderColor: GoldSeal,
    borderWidth: 1,
  });

  // Header
  page.drawText("REPUBLIKA NG PILIPINAS  •  KAGAWARAN NG EDUKASYON", {
    x: width / 2 - 170,
    y: height - 65,
    size: 10,
    font: fontBold,
    color: Maroon,
  });
  page.drawText("REHIYON NCR  •  SANGAY NG MGA PAARALANG LUNGSOD NG SAN JUAN", {
    x: width / 2 - 190,
    y: height - 80,
    size: 8.5,
    font: fontRegular,
    color: DarkSlate,
  });
  page.drawText("SAN JUAN NATIONAL HIGH SCHOOL", {
    x: width / 2 - 130,
    y: height - 105,
    size: 14,
    font: fontBold,
    color: DarkSlate,
  });

  // Certificate Heading
  page.drawText("KATIBAYAN NG PAGTATAPOS", {
    x: width / 2 - 145,
    y: height - 150,
    size: 20,
    font: fontBold,
    color: Maroon,
  });

  page.drawText("Pinatutunayan nito na si", {
    x: width / 2 - 60,
    y: height - 180,
    size: 10,
    font: fontOblique,
    color: MediumGray,
  });

  // Student Name
  const sName = (studentName || "JUAN A. DELA CRUZ").toUpperCase();
  page.drawText(sName, {
    x: width / 2 - (sName.length * 5),
    y: height - 215,
    size: 18,
    font: fontBold,
    color: DarkSlate,
  });
  page.drawLine({
    start: { x: width / 2 - 180, y: height - 222 },
    end: { x: width / 2 + 180, y: height - 222 },
    thickness: 1,
    color: Maroon,
  });

  const bodyText = [
    "ay kasiya-siyang nakatupad sa mga kinakailangan sa pagtatapos ng Kurikulum ng Senior High School",
    "sa Academic Track — Information and Communications Technology (ICT) Strand na itinakda ng",
    "Kagawaran ng Edukasyon, kaya nararapat siyang tumanggap nitong Katibayan ng Pagtatapos.",
  ];
  let textY = height - 250;
  for (const bt of bodyText) {
    page.drawText(bt, {
      x: width / 2 - 250,
      y: textY,
      size: 9.5,
      font: fontRegular,
      color: DarkSlate,
    });
    textY -= 17;
  }

  page.drawText("Nilagdaan sa Lungsod ng San Juan, Kalakhang Maynila, Pilipinas nitong ika-14 ng Hulyo, 2023.", {
    x: width / 2 - 210,
    y: textY - 15,
    size: 8.5,
    font: fontOblique,
    color: MediumGray,
  });

  // Gold Seal Graphic
  page.drawCircle({
    x: 105,
    y: 110,
    size: 32,
    color: LightGray,
    borderColor: GoldSeal,
    borderWidth: 2,
  });
  page.drawText("OFFICIAL", { x: 88, y: 116, size: 7, font: fontBold, color: GoldSeal });
  page.drawText("SEAL", { x: 96, y: 104, size: 7, font: fontBold, color: GoldSeal });

  // Signatures
  const sigY = 90;
  page.drawLine({ start: { x: 260, y: sigY }, end: { x: 440, y: sigY }, thickness: 1, color: DarkSlate });
  page.drawText("DR. ARNALDO SANTOS", { x: 300, y: sigY - 12, size: 8.5, font: fontBold, color: DarkSlate });
  page.drawText("Punongguro / School Principal", { x: 290, y: sigY - 22, size: 7.5, font: fontRegular, color: MediumGray });

  page.drawLine({ start: { x: 520, y: sigY }, end: { x: 700, y: sigY }, thickness: 1, color: DarkSlate });
  page.drawText("DR. MARGARITA R. CORDOVA", { x: 540, y: sigY - 12, size: 8.5, font: fontBold, color: DarkSlate });
  page.drawText("Tagapamanihala ng mga Paaralan / Division Supt.", { x: 522, y: sigY - 22, size: 7.5, font: fontRegular, color: MediumGray });

  return Buffer.from(await doc.save());
}

// ----------------------------------------------------------------------------
// 7. Certificate of Good Moral Character
// ----------------------------------------------------------------------------
async function generateGoodMoralPdf({ studentNo, studentName, dateStr }) {
  const { doc, fontRegular, fontBold, fontOblique } = await createBaseDoc();
  const page = doc.addPage([595.28, 841.89]);
  const fonts = { fontRegular, fontBold, fontOblique };

  drawInstitutionalHeader(page, fonts, {
    office: "Office of the Guidance Counselor & Student Discipline",
    formCode: "CGMC-2023",
    refNo: `GMC-${studentNo || "2023-00000"}`,
    dateStr: dateStr || "Academic Year 2023-2024",
  });

  drawTitleBanner(page, fonts, {
    title: "Certificate of Good Moral Character",
    subtitle: "Official Institutional Clearance & Behavioral Certification",
    formCode: "CGMC-2023",
  });

  let y = 635;
  page.drawText("TO WHOM IT MAY CONCERN:", { x: 50, y, size: 10, font: fontBold, color: Maroon });
  y -= 25;

  const textBlocks = [
    `This is to certify that ${studentName || "DELA CRUZ, JUAN A."}, bearing Student Number ${studentNo || "2023-00001-SJ-0"},`,
    "is a graduate of good standing and high integrity from San Juan National High School.",
    "",
    "During his/her tenure of academic enrollment, he/she consistently exhibited exemplary character,",
    "civic responsibility, adherence to institutional codes of conduct, and respect toward school authorities.",
    "",
    "Records from the Office of Student Discipline and Prefect of Guidance confirm that he/she has NO",
    "derogatory records, pending disciplinary infractions, behavioral sanctions, or violations of university",
    "regulations on file.",
    "",
    "This certification is issued upon the request of the interested party for the purpose of his/her",
    "formal admission to the Polytechnic University of the Philippines (PUP) San Juan Campus.",
  ];

  for (const tb of textBlocks) {
    if (!tb) {
      y -= 8;
      continue;
    }
    const isBold = tb.includes("NO derogatory records");
    page.drawText(tb, {
      x: 50,
      y,
      size: 9,
      font: isBold ? fontBold : fontRegular,
      color: isBold ? Maroon : DarkSlate,
    });
    y -= 16;
  }

  // Official Gold Seal Box
  y -= 25;
  page.drawCircle({
    x: 90,
    y: y - 20,
    size: 26,
    color: LightGray,
    borderColor: GoldSeal,
    borderWidth: 2,
  });
  page.drawText("OFFICIAL", { x: 74, y: y - 16, size: 6.5, font: fontBold, color: GoldSeal });
  page.drawText("SEAL", { x: 80, y: y - 26, size: 6.5, font: fontBold, color: GoldSeal });

  page.drawText("Verified against Student Prefect Record Books", { x: 130, y: y - 16, size: 8, font: fontRegular, color: DarkSlate });
  page.drawText("Valid for Academic Year 2023-2024 Matriculation", { x: 130, y: y - 28, size: 7.5, font: fontOblique, color: MediumGray });

  y -= 80;
  drawSignatures(page, fonts, y, [
    { name: "MA. TERESA CONCEPCION, RGC", title: "Registered Guidance Counselor" },
    { name: "PROF. RICARDO DIZON", title: "Prefect of Student Discipline" },
  ]);

  drawFooter(page, fonts, "CGMC-2023");
  return Buffer.from(await doc.save());
}

// ----------------------------------------------------------------------------
// 8. PSA Birth Certificate (circled)
// ----------------------------------------------------------------------------
async function generatePsaBirthCertPdf({ studentNo, studentName, dateStr }) {
  const { doc, fontRegular, fontBold, fontOblique } = await createBaseDoc();
  const page = doc.addPage([595.28, 841.89]);
  const fonts = { fontRegular, fontBold, fontOblique };

  const width = page.getWidth();

  // Top PSA Security Barcode Banner
  page.drawRectangle({ x: 40, y: 760, width: width - 80, height: 18, color: BorderGray });
  page.drawText("|||| | |||||| |||||||| |||| ||||| |||||||||| |||| | |||||||||||||| |||", {
    x: 50,
    y: 765,
    size: 9,
    font: fontBold,
    color: DarkSlate,
  });
  page.drawText(`PSA SECPA REG: 2004-${studentNo ? studentNo.replace(/[^0-9]/g, "").slice(0, 8) : "10984521"}`, {
    x: 350,
    y: 765,
    size: 7.5,
    font: fontBold,
    color: Maroon,
  });

  // Republic Header
  page.drawText("REPUBLIC OF THE PHILIPPINES  •  PHILIPPINE STATISTICS AUTHORITY", {
    x: 40,
    y: 742,
    size: 10,
    font: fontBold,
    color: DarkSlate,
  });
  page.drawText("OFFICE OF THE CIVIL REGISTRAR GENERAL  •  CERTIFICATE OF LIVE BIRTH", {
    x: 40,
    y: 730,
    size: 8,
    font: fontRegular,
    color: MediumGray,
  });

  drawTitleBanner(page, fonts, {
    title: "Certificate of Live Birth (Municipal Form No. 102)",
    subtitle: "Official Philippine Statistics Authority (PSA) Certified Copy on Security Paper",
    formCode: "PSA-COLB-102",
  });

  let y = 650;
  y = drawSectionHeading(page, fonts, y, "I. Child / Registrant Information");
  y = drawFieldGrid(page, fonts, y, [
    { label: "1. Full Name of Child:", value: studentName || "DELA CRUZ, JUAN ARANETA", bold: true },
    { label: "2. Sex & Date of Birth:", value: "MALE  •  15 September 2004", bold: true },
    { label: "3. Place of Birth:", value: "San Juan City Medical Center, San Juan City, Metro Manila", bold: false },
    { label: "4. Type of Birth & Birth Order:", value: "Single  •  First (1st) Born Child", bold: false },
  ]);

  // RED CIRCLE around Child Name & Birth Date
  page.drawEllipse({
    x: 275,
    y: 642,
    xScale: 110,
    yScale: 12,
    borderColor: CrimsonStamp,
    borderWidth: 1.8,
  });

  y -= 8;
  y = drawSectionHeading(page, fonts, y, "II. Parents Information");
  y = drawFieldGrid(page, fonts, y, [
    { label: "5. Mother's Maiden Name:", value: "LUZVIMINDA SANTOS ARANETA", bold: false },
    { label: "6. Mother's Citizenship & Religion:", value: "Filipino  •  Roman Catholic", bold: false },
    { label: "7. Father's Full Name:", value: "ROBERTO MENDOZA DELA CRUZ", bold: false },
    { label: "8. Father's Citizenship & Religion:", value: "Filipino  •  Roman Catholic", bold: false },
    { label: "9. Date & Place of Marriage:", value: "June 18, 2002  •  San Juan City, Metro Manila", bold: false },
  ]);

  y -= 8;
  y = drawSectionHeading(page, fonts, y, "III. Registry Certification & Verification Details");
  y = drawFieldGrid(page, fonts, y, [
    { label: "Local Civil Registry No:", value: "2004-SJ-04819", bold: true },
    { label: "Date of Registration:", value: "22 September 2004", bold: false },
    { label: "PSA Document Tracking No:", value: "03429-204-001928-8", bold: true },
    { label: "Registrar Verification:", value: "AUTHENTICITY VERIFIED VIA PSA SECPA DATABASE", bold: true },
  ]);

  // Circled Local Civil Registry No
  page.drawEllipse({
    x: 235,
    y: 384,
    xScale: 65,
    yScale: 11,
    borderColor: CrimsonStamp,
    borderWidth: 1.5,
  });

  // PSA Watermark / Official Seal Box
  page.drawRectangle({
    x: 40,
    y: 115,
    width: 250,
    height: 50,
    borderColor: CrimsonStamp,
    borderWidth: 1.5,
    color: LightGray,
  });
  page.drawText("PHILIPPINE STATISTICS AUTHORITY", { x: 50, y: 148, size: 7.5, font: fontBold, color: CrimsonStamp });
  page.drawText("CERTIFIED COPY ISSUED ON SECURITY PAPER", { x: 50, y: 136, size: 7, font: fontRegular, color: CrimsonStamp });
  page.drawText("VERIFIED BY PUP REGISTRAR RECORDS ARCHIVE", { x: 50, y: 124, size: 6.5, font: fontBold, color: Maroon });

  y = 110;
  drawSignatures(page, fonts, y, [
    { name: "CLAIRE DENISE TOLENTINO", title: "City Civil Registrar Officer" },
    { name: "DENNIS S. MAPA, Ph.D.", title: "National Statistician and Civil Registrar General" },
  ]);

  drawFooter(page, fonts, "PSA-COLB-102");
  return Buffer.from(await doc.save());
}

// ----------------------------------------------------------------------------
// 9. Photocopy of ID
// ----------------------------------------------------------------------------
async function generateIdPhotocopyPdf({ studentNo, studentName, courseCode, dateStr }) {
  const { doc, fontRegular, fontBold, fontOblique } = await createBaseDoc();
  const page = doc.addPage([595.28, 841.89]);
  const fonts = { fontRegular, fontBold, fontOblique };

  drawInstitutionalHeader(page, fonts, {
    office: "Office of the Campus Registrar",
    formCode: "ID-VERIF",
    refNo: `ID-${studentNo || "2023-00000"}`,
    dateStr: dateStr || "Academic Year 2023-2024",
  });

  drawTitleBanner(page, fonts, {
    title: "Photocopy of Valid Identification Card",
    subtitle: "Official Identity Verification & Primary Credential Record",
    formCode: "PUP-ID-VERIF",
  });

  let y = 650;
  y = drawSectionHeading(page, fonts, y, "I. Cardholder Details");
  y = drawFieldGrid(page, fonts, y, [
    { label: "Student Full Name:", value: studentName || "DELA CRUZ, JUAN A.", bold: true },
    { label: "Student Number:", value: studentNo || "2023-00001-SJ-0", bold: true },
    { label: "Degree Program:", value: courseCode || "BSIT", bold: false },
    { label: "Identity Card Type:", value: "PhilSys National ID  /  Senior High School Institutional ID", bold: true },
  ]);

  y -= 15;
  y = drawSectionHeading(page, fonts, y, "II. Card Photocopy Facsimile (Front & Back)");

  // Front of Card Box
  page.drawRectangle({
    x: 70,
    y: y - 110,
    width: 215,
    height: 110,
    borderColor: DarkSlate,
    borderWidth: 1.5,
    color: LightGray,
  });
  page.drawText("REPUBLIC OF THE PHILIPPINES", { x: 80, y: y - 18, size: 7, font: fontBold, color: DarkSlate });
  page.drawText("PHILIPPINE IDENTIFICATION CARD", { x: 80, y: y - 28, size: 6.5, font: fontRegular, color: MediumGray });
  // Photo Placeholder Box
  page.drawRectangle({ x: 80, y: y - 85, width: 45, height: 48, borderColor: BorderGray, borderWidth: 1, color: rgb(0.9, 0.92, 0.95) });
  page.drawText("PHOTO", { x: 88, y: y - 62, size: 7, font: fontBold, color: MediumGray });
  // Card Text
  page.drawText(studentName || "DELA CRUZ, JUAN A.", { x: 135, y: y - 48, size: 7.5, font: fontBold, color: DarkSlate });
  page.drawText(`CRN: 4120-0089-${studentNo ? studentNo.slice(0, 4) : "2023"}`, { x: 135, y: y - 60, size: 7, font: fontRegular, color: DarkSlate });
  page.drawText("San Juan City, Metro Manila", { x: 135, y: y - 72, size: 6.5, font: fontRegular, color: MediumGray });
  page.drawText("[ FRONT VIEW ]", { x: 145, y: y - 100, size: 7, font: fontBold, color: Maroon });

  // Back of Card Box
  page.drawRectangle({
    x: 310,
    y: y - 110,
    width: 215,
    height: 110,
    borderColor: DarkSlate,
    borderWidth: 1.5,
    color: LightGray,
  });
  page.drawText("PHILIPPINE STATISTICS AUTHORITY", { x: 320, y: y - 18, size: 7, font: fontBold, color: DarkSlate });
  page.drawText("QR Code & Biometrics Verification", { x: 320, y: y - 28, size: 6.5, font: fontRegular, color: MediumGray });
  // QR Box
  page.drawRectangle({ x: 320, y: y - 85, width: 45, height: 48, borderColor: BorderGray, borderWidth: 1, color: rgb(0.9, 0.92, 0.95) });
  page.drawText("QR CODE", { x: 324, y: y - 62, size: 6, font: fontBold, color: MediumGray });
  // Card Back Text
  page.drawText("Date of Birth: 15 Sept 2004", { x: 375, y: y - 48, size: 6.5, font: fontRegular, color: DarkSlate });
  page.drawText("Blood Type: O+", { x: 375, y: y - 60, size: 6.5, font: fontRegular, color: DarkSlate });
  page.drawText("Emergency: +63 918 555 1234", { x: 375, y: y - 72, size: 6.5, font: fontRegular, color: DarkSlate });
  page.drawText("[ REVERSE VIEW ]", { x: 385, y: y - 100, size: 7, font: fontBold, color: Maroon });

  y -= 135;
  y = drawSectionHeading(page, fonts, y, "III. Evaluator Certification Statement");
  const certP = [
    "I hereby certify that I have personally inspected the original government/school-issued identification card",
    "presented by the applicant, and this photocopy is a true, faithful, and legible reproduction thereof.",
  ];
  for (const cp of certP) {
    page.drawText(cp, { x: 50, y, size: 8, font: fontRegular, color: DarkSlate });
    y -= 14;
  }

  y = 110;
  drawSignatures(page, fonts, y, [
    { name: studentName || "DELA CRUZ, JUAN A.", title: "Cardholder Signature" },
    { name: "MARCUS REYES", title: "Registrar Receiving Officer" },
  ]);

  drawFooter(page, fonts, "PUP-ID-VERIF");
  return Buffer.from(await doc.save());
}

// ----------------------------------------------------------------------------
// 10. Organization Registration Certificate (OSAS)
// ----------------------------------------------------------------------------
async function generateOrgCertPdf({ orgName, dateStr }) {
  const { doc, fontRegular, fontBold, fontOblique } = await createBaseDoc();
  const page = doc.addPage([595.28, 841.89]);
  const fonts = { fontRegular, fontBold, fontOblique };

  drawInstitutionalHeader(page, fonts, {
    office: "Office of Student Affairs and Services",
    formCode: "OSAS-ORC-2026",
    refNo: "OSAS-CERT-2026-018",
    dateStr: dateStr || "Academic Year 2026-2027",
  });

  drawTitleBanner(page, fonts, {
    title: "Certificate of Organization Recognition & Accreditation",
    subtitle: "Official Student Organization Charter · Office of Student Affairs and Services",
    formCode: "OSAS-ORC-2026",
  });

  let y = 630;
  page.drawText("THIS IS TO CERTIFY THAT", { x: 50, y, size: 10, font: fontBold, color: Maroon });
  y -= 25;

  const oName = (orgName || "JUNIOR FINANCIAL EXECUTIVES (JFINEX)").toUpperCase();
  page.drawText(oName, { x: 50, y, size: 14, font: fontBold, color: DarkSlate });
  y -= 20;

  const body = [
    "has fully satisfied the institutional requirements, submitted a ratified Constitution and By-Laws,",
    "and demonstrated active faculty mentorship for official accreditation as a recognized Student Organization",
    "at the Polytechnic University of the Philippines San Juan Campus for Academic Year 2026-2027.",
    "",
    "By virtue of this recognition, the organization is entitled to university privileges including venue booking,",
    "student activity proposal filing, official bulletin privileges, and campus leadership representation.",
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
  y = drawSectionHeading(page, fonts, y, "Organization Governance & Archival Record");
  y = drawFieldGrid(page, fonts, y, [
    { label: "Organization Name:", value: oName, bold: true },
    { label: "Accreditation Status:", value: "ACTIVE & FULLY RECOGNIZED", bold: true },
    { label: "Validity Period:", value: "1 August 2026 to 31 July 2027", bold: false },
    { label: "OSAS Archive Room:", value: "Archive Room 1  •  Cabinet: ORGANIZATIONS", bold: false },
  ]);

  y = 120;
  drawSignatures(page, fonts, y, [
    { name: "DR. SANDRA GOMEZ", title: "Director, OSAS" },
    { name: "DR. MILTON FRIEDMAN", title: "Faculty Adviser" },
    { name: "DR. JAIME M. GUTIERREZ", title: "Campus Director" },
  ]);

  drawFooter(page, fonts, "OSAS-ORC-2026");
  return Buffer.from(await doc.save());
}

// ----------------------------------------------------------------------------
// 11. Generic / Fallback Official Document Generator
// ----------------------------------------------------------------------------
async function generateGenericDocumentPdf({ docType, studentNo, studentName, courseCode, dateStr }) {
  const { doc, fontRegular, fontBold, fontOblique } = await createBaseDoc();
  const page = doc.addPage([595.28, 841.89]);
  const fonts = { fontRegular, fontBold, fontOblique };

  drawInstitutionalHeader(page, fonts, {
    office: "Office of the Campus Registrar",
    formCode: "PUP-RMS-DOC",
    refNo: `DOC-${studentNo || "2023-00000"}`,
    dateStr: dateStr || "Academic Year 2023-2024",
  });

  drawTitleBanner(page, fonts, {
    title: docType || "Official Academic Archive Record",
    subtitle: "Certified Academic Repository Document · PUP San Juan Records Keeping System",
    formCode: "PUP-RMS-DOC",
  });

  let y = 650;
  y = drawSectionHeading(page, fonts, y, "I. Record Metadata & Entity Identification");
  y = drawFieldGrid(page, fonts, y, [
    { label: "Document Classification:", value: docType || "Official Academic Credential", bold: true },
    { label: "Student / Subject Name:", value: studentName || "DELA CRUZ, JUAN A.", bold: true },
    { label: "Student Number:", value: studentNo || "2023-00001-SJ-0", bold: true },
    { label: "Degree Program:", value: courseCode || "BSIT", bold: false },
    { label: "Filing Archive Room:", value: "Archive Room 1 (PUP San Juan)", bold: false },
    { label: "Verification Status:", value: "VERIFIED & ARCHIVED IN ELECTRONIC RECORDS SYSTEM", bold: true },
  ]);

  y -= 15;
  y = drawSectionHeading(page, fonts, y, "II. Institutional Archival Statement");
  const paragraphs = [
    `This document certifies that the record titled "${docType || "Official Document"}" has been properly scanned,`,
    "digitized, and classified under the institutional records repository of Polytechnic University of the",
    "Philippines San Juan Campus in accordance with the National Archives of the Philippines guidelines.",
    "",
    "The electronic copy stored herein represents an authentic digital surrogate of the physical filing document",
    "maintained inside the designated room, cabinet, and drawer storage location.",
  ];
  for (const p of paragraphs) {
    if (!p) {
      y -= 6;
      continue;
    }
    page.drawText(p, { x: 50, y, size: 8.5, font: fontRegular, color: DarkSlate });
    y -= 15;
  }

  // Official Stamp Box
  page.drawRectangle({
    x: 40,
    y: 120,
    width: 240,
    height: 50,
    borderColor: Maroon,
    borderWidth: 1.5,
    color: LightGray,
  });
  page.drawText("POLYTECHNIC UNIVERSITY OF THE PHILIPPINES", { x: 50, y: 152, size: 7.5, font: fontBold, color: Maroon });
  page.drawText("SAN JUAN CAMPUS  •  OFFICIAL ARCHIVES", { x: 50, y: 140, size: 7, font: fontRegular, color: DarkSlate });
  page.drawText("RECORD VERIFIED & CERTIFIED", { x: 50, y: 128, size: 7.5, font: fontBold, color: ForestGreen });

  y = 115;
  drawSignatures(page, fonts, y, [
    { name: studentName || "DELA CRUZ, JUAN A.", title: "Student / Holder" },
    { name: "MARCUS REYES", title: "Registrar Receiving Officer" },
    { name: "ELIAS AUSTRIA", title: "Campus Registrar Head" },
  ]);

  drawFooter(page, fonts, "PUP-RMS-DOC");
  return Buffer.from(await doc.save());
}

/**
 * Main dispatcher: maps any document type to its dedicated professional PDF renderer.
 */
export async function generateDocumentPdfByType({
  docType = "",
  studentNo = "2023-00001-SJ-0",
  studentName = "DELA CRUZ, JUAN A.",
  courseCode = "BSIT",
  section = "1-1",
  orgName = "",
  dateStr = "",
} = {}) {
  const norm = String(docType || "").trim().toLowerCase();

  if (norm.includes("caepup")) {
    return generateCaepupForm({ studentNo, studentName, courseCode, dateStr });
  }
  if (norm.includes("sar form")) {
    return generateSarForm({ studentNo, studentName, courseCode, section, dateStr });
  }
  if (norm.includes("health and information") || norm.includes("health")) {
    return generateHealthSheet({ studentNo, studentName, courseCode, dateStr });
  }
  if (norm.includes("undertaking") || norm.includes("waiver")) {
    return generateUndertakingPdf({ studentNo, studentName, courseCode, dateStr });
  }
  if (norm.includes("report card") || norm.includes("grade 10") || norm.includes("grade 11") || norm.includes("grade 12")) {
    return generateReportCardPdf({ docType, studentNo, studentName, courseCode, dateStr });
  }
  if (norm.includes("diploma") || norm.includes("graduation")) {
    return generateDiplomaPdf({ studentNo, studentName, courseCode, dateStr });
  }
  if (norm.includes("good moral")) {
    return generateGoodMoralPdf({ studentNo, studentName, dateStr });
  }
  if (norm.includes("birth certificate") || norm.includes("psa")) {
    return generatePsaBirthCertPdf({ studentNo, studentName, dateStr });
  }
  if (norm.includes("photocopy of id") || norm.includes("id")) {
    return generateIdPhotocopyPdf({ studentNo, studentName, courseCode, dateStr });
  }
  if (norm.includes("organization registration") || norm.includes("accreditation")) {
    return generateOrgCertPdf({ orgName: orgName || studentName, dateStr });
  }

  // Fallback
  return generateGenericDocumentPdf({ docType, studentNo, studentName, courseCode, dateStr });
}
