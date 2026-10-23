"use client"

import HugeIcon from "@/components/shared/HugeIcon";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { useState, useEffect, useRef, useCallback } from "react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { formatErrorMessage } from "@/lib/errorUtils"

function PDFFrame({ docId, url, preview, onFileReplaced, onLoadStateChange }) {
  const [loadState, setLoadState] = useState("loading")
  const [isReuploading, setIsReuploading] = useState(false)
  const fileInputRef = useRef(null)

  const resolvedSrc = url || (docId ? `/api/documents/${docId}` : "")
  const finalSrc = resolvedSrc ? (resolvedSrc.includes("#") ? resolvedSrc : `${resolvedSrc}#toolbar=0&navpanes=0`) : ""

  const checkAvailability = useCallback(() => {
    if (!resolvedSrc) {
      setLoadState("missing")
      onLoadStateChange?.("missing")
      return
    }
    let isMounted = true
    setLoadState("loading")
    onLoadStateChange?.("loading")

    fetch(resolvedSrc, { method: "HEAD", credentials: "same-origin" })
      .then((res) => {
        if (!isMounted) return
        const isMissing = res.status === 404 || res.headers.get("X-File-Missing") === "true"
        if (isMissing) {
          setLoadState("missing")
          onLoadStateChange?.("missing")
        } else if (res.ok) {
          setLoadState("ready")
          onLoadStateChange?.("ready")
        } else {
          setLoadState("missing")
          onLoadStateChange?.("missing")
        }
      })
      .catch(() => {
        if (!isMounted) return
        setLoadState("missing")
        onLoadStateChange?.("missing")
      })

    return () => {
      isMounted = false
    }
  }, [resolvedSrc, onLoadStateChange])

  useEffect(() => {
    const timer = setTimeout(() => checkAvailability(), 0)
    return () => clearTimeout(timer)
  }, [checkAvailability])

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.type !== "application/pdf") {
      toast.error("Invalid File Type", { description: "Only PDF files are supported for document re-attachment." })
      return
    }

    if (!docId) {
      toast.error("Missing Identifier", { description: "Cannot re-attach file without a valid document identifier." })
      return
    }

    try {
      setIsReuploading(true)
      const formData = new FormData()
      formData.append("file", file)

      const res = await fetch(`/api/documents/${docId}`, {
        method: "PATCH",
        body: formData,
      })

      const data = await res.json().catch(() => null)

      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "Failed to re-attach document file.")
      }

      toast.success("Document Re-Attached", { description: "Replacement PDF file uploaded and verified successfully." })
      onFileReplaced?.(data.data)
      checkAvailability()
    } catch (err) {
      const errInfo = formatErrorMessage(err, { title: "Upload Failed", description: "Failed to upload replacement PDF." })
      toast.error(errInfo.title, { description: errInfo.description, action: errInfo.action })
    } finally {
      setIsReuploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  if (loadState === "missing") {
    return (
      <div className="flex flex-1 items-center justify-center bg-white p-8 dark:bg-card">
        <div className="max-w-md text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800/40 shadow-xs">
            <HugeIcon className="ph-duotone ph-file-dashed text-2xl" />
          </div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-zinc-100">
            Digital File Missing
          </h3>
          <p className="mt-2 text-xs text-gray-500 dark:text-zinc-400 leading-relaxed">
            The record details are still available, but the PDF file is missing from digital storage.
          </p>

          {(preview?.room || preview?.cabinet || preview?.drawer) && (
            <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-50 dark:bg-zinc-800/80 text-[11px] text-gray-700 dark:text-zinc-300 font-medium border border-border">
              <HugeIcon className="ph-bold ph-archive-box text-sm text-pup-maroon dark:text-red-400" />
              <span>Physical Archive: Room {preview.room}, Cabinet {preview.cabinet}, Drawer {preview.drawer}</span>
            </div>
          )}

          {docId ? (
            <div className="mt-6 flex flex-col items-center gap-2">
              <input
                type="file"
                ref={fileInputRef}
                accept="application/pdf"
                className="hidden"
                onChange={handleFileSelect}
              />
              <Button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isReuploading}
                className="h-10 px-5 text-xs font-semibold rounded-xl bg-pup-maroon hover:bg-pup-darkMaroon text-white dark:bg-red-600 dark:hover:bg-red-500 dark:text-white shadow-xs cursor-pointer active:scale-95 transition-all"
              >
                {isReuploading ? (
                  <span className="flex items-center gap-1.5">
                    <HugeIcon className="ph-bold ph-spinner animate-spin text-sm" />
                    <span>Re-attaching Scanned PDF...</span>
                  </span>
                ) : (
                  "Re-attach Scanned PDF"
                )}
              </Button>
              <p className="text-[11px] text-gray-400 dark:text-zinc-500">
                Upload a replacement scan to restore the digital file for this record.
              </p>
            </div>
          ) : (
            <p className="mt-4 text-[11px] text-gray-400 dark:text-zinc-500">
              Please contact the campus Registrar to verify the physical archival document.
            </p>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="relative min-h-0 min-w-0 flex-1 flex flex-col">
      {loadState === "loading" ? (
        <div className="absolute inset-0 bg-white p-6 dark:bg-card z-10">
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
      />
    </div>
  )
}

export default function PDFPreviewModal({ open, isOpen, onClose, preview, pdfUrl, title, filename, onFileReplaced }) {
  const isModalOpen = Boolean(open ?? isOpen)
  const effectivePreview = preview || (pdfUrl || title || filename ? { url: pdfUrl, title, filename } : null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [frameState, setFrameState] = useState("loading")

  const docId = effectivePreview?.docId || effectivePreview?.id
  const fileUrl = effectivePreview?.url || effectivePreview?.fileUrl || (docId ? `/api/documents/${docId}` : null)
  const hasFile = !!fileUrl || !!docId

  if (!isModalOpen && isFullscreen) {
    setIsFullscreen(false)
  }

  useEffect(() => {
    if (!isModalOpen) {
      if (typeof document !== "undefined") {
        document.body.style.pointerEvents = ""
        document.body.style.overflow = ""
      }
    }
  }, [isModalOpen])

  return (
    <Dialog 
      open={isModalOpen} 
      onOpenChange={(isOpenState) => {
        if (!isOpenState) {
          setIsFullscreen(false)
          onClose?.()
        }
      }}
    >
      <DialogContent 
        hideClose={true}
        className="flex h-[90vh] w-[96vw] max-w-[96vw] sm:max-w-[96vw] flex-col overflow-hidden border border-border bg-gray-100 p-0 shadow-2xl transition-all duration-normal ease-standard xl:max-w-[1400px] rounded-2xl dark:border-border dark:bg-muted z-[70] gap-0"
      >
        <DialogHeader className="shrink-0 border-b border-border dark:border-border bg-gray-50 dark:bg-white/5 px-6 py-4">
          <div className="flex items-center justify-between w-full gap-4">
            <div className="min-w-0 flex-1">
              <DialogTitle className="text-left font-semibold text-gray-900 dark:text-zinc-50 text-[15px] tracking-[-0.01em] truncate">
                Document Preview: {preview?.title || preview?.docType || preview?.originalFilename || "Preview"}
              </DialogTitle>
              <p className="text-left font-normal text-gray-900 dark:text-zinc-300 text-xs mt-0.5">
                {preview?.subtitle ? (
                  preview.subtitle
                ) : (
                  <>
                    Reviewing digitized record for{" "}
                    <span className="font-semibold text-pup-maroon dark:text-rose-400">
                      {preview?.studentName || "student"}
                    </span>
                    . Ensure all identifiers and data are clearly legible.
                  </>
                )}
              </p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="p-0 border-0 bg-transparent text-gray-400 hover:text-gray-900 dark:text-zinc-500 dark:hover:text-zinc-100 focus:outline-none cursor-pointer transition-colors flex items-center justify-center w-7 h-7 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800"
                title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
              >
                <HugeIcon  className={cn("text-[16px]", isFullscreen ? "ph-bold ph-corners-in" : "ph-bold ph-corners-out")}></HugeIcon>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="p-0 border-0 bg-transparent text-gray-400 hover:text-gray-900 dark:text-zinc-500 dark:hover:text-zinc-100 focus:outline-none cursor-pointer transition-colors flex items-center justify-center w-7 h-7 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800"
                title="Close"
              >
                <HugeIcon  className="ph-bold ph-x text-[16px]"></HugeIcon>
              </button>
            </div>
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
                    <HugeIcon  className="ph-bold ph-x text-lg"></HugeIcon>
                  </Button>
                </div>
              )}
              <PDFFrame 
                key={fileUrl || docId} 
                docId={docId} 
                url={fileUrl} 
                preview={effectivePreview} 
                onFileReplaced={onFileReplaced}
                onLoadStateChange={setFrameState}
              />
            </div>
          ) : (
            <div className="flex flex-1 items-center justify-center bg-white p-6 dark:bg-card">
              <div className="max-w-lg text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-border bg-gray-50 dark:border-border dark:bg-card">
                  <HugeIcon  className="ph-bold ph-file-x text-xl text-gray-300 dark:text-zinc-600"></HugeIcon>
                </div>
                <p className="text-sm font-semibold text-gray-600 dark:text-zinc-300">
                  No digital file attached
                </p>
                <p className="mt-1 text-xs text-gray-400 dark:text-zinc-500">
                  This record has no attached digital file or its file was removed.
                </p>
              </div>
            </div>
          )}
        </div>

        <div 
          className="flex shrink-0 justify-end items-center bg-white dark:bg-card px-6 py-4 border-t border-border dark:border-border gap-2.5"
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
            <a
              href={fileUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 h-10 px-4 text-xs font-semibold rounded-xl text-pup-maroon dark:text-red-400 hover:bg-red-50/60 dark:hover:bg-red-950/30 transition-colors"
            >
              <span className="hover:underline">Open</span>
              <HugeIcon  className="ph-bold ph-arrow-square-out text-sm"></HugeIcon>
            </a>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  )
}
