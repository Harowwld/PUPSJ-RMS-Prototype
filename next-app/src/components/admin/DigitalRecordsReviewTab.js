"use client"

import { Table } from "@/components/ui/table"
import TablePagination from "@/components/shared/TablePagination"
import useUrlPage from "@/hooks/useUrlPage"
import { PDF_ACTION_LABELS } from "@/lib/pdfPreview"

import { useState, useMemo, useEffect, useRef, useCallback } from "react"
import { Reorder } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { SegmentedControl } from "@/components/ui/tabs"
import ViewModeIcon from "@/components/shared/ViewModeIcon"
import {
  FilterPopover,
  SortPopover,
  GroupPopover,
  ColumnsPopover,
} from "@/components/systemadmin/OfficeTableControls"
import DashboardSearch from "@/components/systemadmin/DashboardSearch"
import DigitalRecordsList, {
  formatUploadedDate,
} from "@/components/admin/records-review/DigitalRecordsList"
import DigitalRecordsKanbanPipeline from "@/components/admin/records-review/DigitalRecordsKanbanPipeline"
import DigitalRecordActionsMenu from "@/components/admin/records-review/DigitalRecordActionsMenu"
import KpiStatCardsSkeleton from "@/components/systemadmin/skeletons/KpiStatCardsSkeleton"
import RecordsReviewTableSkeleton from "@/components/admin/skeletons/RecordsReviewTableSkeleton"
import { format } from "date-fns"
import { DateRangeFilterButton } from "@/components/shared/DateRangePickerModal"
import { cn, formatTitleCase } from "@/lib/utils"
import { BADGE_BASE, BADGE_PALETTES } from "@/lib/badgeStyles"
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
  EmptyMedia,
} from "@/components/ui/empty"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

import PageHeader from "@/components/shared/PageHeader"
import FloatingActionBar from "@/components/shared/FloatingActionBar"
import { RefreshButton } from "@/components/shared/RefreshButton"
import ActiveFilterChips from "@/components/shared/ActiveFilterChips"
import TableScrollControls from "@/components/shared/TableScrollControls"
import DataViewToolbar from "@/components/shared/DataViewToolbar"
import { toast } from "sonner"
import {
  AlertCircleIcon as EmptyAlertCircleIcon,
  Search01Icon as EmptySearch01Icon,
  Alert01Icon,
  ArrowDown01Icon,
  ArrowUp01Icon,
  ArrowUpDownIcon,
  Cancel01Icon,
  CancelCircleIcon,
  CheckmarkCircle01Icon,
  Clock01Icon,
  RotateLeft01Icon,
  Tick01Icon,
  ViewIcon,
} from "hugeicons-react"
import AppIcon from "@/components/ui/app-icon"

function SortIndicator({ column, sortBy, sortOrder }) {
  if (sortBy !== column) {
    return (
      <ArrowUpDownIcon
        size="1em"
        className="ml-1 text-[12px] text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity"
      />
    )
  }
  return sortOrder === "ASC" ? (
    <ArrowUp01Icon size="1em" className="ml-1 text-[12px] text-gray-400" />
  ) : (
    <ArrowDown01Icon size="1em" className="ml-1 text-[12px] text-gray-400" />
  )
}

function formatChipDate(dateStr) {
  if (!dateStr) return "..."
  try {
    const d = new Date(dateStr.includes("T") ? dateStr : dateStr + "T00:00:00")
    return isNaN(d.getTime()) ? dateStr : format(d, "MMM d, yyyy")
  } catch {
    return dateStr
  }
}

export default function DigitalRecordsReviewTab({
  officeId,
  records,
  totalCount = 0,
  serverStats,
  onQueryChange,
  isLoading,
  isManualLoading = false,
  error = null,
  statusFilter,
  setStatusFilter,
  onRefresh,
  onApprove,
  onDecline,
  onBulkApprove,
  onBulkDecline,
  onSetStatus,
  onPreviewDocument,
  showToast,
  onLogAction,
}) {
  const isOsas = String(officeId || "").toLowerCase() === "osas"
  const [searchQuery, setSearchQuery] = useState("")
  const [localSearch, setLocalSearch] = useState("")
  const [currentPage, setCurrentPage] = useUrlPage()
  const [itemsPerPage, setItemsPerPage] = useState(20)
  const [docTypeFilters, setDocTypeFilters] = useState([])
  const [statusFilters, setStatusFilters] = useState(() => {
    if (!statusFilter || statusFilter === "All") return []
    return statusFilter.split(",").map((s) => s.trim()).filter(Boolean)
  })
  const [activeDocTypes, setActiveDocTypes] = useState([])
  const [sortBy, setSortBy] = useState("created_at")
  const [sortOrder, setSortOrder] = useState("DESC")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [lastSelectedId, setLastSelectedId] = useState(null)

  // Multi-View state (Lazy initialization to prevent layout shift & flicker)
  const [viewMode, setViewMode] = useState(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("pup_records_review_view_mode")
        if (saved && ["list", "table", "kanban"].includes(saved)) return saved
      } catch {}
    }
    return "table"
  })

  const [filterRules, setFilterRules] = useState([])
  const [groupBy, setGroupBy] = useState("status")
  const [visibleColumns, setVisibleColumns] = useState([
    "student_no",
    "student_name",
    "doc_type",
    "original_filename",
    "status",
    "created_at",
  ])

  const tableColumns = useMemo(
    () => [
      ...(!isOsas ? [{ key: "student_no", label: "Student No." }] : []),
      { key: "student_name", label: isOsas ? "Organization" : "Full Name" },
      { key: "doc_type", label: "Document Type" },
      { key: "original_filename", label: "Filename" },
      { key: "status", label: "Status" },
      { key: "created_at", label: "Upload Date" },
    ],
    [isOsas]
  )

  const groupOptions = useMemo(
    () => [
      { key: "status", label: "Status" },
      { key: "docType", label: "Document Type" },
      { key: "none", label: "No Grouping" },
    ],
    []
  )

  const sortOptions = useMemo(
    () => [
      { key: "created_at", label: "Upload Date" },
      ...(!isOsas ? [{ key: "student_no", label: "Student ID" }] : []),
      { key: "student_name", label: isOsas ? "Organization" : "Student Name" },
      { key: "doc_type", label: "Document Type" },
      { key: "approval_status", label: "Status" },
    ],
    [isOsas]
  )

  const filterFields = useMemo(
    () => [
      {
        key: "status",
        label: "Status",
        options: [
          { value: "Pending", label: "Pending" },
          { value: "Approved", label: "Approved" },
          { value: "Declined", label: "Declined" },
        ],
      },
      {
        key: "doc_type",
        label: "Document Type",
        options: activeDocTypes.map((name) => ({ value: name, label: name })),
      },
    ],
    [activeDocTypes]
  )

  const handleViewModeChange = (mode) => {
    setViewMode(mode)
    try {
      localStorage.setItem("pup_records_review_view_mode", mode)
    } catch {}
  }

  // Horizontal scroll container ref & scroll state
  const tableContainerRef = useRef(null)
  const [isScrolledX, setIsScrolledX] = useState(false)

  const handleScroll = (e) => {
    setIsScrolledX(e.currentTarget.scrollLeft > 10)
  }

  const scrollTable = useCallback((direction) => {
    if (tableContainerRef.current) {
      const amount = direction === "left" ? -350 : 350
      tableContainerRef.current.scrollBy({ left: amount, behavior: "smooth" })
    }
  }, [])

  const resetTableScroll = useCallback(() => {
    if (tableContainerRef.current) {
      tableContainerRef.current.scrollTo({ left: 0, behavior: "smooth" })
    }
  }, [])

  useEffect(() => {
    if (tableContainerRef.current) {
      tableContainerRef.current.scrollTo({ left: 0 })
      setIsScrolledX(false)
    }
  }, [currentPage, itemsPerPage, statusFilter, searchQuery])

  // Synchronize statusFilters when external statusFilter prop changes
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!statusFilter || statusFilter === "All") {
        setStatusFilters((prev) => prev.length ? [] : prev)
      } else {
        const list = statusFilter.split(",").map((s) => s.trim()).filter(Boolean)
        setStatusFilters((prev) => prev.length === list.length && prev.every((value, index) => value === list[index]) ? prev : list)
      }
    }, 0)
    return () => clearTimeout(timer)
  }, [statusFilter])


  useEffect(() => {
    const handler = setTimeout(() => {
      setSearchQuery(localSearch)
      setCurrentPage(1)
    }, 300)
    return () => clearTimeout(handler)
  }, [localSearch, setCurrentPage])

  useEffect(() => {
    if (searchQuery !== "") return
    const timer = setTimeout(() => setLocalSearch(""), 0)
    return () => clearTimeout(timer)
  }, [searchQuery])

  // Clear selection when changing pages or status filter
  useEffect(() => {
    const timer = setTimeout(() => {
      setSelectedIds(new Set())
      setLastSelectedId(null)
    }, 0)
    return () => clearTimeout(timer)
  }, [currentPage, statusFilters, docTypeFilters, searchQuery, dateFrom, dateTo, filterRules])

  // Prune stale selections when records dataset updates
  useEffect(() => {
    if (!records) return
    const timer = setTimeout(() => {
      setSelectedIds((prev) => {
        if (prev.size === 0) return prev
        const validIds = new Set(records.map((r) => r.id))
        let needsPruning = false
        for (const id of prev) {
          if (!validIds.has(id)) {
            needsPruning = true
            break
          }
        }
        if (!needsPruning) return prev
        const next = new Set()
        for (const id of prev) {
          if (validIds.has(id)) next.add(id)
        }
        return next
      })
    }, 0)
    return () => clearTimeout(timer)
  }, [records])

  useEffect(() => {
    let cancelled = false
    fetch("/api/doc-types")
      .then((res) => (res.ok ? res.json().catch(() => null) : null))
      .then((json) => {
        if (!cancelled && json?.ok && Array.isArray(json.data)) {
          setActiveDocTypes(json.data)
        }
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  const handleSort = (column) => {
    if (sortBy === column) {
      if (sortOrder === "ASC") {
        setSortOrder("DESC")
      } else if (column !== "created_at") {
        setSortBy("created_at")
        setSortOrder("DESC")
      } else {
        setSortOrder("ASC")
      }
    } else {
      setSortBy(column)
      setSortOrder("ASC")
    }
    setCurrentPage(1)
  }

  const query = useMemo(() => ({
    page: currentPage,
    pageSize: itemsPerPage,
    statusFilters,
    docTypeFilters,
    filterRules,
    search: searchQuery,
    dateFrom,
    dateTo,
    sortBy,
    sortOrder,
  }), [currentPage, itemsPerPage, statusFilters, docTypeFilters, filterRules, searchQuery, dateFrom, dateTo, sortBy, sortOrder])

  useEffect(() => { onQueryChange?.(query) }, [onQueryChange, query])

  const sortedRecords = records || []
  const totalPages = Math.ceil(totalCount / itemsPerPage) || 1
  const displayPage = Math.min(currentPage, totalPages)
  const paginatedRecords = sortedRecords

  useEffect(() => {
    if (serverStats && currentPage > totalPages) setCurrentPage(totalPages)
  }, [currentPage, totalPages, serverStats, setCurrentPage])

  const toggleSelectAll = (checked) => {
    if (checked) {
      const allIds = paginatedRecords.map((r) => r.id)
      setSelectedIds(new Set(allIds))
    } else {
      setSelectedIds(new Set())
    }
    setLastSelectedId(null)
  }

  const toggleSelectRow = (id, event) => {
    const record = paginatedRecords.find((r) => r.id === id) || records?.find((r) => r.id === id)
    if (!record) return

    const isSelected = selectedIds.has(id)

    if (event?.shiftKey && lastSelectedId) {
      if (isSelected) {
        if (selectedIds.size > 1) {
          setSelectedIds(new Set([id]))
          setLastSelectedId(id)
        } else {
          setSelectedIds(new Set())
          setLastSelectedId(null)
        }
        return
      }

      const currentIdx = paginatedRecords.findIndex((r) => r.id === id)
      const lastIdx = paginatedRecords.findIndex((r) => r.id === lastSelectedId)

      if (currentIdx !== -1 && lastIdx !== -1) {
        const start = Math.min(currentIdx, lastIdx)
        const end = Math.max(currentIdx, lastIdx)
        const idsInRange = paginatedRecords
          .slice(start, end + 1)
          .map((r) => r.id)

        const next = new Set(selectedIds)
        idsInRange.forEach((rangeId) => next.add(rangeId))
        setSelectedIds(next)
        setLastSelectedId(id)
        return
      }
    }

    const next = new Set(selectedIds)
    if (next.has(id)) {
      next.delete(id)
      if (lastSelectedId === id) setLastSelectedId(null)
    } else {
      next.add(id)
      setLastSelectedId(id)
    }
    setSelectedIds(next)
  }

  const handleApprove = async (id) => {
    try {
      setSelectedIds((prev) => {
        if (!prev.has(id)) return prev
        const next = new Set(prev)
        next.delete(id)
        return next
      })
      await onApprove(id, true)
      toast.success("Record Approved", {
        description: "The digital record has been finalized.",
        action: {
          label: "UNDO",
          onClick: () => onSetStatus(id, "Pending", "Undo accidental approval"),
        },
      })
    } catch {}
  }

  const handleBulkApproveAction = async () => {
    const ids = Array.from(selectedIds)
    if (ids.length === 0) return
    try {
      if (onBulkApprove) {
        setSelectedIds(new Set())
        await onBulkApprove(ids)
      }
    } catch {}
  }

  const handleBulkApprove = () => {
    handleBulkApproveAction()
  }

  const handleBulkDecline = () => {
    if (onBulkDecline) {
      onBulkDecline(Array.from(selectedIds))
      setSelectedIds(new Set())
    }
  }

  const getStatusBadge = (status) => {
    const s = String(status || "").toLowerCase();
    if (s.includes("approve")) return BADGE_PALETTES.emerald;
    if (s.includes("decline") || s.includes("reject")) return BADGE_PALETTES.rose;
    return BADGE_PALETTES.amber;
  }

  const handlePreview = (record) => {
    fetch(`/api/documents/${record.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isPreviewed: true }),
    })
      .then((res) => (res.ok ? res.json().catch(() => null) : null))
      .then((json) => {
        if (json?.ok && onRefresh) {
          onRefresh()
        }
      })
      .catch((err) => console.error("[Preview PATCH Error]", err))

    if (onPreviewDocument) {
      onPreviewDocument({
        docId: record.id,
        docType: record.doc_type,
        studentName: (isOsas ? record.organization_name || record.student_name : record.student_name) || "Unknown",
        studentNo: isOsas ? undefined : record.student_no,
        refId: record.id,
      })
    }
  }

  const stats = serverStats || { total: 0, pending: 0, pendingToday: 0, approvedToday: 0, totalApproved: 0, declinedToday: 0, totalDeclined: 0 }

  const handleClearFilters = useCallback(() => {
    setLocalSearch("")
    setSearchQuery("")
    setFilterRules([])
    setStatusFilters([])
    setStatusFilter?.("All")
    setDocTypeFilters([])
    setDateFrom("")
    setDateTo("")
    setCurrentPage(1)
  }, [setStatusFilter, setCurrentPage])

  const activeChips = useMemo(() => {
    const chips = []
    if (localSearch.trim()) {
      chips.push({
        id: "search",
        label: `Search: ${localSearch.trim()}`,
        onRemove: () => {
          setLocalSearch("")
          setSearchQuery("")
          setCurrentPage(1)
        },
      })
    }
    filterRules.forEach((rule) => {
      const field = filterFields.find((f) => f.key === rule.fieldKey)
      const fieldLabel = field?.label || rule.fieldKey
      const optionLabel =
        field?.options?.find((o) => String(o.value) === String(rule.value))?.label || rule.value
      chips.push({
        id: rule.id,
        label: `${fieldLabel} ${rule.operator === "is_not" ? "is not" : "is"} ${optionLabel}`,
        onRemove: () => {
          setFilterRules((prev) => prev.filter((r) => r.id !== rule.id))
          setCurrentPage(1)
        },
      })
    })
    // Note: statusFilters represents the top-level segmented scope tabs (All, Pending, Approved, Declined)
    // and is intentionally excluded from activeChips so switching tabs does not activate the filter chips row.
    docTypeFilters.forEach((dt) => {
      chips.push({
        id: `docType-${dt}`,
        label: `Type: ${dt}`,
        onRemove: () => {
          setDocTypeFilters((prev) => prev.filter((d) => d !== dt))
          setCurrentPage(1)
        },
      })
    })
    if (dateFrom || dateTo) {
      chips.push({
        id: "dateRange",
        label: `Date: ${formatChipDate(dateFrom)} – ${formatChipDate(dateTo)}`,
        onRemove: () => {
          setDateFrom("")
          setDateTo("")
          setCurrentPage(1)
        },
      })
    }
    return chips
  }, [
    localSearch,
    filterRules,
    filterFields,
    docTypeFilters,
    dateFrom,
    dateTo,
    setCurrentPage,
  ])

  const currentScope = useMemo(() => {
    if (statusFilters.length === 1) return statusFilters[0]
    return "All"
  }, [statusFilters])

  const handleScopeChange = (scope) => {
    if (scope === "All") {
      setStatusFilters([])
      setStatusFilter?.("All")
    } else {
      setStatusFilters([scope])
      setStatusFilter?.(scope)
    }
    setCurrentPage(1)
  }

  const orderedVisibleColumns = useMemo(() => {
    return tableColumns.filter((col) => visibleColumns.includes(col.key))
  }, [tableColumns, visibleColumns])

  const activeTableColumns = useMemo(() => {
    const columnMap = {
      student_no: "identifier",
      student_name: "text",
      doc_type: "category",
      original_filename: { kind: "text", maxWidth: 340 },
      status: "status",
      created_at: "date",
    }
    return [
      "selection",
      ...orderedVisibleColumns.map((col) => columnMap[col.key] || "text"),
      "actions",
    ]
  }, [orderedVisibleColumns])

  return (
    <TooltipProvider delayDuration={200}>
      <div className="animate-fade-up font-jakarta flex flex-[1_0_auto] flex-col w-full gap-6">
        {/* ONE Single Card Container encapsulating Header, Metrics, Tabs, Toolbar, View & Pagination */}
        <Card className="flex flex-[1_0_auto] h-auto w-full flex-col p-0 gap-0 overflow-hidden rounded-2xl border border-border bg-white shadow-sm dark:border-border dark:bg-card dark:shadow-none isolate font-jakarta">
          {/* 1. Page Header */}
          <PageHeader
            icon="CheckmarkBadge01Icon"
            title={
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span>Records Review</span>
                <span className="text-[11px] font-normal tracking-normal text-gray-500 dark:text-zinc-400 tabular-nums">
                  {stats.total.toLocaleString()} records · {stats.pending.toLocaleString()} pending review
                </span>
              </div>
            }
            description={isOsas ? "Verify organization document submissions." : "Verify student record submissions."}
            showBorder={false}
            className="p-6"
            titleClassName="text-[18px] font-semibold tracking-[-0.01em] text-gray-900 dark:text-zinc-50"
            descriptionClassName="text-[13px] font-normal text-gray-900 dark:text-zinc-300 mt-[4px]"
            actions={
              <div className="flex items-center gap-2">
                <RefreshButton
                  onRefresh={onRefresh}
                  isLoading={isManualLoading}
                  title="Refresh Review Data"
                  className="h-9 w-9"
                />
              </div>
            }
          />

          {/* Color Stat Cards / Skeletons at the Top */}
          {isLoading && !isManualLoading && !records ? (
            <div className="px-6 pb-6">
              <div className="p-3 sm:p-3.5 rounded-[22px] bg-[#f4f5f7] dark:bg-zinc-900/60 border border-black/[0.05] dark:border-white/[0.08]">
                <KpiStatCardsSkeleton count={3} />
              </div>
            </div>
          ) : !error ? (
            <div className="px-6 pb-6">
              <div className="p-3 sm:p-3.5 rounded-[22px] bg-[#f4f5f7] dark:bg-zinc-900/60 border border-black/[0.05] dark:border-white/[0.08]">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
                  {/* Card 1: Pending Review */}
                  <div className="rounded-[18px] p-4 sm:p-4.5 bg-white dark:bg-zinc-800 border border-black/[0.06] dark:border-white/[0.08] shadow-[0_2px_8px_rgba(0,0,0,0.03),0_1px_2px_rgba(0,0,0,0.02)] flex flex-col justify-between select-none">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="size-5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                          <Clock01Icon size="0.75em" />
                        </div>
                        <span className="text-xs font-semibold text-gray-500 dark:text-zinc-400 tracking-tight">
                          Pending Review
                        </span>
                      </div>
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-black/[0.04] dark:bg-white/[0.06] text-xs font-jakarta select-none">
                        <Clock01Icon size={12} className="text-amber-600 dark:text-amber-400 shrink-0" />
                        <span className="font-semibold text-gray-900 dark:text-zinc-100">Needs Action</span>
                      </span>
                    </div>
                    <div className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900 dark:text-zinc-50 font-jakarta mt-2">
                      {stats.pending.toLocaleString()}
                    </div>
                    <div className="text-[11.5px] text-gray-400 dark:text-zinc-500 mt-2 font-medium">
                      {stats.pendingToday.toLocaleString()} received today
                    </div>
                  </div>

                  {/* Card 2: Approved Records */}
                  <div className="rounded-[18px] p-4 sm:p-4.5 bg-white dark:bg-zinc-800 border border-black/[0.06] dark:border-white/[0.08] shadow-[0_2px_8px_rgba(0,0,0,0.03),0_1px_2px_rgba(0,0,0,0.02)] flex flex-col justify-between select-none">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="size-5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                          <CheckmarkCircle01Icon size="0.75em" />
                        </div>
                        <span className="text-xs font-semibold text-gray-500 dark:text-zinc-400 tracking-tight">
                          Approved
                        </span>
                      </div>
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-black/[0.04] dark:bg-white/[0.06] text-xs font-jakarta select-none">
                        <span className="size-3.5 rounded-full bg-emerald-600 dark:bg-emerald-500 text-white inline-flex items-center justify-center shrink-0">
                          <Tick01Icon size={8} className="stroke-[3]" />
                        </span>
                        <span className="font-semibold text-gray-900 dark:text-zinc-100">Archival Ready</span>
                      </span>
                    </div>
                    <div className="text-xl sm:text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 font-jakarta mt-2">
                      {stats.totalApproved.toLocaleString()}
                    </div>
                    <div className="text-[11.5px] text-gray-400 dark:text-zinc-500 mt-2 font-medium">
                      {stats.approvedToday.toLocaleString()} approved today
                    </div>
                  </div>

                  {/* Card 3: Declined Records */}
                  <div className="rounded-[18px] p-4 sm:p-4.5 bg-white dark:bg-zinc-800 border border-black/[0.06] dark:border-white/[0.08] shadow-[0_2px_8px_rgba(0,0,0,0.03),0_1px_2px_rgba(0,0,0,0.02)] flex flex-col justify-between select-none">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="size-5 rounded-full bg-rose-500/15 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                          <CancelCircleIcon size="0.75em" />
                        </div>
                        <span className="text-xs font-semibold text-gray-500 dark:text-zinc-400 tracking-tight">
                          Declined
                        </span>
                      </div>
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-black/[0.04] dark:bg-white/[0.06] text-xs font-jakarta select-none">
                        <CancelCircleIcon size={12} className="text-rose-600 dark:text-rose-400 shrink-0" />
                        <span className="font-semibold text-gray-900 dark:text-zinc-100">Returned</span>
                      </span>
                    </div>
                    <div className="text-xl sm:text-2xl font-bold tracking-tight text-rose-600 dark:text-rose-400 font-jakarta mt-2">
                      {stats.totalDeclined.toLocaleString()}
                    </div>
                    <div className="text-[11.5px] text-gray-400 dark:text-zinc-500 mt-2 font-medium">
                      {stats.declinedToday.toLocaleString()} returned today
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {/* 2. Connected Segmented Tabs Row (Status Scope & View Mode Switcher) */}
          <div
            role="group"
            aria-label="Digital records review status scope and view mode"
            className="flex items-center justify-between px-6 py-2.5 border-t border-border dark:border-white/10 bg-white dark:bg-card overflow-x-auto scrollbar-none gap-4"
          >
            {/* Left: Status Scope Tabs */}
            <SegmentedControl
              id="records-review-scope"
              value={currentScope}
              onValueChange={handleScopeChange}
              variant="capsule"
              className="inline-grid grid-flow-col auto-cols-fr shrink-0"
              items={[
                { value: "All", label: "All Records", badge: stats.total },
                { value: "Pending", label: "Pending", badge: stats.pending },
                { value: "Approved", label: "Approved", badge: stats.totalApproved },
                { value: "Declined", label: "Declined", badge: stats.totalDeclined },
              ]}
            />

            {/* Right: View Mode Switcher */}
            <div className="ml-auto shrink-0">
              <SegmentedControl
                id="records-review-view-mode"
                value={viewMode}
                onValueChange={handleViewModeChange}
                variant="capsule"
                className="inline-grid grid-flow-col auto-cols-fr shrink-0"
                items={[
                  {
                    value: "kanban",
                    label: "Kanban",
                    icon: <ViewModeIcon mode="kanban" className="text-sm" />,
                  },
                  {
                    value: "list",
                    label: "List",
                    icon: <ViewModeIcon mode="list" className="text-sm" />,
                  },
                  {
                    value: "table",
                    label: "Table",
                    icon: <ViewModeIcon mode="table" className="text-sm" />,
                  },
                ]}
              />
            </div>
          </div>

          {/* 3. Navigation Toolbar */}
          <DataViewToolbar
            label="Digital records search, filters, sorting, grouping, and columns"
            className="border-t border-border dark:border-border p-4 sm:px-5 sm:py-3 gap-2 bg-white dark:bg-card flex flex-wrap items-center justify-between"
          >
            {/* Left Group */}
            <div className="flex min-w-0 items-center gap-2">
              <DashboardSearch
                value={localSearch}
                onChange={setLocalSearch}
                count={totalCount}
                loading={isLoading && !isManualLoading}
                label={isOsas ? "Search organization records" : "Search student records"}
                placeholder={isOsas ? "Search organization, document type..." : "Search student, name, doc type..."}
              />
              {viewMode === "table" && (
                <TableScrollControls
                  scrollContainerRef={tableContainerRef}
                  onScrollLeft={() => scrollTable("left")}
                  onScrollRight={() => scrollTable("right")}
                  onResetScroll={resetTableScroll}
                  isScrolled={isScrolledX}
                />
              )}
            </div>

            {/* Right Group: Reused UI popovers */}
            <div className="ml-auto flex shrink-0 items-center gap-2">
              <FilterPopover
                fields={filterFields}
                filters={filterRules}
                onFiltersChange={(newRules) => {
                  setFilterRules(newRules)
                  setCurrentPage(1)
                }}
                entityLabel="records"
              />
              <SortPopover
                options={sortOptions}
                sortBy={sortBy}
                onSortByChange={(val) => {
                  setSortBy(val)
                  setSortOrder("DESC")
                }}
                sortOrder={sortOrder}
                onSortOrderChange={setSortOrder}
              />
              <GroupPopover
                options={groupOptions}
                groupBy={groupBy}
                onGroupByChange={setGroupBy}
              />
              {viewMode === "table" && (
                <ColumnsPopover
                  columns={tableColumns}
                  visibleColumns={visibleColumns}
                  onVisibleColumnsChange={setVisibleColumns}
                  minVisible={2}
                />
              )}
              <DateRangeFilterButton
                startDate={dateFrom}
                endDate={dateTo}
                onApply={({ startDate, endDate }) => {
                  setDateFrom(startDate)
                  setDateTo(endDate)
                  setCurrentPage(1)
                }}
                onClear={() => {
                  setDateFrom("")
                  setDateTo("")
                  setCurrentPage(1)
                }}
                disableFutureDates={true}
              />
            </div>
          </DataViewToolbar>

          {/* 4. Active Filter Chips Row */}
          {activeChips.length > 0 && (
            <div className="border-t border-border dark:border-border px-6 py-2.5 flex items-center justify-between gap-4 bg-white dark:bg-card">
              <div className="flex-1 min-w-0">
                <ActiveFilterChips
                  chips={activeChips}
                  onClearAll={handleClearFilters}
                  className="p-0 border-0"
                />
              </div>
            </div>
          )}

          {/* 5. Content Area */}
          <div className="relative flex flex-[1_0_auto] flex-col" aria-busy={isLoading || undefined}>
          {isLoading && !isManualLoading && !records ? (
            <RecordsReviewTableSkeleton rowCount={itemsPerPage} embedded={true} isOrganizationRecords={isOsas} />
          ) : error ? (
            <div className="flex flex-[1_0_auto] min-h-[420px] flex-col items-center justify-center border-t border-border dark:border-border bg-transparent text-center p-6 rounded-b-2xl">
              <Empty>
                <EmptyHeader>
                  <EmptyMedia className="text-red-600 dark:text-red-400">
                    <EmptyAlertCircleIcon size="1em" />
                  </EmptyMedia>
                  <EmptyTitle>Load failed</EmptyTitle>
                  <EmptyDescription>{error}</EmptyDescription>
                </EmptyHeader>
              </Empty>
            </div>
          ) : sortedRecords.length === 0 ? (
            <div className="rounded-b-2xl flex-1 flex flex-col items-center justify-center min-h-[420px] w-full">
              <Empty>
                <EmptyHeader>
                  <EmptyMedia>
                    <EmptySearch01Icon size="1em" />
                  </EmptyMedia>
                  <EmptyTitle>
                    {activeChips.length > 0 ? "No Records Found" : "No Records Yet"}
                  </EmptyTitle>
                  <EmptyDescription>
                    {activeChips.length > 0
                      ? "Try adjusting your search filters to find what you're looking for."
                      : isOsas
                        ? "There are currently no organization records in the system."
                        : "There are currently no digital records in the system."}
                  </EmptyDescription>
                </EmptyHeader>
                <EmptyContent>
                  {activeChips.length > 0 ? (
                    <Button
                      variant="outline"
                      onClick={handleClearFilters}
                      title="Reset Filters"
                      className="flex h-9 items-center justify-center rounded-xl border border-black/[0.08] dark:border-white/[0.1] bg-white dark:bg-zinc-800 px-4 text-xs font-semibold text-gray-700 dark:text-zinc-200 shadow-xs transition-all hover:bg-gray-50 dark:hover:bg-zinc-700 active:scale-95 cursor-pointer"
                    >
                      Reset Filters
                    </Button>
                  ) : currentScope !== "All" && stats.total > 0 ? (
                    <Button
                      variant="outline"
                      onClick={() => handleScopeChange("All")}
                      title="View All Records"
                      className="flex h-9 items-center justify-center rounded-xl border border-black/[0.08] dark:border-white/[0.1] bg-white dark:bg-zinc-800 px-4 text-xs font-semibold text-gray-700 dark:text-zinc-200 shadow-xs transition-all hover:bg-gray-50 dark:hover:bg-zinc-700 active:scale-95 cursor-pointer"
                    >
                      View All Records
                    </Button>
                  ) : null}
                </EmptyContent>
              </Empty>
            </div>
          ) : viewMode === "list" ? (
            <div className="w-full flex-[1_0_auto] flex flex-col border-t border-border dark:border-border">
              <DigitalRecordsList
                records={paginatedRecords}
                isOsas={isOsas}
                groupBy={groupBy}
                selectedIds={selectedIds}
                onToggleSelect={toggleSelectRow}
                onPreview={handlePreview}
                onApprove={handleApprove}
                onDecline={onDecline}
                onSetStatus={onSetStatus}
                getStatusBadge={getStatusBadge}
              />
              <TablePagination
                label="Digital record review pages"
                page={displayPage}
                pageSize={itemsPerPage}
                totalCount={totalCount}
                displayedCount={paginatedRecords.length}
                loading={isLoading || !serverStats}
                onPageChange={setCurrentPage}
                onPageSizeChange={setItemsPerPage}
              />
            </div>
          ) : viewMode === "kanban" ? (
            <div className="w-full flex-1 flex flex-col min-h-0 border-t border-border dark:border-border">
              <DigitalRecordsKanbanPipeline
                records={sortedRecords}
                isOsas={isOsas}
                onPreview={handlePreview}
                onApprove={handleApprove}
                onDecline={onDecline}
                onSetStatus={onSetStatus}
                onDropItem={async (item, targetStatus) => {
                  if (targetStatus === "Approved") {
                    await handleApprove(item.id)
                  } else if (targetStatus === "Declined") {
                    onDecline?.(item.id)
                  } else if (targetStatus === "Pending") {
                    await onSetStatus?.(
                      item.id,
                      "Pending",
                      "Moved back to review queue via Kanban"
                    )
                  }
                }}
              />
              <TablePagination
                label="Digital record review pages"
                page={displayPage}
                pageSize={itemsPerPage}
                totalCount={totalCount}
                displayedCount={paginatedRecords.length}
                loading={isLoading || !serverStats}
                onPageChange={setCurrentPage}
                onPageSizeChange={setItemsPerPage}
              />
            </div>
          ) : (
            <div className="w-full flex-[1_0_auto] flex flex-col border-t border-border dark:border-border">
              <div
                ref={tableContainerRef}
                onScroll={handleScroll}
                className="w-full flex-[1_0_auto] overflow-x-auto show-scrollbar pb-2"
              >
                <Table columns={activeTableColumns} className={isOsas ? "min-w-[1220px]" : "min-w-[1380px]"}>
                  <thead className="sticky top-0 z-10 border-b border-border bg-white dark:bg-card select-none">
                    <tr className="text-left text-xs font-semibold text-gray-500 dark:text-zinc-400">
                      <th className="w-12 p-4 text-center align-middle sticky left-0 z-20 bg-white dark:bg-card">
                        <input
                          type="checkbox"
                          className="h-4 w-4 m-0 align-middle shrink-0 cursor-pointer rounded border border-border text-pup-maroon dark:text-primary accent-pup-maroon focus:ring-pup-maroon disabled:opacity-20 dark:text-primary dark:border-border"
                          checked={
                            paginatedRecords.length > 0 &&
                            paginatedRecords.every((r) => selectedIds.has(r.id))
                          }
                          onChange={(e) => toggleSelectAll(e.target.checked)}
                          disabled={paginatedRecords.length === 0}
                          aria-label="Select all records on this page"
                        />
                      </th>
                      {!isOsas && visibleColumns.includes("student_no") && (
                        <th
                          className={cn(
                            "p-4 w-[160px] min-w-[160px] sticky left-12 z-20 bg-white dark:bg-card transition-shadow",
                            isScrolledX &&
                              "shadow-[4px_0_12px_-2px_rgba(0,0,0,0.06)] dark:shadow-[4px_0_12px_-2px_rgba(0,0,0,0.4)]"
                          )}
                        >
                          <div className="flex items-center justify-between gap-1">
                            <button
                              type="button"
                              onClick={() => handleSort("student_no")}
                              className={cn(
                                "group flex items-center transition-colors focus:outline-none cursor-pointer text-xs font-semibold",
                                sortBy === "student_no"
                                  ? "text-gray-900 dark:text-white"
                                  : "text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white"
                              )}
                            >
                              <span>Student No.</span>{" "}
                              <SortIndicator
                                column="student_no"
                                sortBy={sortBy}
                                sortOrder={sortOrder}
                              />
                            </button>
                            {isScrolledX && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  resetTableScroll()
                                }}
                                title="Reset scroll to start"
                                className="w-5 h-5 flex items-center justify-center rounded bg-gray-200/70 hover:bg-gray-300 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-gray-600 dark:text-zinc-300 transition-colors"
                              >
                                <AppIcon className=" ArrowLeft01Icon text-[10px]" />
                              </button>
                            )}
                          </div>
                        </th>
                      )}
                      {visibleColumns.includes("student_name") && (
                        <th className="p-4 w-[220px] min-w-[220px]">
                          <button
                            type="button"
                            onClick={() => handleSort("student_name")}
                            className={cn(
                              "group flex items-center transition-colors focus:outline-none cursor-pointer text-xs font-semibold",
                              sortBy === "student_name"
                                ? "text-gray-900 dark:text-white"
                                : "text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white"
                            )}
                          >
                            {isOsas ? "Organization" : "Full Name"}{" "}
                            <SortIndicator
                              column="student_name"
                              sortBy={sortBy}
                              sortOrder={sortOrder}
                            />
                          </button>
                        </th>
                      )}
                      {visibleColumns.includes("doc_type") && (
                        <th className="p-4 w-[180px] min-w-[180px] text-center">
                          <button
                            type="button"
                            onClick={() => handleSort("doc_type")}
                            className={cn(
                              "group mx-auto inline-flex items-center justify-center transition-colors focus:outline-none cursor-pointer text-xs font-semibold",
                              sortBy === "doc_type"
                                ? "text-gray-900 dark:text-white"
                                : "text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white"
                            )}
                          >
                            Document Type{" "}
                            <SortIndicator
                              column="doc_type"
                              sortBy={sortBy}
                              sortOrder={sortOrder}
                            />
                          </button>
                        </th>
                      )}
                      {visibleColumns.includes("original_filename") && (
                        <th className="p-4 w-[220px] min-w-[220px] text-xs font-semibold text-gray-500 dark:text-zinc-400">
                          Filename
                        </th>
                      )}
                      {visibleColumns.includes("status") && (
                        <th className="p-4 w-[130px] min-w-[130px] text-center">
                          <button
                            type="button"
                            onClick={() => handleSort("approval_status")}
                            className={cn(
                              "group mx-auto inline-flex items-center justify-center transition-colors focus:outline-none cursor-pointer text-xs font-semibold",
                              sortBy === "approval_status"
                                ? "text-gray-900 dark:text-white"
                                : "text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white"
                            )}
                          >
                            Status{" "}
                            <SortIndicator
                              column="approval_status"
                              sortBy={sortBy}
                              sortOrder={sortOrder}
                            />
                          </button>
                        </th>
                      )}
                      {visibleColumns.includes("created_at") && (
                        <th className="p-4 w-[150px] min-w-[150px]">
                          <button
                            type="button"
                            onClick={() => handleSort("created_at")}
                            className={cn(
                              "group flex items-center transition-colors focus:outline-none cursor-pointer text-xs font-semibold",
                              sortBy === "created_at"
                                ? "text-gray-900 dark:text-white"
                                : "text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white"
                            )}
                          >
                            Upload Date{" "}
                            <SortIndicator
                              column="created_at"
                              sortBy={sortBy}
                              sortOrder={sortOrder}
                            />
                          </button>
                        </th>
                      )}
                      <th className="w-12 p-0 text-center">
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border dark:divide-border bg-white dark:bg-card">
                    {paginatedRecords.map((r) => {
                      const isSelected = selectedIds.has(r.id)

                      return (
                        <tr
                          key={r.id}
                          selected={isSelected}
                          className={cn(
                            "group cursor-pointer transition-colors hover:bg-gray-50/70 dark:hover:bg-zinc-800/40 select-none",
                            isSelected && "bg-blue-50/60 dark:bg-blue-950/20"
                          )}
                          onClick={(e) => {
                            toggleSelectRow(r.id, e)
                          }}
                          onDoubleClick={() => {
                            handlePreview(r)
                          }}
                        >
                          <td
                            className={cn(
                              "w-12 p-4 text-center align-middle border-r border-border/70 dark:border-border/70 sticky left-0 z-10 bg-white group-hover:bg-gray-50/70 dark:bg-card dark:group-hover:bg-zinc-800/40",
                              isSelected && "bg-blue-50/60 dark:bg-blue-950/20"
                            )}
                            onClick={(e) => {
                              e.stopPropagation()
                              toggleSelectRow(r.id, e)
                            }}
                            onDoubleClick={(e) => e.stopPropagation()}
                          >
                            <input
                              type="checkbox"
                              className={cn(
                                "h-4 w-4 m-0 align-middle shrink-0 cursor-pointer rounded border border-border text-pup-maroon dark:text-primary accent-pup-maroon focus:ring-pup-maroon dark:text-primary dark:border-border transition-opacity",
                                isSelected ? "opacity-100" : "opacity-50 group-hover:opacity-80"
                              )}
                              checked={isSelected}
                              onChange={(e) => toggleSelectRow(r.id, e)}
                              aria-label={`Select record for ${(isOsas ? r.organization_name || r.student_name : r.student_name) || r.student_no}`}
                            />
                          </td>

                          {!isOsas && visibleColumns.includes("student_no") && (
                            <td
                              className={cn(
                                "p-4 w-[160px] min-w-[160px] whitespace-nowrap align-middle sticky left-12 z-10 bg-white group-hover:bg-gray-50/70 dark:bg-card dark:group-hover:bg-zinc-800/40 transition-shadow",
                                isSelected && "bg-blue-50/60 dark:bg-blue-950/20",
                                isScrolledX
                                  ? "shadow-[4px_0_12px_-2px_rgba(0,0,0,0.06)] dark:shadow-[4px_0_12px_-2px_rgba(0,0,0,0.4)] border-r border-border/70"
                                  : "border-r border-border/70 dark:border-border/70"
                              )}
                            >
                              <span className={cn("font-sans tabular-nums text-xs font-semibold px-2.5 py-1 rounded-full bg-gray-100 dark:bg-zinc-800 text-gray-800 dark:text-zinc-200", BADGE_BASE)}>
                                {r.student_no}
                              </span>
                            </td>
                          )}

                          {visibleColumns.includes("student_name") && (
                            <td className="p-4 w-[220px] min-w-[220px] max-w-[260px] overflow-hidden align-middle border-r border-border/70 dark:border-border/70">
                              <div
                                className="font-semibold text-gray-900 dark:text-zinc-100 group-hover:text-pup-maroon dark:group-hover:text-red-400 transition-colors truncate"
                                title={formatTitleCase(isOsas ? r.organization_name || r.student_name : r.student_name)}
                              >
                                {formatTitleCase(isOsas ? r.organization_name || r.student_name : r.student_name)}
                              </div>
                            </td>
                          )}

                          {visibleColumns.includes("doc_type") && (
                            <td className="p-4 w-[180px] min-w-[180px] overflow-hidden align-middle text-center border-r border-border/70 dark:border-border/70">
                              <div className="flex items-center justify-center">
                                <span
                                  className={cn("inline-block max-w-full truncate rounded-full bg-gray-100 px-2.5 py-0.5 text-[11px] font-semibold text-gray-800 dark:bg-zinc-800 dark:text-zinc-200", BADGE_BASE)}
                                  title={r.doc_type}
                                >
                                  {r.doc_type}
                                </span>
                              </div>
                            </td>
                          )}

                          {visibleColumns.includes("original_filename") && (
                            <td className="p-4 w-[220px] min-w-[220px] max-w-[260px] overflow-hidden align-middle border-r border-border/70 dark:border-border/70">
                              <span
                                className="block truncate text-xs text-gray-600 dark:text-zinc-400 font-normal"
                                title={r.original_filename}
                              >
                                {r.original_filename}
                              </span>
                            </td>
                          )}

                          {visibleColumns.includes("status") && (
                            <td className="w-32 min-w-[130px] p-4 text-center align-middle whitespace-nowrap border-r border-border/70 dark:border-border/70">
                              <div className="flex items-center justify-center">
                                <span
                                  className={cn("transition-all", getStatusBadge(r.approval_status), BADGE_BASE)}
                                >
                                  {r.approval_status || "Pending"}
                                </span>
                              </div>
                            </td>
                          )}

                          {visibleColumns.includes("created_at") && (
                            <td className="w-36 min-w-[150px] p-4 whitespace-nowrap align-middle border-r border-border/70 dark:border-border/70">
                              <div className="flex flex-col">
                                <span className="text-xs font-medium text-gray-900 dark:text-zinc-100">
                                  {formatUploadedDate(r.created_at).dateStr}
                                </span>
                                <span className="text-[11px] font-normal text-gray-400 dark:text-zinc-500 mt-0.5">
                                  {formatUploadedDate(r.created_at).timeStr}
                                </span>
                              </div>
                            </td>
                          )}

                          <td className="w-12 p-0 align-middle text-center whitespace-nowrap">
                            <div
                              className="flex items-center justify-center"
                              onClick={(e) => e.stopPropagation()}
                              onDoubleClick={(e) => e.stopPropagation()}
                            >
                              <DigitalRecordActionsMenu
                                record={r}
                                onPreview={handlePreview}
                                onApprove={handleApprove}
                                onDecline={onDecline}
                                onSetStatus={onSetStatus}
                              />
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </Table>
              </div>

              {/* Pagination Toolbar */}
              <TablePagination
                label="Digital record review pages"
                page={currentPage}
                pageSize={itemsPerPage}
                totalCount={totalCount}
                displayedCount={paginatedRecords.length}
                loading={isLoading || !serverStats}
                onPageChange={setCurrentPage}
                onPageSizeChange={setItemsPerPage}
              />
            </div>
          )}
          {isLoading && !isManualLoading && records && (
            <div className="absolute inset-0 z-30 flex items-center justify-center bg-white/70 dark:bg-card/70">
              <span role="status" className="rounded-lg bg-white px-3 py-2 text-xs font-medium text-gray-600 shadow-sm dark:bg-zinc-800 dark:text-zinc-300">
                Loading records…
              </span>
            </div>
          )}
          </div>
        </Card>

        {/* Floating Bulk Action Bar */}
        {selectedIds.size > 0 &&
          (() => {
            const selectedRecords = paginatedRecords.filter((r) => selectedIds.has(r.id))
            const allPending =
              selectedRecords.length > 0 &&
              selectedRecords.every((r) => r.approval_status === "Pending")

            if (allPending) {
              return (
                <FloatingActionBar
                  selectedCount={selectedIds.size}
                  onCancel={() => setSelectedIds(new Set())}
                  actions={[
                    {
                      label: "Approve Records",
                      variant: "success",
                      onClick: handleBulkApprove,
                    },
                    {
                      label: "Decline Records",
                      variant: "danger",
                      onClick: handleBulkDecline,
                    },
                  ]}
                />
              )
            }

            return (
              <FloatingActionBar
                selectedCount={selectedIds.size}
                onCancel={() => setSelectedIds(new Set())}
                actions={
                  <span className={cn(BADGE_BASE, BADGE_PALETTES.amber, "px-3 py-1.5 h-auto text-xs rounded-full gap-1.5 select-none")}>
                    <Alert01Icon size={14} className="shrink-0" />
                    <span>Contains reviewed records. Bulk actions disabled.</span>
                  </span>
                }
              />
            )
          })()}
      </div>
    </TooltipProvider>
  )
}
