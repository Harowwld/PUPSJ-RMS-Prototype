"use client";

export default function RoomMap2D({
  kind, // "cabinets" | "drawers"
  cabinets,
  roomDoor,
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

      {/* Orientation marker (Door Symbol) for staff navigation */}
      <div
        className="absolute z-[2] group"
        style={{
          left: `${(roomDoor?.x ?? 0.05) * 100}%`,
          top: `${(roomDoor?.y ?? 0.96) * 100}%`,
          transform: "translate(-50%, -50%)",
        }}
      >
        <div className="relative w-10 h-10 flex items-center justify-center">
          {/* Floor plan door quadrant symbol */}
          <div className="absolute bottom-0 left-0 w-full h-[2px] bg-gray-400 rounded-full group-hover:bg-gray-600 transition-colors" />
          <div className="absolute bottom-0 left-0 w-[2px] h-full bg-pup-maroon rounded-full transition-all" />
          <div className="absolute inset-0 border-t-2 border-r-2 border-pup-maroon/20 rounded-tr-full group-hover:border-pup-maroon/40 transition-colors" />
          
          {/* Subtle Label */}
          <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[9px] px-1.5 py-0.5 rounded font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none shadow-lg z-10">
            Entrance / Door
          </div>
        </div>
      </div>

      {cabinetRects.map((c) => {
        const isSelected = kind === "drawers" && c.cab === selectedCabinetId;
        const isTarget = Boolean(c.isTarget);
        const rect = getEffectiveRect(c);
        const showCabBadge = !(kind === "drawers" && isSelected);

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
            {showCabBadge ? (
              <div className="absolute left-1.5 top-1.5 z-[1] text-[11px] font-black text-gray-800 bg-white/80 px-1.5 py-0.5 rounded-sm border border-gray-200">
                CAB-{c.cab}
              </div>
            ) : null}

            {kind === "cabinets" ? (
              <div className="absolute inset-x-0 bottom-1.5 px-1 text-[11px] text-center font-bold text-gray-700 bg-white/80 mx-1 rounded-sm border border-gray-200">
                {c.occupiedCount} Records
              </div>
            ) : isSelected ? (
              <div className="absolute inset-1 flex min-h-0 flex-col gap-1.5">
                <div className="shrink-0 rounded-sm border border-gray-200 bg-white/95 px-1.5 py-0.5 text-center text-[10px] font-black tracking-wide text-gray-800 shadow-sm">
                  CAB-{c.cab}
                </div>
                <div className="flex min-h-0 flex-1 flex-col gap-1.5">
                  {drawerSlots?.map((d) => {
                    const drawerText = `Drawer ${d.drawer}`;
                    const drawerClass =
                      d.count > 0
                        ? "drawer-occupied"
                        : "bg-white border-gray-200 text-gray-300";

                    return (
                      <div
                        key={d.drawer}
                        className={`drawer-box flex min-h-0 flex-1 rounded-brand items-center justify-center transition-all border locator-tile ${drawerClass} ${
                          d.isTarget ? "drawer-located" : ""
                        }`}
                      >
                        <span
                          className={`text-[10px] font-bold ${
                            d.isTarget ? "text-pup-maroon" : "text-gray-900"
                          }`}
                        >
                          {drawerText}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="absolute inset-x-0 bottom-1.5 px-1 text-[10px] text-center font-bold text-gray-600">
                {c.occupiedCount} Records
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

