"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const PAGE_SIZE = 200;

async function fetchReviewPage(status, offset) {
  const params = new URLSearchParams({
    status,
    limit: String(PAGE_SIZE),
    offset: String(offset),
  });
  const response = await fetch(`/api/ingest/review?${params}`, { cache: "no-store" });
  const json = await response.json().catch(() => null);
  if (!response.ok || !json?.ok) {
    throw new Error(json?.error || "Unable to load the batch review queue.");
  }
  return json.data || { rows: [], total: 0 };
}

export default function GlobalFailedBatchReviewModal({ officeId, showToast = () => {} }) {
  const [open, setOpen] = useState(false);
  const [failedRows, setFailedRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [retryingId, setRetryingId] = useState(null);
  const [dismissingId, setDismissingId] = useState(null);
  const [clearingAll, setClearingAll] = useState(false);
  const dismissedRef = useRef(false);
  const requestRef = useRef(0);

  const refresh = useCallback(async () => {
    if (!officeId) return;
    const requestId = ++requestRef.current;
    setLoading(true);

    try {
      const [queue, firstFailedPage] = await Promise.all([
        fetchReviewPage("Conflict", 0),
        fetchReviewPage("Failed", 0),
      ]);
      const failed = [...(firstFailedPage.rows || [])];
      const totalFailed = Number(firstFailedPage.total || 0);

      for (let offset = PAGE_SIZE; offset < totalFailed; offset += PAGE_SIZE) {
        const page = await fetchReviewPage("Failed", offset);
        failed.push(...(page.rows || []));
      }

      if (requestId !== requestRef.current) return;
      setFailedRows(failed);
      const shouldShow = Number(queue.total || 0) === 0 && totalFailed > 0;
      setOpen(shouldShow && !dismissedRef.current);
    } catch (error) {
      if (requestId === requestRef.current) {
        console.warn("[batch-review] Could not refresh failed items:", error.message);
      }
    } finally {
      if (requestId === requestRef.current) setLoading(false);
    }
  }, [officeId]);

  useEffect(() => {
    if (!officeId) return undefined;
    dismissedRef.current = false;
    const initialLoad = window.setTimeout(refresh, 0);

    const events = new EventSource("/api/ingest/events");
    events.addEventListener("ingest", refresh);
    return () => {
      window.clearTimeout(initialLoad);
      requestRef.current += 1;
      events.close();
    };
  }, [officeId, refresh]);

  const handleOpenChange = (nextOpen) => {
    if (!nextOpen) dismissedRef.current = true;
    setOpen(nextOpen);
  };

  const retry = async (id) => {
    setRetryingId(id);
    try {
      const response = await fetch(`/api/ingest/review/${id}/retry`, { method: "POST" });
      const json = await response.json().catch(() => null);
      if (!response.ok || !json?.ok) {
        throw new Error(json?.error || "Unable to retry this document.");
      }
      showToast({ title: "OCR Retry Started", description: "The document will return to the queue while processing." });
      await refresh();
    } catch (error) {
      showToast({ title: "Retry Failed", description: error.message }, true);
    } finally {
      setRetryingId(null);
    }
  };

  const dismiss = async (id) => {
    setDismissingId(id);
    try {
      const response = await fetch(`/api/ingest/review/${id}`, { method: "DELETE" });
      const json = await response.json().catch(() => null);
      if (!response.ok || !json?.ok) {
        // Fallback to reject endpoint
        const fbRes = await fetch(`/api/ingest/review/${id}/reject`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason: "Dismissed from failed review" }),
        });
        const fbJson = await fbRes.json().catch(() => null);
        if (!fbRes.ok || !fbJson?.ok) {
          throw new Error(fbJson?.error || json?.error || "Unable to dismiss this document.");
        }
      }
      showToast({ title: "Document Dismissed", description: "The failed document was cleared from the review queue." });
      setFailedRows((prev) => {
        const remaining = prev.filter((r) => r.id !== id);
        if (remaining.length === 0) {
          setOpen(false);
        }
        return remaining;
      });
      await refresh();
    } catch (error) {
      showToast({ title: "Dismiss Failed", description: error.message }, true);
    } finally {
      setDismissingId(null);
    }
  };

  const clearAllFailed = async () => {
    if (failedRows.length === 0 || clearingAll) return;
    setClearingAll(true);
    try {
      const response = await fetch("/api/ingest/review?status=Failed", { method: "DELETE" });
      const json = await response.json().catch(() => null);
      if (!response.ok || !json?.ok) {
        // Fallback: iterate and reject each item
        await Promise.all(
          failedRows.map((r) =>
            fetch(`/api/ingest/review/${r.id}/reject`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ reason: "Cleared from review queue" }),
            })
          )
        );
      }
      showToast({ title: "Queue Cleared", description: `Cleared ${failedRows.length} failed document(s).` });
      setFailedRows([]);
      setOpen(false);
      await refresh();
    } catch (error) {
      showToast({ title: "Clear Failed", description: error.message }, true);
    } finally {
      setClearingAll(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent hideClose className="flex max-h-[85vh] w-full max-w-3xl sm:max-w-3xl flex-col gap-0 overflow-hidden rounded-2xl border border-gray-200 bg-white p-0 shadow-2xl dark:border-white/10 dark:bg-zinc-900">
        <DialogHeader className="border-b border-gray-100 p-6 pb-4 text-left dark:border-white/10">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-[16px] font-semibold tracking-[-0.01em] text-gray-900 dark:text-zinc-50">
              Failed Documents {failedRows.length > 0 && `(${failedRows.length})`}
            </DialogTitle>
          </div>
          <DialogDescription className="mt-1 text-[13px] text-gray-500 dark:text-zinc-400">
            These documents encountered processing errors or are missing from the ingest directory. You can retry them or clear them from the review queue.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto p-4" aria-live="polite">
          {loading && failedRows.length === 0 ? (
            <p className="p-4 text-center text-sm text-gray-500 dark:text-zinc-400">Loading failed documents...</p>
          ) : failedRows.length === 0 ? (
            <p className="p-4 text-center text-sm text-gray-500 dark:text-zinc-400">No failed documents remain.</p>
          ) : (
            <ul className="space-y-2">
              {failedRows.map((row) => (
                <li key={row.id} className="flex items-start justify-between gap-4 rounded-xl border border-gray-200 p-3.5 dark:border-white/10 dark:bg-zinc-950/40">
                  <div className="min-w-0 flex-1">
                    <p className="break-words text-sm font-semibold text-gray-900 dark:text-zinc-100">
                      {row.original_filename || `Document #${row.id}`}
                    </p>
                    {row.last_error && (
                      <p className="mt-1 break-words text-xs text-rose-600 dark:text-rose-400 font-medium">
                        {row.last_error.includes("ENOENT") ? "File missing from disk or OCR engine unavailable" : row.last_error}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => retry(row.id)}
                      disabled={retryingId !== null || dismissingId !== null || clearingAll}
                      className="h-9 rounded-xl px-3.5 text-xs font-semibold border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-xs cursor-pointer active:scale-95 transition-all"
                    >
                      {retryingId === row.id ? "Retrying..." : "Retry"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => dismiss(row.id)}
                      disabled={retryingId !== null || dismissingId !== null || clearingAll}
                      className="h-9 rounded-xl px-3.5 text-xs font-semibold border border-rose-200 dark:border-rose-900/40 bg-rose-50/60 dark:bg-rose-950/20 text-rose-700 dark:text-rose-400 hover:bg-rose-100/70 dark:hover:bg-rose-950/40 shadow-xs cursor-pointer active:scale-95 transition-all"
                    >
                      {dismissingId === row.id ? "Clearing..." : "Dismiss"}
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-gray-100 px-6 py-4 dark:border-white/10">
          {failedRows.length > 0 ? (
            <Button
              type="button"
              variant="outline"
              disabled={clearingAll || retryingId !== null || dismissingId !== null}
              onClick={clearAllFailed}
              className="h-10 rounded-xl px-4 text-xs font-semibold border border-rose-200 dark:border-rose-900/40 bg-rose-50/60 dark:bg-rose-950/20 text-rose-700 dark:text-rose-400 hover:bg-rose-100/70 dark:hover:bg-rose-950/40 shadow-xs cursor-pointer active:scale-95 transition-all"
            >
              {clearingAll ? "Clearing All..." : "Clear All Failed"}
            </Button>
          ) : <div />}
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            className="h-10 rounded-xl px-5 text-xs font-semibold border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-xs cursor-pointer active:scale-95 transition-all"
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
