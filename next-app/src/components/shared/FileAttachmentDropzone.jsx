"use client";
import { BADGE_BASE, BADGE_PALETTES, COMPACT_BADGE_BASE, SETTINGS_STATUS_PILL_SM } from "@/lib/badgeStyles";


import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { PDF_ACTION_LABELS } from "@/lib/pdfPreview";
import { downloadDocument } from "@/lib/documentDownload";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/ui/empty";
import { Attachment01Icon, Add01Icon, Cancel01Icon, CloudUploadIcon, Download01Icon, Files01Icon, Image01Icon, ViewIcon } from "hugeicons-react";

/**
 * Formats bytes into clean human-readable strings (e.g. 111 KB, 12 MB)
 */
export function formatFileSize(bytes) {
  if (!bytes || isNaN(bytes) || bytes <= 0) return "0 KB";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  const mb = bytes / (1024 * 1024);
  return mb % 1 === 0 ? `${mb.toFixed(0)} MB` : `${mb.toFixed(1)} MB`;
}

/**
 * Validates a file against an accept string (e.g. ".pdf,.png,image/*,application/pdf")
 */
export function isFileAccepted(file, acceptString) {
  if (!acceptString || acceptString === "*" || acceptString.trim() === "") return true;
  if (!file) return false;

  const fileName = String(file.name || "").toLowerCase();
  const fileType = String(file.type || "").toLowerCase();
  const tokens = acceptString
    .split(",")
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);

  if (tokens.length === 0) return true;

  return tokens.some((rawToken) => {
    // 1. Extension match (e.g. .pdf, .png, .jpg)
    if (rawToken.startsWith(".")) {
      return fileName.endsWith(rawToken);
    }

    // 2. Wildcard MIME type match (e.g. image/*, audio/*)
    if (rawToken.endsWith("/*")) {
      const prefix = rawToken.slice(0, -1);
      if (fileType.startsWith(prefix)) return true;
      if (prefix === "image/") {
        return /\.(png|jpe?g|webp|gif|svg|bmp|ico)$/i.test(fileName);
      }
      return false;
    }

    // 3. Exact MIME type match (e.g. application/pdf, image/png)
    if (fileType && fileType === rawToken) return true;

    // Fallback known extension checks for common MIME types if browser leaves file.type empty
    if (rawToken === "application/pdf" && fileName.endsWith(".pdf")) return true;
    if (rawToken === "image/png" && fileName.endsWith(".png")) return true;
    if ((rawToken === "image/jpeg" || rawToken === "image/jpg") && (fileName.endsWith(".jpg") || fileName.endsWith(".jpeg"))) return true;
    if (rawToken === "image/webp" && fileName.endsWith(".webp")) return true;
    if (rawToken === "image/svg+xml" && fileName.endsWith(".svg")) return true;
    if (rawToken === "application/msword" && fileName.endsWith(".doc")) return true;
    if (rawToken === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" && fileName.endsWith(".docx")) return true;
    if (rawToken === "application/zip" && fileName.endsWith(".zip")) return true;

    return false;
  });
}

/**
 * Extracts file extension in uppercase
 */
export function getFileExtension(filename = "") {
  if (!filename) return "";
  const parts = String(filename).split(".");
  if (parts.length <= 1) return "";
  return parts.pop().toUpperCase();
}

/**
 * Returns color tokens, icon class, and pill badge for each file format
 */
export function getFileFormatConfig(filename = "", mimeType = "") {
  const ext = getFileExtension(filename).toLowerCase();
  const mime = String(mimeType || "").toLowerCase();

  if (ext === "pdf" || mime.includes("pdf")) {
    return {
      extLabel: "PDF",
      badgeBg: "bg-[#dc2626] text-white",
      iconClass: " File02Icon text-red-500",
      accentColor: "#dc2626",
      isImage: false,
    };
  }
  if (["doc", "docx"].includes(ext) || mime.includes("word") || mime.includes("officedocument.wordprocessingml")) {
    return {
      extLabel: "DOCX",
      badgeBg: "bg-[#2563eb] text-white",
      iconClass: " Doc01Icon text-blue-500",
      accentColor: "#2563eb",
      isImage: false,
    };
  }
  if (["xls", "xlsx", "csv"].includes(ext) || mime.includes("spreadsheet") || mime.includes("csv")) {
    return {
      extLabel: ext.toUpperCase() || "XLSX",
      badgeBg: "bg-[#16a34a] text-white",
      iconClass: " Xls01Icon text-emerald-500",
      accentColor: "#16a34a",
      isImage: false,
    };
  }
  if (["png", "jpg", "jpeg", "webp", "svg", "gif"].includes(ext) || mime.startsWith("image/")) {
    return {
      extLabel: ext.toUpperCase() || "IMG",
      badgeBg: "bg-[#0d9488] text-white",
      iconClass: " Image01Icon text-teal-400",
      accentColor: "#0d9488",
      isImage: true,
    };
  }
  if (["zip", "rar", "7z", "enc", "bak", "backup", "pupbak"].includes(ext) || mime.includes("zip") || mime.includes("tar")) {
    return {
      extLabel: ext.toUpperCase() || "ZIP",
      badgeBg: "bg-amber-600 text-white",
      iconClass: " Archive01Icon text-amber-500",
      accentColor: "#d97706",
      isImage: false,
    };
  }

  return {
    extLabel: ext.toUpperCase() || "FILE",
    badgeBg: "bg-slate-600 dark:bg-zinc-700 text-white",
    iconClass: " File01Icon text-slate-500 dark:text-zinc-400",
    accentColor: "#64748b",
    isImage: false,
  };
}

/**
 * AttachedFileCard
 * Replicates the exact visual design from user reference media_1792608266426.png:
 * - Rounded dark preview area
 * - Document skeleton lines (or image thumbnail preview)
 * - Format badge pill (e.g. PDF in red, DOCX in blue)
 * - Bold filename and subtitle formatted with size
 */
export function AttachedFileCard({
  item,
  onRemove,
  onPreview,
  readOnly = false,
  categories = null,
  onCategoryChange = null,
  className = "",
  animateLayout = true,
  compactBadge = false,
}) {
  const file = item?.file || item;
  const filename = item?.original_filename || file?.name || "Attached File";
  const size = item?.size_bytes || file?.size || 0;
  const mimeType = item?.mime_type || file?.type || "";
  const formatConfig = useMemo(() => getFileFormatConfig(filename, mimeType), [filename, mimeType]);

  const previewBlobUrl = useMemo(() => {
    if (item?.url) return null;
    if (file instanceof Blob && formatConfig.isImage) {
      try {
        return URL.createObjectURL(file);
      } catch {
        return null;
      }
    }
    return null;
  }, [file, formatConfig.isImage, item?.url]);

  useEffect(() => {
    return () => {
      if (previewBlobUrl) {
        URL.revokeObjectURL(previewBlobUrl);
      }
    };
  }, [previewBlobUrl]);

  const isPdf = formatConfig.extLabel === "PDF";
  const pdfSourceKey = item?.url || file;
  const [pdfThumbnail, setPdfThumbnail] = useState({ source: null, url: null });
  const pdfThumbnailUrl = pdfThumbnail.source === pdfSourceKey ? pdfThumbnail.url : null;
  useEffect(() => {
    if (!isPdf || (!item?.url && !(file instanceof Blob))) return;

    let active = true;
    let loadingTask = null;
    const controller = new AbortController();

    async function renderPdfThumbnail() {
      try {
        let data;
        if (file instanceof Blob) {
          data = await file.arrayBuffer();
        } else if (item?.url) {
          const response = await fetch(item.url, {
            credentials: "same-origin",
            cache: "no-store",
            signal: controller.signal,
          });
          if (!response.ok) throw new Error("Unable to load the PDF attachment.");
          data = await response.arrayBuffer();
        } else {
          return;
        }
        if (!active) return;

        const pdfjs = await import("pdfjs-dist/build/pdf.mjs");
        pdfjs.GlobalWorkerOptions.workerSrc = "/pdfjs/pdf.worker.min.mjs";
        loadingTask = pdfjs.getDocument({ data });
        const pdf = await loadingTask.promise;
        if (!active) return;

        const page = await pdf.getPage(1);
        if (!active) return;

        const baseViewport = page.getViewport({ scale: 1 });
        const scale = Math.min(1.5, 320 / (baseViewport.width || 612));
        const viewport = page.getViewport({ scale });
        const canvas = document.createElement("canvas");
        canvas.width = Math.ceil(viewport.width);
        canvas.height = Math.ceil(viewport.height);
        const context = canvas.getContext("2d", { alpha: false });
        if (!context) return;
        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, canvas.width, canvas.height);
        await page.render({ canvasContext: context, viewport }).promise;
        if (active) setPdfThumbnail({ source: pdfSourceKey, url: canvas.toDataURL("image/jpeg", 0.88) });
      } catch {
        if (active) setPdfThumbnail({ source: pdfSourceKey, url: null });
      } finally {
        try {
          loadingTask?.destroy?.();
        } catch {}
      }
    }

    renderPdfThumbnail();
    return () => {
      active = false;
      controller.abort();
      try {
        loadingTask?.destroy?.();
      } catch {}
    };
  }, [file, isPdf, item?.url, pdfSourceKey]);

  const imageUrl = item?.url || previewBlobUrl;
  const documentPlaceholder = (
    <div className="flex flex-col gap-1.5 w-full pointer-events-none opacity-90">
      <div className="h-2 w-7/12 rounded-xs bg-gray-300/80 dark:bg-zinc-700/60" />
      <div className="h-1.5 w-11/12 rounded-xs bg-gray-200/90 dark:bg-zinc-800/80" />
      <div className="h-1.5 w-10/12 rounded-xs bg-gray-200/90 dark:bg-zinc-800/80" />
      <div className="h-1.5 w-8/12 rounded-xs bg-gray-200/90 dark:bg-zinc-800/80" />
    </div>
  );

  const downloadUrl = item?.url || item?.downloadUrl || null;

  const categoryLabel = useMemo(() => {
    if (!item?.attachmentType && !item?.attachment_type) return null;
    const type = item.attachmentType || item.attachment_type;
    const match = categories?.find((c) => c.value === type);
    if (match) return match.label;
    if (type === "spa") return "SPA Letter";
    if (type === "valid_id") return "Valid Government ID";
    if (type === "receipt") return "Proof of Payment";
    if (type === "clearance") return "Clearance Slip";
    if (type === "evidence") return "Supporting Evidence";
    return type;
  }, [item?.attachmentType, item?.attachment_type, categories]);

  return (
    <motion.div
      layout={animateLayout}
      initial={animateLayout ? { opacity: 0, scale: 0.95, y: 4 } : false}
      animate={animateLayout ? { opacity: 1, scale: 1, y: 0 } : undefined}
      exit={animateLayout ? { opacity: 0, scale: 0.9, transition: { duration: 0.15 } } : undefined}
      transition={animateLayout ? { type: "spring", stiffness: 100, damping: 20 } : undefined}
      className={cn(
        "group relative flex flex-col w-44 sm:w-48 shrink-0 rounded-2xl border border-black/[0.08] dark:border-white/10 bg-white dark:bg-zinc-900 text-gray-900 dark:text-zinc-100 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_4px_12px_rgba(0,0,0,0.02)] hover:border-black/15 dark:hover:border-white/20 hover:shadow-md p-2 transition-all select-none",
        className
      )}
    >
      {/* Top Preview Container */}
      <div
        onClick={() => onPreview && onPreview(item)}
        className={cn(
          "relative h-24 w-full rounded-xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/[0.05] dark:border-white/[0.08] p-3 flex flex-col justify-center gap-1.5 overflow-hidden",
          onPreview ? "cursor-pointer" : "cursor-default"
        )}
      >
        {isPdf ? (
          pdfThumbnailUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={pdfThumbnailUrl} alt={`${filename} first-page preview`} className="w-full h-full object-contain rounded-lg" />
          ) : documentPlaceholder
        ) : imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt={filename}
            className="w-full h-full object-cover rounded-lg"
          />
        ) : (
          /* Document skeleton lines */
          documentPlaceholder
        )}

        {/* Extension Pill Badge at Bottom-Right */}
        <span
          className={cn("absolute bottom-2 right-2 z-10 select-none", formatConfig.badgeBg, compactBadge ? COMPACT_BADGE_BASE : BADGE_BASE)}
        >
          {formatConfig.extLabel}
        </span>

        {/* Attachment Actions */}
        <div className="absolute inset-x-2 top-2 z-20 flex items-center justify-end gap-1.5">
          {onPreview && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onPreview(item);
              }}
              className="size-7.5 rounded-full bg-white/90 hover:bg-white text-gray-800 dark:bg-zinc-800/90 dark:hover:bg-zinc-700 dark:text-zinc-100 flex items-center justify-center transition-all active:scale-95 cursor-pointer shadow-xs border border-black/[0.08] dark:border-white/10"
              title={PDF_ACTION_LABELS.preview}
              aria-label={PDF_ACTION_LABELS.preview}
            >
              <ViewIcon size="1em" className="text-xs" />
            </button>
          )}
          {downloadUrl && (
            <button
              type="button"
              onClick={async (e) => {
                e.stopPropagation();
                try {
                  await downloadDocument(downloadUrl, filename);
                } catch (error) {
                  toast.error("Download Failed", { description: error.message });
                }
              }}
              className="size-7.5 rounded-full bg-white/90 hover:bg-white text-gray-800 dark:bg-zinc-800/90 dark:hover:bg-zinc-700 dark:text-zinc-100 flex items-center justify-center transition-all active:scale-95 cursor-pointer shadow-xs border border-black/[0.08] dark:border-white/10"
              title={formatConfig.extLabel === "PDF" ? PDF_ACTION_LABELS.download : PDF_ACTION_LABELS.original}
              aria-label={formatConfig.extLabel === "PDF" ? PDF_ACTION_LABELS.download : PDF_ACTION_LABELS.original}
            >
              <Download01Icon size="1em" className="text-xs" />
            </button>
          )}
          {!readOnly && onRemove && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onRemove(item);
              }}
              className="size-7.5 rounded-full bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 dark:bg-red-950/90 dark:hover:bg-red-900 dark:border-red-800/60 dark:text-red-200 flex items-center justify-center transition-all active:scale-95 cursor-pointer shadow-xs"
              title="Remove file"
              aria-label="Remove file"
            >
              <Cancel01Icon size="1em" className="text-xs" />
            </button>
          )}
        </div>
      </div>

      {/* Metadata Section */}
      <div className="px-1 pt-2 pb-0.5 min-w-0">
        <p className="text-xs font-semibold text-gray-900 dark:text-zinc-100 truncate block" title={filename}>
          {filename}
        </p>
        <p className="text-[11px] text-gray-500 dark:text-zinc-400 font-normal mt-0.5 truncate block">
          {formatConfig.extLabel} · {formatFileSize(size)}
        </p>

        {/* Optional Category Dropdown or Tag */}
        {categories && categories.length > 0 && !readOnly ? (
          <div className="mt-2 w-full" onClick={(e) => e.stopPropagation()}>
            <Select placeholder="Select category"
              value={item?.attachmentType || categories[0]?.value || ""}
              onChange={(e) => onCategoryChange && onCategoryChange(item, e.target.value)}
              className="h-7 w-full rounded-lg border border-gray-200 dark:border-white/10 bg-gray-50/80 hover:bg-gray-100/70 dark:bg-zinc-800 text-[11px] font-medium text-gray-700 dark:text-zinc-200 px-2 py-0 shadow-none focus-visible:outline-none focus-visible:border-pup-maroon focus-visible:ring-1 focus-visible:ring-pup-maroon dark:focus-visible:border-red-500/80 dark:focus-visible:ring-red-500/80 cursor-pointer"
              usePortal={true}
              aria-label={`Category for ${filename}`}
            >
              {categories.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </Select>
          </div>
        ) : categoryLabel ? (
          <div className="mt-1.5 flex items-center">
            <span className={cn(BADGE_BASE, BADGE_PALETTES.slate, "truncate")}>
              {categoryLabel}
            </span>
          </div>
        ) : null}
      </div>
    </motion.div>
  );
}

/**
 * UploadProgressCard
 * Replicates the visual design from user reference media_1792608311147.png adapted for light & dark mode:
 * - Horizontal rounded container with crisp card border and light background (dark in dark mode)
 * - Squircle icon with tinted background on left
 * - Filename with sleek progress bar track below
 * - Percentage label on right
 */
export function UploadProgressCard({
  filename,
  progress = 0,
  mimeType = "",
  onCancel,
  className = "",
}) {
  const formatConfig = useMemo(() => getFileFormatConfig(filename, mimeType), [filename, mimeType]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ type: "spring", stiffness: 100, damping: 20 }}
      className={cn(
        "w-full rounded-xl border border-black/[0.08] dark:border-white/10 bg-white dark:bg-zinc-900 p-3 flex items-center gap-3 shadow-xs text-gray-900 dark:text-zinc-100",
        className
      )}
    >
      {/* Squircle Icon Badge */}
      <div className="size-9 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center shrink-0">
        <Image01Icon size="1em"
          className={cn(
            "text-base",
            formatConfig.isImage ? "text-emerald-600 dark:text-emerald-400" : formatConfig.iconClass
          )}
        />
      </div>

      {/* Center: Filename + Progress Bar */}
      <div className="flex-1 min-w-0">
        <p className="text-xs sm:text-sm font-medium text-gray-900 dark:text-zinc-100 truncate block">
          {filename}
        </p>
        <div className="h-1.5 w-full rounded-full bg-black/[0.06] dark:bg-white/10 overflow-hidden mt-1.5">
          <div
            className="h-full bg-emerald-500 rounded-full transition-all duration-300 ease-out"
            style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
          />
        </div>
      </div>

      {/* Right: Percentage & optional Cancel */}
      <div className="flex items-center gap-2 shrink-0">
        <span className="font-sans tabular-nums text-xs text-gray-500 dark:text-zinc-400 font-medium">
          {Math.round(progress)}%
        </span>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="w-5 h-5 rounded-md hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-400 hover:text-red-500 dark:text-zinc-400 dark:hover:text-red-400 flex items-center justify-center transition-colors cursor-pointer"
            title="Cancel"
            aria-label="Cancel"
          >
            <Cancel01Icon size="1em" className="text-xs" />
          </button>
        )}
      </div>
    </motion.div>
  );
}

/**
 * FileAttachmentDropzone
 * Primary component unifying drag-and-drop empty states, simulated or real upload progress,
 * and attached file preview cards.
 */
export default function FileAttachmentDropzone({
  value,
  onChange,
  mode = "single", // "single" | "multiple"
  accept = ".pdf,.png,.jpg,.jpeg,.webp",
  maxFiles = 5,
  maxSizeBytes = 10 * 1024 * 1024, // 10 MB default
  title,
  subtitle,
  heading,
  categories = null,
  onPreview = null,
  readOnly = false,
  invalid = false,
  animateCards = true,
  simulateProgress = true,
  isUploading = false,
  uploadProgress = null,
  className = "",
  onError = null,
  showToast = null,
}) {
  const inputRef = useRef(null);
  const dragCounter = useRef(0);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState([]);

  // Toast / notification helper
  const notify = useCallback(
    (title, description, isError = false) => {
      if (typeof showToast === "function") {
        showToast({ title, description }, isError);
      } else if (isError) {
        toast.error(title, { description });
      } else {
        toast.warning(title, { description });
      }
    },
    [showToast]
  );

  // Normalize items array
  const items = useMemo(() => {
    if (!value) return [];
    if (Array.isArray(value)) return value;
    return [value];
  }, [value]);

  const isFull = mode === "single" ? items.length >= 1 : items.length >= maxFiles;

  // Process incoming files from drop or file dialog
  const processFiles = useCallback(
    (fileList) => {
      const incoming = Array.from(fileList || []);
      if (!incoming.length) return;

      const remainingSlots = mode === "single" ? 1 : Math.max(0, maxFiles - items.length);
      if (remainingSlots <= 0) {
        notify(
          "Attachment Limit Reached",
          `You have reached the maximum limit of ${maxFiles} file${maxFiles === 1 ? "" : "s"}.`,
          true
        );
        return;
      }

      const oversizedFiles = [];
      const invalidTypeFiles = [];
      const validFiles = [];

      incoming.forEach((file) => {
        if (!file) return;
        // Validate file size
        if (maxSizeBytes && file.size > maxSizeBytes) {
          oversizedFiles.push(file);
          return;
        }
        // Validate file format
        if (accept && !isFileAccepted(file, accept)) {
          invalidTypeFiles.push(file);
          return;
        }
        validFiles.push(file);
      });

      if (oversizedFiles.length > 0) {
        const limitStr = formatFileSize(maxSizeBytes);
        if (oversizedFiles.length === 1) {
          notify(
            "File Too Large",
            `"${oversizedFiles[0].name}" (${formatFileSize(oversizedFiles[0].size)}) exceeds the ${limitStr} limit.`,
            true
          );
        } else {
          notify(
            "Files Too Large",
            `${oversizedFiles.length} files exceed the ${limitStr} limit.`,
            true
          );
        }
        onError?.({
          type: "FILE_TOO_LARGE",
          files: oversizedFiles,
          maxSizeBytes,
        });
      }

      if (invalidTypeFiles.length > 0) {
        const cleanAccept = accept.split(",").map((s) => s.trim()).join(", ");
        if (invalidTypeFiles.length === 1) {
          notify(
            "Unsupported File Format",
            `"${invalidTypeFiles[0].name}" is not supported. Supported: ${cleanAccept}`,
            true
          );
        } else {
          notify(
            "Unsupported File Formats",
            `${invalidTypeFiles.length} files are not supported. Supported: ${cleanAccept}`,
            true
          );
        }
        onError?.({
          type: "INVALID_FILE_TYPE",
          files: invalidTypeFiles,
          accept,
        });
      }

      if (validFiles.length === 0) return;

      if (validFiles.length > remainingSlots) {
        notify(
          "Attachment Limit Exceeded",
          `Only ${remainingSlots} of the ${validFiles.length} valid file${validFiles.length === 1 ? "" : "s"} could be attached (maximum ${maxFiles} allowed).`,
          true
        );
      }

      const acceptedFiles = validFiles.slice(0, remainingSlots);
      if (!acceptedFiles.length) return;

      const detectCategory = (filename) => {
        const nameLower = (filename || "").toLowerCase();
        if (categories && categories.length > 0) {
          if (
            (nameLower.includes("id") || nameLower.includes("valid") || nameLower.includes("passport") || nameLower.includes("license")) &&
            categories.some((c) => c.value === "valid_id")
          ) {
            return "valid_id";
          }
          if (
            (nameLower.includes("spa") || nameLower.includes("auth") || nameLower.includes("power")) &&
            categories.some((c) => c.value === "spa")
          ) {
            return "spa";
          }
          if (
            (nameLower.includes("receipt") || nameLower.includes("pay") || nameLower.includes("proof")) &&
            categories.some((c) => c.value === "receipt")
          ) {
            return "receipt";
          }
          if (nameLower.includes("clearance") && categories.some((c) => c.value === "clearance")) {
            return "clearance";
          }
          return categories[0].value;
        }
        return "evidence";
      };

      if (!simulateProgress) {
        // Immediate attach
        const newItems = acceptedFiles.map((file) => ({
          id: Math.random().toString(36).slice(2, 9),
          file,
          attachmentType: detectCategory(file.name),
        }));
        if (mode === "single") {
          onChange?.(newItems[0] || null);
        } else {
          onChange?.([...items, ...newItems]);
        }
        return;
      }

      // Smooth simulated upload progress (0% -> 100% over ~450ms)
      const batch = acceptedFiles.map((file) => ({
        id: Math.random().toString(36).slice(2, 9),
        file,
        filename: file.name,
        mimeType: file.type,
        progress: 12,
        attachmentType: detectCategory(file.name),
      }));

      setUploadingFiles((prev) => [...prev, ...batch]);

      batch.forEach((entry) => {
        let currentProg = 12;
        const interval = setInterval(() => {
          currentProg += Math.floor(Math.random() * 24) + 15;
          if (currentProg >= 100) {
            currentProg = 100;
            clearInterval(interval);

            // Remove from uploading list and commit to attached items
            setTimeout(() => {
              setUploadingFiles((prev) => prev.filter((p) => p.id !== entry.id));
              const committedItem = {
                id: entry.id,
                file: entry.file,
                attachmentType: entry.attachmentType,
              };

              if (mode === "single") {
                onChange?.(committedItem);
              } else {
                onChange?.((prevItems) => {
                  const current = Array.isArray(prevItems) ? prevItems : [];
                  return [...current, committedItem];
                });
              }
            }, 180);
          } else {
            setUploadingFiles((prev) =>
              prev.map((p) => (p.id === entry.id ? { ...p, progress: currentProg } : p))
            );
          }
        }, 80);
      });
    },
    [accept, categories, items, maxFiles, maxSizeBytes, mode, notify, onChange, onError, simulateProgress]
  );

  // Drag and drop events
  const handleDragEnter = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current += 1;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current -= 1;
    if (dragCounter.current <= 0) {
      dragCounter.current = 0;
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounter.current = 0;
      setIsDragging(false);
      if (readOnly) return;
      if (isFull) {
        notify(
          "Attachment Limit Reached",
          `You have reached the maximum limit of ${maxFiles} file${maxFiles === 1 ? "" : "s"}.`,
          true
        );
        return;
      }

      const files = e.dataTransfer?.files;
      if (files && files.length > 0) {
        processFiles(files);
      }
    },
    [isFull, maxFiles, notify, processFiles, readOnly]
  );

  const handleFileInputChange = useCallback(
    (e) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        processFiles(files);
      }
      e.target.value = "";
    },
    [processFiles]
  );

  const handleRemoveItem = useCallback(
    (target) => {
      if (readOnly) return;
      if (mode === "single") {
        onChange?.(null);
      } else {
        const next = items.filter((item) => (item.id || item) !== (target.id || target));
        onChange?.(next);
      }
    },
    [items, mode, onChange, readOnly]
  );

  const handleRemoveAll = useCallback(() => {
    if (readOnly) return;
    setUploadingFiles([]);
    if (inputRef.current) {
      inputRef.current.value = "";
    }
    onChange?.(mode === "single" ? null : []);
  }, [mode, onChange, readOnly]);

  const handleCategoryChange = useCallback(
    (target, newCat) => {
      if (readOnly) return;
      if (mode === "single") {
        onChange?.({ ...value, attachmentType: newCat });
      } else {
        const next = items.map((item) =>
          (item.id || item) === (target.id || target) ? { ...item, attachmentType: newCat } : item
        );
        onChange?.(next);
      }
    },
    [items, mode, onChange, readOnly, value]
  );

  const removeAllButton = mode === "multiple" && !readOnly && items.length > 1 && (
    <Button type="button" size="xs" variant="destructive" onClick={handleRemoveAll}>
      Remove All Files
    </Button>
  );

  const attachmentHeader = heading && (
    <div className="flex flex-wrap items-center justify-between gap-2">
      {heading}
      {mode === "multiple" && (
        <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
          <span className={cn(SETTINGS_STATUS_PILL_SM, "font-semibold tabular-nums text-gray-900 dark:text-zinc-100")}>
            <Files01Icon size={12} aria-hidden="true" />
            {items.length}/{maxFiles} files
          </span>
          {removeAllButton}
        </div>
      )}
    </div>
  );

  // Real upload progress display (when parent manages uploading state)
  if (isUploading && uploadProgress !== null) {
    const singleName = items[0]?.file?.name || items[0]?.original_filename || "Uploading file...";
    return (
      <div className={cn(heading ? "space-y-2" : "space-y-3", className)}>
        {attachmentHeader}
        <UploadProgressCard
          filename={singleName}
          progress={uploadProgress}
          mimeType={items[0]?.file?.type || items[0]?.mime_type}
        />
      </div>
    );
  }

  const hasContent = items.length > 0 || uploadingFiles.length > 0;

  return (
    <div data-slot="attachment-field" aria-invalid={invalid || undefined} className={cn(heading ? "space-y-2" : "space-y-3", invalid && "rounded-2xl", className)}>
      {attachmentHeader}
      {/* Hidden File Input */}
      {!readOnly && (
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={mode === "multiple"}
          className="hidden"
          onChange={handleFileInputChange}
        />
      )}

      {/* 1. Empty State Dropzone */}
      {!hasContent && !readOnly && (
        <div
          onClick={() => inputRef.current?.click()}
          onDragOver={handleDragOver}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              inputRef.current?.click();
            }
          }}
          className={cn(
            "group relative flex flex-col items-center justify-center rounded-[20px] border border-dashed p-6 sm:p-7 text-center transition-all cursor-pointer select-none",
            isDragging
              ? "border-pup-maroon/70 bg-pup-maroon/[0.04] ring-4 ring-pup-maroon/10 dark:border-red-400/80 dark:bg-red-950/25 dark:ring-red-500/15 scale-[1.01]"
              : "border-black/15 hover:border-black/25 bg-black/[0.015] hover:bg-black/[0.03] dark:border-white/15 dark:hover:border-white/25 dark:bg-white/[0.015] dark:hover:bg-white/[0.03]"
          )}
        >
          <div
            className={cn(
              "size-12 rounded-2xl flex items-center justify-center mb-2.5 transition-all duration-200 group-hover:scale-105 shadow-2xs border",
              isDragging
                ? "bg-pup-maroon text-white border-pup-maroon scale-110 shadow-md"
                : "bg-black/[0.04] text-gray-700 border-black/[0.04] dark:bg-white/[0.08] dark:text-zinc-200 dark:border-white/[0.08]"
            )}
          >
            <CloudUploadIcon size="1em" className="text-2xl" />
          </div>
          <p className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-zinc-100">
            {isDragging ? "Drop files to attach" : title || "Drag & drop files here, or browse"}
          </p>
          <p className="mt-1 text-[11px] text-gray-500 dark:text-zinc-400 max-w-sm">
            {subtitle ||
              `Supports ${accept ? accept.split(",").join(", ") : "PDF, PNG, JPG, or WEBP"} up to ${formatFileSize(
                maxSizeBytes
              )}`}
          </p>
        </div>
      )}

      {/* 2. Uploading Progress Bars */}
      <AnimatePresence>
        {uploadingFiles.length > 0 && (
          <div className="space-y-2">
            {uploadingFiles.map((up) => (
              <UploadProgressCard
                key={up.id}
                filename={up.filename}
                progress={up.progress}
                mimeType={up.mimeType}
                onCancel={() => {
                  setUploadingFiles((prev) => prev.filter((p) => p.id !== up.id));
                }}
              />
            ))}
          </div>
        )}
      </AnimatePresence>

      {/* 3. Attached Cards Grid */}
      {items.length > 0 && (
        <div className="space-y-2.5">
          <div className="flex flex-wrap items-start gap-3">
            <AnimatePresence>
              {items.map((item, idx) => (
                <AttachedFileCard
                  key={item?.id || idx}
                  item={item}
                  onRemove={handleRemoveItem}
                  onPreview={onPreview}
                  readOnly={readOnly}
                  animateLayout={animateCards}
                  categories={categories}
                  onCategoryChange={handleCategoryChange}
                />
              ))}
            </AnimatePresence>
          </div>

          {/* Bottom action bar in multiple mode: Add more files trigger + Remove All Files action */}
          {mode === "multiple" && !readOnly && (!isFull || (!heading && removeAllButton)) && (
            <div className={cn("flex items-center gap-2.5", isFull && "justify-end")}>
              {!isFull && (
                <div
                  onClick={() => inputRef.current?.click()}
                  onDragOver={handleDragOver}
                  onDragEnter={handleDragEnter}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      inputRef.current?.click();
                    }
                  }}
                  className={cn(
                    "flex flex-1 items-center justify-center gap-2 rounded-xl border border-dashed py-2.5 px-4 text-center transition-all cursor-pointer select-none",
                    isDragging
                      ? "border-pup-maroon/70 bg-pup-maroon/[0.04] ring-2 ring-pup-maroon/10 dark:border-red-400 dark:bg-red-950/20"
                      : "border-black/15 hover:border-black/25 bg-black/[0.015] hover:bg-black/[0.03] dark:border-white/15 dark:hover:border-white/25 dark:bg-white/[0.015] dark:hover:bg-white/[0.03]"
                  )}
                >
                  <Add01Icon size="1em" className="text-xs text-pup-maroon dark:text-red-400" />
                  <span className="text-xs font-semibold text-gray-700 dark:text-zinc-300 tabular-nums">
                    {isDragging
                      ? "Drop files to attach"
                      : `Add more files (${maxFiles - items.length} remaining)`}
                  </span>
                </div>
              )}

              {!heading && removeAllButton}
            </div>
          )}
        </div>
      )}

      {/* Read-only empty state */}
      {readOnly && items.length === 0 && (
        <EmptyState variant="compact" icon={Attachment01Icon} title="No Files Attached" />
      )}
    </div>
  );
}
