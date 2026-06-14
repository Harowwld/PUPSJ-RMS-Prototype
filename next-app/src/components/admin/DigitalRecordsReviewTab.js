"use client"
// Trigger rebuild comment
import { useState, useMemo, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
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
import { Select } from "@/components/ui/select"
import { toast } from "sonner"

function SortIndicator({ column, sortBy, sortOrder }) {
  if (sortBy !== column) {
    return <i className="ph-bold ph-caret-up-down ml-1 text-[12px] text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity"></i>
  }
  return sortOrder === "ASC" ? (
    <i className="ph-bold ph-caret-up ml-1 text-[12px] text-gray-400"></i>
  ) : (
    <i className="ph-bold ph-caret-down ml-1 text-[12px] text-gray-400"></i>
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
  const [docTypeFilter, setDocTypeFilter] = useState("All")
  const [activeDocTypes, setActiveDocTypes] = useState([])
  const [jumpPage, setJumpPage] = useState("1")
  const [sortBy, setSortBy] = useState("created_at")
  const [sortOrder, setSortOrder] = useState("DESC")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [isExporting, setIsExporting] = useState(false)
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [lastSelectedId, setLastSelectedId] = useState(null)

  const hasActiveFilters = localSearch !== "" || statusFilter !== "All" || docTypeFilter !== "All" || !!dateFrom || !!dateTo;

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
  }, [currentPage, statusFilter, docTypeFilter, searchQuery, dateFrom, dateTo])

  useEffect(() => {
    let cancelled = false
    fetch("/api/doc-types")
      .then((res) => res.json())
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
      if (docTypeFilter !== "All" && r.doc_type !== docTypeFilter) return false
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
  }, [records, docTypeFilter, dateFrom, dateTo, searchQuery, sortBy, sortOrder])

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
      const ids = new Set(paginatedRecords.map((r) => r.id))
      setSelectedIds(ids)
    } else {
      setSelectedIds(new Set())
    }
    setLastSelectedId(null)
  }

  const toggleSelectRow = (id, event) => {
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
        await onBulkApprove(ids)
        setSelectedIds(new Set())
        toast.success("Records Approved", {
          description: `Successfully approved ${ids.length} digital records.`,
          action: {
            label: "UNDO",
            onClick: async () => {
              // Bulk undo by setting all back to Pending
              for (const id of ids) {
                await onSetStatus(id, "Pending", "Undo bulk approval", true) // suppress nested toasts
              }
              toast.success("Bulk Approval Undone")
            }
          }
        })
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
      .then((res) => res.json())
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
    const fortyEightHoursAgo = Date.now() - 48 * 60 * 60 * 1000

    const pending = (records || []).filter((r) => r.approval_status === "Pending")
    const approvedRecords = (records || []).filter((r) => r.approval_status === "Approved")
    const declinedRecords = (records || []).filter((r) => r.approval_status === "Declined")

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

    const slaBreachRecords = pending.filter(
      (r) => new Date(r.created_at).getTime() < fortyEightHoursAgo
    )

    return {
      pending: pending.length,
      approvedToday,
      totalApproved: approvedRecords.length,
      declinedToday,
      totalDeclined: declinedRecords.length,
      hasSlaBreach: slaBreachRecords.length > 0,
      slaBreachCount: slaBreachRecords.length,
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

  return (
    <TooltipProvider delayDuration={200}>
      <div className="animate-fade-up font-inter flex flex-1 flex-col h-full min-h-0 w-full gap-6">
        {/* Color Stat Cards / Skeletons at the Top */}
        {(isLoading && !isManualLoading) && !records ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-pulse">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-28 rounded-brand bg-gray-100 dark:bg-muted" />
            ))}
          </div>
        ) : !error ? (
          <div className={cn(
            "grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 transition-all duration-500",
            (isLoading && !isManualLoading) ? "opacity-40 blur-[1px] grayscale-[0.1]" : "opacity-100"
          )}>
            {/* Stat Card 1: Pending Review */}
            <div className="group relative overflow-hidden rounded-xl border-none bg-gradient-to-br from-[#14C8FF] via-[#007AFF] to-[#0055FF] dark:from-[#007AFF] dark:to-[#0033aa] p-5 transition-all duration-300 hover:-translate-y-0.5">
                <div className="absolute inset-0 overflow-hidden rounded-xl pointer-events-none z-0">
                  <div className="absolute bottom-0 left-0 w-[70%] h-[80%] bg-gradient-to-tr from-[#0055FF]/40 to-[#007AFF]/0 pointer-events-none" style={{ clipPath: 'polygon(0% 100%, 100% 100%, 0% 0%)' }} />
                  <div className="absolute bottom-0 left-0 w-[50%] h-[60%] bg-gradient-to-tr from-[#14C8FF]/30 to-[#007AFF]/0 pointer-events-none" style={{ clipPath: 'polygon(0% 100%, 100% 100%, 0% 25%)' }} />
                </div>
                <div className="relative z-10">
                  <div className="flex items-end justify-between">
                    <div className="w-full">
                       <div className="mb-1 flex items-center justify-between">
                        <div className="flex items-center gap-1.5 font-medium text-white animate-fade-in" style={{ fontSize: "14px", fontWeight: 500, color: "#ffffff" }}>
                          Pending Review
                        </div>
                        {stats.hasSlaBreach && !isLoading && (
                          <div className="flex items-center gap-1.5">
                             <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                             </span>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                   <Badge className="bg-red-500 text-white border-0 text-[8px] font-semibold px-1.5 py-0 h-4 tracking-tight cursor-help">
                                      SLA Warning
                                    </Badge>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="bg-red-600 text-white border-red-500 max-w-[200px]">
                                   <p className="font-semibold text-xs tracking-tight">SLA Breach Detected</p>
                                   <p className="text-[10px] font-medium opacity-90 mt-0.5">
                                      {stats.slaBreachCount} {stats.slaBreachCount === 1 ? "record has" : "records have"} been pending for more than 48 hours.
                                    </p>
                                </TooltipContent>
                              </Tooltip>
                          </div>
                        )}
                      </div>
                      <div className="font-semibold text-white tracking-tight" style={{ fontSize: "48px", fontWeight: 600, color: "#ffffff" }}>
                        {stats.pending.toLocaleString()}
                      </div>
                      <div className="mt-1 font-normal text-white" style={{ fontSize: "13px", fontWeight: 400, color: "#ffffff" }}>
                        Waiting to be checked
                      </div>
                    </div>
                  </div>
                </div>
              </div>

            {/* Stat Card 2: Approved Today */}
            <div className="group relative overflow-hidden rounded-xl border-none bg-gradient-to-br from-[#34d399] via-[#059669] to-[#047857] dark:from-[#059669] dark:to-[#024e37] p-5 transition-all duration-300 hover:-translate-y-0.5">
                <div className="absolute inset-0 overflow-hidden rounded-xl pointer-events-none z-0">
                  <div className="absolute bottom-0 left-0 w-[70%] h-[80%] bg-gradient-to-tr from-[#047857]/40 to-[#059669]/0 pointer-events-none" style={{ clipPath: 'polygon(0% 100%, 100% 100%, 0% 0%)' }} />
                  <div className="absolute bottom-0 left-0 w-[50%] h-[60%] bg-gradient-to-tr from-[#34d399]/30 to-[#059669]/0 pointer-events-none" style={{ clipPath: 'polygon(0% 100%, 100% 100%, 0% 25%)' }} />
                </div>
                <div className="relative z-10">
                  <div className="flex items-end justify-between">
                    <div className="w-full">
                      <div className="mb-1 flex items-center gap-1.5 font-medium text-white" style={{ fontSize: "14px", fontWeight: 500, color: "#ffffff" }}>
                        Approved Today
                      </div>
                      <div className="font-semibold text-white tracking-tight" style={{ fontSize: "48px", fontWeight: 600, color: "#ffffff" }}>
                        {stats.approvedToday.toLocaleString()}
                      </div>
                      <div className="mt-1 font-normal text-white" style={{ fontSize: "13px", fontWeight: 400, color: "#ffffff" }}>
                        Verified correct ({stats.totalApproved.toLocaleString()} total)
                      </div>
                    </div>
                  </div>
                </div>
              </div>

            {/* Stat Card 3: Returned Today */}
            <div className="group relative overflow-hidden rounded-xl border-none bg-gradient-to-br from-[#f87171] via-[#dc2626] to-[#b91c1c] dark:from-[#dc2626] dark:to-[#7f1d1d] p-5 transition-all duration-300 hover:-translate-y-0.5">
                <div className="absolute inset-0 overflow-hidden rounded-xl pointer-events-none z-0">
                  <div className="absolute bottom-0 left-0 w-[70%] h-[80%] bg-gradient-to-tr from-[#b91c1c]/40 to-[#dc2626]/0 pointer-events-none" style={{ clipPath: 'polygon(0% 100%, 100% 100%, 0% 0%)' }} />
                  <div className="absolute bottom-0 left-0 w-[50%] h-[60%] bg-gradient-to-tr from-[#f87171]/30 to-[#dc2626]/0 pointer-events-none" style={{ clipPath: 'polygon(0% 100%, 100% 100%, 0% 25%)' }} />
                </div>
                <div className="relative z-10">
                  <div className="flex items-end justify-between">
                    <div className="w-full">
                      <div className="mb-1 flex items-center gap-1.5 font-medium text-white" style={{ fontSize: "14px", fontWeight: 500, color: "#ffffff" }}>
                        Returned Today
                      </div>
                      <div className="font-semibold text-white tracking-tight" style={{ fontSize: "48px", fontWeight: 600, color: "#ffffff" }}>
                        {stats.declinedToday.toLocaleString()}
                      </div>
                      <div className="mt-1 font-normal text-white" style={{ fontSize: "13px", fontWeight: 400, color: "#ffffff" }}>
                        Found with errors ({stats.totalDeclined.toLocaleString()} total)
                      </div>
                    </div>
                  </div>
                </div>
              </div>
          </div>
        ) : null}

      <Card className="flex h-auto w-full flex-col p-0 gap-0 overflow-hidden rounded-xl border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-card dark:shadow-none">
        <PageHeader
          icon="ph-seal-check"
          title="Records Review"
          description="Verify student record submissions."
          showBorder={false}
          titleClassName="text-[18px] font-semibold tracking-[-0.01em] text-gray-900 dark:text-zinc-50"
          descriptionClassName="text-[13px] font-normal text-gray-500 dark:text-zinc-400 mt-[4px]"
          actions={
            <div className="flex items-center gap-6">
              <RefreshButton 
                onRefresh={onRefresh} 
                isLoading={isManualLoading} 
                title="Refresh Review Data"
              />

              <div className="h-6 w-px bg-gray-200 dark:bg-zinc-800" />

              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleExportCSV}
                  disabled={isLoading || isExporting}
                  className="h-10 px-3 font-semibold text-sm text-gray-600 hover:text-gray-900 hover:bg-transparent dark:text-zinc-400 dark:hover:text-zinc-200 dark:hover:bg-transparent transition-colors flex items-center gap-2 rounded-brand shadow-none! border-0!"
                >
                  {isExporting ? "Preparing..." : "Export"}
                </Button>
              </div>
            </div>
          }
        />

        {/* Active Filter Chips Row */}
        {(localSearch !== "" || statusFilter !== "All" || docTypeFilter !== "All" || dateFrom || dateTo) && (() => {
          const formatChipDate = (dateStr) => {
            if (!dateStr) return "..."
            try {
              return format(new Date(dateStr), "MMM d, yyyy")
            } catch (e) {
              return dateStr
            }
          }
          return (
            <div className="flex-none border-b border-gray-100 bg-white px-6 py-3 animate-in fade-in slide-in-from-top-1 duration-300 dark:border-white/10 dark:bg-card">
              <div className="flex flex-wrap items-center gap-2">
                <span className="mr-1 text-[11px] font-medium uppercase tracking-[0.04em] text-gray-400 dark:text-zinc-500">Active filters:</span>
                {localSearch && (
                  <div className="flex items-center gap-[6px] rounded-[6px] bg-gray-100 dark:bg-zinc-800 px-[10px] py-[4px] text-[12px] font-normal text-gray-900 dark:text-zinc-50">
                    Search: {localSearch}
                    <button
                      onClick={() => { setSearchQuery(""); setLocalSearch(""); setCurrentPage(1); }}
                      className="text-[12px] text-gray-400 hover:text-gray-600 dark:text-zinc-500 dark:hover:text-zinc-300 transition-colors cursor-pointer border-0 bg-transparent p-0 leading-none"
                    >
                      ×
                    </button>
                  </div>
                )}
                {statusFilter !== "All" && (
                  <div className="flex items-center gap-[6px] rounded-[6px] bg-gray-100 dark:bg-zinc-800 px-[10px] py-[4px] text-[12px] font-normal text-gray-900 dark:text-zinc-50">
                    Status: {statusFilter}
                    <button
                      onClick={() => { setStatusFilter("All"); setCurrentPage(1); }}
                      className="text-[12px] text-gray-400 hover:text-gray-600 dark:text-zinc-500 dark:hover:text-zinc-300 transition-colors cursor-pointer border-0 bg-transparent p-0 leading-none"
                    >
                      ×
                    </button>
                  </div>
                )}
                {docTypeFilter !== "All" && (
                  <div className="flex items-center gap-[6px] rounded-[6px] bg-gray-100 dark:bg-zinc-800 px-[10px] py-[4px] text-[12px] font-normal text-gray-900 dark:text-zinc-50">
                    Type: {docTypeFilter}
                    <button
                      onClick={() => { setDocTypeFilter("All"); setCurrentPage(1); }}
                      className="text-[12px] text-gray-400 hover:text-gray-600 dark:text-zinc-500 dark:hover:text-zinc-300 transition-colors cursor-pointer border-0 bg-transparent p-0 leading-none"
                    >
                      ×
                    </button>
                  </div>
                )}
                {(dateFrom || dateTo) && (
                  <div className="flex items-center gap-[6px] rounded-[6px] bg-gray-100 dark:bg-zinc-800 px-[10px] py-[4px] text-[12px] font-normal text-gray-900 dark:text-zinc-50">
                    {formatChipDate(dateFrom)} – {formatChipDate(dateTo)}
                    <button
                      onClick={() => { setDateFrom(""); setDateTo(""); setCurrentPage(1); }}
                      className="text-[12px] text-gray-400 hover:text-gray-600 dark:text-zinc-500 dark:hover:text-zinc-300 transition-colors cursor-pointer border-0 bg-transparent p-0 leading-none"
                    >
                      ×
                    </button>
                  </div>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearchQuery("")
                    setLocalSearch("")
                    setStatusFilter("All")
                    setDocTypeFilter("All")
                    setDateFrom("")
                    setDateTo("")
                    setCurrentPage(1)
                  }}
                  className="h-auto text-[12px] font-medium text-gray-400 dark:text-zinc-500 border-0 bg-transparent hover:bg-transparent shadow-none p-0 hover:text-red-600 dark:hover:text-red-500 transition-colors cursor-pointer"
                >
                  Clear
                </Button>
              </div>
            </div>
          )
        })()}

        {/* Filter Bar */}
        <div className="bg-white border-t border-gray-100 p-4 backdrop-blur-md dark:bg-card/50 dark:border-white/10">
          <div className="flex w-full flex-wrap items-center gap-5">
            {/* Search */}
            <div className="flex-[2] min-w-[280px] group relative">
              <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                <i className="ph-bold ph-magnifying-glass text-gray-400 transition-colors group-focus-within:text-pup-maroon dark:text-zinc-500 text-sm"></i>
              </div>
              <Input
                type="text"
                placeholder="Search student, document, filename..."
                className="h-[36px] w-full rounded-[8px] border-[0.5px] border-gray-200 bg-white pl-9 pr-20 text-[13px] font-normal transition-all focus:border-pup-maroon/30 focus:ring-4 focus:ring-pup-maroon/5 placeholder:text-gray-400 dark:border-white/10 dark:bg-card dark:text-zinc-300 dark:focus:border-primary"
                value={localSearch}
                onChange={(e) => setLocalSearch(e.target.value)}
              />
              <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-[12px] font-normal text-gray-400 dark:text-zinc-500">
                {sortedRecords.length > 0 ? `${sortedRecords.length} results` : "0 results"}
              </div>
            </div>

            {/* Status Select */}
            <div className="min-w-[120px] flex-1">
              <Select
                value={statusFilter}
                onChange={(e) => { 
                  setStatusFilter(e.target.value); 
                  setCurrentPage(1);
                }}
                className="h-[36px] rounded-[8px] border-[0.5px] border-gray-200 text-[13px] font-normal"
              >
                <option value="All">Status</option>
                <option value="Pending">Pending</option>
                <option value="Approved">Approved</option>
                <option value="Declined">Declined</option>
              </Select>
            </div>

            {/* Doc Type Select */}
            <div className="min-w-[150px] flex-1">
              <Select
                value={docTypeFilter}
                onChange={(e) => { 
                  setDocTypeFilter(e.target.value); 
                  setCurrentPage(1);
                }}
                className="h-[36px] rounded-[8px] border-[0.5px] border-gray-200 text-[13px] font-normal"
              >
                <option value="All">Document type</option>
                {activeDocTypes.map((docTypeName) => (
                  <option key={docTypeName} value={docTypeName}>{docTypeName}</option>
                ))}
              </Select>
            </div>

            {/* Time Period shortcuts */}
            <div className="flex items-center gap-[12px] h-[36px] flex-none">
              {["Today", "Yesterday", "7 days", "30 days"].map((range) => {
                const isActive = activeShortcut === range
                return (
                  <button
                    key={range}
                    type="button"
                    onClick={() => handleShortcutClick(range)}
                    className={cn(
                      "text-[12px] font-normal transition-all bg-transparent border-0 cursor-pointer shadow-none focus:outline-none focus:ring-0 pb-1",
                      isActive 
                        ? "text-pup-maroon dark:text-red-500 border-b-[2px] border-pup-maroon dark:border-red-500 font-medium" 
                        : "text-gray-400 dark:text-zinc-500 hover:text-gray-600 dark:hover:text-zinc-300"
                    )}
                  >
                    {range}
                  </button>
                )
              })}
            </div>

            {/* Date range picker */}
            <div className="flex items-center gap-2 flex-none">
              <div className="w-[120px]">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "h-[36px] w-full justify-start rounded-[8px] border-[0.5px] border-gray-200 dark:border-white/10 bg-white dark:bg-card text-left text-[13px] font-normal shadow-xs transition-all hover:bg-gray-50 dark:hover:bg-white/10",
                        !dateFrom ? "text-gray-400 dark:text-zinc-500" : "text-gray-700 dark:text-zinc-200"
                      )}
                    >
                      {dateFrom ? format(new Date(dateFrom), "MMM d, yyyy") : "Start Date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto rounded-2xl p-0 shadow-2xl" align="start">
                    <Calendar
                      mode="single"
                      selected={dateFrom ? new Date(dateFrom) : undefined}
                      onSelect={(date) => {
                        setDateFrom(date ? format(date, "yyyy-MM-dd") : "")
                        setCurrentPage(1)
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="text-[12px] text-gray-400 dark:text-zinc-500 shrink-0">
                →
              </div>
              <div className="w-[120px]">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "h-[36px] w-full justify-start rounded-[8px] border-[0.5px] border-gray-200 dark:border-white/10 bg-white dark:bg-card text-left text-[13px] font-normal shadow-xs transition-all hover:bg-gray-50 dark:hover:bg-white/10",
                        !dateTo ? "text-gray-400 dark:text-zinc-500" : "text-gray-700 dark:text-zinc-200"
                      )}
                    >
                      {dateTo ? format(new Date(dateTo), "MMM d, yyyy") : "End Date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto rounded-2xl p-0 shadow-2xl" align="start">
                    <Calendar
                      mode="single"
                      selected={dateTo ? new Date(dateTo) : undefined}
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
      </Card>
       {(isLoading && !isManualLoading) && (!records || records.length === 0) ? (
        <div className="overflow-hidden rounded-brand border border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-card animate-pulse">
          <div className="h-10 border-b border-gray-200 bg-transparent dark:border-white/10 dark:bg-transparent" />
          <div className="p-4 space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-8 w-full bg-gray-50 dark:bg-muted" />
            ))}
          </div>
        </div>
      ) : error ? (
        <div className="overflow-hidden rounded-brand border border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-card p-6">
          <Empty className="flex h-[320px] flex-col items-center justify-center border-0 text-center text-gray-500 dark:text-zinc-400">
            <EmptyHeader className="flex flex-col items-center gap-0">
              <EmptyMedia className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-card dark:shadow-none">
                <i className="ph-duotone ph-warning-circle text-xl text-pup-maroon dark:text-primary" />
              </EmptyMedia>
              <EmptyTitle className="text-lg font-semibold text-gray-900 dark:text-zinc-50">
                Load failed
              </EmptyTitle>
              <EmptyDescription className="mt-1 max-w-md text-sm font-medium text-gray-600 dark:text-zinc-300">
                {error}
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        </div>
      ) : records ? (
        <div className={cn(
          "flex flex-1 flex-col min-h-0 gap-6 transition-all duration-500",
          (isLoading && !isManualLoading) ? "opacity-40 blur-[1px] grayscale-[0.1]" : "opacity-100"
        )}>
          <div className="flex-1 min-h-0 flex flex-col overflow-hidden rounded-brand border border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-card">
            <div className="flex-1 overflow-visible rounded-[inherit]">
              <table className="min-w-full text-sm">
                <thead className="sticky top-0 z-10 border-b border-gray-200 bg-white dark:bg-card dark:border-white/10">
                  <tr className="text-left text-[12px] font-medium tracking-[0.04em] text-gray-400 dark:text-zinc-500">
                    <th className="w-12 p-4 text-center">
                      <input
                        type="checkbox"
                        className="h-4 w-4 cursor-pointer rounded border border-gray-300 text-pup-maroon dark:text-primary accent-pup-maroon focus:ring-pup-maroon disabled:opacity-20 dark:text-primary dark:border-white/10"
                        checked={
                          paginatedRecords.length > 0 &&
                          paginatedRecords.every((r) => selectedIds.has(r.id))
                        }
                        onChange={(e) => toggleSelectAll(e.target.checked)}
                        disabled={paginatedRecords.length === 0}
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
                                <i className="ph-duotone ph-magnifying-glass text-xl text-gray-300 dark:text-zinc-600"></i>
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
                                onClick={() => {
                                  setLocalSearch("")
                                  setSearchQuery("")
                                  setStatusFilter("All")
                                  setDocTypeFilter("All")
                                  setDateFrom("")
                                  setDateTo("")
                                  setCurrentPage(1)
                                }}
                                className="mt-6 flex h-10 items-center gap-3 rounded-brand border border-gray-300 bg-white px-6 text-xs font-semibold text-gray-600 shadow-sm transition-colors hover:border-gray-300 hover:bg-red-50 hover:text-pup-maroon dark:hover:text-red-500 active:scale-95 tracking-wide dark:bg-card dark:text-zinc-300 dark:shadow-none dark:hover:border-zinc-700 dark:border-white/10"
                              >
                                <i className="ph-bold ph-arrow-counter-clockwise"></i>
                                Clear Search
                              </Button>
                            )}
                          </EmptyHeader>
                        </Empty>
                      </td>
                    </tr>
                  ) : (
                    paginatedRecords.map((r) => {
                      const isSelected = selectedIds.has(r.id)
                      const fortyEightHoursAgo = Date.now() - 48 * 60 * 60 * 1000
                      const isSlaBreached = r.approval_status === "Pending" && new Date(r.created_at).getTime() < fortyEightHoursAgo

                      return (
                        <tr
                          key={r.id}
                          className={cn(
                            "group h-[52px] border-b-[0.5px] border-gray-100 dark:border-white/10 last:border-b-0 transition-all duration-200 hover:bg-gray-50/40 dark:bg-card dark:hover:bg-white/2 select-none cursor-pointer",
                            isSelected && "bg-blue-50/60 dark:bg-blue-950/20",
                            isSlaBreached && !isSelected && "bg-amber-50/30 dark:bg-amber-950/5"
                          )}
                          onClick={(e) => toggleSelectRow(r.id, e)}
                        >
                          <td className="py-0 px-4 align-middle text-center">
                            <input
                              type="checkbox"
                              className={cn(
                                "h-4 w-4 cursor-pointer rounded border border-gray-300 text-pup-maroon dark:text-primary accent-pup-maroon focus:ring-pup-maroon dark:text-primary dark:border-white/10 transition-opacity",
                                isSelected ? "opacity-100" : "opacity-50 group-hover:opacity-80"
                              )}
                              checked={isSelected}
                              onChange={() => {}} // Controlled by tr onClick
                            />
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
                            <span className="inline-flex w-fit items-center justify-center rounded-[4px] bg-gray-100 px-[8px] py-[3px] text-[11px] font-medium text-gray-900 dark:bg-zinc-800 dark:text-zinc-100">
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
                                  "inline-flex w-fit items-center justify-center rounded-[4px] px-[8px] py-[3px] text-[11px] font-medium uppercase tracking-[0.04em] shadow-none transition-all",
                                  getStatusBadge(r.approval_status)
                                )}
                              >
                                {r.approval_status || "Pending"}
                              </span>
                              {isSlaBreached && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div className="flex h-5 w-5 animate-pulse items-center justify-center rounded-full bg-red-100 text-red-600 shadow-sm cursor-help dark:shadow-none">
                                      <i className="ph-bold ph-warning-diamond text-[10px]"></i>
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent side="top" className="bg-red-600 text-white border-red-500">
                                     <p className="text-[10px] font-semibold tracking-tight">SLA Breach Detected</p>
                                     <p className="text-[9px] font-medium opacity-90">Pending for over 48 hours.</p>
                                  </TooltipContent>
                                </Tooltip>
                              )}
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
                                    className="p-0 border-0 bg-transparent text-gray-400 dark:text-zinc-500 transition-colors hover:text-pup-maroon dark:hover:text-zinc-100 focus:outline-none cursor-pointer active:scale-95 flex items-center justify-center"
                                  >
                                    <i className="ph-bold ph-eye text-[16px]"></i>
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent className="bg-zinc-900 text-white border-zinc-800">
                                  <p className="text-[10px] font-semibold">Document Preview</p>
                                  <p className="text-[9px] opacity-80">Open full view of this record</p>
                                </TooltipContent>
                              </Tooltip>

                              {r.approval_status === "Pending" ? (
                                 <>
                                   <Tooltip>
                                     <TooltipTrigger asChild>
                                       <button
                                         onClick={() => handleApprove(r.id)}
                                         className="p-0 border-0 bg-transparent text-gray-400 dark:text-zinc-500 transition-colors hover:text-green-600 dark:hover:text-green-400 focus:outline-none cursor-pointer active:scale-95 flex items-center justify-center"
                                       >
                                         <i className="ph-bold ph-check text-[16px]"></i>
                                       </button>
                                     </TooltipTrigger>
                                                   <TooltipContent className="bg-zinc-900 text-white border-zinc-800">
                                       <p className="text-[10px] font-semibold">Approve Record</p>
                                       <p className="text-[9px] opacity-80">Finalize and verify this submission</p>
                                     </TooltipContent>
                                   </Tooltip>

                                   <Tooltip>
                                   <TooltipTrigger asChild>
                                     <button
                                       onClick={() => onDecline(r.id)}
                                       className="p-0 border-0 bg-transparent text-gray-400 dark:text-zinc-500 transition-colors hover:text-red-600 dark:hover:text-red-400 focus:outline-none cursor-pointer active:scale-95 flex items-center justify-center"
                                     >
                                       <i className="ph-bold ph-x text-[16px]"></i>
                                     </button>
                                   </TooltipTrigger>
                                   <TooltipContent className="bg-zinc-900 text-white border-zinc-800">
                                     <p className="text-[10px] font-semibold">Decline Record</p>
                                     <p className="text-[9px] opacity-80">Flag issues and return for correction</p>
                                   </TooltipContent>
                                 </Tooltip>
                               </>
                             ) : (
                               // Grace Period Logic: Only allow revert within 10 minutes of review
                               (() => {
                                 const reviewedAt = r.reviewed_at ? new Date(r.reviewed_at.replace(" ", "T")).getTime() : 0
                                 const now = Date.now()
                                 const isWithinGracePeriod = now - reviewedAt < 10 * 60 * 1000 // 10 minutes

                                 if (!isWithinGracePeriod) return null

                                 return (
                                   <Tooltip>
                                     <TooltipTrigger asChild>
                                       <button
                                         onClick={() => onSetStatus(r.id, "Pending", "Undo review action")}
                                         className="p-0 border-0 bg-transparent text-gray-400 dark:text-zinc-500 transition-colors hover:text-pup-maroon dark:hover:text-zinc-100 focus:outline-none cursor-pointer active:scale-95 flex items-center justify-center"
                                       >
                                         <i className="ph-bold ph-arrow-counter-clockwise text-[16px]"></i>
                                       </button>
                                     </TooltipTrigger>
                                     <TooltipContent className="bg-zinc-900 text-white border-zinc-800">
                                       <p className="text-[10px] font-semibold">Revert to Pending</p>
                                       <p className="text-[9px] opacity-80">Undo the previous review decision</p>
                                     </TooltipContent>
                                   </Tooltip>
                                 )
                               })()
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

            {sortedRecords.length > 0 && (
              <div className="flex items-center justify-between border-t border-gray-100 bg-white p-6 px-8 dark:border-white/10 dark:bg-card">
                <div className="flex items-center gap-8">
                  <div className="flex items-center gap-6 text-[12px] font-normal text-gray-400 dark:text-zinc-500">
                    <span>
                      Showing {paginatedRecords.length} of {sortedRecords.length}
                    </span>
                    <div className="flex items-center gap-3 border-l border-gray-200 pl-6 dark:border-white/10">
                      <span className="text-[12px] text-gray-400 dark:text-zinc-500">Rows:</span>
                      <select
                        className="h-8 w-16 cursor-pointer rounded-[6px] border border-gray-200 bg-white px-2 text-[12px] font-normal text-gray-700 focus:outline-none transition-all hover:bg-gray-50 dark:border-white/10 dark:bg-card dark:text-zinc-200 dark:hover:bg-white/10"
                        value={itemsPerPage}
                        onChange={(e) => {
                          setItemsPerPage(Number(e.target.value))
                          setCurrentPage(1)
                        }}
                      >
                        <option value={10}>10</option>
                        <option value={20}>20</option>
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-3">
                  <button
                    disabled={displayPage <= 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="h-8 bg-transparent text-[12px] font-normal text-gray-400 hover:text-pup-maroon dark:text-zinc-500 dark:hover:text-zinc-200 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer border-0 p-0"
                  >
                    Prev
                  </button>

                  <div className="flex h-8 min-w-[32px] items-center justify-center rounded-[6px] border border-gray-200/80 bg-white px-2.5 text-[12px] font-medium text-gray-900 dark:border-white/10 dark:bg-card dark:text-zinc-100">
                    {displayPage}
                  </div>

                  <button
                    disabled={displayPage >= totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    className="h-8 bg-transparent text-[12px] font-normal text-gray-400 hover:text-pup-maroon dark:text-zinc-500 dark:hover:text-zinc-200 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer border-0 p-0"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : null}

      {/* Floating Bulk Action Bar */}
      {selectedIds.size > 1 && (
        (() => {
          const selectedRecords = paginatedRecords.filter((r) => selectedIds.has(r.id))
          const allPending = selectedRecords.every((r) => r.approval_status === "Pending")

          if (allPending) {
            return (
              <FloatingActionBar
                selectedCount={selectedIds.size}
                selectionStatus="Selected Records"
                onCancel={() => setSelectedIds(new Set())}
                customContent={
                  <div className="flex items-center gap-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedIds(new Set())}
                      className="h-9 rounded-[8px] px-4 text-[13px] font-medium tracking-[-0.01em] text-gray-500 hover:bg-gray-50 dark:text-zinc-400 dark:hover:bg-white/5"
                    >
                      Deselect All
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleBulkApprove}
                      className="h-9 btn-brand-green !rounded-[8px] px-4 text-[13px] font-medium tracking-[-0.01em] active:scale-95 transition-all shadow-none text-white hover:text-white"
                    >
                      <i className="ph-bold ph-check mr-2"></i>
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleBulkDecline}
                      className="h-9 btn-brand-red !rounded-[8px] px-4 text-[13px] font-medium tracking-[-0.01em] active:scale-95 transition-all shadow-none text-white hover:text-white"
                    >
                      <i className="ph-bold ph-x mr-2"></i>
                      Decline
                    </Button>
                  </div>
                }
              />
            )
          }

          return (
            <FloatingActionBar
              selectedCount={selectedIds.size}
              onCancel={() => setSelectedIds(new Set())}
              customContent={
                <div className="flex items-center gap-3">
                  <span className="text-[12px] font-medium text-amber-700 bg-amber-50 px-3 py-1.5 rounded-[8px] border border-amber-200 dark:bg-amber-950/20 dark:text-amber-500/90 dark:border-amber-900/50">
                    <i className="ph-fill ph-warning-circle mr-1.5"></i>
                    Contains reviewed records. Bulk actions disabled.
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedIds(new Set())}
                    className="h-9 rounded-[8px] px-4 text-[13px] font-medium tracking-[-0.01em] text-gray-500 hover:bg-gray-50 dark:text-zinc-400 dark:hover:bg-white/5"
                  >
                    Deselect All
                  </Button>
                </div>
              }
            />
          )
        })()
      )}
    </div>
    </TooltipProvider>
  )
}
