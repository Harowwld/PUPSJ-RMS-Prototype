"use client";
import DataGroupHeader from "@/components/shared/DataGroupHeader";
import { BADGE_BASE } from "@/lib/badgeStyles";


import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { getRequestCharterStatus } from "@/lib/citizenCharter";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { useTablePreferences } from "@/components/shared/TablePreferences";
import { getListDensityClasses } from "@/lib/tablePresentation";
import {
  Attachment01Icon,
  Clock01Icon,
  ViewIcon,
} from "hugeicons-react";

const STATUS_GROUPS = [
  { key: "Pending", label: "Pending Intake" },
  { key: "PendingPayment", label: "Pending Payment" },
  { key: "InProgress", label: "In Progress" },
  { key: "Ready", label: "Ready for Pickup" },
  { key: "Completed", label: "Completed" },
  { key: "Deficient", label: "Deficient Documents" },
  { key: "Cancelled", label: "Cancelled" },
  { key: "Shredded", label: "Retention Expired / Shredded" },
];

export function groupDocumentRequests(items, groupBy) {
  if (groupBy === "none") {
    return [{ key: "all", label: "All Requests", items }];
  }

  if (groupBy === "doc_type") {
    const map = new Map();
    items.forEach((item) => {
      const docType = item.doc_type || "Unknown Document";
      if (!map.has(docType)) map.set(docType, []);
      map.get(docType).push(item);
    });
    return [...map.entries()].map(([docType, list]) => ({
      key: docType,
      label: docType,
      items: list,
    }));
  }

  if (groupBy === "client_type") {
    const groups = [
      { key: "Student", label: "Students", items: [] },
      { key: "Alumni", label: "Alumni", items: [] },
      { key: "Parent", label: "Parents / Guardians", items: [] },
    ];
    const other = { key: "Other", label: "Other", items: [] };

    items.forEach((item) => {
      const ct = item.client_type || (item.is_alumni ? "Alumni" : "Student");
      const found = groups.find((g) => g.key.toLowerCase() === String(ct).toLowerCase());
      if (found) {
        found.items.push(item);
      } else {
        other.items.push(item);
      }
    });

    const res = groups.filter((g) => g.items.length > 0);
    if (other.items.length > 0) res.push(other);
    return res;
  }

  // Default: group by status
  const groupMap = new Map(STATUS_GROUPS.map((g) => [g.key, { ...g, items: [] }]));
  const otherGroup = { key: "Other", label: "Other Status", items: [] };

  items.forEach((item) => {
    const statusKey = item.status || "Pending";
    const target = groupMap.get(statusKey);
    if (target) {
      target.items.push(item);
    } else {
      otherGroup.items.push(item);
    }
  });

  const list = [...groupMap.values()].filter((g) => g.items.length > 0);
  if (otherGroup.items.length > 0) list.push(otherGroup);
  return list;
}

export default function DocumentRequestRecordList({
  items = [],
  groupBy = "status",
  onSelect,
  slaStandards = null,
  statusBadgeClass,
}) {
  const { density } = useTablePreferences();
  const densityClasses = getListDensityClasses(density);
  const [collapsedGroups, setCollapsedGroups] = useState({});

  const toggleGroup = (key) => {
    setCollapsedGroups((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const groupedData = useMemo(() => groupDocumentRequests(items, groupBy), [items, groupBy]);

  return (
    <div className="w-full divide-y divide-border/70 dark:divide-white/10">
      {groupedData.map((group) => {
        const isCollapsed = collapsedGroups[group.key] === true;
        const groupId = `doc-requests-group-${group.key.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;

        return (
          <section key={group.key} aria-labelledby={`${groupId}-heading`} className="w-full">
            {groupBy !== "none" && (
              <DataGroupHeader id={`${groupId}-heading`} controls={`${groupId}-items`} sticky label={group.label} count={group.items.length}
                collapsed={isCollapsed} onToggle={() => toggleGroup(group.key)} />
            )}

            {!isCollapsed && (
              <div id={`${groupId}-items`} role="list" className="divide-y divide-border/60 dark:divide-white/[0.06]">
                {group.items.map((item) => {
                  const studentName = item.student_name || "Unknown Student";
                  const requesterName = item.requester_name;
                  const isParent = item.client_type === "Parent" || Boolean(item.requester_relationship);
                  const isAlumni = item.client_type === "Alumni" || Boolean(item.is_alumni);
                  const charter = getRequestCharterStatus(item, slaStandards);
                  const badgeStyle = statusBadgeClass ? statusBadgeClass(item.status) : "bg-gray-100 text-gray-800 dark:bg-zinc-800 dark:text-zinc-300";

                  return (
                    <div
                      key={item.id}
                      role="listitem"
                      onClick={() => onSelect?.(item.id)}
                      className={cn(
                        "group flex flex-col lg:flex-row lg:items-center justify-between transition-colors hover:bg-gray-50/70 dark:hover:bg-zinc-800/40 cursor-pointer px-4 sm:px-6 border-b border-gray-100 dark:border-zinc-800/60 last:border-b-0 select-none",
                        density === "compact"
                          ? "py-2 gap-2 min-h-[44px]"
                          : density === "comfortable"
                          ? "py-3 gap-3 min-h-[56px]"
                          : "py-2.5 gap-2.5 min-h-[48px]"
                      )}
                    >
                      {/* Left: Request Identity & Requester Details */}
                      <div className="flex min-w-0 flex-1 items-center gap-3">
                        {/* ID */}
                        <span className="font-sans tabular-nums text-xs text-gray-500 dark:text-zinc-400 font-medium shrink-0 min-w-[48px] select-none">
                          {item.id}
                        </span>

                        {/* Requester Name & Badges */}
                        <div className="flex items-center gap-2 min-w-0 flex-1 max-w-[340px]">
                          <span
                            className="truncate text-[13px] font-semibold text-gray-900 transition-colors group-hover:text-pup-maroon dark:text-zinc-100 dark:group-hover:text-red-400"
                            title={studentName}
                          >
                            {studentName}
                          </span>

                          {requesterName && requesterName !== studentName && (
                            <span className="truncate text-xs text-gray-400 dark:text-zinc-500 hidden sm:inline" title={requesterName}>
                              (via {requesterName})
                            </span>
                          )}

                          <span
                            className={cn(
                              "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium shrink-0 select-none",
                              isParent
                                ? "bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200/60 dark:border-amber-900/40"
                                : isAlumni
                                ? "bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border border-purple-200/50 dark:border-purple-800/30"
                                : "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200/50 dark:border-blue-800/30",
                              BADGE_BASE
                            )}
                          >
                            {isParent ? "Parent/Guardian" : isAlumni ? "Alumni" : "Student"}
                          </span>

                          {item.course_code && (
                            <span className={cn("inline-flex items-center rounded-full bg-gray-100 dark:bg-zinc-800 px-2 py-0.5 text-[10px] font-semibold text-gray-700 dark:text-zinc-300 shrink-0 select-none", BADGE_BASE)}>
                              {item.course_code}
                            </span>
                          )}

                          {Number(item.attachment_count) > 0 && (
                            <span
                              className={cn("inline-flex items-center gap-1 rounded-md bg-gray-100 dark:bg-zinc-800 px-1.5 py-0.5 text-[10px] font-medium text-gray-600 dark:text-zinc-400 shrink-0 tabular-nums select-none", BADGE_BASE)}
                              title={`${item.attachment_count} attachment(s)`}
                            >
                              <Attachment01Icon size="1em" className="text-[11px]" />
                              {item.attachment_count}
                            </span>
                          )}
                        </div>

                        {/* Document Type Badge */}
                        <div className="hidden md:flex items-center shrink-0">
                          <span
                            className={cn("inline-flex max-w-[180px] truncate items-center rounded-full bg-gray-100 dark:bg-zinc-800 px-2.5 py-0.5 text-[11px] font-semibold text-gray-800 dark:text-zinc-200 select-none", BADGE_BASE)}
                            title={item.doc_type}
                          >
                            {item.doc_type}
                          </span>
                        </div>

                        {/* SLA Charter / Processing Time */}
                        <div className="hidden xl:flex items-center gap-1.5 shrink-0">
                          <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium whitespace-nowrap select-none", charter.tier.badgeClass, BADGE_BASE)}>
                            {charter.tier.shortLabel}
                          </span>
                          <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap select-none", charter.badgeClass, BADGE_BASE)}>
                            <Clock01Icon size="1em" className="text-[10px] mr-1" />
                            {charter.label}
                          </span>
                        </div>
                      </div>

                      {/* Mobile/Tablet Subline for Document Type & SLA */}
                      <div className="flex md:hidden flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-zinc-400">
                        <span className={cn("inline-flex items-center rounded-full bg-gray-100 dark:bg-zinc-800 px-2 py-0.5 text-[11px] font-semibold text-gray-800 dark:text-zinc-200", BADGE_BASE)}>
                          {item.doc_type}
                        </span>
                        <span className="text-gray-300 dark:text-zinc-600">·</span>
                        <div className="inline-flex items-center gap-1.5">
                          <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium whitespace-nowrap", charter.tier.badgeClass, BADGE_BASE)}>
                            {charter.tier.shortLabel}
                          </span>
                          <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap", charter.badgeClass, BADGE_BASE)}>
                            {charter.label}
                          </span>
                        </div>
                      </div>

                      {/* Right: Target Date, Status Pill, Date, and Centered Action */}
                      <div className="flex shrink-0 items-center justify-between lg:justify-end gap-3 pt-1 lg:pt-0">
                        {/* Target Date */}
                        <div className="flex shrink-0 flex-col items-start sm:items-end">
                          <span className="text-[10px] uppercase font-semibold text-gray-400 dark:text-zinc-500 tracking-wider">
                            Target
                          </span>
                          <span className="text-xs font-normal tabular-nums text-gray-600 dark:text-zinc-300" title={`Target: ${charter.deadlineFormatted}`}>
                            {charter.deadlineFormatted}
                          </span>
                        </div>

                        {/* Status */}
                        <div className="flex flex-col items-start sm:items-end gap-0.5 shrink-0 min-w-[100px]">
                          <span
                            className={cn("inline-flex items-center justify-center rounded-full px-2.5 py-0.5 text-[11px] font-medium tracking-[0.04em] whitespace-nowrap select-none", badgeStyle, BADGE_BASE)}
                          >
                            {item.status === "InProgress"
                              ? "In Progress"
                              : item.status === "PendingPayment"
                              ? "Pending Payment"
                              : item.status}
                          </span>
                        </div>

                        {/* Centered Action Button */}
                        <div className="w-10 flex items-center justify-center shrink-0" onClick={(e) => e.stopPropagation()}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                type="button"
                                onClick={() => onSelect?.(item.id)}
                                aria-label="Inspect Request Details"
                                className="table-action-button rounded-lg active:scale-95 cursor-pointer"
                              >
                                <ViewIcon size="1em" className="text-[16px]" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent>Inspect Request</TooltipContent>
                          </Tooltip>
                        </div>
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
