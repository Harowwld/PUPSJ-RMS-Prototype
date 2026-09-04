import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { getStaffById, updateStaff } from "@/lib/staffRepo";
import { getSessionCookieName, verifySessionToken } from "@/lib/jwt";
import { writeAuditLog } from "@/lib/auditLogRequest";
import { query, queryOne } from "@/lib/postgres";

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

async function getSessionUser(req) {
  const token = req.cookies.get(getSessionCookieName())?.value || "";
  if (!token) return null;
  try {
    const payload = await verifySessionToken(token);
    if (!payload) return null;

    if (payload.role === "Student") {
      const accountId = payload.account_id || (Number.isFinite(Number(payload.sub)) ? Number(payload.sub) : null);
      const student = await queryOne(
        `SELECT sa.*, s.name 
         FROM student_accounts sa 
         LEFT JOIN students s ON s.student_no = sa.student_no 
         WHERE (sa.id = $1 AND $1 IS NOT NULL)
            OR (sa.student_no IS NOT NULL AND upper(sa.student_no) = upper($2) AND $2 IS NOT NULL)
            OR (lower(sa.email) = lower($3) AND $3 IS NOT NULL)
         LIMIT 1`,
        [accountId, payload.student_no || null, payload.email || payload.username || null]
      );
      if (!student) return null;
      return {
        type: "student",
        id: student.student_no || String(student.id),
        account_id: student.id,
        avatar_filename: student.avatar_filename || null,
        user: student,
      };
    }

    const userId = String(payload?.sub || "").trim();
    if (!userId) return null;
    const staff = await getStaffById(userId);
    if (!staff) return null;
    return {
      type: "staff",
      id: staff.id,
      account_id: staff.id,
      avatar_filename: staff.avatar_filename || null,
      user: staff,
    };
  } catch {
    return null;
  }
}

// GET serves the avatar image
export async function GET(req) {
  try {
    const sessionUser = await getSessionUser(req);
    if (!sessionUser) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const targetId = searchParams.get("id") || sessionUser.id;

    let avatarFilename = null;
    // Check if targetId matches current session
    if (sessionUser.id === targetId || String(sessionUser.account_id) === targetId) {
      avatarFilename = sessionUser.avatar_filename;
    }

    // Try finding staff
    if (!avatarFilename) {
      const targetStaff = await getStaffById(targetId);
      if (targetStaff?.avatar_filename) {
        avatarFilename = targetStaff.avatar_filename;
      }
    }

    // Try finding student
    if (!avatarFilename && process.env.DATABASE_URL) {
      const targetStudent = await queryOne(
        `SELECT avatar_filename FROM student_accounts 
         WHERE id::text = $1 
            OR (student_no IS NOT NULL AND upper(student_no) = upper($1))
            OR lower(email) = lower($1)
         LIMIT 1`,
        [targetId]
      );
      if (targetStudent?.avatar_filename) {
        avatarFilename = targetStudent.avatar_filename;
      }
    }

    if (!avatarFilename) {
      return NextResponse.json({ ok: false, error: "No avatar uploaded" }, { status: 404 });
    }

    const filePath = path.join(getAvatarsDir(), avatarFilename);
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ ok: false, error: "Avatar file not found on server" }, { status: 404 });
    }

    const bytes = fs.readFileSync(filePath);
    const ext = path.extname(avatarFilename).toLowerCase();
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
    const sessionUser = await getSessionUser(req);
    if (!sessionUser) {
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
    if (sessionUser.avatar_filename) {
      const prevPath = path.join(getAvatarsDir(), sessionUser.avatar_filename);
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
    const identifier = sessionUser.type === "student" ? `STUDENT_${sessionUser.account_id}` : sessionUser.id;
    const safeId = String(identifier).trim().toUpperCase().replace(/[^A-Z0-9-]/g, "_");
    const filename = `avatar_${safeId}_${uuid}${ext}`;
    const absPath = path.join(getAvatarsDir(), filename);

    const buf = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(absPath, buf);

    // Update DB
    if (sessionUser.type === "student") {
      await query("UPDATE student_accounts SET avatar_filename = $1 WHERE id = $2", [filename, sessionUser.account_id]);
      await writeAuditLog(req, "Upload Avatar", {
        details: `uploaded custom profile avatar icon for student account`,
        entity_type: "Student",
        entity_id: String(sessionUser.account_id),
      });
    } else {
      await updateStaff(sessionUser.id, { avatar_filename: filename });
      await writeAuditLog(req, "Upload Avatar", {
        details: `uploaded custom profile avatar icon for account`,
        entity_type: "Staff",
        entity_id: sessionUser.id,
      });
    }

    return NextResponse.json({ ok: true, avatar_filename: filename });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}

// DELETE removes current custom avatar
export async function DELETE(req) {
  try {
    const sessionUser = await getSessionUser(req);
    if (!sessionUser) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    if (sessionUser.avatar_filename) {
      const prevPath = path.join(getAvatarsDir(), sessionUser.avatar_filename);
      try {
        if (fs.existsSync(prevPath)) {
          fs.unlinkSync(prevPath);
        }
      } catch (err) {
        console.error("Failed to delete avatar file:", err);
      }
    }

    if (sessionUser.type === "student") {
      await query("UPDATE student_accounts SET avatar_filename = NULL WHERE id = $1", [sessionUser.account_id]);
      await writeAuditLog(req, "Delete Avatar", {
        details: `removed custom profile avatar for student account`,
        entity_type: "Student",
        entity_id: String(sessionUser.account_id),
      });
    } else {
      await updateStaff(sessionUser.id, { avatar_filename: null });
      await writeAuditLog(req, "Delete Avatar", {
        details: `removed custom profile avatar, reverting to system default`,
        entity_type: "Staff",
        entity_id: sessionUser.id,
      });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
