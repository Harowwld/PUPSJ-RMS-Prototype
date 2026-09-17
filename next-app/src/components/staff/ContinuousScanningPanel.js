"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const EMPTY_STATS = { total: 0, remaining: 0, succeeded: 0, confirmed: 0, review: 0, failed: 0 };

export default function ContinuousScanningPanel({ onOpenReview, showToast = () => {} }) {
  const [workerConnected, setWorkerConnected] = useState(false);
  const [batch, setBatch] = useState(null);
  const [stats, setStats] = useState(EMPTY_STATS);
  const [recentSuccesses, setRecentSuccesses] = useState([]);
  const [completedScans, setCompletedScans] = useState([]);
  const [currentFile, setCurrentFile] = useState("");
  const [showCompleted, setShowCompleted] = useState(false);
  const [completedPage, setCompletedPage] = useState(0);
  const [completedQuery, setCompletedQuery] = useState("");
  const [completedStatus, setCompletedStatus] = useState("");
  const loadMonitor = useCallback(async () => {
    const response = await fetch("/api/ingest/review?limit=100", { cache: "no-store" });
    const json = await response.json().catch(() => null);
    if (!response.ok || !json?.ok) throw new Error(json?.error || "Unable to read OCR queue");
    const rows = Array.isArray(json.data?.rows) ? json.data.rows : [];
    const successfulRows = rows.filter((row) => row.ocr_status === "completed");
    const processingRows = rows.filter((row) => !["completed", "failed"].includes(String(row.ocr_status || "").toLowerCase()));
    const confirmedRows = rows.filter((row) => row.review_status === "Confirmed");
    const reviewRows = rows.filter((row) => ["Needs Review", "Conflict", "Duplicate"].includes(row.review_status));
    const failedRows = rows.filter((row) => row.ocr_status === "failed" || row.review_status === "Failed");
    setBatch({ total: rows.length, rows });
    if (successfulRows.length) {
      setCompletedScans((current) => {
        const merged = [...successfulRows, ...current].filter((row, index, all) => (
          all.findIndex((candidate) => Number(candidate.id) === Number(row.id)) === index
        ));
        return merged;
      });
      setRecentSuccesses((current) => {
        const merged = [...successfulRows, ...current].filter((row, index, all) => (
          all.findIndex((candidate) => Number(candidate.id) === Number(row.id)) === index
        ));
        return merged.slice(0, 5);
      });
    }
    setCurrentFile(rows.find((row) => row.review_status === "Processing")?.original_filename || "");
    setStats(rows.length > 0 ? {
      total: rows.length,
      remaining: processingRows.length,
      succeeded: successfulRows.length,
      confirmed: confirmedRows.length,
      review: reviewRows.length,
      failed: failedRows.length,
    } : EMPTY_STATS);
    return rows;
  }, []);

  useEffect(() => {
    let disposed = false;
    let source = null;
    let retryTimer = null;
    let retryDelay = 1000;

    const refresh = () => loadMonitor().catch((error) => {
      showToast({ title: "OCR Monitor Warning", description: error.message || "Unable to refresh OCR queue." }, true);
    });
    const connect = () => {
      if (disposed) return;
      source = new EventSource("/api/ingest/events");
      source.addEventListener("ready", () => {
        setWorkerConnected(true);
        retryDelay = 1000;
        refresh();
      });
      source.addEventListener("ingest", refresh);
      source.addEventListener("heartbeat", () => setWorkerConnected(true));
      source.onerror = () => {
        setWorkerConnected(false);
        source?.close();
        if (disposed) return;
        retryTimer = setTimeout(connect, retryDelay);
        retryDelay = Math.min(retryDelay * 2, 10000);
      };
    };

    refresh();
    connect();
    return () => {
      disposed = true;
      clearTimeout(retryTimer);
      source?.close();
    };
  }, [loadMonitor, showToast]);

  const percent = stats.total ? Math.min(100, Math.round(((stats.succeeded + stats.failed) / stats.total) * 100)) : 0;
  // Keep this separate from `batch`: continuous scanning rolls over to a new
  // batch when the current one is empty, but completed results must remain
  // available in the current workspace.
  const completedRows = completedScans;
  const filteredCompletedRows = completedRows.filter((row) => {
    const search = completedQuery.trim().toLowerCase();
    const matchesSearch = !search || [row.original_filename, row.ocr_name, row.proposed_student_no, row.proposed_doc_type]
      .some((value) => String(value || "").toLowerCase().includes(search));
    const matchesStatus = !completedStatus || row.review_status === completedStatus;
    return matchesSearch && matchesStatus;
  });
  const completedPageSize = 25;
  const completedPageCount = Math.max(1, Math.ceil(filteredCompletedRows.length / completedPageSize));
  const visibleCompletedRows = filteredCompletedRows.slice(completedPage * completedPageSize, (completedPage + 1) * completedPageSize);

  return (
    <div className="mx-6 my-2.5 rounded-2xl border border-blue-200/70 bg-blue-50/50 p-3.5 dark:border-blue-500/20 dark:bg-blue-950/20">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-sm font-bold text-gray-900 dark:text-zinc-50">
            <span className={`h-2.5 w-2.5 rounded-full ${workerConnected ? "bg-emerald-500" : "bg-amber-500"}`} />
            Continuous Scanning
          </div>
          <p className="mt-1 text-xs text-gray-600 dark:text-zinc-400">OCR starts automatically when a stable inbound file is received.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-gray-500 dark:text-zinc-400">{workerConnected ? "Event stream connected" : "Reconnecting"}</span>
          <Button
            size="sm"
            variant="outline"
            onClick={onOpenReview}
            className="h-9 px-4 text-xs font-semibold rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-xs cursor-pointer active:scale-95 transition-all"
          >
            Review
          </Button>
        </div>
      </div>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/80 dark:bg-zinc-800">
        <div className="h-full rounded-full bg-blue-600 transition-all duration-300" style={{ width: `${percent}%` }} />
      </div>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] font-medium text-gray-600 dark:text-zinc-400">
        <span>{batch?.total > 0 ? `${stats.total} total in batch` : `${stats.total} waiting in inbound queue`}</span><span>{batch?.total > 0 ? `${stats.remaining} OCR remaining` : `${stats.remaining} waiting to be claimed`}</span><span className="text-emerald-700 dark:text-emerald-400">{stats.succeeded} OCR complete</span><span>{stats.confirmed} confirmed</span><span>{stats.review} review</span><span>{stats.failed} failed</span>
        {currentFile && <span className="max-w-[360px] truncate" title={currentFile}>Current: {currentFile}</span>}
      </div>
      {recentSuccesses.length > 0 && (
        <div className="mt-3 border-t border-blue-100 pt-3 dark:border-blue-400/20">
          <div className="mb-2 flex items-center justify-between gap-2"><div className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">Recent completed scans</div><Button size="xs" variant="outline" onClick={() => { setCompletedPage(0); setShowCompleted(true); }} className="h-7 px-2.5 text-xs font-medium rounded-lg border border-blue-200 bg-white dark:bg-zinc-800 text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-zinc-700 shadow-xs cursor-pointer active:scale-95">View ({completedRows.length})</Button></div>
          <div className="grid gap-1 sm:grid-cols-2">
            {recentSuccesses.map((row) => (
              <div key={row.id} className="flex min-w-0 items-center justify-between gap-2 rounded-lg bg-white/70 px-2.5 py-1.5 text-[11px] dark:bg-zinc-900/50">
                <span className="truncate font-medium text-gray-700 dark:text-zinc-200" title={row.original_filename}>{row.original_filename}</span>
                <span className="shrink-0 text-emerald-700 dark:text-emerald-400">OCR complete</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {showCompleted && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-label="Completed scans">
        <div className="flex max-h-[85vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-white/10 dark:bg-zinc-900">
          <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4 dark:border-white/10"><div><h2 className="text-base font-semibold text-gray-900 dark:text-zinc-50">Completed scans</h2><p className="mt-1 text-xs text-gray-500 dark:text-zinc-400">{completedRows.length} OCR-completed document(s) in this batch. Confirmation is still required.</p></div><Button size="sm" variant="outline" onClick={() => setShowCompleted(false)} className="h-9 px-4 text-xs font-semibold rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-xs cursor-pointer active:scale-95">Close</Button></div>
          <div className="flex flex-wrap gap-2 border-b border-gray-100 p-4 dark:border-white/5"><Input value={completedQuery} onChange={(event) => { setCompletedQuery(event.target.value); setCompletedPage(0); }} placeholder="Search filename, student, or type" className="h-9 min-w-[220px] flex-1 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 px-3 text-xs font-normal text-gray-900 dark:text-zinc-100 placeholder:text-gray-400 dark:placeholder:text-zinc-500 shadow-none focus-visible:outline-none focus-visible:border-pup-maroon focus-visible:ring-1 focus-visible:ring-pup-maroon dark:focus-visible:border-red-500/80 dark:focus-visible:ring-red-500/80" /><select value={completedStatus} onChange={(event) => { setCompletedStatus(event.target.value); setCompletedPage(0); }} className="h-9 rounded-xl border border-gray-200 bg-white px-3 text-xs font-normal text-gray-700 shadow-none outline-none focus-visible:outline-none focus-visible:border-pup-maroon focus-visible:ring-1 focus-visible:ring-pup-maroon dark:border-white/10 dark:bg-zinc-800 dark:text-zinc-200"><option value="">All review statuses</option><option value="Needs Review">Needs Review</option><option value="Conflict">Conflict</option><option value="Duplicate">Duplicate</option><option value="Rejected">Rejected</option><option value="Confirmed">Confirmed</option></select></div>
          <div className="min-h-0 flex-1 overflow-auto p-4"><div className="grid gap-2">{visibleCompletedRows.length ? visibleCompletedRows.map((row) => <div key={row.id} className="rounded-xl border border-gray-200 p-3 dark:border-white/10"><div className="flex flex-wrap items-start justify-between gap-2"><div className="min-w-0"><div className="truncate text-sm font-medium text-gray-900 dark:text-zinc-100" title={row.original_filename}>{row.original_filename}</div><div className="mt-1 text-xs text-gray-500 dark:text-zinc-400">{row.proposed_doc_type || "Document type not detected"} · {row.ocr_name || "No extracted name"}</div></div><span className="shrink-0 rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-medium text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300">OCR complete</span></div><div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-gray-500 dark:text-zinc-400"><span>Match: {row.match_confidence != null ? `${Math.round(Number(row.match_confidence) * 100)}%` : "—"} · Review: {row.review_status || "Needs Review"}</span><Button size="xs" variant="outline" onClick={() => { setShowCompleted(false); onOpenReview?.(); }} className="h-7 px-2.5 text-xs font-medium rounded-lg border border-gray-200 bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-xs cursor-pointer active:scale-95">Review</Button></div></div>) : <p className="py-8 text-center text-sm text-gray-500">No completed scans match the current filters.</p>}</div></div>
          <div className="flex items-center justify-between border-t border-gray-200 px-4 py-3 text-xs text-gray-500 dark:border-white/10"><span>Page {Math.min(completedPage + 1, completedPageCount)} of {completedPageCount}</span><div className="flex gap-2"><Button size="xs" variant="outline" onClick={() => setCompletedPage((current) => Math.max(0, current - 1))} disabled={completedPage === 0} className="h-7 px-2.5 text-xs font-medium rounded-lg border border-gray-200 bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-xs cursor-pointer active:scale-95 disabled:opacity-40">Previous</Button><Button size="xs" variant="outline" onClick={() => setCompletedPage((current) => Math.min(completedPageCount - 1, current + 1))} disabled={completedPage + 1 >= completedPageCount} className="h-7 px-2.5 text-xs font-medium rounded-lg border border-gray-200 bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-xs cursor-pointer active:scale-95 disabled:opacity-40">Next</Button></div></div>
        </div>
      </div>}
    </div>
  );
}
