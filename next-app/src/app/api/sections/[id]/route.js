import { NextResponse } from "next/server";
import { updateSection, deleteSection } from "../../../../lib/sectionsRepo";
import { writeAuditLog } from "../../../../lib/auditLogRequest";

export async function PUT(req, { params }) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const { name, courseCode } = body;

    const updated = await updateSection(id, name, courseCode);
    await writeAuditLog(req, `Updated section: ${id}`);
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
    await deleteSection(id);
    await writeAuditLog(req, `Deleted section: ${id}`);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err.message },
      { status: 400 }
    );
  }
}
