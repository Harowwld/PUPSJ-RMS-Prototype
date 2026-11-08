import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PDFDocument, StandardFonts, rgb, degrees } from "pdf-lib";

const root = path.dirname(fileURLToPath(import.meta.url));
const seed = 20261108;
const tiers = [
  { id: "Q1", label: "Pristine digital", parameters: { dpi: 300, rotationDegrees: 0, noise: 0, contrast: 1, fontScale: 1 } },
  { id: "Q2", label: "Compressed / low resolution proxy", parameters: { dpi: 120, rotationDegrees: 0, noise: 0, contrast: 1, fontScale: 0.78, methodNote: "Vector PDF text-size proxy; source is not rasterized or JPEG-compressed." } },
  { id: "Q3", label: "Skewed / rotated", parameters: { dpi: 300, rotationDegrees: 90, noise: 0, contrast: 1, fontScale: 1, methodNote: "Whole-page 90-degree rotation; feeder-skew angles are not simulated." } },
  { id: "Q4", label: "Noisy / scan artifacts", parameters: { dpi: 300, rotationDegrees: 0, noise: "deterministic speckle overlay", contrast: 1, fontScale: 1 } },
  { id: "Q5", label: "Low contrast / photocopy proxy", parameters: { dpi: 300, rotationDegrees: 0, noise: 0, contrast: 0.45, fontScale: 1, methodNote: "Gray vector ink approximates contrast loss; no physical photocopy or scan is made." } },
];

const types = [
  { docType: "Transcript of Records", label: "TRANSCRIPT OF RECORDS", count: 4, hasStudentNo: true },
  { docType: "Certificate of Registration", label: "CERTIFICATE OF REGISTRATION", count: 4, hasStudentNo: true },
  { docType: "Form 137 / SF10", label: "STUDENT PERMANENT RECORD (FORM 137 / SF10)", count: 4, hasStudentNo: true },
  { docType: "Student ID", label: "STUDENT IDENTIFICATION CARD", count: 4, hasStudentNo: true },
  { docType: "PSA Certificate of Live Birth", label: "CERTIFICATE OF LIVE BIRTH", count: 4, hasStudentNo: false },
];
const people = [
  ["Mara", "Isabel", "Santos"], ["Jose", "Luis", "Reyes"], ["Ana", "Beatriz", "Dela Cruz"], ["Paolo", "Miguel", "Garcia"],
  ["Lia", "Mae", "Mendoza"], ["Rafael", "Antonio", "Cruz"], ["Nina", "Joy", "Bautista"], ["Elias", "Ramon", "Villanueva"],
  ["Celia", "Rose", "Navarro"], ["Marco", "Andres", "Castillo"], ["Tessa", "Marie", "Aquino"], ["Daniel", "Jose", "Flores"],
  ["Irene", "Luz", "Ramos"], ["Victor", "Emil", "Torres"], ["Lea", "Grace", "Domingo"], ["Noel", "Pio", "Fernandez"],
  ["Rosa", "Elena", "Rivera"], ["Mario", "Felix", "Santiago"], ["Clara", "Faith", "Mercado"], ["Ben", "Lucas", "Ocampo"],
];
let randomState = seed >>> 0;
function random() { randomState = (1664525 * randomState + 1013904223) >>> 0; return randomState / 2 ** 32; }
function nameParts([firstName, middleName, lastName]) {
  return { firstName, middleName, lastName, display: `${lastName.toUpperCase()}, ${firstName.toUpperCase()} ${middleName[0].toUpperCase()}.` };
}
function drawText(page, text, x, y, size, font, color, extra = {}) {
  page.drawText(text, { x, y, size, font, color, maxWidth: 500, ...extra });
}

async function makePdf(person, studentNo, type, tier, caseIndex) {
  const doc = await PDFDocument.create({ updateMetadata: false });
  const page = doc.addPage([612, 792]);
  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const scale = tier.parameters.fontScale;
  const shade = tier.id === "Q5" ? 0.604 : 0.12;
  const ink = rgb(shade, shade, shade);
  drawText(page, "POLYTECHNIC UNIVERSITY OF THE PHILIPPINES", 48, 748, 12 * scale, bold, ink);
  drawText(page, "SAN JUAN CAMPUS | SYNTHETIC OCR BASELINE DOCUMENT", 48, 730, 8 * scale, regular, ink);
  page.drawLine({ start: { x: 48, y: 718 }, end: { x: 564, y: 718 }, thickness: 1, color: ink });
  drawText(page, type.label, 48, 690, 15 * scale, bold, ink);
  drawText(page, "SYNTHETIC TEST RECORD — NOT AN OFFICIAL DOCUMENT", 48, 670, 8 * scale, bold, ink);
  drawText(page, "Student Name", 54, 625, 9 * scale, bold, ink);
  drawText(page, person.display, 180, 625, 12 * scale, bold, ink);
  if (studentNo) {
    drawText(page, "Student Number", 54, 596, 9 * scale, bold, ink);
    drawText(page, studentNo, 180, 596, 12 * scale, bold, ink);
  } else {
    drawText(page, "Child Name", 54, 596, 9 * scale, bold, ink);
    drawText(page, person.display, 180, 596, 11 * scale, regular, ink);
  }
  drawText(page, "Date of Birth", 54, 567, 9 * scale, bold, ink);
  drawText(page, `200${caseIndex % 10}-0${(caseIndex % 8) + 1}-1${caseIndex % 9}`, 180, 567, 10 * scale, regular, ink);
  drawText(page, "Record Reference", 54, 538, 9 * scale, bold, ink);
  drawText(page, `SYN-${String(caseIndex + 1).padStart(4, "0")}`, 180, 538, 10 * scale, regular, ink);
  for (let row = 0; row < 5; row++) {
    const y = 480 - row * 28;
    page.drawLine({ start: { x: 54, y }, end: { x: 558, y }, thickness: 0.35, color: rgb(0.68, 0.68, 0.68) });
    if (type.docType.includes("Transcript") || type.docType.includes("Form 137")) {
      drawText(page, `SUBJECT ${row + 1}     TERM ${row + 1}     GRADE ${[1.25, 1.5, 1.75, 2, 1.25][row]}`, 64, y + 9, 8 * scale, regular, ink);
    }
  }
  drawText(page, "Synthetic records generated for repeatable OCR QA.", 48, 44, 7 * scale, regular, ink);
  if (tier.id === "Q4") {
    for (let dot = 0; dot < 90; dot++) {
      const x = 35 + random() * 542;
      const y = 50 + random() * 670;
      page.drawCircle({ x, y, size: 0.25 + random() * 0.7, color: rgb(0.35, 0.35, 0.35), opacity: 0.22 });
    }
    for (let line = 0; line < 3; line++) {
      const y = 170 + random() * 470;
      page.drawLine({ start: { x: 44, y }, end: { x: 565, y: y + (random() - 0.5) * 2 }, thickness: 0.4, color: rgb(0.65, 0.65, 0.65), opacity: 0.5 });
    }
  }
  if (tier.parameters.rotationDegrees) page.setRotation(degrees(tier.parameters.rotationDegrees));
  return Buffer.from(await doc.save());
}

await fs.rm(path.join(root, "pdfs"), { recursive: true, force: true });
await fs.mkdir(path.join(root, "pdfs"), { recursive: true });
const cases = [];
let caseIndex = 0;
for (const type of types) {
  for (let n = 0; n < type.count; n++, caseIndex++) {
    const person = nameParts(people[caseIndex]);
    const canonicalId = `canonical-${String(caseIndex + 1).padStart(2, "0")}`;
    const studentNo = type.hasStudentNo ? `2026-${String(caseIndex + 1).padStart(5, "0")}-SJ-0` : null;
    for (const tier of tiers) {
      const variantSeed = seed + caseIndex * 17 + Number(tier.id.slice(1));
      randomState = variantSeed >>> 0;
      const file = `pdfs/${canonicalId}-${tier.id}.pdf`;
      await fs.writeFile(path.join(root, file), await makePdf(person, studentNo, type, tier, caseIndex));
      cases.push({
        caseId: `${canonicalId}-${tier.id}`,
        docType: type.docType,
        canonicalId,
        studentNo,
        rosterStudentNo: `2026-${String(caseIndex + 1).padStart(5, "0")}-SJ-0`,
        printedStudentNo: Boolean(studentNo),
        name: person.display,
        firstName: person.firstName,
        middleName: person.middleName,
        lastName: person.lastName,
        qualityTier: tier.id,
        seed: variantSeed,
        transform: { ...tier.parameters },
        pdfPath: file,
        ocrObservationPath: `observations.json#${canonicalId}-${tier.id}`,
      });
    }
  }
}
const manifest = {
  schemaVersion: 1,
  seed,
  generation: { command: "node test/fixtures/ocr-baseline/generate.mjs", engine: "pdf-lib vector PDF synthetic template", canonicalCount: 20, variantCount: cases.length, documentsContainRealStudentData: false },
  tiers,
  cases,
};
if (caseIndex !== 20 || cases.length !== 100) throw new Error(`Expected 20 canonical cases and 100 variants; got ${caseIndex} and ${cases.length}`);
for (const type of types.filter(({ hasStudentNo }) => !hasStudentNo)) {
  const absentNumberCases = cases.filter(({ docType }) => docType === type.docType);
  if (absentNumberCases.length !== 20 || absentNumberCases.some(({ studentNo, printedStudentNo }) => studentNo !== null || printedStudentNo)) {
    throw new Error(`Expected all ${type.docType} variants to explicitly lack a printed student number`);
  }
}
await fs.writeFile(path.join(root, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`Generated ${cases.length} synthetic PDFs (${caseIndex} canonical records × ${tiers.length} quality tiers).`);
