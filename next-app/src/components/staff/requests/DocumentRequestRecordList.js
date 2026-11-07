"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { formatPHDateTime } from "@/lib/timeFormat";
import { getRequestCharterStatus } from "@/lib/citizenCharter";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import {
  ArrowDown01Icon,
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

export default function DocumentRequestRecordList({
  items = [],
  groupBy = "status",
  onSelect,
  slaStandards = null,
  statusBadgeClass,
}) {
  const [collapsedGroups, setCollapsedGroups] = useState({});

  const toggleGroup = (key) => {
    setCollapsedGroups((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const groupedData = useMemo(() => {
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
  }, [items, groupBy]);

  return (
    <div className="w-full divide-y divide-border/70 dark:divide-white/10">
      {groupedData.map((group) => {
        const isCollapsed = collapsedGroups[group.key] === true;
        const groupId = `doc-requests-group-${group.key.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;

        return (
          <section key={group.key} aria-labelledby={`${groupId}-heading`} className="w-full">
            {groupBy !== "none" && (
              <h3 id={`${groupId}-heading`} className="border-b border-border/70 bg-gray-50/80 dark:border-white/10 dark:bg-zinc-900/60 sticky top-0 z-10 backdrop-blur-xs">
                <button
                  type="button"
                  aria-expanded={!isCollapsed}
                  aria-controls={`${groupId}-items`}
                  onClick={() => toggleGroup(group.key)}
                  className="flex min-h-11 w-full items-center gap-2.5 px-5 text-left transition-colors hover:bg-gray-100/80 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-pup-maroon dark:hover:bg-zinc-800/80 sm:px-6 cursor-pointer"
                >
                  <ArrowDown01Icon
                    size="1em"
                    className={cn(
                      "shrink-0 text-sm text-gray-500 transition-transform duration-150 dark:text-zinc-400",
                      isCollapsed && "-rotate-90"
                    )}
                    aria-hidden="true"
                  />
                  <span className="text-xs font-semibold text-gray-900 dark:text-zinc-100">
                    {group.label}
                  </span>
                  <span className="rounded-full bg-black/5 dark:bg-white/10 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-gray-600 dark:text-zinc-300">
                    {group.items.length}
                  </span>
                </button>
              </h3>
            )}

            {!isCollapsed && (
              <div id={`${groupId}-items`} role="list" className="divide-y divide-border/60 dark:divide-white/[0.06]">
                {group.items.map((item) => {
                  const studentName = item.student_name || "Unknown Student";
                  const requesterName = item.requester_name;
                  const isParent = item.client_type === "Parent" || Boolean(item.requester_relationship);
                  const isAlumni = item.client_type === "Alumni" || Boolean(item.is_alumni);
                  const charter = getRequestCharterStatus(item, slaStandards);
                  const dateFormatted = item.created_at ? formatPHDateTime(item.created_at) : "Date unavailable";
                  const badgeStyle = statusBadgeClass ? statusBadgeClass(item.status) : "bg-gray-100 text-gray-800 dark:bg-zinc-800 dark:text-zinc-300";

                  return (
                    <div
                      key={item.id}
                      role="listitem"
                      onClick={() => onSelect?.(item.id)}
                      className="group flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-3.5 transition-colors hover:bg-gray-50/70 dark:hover:bg-zinc-800/40 cursor-pointer sm:px-6"
                    >
                      {/* Left: Request Identity & Metadata */}
                      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="inline-flex items-center rounded-lg bg-gray-100 px-2 py-0.5 text-xs font-semibold tabular-nums text-gray-700 dark:bg-zinc-800 dark:text-zinc-300">
                            #{item.id}
                          </span>

                          <span className="truncate text-[13px] font-semibold text-gray-900 transition-colors group-hover:text-pup-maroon dark:text-zinc-100 dark:group-hover:text-red-400">
                            {studentName}
                          </span>

                          {requesterName && requesterName !== studentName && (
                            <span className="truncate text-xs text-gray-500 dark:text-zinc-400">
                              (via {requesterName})
                            </span>
                          )}

                          <span
                            className={cn(
                              "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium shrink-0",
                              isParent
                                ? "bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200/60 dark:border-amber-900/40"
                                : isAlumni
                                ? "bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border border-purple-200/50 dark:border-purple-800/30"
                                : "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200/50 dark:border-blue-800/30"
                            )}
                          >
                            {isParent ? "Parent/Guardian" : isAlumni ? "Alumni" : "Student"}
                          </span>

                          {Number(item.attachment_count) > 0 && (
                            <span
                              className="inline-flex items-center gap-1 rounded-md bg-gray-100 dark:bg-zinc-800 px-1.5 py-0.5 text-[10px] font-medium text-gray-600 dark:text-zinc-400 shrink-0"
                              title={`${item.attachment_count} attachment(s)`}
                            >
                              <Attachment01Icon size="1em" className="text-[11px]" />
                              {item.attachment_count}
                            </span>
                          )}
                        </div>

                        {/* Subline: Student No, Course, Doc Type, SLA chip */}
                        <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-zinc-400">
                          {item.student_no ? (
                            <span className="font-semibold tabular-nums text-gray-600 dark:text-zinc-300">
                              {item.student_no}
                            </span>
                          ) : (
                            <span className="italic text-amber-600 dark:text-amber-400 text-[11px]">
                              No Student ID
                            </span>
                          )}

                          {item.course_code && (
                            <span className="rounded-full bg-gray-100 dark:bg-zinc-800 px-2 py-0.2 text-[10px] font-semibold text-gray-700 dark:text-zinc-300">
                              {item.course_code}
                            </span>
                          )}

                          <span className="text-gray-300 dark:text-zinc-600">·</span>

                          <span className="inline-flex items-center rounded-full bg-gray-100 dark:bg-zinc-800 px-2 py-0.5 text-[11px] font-semibold text-gray-800 dark:text-zinc-200">
                            {item.doc_type}
                          </span>

                          <span className="text-gray-300 dark:text-zinc-600">·</span>

                          <div className="inline-flex items-center gap-1.5">
                            <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium whitespace-nowrap", charter.tier.badgeClass)}>
                              {charter.tier.shortLabel}
                            </span>
                            <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap", charter.badgeClass)}>
                              <Clock01Icon size="1em" className="text-[10px] mr-1" />
                              {charter.label}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Status Pill, Date, and Action */}
                      <div className="flex shrink-0 items-center justify-between sm:justify-end gap-3 pt-1 sm:pt-0">
                        <div className="flex flex-col items-start sm:items-end gap-1">
                          <span
                            className={cn(
                              "inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium tracking-[0.04em] whitespace-nowrap select-none",
                              badgeStyle
                            )}
                          >
                            {item.status === "InProgress"
                              ? "In Progress"
                              : item.status === "PendingPayment"
                              ? "Pending Payment"
                              : item.status}
                          </span>
                          <span className="text-[11px] font-normal tabular-nums text-gray-500 dark:text-zinc-400">
                            {dateFormatted}
                          </span>
                        </div>

                        <div onClick={(e) => e.stopPropagation()}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                type="button"
                                onClick={() => onSelect?.(item.id)}
                                aria-label="Inspect Request Details"
                                className="flex h-8 w-8 items-center justify-center rounded-lg border border-transparent text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-pup-maroon dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100 active:scale-95 cursor-pointer"
                              >
                                <ViewIcon size={16} aria-hidden="true" />
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
