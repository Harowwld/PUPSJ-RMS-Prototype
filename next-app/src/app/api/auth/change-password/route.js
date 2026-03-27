import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  setStaffPasswordById,
  verifyStaffPasswordById,
} from "../../../../lib/staffRepo";
import {
  getSessionCookieName,
  signSessionToken,
  verifySessionToken,
} from "../../../../lib/jwt";
import { writeAuditLog } from "../../../../lib/auditLogRequest";

export const runtime = "nodejs";

export async function POST(req) {
  let session;
  try {
    const store = await cookies();
    const token = store.get(getSessionCookieName())?.value || "";
    if (!token) {
      return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });
    }
    session = await verifySessionToken(token);
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid session" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const id = String(session?.sub || "").trim();
  const currentPassword = String(body.currentPassword || "");
  const newPassword = String(body.newPassword || "");

  if (!id || !currentPassword || !newPassword) {
    return NextResponse.json(
      { ok: false, error: "Missing required fields" },
      { status: 400 }
    );
  }

  if (newPassword.length < 6) {
    return NextResponse.json(
      { ok: false, error: "Password must be at least 6 characters" },
      { status: 400 }
    );
  }

  const ok = await verifyStaffPasswordById(id, currentPassword);
  if (!ok) {
    return NextResponse.json(
      { ok: false, error: "Current password is incorrect" },
      { status: 401 }
    );
  }

  const updated = await setStaffPasswordById(id, newPassword);
  if (!updated) {
    return NextResponse.json(
      { ok: false, error: "User not found" },
      { status: 404 }
    );
  }
  await writeAuditLog(req, `Changed password for account: ${id}`);

  const nextPayload = {
    sub: session?.sub || id,
    role: session?.role || updated.role || "Staff",
    username: session?.username || updated.email || null,
    last_active: session?.last_active || updated.last_active || null,
    mustChangePassword: false,
  };
  const nextToken = await signSessionToken(nextPayload);
  const res = NextResponse.json({ ok: true });
  res.cookies.set({
    name: getSessionCookieName(),
    value: nextToken,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });
  return res;
}
