import { NextResponse } from "next/server";
import { getOfficeById, updateOffice, deactivateOffice } from "@/lib/officesRepo";
import { verifySessionToken, getSessionCookieName } from "@/lib/jwt";
import { cookies } from "next/headers";
import { writeGlobalAuditLog } from "@/lib/auditLogRequest";

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
    const original = await getOfficeById(id);
    if (!original) {
      return NextResponse.json({ ok: false, error: "Office not found" }, { status: 404 });
    }

    const body = await req.json();
    const updated = await updateOffice(id, body);
    if (!updated) {
      return NextResponse.json({ ok: false, error: "Office not found or failed to update" }, { status: 404 });
    }

    const changes = [];
    if (body.name !== undefined && body.name !== original.name) {
      changes.push(`Name: '${original.name}' -> '${body.name}'`);
    }
    if (body.short_name !== undefined && body.short_name !== original.short_name) {
      changes.push(`Short Name: '${original.short_name}' -> '${body.short_name}'`);
    }
    if (body.description !== undefined && body.description !== original.description) {
      changes.push(`Description: '${original.description || ""}' -> '${body.description}'`);
    }
    if (body.icon !== undefined && body.icon !== original.icon) {
      changes.push(`Icon: '${original.icon || ""}' -> '${body.icon}'`);
    }
    if (body.accent_color !== undefined && body.accent_color !== original.accent_color) {
      changes.push(`Accent Color: '${original.accent_color}' -> '${body.accent_color}'`);
    }
    if (body.status !== undefined && body.status !== original.status) {
      changes.push(`Status: '${original.status}' -> '${body.status}'`);
    }

    if (changes.length > 0) {
      let action = "Update Office Configuration";
      if (body.status !== undefined && body.status !== original.status) {
        if (body.status === "Inactive") {
          action = "Deactivate Administrative Office";
        } else if (body.status === "Active") {
          action = "Activate Administrative Office";
        }
      }

      await writeGlobalAuditLog(req, action, {
        officeId: id,
        entity_type: "Office",
        entity_id: id,
        details: `Updated office '${original.short_name}' (${id}). Changes:\n${changes.join("\n")}`
      });
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
    const original = await getOfficeById(id);
    if (!original) {
      return NextResponse.json({ ok: false, error: "Office not found" }, { status: 404 });
    }

    const updated = await deactivateOffice(id);
    if (!updated) {
      return NextResponse.json({ ok: false, error: "Office not found or failed to deactivate" }, { status: 404 });
    }

    await writeGlobalAuditLog(req, "Deactivate Administrative Office", {
      officeId: id,
      entity_type: "Office",
      entity_id: id,
      details: `Deactivated office '${original.short_name}' (${id}) via DELETE API.`
    });

    return NextResponse.json({ ok: true, message: "Office deactivated successfully", data: updated });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
