import { NextResponse } from "next/server";
import { requireStaff, createAuthErrorResponse } from "../../../../../lib/authHelpers";
import { getBatch } from "../../../../../lib/ingestQueueRepo";

export const runtime = "nodejs";

export async function GET(req, ctx) {
  const { user, error } = await requireStaff(req);
  if (error || !user) return createAuthErrorResponse(error || "Authentication required");
  const { id } = await ctx.params;
  if (!id) return NextResponse.json({ ok: false, error: "Invalid batch id" }, { status: 400 });
  return NextResponse.json({ ok: true, data: await getBatch(id, user.office_id || "registrar") });
}
