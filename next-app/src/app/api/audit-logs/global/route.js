import { NextResponse } from "next/server";
import { listGlobalAuditLogs, countGlobalAuditLogs } from "@/lib/auditLogsRepo";
import {
  getPrincipalOfficeId,
  requireAdmin,
  createAuthErrorResponse,
} from "@/lib/authHelpers";
import { isSystemAdminRole } from "@/lib/roleUtils";
import { decryptPII } from "@/lib/piiEncryption";
import { addAuditActorIds } from "@/lib/auditActor";
import { formatLogDetails } from "@/lib/auditLogFormatting";
import { query } from "@/lib/postgres";
import { formatPHDateTime } from "@/lib/timeFormat";
import { createAuditLogCsvResponse, generateServerAuditLogsPdf } from "@/lib/auditLogExport";
import { writeGlobalAuditLog } from "@/lib/auditLogRequest";

export const runtime = "nodejs";

export async function GET(req) {
  const access = await requireAdmin(req);
  if (access.error || !access.user) return createAuthErrorResponse(access.error || "Admin access required", access.error?.startsWith("Access denied") ? 403 : 401);

  try {
    const { searchParams } = new URL(req.url);
    const limit = Math.min(500, Math.max(1, parseInt(searchParams.get("limit") || "50", 10) || 50));
    const offset = Math.max(0, parseInt(searchParams.get("offset") || "0", 10) || 0);
    const search = searchParams.get("search") || "";
    const requestedOfficeId = searchParams.get("officeId") || "";
    const excludeOfficeId = isSystemAdminRole(access.user.role)
      ? (searchParams.get("excludeOfficeId") || "")
      : "";
    const officeId = isSystemAdminRole(access.user.role)
      ? requestedOfficeId
      : getPrincipalOfficeId(access.user);
    if (!isSystemAdminRole(access.user.role) && !officeId) {
      return createAuthErrorResponse("Office scope is required", 403);
    }
    const severity = searchParams.get("severity") || "";
    const excludeSeverity = searchParams.get("excludeSeverity") || "";
    const role = searchParams.get("role") || "";
    const excludeRole = searchParams.get("excludeRole") || "";
    const startDate = searchParams.get("startDate") || "";
    const endDate = searchParams.get("endDate") || "";
    const sortBy = searchParams.get("sortBy") || "created_at";
    const sortOrder = searchParams.get("sortOrder") || "DESC";
    const format = searchParams.get("format");

    const queryOpts = {
      search,
      officeId,
      excludeOfficeId,
      severity,
      excludeSeverity,
      role,
      excludeRole,
      startDate,
      endDate,
      sortBy,
      sortOrder,
    };

    const officeNames = new Map();
    if (format === "csv" || format === "pdf") {
      const offices = await query("SELECT id, short_name, name FROM offices");
      for (const office of offices) officeNames.set(office.id, office.short_name || office.name);
    }
    const decorateRows = async (rows) => {
      const readableRows = await addAuditActorIds(rows.map((row) => ({
        ...row,
        actor: decryptPII(row.actor),
        details: formatLogDetails(decryptPII(row.details)),
      })));
      return readableRows.map((row) => ({
        ...row,
        officeName: row.office_id ? officeNames.get(row.office_id) || row.office_id : "Global (Platform)",
        scope: row.office_id ? officeNames.get(row.office_id) || row.office_id : "Global",
      }));
    };

    if (format === "csv") {
      return createAuditLogCsvResponse({
        filename: "platform-activity-history.csv",
        headers: ["Date & Time", "Severity", "Actor", "Role", "Scope", "Action", "Details", "IP Address", "User Agent", "Entity Type", "Entity ID"],
        loadPage: async ({ limit: pageLimit, offset: pageOffset }) => decorateRows(await listGlobalAuditLogs({ ...queryOpts, limit: pageLimit, offset: pageOffset })),
        mapRow: (log) => [
          log?.created_at ? formatPHDateTime(log.created_at) : "N/A",
          log?.severity || "INFO",
          log?.actor_display_name || log?.actor || "System",
          log?.role || "N/A",
          log?.scope || "Global",
          log?.action || "N/A",
          formatLogDetails(log?.details) || "No known description",
          log?.ip || "N/A",
          log?.user_agent || "N/A",
          log?.entity_type || "N/A",
          log?.entity_id || "N/A",
        ],
        onComplete: (exportedCount) => writeGlobalAuditLog(req, "Exported Platform Activity History to CSV", {
          officeId,
          details: `Exported ${exportedCount} platform activity records. Search: ${search || "None"}`,
          entity_type: "Report",
        }),
      });
    }

    if (format === "pdf") {
      const exportedRows = [];
      for (let pageOffset = 0; ; pageOffset += 500) {
        const pageRows = await listGlobalAuditLogs({ ...queryOpts, limit: 500, offset: pageOffset });
        if (!pageRows.length) break;
        exportedRows.push(...await decorateRows(pageRows));
        if (pageRows.length < 500) break;
      }
      const pdf = await generateServerAuditLogsPdf(exportedRows, {
        scope: searchParams.get("scope") || "All Scopes",
        severity: searchParams.get("severityLabel") || "All Severities",
        startDate,
        endDate,
        search,
      });
      await writeGlobalAuditLog(req, "Generated Platform Activity History PDF Report", {
        officeId,
        details: `Generated report for ${exportedRows.length} platform activity records. Search: ${search || "None"}`,
        entity_type: "Report",
      });
      return new Response(await pdf.arrayBuffer(), {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": 'attachment; filename="platform-activity-history.pdf"',
          "Cache-Control": "private, no-store",
        },
      });
    }

    const [rows, total] = await Promise.all([
      listGlobalAuditLogs({ ...queryOpts, limit, offset }),
      countGlobalAuditLogs({ ...queryOpts, limit: undefined, offset: undefined }),
    ]);

    const readableRows = await decorateRows(rows);

    return NextResponse.json({ ok: true, data: readableRows, total });
  } catch {
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}
