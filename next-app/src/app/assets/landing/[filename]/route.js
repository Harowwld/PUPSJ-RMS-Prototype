import fs from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const MIME_MAP = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".avif": "image/avif",
};

export async function GET(req, { params }) {
  const { filename } = await params;
  if (!filename || typeof filename !== "string") {
    return NextResponse.json({ ok: false, error: "Missing filename" }, { status: 400 });
  }

  const base = path.basename(filename);
  if (base !== filename || filename.includes("..")) {
    return NextResponse.json({ ok: false, error: "Invalid filename" }, { status: 400 });
  }

  const filePath = path.join(process.cwd(), "public", "assets", "landing", filename);
  if (!fs.existsSync(filePath)) {
    return NextResponse.json({ ok: false, error: "Asset not found" }, { status: 404 });
  }

  const ext = path.extname(filename).toLowerCase();
  const contentType = MIME_MAP[ext] || "application/octet-stream";
  const stat = fs.statSync(filePath);
  const buffer = fs.readFileSync(filePath);

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Content-Length": String(stat.size),
      "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
    },
  });
}
