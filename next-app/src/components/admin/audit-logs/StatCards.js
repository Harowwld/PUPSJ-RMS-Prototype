"use client"

import React from "react"
import { cn } from "@/lib/utils"
import KpiStatCardsSkeleton from "@/components/systemadmin/skeletons/KpiStatCardsSkeleton"
import {
  Activity01Icon,
  AlertCircleIcon,
  Calendar01Icon,
  Database01Icon,
  FingerPrintIcon,
  Tick01Icon,
} from "hugeicons-react"

export default function StatCards({ isLoading, logStats, sublabelOverrides }) {
  if (isLoading || !logStats) {
    return <KpiStatCardsSkeleton count={3} />
  }

  const activeActors = Number(logStats?.activeActorsCount ?? logStats?.activeactorscount ?? 0)
  const systemChanges = Number(logStats?.systemChanges ?? logStats?.systemchanges ?? 0)
  const criticalEvents = Number(logStats?.criticalEvents ?? logStats?.criticalevents ?? 0)
  const totalLogs = Number(logStats?.totalLogs ?? logStats?.totallogs ?? 0)
  const logsToday = Number(logStats?.logsToday ?? logStats?.logstoday ?? 0)
  const authEvents = Number(logStats?.authEvents ?? logStats?.authevents ?? 0)

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3 w-full">
      {/* Card 1: Total Events */}
      <div className="rounded-[18px] p-4 sm:p-4.5 bg-white dark:bg-zinc-800 border border-black/[0.06] dark:border-white/[0.08] shadow-[0_2px_8px_rgba(0,0,0,0.03),0_1px_2px_rgba(0,0,0,0.02)] flex flex-col justify-between select-none">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="size-5 rounded-full bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <Database01Icon size="0.75em" />
            </div>
            <span className="text-xs font-semibold text-gray-500 dark:text-zinc-400 tracking-tight">
              Total Events
            </span>
          </div>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-black/[0.04] dark:bg-white/[0.06] text-xs font-jakarta select-none">
            <Activity01Icon size={12} className="text-blue-600 dark:text-blue-400 shrink-0" />
            <span className="font-semibold text-gray-900 dark:text-zinc-100">All Records</span>
          </span>
        </div>
        <div className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900 dark:text-zinc-50 font-jakarta mt-2">
          {totalLogs.toLocaleString()}
        </div>
        <div className="text-[11.5px] text-gray-400 dark:text-zinc-500 mt-2 font-medium truncate">
          {sublabelOverrides?.total ?? `${activeActors.toLocaleString()} active ${activeActors === 1 ? "actor" : "actors"}`}
        </div>
      </div>

      {/* Card 2: Activity Today */}
      <div className="rounded-[18px] p-4 sm:p-4.5 bg-white dark:bg-zinc-800 border border-black/[0.06] dark:border-white/[0.08] shadow-[0_2px_8px_rgba(0,0,0,0.03),0_1px_2px_rgba(0,0,0,0.02)] flex flex-col justify-between select-none">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="size-5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <Calendar01Icon size="0.75em" />
            </div>
            <span className="text-xs font-semibold text-gray-500 dark:text-zinc-400 tracking-tight">
              Activity Today
            </span>
          </div>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-black/[0.04] dark:bg-white/[0.06] text-xs font-jakarta select-none">
            <Tick01Icon size={12} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span className="font-semibold text-gray-900 dark:text-zinc-100">Past 24 Hours</span>
          </span>
        </div>
        <div className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900 dark:text-zinc-50 font-jakarta mt-2">
          {logsToday.toLocaleString()}
        </div>
        <div className="text-[11.5px] text-gray-400 dark:text-zinc-500 mt-2 font-medium truncate">
          {sublabelOverrides?.today ?? `${systemChanges.toLocaleString()} system updates`}
        </div>
      </div>

      {/* Card 3: Auth Attempts */}
      <div className="rounded-[18px] p-4 sm:p-4.5 bg-white dark:bg-zinc-800 border border-black/[0.06] dark:border-white/[0.08] shadow-[0_2px_8px_rgba(0,0,0,0.03),0_1px_2px_rgba(0,0,0,0.02)] flex flex-col justify-between select-none">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="size-5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <FingerPrintIcon size="0.75em" />
            </div>
            <span className="text-xs font-semibold text-gray-500 dark:text-zinc-400 tracking-tight">
              Auth Attempts
            </span>
          </div>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-black/[0.04] dark:bg-white/[0.06] text-xs font-jakarta select-none">
            {criticalEvents > 0 ? (
              <>
                <AlertCircleIcon size={12} className="text-rose-600 dark:text-rose-400 shrink-0" />
                <span className="font-semibold text-rose-600 dark:text-rose-400">{criticalEvents} Flagged</span>
              </>
            ) : (
              <>
                <Tick01Icon size={12} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span className="font-semibold text-gray-900 dark:text-zinc-100">Normal Security</span>
              </>
            )}
          </span>
        </div>
        <div className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900 dark:text-zinc-50 font-jakarta mt-2">
          {authEvents.toLocaleString()}
        </div>
        <div className="text-[11.5px] text-gray-400 dark:text-zinc-500 mt-2 font-medium truncate">
          {sublabelOverrides?.auth ?? `${criticalEvents.toLocaleString()} critical ${criticalEvents === 1 ? "flag" : "flags"}`}
        </div>
      </div>
    </div>
  )
}
