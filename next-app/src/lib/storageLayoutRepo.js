import { dbAll, dbGet, dbRun } from "./postgresCompat.js";
import { transaction } from "./postgres.js";
import {
  buildDefaultStorageLayout,
  buildDefaultOsasStorageLayout,
  getDefaultDoor,
} from "./storageLayoutDefaults.js";
import { canonicalizeCabinetId } from "./storageLayoutUtils.js";

const STORAGE_LAYOUT_KEY = "storage_layout";

function scopedSettingsKey(baseKey, officeId) {
  const normalized = String(officeId || "").trim().toLowerCase();
  if (!normalized) throw new Error("Office scope is required");
  return `${baseKey}:${normalized}`;
}

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
  const within = (v) => v >= -1e-4 && v <= 1 + 1e-4;
  if (!within(x) || !within(y) || !within(w) || !within(h)) return null;
  if (w <= 0 || h <= 0) return null;

  const cx = Math.max(0, Math.min(1, x));
  const cy = Math.max(0, Math.min(1, y));
  const cw = Math.max(0.01, Math.min(Math.max(0.01, 1 - cx), w));
  const ch = Math.max(0.01, Math.min(Math.max(0.01, 1 - cy), h));

  return { x: cx, y: cy, w: cw, h: ch };
}

function normalizeDrawerId(d) {
  if (typeof d === "number") {
    return Number.isFinite(d) && Number.isInteger(d) && d >= 1 ? d : null;
  }
  if (typeof d === "string") {
    const trimmed = d.trim();
    if (!trimmed) return null;
    const num = Number(trimmed);
    if (Number.isFinite(num) && Number.isInteger(num) && num >= 1) {
      return num;
    }
    return trimmed.slice(0, 40);
  }
  return null;
}

function normalizeDrawerIds(drawerIdsRaw) {
  if (!Array.isArray(drawerIdsRaw)) return null;
  const ids = drawerIdsRaw
    .map(normalizeDrawerId)
    .filter((d) => d !== null);
  const unique = Array.from(new Set(ids));
  unique.sort((a, b) => {
    if (typeof a === "number" && typeof b === "number") return a - b;
    return String(a).localeCompare(String(b), undefined, { numeric: true });
  });
  if (unique.length === 0) return null;
  return unique;
}


function normalizeCabinetId(cabinetIdRaw) {
  const id = canonicalizeCabinetId(cabinetIdRaw);
  return id.length ? id : null;
}

function normalizeRotation(rotationRaw) {
  if (rotationRaw === undefined || rotationRaw === null || rotationRaw === "") return 0;
  const n = typeof rotationRaw === "string" ? Number(rotationRaw) : rotationRaw;
  if (!Number.isFinite(n)) return 0;
  return [0, 90, 180, 270].includes(n) ? n : 0;
}

function normalizeStorageLayout(layoutRaw) {
  if (!layoutRaw || typeof layoutRaw !== "object") return null;
  const versionRaw = layoutRaw.version !== undefined ? Number(layoutRaw.version) : 2;
  const version = (versionRaw === 1 || versionRaw === 2) ? versionRaw : 2;

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
    const doorW = coerceFiniteNumber(r?.door?.w);
    const doorH = coerceFiniteNumber(r?.door?.h);
    const doorRotation = normalizeRotation(r?.door?.rotation);
    const fallbackDoor = getDefaultDoor();
    const door = {
      x: doorX === null ? fallbackDoor.x : Math.max(0, Math.min(1, doorX)),
      y: doorY === null ? fallbackDoor.y : Math.max(0, Math.min(1, doorY)),
      w: doorW === null ? (fallbackDoor.w ?? 0.08) : Math.max(0.01, Math.min(1, doorW)),
      h: doorH === null ? (fallbackDoor.h ?? 0.03) : Math.max(0.01, Math.min(1, doorH)),
      rotation: doorRotation,
    };

    rooms.push({ id: roomId, name: roomName || `Room ${roomId}`, cabinets, door });
  }

  rooms.sort((a, b) => a.id - b.id);

  // Always normalize to v2.
  return { version: 2, rooms };
}

export function getDefaultStorageLayout({ officeId } = {}) {
  const norm = String(officeId || "").trim().toLowerCase();
  if (norm === "osas") {
    return buildDefaultOsasStorageLayout();
  }
  return buildDefaultStorageLayout();
}

export async function getStorageLayout({ officeId } = {}) {
  const key = scopedSettingsKey(STORAGE_LAYOUT_KEY, officeId);
  const row = await dbGet(
    "SELECT value FROM settings WHERE key = ?",
    [key]
  );

  if (!row?.value) {
    return getDefaultStorageLayout({ officeId });
  }

  try {
    const parsed = JSON.parse(String(row.value));
    const normalized = normalizeStorageLayout(parsed);
    if (!normalized) return getDefaultStorageLayout({ officeId });
    return normalized;
  } catch {
    return getDefaultStorageLayout({ officeId });
  }
}

export async function setStorageLayout(layout, { officeId } = {}) {
  const key = scopedSettingsKey(STORAGE_LAYOUT_KEY, officeId);
  const normalized = normalizeStorageLayout(layout);
  if (!normalized) {
    throw new Error("Invalid storage_layout payload");
  }

  await dbRun(
    `INSERT INTO settings (key, value) VALUES (?, ?)
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = CURRENT_TIMESTAMP`,
    [key, JSON.stringify(normalized)]
  );

  return normalized;
}

export async function setStorageLayoutWithReassignments(layout, mappings = [], { officeId } = {}) {
  const normalizedOfficeId = String(officeId || "").trim().toLowerCase();
  if (!normalizedOfficeId) throw new Error("Office scope is required");
  const normalizedLayout = normalizeStorageLayout(layout);
  if (!normalizedLayout) throw new Error("Invalid storage_layout payload");

  const bySource = new Map();
  for (const mapping of mappings) {
    const from = {
      room: Number(mapping?.from?.room),
      cabinet: canonicalizeCabinetId(mapping?.from?.cabinet),
      drawer: String(mapping?.from?.drawer ?? "").trim(),
    };
    const to = {
      room: Number(mapping?.to?.room),
      cabinet: canonicalizeCabinetId(mapping?.to?.cabinet),
      drawer: String(mapping?.to?.drawer ?? "").trim(),
    };
    if (
      !Number.isFinite(from.room) || !from.cabinet || !from.drawer ||
      !Number.isFinite(to.room) || !to.cabinet || !to.drawer
    ) throw new Error("Invalid reassignment location");

    const key = `${from.room}|${from.cabinet}|${from.drawer}`;
    const existing = bySource.get(key);
    if (existing && (existing.to.room !== to.room || existing.to.cabinet !== to.cabinet || existing.to.drawer !== to.drawer)) {
      throw new Error("A source location cannot be reassigned to multiple targets");
    }
    if (!existing) bySource.set(key, { from, to });
  }

  const entries = [...bySource.values()];
  const settingsKey = scopedSettingsKey(STORAGE_LAYOUT_KEY, normalizedOfficeId);
  return transaction(async ({ query: run, queryOne: runOne }) => {
    let moved = 0;
    let breakdown = [];
    if (entries.length) {
      const values = [];
      const rows = entries.map(({ from, to }, index) => {
        const start = index * 6;
        values.push(from.room, from.cabinet, from.drawer, to.room, to.cabinet, to.drawer);
        return `($${start + 1}::integer, $${start + 2}::text, $${start + 3}::text, $${start + 4}::integer, $${start + 5}::text, $${start + 6}::text)`;
      });
      const mappingsSql = `VALUES ${rows.join(", ")}`;
      const counts = await run(
        `WITH mappings(from_room, from_cabinet, from_drawer, to_room, to_cabinet, to_drawer) AS (${mappingsSql})
         SELECT m.from_room, m.from_cabinet, m.from_drawer, m.to_room, m.to_cabinet, m.to_drawer,
                COUNT(s.student_no)::int AS count
         FROM mappings m
         LEFT JOIN students s
           ON s.storage_room = m.from_room
          AND s.storage_cabinet = m.from_cabinet
          AND s.storage_drawer = m.from_drawer
          AND s.status = 'Active'
          AND EXISTS (SELECT 1 FROM student_office_memberships som
                       WHERE som.student_no = s.student_no
                         AND som.office_id = $${values.length + 1}
                         AND som.status = 'Active')
         GROUP BY m.from_room, m.from_cabinet, m.from_drawer, m.to_room, m.to_cabinet, m.to_drawer
         ORDER BY m.from_room, m.from_cabinet, m.from_drawer`,
        [...values, normalizedOfficeId],
      );
      breakdown = counts.rows.map((row) => ({
        from: { room: row.from_room, cabinet: row.from_cabinet, drawer: row.from_drawer },
        to: { room: row.to_room, cabinet: row.to_cabinet, drawer: row.to_drawer },
        moved: Number(row.count || 0),
      }));
      moved = breakdown.reduce((total, item) => total + item.moved, 0);

      await run(
        `WITH mappings(from_room, from_cabinet, from_drawer, to_room, to_cabinet, to_drawer) AS (${mappingsSql})
         UPDATE students s
            SET storage_room = m.to_room,
                storage_cabinet = m.to_cabinet,
                storage_drawer = m.to_drawer
           FROM mappings m
          WHERE s.storage_room = m.from_room
            AND s.storage_cabinet = m.from_cabinet
            AND s.storage_drawer = m.from_drawer
            AND s.status = 'Active'
            AND EXISTS (SELECT 1 FROM student_office_memberships som
                         WHERE som.student_no = s.student_no
                           AND som.office_id = $${values.length + 1}
                           AND som.status = 'Active')`,
        [...values, normalizedOfficeId],
      );
    }

    await run(
      `INSERT INTO settings (key, value) VALUES ($1, $2)
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = CURRENT_TIMESTAMP`,
      [settingsKey, JSON.stringify(normalizedLayout)],
    );
    const saved = await runOne("SELECT value FROM settings WHERE key = $1", [settingsKey]);
    return { layout: saved?.value ? normalizeStorageLayout(JSON.parse(saved.value)) : normalizedLayout, moved, breakdown };
  });
}

export async function exportStorageLayoutForDiagnostics({ officeId } = {}) {
  const key = scopedSettingsKey(STORAGE_LAYOUT_KEY, officeId);
  const row = await dbGet(
    "SELECT value FROM settings WHERE key = ?",
    [key]
  );
  return row?.value ? String(row.value) : null;
}

export async function listSettingsKeys() {
  const rows = await dbAll("SELECT key FROM settings ORDER BY key ASC", []);
  return rows.map((r) => String(r.key));
}

const STORAGE_TEMPLATES_KEY = "storage_templates";

export async function getStorageTemplates({ officeId } = {}) {
  const key = scopedSettingsKey(STORAGE_TEMPLATES_KEY, officeId);
  const row = await dbGet(
    "SELECT value FROM settings WHERE key = ?",
    [key]
  );
  const { ROOM_TEMPLATES } = await import("./storageLayoutDefaults.js");
  if (!row?.value) {
    return ROOM_TEMPLATES;
  }
  try {
    return JSON.parse(String(row.value));
  } catch {
    return ROOM_TEMPLATES;
  }
}

export async function setStorageTemplates(templates, { officeId } = {}) {
  const key = scopedSettingsKey(STORAGE_TEMPLATES_KEY, officeId);
  if (!Array.isArray(templates)) {
    throw new Error("Invalid storage_templates payload");
  }
  const seenIds = new Set();
  const normalizedTemplates = templates.map((template, templateIndex) => {
    const id = String(template?.id || "").trim();
    const name = String(template?.name || "").trim();
    if (!id || id.length > 80 || !name || name.length > 120 || !Array.isArray(template?.cabinets)) {
      throw new Error(`Template ${templateIndex + 1} must have a valid id, name, and cabinets array`);
    }
    if (seenIds.has(id)) throw new Error(`Template id '${id}' is duplicated`);
    seenIds.add(id);

    const cabinetIds = new Set();
    const cabinets = template.cabinets.map((cabinet, cabinetIndex) => {
      const cabinetId = normalizeCabinetId(cabinet?.id);
      const rect = normalizeRect(cabinet?.rect);
      const drawerIds = normalizeDrawerIds(cabinet?.drawerIds);
      const rawRotation = cabinet?.rotation === undefined ? 0 : Number(cabinet.rotation);
      const rotation = normalizeRotation(rawRotation);
      if (!cabinetId || !rect || !drawerIds || ![0, 90, 180, 270].includes(rawRotation)) {
        throw new Error(`Template '${name}' cabinet ${cabinetIndex + 1} is invalid`);
      }
      if (cabinetIds.has(cabinetId)) throw new Error(`Template '${name}' has duplicate cabinet '${cabinetId}'`);
      cabinetIds.add(cabinetId);
      return { id: cabinetId, rect, rotation, drawerIds };
    });

    let door;
    if (template.door !== undefined && template.door !== null) {
      const x = coerceFiniteNumber(template.door.x);
      const y = coerceFiniteNumber(template.door.y);
      const w = coerceFiniteNumber(template.door.w);
      const h = coerceFiniteNumber(template.door.h);
      const rawRotation = template.door.rotation === undefined ? 0 : Number(template.door.rotation);
      const rotation = normalizeRotation(rawRotation);
      if ([x, y, w, h].some((value) => value === null || value < 0 || value > 1) || w <= 0 || h <= 0 ||
          x + w > 1 || y + h > 1 || ![0, 90, 180, 270].includes(rawRotation)) {
        throw new Error(`Template '${name}' door is invalid`);
      }
      door = { x, y, w, h, rotation };
    }

    return { id, name, cabinets, ...(door ? { door } : {}) };
  });
  await dbRun(
    `INSERT INTO settings (key, value) VALUES (?, ?)
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = CURRENT_TIMESTAMP`,
    [key, JSON.stringify(normalizedTemplates)]
  );
  return normalizedTemplates;
}

export async function restoreDefaultStorageTemplates({ officeId } = {}) {
  const key = scopedSettingsKey(STORAGE_TEMPLATES_KEY, officeId);
  await dbRun("DELETE FROM settings WHERE key = ?", [key]);
  const { ROOM_TEMPLATES } = await import("./storageLayoutDefaults.js");
  return ROOM_TEMPLATES;
}
