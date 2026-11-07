"use client"

import { useState, useMemo, useCallback } from "react"
import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  isValid,
} from "date-fns"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
  PopoverHeader,
  PopoverTitle,
} from "@/components/ui/popover"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import {
  Alert02Icon,
  ArrowDown01Icon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
  Calendar01Icon,
  Cancel01Icon,
  ChartLineData01Icon,
  Clock01Icon,
  PencilEdit01Icon,
  ReloadIcon,
  Tick01Icon,
} from "hugeicons-react"
import {
  parseDateLocal,
  formatDateIso,
  parseInputDate,
  getMatchingPresetKey,
  formatPresetRange,
  calculateCoverageDays,
} from "@/lib/dateRangeUtils"

export {
  parseDateLocal,
  formatDateIso,
  parseInputDate,
  getMatchingPresetKey,
  formatPresetRange,
  calculateCoverageDays,
}

const PRESET_DEFINITIONS = [
  { key: "today", label: "Today", icon: Calendar01Icon },
  { key: "yesterday", label: "Yesterday", icon: Calendar01Icon },
  { key: "last7", label: "Last 7 days", icon: Calendar01Icon },
  { key: "last30", label: "Last 30 days", icon: Calendar01Icon },
  { key: "thisQuarter", label: "This quarter", icon: Clock01Icon },
  { key: "yearToDate", label: "Year to date", icon: ChartLineData01Icon },
  { key: "all", label: "All time", icon: ReloadIcon },
  { key: "custom", label: "Custom", icon: PencilEdit01Icon },
]

/**
 * Shared Date Range Content (used in both Popover and Dialog variants)
 */
export function DateRangePickerContent({
  startDate = "",
  endDate = "",
  onApply,
  onClear,
  onClose,
  disableFutureDates = true,
  minDate,
  maxDate,
  showHeader = true,
}) {
  const todayStr = useMemo(() => format(new Date(), "yyyy-MM-dd"), [])

  const [tempStart, setTempStart] = useState(startDate || "")
  const [tempEnd, setTempEnd] = useState(endDate || "")

  const [startInputText, setStartInputText] = useState(() => {
    if (!startDate) return ""
    const dt = parseDateLocal(startDate)
    return dt ? format(dt, "MMM d, yyyy") : startDate
  })

  const [endInputText, setEndInputText] = useState(() => {
    if (!endDate) return ""
    const dt = parseDateLocal(endDate)
    const isToday = endDate === todayStr
    return dt ? `${format(dt, "MMM d, yyyy")}${isToday ? " · today" : ""}` : endDate
  })

  const [viewDate, setViewDate] = useState(() => {
    const initial = parseDateLocal(startDate) || new Date()
    return startOfMonth(initial)
  })

  const [hoveredDate, setHoveredDate] = useState(null)
  const [manualInputError, setManualInputError] = useState(null)

  // Active preset calculation
  const activePresetKey = useMemo(() => {
    return getMatchingPresetKey(tempStart, tempEnd)
  }, [tempStart, tempEnd])

  // Strict start-end validation
  const validation = useMemo(() => {
    if (manualInputError) {
      return { isValid: false, error: manualInputError }
    }

    if (!tempStart && !tempEnd) {
      return { isValid: true, error: null, isEmpty: true }
    }

    if (tempStart && !tempEnd) {
      return {
        isValid: false,
        error: null,
        hint: "Click a second date on the calendar to set the end of the range.",
      }
    }

    if (!tempStart && tempEnd) {
      return {
        isValid: false,
        error: "Please select a start date.",
      }
    }

    // Both dates are populated: enforce start <= end strictly
    if (tempStart > tempEnd) {
      return {
        isValid: false,
        error: "Start date cannot be after end date.",
      }
    }

    if (disableFutureDates) {
      if (tempStart > todayStr || tempEnd > todayStr) {
        return {
          isValid: false,
          error: "Selected dates cannot be in the future.",
        }
      }
    }

    if (minDate && tempStart < minDate) {
      return {
        isValid: false,
        error: `Start date cannot be before ${minDate}.`,
      }
    }

    if (maxDate && tempEnd > maxDate) {
      return {
        isValid: false,
        error: `End date cannot be after ${maxDate}.`,
      }
    }

    return { isValid: true, error: null }
  }, [tempStart, tempEnd, manualInputError, disableFutureDates, todayStr, minDate, maxDate])

  // Days count calculation
  const daysCount = useMemo(() => {
    return calculateCoverageDays(tempStart, tempEnd)
  }, [tempStart, tempEnd])

  // Preset click handler
  const handleSelectPreset = useCallback(
    (key) => {
      setManualInputError(null)
      const range = formatPresetRange(key)
      if (!range) return

      setTempStart(range.start)
      setTempEnd(range.end)

      if (range.start) {
        const sDt = parseDateLocal(range.start)
        setStartInputText(sDt ? format(sDt, "MMM d, yyyy") : range.start)
        setViewDate(startOfMonth(sDt))
      } else {
        setStartInputText("")
      }

      if (range.end) {
        const eDt = parseDateLocal(range.end)
        const isToday = range.end === todayStr
        setEndInputText(eDt ? `${format(eDt, "MMM d, yyyy")}${isToday ? " · today" : ""}` : range.end)
      } else {
        setEndInputText("")
      }
    },
    [todayStr]
  )

  // Day click handler on the calendar
  const handleDayClick = useCallback(
    (dateStr) => {
      setManualInputError(null)

      if (disableFutureDates && dateStr > todayStr) return
      if (minDate && dateStr < minDate) return
      if (maxDate && dateStr > maxDate) return

      if (!tempStart || (tempStart && tempEnd)) {
        setTempStart(dateStr)
        setTempEnd("")
        const dt = parseDateLocal(dateStr)
        setStartInputText(dt ? format(dt, "MMM d, yyyy") : dateStr)
        setEndInputText("")
      } else if (tempStart && !tempEnd) {
        if (dateStr >= tempStart) {
          setTempEnd(dateStr)
          const dt = parseDateLocal(dateStr)
          const isToday = dateStr === todayStr
          setEndInputText(dt ? `${format(dt, "MMM d, yyyy")}${isToday ? " · today" : ""}` : dateStr)
        } else {
          setTempStart(dateStr)
          const dt = parseDateLocal(dateStr)
          setStartInputText(dt ? format(dt, "MMM d, yyyy") : dateStr)
          setTempEnd("")
          setEndInputText("")
        }
      }
    },
    [tempStart, tempEnd, disableFutureDates, todayStr, minDate, maxDate]
  )

  // Manual typing in Start date input
  const handleStartInputChange = (e) => {
    const val = e.target.value
    setStartInputText(val)
    if (!val.trim()) {
      setTempStart("")
      setManualInputError(null)
      return
    }
    const parsed = parseInputDate(val)
    if (parsed) {
      setTempStart(parsed)
      setManualInputError(null)
      const dt = parseDateLocal(parsed)
      if (dt) setViewDate(startOfMonth(dt))
    } else {
      setManualInputError("Please enter a valid start date (e.g. YYYY-MM-DD or Nov 15, 2026).")
    }
  }

  // Manual typing in End date input
  const handleEndInputChange = (e) => {
    const val = e.target.value
    setEndInputText(val)
    if (!val.trim()) {
      setTempEnd("")
      setManualInputError(null)
      return
    }
    const parsed = parseInputDate(val)
    if (parsed) {
      setTempEnd(parsed)
      setManualInputError(null)
    } else {
      setManualInputError("Please enter a valid end date (e.g. YYYY-MM-DD or Nov 15, 2026).")
    }
  }

  // Navigation
  const handlePrevMonth = () => setViewDate((prev) => subMonths(prev, 1))
  const handleNextMonth = () => setViewDate((prev) => addMonths(prev, 1))

  // Apply action
  const handleApply = () => {
    if (!validation.isValid) return
    onApply?.({
      startDate: tempStart,
      endDate: tempEnd,
      presetKey: activePresetKey,
    })
    onClose?.()
  }

  // Reset to All Time action
  const handleReset = () => {
    setTempStart("")
    setTempEnd("")
    setStartInputText("")
    setEndInputText("")
    setManualInputError(null)
    onClear?.()
    onApply?.({
      startDate: "",
      endDate: "",
      presetKey: "all",
    })
  }

  const month1Date = viewDate
  const month2Date = addMonths(viewDate, 1)

  return (
    <div className="flex flex-col">
      {/* Optional Popover Header matching Filter by Header in OfficeTableControls */}
      {showHeader && (
        <PopoverHeader className="px-4.5 py-2.5 border-b border-black/[0.06] dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02] flex items-center justify-between">
          <PopoverTitle className="text-[10px] font-semibold uppercase tracking-[0.06em] text-gray-500 dark:text-zinc-400">
            Filter by date range
          </PopoverTitle>
          {(tempStart || tempEnd) && (
            <button
              type="button"
              onClick={handleReset}
              className="rounded-lg px-1.5 py-0.5 text-[11px] font-medium text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-pup-maroon dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-white cursor-pointer"
            >
              Clear all
            </button>
          )}
        </PopoverHeader>
      )}

      {/* Main Body: Left Presets Sidebar + Right Calendars */}
      <div className="flex flex-col md:flex-row">
        {/* Left Column: PRESETS */}
        <div className="w-full md:w-[150px] shrink-0 border-b md:border-b-0 md:border-r border-border dark:border-border/60 p-2.5 bg-gray-50/50 dark:bg-zinc-900/40 flex flex-col justify-between">
          <div>
            <div className="px-1.5 pt-0.5 pb-1.5">
              <span className="text-[10px] font-semibold tracking-wider text-gray-400 dark:text-zinc-500 uppercase select-none">
                Presets
              </span>
            </div>
            <div className="space-y-0.5">
              {PRESET_DEFINITIONS.map((preset) => {
                const Icon = preset.icon
                const isActive = activePresetKey === preset.key
                return (
                  <button
                    key={preset.key}
                    type="button"
                    onClick={() => handleSelectPreset(preset.key)}
                    className={cn(
                      "w-full flex items-center justify-between px-2 py-1.25 rounded-lg text-xs font-medium transition-all cursor-pointer text-left",
                      isActive
                        ? "bg-pup-maroon/10 text-pup-maroon font-semibold dark:bg-pup-maroon/20 dark:text-red-400"
                        : "text-gray-700 hover:bg-gray-100 hover:text-gray-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-white"
                    )}
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      <Icon size={13} className="shrink-0 opacity-70" />
                      <span className="truncate">{preset.label}</span>
                    </div>
                    {isActive && (
                      <Tick01Icon
                        size={13}
                        className="text-pup-maroon dark:text-red-400 shrink-0 ml-1"
                      />
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="hidden md:block px-1.5 pt-2 pb-0.5">
            <span className="text-[9px] text-gray-400 dark:text-zinc-500 leading-tight block">
              Strict validation active
            </span>
          </div>
        </div>

        {/* Right Column: Inputs & Dual Month Calendars */}
        <div className="flex-1 p-2.5 sm:p-3 flex flex-col">
          <div>
            {/* Top Row: Start & End Inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pb-1.5">
              {/* Start Date Input */}
              <div>
                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-gray-500 dark:text-zinc-400">
                  Start
                </label>
                <div className="relative flex items-center">
                  <Calendar01Icon
                    size={14}
                    className="pointer-events-none absolute left-2.5 z-10 text-gray-400 dark:text-zinc-500"
                  />
                  <Input
                    type="text"
                    value={startInputText}
                    onChange={handleStartInputChange}
                    placeholder="e.g. Nov 15, 2026"
                    className={cn(
                      "h-8.5 pl-8 pr-2.5 rounded-xl border bg-white dark:bg-zinc-800 text-xs font-normal text-gray-900 dark:text-zinc-100 placeholder:text-gray-400 dark:placeholder:text-zinc-500 shadow-xs transition-all",
                      validation.error && tempStart > tempEnd
                        ? "border-red-500 focus-visible:ring-red-500 dark:border-red-500"
                        : "border-border dark:border-white/10 focus-visible:ring-pup-maroon"
                    )}
                  />
                </div>
              </div>

              {/* End Date Input */}
              <div>
                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-gray-500 dark:text-zinc-400">
                  End
                </label>
                <div className="relative flex items-center">
                  <Calendar01Icon
                    size={14}
                    className="pointer-events-none absolute left-2.5 z-10 text-gray-400 dark:text-zinc-500"
                  />
                  <Input
                    type="text"
                    value={endInputText}
                    onChange={handleEndInputChange}
                    placeholder="e.g. Dec 14, 2026"
                    className={cn(
                      "h-8.5 pl-8 pr-2.5 rounded-xl border bg-white dark:bg-zinc-800 text-xs font-normal text-gray-900 dark:text-zinc-100 placeholder:text-gray-400 dark:placeholder:text-zinc-500 shadow-xs transition-all",
                      validation.error && tempStart > tempEnd
                        ? "border-red-500 focus-visible:ring-red-500 dark:border-red-500"
                        : "border-border dark:border-white/10 focus-visible:ring-pup-maroon"
                    )}
                  />
                </div>
              </div>
            </div>

            {/* Validation Error Message */}
            {validation.error && (
              <div className="mb-2 flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50/80 px-2.5 py-1.5 text-xs font-medium text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400 animate-in fade-in">
                <Alert02Icon size={14} className="shrink-0" />
                <span>{validation.error}</span>
              </div>
            )}

            {/* Selection in-progress hint */}
            {!validation.error && validation.hint && (
              <div className="mb-2 flex items-center gap-1.5 rounded-lg border border-pup-maroon/20 bg-pup-maroon/5 px-2.5 py-1 text-xs text-pup-maroon dark:border-red-500/30 dark:bg-red-950/20 dark:text-red-400 animate-in fade-in">
                <span>{validation.hint}</span>
              </div>
            )}

            {/* Dual Month Calendar Section */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-0.5 pt-0.5">
              {/* Month 1 */}
              <SingleMonthGrid
                monthDate={month1Date}
                tempStart={tempStart}
                tempEnd={tempEnd}
                hoveredDate={hoveredDate}
                onHoverDate={setHoveredDate}
                onSelectDate={handleDayClick}
                todayStr={todayStr}
                disableFutureDates={disableFutureDates}
                minDate={minDate}
                maxDate={maxDate}
                headerLeft={
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={handlePrevMonth}
                    className="h-6.5 w-6.5 rounded-md text-gray-600 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white cursor-pointer"
                    title="Previous month"
                  >
                    <ArrowLeft01Icon size={13} />
                  </Button>
                }
                headerRight={null}
              />

              {/* Month 2 */}
              <SingleMonthGrid
                monthDate={month2Date}
                tempStart={tempStart}
                tempEnd={tempEnd}
                hoveredDate={hoveredDate}
                onHoverDate={setHoveredDate}
                onSelectDate={handleDayClick}
                todayStr={todayStr}
                disableFutureDates={disableFutureDates}
                minDate={minDate}
                maxDate={maxDate}
                headerLeft={null}
                headerRight={
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={handleNextMonth}
                    className="h-6.5 w-6.5 rounded-md text-gray-600 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white cursor-pointer"
                    title="Next month"
                  >
                    <ArrowRight01Icon size={13} />
                  </Button>
                }
              />
            </div>
          </div>
        </div>
      </div>

      {/* Popover / Dialog Footer: Apple HIG Compliant */}
      <div className="p-2.5 px-3.5 border-t border-border dark:border-border/60 bg-gray-50/70 dark:bg-zinc-900/50 flex items-center justify-between">
        {/* Left: Summary Info */}
        <div className="flex items-center gap-2.5">
          {tempStart && tempEnd && tempStart <= tempEnd ? (
            <span className="text-xs text-gray-600 dark:text-zinc-400">
              Coverage:{" "}
              <strong className="font-semibold text-gray-900 dark:text-zinc-100 tabular-nums">
                {daysCount} {daysCount === 1 ? "day" : "days"}
              </strong>
            </span>
          ) : (
            <span className="text-xs text-gray-500 dark:text-zinc-400">
              All records (no filter)
            </span>
          )}

          {(tempStart || tempEnd) && (
            <button
              type="button"
              onClick={handleReset}
              className="text-xs font-medium text-pup-maroon dark:text-red-400 hover:underline cursor-pointer"
            >
              Reset
            </button>
          )}
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="h-8 px-3 text-xs font-semibold rounded-xl border border-black/[0.06] dark:border-white/[0.08] bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-xs cursor-pointer active:scale-95 transition-all"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleApply}
            disabled={!validation.isValid}
            className="h-8 px-3.5 text-xs font-semibold"
          >
            Apply Range
          </Button>
        </div>
      </div>
    </div>
  )
}

/**
 * Calendar Grid for a Single Month
 */
function SingleMonthGrid({
  monthDate,
  tempStart,
  tempEnd,
  hoveredDate,
  onHoverDate,
  onSelectDate,
  todayStr,
  disableFutureDates,
  minDate,
  maxDate,
  headerLeft,
  headerRight,
}) {
  const monthStart = startOfMonth(monthDate)
  const year = monthDate.getFullYear()
  const month = monthDate.getMonth()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const startDayOfWeek = monthStart.getDay() // 0 = Sunday

  // Effective hover preview range
  const hoverRange = useMemo(() => {
    if (!tempStart || tempEnd || !hoveredDate) return null
    if (hoveredDate >= tempStart) {
      return { start: tempStart, end: hoveredDate }
    }
    return { start: hoveredDate, end: tempStart }
  }, [tempStart, tempEnd, hoveredDate])

  const days = []
  for (let i = 0; i < startDayOfWeek; i++) {
    days.push(null)
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const dStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`
    days.push(dStr)
  }

  const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"]

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between h-7 mb-1 px-0.5">
        <div className="w-6.5">{headerLeft}</div>
        <span className="text-xs font-semibold text-gray-900 dark:text-zinc-100 select-none">
          {format(monthDate, "MMMM yyyy")}
        </span>
        <div className="w-6.5 flex justify-end">{headerRight}</div>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 mb-0.5 text-center">
        {WEEKDAYS.map((day) => (
          <span
            key={day}
            className="text-[10px] font-semibold text-gray-400 dark:text-zinc-500 uppercase select-none py-0.5"
          >
            {day}
          </span>
        ))}
      </div>

      {/* Days matrix */}
      <div
        className="grid grid-cols-7 gap-y-0.5"
        onMouseLeave={() => onHoverDate?.(null)}
      >
        {days.map((dStr, index) => {
          if (!dStr) {
            return <div key={`empty-${index}`} className="h-7 w-full" />
          }

          const dayNumber = parseInt(dStr.split("-")[2], 10)
          const isToday = dStr === todayStr
          const isStart = dStr === tempStart
          const isEnd = dStr === tempEnd
          const hasStart = !!tempStart
          const hasEnd = !!tempEnd

          const isBetweenSelected =
            hasStart && hasEnd && dStr > tempStart && dStr < tempEnd
          const isBetweenHover =
            hoverRange && dStr >= hoverRange.start && dStr <= hoverRange.end

          const isFuture = disableFutureDates && dStr > todayStr
          const isBeforeMin = minDate && dStr < minDate
          const isAfterMax = maxDate && dStr > maxDate
          const isDisabled = isFuture || isBeforeMin || isAfterMax

          const colIndex = index % 7

          return (
            <div
              key={dStr}
              onMouseEnter={() => !isDisabled && onHoverDate?.(dStr)}
              className="relative h-7 flex items-center justify-center select-none"
            >
              {/* Day button */}
              <button
                type="button"
                disabled={isDisabled}
                onClick={() => onSelectDate(dStr)}
                className={cn(
                  "relative z-10 flex h-6.5 w-6.5 items-center justify-center rounded-full text-[11px] tabular-nums transition-all",
                  isStart || isEnd
                    ? "bg-pup-maroon text-white font-semibold shadow-xs cursor-pointer active:scale-95"
                    : isBetweenSelected
                      ? "text-pup-maroon dark:text-red-400 font-semibold cursor-pointer"
                      : isDisabled
                        ? "text-gray-300 dark:text-zinc-600 cursor-not-allowed pointer-events-none"
                        : "text-gray-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-800 cursor-pointer active:scale-95",
                  isToday &&
                    !isStart &&
                    !isEnd &&
                    "after:absolute after:bottom-0.5 after:h-1 after:w-1 after:rounded-full after:bg-pup-maroon dark:after:bg-red-400 font-semibold"
                )}
              >
                {dayNumber}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/**
 * Revamped Popover-Based Date Range Picker (anchored directly under table control buttons)
 */
export function DateRangePopover({
  open,
  onOpenChange,
  trigger,
  startDate = "",
  endDate = "",
  onApply,
  onClear,
  disableFutureDates = true,
  minDate,
  maxDate,
  align = "start",
  sideOffset = 6,
}) {
  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      {trigger && <PopoverTrigger asChild>{trigger}</PopoverTrigger>}
      <PopoverContent
        align={align}
        sideOffset={sideOffset}
        className="w-[min(600px,calc(100vw-2rem))] max-w-[calc(100vw-2rem)] rounded-2xl border border-border dark:border-white/10 bg-white dark:bg-card p-0 shadow-2xl overflow-hidden outline-hidden"
      >
        {open && (
          <DateRangePickerContent
            key={`${startDate}_${endDate}`}
            startDate={startDate}
            endDate={endDate}
            onApply={onApply}
            onClear={onClear}
            onClose={() => onOpenChange?.(false)}
            disableFutureDates={disableFutureDates}
            minDate={minDate}
            maxDate={maxDate}
            showHeader={true}
          />
        )}
      </PopoverContent>
    </Popover>
  )
}

/**
 * Modal variant (preserved for scenarios requiring centered full dialog)
 */
export function DateRangePickerModal({
  open,
  onOpenChange,
  startDate = "",
  endDate = "",
  onApply,
  onClear,
  disableFutureDates = true,
  minDate,
  maxDate,
  title = "Select Date Range",
  description = "Filter records by choosing a preset or custom date range.",
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        hideClose={false}
        className="w-[95vw] max-w-[740px] p-0 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-white/10 dark:bg-card gap-0"
      >
        <DialogHeader className="sr-only">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {open && (
          <DateRangePickerContent
            key={`${startDate}_${endDate}`}
            startDate={startDate}
            endDate={endDate}
            onApply={onApply}
            onClear={onClear}
            onClose={() => onOpenChange?.(false)}
            disableFutureDates={disableFutureDates}
            minDate={minDate}
            maxDate={maxDate}
            showHeader={false}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

/**
 * Compact, unified Date Range Filter Button for Table Toolbars
 * Defaults to the Popover presentation (anchored beneath the button)
 */
export function DateRangeFilterButton({
  startDate = "",
  endDate = "",
  onApply,
  onClear,
  disableFutureDates = true,
  placeholder = "Date Range",
  className,
  title = "Filter by Date Range",
  variant = "popover", // "popover" (default) or "modal"
}) {
  const [isOpen, setIsOpen] = useState(false)

  const displayLabel = useMemo(() => {
    if (!startDate && !endDate) return placeholder

    const preset = getMatchingPresetKey(startDate, endDate)
    if (preset === "today") return "Today"
    if (preset === "yesterday") return "Yesterday"
    if (preset === "last7") return "Last 7 days"
    if (preset === "last30") return "Last 30 days"
    if (preset === "thisQuarter") return "This quarter"
    if (preset === "yearToDate") return "Year to date"

    const sDt = parseDateLocal(startDate)
    const eDt = parseDateLocal(endDate)

    if (startDate && endDate) {
      if (startDate === endDate && sDt) {
        return format(sDt, "MMM d, yyyy")
      }
      if (sDt && eDt) {
        if (sDt.getFullYear() === eDt.getFullYear()) {
          return `${format(sDt, "MMM d")} – ${format(eDt, "MMM d, yyyy")}`
        }
        return `${format(sDt, "MMM d, yyyy")} – ${format(eDt, "MMM d, yyyy")}`
      }
      return `${startDate} – ${endDate}`
    }

    if (startDate && sDt) return `From ${format(sDt, "MMM d, yyyy")}`
    if (endDate && eDt) return `Until ${format(eDt, "MMM d, yyyy")}`

    return placeholder
  }, [startDate, endDate, placeholder])

  const hasActiveRange = Boolean(startDate || endDate)

  const handleClearClick = (e) => {
    e.stopPropagation()
    onClear?.()
    onApply?.({ startDate: "", endDate: "", presetKey: "all" })
  }

  const triggerButton = (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={() => setIsOpen((prev) => !prev)}
      title={title}
      className={cn(
        "h-9 shrink-0 gap-2 rounded-xl px-3 text-xs font-normal shadow-xs transition-all cursor-pointer whitespace-nowrap",
        hasActiveRange
          ? "border-border dark:border-border bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-100 font-medium hover:bg-gray-50 dark:hover:bg-zinc-700"
          : "border-border dark:border-border bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700",
        className
      )}
    >
      <Calendar01Icon
        size={14}
        className={cn(
          "shrink-0",
          hasActiveRange
            ? "text-pup-maroon dark:text-red-400"
            : "text-gray-500 dark:text-zinc-400"
        )}
      />
      <span className="truncate max-w-[210px]">{displayLabel}</span>

      {hasActiveRange && (
        <span
          role="button"
          tabIndex={0}
          aria-label="Clear date range"
          onClick={handleClearClick}
          className="ml-0.5 rounded-full p-0.5 hover:bg-black/10 dark:hover:bg-white/10 text-gray-500 hover:text-gray-800 dark:text-zinc-400 dark:hover:text-zinc-100 transition-colors"
        >
          <Cancel01Icon size={12} />
        </span>
      )}

      <ArrowDown01Icon
        size={13}
        className={cn(
          "shrink-0 text-gray-400 dark:text-zinc-500 ml-0.5 transition-transform duration-150",
          isOpen && "rotate-180"
        )}
      />
    </Button>
  )

  if (variant === "modal") {
    return (
      <>
        {triggerButton}
        <DateRangePickerModal
          open={isOpen}
          onOpenChange={setIsOpen}
          startDate={startDate}
          endDate={endDate}
          onApply={onApply}
          onClear={onClear}
          disableFutureDates={disableFutureDates}
        />
      </>
    )
  }

  return (
    <DateRangePopover
      open={isOpen}
      onOpenChange={setIsOpen}
      trigger={triggerButton}
      startDate={startDate}
      endDate={endDate}
      onApply={onApply}
      onClear={onClear}
      disableFutureDates={disableFutureDates}
    />
  )
}

export default DateRangeFilterButton
