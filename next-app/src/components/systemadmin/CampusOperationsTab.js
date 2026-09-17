"use client"

import LucideIcon from "@/components/shared/LucideIcon";
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
  DialogFooter,
} from "@/components/ui/dialog"
import PageHeader from "@/components/shared/PageHeader"
import { RefreshButton } from "@/components/shared/RefreshButton"
import PDFPreviewModal from "@/components/shared/PDFPreviewModal"
import { formatPHDateTime, formatRelativeTime } from "@/lib/timeFormat"
import { cn } from "@/lib/utils"
import { getCachedData, setCachedData, invalidateDataCache } from "@/lib/dataCache"

function SortIndicator({ column, sortBy, sortOrder }) {
  if (sortBy !== column) {
    return <LucideIcon  className="ph-bold ph-caret-up-down ml-1 text-[11px] text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity"></LucideIcon>
  }
  return sortOrder === "ASC" ? (
    <LucideIcon  className="ph-bold ph-caret-up ml-1 text-[11px] text-pup-maroon dark:text-primary animate-in fade-in zoom-in duration-normal"></LucideIcon>
  ) : (
    <LucideIcon  className="ph-bold ph-caret-down ml-1 text-[11px] text-pup-maroon dark:text-primary animate-in fade-in zoom-in duration-normal"></LucideIcon>
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
  const [activeTab, setActiveTab] = useState("all") // "all" | "registrar" | "osas"
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

  // Non-tech friendly Top 2 Stat Cards (Focused on University Operations)
  const statCardsData = useMemo(() => [
    {
      key: "odrs",
      label: "Registrar Document Requests",
      value: health?.odrs?.total ?? 0,
      sublabel: `${health?.odrs?.activeBacklog ?? 0} needing action · ${health?.odrs?.today ?? 0} received today`,
      color: "blue",
    },
    {
      key: "osas",
      label: "OSAS Student Org Proposals",
      value: health?.osas?.total ?? 0,
      sublabel: `${health?.osas?.activePending ?? 0} awaiting review · ${health?.osas?.totalOrgs ?? 0} student orgs active`,
      color: "emerald",
    },
  ], [health])

  return (
    <div className="animate-fade-up font-jakarta flex flex-1 flex-col h-full min-h-0 w-full gap-6">
      {/* ONE Single Card Container encapsulating Header, Metrics, Toolbar, Table & Pagination */}
      <Card className="flex h-auto w-full flex-col p-0 gap-0 overflow-visible rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-card dark:shadow-none isolate font-jakarta mb-4 min-h-0 flex-1">
        {/* Header */}
        <PageHeader
          icon="ph-bold ph-activity"
          title="Campus Services & Operations Monitor"
          description="Live tracking of student document requests and student organization proposals across campus departments."
          showBorder={false}
          className="p-6"
          titleClassName="text-[18px] font-semibold tracking-[-0.01em] text-gray-900 dark:text-zinc-50"
          descriptionClassName="text-[13px] font-normal text-gray-500 dark:text-zinc-400 mt-[4px]"
          actions={
            <div className="flex items-center gap-2">
              <RefreshButton
                onRefresh={() => fetchHealth(true)}
                isLoading={refreshing}
                title="Refresh Operations Health"
              />
            </div>
          }
        />

        {/* Signature 2 Stat Cards with expandable details */}
        {loading && !health ? (
          <div className="px-6 pb-6">
            <KpiStatCardsSkeleton count={2} />
          </div>
        ) : (
          <div className="px-6 pb-6">
            <div
              ref={statCardsRef}
              className="grid grid-cols-1 gap-4 md:grid-cols-2 items-start relative z-20 transition-all duration-500"
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
                      "relative overflow-hidden rounded-xl border p-4 cursor-pointer select-none transition-all",
                      "border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-zinc-900/30 hover:border-gray-200 dark:hover:border-white/10",
                      selectedKpi === stat.key && (stat.color === "blue" ? "border-blue-500/40 ring-1 ring-blue-500/20" : "border-emerald-500/40 ring-1 ring-emerald-500/20")
                    )}
                  >
                    <div className="relative z-10">
                      <div className="mb-1 flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-zinc-500">
                          {stat.label}
                        </span>
                        <LucideIcon  className={cn("ph-bold ph-caret-down text-xs text-gray-400 transition-transform duration-300", selectedKpi === stat.key && "rotate-180")} />
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-black text-gray-900 dark:text-zinc-50 tracking-tight">
                          {typeof stat.value === "number" ? stat.value.toLocaleString() : stat.value}
                        </span>
                        <span className={cn("text-xs font-medium", 
                          stat.color === "blue" ? "text-blue-600 dark:text-blue-400" : "text-emerald-600 dark:text-emerald-400"
                        )}>
                          {stat.sublabel}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Expandable details drawer */}
                  <div
                    className={cn(
                      "absolute top-full left-0 right-0 z-[100] mt-2 rounded-xl border border-gray-200 bg-white p-4 shadow-xl dark:border-white/10 dark:bg-zinc-900 transition-all duration-300 ease-in-out origin-top",
                      selectedKpi === stat.key ? "scale-y-100 opacity-100 translate-y-0" : "scale-y-95 opacity-0 -translate-y-2 pointer-events-none"
                    )}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {stat.key === "odrs" && (
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-2">
                          <div className="bg-gray-50 dark:bg-zinc-800/60 p-2.5 rounded-lg border border-gray-100 dark:border-white/5">
                            <span className="block text-[9px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-wider">Pending Action</span>
                            <span className="text-base font-black text-gray-900 dark:text-zinc-50">{health?.odrs?.pending ?? 0}</span>
                          </div>
                          <div className="bg-blue-50 dark:bg-blue-950/30 p-2.5 rounded-lg border border-blue-100 dark:border-blue-900/30">
                            <span className="block text-[9px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">In Progress</span>
                            <span className="text-base font-black text-blue-700 dark:text-blue-400">{health?.odrs?.inProgress ?? 0}</span>
                          </div>
                          <div className="bg-amber-50 dark:bg-amber-950/30 p-2.5 rounded-lg border border-amber-100 dark:border-amber-900/30">
                            <span className="block text-[9px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">Ready for Pickup</span>
                            <span className="text-base font-black text-amber-700 dark:text-amber-400">{health?.odrs?.ready ?? 0}</span>
                          </div>
                          <div className="bg-emerald-50 dark:bg-emerald-950/30 p-2.5 rounded-lg border border-emerald-100 dark:border-emerald-900/30">
                            <span className="block text-[9px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Completed</span>
                            <span className="text-base font-black text-emerald-700 dark:text-emerald-400">{health?.odrs?.completed ?? 0}</span>
                          </div>
                        </div>
                        <div className="bg-gray-50 dark:bg-zinc-800/60 p-2.5 rounded-lg border border-gray-100 dark:border-white/5 text-xs text-gray-600 dark:text-zinc-300 leading-relaxed">
                          Online requests for Official Transcripts (TOR), Certifications, and Good Moral documents filed through the student portal.
                        </div>
                      </div>
                    )}

                    {stat.key === "osas" && (
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-2">
                          <div className="bg-gray-50 dark:bg-zinc-800/60 p-2.5 rounded-lg border border-gray-100 dark:border-white/5">
                            <span className="block text-[9px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-wider">Submitted</span>
                            <span className="text-base font-black text-gray-900 dark:text-zinc-50">{health?.osas?.submitted ?? 0}</span>
                          </div>
                          <div className="bg-blue-50 dark:bg-blue-950/30 p-2.5 rounded-lg border border-blue-100 dark:border-blue-900/30">
                            <span className="block text-[9px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">In Review</span>
                            <span className="text-base font-black text-blue-700 dark:text-blue-400">{health?.osas?.underReview ?? 0}</span>
                          </div>
                          <div className="bg-red-50 dark:bg-red-950/30 p-2.5 rounded-lg border border-red-100 dark:border-red-900/30">
                            <span className="block text-[9px] font-bold text-red-600 dark:text-red-400 uppercase tracking-wider">Needs Revision</span>
                            <span className="text-base font-black text-red-700 dark:text-red-400">{health?.osas?.needsRevision ?? 0}</span>
                          </div>
                          <div className="bg-emerald-50 dark:bg-emerald-950/30 p-2.5 rounded-lg border border-emerald-100 dark:border-emerald-900/30">
                            <span className="block text-[9px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Approved</span>
                            <span className="text-base font-black text-emerald-700 dark:text-emerald-400">{health?.osas?.approved ?? 0}</span>
                          </div>
                        </div>
                        <div className="bg-gray-50 dark:bg-zinc-800/60 p-2.5 rounded-lg border border-gray-100 dark:border-white/5 text-xs text-gray-600 dark:text-zinc-300 leading-relaxed">
                          Campus student organization event permits, activity proposals, and annual compliance submissions for OSAS review.
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Navigation Toolbar */}
        <div className="border-t border-gray-100 dark:border-white/10 p-5 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 bg-gray-50/40 dark:bg-zinc-900/30">
          {/* View Filter Line Tabs */}
          <div className="flex items-center gap-6 shrink-0 select-none overflow-x-auto">
            <button
              onClick={() => setActiveTab("all")}
              className={cn(
                "relative h-9 flex items-center text-[13px] font-semibold transition-colors focus:outline-none cursor-pointer border-0 bg-transparent whitespace-nowrap",
                activeTab === "all"
                  ? "text-gray-900 dark:text-zinc-50 after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-full after:bg-gray-900 dark:after:bg-zinc-50"
                  : "text-[#8E8E93] font-normal hover:text-gray-700 dark:hover:text-zinc-200"
              )}
            >
              All Campus Activity ({health?.transactions?.length || 0})
            </button>

            <button
              onClick={() => setActiveTab("registrar")}
              className={cn(
                "relative h-9 flex items-center text-[13px] font-semibold transition-colors focus:outline-none cursor-pointer border-0 bg-transparent whitespace-nowrap",
                activeTab === "registrar"
                  ? "text-gray-900 dark:text-zinc-50 after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-full after:bg-gray-900 dark:after:bg-zinc-50"
                  : "text-[#8E8E93] font-normal hover:text-gray-700 dark:hover:text-zinc-200"
              )}
            >
              Registrar Requests ({health?.odrs?.total || 0})
            </button>

            <button
              onClick={() => setActiveTab("osas")}
              className={cn(
                "relative h-9 flex items-center text-[13px] font-semibold transition-colors focus:outline-none cursor-pointer border-0 bg-transparent whitespace-nowrap",
                activeTab === "osas"
                  ? "text-gray-900 dark:text-zinc-50 after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-full after:bg-gray-900 dark:after:bg-zinc-50"
                  : "text-[#8E8E93] font-normal hover:text-gray-700 dark:hover:text-zinc-200"
              )}
            >
              OSAS Proposals ({health?.osas?.total || 0})
            </button>
          </div>

          {/* Search & Status Filter */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            <div className="w-full sm:w-[280px] relative group shrink-0">
              <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                <LucideIcon  className="ph-bold ph-magnifying-glass text-gray-400 dark:text-zinc-500 transition-colors group-focus-within:text-pup-maroon dark:group-focus-within:text-red-400 text-sm"></LucideIcon>
              </div>
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search student, document, or org..."
                className="h-9 w-full rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 pl-8 pr-16 text-xs font-normal text-gray-900 dark:text-zinc-100 placeholder:text-gray-400 dark:placeholder:text-zinc-500 shadow-none focus-visible:outline-none focus-visible:border-pup-maroon focus-visible:ring-1 focus-visible:ring-pup-maroon dark:focus-visible:border-red-500/80 dark:focus-visible:ring-red-500/80"
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
                optionClassName="rounded-lg text-xs font-normal py-1.5 px-2.5 hover:bg-gray-100 dark:hover:bg-zinc-800"
              >
                <option value="All">All Stages</option>
                <option value="ActionRequired">Action Needed</option>
                <option value="Completed">Completed / Approved</option>
              </Select>
            </div>
          </div>
        </div>

        {/* Cross-Department Activity Stream Table */}
        <div className="overflow-hidden rounded-b-2xl border-t border-gray-200 dark:border-white/10 bg-white dark:bg-card flex flex-col flex-1">
            {loading ? (
              <TransactionsTableSkeleton rowCount={8} />
            ) : paginatedTransactions.length === 0 ? (
              <div className="flex h-[360px] flex-col items-center justify-center p-6 text-center rounded-b-2xl">
                <Empty className="flex flex-col items-center justify-center border-0 bg-transparent text-center">
                  <EmptyHeader className="flex flex-col items-center gap-0">
                    <div className="relative mb-6">
                      <div className="absolute inset-0 scale-150 animate-pulse rounded-full bg-gray-50 opacity-50 dark:bg-card"></div>
                      <EmptyMedia className="relative z-10 flex h-20 w-20 items-center justify-center rounded-2xl border border-gray-100 bg-white shadow-md dark:border-white/10 dark:bg-card">
                        <LucideIcon  className="ph-bold ph-tray text-3xl text-gray-400 dark:text-zinc-500"></LucideIcon>
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
                        <LucideIcon  className="ph-bold ph-arrow-counter-clockwise"></LucideIcon>
                        Clear
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
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[#800000]/10 text-pup-maroon dark:bg-pup-maroon/20 dark:text-rose-300">
                                <LucideIcon  className="ph-bold ph-certificate text-xs"></LucideIcon>
                                Registrar
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
                                <LucideIcon  className="ph-bold ph-student text-xs"></LucideIcon>
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
                                <LucideIcon  className="ph-bold ph-file-pdf text-red-500"></LucideIcon>
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
                              "inline-flex items-center justify-center rounded-full px-[10px] py-[2.5px] text-[11px] font-medium whitespace-nowrap",
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
                                    <LucideIcon  className="ph-bold ph-eye text-[16px]"></LucideIcon>
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
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[#800000]/10 text-pup-maroon dark:bg-pup-maroon/20 dark:text-rose-300">
                        <LucideIcon  className="ph-bold ph-certificate text-xs"></LucideIcon>
                        Registrar Document Request
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
                        <LucideIcon  className="ph-bold ph-student text-xs"></LucideIcon>
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
                      "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold",
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
                      <LucideIcon  className="ph-bold ph-file-pdf text-base"></LucideIcon>
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
                    <LucideIcon  className="ph-bold ph-eye text-sm mr-1"></LucideIcon> Preview
                  </Button>
                </div>
              )}
            </div>

            <DialogFooter className="m-0 p-6 pt-0 bg-white dark:bg-card border-none flex flex-row items-center justify-between sm:justify-between w-full">
              <span className="text-xs text-gray-500 dark:text-zinc-400">
                Department: <strong className="text-gray-700 dark:text-zinc-200 uppercase font-semibold">{selectedItem?.officeId}</strong>
              </span>
              <Button
                type="button"
                variant="outline"
                onClick={() => setSelectedItem(null)}
                className="h-10 px-4 text-xs font-semibold rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-xs cursor-pointer active:scale-95 transition-all"
              >
                Close
              </Button>
            </DialogFooter>
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
