"use client";
import HugeIcon from "@/components/shared/HugeIcon";
import { useCallback, useEffect, useState, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import Header from "@/components/layout/Header";
import Sidebar from "@/components/shared/Sidebar";
import { formatPHDateTime } from "@/lib/timeFormat";
import { Card } from "@/components/ui/card";
import PageHeader from "@/components/shared/PageHeader";
import { RefreshButton } from "@/components/shared/RefreshButton";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "@/components/ui/tooltip";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { getClientSession } from "@/lib/clientAuth";
import { canAccessPage } from "@/lib/roleUtils";
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyMedia,
} from "@/components/ui/empty";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import PDFPreviewModal from "@/components/shared/PDFPreviewModal";
import {
  StudentDashboardSkeleton,
  StudentRequestsTableRowsSkeleton,
  StudentRequestsPaginationSkeleton,
  StudentOsasProposalsListSkeleton,
} from "@/components/student/skeletons";
import StudentComplianceTab from "@/components/student/StudentComplianceTab";
import StudentFeedbackModal from "@/components/student/StudentFeedbackModal";
import StudentSidebarFeedbackCard from "@/components/student/StudentSidebarFeedbackCard";
import { Skeleton } from "@/components/ui/skeleton";
import MultiCriteriaFilter from "@/components/shared/MultiCriteriaFilter";
import ActiveFilterChips from "@/components/shared/ActiveFilterChips";

function SortIndicator({ column, sortBy, sortOrder }) {
  if (sortBy !== column) {
    return <HugeIcon  className="ph-bold ph-caret-up-down ml-1 text-[12px] text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity"></HugeIcon>;
  }
  return sortOrder === "ASC" ? (
    <HugeIcon  className="ph-bold ph-caret-up ml-1 text-[12px] text-gray-400"></HugeIcon>
  ) : (
    <HugeIcon  className="ph-bold ph-caret-down ml-1 text-[12px] text-gray-400"></HugeIcon>
  );
}

const requestStatuses = ["Pending", "InProgress", "Ready", "Completed", "Cancelled"];

const RATING_LABELS = {
  1: "Poor",
  2: "Fair",
  3: "Satisfactory",
  4: "Very Good",
  5: "Excellent",
};

export function normalizeProposalStatus(status) {
  const s = String(status || "").toLowerCase().trim();
  if (s === "submitted" || s === "pending") return "Submitted";
  if (s === "under review" || s === "underreview" || s === "inprogress" || s === "processing") return "Under Review";
  if (s === "needs revision" || s === "revisionsrequested" || s === "revision") return "Needs Revision";
  if (s === "approved" || s === "completed" || s === "ready") return "Approved";
  if (s === "declined" || s === "rejected" || s === "cancelled") return "Declined";
  if (s === "archived") return "Archived";
  return status || "";
}

function StatusBadge({ status }) {
  const s = String(status || "").toLowerCase().trim();
  let badgeClass = "bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700";
  let label = status;
  if (s === "approved") {
    badgeClass = "bg-emerald-50 text-emerald-800 border-emerald-200/80 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-800/40";
    label = "Approved";
  } else if (s === "completed") {
    badgeClass = "bg-emerald-50 text-emerald-800 border-emerald-200/80 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-800/40";
    label = "Completed";
  } else if (s === "ready") {
    badgeClass = "bg-emerald-50 text-emerald-800 border-emerald-200/80 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-800/40";
    label = "Ready";
  } else if (s === "under review") {
    badgeClass = "bg-blue-50 text-blue-800 border-blue-200/80 dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-800/40";
    label = "Under Review";
  } else if (s === "inprogress" || s === "in progress") {
    badgeClass = "bg-blue-50 text-blue-800 border-blue-200/80 dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-800/40";
    label = "In Progress";
  } else if (s === "processing") {
    badgeClass = "bg-blue-50 text-blue-800 border-blue-200/80 dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-800/40";
    label = "Processing";
  } else if (s === "needs revision" || s === "revision") {
    badgeClass = "bg-amber-50 text-amber-800 border-amber-200/80 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-800/40";
    label = "Needs Revision";
  } else if (s === "submitted") {
    badgeClass = "bg-sky-50 text-sky-800 border-sky-200/80 dark:bg-sky-950/30 dark:text-sky-300 dark:border-sky-800/40";
    label = "Submitted";
  } else if (s === "pending") {
    badgeClass = "bg-sky-50 text-sky-800 border-sky-200/80 dark:bg-sky-950/30 dark:text-sky-300 dark:border-sky-800/40";
    label = "Pending";
  } else if (s === "declined") {
    badgeClass = "bg-rose-50 text-rose-800 border-rose-200/80 dark:bg-rose-950/30 dark:text-rose-300 dark:border-rose-800/40";
    label = "Declined";
  } else if (s === "cancelled") {
    badgeClass = "bg-rose-50 text-rose-800 border-rose-200/80 dark:bg-rose-950/30 dark:text-rose-300 dark:border-rose-800/40";
    label = "Cancelled";
  } else if (s === "rejected") {
    badgeClass = "bg-rose-50 text-rose-800 border-rose-200/80 dark:bg-rose-950/30 dark:text-rose-300 dark:border-rose-800/40";
    label = "Rejected";
  }
  return <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${badgeClass}`}>{label}</span>;
}


export default function StudentDashboard() {
  const router = useRouter();
  const [me, setMe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({ requests: [], documents: [], proposals: [] });
  const [docTypes, setDocTypes] = useState([]);
  const [courses, setCourses] = useState([]);
  const [authMode, setAuthMode] = useState("login");
  const [auth, setAuth] = useState({ studentNo: "", name: "", password: "" });
  const [requestForm, setRequestForm] = useState({
    studentNo: "",
    docType: "",
    notes: "",
    clientType: "Student",
    courseCode: "",
    requesterName: "",
    requesterRelationship: "Mother",
    requesterContact: "",
    attachments: [],
  });
  const [proposalForm, setProposalForm] = useState({ title: "", organizationId: "", organizationName: "", eventDate: "", file: null });
  const [myOrganizations, setMyOrganizations] = useState([]);
  const [message, setMessage] = useState("");
  const [view, setView] = useState("odrs");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [authSubmitting, setAuthSubmitting] = useState(false);
  const [requestSubmitting, setRequestSubmitting] = useState(false);
  const [proposalSubmitting, setProposalSubmitting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [studentNoFocused, setStudentNoFocused] = useState(false);
  const [studentNameFocused, setStudentNameFocused] = useState(false);
  const [studentPasswordFocused, setStudentPasswordFocused] = useState(false);
  const [showStudentPassword, setShowStudentPassword] = useState(false);
  const attachmentInputRef = useRef(null);

  // Table state for Request History
  const [requestSearch, setRequestSearch] = useState("");
  const [requestFilters, setRequestFilters] = useState({
    status: [],
    doc_type: [],
  });
  const [sortBy, setSortBy] = useState("created_at");
  const [sortOrder, setSortOrder] = useState("DESC");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [selectedRequestForDetail, setSelectedRequestForDetail] = useState(null);
  const [selectedProposalForDetail, setSelectedProposalForDetail] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(true);
  const [pdfPreviewOpen, setPdfPreviewOpen] = useState(false);
  const [pdfPreviewData, setPdfPreviewData] = useState(null);
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);
  const [feedbackRequest, setFeedbackRequest] = useState(null);
  const [feedbackInitialRating, setFeedbackInitialRating] = useState(0);

  // OSAS Multi-Stream Governance States
  const [osasSubView, setOsasSubView] = useState("proposals"); // "proposals" | "post_event"
  const [postEventReports, setPostEventReports] = useState([]);
  const [pendingPostEvents, setPendingPostEvents] = useState([]);
  const [postEventForm, setPostEventForm] = useState({
    eventProposalId: "",
    organizationId: "",
    actualAttendance: "",
    totalExpenses: "",
    narrativeFile: null,
    liquidationFile: null,
  });
  const [postEventSubmitting, setPostEventSubmitting] = useState(false);

  // Filter state for OSAS Event Proposals
  const [proposalSearch, setProposalSearch] = useState("");
  const [proposalFilters, setProposalFilters] = useState({
    status: [],
    organization: [],
  });

  const handleOpenPdfPreview = useCallback((proposal, customOpts = null) => {
    if (customOpts) {
      setPdfPreviewData(customOpts);
      setPdfPreviewOpen(true);
      return;
    }
    if (!proposal?.id) return;
    setPdfPreviewData({
      url: `/api/student/event-proposals/${proposal.id}?file=1`,
      title: proposal.title || proposal.original_filename || "Event Proposal",
      subtitle: `Viewing official event proposal submitted for ${proposal.organization_name || "OSAS"}.`,
      studentName: proposal.student_name || me?.name || "Student",
      docType: "Event Proposal",
      originalFilename: proposal.original_filename || "Proposal.pdf",
    });
    setPdfPreviewOpen(true);
  }, [me]);

  const [zoomNode, setZoomNode] = useState(3); // 0 to 6 (7 nodes)

  const handleZoomMouseDown = (e) => {
    // Avoid text selection or default drag triggers
    e.preventDefault();
    const track = e.currentTarget;
    
    const updateZoom = (clientX) => {
      const rect = track.getBoundingClientRect();
      const clickX = clientX - rect.left;
      const percentage = clickX / rect.width;
      const node = Math.max(0, Math.min(6, Math.round(percentage * 6)));
      setZoomNode(node);
    };

    const isTouch = e.type === "touchstart";
    const startX = isTouch ? e.touches[0].clientX : e.clientX;
    updateZoom(startX);

    const handleMove = (moveEvent) => {
      const clientX = moveEvent.type === "touchmove" ? moveEvent.touches[0].clientX : moveEvent.clientX;
      updateZoom(clientX);
    };

    const handleEnd = () => {
      if (isTouch) {
        document.removeEventListener("touchmove", handleMove);
        document.removeEventListener("touchend", handleEnd);
      } else {
        document.removeEventListener("mousemove", handleMove);
        document.removeEventListener("mouseup", handleEnd);
      }
    };

    if (isTouch) {
      document.addEventListener("touchmove", handleMove, { passive: true });
      document.addEventListener("touchend", handleEnd);
    } else {
      document.addEventListener("mousemove", handleMove);
      document.addEventListener("mouseup", handleEnd);
    }
  };

  const hasActiveFilters =
    requestSearch !== "" ||
    (requestFilters.status?.length > 0) ||
    (requestFilters.doc_type?.length > 0);

  const requestFilterGroups = useMemo(() => {
    const reqs = data.requests || [];

    const statusOptions = [
      { value: "Pending", label: "Pending", dotColor: "bg-amber-500", count: reqs.filter((r) => r.status === "Pending").length },
      { value: "InProgress", label: "In Progress", dotColor: "bg-blue-500", count: reqs.filter((r) => r.status === "InProgress").length },
      { value: "Ready", label: "Ready for Pickup", dotColor: "bg-cyan-500", count: reqs.filter((r) => r.status === "Ready").length },
      { value: "Completed", label: "Completed", dotColor: "bg-emerald-500", count: reqs.filter((r) => r.status === "Completed").length },
      { value: "Cancelled", label: "Cancelled", dotColor: "bg-rose-500", count: reqs.filter((r) => r.status === "Cancelled").length },
    ];

    const typesMap = {};
    reqs.forEach((r) => {
      if (r.doc_type) {
        typesMap[r.doc_type] = (typesMap[r.doc_type] || 0) + 1;
      }
    });

    const docTypeOptions = Object.entries(typesMap).map(([dt, count]) => ({
      value: dt,
      label: dt,
      count,
    }));

    const groups = [
      {
        id: "status",
        label: "Request Status",
        options: statusOptions,
      },
    ];

    if (docTypeOptions.length > 0) {
      groups.push({
        id: "doc_type",
        label: "Document Type",
        options: docTypeOptions,
      });
    }

    return groups;
  }, [data.requests]);


  const proposalFilterGroups = useMemo(() => {
    const props = data.proposals || [];

    const statusOptions = [
      {
        value: "Submitted",
        label: "Submitted",
        dotColor: "bg-blue-500",
        count: props.filter((p) => normalizeProposalStatus(p.status) === "Submitted").length,
      },
      {
        value: "Under Review",
        label: "Under Review",
        dotColor: "bg-amber-500",
        count: props.filter((p) => normalizeProposalStatus(p.status) === "Under Review").length,
      },
      {
        value: "Needs Revision",
        label: "Needs Revision",
        dotColor: "bg-purple-500",
        count: props.filter((p) => normalizeProposalStatus(p.status) === "Needs Revision").length,
      },
      {
        value: "Approved",
        label: "Approved",
        dotColor: "bg-emerald-500",
        count: props.filter((p) => normalizeProposalStatus(p.status) === "Approved").length,
      },
      {
        value: "Declined",
        label: "Declined",
        dotColor: "bg-rose-500",
        count: props.filter((p) => normalizeProposalStatus(p.status) === "Declined").length,
      },
    ];

    const archivedCount = props.filter((p) => normalizeProposalStatus(p.status) === "Archived").length;
    if (archivedCount > 0) {
      statusOptions.push({
        value: "Archived",
        label: "Archived",
        dotColor: "bg-zinc-500",
        count: archivedCount,
      });
    }

    const orgMap = {};
    props.forEach((p) => {
      const org = p.organization_name || "General";
      orgMap[org] = (orgMap[org] || 0) + 1;
    });

    const orgOptions = Object.entries(orgMap).map(([org, count]) => ({
      value: org,
      label: org,
      count,
    }));

    const groups = [
      {
        id: "status",
        label: "Review Status",
        options: statusOptions,
      },
    ];

    if (orgOptions.length > 0) {
      groups.push({
        id: "organization",
        label: "Organization",
        options: orgOptions,
      });
    }

    return groups;
  }, [data.proposals]);


  const handleSort = (column) => {
    if (sortBy === column) {
      if (sortOrder === "ASC") {
        setSortOrder("DESC");
      } else {
        setSortBy("created_at");
        setSortOrder("DESC");
      }
    } else {
      setSortBy(column);
      setSortOrder("ASC");
    }
    setCurrentPage(1);
  };

  const filteredRequests = useMemo(() => {
    const q = (requestSearch || "").trim().toLowerCase();
    const selectedStatuses = requestFilters.status || [];
    const selectedDocTypes = requestFilters.doc_type || [];

    return (data.requests || []).filter((item) => {
      const matchesSearch =
        !q ||
        String(item.id).toLowerCase().includes(q) ||
        (item.doc_type || "").toLowerCase().includes(q) ||
        (item.notes || "").toLowerCase().includes(q) ||
        (item.status || "").toLowerCase().includes(q) ||
        (item.client_type || "").toLowerCase().includes(q) ||
        (item.student_no || "").toLowerCase().includes(q);

      const matchesStatus =
        selectedStatuses.length === 0 || selectedStatuses.includes(item.status);

      const matchesDocType =
        selectedDocTypes.length === 0 || selectedDocTypes.includes(item.doc_type);

      return matchesSearch && matchesStatus && matchesDocType;
    });
  }, [data.requests, requestSearch, requestFilters]);

  const filteredProposals = useMemo(() => {
    const q = (proposalSearch || "").trim().toLowerCase();
    const selectedStatuses = proposalFilters.status || [];
    const selectedOrgs = proposalFilters.organization || [];

    return (data.proposals || []).filter((item) => {
      const matchesSearch =
        !q ||
        (item.title || "").toLowerCase().includes(q) ||
        (item.organization_name || "").toLowerCase().includes(q) ||
        (item.status || "").toLowerCase().includes(q);

      const itemStatusNorm = normalizeProposalStatus(item.status);
      const matchesStatus =
        selectedStatuses.length === 0 ||
        selectedStatuses.some(
          (st) =>
            normalizeProposalStatus(st) === itemStatusNorm ||
            String(st).toLowerCase() === String(item.status || "").toLowerCase()
        );

      const matchesOrg =
        selectedOrgs.length === 0 || selectedOrgs.includes(item.organization_name || "General");

      return matchesSearch && matchesStatus && matchesOrg;
    });
  }, [data.proposals, proposalSearch, proposalFilters]);

  const sortedRequests = useMemo(() => {
    return [...filteredRequests].sort((a, b) => {
      let valA = a[sortBy];
      let valB = b[sortBy];

      if (sortBy === "id") {
        return sortOrder === "ASC" ? Number(a.id) - Number(b.id) : Number(b.id) - Number(a.id);
      } else if (sortBy === "created_at") {
        const timeA = new Date(a.created_at || 0).getTime();
        const timeB = new Date(b.created_at || 0).getTime();
        return sortOrder === "ASC" ? timeA - timeB : timeB - timeA;
      } else if (typeof valA === "string") {
        valA = valA.toLowerCase();
        valB = (valB || "").toLowerCase();
      }

      if (valA < valB) return sortOrder === "ASC" ? -1 : 1;
      if (valA > valB) return sortOrder === "ASC" ? 1 : -1;
      return 0;
    });
  }, [filteredRequests, sortBy, sortOrder]);

  const totalPages = Math.ceil(sortedRequests.length / itemsPerPage) || 1;
  const displayPage = Math.min(currentPage, totalPages);

  const paginatedRequests = useMemo(() => {
    const start = (displayPage - 1) * itemsPerPage;
    return sortedRequests.slice(start, start + itemsPerPage);
  }, [sortedRequests, displayPage, itemsPerPage]);

  const handleKeyDown = useCallback(
    (e) => {
      if (e.target.tagName === "INPUT" || e.target.tagName === "SELECT" || e.target.tagName === "TEXTAREA") return;
      if (e.key === "ArrowLeft") {
        setCurrentPage((p) => Math.max(1, p - 1));
      } else if (e.key === "ArrowRight") {
        setCurrentPage((p) => Math.min(totalPages, p + 1));
      }
    },
    [totalPages]
  );

  const showToast = useCallback((title, description, isError = false) => {
    const fn = isError ? toast.error : toast.success;
    fn(title, description ? { description } : undefined);
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      document.documentElement.style.setProperty("--brand-accent", "#800000");
      document.documentElement.style.setProperty("--brand-foreground", "#FFFFFF");
    }
  }, []);

  // The shared Sidebar emits this event from its own collapse button. Keep
  // the student shell in sync just like the staff dashboard does.
  useEffect(() => {
    const handleToggle = () => setSidebarOpen((open) => !open);
    window.addEventListener("toggle-sidebar", handleToggle);
    return () => window.removeEventListener("toggle-sidebar", handleToggle);
  }, []);

  // Synchronize view from switch-view events (Command Palette & deep linking)
  useEffect(() => {
    const handleSwitch = (e) => {
      const { view: targetView } = e.detail || {};
      if (targetView === "activity") {
        router.push("/account/activity");
        return;
      }
      if (targetView === "odrs" || targetView === "osas" || targetView === "compliance") {
        setView(targetView);
        const params = new URLSearchParams(window.location.search);
        params.set("view", targetView);
        router.replace(`${window.location.pathname}?${params.toString()}`, { scroll: false });
      }
    };
    window.addEventListener("switch-view", handleSwitch);
    return () => window.removeEventListener("switch-view", handleSwitch);
  }, [router]);

  // Synchronize view from URL parameter on initial mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const tab = new URLSearchParams(window.location.search).get("view");
      if (tab === "activity") {
        router.replace("/account/activity");
        return;
      }
      if (tab === "odrs" || tab === "osas" || tab === "compliance") {
        setView(tab);
      }
    }
  }, [router]);

  // Listen for scale / zoom adjustments from Command Palette
  useEffect(() => {
    const handleZoomChange = (e) => {
      const { action } = e.detail || {};
      if (action === "in") setZoomNode((prev) => Math.min(6, prev + 1));
      else if (action === "out") setZoomNode((prev) => Math.max(0, prev - 1));
      else if (action === "reset") setZoomNode(3);
    };
    window.addEventListener("change-zoom", handleZoomChange);
    return () => window.removeEventListener("change-zoom", handleZoomChange);
  }, []);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const session = await getClientSession();
      const authenticated = Boolean(session.ok && session.data);
      if (!canAccessPage("/student", session.data?.role, { authenticated })) {
        router.replace("/");
        return;
      }
      if (!authenticated) {
        return;
      }
      setMe(session.data);
      setRequestForm((prev) => ({
        ...prev,
        clientType: session.data.client_type || prev.clientType || "Student",
        studentNo: prev.studentNo || session.data.student_no || "",
      }));
      const [requestRes, proposalRes, typesRes, coursesRes, orgsRes, postEventRes] = await Promise.all([
        fetch("/api/student/document-requests", { cache: "no-store" }),
        fetch("/api/student/event-proposals", { cache: "no-store" }),
        fetch("/api/doc-types", { cache: "no-store" }),
        fetch("/api/courses", { cache: "no-store" }),
        fetch("/api/student/organizations", { cache: "no-store" }),
        fetch("/api/student/post-event-reports", { cache: "no-store" }).catch(() => ({ ok: false, json: async () => ({}) })),
      ]);
      const [requestJson, proposalJson, typesJson, coursesJson, orgsJson, postEventJson] = await Promise.all([
        requestRes.json(),
        proposalRes.json(),
        typesRes.json(),
        coursesRes.json(),
        orgsRes.json(),
        postEventRes.ok ? postEventRes.json().catch(() => ({})) : {},
      ]);
      if (!requestRes.ok || !requestJson?.ok || !proposalRes.ok || !proposalJson?.ok) {
        throw new Error(requestJson?.error || proposalJson?.error || "Unable to load student records.");
      }
      setDocTypes(Array.isArray(typesJson?.data) ? typesJson.data : []);
      setCourses(Array.isArray(coursesJson?.data) ? coursesJson.data : []);
      const loadedOrgs = Array.isArray(orgsJson?.data) ? orgsJson.data : [];
      setMyOrganizations(loadedOrgs);
      if (loadedOrgs.length > 0) {
        setProposalForm((prev) => ({
          ...prev,
          organizationId: prev.organizationId || loadedOrgs[0].organization_id,
          organizationName: prev.organizationName || loadedOrgs[0].organization_name,
        }));
        setPostEventForm((prev) => ({
          ...prev,
          organizationId: prev.organizationId || loadedOrgs[0].organization_id,
        }));
      }
      setPostEventReports(postEventJson?.data?.reports || []);
      setPendingPostEvents(postEventJson?.data?.pendingEvents || []);
      setData({ requests: requestJson?.data?.requests || [], documents: requestJson?.data?.documents || [], proposals: proposalJson?.data || [] });
    } finally {
      setLoading(false);
    }
  }, [router, showToast]);

  useEffect(() => { const timer = setTimeout(() => { load().catch((error) => { const message = error.message || "Unable to load student records."; setMessage(message); showToast("Records failed to load", message, true); }); }, 0); return () => clearTimeout(timer); }, [load, showToast]);

  useEffect(() => {
    if (me === null) {
      getClientSession()
        .then((session) => {
          if (session.status === 401) return;
          const authenticated = Boolean(session.ok && session.data);
          if (!canAccessPage("/student", session.data?.role, { authenticated })) {
            router.replace("/");
          }
        })
        .catch(() => router.replace("/"));
    }
  }, [me, router]);

  async function submitAuth(event) {
    event.preventDefault(); setMessage(""); setAuthSubmitting(true);
    try {
    const endpoint = authMode === "register" ? "/api/auth/student/register" : "/api/auth/student/login";
    const body = authMode === "register" ? auth : { studentNo: auth.studentNo, password: auth.password };
    const res = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const json = await res.json();
    if (!res.ok || !json.ok) { const error = json.error || "Unable to continue."; setMessage(error); showToast("Sign-in failed", error, true); return; }
    showToast(authMode === "register" ? "Account created" : "Signed in", authMode === "register" ? "Your Student ODRS account is ready." : "Welcome to Student ODRS.");
    await load();
    } catch (error) {
      const message = error.message || "Unable to continue."; setMessage(message); showToast("Connection failed", message, true);
    } finally { setAuthSubmitting(false); }
  }

  async function createRequest(event) {
    event.preventDefault(); setMessage(""); setRequestSubmitting(true);
    try {
      const studentNo = String(requestForm.studentNo || "").trim().toUpperCase() || null;
      const docType = String(requestForm.docType || "").trim();
      const notes = String(requestForm.notes || "").trim();
      const clientType = String(requestForm.clientType || me?.client_type || "Student").trim();
      const courseCode = String(requestForm.courseCode || "").trim().toUpperCase() || null;
      const requesterName = String(requestForm.requesterName || "").trim() || null;
      const requesterRelationship = String(requestForm.requesterRelationship || "").trim() || null;
      const requesterContact = String(requestForm.requesterContact || "").trim() || null;
      const attachments = Array.isArray(requestForm.attachments) ? requestForm.attachments : [];

      if (!clientType) {
        setMessage("Client type is required.");
        showToast("Client type required", "Please select whether you are a Student, Alumni, or Parent/Guardian.", true);
        return;
      }
      if (clientType === "Parent") {
        if (!studentNo) {
          setMessage("Student number is required for Parent / Legal Guardian requests.");
          showToast("Student number required", "Please enter the student number of your child / ward.", true);
          return;
        }
        if (!requesterName) {
          setMessage("Parent / Legal Guardian name is required.");
          showToast("Name required", "Please enter your full legal name.", true);
          return;
        }
        if (!requesterRelationship) {
          setMessage("Relationship to student is required.");
          showToast("Relationship required", "Please select your relationship to the student.", true);
          return;
        }
        const hasSpa = attachments.some(
          (a) =>
            a.attachmentType === "spa" ||
            a.attachmentType === "valid_id" ||
            a.file?.name?.toLowerCase().includes("spa") ||
            a.file?.name?.toLowerCase().includes("power") ||
            a.file?.name?.toLowerCase().includes("auth")
        );
        if (attachments.length === 0 || !hasSpa) {
          setMessage("Special Power of Attorney (SPA) or Authorization Letter is required for parent/guardian requests.");
          showToast("SPA document required", "Under RA 10173, please attach a signed SPA or Authorization Letter and a valid government ID.", true);
          return;
        }
      }
      if (clientType === "Alumni" && !studentNo && !courseCode) {
        setMessage("Academic program is required for alumni without a student number.");
        showToast("Program required", "Please select your degree program / course.", true);
        return;
      }
      if (!docType) {
        setMessage("Document type is required.");
        showToast("Document type required", "Please select a document type.", true);
        return;
      }
      if (!notes) {
        setMessage("Description is required to submit a document request.");
        showToast("Description required", "Please provide the purpose or description of your request.", true);
        return;
      }

      const formData = new FormData();
      if (studentNo) formData.append("studentNo", studentNo);
      formData.append("docType", docType);
      formData.append("notes", notes);
      formData.append("clientType", clientType);
      if (courseCode) formData.append("courseCode", courseCode);
      if (requesterName) formData.append("requesterName", requesterName);
      if (requesterRelationship) formData.append("requesterRelationship", requesterRelationship);
      if (requesterContact) formData.append("requesterContact", requesterContact);

      attachments.forEach((att) => {
        if (att.file) {
          formData.append("files", att.file);
          formData.append("file_types", att.attachmentType || "evidence");
        }
      });

      const res = await fetch("/api/student/document-requests", {
        method: "POST",
        body: formData,
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        const error = json.error || "Unable to submit request.";
        setMessage(error);
        showToast("Request failed", error, true);
        return;
      }
      setRequestForm((prev) => ({
        ...prev,
        docType: "",
        notes: "",
        courseCode: "",
        studentNo: me?.student_no || "",
        requesterName: "",
        requesterRelationship: "Mother",
        requesterContact: "",
        attachments: [],
      }));
      showToast("Request submitted", "The Registrar can now review your document request.");
      await load();
      if (json.data) {
        setFeedbackRequest(json.data);
        setFeedbackInitialRating(0);
        setFeedbackModalOpen(true);
      }
    } catch (error) {
      const message = error.message || "Unable to submit request.";
      setMessage(message);
      showToast("Request failed", message, true);
    } finally {
      setRequestSubmitting(false);
    }
  }

  const handleAddFiles = (e) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (!selectedFiles.length) return;
    const newItems = selectedFiles.map((file) => {
      let defaultType = "evidence";
      const nameLower = file.name.toLowerCase();
      if (requestForm.clientType === "Parent") {
        if (nameLower.includes("id") || nameLower.includes("valid") || nameLower.includes("passport") || nameLower.includes("license")) {
          defaultType = "valid_id";
        } else {
          defaultType = "spa";
        }
      } else {
        if (nameLower.includes("receipt") || nameLower.includes("pay") || nameLower.includes("proof")) {
          defaultType = "receipt";
        } else if (nameLower.includes("clearance")) {
          defaultType = "clearance";
        }
      }
      return {
        id: Math.random().toString(36).slice(2, 9),
        file,
        attachmentType: defaultType,
      };
    });
    setRequestForm((prev) => ({
      ...prev,
      attachments: [...prev.attachments, ...newItems].slice(0, 5),
    }));
    e.target.value = "";
  };

  const handleRemoveFile = (id) => {
    setRequestForm((prev) => ({
      ...prev,
      attachments: prev.attachments.filter((a) => a.id !== id),
    }));
  };

  const handleUpdateFileType = (id, type) => {
    setRequestForm((prev) => ({
      ...prev,
      attachments: prev.attachments.map((a) => (a.id === id ? { ...a, attachmentType: type } : a)),
    }));
  };

  const handleFeedbackSubmitted = (newFeedback) => {
    if (!newFeedback) return;
    setData((prev) => ({
      ...prev,
      requests: (prev.requests || []).map((req) =>
        Number(req.id) === Number(newFeedback.document_request_id)
          ? { ...req, feedback: newFeedback }
          : req
      ),
    }));
    setSelectedRequestForDetail((prev) =>
      prev && Number(prev.id) === Number(newFeedback.document_request_id)
        ? { ...prev, feedback: newFeedback }
        : prev
    );
  };

  async function submitProposal(event) {
    event.preventDefault(); setMessage(""); setProposalSubmitting(true);
    try {
      const selectedOrg = myOrganizations.find((o) => o.organization_id === proposalForm.organizationId) || myOrganizations[0];
      if (!selectedOrg) {
        throw new Error("You must be an authorized officer of a recognized student organization to submit proposals.");
      }
      const form = new FormData();
      form.set("title", proposalForm.title);
      form.set("organizationId", selectedOrg.organization_id);
      form.set("organizationName", selectedOrg.organization_name);
      form.set("eventDate", proposalForm.eventDate);
      if (proposalForm.file) form.set("file", proposalForm.file);

      const res = await fetch("/api/student/event-proposals", { method: "POST", body: form });
      const json = await res.json();
      if (!res.ok || !json.ok) { const error = json.error || "Unable to submit proposal."; setMessage(error); showToast("Proposal failed", error, true); return; }
      setProposalForm({ title: "", organizationId: myOrganizations[0]?.organization_id || "", organizationName: "", eventDate: "", file: null });
      showToast("Proposal submitted", "OSAS can now review your Event Proposal.");
      await load();
    } catch (error) {
      const message = error.message || "Unable to submit proposal."; setMessage(message); showToast("Proposal failed", message, true);
    } finally { setProposalSubmitting(false); }
  }

  async function submitPostEventReport(event) {
    event.preventDefault();
    setMessage("");
    setPostEventSubmitting(true);
    try {
      const selectedOrg = myOrganizations.find((o) => o.organization_id === postEventForm.organizationId) || myOrganizations[0];
      if (!selectedOrg) {
        throw new Error("You must be an authorized officer of a recognized student organization to submit post-event reports.");
      }
      if (!postEventForm.eventProposalId) {
        throw new Error("Please select an approved event proposal.");
      }
      if (!postEventForm.narrativeFile) {
        throw new Error("Please upload the Post-Event Narrative Report PDF.");
      }
      const form = new FormData();
      form.set("eventProposalId", postEventForm.eventProposalId);
      form.set("organizationId", selectedOrg.organization_id);
      form.set("actualAttendance", postEventForm.actualAttendance || "0");
      form.set("totalExpenses", postEventForm.totalExpenses || "0.00");
      form.set("narrativeFile", postEventForm.narrativeFile);
      if (postEventForm.liquidationFile) {
        form.set("liquidationFile", postEventForm.liquidationFile);
      }

      const res = await fetch("/api/student/post-event-reports", { method: "POST", body: form });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        const error = json.error || "Unable to submit post-event report.";
        setMessage(error);
        showToast("Submission failed", error, true);
        return;
      }
      setPostEventForm({
        eventProposalId: "",
        organizationId: myOrganizations[0]?.organization_id || "",
        actualAttendance: "",
        totalExpenses: "",
        narrativeFile: null,
        liquidationFile: null,
      });
      showToast("Report Submitted", "Your Post-Event Narrative & Liquidation report has been submitted to OSAS.");
      await load();
    } catch (error) {
      const message = error.message || "Unable to submit post-event report.";
      setMessage(message);
      showToast("Submission failed", message, true);
    } finally {
      setPostEventSubmitting(false);
    }
  }

  if (!me) {
    return <StudentDashboardSkeleton view={view} />;
  }

  const sidebarItems = [
    { type: "header", label: "Academic Records" },
    { key: "odrs", label: "Document Requests", iconClass: "ph-bold ph-tray-arrow-up" },
    { key: "compliance", label: "Document Checklist", iconClass: "ph-bold ph-clipboard-text" },

    { type: "header", label: "Student Affairs" },
    { key: "osas", label: "OSAS Submissions", iconClass: "ph-bold ph-student" },
  ];

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    window.location.href = "/";
  }

  return (
    <TooltipProvider delayDuration={200}>
      <div className="relative flex h-screen min-h-0 flex-col overflow-hidden bg-slate-50/30 font-jakarta dark:bg-zinc-950/30">
        {/* Shared dashboard liquid-gradient background with subtle opacity */}
        <div className="liquid-container pointer-events-none opacity-20 dark:opacity-10">
          <div className="liquid-blob liquid-blob-1" />
          <div className="liquid-blob liquid-blob-2" />
          <div className="liquid-blob liquid-blob-3" />
        </div>
        <Header authUser={me} onLogout={handleLogout} />
        <div className="flex min-h-0 flex-1">
        <Sidebar
          open={sidebarOpen}
          items={sidebarItems}
          activeKey={view}
          onSelect={(key) => setView(key)}
          onLogout={handleLogout}
          zoomNode={zoomNode}
          setZoomNode={setZoomNode}
          handleZoomMouseDown={handleZoomMouseDown}
          accentColor="#800000"
          officeName="Student Portal"
          bottomContent={
            <StudentSidebarFeedbackCard
              open={sidebarOpen}
              requests={data.requests}
              onRateRequest={(req, prefillRating) => {
                setFeedbackRequest(req);
                setFeedbackInitialRating(prefillRating || 0);
                setFeedbackModalOpen(true);
              }}
            />
          }
        />
          <main className="relative w-full min-w-0 min-h-0 flex-1 overflow-y-auto bg-white/25 dark:bg-zinc-950/25 backdrop-blur-xs">
            <div
              className="flex min-h-0 w-full flex-1 flex-col p-4"
              style={{ transform: `scale(${[0.94, 1.04, 1.15, 1.25, 1.35, 1.46, 1.56][zoomNode]})`, transformOrigin: 'top left', width: `${100 / [0.94, 1.04, 1.15, 1.25, 1.35, 1.46, 1.56][zoomNode]}%`, minHeight: `${100 / [0.94, 1.04, 1.15, 1.25, 1.35, 1.46, 1.56][zoomNode]}%` }}
            >
              <div className="w-full flex-1 flex flex-col min-h-0">

              {message && <p role="alert" className="rounded-brand border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 mb-4">{message}</p>}
              {view === "compliance" ? (
                <StudentComplianceTab authUser={me} onLogout={handleLogout} />
              ) : view === "odrs" ? (
                <div className="flex flex-col w-full flex-1 min-h-0">
                  {/* ONE Single Card Container encapsulating Header, Inline Request Form, Toolbar, Active Filters, Table & Pagination */}
                  <Card
                    className="flex h-auto w-full flex-col p-0 gap-0 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-card dark:shadow-none isolate font-jakarta mb-4 min-h-0 flex-1 focus:outline-none"
                    onKeyDown={handleKeyDown}
                    tabIndex={0}
                  >
                    {/* 1. Page Header */}
                    <PageHeader
                      icon="ph-tray"
                      title="Document Requests"
                      description="Request official academic records and track Registrar processing updates."
                      showBorder={false}
                      className="p-6"
                      titleClassName="text-[18px] font-semibold tracking-[-0.01em] text-gray-900 dark:text-zinc-50"
                      descriptionClassName="text-[13px] font-normal text-gray-500 dark:text-zinc-400 mt-[4px]"
                      actions={
                        <div className="flex items-center gap-3 sm:gap-4">
                          {me?.student_no && (
                            <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-red-50 text-pup-maroon border border-red-100 dark:bg-red-950/30 dark:border-red-900/30">
                              <HugeIcon  className="ph-fill ph-student text-[13px]"></HugeIcon>
                              {me.student_no}
                            </span>
                          )}
                          <RefreshButton
                            onRefresh={async () => {
                              setRefreshing(true);
                              try {
                                await load();
                              } finally {
                                setRefreshing(false);
                              }
                            }}
                            isLoading={refreshing}
                            title="Refresh Records"
                          />
                          
                          <Button
                            type="button"
                            onClick={() => setIsFormOpen((prev) => !prev)}
                            variant={isFormOpen ? "outline" : "default"}
                            className={cn(
                              "flex h-10 px-5 text-xs font-semibold rounded-xl! active:scale-95 transition-all cursor-pointer shadow-xs",
                              isFormOpen
                                ? "border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700"
                                : "btn-brand-red text-white! border-0"
                            )}
                            style={!isFormOpen ? { color: "#ffffff" } : undefined}
                          >
                            {isFormOpen ? "Hide Form" : "New Request"}
                          </Button>
                        </div>
                      }
                    />

                    {/* 2. Inline Non-Modal Request Form Section */}
                    {isFormOpen && (
                      <div className="border-t border-gray-100 dark:border-white/10 p-5 sm:p-6 bg-gray-50/40 dark:bg-zinc-900/20 animate-in fade-in slide-in-from-top-2 duration-fast">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100 dark:border-white/10">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50 text-pup-maroon dark:bg-red-950/40 dark:text-red-400">
                              <HugeIcon  className="ph-bold ph-plus-circle text-xl" />
                            </div>
                            <div>
                              <h2 className="text-[15px] font-semibold text-gray-900 dark:text-zinc-50">New Document Request</h2>
                              <p className="text-xs text-gray-500 dark:text-zinc-400">Request an academic document from the Registrar.</p>
                            </div>
                          </div>

                          {/* Duplicate ticket reminder notice banner */}
                          <div className="flex items-center gap-2.5 rounded-xl border border-amber-200 bg-amber-50/80 px-3.5 py-2 text-xs text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-300">
                            <HugeIcon  className="ph-bold ph-info text-[15px] shrink-0 text-amber-600 dark:text-amber-400"></HugeIcon>
                            <span className="font-medium text-[11px] leading-relaxed">
                              Please avoid creating duplicate tickets for the same concern to help us process your request promptly.
                            </span>
                          </div>
                        </div>

                        <form onSubmit={createRequest} className="flex flex-col gap-4 mt-4">
                          {/* Parent / Legal Guardian Compliance Notice */}
                          {requestForm.clientType === "Parent" && (
                            <div className="rounded-xl border border-amber-200/90 bg-amber-50/70 p-3.5 dark:border-amber-900/40 dark:bg-amber-950/20 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2.5">
                              <HugeIcon className="ph-bold ph-shield-check text-base text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                              <div className="space-y-1 text-[11px] leading-relaxed">
                                <span className="font-semibold block text-amber-950 dark:text-amber-100">
                                  Data Privacy Act (RA 10173) & Third-Party Request Policy
                                </span>
                                <p>
                                  Under RA 10173 and university regulations, requests submitted by parents or guardians strictly require an attached <strong>Special Power of Attorney (SPA)</strong> or Authorization Letter along with a photocopy of a <strong>valid government ID</strong>.
                                </p>
                              </div>
                            </div>
                          )}

                          {/* Top Row: Client Type, Student Number, Academic Program, Document Type */}
                          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {/* Client Type */}
                            <div className="min-w-0">
                              <label htmlFor="student-client-type" className="mb-1.5 block text-xs font-semibold text-gray-700 dark:text-zinc-200">
                                Client Type <span className="text-red-500">*</span>
                              </label>
                              <Select
                                id="student-client-type"
                                value={requestForm.clientType}
                                onChange={(e) => setRequestForm({ ...requestForm, clientType: e.target.value })}
                                className="h-10 w-full rounded-xl text-xs font-normal text-gray-800 dark:text-zinc-100 border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 shadow-none focus-visible:outline-none focus-visible:border-pup-maroon focus-visible:ring-1 focus-visible:ring-pup-maroon dark:focus-visible:border-red-500/80 dark:focus-visible:ring-red-500/80"
                              >
                                <option value="Student">Current Student</option>
                                <option value="Alumni">Alumni / Former Student</option>
                                <option value="Parent">Parent / Legal Guardian</option>
                              </Select>
                            </div>

                            {/* Student Number */}
                            <div className="min-w-0">
                              <div className="flex items-center justify-between mb-1.5">
                                <label htmlFor="student-id-input" className="text-xs font-semibold text-gray-700 dark:text-zinc-200">
                                  Student Number {requestForm.clientType !== "Alumni" && <span className="text-red-500">*</span>}
                                </label>
                                {requestForm.clientType === "Alumni" && (
                                  <span className="text-[10px] text-gray-400 font-medium">Optional</span>
                                )}
                              </div>
                              <Input
                                id="student-id-input"
                                type="text"
                                placeholder={
                                  requestForm.clientType === "Parent"
                                    ? "Child/Ward ID (YYYY-XXXXX-SJ-0)"
                                    : requestForm.clientType === "Alumni"
                                    ? "Optional if forgotten"
                                    : "YYYY-XXXXX-SJ-0"
                                }
                                value={requestForm.studentNo || ""}
                                onChange={(e) => setRequestForm({ ...requestForm, studentNo: e.target.value })}
                                className="h-10 w-full rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 px-3 text-xs text-gray-900 dark:text-zinc-100 placeholder:text-gray-400 dark:placeholder:text-zinc-500 shadow-none outline-none focus-visible:border-pup-maroon focus-visible:ring-1 focus-visible:ring-pup-maroon dark:focus-visible:border-red-500/80 dark:focus-visible:ring-red-500/80"
                              />
                            </div>

                            {/* Academic Program (Alumni only) */}
                            {requestForm.clientType === "Alumni" && (
                              <div className="min-w-0">
                                <label htmlFor="student-course-select" className="mb-1.5 block text-xs font-semibold text-gray-700 dark:text-zinc-200">
                                  Academic Program {!requestForm.studentNo && <span className="text-red-500">*</span>}
                                </label>
                                <Select
                                  id="student-course-select"
                                  value={requestForm.courseCode || ""}
                                  onChange={(e) => setRequestForm({ ...requestForm, courseCode: e.target.value })}
                                  className="h-10 w-full rounded-xl text-xs font-normal border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 shadow-none text-gray-800 dark:text-zinc-100 focus-visible:outline-none focus-visible:border-pup-maroon focus-visible:ring-1 focus-visible:ring-pup-maroon dark:focus-visible:border-red-500/80 dark:focus-visible:ring-red-500/80"
                                >
                                  <option value="">Select degree program...</option>
                                  {courses.map((c) => (
                                    <option key={c.code} value={c.code}>
                                      {c.code} - {c.name}
                                    </option>
                                  ))}
                                </Select>
                              </div>
                            )}

                            {/* Document Type */}
                            <div className={cn("min-w-0", requestForm.clientType === "Alumni" ? "lg:col-span-1" : "md:col-span-1 lg:col-span-2")}>
                              <label htmlFor="student-document-type" className="mb-1.5 block text-xs font-semibold text-gray-700 dark:text-zinc-200">
                                Document Type <span className="text-red-500">*</span>
                              </label>
                              <Select
                                id="student-document-type"
                                value={requestForm.docType}
                                placeholder="Select a document type"
                                onChange={(e) => setRequestForm({ ...requestForm, docType: e.target.value })}
                                className={`h-10 w-full rounded-xl text-xs font-normal border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 shadow-none focus-visible:outline-none focus-visible:border-pup-maroon focus-visible:ring-1 focus-visible:ring-pup-maroon dark:focus-visible:border-red-500/80 dark:focus-visible:ring-red-500/80 ${
                                  !requestForm.docType ? "text-gray-400 dark:text-zinc-500" : "text-gray-800 dark:text-zinc-100"
                                }`}
                              >
                                <option value="">Select a document type</option>
                                {docTypes.map((type) => (
                                  <option key={type} value={type}>
                                    {type}
                                  </option>
                                ))}
                              </Select>
                              {docTypes.length === 0 && <p className="mt-1 text-xs text-amber-600">No active Registrar document types are available.</p>}
                            </div>
                          </div>

                          {/* Parent / Legal Guardian Specific Identity Fields */}
                          {requestForm.clientType === "Parent" && (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
                              <div className="min-w-0">
                                <label htmlFor="parent-name-input" className="mb-1.5 block text-xs font-semibold text-gray-700 dark:text-zinc-200">
                                  Parent / Guardian Full Name <span className="text-red-500">*</span>
                                </label>
                                <Input
                                  id="parent-name-input"
                                  type="text"
                                  placeholder="e.g. Maria Santos Dela Cruz"
                                  value={requestForm.requesterName || ""}
                                  onChange={(e) => setRequestForm({ ...requestForm, requesterName: e.target.value })}
                                  className="h-10 w-full rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 px-3 text-xs text-gray-900 dark:text-zinc-100 placeholder:text-gray-400 dark:placeholder:text-zinc-500 shadow-none outline-none focus-visible:border-pup-maroon focus-visible:ring-1 focus-visible:ring-pup-maroon dark:focus-visible:border-red-500/80 dark:focus-visible:ring-red-500/80"
                                />
                              </div>

                              <div className="min-w-0">
                                <label htmlFor="parent-relationship-select" className="mb-1.5 block text-xs font-semibold text-gray-700 dark:text-zinc-200">
                                  Relationship to Student <span className="text-red-500">*</span>
                                </label>
                                <Select
                                  id="parent-relationship-select"
                                  value={requestForm.requesterRelationship || "Mother"}
                                  onChange={(e) => setRequestForm({ ...requestForm, requesterRelationship: e.target.value })}
                                  className="h-10 w-full rounded-xl text-xs font-normal border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 shadow-none text-gray-800 dark:text-zinc-100 focus-visible:outline-none focus-visible:border-pup-maroon focus-visible:ring-1 focus-visible:ring-pup-maroon dark:focus-visible:border-red-500/80 dark:focus-visible:ring-red-500/80"
                                >
                                  <option value="Mother">Mother</option>
                                  <option value="Father">Father</option>
                                  <option value="Legal Guardian">Legal Guardian</option>
                                  <option value="Authorized Representative">Authorized Representative</option>
                                </Select>
                              </div>

                              <div className="min-w-0">
                                <label htmlFor="parent-contact-input" className="mb-1.5 block text-xs font-semibold text-gray-700 dark:text-zinc-200">
                                  Contact / Mobile Number
                                </label>
                                <Input
                                  id="parent-contact-input"
                                  type="text"
                                  placeholder="e.g. 0917-123-4567"
                                  value={requestForm.requesterContact || ""}
                                  onChange={(e) => setRequestForm({ ...requestForm, requesterContact: e.target.value })}
                                  className="h-10 w-full rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 px-3 text-xs text-gray-900 dark:text-zinc-100 placeholder:text-gray-400 dark:placeholder:text-zinc-500 shadow-none outline-none focus-visible:border-pup-maroon focus-visible:ring-1 focus-visible:ring-pup-maroon dark:focus-visible:border-red-500/80 dark:focus-visible:ring-red-500/80"
                                />
                              </div>
                            </div>
                          )}

                          {/* Description / Purpose */}
                          <div>
                            <label htmlFor="student-request-description" className="mb-1.5 block text-xs font-semibold text-gray-700 dark:text-zinc-200">
                              Description / Purpose <span className="text-red-500">*</span>
                            </label>
                            <textarea
                              id="student-request-description"
                              required
                              rows={2}
                              className="w-full min-h-[72px] rounded-xl border border-gray-200 bg-white p-3 text-xs font-normal focus:border-pup-maroon focus:ring-1 focus:ring-pup-maroon focus:outline-none dark:bg-zinc-800 dark:border-white/10 dark:text-zinc-100 placeholder:text-gray-400 dark:placeholder:text-zinc-500 resize-none transition-all shadow-none"
                              placeholder="Provide the purpose of your request (e.g. employment verification, board exam, transfer credentials, etc.)"
                              value={requestForm.notes}
                              onChange={(e) => setRequestForm({ ...requestForm, notes: e.target.value })}
                            />
                          </div>

                          {/* Supporting Documents & Attachments Dropzone */}
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <label className="text-xs font-semibold text-gray-700 dark:text-zinc-200 flex items-center gap-1.5">
                                <span>Supporting Documents & Attachments</span>
                                {requestForm.clientType === "Parent" ? (
                                  <span className="text-red-500 font-bold">* (SPA & Valid ID Required)</span>
                                ) : (
                                  <span className="text-[10px] text-gray-400 font-normal">(Optional proof of payment, clearance, etc.)</span>
                                )}
                              </label>
                              <button
                                type="button"
                                onClick={() => attachmentInputRef.current?.click()}
                                disabled={requestForm.attachments.length >= 5}
                                className="text-[11px] font-semibold text-pup-maroon hover:underline dark:text-red-400 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                + Add File ({requestForm.attachments.length}/5)
                              </button>
                            </div>

                            <input
                              type="file"
                              ref={attachmentInputRef}
                              onChange={handleAddFiles}
                              multiple
                              accept=".pdf,.png,.jpg,.jpeg,.webp"
                              className="hidden"
                            />

                            {requestForm.attachments.length === 0 ? (
                              <div
                                onClick={() => attachmentInputRef.current?.click()}
                                className="flex flex-col items-center justify-center p-4 border border-dashed border-gray-200 dark:border-white/10 rounded-xl bg-white dark:bg-zinc-800/40 hover:bg-gray-50/80 dark:hover:bg-zinc-800/70 transition-colors cursor-pointer text-center group"
                              >
                                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100 dark:bg-zinc-700 text-gray-500 dark:text-zinc-300 group-hover:scale-105 transition-transform mb-1.5">
                                  <HugeIcon className="ph-bold ph-paperclip text-sm" />
                                </div>
                                <p className="text-xs font-medium text-gray-700 dark:text-zinc-200">
                                  {requestForm.clientType === "Parent"
                                    ? "Upload signed SPA / Authorization Letter & Valid ID"
                                    : "Click to upload supporting documents or receipts"}
                                </p>
                                <p className="text-[11px] text-gray-400 dark:text-zinc-500 mt-0.5">
                                  PDF, PNG, JPG up to 10MB each (max 5 files)
                                </p>
                              </div>
                            ) : (
                              <div className="space-y-2">
                                {requestForm.attachments.map((att) => (
                                  <div
                                    key={att.id}
                                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800/70 shadow-xs"
                                  >
                                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-100 dark:bg-zinc-700 text-gray-600 dark:text-zinc-300">
                                        <HugeIcon
                                          className={
                                            att.file?.name?.toLowerCase().endsWith(".pdf")
                                              ? "ph-fill ph-file-pdf text-red-500 text-base"
                                              : "ph-fill ph-file-image text-blue-500 text-base"
                                          }
                                        />
                                      </div>
                                      <div className="min-w-0 flex-1">
                                        <p className="text-xs font-medium text-gray-900 dark:text-zinc-100 truncate">
                                          {att.file?.name}
                                        </p>
                                        <p className="text-[11px] text-gray-400 dark:text-zinc-500">
                                          {(att.file?.size / 1024).toFixed(1)} KB
                                        </p>
                                      </div>
                                    </div>

                                    <div className="flex items-center gap-2 shrink-0">
                                      <Select
                                        value={att.attachmentType}
                                        onChange={(e) => handleUpdateFileType(att.id, e.target.value)}
                                        className="h-8 rounded-lg text-[11px] font-medium border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-zinc-900 w-48 shadow-none"
                                      >
                                        {requestForm.clientType === "Parent" ? (
                                          <>
                                            <option value="spa">Special Power of Attorney (SPA)</option>
                                            <option value="valid_id">Valid Government ID</option>
                                            <option value="evidence">Supporting Evidence</option>
                                            <option value="receipt">Proof of Payment</option>
                                            <option value="other">Other Document</option>
                                          </>
                                        ) : (
                                          <>
                                            <option value="evidence">Supporting Evidence</option>
                                            <option value="receipt">Proof of Payment / Receipt</option>
                                            <option value="clearance">Clearance Slip</option>
                                            <option value="other">Other Document</option>
                                          </>
                                        )}
                                      </Select>
                                      <button
                                        type="button"
                                        onClick={() => handleRemoveFile(att.id)}
                                        className="h-8 w-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer"
                                        title="Remove file"
                                      >
                                        <HugeIcon className="ph-bold ph-x text-xs" />
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Form Actions */}
                          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
                            <span className="text-xs text-gray-500 dark:text-zinc-400">
                              Requests are received and reviewed in order by the Registrar Office.
                            </span>
                            <div className="flex items-center gap-2.5 w-full sm:w-auto">
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsFormOpen(false)}
                                className="w-full sm:w-auto h-10 px-5 text-xs font-semibold rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-xs cursor-pointer active:scale-95 transition-all"
                              >
                                Hide
                              </Button>
                              <Button
                                type="submit"
                                disabled={requestSubmitting || docTypes.length === 0}
                                className="w-full sm:w-auto h-10 px-6 btn-brand-red text-white! font-semibold text-xs shadow-xs rounded-xl! gap-2 flex items-center justify-center dark:shadow-none active:scale-95 cursor-pointer border-0"
                                style={{ color: "#ffffff" }}
                              >
                                {requestSubmitting ? (
                                  <>
                                    <HugeIcon  className="ph-bold ph-spinner animate-spin text-sm text-white!"></HugeIcon>
                                    Submitting...
                                  </>
                                ) : (
                                  "Submit Request"
                                )}
                              </Button>
                            </div>
                          </div>
                        </form>
                      </div>
                    )}

                    {/* 3. Toolbar & Request History Header */}
                    <div className="border-t border-gray-100 dark:border-white/10 p-5 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 bg-gray-50/40 dark:bg-zinc-900/30">
                      {/* Left: Heading and count */}
                      <div className="flex items-center gap-3 shrink-0">
                        <div>
                          <h3 className="text-[15px] font-semibold text-gray-900 dark:text-zinc-50">Request History</h3>
                          <p className="mt-0.5 text-xs text-gray-500 dark:text-zinc-400">Track every Registrar update and status change in real time.</p>
                        </div>
                        {loading ? (
                          <Skeleton className="h-6 w-16 rounded-full dark:bg-muted" />
                        ) : (
                          <span className="self-center rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-600 dark:bg-zinc-800 dark:text-zinc-300">
                            {data.requests.length} total
                          </span>
                        )}
                      </div>

                      {/* Right: Search & Filter Group */}
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
                        <div className="relative flex-1 sm:w-64 lg:w-72 min-w-[200px] group">
                          <HugeIcon  className="ph-bold ph-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-zinc-500 transition-colors group-focus-within:text-pup-maroon dark:group-focus-within:text-red-400 text-xs pointer-events-none" />
                          <Input
                            type="text"
                            placeholder="Search ticket, document, notes..."
                            className="h-9 pl-8 pr-16 w-full rounded-xl text-xs font-normal border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-100 placeholder:text-gray-400 dark:placeholder:text-zinc-500 shadow-none focus-visible:outline-none focus-visible:border-pup-maroon focus-visible:ring-1 focus-visible:ring-pup-maroon dark:focus-visible:border-red-500/80 dark:focus-visible:ring-red-500/80"
                            value={requestSearch}
                            onChange={(e) => {
                              setRequestSearch(e.target.value);
                              setCurrentPage(1);
                            }}
                          />
                          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[11px] text-gray-400 dark:text-zinc-500">
                            {loading ? (
                              <Skeleton className="h-3.5 w-10 rounded dark:bg-muted" />
                            ) : (
                              filteredRequests.length
                            )}
                          </div>
                        </div>

                        <div className="w-full sm:w-auto shrink-0">
                          <MultiCriteriaFilter
                            title="Filter Requests"
                            groups={requestFilterGroups}
                            selected={requestFilters}
                            onChange={(newFilters) => {
                              setRequestFilters(newFilters);
                              setCurrentPage(1);
                            }}
                            totalCount={data.requests.length}
                            matchingCount={filteredRequests.length}
                            onReset={() => {
                              setRequestFilters({ status: [], doc_type: [] });
                              setCurrentPage(1);
                            }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* 4. Active Filter Chips Bar */}
                    <ActiveFilterChips
                      groups={requestFilterGroups}
                      selected={requestFilters}
                      onRemove={(groupId, val) => {
                        setRequestFilters((prev) => ({
                          ...prev,
                          [groupId]: (prev[groupId] || []).filter((v) => v !== val),
                        }));
                        setCurrentPage(1);
                      }}
                      searchQuery={requestSearch}
                      onClearSearch={() => {
                        setRequestSearch("");
                        setCurrentPage(1);
                      }}
                      onClearAll={() => {
                        setRequestSearch("");
                        setRequestFilters({ status: [], doc_type: [] });
                        setCurrentPage(1);
                      }}
                      className="border-t border-gray-100 dark:border-white/10 bg-white dark:bg-card px-6 py-2.5"
                    />

                    {/* 5. Request History Table */}
                    <div className="w-full overflow-x-auto border-t border-gray-100 dark:border-white/10 flex-1">
                      <table className="min-w-full text-sm">
                        <thead className="sticky top-0 z-10 border-b border-gray-100 dark:border-white/10 bg-white dark:bg-card">
                          <tr className="text-left text-[12px] font-medium tracking-[0.04em] text-[#8E8E93] dark:text-zinc-500">
                            <th className="p-4 w-36 min-w-[130px]">
                              <button
                                type="button"
                                onClick={() => handleSort("id")}
                                className={cn(
                                  "group flex items-center transition-colors focus:outline-none cursor-pointer text-[12px] font-medium tracking-[0.04em]",
                                  sortBy === "id" ? "text-[#111111] dark:text-white" : "text-[#8E8E93] dark:text-zinc-500 hover:text-[#111111] dark:hover:text-white"
                                )}
                              >
                                Ticket #
                                <SortIndicator column="id" sortBy={sortBy} sortOrder={sortOrder} />
                              </button>
                            </th>
                            <th className="p-4 min-w-[220px]">
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
                            <th className="p-4 min-w-[240px]">
                              <span className="flex items-center text-[12px] font-medium tracking-[0.04em] text-[#8E8E93] dark:text-zinc-500">
                                Purpose / Description
                              </span>
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
                            <th className="p-4 min-w-[170px]">
                              <button
                                type="button"
                                onClick={() => handleSort("created_at")}
                                className={cn(
                                  "group flex items-center transition-colors focus:outline-none cursor-pointer text-[12px] font-medium tracking-[0.04em]",
                                  sortBy === "created_at" ? "text-[#111111] dark:text-white" : "text-[#8E8E93] dark:text-zinc-500 hover:text-[#111111] dark:hover:text-white"
                                )}
                              >
                                Date Requested
                                <SortIndicator column="created_at" sortBy={sortBy} sortOrder={sortOrder} />
                              </button>
                            </th>
                            <th className="p-4 text-right min-w-[100px] text-[12px] font-medium tracking-[0.04em] text-[#8E8E93] dark:text-zinc-500">Action</th>
                          </tr>
                        </thead>
                        <tbody className="bg-transparent">
                          {loading ? (
                            <StudentRequestsTableRowsSkeleton rowCount={itemsPerPage || 6} />
                          ) : sortedRequests.length === 0 ? (
                            <tr className="border-0 hover:bg-transparent">
                              <td colSpan={6} className="p-12 text-center">
                                <Empty className="flex h-[320px] flex-col items-center justify-center border-0 bg-transparent text-center">
                                  <EmptyHeader className="flex flex-col items-center gap-0">
                                    <div className="relative mb-6">
                                      <div className="absolute inset-0 scale-150 animate-pulse rounded-full bg-gray-50 opacity-50 dark:bg-card"></div>
                                      <EmptyMedia className="relative z-10 flex h-20 w-20 items-center justify-center rounded-2xl border border-gray-100 bg-white shadow-md dark:border-white/10 dark:bg-card dark:shadow-none">
                                        <HugeIcon  className={hasActiveFilters ? "ph-magnifying-glass text-2xl text-pup-maroon" : "ph-tray text-2xl text-pup-maroon"}></HugeIcon>
                                      </EmptyMedia>
                                    </div>
                                    <EmptyTitle className="text-lg font-semibold text-gray-900 dark:text-zinc-50">
                                      {hasActiveFilters ? "No Matches Found" : "No Document Requests Yet"}
                                    </EmptyTitle>
                                    <EmptyDescription className="max-w-xs text-sm font-medium text-gray-500 dark:text-zinc-400">
                                      {hasActiveFilters
                                        ? "Try adjusting your search query or status filter."
                                        : "You haven't submitted any document requests yet. Click the button below to submit your first request."}
                                    </EmptyDescription>
                                    {hasActiveFilters ? (
                                      <Button
                                        variant="outline"
                                        onClick={() => {
                                          setRequestSearch("");
                                          setRequestFilters({ status: [], doc_type: [] });
                                          setCurrentPage(1);
                                        }}
                                        className="mt-6 flex h-10 items-center justify-center gap-2 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 px-5 text-xs font-semibold text-gray-700 dark:text-zinc-200 shadow-xs transition-all hover:bg-gray-50 dark:hover:bg-zinc-700 active:scale-95 cursor-pointer"
                                      >
                                        <HugeIcon className="ph-bold ph-arrow-counter-clockwise text-[14px] shrink-0" />
                                        <span>Clear Filters</span>
                                      </Button>
                                    ) : (
                                      <Button
                                        type="button"
                                        onClick={() => setIsFormOpen(true)}
                                        className="mt-5 flex h-10 px-5 text-xs font-semibold rounded-xl! btn-brand-red text-white! active:scale-95 disabled:opacity-50 transition-all cursor-pointer shadow-xs border-0"
                                        style={{ color: "#ffffff" }}
                                      >
                                        New Request
                                      </Button>
                                    )}
                                  </EmptyHeader>
                                </Empty>
                              </td>
                            </tr>
                          ) : (
                            paginatedRequests.map((item) => (
                              <tr
                                key={item.id}
                                onClick={() => setSelectedRequestForDetail(item)}
                                className="group h-[52px] border-b-[0.5px] border-gray-100 dark:border-white/10 last:border-b-0 transition-all duration-fast hover:bg-gray-50/50 dark:bg-card dark:hover:bg-white/2 select-none cursor-pointer"
                              >
                                <td className="py-0 px-4 align-middle text-[13px] font-medium text-gray-700 dark:text-zinc-300">
                                  #{item.id}
                                </td>
                                <td className="py-2 px-4 align-middle">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-[14px] font-medium text-[#111111] dark:text-zinc-100">
                                      {item.doc_type}
                                    </span>
                                    {item.client_type === "Parent" && (
                                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200/80 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/40">
                                        Parent/Guardian
                                      </span>
                                    )}
                                    {(Number(item.attachment_count) > 0 || (Array.isArray(item.attachments) && item.attachments.length > 0)) && (
                                      <span
                                        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-medium bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-400"
                                        title={`${item.attachment_count || item.attachments?.length} attachment(s)`}
                                      >
                                        <HugeIcon className="ph-bold ph-paperclip text-[11px]" />
                                        {item.attachment_count || item.attachments?.length}
                                      </span>
                                    )}
                                  </div>
                                </td>

                                <td className="py-0 px-4 align-middle max-w-[280px]">
                                  <div className="truncate text-[13px] font-normal text-[#8E8E93] dark:text-zinc-400" title={item.notes}>
                                    {item.notes || "—"}
                                  </div>
                                </td>
                                <td className="py-0 px-4 align-middle">
                                  <StatusBadge status={item.status} />
                                </td>
                                <td className="py-0 px-4 align-middle text-[13px] font-normal text-[#111111] dark:text-zinc-300 whitespace-nowrap">
                                  {formatPHDateTime(item.created_at)}
                                </td>
                                <td className="py-0 px-4 align-middle text-right" onClick={(e) => e.stopPropagation()}>
                                  <div className="flex items-center justify-end gap-1.5">
                                    {item.feedback ? (
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setFeedbackRequest(item);
                                              setFeedbackInitialRating(item.feedback.rating || 0);
                                              setFeedbackModalOpen(true);
                                            }}
                                            aria-label={`Rated ${item.feedback.rating}/5 stars. Click to edit feedback.`}
                                            className="w-7 h-7 rounded-lg flex items-center justify-center text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-colors cursor-pointer active:scale-95"
                                          >
                                            <HugeIcon className="ph-fill ph-star text-[15px]" />
                                          </button>
                                        </TooltipTrigger>
                                        <TooltipContent>Rated {item.feedback.rating}/5 stars. Click to edit.</TooltipContent>
                                      </Tooltip>
                                    ) : (
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setFeedbackRequest(item);
                                              setFeedbackInitialRating(0);
                                              setFeedbackModalOpen(true);
                                            }}
                                            aria-label="Rate Service"
                                            className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-colors cursor-pointer active:scale-95"
                                          >
                                            <HugeIcon className="ph-bold ph-star text-[15px]" />
                                          </button>
                                        </TooltipTrigger>
                                        <TooltipContent>Rate Service</TooltipContent>
                                      </Tooltip>
                                    )}
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <button
                                          type="button"
                                          onClick={() => setSelectedRequestForDetail(item)}
                                          aria-label="View Request Updates Timeline"
                                          className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10 hover:text-pup-maroon dark:hover:text-red-400 transition-colors cursor-pointer active:scale-95"
                                        >
                                          <HugeIcon className="ph-bold ph-clock-counter-clockwise text-[15px]" />
                                        </button>
                                      </TooltipTrigger>
                                      <TooltipContent>View Timeline</TooltipContent>
                                    </Tooltip>
                                  </div>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* 6. Pagination Bar */}
                    {loading ? (
                      <StudentRequestsPaginationSkeleton />
                    ) : filteredRequests.length > 0 ? (
                      <div className="flex items-center justify-between border-t border-[#e5e5ea] dark:border-[#3a3a3c] bg-white dark:bg-[#1c1c1e] p-4 px-6 rounded-b-2xl mt-auto">
                        <div className="flex items-center gap-6 text-xs text-gray-500 dark:text-zinc-400 select-none">
                          <span>
                            Showing {paginatedRequests.length} of {filteredRequests.length.toLocaleString()}
                          </span>
                          <div className="flex items-center gap-2">
                            <span>Rows:</span>
                            {[5, 10, 20, 50].map((size) => (
                              <button
                                key={size}
                                type="button"
                                onClick={() => {
                                  setItemsPerPage(size);
                                  setCurrentPage(1);
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
                            disabled={displayPage <= 1}
                            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                            className="text-xs text-gray-500 dark:text-zinc-400 disabled:opacity-40 cursor-pointer rounded-xl h-8 px-3"
                          >
                            Prev
                          </Button>

                          <div className="h-8 w-8 rounded-xl border border-[#e5e5ea] dark:border-zinc-800 flex items-center justify-center text-xs font-bold text-gray-800 dark:text-zinc-200 bg-white dark:bg-zinc-900">
                            {displayPage}
                          </div>

                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={displayPage >= totalPages}
                            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                            className="text-xs text-gray-500 dark:text-zinc-400 disabled:opacity-40 cursor-pointer rounded-xl h-8 px-3"
                          >
                            Next
                          </Button>
                        </div>
                      </div>
                    ) : null}
                  </Card>
                </div>
              ) : (
                <Card
                  className="flex h-auto w-full flex-col p-0 gap-0 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-card dark:shadow-none isolate font-jakarta mb-4 min-h-0 flex-1 focus:outline-none"
                  tabIndex={0}
                >
                  {/* 1. Page Header */}
                  <PageHeader
                    icon="ph-file-text"
                    title="OSAS Submissions"
                    description="Submit organization event proposals and follow evaluation progress."
                    showBorder={false}
                    className="p-6"
                    titleClassName="text-[18px] font-semibold tracking-[-0.01em] text-gray-900 dark:text-zinc-50"
                    descriptionClassName="text-[13px] font-normal text-gray-500 dark:text-zinc-400 mt-[4px]"
                    actions={
                      <div className="flex items-center gap-3 sm:gap-4">
                        {me?.student_no && (
                          <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-red-50 text-pup-maroon border border-red-100 dark:bg-red-950/30 dark:border-red-900/30">
                            <HugeIcon  className="ph-fill ph-student text-[13px]"></HugeIcon>
                            {me.student_no}
                          </span>
                        )}
                        <RefreshButton
                          onRefresh={async () => {
                            setRefreshing(true);
                            try {
                              await load();
                            } finally {
                              setRefreshing(false);
                            }
                          }}
                          isLoading={refreshing}
                          title="Refresh Records"
                        />
                        
                        <Button
                          type="button"
                          onClick={() => setIsFormOpen((prev) => !prev)}
                          variant={isFormOpen ? "outline" : "default"}
                          disabled={myOrganizations.length === 0}
                          title={myOrganizations.length === 0 ? "You must be an authorized officer in the OSAS whitelist to submit proposals" : undefined}
                          className={cn(
                            "flex h-10 px-5 text-xs font-semibold rounded-xl! active:scale-95 transition-all cursor-pointer shadow-xs",
                            isFormOpen
                              ? "border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700"
                              : "btn-brand-red text-white! border-0",
                            myOrganizations.length === 0 && "opacity-50 cursor-not-allowed"
                          )}
                          style={!isFormOpen && myOrganizations.length > 0 ? { color: "#ffffff" } : undefined}
                        >
                          {isFormOpen ? "Hide Form" : osasSubView === "proposals" ? "New Proposal" : osasSubView === "post_event" ? "New Report" : "New Revision"}
                        </Button>
                      </div>
                    }
                  />

                  {/* Verified Officer Affiliation Banner */}
                  {myOrganizations.length > 0 ? (
                    <div className="mx-6 mb-2 p-4 rounded-xl border border-blue-200/70 dark:border-blue-900/40 bg-blue-50/50 dark:bg-blue-950/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 flex items-center justify-center shrink-0">
                          <HugeIcon className="ph-bold ph-shield-check text-base" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-gray-900 dark:text-zinc-100 flex items-center gap-2">
                            <span>Verified Student Officer</span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
                              Authorized Submitter
                            </span>
                          </div>
                          <div className="text-xs text-gray-600 dark:text-zinc-400 mt-0.5">
                            {myOrganizations.map((o) => `${o.organization_name} (${o.officer_position})`).join(" · ")}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="mx-6 mb-2 p-4 rounded-xl border border-amber-200 dark:border-amber-900/30 bg-amber-50/50 dark:bg-amber-950/20 flex items-start gap-3">
                      <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0 mt-0.5">
                        <HugeIcon className="ph-bold ph-info text-base" />
                      </div>
                      <div className="text-xs text-amber-900 dark:text-amber-200 leading-relaxed">
                        <div className="font-bold mb-0.5">Officer Whitelist Notice</div>
                        Event proposals may only be submitted by recognized student organization officers whitelisted by OSAS. If you represent an accredited organization, please contact OSAS to whitelist your student account (<strong>{me?.email}</strong>).
                      </div>
                    </div>
                  )}

                  {/* OSAS Stream Switcher */}
                  <div className="flex items-center gap-1.5 p-1 rounded-xl bg-gray-100/80 dark:bg-zinc-800/60 border border-gray-200/60 dark:border-white/5 mx-6 mb-4">
                    <button
                      type="button"
                      onClick={() => setOsasSubView("proposals")}
                      className={cn(
                        "flex-1 inline-flex items-center justify-center gap-2 py-2 px-3 text-xs font-semibold rounded-lg transition-all cursor-pointer",
                        osasSubView === "proposals"
                          ? "bg-pup-maroon text-white shadow-xs"
                          : "text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white"
                      )}
                    >
                      <HugeIcon className="ph-bold ph-calendar-blank text-sm" />
                      <span>Event Proposals</span>
                      <span className={cn(
                        "px-1.5 py-0.2 rounded-full text-[10px] font-bold",
                        osasSubView === "proposals" ? "bg-white/20 text-white" : "bg-gray-200/80 dark:bg-zinc-700 text-gray-700 dark:text-zinc-300"
                      )}>
                        {data.proposals.length}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setOsasSubView("post_event")}
                      className={cn(
                        "flex-1 inline-flex items-center justify-center gap-2 py-2 px-3 text-xs font-semibold rounded-lg transition-all cursor-pointer",
                        osasSubView === "post_event"
                          ? "bg-pup-maroon text-white shadow-xs"
                          : "text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white"
                      )}
                    >
                      <HugeIcon className="ph-bold ph-clipboard-text text-sm" />
                      <span>Post-Event & Liquidation</span>
                      {pendingPostEvents.length > 0 ? (
                        <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-500 text-white animate-pulse">
                          {pendingPostEvents.length} Action
                        </span>
                      ) : (
                        <span className={cn(
                          "px-1.5 py-0.2 rounded-full text-[10px] font-bold",
                          osasSubView === "post_event" ? "bg-white/20 text-white" : "bg-gray-200/80 dark:bg-zinc-700 text-gray-700 dark:text-zinc-300"
                        )}>
                          {postEventReports.length}
                        </span>
                      )}
                    </button>
                  </div>

                  {/* STREAM 1: EVENT PROPOSALS */}
                  {osasSubView === "proposals" && (
                    <>
                      {/* Inline Proposal Form Section */}
                      {isFormOpen && myOrganizations.length > 0 && (
                        <div className="border-t border-gray-100 dark:border-white/10 p-5 sm:p-6 bg-gray-50/40 dark:bg-zinc-900/20 animate-in fade-in slide-in-from-top-2 duration-fast">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100 dark:border-white/10">
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50 text-pup-maroon dark:bg-red-950/40 dark:text-red-400">
                                <HugeIcon className="ph-bold ph-plus-circle text-xl" />
                              </div>
                              <div>
                                <h2 className="text-[15px] font-semibold text-gray-900 dark:text-zinc-50">New Event Proposal</h2>
                                <p className="text-xs text-gray-500 dark:text-zinc-400">Upload a PDF proposal for OSAS review and evaluation.</p>
                              </div>
                            </div>
                          </div>

                          <form onSubmit={submitProposal} className="flex flex-col gap-4 mt-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                              <div className="min-w-0">
                                <label htmlFor="osas-event-title" className="mb-1.5 block text-xs font-semibold text-gray-700 dark:text-zinc-200">
                                  Event Title <span className="text-red-500">*</span>
                                </label>
                                <Input
                                  id="osas-event-title"
                                  placeholder="Enter event title"
                                  value={proposalForm.title}
                                  onChange={(e) => setProposalForm({ ...proposalForm, title: e.target.value })}
                                  required
                                  className="h-10 w-full rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 px-3 text-xs text-gray-900 dark:text-zinc-100 placeholder:text-gray-400 dark:placeholder:text-zinc-500 shadow-none outline-none focus-visible:border-pup-maroon focus-visible:ring-1 focus-visible:ring-pup-maroon dark:focus-visible:border-red-500/80 dark:focus-visible:ring-red-500/80"
                                />
                              </div>

                              <div className="min-w-0">
                                <label htmlFor="osas-org-name" className="mb-1.5 block text-xs font-semibold text-gray-700 dark:text-zinc-200">
                                  Authorized Organization <span className="text-red-500">*</span>
                                </label>
                                <Select
                                  id="osas-org-name"
                                  value={proposalForm.organizationId || (myOrganizations[0]?.organization_id || "")}
                                  onChange={(e) => {
                                    const orgId = e.target.value;
                                    const org = myOrganizations.find((o) => o.organization_id === orgId);
                                    setProposalForm({
                                      ...proposalForm,
                                      organizationId: orgId,
                                      organizationName: org?.organization_name || "",
                                    });
                                  }}
                                  className="h-10 w-full rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 text-xs text-gray-900 dark:text-zinc-100 shadow-none"
                                >
                                  {myOrganizations.map((o) => (
                                    <option key={o.organization_id} value={o.organization_id}>
                                      {o.organization_name} {o.acronym ? `(${o.acronym})` : ""} — {o.officer_position}
                                    </option>
                                  ))}
                                </Select>
                              </div>

                              <div className="min-w-0">
                                <label htmlFor="osas-event-date" className="mb-1.5 block text-xs font-semibold text-gray-700 dark:text-zinc-200">
                                  Event Date <span className="text-red-500">*</span>
                                </label>
                                <Input
                                  id="osas-event-date"
                                  type="date"
                                  aria-label="Event date"
                                  value={proposalForm.eventDate}
                                  onClick={(e) => e.currentTarget.showPicker?.()}
                                  onChange={(e) => setProposalForm({ ...proposalForm, eventDate: e.target.value })}
                                  required
                                  className="h-10 w-full rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 px-3 text-xs text-gray-900 dark:text-zinc-100 placeholder:text-gray-400 dark:placeholder:text-zinc-500 shadow-none outline-none focus-visible:border-pup-maroon focus-visible:ring-1 focus-visible:ring-pup-maroon dark:focus-visible:border-red-500/80 dark:focus-visible:ring-red-500/80"
                                />
                              </div>
                            </div>

                            <div>
                              <label htmlFor="osas-proposal-file" className="mb-1.5 block text-xs font-semibold text-gray-700 dark:text-zinc-200">
                                Proposal PDF <span className="text-red-500">*</span>
                              </label>
                              <Input
                                id="osas-proposal-file"
                                type="file"
                                accept="application/pdf"
                                onChange={(e) => setProposalForm({ ...proposalForm, file: e.target.files?.[0] || null })}
                                required
                                className="h-10 w-full rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 px-3 text-xs text-gray-900 dark:text-zinc-100 file:mr-3 file:border-0 file:bg-transparent file:text-xs file:font-medium file:text-gray-500 shadow-none outline-none focus-visible:border-pup-maroon focus-visible:ring-1 focus-visible:ring-pup-maroon dark:focus-visible:border-red-500/80 dark:focus-visible:ring-red-500/80"
                              />
                            </div>

                            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
                              <span className="text-xs text-gray-500 dark:text-zinc-400">
                                Proposals are received and evaluated by the OSAS office.
                              </span>
                              <div className="flex items-center gap-2.5 w-full sm:w-auto">
                                <Button
                                  type="button"
                                  variant="outline"
                                  onClick={() => setIsFormOpen(false)}
                                  className="w-full sm:w-auto h-10 px-5 text-xs font-semibold rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-xs cursor-pointer active:scale-95 transition-all"
                                >
                                  Hide
                                </Button>
                                <Button
                                  type="submit"
                                  disabled={proposalSubmitting}
                                  className="w-full sm:w-auto h-10 px-6 btn-brand-red text-white! font-semibold text-xs shadow-xs rounded-xl! gap-2 flex items-center justify-center dark:shadow-none active:scale-95 cursor-pointer border-0"
                                  style={{ color: "#ffffff" }}
                                >
                                  {proposalSubmitting ? (
                                    <>
                                      <HugeIcon className="ph-bold ph-spinner animate-spin text-sm text-white!"></HugeIcon>
                                      Submitting...
                                    </>
                                  ) : (
                                    "Submit Proposal"
                                  )}
                                </Button>
                              </div>
                            </div>
                          </form>
                        </div>
                      )}

                      {/* Proposals History Header */}
                      <div className="border-t border-gray-100 dark:border-white/10 p-5 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 bg-gray-50/40 dark:bg-zinc-900/30">
                        <div className="flex items-center gap-3 shrink-0">
                          <div>
                            <h3 className="text-[15px] font-semibold text-gray-900 dark:text-zinc-50">Event Proposals History</h3>
                            <p className="mt-0.5 text-xs text-gray-500 dark:text-zinc-400">Follow OSAS review updates, approval standing, and post-event requirements.</p>
                          </div>
                          {loading ? (
                            <Skeleton className="h-6 w-16 rounded-full dark:bg-muted" />
                          ) : (
                            <span className="self-center rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-600 dark:bg-zinc-800 dark:text-zinc-300">
                              {data.proposals.length} total
                            </span>
                          )}
                        </div>

                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
                          <div className="relative flex-1 sm:w-64 lg:w-72 min-w-[200px] group">
                            <HugeIcon className="ph-bold ph-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-zinc-500 transition-colors group-focus-within:text-pup-maroon dark:group-focus-within:text-red-400 text-xs pointer-events-none" />
                            <Input
                              type="text"
                              placeholder="Search proposals..."
                              className="h-9 pl-8 pr-16 w-full rounded-xl text-xs font-normal border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-100 placeholder:text-gray-400 dark:placeholder:text-zinc-500 shadow-none focus-visible:outline-none focus-visible:border-pup-maroon focus-visible:ring-1 focus-visible:ring-pup-maroon dark:focus-visible:border-red-500/80 dark:focus-visible:ring-red-500/80"
                              value={proposalSearch}
                              onChange={(e) => setProposalSearch(e.target.value)}
                            />
                          </div>

                          <div className="w-full sm:w-auto shrink-0">
                            <MultiCriteriaFilter
                              title="Filter Proposals"
                              groups={proposalFilterGroups}
                              selected={proposalFilters}
                              onChange={setProposalFilters}
                              totalCount={data.proposals.length}
                              matchingCount={filteredProposals.length}
                              onReset={() => setProposalFilters({ status: [], organization: [] })}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Proposals List */}
                      <div className="border-t border-gray-100 dark:border-white/10 flex-1">
                        {loading ? (
                          <div className="p-5">
                            <StudentOsasProposalsListSkeleton count={3} />
                          </div>
                        ) : data.proposals.length === 0 ? (
                          <div className="p-12 text-center">
                            <Empty className="flex h-[320px] flex-col items-center justify-center border-0 bg-transparent text-center">
                              <EmptyHeader className="flex flex-col items-center gap-0">
                                <EmptyTitle className="text-lg font-semibold text-gray-900 dark:text-zinc-50">
                                  No Event Proposals Yet
                                </EmptyTitle>
                                <EmptyDescription className="max-w-xs text-sm font-medium text-gray-500 dark:text-zinc-400">
                                  You haven&apos;t submitted any event proposals yet. Use the form above to submit your first proposal.
                                </EmptyDescription>
                                <Button
                                  type="button"
                                  onClick={() => setIsFormOpen(true)}
                                  className="mt-5 flex h-10 px-5 text-xs font-semibold rounded-xl! btn-brand-red text-white! active:scale-95 cursor-pointer shadow-xs border-0"
                                  style={{ color: "#ffffff" }}
                                >
                                  New Proposal
                                </Button>
                              </EmptyHeader>
                            </Empty>
                          </div>
                        ) : filteredProposals.length === 0 ? (
                          <div className="p-12 text-center">
                            <Empty className="flex h-[240px] flex-col items-center justify-center border-0 bg-transparent text-center">
                              <EmptyHeader className="flex flex-col items-center gap-0">
                                <EmptyTitle className="text-base font-semibold text-gray-900 dark:text-zinc-50">
                                  No matching proposals
                                </EmptyTitle>
                                <EmptyDescription className="max-w-xs text-xs font-medium text-gray-500 dark:text-zinc-400 mt-1">
                                  No event proposals match your current search or combined filter criteria.
                                </EmptyDescription>
                              </EmptyHeader>
                            </Empty>
                          </div>
                        ) : (
                          <div className="p-5 space-y-3">
                            {filteredProposals.map((item) => (
                              <article
                                key={item.id}
                                onClick={() => setSelectedProposalForDetail(item)}
                                className="group rounded-xl border border-gray-200 p-4 dark:border-white/10 hover:bg-gray-50/50 dark:hover:bg-white/2 transition-colors cursor-pointer select-none"
                              >
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <h3 className="text-[14px] font-medium text-[#111111] dark:text-zinc-100 group-hover:text-pup-maroon dark:group-hover:text-red-400 transition-colors">
                                    {item.title}
                                  </h3>
                                  <div className="flex items-center gap-2">
                                    <StatusBadge status={item.status} />
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleOpenPdfPreview(item);
                                      }}
                                      title="View Proposal Document"
                                      className="inline-flex h-7 w-7 items-center justify-center rounded-[6px] text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10 hover:text-pup-maroon dark:hover:text-red-400 transition-colors cursor-pointer"
                                    >
                                      <HugeIcon className="ph-bold ph-file-pdf text-[16px]"></HugeIcon>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedProposalForDetail(item);
                                      }}
                                      title="View Proposal Details & Timeline"
                                      className="inline-flex h-7 w-7 items-center justify-center rounded-[6px] text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10 hover:text-pup-maroon dark:hover:text-red-400 transition-colors cursor-pointer"
                                    >
                                      <HugeIcon className="ph-bold ph-clock-counter-clockwise text-[16px]"></HugeIcon>
                                    </button>
                                  </div>
                                </div>
                                <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                                  <p className="text-[13px] font-normal text-[#8E8E93] dark:text-zinc-400">
                                    {item.organization_name} · {item.event_date}
                                  </p>
                                  {item.status === "Approved" && (
                                    <div className="flex items-center gap-2">
                                      {item.post_event_status === "Cleared" ? (
                                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
                                          <HugeIcon className="ph-bold ph-check text-xs" />
                                          Post-Event Cleared
                                        </span>
                                      ) : item.post_event_status === "Submitted" || item.post_event_status === "Under Review" ? (
                                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-sky-100 text-sky-800 dark:bg-sky-950/50 dark:text-sky-300">
                                          <HugeIcon className="ph-bold ph-hourglass text-xs" />
                                          Post-Event In Review
                                        </span>
                                      ) : (
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setOsasSubView("post_event");
                                            setPostEventForm((prev) => ({
                                              ...prev,
                                              eventProposalId: String(item.id),
                                              organizationId: item.organization_id || myOrganizations[0]?.organization_id || "",
                                            }));
                                            setIsFormOpen(true);
                                          }}
                                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-amber-600 hover:bg-amber-700 text-white shadow-xs active:scale-95 transition-all cursor-pointer"
                                        >
                                          <span>Submit Post-Event Report</span>
                                          <HugeIcon className="ph-bold ph-arrow-right text-[12px]" />
                                        </button>
                                      )}
                                    </div>
                                  )}
                                </div>
                                <ol className="mt-3 space-y-2 border-l-2 border-gray-200 pl-4 text-xs text-gray-500 dark:border-white/10 dark:text-zinc-400">
                                  {item.updates?.map((update) => (
                                    <li key={update.id}>
                                      <span className="font-semibold text-gray-700 dark:text-zinc-300">{update.status}</span> — {update.message || "Status updated"}
                                    </li>
                                  ))}
                                </ol>
                              </article>
                            ))}
                          </div>
                        )}
                      </div>
                    </>
                  )}

                  {/* STREAM 2: POST-EVENT & LIQUIDATION REPORTS */}
                  {osasSubView === "post_event" && (
                    <div className="flex flex-col flex-1 min-h-0">
                      {pendingPostEvents.length > 0 && (
                        <div className="mx-6 mt-2 mb-4 p-4 rounded-xl border border-amber-200 dark:border-amber-900/40 bg-amber-50/70 dark:bg-amber-950/30 flex items-start gap-3">
                          <HugeIcon className="ph-bold ph-warning-circle text-amber-600 dark:text-amber-400 text-lg mt-0.5 shrink-0" />
                          <div className="text-xs text-amber-900 dark:text-amber-200">
                            <span className="font-bold">Pending Post-Event Compliance:</span> You have{" "}
                            <strong>{pendingPostEvents.length}</strong> approved event(s) requiring accomplishment narrative reports and financial liquidation.
                          </div>
                        </div>
                      )}

                      {/* Post-Event Submission Form */}
                      {isFormOpen && myOrganizations.length > 0 && (
                        <div className="border-t border-gray-100 dark:border-white/10 p-5 sm:p-6 bg-gray-50/40 dark:bg-zinc-900/20 animate-in fade-in slide-in-from-top-2 duration-fast">
                          <div className="flex items-center gap-3 pb-4 border-b border-gray-100 dark:border-white/10">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50 text-pup-maroon dark:bg-red-950/40 dark:text-red-400">
                              <HugeIcon className="ph-bold ph-clipboard-text text-xl" />
                            </div>
                            <div>
                              <h2 className="text-[15px] font-semibold text-gray-900 dark:text-zinc-50">New Post-Event & Liquidation Report</h2>
                              <p className="text-xs text-gray-500 dark:text-zinc-400">Submit accomplishment documentation, attendance figures, and liquidation receipts for an approved event.</p>
                            </div>
                          </div>

                          <form onSubmit={submitPostEventReport} className="flex flex-col gap-4 mt-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                              <div className="min-w-0">
                                <label className="mb-1.5 block text-xs font-semibold text-gray-700 dark:text-zinc-200">
                                  Approved Event Proposal <span className="text-red-500">*</span>
                                </label>
                                <Select
                                  value={postEventForm.eventProposalId}
                                  onChange={(e) => {
                                    const pId = e.target.value;
                                    const p = (data.proposals || []).find((x) => String(x.id) === pId);
                                    setPostEventForm((prev) => ({
                                      ...prev,
                                      eventProposalId: pId,
                                      organizationId: p?.organization_id || prev.organizationId,
                                    }));
                                  }}
                                  className="h-10 w-full rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 text-xs text-gray-900 dark:text-zinc-100 shadow-none"
                                >
                                  <option value="">Select an approved event...</option>
                                  {data.proposals?.filter((p) => p.status === "Approved").map((p) => (
                                    <option key={p.id} value={p.id}>
                                      {p.title} ({p.event_date}) — {p.organization_name}
                                    </option>
                                  ))}
                                </Select>
                              </div>

                              <div className="min-w-0">
                                <label className="mb-1.5 block text-xs font-semibold text-gray-700 dark:text-zinc-200">
                                  Actual Attendees Count
                                </label>
                                <Input
                                  type="number"
                                  min="0"
                                  placeholder="e.g. 150"
                                  value={postEventForm.actualAttendance}
                                  onChange={(e) => setPostEventForm({ ...postEventForm, actualAttendance: e.target.value })}
                                  className="h-10 w-full rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 px-3 text-xs text-gray-900 dark:text-zinc-100 placeholder:text-gray-400 dark:placeholder:text-zinc-500 shadow-none outline-none focus-visible:border-pup-maroon focus-visible:ring-1 focus-visible:ring-pup-maroon dark:focus-visible:border-red-500/80 dark:focus-visible:ring-red-500/80"
                                />
                              </div>

                              <div className="min-w-0">
                                <label className="mb-1.5 block text-xs font-semibold text-gray-700 dark:text-zinc-200">
                                  Total Expenses Liquidated (PHP)
                                </label>
                                <Input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  placeholder="e.g. 5200.00"
                                  value={postEventForm.totalExpenses}
                                  onChange={(e) => setPostEventForm({ ...postEventForm, totalExpenses: e.target.value })}
                                  className="h-10 w-full rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 px-3 text-xs text-gray-900 dark:text-zinc-100 placeholder:text-gray-400 dark:placeholder:text-zinc-500 shadow-none outline-none focus-visible:border-pup-maroon focus-visible:ring-1 focus-visible:ring-pup-maroon dark:focus-visible:border-red-500/80 dark:focus-visible:ring-red-500/80"
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <label className="mb-1.5 block text-xs font-semibold text-gray-700 dark:text-zinc-200">
                                  Narrative Accomplishment Report (PDF) <span className="text-red-500">*</span>
                                </label>
                                <Input
                                  type="file"
                                  accept="application/pdf"
                                  onChange={(e) => setPostEventForm({ ...postEventForm, narrativeFile: e.target.files?.[0] || null })}
                                  required
                                  className="h-10 w-full rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 px-3 text-xs text-gray-900 dark:text-zinc-100 file:mr-3 file:border-0 file:bg-transparent file:text-xs file:font-medium file:text-gray-500 shadow-none outline-none focus-visible:border-pup-maroon focus-visible:ring-1 focus-visible:ring-pup-maroon dark:focus-visible:border-red-500/80 dark:focus-visible:ring-red-500/80"
                                />
                              </div>

                              <div>
                                <label className="mb-1.5 block text-xs font-semibold text-gray-700 dark:text-zinc-200">
                                  Financial Liquidation & Receipts (PDF)
                                </label>
                                <Input
                                  type="file"
                                  accept="application/pdf"
                                  onChange={(e) => setPostEventForm({ ...postEventForm, liquidationFile: e.target.files?.[0] || null })}
                                  className="h-10 w-full rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 px-3 text-xs text-gray-900 dark:text-zinc-100 file:mr-3 file:border-0 file:bg-transparent file:text-xs file:font-medium file:text-gray-500 shadow-none outline-none focus-visible:border-pup-maroon focus-visible:ring-1 focus-visible:ring-pup-maroon dark:focus-visible:border-red-500/80 dark:focus-visible:ring-red-500/80"
                                />
                              </div>
                            </div>

                            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
                              <span className="text-xs text-gray-500 dark:text-zinc-400">
                                Post-event reports are audited by OSAS for compliance scoring and accreditation.
                              </span>
                              <div className="flex items-center gap-2.5 w-full sm:w-auto">
                                <Button
                                  type="button"
                                  variant="outline"
                                  onClick={() => setIsFormOpen(false)}
                                  className="w-full sm:w-auto h-10 px-5 text-xs font-semibold rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-xs cursor-pointer active:scale-95 transition-all"
                                >
                                  Hide
                                </Button>
                                <Button
                                  type="submit"
                                  disabled={postEventSubmitting}
                                  className="w-full sm:w-auto h-10 px-6 btn-brand-red text-white! font-semibold text-xs shadow-xs rounded-xl! gap-2 flex items-center justify-center dark:shadow-none active:scale-95 cursor-pointer border-0"
                                  style={{ color: "#ffffff" }}
                                >
                                  {postEventSubmitting ? "Submitting Report..." : "Submit Post-Event Report"}
                                </Button>
                              </div>
                            </div>
                          </form>
                        </div>
                      )}

                      {/* Post-Event Reports List */}
                      <div className="border-t border-gray-100 dark:border-white/10 p-5 bg-gray-50/40 dark:bg-zinc-900/30 flex items-center justify-between">
                        <div>
                          <h3 className="text-[15px] font-semibold text-gray-900 dark:text-zinc-50">Post-Event Reports History</h3>
                          <p className="mt-0.5 text-xs text-gray-500 dark:text-zinc-400">Official post-event accomplishment reports, liquidation audit records, and OSAS clearance.</p>
                        </div>
                        <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-600 dark:bg-zinc-800 dark:text-zinc-300">
                          {postEventReports.length} total
                        </span>
                      </div>

                      <div className="border-t border-gray-100 dark:border-white/10 flex-1 p-5 space-y-3">
                        {postEventReports.length === 0 ? (
                          <div className="p-8 text-center text-xs text-gray-500 dark:text-zinc-400">
                            No post-event reports submitted yet. Use the form above to submit your first report.
                          </div>
                        ) : (
                          postEventReports.map((report) => (
                            <div key={report.id} className="p-4 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-900/50 space-y-3">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <div>
                                  <h4 className="text-sm font-semibold text-gray-900 dark:text-zinc-100">{report.event_title}</h4>
                                  <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">
                                    {report.organization_name} · Attendees: <strong>{report.actual_attendance || 0}</strong> · Expenses: <strong>₱{Number(report.total_expenses || 0).toLocaleString()}</strong>
                                  </p>
                                </div>
                                <div className="flex items-center gap-2">
                                  <StatusBadge status={report.status} />
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleOpenPdfPreview(null, {
                                      url: `/api/student/post-event-reports/${report.id}?file=narrative`,
                                      title: `Narrative Report — ${report.event_title}`,
                                      subtitle: `Submitted by ${report.submitted_by_email}`,
                                      studentName: me?.name || "Student",
                                      docType: "Post-Event Narrative Report",
                                      originalFilename: report.narrative_original_filename,
                                    })}
                                    className="h-7 px-2.5 text-[11px] font-semibold rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 shadow-xs cursor-pointer active:scale-95 transition-all"
                                  >
                                    Preview Narrative
                                  </Button>
                                  {report.liquidation_storage_filename && (
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleOpenPdfPreview(null, {
                                        url: `/api/student/post-event-reports/${report.id}?file=liquidation`,
                                        title: `Financial Liquidation — ${report.event_title}`,
                                        subtitle: `Submitted by ${report.submitted_by_email}`,
                                        studentName: me?.name || "Student",
                                        docType: "Financial Liquidation Report",
                                        originalFilename: report.liquidation_original_filename,
                                      })}
                                      className="h-7 px-2.5 text-[11px] font-semibold rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 shadow-xs cursor-pointer active:scale-95 transition-all"
                                    >
                                      Preview Liquidation
                                    </Button>
                                  )}
                                </div>
                              </div>
                              {report.review_note && (
                                <div className="p-2.5 rounded-lg bg-gray-50 dark:bg-zinc-800/60 border border-gray-100 dark:border-zinc-800 text-xs text-gray-600 dark:text-zinc-300">
                                  <span className="font-semibold text-gray-800 dark:text-zinc-100">OSAS Note:</span> {report.review_note}
                                </div>
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </Card>
              )}
              </div>
            </div>
          </main>
        </div>
      </div>

      {/* Request Details & Timeline — Sheet Slide-Over */}
      <Sheet
        open={Boolean(selectedRequestForDetail)}
        onOpenChange={(open) => !open && setSelectedRequestForDetail(null)}
      >
        <SheetContent side="right" className="w-full sm:max-w-xl md:max-w-2xl lg:max-w-3xl data-[side=right]:w-full data-[side=right]:sm:max-w-xl data-[side=right]:md:max-w-2xl data-[side=right]:lg:max-w-3xl flex flex-col font-jakarta dark:bg-[#1c1c1e]">
          <SheetHeader className="border-b border-gray-100 dark:border-white/10 p-5 pb-4 space-y-2">
            <div className="flex items-center justify-between pr-8">
              <span className="text-xs font-semibold text-pup-maroon bg-red-50 dark:bg-red-950/40 px-3 py-1 rounded-full border border-red-100 dark:border-red-900/30">
                Request #{selectedRequestForDetail?.id}
              </span>
              <StatusBadge status={selectedRequestForDetail?.status} />
            </div>
            <SheetTitle className="text-lg font-bold text-gray-900 dark:text-zinc-50">
              {selectedRequestForDetail?.doc_type}
            </SheetTitle>
            <SheetDescription className="text-xs text-gray-500 dark:text-zinc-400">
              Submitted on {selectedRequestForDetail?.created_at ? formatPHDateTime(selectedRequestForDetail.created_at) : "—"} · {selectedRequestForDetail?.client_type || "Student"}
              {selectedRequestForDetail?.student_no ? ` (${selectedRequestForDetail.student_no})` : ""}
              {selectedRequestForDetail?.course_code ? ` · ${selectedRequestForDetail.course_code}` : ""}
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            <div className="rounded-xl bg-gray-50 dark:bg-zinc-900/50 p-3.5 border border-gray-100 dark:border-zinc-800">
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-zinc-400 mb-1">
                Purpose / Description
              </h4>
              <p className="text-gray-800 dark:text-zinc-200 text-xs leading-relaxed whitespace-pre-wrap">
                {selectedRequestForDetail?.notes || "No additional description provided."}
              </p>
            </div>

            {/* Experience Rating & Feedback */}
            {selectedRequestForDetail?.feedback ? (
              <div className="rounded-xl bg-amber-50/50 dark:bg-amber-950/20 p-4 border border-amber-200/70 dark:border-amber-900/40 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex h-6 w-6 items-center justify-center rounded-md bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400">
                      <HugeIcon className="ph-fill ph-star text-xs" />
                    </div>
                    <h4 className="text-[12px] font-semibold text-gray-900 dark:text-zinc-100">
                      Your Experience Rating
                    </h4>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setFeedbackRequest(selectedRequestForDetail);
                      setFeedbackInitialRating(selectedRequestForDetail.feedback?.rating || 0);
                      setFeedbackModalOpen(true);
                    }}
                    className="text-[11px] font-semibold text-pup-maroon hover:underline dark:text-red-400 cursor-pointer"
                  >
                    Edit Feedback
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-2.5 pt-0.5">
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <svg
                        key={star}
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        className={cn(
                          "h-4 w-4",
                          star <= selectedRequestForDetail.feedback.rating
                            ? "fill-amber-400 text-amber-400"
                            : "fill-transparent text-gray-300 dark:text-zinc-600"
                        )}
                        stroke="currentColor"
                        strokeWidth="1.5"
                      >
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                      </svg>
                    ))}
                  </div>
                  <span className="text-xs font-semibold text-gray-800 dark:text-zinc-200">
                    {selectedRequestForDetail.feedback.rating}/5 · {RATING_LABELS[selectedRequestForDetail.feedback.rating] || ""}
                  </span>
                  {selectedRequestForDetail.feedback.created_at && (
                    <span className="text-[11px] text-gray-400 dark:text-zinc-500 sm:ml-auto">
                      Submitted on {formatPHDateTime(selectedRequestForDetail.feedback.created_at)}
                    </span>
                  )}
                </div>

                {selectedRequestForDetail.feedback.aspect_tags?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {selectedRequestForDetail.feedback.aspect_tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-md bg-white dark:bg-zinc-800 border border-amber-200/60 dark:border-amber-900/30 px-2 py-0.5 text-[11px] font-medium text-amber-900 dark:text-amber-300"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                {selectedRequestForDetail.feedback.comments && (
                  <p className="text-xs text-gray-700 dark:text-zinc-300 italic pt-1 border-t border-amber-200/40 dark:border-amber-900/30">
                    &ldquo;{selectedRequestForDetail.feedback.comments}&rdquo;
                  </p>
                )}
              </div>
            ) : (
              <div className="rounded-xl bg-gray-50/70 dark:bg-zinc-900/40 p-3.5 border border-dashed border-gray-200 dark:border-zinc-800 flex items-center justify-between gap-3">
                <div>
                  <h4 className="text-xs font-semibold text-gray-800 dark:text-zinc-200">
                    Experience Feedback
                  </h4>
                  <p className="text-[11px] text-gray-500 dark:text-zinc-400 mt-0.5">
                    Help us improve by rating your request experience.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setFeedbackRequest(selectedRequestForDetail);
                    setFeedbackInitialRating(0);
                    setFeedbackModalOpen(true);
                  }}
                  className="h-8 px-3 text-xs font-semibold rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-xs cursor-pointer active:scale-95 transition-all shrink-0"
                >
                  Rate Experience
                </Button>
              </div>
            )}

            {/* Parent / Legal Guardian Profile Card */}
            {selectedRequestForDetail?.client_type === "Parent" && (
              <div className="rounded-xl bg-gray-50/70 dark:bg-zinc-900/50 p-4 border border-gray-200/80 dark:border-white/10 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <HugeIcon className="ph-bold ph-shield-check text-pup-maroon dark:text-red-400 text-sm" />
                    <h4 className="text-xs font-semibold text-gray-900 dark:text-zinc-100">
                      Parent / Legal Guardian Information
                    </h4>
                  </div>
                  {selectedRequestForDetail.spa_verified ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/40">
                      <HugeIcon className="ph-fill ph-check-circle text-xs" />
                      SPA Verified
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-800 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/40">
                      <HugeIcon className="ph-fill ph-clock text-xs" />
                      SPA Verification Pending
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-xs">
                  <div>
                    <span className="text-[10px] text-gray-400 block font-medium uppercase">Requester Name</span>
                    <span className="font-semibold text-gray-800 dark:text-zinc-200 truncate block">
                      {selectedRequestForDetail.requester_name || "—"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-400 block font-medium uppercase">Relationship</span>
                    <span className="font-semibold text-gray-800 dark:text-zinc-200 truncate block">
                      {selectedRequestForDetail.requester_relationship || "Legal Guardian"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-400 block font-medium uppercase">Contact Number</span>
                    <span className="font-semibold text-gray-800 dark:text-zinc-200 truncate block">
                      {selectedRequestForDetail.requester_contact || "—"}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Attached Supporting Documents */}
            {Array.isArray(selectedRequestForDetail?.attachments) && selectedRequestForDetail.attachments.length > 0 && (
              <div className="rounded-xl bg-gray-50/70 dark:bg-zinc-900/50 p-4 border border-gray-200/80 dark:border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <HugeIcon className="ph-bold ph-paperclip text-gray-600 dark:text-zinc-400 text-sm" />
                    <h4 className="text-xs font-semibold text-gray-900 dark:text-zinc-100">
                      Attached Documents ({selectedRequestForDetail.attachments.length})
                    </h4>
                  </div>
                </div>
                <div className="space-y-2">
                  {selectedRequestForDetail.attachments.map((att) => {
                    const isPdf = att.original_filename?.toLowerCase().endsWith(".pdf") || att.mime_type === "application/pdf";
                    const fileUrl = att.url || `/api/document-requests/${selectedRequestForDetail.id}/attachments/${att.id}`;
                    const typeLabel =
                      att.attachment_type === "spa"
                        ? "Special Power of Attorney (SPA)"
                        : att.attachment_type === "valid_id"
                        ? "Valid Government ID"
                        : att.attachment_type === "receipt"
                        ? "Proof of Payment"
                        : att.attachment_type === "clearance"
                        ? "Clearance Slip"
                        : "Supporting Evidence";

                    return (
                      <div
                        key={att.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded-xl border border-gray-200/80 dark:border-white/10 bg-white dark:bg-zinc-800/80 shadow-xs"
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-100 dark:bg-zinc-700 text-gray-600 dark:text-zinc-300">
                            <HugeIcon className={isPdf ? "ph-fill ph-file-pdf text-red-500 text-base" : "ph-fill ph-file-image text-blue-500 text-base"} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-medium text-gray-900 dark:text-zinc-100 truncate">
                              {att.original_filename}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-gray-100 dark:bg-zinc-700 text-gray-700 dark:text-zinc-300">
                                {typeLabel}
                              </span>
                              {att.size_bytes && (
                                <span className="text-[10px] text-gray-400 dark:text-zinc-500">
                                  {(att.size_bytes / 1024).toFixed(1)} KB
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                          {isPdf && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setPdfPreviewData({
                                  url: fileUrl,
                                  title: att.original_filename,
                                  subtitle: `${typeLabel} for Request #${selectedRequestForDetail.id}`,
                                  studentName: selectedRequestForDetail.student_name || "Requester",
                                  docType: typeLabel,
                                  originalFilename: att.original_filename,
                                });
                                setPdfPreviewOpen(true);
                              }}
                              className="h-7 px-2.5 text-[11px] font-semibold rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 shadow-xs cursor-pointer active:scale-95 transition-all"
                            >
                              Preview
                            </Button>
                          )}
                          <a
                            href={fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            download={att.original_filename}
                            className="inline-flex items-center justify-center h-7 px-2.5 text-[11px] font-semibold rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-xs active:scale-95 transition-all cursor-pointer"
                          >
                            Download
                          </a>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div>
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-zinc-400 mb-3 flex items-center justify-between">
                <span>Processing Timeline & Updates</span>
                <span className="text-[11px] font-normal text-gray-400">
                  {selectedRequestForDetail?.updates?.length || 0} {selectedRequestForDetail?.updates?.length === 1 ? "update" : "updates"}
                </span>
              </h4>

              {selectedRequestForDetail?.updates && selectedRequestForDetail.updates.length > 0 ? (
                <div className="relative space-y-4">
                  {selectedRequestForDetail.updates.length > 1 && (
                    <div className="absolute left-2.5 top-2.5 bottom-2.5 w-0.5 -translate-x-1/2 bg-gray-200 dark:bg-zinc-800" />
                  )}
                  {selectedRequestForDetail.updates.map((upd, idx) => {
                    const isConsecutiveSameStatus =
                      idx > 0 && upd.status === selectedRequestForDetail.updates[idx - 1].status;
                    const formatStatusLabel = (st) => {
                      if (st === "InProgress") return "In Progress";
                      if (st === "Ready") return "Ready for Claiming";
                      return st;
                    };

                    return (
                      <div key={upd.id || idx} className="relative pl-7">
                        <div
                          className={cn(
                            "absolute left-2.5 -translate-x-1/2 rounded-full border-2 border-white dark:border-zinc-900 shadow-xs",
                            isConsecutiveSameStatus
                              ? "top-1.5 h-2.5 w-2.5 bg-gray-400 dark:bg-zinc-500"
                              : "top-1 h-3.5 w-3.5 bg-pup-maroon ring-2 ring-pup-maroon/20"
                          )}
                        />
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={cn(
                                "text-xs",
                                isConsecutiveSameStatus
                                  ? "font-semibold text-gray-700 dark:text-zinc-300"
                                  : "font-bold text-gray-900 dark:text-zinc-100"
                              )}
                            >
                              {isConsecutiveSameStatus ? "Follow-Up Notice" : formatStatusLabel(upd.status)}
                            </span>
                            {isConsecutiveSameStatus && (
                              <span className="text-[10px] font-medium text-gray-500 dark:text-zinc-400 bg-gray-100 dark:bg-zinc-800/80 px-1.5 py-0.5 rounded border border-gray-200/60 dark:border-white/5">
                                {formatStatusLabel(upd.status)}
                              </span>
                            )}
                          </div>
                          {upd.created_at && (
                            <span className="text-[11px] text-gray-400 dark:text-zinc-500 font-mono">
                              {formatPHDateTime(upd.created_at)}
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-xs text-gray-600 dark:text-zinc-400 leading-normal">
                          {upd.message || "Status updated by Registrar"}
                        </p>
                      </div>
                    );
                  })}

                  {/* Fallback active indicator if ticket status is ahead of logged updates */}
                  {selectedRequestForDetail?.status &&
                    selectedRequestForDetail.status !== "Pending" &&
                    !selectedRequestForDetail.updates?.some((u) => u.status === selectedRequestForDetail.status) && (
                      <div className="relative pl-7">
                        <div className="absolute left-2.5 top-1 h-3.5 w-3.5 -translate-x-1/2 rounded-full border-2 border-white dark:border-zinc-900 bg-emerald-600 shadow-xs ring-2 ring-emerald-600/20" />
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-gray-900 dark:text-zinc-100">
                              {selectedRequestForDetail.status === "InProgress"
                                ? "In Progress"
                                : selectedRequestForDetail.status === "Ready"
                                ? "Ready for Claiming"
                                : selectedRequestForDetail.status}
                            </span>
                            <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800/40">
                              Current Active Status
                            </span>
                          </div>
                        </div>
                        <p className="mt-1 text-xs text-gray-600 dark:text-zinc-400 leading-normal">
                          Your document request has been updated to {selectedRequestForDetail.status === "InProgress" ? "In Progress" : selectedRequestForDetail.status === "Ready" ? "Ready for Claiming" : selectedRequestForDetail.status} by the Registrar.
                        </p>
                      </div>
                    )}
                </div>
              ) : (
                <div className="rounded-lg bg-gray-50 dark:bg-zinc-900/30 p-4 text-center text-xs text-gray-500">
                  No updates posted yet. Your request is queued for review by the Registrar.
                </div>
              )}
            </div>
          </div>

          <SheetFooter className="border-t border-gray-100 dark:border-white/10 p-4 justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedRequestForDetail(null)}
              className="h-9 px-4 text-xs font-semibold rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-xs cursor-pointer active:scale-95 transition-all"
            >
              Close
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* OSAS Proposal Details & Timeline — Sheet Slide-Over */}
      <Sheet
        open={Boolean(selectedProposalForDetail)}
        onOpenChange={(open) => !open && setSelectedProposalForDetail(null)}
      >
        <SheetContent side="right" className="w-full sm:max-w-xl md:max-w-2xl lg:max-w-3xl data-[side=right]:w-full data-[side=right]:sm:max-w-xl data-[side=right]:md:max-w-2xl data-[side=right]:lg:max-w-3xl flex flex-col font-jakarta dark:bg-[#1c1c1e]">
          <SheetHeader className="border-b border-gray-100 dark:border-white/10 p-5 pb-4 space-y-2">
            <div className="flex items-center justify-between pr-8">
              <span className="text-xs font-semibold text-pup-maroon bg-red-50 dark:bg-red-950/40 px-3 py-1 rounded-full border border-red-100 dark:border-red-900/30">
                Proposal #{selectedProposalForDetail?.id}
              </span>
              <StatusBadge status={selectedProposalForDetail?.status} />
            </div>
            <SheetTitle className="text-lg font-bold text-gray-900 dark:text-zinc-50">
              {selectedProposalForDetail?.title}
            </SheetTitle>
            <SheetDescription className="text-xs text-gray-500 dark:text-zinc-400">
              Submitted on {selectedProposalForDetail?.created_at ? formatPHDateTime(selectedProposalForDetail.created_at) : "—"}
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            {/* Event & Organization Info */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-gray-50 dark:bg-zinc-900/50 p-3 border border-gray-100 dark:border-zinc-800">
                <span className="text-[11px] font-medium text-gray-400 dark:text-zinc-500 block mb-0.5">Organization</span>
                <span className="text-xs font-semibold text-gray-800 dark:text-zinc-200 truncate block">
                  {selectedProposalForDetail?.organization_name || "—"}
                </span>
              </div>
              <div className="rounded-xl bg-gray-50 dark:bg-zinc-900/50 p-3 border border-gray-100 dark:border-zinc-800">
                <span className="text-[11px] font-medium text-gray-400 dark:text-zinc-500 block mb-0.5">Event Date</span>
                <span className="text-xs font-semibold text-gray-800 dark:text-zinc-200 block">
                  {selectedProposalForDetail?.event_date || "—"}
                </span>
              </div>
            </div>

            {/* Attached PDF Proposal File */}
            <div className="rounded-xl bg-gray-50 dark:bg-zinc-900/50 p-3.5 border border-gray-100 dark:border-zinc-800">
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-zinc-400 mb-2">
                Attached Proposal Document
              </h4>
              <div
                onClick={() => handleOpenPdfPreview(selectedProposalForDetail)}
                className="flex items-center justify-between gap-3 bg-white dark:bg-zinc-800 p-2.5 rounded-lg border border-gray-200 dark:border-white/10 hover:border-pup-maroon/30 dark:hover:border-red-400/30 hover:bg-gray-50/50 dark:hover:bg-white/5 transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-red-50 text-pup-maroon dark:bg-red-950/40 dark:text-red-400 group-hover:bg-pup-maroon group-hover:text-white transition-colors">
                    <HugeIcon  className="ph-bold ph-file-pdf text-base" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-gray-800 dark:text-zinc-200 truncate group-hover:text-pup-maroon dark:group-hover:text-red-400 transition-colors">
                      {selectedProposalForDetail?.original_filename || "Proposal.pdf"}
                    </p>
                    {selectedProposalForDetail?.size_bytes && (
                      <p className="text-[10px] text-gray-400 dark:text-zinc-500">
                        {(selectedProposalForDetail.size_bytes / 1024).toFixed(1)} KB
                      </p>
                    )}
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenPdfPreview(selectedProposalForDetail);
                  }}
                  className="shrink-0 inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-semibold text-pup-maroon hover:text-pup-darkMaroon dark:text-red-400 border border-pup-maroon/20 hover:border-pup-maroon/40 bg-red-50/50 hover:bg-red-50 dark:bg-red-950/20 dark:hover:bg-red-950/40 cursor-pointer shadow-xs active:scale-95 transition-all"
                >
                  <HugeIcon  className="ph-bold ph-eye text-sm" />
                  <span>View</span>
                </Button>
              </div>
            </div>

            {/* Review Timeline & Updates */}
            <div>
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-zinc-400 mb-3 flex items-center justify-between">
                <span>Evaluation Timeline & Updates</span>
                <span className="text-[11px] font-normal text-gray-400">
                  {selectedProposalForDetail?.updates?.length || 0} {selectedProposalForDetail?.updates?.length === 1 ? "update" : "updates"}
                </span>
              </h4>

              {selectedProposalForDetail?.updates && selectedProposalForDetail.updates.length > 0 ? (
                <div className="relative space-y-4">
                  {selectedProposalForDetail.updates.length > 1 && (
                    <div className="absolute left-2.5 top-2.5 bottom-2.5 w-0.5 -translate-x-1/2 bg-gray-200 dark:bg-zinc-800" />
                  )}
                  {selectedProposalForDetail.updates.map((upd, idx) => {
                    const isConsecutiveSameStatus =
                      idx > 0 && upd.status === selectedProposalForDetail.updates[idx - 1].status;

                    return (
                      <div key={upd.id || idx} className="relative pl-7">
                        <div
                          className={cn(
                            "absolute left-2.5 -translate-x-1/2 rounded-full border-2 border-white dark:border-zinc-900 shadow-xs",
                            isConsecutiveSameStatus
                              ? "top-1.5 h-2.5 w-2.5 bg-gray-400 dark:bg-zinc-500"
                              : "top-1 h-3.5 w-3.5 bg-pup-maroon ring-2 ring-pup-maroon/20"
                          )}
                        />
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={cn(
                                "text-xs",
                                isConsecutiveSameStatus
                                  ? "font-semibold text-gray-700 dark:text-zinc-300"
                                  : "font-bold text-gray-900 dark:text-zinc-100"
                              )}
                            >
                              {isConsecutiveSameStatus ? "Evaluation Follow-Up" : upd.status}
                            </span>
                            {isConsecutiveSameStatus && (
                              <span className="text-[10px] font-medium text-gray-500 dark:text-zinc-400 bg-gray-100 dark:bg-zinc-800/80 px-1.5 py-0.5 rounded border border-gray-200/60 dark:border-white/5">
                                {upd.status}
                              </span>
                            )}
                          </div>
                          {upd.created_at && (
                            <span className="text-[11px] text-gray-400 dark:text-zinc-500 font-mono">
                              {formatPHDateTime(upd.created_at)}
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-xs text-gray-600 dark:text-zinc-400 leading-normal">
                          {upd.message || "Status updated by OSAS"}
                        </p>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-lg bg-gray-50 dark:bg-zinc-900/30 p-4 text-center text-xs text-gray-500">
                  No updates posted yet. Your proposal is queued for evaluation by OSAS.
                </div>
              )}
            </div>
          </div>

          <SheetFooter className="border-t border-gray-100 dark:border-white/10 p-4 justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedProposalForDetail(null)}
              className="h-9 px-4 text-xs font-semibold rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-xs cursor-pointer active:scale-95 transition-all"
            >
              Close
            </Button>
          </SheetFooter>
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

      {/* Student Request Experience Feedback Modal */}
      <StudentFeedbackModal
        open={feedbackModalOpen}
        onClose={() => {
          setFeedbackModalOpen(false);
          setFeedbackRequest(null);
          setFeedbackInitialRating(0);
        }}
        request={feedbackRequest}
        initialRating={feedbackInitialRating}
        onFeedbackSubmitted={handleFeedbackSubmitted}
      />
    </TooltipProvider>
  );
}
