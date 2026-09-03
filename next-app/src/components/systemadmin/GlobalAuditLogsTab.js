"use client"

import React, { useState, useEffect, useCallback } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
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
import { RefreshButton } from "@/components/shared/RefreshButton"
import { formatPHDateTime } from "@/lib/timeFormat"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { Select } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { generateAuditLogsPdf } from "@/lib/pdfGenerator"
import { generateExportFilename } from "@/lib/exportHelpers"

import StatCards from "../admin/audit-logs/StatCards"
import LogDetailSheet from "../admin/audit-logs/LogDetailSheet"
import LogExpandedRow from "../admin/audit-logs/LogExpandedRow"
import PdfPreviewDialog from "../admin/audit-logs/PdfPreviewDialog"

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

function getSeverityInfo(sev) {
  const s = String(sev || "").toUpperCase()
  if (s === "CRITICAL") {
    return {
      label: "Critical",
      classes: "bg-[#FEE2E2] text-[#991B1B] dark:bg-red-950/40 dark:text-red-400",
    }
  }
  if (s === "WARNING") {
    return {
      label: "Warning",
      classes: "bg-[#FEF3C7] text-[#92400E] dark:bg-amber-950/40 dark:text-amber-400",
    }
  }
  return {
    label: "Info",
    classes: "bg-[#D1FAE5] text-[#065F46] dark:bg-emerald-950/40 dark:text-emerald-400",
  }
}

function parseDateLocal(str) {
  if (!str) return undefined
  const [y, m, d] = str.split("-").map(Number)
  if (isNaN(y) || isNaN(m) || isNaN(d)) return undefined
  return new Date(y, m - 1, d)
}

export default function GlobalAuditLogsTab({ showToast }) {
  const [logs, setLogs] = useState([])
  const [offices, setOffices] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isManualLoading, setIsManualLoading] = useState(false)
  const [selectedLog, setSelectedLog] = useState(null)
  const [expandedRows, setExpandedRows] = useState({})
  const [logStats, setLogStats] = useState(null)

  // Pagination & Filtering
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)
  const [search, setSearch] = useState("")
  const [localSearch, setLocalSearch] = useState("")
  const [officeFilter, setOfficeFilter] = useState("All")
  const [severityFilter, setSeverityFilter] = useState("All")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")

  // Sorting
  const [sortBy, setSortBy] = useState("created_at")
  const [sortOrder, setSortOrder] = useState("DESC")

  // Export & Preview States
  const [isExporting, setIsExporting] = useState(false)
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false)
  const [pdfPreviewOpen, setPdfPreviewOpen] = useState(false)
  const [pdfBlobUrl, setPdfPreviewUrl] = useState(null)
  const [previewFrameReady, setPreviewFrameReady] = useState(false)
  const [isFullscreenPreview, setIsFullscreenPreview] = useState(false)

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localSearch !== search) {
        setSearch(localSearch)
        setPage(1)
      }
    }, 500)
    return () => clearTimeout(timer)
  }, [localSearch, search])

  const fetchOffices = useCallback(async () => {
    try {
      const res = await fetch("/api/offices")
      const json = await res.json()
      if (res.ok && json.ok) {
        setOffices(json.data || [])
        return json.data || []
      }
    } catch {}
    return []
  }, [])

  const fetchStats = useCallback(async () => {
    try {
      const officeQuery = officeFilter !== "All" ? `&officeId=${encodeURIComponent(officeFilter)}` : ""
      const severityQuery = severityFilter !== "All" ? `&severity=${encodeURIComponent(severityFilter)}` : ""
      const searchQuery = search ? `&search=${encodeURIComponent(search)}` : ""
      const startQuery = startDate ? `&startDate=${encodeURIComponent(startDate)}` : ""
      const endQuery = endDate ? `&endDate=${encodeURIComponent(endDate)}` : ""

      const res = await fetch(`/api/audit-logs/global/stats?${officeQuery}${severityQuery}${searchQuery}${startQuery}${endQuery}`)
      const json = await res.json()
      if (res.ok && json.ok) {
        setLogStats(json.data)
      }
    } catch (err) {
      console.error("Failed to fetch global audit log stats", err)
    }
  }, [officeFilter, severityFilter, search, startDate, endDate])

  const fetchLogs = useCallback(
    async (isManual = false, currentOffices = null) => {
      if (isManual) setIsManualLoading(true)
      setLoading(true)
      setError(null)
      try {
        const offset = (page - 1) * limit
        const officeQuery = officeFilter !== "All" ? `&officeId=${encodeURIComponent(officeFilter)}` : ""
        const severityQuery = severityFilter !== "All" ? `&severity=${encodeURIComponent(severityFilter)}` : ""
        const searchQuery = search ? `&search=${encodeURIComponent(search)}` : ""
        const startQuery = startDate ? `&startDate=${encodeURIComponent(startDate)}` : ""
        const endQuery = endDate ? `&endDate=${encodeURIComponent(endDate)}` : ""
        const sortQuery = `&sortBy=${sortBy}&sortOrder=${sortOrder}`

        const res = await fetch(
          `/api/audit-logs/global?limit=${limit}&offset=${offset}${officeQuery}${severityQuery}${searchQuery}${startQuery}${endQuery}${sortQuery}`
        )
        const json = await res.json()

        const officeList = currentOffices || offices

        if (res.ok && json.ok) {
          setError(null)
          setLogs(
            (json.data || []).map((r) => {
              const off = officeList.find((o) => o.id === r.office_id)
              const scopeLabel = off ? off.short_name : "Global"
              const officeName = off ? off.short_name : "Global (Platform)"
              return {
                id: `${r.log_source || "global"}-${r.office_id || "global"}-${r.id}`,
                rawId: r.id,
                time: formatPHDateTime(r.created_at),
                user: r.actor,
                actor: r.actor,
                role: r.role,
                office_id: r.office_id,
                officeName,
                scope: scopeLabel,
                action: r.action,
                details: r.details || "—",
                severity: r.severity || "INFO",
                userAgent: r.user_agent || "—",
                user_agent: r.user_agent || "—",
                entityType: r.entity_type || "",
                entity_type: r.entity_type || "",
                entityId: r.entity_id || "",
                entity_id: r.entity_id || "",
                ip: r.ip || "—",
                created_at: r.created_at,
              }
            })
          )
          setTotal(json.total || 0)
        } else {
          setError(json.error || "Failed to fetch audit logs")
          showToast?.(json.error || "Failed to fetch audit logs", true)
        }
      } catch (err) {
        setError("Network error fetching audit logs")
        showToast?.("Network error fetching audit logs", true)
      } finally {
        setLoading(false)
        setIsManualLoading(false)
      }
    },
    [page, limit, officeFilter, severityFilter, search, startDate, endDate, sortBy, sortOrder, offices, showToast]
  )

  useEffect(() => {
    fetchOffices().then((offs) => {
      fetchLogs(false, offs)
    })
  }, [fetchOffices])

  useEffect(() => {
    fetchLogs()
    fetchStats()
  }, [fetchLogs, fetchStats])

  const toggleRow = useCallback((id) => {
    setExpandedRows((prev) => ({
      ...prev,
      [id]: !prev[id],
    }))
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
    setPage(1)
  }

  const handleQuickRange = (range) => {
    if (activeShortcut === range) {
      setStartDate("")
      setEndDate("")
      setPage(1)
      return
    }

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
        start.setDate(start.getDate() - 6)
        start.setHours(0, 0, 0, 0)
        break
      case "last30":
        start.setDate(start.getDate() - 29)
        start.setHours(0, 0, 0, 0)
        break
    }

    setStartDate(format(start, "yyyy-MM-dd"))
    setEndDate(format(end, "yyyy-MM-dd"))
    setPage(1)
  }

  const activeShortcut = (() => {
    if (!startDate || !endDate) return null
    const todayStr = format(new Date(), "yyyy-MM-dd")

    if (startDate === todayStr && endDate === todayStr) return "today"

    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const yestStr = format(yesterday, "yyyy-MM-dd")
    if (startDate === yestStr && endDate === yestStr) return "yesterday"

    const last7 = new Date()
    last7.setDate(last7.getDate() - 6)
    if (startDate === format(last7, "yyyy-MM-dd") && endDate === todayStr) return "last7"

    const last30 = new Date()
    last30.setDate(last30.getDate() - 29)
    if (startDate === format(last30, "yyyy-MM-dd") && endDate === todayStr) return "last30"

    return null
  })()

  const fetchAllForExport = async () => {
    const officeQuery = officeFilter !== "All" ? `&officeId=${encodeURIComponent(officeFilter)}` : ""
    const sevQuery = severityFilter !== "All" ? `&severity=${encodeURIComponent(severityFilter)}` : ""
    const startQuery = startDate ? `&startDate=${encodeURIComponent(startDate)}` : ""
    const endQuery = endDate ? `&endDate=${encodeURIComponent(endDate)}` : ""
    const res = await fetch(
      `/api/audit-logs/global?limit=50000&search=${encodeURIComponent(search)}${officeQuery}${sevQuery}${startQuery}${endQuery}&sortBy=${sortBy}&sortOrder=${sortOrder}`
    )
    const json = await res.json()
    if (!res.ok || !json.ok) throw new Error(json.error || "Export failed")
    return (json.data || []).map((r) => {
      const off = offices.find((o) => o.id === r.office_id)
      return {
        ...r,
        officeName: off ? off.short_name : "Global (Platform)",
        scope: off ? off.short_name : "Global",
      }
    })
  }

  const handleDownloadCSV = async () => {
    if (total === 0 || isExporting) return
    setIsExporting(true)
    try {
      const allLogs = await fetchAllForExport()
      const headers = [
        "Date & Time",
        "Severity",
        "Actor",
        "Role",
        "Scope",
        "Action",
        "Details",
        "IP Address",
        "User Agent",
        "Entity Type",
        "Entity ID",
      ]
      const rows = allLogs.map((log) => [
        formatPHDateTime(log.created_at),
        log.severity || "INFO",
        log.actor,
        log.role,
        log.scope || "Global",
        log.action,
        log.details || "No known description",
        log.ip || "—",
        log.user_agent || "—",
        log.entity_type || "—",
        log.entity_id || "—",
      ])
      const csvContent = [
        headers.join(","),
        ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")),
      ].join("\n")
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
      const fileName = generateExportFilename("PLATFORM-AUDIT-LOGS", "DATA", "csv")
      const link = document.createElement("a")
      const url = URL.createObjectURL(blob)
      link.setAttribute("href", url)
      link.setAttribute("download", fileName)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      showToast?.({
        title: "Export Success",
        description: "Platform audit logs have been exported to CSV successfully.",
      })
    } catch (err) {
      console.error("[Export Error]", err)
      showToast?.({ title: "Export Failed", description: err.message || "Unable to export audit logs to CSV." }, true)
    } finally {
      setIsExporting(false)
    }
  }

  const handlePreviewPDF = async () => {
    if (total === 0 || isGeneratingPdf) return
    setIsGeneratingPdf(true)
    try {
      const allLogs = await fetchAllForExport()
      const offObj = offices.find((o) => o.id === officeFilter)
      const scopeLabel =
        officeFilter === "All"
          ? "All Scopes"
          : officeFilter === "global"
          ? "Global (Platform)"
          : offObj
          ? offObj.short_name
          : officeFilter

      const blob = await generateAuditLogsPdf(allLogs, {
        scope: scopeLabel,
        severity: severityFilter,
        startDate,
        endDate,
        search,
      })
      const url = URL.createObjectURL(blob)
      setPdfPreviewUrl(url)
      setPdfPreviewOpen(true)
    } catch (err) {
      console.error("[PDF Preview Error]", err)
      showToast?.({ title: "Preview Failed", description: err.message || "Unable to generate PDF preview." }, true)
    } finally {
      setIsGeneratingPdf(false)
    }
  }

  const handleDownloadFromPreview = () => {
    if (!pdfBlobUrl) return
    try {
      const fileName = generateExportFilename("PLATFORM-AUDIT-LOGS", "REPORT", "pdf")
      const link = document.createElement("a")
      link.href = pdfBlobUrl
      link.setAttribute("download", fileName)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      showToast?.({
        title: "Download Success",
        description: "Platform audit logs report has been downloaded successfully.",
      })
    } catch (err) {
      console.error("[PDF Download Error]", err)
      showToast?.({ title: "Download Failed", description: "Unable to download the PDF report." }, true)
    }
  }

  const handleCopy = (text, label) => {
    if (!text) return
    navigator.clipboard.writeText(text)
    showToast?.({
      title: "Copied to Clipboard",
      description: `${label} has been successfully copied to your clipboard.`,
    })
  }

  const handleNextLog = () => {
    if (!selectedLog) return
    const currentIndex = logs.findIndex((log) => log.id === selectedLog.id)
    if (currentIndex < logs.length - 1) {
      setSelectedLog(logs[currentIndex + 1])
    }
  }

  const handlePrevLog = () => {
    if (!selectedLog) return
    const currentIndex = logs.findIndex((log) => log.id === selectedLog.id)
    if (currentIndex > 0) {
      setSelectedLog(logs[currentIndex - 1])
    }
  }

  const handleClearFilters = () => {
    setLocalSearch("")
    setSearch("")
    setOfficeFilter("All")
    setSeverityFilter("All")
    setStartDate("")
    setEndDate("")
    setPage(1)
  }

  const totalPages = Math.ceil(total / limit) || 1
  const displayPage = Math.min(page, totalPages)
  const hasActiveFilters =
    localSearch !== "" || officeFilter !== "All" || severityFilter !== "All" || startDate !== "" || endDate !== ""

  return (
    <TooltipProvider delay={200}>
      <div className="animate-fade-up font-inter flex w-full flex-col gap-6">
        {/* Stat Cards */}
        <StatCards isLoading={loading && !isManualLoading} logStats={logStats} />

        {/* Main Table Card */}
        <Card className="flex h-auto w-full flex-col p-0 gap-0 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-card dark:shadow-none">
          <PageHeader
            icon="ph-shield-check"
            title="Platform Audit Trail"
            description="Inspect administrative actions, office configuration updates, and security logs across all database environments."
            showBorder={false}
            titleClassName="text-[18px] font-semibold tracking-[-0.01em] text-gray-900 dark:text-zinc-50"
            descriptionClassName="text-[13px] font-normal text-gray-500 dark:text-zinc-400 mt-[4px]"
            actions={
              <div className="flex items-center gap-6">
                <RefreshButton
                  onRefresh={() => {
                    fetchLogs(true)
                    fetchStats()
                  }}
                  isLoading={isManualLoading}
                  title="Refresh Audit Logs"
                />

                <div className="h-6 w-px bg-gray-200 dark:bg-zinc-800" />

                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    onClick={handleDownloadCSV}
                    disabled={total === 0 || isExporting || isGeneratingPdf}
                    className="flex h-10 items-center justify-center rounded-xl! font-semibold text-xs text-gray-700 hover:text-gray-900 hover:bg-gray-100 dark:text-zinc-300 dark:hover:text-white dark:hover:bg-white/10 transition-colors px-4 cursor-pointer active:scale-95 border-0!"
                  >
                    {isExporting ? (
                      <i className="ph-bold ph-spinner animate-spin text-[16px]"></i>
                    ) : (
                      "Export"
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="default"
                    onClick={handlePreviewPDF}
                    disabled={total === 0 || isExporting || isGeneratingPdf}
                    className="flex h-10 items-center justify-center rounded-xl! btn-brand-red text-white font-semibold text-xs active:scale-95 disabled:opacity-50 transition-all cursor-pointer px-5 shadow-xs"
                  >
                    {isGeneratingPdf ? (
                      <i className="ph-bold ph-spinner animate-spin text-[16px] flex items-center justify-center"></i>
                    ) : (
                      "Get Report"
                    )}
                  </Button>
                </div>
              </div>
            }
          />

          {/* Active Filter Chips Row */}
          {hasActiveFilters && (
            <div className="flex-none border-b border-gray-100 bg-white px-6 py-3 animate-in fade-in slide-in-from-top-1 duration-normal dark:border-white/10 dark:bg-card">
              <div className="flex flex-wrap items-center gap-2">
                <span className="mr-1 text-[11px] font-medium uppercase tracking-[0.04em] text-gray-400 dark:text-zinc-500">
                  Active filters:
                </span>
                {localSearch && (
                  <div className="flex items-center gap-[6px] rounded-lg bg-gray-100 dark:bg-zinc-800 px-[10px] py-[4px] text-[12px] font-normal text-gray-900 dark:text-zinc-50">
                    Search: {localSearch}
                    <button
                      onClick={() => {
                        setLocalSearch("")
                        setSearch("")
                        setPage(1)
                      }}
                      className="text-[12px] text-gray-400 hover:text-gray-600 dark:text-zinc-500 dark:hover:text-zinc-300 transition-colors cursor-pointer border-0 bg-transparent p-0 leading-none"
                    >
                      ×
                    </button>
                  </div>
                )}
                {officeFilter !== "All" && (
                  <div className="flex items-center gap-[6px] rounded-lg bg-gray-100 dark:bg-zinc-800 px-[10px] py-[4px] text-[12px] font-normal text-gray-900 dark:text-zinc-50">
                    Scope: {officeFilter === "global" ? "Global (Platform)" : offices.find((o) => o.id === officeFilter)?.short_name || officeFilter}
                    <button
                      onClick={() => {
                        setOfficeFilter("All")
                        setPage(1)
                      }}
                      className="text-[12px] text-gray-400 hover:text-gray-600 dark:text-zinc-500 dark:hover:text-zinc-300 transition-colors cursor-pointer border-0 bg-transparent p-0 leading-none"
                    >
                      ×
                    </button>
                  </div>
                )}
                {severityFilter !== "All" && (
                  <div className="flex items-center gap-[6px] rounded-lg bg-gray-100 dark:bg-zinc-800 px-[10px] py-[4px] text-[12px] font-normal text-gray-900 dark:text-zinc-50">
                    Severity: {severityFilter}
                    <button
                      onClick={() => {
                        setSeverityFilter("All")
                        setPage(1)
                      }}
                      className="text-[12px] text-gray-400 hover:text-gray-600 dark:text-zinc-500 dark:hover:text-zinc-300 transition-colors cursor-pointer border-0 bg-transparent p-0 leading-none"
                    >
                      ×
                    </button>
                  </div>
                )}
                {(startDate || endDate) && (
                  <div className="flex items-center gap-[6px] rounded-lg bg-gray-100 dark:bg-zinc-800 px-[10px] py-[4px] text-[12px] font-normal text-gray-900 dark:text-zinc-50">
                    Date: {startDate ? format(parseDateLocal(startDate), "MMM d, yyyy") : "Start"} → {endDate ? format(parseDateLocal(endDate), "MMM d, yyyy") : "End"}
                    <button
                      onClick={() => {
                        setStartDate("")
                        setEndDate("")
                        setPage(1)
                      }}
                      className="text-[12px] text-gray-400 hover:text-gray-600 dark:text-zinc-500 dark:hover:text-zinc-300 transition-colors cursor-pointer border-0 bg-transparent p-0 leading-none"
                    >
                      ×
                    </button>
                  </div>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearFilters}
                  className="h-auto text-[12px] font-medium text-gray-400 dark:text-zinc-500 border-0 bg-transparent hover:bg-transparent shadow-none p-0 hover:text-red-600 dark:hover:text-red-500 transition-colors cursor-pointer"
                >
                  Clear
                </Button>
              </div>
            </div>
          )}

          {/* Filters Toolbar */}
          <div className="bg-white border-t border-gray-100 p-4 backdrop-blur-md dark:bg-card/50 dark:border-white/10">
            <div className="flex w-full flex-wrap items-center gap-4">
              {/* Search */}
              <div className="flex-[2] min-w-[280px] group relative">
                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                  <i className="ph-bold ph-magnifying-glass text-gray-400 transition-colors group-focus-within:text-pup-maroon dark:text-zinc-500 text-sm"></i>
                </div>
                <Input
                  type="text"
                  placeholder="Search logs by actor, action, details, or IP..."
                  className="h-10 w-full rounded-xl border border-gray-200 bg-white pl-9 pr-20 text-xs font-normal transition-all focus:border-pup-maroon/30 focus:ring-4 focus:ring-pup-maroon/5 placeholder:text-gray-400 dark:border-white/10 dark:bg-card dark:text-zinc-300 dark:focus:border-primary"
                  value={localSearch}
                  onChange={(e) => setLocalSearch(e.target.value)}
                />
                <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-[12px] font-normal text-gray-400 dark:text-zinc-500">
                  {total > 0 ? `${total.toLocaleString()} results` : "0 results"}
                </div>
              </div>

              {/* Scope Select */}
              <div className="min-w-[140px] flex-1">
                <Select
                  value={officeFilter}
                  onChange={(e) => {
                    setOfficeFilter(e.target.value)
                    setPage(1)
                  }}
                  className="h-10 rounded-xl border border-gray-200 text-xs font-normal bg-white dark:bg-card dark:border-white/10"
                >
                  <option value="All">All Scopes</option>
                  <option value="global">Global (Platform)</option>
                  {offices.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.short_name}
                    </option>
                  ))}
                </Select>
              </div>

              {/* Severity Select */}
              <div className="min-w-[130px] flex-1">
                <Select
                  value={severityFilter}
                  onChange={(e) => {
                    setSeverityFilter(e.target.value)
                    setPage(1)
                  }}
                  className="h-10 rounded-xl border border-gray-200 text-xs font-normal bg-white dark:bg-card dark:border-white/10"
                >
                  <option value="All">Severity</option>
                  <option value="INFO">Information</option>
                  <option value="WARNING">Warning</option>
                  <option value="CRITICAL">Critical</option>
                </Select>
              </div>

              {/* Time shortcuts */}
              <div className="flex items-center gap-[12px] h-[36px] flex-none">
                {[
                  { key: "today", label: "Today" },
                  { key: "yesterday", label: "Yesterday" },
                  { key: "last7", label: "7 days" },
                  { key: "last30", label: "30 days" },
                ].map((range) => {
                  const isActive = activeShortcut === range.key
                  return (
                    <button
                      key={range.key}
                      type="button"
                      onClick={() => handleQuickRange(range.key)}
                      className={cn(
                        "text-[12px] font-normal transition-all bg-transparent border-0 cursor-pointer shadow-none focus:outline-none focus:ring-0 pb-1",
                        isActive
                          ? "text-[#03a10e] dark:text-[#03a10e] border-b-[2px] border-[#03a10e] dark:border-[#03a10e] font-medium"
                          : "text-gray-400 dark:text-zinc-500 hover:text-gray-600 dark:hover:text-zinc-300"
                      )}
                    >
                      {range.label}
                    </button>
                  )
                })}
              </div>

              {/* Date pickers */}
              <div className="flex items-center gap-2 flex-none">
                <div className="w-[125px]">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "h-10 w-full justify-start rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-card text-left text-xs font-normal shadow-xs transition-all hover:bg-gray-50 dark:hover:bg-white/10",
                          !startDate ? "text-gray-400 dark:text-zinc-500" : "text-gray-700 dark:text-zinc-200"
                        )}
                      >
                        {startDate ? format(parseDateLocal(startDate), "MMM d, yyyy") : "Start Date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto rounded-2xl border border-gray-200 bg-white p-0 shadow-2xl dark:border-white/10 dark:bg-card" align="start">
                      <Calendar
                        mode="single"
                        selected={startDate ? parseDateLocal(startDate) : undefined}
                        onSelect={(date) => {
                          setStartDate(date ? format(date, "yyyy-MM-dd") : "")
                          setPage(1)
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="text-[12px] text-gray-400 dark:text-zinc-500 shrink-0">
                  →
                </div>
                <div className="w-[125px]">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "h-10 w-full justify-start rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-card text-left text-xs font-normal shadow-xs transition-all hover:bg-gray-50 dark:hover:bg-white/10",
                          !endDate ? "text-gray-400 dark:text-zinc-500" : "text-gray-700 dark:text-zinc-200"
                        )}
                      >
                        {endDate ? format(parseDateLocal(endDate), "MMM d, yyyy") : "End Date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto rounded-2xl border border-gray-200 bg-white p-0 shadow-2xl dark:border-white/10 dark:bg-card" align="start">
                      <Calendar
                        mode="single"
                        selected={endDate ? parseDateLocal(endDate) : undefined}
                        onSelect={(date) => {
                          setEndDate(date ? format(date, "yyyy-MM-dd") : "")
                          setPage(1)
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

        {/* Table Card */}
        {loading && (!logs || logs.length === 0) ? (
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-card animate-pulse p-4 space-y-4">
            <div className="h-10 border-b border-gray-200 bg-transparent dark:border-white/10" />
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-8 w-full bg-gray-50 dark:bg-muted" />
            ))}
          </div>
        ) : error ? (
          <div className="flex h-[420px] flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 dark:border-white/10 bg-white/40 dark:bg-zinc-900/20 text-center">
            <Empty className="flex flex-col items-center justify-center border-0 text-center text-gray-500 dark:text-zinc-400">
              <EmptyHeader className="flex flex-col items-center gap-0">
                <div className="relative mb-6">
                  <div className="absolute inset-0 scale-150 animate-pulse rounded-full bg-gray-50 opacity-50 dark:bg-card"></div>
                  <EmptyMedia className="relative z-10 flex h-24 w-24 items-center justify-center rounded-3xl border border-gray-100 bg-white shadow-xl rotate-3 dark:border-white/10 dark:bg-card dark:shadow-none">
                    <i className="ph-duotone ph-warning-circle text-3xl text-red-500 dark:text-red-400" />
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
        ) : logs.length === 0 ? (
          <div className="flex h-[420px] flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 dark:border-white/10 bg-white/40 dark:bg-zinc-900/20 text-center">
            <Empty className="flex flex-col items-center justify-center border-0 bg-transparent text-center">
              <EmptyHeader className="flex flex-col items-center gap-0">
                <div className="relative mb-6">
                  <div className="absolute inset-0 scale-150 animate-pulse rounded-full bg-gray-50 opacity-50 dark:bg-card"></div>
                  <EmptyMedia className="relative z-10 flex h-24 w-24 items-center justify-center rounded-3xl border border-gray-100 bg-white shadow-xl rotate-3 dark:border-white/10 dark:bg-card dark:shadow-none">
                    <i className="ph-duotone ph-magnifying-glass text-3xl text-gray-400 dark:text-zinc-500"></i>
                  </EmptyMedia>
                </div>
                <EmptyTitle className="text-xl font-semibold text-gray-900 dark:text-zinc-50">
                  No Activity Found
                </EmptyTitle>
                <EmptyDescription className="max-w-xs text-sm font-medium text-gray-500 dark:text-zinc-400 mt-1">
                  Try adjusting your search filters to find what you&apos;re looking for.
                </EmptyDescription>
                {hasActiveFilters && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleClearFilters}
                    className="mt-6 flex h-10 items-center gap-2 rounded-xl border border-gray-300 bg-white px-5 text-xs font-semibold text-gray-700 shadow-xs transition-colors hover:bg-gray-50 dark:bg-zinc-900 dark:border-white/10 dark:text-zinc-300 cursor-pointer"
                  >
                    <i className="ph-bold ph-arrow-counter-clockwise"></i>
                    Clear Search
                  </Button>
                )}
              </EmptyHeader>
            </Empty>
          </div>
        ) : (
          <div className="flex flex-1 flex-col min-h-0">
            <div className="flex-1 min-h-0 flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-card isolate">
              <div className="flex-1 overflow-auto rounded-[inherit] isolate">
                <table className="min-w-full text-sm">
              <thead className="sticky top-0 z-10 border-b-[0.5px] border-black/10 dark:border-white/10 bg-white dark:bg-card">
                <tr className="text-left text-[12px] font-medium tracking-[0.04em] text-[#8E8E93] dark:text-zinc-500 h-11 select-none">
                  <th className="w-12 p-4 text-center"></th>
                  <th className="p-4">
                    <button
                      onClick={() => handleSort("created_at")}
                      className={cn(
                        "group flex items-center transition-colors focus:outline-none cursor-pointer text-[12px] font-medium tracking-[0.04em]",
                        sortBy === "created_at" ? "text-[#111111] dark:text-white" : "text-[#8E8E93] dark:text-zinc-500 hover:text-[#111111] dark:hover:text-white"
                      )}
                    >
                      Timestamp{" "}
                      <SortIndicator column="created_at" sortBy={sortBy} sortOrder={sortOrder} />
                    </button>
                  </th>
                  <th className="p-4">
                    <button
                      onClick={() => handleSort("severity")}
                      className={cn(
                        "group flex items-center transition-colors focus:outline-none cursor-pointer text-[12px] font-medium tracking-[0.04em]",
                        sortBy === "severity" ? "text-[#111111] dark:text-white" : "text-[#8E8E93] dark:text-zinc-500 hover:text-[#111111] dark:hover:text-white"
                      )}
                    >
                      Level{" "}
                      <SortIndicator column="severity" sortBy={sortBy} sortOrder={sortOrder} />
                    </button>
                  </th>
                  <th className="p-4">
                    <button
                      onClick={() => handleSort("actor")}
                      className={cn(
                        "group flex items-center transition-colors focus:outline-none cursor-pointer text-[12px] font-medium tracking-[0.04em]",
                        sortBy === "actor" ? "text-[#111111] dark:text-white" : "text-[#8E8E93] dark:text-zinc-500 hover:text-[#111111] dark:hover:text-white"
                      )}
                    >
                      Actor{" "}
                      <SortIndicator column="actor" sortBy={sortBy} sortOrder={sortOrder} />
                    </button>
                  </th>
                  <th className="p-4">
                    <button
                      onClick={() => handleSort("office_id")}
                      className={cn(
                        "group flex items-center transition-colors focus:outline-none cursor-pointer text-[12px] font-medium tracking-[0.04em]",
                        sortBy === "office_id" ? "text-[#111111] dark:text-white" : "text-[#8E8E93] dark:text-zinc-500 hover:text-[#111111] dark:hover:text-white"
                      )}
                    >
                      Scope{" "}
                      <SortIndicator column="office_id" sortBy={sortBy} sortOrder={sortOrder} />
                    </button>
                  </th>
                  <th className="p-4">
                    <button
                      onClick={() => handleSort("action")}
                      className={cn(
                        "group flex items-center transition-colors focus:outline-none cursor-pointer text-[12px] font-medium tracking-[0.04em]",
                        sortBy === "action" ? "text-[#111111] dark:text-white" : "text-[#8E8E93] dark:text-zinc-500 hover:text-[#111111] dark:hover:text-white"
                      )}
                    >
                      Action{" "}
                      <SortIndicator column="action" sortBy={sortBy} sortOrder={sortOrder} />
                    </button>
                  </th>
                  <th className="p-4 text-[12px] font-medium tracking-[0.04em] text-[#8E8E93] dark:text-zinc-500">
                    Description
                  </th>
                  <th className="p-4 text-right text-[12px] font-medium tracking-[0.04em] text-[#8E8E93] dark:text-zinc-500">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-transparent">
                {logs.map((log) => {
                    const isCritical = log.severity === "CRITICAL"
                    const isWarning = log.severity === "WARNING"
                    const severityInfo = getSeverityInfo(log.severity)
                    const isExpanded = !!expandedRows[log.id]
                    const isSelected = selectedLog && selectedLog.id === log.id

                    const formattedTimestamp = (() => {
                      try {
                        const d = new Date(log.created_at || log.time)
                        if (isNaN(d.getTime())) return log.created_at || log.time
                        return d.toLocaleString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                          hour12: true,
                        })
                      } catch (e) {
                        return log.created_at || log.time
                      }
                    })()

                    return (
                      <React.Fragment key={log.id}>
                        <tr
                          onClick={() => toggleRow(log.id)}
                          className={cn(
                            "group h-[52px] border-b-[0.5px] border-gray-100 dark:border-white/10 last:border-b-0 transition-all duration-fast hover:bg-gray-50/40 dark:bg-card dark:hover:bg-white/2 select-none cursor-pointer",
                            isSelected && "bg-blue-50/60 dark:bg-blue-950/20",
                            isExpanded && "bg-gray-50 dark:bg-white/8"
                          )}
                        >
                          {/* Accordion Chevron */}
                          <td className="py-0 px-4 align-middle text-center" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => toggleRow(log.id)}
                              title={isExpanded ? "Collapse Details" : "Expand Details"}
                              className="mx-auto flex h-7 w-7 items-center justify-center bg-transparent border-none text-[#8E8E93] hover:text-[#111111] dark:hover:text-zinc-200 cursor-pointer transition-transform duration-200"
                              style={{ transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)" }}
                            >
                              <i className="ti ti-chevron-down text-[14px]" style={{ fontSize: "14px" }}></i>
                            </button>
                          </td>

                          {/* Timestamp */}
                          <td className="py-0 px-4 align-middle text-[13px] font-normal text-[#111111] dark:text-zinc-50">
                            {formattedTimestamp}
                          </td>

                          {/* Level / Severity */}
                          <td className="py-0 px-4 align-middle">
                            <span
                              className={cn(
                                "inline-flex w-fit items-center justify-center rounded-[4px] px-[8px] py-[3px] text-[11px] font-medium tracking-[0.04em] shadow-none transition-all",
                                severityInfo.classes
                              )}
                            >
                              {severityInfo.label}
                            </span>
                          </td>

                          {/* Actor */}
                          <td className="py-0 px-4 align-middle">
                            <div className="flex flex-col overflow-hidden">
                              <span className="truncate text-[13px] font-medium text-[#111111] dark:text-zinc-50">
                                {log.actor}
                              </span>
                              <span className="truncate text-[12px] font-normal text-[#8E8E93] mt-[2px]">
                                {log.role}
                              </span>
                            </div>
                          </td>

                          {/* Scope */}
                          <td className="py-0 px-4 align-middle text-[13px] font-normal text-[#111111] dark:text-zinc-50">
                            {log.office_id ? (
                              <span className="font-medium text-gray-800 dark:text-zinc-300">
                                {log.scope}
                              </span>
                            ) : (
                              <span className="text-blue-600 dark:text-blue-400 font-semibold uppercase text-[10px] tracking-wider">
                                Global
                              </span>
                            )}
                          </td>

                          {/* Action */}
                          <td className="py-0 px-4 align-middle text-[13px] font-medium text-[#111111] dark:text-zinc-50">
                            {log.action === "Rotate Password" ? "Password Rotated" : log.action}
                          </td>

                          {/* Description Tooltip */}
                          <td className="py-0 px-4 align-middle">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="block max-w-[280px] truncate text-[13px] font-normal text-[#8E8E93]">
                                  {log.details || "—"}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent
                                side="top"
                                className="max-w-[400px] rounded-xl border-gray-200 bg-white p-3 text-xs font-medium text-gray-700 shadow-2xl backdrop-blur-sm dark:border-white/10 dark:bg-card/95 dark:text-zinc-200"
                              >
                                {log.details || "—"}
                              </TooltipContent>
                            </Tooltip>
                          </td>

                          {/* Actions: View Details in Sheet */}
                          <td className="py-0 px-4 align-middle text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-[12px]">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button
                                    onClick={() => setSelectedLog(log)}
                                    className="w-7 h-7 rounded-lg hover:bg-[rgba(0,0,0,0.06)] dark:hover:bg-white/10 text-[#C7C7CC] hover:text-[#E5484D] dark:hover:text-red-400 focus:outline-none cursor-pointer active:scale-95 flex items-center justify-center transition-colors"
                                  >
                                    <i className="ti ti-eye text-[16px]"></i>
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent>View Details</TooltipContent>
                              </Tooltip>
                            </div>
                          </td>
                        </tr>

                        {/* Accordion Expanded Details */}
                        {isExpanded && (
                          <tr className="border-0 bg-gray-50 dark:bg-muted/30">
                            <td colSpan={8} className="p-0">
                              <LogExpandedRow log={log} handleCopy={handleCopy} />
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    )
                  })}
              </tbody>
            </table>
          </div>

          {/* Pagination Toolbar */}
          {total > 0 && (
            <div className="flex items-center justify-between border-t border-[#e5e5ea] dark:border-[#3a3a3c] bg-white dark:bg-[#1c1c1e] p-4 px-6 rounded-b-2xl">
              <div className="flex items-center gap-6 text-xs text-gray-500 dark:text-zinc-400 select-none">
                <span>Showing {logs.length} of {total.toLocaleString()}</span>
                <div className="flex items-center gap-2">
                  <span>Rows:</span>
                  {[10, 20, 50, 100].map((size) => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => {
                        setLimit(size)
                        setPage(1)
                      }}
                      className={cn(
                        "px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer",
                        limit === size
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
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
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
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="text-xs text-gray-500 dark:text-zinc-400 disabled:opacity-40 cursor-pointer rounded-xl h-8 px-3"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    )}

        {/* Log Detail Side Sheet */}
        <LogDetailSheet
          selectedLog={selectedLog}
          setSelectedLog={setSelectedLog}
          handleCopy={handleCopy}
          onSearchSimilar={(term) => {
            setLocalSearch(term)
            setSearch(term)
            setPage(1)
          }}
          onNext={handleNextLog}
          onPrev={handlePrevLog}
          hasNext={logs.length > 0 && selectedLog && logs.findIndex((l) => l.id === selectedLog.id) < logs.length - 1}
          hasPrev={logs.length > 0 && selectedLog && logs.findIndex((l) => l.id === selectedLog.id) > 0}
        />

        {/* PDF Export Preview Dialog */}
        <PdfPreviewDialog
          pdfPreviewOpen={pdfPreviewOpen}
          setPdfPreviewOpen={setPdfPreviewOpen}
          pdfBlobUrl={pdfBlobUrl}
          setPdfPreviewUrl={setPdfPreviewUrl}
          previewFrameReady={previewFrameReady}
          setPreviewFrameReady={setPreviewFrameReady}
          handleDownloadFromPreview={handleDownloadFromPreview}
          isFullscreenPreview={isFullscreenPreview}
          setIsFullscreenPreview={setIsFullscreenPreview}
        />
      </div>
    </TooltipProvider>
  )
}
