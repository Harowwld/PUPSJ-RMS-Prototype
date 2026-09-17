"use client"

import LucideIcon from "@/components/shared/LucideIcon";
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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

export default function BackupFilters({
  localSearch,
  handleSearchChange,
  backupStartDate,
  setBackupStartDate,
  backupEndDate,
  setBackupEndDate,
  setPage,
  setLocalSearch,
  setBackupSearch,
  backupTotal = 0,
  isLoading = false,
}) {
  const handleQuickRange = (range) => {
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

    setBackupStartDate(format(start, "yyyy-MM-dd"))
    setBackupEndDate(format(end, "yyyy-MM-dd"))
    setPage?.(1)
  }

  const activeShortcut = (() => {
    if (!backupStartDate || !backupEndDate) return null
    const todayStr = format(new Date(), "yyyy-MM-dd")

    if (backupStartDate === todayStr && backupEndDate === todayStr) return "today"

    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const yestStr = format(yesterday, "yyyy-MM-dd")
    if (backupStartDate === yestStr && backupEndDate === yestStr) return "yesterday"

    const last7 = new Date()
    last7.setDate(last7.getDate() - 6)
    if (backupStartDate === format(last7, "yyyy-MM-dd") && backupEndDate === todayStr) return "last7"

    const last30 = new Date()
    last30.setDate(last30.getDate() - 29)
    if (backupStartDate === format(last30, "yyyy-MM-dd") && backupEndDate === todayStr) return "last30"

    return null
  })()

  return (
    <div className="border-t border-gray-100 dark:border-white/10 p-5 flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3 bg-gray-50/40 dark:bg-zinc-900/30 flex-wrap">
      {/* Search Bar: Fixed width (sm:w-64), aligned right with other controls */}
      <div className="relative w-full sm:w-64 shrink-0 group">
        <LucideIcon  className="ph-bold ph-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-zinc-500 transition-colors group-focus-within:text-pup-maroon dark:group-focus-within:text-red-400 text-xs pointer-events-none" />
        <Input
          type="text"
          placeholder="Search archive filename..."
          className="pl-8 pr-7 h-9 text-xs w-full bg-white dark:bg-zinc-800 border border-gray-200 dark:border-white/10 rounded-xl placeholder:text-gray-400 dark:placeholder:text-zinc-500 text-gray-900 dark:text-zinc-100 shadow-none focus-visible:outline-none focus-visible:border-pup-maroon focus-visible:ring-1 focus-visible:ring-pup-maroon dark:focus-visible:border-red-500/80 dark:focus-visible:ring-red-500/80"
          value={localSearch}
          onChange={handleSearchChange}
          disabled={isLoading}
        />
        {localSearch && (
          <button
            type="button"
            onClick={() => {
              setLocalSearch("")
              setBackupSearch("")
              setPage?.(1)
            }}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-600 dark:text-zinc-500 dark:hover:text-zinc-300 transition-colors cursor-pointer border-0 bg-transparent p-0 leading-none"
            aria-label="Clear search"
          >
            ×
          </button>
        )}
      </div>

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

      {/* Date pickers */}
      <div className="flex items-center gap-1.5 shrink-0">
        <div className="w-[105px]">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "h-9 w-full justify-start rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 text-left text-xs font-normal shadow-xs transition-all hover:bg-gray-50 dark:hover:bg-zinc-700 px-2.5 cursor-pointer",
                  !backupStartDate ? "text-gray-400 dark:text-zinc-500" : "text-gray-700 dark:text-zinc-200"
                )}
              >
                {backupStartDate ? format(parseDateLocal(backupStartDate), "MMM d") : "Start"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto rounded-2xl border border-gray-200 bg-white p-0 shadow-2xl dark:border-white/10 dark:bg-card" align="start">
              <Calendar
                mode="single"
                selected={backupStartDate ? parseDateLocal(backupStartDate) : undefined}
                onSelect={(date) => {
                  setBackupStartDate(date ? format(date, "yyyy-MM-dd") : "")
                  setPage?.(1)
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
                className={cn(
                  "h-9 w-full justify-start rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 text-left text-xs font-normal shadow-xs transition-all hover:bg-gray-50 dark:hover:bg-zinc-700 px-2.5 cursor-pointer",
                  !backupEndDate ? "text-gray-400 dark:text-zinc-500" : "text-gray-700 dark:text-zinc-200"
                )}
              >
                {backupEndDate ? format(parseDateLocal(backupEndDate), "MMM d") : "End"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto rounded-2xl border border-gray-200 bg-white p-0 shadow-2xl dark:border-white/10 dark:bg-card" align="start">
              <Calendar
                mode="single"
                selected={backupEndDate ? parseDateLocal(backupEndDate) : undefined}
                onSelect={(date) => {
                  setBackupEndDate(date ? format(date, "yyyy-MM-dd") : "")
                  setPage?.(1)
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
