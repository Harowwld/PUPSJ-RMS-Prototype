"use client";

export default function RoomMap2D({
  kind, // "cabinets" | "drawers"
  cabinets,
  selectedCabinetId,
  drawerSlots,
  onCabinetClick,
}) {
  const cabinetRects = cabinets || [];

  const getEffectiveRect = (c) => {
    const rot = Number(c?.rotation) === 90 ? 90 : 0;
    if (rot !== 90) return c.rect;
    return { ...c.rect, w: c.rect.h, h: c.rect.w };
  };

  return (
    <div className="relative w-full h-full rounded-brand overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200 border border-gray-300">
      {/* Subtle background grid */}
      <div
        className="absolute inset-0 pointer-events-none opacity-40"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(0,0,0,0.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,0,0,0.08) 1px, transparent 1px)",
          backgroundSize: "8% 8%",
        }}
      />

      {cabinetRects.map((c) => {
        const isSelected = kind === "drawers" && c.cab === selectedCabinetId;
        const isTarget = Boolean(c.isTarget);
        const rect = getEffectiveRect(c);

        return (
          <div
            key={c.cab}
            className={`locator-tile absolute overflow-hidden shadow-sm ${
              isTarget ? "cabinet-located" : ""
            } ${isSelected ? "ring-2 ring-pup-maroon/40" : ""}`}
            style={{
              left: `${rect.x * 100}%`,
              top: `${rect.y * 100}%`,
              width: `${rect.w * 100}%`,
              height: `${rect.h * 100}%`,
              cursor: kind === "cabinets" ? "pointer" : "default",
            }}
            onClick={() => {
              if (kind !== "cabinets") return;
              onCabinetClick?.(c.cab);
            }}
          >
            <div className="absolute left-1.5 top-1.5 text-[11px] font-black text-gray-800 bg-white/80 px-1.5 py-0.5 rounded-sm border border-gray-200">
              CAB-{c.cab}
            </div>

            {kind === "cabinets" ? (
              <div className="absolute inset-x-0 bottom-1.5 px-1 text-[11px] text-center font-bold text-gray-700 bg-white/80 mx-1 rounded-sm border border-gray-200">
                {c.occupiedCount} Folders
              </div>
            ) : isSelected ? (
              // Drawer overlay (occupies the cabinet rect)
              <div className="absolute inset-1 flex flex-col gap-1.5">
                {drawerSlots?.map((d) => {
                  const countText =
                    d.count === 1 ? "1 Folder" : `${d.count} Folders`;
                  const drawerClass =
                    d.count > 0
                      ? "drawer-occupied"
                      : "bg-white border-gray-200 text-gray-300";

                  return (
                    <div
                      key={d.drawer}
                      className={`drawer-box flex-1 rounded-brand flex items-center justify-center transition-all border locator-tile ${drawerClass} ${
                        d.isTarget ? "drawer-located" : ""
                      }`}
                    >
                      <span
                        className={`text-[10px] font-bold ${
                          d.isTarget ? "text-pup-maroon" : "text-gray-900"
                        }`}
                      >
                        {countText}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              // Non-selected cabinet: show occupancy only
              <div className="absolute inset-x-0 bottom-1.5 px-1 text-[10px] text-center font-bold text-gray-600">
                {c.occupiedCount} Folders
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

