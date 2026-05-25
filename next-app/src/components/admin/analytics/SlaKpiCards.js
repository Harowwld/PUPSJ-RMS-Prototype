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

      {/* Total Lifetime Requests — Green Card */}
      <div className="group relative overflow-hidden rounded-xl border border-emerald-100 bg-emerald-50 p-5 shadow-sm transition-all hover:border-emerald-200">
        <i className="ph-duotone ph-envelope-open pointer-events-none absolute -right-3 -bottom-3 rotate-12 text-[60px] text-emerald-600 opacity-10" />
        <div className="relative z-10">
          <div className="mb-1 flex items-center gap-1.5 text-[10px] font-bold tracking-widest text-emerald-600/60 uppercase">
            <i className="ph-bold ph-envelope-open" /> Total Lifetime Requests
          </div>
          <div className="text-3xl font-black text-emerald-900">
            {total?.toLocaleString() ?? total}
          </div>
          <div className="mt-1 text-[10px] font-medium text-emerald-700">
            Total requests since system commencement
          </div>
        </div>
      </div>

      {/* Avg Turnaround (SLA) — Blue Card */}
      <div className="group relative overflow-hidden rounded-xl border border-blue-100 bg-blue-50 p-5 shadow-sm transition-all hover:border-blue-200">
        <i className="ph-duotone ph-clock-countdown pointer-events-none absolute -right-3 -bottom-3 rotate-12 text-[60px] text-blue-600 opacity-10" />
        <div className="relative z-10">
          <div className="mb-1 flex items-center gap-2 text-[10px] font-bold tracking-widest text-blue-600/60 uppercase">
            <i className="ph-bold ph-clock-countdown" /> Avg Turnaround (SLA)
            <TooltipProvider>
              <Tooltip delayDuration={300}>
                <TooltipTrigger asChild>
                  <i className="ph-bold ph-info text-sm text-blue-600 transition-opacity hover:opacity-70" />
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-[240px] border-blue-200 bg-white p-3 text-blue-700 shadow-xl">
                  <p className="font-bold leading-tight text-xs">Target SLA: 72 hours for standard documents</p>
                  <p className="mt-1 text-[10px] font-medium opacity-90 leading-relaxed text-gray-500">
                    Standard processing time for document requests via the PUP Online Document Request System (ODRS) is typically 3 to 5 days.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <div className="text-3xl font-black text-blue-900">
            {formatDurationHuman(slaHours)}
          </div>
          <div className="mt-1 text-[10px] font-medium text-blue-700">
            From Pending to Completed
          </div>
        </div>
      </div>
    </div>
  )
}
