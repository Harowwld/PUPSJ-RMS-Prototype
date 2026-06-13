"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { TooltipProvider } from "@/components/ui/tooltip"
import { formatPHDateTime } from "@/lib/timeFormat"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { generateAuditLogsPdf } from "@/lib/pdfGenerator"
import { generateExportFilename } from "@/lib/exportHelpers"

import StatCards from "./audit-logs/StatCards"
import LogFilters from "./audit-logs/LogFilters"
import LogTable from "./audit-logs/LogTable"
import LogDetailSheet from "./audit-logs/LogDetailSheet"
import PdfPreviewDialog from "./audit-logs/PdfPreviewDialog"
import PageHeader from "@/components/shared/PageHeader"
import { RefreshButton } from "@/components/shared/RefreshButton"

export default function AuditLogsTab({
  displayLogs,
  logStats,
  isLoading = false,
  isManualLoading = false,
  error = null,
  logPage,
  setLogPage,
  logTotal,
  logsPerPage,
  setLogsPerPage,
  logSearch,
  setLogSearch,
  logRoleFilter,
  setLogRoleFilter,
  logSeverityFilter,
  setLogSeverityFilter,
  logStartDate,
  setLogStartDate,
  logEndDate,
  setLogEndDate,
  logSortBy,
  setLogSortBy,
  logSortOrder,
  setLogSortOrder,
  showToast,
  onLogAction,
  onRefresh,
}) {
  const logs = displayLogs || []
  const [localSearch, setLocalSearch] = useState(logSearch || "")
  const [itemsPerPage, setItemsPerPage] = useState(logsPerPage || 10)
  const [isExporting, setIsExporting] = useState(false)
  const [selectedLog, setSelectedLog] = useState(null)
  const [jumpPage, setJumpPage] = useState(String(logPage))

  // PDF Preview State
  const [pdfPreviewOpen, setPdfPreviewOpen] = useState(false)
  const [pdfBlobUrl, setPdfPreviewUrl] = useState(null)
  const [previewFrameReady, setPreviewFrameReady] = useState(false)
  const [isFullscreenPreview, setIsFullscreenPreview] = useState(false)

  useEffect(() => {
    setJumpPage(String(logPage))
  }, [logPage])

  // Debounced Search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localSearch !== logSearch) {
        setLogSearch(localSearch)
        setLogPage(1)
      }
    }, 500)
    return () => clearTimeout(timer)
  }, [localSearch, logSearch, setLogSearch, setLogPage])

  const handleSearchChange = (e) => setLocalSearch(e.target.value)
  const handleRoleChange = (e) => { setLogRoleFilter(e.target.value); setLogPage(1) }
  const handleSeverityChange = (e) => { setLogSeverityFilter(e.target.value); setLogPage(1) }
  const handleSort = (column) => {
    if (logSortBy === column) {
      if (logSortOrder === "ASC") {
        setLogSortOrder("DESC")
      } else if (column !== "created_at") {
        setLogSortBy("created_at")
        setLogSortOrder("DESC")
      } else {
        setLogSortOrder("ASC")
      }
    } else {
      setLogSortBy(column)
      setLogSortOrder("ASC")
    }
    setLogPage(1)
  }

  const fetchAllForExport = async () => {
    const roleQuery = logRoleFilter !== "All" ? `&role=${encodeURIComponent(logRoleFilter)}` : ""
    const sevQuery = logSeverityFilter !== "All" ? `&severity=${encodeURIComponent(logSeverityFilter)}` : ""
    const startQuery = logStartDate ? `&startDate=${encodeURIComponent(logStartDate)}` : ""
    const endQuery = logEndDate ? `&endDate=${encodeURIComponent(logEndDate)}` : ""
    const res = await fetch(
      `/api/audit-logs?limit=50000&search=${encodeURIComponent(logSearch)}${roleQuery}${sevQuery}${startQuery}${endQuery}&sortBy=${logSortBy}&sortOrder=${logSortOrder}`
    )
    const json = await res.json()
    if (!res.ok || !json.ok) throw new Error(json.error || "Export failed")
    return Array.isArray(json.data) ? json.data : []
  }

  const handleDownloadCSV = async () => {
    if (logTotal === 0 || isExporting) return
    setIsExporting(true)
    try {
      const allLogs = await fetchAllForExport()
      const headers = ["Date & Time", "Severity", "Actor", "Role", "Action", "Details", "IP Address", "User Agent", "Entity Type", "Entity ID"]
      const rows = allLogs.map((log) => [
        formatPHDateTime(log.created_at),
        log.severity || "INFO",
        log.actor,
        log.role,
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
      const fileName = generateExportFilename("AUDIT-LOGS", "DATA", "csv")
      const link = document.createElement("a")
      const url = URL.createObjectURL(blob)
      link.setAttribute("href", url)
      link.setAttribute("download", fileName)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      showToast({ title: "Export Success", description: "Audit logs have been exported to CSV successfully." })
      if (onLogAction) {
        onLogAction({
          action: "Exported Audit Logs to CSV",
          details: `Exported ${allLogs.length} records. Filters - Role: ${logRoleFilter}, Severity: ${logSeverityFilter}, Search: ${logSearch || "None"}`,
          severity: "INFO"
        })
      }
    } catch (err) {
      console.error("[Export Error]", err)
      showToast({ title: "Export Failed", description: err.message || "Unable to export audit logs to CSV." }, true)
    } finally {
      setIsExporting(false)
    }
  }

  const handlePreviewPDF = async () => {
    if (logTotal === 0 || isExporting) return
    setIsExporting(true)
    try {
      const allLogs = await fetchAllForExport()
      const blob = await generateAuditLogsPdf(allLogs, {
        role: logRoleFilter,
        severity: logSeverityFilter,
        startDate: logStartDate,
        endDate: logEndDate,
        search: logSearch
      })
      const url = URL.createObjectURL(blob)
      setPdfPreviewUrl(url)
      setPdfPreviewOpen(true)
      if (onLogAction) {
        onLogAction({
          action: "Generated Audit Logs PDF Report",
          details: `Generated report for ${allLogs.length} records. Filters - Role: ${logRoleFilter}, Severity: ${logSeverityFilter}`,
          severity: "INFO"
        })
      }
    } catch (err) {
      console.error("[PDF Preview Error]", err)
      showToast({ title: "Preview Failed", description: err.message || "Unable to generate PDF preview." }, true)
    } finally {
      setIsExporting(false)
    }
  }

  const handleDownloadFromPreview = () => {
    if (!pdfBlobUrl) return
    try {
      const fileName = generateExportFilename("AUDIT-LOGS", "REPORT", "pdf")
      const link = document.createElement("a")
      link.href = pdfBlobUrl
      link.setAttribute("download", fileName)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      showToast({ title: "Download Success", description: "Audit logs report has been downloaded successfully." })
    } catch (err) {
      console.error("[PDF Download Error]", err)
      showToast({ title: "Download Failed", description: "Unable to download the PDF report." }, true)
    }
  }

  const handleCopy = (text, label) => {
    if (!text) return
    navigator.clipboard.writeText(text)
    showToast({ title: "Copied to Clipboard", description: `${label} has been successfully copied to your clipboard.` })
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

  const hasActiveFilters = localSearch !== "" || logRoleFilter !== "All" || logSeverityFilter !== "All" || logStartDate !== "" || logEndDate !== "";

  return (
    <TooltipProvider delay={200}>
      <div className="animate-fade-up font-inter flex w-full flex-col gap-6">
        {/* Stat Cards */}
        <StatCards isLoading={isLoading && !isManualLoading} logStats={logStats} />

        {/* Main Table Card */}
        <Card className="flex h-auto w-full flex-col p-0 gap-0 overflow-hidden rounded-brand border border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-card dark:shadow-none">
          <PageHeader
            icon="ph-shield-check"
            title="Audit Logs"
            description="Trace system activities, security events, and administrative actions with precision."
            showBorder={false}
            actions={
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <Button
                    variant="default"
                    size="sm"
                    onClick={handlePreviewPDF}
                    disabled={logTotal === 0 || isExporting}
                    className="flex h-11 px-5 items-center justify-center gap-2 btn-brand-red text-[11px] font-black text-white active:scale-95 disabled:opacity-50 transition-all dark:shadow-none"
                  >
                    <i className={`ph-bold ${isExporting ? "ph-circle-notch animate-spin" : "ph-file-pdf"} text-base`}></i>
                    {isExporting ? "Generating..." : "Generate Report"}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDownloadCSV}
                    disabled={logTotal === 0 || isExporting}
                    className="flex h-9 px-4 items-center justify-center gap-1.5 rounded-brand border border-gray-300 bg-transparent text-[10px] font-bold text-gray-600 transition-colors hover:border-pup-maroon hover:bg-red-50/50 hover:text-pup-maroon dark:hover:text-red-500 active:scale-95 disabled:opacity-50 dark:bg-transparent dark:text-zinc-300 dark:border-white/10"
                  >
                    <i className={`ph-bold ${isExporting ? "ph-circle-notch animate-spin" : "ph-file-csv"} text-sm`}></i>
                    {isExporting ? "Preparing..." : "Export"}
                  </Button>
                </div>

                <div className="h-6 w-px bg-gray-200 dark:bg-zinc-800" />

                <RefreshButton 
                  onRefresh={onRefresh} 
                  isLoading={isManualLoading} 
                  title="Refresh Audit Logs"
                />
              </div>
            }
          />

          {/* Active Filter Chips Row */}
          {hasActiveFilters && (
            <div className={cn(
              "flex-none border-b border-gray-100 bg-white px-4 py-3 transition-all duration-500 animate-in fade-in slide-in-from-top-1 dark:border-white/10 dark:bg-card",
              (isLoading && !isManualLoading) ? "opacity-40 blur-[1px] grayscale-[0.1]" : "opacity-100"
            )}>
              <div className="flex flex-wrap items-center gap-2">
                <span className="mr-1 text-[10px] font-bold tracking-widest text-gray-400 dark:text-zinc-500">Active filters:</span>
                {localSearch && (
                  <div className="flex items-center gap-1 rounded-full border border-gray-300 bg-pup-maroon/10 px-2.5 py-1 text-[10px] font-bold text-pup-maroon dark:text-primary dark:border-white/10 dark:text-primary">
                    Search: {localSearch}
                    <button
                      onClick={() => { setLocalSearch(""); setLogSearch(""); setLogPage(1); }}
                      className="ml-1 hover:text-pup-darkMaroon transition-colors"
                    >
                      <i className="ph-bold ph-x text-[8px]"></i>
                    </button>
                  </div>
                )}
                {logRoleFilter !== "All" && (
                  <div className="flex items-center gap-1 rounded-full border border-blue-100/30 bg-blue-50 px-2.5 py-1 text-[10px] font-bold text-blue-600 dark:bg-blue-950/30 dark:text-blue-400">
                    Role: {logRoleFilter}
                    <button
                      onClick={() => { setLogRoleFilter("All"); setLogPage(1); }}
                      className="ml-1 hover:text-blue-800 transition-colors"
                    >
                      <i className="ph-bold ph-x text-[8px]"></i>
                    </button>
                  </div>
                )}
                {logSeverityFilter !== "All" && (
                  <div className="flex items-center gap-1 rounded-full border border-amber-100/30 bg-amber-50 px-2.5 py-1 text-[10px] font-bold text-amber-600 dark:bg-amber-950/30 dark:text-amber-400">
                    Severity: {logSeverityFilter}
                    <button
                      onClick={() => { setLogSeverityFilter("All"); setLogPage(1); }}
                      className="ml-1 hover:text-amber-800 transition-colors"
                    >
                      <i className="ph-bold ph-x text-[8px]"></i>
                    </button>
                  </div>
                )}
                {(logStartDate || logEndDate) && (
                  <div className="flex items-center gap-1 rounded-full border border-emerald-100/30 bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400">
                    Range: {logStartDate || "..."} to {logEndDate || "..."}
                    <button
                      onClick={() => { setLogStartDate(""); setLogEndDate(""); setLogPage(1); }}
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
                    setLocalSearch("")
                    setLogSearch("")
                    setLogRoleFilter("All")
                    setLogSeverityFilter("All")
                    setLogStartDate("")
                    setLogEndDate("")
                    setLogPage(1)
                  }}
                  className="h-6 rounded-full border-2 border-dashed border-gray-300 px-3 text-[10px] font-black text-pup-maroon dark:text-primary transition-colors hover:border-pup-darkMaroon hover:bg-red-50 hover:text-pup-maroon dark:border-white/10 dark:text-primary dark:bg-red-950/30"
                >
                  CLEAR ALL FILTERS
                </Button>
              </div>
            </div>
          )}

          <LogFilters
            localSearch={localSearch}
            handleSearchChange={handleSearchChange}
            logRoleFilter={logRoleFilter}
            handleRoleChange={handleRoleChange}
            logSeverityFilter={logSeverityFilter}
            handleSeverityChange={handleSeverityChange}
            logStartDate={logStartDate}
            setLogStartDate={setLogStartDate}
            logEndDate={logEndDate}
            setLogEndDate={setLogEndDate}
            setLogPage={setLogPage}
            setLocalSearch={setLocalSearch}
            setLogSearch={setLogSearch}
            setLogRoleFilter={setLogRoleFilter}
            setLogSeverityFilter={setLogSeverityFilter}
            logTotal={logTotal}
            isLoading={isLoading && !isManualLoading}
          />
        </Card>

        <LogTable
          isLoading={isLoading && !isManualLoading}
          error={error}
          displayLogs={logs}
          selectedLog={selectedLog}
          setSelectedLog={setSelectedLog}
          logTotal={logTotal}
          logPage={logPage}
          setLogPage={setLogPage}
          itemsPerPage={itemsPerPage}
          logsPerPage={logsPerPage}
          setItemsPerPage={setItemsPerPage}
          setLogsPerPage={setLogsPerPage}
          jumpPage={jumpPage}
          setJumpPage={setJumpPage}
          handleSort={handleSort}
          logSortBy={logSortBy}
          logSortOrder={logSortOrder}
          localSearch={localSearch}
          logRoleFilter={logRoleFilter}
          logSeverityFilter={logSeverityFilter}
          logStartDate={logStartDate}
          logEndDate={logEndDate}
          setLocalSearch={setLocalSearch}
          setLogSearch={setLogSearch}
          setLogRoleFilter={setLogRoleFilter}
          setLogSeverityFilter={setLogSeverityFilter}
          setLogStartDate={setLogStartDate}
          setLogEndDate={setLogEndDate}
          handleCopy={handleCopy}
          cn={cn}
        />

        {/* Log Detail Side Sheet */}
        <LogDetailSheet
          selectedLog={selectedLog}
          setSelectedLog={setSelectedLog}
          handleCopy={handleCopy}
          onSearchSimilar={(term) => {
            setLocalSearch(term)
            setLogSearch(term)
            setLogPage(1)
          }}
          onNext={handleNextLog}
          onPrev={handlePrevLog}
          hasNext={logs.length > 0 && selectedLog && logs.findIndex(l => l.id === selectedLog.id) < logs.length - 1}
          hasPrev={logs.length > 0 && selectedLog && logs.findIndex(l => l.id === selectedLog.id) > 0}
        />

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


