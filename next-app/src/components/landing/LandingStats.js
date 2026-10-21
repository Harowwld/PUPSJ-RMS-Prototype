"use client";
import HugeIcon from "@/components/shared/HugeIcon";
export default function LandingStats() {
  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 pb-16 w-full font-jakarta">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Blue Stat Card */}
        <div className="relative overflow-hidden rounded-xl border-none p-5 cursor-default bg-gradient-to-br select-none shadow-sm text-white" style={{ background: "linear-gradient(135deg, #14C8FF 0%, #007AFF 50%, #0055FF 100%)" }}>
          <div className="relative z-10">
            <div className="mb-1 flex items-center gap-2 text-[14px] font-medium text-white/95">
              <HugeIcon  className="ph-bold ph-database text-white text-[16px]" />
              <span>Academic Records Archive</span>
            </div>
            <div className="text-[42px] font-semibold text-white tracking-tight leading-none mt-2">
              100%
            </div>
            <div className="mt-2 text-[13px] font-normal text-white/90">
              Student and alumni archive records are organized and searchable in eManage
            </div>
          </div>
        </div>

        {/* Green Stat Card */}
        <div className="relative overflow-hidden rounded-xl border-none p-5 cursor-default bg-gradient-to-br select-none shadow-sm text-white" style={{ background: "linear-gradient(135deg, #34d399 0%, #059669 50%, #047857 100%)" }}>
          <div className="relative z-10">
            <div className="mb-1 flex items-center gap-2 text-[14px] font-medium text-white/95">
              <HugeIcon  className="ph-bold ph-timer text-white text-[16px]" />
              <span>Fast Processing Time</span>
            </div>
            <div className="text-[42px] font-semibold text-white tracking-tight leading-none mt-2">
              3–5 Days
            </div>
            <div className="mt-2 text-[13px] font-normal text-white/90">
              Average turnaround for official certificates and academic evaluations
            </div>
          </div>
        </div>

        {/* Orange Stat Card */}
        <div className="relative overflow-hidden rounded-xl border-none p-5 cursor-default bg-gradient-to-br select-none shadow-sm text-white" style={{ background: "linear-gradient(135deg, #fbbf24 0%, #d97706 50%, #b45309 100%)" }}>
          <div className="relative z-10">
            <div className="mb-1 flex items-center gap-2 text-[14px] font-medium text-white/95">
              <HugeIcon  className="ph-bold ph-shield-check text-white text-[16px]" />
              <span>Privacy & Security</span>
            </div>
            <div className="text-[42px] font-semibold text-white tracking-tight leading-none mt-2">
              RA 10173
            </div>
            <div className="mt-2 text-[13px] font-normal text-white/90">
              Full compliance with the Philippine Data Privacy Act and institutional records safety
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}
