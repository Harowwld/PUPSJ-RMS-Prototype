"use client"

import React, { useState, useRef, useEffect } from "react"
import { Reorder } from "framer-motion"
import HugeIcon from "@/components/shared/HugeIcon"
import { cn } from "@/lib/utils"

export default function SlaKpiCards({
  total = 0,
  completionRate = 0,
  completed = 0,
  sla = {},
  feedback = {},
  statusCounts = {},
  topDocTypes = [],
  viewMode = "all"
}) {
  const [selectedKpi, setSelectedKpi] = useState(null)
  const [kpiOrder, setKpiOrder] = useState(["rate", "satisfaction", "total"])
  const containerRef = useRef(null)

  // Close dropdown details when clicking outside
  useEffect(() => {
    if (!selectedKpi) return
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setSelectedKpi(null)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    document.addEventListener("touchstart", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
      document.removeEventListener("touchstart", handleClickOutside)
    }
  }, [selectedKpi])

  const charterComplianceRate = isNaN(completionRate) ? 0 : (completionRate || 0)
  const activeOverdue = sla?.activeOverdue || 0

  const frameworkLabel = sla?.standards?.frameworkType === "ARTA"
    ? "Citizen's Charter SLA"
    : (sla?.standards?.frameworkName || "Service Standards SLA")

  const safeCompleted = Number.isFinite(completed) ? completed : 0
  const safeTotal = Number.isFinite(total) ? total : 0
  const activeQueueCount = (statusCounts?.Pending || 0) + (statusCounts?.InProgress || 0)

  return (
    <Reorder.Group
      as="div"
      axis="x"
      values={kpiOrder}
      onReorder={setKpiOrder}
      ref={containerRef}
      className="grid grid-cols-1 gap-4 md:grid-cols-3 items-stretch relative z-20 w-full"
    >
      {kpiOrder.map((key) => {
        if (key === "rate") {
          const isSelected = selectedKpi === "rate"
          return (
            <Reorder.Item
              as="div"
              value="rate"
              key="rate"
              className={cn(
                "relative group rounded-xl w-full h-full cursor-grab active:cursor-grabbing",
                isSelected ? "z-30" : "z-10"
              )}
            >
              <div
                onClick={() => setSelectedKpi(isSelected ? null : "rate")}
                className={cn(
                  "relative overflow-hidden rounded-[18px] border cursor-pointer select-none transition-all shadow-none flex flex-col justify-between h-full min-h-[110px] bg-gray-50 dark:bg-zinc-900 hover:bg-gray-100/60 dark:hover:bg-zinc-800/50",
                  isSelected
                    ? "border-red-500/50 ring-1 ring-red-500/20"
                    : "border-border dark:border-border hover:border-border dark:hover:border-white/10"
                )}
              >
                <div className="flex justify-between items-start p-4 pb-0">
                  <div className="flex flex-col gap-1">
                    <span className="text-[13px] font-medium text-gray-900 dark:text-zinc-300 capitalize">
                      {frameworkLabel}
                    </span>
                    {activeOverdue > 0 ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400 w-fit">
                        {activeOverdue} Overdue
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 w-fit">
                        {charterComplianceRate}% Compliant
                      </span>
                    )}
                  </div>
                  <div className="w-8 h-8 rounded-[10px] flex items-center justify-center text-white shadow-sm shrink-0 bg-[#ef4444]">
                    <HugeIcon className="ph-bold text-[15px] ph-pie-chart" />
                  </div>
                </div>
                <div className="flex justify-between items-end p-4 pt-1">
                  <span className="text-[28px] font-bold text-gray-900 dark:text-white leading-none tracking-tight">
                    {charterComplianceRate}%
                  </span>
                  <HugeIcon
                    className="ph-bold ph-dots-six-vertical cursor-grab active:cursor-grabbing hover:text-black dark:hover:text-white text-gray-900 dark:text-zinc-300 text-xl mb-0.5"
                    title="Drag to rearrange"
                  />
                </div>
              </div>

              {/* Absolute details container */}
              <div
                className={cn(
                  "absolute top-full left-0 right-0 z-[100] mt-2 rounded-xl border border-border bg-white p-4 shadow-xl dark:border-border dark:bg-zinc-900 transition-all duration-300 ease-in-out origin-top",
                  isSelected
                    ? "scale-y-100 opacity-100 translate-y-0"
                    : "scale-y-95 opacity-0 -translate-y-2 pointer-events-none"
                )}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-emerald-50 dark:bg-emerald-950/30 p-2.5 rounded-lg border border-emerald-100 dark:border-emerald-900/30">
                      <span className="block text-[9px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                        Compliant
                      </span>
                      <span className="text-lg font-black text-emerald-700 dark:text-emerald-400 font-sans">
                        {(sla?.compliantCompleted ?? safeCompleted).toLocaleString()}
                      </span>
                    </div>
                    <div className="bg-red-50 dark:bg-red-950/30 p-2.5 rounded-lg border border-red-100 dark:border-red-900/30">
                      <span className="block text-[9px] font-bold text-red-600 dark:text-red-400 uppercase tracking-wider">
                        Delayed / Overdue
                      </span>
                      <span className="text-lg font-black text-red-700 dark:text-red-400 font-sans">
                        {((sla?.delayedCompleted || 0) + (sla?.activeOverdue || 0)).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {sla?.tierStats && Object.keys(sla.tierStats).length > 0 && (
                    <div>
                      <h4 className="text-[10px] font-bold text-gray-400 dark:text-zinc-500 mb-1.5 uppercase tracking-wide">
                        Service Standard Tiers
                      </h4>
                      <div className="max-h-32 overflow-y-auto space-y-1 pr-1">
                        {Object.entries(sla.tierStats).map(([tierKey, stat]) => {
                          const tierRate = stat.total > 0 ? Math.round((stat.compliant / stat.total) * 100) : 100
                          return (
                            <div
                              key={tierKey}
                              className="flex justify-between items-center text-[11px] py-1 border-b border-border dark:border-border text-gray-700 dark:text-zinc-300"
                            >
                              <span className="truncate max-w-[170px]" title={stat.label || tierKey}>
                                {stat.label || tierKey}
                              </span>
                              <div className="flex items-center gap-2">
                                <span className="text-gray-400 dark:text-zinc-500 text-[10px]">
                                  {stat.compliant}/{stat.total}
                                </span>
                                <span className="font-bold text-gray-900 dark:text-zinc-50 min-w-[32px] text-right">
                                  {stat.total > 0 ? `${tierRate}%` : "N/A"}
                                </span>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {((sla?.activeDueSoon || 0) > 0 || (sla?.activeOverdue || 0) > 0) && (
                    <div className="bg-gray-50 dark:bg-zinc-800/60 p-2 rounded-lg border border-border dark:border-border flex justify-between items-center text-[11px]">
                      <span className="text-gray-600 dark:text-zinc-400 font-medium">In-flight SLA Watches</span>
                      <div className="flex items-center gap-2 font-semibold">
                        {(sla?.activeDueSoon || 0) > 0 && (
                          <span className="text-amber-600 dark:text-amber-400">
                            {sla.activeDueSoon} due soon
                          </span>
                        )}
                        {(sla?.activeOverdue || 0) > 0 && (
                          <span className="text-red-600 dark:text-red-400">
                            {sla.activeOverdue} overdue
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  <p className="text-xs text-gray-600 dark:text-zinc-300 leading-relaxed">
                    Turnaround compliance measured against statutory Citizen&apos;s Charter standard fulfillment windows.
                  </p>
                </div>
              </div>
            </Reorder.Item>
          )
        }

        if (key === "satisfaction") {
          const isSelected = selectedKpi === "satisfaction"
          const hasResponses = feedback?.totalResponses > 0
          return (
            <Reorder.Item
              as="div"
              value="satisfaction"
              key="satisfaction"
              className={cn(
                "relative group rounded-xl w-full h-full cursor-grab active:cursor-grabbing",
                isSelected ? "z-30" : "z-10"
              )}
            >
              <div
                onClick={() => setSelectedKpi(isSelected ? null : "satisfaction")}
                className={cn(
                  "relative overflow-hidden rounded-[18px] border cursor-pointer select-none transition-all shadow-none flex flex-col justify-between h-full min-h-[110px] bg-gray-50 dark:bg-zinc-900 hover:bg-gray-100/60 dark:hover:bg-zinc-800/50",
                  isSelected
                    ? "border-amber-500/50 ring-1 ring-amber-500/20"
                    : "border-border dark:border-border hover:border-border dark:hover:border-white/10"
                )}
              >
                <div className="flex justify-between items-start p-4 pb-0">
                  <div className="flex flex-col gap-1">
                    <span className="text-[13px] font-medium text-gray-900 dark:text-zinc-300 capitalize">
                      Client Satisfaction
                    </span>
                    {hasResponses ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 w-fit">
                        {isNaN(feedback.satisfactionRate) ? 0 : feedback.satisfactionRate}% Positive ({feedback.totalResponses})
                      </span>
                    ) : (
                      <span className="text-[11px] text-gray-400 dark:text-zinc-500">No ratings yet</span>
                    )}
                  </div>
                  <div className="w-8 h-8 rounded-[10px] flex items-center justify-center text-white shadow-sm shrink-0 bg-[#f59e0b]">
                    <HugeIcon className="ph-fill text-[15px] ph-star" />
                  </div>
                </div>
                <div className="flex justify-between items-end p-4 pt-1">
                  <span className="text-[28px] font-bold text-gray-900 dark:text-white leading-none tracking-tight">
                    {hasResponses ? (
                      <>
                        <span className="text-amber-500 text-[24px] mr-1">★</span>
                        {isNaN(feedback.averageRating) ? "0.0" : feedback.averageRating}
                        <span className="text-xs font-normal text-gray-400 dark:text-zinc-500 ml-1.5">/ 5.0</span>
                      </>
                    ) : (
                      <span className="text-[24px] text-gray-400">N/A</span>
                    )}
                  </span>
                  <HugeIcon
                    className="ph-bold ph-dots-six-vertical cursor-grab active:cursor-grabbing hover:text-black dark:hover:text-white text-gray-900 dark:text-zinc-300 text-xl mb-0.5"
                    title="Drag to rearrange"
                  />
                </div>
              </div>

              {/* Absolute details container */}
              <div
                className={cn(
                  "absolute top-full left-0 right-0 z-[100] mt-2 rounded-xl border border-border bg-white p-4 shadow-xl dark:border-border dark:bg-zinc-900 transition-all duration-300 ease-in-out origin-top",
                  isSelected
                    ? "scale-y-100 opacity-100 translate-y-0"
                    : "scale-y-95 opacity-0 -translate-y-2 pointer-events-none"
                )}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="space-y-3">
                  {hasResponses ? (
                    <>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="bg-gray-50 dark:bg-zinc-800/60 p-2.5 rounded-lg border border-border dark:border-border">
                          <span className="block text-[9px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-wider">
                            Total Ratings
                          </span>
                          <span className="text-lg font-black text-gray-900 dark:text-zinc-50 font-sans">
                            {feedback.totalResponses.toLocaleString()}
                          </span>
                        </div>
                        <div className="bg-amber-50 dark:bg-amber-950/30 p-2.5 rounded-lg border border-amber-100 dark:border-amber-900/30">
                          <span className="block text-[9px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                            Positive (4–5★)
                          </span>
                          <span className="text-lg font-black text-amber-700 dark:text-amber-400 font-sans">
                            {feedback.satisfactionRate ?? 0}%
                          </span>
                        </div>
                      </div>

                      <div>
                        <h4 className="text-[10px] font-bold text-gray-400 dark:text-zinc-500 mb-1.5 uppercase tracking-wide">
                          Rating Distribution
                        </h4>
                        <div className="space-y-1">
                          {[5, 4, 3, 2, 1].map((stars) => {
                            const count = feedback.ratingBreakdown?.[stars] || 0
                            const pct = hasResponses ? Math.round((count / feedback.totalResponses) * 100) : 0
                            return (
                              <div key={stars} className="flex items-center gap-2 text-[11px] text-gray-600 dark:text-zinc-300">
                                <span className="w-6 font-medium text-right shrink-0">{stars}★</span>
                                <div className="flex-1 bg-gray-100 dark:bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                                  <div
                                    className="h-full bg-amber-500 rounded-full transition-all duration-300"
                                    style={{ width: `${pct}%` }}
                                  />
                                </div>
                                <span className="w-8 text-[10px] text-gray-400 dark:text-zinc-500 text-right shrink-0">
                                  {count}
                                </span>
                              </div>
                            )
                          })}
                        </div>
                      </div>

                      {feedback.topAspects && feedback.topAspects.length > 0 && (
                        <div>
                          <h4 className="text-[10px] font-bold text-gray-400 dark:text-zinc-500 mb-1 uppercase tracking-wide">
                            Top Rated Aspects
                          </h4>
                          <div className="flex flex-wrap gap-1">
                            {feedback.topAspects.slice(0, 4).map((aspect) => (
                              <span
                                key={aspect.tag}
                                className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200/50 dark:border-amber-800/30"
                              >
                                {aspect.label} ({aspect.percentage}%)
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      <p className="text-xs text-gray-600 dark:text-zinc-300 leading-relaxed">
                        Direct student evaluations and service feedback collected upon document pickup.
                      </p>
                    </>
                  ) : (
                    <div className="py-2 text-center">
                      <div className="mx-auto w-8 h-8 rounded-full bg-amber-50 dark:bg-amber-950/40 flex items-center justify-center text-amber-500 mb-1.5">
                        <HugeIcon className="ph-fill ph-star text-base" />
                      </div>
                      <p className="text-xs font-semibold text-gray-800 dark:text-zinc-200">No student ratings yet</p>
                      <p className="text-[11px] text-gray-500 dark:text-zinc-400 mt-0.5 leading-snug">
                        Evaluations will populate automatically when requesters submit feedback on released documents.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </Reorder.Item>
          )
        }

        if (key === "total") {
          const isSelected = selectedKpi === "total"
          return (
            <Reorder.Item
              as="div"
              value="total"
              key="total"
              className={cn(
                "relative group rounded-xl w-full h-full cursor-grab active:cursor-grabbing",
                isSelected ? "z-30" : "z-10"
              )}
            >
              <div
                onClick={() => setSelectedKpi(isSelected ? null : "total")}
                className={cn(
                  "relative overflow-hidden rounded-[18px] border cursor-pointer select-none transition-all shadow-none flex flex-col justify-between h-full min-h-[110px] bg-gray-50 dark:bg-zinc-900 hover:bg-gray-100/60 dark:hover:bg-zinc-800/50",
                  isSelected
                    ? "border-emerald-500/50 ring-1 ring-emerald-500/20"
                    : "border-border dark:border-border hover:border-border dark:hover:border-white/10"
                )}
              >
                <div className="flex justify-between items-start p-4 pb-0">
                  <div className="flex flex-col gap-1">
                    <span className="text-[13px] font-medium text-gray-900 dark:text-zinc-300 capitalize">
                      Total Volume
                    </span>
                    <span className="text-[11px] text-gray-400 dark:text-zinc-500">
                      {safeCompleted.toLocaleString()} Completed
                    </span>
                  </div>
                  <div className="w-8 h-8 rounded-[10px] flex items-center justify-center text-white shadow-sm shrink-0 bg-[#22c55e]">
                    <HugeIcon className="ph-bold text-[15px] ph-files" />
                  </div>
                </div>
                <div className="flex justify-between items-end p-4 pt-1">
                  <span className="text-[28px] font-bold text-gray-900 dark:text-white leading-none tracking-tight">
                    {safeTotal.toLocaleString()}
                  </span>
                  <HugeIcon
                    className="ph-bold ph-dots-six-vertical cursor-grab active:cursor-grabbing hover:text-black dark:hover:text-white text-gray-900 dark:text-zinc-300 text-xl mb-0.5"
                    title="Drag to rearrange"
                  />
                </div>
              </div>

              {/* Absolute details container */}
              <div
                className={cn(
                  "absolute top-full left-0 right-0 z-[100] mt-2 rounded-xl border border-border bg-white p-4 shadow-xl dark:border-border dark:bg-zinc-900 transition-all duration-300 ease-in-out origin-top",
                  isSelected
                    ? "scale-y-100 opacity-100 translate-y-0"
                    : "scale-y-95 opacity-0 -translate-y-2 pointer-events-none"
                )}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-emerald-50 dark:bg-emerald-950/30 p-2.5 rounded-lg border border-emerald-100 dark:border-emerald-900/30">
                      <span className="block text-[9px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                        Completed
                      </span>
                      <span className="text-lg font-black text-emerald-700 dark:text-emerald-400 font-sans">
                        {safeCompleted.toLocaleString()}
                      </span>
                    </div>
                    <div className="bg-blue-50 dark:bg-blue-950/30 p-2.5 rounded-lg border border-blue-100 dark:border-blue-900/30">
                      <span className="block text-[9px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                        Active Queue
                      </span>
                      <span className="text-lg font-black text-blue-700 dark:text-blue-400 font-sans">
                        {activeQueueCount.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-[10px] font-bold text-gray-400 dark:text-zinc-500 mb-1.5 uppercase tracking-wide">
                      Status Breakdown
                    </h4>
                    <div className="space-y-1">
                      {[
                        { label: "Pending", count: statusCounts?.Pending || 0, color: "bg-amber-400" },
                        { label: "In Progress", count: statusCounts?.InProgress || 0, color: "bg-sky-400" },
                        { label: "Ready for Pickup", count: statusCounts?.Ready || 0, color: "bg-emerald-400" },
                        { label: "Completed", count: statusCounts?.Completed || 0, color: "bg-green-500" },
                        { label: "Cancelled", count: statusCounts?.Cancelled || 0, color: "bg-gray-400" },
                      ].map(({ label, count, color }) => (
                        <div
                          key={label}
                          className="flex justify-between items-center text-[11px] py-1 border-b border-border dark:border-border text-gray-700 dark:text-zinc-300"
                        >
                          <span className="flex items-center gap-1.5">
                            <span className={cn("w-2 h-2 rounded-full shrink-0", color)} />
                            <span>{label}</span>
                          </span>
                          <span className="font-bold text-gray-900 dark:text-zinc-50">
                            {count.toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {topDocTypes && topDocTypes.length > 0 && (
                    <div>
                      <h4 className="text-[10px] font-bold text-gray-400 dark:text-zinc-500 mb-1 uppercase tracking-wide">
                        Top Requested Documents
                      </h4>
                      <div className="max-h-24 overflow-y-auto space-y-1 pr-1">
                        {topDocTypes.slice(0, 3).map((item) => (
                          <div key={item.name} className="flex justify-between items-center text-[10px] text-gray-600 dark:text-zinc-400 py-0.5">
                            <span className="truncate max-w-[170px]" title={item.name}>{item.name}</span>
                            <span className="font-semibold text-gray-900 dark:text-zinc-200">{item.count}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <p className="text-xs text-gray-600 dark:text-zinc-300 leading-relaxed">
                    Total document requests processed across all programs and request categories.
                  </p>
                </div>
              </div>
            </Reorder.Item>
          )
        }

        return null
      })}
    </Reorder.Group>
  )
}