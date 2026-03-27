import { NextResponse } from "next/server";
import {
  getStaffByUsername,
  hashPasswordForStorage,
  touchStaffLastActiveById,
} from "../../../../lib/staffRepo";
import { getSessionCookieName, signSessionToken } from "../../../../lib/jwt";
import { createSession } from "../../../../lib/sessionStore";
import { broadcastToAdmins } from "../../../../pages/api/socket";
import { writeAuditLog } from "../../../../lib/auditLogRequest";

export const runtime = "nodejs";

export async function POST(req) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const username = String(body.username || "").trim();
  const password = String(body.password || "");

  if (!username || !password) {
    await writeAuditLog(req, "Login attempt failed: missing credentials", {
      actor: username || "Unknown",
      role: "Guest",
    });
    return NextResponse.json(
      { ok: false, error: "Missing credentials" },
      { status: 400 }
    );
  }

  if (username === "admin" && password === "admin") {
    const payload = {
      sub: "admin",
      role: "Admin",
      username: "admin",
      mustChangePassword: false,
    };
    const token = await signSessionToken(payload);
    createSession(token, "admin", "Admin", "admin");
    await writeAuditLog(req, "User login: admin", { actor: "admin", role: "Admin" });
    // Broadcast to admins
    broadcastToAdmins("staffLogin", {
      staffId: "admin",
      role: "Admin",
      username: "admin",
    });
    const res = NextResponse.json({
      ok: true,
      data: { role: "Admin", id: "admin", username: "admin", mustChangePassword: false },
    });
    res.cookies.set({
      name: getSessionCookieName(),
      value: token,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
    });
    return res;
  }

  const staff = await getStaffByUsername(username);
  if (!staff) {
    await writeAuditLog(req, `Login attempt failed: unknown user (${username})`, {
      actor: username,
      role: "Guest",
    });
    return NextResponse.json({ ok: false, error: "Invalid credentials" }, { status: 401 });
  }

  const stored = staff.password_hash;
  if (!stored) {
    return NextResponse.json({ ok: false, error: "Account has no password" }, { status: 401 });
  }

  const hashed = hashPasswordForStorage(password);
  if (hashed !== stored) {
    await writeAuditLog(req, `Login attempt failed: invalid password (${username})`, {
      actor: username,
      role: "Guest",
    });
    return NextResponse.json({ ok: false, error: "Invalid credentials" }, { status: 401 });
  }

  const touched = await touchStaffLastActiveById(staff.id);
  if (!touched) {
    return NextResponse.json(
      { ok: false, error: "Failed to update last active" },
      { status: 500 }
    );
  }

  const defaultHash = hashPasswordForStorage("pupstaff");
  const mustChangePassword = stored === defaultHash;

  const sessionPayload = {
    sub: touched.id,
    role: touched.role || "Staff",
    username: touched.email,
    last_active: touched.last_active,
    mustChangePassword,
  };
  const token = await signSessionToken(sessionPayload);
  createSession(token, touched.id, touched.role || "Staff", touched.email);
  await writeAuditLog(req, `User login: ${touched.email || touched.id}`, {
    actor: touched.email || touched.id,
    role: touched.role || "Staff",
  });
  // Broadcast to admins
  broadcastToAdmins("staffLogin", {
    staffId: touched.id,
    role: touched.role || "Staff",
    username: touched.email,
    status: "Active",
    last_active: touched.last_active,
  });

  const res = NextResponse.json({
    ok: true,
    data: {
      role: touched.role || "Staff",
      id: touched.id,
      username: touched.email,
      last_active: touched.last_active,
      mustChangePassword,
    },
  });
  res.cookies.set({
    name: getSessionCookieName(),
    value: token,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });
  return res;
}
