"use client"

import { useState, useEffect, useCallback } from "react"
import { cn } from "@/lib/utils"

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

export default function AutoBackupSchedule({ showToast, scope = "system" }) {
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
      <div className="w-full rounded-2xl border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-card shadow-sm p-4 animate-pulse">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-[10px] bg-[#F2F2F7] dark:bg-zinc-800" />
            <div className="space-y-2">
              <div className="h-4 w-36 rounded bg-[#F2F2F7] dark:bg-zinc-800" />
              <div className="h-3 w-56 rounded bg-[#F9F9FB] dark:bg-zinc-850" />
            </div>
          </div>
          <div className="w-11 h-6 rounded-full bg-[#E5E5EA] dark:bg-zinc-800" />
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
    <div className="w-full rounded-2xl border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-card shadow-[0_1px_3px_rgba(0,0,0,0.03),0_4px_12px_rgba(0,0,0,0.02)] overflow-hidden transition-colors duration-200">
      {/* Group Header Row with macOS Squircle Icon & Switch */}
      <div className="flex items-center justify-between px-5 py-3.5">
        <div className="flex items-center gap-3.5">
          {/* Apple Squircle Tile */}
          <div
            className={cn(
              "w-10 h-10 rounded-[10px] flex items-center justify-center shrink-0 transition-[background-color,box-shadow,color] duration-200",
              schedule.enabled
                ? "bg-gradient-to-b from-[#34C759] to-[#28CD41] text-white shadow-[0_2px_6px_rgba(52,199,89,0.35)]"
                : "bg-[#E5E5EA] dark:bg-zinc-800 text-[#8E8E93] dark:text-zinc-500"
            )}
          >
            <i className="ph-bold ph-arrows-clockwise text-[18px]" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-[14px] font-semibold text-[#111111] dark:text-zinc-50 tracking-[-0.01em] leading-tight">
                Automatic Backups
              </h4>
              {schedule.enabled && (
                <span className="inline-flex items-center gap-1 rounded-full bg-[#D1FAE5] dark:bg-emerald-950/40 px-2 py-0.5 text-[10px] font-semibold text-[#065F46] dark:text-emerald-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#34C759] animate-pulse" />
                  Active
                </span>
              )}
            </div>
            <p className="text-[12px] font-normal text-[#8E8E93] dark:text-zinc-400 mt-0.5 leading-normal">
              {schedule.enabled
                ? `Securing archives ${schedule.frequency === "weekly" ? `every ${selectedDayLabel}` : "daily"} at ${selectedTimeLabel}`
                : "Automatically create and secure backup archives on a schedule"}
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
            "relative inline-flex h-[26px] w-[46px] shrink-0 cursor-pointer items-center rounded-full p-[2px] transition-colors duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#007AFF]/50",
            schedule.enabled
              ? "bg-[#34C759]"
              : "bg-[#E9E9EA] dark:bg-zinc-700",
            isSaving && "opacity-50 cursor-not-allowed"
          )}
        >
          <span
            className={cn(
              "pointer-events-none inline-block h-[22px] w-[22px] rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.18),0_2px_4px_rgba(0,0,0,0.06)] transition-transform duration-200 ease-out",
              schedule.enabled ? "translate-x-[20px]" : "translate-x-0"
            )}
          />
        </button>
      </div>

      {/* macOS Settings Grouped Rows — Expands when enabled */}
      {schedule.enabled && (
        <div className="border-t border-black/[0.06] dark:border-white/[0.06] divide-y divide-black/[0.05] dark:divide-white/[0.05] animate-in fade-in slide-in-from-top-1 duration-200">
          {/* Row 1: Frequency with Apple Segmented Control */}
          <div className="h-12 px-5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-[13px] font-medium text-[#111111] dark:text-zinc-100">
                Frequency
              </span>
            </div>

            <div className="inline-flex p-0.5 bg-[#F2F2F7] dark:bg-zinc-800/90 rounded-[8px] border border-black/[0.03] dark:border-white/[0.04]">
              <button
                type="button"
                onClick={() => handleFrequencySelect("daily")}
                disabled={isSaving}
                className={cn(
                  "px-3.5 py-1 text-[12px] font-medium rounded-[6px] transition-[background-color,color,box-shadow] duration-150 cursor-pointer active:scale-[0.98]",
                  schedule.frequency === "daily"
                    ? "bg-white dark:bg-zinc-700 text-[#111111] dark:text-white shadow-[0_1px_2px_rgba(0,0,0,0.08)] font-semibold"
                    : "text-[#8E8E93] dark:text-zinc-400 hover:text-[#111111] dark:hover:text-white"
                )}
              >
                Daily
              </button>
              <button
                type="button"
                onClick={() => handleFrequencySelect("weekly")}
                disabled={isSaving}
                className={cn(
                  "px-3.5 py-1 text-[12px] font-medium rounded-[6px] transition-[background-color,color,box-shadow] duration-150 cursor-pointer active:scale-[0.98]",
                  schedule.frequency === "weekly"
                    ? "bg-white dark:bg-zinc-700 text-[#111111] dark:text-white shadow-[0_1px_2px_rgba(0,0,0,0.08)] font-semibold"
                    : "text-[#8E8E93] dark:text-zinc-400 hover:text-[#111111] dark:hover:text-white"
                )}
              >
                Weekly
              </button>
            </div>
          </div>

          {/* Row 2: Day of Week (Weekly only) */}
          {schedule.frequency === "weekly" && (
            <div className="h-12 px-5 flex items-center justify-between animate-in fade-in duration-150">
              <span className="text-[13px] font-medium text-[#111111] dark:text-zinc-100">
                Scheduled Day
              </span>

              {/* Apple-styled popup pill */}
              <div className="relative inline-flex items-center gap-1.5 bg-[#F2F2F7] dark:bg-zinc-800 hover:bg-[#E5E5EA] dark:hover:bg-zinc-750 px-3 py-1.5 rounded-[8px] text-[12px] font-medium text-[#111111] dark:text-zinc-100 border border-black/[0.04] dark:border-white/[0.06] transition-[background-color] duration-150 cursor-pointer group active:scale-[0.98]">
                <i className="ph-duotone ph-calendar text-[13px] text-[#8E8E93]" />
                <span>{selectedDayLabel}</span>
                <i className="ph-bold ph-caret-up-down text-[10px] text-[#8E8E93] ml-0.5 group-hover:text-[#111111] dark:group-hover:text-white" />
                <select
                  value={schedule.dayOfWeek}
                  onChange={handleDayChange}
                  disabled={isSaving}
                  aria-label="Select day of week"
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                >
                  {DAY_LABELS.map((day, idx) => (
                    <option key={idx} value={idx}>
                      {day}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Row 3: Scheduled Time */}
          <div className="h-12 px-5 flex items-center justify-between">
            <span className="text-[13px] font-medium text-[#111111] dark:text-zinc-100">
              Backup Time
            </span>

            {/* Apple-styled time picker pill */}
            <div className="relative inline-flex items-center gap-1.5 bg-[#F2F2F7] dark:bg-zinc-800 hover:bg-[#E5E5EA] dark:hover:bg-zinc-750 px-3 py-1.5 rounded-[8px] text-[12px] font-medium text-[#111111] dark:text-zinc-100 border border-black/[0.04] dark:border-white/[0.06] transition-[background-color] duration-150 cursor-pointer group active:scale-[0.98]">
              <i className="ph-duotone ph-clock text-[13px] text-[#8E8E93]" />
              <span>{selectedTimeLabel}</span>
              <i className="ph-bold ph-caret-up-down text-[10px] text-[#8E8E93] ml-0.5 group-hover:text-[#111111] dark:group-hover:text-white" />
              <select
                value={schedule.time}
                onChange={handleTimeChange}
                disabled={isSaving}
                aria-label="Select backup time"
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              >
                {HOUR_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Apple Time Machine Status Strip */}
          <div className="bg-[#FBFBFD] dark:bg-zinc-900/40 px-5 py-2.5 flex items-center justify-between text-[11px]">
            {/* Left: Last Backup State */}
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "w-2 h-2 rounded-full shrink-0",
                  schedule.lastRunStatus === "success"
                    ? "bg-[#34C759]"
                    : schedule.lastRunStatus === "failed"
                    ? "bg-[#FF3B30]"
                    : "bg-[#8E8E93]"
                )}
              />
              <span className="text-[#8E8E93]">Last Backup:</span>
              <span className="font-medium text-[#111111] dark:text-zinc-200">
                {lastRunFormatted || "Never"}
              </span>

              {schedule.lastRunStatus === "success" && (
                <span className="inline-flex items-center gap-1 rounded-[4px] px-1.5 py-0.5 text-[10px] font-medium bg-[#D1FAE5] text-[#065F46] dark:bg-emerald-950/40 dark:text-emerald-400">
                  <i className="ph-bold ph-check text-[8px]" />
                  Successful
                </span>
              )}
              {schedule.lastRunStatus === "failed" && (
                <span className="inline-flex items-center gap-1 rounded-[4px] px-1.5 py-0.5 text-[10px] font-medium bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400">
                  <i className="ph-bold ph-x text-[8px]" />
                  Failed
                </span>
              )}
            </div>

            {/* Right: Next Scheduled Run */}
            {nextRunFormatted ? (
              <div className="flex items-center gap-1.5 text-[#8E8E93]">
                <i className="ph-duotone ph-calendar-blank text-[12px]" />
                <span>Next:</span>
                <span className="font-medium text-[#111111] dark:text-zinc-200">
                  {nextRunFormatted}
                </span>
              </div>
            ) : (
              <span className="text-[#8E8E93]">Awaiting initial cycle</span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
