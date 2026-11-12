import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export function getSampleComplianceReview(studentIndex, typeIndex, typeCount) {
  if (studentIndex % 4 === 0 && typeIndex === (studentIndex + 1) % typeCount) {
    if (studentIndex % 8 === 0) return { status: "Pending", note: null };
    return { status: "Declined", note: "The scan is incomplete. Upload a legible copy showing the entire document." };
  }
  return {
    status: "Approved",
    note: "Synthetic sample only; not an actual student submission or institutional verification.",
  };
}

function pdfText(value) {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7E]/g, "");
}

export async function generateSampleCompliancePdf({ docType, studentNo, studentName, courseCode, section }) {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([612, 792]);
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const maroon = rgb(0.5, 0, 0);
  const gray = rgb(0.35, 0.35, 0.35);

  page.drawText("SAMPLE DATA", { x: 48, y: 726, size: 18, font: bold, color: maroon });
  page.drawText("NOT AN OFFICIAL STUDENT DOCUMENT", { x: 48, y: 702, size: 12, font: bold, color: maroon });
  page.drawLine({ start: { x: 48, y: 686 }, end: { x: 564, y: 686 }, thickness: 1, color: maroon });
  page.drawText("Synthetic compliance placeholder", { x: 48, y: 650, size: 16, font: bold, color: gray });
  page.drawText(`Requirement: ${pdfText(docType)}`, { x: 48, y: 612, size: 12, font: regular, color: gray });
  page.drawText(`Student: ${pdfText(studentName)}`, { x: 48, y: 588, size: 12, font: regular, color: gray });
  page.drawText(`Student No.: ${pdfText(studentNo)}`, { x: 48, y: 564, size: 12, font: regular, color: gray });
  page.drawText(`Program / Section: ${pdfText(courseCode)} / ${pdfText(section)}`, { x: 48, y: 540, size: 12, font: regular, color: gray });
  page.drawText("This generated demo file does not represent a submitted or verified record.", {
    x: 48,
    y: 486,
    size: 11,
    font: regular,
    color: maroon,
    maxWidth: 500,
  });

  return Buffer.from(await pdf.save());
}
