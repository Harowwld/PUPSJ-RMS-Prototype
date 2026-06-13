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
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyMedia,
} from "@/components/ui/empty"
import { toPct, fromPct } from "@/lib/storageLayoutUtils"

const CabinetSidebar = memo(({
  selectedCabinetIds,
  selectedCabinet,
  duplicateSelectedCabinet,
  setBulkConfirmOpen,
  removeDrawerFromSelected,
  addDrawerToSelected,
  updateSelectedRectFromNormalized,
  updateSelectedSizeNormalized,
  history = [],
  historyIndex = 0,
  revertToHistoryState
}) => {
  const [activeTab, setActiveTab] = React.useState("properties")

  return (
    <Card className="overflow-hidden rounded-brand border border-gray-200 shadow-sm select-none dark:border-white/10 dark:shadow-none">
      <CardHeader className="border-b border-gray-100 bg-transparent p-6 dark:border-white/10 dark:bg-transparent">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-white text-pup-maroon dark:text-primary shadow-sm dark:border-white/10 dark:bg-card dark:text-primary dark:shadow-none">
            <i className={cn(
              "text-xl",
              selectedCabinetIds.size === 0 ? "ph-duotone ph-mouse-simple" :
              selectedCabinetIds.size > 1 ? "ph-duotone ph-stack" :
              selectedCabinet?.isDoor ? "ph-duotone ph-door-open" : "ph-duotone ph-archive"
            )}></i>
          </div>
          <div>
            <CardTitle className="text-xl font-semibold tracking-tight text-gray-900 dark:text-zinc-50">
              {selectedCabinetIds.size === 0 ? "Selection Details" :
               selectedCabinetIds.size > 1 ? "Group Selection" :
               selectedCabinet?.isDoor ? "Entrance Details" : "Cabinet Details"}
            </CardTitle>
            <CardDescription className="mt-1.5 text-sm font-medium text-gray-500 dark:text-zinc-400">
              {selectedCabinetIds.size > 1
                ? `${selectedCabinetIds.size} cabinets selected`
                : selectedCabinet
                  ? `Cabinet ${selectedCabinet.id}`
                  : "Select a cabinet on the map"}
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4">
        <div className="flex w-full cursor-default items-center overflow-hidden rounded-brand border border-gray-200 bg-gray-100 p-0.5 backdrop-blur-sm dark:border-white/10 dark:bg-muted/50 mb-4">
          <button
            type="button"
            onClick={() => setActiveTab("properties")}
            className={cn(
              "group flex h-10 flex-1 cursor-pointer items-center justify-center gap-2 px-4 text-xs font-semibold transition-all duration-200 active:scale-[0.98]",
              activeTab === "properties"
                ? "rounded-l-[calc(var(--radius)-2px)] rounded-r-none bg-white text-pup-maroon shadow-sm ring-1 ring-inset ring-black/5 dark:bg-zinc-900 dark:text-[#b94642] dark:ring-white/10"
                : "text-gray-500 ring-transparent hover:bg-white/50 hover:text-gray-700 dark:text-zinc-500 dark:hover:bg-white/5 dark:hover:text-zinc-200"
            )}
          >
            <i className="ph-bold ph-sliders text-base" />
            Properties
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("history")}
            className={cn(
              "group flex h-10 flex-1 cursor-pointer items-center justify-center gap-2 px-4 text-xs font-semibold transition-all duration-200 active:scale-[0.98]",
              activeTab === "history"
                ? "rounded-r-[calc(var(--radius)-2px)] rounded-l-none bg-white text-pup-maroon shadow-sm ring-1 ring-inset ring-black/5 dark:bg-zinc-900 dark:text-[#b94642] dark:ring-white/10"
                : "text-gray-500 ring-transparent hover:bg-white/50 hover:text-gray-700 dark:text-zinc-500 dark:hover:bg-white/5 dark:hover:text-zinc-200"
            )}
          >
            <i className="ph-bold ph-clock-counter-clockwise text-base" />
            History
          </button>
        </div>

        {activeTab === "properties" && (
          <div>
            {selectedCabinetIds.size > 1 ? (
              <div className="flex h-[320px] flex-col items-center justify-center text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-gray-200 bg-gray-50 text-pup-maroon dark:text-primary shadow-sm dark:border-white/10 dark:bg-card dark:text-primary dark:shadow-none">
                  <i className="ph-duotone ph-stack text-xl"></i>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-zinc-50">
                  Multiple Selection
                </h3>
                <p className="mt-1 max-w-[220px] text-sm font-medium text-gray-600 dark:text-zinc-300">
                  You can drag the group on the canvas or use the bulk
                  actions below.
                </p>
              </div>
            ) : !selectedCabinet ? (
              <Empty className="flex h-[320px] flex-col items-center justify-center border-0 text-center text-gray-500 dark:text-zinc-400">
                <EmptyHeader className="flex flex-col items-center gap-0">
                  <EmptyMedia className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-card dark:shadow-none">
                    <i className="ph-duotone ph-mouse-left-click text-xl text-pup-maroon dark:text-primary"></i>
                  </EmptyMedia>
                  <EmptyTitle className="text-lg font-semibold text-gray-900 dark:text-zinc-50">
                    No cabinet selected
                  </EmptyTitle>
                  <EmptyDescription className="mt-1 max-w-[200px] text-sm font-medium text-gray-600 dark:text-zinc-300">
                    Select a cabinet on the map to edit its properties.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-2">
                  {selectedCabinet.isDoor ? null : (
                    <>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={duplicateSelectedCabinet}
                        className="h-10 rounded-brand border-gray-300 px-4 font-semibold shadow-sm hover:border-gray-300 hover:bg-red-50 dark:shadow-none dark:hover:border-zinc-700 dark:bg-red-950/30 dark:border-white/10"
                      >
                        <i className="ph-bold ph-copy mr-2 text-pup-maroon dark:text-primary" />
                        DUPLICATE
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setBulkConfirmOpen(true)}
                        className="h-10 rounded-brand border-gray-300 px-4 font-semibold shadow-sm hover:border-gray-300 hover:bg-red-50 dark:shadow-none dark:hover:border-zinc-700 dark:bg-red-950/30 dark:border-white/10"
                      >
                        <i className="ph-bold ph-trash mr-2 text-pup-maroon dark:text-primary" />
                        REMOVE CABINET
                      </Button>
                    </>
                  )}
                </div>

                {!selectedCabinet.isDoor && (
                  <div>
                    <div className="mb-2 text-xs font-semibold tracking-wide text-gray-700 dark:text-zinc-200">
                      Drawer count
                    </div>
                    <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 p-1 dark:border-white/10 dark:bg-card">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-10 w-10 rounded-lg transition-all hover:bg-white hover:shadow-sm dark:hover:bg-white/5 dark:bg-card dark:shadow-none"
                        onClick={removeDrawerFromSelected}
                        disabled={(selectedCabinet.drawerIds || []).length <= 1}
                      >
                        <i className="ph-bold ph-minus" />
                      </Button>

                      <div className="flex-1 text-center">
                        <span className="text-lg font-semibold text-gray-900 dark:text-zinc-50">
                          {(selectedCabinet.drawerIds || []).length}
                        </span>
                        <span className="ml-2 text-xs font-semibold tracking-tight text-gray-500 dark:text-zinc-400">
                          Drawers
                        </span>
                      </div>

                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-10 w-10 rounded-lg transition-all hover:bg-white hover:shadow-sm dark:hover:bg-white/5 dark:bg-card dark:shadow-none"
                        onClick={addDrawerToSelected}
                      >
                        <i className="ph-bold ph-plus" />
                      </Button>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs font-semibold tracking-wide text-gray-700 dark:text-zinc-200">
                      X Position (%)
                    </label>
                    <Input
                      type="number"
                      step="1"
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
                      className="h-10 rounded-brand border border-gray-300 bg-white text-sm focus-visible:border-gray-300 focus-visible:ring-2 focus-visible:ring-pup-maroon focus-visible:outline-none dark:bg-card dark:border-white/10"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold tracking-wide text-gray-700 dark:text-zinc-200">
                      Y Position (%)
                    </label>
                    <Input
                      type="number"
                      step="1"
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
                      className="h-10 rounded-brand border border-gray-300 bg-white text-sm focus-visible:border-gray-300 focus-visible:ring-2 focus-visible:ring-pup-maroon focus-visible:outline-none dark:bg-card dark:border-white/10"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs font-semibold tracking-wide text-gray-700 opacity-50 dark:text-zinc-200">
                      Width (%)
                    </label>
                    <Input
                      type="number"
                      disabled
                      value={toPct(selectedCabinet.rect.w)}
                      className="h-10 rounded-brand border border-gray-300 bg-gray-50 text-sm opacity-50 cursor-not-allowed dark:bg-card dark:border-white/10"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold tracking-wide text-gray-700 opacity-50 dark:text-zinc-200">
                      Height (%)
                    </label>
                    <Input
                      type="number"
                      disabled
                      value={toPct(selectedCabinet.rect.h)}
                      className="h-10 rounded-brand border border-gray-300 bg-gray-50 text-sm opacity-50 cursor-not-allowed dark:bg-card dark:border-white/10"
                    />
                  </div>
                </div>

                <div className="text-xs font-medium text-gray-500 dark:text-zinc-400">
                  Tip: drag cabinets on the canvas. Drawer count controls
                  available drawer slots for this cabinet.
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "history" && (
          <div className="space-y-4">
            <div className="max-h-[350px] overflow-y-auto space-y-1 pr-1 scrollbar-thin">
              {history.length === 0 ? (
                <div className="text-center text-xs font-medium text-gray-400 py-6">
                  No history states tracked yet.
                </div>
              ) : (
                history.map((item, idx) => {
                  const isActive = idx === historyIndex
                  const isUndone = idx > historyIndex

                  let iconClass = "ph-bold ph-circle"
                  if (item.label.toLowerCase().includes("initial")) iconClass = "ph-bold ph-file-text"
                  else if (item.label.toLowerCase().includes("move cabinet") || item.label.toLowerCase().includes("move entrance")) iconClass = "ph-bold ph-arrows-out-cardinal"
                  else if (item.label.toLowerCase().includes("resize")) iconClass = "ph-bold ph-arrows-in-line-horizontal"
                  else if (item.label.toLowerCase().includes("add cabinet")) iconClass = "ph-bold ph-plus-square"
                  else if (item.label.toLowerCase().includes("delete") || item.label.toLowerCase().includes("remove cabinet")) iconClass = "ph-bold ph-trash"
                  else if (item.label.toLowerCase().includes("duplicate")) iconClass = "ph-bold ph-copy"
                  else if (item.label.toLowerCase().includes("add drawer")) iconClass = "ph-bold ph-plus"
                  else if (item.label.toLowerCase().includes("remove drawer")) iconClass = "ph-bold ph-minus"
                  else if (item.label.toLowerCase().includes("paste")) iconClass = "ph-bold ph-clipboard-text"
                  else if (item.label.toLowerCase().includes("clear")) iconClass = "ph-bold ph-eraser"
                  else if (item.label.toLowerCase().includes("add room")) iconClass = "ph-bold ph-door"
                  else if (item.label.toLowerCase().includes("delete room")) iconClass = "ph-bold ph-x-circle"
                  else if (item.label.toLowerCase().includes("template")) iconClass = "ph-bold ph-magic-wand"

                  return (
                    <button
                      key={item.id || idx}
                      onClick={() => revertToHistoryState?.(idx)}
                      className={cn(
                        "flex w-full items-center gap-3 px-3 py-2 text-left text-xs font-semibold rounded-brand transition-all",
                        isActive
                          ? "bg-pup-maroon text-white shadow-xs dark:bg-[#b94642]"
                          : isUndone
                            ? "text-gray-400 dark:text-zinc-500 opacity-60 hover:bg-gray-50 dark:hover:bg-zinc-800"
                            : "text-gray-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-800"
                      )}
                    >
                      <i className={cn(iconClass, "text-base shrink-0", isActive ? "text-white" : "text-gray-500 dark:text-zinc-400")} />
                      <span className="truncate flex-1">{item.label}</span>
                      {isActive && (
                        <span className="text-[10px] font-semibold uppercase tracking-wider bg-white/20 px-1.5 py-0.5 rounded text-white shrink-0">
                          Active
                        </span>
                      )}
                    </button>
                  )
                })
              )}
            </div>
            <div className="text-[10px] font-medium text-gray-500 dark:text-zinc-400">
              Tip: click any previous action in the list to jump the canvas back to that point in time.
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
})

CabinetSidebar.displayName = "CabinetSidebar"

export default CabinetSidebar



