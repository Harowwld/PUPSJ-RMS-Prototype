import { useState } from "react"
import { cn } from "@/lib/utils"

export default function SlaKpiCards({ total, completionRate }) {
  const [selectedKpi, setSelectedKpi] = useState(null)

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 items-stretch relative z-20 w-full">
      {/* Completion Rate */}
      <div className={cn(
        "relative group rounded-xl h-full flex flex-col w-full",
        selectedKpi === "rate" ? "z-30" : "z-10"
      )}>
        <div 
          onClick={() => setSelectedKpi(selectedKpi === "rate" ? null : "rate")}
          className="relative overflow-hidden rounded-xl border-none bg-gradient-to-br from-[#f87171] via-[#dc2626] to-[#b91c1c] dark:from-[#dc2626] dark:to-[#7f1d1d] p-5 cursor-pointer glass-stat-card-red select-none h-full flex flex-col justify-between"
        >
          <div className="absolute inset-0 overflow-hidden rounded-xl pointer-events-none z-0">
            <div className="absolute bottom-0 left-0 w-[70%] h-[80%] bg-gradient-to-tr from-[#b91c1c]/40 to-[#dc2626]/0 pointer-events-none" style={{ clipPath: 'polygon(0% 100%, 100% 100%, 0% 0%)' }} />
            <div className="absolute bottom-0 left-0 w-[50%] h-[60%] bg-gradient-to-tr from-[#f87171]/30 to-[#dc2626]/0 pointer-events-none" style={{ clipPath: 'polygon(0% 100%, 100% 100%, 0% 25%)' }} />
          </div>
          <div className="relative z-10 flex-1 flex flex-col justify-between">
            <div>
              <div className="mb-1 flex items-center gap-1.5 text-[14px] font-medium text-white">
                Completion Rate
              </div>
              <div className="flex items-end gap-3">
                <div className="text-[48px] font-semibold text-white">
                  {completionRate}%
                </div>
              </div>
              <div className="mt-1 text-[13px] font-normal text-white">
                Request fulfillment efficiency
              </div>
            </div>
            <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-white/5">
              <div
                className="h-full bg-gradient-to-r from-emerald-450 to-emerald-550 bg-white"
                style={{ width: `${completionRate}%` }}
              />
            </div>
          </div>
        </div>
 
        {/* Absolute details container */}
        <div className={cn(
          "absolute top-full left-0 right-0 z-[100] mt-2 rounded-xl bg-gradient-to-br from-[#f87171] via-[#dc2626] to-[#b91c1c] dark:from-[#dc2626] dark:to-[#7f1d1d] p-5 shadow-2xl transition-all duration-300 ease-in-out origin-top",
          selectedKpi === "rate" ? "scale-y-100 opacity-100 translate-y-0" : "scale-y-95 opacity-0 -translate-y-2 pointer-events-none"
        )} onClick={(e) => e.stopPropagation()}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2 text-white">
              <div className="bg-white/10 backdrop-blur-sm p-2.5 rounded-lg text-white">
                <span className="block text-[9px] font-bold text-white/70 uppercase tracking-wider">Completion Rate</span>
                <span className="text-lg font-black font-sans">{completionRate}%</span>
              </div>
              <div className="bg-white/10 backdrop-blur-sm p-2.5 rounded-lg text-white">
                <span className="block text-[9px] font-bold text-white/70 uppercase tracking-wider">SLA Target</span>
                <span className="text-lg font-black font-sans">90%</span>
              </div>
            </div>
 
            <div className="bg-white/10 backdrop-blur-sm p-2.5 rounded-lg text-xs text-white/90 leading-relaxed">
              The fulfillment rate reflects the percentage of administrative requests solved and completed within target SLA guidelines.
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
          className="relative overflow-hidden rounded-xl border-none bg-gradient-to-br from-[#34d399] via-[#059669] to-[#047857] dark:from-[#059669] dark:to-[#024e37] p-5 cursor-pointer glass-stat-card-green select-none h-full flex flex-col justify-between"
        >
          <div className="absolute inset-0 overflow-hidden rounded-xl pointer-events-none z-0">
            <div className="absolute bottom-0 left-0 w-[70%] h-[80%] bg-gradient-to-tr from-[#047857]/40 to-[#059669]/0 pointer-events-none" style={{ clipPath: 'polygon(0% 100%, 100% 100%, 0% 0%)' }} />
            <div className="absolute bottom-0 left-0 w-[50%] h-[60%] bg-gradient-to-tr from-[#34d399]/30 to-[#059669]/0 pointer-events-none" style={{ clipPath: 'polygon(0% 100%, 100% 100%, 0% 25%)' }} />
          </div>
          <div className="relative z-10 flex-1 flex flex-col justify-between">
            <div>
              <div className="mb-1 flex items-center gap-1.5 text-[14px] font-medium text-white">
                Total Requests
              </div>
              <div className="flex items-end gap-3">
                <div className="text-[48px] font-semibold text-white">
                  {total?.toLocaleString() ?? total}
                </div>
              </div>
              <div className="mt-1 text-[13px] font-normal text-white">
                Total lifetime submissions
              </div>
            </div>
            <div className="mt-4 h-1.5 w-full opacity-0" />
          </div>
        </div>

        {/* Absolute details container */}
        <div className={cn(
          "absolute top-full left-0 right-0 z-[100] mt-2 rounded-xl bg-gradient-to-br from-[#34d399] via-[#059669] to-[#047857] dark:from-[#059669] dark:to-[#024e37] p-5 shadow-2xl transition-all duration-300 ease-in-out origin-top",
          selectedKpi === "total" ? "scale-y-100 opacity-100 translate-y-0" : "scale-y-95 opacity-0 -translate-y-2 pointer-events-none"
        )} onClick={(e) => e.stopPropagation()}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2 text-white">
              <div className="bg-white/10 backdrop-blur-sm p-2.5 rounded-lg text-white">
                <span className="block text-[9px] font-bold text-white/70 uppercase tracking-wider">Total Volume</span>
                <span className="text-lg font-black font-sans">{total?.toLocaleString()}</span>
              </div>
              <div className="bg-white/10 backdrop-blur-sm p-2.5 rounded-lg text-white">
                <span className="block text-[9px] font-bold text-white/70 uppercase tracking-wider">Est. Monthly</span>
                <span className="text-lg font-black font-sans">{Math.round((total || 0) / 12).toLocaleString()}</span>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-sm p-2.5 rounded-lg text-xs text-white/90 leading-relaxed">
              Total lifetime submissions aggregated across the digital archive nodes.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

