"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import { scanFileForSuggestion } from "@/lib/ocrClient";

export default function HotFolderInboxTab({ students, docTypes, showToast, onPromoted }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [previewMime, setPreviewMime] = useState("");
  const [ocrLoading, setOcrLoading] = useState(false);
  const [promoting, setPromoting] = useState(false);
  const [form, setForm] = useState({
    studentNo: "",
    studentName: "",
    docType: "",
  });

  const selectedRow = useMemo(
    () => rows.find((r) => Number(r.id) === Number(selected)) || null,
    [rows, selected]
  );

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/ingest/hot-folder?limit=100", { cache: "no-store" });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) throw new Error(json?.error || "Failed to load ingest queue");
      setRows(Array.isArray(json.data?.rows) ? json.data.rows : []);
    } catch (e) {
      showToast({ title: "Inbox Load Failed", description: e.message || "Unable to load ingest queue." }, true);
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  const openItem = async (row) => {
    setSelected(row.id);
    setPreviewUrl(`/api/ingest/hot-folder/${row.id}/file`);
    setPreviewMime(String(row.mime_type || ""));
    setForm((p) => ({
      ...p,
      studentNo: "",
      studentName: "",
      docType: "",
    }));
  };

  const runOcr = async () => {
    if (!selectedRow) return;
    setOcrLoading(true);
    try {
      const blobRes = await fetch(`/api/ingest/hot-folder/${selectedRow.id}/file`);
      if (!blobRes.ok) throw new Error("Failed to read file");
      const blob = await blobRes.blob();
      const file = new File([blob], selectedRow.original_filename || "scan", {
        type: selectedRow.mime_type || blob.type || "application/octet-stream",
      });
      const suggestion = await scanFileForSuggestion({ file, students, docTypes });
      setForm((p) => ({
        ...p,
        studentNo: String(suggestion?.matchedStudent?.studentNo || ""),
        studentName: String(suggestion?.name || ""),
        docType: String(suggestion?.docType || ""),
      }));
      showToast({ title: "OCR Complete", description: "Suggestions have been applied." });
    } catch (e) {
      showToast({ title: "OCR Failed", description: e.message || "Unable to scan file." }, true);
    } finally {
      setOcrLoading(false);
    }
  };

  const promote = async () => {
    if (!selectedRow) return;
    if (!form.studentNo || !form.docType) {
      showToast({ title: "Missing Fields", description: "Student number and document type are required." }, true);
      return;
    }
    setPromoting(true);
    try {
      const res = await fetch(`/api/ingest/hot-folder/${selectedRow.id}/promote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentNo: form.studentNo,
          studentName: form.studentName,
          docType: form.docType,
        }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) throw new Error(json?.error || "Promotion failed");
      showToast({ title: "Promoted", description: "Ingest item promoted to document." });
      await refresh();
      onPromoted?.();
    } catch (e) {
      showToast({ title: "Promotion Failed", description: e.message || "Unable to promote ingest item." }, true);
    } finally {
      setPromoting(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  return (
    <div className="w-full h-full bg-white rounded-brand border border-gray-200 shadow-sm overflow-hidden flex">
      <div className="w-[42%] border-r border-gray-200 flex flex-col">
        <div className="p-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
          <div>
            <div className="text-xs font-bold uppercase text-gray-600">Hot Folder Inbox</div>
            <div className="text-sm font-bold text-gray-900">{rows.length} pending items</div>
          </div>
          <button className="px-3 h-8 text-xs font-bold border rounded-brand border-gray-300 hover:border-pup-maroon" onClick={refresh}>
            Refresh
          </button>
        </div>
        <div className="flex-1 overflow-auto divide-y divide-gray-100">
          {!loading && rows.length === 0 ? (
            <div className="h-[400px] flex flex-col items-center justify-center text-gray-500 text-center p-6">
              <i className="ph-duotone ph-tray text-4xl text-pup-maroon mb-3" />
              <div className="font-bold text-gray-900">No pending ingests</div>
              <div className="text-sm font-medium text-gray-600 mt-1">Drop scanner files into your hot folder to queue them here.</div>
            </div>
          ) : null}
          {rows.map((row) => (
            <button
              key={row.id}
              className={`w-full text-left p-3 hover:bg-gray-50 ${selected === row.id ? "bg-red-50/40" : ""}`}
              onClick={() => openItem(row)}
            >
              <div className="text-sm font-bold text-gray-900 truncate">{row.original_filename}</div>
              <div className="text-xs font-medium text-gray-600 mt-1">{row.mime_type} · {(Number(row.size_bytes || 0) / 1024).toFixed(1)} KB</div>
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        <div className="p-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
          <div className="text-sm font-bold text-gray-900">Preview & Promote</div>
          <button
            className="px-3 h-8 text-xs font-bold bg-pup-maroon text-white rounded-brand hover:bg-red-900 disabled:opacity-60"
            onClick={runOcr}
            disabled={!selectedRow || ocrLoading}
          >
            {ocrLoading ? "Scanning..." : "Run OCR"}
          </button>
        </div>
        <div className="flex-1 overflow-auto p-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="border border-gray-200 rounded-brand bg-white min-h-[300px]">
            {selectedRow ? (
              previewMime.startsWith("image/") ? (
                <div className="relative w-full h-[420px]">
                  <Image src={previewUrl} alt="Ingest preview" fill unoptimized className="object-contain rounded-brand" />
                </div>
              ) : (
                <iframe title="ingest-preview" src={previewUrl} className="w-full h-[420px] rounded-brand" />
              )
            ) : (
              <div className="h-full min-h-[300px] flex items-center justify-center text-sm font-medium text-gray-500">
                Select an item from the inbox.
              </div>
            )}
          </div>

          <div className="space-y-3">
            <label className="block text-xs font-bold uppercase text-gray-700">Student Number</label>
            <input className="form-input" value={form.studentNo} onChange={(e) => setForm((p) => ({ ...p, studentNo: e.target.value }))} />
            <label className="block text-xs font-bold uppercase text-gray-700">Student Name (optional)</label>
            <input className="form-input" value={form.studentName} onChange={(e) => setForm((p) => ({ ...p, studentName: e.target.value }))} />
            <label className="block text-xs font-bold uppercase text-gray-700">Document Type</label>
            <select className="form-select" value={form.docType} onChange={(e) => setForm((p) => ({ ...p, docType: e.target.value }))}>
              <option value="">Select document type...</option>
              {docTypes.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
            <button
              className="w-full h-10 rounded-brand bg-pup-maroon text-white font-bold hover:bg-red-900 disabled:opacity-60"
              onClick={promote}
              disabled={!selectedRow || promoting}
            >
              {promoting ? "Promoting..." : "Promote to Documents"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
