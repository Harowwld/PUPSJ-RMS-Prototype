"use client";

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
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyMedia,
} from "@/components/ui/empty";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  StudentDashboardSkeleton,
  StudentRequestsTableRowsSkeleton,
  StudentRequestsPaginationSkeleton,
  StudentOsasProposalsListSkeleton,
  StudentActivityListSkeleton,
} from "@/components/student/skeletons";
import { Skeleton } from "@/components/ui/skeleton";

function SortIndicator({ column, sortBy, sortOrder }) {
  if (sortBy !== column) {
    return <i className="ph-bold ph-caret-up-down ml-1 text-[12px] text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity"></i>;
  }
  return sortOrder === "ASC" ? (
    <i className="ph-bold ph-caret-up ml-1 text-[12px] text-gray-400"></i>
  ) : (
    <i className="ph-bold ph-caret-down ml-1 text-[12px] text-gray-400"></i>
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

  // The shared Sidebar emits this event from its own collapse button. Keep
  // the student shell in sync just like the staff dashboard does.
  useEffect(() => {
    const handleToggle = () => setSidebarOpen((open) => !open);
    window.addEventListener("toggle-sidebar", handleToggle);
    return () => window.removeEventListener("toggle-sidebar", handleToggle);
  }, []);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const meRes = await fetch("/api/auth/me", { cache: "no-store" });
      const meJson = await meRes.json().catch(() => null);
      if (!meRes.ok || meJson?.data?.role !== "Student") {
        if (meRes.status !== 401) {
          const error = meJson?.error || "Unable to load your student session.";
          setMessage(error);
          showToast("Student session unavailable", error, true);
        }
        return;
      }
      setMe(meJson.data);
      setRequestForm((prev) => ({
        ...prev,
        clientType: meJson.data.client_type || prev.clientType || "Student",
        studentNo: prev.studentNo || meJson.data.student_no || "",
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
      fetch("/api/auth/me", { cache: "no-store" })
        .then((response) => { if (response.status === 401) router.replace("/"); })
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
    return <StudentDashboardSkeleton />;
  }

  const sidebarItems = [
    { type: "header", label: "Student Services" },
    { key: "odrs", label: "Document Requests", iconClass: "ti ti-file-text" },
    { key: "osas", label: "OSAS Submissions", iconClass: "ti ti-school" },
  ];

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    router.push("/");
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
      <div className="relative flex h-screen min-h-0 flex-col overflow-hidden bg-red-50/20 font-inter dark:bg-red-950/10">
        {/* Shared dashboard liquid-gradient background used by Staff/Admin views. */}
        <div className="liquid-container">
          <div className="liquid-blob liquid-blob-1" />
          <div className="liquid-blob liquid-blob-2" />
          <div className="liquid-blob liquid-blob-3" />
        </div>
        <Header authUser={me} onLogout={handleLogout} />
        <div className="flex min-h-0 flex-1">
        <Sidebar open={sidebarOpen} items={sidebarItems} activeKey={view} onSelect={(key) => key === "activity" ? router.push("/account/activity") : setView(key)} onLogout={handleLogout} accentColor="#800000" officeName="Student Portal" />
          <main className="relative w-full min-w-0 min-h-0 flex-1 overflow-y-auto bg-red-50/10 dark:bg-red-950/10 backdrop-blur-xs">
            <div className="flex min-h-0 w-full flex-1 flex-col p-4 sm:p-6">
              <div className="mx-auto w-full max-w-7xl space-y-6">

              {/* Standardized Card Header aligned with Staff and Admin pages */}
              <Card className="rounded-brand border border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-card dark:shadow-none overflow-hidden">
                <PageHeader
                  icon={view === "odrs" ? "ph-tray" : view === "osas" ? "ph-file-text" : "ph-clock-counter-clockwise"}
                  title={view === "odrs" ? "Document Requests" : view === "osas" ? "OSAS Submissions" : "My Activity"}
                  description={
                    view === "odrs"
                      ? "Request official academic records and track Registrar processing updates."
                      : view === "osas"
                      ? "Submit organization event proposals and follow evaluation progress."
                      : "A history of actions performed on your account."
                  }
                  showBorder={false}
                  titleClassName="text-[18px] font-semibold tracking-[-0.01em] text-gray-900 dark:text-zinc-50"
                  descriptionClassName="text-[13px] font-normal text-gray-500 dark:text-zinc-400 mt-[4px]"
                  actions={
                    <div className="flex items-center gap-3">
                      {me?.student_no && (
                        <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-red-50 text-pup-maroon border border-red-100 dark:bg-red-950/30 dark:border-red-900/30">
                          <i className="ph-fill ph-student text-[13px]"></i>
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

              {message && <p role="alert" className="rounded-brand border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{message}</p>}
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
              ) : view === "odrs" ? (
                <div className="flex flex-col gap-6 w-full">
                  {/* Card 1: New Document Request (Flex layout) */}
                  <Card className="rounded-brand border border-gray-200 bg-white p-5 sm:p-6 shadow-sm dark:border-white/10 dark:bg-card flex flex-col gap-5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-4 dark:border-white/10">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50 text-pup-maroon dark:bg-red-950/40 dark:text-red-400">
                          <i className="ph-bold ph-plus-circle text-xl" />
                        </div>
                        <div>
                          <h2 className="text-[16px] font-semibold text-gray-900 dark:text-zinc-50">New Document Request</h2>
                          <p className="text-xs text-gray-500 dark:text-zinc-400">Request an academic document from the Registrar.</p>
                        </div>
                      </div>

                      {/* Duplicate ticket reminder notice banner */}
                      <div className="flex items-center gap-2.5 rounded-lg border border-amber-200 bg-amber-50/80 px-3.5 py-2 text-xs text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-300">
                        <i className="ph-bold ph-info text-[15px] shrink-0 text-amber-600 dark:text-amber-400"></i>
                        <span className="font-medium text-[11px] leading-relaxed">
                          Please avoid creating duplicate tickets for the same concern to help us process your request promptly.
                        </span>
                      </div>
                    </div>

                    <form onSubmit={createRequest} className="flex flex-col gap-4">
                      <div className="flex flex-col md:flex-row gap-4">
                        <div className="flex-1 min-w-[180px]">
                          <label htmlFor="student-client-type" className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-gray-600 dark:text-zinc-400">
                            Client Type <span className="text-red-500">*</span>
                          </label>
                          <Select
                            id="student-client-type"
                            value={requestForm.clientType}
                            onChange={(e) => setRequestForm({ ...requestForm, clientType: e.target.value })}
                            className="h-10 rounded-xl text-sm font-normal text-gray-800 dark:text-zinc-100 border border-gray-200 dark:border-white/10 dark:bg-zinc-800 shadow-none"
                          >
                            <option value="Student">Student (Currently Enrolled)</option>
                            <option value="Alumni">Alumni (Graduate / Former)</option>
                          </Select>
                        </div>

                        <div className="flex-1 min-w-[180px]">
                          <label htmlFor="student-id-input" className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-gray-600 dark:text-zinc-400">
                            Student Number <span className="font-normal normal-case text-gray-400 dark:text-zinc-500">{requestForm.clientType === "Alumni" ? "(Optional)" : "*"}</span>
                          </label>
                          <Input
                            id="student-id-input"
                            type="text"
                            placeholder={requestForm.clientType === "Alumni" ? "Optional if forgotten" : "YYYY-XXXXX-SJ-0"}
                            value={requestForm.studentNo || ""}
                            onChange={(e) => setRequestForm({ ...requestForm, studentNo: e.target.value })}
                            className="h-10 w-full rounded-xl border border-gray-200 dark:border-white/10 bg-white px-3 text-sm text-gray-900 placeholder:text-gray-400 shadow-none outline-none focus-visible:border-pup-maroon focus-visible:ring-1 focus-visible:ring-pup-maroon dark:focus-visible:border-red-500/80 dark:focus-visible:ring-red-500/80 dark:bg-zinc-800 dark:text-zinc-100"
                          />
                          <p className="mt-1 text-[11px] text-gray-500 dark:text-zinc-400">
                            {requestForm.clientType === "Alumni" ? "Optional for alumni who do not recall their student number." : "Official PUP student registration number."}
                          </p>
                        </div>

                        {requestForm.clientType === "Alumni" && (
                          <div className="flex-1 min-w-[200px]">
                            <label htmlFor="student-course-select" className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-gray-600 dark:text-zinc-400">
                              Academic Program {!requestForm.studentNo && <span className="text-red-500">*</span>}
                            </label>
                            <Select
                              id="student-course-select"
                              value={requestForm.courseCode || ""}
                              onChange={(e) => setRequestForm({ ...requestForm, courseCode: e.target.value })}
                              className="h-10 rounded-xl text-sm font-normal border border-gray-200 dark:border-white/10 dark:bg-zinc-800 shadow-none text-gray-800 dark:text-zinc-100"
                            >
                              <option value="">Select degree program...</option>
                              {courses.map((c) => (
                                <option key={c.code} value={c.code}>
                                  {c.code} - {c.name}
                                </option>
                              ))}
                            </Select>
                            <p className="mt-1 text-[11px] text-gray-500 dark:text-zinc-400">
                              Program/course graduated or attended.
                            </p>
                          </div>
                        )}

                        <div className="flex-1 min-w-[220px]">
                          <label htmlFor="student-document-type" className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-gray-600 dark:text-zinc-400">
                            Document Type <span className="text-red-500">*</span>
                          </label>
                          <Select
                            id="student-document-type"
                            value={requestForm.docType}
                            placeholder="Select a document type"
                            onChange={(e) => setRequestForm({ ...requestForm, docType: e.target.value })}
                            className={`h-10 rounded-xl text-sm font-normal border border-gray-200 dark:border-white/10 dark:bg-zinc-800 shadow-none ${
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

                      <div className="flex flex-col">
                        <label htmlFor="student-request-description" className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-gray-600 dark:text-zinc-400">
                          Description / Purpose <span className="text-red-500">*</span>
                        </label>
                        <textarea
                          id="student-request-description"
                          required
                          rows={2}
                          className="min-h-[80px] w-full rounded-brand border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-pup-maroon focus:ring-2 focus:ring-pup-maroon/10 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 placeholder:text-gray-400"
                          placeholder="Provide the purpose of your request (e.g. employment verification, board exam, transfer credentials, etc.)"
                          value={requestForm.notes}
                          onChange={(e) => setRequestForm({ ...requestForm, notes: e.target.value })}
                        />
                      </div>

                      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
                        <span className="text-xs text-gray-500 dark:text-zinc-400">
                          Requests are received and reviewed in order by the Registrar Office.
                        </span>
                        <Button
                          type="submit"
                          disabled={requestSubmitting || docTypes.length === 0}
                          className="w-full sm:w-auto h-10 px-6 bg-pup-maroon text-white hover:bg-red-900 font-semibold rounded-brand flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer"
                        >
                          {requestSubmitting ? (
                            <>
                              <i className="ph-bold ph-spinner animate-spin text-sm" />
                              Submitting...
                            </>
                          ) : (
                            "Submit"
                          )}
                        </Button>
                      </div>
                    </form>
                  </Card>

                  {/* Card 2: Request History & Interactive Table */}
                  <Card className="rounded-brand border border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-card dark:shadow-none overflow-hidden flex flex-col font-inter focus:outline-none" onKeyDown={handleKeyDown} tabIndex={0}>
                    {/* Header & Toolbar */}
                    <div className="border-b border-gray-100 dark:border-white/10 p-5 sm:p-6 pb-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <h2 className="text-[16px] font-semibold text-gray-900 dark:text-zinc-50">Request History</h2>
                          <p className="mt-0.5 text-xs text-gray-500 dark:text-zinc-400">Track every Registrar update and status change in real time.</p>
                        </div>
                        {loading ? (
                          <Skeleton className="h-6 w-16 rounded-full dark:bg-muted" />
                        ) : (
                          <span className="self-start sm:self-auto rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-600 dark:bg-zinc-800 dark:text-zinc-300">
                            {data.requests.length} total
                          </span>
                        )}
                      </div>

                      {/* Toolbar Row: Search + Status Filter */}
                      <div className="mt-4 flex flex-row items-center gap-[12px] w-full select-none">
                        <div className="flex-1 min-w-0 relative group">
                          <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                            <i className="ph-bold ph-magnifying-glass text-gray-400 dark:text-zinc-500 transition-colors group-focus-within:text-pup-maroon dark:group-focus-within:text-red-400 text-sm"></i>
                          </div>
                          <Input
                            type="text"
                            placeholder="Search by ticket ID, document type, notes..."
                            className="h-9 w-full rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 pl-9 pr-20 text-xs font-normal text-gray-900 dark:text-zinc-100 placeholder:text-gray-400 dark:placeholder:text-zinc-500 shadow-none focus-visible:outline-none focus-visible:border-pup-maroon focus-visible:ring-1 focus-visible:ring-pup-maroon dark:focus-visible:border-red-500/80 dark:focus-visible:ring-red-500/80"
                            value={requestSearch}
                            onChange={(e) => {
                              setRequestSearch(e.target.value);
                              setCurrentPage(1);
                            }}
                          />
                          <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-[12px] font-normal text-gray-400 dark:text-zinc-500">
                            {loading ? (
                              <Skeleton className="h-3.5 w-14 rounded dark:bg-muted" />
                            ) : (
                              `${filteredRequests.length} results`
                            )}
                          </div>
                        </div>

                        <div className="shrink-0 w-[160px]">
                          <Select
                            value={statusFilter}
                            onChange={(e) => {
                              setStatusFilter(e.target.value);
                              setCurrentPage(1);
                            }}
                            className="h-9 rounded-xl text-xs font-normal border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-200 cursor-pointer shadow-none focus-visible:outline-none focus-visible:border-pup-maroon focus-visible:ring-1 focus-visible:ring-pup-maroon dark:focus-visible:border-red-500/80 dark:focus-visible:ring-red-500/80 transition-all"
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

                    {/* Active Filters Pill Bar (inspired by StaffDirectoryTab) */}
                    {hasActiveFilters && (
                      <div className="flex-none border-b border-gray-100 bg-white px-6 py-2.5 animate-in fade-in slide-in-from-top-1 duration-normal dark:border-white/10 dark:bg-card">
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

                    {/* Main Table */}
                    <div className="w-full overflow-x-auto">
                      <table className="min-w-full text-sm">
                        <thead className="sticky top-0 z-10 border-b-[0.5px] border-black/10 dark:border-white/10 bg-white dark:bg-card">
                          <tr className="text-left text-[12px] font-medium tracking-[0.04em] text-[#8E8E93] dark:text-zinc-500">
                            <th className="w-24 p-4 pl-6">
                              <button
                                onClick={() => handleSort("id")}
                                className={cn(
                                  "group flex items-center transition-colors focus:outline-none cursor-pointer text-[12px] font-medium tracking-[0.04em]",
                                  sortBy === "id" ? "text-[#111111] dark:text-white" : "text-[#8E8E93] dark:text-zinc-500 hover:text-[#111111] dark:hover:text-white"
                                )}
                              >
                                Ticket # <SortIndicator column="id" sortBy={sortBy} sortOrder={sortOrder} />
                              </button>
                            </th>
                            <th className="p-4 min-w-[220px]">
                              <button
                                onClick={() => handleSort("doc_type")}
                                className={cn(
                                  "group flex items-center transition-colors focus:outline-none cursor-pointer text-[12px] font-medium tracking-[0.04em]",
                                  sortBy === "doc_type" ? "text-[#111111] dark:text-white" : "text-[#8E8E93] dark:text-zinc-500 hover:text-[#111111] dark:hover:text-white"
                                )}
                              >
                                Document Type <SortIndicator column="doc_type" sortBy={sortBy} sortOrder={sortOrder} />
                              </button>
                            </th>
                            <th className="w-32 p-4">
                              <button
                                onClick={() => handleSort("client_type")}
                                className={cn(
                                  "group flex items-center transition-colors focus:outline-none cursor-pointer text-[12px] font-medium tracking-[0.04em]",
                                  sortBy === "client_type" ? "text-[#111111] dark:text-white" : "text-[#8E8E93] dark:text-zinc-500 hover:text-[#111111] dark:hover:text-white"
                                )}
                              >
                                Client <SortIndicator column="client_type" sortBy={sortBy} sortOrder={sortOrder} />
                              </button>
                            </th>
                            <th className="p-4 min-w-[240px]">Purpose / Description</th>
                            <th className="w-36 p-4">
                              <button
                                onClick={() => handleSort("status")}
                                className={cn(
                                  "group flex items-center transition-colors focus:outline-none cursor-pointer text-[12px] font-medium tracking-[0.04em]",
                                  sortBy === "status" ? "text-[#111111] dark:text-white" : "text-[#8E8E93] dark:text-zinc-500 hover:text-[#111111] dark:hover:text-white"
                                )}
                              >
                                Status <SortIndicator column="status" sortBy={sortBy} sortOrder={sortOrder} />
                              </button>
                            </th>
                            <th className="w-44 p-4">
                              <button
                                onClick={() => handleSort("created_at")}
                                className={cn(
                                  "group flex items-center transition-colors focus:outline-none cursor-pointer text-[12px] font-medium tracking-[0.04em]",
                                  sortBy === "created_at" ? "text-[#111111] dark:text-white" : "text-[#8E8E93] dark:text-zinc-500 hover:text-[#111111] dark:hover:text-white"
                                )}
                              >
                                Date Requested <SortIndicator column="created_at" sortBy={sortBy} sortOrder={sortOrder} />
                              </button>
                            </th>
                            <th className="w-28 p-4 pr-6 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="bg-transparent">
                          {loading ? (
                            <StudentRequestsTableRowsSkeleton rowCount={itemsPerPage || 6} />
                          ) : sortedRequests.length === 0 ? (
                            <tr className="border-0 hover:bg-transparent">
                              <td colSpan={7} className="p-12 text-center">
                                <Empty className="flex h-[320px] flex-col items-center justify-center border-0 bg-transparent text-center">
                                  <EmptyHeader className="flex flex-col items-center gap-0">
                                    <div className="relative mb-6">
                                      <div className="absolute inset-0 scale-150 animate-pulse rounded-full bg-gray-50 opacity-50 dark:bg-card"></div>
                                      <EmptyMedia className="relative z-10 flex h-20 w-20 items-center justify-center rounded-2xl border border-gray-100 bg-white shadow-md dark:border-white/10 dark:bg-card dark:shadow-none">
                                        <i className={hasActiveFilters ? "ph-magnifying-glass text-2xl text-pup-maroon" : "ph-tray text-2xl text-pup-maroon"}></i>
                                      </EmptyMedia>
                                    </div>
                                    <EmptyTitle className="text-lg font-semibold text-gray-900 dark:text-zinc-50">
                                      {hasActiveFilters ? "No Matches Found" : "No Document Requests Yet"}
                                    </EmptyTitle>
                                    <EmptyDescription className="max-w-xs text-sm font-medium text-gray-500 dark:text-zinc-400">
                                      {hasActiveFilters
                                        ? "Try adjusting your search query or status filter."
                                        : "You haven't submitted any document requests yet. Use the form above to submit your first request."}
                                    </EmptyDescription>
                                    {hasActiveFilters && (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                          setRequestSearch("");
                                          setStatusFilter("All");
                                          setCurrentPage(1);
                                        }}
                                        className="mt-5 flex h-9 items-center gap-2 rounded-brand border border-gray-300 bg-white px-4 text-xs font-semibold text-gray-600 shadow-sm transition-colors hover:border-gray-300 hover:bg-red-50 hover:text-pup-maroon dark:bg-card dark:text-zinc-300"
                                      >
                                        <i className="ph-bold ph-arrow-counter-clockwise"></i>
                                        Clear
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
                                <td className="py-0 px-4 pl-6 align-middle text-[13px] font-medium text-gray-700 dark:text-zinc-300">
                                  #{item.id}
                                </td>
                                <td className="py-0 px-4 align-middle">
                                  <span className="text-[14px] font-medium text-[#111111] dark:text-zinc-100">
                                    {item.doc_type}
                                  </span>
                                </td>
                                <td className="py-0 px-4 align-middle">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span
                                      className={cn(
                                        "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold border",
                                        item.client_type === "Alumni"
                                          ? "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/30 dark:text-purple-300 dark:border-purple-800/40"
                                          : "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-800/40"
                                      )}
                                    >
                                      {item.client_type || "Student"}
                                    </span>
                                    {item.course_code && (
                                      <span className="inline-flex items-center rounded-full bg-gray-100 dark:bg-zinc-800 px-2 py-0.5 text-[10px] font-medium text-gray-700 dark:text-zinc-300" title={item.course_name || item.course_code}>
                                        {item.course_code}
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
                                <td className="py-0 px-4 pr-6 align-middle text-right" onClick={(e) => e.stopPropagation()}>
                                  <button
                                    type="button"
                                    onClick={() => setSelectedRequestForDetail(item)}
                                    title="View Request Updates Timeline"
                                    className="inline-flex h-7 w-7 items-center justify-center rounded-[6px] text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10 hover:text-pup-maroon dark:hover:text-red-400 transition-colors cursor-pointer"
                                  >
                                    <i className="ph-bold ph-clock-counter-clockwise text-[16px]"></i>
                                  </button>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* Pagination Bar (identical in style to StaffDirectoryTab) */}
                    {loading ? (
                      <StudentRequestsPaginationSkeleton />
                    ) : filteredRequests.length > 0 ? (
                      <div className="flex items-center justify-between border-t border-gray-100 bg-white p-4 sm:p-6 px-6 sm:px-8 dark:border-white/10 dark:bg-card mt-auto">
                        <div className="flex items-center gap-8">
                          <div className="flex items-center gap-6 text-[12px] font-normal text-gray-400 dark:text-zinc-500">
                            <span>
                              Showing {paginatedRequests.length} of {filteredRequests.length}
                            </span>
                            <div className="flex items-center gap-1.5 border-l border-gray-200 pl-6 dark:border-white/10">
                              <span className="text-[12px] text-gray-400 dark:text-zinc-500">Rows:</span>
                              <div className="flex items-center gap-1">
                                {[5, 10, 20, 50].map((size) => (
                                  <button
                                    key={size}
                                    type="button"
                                    onClick={() => {
                                      setItemsPerPage(size);
                                      setCurrentPage(1);
                                    }}
                                    className={`px-2 py-0.5 rounded-[4px] text-[12px] font-normal cursor-pointer transition-colors border-0 ${
                                      itemsPerPage === size
                                        ? "bg-gray-100 text-[#111111] font-medium dark:bg-white/10 dark:text-zinc-50"
                                        : "bg-transparent text-gray-400 dark:text-zinc-500 hover:text-gray-700 dark:hover:text-zinc-300"
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
                            disabled={displayPage <= 1}
                            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                            className="h-8 bg-transparent text-[12px] font-normal text-gray-400 hover:text-pup-maroon dark:text-zinc-500 dark:hover:text-zinc-200 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer border-0 p-0"
                          >
                            Prev
                          </button>

                          <div className="flex h-8 min-w-[32px] items-center justify-center rounded-[6px] border border-gray-200/80 bg-white px-2.5 text-[12px] font-medium text-gray-900 dark:border-white/10 dark:bg-card dark:text-zinc-100">
                            {displayPage}
                          </div>

                          <button
                            disabled={displayPage >= totalPages}
                            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                            className="h-8 bg-transparent text-[12px] font-normal text-gray-400 hover:text-pup-maroon dark:text-zinc-500 dark:hover:text-zinc-200 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer border-0 p-0"
                          >
                            Next
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </Card>
                </div>
              ) : <>
                <section className="rounded-brand border border-gray-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-card">
                  <h2 className="text-base font-bold text-gray-900 dark:text-zinc-50">Submit an Event Proposal</h2>
                  <p className="mt-1 text-sm text-gray-500 dark:text-zinc-400">Upload one PDF proposal for OSAS review.</p>
                  <form onSubmit={submitProposal} className="mt-5 grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-gray-600 dark:text-zinc-400">Event title</label>
                      <Input placeholder="Event title" value={proposalForm.title} onChange={(e) => setProposalForm({ ...proposalForm, title: e.target.value })} required />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-gray-600 dark:text-zinc-400">Organization</label>
                      <Input placeholder="Organization name" value={proposalForm.organizationName} onChange={(e) => setProposalForm({ ...proposalForm, organizationName: e.target.value })} required />
                    </div>
                    <div>
                      <label htmlFor="event-date" className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-gray-600 dark:text-zinc-400">Event date</label>
                      <Input id="event-date" type="date" aria-label="Event date" value={proposalForm.eventDate} onClick={(e) => e.currentTarget.showPicker?.()} onChange={(e) => setProposalForm({ ...proposalForm, eventDate: e.target.value })} required />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-gray-600 dark:text-zinc-400">Proposal PDF</label>
                      <Input type="file" accept="application/pdf" onChange={(e) => setProposalForm({ ...proposalForm, file: e.target.files?.[0] || null })} required />
                    </div>
                    <div className="md:col-span-2">
                      <Button type="submit" disabled={proposalSubmitting} className="bg-pup-maroon text-white hover:bg-red-900 font-semibold rounded-brand">
                        {proposalSubmitting ? "Submitting..." : "Submit"}
                      </Button>
                    </div>
                  </form>
                </section>
                <section className="rounded-brand border border-gray-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-card">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-base font-bold text-gray-900 dark:text-zinc-50">Submission history</h2>
                      <p className="mt-1 text-sm text-gray-500 dark:text-zinc-400">Follow OSAS review updates and requested revisions.</p>
                    </div>
                    {loading ? (
                      <Skeleton className="h-6 w-16 rounded-full dark:bg-muted" />
                    ) : (
                      <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-600 dark:bg-zinc-800 dark:text-zinc-300">
                        {data.proposals.length} total
                      </span>
                    )}
                  </div>
                  {loading ? (
                    <StudentOsasProposalsListSkeleton count={3} />
                  ) : (
                    <div className="mt-5 space-y-3">
                      {data.proposals.map((item) => (
                        <article key={item.id} className="rounded-brand border border-gray-200 p-4 dark:border-white/10">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <h3 className="font-semibold text-gray-900 dark:text-zinc-50">{item.title}</h3>
                            <StatusBadge status={item.status} />
                          </div>
                          <p className="mt-2 text-sm text-gray-500 dark:text-zinc-400">
                            {item.organization_name} · {item.event_date}
                          </p>
                          <ol className="mt-4 space-y-2 border-l-2 border-gray-200 pl-4 text-xs text-gray-500 dark:border-white/10 dark:text-zinc-400">
                            {item.updates.map((update) => (
                              <li key={update.id}>
                                <span className="font-semibold text-gray-700 dark:text-zinc-300">{update.status}</span> — {update.message || "Status updated"}
                              </li>
                            ))}
                          </ol>
                        </article>
                      ))}
                      {data.proposals.length === 0 && (
                        <p className="rounded-brand bg-gray-50 px-4 py-8 text-center text-sm text-gray-500 dark:bg-zinc-800/40 dark:text-zinc-400">
                          No OSAS submissions yet.
                        </p>
                      )}
                    </div>
                  )}
                </section>
              </>}
              </div>
            </div>
          </main>
        </div>
      </div>

      {/* Request Details & Timeline Modal Dialog */}
      <Dialog
        open={Boolean(selectedRequestForDetail)}
        onOpenChange={(open) => !open && setSelectedRequestForDetail(null)}
      >
        <DialogContent className="max-w-lg rounded-2xl p-6 font-inter">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-pup-maroon bg-red-50 dark:bg-red-950/40 px-3 py-1 rounded-full border border-red-100 dark:border-red-900/30">
                Request #{selectedRequestForDetail?.id}
              </span>
              <StatusBadge status={selectedRequestForDetail?.status} />
            </div>
            <DialogTitle className="text-lg font-bold text-gray-900 dark:text-zinc-50 mt-2">
              {selectedRequestForDetail?.doc_type}
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-500 dark:text-zinc-400">
              Submitted on {selectedRequestForDetail?.created_at ? formatPHDateTime(selectedRequestForDetail.created_at) : "—"} · {selectedRequestForDetail?.client_type || "Student"}
              {selectedRequestForDetail?.student_no ? ` (${selectedRequestForDetail.student_no})` : ""}
              {selectedRequestForDetail?.course_code ? ` · ${selectedRequestForDetail.course_code}` : ""}
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 space-y-4 text-sm">
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
                <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-[2px] before:bg-gray-200 dark:before:bg-zinc-800">
                  {selectedRequestForDetail.updates.map((upd, idx) => (
                    <div key={upd.id || idx} className="relative">
                      <div className="absolute -left-6 top-1.5 h-3 w-3 rounded-full border-2 border-white bg-pup-maroon dark:border-zinc-900 shadow-sm" />
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

          <DialogFooter className="mt-6 sm:justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedRequestForDetail(null)}
              className="rounded-lg text-xs"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}
