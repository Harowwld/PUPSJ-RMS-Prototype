"use client"

import { memo } from "react"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  getCabinetEffectiveSize,
  toPct,
  SNAP_STEP,
} from "@/lib/storageLayoutUtils"
import { getDefaultDoor } from "@/lib/storageLayoutDefaults"

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
  rotateSelectedCabinet,
  duplicateSelectedCabinet,
  setBulkConfirmOpen,
  dragRef,
  updateSelectedRectFromNormalized,
  updateSelectedSizeNormalized
}) => {
  return (
    <div
      ref={canvasRef}
      className="relative w-full overflow-hidden border border-gray-300 bg-[#f8fafc] shadow-inner"
      style={{ aspectRatio: "16 / 10" }}
      onPointerMove={handleCanvasPointerMove}
      onPointerUp={handleCanvasPointerUp}
      onPointerCancel={handleCanvasPointerUp}
      onPointerDown={(e) => {
        // Deselect if clicking the background
        if (e.target === e.currentTarget) {
          setSelectedCabinetIds(new Set())
        }
      }}
    >
      {/* AutoCAD-inspired precision grid */}
      {showGrid && (
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage: `
              linear-gradient(to right, rgba(148, 163, 184, 0.1) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(148, 163, 184, 0.1) 1px, transparent 1px),
              linear-gradient(to right, rgba(148, 163, 184, 0.3) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(148, 163, 184, 0.3) 1px, transparent 1px)
            `,
            backgroundSize: "2% 2%, 2% 2%, 10% 10%, 10% 10%",
          }}
        />
      )}

      {/* Path simulation */}
      {activePath && (
        <svg className="pointer-events-none absolute inset-0 h-full w-full opacity-60">
          <polyline
            points={activePath
              .map(([x, y]) => `${(x / 50) * 100},${(y / 50) * 100}`)
              .join(" ")}
            fill="none"
            stroke="cyan"
            strokeWidth="3"
            strokeDasharray="8 4"
            className="animate-[dash_2s_linear_infinite]"
          />
        </svg>
      )}

      {/* Orientation marker (Door Symbol) */}
      <div
        className="group absolute z-2 cursor-move"
        style={{
          left: `${(activeRoom?.door?.x ?? getDefaultDoor().x) * 100}%`,
          top: `${(activeRoom?.door?.y ?? getDefaultDoor().y) * 100}%`,
          transform: "translate(-50%, -50%)",
        }}
        onPointerDown={(e) => {
          e.preventDefault()
          e.stopPropagation()
          dragRef.current = {
            pointerId: e.pointerId,
            mode: "door",
          }
          try {
            e.currentTarget.setPointerCapture(e.pointerId)
          } catch {
            // ignore
          }
        }}
      >
        <div className="relative flex h-12 w-12 items-center justify-center">
          <div className="absolute bottom-0 left-0 h-full w-[3px] bg-pup-maroon" />
          <div className="absolute bottom-0 left-0 h-[3px] w-full bg-slate-400 group-hover:bg-slate-600" />
          <div className="absolute inset-0 rounded-tr-full border-t-2 border-r-2 border-pup-maroon/30 group-hover:border-pup-maroon/60" />

          <div className="pointer-events-none absolute -top-8 left-1/2 z-10 -translate-x-1/2 rounded bg-slate-900 px-2 py-1 text-[10px] font-black tracking-widest whitespace-nowrap text-white uppercase opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
            ENTRANCE
          </div>
        </div>
      </div>

      {/* Precision Stats Overlay */}
      <div className="pointer-events-none absolute bottom-3 right-3 z-50 flex flex-col items-end gap-1">
        {selectedCabinet && (
          <div className="animate-in fade-in slide-in-from-right-2 flex flex-col items-end gap-1 rounded bg-slate-900/80 p-2 font-mono text-[10px] text-white backdrop-blur-sm">
            <div className="flex items-center gap-2">
              <span className="opacity-60 uppercase">Pos:</span>
              <span>
                {toPct(selectedCabinet.rect.x)}%,{" "}
                {toPct(selectedCabinet.rect.y)}%
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="opacity-60 uppercase">Dim:</span>
              <span>
                {toPct(selectedCabinet.rect.w)}% x{" "}
                {toPct(selectedCabinet.rect.h)}%
              </span>
            </div>
          </div>
        )}
        <div className="rounded bg-slate-800/40 px-2 py-1 font-mono text-[9px] text-slate-200">
          GRID: {toPct(SNAP_STEP)}%
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
            rotateSelectedCabinet={rotateSelectedCabinet}
            duplicateSelectedCabinet={duplicateSelectedCabinet}
            setBulkConfirmOpen={setBulkConfirmOpen}
            activeRoom={activeRoom}
            canvasRef={canvasRef}
            dragRef={dragRef}
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
  rotateSelectedCabinet,
  duplicateSelectedCabinet,
  setBulkConfirmOpen,
  activeRoom,
  canvasRef,
  dragRef
}) => {
  return (
    <div
      className={`absolute border-2 transition-all duration-75 ${
        isSelected
          ? "z-10 border-cyan-500 bg-cyan-50/20 shadow-[0_0_0_4px_rgba(6,182,212,0.2)]"
          : isConflict
            ? "z-10 border-red-600 bg-red-50/50 shadow-[0_0_0_4px_rgba(220,38,38,0.2)]"
            : "border-slate-800 bg-white"
      }`}
      style={{
        left: `${cab.rect.x * 100}%`,
        top: `${cab.rect.y * 100}%`,
        width: `${eff.w * 100}%`,
        height: `${eff.h * 100}%`,
        userSelect: "none",
      }}
      onPointerDown={(e) => {
        if (!canvasRef.current) return
        e.preventDefault()
        e.stopPropagation()

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

        const box = canvasRef.current.getBoundingClientRect()
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
      {isSelected && selectedCabinetIds.size === 1 && (
        <div
          className="animate-scale-in absolute bottom-full left-1/2 z-50 mb-2 -translate-x-1/2"
          onPointerDown={(e) => e.stopPropagation()}
        >
          <div className="flex items-center gap-1 rounded-full border border-gray-200 bg-white p-1 shadow-xl">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-full text-gray-700 hover:bg-gray-100 hover:text-pup-maroon"
                  onClick={rotateSelectedCabinet}
                >
                  <i className="ph-bold ph-arrow-clockwise text-sm" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">Rotate</TooltipContent>
            </Tooltip>

            <div className="h-4 w-px bg-gray-200" />

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-full text-gray-700 hover:bg-gray-100 hover:text-pup-maroon"
                  onClick={duplicateSelectedCabinet}
                >
                  <i className="ph-bold ph-copy text-sm" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">
                Duplicate
              </TooltipContent>
            </Tooltip>

            <div className="h-4 w-px bg-gray-200" />

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-full text-gray-700 hover:bg-gray-100 hover:text-red-600"
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
      {eff.w >= 0.12 && eff.h >= 0.14 ? (
        <>
          <div className="absolute top-2 left-2 text-[10px] font-extrabold text-gray-600">
            CAB-{cab.id}
          </div>
          <div className="absolute top-2 right-2 text-[10px] font-extrabold text-gray-500">
            {rot === 90 ? "V" : "H"}
          </div>
          <div className="absolute right-2 bottom-2 left-2 text-[10px] font-bold text-gray-500">
            {cab.drawerIds.length} drawers
          </div>
        </>
      ) : (
        <div className="absolute inset-0 flex items-center justify-center text-[10px] font-black text-gray-700">
          CAB-{cab.id}
        </div>
      )}
      {isSelected ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              role="button"
              tabIndex={0}
              className="absolute -right-1.5 -bottom-1.5 flex h-5 w-5 cursor-se-resize items-center justify-center rounded-sm border border-pup-maroon bg-white leading-none text-pup-maroon shadow"
              onPointerDown={(e) => {
                if (!canvasRef.current) return
                e.preventDefault()
                e.stopPropagation()
                setSelectedCabinetIds(new Set([cab.id]))
                dragRef.current = {
                  pointerId: e.pointerId,
                  mode: "resize",
                }
                try {
                  e.currentTarget.setPointerCapture(e.pointerId)
                } catch {
                  // ignore
                }
              }}
            >
              <i className="ph-bold ph-corners-out text-[11px]" />
            </div>
          </TooltipTrigger>
          <TooltipContent side="right">
            Resize Cabinet
          </TooltipContent>
        </Tooltip>
      ) : null}
    </div>
  )
})

CabinetCanvas.displayName = "CabinetCanvas"
CabinetElement.displayName = "CabinetElement"

export default CabinetCanvas
