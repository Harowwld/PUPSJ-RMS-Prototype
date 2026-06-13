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
  const activeShortcut = (() => {
    if (!startDate || !endDate) return null
    const todayStr = format(new Date(), "yyyy-MM-dd")
    
    if (startDate === todayStr && endDate === todayStr) return "Today"
    
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayStr = format(yesterday, "yyyy-MM-dd")
    if (startDate === yesterdayStr && endDate === yesterdayStr) return "Yesterday"
    
    const last7 = new Date()
    last7.setDate(last7.getDate() - 7)
    const last7Str = format(last7, "yyyy-MM-dd")
    if (startDate === last7Str && endDate === todayStr) return "7 days"
    
    const last30 = new Date()
    last30.setDate(last30.getDate() - 30)
    const last30Str = format(last30, "yyyy-MM-dd")
    if (startDate === last30Str && endDate === todayStr) return "30 days"
    
    return null
  })()

  const handleQuickRange = (range) => {
    const end = new Date()
    let start = new Date()

    switch (range) {
      case "Today":
        start.setHours(0, 0, 0, 0)
        break
      case "Yesterday":
        start.setDate(start.getDate() - 1)
        start.setHours(0, 0, 0, 0)
        end.setDate(end.getDate() - 1)
        end.setHours(23, 59, 59, 999)
        break
      case "7 days":
        start.setDate(start.getDate() - 7)
        start.setHours(0, 0, 0, 0)
        break
      case "30 days":
        start.setDate(start.getDate() - 30)
        start.setHours(0, 0, 0, 0)
        break
    }

    setStartDate(format(start, "yyyy-MM-dd"))
    setEndDate(format(end, "yyyy-MM-dd"))
  }

  return (
    <div className="bg-white border-t border-b border-gray-100 px-6 py-4 backdrop-blur-md dark:bg-card/50 dark:border-white/10">
      <div className="flex w-full flex-wrap items-center gap-5">
        {/* Shortcuts */}
        <div className="flex items-center gap-[12px] h-[36px] flex-none">
          {["Today", "Yesterday", "7 days", "30 days"].map((range) => {
            const isActive = activeShortcut === range
            return (
              <button
                key={range}
                type="button"
                onClick={() => handleQuickRange(range)}
                className={cn(
                  "text-[12px] font-normal transition-all bg-transparent border-0 cursor-pointer shadow-none focus:outline-none focus:ring-0 pb-1",
                  isActive 
                    ? "text-pup-maroon dark:text-red-500 border-b-[2px] border-pup-maroon dark:border-red-500 font-semibold" 
                    : "text-gray-400 dark:text-zinc-500 hover:text-gray-600 dark:hover:text-zinc-300"
                )}
              >
                {range}
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
                    !startDate ? "text-gray-400 dark:text-zinc-500" : "text-gray-700 dark:text-zinc-200"
                  )}
                >
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
                    !endDate ? "text-gray-400 dark:text-zinc-500" : "text-gray-700 dark:text-zinc-200"
                  )}
                >
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
  )
}

