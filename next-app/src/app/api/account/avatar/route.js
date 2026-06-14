import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getStaffById, updateStaff } from "../../../../lib/staffRepo";
import { getSessionCookieName, verifySessionToken } from "../../../../lib/jwt";
import { writeAuditLog } from "../../../../lib/auditLogRequest";

export const runtime = "nodejs";

function getLocalDir() {
  return process.env.LOCAL_DATA_DIR
    ? process.env.LOCAL_DATA_DIR
    : path.join(process.cwd(), ".local");
}

function getAvatarsDir() {
  const dir = path.join(getLocalDir(), "uploads", "avatars");
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

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

// GET serves the avatar image
export async function GET(req) {
  try {
    const staff = await getSessionStaff();
    if (!staff) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const targetId = searchParams.get("id") || staff.id;

    const targetUser = await getStaffById(targetId);
    if (!targetUser || !targetUser.avatar_filename) {
      return NextResponse.json({ ok: false, error: "No avatar uploaded" }, { status: 404 });
    }

    const filePath = path.join(getAvatarsDir(), targetUser.avatar_filename);
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ ok: false, error: "Avatar file not found on server" }, { status: 404 });
    }

    const bytes = fs.readFileSync(filePath);
    const ext = path.extname(targetUser.avatar_filename).toLowerCase();
    let contentType = "image/png";
    if (ext === ".jpg" || ext === ".jpeg") contentType = "image/jpeg";
    else if (ext === ".gif") contentType = "image/gif";
    else if (ext === ".webp") contentType = "image/webp";

    return new NextResponse(bytes, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Length": String(bytes.length),
        "Cache-Control": "private, max-age=3600, must-revalidate",
      },
    });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}

// POST uploads a new avatar image
export async function POST(req) {
  try {
    const staff = await getSessionStaff();
    if (!staff) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const form = await req.formData().catch(() => null);
    if (!form) {
      return NextResponse.json({ ok: false, error: "Invalid form data" }, { status: 400 });
    }

    const file = form.get("avatar");
    if (!file || typeof file === "string") {
      return NextResponse.json({ ok: false, error: "No avatar file provided" }, { status: 400 });
    }

    // Validate size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ ok: false, error: "File size exceeds 5MB limit" }, { status: 400 });
    }

    // Validate content type
    const mime = String(file.type || "").toLowerCase();
    if (!mime.startsWith("image/")) {
      return NextResponse.json({ ok: false, error: "Only image files are allowed" }, { status: 400 });
    }

    const ext = mime === "image/jpeg" ? ".jpg"
              : mime === "image/png" ? ".png"
              : mime === "image/webp" ? ".webp"
              : mime === "image/gif" ? ".gif"
              : path.extname(file.name || "").toLowerCase() || ".png";

    // Delete old avatar if any exists
    if (staff.avatar_filename) {
      const prevPath = path.join(getAvatarsDir(), staff.avatar_filename);
      try {
        if (fs.existsSync(prevPath)) {
          fs.unlinkSync(prevPath);
        }
      } catch (err) {
        console.error("Failed to delete previous avatar file:", err);
      }
    }

    // Save new avatar
    const uuid = crypto.randomUUID().replace(/-/g, "").substring(0, 16);
    const safeId = String(staff.id).trim().toUpperCase().replace(/[^A-Z0-9-]/g, "_");
    const filename = `avatar_${safeId}_${uuid}${ext}`;
    const absPath = path.join(getAvatarsDir(), filename);

    const buf = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(absPath, buf);

    // Update DB
    await updateStaff(staff.id, { avatar_filename: filename });

    // Write audit log
    await writeAuditLog(req, "Upload Avatar", {
      details: `uploaded custom profile avatar icon for account`,
      entity_type: "Staff",
      entity_id: staff.id,
    });

    return NextResponse.json({ ok: true, avatar_filename: filename });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}

// DELETE removes current custom avatar
export async function DELETE(req) {
  try {
    const staff = await getSessionStaff();
    if (!staff) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    if (staff.avatar_filename) {
      const prevPath = path.join(getAvatarsDir(), staff.avatar_filename);
      try {
        if (fs.existsSync(prevPath)) {
          fs.unlinkSync(prevPath);
        }
      } catch (err) {
        console.error("Failed to delete avatar file:", err);
      }
    }

    await updateStaff(staff.id, { avatar_filename: null });

    await writeAuditLog(req, "Delete Avatar", {
      details: `removed custom profile avatar, reverting to system default`,
      entity_type: "Staff",
      entity_id: staff.id,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
