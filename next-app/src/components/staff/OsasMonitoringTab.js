"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

const statuses = ["Submitted", "Under Review", "Needs Revision", "Approved", "Declined"];

function FirstPagePreview({ proposalId, title }) {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    let active = true;
    let page = null;
    let observer = null;

    const renderPage = async () => {
      if (!active || !page || !containerRef.current || !canvasRef.current) return;
      const container = containerRef.current;
      const canvas = canvasRef.current;
      const width = Math.max(container.clientWidth - 16, 1);
      const baseViewport = page.getViewport({ scale: 1 });
      const scale = width / baseViewport.width;
      const viewport = page.getViewport({ scale });
      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);
      canvas.style.width = `${Math.floor(viewport.width)}px`;
      canvas.style.height = `${Math.floor(viewport.height)}px`;
      await page.render({ canvasContext: canvas.getContext("2d"), viewport }).promise;
    };

    const loadPreview = async () => {
      try {
        const response = await fetch(`/api/osas/event-proposals/${proposalId}?file=1`);
        if (!response.ok) throw new Error("Unable to load proposal preview");
        const data = await response.arrayBuffer();
        const pdfjs = await import("pdfjs-dist/build/pdf.mjs");
        pdfjs.GlobalWorkerOptions.workerSrc = "/pdfjs/pdf.worker.min.mjs";
        const pdf = await pdfjs.getDocument({ data }).promise;
        page = await pdf.getPage(1);
        if (!active) return;
        await renderPage();
        observer = new ResizeObserver(() => { renderPage().catch(() => {}); });
        observer.observe(containerRef.current);
      } catch (error) {
        console.error("Failed to render OSAS proposal preview:", error);
      }
    };

    loadPreview();
    return () => {
      active = false;
      observer?.disconnect();
    };
  }, [proposalId]);

  return <a href={`/api/osas/event-proposals/${proposalId}?file=1`} target="_blank" rel="noreferrer" className="group block" aria-label={`Open full PDF for ${title}`}><div ref={containerRef} className="mt-3 flex w-full items-center justify-center overflow-hidden rounded border border-gray-200 bg-gray-100 p-2 transition-opacity group-hover:opacity-90" aria-label={`First-page preview of ${title}`}><canvas ref={canvasRef} /></div></a>;
}

export default function OsasMonitoringTab({ showToast }) {
  const [rows, setRows] = useState([]); const [selected, setSelected] = useState(null); const [status, setStatus] = useState("Submitted"); const [note, setNote] = useState(""); const [subtab, setSubtab] = useState("active"); const [counts, setCounts] = useState({ active: 0, archive: 0 });
  const load = async () => { const res = await fetch(`/api/osas/event-proposals${subtab === "archive" ? "?archived=1" : ""}`, { cache: "no-store" }); const json = await res.json(); if (res.ok && json.ok) setRows(json.data); else showToast?.({ title: "Load failed", description: json?.error || "Unable to load OSAS submissions." }, true); };
  useEffect(() => { const timer = setTimeout(() => { setSelected(null); load(); Promise.all([fetch("/api/osas/event-proposals", { cache: "no-store" }), fetch("/api/osas/event-proposals?archived=1", { cache: "no-store" })]).then(async ([activeRes, archiveRes]) => { const [activeJson, archiveJson] = await Promise.all([activeRes.json(), archiveRes.json()]); setCounts({ active: activeRes.ok && activeJson.ok ? activeJson.data.length : 0, archive: archiveRes.ok && archiveJson.ok ? archiveJson.data.length : 0 }); }).catch(() => {}); }, 0); return () => clearTimeout(timer); }, [subtab]);
  const select = async (item) => { const res = await fetch(`/api/osas/event-proposals/${item.id}`, { cache: "no-store" }); const json = await res.json(); if (res.ok && json.ok) { setSelected(json.data); setStatus(json.data.status); setNote(""); } };
  const save = async () => { const res = await fetch(`/api/osas/event-proposals/${selected.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status, note }) }); const json = await res.json(); if (!res.ok || !json.ok) return showToast?.({ title: "Update failed", description: json?.error || "Unable to save." }, true); showToast?.({ title: "Proposal updated", description: "The student timeline was updated." }); await load(); await select(json.data); };
  const archive = async (item) => { const res = await fetch(`/api/osas/event-proposals/${item.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ archive: true }) }); const json = await res.json(); if (!res.ok || !json.ok) return showToast?.({ title: "Archive failed", description: json?.error || "Unable to archive proposal." }, true); if (selected?.id === item.id) setSelected(null); showToast?.({ title: "Proposal archived", description: "The proposal was removed from active monitoring." }); await load(); };
  return <div className="grid h-full gap-4 lg:grid-cols-[1fr_420px]"><section className="rounded-brand bg-white p-5 shadow-sm"><h2 className="text-lg font-bold">OSAS Monitoring</h2><p className="mb-4 text-sm text-gray-600">Review student Event Proposals and publish status updates.</p><div className="mb-4 flex gap-8 border-b"><button type="button" onClick={() => setSubtab("active")} className={`relative pb-3 text-sm font-medium ${subtab === "active" ? "text-black after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-full after:bg-black" : "text-gray-400"}`}>Active ({counts.active})</button><button type="button" onClick={() => setSubtab("archive")} className={`relative pb-3 text-sm font-medium ${subtab === "archive" ? "text-black after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-full after:bg-black" : "text-gray-400"}`}>Archive ({counts.archive})</button></div><div className="space-y-2">{rows.map((item) => <div key={item.id} className="flex items-center gap-2 rounded border p-3 hover:bg-gray-50"><button type="button" onClick={() => select(item)} className="min-w-0 flex-1 text-left text-sm"><strong>{item.title}</strong><span className="ml-2 text-gray-600">{item.status}</span><p className="text-gray-600">{item.student_name} · {item.organization_name}</p></button>{subtab === "active" && <Button type="button" variant="outline" size="sm" className="shrink-0 border-yellow-400 text-black hover:bg-yellow-50" onClick={() => archive(item)} aria-label={`Archive ${item.title}`}>Archive</Button>}</div>)}{!rows.length && <p className="text-sm text-gray-600">{subtab === "archive" ? "No archived event proposals." : "No event proposals submitted."}</p>}</div></section><aside className="rounded-brand bg-white p-5 shadow-sm">{selected ? <><h3 className="font-bold">{selected.title}</h3><FirstPagePreview proposalId={selected.id} title={selected.title} />{subtab === "active" && <><select className="mt-4 w-full rounded border p-2" value={status} onChange={(e) => setStatus(e.target.value)}>{statuses.map((item) => <option key={item}>{item}</option>)}</select><textarea className="mt-3 w-full rounded border p-2 text-sm" placeholder="Student-visible update" value={note} onChange={(e) => setNote(e.target.value)} /><Button className="mt-3 bg-yellow-400 text-black hover:bg-yellow-500" onClick={save}>Publish update</Button></>}<ol className="mt-4 border-l pl-3 text-sm">{selected.updates?.map((update) => <li key={update.id} className="mb-2"><strong>{update.status}</strong> — {update.message}</li>)}</ol></> : <p className="text-sm text-gray-600">Select a proposal to review it.</p>}</aside></div>;
}
