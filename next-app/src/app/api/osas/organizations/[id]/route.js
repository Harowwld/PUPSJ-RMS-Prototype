import { NextResponse } from "next/server";
import { requireOfficeModule } from "@/lib/moduleAccess";
import { getOrganizationById, updateOrganization, archiveOrganization } from "@/lib/organizationsRepo";
import { writeGlobalAuditLog } from "@/lib/auditLogRequest";

export const runtime = "nodejs";

export async function GET(req, ctx) {
  const access = await requireOfficeModule("student_organizations", { officeId: "osas" }, req);
  if (access === null) return NextResponse.json({ ok: false, error: "Authentication required" }, { status: 401 });
  if (!access) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });

  const { id } = await ctx.params;
  const org = await getOrganizationById(id);
  if (!org) return NextResponse.json({ ok: false, error: "Organization not found." }, { status: 404 });

  return NextResponse.json({ ok: true, data: org });
}

export async function PATCH(req, ctx) {
  const access = await requireOfficeModule("student_organizations", { officeId: "osas" }, req);
  if (access === null) return NextResponse.json({ ok: false, error: "Authentication required" }, { status: 401 });
  if (!access) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });

  const { id } = await ctx.params;
  const existing = await getOrganizationById(id);
  if (!existing) return NextResponse.json({ ok: false, error: "Organization not found." }, { status: 404 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ ok: false, error: "Invalid request body." }, { status: 400 });

  try {
    const updated = await updateOrganization(id, body);
    await writeGlobalAuditLog(req, "Updated student organization", {
      officeId: "osas",
      details: `Updated details for ${existing.name}.`,
      entity_type: "student_organization",
      entity_id: id,
    });
    return NextResponse.json({ ok: true, data: updated });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error.message || "Failed to update organization." }, { status: 400 });
  }
}

export async function DELETE(req, ctx) {
  const access = await requireOfficeModule("student_organizations", { officeId: "osas" }, req);
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
