"use client"

export default function SlaKpiCards({ total, completionRate }) {
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
      {/* Completion Rate */}
      <div className="group relative overflow-hidden rounded-xl border border-red-950 bg-linear-to-br from-red-700 to-red-950 p-5 shadow-sm transition-all dark:shadow-none">
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
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/5">
            <div
              className="h-full bg-linear-to-r from-emerald-400 to-emerald-500"
              style={{ width: `${completionRate}%` }}
            />
          </div>
        </div>
      </div>

      {/* Total Requests */}
      <div className="group relative overflow-hidden rounded-xl border border-emerald-950 bg-linear-to-br from-emerald-800 to-emerald-950 p-5 shadow-sm transition-all hover:shadow-md dark:shadow-none">
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
    </div>
  )
}

