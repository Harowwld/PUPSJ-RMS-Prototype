"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import HugeIcon from "@/components/shared/HugeIcon";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/**
 * Standard Restore Modal with Safe Merge vs Full Overwrite Strategy
 * Follows Apple HIG standards, pre-flight table diff preview, and action-only word buttons.
 */
export default function RestoreModal({
  open,
  onOpenChange,
  restoreFile = null,
  backupId = null,
  backupFilename = null,
  title = "Restore Database Archive",
  description = "Inspect snapshot contents and choose how data merges with live records.",
  onConfirm,
  onCancel,
  isLoading = false,
}) {
  const [mode, setMode] = useState("merge"); // "merge" | "overwrite"
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [previewError, setPreviewError] = useState(null);

  const displayFilename = useMemo(() => {
    if (restoreFile?.name) return restoreFile.name;
    if (backupFilename) return backupFilename;
    if (previewData?.filename) return previewData.filename;
    return "backup-archive.zip.enc";
  }, [restoreFile, backupFilename, previewData]);

  // Fetch pre-flight diff inspection when modal opens
  useEffect(() => {
    let isSubscribed = true;

    if (open && (restoreFile || backupId)) {
      const runInspection = async () => {
        setPreviewLoading(true);
        setPreviewError(null);
        try {
          let res;
          if (restoreFile) {
            const formData = new FormData();
            formData.append("file", restoreFile);
            formData.append("action", "preview");
            res = await fetch("/api/system/backup/restore?preview=1", {
              method: "POST",
              body: formData,
            });
          } else if (backupId) {
            res = await fetch("/api/system/backup/restore?preview=1", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ backupId, action: "preview" }),
            });
          }

          const json = await res?.json().catch(() => null);
          if (!isSubscribed) return;
          if (!res?.ok || !json?.ok) {
            throw new Error(json?.error || "Could not inspect backup contents.");
          }
          setPreviewData(json.data);
        } catch (err) {
          if (!isSubscribed) return;
          console.warn("[RestoreModal] Preview inspection failed:", err.message);
          setPreviewError(err.message);
        } finally {
          if (isSubscribed) setPreviewLoading(false);
        }
      };

      runInspection();
    }

    return () => {
      isSubscribed = false;
    };
  }, [open, restoreFile, backupId]);

  const handleConfirmAction = () => {
    onConfirm?.(mode);
  };

  const handleCancelAction = () => {
    if (isLoading) return;
    setMode("merge");
    setPreviewData(null);
    setPreviewError(null);
    onCancel?.();
    onOpenChange?.(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleCancelAction}>
      <DialogContent className="sm:max-w-xl p-0 overflow-hidden bg-white border border-gray-200 shadow-2xl rounded-2xl dark:bg-card dark:border-white/10 gap-0">
        {/* Header */}
        <DialogHeader className="bg-white p-6 pb-0 dark:bg-card border-none text-left">
          <div className="flex items-start gap-3.5">
            <div
              className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors shadow-2xs",
                mode === "merge"
                  ? "bg-emerald-50 text-emerald-600 border border-emerald-200/80 dark:bg-emerald-950/40 dark:border-emerald-800/40 dark:text-emerald-400"
                  : "bg-red-50 text-red-600 border border-red-200/80 dark:bg-red-950/40 dark:border-red-800/40 dark:text-red-400"
              )}
            >
              <HugeIcon
                className={cn(
                  "text-[20px]",
                  mode === "merge"
                    ? "ph-duotone ph-git-merge"
                    : "ph-duotone ph-warning-octagon"
                )}
              />
            </div>
            <div className="min-w-0 flex-1">
              <DialogTitle className="text-[17px] font-semibold tracking-[-0.01em] text-gray-900 dark:text-zinc-50">
                {title}
              </DialogTitle>
              <DialogDescription className="mt-1 text-[13px] font-normal text-gray-500 dark:text-zinc-400 leading-relaxed">
                {description}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Content Body */}
        <div className="p-6 space-y-4">
          {/* File Summary Badge */}
          <div className="flex items-center justify-between px-3.5 py-2.5 rounded-xl border border-gray-200/80 bg-gray-50/70 dark:border-white/10 dark:bg-zinc-900/40">
            <div className="flex items-center gap-2.5 min-w-0">
              <HugeIcon className="ph-duotone ph-file-zip text-[18px] text-gray-400 dark:text-zinc-500 shrink-0" />
              <span className="text-xs font-semibold text-gray-800 dark:text-zinc-200 truncate font-mono">
                {displayFilename}
              </span>
            </div>
            {previewData?.totalArchiveFiles !== undefined && (
              <span className="text-[11px] font-medium text-gray-500 dark:text-zinc-400 shrink-0">
                {previewData.totalArchiveFiles} files
              </span>
            )}
          </div>

          {/* Restoration Strategy Segmented Control */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-medium uppercase tracking-[0.04em] text-gray-500 dark:text-zinc-400">
              Restoration Strategy
            </label>
            <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-gray-100/80 dark:bg-zinc-800/60 border border-gray-200/60 dark:border-white/5">
              <button
                type="button"
                onClick={() => setMode("merge")}
                className={cn(
                  "p-3 rounded-lg text-left transition-all cursor-pointer select-none active:scale-[0.99]",
                  mode === "merge"
                    ? "bg-white dark:bg-zinc-700 text-gray-900 dark:text-white shadow-xs ring-1 ring-black/5 dark:ring-white/10"
                    : "text-gray-600 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white"
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold">Safe Merge</span>
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200/60 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/40">
                    Recommended
                  </span>
                </div>
                <p className="text-[11px] text-gray-500 dark:text-zinc-400 mt-1 leading-normal">
                  Keep modern records; only restore missing data from archive.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setMode("overwrite")}
                className={cn(
                  "p-3 rounded-lg text-left transition-all cursor-pointer select-none active:scale-[0.99]",
                  mode === "overwrite"
                    ? "bg-white dark:bg-zinc-700 text-gray-900 dark:text-white shadow-xs ring-1 ring-black/5 dark:ring-white/10"
                    : "text-gray-600 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white"
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold">Full Overwrite</span>
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-red-50 text-red-700 border border-red-200/60 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800/40">
                    Disaster Rollback
                  </span>
                </div>
                <p className="text-[11px] text-gray-500 dark:text-zinc-400 mt-1 leading-normal">
                  Replace live database entirely. Records added after will be erased.
                </p>
              </button>
            </div>
          </div>

          {/* Table Diff Preview */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-medium uppercase tracking-[0.04em] text-gray-500 dark:text-zinc-400">
                Data Impact Preview
              </label>
              {previewLoading && (
                <span className="text-[11px] text-gray-400 dark:text-zinc-500 flex items-center gap-1">
                  <HugeIcon className="ph-bold ph-spinner animate-spin text-[12px]" />
                  Inspecting snapshot...
                </span>
              )}
            </div>

            <div className="rounded-xl border border-gray-200/80 dark:border-white/10 overflow-hidden bg-white dark:bg-card">
              {previewLoading ? (
                <div className="p-4 space-y-2">
                  <Skeleton className="h-6 w-full rounded-md" />
                  <Skeleton className="h-6 w-full rounded-md" />
                  <Skeleton className="h-6 w-full rounded-md" />
                </div>
              ) : previewError ? (
                <div className="p-4 text-center">
                  <p className="text-xs text-amber-600 dark:text-amber-400">
                    Pre-flight inspection unavailable: {previewError}
                  </p>
                  <p className="text-[11px] text-gray-400 dark:text-zinc-500 mt-0.5">
                    Restoration can still proceed normally with safety snapshot.
                  </p>
                </div>
              ) : previewData?.tables && previewData.tables.length > 0 ? (
                <div className="max-h-40 overflow-y-auto custom-scrollbar">
                  <table className="min-w-full text-xs">
                    <thead className="bg-gray-50/80 dark:bg-zinc-800/50 border-b border-gray-100 dark:border-white/10 sticky top-0">
                      <tr className="text-left text-[11px] font-medium text-gray-500 dark:text-zinc-400">
                        <th className="py-2 px-3 font-medium">Resource</th>
                        <th className="py-2 px-3 font-medium text-center">Live</th>
                        <th className="py-2 px-3 font-medium text-center">In Backup</th>
                        <th className="py-2 px-3 font-medium text-right">Net Impact</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                      {previewData.tables.map((t) => {
                        const delta = Number(t.delta || 0);
                        const isSafeMerge = mode === "merge";

                        return (
                          <tr key={t.name} className="hover:bg-gray-50/50 dark:hover:bg-zinc-800/30">
                            <td className="py-2 px-3 font-medium text-gray-800 dark:text-zinc-200 font-mono">
                              {t.name}
                            </td>
                            <td className="py-2 px-3 text-center text-gray-600 dark:text-zinc-400">
                              {t.liveRows}
                            </td>
                            <td className="py-2 px-3 text-center text-gray-600 dark:text-zinc-400">
                              {t.backupRows}
                            </td>
                            <td className="py-2 px-3 text-right">
                              {isSafeMerge ? (
                                delta > 0 ? (
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                                    +{delta} missing restored
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-gray-100 text-gray-600 dark:bg-zinc-800 dark:text-zinc-400">
                                    {t.liveRows} preserved
                                  </span>
                                )
                              ) : delta < 0 ? (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300">
                                  {Math.abs(delta)} modern erased
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-gray-100 text-gray-600 dark:bg-zinc-800 dark:text-zinc-400">
                                  {t.backupRows} restored
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-4 text-center text-xs text-gray-500 dark:text-zinc-400">
                  Ready to restore. Relational tables will be validated upon confirmation.
                </div>
              )}
            </div>
          </div>

          {/* Zero-Loss Safety Snapshot Callout */}
          <div className="flex items-center gap-2.5 p-3 rounded-xl bg-blue-50/70 border border-blue-200/60 dark:bg-blue-950/30 dark:border-blue-800/40">
            <HugeIcon className="ph-duotone ph-shield-check text-[18px] text-blue-600 dark:text-blue-400 shrink-0" />
            <p className="text-xs text-blue-800 dark:text-blue-300">
              <span className="font-semibold">Zero-Loss Safety:</span> An automated Pre-Restore Safety Snapshot of current data is created before changes are applied.
            </p>
          </div>
        </div>

        {/* Footer with Action-Word Only Buttons */}
        <DialogFooter className="p-6 pt-4 bg-white dark:bg-card border-t border-gray-100 dark:border-white/10 flex items-center justify-end gap-2.5">
          <Button
            type="button"
            variant="outline"
            onClick={handleCancelAction}
            disabled={isLoading}
            className="h-10 px-5 text-xs font-semibold rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-xs cursor-pointer active:scale-95 transition-all"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleConfirmAction}
            disabled={isLoading || previewLoading}
            className={cn(
              "h-10 px-5 text-xs font-semibold rounded-xl! shadow-xs active:scale-95 transition-all cursor-pointer border-0 text-white",
              mode === "merge"
                ? "bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800"
                : "bg-red-600 hover:bg-red-700 active:bg-red-800"
            )}
          >
            {isLoading ? "Processing..." : mode === "merge" ? "Merge" : "Overwrite"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
