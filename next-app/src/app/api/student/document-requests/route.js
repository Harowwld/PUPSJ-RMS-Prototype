import { NextResponse } from "next/server";
import { getStudentSession } from "@/lib/studentAuth";
import { query, queryOne } from "@/lib/postgres";
import { writeGlobalAuditLog } from "@/lib/auditLogRequest";

export const runtime = "nodejs";

export async function GET(req) {
  const session = await getStudentSession(req);
  if (!session) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  let accountId = session.accountId;
  let studentNo = session.studentNo;
  const email = session.email;

  if (!accountId && email) {
    const acc = await queryOne(
      "SELECT id, student_no FROM student_accounts WHERE lower(coalesce(email, '')) = lower($1)",
      [email]
    );
    if (acc) {
      accountId = acc.id;
      studentNo = studentNo || acc.student_no;
    }
  }

  const requests = await query(
    `SELECT dr.*, d.approval_status AS linked_document_status
     FROM document_requests dr
     LEFT JOIN documents d ON d.id = dr.linked_document_id
     WHERE dr.office_id = 'registrar'
       AND (
         (dr.student_account_id IS NOT NULL AND dr.student_account_id = $1)
         OR ($2::text IS NOT NULL AND dr.student_no = $2)
       )
     ORDER BY dr.created_at DESC`,
    [accountId, studentNo]
  );

  const studentNos = Array.from(
    new Set([studentNo, ...requests.map((r) => r.student_no)].filter(Boolean))
  );

  const documents = studentNos.length
    ? await query(
        "SELECT * FROM documents WHERE office_id = 'registrar' AND student_no = ANY($1::text[]) ORDER BY created_at DESC",
        [studentNos]
      )
    : [];

  const ids = requests.map((item) => item.id);
  const updates = ids.length
    ? await query(
        "SELECT * FROM transaction_updates WHERE document_request_id = ANY($1::bigint[]) ORDER BY created_at ASC",
        [ids]
      )
    : [];
  const updatesByRequest = updates.reduce((grouped, item) => {
    const key = String(item.document_request_id);
    (grouped[key] ||= []).push(item);
    return grouped;
  }, {});
  requests.forEach((item) => {
    item.updates = updatesByRequest[String(item.id)] || [];
  });

  return NextResponse.json({ ok: true, data: { requests, documents } });
}

export async function POST(req) {
  const session = await getStudentSession(req);
  if (!session) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const studentNo = String(body?.studentNo || "").trim().toUpperCase() || null;
  const docType = String(body?.docType || "").trim();
  const notes = String(body?.notes || body?.description || "").trim();
  const requestedClientType = String(body?.clientType || "").trim();

  let accountId = session.accountId;
  let acc = null;
  if (accountId) {
    acc = await queryOne(
      "SELECT id, first_name, middle_name, last_name, email, client_type, student_no FROM student_accounts WHERE id = $1",
      [accountId]
    );
  } else if (session.email) {
    acc = await queryOne(
      "SELECT id, first_name, middle_name, last_name, email, client_type, student_no FROM student_accounts WHERE lower(coalesce(email, '')) = lower($1)",
      [session.email]
    );
    if (acc) accountId = acc.id;
  }

  const clientType = requestedClientType || acc?.client_type || (studentNo && studentNo.startsWith("ALUM-") ? "Alumni" : "Student");

  if (!clientType) {
    return NextResponse.json({ ok: false, error: "Client type is required." }, { status: 400 });
  }

  if (!docType) {
    return NextResponse.json({ ok: false, error: "Document type is required." }, { status: 400 });
  }

  if (!notes) {
    return NextResponse.json(
      { ok: false, error: "Description / purpose of request is required." },
      { status: 400 }
    );
  }

  const validType = await queryOne(
    "SELECT id FROM document_types WHERE office_id = 'registrar' AND name = $1 AND status = 'Active'",
    [docType]
  );
  if (!validType) {
    return NextResponse.json({ ok: false, error: "Invalid document type." }, { status: 400 });
  }

  // If a student number is provided, ensure the student record exists in students table
  if (studentNo) {
    const existingStudent = await queryOne("SELECT student_no FROM students WHERE upper(student_no) = upper($1)", [studentNo]);
    if (!existingStudent) {
      const studentName = [acc?.first_name, acc?.middle_name, acc?.last_name].filter(Boolean).join(" ") || acc?.email || studentNo;
      await query(
        `INSERT INTO students (student_no, name, status)
         VALUES ($1, $2, 'Active')
         ON CONFLICT (student_no) DO NOTHING`,
        [studentNo, studentName]
      );
    }
  }

  const request = await queryOne(
    `INSERT INTO document_requests (office_id, student_no, doc_type, status, notes, client_type, student_account_id)
     VALUES ('registrar', $1, $2, 'Pending', $3, $4, $5) RETURNING *`,
    [studentNo, docType, notes, clientType, accountId || null]
  );

  await query(
    `INSERT INTO transaction_updates (document_request_id, status, message)
     VALUES ($1, 'Pending', 'Request submitted.')`,
    [request.id]
  );

  await writeGlobalAuditLog(req, "Student document request created", {
    actor: acc?.email || session.email || studentNo || "Student",
    role: "Student",
    officeId: "registrar",
    details: `Requested ${docType} (${clientType})${studentNo ? ` for ${studentNo}` : ""}`,
    entity_type: "document_request",
    entity_id: String(request.id),
  });

  return NextResponse.json({ ok: true, data: request }, { status: 201 });
}
