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
        hideClose={isFullscreenPreview}
        className={cn(
          "flex flex-col overflow-hidden border border-gray-200 bg-gray-100 p-0 shadow-2xl transition-all duration-300 ease-out",
          isFullscreenPreview 
              ? "fixed h-screen w-screen max-w-none sm:max-w-none m-0 rounded-none z-[100] left-1/2 top-1/2 translate-x-[-50%] translate-y-[-50%] sm:w-screen sm:h-screen" 
              : "h-[90vh] w-[96vw] max-w-[96vw] xl:max-w-[1400px] rounded-brand"
      )}>
        <DialogHeader className="shrink-0 border-b border-gray-100 bg-gray-50/50 p-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-white text-pup-maroon shadow-sm">
                <i className="ph-duotone ph-file-pdf text-2xl"></i>
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-left text-xl leading-none font-black tracking-tight text-gray-900 uppercase">
                  Audit Logs Report Preview
                </DialogTitle>
                <p className="mt-1.5 text-left text-sm font-medium text-gray-500">
                  Review the generated document before downloading. Ensure all events
                  and severity levels are correctly captured.
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

        <div className="relative flex flex-1 flex-col overflow-hidden bg-gray-100 p-0">
          {pdfBlobUrl ? (
            <div className="relative min-h-0 min-w-0 flex-1">
              {!previewFrameReady && (
                <div className="absolute inset-0 z-10 bg-white p-6">
                  <div className="space-y-4">
                    <Skeleton className="h-6 w-56" />
                    <Skeleton className="h-4 w-80" />
                    <Skeleton className="h-[55vh] w-full" />
                  </div>
                </div>
              )}
              <iframe
                src={`${pdfBlobUrl}#toolbar=0&navpanes=0`}
                className="absolute inset-0 h-full w-full border-none bg-gray-200"
                title="PDF Report Preview"
                onLoad={() => setPreviewFrameReady(true)}
              />
            </div>
          ) : (
            <div className="flex flex-1 items-center justify-center bg-white p-6">
              <div className="max-w-lg text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-gray-200 bg-gray-50">
                  <i className="ph-bold ph-circle-notch animate-spin text-3xl text-pup-maroon"></i>
                </div>
                <p className="text-sm font-bold text-gray-600 uppercase">
                  Preparing report...
                </p>
                <p className="mt-1 text-xs text-gray-400">
                  Generating document from system logs. This might take a few moments.
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="flex shrink-0 justify-end gap-3 border-t border-gray-100 bg-white p-4">
          <Button
            variant="outline"
            onClick={() => setPdfPreviewOpen(false)}
            className="h-11 rounded-brand border-gray-300 px-6 text-sm font-bold tracking-wide text-gray-600 uppercase hover:border-gray-300 hover:bg-red-50/30 hover:text-pup-maroon shadow-sm transition-colors"
          >
            Cancel Preview
          </Button>
          <Button
            onClick={handleDownloadFromPreview}
            disabled={!pdfBlobUrl}
            className="flex h-11 items-center gap-2 rounded-brand bg-linear-to-b from-red-800 to-pup-maroon border-4 border-pup-darkMaroon hover:from-red-700 hover:to-red-900 hover:shadow-md transition-all px-6 text-sm font-black tracking-wide text-white uppercase shadow-sm disabled:opacity-50"
          >
            <i className="ph-bold ph-download-simple text-lg"></i>
            Download Report
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
