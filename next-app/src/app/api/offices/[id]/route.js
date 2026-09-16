import { NextResponse } from "next/server";
import { getOfficeById, updateOffice, deactivateOffice } from "@/lib/officesRepo";
import { writeGlobalAuditLog } from "@/lib/auditLogRequest";
import { requireSystemAdmin, createAuthErrorResponse } from "@/lib/authHelpers";

export const runtime = "nodejs";

export async function GET(req, { params }) {
  const access = await requireSystemAdmin(req);
  if (access.error || !access.user) return createAuthErrorResponse(access.error || "System administrator access required", access.error?.startsWith("Access denied") ? 403 : 401);

  const { id } = await params;
  try {
    const office = await getOfficeById(id);
    if (!office) {
      return NextResponse.json({ ok: false, error: "Office not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, data: office });
  } catch (err) {
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(req, { params }) {
  const access = await requireSystemAdmin(req);
  if (access.error || !access.user) return createAuthErrorResponse(access.error || "System administrator access required", access.error?.startsWith("Access denied") ? 403 : 401);

  const { id } = await params;
  try {
    const original = await getOfficeById(id);
    if (!original) {
      return NextResponse.json({ ok: false, error: "Office not found" }, { status: 404 });
    }

    const body = await req.json();
    if (original.status !== "Active" && body.status !== "Active") {
      return NextResponse.json(
        { ok: false, error: "Archived offices cannot be modified. Please reactivate the office first." },
        { status: 400 }
      );
    }

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
    if (body.station_name !== undefined && body.station_name !== original.station_name) {
      changes.push(`Station Host: '${original.station_name || "Unassigned"}' -> '${body.station_name}'`);
    }
    if (body.storage_path !== undefined && body.storage_path !== original.storage_path) {
      changes.push(`Storage Partition: '${original.storage_path || "Default"}' -> '${body.storage_path}'`);
    }
    if (body.scanner_model !== undefined && body.scanner_model !== original.scanner_model) {
      changes.push(`Scanner Model: '${original.scanner_model || "Generic"}' -> '${body.scanner_model}'`);
    }
    if (body.ingest_token !== undefined && body.ingest_token !== original.ingest_token) {
      changes.push(`Station Ingest Token rotated`);
    }

    if (changes.length > 0) {
      let action = "Update Office Configuration";
      if (body.status !== undefined && body.status !== original.status) {
        if (body.status === "Inactive") {
          action = "Archive Administrative Office";
        } else if (body.status === "Active") {
          action = "Restore Administrative Office";
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
    return NextResponse.json({ ok: false, error: "Request could not be completed" }, { status: 400 });
  }
}

export async function DELETE(req, { params }) {
  const access = await requireSystemAdmin(req);
  if (access.error || !access.user) return createAuthErrorResponse(access.error || "System administrator access required", access.error?.startsWith("Access denied") ? 403 : 401);

  const { id } = await params;
  try {
    const original = await getOfficeById(id);
    if (!original) {
      return NextResponse.json({ ok: false, error: "Office not found" }, { status: 404 });
    }

    const updated = await deactivateOffice(id);
    if (!updated) {
      return NextResponse.json({ ok: false, error: "Office not found or failed to archive" }, { status: 404 });
    }

    await writeGlobalAuditLog(req, "Archive Administrative Office", {
      officeId: id,
      entity_type: "Office",
      entity_id: id,
      details: `Archived office '${original.short_name}' (${id}) via DELETE API.`
    });

    return NextResponse.json({ ok: true, message: "Office archived successfully", data: updated });
  } catch (err) {
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}
