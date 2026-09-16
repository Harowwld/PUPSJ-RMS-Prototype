import { NextResponse } from "next/server";
import { requireStaff, createAuthErrorResponse, getPrincipalOfficeId } from "../../../../../lib/authHelpers";
import { getBatch } from "../../../../../lib/ingestQueueRepo";
import { canAccessResource } from "@/lib/resourceAuthorization";

export const runtime = "nodejs";

export async function GET(req, ctx) {
  const { user, error } = await requireStaff(req);
  if (error || !user) return createAuthErrorResponse(error || "Authentication required");
  const officeId = getPrincipalOfficeId(user);
  if (!officeId) return createAuthErrorResponse("Office scope is required", 403);
  const { id } = await ctx.params;
  if (!id) return NextResponse.json({ ok: false, error: "Invalid batch id" }, { status: 400 });
  const data = await getBatch(id, officeId);
  if (!data || (data.rows || []).some((row) => !canAccessResource(user, "ingest", row))) {
    return NextResponse.json({ ok: false, error: "Batch not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true, data });
}
