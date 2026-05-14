"use client"

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { formatPHDateTime } from "@/lib/timeFormat"

export default function HealthSidebar({
  systemHealth,
  lastBackupTime,
  localLoading,
  isSidebarOpen,
  restoreFileRef,
  onRestoreFileChange,
  handleGenerateBackup,
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
    <aside
      className={`flex h-full flex-col gap-3 transition-all duration-300 ease-in-out ${
        isSidebarOpen
          ? "w-[300px] opacity-100"
          : "w-0 overflow-hidden opacity-0"
      } shrink-0`}
    >
      {/* System Health Card */}
      <Card className="flex-none overflow-hidden rounded-brand border border-gray-200 bg-white shadow-sm">
        <CardHeader className="border-b border-gray-100 bg-gray-50/50 p-3">
          <CardTitle className="flex items-center gap-2 text-xs font-bold tracking-wider text-gray-900 uppercase">
            <i className="ph-duotone ph-heartbeat text-lg text-pup-maroon"></i>
            System Health
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 p-4 pt-3">
          <div className="flex flex-col items-center">
            <div
              className={`relative mx-auto flex aspect-[2/1] w-full max-w-[140px] items-end justify-center overflow-hidden rounded-t-full transition-all duration-500 ${isCritical ? "animate-pulse shadow-[0_-4px_15px_rgba(239,68,68,0.15)]" : ""}`}
            >
              <svg
                className={`absolute inset-0 h-full w-full ${isCritical ? "drop-shadow-[0_0_5px_rgba(239,68,68,0.5)]" : ""}`}
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
                    125.66 * (1 - systemHealth.disk.percent / 100)
                  }
                />
              </svg>
              <div className="z-10 pb-0.5 text-center">
                <span
                  className={`text-lg font-black tracking-tighter ${isCritical ? "animate-bounce text-red-600" : "text-gray-900"}`}
                >
                  {systemHealth.disk.percent}%
                </span>
              </div>
            </div>
            <div className="mt-2 text-center">
              <p className="text-[9px] font-bold tracking-widest text-gray-400 uppercase">
                Disk Usage
              </p>
              <p className="mt-0.5 text-[10px] font-black text-gray-700">
                {systemHealth.disk.total - systemHealth.disk.free}GB /{" "}
                {systemHealth.disk.total}GB
              </p>
            </div>
          </div>

          <div className="border-t border-gray-100 pt-4">
            <div className="mb-1.5 flex justify-between text-[10px] font-bold tracking-wide text-gray-500 uppercase">
              <div className="flex items-center gap-1.5">
                <i
                  className={`ph-bold ph-database text-gray-400 ${systemHealth.dbStatus === "Healthy" ? "animate-pulse text-green-500" : ""}`}
                ></i>
                <span>DB ({systemHealth.dbSize})</span>
              </div>
              <span
                className={
                  systemHealth.dbStatus === "Healthy"
                    ? "font-black text-green-600"
                    : "text-amber-600"
                }
              >
                {systemHealth.dbStatus}
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100 shadow-[inset_0_1px_2px_rgba(0,0,0,0.1)]">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  systemHealth.dbStatus === "Healthy"
                    ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]"
                    : "bg-amber-500"
                }`}
                style={{
                  width: systemHealth.dbStatus === "Healthy" ? "100%" : "50%",
                }}
              />
            </div>
          </div>

          <div>
            <div className="mb-1.5 flex justify-between text-[10px] font-bold tracking-wide text-gray-500 uppercase">
              <div className="flex items-center gap-1.5">
                <i
                  className={`ph-bold ph-cpu text-gray-400 ${systemHealth.cpu < 50 ? "animate-pulse text-blue-500" : ""}`}
                ></i>
                <span>CPU Usage</span>
              </div>
              <span className="font-black text-gray-900">{systemHealth.cpu}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100 shadow-[inset_0_1px_2px_rgba(0,0,0,0.1)]">
              <div
                className={`${
                  systemHealth.cpu > 80
                    ? "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.4)]"
                    : systemHealth.cpu > 50
                      ? "bg-amber-500"
                      : "bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.4)]"
                } h-full rounded-full transition-all duration-1000`}
                style={{ width: `${systemHealth.cpu}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Operations Card */}
      <Card className="group relative flex-none overflow-hidden rounded-brand border border-gray-200 bg-white shadow-sm">
        <CardHeader className="border-b border-gray-100 bg-gray-50/50 p-2">
          <CardTitle className="flex items-center gap-2 text-xs font-bold tracking-wider text-gray-900 uppercase">
            <i className="ph-duotone ph-shield-check text-lg text-pup-maroon"></i>
            System Integrity
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-3">
          <div className="mb-4 grid grid-cols-1 gap-2">
            <Button
              onClick={handleGenerateBackup}
              disabled={localLoading.generating}
              className={`flex h-11 w-full items-center justify-center gap-2 rounded-brand bg-pup-maroon text-sm font-bold text-white shadow-sm transition-all hover:bg-red-900 active:scale-[0.98] ${isCritical ? "animate-critical-pulse ring-2 ring-red-500 ring-offset-2" : ""}`}
            >
              <i
                className={`ph-bold ${localLoading.generating ? "ph-arrows-clockwise animate-spin" : "ph-download-simple"} text-base`}
              ></i>
              {localLoading.generating
                ? localLoading.generatingStatus || "WORKING..."
                : "CREATE SNAPSHOT"}
            </Button>

            <Button
              variant="outline"
              onClick={() =>
                restoreFileRef.current && restoreFileRef.current.click()
              }
              className="flex h-10 w-full items-center justify-center gap-2 rounded-brand border-amber-300 bg-amber-50/30 px-4 text-sm font-bold text-amber-700 shadow-sm transition-colors hover:border-amber-500 hover:bg-amber-100/50 hover:text-amber-800 active:scale-95"
            >
              <i className="ph-bold ph-warning-circle text-base"></i> UPLOAD
              IMAGE
            </Button>
            <input
              ref={restoreFileRef}
              type="file"
              className="hidden"
              accept=".zip,.enc,.bak,.backup,.pupbak,application/zip,application/octet-stream"
              onChange={onRestoreFileChange}
            />
          </div>

          {/* Data Plate */}
          <div className="mt-4 overflow-hidden rounded-xl border border-gray-100 bg-gray-50/50 p-3 shadow-[inset_0_1px_2px_rgba(0,0,0,0.05)]">
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-white text-pup-maroon shadow-sm">
                  <i className="ph-fill ph-clock-counter-clockwise text-xs"></i>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[8px] font-black tracking-widest text-gray-400 uppercase">
                    Last Successful Sync
                  </p>
                  <p className="truncate text-[10px] leading-tight font-bold text-gray-700">
                    {lastBackupTime}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-400 shadow-sm">
                  <i className="ph-fill ph-arrows-merge text-xs text-amber-500"></i>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[8px] font-black tracking-widest text-gray-400 uppercase">
                    Last Restoration
                  </p>
                  <p className={`truncate text-[10px] leading-tight font-bold ${systemHealth.lastRestorationAt ? "text-gray-700" : "text-gray-500 italic"}`}>
                    {systemHealth.lastRestorationAt
                      ? formatPHDateTime(systemHealth.lastRestorationAt)
                      : "No Records"}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-white text-green-600 shadow-sm">
                  <i className="ph-fill ph-lock-key text-xs"></i>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[8px] font-black tracking-widest text-gray-400 uppercase">
                    Security Standard
                  </p>
                  <div className="mt-0.5 flex items-center gap-1.5">
                    <span className="rounded bg-green-100 px-1.5 py-0.5 text-[8px] font-black tracking-tighter text-green-700">
                      AES-256-GCM
                    </span>
                    <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[8px] font-black tracking-tighter text-blue-700">
                      SHA-256
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </aside>
  )
}
