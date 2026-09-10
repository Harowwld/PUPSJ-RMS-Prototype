"use client"

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import KpiStatCardsSkeleton from "@/components/systemadmin/skeletons/KpiStatCardsSkeleton"
import TransactionsTableSkeleton from "@/components/systemadmin/skeletons/TransactionsTableSkeleton"
import { Select } from "@/components/ui/select"
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
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
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import PageHeader from "@/components/shared/PageHeader"
import { RefreshButton } from "@/components/shared/RefreshButton"
import PDFPreviewModal from "@/components/shared/PDFPreviewModal"
import { formatPHDateTime, formatRelativeTime } from "@/lib/timeFormat"
import { cn } from "@/lib/utils"
import { getCachedData, setCachedData, invalidateDataCache } from "@/lib/dataCache"

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

export default function CampusOperationsTab({ showToast }) {
  const [health, setHealth] = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [activeTab, setActiveTab] = useState("all") // "all" | "registrar" | "osas" | "status"
  const [autoRefreshSecs] = useState(15)

  // Filters & Sorting
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("All")
  const [sortBy, setSortBy] = useState("createdAt")
  const [sortOrder, setSortOrder] = useState("DESC")
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  // Stat Cards dropdown state
  const [selectedKpi, setSelectedKpi] = useState(null)
  const statCardsRef = useRef(null)

  // Request Details Modal
  const [selectedItem, setSelectedItem] = useState(null)
  const [pdfPreviewOpen, setPdfPreviewOpen] = useState(false)
  const [pdfPreviewData, setPdfPreviewData] = useState(null)

  const handleOpenPdfPreview = (item) => {
    if (!item?.originalFilename) return
    const url = item.officeId === "registrar"
      ? `/api/documents/${item.linkedDocumentId || item.originalId}`
      : `/api/osas/event-proposals/${item.originalId}?file=1`
    setPdfPreviewData({
      url,
      title: item.title || item.originalFilename,
      studentName: item.studentName,
      docType: item.officeId === "registrar" ? "Document Request" : "Event Proposal",
      originalFilename: item.originalFilename,
    })
    setPdfPreviewOpen(true)
  }

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
    if (!isManual) {
      const cached = getCachedData("systemadmin_health")
      if (cached) {
        setHealth(cached)
        setLoading(false)
      }
    }
    if (isManual) setRefreshing(true)
    try {
      const url = isManual ? "/api/system/health?force=true" : "/api/system/health"
      const res = await fetch(url, { cache: "no-store" })
      const json = await res.json()
      if (res.ok && json.ok) {
        setHealth(json.data)
        setCachedData("systemadmin_health", json.data, 15000)
      }
    } catch (err) {
      console.error("[OperationsMonitor] Fetch failed:", err)
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


  const handleSort = (column) => {
    if (sortBy === column) {
      setSortOrder((prev) => (prev === "ASC" ? "DESC" : "ASC"))
    } else {
      setSortBy(column)
      setSortOrder("ASC")
    }
  }

  // Filtered transactions for cross-department activity stream
  const filteredTransactions = useMemo(() => {
    if (!health?.transactions) return []
    return health.transactions.filter((tx) => {
      // Channel tab filter
      if (activeTab === "registrar" && tx.officeId !== "registrar") return false
      if (activeTab === "osas" && tx.officeId !== "osas") return false

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
  }, [health?.transactions, activeTab, statusFilter, search])

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
  const startIndex = (page - 1) * pageSize
  const endIndex = startIndex + pageSize
  const paginatedTransactions = useMemo(() => {
    return sortedTransactions.slice(startIndex, endIndex)
  }, [sortedTransactions, startIndex, endIndex])

  // Reset page when filters change
  useEffect(() => {
    setPage(1)
  }, [search, statusFilter, activeTab, pageSize])

  // Non-tech friendly Top 3 Stat Cards (Focused on University Operations)
  const statCardsData = useMemo(() => [
    {
      key: "odrs",
      label: "Registrar Document Requests",
      value: health?.odrs?.total ?? 0,
      sublabel: `${health?.odrs?.activeBacklog ?? 0} needing action · ${health?.odrs?.today ?? 0} received today`,
      color: "blue",
      shape1: "from-[#0055FF]/40 to-[#007AFF]/0",
      shape2: "from-[#14C8FF]/30 to-[#007AFF]/0",
      bg: "from-[#14C8FF] via-[#007AFF] to-[#0055FF] dark:from-[#007AFF] dark:to-[#0033aa]",
      glass: "glass-stat-card-blue",
    },
    {
      key: "osas",
      label: "OSAS Student Org Proposals",
      value: health?.osas?.total ?? 0,
      sublabel: `${health?.osas?.activePending ?? 0} awaiting review · ${health?.osas?.totalOrgs ?? 0} student orgs active`,
      color: "emerald",
      shape1: "from-[#047857]/40 to-[#059669]/0",
      shape2: "from-[#34d399]/30 to-[#059669]/0",
      bg: "from-[#34d399] via-[#059669] to-[#047857] dark:from-[#059669] dark:to-[#024e37]",
      glass: "glass-stat-card-green",
    },
    {
      key: "status",
      label: "Campus Online Services",
      value: health?.onlineServices?.allActive
        ? "All Active"
        : `${health?.onlineServices?.activeCount ?? 0} of ${health?.onlineServices?.totalCount ?? 4} Active`,
      sublabel: `${health?.onlineServices?.archive?.totalDocuments ?? health?.storage?.totalFiles ?? 0} documents archived · ${health?.onlineServices?.studentPortal?.activeAccounts ?? 0} active student accounts`,
      color: "amber",
      shape1: "from-[#b45309]/40 to-[#d97706]/0",
      shape2: "from-[#fbbf24]/30 to-[#d97706]/0",
      bg: "from-[#fbbf24] via-[#d97706] to-[#b45309] dark:from-[#d97706] dark:to-[#78350f]",
      glass: "glass-stat-card-orange",
    },
  ], [health])

  return (
    <div className="flex flex-col gap-6 w-full animate-fade-up font-inter">
      {/* Signature 3 Stat Cards with expandable details */}
      {loading && !health ? (
        <KpiStatCardsSkeleton count={3} />
      ) : (
        <div
          ref={statCardsRef}
          className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 items-start relative z-20 transition-all duration-500"
        >
          {statCardsData.map((stat) => (
            <div
              key={stat.key}
              className={cn(
                "relative group rounded-2xl",
                selectedKpi === stat.key ? "z-30" : "z-10"
              )}
            >
              <div
                onClick={() => setSelectedKpi(selectedKpi === stat.key ? null : stat.key)}
                className={cn(
                  "relative overflow-hidden rounded-2xl border-none p-5 cursor-pointer bg-gradient-to-br select-none shadow-sm hover:shadow-md transition-shadow",
                  stat.bg,
                  stat.glass
                )}
              >
                <div className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none z-0">
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
                      <div className="text-[38px] lg:text-[44px] font-semibold text-white tracking-tight leading-tight">
                        {stat.value}
                      </div>
                      <div className="mt-1 text-[13px] font-normal text-white/90">
                        {stat.sublabel}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Expandable details drawer */}
              <div
                className={cn(
                  "absolute top-full left-0 right-0 z-[100] mt-2 rounded-2xl bg-gradient-to-br p-5 shadow-2xl transition-all duration-300 ease-in-out origin-top",
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
                        <span className="text-base font-black">{health?.odrs?.pending ?? 0}</span>
                      </div>
                      <div className="bg-white/10 backdrop-blur-sm p-2.5 rounded-lg">
                        <span className="block text-[9px] font-bold text-white/70 uppercase tracking-wider">In Progress</span>
                        <span className="text-base font-black">{health?.odrs?.inProgress ?? 0}</span>
                      </div>
                      <div className="bg-white/10 backdrop-blur-sm p-2.5 rounded-lg">
                        <span className="block text-[9px] font-bold text-white/70 uppercase tracking-wider">Ready for Pickup</span>
                        <span className="text-base font-black">{health?.odrs?.ready ?? 0}</span>
                      </div>
                      <div className="bg-white/10 backdrop-blur-sm p-2.5 rounded-lg">
                        <span className="block text-[9px] font-bold text-white/70 uppercase tracking-wider">Completed</span>
                        <span className="text-base font-black">{health?.odrs?.completed ?? 0}</span>
                      </div>
                    </div>
                    <div className="bg-white/10 backdrop-blur-sm p-2.5 rounded-lg text-xs text-white/90 leading-relaxed">
                      Online requests for Official Transcripts (TOR), Certifications, and Good Moral documents filed through the student portal.
                    </div>
                  </div>
                )}

                {stat.key === "osas" && (
                  <div className="space-y-3 text-white">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-white/10 backdrop-blur-sm p-2.5 rounded-lg">
                        <span className="block text-[9px] font-bold text-white/70 uppercase tracking-wider">Submitted</span>
                        <span className="text-base font-black">{health?.osas?.submitted ?? 0}</span>
                      </div>
                      <div className="bg-white/10 backdrop-blur-sm p-2.5 rounded-lg">
                        <span className="block text-[9px] font-bold text-white/70 uppercase tracking-wider">In Review</span>
                        <span className="text-base font-black">{health?.osas?.underReview ?? 0}</span>
                      </div>
                      <div className="bg-white/10 backdrop-blur-sm p-2.5 rounded-lg">
                        <span className="block text-[9px] font-bold text-white/70 uppercase tracking-wider">Needs Revision</span>
                        <span className="text-base font-black">{health?.osas?.needsRevision ?? 0}</span>
                      </div>
                      <div className="bg-white/10 backdrop-blur-sm p-2.5 rounded-lg">
                        <span className="block text-[9px] font-bold text-white/70 uppercase tracking-wider">Approved</span>
                        <span className="text-base font-black">{health?.osas?.approved ?? 0}</span>
                      </div>
                    </div>
                    <div className="bg-white/10 backdrop-blur-sm p-2.5 rounded-lg text-xs text-white/90 leading-relaxed">
                      Campus student organization event permits, activity proposals, and annual compliance submissions for OSAS review.
                    </div>
                  </div>
                )}

                {stat.key === "status" && (
                  <div className="space-y-3 text-white">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-white/10 backdrop-blur-sm p-2.5 rounded-lg">
                        <span className="block text-[9px] font-bold text-white/70 uppercase tracking-wider">Student Portal</span>
                        <span className="text-base font-black flex items-center gap-1.5">
                          <span className={cn("w-2 h-2 rounded-full", health?.onlineServices?.studentPortal?.status === "Operational" ? "bg-emerald-400 animate-pulse" : "bg-amber-400")}></span>
                          {health?.onlineServices?.studentPortal?.status || "Operational"}
                        </span>
                      </div>
                      <div className="bg-white/10 backdrop-blur-sm p-2.5 rounded-lg">
                        <span className="block text-[9px] font-bold text-white/70 uppercase tracking-wider">Registrar ODRS</span>
                        <span className="text-base font-black flex items-center gap-1.5">
                          <span className={cn("w-2 h-2 rounded-full", health?.onlineServices?.odrs?.status === "Operational" ? "bg-emerald-400 animate-pulse" : "bg-amber-400")}></span>
                          {health?.onlineServices?.odrs?.status || "Operational"}
                        </span>
                      </div>
                      <div className="bg-white/10 backdrop-blur-sm p-2.5 rounded-lg">
                        <span className="block text-[9px] font-bold text-white/70 uppercase tracking-wider">OSAS Proposals</span>
                        <span className="text-base font-black flex items-center gap-1.5">
                          <span className={cn("w-2 h-2 rounded-full", health?.onlineServices?.osas?.status === "Operational" ? "bg-emerald-400 animate-pulse" : "bg-amber-400")}></span>
                          {health?.onlineServices?.osas?.status || "Operational"}
                        </span>
                      </div>
                      <div className="bg-white/10 backdrop-blur-sm p-2.5 rounded-lg">
                        <span className="block text-[9px] font-bold text-white/70 uppercase tracking-wider">Digital Archives</span>
                        <span className="text-base font-black">{health?.onlineServices?.archive?.totalDocuments ?? health?.storage?.totalFiles ?? 0} files</span>
                      </div>
                    </div>
                    <div className="bg-white/10 backdrop-blur-sm p-2.5 rounded-lg text-xs text-white/90 leading-relaxed">
                      {health?.onlineServices?.allActive
                        ? "All campus-facing online portals and departmental services are functioning normally."
                        : `${health?.onlineServices?.activeCount ?? 0} of ${health?.onlineServices?.totalCount ?? 4} institutional services currently operational.`}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Main Container Card */}
      <Card className="flex h-auto w-full flex-col p-0 gap-0 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-card dark:shadow-none">
        {/* Header */}
        <PageHeader
          icon="ph-bold ph-activity"
          title="Campus Services & Operations Monitor"
          description="Live tracking of university online services, student document requests, and student organization proposals across departments."
          showBorder={false}
          titleClassName="text-[18px] font-semibold tracking-[-0.01em] text-gray-900 dark:text-zinc-50"
          descriptionClassName="text-[13px] font-normal text-gray-500 dark:text-zinc-400 mt-[4px]"
          actions={
            <div className="flex items-center gap-2">
              {/* Online Status Pill */}
              {health?.onlineServices?.allActive ? (
                <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/40">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  All Services Online
                </span>
              ) : (
                <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200/60 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/40">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                  {health?.onlineServices?.activeCount ?? 0} of {health?.onlineServices?.totalCount ?? 4} Services Online
                </span>
              )}

              <RefreshButton
                onRefresh={() => fetchHealth(true)}
                isLoading={refreshing}
                title="Refresh Operations Health"
              />

            </div>
          }
        />

        {/* Navigation Toolbar */}
        <div className="border-t border-gray-100 dark:border-white/10 p-5 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 bg-gray-50/40 dark:bg-zinc-900/30">
          {/* View Filter Pills */}
          <div className="flex items-center gap-1 bg-gray-100/80 dark:bg-zinc-800/60 p-1 rounded-xl border border-gray-200/60 dark:border-white/5 shrink-0 overflow-x-auto">
            <button
              onClick={() => setActiveTab("all")}
              className={cn(
                "px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap",
                activeTab === "all"
                  ? "bg-white dark:bg-zinc-700 text-gray-900 dark:text-white shadow-xs"
                  : "text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white"
              )}
            >
              All Campus Activity ({health?.transactions?.length || 0})
            </button>

            <button
              onClick={() => setActiveTab("registrar")}
              className={cn(
                "px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap",
                activeTab === "registrar"
                  ? "bg-white dark:bg-zinc-700 text-pup-maroon dark:text-rose-400 shadow-xs"
                  : "text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white"
              )}
            >
              Registrar Requests ({health?.odrs?.total || 0})
            </button>

            <button
              onClick={() => setActiveTab("osas")}
              className={cn(
                "px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap",
                activeTab === "osas"
                  ? "bg-white dark:bg-zinc-700 text-blue-600 dark:text-blue-400 shadow-xs"
                  : "text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white"
              )}
            >
              OSAS Proposals ({health?.osas?.total || 0})
            </button>

            <button
              onClick={() => setActiveTab("status")}
              className={cn(
                "px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5",
                activeTab === "status"
                  ? "bg-white dark:bg-zinc-700 text-emerald-700 dark:text-emerald-300 shadow-xs"
                  : "text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white"
              )}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              Online Services Status
            </button>
          </div>

          {/* Search & Status Filter (shown when on activity tabs) */}
          {activeTab !== "status" && (
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
              <div className="w-full sm:w-[280px] relative group shrink-0">
                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                  <i className="ph-bold ph-magnifying-glass text-gray-400 transition-colors group-focus-within:text-pup-maroon text-sm"></i>
                </div>
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search student, document, or org..."
                  className="h-9 w-full rounded-xl border border-gray-200 dark:border-white/10 bg-white pl-8 pr-16 text-xs font-normal placeholder:text-[#8E8E93] dark:bg-card focus-visible:ring-pup-maroon shadow-none"
                />
                <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-[11px] text-gray-400 dark:text-zinc-500 font-mono">
                  {sortedTransactions.length} results
                </div>
              </div>

              <div className="w-full sm:w-[160px] shrink-0">
                <Select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="h-9 rounded-xl border border-gray-200 dark:border-white/10 text-xs font-normal text-[#111111] dark:text-zinc-200 cursor-pointer shadow-none"
                  menuClassName="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-900 shadow-2xl p-1.5"
                  optionClassName="rounded-lg text-xs font-medium py-1.5 px-2.5 hover:bg-gray-100 dark:hover:bg-zinc-800"
                >
                  <option value="All">All Stages</option>
                  <option value="ActionRequired">Action Needed</option>
                  <option value="Completed">Completed / Approved</option>
                </Select>
              </div>
            </div>
          )}
        </div>

        {/* Content View 1: Cross-Department Activity Stream Table */}
        {activeTab !== "status" && (
          <div className="overflow-hidden border-t border-gray-200 dark:border-white/10 bg-white dark:bg-card flex flex-col flex-1">
            {loading ? (
              <TransactionsTableSkeleton rowCount={8} />
            ) : paginatedTransactions.length === 0 ? (
              <div className="flex h-[360px] flex-col items-center justify-center p-6 text-center">
                <Empty className="flex flex-col items-center justify-center border-0 bg-transparent text-center">
                  <EmptyHeader className="flex flex-col items-center gap-0">
                    <div className="relative mb-6">
                      <div className="absolute inset-0 scale-150 animate-pulse rounded-full bg-gray-50 opacity-50 dark:bg-card"></div>
                      <EmptyMedia className="relative z-10 flex h-20 w-20 items-center justify-center rounded-2xl border border-gray-100 bg-white shadow-md dark:border-white/10 dark:bg-card">
                        <i className="ph-bold ph-tray text-3xl text-gray-400 dark:text-zinc-500"></i>
                      </EmptyMedia>
                    </div>
                    <EmptyTitle className="text-lg font-semibold text-gray-900 dark:text-zinc-50">
                      No Records Found
                    </EmptyTitle>
                    <EmptyDescription className="max-w-xs text-xs font-normal text-gray-500 dark:text-zinc-400 mt-1">
                      {search || statusFilter !== "All"
                        ? "No student requests or proposals match your search or stage filter."
                        : "There are currently no active document requests or event proposals recorded."}
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
                          Department <SortIndicator column="officeId" sortBy={sortBy} sortOrder={sortOrder} />
                        </button>
                      </th>
                      <th className="p-4 min-w-[200px]">
                        <button
                          onClick={() => handleSort("studentName")}
                          className={cn(
                            "group flex items-center transition-colors focus:outline-none cursor-pointer text-[12px] font-medium tracking-[0.04em]",
                            sortBy === "studentName" ? "text-[#111111] dark:text-white" : "text-[#8E8E93] dark:text-zinc-500 hover:text-[#111111] dark:hover:text-white"
                          )}
                        >
                          Student Requester <SortIndicator column="studentName" sortBy={sortBy} sortOrder={sortOrder} />
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
                          Document or Proposal Title <SortIndicator column="title" sortBy={sortBy} sortOrder={sortOrder} />
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
                          Student Org / Details <SortIndicator column="organizationName" sortBy={sortBy} sortOrder={sortOrder} />
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
                          Stage Status <SortIndicator column="status" sortBy={sortBy} sortOrder={sortOrder} />
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
                        Actions
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
                          {/* Department Badge */}
                          <td className="p-4 align-middle">
                            {isRegistrar ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] text-[11px] font-semibold bg-[#800000]/10 text-pup-maroon dark:bg-pup-maroon/20 dark:text-rose-300">
                                <i className="ph-bold ph-certificate text-xs"></i>
                                Registrar
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] text-[11px] font-semibold bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
                                <i className="ph-bold ph-student text-xs"></i>
                                OSAS
                              </span>
                            )}
                          </td>

                          {/* Student Requester */}
                          <td className="p-4 align-middle">
                            <div className="font-semibold text-[13px] text-gray-900 dark:text-zinc-50">
                              {tx.studentName}
                            </div>
                            <div className="text-[11px] font-mono text-[#8E8E93] dark:text-zinc-500 mt-0.5">
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
                                {tx.notes || "Standard student request"}
                              </div>
                            )}
                          </td>

                          {/* Stage Status Badge */}
                          <td className="p-4 align-middle">
                            <span className={cn(
                              "inline-flex items-center justify-center rounded-[6px] px-[8px] py-[3px] text-[11px] font-medium whitespace-nowrap",
                              statusBadgeClass(tx.status)
                            )}>
                              {tx.status === "InProgress" ? "In Progress" : tx.status}
                            </span>
                          </td>

                          {/* Date Submitted */}
                          <td className="p-4 align-middle text-[12px] text-gray-500 dark:text-zinc-400 whitespace-nowrap font-mono">
                            {rel.relative || rel.date}
                          </td>

                          {/* Action Button */}
                          <td className="py-0 px-4 pr-6 text-right align-middle" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button
                                    onClick={() => setSelectedItem(tx)}
                                    aria-label="View Details"
                                    className="w-7 h-7 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-zinc-100 focus:outline-none cursor-pointer active:scale-95 flex items-center justify-center transition-colors border-0 bg-transparent"
                                  >
                                    <i className="ph-bold ph-eye text-[16px]"></i>
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent>View Details</TooltipContent>
                              </Tooltip>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination Footer */}
            {sortedTransactions.length > 0 && (
              <div className="flex items-center justify-between border-t border-[#e5e5ea] dark:border-[#3a3a3c] bg-white dark:bg-[#1c1c1e] p-4 px-6 rounded-b-2xl">
                <div className="flex items-center gap-6 text-xs text-gray-500 dark:text-zinc-400 select-none">
                  <span>
                    Showing {paginatedTransactions.length} of {sortedTransactions.length}
                  </span>
                  <div className="flex items-center gap-2">
                    <span>Rows:</span>
                    {[10, 20, 50, 100].map((sz) => (
                      <button
                        key={sz}
                        type="button"
                        onClick={() => {
                          setPageSize(sz)
                          setPage(1)
                        }}
                        className={cn(
                          "px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer",
                          pageSize === sz
                            ? "bg-gray-100 dark:bg-zinc-800 text-gray-900 dark:text-zinc-100"
                            : "text-gray-400 hover:text-gray-600 dark:hover:text-zinc-200"
                        )}
                      >
                        {sz}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2 select-none">
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="text-xs text-gray-500 dark:text-zinc-400 disabled:opacity-40 cursor-pointer rounded-xl h-8 px-3"
                  >
                    Prev
                  </Button>

                  <div className="h-8 w-8 rounded-xl border border-[#e5e5ea] dark:border-zinc-800 flex items-center justify-center text-xs font-bold text-gray-800 dark:text-zinc-200 bg-white dark:bg-zinc-900">
                    {page}
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={page >= totalPages || endIndex >= sortedTransactions.length}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    className="text-xs text-gray-500 dark:text-zinc-400 disabled:opacity-40 cursor-pointer rounded-xl h-8 px-3"
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Content View 2: Simplified, Human-Friendly Online Services Status */}
        {activeTab === "status" && (
          <div className="border-t border-gray-100 dark:border-white/10 p-6 flex flex-col gap-6 bg-white dark:bg-card">
            {/* Overall Status Banner */}
            {health?.onlineServices?.allActive ? (
              <div className="p-6 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-900/40 flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center text-2xl shrink-0 shadow-sm">
                  <i className="ph-bold ph-check"></i>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-bold text-emerald-950 dark:text-emerald-300">
                    All Campus Online Portals Are Running Normally
                  </h3>
                  <p className="text-xs text-emerald-800/90 dark:text-emerald-400 mt-1 leading-relaxed">
                    Students, faculty, and administrative staff can submit credential requests, evaluate proposals, and access archives without interruption.
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-3 text-xs font-medium text-emerald-900 dark:text-emerald-300">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                      {health?.onlineServices?.activeCount ?? 4} of {health?.onlineServices?.totalCount ?? 4} Campus Services Active
                    </span>
                    <span>•</span>
                    <span>Verified {health?.onlineServices?.lastVerifiedAt ? formatRelativeTime(health.onlineServices.lastVerifiedAt).relative : "Just now"}</span>
                    <span>•</span>
                    <span className="text-emerald-700/80 dark:text-emerald-400/80">Direct Database Telemetry</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-6 rounded-2xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-900/40 flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-amber-600 text-white flex items-center justify-center text-2xl shrink-0 shadow-sm">
                  <i className="ph-bold ph-warning"></i>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-bold text-amber-950 dark:text-amber-300">
                    {health?.onlineServices?.activeCount ?? 0} of {health?.onlineServices?.totalCount ?? 4} Campus Services Active
                  </h3>
                  <p className="text-xs text-amber-800/90 dark:text-amber-400 mt-1 leading-relaxed">
                    One or more campus online portals or departmental modules are currently disabled or undergoing maintenance.
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-3 text-xs font-medium text-amber-900 dark:text-amber-300">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                      Attention Required
                    </span>
                    <span>•</span>
                    <span>Verified {health?.onlineServices?.lastVerifiedAt ? formatRelativeTime(health.onlineServices.lastVerifiedAt).relative : "Just now"}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Portal Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* Card 1: Student Self-Service Portal */}
              <div className="p-5 rounded-2xl border border-gray-200/80 dark:border-white/10 bg-white dark:bg-zinc-900/30 flex flex-col justify-between shadow-2xs">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300 flex items-center justify-center text-xl">
                      <i className="ph-bold ph-user-check"></i>
                    </div>
                    {health?.onlineServices?.studentPortal?.status === "Operational" ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                        Operational
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-gray-100 text-gray-700 dark:bg-zinc-800 dark:text-zinc-300">
                        <span className="w-1.5 h-1.5 rounded-full bg-gray-400"></span>
                        {health?.onlineServices?.studentPortal?.status || "Idle"}
                      </span>
                    )}
                  </div>
                  <h4 className="font-semibold text-sm text-gray-900 dark:text-zinc-100">
                    Student Online Portal
                  </h4>
                  <p className="text-xs text-gray-500 dark:text-zinc-400 mt-1 leading-relaxed">
                    Student portal where students apply for credentials, submit activity permits, and track applications.
                  </p>

                  {/* Database Metrics */}
                  <div className="mt-4 pt-3 border-t border-gray-100 dark:border-white/5 space-y-2 text-xs">
                    <div className="flex items-center justify-between text-gray-600 dark:text-zinc-300">
                      <span>Registered Students:</span>
                      <strong className="text-gray-900 dark:text-zinc-100 font-semibold">
                        {health?.onlineServices?.studentPortal?.totalAccounts ?? 0} accounts
                      </strong>
                    </div>
                    <div className="flex items-center justify-between text-gray-600 dark:text-zinc-300">
                      <span>Active Accounts:</span>
                      <strong className="text-emerald-600 dark:text-emerald-400 font-semibold">
                        {health?.onlineServices?.studentPortal?.activeAccounts ?? 0} active
                      </strong>
                    </div>
                    <div className="flex items-center justify-between text-gray-600 dark:text-zinc-300">
                      <span>Latest Registration:</span>
                      <strong className="text-gray-700 dark:text-zinc-300 font-medium">
                        {health?.onlineServices?.studentPortal?.latestRegisteredAt
                          ? formatRelativeTime(health.onlineServices.studentPortal.latestRegisteredAt).relative
                          : "None recorded"}
                      </strong>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-gray-100 dark:border-white/5 text-xs text-gray-600 dark:text-zinc-300 flex items-center justify-between">
                  <span>Student Access:</span>
                  <strong className="text-emerald-600 dark:text-emerald-400 font-semibold">Available 24/7</strong>
                </div>
              </div>

              {/* Card 2: Registrar ODRS */}
              <div className="p-5 rounded-2xl border border-gray-200/80 dark:border-white/10 bg-white dark:bg-zinc-900/30 flex flex-col justify-between shadow-2xs">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 rounded-xl bg-red-50 text-pup-maroon dark:bg-red-950/50 dark:text-rose-300 flex items-center justify-center text-xl">
                      <i className="ph-bold ph-certificate"></i>
                    </div>
                    {health?.onlineServices?.odrs?.status === "Operational" ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                        Operational
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                        {health?.onlineServices?.odrs?.status || "Disabled"}
                      </span>
                    )}
                  </div>
                  <h4 className="font-semibold text-sm text-gray-900 dark:text-zinc-100">
                    Registrar Request Pipeline (ODRS)
                  </h4>
                  <p className="text-xs text-gray-500 dark:text-zinc-400 mt-1 leading-relaxed">
                    Document processing pipeline handling student transcripts, certifications, and graduation records.
                  </p>

                  {/* Database Metrics */}
                  <div className="mt-4 pt-3 border-t border-gray-100 dark:border-white/5 space-y-2 text-xs">
                    <div className="flex items-center justify-between text-gray-600 dark:text-zinc-300">
                      <span>Active Backlog:</span>
                      <strong className="text-gray-900 dark:text-zinc-100 font-semibold">
                        {health?.onlineServices?.odrs?.activeBacklog ?? 0} in progress ({health?.onlineServices?.odrs?.pending ?? 0} pending)
                      </strong>
                    </div>
                    <div className="flex items-center justify-between text-gray-600 dark:text-zinc-300">
                      <span>Received Today:</span>
                      <strong className="text-pup-maroon dark:text-rose-400 font-semibold">
                        {health?.onlineServices?.odrs?.today ?? 0} requests
                      </strong>
                    </div>
                    <div className="flex items-center justify-between text-gray-600 dark:text-zinc-300">
                      <span>Serving Station:</span>
                      <strong className="text-gray-700 dark:text-zinc-300 font-mono text-[11px]">
                        {health?.onlineServices?.odrs?.stationName || "Main Terminal"}
                      </strong>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-gray-100 dark:border-white/5 text-xs text-gray-600 dark:text-zinc-300 flex items-center justify-between">
                  <span>Latest Request:</span>
                  <strong className="text-gray-900 dark:text-zinc-100 font-medium">
                    {health?.onlineServices?.odrs?.latestRequestAt
                      ? formatRelativeTime(health.onlineServices.odrs.latestRequestAt).relative
                      : "None"}
                  </strong>
                </div>
              </div>

              {/* Card 3: OSAS Proposals */}
              <div className="p-5 rounded-2xl border border-gray-200/80 dark:border-white/10 bg-white dark:bg-zinc-900/30 flex flex-col justify-between shadow-2xs">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 flex items-center justify-center text-xl">
                      <i className="ph-bold ph-student"></i>
                    </div>
                    {health?.onlineServices?.osas?.status === "Operational" ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                        Operational
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                        {health?.onlineServices?.osas?.status || "Disabled"}
                      </span>
                    )}
                  </div>
                  <h4 className="font-semibold text-sm text-gray-900 dark:text-zinc-100">
                    OSAS Student Organization Gateway
                  </h4>
                  <p className="text-xs text-gray-500 dark:text-zinc-400 mt-1 leading-relaxed">
                    Activity permits and proposals intake gateway for recognized campus student organizations.
                  </p>

                  {/* Database Metrics */}
                  <div className="mt-4 pt-3 border-t border-gray-100 dark:border-white/5 space-y-2 text-xs">
                    <div className="flex items-center justify-between text-gray-600 dark:text-zinc-300">
                      <span>Awaiting Review:</span>
                      <strong className="text-gray-900 dark:text-zinc-100 font-semibold">
                        {health?.onlineServices?.osas?.activePending ?? 0} proposals ({health?.onlineServices?.osas?.submitted ?? 0} new)
                      </strong>
                    </div>
                    <div className="flex items-center justify-between text-gray-600 dark:text-zinc-300">
                      <span>Recognized Orgs:</span>
                      <strong className="text-blue-600 dark:text-blue-400 font-semibold">
                        {health?.onlineServices?.osas?.totalOrgs ?? 0} student orgs
                      </strong>
                    </div>
                    <div className="flex items-center justify-between text-gray-600 dark:text-zinc-300">
                      <span>Serving Station:</span>
                      <strong className="text-gray-700 dark:text-zinc-300 font-mono text-[11px]">
                        {health?.onlineServices?.osas?.stationName || "OSAS Terminal"}
                      </strong>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-gray-100 dark:border-white/5 text-xs text-gray-600 dark:text-zinc-300 flex items-center justify-between">
                  <span>Latest Submission:</span>
                  <strong className="text-gray-900 dark:text-zinc-100 font-medium">
                    {health?.onlineServices?.osas?.latestProposalAt
                      ? formatRelativeTime(health.onlineServices.osas.latestProposalAt).relative
                      : "None"}
                  </strong>
                </div>
              </div>
            </div>

            {/* Campus Data Safety & Archive Subsystem Summary */}
            <div className="p-5 rounded-2xl border border-gray-200/80 dark:border-white/10 bg-gray-50/50 dark:bg-zinc-900/30 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
              <div className="flex items-start sm:items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 flex items-center justify-center text-xl shrink-0 mt-0.5 sm:mt-0">
                  <i className="ph-bold ph-shield-check"></i>
                </div>
                <div>
                  <h4 className="font-semibold text-xs text-gray-900 dark:text-zinc-100 uppercase tracking-wider">
                    Institutional Record Safety & Protection Subsystem
                  </h4>
                  <p className="text-xs text-gray-600 dark:text-zinc-300 mt-0.5">
                    {health?.onlineServices?.archive?.totalDocuments ?? health?.storage?.totalFiles ?? 0} documents across {health?.onlineServices?.archive?.totalStudents ?? 0} student archive records securely preserved.
                  </p>
                  <div className="flex flex-wrap items-center gap-3 text-[11px] text-gray-500 dark:text-zinc-400 mt-1.5 font-mono">
                    <span>Backup: {health?.onlineServices?.archive?.latestBackupFilename || "Automated Snapshot"}</span>
                    <span>•</span>
                    <span>Verified: {health?.onlineServices?.archive?.lastBackupAt ? formatPHDateTime(health.onlineServices.archive.lastBackupAt) : "Automated"}</span>
                    <span>•</span>
                    <span>{health?.onlineServices?.archive?.totalBackups ?? 0} backups logged</span>
                  </div>
                </div>
              </div>

              <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1.5 rounded-xl border border-emerald-200/60 dark:border-emerald-800/40 shrink-0 flex items-center gap-1.5">
                <i className="ph-bold ph-check-circle text-emerald-600 dark:text-emerald-400"></i>
                {health?.onlineServices?.archive?.latestBackupStatus || "Safe & Synchronized"}
              </span>
            </div>
          </div>
        )}
      </Card>

      {/* Human-Friendly Details Modal */}
      {selectedItem && (
        <Dialog open={!!selectedItem} onOpenChange={() => setSelectedItem(null)}>
          <DialogContent className="sm:max-w-xl w-full rounded-2xl bg-white border border-gray-200 dark:bg-zinc-900 dark:border-white/10 p-0 shadow-2xl overflow-hidden flex flex-col gap-0">
            <DialogHeader className="p-6 pb-4 bg-white dark:bg-card border-b border-gray-100 dark:border-white/10 text-left">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    {selectedItem?.officeId === "registrar" ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] text-[11px] font-semibold bg-[#800000]/10 text-pup-maroon dark:bg-pup-maroon/20 dark:text-rose-300">
                        <i className="ph-bold ph-certificate text-xs"></i>
                        Registrar Document Request
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] text-[11px] font-semibold bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
                        <i className="ph-bold ph-student text-xs"></i>
                        OSAS Event Proposal
                      </span>
                    )}
                  </div>
                  <DialogTitle className="text-[16px] font-semibold tracking-[-0.01em] text-gray-900 dark:text-zinc-50 truncate">
                    {selectedItem?.title}
                  </DialogTitle>
                  <DialogDescription className="text-[12px] font-normal text-gray-500 dark:text-zinc-400 mt-1">
                    Submitted on {selectedItem?.createdAt ? formatPHDateTime(selectedItem.createdAt) : "—"}
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="p-6 space-y-4 max-h-[65vh] overflow-y-auto">
              {/* Requester & Stage */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="rounded-xl border border-gray-200/80 dark:border-white/10 bg-gray-50/70 dark:bg-zinc-800/40 p-3">
                  <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                    Student Requester
                  </span>
                  <div className="font-semibold text-xs text-gray-900 dark:text-zinc-50 truncate">
                    {selectedItem?.studentName}
                  </div>
                  <div className="text-[11px] font-mono text-gray-400 mt-0.5">
                    {selectedItem?.studentNo}
                  </div>
                </div>

                <div className="rounded-xl border border-gray-200/80 dark:border-white/10 bg-gray-50/70 dark:bg-zinc-800/40 p-3">
                  <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                    Current Stage
                  </span>
                  <div className="flex items-center justify-between mt-1">
                    <span className={cn(
                      "inline-flex items-center gap-1 rounded-[5px] px-2 py-0.5 text-[11px] font-semibold",
                      statusBadgeClass(selectedItem?.status)
                    )}>
                      {selectedItem?.status === "InProgress" ? "In Progress" : selectedItem?.status}
                    </span>
                    <span className="text-[11px] font-mono text-gray-400">
                      {formatRelativeTime(selectedItem?.createdAt).relative}
                    </span>
                  </div>
                </div>
              </div>

              {/* Organization (if OSAS) */}
              {selectedItem?.organizationName && (
                <div className="rounded-xl border border-gray-200/80 dark:border-white/10 bg-gray-50/70 dark:bg-zinc-800/40 p-3">
                  <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                    Student Organization Chapter
                  </span>
                  <div className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                    {selectedItem.organizationName}
                  </div>
                  {selectedItem.eventDate && (
                    <span className="text-[11px] font-mono text-gray-400 mt-1 block">
                      Scheduled Event Date: {selectedItem.eventDate.substring(0, 10)}
                    </span>
                  )}
                </div>
              )}

              {/* Notes / Purpose */}
              <div className="rounded-xl border border-gray-200/80 dark:border-white/10 bg-gray-50/70 dark:bg-zinc-800/40 p-3">
                <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                  Purpose / Remarks
                </span>
                <p className="text-xs text-gray-700 dark:text-zinc-300 leading-relaxed">
                  {selectedItem?.notes || "No special remarks provided by the applicant."}
                </p>
              </div>

              {/* Attached Document File */}
              {selectedItem?.originalFilename && (
                <div className="p-3 rounded-xl border border-gray-200/80 dark:border-white/10 bg-gray-50/70 dark:bg-zinc-800/40 flex items-center justify-between gap-3">
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

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenPdfPreview(selectedItem)}
                    className="text-xs font-semibold text-blue-600 dark:text-blue-400 bg-white dark:bg-zinc-800 border border-blue-200 dark:border-blue-900/40 hover:bg-blue-50 dark:hover:bg-blue-950/40 shrink-0 h-8 px-2.5 rounded-lg cursor-pointer shadow-xs active:scale-95 transition-all"
                  >
                    <i className="ph-bold ph-eye text-sm mr-1"></i> Preview PDF
                  </Button>
                </div>
              )}
            </div>

            <div className="px-6 py-4 bg-white dark:bg-card border-t border-gray-100 dark:border-white/10 flex items-center justify-between">
              <span className="text-xs text-gray-500 dark:text-zinc-400">
                Department: <strong className="text-gray-700 dark:text-zinc-200 uppercase font-semibold">{selectedItem?.officeId}</strong>
              </span>
              <Button
                type="button"
                variant="outline"
                onClick={() => setSelectedItem(null)}
                className="h-10 px-5 text-xs font-semibold rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-xs cursor-pointer active:scale-95 transition-all"
              >
                Close
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* PDF Document Preview Modal */}
      <PDFPreviewModal
        open={pdfPreviewOpen}
        onClose={() => {
          setPdfPreviewOpen(false)
          setPdfPreviewData(null)
        }}
        preview={pdfPreviewData}
      />
    </div>
  )
}
