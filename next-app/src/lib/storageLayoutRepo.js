import { dbAll, dbGet, dbRun } from "./sqlite.js";
import {
  buildDefaultStorageLayout,
  getDefaultDoor,
} from "./storageLayoutDefaults.js";

const STORAGE_LAYOUT_KEY = "storage_layout";

function isFiniteNumber(n) {
  return typeof n === "number" && Number.isFinite(n);
}

function coerceFiniteNumber(n) {
  const x = typeof n === "string" ? Number(n) : n;
  return isFiniteNumber(x) ? x : null;
}

function normalizeRect(rect) {
  if (!rect || typeof rect !== "object") return null;
  const x = coerceFiniteNumber(rect.x);
  const y = coerceFiniteNumber(rect.y);
  const w = coerceFiniteNumber(rect.w);
  const h = coerceFiniteNumber(rect.h);
  if (x === null || y === null || w === null || h === null) return null;

  // We allow small floating errors; the editor clamps values anyway.
  const within = (v) => v >= -1e-9 && v <= 1 + 1e-9;
  if (!within(x) || !within(y) || !within(w) || !within(h)) return null;
  if (w <= 0 || h <= 0) return null;
  if (x + w > 1 + 1e-9) return null;
  if (y + h > 1 + 1e-9) return null;

  return { x, y, w, h };
}

function normalizeDrawerIds(drawerIdsRaw) {
  if (!Array.isArray(drawerIdsRaw)) return null;
  const ids = drawerIdsRaw
    .map((d) => (typeof d === "string" ? Number(d) : d))
    .filter((d) => Number.isFinite(d) && Number.isInteger(d) && d >= 1);
  const unique = Array.from(new Set(ids));
  unique.sort((a, b) => a - b);
  if (unique.length === 0) return null;
  return unique;
}

function normalizeCabinetId(cabinetIdRaw) {
  const id = String(cabinetIdRaw ?? "").trim();
  return id.length ? id : null;
}

function normalizeRotation(rotationRaw) {
  if (rotationRaw === undefined || rotationRaw === null || rotationRaw === "") return 0;
  const n = typeof rotationRaw === "string" ? Number(rotationRaw) : rotationRaw;
  if (!Number.isFinite(n)) return 0;
  return n === 90 ? 90 : 0;
}

function normalizeStorageLayout(layoutRaw) {
  if (!layoutRaw || typeof layoutRaw !== "object") return null;
  const version = Number(layoutRaw.version);
  if (!Number.isFinite(version) || (version !== 1 && version !== 2)) return null;

  if (!Array.isArray(layoutRaw.rooms)) return null;

  const rooms = [];
  for (const r of layoutRaw.rooms) {
    const roomId = coerceFiniteNumber(r?.id);
    if (roomId === null || !Number.isInteger(roomId) || roomId < 1) continue;

    const roomName =
      r?.name === undefined || r?.name === null ? null : String(r.name).trim();
    if (!Array.isArray(r.cabinets)) continue;

    const cabinets = [];
    const seenCabIds = new Set();

    for (const c of r.cabinets) {
      const cabId = normalizeCabinetId(c?.id);
      if (!cabId) continue;
      if (seenCabIds.has(cabId)) continue;

      const rect = normalizeRect(c?.rect);
      if (!rect) continue;

      const rotation = normalizeRotation(c?.rotation);

      const drawerIds = normalizeDrawerIds(c?.drawerIds);
      if (!drawerIds) continue;

      // Store rect as the canonical unrotated dimensions.
      // Rendering code should apply rotation (swap w/h when rotation=90).
      cabinets.push({ id: cabId, rect, rotation, drawerIds });
      seenCabIds.add(cabId);
    }

    // Stable ordering for predictable rendering.
    cabinets.sort((a, b) => String(a.id).localeCompare(String(b.id), undefined, { numeric: true }));
    const doorX = coerceFiniteNumber(r?.door?.x);
    const doorY = coerceFiniteNumber(r?.door?.y);
    const fallbackDoor = getDefaultDoor();
    const door = {
      x:
        doorX === null
          ? fallbackDoor.x
          : Math.max(0, Math.min(1, doorX)),
      y:
        doorY === null
          ? fallbackDoor.y
          : Math.max(0, Math.min(1, doorY)),
    };

    rooms.push({ id: roomId, name: roomName || `Room ${roomId}`, cabinets, door });
  }

  rooms.sort((a, b) => a.id - b.id);

  // Always normalize to v2.
  return { version: 2, rooms };
}

export function getDefaultStorageLayout() {
  return buildDefaultStorageLayout();
}

export async function getStorageLayout() {
  const row = await dbGet(
    "SELECT value FROM settings WHERE key = ?",
    [STORAGE_LAYOUT_KEY]
  );

  if (!row?.value) {
    return { version: 2, rooms: [] };
  }

  try {
    const parsed = JSON.parse(String(row.value));
    const normalized = normalizeStorageLayout(parsed);
    if (!normalized) return { version: 2, rooms: [] };
    return normalized;
  } catch {
    return { version: 2, rooms: [] };
  }
}

export async function setStorageLayout(layout) {
  const normalized = normalizeStorageLayout(layout);
  if (!normalized) {
    throw new Error("Invalid storage_layout payload");
  }

  await dbRun(
    "INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)",
    [STORAGE_LAYOUT_KEY, JSON.stringify(normalized)]
  );

  return normalized;
}

export async function exportStorageLayoutForDiagnostics() {
  const row = await dbGet(
    "SELECT value FROM settings WHERE key = ?",
    [STORAGE_LAYOUT_KEY]
  );
  return row?.value ? String(row.value) : null;
}

export async function listSettingsKeys() {
  const rows = await dbAll("SELECT key FROM settings ORDER BY key ASC", []);
  return rows.map((r) => String(r.key));
}

