"use client";
import { Table } from "@/components/ui/table";
import NoticeBanner from "@/components/shared/NoticeBanner";

import { useState, useEffect, useMemo } from "react";

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
import { BADGE_BASE, BADGE_PALETTES } from "@/lib/badgeStyles";
import { FileZipIcon, Loading01Icon } from "hugeicons-react";


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
        <DialogHeader className="p-6 pb-0 text-left">
          <div className="flex items-start gap-4">
            <div className="min-w-0 flex-1">
              <DialogTitle>
                {title}
              </DialogTitle>
              <DialogDescription className="mt-1">
                {description}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Content Body */}
        <NoticeBanner tone={mode === "overwrite" ? "warning" : "success"} className="mt-4">
          {mode === "overwrite" ? (
            <>
              <span className="font-semibold">Destructive Action:</span> Live records in this partition will be permanently overwritten. Any new records created after this snapshot was taken will be lost.
            </>
          ) : (
            <>
              <span className="font-semibold">Safe Merge Active:</span> Existing live records will be preserved. Only missing records and files from this snapshot will be restored.
            </>
          )}
        </NoticeBanner>
        <div className="p-6 space-y-4">
          {/* File Summary Badge */}
          <div className="flex items-center justify-between px-4 py-3 rounded-xl border border-border/80 bg-gray-50/70 dark:border-border dark:bg-zinc-900/40">
            <div className="flex items-center gap-2.5 min-w-0">
              <FileZipIcon size="1em" className="text-[18px] text-gray-400 dark:text-zinc-500 shrink-0" />
              <span className="text-xs font-semibold text-gray-800 dark:text-zinc-200 truncate font-sans tabular-nums">
                {displayFilename}
              </span>
            </div>
            {previewData?.totalArchiveFiles !== undefined && (
              <span className="text-[11px] font-medium text-gray-500 dark:text-zinc-400 shrink-0 font-sans tabular-nums">
                {previewData.totalArchiveFiles} files
              </span>
            )}
          </div>

          {/* Restoration Strategy Segmented Control */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-gray-700 dark:text-zinc-300">
              Restoration Strategy
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setMode("merge")}
                className={cn(
                  "p-3.5 rounded-xl text-left transition-all duration-150 cursor-pointer select-none active:scale-[0.98] border",
                  mode === "merge"
                    ? "bg-white dark:bg-zinc-800 text-gray-900 dark:text-white shadow-[0_1px_3px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.04),inset_0_1px_0_0_rgba(255,255,255,0.85)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.35),inset_0_1px_0_0_rgba(255,255,255,0.08)] ring-1 ring-emerald-500/30 dark:ring-emerald-400/30 border-emerald-500/50"
                    : "border-black/[0.08] dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.03] text-gray-600 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold">Safe Merge</span>
                  <span className={cn(BADGE_PALETTES.emerald, "text-[10px]", BADGE_BASE)}>
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
                  "p-3.5 rounded-xl text-left transition-all duration-150 cursor-pointer select-none active:scale-[0.98] border",
                  mode === "overwrite"
                    ? "bg-white dark:bg-zinc-800 text-gray-900 dark:text-white shadow-[0_1px_3px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.04),inset_0_1px_0_0_rgba(255,255,255,0.85)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.35),inset_0_1px_0_0_rgba(255,255,255,0.08)] ring-1 ring-red-500/30 dark:ring-red-400/30 border-red-500/50"
                    : "border-black/[0.08] dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.03] text-gray-600 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold">Full Overwrite</span>
                  <span className={cn(BADGE_PALETTES.rose, "text-[10px]", BADGE_BASE)}>
                    Disaster Rollback
                  </span>
                </div>
                <p className="text-[11px] text-gray-500 dark:text-zinc-400 mt-1.5 leading-relaxed">
                  Replace live database entirely. Records added after will be erased.
                </p>
              </button>
            </div>
          </div>


          {/* Table Diff Preview */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-gray-700 dark:text-zinc-300">
                Data Impact Preview
              </label>
              {previewLoading && (
                <span className="text-[11px] text-gray-400 dark:text-zinc-500 flex items-center gap-1 font-medium">
                  <Loading01Icon size="1em" className="animate-spin text-[12px]" />
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
                <div className="max-h-48 overflow-y-auto custom-scrollbar select-none relative">
                  <Table columns={["text", "number", "number", "number"]} className="min-w-[420px]">
                    <thead className="sticky top-0 z-20 bg-gray-100/90 dark:bg-zinc-800/90 backdrop-blur-xs border-b border-border dark:border-border select-none">
                      <tr className="text-left text-xs font-semibold text-gray-500 dark:text-zinc-400 select-none">
                        <th className="py-2.5 px-3.5 w-[36%] font-semibold">
                          Resource Table
                        </th>
                        <th className="py-2.5 px-3.5 w-[18%] font-semibold text-center">
                          Live Count
                        </th>
                        <th className="py-2.5 px-3.5 w-[18%] font-semibold text-center">
                          In Backup
                        </th>
                        <th className="py-2.5 px-3.5 pr-4 w-[28%] font-semibold text-right">
                          Net Impact
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border dark:divide-border bg-white dark:bg-card">
                      {previewData.tables.map((t) => {
                        const delta = Number(t.delta || 0);
                        const isSafeMerge = mode === "merge";

                        return (
                          <tr key={t.name} className="hover:bg-gray-50/70 dark:hover:bg-zinc-800/40 border-b border-border dark:border-border last:border-b-0 transition-colors select-none">
                            <td className="py-2.5 px-3.5 font-semibold text-gray-900 dark:text-zinc-100 font-sans tabular-nums truncate border-r border-border/70 dark:border-border/70" title={t.name}>
                              {t.name}
                            </td>
                            <td className="py-2.5 px-3.5 text-center text-gray-700 dark:text-zinc-300 font-sans tabular-nums whitespace-nowrap border-r border-border/70 dark:border-border/70">
                              {t.liveRows}
                            </td>
                            <td className="py-2.5 px-3.5 text-center text-gray-700 dark:text-zinc-300 font-sans tabular-nums whitespace-nowrap border-r border-border/70 dark:border-border/70">
                              {t.backupRows}
                            </td>
                            <td className="py-2.5 px-3.5 pr-4 text-right whitespace-nowrap">
                              {isSafeMerge ? (
                                delta > 0 ? (
                                  <span className={cn(BADGE_PALETTES.emerald, "text-[10px]", BADGE_BASE)}>
                                    +{delta} missing restored
                                  </span>
                                ) : (
                                  <span className={cn(BADGE_PALETTES.gray, "text-[10px]", BADGE_BASE)}>
                                    {t.liveRows} preserved
                                  </span>
                                )
                              ) : delta < 0 ? (
                                <span className={cn(BADGE_PALETTES.rose, "text-[10px]", BADGE_BASE)}>
                                  {Math.abs(delta)} modern erased
                                </span>
                              ) : (
                                <span className={cn(BADGE_PALETTES.blue, "text-[10px]", BADGE_BASE)}>
                                  {t.backupRows} restored
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </Table>
                </div>
              ) : (
                <div className="p-4 text-center text-xs text-gray-500 dark:text-zinc-400">
                  Ready to restore. Relational tables will be validated upon confirmation.
                </div>
              )}
            </div>
          </div>

        </div>
        <NoticeBanner tone="info" className="mb-6">
          <span className="font-semibold">Zero-Loss Safety:</span> An automated Pre-Restore Safety Snapshot of current data is created before changes are applied.
        </NoticeBanner>

        {/* Footer with Action-Word Only Buttons */}
        <DialogFooter className="p-6 pt-0 flex items-center justify-end gap-2.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleCancelAction}
            disabled={isLoading}
            className="h-9 px-4 text-xs font-semibold rounded-xl border border-border dark:border-border bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-xs cursor-pointer active:scale-95 transition-all"
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleConfirmAction}
            disabled={isLoading || previewLoading}
            className={cn(
              "h-9 px-4 text-xs font-semibold rounded-xl shadow-xs active:scale-95 transition-all cursor-pointer border-0 text-white inline-flex items-center justify-center",
              mode === "merge"
                ? "bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500"
                : "bg-red-600 hover:bg-red-700 active:bg-red-800 dark:bg-red-600 dark:hover:bg-red-500"
            )}
          >
            {isLoading ? (
              <>
                <Loading01Icon size="1em" className="animate-spin text-xs mr-1.5" />
                <span>Restoring Records…</span>
              </>
            ) : (
              <span>{mode === "merge" ? "Merge Records" : "Overwrite Database"}</span>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
