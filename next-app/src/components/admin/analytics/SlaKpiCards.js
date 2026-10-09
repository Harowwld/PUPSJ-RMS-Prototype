import React, { useState, useRef } from "react"
import { Reorder } from "framer-motion"
import HugeIcon from "@/components/shared/HugeIcon"
import { cn } from "@/lib/utils"

export default function SlaKpiCards({ total, completionRate, completed, sla, feedback }) {
  const [selectedKpi, setSelectedKpi] = useState(null)
  const [kpiOrder, setKpiOrder] = useState(["rate", "satisfaction", "total"])
  const containerRef = useRef(null)

  const charterComplianceRate = isNaN(completionRate) ? 0 : (completionRate || 0)
  const activeOverdue = sla?.activeOverdue || 0

  const frameworkLabel = sla?.standards?.frameworkType === "ARTA"
    ? "Citizen's Charter SLA"
    : (sla?.standards?.frameworkName || "Service Standards SLA")

  return (
    <Reorder.Group as="div" axis="x" values={kpiOrder} onReorder={setKpiOrder} ref={containerRef} className="grid grid-cols-1 gap-4 md:grid-cols-3 items-stretch relative z-20 w-full">
      {kpiOrder.map(key => {
        if (key === "rate") return (
          <Reorder.Item as="div" value="rate" key="rate" className={cn("relative group rounded-xl w-full h-full cursor-grab active:cursor-grabbing", selectedKpi === "rate" ? "z-30" : "z-10")}>
            <div onClick={() => setSelectedKpi(selectedKpi === "rate" ? null : "rate")} className={cn("relative overflow-hidden rounded-[18px] border cursor-pointer select-none transition-all shadow-none flex flex-col justify-between h-full min-h-[110px] bg-gray-50 dark:bg-zinc-900", selectedKpi === "rate" ? "border-red-500/50 ring-1 ring-red-500/20" : "border-border dark:border-border")}>
              <div className="flex justify-between items-start p-4 pb-0">
                <div className="flex flex-col gap-1">
                  <span className="text-[13px] font-medium text-gray-900 dark:text-zinc-300 capitalize">{frameworkLabel}</span>
                  {activeOverdue > 0 && <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400 w-fit">{activeOverdue} Overdue</span>}
                </div>
                <div className={cn("w-8 h-8 rounded-[10px] flex items-center justify-center text-white shadow-sm shrink-0", "bg-[#ef4444]")}><HugeIcon className="ph-bold text-[15px] ph-pie-chart" /></div>
              </div>
              <div className="flex justify-between items-end p-4 pt-1">
                <span className="text-[28px] font-bold text-gray-900 dark:text-white leading-none tracking-tight">{charterComplianceRate}%</span>
                <HugeIcon className="ph-bold ph-dots-six-vertical cursor-grab active:cursor-grabbing hover:text-black dark:hover:text-white text-gray-900 dark:text-zinc-300 text-xl mb-0.5" />
              </div>
            </div>
          </Reorder.Item>
        );
        if (key === "satisfaction") return (
          <Reorder.Item as="div" value="satisfaction" key="satisfaction" className={cn("relative group rounded-xl w-full h-full cursor-grab active:cursor-grabbing", selectedKpi === "satisfaction" ? "z-30" : "z-10")}>
            <div onClick={() => setSelectedKpi(selectedKpi === "satisfaction" ? null : "satisfaction")} className={cn("relative overflow-hidden rounded-[18px] border cursor-pointer select-none transition-all shadow-[0_2px_10px_rgb(0,0,0,0.04)] hover:shadow-[0_4px_15px_rgb(0,0,0,0.06)] flex flex-col justify-between h-full min-h-[110px] bg-gray-50 dark:bg-zinc-900", selectedKpi === "satisfaction" ? "border-amber-500/50 ring-1 ring-amber-500/20" : "border-border dark:border-border")}>
              <div className="flex justify-between items-start p-4 pb-0">
                <div className="flex flex-col gap-1">
                  <span className="text-[13px] font-medium text-gray-900 dark:text-zinc-300 capitalize">Client Satisfaction</span>
                  {feedback?.totalResponses > 0 ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 w-fit">
                      {isNaN(feedback.satisfactionRate) ? 0 : feedback.satisfactionRate}% Positive ({feedback.totalResponses})
                    </span>
                  ) : (
                    <span className="text-[11px] text-gray-400 dark:text-zinc-500">No ratings yet</span>
                  )}
                </div>
                <div className={cn("w-8 h-8 rounded-[10px] flex items-center justify-center text-white shadow-sm shrink-0", "bg-[#f59e0b]")}><HugeIcon className="ph-fill text-[15px] ph-star" /></div>
              </div>
              <div className="flex justify-between items-end p-4 pt-1">
                <span className="text-[28px] font-bold text-gray-900 dark:text-white leading-none tracking-tight">
                  {feedback?.totalResponses > 0 ? (
                    <>
                      <span className="text-amber-500 text-[24px] mr-1">★</span>
                      {isNaN(feedback.averageRating) ? "0.0" : feedback.averageRating}
                      <span className="text-xs font-normal text-gray-400 dark:text-zinc-500 ml-1.5">/ 5.0</span>
                    </>
                  ) : (
                    <span className="text-[24px] text-gray-400">N/A</span>
                  )}
                </span>
                <HugeIcon className="ph-bold ph-dots-six-vertical cursor-grab active:cursor-grabbing hover:text-black dark:hover:text-white text-gray-900 dark:text-zinc-300 text-xl mb-0.5" />
              </div>
            </div>
          </Reorder.Item>
        );
        if (key === "total") return (
          <Reorder.Item as="div" value="total" key="total" className={cn("relative group rounded-xl w-full h-full cursor-grab active:cursor-grabbing", selectedKpi === "total" ? "z-30" : "z-10")}>
            <div onClick={() => setSelectedKpi(selectedKpi === "total" ? null : "total")} className={cn("relative overflow-hidden rounded-[18px] border cursor-pointer select-none transition-all shadow-none flex flex-col justify-between h-full min-h-[110px] bg-gray-50 dark:bg-zinc-900", selectedKpi === "total" ? "border-emerald-500/50 ring-1 ring-emerald-500/20" : "border-border dark:border-border")}>
              <div className="flex justify-between items-start p-4 pb-0">
                <div className="flex flex-col gap-1">
                  <span className="text-[13px] font-medium text-gray-900 dark:text-zinc-300 capitalize">Total Volume</span>
                  <span className="text-[11px] text-gray-400 dark:text-zinc-500">{(Number.isFinite(completed) ? completed : 0).toLocaleString()} Completed</span>
                </div>
                <div className={cn("w-8 h-8 rounded-[10px] flex items-center justify-center text-white shadow-sm shrink-0", "bg-[#22c55e]")}><HugeIcon className="ph-bold text-[15px] ph-files" /></div>
              </div>
              <div className="flex justify-between items-end p-4 pt-1">
                <span className="text-[28px] font-bold text-gray-900 dark:text-white leading-none tracking-tight">{(Number.isFinite(total) ? total : 0).toLocaleString()}</span>
                <HugeIcon className="ph-bold ph-dots-six-vertical cursor-grab active:cursor-grabbing hover:text-black dark:hover:text-white text-gray-900 dark:text-zinc-300 text-xl mb-0.5" />
              </div>
            </div>
          </Reorder.Item>
        );
        return null;
      })}
    </Reorder.Group>
  )
}