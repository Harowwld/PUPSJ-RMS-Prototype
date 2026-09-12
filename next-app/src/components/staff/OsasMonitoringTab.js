"use client";

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

const STATUS_OPTIONS = [
  "Submitted",
  "Under Review",
  "Needs Revision",
  "Approved",
  "Declined",
];

const KANBAN_COLUMNS = [
  { key: "Submitted", label: "Submitted", icon: "ph-paper-plane-tilt" },
  { key: "Under Review", label: "Under Review", icon: "ph-magnifying-glass" },
  { key: "Needs Revision", label: "Needs Revision", icon: "ph-arrows-counter-clockwise" },
  { key: "Approved", label: "Approved", icon: "ph-check-circle" },
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
    return "bg-slate-100 text-slate-700 border-slate-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700";
  }
  if (s === "archived") {
    return "bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700";
  }
  return "bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700";
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

function FirstPagePreview({ proposalId, title, onOpenPreview }) {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let active = true;
    let page = null;
    let observer = null;

    if (!proposalId) {
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
        const response = await fetch(`/api/osas/event-proposals/${proposalId}?file=1`);
        if (!response.ok) {
          console.warn(`OSAS proposal preview returned status ${response.status}`);
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
        console.warn("Could not render OSAS proposal canvas preview:", error);
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
  }, [proposalId]);

  if (hasError) {
    return (
      <div className="space-y-2">
        <div
          ref={containerRef}
          className="relative flex min-h-[190px] w-full flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 bg-gray-50/80 p-5 text-center dark:border-white/10 dark:bg-zinc-900/60"
          aria-label={`Preview fallback for ${title}`}
        >
          <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-950/40 text-pup-maroon dark:text-red-400 flex items-center justify-center text-xl mb-2">
            <i className="ph-duotone ph-file-pdf"></i>
          </div>
          <p className="text-xs font-semibold text-gray-800 dark:text-zinc-200">Official Document On File</p>
          <p className="text-[11px] text-gray-400 dark:text-zinc-500 max-w-xs mt-0.5 mb-3">
            Canvas preview could not be rendered inline. You can preview or download the complete proposal PDF.
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onOpenPreview || (() => window.open(`/api/osas/event-proposals/${proposalId}?file=1`, "_blank"))}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-white dark:bg-zinc-800 border border-gray-200 dark:border-white/10 text-pup-maroon dark:text-red-400 hover:bg-gray-50 shadow-2xs cursor-pointer active:scale-95 transition-all"
          >
            <span>Preview PDF Document</span>
            <i className="ph-bold ph-eye text-xs"></i>
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
          "relative flex min-h-[220px] w-full items-center justify-center overflow-hidden rounded-xl border border-gray-200 bg-gray-50/80 p-2 dark:border-white/10 dark:bg-zinc-900/60 transition-all",
          onOpenPreview && "cursor-pointer hover:border-pup-maroon/40 hover:shadow-xs group"
        )}
        aria-label={`First-page preview of ${title}`}
      >
        {loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50/80 dark:bg-zinc-900/80 text-gray-400 dark:text-zinc-500">
            <i className="ph-bold ph-spinner animate-spin text-2xl mb-1.5 text-pup-maroon"></i>
            <span className="text-xs font-medium">Rendering document preview...</span>
          </div>
        )}
        <canvas ref={canvasRef} className="rounded shadow-xs max-h-[360px] object-contain group-hover:opacity-95 transition-opacity" />
        {onOpenPreview && !loading && (
          <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 text-white text-[11px] font-medium px-2.5 py-1 rounded-lg backdrop-blur-xs flex items-center gap-1 shadow-sm">
            <i className="ph-bold ph-magnifying-glass-plus"></i>
            <span>Click to Preview</span>
          </div>
        )}
      </div>
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-gray-400 dark:text-zinc-500">Page 1 of official proposal submission</span>
        <button
          type="button"
          onClick={onOpenPreview || (() => window.open(`/api/osas/event-proposals/${proposalId}?file=1`, "_blank"))}
          className="inline-flex items-center gap-1 text-xs font-semibold text-pup-maroon hover:underline dark:text-red-400 cursor-pointer"
        >
          <span>Preview Full PDF</span>
          <i className="ph-bold ph-eye text-xs"></i>
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

  const handleOpenPdfPreview = useCallback((proposal) => {
    if (!proposal?.id) return;
    setPdfPreviewData({
      url: `/api/osas/event-proposals/${proposal.id}?file=1`,
      title: proposal.title || "Event Proposal",
      subtitle: `Viewing official event proposal submitted by ${proposal.organization_name || proposal.student_name || "Organization"}.`,
      studentName: proposal.student_name,
      docType: "Event Proposal",
      originalFilename: proposal.original_filename || "Proposal.pdf",
    });
    setPdfPreviewOpen(true);
  }, []);

  const [viewMode, setViewMode] = useState("list"); // "list" | "kanban"
  const [status, setStatus] = useState("Submitted");
  const [note, setNote] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [page, setPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [draggingProposal, setDraggingProposal] = useState(null);
  const [dragOverColumn, setDragOverColumn] = useState(null);

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
      const res = await fetch("/api/osas/event-proposals", { cache: "no-store" });
      const json = await res.json();
      if (res.ok && json.ok) {
        setRows(json.data || []);
      } else {
        showToast?.(
          { title: "Load failed", description: json?.error || "Unable to load OSAS submissions." },
          true
        );
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

  const handleDrop = async (e, targetStatus) => {
    e.preventDefault();
    setDragOverColumn(null);
    const proposalToMove = draggingProposal;
    setDraggingProposal(null);

    if (!proposalToMove || proposalToMove.status === targetStatus) return;

    const prevStatus = proposalToMove.status;
    const proposalId = proposalToMove.id;

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

      // If moved to Needs Revision or Declined, automatically open review sheet for remarks
      if (targetStatus === "Needs Revision" || targetStatus === "Declined") {
        select({ ...proposalToMove, status: targetStatus });
      } else if (selected?.id === proposalId) {
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
      if (c[r.status] !== undefined) {
        c[r.status] += 1;
      }
    }
    return c;
  }, [rows]);

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

  const filteredRows = useMemo(() => {
    return rows.filter((item) => {
      if (statusFilter !== "All" && item.status !== statusFilter) return false;
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
  }, [rows, statusFilter, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / itemsPerPage));
  const safePage = Math.min(Math.max(1, page), totalPages);

  const paginatedRows = useMemo(() => {
    const start = (safePage - 1) * itemsPerPage;
    return filteredRows.slice(start, start + itemsPerPage);
  }, [filteredRows, safePage, itemsPerPage]);

  const getProposalsForColumn = (columnKey) => {
    return rows.filter((item) => {
      if (item.status !== columnKey) return false;
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

  if (loading) {
    return <OsasMonitoringSkeleton />;
  }

  const hasActiveFilters = Boolean(
    searchQuery || (viewMode === "list" && statusFilter !== "All")
  );

  return (
    <div className="font-inter w-full flex flex-1 flex-col h-full min-h-0 gap-6 focus:outline-none animate-fade-up select-none">
      {/* ONE Single Card Container encapsulating Header, Toolbar, Active Filters, Table & Kanban */}
      <Card className="flex h-auto w-full flex-col p-0 gap-0 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-card dark:shadow-none isolate font-inter mb-4 min-h-0 flex-1">
        {/* 1. Page Header */}
        <PageHeader
          icon="ph-calendar-check"
          title="OSAS Monitoring"
          description="Review student organization event proposals, evaluate compliance, and publish live status updates."
          showBorder={false}
          className="p-6"
          titleClassName="text-[18px] font-semibold tracking-[-0.01em] text-gray-900 dark:text-zinc-50"
          descriptionClassName="text-[13px] font-normal text-gray-500 dark:text-zinc-400 mt-[4px]"
          actions={
            <div className="flex items-center gap-3">
              {/* Segmented View Mode Toggle */}
              <div className="flex items-center gap-1 bg-gray-100/80 dark:bg-zinc-800/60 p-1 rounded-xl border border-gray-200/60 dark:border-white/5 shrink-0">
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
                  <i className="ph-bold ph-list-dashes text-sm"></i>
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
                  <i className="ph-bold ph-kanban text-sm"></i>
                  <span>Kanban</span>
                </button>
              </div>

              <div className="h-6 w-px bg-gray-200 dark:bg-zinc-800" />

              <RefreshButton onRefresh={load} isLoading={loading} title="Refresh Proposals" />
            </div>
          }
        />

        {/* 2. Embedded Navigation & Filter Toolbar */}
        <div className="border-t border-gray-100 dark:border-white/10 p-5 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 bg-gray-50/40 dark:bg-zinc-900/30">
          {/* Left: Status Filter Tabs (in List view) or Pipeline Count (in Kanban view) */}
          {viewMode === "list" ? (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
              {filterTabs.map((tab) => {
                const isActive = statusFilter === tab.key;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => {
                      setStatusFilter(tab.key);
                      setPage(1);
                    }}
                    className={cn(
                      "inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer border shrink-0",
                      isActive
                        ? "bg-pup-maroon text-white border-pup-maroon shadow-xs"
                        : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50 hover:text-gray-900 dark:bg-zinc-900 dark:text-zinc-400 dark:border-white/10 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
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
            <div className="text-xs text-gray-500 dark:text-zinc-400 flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 font-medium">
                <i className="ph-bold ph-kanban text-sm text-pup-maroon dark:text-red-400"></i>
                <span>Pipeline: <strong className="text-gray-900 dark:text-zinc-100">{rows.length}</strong> total proposals across stages</span>
              </span>
            </div>
          )}

          {/* Right: Search Input */}
          <div className="relative w-full md:w-80 shrink-0 group">
            <i className="ph-bold ph-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-zinc-500 text-xs pointer-events-none transition-colors group-focus-within:text-pup-maroon dark:group-focus-within:text-red-400"></i>
            <Input
              type="text"
              placeholder="Search proposals, students, orgs..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              className="h-9 pl-8 pr-8 text-xs rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-100 placeholder:text-gray-400 dark:placeholder:text-zinc-500 shadow-none focus-visible:outline-none focus-visible:border-pup-maroon focus-visible:ring-1 focus-visible:ring-pup-maroon dark:focus-visible:border-red-500/80 dark:focus-visible:ring-red-500/80"
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
                <i className="ph-bold ph-x text-xs"></i>
              </button>
            )}
          </div>
        </div>

        {/* 3. Active Filter Chips Row */}
        {hasActiveFilters && (
          <div className="flex-none border-t border-gray-100 dark:border-white/10 bg-white dark:bg-card px-6 py-2.5 animate-in fade-in slide-in-from-top-1 duration-normal">
            <div className="flex flex-wrap items-center gap-2">
              <span className="mr-1 text-[11px] font-medium uppercase tracking-[0.04em] text-gray-400 dark:text-zinc-500">
                Active filters:
              </span>
              {searchQuery && (
                <div className="flex items-center gap-[6px] rounded-lg bg-gray-100 dark:bg-zinc-800 px-[10px] py-[4px] text-[12px] font-normal text-gray-900 dark:text-zinc-50">
                  Search: {searchQuery}
                  <button
                    onClick={() => {
                      setSearchQuery("");
                      setPage(1);
                    }}
                    className="text-[12px] text-gray-400 hover:text-gray-600 dark:text-zinc-500 dark:hover:text-zinc-300 transition-colors cursor-pointer border-0 bg-transparent p-0 leading-none"
                  >
                    ×
                  </button>
                </div>
              )}
              {viewMode === "list" && statusFilter !== "All" && (
                <div className="flex items-center gap-[6px] rounded-lg bg-gray-100 dark:bg-zinc-800 px-[10px] py-[4px] text-[12px] font-normal text-gray-900 dark:text-zinc-50">
                  Status: {statusFilter}
                  <button
                    onClick={() => {
                      setStatusFilter("All");
                      setPage(1);
                    }}
                    className="text-[12px] text-gray-400 hover:text-gray-600 dark:text-zinc-500 dark:hover:text-zinc-300 transition-colors cursor-pointer border-0 bg-transparent p-0 leading-none"
                  >
                    ×
                  </button>
                </div>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchQuery("");
                  setStatusFilter("All");
                  setPage(1);
                }}
                className="h-auto text-[12px] font-medium text-gray-400 dark:text-zinc-500 border-0 bg-transparent hover:bg-transparent shadow-none p-0 hover:text-red-600 dark:hover:text-red-500 transition-colors cursor-pointer"
              >
                Clear
              </Button>
            </div>
          </div>
        )}

        {/* 4. Full-Width Seamless Content: Table List View OR Kanban Board */}
        {viewMode === "list" && (
          <div className={cn("w-full flex flex-col flex-1 min-h-0 border-t border-gray-100 dark:border-white/10", filteredRows.length === 0 && "rounded-b-2xl overflow-hidden")}>
            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 z-10 border-b border-gray-100 dark:border-white/10 bg-white dark:bg-card">
                  <tr className="text-left text-[12px] font-medium tracking-[0.04em] text-[#8E8E93] dark:text-zinc-500">
                    <th className="py-3.5 px-6 w-full min-w-[280px]">Event Proposal & Organization</th>
                    <th className="py-3.5 px-6 min-w-[180px] whitespace-nowrap">Proponent</th>
                    <th className="py-3.5 px-6 min-w-[130px] whitespace-nowrap">Status</th>
                    <th className="py-3.5 px-6 min-w-[120px] whitespace-nowrap hidden sm:table-cell">Submitted</th>
                    <th className="py-3.5 px-6 text-right w-28 whitespace-nowrap">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-white/5 bg-white dark:bg-card">
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
                        <div className="text-[11px] text-gray-500 dark:text-zinc-400 mt-0.5 truncate">
                          {item.organization_name}
                        </div>
                      </td>
                      <td className="py-3.5 px-6 whitespace-nowrap">
                        <div className="font-medium text-gray-800 dark:text-zinc-200">
                          {item.student_name}
                        </div>
                        <div className="font-mono text-[11px] text-gray-400 dark:text-zinc-500">
                          {item.student_no}
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
                      <td className="py-3.5 px-6 whitespace-nowrap hidden sm:table-cell text-gray-500 dark:text-zinc-400 text-[11px]">
                        {item.created_at
                          ? new Date(item.created_at).toLocaleDateString(undefined, {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })
                          : "—"}
                      </td>
                      <td className="py-3.5 px-6 text-right whitespace-nowrap w-28">
                        <Button
                          size="sm"
                          className="h-8 px-4 text-xs font-semibold rounded-lg btn-brand-red text-white! bg-pup-maroon hover:bg-pup-darkMaroon shadow-xs cursor-pointer active:scale-95 transition-all"
                          style={{ color: "#ffffff" }}
                          onClick={(e) => {
                            e.stopPropagation();
                            select(item);
                          }}
                        >
                          Review
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {!filteredRows.length && (
                    <tr>
                      <td colSpan={5} className="py-16 px-6 text-center">
                        <div className="flex flex-col items-center justify-center">
                          <div className="w-16 h-16 rounded-full bg-gray-50 dark:bg-zinc-800/60 border border-gray-200 dark:border-white/10 flex items-center justify-center mb-3">
                            <i className="ph-duotone ph-tray text-2xl text-gray-400 dark:text-zinc-500"></i>
                          </div>
                          <p className="text-base font-semibold text-gray-900 dark:text-zinc-100">
                            {searchQuery ? "No event proposals match your search." : "No event proposals in this view."}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-zinc-400 mt-1 max-w-sm">
                            {searchQuery
                              ? `No proposals found matching "${searchQuery}". Try searching with a different term.`
                              : "There are currently no proposals in this category."}
                          </p>
                          {searchQuery && (
                            <button
                              type="button"
                              onClick={() => {
                                setSearchQuery("");
                                setPage(1);
                              }}
                              className="mt-3 text-xs font-semibold text-pup-maroon hover:underline dark:text-red-400 cursor-pointer"
                            >
                              Clear search query
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* VIEW MODE 2: Kanban Pipeline Board */}
        {viewMode === "kanban" && (
          <div className="w-full flex-1 min-h-0 border-t border-gray-100 dark:border-white/10 p-6 overflow-x-auto bg-gray-50/20 dark:bg-zinc-900/10">
            <div className="flex gap-4 min-w-max items-start">
              {KANBAN_COLUMNS.map((col) => {
                const columnItems = getProposalsForColumn(col.key);
                return (
                  <div
                    key={col.key}
                    onDragOver={(e) => {
                      e.preventDefault();
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
                      "w-72 sm:w-80 shrink-0 flex flex-col rounded-2xl bg-gray-50/80 dark:bg-zinc-900/50 border border-gray-200/80 dark:border-white/10 p-3.5 shadow-2xs transition-all duration-200",
                      dragOverColumn === col.key && draggingProposal?.status !== col.key && "ring-2 ring-pup-maroon/60 border-pup-maroon/70 bg-red-50/30 dark:bg-red-950/20 shadow-sm"
                    )}
                  >
                    {/* Column Header */}
                    <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-gray-200/80 dark:border-white/10 select-none">
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

                    {/* Drop Target Indicator */}
                    {dragOverColumn === col.key && draggingProposal?.status !== col.key && (
                      <div className="mb-2.5 rounded-xl border-2 border-dashed border-pup-maroon/50 dark:border-red-500/50 p-2.5 bg-red-50/40 dark:bg-red-950/20 text-center text-xs font-semibold text-pup-maroon dark:text-red-400 animate-pulse select-none">
                        Drop to move to {col.label}
                      </div>
                    )}

                    {/* Column Cards Container */}
                    <div className="space-y-2.5 overflow-y-auto max-h-[calc(100vh-340px)] p-0.5 scrollbar-thin">
                      {columnItems.map((item) => (
                        <div
                          key={item.id}
                          draggable={true}
                          onDragStart={(e) => {
                            setDraggingProposal(item);
                            e.dataTransfer.setData("text/plain", String(item.id));
                            e.dataTransfer.effectAllowed = "move";
                          }}
                          onDragEnd={() => {
                            setDraggingProposal(null);
                            setDragOverColumn(null);
                          }}
                          onClick={() => select(item)}
                          className={cn(
                            "group relative rounded-xl border border-gray-200 bg-white p-3.5 shadow-2xs hover:shadow-md hover:border-pup-maroon/40 dark:border-white/10 dark:bg-card dark:hover:border-red-800/40 transition-all cursor-grab active:cursor-grabbing flex flex-col gap-2.5 active:scale-[0.99] select-none",
                            draggingProposal?.id === item.id && "opacity-35 scale-[0.97] border-dashed border-pup-maroon/60"
                          )}
                        >
                          {/* Card Header: Org Tag & Drag Handle */}
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-pup-maroon dark:text-red-400 bg-red-50 dark:bg-red-950/30 px-2 py-0.5 rounded border border-pup-maroon/15 truncate max-w-[190px]">
                              {item.organization_name}
                            </span>
                            <i
                              className="ph-bold ph-dots-six-vertical text-gray-300 dark:text-zinc-600 group-hover:text-gray-500 dark:group-hover:text-zinc-400 text-sm transition-colors shrink-0"
                              title="Drag to change stage"
                            />
                          </div>

                          {/* Proposal Title */}
                          <h4 className="text-xs font-bold text-gray-900 dark:text-zinc-100 group-hover:text-pup-maroon dark:group-hover:text-red-400 transition-colors line-clamp-2 leading-snug">
                            {item.title}
                          </h4>

                          {/* Proponent info */}
                          <div className="flex items-center gap-1.5 text-[11px] text-gray-500 dark:text-zinc-400">
                            <i className="ph-bold ph-user text-gray-400 text-xs shrink-0"></i>
                            <span className="truncate font-medium text-gray-700 dark:text-zinc-300">{item.student_name}</span>
                            <span className="text-gray-300 dark:text-zinc-600">·</span>
                            <span className="font-mono text-[10px] shrink-0">{item.student_no}</span>
                          </div>

                          {/* Card Footer: Submitted Date & Review */}
                          <div className="pt-2 border-t border-gray-100 dark:border-white/5 flex items-center justify-between text-[11px] text-gray-500 dark:text-zinc-400">
                            <span className="inline-flex items-center gap-1.5 text-[11px] text-gray-400 dark:text-zinc-500 font-normal">
                              <i className="ph ph-clock text-xs text-gray-400 dark:text-zinc-500"></i>
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
                      ))}

                      {!columnItems.length && (
                        <div className="rounded-xl border border-dashed border-gray-200 dark:border-zinc-800 bg-white/40 dark:bg-zinc-900/20 py-8 px-3 text-center">
                          <p className="text-xs text-gray-400 dark:text-zinc-500 font-medium">
                            No proposals in this stage
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 5. Apple HIG Pagination Footer */}
        {viewMode === "list" ? (
          filteredRows.length > 0 && (
            <div className="flex items-center justify-between border-t border-[#e5e5ea] dark:border-[#3a3a3c] bg-white dark:bg-[#1c1c1e] p-4 px-6 rounded-b-2xl mt-auto select-none">
              <div className="flex items-center gap-6 text-xs text-gray-500 dark:text-zinc-400 select-none">
                <span>
                  Showing {paginatedRows.length} of {filteredRows.length.toLocaleString()}
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
                  className="text-xs text-gray-500 dark:text-zinc-400 disabled:opacity-40 cursor-pointer rounded-xl h-8 px-3"
                >
                  Prev
                </Button>

                <div className="h-8 w-8 rounded-xl border border-[#e5e5ea] dark:border-zinc-800 flex items-center justify-center text-xs font-bold text-gray-800 dark:text-zinc-200 bg-white dark:bg-zinc-900">
                  {safePage}
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  disabled={safePage >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="text-xs text-gray-500 dark:text-zinc-400 disabled:opacity-40 cursor-pointer rounded-xl h-8 px-3"
                >
                  Next
                </Button>
              </div>
            </div>
          )
        ) : (
          <div className="flex items-center justify-between border-t border-gray-100 dark:border-white/10 bg-white dark:bg-card px-6 py-3.5 rounded-b-2xl mt-auto text-xs text-gray-500 dark:text-zinc-400 select-none">
            <span>
              Showing {filteredRows.length} of {rows.length} {rows.length === 1 ? "proposal" : "proposals"}
            </span>
            <span className="text-[11px] text-gray-400 dark:text-zinc-500">
              Drag cards between stages to update status, or click to review
            </span>
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
          className="w-full sm:max-w-xl md:max-w-2xl data-[side=right]:sm:max-w-xl data-[side=right]:md:max-w-2xl flex flex-col h-full bg-white dark:bg-card border-l border-gray-200 dark:border-white/10 p-0 shadow-2xl font-inter overflow-hidden"
        >
          {selected && (
            <>
              {/* Sheet Header */}
              <SheetHeader className="shrink-0 p-6 pb-4 pr-14 border-b border-gray-100 dark:border-white/10 bg-gradient-to-r from-gray-50/90 via-white to-gray-50/50 dark:from-zinc-900/90 dark:via-card dark:to-zinc-900/50">
                <div className="flex items-start gap-3.5">
                  <div className="w-11 h-11 rounded-xl bg-pup-maroon/10 text-pup-maroon dark:bg-red-950/40 dark:text-red-400 flex items-center justify-center text-xl shrink-0 shadow-xs">
                    <i className="ph-bold ph-file-text"></i>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-pup-maroon dark:text-red-400 bg-red-50 dark:bg-red-950/30 px-2 py-0.5 rounded-md border border-pup-maroon/20">
                        {selected.organization_name}
                      </span>
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
                    <SheetDescription className="mt-1 text-xs text-gray-500 dark:text-zinc-400 flex items-center gap-2">
                      <span>Proponent: <strong className="text-gray-700 dark:text-zinc-300">{selected.student_name}</strong></span>
                      <span>·</span>
                      <span className="font-mono">{selected.student_no}</span>
                    </SheetDescription>
                  </div>
                </div>
              </SheetHeader>

              {/* Sheet Body (Scrollable) */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Document Preview Section */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-zinc-400">
                    Official Proposal Document
                  </h4>
                  <FirstPagePreview
                    proposalId={selected.id}
                    title={selected.title}
                    onOpenPreview={() => handleOpenPdfPreview(selected)}
                  />
                </div>

                {/* Action Form: Update Status & Publish Note */}
                <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-zinc-900/30 p-4 space-y-3">
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
                      if (!note.trim()) {
                        setNote(`Status updated to ${val} by OSAS.`);
                      }
                    }}
                    usePortal={false}
                    className="h-10 text-xs font-semibold rounded-xl bg-white dark:bg-zinc-800 border-gray-200 dark:border-white/10 text-gray-900 dark:text-zinc-100 shadow-none cursor-pointer"
                    buttonClassName="h-10 text-xs font-semibold rounded-xl bg-white dark:bg-zinc-800 border-gray-200 dark:border-white/10 text-gray-900 dark:text-zinc-100"
                  >
                    {STATUS_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </Select>

                  <textarea
                    className="min-h-24 w-full rounded-xl border border-gray-200 bg-white p-3 text-xs text-gray-900 placeholder:text-gray-400 outline-none focus:border-pup-maroon focus:ring-1 focus:ring-pup-maroon dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-100"
                    placeholder="Enter student-visible evaluation note (optional, default note applied if left empty)..."
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                  />

                  {/* Primary Action: Publish Update with Brand Maroon */}
                  <Button
                    className="h-10 w-full text-xs font-semibold rounded-xl btn-brand-red text-white! bg-pup-maroon hover:bg-pup-darkMaroon shadow-xs cursor-pointer active:scale-95 transition-all"
                    style={{ color: "#ffffff" }}
                    onClick={() => save()}
                    disabled={isSaving}
                  >
                    {isSaving ? (
                      <>
                        <i className="ph-bold ph-spinner animate-spin mr-2"></i>
                        Publishing...
                      </>
                    ) : (
                      `Publish Update to ${status}`
                    )}
                  </Button>
                </div>

                {/* Transaction History Timeline */}
                {selected.updates?.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-zinc-400">
                      Transaction History ({selected.updates.length})
                    </h4>
                    <ol className="relative border-l border-gray-200 ml-2.5 pl-4 text-xs space-y-4 dark:border-zinc-800">
                      {selected.updates.map((update) => (
                        <li key={update.id} className="relative">
                          <div
                            className={cn(
                              "absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-zinc-900",
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
                          <p className="text-xs text-gray-700 dark:text-zinc-300 leading-relaxed bg-white dark:bg-zinc-900/60 p-2.5 rounded-lg border border-gray-100 dark:border-white/5">
                            {update.message}
                          </p>
                        </li>
                      ))}
                    </ol>
                  </div>
                )}
              </div>

              {/* Sheet Footer */}
              <SheetFooter className="shrink-0 p-4 border-t border-gray-100 dark:border-white/10 bg-gray-50/50 dark:bg-zinc-900/30 flex justify-end">
                <Button
                  variant="outline"
                  onClick={() => setSheetOpen(false)}
                  className="h-9 px-4 text-xs font-semibold rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-xs cursor-pointer active:scale-95 transition-all"
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
