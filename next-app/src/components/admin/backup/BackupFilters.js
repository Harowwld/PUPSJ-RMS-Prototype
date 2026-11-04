"use client"


import DataViewToolbar from "@/components/shared/DataViewToolbar"
import DashboardSearch from "@/components/systemadmin/DashboardSearch"
import { DateRangeFilterButton } from "@/components/shared/DateRangePickerModal"


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
  backupTotal = 0,
  isLoading = false,
  inline = false,
  tableControls,
  scrollControls,
  actions,
}) {
  const Wrapper = inline ? DataViewToolbar : "div"
  return (
    <Wrapper {...(inline ? { label: "Platform backup search and controls" } : {})} className={inline ? "gap-2 bg-gray-50/40 px-5 py-3 dark:bg-zinc-900/30" : "border-t border-border dark:border-border p-5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-gray-50/40 dark:bg-zinc-900/30 flex-wrap"}>
      {/* Left side: Search Bar & Scroll Controls */}
      <div className="flex min-w-0 items-center gap-2">
        <DashboardSearch
          value={localSearch}
          onChange={(value) => {
            if (handleSearchChange) {
              handleSearchChange({ target: { value } })
            } else {
              setLocalSearch?.(value)
              setPage?.(1)
            }
          }}
          onClear={() => {
            setLocalSearch?.("")
            setBackupSearch?.("")
            setPage?.(1)
          }}
          placeholder="Search archive filename..."
          label="Search archive filename"
          count={backupTotal}
          loading={isLoading}
          className="flex-1 sm:w-64 min-w-[200px] max-w-sm"
        />
        {scrollControls}
      </div>

      {/* Right side: Filter, Sort, Group, Columns & Date Range */}
      <div className="ml-auto flex shrink-0 items-center gap-2">
        {tableControls}
        {/* Date Range Modal Trigger */}
        <DateRangeFilterButton
          startDate={backupStartDate}
          endDate={backupEndDate}
          onApply={({ startDate, endDate }) => {
            setBackupStartDate(startDate)
            setBackupEndDate(endDate)
            setPage?.(1)
          }}
          onClear={() => {
            setBackupStartDate("")
            setBackupEndDate("")
            setPage?.(1)
          }}
          disableFutureDates={true}
        />
        {actions}
      </div>
    </Wrapper>
  )
}
