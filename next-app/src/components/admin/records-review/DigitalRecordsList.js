"use client";

import { useMemo, useState } from "react";
import { cn, formatTitleCase } from "@/lib/utils";
import { BADGE_BASE } from "@/lib/badgeStyles";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { useTablePreferences } from "@/components/shared/TablePreferences";
import { getListDensityClasses } from "@/lib/tablePresentation";
import {
  ArrowDown01Icon,
  Cancel01Icon,
  File02Icon,
  Pdf01Icon,
  Tick01Icon,
  ViewIcon,
} from "hugeicons-react";

export function formatBytes(bytes) {
  if (!bytes || isNaN(bytes)) return "—";
  const b = Number(bytes);
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatUploadedDate(dateString) {
  if (!dateString) return { dateStr: "N/A", timeStr: "" };
  try {
    let normalized = String(dateString);
    if (!normalized.includes("T") && !normalized.includes("Z")) {
      normalized = normalized.replace(" ", "T") + "Z";
    }
    const date = new Date(normalized);
    if (isNaN(date.getTime())) throw new Error("Invalid");

    const dateStr = date.toLocaleDateString("en-US", {
      timeZone: "Asia/Manila",
      month: "short",
      day: "numeric",
      year: "numeric",
    });

    const timeStr = date.toLocaleTimeString("en-US", {
      timeZone: "Asia/Manila",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });

    return { dateStr, timeStr };
  } catch {
    return { dateStr: String(dateString), timeStr: "" };
  }
}

export default function DigitalRecordsList({
  records = [],
  groupBy = "status",
  selectedIds = new Set(),
  onToggleSelect,
  onPreview,
  onApprove,
  onDecline,
  onSetStatus,
  getStatusBadge,
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

  const groupedData = useMemo(() => {
    if (groupBy === "none") {
      return [{ key: "all", label: "All Records", items: records }];
    }

    if (groupBy === "docType") {
      const map = new Map();
      records.forEach((record) => {
        const type = record.doc_type || "Uncategorized";
        if (!map.has(type)) map.set(type, []);
        map.get(type).push(record);
      });
      return [...map.entries()].map(([docType, items]) => ({
        key: docType,
        label: docType,
        items,
      }));
    }

    // Default: Group by approval_status
    const groups = [
      { key: "Pending", label: "Awaiting Review", items: [] },
      { key: "Approved", label: "Approved & Archived", items: [] },
      { key: "Declined", label: "Declined / Needs Rescan", items: [] },
    ];
    const otherGroup = { key: "Other", label: "Other Status", items: [] };

    records.forEach((record) => {
      const status = record.approval_status || "Pending";
      const found = groups.find((g) => g.key.toLowerCase() === status.toLowerCase());
      if (found) {
        found.items.push(record);
      } else {
        otherGroup.items.push(record);
      }
    });

    const result = groups.filter((g) => g.items.length > 0);
    if (otherGroup.items.length > 0) result.push(otherGroup);
    return result;
  }, [records, groupBy]);

  return (
    <div className="w-full divide-y divide-border/70 dark:divide-white/10 font-jakarta">
      {groupedData.map((group) => {
        const isCollapsed = collapsedGroups[group.key] === true;
        const groupId = `records-review-group-${group.key.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;

        return (
          <section key={group.key} aria-labelledby={`${groupId}-heading`} className="w-full">
            {groupBy !== "none" && (
              <h3
                id={`${groupId}-heading`}
                className="border-b border-border/70 bg-gray-50/80 dark:border-white/10 dark:bg-zinc-900/60 sticky top-0 z-10 backdrop-blur-xs"
              >
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
                  <span className={cn("rounded-full bg-black/5 dark:bg-white/10 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-gray-600 dark:text-zinc-300", BADGE_BASE)}>
                    {group.items.length}
                  </span>
                </button>
              </h3>
            )}

            {!isCollapsed && (
              <div
                id={`${groupId}-items`}
                role="list"
                className="divide-y divide-border/60 dark:divide-white/[0.06]"
              >
                {group.items.map((record) => {
                  const isSelected = selectedIds.has(record.id);
                  const isPending = record.approval_status === "Pending";
                  const isApproved = record.approval_status === "Approved";
                  const isDeclined = record.approval_status === "Declined";
                  const { dateStr, timeStr } = formatUploadedDate(record.created_at);
                  const isPdf = /\.pdf$/i.test(record.original_filename || "");
                  const badgeClass = getStatusBadge
                    ? getStatusBadge(record.approval_status)
                    : "bg-gray-100 text-gray-800 dark:bg-zinc-800 dark:text-zinc-300";

                  return (
                    <div
                      key={record.id}
                      role="listitem"
                      onClick={() => {
                        if (isPending && onToggleSelect) {
                          onToggleSelect(record.id);
                        } else {
                          onPreview?.(record);
                        }
                      }}
                      className={cn(
                        "group flex flex-col md:flex-row md:items-center justify-between transition-colors hover:bg-gray-50/70 dark:hover:bg-zinc-800/40 cursor-pointer select-none",
                        densityClasses.paddingX,
                        densityClasses.paddingY,
                        densityClasses.gap,
                        densityClasses.minHeight,
                        isSelected && "bg-blue-50/60 dark:bg-blue-950/20"
                      )}
                    >
                      {/* Left Block: Checkbox + PDF Thumbnail Preview Card */}
                      <div className="flex items-center gap-3.5 min-w-0 flex-1">
                        {/* Checkbox (for Pending records or selectable items) */}
                        <div
                          className="shrink-0 flex items-center justify-center"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {isPending ? (
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => onToggleSelect?.(record.id, e)}
                              className="h-4 w-4 m-0 align-middle shrink-0 cursor-pointer rounded border border-border text-pup-maroon dark:text-primary accent-pup-maroon focus:ring-pup-maroon dark:text-primary dark:border-border"
                              aria-label={`Select ${record.original_filename}`}
                            />
                          ) : (
                            <div className="w-4" />
                          )}
                        </div>

                        {/* Visual Thumbnail Card */}
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            onPreview?.(record);
                          }}
                          title={`Preview ${record.original_filename}`}
                          className={cn(
                            "relative shrink-0 rounded-lg overflow-hidden bg-gradient-to-b from-gray-50 to-gray-100 dark:from-zinc-800/90 dark:to-zinc-900 border border-border/80 dark:border-zinc-700/80 shadow-2xs hover:shadow-xs hover:border-pup-maroon dark:hover:border-red-400/80 flex flex-col items-center justify-between p-1 transition-all group/thumb cursor-pointer",
                            density === "compact" ? "w-8 h-10" : density === "comfortable" ? "w-10 h-13 sm:w-11 sm:h-14" : "w-9 h-11 sm:w-10 sm:h-12"
                          )}
                        >
                          {/* Mini document top bar */}
                          <div className="w-full flex items-center justify-between px-0.5">
                            <span className="text-[7px] font-bold tracking-wider text-pup-maroon dark:text-red-400 uppercase">
                              {isPdf ? "PDF" : "DOC"}
                            </span>
                            <div className="h-0.5 w-2.5 rounded-full bg-gray-300 dark:bg-zinc-600" />
                          </div>

                          {/* Center icon */}
                          <div className="my-auto flex items-center justify-center text-gray-500 group-hover/thumb:text-pup-maroon dark:text-zinc-400 dark:group-hover/thumb:text-red-400 transition-colors">
                            {isPdf ? (
                              <Pdf01Icon size="1.1em" className="text-base" />
                            ) : (
                              <File02Icon size="1.1em" className="text-base" />
                            )}
                          </div>

                          {/* Bottom mini indicator */}
                          <div className="w-full bg-white/80 dark:bg-zinc-800/80 rounded py-0 text-center">
                            <span className="text-[7px] font-semibold text-gray-600 dark:text-zinc-300 tabular-nums truncate block">
                              {formatBytes(record.size_bytes)}
                            </span>
                          </div>

                          {/* Hover action overlay */}
                          <div className="absolute inset-0 bg-pup-maroon/85 dark:bg-red-950/90 opacity-0 group-hover/thumb:opacity-100 transition-opacity flex flex-col items-center justify-center text-white text-[9px] font-semibold">
                            <ViewIcon size="1em" className="text-xs" />
                          </div>
                        </div>

                        {/* Identity & Metadata Details */}
                        <div className="flex flex-col min-w-0 flex-1 gap-1">
                          {/* Line 1: Student Name + ID + DocType */}
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-semibold text-gray-900 group-hover:text-pup-maroon dark:text-zinc-100 dark:group-hover:text-red-400 transition-colors truncate">
                              {formatTitleCase(record.student_name)}
                            </span>

                            <span className={cn("font-sans tabular-nums text-xs font-semibold px-2.5 py-0.5 rounded-full bg-gray-100 dark:bg-zinc-800 text-gray-800 dark:text-zinc-200 shrink-0", BADGE_BASE)}>
                              {record.student_no}
                            </span>

                            <span
                              className={cn("inline-flex items-center rounded-full bg-gray-100 dark:bg-zinc-800 px-2.5 py-0.5 text-[11px] font-semibold text-gray-800 dark:text-zinc-200 shrink-0 truncate max-w-[220px]", BADGE_BASE)}
                              title={record.doc_type}
                            >
                              {record.doc_type}
                            </span>
                          </div>

                          {/* Line 2: Original Filename, Size, and Upload Timestamp */}
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-gray-500 dark:text-zinc-400">
                            <span
                              className="truncate max-w-[280px] sm:max-w-md font-normal text-gray-700 dark:text-zinc-300"
                              title={record.original_filename}
                            >
                              {record.original_filename}
                            </span>

                            <span className="text-gray-300 dark:text-zinc-600">·</span>

                            <span className="tabular-nums font-medium text-gray-600 dark:text-zinc-400">
                              {formatBytes(record.size_bytes)}
                            </span>

                            <span className="text-gray-300 dark:text-zinc-600">·</span>

                            <span className="tabular-nums">
                              {dateStr} {timeStr ? `at ${timeStr}` : ""}
                            </span>
                          </div>

                          {/* Line 3: Special notes (Declined reason or Review timestamp) */}
                          {isDeclined && record.review_note && (
                            <div className="mt-1 flex items-baseline gap-1.5 rounded-lg border border-red-200/70 bg-red-50/60 dark:border-red-900/40 dark:bg-red-950/20 px-2.5 py-1 text-[11px] text-red-700 dark:text-red-300">
                              <span className="font-semibold shrink-0">Decline Reason:</span>
                              <span className="italic truncate">&ldquo;{record.review_note}&rdquo;</span>
                            </div>
                          )}

                          {isApproved && record.reviewed_at && (
                            <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                              Approved on {formatUploadedDate(record.reviewed_at).dateStr}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Right Block: Status Pill & Action Triggers */}
                      <div
                        className="flex shrink-0 items-center justify-between md:justify-end gap-3 pt-2 md:pt-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {/* Text-Only Status Badge without indicator dot */}
                        <span
                          className={cn("select-none", badgeClass, BADGE_BASE)}
                        >
                          {record.approval_status || "Pending"}
                        </span>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-1.5">
                          {/* Preview Action - Icon-only */}
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                type="button"
                                onClick={() => onPreview?.(record)}
                                aria-label="Preview Document"
                                className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-black/[0.08] dark:border-white/[0.1] bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-2xs cursor-pointer active:scale-95 transition-all"
                              >
                                <ViewIcon size="1em" className="text-sm" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent side="top">Preview Document</TooltipContent>
                          </Tooltip>

                          {/* Quick Review Actions for Pending records - Text-only */}
                          {isPending && (
                            <>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button
                                    type="button"
                                    onClick={() => onApprove?.(record.id)}
                                    aria-label="Approve Document"
                                    className="inline-flex h-8 items-center justify-center rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-3 text-xs font-semibold shadow-2xs cursor-pointer active:scale-95 transition-all"
                                  >
                                    Approve
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent side="top">Approve Document</TooltipContent>
                              </Tooltip>

                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button
                                    type="button"
                                    onClick={() => onDecline?.(record.id)}
                                    aria-label="Decline Document"
                                    className="inline-flex h-8 items-center justify-center rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50 hover:bg-red-100 text-red-700 dark:bg-red-950/30 dark:hover:bg-red-900/40 dark:text-red-300 px-3 text-xs font-semibold shadow-2xs cursor-pointer active:scale-95 transition-all"
                                  >
                                    Decline
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent side="top">Decline Document</TooltipContent>
                              </Tooltip>
                            </>
                          )}

                          {/* Undo / Reopen trigger for reviewed records - Upgraded typography & tactile feel */}
                          {!isPending && onSetStatus && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  type="button"
                                  onClick={() =>
                                    onSetStatus(
                                      record.id,
                                      "Pending",
                                      "Moved back to review queue from list view"
                                    )
                                  }
                                  className="inline-flex h-8 items-center justify-center rounded-xl border border-black/[0.08] dark:border-white/[0.1] bg-white dark:bg-zinc-800 px-3 text-xs font-semibold text-gray-800 dark:text-zinc-100 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-2xs transition-all cursor-pointer active:scale-95"
                                >
                                  Reopen
                                </button>
                              </TooltipTrigger>
                              <TooltipContent side="top">Move back to Pending Review</TooltipContent>
                            </Tooltip>
                          )}
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
