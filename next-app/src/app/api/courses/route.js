import { NextResponse } from "next/server";
import { listCourses, createCourse, updateCourse, archiveCourse } from "../../../lib/coursesRepo";
import { createSection } from "../../../lib/sectionsRepo";
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
    const includeArchived = searchParams.get("includeArchived") === "true";
    if (includeArchived && !canViewArchived(access.user)) {
      return createAuthErrorResponse("Admin access required", 403);
    }
    const officeId = resolveOfficeId(access.user, req);
    if (!officeId) return createAuthErrorResponse("Office scope is required", 403);
    const courses = await listCourses({ includeArchived, officeId });
    return NextResponse.json({ ok: true, data: courses });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: "Failed to list courses" },
      { status: 500 }
    );
  }
}

export async function POST(req) {
  const access = await requireAdmin(req);
  if (access.error || !access.user) return createAuthErrorResponse(access.error || "Admin access required", access.error?.startsWith("Access denied") ? 403 : 401);
  try {
    const { searchParams } = new URL(req.url);
    const body = await req.json().catch(() => ({}));
    const { code, name, blocks } = body;
    const officeId = resolveOfficeId(access.user, req, body.officeId || body.office_id);
    if (!officeId) return createAuthErrorResponse("You cannot access that office", 403);

    if (!code || !name) {
      return NextResponse.json(
        { ok: false, error: "Missing code or name" },
        { status: 400 }
      );
    }

    const newCourse = await createCourse(code, name, officeId);

    // Create initial blocks if provided
    if (Array.isArray(blocks) && blocks.length > 0) {
      for (const blockName of blocks) {
        if (blockName.trim()) {
          await createSection(blockName, code, officeId);
        }
      }
    }

    await writeAuditLog(req, `Create Degree Program`, {
        details: `deployed new academic program '${code}' (${name})${Array.isArray(blocks) && blocks.length > 0 ? ` with ${blocks.length} initial course blocks` : ""}`,
        entity_type: "Course",
        entity_id: code
    });
    return NextResponse.json({ ok: true, data: newCourse });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: "Request could not be completed" },
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
    if (!id) throw new Error("Missing course ID");

    const body = await req.json().catch(() => ({}));
    const { code, name, status, blocks } = body;
    const officeId = resolveOfficeId(access.user, req, body.officeId || body.office_id);
    if (!officeId) return createAuthErrorResponse("You cannot access that office", 403);

    if (!code || !name) {
      return NextResponse.json(
        { ok: false, error: "Missing code or name" },
        { status: 400 }
      );
    }

    const updated = await updateCourse(id, code, name, status, officeId);

    // Block Synchronization (if blocks array provided)
    if (Array.isArray(blocks)) {
      const { listSections, createSection, archiveSection } = await import("../../../lib/sectionsRepo");
      const allSections = await listSections({ includeArchived: false, officeId });
      const currentBlocks = allSections.filter(s => s.course_code === code);
      
      const newBlockNames = blocks.map(b => b.trim()).filter(Boolean);
      const existingBlockNames = currentBlocks.map(s => s.name);

      // 1. Add New Blocks
      for (const bName of newBlockNames) {
        if (!existingBlockNames.includes(bName)) {
          await createSection(bName, code, officeId);
        }
      }

      // 2. Archive Removed Blocks
      for (const s of currentBlocks) {
        if (!newBlockNames.includes(s.name)) {
          await archiveSection(s.id, officeId);
        }
      }
    }

    // Log specifically if we're toggling status
    if (status) {
         await writeAuditLog(req, `${status === "Active" ? "Restore" : "Archive"} Degree Program`, { 
           details: `${status === "Active" ? "restored" : "archived"} academic program designation '${code}' (${name})`,
           severity: status === "Archived" ? "WARNING" : "INFO",
           entity_type: "Course",
           entity_id: code
         });
    } else {
         await writeAuditLog(req, `Update Degree Program`, { 
           details: `updated configuration for academic program '${code}' (${name})${Array.isArray(blocks) ? ` and synchronized its ${blocks.length} block(s)` : ""}`,
           entity_type: "Course",
           entity_id: code
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
        { ok: false, error: "Missing course ID" },
        { status: 400 }
      );
    }

    const courses = await listCourses({ includeArchived: true, officeId });
    const target = courses.find(c => String(c.id) === String(id));
    if (!target) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });

    if (restore) {
      const { restoreCourse } = await import("../../../lib/coursesRepo");
      await restoreCourse(id, officeId);
      await writeAuditLog(req, `Restore Degree Program`, {
          details: `restored academic program '${target?.code || id}' from system archive`,
          entity_type: "Course",
          entity_id: id
      });
    } else {
      await archiveCourse(id, officeId);
      await writeAuditLog(req, `Archive Degree Program`, {
          details: `archived academic program '${target?.code || id}' and disabled associated enrollment routes`,
          severity: "WARNING",
          entity_type: "Course",
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
