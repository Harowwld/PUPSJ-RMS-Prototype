import { NextResponse } from "next/server";
import { listAuditLogs, countAuditLogs } from "../../../lib/auditLogsRepo";
import { decryptPII } from "../../../lib/piiEncryption";
import { getPrincipalOfficeId, isAdmin, requireAuth, createAuthErrorResponse } from "../../../lib/authHelpers";
import { isSystemAdminRole } from "../../../lib/roleUtils";
import { addAuditActorIds } from "../../../lib/auditActor";
import { formatLogDetails } from "../../../lib/auditLogFormatting";

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
  const officeId = isGlobalAdmin || isStudent || mine ? "" : getPrincipalOfficeId(auth.user);

  if (!mine) {
    if (!isAdmin(auth.user)) return createAuthErrorResponse("Access denied", 403);
    if (!isStudent && !isGlobalAdmin && !officeId) return createAuthErrorResponse("Office scope is required", 403);
  }

  let resolvedActors = [];
  if (mine) {
    if (isStudent) {
      resolvedActors = [
        auth.user.studentNo,
        auth.user.email,
        `${auth.user.fname || ""} ${auth.user.lname || ""}`.trim(),
      ].filter(Boolean);
    } else {
      const displayName = `${auth.user.fname || ""} ${auth.user.lname || ""}`.trim();
      resolvedActors = [
        displayName,
        auth.user.email,
        auth.user.id,
        auth.user.username,
      ].filter(Boolean);
    }

    if (resolvedActors.length === 0) {
      return NextResponse.json({ ok: true, data: [], total: 0 });
    }
  }

  const [rows, total] = await Promise.all([
    listAuditLogs({
      limit,
      offset,
      search,
      actorExact: mine ? resolvedActors : "",
      officeId,
      role: isStudent ? "Student" : role,
      severity,
      startDate,
      endDate,
      sortBy,
      sortOrder,
    }),
    countAuditLogs({
      search,
      actorExact: mine ? resolvedActors : "",
      officeId,
      role: isStudent ? "Student" : role,
      severity,
      startDate,
      endDate,
    }),
  ]);

  return NextResponse.json({
    ok: true,
    data: await addAuditActorIds(rows.map(r => ({
      ...r,
      actor: decryptPII(r.actor),
      details: formatLogDetails(decryptPII(r.details)),
    }))),
    total,
  });
}

export async function POST(req) {
  const auth = await requireAuth(req);
  if (auth.error || !auth.user) {
    return createAuthErrorResponse(auth.error || "Authentication required", 401);
  }

  try {
    const body = await req.json();
    const action = String(body.action || "").trim();
    if (!action) {
      return NextResponse.json({ ok: false, error: "Action is required" }, { status: 400 });
    }

    const { writeAuditLog } = await import("../../../lib/auditLogRequest");
    await writeAuditLog(req, action, {
      actor: body.actor,
      role: body.role,
      details: formatLogDetails(body.details || ""),
      severity: body.severity || "INFO",
      entity_type: body.entity_type || "",
      entity_id: body.entity_id || "",
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[POST /api/audit-logs] Error:", err);
    return NextResponse.json({ ok: false, error: "Unable to save activity history." }, { status: 500 });
  }
}
