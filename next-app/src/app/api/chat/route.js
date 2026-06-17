import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { getSessionCookieName, verifySessionToken } from "../../../lib/jwt";
import { getStaffById } from "../../../lib/staffRepo";
import { sendChatMessage, getRecentChatMessages, getRecentActiveStaff, deleteChatMessage, editChatMessage, markPrivateMessagesAsRead } from "../../../lib/chatRepo";
import { reloadDb } from "../../../lib/sqlite";

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
    return NextResponse.json({ ok: false, error: "Invalid session" }, { status: 401 });
  }
  if (!staff) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const since = searchParams.get("since") || null;
  const limit = parseInt(searchParams.get("limit") || "100", 10);
  const activeRecipientId = searchParams.get("activeRecipientId") || null;

  try {
    let messages;
    let activeStaff;
    
    try {
      if (activeRecipientId) {
        await markPrivateMessagesAsRead(staff.id, activeRecipientId);
      }
      messages = await getRecentChatMessages({ userId: staff.id, since, limit });
      activeStaff = await getRecentActiveStaff(staff.id);
    } catch (dbErr) {
      if (dbErr.message.includes("no such table") || dbErr.message.includes("missing")) {
        console.log("[Chat API] Chat table not found in cached DB connection. Reloading DB to run migrations...");
        reloadDb();
        if (activeRecipientId) {
          await markPrivateMessagesAsRead(staff.id, activeRecipientId);
        }
        messages = await getRecentChatMessages({ userId: staff.id, since, limit });
        activeStaff = await getRecentActiveStaff(staff.id);
      } else {
        throw dbErr;
      }
    }

    return NextResponse.json({
      ok: true,
      data: {
        messages,
        activeStaff,
        currentUser: {
          id: staff.id,
          name: `${staff.fname} ${staff.lname}`,
          role: staff.role,
        }
      }
    });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req) {
  let staff = null;
  try {
    staff = await getSessionStaff();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid session" }, { status: 401 });
  }
  if (!staff) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const contentType = req.headers.get("content-type") || "";
    let message = "";
    let recipientId = null;
    let imageFile = null;

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      message = formData.get("message") || "";
      recipientId = formData.get("recipientId") || null;
      imageFile = formData.get("image");
    } else {
      const body = await req.json().catch(() => null);
      if (body) {
        message = body.message || "";
        recipientId = body.recipientId || null;
      }
    }

    let imageFilename = null;
    let mimeType = null;

    if (imageFile && typeof imageFile === "object" && "size" in imageFile && imageFile.size > 0) {
      // Size limit check: 25MB (25 * 1024 * 1024 = 26214400 bytes)
      const MAX_SIZE = 25 * 1024 * 1024;
      if (imageFile.size > MAX_SIZE) {
        return NextResponse.json({ ok: false, error: "File size exceeds 25MB limit" }, { status: 400 });
      }

      const arrayBuffer = await imageFile.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const uuid = crypto.randomUUID();
      const ext = path.extname(imageFile.name || "image.png") || ".png";
      imageFilename = `${uuid}${ext}`;
      mimeType = imageFile.type;

      const uploadDir = path.join(process.cwd(), ".local", "chat_uploads");
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      fs.writeFileSync(path.join(uploadDir, imageFilename), buffer);
    }

    if (!message.trim() && !imageFilename) {
      return NextResponse.json({ ok: false, error: "Message content or image is required" }, { status: 400 });
    }

    let newMessage;
    try {
      newMessage = await sendChatMessage(staff.id, recipientId || null, message, imageFilename, mimeType);
    } catch (dbErr) {
      if (dbErr.message.includes("no such table") || dbErr.message.includes("missing")) {
        console.log("[Chat API] Chat table missing on message insert. Reloading DB...");
        reloadDb();
        newMessage = await sendChatMessage(staff.id, recipientId || null, message, imageFilename, mimeType);
      } else {
        throw dbErr;
      }
    }
    
    return NextResponse.json({ ok: true, data: newMessage });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(req) {
  let staff = null;
  try {
    staff = await getSessionStaff();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid session" }, { status: 401 });
  }
  if (!staff) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ ok: false, error: "Message ID is required" }, { status: 400 });
    }

    await deleteChatMessage(parseInt(id, 10), staff.id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}

export async function PATCH(req) {
  let staff = null;
  try {
    staff = await getSessionStaff();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid session" }, { status: 401 });
  }
  if (!staff) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ ok: false, error: "Invalid request body" }, { status: 400 });
    }

    const { messageId, message } = body;
    if (!messageId || !message || !String(message).trim()) {
      return NextResponse.json({ ok: false, error: "Message ID and content are required" }, { status: 400 });
    }

    const updated = await editChatMessage(parseInt(messageId, 10), staff.id, message);
    return NextResponse.json({ ok: true, data: updated });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
