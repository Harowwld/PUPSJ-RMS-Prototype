"use client";

import useUrlPage from "@/hooks/useUrlPage";
import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import PageHeader from "@/components/shared/PageHeader";
import { RefreshButton } from "@/components/shared/RefreshButton";
import OsasMonitoringSkeleton from "@/components/staff/skeletons/OsasMonitoringSkeleton";
import OsasKanbanPipeline from "@/components/staff/OsasKanbanPipeline";
import OsasProposalReviewSheet from "@/components/staff/osas/OsasProposalReviewSheet";
import OsasPostEventReviewSheet from "@/components/staff/osas/OsasPostEventReviewSheet";
import PDFPreviewModal from "@/components/shared/PDFPreviewModal";
import PDFPreview from "@/components/shared/PDFPreview";
import MultiCriteriaFilter from "@/components/shared/MultiCriteriaFilter";
import ActiveFilterChips from "@/components/shared/ActiveFilterChips";
import TableScrollControls from "@/components/shared/TableScrollControls";
import ViewModeIcon from "@/components/shared/ViewModeIcon";
import { formatErrorMessage } from "@/lib/errorUtils";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
  EmptyState,
} from "@/components/ui/empty";
import { ArrowDown01Icon, ArrowUp01Icon, ArrowUpDownIcon, CalendarCheckIn01Icon as EmptyCalendarCheckIn01Icon, ClipboardIcon as EmptyClipboardIcon, File02Icon, Loading01Icon, ReloadIcon, Search01Icon, CalendarCheckIn01Icon, ClipboardIcon} from "hugeicons-react";

function SortIndicator({ column, sortBy, sortOrder }) {
  if (sortBy !== column) {
    return <ArrowUpDownIcon size="1em" className="ml-1 text-[11px] opacity-40 transition-opacity group-hover:opacity-70 dark:opacity-30 dark:group-hover:opacity-60" />;
  }

  return sortOrder === "ASC" ? (
    <ArrowUp01Icon size="1em" className="ml-1 text-[11px] text-pup-maroon dark:text-red-400" />
  ) : (
    <ArrowDown01Icon size="1em" className="ml-1 text-[11px] text-pup-maroon dark:text-red-400" />
  );
}

function SortableTableHeader({ column, label, sortBy, sortOrder, onSort, className = "" }) {
  const ariaSort = sortBy !== column ? "none" : sortOrder === "ASC" ? "ascending" : "descending";

  return (
    <th className={className} aria-sort={ariaSort}>
      <button
        type="button"
        onClick={() => onSort(column)}
        className="group inline-flex items-center gap-1 text-left hover:text-gray-900 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-pup-maroon dark:hover:text-white dark:focus-visible:ring-red-400"
      >
        <span>{label}</span>
        <SortIndicator column={column} sortBy={sortBy} sortOrder={sortOrder} />
      </button>
    </th>
  );
}

export function normalizeProposalStatus(status) {
  const s = String(status || "").toLowerCase().trim();
  if (s === "submitted" || s === "pending") return "Submitted";
  if (s === "under review" || s === "underreview" || s === "inprogress" || s === "processing") return "Under Review";
  if (s === "needs revision" || s === "revisionsrequested" || s === "revision") return "Needs Revision";
  if (s === "approved" || s === "completed" || s === "ready") return "Approved";
  if (s === "declined" || s === "rejected" || s === "cancelled") return "Declined";
  if (s === "archived") return "Archived";
  return status || "";
}

const STATUS_OPTIONS = [
  "Submitted",
  "Under Review",
  "Needs Revision",
  "Approved",
  "Declined",
];

export const ALLOWED_TRANSITIONS = {
  "Submitted": ["Under Review", "Approved", "Declined"],
  "Under Review": ["Needs Revision", "Approved", "Declined"],
  "Needs Revision": ["Under Review", "Declined"],
  "Approved": ["Under Review", "Declined"],
  "Declined": ["Under Review"],
};

export const POST_EVENT_ALLOWED_TRANSITIONS = {
  "Submitted": ["Under Review", "Cleared", "Declined"],
  "Under Review": ["Needs Revision", "Cleared", "Declined"], // Strictly forward-only!
  "Needs Revision": ["Under Review", "Declined"],
  "Cleared": ["Under Review", "Declined"],
  "Declined": ["Under Review"],
};

const POST_EVENT_STATUS_OPTIONS = [
  "Submitted",
  "Under Review",
  "Needs Revision",
  "Cleared",
  "Declined",
];

const KANBAN_COLUMNS = [
  { key: "Submitted", label: "Submitted", icon: "SentIcon" },
  { key: "Under Review", label: "Under Review", icon: "Search01Icon" },
  { key: "Needs Revision", label: "Needs Revision", icon: "ReloadIcon" },
  { key: "Approved", label: "Approved", icon: "CheckmarkCircle01Icon" },
  { key: "Declined", label: "Declined", icon: "CancelCircleIcon" },
];

export const POST_EVENT_KANBAN_COLUMNS = [
  { key: "Submitted", label: "Submitted", icon: "SentIcon" },
  { key: "Under Review", label: "Under Review", icon: "Search01Icon" },
  { key: "Needs Revision", label: "Needs Revision", icon: "ReloadIcon" },
  { key: "Cleared", label: "Cleared", icon: "CheckmarkBadge01Icon" },
  { key: "Declined", label: "Declined", icon: "CancelCircleIcon" },
];

export function getProposalStatusBadgeClass(status) {
  const s = String(status || "").toLowerCase().trim();
  if (s === "approved" || s === "completed" || s === "ready") {
    return "bg-emerald-50 text-emerald-800 border-emerald-200/80 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-800/40";
  }
  if (s === "under review" || s === "inprogress" || s === "processing") {
    return "bg-sky-50/70 text-slate-800 border-sky-200/60 dark:bg-sky-950/20 dark:text-zinc-200 dark:border-sky-900/30";
  }
  if (s === "needs revision" || s === "revision") {
    return "bg-amber-50 text-amber-800 border-amber-200/80 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-800/40";
  }
  if (s === "declined" || s === "cancelled" || s === "rejected") {
    return "bg-rose-50 text-rose-800 border-rose-200/80 dark:bg-rose-950/30 dark:text-rose-300 dark:border-rose-800/40";
  }
  if (s === "submitted" || s === "pending") {
    return "bg-slate-100 text-slate-700 border-slate-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-border";
  }
  if (s === "archived") {
    return "bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-border";
  }
  return "bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-border";
}

export function getProposalStatusDotClass(status) {
  const s = String(status || "").toLowerCase().trim();
  if (s === "approved" || s === "completed" || s === "ready") return "bg-emerald-500";
  if (s === "under review" || s === "inprogress" || s === "processing") return "bg-sky-500";
  if (s === "needs revision" || s === "revision") return "bg-amber-500";
  if (s === "declined" || s === "cancelled" || s === "rejected") return "bg-rose-500";
  if (s === "submitted" || s === "pending") return "bg-slate-400 dark:bg-zinc-400";
  return "bg-zinc-400";
}

export function getPostEventStatusBadgeClass(status) {
  const s = String(status || "").toLowerCase().trim();
  if (s === "cleared") {
    return "bg-emerald-50 text-emerald-800 border-emerald-200/80 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-800/40";
  }
  if (s === "under review" || s === "underreview" || s === "processing") {
    return "bg-sky-50/70 text-slate-800 border-sky-200/60 dark:bg-sky-950/20 dark:text-zinc-200 dark:border-sky-900/30";
  }
  if (s === "needs revision" || s === "revision") {
    return "bg-amber-50 text-amber-800 border-amber-200/80 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-800/40";
  }
  if (s === "declined" || s === "rejected") {
    return "bg-rose-50 text-rose-800 border-rose-200/80 dark:bg-rose-950/30 dark:text-rose-300 dark:border-rose-800/40";
  }
  return "bg-slate-100 text-slate-700 border-slate-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-border";
}

export function getPostEventStatusDotClass(status) {
  const s = String(status || "").toLowerCase().trim();
  if (s === "cleared") return "bg-emerald-500";
  if (s === "under review") return "bg-sky-500";
  if (s === "needs revision") return "bg-amber-500";
  if (s === "declined") return "bg-rose-500";
  return "bg-slate-400 dark:bg-zinc-400";
}

export function FirstPagePreview({ proposalId, fileUrl, title, onOpenPreview, subtext = "Official submission PDF" }) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const previewUrl = fileUrl || (proposalId ? `/api/osas/event-proposals/${proposalId}?file=1` : null);
  return (
    <>
      <div className="space-y-2">
        <div className="relative h-[360px] w-full overflow-hidden rounded-xl border border-border bg-gray-50 dark:bg-zinc-900">
          {previewUrl ? <PDFPreview src={previewUrl} title={title || "Official submission PDF"} /> : (
            <EmptyState variant="compact" icon={File02Icon} title="No Document Attached" description="This submission has no attached PDF." />
          )}
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-[11px] text-gray-500 dark:text-zinc-400">{subtext}</span>
          <Button variant="outline" size="sm" disabled={!previewUrl} onClick={() => onOpenPreview ? onOpenPreview() : setPreviewOpen(true)}>
            Preview Document
          </Button>
        </div>
      </div>
      <PDFPreviewModal open={previewOpen} onClose={() => setPreviewOpen(false)} preview={{ url: previewUrl, title: title || "Official submission PDF", subtitle: "Review the complete submitted document." }} />
    </>
  );
}

function OsasRecordList({ items, stream, onSelect, onReview }) {
  const isPostEvent = stream === "post_events";
  const columns = isPostEvent ? POST_EVENT_KANBAN_COLUMNS : KANBAN_COLUMNS;
  const [collapsedGroups, setCollapsedGroups] = useState({});
  const groupedItems = useMemo(() => {
    const groups = new Map(columns.map((column) => [column.key, { ...column, items: [] }]));

    items.forEach((item) => {
      const normalizedStatus = isPostEvent
        ? item.status || "Submitted"
        : normalizeProposalStatus(item.status);
      const group = groups.get(normalizedStatus);
      if (group) {
        group.items.push(item);
        return;
      }

      const unknownGroup = groups.get("Other") || {
        key: "Other",
        label: "Other",
        items: [],
      };
      unknownGroup.items.push(item);
      groups.set("Other", unknownGroup);
    });

    return [...groups.values()].filter((group) => group.items.length > 0);
  }, [columns, isPostEvent, items]);

  return (
    <div className="border-t border-border dark:border-border">
      {groupedItems.map((group) => {
        const isExpanded = collapsedGroups[group.key] !== true;
        const groupId = `osas-${stream}-list-${group.key.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
        const groupDotClass = isPostEvent
          ? getPostEventStatusDotClass(group.key)
          : getProposalStatusDotClass(group.key);

        return (
          <section key={group.key} aria-labelledby={`${groupId}-heading`}>
            <h3 id={`${groupId}-heading`} className="border-b border-border/70 bg-gray-50/80 dark:border-border dark:bg-zinc-900/70">
              <button
                type="button"
                aria-expanded={isExpanded}
                aria-controls={`${groupId}-items`}
                onClick={() => setCollapsedGroups((current) => ({ ...current, [group.key]: !isExpanded }))}
                className="flex min-h-11 w-full items-center gap-2.5 px-5 text-left transition-colors hover:bg-gray-100/80 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-pup-maroon dark:hover:bg-zinc-800/80 dark:focus-visible:ring-red-400 sm:px-6"
              >
                <ArrowDown01Icon
                  size="1em"
                  className={cn("shrink-0 text-sm text-gray-500 transition-transform dark:text-zinc-400", !isExpanded && "-rotate-90")}
                  aria-hidden="true"
                />
                <span className={cn("h-2 w-2 shrink-0 rounded-full", groupDotClass)} aria-hidden="true" />
                <span className="text-xs font-semibold text-gray-800 dark:text-zinc-100">{group.label}</span>
                <span className="text-[11px] font-medium tabular-nums text-gray-500 dark:text-zinc-400">{group.items.length}</span>
              </button>
            </h3>
            {isExpanded && (
              <div id={`${groupId}-items`} role="list">
                {group.items.map((item) => {
        const title = isPostEvent ? item.event_title : item.title;
        const organization = isPostEvent
          ? item.organization_name
          : item.verified_org_name || item.organization_name;
        const submittedBy = item.student_name || item.submitted_by_name || "Unknown submitter";
        const submitterId = item.submitted_by_email || item.student_no;
        const status = item.status || (isPostEvent ? "Submitted" : "");
        const statusClass = isPostEvent
          ? getPostEventStatusBadgeClass(status)
          : getProposalStatusBadgeClass(status);
        const date = item.created_at
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
            className="flex items-center gap-4 border-b border-border/70 px-5 py-4 last:border-b-0 dark:border-border sm:px-6"
          >
            <button
              type="button"
              onClick={() => onSelect(item)}
              className="group min-w-0 flex-1 cursor-pointer text-left"
              aria-label={`Open ${isPostEvent ? "report" : "proposal"} ${title || `#${item.id}`}`}
            >
              <div className="flex min-w-0 flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-3">
                <span className="shrink-0 font-sans text-[11px] font-semibold tabular-nums text-gray-400 dark:text-zinc-500">
                  #{item.id}
                </span>
                <span className="truncate text-[13px] font-semibold text-gray-900 transition-colors group-hover:text-pup-maroon dark:text-zinc-100 dark:group-hover:text-red-400">
                  {title || "Untitled submission"}
                </span>
                <span className="truncate text-xs text-gray-600 dark:text-zinc-400">
                  {item.org_acronym ? `${item.org_acronym} · ` : ""}{organization || "Organization unavailable"}
                </span>
              </div>
              <div className="mt-1.5 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-gray-500 dark:text-zinc-500">
                <span className="truncate">{submittedBy}{submitterId ? ` · ${submitterId}` : ""}</span>
                {isPostEvent ? (
                  <span className="tabular-nums">
                    {Number(attendees).toLocaleString()} attendees · ₱{expenses.toLocaleString(undefined, { minimumFractionDigits: 2 })} liquidated
                  </span>
                ) : (
                  <>
                    {item.officer_position && <span>{item.officer_position}</span>}
                    {item.has_bylaws != null && <span>CBL {item.has_bylaws ? "active" : "missing"}</span>}
                    {item.post_event_status && item.status === "Approved" && <span>Post-event: {item.post_event_status}</span>}
                  </>
                )}
              </div>
            </button>
            <div className="flex shrink-0 flex-col items-end gap-1.5">
              <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold", statusClass)}>
                <span className={cn("h-1.5 w-1.5 rounded-full", isPostEvent ? getPostEventStatusDotClass(status) : getProposalStatusDotClass(status))} />
                {status}
              </span>
              <span className="hidden text-[11px] text-gray-500 dark:text-zinc-500 sm:inline">{date}</span>
            </div>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => onReview(item)}
                  aria-label={`Review ${isPostEvent ? "report" : "proposal"} ${item.id}`}
                  className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-red-50 hover:text-pup-maroon dark:text-zinc-400 dark:hover:bg-red-950/30 dark:hover:text-red-400"
                >
                  <ClipboardIcon size={16} />
                </button>
              </TooltipTrigger>
              <TooltipContent>{isPostEvent ? "Review Clearance" : "Review Proposal"}</TooltipContent>
            </Tooltip>
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

function getTableSortValue(item, column, stream) {
  const isPostEvent = stream === "post_events";

  switch (column) {
    case "id":
      return Number(item.id) || 0;
    case "event":
      return `${(isPostEvent ? item.event_title : item.title) || ""} ${item.verified_org_name || item.organization_name || ""}`;
    case "proponent":
      return item.student_name || item.submitted_by_name || "";
    case "status":
      return isPostEvent ? item.status || "Submitted" : normalizeProposalStatus(item.status);
    case "attendance":
      return Number(item.actual_attendance ?? item.total_attendance ?? item.actual_attendees ?? 0);
    case "submitted": {
      if (!item.created_at) return Number.NEGATIVE_INFINITY;
      const submittedAt = new Date(item.created_at).getTime();
      return Number.isFinite(submittedAt) ? submittedAt : Number.NEGATIVE_INFINITY;
    }
    default:
      return "";
  }
}

function sortTableRecords(items, stream, sortBy, sortOrder) {
  if (!sortBy) return items;

  const direction = sortOrder === "ASC" ? 1 : -1;
  return [...items].sort((left, right) => {
    const leftValue = getTableSortValue(left, sortBy, stream);
    const rightValue = getTableSortValue(right, sortBy, stream);
    const comparison = typeof leftValue === "number" && typeof rightValue === "number"
      ? leftValue - rightValue
      : String(leftValue).localeCompare(String(rightValue), undefined, { numeric: true, sensitivity: "base" });
    return comparison * direction;
  });
}

export default function OsasMonitoringTab({ showToast }) {
  const [rows, setRows] = useState([]);
  const [selected, setSelected] = useState(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [pdfPreviewOpen, setPdfPreviewOpen] = useState(false);
  const [pdfPreviewData, setPdfPreviewData] = useState(null);

  const handleOpenPdfPreview = useCallback((item) => {
    if (!item) return;
    setPdfPreviewData({
      url: item.url || (item.id ? `/api/osas/event-proposals/${item.id}?file=1` : ""),
      title: item.title || "Document",
      subtitle:
        item.subtitle ||
        `Viewing official document submitted by ${item.organization_name || item.student_name || "Organization"}.`,
      studentName: item.student_name || item.submitted_by_name,
      docType: item.docType || "Event Proposal",
      originalFilename: item.original_filename || "Document.pdf",
    });
    setPdfPreviewOpen(true);
  }, []);

  const [activeStream, setActiveStream] = useState("proposals"); // "proposals" | "post_events"
  const [viewMode, setViewMode] = useState("table"); // "list" | "table" | "kanban"
  const [status, setStatus] = useState("Submitted");
  const [note, setNote] = useState("");
  const [statusFilters, setStatusFilters] = useState([]);
  const [orgFilters, setOrgFilters] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [tableSortBy, setTableSortBy] = useState("");
  const [tableSortOrder, setTableSortOrder] = useState("ASC");
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [page, setPage] = useUrlPage();
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [draggingProposal, setDraggingProposal] = useState(null);
  const [dragOverColumn, setDragOverColumn] = useState(null);
  const isDraggingRef = useRef(false);

  // Table and Kanban board scroll containers
  const tableContainerRef = useRef(null);
  const kanbanScrollRef = useRef(null);
  const [isScrolledX, setIsScrolledX] = useState(false);
  const [kanbanCanScrollLeft, setKanbanCanScrollLeft] = useState(false);

  const handleTableSort = useCallback((column) => {
    if (tableSortBy === column) {
      setTableSortOrder((current) => (current === "ASC" ? "DESC" : "ASC"));
    } else {
      setTableSortBy(column);
      setTableSortOrder("ASC");
    }
    setPage(1);
  }, [setPage, tableSortBy]);

  const scrollActiveView = useCallback((direction, amount = 400) => {
    const scrollRef = viewMode === "kanban" ? kanbanScrollRef : tableContainerRef;
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: direction === "left" ? -amount : amount, behavior: "smooth" });
    }
  }, [viewMode]);

  const resetActiveViewScroll = useCallback(() => {
    const scrollRef = viewMode === "kanban" ? kanbanScrollRef : tableContainerRef;
    scrollRef.current?.scrollTo({ left: 0, behavior: "smooth" });
  }, [viewMode]);

  const handleKanbanScrollBoundsChange = useCallback(({ canScrollLeft }) => {
    setKanbanCanScrollLeft(canScrollLeft);
  }, []);

  const resetTableScroll = useCallback(() => {
    if (tableContainerRef.current) {
      tableContainerRef.current.scrollTo({ left: 0, behavior: "smooth" });
    }
  }, []);

  // Post-Event Reports Stream state
  const [postEventReports, setPostEventReports] = useState([]);
  const [selectedPostEvent, setSelectedPostEvent] = useState(null);
  const [postEventSheetOpen, setPostEventSheetOpen] = useState(false);
  const [postEventStatus, setPostEventStatus] = useState("Cleared");
  const [postEventNote, setPostEventNote] = useState("");
  const [isSavingPostEvent, setIsSavingPostEvent] = useState(false);
  const [draggingPostEvent, setDraggingPostEvent] = useState(null);
  const [dragOverPostEventColumn, setDragOverPostEventColumn] = useState(null);
  const isDraggingPostEventRef = useRef(false);

  useEffect(() => {
    const timer = setTimeout(() => {
    try {
      const saved = localStorage.getItem("pup_osas_view_mode_v2");
      const legacySaved = localStorage.getItem("pup_osas_view_mode");
      if (saved === "list" || saved === "table" || saved === "kanban") {
        setViewMode(saved);
      } else if (legacySaved === "list" || legacySaved === "kanban") {
        const migratedMode = legacySaved === "list" ? "table" : "kanban";
        setViewMode(migratedMode);
        localStorage.setItem("pup_osas_view_mode_v2", migratedMode);
      }
    } catch {}
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const handleViewModeChange = (mode) => {
    setViewMode(mode);
    setPage(1);
    try {
      localStorage.setItem("pup_osas_view_mode_v2", mode);
    } catch {}
  };

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [proposalsRes, postEventsRes] = await Promise.allSettled([
        fetch("/api/osas/event-proposals", { cache: "no-store" }),
        fetch("/api/osas/post-event-reports", { cache: "no-store" }),
      ]);

      if (proposalsRes.status === "fulfilled") {
        const json = await proposalsRes.value.json().catch(() => null);
        if (proposalsRes.value.ok && json?.ok) setRows(json.data || []);
      }
      if (postEventsRes.status === "fulfilled") {
        const json = await postEventsRes.value.json().catch(() => null);
        if (postEventsRes.value.ok && json?.ok) setPostEventReports(json.data || []);
      }
    } catch (err) {
      showToast?.(
        formatErrorMessage(err, {
          title: "Submissions Load Failed",
          actionContext: "Loading OSAS proposals and reports",
        }),
        true
      );
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    const timer = setTimeout(() => load(), 0);
    return () => clearTimeout(timer);
  }, [load]);

  const select = async (item) => {
    setSelected(item);
    setStatus(item.status);
    setNote("");
    setSheetOpen(true);
    try {
      const res = await fetch(`/api/osas/event-proposals/${item.id}`, { cache: "no-store" });
      const json = await res.json();
      if (res.ok && json.ok) {
        setSelected((prev) => (prev?.id === item.id ? { ...prev, ...json.data } : prev));
      }
    } catch (err) {
      console.error("Failed to fetch proposal details", err);
    }
  };

  const save = async (overrideStatus) => {
    if (!selected) return;
    const targetStatus = overrideStatus || status;
    const current = normalizeProposalStatus(selected.status);

    const isRevoking = current === "Approved" && targetStatus !== "Approved";
    const isReopening = current === "Declined" && targetStatus !== "Declined";
    const isRevision = targetStatus === "Needs Revision";
    const isNoteMandatory = isRevoking || isReopening || isRevision;

    if (isNoteMandatory && note.trim().length < 5) {
      return showToast?.(
        {
          title: "Justification Required",
          description: isRevision
            ? "Please provide revision instructions (at least 5 characters) for the student organization."
            : "Please provide a written justification note (at least 5 characters) for this action.",
        },
        true
      );
    }

    const finalNote =
      note.trim() || `Status updated to ${targetStatus} by OSAS evaluation.`;
    setIsSaving(true);
    try {
      const res = await fetch(`/api/osas/event-proposals/${selected.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: targetStatus, note: finalNote }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        return showToast?.(
          formatErrorMessage(json?.error || "Unable to save proposal changes.", {
            title: "Update Failed",
            actionContext: `Updating proposal #${selected.id} status to ${targetStatus}`,
          }),
          true
        );
      }
      showToast?.({ title: "Proposal updated", description: `Status changed to ${targetStatus}.` });
      setNote("");
      await load();
      const detailRes = await fetch(`/api/osas/event-proposals/${selected.id}`, { cache: "no-store" });
      const detailJson = await detailRes.json();
      if (detailRes.ok && detailJson.ok) {
        setSelected(detailJson.data);
        setStatus(detailJson.data.status);
      }
    } catch (err) {
      showToast?.(
        formatErrorMessage(err, {
          title: "Update Failed",
          actionContext: `Updating proposal #${selected.id}`,
        }),
        true
      );
    } finally {
      setIsSaving(false);
    }
  };

  const selectPostEvent = async (report) => {
    setSelectedPostEvent(report);
    setPostEventStatus(report.status === "Submitted" ? "Under Review" : report.status);
    setPostEventNote(report.review_note || report.review_notes || "");
    setPostEventSheetOpen(true);
    try {
      const res = await fetch(`/api/osas/post-event-reports/${report.id}`, { cache: "no-store" });
      const json = await res.json();
      if (res.ok && json.ok) {
        setSelectedPostEvent((prev) => (prev?.id === report.id ? { ...prev, ...json.data } : prev));
        if (json.data?.status) {
          setPostEventStatus(json.data.status === "Submitted" ? "Under Review" : json.data.status);
        }
      }
    } catch (err) {
      console.error("Failed to fetch post-event report details", err);
    }
  };

  const savePostEvent = async (overrideStatus) => {
    if (!selectedPostEvent) return;
    const targetStatus = overrideStatus || postEventStatus;

    if (isPostEventNoteRequired && postEventNote.trim().length < 5) {
      return showToast?.(
        {
          title: "Justification Required",
          description: isRevokingPostEventClearance
            ? "A written justification note (at least 5 characters) is required when revoking post-event clearance."
            : isRequestingPostEventRevision
            ? "Please provide specific revision instructions (at least 5 characters) for the student organization."
            : "Please provide a written justification note (at least 5 characters) for this action.",
        },
        true
      );
    }

    const finalNote = postEventNote.trim() || `Status updated to ${targetStatus} by OSAS clearance review.`;
    setIsSavingPostEvent(true);
    try {
      const res = await fetch(`/api/osas/post-event-reports/${selectedPostEvent.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: targetStatus, note: finalNote }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        return showToast?.(
          formatErrorMessage(json?.error || "Unable to save clearance review.", {
            title: "Clearance Update Failed",
            actionContext: `Updating post-event report #${selectedPostEvent.id} to ${targetStatus}`,
          }),
          true
        );
      }
      showToast?.({ title: "Post-Event Clearance Updated", description: `Report marked as ${targetStatus}.` });
      setPostEventSheetOpen(false);
      await load();
    } catch (err) {
      showToast?.(
        formatErrorMessage(err, {
          title: "Clearance Update Failed",
          actionContext: `Updating post-event report #${selectedPostEvent.id}`,
        }),
        true
      );
    } finally {
      setIsSavingPostEvent(false);
    }
  };

  const handlePostEventDrop = async (e, targetStatus) => {
    e.preventDefault();
    setDragOverPostEventColumn(null);
    const reportToMove = draggingPostEvent;
    setDraggingPostEvent(null);

    if (!reportToMove || reportToMove.status === targetStatus) return;

    const currentStatus = reportToMove.status || "Submitted";
    const reportId = reportToMove.id;

    // Guard: Cleared and Declined reports are locked from direct drag-and-drop
    if (currentStatus === "Cleared" || currentStatus === "Declined") {
      showToast?.(
        {
          title: "Report Locked",
          description: `${currentStatus} reports cannot be moved via drag-and-drop. Open the clearance review drawer to formally revoke or appeal.`,
        },
        true
      );
      return;
    }

    // Guard: Validate state machine transition
    const allowed = POST_EVENT_ALLOWED_TRANSITIONS[currentStatus] || [];
    if (!allowed.includes(targetStatus)) {
      showToast?.(
        {
          title: "Invalid Transition",
          description: `Cannot move post-event report from "${currentStatus}" to "${targetStatus}".`,
        },
        true
      );
      return;
    }

    // Special UX: Needs Revision requires explicit instructions for the student org
    if (targetStatus === "Needs Revision") {
      selectPostEvent(reportToMove);
      setPostEventStatus("Needs Revision");
      showToast?.({
        title: "Revision Instructions Required",
        description: "Please specify the required post-event revisions in the clearance review drawer.",
      });
      return;
    }

    const prevStatus = reportToMove.status;

    // 1. Optimistic update
    setPostEventReports((prev) =>
      prev.map((r) => (r.id === reportId ? { ...r, status: targetStatus } : r))
    );

    showToast?.({
      title: "Report Status Updated",
      description: `Moved "${reportToMove.event_title}" to ${targetStatus}.`,
    });

    try {
      const res = await fetch(`/api/osas/post-event-reports/${reportId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: targetStatus,
          note: `Status updated to ${targetStatus} via OSAS Kanban pipeline.`,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        // Rollback
        setPostEventReports((prev) =>
          prev.map((r) => (r.id === reportId ? { ...r, status: prevStatus } : r))
        );
        showToast?.(
          formatErrorMessage(json?.error || "Could not update status.", {
            title: "Pipeline Move Failed",
            actionContext: `Moving post-event report #${reportId} to ${targetStatus}`,
          }),
          true
        );
        return;
      }

      // If the review sheet is already open for this report, update its displayed status
      if (selectedPostEvent?.id === reportId) {
        setSelectedPostEvent((prev) => ({ ...prev, status: targetStatus }));
        setPostEventStatus(targetStatus);
      }
    } catch (err) {
      // Rollback
      setPostEventReports((prev) =>
        prev.map((r) => (r.id === reportId ? { ...r, status: prevStatus } : r))
      );
      showToast?.(
        formatErrorMessage(err, {
          title: "Pipeline Move Failed",
          actionContext: `Moving post-event report #${reportId} to ${targetStatus}`,
        }),
        true
      );
    }
  };

  const handleDrop = async (e, targetStatus) => {
    e.preventDefault();
    setDragOverColumn(null);
    const proposalToMove = draggingProposal;
    setDraggingProposal(null);

    if (!proposalToMove || proposalToMove.status === targetStatus) return;

    const currentStatus = normalizeProposalStatus(proposalToMove.status);
    const proposalId = proposalToMove.id;

    // Guard: Approved and Declined proposals are terminal and locked from direct drag-and-drop
    if (currentStatus === "Approved" || currentStatus === "Declined") {
      showToast?.(
        {
          title: "Proposal Locked",
          description: `${currentStatus} proposals cannot be moved via drag-and-drop. Open the review drawer to formally revoke or appeal.`,
        },
        true
      );
      return;
    }

    // Guard: Validate state machine transition
    const allowed = ALLOWED_TRANSITIONS[currentStatus] || [];
    if (!allowed.includes(targetStatus)) {
      showToast?.(
        {
          title: "Invalid Transition",
          description: `Cannot move proposal from "${currentStatus}" to "${targetStatus}".`,
        },
        true
      );
      return;
    }

    // Special UX: Needs Revision requires explicit instructions for the student org
    if (targetStatus === "Needs Revision") {
      select(proposalToMove);
      setStatus("Needs Revision");
      showToast?.({
        title: "Revision Feedback Required",
        description: "Please specify the revision instructions for the student organization in the review panel.",
      });
      return;
    }

    const prevStatus = proposalToMove.status;

    // 1. Optimistic update
    setRows((prev) =>
      prev.map((r) => (r.id === proposalId ? { ...r, status: targetStatus } : r))
    );

    showToast?.({
      title: "Proposal Moved",
      description: `Moved "${proposalToMove.title}" to ${targetStatus}.`,
    });

    try {
      const res = await fetch(`/api/osas/event-proposals/${proposalId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: targetStatus,
          note: `Status updated to ${targetStatus} via OSAS Kanban pipeline.`,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        // Rollback
        setRows((prev) =>
          prev.map((r) => (r.id === proposalId ? { ...r, status: prevStatus } : r))
        );
        showToast?.(
          formatErrorMessage(json?.error || "Could not update status.", {
            title: "Pipeline Move Failed",
            actionContext: `Moving proposal #${proposalId} to ${targetStatus}`,
          }),
          true
        );
        return;
      }

      // If the review sheet is already open for this proposal, update its displayed status
      if (selected?.id === proposalId) {
        setSelected((prev) => ({ ...prev, status: targetStatus }));
        setStatus(targetStatus);
      }
    } catch (err) {
      // Rollback
      setRows((prev) =>
        prev.map((r) => (r.id === proposalId ? { ...r, status: prevStatus } : r))
      );
      showToast?.(
        formatErrorMessage(err, {
          title: "Pipeline Move Failed",
          actionContext: `Moving proposal #${proposalId} to ${targetStatus}`,
        }),
        true
      );
    }
  };

  const counts = useMemo(() => {
    const c = {
      All: rows.length,
      Submitted: 0,
      "Under Review": 0,
      "Needs Revision": 0,
      Approved: 0,
      Declined: 0,
    };
    for (const r of rows) {
      const norm = normalizeProposalStatus(r.status);
      if (c[norm] !== undefined) {
        c[norm] += 1;
      }
    }
    return c;
  }, [rows]);

  const postEventCounts = useMemo(() => {
    const c = {
      All: postEventReports.length,
      Submitted: 0,
      "Under Review": 0,
      "Needs Revision": 0,
      Cleared: 0,
      Declined: 0,
    };
    for (const r of postEventReports) {
      const s = r.status || "Submitted";
      if (c[s] !== undefined) c[s] += 1;
    }
    return c;
  }, [postEventReports]);

  const filterTabs = useMemo(() => {
    return [
      { key: "All", label: "All", count: counts.All },
      { key: "Submitted", label: "Submitted", count: counts.Submitted },
      { key: "Under Review", label: "Under Review", count: counts["Under Review"] },
      { key: "Needs Revision", label: "Needs Revision", count: counts["Needs Revision"] },
      { key: "Approved", label: "Approved", count: counts.Approved },
      { key: "Declined", label: "Declined", count: counts.Declined },
    ];
  }, [counts]);

  const postEventFilterTabs = useMemo(() => [
    { key: "All", label: "All", count: postEventCounts.All },
    { key: "Submitted", label: "Submitted", count: postEventCounts.Submitted },
    { key: "Under Review", label: "Under Review", count: postEventCounts["Under Review"] },
    { key: "Needs Revision", label: "Needs Revision", count: postEventCounts["Needs Revision"] },
    { key: "Cleared", label: "Cleared", count: postEventCounts.Cleared },
    { key: "Declined", label: "Declined", count: postEventCounts.Declined },
  ], [postEventCounts]);

  const currentFilterTabs = useMemo(() => {
    if (activeStream === "post_events") return postEventFilterTabs;
    return filterTabs;
  }, [activeStream, postEventFilterTabs, filterTabs]);

  const filterGroups = useMemo(() => {
    const filterRecords = activeStream === "post_events" ? postEventReports : rows;
    const statusColors = {
      Submitted: "bg-blue-500",
      "Under Review": "bg-amber-500",
      "Needs Revision": "bg-purple-500",
      Approved: "bg-emerald-500",
      Cleared: "bg-emerald-500",
      Declined: "bg-rose-500",
    };
    const organizations = Array.from(
      new Set(filterRecords.map((record) => record.organization_name).filter(Boolean))
    ).sort();

    return [
      {
        id: "status",
        label: "Review Status",
        options: currentFilterTabs
          .filter((tab) => tab.key !== "All")
          .map((tab) => ({
            value: tab.key,
            label: tab.label,
            count: tab.count,
            indicatorColor: statusColors[tab.key],
          })),
      },
      {
        id: "org",
        label: "Organization",
        options: organizations.map((org) => ({
          value: org,
          label: org,
          count: filterRecords.filter((record) => record.organization_name === org).length,
        })),
      },
    ];
  }, [activeStream, currentFilterTabs, rows, postEventReports]);

  const filterValues = useMemo(() => ({
    status: statusFilters,
    org: orgFilters,
  }), [statusFilters, orgFilters]);

  const handleFilterChange = useCallback((groupId, values) => {
    if (groupId === "status") setStatusFilters(values);
    else if (groupId === "org") setOrgFilters(values);
    setPage(1);
  }, [setPage]);

  const handleClearFilters = useCallback(() => {
    setSearchQuery("");
    setStatusFilters([]);
    setOrgFilters([]);
    setPage(1);
  }, [setPage]);

  const activeChips = useMemo(() => {
    const chips = [];
    if (searchQuery.trim()) {
      chips.push({
        id: "search",
        label: `Search: ${searchQuery.trim()}`,
        onRemove: () => { setSearchQuery(""); setPage(1); },
      });
    }
    statusFilters.forEach((st) => {
      chips.push({
        id: `status-${st}`,
        label: `Status: ${st}`,
        onRemove: () => { setStatusFilters((prev) => prev.filter((s) => s !== st)); setPage(1); },
      });
    });
    orgFilters.forEach((org) => {
      chips.push({
        id: `org-${org}`,
        label: `Org: ${org}`,
        onRemove: () => { setOrgFilters((prev) => prev.filter((o) => o !== org)); setPage(1); },
      });
    });
    return chips;
  }, [searchQuery, statusFilters, orgFilters, setPage]);

  const hasActiveFilters = Boolean(
    searchQuery.trim() || statusFilters.length > 0 || orgFilters.length > 0
  );

  const filteredRows = useMemo(() => {
    return rows.filter((item) => {
      if (statusFilters.length > 0) {
        const itemStatusNorm = normalizeProposalStatus(item.status);
        const matchesStatus = statusFilters.some(
          (sf) =>
            normalizeProposalStatus(sf) === itemStatusNorm ||
            String(sf).toLowerCase() === String(item.status || "").toLowerCase()
        );
        if (!matchesStatus) return false;
      }
      if (orgFilters.length > 0 && !orgFilters.includes(item.organization_name)) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchTitle = (item.title || "").toLowerCase().includes(q);
        const matchOrg = (item.organization_name || "").toLowerCase().includes(q);
        const matchStudent =
          (item.student_name || "").toLowerCase().includes(q) ||
          (item.student_no || "").toLowerCase().includes(q);
        if (!matchTitle && !matchOrg && !matchStudent) return false;
      }
      return true;
    });
  }, [rows, statusFilters, orgFilters, searchQuery]);

  const filteredPostEvents = useMemo(() => {
    return postEventReports.filter((item) => {
      if (statusFilters.length > 0) {
        const matches = statusFilters.some((sf) => String(sf).toLowerCase() === String(item.status || "Submitted").toLowerCase());
        if (!matches) return false;
      }
      if (orgFilters.length > 0 && !orgFilters.includes(item.organization_name)) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchTitle = (item.event_title || "").toLowerCase().includes(q);
        const matchOrg = (item.organization_name || "").toLowerCase().includes(q);
        const matchStudent =
          (item.student_name || "").toLowerCase().includes(q) ||
          (item.student_no || "").toLowerCase().includes(q);
        if (!matchTitle && !matchOrg && !matchStudent) return false;
      }
      return true;
    });
  }, [postEventReports, statusFilters, orgFilters, searchQuery]);

  const sortedRows = useMemo(
    () => sortTableRecords(filteredRows, "proposals", tableSortBy, tableSortOrder),
    [filteredRows, tableSortBy, tableSortOrder]
  );
  const sortedPostEvents = useMemo(
    () => sortTableRecords(filteredPostEvents, "post_events", tableSortBy, tableSortOrder),
    [filteredPostEvents, tableSortBy, tableSortOrder]
  );

  const activeFilteredList = useMemo(() => {
    if (activeStream === "post_events") return filteredPostEvents;
    return filteredRows;
  }, [activeStream, filteredPostEvents, filteredRows]);

  const totalPages = Math.max(1, Math.ceil(activeFilteredList.length / itemsPerPage));
  const safePage = Math.min(Math.max(1, page), totalPages);

  const paginatedRows = useMemo(() => {
    const start = (safePage - 1) * itemsPerPage;
    return sortedRows.slice(start, start + itemsPerPage);
  }, [sortedRows, safePage, itemsPerPage]);

  const paginatedPostEvents = useMemo(() => {
    const start = (safePage - 1) * itemsPerPage;
    return sortedPostEvents.slice(start, start + itemsPerPage);
  }, [sortedPostEvents, safePage, itemsPerPage]);

  // Track horizontal scroll state on the table container
  useEffect(() => {
    const el = tableContainerRef.current;
    if (!el) {
      setIsScrolledX(false);
      return;
    }
    const handleScroll = () => {
      setIsScrolledX(el.scrollLeft > 20);
    };
    el.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => el.removeEventListener("scroll", handleScroll);
  }, [loading, viewMode, activeStream, page, paginatedRows.length, paginatedPostEvents.length]);

  // Auto reset scroll to start when stream, view, page, search, or filters change
  useEffect(() => {
    tableContainerRef.current?.scrollTo({ left: 0, behavior: "smooth" });
    kanbanScrollRef.current?.scrollTo({ left: 0, behavior: "smooth" });
  }, [activeStream, viewMode, page, searchQuery, statusFilters, orgFilters]);

  const getProposalsForColumn = (columnKey) => {
    const normCol = normalizeProposalStatus(columnKey);
    return rows.filter((item) => {
      if (normalizeProposalStatus(item.status) !== normCol) return false;
      if (orgFilters.length > 0 && !orgFilters.includes(item.organization_name)) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchTitle = (item.title || "").toLowerCase().includes(q);
        const matchOrg = (item.organization_name || "").toLowerCase().includes(q);
        const matchStudent =
          (item.student_name || "").toLowerCase().includes(q) ||
          (item.student_no || "").toLowerCase().includes(q);
        if (!matchTitle && !matchOrg && !matchStudent) return false;
      }
      return true;
    });
  };

  const currentProposalStatus = normalizeProposalStatus(selected?.status);
  const isRevokingApproval = currentProposalStatus === "Approved" && status !== "Approved";
  const isReopeningDeclined = currentProposalStatus === "Declined" && status !== "Declined";
  const isRequestingRevision = status === "Needs Revision";
  const isNoteRequired = isRevokingApproval || isReopeningDeclined || isRequestingRevision;
  const isNoteValid = !isNoteRequired || note.trim().length >= 5;

  const availableStatusOptions = useMemo(() => {
    if (!selected) return STATUS_OPTIONS;
    const current = normalizeProposalStatus(selected.status);
    const nextAllowed = ALLOWED_TRANSITIONS[current] || [];
    return STATUS_OPTIONS.filter((opt) => opt === current || nextAllowed.includes(opt));
  }, [selected]);

  const getPostEventsForColumn = (columnKey) => {
    return postEventReports.filter((item) => {
      const s = item.status || "Submitted";
      if (s.toLowerCase() !== String(columnKey).toLowerCase()) return false;
      if (orgFilters.length > 0 && !orgFilters.includes(item.organization_name)) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchTitle = (item.event_title || "").toLowerCase().includes(q);
        const matchOrg = (item.organization_name || "").toLowerCase().includes(q);
        const matchStudent =
          (item.student_name || "").toLowerCase().includes(q) ||
          (item.student_no || "").toLowerCase().includes(q) ||
          (item.submitted_by_email || "").toLowerCase().includes(q);
        if (!matchTitle && !matchOrg && !matchStudent) return false;
      }
      return true;
    });
  };

  const currentPostEventStatus = selectedPostEvent?.status || "Submitted";
  const isRevokingPostEventClearance = currentPostEventStatus === "Cleared" && postEventStatus !== "Cleared";
  const isReopeningPostEventDeclined = currentPostEventStatus === "Declined" && postEventStatus !== "Declined";
  const isRequestingPostEventRevision = postEventStatus === "Needs Revision";
  const isPostEventNoteRequired = isRevokingPostEventClearance || isReopeningPostEventDeclined || isRequestingPostEventRevision;
  const isPostEventNoteValid = !isPostEventNoteRequired || postEventNote.trim().length >= 5;

  const availablePostEventStatusOptions = useMemo(() => {
    if (!selectedPostEvent) return POST_EVENT_STATUS_OPTIONS;
    const current = selectedPostEvent.status || "Submitted";
    const nextAllowed = POST_EVENT_ALLOWED_TRANSITIONS[current] || [];
    return POST_EVENT_STATUS_OPTIONS.filter((opt) => opt === current || nextAllowed.includes(opt));
  }, [selectedPostEvent]);

  const proposalNavigationList = filteredRows;
  const currentProposalIndex = selected
    ? proposalNavigationList.findIndex((p) => p.id === selected.id)
    : -1;

  const handlePrevProposal = () => {
    if (currentProposalIndex > 0) {
      select(proposalNavigationList[currentProposalIndex - 1]);
    }
  };

  const handleNextProposal = () => {
    if (currentProposalIndex >= 0 && currentProposalIndex < proposalNavigationList.length - 1) {
      select(proposalNavigationList[currentProposalIndex + 1]);
    }
  };

  const postEventNavigationList = filteredPostEvents;
  const currentPostEventIndex = selectedPostEvent
    ? postEventNavigationList.findIndex((p) => p.id === selectedPostEvent.id)
    : -1;

  const handlePrevPostEvent = () => {
    if (currentPostEventIndex > 0) {
      selectPostEvent(postEventNavigationList[currentPostEventIndex - 1]);
    }
  };

  const handleNextPostEvent = () => {
    if (currentPostEventIndex >= 0 && currentPostEventIndex < postEventNavigationList.length - 1) {
      selectPostEvent(postEventNavigationList[currentPostEventIndex + 1]);
    }
  };

  if (loading) {
    return <OsasMonitoringSkeleton />;
  }

  return (
    <div className="font-jakarta w-full flex flex-[1_0_auto] flex-col h-auto gap-6 focus:outline-none animate-fade-up select-none">
      {/* ONE Single Card Container encapsulating Header, Toolbar, Active Filters, Table & Kanban */}
      <Card className="flex flex-[1_0_auto] h-auto w-full flex-col p-0 gap-0 overflow-visible rounded-2xl border border-border bg-white shadow-sm dark:border-border dark:bg-card dark:shadow-none isolate font-jakarta">
        {/* 1. Page Header */}
        <PageHeader
          icon="CalendarCheckIn01Icon"
          title="OSAS Monitoring"
          description="Review student organization event proposals and post-event liquidation reports."
          showBorder={false}
          className="p-6"
          titleClassName="text-[18px] font-semibold tracking-[-0.01em] text-gray-900 dark:text-zinc-50"
          descriptionClassName="text-[13px] font-normal text-gray-900 dark:text-zinc-300 mt-[4px]"
          actions={
            <div className="flex items-center gap-2">
              {/* Segmented View Mode Toggle (Available for proposals & post-events streams) */}
              {(activeStream === "proposals" || activeStream === "post_events") && (
                <div className="flex items-center gap-1 bg-gray-100/80 dark:bg-zinc-800/60 p-1 rounded-xl border border-border/60 dark:border-border shrink-0">
                  <button
                    type="button"
                    onClick={() => handleViewModeChange("list")}
                    aria-pressed={viewMode === "list"}
                    className={cn(
                      "inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer",
                      viewMode === "list"
                        ? "bg-pup-maroon text-white shadow-xs"
                        : "text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white"
                    )}
                    title="Show submissions as compact rows"
                  >
                    <ViewModeIcon mode="list" className="text-sm" />
                    <span>List</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleViewModeChange("table")}
                    aria-pressed={viewMode === "table"}
                    className={cn(
                      "inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer",
                      viewMode === "table"
                        ? "bg-pup-maroon text-white shadow-xs"
                        : "text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white"
                    )}
                    title="Show submissions in rows and columns"
                  >
                    <ViewModeIcon mode="table" className="text-sm" />
                    <span>Table</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleViewModeChange("kanban")}
                    aria-pressed={viewMode === "kanban"}
                    className={cn(
                      "inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer",
                      viewMode === "kanban"
                        ? "bg-pup-maroon text-white shadow-xs"
                        : "text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white"
                    )}
                    title="Show submissions on a Kanban board, grouped by stage"
                  >
                    <ViewModeIcon mode="kanban" className="text-sm" />
                    <span>Kanban</span>
                  </button>
                </div>
              )}

              <RefreshButton onRefresh={load} isLoading={loading} title="Refresh OSAS Queue" />
            </div>
          }
        />

        {/* 2. Stream, Search, Filter, and Horizontal Scroll Toolbar */}
        <div className="border-t border-border dark:border-border bg-gray-50/40 px-5 py-3 dark:bg-zinc-900/30 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex w-full items-center gap-1.5 overflow-x-auto rounded-xl border border-border/80 bg-gray-200/60 p-1 scrollbar-none dark:border-border dark:bg-zinc-800/80 xl:w-fit">
            <button
              type="button"
              onClick={() => {
                setActiveStream("proposals");
                setStatusFilters([]);
                setOrgFilters([]);
                setSearchQuery("");
                setPage(1);
              }}
              aria-pressed={activeStream === "proposals"}
              className={cn(
                "inline-flex shrink-0 items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer",
                activeStream === "proposals"
                  ? "bg-pup-maroon text-white shadow-xs"
                  : "text-gray-600 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white"
              )}
            >
              <CalendarCheckIn01Icon size="1em" className="text-sm" />
              <span>Pre-Event Proposals</span>
              <span className={cn("min-w-4.5 rounded-full px-1.5 py-0.2 text-center text-[10px] font-bold", activeStream === "proposals" ? "bg-white/20 text-white" : "bg-gray-200 text-gray-700 dark:bg-zinc-700 dark:text-zinc-300")}>
                {rows.length}
              </span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveStream("post_events");
                setStatusFilters([]);
                setOrgFilters([]);
                setSearchQuery("");
                setPage(1);
              }}
              aria-pressed={activeStream === "post_events"}
              className={cn(
                "inline-flex shrink-0 items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer",
                activeStream === "post_events"
                  ? "bg-pup-maroon text-white shadow-xs"
                  : "text-gray-600 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white"
              )}
            >
              <ClipboardIcon size="1em" className="text-sm" />
              <span>Post-Event & Liquidation</span>
              <span className={cn("min-w-4.5 rounded-full px-1.5 py-0.2 text-center text-[10px] font-bold", activeStream === "post_events" ? "bg-white/20 text-white" : "bg-gray-200 text-gray-700 dark:bg-zinc-700 dark:text-zinc-300")}>
                {postEventReports.length}
              </span>
            </button>
          </div>

          <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-end xl:flex-1">
            <div className="relative w-full shrink-0 group sm:w-60 md:w-64">
              <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                <Search01Icon size="1em" className="text-gray-400 dark:text-zinc-500 text-xs transition-colors group-focus-within:text-pup-maroon dark:group-focus-within:text-red-400" />
              </div>
              <Input
                type="text"
                placeholder={
                  activeStream === "proposals"
                    ? "Search proposals, students, orgs..."
                    : activeStream === "post_events"
                    ? "Search event reports, orgs..."
                    : "Search CBL revisions, orgs..."
                }
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                className="h-9 w-full rounded-xl border border-border dark:border-border bg-white dark:bg-zinc-800 pl-8 pr-16 text-xs font-normal text-gray-900 dark:text-zinc-100 placeholder:text-gray-400 dark:placeholder:text-zinc-500 shadow-none focus-visible:outline-none focus-visible:border-pup-maroon focus-visible:ring-1 focus-visible:ring-pup-maroon dark:focus-visible:border-red-500/80 dark:focus-visible:ring-red-500/80 transition-all"
              />
              <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-[11px] font-sans tabular-nums text-gray-400 dark:text-zinc-500">
                {activeFilteredList.length.toLocaleString()}
              </div>
            </div>

            <MultiCriteriaFilter
              title={activeStream === "proposals" ? "Filter Proposals" : "Filter Post-Event Reports"}
              buttonLabel={activeStream === "proposals" ? "Filter Events" : "Filter Reports"}
              headerTitle={activeStream === "proposals" ? "Filter Proposals" : "Filter Post-Event Reports"}
              groups={filterGroups}
              selectedValues={filterValues}
              onChange={handleFilterChange}
              onClearAll={handleClearFilters}
            />

            {(viewMode === "table" || viewMode === "kanban") && (
              <TableScrollControls
                isScrolledX={viewMode === "table" ? isScrolledX : kanbanCanScrollLeft}
                label="Scroll columns:"
                scrollTargetLabel={viewMode === "kanban" ? "Kanban board" : "table"}
                onResetScroll={resetActiveViewScroll}
                onScrollLeft={(amount) => scrollActiveView("left", amount)}
                onScrollRight={(amount) => scrollActiveView("right", amount)}
              />
            )}
          </div>
        </div>

        {/* 3. Active Filter Chips */}
        <div className="border-t border-border dark:border-border px-6 py-2.5 flex items-center justify-between gap-4 bg-white dark:bg-card">
          <div className="flex-1 min-w-0">
            <ActiveFilterChips
              chips={activeChips}
              onClearAll={handleClearFilters}
              className="p-0 border-0"
            />
          </div>
        </div>

        {/* 4. Stream Content */}
        {/* STREAM 1: Pre-Event Proposals */}
        {activeStream === "proposals" && (
          <>
            {viewMode === "table" ? (
              filteredRows.length === 0 ? (
                <div className="rounded-b-2xl flex-1 flex flex-col items-center justify-center min-h-[420px] w-full border-t border-border dark:border-border">
                  <Empty>
                    <EmptyHeader>
                      <EmptyMedia><EmptyCalendarCheckIn01Icon size="1em" /></EmptyMedia>
                      <EmptyTitle>
                        No Event Proposals Found
                      </EmptyTitle>
                      <EmptyDescription>
                        {hasActiveFilters
                          ? "Try adjusting your search criteria or resetting active filters."
                          : "Student organizations have not submitted any event proposals yet."}
                      </EmptyDescription>
                    </EmptyHeader>
                    {hasActiveFilters && (
                      <EmptyContent>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleClearFilters}
                          title="Reset Filters"
                          className="h-10 px-5 text-xs font-semibold rounded-xl border border-border dark:border-border bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 cursor-pointer active:scale-95 transition-all shadow-xs"
                        >
                    Reset Filters
                  </Button>
                      </EmptyContent>
                    )}
                  </Empty>
                </div>
              ) : (
                <div className="w-full flex-[1_0_auto] flex flex-col border-t border-border dark:border-border">
                  <div
                    ref={tableContainerRef}
                    className="w-full flex-[1_0_auto] overflow-x-auto show-scrollbar pb-2 select-none"
                  >
                  <table className="w-full text-left text-xs border-separate border-spacing-0 min-w-[1300px]">
                    <thead className="sticky top-0 z-10 border-b border-border bg-gray-50/90 dark:bg-zinc-900/90 backdrop-blur-xs select-none">
                      <tr className="text-left text-xs font-semibold text-gray-500 dark:text-zinc-400">
                        <th
                          aria-sort={tableSortBy !== "id" ? "none" : tableSortOrder === "ASC" ? "ascending" : "descending"}
                          className={cn(
                            "py-3.5 px-6 w-[140px] min-w-[140px] max-w-[140px] sticky left-0 z-20 bg-gray-50 dark:bg-zinc-900 transition-shadow whitespace-nowrap",
                            isScrolledX && "shadow-[4px_0_12px_-2px_rgba(0,0,0,0.06)] dark:shadow-[4px_0_12px_-2px_rgba(0,0,0,0.4)]"
                          )}
                        >
                          <div className="flex items-center justify-between gap-1">
                            <button type="button" onClick={() => handleTableSort("id")} className="group inline-flex items-center gap-1 text-left hover:text-gray-900 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-pup-maroon dark:hover:text-white dark:focus-visible:ring-red-400">
                              <span>Proposal ID</span>
                              <SortIndicator column="id" sortBy={tableSortBy} sortOrder={tableSortOrder} />
                            </button>
                            {isScrolledX && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button
                                    type="button"
                                    onClick={resetTableScroll}
                                    className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-white dark:bg-zinc-800 border border-border/80 text-pup-maroon dark:text-red-400 hover:bg-gray-100 dark:hover:bg-zinc-700 shadow-2xs cursor-pointer transition-all active:scale-95"
                                    aria-label="Reset scroll to start"
                                  >
                                    <ReloadIcon size="1em" className="text-xs" />
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent side="bottom">Reset Scroll to Start</TooltipContent>
                              </Tooltip>
                            )}
                          </div>
                        </th>
                        <SortableTableHeader column="event" label="Event Proposal & Organization" sortBy={tableSortBy} sortOrder={tableSortOrder} onSort={handleTableSort} className="py-3.5 px-6 w-[36%] whitespace-nowrap" />
                        <SortableTableHeader column="proponent" label="Proponent" sortBy={tableSortBy} sortOrder={tableSortOrder} onSort={handleTableSort} className="py-3.5 px-6 w-[21%] whitespace-nowrap" />
                        <SortableTableHeader column="status" label="Status" sortBy={tableSortBy} sortOrder={tableSortOrder} onSort={handleTableSort} className="py-3.5 px-6 w-[16%] whitespace-nowrap" />
                        <SortableTableHeader column="submitted" label="Submitted" sortBy={tableSortBy} sortOrder={tableSortOrder} onSort={handleTableSort} className="py-3.5 px-6 w-[16%] whitespace-nowrap hidden sm:table-cell" />
                        <th className="py-3.5 px-6 pr-6 text-right w-20 whitespace-nowrap">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border dark:divide-border bg-white dark:bg-card">
                      {paginatedRows.map((item) => (
                        <tr
                          key={item.id}
                          onClick={() => select(item)}
                          className="hover:bg-gray-50/80 dark:hover:bg-zinc-800/40 transition-colors cursor-pointer group"
                        >
                          <td className={cn(
                            "py-3.5 px-6 whitespace-nowrap sticky left-0 z-10 bg-white dark:bg-card group-hover:bg-gray-50/80 dark:group-hover:bg-zinc-800/90 border-r border-border/70 dark:border-border/70 transition-shadow w-[140px] min-w-[140px] max-w-[140px]",
                            isScrolledX && "shadow-[4px_0_12px_-2px_rgba(0,0,0,0.06)] dark:shadow-[4px_0_12px_-2px_rgba(0,0,0,0.4)]"
                          )}>
                            <span className="font-sans tabular-nums text-xs font-medium text-gray-700 dark:text-zinc-300">
                              #{item.id}
                            </span>
                          </td>
                          <td className="py-3.5 px-6 overflow-hidden border-r border-border/70 dark:border-border/70">
                            <div className="font-semibold text-gray-900 dark:text-zinc-100 group-hover:text-pup-maroon dark:group-hover:text-red-400 transition-colors truncate" title={item.title}>
                              {item.title}
                            </div>
                            <div className="flex items-center gap-1.5 text-[11px] text-gray-900 dark:text-zinc-300 mt-0.5 min-w-0 overflow-hidden">
                              {item.org_acronym && (
                                <span className="px-1.5 py-0.2 text-[10px] font-bold rounded bg-red-50 text-pup-maroon dark:bg-red-950/40 dark:text-red-400 border border-red-100 dark:border-red-900/30 shrink-0">
                                  {item.org_acronym}
                                </span>
                              )}
                              <span className="truncate" title={item.verified_org_name || item.organization_name}>{item.verified_org_name || item.organization_name}</span>
                              {item.has_bylaws ? (
                                <span className="ml-1 px-1.5 py-0.2 text-[9px] font-semibold rounded bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-100 dark:border-emerald-900/30 shrink-0">
                                  CBL Active
                                </span>
                              ) : (
                                <span className="ml-1 px-1.5 py-0.2 text-[9px] font-semibold rounded bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-100 dark:border-amber-900/30 shrink-0">
                                  No CBL
                                </span>
                              )}
                              {item.post_event_status && item.status === "Approved" && (
                                <span className={cn(
                                  "ml-1 px-1.5 py-0.2 text-[9px] font-semibold rounded border shrink-0",
                                  getPostEventStatusBadgeClass(item.post_event_status)
                                )}>
                                  Post-Event: {item.post_event_status}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3.5 px-6 whitespace-nowrap overflow-hidden border-r border-border/70 dark:border-border/70">
                            <div className="font-medium text-gray-800 dark:text-zinc-200 flex items-center gap-1.5 min-w-0 overflow-hidden">
                              <span className="truncate" title={item.student_name}>{item.student_name}</span>
                              {item.officer_position && (
                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 font-normal shrink-0">
                                  {item.officer_position}
                                </span>
                              )}
                            </div>
                            <div className="font-sans tabular-nums text-[11px] text-gray-400 dark:text-zinc-500 truncate" title={item.submitted_by_email || item.student_no}>
                              {item.submitted_by_email || item.student_no}
                            </div>
                          </td>
                          <td className="py-3.5 px-6 whitespace-nowrap border-r border-border/70 dark:border-border/70">
                            <span
                              className={cn(
                                "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold",
                                getProposalStatusBadgeClass(item.status)
                              )}
                            >
                              <span className={cn("w-1.5 h-1.5 rounded-full", getProposalStatusDotClass(item.status))} />
                              {item.status}
                            </span>
                          </td>
                          <td className="py-3.5 px-6 whitespace-nowrap hidden sm:table-cell text-gray-900 dark:text-zinc-300 text-[11px] border-r border-border/70 dark:border-border/70">
                            {item.created_at
                              ? new Date(item.created_at).toLocaleDateString(undefined, {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                })
                              : "N/A"}
                          </td>
                          <td className="py-3.5 px-6 pr-6 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end" onClick={(e) => e.stopPropagation()}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button
                                    type="button"
                                    onClick={() => select(item)}
                                    aria-label="Review Proposal"
                                    className="w-7 h-7 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 text-gray-500 hover:text-pup-maroon dark:text-zinc-400 dark:hover:text-red-400 focus:outline-none cursor-pointer active:scale-95 flex items-center justify-center transition-colors border-0 bg-transparent"
                                  >
                                    <ClipboardIcon size="1em" className="text-[16px]" />
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent>Review Proposal</TooltipContent>
                              </Tooltip>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )) : viewMode === "list" ? (
              filteredRows.length === 0 ? (
              <div className="flex w-full flex-1 items-center justify-center border-t border-border dark:border-border">
                  <EmptyState
                    icon={hasActiveFilters ? Search01Icon : EmptyCalendarCheckIn01Icon}
                    title={hasActiveFilters ? "No Proposals Found" : "No Event Proposals Yet"}
                    description={hasActiveFilters
                      ? "Adjust your search or reset your filters."
                      : "Student organization event proposals will appear here after submission."}
                  >
                    {hasActiveFilters && (
                      <Button type="button" variant="outline" onClick={handleClearFilters} className="h-10 rounded-xl px-5 text-xs font-semibold">
                        Reset Filters
                      </Button>
                    )}
                  </EmptyState>
                </div>
              ) : (
                <OsasRecordList items={paginatedRows} stream="proposals" onSelect={select} onReview={select} />
              )
            ) : filteredRows.length === 0 ? (
              <div className="w-full flex-1 flex flex-col items-center justify-center border-t border-border dark:border-border bg-gray-50/20 dark:bg-zinc-900/10 min-h-[420px]">
                <Empty>
                  <EmptyHeader>
                    <EmptyMedia><ViewModeIcon mode="kanban" /></EmptyMedia>
                    <EmptyTitle>
                      No Proposals in Pipeline
                    </EmptyTitle>
                    <EmptyDescription>
                      {hasActiveFilters
                        ? "No proposals match your active search terms or filters."
                        : "There are currently no event proposals in the pipeline."}
                    </EmptyDescription>
                  </EmptyHeader>
                  {hasActiveFilters && (
                    <EmptyContent>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleClearFilters}
                        title="Reset Filters"
                        className="h-10 px-5 text-xs font-semibold rounded-xl border border-border dark:border-border bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 cursor-pointer active:scale-95 transition-all shadow-xs"
                      >
                    Reset Filters
                  </Button>
                    </EmptyContent>
                  )}
                </Empty>
              </div>
            ) : (
              /* Kanban Pipeline Board */
              <OsasKanbanPipeline
                stream="proposals"
                columns={KANBAN_COLUMNS}
                items={filteredRows}
                onSelectItem={select}
                onDropItem={handleDrop}
                draggingItem={draggingProposal}
                setDraggingItem={setDraggingProposal}
                dragOverColumn={dragOverColumn}
                setDragOverColumn={setDragOverColumn}
                allowedTransitions={ALLOWED_TRANSITIONS}
                normalizeStatus={normalizeProposalStatus}
                scrollRef={kanbanScrollRef}
                onScrollBoundsChange={handleKanbanScrollBoundsChange}
                isItemLocked={(item) => {
                  const s = normalizeProposalStatus(item.status);
                  return s === "Approved" || s === "Declined";
                }}
              />
            )}
          </>
        )}

        {/* STREAM 2: Post-Event & Liquidation Reports */}
        {activeStream === "post_events" && (
          <>
            {viewMode === "table" ? (
              filteredPostEvents.length === 0 ? (
                <div className="rounded-b-2xl flex-1 flex flex-col items-center justify-center min-h-[420px] w-full border-t border-border dark:border-border">
                  <Empty>
                    <EmptyHeader>
                      <EmptyMedia><EmptyClipboardIcon size="1em" /></EmptyMedia>
                      <EmptyTitle>
                        No Post-Event Reports Found
                      </EmptyTitle>
                      <EmptyDescription>
                        {hasActiveFilters
                          ? "No reports match your active search or filter criteria."
                          : "Student organizations will submit narrative and liquidation reports after their approved events conclude."}
                      </EmptyDescription>
                    </EmptyHeader>
                    {hasActiveFilters && (
                      <EmptyContent>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleClearFilters}
                          title="Reset Filters"
                          className="h-10 px-5 text-xs font-semibold rounded-xl border border-border dark:border-border bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 cursor-pointer active:scale-95 transition-all shadow-xs"
                        >
                    Reset Filters
                  </Button>
                      </EmptyContent>
                    )}
                  </Empty>
                </div>
              ) : (
                <div className="w-full flex-[1_0_auto] flex flex-col border-t border-border dark:border-border">
                  <div
                    ref={tableContainerRef}
                    className="w-full flex-[1_0_auto] overflow-x-auto show-scrollbar pb-2 select-none"
                  >
                  <table className="w-full text-left text-xs border-separate border-spacing-0 min-w-[1300px]">
                    <thead className="sticky top-0 z-10 border-b border-border bg-gray-50/90 dark:bg-zinc-900/90 backdrop-blur-xs select-none">
                      <tr className="text-left text-xs font-semibold text-gray-500 dark:text-zinc-400">
                        <th
                          aria-sort={tableSortBy !== "id" ? "none" : tableSortOrder === "ASC" ? "ascending" : "descending"}
                          className={cn(
                            "py-3.5 px-6 w-[140px] min-w-[140px] max-w-[140px] sticky left-0 z-20 bg-gray-50 dark:bg-zinc-900 transition-shadow whitespace-nowrap",
                            isScrolledX && "shadow-[4px_0_12px_-2px_rgba(0,0,0,0.06)] dark:shadow-[4px_0_12px_-2px_rgba(0,0,0,0.4)]"
                          )}
                        >
                          <div className="flex items-center justify-between gap-1">
                            <button type="button" onClick={() => handleTableSort("id")} className="group inline-flex items-center gap-1 text-left hover:text-gray-900 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-pup-maroon dark:hover:text-white dark:focus-visible:ring-red-400">
                              <span>Report ID</span>
                              <SortIndicator column="id" sortBy={tableSortBy} sortOrder={tableSortOrder} />
                            </button>
                            {isScrolledX && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button
                                    type="button"
                                    onClick={resetTableScroll}
                                    className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-white dark:bg-zinc-800 border border-border/80 text-pup-maroon dark:text-red-400 hover:bg-gray-100 dark:hover:bg-zinc-700 shadow-2xs cursor-pointer transition-all active:scale-95"
                                    aria-label="Reset scroll to start"
                                  >
                                    <ReloadIcon size="1em" className="text-xs" />
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent side="bottom">Reset Scroll to Start</TooltipContent>
                              </Tooltip>
                            )}
                          </div>
                        </th>
                        <SortableTableHeader column="event" label="Event Proposal & Organization" sortBy={tableSortBy} sortOrder={tableSortOrder} onSort={handleTableSort} className="py-3.5 px-6 w-[31%] whitespace-nowrap" />
                        <SortableTableHeader column="proponent" label="Proponent" sortBy={tableSortBy} sortOrder={tableSortOrder} onSort={handleTableSort} className="py-3.5 px-6 w-[19%] whitespace-nowrap" />
                        <SortableTableHeader column="attendance" label="Attendance & Spend" sortBy={tableSortBy} sortOrder={tableSortOrder} onSort={handleTableSort} className="py-3.5 px-6 w-[17%] whitespace-nowrap" />
                        <SortableTableHeader column="status" label="Clearance Status" sortBy={tableSortBy} sortOrder={tableSortOrder} onSort={handleTableSort} className="py-3.5 px-6 w-[13%] whitespace-nowrap" />
                        <SortableTableHeader column="submitted" label="Submitted" sortBy={tableSortBy} sortOrder={tableSortOrder} onSort={handleTableSort} className="py-3.5 px-6 w-[11%] whitespace-nowrap hidden sm:table-cell" />
                        <th className="py-3.5 px-6 pr-6 text-right w-20 whitespace-nowrap">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border dark:divide-border bg-white dark:bg-card">
                      {paginatedPostEvents.map((item) => {
                        const attendees = item.actual_attendance ?? item.total_attendance ?? item.actual_attendees ?? 0;
                        const expenses = Number(item.total_expenses ?? item.actual_expenses ?? 0);
                        return (
                          <tr
                            key={item.id}
                            onClick={() => selectPostEvent(item)}
                            className="hover:bg-gray-50/80 dark:hover:bg-zinc-800/40 transition-colors cursor-pointer group"
                          >
                            <td className={cn(
                              "py-3.5 px-6 whitespace-nowrap sticky left-0 z-10 bg-white dark:bg-card group-hover:bg-gray-50/80 dark:group-hover:bg-zinc-800/90 border-r border-border/70 dark:border-border/70 transition-shadow w-[140px] min-w-[140px] max-w-[140px]",
                              isScrolledX && "shadow-[4px_0_12px_-2px_rgba(0,0,0,0.06)] dark:shadow-[4px_0_12px_-2px_rgba(0,0,0,0.4)]"
                            )}>
                              <span className="font-sans tabular-nums text-xs font-medium text-gray-700 dark:text-zinc-300">
                                #{item.id}
                              </span>
                            </td>
                            <td className="py-3.5 px-6 overflow-hidden border-r border-border/70 dark:border-border/70">
                              <div className="font-semibold text-gray-900 dark:text-zinc-100 group-hover:text-pup-maroon dark:group-hover:text-red-400 transition-colors truncate" title={item.event_title}>
                                {item.event_title}
                              </div>
                              <div className="flex items-center gap-1.5 text-[11px] text-gray-900 dark:text-zinc-300 mt-0.5 min-w-0 overflow-hidden">
                                {item.org_acronym && (
                                  <span className="px-1.5 py-0.2 text-[10px] font-bold rounded bg-red-50 text-pup-maroon dark:bg-red-950/40 dark:text-red-400 border border-red-100 dark:border-red-900/30 shrink-0">
                                    {item.org_acronym}
                                  </span>
                                )}
                                <span className="truncate" title={item.organization_name}>{item.organization_name}</span>
                              </div>
                            </td>
                            <td className="py-3.5 px-6 whitespace-nowrap overflow-hidden border-r border-border/70 dark:border-border/70">
                              <div className="font-medium text-gray-800 dark:text-zinc-200 truncate" title={item.student_name}>
                                {item.student_name}
                              </div>
                              <div className="font-sans tabular-nums text-[11px] text-gray-400 dark:text-zinc-500 truncate" title={item.submitted_by_email || item.student_no}>
                                {item.submitted_by_email || item.student_no}
                              </div>
                            </td>
                            <td className="py-3.5 px-6 whitespace-nowrap border-r border-border/70 dark:border-border/70">
                              <div className="font-semibold text-gray-900 dark:text-zinc-100">
                                {attendees != null ? `${Number(attendees).toLocaleString()} attendees` : "N/A"}
                              </div>
                              <div className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium">
                                ₱{expenses.toLocaleString(undefined, { minimumFractionDigits: 2 })} liquidated
                              </div>
                            </td>
                            <td className="py-3.5 px-6 whitespace-nowrap border-r border-border/70 dark:border-border/70">
                              <span
                                className={cn(
                                  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold",
                                  getPostEventStatusBadgeClass(item.status)
                                )}
                              >
                                <span className={cn("w-1.5 h-1.5 rounded-full", getPostEventStatusDotClass(item.status))} />
                                {item.status}
                              </span>
                            </td>
                            <td className="py-3.5 px-6 whitespace-nowrap hidden sm:table-cell text-gray-900 dark:text-zinc-300 text-[11px] border-r border-border/70 dark:border-border/70">
                              {item.created_at
                                ? new Date(item.created_at).toLocaleDateString(undefined, {
                                    month: "short",
                                    day: "numeric",
                                    year: "numeric",
                                  })
                                : "N/A"}
                            </td>
                            <td className="py-3.5 px-6 pr-6 text-right whitespace-nowrap">
                              <div className="flex items-center justify-end" onClick={(e) => e.stopPropagation()}>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <button
                                      type="button"
                                      onClick={() => selectPostEvent(item)}
                                      aria-label="Review Clearance"
                                      className="w-7 h-7 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 text-gray-500 hover:text-pup-maroon dark:text-zinc-400 dark:hover:text-red-400 focus:outline-none cursor-pointer active:scale-95 flex items-center justify-center transition-colors border-0 bg-transparent"
                                    >
                                      <ClipboardIcon size="1em" className="text-[16px]" />
                                    </button>
                                  </TooltipTrigger>
                                  <TooltipContent>Review Clearance</TooltipContent>
                                </Tooltip>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )) : viewMode === "list" ? (
              filteredPostEvents.length === 0 ? (
              <div className="flex w-full flex-1 items-center justify-center border-t border-border dark:border-border">
                  <EmptyState
                    icon={hasActiveFilters ? Search01Icon : EmptyClipboardIcon}
                    title={hasActiveFilters ? "No Reports Found" : "No Post-Event Reports Yet"}
                    description={hasActiveFilters
                      ? "Adjust your search or reset your filters."
                      : "Post-event liquidation reports will appear here after submission."}
                  >
                    {hasActiveFilters && (
                      <Button type="button" variant="outline" onClick={handleClearFilters} className="h-10 rounded-xl px-5 text-xs font-semibold">
                        Reset Filters
                      </Button>
                    )}
                  </EmptyState>
                </div>
              ) : (
                <OsasRecordList items={paginatedPostEvents} stream="post_events" onSelect={selectPostEvent} onReview={selectPostEvent} />
              )
            ) : (
              /* KANBAN BOARD VIEW FOR POST-EVENTS */
              <div className="w-full flex flex-[1_0_auto] flex-col min-h-0 border-t border-border dark:border-border bg-white/50 dark:bg-card/50">
                {filteredPostEvents.length === 0 ? (
                  <div className="rounded-b-2xl flex-1 flex flex-col items-center justify-center min-h-[420px] w-full">
                    <Empty>
                      <EmptyHeader>
                        <EmptyMedia><EmptyClipboardIcon size="1em" /></EmptyMedia>
                        <EmptyTitle>
                          No Post-Event Reports Found
                        </EmptyTitle>
                        <EmptyDescription>
                          {hasActiveFilters
                            ? "No reports match your active search or filter criteria."
                            : "Student organizations will submit narrative and liquidation reports after their approved events conclude."}
                        </EmptyDescription>
                      </EmptyHeader>
                      {hasActiveFilters && (
                        <EmptyContent>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleClearFilters}
                            title="Reset Filters"
                            className="h-10 px-5 text-xs font-semibold rounded-xl border border-border dark:border-border bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 cursor-pointer active:scale-95 transition-all shadow-xs"
                          >
                    Reset Filters
                  </Button>
                        </EmptyContent>
                      )}
                    </Empty>
                  </div>
                ) : (
                  <OsasKanbanPipeline
                    stream="post_events"
                    columns={POST_EVENT_KANBAN_COLUMNS}
                    items={filteredPostEvents}
                    onSelectItem={selectPostEvent}
                    onDropItem={handlePostEventDrop}
                    onOpenPdfPreview={handleOpenPdfPreview}
                    draggingItem={draggingPostEvent}
                    setDraggingItem={setDraggingPostEvent}
                    dragOverColumn={dragOverPostEventColumn}
                    setDragOverColumn={setDragOverPostEventColumn}
                    allowedTransitions={POST_EVENT_ALLOWED_TRANSITIONS}
                    normalizeStatus={(s) => s || "Submitted"}
                    scrollRef={kanbanScrollRef}
                    onScrollBoundsChange={handleKanbanScrollBoundsChange}
                    isItemLocked={(item) => {
                      const s = item.status || "Submitted";
                      return s === "Cleared" || s === "Declined";
                    }}
                  />
                )}
              </div>
            )}
          </>
        )}

        {/* 5. Apple HIG Pagination Footer (Unified for both record views) */}
        {viewMode !== "kanban" && activeFilteredList.length > 0 && (
          <div className="flex items-center justify-between border-t border-[#e5e5ea] dark:border-[#3a3a3c] bg-white dark:bg-[#1c1c1e] p-4 px-6 rounded-b-2xl mt-auto select-none">
            <div className="flex items-center gap-6 text-xs text-gray-900 dark:text-zinc-300 select-none">
              <span>
                Showing {Math.min(itemsPerPage, activeFilteredList.length - (safePage - 1) * itemsPerPage)} of {activeFilteredList.length.toLocaleString()}
              </span>
              <div className="flex items-center gap-2">
                <span>{viewMode === "table" ? "Rows:" : "Items:"}</span>
                {[10, 20, 50, 100].map((size) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => {
                      setItemsPerPage(size);
                      setPage(1);
                    }}
                    className={cn(
                      "px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer border-0",
                      itemsPerPage === size
                        ? "bg-gray-100 dark:bg-zinc-800 text-gray-900 dark:text-zinc-100"
                        : "bg-transparent text-gray-400 hover:text-gray-600 dark:hover:text-zinc-200"
                    )}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2 select-none">
              <Button
                variant="ghost"
                size="sm"
                disabled={safePage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="text-xs text-gray-900 dark:text-zinc-300 disabled:opacity-40 cursor-pointer rounded-xl h-8 px-3"
              >
                Prev
              </Button>

              <div className="h-8 w-8 rounded-xl border border-[#e5e5ea] dark:border-border flex items-center justify-center text-xs font-bold text-gray-800 dark:text-zinc-200 bg-white dark:bg-zinc-900">
                {safePage}
              </div>

              <Button
                variant="ghost"
                size="sm"
                disabled={safePage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="text-xs text-gray-900 dark:text-zinc-300 disabled:opacity-40 cursor-pointer rounded-xl h-8 px-3"
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Slide-Over Review Sheet for Event Proposals */}
      <OsasProposalReviewSheet
        sheetOpen={sheetOpen}
        setSheetOpen={setSheetOpen}
        selected={selected}
        setSelected={setSelected}
        currentIndex={currentProposalIndex}
        totalCount={proposalNavigationList.length}
        onNavigatePrev={handlePrevProposal}
        onNavigateNext={handleNextProposal}
        status={status}
        setStatus={setStatus}
        note={note}
        setNote={setNote}
        save={save}
        isSaving={isSaving}
        availableStatusOptions={availableStatusOptions}
        isRevokingApproval={isRevokingApproval}
        isReopeningDeclined={isReopeningDeclined}
        isRequestingRevision={isRequestingRevision}
        isNoteRequired={isNoteRequired}
        isNoteValid={isNoteValid}
        handleOpenPdfPreview={handleOpenPdfPreview}
        setPdfPreviewData={setPdfPreviewData}
        setPdfPreviewOpen={setPdfPreviewOpen}
        setActiveStream={setActiveStream}
        setSearchQuery={setSearchQuery}
      />

      {/* Slide-Over Review Sheet for Post-Event Reports */}
      <OsasPostEventReviewSheet
        open={postEventSheetOpen}
        onOpenChange={setPostEventSheetOpen}
        selectedPostEvent={selectedPostEvent}
        currentIndex={currentPostEventIndex}
        totalCount={postEventNavigationList.length}
        onNavigatePrev={handlePrevPostEvent}
        onNavigateNext={handleNextPostEvent}
        postEventStatus={postEventStatus}
        setPostEventStatus={setPostEventStatus}
        postEventNote={postEventNote}
        setPostEventNote={setPostEventNote}
        savePostEvent={savePostEvent}
        isSavingPostEvent={isSavingPostEvent}
        availablePostEventStatusOptions={availablePostEventStatusOptions}
        isPostEventNoteRequired={isPostEventNoteRequired}
        isPostEventNoteValid={isPostEventNoteValid}
        handleOpenPdfPreview={handleOpenPdfPreview}
      />

      {/* PDF Document Preview Modal */}
      <PDFPreviewModal
        open={pdfPreviewOpen}
        onClose={() => {
          setPdfPreviewOpen(false);
          setPdfPreviewData(null);
        }}
        preview={pdfPreviewData}
      />
    </div>
  );
}
