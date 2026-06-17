import { NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import { cookies } from "next/headers";
import { getSessionCookieName, verifySessionToken } from "../../../../lib/jwt";
import { getStaffById } from "../../../../lib/staffRepo";

export const runtime = "nodejs";

async function getSessionStaff() {
  const cookieName = getSessionCookieName();
  const store = await cookies();
  const token = store.get(cookieName)?.value || "";
  if (!token) return null;
  const payload = await verifySessionToken(token);
  const userId = String(payload?.sub || "").trim();
  if (!userId) return null;
  return await getStaffById(userId);
}

export async function GET(req) {
  let staff = null;
  try {
    staff = await getSessionStaff();
  } catch {
    return new Response("Invalid session", { status: 401 });
  }
  if (!staff) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const filename = searchParams.get("filename");
  if (!filename) {
    return new Response("Missing filename", { status: 400 });
  }

  // Prevent directory traversal attacks
  const safeFilename = path.basename(filename);
  const filePath = path.join(process.cwd(), ".local", "chat_uploads", safeFilename);

  if (!fs.existsSync(filePath)) {
    return new Response("File not found", { status: 404 });
  }

  try {
    const fileBuffer = fs.readFileSync(filePath);
    let contentType = "application/octet-stream";
    const ext = path.extname(safeFilename).toLowerCase();
    
    if (ext === ".jpg" || ext === ".jpeg") contentType = "image/jpeg";
    else if (ext === ".png") contentType = "image/png";
    else if (ext === ".gif") contentType = "image/gif";
    else if (ext === ".webp") contentType = "image/webp";
    else if (ext === ".svg") contentType = "image/svg+xml";

    return new Response(fileBuffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (err) {
    return new Response(`Error reading file: ${err.message}`, { status: 500 });
  }
}
