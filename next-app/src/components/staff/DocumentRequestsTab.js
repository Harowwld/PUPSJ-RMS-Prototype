"use client";
import { Table, IdentifierBadge } from "@/components/ui/table";
import TablePagination from "@/components/shared/TablePagination";
import { Textarea } from "@/components/ui/textarea";
import NoticeBanner from "@/components/shared/NoticeBanner";
import CreateAnotherToggle from "@/components/shared/CreateAnotherToggle";
import useCreateAnother from "@/hooks/useCreateAnother";

import useUrlPage from "@/hooks/useUrlPage";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import DocumentRequestsTableSkeleton from "@/components/staff/skeletons/DocumentRequestsTableSkeleton";
import { cn, formatTitleCase } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { SegmentedControl } from "@/components/ui/tabs";
import ViewModeIcon from "@/components/shared/ViewModeIcon";
import {
  FilterPopover,
  SortPopover,
  GroupPopover,
  ColumnsPopover,
} from "@/components/systemadmin/OfficeTableControls";
import DashboardSearch from "@/components/systemadmin/DashboardSearch";
import DocumentRequestRecordList from "@/components/staff/requests/DocumentRequestRecordList";
import DocumentRequestKanbanPipeline from "@/components/staff/requests/DocumentRequestKanbanPipeline";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { getDocAvailabilityForType } from "@/lib/docAvailability";
import { formatPHDateTime } from "@/lib/timeFormat";
import DocumentRequestDetailSheet from "@/components/staff/requests/DocumentRequestDetailSheet";
import PDFPreviewModal from "@/components/shared/PDFPreviewModal";
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
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
import ActiveFilterChips from "@/components/shared/ActiveFilterChips";
import TableScrollControls from "@/components/shared/TableScrollControls";
import DataViewToolbar from "@/components/shared/DataViewToolbar";
import useTableScroll from "@/hooks/useTableScroll";
import FileAttachmentDropzone from "@/components/shared/FileAttachmentDropzone";
import { formatErrorMessage } from "@/lib/errorUtils";
import { matchesSearchQuery } from "@/lib/searchUtils";
import {
  ALLOWED_STATUS_TRANSITIONS,
  TERMINAL_REQUEST_STATUSES,
  ALLOWED_REOPEN_TRANSITIONS,
  canTransitionRequestStatus,
} from "@/lib/constants";
import {
  getRequestCharterStatus,
} from "@/lib/citizenCharter";
import { AlertCircleIcon as EmptyAlertCircleIcon, Search01Icon as EmptySearch01Icon , Archive01Icon, ArrowDown01Icon, ArrowUp01Icon, ArrowUpDownIcon, Attachment01Icon, Cancel01Icon, Clock01Icon, GraduationScrollIcon, Loading01Icon, StudentIcon, UserSearch01Icon, UserStatusIcon, ViewIcon, Search01Icon} from "hugeicons-react";
import AppIcon from "@/components/ui/app-icon";
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
    return <ArrowUpDownIcon size="1em"  className="ml-1 text-[11px] opacity-40 transition-opacity group-hover:opacity-70 dark:opacity-30 dark:group-hover:opacity-60"></ArrowUpDownIcon>;
  }
  return sortOrder === "ASC" ? (
    <ArrowUp01Icon size="1em"  className="ml-1 text-[11px] text-pup-maroon animate-in fade-in zoom-in duration-normal dark:text-primary"></ArrowUp01Icon>
  ) : (
    <ArrowDown01Icon size="1em"  className="ml-1 text-[11px] text-pup-maroon animate-in fade-in zoom-in duration-normal dark:text-primary"></ArrowDown01Icon>
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

function formatAttachmentSize(bytes) {
  if (!bytes || bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function getAttachmentIconConfig(filename = "", mimeType = "") {
  const ext = String(filename || "").split(".").pop()?.toLowerCase();
  const mime = String(mimeType || "").toLowerCase();
  if (ext === "pdf" || mime.includes("pdf")) {
    return {
      icon: " File02Icon",
      color: "text-red-600 dark:text-red-400",
      badgeBg: "bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-300 border-red-200/60 dark:border-red-900/40",
    };
  }
  if (["png", "jpg", "jpeg", "webp"].includes(ext) || mime.includes("image")) {
    return {
      icon: " Image01Icon",
      color: "text-blue-600 dark:text-blue-400",
      badgeBg: "bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border-blue-200/60 dark:border-blue-900/40",
    };
  }
  return {
    icon: " File01Icon",
    color: "text-gray-600 dark:text-zinc-400",
    badgeBg: "bg-gray-100 text-gray-700 dark:bg-zinc-800 dark:text-zinc-300 border-gray-200 dark:border-zinc-700",
  };
}

export default function DocumentRequestsTab({
  students = [],
  courses = [],
  docTypes = [],
  staffDocs = [],
  onLocateOnMap,
  showToast,
  error = null,
  officeId = "registrar",
}) {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const listRequest = useRef(0);
  const [isManualLoading, setIsManualLoading] = useState(false);
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [statusFilters, setStatusFilters] = useState([]);
  const [clientTypeFilters, setClientTypeFilters] = useState([]);
  const [docTypeFilters, setDocTypeFilters] = useState([]);
  const [charterFilters, setCharterFilters] = useState([]);
  const [slaStandards, setSlaStandards] = useState(null);
  const [page, setPage] = useUrlPage();
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortBy, setSortBy] = useState("created_at");
  const [sortOrder, setSortOrder] = useState("DESC");

  const [viewMode, setViewMode] = useState(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("pup_doc_requests_view_mode");
        if (saved && ["list", "table", "kanban"].includes(saved)) return saved;
      } catch {}
    }
    return "table";
  });
  const viewModeRef = useRef(viewMode);
  viewModeRef.current = viewMode;

  const [filterRules, setFilterRules] = useState([]);
  const [groupBy, setGroupBy] = useState("status");
  const [visibleColumns, setVisibleColumns] = useState([
    "id",
    "student_no",
    "student",
    "docType",
    "status",
    "charter",
    "targetDate",
    "createdAt",
  ]);

  const filterFields = useMemo(() => [
    {
      key: "status",
      label: "Status",
      options: [
        { value: "Pending", label: "Pending" },
        { value: "PendingPayment", label: "Pending Payment" },
        { value: "InProgress", label: "In Progress" },
        { value: "Ready", label: "Ready" },
        { value: "Completed", label: "Completed" },
        { value: "Deficient", label: "Deficient" },
        { value: "Cancelled", label: "Cancelled" },
        { value: "Shredded", label: "Shredded" },
      ],
    },
    {
      key: "doc_type",
      label: "Document Type",
      options: (docTypes || []).map((dt) => ({ value: dt, label: dt })),
    },
    {
      key: "client_type",
      label: "Client Type",
      options: [
        { value: "Student", label: "Student" },
        { value: "Alumni", label: "Alumni" },
        { value: "Parent", label: "Parent / Guardian" },
      ],
    },
    {
      key: "charter",
      label: "Processing Time",
      options: [
        { value: "OnTrack", label: "On Schedule" },
        { value: "DueSoon", label: "Due Today" },
        { value: "Overdue", label: "Past Due" },
        { value: "Compliant", label: "On Time" },
        { value: "Delayed", label: "Delayed" },
      ],
    },
  ], [docTypes]);

  const sortOptions = useMemo(() => [
    { key: "created_at", label: "Date Filed" },
    { key: "updated_at", label: "Last Updated" },
    { key: "student_no", label: "Requester ID" },
    { key: "student_name", label: "Requester Name" },
    { key: "doc_type", label: "Document Type" },
    { key: "status", label: "Status" },
  ], []);

  const groupOptions = useMemo(() => [
    { key: "status", label: "Status", icon: UserStatusIcon },
    { key: "doc_type", label: "Document Type", icon: GraduationScrollIcon },
    { key: "client_type", label: "Client Type", icon: StudentIcon },
    { key: "none", label: "No grouping" },
  ], []);

  const tableColumns = useMemo(() => [
    { key: "id", label: "Request ID" },
    { key: "student_no", label: "Requester ID" },
    { key: "student", label: "Requester" },
    { key: "docType", label: "Document Type" },
    { key: "status", label: "Status" },
    { key: "charter", label: "Processing Time" },
    { key: "targetDate", label: "Target Date" },
    { key: "createdAt", label: "Date Filed" },
  ], []);

  const [createOpen, setCreateOpen] = useState(false);
  const { attachForm, ...repeat } = useCreateAnother(createOpen);
  const [createClientType, setCreateClientType] = useState("Student");
  const [createStudentNo, setCreateStudentNo] = useState("");
  const [createCourseCode, setCreateCourseCode] = useState("");
  const [createRequesterName, setCreateRequesterName] = useState("");
  const [createRequesterRelationship, setCreateRequesterRelationship] = useState("Mother");
  const [createRequesterContact, setCreateRequesterContact] = useState("");
  const [createAttachments, setCreateAttachments] = useState([]);
  const [isDraggingAttachment, setIsDraggingAttachment] = useState(false);
  const [createDocType, setCreateDocType] = useState("");
  const [createNotes, setCreateNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const attachmentInputRef = useRef(null);

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

  const resetCreateForm = (keepClientType = false) => {
    if (!keepClientType) setCreateClientType("Student");
    setCreateStudentNo("");
    setCreateCourseCode("");
    setCreateRequesterName("");
    setCreateRequesterRelationship("Mother");
    setCreateRequesterContact("");
    setCreateAttachments([]);
    setIsDraggingAttachment(false);
    setCreateDocType("");
    setCreateNotes("");
    setStudentSearch("");
    setSelectedStudent(null);
  };

  const handleCreateOpenChange = (open) => {
    if (submitting) return;
    setCreateOpen(open);
    if (!open) resetCreateForm();
  };

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
  }, [debouncedQ, setPage]);

  const loadList = useCallback(
    async (opts = { showLoading: true }) => {
      const request = ++listRequest.current;
      const showLoading = opts.showLoading !== false;
      const isManual = opts.manual === true;
      if (isManual) {
        setIsManualLoading(true);
      } else if (showLoading) {
        setLoading(true);
      }
      const startTime = Date.now();
      try {
        const currentView = opts.viewModeOverride || viewModeRef.current;
        const effectiveLimit = currentView === "kanban" ? 100 : itemsPerPage;
        const offset = currentView === "kanban" ? 0 : (page - 1) * itemsPerPage;
        const qs = new URLSearchParams();
        qs.set("limit", String(effectiveLimit));
        qs.set("offset", String(offset));
        if (debouncedQ) qs.set("q", debouncedQ);

        const statusRuleValues = filterRules
          .filter((r) => r.fieldKey === "status" && r.operator === "is")
          .map((r) => r.value);
        const docTypeRuleValues = filterRules
          .filter((r) => r.fieldKey === "doc_type" && r.operator === "is")
          .map((r) => r.value);
        const combinedStatus = [...new Set([...statusFilters, ...statusRuleValues])];
        const combinedDocTypes = [...new Set([...docTypeFilters, ...docTypeRuleValues])];

        if (combinedStatus.length > 0) qs.set("status", combinedStatus.join(","));
        if (clientTypeFilters.length > 0) qs.set("clientType", clientTypeFilters.join(","));
        if (combinedDocTypes.length > 0) qs.set("docType", combinedDocTypes.join(","));
        qs.set("sortBy", sortBy);
        qs.set("sortOrder", sortOrder);
        const res = await fetch(`/api/document-requests?${qs}`, {
          cache: "no-store",
        });
        const json = await res.json().catch(() => null);
        if (request !== listRequest.current) return;
        if (!res.ok || !json?.ok) throw new Error(json?.error || "Failed to load");

        if (isManual) {
          loadSlaStandards();
          const elapsed = Date.now() - startTime;
          if (elapsed < 600) {
            await new Promise((resolve) => setTimeout(resolve, 600 - elapsed));
          }
        }

        if (request !== listRequest.current) return;
        setRows(Array.isArray(json.data) ? json.data : []);
        setTotal(Number(json.total) || 0);
      } catch (e) {
        if (request !== listRequest.current) return;
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
        if (request === listRequest.current) {
          setLoading(false);
          setIsManualLoading(false);
        }
      }
    },
    [page, itemsPerPage, debouncedQ, statusFilters, clientTypeFilters, docTypeFilters, filterRules, sortBy, sortOrder, showToast, loadSlaStandards]
  );

  const handleViewModeChange = (mode) => {
    setViewMode(mode);
    viewModeRef.current = mode;
    try {
      localStorage.setItem("pup_doc_requests_view_mode", mode);
    } catch {}

    if (mode === "kanban" && rows.length < 100 && rows.length < total) {
      loadList({ showLoading: false, viewModeOverride: "kanban" });
    } else if (mode !== "kanban" && rows.length > itemsPerPage) {
      loadList({ showLoading: false, viewModeOverride: mode });
    }
  };

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
    const timer = setTimeout(() => loadList({ showLoading: true }), 0);
    return () => { clearTimeout(timer); listRequest.current += 1; };
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

  const openDetail = async (target) => {
    const id = typeof target === "object" && target !== null ? target.id : target;
    if (!id || isNaN(Number(id))) return;
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

  const detailStatus = detail?.status;
  const availableStatuses = useMemo(() => {
    if (!detailStatus) return STATUS_OPTIONS;
    return ALLOWED_STATUS_TRANSITIONS[detailStatus] || [detailStatus];
  }, [detailStatus]);

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
    if (createClientType !== "Alumni" && !createStudentNo.trim()) {
      showToast?.({ title: "Missing Student Number", description: "Please provide the student number for this request." }, true);
      return;
    }
    if (createClientType === "Alumni" || createClientType === "Parent") {
      if (!createRequesterName.trim()) {
        showToast?.({ title: "Missing Requester Name", description: "Please provide the requester's full name." }, true);
        return;
      }
      if (createClientType === "Alumni" && !createStudentNo.trim() && !createCourseCode) {
        showToast?.({ title: "Missing Academic Program", description: "Please select the academic program attended." }, true);
        return;
      }
    }
    if (createClientType === "Parent") {
      if (!createRequesterRelationship) {
        showToast?.({ title: "Missing Relationship", description: "Please select the requester's relationship to the student." }, true);
        return;
      }
      if (!createAttachments.some((item) => item.attachmentType === "spa") || !createAttachments.some((item) => item.attachmentType === "valid_id")) {
        showToast?.({ title: "Authorization Documents Required", description: "Attach both an SPA / authorization letter and a valid government ID." }, true);
        return;
      }
    }
    if (!createDocType) {
      showToast?.({ title: "Missing Document Type", description: "Please select a document type to request." }, true);
      return;
    }
    if (createNotes.trim().length < 5) {
      showToast?.({ title: "Purpose Required", description: "Enter a purpose of at least 5 characters." }, true);
      return;
    }

    if (!repeat.beginSave()) return;
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("clientType", createClientType);
      if (createStudentNo.trim()) formData.append("studentNo", createStudentNo.trim());
      if (createRequesterName.trim()) formData.append("requesterName", createRequesterName.trim());
      if (createRequesterRelationship) formData.append("requesterRelationship", createRequesterRelationship);
      if (createRequesterContact.trim()) formData.append("requesterContact", createRequesterContact.trim());
      if (createCourseCode) formData.append("courseCode", createCourseCode);
      formData.append("docType", createDocType);
      formData.append("notes", createNotes.trim());
      createAttachments.forEach(({ file, attachmentType }) => {
        formData.append("files", file);
        formData.append("file_types", attachmentType);
      });
      const res = await fetch("/api/document-requests", {
        method: "POST",
        body: formData,
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) throw new Error(json?.error || "Failed to create request");
      showToast?.({ title: "Request Created", description: "Request added successfully." });
      repeat.complete(() => resetCreateForm(repeat.createAnother), () => setCreateOpen(false));
      setPage(1);
      Promise.resolve().then(() => loadList({ showLoading: true })).catch(() => {
        showToast?.({ title: "Refresh Failed", description: "Request created. Refresh the list to see the new entry." }, true);
      });
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
      repeat.endSave();
    }
  };

  const processAttachmentFiles = (filesList) => {
    const files = Array.from(filesList || []);
    if (!files.length) return;
    const allowedTypes = new Set(["application/pdf", "image/png", "image/jpeg", "image/webp"]);
    const validFiles = files.filter((file) => {
      if (file.size > 10 * 1024 * 1024) return false;
      if (!allowedTypes.has(String(file.type || "").toLowerCase())) return false;
      return true;
    });
    if (validFiles.length !== files.length) {
      showToast?.({ title: "Unsupported Attachment", description: "Choose PDF, PNG, JPG, or WEBP files up to 10 MB each." }, true);
    }
    const remaining = 5 - createAttachments.length;
    if (remaining <= 0) {
      showToast?.({ title: "Attachment Limit", description: "Maximum of 5 files allowed." }, true);
      return;
    }
    const accepted = validFiles.slice(0, remaining).map((file) => {
      const lowerName = file.name.toLowerCase();
      const attachmentType = createClientType === "Parent"
        ? (lowerName.includes("id") || lowerName.includes("passport") || lowerName.includes("license") ? "valid_id" : "spa")
        : lowerName.includes("receipt") || lowerName.includes("pay") || lowerName.includes("proof")
        ? "receipt"
        : lowerName.includes("clearance")
        ? "clearance"
        : "evidence";
      return { id: `${Date.now()}-${Math.random()}`, file, attachmentType };
    });
    if (validFiles.length > remaining) {
      showToast?.({ title: "Attachment Limit", description: "You can add up to 5 files." }, true);
    }
    setCreateAttachments((current) => [...current, ...accepted]);
  };

  const handleAddAttachments = (event) => {
    processAttachmentFiles(event.target.files);
    event.target.value = "";
  };

  const handleAttachmentDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (createAttachments.length < 5) {
      setIsDraggingAttachment(true);
    }
  };

  const handleAttachmentDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget.contains(e.relatedTarget)) return;
    setIsDraggingAttachment(false);
  };

  const handleAttachmentDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingAttachment(false);
    if (createAttachments.length >= 5) {
      showToast?.({ title: "Attachment Limit", description: "You already have 5 files attached." }, true);
      return;
    }
    const droppedFiles = e.dataTransfer.files;
    if (droppedFiles && droppedFiles.length > 0) {
      processAttachmentFiles(droppedFiles);
    }
  };

  const renderAttachmentPicker = (required = false) => {
    const hasSpa = createAttachments.some((item) => item.attachmentType === "spa");
    const hasValidId = createAttachments.some((item) => item.attachmentType === "valid_id");

    const categories =
      createClientType === "Parent"
        ? [
            { value: "spa", label: "Special Power of Attorney (SPA)" },
            { value: "valid_id", label: "Valid Government ID" },
            { value: "evidence", label: "Supporting Evidence" },
            { value: "receipt", label: "Proof of Payment" },
            { value: "other", label: "Other Document" },
          ]
        : [
            { value: "evidence", label: "Supporting Evidence" },
            { value: "receipt", label: "Proof of Payment / Receipt" },
            { value: "clearance", label: "Clearance Slip" },
            { value: "other", label: "Other Document" },
          ];

    return (
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-gray-700 dark:text-zinc-200">
              {required ? (
                "Authorization Files (SPA & Valid ID)"
              ) : (
                <>Supporting Documents & Attachments <span className="text-gray-400 dark:text-zinc-500 font-normal">(optional)</span></>
              )}
            </label>
            <span className="text-[11px] font-semibold text-pup-maroon dark:text-red-400">
              {createAttachments.length}/5 files
            </span>
          </div>

          {required && (
            <div className="flex items-center gap-2 text-[11px] font-medium">
              <span
                className={cn(
                  "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border text-[11px]",
                  hasSpa
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
                    : "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800"
                )}
              >
                <AppIcon className={cn("text-[10px]", hasSpa ? " Tick01Icon" : " CircleIcon")} />
                SPA Letter
              </span>
              <span
                className={cn(
                  "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border text-[11px]",
                  hasValidId
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
                    : "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800"
                )}
              >
                <AppIcon className={cn("text-[10px]", hasValidId ? " Tick01Icon" : " CircleIcon")} />
                Government ID
              </span>
            </div>
          )}
        </div>

        <FileAttachmentDropzone
          value={createAttachments}
          onChange={(val) => {
            if (typeof val === "function") {
              setCreateAttachments((prev) => val(prev));
            } else {
              setCreateAttachments(val || []);
            }
          }}
          mode="multiple"
          maxFiles={5}
          categories={categories}
          title={
            required
              ? "Drag and drop SPA letter & government ID here, or browse"
              : "Drag and drop supporting files here, or browse"
          }
          subtitle="Supports PDF, PNG, JPG, or WEBP up to 10 MB each (maximum 5 files)."
          accept="application/pdf,image/png,image/jpeg,image/webp"
        />
      </div>
    );
  };

  const selectCreateClientType = (clientType) => {
    setCreateClientType(clientType);
    setCreateStudentNo("");
    setCreateCourseCode("");
    setCreateRequesterName("");
    setCreateRequesterRelationship("Mother");
    setCreateRequesterContact("");
    setCreateAttachments([]);
    setSelectedStudent(null);
  };

  const totalPages = Math.max(1, Math.ceil(total / itemsPerPage));

  const displayedRows = useMemo(() => {
    return rows.filter((r) => {
      if (charterFilters.length > 0) {
        const charter = getRequestCharterStatus(r, slaStandards);
        if (!charterFilters.includes(charter.status)) return false;
      }

      return filterRules.every((rule) => {
        let actual = "";
        if (rule.fieldKey === "status") {
          actual = r.status;
        } else if (rule.fieldKey === "doc_type") {
          actual = r.doc_type;
        } else if (rule.fieldKey === "client_type") {
          actual = r.client_type || (r.is_alumni ? "Alumni" : "Student");
        } else if (rule.fieldKey === "charter") {
          const charter = getRequestCharterStatus(r, slaStandards);
          actual = charter.status;
        } else {
          actual = r[rule.fieldKey];
        }

        const ruleVal = String(rule.value || "").toLowerCase();
        const actVal = String(actual || "").toLowerCase();

        if (rule.operator === "is_not") {
          return actVal !== ruleVal;
        }
        return actVal === ruleVal;
      });
    });
  }, [rows, filterRules, charterFilters, slaStandards]);

  const clientTypeValue = clientTypeFilters.length === 1 ? clientTypeFilters[0] : "";
  const handleClientTypeChange = (val) => {
    setClientTypeFilters(val ? [val] : []);
    setPage(1);
  };

  const handleKanbanDrop = async (item, targetStatus) => {
    if (item.status === targetStatus) return;
    if (!canTransitionRequestStatus(item.status, targetStatus)) {
      showToast?.({
        title: "Transition Not Allowed",
        description: `Cannot move request #${item.id} from ${item.status} to ${targetStatus}.`,
        variant: "destructive",
      });
      return;
    }

    try {
      const res = await fetch(`/api/document-requests/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: targetStatus }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) throw new Error(json?.error || "Status update failed");
      showToast?.({
        title: "Status Updated",
        description: `Request #${item.id} moved to ${targetStatus}.`,
      });
      loadList({ showLoading: false });
    } catch (err) {
      showToast?.(
        formatErrorMessage(err, {
          title: "Status Update Failed",
          actionContext: `Moving request #${item.id} to ${targetStatus}`,
        }),
        true
      );
    }
  };

  const {
    containerRef: tableContainerRef,
    isScrolledX,
    scrollLeft,
    scrollRight,
    resetScroll,
  } = useTableScroll([displayedRows.length]);

  useEffect(() => {
    resetScroll();
  }, [page, q, statusFilters, docTypeFilters, clientTypeFilters, charterFilters, filterRules, resetScroll]);

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
      label: "Processing Time",
      options: [
        { value: "OnTrack", label: "On Schedule", indicatorColor: "bg-emerald-500" },
        { value: "DueSoon", label: "Due Today", indicatorColor: "bg-amber-500" },
        { value: "Overdue", label: "Past Due", indicatorColor: "bg-rose-500" },
        { value: "Compliant", label: "On Time", indicatorColor: "bg-emerald-600" },
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
  }, [setPage]);

  const handleClearFilters = useCallback(() => {
    setQ("");
    setFilterRules([]);
    setStatusFilters([]);
    setClientTypeFilters([]);
    setDocTypeFilters([]);
    setCharterFilters([]);
    setPage(1);
  }, [setPage]);

  const activeChips = useMemo(() => {
    const chips = [];
    if (q.trim()) {
      chips.push({
        id: "search",
        label: `Search: ${q.trim()}`,
        onRemove: () => { setQ(""); setPage(1); },
      });
    }
    filterRules.forEach((rule) => {
      const field = filterFields.find((f) => f.key === rule.fieldKey);
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
        label: `Status: ${st === "InProgress" ? "In Progress" : st}`,
        onRemove: () => { setStatusFilters((prev) => prev.filter((s) => s !== st)); setPage(1); },
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
      const label = cf === "OnTrack" ? "On Schedule" : cf === "DueSoon" ? "Due Today" : cf === "Overdue" ? "Past Due" : cf === "Compliant" ? "On Time" : cf;
      chips.push({
        id: `charter-${cf}`,
        label: `Processing Time: ${label}`,
        onRemove: () => { setCharterFilters((prev) => prev.filter((c) => c !== cf)); setPage(1); },
      });
    });
    return chips;
  }, [q, filterRules, filterFields, statusFilters, docTypeFilters, charterFilters, setPage]);

  return (
    <TooltipProvider delayDuration={200}>
      <div className="font-jakarta w-full flex flex-[1_0_auto] flex-col h-auto gap-6 focus:outline-none animate-fade-up">
        {/* ONE Single Card Container encapsulating Header, Toolbar, Active Filters, Table & Pagination */}
        <Card className="flex flex-[1_0_auto] h-auto w-full flex-col p-0 gap-0 overflow-hidden rounded-2xl border border-border bg-white shadow-sm dark:border-border dark:bg-card dark:shadow-none isolate font-jakarta">
          {/* 1. Page Header */}
          <PageHeader
            icon="InboxIcon"
            title={
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span>Document Requests</span>
                <span className="text-[11px] font-normal tracking-normal text-gray-500 dark:text-zinc-400 tabular-nums">
                  {total.toLocaleString()} records
                </span>
              </div>
            }
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
                  className="h-9 w-9"
                />

                <Button
                  type="button"
                  onClick={() => setCreateOpen(true)}
                  title="Create Document Request"
                  className="h-9 shrink-0 px-4 text-xs font-semibold rounded-xl cursor-pointer disabled:opacity-50"
                >
                  Create Request
                </Button>
              </div>
            }
          />

          {/* 2. Connected Segmented Tabs Row (Client Type Scope & View Mode Switcher) */}
          <div
            role="group"
            aria-label="Requests client type and view mode"
            className="flex items-center justify-between px-6 py-2.5 border-t border-border dark:border-white/10 bg-white dark:bg-card overflow-x-auto scrollbar-none gap-4"
          >
            {/* Left: Client Type Tabs */}
            <SegmentedControl
              value={clientTypeValue}
              onValueChange={handleClientTypeChange}
              variant="capsule"
              className="inline-grid grid-flow-col auto-cols-fr shrink-0"
              items={[
                { value: "", label: "All Requests" },
                { value: "Student", label: "Students" },
                { value: "Alumni", label: "Alumni" },
                { value: "Parent", label: "Parent / Guardian" },
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

          {/* 3. Navigation Toolbar */}
          {!error && (
            <DataViewToolbar
              label="Document request search, filters, sorting, grouping, and columns"
              className="border-t border-border dark:border-border p-4 sm:px-5 sm:py-3 gap-2 bg-white dark:bg-card flex flex-wrap items-center justify-between"
            >
              {/* Left Group */}
              <div className="flex min-w-0 items-center gap-2">
                <DashboardSearch
                  value={q}
                  onChange={(val) => {
                    setQ(val);
                    setPage(1);
                  }}
                  count={total}
                  loading={loading}
                  label="Search requests"
                  placeholder="Search student, name, program..."
                />
                {viewMode === "table" && (
                  <TableScrollControls
                    scrollContainerRef={tableContainerRef}
                    isScrolledX={isScrolledX}
                    onResetScroll={resetScroll}
                    onScrollLeft={() => scrollLeft(400)}
                    onScrollRight={() => scrollRight(400)}
                    controlSize="md"
                  />
                )}
              </div>

              {/* Right Group: Reused UI components */}
              <div className="ml-auto flex shrink-0 items-center gap-2">
                <FilterPopover
                  fields={filterFields}
                  filters={filterRules}
                  onFiltersChange={(newRules) => {
                    setFilterRules(newRules);
                    setPage(1);
                  }}
                  entityLabel="requests"
                />
                <SortPopover
                  options={sortOptions}
                  sortBy={sortBy}
                  onSortByChange={(val) => {
                    setSortBy(val);
                    setSortOrder("DESC");
                  }}
                  sortOrder={sortOrder}
                  onSortOrderChange={setSortOrder}
                />
                <GroupPopover
                  options={groupOptions}
                  groupBy={groupBy}
                  onGroupByChange={setGroupBy}
                />
                {viewMode === "table" && (
                  <ColumnsPopover
                    columns={tableColumns}
                    visibleColumns={visibleColumns}
                    onVisibleColumnsChange={setVisibleColumns}
                    minVisible={2}
                  />
                )}
              </div>
            </DataViewToolbar>
          )}

          {/* 4. Active Filter Chips Row */}
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

          {/* 4. Full-Width Table Body */}
          <div className={cn("w-full flex flex-col flex-[1_0_auto] border-t border-border dark:border-border", total === 0 && "rounded-b-2xl overflow-hidden")}>
            {(loading && rows.length === 0 && !isManualLoading) ? (
              <DocumentRequestsTableSkeleton rowCount={itemsPerPage} embedded={true} />
            ) : error ? (
              <div className="rounded-b-2xl flex-1 flex flex-col items-center justify-center">
                <Empty>
                  <EmptyHeader>
                    <EmptyMedia className="text-red-600 dark:text-red-400"><EmptyAlertCircleIcon size="1em" /></EmptyMedia>
                    <EmptyTitle>Could Not Load Requests</EmptyTitle>
                    <EmptyDescription>
                      {error}
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              </div>
            ) : displayedRows.length === 0 ? (
              <div className="rounded-b-2xl flex-1 flex flex-col items-center justify-center min-h-[420px] w-full">
                <Empty>
                  <EmptyHeader>
                    <EmptyMedia><EmptySearch01Icon size="1em" /></EmptyMedia>
                    <EmptyTitle>No Document Requests Found</EmptyTitle>
                    <EmptyDescription>
                      {activeChips.length > 0
                        ? "No document requests match your active filters or search terms."
                        : clientTypeFilters.includes("Alumni") && !clientTypeFilters.includes("Student")
                        ? "No document requests found matching your filters."
                        : clientTypeFilters.includes("Student") && !clientTypeFilters.includes("Alumni")
                        ? "No student requests found matching your filters."
                        : "There are currently no document requests filed in the system."}
                    </EmptyDescription>
                  </EmptyHeader>
                  <EmptyContent>
                    {activeChips.length > 0 ? (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleClearFilters}
                        title="Reset Filters"
                        className="flex h-9 items-center justify-center rounded-xl border border-border dark:border-border bg-white dark:bg-zinc-800 px-4 text-xs font-semibold text-gray-700 dark:text-zinc-200 shadow-xs transition-all hover:bg-gray-50 dark:hover:bg-zinc-700 active:scale-95 cursor-pointer"
                      >
                        Reset Filters
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        onClick={() => setCreateOpen(true)}
                        title="Create Document Request"
                        className="flex h-9 items-center justify-center px-4 cursor-pointer"
                      >
                        Create Request
                      </Button>
                    )}
                  </EmptyContent>
                </Empty>
              </div>
            ) : viewMode === "list" ? (
              <DocumentRequestRecordList
                items={displayedRows}
                groupBy={groupBy}
                onSelect={openDetail}
                slaStandards={slaStandards}
                statusBadgeClass={statusBadgeClass}
              />
            ) : viewMode === "kanban" ? (
              <DocumentRequestKanbanPipeline
                items={displayedRows}
                onSelectItem={openDetail}
                onDropItem={handleKanbanDrop}
                slaStandards={slaStandards}
                statusBadgeClass={statusBadgeClass}
              />
            ) : (
              <div
                ref={tableContainerRef}
                className="w-full flex-[1_0_auto] overflow-x-auto show-scrollbar pb-2 border-t border-border dark:border-border"
              >
                <Table columns={["identifier", "identifier", { kind: "text", maxWidth: 360 }, "text", "status", "text", "date", "date", "actions"]} className="min-w-[1360px]">
                  <thead className="sticky top-0 z-10 border-b border-border bg-white dark:bg-card backdrop-blur-xs select-none">
                    <tr className="text-left text-xs font-semibold text-gray-500 dark:text-zinc-400 select-none">
                      {visibleColumns.includes("id") && (
                        <th
                          className={cn(
                            "py-2.5 px-4 w-[90px] min-w-[90px] sticky left-0 z-20 bg-white dark:bg-card transition-shadow",
                            isScrolledX && "shadow-[4px_0_12px_-2px_rgba(0,0,0,0.06)] dark:shadow-[4px_0_12px_-2px_rgba(0,0,0,0.4)]"
                          )}
                        >
                          <div className="flex items-center justify-between gap-1">
                            <button
                              type="button"
                              onClick={() => handleSort("id")}
                              className={cn(
                                "group flex items-center transition-colors focus:outline-none cursor-pointer",
                                sortBy === "id" ? "text-gray-900 dark:text-white" : "text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white"
                              )}
                            >
                              <span>ID</span>
                              <SortIndicator column="id" sortBy={sortBy} sortOrder={sortOrder} />
                            </button>
                            {isScrolledX && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  resetScroll();
                                }}
                                title="Reset table scroll"
                                className="w-5 h-5 flex items-center justify-center rounded bg-gray-200/70 hover:bg-gray-300 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-gray-600 dark:text-zinc-300 transition-colors"
                              >
                                <AppIcon className=" ArrowLeft01Icon text-[10px]" />
                              </button>
                            )}
                          </div>
                        </th>
                      )}
                      {visibleColumns.includes("student_no") && (
                        <th className="py-2.5 px-4 w-[150px] min-w-[150px]">
                          <button
                            type="button"
                            onClick={() => handleSort("student_no")}
                            className={cn(
                              "group flex items-center transition-colors focus:outline-none cursor-pointer",
                              sortBy === "student_no" ? "text-gray-900 dark:text-white" : "text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white"
                            )}
                          >
                            <span>Requester ID</span>
                            <SortIndicator column="student_no" sortBy={sortBy} sortOrder={sortOrder} />
                          </button>
                        </th>
                      )}
                      {visibleColumns.includes("student") && (
                        <th className="py-2.5 px-4 w-[280px] min-w-[280px]">
                          <button
                            type="button"
                            onClick={() => handleSort("student")}
                            className={cn(
                              "group flex items-center transition-colors focus:outline-none cursor-pointer",
                              sortBy === "student" ? "text-gray-900 dark:text-white" : "text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white"
                            )}
                          >
                            <span>Requester</span>
                            <SortIndicator column="student" sortBy={sortBy} sortOrder={sortOrder} />
                          </button>
                        </th>
                      )}
                      {visibleColumns.includes("docType") && (
                        <th className="py-2.5 px-4 w-[200px] min-w-[200px]">
                          <button
                            type="button"
                            onClick={() => handleSort("doc_type")}
                            className={cn(
                              "group flex items-center transition-colors focus:outline-none cursor-pointer",
                              sortBy === "doc_type" ? "text-gray-900 dark:text-white" : "text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white"
                            )}
                          >
                            <span>Document Type</span>
                            <SortIndicator column="doc_type" sortBy={sortBy} sortOrder={sortOrder} />
                          </button>
                        </th>
                      )}
                      {visibleColumns.includes("status") && (
                        <th className="py-2.5 px-4 w-[140px] min-w-[140px]">
                          <button
                            type="button"
                            onClick={() => handleSort("status")}
                            className={cn(
                              "group flex items-center transition-colors focus:outline-none cursor-pointer",
                              sortBy === "status" ? "text-gray-900 dark:text-white" : "text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white"
                            )}
                          >
                            <span>Status</span>
                            <SortIndicator column="status" sortBy={sortBy} sortOrder={sortOrder} />
                          </button>
                        </th>
                      )}
                      {visibleColumns.includes("charter") && (
                        <th className="py-2.5 px-4 w-[200px] min-w-[200px]">
                          <span>Processing Time</span>
                        </th>
                      )}
                      {visibleColumns.includes("targetDate") && (
                        <th className="py-2.5 px-4 w-[160px] min-w-[160px]">
                          <span>Target Date</span>
                        </th>
                      )}
                      {visibleColumns.includes("createdAt") && (
                        <th className="py-2.5 px-4 w-[160px] min-w-[160px]">
                          <button
                            type="button"
                            onClick={() => handleSort("created_at")}
                            className={cn(
                              "group flex items-center transition-colors focus:outline-none cursor-pointer",
                              sortBy === "created_at" ? "text-gray-900 dark:text-white" : "text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white"
                            )}
                          >
                            <span>Date Filed</span>
                            <SortIndicator column="created_at" sortBy={sortBy} sortOrder={sortOrder} />
                          </button>
                        </th>
                      )}
                      <th className="py-2.5 px-4 pr-6 text-right w-[80px] min-w-[80px]">
                        <span>Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border dark:divide-border bg-white dark:bg-card">
                    {displayedRows.map((r) => {
                        const isAlumni = r.client_type === "Alumni";
                        const isParent = r.client_type === "Parent";
                        const charter = getRequestCharterStatus(r, slaStandards);

                        return (
                          <tr
                            key={r.id}
                            selected={selectedId === r.id}
                            className={cn(
                              "group cursor-pointer transition-colors hover:bg-gray-50/70 dark:hover:bg-zinc-800/40 select-none",
                              selectedId === r.id && "bg-blue-50/60 dark:bg-blue-950/20"
                            )}
                            onClick={() => openDetail(r.id)}
                          >
                            {visibleColumns.includes("id") && (
                              <td
                                className={cn(
                                  "py-2.5 px-4 align-middle text-xs font-sans tabular-nums text-gray-500 dark:text-zinc-400 whitespace-nowrap sticky left-0 z-10 bg-white group-hover:bg-gray-50/70 dark:bg-card dark:group-hover:bg-zinc-800/40 transition-shadow border-r border-border/70",
                                  selectedId === r.id && "bg-blue-50/60 dark:bg-blue-950/20",
                                  isScrolledX && "shadow-[4px_0_12px_-2px_rgba(0,0,0,0.06)] dark:shadow-[4px_0_12px_-2px_rgba(0,0,0,0.4)]"
                                )}
                              >
                                #{r.id}
                              </td>
                            )}
                            {visibleColumns.includes("student_no") && (
                              <td className="py-2.5 px-4 align-middle whitespace-nowrap border-r border-border/70 dark:border-border/70">
                                {r.student_no ? (
                                  <IdentifierBadge>
                                    {r.student_no}
                                  </IdentifierBadge>
                                ) : (
                                  <span className="italic text-xs text-amber-600 dark:text-amber-400">No Student ID</span>
                                )}
                              </td>
                            )}
                            {visibleColumns.includes("student") && (
                              <td className="py-2.5 px-4 align-middle overflow-hidden border-r border-border/70 dark:border-border/70">
                                <div className="flex items-center gap-2 min-w-0">
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
                                  {r.course_code && (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 shrink-0">
                                      {r.course_code}
                                    </span>
                                  )}
                                  {Number(r.attachment_count) > 0 && (
                                    <span
                                      className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-400 shrink-0 tabular-nums"
                                      title={`${r.attachment_count} attachment(s)`}
                                    >
                                      {r.attachment_count} att.
                                    </span>
                                  )}
                                </div>
                              </td>
                            )}
                            {visibleColumns.includes("docType") && (
                              <td className="py-2.5 px-4 align-middle overflow-hidden border-r border-border/70 dark:border-border/70">
                                <div className="inline-flex max-w-full items-center justify-center rounded-full bg-gray-100 px-2.5 py-0.5 text-[11px] font-semibold text-gray-800 dark:bg-zinc-800 dark:text-zinc-200">
                                  <span className="truncate" title={r.doc_type}>
                                    {r.doc_type}
                                  </span>
                                </div>
                              </td>
                            )}
                            {visibleColumns.includes("status") && (
                              <td className="py-2.5 px-4 align-middle whitespace-nowrap border-r border-border/70 dark:border-border/70">
                                <div className={cn("inline-flex w-fit items-center justify-center rounded-full px-2.5 py-0.5 text-[11px] font-medium tracking-[0.04em] whitespace-nowrap", statusBadgeClass(r.status))}>
                                  {r.status === "InProgress" ? "In Progress" : r.status === "PendingPayment" ? "Pending Payment" : r.status}
                                </div>
                              </td>
                            )}
                            {visibleColumns.includes("charter") && (
                              <td className="py-2.5 px-4 align-middle overflow-hidden border-r border-border/70 dark:border-border/70">
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium whitespace-nowrap shrink-0", charter.tier.badgeClass)}>
                                    {charter.tier.shortLabel}
                                  </span>
                                  <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap shrink-0", charter.badgeClass)}>
                                    {charter.label}
                                  </span>
                                </div>
                              </td>
                            )}
                            {visibleColumns.includes("targetDate") && (
                              <td className="py-2.5 px-4 align-middle text-xs font-normal text-gray-600 dark:text-zinc-300 tabular-nums whitespace-nowrap border-r border-border/70 dark:border-border/70" title={`Target: ${charter.deadlineFormatted}`}>
                                {charter.deadlineFormatted}
                              </td>
                            )}
                            {visibleColumns.includes("createdAt") && (
                              <td className="py-2.5 px-4 align-middle text-xs font-normal text-gray-600 dark:text-zinc-400 tabular-nums whitespace-nowrap border-r border-border/70 dark:border-border/70">
                                {formatPHDateTime(r.created_at)}
                              </td>
                            )}
                            <td className="py-2.5 px-4 pr-6 align-middle text-right">
                              <div className="flex items-center justify-end" onClick={(e) => e.stopPropagation()}>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <button
                                      type="button"
                                      onClick={() => openDetail(r.id)}
                                      aria-label="Inspect Request Details"
                                      className="table-action-button rounded-lg active:scale-95 cursor-pointer"
                                    >
                                      <ViewIcon size="1em" className="text-[16px]" />
                                    </button>
                                  </TooltipTrigger>
                                  <TooltipContent>Inspect Request</TooltipContent>
                                </Tooltip>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </Table>
              </div>
            )}
          </div>

          {/* 5. Apple HIG Pagination Footer (Table & List views only) */}
          {viewMode !== "kanban" && (
            <TablePagination label="Document request pages" page={page} pageSize={itemsPerPage} totalCount={total} displayedCount={rows.length} onPageChange={setPage} onPageSizeChange={setItemsPerPage} loading={loading} />
          )}
        </Card>

        {/* 6. Request Detail Sheet Slide-Over Drawer */}
        {(() => {
          const selectedIndex = rows.findIndex((r) => r.id === selectedId);
          return (
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
              currentIndex={selectedIndex}
              totalCount={rows.length}
              onNavigatePrev={() => {
                if (selectedIndex > 0) {
                  openDetail(rows[selectedIndex - 1].id);
                }
              }}
              onNavigateNext={() => {
                if (selectedIndex >= 0 && selectedIndex < rows.length - 1) {
                  openDetail(rows[selectedIndex + 1].id);
                }
              }}
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
          );
        })()}

        {/* 7. Dialog: Create Request */}
        <Dialog open={createOpen} onOpenChange={handleCreateOpenChange}>
          <DialogContent className="w-full max-w-4xl sm:max-w-4xl overflow-hidden rounded-2xl border border-border bg-white p-0 shadow-2xl dark:border-border dark:bg-card flex flex-col gap-0 max-h-[92vh]">
            <DialogHeader className="p-6 pb-0 text-left shrink-0">
              <div className="flex items-start gap-4">
                <div className="min-w-0 pr-8">
                  <DialogTitle>
                    New Document Request
                  </DialogTitle>
                  <DialogDescription className="mt-1">
                    Initiate an official document issuance request for a current student, alumnus, or parent/guardian.
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <form ref={attachForm} onSubmit={handleCreate} className="flex flex-col flex-1 min-h-0 overflow-hidden">
              <div className="p-6 md:p-8 space-y-6 overflow-y-auto max-h-[calc(92vh-140px)]">
                {/* Client Type Selector */}
                <div>
                  <label className="text-xs font-semibold text-gray-700 dark:text-zinc-200 block mb-2">
                    Client Type
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <button
                      type="button"
                      onClick={() => selectCreateClientType("Student")}
                      className={cn(
                        "h-11 px-4 text-xs font-semibold rounded-xl border transition-all cursor-pointer flex items-center justify-center gap-2",
                        createClientType === "Student"
                          ? "border-gray-950 dark:border-white bg-gray-100/80 dark:bg-zinc-800 text-gray-950 dark:text-zinc-50 shadow-xs ring-1 ring-black/10 dark:ring-white/20"
                          : "border-border dark:border-border bg-white dark:bg-zinc-900/40 text-gray-700 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-800/60"
                      )}
                    >
                      <StudentIcon size="1em" className="text-base" />
                      <span>Current Student</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => selectCreateClientType("Alumni")}
                      className={cn(
                        "h-11 px-4 text-xs font-semibold rounded-xl border transition-all cursor-pointer flex items-center justify-center gap-2",
                        createClientType === "Alumni"
                          ? "border-gray-950 dark:border-white bg-gray-100/80 dark:bg-zinc-800 text-gray-950 dark:text-zinc-50 shadow-xs ring-1 ring-black/10 dark:ring-white/20"
                          : "border-border dark:border-border bg-white dark:bg-zinc-900/40 text-gray-700 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-800/60"
                      )}
                    >
                      <GraduationScrollIcon size="1em" className="text-base" />
                      <span>Alumni / Former Student</span>
                    </button>
                    {String(officeId).toLowerCase() === "registrar" && (
                      <button
                        type="button"
                        onClick={() => selectCreateClientType("Parent")}
                        className={cn(
                          "h-11 px-4 text-xs font-semibold rounded-xl border transition-all cursor-pointer flex items-center justify-center gap-2",
                          createClientType === "Parent"
                            ? "border-gray-950 dark:border-white bg-gray-100/80 dark:bg-zinc-800 text-gray-950 dark:text-zinc-50 shadow-xs ring-1 ring-black/10 dark:ring-white/20"
                            : "border-border dark:border-border bg-white dark:bg-zinc-900/40 text-gray-700 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-800/60"
                        )}
                      >
                        <UserSearch01Icon size="1em" className="text-base" />
                        <span>Parent / Guardian</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Form fields for Student vs Alumni */}
                {createClientType !== "Alumni" ? (
                  selectedStudent ? (
                    <div className="rounded-xl border border-red-100 bg-red-50/50 p-4 relative animate-in fade-in zoom-in-95 duration-fast dark:border-border dark:bg-red-950/20">
                      <button
                        type="button"
                        className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 transition-colors bg-white hover:bg-gray-100 border border-border rounded-full w-6 h-6 flex items-center justify-center shadow-xs dark:bg-zinc-800 dark:border-border dark:text-zinc-300 cursor-pointer"
                        onClick={() => {
                          setSelectedStudent(null);
                          setCreateStudentNo("");
                        }}
                        title="Change student"
                      >
                        <Cancel01Icon size="1em" className="text-xs" />
                      </button>
                      <div className="flex items-start gap-3.5">
                        <div className="w-11 h-11 rounded-xl bg-pup-maroon/10 text-pup-maroon flex items-center justify-center shrink-0 dark:bg-pup-maroon/20">
                          <UserStatusIcon size="1em" className="text-xl" />
                        </div>
                        <div className="min-w-0 flex-1 pr-6">
                          <div className="font-semibold text-gray-900 text-sm truncate dark:text-zinc-50">{selectedStudent.name}</div>
                          <div className="text-xs text-gray-500 font-sans tabular-nums mt-0.5 dark:text-zinc-400">{selectedStudent.studentNo || selectedStudent.student_no}</div>
                          <div className="text-xs text-gray-600 mt-1.5 flex flex-wrap gap-x-4 gap-y-1 dark:text-zinc-300">
                            <span>Course: <strong className="text-gray-800 dark:text-zinc-100">{selectedStudent.courseCode || selectedStudent.course_code || "N/A"}</strong></span>
                            <span>Section: <strong className="text-gray-800 dark:text-zinc-100">{selectedStudent.section || "N/A"}</strong></span>
                            <span>Year: <strong className="text-gray-800 dark:text-zinc-100">{selectedStudent.yearLevel || selectedStudent.year_level || "N/A"}</strong></span>
                          </div>
                          <div className="text-xs text-pup-maroon dark:text-red-400 font-semibold mt-2 flex items-center gap-1.5">
                            <Archive01Icon size="1em" className="text-sm" />
                            <span>Storage: Room {selectedStudent.room} · Cabinet {selectedStudent.cabinet} · Drawer {selectedStudent.drawer}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="relative">
                        <label className="text-xs font-semibold text-gray-700 dark:text-zinc-200 block mb-1.5">
                          Search Student (Name or Number)
                        </label>
                        <div className="relative group">
                          <Search01Icon size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 z-10 text-gray-400 dark:text-zinc-500 transition-colors group-focus-within:text-pup-maroon dark:group-focus-within:text-red-400" />
                          <Input
                            className="pl-9 h-10 bg-white dark:bg-zinc-800 border border-border dark:border-border rounded-xl text-gray-900 dark:text-zinc-100 placeholder:text-gray-400 dark:placeholder:text-zinc-500 shadow-none focus-visible:outline-none focus-visible:border-pup-maroon focus-visible:ring-1 focus-visible:ring-pup-maroon dark:focus-visible:border-red-500/80 dark:focus-visible:ring-red-500/80"
                            value={studentSearch}
                            onChange={(e) => setStudentSearch(e.target.value)}
                            placeholder="Type to search by name or number..."
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
                                  className="w-full text-left px-3.5 py-2.5 border-b last:border-b-0 border-border hover:bg-red-50/50 transition-colors group flex flex-col gap-0.5 dark:border-border dark:hover:bg-zinc-800/50 cursor-pointer"
                                  onClick={() => {
                                    setSelectedStudent(s);
                                    setCreateStudentNo(sn);
                                    setStudentSearch("");
                                  }}
                                >
                                  <div className="text-sm font-semibold text-gray-900 dark:text-zinc-100 group-hover:text-pup-maroon dark:group-hover:text-red-400 transition-colors">
                                    {s?.name}
                                  </div>
                                  <div className="text-[11px] text-gray-600 dark:text-zinc-300 flex items-center gap-1.5">
                                    <span className="font-sans tabular-nums">{sn}</span>
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
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="text-xs font-semibold text-gray-700 dark:text-zinc-200">
                            {createClientType === "Parent" ? "Student Number" : "Or Enter Student Number"}
                          </label>
                          <span className="text-[10px] text-gray-400 font-medium">Use a registered student number</span>
                        </div>
                        <Input
                          className="h-10 bg-white dark:bg-zinc-800 border border-border dark:border-border rounded-xl text-gray-900 dark:text-zinc-100 placeholder:text-gray-400 dark:placeholder:text-zinc-500 shadow-none focus-visible:outline-none focus-visible:border-pup-maroon focus-visible:ring-1 focus-visible:ring-pup-maroon dark:focus-visible:border-red-500/80 dark:focus-visible:ring-red-500/80"
                          value={createStudentNo}
                          onChange={(e) => setCreateStudentNo(e.target.value)}
                          placeholder="202X-XXXXX-SJ-0"
                        />
                      </div>
                    </div>
                  )
                ) : (
                  /* Alumni Fields */
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-fade-up">
                    <div>
                      <label className="text-xs font-semibold text-gray-700 dark:text-zinc-200 block mb-1.5">
                        Alumni Full Name
                      </label>
                      <Input
                        className="h-10 bg-white dark:bg-zinc-800 border border-border dark:border-border rounded-xl text-gray-900 dark:text-zinc-100 placeholder:text-gray-400 dark:placeholder:text-zinc-500 shadow-none focus-visible:outline-none focus-visible:border-pup-maroon focus-visible:ring-1 focus-visible:ring-pup-maroon dark:focus-visible:border-red-500/80 dark:focus-visible:ring-red-500/80"
                        value={createRequesterName}
                        onChange={(e) => setCreateRequesterName(e.target.value)}
                        placeholder="e.g. Maria Santos"
                        required
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-gray-700 dark:text-zinc-200 block mb-1.5">
                        Academic Program / Degree
                      </label>
                      <Select
                        className="h-10 w-full rounded-xl border border-border bg-white px-3 text-xs font-normal shadow-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-pup-maroon focus-visible:border-pup-maroon dark:focus-visible:border-red-500/80 dark:focus-visible:ring-red-500/80 dark:bg-zinc-800 dark:border-border"
                        value={createCourseCode}
                        onChange={(e) => setCreateCourseCode(e.target.value)}
                        required={!createStudentNo.trim()}
                      >
                        <option value="">Select Degree Program…</option>
                        {courses.map((c) => (
                          <option key={c.code || c.id} value={c.code}>
                            {c.code} {c.name ? `: ${c.name}` : ""}
                          </option>
                        ))}
                      </Select>
                      <span className="text-[11px] text-gray-500 dark:text-zinc-400 mt-1 block">
                        Required when the student number is unavailable.
                      </span>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-semibold text-gray-700 dark:text-zinc-200">
                          Student Number {createCourseCode ? <span className="text-gray-400 dark:text-zinc-500 font-normal">(optional)</span> : ""}
                        </label>
                        <span className="text-[10px] text-gray-400 font-medium">If remembered</span>
                      </div>
                      <Input
                        className="h-10 bg-white dark:bg-zinc-800 border border-border dark:border-border rounded-xl text-gray-900 dark:text-zinc-100 placeholder:text-gray-400 dark:placeholder:text-zinc-500 shadow-none focus-visible:outline-none focus-visible:border-pup-maroon focus-visible:ring-1 focus-visible:ring-pup-maroon dark:focus-visible:border-red-500/80 dark:focus-visible:ring-red-500/80"
                        value={createStudentNo}
                        onChange={(e) => setCreateStudentNo(e.target.value)}
                        placeholder="e.g. 2018-01234-SJ-0"
                      />
                    </div>
                  </div>
                )}

                {/* Parent Notice & Information */}
                {createClientType === "Parent" && String(officeId).toLowerCase() === "registrar" && (
                  <div className="space-y-3.5 rounded-xl border border-amber-200 bg-amber-50/60 p-4 dark:border-amber-900/40 dark:bg-amber-950/20">
                    <div className="flex items-center gap-2">
                      <AppIcon className=" Alert01Icon text-amber-700 dark:text-amber-400 text-base" />
                      <p className="text-xs font-medium text-amber-900 dark:text-amber-200">
                        Parent or guardian requests require the requester&apos;s details and both an SPA / authorization letter and a valid government ID.
                      </p>
                    </div>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                      <div>
                        <label htmlFor="staff-requester-name" className="text-xs font-semibold text-gray-700 dark:text-zinc-200 block mb-1.5">
                          Parent / Guardian Full Name
                        </label>
                        <Input
                          id="staff-requester-name"
                          className="h-10 rounded-xl bg-white dark:bg-zinc-800 border border-border"
                          value={createRequesterName}
                          onChange={(event) => setCreateRequesterName(event.target.value)}
                          placeholder="e.g. Maria Santos"
                          required
                        />
                      </div>
                      <div>
                        <label htmlFor="staff-requester-relationship" className="text-xs font-semibold text-gray-700 dark:text-zinc-200 block mb-1.5">
                          Relationship to Student
                        </label>
                        <Select
                          id="staff-requester-relationship"
                          className="h-10 w-full rounded-xl border border-border bg-white px-3 text-xs dark:bg-zinc-800"
                          value={createRequesterRelationship}
                          onChange={(event) => setCreateRequesterRelationship(event.target.value)}
                          required
                        >
                          <option value="Mother">Mother</option>
                          <option value="Father">Father</option>
                          <option value="Legal Guardian">Legal Guardian</option>
                          <option value="Authorized Representative">Authorized Representative</option>
                        </Select>
                      </div>
                      <div>
                        <label htmlFor="staff-requester-contact" className="text-xs font-semibold text-gray-700 dark:text-zinc-200 block mb-1.5">
                          Contact / Mobile Number <span className="text-gray-400 dark:text-zinc-500 font-normal">(optional)</span>
                        </label>
                        <Input
                          id="staff-requester-contact"
                          className="h-10 rounded-xl bg-white dark:bg-zinc-800 border border-border"
                          value={createRequesterContact}
                          onChange={(event) => setCreateRequesterContact(event.target.value)}
                          placeholder="09171234567"
                          inputMode="tel"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Document Type & Purpose */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-1">
                    <label className="text-xs font-semibold text-gray-700 dark:text-zinc-200 block mb-1.5">
                      Document Type
                    </label>
                    <Select
                      className="h-10 w-full rounded-xl border border-border bg-white px-3 text-xs font-normal shadow-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-pup-maroon focus-visible:border-pup-maroon dark:focus-visible:border-red-500/80 dark:focus-visible:ring-red-500/80 dark:bg-zinc-800 dark:border-border"
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

                  <div className="md:col-span-2">
                    <label htmlFor="staff-request-description" className="text-xs font-semibold text-gray-700 dark:text-zinc-200 block mb-1.5">
                      Description / Purpose
                    </label>
                    <Textarea
                      id="staff-request-description"
                      className="w-full h-10 min-h-[40px] max-h-[100px] resize-none"
                      value={createNotes}
                      onChange={(e) => setCreateNotes(e.target.value)}
                      placeholder="Provide the purpose of this request (at least 5 characters)…"
                      minLength={5}
                      maxLength={1000}
                      required
                    />
                    <p className="mt-1 text-[11px] text-gray-500 dark:text-zinc-400">Explain how the requested document will be used.</p>
                  </div>
                </div>

                {/* Supporting Documents & Attachments (Drag & Drop) */}
                {String(officeId).toLowerCase() === "registrar" && renderAttachmentPicker(createClientType === "Parent")}
              </div>

              {/* Dialog Actions */}
              <DialogFooter className="mx-0 mb-0 p-5 md:px-8 flex flex-wrap flex-row items-center justify-end gap-3 shrink-0">
                <CreateAnotherToggle checked={repeat.createAnother} onCheckedChange={repeat.setCreateAnother} disabled={submitting} savedCount={repeat.savedCount} />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-9 px-4 text-xs font-semibold rounded-xl border border-border dark:border-border bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-xs cursor-pointer active:scale-95 transition-all"
                  onClick={() => handleCreateOpenChange(false)}
                  disabled={submitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  className="px-4 h-9 cursor-pointer disabled:opacity-50 gap-2 flex items-center"
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <Loading01Icon size="1em" className="animate-spin text-sm" />
                      Creating Request…
                    </>
                  ) : (
                    "Create Request"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* 8. Dialog: No Digital Copy Warning */}
        <Dialog open={fileWarningOpen} onOpenChange={setFileWarningOpen}>
          <DialogContent className="sm:max-w-md p-0 overflow-hidden bg-white border border-border shadow-2xl rounded-2xl dark:bg-card dark:border-border">
            <DialogHeader className="p-6 pb-0">
              <div className="min-w-0">
                <DialogTitle>
                  No Digital Copy
                </DialogTitle>
                <DialogDescription className="mt-1">
                  Document not yet scanned. Check physical storage.
                </DialogDescription>
              </div>
            </DialogHeader>
            <NoticeBanner tone="warning" className="mt-4">Check physical file in archives before releasing.</NoticeBanner>
            <div className="p-6 pt-4 space-y-4">
              <div className="space-y-3 text-sm">
                {studentForRequest || detail?.room ? (
                  <div className="rounded-xl p-3 bg-white dark:bg-zinc-800/60 border border-border dark:border-border text-xs font-semibold text-pup-maroon dark:text-red-400">
                    Room {detail?.room || studentForRequest?.room} · Cabinet {detail?.cabinet || studentForRequest?.cabinet} · Drawer {detail?.drawer || studentForRequest?.drawer}
                  </div>
                ) : (
                  <Empty variant="compact">
                    <EmptyHeader>
                      <EmptyMedia className="text-red-600 dark:text-red-400"><EmptyAlertCircleIcon size="1em" /></EmptyMedia>
                      <EmptyTitle>No Mapped Storage Location</EmptyTitle>
                      <EmptyDescription>
                        This requester has no physical drawer assignment.
                      </EmptyDescription>
                    </EmptyHeader>
                  </Empty>
                )}
              </div>
            </div>
            <DialogFooter className="p-6 pt-0 flex items-center justify-end gap-2.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9 px-4 text-xs font-semibold rounded-xl border border-border dark:border-border bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-xs cursor-pointer active:scale-95 transition-all"
                onClick={() => setFileWarningOpen(false)}
              >
                Close
              </Button>

              {studentForRequest || detail?.room ? (
                <Button
                  type="button"
                  size="sm"
                  className="flex h-9 items-center justify-center py-0 px-4 cursor-pointer"
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
                  Locate Drawer
                </Button>
              ) : null}
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Reopen Request Dialog Modal */}
        <Dialog open={reopenModalOpen} onOpenChange={setReopenModalOpen}>
          <DialogContent className="sm:max-w-md p-0 overflow-hidden bg-white border border-border shadow-2xl rounded-2xl dark:bg-card dark:border-border">
            <DialogHeader className="p-6 pb-0 text-left">
              <div className="flex items-center gap-3">
                <div>
                  <DialogTitle>
                    Reopen Document Request
                  </DialogTitle>
                  <DialogDescription className="mt-1">
                    Reopen closed request #{detail?.id} to reactivate workflow and notify the requester.
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="max-h-[65vh] overflow-y-auto p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-zinc-300 mb-1.5">
                  Target Reactivation Status
                </label>
                <Select
                  className="w-full h-10 px-3 text-xs font-medium text-gray-900 dark:text-zinc-100 bg-white dark:bg-zinc-800 border border-border rounded-xl cursor-pointer"
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
                    Written Justification / Reason
                  </label>
                  <span className="text-[11px] text-gray-400">
                    {reopenReason.trim().length}/5 chars min
                  </span>
                </div>
                <Textarea
                  className="w-full min-h-[90px] resize-none"
                  placeholder="State the official reason for reopening (e.g., student appeal granted, payment verified, clerical error correction)..."
                  value={reopenReason}
                  onChange={(e) => setReopenReason(e.target.value)}
                />
              </div>


            </div>

            <NoticeBanner tone="info" className="mb-6">
              Reopening adds an activity-history entry and posts an update on the student portal.
            </NoticeBanner>
            <DialogFooter className="p-6 pt-0 flex items-center justify-end gap-2.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9 px-4 text-xs font-semibold rounded-xl border border-black/[0.06] dark:border-white/[0.08] bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-xs cursor-pointer active:scale-95 transition-all"
                onClick={() => setReopenModalOpen(false)}
                disabled={reopenSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                className="h-9 px-4 cursor-pointer disabled:opacity-50"
                onClick={handleConfirmReopen}
                disabled={reopenSubmitting || reopenReason.trim().length < 5}
              >
                {reopenSubmitting ? "Reopening Request…" : "Reopen Request"}
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
