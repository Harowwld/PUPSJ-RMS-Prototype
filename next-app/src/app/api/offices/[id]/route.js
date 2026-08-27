import { NextResponse } from "next/server";
import { getOfficeById, updateOffice, deactivateOffice } from "@/lib/officesRepo";
import { verifySessionToken, getSessionCookieName } from "@/lib/jwt";
import { cookies } from "next/headers";

export const runtime = "nodejs";

async function isSuperAdmin() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(getSessionCookieName())?.value;
    if (!token) return false;
    const payload = await verifySessionToken(token);
    return payload.role === "SuperAdmin";
  } catch {
    return false;
  }
}

export async function GET(req, { params }) {
  if (!await isSuperAdmin()) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  try {
    const office = await getOfficeById(id);
    if (!office) {
      return NextResponse.json({ ok: false, error: "Office not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, data: office });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}

export async function PATCH(req, { params }) {
  if (!await isSuperAdmin()) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  try {
    const body = await req.json();
    const updated = await updateOffice(id, body);
    if (!updated) {
      return NextResponse.json({ ok: false, error: "Office not found or failed to update" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, data: updated });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 400 });
  }
}

export async function DELETE(req, { params }) {
  if (!await isSuperAdmin()) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  try {
    const updated = await deactivateOffice(id);
    if (!updated) {
      return NextResponse.json({ ok: false, error: "Office not found or failed to deactivate" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, message: "Office deactivated successfully", data: updated });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
