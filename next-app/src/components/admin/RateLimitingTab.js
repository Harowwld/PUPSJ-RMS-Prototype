"use client"

import LucideIcon from "@/components/shared/LucideIcon";
import React, { useState, useEffect } from "react"
import { toast } from "sonner"
import {
  PhShield,
  PhWarning,
  PhX,
  PhChartLine,
  PhLock,
  PhUnlock,
  PhGauge,
  PhUsers,
  PhClock,
} from "@phosphor-icons/react"
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { RefreshButton } from "@/components/shared/RefreshButton"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

export default function RateLimitingTab() {
  const [data, setData] = useState({
    recentViolations: [],
    stats: { hits: [], violations: [] },
    configs: [],
  })
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("overview")
  const [suspiciousIPs, setSuspiciousIPs] = useState([])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [response] = await Promise.all([
        fetch("/api/admin/rate-limits"),
        new Promise((resolve) => setTimeout(resolve, 600)), // Animation visible
      ])
      
      if (!response.ok) throw new Error("Failed to fetch rate limiting data")

      const result = await response.json()
      if (result.ok) {
        setData(result.data)
      }
    } catch (error) {
      toast.error("Failed to load rate limiting data")
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const fetchSuspiciousIPs = async () => {
    try {
      const response = await fetch("/api/admin/security/suspicious-ips")
      if (response.ok) {
        const result = await response.json()
        if (result.ok) {
          setSuspiciousIPs(result.data)
        }
      }
    } catch (error) {
      console.error("Failed to fetch suspicious IPs:", error)
    }
  }

  const clearViolation = async (endpointType, identifier) => {
    try {
      const response = await fetch("/api/admin/rate-limits/clear", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpointType, identifier }),
      })

      if (!response.ok) throw new Error("Failed to clear violation")

      toast.success("Rate limit violation cleared")
      fetchData()
    } catch (error) {
      toast.error("Failed to clear violation")
      console.error(error)
    }
  }

  const updateConfig = async (config) => {
    try {
      const response = await fetch("/api/admin/rate-limits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      })

      if (!response.ok) throw new Error("Failed to update configuration")

      toast.success("Rate limit configuration updated")
      fetchData()
    } catch (error) {
      toast.error("Failed to update configuration")
      console.error(error)
    }
  }

  useEffect(() => {
    fetchData()
    fetchSuspiciousIPs()
  }, [])

  const formatTime = (timeString) => {
    return new Date(timeString).toLocaleString()
  }

  const getRiskLevelColor = (level) => {
    switch (level) {
      case "HIGH":
        return "text-red-600 bg-red-50 dark:bg-red-950/20"
      case "MEDIUM":
        return "text-orange-600 bg-orange-50"
      case "LOW":
        return "text-yellow-600 bg-yellow-50"
      default:
        return "text-gray-600 dark:text-zinc-300 dark:text-zinc-400 bg-gray-50 dark:bg-card"
    }
  }

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-xs dark:border-white/10 dark:bg-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-zinc-400">Total Violations (24h)</p>
              <p className="text-2xl font-semibold tracking-tight text-pup-maroon dark:text-primary mt-1">
                {data.stats.violations.reduce(
                  (sum, v) => sum + parseInt(v.violations || 0),
                  0
                )}
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-950/30 flex items-center justify-center text-pup-maroon dark:text-primary shrink-0">
              <PhShield className="h-5 w-5" />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-xs dark:border-white/10 dark:bg-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-zinc-400">API Requests (24h)</p>
              <p className="text-2xl font-semibold tracking-tight text-pup-maroon dark:text-primary mt-1">
                {data.stats.hits.reduce(
                  (sum, h) => sum + parseInt(h.hits || 0),
                  0
                )}
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-zinc-800 flex items-center justify-center text-pup-maroon dark:text-primary shrink-0">
              <PhChartLine className="h-5 w-5" />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-xs dark:border-white/10 dark:bg-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-zinc-400">Suspicious IPs</p>
              <p className="text-2xl font-semibold tracking-tight text-pup-maroon dark:text-primary mt-1">
                {suspiciousIPs.length}
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/30 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
              <PhWarning className="h-5 w-5" />
            </div>
          </div>
        </div>
      </div>

      {/* Recent Violations */}
      <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-xs dark:border-white/10 dark:bg-card">
        <div className="border-b border-gray-200 bg-gray-50/75 px-5 py-3.5 dark:border-white/10 dark:bg-white/5">
          <h3 className="text-xs font-semibold text-gray-900 dark:text-zinc-100">
            Recent Rate Limit Violations
          </h3>
        </div>
        <div className="overflow-x-auto">
          {data.recentViolations.length === 0 ? (
            <div className="p-8 text-center text-gray-500 dark:text-zinc-400">
              <PhShield className="mx-auto mb-3 h-10 w-10 text-gray-300 dark:text-zinc-600" />
              <p className="text-xs font-medium">No recent violations</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="border-b border-gray-200 bg-gray-50/50 dark:border-white/10 dark:bg-muted/40">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-zinc-300">
                    Type
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-zinc-300">
                    Identifier
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-zinc-300">
                    IP Address
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-zinc-300">
                    Violations
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-zinc-300">
                    Lockout Until
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 dark:text-zinc-300">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-white/10">
                {data.recentViolations.map((violation) => (
                  <tr key={violation.id} className="hover:bg-gray-50 dark:hover:bg-white/5 dark:bg-card">
                    <td className="px-4 py-3 text-xs font-medium text-gray-900 dark:text-zinc-100">{violation.endpoint_type}</td>
                    <td className="px-4 py-3 text-xs font-mono text-gray-600 dark:text-zinc-400">
                      {violation.identifier}
                    </td>
                    <td className="px-4 py-3 text-xs font-mono text-gray-600 dark:text-zinc-400">
                      {violation.ip_address}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-medium text-red-800 dark:bg-red-950/50 dark:text-red-300">
                        {violation.violation_count}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600 dark:text-zinc-400">
                      {violation.lockout_until
                        ? formatTime(violation.lockout_until)
                        : "None"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              type="button"
                              onClick={() =>
                                clearViolation(
                                  violation.endpoint_type,
                                  violation.identifier
                                )
                              }
                              className="w-7 h-7 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-500 hover:text-pup-maroon dark:text-zinc-400 dark:hover:text-primary transition-colors flex items-center justify-center border-0 bg-transparent cursor-pointer active:scale-95"
                              aria-label="Clear violation"
                            >
                              <PhUnlock className="h-4 w-4" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent>Clear</TooltipContent>
                        </Tooltip>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )

  const renderConfigurations = () => (
    <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-xs dark:border-white/10 dark:bg-card">
      <div className="border-b border-gray-200 bg-gray-50/75 px-5 py-3.5 dark:border-white/10 dark:bg-white/5">
        <h3 className="text-xs font-semibold text-gray-900 dark:text-zinc-100">Rate Limit Configurations</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="border-b border-gray-200 bg-gray-50/50 dark:border-white/10 dark:bg-muted/40">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-zinc-300">
                Endpoint Type
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-zinc-300">
                Window (seconds)
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-zinc-300">
                Max Requests
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 dark:text-zinc-300">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-white/10">
            {data.configs.map((config) => (
              <tr key={config.id} className="hover:bg-gray-50 dark:hover:bg-white/5 dark:bg-card">
                <td className="px-4 py-3 text-xs font-semibold text-gray-900 dark:text-zinc-100">
                  {config.endpoint_type}
                </td>
                <td className="px-4 py-3 text-xs text-gray-600 dark:text-zinc-400">{config.window_seconds}s</td>
                <td className="px-4 py-3 text-xs text-gray-600 dark:text-zinc-400">{config.max_requests} req</td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          className="w-7 h-7 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-zinc-100 transition-colors flex items-center justify-center border-0 bg-transparent cursor-pointer active:scale-95"
                          aria-label="Edit configuration"
                        >
                          <LucideIcon  className="ph-bold ph-pencil-simple text-sm" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>Edit</TooltipContent>
                    </Tooltip>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )

  const renderSuspiciousIPs = () => (
    <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-xs dark:border-white/10 dark:bg-card">
      <div className="border-b border-gray-200 bg-gray-50/75 px-5 py-3.5 dark:border-white/10 dark:bg-white/5">
        <h3 className="text-xs font-semibold text-gray-900 dark:text-zinc-100">Suspicious IP Addresses</h3>
      </div>
      <div className="overflow-x-auto">
        {suspiciousIPs.length === 0 ? (
          <div className="p-8 text-center text-gray-500 dark:text-zinc-400">
            <PhShield className="mx-auto mb-3 h-10 w-10 text-gray-300 dark:text-zinc-600" />
            <p className="text-xs font-medium">No suspicious activity detected</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="border-b border-gray-200 bg-gray-50/50 dark:border-white/10 dark:bg-muted/40">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-zinc-300">
                  IP Address
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-zinc-300">
                  Risk Level
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-zinc-300">
                  Failed Logins
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-zinc-300">
                  Unique Users
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-zinc-300">
                  Last Seen
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-white/10">
              {suspiciousIPs.map((ip, index) => (
                <tr key={index} className="hover:bg-gray-50 dark:hover:bg-white/5 dark:bg-card">
                  <td className="px-4 py-3 text-xs font-mono font-medium text-gray-900 dark:text-zinc-100">{ip.ip}</td>
                  <td className="px-4 py-3 text-xs">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${getRiskLevelColor(ip.riskLevel)}`}
                    >
                      {ip.riskLevel}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600 dark:text-zinc-400">{ip.failed_logins}</td>
                  <td className="px-4 py-3 text-xs text-gray-600 dark:text-zinc-400">{ip.unique_users}</td>
                  <td className="px-4 py-3 text-xs text-gray-600 dark:text-zinc-400">{formatTime(ip.last_seen)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )

  return (
    <TooltipProvider delayDuration={200}>
      <div className="space-y-6 animate-fade-up font-inter">
        {/* Tab Header with Title & Refresh */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-gray-900 dark:text-zinc-50">
              Rate Limiting & Security
            </h2>
            <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">
              Monitor active thresholds, API requests, and rate limit violations
            </p>
          </div>
          <div className="flex items-center gap-2">
            <RefreshButton
              onRefresh={() => {
                fetchData()
                fetchSuspiciousIPs()
              }}
              isLoading={loading}
              title="Refresh Security Data"
            />
          </div>
        </div>

        {/* Apple Segmented Controls */}
        <div className="flex items-center gap-1 bg-gray-100/80 dark:bg-zinc-800/60 p-1 rounded-xl border border-gray-200/60 dark:border-white/5 w-fit">
          {[
            { id: "overview", label: "Overview", icon: PhGauge },
            { id: "configs", label: "Configurations", icon: PhLock },
            { id: "suspicious", label: "Suspicious IPs", icon: PhWarning },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer select-none",
                activeTab === tab.id
                  ? "bg-white dark:bg-zinc-700 text-gray-900 dark:text-white shadow-xs"
                  : "text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white"
              )}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {loading ? (
          <div className="space-y-6 animate-pulse">
            {activeTab === "overview" && (
              <>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="rounded-2xl border border-gray-200 bg-white p-6 h-24 dark:border-white/10 dark:bg-card">
                      <Skeleton className="h-4 w-24 mb-2 dark:bg-muted" />
                      <Skeleton className="h-8 w-16 dark:bg-muted" />
                    </div>
                  ))}
                </div>
                <div className="rounded-2xl border border-gray-200 bg-white h-64 overflow-hidden dark:border-white/10 dark:bg-card">
                  <div className="border-b border-gray-200 bg-transparent p-4 dark:border-white/10 dark:bg-transparent">
                    <Skeleton className="h-5 w-48 dark:bg-muted" />
                  </div>
                  <div className="p-4 space-y-4">
                    {[1, 2, 3, 4].map((i) => (
                      <Skeleton key={i} className="h-10 w-full dark:bg-muted" />
                    ))}
                  </div>
                </div>
              </>
            )}
            {activeTab !== "overview" && (
              <div className="rounded-2xl border border-gray-200 bg-white h-96 overflow-hidden dark:border-white/10 dark:bg-card">
                <div className="border-b border-gray-200 bg-transparent p-4 dark:border-white/10 dark:bg-transparent">
                  <Skeleton className="h-5 w-48 dark:bg-muted" />
                </div>
                <div className="p-4 space-y-4">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Skeleton key={i} className="h-10 w-full dark:bg-muted" />
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <>
            {activeTab === "overview" && renderOverview()}
            {activeTab === "configs" && renderConfigurations()}
            {activeTab === "suspicious" && renderSuspiciousIPs()}
          </>
        )}
      </div>
    </TooltipProvider>
  )
}




