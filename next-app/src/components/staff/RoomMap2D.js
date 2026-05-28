"use client"

import { useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"

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
  const containerRef = useRef(null)
  const [modalPosition, setModalPosition] = useState("right")

  const lastChangeTimeRef = useRef(0)

  // Dynamically position modal opposite of the clicked cabinet on selection
  useEffect(() => {
    if (!selectedCabinetId) return
    const selectedCab = cabinetRects.find((c) => c.cab === selectedCabinetId)
    if (selectedCab) {
      const rect = getEffectiveRect(selectedCab)
      setModalPosition(rect.x < 0.5 ? "right" : "left")
      lastChangeTimeRef.current = Date.now() // Reset cooldown on select
    }
  }, [selectedCabinetId, cabinetRects])

  const checkPositionAndShift = (clientX, clientY) => {
    if (!containerRef.current || kind !== "drawers" || !selectedCabinetId) return

    // 1-second cooldown check to prevent rapid toggling
    const now = Date.now()
    if (now - lastChangeTimeRef.current < 1000) return

    const rect = containerRef.current.getBoundingClientRect()
    const x = (clientX - rect.left) / rect.width

    // Determine the mouse side: "left" or "right"
    const mouseSide = x < 0.5 ? "left" : "right"

    // If mouse is on the same side as the modal, trigger movement to opposite side
    if (mouseSide === modalPosition) {
      setModalPosition(modalPosition === "right" ? "left" : "right")
      lastChangeTimeRef.current = now
    }
  }

  const getEffectiveRect = (c) => {
    const rot = Number(c?.rotation) === 90 ? 90 : 0
    if (rot !== 90) return c.rect
    return { ...c.rect, w: c.rect.h, h: c.rect.w }
  }

  const positionClasses = {
    right: "top-4 right-4",
    left: "top-4 left-4",
  }

  return (
    <div
      ref={containerRef}
      onMouseMove={(e) => checkPositionAndShift(e.clientX, e.clientY)}
      onClick={(e) => checkPositionAndShift(e.clientX, e.clientY)}
      className="relative h-full w-full overflow-hidden rounded-brand border border-gray-300 dark:border-white/10 bg-[#f8fafc] dark:bg-zinc-800 shadow-inner dark:shadow-none transition-all duration-300"
    >
      {/* AutoCAD-inspired precision grid */}
      <div
        className="pointer-events-none absolute inset-0 text-slate-400/20 dark:text-zinc-600/30"
        style={{
          backgroundImage: `
            linear-gradient(to right, currentColor 1px, transparent 1px),
            linear-gradient(to bottom, currentColor 1px, transparent 1px)
          `,
          backgroundSize: "2.5% 4%, 2.5% 4%",
        }}
      />

      {/* Orientation marker (Entrance Door Block) exactly styled like CabinetCanvas */}
      <div
        className="absolute z-20"
        style={{
          left: `${(roomDoor?.x ?? 0.05) * 100}%`,
          top: `${(roomDoor?.y ?? 0.96) * 100}%`,
          width: `${(roomDoor?.w ?? 0.1) * 100}%`,
          height: `${(roomDoor?.h ?? 0.04) * 100}%`,
        }}
      >
        <div className="relative flex h-full w-full items-center justify-center rounded-sm bg-pup-maroon shadow-md dark:bg-red-600 dark:shadow-none">
          <span className="text-[9px] font-black tracking-widest text-white whitespace-nowrap uppercase">
            ENTRANCE
          </span>
        </div>
      </div>

      {cabinetRects.map((c) => {
        const isSelected = kind === "drawers" && c.cab === selectedCabinetId
        const isTarget = Boolean(c.isTarget)
        const rect = getEffectiveRect(c)

        return (
          <div
            key={c.cab}
            className={cn(
              "absolute border-2 transition-all duration-300 rounded-sm shadow-xs cursor-pointer overflow-hidden",
              isTarget
                ? "border-red-600 bg-red-100 shadow-[0_0_0_4px_rgba(220,38,38,0.2)] dark:border-red-500 dark:bg-red-950/40 dark:shadow-[0_0_0_4px_rgba(239,68,68,0.2)]"
                : isSelected
                  ? "z-10 border-cyan-500 bg-cyan-50 shadow-[0_0_0_4px_rgba(6,182,212,0.2)] dark:border-cyan-300 dark:bg-cyan-950/40"
                  : "border-gray-500 bg-gray-100 hover:bg-gray-200 dark:border-zinc-500 dark:bg-zinc-700 dark:hover:bg-zinc-600"
            )}
            style={{
              left: `${rect.x * 100}%`,
              top: `${rect.y * 100}%`,
              width: `${rect.w * 100}%`,
              height: `${rect.h * 100}%`,
            }}
            onClick={() => {
              onCabinetClick?.(c.cab)
            }}
          >
            {/* Precision Frame Overlay (Simulated Depth) */}
            <div className="absolute inset-0 border border-white/20 pointer-events-none rounded-[1px]" />
            <div className="absolute inset-[1px] border border-black/5 pointer-events-none rounded-[1px]" />

            {/* Cabinet Label always rendered cleanly inside */}
            <div className="absolute inset-0 flex flex-col items-center justify-center p-2 pointer-events-none select-none">
              <span className={cn(
                "text-[10px] font-black uppercase tracking-tighter",
                isTarget
                  ? "text-red-800 dark:text-red-400"
                  : isSelected
                    ? "text-cyan-800 dark:text-cyan-400"
                    : "text-gray-700 dark:text-zinc-300"
              )}>
                {String(c.cab).startsWith("CAB") ? c.cab : `CAB-${c.cab}`}
              </span>
              <span className="text-[8px] font-bold text-gray-500 dark:text-zinc-400 mt-0.5">
                {c.occupiedCount} Recs
              </span>
            </div>
          </div>
        )
      })}

      {/* Floating Drawer Details Overlay Panel inside the Preview container */}
      {kind === "drawers" && selectedCabinetId && (
        <div
          onClick={(e) => e.stopPropagation()}
          className={cn(
            "absolute z-30 w-64 rounded-xl border border-gray-200/80 bg-white/95 p-4 shadow-xl backdrop-blur-md dark:border-white/10 dark:bg-zinc-900/95 animate-in fade-in duration-300 transition-all",
            positionClasses[modalPosition] || "top-4 right-4"
          )}
        >
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <i className="ph-fill ph-archive-box text-pup-maroon dark:text-primary text-base"></i>
              <h5 className="font-black text-xs text-gray-900 dark:text-zinc-50 uppercase tracking-tight">
                {String(selectedCabinetId).startsWith("CAB") ? selectedCabinetId : `CABINET ${selectedCabinetId}`}
              </h5>
            </div>
            {/* Clean close/back button that toggles cabinet selection back to null */}
            <button
              onClick={(e) => {
                e.stopPropagation()
                onCabinetClick?.(null)
              }}
              className="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-white/10 dark:hover:text-zinc-200 transition-colors"
              title="Back to Cabinets"
            >
              <i className="ph-bold ph-x text-sm"></i>
            </button>
          </div>

          <div className="space-y-2">
            <span className="text-[9px] font-black tracking-widest text-gray-400 uppercase dark:text-zinc-500">
              Drawer Slots
            </span>
            <div className="flex flex-col gap-1.5 max-h-[300px] overflow-y-auto pr-1">
              {drawerSlots?.map((d) => {
                const isDrawerTarget = d.isTarget
                const hasOccupants = d.count > 0

                return (
                  <div
                    key={d.drawer}
                    className={cn(
                      "flex items-center justify-between rounded-lg border-2 p-2 cursor-pointer transition-all active:scale-[0.98]",
                      isDrawerTarget
                        ? "border-red-500 bg-red-50 hover:bg-red-100 text-red-900 dark:border-red-400 dark:bg-red-950/20 dark:text-red-300"
                        : hasOccupants
                          ? "border-cyan-500 bg-cyan-50 hover:bg-cyan-100 text-cyan-900 dark:border-cyan-500 dark:bg-cyan-950/20 dark:text-cyan-300"
                          : "border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-500 dark:border-zinc-800 dark:bg-zinc-800/50 dark:text-zinc-400 dark:hover:bg-zinc-800"
                    )}
                    onClick={(e) => {
                      e.stopPropagation()
                      onDrawerClick?.(d.drawer)
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <i className={cn(
                        "ph-bold text-sm",
                        isDrawerTarget
                          ? "ph-map-pin"
                          : hasOccupants
                            ? "ph-folder-open"
                            : "ph-folder"
                      )}></i>
                      <span className="text-[11px] font-bold">
                        Drawer {d.drawer}
                      </span>
                    </div>
                    <span className="text-[9px] font-black uppercase tracking-wider">
                      {isDrawerTarget ? "TARGET" : hasOccupants ? `${d.count} Recs` : "Empty"}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
