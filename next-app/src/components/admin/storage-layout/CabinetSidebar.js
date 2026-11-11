"use client"

import React, { memo, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { SegmentedControl } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
import { toPct, fromPct } from "@/lib/storageLayoutUtils"
import { EmptyState } from "@/components/ui/empty"
import { BADGE_BASE } from "@/lib/badgeStyles"
import {
  Cursor01Icon,
  Clock01Icon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
  Add01Icon,
  MinusSignIcon,
} from "hugeicons-react"

const CabinetSidebar = memo(({
  activeRoom,
  carouselIndex = 0,
  setCarouselIndex,
  selectedCabinetIds,
  selectedCabinet,
  onOpenRenameCabinet,
  duplicateSelectedCabinet,
  setBulkConfirmOpen,
  removeDrawerFromSelected,
  addDrawerToSelected,
  updateSelectedRectFromNormalized,
  history = [],
  historyIndex = 0,
  revertToHistoryState,
  studentDrawerUsage,
  canvasControls,
}) => {
  const [activeTab, setActiveTab] = React.useState("canvas")

  useEffect(() => {
    setActiveTab(selectedCabinetIds.size > 0 ? "selection" : "canvas")
  }, [selectedCabinetIds])

  // Calculate total student records stored in this cabinet
  const totalCabinetRecords = useMemo(() => {
    if (!selectedCabinet || selectedCabinet.isDoor || !activeRoom || !studentDrawerUsage) return 0
    let total = 0
    for (const drawerId of selectedCabinet.drawerIds || []) {
      const key = `${activeRoom.id}|${selectedCabinet.id}|${Number(drawerId)}`
      total += Number(studentDrawerUsage.get?.(key) || 0)
    }
    return total
  }, [selectedCabinet, activeRoom, studentDrawerUsage])

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-white dark:bg-card">
      {/* Header */}
      <div className="shrink-0 p-5 border-b border-border dark:border-border">
        <div>
          <h3 className="text-[15px] font-semibold tracking-[-0.01em] text-gray-900 dark:text-zinc-50">
            {activeTab === "canvas"
              ? "Canvas Settings"
              : activeTab === "history"
                ? "Layout History"
                : selectedCabinetIds.size === 0
                  ? "Selection"
                  : selectedCabinetIds.size > 1
                    ? `${selectedCabinetIds.size} cabinets selected`
                    : selectedCabinet?.isDoor
                      ? "Entrance"
                      : selectedCabinet
                        ? `Cabinet ${selectedCabinet.id}`
                        : "Selection"}
          </h3>
          {(activeTab !== "selection" || selectedCabinetIds.size === 0) && (
            <p className="mt-0.5 text-xs font-normal text-gray-500 dark:text-zinc-400">
              {activeTab === "canvas"
                ? "Add cabinets and adjust this room's view."
                : activeTab === "history"
                  ? "Choose a previous step to restore the layout."
                  : "Select a cabinet on the map"}
            </p>
          )}
        </div>
      </div>

      {/* Content Area */}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="shrink-0 px-5 pt-5">
          <SegmentedControl
            value={activeTab}
            onValueChange={setActiveTab}
            variant="capsule"
            className="w-full"
            listClassName="w-full"
            aria-label="Storage editor panel sections"
            items={[
              { value: "canvas", label: "Canvas" },
              { value: "selection", label: "Selection" },
              { value: "history", label: history.length > 0 ? `History (${history.length})` : "History" },
            ]}
          />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-5 scrollbar-thin">
        {activeTab === "canvas" && canvasControls}

        {activeTab === "selection" && (
          !selectedCabinet ? (
            <div className="flex flex-1 flex-col items-center justify-center min-h-[300px] py-12 text-center">
              <EmptyState
                variant="compact"
                icon={Cursor01Icon}
                title="No Cabinet Selected"
                description="Click any cabinet or entrance on the map to view and adjust its properties."
              />
            </div>
          ) : (
            <div className="space-y-4">
                {/* Carousel navigation for multiple selections */}
                {selectedCabinetIds.size > 1 && (
                  <div className="flex h-9 items-center rounded-xl border border-border bg-white dark:border-border dark:bg-zinc-800 overflow-hidden shadow-xs">
                    <button
                      type="button"
                      disabled={carouselIndex <= 0}
                      onClick={() => setCarouselIndex?.(Math.max(0, carouselIndex - 1))}
                      className="px-3 h-full flex items-center justify-center text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-zinc-200 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer border-r border-border dark:border-border"
                    >
                      <ArrowLeft01Icon size="1em" className="text-xs" />
                    </button>

                    <div className="flex-1 text-center text-xs font-medium text-gray-900 dark:text-zinc-50 select-none">
                      {selectedCabinet.isDoor ? "Entrance" : `Cabinet ${selectedCabinet.id}`} ({carouselIndex + 1} of {selectedCabinetIds.size})
                    </div>

                    <button
                      type="button"
                      disabled={carouselIndex >= selectedCabinetIds.size - 1}
                      onClick={() => setCarouselIndex?.(Math.min(selectedCabinetIds.size - 1, carouselIndex + 1))}
                      className="px-3 h-full flex items-center justify-center text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-zinc-200 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer border-l border-border dark:border-border"
                    >
                      <ArrowRight01Icon size="1em" className="text-xs" />
                    </button>
                  </div>
                )}

                {/* Cabinet Quick Actions */}
                {!selectedCabinet.isDoor && (
                  <div className={cn("grid gap-2", selectedCabinetIds.size > 1 ? "grid-cols-2" : "grid-cols-3")}>
                    {selectedCabinetIds.size <= 1 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => onOpenRenameCabinet?.(selectedCabinet)}
                        className="w-full h-9 rounded-xl border border-border dark:border-border bg-white dark:bg-zinc-800 text-xs font-semibold text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-xs cursor-pointer active:scale-95 transition-all"
                      >
                        Rename
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={duplicateSelectedCabinet}
                      className="w-full h-9 rounded-xl border border-border dark:border-border bg-white dark:bg-zinc-800 text-xs font-semibold text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-xs cursor-pointer active:scale-95 transition-all"
                    >
                      Duplicate
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setBulkConfirmOpen(true)}
                      className="w-full h-9 rounded-xl border border-red-200 dark:border-red-900/40 bg-white dark:bg-zinc-800 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 shadow-xs cursor-pointer active:scale-95 transition-all"
                    >
                      Delete
                    </Button>
                  </div>
                )}

                {/* Drawer Count Stepper */}
                {!selectedCabinet.isDoor && (
                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center justify-between text-xs font-medium text-gray-600 dark:text-zinc-400">
                      <span>Drawer Count</span>
                      <span className="text-[11px] text-gray-400 tabular-nums">
                        {(selectedCabinet.drawerIds || []).length} slots
                      </span>
                    </div>
                    <div className="flex items-center h-9 border border-border dark:border-border dark:bg-zinc-800/50 bg-white rounded-xl overflow-hidden shadow-xs">
                      <button
                        type="button"
                        className="h-full px-3.5 text-gray-600 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-zinc-200 border-r border-border dark:border-border bg-transparent hover:bg-gray-50 dark:hover:bg-zinc-700/50 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer flex items-center justify-center select-none"
                        onClick={removeDrawerFromSelected}
                        disabled={(selectedCabinet.drawerIds || []).length <= 1}
                        title="Remove last drawer"
                      >
                        <MinusSignIcon size="1em" className="text-sm" />
                      </button>

                      <div className="flex-1 text-center select-none flex items-center justify-center">
                        <span className="text-xs font-semibold text-gray-900 dark:text-zinc-50">
                          {(selectedCabinet.drawerIds || []).length}
                        </span>
                        <span className="ml-1 text-xs font-normal text-gray-500 dark:text-zinc-400">
                          {(selectedCabinet.drawerIds || []).length === 1 ? "Drawer" : "Drawers"}
                        </span>
                      </div>

                      <button
                        type="button"
                        className="h-full px-3.5 text-gray-600 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-zinc-200 border-l border-border dark:border-border bg-transparent hover:bg-gray-50 dark:hover:bg-zinc-700/50 transition-colors cursor-pointer flex items-center justify-center select-none"
                        onClick={addDrawerToSelected}
                        title="Add incremented drawer"
                      >
                        <Add01Icon size="1em" className="text-sm" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Drawer Records Usage Breakdown */}
                {!selectedCabinet.isDoor && (selectedCabinet.drawerIds || []).length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center justify-between text-xs font-medium text-gray-600 dark:text-zinc-400">
                      <span>Drawer Contents</span>
                      <span className="text-[11px] text-gray-400 tabular-nums">
                        {totalCabinetRecords} {totalCabinetRecords === 1 ? "record" : "records"}
                      </span>
                    </div>
                    <div className="divide-y divide-border dark:divide-border rounded-xl border border-border dark:border-border bg-gray-50/50 dark:bg-zinc-800/40 overflow-hidden">
                      {(selectedCabinet.drawerIds || []).map((drawerId) => {
                        const key = `${activeRoom?.id}|${selectedCabinet.id}|${Number(drawerId)}`
                        const count = Number(studentDrawerUsage?.get?.(key) || 0)
                        return (
                          <div key={`dr-row-${drawerId}`} className="flex items-center justify-between px-3 py-2 text-xs">
                            <span className="font-medium text-gray-700 dark:text-zinc-300">
                              Drawer {drawerId}
                            </span>
                            <span
                              className={cn(
                                "text-[10px] font-semibold px-2 py-0.5 rounded-full tabular-nums",
                                count > 0
                                  ? "bg-pup-maroon/10 text-pup-maroon dark:bg-red-500/20 dark:text-red-300"
                                  : "bg-gray-100 text-gray-400 dark:bg-zinc-700 dark:text-zinc-500"
                              )}
                            >
                              {count} {count === 1 ? "student record" : "student records"}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Position Coordinates */}
                <div className="grid grid-cols-2 gap-2.5 pt-1">
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-gray-600 dark:text-zinc-400">
                      X Position
                    </label>
                    <Input
                      type="number"
                      step="1"
                      placeholder="%"
                      value={toPct(selectedCabinet.rect.x)}
                      onChange={(e) => {
                        if (e.target.value === "") return
                        const val = Number(e.target.value)
                        if (!Number.isFinite(val)) return
                        updateSelectedRectFromNormalized({
                          ...selectedCabinet.rect,
                          x: fromPct(val),
                        })
                      }}
                      className="h-9 rounded-xl border border-border bg-white text-xs font-normal text-gray-900 px-3 shadow-xs focus-visible:border-border dark:bg-zinc-800 dark:border-border dark:text-zinc-100"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-gray-600 dark:text-zinc-400">
                      Y Position
                    </label>
                    <Input
                      type="number"
                      step="1"
                      placeholder="%"
                      value={toPct(selectedCabinet.rect.y)}
                      onChange={(e) => {
                        if (e.target.value === "") return
                        const val = Number(e.target.value)
                        if (!Number.isFinite(val)) return
                        updateSelectedRectFromNormalized({
                          ...selectedCabinet.rect,
                          y: fromPct(val),
                        })
                      }}
                      className="h-9 rounded-xl border border-border bg-white text-xs font-normal text-gray-900 px-3 shadow-xs focus-visible:border-border dark:bg-zinc-800 dark:border-border dark:text-zinc-100"
                    />
                  </div>
                </div>

                <p className="text-xs font-normal text-gray-500 dark:text-zinc-400 pt-1">
                  Drag cabinets on the canvas or enter coordinates manually.
                </p>
              </div>
            )
        )}

        {activeTab === "history" && (
          <div className="space-y-4">
            <div className="max-h-[350px] overflow-y-auto space-y-1.5 pr-1 scrollbar-thin">
              {history.length === 0 ? (
                <div className="flex flex-1 flex-col items-center justify-center min-h-[220px] py-8 text-center">
                  <EmptyState
                    variant="compact"
                    icon={Clock01Icon}
                    title="No Layout History Yet"
                    description="Changes to the storage layout will appear here."
                  />
                </div>
              ) : (
                history.map((item, idx) => {
                  const isCurrent = idx === historyIndex
                  const isUndone = idx > historyIndex

                  return (
                    <button
                      key={item.id || idx}
                      onClick={() => revertToHistoryState?.(idx)}
                      className={cn(
                        "flex h-9 w-full items-center justify-between gap-2.5 px-3 rounded-xl border text-left text-xs transition-all cursor-pointer focus:outline-none select-none",
                        isCurrent
                          ? "bg-black/[0.04] dark:bg-white/[0.08] border-black/10 dark:border-white/15 text-gray-950 dark:text-zinc-50 font-semibold shadow-xs"
                          : "bg-transparent border-transparent text-gray-600 dark:text-zinc-400 hover:bg-black/[0.02] dark:hover:bg-white/[0.04] hover:border-border dark:hover:border-white/10 font-medium",
                        isUndone && "opacity-50"
                      )}
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <span
                          className={cn(
                            "size-2 rounded-full shrink-0",
                            isCurrent
                              ? "bg-gray-900 dark:bg-white"
                              : isUndone
                                ? "bg-gray-300 dark:bg-zinc-700"
                                : "bg-gray-400 dark:bg-zinc-500"
                          )}
                        />
                        <span className={cn("truncate", isUndone && "line-through decoration-gray-300 dark:decoration-zinc-600")}>
                          {item.label}
                        </span>
                      </div>
                      {isCurrent ? (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 border border-black/[0.06] dark:border-white/10 shrink-0 shadow-2xs">
                          Current
                        </span>
                      ) : isUndone ? (
                        <span className="text-[10px] text-gray-400 dark:text-zinc-500 font-normal shrink-0">
                          Undone
                        </span>
                      ) : null}
                    </button>
                  )
                })
              )}
            </div>
            <p className="text-xs font-normal text-gray-500 dark:text-zinc-400">
              Click any previous action in the list to jump the canvas back to that point in time.
            </p>
          </div>
        )}
        </div>
      </div>
    </div>
  )
})

CabinetSidebar.displayName = "CabinetSidebar"

export default CabinetSidebar
