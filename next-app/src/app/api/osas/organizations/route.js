import { NextResponse } from "next/server";
import { requireOfficeModule } from "@/lib/moduleAccess";
import { listOrganizations, createOrganization } from "@/lib/organizationsRepo";
import { writeGlobalAuditLog } from "@/lib/auditLogRequest";

export const runtime = "nodejs";

export async function GET(req) {
  const access = await requireOfficeModule("student_organizations", { officeId: "osas" }, req);
  if (access === null) return NextResponse.json({ ok: false, error: "Authentication required" }, { status: 401 });
  if (!access) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") || "All";
  const category = searchParams.get("category") || "All";
  const search = searchParams.get("search") || "";

  const rows = await listOrganizations({ status, category, search });
  return NextResponse.json({ ok: true, data: rows });
}

export async function POST(req) {
  const access = await requireOfficeModule("student_organizations", { officeId: "osas" }, req);
  if (access === null) return NextResponse.json({ ok: false, error: "Authentication required" }, { status: 401 });
  if (!access) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const name = String(body?.name || "").trim();
  const acronym = String(body?.acronym || "").trim();
  const category = String(body?.category || "Academic").trim();
  const adviserName = String(body?.adviserName || "").trim();
  const adviserEmail = String(body?.adviserEmail || "").trim();
  const description = String(body?.description || "").trim();

  if (!name) {
    return NextResponse.json({ ok: false, error: "Organization name is required." }, { status: 400 });
  }

  try {
    const org = await createOrganization({
      name,
      acronym,
      category,
      adviserName,
      adviserEmail,
      description,
    });

    await writeGlobalAuditLog(req, "Created student organization", {
      officeId: "osas",
      details: `Registered ${org.name} (${org.acronym || "N/A"}) in OSAS directory.`,
      entity_type: "student_organization",
      entity_id: org.id,
    });

    return NextResponse.json({ ok: true, data: org }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error.message || "Failed to create organization." }, { status: 400 });
  }
}
