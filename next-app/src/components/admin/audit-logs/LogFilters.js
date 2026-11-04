"use client"

import { useMemo } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { DateRangeFilterButton } from "@/components/shared/DateRangePickerModal"
import MultiCriteriaFilter from "@/components/shared/MultiCriteriaFilter"
import { Search01Icon } from "hugeicons-react";


export default function LogFilters({
  localSearch,
  handleSearchChange,
  logRoleFilter,
  logSeverityFilter,
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
  const selectedSeverities = useMemo(() => {
    if (!logSeverityFilter || logSeverityFilter === "All") return []
    return logSeverityFilter.split(",").map((s) => s.trim()).filter(Boolean)
  }, [logSeverityFilter])

  const selectedRoles = useMemo(() => {
    if (!logRoleFilter || logRoleFilter === "All") return []
    return logRoleFilter.split(",").map((s) => s.trim()).filter(Boolean)
  }, [logRoleFilter])

  const filterCriteriaGroups = useMemo(() => [
    {
      id: "severity",
      label: "Severity",
      options: [
        { id: "INFO", label: "Information", dotColor: "bg-blue-500" },
        { id: "WARNING", label: "Warnings", dotColor: "bg-amber-500" },
        { id: "CRITICAL", label: "Critical", dotColor: "bg-rose-500" },
      ],
      selected: selectedSeverities,
      onChange: (vals) => {
        setLogSeverityFilter(vals.length === 0 ? "All" : vals.join(","))
        setLogPage(1)
      }
    },
    {
      id: "role",
      label: "Role",
      options: [
        { id: "Admin", label: "Administrators" },
        { id: "Staff", label: "Regular Staff" },
        { id: "System", label: "System Service" },
      ],
      selected: selectedRoles,
      onChange: (vals) => {
        setLogRoleFilter(vals.length === 0 ? "All" : vals.join(","))
        setLogPage(1)
      }
    }
  ], [selectedSeverities, selectedRoles, setLogSeverityFilter, setLogRoleFilter, setLogPage])


  return (
    <div className="border-t border-border dark:border-border p-5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-gray-50/40 dark:bg-zinc-900/30 flex-wrap">
      {/* Search Input with Pure Number Count (Left side) */}
      <div className="relative flex-1 sm:w-64 min-w-[200px] max-w-sm group">
        <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
          <Search01Icon size="1em" className="text-gray-400 dark:text-zinc-500 transition-colors group-focus-within:text-pup-maroon dark:group-focus-within:text-red-400 text-sm" />
        </div>
        <Input
          type="text"
          placeholder="Search logs by actor, action, details..."
          className="h-9 w-full rounded-xl border border-border dark:border-border bg-white dark:bg-zinc-800 pl-8 pr-16 text-xs font-normal text-gray-900 dark:text-zinc-100 placeholder:text-gray-400 dark:placeholder:text-zinc-500 shadow-none focus-visible:outline-none focus-visible:border-pup-maroon focus-visible:ring-1 focus-visible:ring-pup-maroon dark:focus-visible:border-red-500/80 dark:focus-visible:ring-red-500/80 transition-all"
          value={localSearch}
          onChange={handleSearchChange}
          disabled={isLoading}
        />
        <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-[11px] text-gray-400 dark:text-zinc-500 font-sans tabular-nums">
          {logTotal.toLocaleString()}
        </div>
      </div>

      {/* Filter controls (Right side) */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Multi-Criteria Filters (Severity, Role) */}
        <div className="w-full sm:w-auto shrink-0">
          <MultiCriteriaFilter
            title="Filter Logs"
            groups={filterCriteriaGroups}
            align="end"
            buttonLabel="Filter Logs"
          />
        </div>

        {/* Date Range Modal Trigger */}
        <DateRangeFilterButton
          startDate={logStartDate}
          endDate={logEndDate}
          onApply={({ startDate, endDate }) => {
            setLogStartDate(startDate)
            setLogEndDate(endDate)
            setLogPage?.(1)
          }}
          onClear={() => {
            setLogStartDate("")
            setLogEndDate("")
            setLogPage?.(1)
          }}
          disableFutureDates={true}
        />
      </div>
    </div>
  )
}
