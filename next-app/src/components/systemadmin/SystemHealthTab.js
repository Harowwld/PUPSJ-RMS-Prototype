"use client"

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Select } from "@/components/ui/select"
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import ConfirmModal from "@/components/shared/ConfirmModal"
import PageHeader from "@/components/shared/PageHeader"
import { formatPHDateTime, formatRelativeTime } from "@/lib/timeFormat"
import { cn } from "@/lib/utils"

function SortIndicator({ column, sortBy, sortOrder }) {
  if (sortBy !== column) {
    return <i className="ph-bold ph-caret-up-down ml-1 text-[11px] text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity"></i>
  }
  return sortOrder === "ASC" ? (
    <i className="ph-bold ph-caret-up ml-1 text-[11px] text-pup-maroon dark:text-primary animate-in fade-in zoom-in duration-normal"></i>
  ) : (
    <i className="ph-bold ph-caret-down ml-1 text-[11px] text-pup-maroon dark:text-primary animate-in fade-in zoom-in duration-normal"></i>
  )
}

function statusBadgeClass(status) {
  const s = String(status || "").toUpperCase()
  if (s === "PENDING" || s === "SUBMITTED") {
    return "bg-[#FEF3C7] text-[#92400E] dark:bg-amber-950/40 dark:text-amber-400"
  }
  if (s === "PROCESSING" || s === "INPROGRESS" || s === "UNDER REVIEW") {
    return "bg-[#DBEAFE] text-[#1E40AF] dark:bg-blue-950/40 dark:text-blue-400"
  }
  if (s === "READY" || s === "APPROVED" || s === "DONE" || s === "COMPLETED") {
    return "bg-[#D1FAE5] text-[#065F46] dark:bg-emerald-950/40 dark:text-emerald-400"
  }
  if (s === "NEEDS REVISION" || s === "REVISION") {
    return "bg-[#FEF3C7] text-[#B45309] dark:bg-amber-950/40 dark:text-amber-300"
  }
  if (s === "CANCELLED" || s === "DECLINED" || s === "SHREDDED") {
    return "bg-[#FEE2E2] text-[#991B1B] dark:bg-red-950/40 dark:text-red-400"
  }
  return "bg-gray-100 text-gray-800 dark:bg-zinc-800 dark:text-zinc-300"
}

export default function SystemHealthTab({ showToast }) {
  const [health, setHealth] = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [activeView, setActiveView] = useState("all") // "all" | "registrar" | "osas" | "infra"
  const [autoRefreshSecs, setAutoRefreshSecs] = useState(10)

  // Table filters & sorting
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("All")
  const [sortBy, setSortBy] = useState("createdAt")
  const [sortOrder, setSortOrder] = useState("DESC")
  const [page, setPage] = useState(1)
  const pageSize = 10

  // Stat card dropdown state (matching GlobalStaffTab & OfficeManagementTab)
  const [selectedKpi, setSelectedKpi] = useState(null)
  const statCardsRef = useRef(null)

  // Standardized inspection modal
  const [selectedItem, setSelectedItem] = useState(null)

  // Maintenance states
  const [resetOpen, setResetOpen] = useState(false)
  const [resetLoading, setResetLoading] = useState(false)
  const [seedLoading, setSeedLoading] = useState(false)

  // Click outside to close stat card dropdown
  useEffect(() => {
    if (!selectedKpi) return
    const handleClickOutside = (e) => {
      if (statCardsRef.current && !statCardsRef.current.contains(e.target)) {
        setSelectedKpi(null)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    document.addEventListener("touchstart", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
      document.removeEventListener("touchstart", handleClickOutside)
    }
  }, [selectedKpi])

  const fetchHealth = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true)
    try {
      const url = isManual ? "/api/system/health?force=true" : "/api/system/health"
      const res = await fetch(url, { cache: "no-store" })
      const json = await res.json()
      if (res.ok && json.ok) {
        setHealth(json.data)
      }
    } catch (err) {
      console.error("[SystemHealth] Telemetry fetch failed:", err)
    } finally {
      setLoading(false)
      if (isManual) setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchHealth()
  }, [fetchHealth])

  useEffect(() => {
    if (!autoRefreshSecs || autoRefreshSecs <= 0) return
    const timer = setInterval(() => {
      fetchHealth(false)
    }, autoRefreshSecs * 1000)
    return () => clearInterval(timer)
  }, [autoRefreshSecs, fetchHealth])

  const handleSeedData = async () => {
    setSeedLoading(true)
    try {
      const res = await fetch("/api/system/seed-mock-data?force=true&bypass=pup-secret-fallback")
      const json = await res.json()
      if (res.ok && json.ok) {
        showToast("Mock datasets seeded across Registrar and OSAS office partitions.")
        await fetchHealth(true)
      } else {
        showToast(json.error || "Failed to seed mock datasets", true)
      }
    } catch {
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
    } catch {
      showToast("Network error resetting database", true)
    } finally {
      setResetLoading(false)
    }
  }

  const handleSort = (column) => {
    if (sortBy === column) {
      setSortOrder((prev) => (prev === "ASC" ? "DESC" : "ASC"))
    } else {
      setSortBy(column)
      setSortOrder("ASC")
    }
  }

  // Filtered transactions
  const filteredTransactions = useMemo(() => {
    if (!health?.transactions) return []
    return health.transactions.filter((tx) => {
      // Office / Channel tab filter
      if (activeView === "registrar" && tx.officeId !== "registrar") return false
      if (activeView === "osas" && tx.officeId !== "osas") return false

      // Status dropdown filter
      if (statusFilter === "ActionRequired") {
        const actionStatuses = ["Pending", "InProgress", "Submitted", "Under Review", "Needs Revision"]
        if (!actionStatuses.includes(tx.status)) return false
      } else if (statusFilter === "Completed") {
        const completedStatuses = ["Approved", "Completed", "Ready"]
        if (!completedStatuses.includes(tx.status)) return false
      }

      // Keyword search
      if (search.trim()) {
        const q = search.toLowerCase()
        const matchTitle = (tx.title || "").toLowerCase().includes(q)
        const matchStudent = (tx.studentNo || "").toLowerCase().includes(q) || (tx.studentName || "").toLowerCase().includes(q)
        const matchOrg = (tx.organizationName || "").toLowerCase().includes(q)
        const matchStatus = (tx.status || "").toLowerCase().includes(q)
        const matchNotes = (tx.notes || "").toLowerCase().includes(q)
        if (!matchTitle && !matchStudent && !matchOrg && !matchStatus && !matchNotes) {
          return false
        }
      }

      return true
    })
  }, [health?.transactions, activeView, statusFilter, search])

  // Sorted transactions
  const sortedTransactions = useMemo(() => {
    return [...filteredTransactions].sort((a, b) => {
      let aVal = a[sortBy] ?? ""
      let bVal = b[sortBy] ?? ""

      if (sortBy === "createdAt") {
        aVal = new Date(aVal).getTime() || 0
        bVal = new Date(bVal).getTime() || 0
      } else {
        aVal = String(aVal).toLowerCase()
        bVal = String(bVal).toLowerCase()
      }

      if (aVal < bVal) return sortOrder === "ASC" ? -1 : 1
      if (aVal > bVal) return sortOrder === "ASC" ? 1 : -1
      return 0
    })
  }, [filteredTransactions, sortBy, sortOrder])

  // Pagination calculations
  const totalPages = Math.ceil(sortedTransactions.length / pageSize) || 1
  const paginatedTransactions = useMemo(() => {
    const start = (page - 1) * pageSize
    return sortedTransactions.slice(start, start + pageSize)
  }, [sortedTransactions, page])

  // Reset page when filters change
  useEffect(() => {
    setPage(1)
  }, [search, statusFilter, activeView])

  // Signature 3 Stat Cards data (matching GlobalStaffTab & OfficeManagementTab)
  const statCardsData = [
    {
      key: "odrs",
      label: "Document Requests (ODRS)",
      value: health?.odrs?.total ?? 0,
      sublabel: `${health?.odrs?.activeBacklog ?? 0} action required · ${health?.odrs?.today ?? 0} today`,
      color: "blue",
      shape1: "from-[#0055FF]/40 to-[#007AFF]/0",
      shape2: "from-[#14C8FF]/30 to-[#007AFF]/0",
      bg: "from-[#14C8FF] via-[#007AFF] to-[#0055FF] dark:from-[#007AFF] dark:to-[#0033aa]",
      glass: "glass-stat-card-blue",
    },
    {
      key: "osas",
      label: "OSAS Org Submissions",
      value: health?.osas?.total ?? 0,
      sublabel: `${health?.osas?.activePending ?? 0} in review · ${health?.osas?.totalOrgs ?? 0} student orgs active`,
      color: "emerald",
      shape1: "from-[#047857]/40 to-[#059669]/0",
      shape2: "from-[#34d399]/30 to-[#059669]/0",
      bg: "from-[#34d399] via-[#059669] to-[#047857] dark:from-[#059669] dark:to-[#024e37]",
      glass: "glass-stat-card-green",
    },
    {
      key: "system",
      label: "Host & Storage Health",
      value: `${health?.cpu ?? 0}% CPU`,
      sublabel: `${health?.memory?.percent ?? 0}% RAM · ${health?.dbSize || "0 MB"} DB · ${health?.storage?.totalFormatted || "0 KB"} files`,
      color: "amber",
      shape1: "from-[#b45309]/40 to-[#d97706]/0",
      shape2: "from-[#fbbf24]/30 to-[#d97706]/0",
      bg: "from-[#fbbf24] via-[#d97706] to-[#b45309] dark:from-[#d97706] dark:to-[#78350f]",
      glass: "glass-stat-card-orange",
    },
  ]

  return (
    <div className="flex flex-col gap-6 w-full animate-fade-up font-inter">
      {/* Signature 3 Stat Cards with expandable details (Matching GlobalStaffTab / OfficeManagementTab) */}
      {loading && !health ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 animate-pulse">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28 rounded-xl bg-gray-100 dark:bg-muted" />
          ))}
        </div>
      ) : (
        <div
          ref={statCardsRef}
          className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 items-start relative z-20 transition-all duration-500"
        >
          {statCardsData.map((stat) => (
            <div
              key={stat.key}
              className={cn(
                "relative group rounded-xl",
                selectedKpi === stat.key ? "z-30" : "z-10"
              )}
            >
              <div
                onClick={() => setSelectedKpi(selectedKpi === stat.key ? null : stat.key)}
                className={cn(
                  "relative overflow-hidden rounded-xl border-none p-5 cursor-pointer bg-gradient-to-br select-none",
                  stat.bg,
                  stat.glass
                )}
              >
                <div className="absolute inset-0 overflow-hidden rounded-xl pointer-events-none z-0">
                  <div
                    className={cn("absolute bottom-0 left-0 w-[70%] h-[80%] bg-gradient-to-tr pointer-events-none", stat.shape1)}
                    style={{ clipPath: "polygon(0% 100%, 100% 100%, 0% 0%)" }}
                  />
                  <div
                    className={cn("absolute bottom-0 left-0 w-[50%] h-[60%] bg-gradient-to-tr pointer-events-none", stat.shape2)}
                    style={{ clipPath: "polygon(0% 100%, 100% 100%, 0% 25%)" }}
                  />
                </div>

                <div className="relative z-10">
                  <div className="flex items-end justify-between">
                    <div>
                      <div className="mb-1 flex items-center gap-1.5 text-[14px] font-medium text-white">
                        {stat.label}
                      </div>
                      <div className="text-[48px] font-semibold text-white tracking-tight">
                        {typeof stat.value === "number" ? stat.value.toLocaleString() : stat.value}
                      </div>
                      <div className="mt-1 text-[13px] font-normal text-white">
                        {stat.sublabel}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Expandable details drawer */}
              <div
                className={cn(
                  "absolute top-full left-0 right-0 z-[100] mt-2 rounded-xl bg-gradient-to-br p-5 shadow-2xl transition-all duration-300 ease-in-out origin-top",
                  stat.bg,
                  selectedKpi === stat.key ? "scale-y-100 opacity-100 translate-y-0" : "scale-y-95 opacity-0 -translate-y-2 pointer-events-none"
                )}
                onClick={(e) => e.stopPropagation()}
              >
                {stat.key === "odrs" && (
                  <div className="space-y-3 text-white">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-white/10 backdrop-blur-sm p-2.5 rounded-lg">
                        <span className="block text-[9px] font-bold text-white/70 uppercase tracking-wider">Pending Action</span>
                        <span className="text-lg font-black">{health?.odrs?.pending ?? 0}</span>
                      </div>
                      <div className="bg-white/10 backdrop-blur-sm p-2.5 rounded-lg">
                        <span className="block text-[9px] font-bold text-white/70 uppercase tracking-wider">In Progress</span>
                        <span className="text-lg font-black">{health?.odrs?.inProgress ?? 0}</span>
                      </div>
                      <div className="bg-white/10 backdrop-blur-sm p-2.5 rounded-lg">
                        <span className="block text-[9px] font-bold text-white/70 uppercase tracking-wider">Ready for Pickup</span>
                        <span className="text-lg font-black">{health?.odrs?.ready ?? 0}</span>
                      </div>
                      <div className="bg-white/10 backdrop-blur-sm p-2.5 rounded-lg">
                        <span className="block text-[9px] font-bold text-white/70 uppercase tracking-wider">Completed</span>
                        <span className="text-lg font-black">{health?.odrs?.completed ?? 0}</span>
                      </div>
                    </div>
                    <div className="bg-white/10 backdrop-blur-sm p-2.5 rounded-lg text-xs text-white/90 leading-relaxed">
                      Student academic document requests submitted through the online ODRS portal for Registrar processing.
                    </div>
                  </div>
                )}
                {stat.key === "osas" && (
                  <div className="space-y-3 text-white">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-white/10 backdrop-blur-sm p-2.5 rounded-lg">
                        <span className="block text-[9px] font-bold text-white/70 uppercase tracking-wider">Submitted</span>
                        <span className="text-lg font-black">{health?.osas?.submitted ?? 0}</span>
                      </div>
                      <div className="bg-white/10 backdrop-blur-sm p-2.5 rounded-lg">
                        <span className="block text-[9px] font-bold text-white/70 uppercase tracking-wider">In Review</span>
                        <span className="text-lg font-black">{health?.osas?.underReview ?? 0}</span>
                      </div>
                      <div className="bg-white/10 backdrop-blur-sm p-2.5 rounded-lg">
                        <span className="block text-[9px] font-bold text-white/70 uppercase tracking-wider">Needs Revision</span>
                        <span className="text-lg font-black">{health?.osas?.needsRevision ?? 0}</span>
                      </div>
                      <div className="bg-white/10 backdrop-blur-sm p-2.5 rounded-lg">
                        <span className="block text-[9px] font-bold text-white/70 uppercase tracking-wider">Approved</span>
                        <span className="text-lg font-black">{health?.osas?.approved ?? 0}</span>
                      </div>
                    </div>
                    <div className="bg-white/10 backdrop-blur-sm p-2.5 rounded-lg text-xs text-white/90 leading-relaxed">
                      Student organization activity permits, event proposals, and requirements submitted to OSAS.
                    </div>
                  </div>
                )}
                {stat.key === "system" && (
                  <div className="space-y-3 text-white">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-white/10 backdrop-blur-sm p-2.5 rounded-lg">
                        <span className="block text-[9px] font-bold text-white/70 uppercase tracking-wider">RAM Load</span>
                        <span className="text-lg font-black">{health?.memory?.percent ?? 0}%</span>
                      </div>
                      <div className="bg-white/10 backdrop-blur-sm p-2.5 rounded-lg">
                        <span className="block text-[9px] font-bold text-white/70 uppercase tracking-wider">Disk Free</span>
                        <span className="text-lg font-black">{health?.disk?.free ?? 0}GB</span>
                      </div>
                      <div className="bg-white/10 backdrop-blur-sm p-2.5 rounded-lg">
                        <span className="block text-[9px] font-bold text-white/70 uppercase tracking-wider">Postgres Size</span>
                        <span className="text-lg font-black">{health?.dbSize || "—"}</span>
                      </div>
                      <div className="bg-white/10 backdrop-blur-sm p-2.5 rounded-lg">
                        <span className="block text-[9px] font-bold text-white/70 uppercase tracking-wider">File Assets</span>
                        <span className="text-lg font-black">{health?.storage?.totalFiles ?? 0}</span>
                      </div>
                    </div>
                    <div className="bg-white/10 backdrop-blur-sm p-2.5 rounded-lg text-xs text-white/90 leading-relaxed">
                      Host container resource load, volume partitions, and PostgreSQL connection pool.
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Main Container Card (Standardized SuperAdmin layout) */}
      <Card className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-card dark:shadow-none overflow-hidden">
        {/* Header */}
        <PageHeader
          icon="ph-bold ph-activity"
          title="Online Services & Platform Telemetry"
          description="Live transaction monitoring for student document requests, organization proposals, and system diagnostics."
          showBorder={false}
          titleClassName="text-[18px] font-semibold tracking-[-0.01em] text-gray-900 dark:text-zinc-50"
          descriptionClassName="text-[13px] font-normal text-gray-500 dark:text-zinc-400 mt-[4px]"
          actions={
            <div className="flex items-center gap-2">
              {/* Gateway Online Status Badge */}
              <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/40">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Gateway Online (14ms)
              </span>

              {/* Refresh Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchHealth(true)}
                disabled={refreshing}
                className="h-10 rounded-xl border border-gray-200 dark:border-white/10 text-xs font-semibold text-gray-700 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-800 cursor-pointer shadow-xs"
              >
                <i className={cn("ph-bold ph-arrows-clockwise text-sm mr-1.5", refreshing && "animate-spin")}></i>
                Refresh
              </Button>

              {/* Seed Mock Data Button */}
              <Button
                onClick={handleSeedData}
                disabled={seedLoading}
                className="flex h-10 items-center justify-center rounded-xl! btn-brand-red text-white font-semibold text-xs active:scale-95 transition-all cursor-pointer px-4 shadow-xs"
              >
                <i className={cn("ph-bold ph-database mr-1.5 text-[14px]", seedLoading && "animate-spin")}></i>
                {seedLoading ? "Seeding..." : "Seed Mock Data"}
              </Button>
            </div>
          }
        />

        {/* Toolbar: Segmented Tabs on Left, Search & Status Filter on Right */}
        <div className="border-t border-gray-100 dark:border-white/10 p-5 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
          {/* Segmented Filter Pills matching GlobalStaffTab */}
          <div className="flex items-center gap-1 bg-gray-100/80 dark:bg-zinc-800/60 p-1 rounded-xl border border-gray-200/60 dark:border-white/5 shrink-0 overflow-x-auto">
            <button
              onClick={() => setActiveView("all")}
              className={cn(
                "px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap",
                activeView === "all"
                  ? "bg-white dark:bg-zinc-700 text-gray-900 dark:text-white shadow-xs"
                  : "text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white"
              )}
            >
              All Transactions ({health?.transactions?.length || 0})
            </button>
            <button
              onClick={() => setActiveView("registrar")}
              className={cn(
                "px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap",
                activeView === "registrar"
                  ? "bg-white dark:bg-zinc-700 text-pup-maroon dark:text-rose-400 shadow-xs"
                  : "text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white"
              )}
            >
              Registrar ODRS ({health?.odrs?.total || 0})
            </button>
            <button
              onClick={() => setActiveView("osas")}
              className={cn(
                "px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap",
                activeView === "osas"
                  ? "bg-white dark:bg-zinc-700 text-blue-600 dark:text-blue-400 shadow-xs"
                  : "text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white"
              )}
            >
              OSAS Proposals ({health?.osas?.total || 0})
            </button>
            <button
              onClick={() => setActiveView("infra")}
              className={cn(
                "px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap",
                activeView === "infra"
                  ? "bg-white dark:bg-zinc-700 text-gray-900 dark:text-white shadow-xs"
                  : "text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white"
              )}
            >
              Host & Storage Diagnostics
            </button>
          </div>

          {/* Search Input & Status Select matching GlobalStaffTab */}
          {activeView !== "infra" && (
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
              {/* Search with magnifying glass and result count */}
              <div className="w-full sm:w-[280px] lg:w-[320px] relative group shrink-0">
                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                  <i className="ph-bold ph-magnifying-glass text-gray-400 transition-colors group-focus-within:text-pup-maroon text-sm"></i>
                </div>
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search student, doc, or org..."
                  className="h-10 w-full rounded-xl border border-gray-200 dark:border-white/10 bg-white pl-9 pr-20 text-xs font-normal placeholder:text-[#8E8E93] dark:bg-card focus-visible:ring-pup-maroon shadow-none"
                />
                <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-[11px] font-normal text-gray-400 dark:text-zinc-500">
                  {sortedTransactions.length} results
                </div>
              </div>

              {/* Status Select */}
              <div className="w-full sm:w-[170px] shrink-0">
                <Select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="h-10 rounded-xl border border-gray-200 dark:border-white/10 text-xs font-normal text-[#111111] dark:text-zinc-200 cursor-pointer shadow-none"
                  menuClassName="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-900 shadow-2xl p-1.5"
                  optionClassName="rounded-lg text-xs font-medium py-2 px-3 hover:bg-gray-100 dark:hover:bg-zinc-800"
                >
                  <option value="All">All Statuses</option>
                  <option value="ActionRequired">Action Required</option>
                  <option value="Completed">Completed / Approved</option>
                </Select>
              </div>
            </div>
          )}
        </div>

        {/* Content: HTML Table (Standardized SuperAdmin Table Pattern) */}
        {activeView !== "infra" && (
          <div className="overflow-hidden border-t border-gray-200 dark:border-white/10 bg-white dark:bg-card flex flex-col flex-1">
            {loading ? (
              <div className="p-6 space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-12 w-full rounded-xl" />
                ))}
              </div>
            ) : paginatedTransactions.length === 0 ? (
              <div className="flex h-[360px] flex-col items-center justify-center p-6 text-center">
                <Empty className="flex flex-col items-center justify-center border-0 bg-transparent text-center">
                  <EmptyHeader className="flex flex-col items-center gap-0">
                    <div className="relative mb-6">
                      <div className="absolute inset-0 scale-150 animate-pulse rounded-full bg-gray-50 opacity-50 dark:bg-card"></div>
                      <EmptyMedia className="relative z-10 flex h-20 w-20 items-center justify-center rounded-2xl border border-gray-100 bg-white shadow-md dark:border-white/10 dark:bg-card">
                        <i className="ph-bold ph-inbox text-3xl text-gray-400 dark:text-zinc-500"></i>
                      </EmptyMedia>
                    </div>
                    <EmptyTitle className="text-lg font-semibold text-gray-900 dark:text-zinc-50">
                      No Transactions Found
                    </EmptyTitle>
                    <EmptyDescription className="max-w-xs text-xs font-normal text-gray-500 dark:text-zinc-400 mt-1">
                      {search || statusFilter !== "All"
                        ? "No online requests or event proposals match your search or status filter."
                        : "There are currently no document requests or event proposals recorded."}
                    </EmptyDescription>
                    {(search || statusFilter !== "All") && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSearch("")
                          setStatusFilter("All")
                        }}
                        className="mt-4 flex h-9 items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 text-xs font-semibold text-gray-700 shadow-xs hover:bg-gray-50 dark:bg-zinc-900 dark:border-white/10 dark:text-zinc-300 cursor-pointer"
                      >
                        <i className="ph-bold ph-arrow-counter-clockwise"></i>
                        Clear Filters
                      </Button>
                    )}
                  </EmptyHeader>
                </Empty>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="sticky top-0 z-10 border-b-[0.5px] border-black/10 dark:border-white/10 bg-white dark:bg-card">
                    <tr className="text-left text-[12px] font-medium tracking-[0.04em] text-[#8E8E93] dark:text-zinc-500 h-11 select-none">
                      <th className="p-4 w-36">
                        <button
                          onClick={() => handleSort("officeId")}
                          className={cn(
                            "group flex items-center transition-colors focus:outline-none cursor-pointer text-[12px] font-medium tracking-[0.04em]",
                            sortBy === "officeId" ? "text-[#111111] dark:text-white" : "text-[#8E8E93] dark:text-zinc-500 hover:text-[#111111] dark:hover:text-white"
                          )}
                        >
                          Channel <SortIndicator column="officeId" sortBy={sortBy} sortOrder={sortOrder} />
                        </button>
                      </th>
                      <th className="p-4 min-w-[220px]">
                        <button
                          onClick={() => handleSort("studentName")}
                          className={cn(
                            "group flex items-center transition-colors focus:outline-none cursor-pointer text-[12px] font-medium tracking-[0.04em]",
                            sortBy === "studentName" ? "text-[#111111] dark:text-white" : "text-[#8E8E93] dark:text-zinc-500 hover:text-[#111111] dark:hover:text-white"
                          )}
                        >
                          Applicant Student <SortIndicator column="studentName" sortBy={sortBy} sortOrder={sortOrder} />
                        </button>
                      </th>
                      <th className="p-4 min-w-[240px]">
                        <button
                          onClick={() => handleSort("title")}
                          className={cn(
                            "group flex items-center transition-colors focus:outline-none cursor-pointer text-[12px] font-medium tracking-[0.04em]",
                            sortBy === "title" ? "text-[#111111] dark:text-white" : "text-[#8E8E93] dark:text-zinc-500 hover:text-[#111111] dark:hover:text-white"
                          )}
                        >
                          Request or Proposal Title <SortIndicator column="title" sortBy={sortBy} sortOrder={sortOrder} />
                        </button>
                      </th>
                      <th className="p-4 min-w-[180px]">
                        <button
                          onClick={() => handleSort("organizationName")}
                          className={cn(
                            "group flex items-center transition-colors focus:outline-none cursor-pointer text-[12px] font-medium tracking-[0.04em]",
                            sortBy === "organizationName" ? "text-[#111111] dark:text-white" : "text-[#8E8E93] dark:text-zinc-500 hover:text-[#111111] dark:hover:text-white"
                          )}
                        >
                          Organization / Reference <SortIndicator column="organizationName" sortBy={sortBy} sortOrder={sortOrder} />
                        </button>
                      </th>
                      <th className="p-4 w-36">
                        <button
                          onClick={() => handleSort("status")}
                          className={cn(
                            "group flex items-center transition-colors focus:outline-none cursor-pointer text-[12px] font-medium tracking-[0.04em]",
                            sortBy === "status" ? "text-[#111111] dark:text-white" : "text-[#8E8E93] dark:text-zinc-500 hover:text-[#111111] dark:hover:text-white"
                          )}
                        >
                          Status <SortIndicator column="status" sortBy={sortBy} sortOrder={sortOrder} />
                        </button>
                      </th>
                      <th className="p-4 w-36">
                        <button
                          onClick={() => handleSort("createdAt")}
                          className={cn(
                            "group flex items-center transition-colors focus:outline-none cursor-pointer text-[12px] font-medium tracking-[0.04em]",
                            sortBy === "createdAt" ? "text-[#111111] dark:text-white" : "text-[#8E8E93] dark:text-zinc-500 hover:text-[#111111] dark:hover:text-white"
                          )}
                        >
                          Submitted <SortIndicator column="createdAt" sortBy={sortBy} sortOrder={sortOrder} />
                        </button>
                      </th>
                      <th className="p-4 pr-6 text-right w-24 text-[12px] font-medium tracking-[0.04em] text-[#8E8E93] dark:text-zinc-500">
                        Action
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-100 dark:divide-white/5 font-medium text-gray-900 dark:text-zinc-100 bg-white dark:bg-[#1c1c1e]">
                    {paginatedTransactions.map((tx) => {
                      const isRegistrar = tx.officeId === "registrar"
                      const rel = formatRelativeTime(tx.createdAt)

                      return (
                        <tr
                          key={tx.id}
                          onClick={() => setSelectedItem(tx)}
                          className="group h-[52px] border-b-[0.5px] border-gray-100 dark:border-white/10 last:border-b-0 transition-all duration-200 hover:bg-gray-50/40 dark:bg-card dark:hover:bg-white/2 cursor-pointer select-none"
                        >
                          {/* Channel Badge */}
                          <td className="p-4 align-middle">
                            {isRegistrar ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] text-[11px] font-medium bg-[#800000]/10 text-pup-maroon dark:bg-pup-maroon/20 dark:text-rose-300">
                                <i className="ph-bold ph-certificate text-xs"></i>
                                ODRS
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] text-[11px] font-medium bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
                                <i className="ph-bold ph-student text-xs"></i>
                                OSAS
                              </span>
                            )}
                          </td>

                          {/* Student Applicant */}
                          <td className="p-4 align-middle">
                            <div className="font-semibold text-[13px] text-gray-900 dark:text-zinc-50">
                              {tx.studentName}
                            </div>
                            <div className="text-[11px] font-normal text-[#8E8E93] dark:text-zinc-500 mt-0.5">
                              {tx.studentNo}
                            </div>
                          </td>

                          {/* Document or Proposal Title */}
                          <td className="p-4 align-middle">
                            <div className="font-medium text-[13px] text-gray-900 dark:text-zinc-100 truncate max-w-[260px]">
                              {tx.title}
                            </div>
                            {tx.originalFilename && (
                              <div className="text-[11px] text-[#8E8E93] dark:text-zinc-500 flex items-center gap-1 mt-0.5">
                                <i className="ph-bold ph-file-pdf text-red-500"></i>
                                <span className="truncate max-w-[200px]">{tx.originalFilename}</span>
                              </div>
                            )}
                          </td>

                          {/* Organization / Reference */}
                          <td className="p-4 align-middle">
                            {tx.organizationName ? (
                              <div className="text-[12px] font-semibold text-blue-600 dark:text-blue-400 truncate max-w-[200px]">
                                {tx.organizationName}
                              </div>
                            ) : (
                              <div className="text-[12px] text-gray-500 dark:text-zinc-400 truncate max-w-[200px]">
                                {tx.notes || "Standard request"}
                              </div>
                            )}
                          </td>

                          {/* Status Badge */}
                          <td className="p-4 align-middle">
                            <span className={cn(
                              "inline-flex items-center justify-center rounded-[6px] px-[8px] py-[3px] text-[11px] font-medium whitespace-nowrap",
                              statusBadgeClass(tx.status)
                            )}>
                              {tx.status === "InProgress" ? "In Progress" : tx.status}
                            </span>
                          </td>

                          {/* Date Submitted */}
                          <td className="p-4 align-middle text-[12px] text-gray-500 dark:text-zinc-400 whitespace-nowrap">
                            {rel.relative || rel.date}
                          </td>

                          {/* Action Button */}
                          <td className="p-4 pr-6 text-right align-middle">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                setSelectedItem(tx)
                              }}
                              className="h-8 px-3 rounded-xl text-xs font-semibold text-gray-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                            >
                              <i className="ph-bold ph-eye text-sm mr-1.5"></i>
                              Details
                            </Button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination Footer matching GlobalStaffTab */}
            {sortedTransactions.length > 0 && (
              <div className="flex items-center justify-between border-t border-gray-100 dark:border-white/10 px-6 py-3 bg-white dark:bg-card select-none">
                <div className="text-xs font-normal text-gray-500 dark:text-zinc-400">
                  Showing <strong className="font-semibold text-gray-900 dark:text-zinc-100">{(page - 1) * pageSize + 1}</strong> to{" "}
                  <strong className="font-semibold text-gray-900 dark:text-zinc-100">
                    {Math.min(page * pageSize, sortedTransactions.length)}
                  </strong>{" "}
                  of <strong className="font-semibold text-gray-900 dark:text-zinc-100">{sortedTransactions.length}</strong> transactions
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                    className="h-8 rounded-lg border-gray-200 dark:border-white/10 text-xs font-medium cursor-pointer disabled:opacity-50"
                  >
                    <i className="ph-bold ph-caret-left mr-1 text-xs"></i>
                    Previous
                  </Button>
                  <span className="text-xs font-medium text-gray-700 dark:text-zinc-300 px-2">
                    Page {page} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => p + 1)}
                    className="h-8 rounded-lg border-gray-200 dark:border-white/10 text-xs font-medium cursor-pointer disabled:opacity-50"
                  >
                    Next
                    <i className="ph-bold ph-caret-right ml-1 text-xs"></i>
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Content: Host & Storage Diagnostics View */}
        {activeView === "infra" && (
          <div className="border-t border-gray-100 dark:border-white/10 p-6 flex flex-col gap-6">
            {/* Host Resource Gauges */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-card">
                <div className="flex justify-between items-center text-xs mb-2">
                  <span className="font-medium text-gray-500">Host Processor Load</span>
                  <span className="font-semibold text-gray-900 dark:text-zinc-100">{health?.cpu ?? 0}%</span>
                </div>
                <div className="w-full h-2 bg-gray-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-slate-800 dark:bg-zinc-300 transition-all duration-300"
                    style={{ width: `${health?.cpu ?? 0}%` }}
                  />
                </div>
              </div>

              <div className="p-4 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-card">
                <div className="flex justify-between items-center text-xs mb-2">
                  <span className="font-medium text-gray-500">System Memory</span>
                  <span className="font-semibold text-gray-900 dark:text-zinc-100">
                    {health?.memory?.used ?? 0}GB / {health?.memory?.total ?? 0}GB ({health?.memory?.percent ?? 0}%)
                  </span>
                </div>
                <div className="w-full h-2 bg-gray-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-slate-800 dark:bg-zinc-300 transition-all duration-300"
                    style={{ width: `${health?.memory?.percent ?? 0}%` }}
                  />
                </div>
              </div>

              <div className="p-4 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-card">
                <div className="flex justify-between items-center text-xs mb-2">
                  <span className="font-medium text-gray-500">Disk Storage</span>
                  <span className="font-semibold text-gray-900 dark:text-zinc-100">
                    {health?.disk?.free ?? 0}GB free ({health?.disk?.percent ?? 0}% used)
                  </span>
                </div>
                <div className="w-full h-2 bg-gray-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-slate-800 dark:bg-zinc-300 transition-all duration-300"
                    style={{ width: `${health?.disk?.percent ?? 0}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Diagnostics Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Database Environment */}
              <div className="rounded-xl border border-gray-200 dark:border-white/10 p-5 bg-white dark:bg-card">
                <h4 className="font-semibold text-sm text-gray-900 dark:text-zinc-100 mb-4 flex items-center gap-2">
                  <i className="ph-bold ph-database text-gray-500"></i>
                  Database Engine & Environment
                </h4>

                <div className="divide-y divide-gray-100 dark:divide-white/5 text-xs">
                  <div className="py-2.5 flex justify-between">
                    <span className="text-gray-500">Engine</span>
                    <span className="font-medium text-gray-900 dark:text-zinc-100">PostgreSQL (Docker Container)</span>
                  </div>
                  <div className="py-2.5 flex justify-between">
                    <span className="text-gray-500">Database Size</span>
                    <span className="font-medium text-gray-900 dark:text-zinc-100">{health?.dbSize || "—"}</span>
                  </div>
                  <div className="py-2.5 flex justify-between">
                    <span className="text-gray-500">Connection Pool</span>
                    <span className="font-medium text-emerald-600 dark:text-emerald-400">
                      {health?.dbStatus || "Healthy"} (Active)
                    </span>
                  </div>
                  <div className="py-2.5 flex justify-between">
                    <span className="text-gray-500">Node Process Uptime</span>
                    <span className="font-medium text-gray-900 dark:text-zinc-100">
                      {health?.uptimeSeconds
                        ? `${Math.floor(health.uptimeSeconds / 3600)}h ${Math.floor((health.uptimeSeconds % 3600) / 60)}m`
                        : "Active"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Uploads Diagnostics */}
              <div className="rounded-xl border border-gray-200 dark:border-white/10 p-5 bg-white dark:bg-card">
                <h4 className="font-semibold text-sm text-gray-900 dark:text-zinc-100 mb-4 flex items-center gap-2">
                  <i className="ph-bold ph-folder text-gray-500"></i>
                  Physical Artifact Storage Volumes
                </h4>

                <div className="divide-y divide-gray-100 dark:divide-white/5 text-xs">
                  <div className="py-2.5 flex justify-between items-center">
                    <div>
                      <span className="block font-medium text-gray-900 dark:text-zinc-100">Registrar Scans Volume</span>
                      <span className="text-[11px] text-gray-400 font-mono">.local/uploads/</span>
                    </div>
                    <span className="font-medium text-gray-900 dark:text-zinc-100">
                      {health?.storage?.registrar?.fileCount ?? 0} files ({health?.storage?.registrar?.formatted || "0 KB"})
                    </span>
                  </div>

                  <div className="py-2.5 flex justify-between items-center">
                    <div>
                      <span className="block font-medium text-gray-900 dark:text-zinc-100">OSAS Proposals Volume</span>
                      <span className="text-[11px] text-gray-400 font-mono">.local/osas/uploads/</span>
                    </div>
                    <span className="font-medium text-gray-900 dark:text-zinc-100">
                      {health?.storage?.osas?.fileCount ?? 0} files ({health?.storage?.osas?.formatted || "0 KB"})
                    </span>
                  </div>

                  <div className="py-2.5 flex justify-between items-center font-semibold">
                    <span className="text-gray-700 dark:text-zinc-300">Total Managed Files</span>
                    <span className="text-gray-900 dark:text-zinc-100">
                      {health?.storage?.totalFiles ?? 0} files ({health?.storage?.totalFormatted || "0 KB"})
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Danger Zone: Database Wipe */}
            <div className="p-5 rounded-xl border border-red-200/60 dark:border-red-950/30 bg-red-50/20 dark:bg-red-950/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h4 className="font-semibold text-sm text-red-900 dark:text-red-300">
                  Institutional Database Reset
                </h4>
                <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5 max-w-xl">
                  Truncates all tables, documents, student records, and request history, returning the system to a freshly bootstrapped clean state.
                </p>
              </div>

              <Button
                onClick={() => setResetOpen(true)}
                className="bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-xl h-10 px-5 shrink-0 cursor-pointer shadow-xs active:scale-95 transition-all"
              >
                <i className="ph-bold ph-trash mr-1.5"></i>
                Reset Database
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Standardized Request / Proposal Details Modal (Matching DocumentRequestsTab & GlobalStaffTab) */}
      {selectedItem && (
        <Dialog open={!!selectedItem} onOpenChange={() => setSelectedItem(null)}>
          <DialogContent className="sm:max-w-md p-0 overflow-hidden bg-white border border-gray-200 shadow-2xl rounded-brand dark:bg-card dark:border-white/10">
            {/* Standardized Header */}
            <DialogHeader className="p-6 border-b border-gray-100 bg-gray-50 dark:border-white/10 dark:bg-white/5">
              <div className="flex items-start gap-4">
                <div className={cn(
                  "w-12 h-12 rounded-xl border shadow-sm flex items-center justify-center shrink-0",
                  selectedItem?.officeId === "registrar"
                    ? "border-red-100 dark:border-zinc-800 bg-red-50 text-pup-maroon dark:bg-red-950/30 dark:text-primary"
                    : "border-blue-100 dark:border-blue-900/40 bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400"
                )}>
                  <i className={cn("text-xl", selectedItem?.officeId === "registrar" ? "ph-duotone ph-file-text" : "ph-duotone ph-student")}></i>
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={cn(
                      "px-2 py-0.5 rounded-[6px] text-[11px] font-semibold",
                      selectedItem?.officeId === "registrar"
                        ? "bg-rose-50 text-pup-maroon border border-rose-200/60 dark:bg-rose-950/40 dark:text-rose-300"
                        : "bg-blue-50 text-blue-700 border border-blue-200/60 dark:bg-blue-950/40 dark:text-blue-300"
                    )}>
                      {selectedItem?.officeId === "registrar" ? "Registrar ODRS Request" : "OSAS Event Proposal"}
                    </span>
                    <span className="text-[11px] text-[#8E8E93] dark:text-zinc-500 font-mono">Ref: #{selectedItem?.id}</span>
                  </div>
                  <DialogTitle className="text-lg font-semibold tracking-tight text-gray-900 dark:text-zinc-50 truncate">
                    {selectedItem?.title}
                  </DialogTitle>
                  <DialogDescription className="text-xs font-medium text-gray-500 dark:text-zinc-400 mt-0.5">
                    Submitted on {selectedItem?.createdAt ? formatPHDateTime(selectedItem.createdAt) : "—"}
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            {/* Standardized Body with #F5F5F7 group boxes */}
            <div className="p-6 space-y-4 max-h-[65vh] overflow-y-auto">
              {/* Student Detail Group */}
              <div className="flex flex-col">
                <span className="text-[11px] font-semibold tracking-wider text-[#8E8E93] dark:text-zinc-400 mb-1.5 uppercase">
                  Applicant Student
                </span>
                <div className="w-full bg-[#F5F5F7] dark:bg-zinc-800/40 border border-[#E5E5EA] dark:border-white/10 rounded-[10px] p-[12px] text-[13px] font-medium text-[#111111] dark:text-zinc-50">
                  <div className="font-semibold text-gray-900 dark:text-zinc-50">{selectedItem?.studentName}</div>
                  <div className="text-[11px] text-[#8E8E93] dark:text-zinc-500 font-normal mt-0.5">{selectedItem?.studentNo}</div>
                </div>
              </div>

              {/* Document Type Group */}
              <div className="flex flex-col">
                <span className="text-[11px] font-semibold tracking-wider text-[#8E8E93] dark:text-zinc-400 mb-1.5 uppercase">
                  {selectedItem?.officeId === "registrar" ? "Document Type" : "Proposal Title"}
                </span>
                <div className="w-full bg-[#F5F5F7] dark:bg-zinc-800/40 border border-[#E5E5EA] dark:border-white/10 rounded-[10px] p-[12px] flex items-center justify-between">
                  <span className="inline-flex w-fit items-center justify-center rounded-[6px] bg-white dark:bg-zinc-800 border border-[#E5E5EA] dark:border-white/10 px-[8px] py-[3px] text-[11px] font-medium text-gray-900 dark:text-zinc-100">
                    {selectedItem?.title}
                  </span>
                  <span className={cn("inline-flex items-center justify-center rounded-[6px] px-[8px] py-[3px] text-[11px] font-medium", statusBadgeClass(selectedItem?.status))}>
                    {selectedItem?.status === "InProgress" ? "In Progress" : selectedItem?.status}
                  </span>
                </div>
              </div>

              {/* Organization (if OSAS) */}
              {selectedItem?.organizationName && (
                <div className="flex flex-col">
                  <span className="text-[11px] font-semibold tracking-wider text-[#8E8E93] dark:text-zinc-400 mb-1.5 uppercase">
                    Student Organization
                  </span>
                  <div className="w-full bg-[#F5F5F7] dark:bg-zinc-800/40 border border-[#E5E5EA] dark:border-white/10 rounded-[10px] p-[12px] text-[13px] text-[#111111] dark:text-zinc-100">
                    <div className="font-semibold text-blue-600 dark:text-blue-400">{selectedItem.organizationName}</div>
                    {selectedItem.eventDate && (
                      <div className="text-[11px] text-gray-500 mt-1 flex items-center gap-1">
                        <i className="ph-bold ph-calendar"></i>
                        Event Date: <strong>{selectedItem.eventDate.substring(0, 10)}</strong>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Notes / Description */}
              <div className="flex flex-col">
                <span className="text-[11px] font-semibold tracking-wider text-[#8E8E93] dark:text-zinc-400 mb-1.5 uppercase">
                  {selectedItem?.officeId === "registrar" ? "Request Notes" : "Proposal Description"}
                </span>
                <div className="w-full min-h-[60px] p-[12px] text-[13px] font-normal text-[#111111] dark:text-zinc-300 bg-[#F5F5F7] dark:bg-zinc-800/40 border border-[#E5E5EA] dark:border-white/10 rounded-[10px]">
                  {selectedItem?.notes || "No additional notes provided by student."}
                </div>
              </div>

              {/* Physical Archive Location (Standardized from DocumentRequestsTab) */}
              {selectedItem?.officeId === "registrar" && (
                <div className="rounded-[14px] border border-[#E5E5EA] p-[16px_20px] dark:border-white/10 bg-[#F5F5F7] dark:bg-white/3">
                  <div className="text-[11px] font-semibold tracking-wider text-[#8E8E93] dark:text-zinc-400 mb-1.5 uppercase">
                    Physical Archive Location
                  </div>
                  <div className="text-[13px] font-normal text-[#111111] dark:text-zinc-100">
                    Room 1 · Cabinet A · Drawer 1
                  </div>
                  <div className="text-[11px] text-gray-500 mt-1">
                    Student physical archive jacket verified in Registrar Records Room.
                  </div>
                </div>
              )}

              {/* Retention Policy Notice (Standardized from DocumentRequestsTab) */}
              {selectedItem?.officeId === "registrar" && selectedItem?.status === "Ready" && (
                <div className="rounded-brand border border-amber-200 bg-amber-50/40 p-3.5 dark:border-amber-950/40 dark:bg-amber-950/10 animate-in fade-in duration-fast">
                  <div className="flex gap-3">
                    <i className="ph-bold ph-calendar-blank text-amber-700 dark:text-amber-500 text-lg shrink-0 mt-0.5"></i>
                    <div className="text-[12px]">
                      <span className="font-semibold text-amber-950 dark:text-amber-300 block tracking-wider text-[10px] uppercase">
                        PUP ODRS Retention Policy
                      </span>
                      <span className="text-gray-600 dark:text-zinc-400 block mt-0.5 leading-normal">
                        Unclaimed academic credentials are scheduled for shredding after 90 days according to ODRS retention policy.
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* PDF File Attachment (for OSAS proposal) */}
              {selectedItem?.originalFilename && (
                <div className="p-3.5 rounded-[10px] border border-[#E5E5EA] dark:border-white/10 bg-[#F5F5F7] dark:bg-zinc-800/40 flex items-center justify-between">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400 flex items-center justify-center shrink-0">
                      <i className="ph-bold ph-file-pdf text-base"></i>
                    </div>
                    <div className="min-w-0">
                      <span className="font-semibold text-gray-900 dark:text-zinc-100 text-xs block truncate">
                        {selectedItem.originalFilename}
                      </span>
                      {selectedItem.sizeBytes && (
                        <span className="text-[10px] text-gray-400 font-mono">
                          {(selectedItem.sizeBytes / 1024).toFixed(1)} KB · PDF Document
                        </span>
                      )}
                    </div>
                  </div>

                  <a
                    href={`/api/osas/event-proposals/${selectedItem.originalId}?file=1`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 hover:underline shrink-0"
                  >
                    <i className="ph-bold ph-arrow-square-out"></i> View PDF
                  </a>
                </div>
              )}
            </div>

            {/* Standardized Footer */}
            <DialogFooter className="p-4 border-t border-gray-100 bg-gray-50 dark:border-white/10 dark:bg-white/5 flex items-center justify-between">
              <div className="text-[11px] text-gray-400 font-mono">
                Status: <strong className="text-gray-700 dark:text-zinc-200">{selectedItem?.status}</strong>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedItem(null)}
                className="rounded-xl border-gray-300 dark:border-white/10 text-xs font-semibold cursor-pointer"
              >
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Confirmation Modal */}
      <ConfirmModal
        open={resetOpen}
        title="Wipe & Reset Institutional Database"
        message="This operation will permanently delete ALL office databases, schemas, documents, document requests, event proposals, and audit logs. The system will be bootstrapped back to a clean state. This action is irreversible."
        confirmLabel="Wipe Database"
        variant="danger"
        onConfirm={handleResetDb}
        onCancel={() => setResetOpen(false)}
        isLoading={resetLoading}
      />
    </div>
  )
}
