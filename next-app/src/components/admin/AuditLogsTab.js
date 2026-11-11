"use client"


import { useState, useEffect, useCallback } from "react"
import usePdfPreviewSession from "@/hooks/usePdfPreviewSession";
import { PDF_ACTION_LABELS } from "@/lib/pdfPreview";
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { TooltipProvider } from "@/components/ui/tooltip"
import { format } from "date-fns"
import { cn, formatLogDetails } from "@/lib/utils"
import { generateExportFilename } from "@/lib/exportHelpers"
import { formatErrorMessage } from "@/lib/errorUtils"

import StatCards from "./audit-logs/StatCards"
import LogFilters, { AUDIT_COLUMNS, DEFAULT_VISIBLE_COLUMNS, AUDIT_FILTER_FIELDS } from "./audit-logs/LogFilters"
import LogTable from "./audit-logs/LogTable"
import LogDetailSheet from "./audit-logs/LogDetailSheet"
import PDFPreviewModal from "@/components/shared/PDFPreviewModal"
import PageHeader from "@/components/shared/PageHeader"
import { RefreshButton } from "@/components/shared/RefreshButton"
import ActiveFilterChips from "@/components/shared/ActiveFilterChips"
import { useAppReducedMotion } from "@/lib/motion"
import useTableScroll from "@/hooks/useTableScroll"
import useViewPreference from "@/hooks/useViewPreference"
import { SegmentedControl } from "@/components/ui/tabs"
import { Loading01Icon } from "hugeicons-react";


function parseDateLocal(str) {
  if (!str) return undefined
  const [y, m, d] = str.split("-").map(Number)
  if (isNaN(y) || isNaN(m) || isNaN(d)) return undefined
  return new Date(y, m - 1, d)
}

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
  logExcludeRoleFilter = "",
  setLogExcludeRoleFilter,
  logSeverityFilter,
  setLogSeverityFilter,
  logExcludeSeverityFilter = "",
  setLogExcludeSeverityFilter,
  logStartDate,
  setLogStartDate,
  logEndDate,
  setLogEndDate,
  logSortBy,
  setLogSortBy,
  logSortOrder,
  setLogSortOrder,
  showToast,
  onRefresh,
}) {
  const logs = displayLogs || []
  const [localSearch, setLocalSearch] = useState(logSearch || "")
  const [itemsPerPage, setItemsPerPage] = useState(logsPerPage || 20)
  const [isExporting, setIsExporting] = useState(false)
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false)
  const [selectedLog, setSelectedLog] = useState(null)
  const shouldReduceMotion = useAppReducedMotion()

  const [visibleColumns, setVisibleColumns] = useViewPreference(
    "logs",
    "visibleColumns",
    DEFAULT_VISIBLE_COLUMNS
  )

  const {
    tableContainerRef,
    canScrollLeft,
    canScrollRight,
    isScrolled,
    scrollLeft,
    scrollRight,
    resetScroll: resetTableScroll,
  } = useTableScroll([logs?.length]);

  useEffect(() => {
    resetTableScroll();
  }, [logPage, logsPerPage, logSearch, logRoleFilter, logExcludeRoleFilter, logSeverityFilter, logExcludeSeverityFilter, logStartDate, logEndDate, resetTableScroll]);

  // Two-way sync filter rules
  const [filterRules, setFilterRules] = useState(() => {
    const rules = [];
    if (logRoleFilter && logRoleFilter !== "All") {
      logRoleFilter.split(",").map((s) => s.trim()).filter(Boolean).forEach((role, i) => {
        rules.push({
          id: `initial-role-${i}`,
          fieldKey: "role",
          operator: "is",
          value: role,
        });
      });
    }
    if (logExcludeRoleFilter) {
      logExcludeRoleFilter.split(",").map((s) => s.trim()).filter(Boolean).forEach((role, i) => {
        rules.push({
          id: `initial-ex-role-${i}`,
          fieldKey: "role",
          operator: "is_not",
          value: role,
        });
      });
    }
    return rules;
  });

  const handleFiltersChange = useCallback((newRules) => {
    setFilterRules(newRules);

    const activeRoles = newRules
      .filter((r) => r.fieldKey === "role" && r.operator !== "is_not" && r.value)
      .flatMap((r) => Array.isArray(r.value) ? r.value : [String(r.value)]);
    const excludeRoles = newRules
      .filter((r) => r.fieldKey === "role" && r.operator === "is_not" && r.value)
      .flatMap((r) => Array.isArray(r.value) ? r.value : [String(r.value)]);

    setLogRoleFilter?.(activeRoles.length > 0 ? activeRoles.join(",") : "All");
    setLogExcludeRoleFilter?.(excludeRoles.length > 0 ? excludeRoles.join(",") : "");

    setLogPage(1);
  }, [setLogRoleFilter, setLogExcludeRoleFilter, setLogPage]);

  // PDF Preview State
  const [pdfPreviewOpen, setPdfPreviewOpen] = useState(false)
  const [pdfBlobUrl, setPdfPreviewUrl] = useState(null)
  const previewSession = usePdfPreviewSession();
  const [groupBy, setGroupBy] = useState("none")

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

  const buildExportUrl = (formatType) => {
    const roleQuery = logRoleFilter && logRoleFilter !== "All" ? `&role=${encodeURIComponent(logRoleFilter)}` : ""
    const excludeRoleQuery = logExcludeRoleFilter ? `&excludeRole=${encodeURIComponent(logExcludeRoleFilter)}` : ""
    const sevQuery = logSeverityFilter && logSeverityFilter !== "All" ? `&severity=${encodeURIComponent(logSeverityFilter)}` : ""
    const excludeSevQuery = logExcludeSeverityFilter ? `&excludeSeverity=${encodeURIComponent(logExcludeSeverityFilter)}` : ""
    const startQuery = logStartDate ? `&startDate=${encodeURIComponent(logStartDate)}` : ""
    const endQuery = logEndDate ? `&endDate=${encodeURIComponent(logEndDate)}` : ""
    return `/api/audit-logs?format=${formatType}&search=${encodeURIComponent(logSearch)}${roleQuery}${excludeRoleQuery}${sevQuery}${excludeSevQuery}${startQuery}${endQuery}&sortBy=${logSortBy}&sortOrder=${logSortOrder}`
  }

  const fetchExportFile = async (formatType) => {
    const response = await fetch(buildExportUrl(formatType), { cache: "no-store" })
    if (!response.ok) {
      const payload = await response.json().catch(() => null)
      throw new Error(payload?.error || "Unable to export activity history.")
    }
    return response.blob()
  }

  const downloadExportFile = (blob, fileName) => {
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    link.href = url
    link.download = fileName
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  const handleDownloadCSV = async () => {
    if (logTotal === 0 || isExporting) return
    setIsExporting(true)
    try {
      const blob = await fetchExportFile("csv")
      const fileName = generateExportFilename("ACTIVITY-HISTORY", "DATA", "csv")
      downloadExportFile(blob, fileName)
      showToast({ title: "Export Success", description: "Activity history has been exported to CSV successfully." })
    } catch (err) {
      console.error("[Export Error]", err)
      showToast(formatErrorMessage(err, "Export Failed"), true)
    } finally {
      setIsExporting(false)
    }
  }

  const handlePreviewPDF = async () => {
    if (logTotal === 0 || isGeneratingPdf) return
    setIsGeneratingPdf(true)
    const request = previewSession.begin();
    try {
      const blob = await fetchExportFile("pdf")
      const url = previewSession.createUrl(blob, request)
      if (!url) return;
      setPdfPreviewUrl(url)
      setPdfPreviewOpen(true)
    } catch (err) {
      if (!previewSession.isCurrent(request)) return;
      console.error("[PDF Preview Error]", err)
      showToast(formatErrorMessage(err, "Preview Failed"), true)
    } finally {
      if (previewSession.isCurrent(request)) setIsGeneratingPdf(false);
    }
  }

  const handleDownloadFromPreview = () => {
    if (!pdfBlobUrl) return
    try {
      const fileName = generateExportFilename("ACTIVITY-HISTORY", "REPORT", "pdf")
      const link = document.createElement("a")
      link.href = pdfBlobUrl
      link.setAttribute("download", fileName)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      showToast({ title: "Download Success", description: "Activity history report has been downloaded successfully." })
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

  const hasActiveFilters =
    localSearch !== "" ||
    (logRoleFilter && logRoleFilter !== "All") ||
    Boolean(logExcludeRoleFilter) ||
    logStartDate !== "" ||
    logEndDate !== "" ||
    filterRules.filter((r) => r.fieldKey !== "severity").length > 0;

  return (
    <TooltipProvider delay={200}>
      <div className={cn("font-jakarta flex flex-[1_0_auto] flex-col w-full gap-6", !shouldReduceMotion && "animate-fade-up")}>
        {/* ONE Single Card Container encapsulating Header, Metrics, Toolbar, Table & Pagination */}
        <Card className="flex h-auto w-full flex-col p-0 gap-0 overflow-hidden rounded-2xl border border-border bg-white shadow-sm dark:border-border dark:bg-card dark:shadow-none isolate font-jakarta flex-[1_0_auto]">
          <PageHeader
            icon="Shield01Icon"
            title={
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span>Activity History</span>
                {logTotal > 0 && (
                  <span className="text-[11px] font-normal tracking-normal text-gray-500 dark:text-zinc-400 tabular-nums">
                    {logTotal.toLocaleString()} total events
                  </span>
                )}
              </div>
            }
            description="Review staff actions, security events, and administrative changes."
            showBorder={false}
            className="p-6"
            titleClassName="text-[18px] font-semibold tracking-[-0.01em] text-gray-900 dark:text-zinc-50"
            descriptionClassName="text-[13px] font-normal text-gray-900 dark:text-zinc-300 mt-[4px]"
            actions={
              <div className="flex items-center gap-2">
                <RefreshButton 
                  onRefresh={onRefresh} 
                  isLoading={isManualLoading} 
                  title="Refresh Activity History"
                  className="h-9 w-9"
                />

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadCSV}
                  disabled={logTotal === 0 || isExporting || isGeneratingPdf}
                  className="h-9 shrink-0 px-4 text-xs font-semibold rounded-xl border border-black/[0.08] dark:border-white/[0.1] bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-xs cursor-pointer active:scale-95 transition-all"
                >
                  {isExporting ? <Loading01Icon size="1em" className="animate-spin text-[16px]" /> : "Export CSV"}
                </Button>

                <Button
                  type="button"
                  size="sm"
                  onClick={handlePreviewPDF}
                  disabled={logTotal === 0 || isExporting || isGeneratingPdf}
                  className="h-9 shrink-0 px-4 text-xs font-semibold rounded-xl cursor-pointer disabled:opacity-50"
                >
                  {isGeneratingPdf ? (
                    <Loading01Icon size="1em" className="animate-spin text-[16px] flex items-center justify-center" />
                  ) : (
                    PDF_ACTION_LABELS.preview
                  )}
                </Button>
              </div>
            }
          />

          {/* Stat Cards */}
          <div className="px-6 pb-6">
            <div className="p-3 sm:p-3.5 rounded-[22px] bg-[#f4f5f7] dark:bg-zinc-900/60 border border-black/[0.05] dark:border-white/[0.08]">
              <StatCards isLoading={isLoading && !logStats} logStats={logStats} />
            </div>
          </div>

          {/* Severity Segmented Control */}
          <div role="group" aria-label="Activity severity" className="flex items-center px-6 py-2.5 border-t border-b border-border dark:border-white/10 bg-white dark:bg-card overflow-x-auto scrollbar-none">
            <SegmentedControl
              value={logSeverityFilter && logSeverityFilter !== "All" ? logSeverityFilter.split(",")[0] : ""}
              onValueChange={(value) => {
                setLogSeverityFilter?.(value || "All");
                setLogPage?.(1);
              }}
              variant="capsule"
              className="inline-grid grid-flow-col auto-cols-fr"
              items={[
                { value: "", label: "All Levels" },
                { value: "INFO", label: "Information" },
                { value: "WARNING", label: "Warning" },
                { value: "CRITICAL", label: "Critical" },
              ]}
            />
          </div>

          <LogFilters
            localSearch={localSearch}
            handleSearchChange={handleSearchChange}
            logStartDate={logStartDate}
            setLogStartDate={setLogStartDate}
            logEndDate={logEndDate}
            setLogEndDate={setLogEndDate}
            setLogPage={setLogPage}
            setLocalSearch={setLocalSearch}
            setLogSearch={setLogSearch}
            logTotal={logTotal}
            isLoading={isLoading && !isManualLoading}
            logSortBy={logSortBy}
            setLogSortBy={setLogSortBy}
            logSortOrder={logSortOrder}
            setLogSortOrder={setLogSortOrder}
            visibleColumns={visibleColumns}
            setVisibleColumns={setVisibleColumns}
            groupBy={groupBy}
            onGroupByChange={setGroupBy}
            filterRules={filterRules}
            onFiltersChange={handleFiltersChange}
            tableContainerRef={tableContainerRef}
            canScrollLeft={canScrollLeft}
            canScrollRight={canScrollRight}
            isScrolled={isScrolled}
            onScrollLeft={scrollLeft}
            onScrollRight={scrollRight}
            onResetScroll={resetTableScroll}
          />

          {/* Active Filter Chips Row */}
          {hasActiveFilters && (
            <ActiveFilterChips
              chips={filterRules
                .filter((rule) => rule.fieldKey !== "severity")
                .map((rule) => {
                  const field = AUDIT_FILTER_FIELDS.find((f) => f.key === rule.fieldKey);
                  const opt = field?.options?.find((o) => String(o.value) === String(rule.value));
                  const valLabel = opt?.label || rule.value;
                  return {
                    id: rule.id,
                    groupLabel: field?.label || rule.fieldKey,
                    label: rule.operator === "is_not" ? `is not ${valLabel}` : valLabel,
                    onRemove: () => {
                      const next = filterRules.filter((r) => r.id !== rule.id);
                      handleFiltersChange(next);
                    },
                  };
                })}
              searchQuery={localSearch}
              onClearSearch={() => {
                setLocalSearch("");
                setLogSearch("");
                setLogPage(1);
              }}
              extraChips={[
                ...(logStartDate || logEndDate
                  ? [
                      {
                        groupLabel: "Date Range",
                        label: `${logStartDate ? format(parseDateLocal(logStartDate), "MMM d, yyyy") : "Start"} → ${logEndDate ? format(parseDateLocal(logEndDate), "MMM d, yyyy") : "End"}`,
                        onClear: () => {
                          setLogStartDate("");
                          setLogEndDate("");
                          setLogPage(1);
                        },
                      },
                    ]
                  : []),
              ]}
              onClearAll={() => {
                setLocalSearch("");
                setLogSearch("");
                handleFiltersChange([]);
                setLogStartDate("");
                setLogEndDate("");
                setLogPage(1);
              }}
              className="border-t border-border dark:border-border bg-white dark:bg-card px-6 py-2.5"
            />
          )}

          <div className="relative flex flex-1 flex-col" aria-busy={isLoading || undefined}>
          <LogTable
            isLoading={isLoading && !isManualLoading && displayLogs === null}
            error={error}
            displayLogs={logs}
            groupBy={groupBy}
            selectedLog={selectedLog}
            setSelectedLog={setSelectedLog}
            logTotal={logTotal}
            logPage={logPage}
            setLogPage={setLogPage}
            itemsPerPage={itemsPerPage}
            logsPerPage={logsPerPage}
            setItemsPerPage={setItemsPerPage}
            setLogsPerPage={setLogsPerPage}
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
            embedded={true}
            cn={cn}
            visibleColumns={visibleColumns}
            tableContainerRef={tableContainerRef}
            isScrolledX={isScrolled}
            onClearFilters={() => {
              setLocalSearch("");
              setLogSearch("");
              handleFiltersChange([]);
              setLogStartDate("");
              setLogEndDate("");
              setLogPage(1);
            }}
          />
          {isLoading && !isManualLoading && displayLogs !== null && (
            <div className="absolute inset-0 z-30 flex items-center justify-center bg-white/70 dark:bg-card/70">
              <span role="status" className="rounded-lg bg-white px-3 py-2 text-xs font-medium text-gray-600 shadow-sm dark:bg-zinc-800 dark:text-zinc-300">
                Loading activity…
              </span>
            </div>
          )}
          </div>
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
          hasNext={logs.length > 0 && selectedLog && logs.findIndex(l => l.id === selectedLog.id) < logs.length - 1}
          hasPrev={logs.length > 0 && selectedLog && logs.findIndex(l => l.id === selectedLog.id) > 0}
          currentIndex={selectedLog ? logs.findIndex(l => l.id === selectedLog.id) : -1}
          totalCount={logs.length}
        />

        {/* PDF Export Preview */}
        <PDFPreviewModal
          open={pdfPreviewOpen}
          onClose={() => {
            previewSession.cancel();
            setIsGeneratingPdf(false);
            setPdfPreviewUrl(null)
            setPdfPreviewOpen(false)
          }}
          title="Activity History Report Preview"
          description="Review the recorded actions and details before printing or downloading."
          pdfUrl={pdfBlobUrl}
          onDownload={handleDownloadFromPreview}
        />
      </div>
    </TooltipProvider>
  )
}
