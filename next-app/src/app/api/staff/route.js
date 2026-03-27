import { NextResponse } from "next/server";
import { createStaff, listStaff } from "../../../lib/staffRepo";
import { writeAuditLog } from "../../../lib/auditLogRequest";

export const runtime = "nodejs";

const DEFAULT_PASSWORD = "pupstaff";

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") || "";
  const role = searchParams.get("role") || "";
  const status = searchParams.get("status") || "";
  const limit = searchParams.get("limit") || "200";
  const offset = searchParams.get("offset") || "0";

  const rows = await listStaff({
    q: q || undefined,
    role: role || undefined,
    status: status || undefined,
    limit,
    offset,
  });

  return NextResponse.json({ ok: true, data: rows });
}

export async function POST(req) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const id = String(body.id || "").trim();
  const fname = String(body.fname || "").trim();
  const lname = String(body.lname || "").trim();
  const role = String(body.role || "").trim();
  const section = String(body.section || "").trim();
  const status = "Inactive";
  const email = String(body.email || "").trim();
  const password =
    body.password === undefined || body.password === null || String(body.password) === ""
      ? DEFAULT_PASSWORD
      : String(body.password);
  const lastActive =
    body.lastActive === undefined ? undefined : String(body.lastActive).trim();

  if (!id || !fname || !lname || !role || !section || !email) {
    return NextResponse.json(
      { ok: false, error: "Missing required fields" },
      { status: 400 }
    );
  }

  try {
    const row = await createStaff({
      id,
      fname,
      lname,
      role,
      section,
      status,
      email,
      lastActive,
      password,
    });
    await writeAuditLog(req, `Created staff account: ${id}`);

    return NextResponse.json({ ok: true, data: row }, { status: 201 });
  } catch (e) {
    const msg = String(e?.message || "");
    if (msg.includes("UNIQUE") || msg.includes("PRIMARY")) {
      return NextResponse.json(
        { ok: false, error: "Staff ID already exists" },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { ok: false, error: "Failed to create staff" },
      { status: 500 }
    );
  }
}
