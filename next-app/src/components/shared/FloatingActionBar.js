"use client"

import { useState, useEffect } from "react"
import { createPortal } from "react-dom"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export default function FloatingActionBar({
  selectedCount,
  onCancel,
  onAction,
  actionLabel,
  actionIcon,
  actionVariant = "danger", // danger or success
  selectionLabel = "Records Selected",
  selectionStatus = "Items Selected",
  customContent,
  showOnSingle = false,
}) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 0)
    return () => clearTimeout(timer)
  }, [])

  const limit = showOnSingle ? 0 : 1
  if (!mounted || selectedCount <= limit) return null

  return createPortal(
    <div className="fixed bottom-10 left-1/2 z-[9999] -translate-x-1/2 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="flex items-center gap-6 rounded-brand border border-gray-200 bg-white p-3 px-6 shadow-[0_20px_50px_rgba(0,0,0,0.15)] backdrop-blur-md dark:border-white/10 dark:bg-card/95">
        <div className="flex items-center gap-3 border-r border-gray-100 pr-6 dark:border-white/10">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-pup-maroon dark:bg-[#b94642] text-white shadow-sm">
            <span className="text-xs font-bold">{selectedCount}</span>
          </div>
          <span className="text-sm font-bold text-gray-700 dark:text-zinc-200">
            {selectionStatus}
          </span>
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
                className="h-9 px-4 text-xs font-bold text-gray-500 transition-colors hover:bg-red-50 hover:text-pup-maroon dark:hover:text-red-500 dark:text-zinc-400 dark:bg-red-950/30"
              >
                DESELECT ALL
              </Button>
              
              {actionLabel && (
                <Button
                  size="sm"
                  onClick={onAction}
                  className={cn(
                    "flex h-10 items-center gap-2 rounded-brand px-6 text-xs font-black  text-white shadow-lg transition-all active:scale-95",
                    actionVariant === "success" 
                      ? "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-900/20" 
                      : "btn-brand-red"
                  )}
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

