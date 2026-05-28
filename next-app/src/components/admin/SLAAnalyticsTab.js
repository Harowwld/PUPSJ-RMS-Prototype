"use client"

import { useEffect, useState } from "react"
import {
  Card,
  CardContent,
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
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

export default function SLAAnalyticsTab({
 showToast, onLogAction, onSwitchView }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
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
    setLoading(true)
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
  const slaHours = data?.sla?.averageTurnaroundHours
  const completed = data?.sla?.totalCompleted || 0
  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0

  const pieData = Object.entries(data?.statusCounts || {})
    .map(([name, value]) => ({ name, value }))
    .filter((d) => d.value > 0)

  const handlePreview = async () => {
    if (!data || loading) return;
    setIsGeneratingPdf(true);
    try {
      const blob = await generateSLAAnalyticsPdf(data, total, slaHours, completionRate);
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
        const blob = await generateSLAAnalyticsPdf(data, total, slaHours, completionRate);
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
      downloadSlaCsv(data, total, slaHours, completionRate, onLogAction, fileName);
      showToast?.({ title: "Export Successful", description: `The SLA data has been successfully exported to ${fileName}.` });
    } catch (e) {
      showToast?.({ title: "Export Failed", description: "Failed to export SLA analytics to CSV format." }, true);
    } finally {
      setIsExportingCsv(false);
    }
  }

  const hasActiveFilters = startDate !== "" || endDate !== ""

  return (
    <div className="animate-fade-up font-inter flex h-full min-h-0 w-full flex-col">
      <Card className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-brand border border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-card dark:shadow-none">
        <PageHeader
          icon="ph-chart-line-up"
          title="Request Analysis"
          description="Monitor request metrics and turnaround times."
          actions={
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="default"
                size="sm"
                onClick={handlePreview}
                disabled={loading || !data || isGeneratingPdf}
                className="h-10 px-6 font-black text-[10px] tracking-widest btn-brand-red active:scale-95 disabled:opacity-60 rounded-brand uppercase transition-all dark:shadow-none"
              >
                <i className={cn("ph-bold text-base mr-2", isGeneratingPdf ? "ph-spinner animate-spin" : "ph-file-pdf")} aria-hidden />
                {isGeneratingPdf ? "Generating..." : "Generate Report"}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCsvExport}
                disabled={loading || !data || isExportingCsv}
                className="flex h-10 w-32 items-center justify-center gap-1.5 rounded-brand border border-gray-300 text-[10px] font-bold text-gray-600 shadow-sm transition-colors hover:border-pup-maroon hover:bg-red-50 hover:text-pup-maroon dark:hover:text-red-500 active:scale-95 disabled:opacity-50 dark:text-zinc-300 dark:shadow-none dark:bg-red-950/30 dark:border-white/10"
              >
                <i className={cn("ph-bold text-base", isExportingCsv ? "ph-spinner animate-spin" : "ph-file-csv")} aria-hidden />
                {isExportingCsv ? "PREPARING..." : "EXPORT"}
              </Button>

              <div className="ml-2 flex items-center gap-3 border-l border-gray-200 pl-4 dark:border-white/10">
                  <div className="flex flex-col items-end gap-1">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest dark:text-zinc-500">Dataset Sync</p>
                      <p className="text-[10px] font-medium text-gray-500 whitespace-nowrap dark:text-zinc-400">
                          {hasActiveFilters ? "Filtering live analytics..." : "Showing cumulative data"}
                      </p>
                  </div>
                  <RefreshButton 
                    onRefresh={handleRefresh} 
                    isLoading={loading} 
                    title="Refresh Analytics"
                  />
              </div>
            </div>
          }
        />

        {/* Active Filter Chips Row */}
        {hasActiveFilters && (
          <div className="flex-none border-b border-gray-100 bg-white px-4 py-3 animate-in fade-in slide-in-from-top-1 duration-300 dark:border-white/10 dark:bg-card">
            <div className="flex flex-wrap items-center gap-2">
              <span className="mr-1 text-[10px] font-bold tracking-widest text-gray-400 uppercase dark:text-zinc-500">Active Filters:</span>
              {(startDate || endDate) && (
                <div className="flex items-center gap-1 rounded-full border border-emerald-100/30 bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-600 uppercase dark:bg-emerald-950/30 dark:text-emerald-400">
                  Range: {startDate || "..."} to {endDate || "..."}
                  <button
                    onClick={() => { setStartDate(""); setEndDate(""); }}
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
                  setStartDate("")
                  setEndDate("")
                }}
                className="h-6 rounded-full border-2 border-dashed border-gray-300 px-3 text-[10px] font-black text-pup-maroon dark:text-primary transition-colors hover:border-pup-darkMaroon hover:bg-red-50 hover:text-pup-maroon uppercase dark:border-white/10 dark:text-primary dark:bg-red-950/30"
              >
                CLEAR ALL FILTERS
              </Button>
            </div>
          </div>
        )}

        <SlaFilters 
            startDate={startDate}
            setStartDate={setStartDate}
            endDate={endDate}
            setEndDate={setEndDate}
            isLoading={loading}
            onRefresh={handleRefresh}
        />

        <CardContent className="flex-1 overflow-auto bg-white p-6 dark:bg-card">
          {loading && !data ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-28 rounded-brand dark:bg-muted" />
                ))}
              </div>
              <Skeleton className="h-72 w-full rounded-brand dark:bg-muted" />
            </div>
          ) : error ? (
            <Empty className="flex h-[400px] flex-col items-center justify-center rounded-brand border border-gray-200 bg-white text-center text-gray-500 shadow-sm dark:border-white/10 dark:bg-card dark:text-zinc-400 dark:shadow-none">
              <EmptyHeader className="flex flex-col items-center gap-0">
                <EmptyMedia className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-card dark:shadow-none">
                  <i className="ph-duotone ph-warning-circle text-3xl text-pup-maroon dark:text-primary" />
                </EmptyMedia>
                <EmptyTitle className="text-lg font-bold text-gray-900 dark:text-zinc-50">
                  Data Unavailable
                </EmptyTitle>
                <EmptyDescription className="mt-1 max-w-md text-sm font-medium text-gray-600 dark:text-zinc-300">
                  {error || "Could not load request analytics."}
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : data ? (
            <div className={cn("space-y-6 transition-all duration-500", loading ? "opacity-40 blur-[1px]" : "opacity-100")}>
              <SlaKpiCards total={total} slaHours={slaHours} completionRate={completionRate} />
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
          className="flex h-[90vh] w-[96vw] max-w-[96vw] flex-col overflow-hidden border border-gray-200 bg-gray-100 p-0 shadow-2xl transition-all duration-300 ease-out xl:max-w-[1200px] rounded-brand dark:border-white/10 dark:bg-muted"
        >
          <DialogHeader className="shrink-0 border-b border-gray-100 bg-gray-50 p-6 dark:border-white/10 dark:bg-white/5">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-white text-pup-maroon dark:text-primary shadow-sm dark:border-white/10 dark:bg-card dark:text-primary dark:shadow-none">
                    <i className="ph-duotone ph-file-text text-2xl"></i>
                </div>
                <div className="min-w-0">
                    <DialogTitle className="text-left text-xl leading-none font-black tracking-tight text-gray-900 dark:text-zinc-50">
                    SLA Analytics Report
                    </DialogTitle>
                    <p className="mt-1.5 text-left text-sm font-medium text-gray-500 dark:text-zinc-400">
                    Period: {startDate || "All"} to {endDate || "Present"}
                    </p>
                </div>
              </div>
            </div>
          </DialogHeader>

          <div className="relative flex-1 overflow-hidden bg-gray-100 dark:bg-muted">
            {pdfBlobUrl ? (
              <div className={cn("relative h-full w-full transition-all duration-300", isFullscreenPreview ? "fixed inset-0 z-[9999] bg-white dark:bg-card" : "")}>
                {isFullscreenPreview && (
                  <div className="absolute top-4 right-4 z-[10000]">
                    <Button
                      variant="default"
                      size="icon"
                      onClick={() => setIsFullscreenPreview(false)}
                      className="h-10 w-10 rounded-full bg-black/50 text-white hover:bg-black/70 backdrop-blur-md border-0"
                    >
                      <i className="ph-bold ph-x text-lg"></i>
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
                  <i className="ph-bold ph-spinner animate-spin text-4xl text-pup-maroon dark:text-primary" />
                  <p className="text-sm font-bold text-gray-500 uppercase tracking-widest dark:text-zinc-400">
                    Generating Report Preview...
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="flex shrink-0 justify-between items-center gap-3 border-t border-gray-100 bg-white p-4 dark:border-white/10 dark:bg-card">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setIsFullscreenPreview(!isFullscreenPreview)}
              className={cn(
                "h-11 w-11 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-card transition-all hover:bg-gray-50 dark:hover:bg-white/10 dark:bg-card shadow-sm dark:shadow-none",
                isFullscreenPreview && "bg-pup-maroon dark:bg-red-600 text-white hover:bg-pup-darkMaroon border-pup-darkMaroon"
              )}
            >
              <i className={cn("ph-bold text-xl", isFullscreenPreview ? "ph-corners-in" : "ph-corners-out")}></i>
            </Button>

            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={() => setReportOpen(false)}
                className="h-11 px-6 font-bold border-gray-300 shadow-sm hover:border-gray-300 hover:bg-red-50 rounded-brand transition-colors dark:shadow-none dark:hover:border-zinc-700 dark:bg-red-950/30 dark:border-white/10"
              >
                CLOSE PREVIEW
              </Button>
              <Button
                onClick={handlePrint}
                disabled={!pdfBlobUrl}
                className="btn-brand-red px-8 font-black text-white shadow-sm rounded-brand transition-colors dark:shadow-none"
              >
                <i className="ph-bold ph-floppy-disk text-lg"></i> SAVE TO DEVICE
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}



