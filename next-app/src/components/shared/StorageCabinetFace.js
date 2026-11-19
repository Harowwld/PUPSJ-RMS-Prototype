import { cn } from "@/lib/utils"
import { getWayfindingCabinetRect } from "@/lib/storageWayfinding"

export const cabinetSurfaceClass = "rounded-lg border-2 border-border bg-white shadow-xs dark:bg-zinc-800"
export const selectedCabinetSurfaceClass = "border-blue-500/70 bg-blue-50 dark:border-blue-400/70 dark:bg-blue-950/40"

const labelPositions = {
  top: "absolute bottom-full left-1/2 -translate-x-1/2 mb-0.5 z-30",
  bottom: "absolute top-full left-1/2 -translate-x-1/2 mt-0.5 z-30",
  left: "absolute right-full top-1/2 -translate-y-1/2 mr-0.5 z-30",
  right: "absolute left-full top-1/2 -translate-y-1/2 ml-0.5 z-30",
  center: "absolute inset-0 flex items-center justify-center z-30",
}

function getLabelPosition(cabinet, cabinets) {
  const { x, y, w, h } = getWayfindingCabinetRect(cabinet)
  const width = 0.12
  const height = 0.035
  const middleX = x + (w - width) / 2
  const middleY = y + (h - height) / 2
  const candidates = [
    ["top", middleX, y - height],
    ["bottom", middleX, y + h],
    ["right", x + w, middleY],
    ["left", x - width, middleY],
  ]
  const obstacles = cabinets.filter((other) => other !== cabinet).map(getWayfindingCabinetRect)

  return candidates.find(([, left, top]) => {
    if (left < 0.002 || top < 0.002 || left + width > 0.998 || top + height > 0.998) return false
    return !obstacles.some((other) =>
      left < other.x + other.w - 0.001 && left + width > other.x + 0.001 &&
      top < other.y + other.h - 0.001 && top + height > other.y + 0.001
    )
  })?.[0] ?? "center"
}

export default function StorageCabinetFace({
  cabinet,
  cabinets,
  label,
  selected = false,
  conflict = false,
  targetDrawer,
  theme,
  showLabel = true,
}) {
  return (
    <>
      <div className="pointer-events-none absolute inset-0 flex flex-col overflow-hidden rounded-md">
        {(cabinet.drawerIds ?? []).map((drawerId) => {
          const highlighted = theme && targetDrawer != null && String(drawerId) === String(targetDrawer)
          const drawerLabel = String(drawerId).toLowerCase().startsWith("drawer") ? drawerId : `Drawer ${drawerId}`
          return (
            <div
              key={drawerId}
              className={cn(
                "flex min-h-0 flex-1 items-center justify-center overflow-hidden border-b border-border/40 last:border-b-0",
                selected && "border-blue-300/40 dark:border-blue-700/40",
                conflict && "border-red-300/40 dark:border-red-700/40"
              )}
              style={highlighted ? { backgroundColor: theme.frontStart, borderBottomColor: theme.frontEnd } : undefined}
            >
              {highlighted ? (
                <span
                  className="max-w-full truncate rounded-sm px-1 text-[10px] font-semibold leading-tight"
                  style={{
                    backgroundColor: `color-mix(in srgb, ${theme.frontStart} 25%, white)`,
                    color: `color-mix(in srgb, ${theme.frontEnd} 35%, #18181b)`,
                  }}
                >
                  {drawerLabel}
                </span>
              ) : <span className="h-1.5 w-7 max-w-1/2 rounded-full bg-foreground/15" />}
            </div>
          )
        })}
      </div>
      {showLabel && (
        <div className={cn(labelPositions[getLabelPosition(cabinet, cabinets)], "pointer-events-none select-none")}>
          <span
            title={label}
            className={cn(
              "block w-fit max-w-[12cqw] truncate rounded-lg border px-2 py-0.5 text-[11px] font-semibold shadow-xs",
              theme ? "text-zinc-900" : selected
                ? "border-blue-100 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-300"
                : conflict
                  ? "border-red-100 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
                  : "border-border bg-background text-foreground"
            )}
            style={theme ? {
              backgroundColor: `color-mix(in srgb, ${theme.frontStart} 35%, white)`,
              borderColor: theme.frontEnd,
            } : undefined}
          >
            {label}
          </span>
        </div>
      )}
    </>
  )
}
