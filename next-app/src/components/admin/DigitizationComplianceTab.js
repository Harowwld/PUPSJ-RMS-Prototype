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
import { generateDigitizationCompliancePdf } from "@/lib/pdfGenerator";
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
import PageHeader from "@/components/shared/PageHeader";
import { STATUS_COLORS } from "@/lib/constants";

export default function DigitizationComplianceTab({
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
  const [pdfBlobUrl, setPdfPreviewUrl] = useState(null);
  const [previewFrameReady, setPreviewFrameReady] = useState(false);
  const [isFullscreenPreview, setIsFullscreenPreview] = useState(false);

  const [sortBy, setSortBy] = useState("courseCode");
  const [sortOrder, setSortOrder] = useState("asc");

  const handleSort = (column) => {
    if (sortBy === column) {
      if (sortOrder === "asc") {
        setSortOrder("desc");
      } else {
        setSortBy("courseCode");
        setSortOrder("asc");
      }
    } else {
      setSortBy(column);
      setSortOrder("asc");
    }
  };

  const SortIndicator = ({ column }) => {
    if (sortBy !== column)
      return (
        <i className="ph-bold ph-caret-up-down ml-1 opacity-0 transition-opacity group-hover:opacity-50"></i>
      );
    return sortOrder === "asc" ? (
      <i className="ph-bold ph-caret-up ml-1 text-pup-maroon"></i>
    ) : (
      <i className="ph-bold ph-caret-down ml-1 text-pup-maroon"></i>
    );
  };

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
        { title: "Compliance Data Load Failed", description: e?.message || "The system was unable to retrieve digitization compliance statistics." },
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
  const sortedByCourse = useMemo(() => {
    return [...byCourse].sort((a, b) => {
      let valA = a[sortBy];
      let valB = b[sortBy];

      if (typeof valA === "string") {
        valA = valA.toLowerCase();
        valB = (valB || "").toLowerCase();
      }

      if (valA < valB) return sortOrder === "asc" ? -1 : 1;
      if (valA > valB) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });
  }, [byCourse, sortBy, sortOrder]);

  const showByCourse = useMemo(
    () => sortedByCourse.length > 0 && !String(courseFilter || "").trim(),
    [sortedByCourse, courseFilter]
  );

  const progressWidth = useMemo(() => {
    const p = summary?.percentDigitized;
    if (p === null || p === undefined) return 0;
    return Math.min(100, Math.max(0, p));
  }, [summary]);

  const handlePreview = async () => {
    if (!data || loading) return;
    
    // Open the modal immediately to show the "Generating..." spinner
    setReportOpen(true);
    
    try {
      const blob = await generateDigitizationCompliancePdf(data, summary, meta, byCourse);
      const url = URL.createObjectURL(blob);
      setPdfPreviewUrl(url);
    } catch (e) {
      console.error("PDF Preview generation failed:", e);
      showToast?.({ title: "Preview Failed", description: "Failed to generate compliance report preview." }, true);
      setReportOpen(false);
    }
  }

  const handlePrint = async () => {
    if (!pdfBlobUrl) {
      try {
        const blob = await generateDigitizationCompliancePdf(data, summary, meta, byCourse);
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `pup-rks-compliance-report-${new Date().toISOString().split("T")[0]}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } catch (e) {
        console.error("PDF Generation failed:", e);
        showToast?.({ title: "Report Generation Failed", description: "An error occurred while generating the PDF report." }, true);
        return;
      }
    } else {
      const link = document.createElement("a");
      link.href = pdfBlobUrl;
      link.download = `pup-rks-compliance-report-${new Date().toISOString().split("T")[0]}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }

    onLogAction?.({
      action: "Generate Report",
      details: `generated formal physical record compliance report (Status: ${statusFilter}, Course: ${courseFilter || 'All'}) for university accreditation files`,
      entityType: "Report"
    });

    showToast?.({ title: "Report Downloaded", description: "The Compliance report has been successfully downloaded." });
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
    const now = new Date();
    const dateStr = now.toISOString().split("T")[0];
    const timeStr = now.toTimeString().split(" ")[0].replace(/:/g, "");
    const fileName = `PUP-RKS-COMPLIANCE-DATA-${dateStr}-${timeStr}.csv`;

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    onLogAction?.({
      action: "Export CSV",
      details: `exported digitization compliance dataset (${fileName}) to local CSV storage volume`,
      entityType: "Report"
    });
  }, [summary, meta, byCourse, showByCourse, onLogAction, statusFilter, courseFilter]);


  return (
    <div className="flex flex-col w-full h-full gap-4 animate-fade-in font-inter min-h-0">
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
                onClick={handlePreview}
                disabled={loading || !data}
                className="h-10 px-6 font-bold text-sm bg-pup-maroon text-white border border-pup-maroon shadow-sm hover:bg-red-900 disabled:opacity-60 rounded-brand transition-colors"
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
                className="h-10 px-4 font-bold border-gray-300 shadow-sm hover:border-pup-maroon hover:bg-red-50/30 rounded-brand transition-colors"
              >
                <i className="ph-bold ph-download-simple text-sm mr-1.5 text-pup-maroon" aria-hidden />
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
                      className="h-10 w-10 p-0 text-gray-600 bg-white border border-gray-300 shadow-sm transition-colors hover:border-pup-maroon hover:bg-red-50/30 hover:text-pup-maroon active:scale-95 rounded-brand"
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
              <Button variant="outline" size="sm" className="mt-6 h-10 px-4 font-bold border-gray-300 shadow-sm hover:border-pup-maroon hover:bg-red-50/30 rounded-brand transition-colors" onClick={load}>Try Again</Button>
            </div>
          ) : !data ? (
            <div className="h-full flex items-center justify-center">
              <Skeleton className="h-64 w-full rounded-brand" />
            </div>
          ) : data ? (
            <div className={cn("transition-opacity duration-300", loading && "opacity-40")}>
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
                  <div className="text-[11px] text-[#f7c9ce]/80 mt-2">
                    Enrolled in the system
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
                  <div className="text-[11px] text-[#b07078] mt-2">
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
                  <div className="text-[11px] text-[#b07078] mt-2">
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
                  <div className="text-[11px] text-[#b07078] mt-2">
                    Compliance status
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
                          <th className="p-4 font-bold">
                            <button
                              onClick={() => handleSort("courseCode")}
                              className="group flex items-center rounded px-1 py-0.5 uppercase transition-colors hover:bg-gray-100 focus:outline-none"
                            >
                              Course Code <SortIndicator column="courseCode" />
                            </button>
                          </th>
                          <th className="p-4 font-bold text-center">
                            <div className="flex justify-center">
                              <button
                                onClick={() => handleSort("total")}
                                className="group flex items-center rounded px-1 py-0.5 uppercase transition-colors hover:bg-gray-100 focus:outline-none"
                              >
                                Total Students <SortIndicator column="total" />
                              </button>
                            </div>
                          </th>
                          <th className="p-4 font-bold text-emerald-600 text-center">
                            <div className="flex justify-center">
                              <button
                                onClick={() => handleSort("digitized")}
                                className="group flex items-center rounded px-1 py-0.5 uppercase transition-colors hover:bg-gray-100 focus:outline-none"
                              >
                                Fully Digitized <SortIndicator column="digitized" />
                              </button>
                            </div>
                          </th>
                          <th className="p-4 font-bold text-pup-maroon text-right w-44">
                            <div className="flex justify-end">
                              <button
                                onClick={() => handleSort("percent")}
                                className="group flex items-center rounded px-1 py-0.5 uppercase transition-colors hover:bg-gray-100 focus:outline-none"
                              >
                                Avg. Completeness <SortIndicator column="percent" />
                              </button>
                            </div>
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {sortedByCourse.map((row) => (
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
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* Report Preview Modal */}
      <Dialog
        open={reportOpen}
        onOpenChange={(open) => {
          if (!open) {
            if (pdfBlobUrl) URL.revokeObjectURL(pdfBlobUrl)
            setPdfPreviewUrl(null)
            setPreviewFrameReady(false)
            setIsFullscreenPreview(false)
          }
          setReportOpen(open)
        }}
      >
        <DialogContent 
          hideClose={isFullscreenPreview}
          className={cn(
            "flex flex-col overflow-hidden border border-gray-200 bg-gray-100 p-0 shadow-2xl transition-all duration-300 ease-out",
            isFullscreenPreview 
                ? "fixed h-screen w-screen max-w-none sm:max-w-none m-0 rounded-none z-[100] left-1/2 top-1/2 translate-x-[-50%] translate-y-[-50%] sm:w-screen sm:h-screen" 
                : "h-[90vh] w-[96vw] max-w-[96vw] xl:max-w-[1200px] rounded-brand"
        )}>
          <DialogHeader className="bg-gray-50/50 border-b border-gray-100 p-6 shrink-0">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-pup-maroon shadow-sm shrink-0">
                  <i className="ph-duotone ph-file-text text-2xl"></i>
                </div>
                <div className="min-w-0">
                  <DialogTitle className="text-xl font-black text-gray-900 tracking-tight leading-none text-left">
                    Formal Compliance Report
                  </DialogTitle>
                  <p className="text-sm font-medium text-gray-500 mt-1.5 text-left">
                    Filter: {statusFilter} | {courseFilter || "All Courses"} {requireApproved && " | Approved Only"}
                  </p>
                </div>
              </div>

              <div className={cn("flex items-center gap-2", !isFullscreenPreview && "mr-8")}>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsFullscreenPreview(!isFullscreenPreview)}
                    className="h-10 gap-2 rounded-brand border-gray-300 bg-white font-bold text-gray-700 hover:bg-gray-50 active:scale-95 shadow-sm"
                >
                    <i className={cn("ph-bold", isFullscreenPreview ? "ph-corners-in" : "ph-corners-out")} />
                    {isFullscreenPreview ? "EXIT FULL SCREEN" : "FULL SCREEN"}
                </Button>
              </div>
            </div>
          </DialogHeader>

          <div className="relative flex-1 overflow-hidden bg-gray-100">
            {pdfBlobUrl ? (
              <div className="relative h-full w-full">
                {!previewFrameReady && (
                  <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white p-10">
                    <div className="w-full max-w-2xl space-y-4">
                      <Skeleton className="h-8 w-64" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-[60vh] w-full" />
                    </div>
                  </div>
                )}
                <iframe
                  src={`${pdfBlobUrl}#toolbar=0&navpanes=0`}
                  className="h-full w-full border-none"
                  onLoad={() => setPreviewFrameReady(true)}
                  title="Compliance Report Preview"
                />
              </div>
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center bg-white p-10">
                <div className="flex flex-col items-center gap-4">
                  <i className="ph-bold ph-spinner animate-spin text-4xl text-pup-maroon" />
                  <p className="text-sm font-bold text-gray-500 uppercase tracking-widest">
                    Generating Report Preview...
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="p-4 border-t border-gray-100 bg-white flex justify-end gap-3 shrink-0">
            <Button
              variant="outline"
              onClick={() => setReportOpen(false)}
              className="h-11 px-6 font-bold border-gray-300 shadow-sm hover:border-pup-maroon hover:bg-red-50/30 rounded-brand transition-colors"
            >
              CLOSE PREVIEW
            </Button>
            <Button
              onClick={handlePrint}
              disabled={!pdfBlobUrl}
              className="h-11 px-8 bg-pup-maroon text-white font-bold shadow-sm hover:bg-red-900 flex items-center gap-2 rounded-brand transition-colors"
            >
              <i className="ph-bold ph-printer text-lg"></i> FINALIZE AND PRINT REPORT
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
