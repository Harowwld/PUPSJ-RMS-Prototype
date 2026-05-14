"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { TooltipProvider } from "@/components/ui/tooltip"
import { formatPHDateTime } from "@/lib/timeFormat"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"

import StatCards from "./audit-logs/StatCards"
import LogFilters from "./audit-logs/LogFilters"
import LogTable from "./audit-logs/LogTable"
import LogDetailSheet from "./audit-logs/LogDetailSheet"
import PdfPreviewDialog from "./audit-logs/PdfPreviewDialog"

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
  const handleSort = (column, order) => { setLogSortBy(column); setLogSortOrder(order); setLogPage(1) }

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
      const link = document.createElement("a")
      const url = URL.createObjectURL(blob)
      link.setAttribute("href", url)
      link.setAttribute("download", `PUP-AUDIT-LOGS-DATA-${format(new Date(), "yyyy-MM-dd-HHmm")}.csv`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      showToast({ title: "Export Success", description: "Audit logs have been exported to CSV successfully." })
    } catch (err) {
      console.error("[Export Error]", err)
      showToast({ title: "Export Failed", description: err.message || "Unable to export audit logs to CSV." }, true)
    } finally {
      setIsExporting(false)
    }
  }

  const generatePdfBlob = async () => {
    const allLogs = await fetchAllForExport()
    const doc = new jsPDF("l", "pt", "a4")

    const addHeader = (doc) => {
      doc.setFillColor(122, 30, 40)
      doc.rect(0, 0, doc.internal.pageSize.getWidth(), 80, "F")
      try {
        doc.addImage("/assets/pup-logo.webp", "WEBP", 40, 15, 50, 50)
      } catch (e) {
        console.error("Logo failed to load", e)
      }
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(18)
      doc.setFont("helvetica", "bold")
      doc.text("POLYTECHNIC UNIVERSITY OF THE PHILIPPINES", 100, 35)
      doc.setFontSize(12)
      doc.setFont("helvetica", "normal")
      doc.text("SAN JUAN BRANCH - RECORDS MANAGEMENT SYSTEM", 100, 50)
      doc.setFontSize(14)
      doc.setFont("helvetica", "bold")
      doc.text("AUDIT LOGS REPORT", 100, 70)
      doc.setTextColor(60, 60, 60)
      doc.setFontSize(9)
      doc.setFont("helvetica", "bold")
      doc.text("GENERATED ON:", 40, 105)
      doc.setFont("helvetica", "normal")
      doc.text(new Date().toLocaleString(), 130, 105)
      doc.setFont("helvetica", "bold")
      doc.text("FILTER CRITERIA:", 40, 120)
      doc.setFont("helvetica", "normal")
      const filterText = `Role: ${logRoleFilter} | Severity: ${logSeverityFilter} | Range: ${logStartDate || "Any"} to ${logEndDate || "Any"} | Search: ${logSearch || "None"}`
      doc.text(filterText, 130, 120)
      doc.setDrawColor(200, 200, 200)
      doc.line(40, 130, doc.internal.pageSize.getWidth() - 40, 130)
    }

    addHeader(doc)
    const tableData = allLogs.map((log) => [
      formatPHDateTime(log.created_at),
      log.severity || "INFO",
      log.actor,
      log.role,
      log.action,
      log.details || "—",
      log.ip || "—",
    ])
    autoTable(doc, {
      startY: 145,
      head: [["Timestamp", "Severity", "Actor", "Role", "Action", "Details", "IP Address"]],
      body: tableData,
      theme: "striped",
      headStyles: { fillColor: [122, 30, 40] },
      styles: { fontSize: 8, cellPadding: 4 },
      columnStyles: {
        0: { cellWidth: 90 }, 1: { cellWidth: 50 }, 2: { cellWidth: 80 },
        3: { cellWidth: 50 }, 4: { cellWidth: 80 }, 5: { cellWidth: "auto" }, 6: { cellWidth: 70 },
      },
    })
    return doc.output("blob")
  }

  const handlePreviewPDF = async () => {
    if (logTotal === 0 || isExporting) return
    setIsExporting(true)
    try {
      const blob = await generatePdfBlob()
      const url = URL.createObjectURL(blob)
      setPdfPreviewUrl(url)
      setPdfPreviewOpen(true)
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
      const link = document.createElement("a")
      link.href = pdfBlobUrl
      link.setAttribute("download", `PUP-AUDIT-LOGS-REPORT-${format(new Date(), "yyyy-MM-dd-HHmm")}.pdf`)
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
    showToast({ title: "Copied!", description: `${label} copied to clipboard.` })
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
        <Card className="rounded-brand border border-gray-300 bg-white shadow-sm">
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
            isExporting={isExporting}
            handleDownloadCSV={handleDownloadCSV}
            handlePreviewPDF={handlePreviewPDF}
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
        />
      </div>
    </TooltipProvider>
  )
}
