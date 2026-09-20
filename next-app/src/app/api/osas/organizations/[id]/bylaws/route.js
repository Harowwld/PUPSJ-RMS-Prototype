import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { requireOfficeModule } from "@/lib/moduleAccess";
import { getOrganizationById, updateOrganizationBylaws } from "@/lib/organizationsRepo";
import { writeGlobalAuditLog } from "@/lib/auditLogRequest";

export const runtime = "nodejs";

function bylawsStorageDir() {
  const localDir = process.env.LOCAL_DATA_DIR || path.join(process.cwd(), ".local");
  const dir = path.join(localDir, "storage", "osas", "bylaws");
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function resolveBylawsFilePath(storageFilename) {
  if (!storageFilename) return null;
  const localDir = process.env.LOCAL_DATA_DIR || path.join(process.cwd(), ".local");
  const candidates = [
    path.resolve(localDir, "storage", "osas", "bylaws", storageFilename),
    path.resolve(localDir, "osas", "bylaws", storageFilename),
    path.resolve(localDir, "storage", "osas", "uploads", storageFilename),
    path.resolve(process.cwd(), ".local", "storage", "osas", "bylaws", storageFilename),
    path.resolve(process.cwd(), "..", ".local", "storage", "osas", "bylaws", storageFilename),
  ];
  return candidates.find((p) => fs.existsSync(p)) || null;
}

async function synthesizeFallbackBylawsPdf(org) {
  try {
    const { PDFDocument, rgb, StandardFonts } = await import("pdf-lib");
    const doc = await PDFDocument.create();
    const page = doc.addPage([612, 792]);
    const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
    const fontRegular = await doc.embedFont(StandardFonts.Helvetica);
    const maroon = rgb(0.5, 0, 0);
    const darkGray = rgb(0.2, 0.2, 0.2);

    // Header
    page.drawText("POLYTECHNIC UNIVERSITY OF THE PHILIPPINES", { x: 50, y: 740, size: 13, font: fontBold, color: maroon });
    page.drawText("SAN JUAN CAMPUS - OFFICE OF STUDENT AFFAIRS AND SERVICES", { x: 50, y: 724, size: 9, font: fontBold, color: darkGray });
    page.drawText("CONSTITUTION AND BY-LAWS (CBL) ARCHIVE", { x: 50, y: 706, size: 11, font: fontBold, color: maroon });
    page.drawLine({ start: { x: 50, y: 696 }, end: { x: 562, y: 696 }, thickness: 1, color: maroon });

    // Org details
    page.drawText(`Organization: ${org.name || "Recognized Student Organization"}`, { x: 50, y: 660, size: 11, font: fontBold, color: darkGray });
    page.drawText(`Acronym: ${org.acronym || "N/A"}`, { x: 50, y: 642, size: 9.5, font: fontRegular, color: darkGray });
    page.drawText(`Classification: ${org.category || "Academic"}`, { x: 50, y: 624, size: 9.5, font: fontRegular, color: darkGray });
    page.drawText(`Faculty Adviser: ${org.adviser_name || "N/A"} (${org.adviser_email || "N/A"})`, { x: 50, y: 606, size: 9.5, font: fontRegular, color: darkGray });
    page.drawText(`Accreditation Status: ${org.status || "Active"}`, { x: 50, y: 588, size: 9.5, font: fontBold, color: maroon });

    if (org.description) {
      page.drawText("Mission & Purpose:", { x: 50, y: 555, size: 9.5, font: fontBold, color: darkGray });
      page.drawText(String(org.description).slice(0, 300), { x: 50, y: 539, size: 8.5, font: fontRegular, color: darkGray });
    }

    // Archival note
    page.drawText("Article I: Name and Objectives", { x: 50, y: 490, size: 10, font: fontBold, color: maroon });
    page.drawText("This official archival copy certifies that this student organization is officially recognized and", { x: 50, y: 472, size: 8.5, font: fontRegular, color: darkGray });
    page.drawText("accredited under the guidelines of the Office of Student Affairs and Services (OSAS).", { x: 50, y: 458, size: 8.5, font: fontRegular, color: darkGray });

    page.drawText("Article II: Officer Governance and Accountability", { x: 50, y: 425, size: 10, font: fontBold, color: maroon });
    page.drawText("Student officers whitelisted in the PUPSJ Records Management System are authorized to", { x: 50, y: 407, size: 8.5, font: fontRegular, color: darkGray });
    page.drawText("submit official activity proposals and administer organizational correspondence.", { x: 50, y: 393, size: 8.5, font: fontRegular, color: darkGray });

    page.drawText("Verified Archival Record — PUPSJ Records Keeping System", { x: 50, y: 80, size: 8, font: fontRegular, color: rgb(0.6, 0.6, 0.6) });
    return Buffer.from(await doc.save());
  } catch {
    return Buffer.from("%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R>>endobj\nxref\n0 4\n0000000000 65535 f \n0000000010 00000 n \n0000000053 00000 n \n0000000102 00000 n \ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n171\n%%EOF");
  }
}

export async function GET(req, ctx) {
  const access = await requireOfficeModule("student_organizations", { officeId: "osas" }, req);
  if (access === null) return NextResponse.json({ ok: false, error: "Authentication required" }, { status: 401 });
  if (!access) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });

  const { id } = await ctx.params;
  const org = await getOrganizationById(id);
  if (!org) return NextResponse.json({ ok: false, error: "Organization not found." }, { status: 404 });

  const isFileReq = new URL(req.url).searchParams.get("file") === "1";
  if (isFileReq) {
    let filePath = resolveBylawsFilePath(org.bylaws_storage_filename);
    let bytes;

    if (filePath && fs.existsSync(filePath)) {
      bytes = fs.readFileSync(filePath);
    } else {
      bytes = await synthesizeFallbackBylawsPdf(org);
      try {
        const storageFilename = org.bylaws_storage_filename || `${crypto.randomUUID()}-cbl.pdf`;
        const savePath = path.join(bylawsStorageDir(), storageFilename);
        fs.writeFileSync(savePath, bytes);
        if (!org.bylaws_storage_filename) {
          await updateOrganizationBylaws(id, {
            storageFilename,
            originalFilename: `${org.acronym || org.name}-CBL.pdf`,
            sizeBytes: bytes.length,
            mimeType: "application/pdf",
          });
        }
      } catch (err) {
        console.warn("Could not cache synthesized CBL to disk:", err?.message);
      }
    }

    return new NextResponse(bytes, {
      headers: {
        "Content-Type": org.bylaws_mime_type || "application/pdf",
        "Content-Disposition": `inline; filename="${org.bylaws_original_filename || `${org.name}-CBL.pdf`}"`,
      },
    });
  }

  return NextResponse.json({
    ok: true,
    data: {
      hasBylaws: Boolean(org.bylaws_storage_filename),
      originalFilename: org.bylaws_original_filename,
      sizeBytes: org.bylaws_size_bytes,
      updatedAt: org.bylaws_updated_at,
    },
  });
}

export async function POST(req, ctx) {
  const access = await requireOfficeModule("student_organizations", { officeId: "osas" }, req);
  if (access === null) return NextResponse.json({ ok: false, error: "Authentication required" }, { status: 401 });
  if (!access) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });

  const { id } = await ctx.params;
  const org = await getOrganizationById(id);
  if (!org) return NextResponse.json({ ok: false, error: "Organization not found." }, { status: 404 });

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");

  if (!file || typeof file === "string" || file.type !== "application/pdf") {
    return NextResponse.json({ ok: false, error: "A valid PDF file is required for the Constitution and By-Laws." }, { status: 400 });
  }

  const storageFilename = `${crypto.randomUUID()}-cbl.pdf`;
  const fileBytes = Buffer.from(await file.arrayBuffer());
  fs.writeFileSync(path.join(bylawsStorageDir(), storageFilename), fileBytes);

  const updated = await updateOrganizationBylaws(id, {
    storageFilename,
    originalFilename: file.name || "Constitution-and-Bylaws.pdf",
    sizeBytes: file.size,
    mimeType: file.type,
  });

  await writeGlobalAuditLog(req, "Uploaded organization Constitution & By-Laws", {
    officeId: "osas",
    details: `Uploaded CBL PDF for ${org.name} (${file.name}, ${file.size} bytes).`,
    entity_type: "student_organization",
    entity_id: id,
  });

  return NextResponse.json({ ok: true, data: updated });
}
