"use client"

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { formatPHDateTime } from "@/lib/timeFormat"

export default function HealthSidebar({
  systemHealth,
  lastBackupTime,
  isSidebarOpen,
  onSidebarChange,
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
    <Sheet open={isSidebarOpen} onOpenChange={onSidebarChange}>
      <SheetContent side="left" className="w-[350px] sm:max-w-md p-0 flex flex-col border-r border-gray-200 bg-white" showCloseButton={true}>
        <SheetHeader className="p-6 border-b border-gray-200 bg-white shadow-sm z-10 shrink-0">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full border border-red-100 bg-red-50 text-pup-maroon shadow-sm flex items-center justify-center shrink-0">
              <i className="ph-duotone ph-heartbeat text-2xl"></i>
            </div>
            <div className="min-w-0">
              <SheetTitle className="text-lg font-black tracking-tight text-gray-900 leading-tight">
                System Health Node
              </SheetTitle>
              <p className="text-sm font-medium mt-1 text-gray-600 leading-relaxed">
                Monitor storage constraints and database integrity.
              </p>
            </div>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Resource Usage Card */}
          <Card className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            <CardHeader className="border-b border-gray-100 bg-gray-50/50 p-4">
              <CardTitle className="text-[10px] font-black tracking-[0.2em] text-gray-500 uppercase flex items-center gap-2">
                <i className="ph-bold ph-chart-pie-slice text-sm text-pup-maroon"></i>
                Resource Metrics
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 p-5">
              {/* Disk usage */}
              <div className="flex flex-col items-center">
                <div
                  className={`relative mx-auto flex aspect-[2/1] w-full max-w-[160px] items-end justify-center overflow-hidden rounded-t-full transition-all duration-500 ${isCritical ? "animate-pulse shadow-[0_-4px_20px_rgba(239,68,68,0.2)]" : ""}`}
                >
                  <svg
                    className={`absolute inset-0 h-full w-full ${isCritical ? "drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]" : ""}`}
                    viewBox="0 0 100 50"
                  >
                    <path
                      d="M 10 50 A 40 40 0 0 1 90 50"
                      fill="none"
                      stroke="#f3f4f6"
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
                  <div className="z-10 pb-1 text-center">
                    <span
                      className={`text-2xl font-black tracking-tighter ${isCritical ? "animate-bounce text-red-600" : "text-gray-900"}`}
                    >
                      {diskPercent}%
                    </span>
                  </div>
                </div>
                <div className="mt-3 text-center">
                  <p className="text-[10px] font-bold tracking-widest text-gray-400 uppercase">
                    Institutional Storage
                  </p>
                  <p className="mt-0.5 text-xs font-black text-gray-700">
                    {systemHealth.disk.total - systemHealth.disk.free}GB /{" "}
                    {systemHealth.disk.total}GB
                  </p>
                </div>
              </div>

              {/* DB & CPU Stats */}
              <div className="space-y-4">
                <div className="pt-2 border-t border-gray-100">
                  <div className="mb-2 flex justify-between text-[10px] font-black tracking-widest text-gray-500 uppercase">
                    <div className="flex items-center gap-2">
                      <i className={`ph-bold ph-database text-gray-400 ${systemHealth.dbStatus === "Healthy" ? "text-green-500" : ""}`}></i>
                      <span>DB Cluster ({systemHealth.dbSize})</span>
                    </div>
                    <span className={systemHealth.dbStatus === "Healthy" ? "text-green-600" : "text-amber-600"}>
                      {systemHealth.dbStatus}
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100 shadow-inner">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${systemHealth.dbStatus === "Healthy" ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]" : "bg-amber-500"}`}
                      style={{ width: systemHealth.dbStatus === "Healthy" ? "100%" : "50%" }}
                    />
                  </div>
                </div>

                <div>
                  <div className="mb-2 flex justify-between text-[10px] font-black tracking-widest text-gray-500 uppercase">
                    <div className="flex items-center gap-2">
                      <i className={`ph-bold ph-cpu text-gray-400 ${systemHealth.cpu > 50 ? "text-amber-500" : "text-blue-500"}`}></i>
                      <span>Compute Load</span>
                    </div>
                    <span className="font-black text-gray-900">{systemHealth.cpu}%</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100 shadow-inner">
                    <div
                      className={`${systemHealth.cpu > 80 ? "bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.4)]" : systemHealth.cpu > 50 ? "bg-amber-500" : "bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.3)]"} h-full rounded-full transition-all duration-1000`}
                      style={{ width: `${systemHealth.cpu}%` }}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Data Plate Card */}
          <Card className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            <CardHeader className="border-b border-gray-100 bg-gray-50/50 p-4">
              <CardTitle className="text-[10px] font-black tracking-[0.2em] text-gray-500 uppercase flex items-center gap-2">
                <i className="ph-bold ph-list-numbers text-sm text-pup-maroon"></i>
                Event Log
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-5">
              <div className="flex items-start gap-4">
                <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-gray-50 text-pup-maroon shadow-sm">
                  <i className="ph-fill ph-clock-counter-clockwise text-sm"></i>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-bold tracking-widest text-gray-400 uppercase">
                    Last Successful Sync
                  </p>
                  <p className="mt-0.5 truncate text-[11px] font-black text-gray-700 leading-tight">
                    {lastBackupTime}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-gray-50 text-amber-500 shadow-sm">
                  <i className="ph-fill ph-arrows-merge text-sm"></i>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-bold tracking-widest text-gray-400 uppercase">
                    Last Restoration
                  </p>
                  <p className={`mt-0.5 truncate text-[11px] font-black leading-tight ${systemHealth.lastRestorationAt ? "text-gray-700" : "text-gray-400 italic"}`}>
                    {systemHealth.lastRestorationAt
                      ? formatPHDateTime(systemHealth.lastRestorationAt)
                      : "No Historical Records"}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-gray-50 text-green-600 shadow-sm">
                  <i className="ph-fill ph-lock-key text-sm"></i>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-bold tracking-widest text-gray-400 uppercase">
                    Security Protocol
                  </p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    <span className="rounded bg-green-50 px-2 py-0.5 text-[9px] font-black tracking-widest text-green-700 border border-green-100">
                      AES-256-GCM
                    </span>
                    <span className="rounded bg-blue-50 px-2 py-0.5 text-[9px] font-black tracking-widest text-blue-700 border border-blue-100">
                      SHA-256
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Danger Zone Section */}
          <div className="pt-4 border-t border-gray-200 mt-auto">
            <div className="rounded-xl border border-red-200 bg-red-50/50 p-4">
               <div className="mb-3 flex items-center gap-2">
                  <div className="flex h-6 w-6 items-center justify-center rounded bg-red-100 text-red-600">
                    <i className="ph-bold ph-warning-octagon text-sm"></i>
                  </div>
                  <h4 className="text-[10px] font-black tracking-[0.2em] text-red-700 uppercase">Security Risk Area</h4>
               </div>
               <p className="text-[10px] font-medium leading-relaxed text-red-600 opacity-80">
                 System restoration will overwrite all current repository data with the selected image. This action is irreversible.
               </p>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
