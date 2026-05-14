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
  isExporting,
  handleDownloadCSV,
  handlePreviewPDF,
}) {
  const hasActiveFilters =
    localSearch !== "" ||
    logRoleFilter !== "All" ||
    logSeverityFilter !== "All" ||
    logStartDate !== "" ||
    logEndDate !== ""

  const handleQuickRange = (range) => {
    const end = new Date();
    let start = new Date();
    
    switch(range) {
      case 'today':
        break; // start = today
      case 'last7':
        start.setDate(start.getDate() - 7);
        break;
      case 'thisMonth':
        start.setDate(1);
        break;
      case 'lastHour':
        start.setHours(start.getHours() - 1);
        // SQLite date() function only compares dates, but our UI uses YYYY-MM-DD.
        // For 'lastHour', we might need full ISO or just stick to today for now 
        // if the backend logic only handles dates. 
        // The countAuditLogs uses date(created_at, 'localtime') >= date(?).
        break;
    }
    
    setLogStartDate(start.toISOString().split("T")[0]);
    setLogEndDate(end.toISOString().split("T")[0]);
    setLogPage(1);
  };

  const clearAllFilters = () => {
    setLocalSearch("")
    setLogSearch("")
    setLogRoleFilter("All")
    setLogSeverityFilter("All")
    setLogStartDate("")
    setLogEndDate("")
    setLogPage(1)
  };

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
          {logRoleFilter !== "All" && (
            <div className="flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-bold text-blue-600 border border-blue-100">
              Role: {logRoleFilter}
            </div>
          )}
          {logSeverityFilter !== "All" && (
            <div className="flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-bold text-amber-600 border border-amber-100">
              Severity: {logSeverityFilter}
            </div>
          )}
          {(logStartDate || logEndDate) && (
            <div className="flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-600 border border-emerald-100">
              Range: {logStartDate || '...'} to {logEndDate || '...'}
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
                onClick={() => handleQuickRange('today')}
                className="text-[9px] font-black text-gray-400 uppercase hover:text-pup-maroon transition-colors"
              >
                Today
              </button>
              <span className="text-gray-300 text-[9px]">•</span>
              <button 
                onClick={() => handleQuickRange('last7')}
                className="text-[9px] font-black text-gray-400 uppercase hover:text-pup-maroon transition-colors"
              >
                Last 7 Days
              </button>
              <span className="text-gray-300 text-[9px]">•</span>
              <button 
                onClick={() => handleQuickRange('thisMonth')}
                className="text-[9px] font-black text-gray-400 uppercase hover:text-pup-maroon transition-colors"
              >
                This Month
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
                <PopoverContent className="w-auto rounded-brand p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={logStartDate ? new Date(logStartDate) : undefined}
                    onSelect={(date) => {
                      setLogStartDate(date ? date.toISOString().split("T")[0] : "")
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
                <PopoverContent className="w-auto rounded-brand p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={logEndDate ? new Date(logEndDate) : undefined}
                    onSelect={(date) => {
                      setLogEndDate(date ? date.toISOString().split("T")[0] : "")
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

        {/* Export Actions */}
        <div className="flex w-fit gap-2">
          <div className="w-32">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadCSV}
              disabled={logTotal === 0 || isExporting}
              className="flex h-10 w-full items-center justify-center gap-1.5 rounded-brand border-gray-300 text-[10px] font-bold text-gray-600 hover:border-pup-maroon hover:bg-red-50/30 hover:text-pup-maroon active:scale-95 disabled:opacity-50 shadow-sm transition-colors"
            >
              <i
                className={`ph-bold ${isExporting ? "ph-circle-notch animate-spin" : "ph-file-csv"} text-base`}
              ></i>
              {isExporting ? "PREPARING..." : "CSV"}
            </Button>
          </div>
          <div className="w-32">
            <Button
              size="sm"
              onClick={handlePreviewPDF}
              disabled={logTotal === 0 || isExporting}
              className="flex h-10 w-full items-center justify-center gap-1.5 rounded-brand bg-pup-maroon text-[10px] font-bold text-white hover:bg-red-900 active:scale-95 disabled:opacity-50 shadow-sm"
            >
              <i
                className={`ph-bold ${isExporting ? "ph-circle-notch animate-spin" : "ph-file-pdf"} text-base`}
              ></i>
              {isExporting ? "GENERATING..." : "PDF"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
