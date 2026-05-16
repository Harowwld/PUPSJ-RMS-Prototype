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
      case "thisMonth":
        start.setDate(1)
        start.setHours(0, 0, 0, 0)
        break
    }

    setLogStartDate(format(start, "yyyy-MM-dd"))
    setLogEndDate(format(end, "yyyy-MM-dd"))
    setLogPage(1)
  }

  const clearAllFilters = () => {
    setLocalSearch("")
    setLogSearch("")
    setLogRoleFilter("All")
    setLogSeverityFilter("All")
    setLogStartDate("")
    setLogEndDate("")
    setLogPage(1)
  }

  return (
    <div className="rounded-t-brand border-b border-gray-200 bg-gray-50/50 p-4">
      <div className="flex w-full flex-wrap items-end gap-4">
        {/* Search */}
        <div className="min-w-[400px] flex-1">
          <label className="mb-1 block text-xs font-bold text-gray-700 uppercase">
            Search Logs
          </label>
          <div className="relative">
            <i className="ph-bold ph-magnifying-glass absolute top-1/2 left-3 -translate-y-1/2 text-gray-400"></i>
            <Input
              type="text"
              placeholder="User, action, details..."
              className="h-10 w-full rounded-brand border border-gray-300 bg-white pl-10 text-sm focus-visible:border-pup-maroon focus-visible:ring-2 focus-visible:ring-pup-maroon focus-visible:outline-none"
              value={localSearch}
              onChange={handleSearchChange}
            />
          </div>
        </div>

        {/* Quick Range / Date Filters */}
        <div className="flex min-w-[450px] flex-[2] flex-col gap-1">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-bold text-gray-700 uppercase">
              Date Range
            </label>
            <div className="flex gap-1.5">
              <button
                onClick={() => handleQuickRange("today")}
                className="text-[9px] font-black text-gray-400 uppercase transition-colors hover:text-pup-maroon"
              >
                Today
              </button>
              <span className="text-[9px] text-gray-300">•</span>
              <button
                onClick={() => handleQuickRange("yesterday")}
                className="text-[9px] font-black text-gray-400 uppercase transition-colors hover:text-pup-maroon"
              >
                Yesterday
              </button>
              <span className="text-[9px] text-gray-300">•</span>
              <button
                onClick={() => handleQuickRange("last7")}
                className="text-[9px] font-black text-gray-400 uppercase transition-colors hover:text-pup-maroon"
              >
                Last 7 Days
              </button>
              <span className="text-[9px] text-gray-300">•</span>
              <button
                onClick={() => handleQuickRange("last30")}
                className="text-[9px] font-black text-gray-400 uppercase transition-colors hover:text-pup-maroon"
              >
                Last 30 Days
              </button>
            </div>
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "h-10 w-full justify-start rounded-brand border-gray-300 text-left text-xs font-medium",
                      !logStartDate && "text-muted-foreground"
                    )}
                  >
                    <i className="ph-bold ph-calendar-dots mr-2 text-base"></i>
                    {logStartDate ? (
                      format(new Date(logStartDate), "PPP")
                    ) : (
                      <span className="text-[10px] font-bold tracking-tight uppercase opacity-60">
                        Start Date
                      </span>
                    )}{" "}
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  className="w-auto rounded-brand p-0"
                  align="start"
                >
                  <Calendar
                    mode="single"
                    selected={logStartDate ? new Date(logStartDate) : undefined}
                    onSelect={(date) => {
                      setLogStartDate(
                        date ? format(date, "yyyy-MM-dd") : ""
                      )
                      setLogPage(1)
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="flex-1">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "h-10 w-full justify-start rounded-brand border-gray-300 text-left text-xs font-medium",
                      !logEndDate && "text-muted-foreground"
                    )}
                  >
                    <i className="ph-bold ph-calendar-dots mr-2 text-base"></i>
                    {logEndDate ? (
                      format(new Date(logEndDate), "PPP")
                    ) : (
                      <span className="text-[10px] font-bold tracking-tight uppercase opacity-60">
                        End Date
                      </span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  className="w-auto rounded-brand p-0"
                  align="start"
                >
                  <Calendar
                    mode="single"
                    selected={logEndDate ? new Date(logEndDate) : undefined}
                    onSelect={(date) => {
                      setLogEndDate(
                        date ? format(date, "yyyy-MM-dd") : ""
                      )
                      setLogPage(1)
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </div>

        {/* Role Filter */}
        <div className="w-full shrink-0 sm:w-28">
          <label className="mb-1 block text-xs font-bold text-gray-700 uppercase">
            Role
          </label>
          <select
            className="h-10 w-full rounded-brand border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm transition-colors focus:border-pup-maroon focus:ring-2 focus:ring-pup-maroon focus:outline-none"
            value={logRoleFilter}
            onChange={handleRoleChange}
          >
            <option value="All">All</option>
            <option value="Admin">Admin</option>
            <option value="Staff">Staff</option>
            <option value="System">System</option>
          </select>
        </div>

        {/* Severity Filter */}
        <div className="w-full shrink-0 sm:w-28">
          <label className="mb-1 block text-xs font-bold text-gray-700 uppercase">
            Severity
          </label>
          <select
            className="h-10 w-full rounded-brand border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm transition-colors focus:border-pup-maroon focus:ring-2 focus:ring-pup-maroon focus:outline-none"
            value={logSeverityFilter}
            onChange={handleSeverityChange}
          >
            <option value="All">All</option>
            <option value="INFO">Info</option>
            <option value="WARNING">Warning</option>
            <option value="CRITICAL">Critical</option>
          </select>
        </div>
      </div>
    </div>
  )
}
