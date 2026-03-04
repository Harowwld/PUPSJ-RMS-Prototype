import { NextResponse } from "next/server";
import { createAuditLog, listAuditLogs } from "../../../lib/auditLogsRepo";

export const runtime = "nodejs";

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const limit = searchParams.get("limit") || "200";
  const offset = searchParams.get("offset") || "0";

  const rows = await listAuditLogs({ limit, offset });
  return NextResponse.json({ ok: true, data: rows });
}

export async function POST(req) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const actor = String(body.actor || "").trim();
  const role = String(body.role || "").trim();
  const action = String(body.action || "").trim();
  const ip = body.ip === undefined ? undefined : String(body.ip).trim();

  if (!actor || !role || !action) {
    return NextResponse.json(
      { ok: false, error: "Missing required fields" },
      { status: 400 }
    );
  }

  await createAuditLog({ actor, role, action, ip });
  return NextResponse.json({ ok: true }, { status: 201 });
}
