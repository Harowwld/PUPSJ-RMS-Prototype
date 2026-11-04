import {
  format,
  subDays,
  startOfQuarter,
  startOfYear,
  isValid,
  differenceInCalendarDays,
} from "date-fns"

/**
 * Parse YYYY-MM-DD safely in local timezone without UTC offset shifts
 */
export function parseDateLocal(str) {
  if (!str || typeof str !== "string") return undefined
  const parts = str.split("-").map(Number)
  if (parts.length !== 3 || parts.some(isNaN)) return undefined
  const [y, m, d] = parts
  const dt = new Date(y, m - 1, d)
  if (dt.getFullYear() !== y || dt.getMonth() !== m - 1 || dt.getDate() !== d) {
    return undefined
  }
  return dt
}

/**
 * Format local date as YYYY-MM-DD
 */
export function formatDateIso(date) {
  if (!date || !isValid(date)) return ""
  return format(date, "yyyy-MM-dd")
}

/**
 * Flexible input parser supporting:
 * - YYYY-MM-DD (e.g. 2026-11-15)
 * - MM/DD/YYYY (e.g. 11/15/2026)
 * - Readable text (e.g. "Nov 15, 2026", "Dec 14, 2026 · today")
 */
export function parseInputDate(val) {
  if (typeof val !== "string") return null
  const clean = val.replace(/·\s*today/i, "").trim()
  if (!clean) return ""

  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
    const [y, m, d] = clean.split("-").map(Number)
    const dt = new Date(y, m - 1, d)
    if (isValid(dt) && dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d) {
      return format(dt, "yyyy-MM-dd")
    }
  }

  // MM/DD/YYYY
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(clean)) {
    const [m, d, y] = clean.split("/").map(Number)
    const dt = new Date(y, m - 1, d)
    if (isValid(dt) && dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d) {
      return format(dt, "yyyy-MM-dd")
    }
  }

  // Readable date parsing
  const dt = new Date(clean)
  if (isValid(dt) && !isNaN(dt.getTime())) {
    return format(dt, "yyyy-MM-dd")
  }

  return null
}

/**
 * Identifies which preset key matches the given range
 */
export function getMatchingPresetKey(startDate, endDate) {
  if (!startDate && !endDate) return "all"
  const today = new Date()
  const todayStr = format(today, "yyyy-MM-dd")
  const yesterdayStr = format(subDays(today, 1), "yyyy-MM-dd")
  const last7Str = format(subDays(today, 6), "yyyy-MM-dd")
  const last30Str = format(subDays(today, 29), "yyyy-MM-dd")
  const quarterStartStr = format(startOfQuarter(today), "yyyy-MM-dd")
  const yearStartStr = format(startOfYear(today), "yyyy-MM-dd")

  if (startDate === todayStr && endDate === todayStr) return "today"
  if (startDate === yesterdayStr && endDate === yesterdayStr) return "yesterday"
  if (startDate === last7Str && endDate === todayStr) return "last7"
  if (startDate === last30Str && endDate === todayStr) return "last30"
  if (startDate === quarterStartStr && endDate === todayStr) return "thisQuarter"
  if (startDate === yearStartStr && endDate === todayStr) return "yearToDate"

  return "custom"
}

/**
 * Generates ISO start/end date pairs for each preset option
 */
export function formatPresetRange(key) {
  const today = new Date()
  const todayStr = format(today, "yyyy-MM-dd")
  switch (key) {
    case "today":
      return { start: todayStr, end: todayStr }
    case "yesterday": {
      const yestStr = format(subDays(today, 1), "yyyy-MM-dd")
      return { start: yestStr, end: yestStr }
    }
    case "last7":
      return { start: format(subDays(today, 6), "yyyy-MM-dd"), end: todayStr }
    case "last30":
      return { start: format(subDays(today, 29), "yyyy-MM-dd"), end: todayStr }
    case "thisQuarter":
      return { start: format(startOfQuarter(today), "yyyy-MM-dd"), end: todayStr }
    case "yearToDate":
      return { start: format(startOfYear(today), "yyyy-MM-dd"), end: todayStr }
    case "all":
      return { start: "", end: "" }
    default:
      return null
  }
}

/**
 * Strict Start-End Validation rules
 */
export function validateDateRange(startDate, endDate, options = {}) {
  const { disableFutureDates = true, minDate, maxDate } = options
  const todayStr = format(new Date(), "yyyy-MM-dd")

  if (!startDate && !endDate) {
    return { isValid: true, error: null, isEmpty: true }
  }

  if (startDate && !endDate) {
    return {
      isValid: false,
      error: null,
      hint: "Click a second date on the calendar to set the end of the range.",
    }
  }

  if (!startDate && endDate) {
    return {
      isValid: false,
      error: "Please select a start date.",
    }
  }

  // Strict start <= end enforcement
  if (startDate > endDate) {
    return {
      isValid: false,
      error: "Start date cannot be after end date.",
    }
  }

  // Future dates guard
  if (disableFutureDates) {
    if (startDate > todayStr || endDate > todayStr) {
      return {
        isValid: false,
        error: "Selected dates cannot be in the future.",
      }
    }
  }

  if (minDate && startDate < minDate) {
    return {
      isValid: false,
      error: `Start date cannot be before ${minDate}.`,
    }
  }

  if (maxDate && endDate > maxDate) {
    return {
      isValid: false,
      error: `End date cannot be after ${maxDate}.`,
    }
  }

  return { isValid: true, error: null }
}

/**
 * Calculates day count inclusive
 */
export function calculateCoverageDays(startDate, endDate) {
  if (!startDate || !endDate || startDate > endDate) return 0
  const startDt = parseDateLocal(startDate)
  const endDt = parseDateLocal(endDate)
  if (!startDt || !endDt) return 0
  return differenceInCalendarDays(endDt, startDt) + 1
}
