"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty";
import { toast } from "sonner";
import { formatErrorMessage } from "@/lib/errorUtils";
import { createImagePdfPreview } from "@/lib/imagePdfPreview";
import { Archive01Icon, FileAddIcon, Loading01Icon } from "hugeicons-react";
import PDFPreview from "@/components/shared/PDFPreview";
import { DOCUMENT_MAX_SIZE_BYTES, DOCUMENT_MAX_SIZE_LABEL, formatBytes } from "@/lib/uploadLimits";

export default function ResilientPDFViewer({
  src,
  preparedPdf = false,
  docId,
  preview,
  className = "absolute inset-0 h-full w-full bg-gray-200 dark:bg-zinc-700",
  title = "PDF Preview",
  onStatusChange,
  onFileReplaced,
  showReupload = true,
  frameRef,
  onReadyChange,
  onPreviewReady,
}) {
  const [loadState, setLoadState] = useState("loading");
  const [frameSrc, setFrameSrc] = useState(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [isReuploading, setIsReuploading] = useState(false);
  const fileInputRef = useRef(null);
  const resolvedSrc = src || (docId ? `/api/documents/${docId}` : "");
  const originalFilename = preview?.originalFilename || preview?.original_filename || preview?.filename || "";

  useEffect(() => {
    const controller = new AbortController();
    let objectUrl;
    let pdfTask;
    const timer = setTimeout(async () => {
      setLoadState("loading");
      setFrameSrc(null);
      setError("");
      onReadyChange?.(false);
      onPreviewReady?.(null);
      onStatusChange?.("loading");
      try {
        if (!resolvedSrc) {
          setLoadState("missing");
          onStatusChange?.("missing");
          return;
        }
        // Generated reports already came from a successful PDF response.
        // Load their object URL in the frame without probing it via fetch.
        if (preparedPdf && resolvedSrc.startsWith("blob:")) {
          setFrameSrc(resolvedSrc);
          onPreviewReady?.({ url: resolvedSrc, source: resolvedSrc, isConverted: false });
          setLoadState("ready");
          onStatusChange?.("ready");
          return;
        }
        const response = await fetch(resolvedSrc, {
          credentials: "same-origin",
          cache: "no-store",
          signal: controller.signal,
        });
        if (response.headers.get("X-File-Missing") === "true" || (!docId && response.status === 404 && !resolvedSrc.startsWith("blob:"))) {
          setLoadState("missing");
          onStatusChange?.("missing");
          return;
        }
        if (!response.ok) {
          throw new Error(response.status === 401 || response.status === 403
            ? "You do not have access to preview this file."
            : response.status === 410
              ? "This earlier file is no longer available."
              : `Unable to load the preview (HTTP ${response.status}).`);
        }
        const mime = (response.headers.get("Content-Type") || "").split(";")[0].trim().toLowerCase();
        const isImage = mime.startsWith("image/") || /\.(png|jpe?g|webp|gif|bmp)$/i.test(originalFilename);
        if (isImage) {
          const pdf = await createImagePdfPreview(await response.blob());
          if (controller.signal.aborted) return;
          objectUrl = URL.createObjectURL(pdf);
          setFrameSrc(objectUrl);
          onPreviewReady?.({ url: objectUrl, source: resolvedSrc, isConverted: true });
        } else if (!mime || mime.includes("pdf") || (mime === "application/octet-stream" && (!originalFilename || /\.pdf$/i.test(originalFilename)))) {
          const pdf = new Blob([await response.blob()], { type: "application/pdf" });
          const data = await pdf.arrayBuffer();
          const pdfjs = await import("pdfjs-dist/build/pdf.mjs");
          if (controller.signal.aborted) return;
          pdfjs.GlobalWorkerOptions.workerSrc = "/pdfjs/pdf.worker.min.mjs";
          pdfTask = pdfjs.getDocument({ data, isEvalSupported: false });
          try {
            const document = await pdfTask.promise;
            await document.getPage(1);
          } catch (failure) {
            if (controller.signal.aborted) return;
            if (failure.name !== "PasswordException" && failure.name !== "InvalidPDFException" && failure.name !== "FormatError") {
              throw failure;
            }
            setError(failure.name === "PasswordException"
              ? "This PDF is password-protected. Download the original and use its password to open it."
              : "This PDF could not be read. Ask the uploader for a readable copy.");
            setLoadState("unreadable");
            onStatusChange?.("unreadable");
            return;
          } finally {
            const task = pdfTask;
            pdfTask = null;
            await task?.destroy().catch(() => {});
          }
          if (controller.signal.aborted) return;
          objectUrl = URL.createObjectURL(pdf);
          const fragment = new URL(resolvedSrc, window.location.href).hash;
          setFrameSrc(objectUrl + fragment);
          onPreviewReady?.({ url: objectUrl, source: resolvedSrc, isConverted: false });
        } else {
          setLoadState("unsupported");
          onStatusChange?.("ready");
          return;
        }
        setLoadState("ready");
        onStatusChange?.("ready");
      } catch (failure) {
        if (controller.signal.aborted) return;
        setError(failure.message || "Unable to prepare the PDF preview.");
        setLoadState("error");
        onStatusChange?.("error");
      }
    }, 0);
    return () => {
      clearTimeout(timer);
      controller.abort();
      const task = pdfTask;
      pdfTask = null;
      task?.destroy().catch(() => {});
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [resolvedSrc, docId, originalFilename, preparedPdf, onStatusChange, onReadyChange, onPreviewReady, attempt]);

  const handleFileSelect = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.type !== "application/pdf") {
      toast.error("Unsupported file type", { description: "Select a PDF file to re-attach this document." });
      return;
    }
    if (file.size > DOCUMENT_MAX_SIZE_BYTES) {
      toast.error("File too large", {
        description: `Replacement PDF (${formatBytes(file.size)}) exceeds the ${DOCUMENT_MAX_SIZE_LABEL} limit.`,
      });
      return;
    }
    if (!docId) return;
    try {
      setIsReuploading(true);
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch(`/api/documents/${docId}`, { method: "PATCH", body: formData });
      const result = await response.json().catch(() => null);
      if (!response.ok || !result?.ok) throw new Error(result?.error || "Could not re-attach document file.");
      toast.success("Document re-attached", { description: "Replacement PDF file uploaded and verified." });
      onFileReplaced?.(result.data);
      setAttempt((value) => value + 1);
    } catch (failure) {
      const info = formatErrorMessage(failure, { title: "Upload failed", description: "Could not upload replacement PDF." });
      toast.error(info.title, { description: info.description, action: info.action });
    } finally {
      setIsReuploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="relative flex h-full min-h-0 w-full min-w-0 flex-1 flex-col">
      {loadState === "loading" ? (
        <div className="absolute inset-0 z-10 space-y-4 bg-white p-6 dark:bg-card" role="status" aria-label="Loading PDF preview">
          <Skeleton className="h-6 w-2/5" />
          <Skeleton className="h-4 w-3/5" />
          <Skeleton className="h-[55vh] w-full" />
        </div>
      ) : loadState === "ready" ? (
        <PDFPreview ref={frameRef} src={frameSrc} title={title} className={className} onReadyChange={onReadyChange} />
      ) : (
        <div className="flex h-full items-center justify-center overflow-y-auto bg-white p-6 dark:bg-card">
          <EmptyState
            variant="compact"
            icon={FileAddIcon}
            title={loadState === "missing" ? "Digital file missing" : "PDF preview unavailable"}
            description={loadState === "missing"
              ? "The record details are available, but the digital file could not be found."
              : loadState === "unsupported"
                ? "This file format cannot be displayed as a PDF. Download the original file to open it."
                : error}
          >
            {loadState === "missing" && (preview?.room || preview?.cabinet || preview?.drawer) && (
              <p className="flex items-center justify-center gap-2 text-xs text-gray-600 dark:text-zinc-300">
                <Archive01Icon size={16} aria-hidden="true" />
                Room {preview.room}, Cabinet {preview.cabinet}, Drawer {preview.drawer}
              </p>
            )}
            {loadState === "missing" && showReupload && docId ? (
              <>
                <input type="file" ref={fileInputRef} accept="application/pdf" className="hidden" onChange={handleFileSelect} />
                <Button size="sm" className="h-9 px-4 text-xs font-semibold rounded-xl" onClick={() => fileInputRef.current?.click()} disabled={isReuploading}>
                  {isReuploading ? (
                    <>
                      <Loading01Icon size={14} className="animate-spin mr-1.5" />
                      <span>Re-attaching Scanned PDF…</span>
                    </>
                  ) : (
                    "Re-attach Scanned PDF"
                  )}
                </Button>
              </>
            ) : loadState === "error" ? (
              <Button variant="outline" size="sm" className="h-9 px-4 text-xs font-semibold rounded-xl" onClick={() => setAttempt((value) => value + 1)}>
                Retry Preview
              </Button>
            ) : null}
          </EmptyState>
        </div>
      )}
    </div>
  );
}
