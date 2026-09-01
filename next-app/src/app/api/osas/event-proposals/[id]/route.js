import fs from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { query, queryOne } from "@/lib/postgres";
import { requireOfficeModule } from "@/lib/moduleAccess";
import { headers } from "next/headers";

export const runtime = "nodejs";
const validStatuses = new Set(["Submitted", "Under Review", "Needs Revision", "Approved", "Declined"]);

export async function GET(req, ctx) {
  const access = await requireOfficeModule("osas_monitoring", { officeId: "osas" });
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
  return NextResponse.json({ ok: true, data: { ...proposal, updates } });
}

export async function PATCH(req, ctx) {
  const access = await requireOfficeModule("osas_monitoring", { officeId: "osas" });
  if (!access) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  const { id } = await ctx.params;
  const body = await req.json().catch(() => null);
  const status = String(body?.status || "").trim();
  const note = String(body?.note || "").trim();
  if (!validStatuses.has(status) || !note) return NextResponse.json({ ok: false, error: "A valid status and student-visible update are required." }, { status: 400 });
  const proposal = await queryOne("UPDATE event_proposals SET status = $1, updated_at = NOW() WHERE id = $2 AND office_id = 'osas' RETURNING *", [status, id]);
  if (!proposal) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  const requestHeaders = await headers();
  await query(`INSERT INTO transaction_updates (event_proposal_id, status, message, created_by)
    VALUES ($1, $2, $3, $4)`, [id, status, note, requestHeaders.get("x-user-id") || null]);
  return NextResponse.json({ ok: true, data: proposal });
}
