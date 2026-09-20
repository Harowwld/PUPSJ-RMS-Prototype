"use client"

import React, { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
import { toast } from "sonner"

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
  showToast = true,
}) {
  const [clickState, setClickState] = useState("idle") // idle, pending, loading, finished

  const handleClick = (e) => {
    setClickState("pending")
    if (onRefresh) onRefresh(e)
  }

  useEffect(() => {
    let timer
    if (clickState === "pending") {
      if (isLoading) {
        setClickState("loading")
      } else {
        // Fallback: If it doesn't enter loading state within 150ms, assume it finished
        timer = setTimeout(() => {
          if (clickState === "pending") {
            setClickState("finished")
          }
        }, 150)
      }
    } else if (clickState === "loading") {
      if (!isLoading) {
        setClickState("finished")
      }
    } else if (clickState === "finished") {
      if (showToast) {
        const toastTitle = title.startsWith("Refresh ") 
          ? title.replace("Refresh ", "") + " Refreshed" 
          : title + " Refreshed"
          
        toast.success(toastTitle, {
          description: "Loaded latest data from repository.",
        })
      }
      setClickState("idle")
    }
    
    return () => {
      if (timer) clearTimeout(timer)
    }
  }, [isLoading, clickState, title, showToast])

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleClick}
          disabled={isLoading || clickState === "pending" || clickState === "loading"}
          className={cn(
            "flex h-10 px-4 items-center justify-center rounded-xl! border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-xs active:scale-95 transition-all cursor-pointer disabled:opacity-50 font-semibold text-xs gap-2",
            className
          )}
        >
          {isLoading || clickState === "pending" || clickState === "loading" ? "Refreshing..." : "Refresh"}
        </Button>
      </TooltipTrigger>
      <TooltipContent className="bg-zinc-900 text-white border-zinc-800">
        <p className="text-[10px] font-semibold">{title}</p>
      </TooltipContent>
    </Tooltip>
  )
}
