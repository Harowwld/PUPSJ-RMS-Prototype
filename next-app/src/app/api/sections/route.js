import { NextResponse } from "next/server";
import { listSections, createSection, updateSection, archiveSection } from "../../../lib/sectionsRepo";
import { writeAuditLog } from "../../../lib/auditLogRequest";

export const dynamic = "force-dynamic";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const courseCode = String(searchParams.get("courseCode") || "").trim().toUpperCase();
    const includeArchived = searchParams.get("includeArchived") === "true";
    const sections = await listSections({ includeArchived });
    const scoped = courseCode
      ? (sections || []).filter((s) => s && String(s.course_code || "").toUpperCase() === courseCode)
      : (sections || []);
    return NextResponse.json({ ok: true, data: scoped });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: "Failed to list sections: " + error.message },
      { status: 500 }
    );
  }
}

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const { name, courseCode } = body;

    if (!name || !courseCode) {
      return NextResponse.json(
        { ok: false, error: "Missing name or courseCode" },
        { status: 400 }
      );
    }

    const newSection = await createSection(name, courseCode);
    
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
      { ok: false, error: msg },
      { status: 400 }
    );
  }
}

export async function PUT(req) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) throw new Error("Missing section ID");

    const body = await req.json().catch(() => ({}));
    const { name, courseCode, status } = body;

    if (!name || !courseCode) {
      return NextResponse.json(
        { ok: false, error: "Missing name or courseCode" },
        { status: 400 }
      );
    }

    const updated = await updateSection(id, name, courseCode, status);
    
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
    const silent = searchParams.get("silent") === "true" || searchParams.get("silent") === "1";

    if (!id) {
      return NextResponse.json(
        { ok: false, error: "Missing section ID" },
        { status: 400 }
      );
    }

    const sections = await listSections({ includeArchived: true });
    const target = (sections || []).find(s => s && String(s.id) === String(id));

    if (restore) {
      const { restoreSection } = await import("../../../lib/sectionsRepo");
      await restoreSection(id);
      if (!silent) {
        await writeAuditLog(req, `Restore Course Block`, { 
          details: `restored section block '${target?.name || id}' (Program: ${target?.course_code || "Unknown"}) from system archive`,
          entity_type: "Section",
          entity_id: id
        });
      }
    } else {
      await archiveSection(id);
      if (!silent) {
        await writeAuditLog(req, `Archive Course Block`, { 
          details: `archived section block '${target?.name || id}' (Program: ${target?.course_code || "Unknown"}) and disabled associated student routing`,
          severity: "WARNING",
          entity_type: "Section",
          entity_id: id
        });
      }
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 400 }
    );
  }
}
