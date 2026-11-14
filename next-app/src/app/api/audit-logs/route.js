import { NextResponse } from "next/server";
import { listAuditLogs, countAuditLogs, createGlobalAuditLog } from "../../../lib/auditLogsRepo";
import { decryptPII } from "../../../lib/piiEncryption";
import { getPrincipalOfficeId, isAdmin, requireAuth, createAuthErrorResponse } from "../../../lib/authHelpers";
import { isSystemAdminRole } from "../../../lib/roleUtils";
import { addAuditActorIds, getPrincipalActorIdentities } from "../../../lib/auditActor";
import { formatLogDetails } from "../../../lib/auditLogFormatting";
import { getStaffFullName } from "../../../lib/staffRepo";
import { formatPHDateTime } from "@/lib/timeFormat";
import { createAuditLogCsvResponse, generateServerAuditLogsPdf } from "@/lib/auditLogExport";
import { writeAuditLog } from "@/lib/auditLogRequest";

export const runtime = "nodejs";

const CLIENT_AUDIT_EVENTS = {
  "Export Student Directory": {
    action: "Student Directory Export Requested",
    details: "Requested a student directory CSV export.",
    entity_type: "StudentDirectory",
    severity: "WARNING",
  },
  "Exported Activity History to CSV": {
    action: "Activity History CSV Export Requested",
    details: "Requested an activity history CSV export.",
    entity_type: "Report",
  },
  "Generated Activity History PDF Report": {
    action: "Activity History PDF Preview Requested",
    details: "Requested an activity history PDF preview.",
    entity_type: "Report",
  },
  "Export Taxonomy": {
    action: "Taxonomy CSV Export Requested",
    details: "Requested a taxonomy CSV export.",
    entity_type: "Report",
  },
  "Export CSV": {
    action: "Report CSV Export Requested",
    details: "Requested a report CSV export.",
    entity_type: "Report",
  },
  "Generate Report": {
    action: "Report Download Requested",
    details: "Requested a report download.",
    entity_type: "Report",
  },
  "Generate OSAS Compliance PDF": {
    action: "OSAS Compliance PDF Preview Requested",
    details: "Requested an OSAS compliance PDF preview.",
    entity_type: "Report",
  },
  "Print Report": {
    action: "Report Print Requested",
    details: "Requested a report print dialog.",
    entity_type: "Report",
  },
};

export async function GET(req) {
  const auth = await requireAuth(req);
  if (auth.error || !auth.user) return createAuthErrorResponse(auth.error || "Authentication required", auth.error?.startsWith("Access denied") ? 403 : 401);
  const { searchParams } = new URL(req.url);
  const limit = parseInt(searchParams.get("limit") || "200");
  const offset = parseInt(searchParams.get("offset") || "0");
  const search = searchParams.get("search") || "";
  const role = searchParams.get("role") || "";
  const excludeRole = searchParams.get("excludeRole") || "";
  const severity = searchParams.get("severity") || "";
  const excludeSeverity = searchParams.get("excludeSeverity") || "";
  const startDate = searchParams.get("startDate") || "";
  const endDate = searchParams.get("endDate") || "";
  const sortBy = searchParams.get("sortBy") || "created_at";
  const sortOrder = searchParams.get("sortOrder") || "DESC";
  const mine = searchParams.get("mine") === "1";
  const format = searchParams.get("format");
  const isStudent = auth.user.principalType === "student";
  const isGlobalAdmin = isSystemAdminRole(auth.user.role);
  const officeParam = searchParams.get("office") || searchParams.get("officeId") || "";
  const officeId = isGlobalAdmin ? officeParam : (isStudent || mine ? "" : getPrincipalOfficeId(auth.user));

  if (!mine) {
    if (!isAdmin(auth.user)) return createAuthErrorResponse("Access denied", 403);
    if (!isStudent && !isGlobalAdmin && !officeId) return createAuthErrorResponse("Office scope is required", 403);
  }

  let actorId = "";
  let resolvedActors = [];
  if (mine) {
    actorId = isStudent ? (auth.user.studentNo || auth.user.student_no || auth.user.id) : auth.user.id;
    resolvedActors = await getPrincipalActorIdentities(auth.user);

    if (!actorId && resolvedActors.length === 0) {
      return NextResponse.json({ ok: true, data: [], total: 0 });
    }
  }

  const queryOptions = {
    search,
    actorId: mine ? actorId : "",
    actorExact: mine ? resolvedActors : "",
    officeId,
    role: isStudent ? "Student" : role,
    excludeRole: isStudent ? "" : excludeRole,
    severity,
    excludeSeverity,
    startDate,
    endDate,
    sortBy,
    sortOrder,
    groupBy: searchParams.get("groupBy"),
  };
  const decorateRows = async (rows) => addAuditActorIds(rows.map((row) => ({
    ...row,
    actor: decryptPII(row.actor),
    details: formatLogDetails(decryptPII(row.details)),
  })));

  if (format === "csv") {
    return createAuditLogCsvResponse({
      filename: "activity-history.csv",
      headers: ["Date & Time", "Severity", "Actor", "Role", "Action", "Details", "IP Address", "User Agent", "Entity Type", "Entity ID"],
      loadPage: async ({ limit: pageLimit, offset: pageOffset }) => decorateRows(await listAuditLogs({ ...queryOptions, limit: pageLimit, offset: pageOffset })),
      mapRow: (log) => [
        log?.created_at ? formatPHDateTime(log.created_at) : (log?.time || "N/A"),
        log?.severity || "INFO",
        log?.actor_display_name || log?.user || log?.actor || "System",
        log?.role || "N/A",
        log?.action || "N/A",
        formatLogDetails(log?.details) || "No known description",
        log?.ip || "N/A",
        log?.user_agent || log?.userAgent || "N/A",
        log?.entity_type || log?.entityType || "N/A",
        log?.entity_id || log?.entityId || "N/A",
      ],
      onComplete: (exportedCount) => writeAuditLog(req, "Exported Activity History to CSV", {
        details: `Exported ${exportedCount} records. Filters - Role: ${role || "All"}, Severity: ${severity || "All"}, Search: ${search || "None"}`,
      }),
    });
  }

  if (format === "pdf") {
    const exportedRows = [];
    for (let pageOffset = 0; ; pageOffset += 500) {
      const pageRows = await listAuditLogs({ ...queryOptions, limit: 500, offset: pageOffset });
      if (!pageRows.length) break;
      exportedRows.push(...await decorateRows(pageRows));
      if (pageRows.length < 500) break;
    }
    const pdf = await generateServerAuditLogsPdf(exportedRows, { role, severity, startDate, endDate, search });
    await writeAuditLog(req, "Generated Activity History PDF Report", {
      details: `Generated report for ${exportedRows.length} records. Filters - Role: ${role || "All"}, Severity: ${severity || "All"}`,
    });
    return new Response(await pdf.arrayBuffer(), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="activity-history.pdf"',
        "Cache-Control": "private, no-store",
      },
    });
  }

  const [rows, total] = await Promise.all([
    listAuditLogs({
      ...queryOptions,
      limit,
      offset,
    }),
    countAuditLogs(queryOptions),
  ]);

  return NextResponse.json({
    ok: true,
    data: await decorateRows(rows),
    total,
  });
}

export async function POST(req) {
  const auth = await requireAuth(req);
  if (auth.error || !auth.user) {
    return createAuthErrorResponse(auth.error || "Authentication required", 401);
  }

  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object" || Array.isArray(body) ||
        typeof body.action !== "string" || Object.keys(body).some((key) => key !== "action")) {
      return NextResponse.json({ ok: false, error: "A client event action is required" }, { status: 400 });
    }
    const event = Object.hasOwn(CLIENT_AUDIT_EVENTS, body.action) ? CLIENT_AUDIT_EVENTS[body.action] : null;
    if (!event) return NextResponse.json({ ok: false, error: "Unsupported client event" }, { status: 400 });
    if (auth.user.principalType !== "staff" || !isAdmin(auth.user)) {
      return createAuthErrorResponse("Access denied", 403);
    }

    const forwardedIp = req.headers.get("x-forwarded-for") || "";
    const ip = forwardedIp.split(",")[0].trim() || req.headers.get("x-real-ip") || null;
    await createGlobalAuditLog({
      actor: getStaffFullName(auth.user),
      actor_id: auth.user.id,
      role: auth.user.role,
      officeId: getPrincipalOfficeId(auth.user),
      action: event.action,
      details: event.details,
      severity: event.severity || "INFO",
      entity_type: event.entity_type,
      ip,
      user_agent: req.headers.get("user-agent") || "",
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[POST /api/audit-logs] Error:", err);
    return NextResponse.json({ ok: false, error: "Unable to save activity history." }, { status: 500 });
  }
}
