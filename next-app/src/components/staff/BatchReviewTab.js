"use client";
import HugeIcon from "@/components/shared/HugeIcon";
import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { TooltipProvider } from "@/components/ui/tooltip";
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyMedia,
} from "@/components/ui/empty";
import PageHeader from "@/components/shared/PageHeader";
import { RefreshButton } from "@/components/shared/RefreshButton";
import BatchReviewSkeleton from "@/components/staff/skeletons/BatchReviewSkeleton";
import { cn } from "@/lib/utils";

const STATUS_TABS = [
  { id: "Conflict", label: "Needs Review" },
  { id: "Confirmed", label: "Confirmed" },
  { id: "Failed", label: "Failed" },
  { id: "", label: "All" },
];

const REGION_LABELS = {
  firstName: { label: "First name", color: "#2563eb" },
  middleName: { label: "Middle name", color: "#9333ea" },
  lastName: { label: "Last name", color: "#dc2626" },
};

function parseMatchCandidates(value) {
  if (Array.isArray(value)) return value;
  if (typeof value !== "string") return [];
  try {
    return JSON.parse(value || "[]");
  } catch {
    return [];
  }
}

function getMatchReason(item, candidates) {
  if (candidates.length > 1) return "Multiple student matches found.";
  if (candidates.length === 0) return "No matching student found.";
  if (item.match_confidence != null && Number(item.match_confidence) < 0.5) return "Low OCR confidence.";
  if (item.match_evidence?.reason) return item.match_evidence.reason;
  return item.match_status || "Student match requires validation.";
}

export default function BatchReviewTab({ showToast = () => {}, students = [], docTypes = [] }) {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [status, setStatus] = useState("Conflict");
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
    } finally {
      setLoading(false);
    }
  }, [page, query, showToast, status]);

  useEffect(() => {
    load();
  }, [load]);

  const action = async (kind, body = {}) => {
    if (!selected) return;
    const actionId = selected.id;
    setSaving(true);
    try {
      const response = await fetch(`/api/ingest/review/${selected.id}/${kind}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await response.json().catch(() => null);
      if (!response.ok || !json?.ok) throw new Error(json?.error || `${kind} failed`);
      if (kind === "retry") {
        // Retry changes review_status to Processing. Keep it visible instead
        // of letting the current Needs Review filter make it look deleted.
        setStatus("");
        setPage(0);
        setSelectedId(actionId);
      }
      showToast({
        title: kind === "confirm" ? "Document Confirmed" : kind === "reject" ? "Document Rejected" : "OCR Retry Started",
        description: kind === "retry" ? "This document remains visible while OCR is processing." : "The review queue was updated.",
      });
      if (kind !== "retry") await load();
    } catch (error) {
      showToast({ title: "Review Action Failed", description: error.message }, true);
    } finally {
      setSaving(false);
    }
  };

  const update = async (patch) => {
    if (!selected) return;
    const response = await fetch(`/api/ingest/review/${selected.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    const json = await response.json().catch(() => null);
    if (!response.ok || !json?.ok) throw new Error(json?.error || "Unable to save review changes");
    await load();
  };

  const previewUrl = selected ? `/api/ingest/hot-folder/${selected.id}/file` : "";
  const isImage = selected?.mime_type?.startsWith("image/");
  const ocrRegions = selected?.ocr_regions && typeof selected.ocr_regions === "object" ? selected.ocr_regions : {};
  const matchEvidence = selected?.match_evidence && typeof selected.match_evidence === "object" ? selected.match_evidence : null;
  const matchCandidates = useMemo(() => parseMatchCandidates(selected?.match_candidates), [selected]);
  const matchingStudentNumbers = useMemo(() => {
    const candidates = matchCandidates;
    return new Set(candidates.map((candidate) => String(candidate?.studentNo || candidate?.student_no || "")));
  }, [matchCandidates]);
  const matchingStudents = useMemo(
    () => students.filter((student) => matchingStudentNumbers.has(String(student.studentNo || student.student_no || ""))),
    [matchingStudentNumbers, students]
  );
  const assignmentStudents = useMemo(() => {
    if (matchingStudents.length > 0) return matchingStudents;
    const search = studentAssignmentQuery.trim().toLowerCase();
    if (!search) return [];
    return students.filter((student) =>
      [student.name, student.studentNo || student.student_no].some((value) =>
        String(value || "").toLowerCase().includes(search)
      )
    );
  }, [matchingStudents, studentAssignmentQuery, students]);
  const matchReason = selected ? getMatchReason(selected, matchCandidates) : "";

  return (
    <TooltipProvider delayDuration={200}>
      <div className="font-jakarta w-full flex flex-1 flex-col h-full min-h-0 focus:outline-none animate-fade-up overflow-auto">
        {/* ONE Single Card Container */}
        <Card className="flex h-auto w-full flex-col p-0 gap-0 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-card dark:shadow-none isolate font-jakarta mb-4 min-h-0 flex-1">
          <PageHeader
            icon="ph-check-square"
            title="Batch Review"
            description="Verify OCR proposals before creating formal student records."
            showBorder={false}
            className="p-6"
            titleClassName="text-[18px] font-semibold tracking-[-0.01em] text-gray-900 dark:text-zinc-50"
            descriptionClassName="text-[13px] font-normal text-gray-500 dark:text-zinc-400 mt-[4px]"
            actions={
              <RefreshButton
                onRefresh={load}
                isLoading={loading}
                title="Refresh Review Queue"
              />
            }
          />

          {/* Navigation Toolbar */}
          <div className="border-t border-gray-100 dark:border-white/10 p-5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-gray-50/40 dark:bg-zinc-900/30">
            {/* Left: Status Line Tabs */}
            <div className="flex items-center gap-6 shrink-0 select-none overflow-x-auto">
              {STATUS_TABS.map((item) => {
                const isActive = status === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setStatus(item.id);
                      setPage(0);
                    }}
                    className={cn(
                      "relative h-9 flex items-center text-[13px] font-semibold transition-colors focus:outline-none cursor-pointer border-0 bg-transparent whitespace-nowrap",
                      isActive
                        ? "text-gray-900 dark:text-zinc-50 after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-full after:bg-gray-900 dark:after:bg-zinc-50"
                        : "text-[#8E8E93] font-normal hover:text-gray-700 dark:hover:text-zinc-200"
                    )}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>

            {/* Right: Search Input with Icon and Number Count */}
            <div className="w-full sm:w-[260px] lg:w-[300px] relative group shrink-0">
              <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                <HugeIcon  className="ph-bold ph-magnifying-glass text-gray-400 dark:text-zinc-500 transition-colors group-focus-within:text-pup-maroon dark:group-focus-within:text-red-400 text-sm"></HugeIcon>
              </div>
              <Input
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(0);
                }}
                placeholder="Search filename or OCR text..."
                className="h-9 w-full rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 pl-8 pr-16 text-xs font-normal text-gray-900 dark:text-zinc-100 placeholder:text-gray-400 dark:placeholder:text-zinc-500 shadow-none focus-visible:outline-none focus-visible:border-pup-maroon focus-visible:ring-1 focus-visible:ring-pup-maroon dark:focus-visible:border-red-500/80 dark:focus-visible:ring-red-500/80"
              />
              <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-[11px] text-gray-400 dark:text-zinc-500 font-medium">
                {total > 0 ? `${total.toLocaleString()}` : "0"}
              </div>
            </div>
          </div>

          {/* Active Filter Chips */}
          {query && (
            <div className="flex-none border-t border-gray-100 dark:border-white/10 bg-white dark:bg-card px-6 py-2.5 animate-in fade-in slide-in-from-top-1 duration-normal">
              <div className="flex flex-wrap items-center gap-2">
                <span className="mr-1 text-[11px] font-medium uppercase tracking-[0.04em] text-gray-400 dark:text-zinc-500">
                  Active filters:
                </span>
                <div className="flex items-center gap-[6px] rounded-lg bg-gray-100 dark:bg-zinc-800 px-[10px] py-[4px] text-[12px] font-normal text-gray-900 dark:text-zinc-50">
                  Search: {query}
                  <button
                    onClick={() => {
                      setQuery("");
                      setPage(0);
                    }}
                    className="text-[12px] text-gray-400 hover:text-gray-600 dark:text-zinc-500 dark:hover:text-zinc-300 transition-colors cursor-pointer border-0 bg-transparent p-0 leading-none"
                  >
                    ×
                  </button>
                </div>
              </div>
            </div>
          )}

          {loading ? (
            <BatchReviewSkeleton />
          ) : (
            <div className="grid min-h-[580px] flex-1 border-t border-gray-100 dark:border-white/10 lg:grid-cols-[minmax(280px,0.8fr)_minmax(460px,1.4fr)]">
              {/* Left Column: Review Queue */}
              <div className="flex min-h-0 flex-col border-b border-gray-100 dark:border-white/10 lg:border-b-0 lg:border-r">
                <div className="flex flex-row items-center justify-between border-b border-gray-100 px-5 py-3.5 dark:border-white/5 bg-gray-50/20 dark:bg-zinc-900/20">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-zinc-50">Review Queue</h3>
                  <span className="text-xs text-gray-500 dark:text-zinc-400">
                    {rows.length} loaded
                  </span>
                </div>
                <div className="flex h-full min-h-0 flex-col overflow-auto p-3 flex-1">
                {rows.length === 0 ? (
                  <div className="flex flex-1 items-center justify-center p-6">
                    <Empty className="flex h-[320px] flex-col items-center justify-center border-0 bg-transparent text-center">
                      <EmptyHeader className="flex flex-col items-center gap-0">
                        <div className="relative mb-5">
                          <div className="absolute inset-0 scale-150 animate-pulse rounded-full bg-gray-50 opacity-50 dark:bg-card"></div>
                          <EmptyMedia className="relative z-10 flex h-20 w-20 items-center justify-center rounded-2xl border border-gray-100 bg-white shadow-lg rotate-2 dark:border-white/10 dark:bg-card dark:shadow-none">
                            <HugeIcon  className="ph-duotone ph-check-square text-xl text-gray-300 dark:text-zinc-600"></HugeIcon>
                          </EmptyMedia>
                        </div>
                        <EmptyTitle className="text-base font-semibold text-gray-900 dark:text-zinc-50">
                          No Documents in Queue
                        </EmptyTitle>
                        <EmptyDescription className="max-w-xs text-xs font-normal text-gray-500 dark:text-zinc-400 mt-1">
                          {query.trim()
                            ? "No documents match your active search filter."
                            : `There are no inbound documents waiting under "${status ? STATUS_TABS.find(t => t.id === status)?.label || status : "All"}".`}
                        </EmptyDescription>
                      </EmptyHeader>
                    </Empty>
                  </div>
                ) : (
                  <>
                    <div className="space-y-1.5 overflow-y-auto flex-1 pr-0.5">
                      {rows.map((row) => {
                        const isCurrent = Number(selectedId) === Number(row.id);
                        return (
                          <button
                            type="button"
                            key={row.id}
                            onClick={() => {
                              setSelectedId(row.id);
                              setNote(row.review_note || "");
                              setStudentAssignmentQuery("");
                            }}
                            className={cn(
                              "group w-full rounded-xl border p-3 text-left transition-all cursor-pointer",
                              isCurrent
                                ? "border-pup-maroon/40 bg-red-50/50 shadow-xs dark:border-red-500/40 dark:bg-red-950/20"
                                : "border-gray-200/80 bg-white hover:bg-gray-50/80 dark:border-white/5 dark:bg-zinc-900/40 dark:hover:bg-zinc-800/60"
                            )}
                          >
                            <div className="flex items-center gap-2">
                              <HugeIcon  className={cn(
                                "ph-bold ph-file-text text-sm shrink-0",
                                isCurrent
                                  ? "text-pup-maroon dark:text-red-400"
                                  : "text-gray-400 group-hover:text-gray-600 dark:text-zinc-500"
                              )} />
                              <span
                                className="truncate text-xs font-semibold text-gray-900 dark:text-zinc-100"
                                title={row.original_filename}
                              >
                                {row.original_filename}
                              </span>
                            </div>
                            <div className="mt-2 flex items-center justify-between gap-1 text-[11px]">
                              <span className={cn(
                                "rounded-full px-2 py-0.5 font-medium text-[10px]",
                                row.review_status === "Confirmed"
                                  ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400"
                                  : row.review_status === "Failed"
                                  ? "bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400"
                                  : "bg-amber-50 text-amber-800 dark:bg-amber-950/30 dark:text-amber-300"
                              )}>
                                {row.review_status || "Needs Review"}
                              </span>
                              <span className="rounded-lg bg-gray-100 dark:bg-zinc-800 px-1.5 py-0.5 text-[10px] text-gray-600 dark:text-zinc-400">
                                {row.match_confidence != null
                                  ? `${Math.round(Number(row.match_confidence) * 100)}% match`
                                  : "No match"}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    <div className="mt-auto flex items-center justify-between border-t border-gray-100 pt-3 px-1 text-xs dark:border-white/5">
                      <Button
                        size="xs"
                        variant="outline"
                        onClick={() => setPage((current) => Math.max(0, current - 1))}
                        disabled={page === 0 || loading}
                        className="h-7 px-2.5 text-xs font-medium rounded-lg border border-gray-200 bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-xs cursor-pointer active:scale-95 disabled:opacity-40"
                      >
                        Previous
                      </Button>
                      <span className="text-xs text-gray-500 dark:text-zinc-400">
                        Page {page + 1} of {Math.max(1, Math.ceil(total / 50))}
                      </span>
                      <Button
                        size="xs"
                        variant="outline"
                        onClick={() => setPage((current) => current + 1)}
                        disabled={(page + 1) * 50 >= total || loading}
                        className="h-7 px-2.5 text-xs font-medium rounded-lg border border-gray-200 bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-xs cursor-pointer active:scale-95 disabled:opacity-40"
                      >
                        Next
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Right Column: Document Inspector */}
            <div className="flex min-h-0 flex-col flex-1">
              <div className="flex flex-row items-center justify-between border-b border-gray-100 px-5 py-3.5 dark:border-white/5 bg-gray-50/20 dark:bg-zinc-900/20">
                <h3 className="truncate text-sm font-semibold text-gray-900 dark:text-zinc-50">
                  {selected?.original_filename || "Document Inspector"}
                </h3>
                {selected && (
                  <span className={cn(
                    "rounded-full px-2.5 py-0.5 text-[10px] font-semibold",
                    selected.review_status === "Confirmed"
                      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400"
                      : selected.review_status === "Failed"
                      ? "bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400"
                      : "bg-amber-50 text-amber-800 dark:bg-amber-950/30 dark:text-amber-300"
                  )}>
                    {selected.review_status || "Needs Review"}
                  </span>
                )}
              </div>
              <div className="flex flex-1 min-h-0 overflow-auto p-5">
                {selected ? (
                  <div className="grid min-h-0 w-full gap-5 xl:grid-cols-2">
                    {/* Preview Sub-column */}
                    <div className="flex flex-col gap-3">
                      {selected.review_status === "Processing" && (
                        <div className="rounded-xl border border-blue-200 bg-blue-50/70 px-3.5 py-2.5 text-xs text-blue-800 dark:border-blue-900/30 dark:bg-blue-950/20 dark:text-blue-200">
                          <strong>OCR retry in progress.</strong> This item is still in the review queue and will update when processing finishes.
                        </div>
                      )}

                      <div className="flex min-h-[360px] flex-1 items-center justify-center overflow-hidden rounded-2xl border border-gray-200 bg-gray-50/70 dark:border-white/10 dark:bg-zinc-900/50">
                        {isImage ? (
                          <div className="relative inline-flex max-h-[520px] max-w-full">
                            <Image
                              src={previewUrl}
                              alt="Scanned document"
                              width={800}
                              height={1000}
                              unoptimized
                              className="max-h-[520px] max-w-full object-contain rounded-lg"
                            />
                            {Object.entries(ocrRegions).map(([key, region]) => {
                              const field = REGION_LABELS[key];
                              if (!field || Number(region?.width) <= 0 || Number(region?.height) <= 0) return null;
                              return (
                                <div
                                  key={key}
                                  className="pointer-events-none absolute border-2 rounded-xs"
                                  style={{
                                    left: `${Number(region.x) * 100}%`,
                                    top: `${Number(region.y) * 100}%`,
                                    width: `${Number(region.width) * 100}%`,
                                    height: `${Number(region.height) * 100}%`,
                                    borderColor: field.color,
                                  }}
                                >
                                  <span
                                    className="absolute -top-5 left-0 whitespace-nowrap bg-white/95 px-1.5 py-0.5 text-[10px] font-semibold rounded-xs shadow-xs"
                                    style={{ color: field.color }}
                                  >
                                    {field.label}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="flex h-[520px] w-full flex-col">
                            <iframe
                              title="Scanned document preview"
                              src={previewUrl}
                              className="min-h-0 flex-1 w-full border-0"
                            />
                            {Object.keys(ocrRegions).length > 0 && (
                              <div className="border-t border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-800">
                                OCR field boxes are available for the scanned page image; PDF overlays are not rendered in this preview.
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {!Object.keys(ocrRegions).length && (
                        <div className="rounded-xl border border-amber-200 bg-amber-50/70 px-3.5 py-2.5 text-[11px] text-amber-800 dark:border-amber-900/30 dark:bg-amber-950/20 dark:text-amber-200">
                          No OCR field regions were saved for this item. Click <strong>Retry</strong> to apply the current recognition template and display highlighted boxes.
                        </div>
                      )}
                    </div>

                    {/* Verification Form Sub-column */}
                    <div className="space-y-4">
                      {/* Student Assignment */}
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-gray-700 dark:text-zinc-300">
                          Student Assignment
                        </label>
                        {matchingStudents.length > 0 ? (
                          <div className="space-y-2">
                            {matchingStudents.map((student) => {
                              const studentNo = student.studentNo || student.student_no;
                              const isSelected = selected.proposed_student_no === studentNo;
                              return (
                                <label
                                  key={studentNo}
                                  className={cn(
                                    "flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-all",
                                    isSelected
                                      ? "border-pup-maroon/50 bg-red-50/50 shadow-xs dark:border-red-500/40 dark:bg-red-950/20"
                                      : "border-gray-200 bg-white hover:border-gray-300 dark:border-white/10 dark:bg-zinc-800/60"
                                  )}
                                >
                                  <input
                                    type="radio"
                                    name={`student-assignment-${selected.id}`}
                                    value={studentNo}
                                    checked={isSelected}
                                    onChange={() =>
                                      update({ studentNo }).catch((error) =>
                                        showToast({ title: "Save failed", description: error.message }, true)
                                      )
                                    }
                                    className="mt-0.5 h-4 w-4 accent-pup-maroon cursor-pointer"
                                  />
                                  <span className="min-w-0">
                                    <span className="block truncate text-xs font-semibold text-gray-900 dark:text-zinc-100">
                                      {student.name}
                                    </span>
                                    <span className="mt-0.5 block text-[11px] font-normal text-gray-500 dark:text-zinc-400">
                                      {studentNo}
                                    </span>
                                  </span>
                                </label>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="relative">
                            <Input
                              value={studentAssignmentQuery}
                              onChange={(event) => setStudentAssignmentQuery(event.target.value)}
                              placeholder="Type a name or student number to search..."
                              role="combobox"
                              aria-expanded={Boolean(studentAssignmentQuery.trim())}
                              aria-controls={`student-search-results-${selected.id}`}
                              className="h-10 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 text-xs shadow-none focus-visible:outline-none focus-visible:border-pup-maroon focus-visible:ring-1 focus-visible:ring-pup-maroon"
                            />
                            {studentAssignmentQuery.trim() && (
                              <div
                                id={`student-search-results-${selected.id}`}
                                role="listbox"
                                className="absolute left-0 right-0 z-20 mt-1 max-h-52 overflow-auto rounded-xl border border-gray-200 bg-white p-1 shadow-xl dark:border-white/10 dark:bg-zinc-900"
                              >
                                {assignmentStudents.length > 0 ? (
                                  assignmentStudents.map((student) => {
                                    const studentNo = student.studentNo || student.student_no;
                                    return (
                                      <button
                                        key={studentNo}
                                        type="button"
                                        role="option"
                                        aria-selected={selected.proposed_student_no === studentNo}
                                        onClick={() => {
                                          setStudentAssignmentQuery(student.name);
                                          update({ studentNo }).catch((error) =>
                                            showToast({ title: "Save failed", description: error.message }, true)
                                          );
                                        }}
                                        className="w-full rounded-lg px-3 py-2 text-left hover:bg-red-50 dark:hover:bg-red-950/20 cursor-pointer"
                                      >
                                        <span className="block text-xs font-semibold text-gray-900 dark:text-zinc-100">
                                          {student.name}
                                        </span>
                                        <span className="text-[11px] font-normal text-gray-500 dark:text-zinc-400">
                                          {studentNo}
                                        </span>
                                      </button>
                                    );
                                  })
                                ) : (
                                  <p className="px-3 py-2 text-xs text-gray-500">No students found.</p>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                        <span className="block text-[11px] font-normal text-gray-500 dark:text-zinc-400">
                          {matchingStudents.length > 0
                            ? "Select one of the OCR-matched student candidates."
                            : "No OCR match. Type to search students by name or number."}
                        </span>
                      </div>

                      {/* Document Type */}
                      <div>
                        <label className="mb-1.5 block text-xs font-semibold text-gray-700 dark:text-zinc-300">
                          Document Type
                        </label>
                        <Select
                          className="h-10 rounded-xl px-3 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-white/10 w-full text-xs text-gray-900 dark:text-zinc-200 shadow-none hover:bg-gray-50 dark:hover:bg-zinc-800/80 transition-all focus-visible:outline-none focus-visible:border-pup-maroon focus-visible:ring-1 focus-visible:ring-pup-maroon"
                          value={selected.proposed_doc_type || ""}
                          onChange={(event) =>
                            update({ docType: event.target.value }).catch((error) =>
                              showToast({ title: "Save failed", description: error.message }, true)
                            )
                          }
                        >
                          <option value="">Select type</option>
                          {docTypes.map((type) => (
                            <option key={type} value={type}>
                              {type}
                            </option>
                          ))}
                        </Select>
                      </div>

                      {/* Extracted Name */}
                      <div>
                        <label className="mb-1.5 block text-xs font-semibold text-gray-700 dark:text-zinc-300">
                          Extracted Name
                        </label>
                        <Input
                          value={selected.ocr_name || ""}
                          onChange={(event) =>
                            update({ ocrName: event.target.value }).catch((error) =>
                              showToast({ title: "Save failed", description: error.message }, true)
                            )
                          }
                          className="h-10 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 text-xs shadow-none focus-visible:outline-none focus-visible:border-pup-maroon focus-visible:ring-1 focus-visible:ring-pup-maroon"
                        />
                      </div>

                      {/* Confidence and Quality Scores */}
                      <div className="grid grid-cols-2 gap-2.5">
                        <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-3 dark:border-blue-900/30 dark:bg-blue-950/20">
                          <div className="text-[10px] font-semibold uppercase tracking-wider text-blue-700 dark:text-blue-300">
                            Match Confidence
                          </div>
                          <div className="mt-0.5 text-lg font-bold text-blue-900 dark:text-blue-100">
                            {selected.match_confidence != null
                              ? `${Math.round(Number(selected.match_confidence) * 100)}%`
                              : "—"}
                          </div>
                          <div className="text-[11px] text-blue-700 dark:text-blue-300">
                            {matchEvidence?.reason || selected.match_status || "Not scored"}
                          </div>
                        </div>

                        <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-3 dark:border-emerald-900/30 dark:bg-emerald-950/20">
                          <div className="text-[10px] font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                            OCR Read Quality
                          </div>
                          <div className="mt-0.5 text-lg font-bold text-emerald-900 dark:text-emerald-100">
                            {selected.ocr_quality_score != null
                              ? `${Math.round(Number(selected.ocr_quality_score) * 100)}%`
                              : "—"}
                          </div>
                          <div className="text-[11px] text-emerald-700 dark:text-emerald-300">
                            {selected.match_method || "Not scored"}
                          </div>
                        </div>
                      </div>

                      {/* Conflict Reason Banner */}
                      {(selected.match_status === "Conflict" || status === "Conflict") && (
                        <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3 text-xs text-amber-800 dark:border-amber-900/30 dark:bg-amber-950/20 dark:text-amber-200">
                          <strong>Conflict reason:</strong> {matchReason}
                        </div>
                      )}

                      {/* Evidence Breakdown */}
                      {matchEvidence && (
                        <details className="rounded-xl border border-gray-200 p-3 text-xs dark:border-white/10">
                          <summary className="cursor-pointer font-semibold text-gray-700 dark:text-zinc-300">
                            Evidence Breakdown
                          </summary>
                          <pre className="mt-2 max-h-40 overflow-auto rounded-lg bg-gray-50 p-2 text-[11px] text-gray-600 dark:bg-zinc-900 dark:text-zinc-400">
                            {JSON.stringify(matchEvidence, null, 2)}
                          </pre>
                        </details>
                      )}

                      {/* OCR Response Text */}
                      <div>
                        <label className="mb-1.5 block text-xs font-semibold text-gray-700 dark:text-zinc-300">
                          OCR Raw Text
                        </label>
                        <pre className="max-h-32 overflow-auto rounded-xl border border-gray-100 bg-gray-50/80 p-2.5 text-[11px] whitespace-pre-wrap text-gray-700 dark:border-white/5 dark:bg-zinc-900/70 dark:text-zinc-300">
                          {selected.last_error || selected.ocr_text || "No OCR text returned."}
                        </pre>
                      </div>

                      {/* Review Note */}
                      <div>
                        <label className="mb-1.5 block text-xs font-semibold text-gray-700 dark:text-zinc-300">
                          Review Note
                        </label>
                        <Input
                          value={note}
                          onChange={(event) => setNote(event.target.value)}
                          onBlur={() => update({ reviewNote: note }).catch(() => {})}
                          placeholder="Optional review or conflict note..."
                          className="h-10 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 text-xs shadow-none focus-visible:outline-none focus-visible:border-pup-maroon focus-visible:ring-1 focus-visible:ring-pup-maroon"
                        />
                      </div>

                      {/* Actions */}
                      <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-gray-100 dark:border-white/5">
                        <Button
                          size="sm"
                          onClick={() =>
                            action("confirm", {
                              studentNo: selected.proposed_student_no,
                              studentName: selected.ocr_name,
                              docType: selected.proposed_doc_type,
                            })
                          }
                          disabled={
                            saving ||
                            !selected.proposed_student_no ||
                            !selected.proposed_doc_type
                          }
                          className="h-10 px-5 text-xs font-semibold rounded-xl! btn-brand-red text-white! active:scale-95 disabled:opacity-50 transition-all cursor-pointer shadow-xs"
                          style={{ color: "#ffffff" }}
                        >
                          {saving ? "Confirming..." : "Confirm"}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => action("retry")}
                          disabled={saving}
                          className="h-10 px-4 text-xs font-semibold rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-xs cursor-pointer active:scale-95 transition-all disabled:opacity-40"
                        >
                          Retry
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() =>
                            action("reject", {
                              reason: note || "Rejected during review",
                            })
                          }
                          disabled={saving}
                          className="h-10 px-4 text-xs font-semibold rounded-xl border border-red-200 dark:border-red-900/40 bg-red-50/60 dark:bg-red-950/20 text-red-700 dark:text-red-400 hover:bg-red-100/70 dark:hover:bg-red-950/40 shadow-xs cursor-pointer active:scale-95 transition-all disabled:opacity-40"
                        >
                          Reject
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-1 items-center justify-center p-8">
                    <Empty className="flex h-full min-h-[380px] flex-col items-center justify-center border-0 bg-transparent text-center">
                      <EmptyHeader className="flex flex-col items-center gap-0">
                        <div className="relative mb-5">
                          <div className="absolute inset-0 scale-150 animate-pulse rounded-full bg-gray-50 opacity-50 dark:bg-card"></div>
                          <EmptyMedia className="relative z-10 flex h-20 w-20 items-center justify-center rounded-2xl border border-gray-100 bg-white shadow-lg -rotate-2 dark:border-white/10 dark:bg-card dark:shadow-none">
                            <HugeIcon  className="ph-duotone ph-file-text text-xl text-gray-300 dark:text-zinc-600"></HugeIcon>
                          </EmptyMedia>
                        </div>
                        <EmptyTitle className="text-base font-semibold text-gray-900 dark:text-zinc-50">
                          Select a Document
                        </EmptyTitle>
                        <EmptyDescription className="max-w-xs text-xs font-normal text-gray-500 dark:text-zinc-400 mt-1">
                          Choose an item from the review queue on the left to inspect its scanned preview, OCR regions, and match proposals.
                        </EmptyDescription>
                      </EmptyHeader>
                    </Empty>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        </Card>
      </div>
    </TooltipProvider>
  );
}
