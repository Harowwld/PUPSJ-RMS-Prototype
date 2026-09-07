import { NextResponse } from "next/server";
import { dbGet, dbAll } from "@/lib/postgresCompat.js";

export const runtime = "nodejs";

function maskStudentNo(sn) {
  if (!sn) return "Alumni Record";
  const s = String(sn).trim();
  if (s.length <= 6) return "****";
  // e.g. 2022-00123-SJ-0 -> 2022-****-0
  return s.slice(0, 4) + "-****-" + s.slice(-2);
}

function maskName(name) {
  if (!name || name === "Student / Alumnus") return "Student / Alumnus";
  const parts = String(name).trim().split(/\s+/);
  return parts
    .map((p) => (p.length > 2 ? `${p[0]}***${p[p.length - 1]}` : `${p[0]}*`))
    .join(" ");
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const rawTicket = searchParams.get("ticket") || "";
    const cleanDigits = rawTicket.replace(/[^0-9]/g, "");
    
    if (!cleanDigits) {
      return NextResponse.json(
        { ok: false, error: "Please enter a valid ticket number (e.g. 104 or REQ-2026-0104)." },
        { status: 400 }
      );
    }

    const ticketId = parseInt(cleanDigits, 10);
    if (!Number.isFinite(ticketId) || ticketId <= 0) {
      return NextResponse.json(
        { ok: false, error: "Invalid ticket reference number." },
        { status: 400 }
      );
    }

    const row = await dbGet(
      `
      SELECT 
        dr.id, 
        dr.student_no, 
        dr.doc_type, 
        dr.status, 
        dr.created_at, 
        dr.client_type,
        COALESCE(s.name, NULLIF(TRIM(CONCAT_WS(' ', sa.first_name, sa.last_name)), ''), 'Student / Alumnus') as requester_name
      FROM document_requests dr
      LEFT JOIN students s ON s.student_no = dr.student_no
      LEFT JOIN student_accounts sa ON sa.id = dr.student_account_id
      WHERE dr.id = ?
      `,
      [ticketId]
    );

    if (!row) {
      return NextResponse.json(
        { ok: false, error: `Ticket #${ticketId} was not found in our records. Please check the number or contact the Registrar.` },
        { status: 404 }
      );
    }

    const updates = await dbAll(
      `
      SELECT id, status, message, created_at 
      FROM transaction_updates 
      WHERE document_request_id = ? 
      ORDER BY created_at ASC
      `,
      [ticketId]
    );

    return NextResponse.json({
      ok: true,
      data: {
        id: row.id,
        doc_type: row.doc_type,
        status: row.status || "Pending",
        created_at: row.created_at,
        client_type: row.client_type || "Student",
        masked_student_no: maskStudentNo(row.student_no),
        masked_name: maskName(row.requester_name),
        updates: updates || []
      }
    });

  } catch (err) {
    console.error("GET /api/public/track-request error:", err);
    return NextResponse.json(
      { ok: false, error: "Unable to retrieve ticket status. Please try again later." },
      { status: 500 }
    );
  }
}
