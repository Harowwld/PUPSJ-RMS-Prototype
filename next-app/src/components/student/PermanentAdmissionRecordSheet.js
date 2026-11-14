"use client";

import NoticeBanner from "@/components/shared/NoticeBanner";
import SheetPagination from "@/components/shared/SheetPagination";
import SheetSectionHeading from "@/components/shared/SheetSectionHeading";
import { PDF_ACTION_LABELS } from "@/lib/pdfPreview";
import React, { useMemo } from "react";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Button, buttonVariants } from "@/components/ui/button";
import { formatPHDateTime } from "@/lib/timeFormat";
import { cn } from "@/lib/utils";
import { COMPACT_BADGE_BASE, BADGE_PALETTES } from "@/lib/badgeStyles";
import { ArrowUpRight01Icon, Cancel01Icon, File02Icon, Mail01Icon, TaskDone01Icon, ViewIcon } from "hugeicons-react";
import AppIcon from "@/components/ui/app-icon";
import NarrativeText from "@/components/shared/NarrativeText";
export const CHECKLIST_HIGHLIGHTED_PHRASES = [
  "Philippine Statistics Authority (PSA)",
  "CAEPUP application slip",
  "Senior High School Diploma",
  "identification document",
  "Senior High School Student Permanent Record (SF10-SHS)",
  "Senior High School Final Report Card (Form 138 / SF9)",
  "Certified true copy",
  "certificate of good moral character",
  "Health information",
  "university admission waiver",
  "PUP iApply",
  "PUP San Juan Admissions",
  "PUP San Juan Registrar",
  "certified true copy",
  "Learner Reference Number (LRN)",
  "both semesters",
  "Certificate of Graduation",
  "Certificate of Good Moral Character",
  "Student Admission Record (SAR)",
  "PSA Serbilis",
  "PSA Civil Registry System outlet",
];

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
          <AppIcon className={cn("text-gray-400 dark:text-zinc-500 text-sm shrink-0", icon)} />
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
    return "Contact01Icon";
  }
  if (cat.includes("academic") || cat.includes("record") || cat.includes("137") || cat.includes("grade")) {
    return "GraduationScrollIcon";
  }
  if (cat.includes("graduation") || cat.includes("exit") || cat.includes("diploma") || cat.includes("transcript")) {
    return "Certificate01Icon";
  }
  if (cat.includes("certificate") || cat.includes("clearance") || cat.includes("moral")) {
    return "Shield01Icon";
  }
  return "File02Icon";
}

export default function PermanentAdmissionRecordSheet({
  open,
  onOpenChange,
  item: itemProp,
  requirement,
  items = [],
  currentIndex = -1,
  onNavigatePrev,
  onNavigateNext,
  student = null,
  onPreviewDocument,
  statusOnly = false,
}) {
  const item = itemProp || requirement;
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

  const showStatus = !statusOnly || Boolean(item?.status);
  const highlightedPhrases = statusOnly ? [docTitle, ...CHECKLIST_HIGHLIGHTED_PHRASES] : undefined;

  const totalCount = items?.length || 0;
  const hasMultiple = totalCount > 1 && currentIndex >= 0;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        size="default"
        showCloseButton={false}
        className="w-full sm:max-w-md md:max-w-lg lg:max-w-xl flex flex-col h-full font-jakarta p-0 overflow-hidden"
      >
        <SheetHeader className="shrink-0 p-0">
          <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4">
            <div>
              <SheetTitle>
                Permanent Admission Record
              </SheetTitle>
              <SheetDescription className="sr-only">
                Detailed permanent credential specification and archival clearance status
              </SheetDescription>
            </div>

            <div className="ml-auto flex items-center gap-3">
              {hasMultiple && (
                <SheetPagination
                  compact
                  label="Record navigation"
                  page={currentIndex + 1}
                  totalPages={totalCount}
                  onPrevious={onNavigatePrev}
                  onNext={onNavigateNext}
                  previousDisabled={currentIndex <= 0}
                  nextDisabled={currentIndex >= totalCount - 1}
                  previousLabel="Previous Record"
                  nextLabel="Next Record"
                />
              )}

              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => onOpenChange(false)}
                    className="size-8 rounded-full bg-black/[0.04] hover:bg-black/[0.08] dark:bg-white/[0.08] dark:hover:bg-white/[0.14] text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-zinc-100 flex items-center justify-center transition-all cursor-pointer active:scale-95 border border-black/[0.04] dark:border-white/[0.08] shadow-2xs"
                    aria-label="Close"
                  >
                    <Cancel01Icon size="1em" className="text-sm" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>Close</TooltipContent>
              </Tooltip>
            </div>
          </div>
        </SheetHeader>

        {/* 2. Line-Attached Edge-to-Edge Status Notice (Zero card margins, takes the line) */}
        {!statusOnly && <NoticeBanner tone={isSubmitted ? "success" : "warning"} title={isSubmitted ? "Archived & Verified" : "Action Required"}>
            {isSubmitted
              ? "Physical authenticated hard copy is securely vaulted in institutional records."
              : "Physical hard copy submission required to clear academic records hold."}
          </NoticeBanner>}

        {/* 3. Scrollable Body: Clean, Typographic & Card-Free */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin">
          {!statusOnly && (
            <div className="flex items-start gap-3.5 pb-4 border-b border-border/80 dark:border-border">
              <div
                className={cn(
                  "w-11 h-11 rounded-full flex items-center justify-center text-lg shrink-0 font-bold mt-0.5 shadow-2xs",
                  isSubmitted
                    ? "bg-emerald-500/10 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                    : "bg-amber-500/10 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400"
                )}
              >
                <TaskDone01Icon size={16} aria-hidden="true"
                  className={cn(
                    "",
                    isSubmitted ? "" : getCategoryIcon(docCategory)
                  )}
                />
              </div>
              <div className="min-w-0 flex-1">
                <span className={cn(COMPACT_BADGE_BASE, BADGE_PALETTES.gray, "font-sans tabular-nums mb-1")}>
                  {docCategory}
                </span>
                <h3 className="text-base font-bold text-gray-900 dark:text-zinc-100 leading-snug break-words">
                  {docTitle}
                </h3>
                {docDescription && (
                  <div className="text-xs text-gray-500 dark:text-zinc-400 mt-1 leading-relaxed">
                    <NarrativeText text={docDescription} mode="full" highlightedPhrases={highlightedPhrases} />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Essential Record Specification (Unboxed InfoRow List) */}
          <div className="space-y-2">
            {statusOnly ? (
              <SheetSectionHeading icon="SlidersHorizontalIcon" title="Document Information" />
            ) : (
              <SheetSectionHeading icon="SlidersHorizontalIcon" title="Record Specification" />
            )}
            <div className="divide-y divide-gray-100/70 dark:divide-zinc-800/50">
              {statusOnly && (
                <>
                  <InfoRow icon="File02Icon" label="Document Type" value={docTitle} />
                  <InfoRow icon="Tag01Icon" label="Category">
                    <span className={cn(COMPACT_BADGE_BASE, BADGE_PALETTES.gray)}>{docCategory}</span>
                  </InfoRow>
                  <InfoRow icon="Message01Icon" label="Description">
                    <div className="font-normal leading-relaxed">
                      <NarrativeText text={docDescription} mode="full" highlightedPhrases={highlightedPhrases} />
                    </div>
                  </InfoRow>
                </>
              )}
              <InfoRow
                icon="Building01Icon"
                label="Verifying Office"
                value="Office of the Campus Registrar"
              />
              {showStatus && <InfoRow icon="PieChartIcon" label={statusOnly ? "Submission Status" : "Clearance Status"}>
                <span
                  className={cn(
                    COMPACT_BADGE_BASE,
                    isSubmitted
                      ? BADGE_PALETTES.emerald
                      : BADGE_PALETTES.amber
                  )}
                >
                  {statusOnly ? (isSubmitted ? "Submitted" : "Missing") : (isSubmitted ? "Archived & Verified" : "Pending Submission")}
                </span>
              </InfoRow>}
              {!statusOnly && isSubmitted && archiveDate && (
                <InfoRow
                  icon="CalendarCheckIn01Icon"
                  label="Archived On"
                  value={formatPHDateTime(archiveDate)}
                />
              )}
              {!statusOnly && isSubmitted && (
                <InfoRow
                  icon="Shield01Icon"
                  label="Clearance Standing"
                  value="Good Standing · No Records Hold"
                />
              )}
              {!statusOnly && !isSubmitted && (
                <InfoRow
                  icon="Door01Icon"
                  label="Submission Window"
                  value="Window 2 — Admissions & Archives (Room 102)"
                />
              )}
              {!statusOnly && !isSubmitted && (
                <InfoRow
                  icon="Clock01Icon"
                  label="Window Hours"
                  value="Mon – Fri, 8:00 AM – 5:00 PM (PST)"
                />
              )}
            </div>
          </div>

          {statusOnly && !isSubmitted && item?.instructions && (
            <section className="space-y-2.5">
              <SheetSectionHeading icon="File02Icon" title="How to get it" />
              <InfoRow icon="Message01Icon" label="Description">
                <div className="flex flex-col items-start gap-2.5">
                  <div className="font-normal leading-relaxed">
                    <NarrativeText text={item.instructions} mode="full" highlightedPhrases={highlightedPhrases} />
                  </div>
                  {item.source && (
                    <a
                      className={buttonVariants({ variant: "outline", size: "sm", className: "h-auto min-h-9 max-w-full whitespace-normal py-2 text-left" })}
                      href={item.source.href}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {item.source.label}
                      <ArrowUpRight01Icon size={14} aria-hidden="true" data-icon="inline-end" />
                      <span className="sr-only"> (opens in a new tab)</span>
                    </a>
                  )}
                </div>
              </InfoRow>
            </section>
          )}

          {/* Contextual Action: Submission Instructions (Pending Only, Unboxed) */}
          {!statusOnly && !isSubmitted && (
            <div className="space-y-2 pt-3 border-t border-gray-100 dark:border-zinc-800">
              <SheetSectionHeading icon="ClipboardIcon" title="Submission Guidelines" />
              <div className="text-xs text-gray-700 dark:text-zinc-300 leading-relaxed">
                <NarrativeText text={docInstructions} mode="full" />
              </div>
              <div className="flex items-center gap-2 text-[11.5px] text-gray-500 dark:text-zinc-400 pt-0.5">
                <Mail01Icon size="1em" className="text-xs text-gray-400 shrink-0" />
                <span>Place in a long brown envelope labeled with your full name and student number.</span>
              </div>
            </div>
          )}

          {/* Contextual Action: Digitized Reference (Submitted Only, Single Unboxed Row) */}
          {!statusOnly && isSubmitted && originalFilename && (
            <div className="space-y-2 pt-3 border-t border-gray-100 dark:border-zinc-800">
              <SheetSectionHeading icon="File02Icon" title="Digitized Archive Reference" />
              <div className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-gray-50/70 dark:bg-zinc-800/40 border border-border/70 dark:border-border/60">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                    <File02Icon size="1em" className="text-base" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-gray-900 dark:text-zinc-100 truncate" title={originalFilename}>
                      {originalFilename}
                    </p>
                    {sizeBytes ? (
                      <p className="text-[10px] text-gray-400 dark:text-zinc-500 font-sans tabular-nums">
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
                    {PDF_ACTION_LABELS.preview}
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* 4. Sheet Footer */}
        <SheetFooter className="shrink-0 p-4 px-6 flex flex-row items-center justify-between">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="h-9 px-4 text-xs font-semibold rounded-xl border border-border dark:border-border bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-xs cursor-pointer active:scale-95 transition-all"
          >
            Close
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
