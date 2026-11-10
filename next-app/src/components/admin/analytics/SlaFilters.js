"use client"

import React from "react"
import DataViewToolbar from "@/components/shared/DataViewToolbar"
import { SegmentedControl } from "@/components/ui/tabs"
import { DateRangeFilterButton } from "@/components/shared/DateRangePickerModal"

export default function SlaFilters({
  viewMode = "all",
  onViewModeChange,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  isLoading,
}) {
  return (
    <DataViewToolbar
      label="Request analytics view and date filters"
      className="border-t border-border dark:border-border px-5 sm:py-3 bg-white dark:bg-card select-none"
    >
      {/* Left Group: Analytics View Scope Segmented Capsule with Motion */}
      <div className="flex min-w-0 items-center gap-2">
        <SegmentedControl
          value={viewMode}
          onValueChange={onViewModeChange}
          variant="capsule"
          className="inline-grid grid-flow-col auto-cols-fr shrink-0"
          items={[
            { value: "all", label: "All Analytics" },
            { value: "sla", label: "Processing Time" },
            { value: "csm", label: "Client Feedback" },
          ]}
        />
      </div>

      {/* Right Group: Date Range Filter */}
      <div className="ml-auto flex shrink-0 items-center gap-2">
        <DateRangeFilterButton
          startDate={startDate}
          endDate={endDate}
          onApply={({ startDate: s, endDate: e }) => {
            setStartDate(s)
            setEndDate(e)
          }}
          onClear={() => {
            setStartDate("")
            setEndDate("")
          }}
          disableFutureDates={true}
        />
      </div>
    </DataViewToolbar>
  )
}
