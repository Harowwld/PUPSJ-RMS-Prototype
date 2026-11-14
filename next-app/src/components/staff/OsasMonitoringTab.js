"use client";
import { Table, TableHead } from "@/components/ui/table";
import TablePagination from "@/components/shared/TablePagination";

import useUrlPage from "@/hooks/useUrlPage";
import { PDF_ACTION_LABELS } from "@/lib/pdfPreview";
import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { cn } from "@/lib/utils";
import { BADGE_BASE, BADGE_PALETTES } from "@/lib/badgeStyles";
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
import ActiveFilterChips from "@/components/shared/ActiveFilterChips";
import TableScrollControls from "@/components/shared/TableScrollControls";
import DataViewToolbar from "@/components/shared/DataViewToolbar";
import ViewModeIcon from "@/components/shared/ViewModeIcon";
import { SegmentedControl } from "@/components/ui/tabs";
import {
  FilterPopover,
  SortPopover,
  GroupPopover,
  ColumnsPopover,
} from "@/components/systemadmin/OfficeTableControls";
import DashboardSearch from "@/components/systemadmin/DashboardSearch";
import OsasRecordList from "@/components/staff/osas/OsasRecordList";
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

function SortableTableHeader({ column, label, sortBy, sortOrder, onSort, className = "", tableColumn }) {
  const ariaSort = sortBy !== column ? "none" : sortOrder === "ASC" ? "ascending" : "descending";

  return (
    <TableHead {...tableColumn} className={className} aria-sort={ariaSort}>
      <button
        type="button"
        onClick={() => onSort(column)}
        className="group inline-flex items-center gap-1 text-left hover:text-gray-900 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-pup-maroon dark:hover:text-white dark:focus-visible:ring-red-400"
      >
        <span>{label}</span>
        <SortIndicator column={column} sortBy={sortBy} sortOrder={sortOrder} />
      </button>
    </TableHead>
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
    return BADGE_PALETTES.emerald;
  }
  if (s === "under review" || s === "inprogress" || s === "processing") {
    return BADGE_PALETTES.blue;
  }
  if (s === "needs revision" || s === "revision") {
    return BADGE_PALETTES.orange;
  }
  if (s === "declined" || s === "cancelled" || s === "rejected") {
    return BADGE_PALETTES.rose;
  }
  if (s === "submitted" || s === "pending") {
    return BADGE_PALETTES.amber;
  }
  return BADGE_PALETTES.gray;
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
  if (s === "cleared" || s === "completed" || s === "approved") {
    return BADGE_PALETTES.emerald;
  }
  if (s === "under review" || s === "underreview" || s === "processing") {
    return BADGE_PALETTES.blue;
  }
  if (s === "needs revision" || s === "revision") {
    return BADGE_PALETTES.orange;
  }
  if (s === "declined" || s === "rejected") {
    return BADGE_PALETTES.rose;
  }
  return BADGE_PALETTES.gray;
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
            {PDF_ACTION_LABELS.preview}
          </Button>
        </div>
      </div>
      <PDFPreviewModal open={previewOpen} onClose={() => setPreviewOpen(false)} preview={{ url: previewUrl, title: title || "Official submission PDF", subtitle: "Review the complete submitted document." }} />
    </>
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
  const [viewMode, setViewMode] = useState(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("pup_osas_view_mode_v2");
        if (saved === "list" || saved === "table" || saved === "kanban") return saved;
        const legacySaved = localStorage.getItem("pup_osas_view_mode");
        if (legacySaved === "list" || legacySaved === "kanban") {
          const migratedMode = legacySaved === "list" ? "table" : "kanban";
          localStorage.setItem("pup_osas_view_mode_v2", migratedMode);
          return migratedMode;
        }
      } catch {}
    }
    return "table";
  });
  const [status, setStatus] = useState("Submitted");
  const [note, setNote] = useState("");
  const [filterRules, setFilterRules] = useState([]);
  const [statusFilters, setStatusFilters] = useState([]);
  const [orgFilters, setOrgFilters] = useState([]);
  const [groupBy, setGroupBy] = useState("status");
  const [visibleColumns, setVisibleColumns] = useState([
    "id",
    "event",
    "proponent",
    "status",
    "actions",
  ]);
  const [searchQuery, setSearchQuery] = useState("");
  const [tableSortBy, setTableSortBy] = useState("");
  const [tableSortOrder, setTableSortOrder] = useState("ASC");
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [page, setPage] = useUrlPage();
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [draggingProposal, setDraggingProposal] = useState(null);
  const [dragOverColumn, setDragOverColumn] = useState(null);
  const isDraggingRef = useRef(false);

  const handleStreamChange = useCallback((stream) => {
    setActiveStream(stream);
    setFilterRules([]);
    setStatusFilters([]);
    setOrgFilters([]);
    setSearchQuery("");
    setPage(1);
  }, [setPage]);

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

  const handleViewModeChange = (mode) => {
    setViewMode(mode);
    setPage(1);
    try {
      localStorage.setItem("pup_osas_view_mode_v2", mode);
    } catch {}
  };

  const load = useCallback(async (isManual = false) => {
    try {
      if (isManual) {
        setIsRefreshing(true);
      } else {
        setLoading(true);
      }
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
      setIsRefreshing(false);
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

  const proposalTableColumns = useMemo(() => [
    { key: "id", label: "Proposal ID" },
    { key: "event", label: "Event & Organization" },
    { key: "proponent", label: "Proponent" },
    { key: "status", label: "Status" },
    { key: "submitted", label: "Date Submitted", defaultHidden: true },
    { key: "actions", label: "Actions" },
  ], []);

  const postEventTableColumns = useMemo(() => [
    { key: "id", label: "Report ID" },
    { key: "event", label: "Event & Organization" },
    { key: "proponent", label: "Proponent" },
    { key: "attendance", label: "Attendance & Spend", defaultHidden: true },
    { key: "status", label: "Clearance Status" },
    { key: "submitted", label: "Date Submitted", defaultHidden: true },
    { key: "actions", label: "Actions" },
  ], []);

  const currentTableColumns = useMemo(() => {
    return activeStream === "proposals" ? proposalTableColumns : postEventTableColumns;
  }, [activeStream, proposalTableColumns, postEventTableColumns]);

  const proposalTableColumnsConfig = useMemo(() => {
    const cols = [];
    if (visibleColumns.includes("id")) cols.push("identifier");
    if (visibleColumns.includes("event")) cols.push({ kind: "text", maxWidth: 340 });
    if (visibleColumns.includes("proponent")) cols.push("text");
    if (visibleColumns.includes("status")) cols.push("status");
    if (visibleColumns.includes("submitted")) cols.push("date");
    if (visibleColumns.includes("actions")) cols.push("actions");
    return cols;
  }, [visibleColumns]);

  const postEventTableColumnsConfig = useMemo(() => {
    const cols = [];
    if (visibleColumns.includes("id")) cols.push("identifier");
    if (visibleColumns.includes("event")) cols.push({ kind: "text", maxWidth: 340 });
    if (visibleColumns.includes("proponent")) cols.push("text");
    if (visibleColumns.includes("attendance")) cols.push("number");
    if (visibleColumns.includes("status")) cols.push("status");
    if (visibleColumns.includes("submitted")) cols.push("date");
    if (visibleColumns.includes("actions")) cols.push("actions");
    return cols;
  }, [visibleColumns]);

  const proposalFilterFields = useMemo(() => {
    const orgs = Array.from(new Set(rows.map((r) => r.verified_org_name || r.organization_name).filter(Boolean))).sort();
    return [
      {
        key: "status",
        label: "Review Status",
        options: [
          { value: "Submitted", label: "Submitted" },
          { value: "Under Review", label: "Under Review" },
          { value: "Needs Revision", label: "Needs Revision" },
          { value: "Approved", label: "Approved" },
          { value: "Declined", label: "Declined" },
        ],
      },
      {
        key: "organization",
        label: "Organization",
        options: orgs.map((org) => ({ value: org, label: org })),
      },
      {
        key: "has_bylaws",
        label: "Constitution & By-Laws",
        options: [
          { value: "Active", label: "CBL Active" },
          { value: "No CBL", label: "No CBL" },
        ],
      },
    ];
  }, [rows]);

  const postEventFilterFields = useMemo(() => {
    const orgs = Array.from(new Set(postEventReports.map((r) => r.organization_name).filter(Boolean))).sort();
    return [
      {
        key: "status",
        label: "Clearance Status",
        options: [
          { value: "Submitted", label: "Submitted" },
          { value: "Under Review", label: "Under Review" },
          { value: "Needs Revision", label: "Needs Revision" },
          { value: "Cleared", label: "Cleared" },
          { value: "Declined", label: "Declined" },
        ],
      },
      {
        key: "organization",
        label: "Organization",
        options: orgs.map((org) => ({ value: org, label: org })),
      },
    ];
  }, [postEventReports]);

  const currentFilterFields = useMemo(() => {
    return activeStream === "proposals" ? proposalFilterFields : postEventFilterFields;
  }, [activeStream, proposalFilterFields, postEventFilterFields]);

  const proposalSortOptions = useMemo(() => [
    { key: "id", label: "Proposal ID" },
    { key: "event", label: "Event Title" },
    { key: "proponent", label: "Proponent" },
    { key: "status", label: "Review Status" },
    { key: "submitted", label: "Date Submitted" },
  ], []);

  const postEventSortOptions = useMemo(() => [
    { key: "id", label: "Report ID" },
    { key: "event", label: "Event Title" },
    { key: "proponent", label: "Proponent" },
    { key: "attendance", label: "Attendance & Spend" },
    { key: "status", label: "Clearance Status" },
    { key: "submitted", label: "Date Submitted" },
  ], []);

  const currentSortOptions = useMemo(() => {
    return activeStream === "proposals" ? proposalSortOptions : postEventSortOptions;
  }, [activeStream, proposalSortOptions, postEventSortOptions]);

  const groupOptions = useMemo(() => [
    { key: "status", label: "Group by Status" },
    { key: "organization", label: "Group by Organization" },
    { key: "none", label: "No Grouping" },
  ], []);

  const handleClearFilters = useCallback(() => {
    setSearchQuery("");
    setFilterRules([]);
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
    filterRules.forEach((rule) => {
      const field = currentFilterFields.find((f) => f.key === rule.fieldKey);
      const fieldLabel = field?.label || rule.fieldKey;
      const optionLabel = field?.options?.find((o) => String(o.value) === String(rule.value))?.label || rule.value;
      chips.push({
        id: rule.id,
        label: `${fieldLabel} ${rule.operator === "is_not" ? "is not" : "is"} ${optionLabel}`,
        onRemove: () => {
          setFilterRules((prev) => prev.filter((r) => r.id !== rule.id));
          setPage(1);
        },
      });
    });
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
  }, [searchQuery, filterRules, currentFilterFields, statusFilters, orgFilters, setPage]);

  const hasActiveFilters = Boolean(
    searchQuery.trim() || filterRules.length > 0 || statusFilters.length > 0 || orgFilters.length > 0
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
      if (orgFilters.length > 0 && !orgFilters.includes(item.verified_org_name || item.organization_name)) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchTitle = (item.title || "").toLowerCase().includes(q);
        const matchOrg = (item.organization_name || "").toLowerCase().includes(q) || (item.verified_org_name || "").toLowerCase().includes(q);
        const matchStudent =
          (item.student_name || "").toLowerCase().includes(q) ||
          (item.student_no || "").toLowerCase().includes(q);
        if (!matchTitle && !matchOrg && !matchStudent) return false;
      }
      if (filterRules.length > 0) {
        const matchesRules = filterRules.every((rule) => {
          let actual = "";
          if (rule.fieldKey === "status") {
            actual = normalizeProposalStatus(item.status);
          } else if (rule.fieldKey === "organization") {
            actual = item.verified_org_name || item.organization_name || "";
          } else if (rule.fieldKey === "has_bylaws") {
            actual = item.has_bylaws ? "Active" : "No CBL";
          } else {
            actual = item[rule.fieldKey] || "";
          }
          const ruleVal = String(rule.value || "").toLowerCase();
          const actVal = String(actual || "").toLowerCase();
          return rule.operator === "is_not" ? actVal !== ruleVal : actVal === ruleVal;
        });
        if (!matchesRules) return false;
      }
      return true;
    });
  }, [rows, statusFilters, orgFilters, searchQuery, filterRules]);

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
          (item.student_no || "").toLowerCase().includes(q) ||
          (item.submitted_by_email || "").toLowerCase().includes(q);
        if (!matchTitle && !matchOrg && !matchStudent) return false;
      }
      if (filterRules.length > 0) {
        const matchesRules = filterRules.every((rule) => {
          let actual = "";
          if (rule.fieldKey === "status") {
            actual = item.status || "Submitted";
          } else if (rule.fieldKey === "organization") {
            actual = item.organization_name || "";
          } else {
            actual = item[rule.fieldKey] || "";
          }
          const ruleVal = String(rule.value || "").toLowerCase();
          const actVal = String(actual || "").toLowerCase();
          return rule.operator === "is_not" ? actVal !== ruleVal : actVal === ruleVal;
        });
        if (!matchesRules) return false;
      }
      return true;
    });
  }, [postEventReports, statusFilters, orgFilters, searchQuery, filterRules]);

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

  if (loading && rows.length === 0 && postEventReports.length === 0) {
    return <OsasMonitoringSkeleton />;
  }

  return (
    <div className="font-jakarta w-full flex flex-[1_0_auto] flex-col h-auto gap-6 focus:outline-none animate-fade-up select-none">
      {/* ONE Single Card Container encapsulating Header, Toolbar, Active Filters, Table & Kanban */}
      <Card className="flex flex-[1_0_auto] h-auto w-full flex-col p-0 gap-0 overflow-hidden rounded-2xl border border-border bg-white shadow-sm dark:border-border dark:bg-card dark:shadow-none isolate font-jakarta">
        {/* 1. Page Header */}
        <PageHeader
          icon="CalendarCheckIn01Icon"
          title={
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span>OSAS Monitoring</span>
              <span className="text-[11px] font-normal tracking-normal text-gray-500 dark:text-zinc-400 tabular-nums">
                {activeFilteredList.length.toLocaleString()} {activeStream === "proposals" ? "proposals" : "reports"}
              </span>
            </div>
          }
          description="Review student organization event proposals and post-event liquidation reports."
          showBorder={false}
          className="p-6"
          titleClassName="text-[18px] font-semibold tracking-[-0.01em] text-gray-900 dark:text-zinc-50"
          descriptionClassName="text-[13px] font-normal text-gray-900 dark:text-zinc-300 mt-[4px]"
          actions={
            <div className="flex items-center gap-2">
              <RefreshButton
                onRefresh={() => load(true)}
                isLoading={isRefreshing}
                title="Refresh OSAS Queue"
                className="h-9 w-9"
              />
            </div>
          }
        />

        {/* 2. Connected Segmented Tabs Row (Stream Scope & View Mode Switcher) */}
        <div
          role="group"
          aria-label="OSAS submissions stream and view mode"
          className="flex items-center justify-between px-6 py-2.5 border-t border-border dark:border-white/10 bg-white dark:bg-card overflow-x-auto scrollbar-none gap-4"
        >
          {/* Left: Stream Scope Tabs */}
          <SegmentedControl
            value={activeStream}
            onValueChange={handleStreamChange}
            variant="capsule"
            className="inline-grid grid-flow-col auto-cols-fr shrink-0"
            items={[
              {
                value: "proposals",
                label: "Pre-Event Proposals",
                icon: <CalendarCheckIn01Icon size="1em" className="text-sm" />,
                badge: rows.length,
              },
              {
                value: "post_events",
                label: "Post-Event & Liquidation",
                icon: <ClipboardIcon size="1em" className="text-sm" />,
                badge: postEventReports.length,
              },
            ]}
          />

          {/* Right: View Mode Switcher */}
          <div className="ml-auto shrink-0">
            <SegmentedControl
              value={viewMode}
              onValueChange={handleViewModeChange}
              variant="capsule"
              className="inline-grid grid-flow-col auto-cols-fr shrink-0"
              items={[
                {
                  value: "kanban",
                  label: "Kanban",
                  icon: <ViewModeIcon mode="kanban" className="text-sm" />,
                },
                {
                  value: "list",
                  label: "List",
                  icon: <ViewModeIcon mode="list" className="text-sm" />,
                },
                {
                  value: "table",
                  label: "Table",
                  icon: <ViewModeIcon mode="table" className="text-sm" />,
                },
              ]}
            />
          </div>
        </div>

        {/* 3. DataViewToolbar */}
        <DataViewToolbar
          label="OSAS submissions search, filters, sorting, grouping, and columns"
          className="border-t border-border dark:border-border p-4 sm:px-5 sm:py-3 gap-2 bg-white dark:bg-card flex flex-wrap items-center justify-between"
        >
          {/* Left Group */}
          <div className="flex min-w-0 items-center gap-2">
            <DashboardSearch
              value={searchQuery}
              onChange={(val) => {
                setSearchQuery(val);
                setPage(1);
              }}
              count={activeFilteredList.length}
              loading={loading && rows.length === 0 && postEventReports.length === 0}
              label="Search submissions"
              placeholder={
                activeStream === "proposals"
                  ? "Search proposals, students, orgs..."
                  : "Search event reports, orgs..."
              }
            />
            {viewMode === "table" && (
              <TableScrollControls
                scrollContainerRef={tableContainerRef}
                isScrolledX={isScrolledX}
                onResetScroll={resetTableScroll}
                onScrollLeft={(amount) => scrollActiveView("left", amount)}
                onScrollRight={(amount) => scrollActiveView("right", amount)}
                controlSize="md"
              />
            )}
          </div>

          {/* Right Group: Reused UI components */}
          <div className="ml-auto flex shrink-0 items-center gap-2">
            <FilterPopover
              fields={currentFilterFields}
              filters={filterRules}
              onFiltersChange={(newRules) => {
                setFilterRules(newRules);
                setPage(1);
              }}
              entityLabel={activeStream === "proposals" ? "proposals" : "reports"}
            />
            <SortPopover
              options={currentSortOptions}
              sortBy={tableSortBy}
              onSortByChange={(val) => {
                setTableSortBy(val);
                setTableSortOrder("ASC");
              }}
              sortOrder={tableSortOrder}
              onSortOrderChange={setTableSortOrder}
            />
            <GroupPopover
              options={groupOptions}
              groupBy={groupBy}
              onGroupByChange={setGroupBy}
            />
            {viewMode === "table" && (
              <ColumnsPopover
                columns={currentTableColumns}
                visibleColumns={visibleColumns}
                onVisibleColumnsChange={setVisibleColumns}
                minVisible={2}
              />
            )}
          </div>
        </DataViewToolbar>

        {/* 4. Active Filter Chips */}
        {activeChips.length > 0 && (
          <div className="border-t border-border dark:border-border px-6 py-2.5 flex items-center justify-between gap-4 bg-white dark:bg-card">
            <div className="flex-1 min-w-0">
              <ActiveFilterChips
                chips={activeChips}
                onClearAll={handleClearFilters}
                className="p-0 border-0"
              />
            </div>
          </div>
        )}

        {/* 5. Main Content Area */}
        <div className={cn("w-full flex flex-col flex-[1_0_auto] border-t border-border dark:border-border", activeFilteredList.length === 0 && "rounded-b-2xl overflow-hidden")}>
          {/* STREAM 1: Pre-Event Proposals */}
          {activeStream === "proposals" && (
            <>
              {viewMode === "table" ? (
                filteredRows.length === 0 ? (
                  <div className="rounded-b-2xl flex-1 flex flex-col items-center justify-center min-h-[420px] w-full">
                    <Empty>
                      <EmptyHeader>
                        <EmptyMedia><EmptyCalendarCheckIn01Icon size="1em" /></EmptyMedia>
                        <EmptyTitle>No Event Proposals Found</EmptyTitle>
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
                            className="h-9 px-4 text-xs font-semibold rounded-xl"
                          >
                            Reset Filters
                          </Button>
                        </EmptyContent>
                      )}
                    </Empty>
                  </div>
                ) : (
                  <div className="w-full flex-[1_0_auto] flex flex-col">
                    <div
                      ref={tableContainerRef}
                      className="w-full flex-[1_0_auto] overflow-x-auto show-scrollbar pb-2 select-none"
                    >
                      <Table columns={proposalTableColumnsConfig} className="min-w-[1100px]">
                        <thead className="sticky top-0 z-10 border-b border-border bg-gray-50/90 dark:bg-zinc-900/90 backdrop-blur-xs select-none">
                          <tr className="text-left text-xs font-semibold text-gray-500 dark:text-zinc-400">
                            {visibleColumns.includes("id") && (
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
                            )}
                            {visibleColumns.includes("event") && (
                              <SortableTableHeader column="event" label="Event Proposal & Organization" sortBy={tableSortBy} sortOrder={tableSortOrder} onSort={handleTableSort} className="py-3.5 px-6 w-[36%] whitespace-nowrap" />
                            )}
                            {visibleColumns.includes("proponent") && (
                              <SortableTableHeader column="proponent" label="Proponent" sortBy={tableSortBy} sortOrder={tableSortOrder} onSort={handleTableSort} className="py-3.5 px-6 w-[21%] whitespace-nowrap" />
                            )}
                            {visibleColumns.includes("status") && (
                              <SortableTableHeader column="status" label="Status" sortBy={tableSortBy} sortOrder={tableSortOrder} onSort={handleTableSort} className="py-3.5 px-6 w-[16%] whitespace-nowrap" />
                            )}
                            {visibleColumns.includes("submitted") && (
                              <SortableTableHeader column="submitted" label="Submitted" sortBy={tableSortBy} sortOrder={tableSortOrder} onSort={handleTableSort} className="py-3.5 px-6 w-[16%] whitespace-nowrap hidden sm:table-cell" />
                            )}
                            {visibleColumns.includes("actions") && (
                              <th className="py-3.5 px-6 pr-6 text-right w-20 whitespace-nowrap">Actions</th>
                            )}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border dark:divide-border bg-white dark:bg-card">
                          {paginatedRows.map((item) => (
                            <tr
                              key={item.id}
                              onClick={() => select(item)}
                              className="hover:bg-gray-50/80 dark:hover:bg-zinc-800/40 transition-colors cursor-pointer group"
                            >
                              {visibleColumns.includes("id") && (
                                <td className={cn(
                                  "py-3.5 px-6 whitespace-nowrap sticky left-0 z-10 bg-white dark:bg-card group-hover:bg-gray-50/80 dark:group-hover:bg-zinc-800/90 border-r border-border/70 dark:border-border/70 transition-shadow w-[140px] min-w-[140px] max-w-[140px]",
                                  isScrolledX && "shadow-[4px_0_12px_-2px_rgba(0,0,0,0.06)] dark:shadow-[4px_0_12px_-2px_rgba(0,0,0,0.4)]"
                                )}>
                                  <span className="font-sans tabular-nums text-xs font-medium text-gray-700 dark:text-zinc-300">
                                    #{item.id}
                                  </span>
                                </td>
                              )}
                              {visibleColumns.includes("event") && (
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
                              )}
                              {visibleColumns.includes("proponent") && (
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
                              )}
                              {visibleColumns.includes("status") && (
                                <td className="py-3.5 px-6 whitespace-nowrap border-r border-border/70 dark:border-border/70">
                                  <span
                                    className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold select-none", getProposalStatusBadgeClass(item.status), BADGE_BASE)}
                                  >
                                    {item.status}
                                  </span>
                                </td>
                              )}
                              {visibleColumns.includes("submitted") && (
                                <td className="py-3.5 px-6 whitespace-nowrap hidden sm:table-cell text-gray-900 dark:text-zinc-300 text-[11px] border-r border-border/70 dark:border-border/70">
                                  {item.created_at
                                    ? new Date(item.created_at).toLocaleDateString(undefined, {
                                        month: "short",
                                        day: "numeric",
                                        year: "numeric",
                                      })
                                    : "N/A"}
                                </td>
                              )}
                              {visibleColumns.includes("actions") && (
                                <td className="py-3.5 px-6 pr-6 text-right whitespace-nowrap">
                                  <div className="flex items-center justify-end" onClick={(e) => e.stopPropagation()}>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <button
                                          type="button"
                                          onClick={() => select(item)}
                                          aria-label="Review Proposal"
                                          className="table-action-button rounded-lg text-gray-500 hover:text-pup-maroon dark:text-zinc-400 dark:hover:text-red-400 active:scale-95 cursor-pointer"
                                        >
                                          <ClipboardIcon size="1em" className="text-[16px]" />
                                        </button>
                                      </TooltipTrigger>
                                      <TooltipContent>Review Proposal</TooltipContent>
                                    </Tooltip>
                                  </div>
                                </td>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </Table>
                    </div>
                  </div>
                )
              ) : viewMode === "list" ? (
                filteredRows.length === 0 ? (
                  <div className="flex w-full flex-1 items-center justify-center min-h-[420px]">
                    <EmptyState
                      icon={hasActiveFilters ? Search01Icon : EmptyCalendarCheckIn01Icon}
                      title={hasActiveFilters ? "No Proposals Found" : "No Event Proposals Yet"}
                      description={
                        hasActiveFilters
                          ? "Adjust your search or reset your filters."
                          : "Student organization event proposals will appear here after submission."
                      }
                    >
                      {hasActiveFilters && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleClearFilters}
                          className="h-9 rounded-xl px-4 text-xs font-semibold"
                        >
                          Reset Filters
                        </Button>
                      )}
                    </EmptyState>
                  </div>
                ) : (
                  <OsasRecordList
                    items={paginatedRows}
                    stream="proposals"
                    groupBy={groupBy}
                    onSelect={select}
                    onReview={select}
                  />
                )
              ) : filteredRows.length === 0 ? (
                <div className="w-full flex-1 flex flex-col items-center justify-center bg-gray-50/20 dark:bg-zinc-900/10 min-h-[420px]">
                  <Empty>
                    <EmptyHeader>
                      <EmptyMedia><ViewModeIcon mode="kanban" /></EmptyMedia>
                      <EmptyTitle>No Proposals in Pipeline</EmptyTitle>
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
                          className="h-9 px-4 text-xs font-semibold rounded-xl"
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
                  <div className="rounded-b-2xl flex-1 flex flex-col items-center justify-center min-h-[420px] w-full">
                    <Empty>
                      <EmptyHeader>
                        <EmptyMedia><EmptyClipboardIcon size="1em" /></EmptyMedia>
                        <EmptyTitle>No Post-Event Reports Found</EmptyTitle>
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
                            className="h-9 px-4 text-xs font-semibold rounded-xl"
                          >
                            Reset Filters
                          </Button>
                        </EmptyContent>
                      )}
                    </Empty>
                  </div>
                ) : (
                  <div className="w-full flex-[1_0_auto] flex flex-col">
                    <div
                      ref={tableContainerRef}
                      className="w-full flex-[1_0_auto] overflow-x-auto show-scrollbar pb-2 select-none"
                    >
                      <Table columns={postEventTableColumnsConfig} className="min-w-[1100px]">
                        <thead className="sticky top-0 z-10 border-b border-border bg-gray-50/90 dark:bg-zinc-900/90 backdrop-blur-xs select-none">
                          <tr className="text-left text-xs font-semibold text-gray-500 dark:text-zinc-400">
                            {visibleColumns.includes("id") && (
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
                            )}
                            {visibleColumns.includes("event") && (
                              <SortableTableHeader column="event" label="Event Proposal & Organization" sortBy={tableSortBy} sortOrder={tableSortOrder} onSort={handleTableSort} className="py-3.5 px-6 w-[31%] whitespace-nowrap" />
                            )}
                            {visibleColumns.includes("proponent") && (
                              <SortableTableHeader column="proponent" label="Proponent" sortBy={tableSortBy} sortOrder={tableSortOrder} onSort={handleTableSort} className="py-3.5 px-6 w-[19%] whitespace-nowrap" />
                            )}
                            {visibleColumns.includes("attendance") && (
                              <SortableTableHeader column="attendance" label="Attendance & Spend" sortBy={tableSortBy} sortOrder={tableSortOrder} onSort={handleTableSort} className="py-3.5 px-6 w-[17%] whitespace-nowrap" />
                            )}
                            {visibleColumns.includes("status") && (
                              <SortableTableHeader column="status" label="Clearance Status" sortBy={tableSortBy} sortOrder={tableSortOrder} onSort={handleTableSort} className="py-3.5 px-6 w-[13%] whitespace-nowrap" />
                            )}
                            {visibleColumns.includes("submitted") && (
                              <SortableTableHeader column="submitted" label="Submitted" sortBy={tableSortBy} sortOrder={tableSortOrder} onSort={handleTableSort} className="py-3.5 px-6 w-[11%] whitespace-nowrap hidden sm:table-cell" />
                            )}
                            {visibleColumns.includes("actions") && (
                              <th className="py-3.5 px-6 pr-6 text-right w-20 whitespace-nowrap">Actions</th>
                            )}
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
                                {visibleColumns.includes("id") && (
                                  <td className={cn(
                                    "py-3.5 px-6 whitespace-nowrap sticky left-0 z-10 bg-white dark:bg-card group-hover:bg-gray-50/80 dark:group-hover:bg-zinc-800/90 border-r border-border/70 dark:border-border/70 transition-shadow w-[140px] min-w-[140px] max-w-[140px]",
                                    isScrolledX && "shadow-[4px_0_12px_-2px_rgba(0,0,0,0.06)] dark:shadow-[4px_0_12px_-2px_rgba(0,0,0,0.4)]"
                                  )}>
                                    <span className="font-sans tabular-nums text-xs font-medium text-gray-700 dark:text-zinc-300">
                                      #{item.id}
                                    </span>
                                  </td>
                                )}
                                {visibleColumns.includes("event") && (
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
                                )}
                                {visibleColumns.includes("proponent") && (
                                  <td className="py-3.5 px-6 whitespace-nowrap overflow-hidden border-r border-border/70 dark:border-border/70">
                                    <div className="font-medium text-gray-800 dark:text-zinc-200 truncate" title={item.student_name}>
                                      {item.student_name}
                                    </div>
                                    <div className="font-sans tabular-nums text-[11px] text-gray-400 dark:text-zinc-500 truncate" title={item.submitted_by_email || item.student_no}>
                                      {item.submitted_by_email || item.student_no}
                                    </div>
                                  </td>
                                )}
                                {visibleColumns.includes("attendance") && (
                                  <td className="py-3.5 px-6 whitespace-nowrap border-r border-border/70 dark:border-border/70">
                                    <div className="font-semibold text-gray-900 dark:text-zinc-100">
                                      {attendees != null ? `${Number(attendees).toLocaleString()} attendees` : "N/A"}
                                    </div>
                                    <div className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium">
                                      ₱{expenses.toLocaleString(undefined, { minimumFractionDigits: 2 })} liquidated
                                    </div>
                                  </td>
                                )}
                                {visibleColumns.includes("status") && (
                                  <td className="py-3.5 px-6 whitespace-nowrap border-r border-border/70 dark:border-border/70">
                                    <span
                                      className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold select-none", getPostEventStatusBadgeClass(item.status), BADGE_BASE)}
                                    >
                                      {item.status}
                                    </span>
                                  </td>
                                )}
                                {visibleColumns.includes("submitted") && (
                                  <td className="py-3.5 px-6 whitespace-nowrap hidden sm:table-cell text-gray-900 dark:text-zinc-300 text-[11px] border-r border-border/70 dark:border-border/70">
                                    {item.created_at
                                      ? new Date(item.created_at).toLocaleDateString(undefined, {
                                          month: "short",
                                          day: "numeric",
                                          year: "numeric",
                                        })
                                      : "N/A"}
                                  </td>
                                )}
                                {visibleColumns.includes("actions") && (
                                  <td className="py-3.5 px-6 pr-6 text-right whitespace-nowrap">
                                    <div className="flex items-center justify-end" onClick={(e) => e.stopPropagation()}>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <button
                                            type="button"
                                            onClick={() => selectPostEvent(item)}
                                            aria-label="Review Clearance"
                                            className="table-action-button rounded-lg text-gray-500 hover:text-pup-maroon dark:text-zinc-400 dark:hover:text-red-400 active:scale-95 cursor-pointer"
                                          >
                                            <ClipboardIcon size="1em" className="text-[16px]" />
                                          </button>
                                        </TooltipTrigger>
                                        <TooltipContent>Review Clearance</TooltipContent>
                                      </Tooltip>
                                    </div>
                                  </td>
                                )}
                              </tr>
                            );
                          })}
                        </tbody>
                      </Table>
                    </div>
                  </div>
                )
              ) : viewMode === "list" ? (
                filteredPostEvents.length === 0 ? (
                  <div className="flex w-full flex-1 items-center justify-center min-h-[420px]">
                    <EmptyState
                      icon={hasActiveFilters ? Search01Icon : EmptyClipboardIcon}
                      title={hasActiveFilters ? "No Reports Found" : "No Post-Event Reports Yet"}
                      description={
                        hasActiveFilters
                          ? "Adjust your search or reset your filters."
                          : "Post-event liquidation reports will appear here after submission."
                      }
                    >
                      {hasActiveFilters && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleClearFilters}
                          className="h-9 rounded-xl px-4 text-xs font-semibold"
                        >
                          Reset Filters
                        </Button>
                      )}
                    </EmptyState>
                  </div>
                ) : (
                  <OsasRecordList
                    items={paginatedPostEvents}
                    stream="post_events"
                    groupBy={groupBy}
                    onSelect={selectPostEvent}
                    onReview={selectPostEvent}
                  />
                )
              ) : (
                /* KANBAN BOARD VIEW FOR POST-EVENTS */
                <div className="w-full flex flex-[1_0_auto] flex-col min-h-0 bg-white/50 dark:bg-card/50">
                  {filteredPostEvents.length === 0 ? (
                    <div className="rounded-b-2xl flex-1 flex flex-col items-center justify-center min-h-[420px] w-full">
                      <Empty>
                        <EmptyHeader>
                          <EmptyMedia><EmptyClipboardIcon size="1em" /></EmptyMedia>
                          <EmptyTitle>No Post-Event Reports Found</EmptyTitle>
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
                              className="h-9 px-4 text-xs font-semibold rounded-xl"
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
        </div>

        {/* 6. Apple HIG Pagination Footer (Unified for both record views) */}
        {viewMode !== "kanban" && activeFilteredList.length > 0 && (
          <TablePagination
            label="OSAS monitoring pages"
            page={page}
            pageSize={itemsPerPage}
            totalCount={activeFilteredList.length}
            displayedCount={Math.max(0, Math.min(itemsPerPage, activeFilteredList.length - (safePage - 1) * itemsPerPage))}
            onPageChange={setPage}
            onPageSizeChange={setItemsPerPage}
          />
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
