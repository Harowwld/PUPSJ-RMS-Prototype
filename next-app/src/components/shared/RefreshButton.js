"use client"

import React from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"

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
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onRefresh}
          disabled={isLoading}
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-xl! border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-xs active:scale-95 transition-all cursor-pointer p-0 disabled:opacity-50",
            className
          )}
        >
          <i
            className={cn(
              "ph-bold ph-arrows-clockwise text-[16px] text-gray-600 dark:text-zinc-300 flex items-center justify-center leading-none",
              isLoading && "animate-spin"
            )}
          />
        </Button>
      </TooltipTrigger>
      <TooltipContent className="bg-zinc-900 text-white border-zinc-800">
        <p className="text-[10px] font-semibold">{title}</p>
      </TooltipContent>
    </Tooltip>
  )
}
