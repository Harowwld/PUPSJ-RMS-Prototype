"use client";
import HugeIcon from "@/components/shared/HugeIcon";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import DocumentRequestsTableSkeleton from "@/components/staff/skeletons/DocumentRequestsTableSkeleton";
import { cn, formatTitleCase } from "@/lib/utils";
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
import DocumentRequestDetailSheet from "@/components/staff/requests/DocumentRequestDetailSheet";
import PDFPreviewModal from "@/components/shared/PDFPreviewModal";
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyMedia,
} from "@/components/ui/empty";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "@/components/ui/tooltip";
import PageHeader from "@/components/shared/PageHeader";
import { RefreshButton } from "@/components/shared/RefreshButton";
import { Select } from "@/components/ui/select";
import MultiCriteriaFilter from "@/components/shared/MultiCriteriaFilter";
import ActiveFilterChips from "@/components/shared/ActiveFilterChips";
import { formatErrorMessage } from "@/lib/errorUtils";
import { matchesSearchQuery } from "@/lib/searchUtils";
import {
  ALLOWED_STATUS_TRANSITIONS,
  TERMINAL_REQUEST_STATUSES,
  ALLOWED_REOPEN_TRANSITIONS,
} from "@/lib/constants";
import {
  getRequestCharterStatus,
} from "@/lib/citizenCharter";

const STATUS_OPTIONS = [
  "Pending",
  "Deficient",
  "PendingPayment",
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
  if (s === "PENDINGPAYMENT" || s === "DEFICIENT") {
    return "bg-amber-100 text-amber-900 dark:bg-amber-950/40 dark:text-amber-300";
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
  const [slaStandards, setSlaStandards] = useState(null);
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
  const [pdfPreviewOpen, setPdfPreviewOpen] = useState(false);
  const [pdfPreviewData, setPdfPreviewData] = useState(null);

  // Local edit state for the detail Sheet
  const [editStatus, setEditStatus] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editUpdateMessage, setEditUpdateMessage] = useState("");

  // Reopen Request state
  const [reopenModalOpen, setReopenModalOpen] = useState(false);
  const [reopenTargetStatus, setReopenTargetStatus] = useState("InProgress");
  const [reopenReason, setReopenReason] = useState("");
  const [reopenSubmitting, setReopenSubmitting] = useState(false);

  const debouncedPageResetSkip = useRef(true);
  const autoLinkAttempted = useRef(new Set());

  const loadSlaStandards = useCallback(async () => {
    try {
      const res = await fetch("/api/system/sla-settings", { cache: "no-store" });
      const json = await res.json().catch(() => null);
      if (res.ok && json?.ok && json.data) {
        setSlaStandards(json.data);
      }
    } catch {
      // Use defaults if fetch fails
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadSlaStandards();
    }, 0);
    return () => clearTimeout(timer);
  }, [loadSlaStandards]);

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
    const val = studentSearch.trim();
    if (val.length < 2) return [];
    return students
      .filter((s) => {
        const sn = s.studentNo || s.student_no || "";
        const nm = s.name || "";
        return matchesSearchQuery([sn, nm, s.courseCode, s.section], val);
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
          loadSlaStandards();
          const elapsed = Date.now() - startTime;
          if (elapsed < 600) {
            await new Promise((resolve) => setTimeout(resolve, 600 - elapsed));
          }
        }

        setRows(Array.isArray(json.data) ? json.data : []);
        setTotal(Number(json.total) || 0);
      } catch (e) {
        if (showLoading || isManual) {
          showToast?.(
            formatErrorMessage(e, {
              title: "Requests Load Failed",
              actionContext: "Loading document requests",
            }),
            true
          );
          setRows([]);
          setTotal(0);
        }
      } finally {
        setLoading(false);
        setIsManualLoading(false);
      }
    },
    [page, itemsPerPage, debouncedQ, statusFilters, clientTypeFilters, docTypeFilters, sortBy, sortOrder, showToast, loadSlaStandards]
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
      showToast?.(
        formatErrorMessage(e, {
          title: "Details Load Failed",
          actionContext: "Loading request audit timeline",
        }),
        true
      );
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
    if (!detail?.id) return false;
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
      return true;
    } catch (e) {
      if (body.linkedDocumentId != null) {
        autoLinkAttempted.current.delete(reqId);
      }
      showToast?.(
        formatErrorMessage(e, {
          title: "Update Failed",
          actionContext: `Updating request #${reqId}`,
        }),
        true
      );
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmReopen = async () => {
    if (!detail?.id || reopenReason.trim().length < 5) return;
    setReopenSubmitting(true);
    try {
      const ok = await patchDetail({
        status: reopenTargetStatus,
        allowReopen: true,
        reopenReason: reopenReason.trim(),
        message: reopenReason.trim(),
      });
      if (ok) {
        setReopenModalOpen(false);
        setReopenReason("");
      }
    } finally {
      setReopenSubmitting(false);
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
      showToast?.({ title: "Missing Student Number", description: "Please select or enter a student number." }, true);
      return;
    }
    if (createClientType === "Alumni") {
      if (!createRequesterName.trim()) {
        showToast?.({ title: "Missing Requester Name", description: "Please provide the alumni requester name." }, true);
        return;
      }
      if (!createCourseCode) {
        showToast?.({ title: "Missing Academic Program", description: "Please select the academic program attended." }, true);
        return;
      }
    }
    if (!createDocType) {
      showToast?.({ title: "Missing Document Type", description: "Please select a document type to request." }, true);
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
      if (!res.ok || !json?.ok) throw new Error(json?.error || "Failed to create request");
      showToast?.({ title: "Request Created", description: "Request added successfully." });
      setCreateOpen(false);
      setPage(1);
      loadList({ showLoading: true });
    } catch (err) {
      showToast?.(
        formatErrorMessage(err, {
          title: "Request Creation Failed",
          actionContext: "Submitting new document request",
        }),
        true
      );
    } finally {
      setSubmitting(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / itemsPerPage));

  const displayedRows = useMemo(() => {
    if (charterFilters.length === 0) return rows;
    return rows.filter((r) => {
      const charter = getRequestCharterStatus(r, slaStandards);
      return charterFilters.includes(charter.status);
    });
  }, [rows, charterFilters, slaStandards]);

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
        { value: "Parent", label: "Parent / Guardian" },
      ],
    },
    {
      id: "docType",
      label: "Document Type",
      options: (docTypes || []).map((dt) => ({ value: dt, label: dt })),
    },
    {
      id: "charter",
      label: "Service Standard (SLA)",
      options: [
        { value: "OnTrack", label: "On Schedule", indicatorColor: "bg-emerald-500" },
        { value: "DueSoon", label: "Due Today", indicatorColor: "bg-amber-500" },
        { value: "Overdue", label: "Overdue (SLA)", indicatorColor: "bg-rose-500" },
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
        label: `SLA: ${label}`,
        onRemove: () => { setCharterFilters((prev) => prev.filter((c) => c !== cf)); setPage(1); },
      });
    });
    return chips;
  }, [q, statusFilters, clientTypeFilters, docTypeFilters, charterFilters]);

  return (
    <TooltipProvider delayDuration={200}>
      <div className="font-jakarta w-full flex flex-col h-auto gap-6 focus:outline-none animate-fade-up">
        {/* ONE Single Card Container encapsulating Header, Toolbar, Active Filters, Table & Pagination */}
        <Card className="flex h-auto w-full flex-col p-0 gap-0 overflow-visible rounded-2xl border border-border bg-white shadow-sm dark:border-border dark:bg-card dark:shadow-none isolate font-jakarta mb-4">
          {/* 1. Page Header */}
          <PageHeader
            icon="ph-tray"
            title="Document Requests"
            description="Manage and track student document requests (ODRS)."
            showBorder={false}
            className="p-6"
            titleClassName="text-[18px] font-semibold tracking-[-0.01em] text-gray-900 dark:text-zinc-50"
            descriptionClassName="text-[13px] font-normal text-gray-900 dark:text-zinc-300 mt-[4px]"
            actions={
              <div className="flex items-center gap-2">
                <RefreshButton
                  onRefresh={() => loadList({ showLoading: false, manual: true })}
                  isLoading={isManualLoading}
                  title="Refresh Requests"
                />

                

                <div className="flex items-center gap-2">
                  {!loading && !error && (
                    <Button
                      type="button"
                      onClick={() => setCreateOpen(true)}
                      title="Create Document Request"
                      className="flex h-10 px-5 text-xs font-semibold rounded-xl! btn-brand-red text-white! active:scale-95 disabled:opacity-50 transition-all cursor-pointer shadow-xs"
                      style={{ color: "#ffffff" }}
                    >
                      Create
                    </Button>
                  )}
                </div>
              </div>
            }
          />

          {/* 2. Navigation Toolbar */}
          {!error && (
            <div className="border-t border-border dark:border-border p-5 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 bg-gray-50/40 dark:bg-zinc-900/30">
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
                    className="h-9 w-full rounded-xl border border-border dark:border-border bg-white dark:bg-zinc-800 pl-8 pr-16 text-xs font-normal text-gray-900 dark:text-zinc-100 placeholder:text-gray-400 dark:placeholder:text-zinc-500 shadow-none focus-visible:outline-none focus-visible:border-pup-maroon focus-visible:ring-1 focus-visible:ring-pup-maroon dark:focus-visible:border-red-500/80 dark:focus-visible:ring-red-500/80"
                  />
                  <div className="absolute inset-y-0 right-3 flex items-center gap-1.5">
                    {q && (
                      <button
                        type="button"
                        onClick={() => {
                          setQ("");
                          setPage(1);
                        }}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-zinc-300 cursor-pointer p-0.5 transition-colors border-0 bg-transparent flex items-center justify-center"
                        title="Clear search"
                        aria-label="Clear search"
                      >
                        <HugeIcon className="ph-bold ph-x-circle text-[13px]" />
                      </button>
                    )}
                    <span className="text-[11px] font-mono text-gray-400 dark:text-zinc-500 pointer-events-none">
                      {total > 0 ? `${total.toLocaleString()}` : "0"}
                    </span>
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
              className="border-t border-border dark:border-border px-6 py-2.5"
            />
          )}

          {/* 4. Full-Width Table Body */}
          <div className={cn("w-full flex flex-col flex-1 min-h-0 border-t border-border dark:border-border", total === 0 && "rounded-b-2xl overflow-hidden")}>
            {(loading && !isManualLoading) ? (
              <DocumentRequestsTableSkeleton rowCount={itemsPerPage} embedded={true} />
            ) : error ? (
              <div className="p-12 rounded-b-2xl">
                <Empty className="h-[320px] flex flex-col items-center justify-center text-center text-gray-500 border-0 dark:text-zinc-400">
                  <EmptyHeader className="flex flex-col items-center gap-0">
                    <EmptyMedia className="w-16 h-16 rounded-full bg-white border border-border flex items-center justify-center mb-4 shadow-sm dark:bg-card dark:border-border dark:shadow-none">
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
              <div className="overflow-x-auto w-full">
                <table className={cn("w-full text-sm table-fixed min-w-[1000px]", displayedRows.length === 0 && "h-full")}>
                  <thead className="sticky top-0 z-10 border-b border-border dark:border-border bg-white dark:bg-card">
                    <tr className="text-left text-[12px] font-medium tracking-[0.04em] text-[#8E8E93] dark:text-zinc-500">
                      <th className="p-4 w-[8%]">
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
                      <th className="p-4 w-[22%]">
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
                      <th className="p-4 w-[18%]">
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
                      <th className="p-4 w-[12%]">
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
                      <th className="p-4 w-[22%]">
                        <span className="flex items-center text-[12px] font-medium tracking-[0.04em] text-[#8E8E93] dark:text-zinc-500">
                          Service Standard (SLA)
                        </span>
                      </th>
                      <th className="p-4 w-[11%]">
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
                      <th className="p-4 pr-6 text-right w-[7%] text-[12px] font-medium tracking-[0.04em] text-[#8E8E93] dark:text-zinc-500">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody className={cn("divide-y divide-border dark:divide-border", displayedRows.length === 0 && "h-full flex-1 flex flex-col")}>
                    {displayedRows.length === 0 ? (
                      <tr className="border-0 hover:bg-transparent flex-1 flex">
                        <td colSpan={7} className="p-0 border-0 flex-1 flex flex-col">
                          <Empty className="flex flex-1 h-full min-h-0 flex-col items-center justify-center border-0 bg-transparent text-center">
                            <EmptyHeader className="flex flex-col items-center gap-0">
                              <div className="relative mb-6">
                                <div className="absolute inset-0 scale-150 animate-pulse rounded-full bg-gray-50 opacity-50 dark:bg-card"></div>
                                <EmptyMedia className="relative z-10 flex h-24 w-24 items-center justify-center rounded-3xl border border-border bg-white shadow-xl dark:border-border dark:bg-card dark:shadow-none">
                                  <HugeIcon  className="ph-duotone ph-magnifying-glass text-xl text-gray-300 dark:text-zinc-600"></HugeIcon>
                                </EmptyMedia>
                              </div>
                              <EmptyTitle className="text-xl font-semibold text-gray-900 dark:text-zinc-50">No Document Requests Found</EmptyTitle>
                              <EmptyDescription className="max-w-xs text-sm font-medium text-gray-900 dark:text-zinc-300">
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
                        const isAlumni = r.client_type === "Alumni";
                        const isParent = r.client_type === "Parent";
                        const charter = getRequestCharterStatus(r, slaStandards);

                        return (
                          <tr
                            key={r.id}
                            className={cn(
                              "group cursor-pointer transition-colors hover:bg-gray-50/70 dark:hover:bg-zinc-800/40 select-none",
                              selectedId === r.id && "bg-blue-50/60 dark:bg-blue-950/20"
                            )}
                            onClick={() => openDetail(r.id)}
                          >
                            <td className="p-4 align-middle text-xs font-mono text-gray-500 dark:text-zinc-400 whitespace-nowrap">
                              #{r.id}
                            </td>
                            <td className="p-4 align-middle overflow-hidden">
                              <div className="flex items-center gap-2">
                                <span
                                  className="text-[13px] font-semibold text-gray-900 dark:text-zinc-100 group-hover:text-pup-maroon dark:group-hover:text-red-400 transition-colors truncate"
                                  title={formatTitleCase(r.student_name || r.requester_name)}
                                >
                                  {formatTitleCase(r.student_name || r.requester_name) || "N/A"}
                                </span>
                                <span
                                  className={cn(
                                    "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium shrink-0",
                                    isParent
                                      ? "bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200/60 dark:border-amber-900/40"
                                      : isAlumni
                                      ? "bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border border-purple-200/50 dark:border-purple-800/30"
                                      : "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200/50 dark:border-blue-800/30"
                                  )}
                                >
                                  {isParent ? "Parent/Guardian" : isAlumni ? "Alumni" : "Student"}
                                </span>
                                {Number(r.attachment_count) > 0 && (
                                  <span
                                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-medium bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-400 shrink-0"
                                    title={`${r.attachment_count} attachment(s)`}
                                  >
                                    <HugeIcon className="ph-bold ph-paperclip text-[11px]" />
                                    {r.attachment_count}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-1.5 mt-1 min-w-0 overflow-hidden text-xs font-normal text-[#8E8E93] dark:text-zinc-500">
                                {r.student_no ? (
                                  <span className="font-mono text-xs font-semibold px-2.5 py-0.5 rounded-full bg-gray-100 dark:bg-zinc-800 text-gray-800 dark:text-zinc-200 whitespace-nowrap shrink-0">
                                    {r.student_no}
                                  </span>
                                ) : (
                                  <span className="italic text-xs text-amber-600 dark:text-amber-400 shrink-0">No Student ID</span>
                                )}
                                {r.course_code && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 shrink-0">
                                    {r.course_code}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="p-4 align-middle overflow-hidden">
                              <div className="inline-flex max-w-full items-center justify-center rounded-full bg-gray-100 px-2.5 py-0.5 text-[11px] font-semibold text-gray-800 dark:bg-zinc-800 dark:text-zinc-200">
                                <span className="truncate" title={r.doc_type}>
                                  {r.doc_type}
                                </span>
                              </div>
                            </td>
                            <td className="p-4 align-middle whitespace-nowrap">
                              <div className={cn("inline-flex w-fit items-center justify-center rounded-full px-2.5 py-0.5 text-[11px] font-medium tracking-[0.04em] whitespace-nowrap", statusBadgeClass(r.status))}>
                                {r.status === "InProgress" ? "In Progress" : r.status === "PendingPayment" ? "Pending Payment" : r.status}
                              </div>
                            </td>
                            <td className="p-4 align-middle overflow-hidden">
                              <div className="flex flex-col gap-1 min-w-0">
                                <div className="flex items-center gap-1.5 min-w-0 overflow-hidden">
                                  <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium whitespace-nowrap shrink-0", charter.tier.badgeClass)}>
                                    {charter.tier.shortLabel}
                                  </span>
                                  <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap shrink-0", charter.badgeClass)}>
                                    <HugeIcon  className={cn("ph-bold text-[10px]", charter.icon || "ph-clock")} />
                                    {charter.label}
                                  </span>
                                </div>
                                <span className="text-[11px] text-gray-400 dark:text-zinc-500 truncate" title={`Target: ${charter.deadlineFormatted}`}>
                                  Target: {charter.deadlineFormatted}
                                </span>
                              </div>
                            </td>
                            <td className="p-4 align-middle text-xs font-normal text-[#8E8E93] dark:text-zinc-500 whitespace-nowrap">
                              {formatPHDateTime(r.created_at)}
                            </td>
                            <td className="p-4 pr-6 align-middle text-right">
                              <div className="flex items-center justify-end" onClick={(e) => e.stopPropagation()}>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <button
                                      type="button"
                                      onClick={() => openDetail(r.id)}
                                      aria-label="Inspect Request Details"
                                      className="w-7 h-7 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-zinc-100 focus:outline-none cursor-pointer active:scale-95 flex items-center justify-center transition-colors border-0 bg-transparent"
                                    >
                                      <HugeIcon className="ph-bold ph-eye text-[16px]" />
                                    </button>
                                  </TooltipTrigger>
                                  <TooltipContent>Inspect Request</TooltipContent>
                                </Tooltip>
                              </div>
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
              <div className="flex items-center gap-6 text-xs text-gray-900 dark:text-zinc-300 select-none">
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
                  className="text-xs text-gray-900 dark:text-zinc-300 disabled:opacity-40 cursor-pointer rounded-xl h-8 px-3"
                >
                  Prev
                </Button>

                <div className="h-8 w-8 rounded-xl border border-[#e5e5ea] dark:border-border flex items-center justify-center text-xs font-bold text-gray-800 dark:text-zinc-200 bg-white dark:bg-zinc-900">
                  {page}
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="text-xs text-gray-900 dark:text-zinc-300 disabled:opacity-40 cursor-pointer rounded-xl h-8 px-3"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </Card>

        {/* 6. Request Detail Sheet Slide-Over Drawer */}
        <DocumentRequestDetailSheet
          open={Boolean(selectedId)}
          onOpenChange={(open) => {
            if (!open) {
              setSelectedId(null);
              setDetail(null);
              setEditUpdateMessage("");
            }
          }}
          selectedId={selectedId}
          detail={detail}
          detailLoading={detailLoading}
          editStatus={editStatus}
          setEditStatus={setEditStatus}
          editUpdateMessage={editUpdateMessage}
          setEditUpdateMessage={setEditUpdateMessage}
          availableStatuses={availableStatuses}
          isTerminalStatus={isTerminalStatus}
          saving={saving}
          hasEdits={hasEdits}
          handleResetEdits={handleResetEdits}
          handleManualSave={handleManualSave}
          patchDetail={patchDetail}
          studentForRequest={studentForRequest}
          requestNeedsPhysicalVerification={requestNeedsPhysicalVerification}
          setFileWarningOpen={setFileWarningOpen}
          onLocateOnMap={onLocateOnMap}
          setPdfPreviewData={setPdfPreviewData}
          setPdfPreviewOpen={setPdfPreviewOpen}
          slaStandards={slaStandards}
          setReopenTargetStatus={setReopenTargetStatus}
          setReopenReason={setReopenReason}
          setReopenModalOpen={setReopenModalOpen}
          retentionExpiryDate={retentionExpiryDate}
          daysRemaining={daysRemaining}
        />

        {/* 7. Dialog: Create Request */}
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogContent className="w-full max-w-2xl overflow-hidden rounded-2xl border border-border bg-white p-0 shadow-2xl sm:max-w-2xl dark:border-border dark:bg-card flex flex-col gap-0">
            <DialogHeader className="bg-white p-6 pb-0 dark:bg-card border-none text-left">
              <div className="flex items-start gap-4">
                <div className="min-w-0 pr-8">
                  <DialogTitle className="text-[16px] font-semibold tracking-[-0.01em] text-gray-900 dark:text-zinc-50">
                    New Document Request
                  </DialogTitle>
                  <DialogDescription className="mt-1 text-[13px] font-normal text-gray-900 dark:text-zinc-300">
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
                          ? "bg-slate-900 text-white border-slate-900 dark:bg-zinc-100 dark:text-zinc-900 dark:border-border shadow-xs"
                          : "bg-white text-gray-700 border-border hover:bg-gray-50 dark:bg-zinc-800 dark:text-zinc-300 dark:border-border"
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
                          ? "bg-slate-900 text-white border-slate-900 dark:bg-zinc-100 dark:text-zinc-900 dark:border-border shadow-xs"
                          : "bg-white text-gray-700 border-border hover:bg-gray-50 dark:bg-zinc-800 dark:text-zinc-300 dark:border-border"
                      )}
                    >
                      Alumni / Former Student
                    </button>
                  </div>
                </div>

                {/* Form fields for Student vs Alumni */}
                {createClientType === "Student" ? (
                  selectedStudent ? (
                    <div className="rounded-xl border border-red-100 bg-red-50/50 p-4 relative animate-in fade-in zoom-in-95 duration-fast dark:border-border dark:bg-red-950/20">
                      <button
                        type="button"
                        className="absolute top-2.5 right-2.5 text-gray-400 hover:text-gray-600 transition-colors bg-white hover:bg-gray-100 border border-border rounded-full w-5 h-5 flex items-center justify-center shadow-xs dark:bg-zinc-800 dark:border-border dark:text-zinc-300"
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
                            <span>Course: <strong className="text-gray-800 dark:text-zinc-100">{selectedStudent.courseCode || selectedStudent.course_code || "N/A"}</strong></span>
                            <span>Section: <strong className="text-gray-800 dark:text-zinc-100">{selectedStudent.section || "N/A"}</strong></span>
                            <span>Year: <strong className="text-gray-800 dark:text-zinc-100">{selectedStudent.yearLevel || selectedStudent.year_level || "N/A"}</strong></span>
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
                            className="pl-9 h-10 bg-white dark:bg-zinc-800 border border-border dark:border-border rounded-xl text-gray-900 dark:text-zinc-100 placeholder:text-gray-400 dark:placeholder:text-zinc-500 shadow-none focus-visible:outline-none focus-visible:border-pup-maroon focus-visible:ring-1 focus-visible:ring-pup-maroon dark:focus-visible:border-red-500/80 dark:focus-visible:ring-red-500/80"
                            value={studentSearch}
                            onChange={(e) => setStudentSearch(e.target.value)}
                            placeholder="Type to search by student name or number..."
                          />
                        </div>
                        {studentSuggestions.length > 0 && (
                          <div className="absolute z-50 left-0 right-0 mt-1 rounded-xl border border-border bg-white overflow-hidden shadow-lg animate-in fade-in slide-in-from-top-1 duration-fast dark:bg-zinc-900 dark:border-border">
                            {studentSuggestions.map((s) => {
                              const sn = String(s?.studentNo || s?.student_no || "");
                              return (
                                <button
                                  key={sn}
                                  type="button"
                                  className="w-full text-left px-3 py-2 border-b last:border-b-0 border-border hover:bg-red-50/50 transition-colors group flex flex-col gap-0.5 dark:border-border dark:hover:bg-zinc-800/50"
                                  onClick={() => {
                                    setSelectedStudent(s);
                                    setCreateStudentNo(sn);
                                    setStudentSearch("");
                                  }}
                                >
                                  <div className="text-sm font-semibold text-gray-900 dark:text-zinc-100 group-hover:text-pup-maroon dark:group-hover:text-red-400 transition-colors">
                                    {s?.name}
                                  </div>
                                  <div className="text-[10px] text-gray-900 dark:text-zinc-300 flex items-center gap-1.5">
                                    <span>{sn}</span>
                                    <span className="text-gray-300 dark:text-zinc-700">•</span>
                                    <span>{s?.courseCode || s?.course_code || "N/A"} - {s?.section || "N/A"}</span>
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
                          className="mt-1.5 h-10 bg-white dark:bg-zinc-800 border border-border dark:border-border rounded-xl text-gray-900 dark:text-zinc-100 placeholder:text-gray-400 dark:placeholder:text-zinc-500 shadow-none focus-visible:outline-none focus-visible:border-pup-maroon focus-visible:ring-1 focus-visible:ring-pup-maroon dark:focus-visible:border-red-500/80 dark:focus-visible:ring-red-500/80"
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
                        className="mt-1.5 h-10 bg-white dark:bg-zinc-800 border border-border dark:border-border rounded-xl text-gray-900 dark:text-zinc-100 placeholder:text-gray-400 dark:placeholder:text-zinc-500 shadow-none focus-visible:outline-none focus-visible:border-pup-maroon focus-visible:ring-1 focus-visible:ring-pup-maroon dark:focus-visible:border-red-500/80 dark:focus-visible:ring-red-500/80"
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
                        className="mt-1.5 h-10 w-full rounded-xl border border-border bg-white px-3 text-xs font-normal shadow-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-pup-maroon focus-visible:border-pup-maroon dark:focus-visible:border-red-500/80 dark:focus-visible:ring-red-500/80 dark:bg-zinc-800 dark:border-border"
                        value={createCourseCode}
                        onChange={(e) => setCreateCourseCode(e.target.value)}
                        required
                      >
                        <option value="">Select Degree Program…</option>
                        {courses.map((c) => (
                          <option key={c.code || c.id} value={c.code}>
                            {c.code} {c.name ? `: ${c.name}` : ""}
                          </option>
                        ))}
                      </Select>
                      <span className="text-[11px] text-gray-900 dark:text-zinc-300 mt-1 block">
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
                        className="mt-1.5 h-10 bg-white dark:bg-zinc-800 border border-border dark:border-border rounded-xl text-gray-900 dark:text-zinc-100 placeholder:text-gray-400 dark:placeholder:text-zinc-500 shadow-none focus-visible:outline-none focus-visible:border-pup-maroon focus-visible:ring-1 focus-visible:ring-pup-maroon dark:focus-visible:border-red-500/80 dark:focus-visible:ring-red-500/80"
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
                    className="mt-1.5 h-10 w-full rounded-xl border border-border bg-white px-3 text-xs font-normal shadow-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-pup-maroon focus-visible:border-pup-maroon dark:focus-visible:border-red-500/80 dark:focus-visible:ring-red-500/80 dark:bg-zinc-800 dark:border-border"
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
                    className="mt-1.5 w-full min-h-[72px] rounded-xl border border-border p-3 text-xs font-normal focus:border-pup-maroon focus:ring-1 focus:ring-pup-maroon focus:outline-none dark:bg-zinc-800 dark:border-border dark:text-zinc-100 placeholder:text-gray-400 dark:placeholder:text-zinc-500 transition-all resize-none"
                    value={createNotes}
                    onChange={(e) => setCreateNotes(e.target.value)}
                    placeholder="Requester purpose or special remarks…"
                  />
                </div>
              </div>

              {/* Dialog Actions */}
              <DialogFooter className="p-6 pt-0 bg-white dark:bg-card border-none flex items-center justify-end gap-2.5">
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 px-4 text-xs font-semibold rounded-xl border border-border dark:border-border bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-xs cursor-pointer active:scale-95 transition-all"
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
          <DialogContent className="sm:max-w-md p-0 overflow-hidden bg-white border border-border shadow-2xl rounded-2xl dark:bg-card dark:border-border">
            <DialogHeader className="p-6 bg-white dark:bg-card border-none pb-0">
              <div className="min-w-0">
                <DialogTitle className="text-[16px] font-semibold tracking-[-0.01em] text-gray-900 dark:text-zinc-50">
                  No Digital Copy
                </DialogTitle>
                <DialogDescription className="text-[13px] font-normal text-gray-900 dark:text-zinc-300 mt-1">
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
                  <div className="rounded-xl p-3 bg-white dark:bg-zinc-800/60 border border-border dark:border-border text-xs font-semibold text-pup-maroon dark:text-red-400">
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
            <DialogFooter className="p-6 pt-0 bg-white dark:bg-card border-none flex items-center justify-end gap-2.5">
              <Button
                type="button"
                variant="outline"
                className="h-10 px-4 text-xs font-semibold rounded-xl border border-border dark:border-border bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-xs cursor-pointer active:scale-95 transition-all"
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

        {/* Reopen Request Dialog Modal */}
        <Dialog open={reopenModalOpen} onOpenChange={setReopenModalOpen}>
          <DialogContent className="sm:max-w-md p-0 overflow-hidden bg-white border border-border shadow-2xl rounded-2xl dark:bg-card dark:border-border">
            <DialogHeader className="p-6 bg-white dark:bg-card border-none pb-0 text-left">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200/60 dark:border-amber-800/40 flex items-center justify-center text-amber-700 dark:text-amber-400 shrink-0">
                  <HugeIcon className="ph-bold ph-arrow-counter-clockwise text-lg" />
                </div>
                <div>
                  <DialogTitle className="text-[16px] font-semibold tracking-[-0.01em] text-gray-900 dark:text-zinc-50">
                    Reopen Document Request
                  </DialogTitle>
                  <DialogDescription className="text-[13px] font-normal text-gray-600 dark:text-zinc-300 mt-1">
                    Reopen closed request #{detail?.id} to reactivate workflow and notify the requester.
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-zinc-300 mb-1.5">
                  Target Reactivation Status
                </label>
                <Select
                  className="w-full h-10 px-3 text-xs font-medium text-gray-900 dark:text-zinc-100 bg-white dark:bg-zinc-800 border border-border rounded-xl cursor-pointer"
                  menuClassName="rounded-xl border border-border bg-white dark:bg-zinc-900 shadow-2xl p-1.5"
                  value={reopenTargetStatus}
                  onChange={(e) => setReopenTargetStatus(e.target.value)}
                >
                  {(ALLOWED_REOPEN_TRANSITIONS[detail?.status] || ["InProgress"]).map((st) => (
                    <option key={st} value={st}>
                      {st === "InProgress" ? "In Progress" : st}
                    </option>
                  ))}
                </Select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-gray-700 dark:text-zinc-300">
                    Written Justification / Reason <span className="text-red-500">*</span>
                  </label>
                  <span className="text-[11px] text-gray-400">
                    {reopenReason.trim().length}/5 chars min
                  </span>
                </div>
                <textarea
                  className="w-full min-h-[90px] p-3 text-xs font-normal text-gray-900 dark:text-zinc-100 bg-[#F5F5F7] dark:bg-zinc-800/50 border border-border rounded-xl focus:border-pup-maroon focus:ring-1 focus:ring-pup-maroon focus:outline-none transition-all resize-none placeholder:text-gray-400 dark:placeholder:text-zinc-500"
                  placeholder="State the official reason for reopening (e.g., student appeal granted, payment verified, clerical error correction)..."
                  value={reopenReason}
                  onChange={(e) => setReopenReason(e.target.value)}
                />
              </div>

              <div className="rounded-xl bg-amber-50/70 dark:bg-amber-950/30 p-3 border border-amber-200/60 dark:border-amber-900/40 text-xs text-amber-900 dark:text-amber-300 flex items-start gap-2">
                <HugeIcon className="ph-fill ph-info text-sm shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                <span>
                  Reopening records an immutable entry in the audit logs and posts a milestone update visible on the student portal.
                </span>
              </div>
            </div>

            <DialogFooter className="p-6 pt-0 bg-white dark:bg-card border-none flex items-center justify-end gap-2.5">
              <Button
                type="button"
                variant="outline"
                className="h-10 px-5 text-xs font-semibold rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-xs cursor-pointer active:scale-95 transition-all"
                onClick={() => setReopenModalOpen(false)}
                disabled={reopenSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="button"
                className="h-10 px-5 text-xs font-semibold rounded-xl btn-brand-red text-white shadow-xs cursor-pointer active:scale-95 transition-all disabled:opacity-50"
                onClick={handleConfirmReopen}
                disabled={reopenSubmitting || reopenReason.trim().length < 5}
              >
                {reopenSubmitting ? "Reopening..." : "Confirm Reopen"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

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
    </TooltipProvider>
  );
}
