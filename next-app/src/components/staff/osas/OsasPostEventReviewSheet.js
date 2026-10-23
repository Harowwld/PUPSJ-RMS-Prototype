"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import HugeIcon from "@/components/shared/HugeIcon";
import ProfileAvatar from "@/components/shared/ProfileAvatar";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  getPostEventStatusBadgeClass,
  getPostEventStatusDotClass,
} from "@/components/staff/OsasMonitoringTab";

/**
 * Standard Information Row (label : value)
 * Clean unboxed metadata layout aligned with colons and icons.
 */
function InfoRow({ icon, label, value, children, className }) {
  return (
    <div
      className={cn(
        "grid grid-cols-[135px_12px_1fr] sm:grid-cols-[150px_14px_1fr] items-start gap-1 text-xs py-1.5 border-b border-gray-100/70 dark:border-zinc-800/50 last:border-0",
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

export default function OsasPostEventReviewSheet({
  open,
  onOpenChange,
  selectedPostEvent,
  currentIndex,
  totalCount,
  onNavigatePrev,
  onNavigateNext,
  postEventStatus,
  setPostEventStatus,
  postEventNote,
  setPostEventNote,
  savePostEvent,
  isSavingPostEvent,
  availablePostEventStatusOptions = [],
  isPostEventNoteRequired,
  isPostEventNoteValid,
  handleOpenPdfPreview,
}) {
  if (!selectedPostEvent) return null;

  const trackingNo =
    selectedPostEvent.event_tracking_number ||
    `EVT-${selectedPostEvent.event_proposal_id || selectedPostEvent.id}`;
  const attendeesCount =
    selectedPostEvent.actual_attendance ??
    selectedPostEvent.actual_attendees ??
    selectedPostEvent.total_attendance ??
    0;
  const expensesAmount = Number(
    selectedPostEvent.total_expenses ?? selectedPostEvent.actual_expenses ?? 0
  );
  const proponentName =
    selectedPostEvent.student_name ||
    selectedPostEvent.submitted_by_name ||
    "Authorized Officer";
  const dateSubmittedStr = selectedPostEvent.created_at
    ? new Date(selectedPostEvent.created_at).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "N/A";

  const handleSelectStatusPill = (val) => {
    setPostEventStatus(val);
    if (!postEventNote.trim()) {
      setPostEventNote(`Status updated to ${val} by OSAS clearance review.`);
    }
  };

  const isRevokingClearance =
    selectedPostEvent.status === "Cleared" && postEventStatus !== "Cleared";
  const isRequestingRevision = postEventStatus === "Needs Revision";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        size="default"
        showCloseButton={false}
        className="w-full sm:max-w-md md:max-w-lg lg:max-w-xl flex flex-col h-full bg-white dark:bg-card border-l border-border dark:border-border p-0 shadow-2xl overflow-hidden"
      >
        {/* TOP HEADER: Post-Event Clearance Details + < > 01 of XX + X button */}
        <SheetHeader className="shrink-0 p-0 border-b border-border dark:border-border bg-white dark:bg-card">
          <div className="flex items-center justify-between px-6 py-4">
            <div>
              <SheetTitle className="text-base font-bold text-gray-900 dark:text-zinc-50 tracking-tight">
                Post-Event Clearance Details
              </SheetTitle>
              <SheetDescription className="sr-only">
                Detailed information and evaluation for post-event clearance
              </SheetDescription>
            </div>

            <div className="flex items-center gap-3">
              {typeof totalCount === "number" && totalCount > 1 && (
                <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-zinc-400">
                  <button
                    type="button"
                    disabled={currentIndex <= 0}
                    onClick={onNavigatePrev}
                    className="w-7 h-7 rounded-lg border border-border/80 dark:border-border flex items-center justify-center hover:bg-gray-100 dark:hover:bg-zinc-800 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
                    aria-label="Previous Report"
                    title="Previous Report"
                  >
                    <HugeIcon className="ph-bold ph-caret-left text-xs" />
                  </button>
                  <button
                    type="button"
                    disabled={currentIndex >= totalCount - 1}
                    onClick={onNavigateNext}
                    className="w-7 h-7 rounded-lg border border-border/80 dark:border-border flex items-center justify-center hover:bg-gray-100 dark:hover:bg-zinc-800 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
                    aria-label="Next Report"
                    title="Next Report"
                  >
                    <HugeIcon className="ph-bold ph-caret-right text-xs" />
                  </button>
                  <span className="font-mono text-[11px] font-semibold text-gray-700 dark:text-zinc-300 ml-0.5">
                    {String(Math.max(1, (currentIndex ?? 0) + 1)).padStart(2, "0")} of {String(totalCount).padStart(2, "0")}
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

        {/* SCROLLABLE 1-COLUMN BODY */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Summary Strip */}
          <div className="flex items-start gap-3.5 pb-4 border-b border-border/80 dark:border-border">
            <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 flex items-center justify-center text-xl shrink-0 font-bold border border-purple-500/20 dark:border-purple-800/40 mt-0.5">
              <HugeIcon className="ph-bold ph-receipt" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-pup-maroon dark:text-red-400 bg-red-50 dark:bg-red-950/40 px-2 py-0.5 rounded-md border border-red-200/60 dark:border-red-900/40">
                  {selectedPostEvent.organization_acronym ? `[${selectedPostEvent.organization_acronym}] ` : ""}
                  {selectedPostEvent.organization_name}
                </span>
                <span className="font-mono text-[10px] font-semibold px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300 border border-purple-200/80 dark:border-purple-800/60">
                  {trackingNo}
                </span>
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-semibold shrink-0",
                    getPostEventStatusBadgeClass(selectedPostEvent.status)
                  )}
                >
                  <span className={cn("w-1.5 h-1.5 rounded-full", getPostEventStatusDotClass(selectedPostEvent.status))} />
                  {selectedPostEvent.status}
                </span>
              </div>
              <h3 className="text-sm font-bold text-gray-900 dark:text-zinc-100 leading-snug break-words">
                {selectedPostEvent.event_title}
              </h3>
              <div className="flex items-center gap-2 mt-2">
                <ProfileAvatar
                  id={
                    selectedPostEvent.student_no ||
                    selectedPostEvent.student_account_id
                  }
                  name={proponentName}
                  initials={proponentName
                    .trim()
                    .split(/\s+/)
                    .slice(0, 2)
                    .map((part) => part[0]?.toUpperCase())
                    .join("") || "ST"}
                  className="size-7 border border-pup-maroon/20"
                  fallbackClassName="text-[10px] font-semibold bg-pup-maroon/10 text-pup-maroon dark:bg-red-950/40 dark:text-red-400"
                />
                <p className="text-xs text-gray-500 dark:text-zinc-400 min-w-0 truncate">
                  Submitter: <strong className="text-gray-900 dark:text-zinc-200">{proponentName}</strong>
                  {selectedPostEvent.submitted_by_email && ` · ${selectedPostEvent.submitted_by_email}`}
                </p>
              </div>
            </div>
          </div>

          {/* SECTION 1: Post-Event Specification (Unboxed InfoRow) */}
          <div className="space-y-2">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-zinc-500">
              Clearance Specification
            </h4>
            <div className="divide-y divide-gray-100/70 dark:divide-zinc-800/50">
              <InfoRow icon="ph-buildings" label="Organization">
                <span>
                  {selectedPostEvent.organization_name}
                  {selectedPostEvent.organization_acronym && (
                    <span className="text-gray-400 font-normal ml-1">
                      ({selectedPostEvent.organization_acronym})
                    </span>
                  )}
                </span>
              </InfoRow>

              <InfoRow icon="ph-user" label="Submitter" value={proponentName} />

              {selectedPostEvent.submitted_by_email && (
                <InfoRow icon="ph-envelope-simple" label="Email Address" value={selectedPostEvent.submitted_by_email} />
              )}

              <InfoRow icon="ph-barcode" label="Tracking Number">
                <span className="font-mono text-xs">{trackingNo}</span>
              </InfoRow>

              <InfoRow
                icon="ph-users"
                label="Actual Attendance"
                value={`${Number(attendeesCount).toLocaleString()} verified attendees`}
              />

              <InfoRow
                icon="ph-coins"
                label="Liquidated Spend"
                value={`₱${expensesAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
              />

              <InfoRow icon="ph-calendar" label="Date Submitted" value={dateSubmittedStr} />

              <InfoRow icon="ph-chart-pie-slice" label="Clearance Status">
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-semibold",
                    getPostEventStatusBadgeClass(selectedPostEvent.status)
                  )}
                >
                  <span className={cn("w-1.5 h-1.5 rounded-full", getPostEventStatusDotClass(selectedPostEvent.status))} />
                  {selectedPostEvent.status}
                </span>
              </InfoRow>
            </div>
          </div>

          {/* SECTION 2: Accomplishment Narrative & Previous Remarks */}
          <div className="space-y-3 pt-2">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-zinc-500">
              Narrative & Evaluation History
            </h4>

            {/* Narrative summary */}
            {selectedPostEvent.narrative_summary && (
              <div className="rounded-xl border border-border/80 dark:border-border bg-gray-50/50 dark:bg-zinc-900/30 p-3.5 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-zinc-500">
                  Accomplishment & Narrative Summary
                </span>
                <p className="text-xs text-gray-700 dark:text-zinc-300 leading-relaxed whitespace-pre-wrap">
                  {selectedPostEvent.narrative_summary}
                </p>
              </div>
            )}

            {/* Previous Review Remarks */}
            {selectedPostEvent.review_notes && (
              <div className="rounded-xl border border-border/80 dark:border-border bg-white dark:bg-zinc-900/40 p-3.5 space-y-1.5">
                <div className="flex items-center justify-between text-[11px] text-gray-400 dark:text-zinc-500 pb-1.5 border-b border-border/80 dark:border-border">
                  <span>
                    Previous Evaluation by:{" "}
                    <strong className="text-gray-700 dark:text-zinc-300">
                      {selectedPostEvent.reviewer_name || "OSAS Officer"}
                    </strong>
                  </span>
                  {selectedPostEvent.reviewed_at && (
                    <span className="font-mono">
                      {new Date(selectedPostEvent.reviewed_at).toLocaleDateString()}
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-700 dark:text-zinc-300 leading-relaxed">
                  {selectedPostEvent.review_notes}
                </p>
              </div>
            )}
          </div>

          {/* SECTION 3: Official Compliance Documents */}
          <div className="space-y-2.5 pt-2">
            <div className="flex items-center justify-between">
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-zinc-500">
                Compliance Attachments
              </h4>
              <span className="text-[11px] text-slate-400 dark:text-zinc-500">
                Official files submitted for clearance
              </span>
            </div>

            <div className="space-y-2">
              {/* Narrative Report Row */}
              <div className="rounded-xl border border-border/80 dark:border-border bg-gray-50/60 dark:bg-zinc-900/40 p-3.5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-red-50 dark:bg-red-950/40 text-pup-maroon dark:text-red-400 flex items-center justify-center text-lg shrink-0 shadow-2xs border border-red-100 dark:border-red-900/30">
                    <HugeIcon className="ph-bold ph-file-text" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-gray-900 dark:text-zinc-100 truncate max-w-[220px]">
                      Narrative Report
                    </p>
                    <p className="text-[11px] text-gray-400 dark:text-zinc-500 truncate max-w-[220px]">
                      {selectedPostEvent.narrative_original_filename || "Narrative-Report.pdf"}
                    </p>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  title="Inspect Narrative Accomplishment Report"
                  className="h-8 px-3 text-xs font-semibold rounded-lg border border-border dark:border-border bg-white dark:bg-zinc-800 text-pup-maroon dark:text-red-400 hover:bg-gray-50 dark:hover:bg-zinc-700 cursor-pointer shadow-2xs shrink-0"
                  onClick={() => {
                    handleOpenPdfPreview?.({
                      url: `/api/osas/post-event-reports/${selectedPostEvent.id}?file=narrative`,
                      title: `${selectedPostEvent.event_title}: Narrative Report`,
                      subtitle: "Official post-event narrative & accomplishment report.",
                      docType: "Post-Event Narrative",
                      originalFilename: selectedPostEvent.narrative_original_filename || "Narrative.pdf",
                    });
                  }}
                >
                  <HugeIcon className="ph-bold ph-eye mr-1.5 text-xs" />
                  <span>Inspect Narrative</span>
                </Button>
              </div>

              {/* Financial Liquidation Row */}
              <div className="rounded-xl border border-border/80 dark:border-border bg-gray-50/60 dark:bg-zinc-900/40 p-3.5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-lg shrink-0 shadow-2xs border border-emerald-100 dark:border-emerald-900/30">
                    <HugeIcon className="ph-bold ph-receipt" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-gray-900 dark:text-zinc-100 truncate max-w-[220px]">
                      Financial Liquidation
                    </p>
                    <p className="text-[11px] text-gray-400 dark:text-zinc-500 truncate max-w-[220px]">
                      {selectedPostEvent.liquidation_original_filename || "Liquidation-Vouchers.pdf"}
                    </p>
                  </div>
                </div>

                {selectedPostEvent.liquidation_storage_filename ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    title="Inspect Financial Liquidation & Vouchers"
                    className="h-8 px-3 text-xs font-semibold rounded-lg border border-border dark:border-border bg-white dark:bg-zinc-800 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-zinc-700 cursor-pointer shadow-2xs shrink-0"
                    onClick={() => {
                      handleOpenPdfPreview?.({
                        url: `/api/osas/post-event-reports/${selectedPostEvent.id}?file=liquidation`,
                        title: `${selectedPostEvent.event_title}: Financial Liquidation`,
                        subtitle: "Official receipts, disbursement summary, and vouchers.",
                        docType: "Financial Liquidation",
                        originalFilename: selectedPostEvent.liquidation_original_filename || "Liquidation.pdf",
                      });
                    }}
                  >
                    <HugeIcon className="ph-bold ph-eye mr-1.5 text-xs" />
                    <span>Inspect Liquidation</span>
                  </Button>
                ) : (
                  <span className="text-[11px] text-gray-400 italic">No file attached</span>
                )}
              </div>
            </div>
          </div>

          {/* SECTION 4: Clearance Evaluation & Decision */}
          <div className="space-y-3.5 pt-2 border-t border-border/80 dark:border-border">
            <div className="flex items-center justify-between">
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-zinc-500">
                Clearance Evaluation
              </h4>
              <span className="text-[11px] text-gray-500 dark:text-zinc-400">
                Current: <strong className="text-gray-900 dark:text-zinc-100">{selectedPostEvent.status}</strong>
              </span>
            </div>

            {/* Quick Stage Selection Pills */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-gray-600 dark:text-zinc-400">
                Clearance Action:
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {availablePostEventStatusOptions.map((opt) => {
                  const isChosen = postEventStatus === opt;
                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => handleSelectStatusPill(opt)}
                      className={cn(
                        "px-2.5 py-1.5 text-xs font-semibold rounded-xl border text-center transition-all cursor-pointer",
                        isChosen
                          ? "bg-slate-900 text-white dark:bg-zinc-100 dark:text-zinc-900 border-slate-900 dark:border-zinc-100 shadow-xs"
                          : "bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 border-border dark:border-border hover:bg-gray-100 dark:hover:bg-zinc-700"
                      )}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Full Stage Select Picker */}
            <div className="space-y-1">
              <Select
                value={postEventStatus}
                onValueChange={(val) => handleSelectStatusPill(val)}
                usePortal={false}
                className="h-9 text-xs font-semibold rounded-xl bg-white dark:bg-zinc-800 border-border text-slate-900 dark:text-zinc-100 shadow-none cursor-pointer"
                buttonClassName="h-9 text-xs font-semibold rounded-xl bg-white dark:bg-zinc-800 border-border text-slate-900 dark:text-zinc-100"
              >
                {availablePostEventStatusOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    Move to: {opt}
                  </option>
                ))}
              </Select>
            </div>

            {/* Contextual Warning */}
            {isRevokingClearance && (
              <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-3 text-xs text-amber-900 dark:border-amber-800/40 dark:bg-amber-950/30 dark:text-amber-300 flex items-start gap-2.5">
                <HugeIcon className="ph-bold ph-warning text-base text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <p className="font-semibold text-amber-950 dark:text-amber-200">
                    Revoking Clearance
                  </p>
                  <p className="text-[11px] leading-relaxed text-amber-800 dark:text-amber-300/90">
                    Revokes approved clearance and returns report to evaluation. Written justification note (min 5 chars) is mandatory.
                  </p>
                </div>
              </div>
            )}

            {isRequestingRevision && (
              <div className="rounded-xl border border-sky-200 bg-sky-50/80 p-3 text-xs text-sky-900 dark:border-sky-800/40 dark:bg-sky-950/30 dark:text-sky-300 flex items-start gap-2.5">
                <HugeIcon className="ph-bold ph-info text-base text-sky-600 dark:text-sky-400 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <p className="font-semibold text-sky-950 dark:text-sky-200">
                    Revision Instructions Required
                  </p>
                  <p className="text-[11px] leading-relaxed text-sky-800 dark:text-sky-300/90">
                    Provide detailed instructions specifying what receipts or narrative items need amendment.
                  </p>
                </div>
              </div>
            )}

            {/* Remarks Textarea */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px]">
                <span className={cn("font-semibold", isPostEventNoteRequired ? "text-pup-maroon dark:text-red-400" : "text-slate-600 dark:text-zinc-400")}>
                  Feedback & Clearance Remarks {isPostEventNoteRequired && "(Required, min 5 chars)"}
                </span>
                {isPostEventNoteRequired && (
                  <span className={cn("font-mono text-[10px]", isPostEventNoteValid ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400")}>
                    {postEventNote.trim().length} / 5 min
                  </span>
                )}
              </div>
              <textarea
                className={cn(
                  "min-h-24 w-full rounded-xl border bg-white p-3 text-xs text-slate-900 placeholder:text-slate-400 outline-none transition-colors dark:bg-zinc-900 dark:text-zinc-100",
                  isPostEventNoteRequired && !isPostEventNoteValid
                    ? "border-amber-400 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 dark:border-amber-600"
                    : "border-border focus:border-pup-maroon focus:ring-1 focus:ring-pup-maroon dark:border-border"
                )}
                placeholder={
                  isPostEventNoteRequired
                    ? "Enter required justification or revision instructions for student officers..."
                    : "Enter feedback or clearance remarks for student officers..."
                }
                value={postEventNote}
                onChange={(e) => setPostEventNote(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* STICKY SHEET FOOTER */}
        <SheetFooter className="shrink-0 p-4 px-6 border-t border-border dark:border-border bg-gray-50/70 dark:bg-zinc-900/40 flex flex-row items-center justify-between gap-3">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="h-10 px-5 text-xs font-semibold rounded-xl border border-border dark:border-border bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-xs cursor-pointer active:scale-95 transition-all"
          >
            Close
          </Button>

          <Button
            className="h-10 px-6 text-xs font-semibold rounded-xl btn-brand-red text-white! bg-pup-maroon hover:bg-pup-darkMaroon shadow-xs cursor-pointer active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ color: "#ffffff" }}
            onClick={() => savePostEvent?.()}
            disabled={isSavingPostEvent || !isPostEventNoteValid}
          >
            {isSavingPostEvent ? (
              <>
                <HugeIcon className="ph-bold ph-spinner animate-spin mr-2" />
                Saving...
              </>
            ) : postEventStatus === "Cleared" ? (
              "Clear Event Report"
            ) : postEventStatus === "Needs Revision" ? (
              "Request Revision"
            ) : postEventStatus === "Declined" ? (
              "Decline Report"
            ) : postEventStatus === "Under Review" ? (
              "Mark Under Review"
            ) : (
              "Update Evaluation"
            )}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
