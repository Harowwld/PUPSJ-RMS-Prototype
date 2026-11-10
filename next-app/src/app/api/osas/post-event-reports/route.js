import { NextResponse } from "next/server";
import { requireOfficeModule } from "@/lib/moduleAccess";
import { listPostEventReports } from "@/lib/osasPostEventRepo";
import { query } from "@/lib/postgres";

export const runtime = "nodejs";

export async function GET(req) {
  const access = await requireOfficeModule("osas_monitoring", { officeId: "osas" }, req);
  if (access === null) return NextResponse.json({ ok: false, error: "Authentication required" }, { status: 401 });
  if (!access) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const status = String(searchParams.get("status") || "").trim();
  const organizationId = String(searchParams.get("organizationId") || "").trim();
  const search = String(searchParams.get("search") || "").trim();
  const paged = searchParams.has("limit");
  const limit = Math.min(100, Math.max(1, Number.parseInt(searchParams.get("limit") || "20", 10) || 20));
  const offset = Math.max(0, Number.parseInt(searchParams.get("offset") || "0", 10) || 0);
  const conditions = [];
  const params = [];
  if (status && status !== "All") {
    params.push(status);
    conditions.push(`per.status = $${params.length}`);
  }
  if (organizationId) {
    params.push(organizationId);
    conditions.push(`per.organization_id = $${params.length}`);
  }
  if (search) {
    params.push(`%${search.toLowerCase()}%`);
    conditions.push(`(lower(ep.title) LIKE $${params.length} OR lower(so.name) LIKE $${params.length}
      OR lower(coalesce(so.acronym, '')) LIKE $${params.length} OR lower(per.submitted_by_email) LIKE $${params.length})`);
  }
  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const [countRows, organizationRows] = await Promise.all([
    query(`SELECT COUNT(*)::int AS total FROM osas_post_event_reports per
      JOIN event_proposals ep ON ep.id = per.event_proposal_id
      JOIN student_organizations so ON so.id = per.organization_id ${where}`, params),
    query(`SELECT DISTINCT so.name FROM osas_post_event_reports per
      JOIN student_organizations so ON so.id = per.organization_id ORDER BY so.name`),
  ]);

  const reports = await listPostEventReports({
    status: status || undefined,
    organizationId: organizationId || undefined,
    search: search || undefined,
    limit: paged ? limit : undefined,
    offset,
  });

  return NextResponse.json({ ok: true, data: reports, total: countRows[0]?.total || 0, organizations: organizationRows.map((row) => row.name) });
}
