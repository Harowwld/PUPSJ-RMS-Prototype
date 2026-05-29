import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { dbAll, dbGet, dbRun } from "./sqlite.js";
import { getScanFilePath, makeScanStorageFilename } from "./scanSessionFiles.js";

const HEARTBEAT_OFFLINE_SECONDS = 45;

function hashToken(token) {
  return crypto.createHash("sha256").update(String(token || "")).digest("hex");
}

export function createPairToken() {
  return crypto.randomBytes(24).toString("base64url");
}

function normalizeSession(row) {
  if (!row) return null;
  return {
    ...row,
    id: Number(row.id),
    incoming_count: Number(row.incoming_count || 0),
    is_online:
      row.last_heartbeat_at != null &&
      Number(row.heartbeat_age_seconds || 0) <= HEARTBEAT_OFFLINE_SECONDS,
  };
}

async function getSessionBaseById(id) {
  const row = await dbGet(
    `
    SELECT
      s.*,
      (SELECT COUNT(*) FROM scan_session_incoming i WHERE i.session_id = s.id) AS incoming_count,
      CAST((julianday('now') - julianday(COALESCE(s.last_heartbeat_at, s.created_at))) * 86400 AS INTEGER) AS heartbeat_age_seconds
    FROM scan_sessions s
    WHERE s.id = ?
    `,
    [id]
  );
  return normalizeSession(row);
}

export async function createScanSession({ staffId, token, tokenTtlSeconds = 600 }) {
  const ttl = Math.max(30, Number(tokenTtlSeconds) || 600);
  const tokenHash = hashToken(token);
  const res = await dbRun(
    `
    INSERT INTO scan_sessions (staff_id, status, pair_token_hash, token_expires_at, last_heartbeat_at)
    VALUES (?, 'Pending', ?, datetime('now', '+' || ? || ' seconds'), datetime('now'))
    `,
    [staffId, tokenHash, ttl]
  );
  const directId = Number(res?.lastInsertRowid);
  if (Number.isFinite(directId) && directId > 0) {
    const rowByDirectId = await getSessionBaseById(directId);
    if (rowByDirectId?.id) return rowByDirectId;
  }
  const fallback = await dbGet(
    `
    SELECT id
    FROM scan_sessions
    WHERE staff_id = ? AND pair_token_hash = ?
    ORDER BY id DESC
    LIMIT 1
    `,
    [staffId, tokenHash]
  );
  const fallbackId = Number(fallback?.id);
  if (!Number.isFinite(fallbackId) || fallbackId <= 0) return null;
  return await getSessionBaseById(fallbackId);
}

export async function getScanSessionByIdForStaff(id, staffId) {
  const row = await dbGet(
    `
    SELECT
      s.*,
      (SELECT COUNT(*) FROM scan_session_incoming i WHERE i.session_id = s.id) AS incoming_count,
      CAST((julianday('now') - julianday(COALESCE(s.last_heartbeat_at, s.created_at))) * 86400 AS INTEGER) AS heartbeat_age_seconds
    FROM scan_sessions s
    WHERE s.id = ? AND s.staff_id = ?
    `,
    [id, staffId]
  );
  return normalizeSession(row);
}

export async function getScanSessionById(id) {
  return await getSessionBaseById(id);
}

export async function getScanSessionByPairToken(token) {
  const tokenHash = hashToken(token);
  const row = await dbGet(
    `
    SELECT *
    FROM scan_sessions
    WHERE pair_token_hash = ?
      AND token_expires_at IS NOT NULL
      AND datetime(token_expires_at) >= datetime('now')
    `,
    [tokenHash]
  );
  return row || null;
}

export async function completeScanSessionLink({ sessionId, token, phoneLabel = "" }) {
  const session = await getScanSessionByPairToken(token);
  if (!session || Number(session.id) !== Number(sessionId)) return null;
  await dbRun(
    `
    UPDATE scan_sessions
    SET
      status = 'Paired',
      paired_at = COALESCE(paired_at, datetime('now')),
      last_heartbeat_at = datetime('now'),
      phone_label = ?,
      pair_token_hash = NULL,
      token_expires_at = NULL,
      updated_at = datetime('now')
    WHERE id = ?
    `,
    [String(phoneLabel || "").slice(0, 120) || null, sessionId]
  );
  return await getSessionBaseById(sessionId);
}

export async function touchScanSessionHeartbeat({ sessionId, token }) {
  const session = await getScanSessionById(sessionId);
  if (!session) return null;
  if (session.pair_token_hash) {
    const pending = await getScanSessionByPairToken(token);
    if (!pending || Number(pending.id) !== Number(sessionId)) return null;
  }
  await dbRun(
    `
    UPDATE scan_sessions
    SET status = CASE WHEN status = 'Pending' THEN 'Pending' ELSE 'Paired' END,
        last_heartbeat_at = datetime('now'),
        updated_at = datetime('now')
    WHERE id = ?
    `,
    [sessionId]
  );
  return await getSessionBaseById(sessionId);
}

export async function addIncomingToSession({
  sessionId,
  token,
  clientRef = "",
  filename = "",
  mimeType = "",
  sizeBytes = null,
}) {
  const session = await getScanSessionById(sessionId);
  if (!session) return null;
  if (session.pair_token_hash) {
    const pending = await getScanSessionByPairToken(token);
    if (!pending || Number(pending.id) !== Number(sessionId)) return null;
  }
  await dbRun(
    `
    INSERT INTO scan_session_incoming (session_id, client_ref, filename, mime_type, size_bytes)
    VALUES (?, ?, ?, ?, ?)
    `,
    [
      sessionId,
      String(clientRef || "").slice(0, 120) || null,
      String(filename || "").slice(0, 255) || null,
      String(mimeType || "").slice(0, 120) || null,
      Number.isFinite(Number(sizeBytes)) ? Number(sizeBytes) : null,
    ]
  );
  await dbRun(
    `
    UPDATE scan_sessions
    SET status = 'Paired', last_heartbeat_at = datetime('now'), updated_at = datetime('now')
    WHERE id = ?
    `,
    [sessionId]
  );
  return await getSessionBaseById(sessionId);
}

export async function addIncomingPdfToSession({
  sessionId,
  token,
  clientRef = "",
  filename = "scan.pdf",
  buffer,
}) {
  const session = await getScanSessionById(sessionId);
  if (!session) return null;
  if (session.pair_token_hash) {
    const pending = await getScanSessionByPairToken(token);
    if (!pending || Number(pending.id) !== Number(sessionId)) return null;
  }
  const buf = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer || []);
  if (!buf.length) return null;

  const ext = path.extname(String(filename || "scan.pdf")) || ".pdf";
  const storageFilename = makeScanStorageFilename(ext || ".pdf");
  const absPath = getScanFilePath(storageFilename);
  fs.writeFileSync(absPath, buf);

  await dbRun(
    `
    INSERT INTO scan_session_incoming (
      session_id, client_ref, storage_filename, filename, mime_type, size_bytes
    ) VALUES (?, ?, ?, ?, 'application/pdf', ?)
    `,
    [
      sessionId,
      String(clientRef || "").slice(0, 120) || null,
      storageFilename,
      String(filename || "").slice(0, 255) || "scan.pdf",
      buf.length,
    ]
  );
  await dbRun(
    `
    UPDATE scan_sessions
    SET status = 'Paired', last_heartbeat_at = datetime('now'), updated_at = datetime('now')
    WHERE id = ?
    `,
    [sessionId]
  );
  return await getSessionBaseById(sessionId);
}

export async function listIncomingForSession(sessionId, { limit = 25 } = {}) {
  const lim = Math.min(Math.max(parseInt(limit, 10) || 25, 1), 100);
  return await dbAll(
    `
    SELECT *
    FROM scan_session_incoming
    WHERE session_id = ?
    ORDER BY created_at DESC, id DESC
    LIMIT ?
    `,
    [sessionId, lim]
  );
}

export async function getIncomingById(incomingId) {
  const id = Number(incomingId);
  if (!Number.isFinite(id) || id < 1) return null;
  const row = await dbGet("SELECT * FROM scan_session_incoming WHERE id = ?", [
    id,
  ]);
  return row || null;
}
