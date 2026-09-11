"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import PageHeader from "@/components/shared/PageHeader";
import OsasMonitoringSkeleton from "@/components/staff/skeletons/OsasMonitoringSkeleton";

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
        observer = new ResizeObserver(() => {
          renderPage().catch(() => {});
        });
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

  return (
    <a
      href={`/api/osas/event-proposals/${proposalId}?file=1`}
      target="_blank"
      rel="noreferrer"
      className="group block"
      aria-label={`Open full PDF for ${title}`}
    >
      <div
        ref={containerRef}
        className="mt-3 flex w-full items-center justify-center overflow-hidden rounded-lg border border-gray-200 bg-gray-50 p-2 transition-opacity group-hover:opacity-90 dark:border-white/10 dark:bg-zinc-900/60"
        aria-label={`First-page preview of ${title}`}
      >
        <canvas ref={canvasRef} />
      </div>
    </a>
  );
}

export default function OsasMonitoringTab({ showToast }) {
  const [rows, setRows] = useState([]);
  const [selected, setSelected] = useState(null);
  const [status, setStatus] = useState("Submitted");
  const [note, setNote] = useState("");
  const [subtab, setSubtab] = useState("active");
  const [counts, setCounts] = useState({ active: 0, archive: 0 });
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/osas/event-proposals${subtab === "archive" ? "?archived=1" : ""}`,
        { cache: "no-store" }
      );
      const json = await res.json();
      if (res.ok && json.ok) {
        setRows(json.data);
      } else {
        showToast?.(
          { title: "Load failed", description: json?.error || "Unable to load OSAS submissions." },
          true
        );
      }
    } catch {
      showToast?.({ title: "Load failed", description: "Unable to load OSAS submissions." }, true);
    } finally {
      setLoading(false);
    }
  }, [subtab, showToast]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSelected(null);
      load();
      Promise.all([
        fetch("/api/osas/event-proposals", { cache: "no-store" }),
        fetch("/api/osas/event-proposals?archived=1", { cache: "no-store" }),
      ])
        .then(async ([activeRes, archiveRes]) => {
          const [activeJson, archiveJson] = await Promise.all([
            activeRes.json(),
            archiveRes.json(),
          ]);
          setCounts({
            active: activeRes.ok && activeJson.ok ? activeJson.data.length : 0,
            archive: archiveRes.ok && archiveJson.ok ? archiveJson.data.length : 0,
          });
        })
        .catch(() => {});
    }, 0);
    return () => clearTimeout(timer);
  }, [subtab, load]);

  const select = async (item) => {
    const res = await fetch(`/api/osas/event-proposals/${item.id}`, { cache: "no-store" });
    const json = await res.json();
    if (res.ok && json.ok) {
      setSelected(json.data);
      setStatus(json.data.status);
      setNote("");
    }
  };

  const save = async () => {
    const res = await fetch(`/api/osas/event-proposals/${selected.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, note }),
    });
    const json = await res.json();
    if (!res.ok || !json.ok) {
      return showToast?.({ title: "Update failed", description: json?.error || "Unable to save." }, true);
    }
    showToast?.({ title: "Proposal updated", description: "The student timeline was updated." });
    await load();
    await select(json.data);
  };

  const archive = async (item) => {
    const res = await fetch(`/api/osas/event-proposals/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ archive: true }),
    });
    const json = await res.json();
    if (!res.ok || !json.ok) {
      return showToast?.({ title: "Archive failed", description: json?.error || "Unable to archive proposal." }, true);
    }
    if (selected?.id === item.id) setSelected(null);
    showToast?.({ title: "Proposal archived", description: "The proposal was removed from active monitoring." });
    await load();
  };

  if (loading) {
    return <OsasMonitoringSkeleton />;
  }

  return (
    <div className="grid h-full gap-4 lg:grid-cols-[1fr_420px] animate-fade-up font-inter select-none">
      {/* Left Column: Proposals List */}
      <section className="rounded-brand border border-gray-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-card flex flex-col">
        <h2 className="text-lg font-bold text-gray-900 dark:text-zinc-50">OSAS Monitoring</h2>
        <p className="mb-4 text-sm text-gray-600 dark:text-zinc-400">
          Review student Event Proposals and publish status updates.
        </p>

        {/* Subtabs: Active / Archive */}
        <div className="mb-4 flex items-center gap-6 shrink-0 h-10 border-b border-gray-100 dark:border-white/10 bg-transparent select-none">
          <button
            type="button"
            onClick={() => setSubtab("active")}
            className={cn(
              "relative h-full flex items-center text-[13px] font-semibold transition-colors focus:outline-none cursor-pointer border-0 bg-transparent",
              subtab === "active"
                ? "text-gray-900 dark:text-zinc-50 after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-full after:bg-gray-900 dark:after:bg-zinc-50"
                : "text-[#8E8E93] font-normal hover:text-gray-700 dark:hover:text-zinc-200"
            )}
          >
            Active ({counts.active})
          </button>
          <button
            type="button"
            onClick={() => setSubtab("archive")}
            className={cn(
              "relative h-full flex items-center text-[13px] font-semibold transition-colors focus:outline-none cursor-pointer border-0 bg-transparent",
              subtab === "archive"
                ? "text-gray-900 dark:text-zinc-50 after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-full after:bg-gray-900 dark:after:bg-zinc-50"
                : "text-[#8E8E93] font-normal hover:text-gray-700 dark:hover:text-zinc-200"
            )}
          >
            Archive ({counts.archive})
          </button>
        </div>

        {/* Proposals List */}
        <div className="space-y-2 flex-1">
          {rows.map((item) => (
            <div
              key={item.id}
              className={`flex items-center gap-2 rounded-brand border p-3.5 transition-all ${
                selected?.id === item.id
                  ? "border-pup-maroon/40 bg-red-50/40 dark:border-red-800/40 dark:bg-red-950/20"
                  : "border-gray-200 hover:bg-gray-50 dark:border-white/10 dark:hover:bg-zinc-800/50"
              }`}
            >
              <button
                type="button"
                onClick={() => select(item)}
                className="min-w-0 flex-1 text-left text-sm"
              >
                <div className="flex items-center justify-between gap-2">
                  <strong className="text-gray-900 dark:text-zinc-100 font-semibold">{item.title}</strong>
                  <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold bg-gray-100 text-gray-700 border-gray-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700">
                    {item.status}
                  </span>
                </div>
                <p className="mt-1 text-xs text-gray-500 dark:text-zinc-400">
                  {item.student_name} · {item.organization_name}
                </p>
              </button>
              {subtab === "active" && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="shrink-0 border-gray-200 text-xs font-semibold hover:bg-gray-100 dark:border-white/10 dark:hover:bg-zinc-800"
                  onClick={() => archive(item)}
                  aria-label={`Archive ${item.title}`}
                >
                  Archive
                </Button>
              )}
            </div>
          ))}
          {!rows.length && (
            <div className="rounded-brand border border-dashed border-gray-200 bg-gray-50 px-4 py-12 text-center dark:border-zinc-800 dark:bg-zinc-900/50">
              <i className="ph-duotone ph-tray text-3xl text-gray-400 dark:text-zinc-500 mb-2 block"></i>
              <p className="text-sm font-semibold text-gray-700 dark:text-zinc-300">
                {subtab === "archive" ? "No archived event proposals." : "No event proposals submitted."}
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Right Column: Inspector Aside */}
      <aside className="rounded-brand border border-gray-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-card flex flex-col justify-between">
        {selected ? (
          <div className="flex flex-col h-full">
            <div className="pb-3 border-b border-gray-100 dark:border-white/5 mb-4">
              <h3 className="text-base font-bold text-gray-900 dark:text-zinc-50">{selected.title}</h3>
              <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">
                {selected.student_name} · {selected.organization_name}
              </p>
            </div>

            <FirstPagePreview proposalId={selected.id} title={selected.title} />

            {subtab === "active" && (
              <div className="mt-4 space-y-3">
                <select
                  className="h-10 w-full rounded-brand border border-gray-300 bg-white px-3 text-sm text-gray-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  {statuses.map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </select>
                <textarea
                  className="min-h-24 w-full rounded-brand border border-gray-300 bg-white p-3 text-sm text-gray-900 outline-none focus:border-pup-maroon focus:ring-2 focus:ring-pup-maroon/10 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                  placeholder="Student-visible update note..."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
                <Button
                  className="w-full bg-pup-maroon text-white hover:bg-red-900 font-semibold"
                  onClick={save}
                >
                  Publish
                </Button>
              </div>
            )}

            {selected.updates?.length > 0 && (
              <ol className="mt-4 border-l border-gray-200 pl-3 text-xs space-y-2 dark:border-zinc-800">
                {selected.updates.map((update) => (
                  <li key={update.id} className="text-gray-600 dark:text-zinc-400">
                    <strong className="text-gray-900 dark:text-zinc-200">{update.status}</strong> — {update.message}
                  </li>
                ))}
              </ol>
            )}
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-gray-400 dark:text-zinc-500">
            <i className="ph-duotone ph-cursor-click text-3xl mb-2"></i>
            <p className="text-sm font-medium text-gray-600 dark:text-zinc-400">
              Select a proposal to review its first page preview and updates.
            </p>
          </div>
        )}
      </aside>
    </div>
  );
}
