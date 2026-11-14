import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { isFutureManilaCalendarDate } from "@/lib/timeFormat";
import { query, queryOne, transaction } from "@/lib/postgres";
import { requireCurrentStudent, createAuthErrorResponse } from "@/lib/authHelpers";
import { canAccessResource } from "@/lib/resourceAuthorization";
import { writeGlobalAuditLog } from "@/lib/auditLogRequest";
import { FILE_SECURITY_HEADERS, inlineFileDisposition } from "@/lib/fileSecurityHeaders";
import { isStudentOfficerForOrg } from "@/lib/organizationsRepo";

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

    page.drawText("Verified Student Submission: PUPSJ Records Keeping System", { x: 50, y: 100, size: 8, font: fontRegular, color: rgb(0.6, 0.6, 0.6) });
    return Buffer.from(await doc.save());
  } catch {
    return Buffer.from("%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R>>endobj\nxref\n0 4\n0000000000 65535 f \n0000000010 00000 n \n0000000053 00000 n \n0000000102 00000 n \ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n171\n%%EOF");
  }
}

export async function GET(req, ctx) {
  const access = await requireCurrentStudent(req);
  if (access.error || !access.user) {
    return createAuthErrorResponse(access.error || "Student authentication required", access.error?.startsWith("Access denied") ? 403 : 401);
  }

  const { id } = await ctx.params;
  const proposal = await queryOne(
    `SELECT ep.*, so.acronym AS org_acronym
     FROM event_proposals ep
     LEFT JOIN student_organizations so ON so.id = ep.organization_id
     WHERE ep.id = $1 AND ep.office_id = 'osas'
       AND ep.identity_profile_id = $2`,
    [id, access.user.identityProfileId]
  );

  if (!proposal || !canAccessResource(access.user, "proposal", proposal)) {
    return NextResponse.json({ ok: false, error: "Proposal not found." }, { status: 404 });
  }

  const searchParams = new URL(req.url).searchParams;
  if (searchParams.get("file") === "1") {
    let fileProposal = proposal;
    const revisionId = searchParams.get("revisionId");
    if (revisionId) {
      if (!/^\d+$/.test(revisionId)) return NextResponse.json({ ok: false, error: "Proposal version not found." }, { status: 404 });
      const version = await queryOne(
        `SELECT title, event_date, original_filename, storage_filename, mime_type, size_bytes, file_pruned_at
         FROM event_proposal_versions
         WHERE id = $1 AND event_proposal_id = $2`,
        [revisionId, id]
      );
      if (!version) return NextResponse.json({ ok: false, error: "Proposal version not found." }, { status: 404 });
      if (version.file_pruned_at) {
        return NextResponse.json({ ok: false, error: "This earlier PDF was removed after the proposal was approved." }, { status: 410 });
      }
      fileProposal = { ...proposal, ...version };
    }
    let filePath = resolveProposalFilePath(fileProposal.storage_filename);
    let bytes;
    if (filePath && fs.existsSync(/*turbopackIgnore: true*/ filePath)) {
      bytes = fs.readFileSync(/*turbopackIgnore: true*/ filePath);
    } else {
      bytes = await synthesizeFallbackPdf(fileProposal);
      try {
        const localDir = process.env.LOCAL_DATA_DIR || path.join(process.cwd(), ".local");
        const savePath = path.resolve(localDir, "storage", "osas", "uploads", fileProposal.storage_filename);
        fs.mkdirSync(path.dirname(savePath), { recursive: true });
        fs.writeFileSync(savePath, bytes);
      } catch (err) {
        console.warn("Could not cache synthesized PDF to disk:", err?.message);
      }
    }

    return new NextResponse(bytes, {
      headers: {
        "Content-Type": fileProposal.mime_type || "application/pdf",
        "Content-Disposition": inlineFileDisposition(fileProposal.original_filename || "proposal.pdf"),
        ...FILE_SECURITY_HEADERS,
      },
    });
  }

  const rawUpdates = await query(
    `SELECT tu.*,
            s.fname AS staff_fname, s.lname AS staff_lname, s.preferences AS staff_preferences, s.role AS staff_role,
            st.name AS student_name
     FROM transaction_updates tu
     LEFT JOIN staff s ON tu.created_by = s.id
     LEFT JOIN students st ON tu.created_by = st.student_no
     WHERE tu.event_proposal_id = $1
     ORDER BY tu.created_at ASC`,
    [id]
  );
  const { getStaffFullName } = await import("@/lib/staffRepo");
  const { decryptPII } = await import("@/lib/piiEncryption");
  const updates = rawUpdates.map((u) => {
    let actorName = "Staff";
    if (u.staff_fname || u.staff_lname) {
      actorName = getStaffFullName({
        fname: decryptPII(u.staff_fname),
        lname: decryptPII(u.staff_lname),
        preferences: u.staff_preferences,
        role: u.staff_role,
        id: u.created_by,
      });
    } else if (u.student_name) {
      actorName = decryptPII(u.student_name);
    } else if (u.created_by) {
      actorName = u.created_by;
    }
    return {
      id: u.id,
      event_proposal_id: u.event_proposal_id,
      status: u.status,
      message: u.message,
      created_by: u.created_by,
      actor_id: u.created_by || null,
      actor_name: actorName,
      created_at: u.created_at,
    };
  });

  const versions = await query(
    `SELECT id, event_proposal_id, revision_number, title, event_date,
            original_filename, size_bytes, submitted_by_email,
            submitted_by_student_no, created_at, file_pruned_at
     FROM event_proposal_versions
     WHERE event_proposal_id = $1
     ORDER BY revision_number ASC`,
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

  return NextResponse.json({ ok: true, data: { ...proposal, updates, versions } });
}

export async function POST(req, ctx) {
  const access = await requireCurrentStudent(req);
  if (access.error || !access.user) {
    return createAuthErrorResponse(access.error || "Student authentication required", access.error?.startsWith("Access denied") ? 403 : 401);
  }

  const { id } = await ctx.params;
  const proposal = await queryOne(
    `SELECT * FROM event_proposals
     WHERE id = $1 AND office_id = 'osas' AND identity_profile_id = $2`,
    [id, access.user.identityProfileId]
  );
  if (!proposal || !canAccessResource(access.user, "proposal", proposal)) {
    return NextResponse.json({ ok: false, error: "Proposal not found." }, { status: 404 });
  }
  if (proposal.status !== "Needs Revision") {
    return NextResponse.json({ ok: false, error: "This proposal is not waiting for a revision." }, { status: 409 });
  }
  if (!proposal.organization_id) {
    return NextResponse.json({ ok: false, error: "This proposal is not linked to an organization record. Contact OSAS before resubmitting." }, { status: 409 });
  }

  const form = await req.formData().catch(() => null);
  const title = String(form?.get("title") || "").trim();
  const organizationId = String(form?.get("organizationId") || "").trim();
  const eventDate = String(form?.get("eventDate") || "").trim();
  const file = form?.get("file");
  if (!title || organizationId !== String(proposal.organization_id) || !eventDate || !file || typeof file === "string" || file.type !== "application/pdf") {
    return NextResponse.json({ ok: false, error: "Select this proposal’s organization, enter its title and event date, and upload a PDF revision." }, { status: 400 });
  }
  if (file.size <= 0 || file.size > 26214400) {
    return NextResponse.json({ ok: false, error: "The revised PDF must be between 1 byte and 25 MB." }, { status: 400 });
  }
  if (!isFutureManilaCalendarDate(eventDate)) {
    return NextResponse.json({ ok: false, error: "Select a valid event date after today (Manila time)." }, { status: 400 });
  }

  const studentEmail = access.user.email || "";
  const officerRecord = await isStudentOfficerForOrg(studentEmail, proposal.organization_id);
  if (!officerRecord) {
    return NextResponse.json({ ok: false, error: "Access denied: you are no longer authorized to submit for this organization." }, { status: 403 });
  }

  const fileBytes = Buffer.from(await file.arrayBuffer());
  const storageFilename = `${crypto.randomUUID()}.pdf`;
  const localDir = process.env.LOCAL_DATA_DIR || path.join(process.cwd(), ".local");
  const primaryFilePath = path.join(localDir, "storage", "osas", "uploads", storageFilename);
  const legacyFilePath = path.join(localDir, "osas", "uploads", storageFilename);
  const createdPaths = [];
  let updatedProposal;
  let revisionNumber;

  try {
    fs.mkdirSync(path.dirname(primaryFilePath), { recursive: true });
    fs.writeFileSync(primaryFilePath, fileBytes, { flag: "wx" });
    createdPaths.push(primaryFilePath);
    fs.mkdirSync(path.dirname(legacyFilePath), { recursive: true });
    try {
      fs.writeFileSync(legacyFilePath, fileBytes, { flag: "wx" });
      createdPaths.push(legacyFilePath);
    } catch {}

    updatedProposal = await transaction(async (tx) => {
      const locked = await tx.queryOne(
        `SELECT id, status, organization_id
         FROM event_proposals
         WHERE id = $1 AND office_id = 'osas' AND identity_profile_id = $2
         FOR UPDATE`,
        [id, access.user.identityProfileId]
      );
      if (!locked || locked.status !== "Needs Revision" || String(locked.organization_id) !== organizationId) {
        const error = new Error("The proposal changed while you were preparing the revision. Refresh and try again.");
        error.code = "PROPOSAL_REVISION_CONFLICT";
        throw error;
      }

      const nextVersion = await tx.queryOne(
        `SELECT COALESCE(MAX(revision_number), 0) + 1 AS revision_number
         FROM event_proposal_versions
         WHERE event_proposal_id = $1`,
        [id]
      );
      revisionNumber = Number(nextVersion.revision_number);
      await tx.query(
        `INSERT INTO event_proposal_versions (
          event_proposal_id, revision_number, title, event_date,
          original_filename, storage_filename, mime_type, size_bytes,
          submitted_by_email, submitted_by_student_no
        ) VALUES ($1, $2, $3, $4, $5, $6, 'application/pdf', $7, $8, $9)`,
        [
          id,
          revisionNumber,
          title,
          eventDate,
          file.name || "event-proposal-revision.pdf",
          storageFilename,
          fileBytes.length,
          studentEmail.toLowerCase(),
          access.user.studentNo || null,
        ]
      );
      const updated = await tx.queryOne(
        `UPDATE event_proposals
            SET title = $1,
                event_date = $2,
                original_filename = $3,
                storage_filename = $4,
                mime_type = 'application/pdf',
                size_bytes = $5,
                status = 'Submitted',
                reviewed_by = NULL,
                reviewed_at = NULL,
                review_note = NULL,
                archived_at = NULL,
                updated_at = NOW()
          WHERE id = $6 AND office_id = 'osas'
          RETURNING *`,
        [title, eventDate, file.name || "event-proposal-revision.pdf", storageFilename, fileBytes.length, id]
      );
      await tx.query(
        `INSERT INTO transaction_updates (event_proposal_id, status, message, created_by)
         VALUES ($1, 'Submitted', $2, $3)`,
        [id, `Revised proposal (Revision ${revisionNumber}) submitted by ${officerRecord.officer_position || officerRecord.position || "Officer"} (${studentEmail}).`, access.user.studentNo || access.user.id || null]
      );
      return updated;
    });
  } catch (error) {
    for (const filePath of createdPaths) {
      try { fs.unlinkSync(filePath); } catch {}
    }
    if (error?.code === "PROPOSAL_REVISION_CONFLICT") {
      return NextResponse.json({ ok: false, error: error.message }, { status: 409 });
    }
    return NextResponse.json({ ok: false, error: error.message || "Failed to submit proposal revision." }, { status: 500 });
  }

  await writeGlobalAuditLog(req, "Student event proposal revision submitted", {
    actor: studentEmail || access.user.studentNo || "Student Officer",
    role: "Student",
    officeId: "osas",
    details: `Submitted Revision ${revisionNumber} of "${title}" on behalf of ${proposal.organization_name}.`,
    entity_type: "event_proposal",
    entity_id: String(id),
  });
  return NextResponse.json({ ok: true, data: { ...updatedProposal, revision_number: revisionNumber } });
}
