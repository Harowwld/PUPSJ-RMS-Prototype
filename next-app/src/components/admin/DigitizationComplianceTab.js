"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Toggle } from "@/components/ui/toggle";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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

export default function DigitizationComplianceTab({
  showToast,
  onLogAction,
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [statusFilter, setStatusFilter] = useState(searchParams.get("status") || "Active");
  const [courseFilter, setCourseFilter] = useState(searchParams.get("course") || "");
  const [requireApproved, setRequireApproved] = useState(searchParams.get("approved") === "1");

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
  const [tableSearch, setTableSearch] = useState("");

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
        <i className="ph-bold ph-caret-up-down ml-1 text-gray-300 transition-opacity group-hover:opacity-100 opacity-0 lg:opacity-100"></i>
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
    // Sync filters with URL
    const params = new URLSearchParams(searchParams);
    params.set("status", statusFilter);
    if (courseFilter) params.set("course", courseFilter); else params.delete("course");
    if (requireApproved) params.set("approved", "1"); else params.delete("approved");

    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState(null, "", newUrl);

    const delay = firstLoadRef.current ? 0 : 350;
    firstLoadRef.current = false;
    const id = setTimeout(() => {
      load();
    }, delay);
    return () => clearTimeout(id);
  }, [statusFilter, courseFilter, requireApproved, load, searchParams]);

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

    if (byCourse.length > 0) {
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
  }, [summary, meta, byCourse, onLogAction, statusFilter, courseFilter]);

  return (
    <div className="flex flex-col w-full h-full gap-4 animate-in fade-in slide-in-from-bottom-2 duration-500 font-inter min-h-0">
      <Card className="flex-1 bg-white rounded-brand border border-gray-200 shadow-sm overflow-hidden flex flex-col min-h-0">
        <PageHeader
          icon="ph-chart-pie"
          title="Digitization Compliance Analytics"
          description="Monitoring of physical record digitization and archival completeness across programs."
          actions={
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="default"
                size="sm"
                onClick={handlePreview}
                disabled={loading || !data}
                className="h-10 px-6 font-bold text-xs tracking-wide bg-pup-maroon text-white border border-pup-maroon shadow-sm hover:bg-red-900 active:scale-95 disabled:opacity-60 rounded-brand transition-all uppercase"
              >
                <i className="ph-bold ph-file-pdf text-sm mr-2" aria-hidden />
                Generate Report
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={downloadCsv}
                disabled={loading || !data}
                className="h-10 px-4 font-bold text-xs tracking-wide border-gray-300 shadow-sm hover:border-pup-maroon hover:bg-red-50/30 active:scale-95 rounded-brand transition-all uppercase"
              >
                <i className="ph-bold ph-file-csv text-sm mr-2 text-pup-maroon" aria-hidden />
                Export CSV
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
                      className="h-10 w-10 p-0 text-gray-600 bg-white border border-gray-300 shadow-sm transition-all hover:border-pup-maroon hover:bg-red-50/30 hover:text-pup-maroon active:scale-90 rounded-brand"
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
                    <p className="font-bold text-xs">Refresh Compliance Data</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          }
        />

        <div className="p-4 bg-gray-50/50 flex-none border-b border-gray-200">
          <div className="flex flex-col lg:flex-row lg:items-end gap-4 justify-between">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 flex-1">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest">
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
                  className="h-10 w-full rounded-brand border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-pup-maroon/20 focus:border-pup-maroon hover:border-gray-400"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="Active">Active</option>
                  <option value="All">All</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 mb-1 uppercase tracking-widest">
                  Course Filter
                </label>
                <div className="relative">
                  <select
                    className="h-10 w-full rounded-brand border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-pup-maroon/20 focus:border-pup-maroon hover:border-gray-400 disabled:opacity-60"
                    value={courseFilter}
                    onChange={(e) => setCourseFilter(e.target.value)}
                    disabled={coursesLoading}
                  >
                    <option value="">All</option>
                    {courses.map((c) => (
                      <option key={c.code || c.id} value={String(c.code || "")}>
                        {c.code}
                        {c.name ? ` — ${c.name}` : ""}
                      </option>
                    ))}
                  </select>
                  {coursesLoading && (
                    <div className="absolute right-8 top-1/2 -translate-y-1/2">
                      <i className="ph-bold ph-spinner animate-spin text-gray-400" />
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-end">
                <Toggle
                  variant="outline"
                  pressed={requireApproved}
                  onPressedChange={setRequireApproved}
                  className={cn(
                    "h-10 px-4 gap-2 rounded-brand border border-gray-300 font-bold text-[10px] uppercase tracking-wider transition-all select-none w-full sm:w-auto",
                    "hover:bg-gray-50 hover:text-gray-700 hover:border-gray-400",
                    "data-[state=on]:bg-pup-maroon data-[state=on]:text-white data-[state=on]:border-pup-maroon data-[state=on]:shadow-md"
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
          </div>
        </div>

        <CardContent className="flex-1 flex flex-col min-h-0 p-6 overflow-auto bg-white">
          {loading && !data ? (
            <div className="space-y-8 animate-pulse">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-28 rounded-xl bg-gray-100" />
                ))}
              </div>
              <div className="space-y-4">
                <div className="flex justify-between">
                   <Skeleton className="h-3 w-40 rounded-full bg-gray-100" />
                   <Skeleton className="h-4 w-12 rounded-full bg-gray-100" />
                </div>
                <Skeleton className="h-4 w-full rounded-full bg-gray-100" />
              </div>
              <div className="border border-gray-100 rounded-xl overflow-hidden">
                <Skeleton className="h-10 w-full bg-gray-50" />
                <div className="p-4 space-y-4">
                  {[1, 2, 3, 4, 5].map(i => (
                    <Skeleton key={i} className="h-8 w-full bg-gray-50/50" />
                  ))}
                </div>
              </div>
            </div>
          ) : error ? (
            <div className="h-[400px] flex flex-col items-center justify-center text-center p-8 border-2 border-dashed border-gray-100 rounded-3xl bg-gray-50/30">
              <div className="w-20 h-20 rounded-full bg-white border border-gray-200 flex items-center justify-center mb-6 shadow-md animate-bounce">
                <i className="ph-duotone ph-warning-circle text-4xl text-pup-maroon" />
              </div>
              <h3 className="text-xl font-black text-gray-900 tracking-tight">Data Unavailable</h3>
              <p className="text-sm font-medium text-gray-500 mt-2 max-w-sm">{error}</p>
              <Button
                variant="outline"
                size="lg"
                className="mt-8 h-12 px-8 font-bold border-gray-300 shadow-sm hover:border-pup-maroon hover:bg-red-50/30 rounded-brand transition-all active:scale-95"
                onClick={load}
              >
                Retry Connection
              </Button>
            </div>
          ) : data ? (
            <div className={cn("transition-all duration-500", loading ? "opacity-40 blur-[1px]" : "opacity-100")}>
              {/* Stats Cards - Aligned with SLA Tab Style */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">

                {/* Total Students — Light Card */}
                <div className="group relative overflow-hidden rounded-xl border border-[#7a1e28]/15 bg-[#fdf6f6] p-5 shadow-sm transition-all">
                  <i className="ph-duotone ph-users-three pointer-events-none absolute -right-3 -bottom-3 rotate-12 text-[60px] text-[#7a1e28] opacity-10" />
                  <div className="relative z-10">
                    <div className="mb-1 flex items-center gap-1.5 text-[10px] font-bold tracking-widest text-[#9e5a62] uppercase">
                      <i className="ph-bold ph-users-three" /> Total Students
                    </div>
                    <div className="text-3xl font-black text-[#7a1e28]">
                      {summary?.totalStudents?.toLocaleString?.() ?? summary?.totalStudents}
                    </div>
                    <div className="mt-1 text-[10px] font-medium text-[#b07078]">
                      Enrolled Students
                    </div>
                  </div>
                </div>

                {/* Fully Digitized — Light Card */}
                <div className="group relative overflow-hidden rounded-xl border border-[#7a1e28]/15 bg-[#fdf6f6] p-5 shadow-sm transition-all">
                  <i className="ph-duotone ph-check-square-offset pointer-events-none absolute -right-3 -bottom-3 rotate-12 text-[60px] text-[#7a1e28] opacity-10" />
                  <div className="relative z-10">
                    <div className="mb-1 flex items-center gap-1.5 text-[10px] font-bold tracking-widest text-[#9e5a62] uppercase">
                      <i className="ph-bold ph-check-square-offset" /> Fully Digitized
                    </div>
                    <div className="text-3xl font-black text-[#7a1e28]">
                      {summary?.digitizedStudents?.toLocaleString?.() ?? summary?.digitizedStudents}
                    </div>
                    <div className="mt-1 text-[10px] font-bold text-emerald-600 flex items-center gap-1.5">
                      <i className="ph-bold ph-trend-up" /> 100% Complete
                    </div>
                  </div>
                </div>

                {/* Avg. Completeness — Accent Card */}
                <div className="group relative overflow-hidden rounded-xl border border-[#5c1520] bg-[#7a1e28] p-5 shadow-sm transition-all">
                  <i className="ph-duotone ph-chart-pie pointer-events-none absolute -right-3 -bottom-3 rotate-12 text-[60px] text-white opacity-20" />
                  <div className="relative z-10">
                    <div className="mb-1 flex items-center gap-1.5 text-[10px] font-bold tracking-widest text-[#f7c9ce] uppercase">
                      <i className="ph-bold ph-chart-pie" /> Avg. Completeness
                    </div>
                    <div className="text-3xl font-black text-white">
                      {summary?.percentDigitized != null ? `${summary.percentDigitized}%` : "0%"}
                    </div>
                    <div className="mt-1 text-[10px] font-medium text-[#f7c9ce]/80">
                      Overall record health index
                    </div>
                    <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-black/20">
                      <div
                        className="h-full bg-emerald-400"
                        style={{ width: `${progressWidth}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Archive Health — Light Card with SLA-style Tooltip */}
                <div className="group relative overflow-hidden rounded-xl border border-[#7a1e28]/15 bg-[#fdf6f6] p-5 shadow-sm transition-all">
                  <i className="ph-duotone ph-shield-check pointer-events-none absolute -right-3 -bottom-3 rotate-12 text-[60px] text-[#7a1e28] opacity-10" />
                  <div className="relative z-10">
                    <div className="mb-1 flex items-center gap-2 text-[10px] font-bold tracking-widest text-[#9e5a62] uppercase">
                      <i className="ph-bold ph-shield-check" /> Archive Health
                      <TooltipProvider>
                        <Tooltip delayDuration={300}>
                          <TooltipTrigger asChild>
                            <i className="ph-bold ph-info text-sm text-[#7a1e28] transition-opacity hover:opacity-70 cursor-pointer" />
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-[240px] border-[#7a1e28]/20 bg-[#7a1e28] p-3 text-white">
                            <p className="font-bold leading-tight text-xs mb-1">Health Thresholds:</p>
                            <ul className="space-y-1 text-[10px] font-medium opacity-90">
                              <li className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-emerald-500" /> 95%+ Excellent</li>
                              <li className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-blue-500" /> 80%+ Healthy</li>
                              <li className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-amber-500" /> Below 80% Warning</li>
                            </ul>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <div className="mt-1">
                      {summary?.percentDigitized >= 95 ? (
                        <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 font-black text-[10px] uppercase tracking-wider px-2 py-1">
                          Excellent
                        </Badge>
                      ) : summary?.percentDigitized >= 80 ? (
                        <Badge className="bg-blue-50 text-blue-700 border-blue-200 font-black text-[10px] uppercase tracking-wider px-2 py-1">
                          Healthy
                        </Badge>
                      ) : (
                        <Badge className="bg-amber-50 text-amber-700 border-amber-200 font-black text-[10px] uppercase tracking-wider px-2 py-1">
                          Action Needed
                        </Badge>
                      )}
                    </div>
                    <div className="mt-2 text-[10px] font-medium text-[#b07078]">
                      Compliance rating
                    </div>
                  </div>
                </div>
              </div>

              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">
                  Overall System Completeness
                </span>
                <span className="text-sm font-black text-gray-900 bg-gray-50 px-2 py-0.5 rounded-md border border-gray-100 shadow-sm">
                  {summary?.percentDigitized != null ? `${summary.percentDigitized}%` : "N/A"}
                </span>
              </div>
              <div className="h-4 w-full rounded-full bg-gray-100 border border-gray-200 overflow-hidden mb-8 shadow-inner">
                <div
                  className={cn(
                    "h-full shadow-sm transition-all duration-1000 ease-out",
                    summary?.percentDigitized >= 95 ? "bg-emerald-500" : summary?.percentDigitized >= 80 ? "bg-pup-maroon" : "bg-amber-500"
                  )}
                  style={{ width: `${progressWidth}%` }}
                />
              </div>

              <div className="flex flex-wrap gap-8 mb-8 bg-gray-50/50 p-6 rounded-2xl border border-gray-100 shadow-inner">
                <div>
                  <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Digitized Files</div>
                  <div className="text-xl font-black text-gray-900 tracking-tight">{summary?.totalDigitizedDocsCount?.toLocaleString() || 0}</div>
                </div>
                <div>
                  <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Required Files</div>
                  <div className="text-xl font-black text-gray-900 tracking-tight">{summary?.totalExpectedDocsCount?.toLocaleString() || 0}</div>
                </div>
                <div>
                  <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Full Record Rate</div>
                  <div className="text-xl font-black text-emerald-600 tracking-tight">{summary?.fullyDigitizedRate != null ? `${summary.fullyDigitizedRate}%` : "0%"}</div>
                </div>
                <div className="sm:ml-auto">
                  <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5 italic">Report Formula</div>
                  <div className="text-[11px] font-medium text-gray-500 max-w-xs leading-relaxed">
                    {meta?.definitions?.expectedCountFormula}
                  </div>
                </div>
              </div>

              <div className="flex-1 min-h-0 flex flex-col border border-gray-200 rounded-2xl overflow-hidden bg-white shadow-sm mt-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-6 py-4 bg-gray-50/50 border-b border-gray-200">
                  <div className="flex items-center gap-3">
                    <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">
                      Breakdown By Academic Program
                    </h4>
                    {courseFilter && (
                      <Badge variant="outline" className="bg-white border-pup-maroon/20 text-pup-maroon font-bold text-[9px] h-5 px-1.5">
                        Filtered: {courseFilter}
                      </Badge>
                    )}
                  </div>
                  <div className="relative w-full sm:w-64">
                    <i className="ph-bold ph-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs" />
                    <input
                      type="text"
                      placeholder="Search program code..."
                      className="w-full pl-9 pr-3 py-2 text-xs font-bold rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-pup-maroon/20 focus:border-pup-maroon transition-all shadow-sm placeholder:text-gray-400 placeholder:font-normal"
                      value={tableSearch}
                      onChange={(e) => setTableSearch(e.target.value)}
                    />
                  </div>
                </div>

                <div className="overflow-auto flex-1">
                  {sortedByCourse.length > 0 ? (
                    <Table>
                      <TableHeader className="bg-gray-50/30 sticky top-0 z-10 backdrop-blur-md">
                        <TableRow className="hover:bg-transparent border-b-2">
                          <TableHead className="py-4 px-6">
                            <button
                              onClick={() => handleSort("courseCode")}
                              className="group flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-gray-600 hover:text-pup-maroon transition-colors"
                            >
                              Program <SortIndicator column="courseCode" />
                            </button>
                          </TableHead>
                          <TableHead className="py-4 px-6 text-center">
                            <button
                              onClick={() => handleSort("total")}
                              className="group mx-auto flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-gray-600 hover:text-pup-maroon transition-colors"
                            >
                              Students <SortIndicator column="total" />
                            </button>
                          </TableHead>
                          <TableHead className="py-4 px-6 text-center">
                            <button
                              onClick={() => handleSort("digitized")}
                              className="group mx-auto flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-emerald-700 hover:text-emerald-800 transition-colors"
                            >
                              Complete <SortIndicator column="digitized" />
                            </button>
                          </TableHead>
                          <TableHead className="py-4 px-6 text-right">
                            <button
                              onClick={() => handleSort("percent")}
                              className="group ml-auto flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-pup-maroon hover:text-red-800 transition-colors"
                            >
                              Completeness <SortIndicator column="percent" />
                            </button>
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sortedByCourse
                          .filter(r => !tableSearch || r.courseCode?.toLowerCase().includes(tableSearch.toLowerCase()))
                          .map((row) => (
                            <TableRow key={row.courseCode} className="group hover:bg-red-50/20 transition-all border-b border-gray-100 last:border-0">
                              <TableCell className="py-4 px-6 font-mono font-bold text-gray-900 text-xs">
                                {row.courseCode || "—"}
                              </TableCell>
                              <TableCell className="py-4 px-6 text-gray-600 font-medium text-center">
                                {row.total?.toLocaleString?.() ?? row.total}
                              </TableCell>
                              <TableCell className="py-4 px-6 text-center">
                                <span className="text-emerald-600 font-black">
                                  {row.digitized?.toLocaleString?.() ?? row.digitized}
                                </span>
                                <span className="text-[10px] text-gray-400 font-bold ml-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                  ({row.fullyDigitizedRate}%)
                                </span>
                              </TableCell>
                              <TableCell className="py-4 px-6 text-right">
                                <div className="flex items-center justify-end gap-4">
                                  <span className="text-gray-900 font-black text-xs">
                                    {row.percent != null ? `${row.percent}%` : "0%"}
                                  </span>
                                  <div className="w-20 h-1.5 rounded-full bg-gray-100 overflow-hidden border border-gray-200 hidden sm:block shadow-inner">
                                    <div
                                      className={cn(
                                        "h-full transition-all duration-700",
                                        row.percent >= 90 ? "bg-emerald-500" : "bg-pup-maroon"
                                      )}
                                      style={{ width: `${Math.min(100, row.percent || 0)}%` }}
                                    />
                                  </div>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        {sortedByCourse.filter(r => !tableSearch || r.courseCode?.toLowerCase().includes(tableSearch.toLowerCase())).length === 0 && (
                           <TableRow>
                             <TableCell colSpan={4} className="py-20 text-center">
                                <div className="flex flex-col items-center justify-center opacity-40">
                                   <i className="ph-duotone ph-magnifying-glass text-5xl mb-4" />
                                   <p className="text-sm font-bold text-gray-500 italic">No academic programs matching "{tableSearch}"</p>
                                </div>
                             </TableCell>
                           </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  ) : (
                    <Empty className="h-[300px] flex flex-col items-center justify-center text-center p-12">
                      <EmptyHeader className="flex flex-col items-center gap-0">
                        <EmptyMedia className="w-20 h-20 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center mb-6">
                          <i className="ph-duotone ph-magnifying-glass text-4xl text-gray-300" />
                        </EmptyMedia>
                        <EmptyTitle className="text-lg font-black text-gray-900">No program data</EmptyTitle>
                        <EmptyDescription className="text-sm font-medium text-gray-500 mt-2 max-w-sm">
                          {courseFilter
                            ? `No records found matching the course code "${courseFilter}".`
                            : "No student records available to analyze for compliance metrics."}
                        </EmptyDescription>
                      </EmptyHeader>
                    </Empty>
                  )}
                </div>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* Report Preview Modal - Reverted to Standard Consistent Style */}
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
          <DialogHeader className="shrink-0 border-b border-gray-100 bg-gray-50/50 p-6">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-white text-pup-maroon shadow-sm">
                  <i className="ph-duotone ph-file-text text-2xl"></i>
                </div>
                <div className="min-w-0">
                  <DialogTitle className="text-left text-xl leading-none font-black tracking-tight text-gray-900">
                    Formal Compliance Report
                  </DialogTitle>
                  <p className="mt-1.5 text-left text-sm font-medium text-gray-500">
                    Filter: {statusFilter} | {courseFilter || "All"} {requireApproved && " | Approved Only"}
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

          <div className="flex shrink-0 justify-end gap-3 border-t border-gray-100 bg-white p-4">
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
              className="flex h-11 items-center gap-2 bg-pup-maroon px-8 font-bold text-white shadow-sm hover:bg-red-900 rounded-brand transition-colors"
            >
              <i className="ph-bold ph-printer text-lg"></i> FINALIZE AND PRINT REPORT
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
