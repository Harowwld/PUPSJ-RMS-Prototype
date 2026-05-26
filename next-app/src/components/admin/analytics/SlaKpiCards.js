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
      {/* Completion Rate */}
      <div className="group relative overflow-hidden rounded-xl border border-[#5c1520] bg-[#7a1e28] p-5 shadow-sm transition-all">
        <i className="ph-duotone ph-check-circle pointer-events-none absolute -right-3 -bottom-3 rotate-12 text-[60px] text-white opacity-20" />
        <div className="relative z-10">
          <div className="mb-1 flex items-center gap-1.5 text-[10px] font-bold tracking-widest text-[#f7c9ce] uppercase">
            <i className="ph-bold ph-check-circle" /> Completion Rate
          </div>
          <div className="flex items-end gap-3">
            <div className="text-3xl font-black text-white">
              {completionRate}%
            </div>
          </div>
          <div className="mt-1 text-[10px] font-medium text-[#f7c9ce]/80">
            Request fulfillment efficiency
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-black/20">
            <div
              className="h-full bg-emerald-400"
              style={{ width: `${completionRate}%` }}
            />
          </div>
        </div>
      </div>

      {/* Total Requests */}
      <div className="group relative overflow-hidden rounded-xl border border-emerald-950 bg-emerald-900 p-5 shadow-sm transition-all hover:shadow-md">
        <i className="ph-duotone ph-envelope-open pointer-events-none absolute -right-3 -bottom-3 rotate-12 text-[60px] text-white opacity-10" />
        <div className="relative z-10">
          <div className="mb-1 flex items-center gap-1.5 text-[10px] font-bold tracking-widest text-emerald-200 uppercase">
            <i className="ph-bold ph-envelope-open" /> Total Requests
          </div>
          <div className="text-3xl font-black text-white">
            {total?.toLocaleString() ?? total}
          </div>
          <div className="mt-1 text-[10px] font-medium text-emerald-200/80">
            Total lifetime submissions
          </div>
        </div>
      </div>

      {/* Avg. Turnaround */}
      <div className="group relative overflow-hidden rounded-xl border border-blue-950 bg-blue-900 p-5 shadow-sm transition-all hover:shadow-md">
        <i className="ph-duotone ph-clock-countdown pointer-events-none absolute -right-3 -bottom-3 rotate-12 text-[60px] text-white opacity-10" />
        <div className="relative z-10">
          <div className="mb-1 flex items-center gap-2 text-[10px] font-bold tracking-widest text-blue-200 uppercase">
            <i className="ph-bold ph-clock-countdown" /> Avg. Turnaround
            <TooltipProvider>
              <Tooltip delayDuration={300}>
                <TooltipTrigger asChild>
                  <i className="ph-bold ph-info text-sm text-blue-200 transition-opacity hover:opacity-70 cursor-pointer" />
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-[240px] border-blue-800 bg-blue-950 p-3 text-white shadow-xl">
                  <p className="font-bold leading-tight text-xs">Standard SLA: 72 Hours</p>
                  <p className="mt-1 text-[10px] font-medium opacity-90 leading-relaxed">
                    Typical processing time for document requests is 3 to 5 business days.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <div className="text-3xl font-black text-white">
            {formatDurationHuman(slaHours)}
          </div>
          <div className="mt-1 text-[10px] font-medium text-blue-200/80">
            Submission to completion
          </div>
        </div>
      </div>
    </div>
  )
}
