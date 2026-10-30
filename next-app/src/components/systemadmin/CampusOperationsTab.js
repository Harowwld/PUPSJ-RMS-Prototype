"use client"

import HugeIcon from "@/components/shared/HugeIcon"
import useUrlPage from "@/hooks/useUrlPage"
import React, { useState, useRef, useEffect, useMemo, useCallback } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
import ServiceStandardsSheet from "./ServiceStandardsSheet"

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

export function formatTransactionId(tx) {
  if (!tx) return ""
  const num = tx.originalId ?? (typeof tx.id === "string" ? tx.id.replace(/^[a-z]+-/, "") : tx.id)
  const padded = String(num || 0).padStart(3, "0")
  if (tx.officeId === "registrar" || tx.type === "document_request") {
    return `#ODRS-${padded}`
  }
  if (tx.officeId === "osas" || tx.type === "event_proposal") {
    return `#OSAS-${padded}`
  }
  return `#TX-${padded}`
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
  )
}

export default function CampusOperationsTab({ showToast, initialStandardsOpen = false }) {
  const [standardsSheetOpen, setStandardsSheetOpen] = useState(Boolean(initialStandardsOpen))
  const [slaStandards, setSlaStandards] = useState(null)
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

  // Request Details Sheet
  const [selectedItem, setSelectedItem] = useState(null)
  const [sheetItem, setSheetItem] = useState(null)

  const handleOpenDetails = useCallback((item) => {
    setSheetItem(item)
    setSelectedItem(item)
  }, [])

  const handleCopy = useCallback((text, label) => {
    if (!text) return
    navigator.clipboard?.writeText(String(text))
    showToast?.({
      title: "Copied to Clipboard",
      description: `${label} has been successfully copied to your clipboard.`,
    })
  }, [showToast])

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

  const fetchSlaStandards = useCallback(async () => {
    try {
      const res = await fetch("/api/system/sla-settings", { cache: "no-store" })
      const json = await res.json()
      if (res.ok && json.ok) {
        setSlaStandards(json.data)
      }
    } catch (err) {
      console.warn("[CampusOperations] Failed to load SLA standards:", err)
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchHealth()
    fetchSlaStandards()
  }, [fetchHealth, fetchSlaStandards])

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
        const formattedId = formatTransactionId(tx).toLowerCase()
        const rawId = String(tx.originalId || "").toLowerCase()
        const matchId =
          String(tx.id || "").toLowerCase().includes(q) ||
          formattedId.includes(q) ||
          rawId.includes(q)
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
        aVal = Number(a.originalId) || Number(String(a.id).replace(/\D+/g, "")) || 0
        bVal = Number(b.originalId) || Number(String(b.id).replace(/\D+/g, "")) || 0
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

  return (
    <div className="animate-fade-up flex flex-[1_0_auto] flex-col w-full gap-6">
      {/* ONE Single Card Container encapsulating Header, Toolbar, Table & Pagination */}
      <Card className="flex flex-[1_0_auto] h-auto w-full flex-col p-0 gap-0 overflow-visible rounded-2xl border border-border bg-white shadow-sm dark:border-border dark:bg-card dark:shadow-none isolate">
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

        {/* Full Top-Level Turnaround Standards Institutional Banner */}
        <div className="border-t border-border dark:border-border px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gray-50/40 dark:bg-zinc-900/30 text-xs transition-colors">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-pup-maroon/10 text-pup-maroon border border-pup-maroon/20 dark:bg-red-950/40 dark:text-red-400 dark:border-red-900/40 shadow-2xs">
              <HugeIcon className="ph-bold ph-timer text-lg" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-semibold text-gray-900 dark:text-zinc-100">
                  {slaStandards?.frameworkName || "Citizen's Charter (ARTA RA 11032)"}
                </p>
                <span className="font-mono text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white dark:bg-zinc-800 text-gray-800 dark:text-zinc-200 border border-gray-200/80 dark:border-zinc-700/60 shadow-2xs">
                  {slaStandards?.simpleDays ?? 3}-{slaStandards?.complexDays ?? 7}-{slaStandards?.highlyTechnicalDays ?? 20}d SLA
                </span>
                <span className="text-[11px] text-gray-500 dark:text-zinc-400 font-normal">
                  • {slaStandards?.workingDaysOnly !== false ? "Business Days (Mon–Fri)" : "Consecutive Calendar Days"}
                </span>
              </div>
              <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">
                Automated turnaround compliance targets and queue SLA velocity across Registrar and OSAS operations are measured against this baseline.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
            <Button
              type="button"
              variant="outline"
              onClick={() => setStandardsSheetOpen(true)}
              className="h-9 px-4 text-xs font-semibold rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-xs cursor-pointer active:scale-95 transition-all flex items-center gap-1.5"
            >
              <HugeIcon className="ph-bold ph-sliders text-xs" />
              <span>Configure Standards</span>
            </Button>
          </div>
        </div>

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
              <table className="w-full text-sm border-separate border-spacing-0 min-w-[1240px]">
                <thead className="sticky top-0 z-10 border-b border-border bg-gray-50/90 dark:bg-zinc-900/90 backdrop-blur-xs select-none">
                  <tr className="text-left text-xs font-semibold text-gray-500 dark:text-zinc-400 h-11 select-none">
                    {/* ID Header */}
                    <th
                      className={cn(
                        "p-4 pl-6 w-[100px] min-w-[100px] max-w-[100px] whitespace-nowrap sticky left-0 z-20 bg-gray-50/90 dark:bg-zinc-900/90 backdrop-blur-xs transition-shadow",
                        isScrolled && "shadow-[4px_0_12px_-2px_rgba(0,0,0,0.06)] dark:shadow-[4px_0_12px_-2px_rgba(0,0,0,0.4)]"
                      )}
                    >
                      <button
                        onClick={() => handleSort("id")}
                        className={cn(
                          "group flex items-center transition-colors focus:outline-none cursor-pointer text-xs font-semibold",
                          sortBy === "id" ? "text-gray-900 dark:text-white" : "text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white"
                        )}
                      >
                        ID <SortIndicator column="id" sortBy={sortBy} sortOrder={sortOrder} />
                      </button>
                    </th>

                    {/* Department */}
                    <th className="p-4 w-[130px] min-w-[130px]">
                      <button
                        onClick={() => handleSort("officeId")}
                        className={cn(
                          "group flex items-center transition-colors focus:outline-none cursor-pointer text-xs font-semibold",
                          sortBy === "officeId" ? "text-gray-900 dark:text-white" : "text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white"
                        )}
                      >
                        Department <SortIndicator column="officeId" sortBy={sortBy} sortOrder={sortOrder} />
                      </button>
                    </th>

                    {/* Student Requester */}
                    <th className="p-4 w-[200px] min-w-[180px] max-w-[240px]">
                      <button
                        onClick={() => handleSort("studentName")}
                        className={cn(
                          "group flex items-center transition-colors focus:outline-none cursor-pointer text-xs font-semibold",
                          sortBy === "studentName" ? "text-gray-900 dark:text-white" : "text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white"
                        )}
                      >
                        Student Requester <SortIndicator column="studentName" sortBy={sortBy} sortOrder={sortOrder} />
                      </button>
                    </th>

                    {/* Document or Proposal Title */}
                    <th className="p-4 w-[270px] min-w-[200px] max-w-[340px]">
                      <button
                        onClick={() => handleSort("title")}
                        className={cn(
                          "group flex items-center transition-colors focus:outline-none cursor-pointer text-xs font-semibold",
                          sortBy === "title" ? "text-gray-900 dark:text-white" : "text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white"
                        )}
                      >
                        Document or Proposal Title <SortIndicator column="title" sortBy={sortBy} sortOrder={sortOrder} />
                      </button>
                    </th>

                    {/* Student Org / Details */}
                    <th className="p-4 w-[220px] min-w-[180px] max-w-[340px]">
                      <button
                        onClick={() => handleSort("organizationName")}
                        className={cn(
                          "group flex items-center transition-colors focus:outline-none cursor-pointer text-xs font-semibold",
                          sortBy === "organizationName" ? "text-gray-900 dark:text-white" : "text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white"
                        )}
                      >
                        Student Org / Details <SortIndicator column="organizationName" sortBy={sortBy} sortOrder={sortOrder} />
                      </button>
                    </th>

                    {/* Stage Status */}
                    <th className="p-4 w-[140px] min-w-[140px]">
                      <button
                        onClick={() => handleSort("status")}
                        className={cn(
                          "group flex items-center transition-colors focus:outline-none cursor-pointer text-xs font-semibold",
                          sortBy === "status" ? "text-gray-900 dark:text-white" : "text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white"
                        )}
                      >
                        Stage Status <SortIndicator column="status" sortBy={sortBy} sortOrder={sortOrder} />
                      </button>
                    </th>

                    {/* Submitted */}
                    <th className="p-4 w-[130px] min-w-[130px]">
                      <button
                        onClick={() => handleSort("createdAt")}
                        className={cn(
                          "group flex items-center transition-colors focus:outline-none cursor-pointer text-xs font-semibold",
                          sortBy === "createdAt" ? "text-gray-900 dark:text-white" : "text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white"
                        )}
                      >
                        Submitted <SortIndicator column="createdAt" sortBy={sortBy} sortOrder={sortOrder} />
                      </button>
                    </th>

                    {/* Actions */}
                    <th className="px-1 py-3 text-center w-12 min-w-[48px] max-w-[48px] text-[11px] font-semibold text-gray-500 dark:text-zinc-400 sticky right-0 z-20 bg-gray-50/90 dark:bg-zinc-900/90 backdrop-blur-xs">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-border dark:divide-border font-medium text-gray-900 dark:text-zinc-100 bg-white dark:bg-card">
                  {paginatedTransactions.map((tx) => {
                    const isRegistrar = tx.officeId === "registrar"
                    const rel = formatRelativeTime(tx.createdAt)

                    return (
                      <tr
                        key={tx.id}
                        onClick={() => handleOpenDetails(tx)}
                        className="group h-[52px] border-b border-border dark:border-border last:border-b-0 transition-colors hover:bg-gray-50/70 dark:hover:bg-zinc-800/40 cursor-pointer select-none"
                      >
                        {/* Transaction ID (Sticky Left) */}
                        <td
                          className={cn(
                            "p-4 pl-6 align-middle whitespace-nowrap sticky left-0 z-10 bg-white dark:bg-card group-hover:bg-gray-50/70 dark:group-hover:bg-zinc-800/40 transition-shadow border-b border-border dark:border-border border-r border-border/70 dark:border-border/70",
                            isScrolled && "shadow-[4px_0_12px_-2px_rgba(0,0,0,0.06)] dark:shadow-[4px_0_12px_-2px_rgba(0,0,0,0.4)]"
                          )}
                        >
                          <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded-md bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-zinc-300">
                            {formatTransactionId(tx)}
                          </span>
                        </td>

                        {/* Department Badge */}
                        <td className="p-4 align-middle whitespace-nowrap border-b border-border dark:border-border border-r border-border/70 dark:border-border/70">
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
                        <td className="p-4 align-middle overflow-hidden max-w-[240px] border-b border-border dark:border-border border-r border-border/70 dark:border-border/70">
                          <div className="w-full min-w-0">
                            <div
                              className="font-semibold text-[13px] text-gray-900 dark:text-zinc-50 truncate block"
                              title={formatStudentRequester(tx.studentName, tx.studentNo)}
                            >
                              {formatStudentRequester(tx.studentName, tx.studentNo)}
                            </div>
                            <div className="text-[11px] font-mono text-[#8E8E93] dark:text-zinc-500 mt-0.5 truncate block">
                              {tx.studentNo}
                            </div>
                          </div>
                        </td>

                        {/* Document or Proposal Title */}
                        <td className="p-4 align-middle overflow-hidden max-w-[340px] border-b border-border dark:border-border border-r border-border/70 dark:border-border/70">
                          <div className="w-full min-w-0">
                            <div className="font-medium text-[13px] text-gray-900 dark:text-zinc-100 truncate block" title={tx.title}>
                              {tx.title}
                            </div>
                            {tx.originalFilename && (
                              <div className="text-[11px] text-[#8E8E93] dark:text-zinc-500 flex items-center gap-1 mt-0.5 min-w-0">
                                <HugeIcon className="ph-bold ph-file-pdf text-red-500 shrink-0" />
                                <span className="truncate block" title={tx.originalFilename}>{tx.originalFilename}</span>
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Student Org / Details */}
                        <td className="p-4 align-middle overflow-hidden max-w-[340px] border-b border-border dark:border-border border-r border-border/70 dark:border-border/70">
                          <div className="w-full min-w-0">
                            {tx.organizationName ? (
                              <div className="text-[12px] font-semibold text-blue-600 dark:text-blue-400 truncate block" title={tx.organizationName}>
                                {tx.organizationName}
                              </div>
                            ) : (
                              <div className="text-[12px] text-gray-600 dark:text-zinc-300 truncate block" title={tx.notes || "Standard student request"}>
                                {tx.notes || "Standard student request"}
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Stage Status Badge */}
                        <td className="p-4 align-middle whitespace-nowrap border-b border-border dark:border-border border-r border-border/70 dark:border-border/70">
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
                        <td className="p-4 align-middle text-[12px] text-gray-700 dark:text-zinc-300 whitespace-nowrap font-mono border-b border-border dark:border-border border-r border-border/70 dark:border-border/70">
                          {rel.relative || rel.date}
                        </td>

                        {/* Action Button (Sticky Right, Fixed 48px) */}
                        <td
                          className="py-0 px-2 text-center align-middle whitespace-nowrap sticky right-0 z-10 bg-white dark:bg-card group-hover:bg-gray-50/70 dark:group-hover:bg-zinc-800/40 border-b border-border dark:border-border w-12 min-w-[48px] max-w-[48px]"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex items-center justify-center">
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
            <div className="mt-auto flex flex-col sm:flex-row items-center justify-between border-t border-border dark:border-border bg-white dark:bg-card p-4 px-6 rounded-b-2xl gap-3">
              <div className="flex items-center gap-6 text-xs text-gray-900 dark:text-zinc-300 select-none">
                <span>
                  Showing {paginatedTransactions.length} of {sortedTransactions.length} records
                </span>
                <div className="flex items-center gap-2">
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
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="text-xs text-gray-900 dark:text-zinc-300 disabled:opacity-40 cursor-pointer rounded-xl h-8 px-3"
                >
                  Prev
                </Button>

                <div className="h-8 min-w-[32px] px-2.5 rounded-xl border border-border dark:border-border bg-white dark:bg-zinc-900 font-bold text-xs flex items-center justify-center text-gray-800 dark:text-zinc-200 shadow-2xs font-mono">
                  {page}
                </div>

                <Button
                  type="button"
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
            {/* Identity / Transaction Summary Strip (Unboxed) */}
            <div className="flex items-center justify-between gap-3 pb-4 border-b border-border/80 dark:border-border">
              <div className="flex items-center gap-3.5 min-w-0">
                <div
                  className={cn(
                    "size-11 rounded-2xl flex items-center justify-center text-xl shrink-0 font-bold border shadow-2xs",
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
                <div className="min-w-0">
                  <span className="text-sm font-bold text-gray-900 dark:text-zinc-100 truncate block">
                    {sheetItem?.title}
                  </span>
                  <p className="text-[11px] text-gray-500 dark:text-zinc-400 truncate mt-0.5">
                    Requester: <strong className="text-gray-900 dark:text-zinc-200 font-semibold">{formatStudentRequester(sheetItem?.studentName, sheetItem?.studentNo)}</strong>
                    {sheetItem?.studentNo ? ` • ${sheetItem.studentNo}` : ""}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className="font-mono text-xs font-semibold px-2.5 py-1 rounded-full bg-white dark:bg-zinc-800 text-gray-800 dark:text-zinc-200 border border-gray-200/80 dark:border-zinc-700/60 shadow-2xs">
                  {formatTransactionId(sheetItem)}
                </span>
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold border shadow-2xs",
                    statusBadgeClass(sheetItem?.status)
                  )}
                >
                  <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", getStatusDotColor(sheetItem?.status))} />
                  {sheetItem?.status === "InProgress" ? "In Progress" : sheetItem?.status}
                </span>
              </div>
            </div>

            {/* SECTION 1: Transaction Specification */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 pb-1.5 border-b border-border/80 dark:border-border">
                <HugeIcon className="ph-bold ph-sliders text-pup-maroon dark:text-red-400 text-sm" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-800 dark:text-zinc-200">
                  Transaction Specification
                </h3>
              </div>

              <div className="divide-y-0">
                <InfoRow
                  icon="ph-bold ph-hash"
                  label="Transaction ID"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-gray-800 dark:text-zinc-200 font-semibold">
                      {formatTransactionId(sheetItem)}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopy(formatTransactionId(sheetItem), "Transaction ID")}
                      className="w-5 h-5 rounded hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-400 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-zinc-100 flex items-center justify-center transition-colors cursor-pointer"
                      title="Copy Transaction ID"
                    >
                      <HugeIcon className="ph-bold ph-copy text-[11px]" />
                    </button>
                  </div>
                </InfoRow>

                <InfoRow
                  icon={sheetItem?.officeId === "registrar" ? "ph-bold ph-certificate" : "ph-bold ph-student"}
                  label="Department"
                >
                  {sheetItem?.officeId === "registrar" ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#800000]/10 text-pup-maroon dark:bg-pup-maroon/20 dark:text-rose-300 border border-pup-maroon/20">
                      <HugeIcon className="ph-bold ph-certificate text-xs" />
                      University Registrar
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200/50 dark:border-blue-800/30">
                      <HugeIcon className="ph-bold ph-student text-xs" />
                      Student Affairs (OSAS)
                    </span>
                  )}
                </InfoRow>

                <InfoRow
                  icon="ph-bold ph-chart-pie-slice"
                  label="Current Stage"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold border shadow-2xs",
                        statusBadgeClass(sheetItem?.status)
                      )}
                    >
                      <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", getStatusDotColor(sheetItem?.status))} />
                      <span>{sheetItem?.status === "InProgress" ? "In Progress" : sheetItem?.status}</span>
                    </span>
                    <span className="text-[11px] font-mono text-gray-400 font-normal">
                      {sheetItem?.createdAt ? formatRelativeTime(sheetItem.createdAt).relative : ""}
                    </span>
                  </div>
                </InfoRow>

                <InfoRow
                  icon="ph-bold ph-user"
                  label="Student Requester"
                >
                  <div className="flex items-center gap-2">
                    <span>{formatStudentRequester(sheetItem?.studentName, sheetItem?.studentNo)}</span>
                    {sheetItem?.studentName && (
                      <button
                        type="button"
                        onClick={() => handleCopy(sheetItem.studentName, "Requester Name")}
                        className="w-5 h-5 rounded hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-400 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-zinc-100 flex items-center justify-center transition-colors cursor-pointer"
                        title="Copy Requester Name"
                      >
                        <HugeIcon className="ph-bold ph-copy text-[11px]" />
                      </button>
                    )}
                  </div>
                </InfoRow>

                <InfoRow
                  icon="ph-bold ph-identification-badge"
                  label="Student Number"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-semibold text-gray-800 dark:text-zinc-200">
                      {sheetItem?.studentNo}
                    </span>
                    {sheetItem?.studentNo && (
                      <button
                        type="button"
                        onClick={() => handleCopy(sheetItem.studentNo, "Student Number")}
                        className="w-5 h-5 rounded hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-400 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-zinc-100 flex items-center justify-center transition-colors cursor-pointer"
                        title="Copy Student Number"
                      >
                        <HugeIcon className="ph-bold ph-copy text-[11px]" />
                      </button>
                    )}
                  </div>
                </InfoRow>

                <InfoRow
                  icon="ph-bold ph-clock"
                  label="Submitted At"
                >
                  <span className="font-mono text-xs font-semibold text-gray-800 dark:text-zinc-200">
                    {sheetItem?.createdAt ? formatPHDateTime(sheetItem.createdAt) : "N/A"}
                  </span>
                </InfoRow>

                {sheetItem?.organizationName && (
                  <InfoRow
                    icon="ph-bold ph-buildings"
                    label="Organization"
                    value={sheetItem.organizationName}
                  />
                )}

                {sheetItem?.eventDate && (
                  <InfoRow
                    icon="ph-bold ph-calendar"
                    label="Event Schedule"
                    value={sheetItem.eventDate.substring(0, 10)}
                  />
                )}
              </div>
            </div>

            {/* SECTION 2: Purpose & Remarks */}
            <div className="space-y-2 pt-2">
              <div className="flex items-center gap-2 pb-1.5 border-b border-border/80 dark:border-border">
                <HugeIcon className="ph-bold ph-chat-text text-pup-maroon dark:text-red-400 text-sm" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-800 dark:text-zinc-200">
                  Purpose & Remarks
                </h3>
              </div>
              <p className="text-xs text-gray-700 dark:text-zinc-300 leading-relaxed whitespace-pre-wrap pt-0.5">
                {sheetItem?.notes || "No special remarks provided by the applicant."}
              </p>
            </div>

            {/* SECTION 3: Attached Document */}
            {sheetItem?.originalFilename && (
              <div className="space-y-2 pt-2">
                <div className="flex items-center gap-2 pb-1.5 border-b border-border/80 dark:border-border">
                  <HugeIcon className="ph-bold ph-file-pdf text-pup-maroon dark:text-red-400 text-sm" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-gray-800 dark:text-zinc-200">
                    Attached Document
                  </h3>
                </div>
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

          {/* Executive Action Bar Sheet Footer */}
          <SheetFooter className="shrink-0 p-4 px-6 border-t border-border dark:border-border bg-gray-50/70 dark:bg-zinc-900/40 flex flex-row items-center justify-between">
            <div>
              {sheetItem && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleCopy(JSON.stringify(sheetItem, null, 2), "Operation Record JSON")}
                  className="h-10 px-4 text-xs font-semibold rounded-xl border border-border dark:border-border bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-xs cursor-pointer active:scale-95 transition-all flex items-center gap-2"
                  title="Copy operation record data"
                >
                  <HugeIcon className="ph-bold ph-copy text-sm" />
                  <span>Copy Record Data</span>
                </Button>
              )}
            </div>

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

      {/* Service Standards Configuration Sheet */}
      <ServiceStandardsSheet
        open={standardsSheetOpen}
        onOpenChange={setStandardsSheetOpen}
        showToast={showToast}
        onStandardsUpdated={() => {
          fetchHealth(true)
          fetchSlaStandards()
        }}
      />
    </div>
  )
}
