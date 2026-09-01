import { NextResponse } from "next/server";
import { getStudentSession } from "@/lib/studentAuth";
import { query, queryOne } from "@/lib/postgres";
import { writeGlobalAuditLog } from "@/lib/auditLogRequest";

export const runtime = "nodejs";

export async function GET() {
  const session = await getStudentSession();
  if (!session) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  const [requests, documents] = await Promise.all([
    query(`SELECT dr.*, d.approval_status AS linked_document_status
      FROM document_requests dr LEFT JOIN documents d ON d.id = dr.linked_document_id
      WHERE dr.office_id = 'registrar' AND dr.student_no = $1 ORDER BY dr.created_at DESC`, [session.studentNo]),
    query("SELECT * FROM documents WHERE office_id = 'registrar' AND student_no = $1 ORDER BY created_at DESC", [session.studentNo]),
  ]);
  const ids = requests.map((item) => item.id);
  const updates = ids.length
    ? await query("SELECT * FROM transaction_updates WHERE document_request_id = ANY($1::bigint[]) ORDER BY created_at ASC", [ids])
    : [];
  const updatesByRequest = updates.reduce((grouped, item) => {
    const key = String(item.document_request_id);
    (grouped[key] ||= []).push(item);
    return grouped;
  }, {});
  requests.forEach((item) => { item.updates = updatesByRequest[String(item.id)] || []; });
  return NextResponse.json({ ok: true, data: { requests, documents } });
}

export async function POST(req) {
  const session = await getStudentSession();
  if (!session) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => null);
  const docType = String(body?.docType || "").trim();
  const notes = String(body?.notes || "").trim() || null;
  if (!docType) return NextResponse.json({ ok: false, error: "Document type is required." }, { status: 400 });
  const validType = await queryOne("SELECT id FROM document_types WHERE office_id = 'registrar' AND name = $1 AND status = 'Active'", [docType]);
  if (!validType) return NextResponse.json({ ok: false, error: "Invalid document type." }, { status: 400 });
  const request = await queryOne(
    `INSERT INTO document_requests (office_id, student_no, doc_type, status, notes)
     VALUES ('registrar', $1, $2, 'Pending', $3) RETURNING *`,
    [session.studentNo, docType, notes]
  );
  await query(`INSERT INTO transaction_updates (document_request_id, status, message)
    VALUES ($1, 'Pending', 'Request submitted.')`, [request.id]);
  await writeGlobalAuditLog(req, "Student document request created", { actor: session.studentNo, role: "Student", officeId: "registrar", details: `Requested ${docType}`, entity_type: "document_request", entity_id: String(request.id) });
  return NextResponse.json({ ok: true, data: request }, { status: 201 });
}
