import { NextResponse } from "next/server";
import { requireOfficeModule } from "@/lib/moduleAccess";
import { createOrganization, updateOrganization, getOrganizationById } from "@/lib/organizationsRepo";
import { queryOne } from "@/lib/postgres";
import { writeGlobalAuditLog } from "@/lib/auditLogRequest";

export const runtime = "nodejs";

export async function POST(req) {
  let access = await requireOfficeModule("student_organizations", { officeId: "osas" }, req);
  if (!access) {
    access = await requireOfficeModule("scan_upload", { officeId: "osas" }, req);
  }
  if (access === null) return NextResponse.json({ ok: false, error: "Authentication required" }, { status: 401 });
  if (!access) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => null);
  if (!body || !Array.isArray(body.rows)) {
    return NextResponse.json({ ok: false, error: "Invalid JSON body, expected array of rows" }, { status: 400 });
  }

  const rows = body.rows;
  const results = [];

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const name = String(r?.name || r?.organization || "").trim();
    const acronym = String(r?.acronym || "").trim();
    const category = String(r?.category || "Academic").trim();
    const adviserName = String(r?.adviserName || r?.adviser || "").trim();
    const adviserEmail = String(r?.adviserEmail || r?.email || "").trim();
    const room = parseInt(r?.room) || 1;
    const defaultCab = category.toLowerCase().includes("non-academic") ? "NON-ACADEMIC ORGANIZATIONS" : "ACADEMIC ORGANIZATIONS";
    const cabinet = String(r?.cabinet || defaultCab).trim();
    const drawer = String(r?.drawer || 1).trim();

    if (!name) {
      results.push({ index: i, ok: false, error: "Organization name is required" });
      continue;
    }

    try {
      // Check if organization already exists by name or acronym
      const existing = await queryOne(
        `SELECT id FROM student_organizations
         WHERE lower(name) = lower($1) OR ($2::text IS NOT NULL AND lower(coalesce(acronym, '')) = lower($2))`,
        [name, acronym || null]
      );

      let record;
      if (existing) {
        record = await updateOrganization(existing.id, {
          name,
          acronym: acronym || undefined,
          category,
          adviserName: adviserName || undefined,
          adviserEmail: adviserEmail || undefined,
          storageRoom: room,
          storageCabinet: cabinet,
          storageDrawer: drawer,
        });
      } else {
        record = await createOrganization({
          name,
          acronym: acronym || undefined,
          category,
          adviserName: adviserName || undefined,
          adviserEmail: adviserEmail || undefined,
          storageRoom: room,
          storageCabinet: cabinet,
          storageDrawer: drawer,
        });
      }

      results.push({ index: i, ok: true, data: record });
    } catch (e) {
      results.push({ index: i, ok: false, error: e?.message || "Failed to process organization" });
    }
  }

  const successCount = results.filter((r) => r.ok).length;
  const failCount = results.length - successCount;

  await writeGlobalAuditLog(req, "Batch student organization import", {
    officeId: "osas",
    details: `Imported ${rows.length} organizations (${successCount} successful, ${failCount} failed).`,
    entity_type: "student_organization",
  });

  return NextResponse.json({ ok: true, data: results });
}
