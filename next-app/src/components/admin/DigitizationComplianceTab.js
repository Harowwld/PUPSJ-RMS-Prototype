"use client";
import LucideIcon from "@/components/shared/LucideIcon";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import KpiStatCardsSkeleton from "@/components/systemadmin/skeletons/KpiStatCardsSkeleton";
import ComplianceCalcSkeleton from "@/components/admin/skeletons/ComplianceCalcSkeleton";
import ComplianceTableSkeleton from "@/components/admin/skeletons/ComplianceTableSkeleton";
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
  DialogDescription,
  DialogClose,
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
  const [selectedKpi, setSelectedKpi] = useState(null);
  const statCardsRef = useRef(null);

  useEffect(() => {
    if (!selectedKpi) return;
    const handleClickOutside = (e) => {
      if (statCardsRef.current && !statCardsRef.current.contains(e.target)) {
        setSelectedKpi(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [selectedKpi]);

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
        <LucideIcon  className="ph-bold ph-caret-up-down ml-1 text-[12px] text-gray-400 dark:text-zinc-500 opacity-0 group-hover:opacity-100 transition-opacity"></LucideIcon>
      );
    return sortOrder === "asc" ? (
      <LucideIcon  className="ph-bold ph-caret-up ml-1 text-[12px] text-pup-maroon dark:text-primary"></LucideIcon>
    ) : (
      <LucideIcon  className="ph-bold ph-caret-down ml-1 text-[12px] text-pup-maroon dark:text-primary"></LucideIcon>
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
      {/* Unified Single Card Container: Header, Metrics, Filters, Target Metrics & Program Breakdown Table */}
      <Card className="flex h-auto w-full flex-col p-0 gap-0 overflow-visible rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-card dark:shadow-none isolate font-inter mb-4 min-h-0 flex-1">
        <PageHeader
          icon="ph-chart-pie"
          title="Compliance Analysis"
          description="Monitor digitization completeness."
          showBorder={false}
          className="p-6"
          titleClassName="text-[18px] font-semibold tracking-[-0.01em] text-gray-900 dark:text-zinc-50"
          descriptionClassName="text-[13px] font-normal text-gray-500 dark:text-zinc-400 mt-[4px]"
          actions={
            <div className="flex items-center gap-6">
              <RefreshButton 
                onRefresh={() => load(true)} 
                isLoading={manualLoading} 
                title="Refresh Compliance Data"
              />

              <div className="h-6 w-px bg-gray-200 dark:bg-zinc-800" />

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={downloadCsv}
                  disabled={loading || !data || isExportingCsv}
                  className="flex h-10 items-center justify-center rounded-xl! border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 font-semibold text-xs active:scale-95 transition-all cursor-pointer px-4 shadow-xs hover:bg-gray-50 dark:hover:bg-zinc-700"
                >
                  {isExportingCsv ? (
                    <LucideIcon  className="ph-bold ph-spinner animate-spin text-[16px]"></LucideIcon>
                  ) : (
                    "Export"
                  )}
                </Button>

                <Button
                  type="button"
                  onClick={handlePreview}
                  disabled={loading || !data || isGeneratingPdf}
                  className="flex h-10 items-center justify-center rounded-xl! btn-brand-red text-white font-semibold text-xs active:scale-95 disabled:opacity-50 transition-all cursor-pointer px-5 shadow-xs"
                >
                  {isGeneratingPdf ? (
                    <LucideIcon  className="ph-bold ph-spinner animate-spin text-[16px] flex items-center justify-center"></LucideIcon>
                  ) : (
                    "Download"
                  )}
                </Button>
              </div>
            </div>
          }
        />

        {/* 2. Top Summary Metrics Banner */}
        {loading && !data ? (
          <div className="px-6 pb-6">
            <KpiStatCardsSkeleton count={3} />
          </div>
        ) : !error && data ? (
          <div className="px-6 pb-6">
            <div className={cn(
              "transition-all duration-slow", 
              (loading && !manualLoading) ? "opacity-40 blur-[1px] grayscale-[0.1]" : "opacity-100"
            )}>
              {/* Stats Cards */}
              <div ref={statCardsRef} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 relative z-20">
                {/* Completeness Card */}
                <div className={cn(
                  "relative group rounded-xl",
                  selectedKpi === "completeness" ? "z-30" : "z-10"
                )}>
                  <div 
                    onClick={() => setSelectedKpi(selectedKpi === "completeness" ? null : "completeness")}
                    className={cn(
                      "relative overflow-hidden rounded-xl border p-4 cursor-pointer select-none transition-all",
                      "border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-zinc-900/30 hover:border-gray-200 dark:hover:border-white/10",
                      selectedKpi === "completeness" && "border-red-500/40 dark:border-red-500/40 ring-1 ring-red-500/20"
                    )}
                  >
                    <div className="relative z-10">
                      <div className="mb-1 flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-zinc-500">
                            Completeness
                          </span>
                          <TooltipProvider delayDuration={200}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <LucideIcon  className="ph-bold ph-info cursor-help text-xs text-gray-400 hover:text-gray-600 dark:hover:text-zinc-300 transition-colors" />
                              </TooltipTrigger>
                              <TooltipContent 
                                side="right" 
                                className="max-w-[280px] bg-white dark:bg-zinc-900 text-gray-900 dark:text-zinc-100 p-3 rounded-xl shadow-xl border border-gray-200 dark:border-white/10 text-xs font-normal"
                              >
                                <p className="font-semibold text-pup-maroon dark:text-red-400 mb-1">Digitization Formula</p>
                                <p className="leading-relaxed text-gray-600 dark:text-zinc-300 mb-2">
                                  Percentage of expected mandatory documents uploaded across all active/selected students.
                                </p>
                                <div className="p-2 bg-gray-50 dark:bg-zinc-800/60 rounded-lg text-[11px] font-mono border border-gray-200/60 dark:border-white/5">
                                  (Digitized Docs / Expected Docs) × 100
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                        <LucideIcon  className={cn("ph-bold ph-caret-down text-xs text-gray-400 transition-transform duration-300", selectedKpi === "completeness" && "rotate-180")} />
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-black text-gray-900 dark:text-zinc-50 tracking-tight">
                          {summary?.percentDigitized ?? 0}%
                        </span>
                        <span className="text-xs font-medium text-red-600 dark:text-red-400">
                          Digitized Documents
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Absolute details container */}
                  <div className={cn(
                    "absolute top-full left-0 right-0 z-[100] mt-2 rounded-xl border border-gray-200 bg-white p-4 shadow-xl dark:border-white/10 dark:bg-zinc-900 transition-all duration-300 ease-in-out origin-top",
                    selectedKpi === "completeness" ? "scale-y-100 opacity-100 translate-y-0" : "scale-y-95 opacity-0 -translate-y-2 pointer-events-none"
                  )} onClick={(e) => e.stopPropagation()}>
                    <div className="space-y-3">
                      {summary && (
                        <>
                          <div className="grid grid-cols-2 gap-2">
                            <div className="bg-gray-50 dark:bg-zinc-800/60 p-2.5 rounded-lg border border-gray-100 dark:border-white/5">
                              <span className="block text-[9px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-wider">Completeness</span>
                              <span className="text-lg font-black text-gray-900 dark:text-zinc-50">{summary.percentDigitized ?? 0}%</span>
                            </div>
                            <div className="bg-red-50 dark:bg-red-950/30 p-2.5 rounded-lg border border-red-100 dark:border-red-900/30">
                              <span className="block text-[9px] font-bold text-red-600 dark:text-red-400 uppercase tracking-wider">Digitized Files</span>
                              <span className="text-lg font-black text-red-700 dark:text-red-400">{summary.totalDigitizedDocsCount?.toLocaleString()}</span>
                            </div>
                          </div>

                          <div className="bg-gray-50 dark:bg-zinc-800/60 p-2.5 rounded-lg border border-gray-100 dark:border-white/5 flex justify-between items-center text-xs">
                            <span className="font-semibold text-gray-600 dark:text-zinc-400">Expected Documents</span>
                            <span className="font-bold text-gray-900 dark:text-zinc-50">{summary.totalExpectedDocsCount?.toLocaleString()}</span>
                          </div>

                          {byCourse && byCourse.length > 0 && (
                            <div>
                              <h4 className="text-[10px] font-bold text-gray-400 dark:text-zinc-500 mb-1.5 uppercase tracking-wide">Course Completeness</h4>
                              <div className="max-h-32 overflow-y-auto space-y-1 pr-1">
                                {byCourse.map((c) => (
                                  <div key={c.courseCode} className="flex justify-between items-center text-[11px] py-1 border-b border-gray-100 dark:border-white/5 text-gray-700 dark:text-zinc-300">
                                    <span className="truncate max-w-[150px]" title={c.courseCode}>{c.courseCode}</span>
                                    <span className="font-bold text-gray-900 dark:text-zinc-50">{c.percent}%</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Students Card */}
                <div className={cn(
                  "relative group rounded-xl",
                  selectedKpi === "students" ? "z-30" : "z-10"
                )}>
                  <div 
                    onClick={() => setSelectedKpi(selectedKpi === "students" ? null : "students")}
                    className={cn(
                      "relative overflow-hidden rounded-xl border p-4 cursor-pointer select-none transition-all",
                      "border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-zinc-900/30 hover:border-gray-200 dark:hover:border-white/10",
                      selectedKpi === "students" && "border-blue-500/40 dark:border-blue-500/40 ring-1 ring-blue-500/20"
                    )}
                  >
                    <div className="relative z-10">
                      <div className="mb-1 flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-zinc-500">
                          Students
                        </span>
                        <LucideIcon  className={cn("ph-bold ph-caret-down text-xs text-gray-400 transition-transform duration-300", selectedKpi === "students" && "rotate-180")} />
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-black text-gray-900 dark:text-zinc-50 tracking-tight">
                          {summary?.totalStudents?.toLocaleString?.() ?? summary?.totalStudents ?? 0}
                        </span>
                        <span className="text-xs font-medium text-blue-600 dark:text-blue-400">
                          Total Enrollment
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Absolute details container */}
                  <div className={cn(
                    "absolute top-full left-0 right-0 z-[100] mt-2 rounded-xl border border-gray-200 bg-white p-4 shadow-xl dark:border-white/10 dark:bg-zinc-900 transition-all duration-300 ease-in-out origin-top",
                    selectedKpi === "students" ? "scale-y-100 opacity-100 translate-y-0" : "scale-y-95 opacity-0 -translate-y-2 pointer-events-none"
                  )} onClick={(e) => e.stopPropagation()}>
                    <div className="space-y-3">
                      {summary && (
                        <>
                          <div className="grid grid-cols-2 gap-2">
                            <div className="bg-gray-50 dark:bg-zinc-800/60 p-2.5 rounded-lg border border-gray-100 dark:border-white/5">
                              <span className="block text-[9px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-wider">Enrollment</span>
                              <span className="text-lg font-black text-gray-900 dark:text-zinc-50">{summary.totalStudents?.toLocaleString()}</span>
                            </div>
                            <div className="bg-blue-50 dark:bg-blue-950/30 p-2.5 rounded-lg border border-blue-100 dark:border-blue-900/30">
                              <span className="block text-[9px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">Digitized Students</span>
                              <span className="text-lg font-black text-blue-700 dark:text-blue-400">{summary.digitizedStudents?.toLocaleString()}</span>
                            </div>
                          </div>

                          <div className="bg-gray-50 dark:bg-zinc-800/60 p-2.5 rounded-lg border border-gray-100 dark:border-white/5 flex justify-between items-center text-xs">
                            <span className="font-semibold text-gray-600 dark:text-zinc-400">Remaining Partially Digitized</span>
                            <span className="font-bold text-amber-600 dark:text-amber-400">{summary.notDigitizedStudents?.toLocaleString()}</span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Complete Card */}
                <div className={cn(
                  "relative group rounded-xl",
                  selectedKpi === "complete" ? "z-30" : "z-10"
                )}>
                  <div 
                    onClick={() => setSelectedKpi(selectedKpi === "complete" ? null : "complete")}
                    className={cn(
                      "relative overflow-hidden rounded-xl border p-4 cursor-pointer select-none transition-all",
                      "border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-zinc-900/30 hover:border-gray-200 dark:hover:border-white/10",
                      selectedKpi === "complete" && "border-emerald-500/40 dark:border-emerald-500/40 ring-1 ring-emerald-500/20"
                    )}
                  >
                    <div className="relative z-10">
                      <div className="mb-1 flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-zinc-500">
                          Complete
                        </span>
                        <LucideIcon  className={cn("ph-bold ph-caret-down text-xs text-gray-400 transition-transform duration-300", selectedKpi === "complete" && "rotate-180")} />
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-black text-gray-900 dark:text-zinc-50 tracking-tight">
                          {summary?.fullyDigitizedRate ?? 0}%
                        </span>
                        <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                          {(summary?.digitizedStudents ?? summary?.fullyDigitizedStudents ?? 0).toLocaleString()} Fully Digitized
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Absolute details container */}
                  <div className={cn(
                    "absolute top-full left-0 right-0 z-[100] mt-2 rounded-xl border border-gray-200 bg-white p-4 shadow-xl dark:border-white/10 dark:bg-zinc-900 transition-all duration-300 ease-in-out origin-top",
                    selectedKpi === "complete" ? "scale-y-100 opacity-100 translate-y-0" : "scale-y-95 opacity-0 -translate-y-2 pointer-events-none"
                  )} onClick={(e) => e.stopPropagation()}>
                    <div className="space-y-3">
                      {summary && (
                        <>
                          <div className="grid grid-cols-2 gap-2">
                            <div className="bg-gray-50 dark:bg-zinc-800/60 p-2.5 rounded-lg border border-gray-100 dark:border-white/5">
                              <span className="block text-[9px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-wider">Fully Digitized</span>
                              <span className="text-lg font-black text-gray-900 dark:text-zinc-50">{(summary?.digitizedStudents ?? summary?.fullyDigitizedStudents ?? 0).toLocaleString()}</span>
                            </div>
                            <div className="bg-emerald-50 dark:bg-emerald-950/30 p-2.5 rounded-lg border border-emerald-100 dark:border-emerald-900/30">
                              <span className="block text-[9px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Completion Rate</span>
                              <span className="text-lg font-black text-emerald-700 dark:text-emerald-400">{summary?.fullyDigitizedRate ?? 0}%</span>
                            </div>
                          </div>

                          <div className="bg-gray-50 dark:bg-zinc-800/60 p-2.5 rounded-lg border border-gray-100 dark:border-white/5 flex justify-between items-center text-xs">
                            <span className="font-semibold text-gray-600 dark:text-zinc-400">Validated student records</span>
                            <span className="font-bold text-emerald-600 dark:text-emerald-400">100% Correct</span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {/* Navigation Toolbar */}
        <div className="border-t border-gray-100 dark:border-white/10 p-5 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 bg-gray-50/40 dark:bg-zinc-900/30">
          {/* Student Status Filter Line Tabs */}
          <div className="flex items-center gap-6 shrink-0 select-none overflow-x-auto">
            <button
              type="button"
              onClick={() => setStatusFilter("Active")}
              className={cn(
                "relative h-9 flex items-center text-[13px] font-semibold transition-colors focus:outline-none cursor-pointer border-0 bg-transparent whitespace-nowrap",
                statusFilter === "Active"
                  ? "text-gray-900 dark:text-zinc-50 after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-full after:bg-gray-900 dark:after:bg-zinc-50"
                  : "text-[#8E8E93] font-normal hover:text-gray-700 dark:hover:text-zinc-200"
              )}
            >
              Active
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("All")}
              className={cn(
                "relative h-9 flex items-center text-[13px] font-semibold transition-colors focus:outline-none cursor-pointer border-0 bg-transparent whitespace-nowrap",
                statusFilter === "All"
                  ? "text-gray-900 dark:text-zinc-50 after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-full after:bg-gray-900 dark:after:bg-zinc-50"
                  : "text-[#8E8E93] font-normal hover:text-gray-700 dark:hover:text-zinc-200"
              )}
            >
              All Students
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("Archived")}
              className={cn(
                "relative h-9 flex items-center text-[13px] font-semibold transition-colors focus:outline-none cursor-pointer border-0 bg-transparent whitespace-nowrap",
                statusFilter === "Archived"
                  ? "text-gray-900 dark:text-zinc-50 after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-full after:bg-gray-900 dark:after:bg-zinc-50"
                  : "text-[#8E8E93] font-normal hover:text-gray-700 dark:hover:text-zinc-200"
              )}
            >
              Archived
            </button>
          </div>

          {/* Search, Academic Program, and Validation Controls */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-wrap">
            {/* Search */}
            <div className="relative flex-1 sm:w-64 min-w-[200px] group">
              <LucideIcon  className="ph-bold ph-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-zinc-500 transition-colors group-focus-within:text-pup-maroon dark:group-focus-within:text-red-400 text-xs pointer-events-none"></LucideIcon>
              <Input
                type="text"
                placeholder="Search Program"
                className="pl-8 pr-16 h-9 text-xs w-full bg-white dark:bg-zinc-800 border border-gray-200 dark:border-white/10 rounded-xl text-gray-900 dark:text-zinc-100 placeholder:text-gray-400 dark:placeholder:text-zinc-500 shadow-none focus-visible:outline-none focus-visible:border-pup-maroon focus-visible:ring-1 focus-visible:ring-pup-maroon dark:focus-visible:border-red-500/80 dark:focus-visible:ring-red-500/80"
                value={tableSearch}
                onChange={(e) => setTableSearch(e.target.value)}
              />
              <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-[11px] font-mono text-gray-400 dark:text-zinc-500">
                {sortedByCourse.length > 0 ? `${sortedByCourse.length} results` : "0 results"}
              </div>
            </div>

            {/* Academic Program Select */}
            <div className="w-[180px]">
              <Select
                value={courseFilter}
                onChange={(e) => setCourseFilter(e.target.value)}
                disabled={coursesLoading}
                className="h-9 rounded-xl border border-gray-200 text-xs font-normal bg-white dark:bg-zinc-800 dark:border-white/10"
              >
                <option value="">All Programs</option>
                {courses.map((c) => (
                  <option key={c.code || c.id} value={String(c.code || "")}>
                    {c.code}{c.name ? ` — ${c.name}` : ""}
                  </option>
                ))}
              </Select>
            </div>

            {/* Validation Requirement Segmented Control */}
            <div className="flex items-center gap-1 bg-gray-100/80 dark:bg-zinc-800/60 p-1 rounded-xl border border-gray-200/60 dark:border-white/5">
              <button
                type="button"
                onClick={() => setRequireApproved(false)}
                className={cn(
                  "px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer whitespace-nowrap",
                  !requireApproved
                    ? "bg-white dark:bg-zinc-700 text-gray-900 dark:text-white shadow-xs"
                    : "text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white"
                )}
              >
                All Uploads
              </button>
              <button
                type="button"
                onClick={() => setRequireApproved(true)}
                className={cn(
                  "px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer whitespace-nowrap",
                  requireApproved
                    ? "bg-white dark:bg-zinc-700 text-gray-900 dark:text-white shadow-xs"
                    : "text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white"
                )}
              >
                Approved Only
              </button>
            </div>
          </div>
        </div>

        {/* Active Filter Chips Row */}
        {hasActiveFilters && (
          <div className="flex-none border-t border-gray-100 dark:border-white/10 bg-white dark:bg-card px-6 py-3 animate-in fade-in slide-in-from-top-1 duration-normal">
            <div className="flex flex-wrap items-center gap-2">
              <span className="mr-1 text-[11px] font-medium uppercase tracking-[0.04em] text-gray-400 dark:text-zinc-500">
                Active filters:
              </span>
              {statusFilter !== "Active" && (
                <div className="flex items-center gap-[6px] rounded-lg bg-gray-100 dark:bg-zinc-800 px-[10px] py-[4px] text-[12px] font-normal text-gray-900 dark:text-zinc-50">
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
                <div className="flex items-center gap-[6px] rounded-lg bg-gray-100 dark:bg-zinc-800 px-[10px] py-[4px] text-[12px] font-normal text-gray-900 dark:text-zinc-50">
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
                <div className="flex items-center gap-[6px] rounded-lg bg-gray-100 dark:bg-zinc-800 px-[10px] py-[4px] text-[12px] font-normal text-gray-900 dark:text-zinc-50">
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
                <div className="flex items-center gap-[6px] rounded-lg bg-gray-100 dark:bg-zinc-800 px-[10px] py-[4px] text-[12px] font-normal text-gray-900 dark:text-zinc-50">
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
        )}

        {/* Calculation block skeletons or data */}
        <div className="p-6 border-t border-gray-100 dark:border-white/10">
          {loading && !data ? (
            <ComplianceCalcSkeleton />
          ) : !error && data ? (() => {
            const percent = summary?.totalExpectedDocsCount > 0 
              ? Math.min(100, Math.round((summary?.totalDigitizedDocsCount / summary?.totalExpectedDocsCount) * 100)) 
              : 0;
            return (
              <div className={cn(
                "transition-all duration-slow", 
                (loading && !manualLoading) ? "opacity-40 blur-[1px] grayscale-[0.1]" : "opacity-100"
              )}>
                <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8 py-4 w-full bg-transparent border-0">
                  
                  {/* Context & Formula */}
                  <div className="flex-1">
                    <div className="flex items-start gap-3">
                      <LucideIcon  className="ph-bold ph-target text-[16px] text-gray-400 dark:text-zinc-500 shrink-0 mt-1" />
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
                        <span className="text-[10px] font-medium text-gray-400 dark:text-zinc-500 tracking-[0.05em] mb-1">
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
                        <div className="text-[11px] font-medium text-emerald-600 dark:text-emerald-500 text-right">
                          {percent}% Complete
                        </div>
                      </div>
                    </div>
                    
                    {/* Substantial Progress Bar */}
                    <div className="relative h-[8px] w-full overflow-hidden rounded-[4px] bg-gray-100 dark:bg-zinc-800">
                      <div 
                        className="absolute top-0 left-0 h-full rounded-[4px] bg-emerald-600 dark:bg-emerald-500 transition-all duration-slow ease-standard"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            );
          })() : null}
        </div>

        {/* Table / Empty / Error Area embedded in single card */}
        {loading && !data ? (
          <ComplianceTableSkeleton rowCount={6} embedded={true} />
        ) : error ? (
          <div className="flex min-h-[380px] flex-col items-center justify-center border-t border-gray-100 dark:border-white/10 bg-transparent text-center p-6 rounded-b-2xl">
            <Empty className="flex flex-col items-center justify-center border-0 text-center text-gray-500 dark:text-zinc-400">
              <EmptyHeader className="flex flex-col items-center gap-0">
                <div className="relative mb-6">
                  <div className="absolute inset-0 scale-150 animate-pulse rounded-full bg-gray-50 opacity-50 dark:bg-card"></div>
                  <EmptyMedia className="relative z-10 flex h-24 w-24 items-center justify-center rounded-3xl border border-gray-100 bg-white shadow-xl rotate-3 dark:border-white/10 dark:bg-card dark:shadow-none">
                    <LucideIcon  className="ph-duotone ph-warning-circle text-3xl text-pup-maroon dark:text-primary" />
                  </EmptyMedia>
                </div>
                <EmptyTitle className="text-lg font-semibold text-gray-900 dark:text-zinc-50">Data Unavailable</EmptyTitle>
                <EmptyDescription className="mt-1 max-w-md text-sm font-medium text-gray-600 dark:text-zinc-300">
                  {error}
                </EmptyDescription>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => load(true)}
                  className="mt-6 flex h-10 items-center justify-center rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 px-6 text-xs font-semibold text-gray-700 dark:text-zinc-200 shadow-xs transition-colors hover:bg-gray-50 dark:hover:bg-zinc-700 active:scale-95 cursor-pointer" 
                >
                  Retry
                </Button>
              </EmptyHeader>
            </Empty>
          </div>
        ) : data ? (
          <div className={cn(
            "flex flex-1 flex-col min-h-0 overflow-hidden rounded-b-2xl border-t border-gray-100 dark:border-white/10", 
            (loading && !manualLoading) ? "opacity-40 blur-[1px] grayscale-[0.1]" : "opacity-100"
          )}>
            <div className="flex items-center justify-between gap-6 px-6 py-3.5 bg-gray-50/40 dark:bg-zinc-900/30 border-b border-gray-100 dark:border-white/10">
              <div className="flex items-center gap-2.5">
                <h4 className="text-xs font-semibold text-gray-900 dark:text-zinc-100 tracking-[-0.01em] m-0">
                  Program Breakdown
                </h4>
                <span className="text-[11px] font-mono text-gray-400 dark:text-zinc-500">
                  ({sortedByCourse.length} {sortedByCourse.length === 1 ? "program" : "programs"})
                </span>
              </div>
            </div>

            <div className="flex-1 overflow-visible rounded-b-2xl">
              {sortedByCourse.length > 0 ? (
                <table className="min-w-full text-sm">
                  <thead className="sticky top-0 z-10 bg-white backdrop-blur-sm dark:bg-card">
                    <tr className="hover:bg-transparent text-left border-b border-gray-100 dark:border-white/5">
                      <th className="p-4 px-6">
                        <button
                          onClick={() => handleSort("courseCode")}
                          className="group flex items-center text-[12px] font-medium uppercase tracking-[0.04em] text-gray-400 dark:text-zinc-500 transition-colors focus:outline-none cursor-pointer"
                        >
                          Program <SortIndicator column="courseCode" />
                        </button>
                      </th>
                      <th className="p-4 px-6 text-center">
                        <button
                          onClick={() => handleSort("total")}
                          className="group mx-auto flex items-center text-[12px] font-medium uppercase tracking-[0.04em] text-gray-400 dark:text-zinc-500 transition-colors focus:outline-none cursor-pointer"
                        >
                          Total Students <SortIndicator column="total" />
                        </button>
                      </th>
                      <th className="p-4 px-6 text-center">
                        <button
                          onClick={() => handleSort("digitized")}
                          className="group mx-auto flex items-center text-[12px] font-medium uppercase tracking-[0.04em] text-gray-400 dark:text-zinc-500 transition-colors focus:outline-none cursor-pointer"
                        >
                          Fully Digitized <SortIndicator column="digitized" />
                        </button>
                      </th>
                      <th className="p-4 px-6 text-right">
                        <button
                          onClick={() => handleSort("percent")}
                          className="group ml-auto flex items-center text-[12px] font-medium uppercase tracking-[0.04em] text-gray-400 dark:text-zinc-500 transition-colors focus:outline-none cursor-pointer"
                        >
                          Completeness <SortIndicator column="percent" />
                        </button>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-transparent">
                    {sortedByCourse.map((row) => (
                      <tr key={row.courseCode} className="h-[48px] border-b-[0.5px] border-gray-100 dark:border-white/10 last:border-b-0 group transition-all duration-fast hover:bg-gray-50/40 dark:bg-card dark:hover:bg-white/[0.02]">
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
                          <span className="text-[10px] text-gray-400 font-semibold ml-1.5 opacity-0 group-hover:opacity-100 dark:text-zinc-500">
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
                                className="h-full bg-emerald-600 dark:bg-emerald-500"
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
                <Empty className="flex h-[320px] flex-col items-center justify-center border-0 bg-transparent text-center">
                  <EmptyHeader className="flex flex-col items-center gap-0">
                    <div className="relative mb-6">
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-36 h-36 rounded-full bg-gray-100/50 dark:bg-zinc-800/30"></div>
                      <EmptyMedia className="relative z-10 flex h-24 w-24 items-center justify-center rounded-3xl border border-gray-100 bg-white shadow-xl rotate-3 dark:border-white/10 dark:bg-card dark:shadow-none">
                        <LucideIcon  className="ph-duotone ph-magnifying-glass text-xl text-gray-300 dark:text-zinc-600"></LucideIcon>
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
                        className="mt-6 flex h-10 items-center gap-3 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 px-6 text-xs font-semibold text-gray-700 dark:text-zinc-200 shadow-xs transition-colors hover:bg-gray-50 dark:hover:bg-zinc-700 active:scale-95 tracking-wide cursor-pointer"
                      >
                        <LucideIcon  className="ph-bold ph-arrow-counter-clockwise"></LucideIcon>
                        Clear
                      </Button>
                    )}
                  </EmptyHeader>
                </Empty>
              )}
            </div>
          </div>
        ) : null}
      </Card>

      {/* Report Preview Modal */}
      <Dialog
        open={reportOpen}
        onOpenChange={(open) => {
          if (!open) {
            if (pdfBlobUrl) URL.revokeObjectURL(pdfBlobUrl);
            setPdfPreviewUrl(null);
            setPreviewFrameReady(false);
            setIsFullscreenPreview(false);
          }
          setReportOpen(open);
        }}
      >
        <DialogContent 
          hideClose={true}
          className="flex h-[90vh] w-[96vw] max-w-[96vw] flex-col overflow-hidden border border-gray-200 bg-gray-100 p-0 shadow-2xl transition-all duration-normal ease-standard xl:max-w-[1400px] rounded-2xl dark:border-white/10 dark:bg-muted"
        >
          <DialogHeader 
            className="shrink-0 bg-gray-50 dark:bg-white/5"
            style={{
              padding: '20px 24px',
              borderBottom: '0.5px solid rgba(0,0,0,0.08)',
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px'
            }}
          >
            <div className="min-w-0">
              <DialogTitle className="text-left" style={{ fontSize: '15px', fontWeight: 600, color: '#111', letterSpacing: '-0.01em' }}>
                Compliance Report Preview
              </DialogTitle>
              <DialogDescription className="text-left" style={{ marginTop: '2px', fontSize: '12px', fontWeight: 400, color: '#8E8E93' }}>
                Review the generated document before downloading. Ensure all records and rates are correctly captured.
              </DialogDescription>
            </div>
            
            <DialogClose asChild>
              <button
                type="button"
                className="hover:text-[#111] dark:hover:text-white transition-colors focus:outline-none flex items-center justify-center p-0"
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#8E8E93',
                  cursor: 'pointer'
                }}
              >
                <LucideIcon  className="ti ti-x" style={{ fontSize: '16px' }}></LucideIcon>
              </button>
            </DialogClose>
          </DialogHeader>

          <div className="relative flex flex-1 flex-col overflow-hidden bg-gray-100 p-0 dark:bg-muted">
            {pdfBlobUrl ? (
              <div className={cn("relative min-h-0 min-w-0 flex-1 transition-all duration-normal", isFullscreenPreview ? "fixed inset-0 z-[9999] bg-white dark:bg-card" : "")}>
                {isFullscreenPreview && (
                  <div className="absolute top-4 right-4 z-[10000]">
                    <Button
                      variant="default"
                      size="icon"
                      onClick={() => setIsFullscreenPreview(false)}
                      className="h-10 w-10 rounded-full bg-black/50 text-white hover:bg-black/70 backdrop-blur-md border-0"
                    >
                      <LucideIcon  className="ph-bold ph-x text-lg"></LucideIcon>
                    </Button>
                  </div>
                )}
                {!previewFrameReady && (
                  <div className="absolute inset-0 z-10 bg-white p-6 dark:bg-card">
                    <div className="space-y-4">
                      <Skeleton className="h-6 w-56 dark:bg-muted" />
                      <Skeleton className="h-4 w-80 dark:bg-muted" />
                      <Skeleton className="h-[55vh] w-full dark:bg-muted" />
                    </div>
                  </div>
                )}
                <iframe
                  src={`${pdfBlobUrl}#toolbar=0&navpanes=0`}
                  className="absolute inset-0 h-full w-full border-none bg-gray-200 dark:bg-zinc-700"
                  title="PDF Report Preview"
                  onLoad={() => setPreviewFrameReady(true)}
                />
              </div>
            ) : (
              <div className="flex flex-1 items-center justify-center bg-white p-6 dark:bg-card">
                <div className="max-w-lg text-center">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-gray-200 bg-gray-50 dark:border-white/10 dark:bg-card">
                    <LucideIcon  className="ph-bold ph-circle-notch animate-spin text-xl text-pup-maroon dark:text-primary"></LucideIcon>
                  </div>
                  <p className="text-sm font-semibold text-gray-600 dark:text-zinc-300">
                    Generating...
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="flex shrink-0 items-center bg-white dark:bg-card px-6 py-4 border-t border-gray-100 dark:border-white/10">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsFullscreenPreview(!isFullscreenPreview)}
              className="text-[#8E8E93] hover:text-[#111] dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 transition-colors rounded-xl shadow-none border-0 p-0 h-10 w-10 cursor-pointer"
            >
              <LucideIcon  className="ti ti-arrows-vertical text-[16px]"></LucideIcon>
            </Button>

            <div className="flex items-center gap-2.5 ml-auto">
              <Button
                variant="outline"
                onClick={() => setReportOpen(false)}
                className="flex h-10 items-center justify-center rounded-xl! border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 font-semibold text-xs active:scale-95 transition-all cursor-pointer px-5 shadow-xs hover:bg-gray-50 dark:hover:bg-zinc-700"
              >
                Close
              </Button>
              <Button
                onClick={handlePrint}
                disabled={!pdfBlobUrl}
                className="h-10 px-5 rounded-xl! text-xs font-semibold text-white btn-brand-red active:scale-95 disabled:opacity-50 transition-all cursor-pointer shadow-xs"
              >
                Download
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
