import { NextResponse } from "next/server";
import { updateDocType, deleteDocType } from "../../../../lib/docTypesRepo";
import { writeAuditLog } from "../../../../lib/auditLogRequest";

export async function PUT(req, { params }) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const { name } = body;

    const updated = await updateDocType(id, name);
    await writeAuditLog(req, `Updated document type: ${id}`);
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
    await deleteDocType(id);
    await writeAuditLog(req, `Deleted document type: ${id}`);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err.message },
      { status: 400 }
    );
  }
}
