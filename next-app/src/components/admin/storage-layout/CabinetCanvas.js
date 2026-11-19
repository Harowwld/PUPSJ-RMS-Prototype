"use client"


import { memo } from "react"
import StorageCabinetFace, { cabinetSurfaceClass, selectedCabinetSurfaceClass } from "@/components/shared/StorageCabinetFace"
import StorageRoute from "@/components/shared/StorageRoute"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  getCabinetEffectiveSize,
} from "@/lib/storageLayoutUtils"
import { getDefaultDoor } from "@/lib/storageLayoutDefaults"
import { cn } from "@/lib/utils"
import { Copy01Icon, Delete01Icon, Door01Icon, PencilEdit01Icon } from "hugeicons-react";

// Precomputed 40 cols x 25 rows AutoCAD blueprint precision grid path
const GRID_PATH_DATA = (() => {
  const parts = []
  for (let x = 1; x < 40; x++) {
    parts.push(`M ${x} 0 V 25`)
  }
  for (let y = 1; y < 25; y++) {
    parts.push(`M 0 ${y} H 40`)
  }
  return parts.join(" ")
})()

const CabinetCanvas = memo(({
  canvasRef,
  activeRoom,
  selectedCabinetIds,
  selectedCabinet,
  collidingIds,
  activePath,
  showGrid,
  gridOpacity = 100,
  is3D = false,
  studentDrawerUsage,
  handleCanvasPointerMove,
  handleCanvasPointerUp,
  setSelectedCabinetIds,
  onOpenRenameCabinet,
  duplicateSelectedCabinet,
  setBulkConfirmOpen,
  dragRef,
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
        "relative w-full overflow-hidden border border-border bg-neutral-50 dark:bg-zinc-800 dark:border-border transition-all duration-normal rounded-2xl",
        isModalOpen ? "h-full" : ""
      )}
      style={{
        ...(!isModalOpen ? { aspectRatio: "16 / 10" } : {}),
        transform: is3D ? "rotateX(35deg) scale(0.95)" : "none",
        transformStyle: is3D ? "preserve-3d" : "flat",
        containerType: "inline-size",
      }}
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
      {/* Blueprint precision grid with subtle uniform lines */}
      {showGrid && (
        <svg
          viewBox="0 0 40 25"
          preserveAspectRatio="none"
          className="pointer-events-none absolute inset-0 h-full w-full"
          style={{ shapeRendering: "crispEdges" }}
        >
          <path
            d={GRID_PATH_DATA}
            fill="none"
            strokeWidth="1"
            vectorEffect="non-scaling-stroke"
            className="stroke-slate-400/15 dark:stroke-slate-400/10 transition-opacity duration-150"
            style={{ stroke: "var(--storage-grid-line, rgba(148, 163, 184, 0.12))", opacity: Math.max(0.08, Math.min(1, gridOpacity / 100)) }}
          />
        </svg>
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

      {activePath?.length > 0 && <StorageRoute routePoints={activePath} />}

      {/* Orientation marker (Entrance Block) */}
      <div
        className={cn(
          "group absolute z-20 cursor-move",
          selectedCabinetIds.has("DOOR") ? "ring-2 ring-cyan-500 ring-offset-2 ring-offset-neutral-50 dark:ring-offset-zinc-950 rounded-lg" : ""
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
          className="relative flex h-full w-full items-center justify-center rounded-sm bg-pup-maroon shadow-md transition-all duration-normal dark:bg-[#b94642] dark:shadow-none"
        >
          {/* Inner Text Label - Dynamically Rotated and Flipped */}
          <span className={cn(
            "text-[9px] font-semibold tracking-widest text-white whitespace-nowrap transition-transform duration-normal flex items-center gap-1",
            activeRoom?.door?.rotation === 0 && "rotate-0",
            activeRoom?.door?.rotation === 180 && "rotate-0", // Opposite flip for bottom
            activeRoom?.door?.rotation === 90 && "-rotate-90", // Opposite flip for right
            activeRoom?.door?.rotation === 270 && "rotate-90"  // Opposite flip for left
          )}>
            <Door01Icon size="1em"  className="text-xs" />
            ENTRANCE
          </span>
        </div>
      </div>

      {activeRoom?.cabinets?.map((cab) => {
        const isSelected = selectedCabinetIds.has(cab.id)
        const isConflict = collidingIds.has(cab.id)
        const eff = getCabinetEffectiveSize(cab)

        return (
          <CabinetElement
            key={cab.id}
            cab={cab}
            isSelected={isSelected}
            isConflict={isConflict}
            eff={eff}
            is3D={is3D}
            studentDrawerUsage={studentDrawerUsage}
            selectedCabinetIds={selectedCabinetIds}
            setSelectedCabinetIds={setSelectedCabinetIds}
            onOpenRenameCabinet={onOpenRenameCabinet}
            duplicateSelectedCabinet={duplicateSelectedCabinet}
            setBulkConfirmOpen={setBulkConfirmOpen}
            activeRoom={activeRoom}
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
  is3D = false,
  studentDrawerUsage,
  selectedCabinetIds,
  setSelectedCabinetIds,
  onOpenRenameCabinet,
  duplicateSelectedCabinet,
  setBulkConfirmOpen,
  activeRoom,
  dragRef,
  pushHistory,
  layout
}) => {

  return (
    <div
      className={cn(
        "absolute transition-colors duration-fast cursor-move group/cab hover:brightness-105",
        cabinetSurfaceClass,
        isSelected ? "z-30" : isConflict ? "z-20" : "z-10",
        isSelected && selectedCabinetSurfaceClass,
        !isSelected && isConflict && "border-red-400 bg-red-50 dark:border-red-500 dark:bg-red-950"
      )}
      style={{
        left: `${cab.rect.x * 100}%`,
        top: `${cab.rect.y * 100}%`,
        width: `calc(${eff.w * 100}% + 1px)`,
        height: `calc(${eff.h * 100}% + 1px)`,
        userSelect: "none",
        transform: is3D ? "translateY(-12px)" : "none",
        boxShadow: is3D
          ? isSelected
            ? "0 1px 0 #06b6d4, 0 2px 0 #06b6d4, 0 3px 0 #06b6d4, 0 4px 0 #06b6d4, 0 5px 0 #06b6d4, 0 6px 0 #06b6d4, 0 7px 0 #06b6d4, 0 8px 0 #06b6d4, 0 9px 0 #06b6d4, 0 10px 0 #06b6d4, 0 11px 0 #06b6d4, 0 12px 0 #06b6d4, 0 16px 20px rgba(0,0,0,0.15)"
            : isConflict
              ? "0 1px 0 #ef4444, 0 2px 0 #ef4444, 0 3px 0 #ef4444, 0 4px 0 #ef4444, 0 5px 0 #ef4444, 0 6px 0 #ef4444, 0 7px 0 #ef4444, 0 8px 0 #ef4444, 0 9px 0 #ef4444, 0 10px 0 #ef4444, 0 11px 0 #ef4444, 0 12px 0 #ef4444, 0 16px 20px rgba(0,0,0,0.15)"
              : "0 1px 0 #e2e8f0, 0 2px 0 #e2e8f0, 0 3px 0 #e2e8f0, 0 4px 0 #e2e8f0, 0 5px 0 #e2e8f0, 0 6px 0 #e2e8f0, 0 7px 0 #e2e8f0, 0 8px 0 #e2e8f0, 0 9px 0 #e2e8f0, 0 10px 0 #e2e8f0, 0 11px 0 #e2e8f0, 0 12px 0 #e2e8f0, 0 16px 20px rgba(0,0,0,0.1)"
          : undefined,
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
      <StorageCabinetFace
        cabinet={cab}
        cabinets={activeRoom.cabinets}
        label={cab.id}
        selected={isSelected}
        conflict={isConflict && !isSelected}
      />

      {isSelected && selectedCabinetIds.size === 1 && (
        <div
          className={cn(
            "animate-scale-in absolute left-1/2 z-50 -translate-x-1/2",
            cab.rect.y < 0.12 ? "top-full mt-2" : "bottom-full mb-2"
          )}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <div className="flex items-center gap-1 rounded-full border border-border bg-white p-1 shadow-xl dark:border-border dark:bg-card dark:shadow-none">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-full text-gray-700 hover:bg-gray-100 hover:text-pup-maroon dark:hover:text-red-500 dark:text-zinc-200 dark:bg-muted dark:hover:bg-white/10 cursor-pointer"
                  onClick={() => onOpenRenameCabinet?.(cab)}
                >
                  <PencilEdit01Icon size="1em" className="text-sm" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">
                Rename
              </TooltipContent>
            </Tooltip>

            <div className="h-4 w-px bg-gray-200 dark:bg-zinc-700" />

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-full text-gray-700 hover:bg-gray-100 hover:text-pup-maroon dark:hover:text-red-500 dark:text-zinc-200 dark:bg-muted dark:hover:bg-white/10 cursor-pointer"
                  onClick={duplicateSelectedCabinet}
                >
                  <Copy01Icon size="1em"  className="text-sm" />
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
                  className="h-8 w-8 rounded-full text-gray-700 hover:bg-gray-100 hover:text-red-600 dark:text-zinc-200 dark:bg-muted dark:hover:bg-white/10 cursor-pointer"
                  onClick={() => setBulkConfirmOpen(true)}
                >
                  <Delete01Icon size="1em"  className="text-sm" />
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
