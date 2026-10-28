"use client";

import React, { useMemo } from "react";
import HugeIcon from "@/components/shared/HugeIcon";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { formatPHDateTime } from "@/lib/timeFormat";
import { cn } from "@/lib/utils";

/**
 * Standard Information Row (label : value)
 * Clean unboxed metadata layout aligned with colons and icons.
 */
function InfoRow({ icon, label, value, children, className }) {
  return (
    <div
      className={cn(
        "grid grid-cols-[135px_12px_1fr] sm:grid-cols-[150px_14px_1fr] items-start gap-1 text-xs py-2 border-b border-gray-100/70 dark:border-zinc-800/50 last:border-0",
        className
      )}
    >
      <div className="text-gray-500 dark:text-zinc-400 font-medium flex items-center gap-2 truncate">
        {icon && (
          <HugeIcon className={cn("text-gray-400 dark:text-zinc-500 text-sm shrink-0", icon)} />
        )}
        <span className="truncate">{label}</span>
      </div>
      <span className="text-gray-300 dark:text-zinc-600 select-none">:</span>
      <div className="text-gray-900 dark:text-zinc-100 font-semibold break-words min-w-0">
        {children ?? (value || <span className="text-gray-400 font-normal italic">None</span>)}
      </div>
    </div>
  );
}

// Icon helper for requirement categories
function getCategoryIcon(category = "") {
  const cat = String(category).toLowerCase();
  if (cat.includes("admission") || cat.includes("identity") || cat.includes("birth")) {
    return "ph-identification-card";
  }
  if (cat.includes("academic") || cat.includes("record") || cat.includes("137") || cat.includes("grade")) {
    return "ph-graduation-cap";
  }
  if (cat.includes("graduation") || cat.includes("exit") || cat.includes("diploma") || cat.includes("transcript")) {
    return "ph-certificate";
  }
  if (cat.includes("certificate") || cat.includes("clearance") || cat.includes("moral")) {
    return "ph-shield-check";
  }
  return "ph-file-text";
}

export default function PermanentAdmissionRecordSheet({
  open,
  onOpenChange,
  item,
  items = [],
  currentIndex = -1,
  onNavigatePrev,
  onNavigateNext,
  student = null,
  onPreviewDocument,
}) {
  const isSubmitted = useMemo(() => {
    if (!item) return false;
    const st = String(item.status || item.approval_status || item.statusLabel || "").toLowerCase();
    return st === "submitted" || st === "approved" || st === "completed" || st === "archived";
  }, [item]);

  const docTitle = item?.docType || item?.documentType || item?.title || item?.name || "Permanent Admission Record";
  const docCategory = item?.category || "Admission & Identity";
  const docDescription =
    item?.description ||
    item?.purpose ||
    "Official permanent admission credential required for academic verification and institutional records.";
  const docInstructions =
    item?.instructions ||
    "Submit the authenticated original physical copy directly to the Office of the Campus Registrar (Room 102).";

  const archiveDate = item?.document?.createdAt || item?.date || item?.created_at || item?.reviewed_at;
  const originalFilename = item?.document?.originalFilename || item?.original_filename;
  const sizeBytes = item?.document?.sizeBytes || item?.size_bytes;

  const totalCount = items?.length || 0;
  const hasMultiple = totalCount > 1 && currentIndex >= 0;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        size="default"
        showCloseButton={false}
        className="w-full sm:max-w-md md:max-w-lg lg:max-w-xl flex flex-col h-full font-jakarta bg-white dark:bg-card border-l border-border dark:border-border p-0 shadow-2xl overflow-hidden"
      >
        {/* 1. TOP HEADER: Title + Sequential Navigation (< > 01 of XX) + Squircle Close */}
        <SheetHeader className="shrink-0 p-0 border-b border-border dark:border-border bg-white dark:bg-card">
          <div className="flex items-center justify-between px-6 py-4">
            <div>
              <SheetTitle className="text-base font-bold text-gray-900 dark:text-zinc-50 tracking-tight">
                Permanent Admission Record
              </SheetTitle>
              <SheetDescription className="sr-only">
                Detailed permanent credential specification and archival clearance status
              </SheetDescription>
            </div>

            <div className="flex items-center gap-3">
              {hasMultiple && (
                <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-zinc-400">
                  <button
                    type="button"
                    disabled={currentIndex <= 0}
                    onClick={onNavigatePrev}
                    className="w-7 h-7 rounded-lg border border-border/80 dark:border-border flex items-center justify-center hover:bg-gray-100 dark:hover:bg-zinc-800 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
                    aria-label="Previous Record"
                    title="Previous Record"
                  >
                    <HugeIcon className="ph-bold ph-caret-left text-xs" />
                  </button>
                  <button
                    type="button"
                    disabled={currentIndex >= totalCount - 1}
                    onClick={onNavigateNext}
                    className="w-7 h-7 rounded-lg border border-border/80 dark:border-border flex items-center justify-center hover:bg-gray-100 dark:hover:bg-zinc-800 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
                    aria-label="Next Record"
                    title="Next Record"
                  >
                    <HugeIcon className="ph-bold ph-caret-right text-xs" />
                  </button>
                  <span className="font-mono text-[11px] font-semibold text-gray-700 dark:text-zinc-300 ml-0.5">
                    {String(currentIndex + 1).padStart(2, "0")} of {String(totalCount).padStart(2, "0")}
                  </span>
                </div>
              )}

              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="w-8 h-8 rounded-xl bg-gray-100/90 hover:bg-gray-200/90 dark:bg-zinc-800/80 dark:hover:bg-zinc-700/80 text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-zinc-100 flex items-center justify-center transition-all cursor-pointer active:scale-95 border border-black/5 dark:border-white/10 shadow-2xs"
                aria-label="Close"
                title="Close"
              >
                <HugeIcon className="ph-bold ph-x text-sm" />
              </button>
            </div>
          </div>
        </SheetHeader>

        {/* 2. Line-Attached Edge-to-Edge Status Notice (Zero card margins, takes the line) */}
        <div
          className={cn(
            "flex items-center gap-2.5 px-6 py-2.5 text-xs border-b transition-colors shrink-0",
            isSubmitted
              ? "border-emerald-200/90 bg-emerald-50/90 text-emerald-950 dark:border-emerald-900/40 dark:bg-emerald-950/25 dark:text-emerald-200"
              : "border-amber-200/90 bg-amber-50/90 text-amber-950 dark:border-amber-900/40 dark:bg-amber-950/25 dark:text-amber-200"
          )}
        >
          <HugeIcon
            className={cn(
              "ph-bold text-[15px] shrink-0",
              isSubmitted
                ? "ph-shield-check text-emerald-600 dark:text-emerald-400"
                : "ph-warning-circle text-amber-600 dark:text-amber-400"
            )}
          />
          <span className="font-medium text-[11.5px] sm:text-xs leading-normal">
            <strong className="font-semibold">
              {isSubmitted ? "Archived & Verified:" : "Action Required:"}
            </strong>{" "}
            {isSubmitted
              ? "Physical authenticated hard copy is securely vaulted in institutional records."
              : "Physical hard copy submission required to clear academic records hold."}
          </span>
        </div>

        {/* 3. Scrollable Body: Clean, Typographic & Card-Free */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin">
          {/* Document Identity Block (Unboxed) */}
          <div className="flex items-start gap-3.5 pb-4 border-b border-border/80 dark:border-border">
            <div
              className={cn(
                "w-11 h-11 rounded-xl flex items-center justify-center text-lg shrink-0 font-bold border mt-0.5 shadow-2xs",
                isSubmitted
                  ? "bg-emerald-500/10 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-500/20 dark:border-emerald-900/40"
                  : "bg-amber-500/10 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border-amber-500/20 dark:border-amber-900/40"
              )}
            >
              <HugeIcon
                className={cn(
                  "ph-bold",
                  isSubmitted ? "ph-file-check" : getCategoryIcon(docCategory)
                )}
              />
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-[10px] font-mono font-medium text-gray-500 dark:text-zinc-400 bg-gray-100 dark:bg-zinc-800 px-2 py-0.5 rounded-md inline-block mb-1">
                {docCategory}
              </span>
              <h3 className="text-base font-bold text-gray-900 dark:text-zinc-100 leading-snug break-words">
                {docTitle}
              </h3>
              {docDescription && (
                <p className="text-xs text-gray-500 dark:text-zinc-400 mt-1 leading-relaxed">
                  {docDescription}
                </p>
              )}
            </div>
          </div>

          {/* Essential Record Specification (Unboxed InfoRow List) */}
          <div className="space-y-2">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-zinc-500">
              Record Specification
            </h4>
            <div className="divide-y divide-gray-100/70 dark:divide-zinc-800/50">
              <InfoRow
                icon="ph-buildings"
                label="Verifying Office"
                value="Office of the Campus Registrar"
              />
              <InfoRow icon="ph-chart-pie-slice" label="Clearance Status">
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border",
                    isSubmitted
                      ? "bg-emerald-50 text-emerald-800 border-emerald-200/80 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-800/40"
                      : "bg-amber-50 text-amber-800 border-amber-200/80 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-800/40"
                  )}
                >
                  <span
                    className={cn(
                      "w-1.5 h-1.5 rounded-full shrink-0",
                      isSubmitted ? "bg-emerald-500" : "bg-amber-500"
                    )}
                  />
                  {isSubmitted ? "Archived & Verified" : "Pending Submission"}
                </span>
              </InfoRow>
              {isSubmitted && archiveDate && (
                <InfoRow
                  icon="ph-calendar-check"
                  label="Archived On"
                  value={formatPHDateTime(archiveDate)}
                />
              )}
              {isSubmitted && (
                <InfoRow
                  icon="ph-shield-check"
                  label="Clearance Standing"
                  value="Good Standing · No Records Hold"
                />
              )}
              {!isSubmitted && (
                <InfoRow
                  icon="ph-door"
                  label="Submission Window"
                  value="Window 2 — Admissions & Archives (Room 102)"
                />
              )}
              {!isSubmitted && (
                <InfoRow
                  icon="ph-clock"
                  label="Window Hours"
                  value="Mon – Fri, 8:00 AM – 5:00 PM (PST)"
                />
              )}
            </div>
          </div>

          {/* Contextual Action: Submission Instructions (Pending Only, Unboxed) */}
          {!isSubmitted && (
            <div className="space-y-2 pt-3 border-t border-gray-100 dark:border-zinc-800">
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-zinc-500">
                Submission Guidelines
              </h4>
              <p className="text-xs text-gray-700 dark:text-zinc-300 leading-relaxed">
                {docInstructions}
              </p>
              <div className="flex items-center gap-2 text-[11.5px] text-gray-500 dark:text-zinc-400 pt-0.5">
                <HugeIcon className="ph-bold ph-envelope-simple text-xs text-gray-400 shrink-0" />
                <span>Place in a long brown envelope labeled with your full name and student number.</span>
              </div>
            </div>
          )}

          {/* Contextual Action: Digitized Reference (Submitted Only, Single Unboxed Row) */}
          {isSubmitted && originalFilename && (
            <div className="space-y-2 pt-3 border-t border-gray-100 dark:border-zinc-800">
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-zinc-500">
                Digitized Archive Reference
              </h4>
              <div className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-gray-50/70 dark:bg-zinc-800/40 border border-border/70 dark:border-border/60">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/40">
                    <HugeIcon className="ph-bold ph-file-text text-base" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-gray-900 dark:text-zinc-100 truncate" title={originalFilename}>
                      {originalFilename}
                    </p>
                    {sizeBytes ? (
                      <p className="text-[10px] text-gray-400 dark:text-zinc-500 font-mono">
                        {(sizeBytes / 1024).toFixed(1)} KB · Digitized Record
                      </p>
                    ) : null}
                  </div>
                </div>

                {onPreviewDocument && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => onPreviewDocument(item)}
                    className="shrink-0 h-8 px-3 rounded-lg text-xs font-semibold border border-border dark:border-border bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 cursor-pointer shadow-xs active:scale-95 transition-all"
                  >
                    <HugeIcon className="ph-bold ph-eye text-xs mr-1" />
                    <span>View Digital Copy</span>
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* 4. Sheet Footer */}
        <SheetFooter className="shrink-0 border-t border-border dark:border-border bg-gray-50/70 dark:bg-zinc-900/40 p-4 px-6 flex flex-row items-center justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="h-10 px-5 text-xs font-semibold rounded-xl border border-border dark:border-border bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-xs cursor-pointer active:scale-95 transition-all"
          >
            Close
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
