import { useState, useRef, useEffect } from "react"
import { cn } from "@/lib/utils"

export default function SlaKpiCards({ total, completionRate, completed, sla }) {
  const [selectedKpi, setSelectedKpi] = useState(null)
  const containerRef = useRef(null)

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

  const compliantCount = sla?.compliantCompleted ?? completed ?? 0
  const delayedCount = sla?.delayedCompleted ?? 0
  const activeOverdue = sla?.activeOverdue ?? 0
  const charterComplianceRate = sla?.complianceRate ?? completionRate

  return (
    <div ref={containerRef} className="grid grid-cols-1 gap-4 md:grid-cols-2 items-stretch relative z-20 w-full">
      {/* Completion Rate & RA 11032 Compliance */}
      <div className={cn(
        "relative group rounded-xl h-full flex flex-col w-full",
        selectedKpi === "rate" ? "z-30" : "z-10"
      )}>
        <div 
          onClick={() => setSelectedKpi(selectedKpi === "rate" ? null : "rate")}
          className={cn(
            "relative overflow-hidden rounded-xl border p-4 cursor-pointer select-none transition-all h-full flex flex-col justify-between",
            "border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-zinc-900/30 hover:border-gray-200 dark:hover:border-white/10",
            selectedKpi === "rate" && "border-red-500/40 dark:border-red-500/40 ring-1 ring-red-500/20"
          )}
        >
          <div className="relative z-10 flex-1 flex flex-col justify-between">
            <div>
              <div className="mb-1 flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-zinc-500">
                  Citizen&apos;s Charter SLA
                </span>
                <div className="flex items-center gap-1.5">
                  {activeOverdue > 0 && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400">
                      {activeOverdue} Overdue
                    </span>
                  )}
                  <i className={cn("ph-bold ph-caret-down text-xs text-gray-400 transition-transform duration-300", selectedKpi === "rate" && "rotate-180")} />
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-gray-900 dark:text-zinc-50 tracking-tight">
                  {charterComplianceRate}%
                </span>
                <span className="text-xs font-medium text-pup-maroon dark:text-red-400">
                  RA 11032 compliance (3-7-20 standard)
                </span>
              </div>
            </div>
            <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-gray-200/70 dark:bg-zinc-800">
              <div
                data-width={`${charterComplianceRate}%`}
                className="rms-style-width h-full bg-pup-maroon dark:bg-red-500 rounded-full"
              />
            </div>
          </div>
        </div>
 
        {/* Absolute details container */}
        <div className={cn(
          "absolute top-full left-0 right-0 z-[100] mt-2 rounded-xl border border-gray-200 bg-white p-4 shadow-xl dark:border-white/10 dark:bg-zinc-900 transition-all duration-300 ease-in-out origin-top",
          selectedKpi === "rate" ? "scale-y-100 opacity-100 translate-y-0" : "scale-y-95 opacity-0 -translate-y-2 pointer-events-none"
        )} onClick={(e) => e.stopPropagation()}>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-emerald-50 dark:bg-emerald-950/30 p-2.5 rounded-lg border border-emerald-100 dark:border-emerald-900/30">
                <span className="block text-[9px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Met SLA (On-Time)</span>
                <span className="text-lg font-black text-emerald-700 dark:text-emerald-400">{compliantCount.toLocaleString()}</span>
              </div>
              <div className="bg-amber-50 dark:bg-amber-950/30 p-2.5 rounded-lg border border-amber-100 dark:border-amber-900/30">
                <span className="block text-[9px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">Delayed / Overdue</span>
                <span className="text-lg font-black text-amber-700 dark:text-amber-400">{(delayedCount + activeOverdue).toLocaleString()}</span>
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-zinc-800/60 p-2.5 rounded-lg border border-gray-100 dark:border-white/5 text-[11px] text-gray-600 dark:text-zinc-300 leading-relaxed">
              Mandated by RA 11032 (Ease of Doing Business Act) and the PUP Citizen&apos;s Charter. Timeframes are calculated in working days (excluding weekends &amp; holidays).
            </div>
          </div>
        </div>
      </div>
 
      {/* Total Requests */}
      <div className={cn(
        "relative group rounded-xl h-full flex flex-col w-full",
        selectedKpi === "total" ? "z-30" : "z-10"
      )}>
        <div 
          onClick={() => setSelectedKpi(selectedKpi === "total" ? null : "total")}
          className={cn(
            "relative overflow-hidden rounded-xl border p-4 cursor-pointer select-none transition-all h-full flex flex-col justify-between",
            "border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-zinc-900/30 hover:border-gray-200 dark:hover:border-white/10",
            selectedKpi === "total" && "border-emerald-500/40 dark:border-emerald-500/40 ring-1 ring-emerald-500/20"
          )}
        >
          <div className="relative z-10 flex-1 flex flex-col justify-between">
            <div>
              <div className="mb-1 flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-zinc-500">
                  Total Requests
                </span>
                <i className={cn("ph-bold ph-caret-down text-xs text-gray-400 transition-transform duration-300", selectedKpi === "total" && "rotate-180")} />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-gray-900 dark:text-zinc-50 tracking-tight">
                  {total?.toLocaleString() ?? total}
                </span>
                <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                  Total lifetime submissions
                </span>
              </div>
            </div>
            <div className="mt-2.5 h-1.5 w-full opacity-0" />
          </div>
        </div>

        {/* Absolute details container */}
        <div className={cn(
          "absolute top-full left-0 right-0 z-[100] mt-2 rounded-xl border border-gray-200 bg-white p-4 shadow-xl dark:border-white/10 dark:bg-zinc-900 transition-all duration-300 ease-in-out origin-top",
          selectedKpi === "total" ? "scale-y-100 opacity-100 translate-y-0" : "scale-y-95 opacity-0 -translate-y-2 pointer-events-none"
        )} onClick={(e) => e.stopPropagation()}>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-gray-50 dark:bg-zinc-800/60 p-2.5 rounded-lg border border-gray-100 dark:border-white/5">
                <span className="block text-[9px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-wider">Total Volume</span>
                <span className="text-lg font-black text-gray-900 dark:text-zinc-50">{total?.toLocaleString()}</span>
              </div>
              <div className="bg-blue-50 dark:bg-blue-950/30 p-2.5 rounded-lg border border-blue-100 dark:border-blue-900/30">
                <span className="block text-[9px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">Est. Monthly</span>
                <span className="text-lg font-black text-blue-700 dark:text-blue-400">{Math.round((total || 0) / 12).toLocaleString()}</span>
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-zinc-800/60 p-2.5 rounded-lg border border-gray-100 dark:border-white/5 text-xs text-gray-600 dark:text-zinc-300 leading-relaxed">
              Total lifetime submissions aggregated across the digital archive nodes.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
