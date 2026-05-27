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
    const currentIndex = displayLogs.findIndex((log) => log.id === selectedLog.id)
    if (currentIndex < displayLogs.length - 1) {
      setSelectedLog(displayLogs[currentIndex + 1])
    }
  }

  const handlePrevLog = () => {
    if (!selectedLog) return
    const currentIndex = displayLogs.findIndex((log) => log.id === selectedLog.id)
    if (currentIndex > 0) {
      setSelectedLog(displayLogs[currentIndex - 1])
    }
  }

  const hasActiveFilters = localSearch !== "" || logRoleFilter !== "All" || logSeverityFilter !== "All" || logStartDate !== "" || logEndDate !== "";

  return (
    <TooltipProvider delay={200}>
      <div className="animate-fade-up font-inter flex w-full flex-col gap-6">
        {/* Stat Cards */}
        <StatCards isLoading={isLoading} logStats={logStats} />

        {/* Main Table Card */}
        <Card className="rounded-[2rem] border border-gray-200 bg-white shadow-2xl shadow-gray-200/50 backdrop-blur-xl overflow-hidden dark:border-white/10 dark:bg-card/80">
          <PageHeader
            icon="ph-shield-check"
            title="Audit Logs"
            description="Trace system activities, security events, and administrative actions with precision."
            actions={
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadCSV}
                  disabled={logTotal === 0 || isExporting}
                  className="flex h-10 w-32 items-center justify-center gap-1.5 rounded-brand border border-gray-300 text-[10px] font-bold text-gray-600 shadow-sm transition-colors hover:border-pup-maroon hover:bg-red-50 hover:text-pup-maroon dark:hover:text-red-500 active:scale-95 disabled:opacity-50 dark:text-zinc-300 dark:shadow-none dark:bg-red-950/30 dark:border-white/10"
                >
                  <i className={`ph-bold ${isExporting ? "ph-circle-notch animate-spin" : "ph-file-csv"} text-base`}></i>
                  {isExporting ? "PREPARING..." : "EXPORT"}
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  onClick={handlePreviewPDF}
                  disabled={logTotal === 0 || isExporting}
                  className="flex h-11 px-5 items-center justify-center gap-2 rounded-2xl bg-linear-to-b from-red-800 to-pup-maroon border-4 border-pup-darkMaroon hover:from-red-700 hover:to-red-900 hover:shadow-xl hover:-translate-y-0.5 text-[11px] font-black text-white active:scale-95 disabled:opacity-50 shadow-lg shadow-red-900/20 transition-all dark:shadow-none"
                >
                  <i className={`ph-bold ${isExporting ? "ph-circle-notch animate-spin" : "ph-file-pdf"} text-base`}></i>
                  {isExporting ? "GENERATING..." : "GENERATE REPORT"}
                </Button>

                <div className="ml-2 flex items-center gap-3 border-l border-gray-200 pl-4 dark:border-white/10">
                  <div className="flex flex-col items-end gap-1">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest dark:text-zinc-500">Dataset Sync</p>
                    <p className="text-[10px] font-medium text-gray-500 whitespace-nowrap dark:text-zinc-400">
                      {hasActiveFilters ? "Filtering live logs..." : "Showing cumulative data"}
                    </p>
                  </div>
                  <RefreshButton 
                    onRefresh={onRefresh} 
                    isLoading={isLoading} 
                    title="Refresh Audit Logs"
                  />
                </div>
              </div>
            }
          />

          {/* Active Filter Chips Row */}
          {hasActiveFilters && (
            <div className="flex-none border-b border-gray-100 bg-gray-50 px-6 py-4 animate-in fade-in slide-in-from-top-1 duration-500 dark:border-white/10 dark:bg-muted/30">
              <div className="flex flex-wrap items-center gap-2">
                <span className="mr-2 text-[10px] font-black tracking-widest text-gray-400 uppercase dark:text-zinc-500">Active Filters:</span>
                {localSearch && (
                  <div className="flex items-center gap-2 rounded-xl border border-pup-maroon/20 bg-pup-maroon/5 px-3 py-1.5 text-[10px] font-bold text-pup-maroon dark:text-primary shadow-sm dark:text-primary dark:shadow-none">
                    <i className="ph-bold ph-magnifying-glass opacity-50"></i>
                    Search: {localSearch}
                    <button
                      onClick={() => { setLocalSearch(""); setLogSearch(""); setLogPage(1); }}
                      className="ml-1 flex h-4 w-4 items-center justify-center rounded-full bg-pup-maroon/10 hover:bg-pup-maroon hover:text-white transition-all dark:bg-red-600"
                    >
                      <i className="ph-bold ph-x text-[8px]"></i>
                    </button>
                  </div>
                )}
                {logRoleFilter !== "All" && (
                  <div className="flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3 py-1.5 text-[10px] font-bold text-blue-600 shadow-sm dark:bg-blue-950/30 dark:text-blue-400 dark:shadow-none">
                    <i className="ph-bold ph-user-gear opacity-50"></i>
                    Role: {logRoleFilter}
                    <button
                      onClick={() => { setLogRoleFilter("All"); setLogPage(1); }}
                      className="ml-1 flex h-4 w-4 items-center justify-center rounded-full bg-blue-600/10 hover:bg-blue-600 hover:text-white transition-all"
                    >
                      <i className="ph-bold ph-x text-[8px]"></i>
                    </button>
                  </div>
                )}
                {logSeverityFilter !== "All" && (
                  <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-1.5 text-[10px] font-bold text-amber-600 shadow-sm dark:bg-amber-950/30 dark:text-amber-400 dark:shadow-none">
                    <i className="ph-bold ph-warning-octagon opacity-50"></i>
                    Severity: {logSeverityFilter}
                    <button
                      onClick={() => { setLogSeverityFilter("All"); setLogPage(1); }}
                      className="ml-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-600/10 hover:bg-amber-600 hover:text-white transition-all"
                    >
                      <i className="ph-bold ph-x text-[8px]"></i>
                    </button>
                  </div>
                )}
                {(logStartDate || logEndDate) && (
                  <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[10px] font-bold text-emerald-600 shadow-sm dark:bg-emerald-950/30 dark:text-emerald-400 dark:shadow-none">
                    <i className="ph-bold ph-calendar opacity-50"></i>
                    Range: {logStartDate || "..."} to {logEndDate || "..."}
                    <button
                      onClick={() => { setLogStartDate(""); setLogEndDate(""); setLogPage(1); }}
                      className="ml-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-600/10 hover:bg-emerald-600 hover:text-white transition-all"
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
                  className="h-8 rounded-xl border border-dashed border-gray-300 px-4 text-[10px] font-black text-gray-500 hover:bg-red-50 hover:text-pup-maroon dark:hover:text-red-500 transition-all dark:text-zinc-400 dark:bg-red-950/30 dark:border-white/10"
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
          />

          <CardContent className="p-0">
            <LogTable
              isLoading={isLoading}
              error={error}
              displayLogs={displayLogs}
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
          </CardContent>
        </Card>

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
          hasNext={displayLogs.length > 0 && selectedLog && displayLogs.findIndex(l => l.id === selectedLog.id) < displayLogs.length - 1}
          hasPrev={displayLogs.length > 0 && selectedLog && displayLogs.findIndex(l => l.id === selectedLog.id) > 0}
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


