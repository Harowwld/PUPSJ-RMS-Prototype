"use client"
import DashboardSearch from "@/components/systemadmin/DashboardSearch"

import { useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import DataViewToolbar from "@/components/shared/DataViewToolbar"
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverFooter,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import {
  Add01Icon,
  ArrowDown01Icon,
  ArrowDown01Icon as DescendingIcon,
  ArrowUp01Icon as AscendingIcon,
  ArrowUpDownIcon,
  Delete01Icon,
  FilterIcon,
  Layout2ColumnIcon,
  Layers01Icon,
  MinusSignIcon,
  ReloadIcon,
  Search01Icon,
  Tick01Icon,
} from "hugeicons-react"
import TableScrollControls from "@/components/shared/TableScrollControls"

const OPERATOR_OPTIONS = [
  { value: "is", label: "is" },
  { value: "is_not", label: "is not" },
]
const NUMBER_OPERATOR_OPTIONS = [
  ...OPERATOR_OPTIONS,
  { value: "greater_than", label: "greater than" },
  { value: "less_than", label: "less than" },
]

function ControlButton({ icon: Icon, children, badge, className, ...props }) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className={cn("h-9 shrink-0 gap-2 rounded-xl px-3 text-xs font-medium shadow-none", className)}
      {...props}
    >
      {Icon && <Icon size={14} aria-hidden="true" className="shrink-0 text-gray-500 dark:text-zinc-400" />}
      <span className="truncate">{children}</span>
      {badge > 0 && <span className="inline-flex min-w-4 items-center justify-center rounded-full bg-pup-maroon px-1 text-[10px] font-semibold text-white dark:bg-red-500">{badge}</span>}
      <ArrowDown01Icon size={13} aria-hidden="true" className="shrink-0 text-gray-400 dark:text-zinc-500" />
    </Button>
  )
}

export function FilterPopover({ fields, filters, onFiltersChange, entityLabel = "departments", maxRulesPerField = Infinity }) {
  const idRef = useRef(0)
  const selectedCount = filters.length

  const updateFilter = (id, patch) => {
    onFiltersChange(filters.map((filter) => filter.id === id ? { ...filter, ...patch } : filter))
  }

  const addFilter = (fieldKey) => {
    const field = fields.find((candidate) => candidate.key === fieldKey)
    if (!field) return
    do { idRef.current += 1 } while (filters.some((filter) => filter.id === `office-filter-${idRef.current}`))
    onFiltersChange([...filters, {
      id: `office-filter-${idRef.current}`,
      fieldKey,
      operator: field.operators?.[0]?.value || "is",
      value: field.type === "number" ? "0" : field.type === "multi" ? (field.options?.[0]?.value !== undefined ? [String(field.options[0].value)] : []) : String(field.options?.[0]?.value ?? ""),
    }])
  }

  const changeField = (filterId, fieldKey) => {
    const field = fields.find((candidate) => candidate.key === fieldKey)
    if (!field) return
    updateFilter(filterId, {
      fieldKey,
      operator: field.operators?.[0]?.value || "is",
      value: field.type === "number" ? "0" : field.type === "multi" ? (field.options?.[0]?.value !== undefined ? [String(field.options[0].value)] : []) : String(field.options?.[0]?.value ?? ""),
    })
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <ControlButton icon={FilterIcon} badge={selectedCount}>Filter</ControlButton>
      </PopoverTrigger>
      <PopoverContent align="start" className="max-h-[calc(100dvh-2rem)] w-[min(34rem,calc(100vw-2rem))] max-w-[calc(100vw-2rem)] rounded-2xl">
        <PopoverHeader className="px-4.5 py-2.5">
          <PopoverTitle className="text-[10px] font-semibold uppercase tracking-[0.06em] text-gray-500 dark:text-zinc-400">Filter by</PopoverTitle>
          {selectedCount > 0 && <button type="button" onClick={() => onFiltersChange([])} className="rounded-lg px-2 py-0.5 text-[11px] font-medium text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-pup-maroon dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-white cursor-pointer">Clear all</button>}
        </PopoverHeader>

        <div className="max-h-[min(42vh,18rem)] space-y-1.5 overflow-y-auto p-2">
          {filters.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border px-3 py-4 text-center text-xs text-gray-500 dark:border-white/10 dark:text-zinc-400">Add a field below to filter {entityLabel}.</p>
          ) : filters.map((filter, index) => {
            const field = fields.find((candidate) => candidate.key === filter.fieldKey) || fields[0]
            if (!field) return null
            const operators = field.operators || (field.type === "number" ? NUMBER_OPERATOR_OPTIONS : OPERATOR_OPTIONS)
            const valueOptions = field.options || []
            return (
              <div key={filter.id} className="flex min-w-0 flex-wrap items-center gap-1.5 rounded-xl border border-border/80 bg-white p-1.5 dark:border-white/10 dark:bg-zinc-900">
                <span className="w-8 shrink-0 text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-zinc-500">{index === 0 ? "Where" : "And"}</span>
                <div className="w-[110px] shrink-0">
                  <Select value={filter.fieldKey} onChange={(event) => changeField(filter.id, event.target.value)} aria-label={`${index === 0 ? "Where" : "And"} field`} className="h-8 rounded-lg text-xs" buttonClassName="h-8 px-2 text-xs" menuClassName="rounded-xl" optionClassName="rounded-lg text-xs">
                    {fields.map((option) => <option key={option.key} value={option.key}>{option.label}</option>)}
                  </Select>
                </div>
                <div className="w-[88px] shrink-0">
                  <Select value={filter.operator} onChange={(event) => updateFilter(filter.id, { operator: event.target.value })} aria-label={`${field.label} comparison`} className="h-8 rounded-lg text-xs" buttonClassName="h-8 px-2 text-xs" menuClassName="rounded-xl" optionClassName="rounded-lg text-xs">
                    {operators.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </Select>
                </div>
                {field.type === "number" ? (
                  <Input type="number" value={filter.value} onChange={(event) => updateFilter(filter.id, { value: event.target.value })} aria-label={`${field.label} value`} className="h-8 min-w-[110px] flex-1 rounded-lg px-2 text-xs" />
                ) : field.type === "multi" ? (
                  <div role="group" aria-label={`${field.label} values`} className="max-h-28 min-w-[110px] flex-1 space-y-0.5 overflow-y-auto rounded-lg border border-border/80 p-1 dark:border-white/10">
                    {valueOptions.map((option) => {
                      const value = String(option.value)
                      const selectedValues = Array.isArray(filter.value) ? filter.value : []
                      return <label key={value} className="flex min-h-7 cursor-pointer items-center gap-1.5 rounded-md px-1.5 text-xs text-gray-700 hover:bg-gray-50 dark:text-zinc-300 dark:hover:bg-zinc-800">
                        <input type="checkbox" checked={selectedValues.includes(value)} onChange={(event) => updateFilter(filter.id, { value: event.target.checked ? [...selectedValues, value] : selectedValues.filter((item) => item !== value) })} aria-label={option.label} className="h-3.5 w-3.5 shrink-0 rounded" />
                        <span className="min-w-0 truncate">{option.label}</span>
                      </label>
                    })}
                  </div>
                ) : (
                  <div className="min-w-[110px] flex-1">
                    <Select value={filter.value} onChange={(event) => updateFilter(filter.id, { value: event.target.value })} aria-label={`${field.label} value`} className="h-8 rounded-lg text-xs" buttonClassName="h-8 px-2 text-xs" menuClassName="rounded-xl" optionClassName="rounded-lg text-xs">
                      {valueOptions.map((option) => <option key={String(option.value)} value={String(option.value)}>{option.label}</option>)}
                      {valueOptions.length === 0 && <option value="">No values available</option>}
                    </Select>
                  </div>
                )}
                <button type="button" onClick={() => onFiltersChange(filters.filter((item) => item.id !== filter.id))} aria-label={`Remove ${field.label} filter`} title="Remove filter" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-pup-maroon dark:text-zinc-500 dark:hover:bg-zinc-800 dark:hover:text-white cursor-pointer">
                  <Delete01Icon size={14} aria-hidden="true" />
                </button>
              </div>
            )
          })}
        </div>

        <PopoverFooter className="flex-col items-start gap-1.5 bg-gray-50/60 px-3 py-2 dark:bg-zinc-800/40">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-zinc-500">Add filter:</span>
          <div className="flex flex-wrap gap-1">
            {fields.map(({ key, label, icon: Icon = FilterIcon }) => {
              const isAtLimit = filters.filter((filter) => filter.fieldKey === key).length >= maxRulesPerField
              return <button key={key} type="button" onClick={() => addFilter(key)} disabled={isAtLimit} className="inline-flex h-7 items-center gap-1 rounded-lg border border-border bg-white px-2 text-[11px] font-medium text-gray-700 transition-colors hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-pup-maroon disabled:cursor-not-allowed disabled:opacity-45 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800 cursor-pointer">
                <Icon size={12} aria-hidden="true" className="text-gray-500 dark:text-zinc-400" />{label}
                <Add01Icon size={11} aria-hidden="true" className="text-gray-400 dark:text-zinc-500" />
              </button>
            })}
          </div>
        </PopoverFooter>
      </PopoverContent>
    </Popover>
  )
}

export function SortPopover({ options, sortBy, onSortByChange, sortOrder, onSortOrderChange }) {
  const [open, setOpen] = useState(false)
  const selectedOption = options.find((option) => option.key === sortBy) || options[0]
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <ControlButton icon={ArrowUpDownIcon} className="max-w-[210px]">{`Sort: ${selectedOption?.label || "Department"}`}</ControlButton>
      </PopoverTrigger>
      <PopoverContent align="start" className="max-h-[calc(100dvh-2rem)] w-[min(16rem,calc(100vw-2rem))] max-w-[calc(100vw-2rem)] rounded-2xl">
        <PopoverHeader className="px-4.5 py-2.5"><PopoverTitle className="text-[10px] font-semibold uppercase tracking-[0.06em] text-gray-500 dark:text-zinc-400">Sort by</PopoverTitle></PopoverHeader>
        <div className="max-h-[min(55vh,18rem)] space-y-0.5 overflow-y-auto p-1">
          {options.map(({ key, label }) => {
            const isSelected = key === sortBy
            return <button key={key} type="button" onClick={() => { onSortByChange(key); setOpen(false) }} aria-pressed={isSelected} className={cn("flex min-h-8 w-full items-center rounded-lg px-2 py-1 text-left text-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-pup-maroon dark:focus-visible:ring-red-400 cursor-pointer", isSelected ? "bg-gray-100 text-gray-900 dark:bg-zinc-800 dark:text-zinc-50 font-medium" : "text-gray-700 hover:bg-gray-50 dark:text-zinc-300 dark:hover:bg-zinc-800/70")}>
              <span className="min-w-0 flex-1 truncate">{label}</span>
              {isSelected && <Tick01Icon size={14} aria-hidden="true" className="ml-2 shrink-0 text-gray-600 dark:text-zinc-300" />}
            </button>
          })}
        </div>
        <PopoverFooter className="justify-center p-2">
          <div role="group" aria-label="Sort direction" className="flex w-full items-center gap-1 rounded-lg bg-gray-100 p-0.5 dark:bg-zinc-800">
            {[{ value: "ASC", label: "Ascending", icon: AscendingIcon }, { value: "DESC", label: "Descending", icon: DescendingIcon }].map(({ value, label, icon: Icon }) => {
              const isSelected = sortOrder === value
              return <button key={value} type="button" onClick={() => onSortOrderChange(value)} aria-pressed={isSelected} className={cn("inline-flex h-7 flex-1 items-center justify-center gap-1.5 rounded-md px-2 text-[11px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-pup-maroon cursor-pointer whitespace-nowrap", isSelected ? "bg-white text-gray-900 shadow-xs dark:bg-zinc-700 dark:text-white" : "text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white")}>
                <Icon size={12} aria-hidden="true" className="shrink-0" />
                <span className="truncate">{label}</span>
              </button>
            })}
          </div>
        </PopoverFooter>
      </PopoverContent>
    </Popover>
  )
}

export function GroupPopover({ options, groupBy, onGroupByChange }) {
  const [open, setOpen] = useState(false)
  const selectedOption = options.find((option) => option.key === groupBy) || options[0]
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <ControlButton icon={Layers01Icon} className="max-w-[185px]">{`Group: ${selectedOption?.label || "No grouping"}`}</ControlButton>
      </PopoverTrigger>
      <PopoverContent align="start" className="max-h-[calc(100dvh-2rem)] w-[min(14rem,calc(100vw-2rem))] max-w-[calc(100vw-2rem)] rounded-2xl">
        <PopoverHeader className="px-4.5 py-2.5"><PopoverTitle className="text-[10px] font-semibold uppercase tracking-[0.06em] text-gray-500 dark:text-zinc-400">Group by</PopoverTitle></PopoverHeader>
        <div className="space-y-0.5 p-1">
          {options.map(({ key, label, icon: Icon }) => {
            const isSelected = key === groupBy
            const OptionIcon = key === "none" ? MinusSignIcon : Icon || Layers01Icon
            return <button key={key} type="button" onClick={() => { onGroupByChange(key); setOpen(false) }} aria-pressed={isSelected} className={cn("flex min-h-8 w-full items-center gap-2 rounded-lg px-2 py-1 text-left text-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-pup-maroon cursor-pointer", isSelected ? "bg-gray-100 text-gray-900 dark:bg-zinc-800 dark:text-zinc-50 font-medium" : "text-gray-700 hover:bg-gray-50 dark:text-zinc-300 dark:hover:bg-zinc-800/70")}>
              {OptionIcon && <OptionIcon size={14} aria-hidden="true" className="shrink-0 text-gray-500 dark:text-zinc-400" />}
              <span className="min-w-0 flex-1 truncate">{label}</span>
              {isSelected && <Tick01Icon size={14} aria-hidden="true" className="shrink-0 text-gray-600 dark:text-zinc-300" />}
            </button>
          })}
        </div>
      </PopoverContent>
    </Popover>
  )
}

export function ColumnsPopover({ columns, visibleColumns, onVisibleColumnsChange, minVisible = 0 }) {
  const toggleColumn = (key, checked) => {
    onVisibleColumnsChange(checked
      ? [...visibleColumns, key]
      : visibleColumns.filter((columnKey) => columnKey !== key))
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <ControlButton icon={Layout2ColumnIcon}>Columns</ControlButton>
      </PopoverTrigger>
      <PopoverContent align="start" className="max-h-[calc(100dvh-2rem)] w-[min(14.5rem,calc(100vw-2rem))] max-w-[calc(100vw-2rem)] rounded-2xl">
        <PopoverHeader className="px-4.5 py-2.5"><PopoverTitle className="text-[10px] font-semibold uppercase tracking-[0.06em] text-gray-500 dark:text-zinc-400">Visible columns</PopoverTitle></PopoverHeader>
        <div className="max-h-[min(60vh,22rem)] space-y-0.5 overflow-y-auto p-1">
          {columns.map(({ key, label }) => (
            <label key={key} className="flex min-h-8 cursor-pointer items-center gap-2 rounded-lg px-2 py-1 text-xs text-gray-800 transition-colors hover:bg-gray-50 dark:text-zinc-200 dark:hover:bg-zinc-800/70">
              <input type="checkbox" checked={visibleColumns.includes(key)} disabled={visibleColumns.length <= minVisible && visibleColumns.includes(key)} onChange={(event) => toggleColumn(key, event.target.checked)} aria-label={label} className="h-3.5 w-3.5 shrink-0 rounded disabled:cursor-not-allowed" />
              <span className="min-w-0 flex-1 truncate">{label}</span>
            </label>
          ))}
        </div>
        <PopoverFooter className="p-2">
          <button type="button" onClick={() => onVisibleColumnsChange(columns.map(({ key }) => key))} disabled={columns.every(({ key }) => visibleColumns.includes(key))} className="flex min-h-7.5 w-full items-center justify-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40 dark:text-zinc-200 dark:hover:bg-zinc-800 cursor-pointer"><ReloadIcon size={13} aria-hidden="true" />Reset Columns</button>
        </PopoverFooter>
      </PopoverContent>
    </Popover>
  )
}

export default function OfficeTableControls({
  searchQuery,
  onSearchChange,
  resultCount,
  isLoading = false,
  filterFields,
  filters,
  onFiltersChange,
  sortOptions,
  sortBy,
  onSortByChange,
  sortOrder,
  onSortOrderChange,
  groupOptions,
  groupBy,
  onGroupByChange,
  columns,
  visibleColumns,
  onVisibleColumnsChange,
  showTableControls,
  scrollControls,
}) {
  return (
    <DataViewToolbar label="Department search, filters, sorting, grouping, and columns" className="gap-2 bg-white p-4 dark:bg-card sm:px-5 sm:py-3">
      <div className="flex min-w-0 items-center gap-2">
        <DashboardSearch value={searchQuery} onChange={onSearchChange} count={resultCount} loading={isLoading} label="Search departments" placeholder="Search departments by name, acronym, ID..." />
        {showTableControls && <TableScrollControls controlSize="md" {...scrollControls} />}
      </div>

      <div className="ml-auto flex shrink-0 items-center gap-2">
        <FilterPopover fields={filterFields} filters={filters} onFiltersChange={onFiltersChange} />
        {showTableControls && <>
          <SortPopover options={sortOptions} sortBy={sortBy} onSortByChange={onSortByChange} sortOrder={sortOrder} onSortOrderChange={onSortOrderChange} />
          <GroupPopover options={groupOptions} groupBy={groupBy} onGroupByChange={onGroupByChange} />
          <ColumnsPopover columns={columns} visibleColumns={visibleColumns} onVisibleColumnsChange={onVisibleColumnsChange} />
        </>}
      </div>
    </DataViewToolbar>
  )
}
