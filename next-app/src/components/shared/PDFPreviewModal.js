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
        className="absolute inset-0 h-full w-full bg-[#F2F2F7] dark:bg-zinc-800"
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
        hideClose={true}
        className="flex flex-col overflow-hidden bg-white dark:bg-zinc-900 p-0 shadow-[0_8px_40px_rgba(0,0,0,0.16)] w-[760px] max-w-full max-h-[90vh] transition-all duration-300 ease-out rounded-[16px] border-0"
      >
        <DialogHeader className="shrink-0 p-[20px_24px] dark:border-zinc-850" style={{ borderBottom: "0.5px solid rgba(0,0,0,0.08)" }}>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <i className="ti ti-file-text text-[18px]" style={{ color: "#E5484D" }}></i>
              <div className="min-w-0">
                <DialogTitle className="text-left text-[15px] font-semibold tracking-[-0.01em] text-[#111111] dark:text-zinc-50">
                  Document Preview: {preview?.docType || "Loading..."}
                </DialogTitle>
                <p className="mt-[2px] text-left text-[12px] font-normal text-[#8E8E93] dark:text-zinc-400">
                  Reviewing digitized record for {preview?.studentName || "student"}. Ensure all
                  identifiers and data are clearly legible.
                </p>
              </div>
            </div>
            <DialogClose asChild>
              <button className="p-0 border-0 bg-transparent text-[#8E8E93] hover:text-[#111111] dark:hover:text-zinc-100 transition-colors cursor-pointer focus:outline-none flex items-center justify-center">
                <i className="ti ti-x text-[16px]"></i>
              </button>
            </DialogClose>
          </div>
        </DialogHeader>

        <div className="relative flex flex-1 flex-col overflow-hidden min-h-0 bg-[#F2F2F7] dark:bg-zinc-950 p-[24px]">
          {docId ? (
            <div className={cn("relative min-h-0 min-w-0 flex-1 flex flex-col transition-all duration-300", isFullscreen ? "fixed inset-0 z-[9999] bg-white dark:bg-card p-0" : "bg-white rounded-lg shadow-[0_2px_12px_rgba(0,0,0,0.12)] overflow-hidden")}>
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
              
              {!isFullscreen && (
                <button
                  type="button"
                  onClick={() => setIsFullscreen(true)}
                  className="absolute bottom-3 left-3 z-20 flex items-center justify-center bg-white border border-[rgba(0,0,0,0.12)] rounded-[6px] p-1.5 text-[#8E8E93] hover:text-[#111111] dark:bg-zinc-900 dark:border-zinc-700 transition-colors cursor-pointer"
                  style={{ borderWidth: "0.5px" }}
                >
                  <i className="ti ti-arrows-maximize text-[16px]"></i>
                </button>
              )}
            </div>
          ) : (
            <div className="flex flex-1 items-center justify-center bg-[#F2F2F7] dark:bg-zinc-950">
              <div className="max-w-lg text-center bg-white dark:bg-zinc-900 p-8 rounded-lg shadow-[0_2px_12px_rgba(0,0,0,0.12)]">
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

        <div className="flex shrink-0 justify-end items-center gap-[8px] p-[16px_24px] dark:border-zinc-850" style={{ borderTop: "0.5px solid rgba(0,0,0,0.08)" }}>
          <DialogClose asChild>
            <button
              onClick={onClose}
              className="h-[36px] px-4 rounded-[8px] border-[0.5px] border-black/15 bg-transparent text-[13px] font-normal text-[#111111] hover:bg-[#F5F5F5] dark:text-zinc-300 dark:border-white/10 dark:hover:bg-zinc-800 transition-colors cursor-pointer outline-none"
              style={{ borderWidth: "0.5px" }}
            >
              Close
            </button>
          </DialogClose>
          {docId ? (
            <a
              href={`/api/documents/${docId}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-[36px] items-center justify-center rounded-[8px] bg-[#E5484D] text-white hover:bg-[#C93B3B] px-4 text-[13px] font-medium transition-colors cursor-pointer outline-none"
            >
              Open Full View
            </a>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  )
}
