"use client";

import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import HugeIcon from "@/components/shared/HugeIcon";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";

/**
 * Formats bytes into clean human-readable strings (e.g. 111 KB, 12 MB)
 */
export function formatFileSize(bytes) {
  if (!bytes || isNaN(bytes) || bytes <= 0) return "0 KB";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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
      iconClass: "ph-bold ph-file-pdf text-red-500",
      accentColor: "#dc2626",
      isImage: false,
    };
  }
  if (["doc", "docx"].includes(ext) || mime.includes("word") || mime.includes("officedocument.wordprocessingml")) {
    return {
      extLabel: "DOCX",
      badgeBg: "bg-[#2563eb] text-white",
      iconClass: "ph-bold ph-file-doc text-blue-500",
      accentColor: "#2563eb",
      isImage: false,
    };
  }
  if (["xls", "xlsx", "csv"].includes(ext) || mime.includes("spreadsheet") || mime.includes("csv")) {
    return {
      extLabel: ext.toUpperCase() || "XLSX",
      badgeBg: "bg-[#16a34a] text-white",
      iconClass: "ph-bold ph-file-xls text-emerald-500",
      accentColor: "#16a34a",
      isImage: false,
    };
  }
  if (["png", "jpg", "jpeg", "webp", "svg", "gif"].includes(ext) || mime.startsWith("image/")) {
    return {
      extLabel: ext.toUpperCase() || "IMG",
      badgeBg: "bg-[#0d9488] text-white",
      iconClass: "ph-bold ph-image text-teal-400",
      accentColor: "#0d9488",
      isImage: true,
    };
  }
  if (["zip", "rar", "7z", "enc", "bak", "backup", "pupbak"].includes(ext) || mime.includes("zip") || mime.includes("tar")) {
    return {
      extLabel: ext.toUpperCase() || "ZIP",
      badgeBg: "bg-amber-600 text-white",
      iconClass: "ph-bold ph-archive text-amber-500",
      accentColor: "#d97706",
      isImage: false,
    };
  }

  return {
    extLabel: ext.toUpperCase() || "FILE",
    badgeBg: "bg-slate-600 dark:bg-zinc-700 text-white",
    iconClass: "ph-bold ph-file text-slate-500 dark:text-zinc-400",
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

  const imageUrl = item?.url || previewBlobUrl;

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
      layout
      initial={{ opacity: 0, scale: 0.95, y: 4 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.15 } }}
      transition={{ type: "spring", stiffness: 100, damping: 20 }}
      className={cn(
        "group relative flex flex-col w-44 sm:w-48 shrink-0 rounded-2xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-gray-900 dark:text-zinc-100 shadow-xs hover:border-gray-300 dark:hover:border-zinc-700 hover:shadow-sm p-2 transition-all select-none",
        className
      )}
    >
      {/* Top Preview Container */}
      <div
        onClick={() => onPreview && onPreview(item)}
        className={cn(
          "relative h-24 w-full rounded-xl bg-gray-50/90 dark:bg-zinc-950/80 border border-gray-200/80 dark:border-zinc-800/60 p-3 flex flex-col justify-center gap-1.5 overflow-hidden",
          onPreview ? "cursor-pointer" : "cursor-default"
        )}
      >
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt={filename}
            className="w-full h-full object-cover rounded-lg"
          />
        ) : (
          /* Document skeleton lines */
          <div className="flex flex-col gap-1.5 w-full pointer-events-none opacity-90">
            <div className="h-2 w-7/12 rounded-xs bg-gray-300/80 dark:bg-zinc-700/60" />
            <div className="h-1.5 w-11/12 rounded-xs bg-gray-200/90 dark:bg-zinc-800/80" />
            <div className="h-1.5 w-10/12 rounded-xs bg-gray-200/90 dark:bg-zinc-800/80" />
            <div className="h-1.5 w-8/12 rounded-xs bg-gray-200/90 dark:bg-zinc-800/80" />
          </div>
        )}

        {/* Extension Pill Badge at Bottom-Right */}
        <span
          className={cn(
            "absolute bottom-2 right-2 text-[10px] font-bold px-1.5 py-0.5 rounded shadow-xs tracking-tight uppercase select-none z-10",
            formatConfig.badgeBg
          )}
        >
          {formatConfig.extLabel}
        </span>

        {/* Interactive Hover Action Overlay */}
        <div className="absolute inset-0 bg-gray-900/40 dark:bg-black/50 backdrop-blur-xs opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 z-20">
          {onPreview && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onPreview(item);
              }}
              className="w-7 h-7 rounded-lg bg-white/95 hover:bg-white text-gray-800 dark:bg-zinc-800/90 dark:hover:bg-zinc-700 dark:text-zinc-200 flex items-center justify-center transition-all active:scale-95 cursor-pointer shadow-xs border border-gray-200/50 dark:border-zinc-700/50"
              title="Preview file"
              aria-label="Preview file"
            >
              <HugeIcon className="ph-bold ph-eye text-xs" />
            </button>
          )}
          {downloadUrl && (
            <a
              href={downloadUrl}
              download={filename}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="w-7 h-7 rounded-lg bg-white/95 hover:bg-white text-gray-800 dark:bg-zinc-800/90 dark:hover:bg-zinc-700 dark:text-zinc-200 flex items-center justify-center transition-all active:scale-95 cursor-pointer shadow-xs border border-gray-200/50 dark:border-zinc-700/50"
              title="Download file"
              aria-label="Download file"
            >
              <HugeIcon className="ph-bold ph-download-simple text-xs" />
            </a>
          )}
          {!readOnly && onRemove && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onRemove(item);
              }}
              className="w-7 h-7 rounded-lg bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 dark:bg-red-950/80 dark:hover:bg-red-900 dark:border-red-800/50 dark:text-red-200 flex items-center justify-center transition-all active:scale-95 cursor-pointer shadow-xs"
              title="Remove file"
              aria-label="Remove file"
            >
              <HugeIcon className="ph-bold ph-x text-xs" />
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
            <Select
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
            <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 border border-gray-200 dark:border-zinc-700/60 truncate">
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
        "w-full rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-3 flex items-center gap-3 shadow-xs text-gray-900 dark:text-zinc-100",
        className
      )}
    >
      {/* Squircle Icon Badge */}
      <div className="w-9 h-9 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/40 flex items-center justify-center shrink-0">
        <HugeIcon
          className={cn(
            "text-base",
            formatConfig.isImage ? "ph-bold ph-image text-emerald-600 dark:text-emerald-400" : formatConfig.iconClass
          )}
        />
      </div>

      {/* Center: Filename + Progress Bar */}
      <div className="flex-1 min-w-0">
        <p className="text-xs sm:text-sm font-medium text-gray-900 dark:text-zinc-100 truncate block">
          {filename}
        </p>
        <div className="h-1.5 w-full rounded-full bg-gray-100 dark:bg-zinc-800 overflow-hidden mt-1.5">
          <div
            className="h-full bg-emerald-500 rounded-full transition-all duration-300 ease-out"
            style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
          />
        </div>
      </div>

      {/* Right: Percentage & optional Cancel */}
      <div className="flex items-center gap-2 shrink-0">
        <span className="font-mono text-xs text-gray-500 dark:text-zinc-400 font-medium">
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
            <HugeIcon className="ph-bold ph-x text-xs" />
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
  categories = null,
  onPreview = null,
  readOnly = false,
  simulateProgress = true,
  isUploading = false,
  uploadProgress = null,
  className = "",
}) {
  const inputRef = useRef(null);
  const dragCounter = useRef(0);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState([]);

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
      const acceptedFiles = incoming.slice(0, remainingSlots);

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
    [categories, items, maxFiles, mode, onChange, simulateProgress]
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
      if (readOnly || isFull) return;

      const files = e.dataTransfer?.files;
      if (files && files.length > 0) {
        processFiles(files);
      }
    },
    [isFull, processFiles, readOnly]
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

  // Real upload progress display (when parent manages uploading state)
  if (isUploading && uploadProgress !== null) {
    const singleName = items[0]?.file?.name || items[0]?.original_filename || "Uploading file...";
    return (
      <div className={cn("space-y-3", className)}>
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
    <div className={cn("space-y-3", className)}>
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
            "group relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-6 sm:p-7 text-center transition-all cursor-pointer select-none",
            isDragging
              ? "border-pup-maroon bg-pup-maroon/5 ring-4 ring-pup-maroon/10 dark:border-red-500 dark:bg-red-950/20 scale-[1.005]"
              : "border-gray-300 hover:border-gray-400 bg-gray-50/50 hover:bg-gray-50/90 dark:border-zinc-700/80 dark:hover:border-zinc-600 dark:bg-zinc-900/30 dark:hover:bg-zinc-900/60"
          )}
        >
          <div
            className={cn(
              "w-12 h-12 rounded-2xl flex items-center justify-center mb-2.5 transition-transform duration-200 group-hover:scale-105 shadow-xs border",
              isDragging
                ? "bg-pup-maroon text-white border-pup-maroon"
                : "bg-pup-maroon/10 text-pup-maroon border-pup-maroon/20 dark:bg-pup-maroon/20 dark:text-red-400 dark:border-red-500/30"
            )}
          >
            <HugeIcon className="ph-bold ph-cloud-arrow-up text-2xl" />
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
                  categories={categories}
                  onCategoryChange={handleCategoryChange}
                />
              ))}
            </AnimatePresence>
          </div>

          {/* Mini-dropzone / Add file trigger if not full in multiple mode */}
          {mode === "multiple" && !isFull && !readOnly && (
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
                "flex items-center justify-center gap-2 rounded-xl border-2 border-dashed py-2.5 px-4 text-center transition-all cursor-pointer select-none",
                isDragging
                  ? "border-pup-maroon bg-pup-maroon/5 ring-2 ring-pup-maroon/10 dark:border-red-400 dark:bg-red-950/20"
                  : "border-gray-200 hover:border-gray-300 bg-gray-50/40 hover:bg-gray-50/80 dark:border-zinc-800 dark:hover:border-zinc-700 dark:bg-zinc-900/20 dark:hover:bg-zinc-900/40"
              )}
            >
              <HugeIcon className="ph-bold ph-plus text-xs text-pup-maroon dark:text-red-400" />
              <span className="text-xs font-semibold text-gray-700 dark:text-zinc-300">
                {isDragging
                  ? "Drop files to attach"
                  : `Add more files (${maxFiles - items.length} remaining)`}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Read-only empty state */}
      {readOnly && items.length === 0 && (
        <div className="py-4 text-center text-xs text-gray-400 dark:text-zinc-500 italic">
          No files attached.
        </div>
      )}
    </div>
  );
}
