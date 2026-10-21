"use client";
import HugeIcon from "@/components/shared/HugeIcon";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
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
import MultiCriteriaFilter from "@/components/shared/MultiCriteriaFilter";
import ActiveFilterChips from "@/components/shared/ActiveFilterChips";
import FileAttachmentDropzone from "@/components/shared/FileAttachmentDropzone";
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
      icon: "ph-bold ph-file-pdf",
      color: "text-red-600 dark:text-red-400",
      badgeBg: "bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-300 border-red-200/60 dark:border-red-900/40",
    };
  }
  if (["png", "jpg", "jpeg", "webp"].includes(ext) || mime.includes("image")) {
    return {
      icon: "ph-bold ph-file-image",
      color: "text-blue-600 dark:text-blue-400",
      badgeBg: "bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border-blue-200/60 dark:border-blue-900/40",
    };
  }
  return {
    icon: "ph-bold ph-file",
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

  const resetCreateForm = () => {
    setCreateClientType("Student");
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
      handleCreateOpenChange(false);
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
              {required ? "Authorization Files (SPA & Valid ID)" : "Supporting Documents & Attachments"}
              {required && <span className="ml-1 text-red-500">*</span>}
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
                <HugeIcon className={cn("text-[10px]", hasSpa ? "ph-bold ph-check" : "ph-bold ph-circle-dashed")} />
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
                <HugeIcon className={cn("text-[10px]", hasValidId ? "ph-bold ph-check" : "ph-bold ph-circle-dashed")} />
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
      const label = cf === "OnTrack" ? "On Schedule" : cf === "DueSoon" ? "Due Today" : cf === "Overdue" ? "Past Due" : cf === "Compliant" ? "On Time" : cf;
      chips.push({
        id: `charter-${cf}`,
        label: `Processing Time: ${label}`,
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
                      Create Request
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
                  <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-[11px] font-mono text-gray-400 dark:text-zinc-500">
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
              className="border-t border-border dark:border-border px-6 py-2.5"
            />
          )}

          {/* 4. Full-Width Table Body */}
          <div className={cn("w-full flex flex-col flex-1 min-h-0 border-t border-border dark:border-border", total === 0 && "rounded-b-2xl overflow-hidden")}>
            {(loading && !isManualLoading) ? (
              <DocumentRequestsTableSkeleton rowCount={itemsPerPage} embedded={true} />
            ) : error ? (
              <div className="p-12 rounded-b-2xl flex-1 flex flex-col items-center justify-center">
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
            ) : displayedRows.length === 0 ? (
              <div className="py-16 rounded-b-2xl flex-1 flex flex-col items-center justify-center min-h-[420px] w-full">
                <Empty className="flex flex-1 h-full min-h-[360px] flex-col items-center justify-center border-0 bg-transparent text-center">
                  <EmptyHeader className="flex flex-col items-center gap-0">
                    <div className="relative mb-6">
                      <div className="absolute inset-0 scale-150 animate-pulse rounded-full bg-gray-50 opacity-50 dark:bg-card"></div>
                      <EmptyMedia className="relative z-10 flex h-24 w-24 items-center justify-center rounded-3xl border border-border bg-white shadow-xl dark:border-border dark:bg-card dark:shadow-none">
                        <HugeIcon  className="ph-duotone ph-magnifying-glass text-xl text-gray-300 dark:text-zinc-600"></HugeIcon>
                      </EmptyMedia>
                    </div>
                    <EmptyTitle className="text-xl font-semibold text-gray-900 dark:text-zinc-50">No Document Requests Found</EmptyTitle>
                    <EmptyDescription className="max-w-xs text-sm font-medium text-gray-900 dark:text-zinc-300 mt-1">
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
                        className="mt-6 flex h-10 items-center justify-center rounded-xl border border-border dark:border-border bg-white dark:bg-zinc-800 px-5 text-xs font-semibold text-gray-700 dark:text-zinc-200 shadow-xs transition-all hover:bg-gray-50 dark:hover:bg-zinc-700 active:scale-95 cursor-pointer"
                      >
                    Reset Filters
                  </Button>
                    ) : (
                      <Button
                        type="button"
                        onClick={() => setCreateOpen(true)}
                        title="Create Document Request"
                        className="mt-6 flex h-10 items-center justify-center rounded-xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-900 px-5 text-xs font-semibold cursor-pointer active:scale-95 transition-all shadow-xs"
                      >
                        Create Request
                      </Button>
                    )}
                  </EmptyContent>
                </Empty>
              </div>
            ) : (
              <div className="overflow-x-auto w-full">
                <table className="w-full text-sm table-fixed min-w-[1000px]">
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
                          Processing Time
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
                  <tbody className="divide-y divide-border dark:divide-border">
                    {displayedRows.map((r) => {
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
                      })}
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
            <DialogHeader className="bg-white p-6 pb-4 dark:bg-card border-b border-border/70 text-left shrink-0">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-pup-maroon/10 text-pup-maroon flex items-center justify-center shrink-0 dark:bg-pup-maroon/20 dark:text-red-400">
                  <HugeIcon className="ph-bold ph-file-plus text-xl" />
                </div>
                <div className="min-w-0 pr-8">
                  <DialogTitle className="text-base font-semibold tracking-[-0.01em] text-gray-900 dark:text-zinc-50">
                    New Document Request
                  </DialogTitle>
                  <DialogDescription className="mt-0.5 text-xs text-gray-500 dark:text-zinc-400">
                    Initiate an official document issuance request for a current student, alumnus, or parent/guardian.
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <form onSubmit={handleCreate} className="flex flex-col flex-1 min-h-0 overflow-hidden">
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
                          ? "bg-slate-900 text-white border-slate-900 dark:bg-zinc-100 dark:text-zinc-900 dark:border-border shadow-xs"
                          : "bg-white text-gray-700 border-border hover:bg-gray-50 dark:bg-zinc-800 dark:text-zinc-300 dark:border-border"
                      )}
                    >
                      <HugeIcon className="ph-bold ph-student text-base" />
                      <span>Current Student</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => selectCreateClientType("Alumni")}
                      className={cn(
                        "h-11 px-4 text-xs font-semibold rounded-xl border transition-all cursor-pointer flex items-center justify-center gap-2",
                        createClientType === "Alumni"
                          ? "bg-slate-900 text-white border-slate-900 dark:bg-zinc-100 dark:text-zinc-900 dark:border-border shadow-xs"
                          : "bg-white text-gray-700 border-border hover:bg-gray-50 dark:bg-zinc-800 dark:text-zinc-300 dark:border-border"
                      )}
                    >
                      <HugeIcon className="ph-bold ph-graduation-cap text-base" />
                      <span>Alumni / Former Student</span>
                    </button>
                    {String(officeId).toLowerCase() === "registrar" && (
                      <button
                        type="button"
                        onClick={() => selectCreateClientType("Parent")}
                        className={cn(
                          "h-11 px-4 text-xs font-semibold rounded-xl border transition-all cursor-pointer flex items-center justify-center gap-2",
                          createClientType === "Parent"
                            ? "bg-slate-900 text-white border-slate-900 dark:bg-zinc-100 dark:text-zinc-900 dark:border-border shadow-xs"
                            : "bg-white text-gray-700 border-border hover:bg-gray-50 dark:bg-zinc-800 dark:text-zinc-300 dark:border-border"
                        )}
                      >
                        <HugeIcon className="ph-bold ph-users text-base" />
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
                        <HugeIcon className="ph-bold ph-x text-xs" />
                      </button>
                      <div className="flex items-start gap-3.5">
                        <div className="w-11 h-11 rounded-xl bg-pup-maroon/10 text-pup-maroon flex items-center justify-center shrink-0 dark:bg-pup-maroon/20">
                          <HugeIcon className="ph-bold ph-user-focus text-xl" />
                        </div>
                        <div className="min-w-0 flex-1 pr-6">
                          <div className="font-semibold text-gray-900 text-sm truncate dark:text-zinc-50">{selectedStudent.name}</div>
                          <div className="text-xs text-gray-500 font-mono mt-0.5 dark:text-zinc-400">{selectedStudent.studentNo || selectedStudent.student_no}</div>
                          <div className="text-xs text-gray-600 mt-1.5 flex flex-wrap gap-x-4 gap-y-1 dark:text-zinc-300">
                            <span>Course: <strong className="text-gray-800 dark:text-zinc-100">{selectedStudent.courseCode || selectedStudent.course_code || "N/A"}</strong></span>
                            <span>Section: <strong className="text-gray-800 dark:text-zinc-100">{selectedStudent.section || "N/A"}</strong></span>
                            <span>Year: <strong className="text-gray-800 dark:text-zinc-100">{selectedStudent.yearLevel || selectedStudent.year_level || "N/A"}</strong></span>
                          </div>
                          <div className="text-xs text-pup-maroon dark:text-red-400 font-semibold mt-2 flex items-center gap-1.5">
                            <HugeIcon className="ph-bold ph-archive-tray text-sm" />
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
                          <HugeIcon className="ph-bold ph-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-zinc-500 transition-colors group-focus-within:text-pup-maroon dark:group-focus-within:text-red-400 pointer-events-none" />
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
                                    <span className="font-mono">{sn}</span>
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
                          placeholder="202X-XXXXX-MN-0"
                        />
                      </div>
                    </div>
                  )
                ) : (
                  /* Alumni Fields */
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-fade-up">
                    <div>
                      <label className="text-xs font-semibold text-gray-700 dark:text-zinc-200 block mb-1.5">
                        Alumni Full Name <span className="text-red-500">*</span>
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
                        Academic Program / Degree {!createStudentNo.trim() && <span className="text-red-500">*</span>}
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
                          Student Number {createCourseCode ? "(Optional)" : ""}
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
                      <HugeIcon className="ph-bold ph-shield-warning text-amber-700 dark:text-amber-400 text-base" />
                      <p className="text-xs font-medium text-amber-900 dark:text-amber-200">
                        Parent or guardian requests require the requester&apos;s details and both an SPA / authorization letter and a valid government ID.
                      </p>
                    </div>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                      <div>
                        <label htmlFor="staff-requester-name" className="text-xs font-semibold text-gray-700 dark:text-zinc-200 block mb-1.5">
                          Parent / Guardian Full Name <span className="text-red-500">*</span>
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
                          Relationship to Student <span className="text-red-500">*</span>
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
                          Contact / Mobile Number
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
                      Document Type <span className="text-red-500">*</span>
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
                      Description / Purpose <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      id="staff-request-description"
                      className="w-full h-10 min-h-[40px] max-h-[100px] rounded-xl border border-border p-2.5 text-xs font-normal focus:border-pup-maroon focus:ring-1 focus:ring-pup-maroon focus:outline-none dark:bg-zinc-800 dark:border-border dark:text-zinc-100 placeholder:text-gray-400 dark:placeholder:text-zinc-500 transition-all resize-none"
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
              <DialogFooter className="p-5 md:px-8 bg-gray-50/70 dark:bg-zinc-900/60 border-t border-border/70 flex items-center justify-end gap-3 shrink-0">
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 px-5 text-xs font-semibold rounded-xl border border-border dark:border-border bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-xs cursor-pointer active:scale-95 transition-all"
                  onClick={() => handleCreateOpenChange(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="px-6 h-10 btn-brand-red text-white! font-semibold text-xs shadow-xs rounded-xl! gap-2 flex items-center dark:shadow-none active:scale-95 cursor-pointer"
                  style={{ color: "#ffffff" }}
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <HugeIcon className="ph-bold ph-spinner animate-spin text-sm text-white!" />
                      Saving...
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
                  Locate Drawer
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

            <div className="max-h-[65vh] overflow-y-auto p-6 space-y-4">
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
                  Reopening adds an activity-history entry and posts an update on the student portal.
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
