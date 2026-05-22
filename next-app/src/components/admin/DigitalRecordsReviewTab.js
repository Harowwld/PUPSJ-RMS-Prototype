"use client"

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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

import PageHeader from "@/components/shared/PageHeader"
import FloatingActionBar from "@/components/shared/FloatingActionBar"

function SortIndicator({ column, sortBy, sortOrder }) {
  if (sortBy !== column)
    return <i className="ph-bold ph-caret-up-down ml-1 opacity-30 text-[10px]"></i>
  return sortOrder === "ASC" ? (
    <i className="ph-bold ph-caret-up ml-1 text-pup-maroon text-[10px]"></i>
  ) : (
    <i className="ph-bold ph-caret-down ml-1 text-pup-maroon text-[10px]"></i>
  )
}

export default function DigitalRecordsReviewTab({
  records,
  isLoading,
  error = null,
  statusFilter,
  setStatusFilter,
  onRefresh,
  onApprove,
  onDecline,
  onBulkApprove,
  onBulkDecline,
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
    const baseFiltered = records.filter((r) => {
      if (docTypeFilter !== "All" && r.doc_type !== docTypeFilter) return false
      if (dateFrom) {
        const created = r.created_at ? r.created_at.split("T")[0] : ""
        if (created < dateFrom) return false
      }
      if (dateTo) {
        const created = r.created_at ? r.created_at.split("T")[0] : ""
        if (created > dateTo) return false
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
  }

  const toggleSelectRow = (id) => {
    const next = new Set(selectedIds)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelectedIds(next)
  }

  const handleBulkApprove = () => {
    if (onBulkApprove) {
      onBulkApprove(Array.from(selectedIds))
      setSelectedIds(new Set())
    }
  }

  const handleBulkDecline = () => {
    if (onBulkDecline) {
      onBulkDecline(Array.from(selectedIds))
      setSelectedIds(new Set())
    }
  }

  const getStatusBadge = (status) => {
    const styles = {
      Pending: "bg-amber-50 text-amber-700 border-amber-200",
      Approved: "bg-green-50 text-green-700 border-green-200",
      Declined: "bg-red-50 text-red-700 border-red-200",
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

    const pending = records.filter((r) => r.approval_status === "Pending").length
    const approvedToday = records.filter(
      (r) =>
        r.approval_status === "Approved" && r.reviewed_at?.startsWith(today)
    ).length
    const declinedToday = records.filter(
      (r) =>
        r.approval_status === "Declined" && r.reviewed_at?.startsWith(today)
    ).length

    const slaBreachRecords = records.filter(
      (r) =>
        r.approval_status === "Pending" &&
        new Date(r.created_at).getTime() < fortyEightHoursAgo
    )

    const reviewedRecords = records.filter(
      (r) => r.reviewed_at && r.created_at && r.approval_status !== "Pending"
    )
    let avgSlaHours = 0
    if (reviewedRecords.length > 0) {
      const totalSlaMs = reviewedRecords.reduce((acc, r) => {
        const created = new Date(r.created_at).getTime()
        const reviewed = new Date(r.reviewed_at).getTime()
        return acc + (reviewed - created)
      }, 0)
      avgSlaHours = totalSlaMs / reviewedRecords.length / (1000 * 60 * 60)
    }

    return {
      pending,
      approvedToday,
      declinedToday,
      avgSlaHours: avgSlaHours.toFixed(1),
      hasSlaBreach: slaBreachRecords.length > 0,
      slaBreachCount: slaBreachRecords.length,
    }
  }, [records])

  return (
    <div className="animate-fade-in font-inter flex h-full w-full flex-col gap-4">
      {/* Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Pending Card */}
        <div className="group relative overflow-hidden rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-all hover:border-amber-500/30">
          <i className="ph-duotone ph-clock-countdown absolute -right-3 -bottom-3 rotate-12 text-6xl text-amber-500 opacity-5 transition-transform group-hover:scale-110" />
          <div className="relative z-10">
            <div className="flex items-center justify-between">
              <p className="mb-1 text-[10px] font-black tracking-widest text-gray-400 uppercase">
                Pending Reviews
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
                           <Badge className="bg-red-50 text-red-700 border-red-100 text-[8px] font-black px-1.5 py-0 h-4 uppercase tracking-tighter cursor-help">
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
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <h3
                className={`text-2xl font-black tracking-tight ${stats.pending > 10 ? "text-amber-600" : "text-gray-900"}`}
              >
                {stats.pending.toLocaleString()}
              </h3>
            )}
            <p className="mt-0.5 text-[10px] font-medium text-gray-500">
              Documents awaiting decision
            </p>
          </div>
        </div>

        {/* Approved Today */}
        <div className="group relative overflow-hidden rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-all hover:border-green-500/30">
          <i className="ph-duotone ph-check-circle absolute -right-3 -bottom-3 rotate-12 text-6xl text-green-500 opacity-5 transition-transform group-hover:scale-110" />
          <div className="relative z-10">
            <p className="mb-1 text-[10px] font-black tracking-widest text-gray-400 uppercase">
              Approved Today
            </p>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <h3 className="text-2xl font-black tracking-tight text-gray-900">
                {stats.approvedToday.toLocaleString()}
              </h3>
            )}
            <p className="mt-0.5 text-[10px] font-medium text-gray-500">
              Successfully processed today
            </p>
          </div>
        </div>

        {/* Declined Today */}
        <div className="group relative overflow-hidden rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-all hover:border-red-500/30">
          <i className="ph-duotone ph-x-circle absolute -right-3 -bottom-3 rotate-12 text-6xl text-red-500 opacity-5 transition-transform group-hover:scale-110" />
          <div className="relative z-10">
            <p className="mb-1 text-[10px] font-black tracking-widest text-gray-400 uppercase">
              Declined Today
            </p>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <h3 className="text-2xl font-black tracking-tight text-gray-900">
                {stats.declinedToday.toLocaleString()}
              </h3>
            )}
            <p className="mt-0.5 text-[10px] font-medium text-gray-500">
              Rejected or returned today
            </p>
          </div>
        </div>

        {/* SLA Card */}
        <div className="group relative overflow-hidden rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-all hover:border-blue-500/30">
          <i className="ph-duotone ph-timer absolute -right-3 -bottom-3 rotate-12 text-6xl text-blue-500 opacity-5 transition-transform group-hover:scale-110" />
          <div className="relative z-10">
            <p className="mb-1 text-[10px] font-black tracking-widest text-gray-400 uppercase">
              Avg. Process Time
            </p>
            {isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <h3 className="text-2xl font-black tracking-tight text-gray-900">
                {stats.avgSlaHours}h
              </h3>
            )}
            <p className="mt-0.5 text-[10px] font-medium text-gray-500">
              Mean time to review (SLA)
            </p>
          </div>
        </div>
      </div>

      <Card className="flex flex-1 flex-col overflow-hidden rounded-brand border border-gray-300 bg-white shadow-sm">
        <PageHeader
          icon="ph-seal-check"
          title="University Digital Repository"
          description="Review and verify digitized student records submitted by registrar staff."
          actions={
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportCSV}
                disabled={isLoading || isExporting}
                className="flex h-10 w-32 items-center justify-center gap-1.5 rounded-brand border-gray-300 text-[10px] font-bold text-gray-600 hover:border-pup-maroon hover:bg-red-50/30 hover:text-pup-maroon active:scale-95 disabled:opacity-50 shadow-sm transition-colors"
              >
                <i className={`ph-bold ${isExporting ? "ph-circle-notch animate-spin" : "ph-file-csv"} text-base`}></i>
                {isExporting ? "PREPARING..." : "EXPORT CSV"}
              </Button>

              <div className="ml-2 flex items-center gap-3 border-l border-gray-200 pl-4">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={onRefresh}
                    disabled={isLoading}
                    className="flex h-10 w-28 items-center justify-center gap-2 rounded-brand border-gray-300 bg-white px-4 text-[10px] font-bold text-gray-600 shadow-sm transition-colors hover:border-pup-maroon hover:bg-red-50/30 hover:text-pup-maroon active:scale-95 disabled:opacity-50"
                >
                    <i className={`ph-bold ph-arrows-clockwise ${isLoading ? "animate-spin" : ""} text-base`}></i>
                    REFRESH
                </Button>
              </div>
            </div>
          }
        />

        {/* Active Filter Chips Row */}
        {(localSearch !== "" || statusFilter !== "All" || docTypeFilter !== "All" || dateFrom || dateTo) && (
          <div className="flex-none border-b border-gray-100 bg-white px-4 py-3 animate-in fade-in slide-in-from-top-1 duration-300">
            <div className="flex flex-wrap items-center gap-2">
              <span className="mr-1 text-[10px] font-bold tracking-widest text-gray-400 uppercase">Active Filters:</span>
              {localSearch && (
                <div className="flex items-center gap-1 rounded-full border border-pup-maroon/20 bg-pup-maroon/10 px-2.5 py-1 text-[10px] font-bold text-pup-maroon">
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
                <div className="flex items-center gap-1 rounded-full border border-blue-100 bg-blue-50 px-2.5 py-1 text-[10px] font-bold text-blue-600">
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
                <div className="flex items-center gap-1 rounded-full border border-amber-100 bg-amber-50 px-2.5 py-1 text-[10px] font-bold text-amber-600">
                  Doc Type: {docTypeFilter}
                  <button
                    onClick={() => { setDocTypeFilter("All"); setCurrentPage(1); }}
                    className="ml-1 hover:text-amber-800 transition-colors"
                  >
                    <i className="ph-bold ph-x text-[8px]"></i>
                  </button>
                </div>
              )}
              {(dateFrom || dateTo) && (
                <div className="flex items-center gap-1 rounded-full border border-emerald-100 bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-600">
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
                className="h-6 rounded-full border border-dashed border-pup-maroon/30 px-3 text-[10px] font-black text-pup-maroon hover:bg-red-50 hover:text-pup-darkMaroon"
              >
                CLEAR ALL FILTERS
              </Button>
            </div>
          </div>
        )}

        {/* Filter Bar */}
        <div className="flex-none border-b border-gray-200 bg-gray-50/50 p-4">
          <div className="flex w-full flex-wrap items-end gap-3">
            {/* Search */}
            <div className="min-w-[400px] flex-1">
              <label className="mb-1 block text-xs font-bold text-gray-700 uppercase">Search Records</label>
              <div className="relative">
                <i className="ph-bold ph-magnifying-glass absolute top-1/2 left-3 -translate-y-1/2 text-gray-400"></i>
                <Input
                  type="text"
                  placeholder="Student, doc type, filename..."
                  className="h-10 w-full rounded-brand border border-gray-300 bg-white pl-10 text-sm focus-visible:border-pup-maroon focus-visible:ring-2 focus-visible:ring-pup-maroon focus-visible:outline-none"
                  value={localSearch}
                  onChange={(e) => setLocalSearch(e.target.value)}
                />
              </div>
            </div>


            {/* Status Filter */}
            <div className="w-36 shrink-0">
              <label className="mb-1 block text-xs font-bold text-gray-700 uppercase">Status</label>
              <select
                className="h-10 w-full rounded-brand border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm transition-colors focus:border-pup-maroon focus:ring-2 focus:ring-pup-maroon focus:outline-none"
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1) }}
              >
                <option value="All">All</option>
                <option value="Pending">Pending</option>
                <option value="Approved">Approved</option>
                <option value="Declined">Declined</option>
              </select>
            </div>

            {/* Doc Type Filter */}
            <div className="w-44 shrink-0">
              <label className="mb-1 block text-xs font-bold text-gray-700 uppercase">Document Type</label>
              <select
                className="h-10 w-full rounded-brand border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm transition-colors focus:border-pup-maroon focus:ring-2 focus:ring-pup-maroon focus:outline-none"
                value={docTypeFilter}
                onChange={(e) => { setDocTypeFilter(e.target.value); setCurrentPage(1) }}
              >
                <option value="All">All</option>
                {activeDocTypes.map((docTypeName) => (
                  <option key={docTypeName} value={docTypeName}>{docTypeName}</option>
                ))}
              </select>
            </div>

            {/* Date Range */}
            <div className="flex min-w-[280px] flex-1 flex-col gap-1">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-gray-700 uppercase">Upload Date Range</label>
                <div className="flex items-center gap-1.5">
                  {[
                    { label: "Today", range: "today" },
                    { label: "Yesterday", range: "yesterday" },
                    { label: "Last 7 Days", range: "last7" },
                    { label: "Last 30 Days", range: "last30" }
                  ].map(({ label, range }, idx, arr) => (
                    <div key={range} className="flex items-center gap-1.5">
                      <button
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
                        className="text-[9px] font-black text-gray-400 uppercase transition-colors hover:text-pup-maroon"
                      >
                        {label}
                      </button>
                      {idx < arr.length - 1 && (
                        <span className="text-[8px] text-gray-300 font-bold">•</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn("h-10 flex-1 justify-start rounded-brand border-gray-300 text-left text-xs font-medium", !dateFrom && "text-muted-foreground")}
                    >
                      <i className="ph-bold ph-calendar-dots mr-2 text-base"></i>
                      {dateFrom ? format(new Date(dateFrom), "PPP") : <span className="text-[10px] font-bold tracking-tight uppercase opacity-60">Start Date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto rounded-brand p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dateFrom ? new Date(dateFrom) : undefined}
                      onSelect={(date) => { setDateFrom(date ? format(date, "yyyy-MM-dd") : ""); setCurrentPage(1) }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn("h-10 flex-1 justify-start rounded-brand border-gray-300 text-left text-xs font-medium", !dateTo && "text-muted-foreground")}
                    >
                      <i className="ph-bold ph-calendar-dots mr-2 text-base"></i>
                      {dateTo ? format(new Date(dateTo), "PPP") : <span className="text-[10px] font-bold tracking-tight uppercase opacity-60">End Date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto rounded-brand p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dateTo ? new Date(dateTo) : undefined}
                      onSelect={(date) => { setDateTo(date ? format(date, "yyyy-MM-dd") : ""); setCurrentPage(1) }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>
        </div>

        {/* Table content - Modern Notification Style kept */}
        <CardContent className="flex min-h-0 flex-1 flex-col bg-white p-6">
          {isLoading ? (
            <div className="flex flex-1 flex-col space-y-4">
              <div className="flex flex-1 flex-col overflow-hidden rounded-brand border border-gray-200 bg-white">
                <Skeleton className="h-12 w-full rounded-none" />
                <div className="flex-1 divide-y divide-gray-100">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between p-4"
                    >
                      <div className="grid flex-1 grid-cols-5 gap-4">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-4 w-40" />
                        <Skeleton className="h-6 w-20 rounded-full" />
                        <Skeleton className="h-4 w-24" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : error ? (
            <Empty className="flex h-[320px] flex-col items-center justify-center border-0 text-center text-gray-500">
              <EmptyHeader className="flex flex-col items-center gap-0">
                <EmptyMedia className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-gray-200 bg-white shadow-sm">
                  <i className="ph-duotone ph-warning-circle text-3xl text-pup-maroon" />
                </EmptyMedia>
                <EmptyTitle className="text-lg font-bold text-gray-900">
                  Could not load report
                </EmptyTitle>
                <EmptyDescription className="mt-1 max-w-md text-sm font-medium text-gray-600">
                  {error}
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <>
              <div className="flex-1 overflow-x-auto overflow-y-auto rounded-brand border border-gray-200 bg-white shadow-xs">
                <table className="min-w-full text-sm">
                  <thead className="sticky top-0 z-10 border-b border-gray-200 bg-gray-50">
                    <tr className="text-left text-xs tracking-wider text-gray-600 uppercase">
                      <th className="w-12 p-3 text-center">
                        <input
                          type="checkbox"
                          className="h-4 w-4 cursor-pointer rounded border-gray-300 text-pup-maroon accent-pup-maroon focus:ring-pup-maroon disabled:opacity-20"
                          checked={
                            paginatedRecords.length > 0 &&
                            paginatedRecords.every((r) => selectedIds.has(r.id))
                          }
                          onChange={(e) => toggleSelectAll(e.target.checked)}
                          disabled={paginatedRecords.length === 0}
                        />
                      </th>
                      <th className="p-3 font-bold">
                        <button
                          onClick={() => handleSort("student_name")}
                          className="group flex items-center rounded px-1 py-0.5 uppercase transition-colors hover:bg-gray-100 focus:outline-none"
                        >
                          Student Identity{" "}
                          <SortIndicator
                            column="student_name"
                            sortBy={sortBy}
                            sortOrder={sortOrder}
                          />
                        </button>
                      </th>
                      <th className="p-3 font-bold">
                        <button
                          onClick={() => handleSort("doc_type")}
                          className="group flex items-center rounded px-1 py-0.5 uppercase transition-colors hover:bg-gray-100 focus:outline-none"
                        >
                          Document Type{" "}
                          <SortIndicator
                            column="doc_type"
                            sortBy={sortBy}
                            sortOrder={sortOrder}
                          />
                        </button>
                      </th>
                      <th className="p-3 font-bold">Original File</th>
                      <th className="p-3 font-bold">
                        <button
                          onClick={() => handleSort("approval_status")}
                          className="group flex items-center rounded px-1 py-0.5 uppercase transition-colors hover:bg-gray-100 focus:outline-none"
                        >
                          Review Status{" "}
                          <SortIndicator
                            column="approval_status"
                            sortBy={sortBy}
                            sortOrder={sortOrder}
                          />
                        </button>
                      </th>
                      <th className="p-3 font-bold">
                        <button
                          onClick={() => handleSort("created_at")}
                          className="group flex items-center rounded px-1 py-0.5 uppercase transition-colors hover:bg-gray-100 focus:outline-none"
                        >
                          Date Uploaded{" "}
                          <SortIndicator
                            column="created_at"
                            sortBy={sortBy}
                            sortOrder={sortOrder}
                          />
                        </button>
                      </th>
                      <th className="p-3 text-right font-bold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {sortedRecords.length === 0 ? (
                      <tr className="border-0 hover:bg-transparent">
                        <td colSpan={6} className="border-0 p-0">
                          <Empty className="flex h-[400px] flex-col items-center justify-center border-0 text-center text-gray-500">
                            <EmptyHeader className="flex flex-col items-center gap-0">
                              <EmptyMedia className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-gray-200 bg-white shadow-sm">
                                <i className="ph-duotone ph-stack text-3xl text-pup-maroon"></i>
                              </EmptyMedia>
                              <EmptyTitle className="text-lg font-bold text-gray-900">
                                No records found
                              </EmptyTitle>
                              <EmptyDescription className="mt-1 max-w-md text-sm font-medium text-gray-600">
                                {searchQuery
                                  ? "No records match your search criteria. Try adjusting your filters."
                                  : "We couldn't find any digital records matching your current filter criteria."}
                              </EmptyDescription>
                              {searchQuery && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setLocalSearch("")
                                    setSearchQuery("")
                                    setCurrentPage(1)
                                  }}
                                  className="mt-6 flex h-10 items-center gap-2 rounded-brand border border-gray-300 bg-white px-6 text-xs font-bold text-gray-600 shadow-sm transition-colors hover:border-pup-maroon hover:bg-red-50/30 hover:text-pup-maroon active:scale-95 uppercase tracking-wide"
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
                              "transition-colors hover:bg-gray-50",
                              isSelected && "bg-red-50/30",
                              isSlaBreached && !isSelected && "bg-amber-50/10"
                            )}
                          >
                            <td className="p-3 text-center">
                              <input
                                type="checkbox"
                                className="h-4 w-4 cursor-pointer rounded border-gray-300 text-pup-maroon accent-pup-maroon focus:ring-pup-maroon"
                                checked={isSelected}
                                onChange={() => toggleSelectRow(r.id)}
                              />
                            </td>
                            <td className="p-3">
                              <div className="flex flex-col py-1">
                                <span className="text-sm font-bold text-gray-900">
                                  {r.student_name || "Unknown Student"}
                                </span>
                                <span className="mt-0.5 text-[11px] text-gray-500">
                                  {r.student_no}
                                </span>
                              </div>
                            </td>
                            <td className="p-3">
                              <span className="inline-flex items-center rounded-full border border-red-100 bg-red-50 px-2.5 py-1 text-[11px] font-bold text-pup-maroon">
                                {r.doc_type}
                              </span>
                            </td>
                            <td className="p-3">
                              <span
                                className="block max-w-[180px] truncate text-xs font-medium text-gray-600"
                                title={r.original_filename}
                              >
                                {r.original_filename}
                              </span>
                            </td>
                            <td className="p-3">
                              <div className="flex items-center gap-2">
                                <Badge
                                  variant="outline"
                                  className={`${getStatusBadge(r.approval_status)} flex w-max items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-black uppercase shadow-xs`}
                                >
                                  <i
                                    className={`ph-fill ${getStatusIcon(r.approval_status)}`}
                                  ></i>
                                  {r.approval_status || "Pending"}
                                </Badge>
                                {isSlaBreached && (
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <div className="flex h-5 w-5 animate-pulse items-center justify-center rounded-full bg-red-100 text-red-600 shadow-sm cursor-help">
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
                            <td className="p-3 font-medium text-gray-600">
                              <div className="text-[11px]">
                                {uploaded.date}
                              </div>
                              <div className="text-[10px] opacity-70">
                                {uploaded.time}
                              </div>
                            </td>
                            <td className="p-3 text-right">
                              <div className="flex items-center justify-end gap-2">
                                {r.approval_status === "Declined" ? (
                                  <span className="inline-flex h-9 items-center rounded-brand border border-gray-200 bg-gray-50 px-3 text-[10px] font-bold tracking-wide text-gray-400 uppercase">
                                    <i className="ph-bold ph-file-x mr-1.5"></i>
                                    File Removed
                                  </span>
                                ) : (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handlePreview(r)}
                                    className="h-9 rounded-brand border-gray-300 px-3 text-xs font-bold text-gray-700 shadow-sm transition-all hover:border-pup-maroon hover:bg-red-50/30 hover:text-pup-maroon"
                                  >
                                    <i className="ph-bold ph-eye mr-1.5"></i>
                                    VIEW
                                  </Button>
                                )}
                                {r.approval_status === "Pending" && (
                                  <>
                                    <Button
                                      size="sm"
                                      onClick={() => onApprove(r.id)}
                                      className="h-9 rounded-brand bg-green-600 px-3 text-xs font-bold text-white shadow-sm hover:bg-green-700"
                                    >
                                      <i className="ph-bold ph-check mr-1.5"></i>
                                      APPROVE
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="destructive"
                                      onClick={() => onDecline(r.id)}
                                      className="h-9 rounded-brand bg-linear-to-b from-red-600 to-red-800 border border-red-900 hover:from-red-500 hover:to-red-700 hover:shadow-md transition-all px-3 text-xs font-bold text-white shadow-sm"
                                    >
                                      <i className="ph-bold ph-x mr-1.5"></i>
                                      DECLINE
                                    </Button>
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

              <div className="-mx-6 mt-4 -mb-6 flex items-center justify-between border-t border-gray-100 bg-gray-50/50 p-4 px-6">
                <div className="flex items-center gap-6">
                  {sortedRecords.length > 0 && (
                    <div className="flex items-center gap-4 text-xs font-medium text-gray-500">
                      <span>
                        {(displayPage - 1) * itemsPerPage + 1}-
                        {Math.min(
                          displayPage * itemsPerPage,
                          sortedRecords.length
                        )}{" "}
                        of{" "}
                        <strong className="text-gray-900">
                          {sortedRecords.length.toLocaleString()}
                        </strong>{" "}
                        entries
                      </span>

                      <div className="flex items-center gap-2 border-l border-gray-200 pl-4">
                        <span className="text-[10px] font-bold text-gray-400 uppercase">
                          Rows:
                        </span>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <select
                                className="h-7 w-16 cursor-pointer rounded-brand border border-gray-300 bg-white px-1 text-[10px] font-bold text-gray-700 focus:ring-1 focus:ring-pup-maroon focus:outline-none"
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
                                <option value={200}>200</option>
                              </select>
                            </TooltipTrigger>
                            <TooltipContent
                              side="top"
                              className="rounded-brand"
                            >
                              Items per page
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </div>
                  )}
                </div>

                {sortedRecords.length > 0 && (
                  <div className="flex shrink-0 items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={displayPage <= 1}
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      className="h-8 rounded-brand border border-gray-300 bg-white px-3 text-[10px] font-black tracking-widest text-gray-600 uppercase shadow-sm transition-colors hover:border-pup-maroon hover:bg-red-50/30 hover:text-pup-maroon active:scale-95 disabled:opacity-30"
                    >
                      <i className="ph-bold ph-caret-left mr-1"></i> PREVIOUS
                    </Button>
                    <div className="flex h-8 min-w-[32px] items-center justify-center rounded-md border border-gray-200 bg-white px-2 text-[11px] font-bold text-gray-700 shadow-xs focus-within:border-pup-maroon focus-within:ring-1 focus-within:ring-pup-maroon">
                      <input
                        type="text"
                        className="w-6 bg-transparent text-center focus:outline-none"
                        value={jumpPage}
                        onChange={(e) => setJumpPage(e.target.value)}
                        onKeyDown={handleJumpPage}
                        onBlur={handleJumpPage}
                      />
                      <span className="mx-0.5 text-gray-400">/</span>
                      <span>{totalPages}</span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={displayPage >= totalPages}
                      onClick={() =>
                        setCurrentPage((p) => Math.min(totalPages, p + 1))
                      }
                      className="h-8 rounded-brand border border-gray-300 bg-white px-3 text-[10px] font-black tracking-widest text-gray-600 uppercase shadow-sm transition-colors hover:border-pup-maroon hover:bg-red-50/30 hover:text-pup-maroon active:scale-95 disabled:opacity-30"
                    >
                      NEXT <i className="ph-bold ph-caret-right ml-1"></i>
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Floating Bulk Action Bar */}
      {selectedIds.size > 0 && (
        (() => {
          const selectedRecords = paginatedRecords.filter((r) => selectedIds.has(r.id))
          const allPending = selectedRecords.every((r) => r.approval_status === "Pending")

          if (allPending) {
            return (
              <FloatingActionBar
                selectedCount={selectedIds.size}
                onCancel={() => setSelectedIds(new Set())}
                customContent={
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      onClick={handleBulkApprove}
                      className="h-9 rounded-full bg-green-600 px-4 text-xs font-bold text-white shadow-sm hover:bg-green-700 active:scale-95"
                    >
                      <i className="ph-bold ph-check mr-2"></i>
                      APPROVE SELECTED
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={handleBulkDecline}
                      className="h-9 rounded-full bg-red-600 px-4 text-xs font-bold text-white shadow-sm hover:bg-red-700 active:scale-95"
                    >
                      <i className="ph-bold ph-x mr-2"></i>
                      DECLINE SELECTED
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
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-amber-700 bg-amber-50 px-3 py-1.5 rounded-full border border-amber-200">
                    <i className="ph-fill ph-warning-circle mr-1.5"></i>
                    Selection contains reviewed records. Bulk actions disabled.
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedIds(new Set())}
                    className="h-9 rounded-full px-4 text-xs font-bold text-gray-500 hover:bg-gray-100 active:scale-95"
                  >
                    CLEAR SELECTION
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
