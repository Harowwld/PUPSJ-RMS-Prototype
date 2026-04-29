import { NextResponse } from "next/server";
import { listSections, createSection, updateSection, deleteSection } from "../../../lib/sectionsRepo";
import { writeAuditLog } from "../../../lib/auditLogRequest";

export const dynamic = "force-dynamic";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const courseCode = String(searchParams.get("courseCode") || "").trim().toUpperCase();
    const sections = await listSections();
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
    const { name, courseCode } = body;

    if (!name || !courseCode) {
      return NextResponse.json(
        { ok: false, error: "Missing name or courseCode" },
        { status: 400 }
      );
    }

    const updated = await updateSection(id, name, courseCode);
    await writeAuditLog(req, `Updated section: ${name} (${courseCode})`);
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

    if (!id) {
      return NextResponse.json(
        { ok: false, error: "Missing section ID" },
        { status: 400 }
      );
    }

    await deleteSection(id);
    await writeAuditLog(req, `Deleted section ID: ${id}`);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 400 }
    );
  }
}
