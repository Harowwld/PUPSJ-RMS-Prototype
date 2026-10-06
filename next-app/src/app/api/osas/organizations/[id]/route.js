import { NextResponse } from "next/server";
import { requireOfficeModule } from "@/lib/moduleAccess";
import { getOrganizationById, updateOrganization, archiveOrganization } from "@/lib/organizationsRepo";
import { writeGlobalAuditLog } from "@/lib/auditLogRequest";

export const runtime = "nodejs";

export async function GET(req, ctx) {
  let access = await requireOfficeModule("student_organizations", { officeId: "osas" }, req);
  if (!access) {
    access = await requireOfficeModule("records_archive", { officeId: "osas" }, req);
  }
  if (access === null) return NextResponse.json({ ok: false, error: "Authentication required" }, { status: 401 });
  if (!access) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });

  const { id } = await ctx.params;
  const org = await getOrganizationById(id);
  if (!org) return NextResponse.json({ ok: false, error: "Organization not found." }, { status: 404 });

  return NextResponse.json({ ok: true, data: org });
}

export async function PATCH(req, ctx) {
  let access = await requireOfficeModule("student_organizations", { officeId: "osas" }, req);
  if (!access) {
    access = await requireOfficeModule("records_archive", { officeId: "osas" }, req);
  }
  if (access === null) return NextResponse.json({ ok: false, error: "Authentication required" }, { status: 401 });
  if (!access) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });

  const { id } = await ctx.params;
  const existing = await getOrganizationById(id);
  if (!existing) return NextResponse.json({ ok: false, error: "Organization not found." }, { status: 404 });

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ ok: false, error: "Invalid request body." }, { status: 400 });
  }
  const allowedFields = new Set([
    "name", "acronym", "category", "status", "adviserName", "adviser_name",
    "adviserEmail", "adviser_email", "description", "storageRoom", "storage_room",
    "storageCabinet", "storage_cabinet", "storageDrawer", "storage_drawer",
  ]);
  const unsupportedField = Object.keys(body).find((field) => !allowedFields.has(field));
  if (unsupportedField) {
    return NextResponse.json({ ok: false, error: `Unsupported field: ${unsupportedField}` }, { status: 400 });
  }
  if (Object.keys(body).length === 0) {
    return NextResponse.json({ ok: false, error: "At least one field is required." }, { status: 400 });
  }

  try {
    const updated = await updateOrganization(id, body);
    await writeGlobalAuditLog(req, body.status === "Active" && existing.status === "Archived" ? "Restored student organization" : "Updated student organization", {
      officeId: "osas",
      details: `${body.status === "Active" && existing.status === "Archived" ? "Restored" : "Updated details for"} ${existing.name}.`,
      entity_type: "student_organization",
      entity_id: id,
    });
    return NextResponse.json({ ok: true, data: updated });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error.message || "Failed to update organization." }, { status: 400 });
  }
}

export async function DELETE(req, ctx) {
  let access = await requireOfficeModule("student_organizations", { officeId: "osas" }, req);
  if (!access) {
    access = await requireOfficeModule("records_archive", { officeId: "osas" }, req);
  }
  if (access === null) return NextResponse.json({ ok: false, error: "Authentication required" }, { status: 401 });
  if (!access) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });

  const { id } = await ctx.params;
  const existing = await getOrganizationById(id);
  if (!existing) return NextResponse.json({ ok: false, error: "Organization not found." }, { status: 404 });

  await archiveOrganization(id);
  await writeGlobalAuditLog(req, "Archived student organization", {
    officeId: "osas",
    details: `Archived ${existing.name} (${existing.acronym || "N/A"}).`,
    entity_type: "student_organization",
    entity_id: id,
  });

  return NextResponse.json({ ok: true, message: "Organization archived successfully." });
}
