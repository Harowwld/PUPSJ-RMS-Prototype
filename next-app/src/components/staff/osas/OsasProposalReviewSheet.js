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
  getProposalStatusBadgeClass,
  getProposalStatusDotClass,
  getPostEventStatusBadgeClass,
  FirstPagePreview,
} from "@/components/staff/OsasMonitoringTab";

export default function OsasProposalReviewSheet({
  sheetOpen,
  setSheetOpen,
  selected,
  setSelected,
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
  const [mobileTab, setMobileTab] = useState("overview"); // "overview" | "documents" | "evaluation" | "history"

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
        className="w-full sm:max-w-xl md:max-w-2xl lg:max-w-[50vw] xl:max-w-[50vw] data-[side=right]:w-full data-[side=right]:sm:max-w-xl data-[side=right]:md:max-w-2xl data-[side=right]:lg:max-w-[50vw] data-[side=right]:xl:max-w-[50vw] flex flex-col h-full bg-white dark:bg-card border-l border-border dark:border-border p-0 shadow-2xl overflow-hidden"
      >
        {/* 1. EXECUTIVE SHEET HEADER */}
        <SheetHeader className="shrink-0 p-6 pb-4 pr-16 border-b border-border dark:border-border bg-gradient-to-r from-gray-50/90 via-white to-gray-50/50 dark:from-zinc-900/90 dark:via-card dark:to-zinc-900/50 text-left">
          <div className="min-w-0 flex-1">
            {/* Eyebrow & Badges */}
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <span className="font-mono text-[11px] font-semibold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">
                Event Proposal #{selected.id}
              </span>
              <span className="text-slate-300 dark:text-zinc-700">·</span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-pup-maroon dark:text-red-400 bg-red-50 dark:bg-red-950/40 px-2 py-0.5 rounded-md border border-red-200/60 dark:border-red-900/40 flex items-center gap-1.5">
                {selected.org_acronym && <span>[{selected.org_acronym}]</span>}
                <span className="truncate max-w-[220px]">{selected.verified_org_name || selected.organization_name}</span>
              </span>
              {selected.is_verified_officer && (
                <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/30 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800/40 flex items-center gap-1">
                  <HugeIcon className="ph-bold ph-shield-check text-xs text-emerald-600" />
                  Verified Officer
                </span>
              )}
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-semibold shrink-0",
                  getProposalStatusBadgeClass(selected.status)
                )}
              >
                <span className={cn("w-1.5 h-1.5 rounded-full", getProposalStatusDotClass(selected.status))} />
                {selected.status}
              </span>
            </div>

            {/* Proposal Title */}
            <SheetTitle className="text-xl font-bold tracking-tight text-gray-900 dark:text-zinc-50 leading-snug truncate">
              {selected.title}
            </SheetTitle>

            {/* Proponent & Submitter Info */}
            <SheetDescription className="mt-1 text-xs text-gray-500 dark:text-zinc-400 flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1">
                <HugeIcon className="ph-bold ph-user text-slate-400 text-xs" />
                <span>Proponent:</span>
                <strong className="text-slate-900 dark:text-zinc-200">{selected.student_name}</strong>
              </span>
              {selected.officer_position && (
                <span className="px-1.5 py-0.2 rounded bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300 text-[10px] font-semibold border border-sky-200/50 dark:border-sky-800/30">
                  {selected.officer_position}
                </span>
              )}
              <span className="text-slate-300 dark:text-zinc-700">·</span>
              <span className="font-mono text-slate-500 dark:text-zinc-400 text-[11px]">
                {selected.submitted_by_email || selected.student_no}
              </span>
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
              Document
            </button>
            <button
              type="button"
              onClick={() => setMobileTab("evaluation")}
              className={cn(
                "px-3 py-1.5 text-xs font-semibold rounded-lg transition-all shrink-0 cursor-pointer",
                mobileTab === "evaluation"
                  ? "bg-pup-maroon text-white shadow-xs"
                  : "text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800"
              )}
            >
              Evaluation
            </button>
            <button
              type="button"
              onClick={() => setMobileTab("history")}
              className={cn(
                "px-3 py-1.5 text-xs font-semibold rounded-lg transition-all shrink-0 cursor-pointer",
                mobileTab === "history"
                  ? "bg-pup-maroon text-white shadow-xs"
                  : "text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800"
              )}
            >
              History ({selected.updates?.length || 0})
            </button>
          </div>
        </SheetHeader>

        {/* 2. SHEET BODY: ADAPTIVE 2-COLUMN INSPECTOR */}
        <div className="flex-1 overflow-y-auto p-6 scrollbar-thin">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
            {/* LEFT COLUMN: Proposal Details, Metrics, CBL & Document Preview */}
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
                {/* Target Attendance */}
                <div className="rounded-xl border border-border/80 dark:border-border bg-gray-50/60 dark:bg-zinc-900/40 p-3 flex flex-col justify-between">
                  <div className="flex items-center gap-1.5 text-gray-400 dark:text-zinc-500">
                    <HugeIcon className="ph-bold ph-users text-xs" />
                    <span className="text-[10px] font-bold uppercase tracking-wider">Attendance</span>
                  </div>
                  <p className="mt-1 text-base font-bold text-gray-900 dark:text-zinc-100 font-mono">
                    {selected.target_attendance ? Number(selected.target_attendance).toLocaleString() : "—"}
                  </p>
                  <span className="text-[10px] text-gray-400 dark:text-zinc-500">Expected attendees</span>
                </div>

                {/* Proposed Budget */}
                <div className="rounded-xl border border-border/80 dark:border-border bg-gray-50/60 dark:bg-zinc-900/40 p-3 flex flex-col justify-between">
                  <div className="flex items-center gap-1.5 text-gray-400 dark:text-zinc-500">
                    <HugeIcon className="ph-bold ph-coins text-xs text-amber-500" />
                    <span className="text-[10px] font-bold uppercase tracking-wider">Budget</span>
                  </div>
                  <p className="mt-1 text-base font-bold text-gray-900 dark:text-zinc-100 font-mono">
                    {selected.estimated_budget
                      ? `₱${Number(selected.estimated_budget).toLocaleString(undefined, { minimumFractionDigits: 0 })}`
                      : "—"}
                  </p>
                  <span className="text-[10px] text-gray-400 dark:text-zinc-500">Estimated cost</span>
                </div>

                {/* Event Schedule Date */}
                <div className="col-span-2 sm:col-span-1 rounded-xl border border-border/80 dark:border-border bg-gray-50/60 dark:bg-zinc-900/40 p-3 flex flex-col justify-between">
                  <div className="flex items-center gap-1.5 text-gray-400 dark:text-zinc-500">
                    <HugeIcon className="ph-bold ph-calendar text-xs" />
                    <span className="text-[10px] font-bold uppercase tracking-wider">Target Date</span>
                  </div>
                  <p className="mt-1 text-xs font-bold text-gray-800 dark:text-zinc-200 font-mono">
                    {eventDateStr || "To Be Announced"}
                  </p>
                  <span className="text-[10px] text-gray-400 dark:text-zinc-500">
                    Submitted: {submittedDateStr}
                  </span>
                </div>
              </div>

              {/* Venue if provided */}
              {selected.venue && (
                <div
                  className={cn(
                    "flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-border/80 dark:border-border bg-gray-50/60 dark:bg-zinc-900/40 text-xs text-gray-700 dark:text-zinc-300",
                    mobileTab === "documents" && "hidden md:flex"
                  )}
                >
                  <HugeIcon className="ph-bold ph-map-pin text-sm text-pup-maroon dark:text-red-400 shrink-0" />
                  <span>
                    Venue: <strong className="text-gray-900 dark:text-zinc-100">{selected.venue}</strong>
                  </span>
                </div>
              )}

              {/* Description / Summary if available */}
              {selected.description && (
                <div
                  className={cn(
                    "rounded-xl border border-border/80 dark:border-border bg-white dark:bg-zinc-900/40 p-4 space-y-1.5",
                    mobileTab === "documents" && "hidden md:block"
                  )}
                >
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-zinc-500">
                    Event Overview & Objectives
                  </h4>
                  <p className="text-xs text-gray-700 dark:text-zinc-300 leading-relaxed whitespace-pre-wrap">
                    {selected.description}
                  </p>
                </div>
              )}

              {/* Proponent Org Constitution & By-Laws (CBL) Status */}
              <div className={cn(mobileTab === "documents" && "hidden md:block")}>
                {selected.bylaws_filename ? (
                  <div className="flex items-center justify-between rounded-xl border border-emerald-200/80 dark:border-emerald-900/30 bg-emerald-50/50 dark:bg-emerald-950/20 p-3.5">
                    <div className="flex items-center gap-3">
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
                        <p className="text-[11px] text-slate-500 dark:text-zinc-400 truncate max-w-[220px]">
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
                        className="h-8 px-3 text-xs font-semibold rounded-lg border-emerald-300 dark:border-emerald-800 bg-white dark:bg-zinc-800 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-50 cursor-pointer shadow-2xs"
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
                  <div className="flex items-center justify-between rounded-xl border border-amber-200/80 dark:border-amber-900/30 bg-amber-50/50 dark:bg-amber-950/20 p-3.5">
                    <div className="flex items-center gap-3">
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
                  </div>
                )}
              </div>

              {/* Post-Event Clearance Tracker (Visible for Approved Proposals) */}
              {selected.status === "Approved" && (
                <div
                  className={cn(
                    "rounded-xl border border-purple-200 dark:border-purple-900/40 bg-purple-50/50 dark:bg-purple-950/20 p-4 space-y-2.5",
                    mobileTab === "documents" && "hidden md:block"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <HugeIcon className="ph-bold ph-clock-countdown text-purple-700 dark:text-purple-400" />
                      <span className="text-xs font-bold uppercase tracking-wider text-purple-900 dark:text-purple-200">
                        Post-Event Compliance Tracker
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
                  <div className="flex items-center justify-between text-xs text-purple-800 dark:text-purple-300">
                    <span>
                      Liquidation Due Date:{" "}
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

              {/* Official Proposal Document Preview */}
              <div className={cn("space-y-2.5", mobileTab === "overview" && "hidden md:block")}>
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-zinc-200">
                    Official Proposal Document
                  </h4>
                  <span className="text-[11px] text-slate-400 dark:text-zinc-500">
                    PDF Document Submission
                  </span>
                </div>

                {selected.id ? (
                  <FirstPagePreview
                    proposalId={selected.id}
                    title={selected.title}
                    onOpenPreview={() => handleOpenPdfPreview?.(selected)}
                  />
                ) : (
                  <div className="rounded-xl border border-border/80 dark:border-border bg-gray-50/60 dark:bg-zinc-900/40 p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-950/40 text-pup-maroon dark:text-red-400 flex items-center justify-center text-xl shrink-0 shadow-2xs border border-red-100 dark:border-red-900/30">
                        <HugeIcon className="ph-bold ph-file-pdf" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-gray-900 dark:text-zinc-100 truncate max-w-[260px]">
                          {selected.title}.pdf
                        </p>
                        <p className="text-[11px] text-gray-400 dark:text-zinc-500">
                          Complete proposal and activity flow document
                        </p>
                      </div>
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenPdfPreview?.(selected)}
                      className="h-8 px-3 text-xs font-semibold rounded-lg border border-border dark:border-border bg-white dark:bg-zinc-800 text-pup-maroon dark:text-red-400 hover:bg-gray-50 dark:hover:bg-zinc-700 cursor-pointer shadow-2xs"
                    >
                      <HugeIcon className="ph-bold ph-eye mr-1.5 text-xs" />
                      <span>Inspect PDF</span>
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT COLUMN: DECISION & ACTION RAIL + AUDIT TIMELINE */}
            <div
              className={cn(
                "md:col-span-5 space-y-5",
                mobileTab !== "evaluation" && mobileTab !== "history" && "hidden md:block"
              )}
            >
              {/* EVALUATION ACTION MODULE */}
              <div
                className={cn(
                  "rounded-2xl border border-border/80 dark:border-border bg-gray-50/60 dark:bg-zinc-900/40 p-4.5 space-y-3.5 shadow-2xs",
                  mobileTab === "history" && "hidden md:block"
                )}
              >
                <div className="flex items-center justify-between pb-2 border-b border-border/80 dark:border-border">
                  <span className="text-xs font-bold uppercase tracking-wider text-gray-800 dark:text-zinc-200">
                    Evaluation & Decision
                  </span>
                  <span className="text-[11px] text-gray-500 dark:text-zinc-400">
                    Stage: <strong className="text-gray-900 dark:text-zinc-100">{selected.status}</strong>
                  </span>
                </div>

                {/* Quick Stage Selection Pills */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-gray-600 dark:text-zinc-400">
                    Stage Action:
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

                {/* Primary Action Button */}
                <div className="flex items-center justify-end pt-1">
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
                      "Revoke"
                    ) : isReopeningDeclined ? (
                      "Reopen"
                    ) : status === "Approved" ? (
                      "Approve"
                    ) : status === "Needs Revision" ? (
                      "Revise"
                    ) : status === "Declined" ? (
                      "Decline"
                    ) : status === "Under Review" ? (
                      "Review"
                    ) : (
                      "Update"
                    )}
                  </Button>
                </div>
              </div>

              {/* TRANSACTION & AUDIT TIMELINE */}
              <div
                className={cn(
                  "rounded-2xl border border-border/80 dark:border-border bg-white dark:bg-zinc-900/30 p-4 space-y-3",
                  mobileTab === "evaluation" && "hidden md:block"
                )}
              >
                <div className="flex items-center justify-between pb-2 border-b border-border/80 dark:border-border">
                  <span className="text-xs font-bold uppercase tracking-wider text-gray-800 dark:text-zinc-200">
                    Audit Timeline
                  </span>
                  <span className="text-[10px] font-semibold text-gray-400 dark:text-zinc-500">
                    {selected.updates?.length || 0} events
                  </span>
                </div>

                {selected.updates?.length > 0 ? (
                  <ol className="relative border-l border-border ml-2 pl-4 text-xs space-y-3.5 dark:border-border">
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
                  <div className="py-6 text-center text-gray-400 dark:text-zinc-500 text-xs">
                    No status transitions recorded yet.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 3. SHEET FOOTER */}
        <SheetFooter className="shrink-0 p-4 px-6 border-t border-border dark:border-border bg-gray-50/70 dark:bg-zinc-900/40 flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 dark:text-zinc-400 font-mono">
              Proposal ID: #{selected.id}
            </span>
          </div>
          <Button
            variant="outline"
            onClick={() => setSheetOpen(false)}
            className="h-10 px-5 text-xs font-semibold rounded-xl border border-border dark:border-border bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-xs cursor-pointer active:scale-95 transition-all"
          >
            Close
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
