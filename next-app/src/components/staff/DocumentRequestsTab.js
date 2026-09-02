"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LiquidGlassButton } from "@/components/ui/liquid-glass-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { getDocAvailabilityForType } from "@/lib/docAvailability";
import { formatPHDateTime } from "@/lib/timeFormat";
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyMedia,
} from "@/components/ui/empty";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import PageHeader from "@/components/shared/PageHeader";
import { RefreshButton } from "@/components/shared/RefreshButton";
import { Select } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"

const STATUS_OPTIONS = [
  "Pending",
  "InProgress",
  "Ready",
  "Completed",
  "Cancelled",
  "Shredded",
];

function SortIndicator({ column, sortBy, sortOrder }) {
  if (sortBy !== column)
    return <i className="ph-bold ph-caret-up-down ml-1 text-[11px] opacity-40 transition-opacity group-hover:opacity-70 dark:opacity-30 dark:group-hover:opacity-60"></i>
  return sortOrder === "ASC" ? (
    <i className="ph-bold ph-caret-up ml-1 text-[11px] text-pup-maroon animate-in fade-in zoom-in duration-normal dark:text-primary"></i>
  ) : (
    <i className="ph-bold ph-caret-down ml-1 text-[11px] text-pup-maroon animate-in fade-in zoom-in duration-normal dark:text-primary"></i>
  )
}

function statusBadgeClass(status) {
  const s = String(status || "").toUpperCase();
  if (s === "PENDING") {
    return "bg-[#FEF3C7] text-[#92400E] dark:bg-amber-950/40 dark:text-amber-400";
  }
  if (s === "PROCESSING" || s === "INPROGRESS") {
    return "bg-[#DBEAFE] text-[#1E40AF] dark:bg-blue-950/40 dark:text-blue-400";
  }
  if (s === "READY") {
    return "bg-[#D1FAE5] text-[#065F46] dark:bg-emerald-950/40 dark:text-emerald-400";
  }
  if (s === "DONE" || s === "COMPLETED") {
    return "bg-[#D1FAE5] text-[#065F46] dark:bg-emerald-950/40 dark:text-emerald-400";
  }
  if (s === "CANCELLED") {
    return "bg-gray-100 text-gray-600 dark:bg-zinc-800/50 dark:text-zinc-400";
  }
  if (s === "SHREDDED") {
    return "bg-[#FEE2E2] text-[#991B1B] dark:bg-red-950/40 dark:text-red-400";
  }
  return "bg-gray-100 text-gray-800 dark:bg-zinc-800 dark:text-zinc-300";
}

export default function DocumentRequestsTab({
  students,
  docTypes,
  staffDocs,
  onLocateOnMap,
  showToast,
  error = null,
}) {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isManualLoading, setIsManualLoading] = useState(false);
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [jumpPage, setJumpPage] = useState("1");
  const [sortBy, setSortBy] = useState("created_at");
  const [sortOrder, setSortOrder] = useState("DESC");

  const [createOpen, setCreateOpen] = useState(false);
  const [createStudentNo, setCreateStudentNo] = useState("");
  const [createDocType, setCreateDocType] = useState("");
  const [createNotes, setCreateNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [studentSearch, setStudentSearch] = useState("");
  const [selectedStudent, setSelectedStudent] = useState(null);

  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fileWarningOpen, setFileWarningOpen] = useState(false);

  // local edit state for the detail side-panel
  const [editStatus, setEditStatus] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [statusFocused, setStatusFocused] = useState(false);
  const [notesFocused, setNotesFocused] = useState(false);

  const debouncedPageResetSkip = useRef(true);
  const autoLinkAttempted = useRef(new Set());

  // Reset creation state on modal open/close
  useEffect(() => {
    if (!createOpen) {
      setCreateStudentNo("");
      setCreateDocType("");
      setCreateNotes("");
      setStudentSearch("");
      setSelectedStudent(null);
    }
  }, [createOpen]);

  const studentMap = useMemo(() => {
    const map = new Map()
    if (Array.isArray(students)) {
      students.forEach((s) => {
        const key = String(s.studentNo || s.student_no || "").toUpperCase()
        if (key) map.set(key, s)
      })
    }
    return map
  }, [students])

  const studentSuggestions = useMemo(() => {
    const val = studentSearch.trim().toLowerCase();
    if (val.length < 2) return [];
    return students
      .filter((s) => {
        const sn = String(s.studentNo || s.student_no || "").toLowerCase();
        const nm = String(s.name || "").toLowerCase();
        return sn.includes(val) || nm.includes(val);
      })
      .slice(0, 5);
  }, [studentSearch, students]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q.trim()), 350);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    if (debouncedPageResetSkip.current) {
      debouncedPageResetSkip.current = false;
      return;
    }
    setPage(1);
  }, [debouncedQ]);

  const loadList = useCallback(
    async (opts = { showLoading: true }) => {
      const showLoading = opts.showLoading !== false;
      const isManual = opts.manual === true;
      if (isManual) {
        setIsManualLoading(true);
      } else if (showLoading) {
        setLoading(true);
      }
      const startTime = Date.now();
      try {
        const offset = (page - 1) * itemsPerPage;
        const qs = new URLSearchParams();
        qs.set("limit", String(itemsPerPage));
        qs.set("offset", String(offset));
        if (debouncedQ) qs.set("q", debouncedQ);
        if (statusFilter) qs.set("status", statusFilter);
        qs.set("sortBy", sortBy);
        qs.set("sortOrder", sortOrder);
        const res = await fetch(`/api/document-requests?${qs}`, {
          cache: "no-store",
        });
        const json = await res.json().catch(() => null);
        if (!res.ok || !json?.ok) throw new Error(json?.error || "Failed to load");
        
        if (isManual) {
          const elapsed = Date.now() - startTime;
          if (elapsed < 600) {
            await new Promise((resolve) => setTimeout(resolve, 600 - elapsed));
          }
        }
        
        setRows(Array.isArray(json.data) ? json.data : []);
        setTotal(Number(json.total) || 0);
      } catch (e) {
        if (showLoading || isManual) {
          showToast({ title: "Load Failed", description: e?.message || "Unable to load requests." }, true);
          setRows([]);
          setTotal(0);
        }
      } finally {
        setLoading(false);
        setIsManualLoading(false);
      }
    },
    [page, itemsPerPage, debouncedQ, statusFilter, sortBy, sortOrder, showToast]
  );

  const handleSort = (column) => {
    if (sortBy === column) {
      if (sortOrder === "ASC") {
        setSortOrder("DESC");
      } else if (column !== "created_at") {
        setSortBy("created_at");
        setSortOrder("DESC");
      } else {
        setSortOrder("ASC");
      }
    } else {
      setSortBy(column);
      setSortOrder("ASC");
    }
    setPage(1);
  };

  useEffect(() => {
    loadList({ showLoading: true });
  }, [loadList]);

  useEffect(() => {
    const t = setInterval(() => {
      loadList({ showLoading: false });
    }, 20000);
    return () => clearInterval(t);
  }, [loadList]);

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === "visible") {
        loadList({ showLoading: false });
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [loadList]);

  const openDetail = async (id) => {
    if (selectedId === id) {
      setSelectedId(null);
      setDetail(null);
      return;
    }
    setSelectedId(id);
    setDetailLoading(true);
    setDetail(null);
    try {
      const res = await fetch(`/api/document-requests/${id}`, { cache: "no-store" });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) throw new Error(json?.error || "Not found");
      setDetail(json.data);
      setEditStatus(json.data.status || "Pending");
      setEditNotes(json.data.notes || "");
    } catch (e) {
      showToast({ title: "Load Failed", description: e?.message || "Unable to load details." }, true);
      setSelectedId(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const studentForRequest = useMemo(() => {
    if (!detail?.student_no) return null;
    const sn = String(detail.student_no).toUpperCase();
    return (
      students.find((s) => String(s.studentNo || "").toUpperCase() === sn) ||
      null
    );
  }, [detail, students]);

  const availability = useMemo(() => {
    if (!detail?.student_no || !detail?.doc_type) return null;
    return getDocAvailabilityForType(
      staffDocs,
      detail.student_no,
      detail.doc_type
    );
  }, [detail, staffDocs]);

  const requestNeedsPhysicalVerification = useMemo(() => {
    if (!availability) return true;
    return availability.status !== "uploaded";
  }, [availability]);

  const retentionExpiryDate = useMemo(() => {
    if (!detail || detail.status !== "Ready") return null;
    const baseDate = new Date(detail.updated_at || detail.created_at);
    if (isNaN(baseDate.getTime())) return null;
    baseDate.setDate(baseDate.getDate() + 90);
    return baseDate;
  }, [detail]);

  const daysRemaining = useMemo(() => {
    if (!retentionExpiryDate) return null;
    const now = new Date();
    const diffTime = retentionExpiryDate.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }, [retentionExpiryDate]);

  const patchDetail = async (body, opts = {}) => {
    if (!detail?.id) return;
    const reqId = detail.id;
    const silent = opts.silent === true;
    setSaving(true);
    try {
      const res = await fetch(`/api/document-requests/${detail.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) throw new Error(json?.error || "Update failed");
      setDetail(json.data);
      setEditStatus(json.data.status || "Pending");
      setEditNotes(json.data.notes || "");
      if (!silent) {
        showToast({ title: "Request Updated", description: "Status and notes have been saved." });
      }
      loadList({ showLoading: false });
    } catch (e) {
      if (body.linkedDocumentId != null) {
        autoLinkAttempted.current.delete(reqId);
      }
      showToast({ title: "Update Failed", description: e?.message || "Unable to save changes." }, true);
    } finally {
      setSaving(false);
    }
  };

  const handleManualSave = () => {
    patchDetail({ status: editStatus, notes: editNotes || null });
  };

  const handleResetEdits = () => {
    if (!detail) return;
    setEditStatus(detail.status || "Pending");
    setEditNotes(detail.notes || "");
  };

  const hasEdits = useMemo(() => {
    if (!detail) return false;
    // Normalized comparison
    const norm = (s) => (s || "").trim();
    return norm(editStatus) !== norm(detail.status) || norm(editNotes) !== norm(detail.notes);
  }, [detail, editStatus, editNotes]);

  useEffect(() => {
    if (!detail?.id || detail.linked_document_id) return;
    const docId = availability?.doc?.id;
    if (!docId) return;
    if (autoLinkAttempted.current.has(detail.id)) return;
    autoLinkAttempted.current.add(detail.id);
    patchDetail({ linkedDocumentId: docId }, { silent: true });
    // patchDetail intentionally omitted from deps to avoid re-running on each render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detail?.id, detail?.linked_document_id, availability?.doc?.id]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/document-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentNo: createStudentNo.trim(),
          docType: createDocType,
          notes: createNotes.trim() || null,
        }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) throw new Error(json?.error || "Failed to create");
      showToast({ title: "Request Created", description: "Request added." });
      setCreateOpen(false);
      setCreateStudentNo("");
      setCreateDocType("");
      setCreateNotes("");
      setPage(1);
      loadList({ showLoading: true });
    } catch (err) {
      showToast({ title: "Creation Failed", description: err?.message || "Unable to create the request." }, true);
    } finally {
      setSubmitting(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / itemsPerPage));

  useEffect(() => {
    setJumpPage(String(page));
  }, [page]);

  const handleJumpPage = (e) => {
    if (e.key === "Enter" || e.type === "blur") {
      const val = parseInt(jumpPage);
      if (!isNaN(val) && val >= 1 && val <= totalPages) {
        setPage(val);
      } else {
        setJumpPage(String(page));
      }
    }
  };


  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex flex-col h-auto gap-6 animate-fade-up font-inter">
      {/* 1. Alumni Request Card (Header & Filters) */}
      <Card className="rounded-brand border border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-card dark:shadow-none overflow-hidden">
        <PageHeader
          icon="ph-tray"
          title="Alumni Requests"
          description="Manage and track alumni requests."
          showBorder={false}
          titleClassName="text-[15px] font-bold text-gray-900 dark:text-zinc-50"
          descriptionClassName="text-[14px] font-normal text-[#8E8E93] dark:text-zinc-400 mt-[2px]"
          actions={
            <div className="flex items-center gap-6">
              <RefreshButton 
                onRefresh={() => loadList({ showLoading: false, manual: true })} 
                isLoading={isManualLoading} 
                title="Refresh Requests"
              />

              <div className="h-6 w-px bg-gray-200 dark:bg-zinc-800" />

              <div className="flex items-center gap-2">
                {!loading && !error && (
                  <Button
                    type="button"
                    onClick={() => setCreateOpen(true)}
                    className="flex h-[36px] items-center justify-center rounded-[8px] btn-brand-red text-[13px] font-medium text-white active:scale-95 disabled:opacity-50 transition-all dark:shadow-none px-4 cursor-pointer"
                  >
                    New Request
                  </Button>
                )}
              </div>
            </div>
          }
        />
        
        {!loading && !error && (
          <div className="bg-white border-t border-gray-100 p-4 backdrop-blur-md dark:bg-card/50 dark:border-white/10">
            <div className="flex w-full flex-wrap items-center gap-5">
              {/* Search */}
              <div className="flex-[2] min-w-[280px] group relative">
                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                  <i className="ph-bold ph-magnifying-glass text-gray-400 transition-colors group-focus-within:text-pup-maroon dark:text-zinc-500 text-sm"></i>
                </div>
                <Input
                  type="text"
                  placeholder="Student no., name, document type…"
                  className="h-[36px] w-full rounded-[8px] border-[0.5px] border-gray-200 bg-white pl-9 pr-20 text-[13px] font-normal transition-all focus:border-pup-maroon/30 focus:ring-4 focus:ring-pup-maroon/5 placeholder:text-gray-400 dark:border-white/10 dark:bg-card dark:text-zinc-300 dark:focus:border-primary"
                  value={q}
                  onChange={(e) => {
                    setQ(e.target.value);
                    setPage(1);
                  }}
                />
                <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-[12px] font-normal text-gray-400 dark:text-zinc-500">
                  {total > 0 ? `${total.toLocaleString()} results` : "0 results"}
                </div>
              </div>

              {/* Status Filter */}
              <div className="min-w-[120px] flex-1">
                <Select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setPage(1);
                  }}
                  className="h-[36px] w-full rounded-[8px] border-[0.5px] border-gray-200 bg-white text-[13px] font-medium transition-all focus:border-pup-maroon/30 focus:ring-4 focus:ring-pup-maroon/5 dark:border-white/10 dark:bg-card dark:text-zinc-300 dark:focus:border-primary"
                >
                  <option value="">All Status</option>
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {s === "InProgress" ? "In Progress" : s}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
          </div>
        )}

        {/* Active filter Chips Row */}
        {!loading && !error && (q !== "" || statusFilter !== "") && (
          <div className="flex-none border-b border-gray-100 bg-white px-6 py-3 animate-in fade-in slide-in-from-top-1 duration-normal dark:border-white/10 dark:bg-card">
            <div className="flex flex-wrap items-center gap-2">
              <span className="mr-1 text-[11px] font-medium uppercase tracking-[0.04em] text-gray-400 dark:text-zinc-500">Active filters:</span>
              {q && (
                <div className="flex items-center gap-[6px] rounded-[6px] bg-gray-100 dark:bg-zinc-800 px-[10px] py-[4px] text-[12px] font-normal text-gray-900 dark:text-zinc-50">
                  Search: {q}
                  <button
                    onClick={() => { setQ(""); setPage(1); }}
                    className="text-[12px] text-gray-400 hover:text-gray-600 dark:text-zinc-500 dark:hover:text-zinc-300 transition-colors cursor-pointer border-0 bg-transparent p-0 leading-none"
                  >
                    ×
                  </button>
                </div>
              )}
              {statusFilter && (
                <div className="flex items-center gap-[6px] rounded-[6px] bg-gray-100 dark:bg-zinc-800 px-[10px] py-[4px] text-[12px] font-normal text-gray-900 dark:text-zinc-50">
                  Status: {statusFilter === "InProgress" ? "In Progress" : statusFilter}
                  <button
                    onClick={() => { setStatusFilter(""); setPage(1); }}
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
                  setQ("");
                  setStatusFilter("");
                  setPage(1);
                }}
                className="h-auto text-[12px] font-medium text-gray-400 dark:text-zinc-500 border-0 bg-transparent hover:bg-transparent shadow-none p-0 hover:text-red-600 dark:hover:text-red-500 transition-colors cursor-pointer"
              >
                Clear
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* 2. Columns layout for Request Table and Request details */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6 items-start">
        
        {/* Table Card (Left Column) */}
        <Card className="rounded-brand border border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-card dark:shadow-none overflow-hidden flex flex-col w-full p-0 mb-4">
          <CardContent className="p-0 h-auto flex flex-col">
            {(loading && !isManualLoading) ? (
              <div className="p-6 space-y-4">
                <div className="border border-gray-100 rounded-brand overflow-hidden dark:border-white/10">
                  <Skeleton className="h-10 w-full rounded-none dark:bg-muted" />
                  <div className="divide-y divide-gray-100 dark:divide-white/10">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                      <div key={i} className="p-4 flex items-center justify-between">
                        <div className="space-y-2 flex-1">
                          <Skeleton className="h-4 w-1/4 dark:bg-muted" />
                          <Skeleton className="h-3 w-1/3 dark:bg-muted" />
                        </div>
                        <Skeleton className="h-6 w-20 rounded-full dark:bg-muted" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : error ? (
              <div className="p-6">
                <Empty className="h-[320px] flex flex-col items-center justify-center text-center text-gray-500 border-0 dark:text-zinc-400">
                  <EmptyHeader className="flex flex-col items-center gap-0">
                    <EmptyMedia className="w-16 h-16 rounded-full bg-white border border-gray-200 flex items-center justify-center mb-4 shadow-sm dark:bg-card dark:border-white/10 dark:shadow-none">
                      <i className="ph-duotone ph-warning-circle text-xl text-pup-maroon dark:text-primary" />
                    </EmptyMedia>
                    <EmptyTitle className="text-lg font-semibold text-gray-900 dark:text-zinc-50">Could Not Load Report</EmptyTitle>
                    <EmptyDescription className="text-sm font-medium text-gray-600 mt-1 max-w-md dark:text-zinc-300">
                      {error}
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              </div>
            ) : (
              <div 
                key={`${page}-${statusFilter}-${debouncedQ}-${sortBy}-${sortOrder}`}
                className="flex-1 w-full overflow-visible animate-fade-up"
              >
                <div className="overflow-x-auto flex-1">
                  <table className={cn("min-w-full text-sm table-fixed", rows.length === 0 && "h-full")}>
                    <thead className="sticky top-0 z-10 border-b-[0.5px] border-black/10 dark:border-white/10 bg-white dark:bg-card">
                      <tr className="text-left text-[12px] font-medium tracking-[0.04em] text-[#8E8E93] dark:text-zinc-500">
                        <th className="p-4 w-20">
                          <button
                            type="button"
                            onClick={() => handleSort("id")}
                            className={cn(
                              "group flex items-center transition-colors focus:outline-none cursor-pointer text-[12px] font-medium tracking-[0.04em]",
                              sortBy === "id" ? "text-[#111111] dark:text-white" : "text-[#8E8E93] dark:text-zinc-500 hover:text-[#111111] dark:hover:text-white"
                            )}
                          >
                            ID
                            <SortIndicator
                              column="id"
                              sortBy={sortBy}
                              sortOrder={sortOrder}
                            />
                          </button>
                        </th>
                        <th className="p-4">
                          <button
                            type="button"
                            onClick={() => handleSort("student")}
                            className={cn(
                              "group flex items-center transition-colors focus:outline-none cursor-pointer text-[12px] font-medium tracking-[0.04em]",
                              sortBy === "student" ? "text-[#111111] dark:text-white" : "text-[#8E8E93] dark:text-zinc-500 hover:text-[#111111] dark:hover:text-white"
                            )}
                          >
                            Student
                            <SortIndicator
                              column="student"
                              sortBy={sortBy}
                              sortOrder={sortOrder}
                            />
                          </button>
                        </th>
                        <th className="p-4">
                          <button
                            type="button"
                            onClick={() => handleSort("doc_type")}
                            className={cn(
                              "group flex items-center transition-colors focus:outline-none cursor-pointer text-[12px] font-medium tracking-[0.04em]",
                              sortBy === "doc_type" ? "text-[#111111] dark:text-white" : "text-[#8E8E93] dark:text-zinc-500 hover:text-[#111111] dark:hover:text-white"
                            )}
                          >
                            Document Type
                            <SortIndicator
                              column="doc_type"
                              sortBy={sortBy}
                              sortOrder={sortOrder}
                            />
                          </button>
                        </th>
                        <th className="p-4">
                          <button
                            type="button"
                            onClick={() => handleSort("status")}
                            className={cn(
                              "group flex items-center transition-colors focus:outline-none cursor-pointer text-[12px] font-medium tracking-[0.04em]",
                              sortBy === "status" ? "text-[#111111] dark:text-white" : "text-[#8E8E93] dark:text-zinc-500 hover:text-[#111111] dark:hover:text-white"
                            )}
                          >
                            Status
                            <SortIndicator
                              column="status"
                              sortBy={sortBy}
                              sortOrder={sortOrder}
                            />
                          </button>
                        </th>
                        <th className="p-4 text-right">
                          <div className="flex justify-end">
                            <button
                              type="button"
                              onClick={() => handleSort("created_at")}
                              className={cn(
                                "group flex items-center transition-colors focus:outline-none cursor-pointer text-[12px] font-medium tracking-[0.04em]",
                                sortBy === "created_at" ? "text-[#111111] dark:text-white" : "text-[#8E8E93] dark:text-zinc-500 hover:text-[#111111] dark:hover:text-white"
                              )}
                            >
                              Created
                              <SortIndicator
                                column="created_at"
                                sortBy={sortBy}
                                sortOrder={sortOrder}
                              />
                            </button>
                          </div>
                        </th>
                      </tr>
                    </thead>
                    <tbody className={cn("divide-y divide-gray-100 dark:divide-white/10", rows.length === 0 && "h-full")}>
                      {rows.length === 0 ? (
                        <tr className="border-0 hover:bg-transparent h-full">
                          <td colSpan={5} className="p-0 border-0 h-full">
                            <Empty className="flex h-full flex-col items-center justify-center border-0 bg-transparent text-center">
                              <EmptyHeader className="flex flex-col items-center gap-0">
                                <div className="relative mb-6">
                                  <div className="absolute inset-0 scale-150 animate-pulse rounded-full bg-gray-50 opacity-50 dark:bg-card"></div>
                                  <EmptyMedia className="relative z-10 flex h-24 w-24 items-center justify-center rounded-3xl border border-gray-100 bg-white shadow-xl rotate-3 dark:border-white/10 dark:bg-card dark:shadow-none">
                                    <i className="ph-duotone ph-magnifying-glass text-xl text-gray-300 dark:text-zinc-600"></i>
                                  </EmptyMedia>
                                </div>
                                <EmptyTitle className="text-xl font-semibold text-gray-900 dark:text-zinc-50">No Alumni Requests Yet</EmptyTitle>
                                <EmptyDescription className="max-w-xs text-sm font-medium text-gray-500 dark:text-zinc-400">
                                  Create a request for alumni. Track status and find the physical file using the map.
                                </EmptyDescription>
                              </EmptyHeader>
                            </Empty>
                          </td>
                        </tr>
                      ) : (
                        rows.map((r) => (
                          <tr
                            key={r.id}
                            className={cn(
                              "group h-[52px] border-b-[0.5px] border-gray-100 dark:border-white/10 last:border-b-0 transition-all duration-fast hover:bg-gray-50/40 dark:bg-card dark:hover:bg-white/2 select-none cursor-pointer",
                              selectedId === r.id && "bg-blue-50/60 dark:bg-blue-950/20"
                            )}
                            onClick={() => openDetail(r.id)}
                          >
                            <td className="py-0 px-4 align-middle text-[13px] font-normal text-[#111111] dark:text-zinc-300">
                              #{r.id}
                            </td>
                            <td className="py-0 px-4 align-middle">
                              <div className="text-[14px] font-medium text-[#111111] dark:text-zinc-50 truncate">
                                {r.student_name || "—"}
                              </div>
                              <div className="flex flex-wrap items-center gap-2 mt-[2px] truncate text-[12px] font-normal text-[#8E8E93] dark:text-zinc-500">
                                <span>{r.student_no}</span>
                                {(() => {
                                  const student = studentMap.get(String(r.student_no).toUpperCase());
                                  if (!student) return null;
                                  return (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onLocateOnMap(student);
                                      }}
                                      title="Locate on storage map"
                                      className="inline-flex items-center gap-1 rounded-[4px] bg-red-50 hover:bg-red-100 px-[8px] py-[3px] text-[11px] font-medium tracking-[0.04em] text-pup-maroon dark:bg-red-950/40 dark:text-primary dark:hover:bg-red-950/60 border border-red-100/30 dark:border-white/5 cursor-pointer transition-colors whitespace-nowrap"
                                    >
                                      <i className="ph-bold ph-map-pin text-[10px]"></i>
                                      RM{student.room} · CAB-{student.cabinet} · DRW-{student.drawer}
                                    </button>
                                  );
                                })()}
                              </div>
                            </td>
                            <td className="py-0 px-4 align-middle">
                               <div
                                 className="inline-flex w-fit items-center justify-center rounded-[4px] bg-gray-100 px-[8px] py-[3px] text-[11px] font-medium text-gray-900 dark:bg-zinc-800 dark:text-zinc-100 whitespace-nowrap"
                               >
                                 {r.doc_type}
                               </div>
                             </td>
                             <td className="py-0 px-4 align-middle">
                               <div
                                 className={cn("inline-flex w-fit items-center justify-center rounded-[4px] px-[8px] py-[3px] text-[11px] font-medium tracking-[0.04em] whitespace-nowrap", statusBadgeClass(r.status))}
                               >
                                 {r.status === "InProgress" ? "In Progress" : r.status}
                               </div>
                             </td>
                            <td className="py-0 px-4 align-middle text-right text-[13px] font-normal text-[#8E8E93] dark:text-zinc-500 whitespace-nowrap">
                              {formatPHDateTime(r.created_at)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
                {total > 0 && (
                  <div className="flex items-center justify-between border-t border-gray-100 bg-white p-6 px-8 dark:border-white/10 dark:bg-card mt-auto">
                    <div className="flex items-center gap-8">
                      <div className="flex items-center gap-6 text-[12px] font-normal text-gray-400 dark:text-zinc-500">
                        <span>
                          Showing {rows.length} of {total}
                        </span>
                        <div className="flex items-center gap-1.5 border-l border-gray-200 pl-6 dark:border-white/10">
                          <span className="text-[12px] text-gray-400 dark:text-zinc-500">Rows:</span>
                          <div className="flex items-center gap-1">
                            {[10, 20, 50, 100].map((size) => (
                              <button
                                key={size}
                                type="button"
                                onClick={() => {
                                  setItemsPerPage(size);
                                  setPage(1);
                                }}
                                className={`px-2 py-0.5 rounded-[4px] text-[12px] font-normal cursor-pointer transition-colors border-0 ${
                                  itemsPerPage === size
                                    ? "bg-gray-100 text-[#111111] font-medium dark:bg-white/10 dark:text-zinc-50"
                                    : "bg-transparent text-gray-450 dark:text-zinc-550 hover:text-gray-700 dark:hover:text-zinc-300"
                                }`}
                              >
                                {size}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-3">
                      <button
                        disabled={page <= 1}
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        className="h-8 bg-transparent text-[12px] font-normal text-gray-400 hover:text-pup-maroon dark:text-zinc-500 dark:hover:text-zinc-200 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer border-0 p-0"
                      >
                        Prev
                      </button>

                      <div className="flex h-8 min-w-[32px] items-center justify-center rounded-[6px] border border-gray-200/80 bg-white px-2.5 text-[12px] font-medium text-gray-900 dark:border-white/10 dark:bg-card dark:text-zinc-100">
                        {page}
                      </div>

                      <button
                        disabled={page >= totalPages}
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        className="h-8 bg-transparent text-[12px] font-normal text-gray-400 hover:text-pup-maroon dark:text-zinc-500 dark:hover:text-zinc-200 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer border-0 p-0"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 3. Request details Card (Right Column) */}
        <Card className="rounded-[14px] border border-[#E5E5EA] bg-white shadow-sm overflow-hidden flex flex-col min-h-[560px] dark:bg-card dark:border-white/10 dark:shadow-none p-0 mb-4" style={{ fontFamily: "Inter" }}>
          <div className="p-[16px_20px] border-b border-[#E5E5EA] bg-white flex items-center justify-between dark:border-white/10 dark:bg-card">
            <div className="text-[14px] font-semibold text-[#8E8E93] dark:text-zinc-400 tracking-wider">
              Request Details
            </div>
            {hasEdits && (
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-[10px] font-semibold text-gray-500 hover:text-gray-700 dark:text-zinc-400 dark:hover:text-zinc-200"
                  onClick={handleResetEdits}
                  disabled={saving}
                >
                  Reset
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  className="h-7 px-3 text-[10px] font-semibold btn-brand-red text-white shadow-sm dark:shadow-none"
                  onClick={handleManualSave}
                  disabled={saving}
                >
                  {saving ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            )}
          </div>
          <CardContent className="p-[20px] flex-grow flex flex-col">
            {loading ? (
              <div className="space-y-6">
                <div className="space-y-2">
                  <Skeleton className="h-3 w-16 dark:bg-muted" />
                  <Skeleton className="h-5 w-3/4 dark:bg-muted" />
                  <Skeleton className="h-3 w-1/2 dark:bg-muted" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-3 w-24 dark:bg-muted" />
                  <Skeleton className="h-5 w-1/2 dark:bg-muted" />
                </div>
                <Skeleton className="h-32 w-full rounded-brand dark:bg-muted" />
                <div className="space-y-2">
                  <Skeleton className="h-3 w-16 dark:bg-muted" />
                  <Skeleton className="h-10 w-full rounded-brand dark:bg-muted" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-3 w-16 dark:bg-muted" />
                  <Skeleton className="h-20 w-full rounded-brand dark:bg-muted" />
                </div>
              </div>
            ) : error ? (
              <div className="py-8 text-center text-red-500 font-medium">
                {error}
              </div>
            ) : !selectedId ? (
              <Empty className="flex-1 flex flex-col items-center justify-center border-0 bg-transparent text-center">
                <EmptyHeader className="flex flex-col items-center gap-0">
                  <div className="relative mb-6">
                    <div className="absolute inset-0 scale-150 animate-pulse rounded-full bg-gray-50 opacity-50 dark:bg-card"></div>
                    <EmptyMedia className="relative z-10 flex h-24 w-24 items-center justify-center rounded-3xl border border-gray-100 bg-white shadow-xl rotate-3 dark:border-white/10 dark:bg-card dark:shadow-none">
                      <i className="ph-duotone ph-file-text text-xl text-gray-300 dark:text-zinc-600"></i>
                    </EmptyMedia>
                  </div>
                  <EmptyTitle className="text-[16px] font-semibold tracking-[-0.01em] text-gray-900 dark:text-zinc-50">Select a Request</EmptyTitle>
                  <EmptyDescription className="max-w-xs text-[13px] font-normal text-[#8E8E93] dark:text-zinc-400 mt-1">
                    Select a request to see details and location.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : detailLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-6 w-3/4 dark:bg-muted" />
                <Skeleton className="h-4 w-full dark:bg-muted" />
                <Skeleton className="h-4 w-full dark:bg-muted" />
              </div>
            ) : (
              <div className="flex flex-col gap-[18px] animate-fade-up">
                {/* Student Detail Group */}
                <div className="flex flex-col">
                  <span className="text-[11px] font-semibold tracking-wider text-[#8E8E93] dark:text-zinc-400 mb-1.5">
                    Student
                  </span>
                  <div className="w-full bg-[#F5F5F7] dark:bg-zinc-800/40 border border-[#E5E5EA] dark:border-white/10 rounded-[10px] p-[12px] text-[13px] font-medium text-[#111111] dark:text-zinc-50">
                    <div>{detail.student_name}</div>
                    <div className="text-[11px] text-[#8E8E93] dark:text-zinc-500 font-normal mt-0.5">{detail.student_no}</div>
                  </div>
                </div>

                {/* Document Type Group */}
                <div className="flex flex-col">
                  <span className="text-[11px] font-semibold tracking-wider text-[#8E8E93] dark:text-zinc-400 mb-1.5">
                    Document Type
                  </span>
                  <div className="w-full bg-[#F5F5F7] dark:bg-zinc-800/40 border border-[#E5E5EA] dark:border-white/10 rounded-[10px] p-[12px] flex items-center">
                    <span className="inline-flex w-fit items-center justify-center rounded-[6px] bg-white dark:bg-zinc-800 border border-[#E5E5EA] dark:border-white/10 px-[8px] py-[3px] text-[11px] font-medium text-gray-900 dark:text-zinc-100 whitespace-nowrap">
                      {detail.doc_type}
                    </span>
                  </div>
                </div>

                {/* Status Dropdown Group */}
                <div className="flex flex-col">
                  <span className="text-[11px] font-semibold tracking-wider text-[#8E8E93] dark:text-zinc-400 mb-1.5">
                    Status
                  </span>
                  <Select
                    className="w-full h-auto py-[10px] px-[12px] text-[13px] font-normal text-[#111111] dark:text-zinc-300 bg-[#F5F5F7] dark:bg-zinc-800/40 border border-[#E5E5EA] dark:border-white/10 rounded-[10px] hover:bg-[#EAEAEA] dark:hover:bg-zinc-700/60 focus:bg-white focus:border-[#0A84FF] focus:ring-2 focus:ring-[#0A84FF]/20 focus:outline-none transition-all cursor-pointer shadow-none!"
                    value={editStatus}
                    disabled={saving}
                    onChange={(e) => setEditStatus(e.target.value)}
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>
                        {s === "InProgress" ? "In Progress" : s}
                      </option>
                    ))}
                  </Select>
                </div>

                {/* Notes Textarea Group */}
                <div className="flex flex-col">
                  <span className="text-[11px] font-semibold tracking-wider text-[#8E8E93] dark:text-zinc-400 mb-1.5">
                    Notes
                  </span>
                  <textarea
                    className="w-full min-h-[90px] p-[12px] text-[13px] font-normal text-[#111111] dark:text-zinc-300 bg-[#F5F5F7] dark:bg-zinc-800/40 border border-[#E5E5EA] dark:border-white/10 rounded-[10px] focus:bg-white focus:border-[#0A84FF] focus:ring-2 focus:ring-[#0A84FF]/20 focus:outline-none transition-all resize-none shadow-[inset_0_1px_2px_rgba(0,0,0,0.05)] placeholder:text-gray-400"
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    placeholder="Add notes..."
                  />
                </div>

                {/* Storage physical location wrapper */}
                <div className="rounded-[14px] border border-[#E5E5EA] p-[16px_20px] dark:border-white/10 bg-[#F5F5F7] dark:bg-white/3">
                  <div className="text-[11px] font-semibold tracking-wider text-[#8E8E93] dark:text-zinc-400 mb-1.5">
                    Physical Location
                  </div>

                  {studentForRequest ? (
                    <div className="text-[13px] font-normal text-[#111111] dark:text-zinc-155">
                      RM {studentForRequest.room} · CAB {studentForRequest.cabinet} · DRW {studentForRequest.drawer}
                    </div>
                  ) : (
                    <div className="text-[13px] text-amber-850 dark:text-amber-400 font-normal">
                      Student record not loaded — check student number.
                    </div>
                  )}
                  <Button
                    type="button"
                    className="mt-3 w-full bg-[#0A84FF] hover:bg-[#0070E0] text-white font-medium text-[13px] h-10 rounded-[10px] transition-all border-0 flex items-center justify-center gap-2 shadow-none!"
                    disabled={!studentForRequest}
                    onClick={() => {
                      if (!studentForRequest) return;
                      if (requestNeedsPhysicalVerification) {
                        setFileWarningOpen(true);
                        return;
                      }
                      onLocateOnMap(studentForRequest);
                    }}
                  >
                    Locate
                  </Button>
                </div>

                {detail.status === "Ready" && retentionExpiryDate && (
                  <div className="rounded-brand border border-amber-250 bg-amber-50/40 p-3.5 dark:border-amber-950/40 dark:bg-amber-950/10 animate-in fade-in duration-fast">
                    <div className="flex gap-3">
                      <i className="ph-bold ph-calendar-blank text-amber-700 dark:text-amber-500 text-lg shrink-0 mt-0.5"></i>
                      <div className="text-[12px]">
                        <span className="font-semibold text-amber-950 dark:text-amber-300 block tracking-wider text-[10px]">
                          PUP ODRS Retention Policy
                        </span>
                        <span className="text-gray-600 dark:text-zinc-400 block mt-0.5 leading-normal">
                          Unclaimed documents are shredded after 90 days according to ODRS policy.
                        </span>
                        <span className="text-amber-850 dark:text-amber-400 font-semibold block mt-1.5 flex items-center gap-1.5">
                          <i className="ph-bold ph-warning"></i>
                          Shred Schedule: {retentionExpiryDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          {daysRemaining !== null && (
                            <span className="text-gray-500 dark:text-zinc-500 font-normal">({daysRemaining > 0 ? `${daysRemaining}d left` : "Expired"})</span>
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
                  )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden bg-white border border-gray-200 shadow-2xl rounded-brand dark:bg-card dark:border-white/10">
          <DialogHeader className="p-6 border-b border-gray-100 bg-gray-50 dark:border-white/10 dark:bg-white/5">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl border border-red-100 dark:border-zinc-800 bg-red-50 text-pup-maroon dark:text-primary shadow-sm flex items-center justify-center shrink-0 dark:bg-red-950/30 dark:text-primary dark:shadow-none">
                <i className="ph-duotone ph-pencil-line text-xl"></i>
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-lg font-semibold tracking-tight text-gray-900 dark:text-zinc-50">New Alumni Request</DialogTitle>
                <DialogDescription className="text-sm font-medium text-gray-600 mt-1 dark:text-zinc-300">
                  Enter the student number and document type.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <form onSubmit={handleCreate}>
            <div className="p-6 space-y-4">
              {selectedStudent ? (
                <div className="rounded-brand border border-red-100 bg-red-50/50 p-4 relative animate-in fade-in zoom-in-95 duration-fast dark:border-white/10 dark:bg-red-950/20">
                  <button
                    type="button"
                    className="absolute top-2.5 right-2.5 text-gray-400 hover:text-gray-600 transition-colors bg-white hover:bg-gray-100 border border-gray-200 rounded-full w-5 h-5 flex items-center justify-center shadow-xs dark:bg-zinc-800 dark:border-white/10 dark:text-zinc-300"
                    onClick={() => {
                      setSelectedStudent(null);
                      setCreateStudentNo("");
                    }}
                  >
                    <i className="ph-bold ph-x text-[10px]"></i>
                  </button>
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-pup-maroon/10 text-pup-maroon flex items-center justify-center shrink-0 dark:bg-pup-maroon/20">
                      <i className="ph-bold ph-user-focus text-lg"></i>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-gray-900 text-sm truncate dark:text-zinc-50">{selectedStudent.name}</div>
                      <div className="text-xs text-gray-500 mt-0.5 dark:text-zinc-400">{selectedStudent.studentNo || selectedStudent.student_no}</div>
                      <div className="text-[11px] text-gray-600 mt-1 flex flex-wrap gap-x-2 gap-y-0.5 dark:text-zinc-300">
                        <span>Course: <strong className="text-gray-800 dark:text-zinc-100">{selectedStudent.courseCode || selectedStudent.course_code || "—"}</strong></span>
                        <span>Section: <strong className="text-gray-800 dark:text-zinc-100">{selectedStudent.section || "—"}</strong></span>
                        <span>Year: <strong className="text-gray-800 dark:text-zinc-100">{selectedStudent.yearLevel || selectedStudent.year_level || "—"}</strong></span>
                      </div>
                      <div className="text-[11px] text-pup-maroon dark:text-red-500 font-semibold mt-2 flex items-center gap-1">
                        <i className="ph-bold ph-archive-tray text-xs"></i>
                        <span>Storage: Room {selectedStudent.room} · Cabinet {selectedStudent.cabinet} · Drawer {selectedStudent.drawer}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="relative">
                    <label className="text-xs font-semibold text-gray-700 dark:text-zinc-200">
                      Search Student (Name or Number)
                    </label>
                    <div className="relative mt-1.5">
                      <i className="ph-bold ph-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
                      <Input
                        className="pl-9 bg-white border-gray-300 rounded-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pup-maroon focus-visible:border-gray-300 dark:bg-zinc-900 dark:border-zinc-800 dark:focus-visible:border-zinc-700"
                        value={studentSearch}
                        onChange={(e) => setStudentSearch(e.target.value)}
                        placeholder="Type to search by student name or number..."
                      />
                    </div>
                    {studentSuggestions.length > 0 && (
                      <div className="absolute z-50 left-0 right-0 mt-1 rounded-brand border border-gray-200 bg-white overflow-hidden shadow-lg animate-in fade-in slide-in-from-top-1 duration-fast dark:bg-zinc-900 dark:border-zinc-800">
                        {studentSuggestions.map((s) => {
                          const sn = String(s?.studentNo || s?.student_no || "");
                          return (
                            <button
                              key={sn}
                              type="button"
                              className="w-full text-left px-3 py-2 border-b last:border-b-0 border-gray-100 hover:bg-red-50/50 transition-colors group flex flex-col gap-0.5 dark:border-zinc-800 dark:hover:bg-zinc-800/50"
                              onClick={() => {
                                setSelectedStudent(s);
                                setCreateStudentNo(sn);
                                setStudentSearch("");
                              }}
                            >
                              <div className="text-sm font-semibold text-gray-900 dark:text-zinc-100 group-hover:text-pup-maroon dark:group-hover:text-red-400 transition-colors">
                                {s?.name}
                              </div>
                              <div className="text-[10px] text-gray-500 dark:text-zinc-400 flex items-center gap-1.5">
                                <span>{sn}</span>
                                <span className="text-gray-300 dark:text-zinc-700">•</span>
                                <span>{s?.courseCode || s?.course_code || "—"} - {s?.section || "—"}</span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div>
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-gray-700 dark:text-zinc-200">
                        Or Enter Custom Student Number
                      </label>
                      <span className="text-[10px] text-gray-400 font-semibold">If student record is missing</span>
                    </div>
                    <Input
                      className="mt-1.5 bg-white border-gray-300 rounded-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pup-maroon focus-visible:border-gray-300 dark:bg-zinc-900 dark:border-zinc-800 dark:focus-visible:border-zinc-700"
                      value={createStudentNo}
                      onChange={(e) => setCreateStudentNo(e.target.value)}
                      placeholder="202X-XXXXX-MN-0"
                    />
                  </div>
                </div>
              )}
              <div>
                <label className="text-xs font-semibold text-gray-700 dark:text-zinc-200">
                  Document Type
                </label>
                <Select
                  className="mt-1.5 h-10 w-full rounded-brand border border-gray-300 bg-white px-3 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pup-maroon focus-visible:border-gray-300 dark:bg-card dark:border-white/10"
                  value={createDocType}
                  onChange={(e) => setCreateDocType(e.target.value)}
                  required
                >
                  <option value="">Select type…</option>
                  {docTypes.map((dt) => (
                    <option key={dt} value={dt}>
                      {dt}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-700 dark:text-zinc-200">
                  Notes (Optional)
                </label>
                <textarea
                  className="mt-1.5 w-full min-h-[72px] rounded-brand border border-gray-300 p-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pup-maroon focus-visible:border-gray-300 dark:bg-zinc-900 dark:border-zinc-800 dark:focus-visible:border-zinc-700"
                  value={createNotes}
                  onChange={(e) => setCreateNotes(e.target.value)}
                  placeholder="Requester name, contact, purpose…"
                />
              </div>
            </div>
            <div className="p-4 border-t border-gray-100 bg-white flex flex-col-reverse sm:flex-row sm:justify-end gap-2 dark:border-white/10 dark:bg-card">
              <Button
                type="button"
                variant="outline"
                className="px-5 text-sm font-semibold border-gray-300 text-gray-700 hover:bg-gray-50 rounded-brand dark:text-zinc-200 dark:hover:bg-white/10 dark:bg-card dark:border-white/10"
                onClick={() => setCreateOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="px-5 btn-brand-red font-semibold shadow-sm rounded-brand gap-2 flex items-center dark:shadow-none"
                disabled={submitting}
              >
                <i className="ph-bold ph-plus-circle text-lg"></i>
                {submitting ? "Saving..." : "Create Request"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog open={fileWarningOpen} onOpenChange={setFileWarningOpen}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden bg-white border border-gray-200 shadow-2xl rounded-brand dark:bg-card dark:border-white/10">
          <DialogHeader className="p-6 bg-white dark:bg-card border-none pb-0">
            <div className="min-w-0">
              <DialogTitle className="text-[16px] font-semibold tracking-[-0.01em] text-gray-900 dark:text-zinc-50">
                No Digital Copy
              </DialogTitle>
              <DialogDescription className="text-[13px] font-normal text-gray-500 dark:text-zinc-400 mt-1">
                Document not yet scanned. Check physical storage.
              </DialogDescription>
            </div>
          </DialogHeader>
          <div className="p-6 pt-4 space-y-4">
            <div className="space-y-3 text-sm">
              <div className="rounded-brand border border-amber-250 bg-amber-50/40 p-3.5 text-[12px] text-amber-850 dark:border-amber-950/40 dark:bg-amber-950/10">
                Check physical file before releasing.
              </div>
              {studentForRequest ? (
                <div 
                  className="rounded-[8px] p-[10px_14px] bg-white dark:bg-card text-[13px] font-normal text-pup-maroon dark:text-red-400"
                  style={{ borderWidth: '0.5px', borderStyle: 'solid', borderColor: 'rgba(0,0,0,0.1)' }}
                >
                  RM {studentForRequest.room} · CAB {studentForRequest.cabinet} · DRW {studentForRequest.drawer}
                </div>
              ) : (
                <Empty className="py-6 border-red-200 bg-red-50 text-red-800 dark:bg-red-950/30">
                  <EmptyHeader>
                    <EmptyMedia>
                      <i className="ph-bold ph-warning-circle text-xl text-red-600"></i>
                    </EmptyMedia>
                    <EmptyTitle className="text-sm">No Mapped Storage Location</EmptyTitle>
                    <EmptyDescription className="text-red-700/70 text-xs">
                      This student record has no physical drawer assignment.
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              )}
            </div>
          </div>
          <div className="p-6 pt-0 border-none bg-white dark:bg-card flex justify-end items-center gap-4">
            <Button
              type="button"
              variant="ghost"
              className="text-[13px] font-medium text-gray-500 dark:text-zinc-400 bg-transparent hover:bg-transparent border-none shadow-none p-0 h-auto cursor-pointer"
              onClick={() => setFileWarningOpen(false)}
            >
              Close
            </Button>

            {studentForRequest ? (
              <Button
                type="button"
                className="flex h-[36px] items-center justify-center rounded-[8px] btn-brand-red text-[13px] font-medium text-white shadow-none! border-none! py-0 px-4 cursor-pointer"
                onClick={() => {
                  setFileWarningOpen(false);
                  onLocateOnMap(studentForRequest);
                }}
              >
                Check Anyway
              </Button>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </div>
    </TooltipProvider>
  );
}
