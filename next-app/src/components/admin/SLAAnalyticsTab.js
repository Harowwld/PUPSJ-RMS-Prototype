"use client"

import { useEffect, useState } from "react"
import {
  Card,
  CardContent,
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { formatPHDateTime } from "@/lib/timeFormat"
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
import { STATUS_COLORS } from "@/lib/constants"
import { downloadSlaCsv } from "@/lib/exportHelpers"
import SlaKpiCards from "./analytics/SlaKpiCards"
import SlaCharts from "./analytics/SlaCharts"
import SlaFilters from "./analytics/SlaFilters"

export default function SLAAnalyticsTab({
 showToast, onLogAction }) {
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

  const loadData = async () => {
    setLoading(true)
    setError("")
    try {
      const params = new URLSearchParams()
      if (startDate) params.set("startDate", startDate)
      if (endDate) params.set("endDate", endDate)
      
      const res = await fetch(`/api/analytics/document-requests?${params.toString()}`, {
        cache: "no-store",
      })
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
    loadData()
  }

  // Safe variables
  const total = data?.totalRequests || 0
  const slaHours = data?.sla?.averageTurnaroundHours
  const completed = data?.sla?.totalCompleted || 0
  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0

  const pieData = Object.entries(data?.statusCounts || {})
    .map(([name, value]) => ({ name, value }))
    .filter((d) => d.value > 0)

  const getFileName = (type, ext) => {
    const now = new Date();
    const date = now.toISOString().split('T')[0];
    const time = now.getHours().toString().padStart(2, '0') + now.getMinutes().toString().padStart(2, '0');
    return `PUP-SLA-${type}-${date}-${time}.${ext}`;
  }

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
    const fileName = getFileName("REPORT", "pdf");
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
      const fileName = getFileName("ANALYTICS", "csv");
      downloadSlaCsv(data, total, slaHours, completionRate, onLogAction, fileName);
      showToast?.({ title: "Export Successful", description: `The SLA data has been successfully exported to ${fileName}.` });
    } catch (e) {
      showToast?.({ title: "Export Failed", description: "Failed to export SLA analytics to CSV format." }, true);
    } finally {
      setIsExportingCsv(false);
    }
  }

  return (
    <div className="animate-fade-in font-inter flex h-full min-h-0 w-full flex-col">
      <Card className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-brand border border-gray-200 bg-white shadow-sm">
        <PageHeader
          icon="ph-chart-line-up"
          title="Document Request SLA Analytics"
          description="Service level agreements and turnaround metrics for alumni requests."
          actions={
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="default"
                size="sm"
                onClick={handlePreview}
                disabled={loading || !data || isGeneratingPdf}
                className="h-10 rounded-brand border border-pup-maroon bg-pup-maroon px-6 text-sm font-bold text-white shadow-sm hover:bg-red-900 disabled:opacity-60 transition-colors"
              >
                <i className={cn("ph-bold mr-1.5 text-sm", isGeneratingPdf ? "ph-spinner animate-spin" : "ph-file-pdf")} aria-hidden />
                {isGeneratingPdf ? "GENERATING..." : "GENERATE REPORT"}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCsvExport}
                disabled={loading || !data || isExportingCsv}
                className="h-10 px-4 font-bold border-gray-300 shadow-sm hover:border-pup-maroon hover:bg-red-50/30 rounded-brand transition-colors"
              >
                <i
                  className={cn("ph-bold mr-1.5 text-pup-maroon", isExportingCsv ? "ph-spinner animate-spin" : "ph-download-simple")}
                  aria-hidden
                />
                {isExportingCsv ? "EXPORTING..." : "EXPORT CSV"}
              </Button>
            </div>
          }
        />

        <SlaFilters 
            startDate={startDate}
            setStartDate={setStartDate}
            endDate={endDate}
            setEndDate={setEndDate}
            isLoading={loading}
            onRefresh={handleRefresh}
        />

        <CardContent className="flex-1 overflow-auto bg-white p-6">
          {loading && !data ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-28 rounded-brand" />
                ))}
              </div>
              <Skeleton className="h-72 w-full rounded-brand" />
            </div>
          ) : error ? (
            <Empty className="flex h-[400px] flex-col items-center justify-center rounded-brand border border-gray-200 bg-white text-center text-gray-500 shadow-sm">
              <EmptyHeader className="flex flex-col items-center gap-0">
                <EmptyMedia className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-gray-200 bg-white shadow-sm">
                  <i className="ph-duotone ph-warning-circle text-3xl text-pup-maroon" />
                </EmptyMedia>
                <EmptyTitle className="text-lg font-bold text-gray-900">
                  Could not load SLA analytics
                </EmptyTitle>
                <EmptyDescription className="mt-1 max-w-md text-sm font-medium text-gray-600">
                  {error}
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : data ? (
            <div className={cn("space-y-6 transition-opacity duration-300", loading && "opacity-40")}>
              <SlaKpiCards total={total} slaHours={slaHours} completionRate={completionRate} />
              <SlaCharts data={data} pieData={pieData} />
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
          hideClose={isFullscreenPreview}
          className={cn(
            "flex flex-col overflow-hidden border border-gray-200 bg-gray-100 p-0 shadow-2xl transition-all duration-300 ease-out",
            isFullscreenPreview 
                ? "fixed h-screen w-screen max-w-none sm:max-w-none m-0 rounded-none z-[100] left-1/2 top-1/2 translate-x-[-50%] translate-y-[-50%] sm:w-screen sm:h-screen" 
                : "h-[90vh] w-[96vw] max-w-[96vw] xl:max-w-[1200px] rounded-brand"
        )}>
          <DialogHeader className="shrink-0 border-b border-gray-100 bg-gray-50/50 p-6">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-white text-pup-maroon shadow-sm">
                    <i className="ph-duotone ph-file-text text-2xl"></i>
                </div>
                <div className="min-w-0">
                    <DialogTitle className="text-left text-xl leading-none font-black tracking-tight text-gray-900">
                    Formal SLA Compliance Report
                    </DialogTitle>
                    <p className="mt-1.5 text-left text-sm font-medium text-gray-500">
                    Reporting Period: {startDate || "Beginning"} to {endDate || "Present"}
                    </p>
                </div>
              </div>

              <div className={cn("flex items-center gap-2", !isFullscreenPreview && "mr-8")}>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsFullscreenPreview(!isFullscreenPreview)}
                    className="h-10 gap-2 rounded-brand border-gray-300 bg-white font-bold text-gray-700 hover:bg-gray-50 active:scale-95 shadow-sm"
                >
                    <i className={cn("ph-bold", isFullscreenPreview ? "ph-corners-in" : "ph-corners-out")} />
                    {isFullscreenPreview ? "EXIT FULL SCREEN" : "FULL SCREEN"}
                </Button>
              </div>
            </div>
          </DialogHeader>

          <div className="relative flex-1 overflow-hidden bg-gray-100">
            {pdfBlobUrl ? (
              <div className="relative h-full w-full">
                {!previewFrameReady && (
                  <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white p-10">
                    <div className="w-full max-w-2xl space-y-4">
                      <Skeleton className="h-8 w-64" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-[60vh] w-full" />
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
              <div className="flex h-full w-full flex-col items-center justify-center bg-white p-10">
                <div className="flex flex-col items-center gap-4">
                  <i className="ph-bold ph-spinner animate-spin text-4xl text-pup-maroon" />
                  <p className="text-sm font-bold text-gray-500 uppercase tracking-widest">
                    Generating Report Preview...
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="flex shrink-0 justify-end gap-3 border-t border-gray-100 bg-white p-4">
            <Button
              variant="outline"
              onClick={() => setReportOpen(false)}
              className="h-11 px-6 font-bold border-gray-300 shadow-sm hover:border-pup-maroon hover:bg-red-50/30 rounded-brand transition-colors"
            >
              CLOSE PREVIEW
            </Button>
            <Button
              onClick={handlePrint}
              disabled={!pdfBlobUrl}
              className="flex h-11 items-center gap-2 bg-pup-maroon px-8 font-bold text-white shadow-sm hover:bg-red-900 rounded-brand transition-colors"
            >
              <i className="ph-bold ph-printer text-lg"></i> FINALIZE AND PRINT
              REPORT
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
