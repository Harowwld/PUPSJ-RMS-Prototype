"use client"

export default function SlaKpiCards({ total, completionRate }) {
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
      {/* Completion Rate */}
      <div className="group relative overflow-hidden rounded-xl border-none bg-gradient-to-br from-[#f87171] via-[#dc2626] to-[#b91c1c] dark:from-[#dc2626] dark:to-[#7f1d1d] p-5 transition-all duration-300 hover:-translate-y-0.5">
        <div className="absolute inset-0 overflow-hidden rounded-xl pointer-events-none z-0">
          <div className="absolute bottom-0 left-0 w-[70%] h-[80%] bg-gradient-to-tr from-[#b91c1c]/40 to-[#dc2626]/0 pointer-events-none" style={{ clipPath: 'polygon(0% 100%, 100% 100%, 0% 0%)' }} />
          <div className="absolute bottom-0 left-0 w-[50%] h-[60%] bg-gradient-to-tr from-[#f87171]/30 to-[#dc2626]/0 pointer-events-none" style={{ clipPath: 'polygon(0% 100%, 100% 100%, 0% 25%)' }} />
        </div>
        <div className="relative z-10">
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
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/5">
            <div
              className="h-full bg-gradient-to-r from-emerald-450 to-emerald-550 bg-white"
              style={{ width: `${completionRate}%` }}
            />
          </div>
        </div>
      </div>

      {/* Total Requests */}
      <div className="group relative overflow-hidden rounded-xl border-none bg-gradient-to-br from-[#34d399] via-[#059669] to-[#047857] dark:from-[#059669] dark:to-[#024e37] p-5 transition-all duration-300 hover:-translate-y-0.5">
        <div className="absolute inset-0 overflow-hidden rounded-xl pointer-events-none z-0">
          <div className="absolute bottom-0 left-0 w-[70%] h-[80%] bg-gradient-to-tr from-[#047857]/40 to-[#059669]/0 pointer-events-none" style={{ clipPath: 'polygon(0% 100%, 100% 100%, 0% 0%)' }} />
          <div className="absolute bottom-0 left-0 w-[50%] h-[60%] bg-gradient-to-tr from-[#34d399]/30 to-[#059669]/0 pointer-events-none" style={{ clipPath: 'polygon(0% 100%, 100% 100%, 0% 25%)' }} />
        </div>
        <div className="relative z-10">
          <div className="mb-1 flex items-center gap-1.5 text-[14px] font-medium text-white">
            Total Requests
          </div>
          <div className="text-[48px] font-semibold text-white">
            {total?.toLocaleString() ?? total}
          </div>
          <div className="mt-1 text-[13px] font-normal text-white">
            Total lifetime submissions
          </div>
        </div>
      </div>
    </div>
  )
}

