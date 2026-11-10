"use client"

import { useMemo } from "react"
import DataViewToolbar from "@/components/shared/DataViewToolbar"
import DashboardSearch from "@/components/systemadmin/DashboardSearch"
import TableScrollControls from "@/components/shared/TableScrollControls"
import { FilterPopover, SortPopover, GroupPopover, ColumnsPopover } from "@/components/systemadmin/OfficeTableControls"
import { DateRangeFilterButton } from "@/components/shared/DateRangePickerModal"
import { AlertCircleIcon as EmptyAlertCircleIcon, Alert01Icon, UserIcon, UserGroupIcon } from "hugeicons-react"

export const AUDIT_GROUP_OPTIONS = [
  { key: "role", label: "Role", icon: UserGroupIcon },
  { key: "severity", label: "Severity", icon: Alert01Icon },
  { key: "none", label: "No grouping" },
]

export const AUDIT_COLUMNS = [
  { key: "created_at", label: "Timestamp", kind: "date", maxWidth: 205 },
  { key: "severity", label: "Level", kind: "status", maxWidth: 120 },
  { key: "actor", label: "Actor", kind: "text", maxWidth: 240 },
  { key: "action", label: "Action", kind: "text", maxWidth: 300 },
  { key: "details", label: "Description", kind: "text" },
  { key: "ip", label: "IP Address", kind: "text", maxWidth: 200, defaultHidden: true },
]
export const OPTIONAL_COLUMNS = AUDIT_COLUMNS

export const DEFAULT_VISIBLE_COLUMNS = [
  "created_at",
  "severity",
  "actor",
  "action",
  "details",
]

export const SORT_OPTIONS = [
  { key: "created_at", label: "Timestamp" },
  { key: "severity", label: "Level" },
  { key: "actor", label: "Actor" },
  { key: "action", label: "Action" },
]

export const AUDIT_FILTER_FIELDS = [
  {
    key: "role",
    label: "Role",
    icon: UserIcon,
    options: [
      { value: "SuperAdmin", label: "SuperAdmin" },
      { value: "Admin", label: "Admin" },
      { value: "Staff", label: "Staff" },
      { value: "Student", label: "Student" },
      { value: "System", label: "System" },
    ],
  },
  {
    key: "severity",
    label: "Severity",
    icon: EmptyAlertCircleIcon,
    options: [
      { value: "INFO", label: "Information" },
      { value: "WARNING", label: "Warning" },
      { value: "CRITICAL", label: "Critical" },
    ],
  },
]

export default function LogFilters({
  localSearch,
  handleSearchChange,
  logStartDate,
  setLogStartDate,
  logEndDate,
  setLogEndDate,
  setLogPage,
  setLocalSearch,
  setLogSearch,
  logTotal = 0,
  isLoading = false,
  logSortBy = "created_at",
  setLogSortBy,
  logSortOrder = "DESC",
  setLogSortOrder,
  visibleColumns = DEFAULT_VISIBLE_COLUMNS,
  setVisibleColumns,
  groupBy = "none",
  onGroupByChange,
  groupOptions = AUDIT_GROUP_OPTIONS,
  filterRules = [],
  onFiltersChange,
  tableContainerRef,
  canScrollLeft = false,
  canScrollRight = false,
  isScrolled = false,
  onScrollLeft,
  onScrollRight,
  onResetScroll,
}) {
  return (
    <DataViewToolbar
      label="Activity history search, filters, sorting, columns, and dates"
      className="border-t border-border dark:border-border gap-2 bg-white p-4 dark:bg-card sm:px-5 sm:py-3 select-none"
    >
      {/* Search & Scroll Controls (Left side) */}
      <div className="flex min-w-0 items-center gap-2">
        <DashboardSearch
          value={localSearch}
          onChange={(val) => {
            if (handleSearchChange) {
              handleSearchChange({ target: { value: val } })
            } else {
              setLocalSearch?.(val)
            }
          }}
          onClear={() => {
            setLocalSearch?.("")
            setLogSearch?.("")
            setLogPage?.(1)
          }}
          placeholder="Search logs by actor, action, details..."
          label="Search activity history"
          count={logTotal}
          loading={isLoading}
          className="z-10"
        />
        {tableContainerRef && (
          <TableScrollControls
            scrollContainerRef={tableContainerRef}
            canScrollLeft={canScrollLeft}
            canScrollRight={canScrollRight}
            isScrolled={isScrolled}
            onScrollLeft={onScrollLeft}
            onScrollRight={onScrollRight}
            onResetScroll={onResetScroll}
            controlSize="md"
          />
        )}
      </div>

      {/* Filter, Sort, Column and Date controls (Right side) */}
      <div className="ml-auto flex shrink-0 items-center gap-2">
        {onFiltersChange && (
          <FilterPopover
            fields={AUDIT_FILTER_FIELDS}
            filters={filterRules}
            onFiltersChange={onFiltersChange}
            entityLabel="activity"
          />
        )}
        {setLogSortBy && setLogSortOrder && (
          <SortPopover
            options={SORT_OPTIONS}
            sortBy={logSortBy}
            onSortByChange={(key) => {
              setLogSortBy(key)
              setLogSortOrder("ASC")
              setLogPage?.(1)
            }}
            sortOrder={logSortOrder}
            onSortOrderChange={(order) => {
              setLogSortOrder(order)
              setLogPage?.(1)
            }}
          />
        )}
        {onGroupByChange && (
          <GroupPopover
            options={groupOptions}
            groupBy={groupBy}
            onGroupByChange={onGroupByChange}
          />
        )}
        {setVisibleColumns && (
          <ColumnsPopover
            columns={AUDIT_COLUMNS}
            visibleColumns={visibleColumns}
            defaultColumns={DEFAULT_VISIBLE_COLUMNS}
            onVisibleColumnsChange={setVisibleColumns}
            minVisible={2}
          />
        )}
        <DateRangeFilterButton
          startDate={logStartDate}
          endDate={logEndDate}
          onApply={({ startDate, endDate }) => {
            setLogStartDate?.(startDate)
            setLogEndDate?.(endDate)
            setLogPage?.(1)
          }}
          onClear={() => {
            setLogStartDate?.("")
            setLogEndDate?.("")
            setLogPage?.(1)
          }}
          disableFutureDates={true}
        />
      </div>
    </DataViewToolbar>
  )
}
