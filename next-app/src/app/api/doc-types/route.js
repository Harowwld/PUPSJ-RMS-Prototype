import { NextResponse } from "next/server";
import { createDocType, listDocTypes } from "../../../lib/docTypesRepo";

export const runtime = "nodejs";

export async function GET() {
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
    const created = await createDocType(name);
    return NextResponse.json({ ok: true, data: created }, { status: 201 });
  } catch (e) {
    const msg = String(e?.message || "");
    if (msg.includes("UNIQUE") || msg.toLowerCase().includes("unique")) {
      // Idempotent: treat duplicates as success.
      return NextResponse.json({ ok: true, data: name }, { status: 200 });
    }
    return NextResponse.json(
      { ok: false, error: "Failed to create document type" },
      { status: 500 }
    );
  }
}
