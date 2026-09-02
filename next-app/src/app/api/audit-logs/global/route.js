import { NextResponse } from "next/server";
import { listGlobalAuditLogs, countGlobalAuditLogs } from "@/lib/auditLogsRepo";
import { verifySessionToken, getSessionCookieName } from "@/lib/jwt";

export const runtime = "nodejs";

async function isSuperAdmin(req) {
  try {
    const token = req.cookies.get(getSessionCookieName())?.value;
    if (!token) return false;
    const payload = await verifySessionToken(token);
    return payload.role === "SuperAdmin";
  } catch {
    return false;
  }
}

export async function GET(req) {
  if (!await isSuperAdmin(req)) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");
    const search = searchParams.get("search") || "";
    const officeId = searchParams.get("officeId") || "";
    const severity = searchParams.get("severity") || "";
    const role = searchParams.get("role") || "";
    const startDate = searchParams.get("startDate") || "";
    const endDate = searchParams.get("endDate") || "";
    const sortBy = searchParams.get("sortBy") || "created_at";
    const sortOrder = searchParams.get("sortOrder") || "DESC";

    const queryOpts = {
      limit,
      offset,
      search,
      officeId,
      severity,
      role,
      startDate,
      endDate,
      sortBy,
      sortOrder,
    };

    const [rows, total] = await Promise.all([
      listGlobalAuditLogs(queryOpts),
      countGlobalAuditLogs({ ...queryOpts, limit: undefined, offset: undefined }),
    ]);

    return NextResponse.json({ ok: true, data: rows, total });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
