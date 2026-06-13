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
import { RefreshButton } from "@/components/shared/RefreshButton";
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
  const [manualLoading, setManualLoading] = useState(false);
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
        <i className="ph-bold ph-caret-up-down ml-1 text-[12px] text-gray-400 dark:text-zinc-500 opacity-0 group-hover:opacity-100 transition-opacity"></i>
      );
    return sortOrder === "asc" ? (
      <i className="ph-bold ph-caret-up ml-1 text-[12px] text-pup-maroon dark:text-primary"></i>
    ) : (
      <i className="ph-bold ph-caret-down ml-1 text-[12px] text-pup-maroon dark:text-primary"></i>
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

  const load = useCallback(async (isManual = false) => {
    if (isManual) setManualLoading(true);
    setLoading(true);
    setError("");
    try {
      const qs = buildQueryString();
      const [res] = await Promise.all([
        fetch(`/api/analytics/digitization-compliance?${qs}`, { cache: "no-store" }),
        isManual ? new Promise((resolve) => setTimeout(resolve, 600)) : Promise.resolve(),
      ]);
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
      setManualLoading(false);
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
    <div className="flex flex-col flex-1 h-full min-h-0 w-full gap-6 animate-fade-up font-inter">
      {/* 1. Color Stat Cards / Skeletons at the Top */}
      {loading && !data ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28 rounded-xl bg-gray-100 dark:bg-muted" />
          ))}
        </div>
      ) : !error && data ? (
        <div className={cn(
          "transition-all duration-500", 
          (loading && !manualLoading) ? "opacity-40 blur-[1px] grayscale-[0.1]" : "opacity-100"
        )}>
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Completeness Card */}
            <div className="group relative overflow-hidden rounded-xl border-none bg-linear-to-br from-red-500 to-red-700 dark:from-red-700 dark:to-red-950 p-5 shadow-sm transition-all dark:shadow-none">
              <i className="ph-duotone ph-chart-pie pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[280px] text-white opacity-[0.07]" />
              <div className="relative z-10">
                <div className="mb-1 flex items-center gap-1.5 text-[14px] font-medium text-white">
                  <i className="ph-bold ph-chart-pie" /> Completeness
                  <TooltipProvider delayDuration={200}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <i className="ph-bold ph-info cursor-help text-xs text-white hover:text-white transition-colors" />
                      </TooltipTrigger>
                      <TooltipContent 
                        side="right" 
                        sideOffset={10}
                        className="max-w-xs rounded-md border-red-900 bg-[#7a1e28] p-4 text-white shadow-2xl"
                      >
                        <p className="mb-1 text-[10px] font-semibold tracking-widest text-red-100">Metric Scope</p>
                        <p className="text-[11px] font-medium text-red-100/90">
                          This shows the cumulative digitization health across the selected dataset. It is calculated based on total uploaded documents vs. total system requirements.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <div className="text-[48px] font-semibold text-white">
                  {summary?.percentDigitized != null ? `${summary.percentDigitized}%` : "0%"}
                </div>
                <div className="mt-1 text-[13px] font-normal text-white">
                  Overall record health
                </div>
              </div>
            </div>

            <div className="group relative overflow-hidden rounded-xl border-none bg-linear-to-br from-blue-600 to-blue-800 dark:from-blue-800 dark:to-blue-950 p-5 shadow-sm transition-all hover:shadow-md dark:shadow-none">
              <i className="ph-duotone ph-users-three pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[280px] text-white opacity-[0.07]" />
              <div className="relative z-10">
                <div className="mb-1 flex items-center gap-1.5 text-[14px] font-medium text-white">
                  <i className="ph-bold ph-users-three" /> Students
                </div>
                <div className="text-[48px] font-semibold text-white">
                  {summary?.totalStudents?.toLocaleString?.() ?? summary?.totalStudents}
                </div>
                <div className="mt-1 text-[13px] font-normal text-white">
                  Total Enrollment
                </div>
              </div>
            </div>

            <div className="group relative overflow-hidden rounded-xl border-none bg-linear-to-br from-emerald-500 to-emerald-700 dark:from-amber-700 dark:to-amber-950 p-5 shadow-sm transition-all hover:shadow-md dark:shadow-none">
              <i className="ph-duotone ph-check-square-offset pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[280px] text-white opacity-[0.07]" />
              <div className="relative z-10">
                <div className="mb-1 flex items-center gap-1.5 text-[14px] font-medium text-white">
                  <i className="ph-bold ph-check-square-offset" /> Complete
                </div>
                <div className="text-[48px] font-semibold text-white">
                  {summary?.digitizedStudents?.toLocaleString?.() ?? summary?.digitizedStudents}
                </div>
                <div className="mt-1 text-[13px] font-normal text-white flex items-center gap-1.5">
                  <i className="ph-bold ph-trend-up text-white" /> 100% Validated
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* 2. Header and Filters Card & Table Wrapper */}
      <div className="flex flex-col flex-1 min-h-0 gap-6 w-full">
        <Card className="p-0 gap-0 overflow-hidden rounded-brand border border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-card dark:shadow-none w-full">
          <PageHeader
            icon="ph-chart-pie"
            title="Compliance Analysis"
            description="Monitor digitization completeness."
            showBorder={false}
            titleClassName="text-[18px] font-semibold tracking-[-0.01em] text-gray-900 dark:text-zinc-50"
            descriptionClassName="text-[13px] font-normal text-gray-500 dark:text-zinc-400 mt-[4px]"
            actions={
              <div className="flex items-center gap-6">
                <RefreshButton 
                  onRefresh={() => load(true)} 
                  isLoading={manualLoading} 
                  title="Refresh Compliance Data"
                  className="text-gray-400 hover:text-gray-600 dark:text-zinc-500 dark:hover:text-zinc-300 h-9 w-9 p-0"
                />

                <div className="h-6 w-px bg-gray-200 dark:bg-zinc-800" />

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={downloadCsv}
                    disabled={loading || !data || isExportingCsv}
                    className="h-10 px-3 font-semibold text-sm text-gray-600 hover:text-gray-900 hover:bg-transparent dark:text-zinc-400 dark:hover:text-zinc-200 dark:hover:bg-transparent transition-colors flex items-center gap-2 rounded-brand shadow-none! border-0!"
                  >
                    {isExportingCsv ? "Preparing..." : "Export"}
                  </Button>

                  <Button
                    type="button"
                    variant="default"
                    size="sm"
                    onClick={handlePreview}
                    disabled={loading || !data || isGeneratingPdf}
                    className="flex h-[36px] px-5 items-center justify-center rounded-[8px] btn-brand-red text-[13px] font-medium text-white active:scale-95 disabled:opacity-50 transition-all dark:shadow-none"
                  >
                    {isGeneratingPdf ? "Generating..." : "Generate Report"}
                  </Button>
                </div>
              </div>
            }
          />

          {/* Active Filter Chips Row */}
          {hasActiveFilters && (() => {
            const formatChipDate = (dateStr) => {
              if (!dateStr) return "..."
              try {
                return format(new Date(dateStr), "MMM d, yyyy")
              } catch (e) {
                return dateStr
              }
            }
            return (
              <div className="flex-none border-b border-gray-100 bg-white px-6 py-3 animate-in fade-in slide-in-from-top-1 duration-300 dark:border-white/10 dark:bg-card">
                <div className="flex flex-wrap items-center gap-2">
                    <span className="mr-1 text-[11px] font-medium uppercase tracking-[0.04em] text-gray-400 dark:text-zinc-500">
                    Active filters:
                    </span>
                    {statusFilter !== "Active" && (
                        <div className="flex items-center gap-[6px] rounded-[6px] bg-gray-100 dark:bg-zinc-800 px-[10px] py-[4px] text-[12px] font-normal text-gray-900 dark:text-zinc-50">
                        Status: {statusFilter}
                        <button
                            onClick={() => setStatusFilter("Active")}
                            className="text-[12px] text-gray-400 hover:text-gray-600 dark:text-zinc-500 dark:hover:text-zinc-300 transition-colors cursor-pointer border-0 bg-transparent p-0 leading-none"
                        >
                            ×
                        </button>
                        </div>
                    )}
                    {courseFilter !== "" && (
                        <div className="flex items-center gap-[6px] rounded-[6px] bg-gray-100 dark:bg-zinc-800 px-[10px] py-[4px] text-[12px] font-normal text-gray-900 dark:text-zinc-50">
                        Program: {courseFilter}
                        <button
                            onClick={() => setCourseFilter("")}
                            className="text-[12px] text-gray-400 hover:text-gray-600 dark:text-zinc-500 dark:hover:text-zinc-300 transition-colors cursor-pointer border-0 bg-transparent p-0 leading-none"
                        >
                            ×
                        </button>
                        </div>
                    )}
                    {requireApproved && (
                        <div className="flex items-center gap-[6px] rounded-[6px] bg-gray-100 dark:bg-zinc-800 px-[10px] py-[4px] text-[12px] font-normal text-gray-900 dark:text-zinc-50">
                        Requirement: Approved Only
                        <button
                            onClick={() => setRequireApproved(false)}
                            className="text-[12px] text-gray-400 hover:text-gray-600 dark:text-zinc-500 dark:hover:text-zinc-300 transition-colors cursor-pointer border-0 bg-transparent p-0 leading-none"
                        >
                            ×
                        </button>
                        </div>
                    )}
                    {tableSearch && (
                        <div className="flex items-center gap-[6px] rounded-[6px] bg-gray-100 dark:bg-zinc-800 px-[10px] py-[4px] text-[12px] font-normal text-gray-900 dark:text-zinc-50">
                        Search: {tableSearch}
                        <button
                            onClick={() => setTableSearch("")}
                            className="text-[12px] text-gray-400 hover:text-gray-600 dark:text-zinc-500 dark:hover:text-zinc-300 transition-colors cursor-pointer border-0 bg-transparent p-0 leading-none"
                        >
                            ×
                        </button>
                        </div>
                    )}
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleClearAll}
                        className="h-auto text-[12px] font-medium text-gray-400 dark:text-zinc-500 border-0 bg-transparent hover:bg-transparent shadow-none p-0 hover:text-red-600 dark:hover:text-red-500 transition-colors cursor-pointer"
                    >
                        Clear
                    </Button>
                </div>
              </div>
            )
          })()}

          <div className="bg-white border-t border-gray-100 p-4 backdrop-blur-md dark:bg-card/50 dark:border-white/10">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 w-full">
              <div className="flex flex-col gap-[4px] w-full">
                <label className="block text-[11px] font-medium uppercase tracking-[0.04em] text-gray-400 dark:text-zinc-500">
                  Student Status
                </label>
                <Select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="h-[38px] rounded-[8px] border-[0.5px] border-gray-200 text-[13px] font-normal"
                >
                  <option value="Active">Active</option>
                  <option value="All">All</option>
                  <option value="Archived">Archived</option>
                </Select>
              </div>

              <div className="flex flex-col gap-[4px] w-full">
                <label className="block text-[11px] font-medium uppercase tracking-[0.04em] text-gray-400 dark:text-zinc-500">
                  Validation Requirement
                </label>
                <Select
                  value={requireApproved ? "1" : "0"}
                  onChange={(e) => setRequireApproved(e.target.value === "1")}
                  className="h-[38px] rounded-[8px] border-[0.5px] border-gray-200 text-[13px] font-normal"
                >
                  <option value="0">All Uploads</option>
                  <option value="1">Approved Only</option>
                </Select>
              </div>

              <div className="flex flex-col gap-[4px] w-full">
                <label className="block text-[11px] font-medium uppercase tracking-[0.04em] text-gray-400 dark:text-zinc-500">
                  Academic Program
                </label>
                <div className="relative w-full">
                  <Select
                    value={courseFilter}
                    onChange={(e) => setCourseFilter(e.target.value)}
                    disabled={coursesLoading}
                    placeholder={coursesLoading ? "Loading..." : "All Programs"}
                    className="h-[38px] rounded-[8px] border-[0.5px] border-gray-200 text-[13px] font-normal"
                  >
                    <option value="">All Programs</option>
                    {courses.map((c) => (
                      <option key={c.code || c.id} value={String(c.code || "")}>
                        {c.code}{c.name ? ` — ${c.name}` : ""}
                      </option>
                    ))}
                  </Select>
                  {coursesLoading && (
                    <div className="absolute right-10 top-1/2 -translate-y-1/2 pointer-events-none">
                      <i className="ph-bold ph-spinner animate-spin text-gray-400 dark:text-zinc-500 text-xs" />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Calculation block skeletons or data */}
          <div className="p-6 border-t border-gray-100 dark:border-white/10">
            {loading && !data ? (
              <div className="animate-pulse">
                <Skeleton className="h-24 w-full rounded-2xl bg-gray-100 dark:bg-muted" />
              </div>
            ) : !error && data ? (() => {
              const percent = summary?.totalExpectedDocsCount > 0 
                ? Math.min(100, Math.round((summary?.totalDigitizedDocsCount / summary?.totalExpectedDocsCount) * 100)) 
                : 0;
              return (
                <div className={cn(
                  "transition-all duration-500", 
                  (loading && !manualLoading) ? "opacity-40 blur-[1px] grayscale-[0.1]" : "opacity-100"
                )}>
                  <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8 py-4 w-full bg-transparent border-0">
                    
                    {/* Context & Formula */}
                    <div className="flex-1">
                      <div className="flex items-start gap-3">
                        <i className="ph-bold ph-target text-[16px] text-gray-400 dark:text-zinc-500 shrink-0 mt-1" />
                        <div>
                          <h3 className="text-[14px] font-semibold text-gray-900 tracking-[-0.01em] dark:text-zinc-50 m-0">
                            Digitization Target
                          </h3>
                          <div className="text-[10px] font-medium text-gray-400 dark:text-zinc-500 tracking-[0.05em] uppercase mt-[2px]">
                            Requirement Basis
                          </div>
                          <p className="text-[12px] font-normal text-gray-500 dark:text-zinc-400 max-w-xl mt-[6px] mb-0">
                            {meta?.definitions?.expectedCountFormula || "All required documents based on program configuration."}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Progress Metrics Box */}
                    <div className="w-full lg:w-[400px] shrink-0">
                      <div className="flex items-end justify-between mb-2">
                        <div className="flex flex-col">
                          <span className="text-[10px] font-medium text-gray-400 dark:text-zinc-500 tracking-[0.05em] uppercase mb-1">
                            Documents Digitized
                          </span>
                          <div className="flex items-baseline gap-1">
                            <span className="text-[28px] font-semibold text-gray-900 tracking-[-0.01em] dark:text-zinc-50">
                              {summary?.totalDigitizedDocsCount?.toLocaleString() || 0}
                            </span>
                            <span className="text-[28px] font-semibold text-gray-400 dark:text-zinc-500 tracking-[-0.01em]">
                              / {summary?.totalExpectedDocsCount?.toLocaleString() || 0}
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-col items-end pb-1">
                          <div className="text-[11px] font-medium text-red-600 dark:text-red-500 text-right">
                            {percent}% COMPLETE
                          </div>
                        </div>
                      </div>
                      
                      {/* Substantial Progress Bar */}
                      <div className="relative h-[4px] w-full overflow-hidden rounded-[4px] bg-gray-100 dark:bg-zinc-800">
                        <div 
                          className="absolute top-0 left-0 h-full rounded-[4px] bg-red-600 dark:bg-red-500 transition-all duration-1000 ease-out"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })() : null}
          </div>
        </Card>

        {/* 3. Table / Empty / Error Area below in separated container */}
        {loading && !data ? (
          <div className="overflow-hidden rounded-brand border border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-card animate-pulse">
            <div className="h-10 bg-gray-50 dark:bg-white/5" />
            <div className="p-4 space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-8 w-full bg-gray-50 dark:bg-muted" />
              ))}
            </div>
          </div>
        ) : error ? (
          <div className="overflow-hidden rounded-brand border border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-card p-6">
            <Empty className="flex h-[400px] flex-col items-center justify-center border-0 text-center text-gray-500 dark:text-zinc-400">
              <EmptyHeader className="flex flex-col items-center gap-0">
                <EmptyMedia className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-card dark:shadow-none">
                  <i className="ph-duotone ph-warning-circle text-xl text-pup-maroon dark:text-primary" />
                </EmptyMedia>
                <EmptyTitle className="text-lg font-semibold text-gray-900 dark:text-zinc-50">Data Unavailable</EmptyTitle>
                <EmptyDescription className="mt-1 max-w-md text-sm font-medium text-gray-600 dark:text-zinc-300">
                  {error}
                </EmptyDescription>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => load(true)}
                  className="mt-6 flex h-10 items-center gap-2 rounded-brand border border-gray-300 bg-white px-6 text-xs font-semibold text-gray-600 shadow-sm transition-colors hover:border-gray-300 hover:bg-red-50 hover:text-pup-maroon dark:hover:text-red-500 active:scale-95 tracking-wide dark:bg-card dark:text-zinc-300 dark:shadow-none dark:hover:border-zinc-700 dark:border-white/10" 
                >
                  <i className={cn("ph-bold ph-arrows-clockwise", manualLoading && "animate-spin")}></i>
                  Retry Connection
                </Button>
              </EmptyHeader>
            </Empty>
          </div>
        ) : data ? (
          <div className={cn(
            "flex flex-1 flex-col min-h-0 overflow-hidden rounded-brand border border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-card", 
            (loading && !manualLoading) ? "opacity-40 blur-[1px] grayscale-[0.1]" : "opacity-100"
          )}>
            <div className="flex items-center justify-between gap-6 p-4 bg-white border-b border-gray-200 dark:bg-card/50 dark:border-white/10">
              <div className="flex flex-col gap-[2px]">
                <h4 className="text-[13px] font-semibold text-gray-900 dark:text-zinc-50 tracking-[-0.01em] m-0">
                  Program Breakdown
                </h4>
                <span className="text-[11px] font-normal text-gray-400 dark:text-zinc-500">
                  {sortedByCourse.length} {sortedByCourse.length === 1 ? "program" : "programs"}
                </span>
              </div>
              
              <div className="relative group w-[220px] ml-auto">
                <i className="ph-bold ph-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 transition-colors group-focus-within:text-pup-maroon dark:text-zinc-500 text-sm"></i>
                <Input
                  type="text"
                  placeholder="Search course code..."
                        className="h-[36px] w-full rounded-[8px] border-[0.5px] border-gray-200 bg-white pl-9 pr-4 text-[13px] font-normal transition-all focus:border-pup-maroon/30 focus:ring-4 focus:ring-pup-maroon/5 placeholder:text-gray-400 dark:border-white/10 dark:bg-card dark:text-zinc-300 dark:focus:border-primary"
                  value={tableSearch}
                  onChange={(e) => setTableSearch(e.target.value)}
                />
              </div>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto rounded-[inherit] overflow-hidden">
                {sortedByCourse.length > 0 ? (
                  <table className="min-w-full text-sm">
                    <thead className="sticky top-0 z-10 bg-white backdrop-blur-sm dark:bg-card">
                      <tr className="hover:bg-transparent text-left border-b border-gray-100 dark:border-white/5">
                        <th className="p-4 px-6">
                          <button
                            onClick={() => handleSort("courseCode")}
                            className="group flex items-center text-[11px] font-medium uppercase tracking-[0.04em] text-gray-400 dark:text-zinc-500 transition-colors focus:outline-none"
                          >
                            Program <SortIndicator column="courseCode" />
                          </button>
                        </th>
                        <th className="p-4 px-6 text-center">
                          <button
                            onClick={() => handleSort("total")}
                            className="group mx-auto flex items-center text-[11px] font-medium uppercase tracking-[0.04em] text-gray-400 dark:text-zinc-500 transition-colors focus:outline-none"
                          >
                            Total Students <SortIndicator column="total" />
                          </button>
                        </th>
                        <th className="p-4 px-6 text-center">
                          <button
                            onClick={() => handleSort("digitized")}
                            className="group mx-auto flex items-center text-[11px] font-medium uppercase tracking-[0.04em] text-gray-400 dark:text-zinc-500 transition-colors focus:outline-none"
                          >
                            Fully Digitized <SortIndicator column="digitized" />
                          </button>
                        </th>
                        <th className="p-4 px-6 text-right">
                          <button
                            onClick={() => handleSort("percent")}
                            className="group ml-auto flex items-center text-[11px] font-medium uppercase tracking-[0.04em] text-gray-400 dark:text-zinc-500 transition-colors focus:outline-none"
                          >
                            Completeness <SortIndicator column="percent" />
                          </button>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-transparent">
                      {sortedByCourse.map((row) => (
                        <tr key={row.courseCode} className="h-[48px] border-b-[0.5px] border-gray-100 last:border-b-0 group transition-all duration-200 hover:bg-gray-50/40 dark:bg-card dark:hover:bg-white/[0.02]">
                          <td className="p-4 px-6 text-[13px] font-medium text-gray-900 dark:text-zinc-50 tracking-[-0.01em]">
                            {row.courseCode || "—"}
                          </td>
                          <td className="p-4 px-6 text-[13px] font-normal text-gray-900 dark:text-zinc-50 text-center">
                            {row.total?.toLocaleString?.() ?? row.total}
                          </td>
                          <td className="p-4 px-6 text-center text-[13px] font-normal">
                            <span className={cn(
                              row.digitized === 0 
                                ? "text-gray-400 dark:text-zinc-500" 
                                : "text-gray-900 dark:text-zinc-50"
                            )}>
                              {row.digitized?.toLocaleString?.() ?? row.digitized}
                            </span>
                            <span className="text-[10px] text-gray-400 font-semibold ml-1.5 opacity-0 group-hover:opacity-100 dark:text-zinc-505">
                              ({row.fullyDigitizedRate}%)
                            </span>
                          </td>
                          <td className="p-4 px-6 text-right">
                            <div className="flex items-center justify-end gap-[8px]">
                              <span className="text-[13px] font-medium text-gray-900 dark:text-zinc-50">
                                {row.percent != null ? `${row.percent}%` : "0%"}
                              </span>
                              <div className="w-[80px] h-[4px] rounded-[2px] bg-gray-100 overflow-hidden hidden sm:block dark:bg-zinc-800">
                                <div
                                  className="h-full bg-red-600 dark:bg-red-500"
                                  style={{ width: `${Math.min(100, row.percent || 0)}%` }}
                                />
                              </div>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <Empty className="flex h-[450px] flex-col items-center justify-center border-0 bg-transparent text-center">
                    <EmptyHeader className="flex flex-col items-center gap-0">
                      <div className="relative mb-6 mx-auto w-24 h-24">
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-36 h-36 rounded-full bg-gray-100/50 dark:bg-zinc-800/30"></div>
                        <EmptyMedia className="relative z-10 flex h-24 w-24 items-center justify-center rounded-3xl border border-gray-100 bg-white shadow-xl rotate-3 dark:border-white/10 dark:bg-card dark:shadow-none">
                          <i className="ph-duotone ph-magnifying-glass text-xl text-gray-300 dark:text-zinc-600"></i>
                        </EmptyMedia>
                      </div>
                      <EmptyTitle className="text-xl font-semibold text-gray-900 dark:text-zinc-50">No data found</EmptyTitle>
                      <EmptyDescription className="max-w-xs text-sm font-medium text-gray-500 dark:text-zinc-400">
                        {tableSearch 
                          ? `No results found for "${tableSearch}".` 
                          : "No student records available to analyze."}
                      </EmptyDescription>
                      {hasActiveFilters && (
                          <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={handleClearAll}
                              className="mt-6 flex h-10 items-center gap-3 rounded-brand border border-gray-300 bg-white px-6 text-xs font-semibold text-gray-600 shadow-sm transition-colors hover:border-gray-300 hover:bg-red-50 hover:text-pup-maroon dark:hover:text-red-500 active:scale-95 tracking-wide dark:bg-card dark:text-zinc-300 dark:shadow-none dark:hover:border-zinc-700 dark:border-white/10"
                          >
                              <i className="ph-bold ph-arrow-counter-clockwise"></i>
                              CLEAR ALL FILTERS
                          </Button>
                      )}
                    </EmptyHeader>
                  </Empty>
                )}
            </div>
          </div>
        ) : null}
      </div>

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
          className="flex h-[90vh] w-[96vw] max-w-[96vw] flex-col overflow-hidden border border-gray-200 bg-gray-100 p-0 shadow-2xl transition-all duration-300 ease-out font-inter xl:max-w-[1200px] rounded-2xl dark:border-white/10 dark:bg-muted"
        >
          <DialogHeader className="shrink-0 border-b border-gray-100 bg-gray-50 p-6 dark:border-white/10 dark:bg-white/5">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-white text-pup-maroon dark:text-primary shadow-sm dark:border-white/10 dark:bg-card dark:text-primary dark:shadow-none">
                  <i className="ph-duotone ph-file-text text-xl"></i>
                </div>
                <div className="min-w-0">
                  <DialogTitle className="text-left text-xl font-semibold tracking-tight text-gray-900 dark:text-zinc-50">
                  Compliance Report
                  </DialogTitle>
                  <p className="mt-1.5 text-left text-sm font-medium text-gray-500 dark:text-zinc-400">
                  Filter: {statusFilter} | {courseFilter || "All"} {requireApproved && " | Approved Only"}
                  </p>
                </div>
              </div>
            </div>
          </DialogHeader>
          <div className="relative flex-1 overflow-hidden bg-gray-100 dark:bg-muted">
            {pdfBlobUrl ? (
              <div className={cn("relative h-full w-full transition-all duration-300", isFullscreenPreview ? "fixed inset-0 z-[9999] bg-white dark:bg-card" : "")}>
                {isFullscreenPreview && (
                  <div className="absolute top-4 right-4 z-[10000]">
                    <Button
                      variant="default"
                      size="icon"
                      onClick={() => setIsFullscreenPreview(false)}
                      className="h-10 w-10 rounded-full bg-black/50 text-white hover:bg-black/70 backdrop-blur-md border-0"
                    >
                      <i className="ph-bold ph-x text-lg"></i>
                    </Button>
                  </div>
                )}
                {!previewFrameReady && (
                  <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white p-10 dark:bg-card">
                    <div className="w-full max-w-2xl space-y-4">
                      <Skeleton className="h-8 w-64 dark:bg-muted" />
                      <Skeleton className="h-4 w-full dark:bg-muted" />
                      <Skeleton className="h-[60vh] w-full dark:bg-muted" />
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
              <div className="flex h-full w-full flex-col items-center justify-center bg-white p-10 dark:bg-card">
                <div className="flex flex-col items-center gap-4">
                  <i className="ph-bold ph-spinner animate-spin text-xl text-pup-maroon dark:text-primary" />
                  <p className="text-sm font-semibold text-gray-500 tracking-widest dark:text-zinc-400">
                    Generating...
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="flex shrink-0 justify-between items-center gap-3 border-t border-gray-100 bg-white p-4 px-8 rounded-b-[2rem] dark:border-white/10 dark:bg-card">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setIsFullscreenPreview(!isFullscreenPreview)}
              className={cn(
                "h-11 w-11 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-card transition-all hover:bg-gray-50 dark:hover:bg-white/10 dark:bg-card shadow-sm dark:shadow-none",
                isFullscreenPreview && "bg-pup-maroon dark:bg-red-600 text-white hover:bg-pup-darkMaroon border-pup-darkMaroon"
              )}
            >
              <i className={cn("ph-bold text-xl", isFullscreenPreview ? "ph-corners-in" : "ph-corners-out")}></i>
            </Button>

            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={() => setReportOpen(false)}
                className="h-11 px-6 font-semibold border-gray-300 shadow-sm hover:border-gray-300 hover:bg-red-50 rounded-brand transition-colors dark:shadow-none dark:hover:border-zinc-700 dark:bg-red-950/30 dark:border-white/10"
              >
                CLOSE
              </Button>
              <Button
                onClick={handlePrint}
                disabled={!pdfBlobUrl}
                className="flex h-11 items-center gap-2 btn-brand-red px-8 font-semibold text-white shadow-sm rounded-brand transition-colors dark:shadow-none"
              >
                <i className="ph-bold ph-floppy-disk text-lg"></i> SAVE TO DEVICE
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
