"use client"

import React, { useState, useEffect, useCallback } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import PageHeader from "@/components/shared/PageHeader"
import { RefreshButton } from "@/components/shared/RefreshButton"
import { formatPHDateTime } from "@/lib/timeFormat"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { generateAuditLogsPdf } from "@/lib/pdfGenerator"
import { generateExportFilename } from "@/lib/exportHelpers"
import StatCards from "@/components/admin/audit-logs/StatCards"
import PdfPreviewDialog from "@/components/admin/audit-logs/PdfPreviewDialog"

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip"

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

import { Calendar } from "@/components/ui/calendar"
import { Select } from "@/components/ui/select"

function SortIndicator({ column, sortBy, sortOrder }) {
  if (sortBy !== column) {
    return <i className="ph-bold ph-caret-up-down ml-1 text-[12px] text-gray-450 opacity-0 group-hover:opacity-100 transition-opacity"></i>
  }
  return sortOrder === "ASC" ? (
    <i className="ph-bold ph-caret-up ml-1 text-[12px] text-gray-500"></i>
  ) : (
    <i className="ph-bold ph-caret-down ml-1 text-[12px] text-gray-500"></i>
  )
}

function getSeverityInfo(sev) {
  const s = String(sev || "").toUpperCase();
  if (s === "CRITICAL") {
    return {
      label: "Critical",
      classes: "bg-[#FEE2E2] text-[#991B1B] dark:bg-red-950/40 dark:text-red-400 border-red-200 dark:border-red-900/40"
    };
  }
  if (s === "WARNING") {
    return {
      label: "Warning",
      classes: "bg-[#FEF3C7] text-[#92400E] dark:bg-amber-950/40 dark:text-amber-400 border-amber-200 dark:border-amber-900/40"
    };
  }
  return {
    label: "Info",
    classes: "bg-[#D1FAE5] text-[#065F46] dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/40"
  };
}

export default function GlobalAuditLogsTab({ showToast }) {
  const [logs, setLogs] = useState([])
  const [offices, setOffices] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [manualLoading, setManualLoading] = useState(false)
  const [logStats, setLogStats] = useState(null)

  // Filters State
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const [search, setSearch] = useState("")
  const [localSearch, setLocalSearch] = useState("")
  const [officeFilter, setOfficeFilter] = useState("All")
  const [severityFilter, setSeverityFilter] = useState("All")
  const [roleFilter, setRoleFilter] = useState("All")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [sortBy, setSortBy] = useState("created_at")
  const [sortOrder, setSortOrder] = useState("DESC")

  // Modal / Sheet State
  const [selectedLog, setSelectedLog] = useState(null)
  const [expandedRows, setExpandedRows] = useState({})
  const [isExporting, setIsExporting] = useState(false)
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false)

  // PDF Preview State
  const [pdfPreviewOpen, setPdfPreviewOpen] = useState(false)
  const [pdfBlobUrl, setPdfPreviewUrl] = useState(null)
  const [previewFrameReady, setPreviewFrameReady] = useState(false)
  const [isFullscreenPreview, setIsFullscreenPreview] = useState(false)

  // Debounced search effect
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
        setOffices(json.data)
      }
    } catch {}
  }, [])

  const fetchLogs = useCallback(async (isManual = false) => {
    if (isManual) setManualLoading(true)
    else setLoading(true)

    try {
      const officeQuery = officeFilter !== "All" ? `&officeId=${encodeURIComponent(officeFilter)}` : ""
      const roleQuery = roleFilter !== "All" ? `&role=${encodeURIComponent(roleFilter)}` : ""
      const severityQuery = severityFilter !== "All" ? `&severity=${encodeURIComponent(severityFilter)}` : ""
      const searchQuery = search ? `&search=${encodeURIComponent(search)}` : ""
      const startQuery = startDate ? `&startDate=${encodeURIComponent(startDate)}` : ""
      const endQuery = endDate ? `&endDate=${encodeURIComponent(endDate)}` : ""
      const sortQuery = `&sortBy=${sortBy}&sortOrder=${sortOrder}`
      const offset = (page - 1) * limit

      const res = await fetch(`/api/audit-logs/global?limit=${limit}&offset=${offset}${officeQuery}${roleQuery}${severityQuery}${searchQuery}${startQuery}${endQuery}${sortQuery}`)
      const json = await res.json()

      if (res.ok && json.ok) {
        setLogs(
          (json.data || []).map((r) => ({
            id: `${r.log_source || 'global'}-${r.office_id || 'global'}-${r.id}`,
            rawId: r.id,
            time: formatPHDateTime(r.created_at),
            user: r.actor,
            actor: r.actor,
            role: r.role,
            office_id: r.office_id,
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
          }))
        )
        setTotal(json.total || 0)
      } else {
        showToast(json.error || "Failed to fetch audit logs", true)
      }
    } catch (err) {
      showToast("Network error fetching audit logs", true)
    } finally {
      setLoading(false)
      setManualLoading(false)
    }
  }, [page, limit, officeFilter, roleFilter, severityFilter, search, startDate, endDate, sortBy, sortOrder, showToast])

  const fetchStats = useCallback(async () => {
    try {
      const officeQuery = officeFilter !== "All" ? `&officeId=${encodeURIComponent(officeFilter)}` : ""
      const roleQuery = roleFilter !== "All" ? `&role=${encodeURIComponent(roleFilter)}` : ""
      const severityQuery = severityFilter !== "All" ? `&severity=${encodeURIComponent(severityFilter)}` : ""
      const searchQuery = search ? `&search=${encodeURIComponent(search)}` : ""
      const startQuery = startDate ? `&startDate=${encodeURIComponent(startDate)}` : ""
      const endQuery = endDate ? `&endDate=${encodeURIComponent(endDate)}` : ""

      const res = await fetch(`/api/audit-logs/global/stats?${officeQuery}${roleQuery}${severityQuery}${searchQuery}${startQuery}${endQuery}`)
      const json = await res.json()
      if (res.ok && json.ok) {
        setLogStats(json.data)
      }
    } catch {}
  }, [officeFilter, roleFilter, severityFilter, search, startDate, endDate])

  useEffect(() => {
    fetchOffices()
  }, [fetchOffices])

  useEffect(() => {
    fetchLogs()
    fetchStats()
  }, [fetchLogs, fetchStats])

  const handleRefresh = () => {
    fetchLogs(true)
    fetchStats()
  }

  const handleSort = (column) => {
    if (sortBy === column) {
      setSortOrder(prev => (prev === "ASC" ? "DESC" : "ASC"))
    } else {
      setSortBy(column)
      setSortOrder("ASC")
    }
    setPage(1)
  }

  const handleToggleRow = (id) => {
    setExpandedRows(prev => ({
      ...prev,
      [id]: !prev[id]
    }))
  }

  const handleCopy = (text, label) => {
    if (!text) return
    navigator.clipboard.writeText(text)
    showToast(`${label} copied to clipboard.`)
  }

  const handleDownloadCSV = async () => {
    if (total === 0 || isExporting) return
    setIsExporting(true)
    try {
      const officeQuery = officeFilter !== "All" ? `&officeId=${encodeURIComponent(officeFilter)}` : ""
      const roleQuery = roleFilter !== "All" ? `&role=${encodeURIComponent(roleFilter)}` : ""
      const sevQuery = severityFilter !== "All" ? `&severity=${encodeURIComponent(severityFilter)}` : ""
      const searchQuery = search ? `&search=${encodeURIComponent(search)}` : ""
      const startQuery = startDate ? `&startDate=${encodeURIComponent(startDate)}` : ""
      const endQuery = endDate ? `&endDate=${encodeURIComponent(endDate)}` : ""
      const sortQuery = `&sortBy=${sortBy}&sortOrder=${sortOrder}`

      const res = await fetch(`/api/audit-logs/global?limit=1000000${officeQuery}${roleQuery}${sevQuery}${searchQuery}${startQuery}${endQuery}${sortQuery}`)
      const json = await res.json()
      if (!res.ok || !json.ok) throw new Error(json.error || "Export failed")

      const allLogs = json.data || []
      const headers = ["Date & Time", "Severity", "Office Scope", "Actor", "Role", "Action", "Details", "IP Address", "User Agent", "Entity Type", "Entity ID"]
      const rows = allLogs.map((log) => {
        const office = offices.find(o => o.id === log.office_id);
        const scope = office ? office.short_name : "Global";
        return [
          formatPHDateTime(log.created_at),
          log.severity || "INFO",
          scope,
          log.actor,
          log.role,
          log.action,
          log.details || "—",
          log.ip || "—",
          log.user_agent || "—",
          log.entity_type || "—",
          log.entity_id || "—",
        ]
      })
      const csvContent = [
        headers.join(","),
        ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")),
      ].join("\n")
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
      const fileName = generateExportFilename("GLOBAL-AUDIT-LOGS", "DATA", "csv")
      const link = document.createElement("a")
      const url = URL.createObjectURL(blob)
      link.setAttribute("href", url)
      link.setAttribute("download", fileName)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      showToast("Audit logs exported to CSV successfully.")
    } catch (err) {
      showToast("Unable to export audit logs to CSV.", true)
    } finally {
      setIsExporting(false)
    }
  }

  const handlePreviewPDF = async () => {
    if (total === 0 || isGeneratingPdf) return
    setIsGeneratingPdf(true)
    try {
      const officeQuery = officeFilter !== "All" ? `&officeId=${encodeURIComponent(officeFilter)}` : ""
      const roleQuery = roleFilter !== "All" ? `&role=${encodeURIComponent(roleFilter)}` : ""
      const sevQuery = severityFilter !== "All" ? `&severity=${encodeURIComponent(severityFilter)}` : ""
      const searchQuery = search ? `&search=${encodeURIComponent(search)}` : ""
      const startQuery = startDate ? `&startDate=${encodeURIComponent(startDate)}` : ""
      const endQuery = endDate ? `&endDate=${encodeURIComponent(endDate)}` : ""
      const sortQuery = `&sortBy=${sortBy}&sortOrder=${sortOrder}`

      const res = await fetch(`/api/audit-logs/global?limit=1000000${officeQuery}${roleQuery}${sevQuery}${searchQuery}${startQuery}${endQuery}${sortQuery}`)
      const json = await res.json()
      if (!res.ok || !json.ok) throw new Error(json.error || "Export failed")

      const allLogs = json.data || []
      const blob = await generateAuditLogsPdf(allLogs, {
        role: roleFilter,
        severity: severityFilter,
        startDate: startDate,
        endDate: endDate,
        search: search
      })
      const url = URL.createObjectURL(blob)
      setPdfPreviewUrl(url)
      setPdfPreviewOpen(true)
    } catch (err) {
      showToast("Unable to generate PDF report.", true)
    } finally {
      setIsGeneratingPdf(false)
    }
  }

  const handleDownloadFromPreview = () => {
    if (!pdfBlobUrl) return
    try {
      const fileName = generateExportFilename("GLOBAL-AUDIT-LOGS", "REPORT", "pdf")
      const link = document.createElement("a")
      link.href = pdfBlobUrl
      link.setAttribute("download", fileName)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      showToast("Audit logs report has been downloaded successfully.")
    } catch (err) {
      showToast("Unable to download the PDF report.", true)
    }
  }

  const handleQuickRange = (range) => {
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
    const yesterdayStr = format(yesterday, "yyyy-MM-dd")
    if (startDate === yesterdayStr && endDate === yesterdayStr) return "yesterday"

    const last7 = new Date()
    last7.setDate(last7.getDate() - 7)
    const last7Str = format(last7, "yyyy-MM-dd")
    if (startDate === last7Str && endDate === todayStr) return "last7"

    const last30 = new Date()
    last30.setDate(last30.getDate() - 30)
    const last30Str = format(last30, "yyyy-MM-dd")
    if (startDate === last30Str && endDate === todayStr) return "last30"

    return null
  })()

  const hasActiveFilters = localSearch !== "" || officeFilter !== "All" || roleFilter !== "All" || severityFilter !== "All" || startDate !== "" || endDate !== ""

  const totalPages = Math.ceil(total / limit) || 1
  const displayPage = Math.min(page, totalPages)

  return (
    <TooltipProvider delay={200}>
      <div className="animate-fade-up font-inter flex w-full flex-col gap-6 max-w-6xl mx-auto">

        {/* Stat Cards */}
        <StatCards isLoading={loading && !manualLoading} logStats={logStats} />

        {/* Main Table Card */}
        <Card className="flex h-auto w-full flex-col p-0 gap-0 overflow-hidden rounded-xl border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-card dark:shadow-none">
          <PageHeader
            icon="ph-shield-check"
            title="Platform Audit Trail"
            description="Trace system activities, security events, and administrative actions across all database environments."
            showBorder={false}
            titleClassName="text-[18px] font-semibold tracking-[-0.01em] text-gray-900 dark:text-zinc-50"
            descriptionClassName="text-[13px] font-normal text-gray-500 dark:text-zinc-400 mt-[4px]"
            actions={
              <div className="flex items-center gap-6">
                <RefreshButton
                  onRefresh={handleRefresh}
                  isLoading={manualLoading}
                  title="Refresh Audit Logs"
                />

                <div className="h-6 w-px bg-gray-200 dark:bg-zinc-800" />

                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleDownloadCSV}
                    disabled={total === 0 || isExporting || isGeneratingPdf}
                    className="h-10 w-[68px] justify-center font-semibold text-sm text-gray-600 hover:text-gray-900 hover:bg-transparent dark:text-zinc-400 dark:hover:text-zinc-200 dark:hover:bg-transparent transition-colors flex items-center rounded-brand shadow-none! border-0!"
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
                    size="sm"
                    onClick={handlePreviewPDF}
                    disabled={total === 0 || isExporting || isGeneratingPdf}
                    className="flex h-[36px] w-[142px] items-center justify-center rounded-[8px] btn-brand-red text-[13px] font-medium text-white active:scale-95 disabled:opacity-50 transition-all dark:shadow-none"
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

          {/* Active Filter Chips */}
          {hasActiveFilters && (
            <div className="flex-none border-b border-gray-100 bg-white px-6 py-3 animate-in fade-in slide-in-from-top-1 duration-300 dark:border-white/10 dark:bg-card">
              <div className="flex flex-wrap items-center gap-2">
                <span className="mr-1 text-[11px] font-medium uppercase tracking-[0.04em] text-gray-400 dark:text-zinc-500">Active filters:</span>
                {localSearch && (
                  <div className="flex items-center gap-[6px] rounded-[6px] bg-gray-100 dark:bg-zinc-800 px-[10px] py-[4px] text-[12px] font-normal text-gray-900 dark:text-zinc-50">
                    Search: {localSearch}
                    <button
                      onClick={() => { setLocalSearch(""); setSearch(""); setPage(1); }}
                      className="text-[12px] text-gray-400 hover:text-gray-600 dark:text-zinc-500 dark:hover:text-zinc-300 transition-colors cursor-pointer border-0 bg-transparent p-0 leading-none"
                    >
                      ×
                    </button>
                  </div>
                )}
                {officeFilter !== "All" && (
                  <div className="flex items-center gap-[6px] rounded-[6px] bg-gray-100 dark:bg-zinc-800 px-[10px] py-[4px] text-[12px] font-normal text-gray-900 dark:text-zinc-50">
                    Office: {officeFilter === "global" ? "Global" : offices.find(o => o.id === officeFilter)?.short_name || officeFilter}
                    <button
                      onClick={() => { setOfficeFilter("All"); setPage(1); }}
                      className="text-[12px] text-gray-400 hover:text-gray-600 dark:text-zinc-500 dark:hover:text-zinc-300 transition-colors cursor-pointer border-0 bg-transparent p-0 leading-none"
                    >
                      ×
                    </button>
                  </div>
                )}
                {roleFilter !== "All" && (
                  <div className="flex items-center gap-[6px] rounded-[6px] bg-gray-100 dark:bg-zinc-800 px-[10px] py-[4px] text-[12px] font-normal text-gray-900 dark:text-zinc-50">
                    Role: {roleFilter}
                    <button
                      onClick={() => { setRoleFilter("All"); setPage(1); }}
                      className="text-[12px] text-gray-400 hover:text-gray-600 dark:text-zinc-500 dark:hover:text-zinc-300 transition-colors cursor-pointer border-0 bg-transparent p-0 leading-none"
                    >
                      ×
                    </button>
                  </div>
                )}
                {severityFilter !== "All" && (
                  <div className="flex items-center gap-[6px] rounded-[6px] bg-gray-100 dark:bg-zinc-800 px-[10px] py-[4px] text-[12px] font-normal text-gray-900 dark:text-zinc-50">
                    Severity: {severityFilter}
                    <button
                      onClick={() => { setSeverityFilter("All"); setPage(1); }}
                      className="text-[12px] text-gray-400 hover:text-gray-600 dark:text-zinc-500 dark:hover:text-zinc-300 transition-colors cursor-pointer border-0 bg-transparent p-0 leading-none"
                    >
                      ×
                    </button>
                  </div>
                )}
                {(startDate || endDate) && (
                  <div className="flex items-center gap-[6px] rounded-[6px] bg-gray-100 dark:bg-zinc-800 px-[10px] py-[4px] text-[12px] font-normal text-gray-900 dark:text-zinc-50">
                    {startDate ? format(new Date(startDate), "MMM d, yyyy") : "..."} – {endDate ? format(new Date(endDate), "MMM d, yyyy") : "..."}
                    <button
                      onClick={() => { setStartDate(""); setEndDate(""); setPage(1); }}
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
                    setLocalSearch("")
                    setSearch("")
                    setOfficeFilter("All")
                    setRoleFilter("All")
                    setSeverityFilter("All")
                    setStartDate("")
                    setEndDate("")
                    setPage(1)
                  }}
                  className="h-auto text-[12px] font-medium text-gray-400 dark:text-zinc-500 border-0 bg-transparent hover:bg-transparent shadow-none p-0 hover:text-red-600 dark:hover:text-red-500 transition-colors cursor-pointer"
                >
                  Clear
                </Button>
              </div>
            </div>
          )}

          {/* Filters Bar */}
          <div className="bg-white border-t border-gray-100 p-4 backdrop-blur-md dark:bg-card/50 dark:border-white/10">
            <div className="flex w-full flex-wrap items-center gap-5">
              {/* Search */}
              <div className="flex-[2] min-w-[240px] group relative">
                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                  <i className="ph-bold ph-magnifying-glass text-gray-400 transition-colors group-focus-within:text-pup-maroon dark:text-zinc-500 text-sm"></i>
                </div>
                <Input
                  type="text"
                  placeholder="Search by actor, action, or details..."
                  className="h-[36px] w-full rounded-[8px] border-[0.5px] border-gray-200 bg-white pl-9 pr-20 text-[13px] font-normal transition-all focus:border-pup-maroon/30 focus:ring-4 focus:ring-pup-maroon/5 placeholder:text-gray-400 dark:border-white/10 dark:bg-card dark:text-zinc-300 dark:focus:border-primary"
                  value={localSearch}
                  onChange={(e) => setLocalSearch(e.target.value)}
                />
                <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-[12px] font-normal text-gray-400 dark:text-zinc-500">
                  {total > 0 ? `${total.toLocaleString()} results` : "0 results"}
                </div>
              </div>

              {/* Office Select */}
              <div className="min-w-[120px] flex-1">
                <Select
                  value={officeFilter}
                  onChange={(val) => { setOfficeFilter(val.target.value); setPage(1); }}
                  className="h-[36px] rounded-[8px] border-[0.5px] border-gray-200 text-[13px] font-normal"
                >
                  <option value="All">All Offices</option>
                  <option value="global">Global (Platform)</option>
                  {offices.map((o) => (
                    <option key={o.id} value={o.id}>{o.short_name}</option>
                  ))}
                </Select>
              </div>

              {/* Role Select */}
              <div className="min-w-[100px] flex-1">
                <Select
                  value={roleFilter}
                  onChange={(val) => { setRoleFilter(val.target.value); setPage(1); }}
                  className="h-[36px] rounded-[8px] border-[0.5px] border-gray-200 text-[13px] font-normal"
                >
                  <option value="All">Role</option>
                  <option value="SuperAdmin">SuperAdmin</option>
                  <option value="Admin">Admin</option>
                  <option value="Staff">Staff</option>
                  <option value="System">System</option>
                </Select>
              </div>

              {/* Severity Select */}
              <div className="min-w-[110px] flex-1">
                <Select
                  value={severityFilter}
                  onChange={(val) => { setSeverityFilter(val.target.value); setPage(1); }}
                  className="h-[36px] rounded-[8px] border-[0.5px] border-gray-200 text-[13px] font-normal"
                >
                  <option value="All">Severity</option>
                  <option value="INFO">Information</option>
                  <option value="WARNING">Warning</option>
                  <option value="CRITICAL">Critical</option>
                </Select>
              </div>

              {/* Shortcuts */}
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
                <div className="w-[120px]">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "h-[36px] w-full justify-start rounded-[8px] border-[0.5px] border-gray-200 dark:border-white/10 bg-white dark:bg-card text-left text-[13px] font-normal shadow-xs transition-all hover:bg-gray-50 dark:hover:bg-white/10",
                          !startDate ? "text-gray-400 dark:text-zinc-500" : "text-gray-700 dark:text-zinc-200"
                        )}
                      >
                        {startDate ? format(new Date(startDate), "MMM d, yyyy") : "Start Date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto rounded-2xl border border-gray-200 bg-white p-0 shadow-2xl dark:border-white/10 dark:bg-card" align="start">
                      <Calendar
                        mode="single"
                        selected={startDate ? new Date(startDate) : undefined}
                        onSelect={(date) => {
                          setStartDate(date ? format(date, "yyyy-MM-dd") : "")
                          setPage(1)
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="text-[12px] text-gray-400 dark:text-zinc-500 shrink-0">→</div>
                <div className="w-[120px]">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "h-[36px] w-full justify-start rounded-[8px] border-[0.5px] border-gray-200 dark:border-white/10 bg-white dark:bg-card text-left text-[13px] font-normal shadow-xs transition-all hover:bg-gray-50 dark:hover:bg-white/10",
                          !endDate ? "text-gray-400 dark:text-zinc-500" : "text-gray-700 dark:text-zinc-200"
                        )}
                      >
                        {endDate ? format(new Date(endDate), "MMM d, yyyy") : "End Date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto rounded-2xl border border-gray-200 bg-white p-0 shadow-2xl dark:border-white/10 dark:bg-card" align="start">
                      <Calendar
                        mode="single"
                        selected={endDate ? new Date(endDate) : undefined}
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

          {/* Logs Table */}
          {loading && (!logs || logs.length === 0) ? (
            <div className="p-4 space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-8 w-full bg-gray-50 dark:bg-muted rounded-md" />
              ))}
            </div>
          ) : (
            <div className="flex flex-col flex-1 min-h-0">
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="sticky top-0 z-10 border-b border-gray-200 bg-white dark:bg-card dark:border-white/10">
                    <tr className="text-left text-[12px] font-medium tracking-[0.04em] text-gray-400 dark:text-zinc-500 h-[46px]">
                      <th className="w-12 p-4 text-center"></th>
                      <th className="p-4">
                        <button
                          onClick={() => handleSort("created_at")}
                          className="group flex items-center transition-colors hover:text-pup-maroon dark:hover:text-red-500 focus:outline-none text-[12px] font-medium tracking-[0.04em]"
                        >
                          Timestamp
                          <SortIndicator column="created_at" sortBy={sortBy} sortOrder={sortOrder} />
                        </button>
                      </th>
                      <th className="p-4">
                        <button
                          onClick={() => handleSort("severity")}
                          className="group flex items-center transition-colors hover:text-pup-maroon dark:hover:text-red-500 focus:outline-none text-[12px] font-medium tracking-[0.04em]"
                        >
                          Level
                          <SortIndicator column="severity" sortBy={sortBy} sortOrder={sortOrder} />
                        </button>
                      </th>
                      <th className="p-4">
                        <button
                          onClick={() => handleSort("actor")}
                          className="group flex items-center transition-colors hover:text-pup-maroon dark:hover:text-red-500 focus:outline-none text-[12px] font-medium tracking-[0.04em]"
                        >
                          Actor
                          <SortIndicator column="actor" sortBy={sortBy} sortOrder={sortOrder} />
                        </button>
                      </th>
                      <th className="p-4">Scope</th>
                      <th className="p-4">
                        <button
                          onClick={() => handleSort("action")}
                          className="group flex items-center transition-colors hover:text-pup-maroon dark:hover:text-red-500 focus:outline-none text-[12px] font-medium tracking-[0.04em]"
                        >
                          Action
                          <SortIndicator column="action" sortBy={sortBy} sortOrder={sortOrder} />
                        </button>
                      </th>
                      <th className="p-4">Description</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-100 dark:divide-white/5 font-medium text-gray-900 dark:text-zinc-100">
                    {logs.length === 0 ? (
                      <tr className="border-0 hover:bg-transparent">
                        <td colSpan={8} className="p-12 text-center text-gray-550">
                          <div className="h-64 flex flex-col items-center justify-center">
                            <div className="w-16 h-16 rounded-full bg-white border border-gray-150 flex items-center justify-center mb-4 shadow-xs dark:bg-zinc-900 dark:border-white/5">
                              <i className="ph-duotone ph-magnifying-glass text-3xl text-gray-400"></i>
                            </div>
                            <span className="font-semibold text-gray-800 dark:text-zinc-200 text-base">No activity logs found</span>
                            <span className="text-xs text-gray-500 mt-1 max-w-sm">No audit trail events match your current filter parameters. Try resetting filters.</span>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      logs.map((log) => {
                        const severityInfo = getSeverityInfo(log.severity)
                        const office = offices.find(o => o.id === log.office_id)
                        const isExpanded = !!expandedRows[log.id]
                        const isSelected = selectedLog?.id === log.id

                        return (
                          <React.Fragment key={log.id}>
                            <tr
                              className={cn(
                                "group h-[52px] border-b-[0.5px] border-gray-100 dark:border-white/10 last:border-b-0 transition-all duration-200 hover:bg-gray-50/40 dark:bg-card dark:hover:bg-white/2 select-none cursor-pointer",
                                isSelected && "bg-blue-50/60 dark:bg-blue-950/20",
                                isExpanded && "bg-gray-50 dark:bg-white/8"
                              )}
                              onClick={() => handleToggleRow(log.id)}
                            >
                              <td className="py-0 px-4 align-middle text-center" onClick={(e) => e.stopPropagation()}>
                                <button
                                  onClick={() => handleToggleRow(log.id)}
                                  className="mx-auto flex h-7 w-7 items-center justify-center bg-transparent border-none text-[#8E8E93] hover:text-[#111111] dark:hover:text-zinc-200 cursor-pointer transition-transform duration-200"
                                  style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
                                >
                                  <i className="ti ti-chevron-down text-[14px]"></i>
                                </button>
                              </td>
                              <td className="py-0 px-4 align-middle text-[13px] font-normal text-gray-500 dark:text-zinc-400">
                                {log.time}
                              </td>
                              <td className="py-0 px-4 align-middle">
                                <span
                                  className={cn(
                                    "inline-flex w-fit items-center justify-center rounded-[4px] px-[8px] py-[3px] text-[11px] font-medium tracking-[0.04em] shadow-none transition-all border",
                                    severityInfo.classes
                                  )}
                                >
                                  {severityInfo.label}
                                </span>
                              </td>
                              <td className="py-0 px-4 align-middle">
                                <div className="flex flex-col overflow-hidden">
                                  <span className="truncate text-[13px] font-medium text-[#111111] dark:text-zinc-50">
                                    {log.user}
                                  </span>
                                  <span className="truncate text-[12px] font-normal text-[#8E8E93] mt-[2px]">
                                    {log.role}
                                  </span>
                                </div>
                              </td>
                              <td className="py-0 px-4 align-middle text-[13px]">
                                {office ? (
                                  <span className="font-semibold text-gray-800 dark:text-zinc-300">{office.short_name}</span>
                                ) : (
                                  <span className="text-blue-600 dark:text-blue-400 font-semibold uppercase text-[10px]">Global</span>
                                )}
                              </td>
                              <td className="py-0 px-4 align-middle text-[13px] font-medium text-[#111111] dark:text-zinc-50">
                                {log.action}
                              </td>
                              <td className="py-0 px-4 align-middle max-w-xs truncate text-[13px] font-normal text-[#8E8E93]">
                                {log.details}
                              </td>
                              <td className="py-0 px-4 align-middle text-right" onClick={(e) => e.stopPropagation()}>
                                <div className="flex items-center justify-end">
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <button
                                        onClick={() => setSelectedLog(log)}
                                        className="w-7 h-7 rounded-[6px] hover:bg-[rgba(0,0,0,0.06)] dark:hover:bg-white/10 text-[#C7C7CC] hover:text-red-800 dark:hover:text-red-400 focus:outline-none cursor-pointer active:scale-95 flex items-center justify-center transition-colors"
                                      >
                                        <i className="ti ti-eye text-[16px]"></i>
                                      </button>
                                    </TooltipTrigger>
                                    <TooltipContent className="bg-zinc-900 text-white border-zinc-800">
                                      <p className="text-[10px] font-semibold">View Detail</p>
                                      <p className="text-[9px] opacity-80">Open full metadata details</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </div>
                              </td>
                            </tr>
                            {isExpanded && (
                              <tr className="border-0 bg-gray-50/50 dark:bg-zinc-950/20">
                                <td colSpan={8} className="p-0 border-0">
                                  <div className="flex flex-col gap-4 p-5 pl-16 border-b border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-zinc-950/10 font-inter">
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                                      <div>
                                        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">IP Address</div>
                                        <div className="text-xs font-mono text-gray-800 dark:text-zinc-300 flex items-center gap-1.5">
                                          {log.ip}
                                          <button onClick={() => handleCopy(log.ip, "IP Address")} className="text-gray-400 hover:text-gray-600 dark:hover:text-zinc-200 cursor-pointer">
                                            <i className="ti ti-copy text-[12px]"></i>
                                          </button>
                                        </div>
                                      </div>
                                      <div>
                                        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Entity Reference</div>
                                        <div className="text-xs text-gray-800 dark:text-zinc-300">
                                          {log.entityType ? `${log.entityType} (#${log.entityId})` : "—"}
                                        </div>
                                      </div>
                                      <div className="lg:col-span-2">
                                        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">User Agent</div>
                                        <div className="text-xs text-gray-600 dark:text-zinc-400 truncate max-w-sm" title={log.userAgent}>
                                          {log.userAgent}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Table Pagination footer */}
              {total > 0 && (
                <div className="flex items-center justify-between border-t border-gray-100 bg-white p-6 px-8 dark:border-white/10 dark:bg-card">
                  <div className="flex items-center gap-8">
                    <div className="flex items-center gap-6 text-[12px] font-normal text-gray-400 dark:text-zinc-500">
                      <span>Showing {logs.length} of {total}</span>
                      <div className="flex items-center gap-1.5 border-l border-gray-200 pl-6 dark:border-white/10">
                        <span className="text-[12px] text-gray-400 dark:text-zinc-500">Rows:</span>
                        <div className="flex items-center gap-1">
                          {[10, 20, 50, 100].map((size) => (
                            <button
                              key={size}
                              type="button"
                              onClick={() => {
                                setLimit(size)
                                setPage(1)
                              }}
                              className={`px-2 py-0.5 rounded-[4px] text-[12px] font-normal cursor-pointer transition-colors border-0 ${
                                limit === size
                                  ? "bg-gray-100 text-[#111111] font-medium dark:bg-white/10 dark:text-zinc-50"
                                  : "bg-transparent text-gray-450 dark:text-zinc-550 hover:text-gray-700 dark:hover:text-zinc-300"
                              }`}
                            >
                              {size}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-3">
                    <button
                      disabled={displayPage <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      className="h-8 bg-transparent text-[12px] font-normal text-gray-400 hover:text-pup-maroon dark:text-zinc-500 dark:hover:text-zinc-200 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer border-0 p-0"
                    >
                      Prev
                    </button>

                    <div className="flex h-8 min-w-[32px] items-center justify-center rounded-[6px] border border-gray-200/80 bg-white px-2.5 text-[12px] font-medium text-gray-900 dark:border-white/10 dark:bg-card dark:text-zinc-100">
                      {displayPage}
                    </div>

                    <button
                      disabled={displayPage >= totalPages}
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      className="h-8 bg-transparent text-[12px] font-normal text-gray-400 hover:text-pup-maroon dark:text-zinc-500 dark:hover:text-zinc-200 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer border-0 p-0"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </Card>

        {/* Log Detail Side Sheet */}
        <Sheet open={!!selectedLog} onOpenChange={(open) => !open && setSelectedLog(null)}>
          <SheetContent
            className="font-inter flex flex-col border-l bg-white p-[24px_20px] shadow-none sm:max-w-[360px] w-[360px] dark:border-white/10 dark:bg-[#121214]"
            style={{ borderLeft: '0.5px solid rgba(0,0,0,0.08)' }}
          >
            <SheetHeader className="shrink-0 p-0 mb-6 border-b-0 bg-transparent text-left relative">
              <div className="flex flex-col text-left">
                <SheetTitle className="text-left text-[18px] font-semibold tracking-[-0.01em] text-[#111111] dark:text-zinc-50">
                  Log Detail Entry
                </SheetTitle>
                <SheetDescription className="mt-[2px] text-left text-[12px] font-normal text-[#8E8E93]">
                  Platform Level Log ID: {selectedLog?.rawId || selectedLog?.id}
                </SheetDescription>
              </div>
            </SheetHeader>

            {selectedLog && (() => {
              const severityInfo = getSeverityInfo(selectedLog.severity)
              const office = offices.find(o => o.id === selectedLog.office_id)
              const initials = (selectedLog.user || "System")
                .split(" ")
                .map((n) => n[0])
                .join("")
                .slice(0, 2)
                .toUpperCase()

              return (
                <div className="flex-1 space-y-6 overflow-y-auto pr-1 -mr-1 pb-24">

                  {/* Timestamp & Severity */}
                  <div className="flex justify-between items-end pb-4 border-b border-black/5 dark:border-white/5">
                    <div>
                      <p className="text-[11px] font-medium uppercase tracking-[0.04em] text-[#8E8E93] mb-1">Timestamp</p>
                      <p className="text-[13px] font-normal text-[#111111] dark:text-zinc-150">{selectedLog.time}</p>
                    </div>
                    <div className="text-right flex flex-col items-end">
                      <p className="text-[11px] font-medium uppercase tracking-[0.04em] text-[#8E8E93] mb-1">Severity</p>
                      <span className={cn("inline-flex w-fit items-center justify-center rounded-[4px] px-[8px] py-[3px] text-[11px] font-medium tracking-[0.04em] border", severityInfo.classes)}>
                        {severityInfo.label}
                      </span>
                    </div>
                  </div>

                  {/* Office Scope Section */}
                  <div className="flex flex-col">
                    <div className="flex items-center gap-[6px] mb-[10px]">
                      <i className="ti ti-building text-[14px] text-gray-400"></i>
                      <h4 className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[#8E8E93]">Scope / Partition</h4>
                    </div>
                    <div className="bg-white dark:bg-card p-[16px] rounded-[8px] border border-black/5 dark:border-white/5">
                      <p className="text-[13px] font-semibold text-gray-900 dark:text-zinc-50">
                        {office ? office.name : "Platform Management"}
                      </p>
                      <p className="mt-0.5 text-[11px] text-gray-400 font-mono">
                        {selectedLog.office_id ? `OFFICE_ID: ${selectedLog.office_id}` : "SCOPE: GLOBAL"}
                      </p>
                    </div>
                  </div>

                  {/* Actor Section */}
                  <div className="flex flex-col">
                    <div className="flex items-center gap-[6px] mb-[10px]">
                      <i className="ti ti-user text-[14px] text-gray-400"></i>
                      <h4 className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[#8E8E93]">Actor</h4>
                    </div>
                    <div className="flex items-center gap-3 bg-white dark:bg-card p-[16px] rounded-[8px] border border-black/5 dark:border-white/5">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-black/5 bg-gray-50 dark:border-white/5 dark:bg-zinc-800">
                        <span className="text-[12px] font-medium text-[#8E8E93]">{initials}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="truncate text-[13px] font-medium text-[#111111] dark:text-zinc-50">{selectedLog.user}</p>
                        <p className="mt-0.5 text-[12px] font-normal text-[#8E8E93]">{selectedLog.role}</p>
                      </div>
                    </div>
                  </div>

                  {/* Event Details */}
                  <div className="flex flex-col">
                    <div className="flex items-center gap-[6px] mb-[10px]">
                      <i className="ti ti-file-text text-[14px] text-gray-400"></i>
                      <h4 className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[#8E8E93]">Details</h4>
                    </div>
                    <div className="space-y-[16px] bg-white dark:bg-card p-[16px] rounded-[8px] border border-black/5 dark:border-white/5">
                      <div>
                        <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.04em] text-[#8E8E93]">Action</p>
                        <p className="text-[13px] font-semibold text-[#111111] dark:text-zinc-50">{selectedLog.action}</p>
                      </div>

                      <div className="border-t border-black/5 pt-[16px] dark:border-white/5">
                        <div className="mb-1 flex items-center justify-between">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[#8E8E93]">Description</p>
                          <button
                            onClick={() => handleCopy(selectedLog.details, "Description")}
                            className="w-7 h-7 rounded-[6px] hover:bg-[rgba(0,0,0,0.06)] dark:hover:bg-white/10 text-[#C7C7CC] hover:text-[#111111] dark:hover:text-zinc-100 focus:outline-none cursor-pointer active:scale-95 flex items-center justify-center transition-colors border-0 bg-transparent"
                          >
                            <i className="ti ti-copy text-[14px]"></i>
                          </button>
                        </div>
                        <p className="text-[13px] font-normal text-gray-600 dark:text-zinc-300 whitespace-pre-line leading-relaxed">
                          {selectedLog.details}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Context Info */}
                  <div className="flex flex-col">
                    <div className="flex items-center gap-[6px] mb-[10px]">
                      <i className="ti ti-info-circle text-[14px] text-gray-400"></i>
                      <h4 className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[#8E8E93]">Metadata Context</h4>
                    </div>
                    <div className="space-y-3 bg-white dark:bg-card p-[16px] rounded-[8px] border border-black/5 dark:border-white/5">
                      <div>
                        <p className="text-[11px] text-[#8E8E93]">IP Address</p>
                        <p className="text-[13px] font-mono text-[#111111] dark:text-zinc-150 mt-0.5">{selectedLog.ip}</p>
                      </div>
                      <div className="border-t border-black/5 pt-2 dark:border-white/5">
                        <p className="text-[11px] text-[#8E8E93]">Entity Type & Reference</p>
                        <p className="text-[13px] text-[#111111] dark:text-zinc-150 mt-0.5">
                          {selectedLog.entityType ? `${selectedLog.entityType} (#${selectedLog.entityId})` : "None"}
                        </p>
                      </div>
                      <div className="border-t border-black/5 pt-2 dark:border-white/5">
                        <p className="text-[11px] text-[#8E8E93]">User Agent</p>
                        <p className="text-[12px] text-gray-500 dark:text-zinc-400 mt-0.5 break-all max-h-24 overflow-y-auto leading-relaxed scrollbar-thin">
                          {selectedLog.userAgent}
                        </p>
                      </div>
                    </div>
                  </div>

                </div>
              )
            })()}
          </SheetContent>
        </Sheet>

        {/* PDF Export Preview */}
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
