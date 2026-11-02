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

export default function ResilientPDFViewer({
  src,
  docId,
  preview,
  className = "absolute inset-0 h-full w-full bg-gray-200 dark:bg-zinc-700",
  title = "PDF Preview",
  onStatusChange,
  onFileReplaced,
  showReupload = true,
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
    const timer = setTimeout(async () => {
      setLoadState("loading");
      setFrameSrc(null);
      setError("");
      onStatusChange?.("loading");
      let exists = false;
      try {
        if (!resolvedSrc) {
          setLoadState("missing");
          onStatusChange?.("missing");
          return;
        }
        const response = await fetch(resolvedSrc, {
          method: resolvedSrc.startsWith("blob:") ? "GET" : "HEAD",
          credentials: "same-origin",
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok || response.headers.get("X-File-Missing") === "true") {
          setLoadState("missing");
          onStatusChange?.("missing");
          return;
        }
        exists = true;
        const mime = (response.headers.get("Content-Type") || "").split(";")[0].trim().toLowerCase();
        const isImage = mime.startsWith("image/") || /\.(png|jpe?g|webp|gif|bmp)$/i.test(originalFilename);
        if (isImage) {
          const imageResponse = resolvedSrc.startsWith("blob:") ? response : await fetch(resolvedSrc, { credentials: "same-origin", cache: "no-store", signal: controller.signal });
          if (!imageResponse.ok) throw new Error("Unable to load the image attachment.");
          const pdf = await createImagePdfPreview(await imageResponse.blob());
          if (controller.signal.aborted) return;
          objectUrl = URL.createObjectURL(pdf);
          setFrameSrc(objectUrl);
        } else if (!mime || mime.includes("pdf") || (mime === "application/octet-stream" && (!originalFilename || /\.pdf$/i.test(originalFilename)))) {
          setFrameSrc(resolvedSrc);
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
        setLoadState(exists ? "error" : "missing");
        onStatusChange?.(exists ? "ready" : "missing");
      }
    }, 0);
    return () => {
      clearTimeout(timer);
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [resolvedSrc, originalFilename, onStatusChange, attempt]);

  const handleFileSelect = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.type !== "application/pdf") {
      toast.error("Invalid File Type", { description: "Only PDF files are supported for document re-attachment." });
      return;
    }
    if (!docId) return;
    try {
      setIsReuploading(true);
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch(`/api/documents/${docId}`, { method: "PATCH", body: formData });
      const result = await response.json().catch(() => null);
      if (!response.ok || !result?.ok) throw new Error(result?.error || "Failed to re-attach document file.");
      toast.success("Document Re-Attached", { description: "Replacement PDF file uploaded and verified successfully." });
      onFileReplaced?.(result.data);
      setAttempt((value) => value + 1);
    } catch (failure) {
      const info = formatErrorMessage(failure, { title: "Upload Failed", description: "Failed to upload replacement PDF." });
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
        <PDFPreview src={frameSrc} title={title} className={className} />
      ) : (
        <div className="flex h-full items-center justify-center overflow-y-auto bg-white p-6 dark:bg-card">
          <EmptyState
            variant="compact"
            icon={FileAddIcon}
            title={loadState === "missing" ? "Digital File Missing" : "PDF Preview Unavailable"}
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
                <Button onClick={() => fileInputRef.current?.click()} disabled={isReuploading}>
                  {isReuploading ? <><Loading01Icon size={16} className="animate-spin" /> Re-attaching Scanned PDF…</> : "Re-attach Scanned PDF"}
                </Button>
              </>
            ) : loadState === "error" ? (
              <Button variant="outline" onClick={() => setAttempt((value) => value + 1)}>Retry Preview</Button>
            ) : null}
          </EmptyState>
        </div>
      )}
    </div>
  );
}
