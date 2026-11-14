"use client"

import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import { AlertCircleIcon, ArrowExpand01Icon, ArrowShrink01Icon, Cancel01Icon, FileRemoveIcon } from "hugeicons-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose } from "@/components/ui/dialog"
import { EmptyState } from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"
import { Slider } from "@/components/ui/slider"
import ResilientPDFViewer from "@/components/shared/ResilientPDFViewer"
import { PDF_ACTION_LABELS } from "@/lib/pdfPreview"
import { cn } from "@/lib/utils"

function PDFPreviewContent({
  onClose,
  preview,
  pdfUrl,
  preparedPdf = false,
  pdfGenerator,
  title,
  description,
  filename,
  onFileReplaced,
  isPreparing = false,
  error: errorProp,
  onRetry,
  onDownload,
  downloadFilename,
  onPrint,
  onPrintError,
  headerActions,
  onUpdate,
}) {
  const frameRef = useRef(null)
  const fullscreenButtonRef = useRef(null)
  const exitFullscreenRef = useRef(null)
  const wasFullscreen = useRef(false)
  const [frameReady, setFrameReady] = useState(false)
  const [fileState, setFileState] = useState("loading")
  const [preparedFile, setPreparedFile] = useState(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [generatedUrl, setGeneratedUrl] = useState(null)
  const [generatorLoading, setGeneratorLoading] = useState(() => Boolean(pdfGenerator && !pdfUrl && !preview))
  const [generatorError, setGeneratorError] = useState(null)
  const [zoomLevel, setZoomLevel] = useState(() => {
    if (typeof window === "undefined") return 100
    try {
      const stored = localStorage.getItem("pup_pdf_preview_zoom")
      if (stored !== null) {
        const val = Number(stored)
        if (!isNaN(val) && val >= 50 && val <= 200) return val
      }
    } catch {}
    return 100
  })

  useEffect(() => {
    try {
      localStorage.setItem("pup_pdf_preview_zoom", String(zoomLevel))
    } catch {}
  }, [zoomLevel])

  useEffect(() => {
    if (!pdfGenerator || pdfUrl || preview) return

    let active = true

    Promise.resolve()
      .then(() => {
        if (active) {
          setGeneratorLoading(true)
          setGeneratorError(null)
        }
        return pdfGenerator()
      })
      .then((blobOrUrl) => {
        if (!active) return
        if (typeof blobOrUrl === "string") {
          setGeneratedUrl(blobOrUrl)
        } else if (blobOrUrl instanceof Blob) {
          const url = URL.createObjectURL(blobOrUrl)
          setGeneratedUrl(url)
        }
      })
      .catch((err) => {
        if (!active) return
        console.error("PDF generation failed:", err)
        setGeneratorError(err?.message || "Failed to generate PDF preview.")
      })
      .finally(() => {
        if (active) setGeneratorLoading(false)
      })

    return () => {
      active = false
    }
  }, [pdfGenerator, pdfUrl, preview])

  useEffect(() => {
    return () => {
      if (generatedUrl && generatedUrl.startsWith("blob:")) {
        URL.revokeObjectURL(generatedUrl)
      }
    }
  }, [generatedUrl])

  const docId = preview?.docId || preview?.id
  const source = pdfUrl || preview?.url || preview?.fileUrl || generatedUrl || (docId ? "/api/documents/" + docId : null)
  const isPreparedPdf = preparedPdf && source?.startsWith("blob:")
  const effectiveIsPreparing = isPreparing || generatorLoading
  const effectiveError = errorProp || generatorError
  const activeFile = preparedFile?.source === source ? preparedFile : null
  const canDownload = !!activeFile && fileState === "ready" && !effectiveIsPreparing && !effectiveError
  const ready = canDownload && frameReady
  const originalName = preview?.originalFilename || preview?.filename || filename || "document"
  const pdfName = downloadFilename || (/\.pdf$/i.test(originalName) ? originalName : originalName.replace(/\.[^./\\]+$/, "") + ".pdf")
  const heading = title || preview?.title || preview?.docType || preview?.originalFilename || "PDF Preview"
  const context = description || preview?.subtitle || [preview?.studentName, preview?.studentNo].filter(Boolean).join(" · ")
  const FullscreenIcon = isFullscreen ? ArrowShrink01Icon : ArrowExpand01Icon
  const originalAvailable = source && fileState === "ready" && (!activeFile || activeFile.isConverted) && !effectiveIsPreparing && !effectiveError
  const handleUpdate = onUpdate || preview?.onUpdate

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
              <Button
                ref={exitFullscreenRef}
                variant="outline"
                size="sm"
                onClick={() => setIsFullscreen(false)}
                aria-label="Exit fullscreen preview"
                className="h-9 w-9 p-0 rounded-xl"
              >
                <Cancel01Icon size={16} aria-hidden="true" />
              </Button>
            </div>
          )}
          {effectiveError ? (
            <div className="flex flex-1 items-center justify-center bg-white p-6 dark:bg-card">
              <EmptyState icon={AlertCircleIcon} title="PDF Preview Unavailable" description={effectiveError}>
                {onRetry && (
                  <Button variant="outline" size="sm" onClick={onRetry} className="h-9 px-4 text-xs font-semibold rounded-xl">
                    Retry Preview
                  </Button>
                )}
              </EmptyState>
            </div>
          ) : effectiveIsPreparing ? (
            <div className="flex-1 space-y-4 bg-white p-6 dark:bg-card" role="status" aria-label="Preparing PDF preview">
              <Skeleton className="h-6 w-2/5" />
              <Skeleton className="h-4 w-3/5" />
              <Skeleton className="h-[55vh] w-full" />
            </div>
          ) : source ? (
            <div
              className="relative h-full w-full overflow-auto flex items-center justify-center"
              style={{
                transform: zoomLevel === 100 ? "none" : `scale(${zoomLevel / 100})`,
                transformOrigin: "center center",
                transition: "transform 120ms ease-out",
              }}
            >
              <ResilientPDFViewer
                key={source}
                src={source}
                preparedPdf={isPreparedPdf}
                docId={docId}
                preview={preview}
                frameRef={frameRef}
                title="PDF Preview"
                onStatusChange={setFileState}
                onReadyChange={setFrameReady}
                onPreviewReady={setPreparedFile}
                onFileReplaced={onFileReplaced}
              />
            </div>
          ) : (
            <div className="flex flex-1 items-center justify-center bg-white p-6 dark:bg-card">
              <EmptyState icon={FileRemoveIcon} title="No Document Attached" description="This record has no attached document." />
            </div>
          )}
        </div>

        <div data-pdf-preview-footer className={cn("flex shrink-0 flex-wrap items-center gap-2.5 px-6 py-3.5 border-t border-border/80 dark:border-white/10 bg-gray-50/40 dark:bg-zinc-900/30", isFullscreen && "hidden")}>
          <div className="flex items-center gap-2.5">
            <Button
              ref={fullscreenButtonRef}
              variant="outline"
              size="sm"
              onClick={() => setIsFullscreen(true)}
              disabled={!ready}
              aria-label="Enter fullscreen preview"
              title="Fullscreen"
              className="h-9 w-9 p-0 rounded-xl"
            >
              <FullscreenIcon size={16} aria-hidden="true" />
            </Button>

            {ready && (
              <Slider
                label="Zoom"
                min={50}
                max={200}
                step={10}
                value={zoomLevel}
                onChange={setZoomLevel}
                formatValue={(v) => `${v}%`}
                ticks={[50, 75, 100, 125, 150, 175, 200]}
                ariaLabel="PDF Document Zoom"
                className="w-36 hidden sm:flex"
              />
            )}
          </div>
          <div className="ml-auto flex min-w-0 flex-1 flex-wrap items-center justify-end gap-2.5">
            <Button variant="outline" size="sm" onClick={onClose} className="h-9 px-4 text-xs font-semibold rounded-xl">
              Close
            </Button>
            {originalAvailable && (
              <Button asChild variant="outline" size="sm" className="h-9 px-4 text-xs font-semibold rounded-xl">
                <a href={source} download={originalName}>{PDF_ACTION_LABELS.original}</a>
              </Button>
            )}
            {handleUpdate && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onClose?.()
                  handleUpdate()
                }}
                className="h-9 px-4 text-xs font-semibold rounded-xl"
              >
                {PDF_ACTION_LABELS.update}
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              disabled={!ready}
              onClick={print}
              className="h-9 px-4 text-xs font-semibold rounded-xl"
            >
              {PDF_ACTION_LABELS.print}
            </Button>
            {onDownload ? (
              <Button size="sm" onClick={onDownload} disabled={!canDownload} className="h-9 px-4 text-xs font-semibold rounded-xl">
                {PDF_ACTION_LABELS.download}
              </Button>
            ) : canDownload ? (
              <Button asChild size="sm" className="h-9 px-4 text-xs font-semibold rounded-xl">
                <a href={activeFile.url} download={pdfName}>{PDF_ACTION_LABELS.download}</a>
              </Button>
            ) : (
              <Button size="sm" disabled className="h-9 px-4 text-xs font-semibold rounded-xl">
                {PDF_ACTION_LABELS.download}
              </Button>
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
