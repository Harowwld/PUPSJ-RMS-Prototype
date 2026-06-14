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
        <Card className="flex h-auto w-full flex-col p-0 gap-0 overflow-hidden rounded-xl border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-card dark:shadow-none">
          <PageHeader
            icon="ph-shield-check"
            title="Audit Logs"
            description="Trace system activities, security events, and administrative actions with precision."
            showBorder={false}
            titleClassName="text-[18px] font-semibold tracking-[-0.01em] text-gray-900 dark:text-zinc-50"
            descriptionClassName="text-[13px] font-normal text-gray-500 dark:text-zinc-400 mt-[4px]"
            actions={
              <div className="flex items-center gap-6">
                <RefreshButton 
                  onRefresh={onRefresh} 
                  isLoading={isManualLoading} 
                  title="Refresh Audit Logs"
                />

                <div className="h-6 w-px bg-gray-200 dark:bg-zinc-800" />

                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleDownloadCSV}
                    disabled={logTotal === 0 || isExporting}
                    className="h-10 px-3 font-semibold text-sm text-gray-600 hover:text-gray-900 hover:bg-transparent dark:text-zinc-400 dark:hover:text-zinc-200 dark:hover:bg-transparent transition-colors flex items-center gap-2 rounded-brand shadow-none! border-0!"
                  >
                    {isExporting ? "Preparing..." : "Export"}
                  </Button>
                  <Button
                    type="button"
                    variant="default"
                    size="sm"
                    onClick={handlePreviewPDF}
                    disabled={logTotal === 0 || isExporting}
                    className="flex h-[36px] px-5 items-center justify-center rounded-[8px] btn-brand-red text-[13px] font-medium text-white active:scale-95 disabled:opacity-50 transition-all dark:shadow-none"
                  >
                    {isExporting ? "Generating..." : "Generate Report"}
                  </Button>
                </div>
              </div>
            }
          />

          {/* Active Filter Chips Row */}
          {hasActiveFilters && (() => {
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
                        onClick={() => { setLocalSearch(""); setLogSearch(""); setLogPage(1); }}
                        className="text-[12px] text-gray-400 hover:text-gray-600 dark:text-zinc-500 dark:hover:text-zinc-300 transition-colors cursor-pointer border-0 bg-transparent p-0 leading-none"
                      >
                        ×
                      </button>
                    </div>
                  )}
                  {logRoleFilter !== "All" && (
                    <div className="flex items-center gap-[6px] rounded-[6px] bg-gray-100 dark:bg-zinc-800 px-[10px] py-[4px] text-[12px] font-normal text-gray-900 dark:text-zinc-50">
                      Role: {logRoleFilter}
                      <button
                        onClick={() => { setLogRoleFilter("All"); setLogPage(1); }}
                        className="text-[12px] text-gray-400 hover:text-gray-600 dark:text-zinc-500 dark:hover:text-zinc-300 transition-colors cursor-pointer border-0 bg-transparent p-0 leading-none"
                      >
                        ×
                      </button>
                    </div>
                  )}
                  {logSeverityFilter !== "All" && (
                    <div className="flex items-center gap-[6px] rounded-[6px] bg-gray-100 dark:bg-zinc-800 px-[10px] py-[4px] text-[12px] font-normal text-gray-900 dark:text-zinc-50">
                      Severity: {logSeverityFilter}
                      <button
                        onClick={() => { setLogSeverityFilter("All"); setLogPage(1); }}
                        className="text-[12px] text-gray-400 hover:text-gray-600 dark:text-zinc-500 dark:hover:text-zinc-300 transition-colors cursor-pointer border-0 bg-transparent p-0 leading-none"
                      >
                        ×
                      </button>
                    </div>
                  )}
                  {(logStartDate || logEndDate) && (
                    <div className="flex items-center gap-[6px] rounded-[6px] bg-gray-100 dark:bg-zinc-800 px-[10px] py-[4px] text-[12px] font-normal text-gray-900 dark:text-zinc-50">
                      {formatChipDate(logStartDate)} – {formatChipDate(logEndDate)}
                      <button
                        onClick={() => { setLogStartDate(""); setLogEndDate(""); setLogPage(1); }}
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
                      setLogSearch("")
                      setLogRoleFilter("All")
                      setLogSeverityFilter("All")
                      setLogStartDate("")
                      setLogEndDate("")
                      setLogPage(1)
                    }}
                    className="h-auto text-[12px] font-medium text-gray-400 dark:text-zinc-500 border-0 bg-transparent hover:bg-transparent shadow-none p-0 hover:text-red-600 dark:hover:text-red-500 transition-colors cursor-pointer"
                  >
                    Clear
                  </Button>
                </div>
              </div>
            )
          })()}

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


