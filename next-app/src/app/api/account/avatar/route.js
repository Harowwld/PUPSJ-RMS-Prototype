import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { requireAuth, createAuthErrorResponse } from "@/lib/authHelpers";
import { updateStaff } from "@/lib/staffRepo";
import { writeAuditLog } from "@/lib/auditLogRequest";
import { query } from "@/lib/postgres";
import { canAccessResource } from "@/lib/resourceAuthorization";

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

function getAvatarPath(filename) {
  const safeFilename = String(filename || "");
  if (!safeFilename || path.basename(safeFilename) !== safeFilename) {
    throw new Error("Invalid avatar filename");
  }
  return path.join(getAvatarsDir(), safeFilename);
}

function removeAvatarFile(filename) {
  if (!filename) return;
  try {
    const filePath = getAvatarPath(filename);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  } catch (error) {
    console.error("Failed to delete avatar file:", error);
  }
}

function getSessionUser(principal) {
  if (!principal) return null;
  const isStudent = principal.principalType === "student";
  return {
    type: isStudent ? "student" : "staff",
    id: isStudent ? principal.studentNo || String(principal.accountId) : principal.id,
    account_id: isStudent ? principal.accountId : principal.id,
    avatar_filename: principal.avatar_filename || null,
    user: principal,
  };
}

// GET serves the avatar image
export async function GET(req) {
  const auth = await requireAuth(req);
  if (auth.error || !auth.user) {
    return createAuthErrorResponse(auth.error || "Authentication required", auth.error?.startsWith("Access denied") ? 403 : 401);
  }
  try {
    const sessionUser = getSessionUser(auth.user);
    if (!sessionUser) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
    if (!canAccessResource(auth.user, "avatar", { ownerType: sessionUser.type, ownerId: sessionUser.account_id })) {
      return NextResponse.json({ ok: false, error: "Avatar not found" }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const targetId = searchParams.get("id") || sessionUser.id;
    if (targetId !== sessionUser.id && String(targetId) !== String(sessionUser.account_id)) {
      return NextResponse.json({ ok: false, error: "Avatar not found" }, { status: 404 });
    }

    const avatarFilename = sessionUser.avatar_filename;

    if (!avatarFilename) {
      return NextResponse.json({ ok: false, error: "No avatar uploaded" }, { status: 404 });
    }

    const filePath = getAvatarPath(avatarFilename);
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ ok: false, error: "Avatar file not found on server" }, { status: 404 });
    }

    const bytes = fs.readFileSync(filePath);
    const ext = path.extname(avatarFilename).toLowerCase();
    let contentType = "image/png";
    if (ext === ".jpg" || ext === ".jpeg") contentType = "image/jpeg";
    else if (ext === ".gif") contentType = "image/gif";
    else if (ext === ".webp") contentType = "image/webp";
    else if (ext === ".svg") contentType = "image/svg+xml";

    return new NextResponse(bytes, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Length": String(bytes.length),
        "Cache-Control": "private, max-age=3600, must-revalidate",
      },
    });
  } catch (err) {
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}

// POST uploads a new avatar image
export async function POST(req) {
  const auth = await requireAuth(req);
  if (auth.error || !auth.user) {
    return createAuthErrorResponse(auth.error || "Authentication required", auth.error?.startsWith("Access denied") ? 403 : 401);
  }
  try {
    const sessionUser = getSessionUser(auth.user);
    if (!sessionUser) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
    if (!canAccessResource(auth.user, "avatar", { ownerType: sessionUser.type, ownerId: sessionUser.account_id })) {
      return NextResponse.json({ ok: false, error: "Avatar not found" }, { status: 404 });
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
              : mime === "image/svg+xml" ? ".svg"
              : path.extname(file.name || "").toLowerCase() || ".png";

    // Save the replacement first; keep the current avatar until its DB reference changes.
    const uuid = crypto.randomUUID().replace(/-/g, "").substring(0, 16);
    const identifier = sessionUser.type === "student" ? `STUDENT_${sessionUser.account_id}` : sessionUser.id;
    const safeId = String(identifier).trim().toUpperCase().replace(/[^A-Z0-9-]/g, "_");
    const filename = `avatar_${safeId}_${uuid}${ext}`;
    const absPath = path.join(getAvatarsDir(), filename);

    const buf = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(absPath, buf, { flag: "wx" });

    try {
      if (sessionUser.type === "student") {
        const rows = await query("UPDATE student_accounts SET avatar_filename = $1 WHERE id = $2 RETURNING id", [filename, sessionUser.account_id]);
        if (!rows.length) throw new Error("Student account no longer exists");
      } else {
        const updated = await updateStaff(sessionUser.id, { avatar_filename: filename });
        if (!updated) throw new Error("Staff account no longer exists");
      }
    } catch (error) {
      try { fs.unlinkSync(absPath); } catch {}
      throw error;
    }

    removeAvatarFile(sessionUser.avatar_filename);

    if (sessionUser.type === "student") {
      await writeAuditLog(req, "Upload Avatar", {
        details: `uploaded custom profile avatar icon for student account`,
        entity_type: "Student",
        entity_id: String(sessionUser.account_id),
      });
    } else {
      await writeAuditLog(req, "Upload Avatar", {
        details: `uploaded custom profile avatar icon for account`,
        entity_type: "Staff",
        entity_id: sessionUser.id,
      });
    }

    return NextResponse.json({ ok: true, avatar_filename: filename });
  } catch (err) {
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}

// DELETE removes current custom avatar
export async function DELETE(req) {
  const auth = await requireAuth(req);
  if (auth.error || !auth.user) {
    return createAuthErrorResponse(auth.error || "Authentication required", auth.error?.startsWith("Access denied") ? 403 : 401);
  }
  try {
    const sessionUser = getSessionUser(auth.user);
    if (!sessionUser) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
    if (!canAccessResource(auth.user, "avatar", { ownerType: sessionUser.type, ownerId: sessionUser.account_id })) {
      return NextResponse.json({ ok: false, error: "Avatar not found" }, { status: 404 });
    }

    let updated;
    if (sessionUser.type === "student") {
      const rows = await query("UPDATE student_accounts SET avatar_filename = NULL WHERE id = $1 RETURNING id", [sessionUser.account_id]);
      updated = rows.length > 0;
      if (!updated) return NextResponse.json({ ok: false, error: "Account not found" }, { status: 404 });
    } else {
      updated = await updateStaff(sessionUser.id, { avatar_filename: null });
      if (!updated) return NextResponse.json({ ok: false, error: "Account not found" }, { status: 404 });
    }

    removeAvatarFile(sessionUser.avatar_filename);

    if (sessionUser.type === "student") {
      await writeAuditLog(req, "Delete Avatar", {
        details: `removed custom profile avatar for student account`,
        entity_type: "Student",
        entity_id: String(sessionUser.account_id),
      });
    } else {
      await writeAuditLog(req, "Delete Avatar", {
        details: `removed custom profile avatar, reverting to system default`,
        entity_type: "Staff",
        entity_id: sessionUser.id,
      });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}
