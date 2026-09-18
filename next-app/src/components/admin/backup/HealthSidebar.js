"use client"

import HugeIcon from "@/components/shared/HugeIcon";
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
  scopeInfo = null,
  externalDrive = null,
}) {
  if (isLoading && !isManualLoading) {
    return (
      <div className="w-[350px] shrink-0 flex flex-col gap-4">
        <Card className="flex flex-col border border-gray-200 bg-white shadow-sm h-full rounded-2xl overflow-hidden p-6 space-y-6 dark:border-white/10 dark:bg-card dark:shadow-none">
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

  const diskTotal = systemHealth?.disk?.total || 447
  const diskFree = systemHealth?.disk?.free || 194
  const diskUsed = diskTotal - diskFree
  const ramPercent = systemHealth?.memory?.percent || 0
  const cpuPercent = systemHealth?.cpu || 0

  return (
    <div className="w-[350px] shrink-0 flex flex-col gap-4 h-fit">
      <Card className="flex flex-col border border-gray-200 bg-white shadow-sm rounded-2xl overflow-hidden dark:border-white/10 dark:bg-card dark:shadow-none">
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
          {/* Storage Section */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              {/* Total capacity badge */}
              <div className="bg-[#1D1D1F] dark:bg-zinc-800 px-3 py-1.5 rounded-xl text-[14px] font-bold text-white shrink-0">
                {diskTotal} GB
              </div>
              <div className="text-[13px] font-normal text-[#8E8E93] leading-none">
                <span>Free {diskFree} GB · </span>
                <span className="font-medium text-[#111111] dark:text-zinc-100">Used {diskUsed} GB</span>
              </div>
            </div>

            {/* Horizontal progress bar */}
            <div className="w-full h-3 rounded-full bg-[#F2F2F7] dark:bg-zinc-800 overflow-hidden flex">
              <div 
                className="rms-style-width bg-[#5856D6] h-full"
                data-width={`${(diskUsed / diskTotal) * 100}%`}
                style={{ width: `${(diskUsed / diskTotal) * 100}%` }}
              />
            </div>
          </div>

          {/* Unified iCloud-style list of resources and info */}
          <div className="flex flex-col border-t border-black/5 dark:border-white/5 pt-1">
            {/* RAM Row */}
            <div className="flex items-center justify-between h-[44px] border-b border-black/5 dark:border-white/5">
              <div className="flex items-center gap-3">
                
                <span className="text-[13px] font-medium text-[#111111] dark:text-zinc-50">RAM</span>
                <span className="text-[13px] font-normal text-[#8E8E93]">{ramPercent}% usage</span>
              </div>
              <div className="flex items-center">
                <span className="text-[13px] font-normal text-[#111111] dark:text-zinc-50">{ramPercent}%</span>
              </div>
            </div>

            {/* CPU Row */}
            <div className="flex items-center justify-between h-[44px] border-b border-black/5 dark:border-white/5">
              <div className="flex items-center gap-3">
                
                <span className="text-[13px] font-medium text-[#111111] dark:text-zinc-50">CPU</span>
                <span className="text-[13px] font-normal text-[#8E8E93]">{cpuPercent}% usage</span>
              </div>
              <div className="flex items-center">
                <span className="text-[13px] font-normal text-[#111111] dark:text-zinc-50">{cpuPercent}%</span>
              </div>
            </div>

            {/* Data Protection Row */}
            <div className="flex items-center justify-between h-[44px] border-b border-black/5 dark:border-white/5">
              <div className="flex items-center gap-3">
                
                <span className="text-[13px] font-medium text-[#111111] dark:text-zinc-50">Data Protection</span>
                <span className="text-[13px] font-normal text-[#8E8E93]">Protected</span>
              </div>
              <div className="flex items-center">
                <span className="text-[13px] font-normal text-[#111111] dark:text-zinc-50">Active</span>
                
              </div>
            </div>

            {/* External Volume Row */}
            {externalDrive && (
              <div className="flex items-center justify-between h-[44px] border-b border-black/5 dark:border-white/5">
                <div className="flex items-center gap-3">
                  
                  <div className="flex flex-col">
                    <span className="text-[13px] font-medium text-[#111111] dark:text-zinc-50">External Drive</span>
                    <span className="text-[11px] font-normal text-[#8E8E93] truncate max-w-[130px]" title={externalDrive.label || "External Storage"}>
                      {externalDrive.label || "Not Connected"}
                    </span>
                  </div>
                </div>
                <div className="flex items-center">
                  <span className="text-[12px] font-medium text-[#111111] dark:text-zinc-50">
                    {externalDrive.connected ? "Connected" : "Disconnected"}
                  </span>
                </div>
              </div>
            )}

            {/* Last Synced Row */}
            <div className="flex items-center justify-between h-[44px] border-b border-black/5 dark:border-white/5">
              <span className="text-[13px] font-normal text-[#8E8E93]">Last Synced</span>
              <span className="text-[13px] font-normal text-[#111111] dark:text-zinc-150">
                {formatLastSync(lastBackupTime)}
              </span>
            </div>

            {/* Last Restored Row */}
            <div className="flex items-center justify-between h-[44px]">
              <span className="text-[13px] font-normal text-[#8E8E93]">Last Restored</span>
              <span className="text-[13px] font-normal text-[#111111] dark:text-zinc-150">
                {systemHealth?.lastRestorationAt ? formatLastSync(systemHealth.lastRestorationAt) : "Never"}
              </span>
            </div>
          </div>
        </div>

        {scopeInfo && (
          <div className="border-t border-gray-100 dark:border-white/10 p-5 bg-gray-50/50 dark:bg-zinc-900/40">
            <div className="flex items-center gap-2 mb-2.5">
              <HugeIcon  className="ph-fill ph-shield-check text-[15px] text-indigo-600 dark:text-indigo-400" />
              <span className="text-[12px] font-semibold text-gray-900 dark:text-zinc-100">
                {scopeInfo.title || "Platform Governance Scope"}
              </span>
            </div>
            {Array.isArray(scopeInfo.items) ? (
              <div className="flex flex-wrap gap-1.5">
                {scopeInfo.items.map((item, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center rounded-lg bg-indigo-50/80 px-2 py-1 text-[11px] font-medium text-indigo-700 border border-indigo-200/50 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-900/40"
                  >
                    {item}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-[12px] font-normal leading-relaxed text-[#8E8E93] dark:text-zinc-400">
                {scopeInfo.description}
              </p>
            )}
          </div>
        )}
      </Card>
    </div>
  )
}
