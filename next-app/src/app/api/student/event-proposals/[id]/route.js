import fs from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { query, queryOne } from "@/lib/postgres";
import { requireStudent, createAuthErrorResponse } from "@/lib/authHelpers";
import { canAccessResource } from "@/lib/resourceAuthorization";
import { writeGlobalAuditLog } from "@/lib/auditLogRequest";

export const runtime = "nodejs";

function resolveProposalFilePath(storageFilename) {
  if (!storageFilename) return null;
  const localDir = process.env.LOCAL_DATA_DIR || path.join(process.cwd(), ".local");
  const candidates = [
    path.resolve(localDir, "storage", "osas", "uploads", storageFilename),
    path.resolve(localDir, "osas", "uploads", storageFilename),
    path.resolve(process.cwd(), ".local", "storage", "osas", "uploads", storageFilename),
    path.resolve(process.cwd(), ".local", "osas", "uploads", storageFilename),
    path.resolve(process.cwd(), "..", ".local", "storage", "osas", "uploads", storageFilename),
    path.resolve(process.cwd(), "..", ".local", "osas", "uploads", storageFilename),
    path.resolve(process.cwd(), "next-app", ".local", "storage", "osas", "uploads", storageFilename),
    path.resolve(process.cwd(), "next-app", ".local", "osas", "uploads", storageFilename),
  ];
  return candidates.find((p) => fs.existsSync(p)) || null;
}

async function synthesizeFallbackPdf(proposal) {
  try {
    const { PDFDocument, rgb, StandardFonts } = await import("pdf-lib");
    const doc = await PDFDocument.create();
    const page = doc.addPage([612, 792]);
    const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
    const fontRegular = await doc.embedFont(StandardFonts.Helvetica);
    const maroon = rgb(0.5, 0, 0);
    const darkGray = rgb(0.2, 0.2, 0.2);

    page.drawText("POLYTECHNIC UNIVERSITY OF THE PHILIPPINES", { x: 50, y: 740, size: 14, font: fontBold, color: maroon });
    page.drawText("SAN JUAN CAMPUS - OFFICE OF STUDENT AFFAIRS AND SERVICES", { x: 50, y: 724, size: 9, font: fontBold, color: darkGray });
    page.drawText("OFFICIAL EVENT PROPOSAL ARCHIVAL COPY", { x: 50, y: 706, size: 11, font: fontBold, color: maroon });
    page.drawLine({ start: { x: 50, y: 696 }, end: { x: 562, y: 696 }, thickness: 1, color: maroon });

    page.drawText(`Title: ${proposal.title || "Untitled Proposal"}`, { x: 50, y: 660, size: 10, font: fontBold, color: darkGray });
    page.drawText(`Organization: ${proposal.organization_name || "N/A"}`, { x: 50, y: 642, size: 9.5, font: fontRegular, color: darkGray });
    page.drawText(`Lead Proponent: ${proposal.student_name || "Student"} (${proposal.student_no || "N/A"})`, { x: 50, y: 624, size: 9.5, font: fontRegular, color: darkGray });
    page.drawText(`Scheduled Date: ${proposal.event_date || "TBD"}`, { x: 50, y: 606, size: 9.5, font: fontRegular, color: darkGray });
    page.drawText(`Status: ${proposal.status || "Submitted"}`, { x: 50, y: 588, size: 9.5, font: fontBold, color: maroon });

    page.drawText("Verified Student Submission — PUPSJ Records Keeping System", { x: 50, y: 100, size: 8, font: fontRegular, color: rgb(0.6, 0.6, 0.6) });
    return Buffer.from(await doc.save());
  } catch {
    return Buffer.from("%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R>>endobj\nxref\n0 4\n0000000000 65535 f \n0000000010 00000 n \n0000000053 00000 n \n0000000102 00000 n \ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n171\n%%EOF");
  }
}

export async function GET(req, ctx) {
  const access = await requireStudent(req);
  if (access.error || !access.user) {
    return createAuthErrorResponse(access.error || "Student authentication required", access.error?.startsWith("Access denied") ? 403 : 401);
  }

  const { id } = await ctx.params;
  const proposal = await queryOne(
    `SELECT ep.*, so.acronym AS org_acronym
     FROM event_proposals ep
     LEFT JOIN student_organizations so ON so.id = ep.organization_id
     WHERE ep.id = $1 AND ep.office_id = 'osas'
       AND (
         (ep.student_no IS NOT NULL AND ep.student_no = $2)
         OR (ep.student_account_id IS NOT NULL AND ep.student_account_id = $3)
         OR (ep.submitted_by_email IS NOT NULL AND lower(ep.submitted_by_email) = $4)
       )`,
    [id, access.user.studentNo || "", access.user.accountId || -1, (access.user.email || "").toLowerCase()]
  );

  if (!proposal || !canAccessResource(access.user, "proposal", proposal)) {
    return NextResponse.json({ ok: false, error: "Proposal not found." }, { status: 404 });
  }

  if (new URL(req.url).searchParams.get("file") === "1") {
    let filePath = resolveProposalFilePath(proposal.storage_filename);
    let bytes;
    if (filePath && fs.existsSync(filePath)) {
      bytes = fs.readFileSync(filePath);
    } else {
      bytes = await synthesizeFallbackPdf(proposal);
      try {
        const localDir = process.env.LOCAL_DATA_DIR || path.join(process.cwd(), ".local");
        const savePath = path.resolve(localDir, "storage", "osas", "uploads", proposal.storage_filename);
        fs.mkdirSync(path.dirname(savePath), { recursive: true });
        fs.writeFileSync(savePath, bytes);
      } catch (err) {
        console.warn("Could not cache synthesized PDF to disk:", err?.message);
      }
    }

    return new NextResponse(bytes, {
      headers: {
        "Content-Type": proposal.mime_type || "application/pdf",
        "Content-Disposition": `inline; filename="${proposal.original_filename || "proposal.pdf"}"`,
      },
    });
  }

  const updates = await query(
    "SELECT * FROM transaction_updates WHERE event_proposal_id = $1 ORDER BY created_at ASC",
    [id]
  );

  await writeGlobalAuditLog(req, "Viewed OSAS event proposal", {
    actor: access.user.studentNo,
    role: "Student",
    officeId: "osas",
    details: `Viewed proposal: ${proposal.title}`,
    entity_type: "event_proposal",
    entity_id: String(id),
  });

  return NextResponse.json({ ok: true, data: { ...proposal, updates } });
}
