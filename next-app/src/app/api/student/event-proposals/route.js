import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { getStudentSession } from "@/lib/studentAuth";
import { query, queryOne } from "@/lib/postgres";
import { writeGlobalAuditLog } from "@/lib/auditLogRequest";

export const runtime = "nodejs";

function uploadsDir() {
  const localDir = process.env.LOCAL_DATA_DIR || path.join(process.cwd(), ".local");
  const dir = path.join(localDir, "storage", "osas", "uploads");
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export async function GET(req) {
  const session = await getStudentSession(req);
  if (!session) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  const proposals = await query("SELECT * FROM event_proposals WHERE student_no = $1 ORDER BY created_at DESC", [session.studentNo]);
  const ids = proposals.map((item) => item.id);
  const updates = ids.length
    ? await query("SELECT * FROM transaction_updates WHERE event_proposal_id = ANY($1::bigint[]) ORDER BY created_at ASC", [ids])
    : [];
  const updatesByProposal = updates.reduce((grouped, item) => {
    const key = String(item.event_proposal_id);
    (grouped[key] ||= []).push(item);
    return grouped;
  }, {});
  proposals.forEach((item) => { item.updates = updatesByProposal[String(item.id)] || []; });
  return NextResponse.json({ ok: true, data: proposals });
}

export async function POST(req) {
  const session = await getStudentSession(req);
  if (!session) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  const form = await req.formData().catch(() => null);
  const title = String(form?.get("title") || "").trim();
  const organizationName = String(form?.get("organizationName") || "").trim();
  const eventDate = String(form?.get("eventDate") || "").trim();
  const file = form?.get("file");
  if (!title || !organizationName || !eventDate || !file || typeof file === "string" || file.type !== "application/pdf") {
    return NextResponse.json({ ok: false, error: "Title, organization, event date, and one PDF proposal are required." }, { status: 400 });
  }
  const storageFilename = `${crypto.randomUUID()}.pdf`;
  const fileBytes = Buffer.from(await file.arrayBuffer());
  fs.writeFileSync(path.join(uploadsDir(), storageFilename), fileBytes);
  try {
    const legacyDir = path.join(process.env.LOCAL_DATA_DIR || path.join(process.cwd(), ".local"), "osas", "uploads");
    fs.mkdirSync(legacyDir, { recursive: true });
    fs.writeFileSync(path.join(legacyDir, storageFilename), fileBytes);
  } catch {}
  const proposal = await queryOne(
    `INSERT INTO event_proposals (office_id, student_no, title, organization_name, event_date, original_filename, storage_filename, mime_type, size_bytes, status)
     VALUES ('osas', $1, $2, $3, $4, $5, $6, $7, $8, 'Submitted') RETURNING *`,
    [session.studentNo, title, organizationName, eventDate, file.name || "event-proposal.pdf", storageFilename, file.type, file.size]
  );
  await query(`INSERT INTO transaction_updates (event_proposal_id, status, message)
    VALUES ($1, 'Submitted', 'Event proposal submitted.')`, [proposal.id]);
  await writeGlobalAuditLog(req, "Student event proposal submitted", { actor: session.studentNo, role: "Student", officeId: "osas", details: `Submitted ${title}`, entity_type: "event_proposal", entity_id: String(proposal.id) });
  return NextResponse.json({ ok: true, data: proposal }, { status: 201 });
}
