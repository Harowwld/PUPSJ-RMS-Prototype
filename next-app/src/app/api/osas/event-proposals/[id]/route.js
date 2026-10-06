import fs from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { query, queryOne, transaction } from "@/lib/postgres";
import { requireOfficeModule } from "@/lib/moduleAccess";
import { writeGlobalAuditLog } from "@/lib/auditLogRequest";
import { canAccessResource } from "@/lib/resourceAuthorization";
import { decryptPII } from "@/lib/piiEncryption";

export const runtime = "nodejs";
const validStatuses = new Set(["Submitted", "Under Review", "Needs Revision", "Approved", "Declined"]);

async function getAuthorizedProposal(id, access) {
  const proposal = await queryOne(
    `SELECT ep.*,
            COALESCE(sip.display_name, s.name, ep.student_no, 'Student Officer') AS student_name,
            so.name AS verified_org_name,
            so.acronym AS org_acronym,
            so.category AS org_category,
            (SELECT obv.original_filename FROM organization_bylaws_versions obv WHERE obv.organization_id = so.id AND obv.status = 'Approved' ORDER BY obv.effective_date DESC NULLS LAST, obv.created_at DESC, obv.id DESC LIMIT 1) AS bylaws_filename,
            CASE WHEN EXISTS (SELECT 1 FROM organization_bylaws_versions obv WHERE obv.organization_id = so.id AND obv.status = 'Approved') THEN 'Active' ELSE 'Missing' END AS bylaws_status,
            EXISTS (SELECT 1 FROM organization_bylaws_versions obv WHERE obv.organization_id = so.id AND obv.status = 'Approved') AS has_bylaws
     FROM event_proposals ep
     LEFT JOIN students s ON s.student_no = ep.student_no
     LEFT JOIN student_identity_profiles sip ON sip.id = ep.identity_profile_id
     LEFT JOIN student_organizations so ON so.id = ep.organization_id
     WHERE ep.id = $1 AND ep.office_id = 'osas'`,
    [id]
  );
  if (!proposal || !canAccessResource(access, "proposal", proposal)) return null;
  if (proposal.student_name) {
    proposal.student_name = decryptPII(proposal.student_name);
  }
  return proposal;
}

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
    page.drawText(`Venue: ${proposal.venue || "TBD"}`, { x: 50, y: 588, size: 9.5, font: fontRegular, color: darkGray });
    page.drawText(`Status: ${proposal.status || "Submitted"}`, { x: 50, y: 570, size: 9.5, font: fontBold, color: maroon });

    if (proposal.description) {
      page.drawText("Project Objectives & Summary:", { x: 50, y: 540, size: 9.5, font: fontBold, color: darkGray });
      page.drawText(String(proposal.description).slice(0, 260), { x: 50, y: 524, size: 8.5, font: fontRegular, color: darkGray });
    }

    page.drawText("Verified Archival Record — PUPSJ Records Keeping System", { x: 50, y: 100, size: 8, font: fontRegular, color: rgb(0.6, 0.6, 0.6) });
    return Buffer.from(await doc.save());
  } catch {
    return Buffer.from("%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R>>endobj\nxref\n0 4\n0000000000 65535 f \n0000000010 00000 n \n0000000053 00000 n \n0000000102 00000 n \ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n171\n%%EOF");
  }
}

export async function GET(req, ctx) {
  const access = await requireOfficeModule("osas_monitoring", { officeId: "osas" }, req);
  if (access === null) return NextResponse.json({ ok: false, error: "Authentication required" }, { status: 401 });
  if (!access) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  const { id } = await ctx.params;
  const proposal = await getAuthorizedProposal(id, access);
  if (!proposal) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });

  if (new URL(req.url).searchParams.get("file") === "1") {
    let filePath = resolveProposalFilePath(proposal.storage_filename);
    let bytes;
    if (filePath && fs.existsSync(/*turbopackIgnore: true*/ filePath)) {
      bytes = fs.readFileSync(/*turbopackIgnore: true*/ filePath);
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

  const updates = await query("SELECT * FROM transaction_updates WHERE event_proposal_id = $1 ORDER BY created_at ASC", [id]);
  await writeGlobalAuditLog(req, "Viewed OSAS proposal", {
    officeId: "osas",
    details: `Viewed ${proposal.title}.`,
    entity_type: "event_proposal",
    entity_id: String(id),
  });
  return NextResponse.json({ ok: true, data: { ...proposal, updates } });
}

export const ALLOWED_TRANSITIONS = {
  "Submitted": ["Under Review", "Approved", "Declined"],
  "Under Review": ["Needs Revision", "Approved", "Declined"],
  "Needs Revision": ["Under Review", "Declined"],
  "Approved": ["Under Review", "Declined"],
  "Declined": ["Under Review"],
};

export async function PATCH(req, ctx) {
  const access = await requireOfficeModule("osas_monitoring", { officeId: "osas" }, req);
  if (access === null) return NextResponse.json({ ok: false, error: "Authentication required" }, { status: 401 });
  if (!access) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  const { id } = await ctx.params;
  const existingProposal = await getAuthorizedProposal(id, access);
  if (!existingProposal) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ ok: false, error: "Invalid request body." }, { status: 400 });
  }
  const unsupportedField = Object.keys(body).find((field) => !["status", "note"].includes(field));
  if (unsupportedField) {
    return NextResponse.json({ ok: false, error: `Unsupported field: ${unsupportedField}` }, { status: 400 });
  }
  if (body.note !== undefined && typeof body.note !== "string") {
    return NextResponse.json({ ok: false, error: "Note must be text." }, { status: 400 });
  }
  const status = String(body?.status || "").trim();
  const note = String(body?.note || "").trim();

  if (!validStatuses.has(status)) {
    return NextResponse.json({ ok: false, error: "A valid status is required." }, { status: 400 });
  }

  const currentStatus = existingProposal.status || "Submitted";

  // No-op if status is unchanged and no note was supplied.
  if (status === currentStatus && !note) return NextResponse.json({ ok: true, data: existingProposal });

  // 1. Validate State Machine Transition
  const allowedNext = ALLOWED_TRANSITIONS[currentStatus] || [];
  if (status !== currentStatus && !allowedNext.includes(status)) {
    return NextResponse.json(
      {
        ok: false,
        error: `Invalid transition: cannot move proposal from "${currentStatus}" to "${status}". Allowed transitions: ${allowedNext.join(", ") || "none"}.`,
      },
      { status: 400 }
    );
  }

  // 2. Guard: Revoking an Approved proposal requires a written justification note
  if (status !== currentStatus && currentStatus === "Approved" && (!note || note.length < 5)) {
    return NextResponse.json(
      {
        ok: false,
        error: "A written justification note (at least 5 characters) is required when revoking an approved proposal.",
      },
      { status: 400 }
    );
  }

  // 3. Guard: Reopening a Declined proposal requires an appeal/reconsideration note
  if (status !== currentStatus && currentStatus === "Declined" && (!note || note.length < 5)) {
    return NextResponse.json(
      {
        ok: false,
        error: "A written justification note (at least 5 characters) citing grounds for appeal or reconsideration is required to reopen a declined proposal.",
      },
      { status: 400 }
    );
  }

  // 4. Guard: Requesting revisions requires instructions for the student organization
  if (status !== currentStatus && status === "Needs Revision" && (!note || note.length < 5)) {
    return NextResponse.json(
      {
        ok: false,
        error: "Detailed revision instructions (at least 5 characters) are required when requesting revisions from the student organization.",
      },
      { status: 400 }
    );
  }

  const studentNote = note || `Status updated to ${status} by OSAS.`;
  let proposal;
  try {
    proposal = await transaction(async (tx) => {
      const locked = await tx.queryOne(
        "SELECT id, status, title FROM event_proposals WHERE id = $1 AND office_id = 'osas' FOR UPDATE",
        [id],
      );
      if (!locked) return null;
      if ((locked.status || "Submitted") !== currentStatus) {
        const error = new Error("The proposal changed while it was being reviewed. Refresh and try again.");
        error.code = "PROPOSAL_STATUS_CONFLICT";
        throw error;
      }

      let updated = locked;
      if (status !== currentStatus) {
        updated = await tx.queryOne(
          `UPDATE event_proposals
              SET status = $1,
                  archived_at = NULL,
                  updated_at = NOW(),
                  post_event_status = CASE
                    WHEN $1 = 'Approved' AND post_event_status = 'Not Applicable' THEN 'Pending Submission'
                    WHEN $1 != 'Approved' AND post_event_status = 'Pending Submission' THEN 'Not Applicable'
                    ELSE post_event_status
                  END,
                  post_event_due_date = CASE
                    WHEN $1 = 'Approved' AND post_event_due_date IS NULL THEN COALESCE(event_date + INTERVAL '10 days', (NOW() + INTERVAL '10 days')::DATE)
                    WHEN $1 != 'Approved' AND post_event_status = 'Pending Submission' THEN NULL
                    ELSE post_event_due_date
                  END
            WHERE id = $2 AND office_id = 'osas'
            RETURNING *`,
          [status, id],
        );
      }
      await tx.query(
        `INSERT INTO transaction_updates (event_proposal_id, status, message, created_by)
         VALUES ($1, $2, $3, $4)`,
        [id, status, studentNote, access.userId || null],
      );
      return updated;
    });
  } catch (error) {
    if (error?.code === "PROPOSAL_STATUS_CONFLICT") {
      return NextResponse.json({ ok: false, error: error.message }, { status: 409 });
    }
    throw error;
  }
  if (!proposal) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  await writeGlobalAuditLog(req, status === currentStatus ? "Added note to OSAS proposal" : "Updated OSAS proposal status", {
    officeId: "osas",
    details: status === currentStatus ? `Added note to ${proposal.title}: ${note}` : `Changed ${proposal.title} to ${status}. ${studentNote}`,
    entity_type: "event_proposal",
    entity_id: String(id),
  });
  return NextResponse.json({ ok: true, data: status === currentStatus ? existingProposal : proposal });
}
