import { NextResponse } from "next/server";
import { getStaffById } from "@/lib/staffRepo";
import { listStaffActivityLogs, countStaffActivityLogs } from "@/lib/auditLogsRepo";
import { decryptPII } from "@/lib/piiEncryption";
import { formatLogDetails } from "@/lib/auditLogFormatting";
import { getPrincipalActorIdentities } from "@/lib/auditActor";
import { requireAdmin, createAuthErrorResponse } from "@/lib/authHelpers";
import { isSystemAdminRole, normalizeRole } from "@/lib/roleUtils";

export const runtime = "nodejs";

export async function GET(req, ctx) {
  const access = await requireAdmin(req);
  if (access.error || !access.user) {
    return createAuthErrorResponse(
      access.error || "Admin access required",
      access.error?.startsWith("Access denied") ? 403 : 401
    );
  }

  const params = await ctx.params;
  const rawId = params?.id;
  const id = String(rawId || "").trim();
  if (!id) {
    return NextResponse.json({ ok: false, error: "Invalid staff id" }, { status: 400 });
  }

  try {
    const targetStaff = await getStaffById(id);
    if (!targetStaff) {
      return NextResponse.json({ ok: false, error: "Personnel record not found" }, { status: 404 });
    }

    const currentUser = access.user;
    const isSuper = isSystemAdminRole(currentUser.role);
    const isAdmin = normalizeRole(currentUser.role) === "Admin";
    const isSelf = currentUser.id === id;

    // Scope check: SystemAdmin, Office Admin of same office, or self
    if (!isSuper && !isSelf && (!isAdmin || currentUser.office_id !== targetStaff.office_id)) {
      return NextResponse.json({ ok: false, error: "Forbidden: insufficient permissions" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const limit = Math.min(Math.max(parseInt(searchParams.get("limit") || "20", 10), 1), 100);
    const offset = Math.max(parseInt(searchParams.get("offset") || "0", 10), 0);
    const search = searchParams.get("search") || "";
    const severity = searchParams.get("severity") || "";

    const staffFullName = `${targetStaff.fname || ""} ${targetStaff.lname || ""}`.trim();
    const staffEmail = targetStaff.email || "";
    const actorIdentities = await getPrincipalActorIdentities(targetStaff);

    const queryOpts = {
      staffId: id,
      staffName: staffFullName,
      staffEmail,
      actors: actorIdentities,
      search,
      severity,
      limit,
      offset,
    };

    const [rows, total] = await Promise.all([
      listStaffActivityLogs(queryOpts),
      countStaffActivityLogs({ ...queryOpts, limit: undefined, offset: undefined }),
    ]);

    const actorIdentitiesLower = actorIdentities.map((a) => a.toLowerCase().trim());

    const readableRows = rows.map((row) => {
      const actorClean = decryptPII(row.actor);
      const actorNorm = String(actorClean || "").trim().toLowerCase();
      const isOperator =
        row.actor_id
          ? String(row.actor_id).trim().toLowerCase() === id.toLowerCase()
          : actorIdentitiesLower.includes(actorNorm);

      return {
        ...row,
        actor: actorClean,
        actor_display_name: isOperator && staffFullName ? staffFullName : undefined,
        details: formatLogDetails(decryptPII(row.details)),
        eventType: isOperator ? "operator" : "target",
      };
    });

    return NextResponse.json({
      ok: true,
      data: readableRows,
      total,
      limit,
      offset,
      hasMore: offset + rows.length < total,
    });
  } catch (error) {
    console.error("[GET /api/staff/[id]/activity] Error:", error);
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}
