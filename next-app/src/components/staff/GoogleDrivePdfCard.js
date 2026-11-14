"use client";
import { COMPACT_BADGE_BASE } from "@/lib/badgeStyles";


import React, { useState, useEffect } from "react";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { TableActions } from "@/components/shared/TableActions";
import { TableStatus } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { downloadDocument } from "@/lib/documentDownload";
import { PDF_ACTION_LABELS } from "@/lib/pdfPreview";
import { toast } from "sonner";
import { formatPHDateTime } from "@/lib/timeFormat";
import { Download01Icon, File02Icon, Location01Icon, MoreVerticalIcon, ReloadIcon, ViewIcon } from "hugeicons-react";
import { useTablePreferences } from "@/components/shared/TablePreferences";
import { getListDensityClasses } from "@/lib/tablePresentation";


function formatFileSize(bytes) {
  if (!bytes || isNaN(bytes) || bytes <= 0) return "1.2 MB";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// In-memory cache for rendered thumbnails so switching views or re-rendering is instant
const thumbnailCache = new Map();

const actionClassName =
  "flex min-h-8 w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-pup-maroon dark:text-zinc-300 dark:hover:bg-zinc-800/70 dark:focus-visible:ring-red-400 cursor-pointer border-0 bg-transparent select-none active:scale-[0.98]";

export function DocumentCardActionsMenu({
  docTitle,
  isImage,
  canRescan,
  hasLocate,
  onPreview,
  onRescan,
  onLocate,
  onDownload,
  triggerClassName = "table-action-button rounded-lg active:scale-95 cursor-pointer flex items-center justify-center",
}) {
  const [open, setOpen] = useState(false);

  const runAction = (event, callback) => {
    event?.stopPropagation?.();
    setOpen(false);
    callback?.(event);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          onClick={(event) => event.stopPropagation()}
          aria-label={`More actions for ${docTitle}`}
          aria-expanded={open}
          className={triggerClassName}
          title="More actions"
        >
          <MoreVerticalIcon size={16} aria-hidden="true" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={6}
        className="max-h-[calc(100dvh-2rem)] w-[min(13.5rem,calc(100vw-2rem))] max-w-[calc(100vw-2rem)] rounded-2xl"
      >
        <div className="max-h-[min(55vh,18rem)] space-y-0.5 overflow-y-auto p-1 font-jakarta">
          <button
            type="button"
            onClick={(event) => runAction(event, onPreview)}
            className={actionClassName}
          >
            <ViewIcon size={14} aria-hidden="true" className="shrink-0 text-gray-500 dark:text-zinc-400" />
            <span>{PDF_ACTION_LABELS.preview}</span>
          </button>

          {canRescan && (
            <button
              type="button"
              onClick={(event) => runAction(event, onRescan)}
              className={actionClassName}
            >
              <ReloadIcon size={14} aria-hidden="true" className="shrink-0 text-amber-600 dark:text-amber-400" />
              <span>Re-scan Document</span>
            </button>
          )}

          {hasLocate && (
            <button
              type="button"
              onClick={(event) => runAction(event, onLocate)}
              className={actionClassName}
            >
              <Location01Icon size={14} aria-hidden="true" className="shrink-0" />
              <span>Locate Archive Drawer</span>
            </button>
          )}

          <div aria-hidden="true" className="-mx-1 my-1.5 h-px bg-gray-200 dark:bg-white/10" />

          <button
            type="button"
            onClick={(event) => runAction(event, onDownload)}
            className={actionClassName}
          >
            <Download01Icon size={14} aria-hidden="true" className="shrink-0 text-gray-500 dark:text-zinc-400" />
            <span>{isImage ? PDF_ACTION_LABELS.original : PDF_ACTION_LABELS.download}</span>
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default function GoogleDrivePdfCard({
  doc,
  student,
  viewMode = "grid", // "grid" | "list"
  onPreview,
  onLocate,
  onRescan,
  onDownload,
  className,
}) {
  const { density } = useTablePreferences();
  const densityClasses = getListDensityClasses(density);
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
      const timer = setTimeout(() => {
        setThumbnailUrl(resolvedSrc);
        setIsPdfLoading(false);
        setHasPdfError(false);
      }, 0);
      return () => clearTimeout(timer);
    }

    if (!resolvedSrc) {
      const timer = setTimeout(() => {
        setThumbnailUrl(null);
        setIsPdfLoading(false);
        setHasPdfError(false);
      }, 0);
      return () => clearTimeout(timer);
    }

    if (thumbnailCache.has(resolvedSrc)) {
      const timer = setTimeout(() => {
        setThumbnailUrl(thumbnailCache.get(resolvedSrc));
        setIsPdfLoading(false);
        setHasPdfError(false);
      }, 0);
      return () => clearTimeout(timer);
    }

    let active = true;
    const loadingTimer = setTimeout(() => {
      setIsPdfLoading(true);
      setHasPdfError(false);
    }, 0);

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
      clearTimeout(loadingTimer);
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

  const canRescan = Boolean(
    onRescan &&
      !doc?.source_type &&
      !String(doc?.id || "").startsWith("cbl-") &&
      !String(doc?.id || "").startsWith("event-proposal-")
  );

  const handleRescanClick = (e) => {
    e?.stopPropagation?.();
    if (canRescan) {
      onRescan(
        doc?.organization_id || doc?.student_no || student?.rawOrg?.id || student?.studentNo || student?.id,
        doc?.doc_type,
        doc?.id,
        doc?.original_filename,
        doc?.mime_type
      );
    }
  };

  const handleDownloadClick = async (e) => {
    e?.stopPropagation?.();
    try {
      if (onDownload) await onDownload(doc);
      else if (resolvedSrc) await downloadDocument(resolvedSrc, originalFilename);
    } catch (error) {
      toast.error("Download Failed", { description: error.message });
    }
  };

  // --- LIST VIEW MODE ---
  if (viewMode === "list") {
    return (
      <div
        role="listitem"
        className={cn(
          "group flex flex-col sm:flex-row sm:items-center justify-between hover:bg-gray-50/80 dark:hover:bg-zinc-800/40 transition-colors",
          densityClasses.paddingX,
          densityClasses.paddingY,
          densityClasses.gap,
          densityClasses.minHeight,
          className
        )}
      >
        <button
          type="button"
          onClick={handlePreviewClick}
          className="flex min-w-0 flex-1 items-center gap-3 rounded-md text-left cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <File02Icon size={18} aria-hidden="true" className="shrink-0 text-muted-foreground" />
          <span className="min-w-0">
            <span className="block truncate text-xs sm:text-sm font-medium text-gray-900 dark:text-zinc-100 group-hover:text-pup-maroon dark:group-hover:text-red-400 transition-colors">{docTitle}</span>
            <span className="block truncate text-[11px] text-gray-500 dark:text-zinc-400">
              {originalFilename} • {fileSize} • {formattedDate}
            </span>
          </span>
        </button>
        <div className="flex shrink-0 items-center gap-2 self-start sm:gap-3 sm:self-auto">
          <TableStatus value={approvalStatus} />
          <TableActions
            actions={[
              { label: PDF_ACTION_LABELS.preview, icon: ViewIcon, onClick: handlePreviewClick },
              ...(canRescan ? [{ label: "Re-scan Document", icon: ReloadIcon, onClick: handleRescanClick }] : []),
              ...(student && onLocate ? [{ label: "Locate Archive Drawer", icon: Location01Icon, onClick: handleLocateClick }] : []),
              { label: isImage ? PDF_ACTION_LABELS.original : PDF_ACTION_LABELS.download, icon: Download01Icon, onClick: handleDownloadClick },
            ]}
          />
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
          <DocumentCardActionsMenu
            docTitle={docTitle}
            isImage={isImage}
            canRescan={canRescan}
            hasLocate={Boolean(student && onLocate)}
            onPreview={handlePreviewClick}
            onRescan={handleRescanClick}
            onLocate={handleLocateClick}
            onDownload={handleDownloadClick}
            triggerClassName="table-action-button shrink-0"
          />
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
              <File02Icon size="1em" className="text-xl" />
            </div>
            <div className="h-1.5 w-16 bg-gray-200/80 dark:bg-zinc-700/80 rounded-full" />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center text-gray-400 dark:text-zinc-500 p-4 text-center">
            <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-950/30 text-[#ea4335] flex items-center justify-center mb-2 shadow-2xs">
              <File02Icon size="1em" className="text-2xl" />
            </div>
            <span className="text-xs font-semibold text-gray-700 dark:text-zinc-300 truncate max-w-[90%]">
              {docTitle}
            </span>
            <span className="text-[10px] text-gray-400 dark:text-zinc-500 mt-0.5">
              Official Document On File
            </span>
          </div>
        )}

        <button
          type="button"
          aria-label={`Preview ${docTitle}`}
          title={PDF_ACTION_LABELS.preview}
          className="table-action-button absolute bottom-2 right-2"
          onClick={handlePreviewClick}
        >
          <ViewIcon size={16} aria-hidden="true" />
        </button>
      </div>

      {/* 3. Footer: File Size, Date, Approval Status Pill */}
      <div className="flex items-center justify-between text-[11px] text-gray-500 dark:text-zinc-400 select-none pt-1">
        <div className="truncate pr-2">
          <span>{fileSize}</span>
          <span className="mx-1">•</span>
          <span>{formattedDate}</span>
        </div>

        <span
          className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full border shrink-0", approvalStatus === "Approved"
              ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20"
              : approvalStatus === "Declined"
              ? "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20"
              : "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20", COMPACT_BADGE_BASE)}
        >
          {approvalStatus}
        </span>
      </div>
    </div>
  );
}
