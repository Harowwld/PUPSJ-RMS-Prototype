import { NextResponse } from "next/server";
import { listCourses, createCourse, updateCourse, archiveCourse } from "../../../lib/coursesRepo";
import { createSection } from "../../../lib/sectionsRepo";
import { writeAuditLog } from "../../../lib/auditLogRequest";

export const dynamic = "force-dynamic";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const includeArchived = searchParams.get("includeArchived") === "true";
    const courses = await listCourses({ includeArchived });
    return NextResponse.json({ ok: true, data: courses });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: "Failed to list courses: " + error.message },
      { status: 500 }
    );
  }
}

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const { code, name, blocks } = body;

    if (!code || !name) {
      return NextResponse.json(
        { ok: false, error: "Missing code or name" },
        { status: 400 }
      );
    }

    const newCourse = await createCourse(code, name);

    // Create initial blocks if provided
    if (Array.isArray(blocks) && blocks.length > 0) {
      for (const blockName of blocks) {
        if (blockName.trim()) {
          await createSection(blockName, code);
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
      { ok: false, error: error.message },
      { status: 400 }
    );
  }
}

export async function PUT(req) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) throw new Error("Missing course ID");

    const body = await req.json().catch(() => ({}));
    const { code, name, status } = body;

    if (!code || !name) {
      return NextResponse.json(
        { ok: false, error: "Missing code or name" },
        { status: 400 }
      );
    }

    const updated = await updateCourse(id, code, name, status);
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
         details: `updated configuration for academic program '${code}' (${name})`,
         entity_type: "Course",
         entity_id: code
       });
    }
    return NextResponse.json({ ok: true, data: updated });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 400 }
    );
  }
}

export async function DELETE(req) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const restore = searchParams.get("restore") === "true";

    if (!id) {
      return NextResponse.json(
        { ok: false, error: "Missing course ID" },
        { status: 400 }
      );
    }

    const courses = await listCourses({ includeArchived: true });
    const target = courses.find(c => String(c.id) === String(id));

    if (restore) {
      const { restoreCourse } = await import("../../../lib/coursesRepo");
      await restoreCourse(id);
      await writeAuditLog(req, `Restore Degree Program`, { 
        details: `restored academic program '${target?.code || id}' from system archive`,
        entity_type: "Course",
        entity_id: id
      });
    } else {
      await archiveCourse(id);
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
      { ok: false, error: error.message },
      { status: 400 }
    );
  }
}
