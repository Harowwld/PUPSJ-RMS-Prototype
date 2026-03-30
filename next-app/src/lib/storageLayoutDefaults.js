/**
 * Canonical default storage layout (v2).
 *
 * The layout is stored as JSON inside SQLite `settings.value`.
 * Rects are normalized to a 0..1 canvas for responsive rendering:
 * - x,y are top-left
 * - w,h are width/height
 */

export function buildDefaultStorageLayout() {
  const roomIds = Array.from({ length: 10 }, (_, i) => i + 1); // 1..10
  const cabinetIds = ["A", "B", "C", "D", "E", "F", "G", "H"];

  // Default "physical" placement: a simple 4x2 grid inside the room canvas.
  const cols = 4;
  const rows = 2;
  const cellW = 1 / cols;
  const cellH = 1 / rows;
  const pad = 0.05; // normalized padding inside each grid cell
  const w = cellW - pad * 2; // ~0.15 with current settings
  const h = cellH - pad * 2; // ~0.4 with current settings

  const rooms = roomIds.map((roomId) => {
    const cabinets = cabinetIds.map((cabId, idx) => {
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
        // Default matches current app behavior: drawers are 1..4.
        drawerIds: [1, 2, 3, 4],
      };
    });

    return {
      id: roomId,
      name: `Room ${roomId}`,
      cabinets,
    };
  });

  return {
    version: 2,
    rooms,
  };
}

