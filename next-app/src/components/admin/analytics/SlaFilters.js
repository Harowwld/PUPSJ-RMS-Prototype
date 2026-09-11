"use client"

import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { cn } from "@/lib/utils"
import { format } from "date-fns"

function parseDateLocal(str) {
  if (!str) return undefined
  const [y, m, d] = str.split("-").map(Number)
  if (isNaN(y) || isNaN(m) || isNaN(d)) return undefined
  return new Date(y, m - 1, d)
}

export default function SlaFilters({
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  isLoading,
  onRefresh,
}) {
  const activeShortcut = (() => {
    if (!startDate || !endDate) return null
    const todayStr = format(new Date(), "yyyy-MM-dd")
    
    if (startDate === todayStr && endDate === todayStr) return "today"
    
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayStr = format(yesterday, "yyyy-MM-dd")
    if (startDate === yesterdayStr && endDate === yesterdayStr) return "yesterday"
    
    const last7 = new Date()
    last7.setDate(last7.getDate() - 6)
    if (startDate === format(last7, "yyyy-MM-dd") && endDate === todayStr) return "last7"
    
    const last30 = new Date()
    last30.setDate(last30.getDate() - 29)
    if (startDate === format(last30, "yyyy-MM-dd") && endDate === todayStr) return "last30"
    
    return null
  })()

  const handleQuickRange = (range) => {
    if (activeShortcut === range) {
      setStartDate("")
      setEndDate("")
      return
    }
    const end = new Date()
    let start = new Date()

    switch (range) {
      case "today":
        start.setHours(0, 0, 0, 0)
        break
      case "yesterday":
        start.setDate(start.getDate() - 1)
        start.setHours(0, 0, 0, 0)
        end.setDate(end.getDate() - 1)
        end.setHours(23, 59, 59, 999)
        break
      case "last7":
        start.setDate(start.getDate() - 6)
        start.setHours(0, 0, 0, 0)
        break
      case "last30":
        start.setDate(start.getDate() - 29)
        start.setHours(0, 0, 0, 0)
        break
      default:
        break
    }

    setStartDate(format(start, "yyyy-MM-dd"))
    setEndDate(format(end, "yyyy-MM-dd"))
  }

  return (
    <div className="border-t border-gray-100 dark:border-white/10 p-5 flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3 bg-gray-50/40 dark:bg-zinc-900/30 flex-wrap">
      {/* Time Shortcuts */}
      <div className="flex items-center gap-1 bg-gray-100/80 dark:bg-zinc-800/60 p-1 rounded-xl border border-gray-200/60 dark:border-white/5 shrink-0">
        {[
          { key: "today", label: "Today" },
          { key: "yesterday", label: "Yest." },
          { key: "last7", label: "7d" },
          { key: "last30", label: "30d" },
        ].map((range) => {
          const isActive = activeShortcut === range.key
          return (
            <button
              key={range.key}
              type="button"
              onClick={() => handleQuickRange(range.key)}
              disabled={isLoading}
              className={cn(
                "px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer whitespace-nowrap",
                isActive
                  ? "bg-white dark:bg-zinc-700 text-gray-900 dark:text-white shadow-xs"
                  : "text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white"
              )}
            >
              {range.label}
            </button>
          )
        })}
      </div>

      {/* Date Range Pickers */}
      <div className="flex items-center gap-1.5 shrink-0">
        <div className="w-[105px]">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                disabled={isLoading}
                className={cn(
                  "h-9 w-full justify-start rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 text-left text-xs font-normal shadow-xs transition-all hover:bg-gray-50 dark:hover:bg-zinc-700 px-2.5 cursor-pointer",
                  !startDate ? "text-gray-400 dark:text-zinc-500" : "text-gray-700 dark:text-zinc-200"
                )}
              >
                {startDate ? format(parseDateLocal(startDate), "MMM d") : "Start"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto rounded-2xl border border-gray-200 bg-white p-0 shadow-2xl dark:border-white/10 dark:bg-card" align="start">
              <Calendar
                mode="single"
                selected={startDate ? parseDateLocal(startDate) : undefined}
                onSelect={(date) => {
                  setStartDate(date ? format(date, "yyyy-MM-dd") : "")
                }}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
        <span className="text-[11px] text-gray-400 dark:text-zinc-500">→</span>
        <div className="w-[105px]">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                disabled={isLoading}
                className={cn(
                  "h-9 w-full justify-start rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 text-left text-xs font-normal shadow-xs transition-all hover:bg-gray-50 dark:hover:bg-zinc-700 px-2.5 cursor-pointer",
                  !endDate ? "text-gray-400 dark:text-zinc-500" : "text-gray-700 dark:text-zinc-200"
                )}
              >
                {endDate ? format(parseDateLocal(endDate), "MMM d") : "End"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto rounded-2xl border border-gray-200 bg-white p-0 shadow-2xl dark:border-white/10 dark:bg-card" align="start">
              <Calendar
                mode="single"
                selected={endDate ? parseDateLocal(endDate) : undefined}
                onSelect={(date) => {
                  setEndDate(date ? format(date, "yyyy-MM-dd") : "")
                }}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </div>
  )
}

