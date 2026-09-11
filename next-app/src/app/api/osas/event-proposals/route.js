import { NextResponse } from "next/server";
import { query } from "@/lib/postgres";
import { requireOfficeModule } from "@/lib/moduleAccess";
import { canAccessResource } from "@/lib/resourceAuthorization";

export const runtime = "nodejs";

export async function GET(req) {
  const access = await requireOfficeModule("osas_monitoring", { officeId: "osas" }, req);
  if (access === null) return NextResponse.json({ ok: false, error: "Authentication required" }, { status: 401 });
  if (!access) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  const { searchParams } = new URL(req.url);
  const status = String(searchParams.get("status") || "").trim();
  const includeArchived = searchParams.get("archived") === "1";
  const rows = await query(
    `SELECT ep.*, s.name AS student_name FROM event_proposals ep JOIN students s ON s.student_no = ep.student_no
     WHERE ep.office_id = 'osas' AND ep.archived_at ${includeArchived ? "IS NOT NULL" : "IS NULL"} ${status ? "AND ep.status = $1" : ""} ORDER BY ep.created_at DESC`,
    status ? [status] : []
  );
  return NextResponse.json({ ok: true, data: rows.filter((row) => canAccessResource(access, "proposal", row)) });
}
