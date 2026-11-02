"use client"


import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { useState, useEffect, useRef } from "react"
import { cn } from "@/lib/utils"
import { EmptyState } from "@/components/ui/empty"
import { FileRemoveIcon, Cancel01Icon } from "hugeicons-react"
import AppIcon from "@/components/ui/app-icon";
import ResilientPDFViewer from "@/components/shared/ResilientPDFViewer";

function PDFPreviewContent({ onClose, preview, pdfUrl, title, filename, onFileReplaced }) {
  const effectivePreview = preview || (pdfUrl || title || filename ? { url: pdfUrl, title, filename } : null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [frameState, setFrameState] = useState("loading")
  const fullscreenButtonRef = useRef(null)
  const exitFullscreenRef = useRef(null)
  const wasFullscreen = useRef(false)

  useEffect(() => {
    if (isFullscreen) exitFullscreenRef.current?.focus()
    else if (wasFullscreen.current) fullscreenButtonRef.current?.focus()
    wasFullscreen.current = isFullscreen
  }, [isFullscreen])

  const docId = effectivePreview?.docId || effectivePreview?.id
  const fileUrl = effectivePreview?.url || effectivePreview?.fileUrl || (docId ? `/api/documents/${docId}` : null)
  const hasFile = !!fileUrl || !!docId

  return (
    <Dialog 
      open
      onOpenChange={(isOpenState) => {
        if (!isOpenState) {
          setIsFullscreen(false)
          onClose?.()
        }
      }}
    >
      <DialogContent 
        hideClose={true}
        style={isFullscreen ? { position: "fixed", inset: 0, width: "100vw", maxWidth: "none", height: "100dvh", borderRadius: 0 } : undefined}
        className="flex h-[90vh] w-[96vw] max-w-[96vw] sm:max-w-[96vw] flex-col overflow-hidden border border-border p-0 shadow-2xl transition-all duration-normal ease-standard xl:max-w-[1400px] rounded-2xl dark:border-border z-[70] gap-0 bg-white dark:bg-card"
      >
        <DialogHeader className={cn("shrink-0 px-6 py-4", isFullscreen && "sr-only")}>
          <div className="flex items-center justify-between w-full gap-4">
            <div className="min-w-0 flex-1">
              <DialogTitle className="text-left">
                Document Preview: {effectivePreview?.title || effectivePreview?.docType || effectivePreview?.originalFilename || "Preview"}
              </DialogTitle>
              <p className="text-left mt-0.5 text-[13px] font-normal text-gray-500 dark:text-zinc-400">
                {effectivePreview?.subtitle ? (
                  effectivePreview.subtitle
                ) : (
                  <>
                    Reviewing digitized record for{" "}
                    <span className="font-semibold text-pup-maroon dark:text-rose-400">
                      {effectivePreview?.studentName || "student"}
                    </span>
                    . Ensure all identifiers and data are clearly legible.
                  </>
                )}
              </p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                ref={fullscreenButtonRef}
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="p-0 border-0 bg-transparent text-gray-400 hover:text-gray-900 dark:text-zinc-500 dark:hover:text-zinc-100 focus:outline-none cursor-pointer transition-colors flex items-center justify-center w-7 h-7 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800"
                title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
                aria-label={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
                disabled={!hasFile || isFullscreen}
              >
                <AppIcon  className={cn("text-[16px]", isFullscreen ? " ArrowShrink01Icon" : " ArrowExpand01Icon")}></AppIcon>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="p-0 border-0 bg-transparent text-gray-400 hover:text-gray-900 dark:text-zinc-500 dark:hover:text-zinc-100 focus:outline-none cursor-pointer transition-colors flex items-center justify-center w-7 h-7 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800"
                title="Close"
                aria-label="Close preview"
                disabled={isFullscreen}
              >
                <Cancel01Icon size="1em"  className="text-[16px]"></Cancel01Icon>
              </button>
            </div>
          </div>
        </DialogHeader>

        <div className="relative flex flex-1 flex-col overflow-hidden bg-gray-100 p-0 dark:bg-muted">
          {hasFile ? (
            <div className="relative flex min-h-0 min-w-0 flex-1 flex-col">
              {isFullscreen && (
                <div className="absolute top-4 right-4 z-20">
                  <Button
                    ref={exitFullscreenRef}
                    variant="default"
                    size="icon"
                    onClick={() => setIsFullscreen(false)}
                    aria-label="Exit Fullscreen"
                    className="h-10 w-10 rounded-full bg-black/50 text-white hover:bg-black/70 backdrop-blur-md border-0"
                  >
                    <Cancel01Icon size="1em"  className="text-lg"></Cancel01Icon>
                  </Button>
                </div>
              )}
              <ResilientPDFViewer
                key={fileUrl || docId} 
                docId={docId} 
                src={fileUrl}
                preview={effectivePreview} 
                onFileReplaced={onFileReplaced}
                onStatusChange={setFrameState}
              />
            </div>
          ) : (
            <div className="flex flex-1 items-center justify-center bg-white p-6 dark:bg-card">
              <EmptyState
                icon={FileRemoveIcon}
                title="No Digital File Attached"
                description="This record has no attached digital file or its file was removed."
              />
            </div>
          )}
        </div>

        <div 
          className={cn("flex shrink-0 flex-wrap justify-end items-center px-6 py-4 gap-2.5", isFullscreen && "hidden")}
        >
          <DialogClose asChild>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="h-10 px-4 text-xs font-semibold rounded-xl border border-border dark:border-border bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-xs cursor-pointer active:scale-95 transition-all"
            >
              Close
            </Button>
          </DialogClose>
          {fileUrl && frameState === "ready" ? (
            <Button asChild variant="outline">
              <a href={fileUrl} download={effectivePreview?.originalFilename || effectivePreview?.filename || "document.pdf"}>Download File</a>
            </Button>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default function PDFPreviewModal(props) {
  return (props.open ?? props.isOpen) ? <PDFPreviewContent {...props} /> : null
}
