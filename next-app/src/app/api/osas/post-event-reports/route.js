import { NextResponse } from "next/server";
import { requireOfficeModule } from "@/lib/moduleAccess";
import { listPostEventReports } from "@/lib/osasPostEventRepo";

export const runtime = "nodejs";

export async function GET(req) {
  const access = await requireOfficeModule("osas_monitoring", { officeId: "osas" }, req);
  if (access === null) return NextResponse.json({ ok: false, error: "Authentication required" }, { status: 401 });
  if (!access) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const status = String(searchParams.get("status") || "").trim();
  const organizationId = String(searchParams.get("organizationId") || "").trim();
  const search = String(searchParams.get("search") || "").trim();

  const reports = await listPostEventReports({
    status: status || undefined,
    organizationId: organizationId || undefined,
    search: search || undefined,
  });

  return NextResponse.json({ ok: true, data: reports });
}
