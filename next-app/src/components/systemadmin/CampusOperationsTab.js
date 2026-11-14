"use client"
import { formatRequestStatus } from "@/lib/auditLogFormatting";
import NoticeBanner from "@/components/shared/NoticeBanner";
import SheetSectionHeading from "@/components/shared/SheetSectionHeading";
import DataGroupHeader from "@/components/shared/DataGroupHeader";
import useViewPreference from "@/hooks/useViewPreference"
import DashboardSearch from "@/components/systemadmin/DashboardSearch"
import { Table } from "@/components/ui/table";
import TablePagination from "@/components/shared/TablePagination";
import { TableActions } from "@/components/shared/TableActions";


import SheetPagination from "@/components/shared/SheetPagination";
import CopyButton from "@/components/shared/CopyButton";
import { PDF_ACTION_LABELS } from "@/lib/pdfPreview";
import useUrlPage from "@/hooks/useUrlPage"
import React, { useState, useRef, useEffect, useMemo, useCallback } from "react"
import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import TransactionsTableSkeleton from "@/components/systemadmin/skeletons/TransactionsTableSkeleton"
import DataContentSkeleton from "@/components/shared/DataContentSkeleton"
import { FilterPopover, SortPopover, GroupPopover, ColumnsPopover } from "@/components/systemadmin/OfficeTableControls"
import ActiveFilterChips from "@/components/shared/ActiveFilterChips"
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
  EmptyState,
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
import DataViewToolbar from "@/components/shared/DataViewToolbar"
import { SegmentedControl } from "@/components/ui/tabs"
import ServiceStandardsSheet from "./ServiceStandardsSheet"
import ViewModeIcon from "@/components/shared/ViewModeIcon"
import CampusOperationsList, { groupCampusOperations } from "./CampusOperationsList"
import {
  COMPACT_BADGE_BASE,
  SUPERADMIN_BADGE_BASE as BADGE_BASE,
  BADGE_PALETTES,
  getDepartmentBadgeClass,
  getStatusBadgeClass,
} from "@/lib/badgeStyles"
import { getRequestCharterStatus, buildSlaTiers } from "@/lib/citizenCharter"
import { generateCampusOperationsPdf } from "@/lib/pdfGenerator"
import { exportRowsToCsv, formatReportOffice, generateExportFilename } from "@/lib/exportHelpers"
import usePdfPreviewSession from "@/hooks/usePdfPreviewSession"
import { useTablePreferences } from "@/components/shared/TablePreferences"
import { InboxIcon as EmptyInboxIcon, ArrowDown01Icon, ArrowUp01Icon, ArrowUpDownIcon, Cancel01Icon, Certificate01Icon, Copy01Icon, File02Icon, Search01Icon, StudentIcon, Timer01Icon, ViewIcon, Calendar01Icon, Layers01Icon, Tick01Icon, Loading01Icon } from "hugeicons-react";
import AppIcon from "@/components/ui/app-icon";
const OPERATION_COLUMNS = ["id", "department", "requester", "title", "details", "status", "slaStatus", "submitted", "updatedAt"]

function SortIndicator({ column, sortBy, sortOrder }) {
  if (sortBy !== column) {
    return <ArrowUpDownIcon size="1em" className="ml-1 text-[12px] text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
  }
  return sortOrder === "ASC" ? (
    <ArrowUp01Icon size="1em" className="ml-1 text-[12px] text-gray-400" />
  ) : (
    <ArrowDown01Icon size="1em" className="ml-1 text-[12px] text-gray-400" />
  )
}

const statusBadgeClass = getStatusBadgeClass

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
    return `ODRS-${padded}`
  }
  if (tx.officeId === "osas" || tx.type === "event_proposal") {
    return `OSAS-${padded}`
  }
  return `TX-${padded}`
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
          <AppIcon className={cn("text-gray-400 dark:text-zinc-500 text-sm shrink-0", icon)} />
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
  const { density } = useTablePreferences()
  const [standardsSheetOpen, setStandardsSheetOpen] = useState(Boolean(initialStandardsOpen))
  const [slaStandards, setSlaStandards] = useState(null)
  const slaTiers = useMemo(() => buildSlaTiers(slaStandards), [slaStandards])
  const [health, setHealth] = useState(null)
  const [loading, setLoading] = useState(true)
  const [operationsLoadFailed, setOperationsLoadFailed] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [autoRefreshSecs] = useState(15)

  // Filters & Sorting
  const [viewMode, setViewMode] = useViewPreference("operations", "viewMode", "table")
  const [search, setSearch] = useViewPreference("operations", "search", "")
  const [operationFilters, setOperationFilters] = useViewPreference("operations", "operationFilters", [])
  const [lifecycle, setLifecycle] = useViewPreference("operations", "lifecycle", "all")
  const [slaFilter, setSlaFilter] = useState("all") // "all" | "onTrack" | "dueSoon" | "overdue"
  const [groupBy, setGroupBy] = useViewPreference("operations", "groupBy", "none")
  const [visibleColumns, setVisibleColumns] = useViewPreference("operations", "visibleColumns", OPERATION_COLUMNS.filter((key) => key !== "updatedAt" && key !== "slaStatus"))
  const visibleTableColumns = OPERATION_COLUMNS.filter((key) => visibleColumns.includes(key))
  const [sortBy, setSortBy] = useViewPreference("operations", "sortBy", "createdAt")
  const [sortOrder, setSortOrder] = useViewPreference("operations", "sortOrder", "DESC")
  const [page, setPage] = useUrlPage()
  const [pageSize, setPageSize] = useViewPreference("operations", "pageSize", 20)

  // Export & Report Generation States
  const [isExporting, setIsExporting] = useState(false)
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false)
  const previewSession = usePdfPreviewSession()

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
  const [copiedField, setCopiedField] = useState(null)

  const sheetItemCharter = useMemo(() => {
    if (!sheetItem) return null
    return getRequestCharterStatus(
      {
        doc_type: sheetItem.title,
        tier: sheetItem.type === "event_proposal" ? slaTiers?.COMPLEX : undefined,
        created_at: sheetItem.createdAt,
        updated_at: sheetItem.updatedAt,
        status: sheetItem.status,
      },
      slaStandards
    )
  }, [sheetItem, slaStandards, slaTiers])

  const handleOpenDetails = useCallback((item) => {
    setSheetItem(item)
    setSelectedItem(item)
  }, [setSheetItem, setSelectedItem])

  const handleCopy = useCallback((text, label, fieldKey) => {
    if (!text) return
    navigator.clipboard?.writeText(String(text))
    showToast?.({
      title: "Copied to Clipboard",
      description: `${label} has been successfully copied to your clipboard.`,
    })
    if (fieldKey) {
      setCopiedField(fieldKey)
      setTimeout(() => setCopiedField((curr) => curr === fieldKey ? null : curr), 2000)
    }
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
      if (!res.ok || !json?.ok || !json.data) throw new Error(json?.error || "Unable to load campus operations.")
      setHealth(json.data)
      setOperationsLoadFailed(false)
      setCachedData("systemadmin_health", json.data, 15000)
    } catch (err) {
      setOperationsLoadFailed(true)
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

  const isClosed = (status) => ["approved", "completed", "done", "declined", "cancelled", "shredded"].includes(String(status || "").trim().toLowerCase())
  const matchesStatus = (status, value) => {
    const s = String(status || "").trim().toLowerCase()
    if (value === "action_needed") return s === "pending" || s === "submitted"
    if (value === "in_progress") return ["inprogress", "in progress", "under review", "processing"].includes(s)
    if (value === "completed") return ["approved", "completed", "done"].includes(s)
    if (value === "needs_revision") return s === "needs revision" || s === "revision"
    if (value === "declined") return ["declined", "cancelled", "shredded"].includes(s)
    return s === value
  }

  const slaMetrics = useMemo(() => {
    if (!transactions || transactions.length === 0) {
      return { onTrack: 0, dueSoon: 0, overdue: 0 }
    }

    let onTrack = 0
    let dueSoon = 0
    let overdue = 0

    transactions.forEach((tx) => {
      if (isClosed(tx.status)) return

      const charter = getRequestCharterStatus(
        {
          doc_type: tx.title,
          tier: tx.type === "event_proposal" ? slaTiers?.COMPLEX : undefined,
          created_at: tx.createdAt,
          updated_at: tx.updatedAt,
          status: tx.status,
        },
        slaStandards
      )

      if (charter.isOverdue) {
        overdue++
      } else if (charter.isDueSoon) {
        dueSoon++
      } else {
        onTrack++
      }
    })

    return { onTrack, dueSoon, overdue }
  }, [transactions, slaStandards, slaTiers])

  // Multi-criteria filter groups for department, operation status, and queue risk / SLA
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
      {
        id: "queue_risk",
        label: "Queue Risk / SLA",
        options: [
          {
            value: "on_track",
            label: "On Track",
            indicatorColor: "bg-blue-500",
            count: slaMetrics.onTrack,
          },
          {
            value: "due_today",
            label: "Due Today",
            indicatorColor: "bg-amber-500",
            count: slaMetrics.dueSoon,
          },
          {
            value: "overdue",
            label: "Overdue",
            indicatorColor: "bg-rose-500",
            count: slaMetrics.overdue,
          },
        ],
      },
    ]
  }, [transactions, slaMetrics])

  const filterFields = useMemo(() => operationFilterGroups.map((group) => ({
    key: group.id,
    label: group.id === "department" ? "Department" : group.id === "queue_risk" ? "Queue Risk / SLA" : "Stage status",
    icon: group.id === "department" ? Certificate01Icon : Timer01Icon,
    options: group.options.map(({ value, label }) => ({ value, label })),
  })), [operationFilterGroups])

  const lifecycleCounts = useMemo(() => ({
    all: transactions?.length || 0,
    open: transactions?.filter((tx) => !isClosed(tx.status)).length || 0,
    closed: transactions?.filter((tx) => isClosed(tx.status)).length || 0,
  }), [transactions])

  // Filtered transactions for cross-department activity stream
  const filteredTransactions = useMemo(() => {
    if (!transactions) return []

    return transactions.filter((tx) => {
      if (lifecycle === "open" && isClosed(tx.status)) return false
      if (lifecycle === "closed" && !isClosed(tx.status)) return false
      if (!operationFilters.every(({ fieldKey, operator, value }) => {
        let matches = false
        if (fieldKey === "department") {
          matches = String(tx.officeId || "").toLowerCase() === value
        } else if (fieldKey === "queue_risk") {
          const charter = getRequestCharterStatus(
            {
              doc_type: tx.title,
              tier: tx.type === "event_proposal" ? slaTiers?.COMPLEX : undefined,
              created_at: tx.createdAt,
              updated_at: tx.updatedAt,
              status: tx.status,
            },
            slaStandards
          )
          if (value === "overdue") matches = charter.isOverdue
          else if (value === "due_today" || value === "dueSoon") matches = charter.isDueSoon
          else if (value === "on_track" || value === "onTrack") matches = !charter.isOverdue && !charter.isDueSoon
        } else {
          matches = matchesStatus(tx.status, value)
        }
        return operator === "is_not" ? !matches : matches
      })) return false

      // Turnaround SLA filter
      if (slaFilter !== "all") {
        const charter = getRequestCharterStatus(
          {
            doc_type: tx.title,
            tier: tx.type === "event_proposal" ? slaTiers?.COMPLEX : undefined,
            created_at: tx.createdAt,
            updated_at: tx.updatedAt,
            status: tx.status,
          },
          slaStandards
        )
        if (slaFilter === "overdue" && !charter.isOverdue) return false
        if (slaFilter === "dueSoon" && !charter.isDueSoon) return false
        if (slaFilter === "onTrack" && (charter.isOverdue || charter.isDueSoon)) return false
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
        const matchStatus = (formatRequestStatus(tx.status) || "").toLowerCase().includes(q) || (tx.status || "").toLowerCase().includes(q)
        const matchNotes = (tx.notes || "").toLowerCase().includes(q)
        if (!matchId && !matchTitle && !matchStudent && !matchOrg && !matchStatus && !matchNotes) {
          return false
        }
      }

      return true
    })
  }, [transactions, lifecycle, operationFilters, slaFilter, search, slaStandards, slaTiers])

  // Sorted transactions
  const sortedTransactions = useMemo(() => {
    return [...filteredTransactions].sort((a, b) => {
      if (groupBy !== "none") {
        const aGroup = groupBy === "department" ? a.officeId : a.status
        const bGroup = groupBy === "department" ? b.officeId : b.status
        const groupComparison = String(aGroup || "").localeCompare(String(bGroup || ""))
        if (groupComparison) return groupComparison
      }
      let aVal = a[sortBy] ?? ""
      let bVal = b[sortBy] ?? ""

      if (sortBy === "id") {
        aVal = Number(a.originalId) || Number(String(a.id).replace(/\D+/g, "")) || 0
        bVal = Number(b.originalId) || Number(String(b.id).replace(/\D+/g, "")) || 0
      } else if (sortBy === "studentName") {
        aVal = formatStudentRequester(a.studentName, a.studentNo)
        bVal = formatStudentRequester(b.studentName, b.studentNo)
      } else if (sortBy === "slaStatus") {
        const aCharter = getRequestCharterStatus(
          { doc_type: a.title, tier: a.type === "event_proposal" ? slaTiers?.COMPLEX : undefined, created_at: a.createdAt, updated_at: a.updatedAt, status: a.status },
          slaStandards
        )
        const bCharter = getRequestCharterStatus(
          { doc_type: b.title, tier: b.type === "event_proposal" ? slaTiers?.COMPLEX : undefined, created_at: b.createdAt, updated_at: b.updatedAt, status: b.status },
          slaStandards
        )
        aVal = aCharter.label || aCharter.status
        bVal = bCharter.label || bCharter.status
      }

      if (aVal < bVal) return sortOrder === "ASC" ? -1 : 1
      if (aVal > bVal) return sortOrder === "ASC" ? 1 : -1
      return 0
    })
  }, [filteredTransactions, sortBy, sortOrder, groupBy, slaStandards, slaTiers])

  // Export handlers
  const handleDownloadCSV = useCallback(() => {
    if (!filteredTransactions.length || isExporting) return
    setIsExporting(true)
    try {
      const fileName = generateExportFilename("CAMPUS-OPERATIONS", "DATA", "csv")
      const headers = [
        "Transaction ID",
        "Department",
        "Student Number",
        "Student Requester",
        "Document or Proposal Title",
        "Organization or Details",
        "Stage Status",
        "Charter SLA Tier",
        "Charter SLA Status",
        "Target Deadline",
        "Submission Date (Asia/Manila)",
        "Last Updated (Asia/Manila)",
      ]

      const rows = filteredTransactions.map((tx) => {
        const charter = getRequestCharterStatus(
          {
            doc_type: tx.title,
            tier: tx.type === "event_proposal" ? slaTiers?.COMPLEX : undefined,
            created_at: tx.createdAt,
            updated_at: tx.updatedAt,
            status: tx.status,
          },
          slaStandards
        )

        return [
          formatTransactionId(tx),
          formatReportOffice(tx.officeId || "osas", tx.officeName),
          tx.studentNo || "N/A",
          formatStudentRequester(tx.studentName, tx.studentNo),
          tx.title || "Untitled",
          tx.organizationName || tx.notes || "None",
          formatRequestStatus(tx.status || "Pending"),
          charter.tier?.name || "Standard",
          charter.label || charter.status || "On Track",
          charter.deadlineFormatted || "N/A",
          tx.createdAt ? formatPHDateTime(tx.createdAt) : "N/A",
          tx.updatedAt ? formatPHDateTime(tx.updatedAt) : "N/A",
        ]
      })

      exportRowsToCsv(fileName, headers, rows)
      showToast?.({
        title: "Export Success",
        description: `Exported ${filteredTransactions.length} operations to CSV successfully.`,
      })
    } catch (err) {
      console.error("[Export CSV Error]", err)
      showToast?.({
        title: "Export Failed",
        description: err.message || "Unable to export operations to CSV.",
      }, true)
    } finally {
      setIsExporting(false)
    }
  }, [filteredTransactions, isExporting, showToast, slaStandards, slaTiers])

  const handlePreviewReportPDF = useCallback(async () => {
    if (!filteredTransactions.length || isGeneratingPdf) return
    setIsGeneratingPdf(true)
    const request = previewSession.begin()
    try {
      const blob = await generateCampusOperationsPdf(filteredTransactions, {
        slaStandards,
        lifecycle,
        search,
        filters: operationFilters.length > 0 ? `${operationFilters.length} filter rules active` : "None",
      })
      const url = previewSession.createUrl(blob, request)
      if (!url) return
      setPdfPreviewData({
        url,
        title: "Campus Operations & Turnaround Standards Report",
        filename: generateExportFilename("CAMPUS-OPERATIONS", "REPORT", "pdf"),
        originalFilename: generateExportFilename("CAMPUS-OPERATIONS", "REPORT", "pdf"),
      })
      setPdfPreviewOpen(true)
    } catch (err) {
      if (!previewSession.isCurrent(request)) return
      console.error("[PDF Preview Error]", err)
      showToast?.({
        title: "Preview Failed",
        description: err.message || "Unable to generate PDF report.",
      }, true)
    } finally {
      if (previewSession.isCurrent(request)) setIsGeneratingPdf(false)
    }
  }, [filteredTransactions, isGeneratingPdf, previewSession, slaStandards, lifecycle, search, operationFilters, showToast, setIsGeneratingPdf, setPdfPreviewData, setPdfPreviewOpen])

  // Pagination calculations
  const totalPages = Math.ceil(sortedTransactions.length / pageSize) || 1
  const startIndex = (Math.min(page, totalPages) - 1) * pageSize
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
  }, [search, operationFilters, lifecycle, slaFilter, groupBy, pageSize, setPage])

  // Auto-reset scroll to start whenever page, filters, search, or sorting changes
  useEffect(() => {
    resetTableScroll()
  }, [page, pageSize, search, operationFilters, lifecycle, slaFilter, groupBy, visibleColumns, sortBy, sortOrder, resetTableScroll])

  const handleClearFilters = useCallback(() => {
    setSearch("")
    setOperationFilters([])
    setSlaFilter("all")
    setPage(1)
  }, [setOperationFilters, setPage, setSearch])

  const hasActiveFilters =
    Boolean(search?.trim()) ||
    operationFilters.length > 0 ||
    slaFilter !== "all"

  return (
    <div className="animate-fade-up flex flex-[1_0_auto] flex-col w-full gap-6">
      {/* ONE Single Card Container encapsulating Header, Toolbar, Table & Pagination */}
      <Card className="flex flex-[1_0_auto] h-auto w-full flex-col p-0 gap-0 overflow-hidden rounded-2xl border border-border bg-white shadow-sm dark:border-border dark:bg-card dark:shadow-none isolate">
        {/* Header */}
        <PageHeader
          icon=" Activity01Icon"
          title={<div className="flex flex-wrap items-baseline gap-x-3 gap-y-1"><span>Campus Services &amp; Operations Monitor</span>{loading ? <Skeleton aria-hidden="true" className="h-3.5 w-40 rounded dark:bg-muted" /> : <span className="text-[11px] font-normal tracking-normal text-gray-500 dark:text-zinc-400">{lifecycleCounts.all.toLocaleString()} operations · {lifecycleCounts.open.toLocaleString()} open</span>}</div>}
          description="Live tracking of student document requests and student organization proposals across campus departments."
          showBorder={false}
          className="p-6"
          titleClassName="text-[18px] font-semibold tracking-[-0.01em] text-gray-900 dark:text-zinc-50"
          descriptionClassName="text-[13px] font-normal text-gray-900 dark:text-zinc-300 mt-[4px]"
          actions={
            <div className="flex shrink-0 items-center gap-2">
              <RefreshButton onRefresh={() => fetchHealth(true)} isLoading={refreshing} title="Refresh Campus Operations" className="h-9 w-9" />
              <Button
                type="button"
                variant="outline"
                onClick={handleDownloadCSV}
                disabled={loading || filteredTransactions.length === 0 || isExporting}
                className="h-9 shrink-0 px-4 text-xs font-semibold"
              >
                {isExporting ? (
                  <>
                    <Loading01Icon size="1em" aria-hidden="true" className="mr-1.5 animate-spin" />
                    Exporting...
                  </>
                ) : (
                  "Export CSV"
                )}
              </Button>
              <Button
                type="button"
                onClick={handlePreviewReportPDF}
                disabled={loading || filteredTransactions.length === 0 || isGeneratingPdf}
                className="h-9 shrink-0 px-4 text-xs font-semibold"
              >
                {isGeneratingPdf ? (
                  <>
                    <Loading01Icon size="1em" aria-hidden="true" className="mr-1.5 animate-spin" />
                    Generating...
                  </>
                ) : (
                  "Preview PDF"
                )}
              </Button>
            </div>
          }
        />

        <div role="group" aria-label="Operation lifecycle and view mode" className="flex items-center justify-between gap-4 px-6 py-2.5 border-b border-border dark:border-white/10 bg-white dark:bg-card overflow-x-auto scrollbar-none">
          <SegmentedControl
            value={lifecycle}
            onValueChange={setLifecycle}
            variant="capsule"
            className="inline-grid grid-flow-col auto-cols-fr"
            items={[
              { value: "all", label: "All", badge: lifecycleCounts.all },
              { value: "open", label: "Open", badge: lifecycleCounts.open },
              { value: "closed", label: "Closed", badge: lifecycleCounts.closed },
            ]}
          />

          <div className="ml-auto shrink-0">
            <SegmentedControl
              value={viewMode}
              onValueChange={setViewMode}
              variant="capsule"
              className="inline-grid grid-flow-col auto-cols-fr shrink-0"
              items={[
                { value: "list", label: "List", icon: <ViewModeIcon mode="list" className="text-sm" /> },
                { value: "table", label: "Table", icon: <ViewModeIcon mode="table" className="text-sm" /> },
              ]}
            />
          </div>
        </div>

        {/* Navigation Toolbar */}
        <DataViewToolbar label="Campus operations search and filters" className="gap-2 bg-white p-4 dark:bg-card sm:px-5 sm:py-3">
          <div className="flex min-w-0 items-center gap-2">
            {/* Search Input with Clear Button & Record Count */}
            <DashboardSearch value={search} onChange={setSearch} count={filteredTransactions.length} loading={loading} label="Search campus operations" placeholder="Search student, document, or org..." />
            {viewMode === "table" && (
              <TableScrollControls
                scrollContainerRef={tableContainerRef}
                canScrollLeft={canScrollLeft}
                canScrollRight={canScrollRight}
                isScrolled={isScrolled}
                onScrollLeft={scrollLeft}
                onScrollRight={scrollRight}
                onResetScroll={resetTableScroll}
                controlSize="md"
              />
            )}
          </div>

          <div className="ml-auto flex shrink-0 items-center gap-2">
            <FilterPopover fields={filterFields} filters={operationFilters} onFiltersChange={setOperationFilters} entityLabel="operations" />
            <SortPopover
              options={[
                { key: "createdAt", label: "Submitted", icon: Calendar01Icon },
                { key: "updatedAt", label: "Last Updated", icon: Calendar01Icon },
                { key: "id", label: "ID", icon: Layers01Icon },
                { key: "officeId", label: "Department", icon: Certificate01Icon },
                { key: "studentName", label: "Student requester", icon: StudentIcon },
                { key: "title", label: "Title", icon: File02Icon },
                { key: "organizationName", label: "Organization / details", icon: ViewIcon },
                { key: "status", label: "Stage status", icon: Timer01Icon },
                { key: "slaStatus", label: "Citizen's Charter SLA", icon: Timer01Icon },
              ]}
              sortBy={sortBy}
              onSortByChange={(key) => { setSortBy(key); setSortOrder("ASC") }}
              sortOrder={sortOrder}
              onSortOrderChange={setSortOrder}
            />
            <GroupPopover options={[{ key: "department", label: "Department", icon: Certificate01Icon }, { key: "status", label: "Stage status", icon: Timer01Icon }, { key: "none", label: "No grouping", icon: Layers01Icon }]} groupBy={groupBy} onGroupByChange={setGroupBy} />
            {viewMode === "table" && (
              <ColumnsPopover
                columns={[
                  { key: "id", label: "ID" },
                  { key: "department", label: "Department" },
                  { key: "requester", label: "Student requester" },
                  { key: "title", label: "Document or proposal" },
                  { key: "details", label: "Organization / details" },
                  { key: "status", label: "Stage status" },
                  { key: "slaStatus", label: "Citizen's Charter SLA", defaultHidden: true },
                  { key: "submitted", label: "Submitted" },
                  { key: "updatedAt", label: "Last Updated", defaultHidden: true },
                ]}
                visibleColumns={visibleColumns}
                onVisibleColumnsChange={setVisibleColumns}
                minVisible={2}
              />
            )}
          </div>
        </DataViewToolbar>

        <NoticeBanner
          title={slaStandards?.frameworkName || "Citizen's Charter (ARTA RA 11032)"}
          action={<Button type="button" variant="secondary" size="sm" onClick={() => setStandardsSheetOpen(true)}>Configure Standards</Button>}
        >
          <div className="text-white/90">
            <span className="tabular-nums">{slaStandards?.simpleDays ?? 3}-{slaStandards?.complexDays ?? 7}-{slaStandards?.highlyTechnicalDays ?? 20}d SLA</span>
            {" · "}{slaStandards?.workingDaysOnly !== false ? "Business Days (Mon–Fri)" : "Consecutive Calendar Days"}
            <p>Target processing deadlines and on-time completion rates for Registrar and OSAS requests are calculated using this schedule.</p>
          </div>
        </NoticeBanner>

        {/* Active Filter Chips & Horizontal Scroll Controls */}
        {hasActiveFilters && (
          <div className="border-t border-border dark:border-border px-6 py-2.5 flex items-center justify-between gap-4 bg-white dark:bg-card">
            <div className="flex-1 min-w-0">
              <ActiveFilterChips
                chips={[
                  ...operationFilters.map((clause) => ({
                    id: clause.id,
                    label: `${filterFields.find((field) => field.key === clause.fieldKey)?.label || clause.fieldKey} ${clause.operator === "is_not" ? "is not" : "is"} ${filterFields.find((field) => field.key === clause.fieldKey)?.options.find((option) => option.value === clause.value)?.label || clause.value}`,
                    onRemove: () => setOperationFilters((previous) => previous.filter((item) => item.id !== clause.id)),
                  })),
                  ...(slaFilter !== "all"
                    ? [
                        {
                          id: "sla_risk_filter",
                          label: `SLA: ${slaFilter === "overdue" ? "Overdue" : slaFilter === "dueSoon" ? "Due Today" : "On Track"}`,
                          onRemove: () => setSlaFilter("all"),
                        },
                      ]
                    : []),
                ]}
                searchQuery={search}
                onClearSearch={() => {
                  setSearch("")
                  setPage(1)
                }}
                onClearAll={handleClearFilters}
                className="p-0 border-0"
              />
            </div>
          </div>
        )}

        {/* Cross-Department Activity Stream Table or List */}
        <div className="overflow-hidden rounded-b-2xl border-t border-border dark:border-border bg-white dark:bg-card flex flex-col flex-[1_0_auto]">
          {loading ? (
            viewMode === "list" ? <DataContentSkeleton viewMode="list" grouped={groupBy !== "none"} /> : <TransactionsTableSkeleton rowCount={6} visibleColumns={visibleTableColumns} groupBy={groupBy} />
          ) : operationsLoadFailed && sortedTransactions.length === 0 ? (
            <EmptyState
              icon={EmptyInboxIcon}
              title="Could Not Load Campus Operations"
              description="Try loading campus activity again."
            >
              <Button variant="outline" size="sm" onClick={() => fetchHealth(true)} disabled={refreshing}>
                Try Again
              </Button>
            </EmptyState>
          ) : paginatedTransactions.length === 0 ? (
            <div className="rounded-b-2xl flex-1 flex flex-col items-center justify-center min-h-[420px] w-full">
              <Empty>
                <EmptyHeader>
                  <EmptyMedia><EmptyInboxIcon size="1em" /></EmptyMedia>
                  <EmptyTitle>
                    No Records Found
                  </EmptyTitle>
                  <EmptyDescription>
                    {hasActiveFilters
                      ? "No student requests or proposals match your search or filter settings."
                      : `There are currently no ${lifecycle === "all" ? "" : `${lifecycle} `}document requests or event proposals recorded.`}
                  </EmptyDescription>
                </EmptyHeader>
                {hasActiveFilters && (
                  <EmptyContent>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleClearFilters}
                      title="Reset Filters"
                      className="h-9 px-4 text-xs font-semibold rounded-xl"
                    >
                      Reset Filters
                    </Button>
                  </EmptyContent>
                )}
              </Empty>
            </div>
          ) : viewMode === "list" ? (
            <CampusOperationsList
              items={paginatedTransactions}
              groupBy={groupBy}
              slaStandards={slaStandards}
              onOpenDetails={handleOpenDetails}
              onPreviewPdf={handleOpenPdfPreview}
              statusBadgeClass={statusBadgeClass}
            />
          ) : (
            <div
              ref={tableContainerRef}
              className="flex-[1_0_auto] overflow-x-auto show-scrollbar pb-2 motion-safe:animate-in motion-safe:fade-in-50 duration-200 ease-out select-none"
            >
                <Table columns={[...visibleTableColumns.map((key) => {
                  if (key === "id") return { kind: "identifier", maxWidth: 180, growthWeight: 0 }
                  if (key === "department") return { kind: "category", maxWidth: 150, growthWeight: 0 }
                  if (key === "status" || key === "slaStatus") return { kind: "status", maxWidth: 160, growthWeight: 0 }
                  if (key === "submitted" || key === "updatedAt") return { kind: "date", maxWidth: 180, growthWeight: 0 }
                  return { kind: "text", maxWidth: key === "details" ? 300 : 340 }
                }), { kind: "actions" }]} className="min-w-0">
                <thead className="sticky top-0 z-10 border-b border-border bg-gray-50/90 dark:bg-zinc-900/90 backdrop-blur-xs select-none">
                  <tr className="text-left text-xs font-semibold text-gray-500 dark:text-zinc-400 h-11 select-none">
                    {/* ID Header */}
                    {visibleColumns.includes("id") && <th
                      className={cn(
                        "p-4 pl-6 whitespace-nowrap sticky left-0 z-20 bg-gray-50/90 dark:bg-zinc-900/90 backdrop-blur-xs transition-shadow",
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
                    </th>}

                    {visibleColumns.includes("department") && <>
                    {/* Department */}
                    <th className="p-4">
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
                    </>}

                    {visibleColumns.includes("requester") && <>
                    {/* Student Requester */}
                    <th className="p-4">
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
                    </>}

                    {visibleColumns.includes("title") && <>
                    {/* Document or Proposal Title */}
                    <th className="p-4">
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
                    </>}

                    {visibleColumns.includes("details") && <>
                    {/* Student Org / Details */}
                    <th className="p-4">
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
                    </>}

                    {visibleColumns.includes("status") && <>
                    {/* Stage Status */}
                    <th className="p-4">
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
                    </>}

                    {visibleColumns.includes("slaStatus") && <>
                    {/* Citizen's Charter SLA */}
                    <th className="p-4">
                      <button
                        onClick={() => handleSort("slaStatus")}
                        className={cn(
                          "group flex items-center transition-colors focus:outline-none cursor-pointer text-xs font-semibold",
                          sortBy === "slaStatus" ? "text-gray-900 dark:text-white" : "text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white"
                        )}
                      >
                        Charter SLA <SortIndicator column="slaStatus" sortBy={sortBy} sortOrder={sortOrder} />
                      </button>
                    </th>
                    </>}

                    {visibleColumns.includes("submitted") && <>
                    {/* Submitted */}
                    <th className="p-4">
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
                    </>}

                    {/* Actions */}
                    {visibleColumns.includes("updatedAt") && (
                      <th className="p-4" aria-sort={sortBy === "updatedAt" ? (sortOrder === "ASC" ? "ascending" : "descending") : "none"}>
                        <button
                          type="button"
                          onClick={() => handleSort("updatedAt")}
                          className={cn(
                            "group inline-flex items-center transition-colors focus:outline-none cursor-pointer text-xs font-semibold",
                            sortBy === "updatedAt" ? "text-gray-900 dark:text-white" : "text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white"
                          )}
                        >
                          Last Updated<SortIndicator column="updatedAt" sortBy={sortBy} sortOrder={sortOrder} />
                        </button>
                      </th>
                    )}
                    <th className="px-1 py-3 text-center w-12 min-w-[48px] max-w-[48px] text-[11px] font-semibold text-gray-500 dark:text-zinc-400 sticky right-0 z-20 bg-gray-50/90 dark:bg-zinc-900/90 backdrop-blur-xs">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-border dark:divide-border font-medium text-gray-900 dark:text-zinc-100 bg-white dark:bg-card">
                  {groupCampusOperations(paginatedTransactions, groupBy).flatMap((group) => [
                      ...(groupBy !== "none" ? [<DataGroupHeader key={`group-${group.key}`} label={group.label} count={group.items.length} colSpan={visibleTableColumns.length + 1} />] : []),
                      ...group.items.map((tx) => {
                    const isRegistrar = tx.officeId === "registrar" || tx.type === "document_request"
                    const rel = formatRelativeTime(tx.createdAt)
                    const charter = getRequestCharterStatus(
                      {
                        doc_type: tx.title,
                        tier: tx.type === "event_proposal" ? slaTiers?.COMPLEX : undefined,
                        created_at: tx.createdAt,
                        updated_at: tx.updatedAt,
                        status: tx.status,
                      },
                      slaStandards
                    )

                    return (
                      <tr
                        key={tx.id}
                        onClick={() => handleOpenDetails(tx)}
                        className="group h-[52px] border-b border-border dark:border-border last:border-b-0 transition-colors hover:bg-gray-50/70 dark:hover:bg-zinc-800/40 cursor-pointer select-none"
                      >
                        {/* Transaction ID (Sticky Left) */}
                        {visibleColumns.includes("id") && <td
                          className={cn(
                            "p-4 pl-6 align-middle whitespace-nowrap sticky left-0 z-10 bg-white dark:bg-card group-hover:bg-gray-50/70 dark:group-hover:bg-zinc-800/40 transition-shadow border-b border-border dark:border-border border-r border-border/70 dark:border-border/70",
                            isScrolled && "shadow-[4px_0_12px_-2px_rgba(0,0,0,0.06)] dark:shadow-[4px_0_12px_-2px_rgba(0,0,0,0.4)]"
                          )}
                        >
                          <span className={cn(BADGE_BASE, BADGE_PALETTES.slate)}>
                            {formatTransactionId(tx)}
                          </span>
                        </td>}

                        {visibleColumns.includes("department") && <>
                        {/* Department Badge */}
                        <td className="p-4 align-middle whitespace-nowrap border-b border-border dark:border-border border-r border-border/70 dark:border-border/70">
                          <span className={cn(BADGE_BASE, getDepartmentBadgeClass(isRegistrar))}>
                            {isRegistrar ? "Registrar" : "OSAS"}
                          </span>
                        </td>
                        </>}

                        {visibleColumns.includes("requester") && <>
                        {/* Student Requester */}
                        <td className="p-4 align-middle overflow-hidden border-b border-border dark:border-border border-r border-border/70 dark:border-border/70">
                          <div className="w-full min-w-0">
                            <div
                              className="font-semibold text-[13px] text-gray-900 dark:text-zinc-100 truncate block"
                              title={formatStudentRequester(tx.studentName, tx.studentNo)}
                            >
                              {formatStudentRequester(tx.studentName, tx.studentNo)}
                            </div>
                            <div className="text-[11px] font-sans font-normal tabular-nums text-gray-500 dark:text-zinc-400 mt-0.5 truncate block">
                              {tx.studentNo}
                            </div>
                          </div>
                        </td>
                        </>}

                        {visibleColumns.includes("title") && <>
                        {/* Document or Proposal Title */}
                        <td className="p-4 align-middle overflow-hidden border-b border-border dark:border-border border-r border-border/70 dark:border-border/70">
                          <div className="w-full min-w-0">
                            <div className="font-medium text-[13px] text-gray-900 dark:text-zinc-100 truncate block" title={tx.title}>
                              {tx.title}
                            </div>
                            {tx.originalFilename && (
                              <div className="text-[11px] font-normal text-gray-500 dark:text-zinc-400 flex items-center gap-1 mt-0.5 min-w-0">
                                <File02Icon size={14} className="text-red-500 shrink-0" />
                                <span className="truncate block" title={tx.originalFilename}>{tx.originalFilename}</span>
                              </div>
                            )}
                          </div>
                        </td>
                        </>}

                        {visibleColumns.includes("details") && <>
                        {/* Student Org / Details */}
                        <td className="p-4 align-middle overflow-hidden border-b border-border dark:border-border border-r border-border/70 dark:border-border/70">
                          <div className="w-full min-w-0">
                            {tx.organizationName ? (
                              <div className="text-xs font-semibold text-blue-600 dark:text-blue-400 truncate block" title={tx.organizationName}>
                                {tx.organizationName}
                              </div>
                            ) : (
                              <div className="text-xs font-normal text-gray-700 dark:text-zinc-300 truncate block" title={tx.notes || "Standard student request"}>
                                {tx.notes || "Standard student request"}
                              </div>
                            )}
                          </div>
                        </td>
                        </>}

                        {visibleColumns.includes("status") && <>
                        {/* Stage Status Badge */}
                        <td className="p-4 align-middle whitespace-nowrap border-b border-border dark:border-border border-r border-border/70 dark:border-border/70">
                          <span className={cn(BADGE_BASE, statusBadgeClass(tx.status))}>
                            <span>{formatRequestStatus(tx.status)}</span>
                          </span>
                        </td>
                        </>}

                        {visibleColumns.includes("slaStatus") && <>
                        {/* Citizen's Charter SLA */}
                        <td className="p-4 align-middle whitespace-nowrap border-b border-border dark:border-border border-r border-border/70 dark:border-border/70">
                          <span className={cn(BADGE_BASE, charter.badgeClass)}>
                            <span>{charter.label}</span>
                          </span>
                        </td>
                        </>}

                        {visibleColumns.includes("submitted") && <>
                        {/* Date Submitted */}
                        <td className="p-4 align-middle text-xs font-normal text-gray-600 dark:text-zinc-300 whitespace-nowrap font-sans tabular-nums border-b border-border dark:border-border border-r border-border/70 dark:border-border/70">
                          {rel.relative || rel.date}
                        </td>
                        </>}

                        {visibleColumns.includes("updatedAt") && (
                          <td className="p-4 align-middle text-xs font-normal text-gray-600 dark:text-zinc-300 whitespace-nowrap font-sans tabular-nums border-b border-border dark:border-border border-r border-border/70 dark:border-border/70">
                            {tx.updatedAt ? formatPHDateTime(tx.updatedAt) : "N/A"}
                          </td>
                        )}
                        {/* Action Button (Sticky Right, Fixed 48px) */}
                        <td
                          className="py-0 px-2 text-center align-middle whitespace-nowrap sticky right-0 z-10 bg-white dark:bg-card group-hover:bg-gray-50/70 dark:group-hover:bg-zinc-800/40 border-b border-border dark:border-border w-12 min-w-[48px] max-w-[48px]"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <TableActions actions={[{ label: "View Details", icon: ViewIcon, onClick: () => handleOpenDetails(tx) }]} />
                        </td>
                      </tr>
                    )
                  }),
                    ])}
                </tbody>
                </Table>
            </div>
          )}

          {/* Pagination Footer */}
          {sortedTransactions.length > 0 && <TablePagination label="Campus operation pages" page={page} pageSize={pageSize} totalCount={sortedTransactions.length} displayedCount={paginatedTransactions.length} onPageChange={setPage} onPageSizeChange={setPageSize} loading={loading} />}
        </div>
      </Card>

      {/* Standardized Operation Record Details Sheet */}
      <Sheet open={Boolean(selectedItem)} onOpenChange={(open) => !open && setSelectedItem(null)}>
        <SheetContent
          side="right"
          size="default"
          showCloseButton={false}
          className="w-full sm:max-w-md md:max-w-lg lg:max-w-xl flex flex-col h-full p-0 overflow-hidden"
        >
          <SheetHeader className="shrink-0 p-0">
            <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4">
              <div>
                <SheetTitle>
                  Operation Record Details
                </SheetTitle>
                <SheetDescription className="sr-only">
                  Detailed information for cross-office campus transaction
                </SheetDescription>
              </div>

              <div className="ml-auto flex items-center gap-3">
                {sortedTransactions.length > 1 && (
                  <SheetPagination
                    compact
                    label="Record navigation"
                    page={Math.max(1, currentTxIndex + 1)}
                    totalPages={sortedTransactions.length}
                    onPrevious={handlePrevTx}
                    onNext={handleNextTx}
                    previousDisabled={currentTxIndex <= 0}
                    nextDisabled={currentTxIndex >= sortedTransactions.length - 1}
                    previousLabel="Previous Record"
                    nextLabel="Next Record"
                  />
                )}

                <button
                  type="button"
                  onClick={() => setSelectedItem(null)}
                  className="size-8 [@media(pointer:coarse)]:size-11 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-pup-maroon dark:focus-visible:ring-red-400 rounded-full bg-black/[0.04] hover:bg-black/[0.08] dark:bg-white/[0.08] dark:hover:bg-white/[0.14] text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-zinc-100 flex items-center justify-center transition-all cursor-pointer active:scale-95 border border-black/[0.04] dark:border-white/[0.08] shadow-2xs"
                  aria-label="Close"
                  title="Close"
                >
                  <Cancel01Icon size="1em" className="text-sm" />
                </button>
              </div>
            </div>
          </SheetHeader>

          {/* Edge-to-Edge Line-Attached Status Notice */}
          {sheetItem && (
            <NoticeBanner tone={["Ready", "Completed"].includes(sheetItem.status) ? "success" : ["Cancelled", "Declined"].includes(sheetItem.status) ? "danger" : sheetItem.status === "InProgress" ? "info" : "warning"} title={sheetItem?.status === "Ready" || sheetItem?.status === "Completed"
                    ? "Completed Operation"
                    : sheetItem?.status === "InProgress"
                    ? "Fulfillment In Progress"
                    : sheetItem?.status === "Cancelled" || sheetItem?.status === "Declined"
                    ? "Operation Cancelled"
                    : "Pending Operational Review"}>
              {sheetItem?.status === "Ready" || sheetItem?.status === "Completed"
                  ? "Transaction fulfillment finalized and archived across campus partitions."
                  : sheetItem?.status === "InProgress"
                  ? "Department personnel actively fulfilling credentials and processing records."
                  : sheetItem?.status === "Cancelled" || sheetItem?.status === "Declined"
                  ? "This cross-office operation was declined or cancelled."
                  : "Awaiting department evaluation and staff assignment."}
            </NoticeBanner>
          )}

          {/* SCROLLABLE 1-COLUMN BODY */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Identity / Transaction Summary Strip (Unboxed) */}
            <div className="flex items-center justify-between gap-3 pb-4 border-b border-border/80 dark:border-border">
              <div className="flex items-center gap-3.5 min-w-0">
                <div
                  className={cn(
                    "size-11 rounded-full flex items-center justify-center text-xl shrink-0 font-bold border shadow-2xs",
                    sheetItem?.officeId === "registrar"
                      ? "bg-red-50 text-pup-maroon dark:bg-red-950/40 dark:text-red-400 border-red-200/60 dark:border-red-900/40"
                      : "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200/60 dark:border-blue-900/40"
                  )}
                >
                  <AppIcon
                    className={
                      sheetItem?.officeId === "registrar"
                        ? " Certificate01Icon"
                        : " StudentIcon"
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
                <span className={cn(COMPACT_BADGE_BASE, BADGE_PALETTES.slate)}>
                  {formatTransactionId(sheetItem)}
                </span>
                <span
                  className={cn(
                    COMPACT_BADGE_BASE,
                                      statusBadgeClass(sheetItem?.status)
                  )}
                >
                  {formatRequestStatus(sheetItem?.status)}
                </span>
              </div>
            </div>

            {/* SECTION 1: Transaction Specification */}
            <div className="space-y-2">
              <SheetSectionHeading icon="SlidersHorizontalIcon" title="Transaction Specification" />

              <div className="divide-y-0">
                <InfoRow
                  icon=" Tag01Icon"
                  label="Transaction ID"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-sans tabular-nums text-gray-800 dark:text-zinc-200 font-semibold">
                      {formatTransactionId(sheetItem)}
                    </span>
                    <CopyButton iconOnly textToCopy={formatTransactionId(sheetItem)} entityName="Transaction ID" />
                  </div>
                </InfoRow>

                <InfoRow
                  icon={sheetItem?.officeId === "registrar" ? " Certificate01Icon" : " StudentIcon"}
                  label="Department"
                >
                  <span
                    className={cn(
                      COMPACT_BADGE_BASE,
                                          getDepartmentBadgeClass(sheetItem?.officeId === "registrar")
                    )}
                  >
                    {sheetItem?.officeId === "registrar" ? "University Registrar" : "Student Affairs (OSAS)"}
                  </span>
                </InfoRow>

                <InfoRow
                  icon=" PieChartIcon"
                  label="Current Stage"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        COMPACT_BADGE_BASE,
                                              statusBadgeClass(sheetItem?.status)
                      )}
                    >
                      <span>{formatRequestStatus(sheetItem?.status)}</span>
                    </span>
                    <span className="text-[11px] font-sans tabular-nums text-gray-400 font-normal">
                      {sheetItem?.createdAt ? formatRelativeTime(sheetItem.createdAt).relative : ""}
                    </span>
                  </div>
                </InfoRow>

                <InfoRow
                  icon=" Timer01Icon"
                  label="Charter SLA"
                >
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={cn(
                        COMPACT_BADGE_BASE,
                                              sheetItemCharter?.badgeClass
                      )}
                    >
                      <span>{sheetItemCharter?.label}</span>
                    </span>
                    <span className="text-[11px] text-gray-500 dark:text-zinc-400">
                      {sheetItemCharter?.detail}
                    </span>
                  </div>
                </InfoRow>

                <InfoRow
                  icon=" UserIcon"
                  label="Student Requester"
                >
                  <div className="flex items-center gap-2">
                    <span>{formatStudentRequester(sheetItem?.studentName, sheetItem?.studentNo)}</span>
                    {sheetItem?.studentName && (
                      <button
                        type="button"
                        onClick={() => handleCopy(sheetItem.studentName, "Requester Name", "name")}
                        className="w-5 h-5 rounded hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-400 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-zinc-100 flex items-center justify-center transition-colors cursor-pointer"
                        title="Copy Requester Name"
                      >
                        {copiedField === "name" ? (
                          <Tick01Icon size="1em" className="text-[11px] text-gray-700 dark:text-zinc-200" />
                        ) : (
                          <Copy01Icon size="1em" className="text-[11px]" />
                        )}
                      </button>
                    )}
                  </div>
                </InfoRow>

                <InfoRow
                  icon=" Contact01Icon"
                  label="Student Number"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-sans tabular-nums text-xs font-semibold text-gray-800 dark:text-zinc-200">
                      {sheetItem?.studentNo}
                    </span>
                    {sheetItem?.studentNo && (
                      <CopyButton iconOnly textToCopy={sheetItem.studentNo} entityName="Student Number" />
                    )}
                  </div>
                </InfoRow>

                <InfoRow
                  icon=" Clock01Icon"
                  label="Submitted At"
                >
                  <span className="font-sans tabular-nums text-xs font-semibold text-gray-800 dark:text-zinc-200">
                    {sheetItem?.createdAt ? formatPHDateTime(sheetItem.createdAt) : "N/A"}
                  </span>
                </InfoRow>

                {sheetItem?.organizationName && (
                  <InfoRow
                    icon=" Building01Icon"
                    label="Organization"
                    value={sheetItem.organizationName}
                  />
                )}

                {sheetItem?.eventDate && (
                  <InfoRow
                    icon=" Calendar01Icon"
                    label="Event Schedule"
                    value={sheetItem.eventDate.substring(0, 10)}
                  />
                )}
              </div>
            </div>

            {/* SECTION 2: Purpose & Remarks */}
            <div className="space-y-2 pt-2">
              <SheetSectionHeading icon="Message01Icon" title="Purpose & Remarks" />
              <p className="text-xs text-gray-700 dark:text-zinc-300 leading-relaxed whitespace-pre-wrap pt-0.5">
                {sheetItem?.notes || "No special remarks provided by the applicant."}
              </p>
            </div>

            {/* SECTION 3: Attached Document */}
            {sheetItem?.originalFilename && (
              <div className="space-y-2 pt-2">
                <SheetSectionHeading icon={File02Icon} title="Attached Document" />
                <div className="p-3.5 rounded-xl border border-border/70 dark:border-border/60 bg-gray-50/70 dark:bg-zinc-800/40 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 [@media(pointer:coarse)]:h-11 [@media(pointer:coarse)]:w-11 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-pup-maroon dark:focus-visible:ring-red-400 rounded-lg bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400 flex items-center justify-center shrink-0">
                      <File02Icon size="1em" className="text-base" />
                    </div>
                    <div className="min-w-0">
                      <span className="font-semibold text-gray-900 dark:text-zinc-100 text-xs block truncate max-w-[200px]">
                        {sheetItem.originalFilename}
                      </span>
                      {sheetItem.sizeBytes && (
                        <span className="text-[10px] text-gray-400 font-sans tabular-nums">
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
                    className="shrink-0 h-8 px-3 text-xs font-semibold rounded-lg"
                  >
                    {PDF_ACTION_LABELS.preview}
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Executive Action Bar Sheet Footer */}
          <SheetFooter className="shrink-0 p-4 px-6 flex flex-row items-center justify-between">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setSelectedItem(null)}
              className="h-9 px-4"
            >
              Close
            </Button>

            <div>
              {sheetItem && (
                <CopyButton
                  iconOnly
                  textToCopy={() => JSON.stringify(sheetItem, null, 2)}
                  entityName="Record Data"
                  idleLabel="Copy Record Data"
                />
              )}
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* PDF Document Preview Modal */}
      <PDFPreviewModal
        open={pdfPreviewOpen}
        onClose={() => {
          previewSession.cancel()
          setIsGeneratingPdf(false)
          setPdfPreviewOpen(false)
          setPdfPreviewData(null)
        }}
        preview={pdfPreviewData}
        preparedPdf={pdfPreviewData?.url?.startsWith("blob:")}
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
