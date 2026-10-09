"use client";

import { useState, useEffect, useMemo } from "react";
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
      <DialogContent className="sm:max-w-2xl md:max-w-3xl w-full p-0 overflow-hidden bg-white border border-border shadow-2xl rounded-2xl dark:bg-card dark:border-border gap-0">
        {/* Header */}
        <DialogHeader className="bg-white p-6 pb-0 dark:bg-card border-none text-left">
          <div className="flex items-start gap-4">
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
          <div className="flex items-center justify-between px-4 py-3 rounded-xl border border-border/80 bg-gray-50/70 dark:border-border dark:bg-zinc-900/40">
            <div className="flex items-center gap-2.5 min-w-0">
              <HugeIcon className="ph-duotone ph-file-zip text-[18px] text-gray-400 dark:text-zinc-500 shrink-0" />
              <span className="text-xs font-semibold text-gray-800 dark:text-zinc-200 truncate font-mono">
                {displayFilename}
              </span>
            </div>
            {previewData?.totalArchiveFiles !== undefined && (
              <span className="text-[11px] font-medium text-gray-500 dark:text-zinc-400 shrink-0 font-mono">
                {previewData.totalArchiveFiles} files
              </span>
            )}
          </div>

          {/* Restoration Strategy Segmented Control */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-[0.05em] text-gray-500 dark:text-zinc-400">
              Restoration Strategy
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 p-1 rounded-xl bg-gray-100/80 dark:bg-zinc-800/60 border border-border/60 dark:border-border">
              <button
                type="button"
                onClick={() => setMode("merge")}
                className={cn(
                  "p-3.5 rounded-lg text-left transition-all cursor-pointer select-none active:scale-[0.99] border",
                  mode === "merge"
                    ? "bg-white dark:bg-zinc-700 text-gray-900 dark:text-white shadow-xs ring-1 ring-emerald-500/20 dark:ring-emerald-400/20 border-emerald-500/40"
                    : "border-transparent text-gray-600 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white"
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold">Safe Merge</span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/60 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/40">
                    Recommended
                  </span>
                </div>
                <p className="text-[11px] text-gray-500 dark:text-zinc-400 mt-1.5 leading-relaxed">
                  Keep modern records; only restore missing data from archive.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setMode("overwrite")}
                className={cn(
                  "p-3.5 rounded-lg text-left transition-all cursor-pointer select-none active:scale-[0.99] border",
                  mode === "overwrite"
                    ? "bg-white dark:bg-zinc-700 text-gray-900 dark:text-white shadow-xs ring-1 ring-red-500/20 dark:ring-red-400/20 border-red-500/40"
                    : "border-transparent text-gray-600 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white"
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold">Full Overwrite</span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200/60 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800/40">
                    Disaster Rollback
                  </span>
                </div>
                <p className="text-[11px] text-gray-500 dark:text-zinc-400 mt-1.5 leading-relaxed">
                  Replace live database entirely. Records added after will be erased.
                </p>
              </button>
            </div>
          </div>

          {/* Overwrite Warning Callout */}
          {mode === "overwrite" && (
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-50/70 border border-amber-200/60 dark:bg-amber-950/30 dark:border-amber-800/40">
              <HugeIcon className="ph-duotone ph-warning text-[17px] text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
                <span className="font-semibold">Destructive Action:</span> Live records in this partition will be permanently overwritten. Any new records created after this snapshot was taken will be lost.
              </p>
            </div>
          )}

          {/* Table Diff Preview */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-semibold uppercase tracking-[0.05em] text-gray-500 dark:text-zinc-400">
                Data Impact Preview
              </label>
              {previewLoading && (
                <span className="text-[11px] text-gray-400 dark:text-zinc-500 flex items-center gap-1 font-medium">
                  <HugeIcon className="ph-bold ph-spinner animate-spin text-[12px]" />
                  Inspecting snapshot...
                </span>
              )}
            </div>

            <div className="rounded-xl border border-border/80 dark:border-border overflow-hidden bg-white dark:bg-card shadow-2xs">
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
                <div className="max-h-48 overflow-y-auto custom-scrollbar">
                  <table className="min-w-full text-xs">
                    <thead className="bg-gray-50/80 dark:bg-zinc-800/50 border-b border-border dark:border-border sticky top-0">
                      <tr className="text-left text-[11px] font-medium text-gray-500 dark:text-zinc-400">
                        <th className="py-2.5 px-3.5 font-medium">Resource Table</th>
                        <th className="py-2.5 px-3.5 font-medium text-center">Live Count</th>
                        <th className="py-2.5 px-3.5 font-medium text-center">In Backup</th>
                        <th className="py-2.5 px-3.5 font-medium text-right">Net Impact</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border dark:divide-border">
                      {previewData.tables.map((t) => {
                        const delta = Number(t.delta || 0);
                        const isSafeMerge = mode === "merge";

                        return (
                          <tr key={t.name} className="hover:bg-gray-50/60 dark:hover:bg-zinc-800/40 transition-colors">
                            <td className="py-2.5 px-3.5 font-medium text-gray-800 dark:text-zinc-200 font-mono">
                              {t.name}
                            </td>
                            <td className="py-2.5 px-3.5 text-center text-gray-600 dark:text-zinc-400 font-mono">
                              {t.liveRows}
                            </td>
                            <td className="py-2.5 px-3.5 text-center text-gray-600 dark:text-zinc-400 font-mono">
                              {t.backupRows}
                            </td>
                            <td className="py-2.5 px-3.5 text-right">
                              {isSafeMerge ? (
                                delta > 0 ? (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/40">
                                    +{delta} missing restored
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-600 dark:bg-zinc-800 dark:text-zinc-400 border border-border">
                                    {t.liveRows} preserved
                                  </span>
                                )
                              ) : delta < 0 ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300 border border-red-200/60 dark:border-red-800/40">
                                  {Math.abs(delta)} modern erased
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/40">
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
        <DialogFooter className="p-6 pt-4 bg-gray-50/50 dark:bg-zinc-900/30 border-t border-border dark:border-border flex items-center justify-end gap-3">
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
              "h-10 px-5 text-xs font-semibold rounded-xl shadow-xs active:scale-95 transition-all cursor-pointer border-0 text-white inline-flex items-center justify-center",
              mode === "merge"
                ? "bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500"
                : "bg-red-600 hover:bg-red-700 active:bg-red-800 dark:bg-red-600 dark:hover:bg-red-500"
            )}
          >
            {isLoading ? (
              <>
                <HugeIcon className="ph-bold ph-spinner animate-spin text-xs mr-1.5" />
                <span>Restoring...</span>
              </>
            ) : (
              <span>{mode === "merge" ? "Merge" : "Overwrite"}</span>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
