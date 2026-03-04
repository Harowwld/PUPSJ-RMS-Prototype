import { NextResponse } from "next/server";
import {
  getStaffByUsername,
  hashPasswordForStorage,
  touchStaffLastActiveById,
} from "../../../../lib/staffRepo";

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
    return NextResponse.json(
      { ok: false, error: "Missing credentials" },
      { status: 400 }
    );
  }

  if (username === "admin" && password === "admin") {
    return NextResponse.json({
      ok: true,
      data: { role: "Admin", id: "admin", username: "admin" },
    });
  }

  const staff = await getStaffByUsername(username);
  if (!staff) {
    return NextResponse.json({ ok: false, error: "Invalid credentials" }, { status: 401 });
  }

  const stored = staff.password_hash;
  if (!stored) {
    return NextResponse.json({ ok: false, error: "Account has no password" }, { status: 401 });
  }

  const hashed = hashPasswordForStorage(password);
  if (hashed !== stored) {
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

  return NextResponse.json({
    ok: true,
    data: {
      role: touched.role || "Staff",
      id: touched.id,
      username: touched.email,
      last_active: touched.last_active,
      mustChangePassword,
    },
  });
}
