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
  getProposalStatusBadgeClass,
  getProposalStatusDotClass,
  getPostEventStatusBadgeClass,
  FirstPagePreview,
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
        className="w-full sm:max-w-md md:max-w-lg lg:max-w-xl flex flex-col h-full bg-white dark:bg-card border-l border-border dark:border-border p-0 shadow-2xl overflow-hidden"
      >
        {/* TOP HEADER: Event Proposal Details + < > 01 of XX + X button */}
        <SheetHeader className="shrink-0 p-0 border-b border-border dark:border-border bg-white dark:bg-card">
          <div className="flex items-center justify-between px-6 py-4">
            <div>
              <SheetTitle className="text-base font-bold text-gray-900 dark:text-zinc-50 tracking-tight">
                Event Proposal Details
              </SheetTitle>
              <SheetDescription className="sr-only">
                Detailed information and evaluation for event proposal
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
                    aria-label="Previous Proposal"
                    title="Previous Proposal"
                  >
                    <HugeIcon className="ph-bold ph-caret-left text-xs" />
                  </button>
                  <button
                    type="button"
                    disabled={currentIndex >= totalCount - 1}
                    onClick={onNavigateNext}
                    className="w-7 h-7 rounded-lg border border-border/80 dark:border-border flex items-center justify-center hover:bg-gray-100 dark:hover:bg-zinc-800 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
                    aria-label="Next Proposal"
                    title="Next Proposal"
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
                onClick={() => {
                  setSheetOpen(false);
                  setSelected?.(null);
                }}
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
            <div className="w-12 h-12 rounded-2xl bg-pup-maroon/10 text-pup-maroon dark:bg-red-950/40 dark:text-red-400 flex items-center justify-center text-xl shrink-0 font-bold border border-pup-maroon/20 dark:border-red-900/40 mt-0.5">
              <HugeIcon className="ph-bold ph-calendar-check" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-pup-maroon dark:text-red-400 bg-red-50 dark:bg-red-950/40 px-2 py-0.5 rounded-md border border-red-200/60 dark:border-red-900/40">
                  {selected.org_acronym ? `[${selected.org_acronym}] ` : ""}
                  {selected.verified_org_name || selected.organization_name}
                </span>
                {selected.is_verified_officer && (
                  <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/30 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800/40 flex items-center gap-1">
                    <HugeIcon className="ph-bold ph-shield-check text-xs text-emerald-600" />
                    Verified Officer
                  </span>
                )}
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-semibold shrink-0",
                    getProposalStatusBadgeClass(selected.status)
                  )}
                >
                  <span className={cn("w-1.5 h-1.5 rounded-full", getProposalStatusDotClass(selected.status))} />
                  {selected.status}
                </span>
              </div>
              <h3 className="text-sm font-bold text-gray-900 dark:text-zinc-100 leading-snug break-words">
                {selected.title}
              </h3>
              <div className="flex items-center gap-2 mt-2">
                <ProfileAvatar
                  id={selected.student_no || selected.student_account_id}
                  name={selected.student_name}
                  initials={String(selected.student_name || "Student")
                    .trim()
                    .split(/\s+/)
                    .slice(0, 2)
                    .map((part) => part[0]?.toUpperCase())
                    .join("") || "ST"}
                  className="size-7 border border-pup-maroon/20"
                  fallbackClassName="text-[10px] font-semibold bg-pup-maroon/10 text-pup-maroon dark:bg-red-950/40 dark:text-red-400"
                />
                <p className="text-xs text-gray-500 dark:text-zinc-400 min-w-0 truncate">
                  Proponent: <strong className="text-gray-900 dark:text-zinc-200">{selected.student_name}</strong>
                  {selected.officer_position && ` · ${selected.officer_position}`}
                </p>
              </div>
            </div>
          </div>

          {/* SECTION 1: Event Specification (Unboxed InfoRow) */}
          <div className="space-y-2">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-zinc-500">
              Proposal Specification
            </h4>
            <div className="divide-y divide-gray-100/70 dark:divide-zinc-800/50">
              <InfoRow icon="ph-buildings" label="Organization">
                <span>
                  {selected.organization_name}
                  {selected.org_acronym && (
                    <span className="text-gray-400 font-normal ml-1">({selected.org_acronym})</span>
                  )}
                </span>
              </InfoRow>

              <InfoRow icon="ph-user" label="Proponent">
                <span>
                  {selected.student_name}
                  {selected.officer_position && (
                    <span className="ml-1.5 px-1.5 py-0.5 rounded bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300 text-[10px] font-semibold border border-sky-200/50 dark:border-sky-800/30">
                      {selected.officer_position}
                    </span>
                  )}
                </span>
              </InfoRow>

              <InfoRow icon="ph-identification-badge" label="Student Number" value={selected.student_no} />

              <InfoRow icon="ph-envelope-simple" label="Email Address" value={selected.submitted_by_email || "N/A"} />

              <InfoRow icon="ph-calendar" label="Target Date" value={eventDateStr || "To Be Announced"} />

              <InfoRow
                icon="ph-users"
                label="Target Attendance"
                value={selected.target_attendance ? `${Number(selected.target_attendance).toLocaleString()} attendees` : "—"}
              />

              <InfoRow
                icon="ph-coins"
                label="Proposed Budget"
                value={
                  selected.estimated_budget
                    ? `₱${Number(selected.estimated_budget).toLocaleString(undefined, { minimumFractionDigits: 0 })}`
                    : "—"
                }
              />

              <InfoRow icon="ph-map-pin" label="Venue" value={selected.venue || "None specified"} />

              <InfoRow icon="ph-clock" label="Date Submitted" value={submittedDateStr} />

              <InfoRow icon="ph-chart-pie-slice" label="Current Stage">
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-semibold",
                    getProposalStatusBadgeClass(selected.status)
                  )}
                >
                  <span className={cn("w-1.5 h-1.5 rounded-full", getProposalStatusDotClass(selected.status))} />
                  {selected.status}
                </span>
              </InfoRow>
            </div>
          </div>

          {/* SECTION 2: Objectives & Charter Compliance */}
          <div className="space-y-3 pt-2">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-zinc-500">
              Overview & Compliance
            </h4>

            {/* Description / Summary if available */}
            {selected.description && (
              <div className="rounded-xl border border-border/80 dark:border-border bg-gray-50/50 dark:bg-zinc-900/30 p-3.5 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-zinc-500">
                  Event Description & Objectives
                </span>
                <p className="text-xs text-gray-700 dark:text-zinc-300 leading-relaxed whitespace-pre-wrap">
                  {selected.description}
                </p>
              </div>
            )}

            {/* Proponent Org Constitution & By-Laws (CBL) Status */}
            {selected.bylaws_filename ? (
              <div className="flex items-center justify-between rounded-xl border border-emerald-200/80 dark:border-emerald-900/30 bg-emerald-50/40 dark:bg-emerald-950/20 p-3.5">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300 shadow-2xs">
                    <HugeIcon className="ph-bold ph-scales text-lg" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-slate-900 dark:text-zinc-100">
                        Organization Charter (CBL)
                      </span>
                      <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-100/70 px-2 py-0.2 text-[9px] font-bold text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                        Active
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-zinc-400 truncate max-w-[200px]">
                      {selected.bylaws_original_filename || selected.bylaws_filename}
                    </p>
                  </div>
                </div>

                {selected.organization_id && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    title="Preview Constitution & By-Laws"
                    className="h-8 px-3 text-xs font-semibold rounded-lg border-emerald-300 dark:border-emerald-800 bg-white dark:bg-zinc-800 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-50 cursor-pointer shadow-2xs shrink-0"
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
              </div>
            ) : (
              <div className="flex items-center gap-3 rounded-xl border border-amber-200/80 dark:border-amber-900/30 bg-amber-50/40 dark:bg-amber-950/20 p-3.5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300 shadow-2xs">
                  <HugeIcon className="ph-bold ph-warning text-lg" />
                </div>
                <div>
                  <span className="text-xs font-bold text-amber-900 dark:text-amber-200">
                    No Active Charter On File
                  </span>
                  <p className="text-[11px] text-amber-700 dark:text-amber-400">
                    Organization has not ratified an official Constitution & By-Laws yet.
                  </p>
                </div>
              </div>
            )}

            {/* Post-Event Clearance Tracker (Visible for Approved Proposals) */}
            {selected.status === "Approved" && (
              <div className="rounded-xl border border-purple-200 dark:border-purple-900/40 bg-purple-50/40 dark:bg-purple-950/20 p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <HugeIcon className="ph-bold ph-clock-countdown text-purple-700 dark:text-purple-400" />
                    <span className="text-xs font-bold uppercase tracking-wider text-purple-900 dark:text-purple-200">
                      Post-Event Compliance
                    </span>
                  </div>
                  <span
                    className={cn(
                      "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold",
                      getPostEventStatusBadgeClass(selected.post_event_status || "Pending Submission")
                    )}
                  >
                    {selected.post_event_status || "Pending Submission"}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-purple-800 dark:text-purple-300 pt-1 border-t border-purple-200/60 dark:border-purple-900/40">
                  <span>
                    Due:{" "}
                    <strong className="font-mono">
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
                    <HugeIcon className="ph-bold ph-arrow-right text-[10px]" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* SECTION 3: Official Proposal Document Preview */}
          <div className="space-y-2.5 pt-2">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-zinc-500">
              Official Proposal Document
            </h4>

            {selected.id ? (
              <FirstPagePreview
                proposalId={selected.id}
                title={selected.title}
                onOpenPreview={() => handleOpenPdfPreview?.(selected)}
              />
            ) : (
              <div className="rounded-xl border border-border/80 dark:border-border bg-gray-50/60 dark:bg-zinc-900/40 p-3.5 flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-red-50 dark:bg-red-950/40 text-pup-maroon dark:text-red-400 flex items-center justify-center text-lg shrink-0 shadow-2xs border border-red-100 dark:border-red-900/30">
                    <HugeIcon className="ph-bold ph-file-pdf" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-gray-900 dark:text-zinc-100 truncate max-w-[220px]">
                      {selected.title}.pdf
                    </p>
                    <p className="text-[11px] text-gray-400 dark:text-zinc-500">
                      Complete activity flow & budget proposal
                    </p>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleOpenPdfPreview?.(selected)}
                  className="h-8 px-3 text-xs font-semibold rounded-lg border border-border dark:border-border bg-white dark:bg-zinc-800 text-pup-maroon dark:text-red-400 hover:bg-gray-50 dark:hover:bg-zinc-700 cursor-pointer shadow-2xs shrink-0"
                >
                  <HugeIcon className="ph-bold ph-eye mr-1.5 text-xs" />
                  <span>Inspect PDF</span>
                </Button>
              </div>
            )}
          </div>

          {/* SECTION 4: Evaluation & Stage Decision */}
          <div className="space-y-3.5 pt-2 border-t border-border/80 dark:border-border">
            <div className="flex items-center justify-between">
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-zinc-500">
                Evaluation & Decision
              </h4>
              <span className="text-[11px] text-gray-500 dark:text-zinc-400">
                Stage: <strong className="text-gray-900 dark:text-zinc-100">{selected.status}</strong>
              </span>
            </div>

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
                <HugeIcon className="ph-bold ph-warning text-base text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
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
                <HugeIcon className="ph-bold ph-arrow-counter-clockwise text-base text-purple-600 dark:text-purple-400 shrink-0 mt-0.5" />
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
                <HugeIcon className="ph-bold ph-info text-base text-sky-600 dark:text-sky-400 shrink-0 mt-0.5" />
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
                  <span className={cn("font-mono text-[10px]", isNoteValid ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400")}>
                    {note.trim().length} / 5 min
                  </span>
                )}
              </div>
              <textarea
                className={cn(
                  "min-h-24 w-full rounded-xl border bg-white p-3 text-xs text-slate-900 placeholder:text-slate-400 outline-none transition-colors dark:bg-zinc-900 dark:text-zinc-100",
                  isNoteRequired && note.trim().length < 5
                    ? "border-amber-400 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 dark:border-amber-600"
                    : "border-border focus:border-pup-maroon focus:ring-1 focus:ring-pup-maroon dark:border-border"
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
          <div className="space-y-3 pt-2 border-t border-border/80 dark:border-border">
            <div className="flex items-center justify-between">
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-zinc-500">
                Audit Timeline
              </h4>
              <span className="text-[10px] font-semibold text-gray-400 dark:text-zinc-500">
                {selected.updates?.length || 0} events
              </span>
            </div>

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
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full border px-2 py-0.2 text-[9px] font-bold",
                          getProposalStatusBadgeClass(update.status)
                        )}
                      >
                        {update.status}
                      </span>
                      {update.created_at && (
                        <span className="text-[10px] text-gray-400 dark:text-zinc-500 font-mono">
                          {new Date(update.created_at).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-700 dark:text-zinc-300 leading-relaxed bg-gray-50/60 dark:bg-zinc-800/40 p-2.5 rounded-xl border border-border/80 dark:border-border">
                      {update.message}
                    </p>
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
        <SheetFooter className="shrink-0 p-4 px-6 border-t border-border dark:border-border bg-gray-50/70 dark:bg-zinc-900/40 flex flex-row items-center justify-between gap-3">
          <Button
            variant="outline"
            onClick={() => {
              setSheetOpen(false);
              setSelected?.(null);
            }}
            className="h-10 px-5 text-xs font-semibold rounded-xl border border-border dark:border-border bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-xs cursor-pointer active:scale-95 transition-all"
          >
            Close
          </Button>

          <Button
            className="h-10 px-6 text-xs font-semibold rounded-xl btn-brand-red text-white! bg-pup-maroon hover:bg-pup-darkMaroon shadow-xs cursor-pointer active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ color: "#ffffff" }}
            onClick={() => save?.()}
            disabled={isSaving || !isNoteValid}
          >
            {isSaving ? (
              <>
                <HugeIcon className="ph-bold ph-spinner animate-spin mr-2" />
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
