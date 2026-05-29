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
  if (sortBy !== column)
    return <i className="ph-bold ph-caret-up-down ml-1 opacity-30 text-[10px]"></i>
  return sortOrder === "ASC" ? (
    <i className="ph-bold ph-caret-up ml-1 text-pup-maroon dark:text-primary text-[10px] dark:text-primary"></i>
  ) : (
    <i className="ph-bold ph-caret-down ml-1 text-pup-maroon dark:text-primary text-[10px] dark:text-primary"></i>
  )
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
      const headers = ["Record ID", "Student No.", "Student Name", "Document Type", "Filename", "Status", "Reviewed By", "Reviewed At", "Uploaded At"]
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

  return (
    <div className="animate-fade-up font-inter flex h-auto w-full flex-col gap-6">
      {/* Color Stat Cards / Skeletons at the Top */}
      {isLoading && !records ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 animate-pulse">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28 rounded-brand bg-gray-100 dark:bg-muted" />
          ))}
        </div>
      ) : !error ? (
        <div className={cn(
          "grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 transition-all duration-500",
          isLoading ? "opacity-40 blur-[1px] grayscale-[0.1]" : "opacity-100"
        )}>
          <div className="group relative overflow-hidden rounded-brand border border-blue-950 bg-linear-to-br from-blue-800 to-blue-950 p-5 shadow-sm transition-all hover:shadow-md dark:shadow-none">
              <i className="ph-duotone ph-clock-countdown pointer-events-none absolute -right-3 -bottom-3 rotate-12 text-[60px] text-white opacity-10" />
              <div className="relative z-10">
                <div className="flex items-center justify-between">
                  <p className="mb-1 text-[10px] font-black tracking-widest text-blue-200 uppercase">
                    Pending Review
                  </p>
                  {stats.hasSlaBreach && !isLoading && (
                    <div className="flex items-center gap-1.5">
                       <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                       </span>
                       <TooltipProvider>
                          <Tooltip delayDuration={300}>
                            <TooltipTrigger asChild>
                               <Badge className="bg-red-500 text-white border-0 text-[8px] font-black px-1.5 py-0 h-4 uppercase tracking-tighter cursor-help">
                                  SLA Warning
                               </Badge>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="bg-red-600 text-white border-red-500 max-w-[200px]">
                               <p className="font-bold text-xs uppercase tracking-tight">SLA Breach Detected</p>
                               <p className="text-[10px] font-medium opacity-90 leading-tight mt-0.5">
                                  {stats.slaBreachCount} {stats.slaBreachCount === 1 ? "record has" : "records have"} been pending for more than 48 hours.
                               </p>
                            </TooltipContent>
                          </Tooltip>
                       </TooltipProvider>
                    </div>
                  )}
                </div>
                <h3 className="text-3xl font-black text-white">
                  {stats.pending.toLocaleString()}
                </h3>
                <p className="mt-0.5 text-[10px] font-medium text-blue-200/80">
                  Waiting to be checked
                </p>
              </div>
            </div>

            <div className="group relative overflow-hidden rounded-brand border border-emerald-950 bg-linear-to-br from-emerald-800 to-emerald-950 p-5 shadow-sm transition-all hover:shadow-md dark:shadow-none">
              <i className="ph-duotone ph-check-circle pointer-events-none absolute -right-3 -bottom-3 rotate-12 text-[60px] text-white opacity-10" />
              <div className="relative z-10">
                <p className="mb-1 text-[10px] font-black tracking-widest text-emerald-100 uppercase">
                  Approved Today
                </p>
                <h3 className="text-3xl font-black text-white">
                  {stats.approvedToday.toLocaleString()}
                </h3>
                <p className="mt-0.5 text-[10px] font-medium text-emerald-100/80">
                  Verified correct ({stats.totalApproved.toLocaleString()} total)
                </p>
              </div>
            </div>

            <div className="group relative overflow-hidden rounded-brand border border-red-950 bg-linear-to-br from-red-700 to-red-950 p-5 shadow-sm transition-all hover:shadow-md dark:shadow-none">
              <i className="ph-duotone ph-x-circle pointer-events-none absolute -right-3 -bottom-3 rotate-12 text-[60px] text-white opacity-10" />
              <div className="relative z-10">
                <p className="mb-1 text-[10px] font-black tracking-widest text-red-200 uppercase">
                  Returned Today
                </p>
                <h3 className="text-3xl font-black text-white">
                  {stats.declinedToday.toLocaleString()}
                </h3>
                <p className="mt-0.5 text-[10px] font-medium text-red-200/80">
                  Found with errors ({stats.totalDeclined.toLocaleString()} total)
                </p>
              </div>
            </div>
          </div>
        ) : null}

      <Card className="flex h-auto w-full flex-col rounded-brand border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-card dark:shadow-none">
        <PageHeader
          icon="ph-seal-check"
          title="Digital Records Review"
          description="Verify student record submissions."
          actions={
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportCSV}
                disabled={isLoading || isExporting}
                className="flex h-11 w-32 items-center justify-center gap-1.5 rounded-brand border border-gray-300 bg-white text-[10px] font-bold text-gray-600 shadow-sm transition-colors hover:border-pup-maroon hover:bg-red-50 hover:text-pup-maroon dark:hover:text-red-500 active:scale-95 disabled:opacity-50 dark:bg-card dark:text-zinc-300 dark:shadow-none dark:border-white/10"
              >
                <i className={`ph-bold ${isExporting ? "ph-circle-notch animate-spin" : "ph-file-csv"} text-base`}></i>
                {isExporting ? "PREPARING..." : "EXPORT"}
              </Button>

              <div className="ml-2 flex items-center gap-3 border-l border-gray-200 pl-4 dark:border-white/10">
                <div className="flex flex-col items-end gap-1">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest dark:text-zinc-500">Dataset Sync</p>
                  <p className="text-[10px] font-medium text-gray-500 whitespace-nowrap dark:text-zinc-400">
                    {hasActiveFilters ? "Filtering live records..." : "Showing cumulative data"}
                  </p>
                </div>
                <RefreshButton 
                  onRefresh={onRefresh} 
                  isLoading={isManualLoading} 
                  title="Refresh Review Data"
                />
              </div>
            </div>
          }
        />

        {/* Active Filter Chips Row */}
        {(localSearch !== "" || statusFilter !== "All" || docTypeFilter !== "All" || dateFrom || dateTo) && (
          <div className="flex-none border-b border-gray-100 bg-white px-4 py-3 animate-in fade-in slide-in-from-top-1 duration-300 dark:border-white/10 dark:bg-card">
            <div className="flex flex-wrap items-center gap-2">
              <span className="mr-1 text-[10px] font-bold tracking-widest text-gray-400 uppercase dark:text-zinc-500">Active Filters:</span>
              {localSearch && (
                <div className="flex items-center gap-1 rounded-full border border-gray-300 bg-pup-maroon/10 px-2.5 py-1 text-[10px] font-bold text-pup-maroon dark:text-primary uppercase dark:border-white/10 dark:text-primary">
                  Search: {localSearch}
                  <button
                    onClick={() => { setSearchQuery(""); setLocalSearch(""); setCurrentPage(1); }}
                    className="ml-1 hover:text-pup-darkMaroon transition-colors"
                  >
                    <i className="ph-bold ph-x text-[8px]"></i>
                  </button>
                </div>
              )}
              {statusFilter !== "All" && (
                <div className="flex items-center gap-1 rounded-full border border-blue-100/30 bg-blue-50 px-2.5 py-1 text-[10px] font-bold text-blue-600 uppercase dark:bg-blue-950/30 dark:text-blue-400">
                  Status: {statusFilter}
                  <button
                    onClick={() => { setStatusFilter("All"); setCurrentPage(1); }}
                    className="ml-1 hover:text-blue-800 transition-colors"
                  >
                    <i className="ph-bold ph-x text-[8px]"></i>
                  </button>
                </div>
              )}
              {docTypeFilter !== "All" && (
                <div className="flex items-center gap-1 rounded-full border border-amber-100/30 bg-amber-50 px-2.5 py-1 text-[10px] font-bold text-amber-600 uppercase dark:bg-amber-950/30 dark:text-amber-400">
                  Type: {docTypeFilter}
                  <button
                    onClick={() => { setDocTypeFilter("All"); setCurrentPage(1); }}
                    className="ml-1 hover:text-amber-800 transition-colors"
                  >
                    <i className="ph-bold ph-x text-[8px]"></i>
                  </button>
                </div>
              )}
              {(dateFrom || dateTo) && (
                <div className="flex items-center gap-1 rounded-full border border-emerald-100/30 bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-600 uppercase dark:bg-emerald-950/30 dark:text-emerald-400">
                  Range: {dateFrom || "..."} to {dateTo || "..."}
                  <button
                    onClick={() => { setDateFrom(""); setDateTo(""); setCurrentPage(1); }}
                    className="ml-1 hover:text-emerald-800 transition-colors"
                  >
                    <i className="ph-bold ph-x text-[8px]"></i>
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
                className="h-6 rounded-full border-2 border-dashed border-gray-300 px-3 text-[10px] font-black text-pup-maroon dark:text-primary transition-colors hover:border-pup-darkMaroon hover:bg-red-50 hover:text-pup-maroon uppercase dark:border-white/10 dark:text-primary dark:bg-red-950/30"
              >
                CLEAR ALL FILTERS
              </Button>
            </div>
          </div>
        )}

        {/* Filter Bar */}
        <div className="bg-white border-t border-gray-100 p-4 backdrop-blur-md dark:bg-card/50 dark:border-white/10">
          <div className="flex w-full flex-wrap items-end gap-5">
            {/* Search */}
            <div className="flex-[2] min-w-[280px]">
              <div className="mb-1.5 flex items-center justify-between">
                <label className="text-[10px] font-black tracking-widest text-gray-400 uppercase dark:text-zinc-500">
                  Global Search
                </label>
                <span className="text-[9px] font-bold text-pup-maroon dark:text-primary/50">
                  {sortedRecords.length > 0 ? `${sortedRecords.length.toLocaleString()} MATCHES` : "NO RESULTS"}
                </span>
              </div>
              <div className="group relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
                  <i className="ph-bold ph-magnifying-glass text-gray-400 transition-colors group-focus-within:text-pup-maroon dark:text-zinc-500"></i>
                </div>
                <Input
                  type="text"
                  placeholder="Student, doc type, filename..."
                  className="h-11 w-full rounded-brand border border-gray-200 bg-white pl-10.5 text-sm font-medium transition-all focus:border-pup-maroon/30 focus:ring-4 focus:ring-pup-maroon/5 placeholder:text-gray-400 dark:border-white/10 dark:bg-card dark:text-zinc-300 dark:focus:border-primary"
                  value={localSearch}
                  onChange={(e) => setLocalSearch(e.target.value)}
                />
              </div>
            </div>

            {/* Status Select */}
            <div className="flex-1 min-w-[128px]">
              <label className="mb-1.5 block text-[10px] font-black tracking-widest text-gray-400 uppercase dark:text-zinc-500">
                Status
              </label>
              <Select
                value={statusFilter}
                onChange={(e) => { 
                  setStatusFilter(e.target.value); 
                  setCurrentPage(1);
                }}
              >
                <option value="All">All</option>
                <option value="Pending">Pending</option>
                <option value="Approved">Approved</option>
                <option value="Declined">Declined</option>
              </Select>
            </div>

            {/* Doc Type Select */}
            <div className="flex-[1.5] min-w-[200px]">
              <label className="mb-1.5 block text-[10px] font-black tracking-widest text-gray-400 uppercase dark:text-zinc-500">
                Doc Type
              </label>
              <Select
                value={docTypeFilter}
                onChange={(e) => { 
                  setDocTypeFilter(e.target.value); 
                  setCurrentPage(1);
                }}
              >
                <option value="All">All</option>
                {activeDocTypes.map((docTypeName) => (
                  <option key={docTypeName} value={docTypeName}>{docTypeName}</option>
                ))}
              </Select>
            </div>

            {/* Date Range Picker Section */}
            <div className="min-w-[320px] flex-1">
              <div className="mb-1.5 flex items-center justify-between">
                <label className="text-[10px] font-black tracking-widest text-gray-400 uppercase dark:text-zinc-500">
                  Time Period
                </label>
                <div className="flex items-center gap-2">
                  {["today", "yesterday", "last7", "last30"].map((range) => (
                    <button
                      key={range}
                      onClick={() => {
                        const end = new Date()
                        let start = new Date()
                        switch (range) {
                          case "today":
                            start.setHours(0, 0, 0, 0)
                            break
                          case "yesterday":
                            start.setDate(start.getDate() - 1)
                            start.setHours(0, 0, 0, 0)
                            end.setDate(end.getDate() - 1)
                            end.setHours(23, 59, 59, 999)
                            break
                          case "last7":
                            start.setDate(start.getDate() - 7)
                            start.setHours(0, 0, 0, 0)
                            break
                          case "last30":
                            start.setDate(start.getDate() - 30)
                            start.setHours(0, 0, 0, 0)
                            break
                        }
                        setDateFrom(format(start, "yyyy-MM-dd"))
                        setDateTo(format(end, "yyyy-MM-dd"))
                        setCurrentPage(1)
                      }}
                      className="rounded-md bg-gray-100 px-2 py-0.5 text-[9px] font-black text-gray-500 uppercase transition-all hover:bg-pup-maroon hover:text-white dark:text-zinc-400 dark:bg-muted"
                    >
                      {range.replace("last", "Last ")}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "h-11 w-full justify-start rounded-brand border-gray-200 dark:border-white/10 bg-white dark:bg-card text-left text-xs font-semibold shadow-xs transition-all hover:bg-gray-50 dark:hover:bg-white/10 dark:bg-card",
                          !dateFrom && "text-gray-400 dark:text-zinc-500"
                        )}
                      >
                        <i className="ph-bold ph-calendar-blank mr-2 text-base text-gray-400 dark:text-zinc-500"></i>
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
                <div className="flex items-center text-gray-300 dark:text-zinc-600">
                   <i className="ph-bold ph-arrow-right"></i>
                </div>
                <div className="flex-1">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "h-11 w-full justify-start rounded-brand border-gray-200 dark:border-white/10 bg-white dark:bg-card text-left text-xs font-semibold shadow-xs transition-all hover:bg-gray-50 dark:hover:bg-white/10 dark:bg-card",
                          !dateTo && "text-gray-400 dark:text-zinc-500"
                        )}
                      >
                        <i className="ph-bold ph-calendar-blank mr-2 text-base text-gray-400 dark:text-zinc-500"></i>
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
        </div>
      </Card>
       {isLoading && (!records || records.length === 0) ? (
        <div className="overflow-hidden rounded-brand border border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-card animate-pulse">
          <div className="h-10 border-b border-gray-200 bg-gray-50 dark:border-white/10 dark:bg-white/5" />
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
                <i className="ph-duotone ph-warning-circle text-3xl text-pup-maroon dark:text-primary" />
              </EmptyMedia>
              <EmptyTitle className="text-lg font-bold text-gray-900 dark:text-zinc-50">
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
          "flex flex-1 flex-col gap-6 transition-all duration-500",
          isLoading ? "opacity-40 blur-[1px] grayscale-[0.1]" : "opacity-100"
        )}>
          <div className="overflow-hidden rounded-brand border border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-card">
            <div className="overflow-x-auto rounded-[inherit]">
              <table className="min-w-full text-sm">
                <thead className="sticky top-0 z-10 border-b border-gray-200 bg-gray-50 backdrop-blur-sm dark:border-white/10 dark:bg-muted">
                  <tr className="text-left text-[10px] font-black tracking-widest text-gray-600 uppercase dark:text-zinc-300">
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
                        className="group flex items-center transition-colors hover:text-pup-maroon dark:hover:text-red-500 focus:outline-none"
                      >
                        STUDENT NAME{" "}
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
                        className="group flex items-center transition-colors hover:text-pup-maroon dark:hover:text-red-500 focus:outline-none"
                      >
                        DOCUMENT TYPE{" "}
                        <SortIndicator
                          column="doc_type"
                          sortBy={sortBy}
                          sortOrder={sortOrder}
                        />
                      </button>
                    </th>
                    <th className="p-4">SOURCE FILENAME</th>
                    <th className="p-4">
                      <button
                        onClick={() => handleSort("approval_status")}
                        className="group flex items-center transition-colors hover:text-pup-maroon dark:hover:text-red-500 focus:outline-none"
                      >
                        STATUS{" "}
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
                        className="group flex items-center transition-colors hover:text-pup-maroon dark:hover:text-red-500 focus:outline-none"
                      >
                        UPLOAD DATE{" "}
                        <SortIndicator
                          column="created_at"
                          sortBy={sortBy}
                          sortOrder={sortOrder}
                        />
                      </button>
                    </th>
                    <th className="p-4 text-right">ACTIONS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-white/10">
                  {sortedRecords.length === 0 ? (
                    <tr className="border-0 hover:bg-transparent">
                      <td colSpan={7} className="border-0 p-0">
                        <Empty className="flex h-[450px] flex-col items-center justify-center border-0 bg-transparent text-center">
                          <EmptyHeader className="flex flex-col items-center gap-0">
                            <div className="relative mb-6">
                              <div className="absolute inset-0 scale-150 animate-pulse rounded-full bg-gray-50 opacity-50 dark:bg-card"></div>
                              <EmptyMedia className="relative z-10 flex h-24 w-24 items-center justify-center rounded-3xl border border-gray-100 bg-white shadow-xl rotate-3 dark:border-white/10 dark:bg-card dark:shadow-none">
                                <i className="ph-duotone ph-magnifying-glass text-5xl text-gray-300 dark:text-zinc-600"></i>
                              </EmptyMedia>
                            </div>
                            <EmptyTitle className="text-xl font-black text-gray-900 dark:text-zinc-50">
                              {hasActiveFilters ? "No records found" : "No records yet"}
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
                                className="mt-6 flex h-10 items-center gap-3 rounded-brand border border-gray-300 bg-white px-6 text-xs font-bold text-gray-600 shadow-sm transition-colors hover:border-gray-300 hover:bg-red-50 hover:text-pup-maroon dark:hover:text-red-500 active:scale-95 uppercase tracking-wide dark:bg-card dark:text-zinc-300 dark:shadow-none dark:hover:border-zinc-700 dark:border-white/10"
                              >
                                <i className="ph-bold ph-arrow-counter-clockwise"></i>
                                CLEAR SEARCH
                              </Button>
                            )}
                          </EmptyHeader>
                        </Empty>
                      </td>
                    </tr>
                  ) : (
                    paginatedRecords.map((r) => {
                      const uploaded = formatPHDateTimeParts(r.created_at)
                      const isSelected = selectedIds.has(r.id)
                      const fortyEightHoursAgo = Date.now() - 48 * 60 * 60 * 1000
                      const isSlaBreached = r.approval_status === "Pending" && new Date(r.created_at).getTime() < fortyEightHoursAgo

                      return (
                        <tr
                          key={r.id}
                          className={cn(
                            "group transition-all duration-200 hover:bg-gray-50/80 dark:bg-card dark:hover:bg-white/5 select-none cursor-pointer",
                            isSelected && "bg-amber-50 dark:bg-amber-950/40",
                            isSlaBreached && !isSelected && "bg-amber-50 dark:bg-amber-950/10"
                          )}
                          onClick={(e) => toggleSelectRow(r.id, e)}
                        >
                          <td className="p-4 text-center">
                            <input
                              type="checkbox"
                              className="h-4 w-4 cursor-pointer rounded border border-gray-300 text-pup-maroon dark:text-primary accent-pup-maroon focus:ring-pup-maroon dark:text-primary dark:border-white/10"
                              checked={isSelected}
                              onChange={() => {}} // Controlled by tr onClick
                            />
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-brand bg-gray-100 text-xs font-black text-gray-500 shadow-xs dark:bg-white/5 dark:text-zinc-500 group-hover:bg-white dark:group-hover:bg-zinc-800 group-hover:text-pup-maroon dark:group-hover:text-primary group-hover:shadow-sm transition-all">
                                {(r.student_name || "U").substring(0, 2).toUpperCase()}
                              </div>
                              <div className="flex flex-col overflow-hidden">
                                <span className="truncate text-xs font-bold text-gray-900 leading-tight dark:text-zinc-50">
                                  {r.student_name || "Unknown"}
                                </span>
                                <span className="truncate text-[10px] font-medium text-gray-500 dark:text-zinc-400 mt-0.5">
                                  {r.student_no}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="flex w-fit items-center gap-1.5 rounded-full border border-red-100 bg-red-50 px-2.5 py-1 text-[9px] font-black text-pup-maroon tracking-wider uppercase dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400">
                              <i className="ph-bold ph-file-text text-[10px]"></i>
                              {r.doc_type}
                            </div>
                          </td>
                          <td className="p-4">
                            <span
                              className="block max-w-[180px] truncate text-xs font-medium text-gray-600 dark:text-zinc-300"
                              title={r.original_filename}
                            >
                              {r.original_filename}
                            </span>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <div
                                className={cn(
                                  "flex w-fit items-center gap-1.5 rounded-full border px-2.5 py-1 text-[9px] font-black uppercase tracking-wider shadow-xs transition-all",
                                  getStatusBadge(r.approval_status)
                                )}
                              >
                                <i
                                  className={`ph-fill ${getStatusIcon(r.approval_status)} text-[10px]`}
                                ></i>
                                {r.approval_status || "Pending"}
                              </div>
                              {isSlaBreached && (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <div className="flex h-5 w-5 animate-pulse items-center justify-center rounded-full bg-red-100 text-red-600 shadow-sm cursor-help dark:shadow-none">
                                        <i className="ph-bold ph-warning-diamond text-[10px]"></i>
                                      </div>
                                    </TooltipTrigger>
                                    <TooltipContent side="top" className="bg-red-600 text-white border-red-500">
                                       <p className="text-[10px] font-bold uppercase tracking-tight">SLA Breach Detected</p>
                                       <p className="text-[9px] font-medium opacity-90">Pending for over 48 hours.</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              )}
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="flex flex-col">
                              <span className="text-xs font-bold text-gray-900 dark:text-zinc-50">
                                {uploaded.date}
                              </span>
                              <span className="text-[10px] font-medium text-gray-500 dark:text-zinc-400">
                                {uploaded.time}
                              </span>
                            </div>
                          </td>
                          <td className="p-4 text-right">
                            <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() => handlePreview(r)}
                                className="h-9 w-9 rounded-brand border-gray-200 bg-white p-0 text-gray-400 shadow-sm transition-all hover:border-gray-300 hover:bg-gray-50 hover:text-pup-maroon dark:hover:text-red-500 dark:bg-white/5 dark:border-white/10 dark:text-zinc-500 dark:hover:text-primary dark:hover:bg-zinc-800 cursor-pointer active:scale-95"
                              >
                                <i className="ph-bold ph-eye text-lg"></i>
                              </Button>
                              {r.approval_status === "Pending" ? (
                                 <>
                                   <Button
                                     variant="outline"
                                     size="icon"
                                     onClick={() => handleApprove(r.id)}
                                     className="h-9 w-9 rounded-brand border-gray-200 bg-white p-0 text-emerald-600 shadow-sm transition-all hover:border-emerald-600 hover:bg-emerald-50 dark:bg-white/5 dark:border-white/10 dark:text-emerald-400 dark:hover:bg-emerald-900/20 cursor-pointer active:scale-95"
                                     title="Approve Record"
                                   >
                                     <i className="ph-bold ph-check text-lg"></i>
                                   </Button>

                                   <Button
                                     variant="outline"
                                     size="icon"
                                     onClick={() => onDecline(r.id)}
                                     className="h-9 w-9 rounded-brand border-gray-200 bg-white p-0 text-red-400 shadow-sm transition-all hover:border-red-600 hover:bg-red-50 dark:bg-white/5 dark:border-white/10 dark:text-red-400/90 dark:hover:bg-red-400/10 cursor-pointer active:scale-95"
                                     title="Decline Record"
                                   >
                                     <i className="ph-bold ph-x text-lg"></i>
                                   </Button>
                                 </>
                               ) : (
                                 // Grace Period Logic: Only allow revert within 10 minutes of review
                                 (() => {
                                   const reviewedAt = r.reviewed_at ? new Date(r.reviewed_at.replace(" ", "T")).getTime() : 0
                                   const now = Date.now()
                                   const isWithinGracePeriod = now - reviewedAt < 10 * 60 * 1000 // 10 minutes

                                   if (!isWithinGracePeriod) return null

                                   return (
                                     <Button
                                       variant="outline"
                                       size="icon"
                                       onClick={() => onSetStatus(r.id, "Pending", "Undo review action")}
                                       className="h-9 w-9 rounded-brand border-gray-200 bg-white p-0 text-amber-600 shadow-sm transition-all hover:border-amber-600 hover:bg-amber-50 dark:bg-white/5 dark:border-white/10 dark:text-amber-500 dark:hover:bg-amber-900/20 cursor-pointer active:scale-95"
                                       title="Revert to Pending"
                                     >
                                       <i className="ph-bold ph-arrow-counter-clockwise text-lg"></i>
                                     </Button>
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
                  <div className="flex items-center gap-6 text-[11px] font-black text-gray-400 uppercase tracking-widest dark:text-zinc-500">
                    <span>
                      SHOWING <strong className="text-gray-900 dark:text-zinc-50">{paginatedRecords.length}</strong> OUT OF <strong className="text-gray-900 dark:text-zinc-50">{sortedRecords.length}</strong> ENTRIES
                    </span>
                    <div className="flex items-center gap-3 border-l border-gray-200 pl-6 dark:border-white/10">
                      <span className="text-[10px] opacity-60">ROWS:</span>
                      <Select
                        className="h-8 w-16 cursor-pointer rounded-brand border border-gray-200 bg-white px-2 text-[10px] font-black text-gray-700 shadow-xs focus:ring-1 focus:ring-pup-maroon focus:outline-none transition-all hover:bg-gray-50 dark:border-white/10 dark:bg-card dark:text-zinc-200 dark:hover:bg-white/10"
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
                      </Select>
                    </div>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={displayPage <= 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="h-10 rounded-brand border-gray-200 bg-white px-5 text-[10px] font-black tracking-widest text-gray-500 uppercase shadow-sm transition-all hover:border-pup-maroon hover:text-pup-maroon dark:hover:text-red-500 active:scale-95 disabled:opacity-20 dark:border-white/10 dark:bg-card dark:text-zinc-400 dark:shadow-none"
                  >
                    <i className="ph-bold ph-caret-left mr-2 text-base"></i>
                    PREV
                  </Button>

                  <div className="flex h-9 min-w-[48px] items-center justify-center rounded-brand border border-gray-200 bg-white px-3 text-[11px] font-black text-gray-900 shadow-sm dark:border-white/10 dark:bg-card dark:text-zinc-50 dark:shadow-none">
                    {displayPage}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    disabled={displayPage >= totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    className="h-10 rounded-brand border-gray-200 bg-white px-5 text-[10px] font-black tracking-widest text-gray-500 uppercase shadow-sm transition-all hover:border-pup-maroon hover:text-pup-maroon dark:hover:text-red-500 active:scale-95 disabled:opacity-20 dark:border-white/10 dark:bg-card dark:text-zinc-400 dark:shadow-none"
                  >
                    NEXT
                    <i className="ph-bold ph-caret-right mr-2 text-base"></i>
                  </Button>
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
                      className="h-9 rounded-full px-4 text-xs font-bold text-gray-500 hover:bg-gray-100 active:scale-95 dark:text-zinc-400 dark:bg-muted dark:hover:bg-white/10"
                    >
                      DESELECT ALL
                    </Button>
                    <div className="h-4 w-[1px] bg-gray-200 dark:bg-white/10 mx-1" />
                    <Button
                      size="sm"
                      onClick={handleBulkApprove}
                      className="h-9 rounded-full bg-green-600 px-4 text-xs font-bold text-white shadow-sm hover:bg-green-700 active:scale-95 dark:shadow-none"
                    >
                      <i className="ph-bold ph-check mr-2"></i>
                      APPROVE
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={handleBulkDecline}
                      className="h-9 rounded-full bg-linear-to-b from-red-600 to-red-800 border-4 border-red-900 hover:from-red-500 hover:to-red-700 hover:shadow-md transition-all px-4 text-xs font-bold text-white shadow-sm active:scale-95 dark:shadow-none"
                    >
                      <i className="ph-bold ph-x mr-2"></i>
                      DECLINE
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
                  <span className="text-xs font-medium text-amber-700 bg-amber-50 px-3 py-1.5 rounded-full border border-amber-200 dark:bg-amber-950/30 dark:text-amber-500/90 dark:border-amber-900/50">
                    <i className="ph-fill ph-warning-circle mr-1.5"></i>
                    Contains reviewed records. Bulk actions disabled.
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedIds(new Set())}
                    className="h-9 rounded-full px-4 text-xs font-bold text-gray-500 hover:bg-gray-100 active:scale-95 dark:text-zinc-400 dark:bg-muted dark:hover:bg-white/10"
                  >
                    DESELECT ALL
                  </Button>
                </div>
              }
            />
          )
        })()
      )}
    </div>
  )
}
