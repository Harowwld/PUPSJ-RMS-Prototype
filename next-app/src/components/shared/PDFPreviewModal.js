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
        hideClose={true}
        className="flex h-[90vh] w-[96vw] max-w-[96vw] flex-col overflow-hidden border border-gray-200 bg-gray-100 p-0 shadow-2xl transition-all duration-normal ease-standard xl:max-w-[1400px] rounded-2xl dark:border-white/10 dark:bg-muted"
      >
        <DialogHeader className="shrink-0 border-b bg-gray-50 dark:bg-white/5" style={{ padding: '20px 24px', borderBottomWidth: '0.5px', borderBottomColor: 'rgba(0,0,0,0.08)' }}>
          <div className="flex items-center justify-between w-full">
            <div className="min-w-0">
              <DialogTitle className="text-left font-semibold text-[#111111] dark:text-zinc-50" style={{ fontSize: '15px', letterSpacing: '-0.01em' }}>
                Document Preview: {preview?.docType || "Loading..."}
              </DialogTitle>
              <p className="text-left font-normal text-[#8E8E93] dark:text-zinc-400" style={{ fontSize: '12px', marginTop: '2px' }}>
                Reviewing digitized record for <span className="font-semibold" style={{ color: '#E5484D' }}>{preview?.studentName || "student"}</span>. Ensure all identifiers and data are clearly legible.
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-0 border-0 bg-transparent text-[#8E8E93] hover:text-[#111111] dark:hover:text-zinc-100 focus:outline-none cursor-pointer transition-colors flex items-center justify-center"
              style={{ width: '28px', height: '28px' }}
            >
              <i className="ti ti-x" style={{ fontSize: '16px' }}></i>
            </button>
          </div>
        </DialogHeader>

        <div className="relative flex flex-1 flex-col overflow-hidden bg-gray-100 p-0 dark:bg-muted">
          {docId ? (
            <div className={cn("relative min-h-0 min-w-0 flex-1 flex flex-col transition-all duration-normal", isFullscreen ? "fixed inset-0 z-[9999] bg-white dark:bg-card" : "")}>
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

        <div 
          className="flex shrink-0 justify-end items-center bg-white dark:bg-card"
          style={{ 
            padding: '16px 24px', 
            borderTopWidth: '0.5px', 
            borderTopColor: 'rgba(0,0,0,0.08)',
            gap: '8px'
          }}
        >
          <DialogClose asChild>
            <Button
              variant="ghost"
              onClick={onClose}
              className="px-4 text-[#8E8E93] hover:text-[#111111] dark:text-zinc-400 dark:hover:text-zinc-200 shadow-none bg-transparent hover:bg-[rgba(0,0,0,0.06)]"
              style={{ 
                height: '36px', 
                borderRadius: '8px', 
                fontSize: '13px', 
                fontWeight: 400 
              }}
            >
              Close
            </Button>
          </DialogClose>
          {docId ? (
            <a
              href={`/api/documents/${docId}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center text-[#E5484D] hover:text-[#c93b40] font-medium group"
              style={{ 
                height: '36px', 
                paddingLeft: '8px', 
                paddingRight: '8px', 
                fontSize: '13px'
              }}
            >
              <span className="group-hover:underline">Open Full View</span>
              <i className="ti ti-arrow-up-right ml-1" style={{ fontSize: '14px', textDecoration: 'none' }}></i>
            </a>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  )
}

