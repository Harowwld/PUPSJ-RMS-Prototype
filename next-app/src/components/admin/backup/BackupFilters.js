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
  onRefresh,
  isLoading,
}) {
  const hasActiveFilters =
    localSearch !== "" ||
    backupStartDate !== "" ||
    backupEndDate !== ""

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

    setBackupStartDate(start.toISOString().split("T")[0])
    setBackupEndDate(end.toISOString().split("T")[0])
    setPage(1)
  }

  const clearAllFilters = () => {
    setLocalSearch("")
    setBackupSearch("")
    setBackupStartDate("")
    setBackupEndDate("")
    setPage(1)
  }

  return (
    <div className="rounded-t-brand border-b border-gray-200 bg-gray-50/50 p-4">
      {/* Active Filter Chips */}
      {hasActiveFilters && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mr-1">Active Filters:</span>
          {localSearch && (
            <div className="flex items-center gap-1 rounded-full bg-pup-maroon/10 px-2.5 py-1 text-[10px] font-bold text-pup-maroon border border-pup-maroon/20">
              Search: {localSearch}
            </div>
          )}
          {(backupStartDate || backupEndDate) && (
            <div className="flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-600 border border-emerald-100">
              Range: {backupStartDate || '...'} to {backupEndDate || '...'}
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAllFilters}
            className="h-6 rounded-full px-3 text-[10px] font-black text-pup-maroon hover:bg-red-50 hover:text-pup-darkMaroon border border-dashed border-pup-maroon/30"
          >
            CLEAR ALL FILTERS
          </Button>
        </div>
      )}

      <div className="flex w-full flex-wrap items-end gap-4">
        {/* Search */}
        <div className="min-w-[280px] flex-1">
          <label className="mb-1 block text-xs font-bold text-gray-700 uppercase">
            Search Backups
          </label>
          <div className="relative">
            <i className="ph-bold ph-magnifying-glass absolute top-1/2 left-3 -translate-y-1/2 text-gray-400"></i>
            <Input
              type="text"
              placeholder="Filename, version..."
              className="h-10 w-full rounded-brand border border-gray-300 bg-white pl-10 text-sm focus-visible:border-pup-maroon focus-visible:ring-2 focus-visible:ring-pup-maroon focus-visible:outline-none"
              value={localSearch}
              onChange={handleSearchChange}
            />
          </div>
        </div>

        {/* Date Range Picker */}
        <div className="flex min-w-[450px] flex-[2] flex-col gap-1">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-bold text-gray-700 uppercase">
              Capture Date Range
            </label>
            <div className="flex gap-1.5">
              <button
                onClick={() => handleQuickRange("today")}
                className="text-[9px] font-black text-gray-400 uppercase hover:text-pup-maroon transition-colors"
              >
                Today
              </button>
              <span className="text-gray-300 text-[9px]">•</span>
              <button
                onClick={() => handleQuickRange("yesterday")}
                className="text-[9px] font-black text-gray-400 uppercase hover:text-pup-maroon transition-colors"
              >
                Yesterday
              </button>
              <span className="text-gray-300 text-[9px]">•</span>
              <button
                onClick={() => handleQuickRange("last7")}
                className="text-[9px] font-black text-gray-400 uppercase hover:text-pup-maroon transition-colors"
              >
                Last 7 Days
              </button>
              <span className="text-gray-300 text-[9px]">•</span>
              <button
                onClick={() => handleQuickRange("last30")}
                className="text-[9px] font-black text-gray-400 uppercase hover:text-pup-maroon transition-colors"
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
                      !backupStartDate && "text-muted-foreground"
                    )}
                  >
                    <i className="ph-bold ph-calendar-dots mr-2 text-base"></i>
                    {backupStartDate ? (
                      format(new Date(backupStartDate), "PPP")
                    ) : (
                      <span className="text-[10px] font-bold tracking-tight uppercase opacity-60">
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
                      setBackupStartDate(date ? date.toISOString().split("T")[0] : "")
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
                      "h-10 w-full justify-start rounded-brand border-gray-300 text-left text-xs font-medium",
                      !backupEndDate && "text-muted-foreground"
                    )}
                  >
                    <i className="ph-bold ph-calendar-dots mr-2 text-base"></i>
                    {backupEndDate ? (
                      format(new Date(backupEndDate), "PPP")
                    ) : (
                      <span className="text-[10px] font-bold tracking-tight uppercase opacity-60">
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
                      setBackupEndDate(date ? date.toISOString().split("T")[0] : "")
                      setPage(1)
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </div>

        {/* Refresh Action */}
        <div className="flex w-fit gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={isLoading}
            className="flex h-10 w-32 items-center justify-center gap-2 rounded-brand border-gray-300 bg-white px-4 text-[10px] font-bold text-gray-600 shadow-sm transition-colors hover:border-pup-maroon hover:bg-red-50/30 hover:text-pup-maroon active:scale-95 disabled:opacity-50"
          >
            <i
              className={`ph-bold ph-arrows-clockwise ${isLoading ? "animate-spin" : ""} text-base`}
            ></i>
            REFRESH
          </Button>
        </div>
      </div>
    </div>
  )
}
