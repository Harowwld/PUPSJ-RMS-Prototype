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
          variant="ghost"
          size="sm"
          onClick={onRefresh}
          disabled={isLoading}
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-full p-0 text-gray-500 hover:text-pup-maroon hover:bg-gray-100 dark:text-zinc-400 dark:hover:text-primary dark:hover:bg-white/5 active:scale-95 disabled:opacity-50",
            isLoading && "animate-refresh-glow",
            className
          )}
        >
          <i
            className={cn(
              "ph-bold ph-arrows-clockwise text-base",
              isLoading && "animate-spin inline-block"
            )}
          ></i>
        </Button>
      </TooltipTrigger>
      <TooltipContent className="bg-zinc-900 text-white border-zinc-800">
        <p className="text-[10px] font-semibold">{title}</p>
      </TooltipContent>
    </Tooltip>
  )
}
