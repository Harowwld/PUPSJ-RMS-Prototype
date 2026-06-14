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
  actionIcon, // ignored to remove icons inside buttons
  actionVariant = "danger", // danger or success/neutral
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
    <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2">
      <div className="flex min-w-[320px] w-fit items-center gap-3 rounded-[12px] border border-black/[0.12] dark:border-white/10 bg-white dark:bg-zinc-900 py-[10px] px-[16px] shadow-none">
        
        {/* Count Label (Plain text, no red circle badge, no background pill) */}
        <span className="text-[13px] font-medium text-[#111111] dark:text-zinc-100 whitespace-nowrap">
          {selectedCount} selected
        </span>

        {/* Divider */}
        <div className="w-[0.5px] bg-black/10 dark:bg-white/10 h-4 shrink-0" />

        {/* Action buttons area */}
        <div className="flex items-center gap-3 ml-auto flex-1 justify-end">
          {customContent ? (
            customContent
          ) : (
            <>
              {/* Deselect All - Plain text, no border/background */}
              <button
                type="button"
                onClick={onCancel}
                className="h-auto text-[13px] font-normal text-[#8E8E93] hover:text-[#111111] dark:hover:text-white bg-transparent hover:bg-transparent border-0 p-0 shadow-none cursor-pointer whitespace-nowrap"
              >
                Deselect All
              </button>
              
              {actionLabel && (
                <Button
                  size="sm"
                  onClick={onAction}
                  className={cn(
                    "flex h-[36px] items-center justify-center rounded-[8px] px-5 text-[13px] transition-all active:scale-95 shadow-none cursor-pointer whitespace-nowrap",
                    actionVariant === "danger" 
                      ? "btn-brand-red text-white font-medium" 
                      : actionVariant === "success"
                      ? "btn-brand-green text-white font-medium"
                      : "border border-black/15 bg-white text-[#111111] hover:bg-black/[0.02] font-normal dark:border-white/15 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700/50"
                  )}
                >
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
