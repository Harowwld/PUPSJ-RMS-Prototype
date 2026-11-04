"use client"

import { DateRangeFilterButton } from "@/components/shared/DateRangePickerModal"

export default function SlaFilters({
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  isLoading,
}) {
  return (
    <div data-light-only className="border-t border-border dark:border-border p-5 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-gray-50/40 dark:bg-zinc-900/30 flex-wrap">
      {/* Date Range Modal Trigger */}
      <div className="ml-auto flex flex-wrap items-center gap-3 shrink-0">
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
    </div>
  )
}
