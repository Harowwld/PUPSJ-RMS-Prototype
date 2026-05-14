import { NextResponse } from "next/server";
import { createAuditLog, listAuditLogs, countAuditLogs } from "../../../lib/auditLogsRepo";
import { getSessionActorName } from "../../../lib/authHelpers";

export const runtime = "nodejs";

export async function GET(req) {
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
  const actorExact = mine ? await getSessionActorName() : "";

  if (mine && !actorExact) {
    return NextResponse.json({ ok: true, data: [], total: 0 });
  }

  const [rows, total] = await Promise.all([
    listAuditLogs({ limit, offset, search, actorExact, role, severity, startDate, endDate, sortBy, sortOrder }),
    countAuditLogs({ search, actorExact, role, severity, startDate, endDate }),
  ]);

  return NextResponse.json({ ok: true, data: rows, total });
}

export async function POST(req) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const userAgent = req.headers.get("user-agent") || "";
  const forwardedFor = req.headers.get("x-forwarded-for");
  const remoteIp = forwardedFor ? forwardedFor.split(",")[0].trim() : "localhost";

  const actor = String(body.actor || "").trim();
  const role = String(body.role || "").trim();
  const action = String(body.action || "").trim();
  const details = String(body.details || "").trim();
  const severity = String(body.severity || "INFO").trim();
  const entityType = String(body.entity_type || "").trim();
  const entityId = String(body.entity_id || "").trim();
  const ip = body.ip || remoteIp;

  if (!actor || !role || !action) {
    return NextResponse.json(
      { ok: false, error: "Missing required fields" },
      { status: 400 }
    );
  }

  await createAuditLog({
    actor,
    role,
    action,
    details,
    severity,
    user_agent: body.user_agent || userAgent,
    entity_type: entityType,
    entity_id: entityId,
    ip
  });

  return NextResponse.json({ ok: true }, { status: 201 });
}
