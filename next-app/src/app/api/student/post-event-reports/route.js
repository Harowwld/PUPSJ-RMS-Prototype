import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { requireStudent, createAuthErrorResponse } from "@/lib/authHelpers";
import { isStudentOfficerForOrg, getOrganizationsForStudentEmail } from "@/lib/organizationsRepo";
import {
  createPostEventReport,
  listPostEventReports,
  listApprovedEventsAwaitingReports,
} from "@/lib/osasPostEventRepo";
import { queryOne } from "@/lib/postgres";

export const runtime = "nodejs";
const MAX_POST_EVENT_PDF_BYTES = 25 * 1024 * 1024;

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

  const studentEmail = (access.user.email || "").toLowerCase();
  const studentOrgs = await getOrganizationsForStudentEmail(studentEmail);
  const orgIds = studentOrgs.map((o) => o.organization_id);

  if (orgIds.length === 0) {
    return NextResponse.json({
      ok: true,
      data: {
        reports: [],
        pendingEvents: [],
      },
    });
  }

  // Fetch reports for affiliated organizations
  const allReports = await listPostEventReports();
  const studentReports = allReports.filter((r) => orgIds.includes(r.organization_id));

  // Fetch approved events awaiting reports
  const pendingEvents = await listApprovedEventsAwaitingReports({ studentEmail });

  return NextResponse.json({
    ok: true,
    data: {
      reports: studentReports,
      pendingEvents,
    },
  });
}

export async function POST(req) {
  const access = await requireStudent(req);
  if (access.error || !access.user) {
    return createAuthErrorResponse(
      access.error || "Student authentication required",
      access.error?.startsWith("Access denied") ? 403 : 401
    );
  }

  const studentEmail = (access.user.email || "").toLowerCase();
  const form = await req.formData().catch(() => null);

  const eventProposalId = form?.get("eventProposalId");
  const organizationId = String(form?.get("organizationId") || "").trim();
  const actualAttendance = Number(form?.get("actualAttendance") ?? form?.get("actualAttendees") ?? 0);
  const totalExpenses = Number(form?.get("totalExpenses") ?? form?.get("actualExpenses") ?? 0);
  const narrativeFile = form?.get("narrativeFile");
  const liquidationFile = form?.get("liquidationFile");

  if (!/^\d+$/.test(String(eventProposalId || "")) || !organizationId || !narrativeFile || typeof narrativeFile === "string") {
    return NextResponse.json(
      { ok: false, error: "Event proposal, organization, and a valid narrative report PDF are required." },
      { status: 400 }
    );
  }

  if (!Number.isInteger(actualAttendance) || actualAttendance < 0 || actualAttendance > 2147483647
    || !Number.isFinite(totalExpenses) || totalExpenses < 0 || totalExpenses > 9999999999.99) {
    return NextResponse.json({ ok: false, error: "Attendance and expenses must be valid non-negative numbers." }, { status: 400 });
  }

  if (narrativeFile.type !== "application/pdf") {
    return NextResponse.json(
      { ok: false, error: "Narrative report must be a PDF document." },
      { status: 400 }
    );
  }
  if (!narrativeFile.size || narrativeFile.size > MAX_POST_EVENT_PDF_BYTES) {
    return NextResponse.json({ ok: false, error: "Narrative report must be between 1 byte and 25 MB." }, { status: 400 });
  }

  if (liquidationFile && typeof liquidationFile !== "string" && liquidationFile.type !== "application/pdf") {
    return NextResponse.json(
      { ok: false, error: "Liquidation report must be a PDF document." },
      { status: 400 }
    );
  }
  if (liquidationFile && typeof liquidationFile !== "string" && (!liquidationFile.size || liquidationFile.size > MAX_POST_EVENT_PDF_BYTES)) {
    return NextResponse.json({ ok: false, error: "Liquidation report must be between 1 byte and 25 MB." }, { status: 400 });
  }

  // Verify whitelist authorization
  const officerRecord = await isStudentOfficerForOrg(studentEmail, organizationId);
  if (!officerRecord) {
    return NextResponse.json(
      { ok: false, error: "Access Denied: You must be an authorized officer of this organization to submit post-event reports." },
      { status: 403 }
    );
  }

  // Verify proposal exists, belongs to org, and is Approved
  const proposal = await queryOne(
    `SELECT * FROM event_proposals WHERE id = $1 AND organization_id = $2 AND office_id = 'osas'`,
    [eventProposalId, organizationId]
  );

  if (!proposal) {
    return NextResponse.json(
      { ok: false, error: "Event proposal not found for this organization." },
      { status: 404 }
    );
  }

  if (proposal.status !== "Approved") {
    return NextResponse.json(
      { ok: false, error: "Post-event reports can only be submitted for officially Approved events." },
      { status: 400 }
    );
  }

  // Save files to disk; remove them if the database transaction fails.
  const narrativeStorageFilename = `${crypto.randomUUID()}-narrative.pdf`;
  const narrativeBytes = Buffer.from(await narrativeFile.arrayBuffer());
  const createdPaths = [];

  let liquidationStorageFilename = null;
  let liquidationOriginalFilename = null;
  try {
    const narrativePath = path.join(uploadsDir(), narrativeStorageFilename);
    fs.writeFileSync(narrativePath, narrativeBytes, { flag: "wx" });
    createdPaths.push(narrativePath);
    if (liquidationFile && typeof liquidationFile !== "string") {
      liquidationStorageFilename = `${crypto.randomUUID()}-liquidation.pdf`;
      const liquidationPath = path.join(uploadsDir(), liquidationStorageFilename);
      fs.writeFileSync(liquidationPath, Buffer.from(await liquidationFile.arrayBuffer()), { flag: "wx" });
      createdPaths.push(liquidationPath);
      liquidationOriginalFilename = liquidationFile.name;
    }

    const report = await createPostEventReport({
      eventProposalId: proposal.id,
      organizationId,
      submittedByEmail: studentEmail,
      actualAttendance,
      totalExpenses,
      narrativeStorageFilename,
      narrativeOriginalFilename: narrativeFile.name || "Narrative-Report.pdf",
      liquidationStorageFilename,
      liquidationOriginalFilename: liquidationOriginalFilename || (liquidationStorageFilename ? "Liquidation-Report.pdf" : null),
    });

    return NextResponse.json({ ok: true, data: report }, { status: 201 });
  } catch (error) {
    for (const filePath of createdPaths) {
      try { fs.unlinkSync(filePath); } catch {}
    }
    if (error?.code === "POST_EVENT_NOT_ELIGIBLE") {
      return NextResponse.json({ ok: false, error: error.message }, { status: 409 });
    }
    return NextResponse.json({ ok: false, error: "Unable to save post-event report." }, { status: 500 });
  }
}
