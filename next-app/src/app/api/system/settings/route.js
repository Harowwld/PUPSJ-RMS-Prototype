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
  } catch {
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const access = await requireSystemAdmin(req);
    if (access.error || !access.user) return createAuthErrorResponse(access.error || "System administrator access required", access.error?.startsWith("Access denied") ? 403 : 401);
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
    }
    const { key, value } = body;

    if (typeof key !== "string" || !key.trim() || key.trim().length > 255) {
      return NextResponse.json({ ok: false, error: "Key must be a non-empty string up to 255 characters." }, { status: 400 });
    }
    if (!Object.hasOwn(body, "value") || (value !== null && !["string", "number", "boolean"].includes(typeof value))) {
      return NextResponse.json({ ok: false, error: "Value must be provided as a string, number, boolean, or null." }, { status: 400 });
    }

    const normalizedKey = key.trim();
    await systemConfigRepo.setSetting(normalizedKey, value);
    await writeAuditLog(req, "Updated System Setting", {
      details: `Updated system setting '${normalizedKey}'.`,
      entity_type: "setting",
      entity_id: normalizedKey,
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    const access = await requireSystemAdmin(req);
    if (access.error || !access.user) return createAuthErrorResponse(access.error || "System administrator access required", access.error?.startsWith("Access denied") ? 403 : 401);

    const key = new URL(req.url).searchParams.get("key")?.trim();
    if (!key || key.length > 255) {
      return NextResponse.json({ ok: false, error: "A valid setting key is required." }, { status: 400 });
    }

    const deleted = await systemConfigRepo.deleteSetting(key);
    if (!deleted) {
      return NextResponse.json({ ok: false, error: "Setting not found." }, { status: 404 });
    }

    await writeAuditLog(req, "Deleted System Setting", {
      details: `Deleted system setting '${key}'.`,
      entity_type: "setting",
      entity_id: key,
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}
