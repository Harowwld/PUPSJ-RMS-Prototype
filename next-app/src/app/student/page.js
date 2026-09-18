"use client";
import LucideIcon from "@/components/shared/LucideIcon";
import { useCallback, useEffect, useState, useMemo } from "react";
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
import { TooltipProvider } from "@/components/ui/tooltip";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { getClientSession } from "@/lib/clientAuth";
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
  StudentActivityListSkeleton,
} from "@/components/student/skeletons";
import StudentComplianceTab from "@/components/student/StudentComplianceTab";
import { Skeleton } from "@/components/ui/skeleton";

function SortIndicator({ column, sortBy, sortOrder }) {
  if (sortBy !== column) {
    return <LucideIcon  className="ph-bold ph-caret-up-down ml-1 text-[12px] text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity"></LucideIcon>;
  }
  return sortOrder === "ASC" ? (
    <LucideIcon  className="ph-bold ph-caret-up ml-1 text-[12px] text-gray-400"></LucideIcon>
  ) : (
    <LucideIcon  className="ph-bold ph-caret-down ml-1 text-[12px] text-gray-400"></LucideIcon>
  );
}

const requestStatuses = ["Pending", "InProgress", "Ready", "Completed", "Cancelled"];

export default function StudentDashboard() {
  const router = useRouter();
  const [me, setMe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({ requests: [], documents: [], proposals: [], activity: [] });
  const [docTypes, setDocTypes] = useState([]);
  const [courses, setCourses] = useState([]);
  const [authMode, setAuthMode] = useState("login");
  const [auth, setAuth] = useState({ studentNo: "", name: "", password: "" });
  const [requestForm, setRequestForm] = useState({ studentNo: "", docType: "", notes: "", clientType: "Student", courseCode: "" });
  const [proposalForm, setProposalForm] = useState({ title: "", organizationName: "", eventDate: "", file: null });
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

  // Table state for Request History
  const [requestSearch, setRequestSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [sortBy, setSortBy] = useState("created_at");
  const [sortOrder, setSortOrder] = useState("DESC");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [selectedRequestForDetail, setSelectedRequestForDetail] = useState(null);
  const [selectedProposalForDetail, setSelectedProposalForDetail] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(true);
  const [pdfPreviewOpen, setPdfPreviewOpen] = useState(false);
  const [pdfPreviewData, setPdfPreviewData] = useState(null);

  const handleOpenPdfPreview = useCallback((proposal) => {
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

  const hasActiveFilters = requestSearch !== "" || statusFilter !== "All";

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
    return (data.requests || []).filter((item) => {
      const matchesSearch =
        !q ||
        String(item.id).toLowerCase().includes(q) ||
        (item.doc_type || "").toLowerCase().includes(q) ||
        (item.notes || "").toLowerCase().includes(q) ||
        (item.status || "").toLowerCase().includes(q) ||
        (item.client_type || "").toLowerCase().includes(q) ||
        (item.student_no || "").toLowerCase().includes(q);

      const matchesStatus = statusFilter === "All" || item.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [data.requests, requestSearch, statusFilter]);

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
      } else if (targetView === "odrs" || targetView === "osas" || targetView === "compliance") {
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
      if (tab === "odrs" || tab === "osas" || tab === "compliance") {
        setView(tab);
      }
    }
  }, []);

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
      if (!session.ok || session.data?.role !== "Student") {
        if (session.status !== 401) {
          const error = "Unable to load your student session.";
          setMessage(error);
          showToast("Student session unavailable", error, true);
        }
        return;
      }
      setMe(session.data);
      setRequestForm((prev) => ({
        ...prev,
        clientType: session.data.client_type || prev.clientType || "Student",
        studentNo: prev.studentNo || session.data.student_no || "",
      }));
      const [requestRes, proposalRes, typesRes, activityRes, coursesRes] = await Promise.all([
        fetch("/api/student/document-requests", { cache: "no-store" }),
        fetch("/api/student/event-proposals", { cache: "no-store" }),
        fetch("/api/doc-types", { cache: "no-store" }),
        fetch("/api/student/activity", { cache: "no-store" }),
        fetch("/api/courses", { cache: "no-store" }),
      ]);
      const [requestJson, proposalJson, typesJson, activityJson, coursesJson] = await Promise.all([requestRes.json(), proposalRes.json(), typesRes.json(), activityRes.json(), coursesRes.json()]);
      if (!requestRes.ok || !requestJson?.ok || !proposalRes.ok || !proposalJson?.ok) {
        throw new Error(requestJson?.error || proposalJson?.error || "Unable to load student records.");
      }
      setDocTypes(Array.isArray(typesJson?.data) ? typesJson.data : []);
      setCourses(Array.isArray(coursesJson?.data) ? coursesJson.data : []);
      setData({ requests: requestJson?.data?.requests || [], documents: requestJson?.data?.documents || [], proposals: proposalJson?.data || [], activity: activityJson?.data || [] });
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { const timer = setTimeout(() => { load().catch((error) => { const message = error.message || "Unable to load student records."; setMessage(message); showToast("Records failed to load", message, true); }); }, 0); return () => clearTimeout(timer); }, [load, showToast]);

  useEffect(() => {
    if (me === null) {
      getClientSession()
        .then((session) => { if (session.status === 401) router.replace("/"); })
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

      if (!clientType) {
        setMessage("Client type is required.");
        showToast("Client type required", "Please select whether you are a Student or Alumni.", true);
        return;
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

      const res = await fetch("/api/student/document-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentNo,
          docType,
          notes,
          clientType,
          courseCode,
        }),
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
      }));
      showToast("Request submitted", "The Registrar can now review your document request.");
      await load();
    } catch (error) {
      const message = error.message || "Unable to submit request.";
      setMessage(message);
      showToast("Request failed", message, true);
    } finally {
      setRequestSubmitting(false);
    }
  }

  async function submitProposal(event) {
    event.preventDefault(); setMessage(""); setProposalSubmitting(true);
    try {
    const form = new FormData();
    Object.entries(proposalForm).forEach(([key, value]) => value && form.set(key, value));
    const res = await fetch("/api/student/event-proposals", { method: "POST", body: form });
    const json = await res.json();
    if (!res.ok || !json.ok) { const error = json.error || "Unable to submit proposal."; setMessage(error); showToast("Proposal failed", error, true); return; }
    setProposalForm({ title: "", organizationName: "", eventDate: "", file: null }); showToast("Proposal submitted", "OSAS can now review your Event Proposal."); await load();
    } catch (error) {
      const message = error.message || "Unable to submit proposal."; setMessage(message); showToast("Proposal failed", message, true);
    } finally { setProposalSubmitting(false); }
  }

  if (!me) {
    return <StudentDashboardSkeleton view={view} />;
  }

  const sidebarItems = [
    { type: "header", label: "Student Services" },
    { key: "odrs", label: "Document Requests", iconClass: "ti ti-file-text" },
    { key: "compliance", label: "Document Checklist", iconClass: "ti ti-clipboard-check" },
    { key: "osas", label: "OSAS Submissions", iconClass: "ti ti-school" },
  ];

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    window.location.href = "/";
  }

  const StatusBadge = ({ status }) => {
    const s = String(status || "").toLowerCase().trim();
    let badgeClass = "bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700";
    if (s === "approved" || s === "completed" || s === "ready") {
      badgeClass = "bg-emerald-50 text-emerald-800 border-emerald-200/80 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-800/40";
    } else if (s === "under review" || s === "inprogress" || s === "processing") {
      badgeClass = "bg-blue-50 text-blue-800 border-blue-200/80 dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-800/40";
    } else if (s === "needs revision" || s === "revision") {
      badgeClass = "bg-amber-50 text-amber-800 border-amber-200/80 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-800/40";
    } else if (s === "submitted" || s === "pending") {
      badgeClass = "bg-sky-50 text-sky-800 border-sky-200/80 dark:bg-sky-950/30 dark:text-sky-300 dark:border-sky-800/40";
    } else if (s === "declined" || s === "cancelled" || s === "rejected") {
      badgeClass = "bg-rose-50 text-rose-800 border-rose-200/80 dark:bg-rose-950/30 dark:text-rose-300 dark:border-rose-800/40";
    }
    return <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${badgeClass}`}>{status}</span>;
  };

  return (
    <TooltipProvider delayDuration={200}>
      <div className="relative flex h-screen min-h-0 flex-col overflow-hidden bg-slate-50/30 font-inter dark:bg-zinc-950/30">
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
          onSelect={(key) => key === "activity" ? router.push("/account/activity") : setView(key)}
          onLogout={handleLogout}
          zoomNode={zoomNode}
          setZoomNode={setZoomNode}
          handleZoomMouseDown={handleZoomMouseDown}
          accentColor="#800000"
          officeName="Student Portal"
        />
          <main className="relative w-full min-w-0 min-h-0 flex-1 overflow-y-auto bg-white/25 dark:bg-zinc-950/25 backdrop-blur-xs">
            <div
              className="flex min-h-0 w-full flex-1 flex-col p-4"
              style={{ zoom: [0.75, 0.83, 0.92, 1.0, 1.08, 1.17, 1.25][zoomNode] }}
            >
              <div className="w-full flex-1 flex flex-col min-h-0">

              {/* Standardized Card Header for Activity view */}
              {view === "activity" && (
                <Card className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-card dark:shadow-none overflow-hidden mb-4">
                  <PageHeader
                    icon="ph-clock-counter-clockwise"
                    title="My Activity"
                    description="A history of actions performed on your account."
                    showBorder={false}
                    titleClassName="text-[18px] font-semibold tracking-[-0.01em] text-gray-900 dark:text-zinc-50"
                    descriptionClassName="text-[13px] font-normal text-gray-500 dark:text-zinc-400 mt-[4px]"
                    actions={
                      <div className="flex items-center gap-3">
                        {me?.student_no && (
                          <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-red-50 text-pup-maroon border border-red-100 dark:bg-red-950/30 dark:border-red-900/30">
                            <LucideIcon  className="ph-fill ph-student text-[13px]"></LucideIcon>
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
                      </div>
                    }
                  />
                </Card>
              )}

              {message && <p role="alert" className="rounded-brand border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 mb-4">{message}</p>}
              {view === "activity" ? (
                <section className="rounded-brand border border-gray-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-card">
                  <h2 className="text-base font-bold text-gray-900 dark:text-zinc-50">My Activity</h2>
                  <p className="mt-1 text-sm text-gray-500 dark:text-zinc-400">A history of actions performed on your account.</p>
                  {loading ? (
                    <StudentActivityListSkeleton count={4} />
                  ) : (
                    <div className="mt-5 space-y-3">
                      {data.activity.length === 0 ? (
                        <p className="rounded-brand bg-gray-50 px-4 py-8 text-center text-sm text-gray-500 dark:bg-zinc-800/40 dark:text-zinc-400">
                          No activity recorded yet.
                        </p>
                      ) : (
                        data.activity.map((item) => (
                          <article key={item.id} className="rounded-brand border border-gray-200 p-4 dark:border-white/10">
                            <div className="flex items-center justify-between gap-3">
                              <p className="text-sm font-semibold text-gray-900 dark:text-zinc-50">{item.action}</p>
                              <time className="text-xs text-gray-500 dark:text-zinc-400">{formatPHDateTime(item.created_at)}</time>
                            </div>
                            {item.details && <p className="mt-1 text-sm text-gray-500 dark:text-zinc-400">{item.details}</p>}
                          </article>
                        ))
                      )}
                    </div>
                  )}
                </section>
              ) : view === "compliance" ? (
                <StudentComplianceTab authUser={me} onLogout={handleLogout} />
              ) : view === "odrs" ? (
                <div className="flex flex-col w-full flex-1 min-h-0">
                  {/* ONE Single Card Container encapsulating Header, Inline Request Form, Toolbar, Active Filters, Table & Pagination */}
                  <Card
                    className="flex h-auto w-full flex-col p-0 gap-0 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-card dark:shadow-none isolate font-inter mb-4 min-h-0 flex-1 focus:outline-none"
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
                              <LucideIcon  className="ph-fill ph-student text-[13px]"></LucideIcon>
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
                          <div className="h-6 w-px bg-gray-200 dark:bg-zinc-800" />
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
                              <LucideIcon  className="ph-bold ph-plus-circle text-xl" />
                            </div>
                            <div>
                              <h2 className="text-[15px] font-semibold text-gray-900 dark:text-zinc-50">New Document Request</h2>
                              <p className="text-xs text-gray-500 dark:text-zinc-400">Request an academic document from the Registrar.</p>
                            </div>
                          </div>

                          {/* Duplicate ticket reminder notice banner */}
                          <div className="flex items-center gap-2.5 rounded-xl border border-amber-200 bg-amber-50/80 px-3.5 py-2 text-xs text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-300">
                            <LucideIcon  className="ph-bold ph-info text-[15px] shrink-0 text-amber-600 dark:text-amber-400"></LucideIcon>
                            <span className="font-medium text-[11px] leading-relaxed">
                              Please avoid creating duplicate tickets for the same concern to help us process your request promptly.
                            </span>
                          </div>
                        </div>

                        <form onSubmit={createRequest} className="flex flex-col gap-4 mt-4">
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
                              </Select>
                            </div>

                            {/* Student Number */}
                            <div className="min-w-0">
                              <div className="flex items-center justify-between mb-1.5">
                                <label htmlFor="student-id-input" className="text-xs font-semibold text-gray-700 dark:text-zinc-200">
                                  Student Number {requestForm.clientType === "Student" && <span className="text-red-500">*</span>}
                                </label>
                                {requestForm.clientType === "Alumni" && (
                                  <span className="text-[10px] text-gray-400 font-medium">Optional</span>
                                )}
                              </div>
                              <Input
                                id="student-id-input"
                                type="text"
                                placeholder={requestForm.clientType === "Alumni" ? "Optional if forgotten" : "YYYY-XXXXX-SJ-0"}
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
                                    <LucideIcon  className="ph-bold ph-spinner animate-spin text-sm text-white!"></LucideIcon>
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
                          <LucideIcon  className="ph-bold ph-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-zinc-500 transition-colors group-focus-within:text-pup-maroon dark:group-focus-within:text-red-400 text-xs pointer-events-none" />
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
                              `${filteredRequests.length} results`
                            )}
                          </div>
                        </div>

                        <div className="w-full sm:w-[155px] shrink-0">
                          <Select
                            value={statusFilter}
                            onChange={(e) => {
                              setStatusFilter(e.target.value);
                              setCurrentPage(1);
                            }}
                            className="h-9 rounded-xl border border-gray-200 dark:border-white/10 text-xs font-normal text-[#111111] dark:text-zinc-200 cursor-pointer shadow-none"
                            menuClassName="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-900 shadow-2xl p-1.5"
                            optionClassName="rounded-lg text-xs font-normal py-1.5 px-2.5 hover:bg-gray-100 dark:hover:bg-zinc-800"
                          >
                            <option value="All">All Statuses</option>
                            {requestStatuses.map((st) => (
                              <option key={st} value={st}>
                                {st}
                              </option>
                            ))}
                          </Select>
                        </div>
                      </div>
                    </div>

                    {/* 4. Active Filters Pill Bar */}
                    {hasActiveFilters && (
                      <div className="flex-none border-t border-gray-100 bg-white px-6 py-2.5 animate-in fade-in slide-in-from-top-1 duration-normal dark:border-white/10 dark:bg-card">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="mr-1 text-[11px] font-medium uppercase tracking-[0.04em] text-gray-400 dark:text-zinc-500">
                            Active filters:
                          </span>
                          {requestSearch && (
                            <div className="flex items-center gap-[6px] rounded-[6px] bg-gray-100 dark:bg-zinc-800 px-[10px] py-[4px] text-[12px] font-normal text-gray-900 dark:text-zinc-50">
                              Search: {requestSearch}
                              <button
                                onClick={() => {
                                  setRequestSearch("");
                                  setCurrentPage(1);
                                }}
                                className="text-[12px] text-gray-400 hover:text-gray-600 dark:text-zinc-500 dark:hover:text-zinc-300 transition-colors cursor-pointer border-0 bg-transparent p-0 leading-none"
                              >
                                ×
                              </button>
                            </div>
                          )}
                          {statusFilter !== "All" && (
                            <div className="flex items-center gap-[6px] rounded-[6px] bg-gray-100 dark:bg-zinc-800 px-[10px] py-[4px] text-[12px] font-normal text-gray-900 dark:text-zinc-50">
                              Status: {statusFilter}
                              <button
                                onClick={() => {
                                  setStatusFilter("All");
                                  setCurrentPage(1);
                                }}
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
                              setRequestSearch("");
                              setStatusFilter("All");
                              setCurrentPage(1);
                            }}
                            className="h-auto text-[12px] font-medium text-gray-400 dark:text-zinc-500 border-0 bg-transparent hover:bg-transparent shadow-none p-0 hover:text-red-600 dark:hover:text-red-500 transition-colors cursor-pointer"
                          >
                            Clear
                          </Button>
                        </div>
                      </div>
                    )}

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
                                        <LucideIcon  className={hasActiveFilters ? "ph-magnifying-glass text-2xl text-pup-maroon" : "ph-tray text-2xl text-pup-maroon"}></LucideIcon>
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
                                        size="sm"
                                        onClick={() => {
                                          setRequestSearch("");
                                          setStatusFilter("All");
                                          setCurrentPage(1);
                                        }}
                                        className="mt-5 flex h-9 items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 text-xs font-semibold text-gray-600 shadow-sm transition-colors hover:border-gray-300 hover:bg-red-50 hover:text-pup-maroon dark:bg-card dark:text-zinc-300 cursor-pointer"
                                      >
                                        <LucideIcon  className="ph-bold ph-arrow-counter-clockwise"></LucideIcon>
                                        Clear
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
                                <td className="py-0 px-4 align-middle">
                                  <span className="text-[14px] font-medium text-[#111111] dark:text-zinc-100">
                                    {item.doc_type}
                                  </span>
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
                                  <button
                                    type="button"
                                    onClick={() => setSelectedRequestForDetail(item)}
                                    title="View Request Updates Timeline"
                                    className="inline-flex h-7 w-7 items-center justify-center rounded-[6px] text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10 hover:text-pup-maroon dark:hover:text-red-400 transition-colors cursor-pointer"
                                  >
                                    <LucideIcon  className="ph-bold ph-clock-counter-clockwise text-[16px]"></LucideIcon>
                                  </button>
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
                  className="flex h-auto w-full flex-col p-0 gap-0 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-card dark:shadow-none isolate font-inter mb-4 min-h-0 flex-1 focus:outline-none"
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
                            <LucideIcon  className="ph-fill ph-student text-[13px]"></LucideIcon>
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
                        <div className="h-6 w-px bg-gray-200 dark:bg-zinc-800" />
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
                          {isFormOpen ? "Hide Form" : "New Proposal"}
                        </Button>
                      </div>
                    }
                  />

                  {/* 2. Inline Proposal Form Section */}
                  {isFormOpen && (
                    <div className="border-t border-gray-100 dark:border-white/10 p-5 sm:p-6 bg-gray-50/40 dark:bg-zinc-900/20 animate-in fade-in slide-in-from-top-2 duration-fast">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100 dark:border-white/10">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50 text-pup-maroon dark:bg-red-950/40 dark:text-red-400">
                            <LucideIcon  className="ph-bold ph-plus-circle text-xl" />
                          </div>
                          <div>
                            <h2 className="text-[15px] font-semibold text-gray-900 dark:text-zinc-50">New Event Proposal</h2>
                            <p className="text-xs text-gray-500 dark:text-zinc-400">Upload a PDF proposal for OSAS review and evaluation.</p>
                          </div>
                        </div>
                      </div>

                      <form onSubmit={submitProposal} className="flex flex-col gap-4 mt-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {/* Event Title */}
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

                          {/* Organization */}
                          <div className="min-w-0">
                            <label htmlFor="osas-org-name" className="mb-1.5 block text-xs font-semibold text-gray-700 dark:text-zinc-200">
                              Organization <span className="text-red-500">*</span>
                            </label>
                            <Input
                              id="osas-org-name"
                              placeholder="Organization name"
                              value={proposalForm.organizationName}
                              onChange={(e) => setProposalForm({ ...proposalForm, organizationName: e.target.value })}
                              required
                              className="h-10 w-full rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 px-3 text-xs text-gray-900 dark:text-zinc-100 placeholder:text-gray-400 dark:placeholder:text-zinc-500 shadow-none outline-none focus-visible:border-pup-maroon focus-visible:ring-1 focus-visible:ring-pup-maroon dark:focus-visible:border-red-500/80 dark:focus-visible:ring-red-500/80"
                            />
                          </div>

                          {/* Event Date */}
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

                        {/* File Upload */}
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

                        {/* Form Actions */}
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
                                  <LucideIcon  className="ph-bold ph-spinner animate-spin text-sm text-white!"></LucideIcon>
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

                  {/* 3. Submission History Header */}
                  <div className="border-t border-gray-100 dark:border-white/10 p-5 flex flex-col gap-4 bg-gray-50/40 dark:bg-zinc-900/30">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <h3 className="text-[15px] font-semibold text-gray-900 dark:text-zinc-50">Submission History</h3>
                        <p className="mt-0.5 text-xs text-gray-500 dark:text-zinc-400">Follow OSAS review updates and requested revisions.</p>
                      </div>
                      {loading ? (
                        <Skeleton className="h-6 w-16 rounded-full dark:bg-muted" />
                      ) : (
                        <span className="self-start sm:self-auto rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-600 dark:bg-zinc-800 dark:text-zinc-300">
                          {data.proposals.length} total
                        </span>
                      )}
                    </div>
                  </div>

                  {/* 4. Proposals List */}
                  <div className="border-t border-gray-100 dark:border-white/10 flex-1">
                    {loading ? (
                      <div className="p-5">
                        <StudentOsasProposalsListSkeleton count={3} />
                      </div>
                    ) : data.proposals.length === 0 ? (
                      <div className="p-12 text-center">
                        <Empty className="flex h-[320px] flex-col items-center justify-center border-0 bg-transparent text-center">
                          <EmptyHeader className="flex flex-col items-center gap-0">
                            <div className="relative mb-6">
                              <div className="absolute inset-0 scale-150 animate-pulse rounded-full bg-gray-50 opacity-50 dark:bg-card"></div>
                              <EmptyMedia className="relative z-10 flex h-20 w-20 items-center justify-center rounded-2xl border border-gray-100 bg-white shadow-md dark:border-white/10 dark:bg-card dark:shadow-none">
                                <LucideIcon  className="ph-file-text text-2xl text-pup-maroon"></LucideIcon>
                              </EmptyMedia>
                            </div>
                            <EmptyTitle className="text-lg font-semibold text-gray-900 dark:text-zinc-50">
                              No Event Proposals Yet
                            </EmptyTitle>
                            <EmptyDescription className="max-w-xs text-sm font-medium text-gray-500 dark:text-zinc-400">
                              You haven&apos;t submitted any event proposals yet. Use the form above to submit your first proposal.
                            </EmptyDescription>
                            <Button
                              type="button"
                              onClick={() => setIsFormOpen(true)}
                              className="mt-5 flex h-10 px-5 text-xs font-semibold rounded-xl! btn-brand-red text-white! active:scale-95 disabled:opacity-50 transition-all cursor-pointer shadow-xs border-0"
                              style={{ color: "#ffffff" }}
                            >
                              New Proposal
                            </Button>
                          </EmptyHeader>
                        </Empty>
                      </div>
                    ) : (
                      <div className="p-5 space-y-3">
                        {data.proposals.map((item) => (
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
                                  <LucideIcon  className="ph-bold ph-file-pdf text-[16px]"></LucideIcon>
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
                                  <LucideIcon  className="ph-bold ph-clock-counter-clockwise text-[16px]"></LucideIcon>
                                </button>
                              </div>
                            </div>
                            <p className="mt-1.5 text-[13px] font-normal text-[#8E8E93] dark:text-zinc-400">
                              {item.organization_name} · {item.event_date}
                            </p>
                            <ol className="mt-3 space-y-2 border-l-2 border-gray-200 pl-4 text-xs text-gray-500 dark:border-white/10 dark:text-zinc-400">
                              {item.updates.map((update) => (
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
        <SheetContent side="right" className="sm:max-w-md w-full flex flex-col font-inter dark:bg-[#1c1c1e]">
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
                  {selectedRequestForDetail.updates.map((upd, idx) => (
                    <div key={upd.id || idx} className="relative pl-7">
                      <div className="absolute left-2.5 top-1 h-3 w-3 -translate-x-1/2 rounded-full border-2 border-white bg-pup-maroon dark:border-zinc-900 shadow-xs" />
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-gray-900 dark:text-zinc-100">
                          {upd.status}
                        </span>
                        {upd.created_at && (
                          <span className="text-[11px] text-gray-400 dark:text-zinc-500">
                            {formatPHDateTime(upd.created_at)}
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-xs text-gray-600 dark:text-zinc-400 leading-normal">
                        {upd.message || "Status updated by Registrar"}
                      </p>
                    </div>
                  ))}
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
        <SheetContent side="right" className="sm:max-w-md w-full flex flex-col font-inter dark:bg-[#1c1c1e]">
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
                    <LucideIcon  className="ph-bold ph-file-pdf text-base" />
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
                  <LucideIcon  className="ph-bold ph-eye text-sm" />
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
                  {selectedProposalForDetail.updates.map((upd, idx) => (
                    <div key={upd.id || idx} className="relative pl-7">
                      <div className="absolute left-2.5 top-1 h-3 w-3 -translate-x-1/2 rounded-full border-2 border-white bg-pup-maroon dark:border-zinc-900 shadow-xs" />
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-gray-900 dark:text-zinc-100">
                          {upd.status}
                        </span>
                        {upd.created_at && (
                          <span className="text-[11px] text-gray-400 dark:text-zinc-500">
                            {formatPHDateTime(upd.created_at)}
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-xs text-gray-600 dark:text-zinc-400 leading-normal">
                        {upd.message || "Status updated by OSAS"}
                      </p>
                    </div>
                  ))}
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
    </TooltipProvider>
  );
}
