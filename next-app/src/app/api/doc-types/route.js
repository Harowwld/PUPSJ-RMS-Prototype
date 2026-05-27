import { NextResponse } from "next/server";
import {
  createDocType,
  listDocTypes,
  listAllDocTypes,
  updateDocType,
  archiveDocType,
  restoreDocType
} from "../../../lib/docTypesRepo";
import { writeAuditLog } from "../../../lib/auditLogRequest";

export const runtime = "nodejs";

async function getTargetName(id) {
  try {
    const rows = await listAllDocTypes({ includeArchived: true });
    if (!Array.isArray(rows)) return id;
    const target = rows.find(r => r && String(r.id) === String(id));
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
    return NextResponse.json({ ok: true, data: rows || [] });
  }

  const rows = await listDocTypes({ includeArchived });
  return NextResponse.json({ ok: true, data: rows || [] });
}

export async function POST(req) {
  const { searchParams } = new URL(req.url);
  const silent = searchParams.get("silent") === "true" || searchParams.get("silent") === "1";
  const isAdmin = searchParams.get("admin") === "true";

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
    // Attempt creation with high reliability
    const created = await createDocType(name);
    
    // Defensive check before logging
    const safeId = created && typeof created === 'object' ? created.id : null;

    if (!silent) {
      await writeAuditLog(req, `Create Document Type`, {
        details: isAdmin 
          ? `created new administrative document type identifier '${name}'`
          : `registered new document category '${name}' in system taxonomy`,
        entity_type: "DocumentType",
        entity_id: safeId || "NEW"
      });
    }
    
    return NextResponse.json({ ok: true, data: created }, { status: 201 });

  } catch (e) {
    const msg = String(e?.message || "Unknown Error");
    if (msg.toLowerCase().includes("already exists")) {
      return NextResponse.json({ ok: false, error: "Document type already exists" }, { status: 400 });
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
    const silent = searchParams.get("silent") === "true" || searchParams.get("silent") === "1";
    if (!id) throw new Error("Missing document type ID");

    const body = await req.json().catch(() => ({}));
    const { name } = body;

    if (!name) throw new Error("Document name is required");

    const updated = await updateDocType(id, name);
    if (!silent) {
      await writeAuditLog(req, `Update Document Type`, {
        details: `updated configuration for document type identifier '${updated?.name || name}'`,
        entity_type: "DocumentType",
        entity_id: id
      });
    }
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
    const silent = searchParams.get("silent") === "true" || searchParams.get("silent") === "1";
    if (!id) throw new Error("Missing document type ID");

    const body = await req.json().catch(() => ({}));
    const { status } = body;
    const name = await getTargetName(id);

    if (status === "Active") {
      await restoreDocType(id);
      if (!silent) {
        await writeAuditLog(req, `Restore Document Type`, {
          details: `restored document type '${name}' from system archive`,
          entity_type: "DocumentType",
          entity_id: id
        });
      }
    } else if (status === "Archived") {
      await archiveDocType(id);
      if (!silent) {
        await writeAuditLog(req, `Archive Document Type`, {
          details: `archived document type '${name}' and disabled its requirement logic`,
          severity: "WARNING",
          entity_type: "DocumentType",
          entity_id: id
        });
      }
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
    const silent = searchParams.get("silent") === "true" || searchParams.get("silent") === "1";
    if (!id) throw new Error("Missing document type ID");

    const name = await getTargetName(id);
    await archiveDocType(id);
    if (!silent) {
      await writeAuditLog(req, `Archive Document Type`, {
        details: `archived document type '${name}' and disabled its requirement logic`,
        severity: "WARNING",
        entity_type: "DocumentType",
        entity_id: id
      });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err.message },
      { status: 400 }
    );
  }
}
