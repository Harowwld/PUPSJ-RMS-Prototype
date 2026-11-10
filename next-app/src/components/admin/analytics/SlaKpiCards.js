"use client"

import React from "react"
import { cn } from "@/lib/utils"
import { 
  AlertCircleIcon, 
  Clock01Icon, 
  Files01Icon, 
  PieChartIcon, 
  StarIcon, 
  Tick01Icon 
} from "hugeicons-react"

export default function SlaKpiCards({
  total = 0,
  completionRate = 0,
  completed = 0,
  sla = {},
  feedback = {},
  statusCounts = {},
}) {
  const charterComplianceRate = sla?.complianceRate
  const hasCompletedRequests = Number(sla?.totalCompleted) > 0
  const activeOverdue = sla?.activeOverdue || 0

  const frameworkLabel = sla?.standards?.frameworkType === "ARTA"
    ? "Processing Time Standard"
    : ((sla?.standards?.frameworkName || "Processing Time Standard").replace(/\bSLA\b/gi, "Processing Time Standard"))

  const safeCompleted = Number.isFinite(completed) ? completed : 0
  const safeTotal = Number.isFinite(total) ? total : 0
  const activeQueueCount = (statusCounts?.Pending || 0) + (statusCounts?.InProgress || 0)
  const hasResponses = Number(feedback?.totalResponses) > 0

  const satisfactionTier = hasResponses
    ? (feedback.satisfactionRate >= 90
        ? "Outstanding"
        : feedback.satisfactionRate >= 80
          ? "Very Satisfactory"
          : "Satisfactory")
    : null

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3 w-full">
      {/* Card 1: Citizen's Charter Processing Time Standard */}
      <div className="rounded-[18px] p-4 sm:p-4.5 bg-white dark:bg-zinc-800 border border-black/[0.06] dark:border-white/[0.08] shadow-[0_2px_8px_rgba(0,0,0,0.03),0_1px_2px_rgba(0,0,0,0.02)] flex flex-col justify-between select-none">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={cn(
              "size-5 rounded-full flex items-center justify-center shrink-0",
              activeOverdue > 0 
                ? "bg-rose-500/15 text-rose-600 dark:text-rose-400" 
                : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
            )}>
              {activeOverdue > 0 ? (
                <AlertCircleIcon size="0.75em" />
              ) : (
                <Clock01Icon size="0.75em" />
              )}
            </div>
            <span className="text-xs font-semibold text-gray-500 dark:text-zinc-400 tracking-tight">
              {frameworkLabel}
            </span>
          </div>
          {activeOverdue > 0 ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-black/[0.04] dark:bg-white/[0.06] text-xs font-jakarta select-none">
              <AlertCircleIcon size={12} className="text-rose-600 dark:text-rose-400 shrink-0" />
              <span className="font-semibold text-gray-900 dark:text-zinc-100">{activeOverdue} Past Due</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-black/[0.04] dark:bg-white/[0.06] text-xs font-jakarta select-none">
              <Tick01Icon size={12} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span className="font-semibold text-gray-900 dark:text-zinc-100">
                {hasCompletedRequests && charterComplianceRate != null
                  ? `${charterComplianceRate}% On Time`
                  : "No completed requests"}
              </span>
            </span>
          )}
        </div>
        <div className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900 dark:text-zinc-50 font-jakarta mt-2">
          {hasCompletedRequests && charterComplianceRate != null
            ? `${charterComplianceRate}%`
            : "N/A"}
        </div>
        <div className="text-[11.5px] text-gray-400 dark:text-zinc-500 mt-2 font-medium truncate">
          {safeCompleted.toLocaleString()} completed · {(sla?.compliantCompleted ?? safeCompleted).toLocaleString()} within standard
        </div>
      </div>

      {/* Card 2: Client Satisfaction (CSM Rating) */}
      <div className="rounded-[18px] p-4 sm:p-4.5 bg-white dark:bg-zinc-800 border border-black/[0.06] dark:border-white/[0.08] shadow-[0_2px_8px_rgba(0,0,0,0.03),0_1px_2px_rgba(0,0,0,0.02)] flex flex-col justify-between select-none">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="size-5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <StarIcon size="0.75em" />
            </div>
            <span className="text-xs font-semibold text-gray-500 dark:text-zinc-400 tracking-tight">
              Client Satisfaction
            </span>
          </div>
          {hasResponses ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-black/[0.04] dark:bg-white/[0.06] text-xs font-jakarta select-none">
              <StarIcon size={12} className="text-amber-600 dark:text-amber-400 shrink-0" />
              <span className="font-semibold text-gray-900 dark:text-zinc-100">
                {satisfactionTier}
              </span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-black/[0.04] dark:bg-white/[0.06] text-xs font-jakarta select-none">
              <span className="font-semibold text-gray-500 dark:text-zinc-400">No ratings yet</span>
            </span>
          )}
        </div>
        <div className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900 dark:text-zinc-50 font-jakarta mt-2 flex items-baseline gap-1">
          {hasResponses ? (
            <>
              <span className="text-amber-500 text-[20px] leading-none">★</span>
              <span>{isNaN(feedback.averageRating) ? "0.0" : feedback.averageRating}</span>
              <span className="text-xs font-normal text-gray-400 dark:text-zinc-500">/ 5.0</span>
            </>
          ) : (
            <span className="text-gray-400 dark:text-zinc-500">N/A</span>
          )}
        </div>
        <div className="text-[11.5px] text-gray-400 dark:text-zinc-500 mt-2 font-medium truncate">
          {hasResponses 
            ? `${feedback.totalResponses.toLocaleString()} evaluations (${feedback.satisfactionRate ?? 0}% positive)`
            : "Awaiting student evaluations upon release"}
        </div>
      </div>

      {/* Card 3: Total Document Requests */}
      <div className="rounded-[18px] p-4 sm:p-4.5 bg-white dark:bg-zinc-800 border border-black/[0.06] dark:border-white/[0.08] shadow-[0_2px_8px_rgba(0,0,0,0.03),0_1px_2px_rgba(0,0,0,0.02)] flex flex-col justify-between select-none">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="size-5 rounded-full bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <Files01Icon size="0.75em" />
            </div>
            <span className="text-xs font-semibold text-gray-500 dark:text-zinc-400 tracking-tight">
              Total Volume
            </span>
          </div>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-black/[0.04] dark:bg-white/[0.06] text-xs font-jakarta select-none">
            <span className="font-semibold text-gray-900 dark:text-zinc-100">{completionRate}% Completed</span>
          </span>
        </div>
        <div className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900 dark:text-zinc-50 font-jakarta mt-2">
          {safeTotal.toLocaleString()}
        </div>
        <div className="text-[11.5px] text-gray-400 dark:text-zinc-500 mt-2 font-medium truncate">
          {safeCompleted.toLocaleString()} completed · {activeQueueCount.toLocaleString()} in queue
        </div>
      </div>
    </div>
  )
}
