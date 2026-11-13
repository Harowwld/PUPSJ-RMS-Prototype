"use client";
import SheetPreviewButton from "@/components/shared/SheetPreviewButton";
import SheetPagination from "@/components/shared/SheetPagination";
import CampusStatusNotice from "@/components/student/CampusStatusNotice";
import {
  OsasSheetInfoRow as InfoRow,
  OsasSheetSectionHeading as SectionHeading,
  OsasSheetSummaryBadge,
} from "./OsasReviewSheetMetadata";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";

import { cn } from "@/lib/utils";

import { NarrativePersonBadge } from "@/components/shared/NarrativeText";
import { getOsasRecordReference } from "@/lib/osasRecordReference";
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
} from "@/components/staff/OsasMonitoringTab";
import {
  Alert02Icon, Building01Icon, Calendar01Icon, Cancel01Icon, ClipboardIcon,
  Coins01Icon, CovidInfoIcon, File02Icon, Loading01Icon, Mail01Icon,
  Tag01Icon, UserIcon, UserSearch01Icon,
} from "hugeicons-react";
import AppIcon from "@/components/ui/app-icon";
const CLEARED_NOTICE = {
  title: "Post-Event Report Cleared",
  message: "OSAS cleared the narrative and liquidation report.",
};
const REVISION_NOTICE = {
  title: "Revision Required",
  message: "The student organization must revise and resubmit the requested documents or report details.",
};
const DECLINED_NOTICE = {
  title: "Post-Event Report Declined",
  message: "OSAS declined this post-event report.",
};

const POST_EVENT_STATUS_NOTICES = {
  Cleared: CLEARED_NOTICE,
  Approved: CLEARED_NOTICE,
  Completed: CLEARED_NOTICE,
  "Needs Revision": REVISION_NOTICE,
  RevisionRequested: REVISION_NOTICE,
  Declined: DECLINED_NOTICE,
  Rejected: DECLINED_NOTICE,
  Submitted: { title: "Report Submitted", message: "The post-event report is awaiting OSAS review." },
};

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

  const statusNotice = POST_EVENT_STATUS_NOTICES[selectedPostEvent.status] ?? {
    title: "Under Financial Review",
    message: "OSAS is reviewing the post-event report and liquidation documents.",
  };

  const trackingNo =
    selectedPostEvent.event_tracking_number ||
    (selectedPostEvent.event_proposal_id != null ? `EVT-${selectedPostEvent.event_proposal_id}` : null);
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
        className="w-full sm:max-w-md md:max-w-lg lg:max-w-xl flex flex-col h-full p-0 overflow-hidden"
      >
        <SheetHeader className="shrink-0 p-0">
          <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4">
            <div>
              <SheetTitle>
                Post-Event Clearance Details
              </SheetTitle>
              <SheetDescription className="sr-only">
                Detailed information and evaluation for post-event clearance
              </SheetDescription>
            </div>

            <div className="ml-auto flex items-center gap-3">
              {typeof totalCount === "number" && totalCount > 1 && (
                <SheetPagination
                  compact
                  label="Record navigation"
                  page={Math.max(1, (currentIndex ?? 0) + 1)}
                  totalPages={totalCount}
                  onPrevious={onNavigatePrev}
                  onNext={onNavigateNext}
                  previousDisabled={currentIndex <= 0}
                  nextDisabled={currentIndex >= totalCount - 1}
                  previousLabel="Previous Report"
                  nextLabel="Next Report"
                />
              )}

              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="size-8 rounded-full bg-black/[0.04] hover:bg-black/[0.08] dark:bg-white/[0.08] dark:hover:bg-white/[0.14] text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-zinc-100 flex items-center justify-center transition-all cursor-pointer active:scale-95 border border-black/[0.04] dark:border-white/[0.08] shadow-2xs"
                aria-label="Close"
                title="Close"
              >
                <Cancel01Icon size="1em" className="text-sm" />
              </button>
            </div>
          </div>
        </SheetHeader>

        <CampusStatusNotice title={statusNotice.title}>
          {statusNotice.message}
        </CampusStatusNotice>

        {/* SCROLLABLE 1-COLUMN BODY */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="border-b border-border pb-4">
            <h3 className="min-w-0 wrap-anywhere text-sm font-bold leading-snug text-gray-900 dark:text-zinc-100">
              {selectedPostEvent.event_title}
            </h3>
          </div>

          <section className="space-y-2">
            <SectionHeading icon={ClipboardIcon} title="Clearance Specification" />
            <dl className="divide-y divide-gray-100/70 dark:divide-zinc-800/50">
              <InfoRow icon={Building01Icon} label="Organization" value={selectedPostEvent.organization_name} />
              <InfoRow icon={UserIcon} label="Submitter">
                <NarrativePersonBadge
                  name={proponentName}
                  avatarId={selectedPostEvent.student_no || selectedPostEvent.student_account_id}
                />
              </InfoRow>
              <InfoRow icon={Mail01Icon} label="Email Address" value={selectedPostEvent.submitted_by_email} />
              <InfoRow icon={Tag01Icon} label="Report ID">
                <Badge variant="gray" size="compact" className="rounded-lg tabular-nums">
                  {getOsasRecordReference(selectedPostEvent, "post_events")}
                </Badge>
              </InfoRow>
              {trackingNo && (
                <InfoRow icon={Tag01Icon} label="Proposal ID">
                  <Badge variant="gray" size="compact" className="rounded-lg tabular-nums">
                    {trackingNo}
                  </Badge>
                </InfoRow>
              )}
              <InfoRow icon={ClipboardIcon} label="Clearance Status">
                <Badge variant="gray" size="compact" className={getPostEventStatusBadgeClass(selectedPostEvent.status)}>
                  {selectedPostEvent.status}
                </Badge>
              </InfoRow>
              <InfoRow
                icon={UserSearch01Icon}
                label="Actual Attendance"
                value={`${Number(attendeesCount).toLocaleString()} verified attendees`}
              />
              <InfoRow
                icon={Coins01Icon}
                label="Liquidated Spend"
                value={`₱${expensesAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
              />
              <InfoRow icon={Calendar01Icon} label="Date Submitted" value={dateSubmittedStr} />
            </dl>
          </section>

          {/* SECTION 2: Accomplishment Narrative & Previous Remarks */}
          <div className="space-y-3 pt-2">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-zinc-500">
              Narrative & Evaluation History
            </h4>

            {/* Narrative summary */}
            {selectedPostEvent.narrative_summary && (
              <div className="space-y-1.5 pt-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-zinc-500">
                  Accomplishment & Narrative Summary
                </span>
                <p className="text-xs text-gray-700 dark:text-zinc-300 leading-relaxed whitespace-pre-wrap">
                  {selectedPostEvent.narrative_summary}
                </p>
              </div>
            )}

            {/* Previous Review Remarks */}
            {(selectedPostEvent.review_note || selectedPostEvent.review_notes) && (
              <div className="rounded-xl border border-border/70 dark:border-border/60 bg-gray-50/70 dark:bg-zinc-800/40 p-3.5 space-y-1.5">
                <div className="flex items-center justify-between text-[11px] text-gray-400 dark:text-zinc-500 pb-1.5 border-b border-border/80 dark:border-border">
                  <span>
                    Previous Evaluation by:{" "}
                    <strong className="text-gray-700 dark:text-zinc-300">
                      {selectedPostEvent.reviewer_name || "OSAS Officer"}
                    </strong>
                  </span>
                  {selectedPostEvent.reviewed_at && (
                    <span className="tabular-nums">
                      {new Date(selectedPostEvent.reviewed_at).toLocaleDateString()}
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-700 dark:text-zinc-300 leading-relaxed">
                  {selectedPostEvent.review_note || selectedPostEvent.review_notes}
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
              <div className="rounded-xl border border-border/70 dark:border-border/60 bg-gray-50/70 dark:bg-zinc-800/40 p-3.5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-red-50 dark:bg-red-950/40 text-pup-maroon dark:text-red-400 flex items-center justify-center text-lg shrink-0 shadow-2xs border border-red-100 dark:border-red-900/30">
                    <File02Icon size={16}  />
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

                <SheetPreviewButton
                  label="Preview Narrative Report"
                  onClick={() => {
                    handleOpenPdfPreview?.({
                      url: `/api/osas/post-event-reports/${selectedPostEvent.id}?file=narrative`,
                      title: `${selectedPostEvent.event_title}: Narrative Report`,
                      subtitle: "Official post-event narrative & accomplishment report.",
                      docType: "Post-Event Narrative",
                      originalFilename: selectedPostEvent.narrative_original_filename || "Narrative.pdf",
                    });
                  }}
                />
              </div>

              {/* Financial Liquidation Row */}
              <div className="rounded-xl border border-border/70 dark:border-border/60 bg-gray-50/70 dark:bg-zinc-800/40 p-3.5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-lg shrink-0 shadow-2xs border border-emerald-100 dark:border-emerald-900/30">
                    <AppIcon className=" Invoice01Icon" />
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
                  <SheetPreviewButton
                    label="Preview Financial Liquidation"
                    onClick={() => {
                      handleOpenPdfPreview?.({
                        url: `/api/osas/post-event-reports/${selectedPostEvent.id}?file=liquidation`,
                        title: `${selectedPostEvent.event_title}: Financial Liquidation`,
                        subtitle: "Official receipts, disbursement summary, and vouchers.",
                        docType: "Financial Liquidation",
                        originalFilename: selectedPostEvent.liquidation_original_filename || "Liquidation.pdf",
                      });
                    }}
                  />
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
              <OsasSheetSummaryBadge icon={Calendar01Icon}>
                Current: {selectedPostEvent.status}
              </OsasSheetSummaryBadge>
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
                <Alert02Icon size="1em" className="text-base text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
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
                <CovidInfoIcon size="1em" className="text-base text-sky-600 dark:text-sky-400 shrink-0 mt-0.5" />
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
                  <span className={cn("tabular-nums text-[10px]", isPostEventNoteValid ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400")}>
                    {postEventNote.trim().length} / 5 min
                  </span>
                )}
              </div>
              <Textarea
                className={cn(
                  "min-h-24",
                  isPostEventNoteRequired && !isPostEventNoteValid && "border-amber-400 dark:border-amber-600"
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
        <SheetFooter className="shrink-0 p-4 px-6 flex flex-row items-center justify-between gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>

          <Button
            size="sm"
            className="h-9 px-4 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={() => savePostEvent?.()}
            disabled={isSavingPostEvent || !isPostEventNoteValid}
          >
            {isSavingPostEvent ? (
              <>
                <Loading01Icon size={16} className="animate-spin mr-2" />
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
