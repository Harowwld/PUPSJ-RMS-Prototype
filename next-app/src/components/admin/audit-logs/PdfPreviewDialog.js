"use client"


import { useRef } from "react";
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog"

import { cn } from "@/lib/utils"
import { Cancel01Icon, Loading01Icon } from "hugeicons-react";
import AppIcon from "@/components/ui/app-icon";
import PDFPreview from "@/components/shared/PDFPreview";
export default function PdfPreviewDialog({
  pdfPreviewOpen,
  setPdfPreviewOpen,
  pdfBlobUrl,
  setPdfPreviewUrl,
  previewFrameReady,
  setPreviewFrameReady,
  handleDownloadFromPreview,
  showToast,
  isFullscreenPreview,
  setIsFullscreenPreview,
}) {
  const pdfPreviewFrameRef = useRef(null)

  const handlePrint = () => {
    const printWindow = pdfPreviewFrameRef.current?.contentWindow
    if (!printWindow || !previewFrameReady) {
      showToast?.({ title: "Report Not Ready", description: "Wait for the report preview to finish loading, then try printing." }, true)
      return
    }

    try {
      printWindow.focus()
      printWindow.print()
    } catch (err) {
      console.error("Activity history report printing failed:", err)
      showToast?.({ title: "Print Failed", description: "Unable to open the print dialog for this report." }, true)
    }
  }

  return (
    <Dialog
      open={pdfPreviewOpen}
      onOpenChange={(open) => {
        if (!open) {
          if (pdfBlobUrl) URL.revokeObjectURL(pdfBlobUrl)
          setPdfPreviewUrl(null)
          setPreviewFrameReady(false)
          setIsFullscreenPreview(false)
        }
        setPdfPreviewOpen(open)
      }}
    >
      <DialogContent 
        hideClose={true}
        className="flex h-[90vh] w-[96vw] max-w-[96vw] flex-col overflow-hidden border border-border p-0 shadow-2xl transition-all duration-normal ease-standard xl:max-w-[1400px] rounded-2xl dark:border-border bg-white dark:bg-card"
      >
        <DialogHeader 
          className="shrink-0"
          style={{ padding: '20px 24px', display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}
        >
          <div className="min-w-0">
            <DialogTitle className="text-left">
              Activity History Report Preview
            </DialogTitle>
            <p className="text-left text-[13px] font-normal text-gray-500 dark:text-zinc-400">
              Review the report before downloading. Check the recorded actions and details.
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
              <Cancel01Icon size="1em"  className="text-[16px]"></Cancel01Icon>
            </button>
          </DialogClose>
        </DialogHeader>

        <div className="relative flex flex-1 flex-col overflow-hidden bg-gray-100 p-0 dark:bg-muted">
          {pdfBlobUrl ? (
            <div className={cn("relative min-h-0 min-w-0 flex-1 transition-all duration-normal", isFullscreenPreview ? "fixed inset-0 z-[9999] bg-white dark:bg-card" : "")}>
              {isFullscreenPreview && (
                <div className="absolute top-4 right-4 z-[10000]">
                  <Button
                    variant="default"
                    size="icon"
                    onClick={() => setIsFullscreenPreview(false)}
                    className="h-10 w-10 rounded-full bg-black/50 text-white hover:bg-black/70 backdrop-blur-md border-0"
                  >
                    <Cancel01Icon size="1em"  className="text-lg"></Cancel01Icon>
                  </Button>
                </div>
              )}
              {!previewFrameReady && (
                <div className="absolute inset-0 z-10 bg-white p-6 dark:bg-card">
                  <div className="space-y-4">
                    <Skeleton className="h-6 w-56 dark:bg-muted" />
                    <Skeleton className="h-4 w-80 dark:bg-muted" />
                    <Skeleton className="h-[55vh] w-full dark:bg-muted" />
                  </div>
                </div>
              )}
              <PDFPreview
                ref={pdfPreviewFrameRef}
                src={pdfBlobUrl}
                className="absolute inset-0 h-full w-full border-none bg-gray-200 dark:bg-zinc-700"
                title="PDF Report Preview"
                onReadyChange={setPreviewFrameReady}
              />
            </div>
          ) : (
            <div className="flex flex-1 items-center justify-center bg-white p-6 dark:bg-card">
              <div className="max-w-lg text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-border bg-gray-50 dark:border-border dark:bg-card">
                  <Loading01Icon size="1em"  className="animate-spin text-xl text-pup-maroon dark:text-primary"></Loading01Icon>
                </div>
                <p className="text-sm font-semibold text-gray-600 dark:text-zinc-300">
                  Preparing report...
                </p>
                <p className="mt-1 text-xs text-gray-400 dark:text-zinc-500">
                  Generating document from system logs. This might take a few moments.
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="flex shrink-0 items-center px-6 py-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsFullscreenPreview(!isFullscreenPreview)}
            aria-label={isFullscreenPreview ? "Exit fullscreen preview" : "Enter fullscreen preview"}
            title={isFullscreenPreview ? "Exit fullscreen" : "Enter fullscreen"}
            className="text-[#8E8E93] hover:text-[#111] dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 transition-colors rounded-xl shadow-none border-0 p-0 h-10 w-10 cursor-pointer"
          >
            <AppIcon className={isFullscreenPreview ? " ArrowShrink01Icon text-[16px]" : " ArrowExpand01Icon text-[16px]"}></AppIcon>
          </Button>

          <div className="flex items-center gap-2.5 ml-auto">
            <Button
              variant="outline"
              onClick={() => setPdfPreviewOpen(false)}
              className="flex h-10 items-center justify-center rounded-xl! border border-border dark:border-border bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 font-semibold text-xs active:scale-95 transition-all cursor-pointer px-4 shadow-xs hover:bg-gray-50 dark:hover:bg-zinc-700"
            >
              Close
            </Button>
            <Button
              variant="outline"
              onClick={handlePrint}
              disabled={!pdfBlobUrl || !previewFrameReady}
              className="flex h-10 items-center justify-center rounded-xl! border border-border dark:border-border bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 font-semibold text-xs active:scale-95 transition-all cursor-pointer px-4 shadow-xs hover:bg-gray-50 dark:hover:bg-zinc-700 disabled:opacity-50"
            >
              Print Report
            </Button>
            <Button
              onClick={handleDownloadFromPreview}
              disabled={!pdfBlobUrl}
              className="disabled:opacity-50 h-10 px-5 cursor-pointer"
            >
              Download PDF
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
