"use client";
import SheetSectionHeading from "@/components/shared/SheetSectionHeading";
import SheetEvaluationTimeline from "@/components/shared/SheetEvaluationTimeline";
import SheetPreviewButton from "@/components/shared/SheetPreviewButton";
import SheetPagination from "@/components/shared/SheetPagination";
import CampusStatusNotice from "@/components/student/CampusStatusNotice";
import {
  OsasSheetInfoRow as InfoRow,
  OsasSheetSummaryBadge,
} from "./OsasReviewSheetMetadata";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";

import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card";
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
  normalizeProposalStatus,
  getProposalStatusBadgeClass,
  getPostEventStatusBadgeClass,
} from "@/components/staff/OsasMonitoringTab";
import { NarrativePersonBadge } from "@/components/shared/NarrativeText";
import PDFPreview from "@/components/shared/PDFPreview";
import {
  ArrowRight02Icon, BookOpen01Icon, Building01Icon, Calendar01Icon,
  Cancel01Icon, Clock01Icon, Coins01Icon, CovidInfoIcon, File02Icon, HourglassIcon,
  Loading01Icon, Location01Icon, Mail01Icon, Tag01Icon, UserCircleIcon,
  UserIcon, UserSearch01Icon,
} from "hugeicons-react";
import { EmptyState } from "@/components/ui/empty";
const PROPOSAL_STATUS_NOTICES = {
  Approved: { tone: "success", title: "Proposal Approved", message: "OSAS has approved this event proposal." },
  "Needs Revision": { tone: "warning", title: "Revision Required", message: "The proponent must revise and resubmit the proposal based on the evaluator’s notes." },
  Declined: { tone: "danger", title: "Proposal Declined", message: "OSAS declined this event proposal." },
  Submitted: { tone: "info", title: "Proposal Submitted", message: "The proposal is awaiting OSAS review." },
  Archived: { tone: "info", title: "Proposal Archived", message: "This proposal is in the archive." },
};

export default function OsasProposalReviewSheet({
  sheetOpen,
  setSheetOpen,
  selected,
  setSelected,
  currentIndex,
  totalCount,
  onNavigatePrev,
  onNavigateNext,
  status,
  setStatus,
  note,
  setNote,
  save,
  isSaving,
  availableStatusOptions = [],
  isRevokingApproval,
  isReopeningDeclined,
  isRequestingRevision,
  isNoteRequired,
  isNoteValid,
  handleOpenPdfPreview,
  setPdfPreviewData,
  setPdfPreviewOpen,
  setActiveStream,
  setSearchQuery,
}) {
  if (!selected) return null;

  const eventCount = selected.updates?.length ?? 0;
  const statusNotice = PROPOSAL_STATUS_NOTICES[normalizeProposalStatus(selected.status)] ?? {
    title: "Under Evaluation",
    message: "OSAS is reviewing the proposal.",
  };

  const eventDateStr = selected.event_date
    ? new Date(selected.event_date).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : null;

  const submittedDateStr = selected.created_at
    ? new Date(selected.created_at).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "N/A";

  const handleSelectStatusPill = (val) => {
    setStatus(val);
    if (val === "Needs Revision") {
      if (!note.trim() || note.startsWith("Status updated")) {
        setNote("");
      }
    } else if (!note.trim() && val !== "Needs Revision") {
      setNote(`Status updated to ${val} by OSAS.`);
    }
  };

  return (
    <Sheet
      open={sheetOpen}
      onOpenChange={(open) => {
        setSheetOpen(open);
        if (!open) setSelected(null);
      }}
    >
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
                Event Proposal Details
              </SheetTitle>
              <SheetDescription className="sr-only">
                Detailed information and evaluation for event proposal
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
                  previousLabel="Previous Proposal"
                  nextLabel="Next Proposal"
                />
              )}

              <button
                type="button"
                onClick={() => {
                  setSheetOpen(false);
                  setSelected?.(null);
                }}
                className="size-8 rounded-full bg-black/[0.04] hover:bg-black/[0.08] dark:bg-white/[0.08] dark:hover:bg-white/[0.14] text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-zinc-100 flex items-center justify-center transition-all cursor-pointer active:scale-95 border border-black/[0.04] dark:border-white/[0.08] shadow-2xs"
                aria-label="Close"
                title="Close"
              >
                <Cancel01Icon size="1em" className="text-sm" />
              </button>
            </div>
          </div>
        </SheetHeader>

        <CampusStatusNotice tone={statusNotice.tone ?? "info"} title={statusNotice.title}>
          {statusNotice.message}
        </CampusStatusNotice>

        {/* SCROLLABLE 1-COLUMN BODY */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="border-b border-border pb-4">
            <h3 className="min-w-0 wrap-anywhere text-sm font-bold leading-snug text-gray-900 dark:text-zinc-100">
              {selected.title}
            </h3>
          </div>

          <section className="space-y-2">
            <SheetSectionHeading icon={Building01Icon} title="Organization Information" />
            <dl className="divide-y divide-gray-100/70 dark:divide-zinc-800/50">
              <InfoRow icon={Building01Icon} label="Organization" value={selected.verified_org_name || selected.organization_name} />
              <InfoRow icon={UserIcon} label="Proponent">
                <div className="flex flex-wrap items-center gap-2">
                  {selected.student_name ? (
                    <NarrativePersonBadge
                      name={selected.student_name}
                      avatarId={selected.student_no || selected.student_account_id}
                    />
                  ) : "N/A"}
                  {selected.is_verified_officer && (
                    <Badge variant="success" size="compact">Verified Officer</Badge>
                  )}
                </div>
              </InfoRow>
              {selected.officer_position && <InfoRow icon={UserCircleIcon} label="Officer Position" value={selected.officer_position} />}
              <InfoRow icon={Tag01Icon} label="Student Number" value={selected.student_no} />
              <InfoRow icon={Mail01Icon} label="Email Address" value={selected.submitted_by_email} />
            </dl>

            <Card variant="flat" size="sm">
              <CardContent className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0 flex-1 basis-44 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <CardTitle>
                      <h5 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider">
                        <BookOpen01Icon size={14} aria-hidden="true" className="shrink-0 text-gray-400 dark:text-zinc-500" />
                        Constitution &amp; By-Laws
                      </h5>
                    </CardTitle>
                    {selected.bylaws_filename && (
                      <Badge variant="success" size="compact">Active</Badge>
                    )}
                  </div>
                  {selected.bylaws_filename && (
                    <CardDescription className="wrap-anywhere">
                      {selected.bylaws_original_filename || selected.bylaws_filename}
                    </CardDescription>
                  )}
                </div>

                {!selected.bylaws_filename && (
                  <EmptyState
                    variant="compact"
                    icon={BookOpen01Icon}
                    title="No Active By-Laws on File"
                    description="This organization has no approved Constitution & By-Laws available to review."
                  />
                )}

                {selected.bylaws_filename && selected.organization_id && (
                  <SheetPreviewButton
                    label="Preview Constitution & By-Laws"
                    onClick={() => {
                      setPdfPreviewData?.({
                        url: `/api/osas/organizations/${selected.organization_id}/bylaws?file=1`,
                        title: `${selected.organization_name || "Organization"}: Constitution & By-Laws`,
                        subtitle: "Active ratified charter for this student organization.",
                        docType: "Constitution & By-Laws",
                        originalFilename: selected.bylaws_original_filename || "CBL.pdf",
                      });
                      setPdfPreviewOpen?.(true);
                    }}
                  />
                )}
              </CardContent>
            </Card>
          </section>

          <section className="space-y-2">
            <SheetSectionHeading icon={BookOpen01Icon} title="Proposal Specification" />
            <dl className="divide-y divide-gray-100/70 dark:divide-zinc-800/50">
              <InfoRow icon={Tag01Icon} label="Proposal Status">
                <Badge variant="gray" size="compact" className={getProposalStatusBadgeClass(selected.status)}>
                  {selected.status}
                </Badge>
              </InfoRow>
              <InfoRow icon={Calendar01Icon} label="Target Date" value={eventDateStr || "To Be Announced"} />

              <InfoRow
                icon={UserSearch01Icon}
                label="Target Attendance"
                value={selected.target_attendance ? `${Number(selected.target_attendance).toLocaleString()} attendees` : "—"}
              />

              <InfoRow
                icon={Coins01Icon}
                label="Proposed Budget"
                value={
                  selected.estimated_budget
                    ? `₱${Number(selected.estimated_budget).toLocaleString(undefined, { minimumFractionDigits: 0 })}`
                    : "—"
                }
              />

              <InfoRow icon={Location01Icon} label="Venue" value={selected.venue || "None specified"} />

              <InfoRow icon={Clock01Icon} label="Date Submitted" value={submittedDateStr} />
            </dl>
          </section>

          {/* SECTION 2: Objectives & Charter Compliance */}
          <div className="space-y-3 pt-2">
            <SheetSectionHeading icon={CovidInfoIcon} title="Overview & Compliance" />

            {/* Description / Summary if available */}
            {selected.description && (
              <div className="space-y-1.5 pt-1">
                <SheetSectionHeading icon={File02Icon} title="Event Description & Objectives" />
                <p className="text-xs text-gray-700 dark:text-zinc-300 leading-relaxed whitespace-pre-wrap">
                  {selected.description}
                </p>
              </div>
            )}

            {/* Post-Event Clearance Tracker (Visible for Approved Proposals) */}
            {selected.status === "Approved" && (
              <div className="rounded-xl border border-purple-200 dark:border-purple-900/40 bg-purple-50/40 dark:bg-purple-950/20 p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <HourglassIcon size={16} className="text-purple-700 dark:text-purple-400" />
                    <span className="text-xs font-bold uppercase tracking-wider text-purple-900 dark:text-purple-200">
                      Post-Event Compliance
                    </span>
                  </div>
                  <Badge variant="gray" size="compact" className={getPostEventStatusBadgeClass(selected.post_event_status || "Pending Submission")}>
                    {selected.post_event_status || "Pending Submission"}
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-xs text-purple-800 dark:text-purple-300 pt-1 border-t border-purple-200/60 dark:border-purple-900/40">
                  <span>
                    Due:{" "}
                    <strong className="font-sans tabular-nums">
                      {selected.post_event_due_date
                        ? new Date(selected.post_event_due_date).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })
                        : "N/A"}
                    </strong>
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setSheetOpen(false);
                      setActiveStream?.("post_events");
                      setSearchQuery?.(selected.tracking_number || selected.title);
                    }}
                    title="Open in Post-Event Clearance Queue"
                    className="text-xs font-semibold text-purple-700 dark:text-purple-300 hover:underline cursor-pointer flex items-center gap-1"
                  >
                    <span>Open Tracker</span>
                    <ArrowRight02Icon size="1em" className="text-[10px]" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* SECTION 3: Official Proposal Document Preview */}
          <div className="space-y-2.5 pt-2">
            <SheetSectionHeading icon={File02Icon} title="Official Proposal Document">
              {(selected.id || selected.url) && (
                <SheetPreviewButton
                  label="Preview Proposal PDF"
                  onClick={() => handleOpenPdfPreview?.(selected)}
                />
              )}
            </SheetSectionHeading>

            {selected.id ? (
              <div className="relative h-[clamp(480px,65dvh,640px)] w-full overflow-hidden rounded-xl border border-border bg-gray-50 dark:bg-zinc-900">
                <PDFPreview src={`/api/osas/event-proposals/${selected.id}?file=1`} title={selected.title || "Official submission PDF"} />
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">No inline document preview available.</p>
            )}
          </div>

          {selected.versions?.length > 1 && (
            <details className="rounded-xl border border-border/70 dark:border-border/60 bg-gray-50/70 dark:bg-zinc-800/40">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2.5 text-xs font-semibold text-gray-700 dark:text-zinc-200">
                <span className="flex items-center gap-2 font-bold uppercase tracking-wider">
                  <File02Icon size={14} aria-hidden="true" className="shrink-0 text-pup-maroon dark:text-red-400" />
                  Submitted PDF Versions
                </span>
                <span className="font-sans tabular-nums text-[11px] font-medium text-gray-500 dark:text-zinc-400">
                  {selected.versions.length}
                </span>
              </summary>
              <div className="space-y-2 px-3 pb-3">
                {[...selected.versions].reverse().map((version, index) => (
                  <div key={version.id} className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-white px-2.5 py-2 dark:bg-zinc-900/40">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-gray-800 dark:text-zinc-100">
                        Revision {version.revision_number}{index === 0 ? " · Current" : ""}
                      </p>
                      <p className="truncate text-[11px] text-gray-500 dark:text-zinc-400" title={version.original_filename}>
                        {version.original_filename} · {version.created_at ? new Date(version.created_at).toLocaleDateString() : "Date unavailable"}
                      </p>
                    </div>
                    {version.file_pruned_at ? (
                      <span className="shrink-0 text-[10px] font-medium text-gray-400 dark:text-zinc-500">PDF removed after approval</span>
                    ) : (
                      <SheetPreviewButton
                        label={`Preview Proposal Revision ${version.revision_number}`}
                        onClick={() => {
                          setPdfPreviewData?.({
                            url: `/api/osas/event-proposals/${selected.id}?file=1&revisionId=${version.id}`,
                            title: `${selected.title} · Revision ${version.revision_number}`,
                            subtitle: `Submitted for ${selected.organization_name || "OSAS"}.`,
                            docType: "Event Proposal",
                            originalFilename: version.original_filename || "Proposal.pdf",
                          });
                          setPdfPreviewOpen?.(true);
                        }}
                      />
                    )}
                  </div>
                ))}
              </div>
            </details>
          )}

          {/* SECTION 4: Evaluation & Stage Decision */}
          <div className="space-y-3.5 pt-2">
            <SheetSectionHeading icon={Calendar01Icon} title="Evaluation & Decision">
              <OsasSheetSummaryBadge icon={Calendar01Icon}>
                Stage: {selected.status}
              </OsasSheetSummaryBadge>
            </SheetSectionHeading>

            {/* Quick Stage Selection Pills */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-gray-600 dark:text-zinc-400">
                Select Stage Action:
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {availableStatusOptions.map((opt) => {
                  const isChosen = status === opt;
                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => handleSelectStatusPill(opt)}
                      className={cn(
                        "px-2.5 py-1.5 text-xs font-semibold rounded-xl border text-center transition-all cursor-pointer",
                        isChosen
                          ? "bg-[var(--brand-accent,#800000)] text-[color:var(--brand-foreground,#ffffff)] border-[var(--brand-accent,#800000)] shadow-xs"
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
                value={status}
                onValueChange={(val) => handleSelectStatusPill(val)}
                usePortal={false}
                className="h-9 text-xs font-semibold rounded-xl bg-white dark:bg-zinc-800 border-border text-slate-900 dark:text-zinc-100 shadow-none cursor-pointer"
                buttonClassName="h-9 text-xs font-semibold rounded-xl bg-white dark:bg-zinc-800 border-border text-slate-900 dark:text-zinc-100"
              >
                {availableStatusOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    Move to: {opt}
                  </option>
                ))}
              </Select>
            </div>

            {/* Contextual Warning / Guidance Callouts */}
            {isRevokingApproval && (
              <CampusStatusNotice tone="warning" title="Revoking Official Approval">
                Cancels post-event compliance tracking for this organization and returns proposal to evaluation. Justification note (min 5 chars) is mandatory.
              </CampusStatusNotice>
            )}

            {isReopeningDeclined && (
              <CampusStatusNotice tone="info" title="Reopening Declined Proposal">
                A written justification note citing grounds for reconsideration is required.
              </CampusStatusNotice>
            )}

            {isRequestingRevision && (
              <CampusStatusNotice tone="warning" title="Revision Instructions Required">
                Provide detailed instructions explaining what documents or aspects must be updated by the student organization.
              </CampusStatusNotice>
            )}

            {/* Justification / Remarks Textarea */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px]">
                <span className={cn("font-semibold", isNoteRequired ? "text-pup-maroon dark:text-red-400" : "text-slate-600 dark:text-zinc-400")}>
                  Remarks & Instructions {isNoteRequired && "(Required, min 5 chars)"}
                </span>
                {isNoteRequired && (
                  <span className={cn("font-sans tabular-nums text-[10px]", isNoteValid ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400")}>
                    {note.trim().length} / 5 min
                  </span>
                )}
              </div>
              <Textarea
                className={cn(
                  "min-h-24",
                  isNoteRequired && note.trim().length < 5 && "border-amber-400 dark:border-amber-600"
                )}
                placeholder={
                  isNoteRequired
                    ? "Enter required justification or revision instructions for the organization..."
                    : "Enter student-visible evaluation remarks (optional, default note applied if blank)..."
                }
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>
          </div>

          <section className="space-y-3">
            <SheetSectionHeading icon={Clock01Icon} title="Evaluation Timeline & Updates">
              <OsasSheetSummaryBadge icon={Clock01Icon}>
                {eventCount} {eventCount === 1 ? "update" : "updates"}
              </OsasSheetSummaryBadge>
            </SheetSectionHeading>
            <SheetEvaluationTimeline updates={selected.updates} />
          </section>
        </div>

        {/* STICKY SHEET FOOTER */}
        <SheetFooter className="shrink-0 p-4 px-6 flex flex-row items-center justify-between gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSheetOpen(false);
              setSelected?.(null);
            }}
            className="h-9 px-4 text-xs font-semibold rounded-xl border border-border dark:border-border bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-xs cursor-pointer active:scale-95 transition-all"
          >
            Close
          </Button>

          <Button
            size="sm"
            className="h-9 px-4 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={() => save?.()}
            disabled={isSaving || !isNoteValid}
          >
            {isSaving ? (
              <>
                <Loading01Icon size={16} className="animate-spin mr-2" />
                Saving...
              </>
            ) : isRevokingApproval ? (
              "Revoke Approval"
            ) : isReopeningDeclined ? (
              "Reopen Proposal"
            ) : status === "Approved" ? (
              "Approve Proposal"
            ) : status === "Needs Revision" ? (
              "Request Revision"
            ) : status === "Declined" ? (
              "Decline Proposal"
            ) : status === "Under Review" ? (
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
