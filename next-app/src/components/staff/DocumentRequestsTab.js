"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { Select } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"

const STATUS_OPTIONS = [
  "Pending",
  "Ready",
  "Completed",
  "Cancelled",
  "Shredded",
];

function SortIndicator({ column, sortBy, sortOrder }) {
  if (sortBy !== column)
    return <i className="ph-bold ph-caret-up-down ml-1 text-[11px] opacity-40 transition-opacity group-hover:opacity-70 dark:opacity-30 dark:group-hover:opacity-60"></i>
  return sortOrder === "ASC" ? (
    <i className="ph-bold ph-caret-up ml-1 text-[11px] text-pup-maroon animate-in fade-in zoom-in duration-300 dark:text-primary"></i>
  ) : (
    <i className="ph-bold ph-caret-down ml-1 text-[11px] text-pup-maroon animate-in fade-in zoom-in duration-300 dark:text-primary"></i>
  )
}

function statusBadgeClass(status) {
  const s = String(status || "").toUpperCase();
  if (s === "PENDING") return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:text-amber-500/90 dark:border-amber-900/50";
  if (s === "DONE" || s === "COMPLETED") return "bg-emerald-50 dark:bg-emerald-950/15 text-emerald-800 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20";
  if (s === "CANCELLED") return "bg-gray-100 dark:bg-zinc-800/40 text-gray-600 dark:text-zinc-400 border-gray-200 dark:border-zinc-800/65";
  if (s === "READY") return "bg-sky-50 dark:bg-sky-950/15 text-sky-800 dark:text-sky-400 border-sky-200 dark:border-sky-500/20";
  if (s === "SHREDDED") return "bg-rose-50 dark:bg-rose-950/15 text-rose-800 dark:text-rose-400 border-rose-200 dark:border-rose-500/20";
  if (s === "PROCESSING" || s === "INPROGRESS") return "bg-amber-50 dark:bg-amber-950/15 text-amber-900 dark:text-amber-400 border-amber-200 dark:border-amber-500/20";
  return "bg-red-50 dark:bg-red-950/15 text-pup-maroon dark:text-red-400 border-red-100 dark:border-red-500/20";
}

function statusBadgeIcon(status) {
  const s = String(status || "").toUpperCase();
  if (s === "PENDING") return "ph-clock";
  if (s === "PROCESSING" || s === "INPROGRESS") return "ph-gear-six";
  if (s === "READY") return "ph-bell";
  if (s === "DONE" || s === "COMPLETED") return "ph-check-circle";
  if (s === "CANCELLED") return "ph-x-circle";
  if (s === "SHREDDED") return "ph-trash";
  return "ph-clock";
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
      if (showLoading) setLoading(true);
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
        setRows(Array.isArray(json.data) ? json.data : []);
        setTotal(Number(json.total) || 0);
      } catch (e) {
        if (showLoading) {
          showToast({ title: "Load Failed", description: e?.message || "Unable to load requests." }, true);
          setRows([]);
          setTotal(0);
        }
      } finally {
        if (showLoading) setLoading(false);
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

  const handleItemsPerPageChange = (e) => {
    setItemsPerPage(Number(e.target.value));
    setPage(1);
  };
  return (
    <div className="flex flex-col h-auto gap-6 animate-fade-up font-inter">
      {/* 1. Alumni Request Card (Header & Filters) */}
      <Card className="rounded-brand border border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-card dark:shadow-none overflow-hidden">
        <PageHeader
          icon="ph-tray"
          title="Alumni Requests"
          description="Manage and track alumni requests."
          actions={
            <div className="flex items-center gap-3">
              {!loading && !error && (
                <Button
                  type="button"
                  className="btn-brand-red font-bold shrink-0 dark:shadow-none"
                  onClick={() => setCreateOpen(true)}
                >
                  <i className="ph-bold ph-plus mr-1.5"></i>
                  New Request
                </Button>
              )}
            </div>
          }
        />
        
        {!loading && !error && (
          <div className="bg-white border-t border-gray-100 p-4 backdrop-blur-md dark:bg-card/50 dark:border-white/10">
            <div className="flex w-full flex-wrap items-end gap-6">
              {/* Global Search */}
              <div className="flex-1 min-w-[320px]">
                <div className="mb-1.5 flex items-center justify-between">
                  <label className="text-[10px] font-black tracking-widest text-gray-400 dark:text-zinc-500">
                    Search Requests
                  </label>
                  <span className="text-[9px] font-black text-pup-maroon dark:text-primary/70">
                    {total > 0 ? `${total.toLocaleString()} matches` : "No results"}
                  </span>
                </div>
                <div className="relative group">
                  <i className="ph-bold ph-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 transition-colors group-focus-within:text-pup-maroon dark:text-zinc-500"></i>
                  <Input
                    className="h-11 rounded-brand border border-gray-200 bg-white pl-11 pr-4 text-sm font-medium transition-all placeholder:text-gray-400 focus:border-pup-maroon/30 focus:ring-4 focus:ring-pup-maroon/5 dark:border-white/10 dark:bg-card dark:text-zinc-300 dark:focus:border-primary"
                    placeholder="Student no., name, document type…"
                    value={q}
                    onChange={(e) => {
                      setQ(e.target.value);
                      setPage(1);
                    }}
                  />
                </div>
              </div>

              {/* Status Filter */}
              <div className="w-full sm:w-48">
                <label className="mb-1.5 block text-[10px] font-black tracking-widest text-gray-400 dark:text-zinc-500">
                  Status
                </label>
                <Select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setPage(1);
                  }}
                >
                  <option value="">All</option>
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
          </div>
        )}

        {/* Active filter Chips Row */}
        {!loading && !error && (q !== "" || statusFilter !== "") && (
          <div className="border-t border-gray-100 bg-white px-4 py-3 animate-in fade-in slide-in-from-top-1 duration-300 dark:border-white/10 dark:bg-card">
            <div className="flex flex-wrap items-center gap-2">
              <span className="mr-1 text-[10px] font-bold tracking-widest text-gray-400 dark:text-zinc-500">Active filters:</span>
              {q && (
                <div className="flex items-center gap-1 rounded-full border border-gray-300 bg-pup-maroon/10 px-2.5 py-1 text-[10px] font-bold text-pup-maroon dark:text-primary dark:border-white/10 dark:text-primary">
                  Search: {q}
                  <button
                    onClick={() => { setQ(""); setPage(1); }}
                    className="ml-1 hover:text-pup-darkMaroon transition-colors"
                  >
                    <i className="ph-bold ph-x text-[8px]"></i>
                  </button>
                </div>
              )}
              {statusFilter && (
                <div className="flex items-center gap-1 rounded-full border border-blue-100/30 bg-blue-50 px-2.5 py-1 text-[10px] font-bold text-blue-600 dark:bg-blue-950/30 dark:text-blue-400">
                  Status: {statusFilter}
                  <button
                    onClick={() => { setStatusFilter(""); setPage(1); }}
                    className="ml-1 hover:text-blue-800 transition-colors"
                  >
                    <i className="ph-bold ph-x text-[8px]"></i>
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
                className="h-6 rounded-full border border-dashed border-gray-300 px-3 text-[10px] font-black text-pup-maroon dark:text-primary hover:bg-red-50 hover:text-pup-darkMaroon dark:border-white/10 dark:text-primary dark:bg-red-950/30"
              >
                Clear All Filters
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
            {loading ? (
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
                      <i className="ph-duotone ph-warning-circle text-3xl text-pup-maroon dark:text-primary" />
                    </EmptyMedia>
                    <EmptyTitle className="text-lg font-bold text-gray-900 dark:text-zinc-50">Could Not Load Report</EmptyTitle>
                    <EmptyDescription className="text-sm font-medium text-gray-600 mt-1 max-w-md dark:text-zinc-300">
                      {error}
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              </div>
            ) : (
              <div 
                key={`${page}-${statusFilter}-${debouncedQ}-${sortBy}-${sortOrder}`}
                className="flex-1 w-full overflow-auto animate-fade-up"
              >
                <div className="overflow-x-auto flex-1">
                  <table className="min-w-full text-sm table-fixed">
                    <thead className="bg-gray-50 backdrop-blur-sm select-none dark:bg-muted">
                      <tr className="text-left text-[10px] font-black tracking-widest text-gray-600 dark:text-zinc-300">
                        <th className="p-4 w-20">
                          <button
                            type="button"
                            onClick={() => handleSort("id")}
                            className="group flex items-center transition-colors hover:text-pup-maroon dark:hover:text-red-500 focus:outline-none dark:text-zinc-300"
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
                            className="group flex items-center transition-colors hover:text-pup-maroon dark:hover:text-red-500 focus:outline-none dark:text-zinc-300"
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
                            className="group flex items-center transition-colors hover:text-pup-maroon dark:hover:text-red-500 focus:outline-none dark:text-zinc-300"
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
                            className="group flex items-center transition-colors hover:text-pup-maroon dark:hover:text-red-500 focus:outline-none dark:text-zinc-300"
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
                              className="group flex items-center transition-colors hover:text-pup-maroon dark:hover:text-red-500 focus:outline-none dark:text-zinc-300"
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
                    <tbody className="divide-y divide-gray-100 dark:divide-white/10">
                      {rows.length === 0 ? (
                        <tr className="border-0 hover:bg-transparent">
                          <td colSpan={5} className="p-0 border-0">
                            <Empty className="flex h-[450px] flex-col items-center justify-center border-0 bg-transparent text-center">
                              <EmptyHeader className="flex flex-col items-center gap-0">
                                <div className="relative mb-6">
                                  <div className="absolute inset-0 scale-150 animate-pulse rounded-full bg-gray-50 opacity-50 dark:bg-card"></div>
                                  <EmptyMedia className="relative z-10 flex h-24 w-24 items-center justify-center rounded-3xl border border-gray-100 bg-white shadow-xl rotate-3 dark:border-white/10 dark:bg-card dark:shadow-none">
                                    <i className="ph-duotone ph-magnifying-glass text-5xl text-gray-300 dark:text-zinc-600"></i>
                                  </EmptyMedia>
                                </div>
                                <EmptyTitle className="text-xl font-black text-gray-900 dark:text-zinc-50">No Alumni Requests Yet</EmptyTitle>
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
                              "group border-l-2 border-transparent transition-all duration-200 hover:bg-gray-50 dark:bg-card dark:hover:bg-white/5 select-none cursor-pointer",
                              selectedId === r.id && "border-amber-400 bg-amber-50 dark:bg-amber-950/40"
                            )}
                            onClick={() => openDetail(r.id)}
                          >
                            <td className="p-4 text-xs text-gray-500 dark:text-zinc-400">
                              #{r.id}
                            </td>
                            <td className="p-4">
                              <div className="font-bold text-gray-900 dark:text-zinc-50">
                                {r.student_name || "—"}
                              </div>
                              <div className="text-[11px] text-gray-500 dark:text-zinc-400">
                                {r.student_no}
                              </div>
                            </td>
                            <td className="p-4">
                               <Badge
                                 variant="outline"
                                 className="flex w-fit items-center gap-1.5 px-2.5 py-1 rounded-full border border-pup-maroon/20 bg-pup-maroon/10 text-[9px] font-black tracking-wider text-pup-maroon whitespace-nowrap dark:border-red-400/20 dark:bg-red-400/10 dark:text-red-400 shadow-none"
                               >
                                 <i className="ph-bold ph-file-text text-[10px]"></i>
                                 {r.doc_type}
                               </Badge>
                             </td>
                             <td className="p-4">
                               <Badge
                                 variant="outline"
                                 className={cn("flex w-fit items-center gap-1.5 rounded-full border px-2.5 py-1 text-[9px] font-black tracking-wider shadow-none transition-all", statusBadgeClass(r.status))}
                               >
                                 <i className={cn("ph-fill text-[10px]", statusBadgeIcon(r.status))}></i>
                                 {r.status}
                               </Badge>
                             </td>
                            <td className="p-4 text-right text-[11px] text-gray-500 whitespace-nowrap dark:text-zinc-400">
                              {formatPHDateTime(r.created_at)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
                {total > 0 ? (
                  <div className="flex items-center justify-between border-t border-gray-100 bg-white px-6 py-3 rounded-b-brand dark:border-white/10 dark:bg-card">
                    <div className="flex items-center gap-8 select-none cursor-default">
                      <div className="flex items-center gap-6 text-[11px] font-black text-gray-400 tracking-widest dark:text-zinc-500">
                        <span>
                          Showing <strong className="text-gray-900 dark:text-zinc-50">{Math.min(itemsPerPage, total - (page - 1) * itemsPerPage)}</strong> out of <strong className="text-gray-900 dark:text-zinc-50">{total.toLocaleString()}</strong> entries
                        </span>

                        <div className="flex items-center gap-3 border-l border-gray-200 pl-6 dark:border-white/10">
                          <span className="text-[10px] opacity-60">Rows:</span>
                          <Select
                            className="h-8 w-16 cursor-pointer rounded-brand border border-gray-300 bg-white px-2 text-[10px] font-bold text-gray-700 focus:ring-1 focus:ring-pup-maroon focus:outline-none transition-all hover:bg-gray-50 dark:bg-card dark:text-zinc-200 dark:hover:bg-white/10 dark:border-white/10"
                            value={itemsPerPage}
                            onChange={handleItemsPerPageChange}
                          >
                            <option value={10}>10</option>
                            <option value={20}>20</option>
                            <option value={50}>50</option>
                            <option value={100}>100</option>
                            <option value={200}>200</option>
                          </Select>
                        </div>
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-3 select-none">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={page <= 1}
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        className="h-10 rounded-brand border border-gray-300 bg-white px-5 text-[10px] font-black tracking-widest text-gray-600 shadow-sm transition-all hover:border-gray-300 hover:bg-red-50 hover:text-pup-maroon dark:hover:text-red-500 active:scale-95 disabled:opacity-30 dark:bg-card dark:text-zinc-300 dark:shadow-none dark:hover:border-zinc-700 dark:border-white/10"
                      >
                        <i className="ph-bold ph-caret-left mr-2 text-base"></i>
                        Prev
                      </Button>

                      <div className="flex h-9 min-w-[48px] cursor-default items-center justify-center rounded-brand border border-gray-200 bg-white px-3 text-[11px] font-black text-gray-900 shadow-sm dark:border-white/10 dark:bg-card dark:text-zinc-50 dark:shadow-none">
                        {page}
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        disabled={page >= totalPages}
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        className="h-10 rounded-brand border border-gray-300 bg-white px-5 text-[10px] font-black tracking-widest text-gray-500 shadow-sm transition-all hover:border-gray-300 hover:bg-red-50 hover:text-pup-maroon dark:hover:text-red-500 active:scale-95 disabled:opacity-30 dark:bg-card dark:text-zinc-400 dark:shadow-none dark:hover:border-zinc-700 dark:border-white/10"
                      >
                        Next
                        <i className="ph-bold ph-caret-right ml-2 text-base"></i>
                      </Button>
                    </div>
                  </div>
                ) : null}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 3. Request details Card (Right Column) */}
        <Card className="rounded-brand border border-gray-200 bg-white shadow-sm overflow-hidden flex flex-col min-h-[280px] lg:min-h-0 dark:bg-card dark:border-white/10 dark:shadow-none p-0 mb-4">
          <div className="p-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between dark:border-white/10 dark:bg-muted/30">
            <div className="text-xs font-bold tracking-wider text-gray-500 dark:text-zinc-400">
              Request Details
            </div>
            {hasEdits && (
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-[10px] font-black text-gray-500 hover:text-gray-700 dark:text-zinc-400 dark:hover:text-zinc-200"
                  onClick={handleResetEdits}
                  disabled={saving}
                >
                  Reset
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  className="h-7 px-3 text-[10px] font-black btn-brand-red text-white shadow-sm dark:shadow-none"
                  onClick={handleManualSave}
                  disabled={saving}
                >
                  {saving ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            )}
          </div>
          <CardContent className="p-4 flex-grow flex flex-col">
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
                      <i className="ph-duotone ph-file-text text-5xl text-gray-300 dark:text-zinc-600"></i>
                    </EmptyMedia>
                  </div>
                  <EmptyTitle className="text-xl font-black text-gray-900 dark:text-zinc-50">Select a Request</EmptyTitle>
                  <EmptyDescription className="max-w-xs text-sm font-medium text-gray-500 dark:text-zinc-400">
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
              <div className="space-y-4 animate-fade-up">
                      <div>
                        <div className="text-xs font-bold text-gray-500 dark:text-zinc-400">
                          Student
                        </div>
                        <div className="font-bold text-gray-900 dark:text-zinc-50">{detail.student_name}</div>
                        <div className="text-xs text-gray-600 dark:text-zinc-300">{detail.student_no}</div>
                      </div>
                      <div>
                        <div className="text-xs font-bold text-gray-500 dark:text-zinc-400">
                          Document Type
                        </div>
                        <div className="font-semibold text-gray-900 dark:text-zinc-50">{detail.doc_type}</div>
                      </div>

                      <div className="rounded-brand border border-gray-200 p-3 dark:border-white/10">
                        <div className="text-xs font-bold text-gray-600 mb-1 dark:text-zinc-300">
                          Physical Location
                        </div>

                        {studentForRequest ? (
                          <div className="text-sm text-gray-800 dark:text-zinc-100">
                            Room {studentForRequest.room} · Cabinet {studentForRequest.cabinet}{" "}
                            · Drawer {studentForRequest.drawer}
                          </div>
                        ) : (
                          <div className="text-sm text-amber-800 font-medium">
                            Student record not loaded — refresh data or check student no.
                          </div>
                        )}
                        <Button
                          type="button"
                          className="mt-3 w-full btn-brand-red font-bold text-xs dark:shadow-none"
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
                          <i className="ph-bold ph-map-pin mr-2"></i>
                          Locate On Storage Map
                        </Button>
                      </div>

                      {detail.status === "Ready" && retentionExpiryDate && (
                        <div className="rounded-brand border border-amber-200 bg-amber-50/50 p-3 animate-in fade-in duration-200">
                          <div className="flex gap-2">
                            <i className="ph-bold ph-calendar-blank text-amber-700 text-lg shrink-0 mt-0.5 animate-pulse"></i>
                            <div className="text-xs">
                              <span className="font-bold text-amber-950 block tracking-wider text-[10px]">
                                PUP ODRS Retention Policy
                              </span>
                              <span className="text-gray-600 block mt-0.5 leading-relaxed">
                                Unclaimed documents are shredded after 90 days according to ODRS policy.
                              </span>
                              <span className="text-amber-800 font-bold block mt-1.5 flex items-center gap-1.5">
                                <i className="ph-bold ph-warning"></i>
                                Shred Schedule: {retentionExpiryDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                {daysRemaining !== null && (
                                  <span className="text-gray-500 font-normal">({daysRemaining > 0 ? `${daysRemaining}d left` : "Expired"})</span>
                                )}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}

                      <div>
                        <label className="text-xs font-bold text-gray-600 dark:text-zinc-300">
                          Status
                        </label>
                        <Select
                          className="mt-1 h-10 w-full rounded-brand border border-gray-300 bg-white text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-pup-maroon dark:bg-card dark:border-white/10"
                          value={editStatus}
                          disabled={saving}
                          onChange={(e) => setEditStatus(e.target.value)}
                        >
                          {STATUS_OPTIONS.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </Select>
                      </div>

                      <div>
                        <label className="text-xs font-bold text-gray-600 dark:text-zinc-300">
                          Notes
                        </label>
                        <textarea
                          className="mt-1 w-full min-h-[72px] rounded-brand border border-gray-300 p-2 text-sm focus:outline-none focus:ring-2 focus:ring-pup-maroon dark:border-white/10"
                          value={editNotes}
                          onChange={(e) => setEditNotes(e.target.value)}
                        />
                      </div>
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
                <i className="ph-duotone ph-pencil-line text-2xl"></i>
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-lg font-black tracking-tight text-gray-900 dark:text-zinc-50">New Alumni Request</DialogTitle>
                <DialogDescription className="text-sm font-medium text-gray-600 mt-1 dark:text-zinc-300">
                  Enter the student number and document type.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <form onSubmit={handleCreate}>
            <div className="p-6 space-y-4">
              {selectedStudent ? (
                <div className="rounded-brand border border-red-100 bg-red-50/50 p-4 relative animate-in fade-in zoom-in-95 duration-200 dark:border-white/10 dark:bg-red-950/20">
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
                      <div className="font-bold text-gray-900 text-sm truncate dark:text-zinc-50">{selectedStudent.name}</div>
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
                    <label className="text-xs font-bold text-gray-700 dark:text-zinc-200">
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
                      <div className="absolute z-50 left-0 right-0 mt-1 rounded-brand border border-gray-200 bg-white overflow-hidden shadow-lg animate-in fade-in slide-in-from-top-1 duration-200 dark:bg-zinc-900 dark:border-zinc-800">
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
                              <div className="text-sm font-bold text-gray-900 dark:text-zinc-100 group-hover:text-pup-maroon dark:group-hover:text-red-400 transition-colors">
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
                      <label className="text-xs font-bold text-gray-700 dark:text-zinc-200">
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
                <label className="text-xs font-bold text-gray-700 dark:text-zinc-200">
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
                <label className="text-xs font-bold text-gray-700 dark:text-zinc-200">
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
                className="px-5 text-sm font-bold border-gray-300 text-gray-700 hover:bg-gray-50 rounded-brand dark:text-zinc-200 dark:hover:bg-white/10 dark:bg-card dark:border-white/10"
                onClick={() => setCreateOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="px-5 btn-brand-red font-bold shadow-sm rounded-brand gap-2 flex items-center dark:shadow-none"
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
          <DialogHeader className="p-6 border-b border-gray-100 bg-gray-50 dark:border-white/10 dark:bg-white/5">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl border border-red-100 bg-red-50 text-red-700 shadow-sm flex items-center justify-center shrink-0 dark:bg-red-950/30 dark:shadow-none">
                <i className="ph-duotone ph-warning-circle text-2xl"></i>
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-lg font-black tracking-tight text-gray-900 dark:text-zinc-50">
                  No Digital Copy
                </DialogTitle>
                <DialogDescription className="text-sm font-medium text-gray-600 mt-1 dark:text-zinc-300">
                  Document not yet scanned. Check physical storage.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="p-6 space-y-4">
            <div className="space-y-3 text-sm">
              <div className="rounded-brand border border-amber-200 bg-amber-50 px-4 py-3 text-amber-900 font-medium dark:bg-amber-950/30">
                Check physical file before releasing.
              </div>
              {studentForRequest ? (
                <div className="rounded-brand border border-gray-200 bg-gray-50 px-4 py-3 text-gray-800 font-medium dark:border-white/10 dark:bg-card dark:text-zinc-100">
                  Room {studentForRequest.room} · Cabinet {studentForRequest.cabinet} · Drawer{" "}
                  {studentForRequest.drawer}
                </div>
              ) : (
                <Empty className="py-6 border-red-200 bg-red-50 text-red-800 dark:bg-red-950/30">
                  <EmptyHeader>
                    <EmptyMedia>
                      <i className="ph-bold ph-warning-circle text-2xl text-red-600"></i>
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
          <div className="p-4 border-t border-gray-100 bg-white flex flex-col-reverse sm:flex-row sm:justify-end gap-2 dark:border-white/10 dark:bg-card">
            <Button
              type="button"
              variant="outline"
              className="px-5 text-sm font-bold border-gray-300 text-gray-700 hover:bg-gray-50 rounded-brand dark:text-zinc-200 dark:hover:bg-white/10 dark:bg-card dark:border-white/10"
              onClick={() => setFileWarningOpen(false)}
            >
              Close
            </Button>

            {studentForRequest ? (
              <Button
                type="button"
                className="px-5 btn-brand-red font-bold shadow-sm rounded-brand gap-2 flex items-center dark:shadow-none"
                onClick={() => {
                  setFileWarningOpen(false);
                  onLocateOnMap(studentForRequest);
                }}
              >
                <i className="ph-bold ph-map-pin text-lg"></i>
                Check Storage Map Anyway
              </Button>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
