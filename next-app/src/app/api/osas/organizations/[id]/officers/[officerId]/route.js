import { NextResponse } from "next/server";
import { requireOfficeModule } from "@/lib/moduleAccess";
import { getOrganizationById, removeOfficer } from "@/lib/organizationsRepo";
import { writeGlobalAuditLog } from "@/lib/auditLogRequest";

export const runtime = "nodejs";

export async function DELETE(req, ctx) {
  const access = await requireOfficeModule("student_organizations", { officeId: "osas" }, req);
  if (access === null) return NextResponse.json({ ok: false, error: "Authentication required" }, { status: 401 });
  if (!access) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });

  const { id, officerId } = await ctx.params;
  const org = await getOrganizationById(id);
  if (!org) return NextResponse.json({ ok: false, error: "Organization not found." }, { status: 404 });

  const removed = await removeOfficer(id, officerId);
  if (!removed) {
    return NextResponse.json({ ok: false, error: "Officer record not found." }, { status: 404 });
  }

  await writeGlobalAuditLog(req, "Removed officer from whitelist", {
    officeId: "osas",
    details: `Revoked officer whitelist ID #${officerId} for ${org.name}.`,
    entity_type: "organization_officer",
    entity_id: String(officerId),
  });

  return NextResponse.json({ ok: true, message: "Officer removed from whitelist." });
}
