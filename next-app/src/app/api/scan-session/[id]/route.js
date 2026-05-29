import { NextResponse } from "next/server";
import { getSessionStaff, isActiveStaff } from "../../../../lib/scanSessionAuth.js";
import {
  getScanSessionByIdForStaff,
  listIncomingForSession,
} from "../../../../lib/scanSessionRepo.js";

export const runtime = "nodejs";

export async function GET(_req, ctx) {
  const staff = await getSessionStaff();
  if (!staff || !isActiveStaff(staff)) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }
  const params = await ctx.params;
  const id = parseInt(String(params?.id || ""), 10);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ ok: false, error: "Invalid id" }, { status: 400 });
  }
  const session = await getScanSessionByIdForStaff(id, staff.id);
  if (!session) {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }
  const incoming = await listIncomingForSession(id, { limit: 25 });
  return NextResponse.json({ ok: true, data: { session, incoming } });
}
