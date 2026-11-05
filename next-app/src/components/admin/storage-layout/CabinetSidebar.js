"use client"


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
import { EmptyState } from "@/components/ui/empty"
import { Cursor01Icon, Clock01Icon , ArrowLeft01Icon, ArrowRight01Icon, PencilEdit01Icon} from "hugeicons-react"

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
    <Card className="overflow-hidden rounded-2xl border border-black/[0.08] dark:border-white/10 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_4px_16px_rgba(0,0,0,0.02)] select-none dark:shadow-none">
      <CardHeader className="border-b border-black/[0.06] dark:border-white/10 bg-transparent p-5">
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
                <PencilEdit01Icon size="1em" className="text-xs" />
              </button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4">
        {/* Apple Segmented Control */}
        <div className="flex items-center gap-1 p-1 rounded-full bg-black/[0.04] dark:bg-white/[0.06] border border-black/[0.04] dark:border-white/[0.08] shadow-[inset_0_1px_2px_rgba(0,0,0,0.03)] dark:shadow-[inset_0_1px_2px_rgba(0,0,0,0.2)] w-full mb-4">
          <button
            type="button"
            onClick={() => setActiveTab("properties")}
            className={cn(
              "flex-1 py-1 px-3 rounded-full text-xs font-semibold transition-all duration-150 cursor-pointer text-center border-0 active:scale-[0.98]",
              activeTab === "properties"
                ? "bg-white text-gray-950 dark:bg-zinc-800 dark:text-white shadow-[0_1px_3px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.04),inset_0_1px_0_0_rgba(255,255,255,0.85)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.35),inset_0_1px_0_0_rgba(255,255,255,0.08)]"
                : "text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-zinc-100 bg-transparent"
            )}
          >
            Properties
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("history")}
            className={cn(
              "flex-1 py-1 px-3 rounded-full text-xs font-semibold transition-all duration-150 cursor-pointer text-center border-0 active:scale-[0.98]",
              activeTab === "history"
                ? "bg-white text-gray-950 dark:bg-zinc-800 dark:text-white shadow-[0_1px_3px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.04),inset_0_1px_0_0_rgba(255,255,255,0.85)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.35),inset_0_1px_0_0_rgba(255,255,255,0.08)]"
                : "text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-zinc-100 bg-transparent"
            )}
          >
            History
          </button>
        </div>

        {activeTab === "properties" && (
          <div>
            {!selectedCabinet ? (
              <EmptyState
                variant="compact"
                icon={Cursor01Icon}
                title="No Cabinet Selected"
                description="Select a cabinet on the map to edit its properties."
              />
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
                      <ArrowLeft01Icon size="1em"  className="text-xs" />
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
                      <ArrowRight01Icon size="1em"  className="text-xs" />
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
                <EmptyState
                  variant="compact"
                  icon={Clock01Icon}
                  title="No Layout History Yet"
                  description="Changes to the storage layout will appear here."
                />
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



