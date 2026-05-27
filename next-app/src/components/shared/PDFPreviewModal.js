"use client"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { useState } from "react"
import { cn } from "@/lib/utils"

function PDFFrame({ docId }) {
  const [frameReady, setFrameReady] = useState(false)

  return (
    <div className="relative min-h-0 min-w-0 flex-1">
      {!frameReady ? (
        <div className="absolute inset-0 bg-white p-6 dark:bg-card">
          <div className="space-y-4">
            <Skeleton className="h-6 w-56" />
            <Skeleton className="h-4 w-80" />
            <Skeleton className="h-[55vh] w-full" />
          </div>
        </div>
      ) : null}
      <iframe
        title="PDF Preview"
        src={`/api/documents/${docId}#zoom=100`}
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
        hideClose={isFullscreen}
        className={cn(
          "flex flex-col overflow-hidden border border-gray-200 dark:border-white/10 bg-white dark:bg-card p-0 shadow-2xl transition-all duration-300 ease-out",
          isFullscreen 
              ? "fixed h-screen w-screen max-w-none sm:max-w-none m-0 rounded-none z-[100] left-1/2 top-1/2 translate-x-[-50%] translate-y-[-50%] sm:w-screen sm:h-screen" 
              : "h-[90vh] w-[96vw] max-w-[96vw] xl:max-w-[1400px] rounded-brand"
      )}>
        <DialogHeader className="shrink-0 border-b border-gray-100 bg-gray-50 p-6 dark:border-white/10 dark:bg-white/5">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-white text-pup-maroon dark:text-primary shadow-sm dark:border-white/10 dark:bg-card">
                <i className="ph-duotone ph-file-pdf text-2xl"></i>
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-left text-xl leading-none font-black tracking-tight text-gray-900 dark:text-zinc-50">
                  Document Preview: {preview?.docType || "Loading..."}
                </DialogTitle>
                <p className="mt-1.5 text-left text-sm font-medium text-gray-500 dark:text-zinc-400">
                  Reviewing digitized record for {preview?.studentName || "student"}. Ensure all
                  identifiers and data are clearly legible.
                </p>
              </div>
            </div>

            <div className={cn("flex items-center gap-2", !isFullscreen && "mr-8")}>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsFullscreen(!isFullscreen)}
                    className="h-10 gap-2 rounded-brand border-gray-300 bg-white font-bold text-gray-700 hover:bg-gray-50 active:scale-95 shadow-sm dark:border-white/10 dark:bg-card dark:text-zinc-200 dark:hover:bg-white/10"
                >
                    <i className={cn("ph-bold", isFullscreen ? "ph-corners-in" : "ph-corners-out")} />
                    {isFullscreen ? "EXIT FULL SCREEN" : "FULL SCREEN"}
                </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="relative flex flex-1 flex-col overflow-hidden bg-gray-100 p-0 dark:bg-muted">
          {docId ? (
            <PDFFrame key={docId} docId={docId} />
          ) : (
            <div className="flex flex-1 items-center justify-center bg-white p-6 dark:bg-card">
              <div className="max-w-lg text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-gray-200 bg-gray-50 dark:border-white/10 dark:bg-card">
                  <i className="ph-bold ph-file-x text-3xl text-gray-300 dark:text-zinc-600"></i>
                </div>
                <p className="text-sm font-bold text-gray-600 dark:text-zinc-300">
                  No digital file attached
                </p>
                <p className="mt-1 text-xs text-gray-400 dark:text-zinc-500">
                  This record is metadata-only or the file was removed.
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="flex shrink-0 justify-end gap-3 border-t border-gray-100 bg-white p-4 dark:border-white/10 dark:bg-card">
          <Button
            variant="outline"
            onClick={onClose}
            className="h-11 border-gray-300 px-6 text-sm font-bold tracking-wide text-gray-600 uppercase hover:bg-gray-50 dark:border-white/10 dark:text-zinc-300 dark:hover:bg-white/10 dark:bg-card"
          >
            Close Preview
          </Button>
          {docId ? (
            <a
              href={`/api/documents/${docId}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-11 items-center rounded-brand border border-gray-300 bg-white px-6 text-sm font-bold tracking-wide text-pup-maroon dark:text-primary uppercase shadow-sm transition-colors hover:bg-red-50 dark:border-white/10 dark:bg-card"
            >
              <i className="ph-bold ph-arrow-square-out mr-2 text-lg"></i>
              Open Full View
            </a>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  )
}

