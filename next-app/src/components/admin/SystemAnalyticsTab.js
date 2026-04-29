"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Toggle } from "@/components/ui/toggle";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { formatPHDateTime } from "@/lib/timeFormat";
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyMedia,
} from "@/components/ui/empty";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function SystemAnalyticsTab({
  showToast,
  onLogAction,
}) {
  const [statusFilter, setStatusFilter] = useState("Active");
  const [courseFilter, setCourseFilter] = useState("");
  const [requireApproved, setRequireApproved] = useState(false);
  const [courses, setCourses] = useState([]);
  const [coursesLoading, setCoursesLoading] = useState(true);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reportOpen, setReportOpen] = useState(false);

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
    return params.toString();
  }, [statusFilter, courseFilter, requireApproved]);

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
  }, [statusFilter, courseFilter, requireApproved, load]);

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

  const handlePrint = () => {
    window.print();
    onLogAction?.("Generated physical compliance report (Print/PDF)");
  };

  const downloadCsv = useCallback(() => {
    if (!summary) return;

    const q = (cell) => `"${String(cell).replace(/"/g, '""')}"`;
    const row = (cells) => cells.map(q).join(",");

    const lines = [
      row(["System Analytics - Digitization Compliance Report", ""]),
      row(["Generated (server UTC)", meta?.generatedAt || ""]),
      row(["Student status filter", meta?.studentStatus || ""]),
      row(["Course filter", meta?.courseCode || "All"]),
      row(["Require approved only", meta?.requireApproved ? "Yes" : "No"]),
      row(["Requirement", meta?.definitions?.expectedCountFormula || ""]),
      "",
      row(["Summary Metrics", "Value"]),
      row(["Total students", summary.totalStudents]),
      row(["Fully digitized students", summary.digitizedStudents]),
      row(["Incomplete students", summary.notDigitizedStudents]),
      row([
        "Average record completeness",
        summary.percentDigitized != null ? `${summary.percentDigitized}%` : "N/A",
      ]),
      row(["Full Digitization Rate", summary.fullyDigitizedRate != null ? `${summary.fullyDigitizedRate}%` : "N/A"]),
      row(["Total digitized files", summary.totalDigitizedDocsCount]),
      row(["Total expected files", summary.totalExpectedDocsCount]),
    ];

    if (showByCourse) {
      lines.push("");
      lines.push(row(["Course Program Breakdown", "", "", ""]));
      lines.push(row(["Course", "Total Students", "Fully Digitized", "Avg. Completeness"]));
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
      `system-analytics-${new Date().toISOString().split("T")[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    onLogAction?.("Exported compliance report (CSV)");
  }, [summary, meta, byCourse, showByCourse, onLogAction]);

  const reportDate = formatPHDateTime(new Date().toISOString());

  return (
    <div className="flex flex-col w-full h-full gap-4 animate-fade-in font-inter min-h-0">
      <style dangerouslySetInnerHTML={{
        __html: `
        @media print {
          body * { visibility: hidden; }
          .printable-report, .printable-report * { visibility: visible; }
          .printable-report {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            height: auto !important;
            padding: 40px !important;
            background: white !important;
            z-index: 9999 !important;
          }
          .no-print { display: none !important; }
          .rounded-brand, .rounded-xl { border-radius: 0 !important; }
          .shadow-sm, .shadow-xs, .shadow-2xl { box-shadow: none !important; }
          .border { border: 1px solid #e2e8f0 !important; }
          .bg-gray-50\\/50 { background-color: transparent !important; }
          .bg-white { background-color: white !important; }
          .text-pup-maroon { color: #800000 !important; }
          table { width: 100% !important; border-collapse: collapse !important; border: 1px solid #e2e8f0 !important; }
          th, td { border: 1px solid #e2e8f0 !important; padding: 12px !important; }
          .progress-bar-container { border: 1px solid #e2e8f0 !important; height: 16px !important; }
          .progress-bar-fill { background-color: #800000 !important; print-color-adjust: exact; -webkit-print-color-adjust: exact; }
        }
      `}} />

      <Card className="flex-1 bg-white rounded-brand border border-gray-300 shadow-sm overflow-hidden flex flex-col min-h-0">
        <div className="p-4 bg-gray-50/50 flex-none border-b border-gray-200">
          <div className="flex flex-col lg:flex-row lg:items-end gap-4 justify-between">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 flex-1">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-gray-700 uppercase">
                    Student Status
                  </label>
                  {(statusFilter !== "Active" || courseFilter !== "") && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setStatusFilter("Active");
                        setCourseFilter("");
                      }}
                      className="h-5 px-1.5 text-[9px] font-bold text-pup-maroon hover:bg-red-50 hover:text-pup-darkMaroon"
                    >
                      CLEAR ALL
                    </Button>
                  )}
                </div>
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
              <div className="flex items-end">
                <Toggle
                  variant="outline"
                  pressed={requireApproved}
                  onPressedChange={setRequireApproved}
                  className={cn(
                    "h-10 px-4 gap-2 rounded-brand border border-gray-300 font-bold text-xs uppercase transition-all select-none w-full sm:w-auto",
                    "hover:bg-gray-50 hover:text-gray-700",
                    "data-[state=on]:bg-pup-maroon data-[state=on]:text-white data-[state=on]:border-pup-maroon data-[state=on]:shadow-sm"
                  )}
                >
                  <i
                    className={cn(
                      "ph-bold",
                      requireApproved ? "ph-check-circle" : "ph-circle"
                    )}
                    aria-hidden
                  />
                  Approved Docs Only
                </Toggle>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button
                type="button"
                variant="default"
                size="sm"
                onClick={() => setReportOpen(true)}
                disabled={loading || !data}
                className="h-9 px-6 font-bold text-sm bg-pup-maroon text-white border border-pup-maroon shadow-sm hover:bg-red-900 disabled:opacity-60"
              >
                <i className="ph-bold ph-file-pdf text-sm mr-1.5" aria-hidden />
                GENERATE REPORT
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={downloadCsv}
                disabled={loading || !data}
                className="h-9 px-4 font-bold text-sm text-gray-600 bg-white border border-gray-300 shadow-sm hover:bg-gray-50"
              >
                <i className="ph-bold ph-download-simple text-sm mr-1.5" aria-hidden />
                EXPORT CSV
              </Button>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={load}
                      disabled={loading}
                      className="h-9 w-9 p-0 text-gray-600 bg-white border border-gray-300 shadow-sm hover:bg-gray-50 transition-all active:scale-95"
                    >
                      <i
                        className={cn(
                          "ph-bold ph-arrows-clockwise text-sm",
                          loading && "animate-spin"
                        )}
                        aria-hidden
                      />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    <p className="font-bold">Refresh Analytics Data</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        </div>

        <CardContent className="flex-1 flex flex-col min-h-0 p-6 overflow-auto bg-white">
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
              <p className="text-lg font-bold text-gray-900">Could not load compliance data</p>
              <p className="text-sm font-medium text-gray-600 mt-1 max-w-md">{error}</p>
              <Button variant="outline" size="sm" className="mt-6 font-bold" onClick={load}>Try Again</Button>
            </div>
          ) : !data ? (
            <div className="h-full flex items-center justify-center">
              <Skeleton className="h-64 w-full rounded-brand" />
            </div>
          ) : (
            <>
              {/* Stats Cards - PUP Maroon Theme */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">

                {/* Total Students — Accent Card */}
                <div className="relative rounded-xl p-4 overflow-hidden border border-[#5c1520] bg-[#7a1e28]">
                  <i className="ph-duotone ph-users-three absolute -right-3 -bottom-3 text-[60px] opacity-20 text-white rotate-12 pointer-events-none" />
                  <div className="text-[10px] font-bold uppercase tracking-widest text-[#f7c9ce] mb-2">
                    Total Students
                  </div>
                  <div className="text-2xl font-bold text-white leading-none">
                    {summary?.totalStudents?.toLocaleString?.() ?? summary?.totalStudents}
                  </div>
                </div>

                {/* Fully Digitized */}
                <div className="relative rounded-xl p-4 overflow-hidden border border-[#7a1e28]/15 bg-[#fdf6f6]">
                  <i className="ph-duotone ph-check-square-offset absolute -right-3 -bottom-3 text-[60px] opacity-10 text-[#7a1e28] rotate-12 pointer-events-none" />
                  <div className="text-[10px] font-bold uppercase tracking-widest text-[#9e5a62] mb-2">
                    Fully Digitized
                  </div>
                  <div className="text-2xl font-bold text-[#7a1e28] leading-none">
                    {summary?.digitizedStudents?.toLocaleString?.() ?? summary?.digitizedStudents}
                  </div>
                  <div className="text-[11px] text-[#b07078] mt-1">
                    100% complete records
                  </div>
                </div>

                {/* Avg. Completeness */}
                <div className="relative rounded-xl p-4 overflow-hidden border border-[#7a1e28]/15 bg-[#fdf6f6]">
                  <i className="ph-duotone ph-chart-pie absolute -right-3 -bottom-3 text-[60px] opacity-10 text-[#7a1e28] rotate-12 pointer-events-none" />
                  <div className="text-[10px] font-bold uppercase tracking-widest text-[#9e5a62] mb-2">
                    Avg. Completeness
                  </div>
                  <div className="text-2xl font-bold text-[#7a1e28] leading-none">
                    {summary?.percentDigitized != null ? `${summary.percentDigitized}%` : "0%"}
                  </div>
                  <div className="text-[11px] text-[#b07078] mt-1">
                    Overall record health
                  </div>
                </div>

                {/* Archive Health */}
                <div className="relative rounded-xl p-4 overflow-hidden border border-[#7a1e28]/15 bg-[#fdf6f6]">
                  <i className="ph-duotone ph-shield-check absolute -right-3 -bottom-3 text-[60px] opacity-10 text-[#7a1e28] rotate-12 pointer-events-none" />
                  <div className="text-[10px] font-bold uppercase tracking-widest text-[#9e5a62] mb-2">
                    Archive Health
                  </div>
                  <div className="mt-1">
                    {summary?.percentDigitized >= 95 ? (
                      <span className="inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md bg-[#e1f5ee] text-[#085041] border border-[#9fe1cb]">
                        Excellent
                      </span>
                    ) : summary?.percentDigitized >= 80 ? (
                      <span className="inline-block text-[10px] font-medium uppercase tracking-wider px-2 py-1 rounded-md bg-[#e6f1fb] text-[#0c447c] border border-[#b5d4f4]">
                        Healthy
                      </span>
                    ) : (
                      <span className="inline-block text-[10px] font-medium uppercase tracking-wider px-2 py-1 rounded-md bg-[#faeeda] text-[#633806] border border-[#fac775]">
                        Action Needed
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                  Overall System Completeness
                </span>
                <span className="text-sm font-bold text-gray-900">
                  {summary?.percentDigitized != null ? `${summary.percentDigitized}%` : "N/A"}
                </span>
              </div>
              <div className="h-4 w-full rounded-full bg-gray-100 border border-gray-200 overflow-hidden mb-6 shadow-inner">
                <div
                  className="h-full rounded-full bg-pup-maroon shadow-sm transition-[width] duration-700 ease-out"
                  style={{ width: `${progressWidth}%` }}
                />
              </div>

              <div className="flex flex-wrap gap-8 mb-8 bg-gray-50/50 p-4 rounded-xl border border-gray-100">
                <div>
                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Digitized Files</div>
                  <div className="text-lg font-bold text-gray-700">{summary?.totalDigitizedDocsCount?.toLocaleString() || 0}</div>
                </div>
                <div>
                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Required Files</div>
                  <div className="text-lg font-bold text-gray-700">{summary?.totalExpectedDocsCount?.toLocaleString() || 0}</div>
                </div>
                <div>
                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Full Record Rate</div>
                  <div className="text-lg font-bold text-emerald-600">{summary?.fullyDigitizedRate != null ? `${summary.fullyDigitizedRate}%` : "0%"}</div>
                </div>
                <div className="sm:ml-auto">
                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 italic">Report Formula</div>
                  <div className="text-[11px] text-gray-500 max-w-xs">{meta?.definitions?.expectedCountFormula}</div>
                </div>
              </div>

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
                          <th className="p-4 font-bold text-center">Total Students</th>
                          <th className="p-4 font-bold text-emerald-600 text-center">Fully Digitized</th>
                          <th className="p-4 font-bold text-pup-maroon text-right w-44">Avg. Completeness</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {byCourse.map((row) => (
                          <tr key={row.courseCode} className="hover:bg-gray-50 group transition-colors">
                            <td className="p-4 font-mono font-bold text-gray-900 text-xs">{row.courseCode || "—"}</td>
                            <td className="p-4 text-gray-700 font-medium text-center">{row.total?.toLocaleString?.() ?? row.total}</td>
                            <td className="p-4 text-emerald-600 font-bold text-center">
                              {row.digitized?.toLocaleString?.() ?? row.digitized}
                              <span className="text-[10px] text-gray-400 font-medium ml-1">({row.fullyDigitizedRate}%)</span>
                            </td>
                            <td className="p-4 text-right">
                              <div className="flex items-center justify-end gap-3">
                                <span className="text-gray-900 font-bold text-xs">{row.percent != null ? `${row.percent}%` : "0%"}</span>
                                <div className="w-16 h-1.5 rounded-full bg-gray-100 overflow-hidden border border-gray-200 hidden sm:block">
                                  <div className="h-full bg-pup-maroon" style={{ width: `${Math.min(100, row.percent || 0)}%` }} />
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
                <Empty className="h-[400px] flex flex-col items-center justify-center text-center text-gray-500 border border-gray-200 rounded-brand bg-gray-50/50 shadow-sm">
                  <EmptyHeader className="flex flex-col items-center gap-0">
                    <EmptyMedia className="w-16 h-16 rounded-full bg-white border border-gray-200 flex items-center justify-center mb-4 shadow-sm">
                      <i className="ph-bold ph-eye-slash text-3xl text-gray-400" />
                    </EmptyMedia>
                    <EmptyTitle className="text-lg font-bold text-gray-900">Breakdown hidden</EmptyTitle>
                    <EmptyDescription className="text-sm font-medium text-gray-600 mt-1 max-w-sm px-4">
                      Per-course breakdown is hidden while a specific course is selected.
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              ) : (
                <Empty className="h-[400px] flex flex-col items-center justify-center text-center text-gray-500 border border-gray-200 rounded-brand bg-white shadow-sm">
                  <EmptyHeader className="flex flex-col items-center gap-0">
                    <EmptyMedia className="w-16 h-16 rounded-full bg-white border border-gray-200 flex items-center justify-center mb-4 shadow-sm">
                      <i className="ph-duotone ph-chart-bar text-3xl text-pup-maroon" />
                    </EmptyMedia>
                    <EmptyTitle className="text-lg font-bold text-gray-900">Analytics unavailable</EmptyTitle>
                    <EmptyDescription className="text-sm font-medium text-gray-600 mt-1 max-w-sm px-4">
                      Add students with course codes to see a detailed program breakdown.
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Report Preview Modal */}
      <Dialog open={reportOpen} onOpenChange={reportOpen ? () => setReportOpen(false) : undefined}>
        <DialogContent className="w-[96vw] max-w-[96vw] xl:max-w-[1200px] h-[90vh] p-0 flex flex-col overflow-hidden bg-gray-100 border border-gray-200 shadow-2xl rounded-brand">
          <DialogHeader className="p-5 border-b border-gray-100 bg-white shrink-0">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full border border-red-100 bg-red-50 text-pup-maroon shadow-sm flex items-center justify-center shrink-0">
                <i className="ph-duotone ph-file-text text-2xl"></i>
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-lg font-black tracking-tight text-gray-900 text-left">
                  Formal Compliance Report
                </DialogTitle>
                <p className="text-sm font-medium mt-1 text-gray-600 text-left">
                  This document is formatted for formal accreditation submission. Review the narrative summary and statistical data below.
                </p>
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-auto p-10 flex flex-col items-center gap-8 scroll-smooth">
            {/* PAGE 1: EXECUTIVE SUMMARY */}
            <div className="printable-report w-[210mm] min-h-[297mm] bg-white shadow-2xl p-[25mm] flex flex-col box-border">
              <div className="text-center border-b-2 border-pup-maroon pb-6 mb-10">
                <h1 className="text-2xl font-black text-pup-maroon uppercase tracking-tight">Polytechnic University of the Philippines</h1>
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em] mt-1">Office of the University Registrar • San Juan Branch</p>
                <h2 className="text-xl font-bold text-gray-800 uppercase tracking-widest mt-6">Digitization Compliance Report</h2>
                <p className="text-sm text-gray-500 mt-2 font-medium italic">Document ID: PUP-RMS-ANL-{new Date().getFullYear()}-{Math.floor(Math.random() * 10000)}</p>
              </div>

              <div className="space-y-6 text-gray-800 leading-relaxed text-sm">
                <div className="flex justify-between items-start mb-8 bg-gray-50 p-4 border border-gray-100 rounded-lg">
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-gray-400 uppercase">Report Date</p>
                    <p className="font-bold">{reportDate}</p>
                  </div>
                  <div className="space-y-1 text-right">
                    <p className="text-[10px] font-bold text-gray-400 uppercase">Archive Status</p>
                    <p className="font-black text-pup-maroon text-lg uppercase">{summary?.percentDigitized >= 80 ? 'Compliant' : 'Under Review'}</p>
                  </div>
                </div>

                <h3 className="text-base font-black text-gray-900 uppercase tracking-wider border-b border-gray-200 pb-2">I. Executive Summary</h3>
                <p>
                  This document serves as the official compliance assessment regarding the digitization of student records at the Polytechnic University of the Philippines, San Juan Branch.
                  As of the current reporting period, the University has identified a total population of <strong>{summary?.totalStudents?.toLocaleString()}</strong> students categorized under the <strong>{statusFilter}</strong> status.
                </p>
                <p>
                  The primary objective of this audit is to measure the completeness of the digital archives against the mandatory document set defined by university policy and accreditation requirements.
                  The current system configuration requires a total of <strong>{meta?.definitions?.configuredDocTypes?.length || 0} unique document types</strong> per student record to achieve 100% digitization status.
                </p>

                <h3 className="text-base font-black text-gray-900 uppercase tracking-wider border-b border-gray-200 pb-2 mt-8">II. Compliance Metrics</h3>
                <div className="grid grid-cols-2 gap-x-12 gap-y-6 bg-gray-50/50 p-6 rounded-xl border border-gray-100">
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Overall Record Health</p>
                    <p className="text-2xl font-black text-gray-900">{summary?.percentDigitized}%</p>
                    <p className="text-[11px] text-gray-500 mt-1">Average completeness ratio across all selected records.</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Full Digitization Rate</p>
                    <p className="text-2xl font-black text-emerald-600">{summary?.fullyDigitizedRate}%</p>
                    <p className="text-[11px] text-gray-500 mt-1">Percentage of students with 100% completed archives.</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Actual Document Volume</p>
                    <p className="text-lg font-bold text-gray-800">{summary?.totalDigitizedDocsCount?.toLocaleString()}</p>
                    <p className="text-[11px] text-gray-500">Total verified digital files currently in system.</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Target Document Volume</p>
                    <p className="text-lg font-bold text-gray-800">{summary?.totalExpectedDocsCount?.toLocaleString()}</p>
                    <p className="text-[11px] text-gray-500">Total files required for absolute digitization.</p>
                  </div>
                </div>

                <p className="mt-6 italic text-gray-500 text-xs">
                  Note: The Archive Health is currently rated as <strong>{summary?.percentDigitized >= 95 ? 'Excellent' : summary?.percentDigitized >= 80 ? 'Healthy' : 'Action Required'}</strong>.
                  Continuous digitization efforts are recommended to maintain institutional standards and ensure seamless administrative operations.
                </p>
              </div>

              <div className="mt-auto pt-12 flex justify-end border-t border-gray-100">
                <div className="text-right italic text-[10px] text-gray-400 flex items-end">
                  Page 1 of 2
                </div>
              </div>
            </div>

            {/* PAGE 2: STATISTICAL BREAKDOWN */}
            <div className="printable-report w-[210mm] min-h-[297mm] bg-white shadow-2xl p-[25mm] flex flex-col box-border">
              <div className="space-y-6 text-gray-800 leading-relaxed text-sm">
                <h3 className="text-base font-black text-gray-900 uppercase tracking-wider border-b border-gray-200 pb-2">III. Program-Specific Breakdown</h3>
                <p>
                  The following table provides a detailed analysis of digitization progress categorized by Academic Program.
                  This breakdown identifies areas of high performance and highlights programs that may require additional resources to meet compliance targets.
                </p>

                <div className="mt-6 border border-gray-200 rounded-sm overflow-hidden">
                  <table className="w-full border-collapse">
                    <thead className="bg-gray-50">
                      <tr className="text-[10px] font-bold uppercase text-gray-600">
                        <th className="p-4 text-left border-b border-gray-200">Academic Program (Course Code)</th>
                        <th className="p-4 text-center border-b border-gray-200 w-24">Enrolled</th>
                        <th className="p-4 text-center border-b border-gray-200 w-24 text-emerald-700">Complete</th>
                        <th className="p-4 text-right border-b border-gray-200 w-32">Avg. Progress</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {byCourse.map(c => (
                        <tr key={c.courseCode} className="text-xs">
                          <td className="p-4 font-bold text-gray-900">{c.courseCode}</td>
                          <td className="p-4 text-center">{c.total}</td>
                          <td className="p-4 text-center font-bold text-emerald-600">{c.digitized}</td>
                          <td className="p-4 text-right">
                            <div className="flex flex-col items-end gap-1">
                              <span className="font-mono font-bold text-pup-maroon">{c.percent}%</span>
                              <div className="w-24 h-1 bg-gray-100 rounded-full overflow-hidden no-print">
                                <div className="h-full bg-pup-maroon" style={{ width: `${c.percent}%` }}></div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <h3 className="text-base font-black text-gray-900 uppercase tracking-wider border-b border-gray-200 pb-2 mt-12">IV. Certification Statement</h3>
                <p>
                  We hereby certify that the data presented in this report is an accurate representation of the digital archives maintained by the Polytechnic University of the Philippines.
                  The metrics have been generated through the PUP Records Management System (RMS) audit engine, reflecting real-time synchronization with the physical student folders.
                </p>
              </div>

              <div className="mt-auto pt-12 flex justify-between border-t border-gray-100">
                <div className="text-left">
                  <p className="text-[9px] font-bold text-gray-400 uppercase mb-10">Prepared By</p>
                  <div className="w-48 border-b border-gray-900 mb-1"></div>
                  <p className="text-[10px] font-bold text-gray-900 uppercase">Administrative Officer</p>
                </div>
                <div className="text-right">
                  <div className="w-48 border-b border-gray-900 mb-1 ml-auto"></div>
                  <p className="text-[10px] font-bold text-gray-900 uppercase">Accreditation Panel Chair</p>
                </div>
              </div>
              <div className="mt-8 text-center text-[10px] text-gray-400">
                End of Report • Page 2 of 2
              </div>
            </div>
          </div>

          <div className="p-4 border-t border-gray-100 bg-white flex justify-end gap-3 shrink-0">
            <Button
              variant="outline"
              onClick={() => setReportOpen(false)}
              className="h-11 px-6 text-sm font-bold text-gray-600 border-gray-300 hover:bg-gray-50"
            >
              CLOSE PREVIEW
            </Button>
            <Button
              onClick={handlePrint}
              className="h-11 px-8 bg-pup-maroon text-white font-bold shadow-sm hover:bg-red-900 flex items-center gap-2"
            >
              <i className="ph-bold ph-printer text-lg"></i> FINALIZE AND PRINT REPORT
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
