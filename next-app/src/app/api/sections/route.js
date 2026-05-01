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
      ? sections.filter((s) => String(s.course_code || "").toUpperCase() === courseCode)
      : sections;
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
    await writeAuditLog(req, `Created section: ${name} (${courseCode})`);
    return NextResponse.json({ ok: true, data: newSection });
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
    // Log specifically if we're toggling status
    if (status) {
       await writeAuditLog(req, `${status === "Active" ? "Restored" : "Archived"} course block: ${updated.name}`);
    } else {
       await writeAuditLog(req, `Updated course block: ${updated.name}`);
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
        { ok: false, error: "Missing section ID" },
        { status: 400 }
      );
    }

    const sections = await listSections({ includeArchived: true });
    const target = sections.find(s => String(s.id) === String(id));

    if (restore) {
      const { restoreSection } = await import("../../../lib/sectionsRepo");
      await restoreSection(id);
      await writeAuditLog(req, `Restored course block: ${target?.name || id}`);
    } else {
      await archiveSection(id);
      await writeAuditLog(req, `Archived course block: ${target?.name || id}`);
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 400 }
    );
  }
}
