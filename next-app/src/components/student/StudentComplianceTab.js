"use client";
import { Table } from "@/components/ui/table";

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
import {
  generateStudentComplianceSlipPdf,
} from "@/lib/pdfGenerator";
import useTableScroll from "@/hooks/useTableScroll";
import TableScrollControls from "@/components/shared/TableScrollControls";
import DataViewToolbar from "@/components/shared/DataViewToolbar";
import DashboardSearch from "@/components/shared/DashboardSearch";
import {
  FilterPopover,
  SortPopover,
  GroupPopover,
  ColumnsPopover,
  ActiveFilterChips,
} from "@/components/systemadmin/OfficeTableControls";
import { DateRangeFilterButton } from "@/components/shared/DateRangePickerModal";
import { CheckListIcon as EmptyCheckListIcon, Search01Icon as EmptySearch01Icon, ArrowRight02Icon, ArrowUpDownIcon, CheckmarkCircle01Icon, Clock01Icon, FoldersIcon, Loading01Icon, Location01Icon, Shield01Icon, Tick01Icon } from "hugeicons-react";
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

  // Search & Standard 5-Control Toolbar state
  const [searchQuery, setSearchQuery] = useState("");
  const [filterRules, setFilterRules] = useState([]);
  const [sortBy, setSortBy] = useState("priority");
  const [sortOrder, setSortOrder] = useState("asc");
  const [groupBy, setGroupBy] = useState("none");
  const [visibleColumns, setVisibleColumns] = useState(["docType", "category", "status", "actions"]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [viewMode, setViewMode] = useState("table");

  const loadComplianceData = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);

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
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (!initialData) {
      loadComplianceData();
    }
  }, [initialData]);

  const requirements = data?.requirements || [];
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
    { value: "priority", label: "Default Priority" },
    { value: "docType", label: "Requirement Name" },
    { value: "status", label: "Compliance Status" },
    { value: "category", label: "Category" },
  ], []);

  // Group options
  const groupOptions = useMemo(() => [
    { value: "none", label: "No grouping" },
    { value: "category", label: "Category" },
    { value: "status", label: "Status" },
  ], []);

  // Table columns
  const tableColumns = useMemo(() => [
    { key: "docType", label: "Requirement / Document" },
    { key: "category", label: "Category" },
    { key: "status", label: "Status" },
    { key: "actions", label: "Actions" },
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
      if (sortBy === "docType") {
        comp = a.docType.localeCompare(b.docType);
      } else if (sortBy === "category") {
        comp = a.category.localeCompare(b.category);
      } else if (sortBy === "status") {
        const order = { "Not Submitted": 0, Submitted: 1 };
        comp = (order[a.status] ?? 2) - (order[b.status] ?? 2);
      } else {
        // "priority" (Not Submitted first, then Submitted, then alphabetical)
        const order = { "Not Submitted": 0, Submitted: 1 };
        const diff = (order[a.status] ?? 2) - (order[b.status] ?? 2);
        comp = diff !== 0 ? diff : a.docType.localeCompare(b.docType);
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

  const {
    tableContainerRef,
    canScrollLeft,
    canScrollRight,
    isScrolledX,
    scrollTable,
    resetScroll,
  } = useTableScroll([sortedRequirements?.length]);

  useEffect(() => {
    resetScroll();
  }, [searchQuery, filterRules, viewMode, resetScroll]);

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
          title="Document Checklist & Compliance"
          description="Track your submitted credentials and monitor required documents for university records compliance."
          showBorder={false}
          className="p-6"
          titleClassName="text-[18px] font-semibold tracking-[-0.01em] text-gray-900 dark:text-zinc-50"
          descriptionClassName="text-[13px] font-normal text-gray-900 dark:text-zinc-300 mt-[4px]"
          actions={
            <div className="flex items-center gap-2">
              <span className={cn(BADGE_BASE, BADGE_PALETTES.gray, "hidden md:inline-flex")}>
                Viewer Only
              </span>
              {student.studentNo && (
                <span className={cn(BADGE_BASE, BADGE_PALETTES.maroon, "hidden sm:inline-flex")}>
                  {student.studentNo}
                </span>
              )}

              <RefreshButton
                onRefresh={() => loadComplianceData(true)}
                isLoading={refreshing}
                title="Refresh Checklist"
              />

              <Button
                type="button"
                variant="outline"
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
                onClick={() => setPrintModalOpen(true)}
                className="h-9 px-4 border-0 cursor-pointer"
              >
                {PDF_ACTION_LABELS.preview}
              </Button>
            </div>
          }
        />

        {/* B. KPI Stat Cards Row */}
        <div className="px-6 pb-6">
          <StudentComplianceKpiCards summary={summary} />
        </div>

        {/* Connected Row: View Mode Switcher (Grid / Table) */}
        <div
          role="group"
          aria-label="Student compliance view options"
          className="flex items-center justify-between px-6 py-2.5 border-t border-border dark:border-white/10 bg-white dark:bg-card overflow-x-auto scrollbar-none gap-4 select-none"
        >
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-900 dark:text-zinc-100">Admission Credentials</span>
            <span className="text-[11px] text-gray-500 dark:text-zinc-400">({filteredRequirements.length} requirements)</span>
          </div>
          <div className="ml-auto shrink-0">
            <SegmentedControl
              value={viewMode === "cards" ? "grid" : viewMode}
              onValueChange={setViewMode}
              variant="capsule"
              className="inline-grid grid-flow-col auto-cols-fr shrink-0"
              items={[
                {
                  value: "grid",
                  label: "Grid",
                  icon: <ViewModeIcon mode="grid" className="text-sm" />,
                },
                {
                  value: "table",
                  label: "Table",
                  icon: <ViewModeIcon mode="table" className="text-sm" />,
                },
              ]}
            />
          </div>
        </div>

        {/* C. Canonical 2-Zone DataViewToolbar */}
        <DataViewToolbar
          label="Compliance search, views, and filters"
          className="border-t border-border dark:border-border p-4 sm:px-5 sm:py-3 gap-2 bg-white dark:bg-card flex flex-wrap items-center justify-between select-none"
        >
          {/* Left Zone: DashboardSearch + TableScrollControls */}
          <div className="flex min-w-0 items-center gap-2">
            <DashboardSearch
              value={searchQuery}
              onChange={setSearchQuery}
              count={filteredRequirements.length}
              loading={loading || refreshing}
              label="Search requirements"
              placeholder="Search requirements..."
            />
            {viewMode === "table" && (
              <TableScrollControls
                scrollContainerRef={tableContainerRef}
                canScrollLeft={canScrollLeft}
                canScrollRight={canScrollRight}
                onScrollLeft={() => scrollTable("left")}
                onScrollRight={() => scrollTable("right")}
              />
            )}
          </div>

          {/* Right Zone: Filter -> Sort -> Group -> Columns -> DateRange */}
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
            {viewMode === "table" && (
              <ColumnsPopover
                columns={tableColumns}
                visibleColumns={visibleColumns}
                onVisibleColumnsChange={setVisibleColumns}
                minVisible={2}
              />
            )}
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

        {/* E. Requirements Content (Cards or Table) */}
        <div
          className={cn(
            "flex flex-[1_0_auto] flex-col border-t border-border dark:border-border",
            sortedRequirements.length > 0 && viewMode === "table" ? "min-w-0" : "p-6"
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
          ) : viewMode === "table" ? (
            /* Table View */
            <div
              ref={tableContainerRef}
              className="w-full flex-[1_0_auto] overflow-x-auto show-scrollbar pb-2 select-none"
            >
              <Table
                columns={visibleColumns.map((colKey) => {
                  if (colKey === "docType") return { kind: "text", maxWidth: 340 };
                  if (colKey === "category") return "category";
                  if (colKey === "status") return "status";
                  return "actions";
                })}
                className="min-w-[750px]"
              >
                <thead className="sticky top-0 z-10 border-b border-border bg-gray-50/90 dark:bg-zinc-900/90 backdrop-blur-xs select-none">
                  <tr className="text-left text-xs font-semibold text-gray-500 dark:text-zinc-400 select-none">
                    {visibleColumns.includes("docType") && (
                      <th className="p-4 pl-6 w-[44%]">Requirement</th>
                    )}
                    {visibleColumns.includes("category") && (
                      <th className="p-4 w-[22%] whitespace-nowrap">Category</th>
                    )}
                    {visibleColumns.includes("status") && (
                      <th className="p-4 w-[22%] whitespace-nowrap">Status</th>
                    )}
                    {visibleColumns.includes("actions") && (
                      <th className="p-4 pr-6 w-[12%] text-right whitespace-nowrap text-xs font-semibold text-gray-500 dark:text-zinc-400">
                        Actions
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border dark:divide-border">
                  {groupedRequirements.map((group) => (
                    <tbody key={group.key} className="divide-y divide-border dark:divide-border contents">
                      {group.label && (
                        <tr className="bg-gray-50/70 dark:bg-zinc-800/60 border-y border-border">
                          <td colSpan={visibleColumns.length} className="px-6 py-2 text-xs font-semibold text-gray-700 dark:text-zinc-300">
                            <span className="font-bold">{group.label}</span>
                            <span className="ml-2 font-normal text-muted-foreground">({group.items.length})</span>
                          </td>
                        </tr>
                      )}
                      {group.items.map((item) => {
                        const isSubmitted = item.status === "Submitted";

                        return (
                          <tr
                            key={item.id}
                            onClick={() => setSelectedRequirement(item)}
                            className="hover:bg-gray-50/70 dark:hover:bg-zinc-800/40 transition-colors cursor-pointer select-none group"
                          >
                            {visibleColumns.includes("docType") && (
                              <td className="p-4 pl-6 overflow-hidden border-r border-border/70 dark:border-border/70">
                                <div className="font-semibold text-gray-900 dark:text-zinc-100 text-xs truncate group-hover:text-pup-maroon dark:group-hover:text-red-400 transition-colors" title={item.docType}>
                                  {item.docType}
                                </div>
                                <div className="text-[11px] text-gray-400 dark:text-zinc-500 truncate mt-0.5" title={item.description}>
                                  {item.description}
                                </div>
                              </td>
                            )}
                            {visibleColumns.includes("category") && (
                              <td className="p-4 text-xs font-medium text-gray-900 dark:text-zinc-300 whitespace-nowrap border-r border-border/70 dark:border-border/70">
                                {item.category}
                              </td>
                            )}
                            {visibleColumns.includes("status") && (
                              <td className="p-4 whitespace-nowrap border-r border-border/70 dark:border-border/70">
                                {isSubmitted ? (
                                  <div className="flex items-center gap-2">
                                    <span className={cn(BADGE_BASE, BADGE_PALETTES.emerald)}>
                                      Completed
                                    </span>
                                    {item.document?.createdAt && (
                                      <span className="text-[10.5px] font-sans tabular-nums text-gray-400 dark:text-zinc-500">
                                        {formatPHDateTime(item.document.createdAt, { dateOnly: true })}
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <span className={cn(BADGE_BASE, BADGE_PALETTES.amber)}>
                                    Pending Submission
                                  </span>
                                )}
                              </td>
                            )}
                            {visibleColumns.includes("actions") && (
                              <td className="p-4 pr-6 text-right whitespace-nowrap">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedRequirement(item);
                                  }}
                                  className="h-8 px-3 text-xs font-semibold rounded-lg border border-border dark:border-border bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 active:scale-95 transition-all cursor-pointer shadow-xs inline-flex items-center gap-1.5 opacity-70 group-hover:opacity-100 hover:opacity-100 focus-within:opacity-100"
                                >
                                  View Details
                                </Button>
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  ))}
                </tbody>
              </Table>
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

                            <p className="text-xs text-gray-500 dark:text-zinc-400 line-clamp-3 mb-5 flex-grow">
                              {item.description || "Required document submission for student institutional archive."}
                            </p>
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
          onClose={() => setPrintModalOpen(false)}
          title="Admission Credentials Checklist"
          subtitle={`${student.name} (${student.studentNo}) · ${student.courseCode} ${student.section}`}
          pdfGenerator={async () => generateStudentComplianceSlipPdf(student, sortedRequirements, summary)}
          filename={generateExportFilename("STUDENT-COMPLIANCE", student.studentNo || "SUMMARY", "pdf")}
        />
      )}

      {/* Permanent Admission Record Interactive Inspector Sheet */}
      {selectedRequirement && (
        <PermanentAdmissionRecordSheet
          open={Boolean(selectedRequirement)}
          onOpenChange={(open) => {
            if (!open) setSelectedRequirement(null);
          }}
          requirement={selectedRequirement}
          student={student}
        />
      )}
    </div>
  );
}
