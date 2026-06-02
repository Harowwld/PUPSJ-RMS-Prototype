"use client"

import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

import { cn } from "@/lib/utils"

export default function PdfPreviewDialog({
  pdfPreviewOpen,
  setPdfPreviewOpen,
  pdfBlobUrl,
  setPdfPreviewUrl,
  previewFrameReady,
  setPreviewFrameReady,
  handleDownloadFromPreview,
  isFullscreenPreview,
  setIsFullscreenPreview,
}) {
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
        className="flex h-[90vh] w-[96vw] max-w-[96vw] flex-col overflow-hidden border border-gray-200 bg-gray-100 p-0 shadow-2xl transition-all duration-300 ease-out xl:max-w-[1400px] rounded-brand dark:border-white/10 dark:bg-muted"
      >
        <DialogHeader className="shrink-0 border-b border-gray-100 bg-gray-50 p-6 dark:border-white/10 dark:bg-white/5">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-white text-pup-maroon dark:text-primary shadow-sm dark:border-white/10 dark:bg-card dark:text-primary dark:shadow-none">
                <i className="ph-duotone ph-file-pdf text-2xl"></i>
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-left text-xl leading-none font-black tracking-tight text-gray-900 dark:text-zinc-50">
                  Audit Logs Report Preview
                </DialogTitle>
                <p className="mt-1.5 text-left text-sm font-medium text-gray-500 dark:text-zinc-400">
                  Review the generated document before downloading. Ensure all events
                  and severity levels are correctly captured.
                </p>
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="relative flex flex-1 flex-col overflow-hidden bg-gray-100 p-0 dark:bg-muted">
          {pdfBlobUrl ? (
            <div className={cn("relative min-h-0 min-w-0 flex-1 transition-all duration-300", isFullscreenPreview ? "fixed inset-0 z-[9999] bg-white dark:bg-card" : "")}>
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
                <div className="absolute inset-0 z-10 bg-white p-6 dark:bg-card">
                  <div className="space-y-4">
                    <Skeleton className="h-6 w-56 dark:bg-muted" />
                    <Skeleton className="h-4 w-80 dark:bg-muted" />
                    <Skeleton className="h-[55vh] w-full dark:bg-muted" />
                  </div>
                </div>
              )}
              <iframe
                src={`${pdfBlobUrl}#toolbar=0&navpanes=0`}
                className="absolute inset-0 h-full w-full border-none bg-gray-200 dark:bg-zinc-700"
                title="PDF Report Preview"
                onLoad={() => setPreviewFrameReady(true)}
              />
            </div>
          ) : (
            <div className="flex flex-1 items-center justify-center bg-white p-6 dark:bg-card">
              <div className="max-w-lg text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-gray-200 bg-gray-50 dark:border-white/10 dark:bg-card">
                  <i className="ph-bold ph-circle-notch animate-spin text-3xl text-pup-maroon dark:text-primary"></i>
                </div>
                <p className="text-sm font-bold text-gray-600 dark:text-zinc-300">
                  Preparing report...
                </p>
                <p className="mt-1 text-xs text-gray-400 dark:text-zinc-500">
                  Generating document from system logs. This might take a few moments.
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
              onClick={() => setPdfPreviewOpen(false)}
              className="h-11 rounded-brand border-gray-300 px-6 text-sm font-bold tracking-wide text-gray-600 hover:border-gray-300 hover:bg-red-50 hover:text-pup-maroon dark:hover:text-red-500 shadow-sm transition-colors dark:text-zinc-300 dark:hover:border-zinc-700 dark:bg-red-950/30 dark:shadow-none dark:border-white/10"
            >
              Cancel preview
            </Button>
            <Button
              onClick={handleDownloadFromPreview}
              disabled={!pdfBlobUrl}
              className="flex h-11 items-center gap-2 btn-brand-red active:scale-95 disabled:opacity-50 transition-all dark:shadow-none"
            >
              <i className="ph-bold ph-floppy-disk text-lg"></i>
              SAVE TO DEVICE
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}


