"use client"
import { useMemo } from "react"
import StorageCabinetFace, { cabinetSurfaceClass, selectedCabinetSurfaceClass } from "@/components/shared/StorageCabinetFace"
import StorageRoute from "@/components/shared/StorageRoute"
import { getStorageRoute, getWayfindingCabinetRect } from "@/lib/storageWayfinding"
import { cn } from "@/lib/utils"
import { FOLDER_COLORS } from "@/lib/constants"
import { Door01Icon } from "hugeicons-react";

export default function RoomMap2D({
  kind, // "cabinets" | "drawers"
  activeStudent,
  activeStudentColor = "yellow",
  cabinets,
  roomDoor,
  selectedCabinetId,
  drawerSlots,
  onCabinetClick,
  isPreview = false,
}) {
  const theme = FOLDER_COLORS[activeStudentColor] || FOLDER_COLORS["yellow"]
  const cabinetRects = useMemo(() => cabinets || [], [cabinets])
  const targetDrawer = drawerSlots?.find((slot) => slot.isTarget)?.drawer
  const routePoints = useMemo(() => {
    if (isPreview || !selectedCabinetId || kind !== "drawers" || (activeStudent && targetDrawer == null)) return []
    const selected = cabinetRects.find((cabinet) => String(cabinet.cab) === String(selectedCabinetId))
    return getStorageRoute(cabinetRects, selected, roomDoor)
  }, [selectedCabinetId, cabinetRects, roomDoor, kind, isPreview, activeStudent, targetDrawer])

  return (
    <div
      className="relative h-full w-full overflow-hidden rounded-xl border border-border/80 bg-zinc-50 dark:bg-zinc-900"
      style={{ containerType: "inline-size" }}
    >
      {!isPreview && (
      <div className="pointer-events-none absolute inset-0 text-zinc-900/[0.06] dark:text-white/[0.06]" style={{ backgroundImage: `linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)`, backgroundSize: "2.5% 4%, 2.5% 4%" }} />
      )}

      {routePoints.length > 0 && <StorageRoute routePoints={routePoints} color={activeStudent ? theme.frontEnd : undefined} />}

      {/* Entrance marker */}
      <div
        className="absolute z-20"
        style={{
          left: `${(roomDoor?.x ?? 0.05) * 100}%`,
          top: `${(roomDoor?.y ?? 0.96) * 100}%`,
          width: `${(roomDoor?.w ?? 0.1) * 100}%`,
          height: `${(roomDoor?.h ?? 0.04) * 100}%`,
        }}
      >
        <div className="relative flex h-full w-full items-center justify-center rounded-sm bg-zinc-700 dark:bg-zinc-300">
          <span className={cn(
            "text-[9px] font-semibold tracking-wide text-white dark:text-zinc-900 whitespace-nowrap flex items-center gap-1",
            roomDoor?.rotation === 0 && "rotate-0",
            roomDoor?.rotation === 180 && "rotate-0", 
            roomDoor?.rotation === 90 && "-rotate-90", 
            roomDoor?.rotation === 270 && "rotate-90"  
          )}>
            <Door01Icon size="1em"  className="text-xs" />
            ENTRANCE
          </span>
        </div>
      </div>

      {cabinetRects.map((c) => {
        const hasActiveTarget = cabinetRects.some((cab) => cab.isTarget)
        const isSelected = kind === "drawers" && String(c.cab) === String(selectedCabinetId)
        const isTarget = Boolean(c.isTarget)
        const rect = getWayfindingCabinetRect(c)
        const isClickable = !hasActiveTarget || isTarget

        return (
          <div
            key={c.cab}
            className={cn(
              "absolute transition-colors duration-normal group/cab",
              cabinetSurfaceClass,
              isClickable ? "cursor-pointer hover:bg-muted" : "opacity-30 pointer-events-none select-none",
              (isTarget || isSelected) && "z-10",
              isSelected && !isTarget && selectedCabinetSurfaceClass
            )}
            style={{
              left: `${rect.x * 100}%`,
              top: `${rect.y * 100}%`,
              width: `calc(${rect.w * 100}% + 1px)`,
              height: `calc(${rect.h * 100}% + 1px)`,
              ...(isTarget ? { borderColor: theme.frontStart } : {})
            }}
            onClick={() => {
              if (isClickable) {
                onCabinetClick?.(c.cab)
              }
            }}
            title={`Cabinet ${c.cab}`}
          >
            <StorageCabinetFace
              cabinet={c}
              cabinets={cabinetRects}
              label={c.cab}
              selected={isSelected && !isTarget}
              targetDrawer={isSelected ? targetDrawer : undefined}
              theme={isTarget ? theme : undefined}
              showLabel={!isPreview}
            />
          </div>
        )
      })}
    </div>
  )
}
