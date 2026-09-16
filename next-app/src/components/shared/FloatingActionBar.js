"use client"

import { useState, useEffect } from "react"
import { createPortal } from "react-dom"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export default function FloatingActionBar({
  selectedCount = 0,
  onCancel,
  onClearSelection,
  onAction,
  actionLabel,
  actionIcon, // ignored to adhere to HIG text-only button guidelines
  actionVariant = "danger", // danger | success | neutral | outline | warning
  selectionLabel,
  selectionStatus,
  customContent,
  actions,
  children,
  showOnSingle = true,
  hideDeselectAll = false,
}) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 0)
    return () => clearTimeout(timer)
  }, [])

  const count = Number(selectedCount) || 0
  const limit = showOnSingle ? 0 : 1

  if (!mounted || count <= limit) return null

  const handleCancel = onCancel || onClearSelection

  const renderActionButtons = () => {
    // 1. If customContent or children is provided as a raw React element, render it
    if (customContent) return customContent
    if (children) return children

    // 2. If actions is provided as an array of objects: [{ label, onClick, variant, disabled }]
    if (Array.isArray(actions)) {
      return (
        <div className="flex items-center gap-2.5">
          {!hideDeselectAll && handleCancel && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCancel}
              className="flex h-[36px] items-center justify-center rounded-xl px-4 text-[13px] font-medium border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-xs cursor-pointer active:scale-95 transition-all whitespace-nowrap"
            >
              Deselect All
            </Button>
          )}
          {actions.map((act, idx) => (
            <Button
              key={act.label || idx}
              size="sm"
              onClick={act.onClick}
              disabled={act.disabled}
              className={cn(
                "flex h-[36px] items-center justify-center rounded-xl px-5 text-[13px] font-medium transition-all active:scale-95 shadow-none cursor-pointer whitespace-nowrap",
                act.variant === "danger"
                  ? "btn-brand-red !text-white text-white"
                  : act.variant === "success"
                  ? "btn-brand-green !text-white text-white"
                  : act.variant === "warning"
                  ? "bg-amber-600 hover:bg-amber-700 !text-white text-white"
                  : "border border-black/15 bg-white text-[#111111] hover:bg-black/[0.02] font-normal dark:border-white/15 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700/50"
              )}
            >
              {act.label}
            </Button>
          ))}
        </div>
      )
    }

    // 3. If actions is provided as a React element (JSX)
    if (actions) {
      return (
        <div className="flex items-center gap-2.5">
          {!hideDeselectAll && handleCancel && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCancel}
              className="flex h-[36px] items-center justify-center rounded-xl px-4 text-[13px] font-medium border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-xs cursor-pointer active:scale-95 transition-all whitespace-nowrap"
            >
              Deselect All
            </Button>
          )}
          {actions}
        </div>
      )
    }

    // 4. Default: single action button with Deselect All
    return (
      <div className="flex items-center gap-2.5">
        {!hideDeselectAll && handleCancel && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleCancel}
            className="flex h-[36px] items-center justify-center rounded-xl px-4 text-[13px] font-medium border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-xs cursor-pointer active:scale-95 transition-all whitespace-nowrap"
          >
            Deselect All
          </Button>
        )}

        {actionLabel && (
          <Button
            size="sm"
            onClick={onAction}
            className={cn(
              "flex h-[36px] items-center justify-center rounded-xl px-5 text-[13px] font-medium transition-all active:scale-95 shadow-none cursor-pointer whitespace-nowrap",
              actionVariant === "danger"
                ? "btn-brand-red !text-white text-white"
                : actionVariant === "success"
                ? "btn-brand-green !text-white text-white"
                : actionVariant === "warning"
                ? "bg-amber-600 hover:bg-amber-700 !text-white text-white"
                : "border border-black/15 bg-white text-[#111111] hover:bg-black/[0.02] font-normal dark:border-white/15 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700/50"
            )}
          >
            {actionLabel}
          </Button>
        )}
      </div>
    )
  }

  return createPortal(
    <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 animate-in fade-in-0 slide-in-from-bottom-3 duration-200">
      <div className="flex min-w-[320px] w-fit items-center gap-3 rounded-2xl border border-black/[0.12] dark:border-white/10 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md py-[10px] px-[16px] shadow-xl">
        {/* Count Label (Plain text, no red circle badge, no background pill) */}
        <span className="text-[13px] font-medium text-[#111111] dark:text-zinc-100 whitespace-nowrap">
          {count} selected
        </span>

        {/* Divider */}
        <div className="w-[0.5px] bg-black/10 dark:bg-white/10 h-4 shrink-0" />

        {/* Action buttons area */}
        <div className="flex items-center gap-3 ml-auto flex-1 justify-end">
          {renderActionButtons()}
        </div>
      </div>
    </div>,
    document.body
  )
}
