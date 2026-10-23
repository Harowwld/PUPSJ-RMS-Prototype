"use client"

import HugeIcon from "@/components/shared/HugeIcon";
import React, { useEffect, useState, useMemo, useRef } from "react"
import {
  Card,
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog"
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

const SLAAnalyticsTab = React.memo(function SLAAnalyticsTab({
 showToast, onLogAction, onSwitchView }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [manualLoading, setManualLoading] = useState(false)
  const [error, setError] = useState("")
  const [reportOpen, setReportOpen] = useState(false)
  const [pdfBlobUrl, setPdfPreviewUrl] = useState(null)
  const [previewFrameReady, setPreviewFrameReady] = useState(false)
  const pdfPreviewFrameRef = useRef(null)
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false)
  const [isExportingCsv, setIsExportingCsv] = useState(false)
  const [previewReportType, setPreviewReportType] = useState("sla") // "sla", "csm", "comprehensive"

  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [isFullscreenPreview, setIsFullscreenPreview] = useState(false)

  const loadData = async (isManual = false) => {
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
  }

  useEffect(() => {
    loadData()
  }, [startDate, endDate])

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
    setPreviewFrameReady(false);
    try {
      const blob = await generateBlobForType(type);
      if (pdfBlobUrl) URL.revokeObjectURL(pdfBlobUrl);
      const url = URL.createObjectURL(blob);
      setPdfPreviewUrl(url);
      setReportOpen(true);
    } catch (e) {
      console.error("PDF Preview generation failed:", e);
      showToast?.(formatErrorMessage(e, "Preview Failed"), true);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleSwitchPreviewReport = async (newType) => {
    if (newType === previewReportType || !data) return;
    setIsGeneratingPdf(true);
    setPreviewReportType(newType);
    setPreviewFrameReady(false);
    try {
      const blob = await generateBlobForType(newType);
      if (pdfBlobUrl) URL.revokeObjectURL(pdfBlobUrl);
      const url = URL.createObjectURL(blob);
      setPdfPreviewUrl(url);
    } catch (e) {
      console.error("Failed to switch report preview:", e);
      showToast?.(formatErrorMessage(e, "Report Switch Failed"), true);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handlePrint = async () => {
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

  const handlePrintReport = () => {
    const printWindow = pdfPreviewFrameRef.current?.contentWindow
    if (!printWindow || !previewFrameReady) {
      showToast?.({ title: "Report Not Ready", description: "Wait for the report preview to finish loading, then try printing." }, true)
      return
    }

    try {
      printWindow.focus()
      printWindow.print()
      onLogAction?.({
        action: "Print Report",
        details: `opened print dialog for ${previewReportType} report`,
        entityType: "Report",
      })
    } catch (e) {
      console.error("Report printing failed:", e)
      showToast?.(formatErrorMessage(e, "Report Printing Failed"), true)
    }
  }

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
    <div data-light-only className="animate-fade-up font-jakarta flex flex-1 flex-col min-h-full w-full gap-6 pb-6">
      {/* ONE Single Card Container encapsulating Header, Metrics, Toolbar, & Charts */}
      <Card className="flex h-auto w-full flex-col p-0 gap-0 overflow-visible rounded-2xl border border-border bg-white shadow-sm dark:border-border dark:bg-card dark:shadow-none isolate font-jakarta flex-1 mb-4">
        <PageHeader
          icon="ph-chart-line-up"
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
                      className="flex h-10 items-center justify-center rounded-xl! border border-border dark:border-border bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 font-semibold text-xs active:scale-95 transition-all cursor-pointer px-4 shadow-xs hover:bg-gray-50 dark:hover:bg-zinc-700 gap-1.5"
                    >
                      {isExportingCsv ? (
                        <HugeIcon className="ph-bold ph-spinner animate-spin text-[16px]" />
                      ) : (
                        <>
                          <span>Export CSV</span>
                          <HugeIcon className="ph-bold ph-caret-down text-[10px] opacity-70" />
                        </>
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    data-light-only
                    align="end"
                    sideOffset={6}
                    className="w-60 rounded-2xl border border-border dark:border-white/10 shadow-2xl p-0 overflow-hidden bg-white dark:bg-zinc-900 select-none"
                  >
                    {/* Zone 1: Header */}
                    <div className="px-4 py-2.5 border-b border-border dark:border-white/10 bg-gray-50/60 dark:bg-zinc-800/40 flex items-center justify-between">
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
                        <HugeIcon className="ph-bold ph-clock-countdown text-sm text-pup-maroon dark:text-red-400" />
                        <span>On-Time Processing Data</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => handleCsvExport("csm")} 
                        className="cursor-pointer text-xs font-medium py-1.5 px-2 rounded-lg flex items-center gap-2 text-gray-700 dark:text-zinc-200 hover:bg-gray-100 dark:hover:bg-zinc-800"
                      >
                        <HugeIcon className="ph-fill ph-star text-sm text-amber-500" />
                        <span>CSM Ratings Data</span>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator className="my-1 border-t border-border dark:border-white/10" />
                      <DropdownMenuItem 
                        onClick={() => handleCsvExport("comprehensive")} 
                        className="cursor-pointer text-xs font-medium py-1.5 px-2 rounded-lg flex items-center gap-2 text-gray-700 dark:text-zinc-200 hover:bg-gray-100 dark:hover:bg-zinc-800"
                      >
                        <HugeIcon className="ph-bold ph-table text-sm text-gray-400" />
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
                      className="flex h-10 items-center justify-center rounded-xl! btn-brand-red text-white font-semibold text-xs active:scale-95 disabled:opacity-50 transition-all cursor-pointer px-5 shadow-xs gap-1.5"
                    >
                      {isGeneratingPdf ? (
                        <HugeIcon className="ph-bold ph-spinner animate-spin text-[16px] flex items-center justify-center" />
                      ) : (
                        <>
                          <span>Official Report (PDF)</span>
                          <HugeIcon className="ph-bold ph-caret-down text-[10px] text-white/80" />
                        </>
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    data-light-only
                    align="end"
                    sideOffset={6}
                    className="w-64 rounded-2xl border border-border dark:border-white/10 shadow-2xl p-0 overflow-hidden bg-white dark:bg-zinc-900 select-none"
                  >
                    {/* Zone 1: Header */}
                    <div className="px-4 py-2.5 border-b border-border dark:border-white/10 bg-gray-50/60 dark:bg-zinc-800/40 flex items-center justify-between">
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
                        <HugeIcon className="ph-bold ph-file-text text-sm text-pup-maroon dark:text-red-400" />
                        <span>Citizen&apos;s Charter Processing Time Report</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => handlePreview("csm")} 
                        className="cursor-pointer text-xs font-medium py-1.5 px-2 rounded-lg flex items-center gap-2 text-gray-700 dark:text-zinc-200 hover:bg-gray-100 dark:hover:bg-zinc-800"
                      >
                        <HugeIcon className="ph-fill ph-star text-sm text-amber-500" />
                        <span>Client Satisfaction (CSM) Report</span>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator className="my-1 border-t border-border dark:border-white/10" />
                      <DropdownMenuItem 
                        onClick={() => handlePreview("comprehensive")} 
                        className="cursor-pointer text-xs font-medium py-1.5 px-2 rounded-lg flex items-center gap-2 text-gray-700 dark:text-zinc-200 hover:bg-gray-100 dark:hover:bg-zinc-800"
                      >
                        <HugeIcon className="ph-bold ph-files text-sm text-gray-400" />
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

        <div className="bg-white p-6 dark:bg-card border-t border-border dark:border-border rounded-b-2xl">
          {loading && !data ? (
            <SlaChartsSkeleton />
          ) : error ? (
            <Empty className="flex h-[400px] flex-col items-center justify-center rounded-2xl border border-border bg-white text-center text-gray-500 shadow-sm dark:border-border dark:bg-card dark:text-zinc-400 dark:shadow-none">
              <EmptyHeader className="flex flex-col items-center gap-0">
                <EmptyMedia className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-border bg-white shadow-sm dark:border-border dark:bg-card dark:shadow-none">
                  <HugeIcon  className="ph-duotone ph-warning-circle text-xl text-pup-maroon dark:text-primary" />
                </EmptyMedia>
                <EmptyTitle className="text-lg font-semibold text-gray-900 dark:text-zinc-50">
                  Data Unavailable
                </EmptyTitle>
                <EmptyDescription className="mt-1 max-w-md text-sm font-medium text-gray-600 dark:text-zinc-300">
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

      {/* Report Preview Modal */}
      <Dialog
        open={reportOpen}
        onOpenChange={(open) => {
          if (!open) {
            if (pdfBlobUrl) URL.revokeObjectURL(pdfBlobUrl)
            setPdfPreviewUrl(null)
            setPreviewFrameReady(false)
            setIsFullscreenPreview(false)
          }
          setReportOpen(open)
        }}
      >
        <DialogContent 
          data-light-only
          hideClose={true}
          className="flex h-[90vh] w-[96vw] max-w-[96vw] flex-col gap-0 overflow-hidden rounded-2xl border border-border bg-gray-100 p-0 font-jakarta shadow-2xl transition-all duration-normal ease-standard xl:max-w-[1400px] dark:border-border dark:bg-muted"
        >
          <DialogHeader 
            className="flex shrink-0 flex-col items-stretch justify-between gap-3 border-b border-border bg-gray-50 px-6 py-4 dark:border-border dark:bg-white/5 sm:flex-row sm:items-center"
          >
            <div className="min-w-0 flex flex-col gap-0.5">
              <DialogTitle className="text-left text-[15px] font-semibold tracking-[-0.01em] text-gray-900 dark:text-zinc-50">
                {previewReportType === "csm"
                  ? "Client Satisfaction Measurement (CSM) Report"
                  : previewReportType === "comprehensive"
                  ? "Combined Processing Time and Client Satisfaction Report"
                  : "Citizen's Charter Processing Time Report"}
              </DialogTitle>
              <p className="text-[11px] text-gray-400 dark:text-zinc-500 text-left">
                Reporting Coverage: {startDate || "Earliest Records"} – {endDate || "Present"}
              </p>
            </div>

            {/* Seamless Report Switcher Inside Modal */}
            <div className="mx-2 flex max-w-full items-center gap-1 overflow-x-auto rounded-xl border border-gray-300/60 bg-gray-200/80 p-1 dark:border-white/5 dark:bg-zinc-800">
              <button
                type="button"
                onClick={() => handleSwitchPreviewReport("sla")}
                disabled={isGeneratingPdf}
                className={cn(
                  "px-3 py-1 text-[11px] font-semibold rounded-lg transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pup-maroon",
                  previewReportType === "sla"
                    ? "bg-white dark:bg-zinc-700 text-gray-900 dark:text-white shadow-xs"
                    : "text-gray-600 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white"
                )}
              >
                On-Time Processing
              </button>
              <button
                type="button"
                onClick={() => handleSwitchPreviewReport("csm")}
                disabled={isGeneratingPdf}
                className={cn(
                  "px-3 py-1 text-[11px] font-semibold rounded-lg transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pup-maroon",
                  previewReportType === "csm"
                    ? "bg-white dark:bg-zinc-700 text-gray-900 dark:text-white shadow-xs"
                    : "text-gray-600 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white"
                )}
              >
                Client Ratings (CSM)
              </button>
              <button
                type="button"
                onClick={() => handleSwitchPreviewReport("comprehensive")}
                disabled={isGeneratingPdf}
                className={cn(
                  "px-3 py-1 text-[11px] font-semibold rounded-lg transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pup-maroon",
                  previewReportType === "comprehensive"
                    ? "bg-white dark:bg-zinc-700 text-gray-900 dark:text-white shadow-xs"
                    : "text-gray-600 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white"
                )}
              >
                Combined
              </button>
            </div>
            
            <div className="flex shrink-0 items-center gap-1.5">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setIsFullscreenPreview(!isFullscreenPreview)}
                aria-label={isFullscreenPreview ? "Exit fullscreen preview" : "Enter fullscreen preview"}
                title={isFullscreenPreview ? "Exit fullscreen" : "Enter fullscreen"}
                className="h-10 w-10 rounded-xl border-0 p-0 text-gray-500 shadow-none transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-white"
              >
                <HugeIcon className={isFullscreenPreview ? "ph-bold ph-arrows-in text-[16px]" : "ph-bold ph-arrows-out text-[16px]"} />
              </Button>
              <DialogClose asChild>
                <button
                  type="button"
                  aria-label="Close report preview"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl p-0 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pup-maroon dark:text-gray-400 dark:hover:bg-zinc-800 dark:hover:text-white cursor-pointer"
                >
                  <HugeIcon className="ph-bold ph-x text-base" />
                </button>
              </DialogClose>
            </div>
          </DialogHeader>

          <div className="relative flex-1 overflow-hidden bg-gray-100 dark:bg-muted">
            {pdfBlobUrl ? (
              <div className={cn("relative h-full w-full transition-all duration-normal", isFullscreenPreview ? "fixed inset-0 z-[9999] bg-white dark:bg-card" : "")}>
                {isFullscreenPreview && (
                  <div className="absolute right-4 top-4 z-[10000]">
                    <Button
                      variant="default"
                      size="icon"
                      onClick={() => setIsFullscreenPreview(false)}
                      className="h-11 w-11 rounded-full border-0 bg-black/50 text-white hover:bg-black/70"
                    >
                      <HugeIcon  className="ph-bold ph-x text-lg"></HugeIcon>
                    </Button>
                  </div>
                )}
                {!previewFrameReady && (
                  <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white p-10 dark:bg-card">
                    <div className="w-full max-w-2xl space-y-4">
                      <Skeleton className="h-8 w-64 dark:bg-muted" />
                      <Skeleton className="h-4 w-full dark:bg-muted" />
                      <Skeleton className="h-[60vh] w-full dark:bg-muted" />
                    </div>
                  </div>
                )}
                <iframe
                  ref={pdfPreviewFrameRef}
                  src={`${pdfBlobUrl}#toolbar=0&navpanes=0`}
                  className="h-full w-full border-none"
                  onLoad={() => setPreviewFrameReady(true)}
                  title="Processing Time Report Preview"
                />
              </div>
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center bg-white p-10 dark:bg-card">
                <div className="flex flex-col items-center gap-4">
                  <HugeIcon  className="ph-bold ph-spinner animate-spin text-xl text-pup-maroon dark:text-primary" />
                  <p className="text-sm font-semibold text-gray-500 tracking-widest dark:text-zinc-400">
                    Generating Report Preview...
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="flex shrink-0 items-center justify-end gap-2.5 border-t border-border bg-white px-6 py-4 dark:border-border dark:bg-card">
            <Button
              type="button"
              variant="outline"
              onClick={() => setReportOpen(false)}
              className="h-10 rounded-xl border border-border bg-white px-4 text-xs font-semibold text-gray-700 shadow-xs transition-all hover:bg-gray-50 active:scale-95 dark:border-border dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
            >
              Close
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handlePrintReport}
              disabled={!pdfBlobUrl || !previewFrameReady || isGeneratingPdf}
              className="h-10 rounded-xl border border-border bg-white px-4 text-xs font-semibold text-gray-700 shadow-xs transition-all hover:bg-gray-50 active:scale-95 disabled:opacity-50 dark:border-border dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
            >
              Print Report
            </Button>
            <Button
              type="button"
              onClick={handlePrint}
              disabled={!pdfBlobUrl}
              className="h-10 rounded-xl! px-5 text-xs font-semibold text-white shadow-xs transition-all btn-brand-red active:scale-95 disabled:opacity-50"
            >
              Download Report
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
})

export default SLAAnalyticsTab
