import fs from "node:fs";
import { NextResponse } from "next/server";
import {
  deleteDocument,
  getDocumentById,
  getDocumentFilePath,
  updateDocumentMetadata,
} from "../../../../lib/documentsRepo";

export const runtime = "nodejs";

export async function GET(_req, ctx) {
  const params = await ctx.params;
  const raw = params.id;
  const id = Number(raw);
  if (!Number.isInteger(id) || id < 1) {
    return NextResponse.json(
      { ok: false, error: `Invalid id: ${raw}` },
      { status: 400 }
    );
  }

  const row = await getDocumentById(id);
  if (!row) {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }

  const filePath = getDocumentFilePath(row);

  if (!fs.existsSync(filePath)) {
    return NextResponse.json(
      { ok: false, error: "File missing on disk" },
      { status: 404 }
    );
  }

  const bytes = fs.readFileSync(filePath);

  return new NextResponse(bytes, {
    status: 200,
    headers: {
      "Content-Type": row.mime_type || "application/pdf",
      "Content-Length": String(bytes.length),
      "Content-Disposition": `inline; filename=\"${row.original_filename}\"`,
    },
  });
}

export async function PATCH(req, ctx) {
  const params = await ctx.params;
  const raw = params.id;
  const id = Number(raw);
  if (!Number.isInteger(id) || id < 1) {
    return NextResponse.json(
      { ok: false, error: `Invalid id: ${raw}` },
      { status: 400 }
    );
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const studentNo =
    body.studentNo === undefined ? undefined : String(body.studentNo).trim();
  const studentName =
    body.studentName === undefined ? undefined : String(body.studentName).trim();
  const docType = body.docType === undefined ? undefined : String(body.docType).trim();

  const row = await updateDocumentMetadata(id, { studentNo, studentName, docType });
  if (!row) {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, data: row });
}

export async function DELETE(_req, ctx) {
  const params = await ctx.params;
  const raw = params.id;
  const id = Number(raw);
  if (!Number.isInteger(id) || id < 1) {
    return NextResponse.json(
      { ok: false, error: `Invalid id: ${raw}` },
      { status: 400 }
    );
  }

  const row = await deleteDocument(id);
  if (!row) {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, data: row });
}
