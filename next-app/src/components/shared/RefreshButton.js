"use client"

import React from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

/**
 * A standardized refresh button component.
 * 
 * @param {function} onRefresh - Refresh handler
 * @param {boolean} isLoading - Loading state
 * @param {string} className - Optional additional classes
 * @param {string} title - Button tooltip title
 */
export function RefreshButton({
  onRefresh,
  isLoading,
  className,
  title = "Refresh",
}) {
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={onRefresh}
      disabled={isLoading}
      className={cn(
        "flex h-10 w-10 items-center justify-center rounded-brand border border-gray-300 dark:border-white/10 dark:border-white/10 bg-white dark:bg-card p-0 text-gray-600 dark:text-zinc-300 dark:text-zinc-400 shadow-sm dark:shadow-none transition-all hover:border-gray-300 dark:border-white/10 dark:hover:border-zinc-700 hover:bg-red-50 dark:bg-red-950/30 dark:hover:bg-red-900/20 hover:text-pup-maroon dark:hover:text-red-500 dark:hover:text-red-500 active:scale-95 disabled:opacity-50",
        className
      )}
      title={title}
    >
      <i
        className={cn(
          "ph-bold ph-arrows-clockwise text-base",
          isLoading && "animate-spin inline-block"
        )}
      ></i>
    </Button>
  )
}

