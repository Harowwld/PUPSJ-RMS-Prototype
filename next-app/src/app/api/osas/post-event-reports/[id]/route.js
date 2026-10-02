import fs from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { requireOfficeModule } from "@/lib/moduleAccess";
import { getPostEventReportById, updatePostEventReportStatus } from "@/lib/osasPostEventRepo";
import { writeGlobalAuditLog } from "@/lib/auditLogRequest";

export const runtime = "nodejs";

function resolveFilePath(storageFilename) {
  if (!storageFilename) return null;
  const localDir = process.env.LOCAL_DATA_DIR || path.join(process.cwd(), ".local");
  const candidates = [
    path.resolve(localDir, "storage", "osas", "uploads", storageFilename),
    path.resolve(localDir, "osas", "uploads", storageFilename),
    path.resolve(process.cwd(), ".local", "storage", "osas", "uploads", storageFilename),
  ];
  return candidates.find((p) => fs.existsSync(p)) || null;
}

export async function GET(req, ctx) {
  const access = await requireOfficeModule("osas_monitoring", { officeId: "osas" }, req);
  if (access === null) return NextResponse.json({ ok: false, error: "Authentication required" }, { status: 401 });
  if (!access) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });

  const { id } = await ctx.params;
  const report = await getPostEventReportById(id);
  if (!report) return NextResponse.json({ ok: false, error: "Report not found" }, { status: 404 });

  const fileParam = new URL(req.url).searchParams.get("file");
  if (fileParam) {
    const filename = fileParam === "liquidation" ? report.liquidation_storage_filename : report.narrative_storage_filename;
    const origName = fileParam === "liquidation" ? report.liquidation_original_filename : report.narrative_original_filename;
    const filePath = resolveFilePath(filename);

    if (!filePath || !fs.existsSync(/*turbopackIgnore: true*/ filePath)) {
      return NextResponse.json({ ok: false, error: "File not found on storage" }, { status: 404 });
    }

    const bytes = fs.readFileSync(/*turbopackIgnore: true*/ filePath);
    return new NextResponse(bytes, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${origName || "report.pdf"}"`,
      },
    });
  }

  return NextResponse.json({ ok: true, data: report });
}

export const POST_EVENT_ALLOWED_TRANSITIONS = {
  "Submitted": ["Under Review", "Cleared", "Declined"],
  "Under Review": ["Needs Revision", "Cleared", "Declined"], // Strictly forward-only!
  "Needs Revision": ["Under Review", "Declined"],
  "Cleared": ["Under Review", "Declined"],
  "Declined": ["Under Review"],
};

export async function PATCH(req, ctx) {
  const access = await requireOfficeModule("osas_monitoring", { officeId: "osas" }, req);
  if (access === null) return NextResponse.json({ ok: false, error: "Authentication required" }, { status: 401 });
  if (!access) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });

  const { id } = await ctx.params;
  const existingReport = await getPostEventReportById(id);
  if (!existingReport) return NextResponse.json({ ok: false, error: "Report not found" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const status = String(body?.status || "").trim();
  const note = String(body?.note || "").trim();

  const validStatuses = new Set(["Submitted", "Under Review", "Needs Revision", "Cleared", "Declined"]);
  if (!validStatuses.has(status)) {
    return NextResponse.json({ ok: false, error: "Valid status is required." }, { status: 400 });
  }

  const currentStatus = existingReport.status || "Submitted";

  // No-op if status is unchanged
  if (status === currentStatus) {
    if (note) {
      const updated = await updatePostEventReportStatus(id, {
        status: currentStatus,
        note,
        staffId: access.userId,
      });
      await writeGlobalAuditLog(req, "Added note to OSAS post-event report", {
        officeId: "osas",
        details: `Added note to post-event report #${id}: ${note}`,
        entity_type: "post_event_report",
        entity_id: String(id),
      });
      return NextResponse.json({ ok: true, data: updated });
    }
    return NextResponse.json({ ok: true, data: existingReport });
  }

  // 1. Validate State Machine Transition
  const allowedNext = POST_EVENT_ALLOWED_TRANSITIONS[currentStatus] || [];
  if (!allowedNext.includes(status)) {
    return NextResponse.json(
      {
        ok: false,
        error: `Invalid transition: cannot move post-event report from "${currentStatus}" to "${status}". Allowed transitions: ${allowedNext.join(", ") || "none"}.`,
      },
      { status: 400 }
    );
  }

  // 2. Guard: Revoking a Cleared report requires a written justification note (>= 5 chars)
  if (currentStatus === "Cleared" && (!note || note.length < 5)) {
    return NextResponse.json(
      {
        ok: false,
        error: "A written justification note (at least 5 characters) is required when revoking a cleared post-event clearance.",
      },
      { status: 400 }
    );
  }

  // 3. Guard: Reopening a Declined report requires an appeal/reconsideration note (>= 5 chars)
  if (currentStatus === "Declined" && (!note || note.length < 5)) {
    return NextResponse.json(
      {
        ok: false,
        error: "A written justification note (at least 5 characters) citing grounds for appeal or reconsideration is required to reopen a declined post-event report.",
      },
      { status: 400 }
    );
  }

  // 4. Guard: Requesting revisions requires instructions for the student organization (>= 5 chars)
  if (status === "Needs Revision" && (!note || note.length < 5)) {
    return NextResponse.json(
      {
        ok: false,
        error: "Detailed revision instructions (at least 5 characters) are required when requesting revisions for a post-event report.",
      },
      { status: 400 }
    );
  }

  const updated = await updatePostEventReportStatus(id, {
    status,
    note,
    staffId: access.userId,
  });

  if (!updated) {
    return NextResponse.json({ ok: false, error: "Report not found" }, { status: 404 });
  }

  await writeGlobalAuditLog(req, "Reviewed OSAS Post-Event Report", {
    officeId: "osas",
    details: `Updated post-event report #${id} to status: ${status}. Note: ${note || "None"}`,
    entity_type: "post_event_report",
    entity_id: String(id),
  });

  return NextResponse.json({ ok: true, data: updated });
}
