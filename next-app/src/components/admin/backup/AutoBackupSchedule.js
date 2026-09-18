"use client"

import HugeIcon from "@/components/shared/HugeIcon";
import { useState, useEffect, useCallback } from "react"
import { cn } from "@/lib/utils"
import { Select } from "@/components/ui/select"

const DAY_LABELS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
]

// Generate 12-hour format options
const HOUR_OPTIONS = (() => {
  const options = []
  for (let h = 0; h < 24; h++) {
    const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h
    const ampm = h < 12 ? "AM" : "PM"
    const value = `${String(h).padStart(2, "0")}:00`
    const label = `${hour12}:00 ${ampm}`
    options.push({ value, label })
  }
  return options
})()

function formatLastRunTime(isoStr) {
  if (!isoStr) return null
  try {
    const d = new Date(isoStr)
    if (isNaN(d.getTime())) return null
    return d.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    })
  } catch {
    return null
  }
}

function calculateNextRun(schedule) {
  if (!schedule?.enabled) return null

  const { frequency, time, dayOfWeek } = schedule
  const [schedHour] = (time || "02:00").split(":").map(Number)

  const now = new Date()
  const next = new Date(now)
  next.setHours(schedHour, 0, 0, 0)

  if (frequency === "weekly") {
    const targetDay = dayOfWeek ?? 0
    const currentDay = now.getDay()
    let daysUntil = targetDay - currentDay
    if (daysUntil < 0) daysUntil += 7
    if (daysUntil === 0 && now.getHours() >= schedHour) daysUntil = 7
    next.setDate(next.getDate() + daysUntil)
  } else {
    // Daily
    if (now.getHours() >= schedHour) {
      next.setDate(next.getDate() + 1)
    }
  }

  return next.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  })
}

export default function AutoBackupSchedule({ showToast, scope = "system", embedded = false, className = "" }) {
  const [schedule, setSchedule] = useState({
    enabled: false,
    frequency: "daily",
    time: "02:00",
    dayOfWeek: 0,
    lastRunAt: null,
    lastRunStatus: null,
    lastRunFilename: null,
  })
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  // Fetch current schedule
  const fetchSchedule = useCallback(async () => {
    try {
      const query = scope ? `?scope=${encodeURIComponent(scope)}` : ""
      const res = await fetch(`/api/system/backup/schedule${query}`, {
        cache: "no-store",
      })
      const json = await res.json().catch(() => null)
      if (json?.ok && json.data) {
        setSchedule(json.data)
      }
    } catch (err) {
      console.error("[AutoBackupSchedule] Fetch error:", err)
    } finally {
      setIsLoading(false)
    }
  }, [scope])

  useEffect(() => {
    fetchSchedule()
  }, [fetchSchedule])

  // Save schedule to API
  const saveSchedule = useCallback(
    async (updates) => {
      setIsSaving(true)
      try {
        const res = await fetch("/api/system/backup/schedule", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...updates, scope }),
        })
        const json = await res.json().catch(() => null)
        if (!res.ok || !json?.ok) {
          throw new Error(json?.error || "Failed to update schedule")
        }
        setSchedule(json.data)
        showToast?.({
          title: updates.enabled === false
            ? "Auto Backup Disabled"
            : "Schedule Updated",
          description: updates.enabled === false
            ? "Automatic scheduled backups have been turned off."
            : "Your backup schedule settings have been saved.",
        })
      } catch (err) {
        showToast?.(
          {
            title: "Schedule Error",
            description: err.message,
          },
          "error"
        )
      } finally {
        setIsSaving(false)
      }
    },
    [showToast, scope]
  )

  const handleToggle = () => {
    const newEnabled = !schedule.enabled
    const updated = { ...schedule, enabled: newEnabled }
    setSchedule(updated)
    saveSchedule({ ...updated })
  }

  const handleFrequencySelect = (newFreq) => {
    if (schedule.frequency === newFreq) return
    const updated = { ...schedule, frequency: newFreq }
    setSchedule(updated)
    saveSchedule({ ...updated })
  }

  const handleTimeChange = (e) => {
    const newTime = e.target.value
    const updated = { ...schedule, time: newTime }
    setSchedule(updated)
    saveSchedule({ ...updated })
  }

  const handleDayChange = (e) => {
    const newDay = Number(e.target.value)
    const updated = { ...schedule, dayOfWeek: newDay }
    setSchedule(updated)
    saveSchedule({ ...updated })
  }

  // Loading skeleton matching Apple card proportions
  if (isLoading) {
    return (
      <div
        className={cn(
          "w-full p-5 animate-pulse",
          embedded
            ? "border-t border-gray-100 dark:border-white/10 bg-gray-50/40 dark:bg-zinc-900/30"
            : "rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-card shadow-xs",
          className
        )}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-gray-200 dark:bg-zinc-800" />
            <div className="space-y-2">
              <div className="h-4 w-36 rounded-md bg-gray-200 dark:bg-zinc-800" />
              <div className="h-3 w-56 rounded-md bg-gray-100 dark:bg-zinc-850" />
            </div>
          </div>
          <div className="w-11 h-6 rounded-full bg-gray-200 dark:bg-zinc-800" />
        </div>
      </div>
    )
  }

  const selectedTimeObj = HOUR_OPTIONS.find((o) => o.value === schedule.time)
  const selectedTimeLabel = selectedTimeObj ? selectedTimeObj.label : schedule.time
  const selectedDayLabel = DAY_LABELS[schedule.dayOfWeek] || "Sunday"
  const lastRunFormatted = formatLastRunTime(schedule.lastRunAt)
  const nextRunFormatted = schedule.enabled ? calculateNextRun(schedule) : null

  return (
    <div
      className={cn(
        "w-full overflow-hidden transition-colors duration-200",
        embedded
          ? "border-t border-gray-100 dark:border-white/10 bg-gray-50/40 dark:bg-zinc-900/30"
          : "rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-card shadow-xs",
        className
      )}
    >
      {/* Group Header Row with Apple Squircle Icon & Switch */}
      <div className="flex items-center justify-between px-5 py-4">
        <div className="flex items-center gap-3.5">
          {/* Apple Squircle Tile */}
          <div
            className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all duration-200 shadow-xs",
              schedule.enabled
                ? "bg-gradient-to-b from-[#34C759] to-[#28CD41] text-white"
                : "bg-gray-100 dark:bg-zinc-800 text-gray-400 dark:text-zinc-500 border border-gray-200/60 dark:border-white/5"
            )}
          >
            <HugeIcon  className="ph-bold ph-arrows-clockwise text-[18px]" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-semibold text-gray-900 dark:text-zinc-50 tracking-[-0.01em] leading-tight">
                Automatic Backups
              </h4>
              {schedule.enabled && (
                <span className="inline-flex items-center rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/60 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/40 px-2.5 py-0.5 text-[11px] font-semibold">
                  Active
                </span>
              )}
            </div>
            <p className="text-xs font-normal text-gray-500 dark:text-zinc-400 mt-0.5 leading-normal">
              {schedule.enabled
                ? `Securing archives ${schedule.frequency === "weekly" ? `every ${selectedDayLabel}` : "daily"} at ${selectedTimeLabel}`
                : "Automatically create and secure backup archives on a recurring schedule"}
            </p>
          </div>
        </div>

        {/* Apple Switch Toggle */}
        <button
          type="button"
          role="switch"
          aria-checked={schedule.enabled}
          onClick={handleToggle}
          disabled={isSaving}
          aria-label="Toggle automatic backups"
          className={cn(
            "relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full p-0.5 transition-colors duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 active:scale-95",
            schedule.enabled
              ? "bg-[#34C759]"
              : "bg-gray-200 dark:bg-zinc-700",
            isSaving && "opacity-50 cursor-not-allowed"
          )}
        >
          <span
            className={cn(
              "pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-xs transition-transform duration-200 ease-out",
              schedule.enabled ? "translate-x-5" : "translate-x-0"
            )}
          />
        </button>
      </div>

      {/* macOS Settings Grouped Rows — Expands when enabled */}
      {schedule.enabled && (
        <div className="border-t border-gray-100 dark:border-white/10 divide-y divide-gray-100 dark:divide-white/10 bg-white/70 dark:bg-card/70 animate-in fade-in slide-in-from-top-1 duration-200">
          {/* Row 1: Frequency with Apple Segmented Control / Tabs */}
          <div className="min-h-[52px] px-5 py-2.5 flex items-center justify-between gap-4 flex-wrap sm:flex-nowrap">
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-gray-900 dark:text-zinc-100">
                Frequency
              </span>
              <span className="text-[11px] text-gray-500 dark:text-zinc-400">
                Choose how frequently backups run automatically
              </span>
            </div>

            {/* Apple Segmented Tabs */}
            <div className="flex items-center gap-1 bg-gray-100/80 dark:bg-zinc-800/60 p-1 rounded-xl border border-gray-200/60 dark:border-white/5">
              <button
                type="button"
                onClick={() => handleFrequencySelect("daily")}
                disabled={isSaving}
                className={cn(
                  "px-4 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer select-none",
                  schedule.frequency === "daily"
                    ? "bg-white dark:bg-zinc-700 text-gray-900 dark:text-white shadow-xs"
                    : "text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white"
                )}
              >
                Daily
              </button>
              <button
                type="button"
                onClick={() => handleFrequencySelect("weekly")}
                disabled={isSaving}
                className={cn(
                  "px-4 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer select-none",
                  schedule.frequency === "weekly"
                    ? "bg-white dark:bg-zinc-700 text-gray-900 dark:text-white shadow-xs"
                    : "text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white"
                )}
              >
                Weekly
              </button>
            </div>
          </div>

          {/* Row 2: Day of Week (Weekly only) */}
          {schedule.frequency === "weekly" && (
            <div className="min-h-[52px] px-5 py-2.5 flex items-center justify-between gap-4 flex-wrap sm:flex-nowrap animate-in fade-in duration-150">
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-gray-900 dark:text-zinc-100">
                  Scheduled Day
                </span>
                <span className="text-[11px] text-gray-500 dark:text-zinc-400">
                  Day of the week to trigger weekly archives
                </span>
              </div>

              {/* Standardized Select Dropdown */}
              <div className="w-48 shrink-0">
                <Select
                  value={schedule.dayOfWeek}
                  onChange={handleDayChange}
                  disabled={isSaving}
                  className="h-9 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 text-xs font-normal text-gray-700 dark:text-zinc-200 cursor-pointer shadow-none hover:bg-gray-50 dark:hover:bg-zinc-700"
                  menuClassName="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-900 shadow-2xl p-1.5"
                  optionClassName="rounded-lg text-xs font-normal py-1.5 px-2.5 hover:bg-gray-100 dark:hover:bg-zinc-800"
                >
                  {DAY_LABELS.map((day, idx) => (
                    <option key={idx} value={idx}>
                      {day}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
          )}

          {/* Row 3: Scheduled Time */}
          <div className="min-h-[52px] px-5 py-2.5 flex items-center justify-between gap-4 flex-wrap sm:flex-nowrap">
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-gray-900 dark:text-zinc-100">
                Backup Time
              </span>
              <span className="text-[11px] text-gray-500 dark:text-zinc-400">
                Optimal non-peak hour to run archival processes
              </span>
            </div>

            {/* Standardized Select Dropdown */}
            <div className="w-48 shrink-0">
              <Select
                value={schedule.time}
                onChange={handleTimeChange}
                disabled={isSaving}
                className="h-9 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 text-xs font-normal text-gray-700 dark:text-zinc-200 cursor-pointer shadow-none hover:bg-gray-50 dark:hover:bg-zinc-700"
                menuClassName="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-900 shadow-2xl p-1.5"
                optionClassName="rounded-lg text-xs font-normal py-1.5 px-2.5 hover:bg-gray-100 dark:hover:bg-zinc-800"
              >
                {HOUR_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          {/* Apple Time Machine Status Strip */}
          <div className="bg-gray-50/80 dark:bg-zinc-900/60 border-t border-gray-100 dark:border-white/10 px-5 py-3 flex items-center justify-between flex-wrap gap-3 text-xs">
            {/* Left: Last Backup State */}
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "w-2 h-2 rounded-full shrink-0",
                  schedule.lastRunStatus === "success"
                    ? "bg-emerald-500"
                    : schedule.lastRunStatus === "failed"
                    ? "bg-rose-500"
                    : "bg-gray-400 dark:text-zinc-500"
                )}
              />
              <span className="text-gray-500 dark:text-zinc-400">Last Run:</span>
              <span className="font-semibold text-gray-900 dark:text-zinc-200 font-mono text-[11px]">
                {lastRunFormatted || "Never"}
              </span>

              {schedule.lastRunStatus === "success" && (
                <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/40">
                  <HugeIcon  className="ph-bold ph-check text-[9px]" />
                  Successful
                </span>
              )}
              {schedule.lastRunStatus === "failed" && (
                <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200/60 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/40">
                  <HugeIcon  className="ph-bold ph-x text-[9px]" />
                  Failed
                </span>
              )}
            </div>

            {/* Right: Next Scheduled Run */}
            {nextRunFormatted ? (
              <div className="flex items-center gap-1.5 text-gray-500 dark:text-zinc-400">
                <HugeIcon  className="ph-bold ph-calendar-blank text-[13px] text-gray-400 dark:text-zinc-500" />
                <span>Next Run:</span>
                <span className="font-semibold text-gray-900 dark:text-zinc-200 font-mono text-[11px]">
                  {nextRunFormatted}
                </span>
              </div>
            ) : (
              <span className="text-gray-400 dark:text-zinc-500 text-[11px]">Awaiting initial cycle</span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
