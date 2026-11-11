"use client";
import SheetPagination from "@/components/shared/SheetPagination";
import { PDF_ACTION_LABELS } from "@/lib/pdfPreview";
import { Textarea } from "@/components/ui/textarea";

import { cn } from "@/lib/utils";
import { BADGE_BASE, BADGE_PALETTES } from "@/lib/badgeStyles";

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
  getProposalStatusBadgeClass,
  getProposalStatusDotClass,
  getPostEventStatusBadgeClass,
} from "@/components/staff/OsasMonitoringTab";
import NarrativeText from "@/components/shared/NarrativeText";
import PDFPreview from "@/components/shared/PDFPreview";
import {
  Alert02Icon, ArrowRight02Icon, BookOpen01Icon, Building01Icon, Calendar01Icon,
  Cancel01Icon, Clock01Icon, Coins01Icon, CovidInfoIcon, File02Icon, HourglassIcon,
  Loading01Icon, Location01Icon, Mail01Icon, ReloadIcon, Tag01Icon, UserCircleIcon,
  UserIcon, UserSearch01Icon, ViewIcon,
} from "hugeicons-react";
import AppIcon from "@/components/ui/app-icon";
function SectionHeading({ icon: Icon, title, children }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/80 pb-1.5 dark:border-border">
      <div className="flex items-center gap-2">
        <Icon size="1em" aria-hidden="true" className="shrink-0 text-sm text-pup-maroon dark:text-red-400" />
        <h4 className="text-xs font-bold uppercase tracking-wider text-gray-800 dark:text-zinc-200">
          {title}
        </h4>
      </div>
      {children}
    </div>
  );
}

function InfoRow({ icon: Icon, label, value, children }) {
  return (
    <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] items-start gap-1 py-1.5 text-xs sm:grid-cols-[10rem_minmax(0,1fr)]">
      <dt className="flex min-w-0 items-start gap-2 font-medium text-gray-500 dark:text-zinc-400">
        <Icon size={14} aria-hidden="true" className="mt-px shrink-0 text-gray-400 dark:text-zinc-500" />
        <span className="min-w-0">{label}</span>
        <span aria-hidden="true" className="ml-auto w-3 shrink-0 select-none text-gray-300 dark:text-zinc-600">:</span>
      </dt>
      <dd className="min-w-0 wrap-anywhere font-semibold text-gray-900 dark:text-zinc-100">
        {children ?? (value || "N/A")}
      </dd>
    </div>
  );
}

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

        {/* Line-Attached Edge-to-Edge Status Notice */}
        <div
          className={cn(
            "flex items-center gap-2.5 px-6 py-2.5 text-xs border-b transition-colors shrink-0",
            selected.status === "Approved"
              ? "border-emerald-200/90 bg-emerald-50/90 text-emerald-950 dark:border-emerald-900/40 dark:bg-emerald-950/25 dark:text-emerald-200"
              : selected.status === "RevisionRequested"
              ? "border-amber-200/90 bg-amber-50/90 text-amber-950 dark:border-amber-900/40 dark:bg-amber-950/25 dark:text-amber-200"
              : selected.status === "Rejected"
              ? "border-rose-200/90 bg-rose-50/90 text-rose-950 dark:border-rose-900/40 dark:bg-rose-950/25 dark:text-rose-200"
              : "border-blue-200/90 bg-blue-50/90 text-blue-950 dark:border-blue-900/40 dark:bg-blue-950/25 dark:text-blue-200"
          )}
        >
          <AppIcon
            className={cn(
              " text-[15px] shrink-0",
              selected.status === "Approved"
                ? "Shield01Icon text-emerald-600 dark:text-emerald-400"
                : selected.status === "RevisionRequested"
                ? "Alert01Icon text-amber-600 dark:text-amber-400"
                : selected.status === "Rejected"
                ? "CancelCircleIcon text-rose-600 dark:text-rose-400"
                : "Clock01Icon text-blue-600 dark:text-blue-400"
            )}
          />
          <span className="font-medium text-[11.5px] sm:text-xs leading-normal">
            <strong className="font-semibold">
              {selected.status === "Approved"
                ? "Proposal Sanctioned:"
                : selected.status === "RevisionRequested"
                ? "Revision Requested:"
                : selected.status === "Rejected"
                ? "Proposal Declined:"
                : "Under Evaluation:"}
            </strong>{" "}
            {selected.status === "Approved"
              ? "Official sanction granted for organization event."
              : selected.status === "RevisionRequested"
              ? "Proponent must submit a revised proposal adhering to evaluator notes."
              : selected.status === "Rejected"
              ? "This event proposal was denied university clearance."
              : "Administrative review and risk evaluation in progress by OSAS."}
          </span>
        </div>

        {/* SCROLLABLE 1-COLUMN BODY */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="flex flex-wrap items-start justify-between gap-2 border-b border-border pb-4">
            <h3 className="min-w-0 wrap-anywhere text-sm font-bold leading-snug text-gray-900 dark:text-zinc-100">
              {selected.title}
            </h3>
            <span className={cn(getProposalStatusBadgeClass(selected.status), BADGE_BASE)}>
              {selected.status}
            </span>
          </div>

          <section className="space-y-2">
            <SectionHeading icon={Building01Icon} title="Organization Information" />
            <dl className="divide-y divide-gray-100/70 dark:divide-zinc-800/50">
              <InfoRow icon={Building01Icon} label="Organization" value={selected.verified_org_name || selected.organization_name} />
              <InfoRow icon={UserIcon} label="Proponent">
                <div className="flex flex-wrap items-center gap-2">
                  <span>{selected.student_name || "N/A"}</span>
                  {selected.is_verified_officer && (
                    <span className={cn(BADGE_BASE, BADGE_PALETTES.emerald)}>Verified Officer</span>
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
                      <h5 className="flex items-center gap-2">
                        <BookOpen01Icon size={14} aria-hidden="true" className="shrink-0 text-gray-400 dark:text-zinc-500" />
                        Constitution &amp; By-Laws
                      </h5>
                    </CardTitle>
                    {selected.bylaws_filename && (
                      <span className={cn(BADGE_BASE, BADGE_PALETTES.emerald)}>Active</span>
                    )}
                  </div>
                  {selected.bylaws_filename ? (
                    <CardDescription className="wrap-anywhere">
                      {selected.bylaws_original_filename || selected.bylaws_filename}
                    </CardDescription>
                  ) : (
                    <CardDescription className="font-medium text-amber-800 dark:text-amber-300">No active charter on file</CardDescription>
                  )}
                </div>

                {selected.bylaws_filename && selected.organization_id && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    title={PDF_ACTION_LABELS.preview}
                    className="shrink-0"
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
                  >
                    Inspect CBL
                  </Button>
                )}
              </CardContent>
            </Card>
          </section>

          <section className="space-y-2">
            <SectionHeading icon={BookOpen01Icon} title="Proposal Specification" />
            <dl className="divide-y divide-gray-100/70 dark:divide-zinc-800/50">
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
            <SectionHeading icon={CovidInfoIcon} title="Overview & Compliance" />

            {/* Description / Summary if available */}
            {selected.description && (
              <div className="space-y-1.5 pt-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-zinc-500">
                  Event Description & Objectives
                </span>
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
                  <span
                    className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold", getPostEventStatusBadgeClass(selected.post_event_status || "Pending Submission"), BADGE_BASE)}
                  >
                    {selected.post_event_status || "Pending Submission"}
                  </span>
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
            <SectionHeading icon={File02Icon} title="Official Proposal Document">
              {(selected.id || selected.url) && (
                <Button variant="outline" size="sm" onClick={() => handleOpenPdfPreview?.(selected)}>
                  {PDF_ACTION_LABELS.preview}
                </Button>
              )}
            </SectionHeading>

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
                <span>Submitted PDF versions</span>
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
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
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
                        className="h-8 shrink-0 rounded-lg px-3 text-xs"
                      >
                        {PDF_ACTION_LABELS.preview}
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </details>
          )}

          {/* SECTION 4: Evaluation & Stage Decision */}
          <div className="space-y-3.5 pt-2">
            <SectionHeading icon={Calendar01Icon} title="Evaluation & Decision">
              <span className="text-[11px] text-gray-500 dark:text-zinc-400">
                Stage: <strong className="text-gray-900 dark:text-zinc-100">{selected.status}</strong>
              </span>
            </SectionHeading>

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
              <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-3 text-xs text-amber-900 dark:border-amber-800/40 dark:bg-amber-950/30 dark:text-amber-300 flex items-start gap-2.5">
                <Alert02Icon size="1em" className="text-base text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <p className="font-semibold text-amber-950 dark:text-amber-200">
                    Revoking Official Approval
                  </p>
                  <p className="text-[11px] leading-relaxed text-amber-800 dark:text-amber-300/90">
                    Cancels post-event compliance tracking for this organization and returns proposal to evaluation. Justification note (min 5 chars) is mandatory.
                  </p>
                </div>
              </div>
            )}

            {isReopeningDeclined && (
              <div className="rounded-xl border border-purple-200 bg-purple-50/80 p-3 text-xs text-purple-900 dark:border-purple-800/40 dark:bg-purple-950/30 dark:text-purple-300 flex items-start gap-2.5">
                <ReloadIcon size="1em" className="text-base text-purple-600 dark:text-purple-400 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <p className="font-semibold text-purple-950 dark:text-purple-200">
                    Reopening Declined Proposal
                  </p>
                  <p className="text-[11px] leading-relaxed text-purple-800 dark:text-purple-300/90">
                    A written justification note citing grounds for reconsideration is required.
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
                    Provide detailed instructions explaining what documents or aspects must be updated by the student organization.
                  </p>
                </div>
              </div>
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

          {/* SECTION 5: Audit Timeline */}
          <div className="space-y-3 pt-2">
            <SectionHeading icon={Clock01Icon} title="Audit Timeline">
              <span className="text-[10px] font-semibold text-gray-400 dark:text-zinc-500">
                {selected.updates?.length || 0} events
              </span>
            </SectionHeading>

            {selected.updates?.length > 0 ? (
              <ol className="relative border-l border-border ml-2 pl-4 text-xs space-y-3 dark:border-border">
                {selected.updates.map((update) => (
                  <li key={update.id} className="relative">
                    <div
                      className={cn(
                        "absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-zinc-900 shadow-2xs",
                        getProposalStatusDotClass(update.status)
                      )}
                    />
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={cn("inline-flex items-center rounded-full border px-2 py-0.2 text-[9px]", getProposalStatusBadgeClass(update.status), BADGE_BASE)}
                        >
                          {update.status}
                        </span>
                        {update.actor_name && (
                          <span className="text-[10px] text-gray-500 dark:text-zinc-400 font-medium">
                            by {update.actor_name}
                          </span>
                        )}
                        {update.actor_id && (
                          <span className="font-sans text-[10px] text-gray-400 dark:text-zinc-500 bg-gray-100 dark:bg-zinc-800 px-1 rounded tabular-nums">
                            {update.actor_id}
                          </span>
                        )}
                      </div>
                      {update.created_at && (
                        <span className="text-[10px] text-gray-400 dark:text-zinc-500 font-sans tabular-nums">
                          {new Date(update.created_at).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-700 dark:text-zinc-300 leading-relaxed bg-gray-50/70 dark:bg-zinc-800/40 p-2.5 rounded-xl border border-border/70 dark:border-border/60">
                      <NarrativeText text={update.message} mode="full" />
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <div className="py-4 text-center text-gray-400 dark:text-zinc-500 text-xs">
                No status transitions recorded yet.
              </div>
            )}
          </div>
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
