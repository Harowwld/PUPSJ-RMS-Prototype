import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { query, transaction } from "@/lib/postgres";
import { writeGlobalAuditLog } from "@/lib/auditLogRequest";
import { requireStudent, createAuthErrorResponse } from "@/lib/authHelpers";
import { canAccessResource } from "@/lib/resourceAuthorization";
import { isStudentOfficerForOrg, getOrganizationsForStudentEmail } from "@/lib/organizationsRepo";

export const runtime = "nodejs";

function uploadsDir() {
  const localDir = process.env.LOCAL_DATA_DIR || path.join(process.cwd(), ".local");
  const dir = path.join(localDir, "storage", "osas", "uploads");
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export async function GET(req) {
  const access = await requireStudent(req);
  if (access.error || !access.user) {
    return createAuthErrorResponse(
      access.error || "Student authentication required",
      access.error?.startsWith("Access denied") ? 403 : 401
    );
  }

  const proposals = (
    await query(
      `SELECT ep.*, so.acronym AS org_acronym, so.category AS org_category
       FROM event_proposals ep
       LEFT JOIN student_organizations so ON so.id = ep.organization_id
       WHERE ep.office_id = 'osas'
         AND ep.identity_profile_id = $1
       ORDER BY ep.created_at DESC`,
      [access.user.identityProfileId]
    )
  ).filter((item) => canAccessResource(access.user, "proposal", item));

  const ids = proposals.map((item) => item.id);
  const updates = ids.length
    ? await query(
        "SELECT * FROM transaction_updates WHERE event_proposal_id = ANY($1::bigint[]) ORDER BY created_at ASC",
        [ids]
      )
    : [];

  const updatesByProposal = updates.reduce((grouped, item) => {
    const key = String(item.event_proposal_id);
    (grouped[key] ||= []).push(item);
    return grouped;
  }, {});

  proposals.forEach((item) => {
    item.updates = updatesByProposal[String(item.id)] || [];
  });

  return NextResponse.json({ ok: true, data: proposals });
}

export async function POST(req) {
  const access = await requireStudent(req);
  if (access.error || !access.user) {
    return createAuthErrorResponse(
      access.error || "Student authentication required",
      access.error?.startsWith("Access denied") ? 403 : 401
    );
  }

  const form = await req.formData().catch(() => null);
  const title = String(form?.get("title") || "").trim();
  const organizationId = String(form?.get("organizationId") || "").trim();
  const rawOrgName = String(form?.get("organizationName") || "").trim();
  const eventDate = String(form?.get("eventDate") || "").trim();
  const file = form?.get("file");

  if (!title || (!organizationId && !rawOrgName) || !eventDate || !file || typeof file === "string" || file.type !== "application/pdf") {
    return NextResponse.json(
      { ok: false, error: "Title, organization, event date, and one PDF proposal are required." },
      { status: 400 }
    );
  }
  const parsedEventDate = new Date(`${eventDate}T00:00:00.000Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(eventDate) || Number.isNaN(parsedEventDate.getTime()) || parsedEventDate.toISOString().slice(0, 10) !== eventDate) {
    return NextResponse.json({ ok: false, error: "Event date must be a valid calendar date in YYYY-MM-DD format." }, { status: 400 });
  }

  // Verify whitelist affiliation for the student's email
  const studentEmail = access.user.email || "";
  let officerRecord = null;

  if (organizationId) {
    officerRecord = await isStudentOfficerForOrg(studentEmail, organizationId);
  } else {
    // If only name provided, search student's affiliated orgs for a match
    const studentOrgs = await getOrganizationsForStudentEmail(studentEmail);
    officerRecord = studentOrgs.find(
      (o) =>
        o.organization_name.toLowerCase() === rawOrgName.toLowerCase() ||
        (o.acronym && o.acronym.toLowerCase() === rawOrgName.toLowerCase())
    );
  }

  if (!officerRecord) {
    return NextResponse.json(
      {
        ok: false,
        error: "Access Denied: Only authorized student organization officers whitelisted by OSAS can submit event proposals.",
      },
      { status: 403 }
    );
  }

  const resolvedOrgId = officerRecord.organization_id || organizationId;
  const resolvedOrgName = officerRecord.organization_name || rawOrgName;
  const officerPosition = officerRecord.officer_position || officerRecord.position || "Officer";

  const storageFilename = `${crypto.randomUUID()}.pdf`;
  const fileBytes = Buffer.from(await file.arrayBuffer());
  const primaryFilePath = path.join(uploadsDir(), storageFilename);
  const legacyDir = path.join(process.env.LOCAL_DATA_DIR || path.join(process.cwd(), ".local"), "osas", "uploads");
  const legacyFilePath = path.join(legacyDir, storageFilename);
  const createdPaths = [];
  let proposal;

  try {
    fs.writeFileSync(primaryFilePath, fileBytes, { flag: "wx" });
    createdPaths.push(primaryFilePath);
    fs.mkdirSync(legacyDir, { recursive: true });
    try {
      fs.writeFileSync(legacyFilePath, fileBytes, { flag: "wx" });
      createdPaths.push(legacyFilePath);
    } catch {}

    proposal = await transaction(async (tx) => {
      const saved = await tx.queryOne(
        `INSERT INTO event_proposals (
          office_id, student_no, identity_profile_id, organization_id, organization_name,
          submitted_by_email, officer_position, is_verified_officer,
          title, event_date, original_filename, storage_filename, mime_type, size_bytes, status
        ) VALUES (
          'osas', $1, (SELECT identity_profile_id FROM student_accounts WHERE id = $2),
          $3, $4, $5, $6, TRUE, $7, $8, $9, $10, $11, $12, 'Submitted'
        ) RETURNING *`,
        [
          access.user.studentNo || officerRecord.student_no || null,
          access.user.accountId || null,
          resolvedOrgId,
          resolvedOrgName,
          studentEmail.toLowerCase(),
          officerPosition,
          title,
          eventDate,
          file.name || "event-proposal.pdf",
          storageFilename,
          file.type,
          fileBytes.length,
        ],
      );
      if (!saved || !canAccessResource(access.user, "proposal", saved)) {
        const error = new Error("Proposal could not be submitted.");
        error.code = "PROPOSAL_ACCESS_CHECK_FAILED";
        throw error;
      }
      await tx.query(
        `INSERT INTO transaction_updates (event_proposal_id, status, message)
         VALUES ($1, 'Submitted', $2)`,
        [saved.id, `Event proposal submitted by ${officerPosition} (${studentEmail}).`],
      );
      return saved;
    });

  } catch (error) {
    for (const filePath of createdPaths) {
      try { fs.unlinkSync(filePath); } catch {}
    }
    return NextResponse.json({ ok: false, error: error.message || "Failed to submit event proposal." }, { status: 500 });
  }

  await writeGlobalAuditLog(req, "Student event proposal submitted", {
    actor: studentEmail || access.user.studentNo || "Student Officer",
    role: "Student",
    officeId: "osas",
    details: `Submitted "${title}" on behalf of ${resolvedOrgName} (${officerPosition}).`,
    entity_type: "event_proposal",
    entity_id: String(proposal.id),
  });
  return NextResponse.json({ ok: true, data: proposal }, { status: 201 });
}
