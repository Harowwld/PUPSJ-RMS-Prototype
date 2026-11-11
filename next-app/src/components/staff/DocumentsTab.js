"use client";
import { Table } from "@/components/ui/table";
import TableScrollControls from "@/components/shared/TableScrollControls";
import TablePagination from "@/components/shared/TablePagination";
import { SegmentedControl } from "@/components/ui/tabs";
import DataViewToolbar from "@/components/shared/DataViewToolbar";
import DashboardSearch from "@/components/shared/DashboardSearch";
import {
  FilterPopover,
  SortPopover,
  GroupPopover,
  ColumnsPopover,
  ActiveFilterChips as TableActiveFilterChips,
} from "@/components/systemadmin/OfficeTableControls";
import { DateRangeFilterButton } from "@/components/shared/DateRangePickerModal";

import useUrlPage from "@/hooks/useUrlPage";
import useOsasViewPreference from "@/hooks/useOsasViewPreference";
import { PDF_ACTION_LABELS } from "@/lib/pdfPreview";
import { useState, useMemo, useCallback, useRef, useEffect, Fragment } from "react";
import { cn, formatTitleCase } from "@/lib/utils";
import { BADGE_BASE, BADGE_PALETTES } from "@/lib/badgeStyles";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import KpiStatCardsSkeleton from "@/components/systemadmin/skeletons/KpiStatCardsSkeleton";
import DocumentsMatrixSkeleton from "@/components/staff/skeletons/DocumentsMatrixSkeleton";
import { formatPHDateTime } from "@/lib/timeFormat";
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
  EmptyMedia,
  EmptyState,
} from "@/components/ui/empty";
import PageHeader from "@/components/shared/PageHeader";
import { RefreshButton } from "@/components/shared/RefreshButton";
import ResilientPDFViewer from "@/components/shared/ResilientPDFViewer";
import PDFPreviewModal from "@/components/shared/PDFPreviewModal";
import MultiCriteriaFilter from "@/components/shared/MultiCriteriaFilter";
import ActiveFilterChips from "@/components/shared/ActiveFilterChips";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { AlertCircleIcon as EmptyAlertCircleIcon, Search01Icon as EmptySearch01Icon, FileRemoveIcon, Alert01Icon, ArrowDown01Icon, ArrowUp01Icon, ArrowUpDownIcon, Cancel01Icon, CancelCircleIcon, CheckmarkCircle01Icon, Clock01Icon, File01Icon, FingerPrintScanIcon, PieChartIcon, ReloadIcon, Tick01Icon } from "hugeicons-react";
import AppIcon from "@/components/ui/app-icon";
import ComplianceStudentsSheet from "@/components/shared/ComplianceStudentsSheet";

function SortIndicator({ column, sortBy, sortOrder }) {
  if (sortBy !== column)
    return <ArrowUpDownIcon size="1em" className="text-[12px] text-gray-400" />;
  return sortOrder === "ASC" ? (
    <ArrowUp01Icon size="1em" className="text-[12px] text-gray-400" />
  ) : (
    <ArrowDown01Icon size="1em" className="text-[12px] text-gray-400" />
  );
}

export default function DocumentsTab({
  courses = [],
  staffDocs = [],
  onPreviewDocument,
  onRescan,
}) {
  const [isManualRefreshing, setIsManualRefreshing] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [docFrameStatus, setDocFrameStatus] = useState("loading");
  const [pdfPreview, setPdfPreview] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Matrix mode filter states
  const [matrixStatusFilter, setMatrixStatusFilter] = useOsasViewPreference("documents", "statusFilter", "all");
  const [matrixSearch, setMatrixSearch] = useOsasViewPreference("documents", "search", "");
  const [matrixCourseFilters, setMatrixCourseFilters] = useOsasViewPreference("documents", "courseFilters", []);
  const [matrixMissingDocFilters, setMatrixMissingDocFilters] = useOsasViewPreference("documents", "missingDocFilters", []);
  const [matrixFilterRules, setMatrixFilterRules] = useOsasViewPreference("documents", "filterRules", []);
  const [matrixGroupBy, setMatrixGroupBy] = useOsasViewPreference("documents", "groupBy", "none");
  const [matrixStartDate, setMatrixStartDate] = useOsasViewPreference("documents", "startDate", "");
  const [matrixEndDate, setMatrixEndDate] = useOsasViewPreference("documents", "endDate", "");
  const [matrixSortBy, setMatrixSortBy] = useOsasViewPreference("documents", "sortBy", "student_no");
  const [matrixSortOrder, setMatrixSortOrder] = useOsasViewPreference("documents", "sortOrder", "ASC");
  const [matrixPage, setMatrixPage] = useUrlPage();
  const [matrixItemsPerPage, setMatrixItemsPerPage] = useOsasViewPreference("documents", "pageSize", 20);
  const [matrixVisibleColumns, setMatrixVisibleColumns] = useOsasViewPreference("documents", "visibleColumns", [
    "student_no",
    "name",
    "course",
    "progress",
  ]);

  // Horizontal scroll container ref & scroll helper
  const matrixTableContainerRef = useRef(null);
  const [isScrolledX, setIsScrolledX] = useState(false);

  const scrollMatrixTable = useCallback((direction) => {
    if (matrixTableContainerRef.current) {
      const amount = direction === "left" ? -400 : 400;
      matrixTableContainerRef.current.scrollBy({ left: amount, behavior: "smooth" });
    }
  }, []);

  const resetMatrixScroll = useCallback(() => {
    if (matrixTableContainerRef.current) {
      matrixTableContainerRef.current.scrollTo({ left: 0, behavior: "smooth" });
    }
  }, []);

  const handleViewDetails = (doc) => {
    setSelectedDoc(doc);
    setDocFrameStatus("loading");
    setDetailModalOpen(true);
  };

  // Cell click in Matrix grid
  const handleMatrixCellClick = (student, req) => {
    if (req.doc) {
      if (onPreviewDocument) {
        onPreviewDocument(
          req.docType,
          student.name,
          student.studentNo,
          req.doc.id,
          req.doc.file_url
        );
      } else {
        handleViewDetails({
          id: req.doc.id,
          student_no: student.studentNo,
          student_name: student.name,
          doc_type: req.docType,
          status: "uploaded",
          verificationStatus: req.status === "verified" ? "verified" : "unverified",
          doc: req.doc,
          reviewDoc: req.doc,
          student: student,
        });
      }
    }
  };

  const [matrixReport, setMatrixReport] = useState(null);
  const [docsLoading, setMatrixLoading] = useState(true);
  const [docsError, setMatrixError] = useState("");
  const [rosterOpen, setRosterOpen] = useState(false);
  const activeCourseFilters = useMemo(() => {
    const fromRules = matrixFilterRules
      .filter((r) => r.fieldKey === "course" && r.operator !== "is_not")
      .map((r) => r.value);
    return Array.from(new Set([...matrixCourseFilters, ...fromRules]));
  }, [matrixFilterRules, matrixCourseFilters]);

  const activeMissingDocFilters = useMemo(() => {
    const fromRules = matrixFilterRules
      .filter((r) => r.fieldKey === "missingDoc" && r.operator !== "is_not")
      .map((r) => r.value);
    return Array.from(new Set([...matrixMissingDocFilters, ...fromRules]));
  }, [matrixFilterRules, matrixMissingDocFilters]);

  const matrixController = useRef(null);
  const matrixQuery = useMemo(() => {
    const params = new URLSearchParams({
      complianceStatus: matrixStatusFilter,
      requireApproved: "1",
      search: matrixSearch,
      sortBy: matrixSortBy,
      sortOrder: matrixSortOrder,
      limit: String(matrixItemsPerPage),
      offset: String((matrixPage - 1) * matrixItemsPerPage),
    });
    activeCourseFilters.forEach((course) => params.append("courseCode", course));
    activeMissingDocFilters.forEach((type) => params.append("missingDocType", type));
    if (matrixStartDate) params.append("startDate", matrixStartDate);
    if (matrixEndDate) params.append("endDate", matrixEndDate);
    return params.toString();
  }, [
    matrixStatusFilter,
    matrixSearch,
    matrixSortBy,
    matrixSortOrder,
    matrixItemsPerPage,
    matrixPage,
    activeCourseFilters,
    activeMissingDocFilters,
    matrixStartDate,
    matrixEndDate,
  ]);

  const loadMatrix = useCallback(async () => {
    matrixController.current?.abort();
    const controller = new AbortController();
    matrixController.current = controller;
    setMatrixLoading(true);
    setMatrixError("");
    try {
      const response = await fetch(`/api/analytics/digitization-compliance/missing-students?${matrixQuery}`, {
        cache: "no-store", signal: controller.signal,
      });
      const json = await response.json();
      if (!response.ok || !json.ok) throw new Error(json.error || "Unable to load the compliance matrix");
      if (!controller.signal.aborted) {
        setMatrixReport(json.data);
        const configuredTypes = json.data?.meta?.definitions?.configuredDocTypes || [];
        if (configuredTypes.length > 0) {
          setMatrixVisibleColumns((prev) => {
            const docKeys = configuredTypes.map((dt) => `doc_${dt}`);
            const existing = new Set(prev);
            const missingDocKeys = docKeys.filter((k) => !existing.has(k));
            return missingDocKeys.length > 0 ? [...prev, ...missingDocKeys] : prev;
          });
        }
      }
    } catch (failure) {
      if (!controller.signal.aborted) setMatrixError(failure.message);
    } finally { if (!controller.signal.aborted) setMatrixLoading(false); }
  }, [matrixQuery]);

  useEffect(() => {
    const timer = setTimeout(loadMatrix, 150);
    return () => { clearTimeout(timer); matrixController.current?.abort(); };
  }, [loadMatrix, staffDocs]);

  const complianceDocTypes = useMemo(
    () => matrixReport?.meta?.definitions?.configuredDocTypes || [],
    [matrixReport]
  );

  const matrixFilterFields = useMemo(() => [
    {
      key: "course",
      label: "Degree Program",
      type: "select",
      options: (courses || []).map((c) => ({
        value: c.code,
        label: `${c.code} - ${c.name || c.code}`,
      })),
    },
    {
      key: "missingDoc",
      label: "Outstanding Requirement",
      type: "select",
      options: complianceDocTypes.map((dt) => ({
        value: dt,
        label: dt,
      })),
    },
  ], [courses, complianceDocTypes]);

  const matrixSortOptions = useMemo(() => [
    { value: "student_no", label: "Student Number" },
    { value: "name", label: "Student Name" },
    { value: "course", label: "Degree Program" },
    { value: "progress", label: "Compliance Progress" },
  ], []);

  const matrixGroupOptions = useMemo(() => [
    { value: "none", label: "No grouping" },
    { value: "course", label: "Degree Program" },
    { value: "compliance", label: "Compliance Status" },
  ], []);

  const matrixTableColumns = useMemo(() => [
    { key: "student_no", label: "Student No." },
    { key: "name", label: "Full Name" },
    { key: "course", label: "Program" },
    { key: "progress", label: "Compliance Progress" },
    ...complianceDocTypes.map((dt) => ({
      key: `doc_${dt}`,
      label: dt,
    })),
  ], [complianceDocTypes]);

  const stats = matrixReport?.summary;
  const kpiStats = {
    totalStudents: stats?.totalStudents || 0,
    fullyCompliant: stats?.fullyDigitizedStudents || 0,
    incomplete: stats?.notDigitizedStudents || 0,
    overallRate: stats?.percentDigitized || 0,
    compliantRate: stats?.fullyDigitizedRate || 0,
    totalSlots: stats?.totalExpectedDocsCount || 0,
    totalVerified: stats?.verifiedCount || 0,
    totalPending: stats?.pendingCount || 0,
    totalMissing: stats?.missingCount || 0,
    topMissing: (matrixReport?.missingByDocumentType || []).map((type) => ({
      docType: type.documentType, count: type.missingStudents,
    })).sort((left, right) => right.count - left.count),
  };
  const matrixTotal = matrixReport?.total || 0;
  const totalMatrixPages = Math.max(1, Math.ceil(matrixTotal / matrixItemsPerPage));
  const currentMatrixPage = Math.min(Math.max(1, matrixPage), totalMatrixPages);
  const paginatedMatrixRecords = useMemo(
    () => matrixReport?.records || [],
    [matrixReport]
  );

  const groupedMatrixRecords = useMemo(() => {
    if (matrixGroupBy === "none") return [{ key: "all", label: null, rows: paginatedMatrixRecords }];
    const map = new Map();
    for (const item of paginatedMatrixRecords) {
      let key = "Other";
      if (matrixGroupBy === "course") key = item.student?.courseCode || item.courseCode || "Other Program";
      else if (matrixGroupBy === "compliance") key = item.isCompliant ? "Fully Compliant" : "Incomplete / Missing";

      if (!map.has(key)) map.set(key, []);
      map.get(key).push(item);
    }
    return Array.from(map.entries()).map(([label, rows]) => ({
      key: label,
      label,
      rows,
    }));
  }, [paginatedMatrixRecords, matrixGroupBy]);

  useEffect(() => {
    if (matrixReport && matrixPage > totalMatrixPages) setMatrixPage(totalMatrixPages);
  }, [matrixReport, matrixPage, totalMatrixPages, setMatrixPage]);

  const handleMatrixSort = (col) => {
    if (matrixSortBy === col) {
      setMatrixSortOrder(matrixSortOrder === "ASC" ? "DESC" : "ASC");
    } else {
      setMatrixSortBy(col);
      setMatrixSortOrder("ASC");
    }
    setMatrixPage(1);
  };

  // Track horizontal scroll state on the matrix container
  useEffect(() => {
    const el = matrixTableContainerRef.current;
    if (!el) return;
    const handleScroll = () => {
      setIsScrolledX(el.scrollLeft > 20);
    };
    el.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => el.removeEventListener("scroll", handleScroll);
  }, [docsLoading, paginatedMatrixRecords.length]);

  // Auto reset scroll to start when matrix page, search, or filters change
  useEffect(() => {
    if (matrixTableContainerRef.current) {
      matrixTableContainerRef.current.scrollTo({ left: 0, behavior: "smooth" });
    }
  }, [matrixPage, matrixStatusFilter, matrixSearch, matrixCourseFilters, matrixMissingDocFilters, matrixFilterRules, matrixGroupBy]);

  const matrixFilterGroups = useMemo(() => [
    {
      id: "course", label: "Degree Program",
      options: (courses || []).map((course) => ({
        value: course.code, label: `${course.code} - ${course.name || course.code}`,
        count: matrixReport?.byCourse.find((item) => item.courseCode === course.code)?.total || 0,
      })),
    },
    {
      id: "missingDoc", label: "Outstanding Requirement",
      options: (matrixReport?.missingByDocumentType || []).map((type) => ({
        value: type.documentType, label: type.documentType, count: type.missingStudents,
        indicatorColor: "bg-rose-500",
      })),
    },
  ], [courses, matrixReport]);

  const matrixFilterValues = useMemo(
    () => ({
      course: matrixCourseFilters,
      missingDoc: matrixMissingDocFilters,
    }),
    [matrixCourseFilters, matrixMissingDocFilters]
  );

  const handleMatrixFilterChange = useCallback((groupId, values) => {
    if (groupId === "course") {
      setMatrixCourseFilters(values);
      setMatrixPage(1);
    } else if (groupId === "missingDoc") {
      setMatrixMissingDocFilters(values);
      setMatrixPage(1);
    }
  }, [setMatrixPage]);

  const handleClearMatrixFilters = () => {
    setMatrixStatusFilter("all");
    setMatrixSearch("");
    setMatrixCourseFilters([]);
    setMatrixMissingDocFilters([]);
    setMatrixFilterRules([]);
    setMatrixStartDate("");
    setMatrixEndDate("");
    setMatrixPage(1);
  };

  const matrixChips = useMemo(() => {
    const chips = [];
    if (matrixSearch.trim()) {
      chips.push({
        id: "search",
        label: `Search: ${matrixSearch.trim()}`,
        onRemove: () => {
          setMatrixSearch("");
          setMatrixPage(1);
        },
      });
    }
    matrixFilterRules.forEach((rule) => {
      const field = matrixFilterFields.find((f) => f.key === rule.fieldKey);
      chips.push({
        id: rule.id,
        label: `${field?.label || rule.fieldKey}: ${rule.operator === "is_not" ? "not " : ""}${rule.value}`,
        onRemove: () => setMatrixFilterRules((prev) => prev.filter((r) => r.id !== rule.id)),
      });
    });
    matrixCourseFilters.forEach((c) => {
      chips.push({
        id: `course-${c}`,
        label: `Program: ${c}`,
        onRemove: () => {
          setMatrixCourseFilters((prev) => prev.filter((x) => x !== c));
          setMatrixPage(1);
        },
      });
    });
    matrixMissingDocFilters.forEach((d) => {
      chips.push({
        id: `missing-${d}`,
        label: `Outstanding: ${d}`,
        onRemove: () => {
          setMatrixMissingDocFilters((prev) => prev.filter((x) => x !== d));
          setMatrixPage(1);
        },
      });
    });
    if (matrixStartDate || matrixEndDate) {
      chips.push({
        id: "date-range",
        label: `Date: ${matrixStartDate || "Any"} to ${matrixEndDate || "Any"}`,
        onRemove: () => {
          setMatrixStartDate("");
          setMatrixEndDate("");
          setMatrixPage(1);
        },
      });
    }
    return chips;
  }, [
    matrixSearch,
    matrixFilterRules,
    matrixFilterFields,
    matrixCourseFilters,
    matrixMissingDocFilters,
    matrixStartDate,
    matrixEndDate,
    setMatrixPage,
  ]);





  return (
    <TooltipProvider delayDuration={200}>
      <ComplianceStudentsSheet
        open={rosterOpen}
        onClose={() => setRosterOpen(false)}
        filters={{ requireApproved: "1", courseCode: matrixCourseFilters, missingDocType: matrixMissingDocFilters, search: matrixSearch }}
      />
      <div
        id="view-documents"
        className="flex flex-[1_0_auto] flex-col w-full h-auto focus:outline-none animate-fade-up font-jakarta"
        tabIndex={0}
      >
        {/* ONE Single Card Container encapsulating Header, Toolbar, Filters, Table & Pagination */}
        <Card className="flex flex-[1_0_auto] h-auto w-full flex-col p-0 gap-0 overflow-hidden rounded-2xl border border-border bg-white shadow-sm dark:border-border dark:bg-card dark:shadow-none isolate">
          {/* 1. Page Header */}
          <PageHeader
            icon="Files01Icon"
            title={
              <span className="flex items-center gap-2">
                <span>Batch Compliance Matrix</span>
                <span className="text-[11px] font-normal tracking-normal text-gray-500 dark:text-zinc-400 tabular-nums">
                  {matrixTotal > 0 ? `${matrixTotal.toLocaleString()} ${matrixTotal === 1 ? "student" : "students"}` : "No records"}
                </span>
              </span>
            }
            description="Track required document compliance across students, sections, and degree programs."
            showBorder={false}
            className="p-6"
            titleClassName="text-[18px] font-semibold tracking-[-0.01em] text-gray-900 dark:text-zinc-50"
            descriptionClassName="text-[13px] font-normal text-gray-500 dark:text-zinc-400 mt-[4px]"
            actions={
              <div className="flex flex-wrap items-center gap-2">
                <RefreshButton
                  onRefresh={async () => {
                    setIsManualRefreshing(true);
                    const startTime = Date.now();
                    try {
                      await loadMatrix();
                      const elapsed = Date.now() - startTime;
                      if (elapsed < 600) {
                        await new Promise((resolve) => setTimeout(resolve, 600 - elapsed));
                      }
                    } finally {
                      setIsManualRefreshing(false);
                    }
                  }}
                  isLoading={docsLoading || isManualRefreshing}
                  title="Refresh Records"
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 shrink-0 px-4 text-xs font-semibold rounded-xl border border-border dark:border-border bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-xs cursor-pointer active:scale-95 transition-all"
                  disabled={!matrixReport?.meta.configured || !kpiStats.incomplete || docsLoading}
                  onClick={() => setRosterOpen(true)}
                >
                  View Incomplete Students
                </Button>
              </div>
            }
          />

          {/* 2. Summary Metrics */}
          <div className="px-6 pb-6">
            <div className="p-3 sm:p-3.5 rounded-[22px] bg-[#f4f5f7] dark:bg-zinc-900/60 border border-black/[0.05] dark:border-white/[0.08]">
              {docsLoading && !matrixReport ? (
                <KpiStatCardsSkeleton count={3} />
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
                  {/* Card 1: Fully Compliant */}
                  <div className="rounded-[18px] p-4 sm:p-4.5 bg-white dark:bg-zinc-800 border border-black/[0.06] dark:border-white/[0.08] shadow-[0_2px_8px_rgba(0,0,0,0.03),0_1px_2px_rgba(0,0,0,0.02)] flex flex-col justify-between select-none">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="size-5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                          <CheckmarkCircle01Icon size="0.75em" />
                        </div>
                        <span className="text-xs font-semibold text-gray-500 dark:text-zinc-400 tracking-tight">
                          Fully Compliant
                        </span>
                      </div>
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-black/[0.04] dark:bg-white/[0.06] text-xs font-jakarta select-none">
                        <span className="size-3.5 rounded-full bg-emerald-600 dark:bg-emerald-500 text-white inline-flex items-center justify-center shrink-0">
                          <Tick01Icon size={8} className="stroke-[3]" />
                        </span>
                        <span className="font-semibold text-gray-900 dark:text-zinc-100">100% Verified</span>
                      </span>
                    </div>
                    <div className="text-xl sm:text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 font-jakarta mt-2 tabular-nums">
                      {kpiStats.fullyCompliant.toLocaleString()}
                    </div>
                    <div className="text-[11.5px] text-gray-400 dark:text-zinc-500 mt-2 font-medium truncate">
                      {kpiStats.compliantRate}% of {kpiStats.totalStudents.toLocaleString()} evaluated students
                    </div>
                  </div>

                  {/* Card 2: Incomplete Folders */}
                  <div className="rounded-[18px] p-4 sm:p-4.5 bg-white dark:bg-zinc-800 border border-black/[0.06] dark:border-white/[0.08] shadow-[0_2px_8px_rgba(0,0,0,0.03),0_1px_2px_rgba(0,0,0,0.02)] flex flex-col justify-between select-none">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="size-5 rounded-full bg-rose-500/15 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                          <Alert01Icon size="0.75em" />
                        </div>
                        <span className="text-xs font-semibold text-gray-500 dark:text-zinc-400 tracking-tight">
                          Incomplete Folders
                        </span>
                      </div>
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-black/[0.04] dark:bg-white/[0.06] text-xs font-jakarta select-none">
                        <Alert01Icon size={12} className="text-rose-600 dark:text-rose-400 shrink-0" />
                        <span className="font-semibold text-gray-900 dark:text-zinc-100">Missing Files</span>
                      </span>
                    </div>
                    <div className="text-xl sm:text-2xl font-bold tracking-tight text-rose-600 dark:text-rose-400 font-jakarta mt-2 tabular-nums">
                      {kpiStats.incomplete.toLocaleString()}
                    </div>
                    <div className="text-[11.5px] text-gray-400 dark:text-zinc-500 mt-2 font-medium truncate">
                      {kpiStats.totalMissing.toLocaleString()} missing slots • {kpiStats.totalPending.toLocaleString()} pending review
                    </div>
                  </div>

                  {/* Card 3: Digitization Rate */}
                  <div className="rounded-[18px] p-4 sm:p-4.5 bg-white dark:bg-zinc-800 border border-black/[0.06] dark:border-white/[0.08] shadow-[0_2px_8px_rgba(0,0,0,0.03),0_1px_2px_rgba(0,0,0,0.02)] flex flex-col justify-between select-none">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="size-5 rounded-full bg-red-500/15 text-pup-maroon dark:text-red-400 flex items-center justify-center shrink-0">
                          <PieChartIcon size="0.75em" />
                        </div>
                        <span className="text-xs font-semibold text-gray-500 dark:text-zinc-400 tracking-tight">
                          Digitization Rate
                        </span>
                      </div>
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-black/[0.04] dark:bg-white/[0.06] text-xs font-jakarta select-none">
                        <PieChartIcon size={12} className="text-pup-maroon dark:text-red-400 shrink-0" />
                        <span className="font-semibold text-gray-900 dark:text-zinc-100">Overall Rate</span>
                      </span>
                    </div>
                    <div className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900 dark:text-zinc-50 font-jakarta mt-2 tabular-nums">
                      {kpiStats.overallRate}%
                    </div>
                    <div className="text-[11.5px] text-gray-400 dark:text-zinc-500 mt-2 font-medium truncate">
                      {kpiStats.totalVerified.toLocaleString()} / {kpiStats.totalSlots.toLocaleString()} verified slots
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Connected Row: Status Filter Segmented Tabs */}
          <div className="flex items-center justify-between border-t border-border bg-white px-6 py-2.5 dark:border-border dark:bg-card overflow-x-auto scrollbar-none gap-4">
            <SegmentedControl
              value={matrixStatusFilter}
              onValueChange={(val) => {
                setMatrixStatusFilter(val);
                setMatrixPage(1);
              }}
              variant="capsule"
              className="inline-grid grid-flow-col auto-cols-fr shrink-0"
              items={[
                {
                  value: "all",
                  label: "All Students",
                  badge: kpiStats.totalStudents,
                },
                {
                  value: "incomplete",
                  label: "Incomplete / Missing",
                  badge: kpiStats.incomplete,
                },
                {
                  value: "compliant",
                  label: "Fully Compliant",
                  badge: kpiStats.fullyCompliant,
                },
              ]}
            />
          </div>

              {/* Canonical 2-Zone DataViewToolbar */}
              <DataViewToolbar
                label="Batch compliance matrix search and controls"
                className="border-t border-border dark:border-border p-4 sm:px-5 sm:py-3 gap-2 bg-white dark:bg-card flex flex-wrap items-center justify-between select-none"
              >
                {/* Left Zone: DashboardSearch + TableScrollControls */}
                <div className="flex min-w-0 items-center gap-2">
                  <DashboardSearch
                    value={matrixSearch}
                    onChange={(val) => {
                      setMatrixSearch(val);
                      setMatrixPage(1);
                    }}
                    count={matrixTotal}
                    loading={docsLoading}
                    placeholder="Search student no., name, or section..."
                    label="Search compliance matrix"
                  />
                  {paginatedMatrixRecords.length > 0 && (
                    <TableScrollControls
                      scrollContainerRef={matrixTableContainerRef}
                      isScrolledX={isScrolledX}
                      onResetScroll={resetMatrixScroll}
                      onScrollLeft={() => scrollMatrixTable("left")}
                      onScrollRight={() => scrollMatrixTable("right")}
                    />
                  )}
                </div>

                {/* Right Zone: Filter -> Sort -> Group -> Columns -> DateRange */}
                <div className="ml-auto flex shrink-0 items-center gap-2">
                  <FilterPopover
                    fields={matrixFilterFields}
                    filters={matrixFilterRules}
                    onFiltersChange={(newRules) => {
                      setMatrixFilterRules(newRules);
                      setMatrixPage(1);
                    }}
                    entityLabel="records"
                  />
                  <SortPopover
                    options={matrixSortOptions}
                    sortBy={matrixSortBy}
                    onSortByChange={(val) => {
                      setMatrixSortBy(val);
                      setMatrixPage(1);
                    }}
                    sortOrder={matrixSortOrder}
                    onSortOrderChange={(val) => {
                      setMatrixSortOrder(val);
                      setMatrixPage(1);
                    }}
                  />
                  <GroupPopover
                    options={matrixGroupOptions}
                    groupBy={matrixGroupBy}
                    onGroupByChange={(val) => {
                      setMatrixGroupBy(val);
                      setMatrixPage(1);
                    }}
                  />
                  <ColumnsPopover
                    columns={matrixTableColumns}
                    visibleColumns={matrixVisibleColumns}
                    onVisibleColumnsChange={setMatrixVisibleColumns}
                    minVisible={2}
                  />
                  <DateRangeFilterButton
                    startDate={matrixStartDate}
                    endDate={matrixEndDate}
                    onApply={({ startDate: s, endDate: e }) => {
                      setMatrixStartDate(s);
                      setMatrixEndDate(e);
                      setMatrixPage(1);
                    }}
                    onClear={() => {
                      setMatrixStartDate("");
                      setMatrixEndDate("");
                      setMatrixPage(1);
                    }}
                    disableFutureDates={true}
                  />
                </div>
              </DataViewToolbar>

              {/* 4. Active Chips for Matrix */}
              {matrixChips.length > 0 && (
                <TableActiveFilterChips
                  chips={matrixChips}
                  onClearAll={handleClearMatrixFilters}
                  className="border-t border-border dark:border-border px-6 py-2.5 bg-white dark:bg-card"
                />
              )}

              {/* 5. Matrix Table Content */}
              <div className="relative flex flex-col flex-[1_0_auto] w-full border-t border-border dark:border-border" aria-busy={docsLoading}>
                {docsError && matrixReport && (
                  <p role="status" className="px-6 py-2 text-xs text-muted-foreground">{docsError}</p>
                )}
                {docsLoading && !matrixReport ? (
                  <DocumentsMatrixSkeleton rowCount={7} embedded={true} docTypes={complianceDocTypes} />
                ) : docsError && !matrixReport ? (
                  <div className="p-8 rounded-b-2xl flex-1 flex flex-col items-center justify-center">
                    <Empty>
                      <EmptyHeader>
                        <EmptyMedia className="text-red-600 dark:text-red-400"><EmptyAlertCircleIcon size="1em" /></EmptyMedia>
                        <EmptyTitle>
                          Could Not Load Compliance Matrix
                        </EmptyTitle>
                        <EmptyDescription>
                          {docsError}
                        </EmptyDescription>
                      </EmptyHeader>
                    </Empty>
                  </div>
                ) : matrixReport && !matrixReport.meta.configured ? (
                  <EmptyState icon={EmptySearch01Icon} title="No Requirements Configured" description="Configure compliance document types before evaluating student records." />
                ) : matrixTotal === 0 ? (
                  <div className="rounded-b-2xl flex-1 flex flex-col items-center justify-center min-h-[460px] w-full">
                    <Empty>
                      <EmptyHeader>
                        <EmptyMedia><EmptySearch01Icon size="1em" /></EmptyMedia>
                        <EmptyTitle>
                          No Matching Students
                        </EmptyTitle>
                        <EmptyDescription>
                          We could not find any student records matching your selected matrix filters.
                        </EmptyDescription>
                      </EmptyHeader>
                      <EmptyContent>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleClearMatrixFilters}
                          title="Reset Filters"
                          className="h-9 px-4 text-xs font-semibold rounded-xl"
                        >
                          Reset Filters
                        </Button>
                      </EmptyContent>
                    </Empty>
                  </div>
                ) : (
                  <div
                    ref={matrixTableContainerRef}
                    className="w-full flex-[1_0_auto] overflow-x-auto show-scrollbar pb-2"
                  >
                    <Table layout="matrix" columns={[{ kind: "identifier", width: 180 }, { kind: "text", width: 240 }, { kind: "category", width: 160 }, { kind: "number", width: 210 }, ...complianceDocTypes.map(() => ({ kind: "category", width: 185 }))]}>
                      <thead className="sticky top-0 z-10 border-b border-border bg-white dark:bg-card backdrop-blur-xs select-none">
                        <tr className="text-left text-xs font-semibold text-gray-500 dark:text-zinc-400">
                          {/* Sticky Column: Student No */}
                          {matrixVisibleColumns.includes("student_no") && (
                            <th className="py-2.5 px-4 pl-6 sticky left-0 z-30 bg-white dark:bg-card w-[180px] min-w-[180px] max-w-[180px]">
                              <button
                                type="button"
                                onClick={() => handleMatrixSort("student_no")}
                                className="flex items-center gap-1 hover:text-gray-900 dark:hover:text-white cursor-pointer"
                              >
                                <span>Student No.</span>
                                <SortIndicator
                                  column="student_no"
                                  sortBy={matrixSortBy}
                                  sortOrder={matrixSortOrder}
                                />
                              </button>
                            </th>
                          )}

                          {/* Sticky Column: Student Name */}
                          {matrixVisibleColumns.includes("name") && (
                            <th className="py-2.5 px-4 sticky left-[180px] z-30 bg-white dark:bg-card shadow-[4px_0_12px_-2px_rgba(0,0,0,0.06)] dark:shadow-[4px_0_12px_-2px_rgba(0,0,0,0.4)] w-[240px] min-w-[240px] max-w-[240px]">
                              <div className="flex items-center justify-between gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleMatrixSort("name")}
                                  className="flex items-center gap-1 hover:text-gray-900 dark:hover:text-white cursor-pointer"
                                >
                                  <span>Full Name</span>
                                  <SortIndicator
                                    column="name"
                                    sortBy={matrixSortBy}
                                    sortOrder={matrixSortOrder}
                                  />
                                </button>
                                {isScrolledX && (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <button
                                        type="button"
                                        onClick={resetMatrixScroll}
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
                          )}

                          {/* Program & Section */}
                          {matrixVisibleColumns.includes("course") && (
                            <th className="py-2.5 px-4 w-[160px] min-w-[160px]">
                              <button
                                type="button"
                                onClick={() => handleMatrixSort("course")}
                                className="flex items-center gap-1 hover:text-gray-900 dark:hover:text-white cursor-pointer"
                              >
                                <span>Program</span>
                                <SortIndicator
                                  column="course"
                                  sortBy={matrixSortBy}
                                  sortOrder={matrixSortOrder}
                                />
                              </button>
                            </th>
                          )}

                          {/* Progress */}
                          {matrixVisibleColumns.includes("progress") && (
                            <th className="py-2.5 px-4 w-[210px] min-w-[210px]">
                              <button
                                type="button"
                                onClick={() => handleMatrixSort("progress")}
                                className="flex items-center gap-1 hover:text-gray-900 dark:hover:text-white cursor-pointer"
                              >
                                <span>Compliance Progress</span>
                                <SortIndicator
                                  column="progress"
                                  sortBy={matrixSortBy}
                                  sortOrder={matrixSortOrder}
                                />
                              </button>
                            </th>
                          )}

                          {/* Dynamic Requirement Columns */}
                          {complianceDocTypes
                            .filter((docType) => matrixVisibleColumns.includes(`doc_${docType}`))
                            .map((docType) => (
                              <th
                                key={docType}
                                className="py-2.5 px-4 text-center w-[185px] min-w-[185px] select-none"
                                title={docType}
                              >
                                <div className="truncate max-w-[165px] mx-auto text-xs font-semibold text-gray-700 dark:text-zinc-200">
                                  {docType}
                                </div>
                              </th>
                            ))}
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-border dark:divide-border bg-white dark:bg-card">
                        {groupedMatrixRecords.map((group) => (
                          <Fragment key={group.key || "root"}>
                            {group.label && (
                              <tr className="bg-gray-50/70 dark:bg-zinc-800/60 border-y border-border">
                                <td colSpan={matrixVisibleColumns.length} className="px-6 py-2 text-xs font-semibold text-gray-700 dark:text-zinc-300">
                                  <span className="font-bold">{group.label}</span>
                                  <span className="ml-2 font-normal text-muted-foreground">({group.rows.length})</span>
                                </td>
                              </tr>
                            )}
                            {group.rows.map((item) => (
                              <tr
                                key={item.student.studentNo}
                                className="hover:bg-gray-50/70 dark:hover:bg-zinc-800/40 transition-colors group"
                              >
                                {/* Sticky Student No */}
                                {matrixVisibleColumns.includes("student_no") && (
                                  <td className="py-2.5 px-4 pl-6 sticky left-0 z-20 bg-white dark:bg-card group-hover:bg-gray-50 dark:group-hover:bg-zinc-800/90 border-r border-border/70 font-sans tabular-nums text-xs text-gray-900 dark:text-zinc-100 font-semibold w-[180px] min-w-[180px] max-w-[180px] whitespace-nowrap">
                                    {item.student.studentNo}
                                  </td>
                                )}

                                {/* Sticky Full Name */}
                                {matrixVisibleColumns.includes("name") && (
                                  <td
                                    className="py-2.5 px-4 sticky left-[180px] z-20 bg-white dark:bg-card group-hover:bg-gray-50 dark:group-hover:bg-zinc-800/90 border-r border-border/70 shadow-[4px_0_12px_-2px_rgba(0,0,0,0.06)] dark:shadow-[4px_0_12px_-2px_rgba(0,0,0,0.4)] text-[13px] font-semibold text-gray-900 dark:text-zinc-100 truncate w-[240px] min-w-[240px] max-w-[240px]"
                                    title={item.student.name}
                                  >
                                    {formatTitleCase(item.student.name)}
                                  </td>
                                )}

                                {/* Program & Section */}
                                {matrixVisibleColumns.includes("course") && (
                                  <td className="py-2.5 px-4 text-xs text-gray-600 dark:text-zinc-400 whitespace-nowrap w-[160px] min-w-[160px] border-r border-border/70 dark:border-border/70">
                                    <span className="font-semibold text-gray-900 dark:text-zinc-100">
                                      {item.student.courseCode}
                                    </span>{" "}
                                    <span className="text-gray-500 dark:text-zinc-400">
                                      {item.student.section}
                                    </span>
                                  </td>
                                )}

                                {/* Progress */}
                                {matrixVisibleColumns.includes("progress") && (
                                  <td className="py-2.5 px-4 whitespace-nowrap w-[210px] min-w-[210px] border-r border-border/70 dark:border-border/70">
                                    <div className="flex items-center gap-3">
                                      <div className="w-24 h-2.5 bg-gray-100 dark:bg-zinc-800 rounded-full overflow-hidden shrink-0 border border-black/5 dark:border-white/5">
                                        <div
                                          className={cn(
                                            "h-full transition-all duration-300 rounded-full",
                                            item.isCompliant
                                              ? "bg-emerald-500"
                                              : item.completionPercent >= 50
                                              ? "bg-amber-500"
                                              : "bg-red-500"
                                          )}
                                          style={{ width: `${item.completionPercent}%` }}
                                        />
                                      </div>
                                      <span
                                        className={cn(
                                          "text-xs font-bold shrink-0 tabular-nums",
                                          item.isCompliant
                                            ? "text-emerald-600 dark:text-emerald-400"
                                            : item.completionPercent >= 50
                                            ? "text-amber-600 dark:text-amber-400"
                                            : "text-red-600 dark:text-red-400"
                                        )}
                                      >
                                        {item.verifiedCount}/{item.totalCount} ({item.completionPercent}%)
                                      </span>
                                    </div>
                                  </td>
                                )}

                                {/* Dynamic Requirement Cells */}
                                {item.requirements
                                  .filter((req) => matrixVisibleColumns.includes(`doc_${req.docType}`))
                                  .map((req) => (
                                    <td
                                      key={req.docType}
                                      className="py-2 px-3 text-center align-middle w-[185px] min-w-[185px] border-r border-border/70 dark:border-border/70 last:border-r-0"
                                    >
                                      {req.status === "verified" ? (
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <button
                                              type="button"
                                              onClick={() => handleMatrixCellClick(item.student, req)}
                                              className={cn(BADGE_BASE, BADGE_PALETTES.emerald, "gap-1.5 px-3 py-1 hover:bg-emerald-100/80 dark:hover:bg-emerald-500/20 transition-all active:scale-95 cursor-pointer")}
                                            >
                                              <CheckmarkCircle01Icon size="1em" className="text-xs text-emerald-600 dark:text-emerald-400" />
                                              <span>Verified</span>
                                            </button>
                                          </TooltipTrigger>
                                          <TooltipContent>
                                            <p className="font-semibold">{req.docType} • Verified</p>
                                            <p className="text-[11px] text-gray-300">
                                              {req.doc?.original_filename}
                                            </p>
                                            <p className="text-[10px] text-gray-400 mt-0.5">
                                              Click to preview document
                                            </p>
                                          </TooltipContent>
                                        </Tooltip>
                                      ) : req.status === "pending" ? (
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <button
                                              type="button"
                                              onClick={() => handleMatrixCellClick(item.student, req)}
                                              className={cn(BADGE_BASE, BADGE_PALETTES.amber, "gap-1.5 px-3 py-1 hover:bg-amber-100/80 dark:hover:bg-amber-500/20 transition-all active:scale-95 cursor-pointer")}
                                            >
                                              <Clock01Icon size="1em" className="text-xs text-amber-600 dark:text-amber-400" />
                                              <span>Pending</span>
                                            </button>
                                          </TooltipTrigger>
                                          <TooltipContent>
                                            <p className="font-semibold">{req.docType} • Pending Review</p>
                                            <p className="text-[11px] text-gray-300">
                                              {req.doc?.original_filename}
                                            </p>
                                            <p className="text-[10px] text-gray-400 mt-0.5">
                                              Click to preview document
                                            </p>
                                          </TooltipContent>
                                        </Tooltip>
                                      ) : (
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <button
                                              type="button"
                                              onClick={() => onRescan?.(item.student.studentNo, req.docType, req.doc?.id, req.doc?.original_filename, req.doc?.mime_type)}
                                              className={cn(BADGE_BASE, BADGE_PALETTES.red, "gap-1.5 px-3 py-1 hover:bg-red-100/80 dark:hover:bg-red-500/20 transition-all active:scale-95 cursor-pointer")}
                                            >
                                              <FingerPrintScanIcon size="1em" className="text-xs text-rose-600 dark:text-rose-400" />
                                              <span>{req.status === "declined" ? "Needs correction" : "Missing"}</span>
                                            </button>
                                          </TooltipTrigger>
                                          <TooltipContent>
                                            <p className="font-semibold text-rose-300">
                                              {req.status === "declined" ? "Correction Required" : "Missing Requirement"}
                                            </p>
                                            <p className="text-[11px] text-gray-200">{req.docType}</p>
                                            <p className="text-[10px] text-gray-400 mt-0.5">
                                              Click to scan or upload
                                            </p>
                                          </TooltipContent>
                                        </Tooltip>
                                      )}
                                    </td>
                                  ))}
                              </tr>
                            ))}
                          </Fragment>
                        ))}
                      </tbody>
                    </Table>
                  </div>
                )}

                {/* Matrix Pagination */}
                {matrixTotal > 0 && paginatedMatrixRecords.length > 0 && (
                  <TablePagination label="Student document matrix pages" page={matrixPage} pageSize={matrixItemsPerPage} totalCount={matrixTotal} displayedCount={paginatedMatrixRecords.length} onPageChange={setMatrixPage} onPageSizeChange={setMatrixItemsPerPage} loading={docsLoading} />
                )}
                {docsLoading && matrixReport && (
                  <span role="status" className="sr-only">Loading documents…</span>
                )}
              </div>
        </Card>

        {/* COMPREHENSIVE VIEW MODAL */}
        <Dialog
          open={detailModalOpen}
          onOpenChange={(isOpen) => {
            setDetailModalOpen(isOpen);
            if (!isOpen) {
              setIsFullscreen(false);
              setTimeout(() => setSelectedDoc(null), 300);
            }
          }}
        >
          <DialogContent className="flex h-[90vh] w-[96vw] max-w-[96vw] flex-col overflow-hidden border border-border p-0 shadow-2xl transition-all duration-300 xl:max-w-[1400px] sm:rounded-[22px] rounded-[22px] dark:border-border gap-0 bg-white dark:bg-card">
            <DialogHeader className="shrink-0 p-6 pb-4 border-b border-border text-left">
              <div className="flex items-start gap-4">
                <div className="min-w-0 pr-10">
                  <DialogTitle className="text-lg font-semibold tracking-[-0.01em] text-gray-900 dark:text-zinc-100">
                    Document View: {selectedDoc?.doc_type || "Loading..."}
                  </DialogTitle>
                  <DialogDescription className="text-xs text-gray-500 dark:text-zinc-400 mt-1">
                    Viewing details for student {selectedDoc?.student_no}.
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="relative flex flex-1 overflow-hidden bg-gray-100 dark:bg-muted">
              {/* Fullscreen Overlay */}
              {isFullscreen && (selectedDoc?.doc?.file_url || selectedDoc?.doc?.id) && (
                <div className="fixed inset-0 z-[9999] flex flex-col bg-white dark:bg-card animate-in fade-in duration-300">
                  <div className="absolute top-4 right-4 z-[10000]">
                    <Button
                      variant="default"
                      size="icon"
                      onClick={() => setIsFullscreen(false)}
                      className="h-10 w-10 rounded-full bg-black/50 text-white hover:bg-black/70 backdrop-blur-md border-0 active:scale-95 transition-all"
                    >
                      <Cancel01Icon size="1em" className="text-lg" />
                    </Button>
                  </div>
                  <ResilientPDFViewer
                    src={selectedDoc.doc.file_url || `/api/documents/${selectedDoc.doc.id}`}
                    docId={selectedDoc.doc.id}
                    preview={{
                      room: selectedDoc.student?.room,
                      cabinet: selectedDoc.student?.cabinet,
                      drawer: selectedDoc.student?.drawer,
                    }}
                    className="w-full h-full border-0"
                    title="PDF Fullscreen Preview"
                    onStatusChange={setDocFrameStatus}
                  />
                </div>
              )}

              {/* Left: Document Preview */}
              <div className="flex-1 bg-white border-r border-border dark:bg-zinc-900 dark:border-border relative">
                {selectedDoc?.doc?.file_url || selectedDoc?.doc?.id ? (
                  <ResilientPDFViewer
                    src={selectedDoc.doc.file_url || `/api/documents/${selectedDoc.doc.id}`}
                    docId={selectedDoc.doc.id}
                    preview={{
                      room: selectedDoc.student?.room,
                      cabinet: selectedDoc.student?.cabinet,
                      drawer: selectedDoc.student?.drawer,
                    }}
                    className="w-full h-full border-0"
                    title="PDF Preview"
                    onStatusChange={setDocFrameStatus}
                  />
                ) : (
                  <div className="flex h-full items-center justify-center bg-white dark:bg-card">
                    <EmptyState
                      icon={FileRemoveIcon}
                      title="No Document File Available"
                      description="This record has no attached digital file."
                    />
                  </div>
                )}
              </div>

              {/* Right: metadata & decision */}
              <div className="w-[400px] hidden xl:flex flex-col overflow-y-auto p-8 space-y-10 bg-white dark:bg-card">
                <div>
                  <h4 className="text-[11px] font-semibold text-gray-500 tracking-widest border-b border-border pb-2 dark:text-zinc-400 dark:border-border">
                    Student Record
                  </h4>
                  <div className="mt-5 space-y-5">
                    <div>
                      <label className="text-[10px] font-semibold tracking-widest text-gray-400">
                        Student Name
                      </label>
                      <p className="text-base font-semibold text-gray-900 dark:text-zinc-50">
                        {formatTitleCase(selectedDoc?.student_name) || "N/A"}
                      </p>
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold tracking-widest text-gray-400">
                        Student Number
                      </label>
                      <p className="text-base font-semibold text-gray-900 dark:text-zinc-50 font-sans tabular-nums">
                        {selectedDoc?.student_no}
                      </p>
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold tracking-widest text-gray-400">
                        Document Category
                      </label>
                      <div className="mt-1.5">
                        <span className={cn(BADGE_PALETTES.maroon, "gap-1.5", BADGE_BASE)}>
                          <File01Icon size="1em" className="text-[11px]" />
                          {selectedDoc?.doc_type}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-[11px] font-semibold text-gray-500 tracking-widest border-b border-border pb-2 dark:text-zinc-400 dark:border-border">
                    Document Status
                  </h4>
                  <div className="mt-5 space-y-5">
                    <div>
                      <label className="text-[10px] font-semibold tracking-widest text-gray-400">
                        Current Status
                      </label>
                      <div className="mt-1.5">
                        {selectedDoc?.status === "uploaded" ? (
                          selectedDoc.verificationStatus === "unverified" ? (
                            <span className={cn(BADGE_BASE, BADGE_PALETTES.amber, "gap-1.5")}>
                              <Alert01Icon size="1em" className="text-[11px]" />
                              Unverified
                            </span>
                          ) : (
                            <span className={cn(BADGE_BASE, BADGE_PALETTES.emerald, "gap-1.5")}>
                              <CheckmarkCircle01Icon size="1em" className="text-[11px]" />
                              Uploaded
                            </span>
                          )
                        ) : (
                          <span className={cn(BADGE_BASE, BADGE_PALETTES.red, "gap-1.5")}>
                            <CancelCircleIcon size="1em" className="text-[11px]" />
                            Missing
                          </span>
                        )}
                      </div>
                    </div>

                    {selectedDoc?.doc && (
                      <>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="min-w-0">
                            <label className="text-[10px] font-semibold tracking-widest text-gray-400">
                              File Name
                            </label>
                            <div className="flex flex-wrap items-center gap-2 mt-0.5 min-w-0">
                              <p
                                className="text-xs font-semibold text-gray-700 dark:text-zinc-300 truncate w-full"
                                title={selectedDoc.doc.original_filename}
                              >
                                {selectedDoc.doc.original_filename}
                              </p>
                            </div>
                          </div>
                          <div className="min-w-0">
                            <label className="text-[10px] font-semibold tracking-widest text-gray-400">
                              File Size
                            </label>
                            <p className="text-xs font-semibold text-gray-700 dark:text-zinc-300 mt-0.5">
                              {(selectedDoc.doc.size_bytes / 1024).toFixed(1)} KB
                            </p>
                          </div>
                        </div>
                        <div>
                          <label className="text-[10px] font-semibold tracking-widest text-gray-400">
                            Upload Date
                          </label>
                          <p className="text-xs font-semibold text-gray-700 dark:text-zinc-300 mt-0.5">
                            {selectedDoc.reviewDoc?.created_at
                              ? formatPHDateTime(selectedDoc.reviewDoc.created_at)
                              : "N/A"}
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex shrink-0 justify-between items-center gap-3 p-4 border-t border-border bg-white dark:bg-card">
              <div className="flex items-center gap-3">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setIsFullscreen(!isFullscreen)}
                      aria-label={
                        isFullscreen ? "Exit fullscreen preview" : "Enter fullscreen preview"
                      }
                      disabled={!selectedDoc?.doc?.file_url && !selectedDoc?.doc?.id}
                      className={cn(
                        "h-10 w-10 rounded-xl border border-border dark:border-border bg-white dark:bg-card transition-all hover:bg-gray-50 dark:hover:bg-white/10 shadow-sm dark:shadow-none",
                        isFullscreen &&
                          "bg-pup-maroon dark:bg-red-600 text-white hover:bg-pup-darkMaroon border-pup-darkMaroon"
                      )}
                    >
                      <AppIcon
                        className={cn(
                          " text-xl",
                          isFullscreen ? "ArrowShrink01Icon" : "ArrowExpand01Icon"
                        )}
                      />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent className="bg-zinc-900 text-white border-zinc-800">
                    <p className="text-[10px] font-semibold">Document Zoom</p>
                    <p className="text-[9px] opacity-80">Toggle high-focus preview mode</p>
                  </TooltipContent>
                </Tooltip>

                {(selectedDoc?.doc?.file_url || selectedDoc?.doc?.id) &&
                  docFrameStatus === "ready" && (
                    <Button
                      variant="outline"
                      onClick={() => setPdfPreview({
                        url: selectedDoc.doc.file_url || `/api/documents/${selectedDoc.doc.id}`,
                        docId: selectedDoc.doc.id,
                        title: selectedDoc.doc_type,
                        studentName: selectedDoc.student?.name,
                      })}
                    >
                      {PDF_ACTION_LABELS.preview}
                    </Button>
                  )}
              </div>

              <div className="flex items-center gap-2.5">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDetailModalOpen(false)}
                  className="h-9 px-4 text-xs font-semibold rounded-xl border border-border dark:border-border bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-xs cursor-pointer active:scale-95 transition-all"
                >
                  Close
                </Button>

                <Button
                  size="sm"
                  onClick={async () => {
                    setDetailModalOpen(false);
                    if (selectedDoc?.doc?.id && !selectedDoc?.doc?.source_type) {
                      onRescan?.(
                        selectedDoc.student_no,
                        selectedDoc.doc_type,
                        selectedDoc.doc.id,
                        selectedDoc.doc.original_filename,
                        selectedDoc.doc.mime_type
                      );
                    }
                  }}
                  disabled={!selectedDoc?.doc?.id || !!selectedDoc?.doc?.source_type}
                  className="h-9 px-4 cursor-pointer disabled:opacity-50"
                >
                  Update Document
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
        <PDFPreviewModal
          open={!!pdfPreview}
          onClose={() => setPdfPreview(null)}
          preview={pdfPreview}
          onUpdate={
            selectedDoc?.doc?.id && !selectedDoc?.doc?.source_type && onRescan
              ? () => {
                  setPdfPreview(null);
                  setDetailModalOpen(false);
                  onRescan(
                    selectedDoc.student_no,
                    selectedDoc.doc_type,
                    selectedDoc.doc.id,
                    selectedDoc.doc.original_filename,
                    selectedDoc.doc.mime_type
                  );
                }
              : undefined
          }
        />
      </div>
    </TooltipProvider>
  );
}
