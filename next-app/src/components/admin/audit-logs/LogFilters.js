"use client"

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
  logTotal,
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
        start.setDate(start.getDate() - 7)
        start.setHours(0, 0, 0, 0)
        break
      case "last30":
        start.setDate(start.getDate() - 30)
        start.setHours(0, 0, 0, 0)
        break
    }

    setLogStartDate(format(start, "yyyy-MM-dd"))
    setLogEndDate(format(end, "yyyy-MM-dd"))
    setLogPage(1)
  }

  const activeShortcut = (() => {
    if (!logStartDate || !logEndDate) return null
    const todayStr = format(new Date(), "yyyy-MM-dd")
    
    // Check Today
    if (logStartDate === todayStr && logEndDate === todayStr) return "today"
    
    // Check Yesterday
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayStr = format(yesterday, "yyyy-MM-dd")
    if (logStartDate === yesterdayStr && logEndDate === yesterdayStr) return "yesterday"
    
    // Check 7 days
    const last7 = new Date()
    last7.setDate(last7.getDate() - 7)
    const last7Str = format(last7, "yyyy-MM-dd")
    if (logStartDate === last7Str && logEndDate === todayStr) return "last7"
    
    // Check 30 days
    const last30 = new Date()
    last30.setDate(last30.getDate() - 30)
    const last30Str = format(last30, "yyyy-MM-dd")
    if (logStartDate === last30Str && logEndDate === todayStr) return "last30"
    
    return null
  })()

  return (
    <div className="bg-white border-t border-gray-100 p-4 backdrop-blur-md dark:bg-card/50 dark:border-white/10">
      <div className="flex w-full flex-wrap items-center gap-5">
        {/* Search */}
        <div className="flex-[2] min-w-[280px] group relative">
          <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
            <i className="ph-bold ph-magnifying-glass text-gray-400 transition-colors group-focus-within:text-pup-maroon dark:text-zinc-500 text-sm"></i>
          </div>
          <Input
            type="text"
            placeholder="Search by actor, action, or details..."
            className="h-[36px] w-full rounded-[8px] border-[0.5px] border-gray-200 bg-white pl-9 pr-20 text-[13px] font-normal transition-all focus:border-pup-maroon/30 focus:ring-4 focus:ring-pup-maroon/5 placeholder:text-gray-400 dark:border-white/10 dark:bg-card dark:text-zinc-300 dark:focus:border-primary"
            value={localSearch}
            onChange={handleSearchChange}
          />
          <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-[12px] font-normal text-gray-400 dark:text-zinc-500">
            {logTotal > 0 ? `${logTotal.toLocaleString()} results` : "0 results"}
          </div>
        </div>

        {/* Role Select */}
        <div className="min-w-[120px] flex-1">
          <Select
            value={logRoleFilter}
            onChange={handleRoleChange}
            className="h-[36px] rounded-[8px] border-[0.5px] border-gray-200 text-[13px] font-normal"
          >
            <option value="All">Role</option>
            <option value="Admin">Admin</option>
            <option value="Staff">Staff</option>
            <option value="System">System</option>
          </Select>
        </div>

        {/* Severity Select */}
        <div className="min-w-[130px] flex-1">
          <Select
            value={logSeverityFilter}
            onChange={handleSeverityChange}
            className="h-[36px] rounded-[8px] border-[0.5px] border-gray-200 text-[13px] font-normal"
          >
            <option value="All">Severity</option>
            <option value="INFO">Information</option>
            <option value="WARNING">Warning</option>
            <option value="CRITICAL">Critical</option>
          </Select>
        </div>

        {/* Time Period shortcuts */}
        <div className="flex items-center gap-[12px] h-[36px] flex-none">
          {[
            { key: "today", label: "Today" },
            { key: "yesterday", label: "Yesterday" },
            { key: "last7", label: "7 days" },
            { key: "last30", label: "30 days" },
          ].map((range) => {
            const isActive = activeShortcut === range.key
            return (
              <button
                key={range.key}
                type="button"
                onClick={() => handleQuickRange(range.key)}
                className={cn(
                  "text-[12px] font-normal transition-all bg-transparent border-0 cursor-pointer shadow-none focus:outline-none focus:ring-0 pb-1",
                  isActive 
                    ? "text-[#03a10e] dark:text-[#03a10e] border-b-[2px] border-[#03a10e] dark:border-[#03a10e] font-medium" 
                    : "text-gray-400 dark:text-zinc-500 hover:text-gray-600 dark:hover:text-zinc-300"
                )}
              >
                {range.label}
              </button>
            )
          })}
        </div>

        {/* Date range picker */}
        <div className="flex items-center gap-2 flex-none">
          <div className="w-[120px]">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "h-[36px] w-full justify-start rounded-[8px] border-[0.5px] border-gray-200 dark:border-white/10 bg-white dark:bg-card text-left text-[13px] font-normal shadow-xs transition-all hover:bg-gray-50 dark:hover:bg-white/10",
                    !logStartDate ? "text-gray-400 dark:text-zinc-500" : "text-gray-700 dark:text-zinc-200"
                  )}
                >
                  {logStartDate ? format(new Date(logStartDate), "MMM d, yyyy") : "Start Date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto rounded-2xl border border-gray-200 bg-white p-0 shadow-2xl dark:border-white/10 dark:bg-card" align="start">
                <Calendar
                  mode="single"
                  selected={logStartDate ? new Date(logStartDate) : undefined}
                  onSelect={(date) => {
                    setLogStartDate(date ? format(date, "yyyy-MM-dd") : "")
                    setLogPage(1)
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
          <div className="text-[12px] text-gray-400 dark:text-zinc-500 shrink-0">
            →
          </div>
          <div className="w-[120px]">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "h-[36px] w-full justify-start rounded-[8px] border-[0.5px] border-gray-200 dark:border-white/10 bg-white dark:bg-card text-left text-[13px] font-normal shadow-xs transition-all hover:bg-gray-50 dark:hover:bg-white/10",
                    !logEndDate ? "text-gray-400 dark:text-zinc-500" : "text-gray-700 dark:text-zinc-200"
                  )}
                >
                  {logEndDate ? format(new Date(logEndDate), "MMM d, yyyy") : "End Date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto rounded-2xl border border-gray-200 bg-white p-0 shadow-2xl dark:border-white/10 dark:bg-card" align="start">
                <Calendar
                  mode="single"
                  selected={logEndDate ? new Date(logEndDate) : undefined}
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
