import { NextResponse } from "next/server";
import { getModuleConfigMatrix } from "@/lib/modulesRepo";
import { verifySessionToken, getSessionCookieName } from "@/lib/jwt";
import { cookies } from "next/headers";

export const runtime = "nodejs";

export async function GET(req) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(getSessionCookieName())?.value;
    if (!token) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
    const payload = await verifySessionToken(token);
    if (payload.role !== "SuperAdmin") {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    const matrix = await getModuleConfigMatrix();
    return NextResponse.json({ ok: true, data: matrix });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
