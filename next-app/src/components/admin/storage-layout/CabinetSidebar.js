"use client"

import { memo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
  rotateSelectedCabinet,
  duplicateSelectedCabinet,
  setBulkConfirmOpen,
  removeDrawerFromSelected,
  addDrawerToSelected,
  updateSelectedRectFromNormalized,
  updateSelectedSizeNormalized
}) => {
  return (
    <Card className="overflow-hidden rounded-brand border border-gray-200 shadow-sm">
      <CardHeader className="border-b border-gray-100 bg-gray-50/50 p-6">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-white text-pup-maroon shadow-sm">
            <i className="ph-duotone ph-archive text-2xl"></i>
          </div>
          <div>
            <CardTitle className="text-xl leading-none font-black tracking-tight text-gray-900">
              Cabinet Details
            </CardTitle>
            <CardDescription className="mt-1.5 text-sm font-medium text-gray-500">
              {selectedCabinetIds.size > 1
                ? `${selectedCabinetIds.size} cabinets selected`
                : selectedCabinet
                  ? `CAB-${selectedCabinet.id}`
                  : "Select a cabinet on the map"}
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4">
        {selectedCabinetIds.size > 1 ? (
          <div className="flex h-[320px] flex-col items-center justify-center text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-gray-200 bg-gray-50 text-pup-maroon shadow-sm">
              <i className="ph-duotone ph-stack text-3xl"></i>
            </div>
            <h3 className="text-lg font-bold text-gray-900">
              Multiple Selection
            </h3>
            <p className="mt-1 max-w-[220px] text-sm font-medium text-gray-600">
              You can drag the group on the canvas or use the bulk
              actions below.
            </p>
          </div>
        ) : !selectedCabinet ? (
          <Empty className="flex h-[320px] flex-col items-center justify-center border-0 text-center text-gray-500">
            <EmptyHeader className="flex flex-col items-center gap-0">
              <EmptyMedia className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-gray-200 bg-white shadow-sm">
                <i className="ph-duotone ph-mouse-left-click text-3xl text-pup-maroon"></i>
              </EmptyMedia>
              <EmptyTitle className="text-lg font-bold text-gray-900">
                No cabinet selected
              </EmptyTitle>
              <EmptyDescription className="mt-1 max-w-[200px] text-sm font-medium text-gray-600">
                Select a cabinet on the map to edit its properties.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={rotateSelectedCabinet}
                className="h-10 rounded-brand border-gray-300 px-4 font-bold shadow-sm hover:border-pup-maroon hover:bg-red-50/30"
              >
                <i className="ph-bold ph-arrow-clockwise mr-2 text-pup-maroon" />
                ROTATE
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={duplicateSelectedCabinet}
                className="h-10 rounded-brand border-gray-300 px-4 font-bold shadow-sm hover:border-pup-maroon hover:bg-red-50/30"
              >
                <i className="ph-bold ph-copy mr-2 text-pup-maroon" />
                DUPLICATE
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setBulkConfirmOpen(true)}
                className="h-10 rounded-brand border-gray-300 px-4 font-bold shadow-sm hover:border-pup-maroon hover:bg-red-50/30 lg:col-span-2"
              >
                <i className="ph-bold ph-trash mr-2 text-pup-maroon" />
                REMOVE CABINET
              </Button>
            </div>

            <div>
              <div className="mb-2 text-xs font-bold tracking-wide text-gray-700 uppercase">
                Drawer count
              </div>
              <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 p-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 rounded-lg transition-all hover:bg-white hover:shadow-sm"
                  onClick={removeDrawerFromSelected}
                  disabled={
                    (selectedCabinet.drawerIds || []).length <= 1
                  }
                >
                  <i className="ph-bold ph-minus" />
                </Button>

                <div className="flex-1 text-center">
                  <span className="text-lg font-black text-gray-900">
                    {(selectedCabinet.drawerIds || []).length}
                  </span>
                  <span className="ml-2 text-xs font-bold tracking-tight text-gray-500 uppercase">
                    Drawers
                  </span>
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 rounded-lg transition-all hover:bg-white hover:shadow-sm"
                  onClick={addDrawerToSelected}
                >
                  <i className="ph-bold ph-plus" />
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-bold tracking-wide text-gray-700 uppercase">
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
                  className="h-10 rounded-brand border border-gray-300 bg-white text-sm focus-visible:border-pup-maroon focus-visible:ring-2 focus-visible:ring-pup-maroon focus-visible:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold tracking-wide text-gray-700 uppercase">
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
                  className="h-10 rounded-brand border border-gray-300 bg-white text-sm focus-visible:border-pup-maroon focus-visible:ring-2 focus-visible:ring-pup-maroon focus-visible:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-bold tracking-wide text-gray-700 uppercase">
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
                  className="h-10 rounded-brand border border-gray-300 bg-white text-sm focus-visible:border-pup-maroon focus-visible:ring-2 focus-visible:ring-pup-maroon focus-visible:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold tracking-wide text-gray-700 uppercase">
                  Height (%)
                </label>
                <Input
                  type="number"
                  step="1"
                  value={toPct(selectedCabinet.rect.h)}
                  onChange={(e) => {
                    if (e.target.value === "") return
                    const val = Number(e.target.value)
                    if (!Number.isFinite(val)) return
                    updateSelectedSizeNormalized(
                      selectedCabinet.rect.w,
                      fromPct(val)
                    )
                  }}
                  className="h-10 rounded-brand border border-gray-300 bg-white text-sm focus-visible:border-pup-maroon focus-visible:ring-2 focus-visible:ring-pup-maroon focus-visible:outline-none"
                />
              </div>
            </div>

            <div className="text-xs leading-relaxed font-medium text-gray-500">
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
