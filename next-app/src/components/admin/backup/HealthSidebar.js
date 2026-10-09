"use client"

import HugeIcon from "@/components/shared/HugeIcon";
import {
  Card,
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import PageHeader from "@/components/shared/PageHeader"
import { Button } from "@/components/ui/button"
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
  } catch {
    return val
  }
}

function formatBytes(bytes) {
  if (!bytes || bytes <= 0) return "0 B"
  const units = ["B", "KB", "MB", "GB", "TB"]
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`
}

export default function HealthSidebar({
  systemHealth,
  lastBackupTime,
  isLoading = false,
  isManualLoading = false,
  scopeInfo = null,
  externalDrive = null,
  onRescanDrive = null,
  onToggleSimulation = null,
  isRescanning = false,
  onToggleCollapse = null,
}) {
  if (isLoading && !isManualLoading) {
    return (
      <div className="w-[350px] shrink-0 flex flex-col gap-4">
        <Card className="flex flex-col border border-border bg-white shadow-sm h-full rounded-2xl overflow-hidden p-6 space-y-6 dark:border-border dark:bg-card dark:shadow-none">
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

  const extTotalBytes = Number(externalDrive?.totalBytes) || 0
  const extFreeBytes = Number(externalDrive?.freeBytes) || 0
  const extUsedBytes = Math.max(0, extTotalBytes - extFreeBytes)
  const extUsedPercent = extTotalBytes > 0 ? Math.min(100, Math.max(0, Math.round((extUsedBytes / extTotalBytes) * 100))) : 0
  const extTotalText = externalDrive?.totalFormatted || (extTotalBytes > 0 ? formatBytes(extTotalBytes) : null)
  const extFreeText = externalDrive?.freeFormatted || (extFreeBytes > 0 ? formatBytes(extFreeBytes) : null)
  const extUsedText = extTotalBytes > 0 ? formatBytes(extUsedBytes) : null

  return (
    <div className="w-[350px] shrink-0 flex flex-col gap-4 h-fit">
      <Card className="flex flex-col p-0 gap-0 border border-border bg-white shadow-sm rounded-2xl overflow-hidden dark:border-border dark:bg-card dark:shadow-none isolate">
        {/* Page Header */}
        <PageHeader
          icon="ph-chart-pie-slice"
          title="System Status"
          description="Storage, memory, and system resources."
          showBorder={false}
          className="p-6"
          titleClassName="text-[18px] font-semibold tracking-[-0.01em] text-gray-900 dark:text-zinc-50"
          descriptionClassName="text-[13px] font-normal text-gray-900 dark:text-zinc-300 mt-[4px]"
          actions={
            onToggleCollapse && (
              <Button
                type="button"
                variant="outline"
                onClick={onToggleCollapse}
                title="Collapse Status"
                className="h-8 px-3 text-xs font-semibold rounded-xl border border-border dark:border-border bg-white dark:bg-zinc-800 text-gray-600 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-2xs active:scale-95 transition-all cursor-pointer"
              >
                Hide
              </Button>
            )
          }
        />

        <div className="border-t border-border dark:border-border p-6 space-y-6">
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

          {/* External Storage Status Tile */}
          <div
            className={cn(
              "rounded-xl border p-3.5 transition-all duration-200",
              externalDrive?.connected
                ? "bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200/60 dark:border-emerald-900/40"
                : "bg-amber-50/50 dark:bg-amber-950/20 border-amber-200/60 dark:border-amber-900/40"
            )}
          >
            <div className="flex items-start gap-3">
              <div className="min-w-0 flex-1">
                <span className="text-xs font-semibold text-gray-900 dark:text-zinc-100 block leading-tight">
                  {externalDrive?.connected ? "External Hard Drive Connected" : "External Storage Disconnected"}
                </span>
                <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold",
                      externalDrive?.connected
                        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                        : "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                    )}
                  >
                    {externalDrive?.connected ? "Ready to Copy" : "Waiting for Drive"}
                  </span>
                  {externalDrive?.isEmulated && (
                    <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300">
                      Demo Mode
                    </span>
                  )}
                </div>
              </div>
            </div>

            {externalDrive?.connected ? (
              <div className="mt-3 flex flex-col gap-2">
                {/* Storage Metrics Summary */}
                <div className="flex items-center justify-between text-[11px] leading-tight">
                  <div className="flex items-center gap-1.5 font-medium text-gray-900 dark:text-zinc-100">
                    <span className="font-semibold">{extTotalText || "External Drive"}</span>
                    {externalDrive.fsType && (
                      <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 bg-emerald-100/70 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 rounded font-semibold">
                        {externalDrive.fsType}
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-gray-500 dark:text-zinc-400">
                    <span>Free {extFreeText || "--"}</span>
                    {extUsedText && (
                      <span> · <span className="font-medium text-gray-700 dark:text-zinc-200">Used {extUsedText} ({extUsedPercent}%)</span></span>
                    )}
                  </div>
                </div>

                {/* Horizontal capacity progress bar */}
                {extTotalBytes > 0 && (
                  <div className="w-full h-2 rounded-full bg-emerald-200/60 dark:bg-emerald-950/80 overflow-hidden flex">
                    <div
                      className="h-full bg-emerald-600 dark:bg-emerald-400 rounded-full transition-all duration-300"
                      style={{ width: `${extUsedPercent}%` }}
                    />
                  </div>
                )}

                {/* Drive volume name & mount path */}
                <div className="flex items-center justify-between text-[10px] text-gray-500 dark:text-zinc-400 pt-0.5">
                  <span className="truncate max-w-[170px] font-medium" title={externalDrive.label || "External Storage"}>
                    {externalDrive.label || "External Storage"}
                  </span>
                  <span className="truncate max-w-[130px] font-mono text-[10px]" title={externalDrive.path || "Mounted"}>
                    {externalDrive.path || "Mounted"}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-[11px] text-gray-900 dark:text-zinc-300 mt-2 leading-relaxed">
                Connect an external USB drive to copy backups for safekeeping.
              </p>
            )}

            {(onRescanDrive || onToggleSimulation) && (
              <div className="flex items-center gap-2 mt-3 pt-2.5 border-t border-black/5 dark:border-border">
                {onRescanDrive && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isRescanning}
                    onClick={onRescanDrive}
                    className="h-7 px-2.5 text-[11px] font-semibold rounded-lg border border-border dark:border-border bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-2xs cursor-pointer active:scale-95 transition-all inline-flex items-center gap-1.5 flex-1 justify-center"
                    title="Rescan USB ports and mount points"
                  >
                    {isRescanning && <HugeIcon className="ph-bold ph-arrows-clockwise text-xs animate-spin" />}
                    <span>{isRescanning ? "Scanning..." : "Detect"}</span>
                  </Button>
                )}

                {onToggleSimulation && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={onToggleSimulation}
                    className={cn(
                      "h-7 px-2.5 text-[11px] font-semibold rounded-lg border shadow-2xs cursor-pointer active:scale-95 transition-all inline-flex items-center gap-1.5 flex-1 justify-center",
                      externalDrive?.isEmulated
                        ? "border-blue-300 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 hover:bg-blue-100"
                        : "border-border dark:border-border bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700"
                    )}
                    title={externalDrive?.isEmulated ? "Disable simulated demo drive" : "Simulate an external storage drive for demonstration"}
                  >
                    <span>{externalDrive?.isEmulated ? "Exit" : "Simulate"}</span>
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Unified iCloud-style list of resources and info */}
          <div className="flex flex-col border-t border-black/5 dark:border-border pt-1">
            {/* RAM Row */}
            <div className="flex items-center justify-between h-[44px] border-b border-black/5 dark:border-border">
              <div className="flex items-center gap-3">
                <span className="text-[13px] font-medium text-[#111111] dark:text-zinc-50">RAM</span>
                <span className="text-[13px] font-normal text-[#8E8E93]">{ramPercent}% usage</span>
              </div>
              <div className="flex items-center">
                <span className="text-[13px] font-normal text-[#111111] dark:text-zinc-50">{ramPercent}%</span>
              </div>
            </div>

            {/* CPU Row */}
            <div className="flex items-center justify-between h-[44px] border-b border-black/5 dark:border-border">
              <div className="flex items-center gap-3">
                <span className="text-[13px] font-medium text-[#111111] dark:text-zinc-50">CPU</span>
                <span className="text-[13px] font-normal text-[#8E8E93]">{cpuPercent}% usage</span>
              </div>
              <div className="flex items-center">
                <span className="text-[13px] font-normal text-[#111111] dark:text-zinc-50">{cpuPercent}%</span>
              </div>
            </div>

            {/* Data Protection Row */}
            <div className="flex items-center justify-between h-[44px] border-b border-black/5 dark:border-border">
              <div className="flex items-center gap-3">
                <span className="text-[13px] font-medium text-[#111111] dark:text-zinc-50">Data Protection</span>
                <span className="text-[13px] font-normal text-[#8E8E93]">Protected</span>
              </div>
              <div className="flex items-center">
                <span className="text-[13px] font-normal text-[#111111] dark:text-zinc-50">Active</span>
              </div>
            </div>

            {/* Last Synced Row */}
            <div className="flex items-center justify-between h-[44px] border-b border-black/5 dark:border-border">
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
          <div className="border-t border-border dark:border-border p-5 bg-gray-50/50 dark:bg-zinc-900/40">
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
