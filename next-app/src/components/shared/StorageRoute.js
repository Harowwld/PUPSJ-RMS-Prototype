"use client"

import { useAppReducedMotion } from "@/lib/motion"
import { cn } from "@/lib/utils"

const ROUTE_STAGGER_MS = 600

export default function StorageRoute({ routePoints, color }) {
  const reduceMotion = useAppReducedMotion()

  if (!routePoints?.length) return null

  return (
    <div
      key={routePoints.join(";")}
      data-slot="storage-route"
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-10"
    >
      {routePoints.map(([x, y], index) => {
        const isDestination = index === routePoints.length - 1
        const delay = index / (routePoints.length - 1) * ROUTE_STAGGER_MS
        return (
          <span
            key={index}
            className="absolute -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${x}%`, top: `${y}%` }}
          >
            <span
              className={cn(
                "block rounded-full bg-blue-500 dark:bg-blue-400",
                isDestination ? "size-2 ring-2 ring-background" : "size-1 opacity-75",
                !reduceMotion && "storage-route-pulse"
              )}
              style={{ backgroundColor: color, animationDelay: `${delay}ms` }}
            />
          </span>
        )
      })}
    </div>
  )
}
