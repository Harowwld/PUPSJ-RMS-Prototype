"use client";
import { formatRequestStatus } from "@/lib/auditLogFormatting";
import ProfileAvatar from "@/components/shared/ProfileAvatar";
import DataGroupHeader from "@/components/shared/DataGroupHeader";
import { BADGE_BASE, BADGE_PALETTES, COMPACT_BADGE_BASE } from "@/lib/badgeStyles";

import { Table, IdentifierBadge } from "@/components/ui/table";
import TablePagination from "@/components/shared/TablePagination";
import { Textarea } from "@/components/ui/textarea";
import NoticeBanner from "@/components/shared/NoticeBanner";
import CreateAnotherToggle from "@/components/shared/CreateAnotherToggle";
import useCreateAnother from "@/hooks/useCreateAnother";

import useUrlPage from "@/hooks/useUrlPage";
import useOsasViewPreference from "@/hooks/useOsasViewPreference";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import DataContentSkeleton from "@/components/shared/DataContentSkeleton";
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
import DocumentRequestRecordList, { groupDocumentRequests } from "@/components/staff/requests/DocumentRequestRecordList";
import { fetchAllPages } from "@/lib/fetchAllPages";
import DocumentRequestKanbanPipeline, { ODRS_KANBAN_COLUMNS } from "@/components/staff/requests/DocumentRequestKanbanPipeline";
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
import { DateRangeFilterButton } from "@/components/shared/DateRangePickerModal";
import useTableScroll from "@/hooks/useTableScroll";
import FileAttachmentDropzone from "@/components/shared/FileAttachmentDropzone";
import { formatErrorMessage } from "@/lib/errorUtils";
import {
  ALLOWED_STATUS_TRANSITIONS,
  TERMINAL_REQUEST_STATUSES,
  ALLOWED_REOPEN_TRANSITIONS,
  canTransitionRequestStatus,
} from "@/lib/constants";
import {
  getRequestCharterStatus,
} from "@/lib/citizenCharter";
import { AlertCircleIcon as EmptyAlertCircleIcon, Search01Icon as EmptySearch01Icon , ArrowDown01Icon, ArrowUp01Icon, ArrowUpDownIcon, Attachment01Icon, Cancel01Icon, Clock01Icon, File02Icon, GraduationScrollIcon, IdentityCardIcon, Loading01Icon, StudentIcon, UserSearch01Icon, UserStatusIcon, ViewIcon, Search01Icon, Tick01Icon} from "hugeicons-react";
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
  onLocateOnMap,
  showToast,
  error = null,
  officeId = "registrar",
}) {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [listError, setListError] = useState("");
  const listRequest = useRef(0);
  const [isManualLoading, setIsManualLoading] = useState(false);
  const [q, setQ] = useOsasViewPreference("document_requests", "search", "");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [statusFilters, setStatusFilters] = useOsasViewPreference("document_requests", "statusFilters", []);
  const [clientTypeFilters, setClientTypeFilters] = useOsasViewPreference("document_requests", "clientTypeFilters", []);
  const [docTypeFilters, setDocTypeFilters] = useOsasViewPreference("document_requests", "docTypeFilters", []);
  const [charterFilters, setCharterFilters] = useOsasViewPreference("document_requests", "charterFilters", []);
  const [slaStandards, setSlaStandards] = useState(null);
  const [page, setPage] = useUrlPage();
  const [itemsPerPage, setItemsPerPage] = useOsasViewPreference("document_requests", "pageSize", 20);
  const [sortBy, setSortBy] = useOsasViewPreference("document_requests", "sortBy", "created_at");
  const [sortOrder, setSortOrder] = useOsasViewPreference("document_requests", "sortOrder", "DESC");

  const [viewMode, setViewMode] = useOsasViewPreference("document_requests", "viewMode", "table", {
    legacyKey: "pup_doc_requests_view_mode",
  });
  const isKanbanView = viewMode === "kanban";

  const [filterRules, setFilterRules] = useOsasViewPreference("document_requests", "filterRules", []);
  const [startDate, setStartDate] = useOsasViewPreference("document_requests", "startDate", "");
  const [endDate, setEndDate] = useOsasViewPreference("document_requests", "endDate", "");
  const [groupBy, setGroupBy] = useOsasViewPreference("document_requests", "groupBy", "status");
  const activeGroupBy = isKanbanView ? "none" : groupBy;
  const [visibleColumns, setVisibleColumns] = useOsasViewPreference("document_requests", "visibleColumns", [
    "student_no",
    "student",
    "docType",
    "status",
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
    { key: "student_no", label: "Requester ID" },
    { key: "student", label: "Requester" },
    { key: "docType", label: "Document Type" },
    { key: "status", label: "Status" },
    { key: "charter", label: "Processing Time", defaultHidden: true },
    { key: "targetDate", label: "Target Date", defaultHidden: true },
    { key: "createdAt", label: "Date Filed" },
  ], []);

  const dynamicTableColumns = useMemo(() => {
    const columnMap = {
      student_no: { kind: "identifier", width: 170 },
      student: { kind: "text", minWidth: 280, maxWidth: 460, growthWeight: 2 },
      docType: { kind: "category", minWidth: 190, maxWidth: 300, growthWeight: 2 },
      status: { kind: "status", width: 140 },
      charter: { kind: "text", minWidth: 240, maxWidth: 290, growthWeight: 1 },
      targetDate: { kind: "date", width: 150 },
      createdAt: { kind: "date", width: 150 },
    };
    return [
      { kind: "identifier", width: 90 },
      ...tableColumns.filter((c) => visibleColumns.includes(c.key)).map((c) => columnMap[c.key] || "text"),
      "actions",
    ];
  }, [tableColumns, visibleColumns]);

  const tableColumnCount = dynamicTableColumns.length - 1;
  const dynamicTableMinWidthClass = tableColumnCount >= 7 ? "min-w-[1360px]"
    : tableColumnCount >= 6 ? "min-w-[1080px]" : "min-w-[900px]";

  const [createAttempted, setCreateAttempted] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const { attachForm, ...repeat } = useCreateAnother(createOpen);
  const [createClientType, setCreateClientType] = useState("Student");
  const [createStudentNo, setCreateStudentNo] = useState("");
  const [createCourseCode, setCreateCourseCode] = useState("");
  const [createRequesterName, setCreateRequesterName] = useState("");
  const [createRequesterRelationship, setCreateRequesterRelationship] = useState("Mother");
  const [createRequesterContact, setCreateRequesterContact] = useState("");
  const [createAttachments, setCreateAttachments] = useState([]);
  const [createDocType, setCreateDocType] = useState("");
  const [createNotes, setCreateNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [studentSearch, setStudentSearch] = useState("");
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentSuggestions, setStudentSuggestions] = useState([]);
  const [requestStudent, setRequestStudent] = useState(null);
  const [requestDocs, setRequestDocs] = useState(null);

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
    setCreateAttempted(false);
    if (!keepClientType) setCreateClientType("Student");
    setCreateStudentNo("");
    setCreateCourseCode("");
    setCreateRequesterName("");
    setCreateRequesterRelationship("Mother");
    setCreateRequesterContact("");
    setCreateAttachments([]);
    setCreateDocType("");
    setCreateNotes("");
    setStudentSearch("");
    setStudentSuggestions([]);
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

  useEffect(() => {
    const val = studentSearch.trim();
    if (!createOpen || val.length < 2) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/students?q=${encodeURIComponent(val)}&limit=5`, { signal: controller.signal });
        const json = await res.json();
        if (res.ok && json?.ok && !controller.signal.aborted) setStudentSuggestions(json.data || []);
      } catch {
        if (!controller.signal.aborted) setStudentSuggestions([]);
      }
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [createOpen, studentSearch]);


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
        const effectiveLimit = itemsPerPage;
        const offset = isKanbanView ? 0 : (page - 1) * itemsPerPage;
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
        if (startDate) qs.set("startDate", startDate);
        if (endDate) qs.set("endDate", endDate);
        if (activeGroupBy !== "none") qs.set("groupBy", activeGroupBy);
        qs.set("sortBy", sortBy);
        qs.set("sortOrder", sortOrder);
        const requestUrl = `/api/document-requests?${qs}`;
        const res = isKanbanView ? null : await fetch(requestUrl, { cache: "no-store" });
        const json = isKanbanView
          ? { ok: true, data: await fetchAllPages(requestUrl, 200) }
          : await res.json().catch(() => null);
        if (request !== listRequest.current) return;
        if (res?.ok === false || !json?.ok || !Array.isArray(json.data)) {
          throw new Error(json?.error || "Unable to load document requests.");
        }

        if (isManual) {
          loadSlaStandards();
          const elapsed = Date.now() - startTime;
          if (elapsed < 600) {
            await new Promise((resolve) => setTimeout(resolve, 600 - elapsed));
          }
        }

        if (request !== listRequest.current) return;
        setRows(json.data);
        setTotal(isKanbanView ? json.data.length : Number(json.total) || 0);
        setHasLoaded(true);
        setListError("");
      } catch (e) {
        if (request !== listRequest.current) return;
        setListError(e.message || "Unable to load document requests.");
        if (showLoading || isManual) {
          showToast?.(
            formatErrorMessage(e, {
              title: "Requests Load Failed",
              actionContext: "Loading document requests",
            }),
            true
          );
        }
      } finally {
        if (request === listRequest.current) {
          setLoading(false);
          setIsManualLoading(false);
        }
      }
    },
    [isKanbanView, page, itemsPerPage, activeGroupBy, debouncedQ, statusFilters, clientTypeFilters, docTypeFilters, filterRules, startDate, endDate, sortBy, sortOrder, showToast, loadSlaStandards]
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
    setRequestStudent(null);
    setRequestDocs(null);
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

  useEffect(() => {
    if (!detail?.student_no || !detail?.doc_type) return;
    const controller = new AbortController();
    const studentNo = encodeURIComponent(detail.student_no);
    const docType = encodeURIComponent(detail.doc_type);
    Promise.all([
      fetch(`/api/students/${studentNo}`, { signal: controller.signal }),
      fetch(`/api/documents?studentNo=${studentNo}&docType=${docType}&excludeDeclined=1&limit=20`, { signal: controller.signal }),
    ]).then(async ([studentRes, docsRes]) => {
      const [studentJson, docsJson] = await Promise.all([studentRes.json(), docsRes.json()]);
      if (controller.signal.aborted) return;
      setRequestStudent(studentRes.ok && studentJson?.ok ? studentJson.data : null);
      setRequestDocs(docsRes.ok && docsJson?.ok ? docsJson.data || [] : []);
    }).catch(() => {});
    return () => controller.abort();
  }, [detail?.student_no, detail?.doc_type]);

  const studentForRequest = useMemo(() => {
    if (!detail?.student_no) return null;
    const sn = String(detail.student_no).toUpperCase();
    return (
      students.find((s) => String(s.studentNo || "").toUpperCase() === sn) ||
      requestStudent
    );
  }, [detail, students, requestStudent]);

  const availability = useMemo(() => {
    if (!detail?.student_no || !detail?.doc_type || !requestDocs) return null;
    return getDocAvailabilityForType(
      requestDocs,
      detail.student_no,
      detail.doc_type
    );
  }, [detail, requestDocs]);

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
      status: !isTerminalStatus && editStatus !== detail.status ? editStatus : undefined,
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
    setCreateAttempted(true);
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
    if (!requestableTypes.includes(createDocType)) {
      showToast?.({ title: "Missing Document Type", description: "Please select a document type to request." }, true);
      return;
    }
    if (createNotes.trim().length < 5) {
      showToast?.({ title: "Purpose Required", description: "Enter a purpose of at least 5 characters." }, true);
      return;
    }

    const oversized = createAttachments.filter((item) => {
      const f = item.file || item;
      return f && f.size > 10 * 1024 * 1024;
    });
    if (oversized.length > 0) {
      showToast?.(
        {
          title: "File Too Large",
          description: `Attachment "${oversized[0].file?.name || "file"}" exceeds the 10 MB limit. Please remove or replace it.`,
        },
        true
      );
      return;
    }

    if (!repeat.beginSave()) return;
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("clientType", createClientType);
      if (createStudentNo.trim()) formData.append("studentNo", createStudentNo.trim());
      if (createRequesterName.trim()) formData.append("requesterName", createRequesterName.trim());
      if (createClientType === "Parent" && createRequesterRelationship) formData.append("requesterRelationship", createRequesterRelationship);
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
                "Required authorization documents"
              ) : (
                <>Supporting Documents & Attachments <span className="normal-case tracking-normal opacity-70">(optional)</span></>
              )}
            </label>
            <span className="text-[11px] font-semibold text-pup-maroon dark:text-red-400">
              {createAttachments.length}/5 files
            </span>
          </div>

          {required && (
            <div className="flex items-center gap-2 text-[11px] font-medium">
              <span className={cn(COMPACT_BADGE_BASE, BADGE_PALETTES.zinc)}>
                {hasSpa ? <Tick01Icon size={12} aria-label="Attached" /> : <File02Icon size={12} aria-hidden="true" />}
                SPA Letter
              </span>
              <span className={cn(COMPACT_BADGE_BASE, BADGE_PALETTES.zinc)}>
                {hasValidId ? <Tick01Icon size={12} aria-label="Attached" /> : <IdentityCardIcon size={12} aria-hidden="true" />}
                Government ID
              </span>
            </div>
          )}
        </div>

        <FileAttachmentDropzone
          animateCards={false}
          invalid={createAttempted && required && (!hasSpa || !hasValidId)}
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
          maxSizeBytes={10 * 1024 * 1024}
          showToast={showToast}
          categories={categories}
          title={
            required
              ? "Drag and drop SPA letter & government ID here, or browse"
              : "Drag and drop supporting files here, or browse"
          }
          subtitle="Supports PDF, PNG, JPG, or WEBP up to 10 MB each (maximum 5 files)."
          accept="application/pdf,image/png,image/jpeg,image/webp,.pdf,.png,.jpg,.jpeg,.webp"
        />
      </div>
    );
  };

  const requestableTypes = docTypes.filter((type) => typeof type === "string" && type.trim());
  const needsStudentNumber = createClientType !== "Alumni" && !createStudentNo.trim();
  const documentTypeHint = needsStudentNumber
    ? createClientType === "Student"
      ? "Select a student from the search results to choose a document type."
      : "Select a student from the search results or enter a student number to choose a document type."
    : requestableTypes.length === 0 ? "No requestable document types are available for this office." : "";
  const documentTypeField = (
    <div>
      <label htmlFor="staff-request-document-type" className="mb-1.5 block text-xs font-semibold text-gray-700 dark:text-zinc-200">
        Document Type
      </label>
      <Select
        id="staff-request-document-type"
        placeholder={requestableTypes.length ? "Select document type" : "No document types available"}
        aria-describedby={documentTypeHint ? "staff-request-document-type-help" : undefined}
        disabled={needsStudentNumber || requestableTypes.length === 0}
        value={needsStudentNumber ? "" : createDocType}
        onChange={(event) => setCreateDocType(event.target.value)}
        required
      >
        {requestableTypes.map((type) => <option key={type} value={type}>{type}</option>)}
      </Select>
      {documentTypeHint && (
        <p id="staff-request-document-type-help" className="mt-1 text-[11px] text-muted-foreground">
          {documentTypeHint}
        </p>
      )}
    </div>
  );

  const selectCreateClientType = (clientType) => {
    setCreateClientType(clientType);
    setCreateStudentNo("");
    setStudentSearch("");
    setStudentSuggestions([]);
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

  const requestGroups = useMemo(
    () => groupDocumentRequests(displayedRows, activeGroupBy),
    [displayedRows, activeGroupBy],
  );
  const orderedRequests = useMemo(() => requestGroups.flatMap(({ items }) => items), [requestGroups]);

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
        description: `Cannot move request #${item.id} from ${formatRequestStatus(item.status)} to ${formatRequestStatus(targetStatus)}.`,
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
        description: `Request #${item.id} moved to ${formatRequestStatus(targetStatus)}.`,
      });
      loadList({ showLoading: false });
    } catch (err) {
      showToast?.(
        formatErrorMessage(err, {
          title: "Status Update Failed",
          actionContext: `Moving request #${item.id} to ${formatRequestStatus(targetStatus)}`,
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
    setStartDate("");
    setEndDate("");
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
    if (startDate || endDate) {
      chips.push({
        id: "dateRange",
        label: `Range: ${startDate || "..."} to ${endDate || "..."}`,
        onRemove: () => { setStartDate(""); setEndDate(""); setPage(1); },
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
        label: `Status: ${formatRequestStatus(st)}`,
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
  }, [q, filterRules, filterFields, statusFilters, docTypeFilters, charterFilters, startDate, endDate, setPage]);

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
            className="flex items-center justify-between px-6 py-2.5 bg-white dark:bg-card overflow-x-auto scrollbar-none gap-4"
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
                onValueChange={setViewMode}
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
                    setPage(1);
                  }}
                  sortOrder={sortOrder}
                  onSortOrderChange={(value) => { setSortOrder(value); setPage(1); }}
                />
                {viewMode !== "kanban" && (
                  <GroupPopover
                    options={groupOptions}
                    groupBy={groupBy}
                    onGroupByChange={(value) => { setGroupBy(value); setPage(1); }}
                  />
                )}
                {viewMode === "table" && (
                  <ColumnsPopover
                    columns={tableColumns}
                    visibleColumns={visibleColumns}
                    onVisibleColumnsChange={setVisibleColumns}
                    minVisible={2}
                  />
                )}
                <DateRangeFilterButton
                  startDate={startDate}
                  endDate={endDate}
                  onApply={({ startDate: s, endDate: e }) => {
                    setStartDate(s);
                    setEndDate(e);
                    setPage(1);
                  }}
                  onClear={() => {
                    setStartDate("");
                    setEndDate("");
                    setPage(1);
                  }}
                  disableFutureDates={true}
                />
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
          <div className={cn("relative w-full flex flex-col flex-[1_0_auto] border-t border-border dark:border-border", total === 0 && "rounded-b-2xl overflow-hidden")} aria-busy={loading}>
            {(loading && !hasLoaded) ? (
              <DataContentSkeleton columns={dynamicTableColumns} viewMode={viewMode} kanbanColumnCount={ODRS_KANBAN_COLUMNS.length} kanbanColumnClassName="w-[300px]" kanbanViewportClassName="min-h-[calc(100vh-19rem)] p-4 sm:p-5" grouped={activeGroupBy !== "none"} className={dynamicTableMinWidthClass} />
            ) : (listError || error) && displayedRows.length === 0 ? (
              <div className="rounded-b-2xl flex-1 flex flex-col items-center justify-center">
                <Empty>
                  <EmptyHeader>
                    <EmptyMedia className="text-red-600 dark:text-red-400"><EmptyAlertCircleIcon size="1em" /></EmptyMedia>
                    <EmptyTitle>Could Not Load Requests</EmptyTitle>
                    <EmptyDescription>
                      {listError || error}
                    </EmptyDescription>
                  </EmptyHeader>
                  <EmptyContent>
                    <Button variant="outline" size="sm" disabled={loading || isManualLoading} onClick={() => loadList()}>
                      Try Again
                    </Button>
                  </EmptyContent>
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
                <Table columns={dynamicTableColumns} className={dynamicTableMinWidthClass}>
                  <thead className="sticky top-0 z-10 border-b border-border bg-white dark:bg-card backdrop-blur-xs select-none">
                    <tr className="text-left text-xs font-semibold text-gray-500 dark:text-zinc-400 select-none">
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
                        </div>
                      </th>
                      {visibleColumns.includes("student_no") && (
                        <th className="py-2.5 px-4 w-[170px] min-w-[170px]">
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
                        <th className="py-2.5 px-4 min-w-[280px] max-w-[460px]">
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
                        <th className="py-2.5 px-4 w-[200px] min-w-[190px] max-w-[300px]">
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
                        <th className="py-2.5 px-4 w-[240px] min-w-[240px]">
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
                      <th className="w-16 py-2.5 px-3 text-center">
                        <span>Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border dark:divide-border bg-white dark:bg-card">
                    {requestGroups.flatMap((group) => [
                      ...(activeGroupBy === "none" ? [] : [
                        <DataGroupHeader
                          key={`group-${group.key}`}
                          label={group.label}
                          count={group.items.length}
                          colSpan={dynamicTableColumns.length}
                        />,
                      ]),
                      ...group.items.map((r) => {
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
                            <td
                              className={cn(
                                "py-2.5 px-4 align-middle text-xs font-sans tabular-nums text-gray-500 dark:text-zinc-400 whitespace-nowrap sticky left-0 z-10 bg-white group-hover:bg-gray-50/70 dark:bg-card dark:group-hover:bg-zinc-800/40 transition-shadow border-r border-border/70",
                                selectedId === r.id && "bg-blue-50/60 dark:bg-blue-950/20",
                                isScrolledX && "shadow-[4px_0_12px_-2px_rgba(0,0,0,0.06)] dark:shadow-[4px_0_12px_-2px_rgba(0,0,0,0.4)]"
                              )}
                            >
                              {r.id}
                            </td>
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
                              <td className="py-2.5 px-4 align-middle overflow-hidden border-r border-border/70 dark:border-border/70 max-w-[460px]">
                                <div className="flex items-center gap-2 min-w-0">
                                  <span
                                    className="text-[13px] font-semibold text-gray-900 dark:text-zinc-100 group-hover:text-pup-maroon dark:group-hover:text-red-400 transition-colors truncate"
                                    title={formatTitleCase(r.student_name || r.requester_name)}
                                  >
                                    {formatTitleCase(r.student_name || r.requester_name) || "N/A"}
                                  </span>
                                  <span
                                    className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium shrink-0", isParent
                                        ? "bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200/60 dark:border-amber-900/40"
                                        : isAlumni
                                        ? "bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border border-purple-200/50 dark:border-purple-800/30"
                                        : "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200/50 dark:border-blue-800/30", BADGE_BASE)}
                                  >
                                    {isParent ? "Parent/Guardian" : isAlumni ? "Alumni" : "Student"}
                                  </span>
                                  {r.course_code && (
                                    <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 shrink-0", BADGE_BASE)}>
                                      {r.course_code}
                                    </span>
                                  )}
                                  {Number(r.attachment_count) > 0 && (
                                    <span
                                      className={cn("inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-400 shrink-0 tabular-nums", BADGE_BASE)}
                                      title={`${r.attachment_count} attachment(s)`}
                                    >
                                      {r.attachment_count} att.
                                    </span>
                                  )}
                                </div>
                              </td>
                            )}
                            {visibleColumns.includes("docType") && (
                              <td className="py-2.5 px-4 align-middle overflow-hidden border-r border-border/70 dark:border-border/70 max-w-[300px]">
                                <div className={cn("inline-flex max-w-full items-center justify-center rounded-full bg-gray-100 px-2.5 py-0.5 text-[11px] font-semibold text-gray-800 dark:bg-zinc-800 dark:text-zinc-200", BADGE_BASE)}>
                                  <span className="truncate" title={r.doc_type}>
                                    {r.doc_type}
                                  </span>
                                </div>
                              </td>
                            )}
                            {visibleColumns.includes("status") && (
                              <td className="py-2.5 px-4 align-middle whitespace-nowrap border-r border-border/70 dark:border-border/70">
                                <div className={cn("inline-flex w-fit items-center justify-center rounded-full px-2.5 py-0.5 text-[11px] font-medium tracking-[0.04em] whitespace-nowrap", statusBadgeClass(r.status), BADGE_BASE)}>
                                  {formatRequestStatus(r.status)}
                                </div>
                              </td>
                            )}
                            {visibleColumns.includes("charter") && (
                              <td className="py-2.5 px-4 align-middle overflow-hidden border-r border-border/70 dark:border-border/70">
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium whitespace-nowrap shrink-0", charter.tier.badgeClass, BADGE_BASE)}>
                                    {charter.tier.shortLabel}
                                  </span>
                                  <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap shrink-0", charter.badgeClass, BADGE_BASE)}>
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
                            <td className="w-16 py-2.5 px-3 align-middle text-center">
                              <div className="flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
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
                      }),
                    ])}
                  </tbody>
                </Table>
              </div>
            )}
            {loading && hasLoaded && (
              <span role="status" className="sr-only">Loading requests…</span>
            )}
          </div>

          {/* 5. Apple HIG Pagination Footer (Table & List views only) */}
          {viewMode !== "kanban" && total > 0 && rows.length > 0 && (
            <TablePagination label="Document request pages" page={page} pageSize={itemsPerPage} totalCount={total} displayedCount={rows.length} onPageChange={setPage} onPageSizeChange={setItemsPerPage} loading={loading} />
          )}
        </Card>

        {/* 6. Request Detail Sheet Slide-Over Drawer */}
        {(() => {
          const selectedIndex = orderedRequests.findIndex((r) => r.id === selectedId);
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
              totalCount={orderedRequests.length}
              onNavigatePrev={() => {
                if (selectedIndex > 0) {
                  openDetail(orderedRequests[selectedIndex - 1].id);
                }
              }}
              onNavigateNext={() => {
                if (selectedIndex >= 0 && selectedIndex < orderedRequests.length - 1) {
                  openDetail(orderedRequests[selectedIndex + 1].id);
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

            <form ref={attachForm} onInvalid={() => setCreateAttempted(true)} onSubmit={handleCreate} className="flex flex-col flex-1 min-h-0 overflow-hidden">
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
                    <div className="rounded-xl bg-gray-50 p-4 animate-in fade-in zoom-in-95 duration-fast dark:bg-zinc-800/60">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <ProfileAvatar
                            studentNo={createStudentNo}
                            accountId={selectedStudent.accountId || selectedStudent.account_id}
                            avatarFilename={selectedStudent.avatarFilename || selectedStudent.avatar_filename}
                            name={formatTitleCase(selectedStudent.name)}
                            className="size-11"
                            fallbackClassName="text-sm"
                          />
                          <div className="min-w-0">
                            <div className="break-words text-sm font-semibold text-gray-900 dark:text-zinc-50">
                              {formatTitleCase(selectedStudent.name) || "Selected student"}
                            </div>
                            <div className="mt-0.5 text-xs tabular-nums text-muted-foreground">{createStudentNo}</div>
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-xs"
                          aria-label="Change student"
                          title="Change student"
                          onClick={() => {
                            setSelectedStudent(null);
                            setCreateStudentNo("");
                          }}
                        >
                          <Cancel01Icon size={14} aria-hidden="true" />
                        </Button>
                      </div>
                      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 border-t border-border pt-3 text-xs sm:grid-cols-4">
                        <div className="min-w-0">
                          <dt className="text-[11px] text-muted-foreground">Academic program</dt>
                          <dd className="mt-0.5 break-words font-semibold">{selectedStudent.courseCode || selectedStudent.course_code || "Not recorded"}</dd>
                        </div>
                        <div>
                          <dt className="text-[11px] text-muted-foreground">Section</dt>
                          <dd className="mt-0.5 font-semibold">{selectedStudent.section || "Not recorded"}</dd>
                        </div>
                        <div>
                          <dt className="text-[11px] text-muted-foreground">Year level</dt>
                          <dd className="mt-0.5 font-semibold">{selectedStudent.yearLevel || selectedStudent.year_level || "Not recorded"}</dd>
                        </div>
                        <div>
                          <dt className="text-[11px] text-muted-foreground">Storage location</dt>
                          <dd className="mt-0.5 break-words font-semibold">
                            {selectedStudent.room && selectedStudent.cabinet && selectedStudent.drawer
                              ? `Room ${selectedStudent.room}, cabinet ${selectedStudent.cabinet}, drawer ${selectedStudent.drawer}`
                              : "Not assigned"}
                          </dd>
                        </div>
                      </dl>
                    </div>
                  ) : (
                    <div className={cn("grid gap-4", createClientType === "Parent" && "md:grid-cols-2")}>
                      <div className="relative">
                        <label htmlFor="staff-request-student-search" className="text-xs font-semibold text-gray-700 dark:text-zinc-200 block mb-1.5">
                          Find a student
                        </label>
                        <div className="relative group">
                          <Search01Icon size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 z-10 text-gray-400 dark:text-zinc-500 transition-colors group-focus-within:text-pup-maroon dark:group-focus-within:text-red-400" />
                          <Input
                            className="pl-9 h-10 bg-white dark:bg-zinc-800 border border-border dark:border-border rounded-xl text-gray-900 dark:text-zinc-100 placeholder:text-gray-400 dark:placeholder:text-zinc-500 shadow-none focus-visible:outline-none focus-visible:border-pup-maroon focus-visible:ring-1 focus-visible:ring-pup-maroon dark:focus-visible:border-red-500/80 dark:focus-visible:ring-red-500/80"
                            id="staff-request-student-search"
                            value={studentSearch}
                            onChange={(e) => {
                              setStudentSearch(e.target.value);
                              setStudentSuggestions([]);
                            }}
                            placeholder="Search by name or student number"
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
                                    setStudentSuggestions([]);
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

                      {createClientType === "Parent" && (
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <label className="text-xs font-semibold text-gray-700 dark:text-zinc-200">
                              Student Number
                            </label>
                            <span className="text-[10px] text-gray-400 font-medium">Use a registered student number</span>
                          </div>
                          <Input
                            className="h-10 bg-white dark:bg-zinc-800 border border-border dark:border-border rounded-xl text-gray-900 dark:text-zinc-100 placeholder:text-gray-400 dark:placeholder:text-zinc-500 shadow-none focus-visible:outline-none focus-visible:border-pup-maroon focus-visible:ring-1 focus-visible:ring-pup-maroon dark:focus-visible:border-red-500/80 dark:focus-visible:ring-red-500/80"
                            required
                            value={createStudentNo}
                            onChange={(e) => setCreateStudentNo(e.target.value)}
                            placeholder="202X-XXXXX-SJ-0"
                          />
                        </div>
                      )}
                    </div>
                  )
                ) : (
                  /* Alumni Fields */
                  <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-2 animate-fade-up">
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
                      <Select placeholder="Select degree program"
                        className="h-10 w-full rounded-xl border border-border bg-white px-3 text-xs font-normal shadow-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-pup-maroon focus-visible:border-pup-maroon dark:focus-visible:border-red-500/80 dark:focus-visible:ring-red-500/80 dark:bg-zinc-800 dark:border-border"
                        value={createCourseCode}
                        onChange={(e) => setCreateCourseCode(e.target.value)}
                        required={!createStudentNo.trim()}
                      >
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
                          Student Number {createCourseCode ? <span className="normal-case tracking-normal opacity-70">(optional)</span> : ""}
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

                    {documentTypeField}
                  </div>
                )}

                {/* Parent Notice & Information */}
                {createClientType === "Parent" && String(officeId).toLowerCase() === "registrar" && (
                  <section aria-labelledby="staff-requester-heading" className="space-y-4 rounded-xl bg-gray-50 p-4 dark:bg-zinc-800/60">
                    <div className="flex items-start gap-3 border-b border-border pb-3">
                      <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-white text-muted-foreground dark:bg-zinc-700">
                        <IdentityCardIcon size={16} aria-hidden="true" />
                      </div>
                      <div className="min-w-0">
                        <h3 id="staff-requester-heading" className="text-sm font-semibold text-foreground">
                          Parent or guardian details
                        </h3>
                        <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
                          Enter the requester&apos;s details. Attach a special power of attorney (SPA) or authorization letter and a valid government ID below.
                        </p>
                      </div>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="sm:col-span-2">
                        <label htmlFor="staff-requester-name" className="text-xs font-semibold text-gray-700 dark:text-zinc-200 block mb-1.5">
                          Full name
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
                          Relationship to the student
                        </label>
                        <Select placeholder="Select relationship"
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
                          Mobile number <span className="normal-case tracking-normal opacity-70">(optional)</span>
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
                  </section>
                )}

                {createClientType !== "Alumni" && documentTypeField}

                <div>
                  <label htmlFor="staff-request-description" className="text-xs font-semibold text-gray-700 dark:text-zinc-200 block mb-1.5">
                    Description / Purpose
                  </label>
                  <Textarea
                    id="staff-request-description"
                    aria-invalid={(createAttempted && createNotes.trim().length < 5) || undefined}
                    className="w-full min-h-24 resize-y"
                    rows={3}
                    value={createNotes}
                    onChange={(e) => setCreateNotes(e.target.value)}
                    placeholder="Provide the purpose of this request (at least 5 characters)…"
                    minLength={5}
                    maxLength={1000}
                    required
                  />
                  <p className="mt-1 text-[11px] text-gray-500 dark:text-zinc-400">Explain how the requested document will be used.</p>
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
                <Select placeholder="Select status"
                  className="w-full h-10 px-3 text-xs font-medium text-gray-900 dark:text-zinc-100 bg-white dark:bg-zinc-800 border border-border rounded-xl cursor-pointer"
                  value={reopenTargetStatus}
                  onChange={(e) => setReopenTargetStatus(e.target.value)}
                >
                  {(ALLOWED_REOPEN_TRANSITIONS[detail?.status] || ["InProgress"]).map((st) => (
                    <option key={st} value={st}>
                      {formatRequestStatus(st)}
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
