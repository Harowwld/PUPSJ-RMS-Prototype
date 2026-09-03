"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import ConfirmModal from "@/components/shared/ConfirmModal"
import PageHeader from "@/components/shared/PageHeader"
import { cn } from "@/lib/utils"

export default function SystemHealthTab({ showToast }) {
  const [health, setHealth] = useState(null)
  const [loading, setLoading] = useState(true)
  const [resetOpen, setResetOpen] = useState(false)
  const [resetLoading, setResetLoading] = useState(false)
  const [seedLoading, setSeedLoading] = useState(false)

  const fetchHealth = useCallback(async () => {
    try {
      const res = await fetch("/api/system/health")
      const json = await res.json()
      if (res.ok && json.ok) {
        setHealth(json.data)
      }
    } catch {
      // silent fail on polling
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchHealth()
    const timer = setInterval(fetchHealth, 5000)
    return () => clearInterval(timer)
  }, [fetchHealth])

  const handleSeedData = async () => {
    setSeedLoading(true)
    try {
      const res = await fetch("/api/system/seed-mock-data?force=true&bypass=pup-secret-fallback")
      const json = await res.json()
      if (res.ok && json.ok) {
        showToast("Mock datasets populated successfully across Registrar and OSAS office partitions.")
        fetchHealth()
      } else {
        showToast(json.error || "Failed to seed mock datasets", true)
      }
    } catch (err) {
      showToast("Network error seeding datasets", true)
    } finally {
      setSeedLoading(false)
    }
  }

  const handleResetDb = async () => {
    setResetLoading(true)
    try {
      const res = await fetch("/api/system/reset-db")
      const json = await res.json()
      if (res.ok && json.ok) {
        showToast("Database wipe and re-bootstrap complete. Reloading in 3s...")
        setResetOpen(false)
        setTimeout(() => {
          window.location.href = "/"
        }, 3000)
      } else {
        showToast(json.error || "Failed to wipe databases", true)
      }
    } catch (err) {
      showToast("Network error resetting database", true)
    } finally {
      setResetLoading(false)
    }
  }

  if (loading && !health) {
    return (
      <div className="flex flex-col gap-6 w-full animate-fade-up font-inter">
        <Skeleton className="h-10 w-48 rounded-md" />
        <Skeleton className="h-4 w-96 rounded-md" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <Skeleton className="h-28 rounded-2xl" />
          <Skeleton className="h-28 rounded-2xl" />
          <Skeleton className="h-28 rounded-2xl" />
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 w-full animate-fade-up font-inter">
      <PageHeader
        title="System Health & Maintenance"
        description="Monitor real-time host resource metrics, database sizes, and perform administrative overrides."
        showBorder={false}
        titleClassName="text-[18px] font-semibold tracking-[-0.01em] text-gray-900 dark:text-zinc-50"
        descriptionClassName="text-[13px] font-normal text-gray-500 dark:text-zinc-400 mt-[4px]"
      />

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {/* CPU */}
        <Card className="overflow-hidden border border-gray-200/60 dark:border-white/5 bg-white/60 dark:bg-zinc-900/40 relative shadow-2xs backdrop-blur-xs">
          <CardContent className="p-5 flex flex-col justify-between h-full min-h-[110px]">
            <div className="flex justify-between items-start">
              <span className="text-[11px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-wider">
                Processor Usage
              </span>
              <i className="ti ti-cpu text-lg text-gray-400 dark:text-zinc-500"></i>
            </div>
            
            <div className="mt-4">
              <div className="flex items-baseline justify-between mb-1">
                <span className="text-2xl font-black text-gray-900 dark:text-zinc-50">
                  {health?.cpu ?? 0}%
                </span>
                <span className="text-[10px] font-semibold text-gray-500">Host CPU</span>
              </div>
              <div className="w-full h-1.5 bg-gray-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                <div 
                  className={cn(
                    "h-full rounded-full transition-all duration-500",
                    (health?.cpu || 0) > 80 ? "bg-red-500" : (health?.cpu || 0) > 50 ? "bg-amber-500" : "bg-emerald-500"
                  )}
                  style={{ width: `${health?.cpu ?? 0}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Memory */}
        <Card className="overflow-hidden border border-gray-200/60 dark:border-white/5 bg-white/60 dark:bg-zinc-900/40 relative shadow-2xs backdrop-blur-xs">
          <CardContent className="p-5 flex flex-col justify-between h-full min-h-[110px]">
            <div className="flex justify-between items-start">
              <span className="text-[11px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-wider">
                System Memory
              </span>
              <i className="ti ti-device-sd-card text-lg text-gray-400 dark:text-zinc-500"></i>
            </div>
            
            <div className="mt-4">
              <div className="flex items-baseline justify-between mb-1">
                <span className="text-2xl font-black text-gray-900 dark:text-zinc-50">
                  {health?.memory?.percent ?? 0}%
                </span>
                <span className="text-[10px] font-semibold text-gray-500">
                  {health?.memory?.used ?? 0}GB / {health?.memory?.total ?? 0}GB used
                </span>
              </div>
              <div className="w-full h-1.5 bg-gray-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                <div 
                  className={cn(
                    "h-full rounded-full transition-all duration-500",
                    (health?.memory?.percent || 0) > 85 ? "bg-red-500" : (health?.memory?.percent || 0) > 60 ? "bg-amber-500" : "bg-emerald-500"
                  )}
                  style={{ width: `${health?.memory?.percent ?? 0}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Disk Space */}
        <Card className="overflow-hidden border border-gray-200/60 dark:border-white/5 bg-white/60 dark:bg-zinc-900/40 relative shadow-2xs backdrop-blur-xs">
          <CardContent className="p-5 flex flex-col justify-between h-full min-h-[110px]">
            <div className="flex justify-between items-start">
              <span className="text-[11px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-wider">
                Disk Storage
              </span>
              <i className="ti ti-database text-lg text-gray-400 dark:text-zinc-500"></i>
            </div>
            
            <div className="mt-4">
              <div className="flex items-baseline justify-between mb-1">
                <span className="text-2xl font-black text-gray-900 dark:text-zinc-50">
                  {health?.disk?.percent ?? 0}%
                </span>
                <span className="text-[10px] font-semibold text-gray-500">
                  {health?.disk?.free ?? 0}GB free of {health?.disk?.total ?? 0}GB
                </span>
              </div>
              <div className="w-full h-1.5 bg-gray-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                <div 
                  className={cn(
                    "h-full rounded-full transition-all duration-500",
                    (health?.disk?.percent || 0) > 90 ? "bg-red-500" : (health?.disk?.percent || 0) > 75 ? "bg-amber-500" : "bg-emerald-500"
                  )}
                  style={{ width: `${health?.disk?.percent ?? 0}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* System Details & Administrative panel */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-2">
        {/* Status details */}
        <Card className="border border-gray-200/60 dark:border-white/5 bg-white/60 dark:bg-zinc-900/40 shadow-2xs backdrop-blur-xs">
          <CardContent className="p-6">
            <h3 className="font-bold text-sm text-gray-900 dark:text-zinc-50 mb-4 flex items-center gap-2">
              <i className="ti ti-info-circle text-base text-gray-500"></i>
              System Environment Info
            </h3>
            
            <div className="divide-y divide-gray-100 dark:divide-white/5 text-xs">
              <div className="py-2.5 flex justify-between">
                <span className="text-gray-500">Database Engine</span>
                <span className="font-semibold">PostgreSQL (local Docker)</span>
              </div>
              <div className="py-2.5 flex justify-between">
                <span className="text-gray-500">Database Size (Legacy File)</span>
                <span className="font-semibold">{health?.dbSize || "—"}</span>
              </div>
              <div className="py-2.5 flex justify-between">
                <span className="text-gray-500">Connection Pool Health</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-wider text-[10px]">
                  {health?.dbStatus || "Healthy"}
                </span>
              </div>
              <div className="py-2.5 flex justify-between">
                <span className="text-gray-500">Last System Restoration</span>
                <span className="text-[11px]">
                  {health?.lastRestorationAt || "Never restored"}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Maintenance Actions */}
        <Card className="border border-gray-200/60 dark:border-white/5 bg-white/60 dark:bg-zinc-900/40 shadow-2xs backdrop-blur-xs">
          <CardContent className="p-6">
            <h3 className="font-bold text-sm text-gray-900 dark:text-zinc-50 mb-4 flex items-center gap-2">
              <i className="ti ti-tools text-base text-gray-500"></i>
              Maintenance & Administration
            </h3>

            <p className="text-xs text-gray-500 dark:text-zinc-400 mb-6 leading-relaxed">
              These commands allow destructive schema overrides, database wipes, or development seeding. Use caution in production environments.
            </p>

            <div className="flex flex-col gap-3">
              {/* Seed Mock Data */}
              <div className="flex items-center justify-between p-3 rounded-xl border border-gray-200/50 bg-white/50 dark:border-white/5 dark:bg-zinc-950/20">
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs font-bold text-gray-900 dark:text-zinc-200">Seed Mock Datasets</span>
                  <span className="text-[10px] text-gray-500">Adds dummy students and documents to partitions.</span>
                </div>
                <Button 
                  onClick={handleSeedData}
                  disabled={seedLoading}
                  className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl h-9 px-4 cursor-pointer dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-900 shadow-xs active:scale-95 transition-all"
                >
                  {seedLoading ? "Seeding..." : "Seed"}
                </Button>
              </div>

              {/* Reset database */}
              <div className="flex items-center justify-between p-3 rounded-xl border border-red-200/40 bg-red-50/10 dark:border-red-950/20 dark:bg-red-950/5">
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs font-bold text-red-700 dark:text-red-400">Wipe & Reset Database</span>
                  <span className="text-[10px] text-gray-500">Destroys all schemas and reseeds default SuperAdmin.</span>
                </div>
                <Button 
                  onClick={() => setResetOpen(true)}
                  className="bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-xl h-9 px-4 cursor-pointer shadow-xs active:scale-95 transition-all"
                >
                  Reset DB
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <ConfirmModal
        open={resetOpen}
        title="Wipe & Reset System Databases"
        message="This operation will permanently delete ALL office databases, schemas, documents, and audit logs. The system will be bootstrapped back to a clean state. This action is irreversible."
        confirmLabel="Wipe Databases"
        variant="danger"
        onConfirm={handleResetDb}
        onCancel={() => setResetOpen(false)}
        isLoading={resetLoading}
      />
    </div>
  )
}
