import fs from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { query, queryOne } from "@/lib/postgres";
import { requireOfficeModule } from "@/lib/moduleAccess";
import { writeGlobalAuditLog } from "@/lib/auditLogRequest";

export const runtime = "nodejs";
const validStatuses = new Set(["Submitted", "Under Review", "Needs Revision", "Approved", "Declined"]);

export async function GET(req, ctx) {
  const access = await requireOfficeModule("osas_monitoring", { officeId: "osas" }, req);
  if (!access) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  const { id } = await ctx.params;
  const proposal = await queryOne("SELECT * FROM event_proposals WHERE id = $1 AND office_id = 'osas'", [id]);
  if (!proposal) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  if (new URL(req.url).searchParams.get("file") === "1") {
    const filePath = path.join(process.env.LOCAL_DATA_DIR || path.join(process.cwd(), ".local"), "osas", "uploads", proposal.storage_filename);
    if (!fs.existsSync(filePath)) return NextResponse.json({ ok: false, error: "File missing" }, { status: 404 });
    const bytes = fs.readFileSync(filePath);
    return new NextResponse(bytes, { headers: { "Content-Type": proposal.mime_type, "Content-Disposition": `inline; filename=\"${proposal.original_filename}\"` } });
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

export async function PATCH(req, ctx) {
  const access = await requireOfficeModule("osas_monitoring", { officeId: "osas" }, req);
  if (!access) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  const { id } = await ctx.params;
  const body = await req.json().catch(() => null);
  if (body?.archive === true) {
    const archived = await queryOne("UPDATE event_proposals SET status = 'Archived', archived_at = NOW(), updated_at = NOW() WHERE id = $1 AND office_id = 'osas' AND archived_at IS NULL RETURNING *", [id]);
    if (!archived) return NextResponse.json({ ok: false, error: "Proposal not found or already archived." }, { status: 404 });
    await writeGlobalAuditLog(req, "Archived OSAS proposal", {
      officeId: "osas",
      details: `Archived ${archived.title}.`,
      entity_type: "event_proposal",
      entity_id: String(id),
    });
    await query(`INSERT INTO transaction_updates (event_proposal_id, status, message, created_by)
      VALUES ($1, 'Archived', 'Event proposal archived by OSAS.', $2)`, [id, access.userId || null]);
    return NextResponse.json({ ok: true, data: archived });
  }
  const status = String(body?.status || "").trim();
  const note = String(body?.note || "").trim();
  if (!validStatuses.has(status) || !note) return NextResponse.json({ ok: false, error: "A valid status and student-visible update are required." }, { status: 400 });
  const proposal = await queryOne("UPDATE event_proposals SET status = $1, updated_at = NOW() WHERE id = $2 AND office_id = 'osas' RETURNING *", [status, id]);
  if (!proposal) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  await query(`INSERT INTO transaction_updates (event_proposal_id, status, message, created_by)
    VALUES ($1, $2, $3, $4)`, [id, status, note, access.userId || null]);
  await writeGlobalAuditLog(req, "Updated OSAS proposal status", {
    officeId: "osas",
    details: `Changed ${proposal.title} to ${status}. ${note}`,
    entity_type: "event_proposal",
    entity_id: String(id),
  });
  return NextResponse.json({ ok: true, data: proposal });
}
