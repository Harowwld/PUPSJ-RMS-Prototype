import { NextResponse } from "next/server";
import { createDocTypeFull } from "../../../../lib/docTypesRepo";
import { createCourse } from "../../../../lib/coursesRepo";
import { createSection } from "../../../../lib/sectionsRepo";
import { writeAuditLog } from "../../../../lib/auditLogRequest";
import { requireAdmin, createAuthErrorResponse } from "../../../../lib/authHelpers";
import { canAccessOffice, isSystemAdminRole } from "../../../../lib/roleUtils";

export const runtime = "nodejs";

export async function POST(req) {
  const access = await requireAdmin(req);
  if (access.error || !access.user) return createAuthErrorResponse(access.error || "Admin access required", access.error?.startsWith("Access denied") ? 403 : 401);
  const body = await req.json().catch(() => null);
  if (!body || !Array.isArray(body.rows)) {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON body or missing rows" },
      { status: 400 }
    );
  }

  const { rows } = body;
  const requestedOffice = body.officeId || body.office_id;
  const officeId = isSystemAdminRole(access.user.role)
    ? String(requestedOffice || "registrar").trim().toLowerCase()
    : String(access.user.officeId || access.user.office_id || "").trim().toLowerCase();
  if (!officeId || (!isSystemAdminRole(access.user.role) && !canAccessOffice(access.user, officeId))) {
    return createAuthErrorResponse("You cannot access that office", 403);
  }
  let successCount = 0;
  let failCount = 0;

  // Sort rows to ensure dependency order: Courses (degree programs) must be processed first to satisfy foreign keys for Sections (course blocks)
  const sortedRows = [...rows].sort((a, b) => {
    const catA = String(a.category || "").toLowerCase().trim();
    const catB = String(b.category || "").toLowerCase().trim();
    if (catA === "course" && catB !== "course") return -1;
    if (catA !== "course" && catB === "course") return 1;
    if (catA === "section" && catB !== "section" && catB !== "course") return -1;
    if (catA !== "section" && catA !== "course" && catB === "section") return 1;
    return 0;
  });

  for (const row of sortedRows) {
    const { category, name, code } = row;
    const cat = String(category || "").toLowerCase().trim();
    try {
      if (cat === "documenttype" || cat === "document type") {
        if (!name) throw new Error("Missing name");
        await createDocTypeFull(name, officeId);
        successCount++;
      } else if (cat === "course") {
        if (!code || !name) throw new Error("Course requires code and name");
        await createCourse(code, name, officeId);
        successCount++;
      } else if (cat === "section") {
        if (!name) throw new Error("Missing name");
        const safeCode = code ? code : "UNKN";
        await createSection(name, safeCode, officeId);
        successCount++;
      } else {
        // Unknown category - count as failure
        failCount++;
        continue;
      }
    } catch (e) {
      failCount++;
    }
  }

  if (rows.length > 0) {
    const action = "Bulk Data Import";
    const details = `processed batch taxonomy ingestion: ${successCount} added, ${failCount} skipped as duplicates or invalid`;
    const severity = (failCount > 0 && successCount > 0) ? "WARNING" : "INFO";
    
    await writeAuditLog(req, action, { 
      details, 
      severity,
      entity_type: "System"
    });
  }

  return NextResponse.json({ ok: true, data: { successCount, failCount } });
}
