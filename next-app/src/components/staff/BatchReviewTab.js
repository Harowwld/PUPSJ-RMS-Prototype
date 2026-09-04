"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import PageHeader from "@/components/shared/PageHeader";

const STATUSES = ["", "Processing", "Needs Review", "Conflict", "Failed", "Duplicate", "Confirmed", "Rejected"];
const REGION_LABELS = {
  firstName: { label: "First name", color: "#2563eb" },
  middleName: { label: "Middle name", color: "#9333ea" },
  lastName: { label: "Last name", color: "#dc2626" },
};

export default function BatchReviewTab({ showToast = () => {}, students = [], docTypes = [] }) {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [status, setStatus] = useState("Needs Review");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [note, setNote] = useState("");
  const [studentAssignmentQuery, setStudentAssignmentQuery] = useState("");

  const selected = useMemo(() => rows.find((row) => Number(row.id) === Number(selectedId)) || null, [rows, selectedId]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "50", offset: String(page * 50) });
      if (status) params.set("status", status);
      if (query.trim()) params.set("q", query.trim());
      const response = await fetch(`/api/ingest/review?${params}`, { cache: "no-store" });
      const json = await response.json().catch(() => null);
      if (!response.ok || !json?.ok) throw new Error(json?.error || "Unable to load review queue");
      setRows(json.data?.rows || []);
      setTotal(Number(json.data?.total || 0));
      setSelectedId((current) => (json.data?.rows || []).some((row) => Number(row.id) === Number(current)) ? current : json.data?.rows?.[0]?.id || null);
    } catch (error) {
      showToast({ title: "Review Queue Failed", description: error.message }, true);
    } finally { setLoading(false); }
  }, [page, query, showToast, status]);

  useEffect(() => { load(); }, [load]);

  const action = async (kind, body = {}) => {
    if (!selected) return;
    const actionId = selected.id;
    setSaving(true);
    try {
      const response = await fetch(`/api/ingest/review/${selected.id}/${kind}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const json = await response.json().catch(() => null);
      if (!response.ok || !json?.ok) throw new Error(json?.error || `${kind} failed`);
      if (kind === "retry") {
        // Retry changes review_status to Processing. Keep it visible instead
        // of letting the current Needs Review filter make it look deleted.
        setStatus("");
        setPage(0);
        setSelectedId(actionId);
      }
      showToast({ title: kind === "confirm" ? "Document Confirmed" : kind === "reject" ? "Document Rejected" : "OCR Retry Started", description: kind === "retry" ? "This document remains visible while OCR is processing." : "The review queue was updated." });
      if (kind !== "retry") await load();
    } catch (error) { showToast({ title: "Review Action Failed", description: error.message }, true); }
    finally { setSaving(false); }
  };

  const update = async (patch) => {
    if (!selected) return;
    const response = await fetch(`/api/ingest/review/${selected.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch) });
    const json = await response.json().catch(() => null);
    if (!response.ok || !json?.ok) throw new Error(json?.error || "Unable to save review changes");
    await load();
  };

  const previewUrl = selected ? `/api/ingest/hot-folder/${selected.id}/file` : "";
  const isImage = selected?.mime_type?.startsWith("image/");
  const ocrRegions = selected?.ocr_regions && typeof selected.ocr_regions === "object" ? selected.ocr_regions : {};
  const matchEvidence = selected?.match_evidence && typeof selected.match_evidence === "object" ? selected.match_evidence : null;
  const matchingStudentNumbers = useMemo(() => {
    const candidates = Array.isArray(selected?.match_candidates)
      ? selected.match_candidates
      : typeof selected?.match_candidates === "string"
        ? JSON.parse(selected.match_candidates || "[]")
        : [];
    return new Set(candidates.map((candidate) => String(candidate?.studentNo || candidate?.student_no || "")));
  }, [selected]);
  const matchingStudents = useMemo(
    () => students.filter((student) => matchingStudentNumbers.has(String(student.studentNo || student.student_no || ""))),
    [matchingStudentNumbers, students],
  );
  const assignmentStudents = useMemo(() => {
    if (matchingStudents.length > 0) return matchingStudents;
    const search = studentAssignmentQuery.trim().toLowerCase();
    if (!search) return [];
    return students.filter((student) => [student.name, student.studentNo || student.student_no]
      .some((value) => String(value || "").toLowerCase().includes(search)));
  }, [matchingStudents, studentAssignmentQuery, students]);

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 overflow-auto p-1">
      <Card className="rounded-brand border border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-card">
        <PageHeader icon="ph-check-square" title="Batch Review" description="Verify OCR proposals before creating formal student records." showBorder={false} actions={<Button size="sm" variant="outline" onClick={load}>Refresh</Button>} />
        <CardContent className="flex flex-wrap items-center gap-3 border-t border-gray-100 p-4 dark:border-white/5">
          <Select value={status} onChange={(event) => setStatus(event.target.value)} className="h-9 w-44"><option value="">All statuses</option>{STATUSES.filter(Boolean).map((item) => <option key={item} value={item}>{item}</option>)}</Select>
          <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search filename or OCR text" className="h-9 max-w-sm" />
          <span className="text-xs text-gray-500 dark:text-zinc-400">{total} item(s)</span>
        </CardContent>
      </Card>

      <div className="grid min-h-[520px] flex-1 gap-4 lg:grid-cols-[minmax(260px,0.8fr)_minmax(420px,1.4fr)]">
        <Card className="min-h-0 overflow-hidden rounded-brand border border-gray-200 bg-white dark:border-white/10 dark:bg-card">
          <CardHeader className="border-b border-gray-100 px-4 py-3 dark:border-white/5"><CardTitle className="text-sm">Review queue</CardTitle></CardHeader>
          <CardContent className="flex h-full min-h-0 flex-col overflow-auto p-2">
            {loading ? <p className="p-4 text-sm text-gray-500">Loading…</p> : rows.length === 0 ? <p className="p-4 text-sm text-gray-500">No matching inbound documents.</p> : <>{rows.map((row) => <button type="button" key={row.id} onClick={() => { setSelectedId(row.id); setNote(row.review_note || ""); setStudentAssignmentQuery(""); }} className={`mb-1 w-full rounded-lg border p-3 text-left ${Number(selectedId) === Number(row.id) ? "border-blue-500 bg-blue-50 dark:bg-blue-950/30" : "border-transparent hover:bg-gray-50 dark:hover:bg-white/5"}`}><div className="truncate text-xs font-semibold text-gray-900 dark:text-zinc-100">{row.original_filename}</div><div className="mt-1 flex justify-between text-[11px] text-gray-500"><span>{row.review_status || "Processing"}</span><span>{row.match_confidence != null ? `${Math.round(Number(row.match_confidence) * 100)}% ${row.match_status === "Conflict" ? "Conflict" : ""}` : "—"}</span></div></button>)}<div className="mt-auto flex items-center justify-between border-t border-gray-100 px-2 pt-3 text-xs dark:border-white/5"><Button size="xs" variant="outline" onClick={() => setPage((current) => Math.max(0, current - 1))} disabled={page === 0 || loading}>Previous</Button><span className="text-gray-500">Page {page + 1} of {Math.max(1, Math.ceil(total / 50))}</span><Button size="xs" variant="outline" onClick={() => setPage((current) => current + 1)} disabled={(page + 1) * 50 >= total || loading}>Next</Button></div></>}
          </CardContent>
        </Card>

        <Card className="min-h-0 overflow-hidden rounded-brand border border-gray-200 bg-white dark:border-white/10 dark:bg-card">
          <CardHeader className="border-b border-gray-100 px-4 py-3 dark:border-white/5"><CardTitle className="truncate text-sm">{selected?.original_filename || "Select a document"}</CardTitle></CardHeader>
          <CardContent className="grid min-h-0 gap-4 overflow-auto p-4 xl:grid-cols-2">
            {selected ? <>
              {selected.review_status === "Processing" && <div className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-800 dark:border-blue-400/20 dark:bg-blue-950/20 dark:text-blue-200"><strong>OCR retry in progress.</strong> This item is still in the review queue and will update when processing finishes.</div>}
              <div className="flex min-h-[280px] items-center justify-center overflow-hidden rounded-lg bg-gray-100 dark:bg-zinc-900">{isImage ? <div className="relative inline-flex max-h-[520px] max-w-full"><Image src={previewUrl} alt="Scanned document" width={800} height={1000} unoptimized className="max-h-[520px] max-w-full object-contain" />{Object.entries(ocrRegions).map(([key, region]) => { const field = REGION_LABELS[key]; if (!field || Number(region?.width) <= 0 || Number(region?.height) <= 0) return null; return <div key={key} className="pointer-events-none absolute border-2" style={{ left: `${Number(region.x) * 100}%`, top: `${Number(region.y) * 100}%`, width: `${Number(region.width) * 100}%`, height: `${Number(region.height) * 100}%`, borderColor: field.color }}><span className="absolute -top-5 left-0 whitespace-nowrap bg-white px-1 text-[10px] font-semibold" style={{ color: field.color }}>{field.label}</span></div>; })}</div> : <div className="flex h-[520px] w-full flex-col"><iframe title="Scanned document preview" src={previewUrl} className="min-h-0 flex-1 w-full border-0" />{Object.keys(ocrRegions).length > 0 && <div className="border-t border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-800">OCR field boxes are available for the scanned page image; PDF overlays are not rendered in this preview.</div>}</div>}</div>
              {!Object.keys(ocrRegions).length && <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-800 dark:border-amber-400/20 dark:bg-amber-950/20 dark:text-amber-200">No OCR field regions were saved for this item. Click <strong>Retry OCR</strong> to apply the current recognition template and display the highlighted boxes.</div>}
              <div className="space-y-3">
                <label className="block text-xs font-semibold text-gray-600 dark:text-zinc-300">Student assignment{matchingStudents.length === 0 && <Input value={studentAssignmentQuery} onChange={(event) => setStudentAssignmentQuery(event.target.value)} placeholder="Type a name or student number to search" className="mt-1 h-9" />}<select className="mt-1 h-9 w-full rounded-md border border-gray-200 bg-white px-2 text-sm dark:border-white/10 dark:bg-zinc-900" value={selected.proposed_student_no || ""} onChange={(event) => update({ studentNo: event.target.value }).catch((error) => showToast({ title: "Save failed", description: error.message }, true))}><option value="">Unmatched</option>{assignmentStudents.length > 0 ? assignmentStudents.map((student) => <option key={student.studentNo || student.student_no} value={student.studentNo || student.student_no}>{student.name} ({student.studentNo || student.student_no})</option>) : <option value="" disabled>{matchingStudents.length > 0 ? "No matching student candidates" : studentAssignmentQuery.trim() ? "No students found" : "Type to search students"}</option>}</select><span className="mt-1 block text-[11px] font-normal text-gray-500">{matchingStudents.length > 0 ? "Only OCR-matched student candidates are shown." : "Type a name or student number to search for a student."}</span></label>
                <label className="block text-xs font-semibold text-gray-600 dark:text-zinc-300">Document type<select className="mt-1 h-9 w-full rounded-md border border-gray-200 bg-white px-2 text-sm dark:border-white/10 dark:bg-zinc-900" value={selected.proposed_doc_type || ""} onChange={(event) => update({ docType: event.target.value }).catch((error) => showToast({ title: "Save failed", description: error.message }, true))}><option value="">Select type</option>{docTypes.map((type) => <option key={type} value={type}>{type}</option>)}</select></label>
                <div><div className="mb-1 text-xs font-semibold text-gray-600 dark:text-zinc-300">Extracted name</div><Input value={selected.ocr_name || ""} onChange={(event) => update({ ocrName: event.target.value }).catch((error) => showToast({ title: "Save failed", description: error.message }, true))} /></div>
                <div className="grid grid-cols-2 gap-2"><div className="rounded-md border border-blue-100 bg-blue-50 p-2 dark:border-blue-400/20 dark:bg-blue-950/20"><div className="text-[10px] font-semibold uppercase text-blue-700 dark:text-blue-300">Match confidence</div><div className="text-lg font-bold text-blue-900 dark:text-blue-100">{selected.match_confidence != null ? `${Math.round(Number(selected.match_confidence) * 100)}%` : "—"}</div><div className="text-[11px] text-blue-700 dark:text-blue-300">{matchEvidence?.reason || selected.match_status || "Not scored"}</div></div><div className="rounded-md border border-emerald-100 bg-emerald-50 p-2 dark:border-emerald-400/20 dark:bg-emerald-950/20"><div className="text-[10px] font-semibold uppercase text-emerald-700 dark:text-emerald-300">OCR read quality</div><div className="text-lg font-bold text-emerald-900 dark:text-emerald-100">{selected.ocr_quality_score != null ? `${Math.round(Number(selected.ocr_quality_score) * 100)}%` : "—"}</div><div className="text-[11px] text-emerald-700 dark:text-emerald-300">{selected.match_method || "Not scored"}</div></div></div>
                {selected.match_status === "Conflict" && <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-800 dark:border-amber-400/20 dark:bg-amber-950/20 dark:text-amber-200"><strong>Conflict detected.</strong> The configured template and other OCR evidence identified different names. Confirm only after checking the document.</div>}
                {matchEvidence && <details className="rounded-md border border-gray-200 p-2 text-[11px] dark:border-white/10"><summary className="cursor-pointer font-semibold text-gray-600 dark:text-zinc-300">Evidence breakdown</summary><pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap text-gray-500 dark:text-zinc-400">{JSON.stringify(matchEvidence, null, 2)}</pre></details>}
                <div><div className="mb-1 text-xs font-semibold text-gray-600 dark:text-zinc-300">OCR response</div><pre className="max-h-36 overflow-auto rounded-md bg-gray-50 p-2 text-[11px] whitespace-pre-wrap dark:bg-zinc-900">{selected.last_error || selected.ocr_text || "No OCR text returned."}</pre></div>
                <div><div className="mb-1 text-xs font-semibold text-gray-600 dark:text-zinc-300">Review note</div><Input value={note} onChange={(event) => setNote(event.target.value)} onBlur={() => update({ reviewNote: note }).catch(() => {})} placeholder="Optional note" /></div>
                <div className="flex flex-wrap gap-2 pt-1"><Button size="sm" onClick={() => action("confirm", { studentNo: selected.proposed_student_no, studentName: selected.ocr_name, docType: selected.proposed_doc_type })} disabled={saving || !selected.proposed_student_no || !selected.proposed_doc_type}>Confirm</Button><Button size="sm" variant="outline" onClick={() => action("retry")} disabled={saving}>Retry OCR</Button><Button size="sm" variant="destructive" onClick={() => action("reject", { reason: note || "Rejected during review" })} disabled={saving}>Reject</Button></div>
              </div>
            </> : <p className="p-4 text-sm text-gray-500">Choose an item to inspect its preview and OCR proposal.</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
