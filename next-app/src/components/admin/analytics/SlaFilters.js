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
        break;
    }

    setStartDate(format(start, "yyyy-MM-dd"))
    setEndDate(format(end, "yyyy-MM-dd"))
  }

  return (
    <div className="bg-white border-t border-b border-gray-100 p-4 backdrop-blur-md dark:bg-card/50 dark:border-white/10">
      <div className="flex flex-wrap items-end gap-5">
        <div className="w-full">
          <div className="mb-1.5 flex items-center justify-between">
            <label className="text-[10px] font-black tracking-widest text-gray-400 dark:text-zinc-500">
              Time Period
            </label>
            <div className="flex items-center gap-2">
              {["today", "yesterday", "last7", "last30"].map((range) => (
                <button
                  key={range}
                  onClick={() => handleQuickRange(range)}
                  className="rounded-md bg-gray-100 px-2 py-0.5 text-[9px] font-black text-gray-500 transition-all hover:bg-pup-maroon hover:text-white dark:text-zinc-400 dark:bg-muted"
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
                      !startDate && "text-gray-400 dark:text-zinc-500"
                    )}
                  >
                    <i className="ph-bold ph-calendar-blank mr-2 text-base text-gray-400 dark:text-zinc-500"></i>
                    {startDate ? format(new Date(startDate), "MMM d, yyyy") : "Start Date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto rounded-2xl p-0 shadow-2xl" align="start">
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
                      !endDate && "text-gray-400 dark:text-zinc-500"
                    )}
                  >
                    <i className="ph-bold ph-calendar-blank mr-2 text-base text-gray-400 dark:text-zinc-500"></i>
                    {endDate ? format(new Date(endDate), "MMM d, yyyy") : "End Date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto rounded-2xl p-0 shadow-2xl" align="start">
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
          </div>
        </div>
      </div>
    </div>
  )
}

