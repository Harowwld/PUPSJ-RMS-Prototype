"use client"

import {
  Card,
  CardContent,
} from "@/components/ui/card"
import { formatPHDateTime } from "@/lib/timeFormat"
import { cn } from "@/lib/utils"

export default function HealthSidebar({
  systemHealth,
  lastBackupTime,
}) {
  const diskPercent = systemHealth?.disk?.percent || 0
  const isCritical = diskPercent > 95

  const getDiskColor = (percent) => {
    if (percent >= 90) return "text-red-500"
    if (percent >= 70) return "text-amber-500"
    return "text-green-500"
  }

  const diskColorClass = getDiskColor(diskPercent)

  return (
    <div className="w-[350px] shrink-0 flex flex-col gap-4 animate-in fade-in slide-in-from-right-4 duration-500">
      <Card className="flex flex-col border border-gray-200 bg-white shadow-sm h-full rounded-brand overflow-hidden">
        <div className="px-6 py-10 border-b border-gray-100 bg-white">
          <div className="border-l-4 border-pup-maroon pl-5">
            <h3 className="text-xl font-black tracking-tighter text-gray-900 uppercase leading-none">
              System Health
            </h3>
            <p className="text-[9px] font-black text-gray-400 mt-2 uppercase tracking-[0.3em]">
              Node Diagnostics
            </p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Main Critical Gauge: Storage */}
          <div className="flex flex-col items-center py-4 bg-linear-to-b from-gray-50/50 to-white rounded-2xl border border-gray-100 p-5 shadow-xs">
            <div
              className={`relative mx-auto flex aspect-[2/1] w-full max-w-[160px] items-end justify-center overflow-hidden rounded-t-full transition-all duration-500 ${isCritical ? "animate-pulse" : ""}`}
            >
              <svg
                className={`absolute inset-0 h-full w-full ${isCritical ? "drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]" : ""}`}
                viewBox="0 0 100 50"
              >
                <path
                  d="M 10 50 A 40 40 0 0 1 90 50"
                  fill="none"
                  stroke="#f1f5f9"
                  strokeWidth="12"
                  strokeLinecap="round"
                />
                <path
                  d="M 10 50 A 40 40 0 0 1 90 50"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="12"
                  strokeLinecap="round"
                  className={`${diskColorClass} transition-all duration-1000 ease-out`}
                  strokeDasharray="125.66"
                  strokeDashoffset={
                    125.66 * (1 - diskPercent / 100)
                  }
                />
              </svg>
              <div className="z-10 pb-0 text-center">
                <span
                  className={`text-3xl font-black tracking-tighter ${isCritical ? "text-red-600" : "text-gray-900"}`}
                >
                  {diskPercent}%
                </span>
              </div>
            </div>
            <div className="mt-4 text-center">
              <p className="text-[9px] font-black tracking-[0.2em] text-gray-400 uppercase">
                Repository Volume
              </p>
              <p className="mt-0.5 text-xs font-black text-gray-700">
                {systemHealth.disk.total - systemHealth.disk.free}GB /{" "}
                {systemHealth.disk.total}GB
              </p>
            </div>
          </div>

          {/* Critical Resource Bars */}
          <div className="space-y-5 px-1">
            {/* Memory Usage */}
            <div className="space-y-2">
              <div className="flex justify-between text-[9px] font-black tracking-widest text-gray-500 uppercase">
                <div className="flex items-center gap-2">
                  <i className="ph-bold ph-memory text-base text-blue-500"></i>
                  <span className="text-gray-800">RAM</span>
                </div>
                <span className="text-gray-900">{systemHealth.memory?.percent || 0}%</span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-gray-100 shadow-inner">
                <div
                  className="h-full rounded-full bg-linear-to-r from-blue-400 to-indigo-600 transition-all duration-1000"
                  style={{ width: `${systemHealth.memory?.percent || 0}%` }}
                />
              </div>
            </div>

            {/* Computation */}
            <div className="space-y-2">
              <div className="flex justify-between text-[9px] font-black tracking-widest text-gray-500 uppercase">
                <div className="flex items-center gap-2">
                  <i className="ph-bold ph-cpu text-base text-amber-500"></i>
                  <span className="text-gray-800">CPU</span>
                </div>
                <span className="text-gray-900">{systemHealth.cpu}%</span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-gray-100 shadow-inner">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-1000",
                    systemHealth.cpu > 80 ? "bg-linear-to-r from-red-500 to-red-700" : "bg-linear-to-r from-amber-400 to-orange-500"
                  )}
                  style={{ width: `${systemHealth.cpu}%` }}
                />
              </div>
            </div>

            {/* Database & Integrity */}
            <div className="space-y-2">
              <div className="flex justify-between text-[9px] font-black tracking-widest text-gray-500 uppercase">
                <div className="flex items-center gap-2">
                  <i className="ph-bold ph-shield-check text-base text-emerald-500"></i>
                  <span className="text-gray-800">INTEGRITY</span>
                </div>
                <span className="text-emerald-600">{systemHealth.integrityScore}%</span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-gray-100 shadow-inner">
                <div
                  className="h-full rounded-full bg-linear-to-r from-emerald-400 to-green-600 transition-all duration-1000"
                  style={{ width: `${systemHealth.integrityScore}%` }}
                />
              </div>
            </div>
          </div>

          {/* Concise Node Records */}
          <div className="pt-4 border-t border-gray-100 space-y-2">
            <div className="grid grid-cols-1 gap-1.5">
              <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-gray-50/50 border border-gray-100">
                <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Last Sync</span>
                <span className="text-[10px] font-black text-gray-800 uppercase">{lastBackupTime}</span>
              </div>
              <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-gray-50/50 border border-gray-100">
                <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Restore Node</span>
                <span className={`text-[10px] font-black uppercase ${systemHealth.lastRestorationAt ? "text-gray-800" : "text-gray-400"}`}>
                  {systemHealth.lastRestorationAt
                    ? formatPHDateTime(systemHealth.lastRestorationAt).split(',')[0]
                    : "NONE"}
                </span>
              </div>
              <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-gray-50/50 border border-gray-100">
                <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Protocol</span>
                <span className="text-[9px] font-black text-emerald-600 uppercase">AES-256-GCM</span>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}
