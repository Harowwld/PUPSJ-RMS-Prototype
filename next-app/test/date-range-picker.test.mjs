import test from "node:test"
import assert from "node:assert/strict"
import {
  parseDateLocal,
  formatDateIso,
  parseInputDate,
  getMatchingPresetKey,
  formatPresetRange,
  validateDateRange,
  calculateCoverageDays,
} from "../src/lib/dateRangeUtils.js"
import { format, subDays, startOfQuarter, startOfYear } from "date-fns"
import { formatManilaCalendarDate } from "../src/lib/timeFormat.js"

test("DateRangePicker - parseDateLocal", () => {
  const d = parseDateLocal("2026-11-04")
  assert.ok(d instanceof Date)
  assert.equal(d.getFullYear(), 2026)
  assert.equal(d.getMonth(), 10) // 0-indexed November
  assert.equal(d.getDate(), 4)

  assert.equal(parseDateLocal(""), undefined)
  assert.equal(parseDateLocal(null), undefined)
  assert.equal(parseDateLocal("invalid"), undefined)
  assert.equal(parseDateLocal("2026-02-31"), undefined) // Invalid leap/day
})

test("DateRangePicker - formatDateIso", () => {
  const d = new Date(2026, 10, 4)
  assert.equal(formatDateIso(d), "2026-11-04")
  assert.equal(formatDateIso(null), "")
  assert.equal(formatDateIso(new Date("invalid")), "")
})

test("DateRangePicker - parseInputDate flexible formats", () => {
  // YYYY-MM-DD
  assert.equal(parseInputDate("2026-11-15"), "2026-11-15")
  // MM/DD/YYYY
  assert.equal(parseInputDate("11/15/2026"), "2026-11-15")
  // Readable text with suffix
  assert.equal(parseInputDate("Dec 14, 2026 · today"), "2026-12-14")
  assert.equal(parseInputDate("Nov 15, 2026"), "2026-11-15")
  // Invalid
  assert.equal(parseInputDate(""), "")
  assert.equal(parseInputDate(null), null)
  assert.equal(parseInputDate("not-a-date"), null)
})

test("DateRangePicker - preset matching and range formatting", () => {
  const todayStr = formatManilaCalendarDate(new Date())
  const today = parseDateLocal(todayStr)
  const yesterdayStr = format(subDays(today, 1), "yyyy-MM-dd")
  const last7Str = format(subDays(today, 6), "yyyy-MM-dd")
  const last30Str = format(subDays(today, 29), "yyyy-MM-dd")
  const quarterStartStr = format(startOfQuarter(today), "yyyy-MM-dd")
  const yearStartStr = format(startOfYear(today), "yyyy-MM-dd")

  // Test match key
  assert.equal(getMatchingPresetKey("", ""), "all")
  assert.equal(getMatchingPresetKey(todayStr, todayStr), "today")
  assert.equal(getMatchingPresetKey(yesterdayStr, yesterdayStr), "yesterday")
  assert.equal(getMatchingPresetKey(last7Str, todayStr), "last7")
  assert.equal(getMatchingPresetKey(last30Str, todayStr), "last30")
  assert.equal(getMatchingPresetKey(quarterStartStr, todayStr), "thisQuarter")
  assert.equal(getMatchingPresetKey(yearStartStr, todayStr), "yearToDate")
  assert.equal(getMatchingPresetKey("2025-01-01", "2025-02-01"), "custom")

  // Test preset range generation
  assert.deepEqual(formatPresetRange("today"), { start: todayStr, end: todayStr })
  assert.deepEqual(formatPresetRange("yesterday"), { start: yesterdayStr, end: yesterdayStr })
  assert.deepEqual(formatPresetRange("last7"), { start: last7Str, end: todayStr })
  assert.deepEqual(formatPresetRange("last30"), { start: last30Str, end: todayStr })
  assert.deepEqual(formatPresetRange("all"), { start: "", end: "" })
})

test("DateRangePicker - strict start-end validation rules", () => {
  const todayStr = formatManilaCalendarDate(new Date())

  // Valid range: start <= end
  const resValid = validateDateRange("2026-10-01", "2026-10-31", { disableFutureDates: false })
  assert.equal(resValid.isValid, true)
  assert.equal(resValid.error, null)

  // Empty range: valid (all time)
  const resEmpty = validateDateRange("", "")
  assert.equal(resEmpty.isValid, true)
  assert.equal(resEmpty.isEmpty, true)

  // Incomplete range: invalid
  const resIncomplete = validateDateRange("2026-10-01", "")
  assert.equal(resIncomplete.isValid, false)
  assert.ok(resIncomplete.hint.includes("second date"))

  // Inverted range: start > end strictly invalid
  const resInverted = validateDateRange("2026-11-01", "2026-10-01")
  assert.equal(resInverted.isValid, false)
  assert.equal(resInverted.error, "Start date cannot be after end date.")

  // Future date check
  const resFuture = validateDateRange("2099-01-01", "2099-01-02", { disableFutureDates: true })
  assert.equal(resFuture.isValid, false)
  assert.equal(resFuture.error, "Selected dates cannot be in the future.")

  // Coverage days
  assert.equal(calculateCoverageDays("2026-10-01", "2026-10-31"), 31)
  assert.equal(calculateCoverageDays("2026-11-01", "2026-11-01"), 1)
  assert.equal(calculateCoverageDays("2026-11-05", "2026-11-01"), 0)
})

test("DateRangePicker - Philippine timezone boundary integrity", () => {
  // A timestamp recorded at Nov 1, 2:00 AM Manila time is Oct 31, 18:00 UTC
  const utcIsoString = "2026-10-31T18:00:50.546Z"
  const dateObj = new Date(utcIsoString)

  // In Asia/Manila, this date must format to Nov 1, 2026
  const manilaDateStr = dateObj.toLocaleDateString("en-CA", { timeZone: "Asia/Manila" }) // en-CA gives YYYY-MM-DD
  assert.equal(manilaDateStr, "2026-11-01")

  // Filtering Oct 1 to Oct 31 must NOT include Nov 1 Manila records
  const isIncludedInOctober = manilaDateStr >= "2026-10-01" && manilaDateStr <= "2026-10-31"
  assert.equal(isIncludedInOctober, false, "Nov 1 Manila timestamp must NOT fall within Oct 1 - Oct 31")

  // Filtering Nov 1 must include it
  const isIncludedInNovember = manilaDateStr >= "2026-11-01" && manilaDateStr <= "2026-11-01"
  assert.equal(isIncludedInNovember, true, "Nov 1 Manila timestamp must fall within Nov 1 - Nov 1")
})


test("DateRangePicker uses Manila midnight for presets and the future-date cutoff", (t) => {
  t.mock.timers.enable({ apis: ["Date"], now: new Date("2026-11-11T19:38:00Z") })
  assert.deepEqual(formatPresetRange("today"), { start: "2026-11-12", end: "2026-11-12" })
  assert.deepEqual(formatPresetRange("yesterday"), { start: "2026-11-11", end: "2026-11-11" })
  assert.deepEqual(formatPresetRange("last7"), { start: "2026-11-06", end: "2026-11-12" })
  assert.equal(getMatchingPresetKey("2026-11-12", "2026-11-12"), "today")
  assert.equal(validateDateRange("2026-11-12", "2026-11-12").isValid, true)
  assert.equal(validateDateRange("2026-11-13", "2026-11-13").isValid, false)
})
