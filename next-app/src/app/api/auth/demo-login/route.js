import { NextResponse } from "next/server";
import { POST as login } from "../login/route";

export const runtime = "nodejs";

const DEMO_ACCOUNTS = new Set([
  "superadmin@pup.local",
  "admin.registrar@pup.local",
  "staff.registrar@pup.local",
  "admin.osas@pup.local",
  "staff.osas@pup.local",
  "student@pup.local",
  "test.student@pup.local",
]);

export async function POST(req) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  const username = String(body?.username || "").trim().toLowerCase();
  if (!DEMO_ACCOUNTS.has(username)) {
    return NextResponse.json({ ok: false, error: "Demo account not found" }, { status: 404 });
  }

  const isStudent = username === "student@pup.local" || username === "test.student@pup.local";
  const password = isStudent ? "student123" : process.env.DEFAULT_STAFF_PASSWORD || "pupstaff";
  const headers = new Headers({ "content-type": "application/json" });
  for (const name of ["x-forwarded-for", "x-real-ip", "user-agent"]) {
    const value = req.headers.get(name);
    if (value) headers.set(name, value);
  }

  return login(new Request(req.url, {
    method: "POST",
    headers,
    body: JSON.stringify({ username, password }),
  }));
}
