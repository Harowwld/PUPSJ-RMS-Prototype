"use client";

import NoticeBanner from "@/components/shared/NoticeBanner";
import SheetSectionHeading from "@/components/shared/SheetSectionHeading";
import React, { useMemo, useState } from "react";

import ProfileAvatar from "@/components/shared/ProfileAvatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { RefreshButton } from "@/components/shared/RefreshButton";
import PageHeader from "@/components/shared/PageHeader";
import { SegmentedControl } from "@/components/ui/tabs";
import { formatPHDateTime } from "@/lib/timeFormat";
import { cn } from "@/lib/utils";
import { COMPACT_BADGE_BASE, SETTINGS_STATUS_PILL_SM, getStatusBadgeClass } from "@/lib/badgeStyles";
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyMedia,
  EmptyState,
  EmptyContent,
} from "@/components/ui/empty";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import StudentOverviewSkeleton from "@/components/student/skeletons/StudentOverviewSkeleton";
import NarrativeText from "@/components/shared/NarrativeText";
import { Clock01Icon as EmptyClock01Icon, InboxIcon , ArrowRight01Icon, ArrowRight02Icon, ArrowUpRight01Icon, Cancel01Icon, ClipboardIcon, CovidInfoIcon, File02Icon, FileUploadIcon, Shield01Icon, StudentIcon} from "hugeicons-react";
import AppIcon from "@/components/ui/app-icon";
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

function OverviewBadge({ children, className }) {
  return (
    <span className={cn(
      SETTINGS_STATUS_PILL_SM,
      "max-w-full font-semibold text-gray-900 dark:text-zinc-100",
      className
    )}>
      {children}
    </span>
  );
}

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
  onSelectRequest,
  onSelectProposal,
  onNewRequest,
  onRefresh,
  refreshing = false,
  loading = false,
  hasLoaded = false,
}) {
  const [activityFilter, setActivityFilter] = useState("all");
  const [selectedPostEventDetail, setSelectedPostEventDetail] = useState(null);

  const [overrideAvatar, setOverrideAvatar] = useState(null);
  const currentAvatarFilename = overrideAvatar ? overrideAvatar.filename : (authUser?.avatar_filename || null);
  const avatarTimestamp = overrideAvatar ? overrideAvatar.timestamp : null;

  React.useEffect(() => {
    const handleAvatarChanged = (e) => {
      if (e?.detail && "avatar_filename" in e.detail) {
        setOverrideAvatar({
          filename: e.detail.avatar_filename,
          timestamp: Date.now(),
        });
      }
    };
    window.addEventListener("avatar-changed", handleAvatarChanged);
    return () => window.removeEventListener("avatar-changed", handleAvatarChanged);
  }, []);

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
        description: `Your ${req.doc_type} (Ticket ${req.ticket_no || req.id}) has been printed. Visit Registrar Window 2 with your student ID to claim your physical document.`,
        highlightedPhrases: [req.doc_type],
        actionLabel: "View Pick-Up Info",
        redirects: !Boolean(onSelectRequest),
        action: () => {
          if (onSelectRequest) {
            onSelectRequest(req);
          } else {
            onNavigate("odrs");
          }
        },
        icon: " PackageIcon",
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
        description: `Ticket ${req.ticket_no || req.id} for ${req.doc_type} requires your official payment receipt for processing.`,
        highlightedPhrases: [req.doc_type],
        actionLabel: "Open Payment Details",
        redirects: !Boolean(onSelectRequest),
        action: () => {
          if (onSelectRequest) {
            onSelectRequest(req);
          } else {
            onNavigate("odrs");
          }
        },
        icon: " Invoice01Icon",
        badge: "Action Required",
        theme: "amber",
      });
    });

    // C. Missing Compliance Requirements
    const missingDocs = (complianceData?.requirements || []).filter(
      (r) => r.status === "Missing"
    );
    if (missingDocs.length > 0) {
      const topMissing = missingDocs.slice(0, 2).map((d) => d.docType || d.documentType || d.name).filter(Boolean);
      const extraCount = missingDocs.length - 2;
      const extraText = extraCount > 0 ? ` and ${extraCount} more` : "";
      items.push({
        id: "compliance-missing",
        type: "compliance",
        priority: 3,
        title: "Missing Permanent Admission Records",
        description: `You have ${missingDocs.length} unsubmitted enrollment requirement${missingDocs.length > 1 ? "s" : ""} (${topMissing.join(", ")}${extraText}). Submit physical hard copies to the Registrar Window to clear your hold.`,
        highlightedPhrases: topMissing,
        actionLabel: "Open Document Checklist",
        redirects: true,
        action: () => onNavigate("compliance"),
        icon: " ClipboardIcon",
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
        actionLabel: "View Proposal Feedback",
        redirects: !Boolean(onSelectProposal),
        action: () => {
          if (onSelectProposal) {
            onSelectProposal(prop);
          } else {
            onNavigate("osas");
          }
        },
        icon: " ReloadIcon",
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
        actionLabel: "Open OSAS Submissions",
        redirects: true,
        action: () => onNavigate("osas"),
        icon: " FileUploadIcon",
        badge: "Liquidation Due",
        theme: "blue",
      });
    }

    return items.sort((a, b) => a.priority - b.priority);
  }, [data.requests, data.proposals, complianceData, pendingPostEvents, onNavigate, onSelectRequest, onSelectProposal]);

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
      { id: "ready", label: "Ready for Pick-Up", done: isReady, current: status === "ready" },
    ];
  }, [activeRequest]);

  // 3. Synthesize Full-Size Recent Milestones Feed (Registrar, Compliance & OSAS)
  const allMilestones = useMemo(() => {
    const events = [];

    // From Document Requests
    (data.requests || []).forEach((req) => {
      const s = normalizeStatus(req.status);
      let desc = `Document request for ${req.doc_type} was received.`;
      let icon = " InboxIcon";
      let tone = "default";

      if (s === "ready") {
        desc = `Your ${req.doc_type} is approved and ready for claiming at Registrar Window 2. Bring a valid student ID.`;
        icon = " CheckmarkCircle01Icon";
        tone = "emerald";
      } else if (s === "processing") {
        desc = `Registrar staff is currently printing and processing ${req.doc_type}.`;
        icon = " Settings01Icon";
        tone = "blue";
      } else if (s === "pendingpayment") {
        desc = `Payment verification pending. Please upload your official receipt.`;
        icon = " Invoice01Icon";
        tone = "amber";
      } else if (s === "under review" || s === "inprogress") {
        desc = `Registrar staff is evaluating your request credentials.`;
        icon = " ViewIcon";
        tone = "blue";
      } else if (s === "declined" || s === "rejected") {
        desc = `Request was declined${req.rejection_reason ? `: ${req.rejection_reason}` : "."}`;
        icon = " CancelCircleIcon";
        tone = "rose";
      } else if (s === "completed") {
        desc = `Official record ${req.doc_type} has been claimed and archived.`;
        icon = " Archive01Icon";
        tone = "emerald";
      }

      events.push({
        id: `milestone-req-${req.id}-${req.updated_at || req.created_at}`,
        category: "requests",
        title: req.doc_type,
        subtitle: `Ticket ${req.ticket_no || req.id}`,
        description: desc,
        date: req.updated_at || req.created_at,
        office: "Office of the Registrar",
        icon,
        tone,
        actionLabel: "View Details",
        request: req,
        onClick: () => {
          if (onSelectRequest) {
            onSelectRequest(req);
          } else {
            onNavigate("odrs");
          }
        },
      });
    });

    // From OSAS Proposals
    (data.proposals || []).forEach((prop) => {
      const s = normalizeStatus(prop.status);
      let desc = `Event proposal "${prop.title || prop.event_title}" was submitted for OSAS clearance.`;
      let icon = " Calendar01Icon";
      let tone = "blue";

      if (s === "approved" || s === "completed") {
        desc = `Event proposal "${prop.title || prop.event_title}" has been approved by Student Affairs.`;
        icon = " CheckmarkCircle01Icon";
        tone = "emerald";
      } else if (s === "needs revision" || s === "revisionsrequested") {
        desc = `Revisions requested: ${prop.evaluation_notes || "Please check evaluation feedback and resubmit."}`;
        icon = " ReloadIcon";
        tone = "amber";
      } else if (s === "declined" || s === "rejected") {
        desc = `Event proposal was declined by OSAS${prop.rejection_reason ? `: ${prop.rejection_reason}` : "."}`;
        icon = " CancelCircleIcon";
        tone = "rose";
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
        actionLabel: "View Details",
        proposal: prop,
        onClick: () => {
          if (onSelectProposal) {
            onSelectProposal(prop);
          } else {
            onNavigate("osas");
          }
        },
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
        icon: " ClipboardIcon",
        tone: "blue",
        actionLabel: "View Details",
        report,
        onClick: () => setSelectedPostEventDetail(report),
      });
    });

    // Sort by timestamp descending
    return events
      .filter((e) => Boolean(e.date))
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [data.requests, data.proposals, postEventReports, onNavigate, onSelectRequest, onSelectProposal]);

  // Filtered milestones based on category tab
  const filteredMilestones = useMemo(() => {
    if (activityFilter === "all") return allMilestones;
    return allMilestones.filter((m) => m.category === activityFilter);
  }, [allMilestones, activityFilter]);

  const displayedMilestones = useMemo(() => {
    return filteredMilestones.slice(0, 5);
  }, [filteredMilestones]);

  const handleFilterChange = (tabId) => {
    setActivityFilter(tabId);
  };

  // Clean student name and summaries
  const studentDisplayName = authUser?.fname || authUser?.name || "Student";
  const studentAvatarName = authUser?.name || [authUser?.fname, authUser?.lname].filter(Boolean).join(" ") || studentDisplayName;
  const studentInitials = studentAvatarName
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "S";
  const complianceSummary = complianceData?.summary;
  const isParent = authUser?.client_type === "Parent";
  const isAlumni = authUser?.client_type === "Alumni";
  const requestActionLabel = isParent ? "Request on Behalf of a Student" : "Open Request Form";
  const overviewDescription = isParent
    ? "Request a student’s academic documents and track the Registrar’s review."
    : isAlumni
      ? "Request transcripts, diplomas, and other academic documents. Track your requests here."
      : "Track academic requests, review enrollment requirements, and open OSAS submissions.";
  const isOfficer = myOrganizations.length > 0;
  const inFlightCount = (data.requests || []).filter((r) =>
    ["submitted", "pending", "under review", "underreview", "inprogress", "processing", "ready", "pendingpayment"].includes(
      normalizeStatus(r.status)
    )
  ).length;

  // Render skeleton during initial load before datasets arrive
  if (loading && !hasLoaded) {
    return <StudentOverviewSkeleton />;
  }

  return (
    <div className="flex flex-col w-full flex-[1_0_auto] font-jakarta animate-fade-up">
      {/* ONE Single Card Container encapsulating Header, Attention, Active Tracking, Service Windows, Quick Portals & Activity */}
      <Card className="flex flex-[1_0_auto] h-auto w-full flex-col p-0 gap-0 overflow-hidden rounded-2xl border border-border bg-white shadow-sm dark:border-border dark:bg-card dark:shadow-none isolate font-jakarta">
        {/* 1. Standard Page Header */}
        <PageHeader
          leftAction={
            <ProfileAvatar
              id={authUser?.student_no || authUser?.id}
              avatarFilename={currentAvatarFilename ? `${currentAvatarFilename}&t=${avatarTimestamp}` : null}
              name={studentAvatarName}
              initials={studentInitials}
              className="size-11 rounded-full shadow-2xs shrink-0"
              fallbackClassName="text-sm font-semibold"
            />
          }
          title={
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="text-[18px] font-semibold tracking-[-0.01em] text-gray-900 dark:text-zinc-50">
                Welcome back, {studentDisplayName}
              </span>
              {authUser?.student_no && (
                <span className="text-[11px] font-normal tracking-normal text-gray-500 dark:text-zinc-400 tabular-nums">
                  {authUser.student_no}
                </span>
              )}
              {isOfficer && (
                <OverviewBadge>
                  <Shield01Icon size={12} className="shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                  Verified Officer
                </OverviewBadge>
              )}
            </div>
          }
          description={overviewDescription}
          className="p-6"
          titleClassName="text-[18px] font-semibold tracking-[-0.01em] text-gray-900 dark:text-zinc-50"
          descriptionClassName="text-[13px] font-normal text-gray-500 dark:text-zinc-400 mt-[4px]"
          actions={
            <div className="flex items-center gap-2">
              <RefreshButton
                onRefresh={onRefresh}
                isLoading={refreshing}
                title="Refresh Overview"
              />
              <Button
                type="button"
                size="sm"
                onClick={onNewRequest}
                className="h-9 shrink-0 px-4 text-xs font-semibold rounded-xl cursor-pointer"
              >
                {requestActionLabel}
              </Button>
            </div>
          }
        />

        {/* 2. Unified Content Body */}
        <div className="p-6 flex flex-[1_0_auto] flex-col gap-6">

      {/* 2. Urgent Attention Center — Inline Alerts (Full Width, Non-Floating) */}
      {attentionItems.length > 0 && (
        <div className="flex flex-col gap-2.5 w-full">
          <div className="flex items-center gap-2 px-0.5">
            <span className="flex h-2 w-2 rounded-full bg-amber-500" />
            <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-zinc-400">
              Attention Required ({attentionItems.length})
            </h2>
          </div>

          <div className="flex flex-col gap-2.5 w-full">
            {attentionItems.map((item) => {
              const isAmber = item.theme === "amber";
              const isEmerald = item.theme === "emerald";
              const isBlue = item.theme === "blue";

              return (
                <div
                  key={item.id}
                  role="alert"
                  className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 px-5 rounded-2xl border border-border dark:border-border bg-white dark:bg-card shadow-2xs hover:shadow-xs transition-all"
                >
                  <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                    <div
                      className={cn(
                        "size-10 shrink-0 rounded-full flex items-center justify-center",
                        isAmber && "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400",
                        isEmerald && "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400",
                        isBlue && "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400"
                      )}
                    >
                      <AppIcon className={cn(item.icon, "text-lg")} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-zinc-100 leading-tight truncate">
                          {item.title}
                        </span>
                        <OverviewBadge>
                          <AppIcon
                            className={cn(
                              item.icon,
                              "shrink-0 text-[12px]",
                              isEmerald ? "text-emerald-600 dark:text-emerald-400"
                                : isBlue ? "text-blue-600 dark:text-blue-400"
                                : "text-amber-600 dark:text-amber-400"
                            )}
                            aria-hidden="true"
                          />
                          {item.badge}
                        </OverviewBadge>
                      </div>
                      <div className="text-xs text-gray-500 dark:text-zinc-400 mt-1 leading-relaxed">
                        <NarrativeText text={item.description} mode="full" highlightedPhrases={item.highlightedPhrases} />
                      </div>
                    </div>
                  </div>

                  {item.redirects ? (
                    <button
                      type="button"
                      onClick={item.action}
                      className="after:absolute after:inset-0 after:rounded-2xl after:content-[''] focus-visible:after:ring-1 focus-visible:after:ring-pup-maroon group/btn inline-flex items-center gap-1.5 text-xs font-semibold text-pup-maroon dark:text-red-400 hover:underline underline-offset-4 transition-colors cursor-pointer shrink-0 self-start sm:self-center py-1.5 px-1"
                    >
                      <span>{item.actionLabel}</span>
                      <ArrowUpRight01Icon size={14} aria-hidden="true" className="shrink-0 transition-transform group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5" />
                    </button>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={item.action}
                      className="after:absolute after:inset-0 after:rounded-2xl after:content-[''] focus-visible:after:ring-1 focus-visible:after:ring-pup-maroon h-9 shrink-0 px-4 text-xs font-semibold rounded-xl border border-border dark:border-border bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-xs cursor-pointer active:scale-none transition-colors self-start sm:self-center"
                    >
                      {item.actionLabel}
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. Top Operational Row: Active Request Tracking (Full Width) */}
      <div className="flex flex-col gap-2.5 w-full">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-0.5">
          <div className="flex items-center gap-2">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-zinc-400">
              Active Request Tracking
            </h2>
            {inFlightCount > 0 && (
              <OverviewBadge className="tabular-nums">
                <EmptyClock01Icon size={12} className="shrink-0 text-blue-600 dark:text-blue-400" aria-hidden="true" />
                {inFlightCount} in progress
              </OverviewBadge>
            )}
          </div>
          {activeRequest && (
            <span className="text-xs font-medium tabular-nums text-gray-500 dark:text-zinc-400">
              Request #{activeRequest.ticket_no || activeRequest.id}
            </span>
          )}
        </div>

        {activeRequest ? (
          <div className="overflow-hidden rounded-2xl border border-border dark:border-border bg-white dark:bg-card shadow-2xs flex flex-col w-full">
            <div className="p-6 flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border dark:border-border">
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
                    size="sm"
                    onClick={() => {
                      if (onSelectRequest && activeRequest) {
                        onSelectRequest(activeRequest);
                      } else {
                        onNavigate?.("odrs");
                      }
                    }}
                    className="h-9 shrink-0 px-4 text-xs font-semibold rounded-xl border border-border dark:border-border bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-xs cursor-pointer active:scale-95 transition-all"
                  >
                    View Details
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
                        <AppIcon
                          className={cn(
                            "text-xs shrink-0",
                            step.done ? " CheckmarkCircle01Icon text-pup-maroon dark:text-red-400" : " CircleIcon text-gray-300 dark:text-zinc-700"
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
              </div>
            </div>

            {/* Attached Edge-to-Edge Bottom Notice Strip */}
            <NoticeBanner tone={normalizeStatus(activeRequest.status) === "ready" ? "success" : normalizeStatus(activeRequest.status) === "pendingpayment" ? "warning" : "info"}>
              {normalizeStatus(activeRequest.status) === "ready"
                ? "Your document is sealed and ready for release at Registrar Window 2. Bring a valid student ID."
                : normalizeStatus(activeRequest.status) === "pendingpayment"
                ? "Payment pending. Please upload the official university payment receipt to continue."
                : "Official turnaround standard: 3 to 5 business days from verification."}
            </NoticeBanner>
          </div>
        ) : (
          <EmptyState
            variant="compact"
            className="rounded-2xl border border-border dark:border-border bg-white dark:bg-card shadow-2xs"
            icon={InboxIcon}
            title="No In-Flight Document Requests"
            description="Need official credentials, TOR, certifications, or diploma duplicates? Submit a request anytime."
          >
            <Button
              type="button"
              size="sm"
              onClick={onNewRequest}
              className="h-9 px-4 text-xs font-semibold rounded-xl cursor-pointer"
            >
              {requestActionLabel}
            </Button>
          </EmptyState>
        )}
      </div>

      {/* 4. Quick Portals & Actions Hub (Full-Width 3-Column Grid) */}
      <div className="flex flex-col gap-2.5 w-full">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-zinc-400 px-0.5">
          Quick Portals &amp; Actions
        </h2>

        <div className="grid w-full grid-cols-1 gap-3.5 sm:grid-cols-3">
          {/* Action 1: Document Requests */}
          <button
            type="button"
            onClick={() => onNavigate("odrs")}
            className="group flex flex-col items-start p-5 rounded-2xl border border-border dark:border-border bg-white dark:bg-card shadow-2xs hover:shadow-xs hover:border-gray-300 dark:hover:border-zinc-700 transition-all cursor-pointer text-left active:scale-[0.99]"
          >
            <div className="flex items-center justify-between w-full">
              <div className="flex size-10 items-center justify-center rounded-full bg-red-50 text-pup-maroon dark:bg-red-950/40 dark:text-red-400 group-hover:scale-105 transition-transform">
                <FileUploadIcon size="1em" className="text-lg" />
              </div>
              <OverviewBadge className="tabular-nums">
                <FileUploadIcon size={12} className="shrink-0 text-pup-maroon dark:text-red-400" aria-hidden="true" />
                {(data.requests || []).length} Records
              </OverviewBadge>
            </div>
            <span className="text-xs font-bold text-gray-900 dark:text-zinc-100 mt-3.5">
              Document Requests
            </span>
            <span className="text-[11px] text-gray-500 dark:text-zinc-400 mt-1 leading-normal">
              {isParent ? "See what to attach, submit a request, and track its status." : "Browse available transcripts, certifications, and other academic documents."}
            </span>
            <div className="mt-3 flex items-center gap-1.5 text-[11px] font-semibold text-pup-maroon dark:text-red-400 group-hover:underline underline-offset-4">
              <span>Open Document Requests</span>
              <ArrowUpRight01Icon size="1em" className="text-[12px] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </div>
          </button>

          {!isParent && !isAlumni && authUser?.portal_setup_complete !== false && (
            <>
          {/* Action 2: Document Checklist */}
          <button
            type="button"
            onClick={() => onNavigate("compliance")}
            className="group flex flex-col items-start p-5 rounded-2xl border border-border dark:border-border bg-white dark:bg-card shadow-2xs hover:shadow-xs hover:border-gray-300 dark:hover:border-zinc-700 transition-all cursor-pointer text-left active:scale-[0.99]"
          >
            <div className="flex items-center justify-between w-full">
              <div className="flex size-10 items-center justify-center rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 group-hover:scale-105 transition-transform">
                <ClipboardIcon size="1em" className="text-lg" />
              </div>
              {complianceSummary && (
                <OverviewBadge className="tabular-nums">
                  <ClipboardIcon size={12} className="shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                  {complianceSummary.submittedCount}/{complianceSummary.totalRequired} ({complianceSummary.complianceRate}%)
                </OverviewBadge>
              )}
            </div>
            <span className="text-xs font-bold text-gray-900 dark:text-zinc-100 mt-3.5">
              Document Checklist
            </span>
            <span className="text-[11px] text-gray-500 dark:text-zinc-400 mt-1 leading-normal">
              Review the documents students need to submit for enrollment.
            </span>
            <div className="mt-3 flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 group-hover:underline underline-offset-4">
              <span>Open Document Checklist</span>
              <ArrowUpRight01Icon size="1em" className="text-[12px] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </div>
          </button>

          {/* Action 3: OSAS Submissions */}
          <button
            type="button"
            onClick={() => onNavigate("osas")}
            className="group flex flex-col items-start p-5 rounded-2xl border border-border dark:border-border bg-white dark:bg-card shadow-2xs hover:shadow-xs hover:border-gray-300 dark:hover:border-zinc-700 transition-all cursor-pointer text-left active:scale-[0.99]"
          >
            <div className="flex items-center justify-between w-full">
              <div className="flex size-10 items-center justify-center rounded-full bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 group-hover:scale-105 transition-transform">
                <StudentIcon size="1em" className="text-lg" />
              </div>
              <OverviewBadge className="tabular-nums">
                <StudentIcon size={12} className="shrink-0 text-blue-600 dark:text-blue-400" aria-hidden="true" />
                {isOfficer ? `${(data.proposals || []).length} Active` : "Officer access required"}
              </OverviewBadge>
            </div>
            <span className="text-xs font-bold text-gray-900 dark:text-zinc-100 mt-3.5">
              OSAS Submissions
            </span>
            <span className="text-[11px] text-gray-500 dark:text-zinc-400 mt-1 leading-normal">
              Student organization event proposals, CBL approvals, and liquidation.
            </span>
            <div className="mt-3 flex items-center gap-1.5 text-[11px] font-semibold text-blue-700 dark:text-blue-400 group-hover:underline underline-offset-4">
              <span>Open OSAS Submissions</span>
              <ArrowUpRight01Icon size="1em" className="text-[12px] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </div>
          </button>
            </>
          )}
        </div>
      </div>

      {/* 5. FULL-SIZE Recent Activity & Institutional Updates (Spanning 100% Width) */}
      <div className="flex flex-[1_0_auto] flex-col gap-2.5 w-full">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-0.5">
          <div className="flex items-center gap-2.5">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-zinc-400">
              Recent Activity &amp; Institutional Updates
            </h2>
            <OverviewBadge className="tabular-nums">
              {filteredMilestones.length}
            </OverviewBadge>
          </div>

          {/* Category Filter Pills */}
          <SegmentedControl
            value={activityFilter}
            onValueChange={handleFilterChange}
            variant="capsule"
            className="inline-grid grid-flow-col auto-cols-fr shrink-0 self-start sm:self-auto"
            items={[
              { value: "all", label: "All Activity" },
              { value: "requests", label: "Registrar Requests" },
              { value: "compliance", label: "Permanent Records" },
              { value: "osas", label: "OSAS Affairs" },
            ]}
          />
        </div>

        {/* Full-Width Activity Panel */}
        <div className="p-0 flex flex-[1_0_auto] flex-col overflow-hidden rounded-2xl border border-border dark:border-border bg-white dark:bg-card shadow-2xs w-full">
          {displayedMilestones.length > 0 ? (
            <div className="divide-y divide-border flex-[1_0_auto]">
              {displayedMilestones.map((event) => {
                const isEmerald = event.tone === "emerald";
                const isAmber = event.tone === "amber";
                const isBlue = event.tone === "blue";
                const isRose = event.tone === "rose";

                return (
                  <div
                    key={event.id}
                    onClick={event.onClick}
                    className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 sm:p-5 hover:bg-gray-50/70 dark:hover:bg-zinc-900/40 transition-colors cursor-pointer group"
                  >
                    {/* Left: Icon, Title, and Description */}
                    <div className="flex items-start gap-4 min-w-0 flex-1">
                      <div
                        className={cn(
                          "size-10 shrink-0 rounded-full flex items-center justify-center transition-transform group-hover:scale-105 mt-0.5",
                          isEmerald && "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400",
                          isAmber && "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400",
                          isBlue && "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400",
                          isRose && "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400",
                          !isEmerald && !isAmber && !isBlue && !isRose && "bg-gray-100 text-gray-700 dark:bg-zinc-800 dark:text-zinc-300"
                        )}
                      >
                        <AppIcon className={cn(event.icon, "text-lg")} />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs sm:text-sm font-bold text-gray-900 dark:text-zinc-100 group-hover:text-pup-maroon dark:group-hover:text-red-400 transition-colors">
                            {event.title}
                          </span>
                          <span className="text-[11px] text-gray-400 font-sans tabular-nums">
                            {event.subtitle}
                          </span>
                          <OverviewBadge>{event.office}</OverviewBadge>
                        </div>
                        <div className="text-xs text-gray-600 dark:text-zinc-300 mt-1 leading-relaxed">
                          <NarrativeText text={event.description} mode="full" />
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 shrink-0 pl-14 md:pl-0 self-start md:self-center">
                      <span className="text-[11px] text-gray-400 dark:text-zinc-500 whitespace-nowrap min-w-[120px] text-right hidden sm:inline-block">
                        {formatPHDateTime(event.date)}
                      </span>

                      <Button
                        variant="outline"
                        type="button"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          event.onClick();
                        }}
                        className="h-8 px-3 text-xs font-semibold rounded-xl border border-border dark:border-border bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-xs cursor-pointer active:scale-95 transition-all hidden md:inline-flex"
                      >
                        {event.actionLabel}
                      </Button>

                      <ArrowRight01Icon size="1em" className="text-xs text-gray-400 group-hover:translate-x-1 group-hover:text-pup-maroon dark:group-hover:text-red-400 transition-all md:hidden" />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-b-2xl flex-1 flex flex-col items-center justify-center min-h-[420px] w-full">
              <Empty>
                <EmptyHeader>
                  <EmptyMedia><EmptyClock01Icon size="1em" /></EmptyMedia>
                  <EmptyTitle>
                    {activityFilter === "all" ? "No Recent Activity Yet" : "No Activity in this Category"}
                  </EmptyTitle>
                  <EmptyDescription>
                    {activityFilter === "all"
                      ? "Updates for document requests, enrollment records, and OSAS submissions will appear here."
                      : `No status transitions recorded under ${activityFilter === "requests" ? "Registrar Requests" : activityFilter === "compliance" ? "Permanent Records" : "OSAS Affairs"}.`}
                  </EmptyDescription>
                </EmptyHeader>
                {activityFilter !== "all" && (
                  <EmptyContent>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleFilterChange("all")}
                      title="View All Activity"
                      className="flex h-9 items-center justify-center gap-2 rounded-xl border border-border dark:border-border bg-white dark:bg-zinc-800 px-4 text-xs font-semibold text-gray-700 dark:text-zinc-200 shadow-xs transition-all hover:bg-gray-50 dark:hover:bg-zinc-700 active:scale-95 cursor-pointer"
                    >
                      View All Activity
                    </Button>
                  </EmptyContent>
                )}
              </Empty>
            </div>
          )}
        </div>
      </div>
        </div>
      </Card>

      {/* 2. Standardized Post-Event Report Details Sheet */}
      <Sheet
        open={Boolean(selectedPostEventDetail)}
        onOpenChange={(open) => !open && setSelectedPostEventDetail(null)}
      >
        <SheetContent
          side="right"
          size="default"
          showCloseButton={false}
          className="w-full sm:max-w-md md:max-w-lg lg:max-w-xl flex flex-col h-full font-jakarta p-0 overflow-hidden"
        >
          <SheetHeader className="shrink-0 p-0">
            <div className="flex items-center justify-between px-6 py-4">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <SheetTitle>Post-Event Liquidation Details</SheetTitle>
                  <span className={cn(COMPACT_BADGE_BASE, getStatusBadgeClass(selectedPostEventDetail?.status || "Submitted"))}>
                    {selectedPostEventDetail?.status || "Submitted"}
                  </span>
                </div>
                <SheetDescription className="sr-only">
                  Event report and liquidation statement info
                </SheetDescription>
              </div>

              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => setSelectedPostEventDetail(null)}
                    className="size-8 rounded-full bg-black/[0.04] hover:bg-black/[0.08] dark:bg-white/[0.08] dark:hover:bg-white/[0.14] text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-zinc-100 flex items-center justify-center transition-all cursor-pointer active:scale-95 border border-black/[0.04] dark:border-white/[0.08] shadow-2xs"
                    aria-label="Close"
                  >
                    <Cancel01Icon size="1em" className="text-sm" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>Close</TooltipContent>
              </Tooltip>
            </div>
          </SheetHeader>

          {/* Line-Attached Edge-to-Edge Status Notice */}
          <NoticeBanner tone={["Approved", "Completed", "Cleared"].includes(selectedPostEventDetail?.status) ? "success" : selectedPostEventDetail?.status === "Needs Revision" ? "warning" : selectedPostEventDetail?.status === "Declined" ? "danger" : "info"} title={["Approved", "Completed", "Cleared"].includes(selectedPostEventDetail?.status)
                  ? "Liquidation Cleared"
                  : selectedPostEventDetail?.status === "Needs Revision" ? "Revision Required" : selectedPostEventDetail?.status === "Declined" ? "Report Declined" : "Report Submitted"}>
            <NarrativeText
                text={
                  ["Approved", "Completed", "Cleared"].includes(selectedPostEventDetail?.status)
                    ? "Financial liquidation statement and narrative report approved by OSAS."
                    : selectedPostEventDetail?.status === "Needs Revision"
                    ? "Review the feedback and resubmit the report."
                    : selectedPostEventDetail?.status === "Declined"
                    ? "OSAS declined the report."
                    : "Documentation is logged and pending OSAS financial liquidation evaluation."
                }
                mode="full"
              />
          </NoticeBanner>

          <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin">
            {/* Unboxed Event Identity Block */}
            <div className="flex items-start gap-3.5 pb-4 border-b border-border/80 dark:border-border">
              <div className="w-11 h-11 rounded-full bg-blue-500/10 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 flex items-center justify-center text-lg shrink-0 font-bold mt-0.5 shadow-2xs">
                <ClipboardIcon size={16}  />
              </div>
              <div className="min-w-0 flex-1">
                <OverviewBadge className="mb-1">
                  {selectedPostEventDetail?.organization_name || "Student Affairs"}
                </OverviewBadge>
                <h3 className="text-base font-bold text-gray-900 dark:text-zinc-100 leading-snug break-words">
                  {selectedPostEventDetail?.event_title}
                </h3>
                <p className="text-xs text-gray-500 dark:text-zinc-400 mt-1">
                  Submitted on {formatPHDateTime(selectedPostEventDetail?.created_at || selectedPostEventDetail?.updated_at)}
                </p>
              </div>
            </div>

            {/* Post-Event Specification (Unboxed InfoRow List) */}
            <div className="space-y-2">
              <SheetSectionHeading icon="SlidersHorizontalIcon" title="Post-Event Specification" />
              <div className="divide-y divide-gray-100/70 dark:divide-zinc-800/50">
                <InfoRow icon="Building01Icon" label="Organization" value={selectedPostEventDetail?.organization_name || "Student Affairs"} />
                <InfoRow icon="UserSearch01Icon" label="Actual Attendance" value={`${selectedPostEventDetail?.actual_attendance || 0} participants`} />
                <InfoRow icon="DollarCircleIcon" label="Total Expenses" value={`₱${Number(selectedPostEventDetail?.total_expenses || 0).toLocaleString()}`} />
                {selectedPostEventDetail?.review_note && (
                  <InfoRow icon="Message01Icon" label="OSAS Note">
                    <NarrativeText text={selectedPostEventDetail.review_note} mode="full" />
                  </InfoRow>
                )}
              </div>
            </div>

            {/* Attached Report Documents (Unboxed, Single Sleek Rows) */}
            {(selectedPostEventDetail?.narrative_original_filename || selectedPostEventDetail?.liquidation_original_filename) && (
              <div className="space-y-2 pt-3 border-t border-gray-100 dark:border-zinc-800">
                <SheetSectionHeading icon="Attachment01Icon" title="Attached Report Documents" />
                <div className="space-y-2">
                  {selectedPostEventDetail?.narrative_original_filename && (
                    <div className="flex items-center justify-between gap-2.5 p-2.5 rounded-xl bg-gray-50/70 dark:bg-zinc-800/40 border border-border/70 dark:border-border/60">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400">
                          <File02Icon size="1em" className="text-base" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-gray-900 dark:text-zinc-100 truncate">
                            {selectedPostEventDetail.narrative_original_filename}
                          </p>
                          <p className="text-[10px] text-gray-400 dark:text-zinc-500 font-sans tabular-nums">
                            Narrative Event Report
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                  {selectedPostEventDetail?.liquidation_original_filename && (
                    <div className="flex items-center justify-between gap-2.5 p-2.5 rounded-xl bg-gray-50/70 dark:bg-zinc-800/40 border border-border/70 dark:border-border/60">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                          <AppIcon className=" Invoice01Icon text-base" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-gray-900 dark:text-zinc-100 truncate">
                            {selectedPostEventDetail.liquidation_original_filename}
                          </p>
                          <p className="text-[10px] text-gray-400 dark:text-zinc-500 font-sans tabular-nums">
                            Financial Liquidation Statement
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <SheetFooter className="shrink-0 p-4 px-6 flex flex-row items-center justify-between">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setSelectedPostEventDetail(null)}
              className="h-9 px-4 text-xs font-semibold rounded-xl border border-border dark:border-border bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-xs cursor-pointer active:scale-95 transition-all"
            >
              Close
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
