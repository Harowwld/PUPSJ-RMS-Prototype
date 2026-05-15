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

export default function SlaFilters({
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  isLoading,
  onRefresh,
}) {
  const hasActiveFilters = startDate !== "" || endDate !== ""

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
      case "thisSemester":
        // Approximate Semester logic (Jan-Jun, Jul-Dec)
        const currentMonth = start.getMonth()
        if (currentMonth < 6) {
          start.setMonth(0, 1)
        } else {
          start.setMonth(6, 1)
        }
        start.setHours(0, 0, 0, 0)
        break
    }

    setStartDate(format(start, "yyyy-MM-dd"))
    setEndDate(format(end, "yyyy-MM-dd"))
  }

  const clearAllFilters = () => {
    setStartDate("")
    setEndDate("")
  }

  return (
    <div className="border-b border-gray-200 bg-gray-50/30 p-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between gap-4">
            <label className="text-[10px] font-black tracking-widest text-gray-400 uppercase">
              Filter by Period
            </label>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleQuickRange("today")}
                className="text-[9px] font-bold text-gray-500 uppercase hover:text-pup-maroon transition-colors"
              >
                Today
              </button>
              <span className="text-gray-300 text-[9px]">•</span>
              <button
                onClick={() => handleQuickRange("last7")}
                className="text-[9px] font-bold text-gray-500 uppercase hover:text-pup-maroon transition-colors"
              >
                Last 7d
              </button>
              <span className="text-gray-300 text-[9px]">•</span>
              <button
                onClick={() => handleQuickRange("last30")}
                className="text-[9px] font-bold text-gray-500 uppercase hover:text-pup-maroon transition-colors"
              >
                Last 30d
              </button>
              <span className="text-gray-300 text-[9px]">•</span>
              <button
                onClick={() => handleQuickRange("thisSemester")}
                className="text-[9px] font-bold text-gray-500 uppercase hover:text-pup-maroon transition-colors"
              >
                This Semester
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="w-44">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "h-9 w-full justify-start rounded-brand border-gray-300 text-left text-xs font-medium bg-white",
                      !startDate && "text-gray-400"
                    )}
                  >
                    <i className="ph-bold ph-calendar-dots mr-2 text-base text-gray-400"></i>
                    {startDate ? (
                      format(new Date(startDate), "MMM dd, yyyy")
                    ) : (
                      "Start Date"
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto rounded-brand p-0 shadow-2xl" align="start">
                  <Calendar
                    mode="single"
                    selected={startDate ? new Date(startDate) : undefined}
                    onSelect={(date) => {
                      setStartDate(date ? format(date, "yyyy-MM-dd") : "")
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <span className="text-gray-400 text-xs font-bold">TO</span>
            <div className="w-44">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "h-9 w-full justify-start rounded-brand border-gray-300 text-left text-xs font-medium bg-white",
                      !endDate && "text-gray-400"
                    )}
                  >
                    <i className="ph-bold ph-calendar-dots mr-2 text-base text-gray-400"></i>
                    {endDate ? (
                      format(new Date(endDate), "MMM dd, yyyy")
                    ) : (
                      "End Date"
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto rounded-brand p-0 shadow-2xl" align="start">
                  <Calendar
                    mode="single"
                    selected={endDate ? new Date(endDate) : undefined}
                    onSelect={(date) => {
                      setEndDate(date ? format(date, "yyyy-MM-dd") : "")
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAllFilters}
                className="h-9 rounded-brand px-3 text-[10px] font-black text-pup-maroon hover:bg-red-50"
              >
                <i className="ph-bold ph-x mr-1.5" />
                RESET
              </Button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
            <div className="flex flex-col items-end gap-1">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Dataset Sync</p>
                <p className="text-[10px] font-medium text-gray-500">
                    {hasActiveFilters ? "Filtering live analytics..." : "Showing cumulative data"}
                </p>
            </div>
            <Button
                variant="outline"
                size="sm"
                onClick={onRefresh}
                disabled={isLoading}
                className="h-10 w-10 shrink-0 border border-gray-300 bg-white p-0 text-gray-600 shadow-sm transition-all hover:border-pup-maroon hover:bg-red-50/30 hover:text-pup-maroon active:scale-95 rounded-brand"
            >
                <i className={cn("ph-bold ph-arrows-clockwise text-sm", isLoading && "animate-spin")} />
            </Button>
        </div>
      </div>
    </div>
  )
}
