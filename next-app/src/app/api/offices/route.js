import { NextResponse } from "next/server";
import { listOffices, createOffice, listOfficesWithStats } from "@/lib/officesRepo";
import { writeGlobalAuditLog } from "@/lib/auditLogRequest";
import { requireSystemAdmin, createAuthErrorResponse } from "@/lib/authHelpers";

export const runtime = "nodejs";

export async function GET(req) {
  const access = await requireSystemAdmin(req);
  if (access.error || !access.user) return createAuthErrorResponse(access.error || "System administrator access required", access.error?.startsWith("Access denied") ? 403 : 401);

  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") || undefined;
    const q = searchParams.get("q") || undefined;
    const stats = searchParams.get("stats") === "true";

    const offices = stats ? await listOfficesWithStats() : await listOffices({ status, q });
    return NextResponse.json({ ok: true, data: offices });
  } catch (err) {
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req) {
  const access = await requireSystemAdmin(req);
  if (access.error || !access.user) return createAuthErrorResponse(access.error || "System administrator access required", access.error?.startsWith("Access denied") ? 403 : 401);

  try {
    const body = await req.json();
    const office = await createOffice(body);

    if (office && office.id) {
      await writeGlobalAuditLog(req, "Create Administrative Office", {
        officeId: office.id,
        entity_type: "Office",
        entity_id: office.id,
        details: `Created office '${office.short_name}' (${office.id}) with full name '${office.name}'.`
      });
    }

    return NextResponse.json({ ok: true, data: office });
  } catch (err) {
    return NextResponse.json({ ok: false, error: "Request could not be completed" }, { status: 400 });
  }
}
