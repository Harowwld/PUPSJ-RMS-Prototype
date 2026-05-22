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
        log.details || "—",
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

  return (
    <TooltipProvider delay={200}>
      <div className="animate-fade-in font-inter flex w-full flex-col gap-4">
        {/* Stat Cards */}
        <StatCards isLoading={isLoading} logStats={logStats} />

        {/* Main Table Card */}
        <Card className="rounded-brand border border-gray-300 bg-white shadow-sm overflow-hidden">
          <PageHeader
            icon="ph-shield-check"
            title="Security Audit Logs"
            description="Trace system activities, security events, and administrative actions."
            actions={
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadCSV}
                  disabled={logTotal === 0 || isExporting}
                  className="flex h-10 w-32 items-center justify-center gap-1.5 rounded-brand border-gray-300 text-[10px] font-bold text-gray-600 hover:border-gray-300 hover:bg-red-50/30 hover:text-pup-maroon active:scale-95 disabled:opacity-50 shadow-sm transition-colors"
                >
                  <i className={`ph-bold ${isExporting ? "ph-circle-notch animate-spin" : "ph-file-csv"} text-base`}></i>
                  {isExporting ? "PREPARING..." : "EXPORT CSV"}
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  onClick={handlePreviewPDF}
                  disabled={logTotal === 0 || isExporting}
                  className="flex h-10 w-32 items-center justify-center gap-1.5 rounded-brand bg-linear-to-b from-red-800 to-pup-maroon border-4 border-pup-darkMaroon hover:from-red-700 hover:to-red-900 hover:shadow-md text-[10px] font-black text-white active:scale-95 disabled:opacity-50 shadow-lg shadow-red-900/20 transition-all"
                >
                  <i className={`ph-bold ${isExporting ? "ph-circle-notch animate-spin" : "ph-file-pdf"} text-base`}></i>
                  {isExporting ? "GENERATING..." : "GENERATE PDF"}
                </Button>
              </div>
            }
          />

          {/* Active Filter Chips Row */}
          {(localSearch !== "" || logRoleFilter !== "All" || logSeverityFilter !== "All" || logStartDate !== "" || logEndDate !== "") && (
            <div className="flex-none border-b border-gray-100 bg-white px-4 py-3 animate-in fade-in slide-in-from-top-1 duration-300">
              <div className="flex flex-wrap items-center gap-2">
                <span className="mr-1 text-[10px] font-bold tracking-widest text-gray-400 uppercase">Active Filters:</span>
                {localSearch && (
                  <div className="flex items-center gap-1 rounded-full border border-gray-300/20 bg-pup-maroon/10 px-2.5 py-1 text-[10px] font-bold text-pup-maroon">
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
                  <div className="flex items-center gap-1 rounded-full border border-blue-100 bg-blue-50 px-2.5 py-1 text-[10px] font-bold text-blue-600">
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
                  <div className="flex items-center gap-1 rounded-full border border-amber-100 bg-amber-50 px-2.5 py-1 text-[10px] font-bold text-amber-600">
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
                  <div className="flex items-center gap-1 rounded-full border border-emerald-100 bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-600">
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
                  className="h-6 rounded-full border border-dashed border-gray-300/30 px-3 text-[10px] font-black text-pup-maroon hover:bg-red-50 hover:text-pup-darkMaroon"
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

          <CardContent className="p-6">
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
