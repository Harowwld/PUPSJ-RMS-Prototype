"use client"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"

function PDFFrame({ docId }) {
  const [frameReady, setFrameReady] = useState(false)

  return (
    <div className="relative min-h-0 min-w-0 flex-1 flex flex-col">
      {!frameReady ? (
        <div className="absolute inset-0 bg-white p-6 dark:bg-card">
          <div className="space-y-4">
            <Skeleton className="h-6 w-56 dark:bg-muted" />
            <Skeleton className="h-4 w-80 dark:bg-muted" />
            <Skeleton className="h-[55vh] w-full dark:bg-muted" />
          </div>
        </div>
      ) : null}
      <iframe
        title="PDF Preview"
        src={`/api/documents/${docId}#toolbar=0&navpanes=0`}
        className="absolute inset-0 h-full w-full bg-gray-200 dark:bg-zinc-700"
        style={{ border: "none" }}
        onLoad={() => setFrameReady(true)}
      />
    </div>
  )
}

export default function PDFPreviewModal({ open, onClose, preview }) {
  const [isFullscreen, setIsFullscreen] = useState(false)

  const docId = preview?.docId

  if (!open && isFullscreen) {
    setIsFullscreen(false)
  }

  useEffect(() => {
    if (!open) {
      if (typeof document !== "undefined") {
        document.body.style.pointerEvents = ""
        document.body.style.overflow = ""
      }
    }
  }, [open])

  return (
    <Dialog 
      open={open} 
      onOpenChange={(isOpen) => {
        if (!isOpen) {
          setIsFullscreen(false)
          onClose()
        }
      }}
    >
      <DialogContent 
        className="flex h-[90vh] w-[96vw] max-w-[96vw] flex-col overflow-hidden border border-gray-200 bg-gray-100 p-0 shadow-2xl transition-all duration-300 ease-out xl:max-w-[1400px] rounded-brand dark:border-white/10 dark:bg-muted"
      >
        <DialogHeader className="shrink-0 border-b border-gray-100 bg-gray-50 p-6 dark:border-white/10 dark:bg-white/5">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-white text-pup-maroon dark:text-primary shadow-sm dark:border-white/10 dark:bg-card">
                <i className="ph-duotone ph-file-pdf text-xl"></i>
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-left text-xl font-semibold tracking-tight text-gray-900 dark:text-zinc-50">
                  Document Preview: {preview?.docType || "Loading..."}
                </DialogTitle>
                <p className="mt-1.5 text-left text-sm font-medium text-gray-500 dark:text-zinc-400">
                  Reviewing digitized record for {preview?.studentName || "student"}. Ensure all
                  identifiers and data are clearly legible.
                </p>
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="relative flex flex-1 flex-col overflow-hidden bg-gray-100 p-0 dark:bg-muted">
          {docId ? (
            <div className={cn("relative min-h-0 min-w-0 flex-1 flex flex-col transition-all duration-300", isFullscreen ? "fixed inset-0 z-[9999] bg-white dark:bg-card" : "")}>
              {isFullscreen && (
                <div className="absolute top-4 right-4 z-[10000]">
                  <Button
                    variant="default"
                    size="icon"
                    onClick={() => setIsFullscreen(false)}
                    className="h-10 w-10 rounded-full bg-black/50 text-white hover:bg-black/70 backdrop-blur-md border-0"
                  >
                    <i className="ph-bold ph-x text-lg"></i>
                  </Button>
                </div>
              )}
              <PDFFrame key={docId} docId={docId} />
            </div>
          ) : (
            <div className="flex flex-1 items-center justify-center bg-white p-6 dark:bg-card">
              <div className="max-w-lg text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-gray-200 bg-gray-50 dark:border-white/10 dark:bg-card">
                  <i className="ph-bold ph-file-x text-xl text-gray-300 dark:text-zinc-600"></i>
                </div>
                <p className="text-sm font-semibold text-gray-600 dark:text-zinc-300">
                  No digital file attached
                </p>
                <p className="mt-1 text-xs text-gray-400 dark:text-zinc-500">
                  This record is metadata-only or the file was removed.
                </p>
              </div>
            </div>
          )}
        </div>

        <TooltipProvider delayDuration={200}>
          <div className="flex shrink-0 justify-between items-center gap-3 border-t border-gray-100 bg-white p-4 dark:border-white/10 dark:bg-card">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setIsFullscreen(!isFullscreen)}
                  className={cn(
                    "h-11 w-11 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-card transition-all hover:bg-gray-50 dark:hover:bg-white/10 dark:bg-card shadow-sm dark:shadow-none",
                    isFullscreen && "bg-pup-maroon dark:bg-red-600 text-white hover:bg-pup-darkMaroon border-pup-darkMaroon"
                  )}
                >
                  <i className={cn("ph-bold text-xl", isFullscreen ? "ph-corners-in" : "ph-corners-out")}></i>
                </Button>
              </TooltipTrigger>
              <TooltipContent className="bg-zinc-900 text-white border-zinc-800">
                <p className="text-[10px] font-semibold">Document Zoom</p>
                <p className="text-[9px] opacity-80">Toggle high-focus preview mode</p>
              </TooltipContent>
            </Tooltip>

            <div className="flex items-center gap-3">
              <DialogClose asChild>
                <Button
                  variant="outline"
                  onClick={onClose}
                  className="h-11 rounded-brand border-gray-300 px-6 text-sm font-semibold tracking-wide text-gray-600 hover:border-gray-300 hover:bg-red-50 hover:text-pup-maroon dark:hover:text-red-500 shadow-sm transition-colors dark:text-zinc-300 dark:hover:border-zinc-700 dark:bg-red-950/30 dark:shadow-none dark:border-white/10"
                >
                  Close Preview
                </Button>
              </DialogClose>
              {docId ? (
                <a
                  href={`/api/documents/${docId}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-11 items-center rounded-brand border border-gray-300 bg-white px-6 text-sm font-semibold tracking-wide text-pup-maroon dark:text-primary shadow-sm transition-colors hover:bg-red-50 dark:border-white/10 dark:bg-card"
                >
                  <i className="ph-bold ph-arrow-square-out mr-2 text-lg"></i>
                  Open Full View
                </a>
              ) : null}
            </div>
          </div>
        </TooltipProvider>
      </DialogContent>
    </Dialog>
  )
}

