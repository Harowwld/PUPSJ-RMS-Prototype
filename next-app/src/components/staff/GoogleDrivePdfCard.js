"use client";

import React, { useState, useEffect } from "react";
import HugeIcon from "@/components/shared/HugeIcon";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { formatPHDateTime } from "@/lib/timeFormat";

function formatFileSize(bytes) {
  if (!bytes || isNaN(bytes) || bytes <= 0) return "1.2 MB";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// In-memory cache for rendered thumbnails so switching views or re-rendering is instant
const thumbnailCache = new Map();

export default function GoogleDrivePdfCard({
  doc,
  student,
  viewMode = "grid", // "grid" | "list"
  onPreview,
  onLocate,
  onDownload,
  className,
}) {
  const docTitle = doc?.doc_type || doc?.original_filename || "Document.pdf";
  const originalFilename = doc?.original_filename || `${docTitle}.pdf`;
  const fileSize = formatFileSize(doc?.size_bytes);
  const formattedDate = doc?.created_at ? formatPHDateTime(doc.created_at) : "Recently filed";
  const approvalStatus = doc?.approval_status || "Approved";
  const resolvedSrc = doc?.file_url || (doc?.id ? `/api/documents/${doc.id}` : "");
  const isImage = Boolean(
    doc?.mime_type?.startsWith("image/") ||
    originalFilename?.match(/\.(png|jpe?g|webp|gif|svg)$/i)
  );

  const [thumbnailUrl, setThumbnailUrl] = useState(() => {
    if (isImage) return resolvedSrc;
    if (typeof window !== "undefined" && resolvedSrc && thumbnailCache.has(resolvedSrc)) {
      return thumbnailCache.get(resolvedSrc);
    }
    return null;
  });
  const [isPdfLoading, setIsPdfLoading] = useState(() => {
    if (isImage) return false;
    if (typeof window !== "undefined" && resolvedSrc && thumbnailCache.has(resolvedSrc)) return false;
    return Boolean(resolvedSrc);
  });
  const [hasPdfError, setHasPdfError] = useState(false);

  useEffect(() => {
    if (isImage) {
      setThumbnailUrl(resolvedSrc);
      setIsPdfLoading(false);
      setHasPdfError(false);
      return;
    }

    if (!resolvedSrc) {
      setThumbnailUrl(null);
      setIsPdfLoading(false);
      setHasPdfError(false);
      return;
    }

    if (thumbnailCache.has(resolvedSrc)) {
      setThumbnailUrl(thumbnailCache.get(resolvedSrc));
      setIsPdfLoading(false);
      setHasPdfError(false);
      return;
    }

    let active = true;
    setIsPdfLoading(true);
    setHasPdfError(false);

    async function generateThumbnail() {
      let loadingTask = null;
      try {
        const response = await fetch(resolvedSrc, { credentials: "same-origin" });
        if (!response.ok) {
          throw new Error(`PDF fetch failed with status ${response.status}`);
        }
        const data = await response.arrayBuffer();
        if (!active) return;

        const pdfjs = await import("pdfjs-dist/build/pdf.mjs");
        pdfjs.GlobalWorkerOptions.workerSrc = "/pdfjs/pdf.worker.min.mjs";

        loadingTask = pdfjs.getDocument({ data });
        const pdf = await loadingTask.promise;
        if (!active) return;

        const page = await pdf.getPage(1);
        if (!active) return;

        const unscaledViewport = page.getViewport({ scale: 1 });
        const desiredWidth = 560; // 2x Retina resolution for ~280px container
        const scale = Math.max(0.4, Math.min(2.0, desiredWidth / (unscaledViewport.width || 612)));
        const viewport = page.getViewport({ scale });

        const canvas = document.createElement("canvas");
        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);
        const ctx = canvas.getContext("2d", { alpha: false });
        if (ctx) {
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }

        await page.render({
          canvasContext: ctx,
          viewport,
        }).promise;

        if (!active) return;

        const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
        thumbnailCache.set(resolvedSrc, dataUrl);

        if (active) {
          setThumbnailUrl(dataUrl);
          setIsPdfLoading(false);
        }
      } catch (err) {
        console.warn("Failed to generate PDF thumbnail:", err);
        if (active) {
          setHasPdfError(true);
          setIsPdfLoading(false);
        }
      } finally {
        try {
          loadingTask?.destroy?.();
        } catch {}
      }
    }

    generateThumbnail();

    return () => {
      active = false;
    };
  }, [resolvedSrc, isImage]);

  const handlePreviewClick = (e) => {
    e?.stopPropagation?.();
    if (onPreview) {
      onPreview(
        doc?.doc_type || "Document",
        student?.name || "Student",
        student?.studentNo || "",
        doc?.id,
        doc?.file_url
      );
    }
  };

  const handleLocateClick = (e) => {
    e?.stopPropagation?.();
    if (onLocate && student) {
      onLocate(student);
    }
  };

  const handleDownloadClick = (e) => {
    e?.stopPropagation?.();
    if (onDownload) {
      onDownload(doc);
    } else {
      // Fallback direct download link
      const downloadUrl = doc?.file_url || (doc?.id ? `/api/documents/${doc.id}` : null);
      if (downloadUrl) {
        window.open(downloadUrl, "_blank");
      }
    }
  };

  // --- LIST VIEW MODE ---
  if (viewMode === "list") {
    return (
      <div
        onClick={handlePreviewClick}
        className={cn(
          "group flex items-center justify-between gap-3 p-3 rounded-xl bg-white dark:bg-zinc-900/60 hover:bg-[#f0f4f9] dark:hover:bg-zinc-800/80 border border-gray-200/70 dark:border-white/5 transition-all shadow-2xs hover:shadow-sm cursor-pointer select-none active:scale-[0.99]",
          className
        )}
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {/* Google Drive Red PDF Badge */}
          <div className="h-6 px-1.5 rounded-[5px] bg-[#ea4335] text-white flex items-center justify-center font-bold text-[10px] tracking-wider shrink-0 shadow-2xs">
            PDF
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-gray-800 dark:text-zinc-100 truncate group-hover:text-pup-maroon dark:group-hover:text-red-400 transition-colors">
                {docTitle}
              </span>
              <span className="text-[11px] text-gray-400 dark:text-zinc-500 truncate hidden sm:inline">
                ({originalFilename})
              </span>
            </div>
            <div className="text-[11px] text-gray-500 dark:text-zinc-400 truncate mt-0.5 sm:hidden">
              {fileSize} • {formattedDate}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="hidden sm:flex items-center gap-3 text-xs text-gray-500 dark:text-zinc-400">
            <span>{fileSize}</span>
            <span>•</span>
            <span>{formattedDate}</span>
          </div>

          {/* Status Badge */}
          <span
            className={cn(
              "text-[10px] font-semibold px-2 py-0.5 rounded-full border shrink-0",
              approvalStatus === "Approved"
                ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20"
                : approvalStatus === "Declined"
                ? "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20"
                : "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20"
            )}
          >
            {approvalStatus}
          </span>

          {/* Quick Actions */}
          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={handlePreviewClick}
                  className="w-7 h-7 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-zinc-100 flex items-center justify-center transition-colors cursor-pointer"
                  title="Preview Document"
                >
                  <HugeIcon className="ph-bold ph-eye text-sm" />
                </button>
              </TooltipTrigger>
              <TooltipContent>Preview Document</TooltipContent>
            </Tooltip>

            {student && onLocate && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={handleLocateClick}
                    className="w-7 h-7 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-gray-500 hover:text-pup-maroon dark:text-zinc-400 dark:hover:text-red-400 flex items-center justify-center transition-colors cursor-pointer"
                    title="Locate Archive Drawer"
                  >
                    <HugeIcon className="ph-bold ph-map-pin text-sm" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>Locate Archive Drawer</TooltipContent>
              </Tooltip>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="w-7 h-7 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-zinc-100 flex items-center justify-center transition-colors cursor-pointer"
                  title="More actions"
                >
                  <HugeIcon className="ph-bold ph-dots-three-vertical text-sm" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                sideOffset={6}
                className="w-52 rounded-2xl border border-border dark:border-white/10 shadow-2xl p-0 overflow-hidden bg-white dark:bg-zinc-900 select-none"
              >
                {/* Zone 1: Header */}
                <div className="px-3.5 py-2 border-b border-border dark:border-white/10 bg-gray-50/60 dark:bg-zinc-800/40 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <HugeIcon className="ph-bold ph-file-pdf text-xs text-pup-maroon dark:text-red-400 shrink-0" />
                    <span className="text-xs font-semibold text-gray-900 dark:text-zinc-100 truncate">
                      Document Actions
                    </span>
                  </div>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-400 shrink-0">
                    PDF
                  </span>
                </div>

                {/* Zone 2: Body */}
                <div className="p-1.5 space-y-0.5">
                  <DropdownMenuItem
                    onClick={handlePreviewClick}
                    className="cursor-pointer text-xs font-medium py-1.5 px-2 rounded-lg flex items-center gap-2 text-gray-700 dark:text-zinc-200 hover:bg-gray-100 dark:hover:bg-zinc-800"
                  >
                    <HugeIcon className="ph-bold ph-eye text-sm text-gray-500" />
                    <span>Preview Document</span>
                  </DropdownMenuItem>
                  {student && onLocate && (
                    <DropdownMenuItem
                      onClick={handleLocateClick}
                      className="cursor-pointer text-xs font-medium py-1.5 px-2 rounded-lg flex items-center gap-2 text-gray-700 dark:text-zinc-200 hover:bg-gray-100 dark:hover:bg-zinc-800"
                    >
                      <HugeIcon className="ph-bold ph-map-pin text-sm text-pup-maroon dark:text-red-400" />
                      <span>Locate Archive Drawer</span>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator className="my-1 border-t border-border dark:border-white/10" />
                  <DropdownMenuItem
                    onClick={handleDownloadClick}
                    className="cursor-pointer text-xs font-medium py-1.5 px-2 rounded-lg flex items-center gap-2 text-gray-700 dark:text-zinc-200 hover:bg-gray-100 dark:hover:bg-zinc-800"
                  >
                    <HugeIcon className="ph-bold ph-download-simple text-sm text-gray-500" />
                    <span>Download PDF</span>
                  </DropdownMenuItem>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    );
  }

  // --- GRID VIEW MODE (Google Drive Inspired PDF Card) ---
  return (
    <div
      onClick={handlePreviewClick}
      className={cn(
        "group relative rounded-2xl bg-[#f0f4f9] hover:bg-[#e9eef6] dark:bg-zinc-850 dark:hover:bg-zinc-800 p-3.5 transition-all duration-200 shadow-2xs hover:shadow-md cursor-pointer select-none border border-gray-200/60 dark:border-white/5 flex flex-col justify-between active:scale-[0.98]",
        className
      )}
    >
      {/* 1. Header: Red PDF badge, Truncated Document Title, 3-dots Menu */}
      <div className="flex items-center justify-between gap-2 mb-2.5">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {/* Red PDF Badge */}
          <div className="h-6 px-1.5 rounded-[5px] bg-[#ea4335] text-white flex items-center justify-center font-bold text-[10px] tracking-wider shrink-0 shadow-2xs">
            PDF
          </div>

          {/* Document Title */}
          <span
            className="text-xs font-semibold text-gray-800 dark:text-zinc-100 truncate flex-1 min-w-0 select-none group-hover:text-gray-950 dark:group-hover:text-white transition-colors"
            title={docTitle}
          >
            {docTitle}
          </span>
        </div>

        {/* 3-dots menu */}
        <div onClick={(e) => e.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="w-7 h-7 rounded-full flex items-center justify-center text-gray-500 hover:text-gray-800 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-black/5 dark:hover:bg-white/10 transition-colors shrink-0 cursor-pointer"
                aria-label="Document options"
              >
                <HugeIcon className="ph-bold ph-dots-three-vertical text-sm" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              sideOffset={6}
              className="w-52 rounded-2xl border border-border dark:border-white/10 shadow-2xl p-0 overflow-hidden bg-white dark:bg-zinc-900 select-none"
            >
              {/* Zone 1: Header */}
              <div className="px-3.5 py-2 border-b border-border dark:border-white/10 bg-gray-50/60 dark:bg-zinc-800/40 flex items-center justify-between">
                <div className="flex items-center gap-1.5 min-w-0">
                  <HugeIcon className="ph-bold ph-file-pdf text-xs text-pup-maroon dark:text-red-400 shrink-0" />
                  <span className="text-xs font-semibold text-gray-900 dark:text-zinc-100 truncate">
                    Document Actions
                  </span>
                </div>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-400 shrink-0">
                  PDF
                </span>
              </div>

              {/* Zone 2: Body */}
              <div className="p-1.5 space-y-0.5">
                <DropdownMenuItem
                  onClick={handlePreviewClick}
                  className="cursor-pointer text-xs font-medium py-1.5 px-2 rounded-lg flex items-center gap-2 text-gray-700 dark:text-zinc-200 hover:bg-gray-100 dark:hover:bg-zinc-800"
                >
                  <HugeIcon className="ph-bold ph-eye text-sm text-gray-500" />
                  <span>Preview Document</span>
                </DropdownMenuItem>
                {student && onLocate && (
                  <DropdownMenuItem
                    onClick={handleLocateClick}
                    className="cursor-pointer text-xs font-medium py-1.5 px-2 rounded-lg flex items-center gap-2 text-gray-700 dark:text-zinc-200 hover:bg-gray-100 dark:hover:bg-zinc-800"
                  >
                    <HugeIcon className="ph-bold ph-map-pin text-sm text-pup-maroon dark:text-red-400" />
                    <span>Locate Archive Drawer</span>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator className="my-1 border-t border-border dark:border-white/10" />
                <DropdownMenuItem
                  onClick={handleDownloadClick}
                  className="cursor-pointer text-xs font-medium py-1.5 px-2 rounded-lg flex items-center gap-2 text-gray-700 dark:text-zinc-200 hover:bg-gray-100 dark:hover:bg-zinc-800"
                >
                  <HugeIcon className="ph-bold ph-download-simple text-sm text-gray-500" />
                  <span>Download PDF</span>
                </DropdownMenuItem>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* 2. Paper Thumbnail (Actual Document Content) */}
      <div className="aspect-[4/3] w-full rounded-xl bg-white dark:bg-zinc-900 border border-gray-100 dark:border-white/5 shadow-2xs overflow-hidden select-none my-1 relative flex items-center justify-center">
        {isImage ? (
          <img
            src={resolvedSrc}
            alt={docTitle}
            className="w-full h-full object-cover object-top pointer-events-none select-none"
            loading="lazy"
          />
        ) : thumbnailUrl ? (
          <img
            src={thumbnailUrl}
            alt={docTitle}
            className="w-full h-full object-cover object-top pointer-events-none select-none transition-opacity duration-200"
            loading="lazy"
          />
        ) : isPdfLoading ? (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gray-50/70 dark:bg-zinc-800/40 animate-pulse text-gray-300 dark:text-zinc-600">
            <div className="w-9 h-9 rounded-xl bg-red-50 dark:bg-red-950/30 flex items-center justify-center text-[#ea4335]/70 mb-1.5 shadow-2xs">
              <HugeIcon className="ph-duotone ph-file-pdf text-xl" />
            </div>
            <div className="h-1.5 w-16 bg-gray-200/80 dark:bg-zinc-700/80 rounded-full" />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center text-gray-400 dark:text-zinc-500 p-4 text-center">
            <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-950/30 text-[#ea4335] flex items-center justify-center mb-2 shadow-2xs">
              <HugeIcon className="ph-duotone ph-file-pdf text-2xl" />
            </div>
            <span className="text-xs font-semibold text-gray-700 dark:text-zinc-300 truncate max-w-[90%]">
              {docTitle}
            </span>
            <span className="text-[10px] text-gray-400 dark:text-zinc-500 mt-0.5">
              Official Document On File
            </span>
          </div>
        )}

        {/* Hover Quick Preview Pill Overlay */}
        <div className="absolute inset-0 bg-black/10 dark:bg-black/40 backdrop-blur-[1px] opacity-0 group-hover:opacity-100 transition-opacity duration-150 flex items-center justify-center pointer-events-none">
          <div className="px-3.5 py-1.5 rounded-full bg-slate-900/95 text-white dark:bg-white dark:text-slate-900 text-xs font-semibold shadow-lg transform scale-95 group-hover:scale-100 transition-transform duration-150">
            Quick Preview
          </div>
        </div>
      </div>

      {/* 3. Footer: File Size, Date, Approval Status Pill */}
      <div className="flex items-center justify-between text-[11px] text-gray-500 dark:text-zinc-400 select-none pt-1">
        <div className="truncate pr-2">
          <span>{fileSize}</span>
          <span className="mx-1">•</span>
          <span>{formattedDate}</span>
        </div>

        <span
          className={cn(
            "text-[10px] font-semibold px-2 py-0.5 rounded-full border shrink-0",
            approvalStatus === "Approved"
              ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20"
              : approvalStatus === "Declined"
              ? "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20"
              : "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20"
          )}
        >
          {approvalStatus}
        </span>
      </div>
    </div>
  );
}
