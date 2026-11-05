"use client"

import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import { AlertCircleIcon, ArrowExpand01Icon, ArrowShrink01Icon, Cancel01Icon, FileRemoveIcon } from "hugeicons-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose } from "@/components/ui/dialog"
import { EmptyState } from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"
import ResilientPDFViewer from "@/components/shared/ResilientPDFViewer"
import { PDF_ACTION_LABELS } from "@/lib/pdfPreview"
import { cn } from "@/lib/utils"

function PDFPreviewContent({
  onClose,
  preview,
  pdfUrl,
  title,
  description,
  filename,
  onFileReplaced,
  isPreparing = false,
  error,
  onRetry,
  onDownload,
  downloadFilename,
  onPrint,
  onPrintError,
  headerActions,
}) {
  const frameRef = useRef(null)
  const fullscreenButtonRef = useRef(null)
  const exitFullscreenRef = useRef(null)
  const wasFullscreen = useRef(false)
  const [frameReady, setFrameReady] = useState(false)
  const [fileState, setFileState] = useState("loading")
  const [preparedFile, setPreparedFile] = useState(null)
  const [isFullscreen, setIsFullscreen] = useState(false)

  const docId = preview?.docId || preview?.id
  const source = pdfUrl || preview?.url || preview?.fileUrl || (docId ? "/api/documents/" + docId : null)
  const activeFile = preparedFile?.source === source ? preparedFile : null
  const ready = !!activeFile && frameReady && fileState === "ready" && !isPreparing && !error
  const originalName = preview?.originalFilename || preview?.filename || filename || "document"
  const pdfName = downloadFilename || (/\.pdf$/i.test(originalName) ? originalName : originalName.replace(/\.[^./\\]+$/, "") + ".pdf")
  const heading = title || preview?.title || preview?.docType || preview?.originalFilename || "PDF Preview"
  const context = description || preview?.subtitle || [preview?.studentName, preview?.studentNo].filter(Boolean).join(" · ")
  const FullscreenIcon = isFullscreen ? ArrowShrink01Icon : ArrowExpand01Icon
  const originalAvailable = source && fileState === "ready" && (!activeFile || activeFile.isConverted) && !isPreparing && !error

  useEffect(() => {
    if (isFullscreen) exitFullscreenRef.current?.focus()
    else if (wasFullscreen.current) fullscreenButtonRef.current?.focus()
    wasFullscreen.current = isFullscreen
  }, [isFullscreen])

  const print = () => {
    if (!ready || !frameRef.current?.contentWindow) return
    try {
      frameRef.current.contentWindow.focus()
      frameRef.current.contentWindow.print()
      onPrint?.()
    } catch (failure) {
      if (onPrintError) onPrintError(failure)
      else toast.error("Unable to Print PDF", { description: failure.message })
    }
  }

  return (
    <Dialog open onOpenChange={(value) => { if (!value) onClose?.() }}>
      <DialogContent
        hideClose
        data-pdf-preview-modal
        style={isFullscreen ? { position: "fixed", inset: 0, width: "100vw", maxWidth: "none", height: "100dvh", borderRadius: 0 } : undefined}
        className="flex h-[90dvh] w-[96vw] max-w-[96vw] flex-col gap-0 overflow-hidden rounded-2xl border border-border bg-white p-0 shadow-2xl sm:max-w-[96vw] xl:max-w-[1400px] dark:border-border dark:bg-card"
      >
        <DialogHeader className={cn("shrink-0 px-6 py-5", isFullscreen && "sr-only")}>
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <DialogTitle>{heading}</DialogTitle>
              <DialogDescription className={cn(!context && "sr-only")}>{context || "PDF document preview"}</DialogDescription>
            </div>
            <DialogClose asChild>
              <button
                type="button"
                aria-label="Close PDF preview"
                disabled={isFullscreen}
                className="size-7 rounded-full bg-black/[0.05] hover:bg-black/[0.08] dark:bg-white/[0.08] dark:hover:bg-white/[0.12] text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-zinc-100 transition-all flex items-center justify-center cursor-pointer border-0 shrink-0"
              >
                <Cancel01Icon size={16} aria-hidden="true" />
              </button>
            </DialogClose>
          </div>
          {headerActions && <div className="mt-3 min-w-0" inert={isFullscreen || undefined} data-pdf-preview-header-actions>{headerActions}</div>}
        </DialogHeader>

        <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-gray-100 dark:bg-muted">
          {isFullscreen && (
            <div className="absolute top-4 right-4 z-20">
              <Button ref={exitFullscreenRef} variant="outline" size="icon" onClick={() => setIsFullscreen(false)} aria-label="Exit fullscreen preview" className="h-11 w-11 rounded-xl sm:h-10 sm:w-10">
                <Cancel01Icon size={18} aria-hidden="true" />
              </Button>
            </div>
          )}
          {error ? (
            <div className="flex flex-1 items-center justify-center bg-white p-6 dark:bg-card">
              <EmptyState icon={AlertCircleIcon} title="PDF Preview Unavailable" description={error}>
                {onRetry && <Button variant="outline" onClick={onRetry}>Retry Preview</Button>}
              </EmptyState>
            </div>
          ) : isPreparing ? (
            <div className="flex-1 space-y-4 bg-white p-6 dark:bg-card" role="status" aria-label="Preparing PDF preview">
              <Skeleton className="h-6 w-2/5" />
              <Skeleton className="h-4 w-3/5" />
              <Skeleton className="h-[55vh] w-full" />
            </div>
          ) : source ? (
            <ResilientPDFViewer
              key={source}
              src={source}
              docId={docId}
              preview={preview}
              frameRef={frameRef}
              title="PDF Preview"
              onStatusChange={setFileState}
              onReadyChange={setFrameReady}
              onPreviewReady={setPreparedFile}
              onFileReplaced={onFileReplaced}
            />
          ) : (
            <div className="flex flex-1 items-center justify-center bg-white p-6 dark:bg-card">
              <EmptyState icon={FileRemoveIcon} title="No Document Attached" description="This record has no attached document." />
            </div>
          )}
        </div>

        <div data-pdf-preview-footer className={cn("flex shrink-0 flex-wrap items-center gap-2.5 px-6 py-3.5 border-t border-border/80 dark:border-white/10 bg-gray-50/40 dark:bg-zinc-900/30", isFullscreen && "hidden")}>
          <Button
            ref={fullscreenButtonRef}
            variant="ghost"
            size="icon"
            onClick={() => setIsFullscreen(true)}
            disabled={!ready}
            aria-label="Enter fullscreen preview"
            title="Fullscreen"
            className="h-11 w-11 rounded-xl border-0 p-0 text-gray-500 shadow-none sm:h-10 sm:w-10 dark:text-zinc-400"
          >
            <FullscreenIcon size={16} aria-hidden="true" />
          </Button>
          <div className="ml-auto flex min-w-0 flex-1 flex-wrap justify-end gap-2.5 max-sm:[&_[data-slot=button]]:min-h-11">
            <Button variant="outline" onClick={onClose} className="px-4">Close</Button>
            {originalAvailable && <Button asChild variant="outline"><a href={source} download={originalName}>{PDF_ACTION_LABELS.original}</a></Button>}
            <Button variant="outline" disabled={!ready} onClick={print} className="px-4">{PDF_ACTION_LABELS.print}</Button>
            {onDownload ? (
              <Button onClick={onDownload} disabled={!ready}>{PDF_ACTION_LABELS.download}</Button>
            ) : ready ? (
              <Button asChild><a href={activeFile.url} download={pdfName}>{PDF_ACTION_LABELS.download}</a></Button>
            ) : (
              <Button disabled>{PDF_ACTION_LABELS.download}</Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default function PDFPreviewModal({ open, isOpen, ...props }) {
  return (open ?? isOpen) ? <PDFPreviewContent {...props} /> : null
}
