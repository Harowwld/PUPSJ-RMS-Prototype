import { NextResponse } from "next/server";
import { listOffices, createOffice, listOfficesWithStats } from "@/lib/officesRepo";
import { verifySessionToken, getSessionCookieName } from "@/lib/jwt";
import { cookies } from "next/headers";
import { writeGlobalAuditLog } from "@/lib/auditLogRequest";

export const runtime = "nodejs";

async function isSuperAdmin() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(getSessionCookieName())?.value;
    if (!token) return false;
    const payload = await verifySessionToken(token);
    return payload.role === "SuperAdmin";
  } catch {
    return false;
  }
}

export async function GET(req) {
  if (!await isSuperAdmin()) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") || undefined;
    const q = searchParams.get("q") || undefined;
    const stats = searchParams.get("stats") === "true";

    const offices = stats ? await listOfficesWithStats() : await listOffices({ status, q });
    return NextResponse.json({ ok: true, data: offices });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req) {
  if (!await isSuperAdmin()) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

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

    // Surface the auto-provisioned default admin account (id + default password)
    // so the SuperAdmin sees the credentials right after creation.
    const admin = office?._admin || null;
    return NextResponse.json({ ok: true, data: office, admin });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 400 });
  }
}
