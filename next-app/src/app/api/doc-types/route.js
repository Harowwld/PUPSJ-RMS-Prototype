import { NextResponse } from "next/server";
import { createDocType, listDocTypes, listAllDocTypes, createDocTypeFull } from "../../../lib/docTypesRepo";

export const runtime = "nodejs";

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  if (searchParams.get("admin") === "true") {
    const rows = await listAllDocTypes();
    return NextResponse.json({ ok: true, data: rows });
  }

  const rows = await listDocTypes();
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
      return NextResponse.json({ ok: true, data: created }, { status: 201 });
    }

    const created = await createDocType(name);
    return NextResponse.json({ ok: true, data: created }, { status: 201 });
  } catch (e) {
    const msg = String(e?.message || "");
    if (msg.includes("UNIQUE") || msg.toLowerCase().includes("unique") || msg.includes("already exists")) {
      // Idempotent: treat duplicates as success for simple create.
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

