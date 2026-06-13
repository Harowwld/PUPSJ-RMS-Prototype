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
  backupTotal,
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

    setBackupStartDate(format(start, "yyyy-MM-dd"))
    setBackupEndDate(format(end, "yyyy-MM-dd"))
    setPage(1)
  }

  return (
    <div className="rounded-t-brand border-b border-gray-200 bg-transparent p-4 dark:border-white/10 dark:bg-transparent">
      <div className="flex w-full flex-wrap items-end gap-4">
        {/* Search */}
        <div className="min-w-[400px] flex-1">
          <label className="mb-1 block text-xs font-semibold text-gray-700 dark:text-zinc-200">
            Search Backups
          </label>
          <div className="relative">
            <i className="ph-bold ph-magnifying-glass absolute top-1/2 left-3 -translate-y-1/2 text-gray-400 dark:text-zinc-500"></i>
            <Input
              type="text"
              placeholder="Filename, version..."
              className="h-10 w-full rounded-brand border border-gray-300 bg-white pl-10 text-sm focus-visible:border-gray-300 focus-visible:ring-2 focus-visible:ring-pup-maroon focus-visible:outline-none dark:bg-card dark:border-white/10"
              value={localSearch}
              onChange={handleSearchChange}
            />
          </div>
        </div>

        {/* Date Range Picker */}
        <div className="flex min-w-[450px] flex-[2] flex-col gap-1">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-semibold text-gray-700 dark:text-zinc-200">
              Capture Date Range
            </label>
            <div className="flex gap-1.5">
              <button
                onClick={() => handleQuickRange("today")}
                className="text-[9px] font-semibold text-gray-400 hover:text-pup-maroon dark:hover:text-red-500 transition-colors dark:text-zinc-500"
              >
                Today
              </button>
              <span className="text-gray-300 text-[9px] dark:text-zinc-600">•</span>
              <button
                onClick={() => handleQuickRange("yesterday")}
                className="text-[9px] font-semibold text-gray-400 hover:text-pup-maroon dark:hover:text-red-500 transition-colors dark:text-zinc-500"
              >
                Yesterday
              </button>
              <span className="text-gray-300 text-[9px] dark:text-zinc-600">•</span>
              <button
                onClick={() => handleQuickRange("last7")}
                className="text-[9px] font-semibold text-gray-400 hover:text-pup-maroon dark:hover:text-red-500 transition-colors dark:text-zinc-500"
              >
                Last 7 Days
              </button>
              <span className="text-gray-300 text-[9px] dark:text-zinc-600">•</span>
              <button
                onClick={() => handleQuickRange("last30")}
                className="text-[9px] font-semibold text-gray-400 hover:text-pup-maroon dark:hover:text-red-500 transition-colors dark:text-zinc-500"
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
                      "h-10 w-full justify-start rounded-brand border-gray-300 dark:border-white/10 text-left text-xs font-medium",
                      !backupStartDate && "text-muted-foreground"
                    )}
                  >
                    <i className="ph-bold ph-calendar-dots mr-2 text-base"></i>
                    {backupStartDate ? (
                      format(new Date(backupStartDate), "PPP")
                    ) : (
                      <span className="text-[10px] font-semibold tracking-tight opacity-60">
                        Start Date
                      </span>
                    )}{" "}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto rounded-brand p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={backupStartDate ? new Date(backupStartDate) : undefined}
                    onSelect={(date) => {
                      setBackupStartDate(date ? format(date, "yyyy-MM-dd") : "")
                      setPage(1)
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
                      "h-10 w-full justify-start rounded-brand border-gray-300 dark:border-white/10 text-left text-xs font-medium",
                      !backupEndDate && "text-muted-foreground"
                    )}
                  >
                    <i className="ph-bold ph-calendar-dots mr-2 text-base"></i>
                    {backupEndDate ? (
                      format(new Date(backupEndDate), "PPP")
                    ) : (
                      <span className="text-[10px] font-semibold tracking-tight opacity-60">
                        End Date
                      </span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto rounded-brand p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={backupEndDate ? new Date(backupEndDate) : undefined}
                    onSelect={(date) => {
                      setBackupEndDate(date ? format(date, "yyyy-MM-dd") : "")
                      setPage(1)
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

