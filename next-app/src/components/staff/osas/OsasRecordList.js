"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { BADGE_BASE } from "@/lib/badgeStyles";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import {
  ArrowDown01Icon,
  CalendarCheckIn01Icon,
  ClipboardIcon,
  ViewIcon,
} from "hugeicons-react";

const PROPOSAL_STATUS_GROUPS = [
  { key: "Submitted", label: "Submitted" },
  { key: "Under Review", label: "Under Review" },
  { key: "Needs Revision", label: "Needs Revision" },
  { key: "Approved", label: "Approved" },
  { key: "Declined", label: "Declined" },
];

const POST_EVENT_STATUS_GROUPS = [
  { key: "Submitted", label: "Submitted" },
  { key: "Under Review", label: "Under Review" },
  { key: "Needs Revision", label: "Needs Revision" },
  { key: "Cleared", label: "Cleared" },
  { key: "Declined", label: "Declined" },
];

export function getProposalStatusBadgeClass(status) {
  switch (status) {
    case "Approved":
      return "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/40";
    case "Under Review":
      return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/40";
    case "Needs Revision":
      return "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/40";
    case "Declined":
      return "bg-gray-100 text-gray-700 border-gray-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700";
    default:
      return "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/40";
  }
}

export function getPostEventStatusBadgeClass(status) {
  switch (status) {
    case "Cleared":
      return "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/40";
    case "Under Review":
      return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/40";
    case "Needs Revision":
      return "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/40";
    case "Declined":
      return "bg-gray-100 text-gray-700 border-gray-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700";
    default:
      return "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/40";
  }
}

export default function OsasRecordList({
  items = [],
  stream = "proposals",
  groupBy = "status",
  onSelect,
  onReview,
}) {
  const isPostEvent = stream === "post_events";
  const [collapsedGroups, setCollapsedGroups] = useState({});

  const toggleGroup = (key) => {
    setCollapsedGroups((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const groupedData = useMemo(() => {
    if (groupBy === "none") {
      return [{ key: "all", label: isPostEvent ? "All Post-Event Reports" : "All Proposals", items }];
    }

    if (groupBy === "organization") {
      const orgMap = new Map();
      items.forEach((item) => {
        const orgName = (
          isPostEvent
            ? item.organization_name
            : item.verified_org_name || item.organization_name
        ) || "Independent Submitter";
        if (!orgMap.has(orgName)) orgMap.set(orgName, []);
        orgMap.get(orgName).push(item);
      });
      return [...orgMap.entries()].map(([org, list]) => ({
        key: org,
        label: org,
        items: list,
      }));
    }

    // Default: Group by Status
    const defaultGroups = isPostEvent ? POST_EVENT_STATUS_GROUPS : PROPOSAL_STATUS_GROUPS;
    const groupMap = new Map(defaultGroups.map((g) => [g.key, { ...g, items: [] }]));
    const otherGroup = { key: "Other", label: "Other Status", items: [] };

    items.forEach((item) => {
      const statusKey = item.status || "Submitted";
      const target = groupMap.get(statusKey);
      if (target) {
        target.items.push(item);
      } else {
        otherGroup.items.push(item);
      }
    });

    const result = [...groupMap.values()].filter((g) => g.items.length > 0);
    if (otherGroup.items.length > 0) result.push(otherGroup);
    return result;
  }, [items, groupBy, isPostEvent]);

  return (
    <div className="w-full flex flex-col bg-white dark:bg-card divide-y divide-border dark:divide-border select-none">
      {groupedData.map((group) => {
        const isCollapsed = collapsedGroups[group.key] === true;
        const groupId = `osas-${stream}-${group.key.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;

        return (
          <section key={group.key} aria-labelledby={`${groupId}-header`} className="w-full flex flex-col">
            {groupBy !== "none" && (
              <h3 id={`${groupId}-header`}>
                <button
                  type="button"
                  onClick={() => toggleGroup(group.key)}
                  aria-expanded={!isCollapsed}
                  className="w-full flex items-center justify-between px-6 py-2.5 bg-gray-50/75 dark:bg-zinc-900/60 hover:bg-gray-100/75 dark:hover:bg-zinc-800/60 transition-colors text-left cursor-pointer border-b border-border/70 dark:border-border/70"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <ArrowDown01Icon
                      size="1em"
                      className={cn(
                        "text-xs text-gray-500 dark:text-zinc-400 transition-transform duration-200 shrink-0",
                        isCollapsed && "-rotate-90"
                      )}
                    />
                    <span className="text-xs font-semibold text-gray-900 dark:text-zinc-100 tracking-[-0.01em] truncate">
                      {group.label}
                    </span>
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-black/[0.06] dark:bg-white/10 text-gray-600 dark:text-zinc-300 tabular-nums">
                      {group.items.length}
                    </span>
                  </div>
                </button>
              </h3>
            )}

            {!isCollapsed && (
              <div role="list" className="w-full divide-y divide-border/70 dark:divide-border/70">
                {group.items.map((item) => {
                  const title = isPostEvent ? item.event_title : item.title;
                  const organization = isPostEvent
                    ? item.organization_name
                    : item.verified_org_name || item.organization_name;
                  const submittedBy = item.student_name || item.submitted_by_name || "Unknown submitter";
                  const submitterId = item.submitted_by_email || item.student_no;
                  const status = item.status || "Submitted";
                  const badgeClass = isPostEvent
                    ? getPostEventStatusBadgeClass(status)
                    : getProposalStatusBadgeClass(status);
                  const dateFormatted = item.created_at
                    ? new Date(item.created_at).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })
                    : "Date unavailable";
                  const attendees = item.actual_attendance ?? item.total_attendance ?? item.actual_attendees ?? 0;
                  const expenses = Number(item.total_expenses ?? item.actual_expenses ?? 0);

                  return (
                    <div
                      key={item.id}
                      role="listitem"
                      onClick={() => onSelect?.(item)}
                      className="group flex flex-col sm:flex-row sm:items-center justify-between p-4 px-6 gap-3.5 hover:bg-gray-50/70 dark:hover:bg-zinc-800/40 transition-colors cursor-pointer"
                    >
                      {/* Left: Main details */}
                      <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[11px] font-semibold text-gray-500 dark:text-zinc-400 tabular-nums shrink-0">
                            #{item.id}
                          </span>
                          <span className="text-xs font-semibold text-gray-900 dark:text-zinc-50 group-hover:text-pup-maroon dark:group-hover:text-red-400 transition-colors truncate">
                            {title || "Untitled Submission"}
                          </span>
                          {organization && (
                            <span className="text-xs text-gray-500 dark:text-zinc-400 truncate">
                              · {item.org_acronym ? `${item.org_acronym} — ` : ""}{organization}
                            </span>
                          )}
                        </div>

                        {/* Metadata strip */}
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-gray-500 dark:text-zinc-400">
                          <span className="font-medium text-gray-700 dark:text-zinc-300 truncate">
                            {submittedBy}
                            {submitterId ? ` (${submitterId})` : ""}
                          </span>

                          {isPostEvent ? (
                            <span className="tabular-nums">
                              {Number(attendees).toLocaleString()} attendees · ₱{expenses.toLocaleString(undefined, { minimumFractionDigits: 2 })} liquidated
                            </span>
                          ) : (
                            <>
                              {item.officer_position && (
                                <span className="px-1.5 py-0.2 rounded bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 font-normal">
                                  {item.officer_position}
                                </span>
                              )}
                              {item.has_bylaws != null && (
                                <span className={cn(
                                  "px-1.5 py-0.2 rounded text-[10px] font-semibold border",
                                  item.has_bylaws
                                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/40"
                                    : "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-800/40"
                                )}>
                                  {item.has_bylaws ? "CBL Active" : "No CBL"}
                                </span>
                              )}
                              {item.post_event_status && item.status === "Approved" && (
                                <span className="text-[10px] text-purple-700 dark:text-purple-300 font-medium">
                                  Post-Event: {item.post_event_status}
                                </span>
                              )}
                            </>
                          )}

                          <span className="tabular-nums text-gray-400 dark:text-zinc-500">
                            Submitted {dateFormatted}
                          </span>
                        </div>
                      </div>

                      {/* Right: Text-Only Badge & Action Button */}
                      <div className="flex items-center gap-3 shrink-0 self-start sm:self-auto" onClick={(e) => e.stopPropagation()}>
                        {/* Apple HIG Text-Only Status Badge (NO indicator dot) */}
                        <div
                          className={cn(
                            BADGE_BASE,
                            badgeClass
                          )}
                        >
                          {status}
                        </div>

                        {/* Review / Details Action Button */}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              type="button"
                              onClick={() => onReview?.(item)}
                              aria-label={isPostEvent ? `Review clearance for ${title}` : `Review proposal for ${title}`}
                              className="h-8 w-8 rounded-lg flex items-center justify-center text-gray-500 hover:text-pup-maroon hover:bg-gray-100 dark:text-zinc-400 dark:hover:text-red-400 dark:hover:bg-zinc-800 cursor-pointer active:scale-95 transition-all"
                            >
                              <ClipboardIcon size={16} />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent>
                            {isPostEvent ? "Review Clearance" : "Review Proposal"}
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
