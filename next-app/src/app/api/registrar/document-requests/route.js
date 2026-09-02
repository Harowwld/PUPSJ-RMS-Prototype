import { NextResponse } from "next/server";
import { query } from "@/lib/postgres";
import { requireOfficeModule } from "@/lib/moduleAccess";

export const runtime = "nodejs";

export async function GET(req) {
  const access = await requireOfficeModule("alumni_requests", { officeId: "registrar" }, req);
  if (!access) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  const rows = await query(`SELECT dr.*, s.name AS student_name FROM document_requests dr
    JOIN students s ON s.student_no = dr.student_no WHERE dr.office_id = 'registrar' ORDER BY dr.created_at DESC`);
  return NextResponse.json({ ok: true, data: rows });
}
