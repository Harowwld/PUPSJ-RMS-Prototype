/**
 * Canonical default storage layout (v2).
 *
 * The layout is stored as JSON inside SQLite `settings.value`.
 * Rects are normalized to a 0..1 canvas for responsive rendering:
 * - x,y are top-left
 * - w,h are width/height
 */

export const ROOM_TEMPLATES = [
  { id: "grid-4x2", name: "Grid 4x2", cabinets: buildGridCabinets({ cols: 4, rows: 2, gap: 0.04 }) },
  { id: "grid-3x3", name: "Grid 3x3", cabinets: buildGridCabinets({ cols: 3, rows: 3, gap: 0.04 }) },
  { id: "grid-3x2", name: "Grid 3x2", cabinets: buildGridCabinets({ cols: 3, rows: 2, gap: 0.04 }) },
  { id: "u-shape", name: "U-Shape Layout", cabinets: buildUShapeLayout() },
  { id: "rev-u-shape", name: "Reversed U-Shape", cabinets: buildUShapeLayout({ reversed: true }) },
];

export function getDefaultDoor() {
  return { x: 0.05, y: 0.96, w: 0.08, h: 0.03, rotation: 0 };
}

function buildGridCabinets({
  cols = 4,
  rows = 2,
  gap = 0.02,
  centerAisle = false,
} = {}) {
  const w = 0.08;
  const h = 0.12;

  const totalW = cols * w + (cols - 1) * gap;
  const totalH = rows * h + (rows - 1) * gap;

  const startX = (1 - totalW) / 2;
  const startY = (1 - totalH) / 2;

  const count = cols * rows;
  const cabinets = [];
  let cabIdx = 0;

  for (let idx = 0; idx < count; idx++) {
    const col = idx % cols;
    const row = Math.floor(idx / cols);

    // Skip the absolute center if centerAisle is requested (only for 3x3)
    if (centerAisle && cols === 3 && rows === 3 && col === 1 && row === 1) {
      continue;
    }

    const cabChar = String.fromCharCode(65 + (cabIdx++)); // Sequential naming
    cabinets.push({
      id: `CAB-${cabChar}`,
      rect: {
        x: startX + col * (w + gap),
        y: startY + row * (h + gap),
        w,
        h,
      },
      rotation: 0,
      drawerIds: [1, 2, 3, 4],
    });
  }
  return cabinets;
}

function buildUShapeLayout({ reversed = false } = {}) {
  const cabinets = [];
  const cabW = 0.08;
  const cabH = 0.12;
  const margin = 0.05;
  let cabIdx = 0;

  const getNextId = () => `CAB-${String.fromCharCode(65 + cabIdx++)}`;

  // Left column
  for (let i = 0; i < 4; i++) {
    cabinets.push({
      id: getNextId(),
      rect: { x: margin, y: margin + i * (cabH + 0.02), w: cabW, h: cabH },
      rotation: 0,
      drawerIds: [1, 2, 3, 4],
    });
  }

  // Bottom row (the base of the U)
  const baseY = reversed ? margin : 1 - margin - cabH;
  for (let i = 0; i < 5; i++) {
    cabinets.push({
      id: getNextId(),
      rect: { x: margin + cabW + 0.02 + i * (cabW + 0.02), y: baseY, w: cabW, h: cabH },
      rotation: 0,
      drawerIds: [1, 2, 3, 4],
    });
  }

  // Right column
  for (let i = 0; i < 4; i++) {
    cabinets.push({
      id: getNextId(),
      rect: { x: 1 - margin - cabW, y: margin + i * (cabH + 0.02), w: cabW, h: cabH },
      rotation: 0,
      drawerIds: [1, 2, 3, 4],
    });
  }

  return cabinets;
}

export function buildDefaultStorageLayout() {
  const roomIds = Array.from({ length: 10 }, (_, i) => i + 1); // 1..10

  const rooms = roomIds.map((roomId) => {
    return {
      id: roomId,
      name: `Room ${roomId}`,
      cabinets: buildGridCabinets({ cols: 4, rows: 2 }),
      door: getDefaultDoor(),
    };
  });

  return {
    version: 2,
    rooms,
  };
}
