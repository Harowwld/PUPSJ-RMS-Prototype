import { NextResponse } from "next/server";
import { systemConfigRepo } from "@/lib/systemConfigRepo";
import { getSessionCookieName, verifySessionToken } from "@/lib/jwt";

async function isAdmin(req) {
  const token = req.cookies.get(getSessionCookieName())?.value || "";
  if (!token) return false;
  try {
    const payload = await verifySessionToken(token);
    const role = String(payload?.role || "").toLowerCase().trim();
    return ["admin", "administrator", "superadmin"].includes(role);
  } catch {
    return false;
  }
}

export async function GET(req) {
  try {
    if (!(await isAdmin(req))) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 403 });
    }

    const settings = await systemConfigRepo.getSettings();
    return NextResponse.json({ ok: true, data: settings });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    if (!(await isAdmin(req))) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 403 });
    }

    const body = await req.json();
    const { key, value } = body;

    if (!key) {
      return NextResponse.json({ ok: false, error: "Key is required" }, { status: 400 });
    }

    await systemConfigRepo.setSetting(key, value);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
