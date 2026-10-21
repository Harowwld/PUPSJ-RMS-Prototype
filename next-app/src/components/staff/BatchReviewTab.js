"use client";
import HugeIcon from "@/components/shared/HugeIcon";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TooltipProvider } from "@/components/ui/tooltip";
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyMedia,
} from "@/components/ui/empty";
import PageHeader from "@/components/shared/PageHeader";
import { RefreshButton } from "@/components/shared/RefreshButton";
import BatchReviewSkeleton from "@/components/staff/skeletons/BatchReviewSkeleton";
import MultiCriteriaFilter from "@/components/shared/MultiCriteriaFilter";
import ActiveFilterChips from "@/components/shared/ActiveFilterChips";
import { cn } from "@/lib/utils";
import { formatErrorMessage } from "@/lib/errorUtils";
import { getAdjacentRowId, getBulkActionSkipReason, getRangeIds, getRowClickSelection } from "@/lib/batchReviewSelection";

const STATUS_TABS = [
  { id: "Needs Review", label: "Needs Review" },
  { id: "Confirmed", label: "Confirmed" },
  { id: "Failed", label: "Failed" },
  { id: "", label: "All" },
];
const PAGE_SIZE = 50;

function readStudentCandidates(value) {
  if (Array.isArray(value)) return value;
  if (typeof value !== "string") return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

const REGION_LABELS = {
  firstName: { label: "First name", color: "#2563eb" },
  middleName: { label: "Middle name", color: "#9333ea" },
  lastName: { label: "Last name", color: "#dc2626" },
};

export default function BatchReviewTab({ showToast = () => {}, students = [], docTypes = [] }) {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [statusFilters, setStatusFilters] = useState(["Needs Review"]);
  const [docTypeFilters, setDocTypeFilters] = useState([]);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [clearingAll, setClearingAll] = useState(false);
  const [note, setNote] = useState("");
  const [studentAssignmentQuery, setStudentAssignmentQuery] = useState("");
  const [fullscreenPreview, setFullscreenPreview] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [loadingMore, setLoadingMore] = useState(false);
  const [bulkAction, setBulkAction] = useState("");
  const [confirmBulkDismiss, setConfirmBulkDismiss] = useState(false);
  const [bulkResults, setBulkResults] = useState(null);
  const listRef = useRef(null);
  const rowRefs = useRef(new Map());
  const rowsRef = useRef([]);
  const selectionAnchorId = useRef(null);
  const requestVersion = useRef(0);

  const selected = useMemo(() => rows.find((row) => Number(row.id) === Number(selectedId)) || null, [rows, selectedId]);

  const load = useCallback(async ({ append = false, preserveSelection = false, fallbackIndex = 0, statusFilterOverride } = {}) => {
    const version = ++requestVersion.current;
    if (append) setLoadingMore(true);
    else setLoading(true);
    try {
      const params = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String(append ? rowsRef.current.length : 0) });
      const effectiveStatuses = statusFilterOverride ?? statusFilters;
      if (effectiveStatuses.length > 0) params.set("status", effectiveStatuses.join(","));
      if (docTypeFilters.length > 0) params.set("docType", docTypeFilters.join(","));
      if (query.trim()) params.set("q", query.trim());
      const response = await fetch(`/api/ingest/review?${params}`, { cache: "no-store" });
      const json = await response.json().catch(() => null);
      if (!response.ok || !json?.ok) throw new Error(json?.error || "Unable to load review queue");
      if (version !== requestVersion.current) return;
      const nextRows = json.data?.rows || [];
      rowsRef.current = append ? [...rowsRef.current, ...nextRows] : nextRows;
      setRows(rowsRef.current);
      setTotal(Number(json.data?.total || 0));
      if (!append && !preserveSelection) {
        setSelectedId((current) => nextRows.some((row) => Number(row.id) === Number(current)) ? current : nextRows[0]?.id || null);
        setSelectedIds([]);
        selectionAnchorId.current = null;
      } else if (!append && Number.isInteger(fallbackIndex)) {
        setSelectedId((current) => nextRows.some((row) => Number(row.id) === Number(current)) ? current : nextRows[Math.min(fallbackIndex, nextRows.length - 1)]?.id || null);
      }
      if (!append && preserveSelection) {
        const availableIds = new Set(nextRows.map((row) => Number(row.id)));
        setSelectedIds((current) => current.filter((id) => availableIds.has(Number(id))));
      }
    } catch (error) {
      if (version !== requestVersion.current) return;
      showToast(
        formatErrorMessage(error, {
          title: "Review Queue Failed",
          actionContext: "Loading review queue items",
        }),
        true
      );
    } finally {
      if (version === requestVersion.current) {
        setLoading(false);
        setLoadingMore(false);
      }
    }
  }, [query, showToast, statusFilters, docTypeFilters]);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) load();
    });
    return () => { cancelled = true; };
  }, [load]);

  const loadMore = useCallback(() => {
    if (loading || loadingMore || rows.length >= total) return;
    load({ append: true });
  }, [load, loading, loadingMore, rows.length, total]);

  useEffect(() => {
    const element = listRef.current;
    if (!element || loading || loadingMore || rows.length >= total || element.scrollHeight > element.clientHeight + 1) return undefined;
    const frame = requestAnimationFrame(() => loadMore());
    return () => cancelAnimationFrame(frame);
  }, [loadMore, loading, loadingMore, rows.length, total]);

  const selectRange = useCallback((targetId) => {
    setSelectedIds(getRangeIds(rows, selectionAnchorId.current || selectedId, targetId));
  }, [rows, selectedId]);

  const focusRow = useCallback((id) => {
    setSelectedId(id);
    const rowData = rows.find((row) => Number(row.id) === Number(id));
    setNote(rowData?.review_note || "");
    setStudentAssignmentQuery("");
    const row = rowRefs.current.get(Number(id));
    row?.scrollIntoView({ block: "nearest" });
    row?.focus({ preventScroll: true });
  }, [rows]);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (!selectedId || bulkAction || confirmBulkDismiss || bulkResults || fullscreenPreview || event.altKey) return;
      const target = event.target;
      const tagName = target?.tagName?.toLowerCase();
      const isQueueRow = target?.closest?.("[data-review-row]");
      if (target?.isContentEditable || ["input", "textarea", "select"].includes(tagName) || (tagName === "button" && !isQueueRow) || target?.getAttribute?.("role") === "combobox") return;

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "a") {
        event.preventDefault();
        event.stopPropagation();
        setSelectedIds(rows.map((row) => row.id));
        selectionAnchorId.current = selectedId;
        return;
      }
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        setSelectedIds([]);
        selectionAnchorId.current = null;
        return;
      }
      if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
      const nextId = getAdjacentRowId(rows, selectedId, event.key === "ArrowDown" ? "down" : "up");
      if (nextId === null) return;
      event.preventDefault();
      event.stopPropagation();
      if (event.shiftKey) {
        if (!selectionAnchorId.current) selectionAnchorId.current = selectedId;
        selectRange(nextId);
      } else {
        selectionAnchorId.current = nextId;
        setSelectedIds([nextId]);
      }
      focusRow(nextId);
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [bulkAction, bulkResults, confirmBulkDismiss, focusRow, fullscreenPreview, rows, selectRange, selectedId]);

  useEffect(() => {
    let source = null;
    let retryTimer = null;
    let disposed = false;

    const connect = () => {
      if (typeof window === "undefined" || !("EventSource" in window)) return;
      try {
        source = new EventSource("/api/ingest/events");
        source.addEventListener("ingest", () => {
          load({ preserveSelection: true });
        });
        source.onerror = () => {
          source?.close();
          if (disposed) return;
          retryTimer = setTimeout(connect, 5000);
        };
      } catch {
        // Fallback to manual refresh
      }
    };

    connect();
    return () => {
      disposed = true;
      clearTimeout(retryTimer);
      source?.close();
    };
  }, [load]);

  const handleClearAllFailed = async () => {
    setClearingAll(true);
    try {
      const response = await fetch("/api/ingest/review?status=Failed", {
        method: "DELETE",
      });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.ok) {
        throw new Error(data?.error || "Failed to clear failed documents");
      }
      showToast({
        title: "Failed Documents Cleared",
        description: `Successfully cleared ${data.clearedCount || 0} failed document(s).`,
      });
      setSelectedId(null);
      await load();
    } catch (err) {
      showToast(
        formatErrorMessage(err, {
          title: "Clear Queue Failed",
          actionContext: "Clearing failed documents from review queue",
        }),
        true
      );
    } finally {
      setClearingAll(false);
    }
  };

  const filterGroups = useMemo(() => [
    {
      id: "status",
      label: "Review Status",
      options: [
        { value: "Needs Review", label: "Needs Review", indicatorColor: "bg-amber-500" },
        { value: "Confirmed", label: "Confirmed", indicatorColor: "bg-emerald-500" },
        { value: "Failed", label: "Failed", indicatorColor: "bg-rose-500" },
        { value: "Processing", label: "Processing", indicatorColor: "bg-blue-500" },
      ],
    },
    {
      id: "docType",
      label: "Document Type",
      options: (docTypes || []).map((t) => ({ value: t, label: t })),
    },
  ], [docTypes]);

  const filterValues = useMemo(() => ({
    status: statusFilters,
    docType: docTypeFilters,
  }), [statusFilters, docTypeFilters]);

  const handleFilterChange = useCallback((groupId, values) => {
    if (groupId === "status") {
      setStatusFilters(values);
    } else if (groupId === "docType") {
      setDocTypeFilters(values);
    }
  }, []);

  const handleClearFilters = useCallback(() => {
    setQuery("");
    setStatusFilters([]);
    setDocTypeFilters([]);
  }, []);


  const activeChips = useMemo(() => {
    const chips = [];
    if (query.trim()) {
      chips.push({
        id: "search",
        label: `Search: ${query.trim()}`,
        onRemove: () => { setQuery(""); },
      });
    }
    statusFilters.forEach((st) => {
      const label = st;
      chips.push({
        id: `status-${st}`,
        label: `Status: ${label}`,
        onRemove: () => {
          setStatusFilters((prev) => prev.filter((s) => s !== st));
        },
      });
    });
    docTypeFilters.forEach((dt) => {
      chips.push({
        id: `docType-${dt}`,
        label: `Type: ${dt}`,
        onRemove: () => {
          setDocTypeFilters((prev) => prev.filter((t) => t !== dt));
        },
      });
    });
    return chips;
  }, [query, statusFilters, docTypeFilters]);

  const action = async (kind, body = {}) => {
    if (!selected) return;
    const actionId = selected.id;
    setSaving(true);
    try {
      const response = await fetch(`/api/ingest/review/${selected.id}/${kind}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await response.json().catch(() => null);
      if (!response.ok || !json?.ok) throw new Error(json?.error || `${kind} failed`);
      if (kind === "retry") {
        // Retry changes review_status to Processing. Keep it visible instead
        // of letting the current Needs Review filter make it look deleted.
        setStatusFilters([]);
        setSelectedId(actionId);
      }
      showToast({
        title: kind === "confirm" ? "Document Confirmed" : kind === "reject" ? "Document Rejected" : "OCR Retry Started",
        description: kind === "retry" ? "This document remains visible while OCR is processing." : "The review queue was updated.",
      });
      if (kind !== "retry") await load();
    } catch (error) {
      showToast(
        formatErrorMessage(error, {
          title: "Review Action Failed",
          actionContext: `${kind === "confirm" ? "Confirming" : kind === "reject" ? "Rejecting" : "Retrying"} document ${actionId}`,
        }),
        true
      );
    } finally {
      setSaving(false);
    }
  };

  const runBulkAction = async (kind, { confirmed = false } = {}) => {
    if (kind === "dismiss" && !confirmed) {
      setConfirmBulkDismiss(true);
      return;
    }
    const batch = rows.filter((row) => selectedIds.some((id) => Number(id) === Number(row.id)));
    if (batch.length === 0) return;
    const fallbackIndex = Math.max(0, rows.findIndex((row) => Number(row.id) === Number(selectedId)));
    setBulkAction(kind);
    setConfirmBulkDismiss(false);
    const results = [];
    for (const row of batch) {
      const reason = getBulkActionSkipReason(kind, row);
      if (reason) {
        results.push({ id: row.id, filename: row.original_filename, status: "Skipped", detail: reason });
        continue;
      }
      try {
        const student = students.find((candidate) => String(candidate.studentNo || candidate.student_no) === String(row.staff_selected_student_no || ""));
        const body = kind === "confirm"
          ? { studentNo: row.staff_selected_student_no, studentName: student?.name || row.ocr_name || "", docType: row.proposed_doc_type }
          : kind === "dismiss"
            ? { reason: String(row.review_status || "").toLowerCase() === "failed" ? "Dismissed from failed review" : "Rejected during review" }
            : {};
        const endpointAction = kind === "dismiss" ? "reject" : kind;
        const response = await fetch(`/api/ingest/review/${row.id}/${endpointAction}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const json = await response.json().catch(() => null);
        if (!response.ok || !json?.ok) throw new Error(json?.error || `${kind} failed`);
        results.push({ id: row.id, filename: row.original_filename, status: "Completed", detail: "" });
      } catch (error) {
        results.push({ id: row.id, filename: row.original_filename, status: "Failed", detail: error.message });
      }
    }
    setSelectedIds([]);
    selectionAnchorId.current = null;
    if (kind === "retry") {
      setStatusFilters([]);
      await load({ fallbackIndex, statusFilterOverride: [] });
    } else {
      await load({ fallbackIndex });
    }
    setBulkResults({ action: kind, items: results });
    setBulkAction("");
  };

  const update = async (patch) => {
    if (!selected) return;
    const response = await fetch(`/api/ingest/review/${selected.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    const json = await response.json().catch(() => null);
    if (!response.ok || !json?.ok) throw new Error(json?.error || "Unable to save review changes");
    await load();
  };

  const previewUrl = selected ? `/api/ingest/hot-folder/${selected.id}/file` : "";
  const isImage = selected?.mime_type?.startsWith("image/");
  const openFullscreenPreview = () => setFullscreenPreview({
    src: previewUrl,
    isImage,
    title: selected?.original_filename || "Scanned document",
  });
  const ocrRegions = selected?.ocr_regions && typeof selected.ocr_regions === "object" ? selected.ocr_regions : {};
  const ocrStudentCandidates = useMemo(
    () => readStudentCandidates(selected?.ocr_student_candidates),
    [selected?.ocr_student_candidates],
  );
  const assignedStudent = students.find(
    (student) => String(student.studentNo || student.student_no) === String(selected?.staff_selected_student_no || ""),
  );
  const assignmentStudents = useMemo(() => {
    const search = studentAssignmentQuery.trim().toLowerCase();
    if (!search) return [];
    return students.filter((student) =>
      [student.name, student.studentNo || student.student_no].some((value) =>
        String(value || "").toLowerCase().includes(search)
      )
    );
  }, [studentAssignmentQuery, students]);

  return (
    <TooltipProvider delayDuration={200}>
      <div className="font-jakarta w-full h-full min-h-0 min-w-0 flex flex-1 flex-col focus:outline-none animate-fade-up">
        {/* ONE Single Card Container */}
        <Card className="flex h-full min-h-0 min-w-0 w-full flex-col p-0 gap-0 overflow-hidden rounded-2xl border border-border bg-white shadow-sm dark:border-border dark:bg-card dark:shadow-none isolate font-jakarta flex-1">
          <PageHeader
            icon="ph-check-square"
            title="Batch Review"
            description="Assign a student and document type before creating formal records."
            showBorder={false}
            className="p-1.5 sm:p-6"
            titleClassName="text-[18px] font-semibold tracking-[-0.01em] text-gray-900 dark:text-zinc-50"
            descriptionClassName="text-[13px] font-normal text-gray-900 dark:text-zinc-300 mt-[4px] max-md:hidden"
            actions={
              <div className="flex items-center gap-2">
                {statusFilters.length === 1 && statusFilters[0] === "Failed" && total > 0 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={clearingAll || loading}
                    onClick={handleClearAllFailed}
                    className="h-10 px-4 text-xs font-semibold rounded-xl border border-rose-200 dark:border-rose-900/40 bg-rose-50/60 dark:bg-rose-950/20 text-rose-700 dark:text-rose-400 hover:bg-rose-100/70 dark:hover:bg-rose-950/40 shadow-xs cursor-pointer active:scale-95 transition-all disabled:opacity-40"
                  >
                    {clearingAll ? "Clearing..." : "Clear All Failed"}
                  </Button>
                )}
                <RefreshButton
                  onRefresh={load}
                  isLoading={loading}
                  title="Refresh Review Queue"
                />
              </div>
            }
          />

          {/* Navigation Toolbar */}
          <div className="shrink-0 border-t border-border dark:border-border p-1.5 sm:p-5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-1.5 sm:gap-4 bg-gray-50/40 dark:bg-zinc-900/30">
            {/* Left: Status Line Tabs */}
            <div className="flex items-center gap-4 sm:gap-6 min-w-0 select-none overflow-x-auto">
              {STATUS_TABS.map((item) => {
                const isActive = item.id === ""
                  ? statusFilters.length === 0
                  : statusFilters.length === 1 && statusFilters[0] === item.id;
                return (
                  <button
                    key={item.id || "all"}
                    type="button"
                    onClick={() => {
                      setStatusFilters(item.id ? [item.id] : []);
                    }}
                    className={cn(
                      "relative h-9 flex items-center text-[13px] font-semibold transition-colors focus:outline-none cursor-pointer border-0 bg-transparent whitespace-nowrap",
                      isActive
                        ? "text-gray-900 dark:text-zinc-50 after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-full after:bg-gray-900 dark:after:bg-zinc-50"
                        : "text-[#8E8E93] font-normal hover:text-gray-700 dark:hover:text-zinc-200"
                    )}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>

            {/* Right: Search Input & MultiCriteriaFilter */}
            <div className="flex min-w-0 flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:shrink-0">
              <div className="w-full sm:w-[min(260px,40vw)] lg:w-[300px] relative group min-w-0 sm:shrink-0">
                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                  <HugeIcon className="ph-bold ph-magnifying-glass text-gray-400 dark:text-zinc-500 transition-colors group-focus-within:text-pup-maroon dark:group-focus-within:text-red-400 text-sm" />
                </div>
                <Input
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                  }}
                  placeholder="Search filename or OCR text..."
                  className="h-9 w-full rounded-xl border border-border dark:border-border bg-white dark:bg-zinc-800 pl-8 pr-16 text-xs font-normal text-gray-900 dark:text-zinc-100 placeholder:text-gray-400 dark:placeholder:text-zinc-500 shadow-none focus-visible:outline-none focus-visible:border-pup-maroon focus-visible:ring-1 focus-visible:ring-pup-maroon dark:focus-visible:border-red-500/80 dark:focus-visible:ring-red-500/80"
                />
                <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-[11px] text-gray-400 dark:text-zinc-500 font-mono">
                  {total > 0 ? `${total.toLocaleString()}` : "0"}
                </div>
              </div>

              <MultiCriteriaFilter
                title="Filter Queue"
                groups={filterGroups}
                selectedValues={filterValues}
                onChange={handleFilterChange}
                onClearAll={handleClearFilters}
                totalCount={total}
                filteredCount={rows.length}
              />
            </div>
          </div>

          {/* Active Filter Chips */}
          <ActiveFilterChips
            chips={activeChips}
            onClearAll={handleClearFilters}
            className="hidden border-t border-border px-6 py-2.5 dark:border-border lg:block"
          />

          {loading ? (
            <BatchReviewSkeleton />
          ) : (
            <div className="grid min-h-0 min-w-0 flex-1 grid-cols-[minmax(0,0.8fr)_minmax(0,1.4fr)] grid-rows-1 border-t border-border dark:border-border" style={{ gridTemplateColumns: "minmax(0, 0.8fr) minmax(0, 1.4fr)" }}>
              {/* Left Column: Review Queue */}
              <div className="flex min-h-0 min-w-0 flex-col border-r border-border dark:border-border">
                <div className="flex flex-row items-center justify-between border-b border-border px-5 py-3.5 dark:border-border bg-gray-50/20 dark:bg-zinc-900/20">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-zinc-50">Review Queue</h3>
                    <p className="mt-1 text-[10px] text-gray-500 dark:text-zinc-400 max-md:hidden">↑/↓ move · Shift-click or Shift+↑/↓ range · ⌘/Ctrl-click toggle · ⌘/Ctrl+A select loaded · Esc clear</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {statusFilters.length === 1 && statusFilters[0] === "Failed" && rows.length > 0 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="xs"
                        disabled={clearingAll || loading}
                        onClick={handleClearAllFailed}
                        className="h-7 px-2.5 text-xs font-semibold rounded-lg border border-rose-200 dark:border-rose-900/40 bg-rose-50/60 dark:bg-rose-950/20 text-rose-700 dark:text-rose-400 hover:bg-rose-100/70 dark:hover:bg-rose-950/40 shadow-xs cursor-pointer active:scale-95 transition-all disabled:opacity-40"
                      >
                        {clearingAll ? "Clearing..." : "Clear All Failed"}
                      </Button>
                    )}
                    <span className="text-xs text-gray-900 dark:text-zinc-300">
                      {rows.length} loaded
                    </span>
                  </div>
                </div>
                {selectedIds.length > 1 && (
                  <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-3 dark:border-border">
                    <span className="mr-auto text-xs font-semibold text-gray-700 dark:text-zinc-200">{selectedIds.length} selected</span>
                    <Button size="xs" disabled={Boolean(bulkAction)} onClick={() => runBulkAction("confirm")} className="h-8 rounded-lg px-3 text-xs disabled:opacity-50">{bulkAction === "confirm" ? "Confirming…" : "Confirm Selection"}</Button>
                    <Button size="xs" variant="outline" disabled={Boolean(bulkAction)} onClick={() => runBulkAction("retry")} className="h-8 rounded-lg px-3 text-xs disabled:opacity-50">{bulkAction === "retry" ? "Retrying…" : "Retry OCR"}</Button>
                    <Button size="xs" variant="destructive" disabled={Boolean(bulkAction)} onClick={() => runBulkAction("dismiss")} className="h-8 rounded-lg px-3 text-xs disabled:opacity-50">{bulkAction === "dismiss" ? "Dismissing…" : "Dismiss Selection"}</Button>
                  </div>
                )}
                <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden p-2 sm:p-3">
                {rows.length === 0 ? (
                  <div className="flex flex-1 items-center justify-center p-6">
                    <Empty className="flex min-h-0 flex-1 flex-col items-center justify-center border-0 bg-transparent text-center">
                      <EmptyHeader className="flex flex-col items-center gap-0">
                        <div className="relative mb-5">
                          <div className="absolute inset-0 scale-150 animate-pulse rounded-full bg-gray-50 opacity-50 dark:bg-card"></div>
                          <EmptyMedia className="relative z-10 flex h-20 w-20 items-center justify-center rounded-2xl border border-border bg-white shadow-lg dark:border-border dark:bg-card dark:shadow-none">
                            <HugeIcon  className="ph-duotone ph-check-square text-xl text-gray-300 dark:text-zinc-600"></HugeIcon>
                          </EmptyMedia>
                        </div>
                        <EmptyTitle className="text-base font-semibold text-gray-900 dark:text-zinc-50">
                          No Documents in Queue
                        </EmptyTitle>
                        <EmptyDescription className="max-w-xs text-xs font-normal text-gray-900 dark:text-zinc-300 mt-1">
                          {query.trim()
                            ? "No documents match your active search filter."
                            : `There are no inbound documents waiting under "${status ? STATUS_TABS.find(t => t.id === status)?.label || status : "All"}".`}
                        </EmptyDescription>
                      </EmptyHeader>
                    </Empty>
                  </div>
                ) : (
                  <>
                    <div
                      ref={listRef}
                      role="listbox"
                      aria-label="Review queue files"
                      aria-multiselectable="true"
                      onScroll={(event) => {
                        const element = event.currentTarget;
                        if (element.scrollHeight - element.scrollTop - element.clientHeight < 160) loadMore();
                      }}
                      className="space-y-1.5 overflow-y-auto flex-1 pr-0.5"
                    >
                      {rows.map((row) => {
                        const isCurrent = Number(selectedId) === Number(row.id);
                        const isSelected = selectedIds.some((id) => Number(id) === Number(row.id));
                        return (
                          <button
                            type="button"
                            key={row.id}
                            disabled={Boolean(bulkAction)}
                            ref={(element) => {
                              if (element) rowRefs.current.set(Number(row.id), element);
                              else rowRefs.current.delete(Number(row.id));
                            }}
                            data-review-row
                            role="option"
                            aria-selected={isSelected}
                            onClick={(event) => {
                              setSelectedId(row.id);
                              const selection = getRowClickSelection(
                                rows,
                                { anchorId: selectionAnchorId.current, activeId: selectedId, selectedIds },
                                row.id,
                                { shiftKey: event.shiftKey, modifierKey: event.metaKey || event.ctrlKey },
                              );
                              selectionAnchorId.current = selection.anchorId;
                              setSelectedIds(selection.selectedIds);
                              setNote(row.review_note || "");
                              setStudentAssignmentQuery("");
                            }}
                            className={cn(
                              "group w-full rounded-xl border p-3 text-left transition-all cursor-pointer",
                              isCurrent
                                ? "border-pup-maroon/40 bg-red-50/50 shadow-xs dark:border-red-500/40 dark:bg-red-950/20"
                                : isSelected
                                  ? "border-blue-300 bg-blue-50/70 dark:border-blue-500/40 dark:bg-blue-950/20"
                                : "border-border/80 bg-white hover:bg-gray-50/80 dark:border-border dark:bg-zinc-900/40 dark:hover:bg-zinc-800/60"
                            )}
                          >
                            <div className="flex items-center gap-2">
                              <span aria-hidden="true" className={cn("flex h-4 w-4 shrink-0 items-center justify-center rounded border text-[10px]", isSelected ? "border-blue-600 bg-blue-600 text-white" : "border-gray-300 dark:border-zinc-600")}>
                                {isSelected ? "✓" : ""}
                              </span>
                              <HugeIcon  className={cn(
                                "ph-bold ph-file-text text-sm shrink-0",
                                isCurrent
                                  ? "text-pup-maroon dark:text-red-400"
                                  : "text-gray-400 group-hover:text-gray-600 dark:text-zinc-500"
                              )} />
                              <span
                                className="truncate text-xs font-semibold text-gray-900 dark:text-zinc-100"
                                title={row.original_filename}
                              >
                                {row.original_filename}
                              </span>
                            </div>
                            <div className="mt-2 flex items-center justify-between gap-1 text-[11px]">
                              <span className={cn(
                                "rounded-full px-2 py-0.5 font-medium text-[10px]",
                                row.review_status === "Confirmed"
                                  ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400"
                                  : row.review_status === "Failed"
                                  ? "bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400"
                                  : "bg-amber-50 text-amber-800 dark:bg-amber-950/30 dark:text-amber-300"
                              )}>
                                {row.review_status || "Needs Review"}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {loadingMore && <p className="py-3 text-center text-xs text-gray-500">Loading more files…</p>}
                    {!loadingMore && rows.length < total && <p className="py-2 text-center text-[11px] text-gray-400">Scroll for more · {rows.length} of {total}</p>}
                  </>
                )}
              </div>
            </div>

            {/* Right Column: Document Inspector */}
            <div className="flex min-h-0 min-w-0 flex-col flex-1">
              <div className="flex flex-row items-center justify-between border-b border-border px-5 py-3.5 max-sm:px-2 max-sm:py-1.5 dark:border-border bg-gray-50/20 dark:bg-zinc-900/20">
                <h3 className="truncate text-sm font-semibold text-gray-900 dark:text-zinc-50">
                  {selected?.original_filename || "Document Inspector"}
                </h3>
                {selected && (
                  <span className={cn(
                    "rounded-full px-2.5 py-0.5 text-[10px] font-semibold",
                    selected.review_status === "Confirmed"
                      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400"
                      : selected.review_status === "Failed"
                      ? "bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400"
                      : "bg-amber-50 text-amber-800 dark:bg-amber-950/30 dark:text-amber-300"
                  )}>
                    {selected.review_status || "Needs Review"}
                  </span>
                )}
              </div>
              <div className="flex min-h-0 min-w-0 flex-1 overflow-hidden p-3 sm:p-5">
                {selected ? (
                  <div className="grid min-h-0 min-w-0 w-full grid-rows-1 grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] gap-3 sm:gap-5" style={{ gridTemplateColumns: "minmax(0, 0.9fr) minmax(0, 1.1fr)" }}>
                    {/* Preview Sub-column */}
                    <div className="flex min-w-0 flex-col gap-3">
                      {selected.review_status === "Processing" && (
                        <div className="rounded-xl border border-blue-200 bg-blue-50/70 px-3.5 py-2.5 text-xs text-blue-800 dark:border-blue-900/30 dark:bg-blue-950/20 dark:text-blue-200">
                          <strong>OCR retry in progress.</strong> This item is still in the review queue and will update when processing finishes.
                        </div>
                      )}

                      <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-2xl border border-border bg-gray-300 p-3 max-md:h-10 max-md:flex-none max-md:p-1 dark:border-border dark:bg-zinc-800">
                        <button
                          type="button"
                          onClick={openFullscreenPreview}
                          aria-label="Open document preview fullscreen"
                          title="View fullscreen"
                          className="absolute right-5 top-5 z-10 flex h-9 w-9 items-center justify-center rounded-lg border border-white/20 bg-black/60 text-white shadow-lg backdrop-blur-sm transition-colors hover:bg-black/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white max-md:right-0 max-md:top-0 max-md:h-8 max-md:w-8"
                        >
                          <HugeIcon className="ph-bold ph-corners-out text-base" />
                        </button>
                        {isImage ? (
                          <div
                            role="button"
                            tabIndex={0}
                            aria-label="Open scanned document fullscreen"
                            title="Click to view fullscreen"
                            onClick={openFullscreenPreview}
                            onKeyDown={(event) => {
                              if (event.key === "Enter" || event.key === " ") {
                                event.preventDefault();
                                openFullscreenPreview();
                              }
                            }}
                            className="relative hidden h-full min-h-0 w-full cursor-zoom-in items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pup-maroon lg:flex"
                          >
                            <Image
                              src={previewUrl}
                              alt="Scanned document"
                              width={800}
                              height={1000}
                              unoptimized
                              className="block h-auto max-h-full w-auto max-w-full rounded-lg object-contain"
                            />
                            {Object.entries(ocrRegions).map(([key, region]) => {
                              const field = REGION_LABELS[key];
                              if (!field || Number(region?.width) <= 0 || Number(region?.height) <= 0) return null;
                              return (
                                <div
                                  key={key}
                                  className="pointer-events-none absolute border-2 rounded-xs"
                                  style={{
                                    left: `${Number(region.x) * 100}%`,
                                    top: `${Number(region.y) * 100}%`,
                                    width: `${Number(region.width) * 100}%`,
                                    height: `${Number(region.height) * 100}%`,
                                    borderColor: field.color,
                                  }}
                                >
                                  <span
                                    className="absolute -top-5 left-0 whitespace-nowrap bg-white/95 px-1.5 py-0.5 text-[10px] font-semibold rounded-xs shadow-xs"
                                    style={{ color: field.color }}
                                  >
                                    {field.label}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="hidden h-full min-h-0 w-full max-w-4xl flex-col overflow-hidden rounded-lg bg-white shadow-xl lg:flex">
                            <iframe
                              title="Scanned document preview"
                              src={previewUrl}
                              className="min-h-0 flex-1 w-full border-0"
                            />
                            {Object.keys(ocrRegions).length > 0 && (
                              <div className="border-t border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-800">
                                OCR field boxes are available for the scanned page image; PDF overlays are not rendered in this preview.
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {!Object.keys(ocrRegions).length && (
                        <div className="rounded-xl border border-amber-200 bg-amber-50/70 px-3.5 py-2.5 text-[11px] text-amber-800 max-md:hidden dark:border-amber-900/30 dark:bg-amber-950/20 dark:text-amber-200">
                          No OCR field regions were saved for this item. Click <strong>Retry</strong> to apply the current recognition template and display highlighted boxes.
                        </div>
                      )}
                    </div>

                    {/* Verification Form Sub-column */}
                    <div className="grid min-h-0 min-w-0 grid-cols-2 content-start gap-x-3 gap-y-1 overflow-hidden md:block md:space-y-4">
                      {/* Student Assignment */}
                      <div className="col-span-2 min-w-0 space-y-0.5 sm:space-y-2">
                        <label className="text-xs font-semibold text-gray-700 dark:text-zinc-300">
                          Student Assignment
                        </label>
                        {assignedStudent && (
                          <p className="text-[11px] text-gray-700 dark:text-zinc-300">
                            Assigned: <span className="font-semibold">{assignedStudent.name}</span> ({assignedStudent.studentNo || assignedStudent.student_no})
                          </p>
                        )}
                        {ocrStudentCandidates.length > 0 && (
                            <div className="space-y-1 rounded-xl border border-blue-100 bg-blue-50/60 p-1.5 sm:space-y-1.5 sm:p-3 dark:border-blue-400/20 dark:bg-blue-950/20">
                            <p className="hidden text-[11px] text-blue-800 dark:text-blue-200 lg:block">
                              OCR found possible roster matches within 10% letter difference. Choose a record to assign it.
                            </p>
                            {ocrStudentCandidates.map((candidate) => {
                              const studentNo = candidate.studentNo || candidate.student_no;
                              const studentName = candidate.name || students.find((item) => String(item.studentNo || item.student_no) === String(studentNo))?.name;
                              if (!studentName) return null;
                              const isSelected = String(selected.staff_selected_student_no || "") === String(studentNo);
                              return (
                                <button
                                  key={studentNo}
                                  type="button"
                                  aria-pressed={isSelected}
                                  onClick={() => {
                                    setStudentAssignmentQuery(studentName);
                                    update({ studentNo }).catch((error) =>
                                      showToast(
                                        formatErrorMessage(error, {
                                          title: "Assignment Failed",
                                          actionContext: `Assigning student ${studentNo} to document`,
                                        }),
                                        true
                                      )
                                    );
                                  }}
                                  className={cn(
                                    "flex w-full items-center justify-between gap-3 rounded-lg px-2 py-0.5 text-left text-xs transition-colors sm:py-1.5",
                                    isSelected ? "bg-white ring-1 ring-pup-maroon/30 dark:bg-zinc-900" : "hover:bg-white dark:hover:bg-zinc-900",
                                  )}
                                >
                                  <span className="min-w-0">
                                    <span className="block truncate font-semibold text-gray-900 dark:text-zinc-100">{studentName}</span>
                                    <span className="text-[11px] text-gray-600 dark:text-zinc-400">{studentNo}</span>
                                  </span>
                                  <span className="shrink-0 text-[11px] text-gray-600 dark:text-zinc-400">{candidate.mismatchPercent}% difference</span>
                                </button>
                              );
                            })}
                          </div>
                        )}
                        <div className="relative">
                            <Input
                              value={studentAssignmentQuery}
                              onChange={(event) => setStudentAssignmentQuery(event.target.value)}
                              placeholder="Type a name or student number to search..."
                              role="combobox"
                              aria-expanded={Boolean(studentAssignmentQuery.trim())}
                              aria-controls={`student-search-results-${selected.id}`}
                              className="h-8 rounded-xl border border-border dark:border-border bg-white dark:bg-zinc-800 text-xs shadow-none focus-visible:outline-none focus-visible:border-pup-maroon focus-visible:ring-1 focus-visible:ring-pup-maroon sm:h-10"
                            />
                            {studentAssignmentQuery.trim() && (
                              <div
                                id={`student-search-results-${selected.id}`}
                                role="listbox"
                                className="absolute left-0 right-0 z-20 mt-1 max-h-52 overflow-auto rounded-xl border border-border bg-white p-1 shadow-xl dark:border-border dark:bg-zinc-900"
                              >
                                {assignmentStudents.length > 0 ? (
                                  assignmentStudents.map((student) => {
                                    const studentNo = student.studentNo || student.student_no;
                                    return (
                                      <button
                                        key={studentNo}
                                        type="button"
                                        role="option"
                                        aria-selected={selected.staff_selected_student_no === studentNo}
                                        onClick={() => {
                                          setStudentAssignmentQuery(student.name);
                                          update({ studentNo }).catch((error) =>
                                            showToast(
                                              formatErrorMessage(error, {
                                                title: "Assignment Failed",
                                                actionContext: `Assigning student ${studentNo} to document`,
                                              }),
                                              true
                                            )
                                          );
                                        }}
                                        className="w-full rounded-lg px-3 py-2 text-left hover:bg-red-50 dark:hover:bg-red-950/20 cursor-pointer"
                                      >
                                        <span className="block text-xs font-semibold text-gray-900 dark:text-zinc-100">
                                          {student.name}
                                        </span>
                                        <span className="text-[11px] font-normal text-gray-900 dark:text-zinc-300">
                                          {studentNo}
                                        </span>
                                      </button>
                                    );
                                  })
                                ) : (
                                  <p className="px-3 py-2 text-xs text-gray-500">No students found.</p>
                                )}
                              </div>
                            )}
                        </div>
                        <span className="hidden text-[11px] font-normal text-gray-900 dark:text-zinc-300 lg:block">
                          Search by name or student number, then select the student for this document.
                        </span>
                      </div>

                      {/* Document Type */}
                      <div className="min-w-0">
                        <label className="mb-0.5 block text-xs font-semibold text-gray-700 dark:text-zinc-300 sm:mb-1.5">
                          Document Type
                        </label>
                        <Select
                          className="h-8 rounded-xl px-2 sm:h-10 sm:px-3 bg-white dark:bg-zinc-800 border border-border dark:border-border w-full text-xs text-gray-900 dark:text-zinc-200 shadow-none hover:bg-gray-50 dark:hover:bg-zinc-800/80 transition-all focus-visible:outline-none focus-visible:border-pup-maroon focus-visible:ring-1 focus-visible:ring-pup-maroon"
                          value={selected.proposed_doc_type || ""}
                          onChange={(event) =>
                            update({ docType: event.target.value }).catch((error) =>
                              showToast(
                                formatErrorMessage(error, {
                                  title: "Document Type Update Failed",
                                  actionContext: `Updating document type to ${event.target.value}`,
                                }),
                                true
                              )
                            )
                          }
                        >
                          <option value="">Select type</option>
                          {docTypes.map((type) => (
                            <option key={type} value={type}>
                              {type}
                            </option>
                          ))}
                        </Select>
                      </div>

                      {/* Scanned Name */}
                      <div className="min-w-0">
                        <label htmlFor={`scanned-name-${selected.id}`} className="mb-0.5 block text-xs font-semibold text-gray-700 dark:text-zinc-300 sm:mb-1.5">
                          Scanned Name
                        </label>
                        <Input
                          id={`scanned-name-${selected.id}`}
                          value={selected.ocr_name || ""}
                          readOnly
                          placeholder="No name was extracted"
                          className="h-8 rounded-xl border border-border dark:border-border bg-gray-50 dark:bg-zinc-900 text-xs text-gray-700 dark:text-zinc-200 shadow-none sm:h-10"
                        />
                        <p className="mt-1 hidden text-[11px] text-gray-500 dark:text-zinc-400 lg:block">
                          Name recognized from the scan. Confirm the student assignment above.
                        </p>
                      </div>

                      {/* Review Note */}
                      <div className="col-span-2 min-w-0">
                        <label className="mb-0.5 block text-xs font-semibold text-gray-700 dark:text-zinc-300 sm:mb-1.5">
                          Review Note
                        </label>
                        <textarea
                          rows={3}
                          value={note}
                          onChange={(event) => setNote(event.target.value)}
                          onBlur={() => update({ reviewNote: note }).catch(() => {})}
                          placeholder="Optional review or conflict note..."
                          className="w-full min-h-[72px] rounded-xl border border-border dark:border-border bg-white dark:bg-zinc-800 p-3 text-xs font-normal leading-relaxed text-gray-900 dark:text-zinc-100 placeholder:text-gray-400 dark:placeholder:text-zinc-500 shadow-none focus-visible:outline-none focus:border-pup-maroon focus:ring-1 focus:ring-pup-maroon resize-y transition-all"
                        />
                      </div>

                      {/* Actions */}
                      <div className="col-span-2 flex flex-wrap items-center gap-2 border-t border-border pt-1 dark:border-border sm:col-span-1 sm:border-0 sm:pt-2">
                        <Button
                          size="sm"
                          onClick={() =>
                            action("confirm", {
                              studentNo: selected.staff_selected_student_no,
              studentName: studentAssignmentQuery,
                              docType: selected.proposed_doc_type,
                            })
                          }
                          disabled={
                            saving ||
                            !selected.staff_selected_student_no ||
                            !selected.proposed_doc_type
                          }
                          className="h-8 px-3 text-xs font-semibold rounded-xl! btn-brand-red text-white! active:scale-95 disabled:opacity-50 transition-all cursor-pointer shadow-xs sm:h-10 sm:px-5"
                          style={{ color: "#ffffff" }}
                        >
                          {saving ? "Confirming..." : "Confirm Document"}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => action("retry")}
                          disabled={saving}
                          className="h-8 px-3 text-xs font-semibold rounded-xl border border-border dark:border-border bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-xs cursor-pointer active:scale-95 transition-all disabled:opacity-40 sm:h-10 sm:px-4"
                        >
                          Retry OCR
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() =>
                            action("reject", {
                              reason: note || (selected.review_status === "Failed" ? "Dismissed from failed review" : "Rejected during review"),
                            })
                          }
                          disabled={saving}
                          className="h-8 px-3 text-xs font-semibold rounded-xl border border-red-200 dark:border-red-900/40 bg-red-50/60 dark:bg-red-950/20 text-red-700 dark:text-red-400 hover:bg-red-100/70 dark:hover:bg-red-950/40 shadow-xs cursor-pointer active:scale-95 transition-all disabled:opacity-40 sm:h-10 sm:px-4"
                        >
                          {selected.review_status === "Failed" ? "Dismiss Scan" : "Reject Document"}
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-1 items-center justify-center p-8">
                    <Empty className="flex h-full min-h-0 flex-col items-center justify-center border-0 bg-transparent text-center">
                      <EmptyHeader className="flex flex-col items-center gap-0">
                        <div className="relative mb-5">
                          <div className="absolute inset-0 scale-150 animate-pulse rounded-full bg-gray-50 opacity-50 dark:bg-card"></div>
                          <EmptyMedia className="relative z-10 flex h-20 w-20 items-center justify-center rounded-2xl border border-border bg-white shadow-lg dark:border-border dark:bg-card dark:shadow-none">
                            <HugeIcon  className="ph-duotone ph-file-text text-xl text-gray-300 dark:text-zinc-600"></HugeIcon>
                          </EmptyMedia>
                        </div>
                        <EmptyTitle className="text-base font-semibold text-gray-900 dark:text-zinc-50">
                          Select a Document
                        </EmptyTitle>
                        <EmptyDescription className="max-w-xs text-xs font-normal text-gray-900 dark:text-zinc-300 mt-1">
                          Choose an item from the review queue on the left to inspect its scanned preview and extracted OCR fields.
                        </EmptyDescription>
                      </EmptyHeader>
                    </Empty>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        </Card>
      </div>
      <Dialog open={confirmBulkDismiss} onOpenChange={setConfirmBulkDismiss}>
        <DialogContent className="flex flex-col gap-0 sm:max-w-md rounded-2xl bg-white p-0 dark:bg-zinc-900">
          <DialogHeader className="border-b border-border p-6 pb-4 text-left">
            <DialogTitle className="text-base font-semibold">Dismiss selected files?</DialogTitle>
          </DialogHeader>
          <div className="p-6 text-sm text-gray-600 dark:text-zinc-300">
            This will dismiss up to {selectedIds.length} selected files that are still eligible. Other files will be skipped and listed in the results.
          </div>
          <div className="flex justify-end gap-2 border-t border-border px-6 py-4">
            <Button variant="outline" onClick={() => setConfirmBulkDismiss(false)} className="rounded-xl">Cancel</Button>
            <Button variant="destructive" onClick={() => runBulkAction("dismiss", { confirmed: true })} className="rounded-xl">Dismiss Selected Files</Button>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={Boolean(bulkResults)} onOpenChange={(open) => !open && setBulkResults(null)}>
        <DialogContent className="flex flex-col gap-0 sm:max-w-xl rounded-2xl bg-white p-0 dark:bg-zinc-900">
          <DialogHeader className="border-b border-border p-6 pb-4 text-left">
            <DialogTitle className="text-base font-semibold">Bulk action results</DialogTitle>
          </DialogHeader>
          {bulkResults && (
            <div className="space-y-3 p-6">
              <p className="text-sm text-gray-600 dark:text-zinc-300">
                {bulkResults.items.filter((item) => item.status === "Completed").length} completed · {bulkResults.items.filter((item) => item.status === "Skipped").length} skipped · {bulkResults.items.filter((item) => item.status === "Failed").length} failed
              </p>
              <div className="max-h-[50vh] space-y-2 overflow-y-auto">
                {bulkResults.items.map((item) => (
                  <div key={item.id} className="rounded-xl border border-border p-3 text-xs">
                    <div className="flex items-center justify-between gap-3">
                      <span className="min-w-0 truncate font-medium" title={item.filename}>{item.filename}</span>
                      <span className={cn("shrink-0 font-semibold", item.status === "Completed" ? "text-emerald-600" : item.status === "Skipped" ? "text-amber-600" : "text-red-600")}>{item.status}</span>
                    </div>
                    {item.detail && <p className="mt-1 text-gray-500 dark:text-zinc-400">{item.detail}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="flex justify-end border-t border-border px-6 py-4">
            <Button onClick={() => setBulkResults(null)} className="rounded-xl">Done</Button>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={Boolean(fullscreenPreview)} onOpenChange={(open) => !open && setFullscreenPreview(null)}>
        <DialogContent
          hideClose
          className="!fixed !inset-0 !flex !h-screen !w-screen !max-w-none !translate-x-0 !translate-y-0 flex-col gap-0 overflow-hidden rounded-none border-0 bg-zinc-950 p-0 text-white shadow-none"
        >
          <DialogHeader className="flex shrink-0 flex-row items-center justify-between border-b border-white/10 bg-black/70 px-5 py-3 text-white">
            <DialogTitle className="truncate pr-4 text-sm font-semibold text-white">
              {fullscreenPreview?.title || "Document preview"}
            </DialogTitle>
            <button
              type="button"
              onClick={() => setFullscreenPreview(null)}
              aria-label="Close fullscreen preview"
              title="Close"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white/80 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              <HugeIcon className="ph-bold ph-x text-base" />
            </button>
          </DialogHeader>
          <div className="flex min-h-0 flex-1 items-start justify-center overflow-auto bg-zinc-900 p-4 sm:p-6">
            {fullscreenPreview?.src && (fullscreenPreview.isImage ? (
              <Image
                src={fullscreenPreview.src}
                alt={fullscreenPreview.title || "Scanned document"}
                width={1600}
                height={2000}
                unoptimized
                className="block max-h-full max-w-full rounded-md object-contain shadow-2xl"
              />
            ) : (
              <iframe
                title={fullscreenPreview.title || "Scanned document preview"}
                src={fullscreenPreview.src}
                className="h-full min-h-[80vh] w-full border-0 bg-white"
              />
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}
