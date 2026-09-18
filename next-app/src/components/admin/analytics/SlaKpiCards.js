import React, { useState, useRef, useEffect, useMemo, useCallback } from "react"
import { Reorder } from "framer-motion"
import HugeIcon from "@/components/shared/HugeIcon"
import { cn } from "@/lib/utils"

export default function SlaKpiCards({ total, completionRate, completed, sla }) {
  const [selectedKpi, setSelectedKpi] = useState(null)
  const [kpiOrder, setKpiOrder] = useState(["rate", "total"])
  const containerRef = useRef(null)

  const charterComplianceRate = completionRate || 0
  const activeOverdue = 0

  return (
    <Reorder.Group as="div" axis="x" values={kpiOrder} onReorder={setKpiOrder} ref={containerRef} className="grid grid-cols-1 gap-4 md:grid-cols-2 items-stretch relative z-20 w-full">
      {kpiOrder.map(key => {
        if (key === "rate") return (
          <Reorder.Item as="div" value="rate" key="rate" className={cn("relative group rounded-xl w-full cursor-grab active:cursor-grabbing", selectedKpi === "rate" ? "z-30" : "z-10")}>
            <div onClick={() => setSelectedKpi(selectedKpi === "rate" ? null : "rate")} className={cn("relative overflow-hidden rounded-[18px] border cursor-pointer select-none transition-all shadow-[0_2px_10px_rgb(0,0,0,0.04)] hover:shadow-[0_4px_15px_rgb(0,0,0,0.06)] flex flex-col justify-between min-h-[110px] bg-gray-50 dark:bg-zinc-900", selectedKpi === "rate" ? "border-red-500/50 ring-1 ring-red-500/20" : "border-gray-100 dark:border-white/5")}>
              <div className="flex justify-between items-start p-4 pb-0">
                <div className="flex flex-col gap-1">
                  <span className="text-[13px] font-medium text-gray-500 dark:text-zinc-400 capitalize">Citizen's Charter SLA</span>
                  {activeOverdue > 0 && <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400 w-fit">{activeOverdue} Overdue</span>}
                </div>
                <div className={cn("w-8 h-8 rounded-[10px] flex items-center justify-center text-white shadow-sm shrink-0", "bg-[#ef4444]")}><HugeIcon className="ph-bold text-[15px] ph-pie-chart" /></div>
              </div>
              <div className="flex justify-between items-end p-4 pt-1">
                <span className="text-[28px] font-bold text-gray-900 dark:text-white leading-none tracking-tight">{charterComplianceRate}%</span>
                <HugeIcon className="ph-bold ph-dots-six-vertical cursor-grab active:cursor-grabbing hover:text-gray-400 dark:hover:text-zinc-500 text-gray-300 dark:text-zinc-700 text-lg mb-0.5" />
              </div>
            </div>
          </Reorder.Item>
        );
        if (key === "total") return (
          <Reorder.Item as="div" value="total" key="total" className={cn("relative group rounded-xl w-full cursor-grab active:cursor-grabbing", selectedKpi === "total" ? "z-30" : "z-10")}>
            <div onClick={() => setSelectedKpi(selectedKpi === "total" ? null : "total")} className={cn("relative overflow-hidden rounded-[18px] border cursor-pointer select-none transition-all shadow-[0_2px_10px_rgb(0,0,0,0.04)] hover:shadow-[0_4px_15px_rgb(0,0,0,0.06)] flex flex-col justify-between min-h-[110px] bg-gray-50 dark:bg-zinc-900", selectedKpi === "total" ? "border-emerald-500/50 ring-1 ring-emerald-500/20" : "border-gray-100 dark:border-white/5")}>
              <div className="flex justify-between items-start p-4 pb-0">
                <div className="flex flex-col gap-1"><span className="text-[13px] font-medium text-gray-500 dark:text-zinc-400 capitalize">Total Requests</span></div>
                <div className={cn("w-8 h-8 rounded-[10px] flex items-center justify-center text-white shadow-sm shrink-0", "bg-[#22c55e]")}><HugeIcon className="ph-bold text-[15px] ph-files" /></div>
              </div>
              <div className="flex justify-between items-end p-4 pt-1">
                <span className="text-[28px] font-bold text-gray-900 dark:text-white leading-none tracking-tight">{total?.toLocaleString() ?? total}</span>
                <HugeIcon className="ph-bold ph-dots-six-vertical cursor-grab active:cursor-grabbing hover:text-gray-400 dark:hover:text-zinc-500 text-gray-300 dark:text-zinc-700 text-lg mb-0.5" />
              </div>
            </div>
          </Reorder.Item>
        );
        return null;
      })}
    </Reorder.Group>
  )
}