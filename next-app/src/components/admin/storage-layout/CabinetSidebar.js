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
  activeRoom,
  carouselIndex = 0,
  setCarouselIndex,
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
      <CardHeader className="border-b-[0.5px] border-black/[0.08] dark:border-white/[0.08] bg-transparent p-6">
        <div>
          <CardTitle className="text-[15px] font-semibold tracking-[-0.01em] text-[#111111] dark:text-zinc-50 mb-[4px]">
            {selectedCabinetIds.size === 0 ? "Selection Details" :
             selectedCabinetIds.size > 1 ? "Group Selection" :
             selectedCabinet?.isDoor ? "Entrance Details" : "Cabinet Details"}
          </CardTitle>
          <CardDescription className="text-[13px] font-normal text-[#8E8E93] dark:text-zinc-400 m-0">
            {selectedCabinetIds.size > 1
              ? `${selectedCabinetIds.size} cabinets selected`
              : selectedCabinet
                ? `Cabinet ${selectedCabinet.id}`
                : "Select a cabinet on the map"}
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent className="p-4">
        <div className="flex w-full items-center mb-4 gap-[24px]">
          <button
            type="button"
            onClick={() => setActiveTab("properties")}
            className={cn(
              "relative pb-[8px] text-[13px] transition-colors focus:outline-none cursor-pointer",
              activeTab === "properties"
                ? "text-[#ad2f2f] font-semibold after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-full after:bg-[#ad2f2f]"
                : "text-[#8E8E93] font-normal hover:text-[#111111] dark:hover:text-zinc-200"
            )}
          >
            Properties
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("history")}
            className={cn(
              "relative pb-[8px] text-[13px] transition-colors focus:outline-none cursor-pointer",
              activeTab === "history"
                ? "text-[#ad2f2f] font-semibold after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-full after:bg-[#ad2f2f]"
                : "text-[#8E8E93] font-normal hover:text-[#111111] dark:hover:text-zinc-200"
            )}
          >
            History
          </button>
        </div>

        {activeTab === "properties" && (
          <div>
            {!selectedCabinet ? (
              <div className="flex h-[320px] flex-col items-center justify-center text-center">
                <i className="ph-duotone ph-mouse-left-click text-[24px] text-[#C7C7CC]"></i>
                <h3 className="text-[14px] font-medium text-[#111111] dark:text-zinc-50 mt-[12px]">
                  No cabinet selected
                </h3>
                <p className="text-[13px] font-normal text-[#8E8E93] dark:text-zinc-400 mt-[4px] max-w-[200px] mx-auto">
                  Select a cabinet on the map to edit its properties.
                </p>
              </div>
            ) : (
              <div className="space-y-[16px]">
                {selectedCabinetIds.size > 1 && (
                  <div className="flex h-[36px] items-center rounded-[8px] border-[0.5px] border-black/15 bg-white dark:border-white/10 dark:bg-card overflow-hidden">
                    <button
                      type="button"
                      disabled={carouselIndex <= 0}
                      onClick={() => setCarouselIndex(prev => Math.max(0, prev - 1))}
                      className="px-3 h-full flex items-center justify-center text-[#8E8E93] hover:text-[#111111] dark:hover:text-zinc-200 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer border-r-[0.5px] border-solid border-black/10 dark:border-white/10"
                    >
                      <i className="ph-bold ph-caret-left text-[14px]" />
                    </button>

                    <div className="flex-1 text-center text-[13px] font-medium text-[#111111] dark:text-zinc-50 select-none">
                      {selectedCabinet.isDoor ? "Entrance" : `Cabinet ${selectedCabinet.id}`} ({carouselIndex + 1} of {selectedCabinetIds.size})
                    </div>

                    <button
                      type="button"
                      disabled={carouselIndex >= selectedCabinetIds.size - 1}
                      onClick={() => setCarouselIndex(prev => Math.min(selectedCabinetIds.size - 1, prev + 1))}
                      className="px-3 h-full flex items-center justify-center text-[#8E8E93] hover:text-[#111111] dark:hover:text-zinc-200 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer border-l-[0.5px] border-solid border-black/10 dark:border-white/10"
                    >
                      <i className="ph-bold ph-caret-right text-[14px]" />
                    </button>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-[12px] items-center">
                  {selectedCabinet.isDoor ? null : (
                    <>
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={duplicateSelectedCabinet}
                        className="w-full h-[36px] bg-transparent hover:bg-transparent border-0 px-2 text-[13px] font-normal text-[#8E8E93] hover:text-[#111111] dark:text-zinc-500 dark:hover:text-zinc-300 shadow-none flex items-center justify-center cursor-pointer"
                      >
                        Duplicate
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => setBulkConfirmOpen(true)}
                        className="w-full h-[36px] bg-transparent hover:bg-transparent border-0 px-2 text-[13px] font-normal text-[#E5484D] hover:text-[#c93b40] dark:text-red-400 dark:hover:text-red-300 shadow-none flex items-center justify-center cursor-pointer"
                      >
                        Remove Cabinet
                      </Button>
                    </>
                  )}
                </div>

                {!selectedCabinet.isDoor && (
                  <div>
                    <div className="mb-1 text-[12px] font-medium text-[#8E8E93] dark:text-zinc-400">
                      Drawer count
                    </div>
                    <div className="flex items-center h-[36px] border-[0.5px] border-black/15 dark:border-white/10 dark:bg-card bg-white rounded-[8px] overflow-hidden">
                      <button
                        type="button"
                        className="h-full px-[14px] text-[16px] text-[#8E8E93] hover:text-[#111111] dark:hover:text-zinc-200 border-r-[0.5px] border-black/15 dark:border-white/10 bg-transparent hover:bg-black/[0.02] disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer flex items-center justify-center select-none"
                        onClick={removeDrawerFromSelected}
                        disabled={(selectedCabinet.drawerIds || []).length <= 1}
                      >
                        −
                      </button>

                      <div className="flex-1 text-center select-none flex items-center justify-center">
                        <span className="text-[14px] font-semibold text-[#111111] dark:text-zinc-50">
                          {(selectedCabinet.drawerIds || []).length}
                        </span>
                        <span className="ml-[4px] text-[12px] font-normal text-[#8E8E93] dark:text-zinc-500">
                          Drawers
                        </span>
                      </div>

                      <button
                        type="button"
                        className="h-full px-[14px] text-[16px] text-[#8E8E93] hover:text-[#111111] dark:hover:text-zinc-200 border-l-[0.5px] border-black/15 dark:border-white/10 bg-transparent hover:bg-black/[0.02] transition-colors cursor-pointer flex items-center justify-center select-none"
                        onClick={addDrawerToSelected}
                      >
                        +
                      </button>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-[12px]">
                  <div>
                    <label className="mb-1 block text-[12px] font-medium text-[#8E8E93] dark:text-zinc-400">
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
                      className="h-[36px] rounded-[8px] border-[0.5px] border-black/15 bg-white text-[13px] font-normal text-[#111111] px-[12px] focus-visible:border-black/15 focus-visible:ring-0 focus-visible:outline-none dark:bg-card dark:border-white/10 dark:text-zinc-100"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[12px] font-medium text-[#8E8E93] dark:text-zinc-400">
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
                      className="h-[36px] rounded-[8px] border-[0.5px] border-black/15 bg-white text-[13px] font-normal text-[#111111] px-[12px] focus-visible:border-black/15 focus-visible:ring-0 focus-visible:outline-none dark:bg-card dark:border-white/10 dark:text-zinc-100"
                    />
                  </div>
                </div>

                <div className="text-[12px] font-normal text-[#8E8E93] dark:text-zinc-500 mt-[8px]">
                  Drag cabinets on the canvas. Drawer count controls available drawer slots for this cabinet.
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

                  return (
                    <button
                      key={item.id || idx}
                      onClick={() => revertToHistoryState?.(idx)}
                      className={cn(
                        "flex h-[44px] w-full items-center justify-between gap-3 px-[12px] py-0 text-left rounded-[8px] border-[0.5px] transition-all cursor-pointer focus:outline-none",
                        isActive
                          ? "bg-[#FFF5F5] text-[#111111] border-[rgba(173,47,47,0.2)] dark:bg-red-950/20 dark:text-zinc-50 dark:border-red-900/40"
                          : cn(
                              "bg-transparent text-gray-700 hover:text-[#111111] hover:bg-gray-50/50 border-black/[0.08] dark:border-white/10 dark:text-zinc-350 dark:hover:text-zinc-200 dark:hover:bg-white/5",
                              isUndone && "opacity-60"
                            )
                      )}
                    >
                      <span className="truncate flex-1 text-[13px] font-medium">{item.label}</span>
                      {isActive && (
                        <span className="text-[11px] font-medium tracking-[0.04em] bg-[#DCFCE7] text-[#166534] dark:bg-emerald-950/40 dark:text-emerald-400 px-[8px] py-[2px] rounded-[4px] shrink-0">
                          Active
                        </span>
                      )}
                    </button>
                  )
                })
              )}
            </div>
            <div className="text-[12px] font-normal text-[#8E8E93] dark:text-zinc-500 mt-[8px]">
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



