"use client"
import PDFPreviewModal from "@/components/shared/PDFPreviewModal"
import usePdfPreviewSession from "@/hooks/usePdfPreviewSession";
import { PDF_ACTION_LABELS } from "@/lib/pdfPreview";


import React, { useEffect, useState, useMemo, useCallback } from "react"
import {
  Card,
} from "@/components/ui/card"
import SlaKpiSkeleton from "@/components/admin/skeletons/SlaKpiSkeleton"
import SlaChartsSkeleton from "@/components/admin/skeletons/SlaChartsSkeleton"
import { Button } from "@/components/ui/button"
import { generateExportFilename } from "@/lib/exportHelpers"
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyMedia,
} from "@/components/ui/empty"
import { cn } from "@/lib/utils"
import { 
  generateSLACompliancePdf, 
  generateCSMReportPdf, 
  generateComprehensiveSLAPdf, 
  generateSLAAnalyticsPdf 
} from "@/lib/pdfGenerator"
import PageHeader from "@/components/shared/PageHeader"
import { RefreshButton } from "@/components/shared/RefreshButton"
import { formatErrorMessage } from "@/lib/errorUtils"
import { 
  downloadSlaComplianceCsv, 
  downloadCsmRatingsCsv, 
  downloadComprehensiveSlaCsv, 
  downloadSlaCsv 
} from "@/lib/exportHelpers"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import SlaKpiCards from "./analytics/SlaKpiCards"
import SlaCharts from "./analytics/SlaCharts"
import SlaFilters from "./analytics/SlaFilters"
import { AlertCircleIcon as EmptyAlertCircleIcon , ArrowDown01Icon, File02Icon, Files01Icon, HourglassIcon, Loading01Icon, StarIcon, TableIcon} from "hugeicons-react";
const SLAAnalyticsTab = React.memo(function SLAAnalyticsTab({
 showToast, onLogAction, onSwitchView }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [manualLoading, setManualLoading] = useState(false)
  const [error, setError] = useState("")
  const [reportOpen, setReportOpen] = useState(false)
  const [pdfBlobUrl, setPdfPreviewUrl] = useState(null)
  const previewSession = usePdfPreviewSession();
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false)
  const [isExportingCsv, setIsExportingCsv] = useState(false)
  const [previewReportType, setPreviewReportType] = useState("sla") // "sla", "csm", "comprehensive"

  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")

  const loadData = useCallback(async (isManual = false) => {
    if (isManual) {
      setManualLoading(true)
    } else {
      setLoading(true)
    }
    setError("")
    try {
      const params = new URLSearchParams()
      if (startDate) params.set("startDate", startDate)
      if (endDate) params.set("endDate", endDate)
      
      const [res] = await Promise.all([
        fetch(`/api/analytics/document-requests?${params.toString()}`, { cache: "no-store" }),
        isManual ? new Promise((resolve) => setTimeout(resolve, 600)) : Promise.resolve(),
      ])
      const json = await res.json().catch(() => null)
      if (!res.ok || !json?.ok)
        throw new Error(json?.error || "Failed to load processing time data")
      setData(json.data)
    } catch (e) {
      setError(e.message)
      showToast?.(formatErrorMessage(e, "Failed to Load Request Analytics"), true);
    } finally {
      setLoading(false)
      setManualLoading(false)
    }
  }, [startDate, endDate, showToast])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleRefresh = () => {
    loadData(true)
  }

  // Safe variables
  const total = data?.totalRequests || 0
  const completed = data?.sla?.totalCompleted || 0
  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0
  const slaComplianceRate = data?.sla?.totalCompleted > 0
    ? data.sla.complianceRate ?? 0
    : null

  const pieData = useMemo(() => {
    return Object.entries(data?.statusCounts || {})
      .map(([name, value]) => ({ name, value }))
      .filter((d) => d.value > 0)
  }, [data?.statusCounts])

  const generateBlobForType = async (type) => {
    if (!data) return null;
    if (type === "csm") {
      return await generateCSMReportPdf(data, { startDate, endDate });
    }
    if (type === "comprehensive") {
      return await generateComprehensiveSLAPdf(data, total, slaComplianceRate, { startDate, endDate });
    }
    return await generateSLACompliancePdf(data, total, slaComplianceRate, { startDate, endDate });
  };

  const handlePreview = async (type = "comprehensive") => {
    if (!data || loading) return;
    setIsGeneratingPdf(true);
    setPreviewReportType(type);
    const request = previewSession.begin();
    try {
      const blob = await generateBlobForType(type);
      const url = previewSession.createUrl(blob, request);
      if (!url) return;
      setPdfPreviewUrl(url);
      setReportOpen(true);
    } catch (e) {
      if (!previewSession.isCurrent(request)) return;
      console.error("PDF Preview generation failed:", e);
      showToast?.(formatErrorMessage(e, "Preview Failed"), true);
    } finally {
      if (previewSession.isCurrent(request)) setIsGeneratingPdf(false);
    }
  };

  const handleSwitchPreviewReport = async (newType) => {
    if (newType === previewReportType || !data) return;
    setIsGeneratingPdf(true);
    const request = previewSession.begin();
    try {
      const blob = await generateBlobForType(newType);
      const url = previewSession.createUrl(blob, request);
      if (!url) return;
      setPdfPreviewUrl(url);
      setPreviewReportType(newType);
    } catch (e) {
      if (!previewSession.isCurrent(request)) return;
      console.error("Failed to switch report preview:", e);
      showToast?.(formatErrorMessage(e, "Report Switch Failed"), true);
    } finally {
      if (previewSession.isCurrent(request)) setIsGeneratingPdf(false);
    }
  };

  const handleDownloadPdf = async () => {
    let basePrefix = "PROCESSING-TIME";
    let reportLabel = "Citizen's Charter Processing Time Report";
    if (previewReportType === "csm") {
      basePrefix = "CSM-RATINGS";
      reportLabel = "Client Satisfaction Measurement (CSM) Report";
    } else if (previewReportType === "comprehensive") {
      basePrefix = "PROCESSING-TIME-CSM-COMBINED";
      reportLabel = "Combined Processing Time and Client Satisfaction Report";
    }

    const fileName = generateExportFilename(basePrefix, "REPORT", "pdf");
    if (!pdfBlobUrl) {
      setIsGeneratingPdf(true);
      try {
        const blob = await generateBlobForType(previewReportType);
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } catch (e) {
        console.error("PDF Generation failed:", e);
        showToast?.(formatErrorMessage(e, "Report Generation Failed"), true);
        return;
      } finally {
        setIsGeneratingPdf(false);
      }
    } else {
      const link = document.createElement("a");
      link.href = pdfBlobUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }

    onLogAction?.({
      action: "Generate Report",
      details: `generated formal ${reportLabel} (${fileName}) for administrative records`,
      entityType: "Report",
    });
    showToast?.({ title: "Report Downloaded", description: `The ${reportLabel} has been successfully downloaded.` });
  };


  const handleCsvExport = async (type = "comprehensive") => {
    setIsExportingCsv(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 100));
      if (type === "csm") {
        const fileName = generateExportFilename("CSM-RATINGS", "DATA", "csv");
        downloadCsmRatingsCsv(data, onLogAction, fileName);
        showToast?.({ title: "Export Successful", description: `Client Satisfaction feedback dataset exported to ${fileName}.` });
      } else if (type === "sla") {
        const fileName = generateExportFilename("PROCESSING-TIME", "DATA", "csv");
        downloadSlaComplianceCsv(data, total, slaComplianceRate, onLogAction, fileName);
        showToast?.({ title: "Export Successful", description: `Citizen's Charter processing time report exported to ${fileName}.` });
      } else {
        const fileName = generateExportFilename("PROCESSING-TIME-CSM-COMBINED", "DATA", "csv");
        downloadComprehensiveSlaCsv(data, total, completionRate, onLogAction, fileName);
        showToast?.({ title: "Export Successful", description: `Complete processing time and client satisfaction report exported to ${fileName}.` });
      }
    } catch (e) {
      showToast?.(formatErrorMessage(e, "Export Failed"), true);
    } finally {
      setIsExportingCsv(false);
    }
  };

  const hasActiveFilters = startDate !== "" || endDate !== "";

  const pageDescription = "Monitor request metrics, turnaround times, and constituent feedback."

  return (
    <div data-light-only className="animate-fade-up font-jakarta flex flex-[1_0_auto] flex-col w-full gap-6">
      {/* ONE Single Card Container encapsulating Header, Metrics, Toolbar, & Charts */}
      <Card className="flex h-auto w-full flex-col p-0 gap-0 overflow-visible rounded-2xl border border-border bg-white shadow-sm dark:border-border dark:bg-card dark:shadow-none isolate font-jakarta flex-[1_0_auto]">
        <PageHeader
          icon="Analytics01Icon"
          title="Request Analysis"
          description={pageDescription}
          showBorder={false}
          className="p-6"
          titleClassName="text-[18px] font-semibold tracking-[-0.01em] text-gray-900 dark:text-zinc-50"
          descriptionClassName="text-[13px] font-normal text-gray-900 dark:text-zinc-300 mt-[4px]"
          actions={
            <div className="flex items-center gap-2">
              <RefreshButton 
                onRefresh={handleRefresh} 
                isLoading={manualLoading} 
                title="Refresh Analytics"
              />

              <div className="flex items-center gap-2">
                {/* Discrete Export CSV Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={loading || !data || isExportingCsv}
                      className="h-10 px-5 text-xs font-semibold rounded-xl border border-black/[0.06] dark:border-white/[0.08] bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-xs cursor-pointer active:scale-95 transition-all gap-1.5"
                    >
                      {isExportingCsv ? (
                        <Loading01Icon size="1em" className="animate-spin text-[16px]" />
                      ) : (
                        <>
                          <span>Export CSV</span>
                          <ArrowDown01Icon size="1em" className="text-[10px] opacity-70" />
                        </>
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    data-light-only
                    align="end"
                    sideOffset={6}
                    className="w-60 rounded-2xl border-[0.5px] border-border dark:border-white/10 shadow-2xl p-0 overflow-hidden bg-white dark:bg-zinc-900 select-none"
                  >
                    {/* Zone 1: Header */}
                    <div className="px-3.5 py-2 border-b-[0.5px] border-border dark:border-white/10 bg-gray-50/60 dark:bg-zinc-800/40 flex items-center justify-between">
                      <span className="text-xs font-semibold text-gray-900 dark:text-zinc-100">
                        Export Dataset
                      </span>
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400">
                        CSV
                      </span>
                    </div>

                    {/* Zone 2: Body */}
                    <div className="p-1.5 space-y-0.5">
                      <DropdownMenuItem 
                        onClick={() => handleCsvExport("sla")} 
                        className="cursor-pointer text-xs font-medium py-1.5 px-2 rounded-lg flex items-center gap-2 text-gray-700 dark:text-zinc-200 hover:bg-gray-100 dark:hover:bg-zinc-800"
                      >
                        <HourglassIcon size="1em" className="text-sm text-pup-maroon dark:text-red-400" />
                        <span>On-Time Processing Data</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => handleCsvExport("csm")} 
                        className="cursor-pointer text-xs font-medium py-1.5 px-2 rounded-lg flex items-center gap-2 text-gray-700 dark:text-zinc-200 hover:bg-gray-100 dark:hover:bg-zinc-800"
                      >
                        <StarIcon size="1em" className="text-sm text-amber-500" />
                        <span>CSM Ratings Data</span>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator className="my-1 border-t-[0.5px] border-border dark:border-white/10" />
                      <DropdownMenuItem 
                        onClick={() => handleCsvExport("comprehensive")} 
                        className="cursor-pointer text-xs font-medium py-1.5 px-2 rounded-lg flex items-center gap-2 text-gray-700 dark:text-zinc-200 hover:bg-gray-100 dark:hover:bg-zinc-800"
                      >
                        <TableIcon size="1em" className="text-sm text-gray-400" />
                        <span>Complete Combined Dataset</span>
                      </DropdownMenuItem>
                    </div>
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Discrete Generate Report Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      disabled={loading || !data || isGeneratingPdf}
                      className="h-10 px-5 cursor-pointer gap-1.5"
                    >
                      {isGeneratingPdf ? (
                        <Loading01Icon size="1em" className="animate-spin text-[16px] flex items-center justify-center" />
                      ) : (
                        <>
                          <span>{PDF_ACTION_LABELS.preview}</span>
                          <ArrowDown01Icon size="1em" className="text-[10px] text-white/80 dark:text-zinc-900/80" />
                        </>
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    data-light-only
                    align="end"
                    sideOffset={6}
                    className="w-60 rounded-2xl border-[0.5px] border-border dark:border-white/10 shadow-2xl p-0 overflow-hidden bg-white dark:bg-zinc-900 select-none"
                  >
                    {/* Zone 1: Header */}
                    <div className="px-3.5 py-2 border-b-[0.5px] border-border dark:border-white/10 bg-gray-50/60 dark:bg-zinc-800/40 flex items-center justify-between">
                      <span className="text-xs font-semibold text-gray-900 dark:text-zinc-100">
                        Official Report
                      </span>
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-400">
                        PDF
                      </span>
                    </div>

                    {/* Zone 2: Body */}
                    <div className="p-1.5 space-y-0.5">
                      <DropdownMenuItem 
                        onClick={() => handlePreview("sla")} 
                        className="cursor-pointer text-xs font-medium py-1.5 px-2 rounded-lg flex items-center gap-2 text-gray-700 dark:text-zinc-200 hover:bg-gray-100 dark:hover:bg-zinc-800"
                      >
                        <File02Icon size="1em" className="text-sm text-pup-maroon dark:text-red-400" />
                        <span>Citizen&apos;s Charter Processing Time Report</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => handlePreview("csm")} 
                        className="cursor-pointer text-xs font-medium py-1.5 px-2 rounded-lg flex items-center gap-2 text-gray-700 dark:text-zinc-200 hover:bg-gray-100 dark:hover:bg-zinc-800"
                      >
                        <StarIcon size="1em" className="text-sm text-amber-500" />
                        <span>Client Satisfaction (CSM) Report</span>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator className="my-1 border-t-[0.5px] border-border dark:border-white/10" />
                      <DropdownMenuItem 
                        onClick={() => handlePreview("comprehensive")} 
                        className="cursor-pointer text-xs font-medium py-1.5 px-2 rounded-lg flex items-center gap-2 text-gray-700 dark:text-zinc-200 hover:bg-gray-100 dark:hover:bg-zinc-800"
                      >
                        <Files01Icon size="1em" className="text-sm text-gray-400" />
                        <span>Combined Report</span>
                      </DropdownMenuItem>
                    </div>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          }
        />

        {/* Color KPI Cards / Skeletons at the Top */}
        {loading && !data ? (
          <div className="px-6 pb-6">
            <SlaKpiSkeleton />
          </div>
        ) : !error && data ? (
          <div className="px-6 pb-6 relative z-30">
            <div className={cn(
              "w-full transition-all duration-500", 
              (loading && !manualLoading) ? "opacity-40 blur-[1px] grayscale-[0.1]" : "opacity-100"
            )}>
              <SlaKpiCards
                total={total}
                completionRate={completionRate}
                completed={completed}
                sla={data?.sla}
                feedback={data?.feedback}
                statusCounts={data?.statusCounts}
                topDocTypes={data?.topDocTypes}
              />
            </div>
          </div>
        ) : null}

        {/* Navigation Toolbar */}
        <SlaFilters 
          startDate={startDate}
          setStartDate={setStartDate}
          endDate={endDate}
          setEndDate={setEndDate}
          isLoading={loading}
        />

        {/* Active Filter Chips Row */}
        {hasActiveFilters && (() => {
          const formatChipDate = (dateStr) => {
            if (!dateStr) return "..."
            try {
              const [y, m, d] = dateStr.split("-").map(Number)
              if (isNaN(y) || isNaN(m) || isNaN(d)) return dateStr
              return new Date(y, m - 1, d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
            } catch {
              return dateStr
            }
          }
          return (
            <div className="flex-none border-t border-border dark:border-border bg-white dark:bg-card px-6 py-3 animate-in fade-in slide-in-from-top-1 duration-normal">
              <div className="flex flex-wrap items-center gap-2">
                <span className="mr-1 text-[11px] font-medium uppercase tracking-[0.04em] text-gray-400 dark:text-zinc-500">Active filters:</span>
                {(startDate || endDate) && (
                  <div className="flex items-center gap-[6px] rounded-lg bg-gray-100 dark:bg-zinc-800 px-[10px] py-[4px] text-[12px] font-normal text-gray-900 dark:text-zinc-50">
                    Date Range: {startDate ? formatChipDate(startDate) : "Earliest"} – {endDate ? formatChipDate(endDate) : "Latest"}
                    <button
                      onClick={() => { setStartDate(""); setEndDate(""); }}
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
                    setStartDate("")
                    setEndDate("")
                  }}
                  className="h-auto text-[12px] font-medium text-gray-400 dark:text-zinc-500 border-0 bg-transparent hover:bg-transparent shadow-none p-0 hover:text-red-600 dark:hover:text-red-500 transition-colors cursor-pointer"
                >
                  Clear
                </Button>
              </div>
            </div>
          )
        })()}

        <div className="flex flex-[1_0_auto] flex-col bg-white p-6 dark:bg-card border-t border-border dark:border-border rounded-b-2xl">
          {loading && !data ? (
            <SlaChartsSkeleton />
          ) : error ? (
            <Empty>
              <EmptyHeader>
                <EmptyMedia className="text-red-600 dark:text-red-400"><EmptyAlertCircleIcon size="1em" /></EmptyMedia>
                <EmptyTitle>
                  Data Unavailable
                </EmptyTitle>
                <EmptyDescription>
                  {error || "Could not load request analytics."}
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : data ? (
            <div className={cn("space-y-6 transition-all duration-slow", loading ? "opacity-40 blur-[1px]" : "opacity-100")}>
              <SlaCharts data={data} pieData={pieData} onSwitchView={onSwitchView} />
            </div>
          ) : null}
        </div>
      </Card>

      <PDFPreviewModal
        open={reportOpen}
        onClose={() => {
          previewSession.cancel();
          setIsGeneratingPdf(false);
          setPdfPreviewUrl(null)
          setReportOpen(false)
        }}
        title={previewReportType === "csm"
          ? "Client Satisfaction Measurement (CSM) Report"
          : previewReportType === "comprehensive"
            ? "Combined Processing Time and Client Satisfaction Report"
            : "Citizen's Charter Processing Time Report"}
        description={"Reporting Coverage: " + (startDate || "Earliest Records") + " to " + (endDate || "Present")}
        pdfUrl={pdfBlobUrl}
        isPreparing={isGeneratingPdf}
        onDownload={handleDownloadPdf}
        onPrint={() => onLogAction?.({ action: "Print Report", details: "opened print dialog for " + previewReportType + " report", entityType: "Report" })}
        onPrintError={(error) => showToast?.(formatErrorMessage(error, { defaultTitle: "Report Printing Failed" }), true)}
        headerActions={
          <div role="group" aria-label="Report type" className="inline-flex max-w-full flex-wrap items-center gap-1 p-1 rounded-full bg-black/[0.04] dark:bg-white/[0.06] border border-black/[0.04] dark:border-white/[0.08] shadow-[inset_0_1px_2px_rgba(0,0,0,0.03)] select-none">
            {[
              ["sla", "On-Time Processing"],
              ["csm", "Client Ratings (CSM)"],
              ["comprehensive", "Combined"],
            ].map(([type, label]) => {
              const isSelected = previewReportType === type;
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => handleSwitchPreviewReport(type)}
                  disabled={isGeneratingPdf}
                  aria-pressed={isSelected}
                  className={cn(
                    "min-h-11 sm:min-h-7.5 cursor-pointer rounded-full px-3.5 py-1 text-xs font-semibold transition-all duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring active:scale-[0.98]",
                    isSelected
                      ? "bg-white text-gray-950 dark:bg-zinc-800 dark:text-white shadow-[0_1px_3px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.04),inset_0_1px_0_0_rgba(255,255,255,0.85)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.35),inset_0_1px_0_0_rgba(255,255,255,0.08)]"
                      : "text-gray-600 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white"
                  )}
                >
                  {label}
                </button>
              );
            })}
          </div>
        }
      />
    </div>
  )
})

export default SLAAnalyticsTab
