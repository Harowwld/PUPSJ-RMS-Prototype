"use client"

import HugeIcon from "@/components/shared/HugeIcon";
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

function SortIndicator({ column, sortBy, sortOrder }) {
  if (sortBy !== column) {
    return <HugeIcon  className="ph-bold ph-caret-up-down ml-1 text-[11px] text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity"></HugeIcon>
  }
  return sortOrder === "ASC" ? (
    <HugeIcon  className="ph-bold ph-caret-up ml-1 text-[11px] text-pup-maroon dark:text-primary animate-in fade-in zoom-in duration-normal"></HugeIcon>
  ) : (
    <HugeIcon  className="ph-bold ph-caret-down ml-1 text-[11px] text-pup-maroon dark:text-primary animate-in fade-in zoom-in duration-normal"></HugeIcon>
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
        "grid grid-cols-[135px_12px_1fr] sm:grid-cols-[150px_14px_1fr] items-start gap-1 text-xs py-1.5 border-b border-gray-100/70 dark:border-zinc-800/50 last:border-0",
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
  );
}

export default function CampusOperationsTab() {
const [kpiOrder, setKpiOrder] = useState(["total","operational","maintenance"]);
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
            indicatorColor: "bg-amber-600",
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
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPage(1)
  }, [search, operationFilters, pageSize, setPage])

  const handleClearFilters = useCallback(() => {
    setSearch("")
    setOperationFilters({ department: [], status: [] })
    setPage(1)
  }, [setPage])

  const hasActiveFilters =
    Boolean(search?.trim()) ||
    Boolean(operationFilters.department?.length > 0) ||
    Boolean(operationFilters.status?.length > 0)

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
    <div className="animate-fade-up font-jakarta flex flex-col min-h-full w-full gap-6 pb-6">
      {/* ONE Single Card Container encapsulating Header, Metrics, Toolbar, Table & Pagination */}
      <Card className="flex h-auto w-full flex-col p-0 gap-0 overflow-visible rounded-2xl border border-border bg-white shadow-sm dark:border-border dark:bg-card dark:shadow-none isolate font-jakarta mb-4">
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
            <Reorder.Group as="div" axis="x" values={kpiOrder} onReorder={setKpiOrder}
              ref={statCardsRef}
              className="grid grid-cols-1 gap-4 md:grid-cols-2 items-start relative z-20 transition-all duration-500"
            >
              {kpiOrder.map((kpiKey) => {
                const stat = statCardsData.find(s => s.key === kpiKey);
                if (!stat) return null;
                return (
                <Reorder.Item as="div" value={stat.key}
                  key={stat.key}
                  className={cn(
                    "relative group rounded-xl",
                    selectedKpi === stat.key ? "z-30" : "z-10"
                  )}
                >
                  <div
                    onClick={() => setSelectedKpi(selectedKpi === stat.key ? null : stat.key)}
                    className={cn(
                      "relative overflow-hidden rounded-[18px] border cursor-pointer select-none transition-all shadow-none flex flex-col justify-between min-h-[110px] bg-gray-50 dark:bg-zinc-900",
                      selectedKpi === stat.key
                        ? `border-${stat.color}-500/50 ring-1 ring-${stat.color}-500/20`
                        : "border-border dark:border-border"
                    )}
                  >
                    <div className="flex justify-between items-start p-4 pb-0">
                      <div className="flex flex-col gap-1">
                        <span className="text-[13px] font-medium text-gray-900 dark:text-zinc-300 capitalize">
                          {stat.label}
                        </span>
                      </div>
                      <div className={cn("w-8 h-8 rounded-[10px] flex items-center justify-center text-white shadow-sm shrink-0", stat.color === "blue" ? "bg-[#3b82f6]" : "bg-[#10b981]")}>
                        <HugeIcon className={cn("ph-bold text-[15px]", stat.color === "blue" ? "ph-file-text" : "ph-users")} />
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-end p-4 pt-1">
                      <div className="flex flex-col gap-1">
                        <span className="text-[28px] font-bold text-gray-900 dark:text-white leading-none tracking-tight">
                          {typeof stat.value === "number" ? stat.value.toLocaleString() : stat.value}
                        </span>
                        <span className={cn("text-[11px] font-medium mb-1", `text-${stat.color}-600 dark:text-${stat.color}-400`)}>
                          {stat.sublabel}
                        </span>
                      </div>
                      <HugeIcon className="ph-bold ph-dots-six-vertical cursor-grab active:cursor-grabbing hover:text-black dark:hover:text-white text-gray-900 dark:text-zinc-300 text-xl mb-0.5" />
                    </div>
                  </div>
                  {/* Expandable details drawer */}
                  <div
                    className={cn(
                      "absolute top-full left-0 right-0 z-[100] mt-2 rounded-xl border border-border bg-white p-4 shadow-xl dark:border-border dark:bg-zinc-900 transition-all duration-300 ease-in-out origin-top",
                      selectedKpi === stat.key ? "scale-y-100 opacity-100 translate-y-0" : "scale-y-95 opacity-0 -translate-y-2 pointer-events-none"
                    )}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {stat.key === "odrs" && (
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-2">
                          <div className="bg-gray-50 dark:bg-zinc-800/60 p-2.5 rounded-lg border border-border dark:border-border">
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
                        <div className="bg-gray-50 dark:bg-zinc-800/60 p-2.5 rounded-lg border border-border dark:border-border text-xs text-gray-600 dark:text-zinc-300 leading-relaxed">
                          Online requests for Official Transcripts (TOR), Certifications, and Good Moral documents filed through the student portal.
                        </div>
                      </div>
                    )}

                    {stat.key === "osas" && (
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-2">
                          <div className="bg-gray-50 dark:bg-zinc-800/60 p-2.5 rounded-lg border border-border dark:border-border">
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
                        <div className="bg-gray-50 dark:bg-zinc-800/60 p-2.5 rounded-lg border border-border dark:border-border text-xs text-gray-600 dark:text-zinc-300 leading-relaxed">
                          Campus student organization event permits, activity proposals, and annual compliance submissions for OSAS review.
                        </div>
                      </div>
                    )}
                  </div>
                </Reorder.Item>
              );})}
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

        {/* Active Filter Chips Row */}
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
          className="border-t border-border dark:border-border bg-white dark:bg-card px-6 py-2.5"
        />

        {/* Cross-Department Activity Stream Table */}
        <div className="overflow-hidden rounded-b-2xl border-t border-border dark:border-border bg-white dark:bg-card flex flex-col flex-1">
            {loading ? (
              <TransactionsTableSkeleton rowCount={8} />
            ) : paginatedTransactions.length === 0 ? (
              <div className="py-16 rounded-b-2xl flex-1 flex flex-col items-center justify-center min-h-[420px] w-full">
                <Empty className="flex h-full flex-col items-center justify-center border-0 bg-transparent text-center">
                  <EmptyHeader className="flex flex-col items-center gap-0">
                    <div className="relative mb-6">
                      <div className="absolute inset-0 scale-150 animate-pulse rounded-full bg-gray-50 opacity-50 dark:bg-card"></div>
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
              <div className="overflow-x-auto">
                <table className="w-full text-sm table-fixed min-w-[1080px]">
                  <thead className="sticky top-0 z-10 border-b-[0.5px] border-black/10 dark:border-border bg-white dark:bg-card">
                    <tr className="text-left text-[12px] font-medium tracking-[0.04em] text-[#8E8E93] dark:text-zinc-500 h-11 select-none">
                      <th className="p-4 w-[8%]">
                        <button
                          onClick={() => handleSort("id")}
                          className={cn(
                            "group flex items-center transition-colors focus:outline-none cursor-pointer text-[12px] font-medium tracking-[0.04em]",
                            sortBy === "id" ? "text-[#111111] dark:text-white" : "text-[#8E8E93] dark:text-zinc-500 hover:text-[#111111] dark:hover:text-white"
                          )}
                        >
                          ID <SortIndicator column="id" sortBy={sortBy} sortOrder={sortOrder} />
                        </button>
                      </th>
                      <th className="p-4 w-[12%]">
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
                      <th className="p-4 w-[18%]">
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
                      <th className="p-4 w-[25%]">
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
                      <th className="p-4 w-[16%]">
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
                      <th className="p-4 w-[10%]">
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
                      <th className="p-4 w-[8%]">
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
                      <th className="p-4 pr-6 text-right w-20 text-[12px] font-medium tracking-[0.04em] text-[#8E8E93] dark:text-zinc-500">
                        Actions
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-border dark:divide-border font-medium text-gray-900 dark:text-zinc-100 bg-white dark:bg-[#1c1c1e]">
                    {paginatedTransactions.map((tx) => {
                      const isRegistrar = tx.officeId === "registrar"
                      const rel = formatRelativeTime(tx.createdAt)

                      return (
                        <tr
                          key={tx.id}
                          onClick={() => handleOpenDetails(tx)}
                          className="group h-[52px] border-b-[0.5px] border-border dark:border-border last:border-b-0 transition-all duration-200 hover:bg-gray-50/40 dark:bg-card dark:hover:bg-white/2 cursor-pointer select-none"
                        >
                          {/* Transaction ID */}
                          <td className="p-4 align-middle whitespace-nowrap">
                            <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded-md bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-zinc-300">
                              #{tx.id}
                            </span>
                          </td>

                          {/* Department Badge */}
                          <td className="p-4 align-middle whitespace-nowrap">
                            {isRegistrar ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[#800000]/10 text-pup-maroon dark:bg-pup-maroon/20 dark:text-rose-300">
                                <HugeIcon  className="ph-bold ph-certificate text-xs"></HugeIcon>
                                Registrar
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
                                <HugeIcon  className="ph-bold ph-student text-xs"></HugeIcon>
                                OSAS
                              </span>
                            )}
                          </td>

                          {/* Student Requester */}
                          <td className="p-4 align-middle overflow-hidden">
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
                          <td className="p-4 align-middle overflow-hidden">
                            <div className="font-medium text-[13px] text-gray-900 dark:text-zinc-100 truncate" title={tx.title}>
                              {tx.title}
                            </div>
                            {tx.originalFilename && (
                              <div className="text-[11px] text-[#8E8E93] dark:text-zinc-500 flex items-center gap-1 mt-0.5">
                                <HugeIcon  className="ph-bold ph-file-pdf text-red-500 shrink-0"></HugeIcon>
                                <span className="truncate" title={tx.originalFilename}>{tx.originalFilename}</span>
                              </div>
                            )}
                          </td>

                          {/* Organization / Reference */}
                          <td className="p-4 align-middle overflow-hidden">
                            {tx.organizationName ? (
                              <div className="text-[12px] font-semibold text-blue-600 dark:text-blue-400 truncate" title={tx.organizationName}>
                                {tx.organizationName}
                              </div>
                            ) : (
                              <div className="text-[12px] text-gray-900 dark:text-zinc-300 truncate" title={tx.notes || "Standard student request"}>
                                {tx.notes || "Standard student request"}
                              </div>
                            )}
                          </td>

                          {/* Stage Status Badge */}
                          <td className="p-4 align-middle whitespace-nowrap">
                            <span className={cn(
                              "inline-flex items-center justify-center rounded-full px-[10px] py-[2.5px] text-[11px] font-medium whitespace-nowrap",
                              statusBadgeClass(tx.status)
                            )}>
                              {tx.status === "InProgress" ? "In Progress" : tx.status}
                            </span>
                          </td>

                          {/* Date Submitted */}
                          <td className="p-4 align-middle text-[12px] text-gray-900 dark:text-zinc-300 whitespace-nowrap font-mono">
                            {rel.relative || rel.date}
                          </td>

                          {/* Action Button */}
                          <td className="py-0 px-4 pr-6 text-right align-middle" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button
                                    onClick={() => handleOpenDetails(tx)}
                                    aria-label="View Details"
                                    className="w-7 h-7 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-zinc-100 focus:outline-none cursor-pointer active:scale-95 flex items-center justify-center transition-colors border-0 bg-transparent"
                                  >
                                    <HugeIcon  className="ph-bold ph-eye text-[16px]"></HugeIcon>
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
                <div className="flex items-center gap-6 text-xs text-gray-900 dark:text-zinc-300 select-none">
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
                    className="text-xs text-gray-900 dark:text-zinc-300 disabled:opacity-40 cursor-pointer rounded-xl h-8 px-3"
                  >
                    Prev
                  </Button>

                  <div className="h-8 w-8 rounded-xl border border-[#e5e5ea] dark:border-border flex items-center justify-center text-xs font-bold text-gray-800 dark:text-zinc-200 bg-white dark:bg-zinc-900">
                    {page}
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={page >= totalPages || endIndex >= sortedTransactions.length}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    className="text-xs text-gray-900 dark:text-zinc-300 disabled:opacity-40 cursor-pointer rounded-xl h-8 px-3"
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
                    <button
                      type="button"
                      disabled={currentTxIndex <= 0}
                      onClick={handlePrevTx}
                      className="w-7 h-7 rounded-lg border border-border/80 dark:border-border flex items-center justify-center hover:bg-gray-100 dark:hover:bg-zinc-800 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
                      aria-label="Previous Record"
                      title="Previous Record"
                    >
                      <HugeIcon className="ph-bold ph-caret-left text-xs" />
                    </button>
                    <button
                      type="button"
                      disabled={currentTxIndex >= sortedTransactions.length - 1}
                      onClick={handleNextTx}
                      className="w-7 h-7 rounded-lg border border-border/80 dark:border-border flex items-center justify-center hover:bg-gray-100 dark:hover:bg-zinc-800 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
                      aria-label="Next Record"
                      title="Next Record"
                    >
                      <HugeIcon className="ph-bold ph-caret-right text-xs" />
                    </button>
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

          {/* SCROLLABLE 1-COLUMN BODY */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Summary Strip */}
            <div className="flex items-start gap-3.5 pb-4 border-b border-border/80 dark:border-border">
              <div
                className={cn(
                  "w-12 h-12 rounded-2xl flex items-center justify-center text-xl shrink-0 font-bold border mt-0.5",
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
                      "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold",
                      statusBadgeClass(sheetItem?.status)
                    )}
                  >
                    {sheetItem?.status === "InProgress" ? "In Progress" : sheetItem?.status}
                  </span>
                  <span className="font-mono text-[11px] text-gray-400">
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

            {/* SECTION 1: Operation Specification (Unboxed InfoRow) */}
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
                  icon="ph-user"
                  label="Student Requester"
                  value={formatStudentRequester(sheetItem?.studentName, sheetItem?.studentNo)}
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
                        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold",
                        statusBadgeClass(sheetItem?.status)
                      )}
                    >
                      {sheetItem?.status === "InProgress" ? "In Progress" : sheetItem?.status}
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

            {/* SECTION 2: Purpose & Remarks */}
            <div className="space-y-2 pt-2">
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-zinc-500">
                Purpose & Remarks
              </h4>
              <div className="rounded-xl border border-border/80 dark:border-border bg-gray-50/50 dark:bg-zinc-900/30 p-3.5">
                <p className="text-xs text-gray-700 dark:text-zinc-300 leading-relaxed whitespace-pre-wrap">
                  {sheetItem?.notes || "No special remarks provided by the applicant."}
                </p>
              </div>
            </div>

            {/* SECTION 3: Attached Document */}
            {sheetItem?.originalFilename && (
              <div className="space-y-2 pt-2">
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-zinc-500">
                  Attached Document
                </h4>
                <div className="p-3.5 rounded-xl border border-border/80 dark:border-border bg-gray-50/60 dark:bg-zinc-900/40 flex items-center justify-between gap-3">
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
                    className="text-xs font-semibold text-gray-700 dark:text-zinc-200 bg-white dark:bg-zinc-800 border border-border dark:border-border hover:bg-gray-50 dark:hover:bg-zinc-700 shrink-0 h-8 px-2.5 rounded-lg cursor-pointer shadow-xs active:scale-95 transition-all"
                  >
                    <HugeIcon className="ph-bold ph-eye text-sm mr-1" /> Preview
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
