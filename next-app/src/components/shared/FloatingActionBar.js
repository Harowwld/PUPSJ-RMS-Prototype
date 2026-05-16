"use client"

import { useState, useEffect } from "react"
import { createPortal } from "react-dom"
import { Button } from "@/components/ui/button"

export default function FloatingActionBar({
  selectedCount,
  onCancel,
  onAction,
  actionLabel,
  actionIcon,
  actionVariant = "danger", // danger or success
  selectionLabel = "Records Selected",
  selectionStatus = "Batch In-Progress",
  customContent,
}) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted || selectedCount === 0) return null

  return createPortal(
    <div className="fixed bottom-10 left-1/2 z-[9999] -translate-x-1/2 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="flex items-center gap-6 rounded-2xl border border-gray-200 bg-white/95 p-3 px-6 shadow-[0_20px_50px_rgba(0,0,0,0.15)] backdrop-blur-md">
        <div className="flex items-center gap-3 border-r border-gray-100 pr-6">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-pup-maroon text-xs font-black text-white shadow-lg shadow-red-900/20">
            {selectedCount}
          </div>
          <div>
            <p className="text-[10px] font-black tracking-widest text-gray-400 uppercase">
              {selectionLabel}
            </p>
            <p className="text-xs font-bold text-gray-900">
              {selectionStatus}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {customContent ? (
            customContent
          ) : (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={onCancel}
                className="h-9 px-4 text-xs font-bold text-gray-500 transition-colors hover:bg-red-50/30 hover:text-pup-maroon"
              >
                DESELECT ALL
              </Button>
              
              {actionLabel && (
                <Button
                  size="sm"
                  onClick={onAction}
                  className={`flex h-10 items-center gap-2 rounded-xl px-6 text-xs font-bold uppercase text-white shadow-lg transition-all active:scale-95 ${
                    actionVariant === "success"
                      ? "bg-emerald-600 shadow-emerald-600/20 hover:bg-emerald-700"
                      : "bg-red-600 shadow-red-600/20 hover:bg-red-700"
                  }`}
                >
                  {actionIcon && <i className={`ph-bold ${actionIcon} text-sm`}></i>}
                  {actionLabel}
                </Button>
              )}
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}
