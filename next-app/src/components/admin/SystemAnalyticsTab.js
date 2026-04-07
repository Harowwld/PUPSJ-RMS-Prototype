"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { formatPHDateTime } from "@/lib/timeFormat";

export default function SystemAnalyticsTab({
  showToast,
  onLogAction,
}) {
  const [statusFilter, setStatusFilter] = useState("Active");
  const [courseFilter, setCourseFilter] = useState("");
  const [requireApproved, setRequireApproved] = useState(false);
  const [thresholdPercent, setThresholdPercent] = useState(95);
  const [courses, setCourses] = useState([]);
  const [coursesLoading, setCoursesLoading] = useState(true);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setCoursesLoading(true);
      try {
        const res = await fetch("/api/courses", { cache: "no-store" });
        const json = await res.json().catch(() => null);
        if (!res.ok || !json?.ok) throw new Error(json?.error || "Failed to load courses");
        const rows = Array.isArray(json.data) ? json.data : [];
        if (!cancelled) setCourses(rows);
      } catch {
        if (!cancelled) setCourses([]);
      } finally {
        if (!cancelled) setCoursesLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const buildQueryString = useCallback(() => {
    const params = new URLSearchParams();
    params.set("status", statusFilter);
    const cc = String(courseFilter || "").trim();
    if (cc) params.set("courseCode", cc);
    if (requireApproved) params.set("requireApproved", "1");
    const thr = Number(thresholdPercent);
    const safe = Number.isFinite(thr) ? Math.min(100, Math.max(0, thr)) : 95;
    params.set("threshold", String(safe / 100));
    return params.toString();
  }, [statusFilter, courseFilter, requireApproved, thresholdPercent]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const qs = buildQueryString();
      const res = await fetch(
        `/api/analytics/digitization-compliance?${qs}`,
        { cache: "no-store" }
      );
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || "Failed to load compliance data");
      }
      setData(json.data);
    } catch (e) {
      setData(null);
      setError(e?.message || "Load failed");
      showToast?.(
        { title: "Load Failed", description: e?.message || "Unable to load report." },
        true
      );
    } finally {
      setLoading(false);
    }
  }, [buildQueryString, showToast]);

  const firstLoadRef = useRef(true);
  useEffect(() => {
    const delay = firstLoadRef.current ? 0 : 350;
    firstLoadRef.current = false;
    const id = setTimeout(() => {
      load();
    }, delay);
    return () => clearTimeout(id);
  }, [statusFilter, courseFilter, requireApproved, thresholdPercent, load]);

  const summary = data?.summary;
  const meta = data?.meta;
  const byCourse = useMemo(
    () => (Array.isArray(data?.byCourse) ? data.byCourse : []),
    [data?.byCourse]
  );
  const showByCourse = useMemo(
    () => byCourse.length > 0 && !String(courseFilter || "").trim(),
    [byCourse, courseFilter]
  );

  const progressWidth = useMemo(() => {
    const p = summary?.percentDigitized;
    if (p === null || p === undefined) return 0;
    return Math.min(100, Math.max(0, p));
  }, [summary]);

  const downloadCsv = useCallback(() => {
    if (!summary) return;

    const q = (cell) => `"${String(cell).replace(/"/g, '""')}"`;
    const row = (cells) => cells.map(q).join(",");

    const lines = [
      row(["Digitization compliance report", ""]),
      row(["Generated (server UTC)", meta?.generatedAt || ""]),
      row(["Student status filter", meta?.studentStatus || ""]),
      row(["Course filter", meta?.courseCode || "All"]),
      row(["Require approved only", meta?.requireApproved ? "Yes" : "No"]),
      row(["Compliance threshold", `${(summary.threshold * 100).toFixed(0)}%`]),
      "",
      row(["Metric", "Value"]),
      row(["Total students", summary.totalStudents]),
      row(["Digitized students", summary.digitizedStudents]),
      row(["Not digitized", summary.notDigitizedStudents]),
      row([
        "Percent digitized",
        summary.percentDigitized != null ? `${summary.percentDigitized}%` : "N/A",
      ]),
      row(["Compliant", summary.isCompliant ? "Yes" : "No"]),
    ];

    if (showByCourse) {
      lines.push("");
      lines.push(row(["Course", "Total students", "Digitized", "Percent digitized"]));
      for (const r of byCourse) {
        lines.push(
          row([
            r.courseCode,
            r.total,
            r.digitized,
            r.percent != null ? `${r.percent}%` : "N/A",
          ])
        );
      }
    }

    const csvContent = lines.join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `digitization-compliance-${new Date().toISOString().split("T")[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    onLogAction?.("Exported digitization compliance CSV");
  }, [summary, meta, byCourse, showByCourse, onLogAction]);

  return (
    <div className="flex flex-col w-full h-full gap-4 animate-fade-in font-inter min-h-0">
      <Card className="flex-1 bg-white rounded-brand border border-gray-300 shadow-sm overflow-hidden flex flex-col min-h-0">
        <div className="p-4 bg-gray-50/50 flex-none border-b border-gray-200">
          <div className="flex flex-col lg:flex-row lg:items-end gap-4 justify-between">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 flex-1">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1 uppercase">
                  Student Status
                </label>
                <select
                  className="h-10 w-full rounded-brand border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-pup-maroon focus:border-pup-maroon"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="Active">Active</option>
                  <option value="All">All statuses</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1 uppercase">
                  Course Filter
                </label>
                <select
                  className="h-10 w-full rounded-brand border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-pup-maroon focus:border-pup-maroon disabled:opacity-60"
                  value={courseFilter}
                  onChange={(e) => setCourseFilter(e.target.value)}
                  disabled={coursesLoading}
                >
                  <option value="">All courses</option>
                  {courses.map((c) => (
                    <option key={c.code || c.id} value={String(c.code || "")}>
                      {c.code}
                      {c.name ? ` — ${c.name}` : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1 uppercase">
                  Compliance Threshold (%)
                </label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  className="h-10 w-full rounded-brand border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-pup-maroon focus:border-pup-maroon"
                  value={thresholdPercent}
                  onChange={(e) => setThresholdPercent(Number(e.target.value))}
                />
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2 cursor-pointer select-none h-10 px-1">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded border-gray-300 text-pup-maroon focus:ring-pup-maroon cursor-pointer"
                    checked={requireApproved}
                    onChange={(e) => setRequireApproved(e.target.checked)}
                  />
                  <span className="text-sm font-bold text-gray-700">
                    Approved Docs Only
                  </span>
                </label>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => load()}
                disabled={loading}
                className="h-9 px-4 font-bold text-sm text-gray-600 bg-white border border-gray-300 shadow-sm hover:bg-gray-50"
              >
                <i className="ph-bold ph-arrows-clockwise text-sm mr-1.5" aria-hidden />
                Refresh
              </Button>
              <Button
                type="button"
                variant="default"
                size="sm"
                onClick={downloadCsv}
                disabled={!summary || loading}
                className="h-9 px-4 font-bold text-sm bg-pup-maroon text-white border border-pup-maroon shadow-sm hover:bg-red-900 disabled:opacity-60"
              >
                <i className="ph-bold ph-download-simple text-sm mr-1.5" aria-hidden />
                Export CSV
              </Button>
            </div>
          </div>
        </div>

        <CardContent className="flex-1 flex flex-col min-h-0 p-6 overflow-auto">
          {loading ? (
            <div className="space-y-6">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-24 rounded-brand" />
                ))}
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-full max-w-md rounded-brand" />
                <Skeleton className="h-3 w-full rounded-full" />
              </div>
              <Skeleton className="h-64 rounded-brand w-full" />
            </div>
          ) : error ? (
            <div className="h-[400px] flex flex-col items-center justify-center text-center text-gray-500">
              <div className="w-16 h-16 rounded-full bg-white border border-gray-200 flex items-center justify-center mb-4 shadow-sm">
                <i className="ph-duotone ph-warning-circle text-3xl text-pup-maroon" />
              </div>
              <p className="text-lg font-bold text-gray-900">Could not load report</p>
              <p className="text-sm font-medium text-gray-600 mt-1 max-w-md">{error}</p>
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-6 font-bold"
                onClick={() => load()}
              >
                Try Again
              </Button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <div className="rounded-brand border border-gray-200 bg-white p-4 shadow-xs">
                  <div className="text-[10px] font-bold uppercase text-gray-400 tracking-widest mb-1">
                    Total Students
                  </div>
                  <div className="text-2xl font-bold text-gray-900">
                    {summary?.totalStudents?.toLocaleString?.() ?? summary?.totalStudents}
                  </div>
                </div>
                <div className="rounded-brand border border-gray-200 bg-white p-4 shadow-xs">
                  <div className="text-[10px] font-bold uppercase text-gray-400 tracking-widest mb-1">
                    Digitized
                  </div>
                  <div className="text-2xl font-bold text-pup-maroon">
                    {summary?.digitizedStudents?.toLocaleString?.() ??
                      summary?.digitizedStudents}
                  </div>
                </div>
                <div className="rounded-brand border border-gray-200 bg-white p-4 shadow-xs">
                  <div className="text-[10px] font-bold uppercase text-gray-400 tracking-widest mb-1">
                    Not Digitized
                  </div>
                  <div className="text-2xl font-bold text-gray-800">
                    {summary?.notDigitizedStudents?.toLocaleString?.() ??
                      summary?.notDigitizedStudents}
                  </div>
                </div>
                <div className="rounded-brand border border-gray-200 bg-white p-4 shadow-xs flex flex-col justify-between">
                  <div className="text-[10px] font-bold uppercase text-gray-400 tracking-widest mb-1">
                    System Status
                  </div>
                  <div className="mt-1">
                    {summary?.isCompliant ? (
                      <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold uppercase text-[10px] tracking-wider px-2 py-1">
                        Compliant
                      </Badge>
                    ) : (
                      <Badge className="bg-amber-50 text-amber-700 border border-amber-200 font-bold uppercase text-[10px] tracking-wider px-2 py-1">
                        Non-Compliant
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                  Digitization Progress
                </span>
                <span className="text-sm font-bold text-gray-900">
                  {summary?.percentDigitized != null
                    ? `${summary.percentDigitized}%`
                    : "N/A"}
                  <span className="text-gray-400 font-medium text-xs ml-2 normal-case tracking-normal">
                    (Target ≥ {(summary?.threshold * 100).toFixed(0)}%)
                  </span>
                </span>
              </div>
              <div className="h-4 w-full rounded-full bg-gray-100 border border-gray-200 overflow-hidden mb-6 shadow-inner">
                <div
                  className="h-full rounded-full bg-pup-maroon shadow-sm transition-[width] duration-700 ease-out"
                  style={{ width: `${progressWidth}%` }}
                />
              </div>

              {meta?.generatedAt ? (
                <p className="text-[11px] text-gray-400 mb-6 italic">
                  * Figures updated as of{" "}
                  <span className="font-bold text-gray-500">
                    {formatPHDateTime(meta.generatedAt)}
                  </span>{" "}
                  (Asia/Manila).
                </p>
              ) : null}

              {showByCourse ? (
                <div className="flex-1 min-h-0 flex flex-col border border-gray-200 rounded-brand overflow-hidden">
                  <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest px-4 py-3 bg-gray-50 border-b border-gray-200">
                    Breakdown By Academic Program
                  </div>
                  <div className="overflow-auto flex-1">
                    <table className="min-w-full text-sm">
                      <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
                        <tr className="text-left text-[11px] uppercase tracking-wider text-gray-600">
                          <th className="p-4 font-bold">Course Code</th>
                          <th className="p-4 font-bold">Total Students</th>
                          <th className="p-4 font-bold text-pup-maroon">Digitized</th>
                          <th className="p-4 font-bold text-right w-32">% Progress</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {byCourse.map((row) => (
                          <tr key={row.courseCode} className="hover:bg-gray-50 group transition-colors">
                            <td className="p-4 font-mono font-bold text-gray-900 text-xs">
                              {row.courseCode || "—"}
                            </td>
                            <td className="p-4 text-gray-700 font-medium">
                              {row.total?.toLocaleString?.() ?? row.total}
                            </td>
                            <td className="p-4 text-pup-maroon font-bold">
                              {row.digitized?.toLocaleString?.() ?? row.digitized}
                            </td>
                            <td className="p-4 text-right">
                              <div className="flex items-center justify-end gap-3">
                                <span className="text-gray-900 font-bold text-xs">
                                  {row.percent != null ? `${row.percent}%` : "0%"}
                                </span>
                                <div className="w-16 h-1.5 rounded-full bg-gray-100 overflow-hidden border border-gray-200 hidden sm:block">
                                  <div 
                                    className="h-full bg-pup-maroon" 
                                    style={{ width: `${Math.min(100, row.percent || 0)}%` }}
                                  />
                                </div>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : String(courseFilter || "").trim() ? (
                <div className="p-8 text-center bg-gray-50 rounded-brand border border-dashed border-gray-300">
                  <p className="text-sm text-gray-500 font-medium">
                    Per-course breakdown is hidden while a specific course is selected.
                  </p>
                </div>
              ) : (summary?.totalStudents ?? 0) === 0 ? (
                <div className="h-[200px] flex flex-col items-center justify-center text-center text-gray-500 border border-gray-200 rounded-brand bg-white">
                  <div className="w-14 h-14 rounded-full bg-gray-50 border border-gray-200 flex items-center justify-center mb-3 shadow-xs">
                    <i className="ph-duotone ph-magnifying-glass text-2xl text-pup-maroon" />
                  </div>
                  <p className="text-sm font-bold text-gray-900">No records found</p>
                  <p className="text-xs font-medium text-gray-600 mt-1 max-w-sm px-4">
                    There are no student records matching the selected status filter.
                  </p>
                </div>
              ) : (
                <div className="h-[200px] flex flex-col items-center justify-center text-center text-gray-500 border border-gray-200 rounded-brand bg-white shadow-xs">
                  <div className="w-14 h-14 rounded-full bg-gray-50 border border-gray-200 flex items-center justify-center mb-3 shadow-xs">
                    <i className="ph-duotone ph-chart-bar text-2xl text-pup-maroon" />
                  </div>
                  <p className="text-sm font-bold text-gray-900">Analytics unavailable</p>
                  <p className="text-xs font-medium text-gray-600 mt-1 max-w-sm px-4">
                    Add students with course codes to see a detailed program breakdown.
                  </p>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
