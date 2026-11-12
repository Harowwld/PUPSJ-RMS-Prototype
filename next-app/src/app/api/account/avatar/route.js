import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { requireAuth, createAuthErrorResponse } from "@/lib/authHelpers";
import { updateStaff } from "@/lib/staffRepo";
import { query, queryOne } from "@/lib/postgres";
import { canAccessResource } from "@/lib/resourceAuthorization";
import { isDefaultAvatarId, getDefaultAvatarSvg } from "@/lib/defaultAvatars";
import { isNotionistAvatarId, getNotionistAvatarSvg } from "@/lib/notionistsAvatars";
import { AVATAR_MAX_SIZE_BYTES, AVATAR_MAX_SIZE_LABEL } from "@/lib/uploadLimits";
import { decryptPII } from "@/lib/piiEncryption";

export const runtime = "nodejs";

function sanitizeSvg(rawSvg) {
  if (typeof rawSvg !== "string") return null;
  const trimmed = rawSvg.trim();
  if (!trimmed.startsWith("<svg") || !trimmed.endsWith("</svg>")) {
    return null;
  }
  if (
    /<script/i.test(trimmed) ||
    /onload\s*=/i.test(trimmed) ||
    /onerror\s*=/i.test(trimmed) ||
    /onclick\s*=/i.test(trimmed) ||
    /onmouseover\s*=/i.test(trimmed) ||
    /javascript:/i.test(trimmed) ||
    /<!ENTITY/i.test(trimmed) ||
    /<!DOCTYPE/i.test(trimmed)
  ) {
    return null;
  }
  return trimmed;
}

function getLocalDir() {
  return process.env.LOCAL_DATA_DIR
    ? path.resolve(process.cwd(), process.env.LOCAL_DATA_DIR)
    : path.resolve(process.cwd(), ".local");
}

function getAvatarsDir() {
  const dir = path.join(getLocalDir(), "uploads", "avatars");
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function isValidAvatarFilename(fn) {
  if (!fn || typeof fn !== "string") return false;
  const base = path.basename(fn);
  if (base !== fn) return false;
  return /^avatar_[A-Za-z0-9_-]+\.(png|jpe?g|webp|gif|svg)$/i.test(fn);
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

// GET serves the avatar image (viewable by any authenticated user)
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

    const { searchParams } = new URL(req.url);
    const targetId = (searchParams.get("id") || "").trim();
    const filenameParam = (searchParams.get("filename") || "").trim();
    const tParam = (searchParams.get("t") || "").trim();

    let avatarFilename = null;

    // 1. If explicit avatar filename is passed in `filename` or `t` (e.g. from officer views)
    const candidateFile = filenameParam || (tParam.startsWith("avatar_") ? tParam : null);
    if (candidateFile && isValidAvatarFilename(candidateFile)) {
      try {
        const filePath = getAvatarPath(candidateFile);
        if (fs.existsSync(filePath)) {
          avatarFilename = candidateFile;
        }
      } catch {
        // invalid candidate
      }
    }

    // 2. If not found by candidate filename, resolve by targetId (or caller's own id)
    if (!avatarFilename) {
      const lookupId = targetId || sessionUser.id;
      const isSelf = lookupId === sessionUser.id || String(lookupId) === String(sessionUser.account_id);

      if (isSelf && sessionUser.avatar_filename) {
        try {
          const filePath = getAvatarPath(sessionUser.avatar_filename);
          if (fs.existsSync(filePath)) {
            avatarFilename = sessionUser.avatar_filename;
          }
        } catch {
          // ignore
        }
      }

      if (!avatarFilename) {
        // Query DB for staff first
        const staffRow = await queryOne(
          "SELECT avatar_filename FROM staff WHERE id = $1",
          [lookupId]
        );
        if (staffRow?.avatar_filename) {
          avatarFilename = staffRow.avatar_filename;
        } else {
          // Query DB for student_accounts (match id or student_no)
          const studentRow = await queryOne(
            "SELECT avatar_filename FROM student_accounts WHERE id::text = $1 OR student_no = $1",
            [lookupId]
          );
          if (studentRow?.avatar_filename) {
            avatarFilename = studentRow.avatar_filename;
          } else {
            // Check if lookupId matches any staff member by decrypted name
            try {
              const allStaff = await query(
                "SELECT id, fname, lname, avatar_filename FROM staff WHERE avatar_filename IS NOT NULL"
              );
              const norm = String(lookupId).trim().toLowerCase();
              const matched = (allStaff || []).find((s) => {
                const full = `${decryptPII(s.fname) || ""} ${decryptPII(s.lname) || ""}`.trim().toLowerCase();
                return full === norm || String(s.id).toLowerCase() === norm;
              });
              if (matched?.avatar_filename) {
                avatarFilename = matched.avatar_filename;
              }
            } catch {
              // ignore lookup errors
            }
          }
        }
      }
    }

    if (!avatarFilename) {
      return NextResponse.json({ ok: false, error: "Avatar not found" }, { status: 404 });
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
    console.error("[Avatar GET Error]:", err);
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

    let defaultAvatarId = null;
    let avatarType = "beam";
    let svgString = null;
    let file = null;

    const contentTypeHeader = req.headers.get("content-type") || "";
    if (contentTypeHeader.includes("application/json")) {
      const jsonBody = await req.json().catch(() => null);
      if (jsonBody) {
        if (jsonBody.defaultAvatarId !== undefined) {
          defaultAvatarId = jsonBody.defaultAvatarId;
        }
        if (jsonBody.avatarType !== undefined) {
          avatarType = String(jsonBody.avatarType).toLowerCase();
        }
        if (jsonBody.svgString !== undefined) {
          svgString = jsonBody.svgString;
        }
      }
    } else {
      const form = await req.formData().catch(() => null);
      if (form) {
        if (form.get("defaultAvatarId") !== null) {
          defaultAvatarId = form.get("defaultAvatarId");
        }
        if (form.get("avatarType") !== null) {
          avatarType = String(form.get("avatarType")).toLowerCase();
        }
        if (form.get("svgString") !== null) {
          svgString = form.get("svgString");
        }
        file = form.get("avatar");
      }
    }

    if (defaultAvatarId === null && !svgString && (!file || typeof file === "string")) {
      return NextResponse.json({ ok: false, error: "No avatar selection or file provided" }, { status: 400 });
    }

    // Lookup previous avatar from DB to guarantee cleanup
    let oldFilename = sessionUser.avatar_filename;
    if (sessionUser.type === "student") {
      const prev = await queryOne("SELECT avatar_filename FROM student_accounts WHERE id = $1", [sessionUser.account_id]);
      if (prev?.avatar_filename) oldFilename = prev.avatar_filename;
    } else {
      const prev = await queryOne("SELECT avatar_filename FROM staff WHERE id = $1", [sessionUser.id]);
      if (prev?.avatar_filename) oldFilename = prev.avatar_filename;
    }

    // If defaultAvatarId === 0, revert to default profile (no avatar)
    if (defaultAvatarId !== null && Number(defaultAvatarId) === 0) {
      if (sessionUser.type === "student") {
        await query("UPDATE student_accounts SET avatar_filename = NULL WHERE id = $1", [sessionUser.account_id]);
      } else {
        await updateStaff(sessionUser.id, { avatar_filename: null });
      }
      if (oldFilename) removeAvatarFile(oldFilename);
      return NextResponse.json({ ok: true, avatar_filename: null });
    }

    const identifier = sessionUser.type === "student" ? `STUDENT_${sessionUser.account_id}` : sessionUser.id;
    const safeId = String(identifier).trim().toUpperCase().replace(/[^A-Z0-9-]/g, "_");
    let filename;
    let absPath;

    if (avatarType === "custom" || (svgString && !defaultAvatarId)) {
      const sanitized = sanitizeSvg(svgString);
      if (!sanitized) {
        return NextResponse.json({ ok: false, error: "Invalid or unsafe SVG markup." }, { status: 400 });
      }
      const hash = crypto.createHash("sha256").update(sanitized).digest("hex").substring(0, 10);
      filename = `avatar_${safeId}_custom_${hash}.svg`;
      absPath = path.join(getAvatarsDir(), filename);
      fs.writeFileSync(absPath, sanitized, "utf8");
    } else if (avatarType === "notionists" && defaultAvatarId) {
      if (!isNotionistAvatarId(defaultAvatarId)) {
        return NextResponse.json({ ok: false, error: "Invalid Notionists avatar ID." }, { status: 400 });
      }
      const svgMarkup = getNotionistAvatarSvg(defaultAvatarId);
      if (!svgMarkup) {
        return NextResponse.json({ ok: false, error: "Notionists avatar not found" }, { status: 404 });
      }
      filename = `avatar_${safeId}_notionist${defaultAvatarId}.svg`;
      absPath = path.join(getAvatarsDir(), filename);
      fs.writeFileSync(absPath, svgMarkup, "utf8");
    } else if (defaultAvatarId) {
      if (!isDefaultAvatarId(defaultAvatarId)) {
        return NextResponse.json({ ok: false, error: "Invalid default avatar ID." }, { status: 400 });
      }
      const svgMarkup = getDefaultAvatarSvg(defaultAvatarId);
      if (!svgMarkup) {
        return NextResponse.json({ ok: false, error: "Default avatar not found" }, { status: 404 });
      }
      filename = `avatar_${safeId}_default${defaultAvatarId}.svg`;
      absPath = path.join(getAvatarsDir(), filename);
      fs.writeFileSync(absPath, svgMarkup, "utf8");
    } else {
      // Validate file size (5MB limit)
      if (file.size > AVATAR_MAX_SIZE_BYTES) {
        return NextResponse.json({ ok: false, error: `Avatar file size exceeds the ${AVATAR_MAX_SIZE_LABEL} limit.` }, { status: 413 });
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

      const uuid = crypto.randomUUID().replace(/-/g, "").substring(0, 16);
      filename = `avatar_${safeId}_${uuid}${ext}`;
      absPath = path.join(getAvatarsDir(), filename);

      const buf = Buffer.from(await file.arrayBuffer());
      fs.writeFileSync(absPath, buf, { flag: "wx" });
    }

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

    if (oldFilename && oldFilename !== filename) {
      removeAvatarFile(oldFilename);
    }

    return NextResponse.json({ ok: true, avatar_filename: filename });
  } catch {
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

    let oldFilename = sessionUser.avatar_filename;
    let updated;
    if (sessionUser.type === "student") {
      const prev = await queryOne("SELECT avatar_filename FROM student_accounts WHERE id = $1", [sessionUser.account_id]);
      if (prev?.avatar_filename) oldFilename = prev.avatar_filename;
      const rows = await query("UPDATE student_accounts SET avatar_filename = NULL WHERE id = $1 RETURNING id", [sessionUser.account_id]);
      updated = rows.length > 0;
      if (!updated) return NextResponse.json({ ok: false, error: "Account not found" }, { status: 404 });
    } else {
      const prev = await queryOne("SELECT avatar_filename FROM staff WHERE id = $1", [sessionUser.id]);
      if (prev?.avatar_filename) oldFilename = prev.avatar_filename;
      updated = await updateStaff(sessionUser.id, { avatar_filename: null });
      if (!updated) return NextResponse.json({ ok: false, error: "Account not found" }, { status: 404 });
    }

    removeAvatarFile(oldFilename);

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}
