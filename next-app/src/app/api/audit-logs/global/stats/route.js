import { NextResponse } from "next/server";
import { getGlobalAuditLogStats } from "@/lib/auditLogsRepo";
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
    const officeId = searchParams.get("officeId") || "";
    const severity = searchParams.get("severity") || "";
    const role = searchParams.get("role") || "";
    const startDate = searchParams.get("startDate") || "";
    const endDate = searchParams.get("endDate") || "";
    const search = searchParams.get("search") || "";

    const stats = await getGlobalAuditLogStats({
      officeId,
      severity,
      role,
      startDate,
      endDate,
      search,
    });
    return NextResponse.json({ ok: true, data: stats });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
