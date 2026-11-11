"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { BADGE_BASE, BADGE_PALETTES, getStatusBadgeClass } from "@/lib/badgeStyles";
import { formatPHDateTime, formatRelativeTime } from "@/lib/timeFormat";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { useTablePreferences } from "@/components/shared/TablePreferences";
import { getListDensityClasses } from "@/lib/tablePresentation";
import {
  ArrowDown01Icon,
  CalendarCheckIn01Icon,
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
  return getStatusBadgeClass(status);
}

export function getPostEventStatusBadgeClass(status) {
  return status === "Cleared" ? BADGE_PALETTES.emerald : getStatusBadgeClass(status);
}

export default function OsasRecordList({
  items = [],
  stream = "proposals",
  groupBy = "status",
  onSelect,
  onReview,
}) {
  const { density } = useTablePreferences();
  const densityClasses = getListDensityClasses(density);
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
                  className="w-full flex items-center justify-between px-5 py-2.5 bg-gray-50/80 dark:bg-zinc-900/60 hover:bg-gray-100/60 dark:hover:bg-zinc-800/40 transition-colors text-left cursor-pointer border-b border-border dark:border-border"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <ArrowDown01Icon
                      size="1em"
                      className={cn(
                        "text-gray-400 dark:text-zinc-500 text-sm transition-transform duration-200 shrink-0",
                        isCollapsed && "-rotate-90"
                      )}
                    />
                    <span className="text-xs font-semibold text-gray-900 dark:text-zinc-100 truncate">
                      {group.label}
                    </span>
                    <span className={cn("px-1.5 py-0.2 rounded-full text-[10px] bg-black/[0.06] dark:bg-white/10 text-gray-600 dark:text-zinc-300 tabular-nums", BADGE_BASE)}>
                      {group.items.length}
                    </span>
                  </div>
                  <span className="text-[11px] text-gray-400 dark:text-zinc-500 font-medium">
                    {isCollapsed ? "Expand" : "Collapse"}
                  </span>
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
                  const rel = formatRelativeTime(item.created_at);
                  const attendees = item.actual_attendance ?? item.total_attendance ?? item.actual_attendees ?? 0;
                  const expenses = Number(item.total_expenses ?? item.actual_expenses ?? 0);

                  return (
                    <div
                      key={item.id}
                      role="listitem"
                      onClick={() => onSelect?.(item)}
                      className={cn(
                        "group flex flex-col sm:flex-row sm:items-center justify-between hover:bg-gray-50/80 dark:hover:bg-zinc-800/40 transition-colors cursor-pointer select-none border-b border-gray-100 dark:border-zinc-800/60 last:border-b-0",
                        densityClasses.paddingY,
                        densityClasses.paddingX,
                        densityClasses.gap,
                        densityClasses.minHeight
                      )}
                    >
                      {/* Left: Identifier, title, and supporting context */}
                      <div className="flex items-center gap-2.5 min-w-0 flex-1 mr-2">
                        <span className="font-sans tabular-nums text-xs text-gray-500 dark:text-zinc-400 font-medium shrink-0 min-w-[70px]">
                          {item.id}
                        </span>
                        <div className="flex min-w-0 flex-col gap-1">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-xs sm:text-sm font-medium text-gray-900 dark:text-zinc-100 group-hover:text-[#800000] dark:group-hover:text-red-400 transition-colors truncate max-w-[200px] sm:max-w-[320px] lg:max-w-md">
                              {title || "Untitled Submission"}
                            </span>
                            {organization && (
                              <span className="text-xs text-gray-400 dark:text-zinc-500 truncate hidden md:inline">
                                — {item.org_acronym ? `${item.org_acronym} · ` : ""}{organization}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-x-2 gap-y-1 min-w-0 text-[11px] text-gray-400 dark:text-zinc-500 font-normal">
                            <span className="text-gray-700 dark:text-zinc-300 truncate shrink-0 max-w-[180px]">
                              {submittedBy}{submitterId ? ` (${submitterId})` : ""}
                            </span>
                            {isPostEvent ? (
                              <span className="tabular-nums truncate">
                                {Number(attendees).toLocaleString()} attendees · ₱{expenses.toLocaleString(undefined, { minimumFractionDigits: 2 })} liquidated
                              </span>
                            ) : (
                              <>
                                {item.officer_position && <span className="truncate">{item.officer_position}</span>}
                                {item.has_bylaws != null && <span className="truncate">{item.has_bylaws ? "CBL Active" : "No CBL"}</span>}
                                {item.post_event_status && item.status === "Approved" && <span className="truncate">Post-Event: {item.post_event_status}</span>}
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right: Status, relative time, and details action */}
                      <div className="flex items-center gap-2 sm:gap-3 shrink-0 self-start sm:self-auto" onClick={(e) => e.stopPropagation()}>
                        <span className={cn(badgeClass, BADGE_BASE)}>
                          {status}
                        </span>

                        {item.created_at && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="text-[11px] text-gray-400 dark:text-zinc-500 font-medium tabular-nums hidden sm:inline ml-1 shrink-0">
                                {rel.relative || rel.date}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>Submitted on {formatPHDateTime(item.created_at)}</TooltipContent>
                          </Tooltip>
                        )}

                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => onReview?.(item)}
                          className="h-7 px-3 text-[11px] font-semibold rounded-lg cursor-pointer"
                        >
                          View Details
                        </Button>
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
