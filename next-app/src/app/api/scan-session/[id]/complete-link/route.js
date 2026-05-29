import { NextResponse } from "next/server";
import { completeScanSessionLink } from "../../../../../lib/scanSessionRepo.js";
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
  const phoneLabel = String(body?.phoneLabel || "").trim();
  if (!token) {
    return NextResponse.json({ ok: false, error: "Missing token" }, { status: 400 });
  }
  const session = await completeScanSessionLink({ sessionId: id, token, phoneLabel });
  if (!session) {
    return NextResponse.json(
      { ok: false, error: "Invalid or expired token" },
      { status: 401 }
    );
  }
  broadcastToPairSession(id, "pairStatusChanged", { session });
  return NextResponse.json({ ok: true, data: { session } });
}
