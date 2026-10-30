"use client";
import HugeIcon from "@/components/shared/HugeIcon";
import useUrlPage from "@/hooks/useUrlPage";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
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

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import PageHeader from "@/components/shared/PageHeader";
import { RefreshButton } from "@/components/shared/RefreshButton";
import MultiCriteriaFilter from "@/components/shared/MultiCriteriaFilter";
import ActiveFilterChips from "@/components/shared/ActiveFilterChips";
import TableScrollControls from "@/components/shared/TableScrollControls";
import useTableScroll from "@/hooks/useTableScroll";
import OSASOrganizationComplianceView from "./OSASOrganizationComplianceView";
import ProfileAvatar from "@/components/shared/ProfileAvatar";

function SortIndicator({ column, sortBy, sortOrder }) {
  if (sortBy !== column) {
    return (
      <HugeIcon className="ph-bold ph-caret-up-down ml-1 text-[12px] text-gray-400 dark:text-zinc-500 opacity-0 group-hover:opacity-100 transition-opacity" />
    );
  }
  return sortOrder === "asc" ? (
    <HugeIcon className="ph-bold ph-caret-up ml-1 text-[12px] text-pup-maroon dark:text-primary" />
  ) : (
    <HugeIcon className="ph-bold ph-caret-down ml-1 text-[12px] text-pup-maroon dark:text-primary" />
  );
}

/**
 * Standard Information Row (label : value)
 * Clean metadata layout aligned with colons and icons.
 */
function InfoRow({ icon, label, value, children, className }) {
  return (
    <div
      className={cn(
        "grid grid-cols-[135px_12px_1fr] sm:grid-cols-[150px_14px_1fr] items-start gap-1 text-xs py-1.5 border-b border-gray-100/70 dark:border-zinc-800/50 last:border-0",
        className
      )}
    >
      <div className="text-gray-500 dark:text-zinc-400 font-medium flex items-center gap-2 truncate">
        {icon && (
          <span className="text-gray-400 dark:text-zinc-500 text-sm shrink-0 flex items-center">
            {icon}
          </span>
        )}
        <span className="truncate">{label}</span>
      </div>
      <span className="text-gray-300 dark:text-zinc-600 select-none">:</span>
      <div className="text-gray-900 dark:text-zinc-100 font-semibold break-words min-w-0">
        {children ?? (value || <span className="text-gray-400 font-normal italic">None</span>)}
      </div>
    </div>
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
  const pdfPreviewFrameRef = useRef(null);
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
  const [requireApproved, setRequireApproved] = useState(searchParams.get("approved") === "1");

  const [courses, setCourses] = useState([]);
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
  const [missingDialog, setMissingDialog] = useState(null);
  const [missingStudentsData, setMissingStudentsData] = useState(null);
  const [missingStudentsLoading, setMissingStudentsLoading] = useState(false);
  const [missingStudentsError, setMissingStudentsError] = useState("");

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
        formatErrorMessage(e, {
          defaultTitle: "Compliance Data Load Failed",
        }),
        true
      );
    } finally {
      setLoading(false);
      setManualLoading(false);
    }
  }, [buildQueryString, showToast]);

  const loadMissingStudents = useCallback(async (documentType, offset = 0) => {
    if (!documentType) return;
    setMissingStudentsLoading(true);
    setMissingStudentsError("");
    try {
      const params = new URLSearchParams({
        documentTypeId: String(documentType.documentTypeId),
        status: statusFilter,
        limit: "20",
        offset: String(offset),
      });
      if (Array.isArray(courseFilter) && courseFilter.length) {
        params.set("courseCode", courseFilter.join(","));
      }
      if (requireApproved) params.set("requireApproved", "1");
      if (officeId) params.set("officeId", officeId);

      const response = await fetch(
        `/api/analytics/digitization-compliance/missing-students?${params}`,
        { cache: "no-store" },
      );
      const json = await response.json().catch(() => null);
      if (!response.ok || !json?.ok) {
        throw new Error(json?.error || "Failed to load students missing this document");
      }
      setMissingStudentsData(json.data);
    } catch (loadError) {
      setMissingStudentsData(null);
      setMissingStudentsError(loadError?.message || "Failed to load students");
    } finally {
      setMissingStudentsLoading(false);
    }
  }, [courseFilter, officeId, requireApproved, statusFilter]);

  const openMissingStudents = useCallback((documentType) => {
    setMissingDialog(documentType);
    setMissingStudentsData(null);
    loadMissingStudents(documentType);
  }, [loadMissingStudents]);

  const docTypeItems = useMemo(() => {
    return [...(data?.missingByDocumentType || [])].sort(
      (a, b) => b.missingStudents - a.missingStudents || a.documentType.localeCompare(b.documentType),
    );
  }, [data?.missingByDocumentType]);

  const currentDocIndex = useMemo(() => {
    if (!missingDialog) return -1;
    return docTypeItems.findIndex(
      (item) => item.documentTypeId === missingDialog.documentTypeId || item.documentType === missingDialog.documentType
    );
  }, [docTypeItems, missingDialog]);

  const totalDocCount = docTypeItems.length;

  const handleNavigatePrevDoc = useCallback(() => {
    if (currentDocIndex > 0) {
      const prevDoc = docTypeItems[currentDocIndex - 1];
      openMissingStudents(prevDoc);
    }
  }, [currentDocIndex, docTypeItems, openMissingStudents]);

  const handleNavigateNextDoc = useCallback(() => {
    if (currentDocIndex < totalDocCount - 1) {
      const nextDoc = docTypeItems[currentDocIndex + 1];
      openMissingStudents(nextDoc);
    }
  }, [currentDocIndex, totalDocCount, docTypeItems, openMissingStudents]);

  const firstLoadRef = useRef(true);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    
    // Always enforce the correct view
    const oldStatus = params.get("status") || "Active";
    const oldCourse = params.get("course") || "";
    const currentCourse = Array.isArray(courseFilter) ? courseFilter.join(",") : "";
    const oldApproved = params.get("approved") || "0";
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
    try {
      const blob = await generateDigitizationCompliancePdf(data, summary, meta, byCourse);
      const url = URL.createObjectURL(blob);
      setPdfPreviewUrl(url);
      setReportOpen(true);
    } catch (e) {
      console.error("PDF Preview generation failed:", e);
      showToast?.(
        formatErrorMessage(e, {
          defaultTitle: "Preview Failed",
        }),
        true
      );
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

  const handlePrintReport = () => {
    const printWindow = pdfPreviewFrameRef.current?.contentWindow;
    if (!printWindow || !previewFrameReady) {
      showToast?.({ title: "Report Not Ready", description: "Wait for the report preview to finish loading, then try printing." }, true);
      return;
    }

    try {
      printWindow.focus();
      printWindow.print();
      onLogAction?.({
        action: "Print Report",
        details: "opened print dialog for the physical record compliance report",
        entityType: "Report",
      });
    } catch (e) {
      console.error("Compliance report printing failed:", e);
      showToast?.(formatErrorMessage(e, { defaultTitle: "Report Printing Failed" }), true);
    }
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
    setRequireApproved(false);
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


  const hasActiveFilters = statusFilter !== "Active" || (Array.isArray(courseFilter) && courseFilter.length > 0) || requireApproved || tableSearch !== "";

  return (
    <div className="flex flex-[1_0_auto] flex-col w-full gap-6 animate-fade-up font-jakarta">
      {/* Unified Single Card Container: Header, Metrics, Filters, Target Metrics & Program Breakdown Table */}
      <Card className="flex flex-[1_0_auto] h-auto w-full flex-col p-0 gap-0 overflow-visible rounded-2xl border border-border bg-white shadow-sm dark:border-border dark:bg-card dark:shadow-none isolate font-jakarta">
        <PageHeader
          icon="ph-chart-pie"
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
                    <HugeIcon  className="ph-bold ph-spinner animate-spin text-[16px]"></HugeIcon>
                  ) : (
                    "Export CSV"
                  )}
                </Button>

                <Button
                  type="button"
                  onClick={handlePreview}
                  disabled={loading || !data || isGeneratingPdf}
                  className="h-10 px-5 text-xs font-semibold rounded-xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-900 shadow-xs cursor-pointer active:scale-95 transition-all"
                >
                  {isGeneratingPdf ? (
                    <HugeIcon  className="ph-bold ph-spinner animate-spin text-[16px] flex items-center justify-center"></HugeIcon>
                  ) : (
                    "Export PDF Report"
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
                              <HugeIcon  className="ph-bold ph-info cursor-help text-xs text-gray-400 hover:text-gray-600 dark:hover:text-zinc-300 transition-colors" />
                            </TooltipTrigger>
                            <TooltipContent 
                              side="right" 
                              className="max-w-[280px] bg-white dark:bg-zinc-900 text-gray-900 dark:text-zinc-100 p-3 rounded-xl shadow-xl border border-border dark:border-border text-xs font-normal"
                            >
                              <p className="font-semibold text-pup-maroon dark:text-red-400 mb-1">Digitization Formula</p>
                              <p className="leading-relaxed text-gray-600 dark:text-zinc-300 mb-2">
                                Percentage of expected mandatory documents uploaded across all active/selected students.
                              </p>
                              <div className="p-2 bg-gray-50 dark:bg-zinc-800/60 rounded-lg text-[11px] font-mono border border-border/60 dark:border-border">
                                (Digitized Docs / Expected Docs) × 100
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      <div className="w-8 h-8 rounded-[10px] flex items-center justify-center text-white shadow-sm shrink-0 bg-[#ef4444]">
                        <HugeIcon className="ph-bold text-[15px] ph-pie-chart" />
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
                      <HugeIcon className="ph-bold ph-dots-six-vertical cursor-grab active:cursor-grabbing hover:text-black dark:hover:text-white text-gray-900 dark:text-zinc-300 text-xl mb-0.5" />
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
                        <HugeIcon className="ph-bold text-[15px] ph-users" />
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-end p-4 pt-1">
                      <span className="text-[28px] font-bold text-gray-900 dark:text-white leading-none tracking-tight">
                        {summary?.totalStudents?.toLocaleString?.() ?? summary?.totalStudents ?? 0}
                      </span>
                      <HugeIcon className="ph-bold ph-dots-six-vertical cursor-grab active:cursor-grabbing hover:text-black dark:hover:text-white text-gray-900 dark:text-zinc-300 text-xl mb-0.5" />
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
                        <HugeIcon className="ph-bold text-[15px] ph-check-circle" />
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
                      <HugeIcon className="ph-bold ph-dots-six-vertical cursor-grab active:cursor-grabbing hover:text-black dark:hover:text-white text-gray-900 dark:text-zinc-300 text-xl mb-0.5" />
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
            <HugeIcon className="ph-bold ph-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-zinc-500 transition-colors group-focus-within:text-pup-maroon dark:group-focus-within:text-red-400 text-xs pointer-events-none" />
            <Input
              type="text"
              placeholder="Search Program"
              className="pl-8 pr-16 h-9 text-xs w-full bg-white dark:bg-zinc-800 border border-border dark:border-border rounded-xl text-gray-900 dark:text-zinc-100 placeholder:text-gray-400 dark:placeholder:text-zinc-500 shadow-none focus-visible:outline-none focus-visible:border-pup-maroon focus-visible:ring-1 focus-visible:ring-pup-maroon dark:focus-visible:border-red-500/80 dark:focus-visible:ring-red-500/80 transition-all"
              value={tableSearch}
              onChange={(e) => setTableSearch(e.target.value)}
            />
            <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-[11px] font-mono text-gray-400 dark:text-zinc-500">
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
                      <HugeIcon  className="ph-bold ph-target text-[16px] text-gray-400 dark:text-zinc-500 shrink-0 mt-1" />
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
                  <div className="mb-3">
                    <h4 id="missing-documents-title" className="text-[13px] font-semibold text-gray-900 dark:text-zinc-100">
                      Missing Documents by Type
                    </h4>
                    <p className="mt-1 text-[11px] text-gray-600 dark:text-zinc-300">
                      Each required type is counted once per student. Counts follow the selected status and approval filters.
                    </p>
                  </div>
                  {summary?.totalStudents === 0 || !Array.isArray(data.missingByDocumentType) || data.missingByDocumentType.length === 0 || docTypeItems.length === 0 ? (
                    <div className="py-10 px-4 rounded-xl border border-border bg-gray-50/50 dark:border-border dark:bg-zinc-900/30 flex flex-col items-center justify-center text-center">
                      <Empty className="flex flex-col items-center justify-center border-0 bg-transparent text-center">
                        <EmptyHeader className="flex flex-col items-center gap-0">
                          <div className="relative mb-4">
                            <div className="absolute inset-0 scale-150 animate-pulse rounded-full bg-gray-100/60 opacity-50 dark:bg-zinc-800/40"></div>
                            <EmptyMedia className="relative z-10 flex h-16 w-16 items-center justify-center rounded-2xl border border-border bg-white shadow-sm dark:border-border dark:bg-card dark:shadow-none">
                              <HugeIcon
                                className={cn(
                                  "ph-duotone text-2xl text-gray-400 dark:text-zinc-500",
                                  summary?.totalStudents === 0
                                    ? hasActiveFilters
                                      ? "ph-magnifying-glass"
                                      : "ph-users"
                                    : "ph-files"
                                )}
                              />
                            </EmptyMedia>
                          </div>
                          <EmptyTitle className="text-sm font-semibold text-gray-900 dark:text-zinc-50">
                            {summary?.totalStudents === 0
                              ? hasActiveFilters
                                ? "No Matching Students"
                                : "No Student Records Found"
                              : "No Document Types Configured"}
                          </EmptyTitle>
                          <EmptyDescription className="mt-1 max-w-xs text-xs font-normal text-gray-600 dark:text-zinc-400">
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
            <Empty className="flex flex-col items-center justify-center border-0 text-center text-gray-900 dark:text-zinc-300">
              <EmptyHeader className="flex flex-col items-center gap-0">
                <div className="relative mb-6">
                  <div className="absolute inset-0 scale-150 animate-pulse rounded-full bg-gray-50 opacity-50 dark:bg-card"></div>
                  <EmptyMedia className="relative z-10 flex h-24 w-24 items-center justify-center rounded-3xl border border-border bg-white shadow-xl dark:border-border dark:bg-card dark:shadow-none">
                    <HugeIcon className="ph-duotone ph-warning-circle text-3xl text-pup-maroon dark:text-primary" />
                  </EmptyMedia>
                </div>
                <EmptyTitle className="text-lg font-semibold text-gray-900 dark:text-zinc-50">Data Unavailable</EmptyTitle>
                <EmptyDescription className="mt-1 max-w-md text-sm font-medium text-gray-600 dark:text-zinc-300">
                  {error}
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => load(true)}
                  className="mt-6 flex h-10 items-center justify-center rounded-xl border border-border dark:border-border bg-white dark:bg-zinc-800 px-6 text-xs font-semibold text-gray-700 dark:text-zinc-200 shadow-xs transition-colors hover:bg-gray-50 dark:hover:bg-zinc-700 active:scale-95 cursor-pointer" 
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
            <div className="flex items-center justify-between gap-6 px-6 py-3.5 bg-gray-50/40 dark:bg-zinc-900/30 border-b border-border dark:border-border">
              <div className="flex items-center gap-2.5">
                <h4 className="text-xs font-semibold text-gray-900 dark:text-zinc-100 tracking-[-0.01em] m-0">
                  Program Breakdown
                </h4>
                <span className="text-[11px] font-mono text-gray-400 dark:text-zinc-500">
                  ({sortedByCourse.length} {sortedByCourse.length === 1 ? "program" : "programs"})
                </span>
              </div>
              <TableScrollControls
                onScrollLeft={scrollLeft}
                onScrollRight={scrollRight}
                onResetScroll={resetScroll}
                isScrolled={isScrolledX}
              />
            </div>

            <div
              ref={tableContainerRef}
              className="hidden w-full flex-[1_0_auto] overflow-x-auto show-scrollbar pb-2 sm:block"
            >
              {sortedByCourse.length > 0 ? (
                <table className="w-full text-sm border-collapse min-w-[850px]">
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
                                  <HugeIcon className="ph-bold ph-arrow-counter-clockwise text-xs" />
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
                </table>
              ) : (
                <div className="py-16 rounded-b-2xl flex-1 flex flex-col items-center justify-center min-h-[420px] w-full">
                  <Empty className="flex h-full flex-col items-center justify-center border-0 bg-transparent text-center">
                    <EmptyHeader className="flex flex-col items-center gap-0">
                      <div className="relative mb-6">
                        <div className="absolute inset-0 scale-150 animate-pulse rounded-full bg-gray-50 opacity-50 dark:bg-card"></div>
                        <EmptyMedia className="relative z-10 flex h-24 w-24 items-center justify-center rounded-3xl border border-border bg-white shadow-xl dark:border-border dark:bg-card dark:shadow-none">
                          <HugeIcon className="ph-duotone ph-magnifying-glass text-3xl text-gray-400 dark:text-zinc-500" />
                        </EmptyMedia>
                      </div>
                      <EmptyTitle className="text-xl font-semibold text-gray-900 dark:text-zinc-50">No data found</EmptyTitle>
                      <EmptyDescription className="max-w-xs text-sm font-medium text-gray-900 dark:text-zinc-300 mt-1">
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
                          className="mt-6 flex h-10 items-center justify-center rounded-xl border border-border dark:border-border bg-white dark:bg-zinc-800 px-5 text-xs font-semibold text-gray-700 dark:text-zinc-200 shadow-xs transition-all hover:bg-gray-50 dark:hover:bg-zinc-700 active:scale-95 cursor-pointer"
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
            {sortedByCourse.length > 0 && (
              <div className="mt-auto flex items-center justify-between border-t border-[#e5e5ea] dark:border-[#3a3a3c] bg-white dark:bg-[#1c1c1e] p-4 px-6 rounded-b-2xl">
                <div className="flex items-center gap-6 text-xs text-gray-900 dark:text-zinc-300 select-none">
                  <span>
                    Showing {paginatedByCourse.length} of {sortedByCourse.length.toLocaleString()}
                  </span>
                  <div className="flex items-center gap-2">
                    <span>Rows:</span>
                    {[10, 20, 50, 100].map((size) => (
                      <button
                        key={size}
                        type="button"
                        onClick={() => {
                          setPageSize(size);
                          setPage(1);
                        }}
                        className={cn(
                          "px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer",
                          pageSize === size
                            ? "bg-gray-100 dark:bg-zinc-800 text-gray-900 dark:text-zinc-100"
                            : "text-gray-400 hover:text-gray-600 dark:hover:text-zinc-200"
                        )}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2 select-none">
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="text-xs text-gray-900 dark:text-zinc-300 disabled:opacity-40 cursor-pointer rounded-xl h-8 px-3"
                  >
                    Prev
                  </Button>

                  <div className="h-8 w-8 rounded-xl border border-[#e5e5ea] dark:border-border flex items-center justify-center text-xs font-bold text-gray-800 dark:text-zinc-200 bg-white dark:bg-zinc-900">
                    {page}
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    className="text-xs text-gray-900 dark:text-zinc-300 disabled:opacity-40 cursor-pointer rounded-xl h-8 px-3"
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </div>
        ) : null}
      </Card>

      <Sheet
        open={Boolean(missingDialog)}
        onOpenChange={(open) => {
          if (!open) {
            setMissingDialog(null);
            setMissingStudentsData(null);
            setMissingStudentsError("");
          }
        }}
      >
        <SheetContent
          side="right"
          size="default"
          showCloseButton={false}
          className="w-full sm:max-w-md md:max-w-lg lg:max-w-xl p-0 flex flex-col h-full bg-white dark:bg-card border-l border-border dark:border-border"
        >
          {/* Reference Header */}
          <SheetHeader className="shrink-0 p-0 border-b border-border dark:border-border bg-white dark:bg-card">
            <div className="flex items-center justify-between px-6 py-4">
              <div>
                <SheetTitle className="text-base font-bold text-gray-900 dark:text-zinc-50 tracking-tight">
                  Compliance Deficiency Details
                </SheetTitle>
                <SheetDescription className="sr-only">
                  List of students missing {missingDialog?.documentType || "this document"}
                </SheetDescription>
              </div>
              <div className="flex items-center gap-2">
                {totalDocCount > 1 && currentDocIndex !== -1 && (
                  <div className="flex items-center gap-1.5 mr-1">
                    <div className="flex items-center gap-0.5">
                      <button
                        type="button"
                        disabled={currentDocIndex <= 0}
                        onClick={handleNavigatePrevDoc}
                        aria-label="Previous document type"
                        className="w-7 h-7 rounded-lg border border-border/80 dark:border-border flex items-center justify-center hover:bg-gray-100 dark:hover:bg-zinc-800 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
                      >
                        <HugeIcon className="ph-bold ph-caret-left text-xs" />
                      </button>
                      <button
                        type="button"
                        disabled={currentDocIndex >= totalDocCount - 1}
                        onClick={handleNavigateNextDoc}
                        aria-label="Next document type"
                        className="w-7 h-7 rounded-lg border border-border/80 dark:border-border flex items-center justify-center hover:bg-gray-100 dark:hover:bg-zinc-800 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
                      >
                        <HugeIcon className="ph-bold ph-caret-right text-xs" />
                      </button>
                    </div>
                    <span className="font-mono text-[11px] font-medium text-gray-500 dark:text-zinc-400 select-none px-1">
                      {String(currentDocIndex + 1).padStart(2, "0")} of {String(totalDocCount).padStart(2, "0")}
                    </span>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setMissingDialog(null);
                    setMissingStudentsData(null);
                    setMissingStudentsError("");
                  }}
                  aria-label="Close"
                  className="w-8 h-8 rounded-xl bg-gray-100/90 hover:bg-gray-200/90 dark:bg-zinc-800/80 dark:hover:bg-zinc-700/80 text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-zinc-100 flex items-center justify-center transition-all cursor-pointer active:scale-95 border border-black/5 dark:border-white/10 shadow-2xs"
                >
                  <HugeIcon className="ph-bold ph-x text-xs" />
                  <span className="sr-only">Close</span>
                </button>
              </div>
            </div>
          </SheetHeader>

          {/* Line-Attached Edge-to-Edge Status Notice */}
          {missingDialog && (
            <div
              className={cn(
                "flex items-center gap-2.5 px-6 py-2.5 text-xs border-b transition-colors shrink-0",
                (missingDialog?.missingStudents || 0) === 0
                  ? "border-emerald-200/90 bg-emerald-50/90 text-emerald-950 dark:border-emerald-900/40 dark:bg-emerald-950/25 dark:text-emerald-200"
                  : "border-amber-200/90 bg-amber-50/90 text-amber-950 dark:border-amber-900/40 dark:bg-amber-950/25 dark:text-amber-200"
              )}
            >
              <HugeIcon
                className={cn(
                  "ph-bold text-[15px] shrink-0",
                  (missingDialog?.missingStudents || 0) === 0
                    ? "ph-shield-check text-emerald-600 dark:text-emerald-400"
                    : "ph-warning-circle text-amber-600 dark:text-amber-400"
                )}
              />
              <span className="font-medium text-[11.5px] sm:text-xs leading-normal">
                <strong className="font-semibold">
                  {(missingDialog?.missingStudents || 0) === 0
                    ? "Full Compliance Achieved:"
                    : "Compliance Deficiency Detected:"}
                </strong>{" "}
                {(missingDialog?.missingStudents || 0) === 0
                  ? "All enrolled student records possess verified digitized files for this document type."
                  : `${(missingDialog?.missingStudents || 0).toLocaleString()} student records require digitization and archival filing.`}
              </span>
            </div>
          )}

          {/* Unboxed Single-Column Body */}
          <div className="flex-1 overflow-y-auto min-h-0 divide-y divide-border/60 dark:divide-white/5">
            {/* Summary Strip (Unboxed) */}
            <div className="p-6 pb-4 border-b border-border/80 dark:border-border">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
                  <HugeIcon className="ph-duotone ph-file-dashed text-2xl" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-base font-bold text-gray-900 dark:text-zinc-100 tracking-tight truncate">
                      {missingDialog?.documentType || "Document Type"}
                    </h2>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide uppercase bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800/60">
                      {(missingDialog?.missingStudents ?? 0).toLocaleString()} Missing
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">
                    {(missingDialog?.digitizedStudents ?? 0).toLocaleString()} of {(missingDialog?.totalStudents ?? 0).toLocaleString()} students digitized ({Math.round(((missingDialog?.digitizedStudents || 0) / (missingDialog?.totalStudents || 1)) * 100)}% compliance)
                  </p>
                </div>
              </div>
            </div>

            {/* Document Specification (Standard InfoRow list) */}
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-gray-900 dark:text-zinc-100 tracking-wider uppercase">
                <HugeIcon className="ph-bold ph-info text-pup-maroon text-sm" />
                Compliance Specification
              </div>
              <div className="space-y-2.5">
                <InfoRow
                  icon={<HugeIcon className="ph-bold ph-users text-gray-400 dark:text-zinc-500" />}
                  label="Total Enrolled"
                  value={<span className="font-semibold text-gray-900 dark:text-zinc-100">{(missingDialog?.totalStudents || 0).toLocaleString()} students</span>}
                />
                <InfoRow
                  icon={<HugeIcon className="ph-bold ph-check-circle text-gray-400 dark:text-zinc-500" />}
                  label="Digitized Records"
                  value={<span className="font-semibold text-emerald-600 dark:text-emerald-400">{(missingDialog?.digitizedStudents || 0).toLocaleString()} archived</span>}
                />
                <InfoRow
                  icon={<HugeIcon className="ph-bold ph-warning-circle text-gray-400 dark:text-zinc-500" />}
                  label="Deficiency Gap"
                  value={<span className="font-semibold text-amber-600 dark:text-amber-400">{(missingDialog?.missingStudents || 0).toLocaleString()} missing</span>}
                />
                <InfoRow
                  icon={<HugeIcon className="ph-bold ph-chart-pie text-gray-400 dark:text-zinc-500" />}
                  label="Institutional Rate"
                  value={
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-gray-900 dark:text-zinc-100">
                        {Math.round(((missingDialog?.digitizedStudents || 0) / (missingDialog?.totalStudents || 1)) * 100)}%
                      </span>
                      <span className="text-[11px] text-gray-500 dark:text-zinc-400">
                        (Target: 100%)
                      </span>
                    </div>
                  }
                />
              </div>
            </div>

            {/* Non-Compliant Students Roster */}
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-semibold text-gray-900 dark:text-zinc-100 tracking-wider uppercase">
                  <HugeIcon className="ph-bold ph-user-list text-pup-maroon text-sm" />
                  Non-Compliant Students
                </div>
                {missingStudentsData?.total > 0 && (
                  <span className="text-xs font-mono text-gray-500 dark:text-zinc-400">
                    {missingStudentsData.total.toLocaleString()} total
                  </span>
                )}
              </div>

              {missingStudentsLoading ? (
                <div className="space-y-3" aria-label="Loading students missing this document">
                  <Skeleton className="h-14 w-full rounded-xl" />
                  <Skeleton className="h-14 w-full rounded-xl" />
                  <Skeleton className="h-14 w-full rounded-xl" />
                </div>
              ) : missingStudentsError ? (
                <div className="p-4 rounded-xl border border-red-200 bg-red-50 dark:border-red-900/50 dark:bg-red-950/30 space-y-3" role="alert">
                  <p className="text-xs text-red-800 dark:text-red-200">
                    {missingStudentsError}
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => loadMissingStudents(missingDialog)}
                    className="h-9 px-4 rounded-xl text-xs font-semibold cursor-pointer"
                  >
                    Retry Loading
                  </Button>
                </div>
              ) : missingStudentsData?.students?.length ? (
                <div className="space-y-2">
                  {missingStudentsData.students.map((student) => (
                    <div
                      key={student.student_no}
                      className="flex items-center justify-between p-3 rounded-xl border border-gray-100 dark:border-white/5 bg-gray-50/60 dark:bg-zinc-800/40 hover:bg-gray-100/70 dark:hover:bg-zinc-800/70 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <ProfileAvatar
                          id={student.student_no}
                          name={student.name}
                          initials={student.name
                            ? student.name.split(" ").map((part) => part[0]).filter(Boolean).slice(0, 2).join("").toUpperCase()
                            : "ST"}
                          className="size-8 border border-border"
                          fallbackClassName="text-[10px] font-semibold"
                        />
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-gray-900 dark:text-zinc-100 truncate">
                            {student.name || "Student"}
                          </div>
                          <div className="text-[11px] text-gray-500 dark:text-zinc-400 truncate">
                            {student.course_code || "N/A"}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0 ml-3">
                        <span className="font-mono text-xs font-medium text-gray-700 dark:text-zinc-300 bg-white dark:bg-zinc-800 px-2 py-0.5 rounded-lg border border-gray-200/60 dark:border-white/10">
                          {student.student_no}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            if (typeof navigator !== "undefined" && navigator.clipboard) {
                              navigator.clipboard.writeText(student.student_no);
                              showToast?.("Copied student number", "success");
                            }
                          }}
                          title="Copy student number"
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-700 dark:hover:text-zinc-200 hover:bg-gray-200/50 dark:hover:bg-zinc-700/50 transition-colors cursor-pointer"
                        >
                          <HugeIcon className="ph-bold ph-copy text-xs" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center rounded-2xl border border-dashed border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-zinc-800/20">
                  <HugeIcon className="ph-duotone ph-check-circle text-3xl text-emerald-500 mx-auto mb-2" />
                  <p className="text-xs font-semibold text-gray-900 dark:text-zinc-100">
                    All Students Compliant
                  </p>
                  <p className="text-[11px] text-gray-500 dark:text-zinc-400 mt-0.5">
                    Zero missing documents found for this criteria.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Sticky Footer */}
          <SheetFooter className="shrink-0 p-4 px-6 border-t border-border dark:border-border bg-gray-50/70 dark:bg-zinc-900/40 flex flex-row items-center justify-between">
            <div>
              {missingStudentsData?.total > missingStudentsData?.limit ? (
                <div className="flex items-center gap-1.5">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={missingStudentsLoading || missingStudentsData.offset <= 0}
                    onClick={() => loadMissingStudents(
                      missingDialog,
                      Math.max(0, missingStudentsData.offset - missingStudentsData.limit)
                    )}
                    className="h-8 px-3 text-xs font-semibold rounded-xl cursor-pointer"
                  >
                    Previous
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={missingStudentsLoading || missingStudentsData.offset + missingStudentsData.limit >= missingStudentsData.total}
                    onClick={() => loadMissingStudents(
                      missingDialog,
                      missingStudentsData.offset + missingStudentsData.limit
                    )}
                    className="h-8 px-3 text-xs font-semibold rounded-xl cursor-pointer"
                  >
                    Next
                  </Button>
                </div>
              ) : null}
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setMissingDialog(null);
                setMissingStudentsData(null);
                setMissingStudentsError("");
              }}
              className="h-10 px-5 text-xs font-semibold rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-xs cursor-pointer active:scale-95 transition-all"
            >
              Close
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

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
          className="flex h-[90vh] w-[96vw] max-w-[96vw] flex-col overflow-hidden border border-border bg-gray-100 p-0 shadow-2xl transition-all duration-normal ease-standard xl:max-w-[1400px] rounded-2xl dark:border-border dark:bg-muted"
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
                <HugeIcon  className="ti ti-x" style={{ fontSize: '16px' }}></HugeIcon>
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
                      <HugeIcon  className="ph-bold ph-x text-lg"></HugeIcon>
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
                  ref={pdfPreviewFrameRef}
                  src={`${pdfBlobUrl}#toolbar=0&navpanes=0`}
                  className="absolute inset-0 h-full w-full border-none bg-gray-200 dark:bg-zinc-700"
                  title="PDF Report Preview"
                  onLoad={() => setPreviewFrameReady(true)}
                />
              </div>
            ) : (
              <div className="flex flex-1 items-center justify-center bg-white p-6 dark:bg-card">
                <div className="max-w-lg text-center">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-border bg-gray-50 dark:border-border dark:bg-card">
                    <HugeIcon  className="ph-bold ph-circle-notch animate-spin text-xl text-pup-maroon dark:text-primary"></HugeIcon>
                  </div>
                  <p className="text-sm font-semibold text-gray-600 dark:text-zinc-300">
                    Generating...
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="flex shrink-0 items-center bg-white dark:bg-card px-6 py-4 border-t border-border dark:border-border">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsFullscreenPreview(!isFullscreenPreview)}
              aria-label={isFullscreenPreview ? "Exit fullscreen preview" : "Enter fullscreen preview"}
              title={isFullscreenPreview ? "Exit fullscreen" : "Enter fullscreen"}
              className="text-[#8E8E93] hover:text-[#111] dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 transition-colors rounded-xl shadow-none border-0 p-0 h-10 w-10 cursor-pointer"
            >
              <HugeIcon className={isFullscreenPreview ? "ph-bold ph-arrows-in text-[16px]" : "ph-bold ph-arrows-out text-[16px]"}></HugeIcon>
            </Button>

            <div className="flex items-center gap-2.5 ml-auto">
              <Button
                variant="outline"
                onClick={() => setReportOpen(false)}
                className="flex h-10 items-center justify-center rounded-xl! border border-border dark:border-border bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 font-semibold text-xs active:scale-95 transition-all cursor-pointer px-4 shadow-xs hover:bg-gray-50 dark:hover:bg-zinc-700"
              >
                Close
              </Button>
              <Button
                variant="outline"
                onClick={handlePrintReport}
                disabled={!pdfBlobUrl || !previewFrameReady || isGeneratingPdf}
                className="h-10 px-4 text-xs font-semibold rounded-xl border border-border dark:border-border bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-xs cursor-pointer active:scale-95 transition-all disabled:opacity-50"
              >
                Print Report
              </Button>
              <Button
                onClick={handlePrint}
                disabled={!pdfBlobUrl || isGeneratingPdf}
                className="h-10 px-5 rounded-xl! text-xs font-semibold text-white btn-brand-red active:scale-95 disabled:opacity-50 transition-all cursor-pointer shadow-xs"
              >
                Download Report
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
