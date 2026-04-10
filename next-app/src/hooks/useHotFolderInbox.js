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
  const [promoting, setPromoting] = useState(false);

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
    if (!row) return;
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
    } catch (e) {
      showToast({ title: "OCR Failed", description: e.message || "Unable to scan file." }, true);
    } finally {
      setOcrLoading(false);
    }
  };

  const openItem = async (row) => {
    setSelected(row.id);
    setPreviewUrl(`/api/ingest/hot-folder/${row.id}/file`);
    setPreviewMime(String(row.mime_type || ""));
    await runOcrForRow(row, { notifySuccess: false });
  };

  const runOcrAgain = async () => {
    if (!selectedRow) return;
    await runOcrForRow(selectedRow, { notifySuccess: true });
  };

  /**
   * Promote the selected inbox item using data passed from the parent's newRec.
   * @param {{ studentNo: string, name: string, docType: string }} data
   */
  const promote = async (data) => {
    if (!selectedRow) return;
    const studentNo = String(data?.studentNo || "").trim();
    const docType = String(data?.docType || "").trim();
    if (!studentNo || !docType) {
      showToast({ title: "Missing Fields", description: "Student number and document type are required." }, true);
      return;
    }
    setPromoting(true);
    try {
      const res = await fetch(`/api/ingest/hot-folder/${selectedRow.id}/promote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentNo,
          studentName: String(data?.name || "").trim(),
          docType,
        }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) throw new Error(json?.error || "Promotion failed");
      showToast({ title: "Promoted", description: "Ingest item promoted to document." });
      clearIngestSelection();
      await loadList({ showLoading: false });
      onPromoted?.();
    } catch (e) {
      showToast({ title: "Promotion Failed", description: e.message || "Unable to promote ingest item." }, true);
    } finally {
      setPromoting(false);
    }
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
    promoting,
    loadList,
    openItem,
    runOcrAgain,
    promote,
    clearIngestSelection,
    refresh,
    clearInbox,
  };
}
