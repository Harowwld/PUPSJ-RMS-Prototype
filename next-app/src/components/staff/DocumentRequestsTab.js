"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
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

const STATUS_OPTIONS = [
  "Pending",
  "Ready",
  "Done",
  "Cancelled",
];

function statusBadgeClass(status) {
  const s = String(status || "").toUpperCase();
  if (s === "DONE" || s === "COMPLETED") return "bg-emerald-50 text-emerald-800 border-emerald-200";
  if (s === "CANCELLED") return "bg-gray-100 text-gray-600 border-gray-200";
  if (s === "READY") return "bg-sky-50 text-sky-800 border-sky-200";
  if (s === "PROCESSING" || s === "INPROGRESS") return "bg-amber-50 text-amber-900 border-amber-200";
  return "bg-red-50 text-pup-maroon border-red-100";
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
  const perPage = 20;

  const [createOpen, setCreateOpen] = useState(false);
  const [createStudentNo, setCreateStudentNo] = useState("");
  const [createDocType, setCreateDocType] = useState("");
  const [createNotes, setCreateNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

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
        const offset = (page - 1) * perPage;
        const qs = new URLSearchParams();
        qs.set("limit", String(perPage));
        qs.set("offset", String(offset));
        if (debouncedQ) qs.set("q", debouncedQ);
        if (statusFilter) qs.set("status", statusFilter);
        const res = await fetch(`/api/document-requests?${qs}`, {
          cache: "no-store",
        });
        const json = await res.json().catch(() => null);
        if (!res.ok || !json?.ok) throw new Error(json?.error || "Failed to load");
        setRows(Array.isArray(json.data) ? json.data : []);
        setTotal(Number(json.total) || 0);
      } catch (e) {
        if (showLoading) {
          showToast({ title: "Load Failed", description: e?.message || "Unable to fetch document requests." }, true);
          setRows([]);
          setTotal(0);
        }
      } finally {
        if (showLoading) setLoading(false);
      }
    },
    [page, debouncedQ, statusFilter, showToast]
  );

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
      showToast({ title: "Load Failed", description: e?.message || "Unable to load request details." }, true);
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
      showToast({ title: "Request Created", description: "A new document request has been logged." });
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

  const totalPages = Math.max(1, Math.ceil(total / perPage));

  return (
    <div className="flex flex-col h-full min-h-0 gap-4 animate-fade-in font-inter">
      {loading ? (
        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-4">
          <div className="bg-white rounded-brand border border-gray-200 shadow-sm overflow-hidden flex flex-col min-h-0">
            <div className="p-4 bg-gray-50/50 border-b border-gray-200 flex flex-col lg:flex-row gap-3 lg:items-end">
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3 w-12" />
                <Skeleton className="h-10 w-full rounded-brand" />
              </div>
              <div className="w-full sm:w-48 space-y-2">
                <Skeleton className="h-3 w-12" />
                <Skeleton className="h-10 w-full rounded-brand" />
              </div>
              <Skeleton className="h-10 w-32 rounded-brand" />
            </div>
            <div className="p-6 flex-1 flex flex-col space-y-4">
              <div className="border border-gray-100 rounded-brand overflow-hidden">
                <Skeleton className="h-10 w-full rounded-none" />
                <div className="divide-y divide-gray-100">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div key={i} className="p-4 flex items-center justify-between">
                      <div className="space-y-2 flex-1">
                        <Skeleton className="h-4 w-1/4" />
                        <Skeleton className="h-3 w-1/3" />
                      </div>
                      <Skeleton className="h-6 w-20 rounded-full" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-brand border border-gray-200 shadow-sm overflow-hidden flex flex-col min-h-[280px] lg:min-h-0">
            <div className="p-4 border-b border-gray-100 bg-gray-50/80">
              <Skeleton className="h-3 w-24" />
            </div>
            <div className="p-6 space-y-6">
              <div className="space-y-2">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-5 w-1/2" />
              </div>
              <Skeleton className="h-32 w-full rounded-brand" />
              <div className="space-y-2">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-10 w-full rounded-brand" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-20 w-full rounded-brand" />
              </div>
            </div>
          </div>
        </div>
      ) : error ? (
        <Card className="flex-1 bg-white rounded-brand border border-gray-200 shadow-sm overflow-hidden flex flex-col">
          <CardContent className="p-6 flex-1 flex flex-col min-h-0">
            <Empty className="h-[320px] flex flex-col items-center justify-center text-center text-gray-500 border-0">
              <EmptyHeader className="flex flex-col items-center gap-0">
                <EmptyMedia className="w-16 h-16 rounded-full bg-white border border-gray-200 flex items-center justify-center mb-4 shadow-sm">
                  <i className="ph-duotone ph-warning-circle text-3xl text-pup-maroon" />
                </EmptyMedia>
                <EmptyTitle className="text-lg font-bold text-gray-900">Could not load report</EmptyTitle>
                <EmptyDescription className="text-sm font-medium text-gray-600 mt-1 max-w-md">
                  {error}
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          </CardContent>
        </Card>
      ) : (
        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-4">
          <div className="bg-white rounded-brand border border-gray-200 shadow-sm overflow-hidden flex flex-col min-h-0">
            <div className="p-4 bg-gray-50/50 border-b border-gray-200 flex flex-col lg:flex-row gap-3 lg:items-end">
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-gray-700 uppercase">
                    Search
                  </label>
                  {(q !== "" || statusFilter !== "") && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setQ("");
                        setStatusFilter("");
                        setPage(1);
                      }}
                      className="h-5 px-1.5 text-[9px] font-bold text-pup-maroon hover:bg-red-50 hover:text-pup-darkMaroon"
                    >
                      CLEAR ALL
                    </Button>
                  )}
                </div>
                <div className="relative">
                  <i className="ph-bold ph-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
                  <Input
                    className="h-10 pl-10 rounded-brand border-gray-300 bg-white text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pup-maroon focus-visible:border-pup-maroon transition-colors"
                    placeholder="Student no., name, document type…"
                    value={q}
                    onChange={(e) => {
                      setQ(e.target.value);
                      setPage(1);
                    }}
                  />
                </div>
              </div>
              <div className="w-full sm:w-48">
                <label className="block text-xs font-bold text-gray-700 mb-1 uppercase">
                  Status
                </label>
                <select
                  className="h-10 w-full rounded-brand border border-gray-300 bg-white px-3 text-sm font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-pup-maroon focus:border-pup-maroon transition-colors"
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
                </select>
              </div>
              <Button
                type="button"
                className="bg-pup-maroon hover:bg-red-900 font-bold shrink-0"
                onClick={() => setCreateOpen(true)}
              >
                <i className="ph-bold ph-plus mr-1.5"></i>
                NEW REQUEST
              </Button>
            </div>
            <div className="p-6 flex-1 flex flex-col min-h-0">
              <div className="flex-1 overflow-y-auto overflow-x-auto border border-gray-200 rounded-brand">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
                    <tr className="text-left text-xs uppercase tracking-wider text-gray-600">
                      <th className="p-3 font-bold w-16">ID</th>
                      <th className="p-3 font-bold">Student</th>
                      <th className="p-3 font-bold">Document</th>
                      <th className="p-3 font-bold">Status</th>
                      <th className="p-3 font-bold text-right">Created</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {rows.length === 0 ? (
                      <tr className="border-0 hover:bg-transparent">
                        <td colSpan={5} className="p-0 border-0">
                          <Empty className="h-[400px] flex flex-col items-center justify-center text-center text-gray-500 border-0">
                            <EmptyHeader className="flex flex-col items-center gap-0">
                              <EmptyMedia className="w-16 h-16 rounded-full bg-white border border-gray-200 flex items-center justify-center mb-4 shadow-sm">
                                <i className="ph-duotone ph-tray text-3xl text-pup-maroon"></i>
                              </EmptyMedia>
                              <EmptyTitle className="text-lg font-bold text-gray-900">No document requests yet</EmptyTitle>
                              <EmptyDescription className="text-sm font-medium text-gray-600 mt-1 max-w-md">
                                Create a request when an alumnus asks for a record.
                                Track status and use the storage map to pull the
                                physical drawer.
                              </EmptyDescription>
                            </EmptyHeader>
                          </Empty>
                        </td>
                      </tr>
                    ) : (
                      rows.map((r) => (
                        <tr
                          key={r.id}
                          className={`cursor-pointer hover:bg-gray-50 transition-colors ${
                            selectedId === r.id ? "bg-red-50/60" : ""
                          }`}
                          onClick={() => openDetail(r.id)}
                        >
                          <td className="p-3 font-mono text-xs text-gray-500">
                            #{r.id}
                          </td>
                          <td className="p-3">
                            <div className="font-bold text-gray-900">
                              {r.student_name || "—"}
                            </div>
                            <div className="font-mono text-[11px] text-gray-500">
                              {r.student_no}
                            </div>
                          </td>
                          <td className="p-3 font-medium text-gray-800">
                            {r.doc_type}
                          </td>
                          <td className="p-3">
                            <span
                              className={`inline-flex items-center text-[11px] font-bold px-2 py-0.5 rounded-full border ${statusBadgeClass(r.status)}`}
                            >
                              {r.status}
                            </span>
                          </td>
                          <td className="p-3 text-right text-[11px] font-mono text-gray-500 whitespace-nowrap">
                            {formatPHDateTime(r.created_at)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            {total > 0 ? (
              <div className="p-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between text-xs font-medium text-gray-600">
                <span>
                  Showing {(page - 1) * perPage + 1}-{Math.min(page * perPage, total)} of{" "}
                  <strong className="text-gray-900">{total.toLocaleString()}</strong>{" "}
                  document requests
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="h-8 text-xs font-bold text-gray-600"
                  >
                    <i className="ph-bold ph-caret-left text-[10px] mr-1"></i>
                    PREVIOUS
                  </Button>
                  <div className="px-3 text-xs font-bold text-gray-700 bg-white border border-gray-200 rounded-md h-8 flex items-center justify-center min-w-12 shadow-sm">
                    {page} / {totalPages}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    className="h-8 text-xs font-bold text-gray-600"
                  >
                    NEXT
                    <i className="ph-bold ph-caret-right text-[10px] ml-1"></i>
                  </Button>
                </div>
              </div>
            ) : null}
          </div>

          <div className="bg-white rounded-brand border border-gray-200 shadow-sm overflow-hidden flex flex-col min-h-[280px] lg:min-h-0">
            <div className="p-4 border-b border-gray-100 bg-gray-50/80 flex items-center justify-between">
              <div className="text-xs font-bold uppercase tracking-wider text-gray-500">
                Request detail
              </div>
              {hasEdits && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-[10px] font-black text-gray-500 hover:text-gray-700 uppercase"
                    onClick={handleResetEdits}
                    disabled={saving}
                  >
                    RESET
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    className="h-7 px-3 text-[10px] font-black bg-pup-maroon hover:bg-red-900 text-white uppercase shadow-sm"
                    onClick={handleManualSave}
                    disabled={saving}
                  >
                    {saving ? "SAVING..." : "SAVE CHANGES"}
                  </Button>
                </div>
              )}
            </div>
            <div className="p-4 flex-1 overflow-auto flex flex-col">
              {!selectedId && (
                <Empty className="flex-1 flex flex-col items-center justify-center text-center text-gray-500 border-0">
                  <EmptyHeader className="flex flex-col items-center gap-0">
                    <EmptyMedia className="w-16 h-16 rounded-full bg-white border border-gray-200 flex items-center justify-center mb-4 shadow-sm">
                      <i className="ph-duotone ph-file-text text-3xl text-pup-maroon"></i>
                    </EmptyMedia>
                    <EmptyTitle className="text-lg font-bold text-gray-900">No Request Selected</EmptyTitle>
                    <EmptyDescription className="text-sm font-medium text-gray-600 mt-1 max-w-[240px]">
                      Select a request from the list to see its details, notes, and physical storage location.
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              )}
              {selectedId && detailLoading && (
                <div className="space-y-3">
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                </div>
              )}
              {detail && !detailLoading && (
                <div className="space-y-4">
                  <div>
                    <div className="text-xs font-bold text-gray-500 uppercase">
                      Student
                    </div>
                    <div className="font-bold text-gray-900">{detail.student_name}</div>
                    <div className="font-mono text-xs text-gray-600">{detail.student_no}</div>
                  </div>
                  <div>
                    <div className="text-xs font-bold text-gray-500 uppercase">
                      Document type
                    </div>
                    <div className="font-semibold text-gray-900">{detail.doc_type}</div>
                  </div>

                  <div className="rounded-brand border border-gray-200 p-3">
                    <div className="text-xs font-bold text-gray-600 uppercase mb-1">
                      Physical location
                    </div>
                    {studentForRequest ? (
                      <div className="text-sm font-mono text-gray-800">
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
                      className="mt-3 w-full bg-pup-maroon hover:bg-red-900 font-bold text-xs"
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
                      LOCATE ON STORAGE MAP
                    </Button>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-gray-600 uppercase">
                      Status
                    </label>
                    <select
                      className="mt-1 h-10 w-full rounded-brand border border-gray-300 bg-white text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-pup-maroon"
                      value={editStatus}
                      disabled={saving}
                      onChange={(e) => setEditStatus(e.target.value)}
                    >
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-gray-600 uppercase">
                      Notes
                    </label>
                    <textarea
                      className="mt-1 w-full min-h-[72px] rounded-brand border border-gray-300 p-2 text-sm focus:outline-none focus:ring-2 focus:ring-pup-maroon"
                      value={editNotes}
                      onChange={(e) => setEditNotes(e.target.value)}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden bg-white border border-gray-200 shadow-2xl rounded-brand">
          <DialogHeader className="p-6 border-b border-gray-100 bg-gray-50/50">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full border border-red-100 bg-red-50 text-pup-maroon shadow-sm flex items-center justify-center shrink-0">
                <i className="ph-duotone ph-pencil-line text-2xl"></i>
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-lg font-black tracking-tight text-gray-900">New document request</DialogTitle>
                <DialogDescription className="text-sm font-medium text-gray-600 mt-1">
                  Enter the student number and the document being requested.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <form onSubmit={handleCreate}>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-700 uppercase">
                  Student number
                </label>
                <Input
                  className="mt-1.5 font-mono uppercase bg-white border-gray-300 rounded-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pup-maroon focus-visible:border-pup-maroon"
                  value={createStudentNo}
                  onChange={(e) => setCreateStudentNo(e.target.value)}
                  placeholder="202X-XXXXX-MN-0"
                  required
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-700 uppercase">
                  Document type
                </label>
                <select
                  className="mt-1.5 h-10 w-full rounded-brand border border-gray-300 bg-white px-3 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pup-maroon focus-visible:border-pup-maroon"
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
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-700 uppercase">
                  Notes (optional)
                </label>
                <textarea
                  className="mt-1.5 w-full min-h-[72px] rounded-brand border border-gray-300 p-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pup-maroon focus-visible:border-pup-maroon"
                  value={createNotes}
                  onChange={(e) => setCreateNotes(e.target.value)}
                  placeholder="Requester name, contact, purpose…"
                />
              </div>
            </div>
            <div className="p-4 border-t border-gray-100 bg-white flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                className="px-5 text-sm font-bold border-gray-300 text-gray-700 hover:bg-gray-50 rounded-brand"
                onClick={() => setCreateOpen(false)}
              >
                CANCEL
              </Button>
              <Button
                type="submit"
                className="px-5 bg-pup-maroon text-white font-bold hover:bg-red-900 shadow-sm rounded-brand gap-2 flex items-center"
                disabled={submitting}
              >
                <i className="ph-bold ph-plus-circle text-lg"></i>
                {submitting ? "SAVING…" : "CREATE REQUEST"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog open={fileWarningOpen} onOpenChange={setFileWarningOpen}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden bg-white border border-gray-200 shadow-2xl rounded-brand">
          <DialogHeader className="p-6 border-b border-gray-100 bg-gray-50/50">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full border border-red-100 bg-red-50 text-red-700 shadow-sm flex items-center justify-center shrink-0">
                <i className="ph-duotone ph-warning-circle text-2xl"></i>
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-lg font-black tracking-tight text-gray-900">
                  No digital file in system
                </DialogTitle>
                <DialogDescription className="text-sm font-medium text-gray-600 mt-1">
                  The requested document is not uploaded yet. Proceed with physical verification.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="p-6 space-y-4">
            <div className="space-y-3 text-sm">
              <div className="rounded-brand border border-amber-200 bg-amber-50 px-4 py-3 text-amber-900 font-medium">
                Verify the physical storage first before proceeding with release.
              </div>
              {studentForRequest ? (
                <div className="rounded-brand border border-gray-200 bg-gray-50 px-4 py-3 font-mono text-gray-800 font-medium">
                  Room {studentForRequest.room} · Cabinet {studentForRequest.cabinet} · Drawer{" "}
                  {studentForRequest.drawer}
                </div>
              ) : (
                <Empty className="py-6 border-red-200 bg-red-50 text-red-800">
                  <EmptyHeader>
                    <EmptyMedia>
                      <i className="ph-bold ph-warning-circle text-2xl text-red-600"></i>
                    </EmptyMedia>
                    <EmptyTitle className="text-sm">No mapped storage location</EmptyTitle>
                    <EmptyDescription className="text-red-700/70 text-xs">
                      This student record has no physical drawer assignment.
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              )}
            </div>
          </div>
          <div className="p-4 border-t border-gray-100 bg-white flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              className="px-5 text-sm font-bold border-gray-300 text-gray-700 hover:bg-gray-50 rounded-brand"
              onClick={() => setFileWarningOpen(false)}
            >
              CLOSE
            </Button>
            {studentForRequest ? (
              <Button
                type="button"
                className="px-5 bg-pup-maroon text-white font-bold hover:bg-red-900 shadow-sm rounded-brand gap-2 flex items-center"
                onClick={() => {
                  setFileWarningOpen(false);
                  onLocateOnMap(studentForRequest);
                }}
              >
                <i className="ph-bold ph-map-pin text-lg"></i>
                CHECK STORAGE MAP ANYWAY
              </Button>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
