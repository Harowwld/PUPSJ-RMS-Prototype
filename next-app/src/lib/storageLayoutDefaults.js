/**
 * Canonical default storage layout (v2).
 *
 * The layout is stored as JSON inside SQLite `settings.value`.
 * Rects are normalized to a 0..1 canvas for responsive rendering:
 * - x,y are top-left
 * - w,h are width/height
 */

// Grid Constants
const GX = 0.025; // 1 horizontal unit
const GY = 0.04;  // 1 vertical unit

export const ROOM_TEMPLATES = [
  { id: "grid-4x2", name: "4x2", cabinets: buildGridCabinets({ cols: 4, rows: 2 }) },
  { id: "grid-3x3", name: "3x3", cabinets: buildGridCabinets({ cols: 3, rows: 3 }) },
  { id: "grid-3x2", name: "3x2", cabinets: buildGridCabinets({ cols: 3, rows: 2 }) },
  { id: "u-shape", name: "U-Shape", cabinets: buildUShapeLayout() },
  { id: "rev-u-shape", name: "Reversed U", cabinets: buildUShapeLayout({ reversed: true }) },
];

export function getDefaultDoor() {
  // Aligned to grid: 5x1 units (0.125 x 0.04)
  return { x: GX * 2, y: GY * 24, w: GX * 5, h: GY, rotation: 0 };
}

function buildGridCabinets({
  cols = 4,
  rows = 2,
} = {}) {
  const w = GX * 3; // 3 units wide (0.075)
  const h = GY * 3; // 3 units high (0.12)

  const totalWUnits = cols * 3 + (cols - 1);
  const totalHUnits = rows * 3 + (rows - 1);

  // Calculate starting grid units (centered)
  const startXUnits = Math.floor((40 - totalWUnits) / 2);
  const startYUnits = Math.floor((25 - totalHUnits) / 2);

  const cabinets = [];
  let cabIdx = 0;

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const cabinetYear = 2020 + (cabIdx++);
      cabinets.push({
        id: `${cabinetYear}`,
        rect: {
          x: (startXUnits + col * 4) * GX,
          y: (startYUnits + row * 4) * GY,
          w,
          h,
        },
        rotation: 0,
        drawerIds: [1, 2, 3, 4],
      });
    }
  }
  return cabinets;
}

function buildUShapeLayout({ reversed = false } = {}) {
  const cabinets = [];
  const w = GX * 3; // 3 units
  const h = GY * 3; // 3 units
  let cabIdx = 0;

  const getNextId = () => `${2020 + (cabIdx++)}`;

  // Centered U-layout within 40x25 grid
  // Horizontal: 5 cabinets across (units 11..30, width 19 units: 5 * 3 + 4 * 1)
  // Left arm at x=11, right arm at x=27. Central walkway = 13 units (0.325).
  // Door is at x=2..7, y=24..25; leaving 4 units (0.10) walkway from door to cabinet column.
  // Vertical: 4 rows (units 3..18, height 15 units: 4 * 3 + 3 * 1).
  // Realistic door clearance: y=18 to door at y=24 is 6 units (0.24) walking space.
  const startXUnits = 11;
  const baseYUnits = reversed ? 3 : 15;

  if (!reversed) {
    // Standard U-shape (base at bottom, open at top)
    // Left arm: 3 cabinets (y = 3, 7, 11)
    for (let i = 0; i < 3; i++) {
      cabinets.push({
        id: getNextId(),
        rect: {
          x: startXUnits * GX,
          y: (3 + i * 4) * GY,
          w,
          h,
        },
        rotation: 0,
        drawerIds: [1, 2, 3, 4],
      });
    }

    // Base row: 5 cabinets (x = 11, 15, 19, 23, 27 at y = 15)
    for (let i = 0; i < 5; i++) {
      cabinets.push({
        id: getNextId(),
        rect: {
          x: (startXUnits + i * 4) * GX,
          y: baseYUnits * GY,
          w,
          h,
        },
        rotation: 0,
        drawerIds: [1, 2, 3, 4],
      });
    }

    // Right arm: 3 cabinets (y = 3, 7, 11)
    for (let i = 0; i < 3; i++) {
      cabinets.push({
        id: getNextId(),
        rect: {
          x: (startXUnits + 16) * GX,
          y: (3 + i * 4) * GY,
          w,
          h,
        },
        rotation: 0,
        drawerIds: [1, 2, 3, 4],
      });
    }
  } else {
    // Reversed U-shape (base at top, open towards entrance)
    // Base row: 5 cabinets (x = 11, 15, 19, 23, 27 at y = 3)
    for (let i = 0; i < 5; i++) {
      cabinets.push({
        id: getNextId(),
        rect: {
          x: (startXUnits + i * 4) * GX,
          y: baseYUnits * GY,
          w,
          h,
        },
        rotation: 0,
        drawerIds: [1, 2, 3, 4],
      });
    }

    // Left arm: 3 cabinets (y = 7, 11, 15)
    for (let i = 0; i < 3; i++) {
      cabinets.push({
        id: getNextId(),
        rect: {
          x: startXUnits * GX,
          y: (7 + i * 4) * GY,
          w,
          h,
        },
        rotation: 0,
        drawerIds: [1, 2, 3, 4],
      });
    }

    // Right arm: 3 cabinets (y = 7, 11, 15)
    for (let i = 0; i < 3; i++) {
      cabinets.push({
        id: getNextId(),
        rect: {
          x: (startXUnits + 16) * GX,
          y: (7 + i * 4) * GY,
          w,
          h,
        },
        rotation: 0,
        drawerIds: [1, 2, 3, 4],
      });
    }
  }

  return cabinets;
}

export function buildDefaultStorageLayout() {
  const roomIds = Array.from({ length: 10 }, (_, i) => i + 1);

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

export function buildDefaultOsasStorageLayout() {
  return buildDefaultStorageLayout();
}


