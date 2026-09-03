"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

const EMPTY_STATS = { total: 0, remaining: 0, succeeded: 0, confirmed: 0, review: 0, failed: 0 };

export default function ContinuousScanningPanel({ onOpenReview, showToast = () => {} }) {
  const [active, setActive] = useState(false);
  const [busy, setBusy] = useState(false);
  const [batch, setBatch] = useState(null);
  const [stats, setStats] = useState(EMPTY_STATS);
  const [recentSuccesses, setRecentSuccesses] = useState([]);
  const [completedScans, setCompletedScans] = useState([]);
  const [currentFile, setCurrentFile] = useState("");
  const [showCompleted, setShowCompleted] = useState(false);
  const [completedPage, setCompletedPage] = useState(0);
  const [completedQuery, setCompletedQuery] = useState("");
  const [completedStatus, setCompletedStatus] = useState("");
  const activeRef = useRef(false);
  const activeBatchRef = useRef(null);
  const cycleRef = useRef(null);
  const timerRef = useRef(null);

  const readInboundTotal = useCallback(async () => {
    const response = await fetch("/api/ingest/hot-folder?limit=1&includeFailed=1&includeRejected=0&onlyUnprocessed=1", { cache: "no-store" });
    const json = await response.json().catch(() => null);
    return response.ok && json?.ok ? Number(json.data?.total || 0) : 0;
  }, []);

  const updateBatch = useCallback(async (batchId) => {
    const response = await fetch(`/api/ingest/batches/${encodeURIComponent(batchId)}`, { cache: "no-store" });
    const json = await response.json().catch(() => null);
    if (!response.ok || !json?.ok) throw new Error(json?.error || "Unable to read batch progress");
    const data = json.data;
    const rows = Array.isArray(data.rows) ? data.rows : [];
    const successfulRows = rows.filter((row) => row.ocr_status === "completed");
    const processingRows = rows.filter((row) => !["completed", "failed"].includes(String(row.ocr_status || "").toLowerCase()));
    const confirmedRows = rows.filter((row) => row.review_status === "Confirmed");
    const reviewRows = rows.filter((row) => ["Needs Review", "Conflict", "Duplicate"].includes(row.review_status));
    const failedRows = rows.filter((row) => row.ocr_status === "failed" || row.review_status === "Failed");
    setBatch(data);
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
    if (data.total > 0) {
      setStats({
        total: rows.length,
        remaining: processingRows.length,
        succeeded: successfulRows.length,
        confirmed: confirmedRows.length,
        review: reviewRows.length,
        failed: failedRows.length,
      });
    }
    return data;
  }, []);

  const cycle = useCallback(async () => {
    if (!activeRef.current) return;
    setBusy(true);
    try {
      let batchId = activeBatchRef.current;
      if (!batchId) {
        const createResponse = await fetch("/api/ingest/batches", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sourceStation: "Continuous Scanning" }) });
        const createJson = await createResponse.json().catch(() => null);
        if (!createResponse.ok || !createJson?.ok) throw new Error(createJson?.error || "Unable to create scanning batch");
        const nextBatch = createJson.data;
        setBatch(nextBatch);
        if (nextBatch.claimed > 0) {
          batchId = nextBatch.batchId;
          activeBatchRef.current = batchId;
          setCurrentFile(nextBatch.rows?.[0]?.original_filename || "");
        } else {
          const inboundTotal = await readInboundTotal();
          setStats({ ...EMPTY_STATS, total: inboundTotal, remaining: inboundTotal });
        }
      }

      if (batchId) {
        const processResponse = await fetch(`/api/ingest/batches/${encodeURIComponent(batchId)}/process`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ limit: 1 }) });
        const processJson = await processResponse.json().catch(() => null);
        if (!processResponse.ok || !processJson?.ok) throw new Error(processJson?.error || "Batch OCR failed");
        for (const item of processJson.data?.items || []) {
          const filename = item.original_filename || `Document #${item.id}`;
          if (item.review_status === "Failed") {
            showToast({ title: "Document scan failed", description: `${filename}: ${item.last_error || "OCR processing failed."}` }, true);
          } else if (item.review_status === "Confirmed" && item.auto_promoted) {
            showToast({ title: "Document uploaded to student folder", description: `${filename} was matched to ${item.student_name || item.proposed_student_no || "the unique student match"}.` });
          } else {
            showToast({ title: "Document scanned successfully", description: `${filename} is ready in Batch Review.` });
          }
        }
        await updateBatch(batchId);
        if (Number(processJson.data?.processed || 0) === 0) activeBatchRef.current = null;
      } else {
        setCurrentFile("");
      }
    } catch (error) {
      showToast({ title: "Continuous Scanning Warning", description: error.message || "Scanner cycle failed." }, true);
    } finally {
      setBusy(false);
      if (activeRef.current) timerRef.current = window.setTimeout(cycle, 1200);
    }
  }, [readInboundTotal, showToast, updateBatch]);

  cycleRef.current = cycle;

  const start = () => {
    activeRef.current = true;
    activeBatchRef.current = null;
    setActive(true);
    cycle();
  };

  const stop = () => {
    activeRef.current = false;
    activeBatchRef.current = null;
    setActive(false);
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = null;
    setBusy(false);
  };

  useEffect(() => () => {
    activeRef.current = false;
    activeBatchRef.current = null;
    if (timerRef.current) window.clearTimeout(timerRef.current);
  }, []);

  // Keep OCR processing alive whenever the scanning workspace is open. The
  // file watcher can ingest files independently, so opening this workspace
  // must also resume any queued work without requiring a second button click.
  useEffect(() => {
    activeRef.current = true;
    setActive(true);
    const initialTimer = window.setTimeout(() => cycleRef.current?.(), 0);
    return () => window.clearTimeout(initialTimer);
  }, []);

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
    <div className="mb-4 rounded-brand border border-blue-100 bg-blue-50/60 px-6 py-4 dark:border-blue-400/20 dark:bg-blue-950/20">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-sm font-bold text-gray-900 dark:text-zinc-50">
            <span className={`h-2.5 w-2.5 rounded-full ${active ? "animate-pulse bg-emerald-500" : "bg-gray-300 dark:bg-zinc-600"}`} />
            Continuous Scanning
          </div>
          <p className="mt-1 text-xs text-gray-600 dark:text-zinc-400">Processes current and newly arriving inbound documents sequentially while this workspace is open.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant={active ? "outline" : "default"} onClick={active ? stop : start} disabled={busy && !active}>
            {active ? "Stop scanning" : "Start scanning"}
          </Button>
          <Button size="sm" variant="outline" onClick={onOpenReview}>Open review</Button>
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
          <div className="mb-2 flex items-center justify-between gap-2"><div className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">Recent completed scans</div><Button size="xs" variant="outline" onClick={() => { setCompletedPage(0); setShowCompleted(true); }}>View all ({completedRows.length})</Button></div>
          <div className="grid gap-1 sm:grid-cols-2">
            {recentSuccesses.map((row) => (
              <div key={row.id} className="flex min-w-0 items-center justify-between gap-2 rounded-md bg-white/70 px-2.5 py-1.5 text-[11px] dark:bg-zinc-900/50">
                <span className="truncate font-medium text-gray-700 dark:text-zinc-200" title={row.original_filename}>{row.original_filename}</span>
                <span className="shrink-0 text-emerald-700 dark:text-emerald-400">OCR complete</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {showCompleted && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-label="Completed scans">
        <div className="flex max-h-[85vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl bg-white shadow-xl dark:bg-zinc-900">
          <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4 dark:border-white/10"><div><h2 className="text-base font-semibold text-gray-900 dark:text-zinc-50">Completed scans</h2><p className="mt-1 text-xs text-gray-500 dark:text-zinc-400">{completedRows.length} OCR-completed document(s) in this batch. Confirmation is still required.</p></div><Button size="sm" variant="outline" onClick={() => setShowCompleted(false)}>Close</Button></div>
          <div className="flex flex-wrap gap-2 border-b border-gray-100 p-4 dark:border-white/5"><input value={completedQuery} onChange={(event) => { setCompletedQuery(event.target.value); setCompletedPage(0); }} placeholder="Search filename, student, or type" className="h-9 min-w-[220px] flex-1 rounded-md border border-gray-200 px-3 text-sm dark:border-white/10 dark:bg-zinc-950" /><select value={completedStatus} onChange={(event) => { setCompletedStatus(event.target.value); setCompletedPage(0); }} className="h-9 rounded-md border border-gray-200 bg-white px-2 text-sm dark:border-white/10 dark:bg-zinc-950"><option value="">All review statuses</option><option value="Needs Review">Needs Review</option><option value="Conflict">Conflict</option><option value="Duplicate">Duplicate</option><option value="Rejected">Rejected</option><option value="Confirmed">Confirmed</option></select></div>
          <div className="min-h-0 flex-1 overflow-auto p-4"><div className="grid gap-2">{visibleCompletedRows.length ? visibleCompletedRows.map((row) => <div key={row.id} className="rounded-lg border border-gray-200 p-3 dark:border-white/10"><div className="flex flex-wrap items-start justify-between gap-2"><div className="min-w-0"><div className="truncate text-sm font-medium text-gray-900 dark:text-zinc-100" title={row.original_filename}>{row.original_filename}</div><div className="mt-1 text-xs text-gray-500 dark:text-zinc-400">{row.proposed_doc_type || "Document type not detected"} · {row.ocr_name || "No extracted name"}</div></div><span className="shrink-0 rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-medium text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300">OCR complete</span></div><div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-gray-500 dark:text-zinc-400"><span>Match: {row.match_confidence != null ? `${Math.round(Number(row.match_confidence) * 100)}%` : "—"} · Review: {row.review_status || "Needs Review"}</span><Button size="xs" variant="outline" onClick={() => { setShowCompleted(false); onOpenReview?.(); }}>Open Batch Review</Button></div></div>) : <p className="py-8 text-center text-sm text-gray-500">No completed scans match the current filters.</p>}</div></div>
          <div className="flex items-center justify-between border-t border-gray-200 px-4 py-3 text-xs text-gray-500 dark:border-white/10"><span>Page {Math.min(completedPage + 1, completedPageCount)} of {completedPageCount}</span><div className="flex gap-2"><Button size="xs" variant="outline" onClick={() => setCompletedPage((current) => Math.max(0, current - 1))} disabled={completedPage === 0}>Previous</Button><Button size="xs" variant="outline" onClick={() => setCompletedPage((current) => Math.min(completedPageCount - 1, current + 1))} disabled={completedPage + 1 >= completedPageCount}>Next</Button></div></div>
        </div>
      </div>}
    </div>
  );
}
