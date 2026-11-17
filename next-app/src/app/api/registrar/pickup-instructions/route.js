import { NextResponse } from "next/server";
import { requireOfficeModule } from "@/lib/moduleAccess";
import { query, queryOne } from "@/lib/postgres";
import { requestPickupSettingsKey } from "@/lib/workflowNotificationsRepo";

const office = "registrar";
const key = requestPickupSettingsKey(office);

export async function GET(req) {
  const access = await requireOfficeModule("document_requests", { officeId: office }, req);
  if (!access) return NextResponse.json({ ok: false }, { status: access === null ? 401 : 403 });
  const setting = await queryOne("SELECT value FROM settings WHERE key = $1", [key]);
  return NextResponse.json({ ok: true, data: { instructions: setting?.value || "" } });
}

export async function PUT(req) {
  const access = await requireOfficeModule("document_requests", { officeId: office, roles: ["Admin"] }, req);
  if (!access) return NextResponse.json({ ok: false }, { status: access === null ? 401 : 403 });
  const body = await req.json().catch(() => null);
  if (typeof body?.instructions !== "string" || body.instructions.trim().length > 2000) {
    return NextResponse.json({ ok: false, error: "Pickup instructions must be 2,000 characters or fewer." }, { status: 400 });
  }
  const instructions = body.instructions.trim();
  await query(
    `INSERT INTO settings (key, value, updated_at) VALUES ($1, $2, now())
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
    [key, instructions],
  );
  return NextResponse.json({ ok: true, data: { instructions } });
}
