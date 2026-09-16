import { NextResponse } from "next/server";
import { systemConfigRepo } from "@/lib/systemConfigRepo";
import { writeAuditLog } from "@/lib/auditLogRequest";
import { requireSystemAdmin, createAuthErrorResponse } from "@/lib/authHelpers";

export async function GET(req) {
  try {
    const access = await requireSystemAdmin(req);
    if (access.error || !access.user) return createAuthErrorResponse(access.error || "System administrator access required", access.error?.startsWith("Access denied") ? 403 : 401);
    const settings = await systemConfigRepo.getSettings();
    return NextResponse.json({ ok: true, data: settings });
  } catch (error) {
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const access = await requireSystemAdmin(req);
    if (access.error || !access.user) return createAuthErrorResponse(access.error || "System administrator access required", access.error?.startsWith("Access denied") ? 403 : 401);
    const body = await req.json();
    const { key, value } = body;

    if (!key) {
      return NextResponse.json({ ok: false, error: "Key is required" }, { status: 400 });
    }

    await systemConfigRepo.setSetting(key, value);
    await writeAuditLog(req, "Updated System Setting", {
      details: `Updated system setting '${key}'.`,
      entity_type: "setting",
      entity_id: String(key),
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}
