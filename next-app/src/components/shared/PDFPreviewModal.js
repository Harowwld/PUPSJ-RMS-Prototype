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

function PDFFrame({ docId, url }) {
  const [frameReady, setFrameReady] = useState(false)
  const resolvedSrc = url || (docId ? `/api/documents/${docId}` : "")
  const finalSrc = resolvedSrc ? (resolvedSrc.includes("#") ? resolvedSrc : `${resolvedSrc}#toolbar=0&navpanes=0`) : ""

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
        src={finalSrc}
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
  const fileUrl = preview?.url || preview?.fileUrl || (docId ? `/api/documents/${docId}` : null)
  const hasFile = !!fileUrl || !!docId

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
        hideClose={true}
        className="flex h-[90vh] w-[96vw] max-w-[96vw] flex-col overflow-hidden border border-gray-200 bg-gray-100 p-0 shadow-2xl transition-all duration-normal ease-standard xl:max-w-[1400px] rounded-2xl dark:border-white/10 dark:bg-muted z-[60] gap-0"
      >
        <DialogHeader className="shrink-0 border-b border-gray-100 dark:border-white/10 bg-gray-50 dark:bg-white/5 px-6 py-4">
          <div className="flex items-center justify-between w-full">
            <div className="min-w-0">
              <DialogTitle className="text-left font-semibold text-gray-900 dark:text-zinc-50 text-[15px] tracking-[-0.01em]">
                Document Preview: {preview?.title || preview?.docType || preview?.originalFilename || "Preview"}
              </DialogTitle>
              <p className="text-left font-normal text-gray-500 dark:text-zinc-400 text-xs mt-0.5">
                Reviewing digitized record for <span className="font-semibold text-pup-maroon dark:text-rose-400">{preview?.studentName || "student"}</span>. Ensure all identifiers and data are clearly legible.
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-0 border-0 bg-transparent text-gray-400 hover:text-gray-900 dark:text-zinc-500 dark:hover:text-zinc-100 focus:outline-none cursor-pointer transition-colors flex items-center justify-center w-7 h-7 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800"
            >
              <i className="ph-bold ph-x text-[16px]"></i>
            </button>
          </div>
        </DialogHeader>

        <div className="relative flex flex-1 flex-col overflow-hidden bg-gray-100 p-0 dark:bg-muted">
          {hasFile ? (
            <div className={cn("relative min-h-0 min-w-0 flex-1 flex flex-col transition-all duration-normal", isFullscreen ? "fixed inset-0 z-[99999] bg-white dark:bg-card" : "")}>
              {isFullscreen && (
                <div className="absolute top-4 right-4 z-[100000]">
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
              <PDFFrame key={fileUrl || docId} docId={docId} url={fileUrl} />
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

        <div 
          className="flex shrink-0 justify-end items-center bg-white dark:bg-card px-6 py-4 border-t border-gray-100 dark:border-white/10 gap-3"
        >
          <DialogClose asChild>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="h-10 px-5 text-xs font-semibold rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-xs cursor-pointer active:scale-95 transition-all"
            >
              Close
            </Button>
          </DialogClose>
          {fileUrl ? (
            <a
              href={fileUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 h-10 px-4 text-xs font-semibold rounded-xl text-pup-maroon dark:text-red-400 hover:bg-red-50/60 dark:hover:bg-red-950/30 transition-colors"
            >
              <span className="hover:underline">Open Full View</span>
              <i className="ph-bold ph-arrow-square-out text-sm"></i>
            </a>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  )
}

