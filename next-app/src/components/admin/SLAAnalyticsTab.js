"use client"

import LucideIcon from "@/components/shared/LucideIcon";
import React, { useEffect, useState, useMemo } from "react"
import {
  Card,
  CardContent,
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import SlaKpiSkeleton from "@/components/admin/skeletons/SlaKpiSkeleton"
import SlaChartsSkeleton from "@/components/admin/skeletons/SlaChartsSkeleton"
import { Button } from "@/components/ui/button"
import { formatPHDateTime } from "@/lib/timeFormat"
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
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { generateSLAAnalyticsPdf } from "@/lib/pdfGenerator"
import PageHeader from "@/components/shared/PageHeader"
import { RefreshButton } from "@/components/shared/RefreshButton"
import { STATUS_COLORS } from "@/lib/constants"
import { downloadSlaCsv } from "@/lib/exportHelpers"
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
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false)
  const [isExportingCsv, setIsExportingCsv] = useState(false)

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
        throw new Error(json?.error || "Failed to load SLA data")
      setData(json.data)
    } catch (e) {
      setError(e.message)
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

  const pieData = useMemo(() => {
    return Object.entries(data?.statusCounts || {})
      .map(([name, value]) => ({ name, value }))
      .filter((d) => d.value > 0)
  }, [data?.statusCounts])

  const handlePreview = async () => {
    if (!data || loading) return;
    setIsGeneratingPdf(true);
    try {
      const blob = await generateSLAAnalyticsPdf(data, total, completionRate, { startDate, endDate });
      const url = URL.createObjectURL(blob);
      setPdfPreviewUrl(url);
      setReportOpen(true);
    } catch (e) {
      console.error("PDF Preview generation failed:", e);
      showToast?.({ title: "Preview Failed", description: "Failed to generate PDF report preview." }, true);
    } finally {
      setIsGeneratingPdf(false);
    }
  }

  const handlePrint = async () => {
    const fileName = generateExportFilename("SLA-ANALYTICS", "REPORT", "pdf");
    if (!pdfBlobUrl) {
      setIsGeneratingPdf(true);
      try {
        const blob = await generateSLAAnalyticsPdf(data, total, completionRate, { startDate, endDate });
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
        showToast?.({ title: "Report Generation Failed", description: "An error occurred while generating the PDF report." }, true);
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
      details: `generated formal SLA compliance report (${fileName}) for administrative records`,
      entityType: "Report",
    })
    showToast?.({ title: "Report Downloaded", description: "The SLA Analytics report has been successfully downloaded." });
  }

  const handleCsvExport = async () => {
    setIsExportingCsv(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 100));
      const fileName = generateExportFilename("SLA-ANALYTICS", "DATA", "csv");
      downloadSlaCsv(data, total, completionRate, onLogAction, fileName);
      showToast?.({ title: "Export Successful", description: `The SLA data has been successfully exported to ${fileName}.` });
    } catch (e) {
      showToast?.({ title: "Export Failed", description: "Failed to export SLA analytics to CSV format." }, true);
    } finally {
      setIsExportingCsv(false);
    }
  }

  const hasActiveFilters = startDate !== "" || endDate !== ""

  return (
    <div className="animate-fade-up font-jakarta flex flex-1 flex-col h-full min-h-0 w-full gap-6">
      {/* ONE Single Card Container encapsulating Header, Metrics, Toolbar, & Charts */}
      <Card className="flex h-auto w-full flex-col p-0 gap-0 overflow-visible rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-card dark:shadow-none isolate font-jakarta mb-4 min-h-0 flex-1">
        <PageHeader
          icon="ph-chart-line-up"
          title="Request Analysis"
          description="Monitor request metrics and turnaround times."
          showBorder={false}
          className="p-6"
          titleClassName="text-[18px] font-semibold tracking-[-0.01em] text-gray-900 dark:text-zinc-50"
          descriptionClassName="text-[13px] font-normal text-gray-500 dark:text-zinc-400 mt-[4px]"
          actions={
            <div className="flex items-center gap-6">
              <RefreshButton 
                onRefresh={handleRefresh} 
                isLoading={manualLoading} 
                title="Refresh Analytics"
              />

              <div className="h-6 w-px bg-gray-200 dark:bg-zinc-800" />

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCsvExport}
                  disabled={loading || !data || isExportingCsv}
                  className="flex h-10 items-center justify-center rounded-xl! border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 font-semibold text-xs active:scale-95 transition-all cursor-pointer px-4 shadow-xs hover:bg-gray-50 dark:hover:bg-zinc-700"
                >
                  {isExportingCsv ? (
                    <LucideIcon  className="ph-bold ph-spinner animate-spin text-[16px]"></LucideIcon>
                  ) : (
                    "Export"
                  )}
                </Button>
                <Button
                  type="button"
                  onClick={handlePreview}
                  disabled={loading || !data || isGeneratingPdf}
                  className="flex h-10 items-center justify-center rounded-xl! btn-brand-red text-white font-semibold text-xs active:scale-95 disabled:opacity-50 transition-all cursor-pointer px-5 shadow-xs"
                >
                  {isGeneratingPdf ? (
                    <LucideIcon  className="ph-bold ph-spinner animate-spin text-[16px] flex items-center justify-center"></LucideIcon>
                  ) : (
                    "Download"
                  )}
                </Button>
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
          <div className="px-6 pb-6">
            <div className={cn(
              "w-full transition-all duration-500", 
              (loading && !manualLoading) ? "opacity-40 blur-[1px] grayscale-[0.1]" : "opacity-100"
            )}>
              <SlaKpiCards total={total} completionRate={completionRate} completed={completed} sla={data?.sla} />
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
          onRefresh={handleRefresh}
        />

        {/* Active Filter Chips Row */}
        {hasActiveFilters && (() => {
          const formatChipDate = (dateStr) => {
            if (!dateStr) return "..."
            try {
              const [y, m, d] = dateStr.split("-").map(Number)
              if (isNaN(y) || isNaN(m) || isNaN(d)) return dateStr
              return new Date(y, m - 1, d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
            } catch (e) {
              return dateStr
            }
          }
          return (
            <div className="flex-none border-t border-gray-100 dark:border-white/10 bg-white dark:bg-card px-6 py-3 animate-in fade-in slide-in-from-top-1 duration-normal">
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

        <CardContent className="bg-white p-6 dark:bg-card border-t border-gray-100 dark:border-white/10 rounded-b-2xl">
          {loading && !data ? (
            <SlaChartsSkeleton />
          ) : error ? (
            <Empty className="flex h-[400px] flex-col items-center justify-center rounded-2xl border border-gray-200 bg-white text-center text-gray-500 shadow-sm dark:border-white/10 dark:bg-card dark:text-zinc-400 dark:shadow-none">
              <EmptyHeader className="flex flex-col items-center gap-0">
                <EmptyMedia className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-card dark:shadow-none">
                  <LucideIcon  className="ph-duotone ph-warning-circle text-xl text-pup-maroon dark:text-primary" />
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
        </CardContent>
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
          hideClose={true}
          className="flex h-[90vh] w-[96vw] max-w-[96vw] flex-col overflow-hidden border border-gray-200 bg-gray-100 p-0 shadow-2xl transition-all duration-normal ease-standard font-jakarta xl:max-w-[1400px] rounded-2xl dark:border-white/10 dark:bg-muted"
        >
          <DialogHeader 
            className="shrink-0 bg-gray-50 dark:bg-white/5"
            style={{
              padding: '20px 24px',
              borderBottom: '0.5px solid rgba(0,0,0,0.08)',
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px'
            }}
          >
            <div className="min-w-0">
              <DialogTitle className="text-left" style={{ fontSize: '15px', fontWeight: 600, color: '#111', letterSpacing: '-0.01em' }}>
                SLA Analytics Report Preview
              </DialogTitle>
              <p style={{ marginTop: '2px', fontSize: '12px', fontWeight: 400, color: '#8E8E93' }} className="text-left">
                Period: {startDate || "All"} · {endDate || "Present"}
              </p>
            </div>
            
            <DialogClose asChild>
              <button
                type="button"
                className="hover:text-[#111] dark:hover:text-white transition-colors focus:outline-none flex items-center justify-center p-0"
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#8E8E93',
                  cursor: 'pointer'
                }}
              >
                <LucideIcon  className="ti ti-x" style={{ fontSize: '16px' }}></LucideIcon>
              </button>
            </DialogClose>
          </DialogHeader>

          <div className="relative flex-1 overflow-hidden bg-gray-100 dark:bg-muted">
            {pdfBlobUrl ? (
              <div className={cn("relative h-full w-full transition-all duration-normal", isFullscreenPreview ? "fixed inset-0 z-[9999] bg-white dark:bg-card" : "")}>
                {isFullscreenPreview && (
                  <div className="absolute top-4 right-4 z-[10000]">
                    <Button
                      variant="default"
                      size="icon"
                      onClick={() => setIsFullscreenPreview(false)}
                      className="h-10 w-10 rounded-full bg-black/50 text-white hover:bg-black/70 backdrop-blur-md border-0"
                    >
                      <LucideIcon  className="ph-bold ph-x text-lg"></LucideIcon>
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
                  src={`${pdfBlobUrl}#toolbar=0&navpanes=0`}
                  className="h-full w-full border-none"
                  onLoad={() => setPreviewFrameReady(true)}
                  title="SLA Analytics Report Preview"
                />
              </div>
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center bg-white p-10 dark:bg-card">
                <div className="flex flex-col items-center gap-4">
                  <LucideIcon  className="ph-bold ph-spinner animate-spin text-xl text-pup-maroon dark:text-primary" />
                  <p className="text-sm font-semibold text-gray-500 tracking-widest dark:text-zinc-400">
                    Generating Report Preview...
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="flex shrink-0 items-center bg-white dark:bg-card px-6 py-4 border-t border-gray-100 dark:border-white/10">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsFullscreenPreview(!isFullscreenPreview)}
              className="text-[#8E8E93] hover:text-[#111] dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 transition-colors rounded-xl shadow-none border-0 p-0 h-10 w-10 cursor-pointer"
            >
              <LucideIcon  className="ti ti-arrows-vertical text-[16px]"></LucideIcon>
            </Button>

            <div className="flex items-center gap-2.5 ml-auto">
              <Button
                variant="outline"
                onClick={() => setReportOpen(false)}
                className="flex h-10 items-center justify-center rounded-xl! border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 font-semibold text-xs active:scale-95 transition-all cursor-pointer px-5 shadow-xs hover:bg-gray-50 dark:hover:bg-zinc-700"
              >
                Close
              </Button>
              <Button
                onClick={handlePrint}
                disabled={!pdfBlobUrl}
                className="h-10 px-5 rounded-xl! text-xs font-semibold text-white btn-brand-red active:scale-95 disabled:opacity-50 transition-all cursor-pointer shadow-xs"
              >
                Download
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
})

export default SLAAnalyticsTab



