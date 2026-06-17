import { dbAll, dbRun, dbGet } from "./sqlite";

export async function sendChatMessage(senderId, recipientId, message, imageFilename = null, mimeType = null) {
  const msg = String(message || "").trim();
  if (!msg && !imageFilename) throw new Error("Message or image is required");

  const res = await dbRun(
    `INSERT INTO chat_messages (sender_id, recipient_id, message, image_filename, mime_type, created_at, updated_at, is_read)
     VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'), 0)`,
    [senderId, recipientId || null, msg, imageFilename, mimeType]
  );

  if (!res || res.lastInsertRowid === null || res.lastInsertRowid === undefined) {
    throw new Error("Failed to send message: No ID returned");
  }

  return await dbGet(
    `SELECT cm.*, s.fname AS sender_fname, s.lname AS sender_lname, s.role AS sender_role, s.avatar_filename AS sender_avatar, s.updated_at AS sender_updated_at
     FROM chat_messages cm
     JOIN staff s ON cm.sender_id = s.id
     WHERE cm.id = ?`,
    [res.lastInsertRowid]
  );
}

export async function getRecentChatMessages({ userId, since = null, limit = 100 } = {}) {
  let query = `
    SELECT 
      cm.id,
      cm.sender_id,
      cm.recipient_id,
      cm.message,
      cm.created_at,
      cm.is_read,
      cm.is_deleted,
      cm.is_edited,
      cm.updated_at,
      cm.original_message,
      cm.image_filename,
      cm.mime_type,
      s.fname AS sender_fname,
      s.lname AS sender_lname,
      s.role AS sender_role,
      s.avatar_filename AS sender_avatar,
      s.updated_at AS sender_updated_at,
      r.fname AS recipient_fname,
      r.lname AS recipient_lname
    FROM chat_messages cm
    JOIN staff s ON cm.sender_id = s.id
    LEFT JOIN staff r ON cm.recipient_id = r.id
    WHERE (cm.recipient_id IS NULL OR cm.recipient_id = ? OR cm.sender_id = ?)
      AND cm.id NOT IN (SELECT message_id FROM chat_message_deletions WHERE user_id = ?)
  `;
  const params = [userId, userId, userId];

  if (since) {
    query += " AND cm.created_at > ?";
    params.push(since);
  }

  query += " ORDER BY cm.created_at ASC LIMIT ?";
  params.push(limit);

  return await dbAll(query, params) || [];
}

export async function getRecentActiveStaff(excludeUserId, limit = 100) {
  return await dbAll(
    `SELECT id, fname, lname, role, section, status, last_active, avatar_filename
     FROM staff
     WHERE id != ?
     ORDER BY fname ASC, lname ASC LIMIT ?`,
     [excludeUserId, limit]
  );
}

export async function deleteChatMessage(messageId, userId) {
  const msg = await dbGet("SELECT sender_id FROM chat_messages WHERE id = ?", [messageId]);
  if (msg) {
    if (msg.sender_id === userId) {
      // Unsend: soft delete for everyone
      await dbRun("UPDATE chat_messages SET is_deleted = 1, updated_at = datetime('now') WHERE id = ?", [messageId]);
    } else {
      // Soft delete: hide only for this user
      await dbRun(
        "INSERT OR IGNORE INTO chat_message_deletions (message_id, user_id) VALUES (?, ?)",
        [messageId, userId]
      );
    }
  }
  return true;
}

export async function editChatMessage(messageId, userId, message) {
  const msg = String(message || "").trim();
  if (!msg) throw new Error("Message cannot be empty");

  // Retrieve the existing message first to check edit validity
  const existing = await dbGet("SELECT created_at, sender_id, message, original_message FROM chat_messages WHERE id = ?", [messageId]);
  if (!existing) throw new Error("Message not found");
  if (existing.sender_id !== userId) throw new Error("You can only edit your own messages");

  let normalized = existing.created_at;
  if (!normalized.includes("T")) {
    normalized = normalized.replace(" ", "T");
  }
  const sentTime = new Date(normalized.endsWith("Z") ? normalized : normalized + "Z").getTime();
  const now = Date.now();
  if (now - sentTime > 5 * 60 * 1000) {
    throw new Error("Messages can only be edited within 5 minutes of sending");
  }

  // Preserve the very first version of the message before editing
  const origMsg = existing.original_message || existing.message;

  await dbRun("UPDATE chat_messages SET message = ?, is_edited = 1, original_message = ?, updated_at = datetime('now') WHERE id = ? AND sender_id = ? AND is_deleted = 0", [msg, origMsg, messageId, userId]);
  
  return await dbGet(
    `SELECT cm.*, s.fname AS sender_fname, s.lname AS sender_lname, s.role AS sender_role, s.avatar_filename AS sender_avatar, s.updated_at AS sender_updated_at
     FROM chat_messages cm
     JOIN staff s ON cm.sender_id = s.id
     WHERE cm.id = ?`,
    [messageId]
  );
}

export async function markPrivateMessagesAsRead(userId, senderId) {
  if (!userId || !senderId) return;
  await dbRun(
    `UPDATE chat_messages 
     SET is_read = 1 
     WHERE recipient_id = ? AND sender_id = ? AND is_read = 0`,
    [userId, senderId]
  );
}
