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
  // Aligned to grid: 4x1 units (0.1 x 0.04)
  return { x: GX * 2, y: GY * 24, w: GX * 4, h: GY, rotation: 0 };
}

function buildGridCabinets({
  cols = 4,
  rows = 2,
} = {}) {
  const w = GX * 3; // 3 units wide (0.075)
  const h = GY * 3; // 3 units high (0.12)
  const gapX = GX;  // 1 unit gap
  const gapY = GY;  // 1 unit gap

  const totalWUnits = cols * 3 + (cols - 1);
  const totalHUnits = rows * 3 + (rows - 1);

  // Calculate starting grid units (centered)
  const startXUnits = Math.floor((40 - totalWUnits) / 2);
  const startYUnits = Math.floor((25 - totalHUnits) / 2);

  const cabinets = [];
  let cabIdx = 0;

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const cabChar = String.fromCharCode(65 + (cabIdx++));
      cabinets.push({
        id: `${cabChar}`,
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

  const getNextId = () => `${String.fromCharCode(65 + cabIdx++)}`;

  // Left column (4 cabinets)
  // Start at x=1 unit, y=1 unit
  for (let i = 0; i < 4; i++) {
    cabinets.push({
      id: getNextId(),
      rect: { 
        x: GX, 
        y: (1 + i * 4) * GY, 
        w, 
        h 
      },
      rotation: 0,
      drawerIds: [1, 2, 3, 4],
    });
  }

  // Base of the U (horizontal row, 5 cabinets)
  // Base y is either top (1 unit) or bottom (21 units)
  const baseYUnits = reversed ? 1 : 21;
  // Center the 5 cabinets: 5 * 3 (width) + 4 * 1 (gap) = 19 units total.
  // Room is 40 units wide. (40 - 19) / 2 = 10.5. We'll use 10 or 11. Let's start at 10.5.
  const startXUnits = 10.5;
  for (let i = 0; i < 5; i++) {
    cabinets.push({
      id: getNextId(),
      rect: { 
        x: (startXUnits + i * 4) * GX, 
        y: baseYUnits * GY, 
        w, 
        h 
      },
      rotation: 0,
      drawerIds: [1, 2, 3, 4],
    });
  }

  // Right column (4 cabinets)
  // X is 40 - 1 (margin) - 3 (width) = 36 units
  for (let i = 0; i < 4; i++) {
    cabinets.push({
      id: getNextId(),
      rect: { 
        x: GX * 36, 
        y: (1 + i * 4) * GY, 
        w, 
        h 
      },
      rotation: 0,
      drawerIds: [1, 2, 3, 4],
    });
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
