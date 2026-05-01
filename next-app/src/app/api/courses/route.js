import { NextResponse } from "next/server";
import { listCourses, createCourse, updateCourse, archiveCourse } from "../../../lib/coursesRepo";
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
    const { code, name } = body;

    if (!code || !name) {
      return NextResponse.json(
        { ok: false, error: "Missing code or name" },
        { status: 400 }
      );
    }

    const newCourse = await createCourse(code, name);
    await writeAuditLog(req, `Created course: ${code}`);
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
       await writeAuditLog(req, `${status === "Active" ? "Restored" : "Archived"} degree program: ${updated.code}`);
    } else {
       await writeAuditLog(req, `Updated degree program: ${updated.code}`);
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
      await writeAuditLog(req, `Restored degree program: ${target?.code || id}`);
    } else {
      await archiveCourse(id);
      await writeAuditLog(req, `Archived degree program: ${target?.code || id}`);
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 400 }
    );
  }
}
