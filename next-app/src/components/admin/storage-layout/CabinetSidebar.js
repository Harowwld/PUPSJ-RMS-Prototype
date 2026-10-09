"use client"

import HugeIcon from "@/components/shared/HugeIcon";
import React, { memo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { toPct, fromPct } from "@/lib/storageLayoutUtils"

const CabinetSidebar = memo(({
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
}) => {
  const [activeTab, setActiveTab] = React.useState("properties")

  return (
    <Card className="overflow-hidden rounded-2xl border border-border shadow-sm select-none dark:border-border dark:shadow-none">
      <CardHeader className="border-b border-border dark:border-border bg-transparent p-5">
        <div>
          <CardTitle className="text-[15px] font-semibold tracking-[-0.01em] text-gray-900 dark:text-zinc-50 mb-1">
            {selectedCabinetIds.size === 0 ? "Selection Details" :
             selectedCabinetIds.size > 1 ? "Group Selection" :
             selectedCabinet?.isDoor ? "Entrance Details" : "Cabinet Details"}
          </CardTitle>
          <div className="flex items-center gap-2">
            <CardDescription className="text-xs font-normal text-gray-900 dark:text-zinc-300 m-0">
              {selectedCabinetIds.size > 1
                ? `${selectedCabinetIds.size} cabinets selected`
                : selectedCabinet
                  ? `Cabinet ${selectedCabinet.id}`
                  : "Select a cabinet on the map"}
            </CardDescription>
            {selectedCabinet && !selectedCabinet.isDoor && selectedCabinetIds.size === 1 && (
              <button
                type="button"
                onClick={() => onOpenRenameCabinet?.(selectedCabinet)}
                className="w-5 h-5 rounded-md hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-400 hover:text-pup-maroon dark:text-zinc-400 dark:hover:text-red-400 transition-colors cursor-pointer flex items-center justify-center active:scale-95"
                title="Rename Cabinet"
              >
                <HugeIcon className="ph-bold ph-pencil-simple text-xs" />
              </button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4">
        {/* Apple Segmented Control */}
        <div className="flex items-center gap-1 bg-gray-100/80 dark:bg-zinc-800/60 p-1 rounded-xl border border-border/60 dark:border-border w-full mb-4">
          <button
            type="button"
            onClick={() => setActiveTab("properties")}
            className={cn(
              "flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer text-center",
              activeTab === "properties"
                ? "bg-white dark:bg-zinc-700 text-gray-900 dark:text-white shadow-xs"
                : "text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white"
            )}
          >
            Properties
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("history")}
            className={cn(
              "flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer text-center",
              activeTab === "history"
                ? "bg-white dark:bg-zinc-700 text-gray-900 dark:text-white shadow-xs"
                : "text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white"
            )}
          >
            History
          </button>
        </div>

        {activeTab === "properties" && (
          <div>
            {!selectedCabinet ? (
              <div className="flex h-[320px] flex-col items-center justify-center text-center">
                <HugeIcon  className="ph-duotone ph-mouse-left-click text-[24px] text-gray-300 dark:text-zinc-600"></HugeIcon>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-zinc-50 mt-3">
                  No cabinet selected
                </h3>
                <p className="text-xs font-normal text-gray-900 dark:text-zinc-300 mt-1 max-w-[200px] mx-auto">
                  Select a cabinet on the map to edit its properties.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {selectedCabinetIds.size > 1 && (
                  <div className="flex h-9 items-center rounded-xl border border-border bg-white dark:border-border dark:bg-card overflow-hidden shadow-xs">
                    <button
                      type="button"
                      disabled={carouselIndex <= 0}
                      onClick={() => setCarouselIndex(prev => Math.max(0, prev - 1))}
                      className="px-3 h-full flex items-center justify-center text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-zinc-200 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer border-r border-border dark:border-border"
                    >
                      <HugeIcon  className="ph-bold ph-caret-left text-xs" />
                    </button>

                    <div className="flex-1 text-center text-xs font-medium text-gray-900 dark:text-zinc-50 select-none">
                      {selectedCabinet.isDoor ? "Entrance" : `Cabinet ${selectedCabinet.id}`} ({carouselIndex + 1} of {selectedCabinetIds.size})
                    </div>

                    <button
                      type="button"
                      disabled={carouselIndex >= selectedCabinetIds.size - 1}
                      onClick={() => setCarouselIndex(prev => Math.min(selectedCabinetIds.size - 1, prev + 1))}
                      className="px-3 h-full flex items-center justify-center text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-zinc-200 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer border-l border-border dark:border-border"
                    >
                      <HugeIcon  className="ph-bold ph-caret-right text-xs" />
                    </button>
                  </div>
                )}

                <div className="grid grid-cols-3 gap-2 items-center">
                  {selectedCabinet.isDoor ? null : (
                    <>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => onOpenRenameCabinet?.(selectedCabinet)}
                        className="w-full h-9 rounded-xl border border-border dark:border-border bg-white dark:bg-zinc-800 text-xs font-semibold text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-xs cursor-pointer active:scale-95 transition-all px-1"
                      >
                        Rename
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={duplicateSelectedCabinet}
                        className="w-full h-9 rounded-xl border border-border dark:border-border bg-white dark:bg-zinc-800 text-xs font-semibold text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-xs cursor-pointer active:scale-95 transition-all px-1"
                      >
                        Duplicate
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setBulkConfirmOpen(true)}
                        className="w-full h-9 rounded-xl border border-red-200 dark:border-red-900/40 bg-white dark:bg-zinc-800 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 shadow-xs cursor-pointer active:scale-95 transition-all px-1"
                      >
                        Delete
                      </Button>
                    </>
                  )}
                </div>

                {!selectedCabinet.isDoor && (
                  <div className="space-y-3 pt-1">
                    <div>
                      <div className="mb-1.5 flex items-center justify-between text-xs font-medium text-gray-600 dark:text-zinc-400">
                        <span>Drawer Count</span>
                        <span className="text-[11px] text-gray-400">
                          {(selectedCabinet.drawerIds || []).length} slots
                        </span>
                      </div>
                      <div className="flex items-center h-9 border border-border dark:border-border dark:bg-zinc-800/50 bg-white rounded-xl overflow-hidden shadow-xs">
                        <button
                          type="button"
                          className="h-full px-3.5 text-sm font-semibold text-gray-600 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-zinc-200 border-r border-border dark:border-border bg-transparent hover:bg-gray-50 dark:hover:bg-zinc-700/50 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer flex items-center justify-center select-none"
                          onClick={removeDrawerFromSelected}
                          disabled={(selectedCabinet.drawerIds || []).length <= 1}
                          title="Remove last drawer"
                        >
                          −
                        </button>

                        <div className="flex-1 text-center select-none flex items-center justify-center">
                          <span className="text-xs font-semibold text-gray-900 dark:text-zinc-50">
                            {(selectedCabinet.drawerIds || []).length}
                          </span>
                          <span className="ml-1 text-xs font-normal text-gray-900 dark:text-zinc-300">
                            Drawers
                          </span>
                        </div>

                        <button
                          type="button"
                          className="h-full px-3.5 text-sm font-semibold text-gray-600 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-zinc-200 border-l border-border dark:border-border bg-transparent hover:bg-gray-50 dark:hover:bg-zinc-700/50 transition-colors cursor-pointer flex items-center justify-center select-none"
                          onClick={addDrawerToSelected}
                          title="Add incremented drawer"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2.5">
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

                <div className="text-xs font-normal text-gray-900 dark:text-zinc-300 mt-2">
                  Drag cabinets on the canvas. Drawer count controls available drawer slots for this cabinet.
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "history" && (
          <div className="space-y-4">
            <div className="max-h-[350px] overflow-y-auto space-y-1.5 pr-1 scrollbar-thin">
              {history.length === 0 ? (
                <div className="text-center text-xs font-medium text-gray-400 py-6">
                  No history states tracked yet.
                </div>
              ) : (
                history.map((item, idx) => {
                  const isActive = idx === historyIndex
                  const isUndone = idx > historyIndex

                  return (
                    <button
                      key={item.id || idx}
                      onClick={() => revertToHistoryState?.(idx)}
                      className={cn(
                        "flex h-10 w-full items-center justify-between gap-3 px-3 py-0 text-left rounded-xl border transition-all cursor-pointer focus:outline-none",
                        isActive
                          ? "bg-red-50 text-gray-900 border-red-200 dark:bg-red-950/20 dark:text-zinc-50 dark:border-red-900/40"
                          : cn(
                              "bg-transparent text-gray-700 hover:text-gray-900 hover:bg-gray-50/70 border-border dark:border-border dark:text-zinc-300 dark:hover:text-zinc-100 dark:hover:bg-white/5",
                              isUndone && "opacity-60"
                            )
                      )}
                    >
                      <span className="truncate flex-1 text-xs font-medium">{item.label}</span>
                      {isActive && (
                        <span className="text-[11px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-400 px-2 py-0.5 rounded-full shrink-0">
                          Active
                        </span>
                      )}
                    </button>
                  )
                })
              )}
            </div>
            <div className="text-xs font-normal text-gray-900 dark:text-zinc-300 mt-2">
              Click any previous action in the list to jump the canvas back to that point in time.
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
})

CabinetSidebar.displayName = "CabinetSidebar"

export default CabinetSidebar



