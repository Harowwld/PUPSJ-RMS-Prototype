"use client";

import { useCallback, useEffect, useState } from "react";
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

const requestStatuses = ["Pending", "InProgress", "Ready", "Completed", "Cancelled"];

export default function StudentDashboard() {
  const router = useRouter();
  const [me, setMe] = useState(null);
  const [data, setData] = useState({ requests: [], documents: [], proposals: [], activity: [] });
  const [docTypes, setDocTypes] = useState([]);
  const [authMode, setAuthMode] = useState("login");
  const [auth, setAuth] = useState({ studentNo: "", name: "", password: "" });
  const [requestForm, setRequestForm] = useState({ studentNo: "", docType: "", notes: "", clientType: "Student" });
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
    const [requestRes, proposalRes, typesRes, activityRes] = await Promise.all([
      fetch("/api/student/document-requests", { cache: "no-store" }),
      fetch("/api/student/event-proposals", { cache: "no-store" }),
      fetch("/api/doc-types", { cache: "no-store" }),
      fetch("/api/student/activity", { cache: "no-store" }),
    ]);
    const [requestJson, proposalJson, typesJson, activityJson] = await Promise.all([requestRes.json(), proposalRes.json(), typesRes.json(), activityRes.json()]);
    if (!requestRes.ok || !requestJson?.ok || !proposalRes.ok || !proposalJson?.ok) {
      throw new Error(requestJson?.error || proposalJson?.error || "Unable to load student records.");
    }
    setDocTypes(Array.isArray(typesJson?.data) ? typesJson.data : []);
    setData({ requests: requestJson?.data?.requests || [], documents: requestJson?.data?.documents || [], proposals: proposalJson?.data || [], activity: activityJson?.data || [] });
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

      if (!clientType) {
        setMessage("Client type is required.");
        showToast("Client type required", "Please select whether you are a Student or Alumni.", true);
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

  if (!me) return null;
  if (!me && false) return (
    <main className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-slate-50 p-8 font-sans dark:bg-zinc-950">
      <div className="liquid-container">
        <div className="liquid-blob liquid-blob-1" />
        <div className="liquid-blob liquid-blob-2" />
        <div className="liquid-blob liquid-blob-3" />
      </div>

      <div className="absolute left-6 top-6 z-20 flex select-none items-center gap-1">
        <img src="/assets/branding/black-icon.png" alt="eManage Logo" className="h-8 w-8 object-contain" />
        <span className="text-[26px] font-semibold leading-none tracking-tight text-[#1D1D1F] dark:text-zinc-50">eManage</span>
      </div>

      <div className="z-10 w-full max-w-[550px] p-4">
      <section className="glass-panel relative flex h-[630px] w-full flex-col items-center rounded-[20px] px-[52px] py-[56px]">
        <div className="mb-3 flex flex-col items-center text-center">
          <div className="relative mb-3 flex h-[160px] w-[160px] shrink-0 items-center justify-center select-none">
            <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 160 160" aria-hidden="true">
              {[{ r: 72, count: 24, size: 4.2, reverse: false }, { r: 63, count: 24, size: 3.4, reverse: true }, { r: 54, count: 24, size: 2.8, reverse: false }, { r: 45, count: 24, size: 2.2, reverse: true }].map((ring, rIdx) => {
                const dots = [];
                for (let i = 0; i < ring.count; i += 1) {
                  const angle = (i * 2 * Math.PI) / ring.count;
                  const cx = Number((80 + ring.r * Math.cos(angle)).toFixed(4));
                  const cy = Number((80 + ring.r * Math.sin(angle)).toFixed(4));
                  const progress = i / ring.count;
                  const color = `hsl(${(340 + progress * 35) % 360}, ${Math.round(65 + Math.sin(progress * Math.PI) * 25)}%, ${Math.round(28 + progress * 24)}%)`;
                  dots.push(<circle key={i} cx={cx} cy={cy} r={ring.size} fill={color} />);
                }
                return <g key={rIdx} className={ring.reverse ? "origin-center animate-spin-reverse" : "origin-center animate-spin-slow"} style={{ transformOrigin: "80px 80px", animationDuration: rIdx % 2 ? "35s" : "45s" }}>{dots}</g>;
              })}
            </svg>
            <img src="/assets/branding/black-icon.png" alt="" aria-hidden="true" className="relative z-10 h-8 w-8 object-contain animate-in zoom-in-50 duration-500" />
          </div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#E5484D]">Student Portal</p>
          <h1 className="text-[25px] font-bold tracking-tight text-[#1D1D1F] dark:text-zinc-50">Student ODRS</h1>
          <p className="mt-2 max-w-sm text-sm leading-5 text-[#636366] dark:text-zinc-300">
            {authMode === "register"
              ? "Create your account using the student record registered with PUP San Juan."
              : "Sign in to track document requests and OSAS submissions."}
          </p>
        </div>

        <form onSubmit={submitAuth} className="w-full">
          <div className={`merged-container bg-white dark:bg-zinc-800 ${message ? "has-error" : ""}`}>
            <div className={`field-wrapper ${studentNoFocused || auth.studentNo ? "active" : ""}`}>
              <label htmlFor="student-number">Student Number</label>
              <Input id="student-number" autoComplete="username" placeholder=" " value={auth.studentNo} onFocus={() => setStudentNoFocused(true)} onBlur={() => setStudentNoFocused(false)} onChange={(e) => { const studentNo = e.target.value; setAuth((current) => ({ ...current, studentNo, ...(studentNo.trim() ? {} : { password: "" }) })); }} className="pr-3 focus-visible:ring-0 focus-visible:ring-offset-0" required />
            </div>
            {authMode === "register" && (
              <div className={`field-wrapper border-t border-black/10 dark:border-white/10 ${studentNameFocused || auth.name ? "active" : ""}`}>
                <label htmlFor="student-name">Full Name</label>
                <Input id="student-name" autoComplete="name" placeholder=" " value={auth.name} onFocus={() => setStudentNameFocused(true)} onBlur={() => setStudentNameFocused(false)} onChange={(e) => setAuth({ ...auth, name: e.target.value })} className="pr-3 focus-visible:ring-0 focus-visible:ring-offset-0" required />
              </div>
            )}
            {auth.studentNo.trim() && <div className={`field-wrapper border-t border-black/10 dark:border-white/10 ${studentPasswordFocused || auth.password ? "active" : ""}`}>
              <label htmlFor="student-password">Password</label>
              <Input id="student-password" type={showStudentPassword ? "text" : "password"} autoComplete={authMode === "register" ? "new-password" : "current-password"} placeholder=" " value={auth.password} onFocus={() => setStudentPasswordFocused(true)} onBlur={() => setStudentPasswordFocused(false)} onChange={(e) => setAuth({ ...auth, password: e.target.value })} className="pr-11 focus-visible:ring-0 focus-visible:ring-offset-0" required />
              <button type="button" aria-label={showStudentPassword ? "Hide password" : "Show password"} onClick={() => setShowStudentPassword((visible) => !visible)} className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center text-[#8E8E93] hover:text-[#1D1D1F] focus:outline-none dark:text-zinc-400 dark:hover:text-zinc-200">
                <i className={`ph-bold ${showStudentPassword ? "ph-eye-slash" : "ph-eye"} text-[16px]`} aria-hidden="true" />
              </button>
            </div>}
          </div>

          {message && <div role="alert" className="mt-1.5 flex min-h-5 items-center gap-1.5 text-left text-[#E5484D]"><i className="ph-bold ph-warning-circle shrink-0 text-[14px]" aria-hidden="true" /><p className="text-[12px] font-normal leading-none">{message}</p></div>}

          <Button disabled={authSubmitting} className="btn-brand-red mt-8 h-11 w-full rounded-[8px] text-[13px] font-medium text-white active:scale-95 disabled:opacity-50 transition-all" type="submit">
            {authSubmitting ? "Please wait..." : authMode === "register" ? "Create Student Account" : "Sign In to ODRS"}
          </Button>
          <button type="button" className="mx-auto block text-[13px] font-medium text-[#E5484D] hover:underline" onClick={() => { setAuthMode(authMode === "register" ? "login" : "register"); setMessage(""); }}>
            {authMode === "register" ? "Already registered? Sign in" : "New student? Create your account"}
          </button>
        </form>

        <div className="mt-8 flex gap-2 border-t border-black/10 pt-4 text-xs leading-5 text-[#636366] dark:border-white/10 dark:text-zinc-400">
          <i className="ph-fill ph-shield-check mt-0.5 text-base text-[#007AFF]" aria-hidden="true" />
          <p>Your account securely connects you to your records and request updates.</p>
        </div>
      </section>
      </div>
    </main>
  );

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
    const s = String(status || "").toLowerCase();
    let badgeClass = "bg-amber-50 text-amber-800 border-amber-200/80 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-800/40";
    if (s === "approved" || s === "completed" || s === "ready") {
      badgeClass = "bg-emerald-50 text-emerald-800 border-emerald-200/80 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-800/40";
    } else if (s === "inprogress") {
      badgeClass = "bg-blue-50 text-blue-800 border-blue-200/80 dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-800/40";
    } else if (s === "declined" || s === "cancelled") {
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
                        <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-medium bg-red-50 text-pup-maroon border border-red-100 dark:bg-red-950/30 dark:border-red-900/30">
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
              {view === "activity" ? <section className="rounded-brand border border-gray-200 bg-white p-5 shadow-sm"><h2 className="text-base font-bold text-gray-900">My Activity</h2><p className="mt-1 text-sm text-gray-500">A history of actions performed on your account.</p><div className="mt-5 space-y-3">{data.activity.length === 0 ? <p className="rounded-brand bg-gray-50 px-4 py-8 text-center text-sm text-gray-500">No activity recorded yet.</p> : data.activity.map((item) => <article key={item.id} className="rounded-brand border border-gray-200 p-4"><div className="flex items-center justify-between gap-3"><p className="text-sm font-semibold text-gray-900">{item.action}</p><time className="text-xs text-gray-500">{formatPHDateTime(item.created_at)}</time></div>{item.details && <p className="mt-1 text-sm text-gray-500">{item.details}</p>}</article>)}</div></section> : view === "odrs" ? <>
                <section className="grid gap-4 lg:grid-cols-[1fr_1.35fr]">
                  <div className="rounded-brand border border-gray-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-card">
                    <h2 className="text-base font-bold text-gray-900 dark:text-zinc-50">New document request</h2>
                    <p className="mt-1 text-sm text-gray-500 dark:text-zinc-400">Request an academic document from the Registrar.</p>

                    {/* Duplicate ticket reminder notice banner */}
                    <div className="mt-3.5 flex items-start gap-2.5 rounded-brand border border-amber-200 bg-amber-50/80 p-3 text-xs text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-300">
                      <i className="ph-bold ph-info text-[15px] shrink-0 mt-0.5 text-amber-600 dark:text-amber-400"></i>
                      <p className="leading-relaxed font-medium">
                        Please avoid creating duplicate tickets for the same concern to help us process your request promptly.
                      </p>
                    </div>

                    <form onSubmit={createRequest} className="mt-4 space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label htmlFor="student-client-type" className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-gray-600 dark:text-zinc-400">
                            Client Type <span className="text-red-500">*</span>
                          </label>
                          <Select
                            id="student-client-type"
                            value={requestForm.clientType}
                            onChange={(e) => setRequestForm({ ...requestForm, clientType: e.target.value })}
                            className="h-10 text-sm font-normal text-gray-800 dark:text-zinc-100 border-gray-300 dark:border-zinc-700 dark:bg-zinc-800"
                          >
                            <option value="Student">Student (Currently Enrolled)</option>
                            <option value="Alumni">Alumni (Graduate / Former)</option>
                          </Select>
                        </div>

                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <label htmlFor="student-id-input" className="block text-xs font-bold uppercase tracking-wide text-gray-600 dark:text-zinc-400">
                              Student Number <span className="font-normal normal-case text-gray-400 dark:text-zinc-500">(Optional)</span>
                            </label>
                            {me?.student_no ? (
                              <span className="text-[11px] text-gray-500 font-mono dark:text-zinc-400">
                                Default: {me.student_no}
                              </span>
                            ) : null}
                          </div>
                          <Input
                            id="student-id-input"
                            type="text"
                            placeholder="e.g. 2020-00123-TG-0 (optional)"
                            value={requestForm.studentNo || ""}
                            onChange={(e) => setRequestForm({ ...requestForm, studentNo: e.target.value })}
                            className="h-10 w-full rounded-brand border border-gray-300 bg-white px-3 text-sm font-mono text-gray-900 placeholder:text-gray-400 outline-none focus-visible:ring-pup-maroon dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                          />
                          <p className="mt-1 text-[11px] text-gray-500 dark:text-zinc-400">
                            Optional for alumni who do not recall their student number.
                          </p>
                        </div>
                      </div>

                      <div>
                        <label htmlFor="student-document-type" className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-gray-600 dark:text-zinc-400">
                          Document Type <span className="text-red-500">*</span>
                        </label>
                        <Select
                          id="student-document-type"
                          value={requestForm.docType}
                          placeholder="Select a document type"
                          onChange={(e) => setRequestForm({ ...requestForm, docType: e.target.value })}
                          className={`h-10 text-sm font-normal border-gray-300 dark:border-zinc-700 dark:bg-zinc-800 ${
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
                      <div>
                        <label htmlFor="student-request-description" className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-gray-600 dark:text-zinc-400">
                          Description / Purpose <span className="text-red-500">*</span>
                        </label>
                        <textarea
                          id="student-request-description"
                          required
                          className="min-h-24 w-full rounded-brand border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-pup-maroon focus:ring-2 focus:ring-pup-maroon/10 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                          placeholder="Provide the purpose of your request (e.g. employment verification, board exam, transfer credentials, etc.)"
                          value={requestForm.notes}
                          onChange={(e) => setRequestForm({ ...requestForm, notes: e.target.value })}
                        />
                      </div>
                      <Button
                        type="submit"
                        disabled={requestSubmitting || docTypes.length === 0}
                        className="w-full bg-pup-maroon text-white hover:bg-red-900 font-semibold"
                      >
                        {requestSubmitting ? "Submitting..." : "Submit request"}
                      </Button>
                    </form>
                  </div>
                  <div className="rounded-brand border border-gray-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-card">
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-base font-bold text-gray-900 dark:text-zinc-50">Request history</h2>
                        <p className="mt-1 text-sm text-gray-500 dark:text-zinc-400">Track every Registrar update in one place.</p>
                      </div>
                      <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-600 dark:bg-zinc-800 dark:text-zinc-300">{data.requests.length} total</span>
                    </div>
                    <div className="mt-5 space-y-3">
                      {data.requests.map((item) => (
                        <article key={item.id} className="rounded-brand border border-gray-200 p-4 dark:border-zinc-800 dark:bg-zinc-900/40">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-semibold text-gray-900 dark:text-zinc-100">{item.doc_type}</h3>
                              {item.client_type && (
                                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold border ${
                                  item.client_type === "Alumni"
                                    ? "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/30 dark:text-purple-300 dark:border-purple-800/40"
                                    : "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-800/40"
                                }`}>
                                  {item.client_type}
                                </span>
                              )}
                            </div>
                            <StatusBadge status={item.status} />
                          </div>
                          <p className="mt-2 text-sm text-gray-500 dark:text-zinc-400">{item.notes || "No notes added."}</p>
                          <ol className="mt-4 space-y-2 border-l-2 border-gray-200 pl-4 text-xs text-gray-500 dark:border-zinc-700 dark:text-zinc-400">
                            {item.updates.map((update) => (
                              <li key={update.id}>
                                <span className="font-semibold text-gray-700 dark:text-zinc-300">{update.status}</span> — {update.message || "Status updated"}
                              </li>
                            ))}
                          </ol>
                        </article>
                      ))}
                      {data.requests.length === 0 && (
                        <p className="rounded-brand bg-gray-50 px-4 py-8 text-center text-sm text-gray-500 dark:bg-zinc-800/40 dark:text-zinc-400">
                          No document requests yet.
                        </p>
                      )}
                    </div>
                  </div>
                </section>
              </> : <>
                <section className="rounded-brand border border-gray-200 bg-white p-5 shadow-sm"><h2 className="text-base font-bold text-gray-900">Submit an Event Proposal</h2><p className="mt-1 text-sm text-gray-500">Upload one PDF proposal for OSAS review.</p><form onSubmit={submitProposal} className="mt-5 grid gap-4 md:grid-cols-2"><div><label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-gray-600">Event title</label><Input placeholder="Event title" value={proposalForm.title} onChange={(e) => setProposalForm({ ...proposalForm, title: e.target.value })} required /></div><div><label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-gray-600">Organization</label><Input placeholder="Organization name" value={proposalForm.organizationName} onChange={(e) => setProposalForm({ ...proposalForm, organizationName: e.target.value })} required /></div><div><label htmlFor="event-date" className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-gray-600">Event date</label><Input id="event-date" type="date" aria-label="Event date" value={proposalForm.eventDate} onClick={(e) => e.currentTarget.showPicker?.()} onChange={(e) => setProposalForm({ ...proposalForm, eventDate: e.target.value })} required /></div><div><label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-gray-600">Proposal PDF</label><Input type="file" accept="application/pdf" onChange={(e) => setProposalForm({ ...proposalForm, file: e.target.files?.[0] || null })} required /></div><div className="md:col-span-2"><Button type="submit" disabled={proposalSubmitting} className="bg-pup-maroon text-white hover:bg-red-900">{proposalSubmitting ? "Submitting..." : "Submit proposal"}</Button></div></form></section>
                <section className="rounded-brand border border-gray-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><div><h2 className="text-base font-bold text-gray-900">Submission history</h2><p className="mt-1 text-sm text-gray-500">Follow OSAS review updates and requested revisions.</p></div><span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-600">{data.proposals.length} total</span></div><div className="mt-5 space-y-3">{data.proposals.map((item) => <article key={item.id} className="rounded-brand border border-gray-200 p-4"><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-semibold text-gray-900">{item.title}</h3><StatusBadge status={item.status} /></div><p className="mt-2 text-sm text-gray-500">{item.organization_name} · {item.event_date}</p><ol className="mt-4 space-y-2 border-l-2 border-gray-200 pl-4 text-xs text-gray-500">{item.updates.map((update) => <li key={update.id}><span className="font-semibold text-gray-700">{update.status}</span> — {update.message || "Status updated"}</li>)}</ol></article>)}{data.proposals.length === 0 && <p className="rounded-brand bg-gray-50 px-4 py-8 text-center text-sm text-gray-500">No OSAS submissions yet.</p>}</div></section>
              </>}
              </div>
            </div>
          </main>
        </div>
      </div>
    </TooltipProvider>
  );
}
