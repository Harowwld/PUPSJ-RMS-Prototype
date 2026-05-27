"use client"

export default function RoomMap2D({
  kind, // "cabinets" | "drawers"
  cabinets,
  roomDoor,
  selectedCabinetId,
  drawerSlots,
  onCabinetClick,
  onDrawerClick,
}) {
  const cabinetRects = cabinets || []

  const getEffectiveRect = (c) => {
    const rot = Number(c?.rotation) === 90 ? 90 : 0
    if (rot !== 90) return c.rect
    return { ...c.rect, w: c.rect.h, h: c.rect.w }
  }

  return (
    <div className="relative h-full w-full overflow-hidden rounded-brand border border-gray-300 bg-gradient-to-br from-gray-100 to-gray-200 dark:border-white/10">
      {/* Subtle background grid */}
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(0,0,0,0.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,0,0,0.08) 1px, transparent 1px)",
          backgroundSize: "8% 8%",
        }}
      />

      {/* Orientation marker (Door Symbol) for staff navigation */}
      <div
        className="group absolute z-[2]"
        style={{
          left: `${(roomDoor?.x ?? 0.05) * 100}%`,
          top: `${(roomDoor?.y ?? 0.96) * 100}%`,
          transform: "translate(-50%, -50%)",
        }}
      >
        <div className="relative flex h-10 w-10 items-center justify-center">
          {/* Floor plan door quadrant symbol */}
          <div className="absolute bottom-0 left-0 h-[2px] w-full rounded-full bg-gray-400 transition-colors group-hover:bg-gray-600" />
          <div className="absolute bottom-0 left-0 h-full w-[2px] rounded-full bg-pup-maroon transition-all dark:bg-red-600" />
          <div className="absolute inset-0 rounded-tr-full border-t-2 border-r-2 border-gray-300 transition-colors group-hover:border-gray-300 dark:border-white/10 dark:group-hover:border-zinc-700 dark:hover:border-zinc-700" />

          {/* Subtle Label */}
          <div className="pointer-events-none absolute -top-6 left-1/2 z-10 -translate-x-1/2 rounded bg-gray-900 px-1.5 py-0.5 text-[9px] font-black tracking-widest whitespace-nowrap text-white uppercase opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
            Entrance / Door
          </div>
        </div>
      </div>

      {cabinetRects.map((c) => {
        const isSelected = kind === "drawers" && c.cab === selectedCabinetId
        const isTarget = Boolean(c.isTarget)
        const rect = getEffectiveRect(c)
        const showCabBadge = !(kind === "drawers" && isSelected)

        return (
          <div
            key={c.cab}
            className={`locator-tile absolute overflow-hidden shadow-sm transition-all duration-300 ${
              isTarget
                ? "cabinet-located"
                : isSelected
                  ? "bg-gray-50 dark:bg-zinc-500 ring-2 ring-pup-maroon/40"
                  : "bg-white dark:bg-zinc-800 hover:bg-red-50 dark:hover:bg-zinc-700/50"
            } dark:shadow-none`}
            style={{
              left: `${rect.x * 100}%`,
              top: `${rect.y * 100}%`,
              width: `${rect.w * 100}%`,
              height: `${rect.h * 100}%`,
              cursor: "pointer",
            }}
            onClick={() => {
              onCabinetClick?.(c.cab)
            }}
          >
            {showCabBadge ? (
              <div className="absolute top-1.5 left-1.5 z-[1] rounded-sm border border-gray-200 bg-white px-1.5 py-0.5 text-[11px] font-black text-gray-800 dark:border-white/10 dark:bg-card/80 dark:text-zinc-100">
                CAB-{c.cab}
              </div>
            ) : null}

            {kind === "cabinets" ? (
              <div className="absolute inset-x-0 bottom-1.5 mx-1 rounded-sm border border-gray-200 bg-white px-1 text-center text-[11px] font-bold text-gray-700 dark:border-white/10 dark:bg-card/80 dark:text-zinc-200">
                {c.occupiedCount} Records
              </div>
            ) : isSelected ? (
              <div className="absolute inset-1 flex min-h-0 flex-col gap-1.5">
                <div className="shrink-0 rounded-sm border border-gray-200 bg-white px-1.5 py-0.5 text-center text-[10px] font-black tracking-wide text-gray-800 shadow-sm dark:border-white/10 dark:bg-card/95 dark:text-zinc-100 dark:shadow-none">
                  CAB-{c.cab}
                </div>
                <div className="flex min-h-0 flex-1 flex-col gap-1.5">
                  {drawerSlots?.map((d) => {
                    const drawerText = `Drawer ${d.drawer}`
                    const drawerClass =
                      d.count > 0
                        ? "drawer-occupied"
                        : "bg-white dark:bg-card border-gray-200 dark:border-white/10 text-gray-300 dark:text-zinc-600"

                    return (
                      <div
                        key={d.drawer}
                        className={`drawer-box locator-tile flex min-h-0 flex-1 cursor-pointer items-center justify-center rounded-brand border transition-all ${drawerClass} ${ d.isTarget ? "drawer-located" : "" }`}
                        onClick={(e) => {
                          e.stopPropagation()
                          onDrawerClick?.(d.drawer)
                        }}
                      >
                        <span
                          className={`text-[10px] font-bold ${ d.isTarget ? "text-pup-maroon dark:text-primary" : "text-gray-900" } dark:text-primary`}
                        >
                          {drawerText}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            ) : (
              <div className="absolute inset-x-0 bottom-1.5 px-1 text-center text-[10px] font-bold text-gray-600 dark:text-zinc-300">
                {c.occupiedCount} Records
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}


