"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Toggle } from "@/components/ui/toggle";
import { Input } from "@/components/ui/input";
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
import { generateExportFilename } from "@/lib/exportHelpers";
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
import { Select } from "@/components/ui/select"

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
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isExportingCsv, setIsExportingCsv] = useState(false);

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
        <i className="ph-bold ph-caret-up-down ml-1 opacity-30 transition-opacity group-hover:opacity-100"></i>
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
    const params = new URLSearchParams(window.location.search);
    
    // Always enforce the correct view
    const oldStatus = params.get("status") || "Active";
    const oldCourse = params.get("course") || "";
    const oldApproved = params.get("approved") || "0";
    const currentView = params.get("view");

    // Only update if something actually changed
    const hasChanged = 
        oldStatus !== statusFilter || 
        oldCourse !== courseFilter || 
        (oldApproved === "1") !== requireApproved ||
        currentView !== "digitization";

    if (hasChanged) {
        params.set("view", "digitization");
        params.set("status", statusFilter);
        if (courseFilter) params.set("course", courseFilter); else params.delete("course");
        if (requireApproved) params.set("approved", "1"); else params.delete("approved");
        
        const newUrl = `${window.location.pathname}?${params.toString()}`;
        router.replace(newUrl, { scroll: false });
    }

    const delay = firstLoadRef.current ? 0 : 350;
    firstLoadRef.current = false;
    const id = setTimeout(() => {
      load();
    }, delay);
    return () => clearTimeout(id);
  }, [statusFilter, courseFilter, requireApproved, load, router]);

  const summary = data?.summary;
  const meta = data?.meta;
  const byCourse = useMemo(
    () => (Array.isArray(data?.byCourse) ? data.byCourse : []),
    [data?.byCourse]
  );
  
  const sortedByCourse = useMemo(() => {
    let filtered = [...byCourse];
    if (tableSearch.trim()) {
      const search = tableSearch.toLowerCase();
      filtered = filtered.filter(row => 
        row.courseCode?.toLowerCase().includes(search)
      );
    }
    
    return filtered.sort((a, b) => {
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
  }, [byCourse, sortBy, sortOrder, tableSearch]);

  const progressWidth = useMemo(() => {
    const p = summary?.percentDigitized;
    if (p === null || p === undefined) return 0;
    return Math.min(100, Math.max(0, p));
  }, [summary]);

  const handlePreview = async () => {
    if (!data || loading) return;
    setIsGeneratingPdf(true);
    try {
      const blob = await generateDigitizationCompliancePdf(data, summary, meta, byCourse);
      const url = URL.createObjectURL(blob);
      setPdfPreviewUrl(url);
      setReportOpen(true);
    } catch (e) {
      console.error("PDF Preview generation failed:", e);
      showToast?.({ title: "Preview Failed", description: "Failed to generate compliance report preview." }, true);
    } finally {
      setIsGeneratingPdf(false);
    }
  }

  const handlePrint = async () => {
    const fileName = generateExportFilename("COMPLIANCE", "REPORT", "pdf");
    if (!pdfBlobUrl) {
      setIsGeneratingPdf(true);
      try {
        const blob = await generateDigitizationCompliancePdf(data, summary, meta, byCourse);
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } catch (e) {
        console.error("PDF Generation failed:", e);
        showToast?.({ title: "Report Generation Failed", description: "An error occurred while generating the PDF report." }, true);
        return;
      } finally {
        setIsGeneratingPdf(false);
      }
    } else {
      const link = document.createElement("a");
      link.href = pdfBlobUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }

    onLogAction?.({
      action: "Generate Report",
      details: `generated formal physical record compliance report (${fileName}) for university accreditation records`,
      entityType: "Report"
    });

    showToast?.({ title: "Report Downloaded", description: "The Compliance report has been successfully downloaded." });
  };

  const downloadCsv = useCallback(async () => {
    if (!summary) return;
    setIsExportingCsv(true);

    try {
      await new Promise(resolve => setTimeout(resolve, 600));

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
      const fileName = generateExportFilename("COMPLIANCE", "DATA", "csv");

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

      showToast?.({ title: "Export Success", description: `The compliance dataset has been successfully exported as ${fileName}.` });
    } catch (e) {
       showToast?.({ title: "Export Failed", description: "An error occurred during the data export process." }, true);
    } finally {
      setIsExportingCsv(false);
    }
  }, [summary, meta, byCourse, onLogAction, showToast]);

  const handleClearAll = useCallback(() => {
    setStatusFilter("Active");
    setCourseFilter("");
    setRequireApproved(false);
    setTableSearch("");
  }, []);

  const hasActiveFilters = statusFilter !== "Active" || courseFilter !== "" || requireApproved || tableSearch !== "";

  return (
    <div className="flex flex-col w-full h-full gap-4 animate-fade-in font-inter min-h-0">
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
                disabled={loading || !data || isGeneratingPdf}
                className="h-10 px-6 font-black text-[10px] tracking-widest bg-linear-to-b from-red-800 to-pup-maroon border-4 border-pup-darkMaroon hover:from-red-700 hover:to-red-900 hover:shadow-md text-white shadow-lg shadow-red-900/20 active:scale-95 disabled:opacity-60 rounded-brand uppercase transition-all"
              >
                <i className={cn("ph-bold text-base mr-2", isGeneratingPdf ? "ph-spinner animate-spin" : "ph-file-pdf")} aria-hidden />
                {isGeneratingPdf ? "Generating..." : "Generate Report"}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={downloadCsv}
                disabled={loading || !data || isExportingCsv}
                className="h-10 px-4 font-bold text-xs tracking-wide border-gray-300 shadow-sm hover:border-gray-300 hover:bg-red-50/30 active:scale-95 rounded-brand transition-all uppercase"
              >
                <i className={cn("ph-bold text-sm mr-2 text-pup-maroon", isExportingCsv ? "ph-spinner animate-spin" : "ph-file-csv")} aria-hidden />
                {isExportingCsv ? "Exporting..." : "Export CSV"}
              </Button>

              <div className="ml-2 flex items-center gap-3 border-l border-gray-200 pl-4">
                  <div className="flex flex-col items-end gap-1">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Dataset Sync</p>
                      <p className="text-[10px] font-medium text-gray-500 whitespace-nowrap">
                          {hasActiveFilters ? "Filtering live analytics..." : "Showing cumulative data"}
                      </p>
                  </div>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={load}
                          disabled={loading}
                          className="h-10 w-10 p-0 text-gray-600 bg-white border border-gray-300 shadow-sm transition-all hover:border-gray-300 hover:bg-red-50/30 hover:text-pup-maroon active:scale-90 rounded-brand"
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
                        <p className="font-bold text-xs">Dataset Sync: Refresh Compliance Data</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
              </div>
            </div>
          }
        />

        {/* Active Filter Chips Row */}
        {hasActiveFilters && (
          <div className="flex-none border-b border-gray-100 bg-white px-4 py-3 animate-in fade-in slide-in-from-top-1 duration-300">
            <div className="flex flex-wrap items-center gap-2">
                <span className="mr-1 text-[10px] font-bold tracking-widest text-gray-400 uppercase">
                Active Filters:
                </span>
                {statusFilter !== "Active" && (
                    <div className="flex items-center gap-1 rounded-full border border-blue-100 bg-blue-50 px-2.5 py-1 text-[10px] font-bold text-blue-600 uppercase">
                    Status: {statusFilter}
                    <button
                        onClick={() => setStatusFilter("Active")}
                        className="ml-1 transition-colors hover:text-blue-800"
                    >
                        <i className="ph-bold ph-x text-[8px]"></i>
                    </button>
                    </div>
                )}
                {courseFilter !== "" && (
                    <div className="flex items-center gap-1 rounded-full border border-amber-100 bg-amber-50 px-2.5 py-1 text-[10px] font-bold text-amber-600 uppercase">
                    Program: {courseFilter}
                    <button
                        onClick={() => setCourseFilter("")}
                        className="ml-1 transition-colors hover:text-amber-800"
                    >
                        <i className="ph-bold ph-x text-[8px]"></i>
                    </button>
                    </div>
                )}
                {requireApproved && (
                    <div className="flex items-center gap-1 rounded-full border border-emerald-100 bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-600 uppercase">
                    Requirement: Approved Only
                    <button
                        onClick={() => setRequireApproved(false)}
                        className="ml-1 transition-colors hover:text-emerald-800"
                    >
                        <i className="ph-bold ph-x text-[8px]"></i>
                    </button>
                    </div>
                )}
                {tableSearch && (
                    <div className="flex items-center gap-1 rounded-full border border-gray-300/20 bg-pup-maroon/10 px-2.5 py-1 text-[10px] font-bold text-pup-maroon uppercase">
                    Search: {tableSearch}
                    <button
                        onClick={() => setTableSearch("")}
                        className="ml-1 transition-colors hover:text-pup-darkMaroon"
                    >
                        <i className="ph-bold ph-x text-[8px]"></i>
                    </button>
                    </div>
                )}
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClearAll}
                    className="h-6 rounded-full border-2 border-dashed border-gray-300/30 px-3 text-[10px] font-black text-pup-maroon transition-colors hover:border-pup-darkMaroon hover:bg-red-50 hover:text-pup-darkMaroon uppercase"
                >
                    CLEAR ALL FILTERS
                </Button>
            </div>
          </div>
        )}

        <div className="p-4 bg-gray-50/50 flex-none border-b border-gray-200">
          <div className="flex flex-col lg:flex-row lg:items-end gap-4 justify-between">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 flex-1">
              <div>
                <label className="block text-[10px] font-bold text-gray-500 mb-1 uppercase tracking-widest">
                    Student Status
                </label>
                <Select
                  className="h-10 w-full rounded-brand border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-pup-maroon/20 focus:border-gray-300 hover:border-gray-400"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="Active">Active</option>
                  <option value="All">All</option>
                  <option value="Inactive">Inactive</option>
                </Select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 mb-1 uppercase tracking-widest">
                  Course
                </label>
                <div className="relative">
                  <Select
                    className="h-10 w-full rounded-brand border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-pup-maroon/20 focus:border-gray-300 hover:border-gray-400 disabled:opacity-60"
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
                  </Select>
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
                    "data-[state=on]:bg-pup-maroon data-[state=on]:text-white data-[state=on]:border-gray-300 data-[state=on]:shadow-md"
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
            <Empty className="flex h-[400px] flex-col items-center justify-center border-0 text-center text-gray-500">
              <EmptyHeader className="flex flex-col items-center gap-0">
                <EmptyMedia className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-gray-200 bg-white shadow-sm">
                  <i className="ph-duotone ph-warning-circle text-3xl text-pup-maroon" />
                </EmptyMedia>
                <EmptyTitle className="text-lg font-bold text-gray-900">Data Unavailable</EmptyTitle>
                <EmptyDescription className="mt-1 max-w-md text-sm font-medium text-gray-600">
                  {error}
                </EmptyDescription>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={load}
                  className="mt-6 flex h-10 items-center gap-2 rounded-brand border border-gray-300 bg-white px-6 text-xs font-bold text-gray-600 shadow-sm transition-colors hover:border-gray-300 hover:bg-red-50/30 hover:text-pup-maroon active:scale-95 uppercase tracking-wide" 
                >
                  <i className="ph-bold ph-arrows-clockwise"></i>
                  Retry Connection
                </Button>
              </EmptyHeader>
            </Empty>
          ) : data ? (
            <div className={cn("transition-all duration-500", loading ? "opacity-40 blur-[1px]" : "opacity-100")}>
              {/* Stats Cards - Avg Completeness first for hierarchy */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">

                {/* Avg. Completeness — Primary Accent Card */}
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
                        className="h-full bg-emerald-400 transition-all duration-1000 ease-out"
                        style={{ width: `${progressWidth}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Total Students — Blue Card */}
                <div className="group relative overflow-hidden rounded-xl border border-blue-200 bg-blue-50/50 p-5 shadow-sm transition-all hover:shadow-md">
                  <i className="ph-duotone ph-users-three pointer-events-none absolute -right-3 -bottom-3 rotate-12 text-[60px] text-blue-600 opacity-10" />
                  <div className="relative z-10">
                    <div className="mb-1 flex items-center gap-1.5 text-[10px] font-bold tracking-widest text-blue-600 uppercase">
                      <i className="ph-bold ph-users-three" /> Total Students
                    </div>
                    <div className="text-3xl font-black text-blue-900">
                      {summary?.totalStudents?.toLocaleString?.() ?? summary?.totalStudents}
                    </div>
                    <div className="mt-1 text-[10px] font-medium text-blue-600/80">
                      Enrolled Students
                    </div>
                  </div>
                </div>

                {/* Fully Digitized — Yellow Card */}
                <div className="group relative overflow-hidden rounded-xl border border-amber-200 bg-amber-50/50 p-5 shadow-sm transition-all hover:shadow-md">
                  <i className="ph-duotone ph-check-square-offset pointer-events-none absolute -right-3 -bottom-3 rotate-12 text-[60px] text-amber-600 opacity-10" />
                  <div className="relative z-10">
                    <div className="mb-1 flex items-center gap-1.5 text-[10px] font-bold tracking-widest text-amber-600 uppercase">
                      <i className="ph-bold ph-check-square-offset" /> Fully Digitized
                    </div>
                    <div className="text-3xl font-black text-amber-900">
                      {summary?.digitizedStudents?.toLocaleString?.() ?? summary?.digitizedStudents}
                    </div>
                    <div className="mt-1 text-[10px] font-bold text-emerald-600 flex items-center gap-1.5">
                      <i className="ph-bold ph-trend-up" /> 100% Complete
                    </div>
                  </div>
                </div>

                {/* Archive Health — Green Card with SLA-style Tooltip */}
                <div className="group relative overflow-hidden rounded-xl border border-emerald-200 bg-emerald-50/50 p-5 shadow-sm transition-all hover:shadow-md">
                  <i className="ph-duotone ph-shield-check pointer-events-none absolute -right-3 -bottom-3 rotate-12 text-[60px] text-emerald-600 opacity-10" />
                  <div className="relative z-10">
                    <div className="mb-1 flex items-center gap-2 text-[10px] font-bold tracking-widest text-emerald-600 uppercase">
                      <i className="ph-bold ph-shield-check" /> Archive Health
                      <TooltipProvider>
                        <Tooltip delayDuration={300}>
                          <TooltipTrigger asChild>
                            <i className="ph-bold ph-info text-sm text-emerald-600 transition-opacity hover:opacity-70 cursor-pointer" />
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-[240px] border-emerald-200 bg-emerald-900 p-3 text-white">
                            <p className="font-bold leading-tight text-xs mb-1">Health Thresholds:</p>
                            <ul className="space-y-1 text-[10px] font-medium opacity-90">
                              <li className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-emerald-400" /> 95%+ Excellent</li>
                              <li className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-blue-400" /> 80%+ Healthy</li>
                              <li className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-amber-400" /> Below 80% Warning</li>
                            </ul>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <div className="mt-1">
                      {summary?.percentDigitized >= 95 ? (
                        <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 font-black text-[10px] uppercase tracking-wider px-2 py-1">
                          Excellent
                        </Badge>
                      ) : summary?.percentDigitized >= 80 ? (
                        <Badge className="bg-blue-100 text-blue-800 border-blue-200 font-black text-[10px] uppercase tracking-wider px-2 py-1">
                          Healthy
                        </Badge>
                      ) : (
                        <Badge className="bg-amber-100 text-amber-800 border-amber-200 font-black text-[10px] uppercase tracking-wider px-2 py-1">
                          Action Needed
                        </Badge>
                      )}
                    </div>
                    <div className="mt-2 text-[10px] font-medium text-emerald-700/80">
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
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 px-6 py-4 bg-gray-50/50 border-b border-gray-200">
                  <div className="flex items-center gap-3">
                    <div>
                        <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-1">
                        Academic Program Breakdown
                        </h4>
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold tracking-widest text-gray-400 uppercase">
                                Total Programs: <span className="text-gray-900 font-bold">{sortedByCourse.length}</span>
                            </span>
                        </div>
                    </div>
                  </div>
                  <div className="min-w-[300px] flex-1 sm:max-w-md">
                    <label className="mb-1 block text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                        Search Program
                    </label>
                    <div className="relative">
                        <i className="ph-bold ph-magnifying-glass absolute top-1/2 left-3 -translate-y-1/2 text-gray-400"></i>
                        <Input
                        type="text"
                        placeholder="Search by program code..."
                        className="h-10 w-full rounded-brand border border-gray-300 bg-white pl-10 text-sm focus-visible:border-gray-300 focus-visible:ring-2 focus-visible:ring-pup-maroon focus-visible:outline-none placeholder:text-gray-400 placeholder:font-normal"
                        value={tableSearch}
                        onChange={(e) => setTableSearch(e.target.value)}
                        />
                    </div>
                  </div>
                </div>

                <div className="overflow-auto flex-1 border border-gray-200 shadow-inner rounded-b-2xl min-h-[450px]">
                  {sortedByCourse.length > 0 ? (
                    <Table className="min-w-full text-sm">
                      <TableHeader className="sticky top-0 z-10 border-b border-gray-200 bg-gray-50">
                        <TableRow className="hover:bg-transparent text-left text-xs tracking-wider text-gray-600 uppercase">
                          <TableHead className="py-4 px-6 font-bold">
                            <button
                              onClick={() => handleSort("courseCode")}
                              className="group flex items-center gap-1.5 rounded px-1 py-0.5 uppercase transition-colors hover:bg-gray-100 focus:outline-none"
                            >
                              Program <SortIndicator column="courseCode" />
                            </button>
                          </TableHead>
                          <TableHead className="py-4 px-6 text-center font-bold">
                            <button
                              onClick={() => handleSort("total")}
                              className="group mx-auto flex items-center gap-1.5 rounded px-1 py-0.5 uppercase transition-colors hover:bg-gray-100 focus:outline-none"
                            >
                              Students <SortIndicator column="total" />
                            </button>
                          </TableHead>
                          <TableHead className="py-4 px-6 text-center font-bold">
                            <button
                              onClick={() => handleSort("digitized")}
                              className="group mx-auto flex items-center gap-1.5 rounded px-1 py-0.5 uppercase transition-colors hover:bg-gray-100 focus:outline-none"
                            >
                              Complete <SortIndicator column="digitized" />
                            </button>
                          </TableHead>
                          <TableHead className="py-4 px-6 text-right font-bold">
                            <button
                              onClick={() => handleSort("percent")}
                              className="group ml-auto flex items-center gap-1.5 rounded px-1 py-0.5 uppercase transition-colors hover:bg-gray-100 focus:outline-none"
                            >
                              Completeness <SortIndicator column="percent" />
                            </button>
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody className="divide-y divide-gray-200">
                        {sortedByCourse.map((row) => (
                          <TableRow key={row.courseCode} className="group hover:bg-red-50/20 transition-all border-b border-gray-100 last:border-0">
                            <TableCell className="py-4 px-6 font-inter font-bold text-pup-maroon text-xs">
                              {row.courseCode || "—"}
                            </TableCell>
                            <TableCell className="py-4 px-6 text-gray-700 font-medium text-center">
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
                      </TableBody>
                    </Table>
                  ) : (
                    <Empty className="flex h-[400px] flex-col items-center justify-center border-0 text-center text-gray-500">
                      <EmptyHeader className="flex flex-col items-center gap-0">
                        <EmptyMedia className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-gray-200 bg-white shadow-sm">
                          <i className="ph-duotone ph-magnifying-glass text-3xl text-pup-maroon" />
                        </EmptyMedia>
                        <EmptyTitle className="text-lg font-bold text-gray-900">No program data</EmptyTitle>
                        <EmptyDescription className="mt-1 max-w-md text-sm font-medium text-gray-600">
                          {tableSearch 
                            ? `No academic programs found matching "${tableSearch}".` 
                            : "No student records available to analyze for compliance metrics."}
                        </EmptyDescription>
                        {hasActiveFilters && (
                            <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={handleClearAll}
                                className="mt-4 flex items-center gap-2 rounded-brand border border-gray-300 px-4 text-[10px] font-bold text-gray-600 hover:border-gray-300 hover:bg-red-50/30 hover:text-pup-maroon sm:text-xs shadow-sm transition-colors"
                            >
                                <i className="ph-bold ph-x-circle"></i>
                                CLEAR ALL FILTERS
                            </Button>
                        )}
                      </EmptyHeader>
                    </Empty>
                  )}
                </div>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* Report Preview Modal - Standard Consistent Style */}
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
          className="flex h-[90vh] w-[96vw] max-w-[96vw] flex-col overflow-hidden border border-gray-200 bg-gray-100 p-0 shadow-2xl transition-all duration-300 ease-out font-inter xl:max-w-[1200px] rounded-brand"
        >
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
              className="h-11 px-6 font-bold border-gray-300 shadow-sm hover:border-gray-300 hover:bg-red-50/30 rounded-brand transition-colors"
            >
              CLOSE PREVIEW
            </Button>
            <Button
              onClick={handlePrint}
              disabled={!pdfBlobUrl}
              className="flex h-11 items-center gap-2 bg-linear-to-b from-red-800 to-pup-maroon border-4 border-pup-darkMaroon hover:from-red-700 hover:to-red-900 hover:shadow-md transition-all px-8 font-black text-white shadow-sm rounded-brand transition-colors"
            >
              <i className="ph-bold ph-printer text-lg"></i> FINALIZE AND PRINT REPORT
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
