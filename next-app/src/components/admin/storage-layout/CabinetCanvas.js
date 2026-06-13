"use client"

import { memo } from "react"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  getCabinetEffectiveSize,
  toPct,
  SNAP_STEP_X,
  SNAP_STEP_Y,
} from "@/lib/storageLayoutUtils"
import { getDefaultDoor } from "@/lib/storageLayoutDefaults"
import { cn } from "@/lib/utils"

const CabinetCanvas = memo(({
  canvasRef,
  activeRoom,
  selectedCabinetIds,
  selectedCabinet,
  collidingIds,
  activePath,
  simulationMode,
  snapToGrid,
  showGrid,
  handleCanvasPointerMove,
  handleCanvasPointerUp,
  setSelectedCabinetIds,
  duplicateSelectedCabinet,
  setBulkConfirmOpen,
  dragRef,
  updateSelectedRectFromNormalized,
  updateSelectedSizeNormalized,
  selectionBox,
  pushHistory,
  layout,
  isModalOpen = false
}) => {
  return (
    <div
      ref={canvasRef}
      data-slot="storage-canvas"
      className={cn(
        "relative w-full overflow-hidden border border-gray-300 dark:border-white/10 bg-[#f8fafc] dark:bg-zinc-600/30 shadow-inner dark:shadow-none transition-all duration-300 rounded-brand",
        isModalOpen ? "h-full" : ""
      )}
      style={!isModalOpen ? { aspectRatio: "16 / 10" } : {}}
      onPointerMove={handleCanvasPointerMove}
      onPointerUp={handleCanvasPointerUp}
      onPointerCancel={handleCanvasPointerUp}
      onPointerDown={(e) => {
        // Deselect if clicking the background
        if (e.target === e.currentTarget) {
          setSelectedCabinetIds(new Set())

          const container = e.currentTarget
          if (!container) return

          const box = container.getBoundingClientRect()
          const relX = (e.clientX - box.left) / Math.max(1, box.width)
          const relY = (e.clientY - box.top) / Math.max(1, box.height)

          dragRef.current = {
            pointerId: e.pointerId,
            mode: "marquee",
            startX: relX,
            startY: relY,
          }
          
          try {
            e.currentTarget.setPointerCapture(e.pointerId)
          } catch {
            // ignore
          }
        }
      }}
    >
      {/* Blueprint AutoCAD precision grid */}
      {showGrid && (
        <div
          className="pointer-events-none absolute inset-0 text-slate-400/20 dark:text-[#292929]"
          style={{
            backgroundImage: `
              linear-gradient(to right, currentColor 1px, transparent 1px),
              linear-gradient(to bottom, currentColor 1px, transparent 1px)
            `,
            backgroundSize: "2.5% 4%, 2.5% 4%",
          }}
        />
      )}

      {/* Marquee Selection Box */}
      {selectionBox && (
        <div 
          className="pointer-events-none absolute border-2 border-dashed border-cyan-500 bg-cyan-500/10 z-50 ring-1 ring-white/30 rounded-sm"
          style={{
            left: `${Math.min(selectionBox.x1, selectionBox.x2) * 100}%`,
            top: `${Math.min(selectionBox.y1, selectionBox.y2) * 100}%`,
            width: `${Math.abs(selectionBox.x2 - selectionBox.x1) * 100}%`,
            height: `${Math.abs(selectionBox.y2 - selectionBox.y1) * 100}%`,
          }}
        />
      )}

      {/* Path simulation */}
      {activePath && (
        <svg className="pointer-events-none absolute inset-0 h-full w-full opacity-60">
          <polyline
            points={activePath
              .map(([x, y]) => `${(x / 40) * 100},${(y / 25) * 100}`)
              .join(" ")}
            fill="none"
            stroke="cyan"
            strokeWidth="3"
            strokeDasharray="8 4"
            className="animate-[dash_2s_linear_infinite]"
          />
        </svg>
      )}


      {/* Orientation marker (Entrance Block) */}
      <div
        className={cn(
          "group absolute z-20 cursor-move",
          selectedCabinetIds.has("DOOR") ? "ring-2 ring-cyan-500 ring-offset-2 ring-offset-[#f8fafc] dark:ring-offset-zinc-950 rounded-lg" : ""
        )}
        style={{
          left: `${(activeRoom?.door?.x ?? getDefaultDoor().x) * 100}%`,
          top: `${(activeRoom?.door?.y ?? getDefaultDoor().y) * 100}%`,
          width: `${(activeRoom?.door?.w ?? 0.1) * 100}%`,
          height: `${(activeRoom?.door?.h ?? 0.04) * 100}%`,
        }}
        onPointerDown={(e) => {
          e.preventDefault()
          e.stopPropagation()
          pushHistory(layout)
          
          // Select the door when clicked
          setSelectedCabinetIds(new Set(["DOOR"]))

          const container = e.currentTarget.closest('[data-slot="storage-canvas"]')
          const box = container.getBoundingClientRect()
          const relX = (e.clientX - box.left) / Math.max(1, box.width)
          const relY = (e.clientY - box.top) / Math.max(1, box.height)

          dragRef.current = {
            pointerId: e.pointerId,
            mode: "door",
            startX: relX,
            startY: relY,
            initialPositions: [{ 
              id: "DOOR", 
              x: activeRoom?.door?.x ?? 0, 
              y: activeRoom?.door?.y ?? 0 
            }]
          }
          try {
            e.currentTarget.setPointerCapture(e.pointerId)
          } catch {
            // ignore
          }
        }}
      >
        <div 
          className="relative flex h-full w-full items-center justify-center rounded-sm bg-pup-maroon shadow-md transition-all duration-300 dark:bg-[#b94642] dark:shadow-none"
        >
          {/* Inner Text Label - Dynamically Rotated and Flipped */}
          <span className={cn(
            "text-[9px] font-black tracking-widest text-white whitespace-nowrap transition-transform duration-300 flex items-center gap-1",
            activeRoom?.door?.rotation === 0 && "rotate-0",
            activeRoom?.door?.rotation === 180 && "rotate-0", // Opposite flip for bottom
            activeRoom?.door?.rotation === 90 && "-rotate-90", // Opposite flip for right
            activeRoom?.door?.rotation === 270 && "rotate-90"  // Opposite flip for left
          )}>
            <i className="ph-fill ph-door text-xs" />
            ENTRANCE
          </span>
        </div>
      </div>

      {/* Precision Stats Overlay */}
      <div className="pointer-events-none absolute bottom-3 right-3 z-50 flex flex-col items-end gap-1 select-none">
        {selectedCabinet && (
          <div className="animate-in fade-in slide-in-from-right-2 flex flex-col items-end gap-1 rounded-md bg-slate-900/90 p-2.5 font-mono text-[10px] text-white backdrop-blur-sm border border-white/10 shadow-lg">
            <div className="flex items-center gap-2">
              <span className="opacity-60">Pos:</span>
              <span className="font-bold">
                {toPct(selectedCabinet.rect.x)}%,{" "}
                {toPct(selectedCabinet.rect.y)}%
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="opacity-60">Dim:</span>
              <span className="font-bold">
                {toPct(selectedCabinet.rect.w)}% x{" "}
                {toPct(selectedCabinet.rect.h)}%
              </span>
            </div>
          </div>
        )}
        <div className="rounded bg-slate-800/40 px-2 py-1 font-mono text-[9px] text-slate-200 tracking-tighter">
          GRID: {toPct(SNAP_STEP_X)}% x {toPct(SNAP_STEP_Y)}%
        </div>
      </div>

      {activeRoom?.cabinets?.map((cab) => {
        const isSelected = selectedCabinetIds.has(cab.id)
        const isConflict = collidingIds.has(cab.id)
        const rot = Number(cab.rotation) === 90 ? 90 : 0
        const eff = getCabinetEffectiveSize(cab)

        return (
          <CabinetElement
            key={cab.id}
            cab={cab}
            isSelected={isSelected}
            isConflict={isConflict}
            eff={eff}
            rot={rot}
            selectedCabinetIds={selectedCabinetIds}
            setSelectedCabinetIds={setSelectedCabinetIds}
            duplicateSelectedCabinet={duplicateSelectedCabinet}
            setBulkConfirmOpen={setBulkConfirmOpen}
            activeRoom={activeRoom}
            canvasRef={canvasRef}
            dragRef={dragRef}
            pushHistory={pushHistory}
            layout={layout}
          />
        )
      })}
    </div>
  )
})

const CabinetElement = memo(({
  cab,
  isSelected,
  isConflict,
  eff,
  rot,
  selectedCabinetIds,
  setSelectedCabinetIds,
  duplicateSelectedCabinet,
  setBulkConfirmOpen,
  activeRoom,
  canvasRef,
  dragRef,
  pushHistory,
  layout
}) => {
  const drawerCount = (cab.drawerIds || []).length || 1

  return (
    <div
      className={cn(
        "absolute border-2 rounded-md overflow-hidden transition-colors duration-200 cursor-move group/cab shadow-sm hover:shadow-md",
        isSelected 
          ? "z-10 border-cyan-500 bg-cyan-50 shadow-[0_0_0_4px_rgba(6,182,212,0.15)] dark:border-cyan-400 dark:bg-cyan-950 dark:shadow-[0_0_0_4px_rgba(34,211,238,0.15)]" 
          : isConflict 
            ? "border-red-600 bg-red-50 shadow-[0_0_0_4px_rgba(220,38,38,0.15)] dark:border-red-500 dark:bg-red-950 dark:shadow-[0_0_0_4px_rgba(239,68,68,0.15)]" 
            : "border-gray-400 bg-gray-100 dark:border-zinc-500 dark:bg-[#949494]"
      )}
      style={{
        left: `${cab.rect.x * 100}%`,
        top: `${cab.rect.y * 100}%`,
        width: `${eff.w * 100}%`,
        height: `${eff.h * 100}%`,
        userSelect: "none",
      }}
      onPointerDown={(e) => {
        const container = e.currentTarget.closest('[data-slot="storage-canvas"]')
        if (!container) return

        e.preventDefault()
        e.stopPropagation()

        pushHistory(layout)

        const isMulti = e.ctrlKey || e.metaKey
        let next = new Set(selectedCabinetIds)
        if (isMulti) {
          if (next.has(cab.id)) next.delete(cab.id)
          else next.add(cab.id)
        } else {
          if (!next.has(cab.id)) {
            next = new Set([cab.id])
          }
        }
        setSelectedCabinetIds(next)

        const box = container.getBoundingClientRect()
        const relX =
          (e.clientX - box.left) / Math.max(1, box.width)
        const relY =
          (e.clientY - box.top) / Math.max(1, box.height)

        dragRef.current = {
          pointerId: e.pointerId,
          mode: "move",
          startX: relX,
          startY: relY,
          initialPositions: activeRoom.cabinets
            .filter((c) => next.has(c.id))
            .map((c) => ({
              id: c.id,
              x: c.rect.x,
              y: c.rect.y,
              eff: getCabinetEffectiveSize(c),
            })),
        }

        try {
          e.currentTarget.setPointerCapture(e.pointerId)
        } catch {
          // ignore
        }
      }}
      title={`Cabinet ${cab.id}`}
    >
      {/* Physical Drawer Divisions & Handle Notches (Skeuomorphic-lite) */}
      <div className="absolute inset-0 flex flex-col pointer-events-none">
        {Array.from({ length: drawerCount }).map((_, idx) => (
          <div
            key={idx}
            className={cn(
              "flex-1 flex items-center justify-center border-b last:border-b-0 border-gray-300/40 dark:border-zinc-700/40",
              isSelected && "border-cyan-300/30 dark:border-cyan-700/30",
              isConflict && "border-red-300/30 dark:border-red-800/30"
            )}
          >
            {/* Skeuomorphic Pull Handle */}
            <div
              className={cn(
                "w-7 h-1.5 rounded-sm bg-gray-300 dark:bg-[#737373] border border-black/10 dark:border-white/10 shadow-[inset_0_1px_1px_rgba(0,0,0,0.15)] group-hover/cab:scale-x-110 transition-transform duration-200",
                isSelected && "bg-cyan-400 dark:bg-cyan-800 border-cyan-500/20",
                isConflict && "bg-red-400 dark:bg-red-800 border-red-500/20"
              )}
            />
          </div>
        ))}
      </div>

      {/* Bounding Frame Details */}
      <div className="absolute inset-0 border border-white/20 pointer-events-none rounded-[3px]" />
      <div className="absolute inset-[1px] border border-black/5 pointer-events-none rounded-[3px]" />

      {/* Floating Cabinet ID Badge Overlay */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-10">
        <div className={cn(
          "px-2 py-0.5 rounded-md font-mono text-[9px] font-black tracking-tighter shadow-sm border border-black/5 dark:border-white/5",
          isSelected
            ? "bg-cyan-500 text-white dark:bg-cyan-400 dark:text-zinc-950"
            : isConflict
              ? "bg-red-600 text-white dark:bg-red-500 dark:text-white"
              : "bg-gray-100/90 text-gray-800 dark:bg-zinc-800/90 dark:text-zinc-200"
        )}>
          {cab.id}
        </div>
      </div>

      {isSelected && selectedCabinetIds.size === 1 && (
        <div
          className={cn(
            "animate-scale-in absolute left-1/2 z-50 -translate-x-1/2",
            cab.rect.y < 0.12 ? "top-full mt-2" : "bottom-full mb-2"
          )}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <div className="flex items-center gap-1 rounded-full border border-gray-200 bg-white p-1 shadow-xl dark:border-white/10 dark:bg-card dark:shadow-none">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-full text-gray-700 hover:bg-gray-100 hover:text-pup-maroon dark:hover:text-red-500 dark:text-zinc-200 dark:bg-muted dark:hover:bg-white/10"
                  onClick={duplicateSelectedCabinet}
                >
                  <i className="ph-bold ph-copy text-sm" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">
                Duplicate
              </TooltipContent>
            </Tooltip>

            <div className="h-4 w-px bg-gray-200 dark:bg-zinc-700" />

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-full text-gray-700 hover:bg-gray-100 hover:text-red-600 dark:text-zinc-200 dark:bg-muted dark:hover:bg-white/10"
                  onClick={() => setBulkConfirmOpen(true)}
                >
                  <i className="ph-bold ph-trash text-sm" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">Delete</TooltipContent>
            </Tooltip>
          </div>
        </div>
      )}
    </div>
  )
})

CabinetCanvas.displayName = "CabinetCanvas"
CabinetElement.displayName = "CabinetElement"

export default CabinetCanvas

