"use client"

import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "@/components/ui/tooltip"
import { formatDurationHuman } from "@/lib/timeFormat"

export default function SlaKpiCards({ total, slaHours, completionRate }) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      {/* Overall Completion Rate — Primary Performance Card (Accent) */}
      <div className="group relative overflow-hidden rounded-xl border border-[#5c1520] bg-[#7a1e28] p-5 shadow-sm transition-all">
        <i className="ph-duotone ph-check-circle pointer-events-none absolute -right-3 -bottom-3 rotate-12 text-[60px] text-white opacity-20" />
        <div className="relative z-10">
          <div className="mb-1 flex items-center gap-1.5 text-[10px] font-bold tracking-widest text-[#f7c9ce] uppercase">
            <i className="ph-bold ph-check-circle" /> Overall Completion Rate
          </div>
          <div className="flex items-end gap-3">
            <div className="text-3xl font-black text-white">
              {completionRate}%
            </div>
          </div>
          <div className="mt-1 text-[10px] font-medium text-[#f7c9ce]/80">
            Fulfillment efficiency performance
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-black/20">
            <div
              className="h-full bg-emerald-400"
              style={{ width: `${completionRate}%` }}
            />
          </div>
        </div>
      </div>

      {/* Total Lifetime Requests — Light Card */}
      <div className="group relative overflow-hidden rounded-xl border border-[#7a1e28]/15 bg-[#fdf6f6] p-5 shadow-sm transition-all">
        <i className="ph-duotone ph-envelope-open pointer-events-none absolute -right-3 -bottom-3 rotate-12 text-[60px] text-[#7a1e28] opacity-10" />
        <div className="relative z-10">
          <div className="mb-1 flex items-center gap-1.5 text-[10px] font-bold tracking-widest text-[#9e5a62] uppercase">
            <i className="ph-bold ph-envelope-open" /> Total Lifetime Requests
          </div>
          <div className="text-3xl font-black text-[#7a1e28]">
            {total?.toLocaleString() ?? total}
          </div>
          <div className="mt-1 text-[10px] font-medium text-[#b07078]">
            Total requests since system commencement
          </div>
        </div>
      </div>

      {/* Avg Turnaround (SLA) — Light Card */}
      <div className="group relative overflow-hidden rounded-xl border border-[#7a1e28]/15 bg-[#fdf6f6] p-5 shadow-sm transition-all">
        <i className="ph-duotone ph-clock-countdown pointer-events-none absolute -right-3 -bottom-3 rotate-12 text-[60px] text-[#7a1e28] opacity-10" />
        <div className="relative z-10">
          <div className="mb-1 flex items-center gap-2 text-[10px] font-bold tracking-widest text-[#9e5a62] uppercase">
            <i className="ph-bold ph-clock-countdown" /> Avg Turnaround (SLA)
            <TooltipProvider>
              <Tooltip delayDuration={300}>
                <TooltipTrigger asChild>
                  <i className="ph-bold ph-info text-sm text-[#7a1e28] transition-opacity hover:opacity-70" />
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-[240px] border-[#7a1e28]/20 bg-[#7a1e28] p-3 text-white">
                  <p className="font-bold leading-tight text-xs">Target SLA: 72 hours for standard documents</p>
                  <p className="mt-1 text-[10px] font-medium opacity-90 leading-relaxed">
                    Standard processing time for document requests via the PUP Online Document Request System (ODRS) is typically 3 to 5 days.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <div className="text-3xl font-black text-[#7a1e28]">
            {formatDurationHuman(slaHours)}
          </div>
          <div className="mt-1 text-[10px] font-medium text-[#b07078]">
            From Pending to Completed
          </div>
        </div>
      </div>
    </div>
  )
}
