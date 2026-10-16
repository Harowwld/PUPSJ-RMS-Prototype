"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import HugeIcon from "@/components/shared/HugeIcon";
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

export default function OsasPostEventReviewSheet({
  open,
  onOpenChange,
  selectedPostEvent,
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
  const [mobileTab, setMobileTab] = useState("overview"); // "overview" | "documents" | "clearance"

  if (!selectedPostEvent) return null;

  const trackingNo = selectedPostEvent.event_tracking_number || `EVT-${selectedPostEvent.event_proposal_id || selectedPostEvent.id}`;
  const attendeesCount = selectedPostEvent.actual_attendance ?? selectedPostEvent.actual_attendees ?? selectedPostEvent.total_attendance ?? 0;
  const expensesAmount = Number(selectedPostEvent.total_expenses ?? selectedPostEvent.actual_expenses ?? 0);
  const proponentName = selectedPostEvent.student_name || selectedPostEvent.submitted_by_name || "Authorized Officer";
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

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-xl md:max-w-2xl lg:max-w-[50vw] xl:max-w-[50vw] data-[side=right]:w-full data-[side=right]:sm:max-w-xl data-[side=right]:md:max-w-2xl data-[side=right]:lg:max-w-[50vw] data-[side=right]:xl:max-w-[50vw] flex flex-col h-full bg-white dark:bg-card border-l border-border dark:border-border p-0 shadow-2xl overflow-hidden"
      >
        {/* 1. EXECUTIVE SHEET HEADER */}
        <SheetHeader className="shrink-0 p-6 pb-4 pr-16 border-b border-border dark:border-border bg-gradient-to-r from-gray-50/90 via-white to-gray-50/50 dark:from-zinc-900/90 dark:via-card dark:to-zinc-900/50 text-left">
          <div className="min-w-0 flex-1">
            {/* Eyebrow & Badges */}
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <span className="font-mono text-[11px] font-semibold text-gray-400 dark:text-zinc-500 uppercase tracking-wider">
                Post-Event Clearance #{selectedPostEvent.id}
              </span>
              <span className="text-gray-300 dark:text-zinc-700">·</span>
              <span className="font-mono text-[10px] font-semibold px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300 border border-purple-200/80 dark:border-purple-800/60">
                {trackingNo}
              </span>
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-semibold shrink-0",
                  getPostEventStatusBadgeClass(selectedPostEvent.status)
                )}
              >
                <span className={cn("w-1.5 h-1.5 rounded-full", getPostEventStatusDotClass(selectedPostEvent.status))} />
                {selectedPostEvent.status}
              </span>
            </div>

            {/* Event Title */}
            <SheetTitle className="text-xl font-bold tracking-tight text-gray-900 dark:text-zinc-50 leading-snug">
              {selectedPostEvent.event_title}
            </SheetTitle>

            {/* Proponent & Organization Info */}
            <SheetDescription className="mt-1.5 text-xs text-gray-500 dark:text-zinc-400 flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-bold uppercase tracking-wider text-pup-maroon dark:text-red-400 bg-red-50 dark:bg-red-950/40 px-2 py-0.5 rounded-md border border-red-200/60 dark:border-red-900/40 flex items-center gap-1">
                {selectedPostEvent.organization_acronym && <span>[{selectedPostEvent.organization_acronym}]</span>}
                <span className="truncate max-w-[200px]">{selectedPostEvent.organization_name}</span>
              </span>
              <span className="text-gray-300 dark:text-zinc-700">·</span>
              <span className="inline-flex items-center gap-1">
                <HugeIcon className="ph-bold ph-user text-gray-400 text-xs" />
                <span>Submitter:</span>
                <strong className="text-gray-900 dark:text-zinc-200">{proponentName}</strong>
              </span>
              {selectedPostEvent.submitted_by_email && (
                <>
                  <span className="text-gray-300 dark:text-zinc-700">·</span>
                  <span className="font-mono text-gray-500 dark:text-zinc-400 text-[11px]">
                    {selectedPostEvent.submitted_by_email}
                  </span>
                </>
              )}
            </SheetDescription>
          </div>

          {/* Compact / Mobile Segmented Switcher (< md) */}
          <div className="flex md:hidden items-center gap-1 mt-4 pt-3 border-t border-border/80 dark:border-border overflow-x-auto scrollbar-none">
            <button
              type="button"
              onClick={() => setMobileTab("overview")}
              className={cn(
                "px-3 py-1.5 text-xs font-semibold rounded-lg transition-all shrink-0 cursor-pointer",
                mobileTab === "overview"
                  ? "bg-pup-maroon text-white shadow-xs"
                  : "text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800"
              )}
            >
              Overview
            </button>
            <button
              type="button"
              onClick={() => setMobileTab("documents")}
              className={cn(
                "px-3 py-1.5 text-xs font-semibold rounded-lg transition-all shrink-0 cursor-pointer",
                mobileTab === "documents"
                  ? "bg-pup-maroon text-white shadow-xs"
                  : "text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800"
              )}
            >
              Compliance Documents
            </button>
            <button
              type="button"
              onClick={() => setMobileTab("clearance")}
              className={cn(
                "px-3 py-1.5 text-xs font-semibold rounded-lg transition-all shrink-0 cursor-pointer",
                mobileTab === "clearance"
                  ? "bg-pup-maroon text-white shadow-xs"
                  : "text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800"
              )}
            >
              Clearance Action
            </button>
          </div>
        </SheetHeader>

        {/* 2. SHEET BODY: ADAPTIVE 2-COLUMN INSPECTOR */}
        <div className="flex-1 overflow-y-auto p-6 scrollbar-thin">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
            {/* LEFT COLUMN: Accomplishments, Metrics & Compliance Documents */}
            <div
              className={cn(
                "md:col-span-7 space-y-5",
                mobileTab !== "overview" && mobileTab !== "documents" && "hidden md:block"
              )}
            >
              {/* KEY METRICS BENTO GRID */}
              <div
                className={cn(
                  "grid grid-cols-2 sm:grid-cols-3 gap-2.5",
                  mobileTab === "documents" && "hidden md:grid"
                )}
              >
                {/* Actual Attendance */}
                <div className="rounded-xl border border-border/80 dark:border-border bg-gray-50/60 dark:bg-zinc-900/40 p-3 flex flex-col justify-between">
                  <div className="flex items-center gap-1.5 text-gray-400 dark:text-zinc-500">
                    <HugeIcon className="ph-bold ph-users text-xs" />
                    <span className="text-[10px] font-bold uppercase tracking-wider">Attendance</span>
                  </div>
                  <p className="mt-1 text-base font-bold text-gray-900 dark:text-zinc-100 font-mono">
                    {Number(attendeesCount).toLocaleString()}
                  </p>
                  <span className="text-[10px] text-gray-400 dark:text-zinc-500">Verified attendees</span>
                </div>

                {/* Total Liquidated Expenses */}
                <div className="rounded-xl border border-border/80 dark:border-border bg-gray-50/60 dark:bg-zinc-900/40 p-3 flex flex-col justify-between">
                  <div className="flex items-center gap-1.5 text-gray-400 dark:text-zinc-500">
                    <HugeIcon className="ph-bold ph-receipt text-xs text-emerald-500" />
                    <span className="text-[10px] font-bold uppercase tracking-wider">Total Spend</span>
                  </div>
                  <p className="mt-1 text-base font-bold text-emerald-700 dark:text-emerald-400 font-mono">
                    ₱{expensesAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </p>
                  <span className="text-[10px] text-gray-400 dark:text-zinc-500">Liquidated expenses</span>
                </div>

                {/* Submission Date */}
                <div className="col-span-2 sm:col-span-1 rounded-xl border border-border/80 dark:border-border bg-gray-50/60 dark:bg-zinc-900/40 p-3 flex flex-col justify-between">
                  <div className="flex items-center gap-1.5 text-gray-400 dark:text-zinc-500">
                    <HugeIcon className="ph-bold ph-calendar text-xs" />
                    <span className="text-[10px] font-bold uppercase tracking-wider">Submitted</span>
                  </div>
                  <p className="mt-1 text-xs font-bold text-gray-800 dark:text-zinc-200 font-mono">
                    {dateSubmittedStr}
                  </p>
                  <span className="text-[10px] text-gray-400 dark:text-zinc-500">Post-event report</span>
                </div>
              </div>

              {/* Executive Accomplishment Narrative */}
              {selectedPostEvent.narrative_summary && (
                <div
                  className={cn(
                    "rounded-xl border border-border/80 dark:border-border bg-white dark:bg-zinc-900/40 p-4 space-y-1.5",
                    mobileTab === "documents" && "hidden md:block"
                  )}
                >
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-zinc-500">
                    Accomplishment & Narrative Summary
                  </h4>
                  <p className="text-xs text-gray-700 dark:text-zinc-300 leading-relaxed whitespace-pre-wrap">
                    {selectedPostEvent.narrative_summary}
                  </p>
                </div>
              )}

              {/* Submitted Compliance Documents (Narrative & Liquidation) */}
              <div className={cn("space-y-3", mobileTab === "overview" && "hidden md:block")}>
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-800 dark:text-zinc-200">
                    Compliance Documents
                  </h4>
                  <span className="text-[11px] text-gray-400 dark:text-zinc-500">
                    Official attachments submitted for clearance
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Narrative Report Card */}
                  <div className="rounded-xl border border-border/80 dark:border-border bg-gray-50/60 dark:bg-zinc-900/40 p-4 flex flex-col justify-between space-y-3.5">
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-xl bg-red-50 dark:bg-red-950/40 text-pup-maroon dark:text-red-400 flex items-center justify-center text-lg shrink-0 shadow-2xs border border-red-100 dark:border-red-900/30">
                        <HugeIcon className="ph-bold ph-file-text" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="text-xs font-bold text-gray-900 dark:text-zinc-100 block">
                          Narrative Report
                        </span>
                        <p className="text-[11px] text-gray-500 dark:text-zinc-400 truncate max-w-[200px]">
                          {selectedPostEvent.narrative_original_filename || "Narrative-Report.pdf"}
                        </p>
                      </div>
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      title="Inspect Narrative Accomplishment Report"
                      className="w-full h-8 text-xs font-semibold rounded-lg border border-border dark:border-border bg-white dark:bg-zinc-800 text-pup-maroon dark:text-red-400 hover:bg-gray-50 dark:hover:bg-zinc-700 cursor-pointer shadow-2xs"
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

                  {/* Financial Liquidation Report Card */}
                  <div className="rounded-xl border border-border/80 dark:border-border bg-gray-50/60 dark:bg-zinc-900/40 p-4 flex flex-col justify-between space-y-3.5">
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-lg shrink-0 shadow-2xs border border-emerald-100 dark:border-emerald-900/30">
                        <HugeIcon className="ph-bold ph-receipt" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="text-xs font-bold text-gray-900 dark:text-zinc-100 block">
                          Financial Liquidation
                        </span>
                        <p className="text-[11px] text-gray-500 dark:text-zinc-400 truncate max-w-[200px]">
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
                        className="w-full h-8 text-xs font-semibold rounded-lg border border-border dark:border-border bg-white dark:bg-zinc-800 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-zinc-700 cursor-pointer shadow-2xs"
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
                      <div className="h-8 flex items-center justify-center text-[11px] text-gray-400 italic">
                        No liquidation file uploaded
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: CLEARANCE EVALUATION & DECISION RAIL */}
            <div
              className={cn(
                "md:col-span-5 space-y-5",
                mobileTab !== "clearance" && "hidden md:block"
              )}
            >
              {/* CLEARANCE EVALUATION MODULE */}
              <div className="rounded-2xl border border-border/80 dark:border-border bg-gray-50/60 dark:bg-zinc-900/40 p-4.5 space-y-3.5 shadow-2xs">
                <div className="flex items-center justify-between pb-2 border-b border-border/80 dark:border-border">
                  <span className="text-xs font-bold uppercase tracking-wider text-gray-800 dark:text-zinc-200">
                    Clearance Evaluation
                  </span>
                  <span className="text-[11px] text-gray-500 dark:text-zinc-400">
                    Current: <strong className="text-gray-900 dark:text-zinc-100">{selectedPostEvent.status}</strong>
                  </span>
                </div>

                {/* Quick Stage Selection Pills */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-gray-600 dark:text-zinc-400">
                    Clearance Decision:
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

                {/* Stage Select Picker */}
                <div className="space-y-1">
                  <Select
                    value={postEventStatus}
                    onValueChange={(val) => handleSelectStatusPill(val)}
                    usePortal={false}
                    className="h-9 text-xs font-semibold rounded-xl bg-white dark:bg-zinc-800 border-border text-gray-900 dark:text-zinc-100 shadow-none cursor-pointer"
                    buttonClassName="h-9 text-xs font-semibold rounded-xl bg-white dark:bg-zinc-800 border-border text-gray-900 dark:text-zinc-100"
                  >
                    {availablePostEventStatusOptions.map((opt) => (
                      <option key={opt} value={opt}>
                        Set to: {opt}
                      </option>
                    ))}
                  </Select>
                </div>

                {/* Warning Alerts */}
                {selectedPostEvent.status === "Cleared" && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-3 text-xs text-amber-900 dark:border-amber-800/40 dark:bg-amber-950/30 dark:text-amber-300 flex items-start gap-2.5">
                    <HugeIcon className="ph-bold ph-warning text-base text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <div className="space-y-0.5">
                      <p className="font-semibold text-amber-950 dark:text-amber-200">
                        Reopening Cleared Report
                      </p>
                      <p className="text-[11px] leading-relaxed text-amber-800 dark:text-amber-300/90">
                        This report was previously cleared. A written justification note (min 5 chars) is required to revoke clearance.
                      </p>
                    </div>
                  </div>
                )}

                {selectedPostEvent.status === "Declined" && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-3 text-xs text-amber-900 dark:border-amber-800/40 dark:bg-amber-950/30 dark:text-amber-300 flex items-start gap-2.5">
                    <HugeIcon className="ph-bold ph-warning text-base text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <div className="space-y-0.5">
                      <p className="font-semibold text-amber-950 dark:text-amber-200">
                        Reopening Declined Report
                      </p>
                      <p className="text-[11px] leading-relaxed text-amber-800 dark:text-amber-300/90">
                        A written justification note citing grounds for appeal or reconsideration is required to reopen this report.
                      </p>
                    </div>
                  </div>
                )}

                {postEventStatus === "Needs Revision" && (
                  <div className="rounded-xl border border-purple-200 bg-purple-50/80 p-3 text-xs text-purple-900 dark:border-purple-800/40 dark:bg-purple-950/30 dark:text-purple-300 flex items-start gap-2.5">
                    <HugeIcon className="ph-bold ph-info text-base text-purple-600 dark:text-purple-400 shrink-0 mt-0.5" />
                    <div className="space-y-0.5">
                      <p className="font-semibold text-purple-950 dark:text-purple-200">
                        Revision Instructions Required
                      </p>
                      <p className="text-[11px] leading-relaxed text-purple-800 dark:text-purple-300/90">
                        Please describe what corrections, narrative additions, or expense vouchers the student organization must provide.
                      </p>
                    </div>
                  </div>
                )}

                {/* Justification / Remarks Textarea */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className={cn("font-semibold", isPostEventNoteRequired ? "text-pup-maroon dark:text-red-400" : "text-gray-600 dark:text-zinc-400")}>
                      Remarks & Evaluation Notes {isPostEventNoteRequired && "(Required, min 5 chars)"}
                    </span>
                    {isPostEventNoteRequired && (
                      <span className={cn("font-mono text-[10px]", isPostEventNoteValid ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400")}>
                        {postEventNote.trim().length} / 5 min
                      </span>
                    )}
                  </div>
                  <textarea
                    className={cn(
                      "min-h-24 w-full rounded-xl border bg-white p-3 text-xs text-gray-900 placeholder:text-gray-400 outline-none transition-colors dark:bg-zinc-900 dark:text-zinc-100",
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

                {/* Primary Clearance Button */}
                <div className="flex items-center justify-end pt-1">
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
                      "Clear"
                    ) : postEventStatus === "Needs Revision" ? (
                      "Revise"
                    ) : postEventStatus === "Declined" ? (
                      "Decline"
                    ) : postEventStatus === "Under Review" ? (
                      "Review"
                    ) : (
                      "Update"
                    )}
                  </Button>
                </div>
              </div>

              {/* Past Review Remarks */}
              {selectedPostEvent.review_notes && (
                <div className="rounded-2xl border border-border/80 dark:border-border bg-white dark:bg-zinc-900/30 p-4 space-y-2">
                  <div className="flex items-center justify-between text-[11px] text-gray-400 dark:text-zinc-500 pb-2 border-b border-border/80 dark:border-border">
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
                  <p className="text-xs text-gray-700 dark:text-zinc-300 leading-relaxed pt-1">
                    {selectedPostEvent.review_notes}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 3. SHEET FOOTER */}
        <SheetFooter className="shrink-0 p-4 px-6 border-t border-border dark:border-border bg-gray-50/70 dark:bg-zinc-900/40 flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 dark:text-zinc-400 font-mono">
              Clearance ID: #{selectedPostEvent.id}
            </span>
          </div>
          <Button
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
