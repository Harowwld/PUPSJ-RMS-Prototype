"use client"

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
        hideClose={true}
        className="flex h-[90vh] w-[96vw] max-w-[96vw] flex-col overflow-hidden border border-gray-200 bg-gray-100 p-0 shadow-2xl transition-all duration-300 ease-out xl:max-w-[1400px] rounded-brand dark:border-white/10 dark:bg-muted"
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
              Audit Logs Report Preview
            </DialogTitle>
            <p style={{ marginTop: '2px', fontSize: '12px', fontWeight: 400, color: '#8E8E93' }} className="text-left">
              Review the generated document before downloading. Ensure all events and severity levels are correctly captured.
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
              <i className="ti ti-x" style={{ fontSize: '16px' }}></i>
            </button>
          </DialogClose>
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
                  <i className="ph-bold ph-circle-notch animate-spin text-xl text-pup-maroon dark:text-primary"></i>
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

        <div
          className="flex shrink-0 items-center bg-white dark:bg-card"
          style={{
            padding: '16px 24px',
            borderTop: '0.5px solid rgba(0,0,0,0.08)'
          }}
        >
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsFullscreenPreview(!isFullscreenPreview)}
            className="text-[#8E8E93] hover:text-[#111] dark:hover:text-white hover:bg-transparent transition-colors rounded-brand shadow-none border-0 p-0"
            style={{
              height: '36px',
              width: '36px',
              background: 'none'
            }}
          >
            <i className="ti ti-arrows-vertical" style={{ fontSize: '16px' }}></i>
          </Button>

          <div className="flex items-center gap-[8px]" style={{ marginLeft: 'auto' }}>
            <Button
              variant="ghost"
              onClick={() => setPdfPreviewOpen(false)}
              className="font-semibold text-sm text-gray-600 hover:text-[#111] hover:bg-transparent dark:text-zinc-400 dark:hover:text-zinc-200 dark:hover:bg-transparent transition-colors rounded-brand shadow-none border-0"
              style={{
                height: '36px',
                fontSize: '13px',
                fontWeight: 500,
                boxShadow: 'none',
                background: 'none'
              }}
            >
              Close
            </Button>
            <Button
              onClick={handleDownloadFromPreview}
              disabled={!pdfBlobUrl}
              className="text-white btn-brand-red active:scale-95 disabled:opacity-50 transition-all dark:shadow-none"
              style={{
                height: '36px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 500,
                boxShadow: 'none',
                paddingLeft: '24px',
                paddingRight: '24px'
              }}
            >
              Save to Device
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}


