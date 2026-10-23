"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import HugeIcon from "@/components/shared/HugeIcon";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { formatErrorMessage } from "@/lib/errorUtils";

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
  const [loadState, setLoadState] = useState("loading"); // "loading" | "ready" | "missing"
  const [isReuploading, setIsReuploading] = useState(false);
  const fileInputRef = useRef(null);

  const resolvedSrc = src || (docId ? `/api/documents/${docId}` : "");
  const finalSrc = resolvedSrc
    ? resolvedSrc.includes("#")
      ? resolvedSrc
      : `${resolvedSrc}#toolbar=0&navpanes=0`
    : "";

  const checkAvailability = useCallback(() => {
    if (!resolvedSrc) {
      setLoadState("missing");
      onStatusChange?.("missing");
      return;
    }
    let isMounted = true;
    setLoadState("loading");
    onStatusChange?.("loading");

    fetch(resolvedSrc, { method: "HEAD", credentials: "same-origin" })
      .then((res) => {
        if (!isMounted) return;
        const isMissing = res.status === 404 || res.headers.get("X-File-Missing") === "true";
        if (isMissing) {
          setLoadState("missing");
          onStatusChange?.("missing");
        } else if (res.ok) {
          setLoadState("ready");
          onStatusChange?.("ready");
        } else {
          setLoadState("missing");
          onStatusChange?.("missing");
        }
      })
      .catch(() => {
        if (!isMounted) return;
        setLoadState("missing");
        onStatusChange?.("missing");
      });

    return () => {
      isMounted = false;
    };
  }, [resolvedSrc, onStatusChange]);

  useEffect(() => {
    const timer = setTimeout(() => checkAvailability(), 0);
    return () => clearTimeout(timer);
  }, [checkAvailability]);

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/pdf") {
      toast.error("Invalid File Type", { description: "Only PDF files are supported for document re-attachment." });
      return;
    }

    if (!docId) {
      toast.error("Missing Identifier", { description: "Cannot re-attach file without a valid document identifier." });
      return;
    }

    try {
      setIsReuploading(true);
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(`/api/documents/${docId}`, {
        method: "PATCH",
        body: formData,
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "Failed to re-attach document file.");
      }

      toast.success("Document Re-Attached", { description: "Replacement PDF file uploaded and verified successfully." });
      onFileReplaced?.(data.data);
      checkAvailability();
    } catch (err) {
      const errInfo = formatErrorMessage(err, { title: "Upload Failed", description: "Failed to upload replacement PDF." });
      toast.error(errInfo.title, { description: errInfo.description, action: errInfo.action });
    } finally {
      setIsReuploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  if (loadState === "missing") {
    return (
      <div className="flex h-full w-full flex-1 items-center justify-center bg-white p-8 dark:bg-card">
        <div className="max-w-md text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800/40 shadow-xs">
            <HugeIcon className="ph-duotone ph-file-dashed text-2xl" />
          </div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-zinc-100">
            Archived Record: Digital File Displaced or Missing
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

          {showReupload && docId ? (
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
    );
  }

  return (
    <div className="relative min-h-0 min-w-0 flex-1 flex flex-col h-full w-full">
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
        title={title}
        src={finalSrc}
        className={className}
        style={{ border: "none" }}
      />
    </div>
  );
}
