import { NextResponse } from "next/server";
import { requireOfficeModule } from "@/lib/moduleAccess";
import { getOrganizationById, getOfficersByOrganizationId, addOfficer } from "@/lib/organizationsRepo";
import { writeGlobalAuditLog } from "@/lib/auditLogRequest";

export const runtime = "nodejs";

export async function GET(req, ctx) {
  const access = await requireOfficeModule("student_organizations", { officeId: "osas" }, req);
  if (access === null) return NextResponse.json({ ok: false, error: "Authentication required" }, { status: 401 });
  if (!access) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });

  const { id } = await ctx.params;
  const org = await getOrganizationById(id);
  if (!org) return NextResponse.json({ ok: false, error: "Organization not found." }, { status: 404 });

  const officers = await getOfficersByOrganizationId(id);
  return NextResponse.json({ ok: true, data: officers });
}

export async function POST(req, ctx) {
  const access = await requireOfficeModule("student_organizations", { officeId: "osas" }, req);
  if (access === null) return NextResponse.json({ ok: false, error: "Authentication required" }, { status: 401 });
  if (!access) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });

  const { id } = await ctx.params;
  const org = await getOrganizationById(id);
  if (!org) return NextResponse.json({ ok: false, error: "Organization not found." }, { status: 404 });

  const body = await req.json().catch(() => null);
  const email = String(body?.email || "").trim().toLowerCase();
  const position = String(body?.position || "").trim();
  const studentName = String(body?.studentName || "").trim();
  const studentNo = String(body?.studentNo || "").trim();

  if (!email || !position) {
    return NextResponse.json({ ok: false, error: "Officer email and position are required." }, { status: 400 });
  }

  try {
    const officer = await addOfficer(id, {
      email,
      position,
      studentName,
      studentNo,
    });

    await writeGlobalAuditLog(req, "Added officer to whitelist", {
      officeId: "osas",
      details: `Whitelisted ${email} as ${position} for ${org.name}.`,
      entity_type: "organization_officer",
      entity_id: String(officer.id),
    });

    return NextResponse.json({ ok: true, data: officer }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error.message || "Failed to add officer." }, { status: 400 });
  }
}
