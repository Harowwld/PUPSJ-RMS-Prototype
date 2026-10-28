"use client"

import HugeIcon from "@/components/shared/HugeIcon"
import useUrlPage from "@/hooks/useUrlPage"
import React, { useState, useRef, useEffect, useMemo, useCallback } from "react"
import { Reorder } from "framer-motion"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import KpiStatCardsSkeleton from "@/components/systemadmin/skeletons/KpiStatCardsSkeleton"
import TransactionsTableSkeleton from "@/components/systemadmin/skeletons/TransactionsTableSkeleton"
import MultiCriteriaFilter from "@/components/shared/MultiCriteriaFilter"
import ActiveFilterChips from "@/components/shared/ActiveFilterChips"
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
} from "@/components/ui/empty"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet"
import PageHeader from "@/components/shared/PageHeader"
import { RefreshButton } from "@/components/shared/RefreshButton"
import PDFPreviewModal from "@/components/shared/PDFPreviewModal"
import { formatPHDateTime, formatRelativeTime } from "@/lib/timeFormat"
import { cn } from "@/lib/utils"
import { getCachedData, setCachedData } from "@/lib/dataCache"
import useTableScroll from "@/hooks/useTableScroll"
import TableScrollControls from "@/components/shared/TableScrollControls"

function SortIndicator({ column, sortBy, sortOrder }) {
  if (sortBy !== column) {
    return <HugeIcon className="ph-bold ph-caret-up-down ml-1 text-[11px] text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
  }
  return sortOrder === "ASC" ? (
    <HugeIcon className="ph-bold ph-caret-up ml-1 text-[11px] text-pup-maroon dark:text-red-400 animate-in fade-in zoom-in duration-normal" />
  ) : (
    <HugeIcon className="ph-bold ph-caret-down ml-1 text-[11px] text-pup-maroon dark:text-red-400 animate-in fade-in zoom-in duration-normal" />
  )
}

function statusBadgeClass(status) {
  const s = String(status || "").toUpperCase()
  if (s === "PENDING" || s === "SUBMITTED") {
    return "bg-amber-50 text-amber-800 border border-amber-200/80 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/40"
  }
  if (s === "PROCESSING" || s === "INPROGRESS" || s === "UNDER REVIEW") {
    return "bg-blue-50 text-blue-800 border border-blue-200/80 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/40"
  }
  if (s === "READY" || s === "APPROVED" || s === "DONE" || s === "COMPLETED") {
    return "bg-emerald-50 text-emerald-800 border border-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/40"
  }
  if (s === "NEEDS REVISION" || s === "REVISION") {
    return "bg-orange-50 text-orange-800 border border-orange-200/80 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-800/40"
  }
  if (s === "CANCELLED" || s === "DECLINED" || s === "SHREDDED") {
    return "bg-rose-50 text-rose-800 border border-rose-200/80 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/40"
  }
  return "bg-gray-100 text-gray-800 border border-gray-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700"
}

function getStatusDotColor(status) {
  const s = String(status || "").toUpperCase()
  if (s === "PENDING" || s === "SUBMITTED") return "bg-amber-500"
  if (s === "PROCESSING" || s === "INPROGRESS" || s === "UNDER REVIEW") return "bg-blue-500"
  if (s === "READY" || s === "APPROVED" || s === "DONE" || s === "COMPLETED") return "bg-emerald-500"
  if (s === "NEEDS REVISION" || s === "REVISION") return "bg-orange-500"
  if (s === "DECLINED" || s === "CANCELLED" || s === "SHREDDED") return "bg-rose-500"
  return "bg-gray-400"
}

function formatStudentRequester(name, studentNo) {
  if (!name || name.startsWith("enc:")) {
    return studentNo ? `Student (${studentNo})` : "Student"
  }
  return name
}

/**
 * Standard Information Row (label : value)
 * Clean unboxed metadata layout aligned with colons and icons.
 */
function InfoRow({ icon, label, value, children, className }) {
  return (
    <div
      className={cn(
        "grid grid-cols-[135px_12px_1fr] sm:grid-cols-[150px_14px_1fr] items-start gap-1 text-xs py-2 border-b border-gray-100/70 dark:border-zinc-800/50 last:border-0",
        className
      )}
    >
      <div className="text-gray-500 dark:text-zinc-400 font-medium flex items-center gap-2 truncate">
        {icon && (
          <HugeIcon className={cn("text-gray-400 dark:text-zinc-500 text-sm shrink-0", icon)} />
        )}
        <span className="truncate">{label}</span>
      </div>
      <span className="text-gray-300 dark:text-zinc-600 select-none">:</span>
      <div className="text-gray-900 dark:text-zinc-100 font-semibold break-words min-w-0">
        {children ?? (value || <span className="text-gray-400 font-normal italic">None</span>)}
      </div>
    </div>
  )
}

export default function CampusOperationsTab() {
  const [kpiOrder, setKpiOrder] = useState(["odrs", "osas"])
  const [health, setHealth] = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [autoRefreshSecs] = useState(15)

  // Filters & Sorting
  const [search, setSearch] = useState("")
  const [operationFilters, setOperationFilters] = useState({
    department: [],
    status: [],
  })
  const [sortBy, setSortBy] = useState("createdAt")
  const [sortOrder, setSortOrder] = useState("DESC")
  const [page, setPage] = useUrlPage()
  const [pageSize, setPageSize] = useState(10)

  // Horizontal table scrolling hook
  const {
    tableContainerRef,
    canScrollLeft,
    canScrollRight,
    isScrolled,
    scrollLeft,
    scrollRight,
    resetScroll: resetTableScroll,
  } = useTableScroll();

  // Stat Cards dropdown state
  const [selectedKpi, setSelectedKpi] = useState(null)
  const statCardsRef = useRef(null)

  // Request Details Sheet
  const [selectedItem, setSelectedItem] = useState(null)
  const [sheetItem, setSheetItem] = useState(null)

  const handleOpenDetails = useCallback((item) => {
    setSheetItem(item)
    setSelectedItem(item)
  }, [])

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
      studentName: formatStudentRequester(item.studentName, item.studentNo),
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
    // eslint-disable-next-line react-hooks/set-state-in-effect
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

  const transactions = health?.transactions

  // Multi-criteria filter groups for department and operation status
  const operationFilterGroups = useMemo(() => {
    const list = transactions || []

    const deptCounts = { registrar: 0, osas: 0 }
    const statusCounts = {
      action_needed: 0,
      in_progress: 0,
      ready: 0,
      completed: 0,
      needs_revision: 0,
      declined: 0,
    }

    list.forEach((tx) => {
      const office = String(tx.officeId || "").toLowerCase()
      if (office === "registrar") deptCounts.registrar++
      else if (office === "osas") deptCounts.osas++

      const s = String(tx.status || "").trim().toLowerCase()
      if (s === "pending" || s === "submitted") {
        statusCounts.action_needed++
      } else if (s === "inprogress" || s === "in progress" || s === "under review" || s === "processing") {
        statusCounts.in_progress++
      } else if (s === "ready") {
        statusCounts.ready++
      } else if (s === "approved" || s === "completed" || s === "done") {
        statusCounts.completed++
      } else if (s === "needs revision" || s === "revision") {
        statusCounts.needs_revision++
      } else if (s === "declined" || s === "cancelled" || s === "shredded") {
        statusCounts.declined++
      }
    })

    return [
      {
        id: "department",
        label: "Campus Department",
        options: [
          {
            value: "registrar",
            label: "Registrar Requests",
            indicatorColor: "bg-blue-500",
            count: deptCounts.registrar,
          },
          {
            value: "osas",
            label: "OSAS Proposals",
            indicatorColor: "bg-emerald-500",
            count: deptCounts.osas,
          },
        ],
      },
      {
        id: "status",
        label: "Operation Status",
        options: [
          {
            value: "action_needed",
            label: "Action Needed",
            indicatorColor: "bg-amber-500",
            count: statusCounts.action_needed,
          },
          {
            value: "in_progress",
            label: "In Progress / Review",
            indicatorColor: "bg-blue-500",
            count: statusCounts.in_progress,
          },
          {
            value: "ready",
            label: "Ready for Pickup",
            indicatorColor: "bg-emerald-500",
            count: statusCounts.ready,
          },
          {
            value: "completed",
            label: "Completed / Approved",
            indicatorColor: "bg-emerald-600",
            count: statusCounts.completed,
          },
          {
            value: "needs_revision",
            label: "Needs Revision",
            indicatorColor: "bg-orange-500",
            count: statusCounts.needs_revision,
          },
          {
            value: "declined",
            label: "Declined / Cancelled",
            indicatorColor: "bg-rose-500",
            count: statusCounts.declined,
          },
        ],
      },
    ]
  }, [transactions])

  // Filtered transactions for cross-department activity stream
  const filteredTransactions = useMemo(() => {
    if (!transactions) return []
    const selectedDepts = operationFilters.department || []
    const selectedStatuses = operationFilters.status || []

    return transactions.filter((tx) => {
      // Department filter
      if (selectedDepts.length > 0) {
        const txDept = String(tx.officeId || "").toLowerCase()
        if (!selectedDepts.includes(txDept)) return false
      }

      // Status filter
      if (selectedStatuses.length > 0) {
        const s = String(tx.status || "").trim().toLowerCase()
        const matchesStatus = selectedStatuses.some((val) => {
          if (val === "action_needed") return s === "pending" || s === "submitted"
          if (val === "in_progress") return s === "inprogress" || s === "in progress" || s === "under review" || s === "processing"
          if (val === "ready") return s === "ready"
          if (val === "completed") return s === "approved" || s === "completed" || s === "done"
          if (val === "needs_revision") return s === "needs revision" || s === "revision"
          if (val === "declined") return s === "declined" || s === "cancelled" || s === "shredded"
          return s === val.toLowerCase()
        })
        if (!matchesStatus) return false
      }

      // Keyword search
      if (search.trim()) {
        const q = search.toLowerCase()
        const matchId = String(tx.id || "").toLowerCase().includes(q)
        const matchTitle = (tx.title || "").toLowerCase().includes(q)
        const studentDisplay = formatStudentRequester(tx.studentName, tx.studentNo).toLowerCase()
        const matchStudent = (tx.studentNo || "").toLowerCase().includes(q) || studentDisplay.includes(q)
        const matchOrg = (tx.organizationName || "").toLowerCase().includes(q)
        const matchStatus = (tx.status || "").toLowerCase().includes(q)
        const matchNotes = (tx.notes || "").toLowerCase().includes(q)
        if (!matchId && !matchTitle && !matchStudent && !matchOrg && !matchStatus && !matchNotes) {
          return false
        }
      }

      return true
    })
  }, [transactions, operationFilters, search])

  // Sorted transactions
  const sortedTransactions = useMemo(() => {
    return [...filteredTransactions].sort((a, b) => {
      let aVal = a[sortBy] ?? ""
      let bVal = b[sortBy] ?? ""

      if (sortBy === "id") {
        aVal = Number(a.id) || 0
        bVal = Number(b.id) || 0
      } else if (sortBy === "studentName") {
        aVal = formatStudentRequester(a.studentName, a.studentNo)
        bVal = formatStudentRequester(b.studentName, b.studentNo)
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

  const currentTxIndex = selectedItem
    ? sortedTransactions.findIndex((t) => t.id === selectedItem.id)
    : -1

  const handlePrevTx = () => {
    if (currentTxIndex > 0) {
      handleOpenDetails(sortedTransactions[currentTxIndex - 1])
    }
  }

  const handleNextTx = () => {
    if (currentTxIndex >= 0 && currentTxIndex < sortedTransactions.length - 1) {
      handleOpenDetails(sortedTransactions[currentTxIndex + 1])
    }
  }

  // Reset page when filters change
  useEffect(() => {
    setPage(1)
  }, [search, operationFilters, pageSize, setPage])

  // Auto-reset scroll to start whenever page, filters, search, or sorting changes
  useEffect(() => {
    resetTableScroll()
  }, [page, pageSize, search, operationFilters, sortBy, sortOrder, resetTableScroll])

  const handleClearFilters = useCallback(() => {
    setSearch("")
    setOperationFilters({ department: [], status: [] })
    setPage(1)
  }, [setPage])

  const hasActiveFilters =
    Boolean(search?.trim()) ||
    Boolean(operationFilters.department?.length > 0) ||
    Boolean(operationFilters.status?.length > 0)

  // University Operations Top 2 Stat Cards
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
    <div className="animate-fade-up font-jakarta flex flex-[1_0_auto] flex-col w-full gap-6">
      {/* ONE Single Card Container encapsulating Header, Metrics, Toolbar, Table & Pagination */}
      <Card className="flex flex-[1_0_auto] h-auto w-full flex-col p-0 gap-0 overflow-visible rounded-2xl border border-border bg-white shadow-sm dark:border-border dark:bg-card dark:shadow-none isolate font-jakarta">
        {/* Header */}
        <PageHeader
          icon="ph-bold ph-activity"
          title="Campus Services & Operations Monitor"
          description="Live tracking of student document requests and student organization proposals across campus departments."
          showBorder={false}
          className="p-6"
          titleClassName="text-[18px] font-semibold tracking-[-0.01em] text-gray-900 dark:text-zinc-50"
          descriptionClassName="text-[13px] font-normal text-gray-900 dark:text-zinc-300 mt-[4px]"
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
            <Reorder.Group
              as="div"
              axis="x"
              values={kpiOrder}
              onReorder={setKpiOrder}
              ref={statCardsRef}
              className="grid grid-cols-1 gap-4 md:grid-cols-2 items-start relative z-20 transition-all duration-500"
            >
              {kpiOrder.map((kpiKey) => {
                const stat = statCardsData.find((s) => s.key === kpiKey)
                if (!stat) return null
                const isSelected = selectedKpi === stat.key
                const isBlue = stat.color === "blue"

                return (
                  <Reorder.Item
                    as="div"
                    value={stat.key}
                    key={stat.key}
                    className={cn(
                      "relative group rounded-2xl",
                      isSelected ? "z-30" : "z-10"
                    )}
                  >
                    <div
                      onClick={() => setSelectedKpi(isSelected ? null : stat.key)}
                      className={cn(
                        "relative overflow-hidden rounded-2xl border cursor-pointer select-none transition-all shadow-xs hover:shadow-sm flex flex-col justify-between min-h-[114px] bg-gray-50/70 hover:bg-gray-50 dark:bg-zinc-900/50 dark:hover:bg-zinc-900/80",
                        isSelected
                          ? isBlue
                            ? "border-blue-500/50 ring-2 ring-blue-500/20 shadow-md"
                            : "border-emerald-500/50 ring-2 ring-emerald-500/20 shadow-md"
                          : "border-border dark:border-border"
                      )}
                    >
                      <div className="flex justify-between items-start p-4 pb-0">
                        <div className="flex flex-col gap-1">
                          <span className="text-[13px] font-medium text-gray-900 dark:text-zinc-300 capitalize">
                            {stat.label}
                          </span>
                        </div>
                        <div
                          className={cn(
                            "w-8 h-8 rounded-xl flex items-center justify-center text-white shadow-2xs shrink-0",
                            isBlue ? "bg-blue-600" : "bg-emerald-600"
                          )}
                        >
                          <HugeIcon
                            className={cn(
                              "ph-bold text-[15px]",
                              isBlue ? "ph-file-text" : "ph-users"
                            )}
                          />
                        </div>
                      </div>

                      <div className="flex justify-between items-end p-4 pt-1">
                        <div className="flex flex-col gap-1">
                          <span className="text-[28px] font-bold text-gray-900 dark:text-white leading-none tracking-tight">
                            {typeof stat.value === "number" ? stat.value.toLocaleString() : stat.value}
                          </span>
                          <span
                            className={cn(
                              "text-[11px] font-medium mb-1",
                              isBlue ? "text-blue-600 dark:text-blue-400" : "text-emerald-600 dark:text-emerald-400"
                            )}
                          >
                            {stat.sublabel}
                          </span>
                        </div>
                        <HugeIcon className="ph-bold ph-dots-six-vertical cursor-grab active:cursor-grabbing hover:text-black dark:hover:text-white text-gray-400 dark:text-zinc-400 text-xl mb-0.5" />
                      </div>
                    </div>

                    {/* Expandable details drawer */}
                    <div
                      className={cn(
                        "absolute top-full left-0 right-0 z-[100] mt-2 rounded-2xl border border-border bg-white dark:bg-zinc-900 p-4 shadow-xl transition-all duration-300 ease-in-out origin-top",
                        isSelected
                          ? "scale-y-100 opacity-100 translate-y-0"
                          : "scale-y-95 opacity-0 -translate-y-2 pointer-events-none"
                      )}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {stat.key === "odrs" && (
                        <div className="space-y-3">
                          <div className="grid grid-cols-2 gap-2">
                            <div className="bg-gray-50 dark:bg-zinc-800/60 p-2.5 rounded-xl border border-border dark:border-border">
                              <span className="block text-[9px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-wider">
                                Pending Action
                              </span>
                              <span className="text-base font-black text-gray-900 dark:text-zinc-50">
                                {health?.odrs?.pending ?? 0}
                              </span>
                            </div>
                            <div className="bg-blue-50/70 dark:bg-blue-950/30 p-2.5 rounded-xl border border-blue-200/60 dark:border-blue-900/30">
                              <span className="block text-[9px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                                In Progress
                              </span>
                              <span className="text-base font-black text-blue-700 dark:text-blue-400">
                                {health?.odrs?.inProgress ?? 0}
                              </span>
                            </div>
                            <div className="bg-amber-50/70 dark:bg-amber-950/30 p-2.5 rounded-xl border border-amber-200/60 dark:border-amber-900/30">
                              <span className="block text-[9px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                                Ready for Pickup
                              </span>
                              <span className="text-base font-black text-amber-700 dark:text-amber-400">
                                {health?.odrs?.ready ?? 0}
                              </span>
                            </div>
                            <div className="bg-emerald-50/70 dark:bg-emerald-950/30 p-2.5 rounded-xl border border-emerald-200/60 dark:border-emerald-900/30">
                              <span className="block text-[9px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                                Completed
                              </span>
                              <span className="text-base font-black text-emerald-700 dark:text-emerald-400">
                                {health?.odrs?.completed ?? 0}
                              </span>
                            </div>
                          </div>
                          <div className="bg-gray-50 dark:bg-zinc-800/60 p-2.5 rounded-xl border border-border dark:border-border text-xs text-gray-600 dark:text-zinc-300 leading-relaxed">
                            Online requests for Official Transcripts (TOR), Certifications, and Good Moral documents filed through the student portal.
                          </div>
                        </div>
                      )}

                      {stat.key === "osas" && (
                        <div className="space-y-3">
                          <div className="grid grid-cols-2 gap-2">
                            <div className="bg-gray-50 dark:bg-zinc-800/60 p-2.5 rounded-xl border border-border dark:border-border">
                              <span className="block text-[9px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-wider">
                                Submitted
                              </span>
                              <span className="text-base font-black text-gray-900 dark:text-zinc-50">
                                {health?.osas?.submitted ?? 0}
                              </span>
                            </div>
                            <div className="bg-blue-50/70 dark:bg-blue-950/30 p-2.5 rounded-xl border border-blue-200/60 dark:border-blue-900/30">
                              <span className="block text-[9px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                                In Review
                              </span>
                              <span className="text-base font-black text-blue-700 dark:text-blue-400">
                                {health?.osas?.underReview ?? 0}
                              </span>
                            </div>
                            <div className="bg-orange-50/70 dark:bg-orange-950/30 p-2.5 rounded-xl border border-orange-200/60 dark:border-orange-900/30">
                              <span className="block text-[9px] font-bold text-orange-600 dark:text-orange-400 uppercase tracking-wider">
                                Needs Revision
                              </span>
                              <span className="text-base font-black text-orange-700 dark:text-orange-400">
                                {health?.osas?.needsRevision ?? 0}
                              </span>
                            </div>
                            <div className="bg-emerald-50/70 dark:bg-emerald-950/30 p-2.5 rounded-xl border border-emerald-200/60 dark:border-emerald-900/30">
                              <span className="block text-[9px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                                Approved
                              </span>
                              <span className="text-base font-black text-emerald-700 dark:text-emerald-400">
                                {health?.osas?.approved ?? 0}
                              </span>
                            </div>
                          </div>
                          <div className="bg-gray-50 dark:bg-zinc-800/60 p-2.5 rounded-xl border border-border dark:border-border text-xs text-gray-600 dark:text-zinc-300 leading-relaxed">
                            Campus student organization event permits, activity proposals, and annual compliance submissions for OSAS review.
                          </div>
                        </div>
                      )}
                    </div>
                  </Reorder.Item>
                )
              })}
            </Reorder.Group>
          </div>
        )}

        {/* Navigation Toolbar */}
        <div className="border-t border-border dark:border-border p-5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-gray-50/40 dark:bg-zinc-900/30">
          {/* Search Input with Clear Button & Record Count */}
          <div className="w-full sm:w-[280px] lg:w-[340px] relative group shrink-0">
            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
              <HugeIcon className="ph-bold ph-magnifying-glass text-gray-400 dark:text-zinc-500 transition-colors group-focus-within:text-pup-maroon dark:group-focus-within:text-red-400 text-sm" />
            </div>
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search student, document, or org..."
              className="h-9 w-full rounded-xl border border-border dark:border-border bg-white dark:bg-zinc-800 pl-8 pr-16 text-xs font-normal text-gray-900 dark:text-zinc-100 placeholder:text-gray-400 dark:placeholder:text-zinc-500 shadow-none focus-visible:outline-none focus-visible:border-pup-maroon focus-visible:ring-1 focus-visible:ring-pup-maroon dark:focus-visible:border-red-500/80 dark:focus-visible:ring-red-500/80"
            />
            <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-[11px] text-gray-400 dark:text-zinc-500 font-mono">
              {filteredTransactions.length}
            </div>
          </div>

          {/* Smart Multi-Criteria Filter Dropdown */}
          <div className="w-full sm:w-auto shrink-0">
            <MultiCriteriaFilter
              title="Filter Operations"
              groups={operationFilterGroups}
              selected={operationFilters}
              onChange={(newFilters) => {
                setOperationFilters(newFilters)
                setPage(1)
              }}
              totalCount={transactions?.length || 0}
              matchingCount={filteredTransactions.length}
              onReset={() => {
                setOperationFilters({ department: [], status: [] })
                setPage(1)
              }}
            />
          </div>
        </div>

        {/* Active Filter Chips & Horizontal Scroll Controls */}
        <div className="border-t border-border dark:border-border px-6 py-2.5 flex items-center justify-between gap-4 bg-white dark:bg-card">
          <div className="flex-1 min-w-0">
            <ActiveFilterChips
              groups={operationFilterGroups}
              selected={operationFilters}
              onRemove={(groupId, val) => {
                setOperationFilters((prev) => ({
                  ...prev,
                  [groupId]: (prev[groupId] || []).filter((v) => v !== val),
                }))
                setPage(1)
              }}
              searchQuery={search}
              onClearSearch={() => {
                setSearch("")
                setPage(1)
              }}
              onClearAll={handleClearFilters}
              className="p-0 border-0"
            />
          </div>

          {/* Horizontal Scroll Controls */}
          <div className="flex items-center gap-2 shrink-0 select-none ml-auto">
            <TableScrollControls
              canScrollLeft={canScrollLeft}
              canScrollRight={canScrollRight}
              isScrolled={isScrolled}
              onScrollLeft={scrollLeft}
              onScrollRight={scrollRight}
              onResetScroll={resetTableScroll}
            />
          </div>
        </div>

        {/* Cross-Department Activity Stream Table */}
        <div className="overflow-hidden rounded-b-2xl border-t border-border dark:border-border bg-white dark:bg-card flex flex-col flex-[1_0_auto]">
          {loading ? (
            <TransactionsTableSkeleton rowCount={8} />
          ) : paginatedTransactions.length === 0 ? (
            <div className="py-16 rounded-b-2xl flex-1 flex flex-col items-center justify-center min-h-[420px] w-full">
              <Empty className="flex h-full flex-col items-center justify-center border-0 bg-transparent text-center">
                <EmptyHeader className="flex flex-col items-center gap-0">
                  <div className="relative mb-6">
                    <div className="absolute inset-0 scale-150 animate-pulse rounded-full bg-gray-50 opacity-50 dark:bg-card" />
                    <EmptyMedia className="relative z-10 flex h-24 w-24 items-center justify-center rounded-3xl border border-border bg-white shadow-xl dark:border-border dark:bg-card dark:shadow-none">
                      <HugeIcon className="ph-duotone ph-tray text-3xl text-gray-400 dark:text-zinc-500" />
                    </EmptyMedia>
                  </div>
                  <EmptyTitle className="text-xl font-semibold text-gray-900 dark:text-zinc-50">
                    No Records Found
                  </EmptyTitle>
                  <EmptyDescription className="max-w-xs text-sm font-medium text-gray-900 dark:text-zinc-300 mt-1">
                    {hasActiveFilters
                      ? "No student requests or proposals match your search or filter settings."
                      : "There are currently no active document requests or event proposals recorded."}
                  </EmptyDescription>
                </EmptyHeader>
                {hasActiveFilters && (
                  <EmptyContent>
                    <Button
                      variant="outline"
                      onClick={handleClearFilters}
                      title="Reset Filters"
                      className="mt-6 flex h-10 items-center justify-center gap-2 rounded-xl border border-border dark:border-border bg-white dark:bg-zinc-800 px-5 text-xs font-semibold text-gray-700 dark:text-zinc-200 shadow-xs transition-all hover:bg-gray-50 dark:hover:bg-zinc-700 active:scale-95 cursor-pointer"
                    >
                      Reset Filters
                    </Button>
                  </EmptyContent>
                )}
              </Empty>
            </div>
          ) : (
            <div
              ref={tableContainerRef}
              className="flex-[1_0_auto] overflow-x-auto show-scrollbar pb-2 motion-safe:animate-in motion-safe:fade-in-50 duration-200 ease-out select-none"
            >
              <table className="w-full text-sm border-collapse min-w-[1240px]">
                <thead className="sticky top-0 z-10 border-b border-border bg-gray-50/90 dark:bg-zinc-900/90 backdrop-blur-xs select-none">
                  <tr className="text-left text-[11px] font-semibold tracking-wider text-gray-500 dark:text-zinc-400 uppercase h-11 select-none">
                    {/* ID Header */}
                    <th
                      className="p-4 w-[100px] min-w-[100px] max-w-[100px] border-r border-border/80 dark:border-border whitespace-nowrap"
                    >
                      <button
                        onClick={() => handleSort("id")}
                        className={cn(
                          "group flex items-center transition-colors focus:outline-none cursor-pointer text-[11px] font-semibold tracking-wider uppercase",
                          sortBy === "id" ? "text-gray-900 dark:text-white" : "text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white"
                        )}
                      >
                        ID <SortIndicator column="id" sortBy={sortBy} sortOrder={sortOrder} />
                      </button>
                    </th>

                    {/* Department */}
                    <th className="p-4 w-[130px] min-w-[130px] border-r border-border/80 dark:border-border">
                      <button
                        onClick={() => handleSort("officeId")}
                        className={cn(
                          "group flex items-center transition-colors focus:outline-none cursor-pointer text-[11px] font-semibold tracking-wider uppercase",
                          sortBy === "officeId" ? "text-gray-900 dark:text-white" : "text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white"
                        )}
                      >
                        Department <SortIndicator column="officeId" sortBy={sortBy} sortOrder={sortOrder} />
                      </button>
                    </th>

                    {/* Student Requester */}
                    <th className="p-4 w-[200px] min-w-[200px] border-r border-border/80 dark:border-border">
                      <button
                        onClick={() => handleSort("studentName")}
                        className={cn(
                          "group flex items-center transition-colors focus:outline-none cursor-pointer text-[11px] font-semibold tracking-wider uppercase",
                          sortBy === "studentName" ? "text-gray-900 dark:text-white" : "text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white"
                        )}
                      >
                        Student Requester <SortIndicator column="studentName" sortBy={sortBy} sortOrder={sortOrder} />
                      </button>
                    </th>

                    {/* Document or Proposal Title */}
                    <th className="p-4 w-[270px] min-w-[270px] border-r border-border/80 dark:border-border">
                      <button
                        onClick={() => handleSort("title")}
                        className={cn(
                          "group flex items-center transition-colors focus:outline-none cursor-pointer text-[11px] font-semibold tracking-wider uppercase",
                          sortBy === "title" ? "text-gray-900 dark:text-white" : "text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white"
                        )}
                      >
                        Document or Proposal Title <SortIndicator column="title" sortBy={sortBy} sortOrder={sortOrder} />
                      </button>
                    </th>

                    {/* Student Org / Details */}
                    <th className="p-4 w-[190px] min-w-[190px] border-r border-border/80 dark:border-border">
                      <button
                        onClick={() => handleSort("organizationName")}
                        className={cn(
                          "group flex items-center transition-colors focus:outline-none cursor-pointer text-[11px] font-semibold tracking-wider uppercase",
                          sortBy === "organizationName" ? "text-gray-900 dark:text-white" : "text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white"
                        )}
                      >
                        Student Org / Details <SortIndicator column="organizationName" sortBy={sortBy} sortOrder={sortOrder} />
                      </button>
                    </th>

                    {/* Stage Status */}
                    <th className="p-4 w-[140px] min-w-[140px] border-r border-border/80 dark:border-border">
                      <button
                        onClick={() => handleSort("status")}
                        className={cn(
                          "group flex items-center transition-colors focus:outline-none cursor-pointer text-[11px] font-semibold tracking-wider uppercase",
                          sortBy === "status" ? "text-gray-900 dark:text-white" : "text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white"
                        )}
                      >
                        Stage Status <SortIndicator column="status" sortBy={sortBy} sortOrder={sortOrder} />
                      </button>
                    </th>

                    {/* Submitted */}
                    <th className="p-4 w-[130px] min-w-[130px] border-r border-border/80 dark:border-border">
                      <button
                        onClick={() => handleSort("createdAt")}
                        className={cn(
                          "group flex items-center transition-colors focus:outline-none cursor-pointer text-[11px] font-semibold tracking-wider uppercase",
                          sortBy === "createdAt" ? "text-gray-900 dark:text-white" : "text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white"
                        )}
                      >
                        Submitted <SortIndicator column="createdAt" sortBy={sortBy} sortOrder={sortOrder} />
                      </button>
                    </th>

                    {/* Actions */}
                    <th className="p-4 pr-6 text-right w-[80px] min-w-[80px] text-[11px] font-semibold tracking-wider uppercase text-gray-500 dark:text-zinc-400">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-border/60 font-medium text-gray-900 dark:text-zinc-100 bg-white dark:bg-[#1c1c1e]">
                  {paginatedTransactions.map((tx) => {
                    const isRegistrar = tx.officeId === "registrar"
                    const rel = formatRelativeTime(tx.createdAt)

                    return (
                      <tr
                        key={tx.id}
                        onClick={() => handleOpenDetails(tx)}
                        className="group h-[52px] border-b border-border/60 last:border-b-0 transition-colors hover:bg-gray-50/70 dark:bg-card dark:hover:bg-zinc-800/40 cursor-pointer select-none"
                      >
                        {/* Transaction ID */}
                        <td
                          className="p-4 align-middle whitespace-nowrap border-r border-border/70 dark:border-border/70"
                        >
                          <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded-md bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-zinc-300">
                            #{tx.id}
                          </span>
                        </td>

                        {/* Department Badge */}
                        <td className="p-4 align-middle whitespace-nowrap border-r border-border/70 dark:border-border/70">
                          {isRegistrar ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[#800000]/10 text-pup-maroon dark:bg-pup-maroon/20 dark:text-rose-300">
                              <HugeIcon className="ph-bold ph-certificate text-xs" />
                              Registrar
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200/50 dark:border-blue-800/30">
                              <HugeIcon className="ph-bold ph-student text-xs" />
                              OSAS
                            </span>
                          )}
                        </td>

                        {/* Student Requester */}
                        <td className="p-4 align-middle overflow-hidden border-r border-border/70 dark:border-border/70">
                          <div
                            className="font-semibold text-[13px] text-gray-900 dark:text-zinc-50 truncate"
                            title={formatStudentRequester(tx.studentName, tx.studentNo)}
                          >
                            {formatStudentRequester(tx.studentName, tx.studentNo)}
                          </div>
                          <div className="text-[11px] font-mono text-[#8E8E93] dark:text-zinc-500 mt-0.5 truncate">
                            {tx.studentNo}
                          </div>
                        </td>

                        {/* Document or Proposal Title */}
                        <td className="p-4 align-middle overflow-hidden border-r border-border/70 dark:border-border/70">
                          <div className="font-medium text-[13px] text-gray-900 dark:text-zinc-100 truncate" title={tx.title}>
                            {tx.title}
                          </div>
                          {tx.originalFilename && (
                            <div className="text-[11px] text-[#8E8E93] dark:text-zinc-500 flex items-center gap-1 mt-0.5">
                              <HugeIcon className="ph-bold ph-file-pdf text-red-500 shrink-0" />
                              <span className="truncate" title={tx.originalFilename}>{tx.originalFilename}</span>
                            </div>
                          )}
                        </td>

                        {/* Organization / Reference */}
                        <td className="p-4 align-middle overflow-hidden border-r border-border/70 dark:border-border/70">
                          {tx.organizationName ? (
                            <div className="text-[12px] font-semibold text-blue-600 dark:text-blue-400 truncate" title={tx.organizationName}>
                              {tx.organizationName}
                            </div>
                          ) : (
                            <div className="text-[12px] text-gray-600 dark:text-zinc-300 truncate" title={tx.notes || "Standard student request"}>
                              {tx.notes || "Standard student request"}
                            </div>
                          )}
                        </td>

                        {/* Stage Status Badge */}
                        <td className="p-4 align-middle whitespace-nowrap border-r border-border/70 dark:border-border/70">
                          <span
                            className={cn(
                              "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium whitespace-nowrap shadow-2xs",
                              statusBadgeClass(tx.status)
                            )}
                          >
                            <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", getStatusDotColor(tx.status))} />
                            <span>{tx.status === "InProgress" ? "In Progress" : tx.status}</span>
                          </span>
                        </td>

                        {/* Date Submitted */}
                        <td className="p-4 align-middle text-[12px] text-gray-700 dark:text-zinc-300 whitespace-nowrap font-mono border-r border-border/70 dark:border-border/70">
                          {rel.relative || rel.date}
                        </td>

                        {/* Action Button */}
                        <td className="py-0 px-4 pr-6 text-right align-middle whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  type="button"
                                  onClick={() => handleOpenDetails(tx)}
                                  aria-label="View Details"
                                  className="w-7 h-7 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-zinc-100 focus:outline-none cursor-pointer active:scale-95 flex items-center justify-center transition-all border-0 bg-transparent shadow-2xs"
                                >
                                  <HugeIcon className="ph-bold ph-eye text-[15px]" />
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
            <div className="mt-auto flex flex-col sm:flex-row items-center justify-between border-t border-border dark:border-border bg-white dark:bg-[#1c1c1e] p-4 px-6 rounded-b-2xl gap-3">
              <div className="flex items-center gap-6 text-xs text-gray-700 dark:text-zinc-300 select-none">
                <span>
                  Showing {paginatedTransactions.length} of {sortedTransactions.length} records
                </span>
                <div className="flex items-center gap-1.5">
                  <span className="text-gray-400 dark:text-zinc-500 text-[11px]">Rows:</span>
                  {[10, 20, 50, 100].map((sz) => (
                    <button
                      key={sz}
                      type="button"
                      onClick={() => {
                        setPageSize(sz)
                        setPage(1)
                      }}
                      className={cn(
                        "px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer",
                        pageSize === sz
                          ? "bg-gray-200/80 dark:bg-zinc-700 text-gray-900 dark:text-zinc-100 font-bold"
                          : "text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-zinc-200 hover:bg-gray-100 dark:hover:bg-zinc-800/60"
                      )}
                    >
                      {sz}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2 select-none">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="h-8 px-3 text-xs font-semibold rounded-xl border border-border dark:border-white/10 bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-2xs active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all"
                >
                  Prev
                </Button>

                <div className="h-8 min-w-[32px] px-2.5 rounded-xl bg-slate-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-bold text-xs flex items-center justify-center shadow-2xs">
                  {page}
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages || endIndex >= sortedTransactions.length}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="h-8 px-3 text-xs font-semibold rounded-xl border border-border dark:border-white/10 bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-2xs active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Standardized Operation Record Details Sheet */}
      <Sheet open={Boolean(selectedItem)} onOpenChange={(open) => !open && setSelectedItem(null)}>
        <SheetContent
          side="right"
          size="default"
          showCloseButton={false}
          className="w-full sm:max-w-md md:max-w-lg lg:max-w-xl flex flex-col h-full bg-white dark:bg-card border-l border-border dark:border-border p-0 shadow-2xl overflow-hidden"
        >
          {/* TOP HEADER: Operation Record Details + < > 01 of XX + X button */}
          <SheetHeader className="shrink-0 p-0 border-b border-border dark:border-border bg-white dark:bg-card">
            <div className="flex items-center justify-between px-6 py-4">
              <div>
                <SheetTitle className="text-base font-bold text-gray-900 dark:text-zinc-50 tracking-tight">
                  Operation Record Details
                </SheetTitle>
                <SheetDescription className="sr-only">
                  Detailed information for cross-office campus transaction
                </SheetDescription>
              </div>

              <div className="flex items-center gap-3">
                {sortedTransactions.length > 1 && (
                  <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-zinc-400">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          disabled={currentTxIndex <= 0}
                          onClick={handlePrevTx}
                          className="w-7 h-7 rounded-lg border border-border dark:border-border flex items-center justify-center hover:bg-gray-100 dark:hover:bg-zinc-800 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer shadow-2xs"
                          aria-label="Previous Record"
                        >
                          <HugeIcon className="ph-bold ph-caret-left text-xs" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>Previous Record</TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          disabled={currentTxIndex >= sortedTransactions.length - 1}
                          onClick={handleNextTx}
                          className="w-7 h-7 rounded-lg border border-border dark:border-border flex items-center justify-center hover:bg-gray-100 dark:hover:bg-zinc-800 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer shadow-2xs"
                          aria-label="Next Record"
                        >
                          <HugeIcon className="ph-bold ph-caret-right text-xs" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>Next Record</TooltipContent>
                    </Tooltip>

                    <span className="font-mono text-[11px] font-semibold text-gray-700 dark:text-zinc-300 ml-0.5">
                      {String(Math.max(1, currentTxIndex + 1)).padStart(2, "0")} of {String(sortedTransactions.length).padStart(2, "0")}
                    </span>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => setSelectedItem(null)}
                  className="w-8 h-8 rounded-xl bg-gray-100/90 hover:bg-gray-200/90 dark:bg-zinc-800/80 dark:hover:bg-zinc-700/80 text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-zinc-100 flex items-center justify-center transition-all cursor-pointer active:scale-95 border border-black/5 dark:border-white/10 shadow-2xs"
                  aria-label="Close"
                  title="Close"
                >
                  <HugeIcon className="ph-bold ph-x text-sm" />
                </button>
              </div>
            </div>
          </SheetHeader>

          {/* Edge-to-Edge Line-Attached Status Notice */}
          {sheetItem && (
            <div
              className={cn(
                "flex items-center gap-2.5 px-6 py-2.5 text-xs border-b transition-colors shrink-0",
                sheetItem?.status === "Ready" || sheetItem?.status === "Completed"
                  ? "border-emerald-200/90 bg-emerald-50/90 text-emerald-950 dark:border-emerald-900/40 dark:bg-emerald-950/25 dark:text-emerald-200"
                  : sheetItem?.status === "InProgress"
                  ? "border-blue-200/90 bg-blue-50/90 text-blue-950 dark:border-blue-900/40 dark:bg-blue-950/25 dark:text-blue-200"
                  : sheetItem?.status === "Cancelled" || sheetItem?.status === "Declined"
                  ? "border-rose-200/90 bg-rose-50/90 text-rose-950 dark:border-rose-900/40 dark:bg-rose-950/25 dark:text-rose-200"
                  : "border-amber-200/90 bg-amber-50/90 text-amber-950 dark:border-amber-900/40 dark:bg-amber-950/25 dark:text-amber-200"
              )}
            >
              <HugeIcon
                className={cn(
                  "ph-bold text-[15px] shrink-0",
                  sheetItem?.status === "Ready" || sheetItem?.status === "Completed"
                    ? "ph-shield-check text-emerald-600 dark:text-emerald-400"
                    : sheetItem?.status === "InProgress"
                    ? "ph-clock text-blue-600 dark:text-blue-400"
                    : sheetItem?.status === "Cancelled" || sheetItem?.status === "Declined"
                    ? "ph-x-circle text-rose-600 dark:text-rose-400"
                    : "ph-warning-circle text-amber-600 dark:text-amber-400"
                )}
              />
              <span className="font-medium text-[11.5px] sm:text-xs leading-normal">
                <strong className="font-semibold">
                  {sheetItem?.status === "Ready" || sheetItem?.status === "Completed"
                    ? "Completed Operation:"
                    : sheetItem?.status === "InProgress"
                    ? "Fulfillment In Progress:"
                    : sheetItem?.status === "Cancelled" || sheetItem?.status === "Declined"
                    ? "Operation Cancelled:"
                    : "Pending Operational Review:"}
                </strong>{" "}
                {sheetItem?.status === "Ready" || sheetItem?.status === "Completed"
                  ? "Transaction fulfillment finalized and archived across campus partitions."
                  : sheetItem?.status === "InProgress"
                  ? "Department personnel actively fulfilling credentials and processing records."
                  : sheetItem?.status === "Cancelled" || sheetItem?.status === "Declined"
                  ? "This cross-office operation was declined or cancelled."
                  : "Awaiting department evaluation and staff assignment."}
              </span>
            </div>
          )}

          {/* SCROLLABLE 1-COLUMN BODY */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Summary Strip */}
            <div className="flex items-start gap-3.5 pb-4 border-b border-border dark:border-border">
              <div
                className={cn(
                  "w-12 h-12 rounded-2xl flex items-center justify-center text-xl shrink-0 font-bold border mt-0.5 shadow-2xs",
                  sheetItem?.officeId === "registrar"
                    ? "bg-red-50 text-pup-maroon dark:bg-red-950/40 dark:text-red-400 border-red-200/60 dark:border-red-900/40"
                    : "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200/60 dark:border-blue-900/40"
                )}
              >
                <HugeIcon
                  className={
                    sheetItem?.officeId === "registrar"
                      ? "ph-bold ph-certificate"
                      : "ph-bold ph-student"
                  }
                />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  {sheetItem?.officeId === "registrar" ? (
                    <span className="font-mono text-[10px] font-semibold px-2 py-0.5 rounded-md bg-red-50 text-pup-maroon dark:bg-red-950/40 dark:text-red-400 border border-pup-maroon/20 inline-flex items-center gap-1">
                      Registrar
                    </span>
                  ) : (
                    <span className="font-mono text-[10px] font-semibold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200/50 dark:border-blue-800/30 inline-flex items-center gap-1">
                      OSAS
                    </span>
                  )}
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold shadow-2xs",
                      statusBadgeClass(sheetItem?.status)
                    )}
                  >
                    <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", getStatusDotColor(sheetItem?.status))} />
                    <span>{sheetItem?.status === "InProgress" ? "In Progress" : sheetItem?.status}</span>
                  </span>
                  <span className="font-mono text-[11px] text-gray-400 dark:text-zinc-500">
                    #{sheetItem?.id}
                  </span>
                </div>
                <h3 className="text-sm font-bold text-gray-900 dark:text-zinc-100 leading-snug break-words">
                  {sheetItem?.title}
                </h3>
                <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">
                  Requester: <strong className="text-gray-900 dark:text-zinc-200">{formatStudentRequester(sheetItem?.studentName, sheetItem?.studentNo)}</strong>
                </p>
              </div>
            </div>

            {/* SECTION 1: Transaction Specification (Unboxed InfoRow) */}
            <div className="space-y-2">
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-zinc-500">
                Transaction Specification
              </h4>
              <div className="divide-y divide-gray-100/70 dark:divide-zinc-800/50">
                <InfoRow
                  icon={sheetItem?.officeId === "registrar" ? "ph-certificate" : "ph-student"}
                  label="Department"
                  value={sheetItem?.officeId === "registrar" ? "University Registrar" : "Student Affairs (OSAS)"}
                />

                <InfoRow
                  icon="ph-identification-badge"
                  label="Student Number"
                  value={sheetItem?.studentNo}
                />

                <InfoRow icon="ph-chart-pie-slice" label="Current Stage">
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold shadow-2xs",
                        statusBadgeClass(sheetItem?.status)
                      )}
                    >
                      <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", getStatusDotColor(sheetItem?.status))} />
                      <span>{sheetItem?.status === "InProgress" ? "In Progress" : sheetItem?.status}</span>
                    </span>
                    <span className="text-[11px] font-mono text-gray-400">
                      {sheetItem?.createdAt ? formatRelativeTime(sheetItem.createdAt).relative : ""}
                    </span>
                  </div>
                </InfoRow>

                <InfoRow
                  icon="ph-clock"
                  label="Submitted At"
                  value={sheetItem?.createdAt ? formatPHDateTime(sheetItem.createdAt) : "N/A"}
                />

                {sheetItem?.organizationName && (
                  <InfoRow
                    icon="ph-buildings"
                    label="Organization"
                    value={sheetItem.organizationName}
                  />
                )}

                {sheetItem?.eventDate && (
                  <InfoRow
                    icon="ph-calendar"
                    label="Event Schedule"
                    value={sheetItem.eventDate.substring(0, 10)}
                  />
                )}
              </div>
            </div>

            {/* SECTION 2: Purpose & Remarks (Unboxed) */}
            <div className="space-y-1.5 pt-2">
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-zinc-500">
                Purpose & Remarks
              </h4>
              <p className="text-xs text-gray-700 dark:text-zinc-300 leading-relaxed whitespace-pre-wrap pt-0.5">
                {sheetItem?.notes || "No special remarks provided by the applicant."}
              </p>
            </div>

            {/* SECTION 3: Attached Document */}
            {sheetItem?.originalFilename && (
              <div className="space-y-2 pt-2">
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-zinc-500">
                  Attached Document
                </h4>
                <div className="p-3.5 rounded-xl border border-border dark:border-border bg-gray-50/60 dark:bg-zinc-900/40 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400 flex items-center justify-center shrink-0">
                      <HugeIcon className="ph-bold ph-file-pdf text-base" />
                    </div>
                    <div className="min-w-0">
                      <span className="font-semibold text-gray-900 dark:text-zinc-100 text-xs block truncate max-w-[200px]">
                        {sheetItem.originalFilename}
                      </span>
                      {sheetItem.sizeBytes && (
                        <span className="text-[10px] text-gray-400 font-mono">
                          {(sheetItem.sizeBytes / 1024).toFixed(1)} KB · PDF Document
                        </span>
                      )}
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenPdfPreview(sheetItem)}
                    className="text-xs font-semibold text-gray-700 dark:text-zinc-200 bg-white dark:bg-zinc-800 border border-border dark:border-border hover:bg-gray-50 dark:hover:bg-zinc-700 shrink-0 h-8 px-3 rounded-xl cursor-pointer shadow-xs active:scale-95 transition-all"
                  >
                    Preview Document
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* STICKY SHEET FOOTER */}
          <SheetFooter className="shrink-0 p-4 px-6 border-t border-border dark:border-border bg-gray-50/70 dark:bg-zinc-900/40 flex flex-row items-center justify-end shrink-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setSelectedItem(null)}
              className="h-10 px-5 text-xs font-semibold rounded-xl border border-border dark:border-border bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-xs cursor-pointer active:scale-95 transition-all"
            >
              Close
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

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
