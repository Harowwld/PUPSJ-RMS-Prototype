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
  isOsas = false,
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
                  const organizationName = record.organization_name || record.student_name;
                  const secondaryContext = isOsas
                    ? [record.original_filename, record.size_bytes ? `(${formatBytes(record.size_bytes)})` : "", isDeclined && record.review_note ? `Decline note: "${record.review_note}"` : ""].filter(Boolean).join(" • ")
                    : [formatTitleCase(record.student_name), record.org_acronym ? `(${record.org_acronym})` : "", record.original_filename, record.size_bytes ? `(${formatBytes(record.size_bytes)})` : "", isDeclined && record.review_note ? `Decline note: "${record.review_note}"` : ""].filter(Boolean).join(" • ");
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
                      onDoubleClick={() => {
                        onPreview?.(record);
                      }}
                      className={cn(
                        "group flex items-center justify-between hover:bg-gray-50/80 dark:hover:bg-zinc-800/40 transition-colors cursor-pointer select-none border-b border-gray-100 dark:border-zinc-800/60 last:border-b-0",
                        densityClasses.paddingX,
                        densityClasses.paddingY,
                        densityClasses.gap,
                        densityClasses.minHeight,
                        isSelected && "bg-blue-50/60 dark:bg-blue-950/20"
                      )}
                    >
                      {/* Left: Checkbox, Thumbnail, Identifier, Title, and Secondary Context */}
                      <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1 mr-2">
                        {/* Checkbox (for Pending records or selectable items) */}
                        <div
                          className="shrink-0 flex items-center justify-center"
                          onClick={(e) => e.stopPropagation()}
                          onDoubleClick={(e) => e.stopPropagation()}
                        >
                          {isPending ? (
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => onToggleSelect?.(record.id, e)}
                              className="h-4 w-4 m-0 align-middle shrink-0 cursor-pointer rounded border border-border text-pup-maroon dark:text-primary accent-pup-maroon focus:ring-pup-maroon dark:border-border"
                              aria-label={isOsas ? `Select ${organizationName} organization record` : `Select ${record.original_filename}`}
                            />
                          ) : (
                            <div className="w-4" />
                          )}
                        </div>

                        {/* Visual Thumbnail Card (Non-clickable static preview indicator) */}
                        <div
                          className={cn(
                            "relative shrink-0 rounded-lg overflow-hidden bg-gradient-to-b from-gray-50 to-gray-100 dark:from-zinc-800/90 dark:to-zinc-900 border border-border/80 dark:border-zinc-700/80 shadow-2xs flex flex-col items-center justify-between p-1 select-none pointer-events-none",
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
                          <div className="my-auto flex items-center justify-center text-gray-500 dark:text-zinc-400">
                            {isPdf ? (
                              <Pdf01Icon size="1.2em" className="text-base" />
                            ) : (
                              <File02Icon size="1.2em" className="text-base" />
                            )}
                          </div>
                        </div>

                        {/* Main Identity & Context Stream */}
                        <div className="flex flex-col md:flex-row md:items-center gap-0.5 md:gap-2 min-w-0 flex-1">
                          <div className="flex items-center gap-2 min-w-0 shrink-0">
                            {/* Record identity */}
                            <span
                              className={cn(
                                "font-sans tabular-nums text-xs text-gray-500 dark:text-zinc-400 font-medium shrink-0 min-w-[70px] select-none",
                                isOsas && "max-w-[200px] truncate"
                              )}
                              title={isOsas ? organizationName : record.student_no}
                            >
                              {isOsas ? organizationName : record.student_no}
                            </span>

                            {/* Title (Document Type as Title) */}
                            <span className="text-xs sm:text-sm font-medium text-gray-900 dark:text-zinc-100 group-hover:text-pup-maroon dark:group-hover:text-red-400 transition-colors truncate shrink-0 max-w-[200px] sm:max-w-[280px] lg:max-w-[340px]">
                              {record.doc_type}
                            </span>
                          </div>

                          {/* Desktop Secondary Context (Em-dash stream: Student Name • Filename • Size) */}
                          <span className="text-xs text-gray-400 dark:text-zinc-500 truncate hidden md:inline font-normal select-none">
                            {secondaryContext && `— ${secondaryContext}`}
                          </span>

                          {/* Mobile Secondary Context */}
                          <span className="text-[11px] text-gray-400 dark:text-zinc-500 truncate md:hidden font-normal select-none">
                            {isOsas
                              ? [record.original_filename, record.size_bytes ? formatBytes(record.size_bytes) : ""].filter(Boolean).join(" · ")
                              : [formatTitleCase(record.student_name), record.original_filename].filter(Boolean).join(" · ")}
                          </span>
                        </div>
                      </div>

                      {/* Right: Linear Property Pills & Action Buttons */}
                      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                        {/* Status Pill (Text-only pill) */}
                        <span
                          className={cn("select-none", badgeClass, BADGE_BASE)}
                        >
                          {record.approval_status || "Pending"}
                        </span>

                        {/* Relative / Upload Timestamp */}
                        {record.created_at && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="text-[11px] text-gray-400 dark:text-zinc-500 font-normal tabular-nums hidden sm:inline ml-1 shrink-0">
                                {dateStr}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              Uploaded on {dateStr} {timeStr ? `at ${timeStr}` : ""}
                              {isApproved && record.reviewed_at ? ` · Approved on ${formatUploadedDate(record.reviewed_at).dateStr}` : ""}
                            </TooltipContent>
                          </Tooltip>
                        )}

                        {/* Actions */}
                        <div className="flex items-center gap-1 sm:gap-1.5 ml-1">
                          {/* Preview Action - Icon-only */}
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                type="button"
                                onClick={() => onPreview?.(record)}
                                aria-label="Preview Document"
                                className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-black/[0.08] dark:border-white/[0.1] bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-2xs cursor-pointer active:scale-95 transition-all"
                              >
                                <ViewIcon size="1em" className="text-xs" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent side="top">Preview Document</TooltipContent>
                          </Tooltip>

                          {/* Quick Review Actions for Pending records - Text-only & Bold Colors */}
                          {isPending && (
                            <>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button
                                    type="button"
                                    onClick={() => onApprove?.(record.id)}
                                    aria-label="Approve Document"
                                    className="inline-flex h-7 items-center justify-center rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white px-3 text-[11px] font-semibold shadow-2xs cursor-pointer active:scale-95 transition-all"
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
                                    className="inline-flex h-7 items-center justify-center rounded-lg bg-red-600 hover:bg-red-700 text-white px-3 text-[11px] font-semibold shadow-2xs cursor-pointer active:scale-95 transition-all"
                                  >
                                    Decline
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent side="top">Decline Document</TooltipContent>
                              </Tooltip>
                            </>
                          )}

                          {/* Undo / Reopen trigger for reviewed records */}
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
                                  className="inline-flex h-7 items-center justify-center rounded-lg border border-black/[0.08] dark:border-white/[0.1] bg-white dark:bg-zinc-800 px-3 text-[11px] font-semibold text-gray-800 dark:text-zinc-100 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-2xs transition-all cursor-pointer active:scale-95"
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
