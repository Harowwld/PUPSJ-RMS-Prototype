"use client"

export default function LogExpandedRow({ log, handleCopy }) {
  const formattedDescription = (() => {
    const text = log.details || "No known description";
    const parts = text.split(/'([^']+)'/g);
    if (parts.length === 1) return text;
    return parts.map((part, i) => {
      if (i % 2 === 1) {
        return <span key={i} className="font-medium text-[#111111] dark:text-zinc-50">{part}</span>;
      }
      return part;
    });
  })();

  return (
    <div 
      className="animate-in fade-in slide-in-from-top-1 duration-slow bg-[#FAFAFA] dark:bg-[#121214]"
      style={{ borderTop: '0.5px solid rgba(0,0,0,0.06)', padding: '20px 28px' }}
    >
      <div className="grid grid-cols-1 gap-[20px] md:grid-cols-3">
        {/* Details Section */}
        <div className="flex flex-col">
          <div className="flex items-center gap-[6px] mb-[12px]">
            <i className="ph-bold ph-file-text text-[15px] text-[#8E8E93]"></i>
            <h5 className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[#8E8E93]">
              Details
            </h5>
          </div>
          <div 
            className="bg-white dark:bg-card p-[16px] rounded-xl h-full border border-gray-200/60 dark:border-white/10"
          >
            <p className="text-[13px] font-normal text-[#111111] dark:text-zinc-50 leading-[1.5]">
              {formattedDescription}
            </p>
          </div>
        </div>

        {/* Network Section */}
        <div className="flex flex-col">
          <div className="flex items-center gap-[6px] mb-[12px]">
            <i className="ph-bold ph-wifi-high text-[15px] text-[#8E8E93]"></i>
            <h5 className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[#8E8E93]">
              Network
            </h5>
          </div>
          <div 
            className="space-y-[16px] bg-white dark:bg-card p-[16px] rounded-xl border border-gray-200/60 dark:border-white/10"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[#8E8E93]">IP Address</span>
              <div className="flex items-center gap-[6px]">
                <span className="text-[13px] font-normal text-[#111111] dark:text-zinc-50">{log.ip || "::1"}</span>
                <button 
                  onClick={() => handleCopy(log.ip, "IP Address")}
                  aria-label="Copy IP Address"
                  className="w-7 h-7 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-400 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-zinc-100 focus:outline-none cursor-pointer active:scale-95 flex items-center justify-center transition-colors border-0 bg-transparent"
                >
                  <i className="ph-bold ph-copy text-[14px]"></i>
                </button>
              </div>
            </div>
            <div className="flex flex-col gap-1.5 border-t border-black/5 pt-[16px] dark:border-white/5">
              <span className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[#8E8E93]">Browser</span>
              <span className="text-[12px] font-normal text-[#8E8E93] leading-[1.5]">
                {log.userAgent || log.user_agent}
              </span>
            </div>
          </div>
        </div>

        {/* Reference Section */}
        <div className="flex flex-col">
          <div className="flex items-center gap-[6px] mb-[12px]">
            <i className="ph-bold ph-cube text-[15px] text-[#8E8E93]"></i>
            <h5 className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[#8E8E93]">
              Reference
            </h5>
          </div>
          <div 
            className="space-y-[16px] bg-white dark:bg-card p-[16px] rounded-xl border border-gray-200/60 dark:border-white/10"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[#8E8E93]">Target</span>
              <span className="rounded-full bg-[#E0F2FE] px-[10px] py-[2.5px] text-[11px] font-medium text-[#0369A1] dark:bg-blue-950/40 dark:text-blue-400">
                {log.entityType || "N/A"}
              </span>
            </div>
            <div className="flex items-center justify-between border-t border-black/5 pt-[16px] dark:border-white/5">
              <span className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[#8E8E93]">ID</span>
              <div className="flex items-center gap-[6px]">
                <span className="text-[13px] font-medium text-[#111111] dark:text-zinc-50">{log.entityId || "N/A"}</span>
                {log.entityId && (
                  <button 
                    onClick={() => handleCopy(log.entityId, "Reference ID")}
                    aria-label="Copy Reference ID"
                    className="w-7 h-7 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-400 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-zinc-100 focus:outline-none cursor-pointer active:scale-95 flex items-center justify-center transition-colors border-0 bg-transparent"
                  >
                    <i className="ph-bold ph-copy text-[14px]"></i>
                  </button>
                )}
              </div>
            </div>
            {(log.officeName || log.scope) && (
              <div className="flex items-center justify-between border-t border-black/5 pt-[16px] dark:border-white/5">
                <span className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[#8E8E93]">Scope</span>
                <span className="text-[13px] font-medium text-[#111111] dark:text-zinc-50">
                  {log.officeName || log.scope}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
