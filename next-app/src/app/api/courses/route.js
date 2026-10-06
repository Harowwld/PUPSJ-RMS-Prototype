import { NextResponse } from "next/server";
import { listCourses, archiveCourse } from "../../../lib/coursesRepo";
import { writeAuditLog } from "../../../lib/auditLogRequest";
import { requireAdmin, requireStaff, requireAuth, createAuthErrorResponse } from "../../../lib/authHelpers";
import { isSystemAdminRole, normalizeRole } from "../../../lib/roleUtils";
import { transaction } from "../../../lib/postgres.js";

export const dynamic = "force-dynamic";

function resolveOfficeId(user, req, requestedOfficeId) {
  const requested = String(requestedOfficeId || new URL(req.url).searchParams.get("officeId") || "").trim().toLowerCase();
  if (isSystemAdminRole(user.role) || user.role === "Student") return requested || "registrar";
  const ownOffice = String(user.officeId || user.office_id || "").trim().toLowerCase();
  if (requested && requested !== ownOffice) return null;
  return ownOffice || null;
}

function canViewArchived(user) {
  return isSystemAdminRole(user.role) || normalizeRole(user.role) === "Admin";
}

export async function GET(req) {
  const access = await requireAuth(req, ["Staff", "Admin", "SystemAdmin", "SuperAdmin", "Student"]);
  if (access.error || !access.user) return createAuthErrorResponse(access.error || "Authentication required", access.error?.startsWith("Access denied") ? 403 : 401);
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
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
    }
    const { code, name, blocks } = body;
    const officeId = resolveOfficeId(access.user, req, body.officeId || body.office_id);
    if (!officeId) return createAuthErrorResponse("You cannot access that office", 403);

    if (typeof code !== "string" || !code.trim() || typeof name !== "string" || !name.trim()) {
      return NextResponse.json(
        { ok: false, error: "Missing code or name" },
        { status: 400 }
      );
    }

    const normalizedCode = String(code).trim().toUpperCase();
    const normalizedName = String(name).trim();
    if (!normalizedCode || !normalizedName) {
      return NextResponse.json({ ok: false, error: "Course code and name are required" }, { status: 400 });
    }
    if (blocks !== undefined && !Array.isArray(blocks)) {
      return NextResponse.json({ ok: false, error: "Blocks must be an array" }, { status: 400 });
    }
    if (Array.isArray(blocks) && blocks.some((block) => typeof block !== "string" || !block.trim())) {
      return NextResponse.json({ ok: false, error: "Each course block must have a name" }, { status: 400 });
    }
    const normalizedBlocks = Array.isArray(blocks)
      ? blocks.map((block) => String(block || "").trim()).filter(Boolean)
      : [];
    if (new Set(normalizedBlocks).size !== normalizedBlocks.length) {
      return NextResponse.json({ ok: false, error: "Course block names must be unique" }, { status: 400 });
    }

    const newCourse = await transaction(async ({ query: run, queryOne: runOne }) => {
      const inserted = await runOne(
        `INSERT INTO courses (office_id, code, name, status)
         VALUES ($1, $2, $3, 'Active') RETURNING *`,
        [officeId, normalizedCode, normalizedName]
      );
      for (const blockName of normalizedBlocks) {
        await run(
          `INSERT INTO sections (office_id, name, course_code, status)
           VALUES ($1, $2, $3, 'Active')`,
          [officeId, blockName, normalizedCode]
        );
      }
      return inserted;
    });

    await writeAuditLog(req, `Create Degree Program`, {
        details: `deployed new academic program '${normalizedCode}' (${normalizedName})${normalizedBlocks.length > 0 ? ` with ${normalizedBlocks.length} initial course blocks` : ""}`,
        entity_type: "Course",
        entity_id: normalizedCode
    });
    return NextResponse.json({ ok: true, data: newCourse }, { status: 201 });
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
    if (!id || !/^\d+$/.test(id)) {
      return NextResponse.json({ ok: false, error: "Invalid course ID" }, { status: 400 });
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
    }
    const { code, name, status, blocks } = body;
    const officeId = resolveOfficeId(access.user, req, body.officeId || body.office_id);
    if (!officeId) return createAuthErrorResponse("You cannot access that office", 403);

    if (typeof code !== "string" || !code.trim() || typeof name !== "string" || !name.trim()) {
      return NextResponse.json(
        { ok: false, error: "Missing code or name" },
        { status: 400 }
      );
    }

    const normalizedCode = String(code).trim().toUpperCase();
    const normalizedName = String(name).trim();
    if (!normalizedCode || !normalizedName) {
      return NextResponse.json({ ok: false, error: "Course code and name are required" }, { status: 400 });
    }
    if (status !== undefined && !["Active", "Archived"].includes(status)) {
      return NextResponse.json({ ok: false, error: "Invalid status" }, { status: 400 });
    }
    if (blocks !== undefined && !Array.isArray(blocks)) {
      return NextResponse.json({ ok: false, error: "Blocks must be an array" }, { status: 400 });
    }
    if (Array.isArray(blocks) && blocks.some((block) => typeof block !== "string" || !block.trim())) {
      return NextResponse.json({ ok: false, error: "Each course block must have a name" }, { status: 400 });
    }
    const normalizedBlocks = Array.isArray(blocks)
      ? blocks.map((block) => String(block ?? "").trim()).filter(Boolean)
      : null;
    if (normalizedBlocks && new Set(normalizedBlocks).size !== normalizedBlocks.length) {
      return NextResponse.json({ ok: false, error: "Course block names must be unique" }, { status: 400 });
    }

    const updated = await transaction(async ({ query: run, queryOne: runOne }) => {
      const current = await runOne(
        "SELECT id, code, status FROM courses WHERE office_id = $1 AND id = $2 FOR UPDATE",
        [officeId, id]
      );
      if (!current) return null;

      if (normalizedBlocks) {
        const removedBlockInUse = await runOne(
          `SELECT EXISTS (
             SELECT 1
             FROM students s
             JOIN student_office_memberships som
               ON som.student_no = s.student_no
              AND som.office_id = $1
              AND som.status = 'Active'
             WHERE s.course_code = $2
               AND NOT (s.section = ANY($3::text[]))
           ) AS in_use`,
          [officeId, current.code, normalizedBlocks]
        );
        if (removedBlockInUse?.in_use) {
          return { error: "COURSE_BLOCKS_IN_USE" };
        }
      }

      const nextStatus = status === undefined ? current.status : status;
      const result = await runOne(
        `UPDATE courses SET code = $1, name = $2, status = $3
         WHERE office_id = $4 AND id = $5 RETURNING *`,
        [normalizedCode, normalizedName, nextStatus, officeId, id]
      );

      if (current.code !== normalizedCode) {
        await run(
          `UPDATE students s
           SET course_code = $1, updated_at = NOW()
           WHERE s.course_code = $2
             AND EXISTS (
               SELECT 1 FROM student_office_memberships som
               WHERE som.student_no = s.student_no
                 AND som.office_id = $3
                 AND som.status = 'Active'
             )`,
          [normalizedCode, current.code, officeId]
        );
      }

      if (status === "Archived") {
        await run(
          "UPDATE sections SET status = 'Archived', course_archived = TRUE WHERE office_id = $1 AND course_code = $2 AND status = 'Active'",
          [officeId, normalizedCode]
        );
      } else if (status === "Active" && current.status === "Archived") {
        await run(
          "UPDATE sections SET status = 'Active', course_archived = FALSE WHERE office_id = $1 AND course_code = $2 AND course_archived = TRUE",
          [officeId, normalizedCode]
        );
      }

      if (normalizedBlocks) {
        for (const blockName of normalizedBlocks) {
          await run(
            `INSERT INTO sections (office_id, name, course_code, status)
             VALUES ($1, $2, $3, 'Active')
             ON CONFLICT (office_id, name, course_code)
             DO UPDATE SET status = 'Active', course_archived = FALSE`,
            [officeId, blockName, normalizedCode]
          );
        }
        await run(
          `UPDATE sections SET status = 'Archived', course_archived = FALSE
           WHERE office_id = $1 AND course_code = $2
             AND NOT (name = ANY($3::text[])) AND status <> 'Archived'`,
          [officeId, normalizedCode, normalizedBlocks]
        );
      }
      return result;
    });
    if (updated?.error === "COURSE_BLOCKS_IN_USE") {
      return NextResponse.json(
        { ok: false, error: "Cannot remove a course block while student records use it." },
        { status: 409 }
      );
    }
    if (!updated) {
      return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
    }

    // Log specifically if we're toggling status
    if (status) {
         await writeAuditLog(req, `${status === "Active" ? "Restore" : "Archive"} Degree Program`, { 
           details: `${status === "Active" ? "restored" : "archived"} academic program designation '${normalizedCode}' (${normalizedName})`,
           severity: status === "Archived" ? "WARNING" : "INFO",
           entity_type: "Course",
           entity_id: normalizedCode
         });
    } else {
         await writeAuditLog(req, `Update Degree Program`, { 
           details: `updated configuration for academic program '${normalizedCode}' (${normalizedName})${Array.isArray(blocks) ? ` and synchronized its ${normalizedBlocks.length} block(s)` : ""}`,
           entity_type: "Course",
           entity_id: normalizedCode
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
    if (id && !/^\d+$/.test(id)) {
      return NextResponse.json({ ok: false, error: "Invalid course ID" }, { status: 400 });
    }
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
      const restored = await restoreCourse(id, officeId);
      if (!restored) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
      await writeAuditLog(req, `Restore Degree Program`, {
          details: `restored academic program '${target?.code || id}' from system archive`,
          entity_type: "Course",
          entity_id: id
      });
    } else {
      const archived = await archiveCourse(id, officeId);
      if (!archived) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
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
