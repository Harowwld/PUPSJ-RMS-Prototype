"use client"

import HugeIcon from "@/components/shared/HugeIcon";
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
import { Select } from "@/components/ui/select"

function parseDateLocal(str) {
  if (!str) return undefined
  const [y, m, d] = str.split("-").map(Number)
  if (isNaN(y) || isNaN(m) || isNaN(d)) return undefined
  return new Date(y, m - 1, d)
}

export default function LogFilters({
  localSearch,
  handleSearchChange,
  logRoleFilter,
  handleRoleChange,
  logSeverityFilter,
  handleSeverityChange,
  logStartDate,
  setLogStartDate,
  logEndDate,
  setLogEndDate,
  setLogPage,
  setLocalSearch,
  setLogSearch,
  setLogRoleFilter,
  setLogSeverityFilter,
  logTotal = 0,
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

    setLogStartDate(format(start, "yyyy-MM-dd"))
    setLogEndDate(format(end, "yyyy-MM-dd"))
    setLogPage(1)
  }

  const activeShortcut = (() => {
    if (!logStartDate || !logEndDate) return null
    const todayStr = format(new Date(), "yyyy-MM-dd")

    if (logStartDate === todayStr && logEndDate === todayStr) return "today"

    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const yestStr = format(yesterday, "yyyy-MM-dd")
    if (logStartDate === yestStr && logEndDate === yestStr) return "yesterday"

    const last7 = new Date()
    last7.setDate(last7.getDate() - 6)
    if (logStartDate === format(last7, "yyyy-MM-dd") && logEndDate === todayStr) return "last7"

    const last30 = new Date()
    last30.setDate(last30.getDate() - 29)
    if (logStartDate === format(last30, "yyyy-MM-dd") && logEndDate === todayStr) return "last30"

    return null
  })()

  return (
    <div className="border-t border-gray-100 dark:border-white/10 p-5 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 bg-gray-50/40 dark:bg-zinc-900/30">
      {/* Left: Severity Filter Line Tabs */}
      <div className="flex items-center gap-6 shrink-0 select-none overflow-x-auto">
        <button
          type="button"
          onClick={() => {
            setLogSeverityFilter("All")
            setLogPage(1)
          }}
          className={cn(
            "relative h-9 flex items-center text-[13px] font-semibold transition-colors focus:outline-none cursor-pointer border-0 bg-transparent whitespace-nowrap",
            logSeverityFilter === "All"
              ? "text-gray-900 dark:text-zinc-50 after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-full after:bg-gray-900 dark:after:bg-zinc-50"
              : "text-[#8E8E93] font-normal hover:text-gray-700 dark:hover:text-zinc-200"
          )}
        >
          All Events ({logTotal > 0 ? logTotal.toLocaleString() : 0})
        </button>

        <button
          type="button"
          onClick={() => {
            setLogSeverityFilter("INFO")
            setLogPage(1)
          }}
          className={cn(
            "relative h-9 flex items-center text-[13px] font-semibold transition-colors focus:outline-none cursor-pointer border-0 bg-transparent whitespace-nowrap",
            logSeverityFilter === "INFO"
              ? "text-gray-900 dark:text-zinc-50 after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-full after:bg-gray-900 dark:after:bg-zinc-50"
              : "text-[#8E8E93] font-normal hover:text-gray-700 dark:hover:text-zinc-200"
          )}
        >
          Information
        </button>

        <button
          type="button"
          onClick={() => {
            setLogSeverityFilter("WARNING")
            setLogPage(1)
          }}
          className={cn(
            "relative h-9 flex items-center text-[13px] font-semibold transition-colors focus:outline-none cursor-pointer border-0 bg-transparent whitespace-nowrap",
            logSeverityFilter === "WARNING"
              ? "text-gray-900 dark:text-zinc-50 after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-full after:bg-gray-900 dark:after:bg-zinc-50"
              : "text-[#8E8E93] font-normal hover:text-gray-700 dark:hover:text-zinc-200"
          )}
        >
          Warnings
        </button>

        <button
          type="button"
          onClick={() => {
            setLogSeverityFilter("CRITICAL")
            setLogPage(1)
          }}
          className={cn(
            "relative h-9 flex items-center text-[13px] font-semibold transition-colors focus:outline-none cursor-pointer border-0 bg-transparent whitespace-nowrap",
            logSeverityFilter === "CRITICAL"
              ? "text-gray-900 dark:text-zinc-50 after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-full after:bg-gray-900 dark:after:bg-zinc-50"
              : "text-[#8E8E93] font-normal hover:text-gray-700 dark:hover:text-zinc-200"
          )}
        >
          Critical
        </button>
      </div>

      {/* Right: Search, Role, Time, and Date Range Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-wrap">
        {/* Search */}
        <div className="relative flex-1 sm:w-64 min-w-[200px] group">
          <HugeIcon  className="ph-bold ph-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-zinc-500 transition-colors group-focus-within:text-pup-maroon dark:group-focus-within:text-red-400 text-xs pointer-events-none" />
          <Input
            type="text"
            placeholder="Search logs by actor, action..."
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
                setLogSearch("")
                setLogPage(1)
              }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-600 dark:text-zinc-500 dark:hover:text-zinc-300 transition-colors cursor-pointer border-0 bg-transparent p-0 leading-none"
              aria-label="Clear search"
            >
              ×
            </button>
          )}
        </div>

        {/* Role Select */}
        <div className="w-[140px]">
          <Select
            value={logRoleFilter}
            onChange={handleRoleChange}
            disabled={isLoading}
            className="h-9 rounded-xl border border-gray-200 text-xs font-normal bg-white dark:bg-zinc-800 dark:border-white/10 cursor-pointer shadow-none"
            menuClassName="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-900 shadow-2xl p-1.5"
            optionClassName="rounded-lg text-xs font-normal py-1.5 px-2.5 hover:bg-gray-100 dark:hover:bg-zinc-800"
          >
            <option value="All">All Roles</option>
            <option value="Admin">Admin</option>
            <option value="Staff">Staff</option>
            <option value="System">System</option>
          </Select>
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
                    !logStartDate ? "text-gray-400 dark:text-zinc-500" : "text-gray-700 dark:text-zinc-200"
                  )}
                >
                  {logStartDate ? format(parseDateLocal(logStartDate), "MMM d") : "Start"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto rounded-2xl border border-gray-200 bg-white p-0 shadow-2xl dark:border-white/10 dark:bg-card" align="start">
                <Calendar
                  mode="single"
                  selected={logStartDate ? parseDateLocal(logStartDate) : undefined}
                  onSelect={(date) => {
                    setLogStartDate(date ? format(date, "yyyy-MM-dd") : "")
                    setLogPage(1)
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
                    !logEndDate ? "text-gray-400 dark:text-zinc-500" : "text-gray-700 dark:text-zinc-200"
                  )}
                >
                  {logEndDate ? format(parseDateLocal(logEndDate), "MMM d") : "End"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto rounded-2xl border border-gray-200 bg-white p-0 shadow-2xl dark:border-white/10 dark:bg-card" align="start">
                <Calendar
                  mode="single"
                  selected={logEndDate ? parseDateLocal(logEndDate) : undefined}
                  onSelect={(date) => {
                    setLogEndDate(date ? format(date, "yyyy-MM-dd") : "")
                    setLogPage(1)
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </div>
    </div>
  )
}
