import { NextResponse } from "next/server";
import { 
  createDocType, 
  listDocTypes, 
  listAllDocTypes, 
  createDocTypeFull, 
  updateDocType, 
  archiveDocType, 
  restoreDocType 
} from "../../../lib/docTypesRepo";
import { writeAuditLog } from "../../../lib/auditLogRequest";

export const runtime = "nodejs";

async function getTargetName(id) {
  try {
    const rows = await listAllDocTypes({ includeArchived: true });
    const target = rows.find(r => String(r.id) === String(id));
    return target?.name || id;
  } catch {
    return id;
  }
}

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const includeArchived = searchParams.get("includeArchived") === "true";
  
  if (searchParams.get("admin") === "true") {
    const rows = await listAllDocTypes({ includeArchived });
    return NextResponse.json({ ok: true, data: rows });
  }

  const rows = await listDocTypes({ includeArchived });
  return NextResponse.json({ ok: true, data: rows });
}

export async function POST(req) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const name = String(body.name || "").trim();
  if (!name) {
    return NextResponse.json(
      { ok: false, error: "Missing name" },
      { status: 400 }
    );
  }

  try {
    const { searchParams } = new URL(req.url);
    if (searchParams.get("admin") === "true") {
      const created = await createDocTypeFull(name);
      await writeAuditLog(req, `Created document type (admin): ${name}`);
      return NextResponse.json({ ok: true, data: created }, { status: 201 });
    }

    const created = await createDocType(name);
    await writeAuditLog(req, `Created document type: ${name}`);
    return NextResponse.json({ ok: true, data: created }, { status: 201 });
  } catch (e) {
    const msg = String(e?.message || "");
    if (msg.includes("UNIQUE") || msg.toLowerCase().includes("unique") || msg.includes("already exists")) {
      const { searchParams } = new URL(req.url);
      if (searchParams.get("admin") === "true") {
        return NextResponse.json({ ok: false, error: "Document type already exists" }, { status: 400 });
      }
      return NextResponse.json({ ok: true, data: name }, { status: 200 });
    }
    return NextResponse.json(
      { ok: false, error: "Failed to create document type: " + msg },
      { status: 500 }
    );
  }
}

export async function PUT(req) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) throw new Error("Missing document type ID");

    const body = await req.json().catch(() => ({}));
    const { name } = body;

    if (!name) throw new Error("Document name is required");

    const updated = await updateDocType(id, name);
    await writeAuditLog(req, `Updated document type: ${updated.name}`);
    return NextResponse.json({ ok: true, data: updated });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err.message },
      { status: 400 }
    );
  }
}

export async function PATCH(req) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) throw new Error("Missing document type ID");

    const body = await req.json().catch(() => ({}));
    const { status } = body;
    const name = await getTargetName(id);

    if (status === "Active") {
      await restoreDocType(id);
      await writeAuditLog(req, `Restored document type: ${name}`);
    } else if (status === "Archived") {
      await archiveDocType(id);
      await writeAuditLog(req, `Archived document type: ${name}`);
    } else {
       throw new Error("Invalid status update");
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err.message },
      { status: 400 }
    );
  }
}

export async function DELETE(req) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) throw new Error("Missing document type ID");

    const name = await getTargetName(id);
    await archiveDocType(id);
    await writeAuditLog(req, `Archived document type: ${name}`);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err.message },
      { status: 400 }
    );
  }
}
