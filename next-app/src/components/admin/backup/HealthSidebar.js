"use client"

import {
  Card,
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

function formatLastSync(val) {
  if (!val || val === "Never") return "Never"
  try {
    const d = new Date(val.replace(' at ', ' '))
    if (isNaN(d.getTime())) {
      const parsed = new Date(val)
      if (!isNaN(parsed.getTime())) {
        return parsed.toLocaleString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
          hour: "numeric",
          minute: "2-digit",
          hour12: true
        })
      }
      return val
    }
    return d.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true
    })
  } catch (e) {
    return val
  }
}

const getGaugeColor = (percent) => {
  if (percent <= 40) return "#30D158"
  if (percent <= 60) return "#FF9F0A"
  if (percent <= 80) return "#FF6B00"
  return "#E5484D"
}

const getUsageColor = (percent) => {
  if (percent <= 50) return "#30D158"
  if (percent <= 80) return "#FF9F0A"
  return "#E5484D"
}

export default function HealthSidebar({
  systemHealth,
  lastBackupTime,
  isLoading = false,
  isManualLoading = false,
}) {
  if (isLoading && !isManualLoading) {
    return (
      <div className="w-[350px] shrink-0 flex flex-col gap-4">
        <Card className="flex flex-col border border-gray-200 bg-white shadow-sm h-full rounded-brand overflow-hidden p-6 space-y-6 dark:border-white/10 dark:bg-card dark:shadow-none">
           <Skeleton className="h-12 w-full rounded-xl dark:bg-muted" />
           <Skeleton className="h-[180px] w-full rounded-2xl dark:bg-muted" />
           <div className="space-y-4">
              <Skeleton className="h-10 w-full rounded-full dark:bg-muted" />
              <Skeleton className="h-10 w-full rounded-full dark:bg-muted" />
              <Skeleton className="h-10 w-full rounded-full dark:bg-muted" />
           </div>
        </Card>
      </div>
    )
  }

  const diskPercent = systemHealth?.disk?.percent || 0
  const ramPercent = systemHealth?.memory?.percent || 0
  const cpuPercent = systemHealth?.cpu || 0

  const currentGaugeColor = getGaugeColor(diskPercent)
  const currentRamColor = getUsageColor(ramPercent)
  const currentCpuColor = getUsageColor(cpuPercent)

  return (
    <div className="w-[350px] shrink-0 flex flex-col gap-4 h-fit">
      <Card className="flex flex-col border border-gray-200 bg-white shadow-sm rounded-brand overflow-hidden dark:border-white/10 dark:bg-card dark:shadow-none">
        {/* Page Header */}
        <div className="border-b border-gray-100 bg-transparent p-6 dark:border-white/10 dark:bg-transparent">
          <div className="flex flex-col">
            <h3 className="text-[15px] font-semibold tracking-[-0.01em] text-[#111111] dark:text-zinc-50 mb-[4px]">
              System Status
            </h3>
            <p className="text-[13px] font-normal text-[#8E8E93] m-0">
              Storage, memory, and system resources.
            </p>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Main Gauge: Storage */}
          <div className="flex flex-col items-center py-2 bg-transparent border-0 shadow-none">
            <div
              className="relative mx-auto flex aspect-[2/1] w-full max-w-[120px] items-end justify-center overflow-hidden transition-all duration-500"
            >
              <svg
                className="absolute inset-0 h-full w-full"
                viewBox="0 0 100 50"
              >
                {/* Background base path */}
                <path
                  d="M 15 42 A 35 35 0 0 1 85 42"
                  fill="none"
                  stroke="#F2F2F7"
                  strokeWidth="8"
                  strokeLinecap="round"
                  className="dark:stroke-zinc-800"
                />
                {/* Main Progress Ring */}
                <path
                  d="M 15 42 A 35 35 0 0 1 85 42"
                  fill="none"
                  stroke={currentGaugeColor}
                  strokeWidth="8"
                  strokeLinecap="round"
                  style={{ transition: "stroke 300ms ease, stroke-dashoffset 1000ms ease-out" }}
                  strokeDasharray="109.96"
                  strokeDashoffset={
                    109.96 * (1 - diskPercent / 100)
                  }
                />
              </svg>
              <div className="z-10 pb-1 text-center">
                <span
                  className="text-[20px] font-semibold transition-colors duration-300"
                  style={{ color: currentGaugeColor }}
                >
                  {diskPercent}%
                </span>
              </div>
            </div>
            {/* Texts below gauge */}
            <div className="mt-[8px] flex flex-col items-center text-center">
              <p className="text-[11px] font-medium tracking-[0.04em] uppercase text-[#8E8E93]">
                Storage Used
              </p>
              <p className="mt-1 text-[13px] font-normal text-[#111111] dark:text-zinc-50">
                {systemHealth?.disk?.total && systemHealth?.disk?.free
                  ? `${systemHealth.disk.total - systemHealth.disk.free}GB / ${systemHealth.disk.total}GB`
                  : "0GB / 0GB"}
              </p>
            </div>
          </div>

          {/* Critical Resource Bars */}
          <div className="flex flex-col gap-[20px] px-1">
            {/* Memory Usage (RAM) */}
            <div className="flex flex-col gap-[6px]">
              <div className="flex justify-between items-center text-[12px] font-medium text-[#8E8E93]">
                <div className="flex items-center gap-1.5">
                  <i className="ti ti-cpu" style={{ fontSize: '14px', color: '#C7C7CC', padding: 0, margin: 0, background: 'none', border: 'none' }}></i>
                  <span>RAM</span>
                </div>
                <span 
                  className="font-medium transition-colors duration-300"
                  style={{ color: currentRamColor }}
                >{ramPercent}%</span>
              </div>
              <div className="w-full overflow-hidden rounded-[2px] bg-[#F2F2F7] dark:bg-zinc-800" style={{ height: '4px' }}>
                <div
                  className="rounded-[2px] transition-all duration-1000"
                  style={{ 
                    height: '4px',
                    width: `${ramPercent}%`,
                    backgroundColor: currentRamColor,
                    transition: "width 1000ms ease-out, background-color 300ms ease"
                  }}
                />
              </div>
            </div>

            {/* Computation (CPU) */}
            <div className="flex flex-col gap-[6px]">
              <div className="flex justify-between items-center text-[12px] font-medium text-[#8E8E93]">
                <div className="flex items-center gap-1.5">
                  <i className="ti ti-settings" style={{ fontSize: '14px', color: '#C7C7CC', padding: 0, margin: 0, background: 'none', border: 'none' }}></i>
                  <span>CPU</span>
                </div>
                <span 
                  className="font-medium transition-colors duration-300"
                  style={{ color: currentCpuColor }}
                >{cpuPercent}%</span>
              </div>
              <div className="w-full overflow-hidden rounded-[2px] bg-[#F2F2F7] dark:bg-zinc-800" style={{ height: '4px' }}>
                <div
                  className="rounded-[2px] transition-all duration-1000"
                  style={{ 
                    height: '4px',
                    width: `${cpuPercent}%`,
                    backgroundColor: currentCpuColor,
                    transition: "width 1000ms ease-out, background-color 300ms ease"
                  }}
                />
              </div>
            </div>
          </div>

          {/* Concise Node Records */}
          <div className="pt-4 border-t border-gray-100 dark:border-white/10">
            <div className="flex flex-col">
              {/* Last Synced */}
              <div 
                className="h-[36px] flex items-center justify-between border-black/5 dark:border-white/10"
                style={{ borderBottomWidth: '0.5px', borderBottomStyle: 'solid' }}
              >
                <span className="text-[13px] font-normal text-[#8E8E93]">Last Synced</span>
                <span className="text-[13px] font-normal text-[#111111] dark:text-zinc-150">
                  {formatLastSync(lastBackupTime)}
                </span>
              </div>
              {/* Backup Node */}
              <div 
                className="h-[36px] flex items-center justify-between border-black/5 dark:border-white/10"
                style={{ borderBottomWidth: '0.5px', borderBottomStyle: 'solid' }}
              >
                <span className="text-[13px] font-normal text-[#8E8E93]">Backup Node</span>
                {systemHealth?.lastRestorationAt ? (
                  <span className="text-[13px] font-normal text-[#111111] dark:text-zinc-150">
                    {formatLastSync(systemHealth.lastRestorationAt)}
                  </span>
                ) : (
                  <span className="text-[13px] font-normal text-[#8E8E93]">
                    Not configured
                  </span>
                )}
              </div>
              {/* Encryption */}
              <div className="h-[36px] flex items-center justify-between">
                <span className="text-[13px] font-normal text-[#8E8E93]">Encryption</span>
                <div className="flex items-center">
                  <span className="inline-block w-[6px] h-[6px] rounded-full bg-[#30D158] mr-[6px]" />
                  <span className="text-[13px] font-normal text-[#111111] dark:text-zinc-150">AES-256-GCM</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}
