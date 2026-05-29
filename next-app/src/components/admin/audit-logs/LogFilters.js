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

  return (
    <div className="bg-white border-b border-gray-100 p-4 backdrop-blur-md dark:bg-card/50 dark:border-white/10">
      <div className="flex w-full flex-wrap items-end gap-5">
        {/* Search */}
        <div className="min-w-[320px] flex-[1.5]">
          <div className="mb-1.5 flex items-center justify-between">
            <label className="text-[10px] font-black tracking-widest text-gray-400 uppercase dark:text-zinc-500">
              Global Search
            </label>
            <span className="text-[9px] font-bold text-pup-maroon dark:text-primary/50">
              {logTotal > 0 ? `${logTotal.toLocaleString()} MATCHES` : "NO RESULTS"}
            </span>
          </div>
          <div className="group relative">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
              <i className="ph-bold ph-magnifying-glass text-gray-400 transition-colors group-focus-within:text-pup-maroon dark:text-zinc-500"></i>
            </div>
            <Input
              type="text"
              placeholder="Search by actor, action, or details..."
              className="h-11 w-full rounded-brand border border-gray-200 bg-white pl-10.5 text-sm font-medium transition-all focus:border-pup-maroon/30 focus:ring-4 focus:ring-pup-maroon/5 placeholder:text-gray-400 dark:border-white/10 dark:bg-card dark:text-zinc-500"
              value={localSearch}
              onChange={handleSearchChange}
            />
          </div>
        </div>

        {/* Date Range Picker Section */}
        <div className="min-w-[400px] flex-[2]">
          <div className="mb-1.5 flex items-center justify-between">
            <label className="text-[10px] font-black tracking-widest text-gray-400 uppercase dark:text-zinc-500">
              Time Period
            </label>
            <div className="flex items-center gap-2">
              {["today", "yesterday", "last7", "last30"].map((range) => (
                <button
                  key={range}
                  onClick={() => handleQuickRange(range)}
                  className="rounded-md bg-gray-100 px-2 py-0.5 text-[9px] font-black text-gray-500 uppercase transition-all hover:bg-pup-maroon hover:text-white dark:text-zinc-400 dark:bg-muted"
                >
                  {range.replace("last", "Last ")}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "h-11 w-full justify-start rounded-brand border-gray-200 dark:border-white/10 bg-white dark:bg-card text-left text-xs font-semibold shadow-xs transition-all hover:bg-gray-50 dark:hover:bg-white/10 dark:bg-card",
                      !logStartDate && "text-gray-400 dark:text-zinc-500"
                    )}
                  >
                    <i className="ph-bold ph-calendar-blank mr-2 text-base text-gray-400 dark:text-zinc-500"></i>
                    {logStartDate ? format(new Date(logStartDate), "MMM d, yyyy") : "Start Date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto rounded-2xl p-0 shadow-2xl" align="start">
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
            <div className="flex items-center text-gray-300 dark:text-zinc-600">
               <i className="ph-bold ph-arrow-right"></i>
            </div>
            <div className="flex-1">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "h-11 w-full justify-start rounded-brand border-gray-200 dark:border-white/10 bg-white dark:bg-card text-left text-xs font-semibold shadow-xs transition-all hover:bg-gray-50 dark:hover:bg-white/10 dark:bg-card",
                      !logEndDate && "text-gray-400 dark:text-zinc-500"
                    )}
                  >
                    <i className="ph-bold ph-calendar-blank mr-2 text-base text-gray-400 dark:text-zinc-500"></i>
                    {logEndDate ? format(new Date(logEndDate), "MMM d, yyyy") : "End Date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto rounded-2xl p-0 shadow-2xl" align="start">
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

        {/* Quick Select Filters */}
        <div className="flex shrink-0 gap-3">
          <div className="w-28">
            <label className="mb-1.5 block text-[10px] font-black tracking-widest text-gray-400 uppercase dark:text-zinc-500">
              Role
            </label>
            <Select
              value={logRoleFilter}
              onChange={handleRoleChange}
            >
              <option value="All">All</option>
              <option value="Admin">Admin</option>
              <option value="Staff">Staff</option>
              <option value="System">System</option>
            </Select>
          </div>

          <div className="w-32">
            <label className="mb-1.5 block text-[10px] font-black tracking-widest text-gray-400 uppercase dark:text-zinc-500">
              Severity
            </label>
            <Select
              value={logSeverityFilter}
              onChange={handleSeverityChange}
            >
              <option value="All">All</option>
              <option value="INFO">Information</option>
              <option value="WARNING">Warning</option>
              <option value="CRITICAL">Critical</option>
            </Select>
          </div>
        </div>
      </div>
    </div>
  )
}
