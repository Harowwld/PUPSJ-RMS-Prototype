"use client";

import useWorkspaceViewPreference from "@/hooks/useWorkspaceViewPreference"

import { Table } from "@/components/ui/table";
import TablePagination from "@/components/shared/TablePagination";
import useUrlPage from "@/hooks/useUrlPage";
import usePdfPreviewSession from "@/hooks/usePdfPreviewSession";
import { PDF_ACTION_LABELS } from "@/lib/pdfPreview";
import React, { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SegmentedControl } from "@/components/ui/tabs";
import KpiStatCardsSkeleton from "@/components/systemadmin/skeletons/KpiStatCardsSkeleton";
import ComplianceCalcSkeleton from "@/components/admin/skeletons/ComplianceCalcSkeleton";
import ComplianceTableSkeleton from "@/components/admin/skeletons/ComplianceTableSkeleton";
import DashboardSearch from "@/components/systemadmin/DashboardSearch";
import {
  FilterPopover,
  SortPopover,
  GroupPopover,
  ColumnsPopover,
} from "@/components/systemadmin/OfficeTableControls";
import { DateRangeFilterButton } from "@/components/shared/DateRangePickerModal";
import { cn } from "@/lib/utils";
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
  EmptyState,
} from "@/components/ui/empty";

import PDFPreviewModal from "@/components/shared/PDFPreviewModal";
import ComplianceStudentsSheet from "@/components/shared/ComplianceStudentsSheet";
import PageHeader from "@/components/shared/PageHeader";
import { RefreshButton } from "@/components/shared/RefreshButton";
import ActiveFilterChips from "@/components/shared/ActiveFilterChips";
import TableScrollControls from "@/components/shared/TableScrollControls";
import DataViewToolbar from "@/components/shared/DataViewToolbar";
import useTableScroll from "@/hooks/useTableScroll";
import OSASOrganizationComplianceView from "./OSASOrganizationComplianceView";
import {
  AlertCircleIcon as EmptyAlertCircleIcon,
  Files01Icon as EmptyFiles01Icon,
  Search01Icon as EmptySearch01Icon,
  UserGroupIcon as EmptyUserGroupIcon,
  ArrowDown01Icon,
  ArrowUp01Icon,
  ArrowUpDownIcon,
  Award01Icon,
  CheckmarkCircle01Icon,
  Loading01Icon,
  PieChartIcon,
  Target01Icon,
  Tick01Icon,
  UserSearch01Icon,
} from "hugeicons-react";

const COMPLIANCE_COLUMNS = [
  { key: "courseCode", label: "Program", kind: "text" },
  { key: "total", label: "Total Students", kind: "number" },
  { key: "digitized", label: "Fully Digitized", kind: "number" },
  { key: "percent", label: "Document Coverage", kind: "number" },
];

const COMPLIANCE_GROUP_OPTIONS = [
  { key: "tier", label: "Coverage Tier", icon: Award01Icon },
  { key: "none", label: "No grouping" },
];

function SortIndicator({ column, sortBy, sortOrder }) {
  if (sortBy !== column) {
    return (
      <ArrowUpDownIcon
        size="1em"
        className="ml-1 text-[12px] text-gray-400 dark:text-zinc-500 opacity-0 group-hover:opacity-100 transition-opacity"
      />
    );
  }
  return String(sortOrder).toLowerCase() === "asc" ? (
    <ArrowUp01Icon size="1em" className="ml-1 text-[12px] text-gray-400" />
  ) : (
    <ArrowDown01Icon size="1em" className="ml-1 text-[12px] text-gray-400" />
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
  const [missingDialog, setMissingDialog] = useState(null);
  const loadController = useRef(null);

  // Filters & Sorting state for the Program Breakdown table
  const [tableSearch, setTableSearch] = useState("");
  const [filterRules, setFilterRules] = useWorkspaceViewPreference("digitization_compliance", "filterRules", []);
  const [sortBy, setSortBy] = useWorkspaceViewPreference("digitization_compliance", "sortBy", "courseCode");
  const [sortOrder, setSortOrder] = useWorkspaceViewPreference("digitization_compliance", "sortOrder", "asc");
  const [groupBy, setGroupBy] = useWorkspaceViewPreference("digitization_compliance", "groupBy", "none");
  const [visibleColumns, setVisibleColumns] = useWorkspaceViewPreference("digitization_compliance", "visibleColumns", COMPLIANCE_COLUMNS.map((c) => c.key));
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

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
    if (startDate) params.set("startDate", startDate);
    if (endDate) params.set("endDate", endDate);
    return params.toString();
  }, [statusFilter, courseFilter, requireApproved, officeId, startDate, endDate]);

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

    const oldStatus = params.get("status") || "Active";
    const oldCourse = params.get("course") || "";
    const currentCourse = Array.isArray(courseFilter) ? courseFilter.join(",") : "";
    const oldApproved = params.get("approved") || "1";
    const currentView = params.get("view");

    const hasChanged =
      oldStatus !== statusFilter ||
      oldCourse !== currentCourse ||
      (oldApproved === "1") !== requireApproved ||
      currentView !== "digitization";

    if (hasChanged) {
      params.set("view", "digitization");
      params.set("status", statusFilter);
      if (currentCourse) params.set("course", currentCourse);
      else params.delete("course");
      params.set("approved", requireApproved ? "1" : "0");

      const newUrl = `${window.location.pathname}?${params.toString()}`;
      router.replace(newUrl, { scroll: false });
    }

    const delay = firstLoadRef.current ? 0 : 350;
    firstLoadRef.current = false;
    const id = setTimeout(() => {
      load();
    }, delay);
    return () => {
      clearTimeout(id);
      loadController.current?.abort();
    };
  }, [statusFilter, courseFilter, requireApproved, load, router]);

  const summary = data?.summary;
  const meta = data?.meta;
  const byCourse = useMemo(() => (Array.isArray(data?.byCourse) ? data.byCourse : []), [data]);

  // Standard FilterPopover field options
  const filterFields = useMemo(() => {
    return [
      {
        key: "courseCode",
        label: "Program",
        options: courses.map((c) => ({
          value: c.code,
          label: c.code ? `${c.code}${c.name ? ` : ${c.name}` : ""}` : c.name || "Program",
        })),
      },
      {
        key: "percent",
        label: "Document Coverage (%)",
        type: "number",
      },
      {
        key: "total",
        label: "Total Students",
        type: "number",
      },
      {
        key: "digitized",
        label: "Fully Digitized",
        type: "number",
      },
    ];
  }, [courses]);

  // Standard SortPopover options
  const sortOptions = useMemo(
    () => [
      { key: "courseCode", label: "Program Code" },
      { key: "total", label: "Total Students" },
      { key: "digitized", label: "Fully Digitized" },
      { key: "percent", label: "Document Coverage" },
    ],
    []
  );

  // Filter and sort programs for table
  const sortedByCourse = useMemo(() => {
    let list = [...byCourse];

    if (tableSearch.trim()) {
      const search = tableSearch.trim().toLowerCase();
      list = list.filter((row) => row.courseCode?.toLowerCase().includes(search));
    }

    // Apply FilterPopover rules
    if (filterRules.length > 0) {
      list = list.filter((row) => {
        return filterRules.every((rule) => {
          if (!rule.fieldKey) return true;
          const actual = row[rule.fieldKey];

          if (rule.fieldKey === "courseCode") {
            const ruleVal = String(rule.value || "");
            if (rule.operator === "is_not") return actual !== ruleVal;
            return actual === ruleVal;
          }

          const numActual = Number(actual) || 0;
          const numTarget = Number(rule.value) || 0;
          if (rule.operator === "is") return numActual === numTarget;
          if (rule.operator === "is_not") return numActual !== numTarget;
          if (rule.operator === "greater_than") return numActual > numTarget;
          if (rule.operator === "less_than") return numActual < numTarget;

          return true;
        });
      });
    }

    return list.sort((a, b) => {
      let valA = a[sortBy];
      let valB = b[sortBy];

      if (typeof valA === "string") {
        valA = valA.toLowerCase();
        valB = (valB || "").toLowerCase();
      }

      const isAsc = String(sortOrder).toLowerCase() === "asc";
      if (valA < valB) return isAsc ? -1 : 1;
      if (valA > valB) return isAsc ? 1 : -1;
      return 0;
    });
  }, [byCourse, tableSearch, filterRules, sortBy, sortOrder]);

  const [pageSize, setPageSize] = useState(20);

  useEffect(() => {
    setPage(1);
  }, [tableSearch, statusFilter, courseFilter, requireApproved, sortBy, sortOrder, pageSize, filterRules, setPage]);

  const paginatedByCourse = useMemo(() => {
    const startIndex = (page - 1) * pageSize;
    return sortedByCourse.slice(startIndex, startIndex + pageSize);
  }, [sortedByCourse, page, pageSize]);

  const groupedCourses = useMemo(() => {
    if (groupBy === "none") {
      return [{ key: "all", label: "", courses: paginatedByCourse }];
    }
    const map = new Map();
    for (const c of paginatedByCourse) {
      let label = "Under 50% Coverage";
      if (c.percent >= 80) label = "High Compliance (80% - 100%)";
      else if (c.percent >= 50) label = "Moderate Compliance (50% - 79%)";
      if (!map.has(label)) map.set(label, []);
      map.get(label).push(c);
    }
    return [...map.entries()].map(([label, courses]) => ({ key: label, label, courses }));
  }, [groupBy, paginatedByCourse]);

  const {
    containerRef: tableContainerRef,
    isScrolledX,
    scrollLeft,
    scrollRight,
    resetScroll,
  } = useTableScroll([paginatedByCourse.length]);

  useEffect(() => {
    resetScroll();
  }, [page, tableSearch, courseFilter, requireApproved, sortBy, sortOrder, pageSize, filterRules, resetScroll]);

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
  };

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
      entityType: "Report",
    });

    showToast?.({ title: "Report Downloaded", description: "The Compliance report has been successfully downloaded." });
  };

  const downloadCsv = useCallback(async () => {
    if (!summary) return;
    setIsExportingCsv(true);

    try {
      await new Promise((resolve) => setTimeout(resolve, 600));

      const q = (cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`;
      const row = (cells) => cells.map(q).join(",");

      const lines = [
        row(["System Analytics - Digitization Compliance Report", ""]),
        row(["Generated (server UTC)", meta?.generatedAt || ""]),
        row(["Student status filter", meta?.studentStatus || ""]),
        row([
          "Course filter",
          meta?.courseCode || (Array.isArray(courseFilter) && courseFilter.length > 0 ? courseFilter.join(", ") : "All"),
        ]),
        ...(meta?.startDate || meta?.endDate ? [row(["Student records created (Manila)", `${meta.startDate || "Any"} to ${meta.endDate || "Any"}`])] : []),
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
        entityType: "Report",
      });

      showToast?.({ title: "Export Success", description: `The compliance dataset has been successfully exported as ${fileName}.` });
    } catch {
      showToast?.({ title: "Export Failed", description: "An error occurred while exporting the compliance dataset to CSV." }, true);
    } finally {
      setIsExportingCsv(false);
    }
  }, [summary, meta, byCourse, courseFilter, onLogAction, showToast]);

  const handleClearAll = useCallback(() => {
    setCourseFilter([]);
    setTableSearch("");
    setStartDate("");
    setEndDate("");
    setFilterRules([]);
    setPage(1);
  }, [setPage, setFilterRules]);

  // Active filter chips
  const activeChips = useMemo(() => {
    const chips = [];

    // Filter rules from FilterPopover
    filterRules.forEach((rule) => {
      const field = filterFields.find((f) => f.key === rule.fieldKey);
      const fieldLabel = field?.label || rule.fieldKey;
      const optionLabel =
        field?.options?.find((o) => String(o.value) === String(rule.value))?.label || rule.value;
      const opText =
        rule.operator === "is_not"
          ? "is not"
          : rule.operator === "greater_than"
          ? ">"
          : rule.operator === "less_than"
          ? "<"
          : "is";
      chips.push({
        id: rule.id,
        label: `${fieldLabel} ${opText} ${optionLabel}`,
        onRemove: () => {
          setFilterRules((prev) => prev.filter((r) => r.id !== rule.id));
          setPage(1);
        },
      });
    });

    // Program filters (from courseFilter)
    (courseFilter || []).forEach((c) => {
      chips.push({
        id: `course-${c}`,
        label: `Program: ${c}`,
        onRemove: () => {
          setCourseFilter((prev) => prev.filter((item) => item !== c));
          setPage(1);
        },
      });
    });

    if (startDate || endDate) {
      chips.push({
        id: "student-record-date",
        label: `Records created: ${startDate || "Any"} to ${endDate || "Any"}`,
        onRemove: () => {
          setStartDate("");
          setEndDate("");
          setPage(1);
        },
      });
    }
    return chips;
  }, [filterRules, courseFilter, filterFields, startDate, endDate, setPage, setFilterRules]);

  const hasActiveFilters = Boolean(tableSearch.trim() || activeChips.length > 0);

  return (
    <div className="flex flex-[1_0_auto] flex-col w-full gap-6 animate-fade-up font-jakarta">
      {/* 1. Unified Single Card Container */}
      <Card className="flex flex-[1_0_auto] h-auto w-full flex-col p-0 gap-0 overflow-hidden rounded-2xl border border-border bg-white shadow-sm dark:border-border dark:bg-card dark:shadow-none isolate font-jakarta">
        {/* PageHeader: Title + Inline Count + Right Actions Group (RefreshButton Exemption) */}
        <PageHeader
          icon="PieChartIcon"
          title={
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span>Compliance Analysis</span>
              <span className="text-[11px] font-normal tracking-normal text-gray-500 dark:text-zinc-400 tabular-nums">
                {(summary?.totalStudents ?? 0).toLocaleString()} students · {byCourse.length} programs
              </span>
            </div>
          }
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
                className="h-9 w-9"
              />

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={downloadCsv}
                disabled={loading || !data || isExportingCsv}
                className="h-9 shrink-0 px-4 text-xs font-semibold rounded-xl border border-black/[0.08] dark:border-white/[0.1] bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-xs cursor-pointer active:scale-95 transition-all"
              >
                {isExportingCsv ? (
                  <Loading01Icon size="1em" className="animate-spin text-[16px]" />
                ) : (
                  "Export CSV"
                )}
              </Button>

              <Button
                type="button"
                size="sm"
                onClick={handlePreview}
                disabled={loading || !data || isGeneratingPdf}
                className="h-9 shrink-0 px-4 text-xs font-semibold rounded-xl cursor-pointer disabled:opacity-50"
              >
                {isGeneratingPdf ? (
                  <Loading01Icon size="1em" className="animate-spin text-[16px] flex items-center justify-center" />
                ) : (
                  PDF_ACTION_LABELS.preview
                )}
              </Button>
            </div>
          }
        />

        {/* 2. Top Summary Metrics Banner (Clean, Non-interactive Steady Stat Cards) */}
        {loading && !data ? (
          <div className="px-6 pb-6">
            <div className="p-3 sm:p-3.5 rounded-[22px] bg-[#f4f5f7] dark:bg-zinc-900/60 border border-black/[0.05] dark:border-white/[0.08]">
              <KpiStatCardsSkeleton count={3} />
            </div>
          </div>
        ) : !error && data ? (
          <div className="px-6 pb-6">
            <div className="p-3 sm:p-3.5 rounded-[22px] bg-[#f4f5f7] dark:bg-zinc-900/60 border border-black/[0.05] dark:border-white/[0.08]">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
                {/* Card 1: Document Coverage */}
                <div className="rounded-[18px] p-4 sm:p-4.5 bg-white dark:bg-zinc-800 border border-black/[0.06] dark:border-white/[0.08] shadow-[0_2px_8px_rgba(0,0,0,0.03),0_1px_2px_rgba(0,0,0,0.02)] flex flex-col justify-between select-none">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="size-5 rounded-full bg-red-500/15 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0">
                        <PieChartIcon size="0.75em" />
                      </div>
                      <span className="text-xs font-semibold text-gray-500 dark:text-zinc-400 tracking-tight">
                        Document Coverage
                      </span>
                    </div>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-black/[0.04] dark:bg-white/[0.06] text-xs font-jakarta select-none">
                      <PieChartIcon size={12} className="text-red-600 dark:text-red-400 shrink-0" />
                      <span className="font-semibold text-gray-900 dark:text-zinc-100">Overall Rate</span>
                    </span>
                  </div>
                  <div className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900 dark:text-zinc-50 font-jakarta mt-2">
                    {summary?.percentDigitized ?? 0}%
                  </div>
                  <div className="text-[11.5px] text-gray-400 dark:text-zinc-500 mt-2 font-medium">
                    {(summary?.totalDigitizedDocsCount ?? 0).toLocaleString()} / {(summary?.totalExpectedDocsCount ?? 0).toLocaleString()} slots
                  </div>
                </div>

                {/* Card 2: Students Evaluated */}
                <div className="rounded-[18px] p-4 sm:p-4.5 bg-white dark:bg-zinc-800 border border-black/[0.06] dark:border-white/[0.08] shadow-[0_2px_8px_rgba(0,0,0,0.03),0_1px_2px_rgba(0,0,0,0.02)] flex flex-col justify-between select-none">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="size-5 rounded-full bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                        <UserSearch01Icon size="0.75em" />
                      </div>
                      <span className="text-xs font-semibold text-gray-500 dark:text-zinc-400 tracking-tight">
                        Students Evaluated
                      </span>
                    </div>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-black/[0.04] dark:bg-white/[0.06] text-xs font-jakarta select-none">
                      <UserSearch01Icon size={12} className="text-blue-600 dark:text-blue-400 shrink-0" />
                      <span className="font-semibold text-gray-900 dark:text-zinc-100">Total Cohort</span>
                    </span>
                  </div>
                  <div className="text-xl sm:text-2xl font-bold tracking-tight text-blue-600 dark:text-blue-400 font-jakarta mt-2">
                    {(summary?.totalStudents ?? 0).toLocaleString()}
                  </div>
                  <div className="text-[11.5px] text-gray-400 dark:text-zinc-500 mt-2 font-medium">
                    {(summary?.notDigitizedStudents ?? 0).toLocaleString()} incomplete records
                  </div>
                </div>

                {/* Card 3: Fully Digitized */}
                <div className="rounded-[18px] p-4 sm:p-4.5 bg-white dark:bg-zinc-800 border border-black/[0.06] dark:border-white/[0.08] shadow-[0_2px_8px_rgba(0,0,0,0.03),0_1px_2px_rgba(0,0,0,0.02)] flex flex-col justify-between select-none">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="size-5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                        <CheckmarkCircle01Icon size="0.75em" />
                      </div>
                      <span className="text-xs font-semibold text-gray-500 dark:text-zinc-400 tracking-tight">
                        Fully Digitized
                      </span>
                    </div>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-black/[0.04] dark:bg-white/[0.06] text-xs font-jakarta select-none">
                      <span className="size-3.5 rounded-full bg-emerald-600 dark:bg-emerald-500 text-white inline-flex items-center justify-center shrink-0">
                        <Tick01Icon size={8} className="stroke-[3]" />
                      </span>
                      <span className="font-semibold text-gray-900 dark:text-zinc-100">Compliant</span>
                    </span>
                  </div>
                  <div className="text-xl sm:text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 font-jakarta mt-2">
                    {(summary?.fullyDigitizedStudents ?? summary?.digitizedStudents ?? 0).toLocaleString()}
                  </div>
                  <div className="text-[11.5px] text-gray-400 dark:text-zinc-500 mt-2 font-medium">
                    {summary?.fullyDigitizedRate ?? 0}% completion rate
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {/* 3. Connected Segmented Tabs Row (Both with Permanent Number Badges) */}
        <div
          role="group"
          aria-label="Compliance status scope and requirement"
          className="flex items-center justify-between px-6 py-2.5 border-t border-border dark:border-white/10 bg-white dark:bg-card overflow-x-auto scrollbar-none gap-4"
        >
          {/* Left: Active vs Archived Scope Tabs */}
          <SegmentedControl
            id="compliance-status-filter"
            value={statusFilter}
            onValueChange={(val) => {
              setStatusFilter(val);
              setPage(1);
            }}
            variant="capsule"
            className="inline-grid grid-flow-col auto-cols-fr shrink-0"
            items={[
              {
                value: "Active",
                label: "Active",
                badge: summary?.activeStudentsCount ?? (statusFilter === "Active" ? summary?.totalStudents : 0),
              },
              {
                value: "Archived",
                label: "Archived",
                badge: summary?.archivedStudentsCount ?? (statusFilter === "Archived" ? summary?.totalStudents : 0),
              },
            ]}
          />

          {/* Right: Validation Requirement Segmented Control */}
          <SegmentedControl
            id="compliance-require-approved"
            value={requireApproved ? "approved" : "all"}
            onValueChange={(val) => {
              setRequireApproved(val === "approved");
              setPage(1);
            }}
            variant="capsule"
            className="inline-grid grid-flow-col auto-cols-fr shrink-0 ml-auto"
            items={[
              { value: "all", label: "All Uploads" },
              { value: "approved", label: "Approved Only" },
            ]}
          />
        </div>

        {/* 4. Digitization Progress & Missing Documents Section */}
        <div className="p-6 border-t border-border dark:border-border bg-white dark:bg-card">
          {loading && !data ? (
            <ComplianceCalcSkeleton />
          ) : data ? (() => {
            const percent = summary?.totalExpectedDocsCount > 0
              ? Math.min(100, Math.round((summary?.totalDigitizedDocsCount / summary?.totalExpectedDocsCount) * 100))
              : 0;
            const fullyDigitizedCount = summary?.fullyDigitizedStudents ?? summary?.digitizedStudents ?? 0;
            return (
              <div>
                <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8 py-4 w-full bg-transparent border-0">
                  {/* Context & Formula */}
                  <div className="flex-1">
                    <div className="flex items-start gap-3">
                      <Target01Icon size="1em" className="text-[16px] text-gray-400 dark:text-zinc-500 shrink-0 mt-1" />
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

                    {/* Progress Bar */}
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
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!meta?.configured || !summary?.notDigitizedStudents}
                      onClick={() => openMissingStudents({ documentType: "All compliance requirements" })}
                      className="h-9 shrink-0 px-4 text-xs font-semibold rounded-xl border border-black/[0.08] dark:border-white/[0.1] bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-xs cursor-pointer active:scale-95 transition-all"
                    >
                      View Incomplete Students
                    </Button>
                  </div>
                  {summary?.totalStudents === 0 || !Array.isArray(data.missingByDocumentType) || data.missingByDocumentType.length === 0 || docTypeItems.length === 0 ? (
                    <EmptyState
                      variant="compact"
                      icon={summary?.totalStudents === 0 ? (hasActiveFilters ? EmptySearch01Icon : EmptyUserGroupIcon) : EmptyFiles01Icon}
                      title={
                        summary?.totalStudents === 0
                          ? hasActiveFilters
                            ? "No Matching Students"
                            : statusFilter === "Archived"
                            ? "No Archived Records"
                            : "No Student Records Found"
                          : "No Document Types Configured"
                      }
                      description={
                        summary?.totalStudents === 0
                          ? hasActiveFilters
                            ? "No students match the current filters. Adjust or reset your criteria to evaluate missing documents."
                            : statusFilter === "Archived"
                            ? "There are currently no archived student records in this office."
                            : "No student records are currently available to evaluate document compliance."
                          : "No active compliance document types are configured for this view."
                      }
                    >
                      {summary?.totalStudents === 0 && hasActiveFilters && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleClearAll}
                          title="Reset Filters"
                          className="h-9 px-4 text-xs font-semibold rounded-xl border border-black/[0.08] dark:border-white/[0.1] bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 shadow-xs transition-all hover:bg-gray-50 dark:hover:bg-zinc-700 active:scale-95 cursor-pointer"
                        >
                          Reset Filters
                        </Button>
                      )}
                    </EmptyState>
                  ) : (
                    <div className="divide-y divide-border rounded-xl border border-border dark:divide-border dark:border-border overflow-hidden">
                      {docTypeItems.map((item) => (
                        <div
                          key={item.documentTypeId}
                          className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_auto_auto] hover:bg-gray-50/50 dark:hover:bg-zinc-800/40 transition-colors"
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
                              size="sm"
                              onClick={() => openMissingStudents(item)}
                              className="col-span-2 h-9 rounded-xl px-4 text-xs font-semibold sm:col-span-1 border border-black/[0.08] dark:border-white/[0.1] bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-xs cursor-pointer active:scale-95 transition-all"
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

        {/* 5. DataViewToolbar: Located Directly on Top of the Program Breakdown Table */}
        <DataViewToolbar
          label="Program compliance search and filters"
          className="border-t border-border dark:border-border px-5 sm:py-3 bg-white dark:bg-card select-none"
        >
          {/* Left Group: DashboardSearch + TableScrollControls */}
          <div className="flex min-w-0 items-center gap-2">
            <DashboardSearch
              value={tableSearch}
              onChange={(val) => {
                setTableSearch(val);
                setPage(1);
              }}
              onClear={() => {
                setTableSearch("");
                setPage(1);
              }}
              resultCount={sortedByCourse.length}
              placeholder="Search programs..."
            />

            <TableScrollControls
              scrollContainerRef={tableContainerRef}
              onScrollLeft={scrollLeft}
              onScrollRight={scrollRight}
              onResetScroll={resetScroll}
              isScrolled={isScrolledX}
            />
          </div>

          {/* Right Group: FilterPopover + SortPopover + GroupPopover + ColumnsPopover + DateRangeFilterButton */}
          <div className="ml-auto flex shrink-0 items-center gap-2">
            <FilterPopover
              fields={filterFields}
              filters={filterRules}
              onFiltersChange={(newRules) => {
                setFilterRules(newRules);
                setPage(1);
              }}
              entityLabel="programs"
            />

            <SortPopover
              options={sortOptions}
              sortBy={sortBy}
              onSortByChange={(val) => {
                setSortBy(val);
                setSortOrder("asc");
              }}
              sortOrder={sortOrder.toUpperCase()}
              onSortOrderChange={(ord) => setSortOrder(ord.toLowerCase())}
            />

            <GroupPopover
              options={COMPLIANCE_GROUP_OPTIONS}
              groupBy={groupBy}
              onGroupByChange={setGroupBy}
            />

            <ColumnsPopover
              columns={COMPLIANCE_COLUMNS}
              visibleColumns={visibleColumns}
              onVisibleColumnsChange={setVisibleColumns}
              minVisible={2}
            />

            <DateRangeFilterButton
              placeholder="Student Record Date"
              title="Filter by student record creation date (Manila)"
              startDate={startDate}
              endDate={endDate}
              onApply={({ startDate: s, endDate: e }) => {
                setStartDate(s);
                setEndDate(e);
                setPage(1);
              }}
              onClear={() => {
                setStartDate("");
                setEndDate("");
                setPage(1);
              }}
              disableFutureDates={true}
            />
          </div>
        </DataViewToolbar>

        {/* 6. ActiveFilterChips Row (Conditional) */}
        {hasActiveFilters && (
          <div className="border-t border-border dark:border-border bg-white dark:bg-card px-6 py-2.5">
            <ActiveFilterChips
              chips={activeChips}
              searchQuery={tableSearch}
              onClearSearch={() => setTableSearch("")}
              onClearAll={handleClearAll}
              className="p-0 border-0"
            />
          </div>
        )}

        {/* 7. Main Program Breakdown Table */}
        {loading && !data ? (
          <ComplianceTableSkeleton rowCount={6} embedded={true} />
        ) : !data && error ? (
          <div className="flex flex-[1_0_auto] min-h-[420px] flex-col items-center justify-center border-t border-border dark:border-border bg-transparent text-center p-6 rounded-b-2xl">
            <Empty>
              <EmptyHeader>
                <EmptyMedia className="text-red-600 dark:text-red-400">
                  <EmptyAlertCircleIcon size="1em" />
                </EmptyMedia>
                <EmptyTitle>Data Unavailable</EmptyTitle>
                <EmptyDescription>{error}</EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => load(true)}
                  className="flex h-9 items-center justify-center rounded-xl border border-black/[0.08] dark:border-white/[0.1] bg-white dark:bg-zinc-800 px-4 text-xs font-semibold text-gray-700 dark:text-zinc-200 shadow-xs transition-colors hover:bg-gray-50 dark:hover:bg-zinc-700 active:scale-95 cursor-pointer"
                >
                  Retry Loading
                </Button>
              </EmptyContent>
            </Empty>
          </div>
        ) : data ? (
          <div
            className="flex flex-[1_0_auto] flex-col min-h-0 overflow-hidden rounded-b-2xl border-t border-border dark:border-border"
          >
            <div
              ref={tableContainerRef}
              className="hidden w-full flex-[1_0_auto] overflow-x-auto show-scrollbar pb-2 sm:block"
            >
              {sortedByCourse.length > 0 ? (
                <Table columns={COMPLIANCE_COLUMNS.filter(({ key }) => visibleColumns.includes(key)).map(({ kind }) => kind)}>
                  <thead className="sticky top-0 z-10 border-b border-border bg-white dark:bg-card backdrop-blur-xs select-none">
                    <tr className="text-left text-xs font-semibold text-gray-500 dark:text-zinc-400">
                      {visibleColumns.includes("courseCode") && (
                        <th
                          className={cn(
                            "p-4 px-6 w-[32%] min-w-[200px] sticky left-0 z-20 bg-white dark:bg-card backdrop-blur-xs transition-shadow duration-200",
                            isScrolledX && "shadow-[4px_0_12px_-2px_rgba(0,0,0,0.06)] dark:shadow-[4px_0_12px_-2px_rgba(0,0,0,0.4)]"
                          )}
                        >
                          <div className="flex items-center justify-between gap-1">
                            <button
                              onClick={() => handleSort("courseCode")}
                              className={cn(
                                "group flex items-center text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-pup-maroon dark:focus-visible:ring-red-500 cursor-pointer",
                                sortBy === "courseCode" ? "text-gray-900 dark:text-white" : "text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white"
                              )}
                            >
                              Program <SortIndicator column="courseCode" sortBy={sortBy} sortOrder={sortOrder} />
                            </button>
                          </div>
                        </th>
                      )}
                      {visibleColumns.includes("total") && (
                        <th className="p-4 px-6 w-[22%] text-center">
                          <button
                            onClick={() => handleSort("total")}
                            className={cn(
                              "group mx-auto flex items-center text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-pup-maroon dark:focus-visible:ring-red-500 cursor-pointer",
                              sortBy === "total" ? "text-gray-900 dark:text-white" : "text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white"
                            )}
                          >
                            Total Students <SortIndicator column="total" sortBy={sortBy} sortOrder={sortOrder} />
                          </button>
                        </th>
                      )}
                      {visibleColumns.includes("digitized") && (
                        <th className="p-4 px-6 w-[22%] text-center">
                          <button
                            onClick={() => handleSort("digitized")}
                            className={cn(
                              "group mx-auto flex items-center text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-pup-maroon dark:focus-visible:ring-red-500 cursor-pointer",
                              sortBy === "digitized" ? "text-gray-900 dark:text-white" : "text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white"
                            )}
                          >
                            Fully Digitized <SortIndicator column="digitized" sortBy={sortBy} sortOrder={sortOrder} />
                          </button>
                        </th>
                      )}
                      {visibleColumns.includes("percent") && (
                        <th className="p-4 px-6 w-[24%] text-right">
                          <button
                            onClick={() => handleSort("percent")}
                            className={cn(
                              "group ml-auto flex items-center text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-pup-maroon dark:focus-visible:ring-red-500 cursor-pointer",
                              sortBy === "percent" ? "text-gray-900 dark:text-white" : "text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white"
                            )}
                          >
                            Document Coverage <SortIndicator column="percent" sortBy={sortBy} sortOrder={sortOrder} />
                          </button>
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="bg-transparent divide-y divide-border dark:divide-border">
                    {groupedCourses.map((group) => (
                      <Fragment key={group.key}>
                        {groupBy !== "none" && (
                          <tr className="bg-gray-50/70 dark:bg-zinc-800/50">
                            <td colSpan={visibleColumns.length} className="px-6 py-2 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-zinc-400">
                              {group.label} ({group.courses.length})
                            </td>
                          </tr>
                        )}
                        {group.courses.map((row) => {
                          const isSelected = Array.isArray(courseFilter) && courseFilter.includes(row.courseCode);
                          return (
                            <tr
                              key={row.courseCode}
                              className={cn(
                                "h-[48px] hover:bg-gray-50/70 dark:hover:bg-zinc-800/40 transition-colors group select-none",
                                isSelected && "bg-blue-50/60 dark:bg-blue-950/20"
                              )}
                            >
                              {visibleColumns.includes("courseCode") && (
                                <td
                                  className={cn(
                                    "p-4 px-6 text-[13px] font-semibold text-gray-900 dark:text-zinc-50 tracking-[-0.01em] sticky left-0 z-10 bg-white group-hover:bg-gray-50/70 dark:bg-card dark:group-hover:bg-zinc-800/80 transition-shadow duration-200 border-r border-border/70 dark:border-border/70",
                                    isSelected && "bg-blue-50/60 dark:bg-blue-950/20 group-hover:bg-blue-50/80 dark:group-hover:bg-blue-950/40",
                                    isScrolledX && "shadow-[4px_0_12px_-2px_rgba(0,0,0,0.06)] dark:shadow-[4px_0_12px_-2px_rgba(0,0,0,0.4)]"
                                  )}
                                >
                                  <button
                                    type="button"
                                    onClick={() => toggleCourseFilter(row.courseCode)}
                                    aria-pressed={isSelected}
                                    className="rounded-md text-left focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-pup-maroon dark:focus-visible:ring-red-500 cursor-pointer"
                                    title={`${isSelected ? "Remove" : "Add"} ${row.courseCode} ${isSelected ? "from" : "as"} program filter`}
                                  >
                                    {row.courseCode || "N/A"}
                                  </button>
                                </td>
                              )}
                              {visibleColumns.includes("total") && (
                                <td className="p-4 px-6 text-xs font-normal text-gray-700 dark:text-zinc-300 tabular-nums text-center border-r border-border/70 dark:border-border/70">
                                  {row.total?.toLocaleString?.() ?? row.total}
                                </td>
                              )}
                              {visibleColumns.includes("digitized") && (
                                <td className="p-4 px-6 text-center text-xs font-normal border-r border-border/70 dark:border-border/70">
                                  <span
                                    className={cn(
                                      row.digitized === 0
                                        ? "text-gray-400 dark:text-zinc-500"
                                        : "text-gray-900 dark:text-zinc-50 tabular-nums"
                                    )}
                                  >
                                    {row.digitized?.toLocaleString?.() ?? row.digitized} / {row.total?.toLocaleString?.() ?? row.total}
                                  </span>
                                  <span className="text-[10px] text-gray-500 font-medium ml-1.5 dark:text-zinc-400 tabular-nums">
                                    ({row.fullyDigitizedRate}%)
                                  </span>
                                </td>
                              )}
                              {visibleColumns.includes("percent") && (
                                <td className="p-4 px-6 text-right">
                                  <div className="flex items-center justify-end gap-[8px]">
                                    <span className="text-xs font-semibold tabular-nums text-gray-900 dark:text-zinc-50">
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
                              )}
                            </tr>
                          );
                        })}
                      </Fragment>
                    ))}
                  </tbody>
                </Table>
              ) : (
                <div className="rounded-b-2xl flex-1 flex flex-col items-center justify-center min-h-[420px] w-full">
                  <Empty>
                    <EmptyHeader>
                      <EmptyMedia>
                        <EmptySearch01Icon size="1em" />
                      </EmptyMedia>
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
                          size="sm"
                          onClick={handleClearAll}
                          title="Reset Filters"
                          className="h-9 px-4 text-xs font-semibold rounded-xl border border-black/[0.08] dark:border-white/[0.1] bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-xs cursor-pointer active:scale-95 transition-all"
                        >
                          Reset Filters
                        </Button>
                      </EmptyContent>
                    )}
                  </Empty>
                </div>
              )}
            </div>

            {/* Mobile View */}
            {sortedByCourse.length > 0 && (
              <div className="space-y-3 p-4 sm:hidden">
                {paginatedByCourse.map((row) => {
                  const isSelected = Array.isArray(courseFilter) && courseFilter.includes(row.courseCode);
                  return (
                    <article
                      key={row.courseCode}
                      className={cn(
                        "rounded-xl border border-border bg-white p-4 dark:border-border dark:bg-zinc-900",
                        isSelected && "border-blue-300 bg-blue-50/60 dark:border-blue-900 dark:bg-blue-950/20"
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => toggleCourseFilter(row.courseCode)}
                        aria-pressed={isSelected}
                        className="flex min-h-11 w-full items-center justify-between gap-3 rounded-lg text-left focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-pup-maroon dark:focus-visible:ring-red-500"
                      >
                        <span className="text-sm font-semibold text-gray-900 dark:text-zinc-100">
                          {row.courseCode || "N/A"}
                        </span>
                        <span className="text-[11px] font-medium text-pup-maroon dark:text-red-400">
                          {isSelected ? "Filtered" : "Filter"}
                        </span>
                      </button>
                      <div className="mt-3 grid grid-cols-3 gap-2 border-t border-border pt-3 dark:border-border">
                        <div>
                          <div className="text-[10px] text-gray-500 dark:text-zinc-400">Students</div>
                          <div className="mt-0.5 text-xs font-semibold text-gray-900 dark:text-zinc-100 tabular-nums">
                            {row.total?.toLocaleString?.() ?? row.total}
                          </div>
                        </div>
                        <div>
                          <div className="text-[10px] text-gray-500 dark:text-zinc-400">Fully digitized</div>
                          <div className="mt-0.5 text-xs font-semibold text-gray-900 dark:text-zinc-100 tabular-nums">
                            {row.digitized?.toLocaleString?.() ?? row.digitized}{" "}
                            <span className="font-normal text-gray-500">({row.fullyDigitizedRate}%)</span>
                          </div>
                        </div>
                        <div>
                          <div className="text-[10px] text-gray-500 dark:text-zinc-400">Coverage</div>
                          <div className="mt-0.5 text-xs font-semibold text-gray-900 dark:text-zinc-100 tabular-nums">
                            {row.percent ?? 0}%
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}

            {/* Standard Table Pagination Footer */}
            {sortedByCourse.length > 0 && (
              <TablePagination
                label="Program compliance pages"
                page={page}
                pageSize={pageSize}
                totalCount={sortedByCourse.length}
                displayedCount={paginatedByCourse.length}
                onPageChange={setPage}
                onPageSizeChange={setPageSize}
              />
            )}
          </div>
        ) : null}
      </Card>

      <ComplianceStudentsSheet
        open={Boolean(missingDialog)}
        onClose={() => setMissingDialog(null)}
        documentType={missingDialog}
        filters={{
          status: meta?.studentStatus ?? statusFilter,
          courseCode: meta?.courseCodes ?? courseFilter,
          requireApproved: (meta?.requireApproved ?? requireApproved) ? "1" : "0",
          officeId,
          startDate: meta?.startDate,
          endDate: meta?.endDate,
        }}
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
        onPrint={() =>
          onLogAction?.({
            action: "Print Report",
            details: "opened print dialog for the physical record compliance report",
            entityType: "Report",
          })
        }
        onPrintError={(error) =>
          showToast?.(formatErrorMessage(error, { defaultTitle: "Report Printing Failed" }), true)
        }
      />
    </div>
  );
}
