import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createAuditLog, listAuditLogs, countAuditLogs } from "../../../lib/auditLogsRepo";
import { getSessionCookieName, verifySessionToken } from "../../../lib/jwt";
import { getStaffById } from "../../../lib/staffRepo";

export const runtime = "nodejs";

async function getSessionActorName() {
  const store = await cookies();
  const token = store.get(getSessionCookieName())?.value || "";
  if (!token) return "";
  try {
    const payload = await verifySessionToken(token);
    const id = String(payload?.sub || "").trim();
    if (!id) return "";
    const staff = await getStaffById(id);
    return `${staff?.fname || ""} ${staff?.lname || ""}`.trim();
  } catch {
    return "";
  }
}

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const limit = parseInt(searchParams.get("limit") || "200");
  const offset = parseInt(searchParams.get("offset") || "0");
  const search = searchParams.get("search") || "";
  const mine = searchParams.get("mine") === "1";
  const actorExact = mine ? await getSessionActorName() : "";

  if (mine && !actorExact) {
    return NextResponse.json({ ok: true, data: [], total: 0 });
  }

  const [rows, total] = await Promise.all([
    listAuditLogs({ limit, offset, search, actorExact }),
    countAuditLogs(search, actorExact),
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
