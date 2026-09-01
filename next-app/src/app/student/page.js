"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Header from "@/components/layout/Header";
import Sidebar from "@/components/shared/Sidebar";

const requestStatuses = ["Pending", "InProgress", "Ready", "Completed", "Cancelled"];

export default function StudentDashboard() {
  const router = useRouter();
  const [me, setMe] = useState(null);
  const [data, setData] = useState({ requests: [], documents: [], proposals: [] });
  const [authMode, setAuthMode] = useState("login");
  const [auth, setAuth] = useState({ studentNo: "", name: "", password: "" });
  const [requestForm, setRequestForm] = useState({ docType: "", notes: "" });
  const [proposalForm, setProposalForm] = useState({ title: "", organizationName: "", eventDate: "", file: null });
  const [message, setMessage] = useState("");
  const [view, setView] = useState("odrs");
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const load = useCallback(async () => {
    const meRes = await fetch("/api/auth/me", { cache: "no-store" });
    const meJson = await meRes.json().catch(() => null);
    if (!meRes.ok || meJson?.data?.role !== "Student") return;
    setMe(meJson.data);
    const [requestRes, proposalRes] = await Promise.all([fetch("/api/student/document-requests", { cache: "no-store" }), fetch("/api/student/event-proposals", { cache: "no-store" })]);
    const [requestJson, proposalJson] = await Promise.all([requestRes.json(), proposalRes.json()]);
    setData({ requests: requestJson?.data?.requests || [], documents: requestJson?.data?.documents || [], proposals: proposalJson?.data || [] });
  }, []);

  useEffect(() => { const timer = setTimeout(() => { load().catch(() => {}); }, 0); return () => clearTimeout(timer); }, [load]);

  async function submitAuth(event) {
    event.preventDefault(); setMessage("");
    const endpoint = authMode === "register" ? "/api/auth/student/register" : "/api/auth/student/login";
    const body = authMode === "register" ? auth : { studentNo: auth.studentNo, password: auth.password };
    const res = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const json = await res.json();
    if (!res.ok || !json.ok) return setMessage(json.error || "Unable to continue.");
    await load();
  }

  async function createRequest(event) {
    event.preventDefault(); setMessage("");
    const res = await fetch("/api/student/document-requests", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(requestForm) });
    const json = await res.json();
    if (!res.ok || !json.ok) return setMessage(json.error || "Unable to submit request.");
    setRequestForm({ docType: "", notes: "" }); await load();
  }

  async function submitProposal(event) {
    event.preventDefault(); setMessage("");
    const form = new FormData();
    Object.entries(proposalForm).forEach(([key, value]) => value && form.set(key, value));
    const res = await fetch("/api/student/event-proposals", { method: "POST", body: form });
    const json = await res.json();
    if (!res.ok || !json.ok) return setMessage(json.error || "Unable to submit proposal.");
    setProposalForm({ title: "", organizationName: "", eventDate: "", file: null }); await load();
  }

  if (!me) return (
    <main className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-slate-50 p-6 font-sans dark:bg-zinc-950 sm:p-8">
      <div className="liquid-container">
        <div className="liquid-blob liquid-blob-1" />
        <div className="liquid-blob liquid-blob-2" />
        <div className="liquid-blob liquid-blob-3" />
      </div>

      <div className="absolute left-6 top-6 z-20 flex select-none items-center gap-1">
        <img src="/login-logo.png" alt="eManage Logo" className="h-8 w-8 object-contain" />
        <span className="text-[26px] font-semibold leading-none tracking-tight text-[#1D1D1F] dark:text-zinc-50">eManage</span>
      </div>

      <section className="glass-panel relative z-10 w-full max-w-[470px] rounded-[20px] px-7 py-10 sm:px-[52px] sm:py-12">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-white/60 bg-white/35 shadow-sm">
            <img src="/login-logo.png" alt="" aria-hidden="true" className="h-9 w-9 object-contain" />
          </div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#E5484D]">Student Portal</p>
          <h1 className="text-[25px] font-bold tracking-tight text-[#1D1D1F] dark:text-zinc-50">Student ODRS</h1>
          <p className="mt-2 max-w-sm text-sm leading-5 text-[#636366] dark:text-zinc-300">
            {authMode === "register"
              ? "Create your account using the student record registered with PUP San Juan."
              : "Sign in to track document requests and OSAS submissions."}
          </p>
        </div>

        <form onSubmit={submitAuth} className="space-y-4">
          <div className="space-y-3">
            <div>
              <label htmlFor="student-number" className="mb-1.5 block text-xs font-medium text-[#3A3A3C] dark:text-zinc-200">Student Number</label>
              <Input id="student-number" autoComplete="username" placeholder="e.g. 2024-00001" value={auth.studentNo} onChange={(e) => setAuth({ ...auth, studentNo: e.target.value })} className="h-11 rounded-[8px] border-black/20 bg-white/75 text-[#1D1D1F] placeholder:text-[#8E8E93] focus-visible:border-[#E5484D] focus-visible:ring-[#E5484D]/20" required />
            </div>
            {authMode === "register" && (
              <div>
                <label htmlFor="student-name" className="mb-1.5 block text-xs font-medium text-[#3A3A3C] dark:text-zinc-200">Full Name</label>
                <Input id="student-name" autoComplete="name" placeholder="As recorded by the school" value={auth.name} onChange={(e) => setAuth({ ...auth, name: e.target.value })} className="h-11 rounded-[8px] border-black/20 bg-white/75 text-[#1D1D1F] placeholder:text-[#8E8E93] focus-visible:border-[#E5484D] focus-visible:ring-[#E5484D]/20" required />
              </div>
            )}
            <div>
              <label htmlFor="student-password" className="mb-1.5 block text-xs font-medium text-[#3A3A3C] dark:text-zinc-200">Password</label>
              <Input id="student-password" type="password" autoComplete={authMode === "register" ? "new-password" : "current-password"} placeholder="Enter your password" value={auth.password} onChange={(e) => setAuth({ ...auth, password: e.target.value })} className="h-11 rounded-[8px] border-black/20 bg-white/75 text-[#1D1D1F] placeholder:text-[#8E8E93] focus-visible:border-[#E5484D] focus-visible:ring-[#E5484D]/20" required />
            </div>
          </div>

          {message && <p role="alert" className="rounded-[8px] border border-[#E5484D]/25 bg-[#E5484D]/10 px-3 py-2 text-sm text-[#B4232A]">{message}</p>}

          <Button className="btn-brand-red h-11 w-full rounded-[8px] text-[13px] font-medium text-white" type="submit">
            {authMode === "register" ? "Create Student Account" : "Sign In to ODRS"}
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
    </main>
  );

  const sidebarItems = [
    { type: "header", label: "Student Services" },
    { key: "odrs", label: "Document Requests", iconClass: "ph-bold ph-file-text" },
    { key: "osas", label: "OSAS Submissions", iconClass: "ph-bold ph-student" },
  ];

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    router.push("/");
  }

  const StatusBadge = ({ status }) => {
    const tone = status === "Approved" || status === "Completed" ? "bg-emerald-50 text-emerald-700" : status === "Declined" || status === "Cancelled" ? "bg-red-50 text-red-700" : status === "Under Review" ? "bg-blue-50 text-blue-700" : "bg-amber-50 text-amber-700";
    return <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${tone}`}>{status}</span>;
  };

  return (
    <div className="flex h-screen min-h-0 flex-col overflow-hidden bg-slate-50/30 font-inter dark:bg-zinc-950/30">
      <Header authUser={{ ...me, role: "Student", username: me.email || me.student_no }} onLogout={handleLogout} />
      <div className="flex min-h-0 flex-1">
        <Sidebar open={sidebarOpen} items={sidebarItems} activeKey={view} onSelect={setView} onLogout={handleLogout} accentColor="#800000" officeName="Student Portal" />
        <main className="min-w-0 flex-1 overflow-y-auto bg-white/25 p-4 backdrop-blur-xs sm:p-6">
          <div className="mx-auto max-w-7xl space-y-6">
            <div className="flex items-start justify-between gap-4">
              <div><p className="text-xs font-semibold uppercase tracking-widest text-pup-maroon">Student Portal</p><h1 className="mt-1 text-2xl font-bold tracking-tight text-gray-900 dark:text-white">{view === "odrs" ? "Document Requests" : "OSAS Submissions"}</h1><p className="mt-1 text-sm text-gray-500">Welcome back, {me.fname || me.name || "Student"}.</p></div>
              <Button variant="outline" className="hidden sm:inline-flex" onClick={() => setSidebarOpen((open) => !open)}><i className="ph-bold ph-sidebar mr-2" />Menu</Button>
            </div>
            {message && <p role="alert" className="rounded-brand border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{message}</p>}
            {view === "odrs" ? <>
              <section className="grid gap-4 lg:grid-cols-[1fr_1.35fr]">
                <div className="rounded-brand border border-gray-200 bg-white p-5 shadow-sm"><h2 className="text-base font-bold text-gray-900">New document request</h2><p className="mt-1 text-sm text-gray-500">Request an academic document from the Registrar.</p><form onSubmit={createRequest} className="mt-5 space-y-4"><div><label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-gray-600">Document type</label><Input placeholder="e.g. Certificate of Enrollment" value={requestForm.docType} onChange={(e) => setRequestForm({ ...requestForm, docType: e.target.value })} required /></div><div><label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-gray-600">Notes <span className="font-normal normal-case">(optional)</span></label><textarea className="min-h-24 w-full rounded-brand border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-pup-maroon focus:ring-2 focus:ring-pup-maroon/10" placeholder="Add details for the Registrar" value={requestForm.notes} onChange={(e) => setRequestForm({ ...requestForm, notes: e.target.value })} /></div><Button className="w-full bg-pup-maroon text-white hover:bg-red-900">Submit request</Button></form></div>
                <div className="rounded-brand border border-gray-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><div><h2 className="text-base font-bold text-gray-900">Request history</h2><p className="mt-1 text-sm text-gray-500">Track every Registrar update in one place.</p></div><span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-600">{data.requests.length} total</span></div><div className="mt-5 space-y-3">{data.requests.map((item) => <article key={item.id} className="rounded-brand border border-gray-200 p-4"><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-semibold text-gray-900">{item.doc_type}</h3><StatusBadge status={item.status} /></div><p className="mt-2 text-sm text-gray-500">{item.notes || "No notes added."}</p><ol className="mt-4 space-y-2 border-l-2 border-gray-200 pl-4 text-xs text-gray-500">{item.updates.map((update) => <li key={update.id}><span className="font-semibold text-gray-700">{update.status}</span> — {update.message || "Status updated"}</li>)}</ol></article>)}{data.requests.length === 0 && <p className="rounded-brand bg-gray-50 px-4 py-8 text-center text-sm text-gray-500">No document requests yet.</p>}</div></div>
              </section>
            </> : <>
              <section className="rounded-brand border border-gray-200 bg-white p-5 shadow-sm"><h2 className="text-base font-bold text-gray-900">Submit an Event Proposal</h2><p className="mt-1 text-sm text-gray-500">Upload one PDF proposal for OSAS review.</p><form onSubmit={submitProposal} className="mt-5 grid gap-4 md:grid-cols-2"><div><label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-gray-600">Event title</label><Input placeholder="Event title" value={proposalForm.title} onChange={(e) => setProposalForm({ ...proposalForm, title: e.target.value })} required /></div><div><label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-gray-600">Organization</label><Input placeholder="Organization name" value={proposalForm.organizationName} onChange={(e) => setProposalForm({ ...proposalForm, organizationName: e.target.value })} required /></div><div><label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-gray-600">Event date</label><Input type="date" value={proposalForm.eventDate} onChange={(e) => setProposalForm({ ...proposalForm, eventDate: e.target.value })} required /></div><div><label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-gray-600">Proposal PDF</label><Input type="file" accept="application/pdf" onChange={(e) => setProposalForm({ ...proposalForm, file: e.target.files?.[0] || null })} required /></div><div className="md:col-span-2"><Button className="bg-pup-maroon text-white hover:bg-red-900">Submit proposal</Button></div></form></section>
              <section className="rounded-brand border border-gray-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><div><h2 className="text-base font-bold text-gray-900">Submission history</h2><p className="mt-1 text-sm text-gray-500">Follow OSAS review updates and requested revisions.</p></div><span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-600">{data.proposals.length} total</span></div><div className="mt-5 space-y-3">{data.proposals.map((item) => <article key={item.id} className="rounded-brand border border-gray-200 p-4"><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-semibold text-gray-900">{item.title}</h3><StatusBadge status={item.status} /></div><p className="mt-2 text-sm text-gray-500">{item.organization_name} · {item.event_date}</p><ol className="mt-4 space-y-2 border-l-2 border-gray-200 pl-4 text-xs text-gray-500">{item.updates.map((update) => <li key={update.id}><span className="font-semibold text-gray-700">{update.status}</span> — {update.message || "Status updated"}</li>)}</ol></article>)}{data.proposals.length === 0 && <p className="rounded-brand bg-gray-50 px-4 py-8 text-center text-sm text-gray-500">No OSAS submissions yet.</p>}</div></section>
            </>}
          </div>
        </main>
      </div>
    </div>
  );
}
