"use client"
import { Table } from "@/components/ui/table";

import { useState, useEffect } from "react"

import { toast } from "sonner"
import { formatErrorMessage } from "@/lib/errorUtils"
import {
  Shield01Icon,
  AlertCircleIcon,
  Analytics01Icon,
  LockIcon,
  SquareUnlock01Icon,
  DashboardSpeed01Icon,
  PencilEdit01Icon,
} from "hugeicons-react"
import { EmptyState } from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { RefreshButton } from "@/components/shared/RefreshButton"
import useTableScroll from "@/hooks/useTableScroll"
import TableScrollControls from "@/components/shared/TableScrollControls"
import DataViewToolbar from "@/components/shared/DataViewToolbar"
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

  const violationsScroll = useTableScroll([data.recentViolations?.length])
  const configsScroll = useTableScroll([data.configs?.length])
  const suspiciousScroll = useTableScroll([suspiciousIPs?.length])

  useEffect(() => {
    violationsScroll.resetScroll()
    configsScroll.resetScroll()
    suspiciousScroll.resetScroll()
  }, [activeTab])

  const fetchData = async (showLoading = false) => {
    try {
      if (showLoading) setLoading(true)
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
      const norm = formatErrorMessage(error, { defaultTitle: "Failed to Load Rate Limits" });
      toast.error(norm.title, { description: norm.description, action: norm.action });
      console.error(error);
    } finally {
      setLoading(false);
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

      toast.success("Rate Limit Cleared", {
        description: `Violation entry for ${identifier} has been reset.`,
      })
      fetchData()
    } catch (error) {
      const norm = formatErrorMessage(error, { defaultTitle: "Failed to Clear Violation" });
      toast.error(norm.title, { description: norm.description, action: norm.action });
      console.error(error);
    }
  }

  useEffect(() => {
    let ignore = false
    const init = async () => {
      try {
        const [res, suspRes] = await Promise.all([
          fetch("/api/admin/rate-limits"),
          fetch("/api/admin/security/suspicious-ips"),
        ])
        if (!ignore) {
          if (res.ok) {
            const result = await res.json()
            if (result.ok) setData(result.data)
          }
          if (suspRes.ok) {
            const suspResult = await suspRes.json()
            if (suspResult.ok) setSuspiciousIPs(suspResult.data)
          }
        }
      } catch (err) {
        if (!ignore) console.error(err)
      } finally {
        if (!ignore) setLoading(false)
      }
    }
    init()
    return () => {
      ignore = true
    }
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
        <div className="rounded-2xl border border-border bg-white p-6 shadow-xs dark:border-border dark:bg-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-900 dark:text-zinc-300">Total Violations (24h)</p>
              <p className="text-2xl font-semibold tracking-tight text-pup-maroon dark:text-primary mt-1">
                {data.stats.violations.reduce(
                  (sum, v) => sum + parseInt(v.violations || 0),
                  0
                )}
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-950/30 flex items-center justify-center text-pup-maroon dark:text-primary shrink-0">
              <Shield01Icon size={16} className="h-5 w-5" />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-white p-6 shadow-xs dark:border-border dark:bg-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-900 dark:text-zinc-300">API Requests (24h)</p>
              <p className="text-2xl font-semibold tracking-tight text-pup-maroon dark:text-primary mt-1">
                {data.stats.hits.reduce(
                  (sum, h) => sum + parseInt(h.hits || 0),
                  0
                )}
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-zinc-800 flex items-center justify-center text-pup-maroon dark:text-primary shrink-0">
              <Analytics01Icon size={16} className="h-5 w-5" />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-white p-6 shadow-xs dark:border-border dark:bg-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-900 dark:text-zinc-300">Suspicious IPs</p>
              <p className="text-2xl font-semibold tracking-tight text-pup-maroon dark:text-primary mt-1">
                {suspiciousIPs.length}
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/30 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
              <AlertCircleIcon size={16} className="h-5 w-5" />
            </div>
          </div>
        </div>
      </div>

      {/* Recent Violations */}
      <div className="rounded-2xl border border-border bg-white overflow-hidden shadow-xs dark:border-border dark:bg-card">
        <DataViewToolbar label="Recent violations table controls" className="justify-between border-b border-border bg-white px-5 py-3 dark:border-border dark:bg-card">
          <h3 className="text-xs font-semibold text-gray-900 dark:text-zinc-100">
            Recent Rate Limit Violations
          </h3>
          {data.recentViolations.length > 0 && (
            <TableScrollControls
              scrollContainerRef={violationsScroll.tableContainerRef}
              canScrollLeft={violationsScroll.canScrollLeft}
              canScrollRight={violationsScroll.canScrollRight}
              isScrolled={violationsScroll.isScrolled}
              onScrollLeft={violationsScroll.scrollLeft}
              onScrollRight={violationsScroll.scrollRight}
              onResetScroll={violationsScroll.resetScroll}
            />
          )}
        </DataViewToolbar>
        <div>
          {data.recentViolations.length === 0 ? (
            <EmptyState
              variant="compact"
              icon={Shield01Icon}
              title="No Recent Violations"
              description="Recent rate-limit violations will appear here when detected."
            />
          ) : (
            <div
              ref={violationsScroll.tableContainerRef}
              className="w-full flex-[1_0_auto] overflow-x-auto show-scrollbar pb-2 select-none"
            >
              <Table columns={["category", "identifier", "text", "number", "date", "actions"]} className="min-w-[700px]">
                <thead className="sticky top-0 z-10 border-b border-border bg-gray-50/90 dark:bg-zinc-900/90 backdrop-blur-xs select-none">
                  <tr className="text-left text-xs font-semibold text-gray-500 dark:text-zinc-400">
                    <th className="w-[20%] p-4">
                      Type
                    </th>
                    <th className="w-[24%] p-4">
                      Identifier
                    </th>
                    <th className="w-[18%] p-4">
                      IP Address
                    </th>
                    <th className="w-[14%] p-4">
                      Violations
                    </th>
                    <th className="w-[14%] p-4">
                      Lockout Until
                    </th>
                    <th className="w-20 p-4 pr-6 text-right">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-transparent divide-y divide-border dark:divide-border bg-white dark:bg-card">
                  {data.recentViolations.map((violation) => (
                    <tr key={violation.id} className="hover:bg-gray-50/70 dark:hover:bg-zinc-800/40 transition-colors group select-none">
                      <td className="p-4 text-xs font-medium text-gray-900 dark:text-zinc-100 whitespace-nowrap border-r border-border/70 dark:border-border/70">{violation.endpoint_type}</td>
                      <td className="p-4 text-xs font-sans tabular-nums text-gray-600 dark:text-zinc-400 truncate border-r border-border/70 dark:border-border/70">
                        {violation.identifier}
                      </td>
                      <td className="p-4 text-xs font-sans tabular-nums text-gray-600 dark:text-zinc-400 whitespace-nowrap border-r border-border/70 dark:border-border/70">
                        {violation.ip_address}
                      </td>
                      <td className="p-4 text-xs whitespace-nowrap border-r border-border/70 dark:border-border/70">
                        <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-medium text-red-800 dark:bg-red-950/50 dark:text-red-300">
                          {violation.violation_count}
                        </span>
                      </td>
                      <td className="p-4 text-xs text-gray-600 dark:text-zinc-400 whitespace-nowrap border-r border-border/70 dark:border-border/70">
                        {violation.lockout_until
                          ? formatTime(violation.lockout_until)
                          : "None"}
                      </td>
                      <td className="p-4 pr-6 text-right whitespace-nowrap">
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
                                className="table-action-button rounded-lg text-gray-500 hover:text-pup-maroon dark:text-zinc-400 dark:hover:text-primary active:scale-95 cursor-pointer"
                                aria-label="Clear violation"
                              >
                                <SquareUnlock01Icon size={16} className="h-4 w-4" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent>Clear</TooltipContent>
                          </Tooltip>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          )}
        </div>
      </div>
    </div>
  )

  const renderConfigurations = () => (
    <div className="rounded-2xl border border-border bg-white overflow-hidden shadow-xs dark:border-border dark:bg-card">
      <DataViewToolbar label="Rate limit configuration table controls" className="justify-between border-b border-border bg-white px-5 py-3 dark:border-border dark:bg-card">
        <h3 className="text-xs font-semibold text-gray-900 dark:text-zinc-100">Rate Limit Configurations</h3>
        {data.configs.length > 0 && (
          <TableScrollControls
            scrollContainerRef={configsScroll.tableContainerRef}
            canScrollLeft={configsScroll.canScrollLeft}
            canScrollRight={configsScroll.canScrollRight}
            isScrolled={configsScroll.isScrolled}
            onScrollLeft={configsScroll.scrollLeft}
            onScrollRight={configsScroll.scrollRight}
            onResetScroll={configsScroll.resetScroll}
          />
        )}
      </DataViewToolbar>
      <div
        ref={configsScroll.tableContainerRef}
        className="w-full flex-[1_0_auto] overflow-x-auto show-scrollbar pb-2 select-none"
      >
        <Table columns={["category", "number", "number", "actions"]} className="min-w-[550px]">
          <thead className="sticky top-0 z-10 border-b border-border bg-gray-50/90 dark:bg-zinc-900/90 backdrop-blur-xs select-none">
            <tr className="text-left text-xs font-semibold text-gray-500 dark:text-zinc-400">
              <th className="w-[42%] p-4">
                Endpoint Type
              </th>
              <th className="w-[25%] p-4">
                Window (Seconds)
              </th>
              <th className="w-[25%] p-4">
                Max Requests
              </th>
              <th className="w-20 p-4 pr-6 text-right">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-transparent divide-y divide-border dark:divide-border bg-white dark:bg-card">
            {data.configs.map((config) => (
              <tr key={config.id} className="hover:bg-gray-50/70 dark:hover:bg-zinc-800/40 transition-colors group select-none">
                <td className="p-4 text-xs font-semibold text-gray-900 dark:text-zinc-100 whitespace-nowrap border-r border-border/70 dark:border-border/70">
                  {config.endpoint_type}
                </td>
                <td className="p-4 text-xs text-gray-600 dark:text-zinc-400 whitespace-nowrap border-r border-border/70 dark:border-border/70">{config.window_seconds}s</td>
                <td className="p-4 text-xs text-gray-600 dark:text-zinc-400 whitespace-nowrap border-r border-border/70 dark:border-border/70">{config.max_requests} req</td>
                <td className="p-4 pr-6 text-right whitespace-nowrap">
                  <div className="flex items-center justify-end">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          className="table-action-button rounded-lg active:scale-95 cursor-pointer"
                          aria-label="Edit configuration"
                        >
                          <PencilEdit01Icon size="1em" className="text-sm" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>Edit</TooltipContent>
                    </Tooltip>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </div>
    </div>
  )

  const renderSuspiciousIPs = () => (
    <div className="rounded-2xl border border-border bg-white overflow-hidden shadow-xs dark:border-border dark:bg-card">
      <DataViewToolbar label="Suspicious IP table controls" className="justify-between border-b border-border bg-white px-5 py-3 dark:border-border dark:bg-card">
        <h3 className="text-xs font-semibold text-gray-900 dark:text-zinc-100">Suspicious IP Addresses</h3>
        {suspiciousIPs.length > 0 && (
          <TableScrollControls
            scrollContainerRef={suspiciousScroll.tableContainerRef}
            canScrollLeft={suspiciousScroll.canScrollLeft}
            canScrollRight={suspiciousScroll.canScrollRight}
            isScrolled={suspiciousScroll.isScrolled}
            onScrollLeft={suspiciousScroll.scrollLeft}
            onScrollRight={suspiciousScroll.scrollRight}
            onResetScroll={suspiciousScroll.resetScroll}
          />
        )}
      </DataViewToolbar>
      <div>
        {suspiciousIPs.length === 0 ? (
          <EmptyState
            variant="compact"
            icon={Shield01Icon}
            title="No Suspicious Activity Detected"
            description="IP addresses flagged for suspicious activity will appear here."
          />
        ) : (
          <div
            ref={suspiciousScroll.tableContainerRef}
            className="w-full flex-[1_0_auto] overflow-x-auto show-scrollbar pb-2 select-none"
          >
            <Table columns={["text", "status", "number", "number", "date"]} className="min-w-[650px]">
              <thead className="sticky top-0 z-10 border-b border-border bg-gray-50/90 dark:bg-zinc-900/90 backdrop-blur-xs select-none">
                <tr className="text-left text-xs font-semibold text-gray-500 dark:text-zinc-400">
                  <th className="w-[24%] p-4">
                    IP Address
                  </th>
                  <th className="w-[18%] p-4">
                    Risk Level
                  </th>
                  <th className="w-[18%] p-4">
                    Failed Logins
                  </th>
                  <th className="w-[18%] p-4">
                    Unique Users
                  </th>
                  <th className="w-[22%] p-4 pr-6 text-left">
                    Last Seen
                  </th>
                </tr>
              </thead>
              <tbody className="bg-transparent divide-y divide-border dark:divide-border bg-white dark:bg-card">
                {suspiciousIPs.map((ip, index) => (
                  <tr key={index} className="hover:bg-gray-50/70 dark:hover:bg-zinc-800/40 transition-colors group select-none">
                    <td className="p-4 text-xs font-sans tabular-nums font-medium text-gray-900 dark:text-zinc-100 whitespace-nowrap border-r border-border/70 dark:border-border/70">{ip.ip}</td>
                    <td className="p-4 text-xs whitespace-nowrap border-r border-border/70 dark:border-border/70">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${getRiskLevelColor(ip.riskLevel)}`}
                      >
                        {ip.riskLevel}
                      </span>
                    </td>
                    <td className="p-4 text-xs text-gray-600 dark:text-zinc-400 whitespace-nowrap border-r border-border/70 dark:border-border/70">{ip.failed_logins}</td>
                    <td className="p-4 text-xs text-gray-600 dark:text-zinc-400 whitespace-nowrap border-r border-border/70 dark:border-border/70">{ip.unique_users}</td>
                    <td className="p-4 pr-6 text-xs text-gray-600 dark:text-zinc-400 whitespace-nowrap">{formatTime(ip.last_seen)}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        )}
      </div>
    </div>
  )

  return (
    <TooltipProvider delayDuration={200}>
      <div className="space-y-6 animate-fade-up font-jakarta">
        {/* Tab Header with Title & Refresh */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-gray-900 dark:text-zinc-50">
              Rate Limiting & Security
            </h2>
            <p className="text-xs text-gray-900 dark:text-zinc-300 mt-0.5">
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
        <div className="inline-flex items-center gap-1 p-1 rounded-full bg-black/[0.04] dark:bg-white/[0.06] border border-black/[0.04] dark:border-white/[0.08] shadow-[inset_0_1px_2px_rgba(0,0,0,0.03)] dark:shadow-[inset_0_1px_2px_rgba(0,0,0,0.2)] w-fit select-none overflow-x-auto">
          {[
            { id: "overview", label: "Overview", icon: DashboardSpeed01Icon },
            { id: "configs", label: "Configurations", icon: LockIcon },
            { id: "suspicious", label: "Suspicious IPs", icon: AlertCircleIcon },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "inline-flex items-center gap-2 px-3.5 py-1 text-xs font-semibold rounded-full transition-all duration-150 cursor-pointer border-0 select-none active:scale-[0.98]",
                activeTab === tab.id
                  ? "bg-white text-gray-950 dark:bg-zinc-800 dark:text-white shadow-[0_1px_3px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.04),inset_0_1px_0_0_rgba(255,255,255,0.85)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.35),inset_0_1px_0_0_rgba(255,255,255,0.08)]"
                  : "text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-zinc-100 bg-transparent"
              )}
            >
              <tab.icon size="1em" className="text-sm shrink-0" />
              <span>{tab.label}</span>
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
                    <div key={i} className="rounded-2xl border border-border bg-white p-6 h-24 dark:border-border dark:bg-card">
                      <Skeleton className="h-4 w-24 mb-2 dark:bg-muted" />
                      <Skeleton className="h-8 w-16 dark:bg-muted" />
                    </div>
                  ))}
                </div>
                <div className="rounded-2xl border border-border bg-white h-64 overflow-hidden dark:border-border dark:bg-card">
                  <div className="border-b border-border bg-transparent p-4 dark:border-border dark:bg-transparent">
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
              <div className="rounded-2xl border border-border bg-white h-96 overflow-hidden dark:border-border dark:bg-card">
                <div className="border-b border-border bg-transparent p-4 dark:border-border dark:bg-transparent">
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




