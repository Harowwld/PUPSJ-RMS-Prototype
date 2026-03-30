import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { getSessionCookieName, verifySessionToken } from "../../../lib/jwt";
import { getStaffById } from "../../../lib/staffRepo";
import { writeAuditLog } from "../../../lib/auditLogRequest";

import { getStorageLayout, setStorageLayout } from "../../../lib/storageLayoutRepo";

export const runtime = "nodejs";

async function getSessionStaff() {
  const cookieName = getSessionCookieName();
  const store = await cookies();
  const token = store.get(cookieName)?.value || "";
  if (!token) return null;

  const payload = await verifySessionToken(token);
  const userId = String(payload?.sub || "").trim();
  if (!userId) return null;

  return await getStaffById(userId);
}

function isAdminRole(roleRaw) {
  const role = String(roleRaw || "").toLowerCase();
  return ["admin", "administrator", "superadmin"].includes(role);
}

export async function GET(_req) {
  try {
    const layout = await getStorageLayout();
    return NextResponse.json({ ok: true, data: layout });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err?.message || "Failed to load storage layout" },
      { status: 500 }
    );
  }
}

export async function PUT(req) {
  try {
    const staff = await getSessionStaff();
    if (!staff || !isAdminRole(staff.role)) {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
    }

    const saved = await setStorageLayout(body);
    await writeAuditLog(req, `Updated storage layout (v${saved?.version || 1})`);

    return NextResponse.json({ ok: true, data: saved });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err?.message || "Failed to update storage layout" },
      { status: 400 }
    );
  }
}

