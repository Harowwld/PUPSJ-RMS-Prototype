import { NextResponse } from "next/server";
import { getSessionCookieName, verifySessionToken } from "../../../../lib/jwt";
import { cookies } from "next/headers";
import { updateStaff, getStaffByUsername, getStaffById } from "../../../../lib/staffRepo";
import { writeAuditLog } from "../../../../lib/auditLogRequest";

export const runtime = "nodejs";

export async function POST(req) {
  try {
    const cookieName = getSessionCookieName();
    const store = await cookies();
    const token = store.get(cookieName)?.value || "";
    if (!token) {
      return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });
    }

    const payload = await verifySessionToken(token);
    const userId = payload.sub || null;
    if (!userId || userId === "admin") {
      return NextResponse.json({ ok: false, error: "Cannot update built-in admin account" }, { status: 403 });
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
    }

    const { fname, lname, email } = body;

    const currentStaff = await getStaffById(userId);
    if (!currentStaff) {
      return NextResponse.json({ ok: false, error: "Account not found" }, { status: 404 });
    }

    // Check email uniqueness if it changed
    if (email && email.toLowerCase() !== currentStaff.email.toLowerCase()) {
      const existing = await getStaffByUsername(email);
      if (existing) {
        return NextResponse.json({ ok: false, error: "That username (email) is already in use by another account" }, { status: 409 });
      }
    }

    const updatePatch = {
      fname: fname || currentStaff.fname,
      lname: lname || currentStaff.lname,
      email: email || currentStaff.email,
    };

    const updated = await updateStaff(userId, updatePatch);
    await writeAuditLog(req, `Updated profile for account: ${userId}`);

    return NextResponse.json({
      ok: true,
      data: updated,
    });
  } catch (err) {
    return NextResponse.json({ ok: false, error: "Failed to update profile", details: err?.message }, { status: 500 });
  }
}
