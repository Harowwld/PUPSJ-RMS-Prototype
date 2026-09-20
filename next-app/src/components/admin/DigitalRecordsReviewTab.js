"use client"

import HugeIcon from "@/components/shared/HugeIcon";
import { useState, useMemo, useEffect, useRef } from "react"
import { Reorder } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import KpiStatCardsSkeleton from "@/components/systemadmin/skeletons/KpiStatCardsSkeleton"
import RecordsReviewTableSkeleton from "@/components/admin/skeletons/RecordsReviewTableSkeleton"
import { format } from "date-fns"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { cn } from "@/lib/utils"
import { formatPHDateTime, formatPHDateTimeParts } from "@/lib/timeFormat"
import { generateExportFilename } from "@/lib/exportHelpers"
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
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
import MultiCriteriaFilter from "@/components/shared/MultiCriteriaFilter"
import ActiveFilterChips from "@/components/shared/ActiveFilterChips"
import { Select } from "@/components/ui/select"
import { toast } from "sonner"

function SortIndicator({ column, sortBy, sortOrder }) {
  if (sortBy !== column) {
    return <HugeIcon  className="ph-bold ph-caret-up-down ml-1 text-[12px] text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity"></HugeIcon>
  }
  return sortOrder === "ASC" ? (
    <HugeIcon  className="ph-bold ph-caret-up ml-1 text-[12px] text-gray-400"></HugeIcon>
  ) : (
    <HugeIcon  className="ph-bold ph-caret-down ml-1 text-[12px] text-gray-400"></HugeIcon>
  )
}

function toNormalCase(str) {
  if (!str) return ""
  return str
    .toLowerCase()
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
}

const formatUploadedDate = (dateString) => {
  if (!dateString) return { dateStr: "—", timeStr: "" }
  try {
    let normalized = String(dateString);
    if (!normalized.includes("T") && !normalized.includes("Z")) {
      normalized = normalized.replace(" ", "T") + "Z";
    }
    const date = new Date(normalized);
    if (isNaN(date.getTime())) throw new Error("Invalid");
    
    const dateStr = date.toLocaleDateString("en-US", {
      timeZone: "Asia/Manila",
      month: "short",
      day: "numeric",
      year: "numeric"
    });
    
    const timeStr = date.toLocaleTimeString("en-US", {
      timeZone: "Asia/Manila",
      hour: "numeric",
      minute: "2-digit",
      hour12: true
    });
    
    return { dateStr, timeStr };
  } catch {
    return { dateStr: String(dateString), timeStr: "" };
  }
}

export default function DigitalRecordsReviewTab({
  records,
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
  const [searchQuery, setSearchQuery] = useState("")
  const [localSearch, setLocalSearch] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [docTypeFilters, setDocTypeFilters] = useState([])
  const [statusFilters, setStatusFilters] = useState(() => {
    if (!statusFilter || statusFilter === "All") return []
    return statusFilter.split(",").map((s) => s.trim()).filter(Boolean)
  })
  const [activeDocTypes, setActiveDocTypes] = useState([])
  const [jumpPage, setJumpPage] = useState("1")
  const [sortBy, setSortBy] = useState("created_at")
  const [sortOrder, setSortOrder] = useState("DESC")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [isExporting, setIsExporting] = useState(false)
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [lastSelectedId, setLastSelectedId] = useState(null)
  const [selectedKpi, setSelectedKpi] = useState(null)
  const statCardsRef = useRef(null)
  const [kpiOrder, setKpiOrder] = useState(["pending", "approved", "declined"])

  // Synchronize statusFilters when external statusFilter prop changes
  useEffect(() => {
    if (!statusFilter || statusFilter === "All") {
      setStatusFilters([])
    } else {
      const list = statusFilter.split(",").map((s) => s.trim()).filter(Boolean)
      setStatusFilters(list)
    }
  }, [statusFilter])


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

  const cardDetailsData = useMemo(() => {
    if (!selectedKpi || !records) return null

    const pending = records.filter((r) => r.approval_status === "Pending")
    const approved = records.filter((r) => r.approval_status === "Approved")
    const declined = records.filter((r) => r.approval_status === "Declined")

    if (selectedKpi === "pending") {
      const breakdownObj = {}
      pending.forEach((r) => {
        breakdownObj[r.doc_type] = (breakdownObj[r.doc_type] || 0) + 1
      })
      const pendingBreakdown = Object.entries(breakdownObj).map(([type, count]) => ({ type, count }))

      let oldestPendingAge = 0
      if (pending.length > 0) {
        const timestamps = pending.map((r) => new Date(r.created_at).getTime()).filter(t => !isNaN(t))
        if (timestamps.length > 0) {
          const oldestTime = Math.min(...timestamps)
          oldestPendingAge = Math.round((Date.now() - oldestTime) / (3600 * 1000))
        }
      }

      return { pendingBreakdown, oldestPendingAge }
    }

    if (selectedKpi === "approved") {
      const breakdownObj = {}
      approved.forEach((r) => {
        breakdownObj[r.doc_type] = (breakdownObj[r.doc_type] || 0) + 1
      })
      const approvedBreakdown = Object.entries(breakdownObj).map(([type, count]) => ({ type, count }))

      return { approvedBreakdown }
    }

    if (selectedKpi === "declined") {
      const breakdownObj = {}
      declined.forEach((r) => {
        breakdownObj[r.doc_type] = (breakdownObj[r.doc_type] || 0) + 1
      })
      const declinedBreakdown = Object.entries(breakdownObj).map(([type, count]) => ({ type, count }))

      const reasonsObj = {}
      declined.forEach((r) => {
        const reason = r.review_note || "No reason specified"
        reasonsObj[reason] = (reasonsObj[reason] || 0) + 1
      })
      const declineReasons = Object.entries(reasonsObj).map(([reason, count]) => ({ reason, count }))
        .sort((a, b) => b.count - a.count)

      return { declinedBreakdown, declineReasons }
    }

    return null
  }, [selectedKpi, records])

  const [activeKpiDetails, setActiveKpiDetails] = useState(null)
  useEffect(() => {
    if (cardDetailsData) {
      setActiveKpiDetails(cardDetailsData)
    }
  }, [cardDetailsData])

  const filterCriteriaGroups = useMemo(() => {
    const recs = records || []
    const pendingCount = recs.filter((r) => r.approval_status === "Pending").length
    const approvedCount = recs.filter((r) => r.approval_status === "Approved").length
    const declinedCount = recs.filter((r) => r.approval_status === "Declined").length

    return [
      {
        id: "status",
        label: "Approval Status",
        options: [
          { id: "Pending", label: "Pending", count: pendingCount, dotColor: "bg-amber-500" },
          { id: "Approved", label: "Approved", count: approvedCount, dotColor: "bg-emerald-500" },
          { id: "Declined", label: "Declined", count: declinedCount, dotColor: "bg-rose-500" },
        ],
        selected: statusFilters,
        onChange: (vals) => {
          setStatusFilters(vals)
          if (setStatusFilter) {
            setStatusFilter(vals.length === 1 ? vals[0] : (vals.length === 0 ? "All" : vals.join(",")))
          }
          setCurrentPage(1)
        }
      },
      {
        id: "docType",
        label: "Document Type",
        options: activeDocTypes.map((name) => ({
          id: name,
          label: name,
          count: recs.filter((r) => r.doc_type === name).length,
        })),
        selected: docTypeFilters,
        onChange: (vals) => {
          setDocTypeFilters(vals)
          setCurrentPage(1)
        }
      }
    ]
  }, [records, statusFilters, docTypeFilters, activeDocTypes, setStatusFilter])


  const extraChips = useMemo(() => {
    if (dateFrom || dateTo) {
      return [{
        key: "dateRange",
        label: `${formatChipDate(dateFrom)} – ${formatChipDate(dateTo)}`,
        onRemove: () => {
          setDateFrom("")
          setDateTo("")
          setCurrentPage(1)
        }
      }]
    }
    return []
  }, [dateFrom, dateTo])

  const hasActiveFilters = localSearch !== "" || statusFilters.length > 0 || docTypeFilters.length > 0 || !!dateFrom || !!dateTo;

  useEffect(() => {
    const handler = setTimeout(() => {
      setSearchQuery(localSearch)
      setCurrentPage(1)
    }, 300)
    return () => clearTimeout(handler)
  }, [localSearch])

  useEffect(() => {
    if (searchQuery === "") setLocalSearch("")
  }, [searchQuery])

  useEffect(() => {
    setJumpPage(String(currentPage))
  }, [currentPage])

  // Clear selection when changing pages or status filter
  useEffect(() => {
    setSelectedIds(new Set())
    setLastSelectedId(null)
  }, [currentPage, statusFilters, docTypeFilters, searchQuery, dateFrom, dateTo])

  // Prune stale selections when records dataset updates
  useEffect(() => {
    if (!records) return
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

  const handleExportCSV = async () => {
    if (isExporting) return
    setIsExporting(true)
    try {
      const rows = sortedRecords
      const headers = ["Record ID", "Student no.", "Student Name", "Document Type", "Filename", "Status", "Reviewed By", "Reviewed At", "Uploaded At"]
      const csvRows = rows.map((r) => [
        r.id,
        r.student_no || "—",
        r.student_name || "—",
        r.doc_type || "—",
        r.original_filename || "—",
        r.approval_status || "Pending",
        r.reviewed_by || "—",
        r.reviewed_at ? formatPHDateTime(r.reviewed_at) : "—",
        r.created_at ? formatPHDateTime(r.created_at) : "—",
      ])
      const csvContent = [
        headers.join(","),
        ...csvRows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")),
      ].join("\n")
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
      const link = document.createElement("a")
      const url = URL.createObjectURL(blob)
      const fileName = generateExportFilename("DIGITAL-RECORDS", "REVIEW", "csv")
      link.setAttribute("href", url)
      link.setAttribute("download", fileName)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      showToast?.({
        title: "Export Success",
        description: `Dataset exported successfully as ${fileName}.`
      })

      onLogAction?.({
        action: "Export Records",
        details: `exported ${rows.length} digital records to CSV for administrative review`,
        entityType: "Report"
      })
    } catch (err) {
      console.error("[Export Error]", err)
    } finally {
      setIsExporting(false)
    }
  }

  const sortedRecords = useMemo(() => {
    const baseFiltered = (records || []).filter((r) => {
      if (statusFilters.length > 0 && !statusFilters.includes(r.approval_status)) return false
      if (docTypeFilters.length > 0 && !docTypeFilters.includes(r.doc_type)) return false
      if (dateFrom || dateTo) {
        let createdDate = ""
        if (r.created_at) {
          try {
            const d = new Date(r.created_at)
            if (!isNaN(d.getTime())) {
              createdDate = format(d, "yyyy-MM-dd")
            }
          } catch (e) {
            createdDate = String(r.created_at).substring(0, 10)
          }
        }
        
        if (dateFrom && createdDate < dateFrom) return false
        if (dateTo && createdDate > dateTo) return false
      }
      if (!searchQuery.trim()) return true
      const query = searchQuery.toLowerCase()
      return (
        r.student_no?.toLowerCase().includes(query) ||
        r.student_name?.toLowerCase().includes(query) ||
        r.doc_type?.toLowerCase().includes(query) ||
        r.original_filename?.toLowerCase().includes(query)
      )
    })

    return [...baseFiltered].sort((a, b) => {
      let valA = a[sortBy] ?? ""
      let valB = b[sortBy] ?? ""

      if (sortBy === "student_name") {
        valA = a.student_name || ""
        valB = b.student_name || ""
      }

      if (typeof valA === "string") valA = valA.toLowerCase()
      if (typeof valB === "string") valB = valB.toLowerCase()

      if (!valA && valA !== 0) return sortOrder === "ASC" ? 1 : -1
      if (!valB && valB !== 0) return sortOrder === "ASC" ? -1 : 1

      if (valA < valB) return sortOrder === "ASC" ? -1 : 1
      if (valA > valB) return sortOrder === "ASC" ? 1 : -1
      return 0
    })
  }, [records, statusFilters, docTypeFilters, dateFrom, dateTo, searchQuery, sortBy, sortOrder])

  const totalPages = Math.ceil(sortedRecords.length / itemsPerPage) || 1
  const displayPage = Math.min(currentPage, totalPages)

  const handleJumpPage = (e) => {
    if (e.key === "Enter" || e.type === "blur") {
      const val = parseInt(jumpPage)
      if (!isNaN(val) && val >= 1 && val <= totalPages) {
        setCurrentPage(val)
      } else {
        setJumpPage(String(displayPage))
      }
    }
  }

  const paginatedRecords = useMemo(() => {
    const start = (displayPage - 1) * itemsPerPage
    return sortedRecords.slice(start, start + itemsPerPage)
  }, [sortedRecords, displayPage, itemsPerPage])

  const toggleSelectAll = (checked) => {
    if (checked) {
      const pendingIds = paginatedRecords
        .filter((r) => r.approval_status === "Pending")
        .map((r) => r.id)
      setSelectedIds(new Set(pendingIds))
    } else {
      setSelectedIds(new Set())
    }
    setLastSelectedId(null)
  }

  const toggleSelectRow = (id, event) => {
    const record = paginatedRecords.find((r) => r.id === id)
    if (!record || record.approval_status !== "Pending") return

    const isSelected = selectedIds.has(id)

    if (event?.shiftKey && lastSelectedId) {
      if (isSelected) {
        if (selectedIds.size > 1) {
          // If Shift+Clicking an already selected item among multiple, deselect others
          setSelectedIds(new Set([id]))
          setLastSelectedId(id)
        } else {
          // If Shift+Clicking the ONLY selected item, deselect it completely
          setSelectedIds(new Set())
          setLastSelectedId(null)
        }
        return
      }

      // Normal Shift+Click Range Selection
      const currentIdx = paginatedRecords.findIndex((r) => r.id === id)
      const lastIdx = paginatedRecords.findIndex((r) => r.id === lastSelectedId)

      if (currentIdx !== -1 && lastIdx !== -1) {
        const start = Math.min(currentIdx, lastIdx)
        const end = Math.max(currentIdx, lastIdx)
        const idsInRange = paginatedRecords
          .slice(start, end + 1)
          .filter((r) => r.approval_status === "Pending")
          .map((r) => r.id)

        const next = new Set(selectedIds)
        idsInRange.forEach((rangeId) => next.add(rangeId))
        
        setSelectedIds(next)
        setLastSelectedId(id)
        return
      }
    }

    // Plain Click: Additive Toggle
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
      await onApprove(id, true) // suppress standard toast
      toast.success("Record Approved", {
        description: "The digital record has been finalized.",
        action: {
          label: "UNDO",
          onClick: () => onSetStatus(id, "Pending", "Undo accidental approval"),
        },
      })
    } catch (err) {
      // error handled by parent onApprove
    }
  }

  const handleBulkApproveAction = async () => {
    const ids = Array.from(selectedIds)
    if (ids.length === 0) return
    try {
      if (onBulkApprove) {
        setSelectedIds(new Set())
        await onBulkApprove(ids)
      }
    } catch (err) {}
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
    const styles = {
      Pending: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:text-amber-500/90 dark:border-amber-900/50",
      Approved: "bg-green-50 text-green-700 border-green-200 dark:bg-emerald-950/20 dark:text-emerald-500/90 dark:border-emerald-900/50",
      Declined: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/20 dark:text-red-500/90 dark:border-red-900/50",
    }
    return styles[status] || styles.Pending
  }

  const getStatusIcon = (status) => {
    const icons = {
      Pending: "ph-clock",
      Approved: "ph-check-circle",
      Declined: "ph-x-circle",
    }
    return icons[status] || "ph-clock"
  }

  const handlePreview = (record) => {
    // Fire non-blocking PATCH to mark document as previewed
    fetch(`/api/documents/${record.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isPreviewed: true }),
    })
      .then((res) => (res.ok ? res.json().catch(() => null) : null))
      .then((json) => {
        if (json?.ok && onRefresh) {
          onRefresh();
        }
      })
      .catch((err) => console.error("[Preview PATCH Error]", err));

    if (onPreviewDocument) {
      onPreviewDocument({
        docId: record.id,
        docType: record.doc_type,
        studentName: record.student_name || "Unknown",
        studentNo: record.student_no,
        refId: record.id,
      })
    }
  }

  const stats = useMemo(() => {
    const today = new Date().toLocaleDateString("en-CA") // YYYY-MM-DD

    const pending = (records || []).filter((r) => r.approval_status === "Pending")
    const approvedRecords = (records || []).filter((r) => r.approval_status === "Approved")
    const declinedRecords = (records || []).filter((r) => r.approval_status === "Declined")

    const pendingToday = pending.filter((r) => {
      if (!r.created_at) return false
      const raw = String(r.created_at)
      let dStr = ""
      if (/^\d{4}-\d{2}-\d{2}/.test(raw)) {
        dStr = raw.substring(0, 10)
      } else {
        try {
          const d = new Date(r.created_at)
          if (!isNaN(d.getTime())) dStr = format(d, "yyyy-MM-dd")
        } catch (e) {}
      }
      return dStr === today
    }).length

    const approvedToday = approvedRecords.filter((r) => {
      if (!r.reviewed_at) return false
      const raw = String(r.reviewed_at)
      let dStr = ""
      if (/^\d{4}-\d{2}-\d{2}/.test(raw)) {
        dStr = raw.substring(0, 10)
      } else {
        try {
          const d = new Date(r.reviewed_at)
          if (!isNaN(d.getTime())) dStr = format(d, "yyyy-MM-dd")
        } catch (e) {}
      }
      return dStr === today
    }).length

    const declinedToday = declinedRecords.filter((r) => {
      if (!r.reviewed_at) return false
      const raw = String(r.reviewed_at)
      let dStr = ""
      if (/^\d{4}-\d{2}-\d{2}/.test(raw)) {
        dStr = raw.substring(0, 10)
      } else {
        try {
          const d = new Date(r.reviewed_at)
          if (!isNaN(d.getTime())) dStr = format(d, "yyyy-MM-dd")
        } catch (e) {}
      }
      return dStr === today
    }).length

    return {
      pending: pending.length,
      pendingToday,
      approvedToday,
      totalApproved: approvedRecords.length,
      declinedToday,
      totalDeclined: declinedRecords.length,
    }
  }, [records])

  const activeShortcut = useMemo(() => {
    if (!dateFrom || !dateTo) return null
    const todayStr = format(new Date(), "yyyy-MM-dd")
    
    // Check Today
    if (dateFrom === todayStr && dateTo === todayStr) return "Today"
    
    // Check Yesterday
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayStr = format(yesterday, "yyyy-MM-dd")
    if (dateFrom === yesterdayStr && dateTo === yesterdayStr) return "Yesterday"
    
    // Check 7 days
    const last7 = new Date()
    last7.setDate(last7.getDate() - 7)
    const last7Str = format(last7, "yyyy-MM-dd")
    if (dateFrom === last7Str && dateTo === todayStr) return "7 days"
    
    // Check 30 days
    const last30 = new Date()
    last30.setDate(last30.getDate() - 30)
    const last30Str = format(last30, "yyyy-MM-dd")
    if (dateFrom === last30Str && dateTo === todayStr) return "30 days"
    
    return null
  }, [dateFrom, dateTo])

  const handleShortcutClick = (range) => {
    const end = new Date()
    let start = new Date()
    switch (range) {
      case "Today":
        start.setHours(0, 0, 0, 0)
        break
      case "Yesterday":
        start.setDate(start.getDate() - 1)
        start.setHours(0, 0, 0, 0)
        end.setDate(end.getDate() - 1)
        end.setHours(23, 59, 59, 999)
        break
      case "7 days":
        start.setDate(start.getDate() - 7)
        start.setHours(0, 0, 0, 0)
        break
      case "30 days":
        start.setDate(start.getDate() - 30)
        start.setHours(0, 0, 0, 0)
        break
    }
    setDateFrom(format(start, "yyyy-MM-dd"))
    setDateTo(format(end, "yyyy-MM-dd"))
    setCurrentPage(1)
  }

  const formatChipDate = (dateStr) => {
    if (!dateStr) return "..."
    try {
      const d = new Date(dateStr.includes("T") ? dateStr : dateStr + "T00:00:00")
      return isNaN(d.getTime()) ? dateStr : format(d, "MMM d, yyyy")
    } catch (e) {
      return dateStr
    }
  }

  const handleClearFilters = () => {
    setLocalSearch("")
    setSearchQuery("")
    setStatusFilters([])
    setStatusFilter?.("All")
    setDocTypeFilters([])
    setDateFrom("")
    setDateTo("")
    setCurrentPage(1)
  }

  return (
    <TooltipProvider delayDuration={200}>
      <div className="animate-fade-up font-jakarta flex flex-1 flex-col h-full min-h-0 w-full gap-6">
        {/* ONE Single Card Container encapsulating Header, Metrics, Toolbar, Table & Pagination */}
        <Card className="flex h-auto w-full flex-col p-0 gap-0 overflow-visible rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-card dark:shadow-none isolate font-jakarta mb-4 min-h-0 flex-1">
          <PageHeader
            icon="ph-seal-check"
            title="Records Review"
            description="Verify student record submissions."
            showBorder={false}
            className="p-6"
            titleClassName="text-[18px] font-semibold tracking-[-0.01em] text-gray-900 dark:text-zinc-50"
            descriptionClassName="text-[13px] font-normal text-gray-500 dark:text-zinc-400 mt-[4px]"
            actions={
              <div className="flex items-center gap-2">
                <RefreshButton 
                  onRefresh={onRefresh} 
                  isLoading={isManualLoading} 
                  title="Refresh Review Data"
                />

                <div className="h-6 w-px bg-gray-200 dark:bg-zinc-800" />

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    onClick={handleExportCSV}
                    disabled={isLoading || isExporting}
                    className="flex h-10 items-center justify-center rounded-xl! border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 font-semibold text-xs active:scale-95 transition-all cursor-pointer px-4 shadow-xs hover:bg-gray-50 dark:hover:bg-zinc-700"
                  >
                    {isExporting ? (
                      <HugeIcon  className="ph-bold ph-spinner animate-spin text-[16px]"></HugeIcon>
                    ) : (
                      "Export"
                    )}
                  </Button>
                </div>
              </div>
            }
          />

          {/* Color Stat Cards / Skeletons at the Top */}
          {(isLoading && !isManualLoading) && !records ? (
            <div className="px-6 pb-6">
              <KpiStatCardsSkeleton count={3} />
            </div>
          ) : !error ? (
            <div className="px-6 pb-6">
              <Reorder.Group as="div" axis="x" values={kpiOrder} onReorder={setKpiOrder} ref={statCardsRef} className="flex flex-wrap gap-4 items-stretch w-full relative z-20 transition-all duration-500">
                {kpiOrder.map(key => {
                  if (key === "pending") return (
                <Reorder.Item as="div" value="pending" key="pending" className={cn("flex-1 min-w-[280px] cursor-grab active:cursor-grabbing", 
                  "relative group rounded-xl",
                  selectedKpi === "pending" ? "z-30" : "z-10"
                )}>
                  <div
                    onClick={() => setSelectedKpi(selectedKpi === "pending" ? null : "pending")}
                    className={cn(
                      "relative overflow-hidden rounded-[18px] border cursor-pointer select-none transition-all shadow-[0_2px_10px_rgb(0,0,0,0.04)] hover:shadow-[0_4px_15px_rgb(0,0,0,0.06)] flex flex-col justify-between min-h-[110px] h-full bg-gray-50 dark:bg-zinc-900",
                      selectedKpi === "pending"
                        ? "border-amber-500/50 ring-1 ring-amber-500/20"
                        : "border-gray-100 dark:border-white/5"
                    )}
                  >
                    <div className="flex justify-between items-start p-4 pb-0">
                      <span className="text-[13px] font-medium text-gray-500 dark:text-zinc-400 capitalize">
                        Pending Review
                      </span>
                      <div className="w-8 h-8 rounded-[10px] flex items-center justify-center text-white shadow-sm shrink-0 bg-[#f59e0b]">
                        <HugeIcon className="ph-bold text-[15px] ph-clock" />
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-end p-4 pt-1">
                      <div className="flex items-baseline gap-2">
                        <span className="text-[28px] font-bold text-gray-900 dark:text-white leading-none tracking-tight">
                          {stats.pending.toLocaleString()}
                        </span>
                        <span className="text-xs font-medium text-amber-600 dark:text-amber-400 mb-1">
                          {stats.pendingToday.toLocaleString()} received today
                        </span>
                      </div>
                      <HugeIcon className="ph-bold ph-dots-six-vertical cursor-grab active:cursor-grabbing hover:text-gray-400 dark:hover:text-zinc-500 text-gray-300 dark:text-zinc-700 text-lg mb-0.5" />

                    </div>
                  </div>

                  {/* Absolute details container */}
                  <div className={cn(
                    "absolute top-full left-0 right-0 z-[100] mt-2 rounded-xl border border-gray-200 bg-white p-4 shadow-xl dark:border-white/10 dark:bg-zinc-900 transition-all duration-300 ease-in-out origin-top",
                    selectedKpi === "pending" ? "scale-y-100 opacity-100 translate-y-0" : "scale-y-95 opacity-0 -translate-y-2 pointer-events-none"
                  )} onClick={(e) => e.stopPropagation()}>
                    <div className="space-y-3">
                      {activeKpiDetails && (
                        <>
                          <div className="grid grid-cols-2 gap-2">
                            <div className="bg-gray-50 dark:bg-zinc-800/60 p-2.5 rounded-lg border border-gray-100 dark:border-white/5">
                              <span className="block text-[9px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-wider">Total Pending</span>
                              <span className="text-lg font-black text-gray-900 dark:text-zinc-50">{stats.pending}</span>
                            </div>
                            <div className="bg-blue-50 dark:bg-blue-950/30 p-2.5 rounded-lg border border-blue-100 dark:border-blue-900/30">
                              <span className="block text-[9px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">Pending Today</span>
                              <span className="text-lg font-black text-blue-700 dark:text-blue-400">{stats.pendingToday}</span>
                            </div>
                          </div>

                          {activeKpiDetails.oldestPendingAge > 0 && (
                            <div className="bg-gray-50 dark:bg-zinc-800/60 p-2.5 rounded-lg border border-gray-100 dark:border-white/5 flex items-center justify-between text-xs">
                              <span className="font-medium text-gray-600 dark:text-zinc-400">Oldest pending record</span>
                              <span className="font-bold text-gray-900 dark:text-zinc-50">{activeKpiDetails.oldestPendingAge} hours</span>
                            </div>
                          )}

                          <div>
                            <h4 className="text-[10px] font-bold text-gray-400 dark:text-zinc-500 mb-1.5 uppercase tracking-wide">Type Breakdown</h4>
                            <div className="max-h-32 overflow-y-auto space-y-1 pr-1">
                              {activeKpiDetails.pendingBreakdown && activeKpiDetails.pendingBreakdown.length === 0 ? (
                                <p className="text-[11px] text-gray-400 dark:text-zinc-500 text-center py-2">No pending records</p>
                              ) : (
                                activeKpiDetails.pendingBreakdown && activeKpiDetails.pendingBreakdown.map(({ type, count }) => (
                                  <div key={type} className="flex justify-between items-center text-[11px] py-1 border-b border-gray-100 dark:border-white/5 text-gray-700 dark:text-zinc-300">
                                    <span className="truncate max-w-[150px]" title={type}>{type}</span>
                                    <span className="font-bold text-gray-900 dark:text-zinc-50">{count}</span>
                                  </div>
                                ))
                              )}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </Reorder.Item>
                  )
                  if (key === "approved") return (
                <Reorder.Item as="div" value="approved" key="approved" className={cn("flex-1 min-w-[280px] cursor-grab active:cursor-grabbing", 
                  "relative group rounded-xl",
                  selectedKpi === "approved" ? "z-30" : "z-10"
                )}>
                  <div
                    onClick={() => setSelectedKpi(selectedKpi === "approved" ? null : "approved")}
                    className={cn(
                      "relative overflow-hidden rounded-[18px] border cursor-pointer select-none transition-all shadow-[0_2px_10px_rgb(0,0,0,0.04)] hover:shadow-[0_4px_15px_rgb(0,0,0,0.06)] flex flex-col justify-between min-h-[110px] h-full bg-gray-50 dark:bg-zinc-900",
                      selectedKpi === "approved"
                        ? "border-emerald-500/50 ring-1 ring-emerald-500/20"
                        : "border-gray-100 dark:border-white/5"
                    )}
                  >
                    <div className="flex justify-between items-start p-4 pb-0">
                      <span className="text-[13px] font-medium text-gray-500 dark:text-zinc-400 capitalize">
                        Approved
                      </span>
                      <div className="w-8 h-8 rounded-[10px] flex items-center justify-center text-white shadow-sm shrink-0 bg-[#22c55e]">
                        <HugeIcon className="ph-bold text-[15px] ph-check-circle" />
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-end p-4 pt-1">
                      <div className="flex items-baseline gap-2">
                        <span className="text-[28px] font-bold text-gray-900 dark:text-white leading-none tracking-tight">
                          {stats.totalApproved.toLocaleString()}
                        </span>
                        <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 mb-1">
                          {stats.approvedToday.toLocaleString()} approved today
                        </span>
                      </div>
                      <HugeIcon className="ph-bold ph-dots-six-vertical cursor-grab active:cursor-grabbing hover:text-gray-400 dark:hover:text-zinc-500 text-gray-300 dark:text-zinc-700 text-lg mb-0.5" />

                    </div>
                  </div>

                  {/* Absolute details container */}
                  <div className={cn(
                    "absolute top-full left-0 right-0 z-[100] mt-2 rounded-xl border border-gray-200 bg-white p-4 shadow-xl dark:border-white/10 dark:bg-zinc-900 transition-all duration-300 ease-in-out origin-top",
                    selectedKpi === "approved" ? "scale-y-100 opacity-100 translate-y-0" : "scale-y-95 opacity-0 -translate-y-2 pointer-events-none"
                  )} onClick={(e) => e.stopPropagation()}>
                    <div className="space-y-3">
                      {activeKpiDetails && (
                        <>
                          <div className="grid grid-cols-2 gap-2">
                            <div className="bg-gray-50 dark:bg-zinc-800/60 p-2.5 rounded-lg border border-gray-100 dark:border-white/5">
                              <span className="block text-[9px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-wider">Approved Today</span>
                              <span className="text-lg font-black text-gray-900 dark:text-zinc-50">{stats.approvedToday}</span>
                            </div>
                            <div className="bg-emerald-50 dark:bg-emerald-950/30 p-2.5 rounded-lg border border-emerald-100 dark:border-emerald-900/30">
                              <span className="block text-[9px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Total Approved</span>
                              <span className="text-lg font-black text-emerald-700 dark:text-emerald-400">{stats.totalApproved}</span>
                            </div>
                          </div>

                          <div>
                            <h4 className="text-[10px] font-bold text-gray-400 dark:text-zinc-500 mb-1.5 uppercase tracking-wide">Type Breakdown</h4>
                            <div className="max-h-32 overflow-y-auto space-y-1 pr-1">
                              {activeKpiDetails.approvedBreakdown && activeKpiDetails.approvedBreakdown.length === 0 ? (
                                <p className="text-[11px] text-gray-400 dark:text-zinc-500 text-center py-2">No approved records</p>
                              ) : (
                                activeKpiDetails.approvedBreakdown && activeKpiDetails.approvedBreakdown.map(({ type, count }) => (
                                  <div key={type} className="flex justify-between items-center text-[11px] py-1 border-b border-gray-100 dark:border-white/5 text-gray-700 dark:text-zinc-300">
                                    <span className="truncate max-w-[150px]" title={type}>{type}</span>
                                    <span className="font-bold text-gray-900 dark:text-zinc-50">{count}</span>
                                  </div>
                                ))
                              )}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </Reorder.Item>
                  )
                  if (key === "declined") return (
                <Reorder.Item as="div" value="declined" key="declined" className={cn("flex-1 min-w-[280px] cursor-grab active:cursor-grabbing", 
                  "relative group rounded-xl",
                  selectedKpi === "declined" ? "z-30" : "z-10"
                )}>
                  <div
                    onClick={() => setSelectedKpi(selectedKpi === "declined" ? null : "declined")}
                    className={cn(
                      "relative overflow-hidden rounded-[18px] border cursor-pointer select-none transition-all shadow-[0_2px_10px_rgb(0,0,0,0.04)] hover:shadow-[0_4px_15px_rgb(0,0,0,0.06)] flex flex-col justify-between min-h-[110px] h-full bg-gray-50 dark:bg-zinc-900",
                      selectedKpi === "declined"
                        ? "border-red-500/50 ring-1 ring-red-500/20"
                        : "border-gray-100 dark:border-white/5"
                    )}
                  >
                    <div className="flex justify-between items-start p-4 pb-0">
                      <span className="text-[13px] font-medium text-gray-500 dark:text-zinc-400 capitalize">
                        Declined
                      </span>
                      <div className="w-8 h-8 rounded-[10px] flex items-center justify-center text-white shadow-sm shrink-0 bg-[#ef4444]">
                        <HugeIcon className="ph-bold text-[15px] ph-x-circle" />
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-end p-4 pt-1">
                      <div className="flex items-baseline gap-2">
                        <span className="text-[28px] font-bold text-gray-900 dark:text-white leading-none tracking-tight">
                          {stats.totalDeclined.toLocaleString()}
                        </span>
                        <span className="text-xs font-medium text-red-600 dark:text-red-400 mb-1">
                          {stats.declinedToday.toLocaleString()} returned today
                        </span>
                      </div>
                      <HugeIcon className="ph-bold ph-dots-six-vertical cursor-grab active:cursor-grabbing hover:text-gray-400 dark:hover:text-zinc-500 text-gray-300 dark:text-zinc-700 text-lg mb-0.5" />

                    </div>
                  </div>

                  {/* Absolute details container */}
                  <div className={cn(
                    "absolute top-full left-0 right-0 z-[100] mt-2 rounded-xl border border-gray-200 bg-white p-4 shadow-xl dark:border-white/10 dark:bg-zinc-900 transition-all duration-300 ease-in-out origin-top",
                    selectedKpi === "declined" ? "scale-y-100 opacity-100 translate-y-0" : "scale-y-95 opacity-0 -translate-y-2 pointer-events-none"
                  )} onClick={(e) => e.stopPropagation()}>
                    <div className="space-y-3">
                      {activeKpiDetails && (
                        <>
                          <div className="grid grid-cols-2 gap-2">
                            <div className="bg-gray-50 dark:bg-zinc-800/60 p-2.5 rounded-lg border border-gray-100 dark:border-white/5">
                              <span className="block text-[9px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-wider">Returned Today</span>
                              <span className="text-lg font-black text-gray-900 dark:text-zinc-50">{stats.declinedToday}</span>
                            </div>
                            <div className="bg-red-50 dark:bg-red-950/30 p-2.5 rounded-lg border border-red-100 dark:border-red-900/30">
                              <span className="block text-[9px] font-bold text-red-600 dark:text-red-400 uppercase tracking-wider">Total Returned</span>
                              <span className="text-lg font-black text-red-700 dark:text-red-400">{stats.totalDeclined}</span>
                            </div>
                          </div>

                          {activeKpiDetails.declineReasons && activeKpiDetails.declineReasons.length > 0 && (
                            <div>
                              <h4 className="text-[10px] font-bold text-gray-400 dark:text-zinc-500 mb-1.5 uppercase tracking-wide">Top Reasons</h4>
                              <div className="space-y-1">
                                {activeKpiDetails.declineReasons.map(({ reason, count }) => (
                                  <div key={reason} className="flex justify-between items-center text-[11px] py-0.5 text-gray-700 dark:text-zinc-300">
                                    <span className="truncate max-w-[150px] font-medium" title={reason}>&ldquo;{reason}&rdquo;</span>
                                    <span className="font-bold text-gray-900 dark:text-zinc-50">{count}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          <div>
                            <h4 className="text-[10px] font-bold text-gray-400 dark:text-zinc-500 mb-1.5 uppercase tracking-wide">Type Breakdown</h4>
                            <div className="max-h-32 overflow-y-auto space-y-1 pr-1">
                              {activeKpiDetails.declinedBreakdown && activeKpiDetails.declinedBreakdown.length === 0 ? (
                                <p className="text-[11px] text-gray-400 dark:text-zinc-500 text-center py-2">No returned records</p>
                              ) : (
                                activeKpiDetails.declinedBreakdown && activeKpiDetails.declinedBreakdown.map(({ type, count }) => (
                                  <div key={type} className="flex justify-between items-center text-[11px] py-1 border-b border-gray-100 dark:border-white/5 text-gray-700 dark:text-zinc-300">
                                    <span className="truncate max-w-[150px]" title={type}>{type}</span>
                                    <span className="font-bold text-gray-900 dark:text-zinc-50">{count}</span>
                                  </div>
                                ))
                              )}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </Reorder.Item>
                  )
                  return null
                })}
              </Reorder.Group>
            </div>
          ) : null}

        {/* Navigation Toolbar */}
        <div className="border-t border-gray-100 dark:border-white/10 p-5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-gray-50/40 dark:bg-zinc-900/30">
          {/* Search */}
          <div className="relative flex-1 sm:w-64 min-w-[200px] max-w-sm group">
            <HugeIcon  className="ph-bold ph-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-zinc-500 transition-colors group-focus-within:text-pup-maroon dark:group-focus-within:text-red-400 text-xs pointer-events-none"></HugeIcon>
            <Input
              type="text"
              placeholder="Search Student"
              className="pl-8 pr-16 h-9 text-xs w-full bg-white dark:bg-zinc-800 border border-gray-200 dark:border-white/10 rounded-xl text-gray-900 dark:text-zinc-100 placeholder:text-gray-400 dark:placeholder:text-zinc-500 shadow-none focus-visible:outline-none focus-visible:border-pup-maroon focus-visible:ring-1 focus-visible:ring-pup-maroon dark:focus-visible:border-red-500/80 dark:focus-visible:ring-red-500/80"
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
            />
            <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-[11px] font-mono text-gray-400 dark:text-zinc-500">
              {sortedRecords.length}
            </div>
          </div>

          {/* Doc Type, Time, and Date Range Controls */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Multi-Criteria Filters (Status + Doc Type) */}
            <MultiCriteriaFilter
              groups={filterCriteriaGroups}
              align="end"
              buttonLabel="Filter Records"
            />

            {/* Time Shortcuts */}
            <div className="flex items-center gap-1 bg-gray-100/80 dark:bg-zinc-800/60 p-1 rounded-xl border border-gray-200/60 dark:border-white/5">
              {[
                { key: "Today", label: "Today" },
                { key: "Yesterday", label: "Yest." },
                { key: "7 days", label: "7d" },
                { key: "30 days", label: "30d" },
              ].map((range) => {
                const isActive = activeShortcut === range.key
                return (
                  <button
                    key={range.key}
                    type="button"
                    onClick={() => handleShortcutClick(range.key)}
                    className={cn(
                      "px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer whitespace-nowrap",
                      isActive
                        ? "bg-white dark:bg-zinc-700 text-gray-900 dark:text-white shadow-xs"
                        : "text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white"
                    )}
                  >
                    {range.label}
                  </button>
                )
              })}
            </div>

            {/* Date range picker */}
            <div className="flex items-center gap-1.5">
              <div className="w-[105px]">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "h-9 w-full justify-start rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 text-left text-xs font-normal shadow-xs transition-all hover:bg-gray-50 dark:hover:bg-white/10 px-2.5",
                        !dateFrom ? "text-gray-400 dark:text-zinc-500" : "text-gray-700 dark:text-zinc-200"
                      )}
                    >
                      {dateFrom ? format(new Date(dateFrom.includes("T") ? dateFrom : dateFrom + "T00:00:00"), "MMM d") : "Start"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto rounded-2xl border border-gray-200 bg-white p-0 shadow-2xl dark:border-white/10 dark:bg-card" align="start">
                    <Calendar
                      mode="single"
                      selected={dateFrom ? new Date(dateFrom.includes("T") ? dateFrom : dateFrom + "T00:00:00") : undefined}
                      onSelect={(date) => {
                        setDateFrom(date ? format(date, "yyyy-MM-dd") : "")
                        setCurrentPage(1)
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <span className="text-[11px] text-gray-400 dark:text-zinc-500">→</span>
              <div className="w-[105px]">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "h-9 w-full justify-start rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 text-left text-xs font-normal shadow-xs transition-all hover:bg-gray-50 dark:hover:bg-white/10 px-2.5",
                        !dateTo ? "text-gray-400 dark:text-zinc-500" : "text-gray-700 dark:text-zinc-200"
                      )}
                    >
                      {dateTo ? format(new Date(dateTo.includes("T") ? dateTo : dateTo + "T00:00:00"), "MMM d") : "End"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto rounded-2xl border border-gray-200 bg-white p-0 shadow-2xl dark:border-white/10 dark:bg-card" align="start">
                    <Calendar
                      mode="single"
                      selected={dateTo ? new Date(dateTo.includes("T") ? dateTo : dateTo + "T00:00:00") : undefined}
                      onSelect={(date) => {
                        setDateTo(date ? format(date, "yyyy-MM-dd") : "")
                        setCurrentPage(1)
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>
        </div>

        {/* Active Filter Chips Row */}
        {hasActiveFilters && (
          <ActiveFilterChips
            groups={[
              {
                key: "status",
                label: "Status",
                values: statusFilters,
                onRemove: (val) => {
                  const next = statusFilters.filter((v) => v !== val)
                  setStatusFilters(next)
                  setStatusFilter?.(next.length === 1 ? next[0] : (next.length === 0 ? "All" : next.join(",")))
                  setCurrentPage(1)
                },
                formatValue: (val) => val
              },
              {
                key: "docType",
                label: "Type",
                values: docTypeFilters,
                onRemove: (val) => {
                  setDocTypeFilters((prev) => prev.filter((v) => v !== val))
                  setCurrentPage(1)
                }
              }
            ]}
            searchQuery={localSearch}
            onClearSearch={() => {
              setLocalSearch("")
              setSearchQuery("")
              setCurrentPage(1)
            }}
            extraChips={extraChips}
            onClearAll={handleClearFilters}
          />
        )}

        {/* Content Area */}
        {(isLoading && !isManualLoading) && (!records || records.length === 0) ? (
          <RecordsReviewTableSkeleton rowCount={8} embedded={true} />
        ) : error ? (
          <div className="flex min-h-[420px] flex-col items-center justify-center border-t border-gray-100 dark:border-white/10 bg-transparent text-center p-6 rounded-b-2xl">
            <Empty className="flex flex-col items-center justify-center border-0 text-center text-gray-500 dark:text-zinc-400">
              <EmptyHeader className="flex flex-col items-center gap-0">
                <div className="relative mb-6">
                  <div className="absolute inset-0 scale-150 animate-pulse rounded-full bg-gray-50 opacity-50 dark:bg-card"></div>
                  <EmptyMedia className="relative z-10 flex h-24 w-24 items-center justify-center rounded-3xl border border-gray-100 bg-white shadow-xl rotate-3 dark:border-white/10 dark:bg-card dark:shadow-none">
                    <HugeIcon  className="ph-duotone ph-warning-circle text-3xl text-red-500 dark:text-red-400" />
                  </EmptyMedia>
                </div>
                <EmptyTitle className="text-xl font-semibold text-gray-900 dark:text-zinc-50">
                  Load failed
                </EmptyTitle>
                <EmptyDescription className="mt-1 max-w-md text-sm font-medium text-gray-600 dark:text-zinc-300">
                  {error}
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          </div>
        ) : (
          <div className="overflow-hidden rounded-b-2xl border-t border-gray-200 dark:border-white/10 bg-white dark:bg-card flex flex-col flex-1">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="sticky top-0 z-10 border-b border-gray-200 bg-white dark:bg-card dark:border-white/10">
                  <tr className="text-left text-[12px] font-medium tracking-[0.04em] text-gray-400 dark:text-zinc-500">
                    <th className="w-12 p-4 text-center">
                      <input
                        type="checkbox"
                        className="h-4 w-4 cursor-pointer rounded border border-gray-300 text-pup-maroon dark:text-primary accent-pup-maroon focus:ring-pup-maroon disabled:opacity-20 dark:text-primary dark:border-white/10"
                        checked={
                          paginatedRecords.length > 0 &&
                          paginatedRecords.filter((r) => r.approval_status === "Pending").length > 0 &&
                          paginatedRecords
                            .filter((r) => r.approval_status === "Pending")
                            .every((r) => selectedIds.has(r.id))
                        }
                        onChange={(e) => toggleSelectAll(e.target.checked)}
                        disabled={
                          paginatedRecords.length === 0 ||
                          paginatedRecords.filter((r) => r.approval_status === "Pending").length === 0
                        }
                      />
                    </th>
                    <th className="p-4">
                      <button
                        onClick={() => handleSort("student_name")}
                        className="group flex items-center transition-colors hover:text-pup-maroon dark:hover:text-red-500 focus:outline-none text-[12px] font-medium tracking-[0.04em]"
                      >
                        Student Name{" "}
                        <SortIndicator
                          column="student_name"
                          sortBy={sortBy}
                          sortOrder={sortOrder}
                        />
                      </button>
                    </th>
                    <th className="p-4">
                      <button
                        onClick={() => handleSort("doc_type")}
                        className="group flex items-center transition-colors hover:text-pup-maroon dark:hover:text-red-500 focus:outline-none text-[12px] font-medium tracking-[0.04em]"
                      >
                        Document Type{" "}
                        <SortIndicator
                          column="doc_type"
                          sortBy={sortBy}
                          sortOrder={sortOrder}
                        />
                      </button>
                    </th>
                    <th className="p-4 text-[12px] font-medium tracking-[0.04em] text-gray-400 dark:text-zinc-500">Filename</th>
                    <th className="p-4">
                      <button
                        onClick={() => handleSort("approval_status")}
                        className="group flex items-center transition-colors hover:text-pup-maroon dark:hover:text-red-500 focus:outline-none text-[12px] font-medium tracking-[0.04em]"
                      >
                        Status{" "}
                        <SortIndicator
                          column="approval_status"
                          sortBy={sortBy}
                          sortOrder={sortOrder}
                        />
                      </button>
                    </th>
                    <th className="p-4">
                      <button
                        onClick={() => handleSort("created_at")}
                        className="group flex items-center transition-colors hover:text-pup-maroon dark:hover:text-red-500 focus:outline-none text-[12px] font-medium tracking-[0.04em]"
                      >
                        Upload Date{" "}
                        <SortIndicator
                          column="created_at"
                          sortBy={sortBy}
                          sortOrder={sortOrder}
                        />
                      </button>
                    </th>
                    <th className="p-4 text-right text-[12px] font-medium tracking-[0.04em] text-gray-400 dark:text-zinc-500">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-transparent">
                  {sortedRecords.length === 0 ? (
                    <tr className="border-0 hover:bg-transparent">
                      <td colSpan={7} className="border-0 p-0">
                        <Empty className="flex h-[450px] flex-col items-center justify-center border-0 bg-transparent text-center">
                          <EmptyHeader className="flex flex-col items-center gap-0">
                            <div className="relative mb-6">
                              <div className="absolute inset-0 scale-150 animate-pulse rounded-full bg-gray-50 opacity-50 dark:bg-card"></div>
                              <EmptyMedia className="relative z-10 flex h-24 w-24 items-center justify-center rounded-3xl border border-gray-100 bg-white shadow-xl rotate-3 dark:border-white/10 dark:bg-card dark:shadow-none">
                                <HugeIcon  className="ph-duotone ph-magnifying-glass text-xl text-gray-300 dark:text-zinc-600"></HugeIcon>
                              </EmptyMedia>
                            </div>
                            <EmptyTitle className="text-xl font-semibold text-gray-900 dark:text-zinc-50">
                              {hasActiveFilters ? "No Records Found" : "No Records Yet"}
                            </EmptyTitle>
                            <EmptyDescription className="max-w-xs text-sm font-medium text-gray-500 dark:text-zinc-400">
                              {hasActiveFilters
                                ? "Try adjusting your search filters to find what you're looking for."
                                : "There are currently no digital records in the system."}
                            </EmptyDescription>
                            {hasActiveFilters && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={handleClearFilters}
                                  className="mt-6 h-10 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 px-6 text-xs font-semibold text-gray-700 dark:text-zinc-200 shadow-xs transition-all hover:bg-gray-50 dark:hover:bg-zinc-700 active:scale-95 cursor-pointer"
                                >
                                  Clear
                                </Button>
                            )}
                          </EmptyHeader>
                        </Empty>
                      </td>
                    </tr>
                  ) : (
                    paginatedRecords.map((r) => {
                      const isSelected = selectedIds.has(r.id)

                      return (
                        <tr
                          key={r.id}
                          className={cn(
                            "group h-[52px] border-b-[0.5px] border-gray-100 dark:border-white/10 last:border-b-0 transition-all duration-fast hover:bg-gray-50/40 dark:bg-card dark:hover:bg-white/2 select-none cursor-pointer",
                            isSelected && "bg-blue-50/60 dark:bg-blue-950/20"
                          )}
                          onClick={(e) => toggleSelectRow(r.id, e)}
                        >
                          <td className="py-0 px-4 align-middle text-center">
                            {r.approval_status === "Pending" ? (
                              <input
                                type="checkbox"
                                className={cn(
                                  "h-4 w-4 cursor-pointer rounded border border-gray-300 text-pup-maroon dark:text-primary accent-pup-maroon focus:ring-pup-maroon dark:text-primary dark:border-white/10 transition-opacity",
                                  isSelected ? "opacity-100" : "opacity-50 group-hover:opacity-80"
                                )}
                                checked={isSelected}
                                onChange={() => {}} // Controlled by tr onClick
                              />
                            ) : null}
                          </td>
                          <td className="py-0 px-4 align-middle">
                            <div className="flex flex-col overflow-hidden">
                              <span className="truncate text-[13px] font-medium tracking-[-0.01em] text-gray-900 dark:text-zinc-50">
                                {toNormalCase(r.student_name)}
                              </span>
                              <span className="truncate text-[11px] font-normal text-gray-400 dark:text-zinc-500 mt-[2px]">
                                {r.student_no}
                              </span>
                            </div>
                          </td>
                          <td className="py-0 px-4 align-middle">
                            <span className="inline-flex w-fit items-center justify-center rounded-full bg-gray-100 px-[10px] py-[2.5px] text-[11px] font-medium text-gray-900 dark:bg-zinc-800 dark:text-zinc-100">
                              {r.doc_type}
                            </span>
                          </td>
                          <td className="py-0 px-4 align-middle">
                            <span
                              className="block max-w-[180px] truncate text-[13px] font-normal text-gray-400 dark:text-zinc-500"
                              title={r.original_filename}
                            >
                              {r.original_filename}
                            </span>
                          </td>
                          <td className="py-0 px-4 align-middle">
                            <div className="flex items-center gap-3">
                              <span
                                className={cn(
                                  "inline-flex w-fit items-center justify-center rounded-full px-[10px] py-[2.5px] text-[11px] font-medium uppercase tracking-[0.04em] shadow-none transition-all",
                                  getStatusBadge(r.approval_status)
                                )}
                              >
                                {r.approval_status || "Pending"}
                              </span>
                            </div>
                          </td>
                          <td className="py-0 px-4 align-middle">
                            <div className="flex flex-col">
                              <span className="text-[13px] font-normal text-gray-900 dark:text-zinc-50">
                                {formatUploadedDate(r.created_at).dateStr}
                              </span>
                              <span className="text-[11px] font-normal text-gray-400 dark:text-zinc-500 mt-[2px]">
                                {formatUploadedDate(r.created_at).timeStr}
                              </span>
                            </div>
                          </td>
                          <td className="py-0 px-4 align-middle text-right">
                            <div className="flex items-center justify-end gap-[12px]" onClick={(e) => e.stopPropagation()}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button
                                    onClick={() => handlePreview(r)}
                                    aria-label="Preview Document"
                                    className="w-7 h-7 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-zinc-100 transition-colors flex items-center justify-center border-0 bg-transparent cursor-pointer active:scale-95"
                                  >
                                    <HugeIcon  className="ph-bold ph-eye text-[16px]"></HugeIcon>
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent side="top">Preview</TooltipContent>
                              </Tooltip>

                              {r.approval_status === "Pending" && (
                                 <>
                                   <Tooltip>
                                     <TooltipTrigger asChild>
                                       <button
                                         onClick={() => handleApprove(r.id)}
                                         aria-label="Approve Document"
                                         className="w-7 h-7 rounded-lg hover:bg-green-50 dark:hover:bg-green-950/30 text-gray-500 hover:text-green-600 dark:text-zinc-400 dark:hover:text-green-400 transition-colors flex items-center justify-center border-0 bg-transparent cursor-pointer active:scale-95"
                                       >
                                         <HugeIcon  className="ph-bold ph-check text-[16px]"></HugeIcon>
                                       </button>
                                     </TooltipTrigger>
                                     <TooltipContent side="top">Approve</TooltipContent>
                                   </Tooltip>

                                   <Tooltip>
                                     <TooltipTrigger asChild>
                                       <button
                                         onClick={() => {
                                           setSelectedIds((prev) => {
                                             if (!prev.has(r.id)) return prev
                                             const next = new Set(prev)
                                             next.delete(r.id)
                                             return next
                                           })
                                           onDecline(r.id)
                                         }}
                                         aria-label="Decline Document"
                                         className="w-7 h-7 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 text-gray-500 hover:text-red-600 dark:text-zinc-400 dark:hover:text-red-400 transition-colors flex items-center justify-center border-0 bg-transparent cursor-pointer active:scale-95"
                                       >
                                         <HugeIcon  className="ph-bold ph-x text-[16px]"></HugeIcon>
                                       </button>
                                     </TooltipTrigger>
                                     <TooltipContent side="top">Decline</TooltipContent>
                                   </Tooltip>
                                 </>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Toolbar */}
            {sortedRecords.length > 0 && (
              <div className="flex items-center justify-between border-t border-[#e5e5ea] dark:border-[#3a3a3c] bg-white dark:bg-[#1c1c1e] p-4 px-6 rounded-b-2xl">
                <div className="flex items-center gap-6 text-xs text-gray-500 dark:text-zinc-400 select-none">
                  <span>
                    Showing {paginatedRecords.length} of {sortedRecords.length.toLocaleString()}
                  </span>
                  <div className="flex items-center gap-2">
                    <span>Rows:</span>
                    {[10, 20, 50, 100].map((size) => (
                      <button
                        key={size}
                        type="button"
                        onClick={() => {
                          setItemsPerPage(size)
                          setCurrentPage(1)
                        }}
                        className={cn(
                          "px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer",
                          itemsPerPage === size
                            ? "bg-gray-100 dark:bg-zinc-800 text-gray-900 dark:text-zinc-100"
                            : "text-gray-400 hover:text-gray-600 dark:hover:text-zinc-200"
                        )}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2 select-none">
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={displayPage <= 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="text-xs text-gray-500 dark:text-zinc-400 disabled:opacity-40 cursor-pointer rounded-xl h-8 px-3"
                  >
                    Prev
                  </Button>

                  <div className="h-8 w-8 rounded-xl border border-[#e5e5ea] dark:border-zinc-800 flex items-center justify-center text-xs font-bold text-gray-800 dark:text-zinc-200 bg-white dark:bg-zinc-900">
                    {displayPage}
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={displayPage >= totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    className="text-xs text-gray-500 dark:text-zinc-400 disabled:opacity-40 cursor-pointer rounded-xl h-8 px-3"
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Floating Bulk Action Bar */}
      {selectedIds.size > 0 && (
        (() => {
          const selectedRecords = paginatedRecords.filter((r) => selectedIds.has(r.id))
          const allPending = selectedRecords.length > 0 && selectedRecords.every((r) => r.approval_status === "Pending")

          if (allPending) {
            return (
              <FloatingActionBar
                selectedCount={selectedIds.size}
                onCancel={() => setSelectedIds(new Set())}
                actions={[
                  {
                    label: "Approve",
                    variant: "success",
                    onClick: handleBulkApprove,
                  },
                  {
                    label: "Decline",
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
                <span className="text-[12px] font-medium text-amber-700 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-200 dark:bg-amber-950/20 dark:text-amber-500/90 dark:border-amber-900/50 flex items-center">
                  <HugeIcon  className="ph-fill ph-warning-circle mr-1.5"></HugeIcon>
                  Contains reviewed records. Bulk actions disabled.
                </span>
              }
            />
          )
        })()
      )}
    </div>
    </TooltipProvider>
  )
}
