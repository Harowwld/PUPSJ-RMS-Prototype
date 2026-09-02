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
            <i className="ti ti-file-text text-[14px]" style={{ fontSize: '14px', color: '#8E8E93' }}></i>
            <h5 className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[#8E8E93]">
              Details
            </h5>
          </div>
          <div 
            className="bg-white dark:bg-card p-[16px] rounded-[8px] h-full"
            style={{ border: '0.5px solid rgba(0,0,0,0.08)' }}
          >
            <p className="text-[13px] font-normal text-[#111111] dark:text-zinc-50 leading-[1.5]">
              {formattedDescription}
            </p>
          </div>
        </div>

        {/* Network Section */}
        <div className="flex flex-col">
          <div className="flex items-center gap-[6px] mb-[12px]">
            <i className="ti ti-wifi text-[14px]" style={{ fontSize: '14px', color: '#8E8E93' }}></i>
            <h5 className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[#8E8E93]">
              Network
            </h5>
          </div>
          <div 
            className="space-y-[16px] bg-white dark:bg-card p-[16px] rounded-[8px]"
            style={{ border: '0.5px solid rgba(0,0,0,0.08)' }}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[#8E8E93]">IP Address</span>
              <div className="flex items-center gap-[6px]">
                <span className="text-[13px] font-normal text-[#111111] dark:text-zinc-50">{log.ip || "::1"}</span>
                <button 
                  onClick={() => handleCopy(log.ip, "IP Address")}
                  className="w-7 h-7 rounded-[6px] hover:bg-[rgba(0,0,0,0.06)] dark:hover:bg-white/10 text-[#C7C7CC] hover:text-[#111111] dark:hover:text-zinc-100 focus:outline-none cursor-pointer active:scale-95 flex items-center justify-center transition-colors"
                >
                  <i className="ti ti-copy text-[14px]" style={{ fontSize: '14px' }}></i>
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
            <i className="ti ti-box text-[14px]" style={{ fontSize: '14px', color: '#8E8E93' }}></i>
            <h5 className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[#8E8E93]">
              Reference
            </h5>
          </div>
          <div 
            className="space-y-[16px] bg-white dark:bg-card p-[16px] rounded-[8px]"
            style={{ border: '0.5px solid rgba(0,0,0,0.08)' }}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[#8E8E93]">Target</span>
              <span className="rounded-[4px] bg-[#E0F2FE] px-[8px] py-[3px] text-[11px] font-medium text-[#0369A1] dark:bg-blue-950/40 dark:text-blue-400">
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
                    className="w-7 h-7 rounded-[6px] hover:bg-[rgba(0,0,0,0.06)] dark:hover:bg-white/10 text-[#C7C7CC] hover:text-[#111111] dark:hover:text-zinc-100 focus:outline-none cursor-pointer active:scale-95 flex items-center justify-center transition-colors"
                  >
                    <i className="ti ti-copy text-[14px]" style={{ fontSize: '14px' }}></i>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
