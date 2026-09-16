import { NextResponse } from "next/server";
import { listAuditLogs, countAuditLogs } from "../../../lib/auditLogsRepo";
import { getPrincipalOfficeId, isAdmin, requireAuth, createAuthErrorResponse } from "../../../lib/authHelpers";
import { isSystemAdminRole } from "../../../lib/roleUtils";

export const runtime = "nodejs";

export async function GET(req) {
  const auth = await requireAuth(req);
  if (auth.error || !auth.user) return createAuthErrorResponse(auth.error || "Authentication required", auth.error?.startsWith("Access denied") ? 403 : 401);
  const { searchParams } = new URL(req.url);
  const limit = parseInt(searchParams.get("limit") || "200");
  const offset = parseInt(searchParams.get("offset") || "0");
  const search = searchParams.get("search") || "";
  const role = searchParams.get("role") || "";
  const severity = searchParams.get("severity") || "";
  const startDate = searchParams.get("startDate") || "";
  const endDate = searchParams.get("endDate") || "";
  const sortBy = searchParams.get("sortBy") || "created_at";
  const sortOrder = searchParams.get("sortOrder") || "DESC";
  const mine = searchParams.get("mine") === "1";
  const isStudent = auth.user.principalType === "student";
  const isGlobalAdmin = isSystemAdminRole(auth.user.role);
  const officeId = isGlobalAdmin || isStudent ? "" : getPrincipalOfficeId(auth.user);
  if (!mine && !isAdmin(auth.user)) return createAuthErrorResponse("Access denied", 403);
  if (!isStudent && !isGlobalAdmin && !officeId) return createAuthErrorResponse("Office scope is required", 403);
  const resolvedActor = mine
    ? (auth.user.studentNo || `${auth.user.fname || ""} ${auth.user.lname || ""}`.trim())
    : "";

  if (mine && !resolvedActor) {
    return NextResponse.json({ ok: true, data: [], total: 0 });
  }

  const [rows, total] = await Promise.all([
    listAuditLogs({ limit, offset, search, actorExact: resolvedActor, officeId, role: isStudent ? "Student" : role, severity, startDate, endDate, sortBy, sortOrder }),
    countAuditLogs({ search, actorExact: resolvedActor, officeId, role: isStudent ? "Student" : role, severity, startDate, endDate }),
  ]);

  return NextResponse.json({ ok: true, data: rows, total });
}
