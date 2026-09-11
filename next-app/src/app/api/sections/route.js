import { NextResponse } from "next/server";
import { listSections, createSection, updateSection, archiveSection } from "../../../lib/sectionsRepo";
import { writeAuditLog } from "../../../lib/auditLogRequest";
import { requireAdmin, requireStaff, createAuthErrorResponse } from "../../../lib/authHelpers";
import { isSystemAdminRole, normalizeRole } from "../../../lib/roleUtils";

export const dynamic = "force-dynamic";

function resolveOfficeId(user, req, requestedOfficeId) {
  const requested = String(requestedOfficeId || new URL(req.url).searchParams.get("officeId") || "").trim().toLowerCase();
  if (isSystemAdminRole(user.role)) return requested || "registrar";
  const ownOffice = String(user.officeId || user.office_id || "").trim().toLowerCase();
  if (requested && requested !== ownOffice) return null;
  return ownOffice || null;
}

function canViewArchived(user) {
  return isSystemAdminRole(user.role) || normalizeRole(user.role) === "Admin";
}

export async function GET(req) {
  const access = await requireStaff(req);
  if (access.error || !access.user) return createAuthErrorResponse(access.error || "Staff authentication required", access.error?.startsWith("Access denied") ? 403 : 401);
  try {
    const { searchParams } = new URL(req.url);
    const courseCode = String(searchParams.get("courseCode") || "").trim().toUpperCase();
    const includeArchived = searchParams.get("includeArchived") === "true";
    if (includeArchived && !canViewArchived(access.user)) {
      return createAuthErrorResponse("Admin access required", 403);
    }
    const officeId = resolveOfficeId(access.user, req);
    if (!officeId) return createAuthErrorResponse("Office scope is required", 403);
    const sections = await listSections({ includeArchived, officeId });
    const scoped = courseCode
      ? (sections || []).filter((s) => s && String(s.course_code || "").toUpperCase() === courseCode)
      : (sections || []);
    return NextResponse.json({ ok: true, data: scoped });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: "Failed to list sections" },
      { status: 500 }
    );
  }
}

export async function POST(req) {
  const access = await requireAdmin(req);
  if (access.error || !access.user) return createAuthErrorResponse(access.error || "Admin access required", access.error?.startsWith("Access denied") ? 403 : 401);
  try {
    const body = await req.json().catch(() => ({}));
    const { name, courseCode } = body;
    const officeId = resolveOfficeId(access.user, req, body.officeId || body.office_id);
    if (!officeId) return createAuthErrorResponse("You cannot access that office", 403);

    if (!name || !courseCode) {
      return NextResponse.json(
        { ok: false, error: "Missing name or courseCode" },
        { status: 400 }
      );
    }

    const newSection = await createSection(name, courseCode, officeId);
    
    // Defensive property access for audit logging
    const safeId = newSection && typeof newSection === 'object' ? newSection.id : "NEW";

    await writeAuditLog(req, `Create Course Block`, { 
      details: `created new course section block '${name}' assigned to academic program '${courseCode}'`,
      entity_type: "Section",
      entity_id: safeId
    });
    
    return NextResponse.json({ ok: true, data: newSection }, { status: 201 });
  } catch (error) {
    const msg = String(error?.message || "Unknown Error");
    return NextResponse.json(
      { ok: false, error: msg.toLowerCase().includes("already exists") ? "Section already exists" : "Request could not be completed" },
      { status: 400 }
    );
  }
}

export async function PUT(req) {
  const access = await requireAdmin(req);
  if (access.error || !access.user) return createAuthErrorResponse(access.error || "Admin access required", access.error?.startsWith("Access denied") ? 403 : 401);
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) throw new Error("Missing section ID");

    const body = await req.json().catch(() => ({}));
    const { name, courseCode, status } = body;
    const officeId = resolveOfficeId(access.user, req, body.officeId || body.office_id);
    if (!officeId) return createAuthErrorResponse("You cannot access that office", 403);

    if (!name || !courseCode) {
      return NextResponse.json(
        { ok: false, error: "Missing name or courseCode" },
        { status: 400 }
      );
    }

    const updated = await updateSection(id, name, courseCode, status, officeId);
    
    if (status) {
       await writeAuditLog(req, `${status === "Active" ? "Restore" : "Archive"} Course Block`, { 
         details: `${status === "Active" ? "restored" : "archived"} section block identifier '${name}' (Program: ${courseCode})`,
         severity: status === "Archived" ? "WARNING" : "INFO",
         entity_type: "Section",
         entity_id: id
       });
    } else {
       await writeAuditLog(req, `Update Course Block`, { 
         details: `updated configuration for course section block '${name}' (Program: ${courseCode})`,
         entity_type: "Section",
         entity_id: id
       });
    }
    return NextResponse.json({ ok: true, data: updated });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: "Request could not be completed" },
      { status: 400 }
    );
  }
}

export async function DELETE(req) {
  const access = await requireAdmin(req);
  if (access.error || !access.user) return createAuthErrorResponse(access.error || "Admin access required", access.error?.startsWith("Access denied") ? 403 : 401);
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const restore = searchParams.get("restore") === "true";
    const officeId = resolveOfficeId(access.user, req);
    if (!officeId) return createAuthErrorResponse("Office scope is required", 403);

    if (!id) {
      return NextResponse.json(
        { ok: false, error: "Missing section ID" },
        { status: 400 }
      );
    }

    const sections = await listSections({ includeArchived: true, officeId });
    const target = (sections || []).find(s => s && String(s.id) === String(id));
    if (!target) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });

    if (restore) {
      const { restoreSection } = await import("../../../lib/sectionsRepo");
      await restoreSection(id, officeId);
      await writeAuditLog(req, `Restore Course Block`, {
          details: `restored section block '${target?.name || id}' (Program: ${target?.course_code || "Unknown"}) from system archive`,
          entity_type: "Section",
          entity_id: id
      });
    } else {
      await archiveSection(id, officeId);
      await writeAuditLog(req, `Archive Course Block`, {
          details: `archived section block '${target?.name || id}' (Program: ${target?.course_code || "Unknown"}) and disabled associated student routing`,
          severity: "WARNING",
          entity_type: "Section",
          entity_id: id
      });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: "Request could not be completed" },
      { status: 400 }
    );
  }
}
