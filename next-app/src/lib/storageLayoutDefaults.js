/**
 * Canonical default storage layout (v2).
 *
 * The layout is stored as JSON inside SQLite `settings.value`.
 * Rects are normalized to a 0..1 canvas for responsive rendering:
 * - x,y are top-left
 * - w,h are width/height
 */

export const ROOM_TEMPLATES = [
  { id: "empty", name: "Empty room", cabinets: [] },
  { id: "grid-4x2", name: "Grid 4x2 (A-H)", cabinets: buildGridCabinets() },
  { id: "grid-3x2", name: "Grid 3x2 (A-F)", cabinets: buildGridCabinets({ cols: 3, rows: 2, cabinetIds: ["A", "B", "C", "D", "E", "F"] }) },
];

export function getDefaultDoor() {
  return { x: 0.05, y: 0.96 };
}

function buildGridCabinets({
  cols = 4,
  rows = 2,
  cabinetIds = ["A", "B", "C", "D", "E", "F", "G", "H"],
  pad = 0.05,
} = {}) {
  const cellW = 1 / cols;
  const cellH = 1 / rows;
  const w = cellW - pad * 2;
  const h = cellH - pad * 2;
  return cabinetIds.map((cabId, idx) => {
    const col = idx % cols;
    const row = Math.floor(idx / cols);
    return {
      id: cabId,
      rect: {
        x: col * cellW + pad,
        y: row * cellH + pad,
        w,
        h,
      },
      rotation: 0,
      drawerIds: [1, 2, 3, 4],
    };
  });
}

export function buildDefaultStorageLayout() {
  const roomIds = Array.from({ length: 10 }, (_, i) => i + 1); // 1..10

  const rooms = roomIds.map((roomId) => {
    return {
      id: roomId,
      name: `Room ${roomId}`,
      cabinets: buildGridCabinets(),
      door: getDefaultDoor(),
    };
  });

  return {
    version: 2,
    rooms,
  };
}

