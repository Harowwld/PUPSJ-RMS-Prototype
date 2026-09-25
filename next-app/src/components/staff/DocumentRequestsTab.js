"use client";
import HugeIcon from "@/components/shared/HugeIcon";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import DocumentRequestsTableSkeleton from "@/components/staff/skeletons/DocumentRequestsTableSkeleton";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
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
  TooltipProvider,
} from "@/components/ui/tooltip";
import PageHeader from "@/components/shared/PageHeader";
import { RefreshButton } from "@/components/shared/RefreshButton";
import { Select } from "@/components/ui/select";
import MultiCriteriaFilter from "@/components/shared/MultiCriteriaFilter";
import ActiveFilterChips from "@/components/shared/ActiveFilterChips";
import {
  ALLOWED_STATUS_TRANSITIONS,
  TERMINAL_REQUEST_STATUSES,
} from "@/lib/constants";
import {
  getArtaClassification,
  getRequestCharterStatus,
  ARTA_TIERS,
} from "@/lib/citizenCharter";

const STATUS_OPTIONS = [
  "Pending",
  "InProgress",
  "Ready",
  "Completed",
  "Cancelled",
  "Shredded",
];

function SortIndicator({ column, sortBy, sortOrder }) {
  if (sortBy !== column) {
    return <HugeIcon  className="ph-bold ph-caret-up-down ml-1 text-[11px] opacity-40 transition-opacity group-hover:opacity-70 dark:opacity-30 dark:group-hover:opacity-60"></HugeIcon>;
  }
  return sortOrder === "ASC" ? (
    <HugeIcon  className="ph-bold ph-caret-up ml-1 text-[11px] text-pup-maroon animate-in fade-in zoom-in duration-normal dark:text-primary"></HugeIcon>
  ) : (
    <HugeIcon  className="ph-bold ph-caret-down ml-1 text-[11px] text-pup-maroon animate-in fade-in zoom-in duration-normal dark:text-primary"></HugeIcon>
  );
}

function statusBadgeClass(status) {
  const s = String(status || "").toUpperCase();
  if (s === "PENDING") {
    return "bg-[#FEF3C7] text-[#92400E] dark:bg-amber-950/40 dark:text-amber-400";
  }
  if (s === "PROCESSING" || s === "INPROGRESS") {
    return "bg-[#DBEAFE] text-[#1E40AF] dark:bg-blue-950/40 dark:text-blue-400";
  }
  if (s === "READY" || s === "DONE" || s === "COMPLETED") {
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
  students = [],
  courses = [],
  docTypes = [],
  staffDocs = [],
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
  const [statusFilters, setStatusFilters] = useState([]);
  const [clientTypeFilters, setClientTypeFilters] = useState([]);
  const [docTypeFilters, setDocTypeFilters] = useState([]);
  const [charterFilters, setCharterFilters] = useState([]);
  const [page, setPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortBy, setSortBy] = useState("created_at");
  const [sortOrder, setSortOrder] = useState("DESC");

  const [createOpen, setCreateOpen] = useState(false);
  const [createClientType, setCreateClientType] = useState("Student");
  const [createStudentNo, setCreateStudentNo] = useState("");
  const [createCourseCode, setCreateCourseCode] = useState("");
  const [createRequesterName, setCreateRequesterName] = useState("");
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

  // Local edit state for the detail Sheet
  const [editStatus, setEditStatus] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editUpdateMessage, setEditUpdateMessage] = useState("");

  const debouncedPageResetSkip = useRef(true);
  const autoLinkAttempted = useRef(new Set());

  // Reset creation state on modal open/close
  useEffect(() => {
    if (!createOpen) {
      setCreateClientType("Student");
      setCreateStudentNo("");
      setCreateCourseCode("");
      setCreateRequesterName("");
      setCreateDocType("");
      setCreateNotes("");
      setStudentSearch("");
      setSelectedStudent(null);
    }
  }, [createOpen]);

  const studentMap = useMemo(() => {
    const map = new Map();
    if (Array.isArray(students)) {
      students.forEach((s) => {
        const key = String(s.studentNo || s.student_no || "").toUpperCase();
        if (key) map.set(key, s);
      });
    }
    return map;
  }, [students]);

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
        if (statusFilters.length > 0) qs.set("status", statusFilters.join(","));
        if (clientTypeFilters.length > 0) qs.set("clientType", clientTypeFilters.join(","));
        if (docTypeFilters.length > 0) qs.set("docType", docTypeFilters.join(","));
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
          showToast?.({ title: "Load Failed", description: e?.message || "Unable to load requests." }, true);
          setRows([]);
          setTotal(0);
        }
      } finally {
        setLoading(false);
        setIsManualLoading(false);
      }
    },
    [page, itemsPerPage, debouncedQ, statusFilters, clientTypeFilters, docTypeFilters, sortBy, sortOrder, showToast]
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
      setEditUpdateMessage("");
    } catch (e) {
      showToast?.({ title: "Load Failed", description: e?.message || "Unable to load details." }, true);
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
      setEditUpdateMessage("");
      if (!silent) {
        showToast?.({ title: "Request Updated", description: "Status and updates have been saved." });
      }
      loadList({ showLoading: false });
    } catch (e) {
      if (body.linkedDocumentId != null) {
        autoLinkAttempted.current.delete(reqId);
      }
      showToast?.({ title: "Update Failed", description: e?.message || "Unable to save changes." }, true);
    } finally {
      setSaving(false);
    }
  };

  const isTerminalStatus = Boolean(
    detail?.status && TERMINAL_REQUEST_STATUSES.includes(detail.status)
  );

  const availableStatuses = useMemo(() => {
    if (!detail?.status) return STATUS_OPTIONS;
    return ALLOWED_STATUS_TRANSITIONS[detail.status] || [detail.status];
  }, [detail?.status]);

  const handleManualSave = () => {
    patchDetail({
      status: isTerminalStatus ? undefined : editStatus,
      notes: editNotes || null,
      message: editUpdateMessage.trim() || undefined,
    });
  };

  const handleResetEdits = () => {
    if (!detail) return;
    setEditStatus(detail.status || "Pending");
    setEditNotes(detail.notes || "");
    setEditUpdateMessage("");
  };

  const hasEdits = useMemo(() => {
    if (!detail) return false;
    const norm = (s) => (s || "").trim();
    return (
      (!isTerminalStatus && norm(editStatus) !== norm(detail.status)) ||
      norm(editNotes) !== norm(detail.notes) ||
      Boolean(editUpdateMessage.trim())
    );
  }, [detail, editStatus, editNotes, editUpdateMessage, isTerminalStatus]);

  useEffect(() => {
    if (!detail?.id || detail.linked_document_id) return;
    const docId = availability?.doc?.id;
    if (!docId) return;
    if (autoLinkAttempted.current.has(detail.id)) return;
    autoLinkAttempted.current.add(detail.id);
    patchDetail({ linkedDocumentId: docId }, { silent: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detail?.id, detail?.linked_document_id, availability?.doc?.id]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (createClientType === "Student" && !createStudentNo.trim()) {
      showToast?.({ title: "Validation Error", description: "Please select or enter a student number." }, true);
      return;
    }
    if (createClientType === "Alumni") {
      if (!createRequesterName.trim()) {
        showToast?.({ title: "Validation Error", description: "Please provide the requester name." }, true);
        return;
      }
      if (!createCourseCode) {
        showToast?.({ title: "Validation Error", description: "Please select the academic program attended." }, true);
        return;
      }
    }
    if (!createDocType) {
      showToast?.({ title: "Validation Error", description: "Please select a document type." }, true);
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/document-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientType: createClientType,
          studentNo: createStudentNo.trim() || null,
          requesterName: createRequesterName.trim() || null,
          courseCode: createCourseCode || null,
          docType: createDocType,
          notes: createNotes.trim() || null,
        }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) throw new Error(json?.error || "Failed to create");
      showToast?.({ title: "Request Created", description: "Request added successfully." });
      setCreateOpen(false);
      setPage(1);
      loadList({ showLoading: true });
    } catch (err) {
      showToast?.({ title: "Creation Failed", description: err?.message || "Unable to create the request." }, true);
    } finally {
      setSubmitting(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / itemsPerPage));

  const displayedRows = useMemo(() => {
    if (charterFilters.length === 0) return rows;
    return rows.filter((r) => {
      const charter = getRequestCharterStatus(r);
      return charterFilters.includes(charter.status);
    });
  }, [rows, charterFilters]);

  const filterGroups = useMemo(() => [
    {
      id: "status",
      label: "Request Status",
      options: [
        { value: "Pending", label: "Pending", indicatorColor: "bg-amber-500" },
        { value: "InProgress", label: "In Progress", indicatorColor: "bg-blue-500" },
        { value: "Ready", label: "Ready", indicatorColor: "bg-emerald-500" },
        { value: "Completed", label: "Completed", indicatorColor: "bg-emerald-600" },
        { value: "Cancelled", label: "Cancelled", indicatorColor: "bg-gray-400" },
        { value: "Shredded", label: "Shredded", indicatorColor: "bg-rose-500" },
      ],
    },
    {
      id: "clientType",
      label: "Client Type",
      options: [
        { value: "Student", label: "Students" },
        { value: "Alumni", label: "Alumni" },
      ],
    },
    {
      id: "docType",
      label: "Document Type",
      options: (docTypes || []).map((dt) => ({ value: dt, label: dt })),
    },
    {
      id: "charter",
      label: "Citizen's Charter SLA",
      options: [
        { value: "OnTrack", label: "On Schedule", indicatorColor: "bg-emerald-500" },
        { value: "DueSoon", label: "Due Today", indicatorColor: "bg-amber-500" },
        { value: "Overdue", label: "Overdue (RA 11032)", indicatorColor: "bg-rose-500" },
        { value: "Compliant", label: "Met SLA", indicatorColor: "bg-emerald-600" },
        { value: "Delayed", label: "Delayed", indicatorColor: "bg-rose-400" },
      ],
    },
  ], [docTypes]);

  const filterValues = useMemo(() => ({
    status: statusFilters,
    clientType: clientTypeFilters,
    docType: docTypeFilters,
    charter: charterFilters,
  }), [statusFilters, clientTypeFilters, docTypeFilters, charterFilters]);

  const handleFilterChange = useCallback((groupId, values) => {
    if (groupId === "status") setStatusFilters(values);
    else if (groupId === "clientType") setClientTypeFilters(values);
    else if (groupId === "docType") setDocTypeFilters(values);
    else if (groupId === "charter") setCharterFilters(values);
    setPage(1);
  }, []);

  const handleClearFilters = useCallback(() => {
    setQ("");
    setStatusFilters([]);
    setClientTypeFilters([]);
    setDocTypeFilters([]);
    setCharterFilters([]);
    setPage(1);
  }, []);

  const activeChips = useMemo(() => {
    const chips = [];
    if (q.trim()) {
      chips.push({
        id: "search",
        label: `Search: ${q.trim()}`,
        onRemove: () => { setQ(""); setPage(1); },
      });
    }
    statusFilters.forEach((st) => {
      chips.push({
        id: `status-${st}`,
        label: `Status: ${st === "InProgress" ? "In Progress" : st}`,
        onRemove: () => { setStatusFilters((prev) => prev.filter((s) => s !== st)); setPage(1); },
      });
    });
    clientTypeFilters.forEach((ct) => {
      chips.push({
        id: `client-${ct}`,
        label: `Client: ${ct === "Student" ? "Students" : "Alumni"}`,
        onRemove: () => { setClientTypeFilters((prev) => prev.filter((c) => c !== ct)); setPage(1); },
      });
    });
    docTypeFilters.forEach((dt) => {
      chips.push({
        id: `docType-${dt}`,
        label: `Doc: ${dt}`,
        onRemove: () => { setDocTypeFilters((prev) => prev.filter((d) => d !== dt)); setPage(1); },
      });
    });
    charterFilters.forEach((cf) => {
      const label = cf === "OnTrack" ? "On Schedule" : cf === "DueSoon" ? "Due Today" : cf === "Overdue" ? "Overdue" : cf === "Compliant" ? "Met SLA" : cf;
      chips.push({
        id: `charter-${cf}`,
        label: `Charter: ${label}`,
        onRemove: () => { setCharterFilters((prev) => prev.filter((c) => c !== cf)); setPage(1); },
      });
    });
    return chips;
  }, [q, statusFilters, clientTypeFilters, docTypeFilters, charterFilters]);

  const hasActiveFilters = Boolean(
    q.trim() || statusFilters.length > 0 || clientTypeFilters.length > 0 || docTypeFilters.length > 0 || charterFilters.length > 0
  );

  return (
    <TooltipProvider delayDuration={200}>
      <div className="font-jakarta w-full flex flex-1 flex-col h-auto min-h-0 gap-6 focus:outline-none animate-fade-up">
        {/* ONE Single Card Container encapsulating Header, Toolbar, Active Filters, Table & Pagination */}
        <Card className="flex h-auto w-full flex-col p-0 gap-0 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-card dark:shadow-none isolate font-jakarta mb-4 min-h-0 flex-1">
          {/* 1. Page Header */}
          <PageHeader
            icon="ph-tray"
            title="Document Requests"
            description="Manage and track student document requests (ODRS)."
            showBorder={false}
            className="p-6"
            titleClassName="text-[18px] font-semibold tracking-[-0.01em] text-gray-900 dark:text-zinc-50"
            descriptionClassName="text-[13px] font-normal text-gray-500 dark:text-zinc-400 mt-[4px]"
            actions={
              <div className="flex items-center gap-2">
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
                      className="flex h-10 px-5 text-xs font-semibold rounded-xl! btn-brand-red text-white! active:scale-95 disabled:opacity-50 transition-all cursor-pointer shadow-xs"
                      style={{ color: "#ffffff" }}
                    >
                      Create Request
                    </Button>
                  )}
                </div>
              </div>
            }
          />

          {/* 2. Navigation Toolbar */}
          {!error && (
            <div className="border-t border-gray-100 dark:border-white/10 p-5 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 bg-gray-50/40 dark:bg-zinc-900/30">
              {/* Left: Client Type Line Tabs */}
              <div className="flex items-center gap-6 shrink-0 select-none overflow-x-auto">
                {[
                  { label: "All Requests", value: "" },
                  { label: "Students", value: "Student" },
                  { label: "Alumni", value: "Alumni" },
                ].map((item) => {
                  const isAll = item.value === "";
                  const isActive = isAll
                    ? clientTypeFilters.length === 0
                    : clientTypeFilters.length === 1 && clientTypeFilters[0] === item.value;
                  return (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => {
                        setClientTypeFilters(item.value ? [item.value] : []);
                        setPage(1);
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

              {/* Right: Search Input & Dropdown Popovers Group */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
                {/* Search Input */}
                <div className="w-full sm:w-[260px] lg:w-[300px] relative group shrink-0">
                  <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                    <HugeIcon  className="ph-bold ph-magnifying-glass text-gray-400 dark:text-zinc-500 transition-colors group-focus-within:text-pup-maroon dark:group-focus-within:text-red-400 text-sm"></HugeIcon>
                  </div>
                  <Input
                    value={q}
                    onChange={(e) => {
                      setQ(e.target.value);
                      setPage(1);
                    }}
                    placeholder="Search student, name, program..."
                    className="h-9 w-full rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 pl-8 pr-16 text-xs font-normal text-gray-900 dark:text-zinc-100 placeholder:text-gray-400 dark:placeholder:text-zinc-500 shadow-none focus-visible:outline-none focus-visible:border-pup-maroon focus-visible:ring-1 focus-visible:ring-pup-maroon dark:focus-visible:border-red-500/80 dark:focus-visible:ring-red-500/80"
                  />
                  <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-[11px] text-gray-400 dark:text-zinc-500">
                    {total > 0 ? `${total.toLocaleString()}` : "0"}
                  </div>
                </div>

                {/* MultiCriteriaFilter Popover */}
                <MultiCriteriaFilter
                  title="Filter Requests"
                  groups={filterGroups}
                  selectedValues={filterValues}
                  onChange={handleFilterChange}
                  onClearAll={handleClearFilters}
                  totalCount={total}
                  filteredCount={displayedRows.length}
                />
              </div>
            </div>
          )}

          {/* 3. Active Filter Chips Row */}
          {!loading && !error && (
            <ActiveFilterChips
              chips={activeChips}
              onClearAll={handleClearFilters}
              className="border-t border-gray-100 dark:border-white/10 px-6 py-2.5"
            />
          )}

          {/* 4. Full-Width Table Body */}
          <div className={cn("w-full flex flex-col flex-1 min-h-0 border-t border-gray-100 dark:border-white/10", total === 0 && "rounded-b-2xl overflow-hidden")}>
            {(loading && !isManualLoading) ? (
              <DocumentRequestsTableSkeleton rowCount={itemsPerPage} embedded={true} />
            ) : error ? (
              <div className="p-12 rounded-b-2xl">
                <Empty className="h-[320px] flex flex-col items-center justify-center text-center text-gray-500 border-0 dark:text-zinc-400">
                  <EmptyHeader className="flex flex-col items-center gap-0">
                    <EmptyMedia className="w-16 h-16 rounded-full bg-white border border-gray-200 flex items-center justify-center mb-4 shadow-sm dark:bg-card dark:border-white/10 dark:shadow-none">
                      <HugeIcon  className="ph-duotone ph-warning-circle text-xl text-pup-maroon dark:text-primary" />
                    </EmptyMedia>
                    <EmptyTitle className="text-lg font-semibold text-gray-900 dark:text-zinc-50">Could Not Load Requests</EmptyTitle>
                    <EmptyDescription className="text-sm font-medium text-gray-600 mt-1 max-w-md dark:text-zinc-300">
                      {error}
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              </div>
            ) : (
              <div className="overflow-x-auto flex-1">
                <table className={cn("min-w-full text-sm table-fixed", displayedRows.length === 0 && "h-full")}>
                  <thead className="sticky top-0 z-10 border-b border-gray-100 dark:border-white/10 bg-white dark:bg-card">
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
                          <SortIndicator column="id" sortBy={sortBy} sortOrder={sortOrder} />
                        </button>
                      </th>
                      <th className="p-4 min-w-[240px]">
                        <button
                          type="button"
                          onClick={() => handleSort("student")}
                          className={cn(
                            "group flex items-center transition-colors focus:outline-none cursor-pointer text-[12px] font-medium tracking-[0.04em]",
                            sortBy === "student" ? "text-[#111111] dark:text-white" : "text-[#8E8E93] dark:text-zinc-500 hover:text-[#111111] dark:hover:text-white"
                          )}
                        >
                          Requester
                          <SortIndicator column="student" sortBy={sortBy} sortOrder={sortOrder} />
                        </button>
                      </th>
                      <th className="p-4 min-w-[180px]">
                        <button
                          type="button"
                          onClick={() => handleSort("doc_type")}
                          className={cn(
                            "group flex items-center transition-colors focus:outline-none cursor-pointer text-[12px] font-medium tracking-[0.04em]",
                            sortBy === "doc_type" ? "text-[#111111] dark:text-white" : "text-[#8E8E93] dark:text-zinc-500 hover:text-[#111111] dark:hover:text-white"
                          )}
                        >
                          Document Type
                          <SortIndicator column="doc_type" sortBy={sortBy} sortOrder={sortOrder} />
                        </button>
                      </th>
                      <th className="p-4 min-w-[140px]">
                        <button
                          type="button"
                          onClick={() => handleSort("status")}
                          className={cn(
                            "group flex items-center transition-colors focus:outline-none cursor-pointer text-[12px] font-medium tracking-[0.04em]",
                            sortBy === "status" ? "text-[#111111] dark:text-white" : "text-[#8E8E93] dark:text-zinc-500 hover:text-[#111111] dark:hover:text-white"
                          )}
                        >
                          Status
                          <SortIndicator column="status" sortBy={sortBy} sortOrder={sortOrder} />
                        </button>
                      </th>
                      <th className="p-4 min-w-[190px]">
                        <span className="flex items-center text-[12px] font-medium tracking-[0.04em] text-[#8E8E93] dark:text-zinc-500">
                          Turnaround (RA 11032)
                        </span>
                      </th>
                      <th className="p-4 min-w-[170px]">
                        <button
                          type="button"
                          onClick={() => handleSort("created_at")}
                          className={cn(
                            "group flex items-center transition-colors focus:outline-none cursor-pointer text-[12px] font-medium tracking-[0.04em]",
                            sortBy === "created_at" ? "text-[#111111] dark:text-white" : "text-[#8E8E93] dark:text-zinc-500 hover:text-[#111111] dark:hover:text-white"
                          )}
                        >
                          Created At
                          <SortIndicator column="created_at" sortBy={sortBy} sortOrder={sortOrder} />
                        </button>
                      </th>
                      <th className="p-4 text-right min-w-[100px] text-[12px] font-medium tracking-[0.04em] text-[#8E8E93] dark:text-zinc-500">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody className={cn("divide-y divide-gray-100 dark:divide-white/10", displayedRows.length === 0 && "h-full")}>
                    {displayedRows.length === 0 ? (
                      <tr className="border-0 hover:bg-transparent h-full">
                        <td colSpan={7} className="p-0 border-0 h-full">
                          <Empty className="flex h-[360px] flex-col items-center justify-center border-0 bg-transparent text-center">
                            <EmptyHeader className="flex flex-col items-center gap-0">
                              <div className="relative mb-6">
                                <div className="absolute inset-0 scale-150 animate-pulse rounded-full bg-gray-50 opacity-50 dark:bg-card"></div>
                                <EmptyMedia className="relative z-10 flex h-24 w-24 items-center justify-center rounded-3xl border border-gray-100 bg-white shadow-xl rotate-3 dark:border-white/10 dark:bg-card dark:shadow-none">
                                  <HugeIcon  className="ph-duotone ph-magnifying-glass text-xl text-gray-300 dark:text-zinc-600"></HugeIcon>
                                </EmptyMedia>
                              </div>
                              <EmptyTitle className="text-xl font-semibold text-gray-900 dark:text-zinc-50">No Document Requests Found</EmptyTitle>
                              <EmptyDescription className="max-w-xs text-sm font-medium text-gray-500 dark:text-zinc-400">
                                {clientTypeFilters.includes("Alumni") && !clientTypeFilters.includes("Student")
                                  ? "No document requests found matching your filters."
                                  : clientTypeFilters.includes("Student") && !clientTypeFilters.includes("Alumni")
                                  ? "No student requests found matching your filters."
                                  : "No document requests match your active filters."}
                              </EmptyDescription>
                            </EmptyHeader>
                          </Empty>
                        </td>
                      </tr>
                    ) : (
                      displayedRows.map((r) => {
                        const student = studentMap.get(String(r.student_no || "").toUpperCase());
                        const loc = student || (r.room ? { room: r.room, cabinet: r.cabinet, drawer: r.drawer, studentNo: r.student_no, name: r.student_name } : null);
                        const isAlumni = r.client_type === "Alumni";
                        const charter = getRequestCharterStatus(r);

                        return (
                          <tr
                            key={r.id}
                            className={cn(
                              "group h-[56px] border-b-[0.5px] border-gray-100 dark:border-white/10 last:border-b-0 transition-all duration-fast hover:bg-gray-50/40 dark:bg-card dark:hover:bg-white/2 select-none cursor-pointer",
                              selectedId === r.id && "bg-blue-50/60 dark:bg-blue-950/20"
                            )}
                            onClick={() => openDetail(r.id)}
                          >
                            <td className="py-0 px-4 align-middle text-[13px] font-normal text-[#111111] dark:text-zinc-300">
                              #{r.id}
                            </td>
                            <td className="py-2.5 px-4 align-middle">
                              <div className="flex items-center gap-2">
                                <span className="text-[14px] font-medium text-[#111111] dark:text-zinc-50 truncate">
                                  {r.student_name || r.requester_name || "—"}
                                </span>
                                <span
                                  className={cn(
                                    "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium",
                                    isAlumni
                                      ? "bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border border-purple-200/50 dark:border-purple-800/30"
                                      : "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200/50 dark:border-blue-800/30"
                                  )}
                                >
                                  {isAlumni ? "Alumni" : "Student"}
                                </span>
                              </div>
                              <div className="flex flex-wrap items-center gap-2 mt-[2px] truncate text-[12px] font-normal text-[#8E8E93] dark:text-zinc-500">
                                {r.student_no ? (
                                  <span>{r.student_no}</span>
                                ) : (
                                  <span className="italic text-amber-600 dark:text-amber-400">No Student ID</span>
                                )}
                                {r.course_code && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-zinc-300">
                                    {r.course_code}
                                  </span>
                                )}
                                {loc && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onLocateOnMap({
                                        room: loc.room,
                                        cabinet: loc.cabinet,
                                        drawer: loc.drawer,
                                        studentNo: r.student_no,
                                        name: r.student_name || r.requester_name,
                                      });
                                    }}
                                    title="View student location on storage map"
                                    className="inline-flex items-center gap-1 rounded-full bg-red-50 hover:bg-red-100 px-2.5 py-0.5 text-[11px] font-medium tracking-[0.04em] text-pup-maroon dark:bg-red-950/40 dark:text-primary dark:hover:bg-red-950/60 border border-red-100/30 dark:border-white/5 cursor-pointer transition-colors whitespace-nowrap"
                                  >
                                    <HugeIcon  className="ph-bold ph-map-pin text-[10px]"></HugeIcon>
                                    RM{loc.room} · CAB-{loc.cabinet} · DRW-{loc.drawer}
                                  </button>
                                )}
                              </div>
                            </td>
                            <td className="py-0 px-4 align-middle">
                              <div className="inline-flex w-fit items-center justify-center rounded-full bg-gray-100 px-[10px] py-[2.5px] text-[11px] font-medium text-gray-900 dark:bg-zinc-800 dark:text-zinc-100 whitespace-nowrap">
                                {r.doc_type}
                              </div>
                            </td>
                            <td className="py-0 px-4 align-middle">
                              <div className={cn("inline-flex w-fit items-center justify-center rounded-full px-[10px] py-[2.5px] text-[11px] font-medium tracking-[0.04em] whitespace-nowrap", statusBadgeClass(r.status))}>
                                {r.status === "InProgress" ? "In Progress" : r.status}
                              </div>
                            </td>
                            <td className="py-0 px-4 align-middle">
                              <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium whitespace-nowrap", charter.tier.badgeClass)}>
                                    {charter.tier.shortLabel}
                                  </span>
                                  <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap", charter.badgeClass)}>
                                    <HugeIcon  className={cn("ph-bold text-[10px]", charter.icon || "ph-clock")} />
                                    {charter.label}
                                  </span>
                                </div>
                                <span className="text-[11px] text-gray-400 dark:text-zinc-500 truncate" title={`Target: ${charter.deadlineFormatted}`}>
                                  Target: {charter.deadlineFormatted}
                                </span>
                              </div>
                            </td>
                            <td className="py-0 px-4 align-middle text-[13px] font-normal text-[#8E8E93] dark:text-zinc-500 whitespace-nowrap">
                              {formatPHDateTime(r.created_at)}
                            </td>
                            <td className="py-0 px-4 align-middle text-right">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openDetail(r.id);
                                }}
                                className="h-8 px-3 text-xs font-semibold rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-xs cursor-pointer active:scale-95 transition-all"
                              >
                                Inspect
                              </Button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* 5. Apple HIG Pagination Footer */}
          {total > 0 && (
            <div className="flex items-center justify-between border-t border-[#e5e5ea] dark:border-[#3a3a3c] bg-white dark:bg-[#1c1c1e] p-4 px-6 rounded-b-2xl mt-auto">
              <div className="flex items-center gap-6 text-xs text-gray-500 dark:text-zinc-400 select-none">
                <span>
                  Showing {rows.length} of {total.toLocaleString()}
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
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="text-xs text-gray-500 dark:text-zinc-400 disabled:opacity-40 cursor-pointer rounded-xl h-8 px-3"
                >
                  Prev
                </Button>

                <div className="h-8 w-8 rounded-xl border border-[#e5e5ea] dark:border-zinc-800 flex items-center justify-center text-xs font-bold text-gray-800 dark:text-zinc-200 bg-white dark:bg-zinc-900">
                  {page}
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="text-xs text-gray-500 dark:text-zinc-400 disabled:opacity-40 cursor-pointer rounded-xl h-8 px-3"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </Card>

        {/* 6. Request Detail Sheet Slide-Over Drawer */}
        <Sheet
          open={Boolean(selectedId)}
          onOpenChange={(open) => {
            if (!open) {
              setSelectedId(null);
              setDetail(null);
              setEditUpdateMessage("");
            }
          }}
        >
          <SheetContent
            className="font-jakarta flex flex-col border-l bg-white p-0 shadow-2xl data-[side=right]:w-full data-[side=right]:sm:max-w-2xl data-[side=right]:md:max-w-3xl data-[side=right]:lg:max-w-4xl sm:max-w-2xl md:max-w-3xl lg:max-w-4xl w-full dark:border-white/10 dark:bg-[#121214]"
            style={{ borderLeft: "0.5px solid rgba(0,0,0,0.08)" }}
          >
            {/* Sheet Header */}
            <SheetHeader className="p-6 pb-4 border-b border-gray-100 dark:border-white/10 bg-gray-50/50 dark:bg-zinc-900/40 text-left">
              <div className="flex items-start justify-between">
                <div>
                  <SheetTitle className="text-left text-[18px] font-semibold tracking-[-0.01em] text-gray-900 dark:text-zinc-50">
                    Request Details
                  </SheetTitle>
                  <SheetDescription className="mt-1 text-left text-xs font-normal text-gray-500 dark:text-zinc-400 flex items-center gap-2">
                    <span>Request #{selectedId}</span>
                    {detail && (
                      <span className={cn("inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-medium", statusBadgeClass(detail.status))}>
                        {detail.status === "InProgress" ? "In Progress" : detail.status}
                      </span>
                    )}
                  </SheetDescription>
                </div>
              </div>
            </SheetHeader>

            {/* Sheet Scrollable Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {detailLoading ? (
                <div className="space-y-4">
                  <Skeleton className="h-28 w-full rounded-xl dark:bg-muted" />
                  <Skeleton className="h-20 w-full rounded-xl dark:bg-muted" />
                  <Skeleton className="h-24 w-full rounded-xl dark:bg-muted" />
                  <Skeleton className="h-28 w-full rounded-xl dark:bg-muted" />
                </div>
              ) : detail ? (
                <>
                  {/* Top 2-Column Grid: Requester Profile & Storage Location */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Requester Profile Card */}
                    <div className="flex flex-col">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-[#8E8E93] dark:text-zinc-400 mb-1.5">
                        Requester Profile
                      </span>
                      <div className="w-full h-full bg-[#F5F5F7] dark:bg-zinc-800/40 border border-[#E5E5EA] dark:border-white/10 rounded-xl p-4 flex flex-col justify-between space-y-2">
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-semibold text-sm text-gray-900 dark:text-zinc-50 truncate">
                              {detail.student_name || detail.requester_name || "—"}
                            </span>
                            <span
                              className={cn(
                                "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium shrink-0",
                                detail.client_type === "Alumni"
                                  ? "bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border border-purple-200/50 dark:border-purple-800/30"
                                  : "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200/50 dark:border-blue-800/30"
                              )}
                            >
                              {detail.client_type === "Alumni" ? "Alumni" : "Student"}
                            </span>
                          </div>
                          <div className="text-xs text-[#8E8E93] dark:text-zinc-400 font-normal">
                            {detail.student_no ? detail.student_no : <span className="italic text-amber-600 dark:text-amber-400">No Student ID</span>}
                          </div>
                          {(detail.course_code || studentForRequest?.courseCode) && (
                            <div className="text-xs text-gray-600 dark:text-zinc-300 font-normal">
                              Program: <span className="font-semibold text-gray-900 dark:text-zinc-100">{detail.course_code || studentForRequest?.courseCode}</span>
                              {detail.course_name ? ` — ${detail.course_name}` : ""}
                            </div>
                          )}
                        </div>
                        {(detail.requester_email || detail.email) && (
                          <div className="text-xs text-gray-500 dark:text-zinc-400 font-normal pt-1.5 border-t border-gray-200/60 dark:border-white/5 truncate flex items-center gap-1.5">
                            <HugeIcon  className="ph-bold ph-envelope text-gray-400 text-xs"></HugeIcon>
                            <span className="truncate">{detail.requester_email || detail.email}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Physical Storage Location Card */}
                    <div className="flex flex-col">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-[#8E8E93] dark:text-zinc-400 mb-1.5">
                        Physical Storage Location
                      </span>
                      <div className="w-full h-full rounded-xl border border-gray-200 p-4 dark:border-white/10 bg-[#F5F5F7] dark:bg-zinc-800/40 flex flex-col justify-between space-y-2">
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-medium text-gray-500 dark:text-zinc-400">
                              Physical Archive
                            </span>
                            {studentForRequest || detail.room ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200/50 dark:border-emerald-800/30">
                                Mapped
                              </span>
                            ) : null}
                          </div>

                          {studentForRequest || detail.room ? (
                            <div className="text-xs font-semibold text-gray-900 dark:text-zinc-100 flex items-center gap-1.5">
                              <HugeIcon  className="ph-bold ph-archive text-pup-maroon dark:text-red-400 text-sm"></HugeIcon>
                              <span>Room {detail.room || studentForRequest?.room} · Cabinet {detail.cabinet || studentForRequest?.cabinet} · Drawer {detail.drawer || studentForRequest?.drawer}</span>
                            </div>
                          ) : (
                            <div className="text-xs text-amber-700 dark:text-amber-400 font-normal">
                              {detail.student_no
                                ? "Student record not loaded — check student number."
                                : "No physical storage mapped for this record."}
                            </div>
                          )}
                        </div>

                        <Button
                          type="button"
                          className="mt-2 w-full btn-brand-red text-white! font-semibold text-xs h-9 rounded-xl transition-all border-0 flex items-center justify-center gap-2 shadow-xs cursor-pointer active:scale-95"
                          style={{ color: "#ffffff" }}
                          disabled={!studentForRequest && !detail.room}
                          onClick={() => {
                            const target = studentForRequest || (detail.room ? {
                              room: detail.room,
                              cabinet: detail.cabinet,
                              drawer: detail.drawer,
                              studentNo: detail.student_no,
                              name: detail.student_name || detail.requester_name,
                            } : null);
                            if (!target) return;
                            if (requestNeedsPhysicalVerification) {
                              setFileWarningOpen(true);
                              return;
                            }
                            onLocateOnMap(target);
                          }}
                        >
                          <HugeIcon  className="ph-bold ph-map-pin text-sm"></HugeIcon>
                          Locate on Storage Map
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Document Requested & Purpose (Grid on sm+ screens) */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {/* Document Requested Card */}
                    <div className="flex flex-col sm:col-span-1">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-[#8E8E93] dark:text-zinc-400 mb-1.5">
                        Document Requested
                      </span>
                      <div className="w-full h-full bg-[#F5F5F7] dark:bg-zinc-800/40 border border-[#E5E5EA] dark:border-white/10 rounded-xl p-4 flex flex-col justify-between space-y-2">
                        <span className="inline-flex w-fit items-center rounded-full bg-white dark:bg-zinc-800 border border-[#E5E5EA] dark:border-white/10 px-3 py-1 text-xs font-semibold text-gray-900 dark:text-zinc-100">
                          {detail.doc_type}
                        </span>
                        <span className="text-[11px] text-gray-500 dark:text-zinc-400 flex items-center gap-1.5">
                          <HugeIcon  className="ph-bold ph-calendar text-gray-400 text-xs"></HugeIcon>
                          {formatPHDateTime(detail.created_at)}
                        </span>
                      </div>
                    </div>

                    {/* Stated Purpose */}
                    <div className="flex flex-col sm:col-span-2">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-[#8E8E93] dark:text-zinc-400 mb-1.5">
                        Requester Stated Purpose
                      </span>
                      <div className="w-full h-full min-h-[64px] p-4 text-xs font-normal text-gray-700 dark:text-zinc-300 bg-[#F5F5F7] dark:bg-zinc-800/40 border border-[#E5E5EA] dark:border-white/10 rounded-xl whitespace-pre-wrap leading-relaxed">
                        {detail.notes || <span className="text-gray-400 italic">No purpose entered by requester.</span>}
                      </div>
                    </div>
                  </div>

                  {/* Citizen's Charter (RA 11032) Turnaround Standard Card */}
                  {(() => {
                    const charter = getRequestCharterStatus(detail);
                    return (
                      <div className="flex flex-col">
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-[#8E8E93] dark:text-zinc-400 mb-1.5 flex items-center justify-between">
                          <span>Citizen&apos;s Charter (RA 11032) Turnaround</span>
                          <span className="text-[10px] font-normal lowercase tracking-normal text-gray-400">
                            working days only
                          </span>
                        </span>
                        <div className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-[#F5F5F7] dark:bg-zinc-800/40 p-4 space-y-2.5">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold", charter.tier.badgeClass)}>
                                {charter.tier.name} ({charter.tier.days} Days)
                              </span>
                              <span className={cn("inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold", charter.badgeClass)}>
                                <HugeIcon  className={cn("ph-bold", charter.icon || "ph-clock")} />
                                {charter.label}
                              </span>
                            </div>
                            <div className="text-right text-xs">
                              <span className="text-gray-500 dark:text-zinc-400">Statutory Deadline: </span>
                              <span className="font-semibold text-gray-900 dark:text-zinc-100">{charter.deadlineFormatted}</span>
                            </div>
                          </div>
                          <p className="text-xs text-gray-600 dark:text-zinc-300 leading-relaxed">
                            {charter.detail}. {charter.tier.description}.
                          </p>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Update Status & Timeline Message Card */}
                  <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-900/40 p-4 space-y-3.5">
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                      <div className="flex flex-col">
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-[#8E8E93] dark:text-zinc-400">
                          {isTerminalStatus ? "Request Lifecycle State" : "Update Status"}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">
                          {detail.status === "Completed"
                            ? "This document has been issued/released to the requester. This transaction is fulfilled and closed."
                            : detail.status === "Shredded"
                            ? "This unclaimed document was shredded after exceeding the 90-day retention schedule. This record is closed."
                            : detail.status === "Cancelled"
                            ? "This request was cancelled and is permanently closed."
                            : "Select the next progressive stage of this request"}
                        </span>
                      </div>
                      <div className="w-full sm:w-52 shrink-0">
                        {isTerminalStatus ? (
                          <div className="h-9 px-3 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-zinc-800/80 flex items-center justify-between text-xs font-semibold text-gray-800 dark:text-zinc-200">
                            <span className="flex items-center gap-1.5 truncate">
                              <HugeIcon  className="ph-bold ph-lock-simple text-gray-400 text-xs"></HugeIcon>
                              <span>{detail.status === "InProgress" ? "In Progress" : detail.status}</span>
                            </span>
                            <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                              Closed
                            </span>
                          </div>
                        ) : (
                          <Select
                            className="w-full h-9 py-1 px-3 text-xs font-medium text-gray-900 dark:text-zinc-100 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-white/10 rounded-xl shadow-none focus-visible:outline-none focus-visible:border-pup-maroon focus-visible:ring-1 focus-visible:ring-pup-maroon dark:focus-visible:border-red-500/80 dark:focus-visible:ring-red-500/80 cursor-pointer"
                            menuClassName="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-900 shadow-2xl p-1.5"
                            optionClassName="rounded-lg text-xs font-normal py-1.5 px-2.5 hover:bg-gray-100 dark:hover:bg-zinc-800"
                            value={editStatus}
                            disabled={saving}
                            onChange={(e) => setEditStatus(e.target.value)}
                          >
                            {availableStatuses.map((s) => (
                              <option key={s} value={s}>
                                {s === "InProgress" ? "In Progress" : s}
                              </option>
                            ))}
                          </Select>
                        )}
                      </div>
                    </div>

                    {/* Add Timeline Update */}
                    <div className="flex flex-col pt-3 border-t border-gray-100 dark:border-white/10">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-[#8E8E93] dark:text-zinc-400">
                          {isTerminalStatus ? "Add Archival Note / Log" : "Add Timeline Update"}
                        </span>
                        <span className="text-[10px] text-gray-400 dark:text-zinc-500">
                          {isTerminalStatus ? "Audit record note" : "Visible to requester"}
                        </span>
                      </div>
                      <textarea
                        className="w-full min-h-[72px] p-3 text-xs font-normal text-gray-900 dark:text-zinc-100 bg-[#F5F5F7] dark:bg-zinc-800/50 border border-gray-200 dark:border-white/10 rounded-xl focus:border-pup-maroon focus:ring-1 focus:ring-pup-maroon focus:outline-none transition-all resize-none placeholder:text-gray-400 dark:placeholder:text-zinc-500"
                        value={editUpdateMessage}
                        onChange={(e) => setEditUpdateMessage(e.target.value)}
                        placeholder={
                          isTerminalStatus
                            ? "Add an archival note or release verification detail..."
                            : "e.g. Document printed, awaiting dry seal..."
                        }
                      />
                    </div>
                  </div>

                  {/* Timeline History */}
                  {Array.isArray(detail.updates) && detail.updates.length > 0 && (
                    <div className="flex flex-col">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-[#8E8E93] dark:text-zinc-400 mb-1.5">
                        Activity History ({detail.updates.length})
                      </span>
                      <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                        {detail.updates.map((u, idx) => (
                          <div
                            key={u.id || idx}
                            className="p-3 rounded-xl bg-[#F5F5F7] dark:bg-zinc-800/40 border border-gray-200/70 dark:border-white/5 text-xs space-y-1"
                          >
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="font-semibold text-gray-800 dark:text-zinc-200">
                                {u.status}
                              </span>
                              <span className="text-gray-400 dark:text-zinc-500 text-[10px]">
                                {formatPHDateTime(u.created_at)}
                              </span>
                            </div>
                            {u.message && (
                              <div className="text-gray-600 dark:text-zinc-300 text-xs leading-relaxed">
                                {u.message}
                              </div>
                            )}
                            <div className="text-[10px] text-gray-400 dark:text-zinc-500">
                              By {u.actor_name || "Staff"}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 90-Day Retention Policy Notice */}
                  {detail.status === "Ready" && retentionExpiryDate && (
                    <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-3.5 dark:border-amber-950/40 dark:bg-amber-950/10 animate-in fade-in duration-fast">
                      <div className="flex gap-3">
                        <HugeIcon  className="ph-bold ph-calendar-blank text-amber-700 dark:text-amber-500 text-lg shrink-0 mt-0.5"></HugeIcon>
                        <div className="text-xs">
                          <span className="font-semibold text-amber-950 dark:text-amber-300 block tracking-wider text-[10px] uppercase">
                            PUP ODRS Retention Policy
                          </span>
                          <span className="text-gray-600 dark:text-zinc-400 block mt-0.5 leading-normal">
                            Unclaimed documents are shredded after 90 days according to ODRS policy.
                          </span>
                          <span className="text-amber-800 dark:text-amber-400 font-semibold block mt-1.5 flex items-center gap-1.5">
                            <HugeIcon  className="ph-bold ph-warning"></HugeIcon>
                            Shred Schedule: {retentionExpiryDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                            {daysRemaining !== null && (
                              <span className="text-gray-500 dark:text-zinc-500 font-normal">({daysRemaining > 0 ? `${daysRemaining}d left` : "Expired"})</span>
                            )}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              ) : null}
            </div>

            {/* Sheet Sticky Footer */}
            <div className="p-4 px-6 border-t border-gray-100 dark:border-white/10 bg-white dark:bg-[#18181b] flex items-center justify-between">
              <Button
                variant="outline"
                size="sm"
                className="h-9 px-4 text-xs font-semibold rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 shadow-xs cursor-pointer hover:bg-gray-50 dark:hover:bg-zinc-700"
                onClick={() => {
                  setSelectedId(null);
                  setDetail(null);
                  setEditUpdateMessage("");
                }}
              >
                Close
              </Button>

              {hasEdits && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 px-4 text-xs font-semibold rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 shadow-xs cursor-pointer hover:bg-gray-50 dark:hover:bg-zinc-700"
                    onClick={handleResetEdits}
                    disabled={saving}
                  >
                    Reset
                  </Button>
                  <Button
                    size="sm"
                    className="h-9 px-4 text-xs font-semibold rounded-xl! btn-brand-red text-white! shadow-xs cursor-pointer active:scale-95 transition-all"
                    style={{ color: "#ffffff" }}
                    onClick={handleManualSave}
                    disabled={saving}
                  >
                    {saving ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              )}
            </div>
          </SheetContent>
        </Sheet>

        {/* 7. Dialog: Create Request */}
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogContent className="w-full max-w-2xl overflow-hidden rounded-2xl border border-gray-200 bg-white p-0 shadow-2xl sm:max-w-2xl dark:border-white/10 dark:bg-card flex flex-col gap-0">
            <DialogHeader className="bg-white p-6 pb-0 dark:bg-card border-none text-left">
              <div className="flex items-start gap-4">
                <div className="min-w-0 pr-8">
                  <DialogTitle className="text-[16px] font-semibold tracking-[-0.01em] text-gray-900 dark:text-zinc-50">
                    New Document Request
                  </DialogTitle>
                  <DialogDescription className="mt-1 text-[13px] font-normal text-gray-500 dark:text-zinc-400">
                    Create a document request for a student or alumni record.
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>
            <form onSubmit={handleCreate}>
              <div className="p-6 space-y-4">
                {/* Client Type Selector */}
                <div>
                  <label className="text-xs font-semibold text-gray-700 dark:text-zinc-200 block mb-1.5">
                    Client Type
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setCreateClientType("Student");
                        setSelectedStudent(null);
                        setCreateStudentNo("");
                      }}
                      className={cn(
                        "flex-1 h-10 px-3 text-xs font-semibold rounded-xl border transition-all cursor-pointer text-center",
                        createClientType === "Student"
                          ? "bg-slate-900 text-white border-slate-900 dark:bg-zinc-100 dark:text-zinc-900 dark:border-zinc-100 shadow-xs"
                          : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50 dark:bg-zinc-800 dark:text-zinc-300 dark:border-white/10"
                      )}
                    >
                      Current Student
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setCreateClientType("Alumni");
                        setSelectedStudent(null);
                        setCreateStudentNo("");
                      }}
                      className={cn(
                        "flex-1 h-10 px-3 text-xs font-semibold rounded-xl border transition-all cursor-pointer text-center",
                        createClientType === "Alumni"
                          ? "bg-slate-900 text-white border-slate-900 dark:bg-zinc-100 dark:text-zinc-900 dark:border-zinc-100 shadow-xs"
                          : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50 dark:bg-zinc-800 dark:text-zinc-300 dark:border-white/10"
                      )}
                    >
                      Alumni / Former Student
                    </button>
                  </div>
                </div>

                {/* Form fields for Student vs Alumni */}
                {createClientType === "Student" ? (
                  selectedStudent ? (
                    <div className="rounded-xl border border-red-100 bg-red-50/50 p-4 relative animate-in fade-in zoom-in-95 duration-fast dark:border-white/10 dark:bg-red-950/20">
                      <button
                        type="button"
                        className="absolute top-2.5 right-2.5 text-gray-400 hover:text-gray-600 transition-colors bg-white hover:bg-gray-100 border border-gray-200 rounded-full w-5 h-5 flex items-center justify-center shadow-xs dark:bg-zinc-800 dark:border-white/10 dark:text-zinc-300"
                        onClick={() => {
                          setSelectedStudent(null);
                          setCreateStudentNo("");
                        }}
                      >
                        <HugeIcon  className="ph-bold ph-x text-[10px]"></HugeIcon>
                      </button>
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-pup-maroon/10 text-pup-maroon flex items-center justify-center shrink-0 dark:bg-pup-maroon/20">
                          <HugeIcon  className="ph-bold ph-user-focus text-lg"></HugeIcon>
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
                            <HugeIcon  className="ph-bold ph-archive-tray text-xs"></HugeIcon>
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
                        <div className="relative mt-1.5 group">
                          <HugeIcon  className="ph-bold ph-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-zinc-500 transition-colors group-focus-within:text-pup-maroon dark:group-focus-within:text-red-400 pointer-events-none"></HugeIcon>
                          <Input
                            className="pl-9 h-10 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-white/10 rounded-xl text-gray-900 dark:text-zinc-100 placeholder:text-gray-400 dark:placeholder:text-zinc-500 shadow-none focus-visible:outline-none focus-visible:border-pup-maroon focus-visible:ring-1 focus-visible:ring-pup-maroon dark:focus-visible:border-red-500/80 dark:focus-visible:ring-red-500/80"
                            value={studentSearch}
                            onChange={(e) => setStudentSearch(e.target.value)}
                            placeholder="Type to search by student name or number..."
                          />
                        </div>
                        {studentSuggestions.length > 0 && (
                          <div className="absolute z-50 left-0 right-0 mt-1 rounded-xl border border-gray-200 bg-white overflow-hidden shadow-lg animate-in fade-in slide-in-from-top-1 duration-fast dark:bg-zinc-900 dark:border-zinc-800">
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
                            Or Enter Student Number
                          </label>
                          <span className="text-[10px] text-gray-400 font-medium">If record is not in database</span>
                        </div>
                        <Input
                          className="mt-1.5 h-10 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-white/10 rounded-xl text-gray-900 dark:text-zinc-100 placeholder:text-gray-400 dark:placeholder:text-zinc-500 shadow-none focus-visible:outline-none focus-visible:border-pup-maroon focus-visible:ring-1 focus-visible:ring-pup-maroon dark:focus-visible:border-red-500/80 dark:focus-visible:ring-red-500/80"
                          value={createStudentNo}
                          onChange={(e) => setCreateStudentNo(e.target.value)}
                          placeholder="202X-XXXXX-MN-0"
                        />
                      </div>
                    </div>
                  )
                ) : (
                  /* Alumni Fields */
                  <div className="space-y-4 animate-fade-up">
                    <div>
                      <label className="text-xs font-semibold text-gray-700 dark:text-zinc-200">
                        Alumni Full Name <span className="text-red-500">*</span>
                      </label>
                      <Input
                        className="mt-1.5 h-10 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-white/10 rounded-xl text-gray-900 dark:text-zinc-100 placeholder:text-gray-400 dark:placeholder:text-zinc-500 shadow-none focus-visible:outline-none focus-visible:border-pup-maroon focus-visible:ring-1 focus-visible:ring-pup-maroon dark:focus-visible:border-red-500/80 dark:focus-visible:ring-red-500/80"
                        value={createRequesterName}
                        onChange={(e) => setCreateRequesterName(e.target.value)}
                        placeholder="e.g. Maria Santos"
                        required
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-gray-700 dark:text-zinc-200">
                        Academic Program / Degree <span className="text-red-500">*</span>
                      </label>
                      <Select
                        className="mt-1.5 h-10 w-full rounded-xl border border-gray-200 bg-white px-3 text-xs font-normal shadow-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-pup-maroon focus-visible:border-pup-maroon dark:focus-visible:border-red-500/80 dark:focus-visible:ring-red-500/80 dark:bg-zinc-800 dark:border-white/10"
                        value={createCourseCode}
                        onChange={(e) => setCreateCourseCode(e.target.value)}
                        required
                      >
                        <option value="">Select Degree Program…</option>
                        {courses.map((c) => (
                          <option key={c.code || c.id} value={c.code}>
                            {c.code} {c.name ? `— ${c.name}` : ""}
                          </option>
                        ))}
                      </Select>
                      <span className="text-[11px] text-gray-500 dark:text-zinc-400 mt-1 block">
                        Required for locating physical records when student number is not present.
                      </span>
                    </div>

                    <div>
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-semibold text-gray-700 dark:text-zinc-200">
                          Student Number (Optional)
                        </label>
                        <span className="text-[10px] text-gray-400 font-medium">If remembered</span>
                      </div>
                      <Input
                        className="mt-1.5 h-10 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-white/10 rounded-xl text-gray-900 dark:text-zinc-100 placeholder:text-gray-400 dark:placeholder:text-zinc-500 shadow-none focus-visible:outline-none focus-visible:border-pup-maroon focus-visible:ring-1 focus-visible:ring-pup-maroon dark:focus-visible:border-red-500/80 dark:focus-visible:ring-red-500/80"
                        value={createStudentNo}
                        onChange={(e) => setCreateStudentNo(e.target.value)}
                        placeholder="e.g. 2018-01234-SJ-0"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="text-xs font-semibold text-gray-700 dark:text-zinc-200">
                    Document Type <span className="text-red-500">*</span>
                  </label>
                  <Select
                    className="mt-1.5 h-10 w-full rounded-xl border border-gray-200 bg-white px-3 text-xs font-normal shadow-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-pup-maroon focus-visible:border-pup-maroon dark:focus-visible:border-red-500/80 dark:focus-visible:ring-red-500/80 dark:bg-zinc-800 dark:border-white/10"
                    value={createDocType}
                    onChange={(e) => setCreateDocType(e.target.value)}
                    required
                  >
                    <option value="">Select document type…</option>
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
                    className="mt-1.5 w-full min-h-[72px] rounded-xl border border-gray-200 p-3 text-xs font-normal focus:border-pup-maroon focus:ring-1 focus:ring-pup-maroon focus:outline-none dark:bg-zinc-800 dark:border-white/10 dark:text-zinc-100 placeholder:text-gray-400 dark:placeholder:text-zinc-500 transition-all resize-none"
                    value={createNotes}
                    onChange={(e) => setCreateNotes(e.target.value)}
                    placeholder="Requester purpose or special remarks…"
                  />
                </div>
              </div>

              {/* Dialog Actions */}
              <DialogFooter className="m-0 p-6 pt-0 bg-white dark:bg-card border-none flex items-center justify-end gap-2.5">
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 px-5 text-xs font-semibold rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-xs cursor-pointer active:scale-95 transition-all"
                  onClick={() => setCreateOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="px-5 h-10 btn-brand-red text-white! font-semibold text-xs shadow-xs rounded-xl! gap-2 flex items-center dark:shadow-none active:scale-95 cursor-pointer"
                  style={{ color: "#ffffff" }}
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <HugeIcon  className="ph-bold ph-spinner animate-spin text-sm text-white!"></HugeIcon>
                      Saving...
                    </>
                  ) : (
                    "Create"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* 8. Dialog: No Digital Copy Warning */}
        <Dialog open={fileWarningOpen} onOpenChange={setFileWarningOpen}>
          <DialogContent className="sm:max-w-md p-0 overflow-hidden bg-white border border-gray-200 shadow-2xl rounded-2xl dark:bg-card dark:border-white/10">
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
                <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-3.5 text-xs text-amber-800 dark:border-amber-950/40 dark:bg-amber-950/10">
                  Check physical file in archives before releasing.
                </div>
                {studentForRequest || detail?.room ? (
                  <div className="rounded-xl p-3 bg-white dark:bg-zinc-800/60 border border-gray-200 dark:border-white/10 text-xs font-semibold text-pup-maroon dark:text-red-400">
                    Room {detail?.room || studentForRequest?.room} · Cabinet {detail?.cabinet || studentForRequest?.cabinet} · Drawer {detail?.drawer || studentForRequest?.drawer}
                  </div>
                ) : (
                  <Empty className="py-6 border-red-200 bg-red-50 text-red-800 dark:bg-red-950/30">
                    <EmptyHeader>
                      <EmptyMedia>
                        <HugeIcon  className="ph-bold ph-warning-circle text-xl text-red-600"></HugeIcon>
                      </EmptyMedia>
                      <EmptyTitle className="text-sm">No Mapped Storage Location</EmptyTitle>
                      <EmptyDescription className="text-red-700/70 text-xs">
                        This requester has no physical drawer assignment.
                      </EmptyDescription>
                    </EmptyHeader>
                  </Empty>
                )}
              </div>
            </div>
            <DialogFooter className="m-0 p-6 pt-0 bg-white dark:bg-card border-none flex items-center justify-end gap-2.5">
              <Button
                type="button"
                variant="outline"
                className="h-10 px-5 text-xs font-semibold rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-xs cursor-pointer active:scale-95 transition-all"
                onClick={() => setFileWarningOpen(false)}
              >
                Close
              </Button>

              {studentForRequest || detail?.room ? (
                <Button
                  type="button"
                  className="flex h-10 items-center justify-center rounded-xl! btn-brand-red text-xs font-semibold text-white! shadow-xs border-none py-0 px-5 cursor-pointer active:scale-95"
                  style={{ color: "#ffffff" }}
                  onClick={() => {
                    setFileWarningOpen(false);
                    const target = studentForRequest || (detail?.room ? {
                      room: detail.room,
                      cabinet: detail.cabinet,
                      drawer: detail.drawer,
                      studentNo: detail.student_no,
                      name: detail.student_name || detail.requester_name,
                    } : null);
                    if (target) onLocateOnMap(target);
                  }}
                >
                  Locate
                </Button>
              ) : null}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}
