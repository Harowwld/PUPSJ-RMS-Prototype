"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { scanFileForSuggestion } from "@/lib/ocrClient";

const POLL_MS = 15000;

export function useHotFolderInbox({
  enabled,
  students,
  docTypes,
  showToast,
  onPromoted,
  onOcrResult,
}) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [previewMime, setPreviewMime] = useState("");
  const [ocrLoading, setOcrLoading] = useState(false);

  const selectedRow = useMemo(
    () => rows.find((r) => Number(r.id) === Number(selected)) || null,
    [rows, selected]
  );

  const loadList = useCallback(
    async ({ showLoading = true } = {}) => {
      if (showLoading) setLoading(true);
      try {
        const res = await fetch("/api/ingest/hot-folder?limit=100", { cache: "no-store" });
        const json = await res.json().catch(() => null);
        if (!res.ok || !json?.ok) throw new Error(json?.error || "Failed to load ingest queue");
        setRows(Array.isArray(json.data?.rows) ? json.data.rows : []);
      } catch (e) {
        if (showLoading) {
          showToast({ title: "Inbox Load Failed", description: e.message || "Unable to load ingest queue." }, true);
        }
      } finally {
        if (showLoading) setLoading(false);
      }
    },
    [showToast]
  );

  const clearIngestSelection = useCallback(() => {
    setSelected(null);
    setPreviewUrl("");
    setPreviewMime("");
  }, []);

  const runOcrForRow = async (row, { notifySuccess = false } = {}) => {
    if (!row) return null;
    setOcrLoading(true);
    try {
      const blobRes = await fetch(`/api/ingest/hot-folder/${row.id}/file`);
      if (!blobRes.ok) throw new Error("Failed to read file");
      const blob = await blobRes.blob();
      const file = new File([blob], row.original_filename || "scan", {
        type: row.mime_type || blob.type || "application/octet-stream",
      });
      const suggestion = await scanFileForSuggestion({ file, students, docTypes });
      // Forward OCR result to parent so it can populate newRec (the standard form).
      onOcrResult?.(suggestion);
      if (notifySuccess) {
        showToast({ title: "OCR Complete", description: "Suggestions have been applied." });
      }
      // Return the file so callers can use it as the uploaded file
      return file;
    } catch (e) {
      showToast({ title: "OCR Failed", description: e.message || "Unable to scan file." }, true);
      return null;
    } finally {
      setOcrLoading(false);
    }
  };

  /**
   * Open an inbox item: set preview, run OCR, and return the file blob
   * so the parent can set it as the uploaded file for direct submission.
   */
  const openItem = async (row) => {
    setSelected(row.id);
    setPreviewUrl(`/api/ingest/hot-folder/${row.id}/file`);
    setPreviewMime(String(row.mime_type || ""));
    const file = await runOcrForRow(row, { notifySuccess: false });
    return file; // caller uses this to set uploadedFile
  };

  const runOcrAgain = async () => {
    if (!selectedRow) return null;
    return await runOcrForRow(selectedRow, { notifySuccess: true });
  };

  /**
   * Remove the selected inbox item after a successful upload.
   * This replaces the old "promote" flow — now we just clean up
   * the ingest queue entry since the file has been uploaded normally.
   */
  const removeIngestItem = async (id) => {
    const itemId = id ?? selected;
    if (!itemId) return;
    try {
      await fetch(`/api/ingest/hot-folder/${itemId}`, { method: "DELETE" });
    } catch {
      // Best-effort cleanup — suppress errors
    }
    clearIngestSelection();
    await loadList({ showLoading: false });
    onPromoted?.();
  };

  useEffect(() => {
    if (!enabled) return;
    loadList({ showLoading: true });
  }, [enabled, loadList]);

  useEffect(() => {
    if (!enabled) return;
    const t = setInterval(() => {
      loadList({ showLoading: false });
    }, POLL_MS);
    return () => clearInterval(t);
  }, [enabled, loadList]);

  useEffect(() => {
    if (!enabled) return;
    const onVis = () => {
      if (document.visibilityState === "visible") {
        loadList({ showLoading: false });
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [enabled, loadList]);

  useEffect(() => {
    if (selected == null) return;
    if (!rows.some((r) => Number(r.id) === Number(selected))) {
      clearIngestSelection();
    }
  }, [rows, selected, clearIngestSelection]);

  const refresh = () => loadList({ showLoading: true });

  const clearInbox = async () => {
    if (!enabled) return;
    setLoading(true);
    try {
      const res = await fetch("/api/ingest/hot-folder", { method: "DELETE" });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) throw new Error(json?.error || "Clear inbox failed");
      clearIngestSelection();
      await loadList({ showLoading: false });
      showToast({
        title: "Inbox Cleared",
        description: `Removed ${Number(json?.data?.clearedCount || 0)} item(s).`,
      });
    } catch (e) {
      showToast(
        { title: "Clear Inbox Failed", description: e.message || "Unable to clear inbox." },
        true
      );
    } finally {
      setLoading(false);
    }
  };

  return {
    rows,
    loading,
    selected,
    selectedRow,
    previewUrl,
    previewMime,
    ocrLoading,
    loadList,
    openItem,
    runOcrAgain,
    removeIngestItem,
    clearIngestSelection,
    refresh,
    clearInbox,
  };
}
