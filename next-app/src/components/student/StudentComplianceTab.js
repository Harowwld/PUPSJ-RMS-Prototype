"use client";

import React, { useState, useEffect, useMemo } from "react";
import { PDF_ACTION_LABELS } from "@/lib/pdfPreview";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import PageHeader from "@/components/shared/PageHeader";
import { RefreshButton } from "@/components/shared/RefreshButton";
import { formatPHDateTime } from "@/lib/timeFormat";
import { generateExportFilename } from "@/lib/exportHelpers";
import { toast } from "sonner";
import { formatErrorMessage } from "@/lib/errorUtils";
import { cn } from "@/lib/utils";
import { BADGE_BASE, BADGE_PALETTES } from "@/lib/badgeStyles";
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyMedia,
  EmptyContent,
} from "@/components/ui/empty";
import PDFPreviewModal from "@/components/shared/PDFPreviewModal";
import StudentComplianceSkeleton from "./skeletons/StudentComplianceSkeleton";
import StudentComplianceKpiCards from "./StudentComplianceKpiCards";
import ViewModeIcon from "@/components/shared/ViewModeIcon";
import { SegmentedControl } from "@/components/ui/tabs";
import PermanentAdmissionRecordSheet from "./PermanentAdmissionRecordSheet";
import NarrativeText from "@/components/shared/NarrativeText";
import {
  generateStudentComplianceSlipPdf,
} from "@/lib/pdfGenerator";
import usePdfPreviewSession from "@/hooks/usePdfPreviewSession";
import { useTablePreferences } from "@/components/shared/TablePreferences";
import { getListDensityClasses } from "@/lib/tablePresentation";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import DataViewToolbar from "@/components/shared/DataViewToolbar";
import DashboardSearch from "@/components/shared/DashboardSearch";
import {
  FilterPopover,
  SortPopover,
  GroupPopover,
  ActiveFilterChips,
} from "@/components/systemadmin/OfficeTableControls";
import { DateRangeFilterButton } from "@/components/shared/DateRangePickerModal";
import { CheckListIcon as EmptyCheckListIcon, Search01Icon as EmptySearch01Icon, ArrowDown01Icon, ArrowRight02Icon, ArrowUpDownIcon, CheckmarkCircle01Icon, Clock01Icon, FoldersIcon, Loading01Icon, Location01Icon, Shield01Icon, Tick01Icon, ViewIcon } from "hugeicons-react";
import AppIcon from "@/components/ui/app-icon";

function getRequirementCategoryIcon(category) {
  const cat = String(category || "").toLowerCase();
  if (cat.includes("admission") || cat.includes("identity") || cat.includes("birth")) {
    return "Contact01Icon";
  }
  if (cat.includes("academic") || cat.includes("record") || cat.includes("137") || cat.includes("grade")) {
    return "GraduationScrollIcon";
  }
  if (cat.includes("graduation") || cat.includes("exit") || cat.includes("diploma") || cat.includes("transcript")) {
    return "GraduationScrollIcon";
  }
  return "File02Icon";
}

function formatChipDate(dateStr) {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return dateStr;
  }
}

export default function StudentComplianceTab({ authUser, initialData }) {
  const [data, setData] = useState(initialData || null);
  const [loading, setLoading] = useState(!initialData);
  const [refreshing, setRefreshing] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [printModalOpen, setPrintModalOpen] = useState(false);
  const [selectedRequirement, setSelectedRequirement] = useState(null);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [previewDoc, setPreviewDoc] = useState(null);
  const previewSession = usePdfPreviewSession();

  const { density } = useTablePreferences();
  const densityClasses = getListDensityClasses(density);
  const [collapsedGroups, setCollapsedGroups] = useState({});

  const toggleGroup = (key) => {
    setCollapsedGroups((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // Search & Standard Toolbar state
  const [searchQuery, setSearchQuery] = useState("");
  const [filterRules, setFilterRules] = useState([]);
  const [sortBy, setSortBy] = useState("docType");
  const [sortOrder, setSortOrder] = useState("asc");
  const [groupBy, setGroupBy] = useState("none");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [viewMode, setViewMode] = useState("list");

  const loadComplianceData = async () => {
    setRefreshing(true);

    try {
      const res = await fetch("/api/student/compliance", {
        headers: { "Cache-Control": "no-cache" },
      });
      const json = await res.json();
      if (json.ok && json.data) {
        setData(json.data);
      } else {
        toast.error("Could not load requirements", {
          description: json.error || "Failed to retrieve student compliance data.",
        });
      }
    } catch (err) {
      console.error("Failed to load compliance data:", err);
      toast.error("Network Error", {
        description: "Failed to connect to the records server.",
      });
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (initialData) return;
    let active = true;

    (async () => {
      try {
        const res = await fetch("/api/student/compliance", {
          headers: { "Cache-Control": "no-cache" },
        });
        const json = await res.json();
        if (!active) return;
        if (json.ok && json.data) {
          setData(json.data);
        } else {
          toast.error("Could not load requirements", {
            description: json.error || "Failed to retrieve student compliance data.",
          });
        }
      } catch (err) {
        if (!active) return;
        console.error("Failed to load compliance data:", err);
        toast.error("Network Error", {
          description: "Failed to connect to the records server.",
        });
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [initialData]);

  const requirements = useMemo(() => data?.requirements || [], [data?.requirements]);
  const summary = data?.summary || {
    total: 0,
    submitted: 0,
    missing: 0,
    complianceRate: 0,
    isCompliant: false,
    categories: [],
  };

  // Filter fields configuration
  const filterFields = useMemo(() => [
    {
      key: "status",
      label: "Status",
      type: "select",
      options: [
        { label: "Completed (Submitted)", value: "submitted" },
        { label: "Pending Submission", value: "missing" },
      ],
    },
    {
      key: "category",
      label: "Category",
      type: "select",
      options: (summary.categories || []).map((cat) => ({
        label: cat.name,
        value: cat.name,
      })),
    },
  ], [summary.categories]);

  // Sort options
  const sortOptions = useMemo(() => [
    { value: "docType", label: "Requirement Name" },
    { value: "status", label: "Compliance Status" },
    { value: "category", label: "Category" },
  ], []);

  // Group options (No grouping is the last choice)
  const groupOptions = useMemo(() => [
    { value: "category", label: "Category" },
    { value: "status", label: "Status" },
    { value: "none", label: "No grouping" },
  ], []);

  // Filtered requirements
  const filteredRequirements = useMemo(() => {
    if (!requirements) return [];
    const q = searchQuery.trim().toLowerCase();

    return requirements.filter((item) => {
      const matchesSearch =
        !q ||
        item.docType.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        (item.description && item.description.toLowerCase().includes(q)) ||
        (item.document?.originalFilename && item.document.originalFilename.toLowerCase().includes(q));

      if (!matchesSearch) return false;

      for (const rule of filterRules) {
        if (rule.fieldKey === "status") {
          const itemKey = item.status === "Submitted" ? "submitted" : "missing";
          const match = itemKey === rule.value;
          if (rule.operator === "is_not" ? match : !match) return false;
        } else if (rule.fieldKey === "category") {
          const match = item.category.toLowerCase() === String(rule.value || "").toLowerCase();
          if (rule.operator === "is_not" ? match : !match) return false;
        }
      }

      if (startDate) {
        const s = new Date(startDate).getTime();
        const rowDate = item.document?.createdAt ? new Date(item.document.createdAt).getTime() : NaN;
        if (!isNaN(s) && !isNaN(rowDate) && rowDate < s) return false;
      }
      if (endDate) {
        const e = new Date(endDate);
        e.setHours(23, 59, 59, 999);
        const rowDate = item.document?.createdAt ? new Date(item.document.createdAt).getTime() : NaN;
        if (!isNaN(rowDate) && rowDate > e.getTime()) return false;
      }

      return true;
    });
  }, [requirements, searchQuery, filterRules, startDate, endDate]);

  // Sorted Requirements
  const sortedRequirements = useMemo(() => {
    return [...filteredRequirements].sort((a, b) => {
      let comp = 0;
      if (sortBy === "category") {
        comp = a.category.localeCompare(b.category);
      } else if (sortBy === "status") {
        const order = { "Not Submitted": 0, Submitted: 1 };
        comp = (order[a.status] ?? 2) - (order[b.status] ?? 2);
      } else {
        comp = a.docType.localeCompare(b.docType);
      }
      return sortOrder === "desc" ? -comp : comp;
    });
  }, [filteredRequirements, sortBy, sortOrder]);

  // Grouped Requirements
  const groupedRequirements = useMemo(() => {
    if (groupBy === "none") return [{ key: "all", label: null, items: sortedRequirements }];
    const map = new Map();
    for (const item of sortedRequirements) {
      let key = "Other";
      if (groupBy === "category") key = item.category || "General";
      else if (groupBy === "status") key = item.status === "Submitted" ? "Completed" : "Pending Submission";

      if (!map.has(key)) map.set(key, []);
      map.get(key).push(item);
    }
    return Array.from(map.entries()).map(([label, items]) => ({
      key: label,
      label,
      items,
    }));
  }, [sortedRequirements, groupBy]);

  // Active chips
  const activeChips = useMemo(() => {
    const chips = [];
    filterRules.forEach((rule) => {
      const field = filterFields.find((f) => f.key === rule.fieldKey);
      const fieldLabel = field?.label || rule.fieldKey;
      const optionLabel = field?.options?.find((o) => String(o.value) === String(rule.value))?.label || rule.value;
      chips.push({
        id: rule.id,
        label: `${fieldLabel} ${rule.operator === "is_not" ? "is not" : "is"} ${optionLabel}`,
        onRemove: () => setFilterRules((prev) => prev.filter((r) => r.id !== rule.id)),
      });
    });
    if (startDate || endDate) {
      chips.push({
        id: "dateRange",
        label: `Date: ${formatChipDate(startDate)} – ${formatChipDate(endDate)}`,
        onRemove: () => {
          setStartDate("");
          setEndDate("");
        },
      });
    }
    return chips;
  }, [filterRules, filterFields, startDate, endDate]);

  if (loading && !data) {
    return <StudentComplianceSkeleton />;
  }

  const student = data?.student || {
    studentNo: authUser?.student_no || "Unassigned",
    name: authUser?.name || "Student",
    courseCode: "BSIT",
    courseName: "Bachelor of Science in Information Technology",
    section: "1-1",
  };

  const handleDownloadPdf = async () => {
    setDownloadingPdf(true);
    try {
      const blob = await generateStudentComplianceSlipPdf(
        student,
        sortedRequirements,
        summary
      );
      const safeStudentNo = student.studentNo
        ? String(student.studentNo).replace(/[^0-9A-Za-z-]/g, "")
        : "SUMMARY";
      const fileName = generateExportFilename("STUDENT-COMPLIANCE", safeStudentNo, "pdf");
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success("Checklist PDF Downloaded", {
        description: `Saved as ${fileName}`,
      });
    } catch (err) {
      console.error("PDF download failed:", err);
      const normalized = formatErrorMessage(err, {
        title: "Download Interrupted",
        description: "Unable to generate the compliance PDF. Please try again.",
      });
      toast.error(normalized.title, {
        description: normalized.description,
        action: normalized.action,
      });
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handlePreviewPdf = async () => {
    setIsGeneratingPdf(true);
    setPrintModalOpen(true);
    const request = previewSession.begin();
    try {
      const blob = await generateStudentComplianceSlipPdf(
        student,
        sortedRequirements,
        summary
      );
      const url = previewSession.createUrl(blob, request);
      if (url) {
        setPdfPreviewUrl(url);
      }
    } catch (err) {
      if (!previewSession.isCurrent(request)) return;
      console.error("PDF Preview generation failed:", err);
      toast.error("Preview Failed", {
        description: "Failed to generate compliance slip preview.",
      });
      setPrintModalOpen(false);
    } finally {
      if (previewSession.isCurrent(request)) {
        setIsGeneratingPdf(false);
      }
    }
  };

  return (
    <div className="flex flex-col w-full flex-[1_0_auto]">
      {/* 1. Main Unified Container Card */}
      <Card
        className="flex flex-[1_0_auto] h-auto w-full flex-col p-0 gap-0 overflow-hidden rounded-2xl border border-border bg-white shadow-sm dark:border-border dark:bg-card dark:shadow-none isolate font-jakarta focus:outline-none"
        tabIndex={0}
      >
        {/* A. Header */}
        <PageHeader
          icon="CheckListIcon"
          title={
            <div className="flex flex-wrap items-baseline gap-2">
              <span>Document Checklist & Compliance</span>
              <span className="text-[11px] font-normal tracking-normal text-gray-500 dark:text-zinc-400 tabular-nums">
                {requirements.length} {requirements.length === 1 ? "requirement" : "requirements"}
                {student.studentNo ? ` · ${student.studentNo}` : ""}
              </span>
            </div>
          }
          description="Track your submitted credentials and monitor required documents for university records compliance."
          showBorder={false}
          className="p-6"
          titleClassName="text-[18px] font-semibold tracking-[-0.01em] text-gray-900 dark:text-zinc-50"
          descriptionClassName="text-[13px] font-normal text-gray-500 dark:text-zinc-400 mt-[4px]"
          actions={
            <div className="flex items-center gap-2">
              <RefreshButton
                onRefresh={() => loadComplianceData(true)}
                isLoading={refreshing}
                title="Refresh Checklist"
              />

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleDownloadPdf}
                disabled={downloadingPdf || loading}
                className="h-9 shrink-0 px-4 text-xs font-semibold rounded-xl border border-border dark:border-border bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-xs cursor-pointer active:scale-95 transition-all disabled:opacity-50"
              >
                {downloadingPdf ? (
                  <span className="flex items-center gap-1.5">
                    <Loading01Icon size="1em" className="animate-spin text-sm" />
                    Downloading...
                  </span>
                ) : (
                  PDF_ACTION_LABELS.download
                )}
              </Button>

              <Button
                type="button"
                size="sm"
                onClick={handlePreviewPdf}
                disabled={isGeneratingPdf || loading}
                className="h-9 px-4 border-0 cursor-pointer"
              >
                {isGeneratingPdf ? (
                  <span className="flex items-center gap-1.5">
                    <Loading01Icon size="1em" className="animate-spin text-sm" />
                    Generating...
                  </span>
                ) : (
                  PDF_ACTION_LABELS.preview
                )}
              </Button>
            </div>
          }
        />

        {/* B. KPI Stat Cards Row */}
        <div className="px-6 pb-6">
          <StudentComplianceKpiCards summary={summary} />
        </div>

        {/* C. Canonical 2-Zone DataViewToolbar */}
        <DataViewToolbar
          label="Compliance search, views, and filters"
          className="border-t border-border dark:border-border p-4 sm:px-5 sm:py-3 gap-2 bg-white dark:bg-card flex flex-wrap items-center justify-between select-none"
        >
          {/* Left Zone: DashboardSearch */}
          <div className="flex min-w-0 items-center gap-2">
            <DashboardSearch
              value={searchQuery}
              onChange={setSearchQuery}
              count={filteredRequirements.length}
              loading={loading || refreshing}
              label="Search requirements"
              placeholder="Search requirements..."
            />
          </div>

          {/* Right Zone: Filter -> Sort -> Group -> DateRange -> View Mode Switcher */}
          <div className="ml-auto flex shrink-0 items-center gap-2">
            <FilterPopover
              fields={filterFields}
              filters={filterRules}
              onFiltersChange={setFilterRules}
              entityLabel="requirements"
            />
            <SortPopover
              options={sortOptions}
              sortBy={sortBy}
              onSortByChange={(val) => {
                setSortBy(val);
                setSortOrder("asc");
              }}
              sortOrder={sortOrder}
              onSortOrderChange={setSortOrder}
            />
            <GroupPopover
              options={groupOptions}
              groupBy={groupBy}
              onGroupByChange={setGroupBy}
            />
            <DateRangeFilterButton
              startDate={startDate}
              endDate={endDate}
              onApply={({ startDate: s, endDate: e }) => {
                setStartDate(s);
                setEndDate(e);
              }}
              onClear={() => {
                setStartDate("");
                setEndDate("");
              }}
              disableFutureDates={true}
            />
            <SegmentedControl
              value={viewMode === "cards" ? "grid" : viewMode}
              onValueChange={setViewMode}
              variant="capsule"
              className="inline-grid grid-flow-col auto-cols-fr shrink-0"
              items={[
                {
                  value: "grid",
                  title: "Grid View",
                  ariaLabel: "Grid View",
                  icon: <ViewModeIcon mode="grid" className="text-sm" />,
                },
                {
                  value: "list",
                  title: "List View",
                  ariaLabel: "List View",
                  icon: <ViewModeIcon mode="list" className="text-sm" />,
                },
              ]}
            />
          </div>
        </DataViewToolbar>

        {/* D. Active Filter Chips Bar */}
        {activeChips.length > 0 && (
          <ActiveFilterChips
            chips={activeChips}
            onClearAll={() => {
              setFilterRules([]);
              setStartDate("");
              setEndDate("");
              setSearchQuery("");
            }}
            className="border-t border-border dark:border-border bg-white dark:bg-card px-6 py-2.5"
          />
        )}

        {/* E. Requirements Content (Cards or List) */}
        <div
          className={cn(
            "flex flex-[1_0_auto] flex-col border-t border-border dark:border-border",
            sortedRequirements.length > 0 && viewMode === "list" ? "min-w-0" : "p-6"
          )}
        >
          {sortedRequirements.length === 0 ? (
            <div className="rounded-b-2xl flex-1 flex flex-col items-center justify-center min-h-[420px] w-full">
              <Empty>
                <EmptyHeader>
                  <EmptyMedia>{searchQuery || filterRules.length > 0 || startDate || endDate ? <EmptySearch01Icon size="1em" /> : <EmptyCheckListIcon size="1em" />}</EmptyMedia>
                  <EmptyTitle>
                    {searchQuery || filterRules.length > 0 || startDate || endDate
                      ? "No Matches Found"
                      : "No Document Requirements Assigned"}
                  </EmptyTitle>
                  <EmptyDescription>
                    {searchQuery || filterRules.length > 0 || startDate || endDate
                      ? "Try adjusting your search query or clearing some of the combined filters."
                      : "There are currently no document requirements assigned for your degree program."}
                  </EmptyDescription>
                </EmptyHeader>
                {(searchQuery || filterRules.length > 0 || startDate || endDate) && (
                  <EmptyContent>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSearchQuery("");
                        setFilterRules([]);
                        setStartDate("");
                        setEndDate("");
                      }}
                      title="Reset Filters"
                      className="h-9 px-4 text-xs font-semibold rounded-xl"
                    >
                      Reset Filters
                    </Button>
                  </EmptyContent>
                )}
              </Empty>
            </div>
          ) : viewMode === "list" ? (
            /* SuperAdmin-Inspired Sleek Horizontal List View */
            <div className="flex flex-col flex-1 divide-y divide-border dark:divide-border bg-white dark:bg-card font-jakarta">
              {groupedRequirements.map((group) => {
                const isCollapsed = Boolean(collapsedGroups[group.key]);
                const isGrouped = Boolean(group.label && groupBy !== "none");

                return (
                  <div key={group.key} className="flex flex-col">
                    {/* Collapsible Group Header (if grouped) */}
                    {isGrouped && (
                      <button
                        type="button"
                        onClick={() => toggleGroup(group.key)}
                        className="w-full flex items-center justify-between border-b border-border text-left hover:bg-gray-100/60 dark:hover:bg-zinc-800/40 transition-colors select-none cursor-pointer px-5 py-2.5 bg-gray-50/80 dark:bg-zinc-900/60 sticky top-0 z-10 backdrop-blur-xs"
                        aria-expanded={!isCollapsed}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <ArrowDown01Icon
                            size="1em"
                            className={cn(
                              "text-gray-400 dark:text-zinc-500 text-sm transition-transform duration-200 shrink-0",
                              isCollapsed && "-rotate-90"
                            )}
                          />
                          <span className="text-xs font-semibold text-gray-900 dark:text-zinc-100 truncate">
                            {group.label}
                          </span>
                          <span className={cn(BADGE_BASE, BADGE_PALETTES.slate)}>
                            {group.items.length}
                          </span>
                        </div>
                        <span className="text-[11px] text-gray-400 dark:text-zinc-500 font-medium">
                          {isCollapsed ? "Expand" : "Collapse"}
                        </span>
                      </button>
                    )}

                    {/* Group Items */}
                    {!isCollapsed && (
                      <div className="divide-y divide-gray-100 dark:divide-zinc-800/60">
                        {group.items.map((item) => {
                          const isSubmitted = item.status === "Submitted";

                          return (
                            <div
                              key={item.id}
                              onClick={() => setSelectedRequirement(item)}
                              className={cn(
                                "group flex items-center justify-between hover:bg-gray-50/80 dark:hover:bg-zinc-800/40 transition-colors cursor-pointer select-none border-b border-gray-100 dark:border-zinc-800/60 last:border-b-0",
                                densityClasses.paddingX,
                                densityClasses.paddingY,
                                densityClasses.gap,
                                densityClasses.minHeight
                              )}
                            >
                              {/* Left: Category Icon, Title, and Formatted Description Context */}
                              <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1 mr-2">
                                <div
                                  className={cn(
                                    "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 shadow-2xs",
                                    isSubmitted
                                      ? "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400"
                                      : "bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400"
                                  )}
                                >
                                  <AppIcon className="text-base" icon={getRequirementCategoryIcon(item.category)} />
                                </div>

                                <div className="flex flex-col min-w-0 flex-1">
                                  <span className="text-xs sm:text-sm font-medium text-gray-900 dark:text-zinc-100 group-hover:text-pup-maroon dark:group-hover:text-red-400 transition-colors truncate">
                                    {item.docType}
                                  </span>

                                  {item.description && (
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <span className="text-[11px] sm:text-xs text-gray-500 dark:text-zinc-400 truncate block mt-0.5 max-w-xl font-normal select-text">
                                          <NarrativeText text={item.description} mode="compact" />
                                        </span>
                                      </TooltipTrigger>
                                      <TooltipContent
                                        side="top"
                                        className="max-w-[440px] rounded-xl border-border bg-white p-3 text-xs font-medium text-gray-700 shadow-xl backdrop-blur-sm dark:border-border dark:bg-card/95 dark:text-zinc-200"
                                      >
                                        <NarrativeText text={item.description} mode="full" />
                                      </TooltipContent>
                                    </Tooltip>
                                  )}
                                </div>
                              </div>

                              {/* Right: Category Pill, Status Pill, Timestamp, and Action Button */}
                              <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
                                <span className={cn(BADGE_BASE, BADGE_PALETTES.gray, "hidden sm:inline-flex")}>
                                  {item.category}
                                </span>

                                {isSubmitted ? (
                                  <span className={cn(BADGE_BASE, BADGE_PALETTES.emerald)}>
                                    Completed
                                  </span>
                                ) : (
                                  <span className={cn(BADGE_BASE, BADGE_PALETTES.amber)}>
                                    Pending Submission
                                  </span>
                                )}

                                {isSubmitted && item.document?.createdAt && (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <span className="text-[11px] text-gray-400 dark:text-zinc-500 font-normal tabular-nums hidden lg:inline shrink-0">
                                        {formatPHDateTime(item.document.createdAt, { dateOnly: true })}
                                      </span>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      Archived on {formatPHDateTime(item.document.createdAt)}
                                    </TooltipContent>
                                  </Tooltip>
                                )}

                                <div className="flex items-center justify-end ml-1">
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setSelectedRequirement(item);
                                        }}
                                        aria-label="View Details"
                                        title="View Details"
                                        className="table-action-button rounded-lg active:scale-95 cursor-pointer"
                                      >
                                        <ViewIcon size="1em" className="text-[14px]" />
                                      </button>
                                    </TooltipTrigger>
                                    <TooltipContent>View Details</TooltipContent>
                                  </Tooltip>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            /* Cards View */
            <div className="space-y-6">
              {groupedRequirements.map((group) => (
                <div key={group.key} className="space-y-4">
                  {group.label && (
                    <div className="flex items-center justify-between px-1">
                      <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80">
                        {group.label}
                      </span>
                      <span className="text-xs text-gray-400 dark:text-zinc-500">
                        {group.items.length} {group.items.length === 1 ? "requirement" : "requirements"}
                      </span>
                    </div>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 items-stretch">
                    {group.items.map((item) => {
                      const isSubmitted = item.status === "Submitted";

                      return (
                        <div
                          key={item.id}
                          onClick={() => setSelectedRequirement(item)}
                          className="group flex flex-col justify-between rounded-3xl bg-[#f5f5f7] dark:bg-zinc-850/60 p-6 sm:p-7 text-left transition-all duration-300 hover:-translate-y-1 hover:shadow-xs border border-transparent dark:border-white/5 cursor-pointer"
                        >
                          <div className="flex flex-col flex-grow">
                            <div className="flex items-start justify-between gap-4 mb-4">
                              <div
                                className={cn(
                                  "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105",
                                  isSubmitted
                                    ? "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400"
                                    : "bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400"
                                )}
                              >
                                <AppIcon className={cn("text-xl", getRequirementCategoryIcon(item.category))} />
                              </div>

                              <div>
                                {isSubmitted ? (
                                  <span className={cn(BADGE_BASE, BADGE_PALETTES.emerald)}>
                                    Completed
                                  </span>
                                ) : (
                                  <span className={cn(BADGE_BASE, BADGE_PALETTES.amber)}>
                                    Pending
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="mb-2">
                              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/80">
                                {item.category}
                              </span>
                              <h4 className="text-[15px] font-bold text-gray-900 dark:text-zinc-50 group-hover:text-pup-maroon dark:group-hover:text-red-400 transition-colors mt-0.5 line-clamp-2">
                                {item.docType}
                              </h4>
                            </div>

                            <div className="text-xs text-gray-500 dark:text-zinc-400 line-clamp-3 mb-5 flex-grow leading-relaxed">
                              <NarrativeText
                                text={item.description || "Required document submission for student institutional archive."}
                                mode="full"
                              />
                            </div>
                          </div>

                          <div className="pt-4 border-t border-black/[0.04] dark:border-white/[0.06] flex items-center justify-between text-xs">
                            <span className="text-[11.5px] text-gray-400 dark:text-zinc-500 font-sans tabular-nums">
                              {isSubmitted && item.document?.createdAt
                                ? formatPHDateTime(item.document.createdAt, { dateOnly: true })
                                : "Awaiting document"}
                            </span>
                            <div className="flex items-center gap-1 font-semibold text-pup-maroon dark:text-red-400 group-hover:translate-x-1 transition-transform">
                              <span>Inspect</span>
                              <ArrowRight02Icon size="1em" className="text-xs" />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      {/* PDF Slip Preview Modal */}
      {printModalOpen && (
        <PDFPreviewModal
          isOpen={printModalOpen}
          onClose={() => {
            previewSession.cancel();
            setIsGeneratingPdf(false);
            setPdfPreviewUrl(null);
            setPrintModalOpen(false);
          }}
          title="Admission Credentials Checklist"
          subtitle={`${student.name} (${student.studentNo}) · ${student.courseCode} ${student.section}`}
          pdfUrl={pdfPreviewUrl}
          isPreparing={isGeneratingPdf}
          onDownload={handleDownloadPdf}
          filename={generateExportFilename("STUDENT-COMPLIANCE", student.studentNo || "SUMMARY", "pdf")}
        />
      )}

      {/* Individual Attached Document Preview Modal */}
      {previewDoc && (
        <PDFPreviewModal
          open={Boolean(previewDoc)}
          onClose={() => setPreviewDoc(null)}
          title={previewDoc.title || "Document Preview"}
          description={previewDoc.subtitle || "Archived digitized credential"}
          pdfUrl={previewDoc.url}
          preview={previewDoc}
          downloadFilename={previewDoc.originalFilename}
        />
      )}

      {/* Permanent Admission Record Interactive Inspector Sheet */}
      {selectedRequirement && (
        <PermanentAdmissionRecordSheet
          open={Boolean(selectedRequirement)}
          onOpenChange={(open) => {
            if (!open) setSelectedRequirement(null);
          }}
          item={selectedRequirement}
          items={sortedRequirements}
          currentIndex={sortedRequirements.findIndex((r) => r.id === selectedRequirement.id)}
          onNavigatePrev={() => {
            const idx = sortedRequirements.findIndex((r) => r.id === selectedRequirement.id);
            if (idx > 0) setSelectedRequirement(sortedRequirements[idx - 1]);
          }}
          onNavigateNext={() => {
            const idx = sortedRequirements.findIndex((r) => r.id === selectedRequirement.id);
            if (idx >= 0 && idx < sortedRequirements.length - 1) setSelectedRequirement(sortedRequirements[idx + 1]);
          }}
          student={student}
          onPreviewDocument={(reqItem) => {
            if (reqItem?.document?.fileUrl || reqItem?.document?.id) {
              setPreviewDoc({
                id: reqItem.document.id,
                url: reqItem.document.fileUrl,
                originalFilename: reqItem.document.originalFilename,
                title: reqItem.docType,
                subtitle: `${student.name} (${student.studentNo})`,
              });
            }
          }}
        />
      )}
    </div>
  );
}
