import { NextResponse } from "next/server";
import {
  addIncomingToSession,
  listIncomingForSession,
} from "../../../../../lib/scanSessionRepo.js";
import { broadcastToPairSession } from "../../../../../pages/api/socket";

export const runtime = "nodejs";

export async function POST(req, ctx) {
  const params = await ctx.params;
  const id = parseInt(String(params?.id || ""), 10);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ ok: false, error: "Invalid id" }, { status: 400 });
  }
  const body = await req.json().catch(() => null);
  const token = String(body?.token || "").trim();
  if (!token) {
    return NextResponse.json({ ok: false, error: "Missing token" }, { status: 400 });
  }
  const session = await addIncomingToSession({
    sessionId: id,
    token,
    clientRef: body?.clientRef,
    filename: body?.filename,
    mimeType: body?.mimeType,
    sizeBytes: body?.sizeBytes,
  });
  if (!session) {
    return NextResponse.json(
      { ok: false, error: "Invalid or expired token" },
      { status: 401 }
    );
  }
  const incoming = await listIncomingForSession(id, { limit: 25 });
  broadcastToPairSession(id, "incomingUpdated", { session, incoming });
  return NextResponse.json({ ok: true, data: { session, incoming } });
}
