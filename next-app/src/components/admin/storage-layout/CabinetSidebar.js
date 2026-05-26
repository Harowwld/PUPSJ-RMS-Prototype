"use client"

import { memo } from "react"
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
  updateSelectedSizeNormalized
}) => {
  return (
    <Card className="overflow-hidden rounded-brand border border-gray-200 shadow-sm select-none dark:border-white/10 dark:shadow-none">
      <CardHeader className="border-b border-gray-100 bg-gray-50 p-6 dark:border-white/10 dark:bg-white/5">        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-white text-pup-maroon dark:text-primary shadow-sm dark:border-white/10 dark:bg-card dark:text-primary dark:shadow-none">
            <i className={cn(
              "text-2xl",
              selectedCabinetIds.size === 0 ? "ph-duotone ph-mouse-simple" :
              selectedCabinetIds.size > 1 ? "ph-duotone ph-stack" :
              selectedCabinet?.isDoor ? "ph-duotone ph-door-open" : "ph-duotone ph-archive"
            )}></i>
          </div>
          <div>
            <CardTitle className="text-xl leading-none font-black tracking-tight text-gray-900 dark:text-zinc-50">
              {selectedCabinetIds.size === 0 ? "Selection Details" :
               selectedCabinetIds.size > 1 ? "Group Selection" :
               selectedCabinet?.isDoor ? "Entrance Details" : "Cabinet Details"}
            </CardTitle>
            <CardDescription className="mt-1.5 text-sm font-medium text-gray-500 dark:text-zinc-400">
              {selectedCabinetIds.size > 1
                ? `${selectedCabinetIds.size} cabinets selected`
                : selectedCabinet
                  ? (selectedCabinet.id.startsWith("CAB-") ? selectedCabinet.id : `CAB-${selectedCabinet.id}`)
                  : "Select a cabinet on the map"}
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4">
        {selectedCabinetIds.size > 1 ? (
          <div className="flex h-[320px] flex-col items-center justify-center text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-gray-200 bg-gray-50 text-pup-maroon dark:text-primary shadow-sm dark:border-white/10 dark:bg-card dark:text-primary dark:shadow-none">
              <i className="ph-duotone ph-stack text-3xl"></i>
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-zinc-50">
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
                <i className="ph-duotone ph-mouse-left-click text-3xl text-pup-maroon dark:text-primary dark:text-primary"></i>
              </EmptyMedia>
              <EmptyTitle className="text-lg font-bold text-gray-900 dark:text-zinc-50">
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
              {selectedCabinet.isDoor ? (
                null
              ) : (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={duplicateSelectedCabinet}
                    className="h-10 rounded-brand border-gray-300 px-4 font-bold shadow-sm hover:border-gray-300 hover:bg-red-50 dark:shadow-none dark:hover:border-zinc-700 dark:bg-red-950/30 dark:border-white/10"
                  >
                    <i className="ph-bold ph-copy mr-2 text-pup-maroon dark:text-primary dark:text-primary" />
                    DUPLICATE
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setBulkConfirmOpen(true)}
                    className="h-10 rounded-brand border-gray-300 px-4 font-bold shadow-sm hover:border-gray-300 hover:bg-red-50 dark:shadow-none dark:hover:border-zinc-700 dark:bg-red-950/30 dark:border-white/10"
                  >
                    <i className="ph-bold ph-trash mr-2 text-pup-maroon dark:text-primary dark:text-primary" />
                    REMOVE CABINET
                  </Button>
                </>
              )}
            </div>

            {!selectedCabinet.isDoor && (
              <div>
                <div className="mb-2 text-xs font-bold tracking-wide text-gray-700 uppercase dark:text-zinc-200">
                  Drawer count
                </div>
                <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 p-1 dark:border-white/10 dark:bg-card">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 rounded-lg transition-all hover:bg-white hover:shadow-sm dark:hover:bg-white/5 dark:bg-card dark:shadow-none"
                    onClick={removeDrawerFromSelected}
                    disabled={
                      (selectedCabinet.drawerIds || []).length <= 1
                    }
                  >
                    <i className="ph-bold ph-minus" />
                  </Button>

                  <div className="flex-1 text-center">
                    <span className="text-lg font-black text-gray-900 dark:text-zinc-50">
                      {(selectedCabinet.drawerIds || []).length}
                    </span>
                    <span className="ml-2 text-xs font-bold tracking-tight text-gray-500 uppercase dark:text-zinc-400">
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
                <label className="mb-1 block text-xs font-bold tracking-wide text-gray-700 uppercase dark:text-zinc-200">
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
                <label className="mb-1 block text-xs font-bold tracking-wide text-gray-700 uppercase dark:text-zinc-200">
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
                <label className="mb-1 block text-xs font-bold tracking-wide text-gray-700 uppercase dark:text-zinc-200">
                  Width (%)
                </label>
                <Input
                  type="number"
                  step="1"
                  value={toPct(selectedCabinet.rect.w)}
                  onChange={(e) => {
                    if (e.target.value === "") return
                    const val = Number(e.target.value)
                    if (!Number.isFinite(val)) return
                    updateSelectedSizeNormalized(
                      fromPct(val),
                      selectedCabinet.rect.h
                    )
                  }}
                  className="h-10 rounded-brand border border-gray-300 bg-white text-sm focus-visible:border-gray-300 focus-visible:ring-2 focus-visible:ring-pup-maroon focus-visible:outline-none dark:bg-card dark:border-white/10"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold tracking-wide text-gray-700 uppercase opacity-50 dark:text-zinc-200">
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

            <div className="text-xs leading-relaxed font-medium text-gray-500 dark:text-zinc-400">
              Tip: drag cabinets on the canvas. Drawer count controls
              available drawer slots for this cabinet.
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
})

CabinetSidebar.displayName = "CabinetSidebar"

export default CabinetSidebar


