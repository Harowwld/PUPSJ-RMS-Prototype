"use client";

import React, { useMemo, useState } from "react";
import HugeIcon from "@/components/shared/HugeIcon";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { RefreshButton } from "@/components/shared/RefreshButton";
import { formatPHDateTime } from "@/lib/timeFormat";
import { cn } from "@/lib/utils";
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyMedia,
} from "@/components/ui/empty";
import StudentOverviewSkeleton from "@/components/student/skeletons/StudentOverviewSkeleton";

function normalizeStatus(status) {
  return String(status || "").toLowerCase().trim();
}

export default function StudentOverviewTab({
  authUser,
  data = { requests: [], documents: [], proposals: [] },
  complianceData = null,
  myOrganizations = [],
  pendingPostEvents = [],
  postEventReports = [],
  onNavigate,
  onNewRequest,
  onRefresh,
  refreshing = false,
  loading = false,
}) {
  const [activityFilter, setActivityFilter] = useState("all");

  // Render skeleton during initial load before datasets arrive
  if (loading && !data?.requests?.length && !data?.proposals?.length && !complianceData) {
    return <StudentOverviewSkeleton />;
  }

  // 1. Identify Urgent Attention Items
  const attentionItems = useMemo(() => {
    const items = [];

    // A. Document Requests Ready for Pickup
    const readyRequests = (data.requests || []).filter(
      (r) => normalizeStatus(r.status) === "ready"
    );
    readyRequests.forEach((req) => {
      items.push({
        id: `ready-req-${req.id}`,
        type: "ready",
        priority: 1,
        title: "Record Ready for Pick-Up",
        description: `Your ${req.doc_type} (Ticket #${req.ticket_no || req.id}) has been printed and is ready for claiming at Registrar Window 2.`,
        actionLabel: "Claim",
        action: () => onNavigate("odrs"),
        icon: "ph-bold ph-package",
        badge: "Registrar Window 2",
        theme: "emerald",
      });
    });

    // B. Requests requiring payment proof
    const paymentRequests = (data.requests || []).filter(
      (r) => normalizeStatus(r.status) === "pendingpayment"
    );
    paymentRequests.forEach((req) => {
      items.push({
        id: `payment-req-${req.id}`,
        type: "payment",
        priority: 2,
        title: "Proof of Payment Required",
        description: `Ticket #${req.ticket_no || req.id} for ${req.doc_type} requires your official payment receipt for processing.`,
        actionLabel: "Upload",
        action: () => onNavigate("odrs"),
        icon: "ph-bold ph-receipt",
        badge: "Action Required",
        theme: "amber",
      });
    });

    // C. Missing Compliance Requirements
    const missingDocs = (complianceData?.requirements || []).filter(
      (r) => r.status === "Not Submitted"
    );
    if (missingDocs.length > 0) {
      const topMissing = missingDocs.slice(0, 2).map((d) => d.documentType).join(", ");
      const extraCount = missingDocs.length - 2;
      const extraText = extraCount > 0 ? ` and ${extraCount} more` : "";
      items.push({
        id: "compliance-missing",
        type: "compliance",
        priority: 3,
        title: "Missing Permanent Admission Records",
        description: `You have ${missingDocs.length} unsubmitted enrollment requirement${missingDocs.length > 1 ? "s" : ""} (${topMissing}${extraText}).`,
        actionLabel: "Resolve",
        action: () => onNavigate("compliance"),
        icon: "ph-bold ph-clipboard-text",
        badge: "Enrollment Clearance",
        theme: "amber",
      });
    }

    // D. OSAS Proposals Needing Revision
    const revisionProposals = (data.proposals || []).filter((p) => {
      const s = normalizeStatus(p.status);
      return s === "needs revision" || s === "revisionsrequested" || s === "revision";
    });
    revisionProposals.forEach((prop) => {
      items.push({
        id: `revision-prop-${prop.id}`,
        type: "revision",
        priority: 4,
        title: "Event Proposal Returned for Revision",
        description: `OSAS requested revisions for "${prop.title || prop.event_title}". Please review the evaluation notes and resubmit.`,
        actionLabel: "Revise",
        action: () => onNavigate("osas"),
        icon: "ph-bold ph-arrow-counter-clockwise",
        badge: "OSAS Evaluation",
        theme: "amber",
      });
    });

    // E. Pending Post-Event Liquidation Reports
    if (pendingPostEvents.length > 0) {
      items.push({
        id: "pending-post-event",
        type: "post_event",
        priority: 5,
        title: "Post-Event Report Due",
        description: `You have ${pendingPostEvents.length} completed event${pendingPostEvents.length > 1 ? "s" : ""} pending liquidation and post-activity reports.`,
        actionLabel: "Submit",
        action: () => onNavigate("osas"),
        icon: "ph-bold ph-file-arrow-up",
        badge: "Liquidation Due",
        theme: "blue",
      });
    }

    return items.sort((a, b) => a.priority - b.priority);
  }, [data.requests, data.proposals, complianceData, pendingPostEvents, onNavigate]);

  // 2. Identify the Active In-Flight Request Tracker
  const activeRequest = useMemo(() => {
    const activeStatuses = new Set([
      "submitted",
      "pending",
      "under review",
      "underreview",
      "inprogress",
      "processing",
      "ready",
      "pendingpayment",
    ]);

    const activeList = (data.requests || []).filter((r) =>
      activeStatuses.has(normalizeStatus(r.status))
    );

    if (activeList.length === 0) return null;

    // Prioritize "Ready" first, then sort by updated_at or created_at descending
    return activeList.sort((a, b) => {
      if (normalizeStatus(a.status) === "ready") return -1;
      if (normalizeStatus(b.status) === "ready") return 1;
      return new Date(b.updated_at || b.created_at || 0) - new Date(a.updated_at || a.created_at || 0);
    })[0];
  }, [data.requests]);

  // Stepper state computation for the active request
  const stepperSteps = useMemo(() => {
    if (!activeRequest) return [];
    const status = normalizeStatus(activeRequest.status);

    const isSubmitted = true;
    const isUnderReview = [
      "under review",
      "underreview",
      "inprogress",
      "processing",
      "ready",
      "completed",
    ].includes(status);
    const isProcessing = ["processing", "ready", "completed"].includes(status);
    const isReady = ["ready", "completed"].includes(status);

    return [
      { id: "submitted", label: "Submitted", done: isSubmitted, current: status === "submitted" || status === "pending" },
      { id: "review", label: "Under Review", done: isUnderReview, current: status === "under review" || status === "inprogress" || status === "pendingpayment" },
      { id: "processing", label: "Processing", done: isProcessing, current: status === "processing" },
      { id: "ready", label: "Ready to Claim", done: isReady, current: status === "ready" },
    ];
  }, [activeRequest]);

  // 3. Synthesize Full-Size Recent Milestones Feed (Registrar, Compliance & OSAS)
  const allMilestones = useMemo(() => {
    const events = [];

    // From Document Requests
    (data.requests || []).forEach((req) => {
      const s = normalizeStatus(req.status);
      let desc = `Document request for ${req.doc_type} was received.`;
      let icon = "ph-bold ph-tray";
      let tone = "default";
      let statusLabel = req.status || "Submitted";

      if (s === "ready") {
        desc = `Your ${req.doc_type} is approved and ready for claiming at Registrar Window 2. Bring a valid student ID.`;
        icon = "ph-bold ph-check-circle";
        tone = "emerald";
        statusLabel = "Ready for Pick-Up";
      } else if (s === "processing") {
        desc = `Registrar staff is currently printing and processing ${req.doc_type}.`;
        icon = "ph-bold ph-gear";
        tone = "blue";
        statusLabel = "Processing";
      } else if (s === "pendingpayment") {
        desc = `Payment verification pending. Please upload your official receipt.`;
        icon = "ph-bold ph-receipt";
        tone = "amber";
        statusLabel = "Payment Required";
      } else if (s === "under review" || s === "inprogress") {
        desc = `Registrar staff is evaluating your request credentials.`;
        icon = "ph-bold ph-eye";
        tone = "blue";
        statusLabel = "Under Review";
      } else if (s === "declined" || s === "rejected") {
        desc = `Request was declined${req.rejection_reason ? `: ${req.rejection_reason}` : "."}`;
        icon = "ph-bold ph-x-circle";
        tone = "rose";
        statusLabel = "Declined";
      } else if (s === "completed") {
        desc = `Official record ${req.doc_type} has been claimed and archived.`;
        icon = "ph-bold ph-archive";
        tone = "emerald";
        statusLabel = "Completed";
      }

      events.push({
        id: `milestone-req-${req.id}-${req.updated_at || req.created_at}`,
        category: "requests",
        title: req.doc_type,
        subtitle: `Ticket #${req.ticket_no || req.id}`,
        description: desc,
        date: req.updated_at || req.created_at,
        office: "Office of the Registrar",
        icon,
        tone,
        statusLabel,
        actionLabel: "View",
        onClick: () => onNavigate("odrs"),
      });
    });

    // From OSAS Proposals
    (data.proposals || []).forEach((prop) => {
      const s = normalizeStatus(prop.status);
      let desc = `Event proposal "${prop.title || prop.event_title}" was submitted for OSAS clearance.`;
      let icon = "ph-bold ph-calendar-blank";
      let tone = "blue";
      let statusLabel = prop.status || "Submitted";

      if (s === "approved" || s === "completed") {
        desc = `Event proposal "${prop.title || prop.event_title}" has been approved by Student Affairs.`;
        icon = "ph-bold ph-check-circle";
        tone = "emerald";
        statusLabel = "Approved";
      } else if (s === "needs revision" || s === "revisionsrequested") {
        desc = `Revisions requested: ${prop.evaluation_notes || "Please check evaluation feedback and resubmit."}`;
        icon = "ph-bold ph-arrow-counter-clockwise";
        tone = "amber";
        statusLabel = "Needs Revision";
      } else if (s === "declined" || s === "rejected") {
        desc = `Event proposal was declined by OSAS${prop.rejection_reason ? `: ${prop.rejection_reason}` : "."}`;
        icon = "ph-bold ph-x-circle";
        tone = "rose";
        statusLabel = "Declined";
      }

      events.push({
        id: `milestone-prop-${prop.id}-${prop.updated_at || prop.created_at}`,
        category: "osas",
        title: prop.title || prop.event_title || "Event Proposal",
        subtitle: prop.organization_name || "OSAS Proposal",
        description: desc,
        date: prop.updated_at || prop.created_at,
        office: "Student Affairs (OSAS)",
        icon,
        tone,
        statusLabel,
        actionLabel: "View",
        onClick: () => onNavigate("osas"),
      });
    });

    // From Compliance requirements that are submitted
    (complianceData?.requirements || [])
      .filter((r) => r.status === "Submitted" && r.document?.createdAt)
      .forEach((r) => {
        events.push({
          id: `milestone-comp-${r.id}`,
          category: "compliance",
          title: r.documentType,
          subtitle: "Permanent Admission Requirement",
          description: `Document has been physically verified, digitized, and archived in the institutional registry.`,
          date: r.document?.createdAt,
          office: "Office of the Registrar",
          icon: "ph-bold ph-file-check",
          tone: "emerald",
          statusLabel: "Archived",
          actionLabel: "View",
          onClick: () => onNavigate("compliance"),
        });
      });

    // From Post-Event Reports
    (postEventReports || []).forEach((report) => {
      events.push({
        id: `milestone-post-event-${report.id}`,
        category: "osas",
        title: report.event_title || "Post-Event Liquidation",
        subtitle: report.organization_name || "OSAS Report",
        description: `Post-event report and financial liquidation statement filed.`,
        date: report.updated_at || report.created_at,
        office: "Student Affairs (OSAS)",
        icon: "ph-bold ph-clipboard-text",
        tone: "blue",
        statusLabel: report.status || "Submitted",
        actionLabel: "View",
        onClick: () => onNavigate("osas"),
      });
    });

    // Sort by timestamp descending
    return events
      .filter((e) => Boolean(e.date))
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [data.requests, data.proposals, complianceData, postEventReports, onNavigate]);

  // Filtered milestones based on category tab
  const filteredMilestones = useMemo(() => {
    if (activityFilter === "all") return allMilestones;
    return allMilestones.filter((m) => m.category === activityFilter);
  }, [allMilestones, activityFilter]);

  // Clean student name and summaries
  const studentDisplayName = authUser?.fname || authUser?.name || "Student";
  const complianceSummary = complianceData?.summary;
  const isOfficer = myOrganizations.length > 0;
  const inFlightCount = (data.requests || []).filter((r) =>
    ["submitted", "pending", "under review", "underreview", "inprogress", "processing", "ready", "pendingpayment"].includes(
      normalizeStatus(r.status)
    )
  ).length;

  return (
    <div className="flex flex-col gap-6 w-full pb-12 font-jakarta animate-fade-up">
      {/* 1. Full-Width Header / Greeting Capsule */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 sm:p-6 rounded-2xl border border-border bg-white shadow-xs dark:bg-card w-full">
        <div className="flex items-center gap-4 min-w-0">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-red-50 text-pup-maroon border border-red-100 dark:bg-red-950/40 dark:border-red-900/40 dark:text-red-400">
            <HugeIcon className="ph-bold ph-student text-2xl" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg sm:text-xl font-bold tracking-tight text-gray-900 dark:text-zinc-50 truncate">
                Welcome back, {studentDisplayName}
              </h1>
              {authUser?.student_no && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-gray-100 text-gray-700 dark:bg-zinc-800 dark:text-zinc-300">
                  {authUser.student_no}
                </span>
              )}
              {isOfficer && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-800 border border-blue-200/60 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/40">
                  Verified Officer
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 dark:text-zinc-400 mt-1 truncate">
              PUPSJ Student Records & Activity Hub · Immediate status of your academic requests, checklist compliance, and event proposals.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0 self-end md:self-auto">
          <RefreshButton
            onRefresh={onRefresh}
            isLoading={refreshing}
            title="Refresh Overview"
          />
          <Button
            type="button"
            onClick={onNewRequest}
            className="flex h-10 px-5 text-xs font-semibold rounded-xl active:scale-95 transition-all cursor-pointer shadow-xs btn-brand-red text-white border-0"
            style={{ color: "#ffffff" }}
          >
            Request
          </Button>
        </div>
      </div>

      {/* 2. Urgent Attention Center (Rendered across full width when items need action) */}
      {attentionItems.length > 0 && (
        <div className="flex flex-col gap-2.5 w-full">
          <div className="flex items-center gap-2 px-1">
            <span className="flex h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-zinc-400">
              Attention Required ({attentionItems.length})
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 w-full">
            {attentionItems.map((item) => {
              const isAmber = item.theme === "amber";
              const isEmerald = item.theme === "emerald";
              const isBlue = item.theme === "blue";

              return (
                <div
                  key={item.id}
                  className={cn(
                    "flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl border transition-all shadow-2xs",
                    isAmber && "border-amber-200 bg-amber-50/70 text-amber-950 dark:border-amber-900/40 dark:bg-amber-950/25 dark:text-amber-200",
                    isEmerald && "border-emerald-200 bg-emerald-50/70 text-emerald-950 dark:border-emerald-900/40 dark:bg-emerald-950/25 dark:text-emerald-200",
                    isBlue && "border-blue-200 bg-blue-50/70 text-blue-950 dark:border-blue-900/40 dark:bg-blue-950/25 dark:text-blue-200"
                  )}
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div
                      className={cn(
                        "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
                        isAmber && "bg-amber-500/15 text-amber-700 dark:text-amber-400",
                        isEmerald && "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
                        isBlue && "bg-blue-500/15 text-blue-700 dark:text-blue-400"
                      )}
                    >
                      <HugeIcon className={cn(item.icon, "text-lg")} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-bold leading-tight truncate">{item.title}</span>
                        <span
                          className={cn(
                            "px-2 py-0.2 rounded-full text-[10px] font-bold border shrink-0",
                            isAmber && "bg-amber-100/90 text-amber-800 border-amber-300/80 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-800",
                            isEmerald && "bg-emerald-100/90 text-emerald-800 border-emerald-300/80 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-800",
                            isBlue && "bg-blue-100/90 text-blue-800 border-blue-300/80 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-800"
                          )}
                        >
                          {item.badge}
                        </span>
                      </div>
                      <p className="text-[11.5px] opacity-90 mt-1 leading-snug line-clamp-2">
                        {item.description}
                      </p>
                    </div>
                  </div>

                  <Button
                    type="button"
                    onClick={item.action}
                    className={cn(
                      "h-8 px-3.5 text-xs font-semibold rounded-xl active:scale-95 transition-all cursor-pointer shadow-xs shrink-0 self-start sm:self-center",
                      isAmber && "bg-amber-600 hover:bg-amber-700 text-white border-0",
                      isEmerald && "bg-emerald-600 hover:bg-emerald-700 text-white border-0",
                      isBlue && "bg-blue-600 hover:bg-blue-700 text-white border-0"
                    )}
                  >
                    {item.actionLabel}
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. Top Operational Row: Active Request Stepper + Campus Windows */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 w-full items-stretch">
        {/* Active Request Tracker Card (7 cols on lg, 8 cols on xl) */}
        <div className="lg:col-span-7 xl:col-span-8 flex flex-col gap-2.5">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <h2 className="text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-zinc-400">
                Active Request Tracking
              </h2>
              {inFlightCount > 0 && (
                <span className="px-2 py-0.2 rounded-full text-[10px] font-bold bg-pup-maroon/10 text-pup-maroon dark:bg-red-950/40 dark:text-red-400">
                  {inFlightCount} in progress
                </span>
              )}
            </div>
            {activeRequest && (
              <span className="text-xs font-mono text-gray-500 dark:text-zinc-400">
                Ticket #{activeRequest.ticket_no || activeRequest.id}
              </span>
            )}
          </div>

          {activeRequest ? (
            <Card className="p-5 sm:p-6 rounded-2xl border border-border bg-white shadow-xs dark:bg-card flex flex-col justify-between gap-4 h-full">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-pup-maroon dark:text-red-400">
                      Registrar Academic Request
                    </span>
                    <span className="text-gray-300 dark:text-zinc-700">•</span>
                    <span className="text-xs text-gray-500">
                      Requested on {formatPHDateTime(activeRequest.created_at)}
                    </span>
                  </div>
                  <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-zinc-50 mt-1 truncate">
                    {activeRequest.doc_type}
                  </h3>
                  {activeRequest.purpose && (
                    <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5 truncate">
                      Purpose: <span className="text-gray-700 dark:text-zinc-300 font-medium">{activeRequest.purpose}</span>
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2.5 shrink-0 self-start sm:self-center">
                  <Button
                    variant="outline"
                    onClick={() => onNavigate("odrs")}
                    className="h-8 px-3.5 text-xs font-semibold rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 active:scale-95 transition-all cursor-pointer shadow-xs"
                  >
                    View
                  </Button>
                </div>
              </div>

              {/* Stepper Pipeline */}
              <div className="flex flex-col gap-2 pt-1">
                <div className="grid grid-cols-4 gap-2.5">
                  {stepperSteps.map((step) => (
                    <div key={step.id} className="flex flex-col gap-2">
                      <div
                        className={cn(
                          "h-2 w-full rounded-full transition-all duration-300",
                          step.done
                            ? "bg-pup-maroon dark:bg-red-500 shadow-2xs"
                            : "bg-gray-100 dark:bg-zinc-800"
                        )}
                      />
                      <div className="flex items-center gap-1.5 min-w-0">
                        <HugeIcon
                          className={cn(
                            "text-xs shrink-0",
                            step.done ? "ph-fill ph-check-circle text-pup-maroon dark:text-red-400" : "ph-bold ph-circle text-gray-300 dark:text-zinc-700"
                          )}
                        />
                        <span
                          className={cn(
                            "text-[11px] truncate font-medium",
                            step.done
                              ? "text-gray-900 dark:text-zinc-100 font-bold"
                              : "text-gray-400 dark:text-zinc-500"
                          )}
                        >
                          {step.label}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Status Note or Next Step Callout */}
                <div className="mt-2 p-3 rounded-xl bg-gray-50 dark:bg-zinc-900/40 border border-border/80 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 text-gray-600 dark:text-zinc-300 min-w-0">
                    <HugeIcon className="ph-bold ph-info text-pup-maroon dark:text-red-400 text-sm shrink-0" />
                    <span className="truncate">
                      {normalizeStatus(activeRequest.status) === "ready"
                        ? "Your document is sealed and ready for release at Registrar Window 2. Bring a valid student ID."
                        : normalizeStatus(activeRequest.status) === "pendingpayment"
                        ? "Payment pending. Please upload the official university payment receipt to continue."
                        : "Official turnaround standard: 3 to 5 business days from verification."}
                    </span>
                  </div>
                </div>
              </div>
            </Card>
          ) : (
            <Card className="p-6 rounded-2xl border border-border bg-white shadow-xs dark:bg-card flex flex-col sm:flex-row sm:items-center justify-between gap-4 h-full">
              <div className="flex items-center gap-3.5">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-gray-500 dark:bg-zinc-800 dark:text-zinc-400">
                  <HugeIcon className="ph-bold ph-tray text-2xl" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900 dark:text-zinc-100">
                    No In-Flight Document Requests
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">
                    Need official credentials, TOR, certifications, or diploma duplicates? Submit a request anytime.
                  </p>
                </div>
              </div>
              <Button
                type="button"
                onClick={onNewRequest}
                className="h-9 px-4 text-xs font-semibold rounded-xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-900 shadow-xs cursor-pointer active:scale-95 transition-all shrink-0 self-start sm:self-auto"
              >
                Request
              </Button>
            </Card>
          )}
        </div>

        {/* Campus Service Windows Card (5 cols on lg, 4 cols on xl) */}
        <div className="lg:col-span-5 xl:col-span-4 flex flex-col gap-2.5">
          <h2 className="text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-zinc-400 px-1">
            Service Windows & Claiming
          </h2>

          <Card className="p-5 rounded-2xl border border-border bg-white shadow-xs dark:bg-card flex flex-col justify-between gap-3 h-full">
            <div className="flex items-center gap-2.5 pb-2 border-b border-border">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100 text-gray-700 dark:bg-zinc-800 dark:text-zinc-300">
                <HugeIcon className="ph-bold ph-buildings text-base" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-gray-900 dark:text-zinc-100">
                  Campus Service Windows
                </h3>
                <p className="text-[10.5px] text-gray-500 dark:text-zinc-400">
                  Operating hours & physical claiming
                </p>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-start gap-2.5">
                <div className="w-1.5 h-1.5 rounded-full bg-pup-maroon dark:bg-red-500 mt-1.5 shrink-0" />
                <div>
                  <span className="font-semibold text-gray-900 dark:text-zinc-100 block">
                    Campus Registrar (Window 2)
                  </span>
                  <span className="text-[11px] text-gray-500 dark:text-zinc-400">
                    Room 102, Ground Floor · Mon–Fri, 8:00 AM – 5:00 PM
                  </span>
                  <p className="text-[10.5px] text-gray-400 dark:text-zinc-500 mt-0.5">
                    Present university payment receipt & valid student ID to claim.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                <div>
                  <span className="font-semibold text-gray-900 dark:text-zinc-100 block">
                    Student Affairs & Services (OSAS)
                  </span>
                  <span className="text-[11px] text-gray-500 dark:text-zinc-400">
                    Room 104, Second Floor · Mon–Fri, 8:00 AM – 5:00 PM
                  </span>
                  <p className="text-[10.5px] text-gray-400 dark:text-zinc-500 mt-0.5">
                    Student organization accreditations, proposals & liquidations.
                  </p>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* 4. Quick Portals & Actions Hub (Full-Width 3-Column Grid) */}
      <div className="flex flex-col gap-2.5 w-full">
        <h2 className="text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-zinc-400 px-1">
          Quick Portals & Actions
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 w-full">
          {/* Action 1: Document Requests */}
          <button
            type="button"
            onClick={() => onNavigate("odrs")}
            className="group flex flex-col items-start p-5 rounded-2xl border border-border bg-white hover:border-pup-maroon/40 hover:bg-red-50/20 dark:bg-card dark:hover:bg-red-950/10 shadow-2xs hover:shadow-xs transition-all cursor-pointer text-left active:scale-[0.99]"
          >
            <div className="flex items-center justify-between w-full">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-pup-maroon border border-red-100 dark:bg-red-950/40 dark:border-red-900/40 dark:text-red-400 group-hover:scale-105 transition-transform">
                <HugeIcon className="ph-bold ph-tray-arrow-up text-xl" />
              </div>
              <span className="text-[10.5px] font-bold px-2 py-0.5 rounded-full bg-red-50 text-pup-maroon border border-red-100/60 dark:bg-red-950/40 dark:text-red-400 dark:border-red-900/40">
                {(data.requests || []).length} Records
              </span>
            </div>
            <span className="text-xs font-bold text-gray-900 dark:text-zinc-100 mt-3.5">
              Document Requests
            </span>
            <span className="text-[11px] text-gray-500 dark:text-zinc-400 mt-1 leading-normal">
              Official Transcript of Records, Certifications, and clearance requests.
            </span>
            <div className="mt-3 flex items-center gap-1.5 text-[11px] font-semibold text-pup-maroon dark:text-red-400">
              <span>View</span>
              <HugeIcon className="ph-bold ph-arrow-right text-[10px] group-hover:translate-x-1 transition-transform" />
            </div>
          </button>

          {/* Action 2: Document Checklist */}
          <button
            type="button"
            onClick={() => onNavigate("compliance")}
            className="group flex flex-col items-start p-5 rounded-2xl border border-border bg-white hover:border-emerald-500/40 hover:bg-emerald-50/20 dark:bg-card dark:hover:bg-emerald-950/10 shadow-2xs hover:shadow-xs transition-all cursor-pointer text-left active:scale-[0.99]"
          >
            <div className="flex items-center justify-between w-full">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-100 dark:bg-emerald-950/40 dark:border-emerald-900/40 dark:text-emerald-400 group-hover:scale-105 transition-transform">
                <HugeIcon className="ph-bold ph-clipboard-text text-xl" />
              </div>
              {complianceSummary && (
                <span className="text-[10.5px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100/60 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900/40">
                  {complianceSummary.submittedCount}/{complianceSummary.totalRequired} ({complianceSummary.complianceRate}%)
                </span>
              )}
            </div>
            <span className="text-xs font-bold text-gray-900 dark:text-zinc-100 mt-3.5">
              Document Checklist
            </span>
            <span className="text-[11px] text-gray-500 dark:text-zinc-400 mt-1 leading-normal">
              Verify physical archival compliance (Form 137, PSA, Good Moral).
            </span>
            <div className="mt-3 flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
              <span>View</span>
              <HugeIcon className="ph-bold ph-arrow-right text-[10px] group-hover:translate-x-1 transition-transform" />
            </div>
          </button>

          {/* Action 3: OSAS Submissions */}
          <button
            type="button"
            onClick={() => onNavigate("osas")}
            className="group flex flex-col items-start p-5 rounded-2xl border border-border bg-white hover:border-blue-500/40 hover:bg-blue-50/20 dark:bg-card dark:hover:bg-blue-950/10 shadow-2xs hover:shadow-xs transition-all cursor-pointer text-left active:scale-[0.99]"
          >
            <div className="flex items-center justify-between w-full">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700 border border-blue-100 dark:bg-blue-950/40 dark:border-blue-900/40 dark:text-blue-400 group-hover:scale-105 transition-transform">
                <HugeIcon className="ph-bold ph-student text-xl" />
              </div>
              {isOfficer && (
                <span className="text-[10.5px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100/60 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-900/40">
                  {(data.proposals || []).length} Active
                </span>
              )}
            </div>
            <span className="text-xs font-bold text-gray-900 dark:text-zinc-100 mt-3.5">
              OSAS Submissions
            </span>
            <span className="text-[11px] text-gray-500 dark:text-zinc-400 mt-1 leading-normal">
              Student organization event proposals, CBL approvals, and liquidation.
            </span>
            <div className="mt-3 flex items-center gap-1.5 text-[11px] font-semibold text-blue-700 dark:text-blue-400">
              <span>View</span>
              <HugeIcon className="ph-bold ph-arrow-right text-[10px] group-hover:translate-x-1 transition-transform" />
            </div>
          </button>
        </div>
      </div>

      {/* 5. FULL-SIZE Recent Activity & Institutional Updates (Spanning 100% Width) */}
      <div className="flex flex-col gap-2.5 w-full">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
          <div className="flex items-center gap-2.5">
            <h2 className="text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-zinc-400">
              Recent Activity & Institutional Updates
            </h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-700 dark:bg-zinc-800 dark:text-zinc-300">
              {filteredMilestones.length}
            </span>
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-1 bg-gray-100/80 dark:bg-zinc-800/60 p-1 rounded-xl border border-gray-200/60 dark:border-white/5 self-start sm:self-auto">
            {[
              { id: "all", label: "All Activity" },
              { id: "requests", label: "Registrar Requests" },
              { id: "compliance", label: "Permanent Records" },
              { id: "osas", label: "OSAS Affairs" },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActivityFilter(tab.id)}
                className={cn(
                  "px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer",
                  activityFilter === tab.id
                    ? "bg-white dark:bg-zinc-700 text-gray-900 dark:text-white shadow-xs"
                    : "text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Full-Width Activity Card */}
        <Card className="p-0 overflow-hidden rounded-2xl border border-border bg-white shadow-xs dark:bg-card w-full">
          {filteredMilestones.length > 0 ? (
            <div className="divide-y divide-border">
              {filteredMilestones.map((event) => {
                const isEmerald = event.tone === "emerald";
                const isAmber = event.tone === "amber";
                const isBlue = event.tone === "blue";
                const isRose = event.tone === "rose";

                return (
                  <div
                    key={event.id}
                    onClick={event.onClick}
                    className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 sm:p-5 hover:bg-gray-50/80 dark:hover:bg-zinc-900/40 transition-colors cursor-pointer group"
                  >
                    {/* Left: Icon, Title, and Description */}
                    <div className="flex items-start gap-4 min-w-0 flex-1">
                      <div
                        className={cn(
                          "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-transform group-hover:scale-105 mt-0.5",
                          isEmerald && "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400",
                          isAmber && "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400",
                          isBlue && "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400",
                          isRose && "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400",
                          !isEmerald && !isAmber && !isBlue && !isRose && "bg-gray-100 text-gray-700 dark:bg-zinc-800 dark:text-zinc-300"
                        )}
                      >
                        <HugeIcon className={cn(event.icon, "text-lg")} />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs sm:text-sm font-bold text-gray-900 dark:text-zinc-100 group-hover:text-pup-maroon dark:group-hover:text-red-400 transition-colors">
                            {event.title}
                          </span>
                          <span className="text-[11px] text-gray-400 font-mono">
                            {event.subtitle}
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-gray-100 text-gray-600 dark:bg-zinc-800 dark:text-zinc-400">
                            {event.office}
                          </span>
                        </div>
                        <p className="text-xs text-gray-600 dark:text-zinc-300 mt-1 leading-relaxed">
                          {event.description}
                        </p>
                      </div>
                    </div>

                    {/* Right: Status Pill Badge, Timestamp, and Action CTA */}
                    <div className="flex items-center gap-4 shrink-0 pl-14 md:pl-0 self-start md:self-center">
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold whitespace-nowrap",
                          isEmerald && "bg-emerald-50 text-emerald-800 border-emerald-200/80 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-800/40",
                          isAmber && "bg-amber-50 text-amber-800 border-amber-200/80 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-800/40",
                          isBlue && "bg-blue-50 text-blue-800 border-blue-200/80 dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-800/40",
                          isRose && "bg-rose-50 text-rose-800 border-rose-200/80 dark:bg-rose-950/30 dark:text-rose-300 dark:border-rose-800/40",
                          !isEmerald && !isAmber && !isBlue && !isRose && "bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300"
                        )}
                      >
                        {event.statusLabel}
                      </span>

                      <span className="text-[11px] text-gray-400 dark:text-zinc-500 whitespace-nowrap min-w-[120px] text-right hidden sm:inline-block">
                        {formatPHDateTime(event.date)}
                      </span>

                      <Button
                        variant="outline"
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          event.onClick();
                        }}
                        className="h-8 px-3 text-xs font-semibold rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 active:scale-95 transition-all cursor-pointer shadow-xs hidden md:inline-flex"
                      >
                        {event.actionLabel}
                      </Button>

                      <HugeIcon className="ph-bold ph-caret-right text-xs text-gray-400 group-hover:translate-x-1 group-hover:text-pup-maroon dark:group-hover:text-red-400 transition-all md:hidden" />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-12 text-center">
              <Empty className="flex h-[320px] flex-col items-center justify-center border-0 bg-transparent text-center">
                <EmptyHeader className="flex flex-col items-center gap-0">
                  <div className="relative mb-6">
                    <div className="absolute inset-0 scale-150 animate-pulse rounded-full bg-gray-50 opacity-50 dark:bg-card"></div>
                    <EmptyMedia className="relative z-10 flex h-20 w-20 items-center justify-center rounded-2xl border border-border bg-white shadow-md dark:border-border dark:bg-card dark:shadow-none">
                      <HugeIcon className="ph-clock-counter-clockwise text-2xl text-pup-maroon dark:text-primary" />
                    </EmptyMedia>
                  </div>
                  <EmptyTitle className="text-lg font-semibold text-gray-900 dark:text-zinc-50">
                    {activityFilter === "all" ? "No Recent Activity Yet" : "No Activity in this Category"}
                  </EmptyTitle>
                  <EmptyDescription className="max-w-xs text-sm font-medium text-gray-500 dark:text-zinc-400 mt-1">
                    {activityFilter === "all"
                      ? "Status updates for document requests, compliance archiving, and event proposals will be tracked here."
                      : `No status transitions recorded under ${activityFilter === "requests" ? "Registrar Requests" : activityFilter === "compliance" ? "Permanent Records" : "OSAS Affairs"}.`}
                  </EmptyDescription>
                  {activityFilter !== "all" && (
                    <Button
                      variant="outline"
                      onClick={() => setActivityFilter("all")}
                      title="View All Activity"
                      className="mt-6 flex h-10 items-center justify-center gap-2 rounded-xl border border-border dark:border-border bg-white dark:bg-zinc-800 px-5 text-xs font-semibold text-gray-700 dark:text-zinc-200 shadow-xs transition-all hover:bg-gray-50 dark:hover:bg-zinc-700 active:scale-95 cursor-pointer"
                    >
                      View All
                    </Button>
                  )}
                </EmptyHeader>
              </Empty>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
