"use client";
import HugeIcon from "@/components/shared/HugeIcon";
import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import PageHeader from "@/components/shared/PageHeader";
import { RefreshButton } from "@/components/shared/RefreshButton";
import OsasMonitoringSkeleton from "@/components/staff/skeletons/OsasMonitoringSkeleton";
import PDFPreviewModal from "@/components/shared/PDFPreviewModal";
import MultiCriteriaFilter from "@/components/shared/MultiCriteriaFilter";
import ActiveFilterChips from "@/components/shared/ActiveFilterChips";
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
} from "@/components/ui/empty";

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
  { key: "Submitted", label: "Submitted", icon: "ph-paper-plane-tilt" },
  { key: "Under Review", label: "Under Review", icon: "ph-magnifying-glass" },
  { key: "Needs Revision", label: "Needs Revision", icon: "ph-arrows-counter-clockwise" },
  { key: "Approved", label: "Approved", icon: "ph-check-circle" },
  { key: "Declined", label: "Declined", icon: "ph-x-circle" },
];

export const POST_EVENT_KANBAN_COLUMNS = [
  { key: "Submitted", label: "Submitted", icon: "ph-paper-plane-tilt" },
  { key: "Under Review", label: "Under Review", icon: "ph-magnifying-glass" },
  { key: "Needs Revision", label: "Needs Revision", icon: "ph-arrows-counter-clockwise" },
  { key: "Cleared", label: "Cleared", icon: "ph-seal-check" },
  { key: "Declined", label: "Declined", icon: "ph-x-circle" },
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

function FirstPagePreview({ proposalId, fileUrl, title, onOpenPreview, subtext = "Page 1 of official submission" }) {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const previewUrl = fileUrl || (proposalId ? `/api/osas/event-proposals/${proposalId}?file=1` : null);

  useEffect(() => {
    let active = true;
    let page = null;
    let observer = null;

    if (!previewUrl) {
      setLoading(false);
      return;
    }

    const renderPage = async () => {
      if (!active || !page || !containerRef.current || !canvasRef.current) return;
      const container = containerRef.current;
      const canvas = canvasRef.current;
      const width = Math.max(container.clientWidth - 16, 1);
      const baseViewport = page.getViewport({ scale: 1 });
      const scale = width / baseViewport.width;
      const viewport = page.getViewport({ scale });
      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);
      canvas.style.width = `${Math.floor(viewport.width)}px`;
      canvas.style.height = `${Math.floor(viewport.height)}px`;
      await page.render({ canvasContext: canvas.getContext("2d"), viewport }).promise;
      if (active) setLoading(false);
    };

    const loadPreview = async () => {
      try {
        setLoading(true);
        setHasError(false);
        const response = await fetch(previewUrl);
        if (!response.ok) {
          console.warn(`PDF preview returned status ${response.status}`);
          if (active) {
            setLoading(false);
            setHasError(true);
          }
          return;
        }
        const data = await response.arrayBuffer();
        const pdfjs = await import("pdfjs-dist/build/pdf.mjs");
        pdfjs.GlobalWorkerOptions.workerSrc = "/pdfjs/pdf.worker.min.mjs";
        const pdf = await pdfjs.getDocument({ data }).promise;
        page = await pdf.getPage(1);
        if (!active) return;
        await renderPage();
        observer = new ResizeObserver(() => {
          renderPage().catch(() => {});
        });
        observer.observe(containerRef.current);
      } catch (error) {
        console.warn("Could not render canvas preview:", error);
        if (active) {
          setLoading(false);
          setHasError(true);
        }
      }
    };

    loadPreview();
    return () => {
      active = false;
      observer?.disconnect();
    };
  }, [previewUrl]);

  if (hasError) {
    return (
      <div className="space-y-2">
        <div
          ref={containerRef}
          className="relative flex min-h-[190px] w-full flex-col items-center justify-center rounded-xl border border-dashed border-border bg-gray-50/80 p-5 text-center dark:border-border dark:bg-zinc-900/60"
          aria-label={`Preview fallback for ${title}`}
        >
          <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-950/40 text-pup-maroon dark:text-red-400 flex items-center justify-center text-xl mb-2">
            <HugeIcon className="ph-duotone ph-file-pdf"></HugeIcon>
          </div>
          <p className="text-xs font-semibold text-gray-800 dark:text-zinc-200">Official Document On File</p>
          <p className="text-[11px] text-gray-400 dark:text-zinc-500 max-w-xs mt-0.5 mb-3">
            Canvas preview could not be rendered inline. You can preview or download the complete PDF document.
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onOpenPreview || (() => previewUrl && window.open(previewUrl, "_blank"))}
            title="Preview PDF Document"
            className="h-8 px-3.5 rounded-lg text-xs font-semibold bg-white dark:bg-zinc-800 border border-border dark:border-border text-pup-maroon dark:text-red-400 hover:bg-gray-50 shadow-2xs cursor-pointer active:scale-95 transition-all"
          >
            Preview
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div
        ref={containerRef}
        onClick={onOpenPreview}
        className={cn(
          "relative flex min-h-[220px] w-full items-center justify-center overflow-hidden rounded-xl border border-border bg-gray-50/80 p-2 dark:border-border dark:bg-zinc-900/60 transition-all",
          onOpenPreview && "cursor-pointer hover:border-pup-maroon/40 hover:shadow-xs group"
        )}
        aria-label={`First-page preview of ${title}`}
      >
        {loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50/80 dark:bg-zinc-900/80 text-gray-400 dark:text-zinc-500">
            <HugeIcon className="ph-bold ph-spinner animate-spin text-2xl mb-1.5 text-pup-maroon"></HugeIcon>
            <span className="text-xs font-medium">Rendering document preview...</span>
          </div>
        )}
        <canvas ref={canvasRef} className="rounded shadow-xs max-h-[360px] object-contain group-hover:opacity-95 transition-opacity" />
        {onOpenPreview && !loading && (
          <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 text-white text-[11px] font-medium px-2.5 py-1 rounded-lg backdrop-blur-xs flex items-center gap-1 shadow-sm">
            <HugeIcon className="ph-bold ph-magnifying-glass-plus"></HugeIcon>
            <span>Click to Preview</span>
          </div>
        )}
      </div>
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-gray-400 dark:text-zinc-500">{subtext}</span>
        <button
          type="button"
          onClick={onOpenPreview || (() => previewUrl && window.open(previewUrl, "_blank"))}
          title="Preview Full PDF"
          className="text-xs font-semibold text-pup-maroon hover:underline dark:text-red-400 cursor-pointer"
        >
          Preview
        </button>
      </div>
    </div>
  );
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
  const [viewMode, setViewMode] = useState("list"); // "list" | "kanban"
  const [status, setStatus] = useState("Submitted");
  const [note, setNote] = useState("");
  const [statusFilters, setStatusFilters] = useState([]);
  const [orgFilters, setOrgFilters] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [page, setPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [draggingProposal, setDraggingProposal] = useState(null);
  const [dragOverColumn, setDragOverColumn] = useState(null);
  const isDraggingRef = useRef(false);

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
    try {
      const saved = localStorage.getItem("pup_osas_view_mode");
      if (saved === "list" || saved === "kanban") setViewMode(saved);
    } catch {}
  }, []);

  const handleViewModeChange = (mode) => {
    setViewMode(mode);
    setPage(1);
    try {
      localStorage.setItem("pup_osas_view_mode", mode);
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
    } catch {
      showToast?.({ title: "Load failed", description: "Unable to load OSAS submissions." }, true);
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    load();
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
        return showToast?.({ title: "Update failed", description: json?.error || "Unable to save." }, true);
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
    } catch {
      showToast?.({ title: "Update failed", description: "Network error while updating proposal." }, true);
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
        return showToast?.({ title: "Update failed", description: json?.error || "Unable to save clearance." }, true);
      }
      showToast?.({ title: "Post-Event Clearance Updated", description: `Report marked as ${targetStatus}.` });
      setPostEventSheetOpen(false);
      await load();
    } catch {
      showToast?.({ title: "Update failed", description: "Network error while updating post-event report." }, true);
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
          { title: "Move Failed", description: json?.error || "Could not update status." },
          true
        );
        return;
      }

      // If the review sheet is already open for this report, update its displayed status
      if (selectedPostEvent?.id === reportId) {
        setSelectedPostEvent((prev) => ({ ...prev, status: targetStatus }));
        setPostEventStatus(targetStatus);
      }
    } catch {
      // Rollback
      setPostEventReports((prev) =>
        prev.map((r) => (r.id === reportId ? { ...r, status: prevStatus } : r))
      );
      showToast?.({ title: "Move Failed", description: "Network error occurred." }, true);
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
          { title: "Move Failed", description: json?.error || "Could not update status." },
          true
        );
        return;
      }

      // If the review sheet is already open for this proposal, update its displayed status
      if (selected?.id === proposalId) {
        setSelected((prev) => ({ ...prev, status: targetStatus }));
        setStatus(targetStatus);
      }
    } catch {
      // Rollback
      setRows((prev) =>
        prev.map((r) => (r.id === proposalId ? { ...r, status: prevStatus } : r))
      );
      showToast?.({ title: "Move Failed", description: "Network error occurred." }, true);
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

  const availableOrgs = useMemo(() => {
    const orgs = new Set();
    rows.forEach((r) => {
      if (r.organization_name) orgs.add(r.organization_name);
    });
    postEventReports.forEach((r) => {
      if (r.organization_name) orgs.add(r.organization_name);
    });
    return Array.from(orgs).sort();
  }, [rows, postEventReports]);

  const filterGroups = useMemo(() => [
    {
      id: "status",
      label: "Review Status",
      options: [
        { value: "Submitted", label: "Submitted", indicatorColor: "bg-blue-500", count: counts.Submitted },
        { value: "Under Review", label: "Under Review", indicatorColor: "bg-amber-500", count: counts["Under Review"] },
        { value: "Needs Revision", label: "Needs Revision", indicatorColor: "bg-purple-500", count: counts["Needs Revision"] },
        { value: "Approved", label: "Approved", indicatorColor: "bg-emerald-500", count: counts.Approved },
        { value: "Declined", label: "Declined", indicatorColor: "bg-rose-500", count: counts.Declined },
      ],
    },
    {
      id: "org",
      label: "Organization",
      options: availableOrgs.map((org) => ({
        value: org,
        label: org,
        count: rows.filter((r) => r.organization_name === org).length,
      })),
    },
  ], [counts, availableOrgs, rows]);

  const filterValues = useMemo(() => ({
    status: statusFilters,
    org: orgFilters,
  }), [statusFilters, orgFilters]);

  const handleFilterChange = useCallback((groupId, values) => {
    if (groupId === "status") setStatusFilters(values);
    else if (groupId === "org") setOrgFilters(values);
    setPage(1);
  }, []);

  const handleClearFilters = useCallback(() => {
    setSearchQuery("");
    setStatusFilters([]);
    setOrgFilters([]);
    setPage(1);
  }, []);

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
  }, [searchQuery, statusFilters, orgFilters]);

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
        const matches = statusFilters.some((sf) => String(sf).toLowerCase() === String(item.status || "").toLowerCase());
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

  const activeFilteredList = useMemo(() => {
    if (activeStream === "post_events") return filteredPostEvents;
    return filteredRows;
  }, [activeStream, filteredPostEvents, filteredRows]);

  const totalPages = Math.max(1, Math.ceil(activeFilteredList.length / itemsPerPage));
  const safePage = Math.min(Math.max(1, page), totalPages);

  const paginatedRows = useMemo(() => {
    const start = (safePage - 1) * itemsPerPage;
    return filteredRows.slice(start, start + itemsPerPage);
  }, [filteredRows, safePage, itemsPerPage]);

  const paginatedPostEvents = useMemo(() => {
    const start = (safePage - 1) * itemsPerPage;
    return filteredPostEvents.slice(start, start + itemsPerPage);
  }, [filteredPostEvents, safePage, itemsPerPage]);

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

  if (loading) {
    return <OsasMonitoringSkeleton />;
  }

  return (
    <div className="font-jakarta w-full flex flex-1 flex-col h-full min-h-0 gap-6 focus:outline-none animate-fade-up select-none">
      {/* ONE Single Card Container encapsulating Header, Toolbar, Active Filters, Table & Kanban */}
      <Card className="flex h-auto w-full flex-col p-0 gap-0 overflow-hidden rounded-2xl border border-border bg-white shadow-sm dark:border-border dark:bg-card dark:shadow-none isolate font-jakarta mb-4 min-h-0 flex-1">
        {/* 1. Page Header */}
        <PageHeader
          icon="ph-calendar-check"
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
                    className={cn(
                      "inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer",
                      viewMode === "list"
                        ? "bg-pup-maroon text-white shadow-xs"
                        : "text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white"
                    )}
                    title="Table List View"
                  >
                    <HugeIcon className="ph-bold ph-list-dashes text-sm" />
                    <span>List</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleViewModeChange("kanban")}
                    className={cn(
                      "inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer",
                      viewMode === "kanban"
                        ? "bg-pup-maroon text-white shadow-xs"
                        : "text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white"
                    )}
                    title="Kanban Pipeline Board"
                  >
                    <HugeIcon className="ph-bold ph-kanban text-sm" />
                    <span>Kanban</span>
                  </button>
                </div>
              )}

              <RefreshButton onRefresh={load} isLoading={loading} title="Refresh OSAS Queue" />
            </div>
          }
        />

        {/* 2. Stream Navigation Switcher */}
        <div className="px-6 py-3 border-t border-border dark:border-border bg-gray-50/70 dark:bg-zinc-900/50 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 p-1 bg-gray-200/60 dark:bg-zinc-800/80 rounded-xl border border-border/80 dark:border-border w-full sm:w-fit overflow-x-auto scrollbar-none">
            <button
              type="button"
              onClick={() => {
                setActiveStream("proposals");
                setStatusFilters([]);
                setSearchQuery("");
                setPage(1);
              }}
              className={cn(
                "inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer shrink-0",
                activeStream === "proposals"
                  ? "bg-pup-maroon text-white shadow-xs"
                  : "text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white"
              )}
            >
              <HugeIcon className="ph-bold ph-calendar-check text-sm" />
              <span>Pre-Event Proposals</span>
              <span
                className={cn(
                  "px-1.5 py-0.2 rounded-full text-[10px] font-bold min-w-4.5 text-center",
                  activeStream === "proposals"
                    ? "bg-white/20 text-white"
                    : "bg-gray-200 dark:bg-zinc-700 text-gray-700 dark:text-zinc-300"
                )}
              >
                {rows.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveStream("post_events");
                setStatusFilters([]);
                setSearchQuery("");
                setPage(1);
              }}
              className={cn(
                "inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer shrink-0",
                activeStream === "post_events"
                  ? "bg-pup-maroon text-white shadow-xs"
                  : "text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white"
              )}
            >
              <HugeIcon className="ph-bold ph-clipboard-text text-sm" />
              <span>Post-Event & Liquidation</span>
              <span
                className={cn(
                  "px-1.5 py-0.2 rounded-full text-[10px] font-bold min-w-4.5 text-center",
                  activeStream === "post_events"
                    ? "bg-white/20 text-white"
                    : "bg-gray-200 dark:bg-zinc-700 text-gray-700 dark:text-zinc-300"
                )}
              >
                {postEventReports.length}
              </span>
            </button>
          </div>
        </div>

        {/* 3. Embedded Filter Toolbar */}
        <div className="border-t border-border dark:border-border p-5 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 bg-gray-50/40 dark:bg-zinc-900/30">
          {/* Status Filter Tabs */}
          {viewMode === "list" ? (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
              {currentFilterTabs.map((tab) => {
                const isActive =
                  tab.key === "All"
                    ? statusFilters.length === 0
                    : statusFilters.length === 1 && statusFilters[0] === tab.key;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => {
                      setStatusFilters(tab.key === "All" ? [] : [tab.key]);
                      setPage(1);
                    }}
                    className={cn(
                      "inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer border shrink-0",
                      isActive
                        ? "bg-pup-maroon text-white border-pup-maroon shadow-xs"
                        : "bg-white text-gray-600 border-border hover:bg-gray-50 hover:text-gray-900 dark:bg-zinc-900 dark:text-zinc-400 dark:border-border dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                    )}
                  >
                    <span>{tab.label}</span>
                    <span
                      className={cn(
                        "inline-flex items-center justify-center px-1.5 py-0.2 rounded-full text-[10px] font-bold min-w-4.5",
                        isActive
                          ? "bg-white/20 text-white"
                          : "bg-gray-100 text-gray-600 dark:bg-zinc-800 dark:text-zinc-400"
                      )}
                    >
                      {tab.count}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="text-xs text-gray-900 dark:text-zinc-300 flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 font-medium">
                <HugeIcon className="ph-bold ph-kanban text-sm text-pup-maroon dark:text-red-400" />
                <span>
                  Pipeline: <strong className="text-gray-900 dark:text-zinc-100">{activeStream === "post_events" ? postEventReports.length : rows.length}</strong> total {activeStream === "post_events" ? "reports" : "proposals"} across stages
                </span>
              </span>
            </div>
          )}

          {/* Search Input + Multi-Criteria Filter */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 shrink-0">
            <div className="relative w-full sm:w-64 md:w-72 shrink-0 group">
              <HugeIcon className="ph-bold ph-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-zinc-500 text-xs pointer-events-none transition-colors group-focus-within:text-pup-maroon dark:group-focus-within:text-red-400" />
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
                className="h-9 pl-8 pr-8 text-xs rounded-xl border border-border dark:border-border bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-100 placeholder:text-gray-400 dark:placeholder:text-zinc-500 shadow-none focus-visible:outline-none focus-visible:border-pup-maroon focus-visible:ring-1 focus-visible:ring-pup-maroon dark:focus-visible:border-red-500/80 dark:focus-visible:ring-red-500/80"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    setPage(1);
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-pup-maroon dark:hover:text-red-400 cursor-pointer border-0 bg-transparent p-0 leading-none"
                  aria-label="Clear search"
                >
                  <HugeIcon className="ph-bold ph-x text-xs" />
                </button>
              )}
            </div>

            {activeStream === "proposals" && (
              <MultiCriteriaFilter
                title="Filter Proposals"
                groups={filterGroups}
                selectedValues={filterValues}
                onChange={handleFilterChange}
                onClearAll={handleClearFilters}
                totalCount={rows.length}
                filteredCount={filteredRows.length}
              />
            )}
          </div>
        </div>

        {/* 4. Active Filter Chips */}
        <ActiveFilterChips
          chips={activeChips}
          onClearAll={handleClearFilters}
          className="border-t border-border dark:border-border px-6 py-2.5"
        />

        {/* 5. Stream Content */}
        {/* STREAM 1: Pre-Event Proposals */}
        {activeStream === "proposals" && (
          <>
            {viewMode === "list" ? (
              <div className={cn("w-full flex flex-col flex-1 min-h-0 border-t border-border dark:border-border", filteredRows.length === 0 && "rounded-b-2xl overflow-hidden")}>
                <div className="overflow-x-auto flex-1">
                  <table className="w-full text-left text-xs">
                    <thead className="sticky top-0 z-10 border-b border-border dark:border-border bg-white dark:bg-card">
                      <tr className="text-left text-[12px] font-medium tracking-[0.04em] text-[#8E8E93] dark:text-zinc-500">
                        <th className="py-3.5 px-6 w-full min-w-[280px]">Event Proposal & Organization</th>
                        <th className="py-3.5 px-6 min-w-[180px] whitespace-nowrap">Proponent</th>
                        <th className="py-3.5 px-6 min-w-[130px] whitespace-nowrap">Status</th>
                        <th className="py-3.5 px-6 min-w-[120px] whitespace-nowrap hidden sm:table-cell">Submitted</th>
                        <th className="py-3.5 px-6 text-right w-28 whitespace-nowrap">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border dark:divide-border bg-white dark:bg-card">
                      {paginatedRows.map((item) => (
                        <tr
                          key={item.id}
                          onClick={() => select(item)}
                          className="hover:bg-gray-50/80 dark:hover:bg-zinc-800/40 transition-colors cursor-pointer group"
                        >
                          <td className="py-3.5 px-6">
                            <div className="font-semibold text-gray-900 dark:text-zinc-100 group-hover:text-pup-maroon dark:group-hover:text-red-400 transition-colors line-clamp-1">
                              {item.title}
                            </div>
                            <div className="flex items-center gap-1.5 text-[11px] text-gray-900 dark:text-zinc-300 mt-0.5 truncate flex-wrap">
                              {item.org_acronym && (
                                <span className="px-1.5 py-0.2 text-[10px] font-bold rounded bg-red-50 text-pup-maroon dark:bg-red-950/40 dark:text-red-400 border border-red-100 dark:border-red-900/30 shrink-0">
                                  {item.org_acronym}
                                </span>
                              )}
                              <span>{item.verified_org_name || item.organization_name}</span>
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
                          <td className="py-3.5 px-6 whitespace-nowrap">
                            <div className="font-medium text-gray-800 dark:text-zinc-200 flex items-center gap-1.5">
                              <span>{item.student_name}</span>
                              {item.officer_position && (
                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 font-normal">
                                  {item.officer_position}
                                </span>
                              )}
                            </div>
                            <div className="font-mono text-[11px] text-gray-400 dark:text-zinc-500">
                              {item.submitted_by_email || item.student_no}
                            </div>
                          </td>
                          <td className="py-3.5 px-6 whitespace-nowrap">
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
                          <td className="py-3.5 px-6 whitespace-nowrap hidden sm:table-cell text-gray-900 dark:text-zinc-300 text-[11px]">
                            {item.created_at
                              ? new Date(item.created_at).toLocaleDateString(undefined, {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                })
                              : "—"}
                          </td>
                          <td className="py-3.5 px-6 text-right whitespace-nowrap w-16">
                            <div className="flex items-center justify-end" onClick={(e) => e.stopPropagation()}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button
                                    type="button"
                                    onClick={() => select(item)}
                                    aria-label="Review Proposal"
                                    className="w-7 h-7 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 text-gray-500 hover:text-pup-maroon dark:text-zinc-400 dark:hover:text-red-400 focus:outline-none cursor-pointer active:scale-95 flex items-center justify-center transition-colors border-0 bg-transparent"
                                  >
                                    <HugeIcon className="ph-bold ph-clipboard-text text-[16px]" />
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent>Review Proposal</TooltipContent>
                              </Tooltip>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {!filteredRows.length && (
                        <tr className="border-0 hover:bg-transparent">
                          <td colSpan={5} className="py-16 px-6 text-center border-0">
                            <Empty className="flex h-full flex-col items-center justify-center border-0 bg-transparent text-center text-gray-900 dark:text-zinc-300">
                              <EmptyHeader className="flex flex-col items-center gap-0">
                                <div className="relative mb-6">
                                  <div className="absolute inset-0 scale-150 animate-pulse rounded-full bg-gray-50 opacity-50 dark:bg-card" />
                                  <EmptyMedia className="relative z-10 flex h-20 w-20 items-center justify-center rounded-2xl border border-border bg-white shadow-md dark:border-border dark:bg-card dark:shadow-none">
                                    <HugeIcon className="ph-duotone ph-calendar-check text-3xl text-pup-maroon dark:text-red-400" />
                                  </EmptyMedia>
                                </div>
                                <EmptyTitle className="text-lg font-semibold text-gray-900 dark:text-zinc-50">
                                  No Event Proposals Found
                                </EmptyTitle>
                                <EmptyDescription className="max-w-xs text-xs font-medium text-gray-900 dark:text-zinc-300 mt-1">
                                  {hasActiveFilters
                                    ? "Try adjusting your search criteria or resetting active filters."
                                    : "Student organizations have not submitted any event proposals yet."}
                                </EmptyDescription>
                                {hasActiveFilters && (
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={handleClearFilters}
                                    title="Reset Filters"
                                    className="mt-4 h-9 px-4 text-xs font-semibold rounded-xl border border-border dark:border-border bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 cursor-pointer active:scale-95 transition-all shadow-xs"
                                  >
                                    Reset
                                  </Button>
                                )}
                              </EmptyHeader>
                            </Empty>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : filteredRows.length === 0 ? (
              <div className="w-full flex-1 flex items-center justify-center border-t border-border dark:border-border p-16 bg-gray-50/20 dark:bg-zinc-900/10 min-h-[360px]">
                <Empty className="flex h-full flex-col items-center justify-center border-0 bg-transparent text-center text-gray-900 dark:text-zinc-300">
                  <EmptyHeader className="flex flex-col items-center gap-0">
                    <div className="relative mb-6">
                      <div className="absolute inset-0 scale-150 animate-pulse rounded-full bg-gray-50 opacity-50 dark:bg-card" />
                      <EmptyMedia className="relative z-10 flex h-20 w-20 items-center justify-center rounded-2xl border border-border bg-white shadow-md dark:border-border dark:bg-card dark:shadow-none">
                        <HugeIcon className="ph-duotone ph-kanban text-3xl text-pup-maroon dark:text-red-400" />
                      </EmptyMedia>
                    </div>
                    <EmptyTitle className="text-lg font-semibold text-gray-900 dark:text-zinc-50">
                      No Proposals in Pipeline
                    </EmptyTitle>
                    <EmptyDescription className="max-w-xs text-xs font-medium text-gray-900 dark:text-zinc-300 mt-1">
                      {hasActiveFilters
                        ? "No proposals match your active search terms or filters."
                        : "There are currently no event proposals in the pipeline."}
                    </EmptyDescription>
                    {hasActiveFilters && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleClearFilters}
                        title="Reset Filters"
                        className="mt-4 h-9 px-4 text-xs font-semibold rounded-xl border border-border dark:border-border bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 cursor-pointer active:scale-95 transition-all shadow-xs"
                      >
                        Reset
                      </Button>
                    )}
                  </EmptyHeader>
                </Empty>
              </div>
            ) : (
              /* Kanban Pipeline Board */
              <div className="w-full flex-1 min-h-0 border-t border-border dark:border-border p-6 overflow-x-auto bg-gray-50/20 dark:bg-zinc-900/10">
                <div className="flex gap-4 min-w-max items-start">
                  {KANBAN_COLUMNS.map((col) => {
                    const columnItems = getProposalsForColumn(col.key);
                    return (
                      <div
                        key={col.key}
                        onDragOver={(e) => {
                          e.preventDefault();
                          if (!draggingProposal) return;
                          const currentStatus = normalizeProposalStatus(draggingProposal.status);
                          const isAllowed = ALLOWED_TRANSITIONS[currentStatus]?.includes(col.key);
                          if (!isAllowed) {
                            e.dataTransfer.dropEffect = "none";
                            if (dragOverColumn !== null) setDragOverColumn(null);
                            return;
                          }
                          e.dataTransfer.dropEffect = "move";
                          if (dragOverColumn !== col.key) setDragOverColumn(col.key);
                        }}
                        onDragLeave={(e) => {
                          if (!e.currentTarget.contains(e.relatedTarget)) {
                            setDragOverColumn(null);
                          }
                        }}
                        onDrop={(e) => handleDrop(e, col.key)}
                        className={cn(
                          "w-72 sm:w-80 shrink-0 flex flex-col rounded-2xl bg-gray-50/80 dark:bg-zinc-900/50 border border-border/80 dark:border-border p-3.5 shadow-2xs transition-all duration-200",
                          dragOverColumn === col.key && draggingProposal?.status !== col.key && "ring-2 ring-pup-maroon/60 border-pup-maroon/70 bg-red-50/30 dark:bg-red-950/20 shadow-sm"
                        )}
                      >
                        <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-border/80 dark:border-border select-none">
                          <div className="flex items-center gap-2">
                            <span className={cn("w-2 h-2 rounded-full", getProposalStatusDotClass(col.key))} />
                            <h3 className="text-xs font-bold text-gray-900 dark:text-zinc-100">
                              {col.label}
                            </h3>
                          </div>
                          <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-[10px] font-bold min-w-5 bg-gray-200/70 text-gray-700 dark:bg-zinc-800 dark:text-zinc-300">
                            {columnItems.length}
                          </span>
                        </div>

                        {dragOverColumn === col.key && draggingProposal?.status !== col.key && (
                          <div className="mb-2.5 rounded-xl border-2 border-dashed border-pup-maroon/50 dark:border-red-500/50 p-2.5 bg-red-50/40 dark:bg-red-950/20 text-center text-xs font-semibold text-pup-maroon dark:text-red-400 animate-pulse select-none">
                            Drop to move to {col.label}
                          </div>
                        )}

                        <div className="space-y-2.5 overflow-y-auto max-h-[calc(100vh-340px)] p-0.5 scrollbar-thin">
                          {columnItems.map((item) => {
                            const itemStatus = normalizeProposalStatus(item.status);
                            const isLocked = itemStatus === "Approved" || itemStatus === "Declined";
                            return (
                              <div
                                key={item.id}
                                draggable={!isLocked}
                                onDragStart={(e) => {
                                  if (isLocked) {
                                    e.preventDefault();
                                    return;
                                  }
                                  isDraggingRef.current = true;
                                  setDraggingProposal(item);
                                  e.dataTransfer.setData("text/plain", String(item.id));
                                  e.dataTransfer.effectAllowed = "move";
                                }}
                                onDragEnd={() => {
                                  setDraggingProposal(null);
                                  setDragOverColumn(null);
                                  setTimeout(() => {
                                    isDraggingRef.current = false;
                                  }, 120);
                                }}
                                onClick={() => {
                                  if (isDraggingRef.current) return;
                                  select(item);
                                }}
                                className={cn(
                                  "group relative rounded-xl border border-border bg-white p-3.5 shadow-2xs hover:shadow-md hover:border-pup-maroon/40 dark:border-border dark:bg-card dark:hover:border-red-800/40 transition-all flex flex-col gap-2.5 active:scale-[0.99] select-none",
                                  isLocked ? "cursor-pointer" : "cursor-grab active:cursor-grabbing",
                                  draggingProposal?.id === item.id && "opacity-35 scale-[0.97] border-dashed border-pup-maroon/60"
                                )}
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-1.5 truncate max-w-[190px]">
                                    {item.org_acronym && (
                                      <span className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-red-50 text-pup-maroon dark:bg-red-950/40 dark:text-red-400 border border-red-100 dark:border-red-900/30 shrink-0">
                                        {item.org_acronym}
                                      </span>
                                    )}
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-pup-maroon dark:text-red-400 truncate">
                                      {item.verified_org_name || item.organization_name}
                                    </span>
                                  </div>
                                  {isLocked ? (
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <span className="flex items-center text-amber-600/80 dark:text-amber-400/80 p-0.5 cursor-pointer">
                                          <HugeIcon className="ph-bold ph-lock-key text-xs" />
                                        </span>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        {item.status} proposals are locked from direct drag-and-drop. Click to review.
                                      </TooltipContent>
                                    </Tooltip>
                                  ) : (
                                    <HugeIcon
                                      className="ph-bold ph-dots-six-vertical text-gray-900 dark:text-zinc-300 group-hover:text-black dark:group-hover:text-zinc-400 text-lg transition-colors shrink-0"
                                      title="Drag to change stage"
                                    />
                                  )}
                                </div>

                              <h4 className="text-xs font-bold text-gray-900 dark:text-zinc-100 group-hover:text-pup-maroon dark:group-hover:text-red-400 transition-colors line-clamp-2 leading-snug">
                                {item.title}
                              </h4>

                              <div className="flex items-center gap-1.5 text-[11px] text-gray-900 dark:text-zinc-300">
                                <HugeIcon className="ph-bold ph-user-check text-emerald-600 dark:text-emerald-400 text-xs shrink-0" />
                                <span className="truncate font-medium text-gray-700 dark:text-zinc-300">
                                  {item.student_name}
                                </span>
                              </div>

                              <div className="pt-2 border-t border-border dark:border-border flex items-center justify-between text-[11px] text-gray-900 dark:text-zinc-300">
                                <span className="inline-flex items-center gap-1.5 text-[11px] text-gray-400 dark:text-zinc-500 font-normal">
                                  <HugeIcon className="ph ph-clock text-xs text-gray-400 dark:text-zinc-500" />
                                  {item.created_at
                                    ? new Date(item.created_at).toLocaleDateString(undefined, {
                                        month: "short",
                                        day: "numeric",
                                        year: "numeric",
                                      })
                                    : "—"}
                                </span>
                                <span className="text-xs font-semibold text-pup-maroon dark:text-red-400 group-hover:underline">
                                  Review
                                </span>
                              </div>
                            </div>
                          );
                        })}

                          {!columnItems.length && (
                            <div className="rounded-xl border border-dashed border-border dark:border-border bg-white/40 dark:bg-zinc-900/20 py-8 px-3 text-center flex flex-col items-center justify-center gap-1.5">
                              <HugeIcon className="ph-duotone ph-tray text-xl text-gray-400/80 dark:text-zinc-600" />
                              <p className="text-xs text-gray-400 dark:text-zinc-500 font-medium">
                                No proposals in this stage
                              </p>
                              <span className="text-[10px] text-gray-400/70 dark:text-zinc-600">
                                Drag proposals here to update status
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}

        {/* STREAM 2: Post-Event & Liquidation Reports */}
        {activeStream === "post_events" && (
          <>
            {viewMode === "list" ? (
              <div className={cn("w-full flex flex-col flex-1 min-h-0 border-t border-border dark:border-border", filteredPostEvents.length === 0 && "rounded-b-2xl overflow-hidden")}>
                <div className="overflow-x-auto flex-1">
                  <table className="w-full text-left text-xs">
                    <thead className="sticky top-0 z-10 border-b border-border dark:border-border bg-white dark:bg-card">
                      <tr className="text-left text-[12px] font-medium tracking-[0.04em] text-[#8E8E93] dark:text-zinc-500">
                        <th className="py-3.5 px-6 w-full min-w-[280px]">Event Proposal & Organization</th>
                        <th className="py-3.5 px-6 min-w-[170px] whitespace-nowrap">Proponent</th>
                        <th className="py-3.5 px-6 min-w-[180px] whitespace-nowrap">Attendance & Spend</th>
                        <th className="py-3.5 px-6 min-w-[130px] whitespace-nowrap">Clearance Status</th>
                        <th className="py-3.5 px-6 min-w-[110px] whitespace-nowrap hidden sm:table-cell">Submitted</th>
                        <th className="py-3.5 px-6 text-right w-24 whitespace-nowrap">Action</th>
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
                            <td className="py-3.5 px-6">
                              <div className="font-semibold text-gray-900 dark:text-zinc-100 group-hover:text-pup-maroon dark:group-hover:text-red-400 transition-colors line-clamp-1">
                                {item.event_title}
                              </div>
                              <div className="flex items-center gap-1.5 text-[11px] text-gray-900 dark:text-zinc-300 mt-0.5 truncate">
                                {item.org_acronym && (
                                  <span className="px-1.5 py-0.2 text-[10px] font-bold rounded bg-red-50 text-pup-maroon dark:bg-red-950/40 dark:text-red-400 border border-red-100 dark:border-red-900/30 shrink-0">
                                    {item.org_acronym}
                                  </span>
                                )}
                                <span>{item.organization_name}</span>
                              </div>
                            </td>
                            <td className="py-3.5 px-6 whitespace-nowrap">
                              <div className="font-medium text-gray-800 dark:text-zinc-200">
                                {item.student_name}
                              </div>
                              <div className="font-mono text-[11px] text-gray-400 dark:text-zinc-500">
                                {item.submitted_by_email || item.student_no}
                              </div>
                            </td>
                            <td className="py-3.5 px-6 whitespace-nowrap">
                              <div className="font-semibold text-gray-900 dark:text-zinc-100">
                                {attendees != null ? `${Number(attendees).toLocaleString()} attendees` : "—"}
                              </div>
                              <div className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium">
                                ₱{expenses.toLocaleString(undefined, { minimumFractionDigits: 2 })} liquidated
                              </div>
                            </td>
                            <td className="py-3.5 px-6 whitespace-nowrap">
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
                            <td className="py-3.5 px-6 whitespace-nowrap hidden sm:table-cell text-gray-900 dark:text-zinc-300 text-[11px]">
                              {item.created_at
                                ? new Date(item.created_at).toLocaleDateString(undefined, {
                                    month: "short",
                                    day: "numeric",
                                    year: "numeric",
                                  })
                                : "—"}
                            </td>
                            <td className="py-3.5 px-6 text-right whitespace-nowrap w-16">
                              <div className="flex items-center justify-end" onClick={(e) => e.stopPropagation()}>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <button
                                      type="button"
                                      onClick={() => selectPostEvent(item)}
                                      aria-label="Review Clearance"
                                      className="w-7 h-7 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 text-gray-500 hover:text-pup-maroon dark:text-zinc-400 dark:hover:text-red-400 focus:outline-none cursor-pointer active:scale-95 flex items-center justify-center transition-colors border-0 bg-transparent"
                                    >
                                      <HugeIcon className="ph-bold ph-clipboard-text text-[16px]" />
                                    </button>
                                  </TooltipTrigger>
                                  <TooltipContent>Review Clearance</TooltipContent>
                                </Tooltip>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                      {!filteredPostEvents.length && (
                        <tr className="border-0 hover:bg-transparent">
                          <td colSpan={6} className="py-16 px-6 text-center border-0">
                            <Empty className="flex h-full flex-col items-center justify-center border-0 bg-transparent text-center text-gray-900 dark:text-zinc-300">
                              <EmptyHeader className="flex flex-col items-center gap-0">
                                <div className="relative mb-6">
                                  <div className="absolute inset-0 scale-150 animate-pulse rounded-full bg-gray-50 opacity-50 dark:bg-card" />
                                  <EmptyMedia className="relative z-10 flex h-20 w-20 items-center justify-center rounded-2xl border border-border bg-white shadow-md dark:border-border dark:bg-card dark:shadow-none">
                                    <HugeIcon className="ph-duotone ph-clipboard-text text-3xl text-pup-maroon dark:text-red-400" />
                                  </EmptyMedia>
                                </div>
                                <EmptyTitle className="text-lg font-semibold text-gray-900 dark:text-zinc-50">
                                  No Post-Event Reports Found
                                </EmptyTitle>
                                <EmptyDescription className="max-w-xs text-xs font-medium text-gray-900 dark:text-zinc-300 mt-1">
                                  {hasActiveFilters
                                    ? "No reports match your active search or filter criteria."
                                    : "Student organizations will submit narrative and liquidation reports after their approved events conclude."}
                                </EmptyDescription>
                                {hasActiveFilters && (
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={handleClearFilters}
                                    title="Reset Filters"
                                    className="mt-4 h-9 px-4 text-xs font-semibold rounded-xl border border-border dark:border-border bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 cursor-pointer active:scale-95 transition-all shadow-xs"
                                  >
                                    Reset
                                  </Button>
                                )}
                              </EmptyHeader>
                            </Empty>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              /* KANBAN BOARD VIEW FOR POST-EVENTS */
              <div className="w-full flex-1 min-h-0 border-t border-border dark:border-border bg-white/50 dark:bg-card/50">
                {filteredPostEvents.length === 0 ? (
                  <div className="py-20 px-6 text-center w-full">
                    <Empty className="flex h-full flex-col items-center justify-center border-0 bg-transparent text-center text-gray-900 dark:text-zinc-300">
                      <EmptyHeader className="flex flex-col items-center gap-0">
                        <div className="relative mb-6">
                          <div className="absolute inset-0 scale-150 animate-pulse rounded-full bg-gray-50 opacity-50 dark:bg-card" />
                          <EmptyMedia className="relative z-10 flex h-20 w-20 items-center justify-center rounded-2xl border border-border bg-white shadow-md dark:border-border dark:bg-card dark:shadow-none">
                            <HugeIcon className="ph-duotone ph-clipboard-text text-3xl text-pup-maroon dark:text-red-400" />
                          </EmptyMedia>
                        </div>
                        <EmptyTitle className="text-lg font-semibold text-gray-900 dark:text-zinc-50">
                          No Post-Event Reports Found
                        </EmptyTitle>
                        <EmptyDescription className="max-w-xs text-xs font-medium text-gray-900 dark:text-zinc-300 mt-1">
                          {hasActiveFilters
                            ? "No reports match your active search or filter criteria."
                            : "Student organizations will submit narrative and liquidation reports after their approved events conclude."}
                        </EmptyDescription>
                        {hasActiveFilters && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleClearFilters}
                            title="Reset Filters"
                            className="mt-4 h-9 px-4 text-xs font-semibold rounded-xl border border-border dark:border-border bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 cursor-pointer active:scale-95 transition-all shadow-xs"
                          >
                            Reset
                          </Button>
                        )}
                      </EmptyHeader>
                    </Empty>
                  </div>
                ) : (
                  <div className="p-6 overflow-x-auto">
                    <div className="flex gap-4 min-w-max items-start">
                      {POST_EVENT_KANBAN_COLUMNS.map((col) => {
                        const columnItems = getPostEventsForColumn(col.key);
                        return (
                          <div
                            key={col.key}
                            onDragOver={(e) => {
                              e.preventDefault();
                              if (!draggingPostEvent) return;
                              const currentStatus = draggingPostEvent.status || "Submitted";
                              const isAllowed = POST_EVENT_ALLOWED_TRANSITIONS[currentStatus]?.includes(col.key);
                              if (!isAllowed) {
                                e.dataTransfer.dropEffect = "none";
                                if (dragOverPostEventColumn !== null) setDragOverPostEventColumn(null);
                                return;
                              }
                              e.dataTransfer.dropEffect = "move";
                              if (dragOverPostEventColumn !== col.key) setDragOverPostEventColumn(col.key);
                            }}
                            onDragLeave={(e) => {
                              if (!e.currentTarget.contains(e.relatedTarget)) {
                                setDragOverPostEventColumn(null);
                              }
                            }}
                            onDrop={(e) => handlePostEventDrop(e, col.key)}
                            className={cn(
                              "w-72 sm:w-80 shrink-0 flex flex-col rounded-2xl bg-gray-50/80 dark:bg-zinc-900/50 border border-border/80 dark:border-border p-3.5 shadow-2xs transition-all duration-200",
                              dragOverPostEventColumn === col.key && draggingPostEvent?.status !== col.key && "ring-2 ring-pup-maroon/60 border-pup-maroon/70 bg-red-50/30 dark:bg-red-950/20 shadow-sm"
                            )}
                          >
                            <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-border/80 dark:border-border select-none">
                              <div className="flex items-center gap-2">
                                <span className={cn("w-2 h-2 rounded-full", getPostEventStatusDotClass(col.key))} />
                                <h3 className="text-xs font-bold text-gray-900 dark:text-zinc-100">
                                  {col.label}
                                </h3>
                              </div>
                              <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-[10px] font-bold min-w-5 bg-gray-200/70 text-gray-700 dark:bg-zinc-800 dark:text-zinc-300">
                                {columnItems.length}
                              </span>
                            </div>

                            {dragOverPostEventColumn === col.key && draggingPostEvent?.status !== col.key && (
                              <div className="mb-2.5 rounded-xl border-2 border-dashed border-pup-maroon/50 dark:border-red-500/50 p-2.5 bg-red-50/40 dark:bg-red-950/20 text-center text-xs font-semibold text-pup-maroon dark:text-red-400 animate-pulse select-none">
                                Drop to move to {col.label}
                              </div>
                            )}

                            <div className="space-y-2.5 overflow-y-auto max-h-[calc(100vh-340px)] p-0.5 scrollbar-thin">
                              {columnItems.map((item) => {
                                const itemStatus = item.status || "Submitted";
                                const isLocked = itemStatus === "Cleared" || itemStatus === "Declined";
                                const attendees = item.actual_attendance ?? item.total_attendance ?? item.actual_attendees ?? 0;
                                const expenses = Number(item.total_expenses ?? item.actual_expenses ?? 0);
                                return (
                                  <div
                                    key={item.id}
                                    draggable={!isLocked}
                                    onDragStart={(e) => {
                                      if (isLocked) {
                                        e.preventDefault();
                                        return;
                                      }
                                      isDraggingPostEventRef.current = true;
                                      setDraggingPostEvent(item);
                                      e.dataTransfer.setData("text/plain", String(item.id));
                                      e.dataTransfer.effectAllowed = "move";
                                    }}
                                    onDragEnd={() => {
                                      setDraggingPostEvent(null);
                                      setDragOverPostEventColumn(null);
                                      setTimeout(() => {
                                        isDraggingPostEventRef.current = false;
                                      }, 120);
                                    }}
                                    onClick={() => {
                                      if (isDraggingPostEventRef.current) return;
                                      selectPostEvent(item);
                                    }}
                                    className={cn(
                                      "group relative rounded-xl border border-border bg-white p-3.5 shadow-2xs hover:shadow-md hover:border-pup-maroon/40 dark:border-border dark:bg-card dark:hover:border-red-800/40 transition-all flex flex-col gap-2.5 active:scale-[0.99] select-none",
                                      isLocked ? "cursor-pointer" : "cursor-grab active:cursor-grabbing",
                                      draggingPostEvent?.id === item.id && "opacity-35 scale-[0.97] border-dashed border-pup-maroon/60"
                                    )}
                                  >
                                    <div className="flex items-center justify-between gap-2">
                                      <div className="flex items-center gap-1.5 truncate max-w-[190px]">
                                        {item.org_acronym && (
                                          <span className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-red-50 text-pup-maroon dark:bg-red-950/40 dark:text-red-400 border border-red-100 dark:border-red-900/30 shrink-0">
                                            {item.org_acronym}
                                          </span>
                                        )}
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-pup-maroon dark:text-red-400 truncate">
                                          {item.organization_name}
                                        </span>
                                      </div>
                                      {isLocked ? (
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <span className="flex items-center text-amber-600/80 dark:text-amber-400/80 p-0.5 cursor-pointer">
                                              <HugeIcon className="ph-bold ph-lock-key text-xs" />
                                            </span>
                                          </TooltipTrigger>
                                          <TooltipContent>
                                            {item.status} reports are locked from direct drag-and-drop. Click to review clearance.
                                          </TooltipContent>
                                        </Tooltip>
                                      ) : (
                                        <HugeIcon
                                          className="ph-bold ph-dots-six-vertical text-gray-900 dark:text-zinc-300 group-hover:text-black dark:group-hover:text-zinc-400 text-lg transition-colors shrink-0"
                                          title="Drag to change clearance status"
                                        />
                                      )}
                                    </div>

                                    <h4 className="text-xs font-bold text-gray-900 dark:text-zinc-100 group-hover:text-pup-maroon dark:group-hover:text-red-400 transition-colors line-clamp-2 leading-snug">
                                      {item.event_title}
                                    </h4>

                                    <div className="flex items-center gap-1.5 text-[11px] text-gray-900 dark:text-zinc-300">
                                      <HugeIcon className="ph-bold ph-user-check text-emerald-600 dark:text-emerald-400 text-xs shrink-0" />
                                      <span className="truncate font-medium text-gray-700 dark:text-zinc-300">
                                        {item.student_name || item.submitted_by_email}
                                      </span>
                                    </div>

                                    {/* Attendance & Liquidated Spend Pills */}
                                    <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-gray-100 dark:bg-zinc-800 text-[10px] font-semibold text-gray-700 dark:text-zinc-300 border border-border/60 dark:border-border">
                                        <HugeIcon className="ph-bold ph-users text-[10px] text-gray-400" />
                                        {Number(attendees).toLocaleString()} attendees
                                      </span>
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/30 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-900/30">
                                        <HugeIcon className="ph-bold ph-receipt text-[10px] text-emerald-500" />
                                        ₱{expenses.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                      </span>
                                    </div>

                                    {/* Compliance PDF Links */}
                                    <div className="flex items-center gap-2 pt-1 border-t border-border dark:border-border" onClick={(e) => e.stopPropagation()}>
                                      {item.narrative_storage_filename && (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            handleOpenPdfPreview({
                                              url: `/api/osas/post-event-reports/${item.id}?file=narrative`,
                                              title: `${item.event_title} — Narrative Report`,
                                              subtitle: "Official post-event narrative & accomplishment report.",
                                              docType: "Post-Event Narrative",
                                              originalFilename: item.narrative_original_filename || "Narrative.pdf",
                                            });
                                          }}
                                          className="inline-flex items-center gap-1 text-[10px] font-medium text-pup-maroon dark:text-red-400 hover:underline cursor-pointer border-0 bg-transparent p-0"
                                        >
                                          <HugeIcon className="ph-bold ph-file-text text-xs" />
                                          <span>Narrative</span>
                                        </button>
                                      )}
                                      {item.liquidation_storage_filename && (
                                        <>
                                          <span className="text-gray-300 dark:text-zinc-600 text-[10px]">·</span>
                                          <button
                                            type="button"
                                            onClick={() => {
                                              handleOpenPdfPreview({
                                                url: `/api/osas/post-event-reports/${item.id}?file=liquidation`,
                                                title: `${item.event_title} — Financial Liquidation`,
                                                subtitle: "Official receipts, disbursement summary, and vouchers.",
                                                docType: "Financial Liquidation",
                                                originalFilename: item.liquidation_original_filename || "Liquidation.pdf",
                                              });
                                            }}
                                            className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer border-0 bg-transparent p-0"
                                          >
                                            <HugeIcon className="ph-bold ph-receipt text-xs" />
                                            <span>Liquidation</span>
                                          </button>
                                        </>
                                      )}
                                    </div>

                                    <div className="pt-2 border-t border-border dark:border-border flex items-center justify-between text-[11px] text-gray-900 dark:text-zinc-300">
                                      <span className="inline-flex items-center gap-1.5 text-[11px] text-gray-400 dark:text-zinc-500 font-normal">
                                        <HugeIcon className="ph ph-clock text-xs text-gray-400 dark:text-zinc-500" />
                                        {item.created_at
                                          ? new Date(item.created_at).toLocaleDateString(undefined, {
                                              month: "short",
                                              day: "numeric",
                                              year: "numeric",
                                            })
                                          : "—"}
                                      </span>
                                      <span className="text-xs font-semibold text-pup-maroon dark:text-red-400 group-hover:underline">
                                        Review
                                      </span>
                                    </div>
                                  </div>
                                );
                              })}

                              {!columnItems.length && (
                                <div className="rounded-xl border border-dashed border-border dark:border-border bg-white/40 dark:bg-zinc-900/20 py-8 px-3 text-center flex flex-col items-center justify-center gap-1.5">
                                  <HugeIcon className="ph-duotone ph-tray text-xl text-gray-400/80 dark:text-zinc-600" />
                                  <p className="text-xs text-gray-400 dark:text-zinc-500 font-medium">
                                    No reports in this stage
                                  </p>
                                  <span className="text-[10px] text-gray-400/70 dark:text-zinc-600">
                                    Drag reports here to update clearance
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* 6. Apple HIG Pagination Footer (Unified for all streams) */}
        {viewMode === "list" && activeFilteredList.length > 0 && (
          <div className="flex items-center justify-between border-t border-[#e5e5ea] dark:border-[#3a3a3c] bg-white dark:bg-[#1c1c1e] p-4 px-6 rounded-b-2xl mt-auto select-none">
            <div className="flex items-center gap-6 text-xs text-gray-900 dark:text-zinc-300 select-none">
              <span>
                Showing {Math.min(itemsPerPage, activeFilteredList.length - (safePage - 1) * itemsPerPage)} of {activeFilteredList.length.toLocaleString()}
              </span>
              <div className="flex items-center gap-2">
                <span>Rows:</span>
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

      {/* Slide-Over Review Sheet */}
      <Sheet
        open={sheetOpen}
        onOpenChange={(open) => {
          setSheetOpen(open);
          if (!open) setSelected(null);
        }}
      >
        <SheetContent
          side="right"
          className="w-full sm:max-w-2xl md:max-w-3xl lg:max-w-4xl data-[side=right]:w-full data-[side=right]:sm:max-w-2xl data-[side=right]:md:max-w-3xl data-[side=right]:lg:max-w-4xl flex flex-col h-full bg-white dark:bg-card border-l border-border dark:border-border p-0 shadow-2xl font-jakarta overflow-hidden"
        >
          {selected && (
            <>
              {/* Sheet Header */}
              <SheetHeader className="shrink-0 p-6 pb-4 pr-14 border-b border-border dark:border-border bg-gradient-to-r from-gray-50/90 via-white to-gray-50/50 dark:from-zinc-900/90 dark:via-card dark:to-zinc-900/50">
                <div className="flex items-start gap-3.5">
                  <div className="w-11 h-11 rounded-xl bg-pup-maroon/10 text-pup-maroon dark:bg-red-950/40 dark:text-red-400 flex items-center justify-center text-xl shrink-0 shadow-xs">
                    <HugeIcon  className="ph-bold ph-file-text"></HugeIcon>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-pup-maroon dark:text-red-400 bg-red-50 dark:bg-red-950/30 px-2.5 py-0.5 rounded-md border border-pup-maroon/20 flex items-center gap-1.5">
                        {selected.org_acronym && <span>[{selected.org_acronym}]</span>}
                        <span>{selected.verified_org_name || selected.organization_name}</span>
                      </span>
                      {selected.is_verified_officer && (
                        <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/30 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800/40 flex items-center gap-1">
                          <HugeIcon className="ph-bold ph-shield-check text-xs" />
                          Verified Submitter
                        </span>
                      )}
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold shrink-0",
                          getProposalStatusBadgeClass(selected.status)
                        )}
                      >
                        <span className={cn("w-1.5 h-1.5 rounded-full", getProposalStatusDotClass(selected.status))} />
                        {selected.status}
                      </span>
                    </div>
                    <SheetTitle className="text-lg font-bold tracking-tight text-gray-900 dark:text-zinc-50 leading-snug">
                      {selected.title}
                    </SheetTitle>
                    <SheetDescription className="mt-1 text-xs text-gray-900 dark:text-zinc-300 flex items-center gap-2 flex-wrap">
                      <span>Proponent: <strong className="text-gray-700 dark:text-zinc-300">{selected.student_name}</strong></span>
                      {selected.officer_position && (
                        <span className="px-1.5 py-0.2 rounded bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 text-[10px] font-semibold">
                          {selected.officer_position}
                        </span>
                      )}
                      <span>·</span>
                      <span className="font-mono">{selected.submitted_by_email || selected.student_no}</span>
                    </SheetDescription>
                  </div>
                </div>
              </SheetHeader>

              {/* Sheet Body (Scrollable) */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Proponent Org Constitution & By-Laws Status */}
                {selected.bylaws_filename ? (
                  <div className="flex items-center justify-between rounded-xl border border-border/80 dark:border-border bg-gray-50/60 dark:bg-zinc-900/40 p-3">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400">
                        <HugeIcon className="ph-bold ph-scales text-base" />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-semibold text-gray-900 dark:text-zinc-100">
                            Organization Charter (CBL)
                          </span>
                          <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.2 text-[10px] font-semibold text-emerald-700 dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-300">
                            Active Charter
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-900 dark:text-zinc-300 truncate max-w-[240px]">
                          {selected.bylaws_original_filename || selected.bylaws_filename}
                        </p>
                      </div>
                    </div>
                    {selected.organization_id && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        title="Preview Constitution & By-Laws"
                        className="h-7 px-2.5 text-[11px] font-semibold rounded-lg border-border dark:border-border hover:bg-gray-100 dark:hover:bg-zinc-800 cursor-pointer"
                        onClick={() => {
                          setPdfPreviewData({
                            url: `/api/osas/organizations/${selected.organization_id}/bylaws?file=1`,
                            title: `${selected.organization_name || "Organization"} — Constitution & By-Laws`,
                            subtitle: "Active ratified charter for this student organization.",
                            docType: "Constitution & By-Laws",
                            originalFilename: selected.bylaws_original_filename || "CBL.pdf",
                          });
                          setPdfPreviewOpen(true);
                        }}
                      >
                        Preview
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center justify-between rounded-xl border border-amber-200/80 dark:border-amber-900/30 bg-amber-50/50 dark:bg-amber-950/20 p-3">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                        <HugeIcon className="ph-bold ph-warning text-base" />
                      </div>
                      <div>
                        <span className="text-xs font-semibold text-amber-900 dark:text-amber-200">
                          No Active Charter On File
                        </span>
                        <p className="text-[11px] text-amber-700 dark:text-amber-400">
                          This organization has not ratified a Constitution & By-Laws yet.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Post-Event Clearance Tracker (Visible for Approved Proposals) */}
                {selected.status === "Approved" && (
                  <div className="rounded-xl border border-purple-200 dark:border-purple-900/40 bg-purple-50/50 dark:bg-purple-950/20 p-3.5 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <HugeIcon className="ph-bold ph-clock-countdown text-purple-700 dark:text-purple-400" />
                        <span className="text-xs font-bold uppercase tracking-wider text-purple-900 dark:text-purple-200">
                          Post-Event Clearance Tracker
                        </span>
                      </div>
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold",
                          getPostEventStatusBadgeClass(selected.post_event_status || "Pending Submission")
                        )}
                      >
                        {selected.post_event_status || "Pending Submission"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-purple-800 dark:text-purple-300">
                      <span>
                        Due Date:{" "}
                        <strong className="font-mono">
                          {selected.post_event_due_date
                            ? new Date(selected.post_event_due_date).toLocaleDateString(undefined, {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })
                            : "N/A"}
                        </strong>
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setSheetOpen(false);
                          setActiveStream("post_events");
                          setSearchQuery(selected.tracking_number || selected.title);
                        }}
                        title="Open in Post-Event Queue"
                        className="text-[11px] font-semibold text-purple-700 dark:text-purple-300 hover:underline cursor-pointer flex items-center gap-1"
                      >
                        <span>View</span>
                        <HugeIcon className="ph-bold ph-arrow-right text-[10px]" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Document Preview Section */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-900 dark:text-zinc-300">
                    Official Proposal Document
                  </h4>
                  <FirstPagePreview
                    proposalId={selected.id}
                    title={selected.title}
                    onOpenPreview={() => handleOpenPdfPreview(selected)}
                  />
                </div>

                {/* Action Form: Update Status & Publish Note */}
                <div className="rounded-xl border border-border dark:border-border bg-gray-50/50 dark:bg-zinc-900/30 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-zinc-300">
                      Evaluation & Status Update
                    </label>
                    <span className="text-[11px] text-gray-400 dark:text-zinc-500">
                      Current: <strong className="text-gray-700 dark:text-zinc-300">{selected.status}</strong>
                    </span>
                  </div>

                  {/* Status Picker with usePortal={false} for sheet compatibility */}
                  <Select
                    value={status}
                    onValueChange={(val) => {
                      setStatus(val);
                      if (!note.trim()) {
                        setNote(`Status updated to ${val} by OSAS.`);
                      }
                    }}
                    onChange={(e) => {
                      const val = e?.target?.value || e;
                      setStatus(val);
                      if (val === "Needs Revision") {
                        if (!note.trim() || note.startsWith("Status updated")) {
                          setNote("");
                        }
                      } else if (!note.trim() && val !== "Needs Revision") {
                        setNote(`Status updated to ${val} by OSAS.`);
                      }
                    }}
                    usePortal={false}
                    className="h-10 text-xs font-semibold rounded-xl bg-white dark:bg-zinc-800 border-border dark:border-border text-gray-900 dark:text-zinc-100 shadow-none cursor-pointer"
                    buttonClassName="h-10 text-xs font-semibold rounded-xl bg-white dark:bg-zinc-800 border-border dark:border-border text-gray-900 dark:text-zinc-100"
                  >
                    {availableStatusOptions.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </Select>

                  {/* Contextual Guidance / Warning Alerts for Sensitive State Transitions */}
                  {isRevokingApproval && (
                    <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3 text-xs text-amber-900 dark:border-amber-800/40 dark:bg-amber-950/30 dark:text-amber-300 flex items-start gap-2.5">
                      <HugeIcon className="ph-bold ph-warning text-base text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <p className="font-semibold text-amber-950 dark:text-amber-200">
                          Revoking Official Approval
                        </p>
                        <p className="text-[11px] leading-relaxed text-amber-800 dark:text-amber-300/90">
                          This will cancel post-event compliance tracking for this organization and return the proposal to evaluation. A written justification note (at least 5 characters) is required.
                        </p>
                      </div>
                    </div>
                  )}

                  {isReopeningDeclined && (
                    <div className="rounded-xl border border-purple-200 bg-purple-50/70 p-3 text-xs text-purple-900 dark:border-purple-800/40 dark:bg-purple-950/30 dark:text-purple-300 flex items-start gap-2.5">
                      <HugeIcon className="ph-bold ph-arrow-counter-clockwise text-base text-purple-600 dark:text-purple-400 shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <p className="font-semibold text-purple-950 dark:text-purple-200">
                          Reopening Declined Proposal
                        </p>
                        <p className="text-[11px] leading-relaxed text-purple-800 dark:text-purple-300/90">
                          A written justification note citing the grounds for appeal or reconsideration is required.
                        </p>
                      </div>
                    </div>
                  )}

                  {isRequestingRevision && (
                    <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-3 text-xs text-blue-900 dark:border-blue-800/40 dark:bg-blue-950/30 dark:text-blue-300 flex items-start gap-2.5">
                      <HugeIcon className="ph-bold ph-info text-base text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <p className="font-semibold text-blue-950 dark:text-blue-200">
                          Revision Feedback Required
                        </p>
                        <p className="text-[11px] leading-relaxed text-blue-800 dark:text-blue-300/90">
                          Please provide detailed feedback below explaining what documents or aspects of the proposal must be updated by the student organization.
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <textarea
                      className={cn(
                        "min-h-24 w-full rounded-xl border bg-white p-3 text-xs text-gray-900 placeholder:text-gray-400 outline-none transition-colors dark:bg-zinc-900 dark:text-zinc-100",
                        isNoteRequired && note.trim().length < 5
                          ? "border-amber-400 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 dark:border-amber-600"
                          : "border-border focus:border-pup-maroon focus:ring-1 focus:ring-pup-maroon dark:border-border"
                      )}
                      placeholder={
                        isNoteRequired
                          ? "Enter required justification / revision instructions (minimum 5 characters)..."
                          : "Enter student-visible evaluation note (optional, default note applied if left empty)..."
                      }
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                    />
                    {isNoteRequired && note.trim().length < 5 && (
                      <p className="text-[11px] text-amber-700 dark:text-amber-400 font-medium">
                        * Note must be at least 5 characters long.
                      </p>
                    )}
                  </div>

                  {/* Primary Action: Publish Update with Brand Maroon */}
                  <Button
                    className="h-10 w-full text-xs font-semibold rounded-xl btn-brand-red text-white! bg-pup-maroon hover:bg-pup-darkMaroon shadow-xs cursor-pointer active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ color: "#ffffff" }}
                    onClick={() => save()}
                    disabled={isSaving || !isNoteValid}
                    title={
                      isRevokingApproval
                        ? `Revoke Approval & Set to ${status}`
                        : isReopeningDeclined
                        ? `Reopen Proposal to ${status}`
                        : `Publish Update to ${status}`
                    }
                  >
                    {isSaving ? (
                      <>
                        <HugeIcon className="ph-bold ph-spinner animate-spin mr-2" />
                        Saving...
                      </>
                    ) : isRevokingApproval ? (
                      "Revoke"
                    ) : isReopeningDeclined ? (
                      "Reopen"
                    ) : status === "Approved" ? (
                      "Approve"
                    ) : status === "Needs Revision" ? (
                      "Revise"
                    ) : status === "Declined" ? (
                      "Decline"
                    ) : (
                      "Update"
                    )}
                  </Button>
                </div>

                {/* Transaction History Timeline */}
                {selected.updates?.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-gray-900 dark:text-zinc-300">
                      Transaction History ({selected.updates.length})
                    </h4>
                    <ol className="relative border-l border-border ml-2.5 pl-4 text-xs space-y-4 dark:border-border">
                      {selected.updates.map((update) => (
                        <li key={update.id} className="relative">
                          <div
                            className={cn(
                              "absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-border",
                              getProposalStatusDotClass(update.status)
                            )}
                          />
                          <div className="flex items-center gap-2 mb-1">
                            <span
                              className={cn(
                                "inline-flex items-center rounded-full border px-2 py-0.2 text-[10px] font-semibold",
                                getProposalStatusBadgeClass(update.status)
                              )}
                            >
                              {update.status}
                            </span>
                            {update.created_at && (
                              <span className="text-[10px] text-gray-400 dark:text-zinc-500 font-mono">
                                {new Date(update.created_at).toLocaleDateString(undefined, {
                                  month: "short",
                                  day: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-700 dark:text-zinc-300 leading-relaxed bg-white dark:bg-zinc-900/60 p-2.5 rounded-lg border border-border dark:border-border">
                            {update.message}
                          </p>
                        </li>
                      ))}
                    </ol>
                  </div>
                )}
              </div>

              {/* Sheet Footer */}
              <SheetFooter className="shrink-0 p-4 border-t border-border dark:border-border bg-gray-50/50 dark:bg-zinc-900/30 flex justify-end">
                <Button
                  variant="outline"
                  onClick={() => setSheetOpen(false)}
                  className="h-9 px-4 text-xs font-semibold rounded-xl border border-border dark:border-border bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-xs cursor-pointer active:scale-95 transition-all"
                >
                  Close
                </Button>
              </SheetFooter>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Slide-Over Review Sheet for Post-Event Reports */}
      <Sheet open={postEventSheetOpen} onOpenChange={setPostEventSheetOpen}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-xl md:max-w-2xl p-0 flex flex-col bg-white dark:bg-zinc-950 border-l border-border dark:border-border z-50 overflow-hidden"
        >
          {selectedPostEvent && (
            <>
              {/* Sheet Header */}
              <SheetHeader className="shrink-0 p-6 border-b border-border dark:border-border bg-gray-50/50 dark:bg-zinc-900/30">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60">
                        {selectedPostEvent.event_tracking_number || `EVT-${selectedPostEvent.event_proposal_id}`}
                      </span>
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold",
                          getPostEventStatusBadgeClass(selectedPostEvent.status)
                        )}
                      >
                        {selectedPostEvent.status}
                      </span>
                    </div>
                    <SheetTitle className="text-lg font-bold tracking-tight text-gray-900 dark:text-zinc-50 leading-snug">
                      {selectedPostEvent.event_title}
                    </SheetTitle>
                    <SheetDescription className="mt-1 text-xs text-gray-900 dark:text-zinc-300 flex items-center gap-2 flex-wrap">
                      <span>Org: <strong className="text-gray-700 dark:text-zinc-300">{selectedPostEvent.organization_name}</strong></span>
                      {selectedPostEvent.organization_acronym && (
                        <span className="px-1.5 py-0.2 rounded bg-gray-100 text-gray-700 dark:bg-zinc-800 dark:text-zinc-300 text-[10px] font-semibold">
                          {selectedPostEvent.organization_acronym}
                        </span>
                      )}
                      <span>·</span>
                      <span>Proponent: <strong className="text-gray-700 dark:text-zinc-300">{selectedPostEvent.student_name || selectedPostEvent.submitted_by_name || "Authorized Officer"}</strong></span>
                    </SheetDescription>
                  </div>
                </div>
              </SheetHeader>

              {/* Sheet Body (Scrollable) */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Metrics summary banner */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className="rounded-xl border border-border/80 dark:border-border bg-gray-50/50 dark:bg-zinc-900/40 p-3">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-zinc-500">Actual Attendees</span>
                    <p className="mt-1 text-base font-bold text-gray-900 dark:text-zinc-100 font-mono">
                      {Number(selectedPostEvent.actual_attendance ?? selectedPostEvent.actual_attendees ?? selectedPostEvent.total_attendance ?? 0).toLocaleString()}
                    </p>
                  </div>
                  <div className="rounded-xl border border-border/80 dark:border-border bg-gray-50/50 dark:bg-zinc-900/40 p-3">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-zinc-500">Total Liquidated</span>
                    <p className="mt-1 text-base font-bold text-gray-900 dark:text-zinc-100 font-mono">
                      ₱{Number(selectedPostEvent.total_expenses ?? selectedPostEvent.actual_expenses ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div className="col-span-2 sm:col-span-1 rounded-xl border border-border/80 dark:border-border bg-gray-50/50 dark:bg-zinc-900/40 p-3">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-zinc-500">Submission Date</span>
                    <p className="mt-1 text-xs font-semibold text-gray-700 dark:text-zinc-300 font-mono">
                      {selectedPostEvent.created_at ? new Date(selectedPostEvent.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "N/A"}
                    </p>
                  </div>
                </div>

                {/* Narrative Summary card */}
                {selectedPostEvent.narrative_summary && (
                  <div className="rounded-xl border border-border dark:border-border bg-white dark:bg-zinc-900/50 p-4 space-y-1.5">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-gray-900 dark:text-zinc-300">
                      Executive Accomplishment Summary
                    </h4>
                    <p className="text-xs text-gray-700 dark:text-zinc-300 leading-relaxed whitespace-pre-wrap">
                      {selectedPostEvent.narrative_summary}
                    </p>
                  </div>
                )}

                {/* Dual Document Cards (Narrative + Liquidation) */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-900 dark:text-zinc-300">
                    Submitted Compliance Documents
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Narrative PDF Card */}
                    <div className="rounded-xl border border-border dark:border-border bg-gray-50/50 dark:bg-zinc-900/30 p-3.5 flex flex-col justify-between space-y-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-900 dark:text-zinc-100">
                          <HugeIcon className="ph-bold ph-file-text text-base text-pup-maroon dark:text-red-400" />
                          <span>Narrative Report</span>
                        </div>
                        <p className="text-[11px] text-gray-900 dark:text-zinc-300 truncate">
                          {selectedPostEvent.narrative_original_filename || "Narrative-Report.pdf"}
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        title="Preview Narrative Report"
                        className="w-full h-8 text-xs font-semibold rounded-lg border-border dark:border-border bg-white dark:bg-zinc-800 text-pup-maroon dark:text-red-400 hover:bg-gray-50 cursor-pointer"
                        onClick={() => {
                          handleOpenPdfPreview({
                            url: `/api/osas/post-event-reports/${selectedPostEvent.id}?file=narrative`,
                            title: `${selectedPostEvent.event_title} — Narrative Report`,
                            subtitle: "Official post-event narrative & accomplishment report.",
                            docType: "Post-Event Narrative",
                            originalFilename: selectedPostEvent.narrative_original_filename || "Narrative.pdf",
                          });
                        }}
                      >
                        Preview
                      </Button>
                    </div>

                    {/* Liquidation PDF Card */}
                    <div className="rounded-xl border border-border dark:border-border bg-gray-50/50 dark:bg-zinc-900/30 p-3.5 flex flex-col justify-between space-y-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-900 dark:text-zinc-100">
                          <HugeIcon className="ph-bold ph-receipt text-base text-emerald-600 dark:text-emerald-400" />
                          <span>Financial Liquidation</span>
                        </div>
                        <p className="text-[11px] text-gray-900 dark:text-zinc-300 truncate">
                          {selectedPostEvent.liquidation_original_filename || "Liquidation-Report.pdf"}
                        </p>
                      </div>
                      {selectedPostEvent.liquidation_storage_filename ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          title="Preview Financial Liquidation"
                          className="w-full h-8 text-xs font-semibold rounded-lg border-border dark:border-border bg-white dark:bg-zinc-800 text-emerald-600 dark:text-emerald-400 hover:bg-gray-50 cursor-pointer"
                          onClick={() => {
                            handleOpenPdfPreview({
                              url: `/api/osas/post-event-reports/${selectedPostEvent.id}?file=liquidation`,
                              title: `${selectedPostEvent.event_title} — Financial Liquidation`,
                              subtitle: "Official receipts, disbursement summary, and vouchers.",
                              docType: "Financial Liquidation",
                              originalFilename: selectedPostEvent.liquidation_original_filename || "Liquidation.pdf",
                            });
                          }}
                        >
                          Preview
                        </Button>
                      ) : (
                        <span className="text-[11px] text-gray-400 italic text-center py-1">No liquidation file</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Action Form: Update Status & Clearance Note */}
                <div className="rounded-xl border border-border dark:border-border bg-gray-50/50 dark:bg-zinc-900/30 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-zinc-300">
                      Clearance Evaluation & Action
                    </label>
                    <span className="text-[11px] text-gray-400 dark:text-zinc-500">
                      Current: <strong className="text-gray-700 dark:text-zinc-300">{selectedPostEvent.status}</strong>
                    </span>
                  </div>

                  {/* Warning when revoking Cleared */}
                  {selectedPostEvent.status === "Cleared" && (
                    <div className="rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/70 dark:bg-amber-950/20 p-3 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2.5">
                      <HugeIcon className="ph-bold ph-warning-circle text-base shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
                      <div className="space-y-0.5">
                        <p className="font-semibold">Reopening Cleared Report</p>
                        <p className="text-[11px] text-amber-700/90 dark:text-amber-400/90">
                          This report was previously cleared. A written justification note (at least 5 characters) is required to revoke clearance.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Warning when reopening Declined */}
                  {selectedPostEvent.status === "Declined" && (
                    <div className="rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/70 dark:bg-amber-950/20 p-3 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2.5">
                      <HugeIcon className="ph-bold ph-warning-circle text-base shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
                      <div className="space-y-0.5">
                        <p className="font-semibold">Reopening Declined Report</p>
                        <p className="text-[11px] text-amber-700/90 dark:text-amber-400/90">
                          A written justification note citing grounds for appeal or reconsideration is required to reopen this report.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Warning when setting Needs Revision */}
                  {postEventStatus === "Needs Revision" && (
                    <div className="rounded-xl border border-purple-200 dark:border-purple-900/50 bg-purple-50/70 dark:bg-purple-950/20 p-3 text-xs text-purple-800 dark:text-purple-300 flex items-start gap-2.5">
                      <HugeIcon className="ph-bold ph-info text-base shrink-0 text-purple-600 dark:text-purple-400 mt-0.5" />
                      <div className="space-y-0.5">
                        <p className="font-semibold">Revision Instructions Required</p>
                        <p className="text-[11px] text-purple-700/90 dark:text-purple-400/90">
                          Please describe what corrections, narrative additions, or expense vouchers the student organization must provide.
                        </p>
                      </div>
                    </div>
                  )}

                  <Select
                    value={postEventStatus}
                    onValueChange={(val) => {
                      setPostEventStatus(val);
                      if (!postEventNote.trim()) {
                        setPostEventNote(`Status updated to ${val} by OSAS clearance review.`);
                      }
                    }}
                    onChange={(e) => {
                      const val = e?.target?.value || e;
                      setPostEventStatus(val);
                      if (!postEventNote.trim()) {
                        setPostEventNote(`Status updated to ${val} by OSAS clearance review.`);
                      }
                    }}
                    usePortal={false}
                    className="h-10 text-xs font-semibold rounded-xl bg-white dark:bg-zinc-800 border-border dark:border-border text-gray-900 dark:text-zinc-100 shadow-none cursor-pointer"
                    buttonClassName="h-10 text-xs font-semibold rounded-xl bg-white dark:bg-zinc-800 border-border dark:border-border text-gray-900 dark:text-zinc-100"
                  >
                    {availablePostEventStatusOptions.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </Select>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className={cn("font-medium", isPostEventNoteRequired ? "text-pup-maroon dark:text-red-400" : "text-gray-900 dark:text-zinc-300")}>
                        Clearance Evaluation Remarks {isPostEventNoteRequired && "(Required, min 5 chars)"}
                      </span>
                      {isPostEventNoteRequired && (
                        <span className={cn("font-mono text-[10px]", isPostEventNoteValid ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400")}>
                          {postEventNote.trim().length} / 5 min
                        </span>
                      )}
                    </div>
                    <textarea
                      className={cn(
                        "min-h-24 w-full rounded-xl border bg-white p-3 text-xs text-gray-900 placeholder:text-gray-400 outline-none focus:ring-1 dark:bg-zinc-900 dark:text-zinc-100",
                        isPostEventNoteRequired && !isPostEventNoteValid
                          ? "border-amber-300 focus:border-amber-500 focus:ring-amber-500 dark:border-amber-700"
                          : "border-border focus:border-pup-maroon focus:ring-pup-maroon dark:border-border"
                      )}
                      placeholder={
                        isPostEventNoteRequired
                          ? "Enter required justification or revision instructions for student officers..."
                          : "Enter feedback or clearance remarks for student officers..."
                      }
                      value={postEventNote}
                      onChange={(e) => setPostEventNote(e.target.value)}
                    />
                  </div>

                  <Button
                    className="h-10 w-full text-xs font-semibold rounded-xl btn-brand-red text-white! bg-pup-maroon hover:bg-pup-darkMaroon shadow-xs cursor-pointer active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ color: "#ffffff" }}
                    onClick={() => savePostEvent()}
                    disabled={isSavingPostEvent || !isPostEventNoteValid}
                    title={`Publish Clearance Decision as ${postEventStatus}`}
                  >
                    {isSavingPostEvent ? (
                      <>
                        <HugeIcon className="ph-bold ph-spinner animate-spin mr-2" />
                        Saving...
                      </>
                    ) : postEventStatus === "Cleared" ? (
                      "Clear"
                    ) : postEventStatus === "Needs Revision" ? (
                      "Revise"
                    ) : postEventStatus === "Declined" ? (
                      "Decline"
                    ) : postEventStatus === "Under Review" ? (
                      "Review"
                    ) : (
                      "Update"
                    )}
                  </Button>
                </div>

                {/* Past Review Remarks if present */}
                {selectedPostEvent.review_notes && (
                  <div className="rounded-xl border border-border dark:border-border bg-white dark:bg-zinc-900/60 p-3.5 space-y-1">
                    <div className="flex items-center justify-between text-[11px] text-gray-400 dark:text-zinc-500">
                      <span>Last Evaluation by: <strong className="text-gray-700 dark:text-zinc-300">{selectedPostEvent.reviewer_name || "OSAS Officer"}</strong></span>
                      {selectedPostEvent.reviewed_at && (
                        <span className="font-mono">{new Date(selectedPostEvent.reviewed_at).toLocaleDateString()}</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-700 dark:text-zinc-300 leading-relaxed pt-1">
                      {selectedPostEvent.review_notes}
                    </p>
                  </div>
                )}
              </div>

              {/* Sheet Footer */}
              <SheetFooter className="shrink-0 p-4 border-t border-border dark:border-border bg-gray-50/50 dark:bg-zinc-900/30 flex justify-end">
                <Button
                  variant="outline"
                  onClick={() => setPostEventSheetOpen(false)}
                  className="h-9 px-4 text-xs font-semibold rounded-xl border border-border dark:border-border bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-xs cursor-pointer active:scale-95 transition-all"
                >
                  Close
                </Button>
              </SheetFooter>
            </>
          )}
        </SheetContent>
      </Sheet>

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
