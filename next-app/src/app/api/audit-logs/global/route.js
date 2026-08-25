import { NextResponse } from "next/server";
import { listGlobalAuditLogs, countGlobalAuditLogs } from "@/lib/auditLogsRepo";
import { verifySessionToken, getSessionCookieName } from "@/lib/jwt";
import { cookies } from "next/headers";

export const runtime = "nodejs";

async function isSuperAdmin() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(getSessionCookieName())?.value;
    if (!token) return false;
    const payload = await verifySessionToken(token);
    return payload.role === "SuperAdmin";
  } catch {
    return false;
  }
}

export async function GET(req) {
  if (!await isSuperAdmin()) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");
    const search = searchParams.get("search") || "";
    const officeId = searchParams.get("officeId") || "";
    const severity = searchParams.get("severity") || "";
    const startDate = searchParams.get("startDate") || "";
    const endDate = searchParams.get("endDate") || "";

    const [rows, total] = await Promise.all([
      listGlobalAuditLogs({ limit, offset, search, officeId, severity, startDate, endDate }),
      countGlobalAuditLogs({ search, officeId, severity, startDate, endDate }),
    ]);

    return NextResponse.json({ ok: true, data: rows, total });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
