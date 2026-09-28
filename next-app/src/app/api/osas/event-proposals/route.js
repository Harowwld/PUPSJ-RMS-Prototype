import { NextResponse } from "next/server";
import { query } from "@/lib/postgres";
import { requireOfficeModule } from "@/lib/moduleAccess";
import { canAccessResource } from "@/lib/resourceAuthorization";
import { decryptPII } from "@/lib/piiEncryption";

export const runtime = "nodejs";

export async function GET(req) {
  const access = await requireOfficeModule("osas_monitoring", { officeId: "osas" }, req);
  if (access === null) return NextResponse.json({ ok: false, error: "Authentication required" }, { status: 401 });
  if (!access) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  const { searchParams } = new URL(req.url);
  const status = String(searchParams.get("status") || "").trim();

  const rows = await query(
    `SELECT ep.*,
            COALESCE(s.name, sa_student.name, ep.student_no, 'Student Officer') AS student_name,
            so.name AS verified_org_name,
            so.acronym AS org_acronym,
            so.category AS org_category
     FROM event_proposals ep
     LEFT JOIN students s ON s.student_no = ep.student_no
     LEFT JOIN student_accounts sa ON sa.id = ep.student_account_id
     LEFT JOIN students sa_student ON sa_student.student_no = sa.student_no
     LEFT JOIN student_organizations so ON so.id = ep.organization_id
     WHERE ep.office_id = 'osas'
       AND ep.archived_at IS NULL
       AND ep.status != 'Archived'
       ${status ? "AND ep.status = $1" : ""}
     ORDER BY ep.created_at DESC`,
    status ? [status] : []
  );
  const accessibleRows = rows.filter((row) => canAccessResource(access, "proposal", row)).map((r) => ({
    ...r,
    student_name: r.student_name ? decryptPII(r.student_name) : r.student_name,
  }));
  return NextResponse.json({ ok: true, data: accessibleRows });
}
