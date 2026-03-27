import { NextResponse } from "next/server";
import { updateCourse, deleteCourse } from "../../../../lib/coursesRepo";
import { writeAuditLog } from "../../../../lib/auditLogRequest";

export async function PUT(req, { params }) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const { code, name } = body;

    const updated = await updateCourse(id, code, name);
    await writeAuditLog(req, `Updated course: ${id}`);
    return NextResponse.json({ ok: true, data: updated });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err.message },
      { status: 400 }
    );
  }
}

export async function DELETE(req, { params }) {
  try {
    const { id } = await params;
    await deleteCourse(id);
    await writeAuditLog(req, `Deleted course: ${id}`);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err.message },
      { status: 400 }
    );
  }
}
