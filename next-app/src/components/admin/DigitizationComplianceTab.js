"use client";
import { Table } from "@/components/ui/table";
import TablePagination from "@/components/shared/TablePagination";

import useUrlPage from "@/hooks/useUrlPage";
import usePdfPreviewSession from "@/hooks/usePdfPreviewSession";
import { PDF_ACTION_LABELS } from "@/lib/pdfPreview";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import KpiStatCardsSkeleton from "@/components/systemadmin/skeletons/KpiStatCardsSkeleton";
import ComplianceCalcSkeleton from "@/components/admin/skeletons/ComplianceCalcSkeleton";
import ComplianceTableSkeleton from "@/components/admin/skeletons/ComplianceTableSkeleton";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { Reorder } from "framer-motion";
import { generateDigitizationCompliancePdf } from "@/lib/pdfGenerator";
import { generateExportFilename } from "@/lib/exportHelpers";
import { formatErrorMessage } from "@/lib/errorUtils";
import { formatPHDateTime } from "@/lib/timeFormat";
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyMedia,
  EmptyContent,
} from "@/components/ui/empty";

import PDFPreviewModal from "@/components/shared/PDFPreviewModal";
import ComplianceStudentsSheet from "@/components/shared/ComplianceStudentsSheet";
import PageHeader from "@/components/shared/PageHeader";
import { RefreshButton } from "@/components/shared/RefreshButton";
import MultiCriteriaFilter from "@/components/shared/MultiCriteriaFilter";
import ActiveFilterChips from "@/components/shared/ActiveFilterChips";
import TableScrollControls from "@/components/shared/TableScrollControls";
import DataViewToolbar from "@/components/shared/DataViewToolbar";
import useTableScroll from "@/hooks/useTableScroll";
import OSASOrganizationComplianceView from "./OSASOrganizationComplianceView";
import { AlertCircleIcon as EmptyAlertCircleIcon, Files01Icon as EmptyFiles01Icon, Search01Icon as EmptySearch01Icon, UserGroupIcon as EmptyUserGroupIcon, ArrowDown01Icon, ArrowUp01Icon, ArrowUpDownIcon, CheckmarkCircle01Icon, CovidInfoIcon, DragDropIcon, Loading01Icon, PieChartIcon, ReloadIcon, Target01Icon, UserSearch01Icon, Search01Icon } from "hugeicons-react";
import AppIcon from "@/components/ui/app-icon";
function SortIndicator({ column, sortBy, sortOrder }) {
  if (sortBy !== column) {
    return (
      <ArrowUpDownIcon size="1em" className="ml-1 text-[12px] text-gray-400 dark:text-zinc-500 opacity-0 group-hover:opacity-100 transition-opacity" />
    );
  }
  return sortOrder === "asc" ? (
    <ArrowUp01Icon size="1em" className="ml-1 text-[12px] text-pup-maroon dark:text-primary" />
  ) : (
    <ArrowDown01Icon size="1em" className="ml-1 text-[12px] text-pup-maroon dark:text-primary" />
  );
}

export default function DigitizationComplianceTab(props) {
  const isOsas = (props.officeId || props.authUser?.office_id || "").toLowerCase() === "osas";

  if (isOsas) {
    return (
      <OSASOrganizationComplianceView
        showToast={props.showToast}
        onLogAction={props.onLogAction}
        officeId={props.officeId || props.authUser?.office_id || "osas"}
      />
    );
  }

  return <DigitizationComplianceContent {...props} />;
}

function DigitizationComplianceContent({
  showToast,
  onLogAction,
  officeId,
  authUser,
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [page, setPage] = useUrlPage({ enabled: true });

  const [kpiOrder, setKpiOrder] = useState(["completeness","students","complete"]);
  const [statusFilter, setStatusFilter] = useState(() => {
    const s = searchParams.get("status");
    return s === "Archived" ? "Archived" : "Active";
  });
  const [courseFilter, setCourseFilter] = useState(() => {
    const raw = searchParams.getAll("course").concat(searchParams.getAll("courseCode"));
    if (!raw.length) return [];
    return raw
      .flatMap((c) => c.split(","))
      .map((c) => c.trim())
      .filter(Boolean);
  });
  const [requireApproved, setRequireApproved] = useState(searchParams.get("approved") !== "0");

  const [courses, setCourses] = useState([]);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [manualLoading, setManualLoading] = useState(false);
  const [error, setError] = useState("");
  const [reportOpen, setReportOpen] = useState(false);
  const [pdfBlobUrl, setPdfPreviewUrl] = useState(null);
  const previewSession = usePdfPreviewSession();
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isExportingCsv, setIsExportingCsv] = useState(false);
  const [selectedKpi, setSelectedKpi] = useState(null);
  const statCardsRef = useRef(null);
  const [missingDialog, setMissingDialog] = useState(null);
  const loadController = useRef(null);

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

  const toggleCourseFilter = useCallback((courseCode) => {
    setCourseFilter((previous) => {
      const current = Array.isArray(previous) ? previous : [];
      return current.includes(courseCode)
        ? current.filter((code) => code !== courseCode)
        : [...current, courseCode];
    });
  }, []);

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

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/courses", { cache: "no-store" });
        const json = await res.json().catch(() => null);
        if (!res.ok || !json?.ok) throw new Error(json?.error || "Failed to load courses");
        const rows = Array.isArray(json.data) ? json.data : [];
        if (!cancelled) setCourses(rows);
      } catch {
        if (!cancelled) setCourses([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const buildQueryString = useCallback(() => {
    const params = new URLSearchParams();
    params.set("status", statusFilter);
    if (Array.isArray(courseFilter) && courseFilter.length > 0) {
      params.set("courseCode", courseFilter.join(","));
    }
    params.set("requireApproved", requireApproved ? "1" : "0");
    if (officeId) params.set("officeId", officeId);
    return params.toString();
  }, [statusFilter, courseFilter, requireApproved, officeId]);

  const load = useCallback(async (isManual = false) => {
    loadController.current?.abort();
    const controller = new AbortController();
    loadController.current = controller;
    if (isManual) setManualLoading(true);
    setLoading(true);
    setError("");
    try {
      const qs = buildQueryString();
      const [res] = await Promise.all([
        fetch(`/api/analytics/digitization-compliance?${qs}`, { cache: "no-store", signal: controller.signal }),
        isManual ? new Promise((resolve) => setTimeout(resolve, 600)) : Promise.resolve(),
      ]);
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || "Failed to load compliance data");
      }
      if (!controller.signal.aborted) setData(json.data);
    } catch (e) {
      if (controller.signal.aborted) return;
      setData(null);
      setError(e?.message || "Load failed");
      showToast?.(
        formatErrorMessage(e, {
          defaultTitle: "Compliance Data Load Failed",
        }),
        true
      );
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
        setManualLoading(false);
      }
    }
  }, [buildQueryString, showToast]);

  const openMissingStudents = useCallback((documentType) => setMissingDialog(documentType), []);

  useEffect(() => () => loadController.current?.abort(), []);

  const docTypeItems = useMemo(() => {
    return [...(data?.missingByDocumentType || [])].sort(
      (a, b) => b.missingStudents - a.missingStudents || a.documentType.localeCompare(b.documentType),
    );
  }, [data?.missingByDocumentType]);

  const firstLoadRef = useRef(true);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    // Always enforce the correct view
    const oldStatus = params.get("status") || "Active";
    const oldCourse = params.get("course") || "";
    const currentCourse = Array.isArray(courseFilter) ? courseFilter.join(",") : "";
    const oldApproved = params.get("approved") || "1";
    const currentView = params.get("view");

    // Only update if something actually changed
    const hasChanged =
        oldStatus !== statusFilter ||
        oldCourse !== currentCourse ||
        (oldApproved === "1") !== requireApproved ||
        currentView !== "digitization";

    if (hasChanged) {
        params.set("view", "digitization");
        params.set("status", statusFilter);
        if (currentCourse) params.set("course", currentCourse); else params.delete("course");
        params.set("approved", requireApproved ? "1" : "0");

        const newUrl = `${window.location.pathname}?${params.toString()}`;
        router.replace(newUrl, { scroll: false });
    }

    const delay = firstLoadRef.current ? 0 : 350;
    firstLoadRef.current = false;
    const id = setTimeout(() => {
      load();
    }, delay);
    return () => { clearTimeout(id); loadController.current?.abort(); };
  }, [statusFilter, courseFilter, requireApproved, load, router]);

  const summary = data?.summary;
  const meta = data?.meta;
  const byCourse = useMemo(() => Array.isArray(data?.byCourse) ? data.byCourse : [], [data]);

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

  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    setPage(1);
  }, [tableSearch, statusFilter, courseFilter, requireApproved, sortBy, sortOrder, pageSize, setPage]);

  const totalPages = Math.max(1, Math.ceil(sortedByCourse.length / pageSize));
  const paginatedByCourse = useMemo(() => {
    const startIndex = (page - 1) * pageSize;
    return sortedByCourse.slice(startIndex, startIndex + pageSize);
  }, [sortedByCourse, page, pageSize]);

  const {
    containerRef: tableContainerRef,
    isScrolledX,
    scrollLeft,
    scrollRight,
    resetScroll,
  } = useTableScroll([paginatedByCourse.length]);

  useEffect(() => {
    resetScroll();
  }, [page, tableSearch, courseFilter, requireApproved, sortBy, sortOrder, pageSize, resetScroll]);

  const handlePreview = async () => {
    if (!data || loading) return;
    setIsGeneratingPdf(true);
    const request = previewSession.begin();
    try {
      const blob = await generateDigitizationCompliancePdf(data, summary, meta, byCourse);
      const url = previewSession.createUrl(blob, request);
      if (!url) return;
      setPdfPreviewUrl(url);
      setReportOpen(true);
    } catch (e) {
      if (!previewSession.isCurrent(request)) return;
      console.error("PDF Preview generation failed:", e);
      showToast?.(
        formatErrorMessage(e, {
          defaultTitle: "Preview Failed",
        }),
        true
      );
    } finally {
      if (previewSession.isCurrent(request)) setIsGeneratingPdf(false);
    }
  }

  const handleDownloadPdf = async () => {
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
        showToast?.(
          formatErrorMessage(e, {
            defaultTitle: "Report Generation Failed",
          }),
          true
        );
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

      const q = (cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`;
      const row = (cells) => cells.map(q).join(",");

      const lines = [
        row(["System Analytics - Digitization Compliance Report", ""]),
        row(["Generated (server UTC)", meta?.generatedAt || ""]),
        row(["Student status filter", meta?.studentStatus || ""]),
        row(["Course filter", meta?.courseCode || (Array.isArray(courseFilter) && courseFilter.length > 0 ? courseFilter.join(", ") : "All")]),
        row(["Require approved only", meta?.requireApproved ? "Yes" : "No"]),
        row(["Requirement", meta?.definitions?.expectedCountFormula || ""]),
        "",
        row(["Summary Metrics", "Value"]),
        row(["Total students", summary.totalStudents ?? 0]),
        row(["Fully digitized students", summary.digitizedStudents ?? 0]),
        row(["Incomplete students", summary.notDigitizedStudents ?? 0]),
        row([
          "Average record completeness",
          summary.percentDigitized != null ? `${summary.percentDigitized}%` : "0%",
        ]),
        row(["Full Digitization Rate", summary.fullyDigitizedRate != null ? `${summary.fullyDigitizedRate}%` : "0%"]),
        row(["Total digitized files", summary.totalDigitizedDocsCount ?? 0]),
        row(["Total expected files", summary.totalExpectedDocsCount ?? 0]),
      ];

      if (byCourse.length > 0) {
        lines.push("");
        lines.push(row(["Course Program Breakdown", "", "", ""]));
        lines.push(row(["Course", "Total Students", "Fully Digitized", "Avg. Completeness"]));
        for (const r of byCourse) {
          lines.push(
            row([
              r.courseCode || "N/A",
              r.total ?? 0,
              r.digitized ?? 0,
              r.percent != null ? `${r.percent}%` : "0%",
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
    } catch {
       showToast?.({ title: "Export Failed", description: "An error occurred while exporting the compliance dataset to CSV." }, true);
    } finally {
      setIsExportingCsv(false);
    }
  }, [summary, meta, byCourse, courseFilter, onLogAction, showToast]);

  const handleClearAll = useCallback(() => {
    setStatusFilter("Active");
    setCourseFilter([]);
    setRequireApproved(true);
    setTableSearch("");
  }, []);

  const filterCriteriaGroups = useMemo(() => {
    return [
      {
        id: "status",
        label: "Student Status",
        options: [
          { id: "Active", label: "Active Students", dotColor: "bg-emerald-500" },
          { id: "Archived", label: "Archived Students", dotColor: "bg-gray-400" },
        ],
        selected: [statusFilter],
        onChange: (vals) => {
          if (vals.length === 0) {
            setStatusFilter("Active");
          } else {
            setStatusFilter(vals[vals.length - 1]);
          }
        }
      },
      {
        id: "course",
        label: "Academic Program",
        options: courses.map((c) => ({
          id: String(c.code || ""),
          label: c.code ? `${c.code}${c.name ? ` : ${c.name}` : ""}` : c.name || "Program",
        })),
        selected: Array.isArray(courseFilter) ? courseFilter : [],
        onChange: (vals) => {
          setCourseFilter(Array.isArray(vals) ? vals : []);
        }
      },
      {
        id: "approval",
        label: "Verification Requirement",
        options: [
          { id: "approved", label: "Approved Only", dotColor: "bg-emerald-500" },
        ],
        selected: requireApproved ? ["approved"] : [],
        onChange: (vals) => {
          setRequireApproved(vals.includes("approved"));
        }
      }
    ];
  }, [courses, statusFilter, courseFilter, requireApproved]);


  const hasActiveFilters = statusFilter !== "Active" || (Array.isArray(courseFilter) && courseFilter.length > 0) || !requireApproved || tableSearch !== "";

  return (
    <div className="flex flex-[1_0_auto] flex-col w-full gap-6 animate-fade-up font-jakarta">
      {/* Unified Single Card Container: Header, Metrics, Filters, Target Metrics & Program Breakdown Table */}
      <Card className="flex flex-[1_0_auto] h-auto w-full flex-col p-0 gap-0 overflow-visible rounded-2xl border border-border bg-white shadow-sm dark:border-border dark:bg-card dark:shadow-none isolate font-jakarta">
        <PageHeader
          icon="PieChartIcon"
          title="Compliance Analysis"
          description="Monitor digitization completeness."
          showBorder={false}
          className="p-6"
          titleClassName="text-[18px] font-semibold tracking-[-0.01em] text-gray-900 dark:text-zinc-50"
          descriptionClassName="text-[13px] font-normal text-gray-900 dark:text-zinc-300 mt-[4px]"
          actions={
            <div className="flex items-center gap-2">
              <RefreshButton
                onRefresh={() => load(true)}
                isLoading={manualLoading}
                title="Refresh Compliance Data"
              />



              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={downloadCsv}
                  disabled={loading || !data || isExportingCsv}
                  className="h-10 px-5 text-xs font-semibold rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-xs cursor-pointer active:scale-95 transition-all"
                >
                  {isExportingCsv ? (
                    <Loading01Icon size="1em"  className="animate-spin text-[16px]"></Loading01Icon>
                  ) : (
                    "Export CSV"
                  )}
                </Button>

                <Button
                  type="button"
                  onClick={handlePreview}
                  disabled={loading || !data || isGeneratingPdf}
                  className="h-10 px-5 cursor-pointer"
                >
                  {isGeneratingPdf ? (
                    <Loading01Icon size="1em"  className="animate-spin text-[16px] flex items-center justify-center"></Loading01Icon>
                  ) : (
                    PDF_ACTION_LABELS.preview
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
              <Reorder.Group as="div" axis="x" values={kpiOrder} onReorder={setKpiOrder} ref={statCardsRef} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 relative z-20">
            {kpiOrder.map(key => {
              if (key === "completeness") return (
              <Reorder.Item as="div" value="completeness" key="completeness" className={cn(selectedKpi === "completeness" ? "z-30" : "z-10")}>


                <div className={cn("relative group rounded-xl cursor-grab active:cursor-grabbing", selectedKpi === "completeness" ? "z-30" : "z-10")}>
                  <div
                    onClick={() => setSelectedKpi(selectedKpi === "completeness" ? null : "completeness")}
                    className={cn(
                      "relative overflow-hidden rounded-[18px] border cursor-pointer select-none transition-all shadow-none flex flex-col justify-between min-h-[110px] bg-gray-50 dark:bg-zinc-900",
                      selectedKpi === "completeness"
                        ? "border-red-500/50 ring-1 ring-red-500/20"
                        : "border-border dark:border-border"
                    )}
                  >
                    <div className="flex justify-between items-start p-4 pb-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[13px] font-medium text-gray-900 dark:text-zinc-300 capitalize">
                          Document Coverage
                        </span>
                        <TooltipProvider delayDuration={200}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <CovidInfoIcon size="1em"  className="cursor-help text-xs text-gray-400 hover:text-gray-600 dark:hover:text-zinc-300 transition-colors" />
                            </TooltipTrigger>
                            <TooltipContent
                              side="right"
                              className="max-w-[280px] bg-white dark:bg-zinc-900 text-gray-900 dark:text-zinc-100 p-3 rounded-xl shadow-xl border border-border dark:border-border text-xs font-normal"
                            >
                              <p className="font-semibold text-pup-maroon dark:text-red-400 mb-1">Digitization Formula</p>
                              <p className="leading-relaxed text-gray-600 dark:text-zinc-300 mb-2">
                                Percentage of expected mandatory documents uploaded across all active/selected students.
                              </p>
                              <div className="p-2 bg-gray-50 dark:bg-zinc-800/60 rounded-lg text-[11px] font-sans tabular-nums border border-border/60 dark:border-border">
                                (Digitized Docs / Expected Docs) × 100
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      <div className="w-8 h-8 rounded-[10px] flex items-center justify-center text-white shadow-sm shrink-0 bg-[#ef4444]">
                        <PieChartIcon size="1em" className="text-[15px]" />
                      </div>
                    </div>

                    <div className="flex justify-between items-end p-4 pt-1">
                      <div className="flex items-baseline gap-2">
                        <span className="text-[28px] font-bold text-gray-900 dark:text-white leading-none tracking-tight">
                          {summary?.percentDigitized ?? 0}%
                        </span>
                        <span className="text-[11px] font-medium text-gray-500 dark:text-zinc-400">
                          {(summary?.totalDigitizedDocsCount ?? 0).toLocaleString()} / {(summary?.totalExpectedDocsCount ?? 0).toLocaleString()} slots
                        </span>
                      </div>
                      <DragDropIcon size="1em" className="cursor-grab active:cursor-grabbing hover:text-black dark:hover:text-white text-gray-900 dark:text-zinc-300 text-xl mb-0.5" />
                    </div>
                  </div>

                  {/* Absolute details container */}
                  <div className={cn(
                    "absolute top-full left-0 right-0 z-[100] mt-2 rounded-xl border border-border bg-white p-4 shadow-xl dark:border-border dark:bg-zinc-900 transition-all duration-300 ease-in-out origin-top",
                    selectedKpi === "completeness" ? "scale-y-100 opacity-100 translate-y-0" : "scale-y-95 opacity-0 -translate-y-2 pointer-events-none"
                  )} onClick={(e) => e.stopPropagation()}>
                    <div className="space-y-3">
                      {summary && (
                        <>
                          <div className="grid grid-cols-2 gap-2">
                            <div className="bg-gray-50 dark:bg-zinc-800/60 p-2.5 rounded-lg border border-border dark:border-border">
                              <span className="block text-[9px] font-bold text-gray-600 dark:text-zinc-300 uppercase tracking-wider">Document Coverage</span>
                              <span className="text-lg font-black text-gray-900 dark:text-zinc-50">{summary.percentDigitized ?? 0}%</span>
                            </div>
                            <div className="bg-red-50 dark:bg-red-950/30 p-2.5 rounded-lg border border-red-100 dark:border-red-900/30">
                              <span className="block text-[9px] font-bold text-red-600 dark:text-red-400 uppercase tracking-wider">Digitized Files</span>
                              <span className="text-lg font-black text-red-700 dark:text-red-400">{summary.totalDigitizedDocsCount?.toLocaleString()}</span>
                            </div>
                          </div>

                          <div className="bg-gray-50 dark:bg-zinc-800/60 p-2.5 rounded-lg border border-border dark:border-border flex justify-between items-center text-xs">
                            <span className="font-semibold text-gray-600 dark:text-zinc-400">Expected Documents</span>
                            <span className="font-bold text-gray-900 dark:text-zinc-50">{summary.totalExpectedDocsCount?.toLocaleString()}</span>
                          </div>

                          {byCourse && byCourse.length > 0 && (
                            <div>
                              <h4 className="text-[10px] font-bold text-gray-400 dark:text-zinc-500 mb-1.5 uppercase tracking-wide">Course Document Coverage</h4>
                              <div className="max-h-32 overflow-y-auto space-y-1 pr-1">
                                {byCourse.map((c) => (
                                  <div key={c.courseCode} className="flex justify-between items-center text-[11px] py-1 border-b border-border dark:border-border text-gray-700 dark:text-zinc-300">
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

                              </Reorder.Item>
              );
              if (key === "students") return (
              <Reorder.Item as="div" value="students" key="students" className={cn(selectedKpi === "students" ? "z-30" : "z-10")}>

                <div className={cn("relative group rounded-xl cursor-grab active:cursor-grabbing", selectedKpi === "students" ? "z-30" : "z-10")}>
                  <div
                    onClick={() => setSelectedKpi(selectedKpi === "students" ? null : "students")}
                    className={cn(
                      "relative overflow-hidden rounded-[18px] border cursor-pointer select-none transition-all shadow-none flex flex-col justify-between min-h-[110px] bg-gray-50 dark:bg-zinc-900",
                      selectedKpi === "students"
                        ? "border-blue-500/50 ring-1 ring-blue-500/20"
                        : "border-border dark:border-border"
                    )}
                  >
                    <div className="flex justify-between items-start p-4 pb-0">
                      <span className="text-[13px] font-medium text-gray-900 dark:text-zinc-300 capitalize">
                        Students
                      </span>
                      <div className="w-8 h-8 rounded-[10px] flex items-center justify-center text-white shadow-sm shrink-0 bg-[#3b82f6]">
                        <UserSearch01Icon size="1em" className="text-[15px]" />
                      </div>
                    </div>

                    <div className="flex justify-between items-end p-4 pt-1">
                      <span className="text-[28px] font-bold text-gray-900 dark:text-white leading-none tracking-tight">
                        {summary?.totalStudents?.toLocaleString?.() ?? summary?.totalStudents ?? 0}
                      </span>
                      <DragDropIcon size="1em" className="cursor-grab active:cursor-grabbing hover:text-black dark:hover:text-white text-gray-900 dark:text-zinc-300 text-xl mb-0.5" />
                    </div>
                  </div>

                  {/* Absolute details container */}
                  <div className={cn(
                    "absolute top-full left-0 right-0 z-[100] mt-2 rounded-xl border border-border bg-white p-4 shadow-xl dark:border-border dark:bg-zinc-900 transition-all duration-300 ease-in-out origin-top",
                    selectedKpi === "students" ? "scale-y-100 opacity-100 translate-y-0" : "scale-y-95 opacity-0 -translate-y-2 pointer-events-none"
                  )} onClick={(e) => e.stopPropagation()}>
                    <div className="space-y-3">
                      {summary && (
                        <>
                          <div className="grid grid-cols-2 gap-2">
                            <div className="bg-gray-50 dark:bg-zinc-800/60 p-2.5 rounded-lg border border-border dark:border-border">
                              <span className="block text-[9px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-wider">Enrollment</span>
                              <span className="text-lg font-black text-gray-900 dark:text-zinc-50">{summary.totalStudents?.toLocaleString()}</span>
                            </div>
                            <div className="bg-blue-50 dark:bg-blue-950/30 p-2.5 rounded-lg border border-blue-100 dark:border-blue-900/30">
                              <span className="block text-[9px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">Digitized Students</span>
                              <span className="text-lg font-black text-blue-700 dark:text-blue-400">{summary.digitizedStudents?.toLocaleString()}</span>
                            </div>
                          </div>

                          <div className="bg-gray-50 dark:bg-zinc-800/60 p-2.5 rounded-lg border border-border dark:border-border flex justify-between items-center text-xs">
                            <span className="font-semibold text-gray-600 dark:text-zinc-400">Students not fully digitized</span>
                            <span className="font-bold text-amber-600 dark:text-amber-400">{summary.notDigitizedStudents?.toLocaleString()}</span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                              </Reorder.Item>
              );
              if (key === "complete") return (
              <Reorder.Item as="div" value="complete" key="complete" className={cn(selectedKpi === "complete" ? "z-30" : "z-10")}>

                <div className={cn("relative group rounded-xl cursor-grab active:cursor-grabbing", selectedKpi === "complete" ? "z-30" : "z-10")}>
                  <div
                    onClick={() => setSelectedKpi(selectedKpi === "complete" ? null : "complete")}
                    className={cn(
                      "relative overflow-hidden rounded-[18px] border cursor-pointer select-none transition-all shadow-none flex flex-col justify-between min-h-[110px] bg-gray-50 dark:bg-zinc-900",
                      selectedKpi === "complete"
                        ? "border-emerald-500/50 ring-1 ring-emerald-500/20"
                        : "border-border dark:border-border"
                    )}
                  >
                    <div className="flex justify-between items-start p-4 pb-0">
                      <span className="text-[13px] font-medium text-gray-900 dark:text-zinc-300 capitalize">
                        Students Fully Digitized
                      </span>
                      <div className="w-8 h-8 rounded-[10px] flex items-center justify-center text-white shadow-sm shrink-0 bg-[#22c55e]">
                        <CheckmarkCircle01Icon size="1em" className="text-[15px]" />
                      </div>
                    </div>

                    <div className="flex justify-between items-end p-4 pt-1">
                      <div className="flex items-baseline gap-2">
                        <span className="text-[25px] font-bold text-gray-900 dark:text-white leading-none tracking-tight">
                          {(summary?.fullyDigitizedStudents ?? summary?.digitizedStudents ?? 0).toLocaleString()} / {(summary?.totalStudents ?? 0).toLocaleString()}
                        </span>
                        <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400 mb-1">
                          {summary?.fullyDigitizedRate ?? 0}% complete
                        </span>
                      </div>
                      <DragDropIcon size="1em" className="cursor-grab active:cursor-grabbing hover:text-black dark:hover:text-white text-gray-900 dark:text-zinc-300 text-xl mb-0.5" />
                    </div>
                  </div>

                  {/* Absolute details container */}
                  <div className={cn(
                    "absolute top-full left-0 right-0 z-[100] mt-2 rounded-xl border border-border bg-white p-4 shadow-xl dark:border-border dark:bg-zinc-900 transition-all duration-300 ease-in-out origin-top",
                    selectedKpi === "complete" ? "scale-y-100 opacity-100 translate-y-0" : "scale-y-95 opacity-0 -translate-y-2 pointer-events-none"
                  )} onClick={(e) => e.stopPropagation()}>
                    <div className="space-y-3">
                      {summary && (
                        <>
                          <div className="grid grid-cols-2 gap-2">
                            <div className="bg-gray-50 dark:bg-zinc-800/60 p-2.5 rounded-lg border border-border dark:border-border">
                              <span className="block text-[9px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-wider">Fully Digitized</span>
                              <span className="text-lg font-black text-gray-900 dark:text-zinc-50">{(summary?.digitizedStudents ?? summary?.fullyDigitizedStudents ?? 0).toLocaleString()}</span>
                            </div>
                            <div className="bg-emerald-50 dark:bg-emerald-950/30 p-2.5 rounded-lg border border-emerald-100 dark:border-emerald-900/30">
                              <span className="block text-[9px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Completion Rate</span>
                              <span className="text-lg font-black text-emerald-700 dark:text-emerald-400">{summary?.fullyDigitizedRate ?? 0}%</span>
                            </div>
                          </div>

                          <div className="bg-gray-50 dark:bg-zinc-800/60 p-2.5 rounded-lg border border-border dark:border-border flex justify-between items-center text-xs">
                            <span className="font-semibold text-gray-600 dark:text-zinc-400">Students in current filter</span>
                            <span className="font-bold text-gray-900 dark:text-zinc-50">{summary.totalStudents?.toLocaleString?.() ?? 0}</span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                            </Reorder.Item>
              );
              return null;
            })}
            </Reorder.Group>

            </div>
          </div>
        ) : null}

        {/* Navigation Toolbar */}
        <div className="border-t border-border dark:border-border p-5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-gray-50/40 dark:bg-zinc-900/30 flex-wrap">
          {/* Search Input (Left side) */}
          <div className="relative flex-1 sm:w-64 min-w-[200px] max-w-sm group">
            <Search01Icon size="1em" className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-zinc-500 transition-colors group-focus-within:text-pup-maroon dark:group-focus-within:text-red-400 text-xs pointer-events-none" />
            <Input
              type="text"
              placeholder="Search Program"
              className="pl-8 pr-16 h-9 text-xs w-full bg-white dark:bg-zinc-800 border border-border dark:border-border rounded-xl text-gray-900 dark:text-zinc-100 placeholder:text-gray-400 dark:placeholder:text-zinc-500 shadow-none focus-visible:outline-none focus-visible:border-pup-maroon focus-visible:ring-1 focus-visible:ring-pup-maroon dark:focus-visible:border-red-500/80 dark:focus-visible:ring-red-500/80 transition-all"
              value={tableSearch}
              onChange={(e) => setTableSearch(e.target.value)}
            />
            <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-[11px] font-sans tabular-nums text-gray-400 dark:text-zinc-500">
              {sortedByCourse.length}
            </div>
          </div>

          {/* Filter controls (Right side) */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Multi-Criteria Filters (Status, Program, Requirement) */}
            <MultiCriteriaFilter
              groups={filterCriteriaGroups}
              align="end"
              buttonLabel="Filter Compliance"
            />

            {/* Validation Requirement Segmented Control */}
            <div className="flex items-center gap-1 bg-gray-100/80 dark:bg-zinc-800/60 p-1 rounded-xl border border-border/60 dark:border-border">
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
          <p className="basis-full text-[11px] leading-relaxed text-gray-500 dark:text-zinc-400">
            {requireApproved
              ? "Counts include approved documents only."
              : "Counts include pending and approved uploads; declined documents are excluded."}
          </p>
        </div>

        {/* Active Filter Chips Row */}
        {hasActiveFilters && (
          <ActiveFilterChips
            groups={[
              ...(statusFilter !== "Active"
                ? [
                    {
                      key: "status",
                      label: "Status",
                      values: [statusFilter],
                      onRemove: () => setStatusFilter("Active"),
                      formatValue: (val) => val
                    }
                  ]
                : []),
              ...(Array.isArray(courseFilter) && courseFilter.length > 0
                ? [
                    {
                      key: "course",
                      label: "Program",
                      values: courseFilter,
                      onRemove: (valToRemove) => {
                        setCourseFilter((prev) => prev.filter((c) => c !== valToRemove));
                      },
                      formatValue: (val) => val
                    }
                  ]
                : []),
              ...(requireApproved
                ? [
                    {
                      key: "requirement",
                      label: "Requirement",
                      values: ["Approved Only"],
                      onRemove: () => setRequireApproved(false),
                      formatValue: (val) => val
                    }
                  ]
                : [])
            ]}
            searchQuery={tableSearch}
            onClearSearch={() => setTableSearch("")}
            onClearAll={handleClearAll}
            className="border-t border-border dark:border-border bg-white dark:bg-card px-6 py-2.5"
          />
        )}

        {/* Calculation block skeletons or data */}
        <div className="p-6 border-t border-border dark:border-border">
          {loading && !data ? (
            <ComplianceCalcSkeleton />
          ) : !error && data ? (() => {
            const percent = summary?.totalExpectedDocsCount > 0
              ? Math.min(100, Math.round((summary?.totalDigitizedDocsCount / summary?.totalExpectedDocsCount) * 100))
              : 0;
            const fullyDigitizedCount = summary?.fullyDigitizedStudents ?? summary?.digitizedStudents ?? 0;
            return (
              <div className={cn(
                "transition-all duration-slow",
                (loading && !manualLoading) ? "opacity-40 blur-[1px] grayscale-[0.1]" : "opacity-100"
              )}>
                <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8 py-4 w-full bg-transparent border-0">

                  {/* Context & Formula */}
                  <div className="flex-1">
                    <div className="flex items-start gap-3">
                      <Target01Icon size="1em"  className="text-[16px] text-gray-400 dark:text-zinc-500 shrink-0 mt-1" />
                      <div>
                        <h3 className="text-[14px] font-semibold text-gray-900 tracking-[-0.01em] dark:text-zinc-50 m-0">
                          Digitization Progress
                        </h3>
                        <div className="text-[10px] font-medium text-gray-400 dark:text-zinc-500 tracking-[0.05em] uppercase mt-[2px]">
                          Requirement Basis
                        </div>
                        <p className="text-[12px] font-normal text-gray-900 dark:text-zinc-300 max-w-xl mt-[6px] mb-0">
                          {meta?.definitions?.expectedCountFormula || "All required documents based on program configuration."}
                        </p>
                        {meta?.generatedAt && (
                          <p className="mt-2 text-[11px] text-gray-500 dark:text-zinc-400">
                            Last updated {formatPHDateTime(meta.generatedAt)}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Progress Metrics Box */}
                  <div className="w-full lg:w-[400px] shrink-0">
                    <div className="flex items-end justify-between mb-2">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-medium text-gray-400 dark:text-zinc-500 tracking-[0.05em] mb-1">
                          Document Coverage
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
                          {percent}% of expected documents
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
                    <div className="mt-4 flex items-baseline justify-between gap-3 border-t border-border pt-3 dark:border-border">
                      <span className="text-[11px] font-medium text-gray-600 dark:text-zinc-300">
                        Students fully digitized
                      </span>
                      <span className="text-right text-[12px] font-semibold text-gray-900 dark:text-zinc-50">
                        {fullyDigitizedCount.toLocaleString()} / {summary?.totalStudents?.toLocaleString() || 0}
                        <span className="ml-1.5 font-medium text-emerald-700 dark:text-emerald-400">
                          ({summary?.fullyDigitizedRate ?? 0}%)
                        </span>
                      </span>
                    </div>
                  </div>
                </div>

                <section className="mt-7 border-t border-border pt-5 dark:border-border" aria-labelledby="missing-documents-title">
                  <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                    <div>
                    <h4 id="missing-documents-title" className="text-[13px] font-semibold text-gray-900 dark:text-zinc-100">
                      Missing Documents by Type
                    </h4>
                    <p className="mt-1 text-[11px] text-gray-600 dark:text-zinc-300">
                      Each required type is counted once per student. Counts follow the selected status and approval filters.
                    </p>
                    </div>
                    <Button variant="outline" size="sm" disabled={!meta?.configured || !summary?.notDigitizedStudents} onClick={() => openMissingStudents({ documentType: "All compliance requirements" })}>
                      View Incomplete Students
                    </Button>
                  </div>
                  {summary?.totalStudents === 0 || !Array.isArray(data.missingByDocumentType) || data.missingByDocumentType.length === 0 || docTypeItems.length === 0 ? (
                    <div className="rounded-2xl border border-border bg-gray-50/50 dark:bg-zinc-900/30">
                      <Empty variant="compact">
                        <EmptyHeader>
                          <EmptyMedia>{summary?.totalStudents === 0 ? hasActiveFilters ? <EmptySearch01Icon size="1em" /> : <EmptyUserGroupIcon size="1em" /> : <EmptyFiles01Icon size="1em" />}</EmptyMedia>
                          <EmptyTitle>
                            {summary?.totalStudents === 0
                              ? hasActiveFilters
                                ? "No Matching Students"
                                : "No Student Records Found"
                              : "No Document Types Configured"}
                          </EmptyTitle>
                          <EmptyDescription>
                            {summary?.totalStudents === 0
                              ? hasActiveFilters
                                ? "No students match the current filters. Adjust or reset your criteria to evaluate missing documents."
                                : "No student records are currently available to evaluate document compliance."
                              : "No active compliance document types are configured for this view."}
                          </EmptyDescription>
                        </EmptyHeader>
                        {summary?.totalStudents === 0 && hasActiveFilters && (
                          <EmptyContent>
                            <Button
                              type="button"
                              variant="outline"
                              onClick={handleClearAll}
                              title="Reset Filters"
                              className="mt-4 flex h-9 items-center justify-center rounded-xl border border-border dark:border-border bg-white dark:bg-zinc-800 px-4 text-xs font-semibold text-gray-700 dark:text-zinc-200 shadow-xs transition-all hover:bg-gray-50 dark:hover:bg-zinc-700 active:scale-95 cursor-pointer"
                            >
                              Reset Filters
                            </Button>
                          </EmptyContent>
                        )}
                      </Empty>
                    </div>
                  ) : (
                    <div className="divide-y divide-border rounded-xl border border-border dark:divide-border dark:border-border">
                      {docTypeItems.map((item) => (
                        <div
                          key={item.documentTypeId}
                          className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_auto_auto]"
                        >
                          <div className="min-w-0">
                            <div className="truncate text-[12px] font-medium text-gray-900 dark:text-zinc-100" title={item.documentType}>
                              {item.documentType}
                            </div>
                            <div className="mt-0.5 text-[11px] text-gray-600 dark:text-zinc-300">
                              {item.digitizedStudents.toLocaleString()} of {item.totalStudents.toLocaleString()} students have this document
                            </div>
                          </div>
                          <div className="text-right text-[12px] font-semibold text-gray-900 dark:text-zinc-100">
                            {item.missingStudents.toLocaleString()} missing
                          </div>
                          {item.missingStudents > 0 ? (
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => openMissingStudents(item)}
                              className="col-span-2 h-11 rounded-xl px-4 text-xs font-semibold sm:col-span-1"
                            >
                              View Missing Students
                            </Button>
                          ) : (
                            <span className="col-span-2 text-right text-[11px] font-medium text-emerald-700 dark:text-emerald-400 sm:col-span-1">
                              All present
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </div>
            );
          })() : null}
        </div>

        {/* Table / Empty / Error Area embedded in single card */}
        {loading && !data ? (
          <ComplianceTableSkeleton rowCount={6} embedded={true} />
        ) : error ? (
          <div className="flex flex-[1_0_auto] min-h-[420px] flex-col items-center justify-center border-t border-border dark:border-border bg-transparent text-center p-6 rounded-b-2xl">
            <Empty>
              <EmptyHeader>
                <EmptyMedia className="text-red-600 dark:text-red-400"><EmptyAlertCircleIcon size="1em" /></EmptyMedia>
                <EmptyTitle>Data Unavailable</EmptyTitle>
                <EmptyDescription>
                  {error}
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => load(true)}
                  className="flex h-10 items-center justify-center rounded-xl border border-border dark:border-border bg-white dark:bg-zinc-800 px-6 text-xs font-semibold text-gray-700 dark:text-zinc-200 shadow-xs transition-colors hover:bg-gray-50 dark:hover:bg-zinc-700 active:scale-95 cursor-pointer"
                >
                  Retry Loading
                </Button>
              </EmptyContent>
            </Empty>
          </div>
        ) : data ? (
          <div className={cn(
            "flex flex-[1_0_auto] flex-col min-h-0 overflow-hidden rounded-b-2xl border-t border-border dark:border-border",
            (loading && !manualLoading) ? "opacity-40 blur-[1px] grayscale-[0.1]" : "opacity-100"
          )}>
            <DataViewToolbar label="Program compliance table controls" className="justify-between gap-6 px-6 py-3.5 bg-gray-50/40 dark:bg-zinc-900/30 border-b border-border dark:border-border">
              <div className="flex items-center gap-2.5">
                <h4 className="text-xs font-semibold text-gray-900 dark:text-zinc-100 tracking-[-0.01em] m-0">
                  Program Breakdown
                </h4>
                <span className="text-[11px] font-sans tabular-nums text-gray-400 dark:text-zinc-500">
                  ({sortedByCourse.length} {sortedByCourse.length === 1 ? "program" : "programs"})
                </span>
              </div>
              <TableScrollControls scrollContainerRef={tableContainerRef}
                onScrollLeft={scrollLeft}
                onScrollRight={scrollRight}
                onResetScroll={resetScroll}
                isScrolled={isScrolledX}
              />
            </DataViewToolbar>

            <div
              ref={tableContainerRef}
              className="hidden w-full flex-[1_0_auto] overflow-x-auto show-scrollbar pb-2 sm:block"
            >
              {sortedByCourse.length > 0 ? (
                <Table columns={["text", "number", "number", "number"]} className="min-w-[850px]">
                  <thead className="sticky top-0 z-10 border-b border-border bg-gray-50/90 dark:bg-zinc-900/90 backdrop-blur-xs select-none">
                    <tr className="text-left text-xs font-semibold text-gray-500 dark:text-zinc-400">
                      <th
                        className={cn(
                          "p-4 px-6 w-[32%] min-w-[200px] sticky left-0 z-20 bg-gray-50/90 dark:bg-zinc-900/90 backdrop-blur-xs transition-shadow duration-200",
                          isScrolledX && "shadow-[4px_0_12px_-2px_rgba(0,0,0,0.06)] dark:shadow-[4px_0_12px_-2px_rgba(0,0,0,0.4)]"
                        )}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <button
                            onClick={() => handleSort("courseCode")}
                            className={cn(
                              "group flex items-center text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pup-maroon dark:focus-visible:ring-red-500 cursor-pointer",
                              sortBy === "courseCode" ? "text-gray-900 dark:text-white" : "text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white"
                            )}
                          >
                            Program <SortIndicator column="courseCode" sortBy={sortBy} sortOrder={sortOrder} />
                          </button>
                          {isScrolledX && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  type="button"
                                  onClick={resetScroll}
                                  className="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-white dark:bg-zinc-800 border border-border/80 text-pup-maroon dark:text-red-400 hover:bg-gray-100 dark:hover:bg-zinc-700 shadow-2xs cursor-pointer transition-all active:scale-95"
                                  aria-label="Reset scroll to start"
                                >
                                  <ReloadIcon size="1em" className="text-xs" />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent side="bottom">Reset Scroll to Start</TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                      </th>
                      <th className="p-4 px-6 w-[22%] text-center">
                        <button
                          onClick={() => handleSort("total")}
                          className={cn(
                            "group mx-auto flex items-center text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pup-maroon dark:focus-visible:ring-red-500 cursor-pointer",
                            sortBy === "total" ? "text-gray-900 dark:text-white" : "text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white"
                          )}
                        >
                          Total Students <SortIndicator column="total" sortBy={sortBy} sortOrder={sortOrder} />
                        </button>
                      </th>
                      <th className="p-4 px-6 w-[22%] text-center">
                        <button
                          onClick={() => handleSort("digitized")}
                          className={cn(
                            "group mx-auto flex items-center text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pup-maroon dark:focus-visible:ring-red-500 cursor-pointer",
                            sortBy === "digitized" ? "text-gray-900 dark:text-white" : "text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white"
                          )}
                        >
                          Fully Digitized <SortIndicator column="digitized" sortBy={sortBy} sortOrder={sortOrder} />
                        </button>
                      </th>
                      <th className="p-4 px-6 w-[24%] text-right">
                        <button
                          onClick={() => handleSort("percent")}
                          className={cn(
                            "group ml-auto flex items-center text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pup-maroon dark:focus-visible:ring-red-500 cursor-pointer",
                            sortBy === "percent" ? "text-gray-900 dark:text-white" : "text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white"
                          )}
                        >
                          Document Coverage <SortIndicator column="percent" sortBy={sortBy} sortOrder={sortOrder} />
                        </button>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-transparent divide-y divide-border dark:divide-border">
                    {paginatedByCourse.map((row) => {
                      const isSelected = Array.isArray(courseFilter) && courseFilter.includes(row.courseCode)
                      return (
                        <tr
                          key={row.courseCode}
                          className={cn(
                            "h-[48px] hover:bg-gray-50/70 dark:hover:bg-zinc-800/40 transition-colors group select-none",
                            isSelected && "bg-blue-50/60 dark:bg-blue-950/20"
                          )}
                        >
                        <td
                          className={cn(
                            "p-4 px-6 text-[13px] font-medium text-gray-900 dark:text-zinc-50 tracking-[-0.01em] sticky left-0 z-10 bg-white group-hover:bg-gray-50/70 dark:bg-card dark:group-hover:bg-zinc-800/80 transition-shadow duration-200 border-r border-border/70 dark:border-border/70",
                            isSelected && "bg-blue-50/60 dark:bg-blue-950/20 group-hover:bg-blue-50/80 dark:group-hover:bg-blue-950/40",
                            isScrolledX && "shadow-[4px_0_12px_-2px_rgba(0,0,0,0.06)] dark:shadow-[4px_0_12px_-2px_rgba(0,0,0,0.4)]"
                          )}
                        >
                          <button
                            type="button"
                            onClick={() => toggleCourseFilter(row.courseCode)}
                            aria-pressed={isSelected}
                            className="rounded-md text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pup-maroon dark:focus-visible:ring-red-500"
                            title={`${isSelected ? "Remove" : "Add"} ${row.courseCode} ${isSelected ? "from" : "as"} program filter`}
                          >
                            {row.courseCode || "N/A"}
                          </button>
                        </td>
                        <td className="p-4 px-6 text-[13px] font-normal text-gray-900 dark:text-zinc-50 text-center border-r border-border/70 dark:border-border/70">
                          {row.total?.toLocaleString?.() ?? row.total}
                        </td>
                        <td className="p-4 px-6 text-center text-[13px] font-normal border-r border-border/70 dark:border-border/70">
                          <span className={cn(
                            row.digitized === 0
                              ? "text-gray-400 dark:text-zinc-500"
                              : "text-gray-900 dark:text-zinc-50"
                          )}>
                            {row.digitized?.toLocaleString?.() ?? row.digitized} / {row.total?.toLocaleString?.() ?? row.total}
                          </span>
                          <span className="text-[10px] text-gray-500 font-medium ml-1.5 dark:text-zinc-400">
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
                      )
                    })}
                  </tbody>
                </Table>
              ) : (
                <div className="rounded-b-2xl flex-1 flex flex-col items-center justify-center min-h-[420px] w-full">
                  <Empty>
                    <EmptyHeader>
                      <EmptyMedia><EmptySearch01Icon size="1em" /></EmptyMedia>
                      <EmptyTitle>No data found</EmptyTitle>
                      <EmptyDescription>
                        {tableSearch
                          ? `No results found for "${tableSearch}".`
                          : "No student records available to analyze."}
                      </EmptyDescription>
                    </EmptyHeader>
                    {hasActiveFilters && (
                      <EmptyContent>
                        <Button
                          variant="outline"
                          onClick={handleClearAll}
                          title="Reset Filters"
                          className="flex h-10 items-center justify-center rounded-xl border border-border dark:border-border bg-white dark:bg-zinc-800 px-5 text-xs font-semibold text-gray-700 dark:text-zinc-200 shadow-xs transition-all hover:bg-gray-50 dark:hover:bg-zinc-700 active:scale-95 cursor-pointer"
                        >
                          Reset Filters
                        </Button>
                      </EmptyContent>
                    )}
                  </Empty>
                </div>
              )}
            </div>
            {sortedByCourse.length > 0 && (
              <div className="space-y-3 p-4 sm:hidden">
                {paginatedByCourse.map((row) => {
                  const isSelected = Array.isArray(courseFilter) && courseFilter.includes(row.courseCode);
                  return (
                    <article
                      key={row.courseCode}
                      className={cn(
                        "rounded-xl border border-border bg-white p-4 dark:border-border dark:bg-zinc-900",
                        isSelected && "border-blue-300 bg-blue-50/60 dark:border-blue-900 dark:bg-blue-950/20",
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => toggleCourseFilter(row.courseCode)}
                        aria-pressed={isSelected}
                        className="flex min-h-11 w-full items-center justify-between gap-3 rounded-lg text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pup-maroon dark:focus-visible:ring-red-500"
                      >
                        <span className="text-sm font-semibold text-gray-900 dark:text-zinc-100">{row.courseCode || "N/A"}</span>
                        <span className="text-[11px] font-medium text-pup-maroon dark:text-red-400">
                          {isSelected ? "Filtered" : "Filter"}
                        </span>
                      </button>
                      <div className="mt-3 grid grid-cols-3 gap-2 border-t border-border pt-3 dark:border-border">
                        <div>
                          <div className="text-[10px] text-gray-500 dark:text-zinc-400">Students</div>
                          <div className="mt-0.5 text-xs font-semibold text-gray-900 dark:text-zinc-100">{row.total?.toLocaleString?.() ?? row.total}</div>
                        </div>
                        <div>
                          <div className="text-[10px] text-gray-500 dark:text-zinc-400">Fully digitized</div>
                          <div className="mt-0.5 text-xs font-semibold text-gray-900 dark:text-zinc-100">
                            {row.digitized?.toLocaleString?.() ?? row.digitized} <span className="font-normal text-gray-500">({row.fullyDigitizedRate}%)</span>
                          </div>
                        </div>
                        <div>
                          <div className="text-[10px] text-gray-500 dark:text-zinc-400">Coverage</div>
                          <div className="mt-0.5 text-xs font-semibold text-gray-900 dark:text-zinc-100">{row.percent ?? 0}%</div>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}

            {/* Standard Table Pagination Footer */}
            <TablePagination label="Program compliance pages" page={page} pageSize={pageSize} totalCount={sortedByCourse.length} displayedCount={paginatedByCourse.length} onPageChange={setPage} onPageSizeChange={setPageSize} />
          </div>
        ) : null}
      </Card>

      <ComplianceStudentsSheet
        open={Boolean(missingDialog)}
        onClose={() => setMissingDialog(null)}
        documentType={missingDialog}
        filters={{ status: statusFilter, courseCode: courseFilter, requireApproved: requireApproved ? "1" : "0", officeId }}
      />

      <PDFPreviewModal
        open={reportOpen}
        onClose={() => {
          previewSession.cancel();
          setIsGeneratingPdf(false);
          setPdfPreviewUrl(null);
          setReportOpen(false);
        }}
        title="Compliance Report Preview"
        description="Review the generated document before downloading. Ensure all records and rates are correctly captured."
        pdfUrl={pdfBlobUrl}
        isPreparing={isGeneratingPdf}
        onDownload={handleDownloadPdf}
        onPrint={() => onLogAction?.({
          action: "Print Report",
          details: "opened print dialog for the physical record compliance report",
          entityType: "Report",
        })}
        onPrintError={(error) => showToast?.(formatErrorMessage(error, { defaultTitle: "Report Printing Failed" }), true)}
      />
    </div>
  );
}
