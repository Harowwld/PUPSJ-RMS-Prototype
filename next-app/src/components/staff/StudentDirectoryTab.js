"use client";
import { BADGE_BASE, BADGE_PALETTES } from "@/lib/badgeStyles";

import { Table } from "@/components/ui/table";
import TablePagination from "@/components/shared/TablePagination";

import useUrlPage from "@/hooks/useUrlPage";
import React, { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import PageHeader from "@/components/shared/PageHeader";
import { RefreshButton } from "@/components/shared/RefreshButton";
import FloatingActionBar from "@/components/shared/FloatingActionBar";
import ConfirmModal from "@/components/shared/ConfirmModal";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyMedia,
  EmptyContent,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { cn, formatTitleCase } from "@/lib/utils";
import { Reorder } from "framer-motion";
import RegisterStudentModal from "./RegisterStudentModal";
import BulkImportStudentsModal from "./BulkImportStudentsModal";
import EditStudentModal from "./EditStudentModal";
import StudentProfileSheet from "./StudentProfileSheet";
import MultiCriteriaFilter from "@/components/shared/MultiCriteriaFilter";
import ActiveFilterChips from "@/components/shared/ActiveFilterChips";
import TableScrollControls from "@/components/shared/TableScrollControls";
import DataViewToolbar from "@/components/shared/DataViewToolbar";
import {
  FilterPopover,
  SortPopover,
  GroupPopover,
  ColumnsPopover,
} from "@/components/systemadmin/OfficeTableControls";
import DashboardSearch from "@/components/systemadmin/DashboardSearch";
import { DateRangeFilterButton } from "@/components/shared/DateRangePickerModal";
import { SegmentedControl } from "@/components/ui/tabs";
import useTableScroll from "@/hooks/useTableScroll";
import { formatErrorMessage } from "@/lib/errorUtils";
import { hasAdminPrivileges } from "@/lib/roleUtils";
import { generateExportFilename } from "@/lib/exportHelpers";
import { fetchAllPages } from "@/lib/fetchAllPages";
import { StudentIcon as EmptyStudentIcon , Archive01Icon, Archive02Icon, ArrowDown01Icon, ArrowUp01Icon, ArrowUpDownIcon, CompassIcon, DragDropIcon, File02Icon, LibraryIcon, Location01Icon, PencilEdit01Icon, Search01Icon, UserSearch01Icon, ViewIcon} from "hugeicons-react";
import AppIcon from "@/components/ui/app-icon";

const STUDENT_SORT_OPTIONS = [
  { key: "studentNo", label: "Student Number" },
  { key: "name", label: "Student Name" },
  { key: "courseCode", label: "Academic Program" },
  { key: "yearLevel", label: "Year Level" },
  { key: "section", label: "Section" },
  { key: "location", label: "Physical Archive" },
];

const STUDENT_GROUP_OPTIONS = [
  { key: "courseCode", label: "Program", icon: LibraryIcon },
  { key: "yearLevel", label: "Year Level", icon: CompassIcon },
  { key: "section", label: "Section", icon: UserSearch01Icon },
  { key: "none", label: "No grouping" },
];

const STUDENT_TABLE_COLUMNS = [
  { key: "studentNo", label: "Student Number" },
  { key: "name", label: "Student Name" },
  { key: "courseCode", label: "Program" },
  { key: "yearLevel", label: "Year Level" },
  { key: "section", label: "Section" },
  { key: "location", label: "Storage Location" },
  { key: "documentCount", label: "Documents" },
  { key: "status", label: "Status" },
];
function SortIndicator({ column, sortBy, sortOrder }) {
  if (sortBy !== column) {
    return (
      <ArrowUpDownIcon size="1em"  className="ml-1 text-[11px] opacity-40 transition-opacity group-hover:opacity-70 dark:opacity-30"></ArrowUpDownIcon>
    );
  }
  return sortOrder === "ASC" ? (
    <ArrowUp01Icon size="1em"  className="ml-1 text-[11px] text-pup-maroon dark:text-red-400"></ArrowUp01Icon>
  ) : (
    <ArrowDown01Icon size="1em"  className="ml-1 text-[11px] text-pup-maroon dark:text-red-400"></ArrowDown01Icon>
  );
}

export default function StudentDirectoryTab({
  authUser = null,
  loading = false,
  courses = [],
  sections = [],
  storageLayout = null,
  onLocateStudent,
  onPreviewDocument,
  onRescan,
  fetchData,
  showToast,
}) {
  const [activeTab, setActiveTab] = useState("active"); // "active" | "archived"
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [courseFilters, setCourseFilters] = useState([]);
  const [yearFilters, setYearFilters] = useState([]);
  const [sectionFilters, setSectionFilters] = useState([]);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [browseSummary, setBrowseSummary] = useState(null);
  const [browsePage, setBrowsePage] = useState({ rows: [], total: 0 });
  const [browseLoading, setBrowseLoading] = useState(true);
  const [hasLoadedPage, setHasLoadedPage] = useState(false);
  const [browseVersion, setBrowseVersion] = useState(0);
  const [profileDocs, setProfileDocs] = useState({ studentNo: null, rows: [] });
  const [selectedKpi, setSelectedKpi] = useState(null);
  const [kpiOrder, setKpiOrder] = useState(["students", "programs", "documents"]);;
  const statCardsRef = useRef(null);

  // Close expandable KPI card when clicking outside
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

  // Sorting & View Preferences
  const [sortBy, setSortBy] = useState("studentNo");
  const [sortOrder, setSortOrder] = useState("ASC");
  const [filterRules, setFilterRules] = useState([]);
  const [groupBy, setGroupBy] = useState("none");
  const [visibleColumns, setVisibleColumns] = useState(() => STUDENT_TABLE_COLUMNS.map((c) => c.key));
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Pagination
  const [page, setPage] = useUrlPage();
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const onDataChanged = useCallback(async () => {
    await fetchData?.();
    setBrowseVersion((version) => version + 1);
  }, [fetchData]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery.trim()), 250);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/students/browse?mode=summary", { cache: "no-store", signal: controller.signal })
      .then((res) => res.json())
      .then((json) => { if (json?.ok) setBrowseSummary(json.data); })
      .catch((error) => { if (error.name !== "AbortError") showToast?.({ title: "Directory Load Failed", description: "Could not load directory totals." }, true); });
    return () => controller.abort();
  }, [browseVersion, showToast]);

  const browseParams = useMemo(() => {
    const params = new URLSearchParams({ archived: String(activeTab === "archived"), page: String(page), pageSize: String(itemsPerPage), sortBy, sortOrder });
    if (debouncedSearch) params.set("q", debouncedSearch);
    const ruleCourses = filterRules.filter(r => r.fieldKey === "course" && r.operator === "is").map(r => r.value);
    const ruleYears = filterRules.filter(r => r.fieldKey === "year" && r.operator === "is").map(r => r.value);
    const ruleSections = filterRules.filter(r => r.fieldKey === "section" && r.operator === "is").map(r => r.value);
    [...new Set([...courseFilters, ...ruleCourses])].forEach((value) => params.append("course", value));
    [...new Set([...yearFilters, ...ruleYears])].forEach((value) => params.append("year", value));
    [...new Set([...sectionFilters, ...ruleSections])].forEach((value) => params.append("section", value));
    if (startDate) params.set("startDate", startDate);
    if (endDate) params.set("endDate", endDate);
    return params.toString();
  }, [activeTab, page, itemsPerPage, sortBy, sortOrder, debouncedSearch, courseFilters, yearFilters, sectionFilters, filterRules, startDate, endDate]);

  useEffect(() => {
    const controller = new AbortController();
    const loadingTimer = setTimeout(() => setBrowseLoading(true), 0);
    fetch(`/api/students/browse?${browseParams}`, { cache: "no-store", signal: controller.signal })
      .then((res) => res.json())
      .then((json) => { if (json?.ok) { setBrowsePage(json.data); setHasLoadedPage(true); } else throw new Error(json?.error || "Directory unavailable"); })
      .catch((error) => { if (error.name !== "AbortError") showToast?.({ title: "Directory Load Failed", description: error.message }, true); })
      .finally(() => { if (!controller.signal.aborted) setBrowseLoading(false); });
    return () => { clearTimeout(loadingTimer); controller.abort(); };
  }, [browseParams, browseVersion, showToast]);

  // Modals
  const [registerOpen, setRegisterOpen] = useState(false);
  const [bulkImportOpen, setBulkImportOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [activeStudent, setActiveStudent] = useState(null);

  useEffect(() => {
    if (!profileOpen || !activeStudent?.studentNo) return;
    const studentNo = activeStudent.studentNo;
    let active = true;
    fetchAllPages(`/api/documents?studentNo=${encodeURIComponent(studentNo)}&excludeDeclined=1`, 200)
      .then((docs) => { if (active) setProfileDocs({ studentNo, rows: docs }); })
      .catch(() => { if (active) setProfileDocs({ studentNo, rows: [] }); });
    return () => { active = false; };
  }, [profileOpen, activeStudent?.studentNo, browseVersion]);

  // Archive / Restore Confirm Modals
  const [archiveTarget, setArchiveTarget] = useState(null);
  const [archiveModalOpen, setArchiveModalOpen] = useState(false);
  const [restoreTarget, setRestoreTarget] = useState(null);
  const [restoreModalOpen, setRestoreModalOpen] = useState(false);
  const [bulkActionOpen, setBulkActionOpen] = useState(false);
  const [bulkActionType, setBulkActionType] = useState("archive"); // "archive" | "restore"
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);

  const allAvailableStudents = browsePage.rows;

  // Reset selection when switching directory tabs (active / archived)
  useEffect(() => {
    const timer = setTimeout(() => {
      setSelectedIds(new Set());
      setPage(1);
    }, 0);
    return () => clearTimeout(timer);
  }, [activeTab, setPage]);

  // Unique years for filter
  const availableYears = useMemo(() => {
    const years = new Set();
    (browseSummary?.facets || []).forEach((entry) => {
      const yr = Number(entry.year_level);
      if (Number.isFinite(yr) && yr >= 2000) years.add(yr);
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [browseSummary]);

  // Dynamic sections filtered by courseFilters
  const availableFilterSections = useMemo(() => {
    if (courseFilters.length === 0) {
      const secs = new Set(sections.map((s) => s.name));
      return Array.from(secs).sort();
    }
    const upperCodes = new Set(courseFilters.map((c) => c.toUpperCase()));
    return sections
      .filter((s) => upperCodes.has(String(s.course_code || "").toUpperCase()))
      .map((s) => s.name)
      .sort();
  }, [sections, courseFilters]);

  // Document count lookup map
  const docCountMap = useMemo(() => {
    const map = new Map();
    allAvailableStudents.forEach((student) => {
      map.set(String(student.studentNo).toUpperCase(), student.documentCount || 0);
    });
    return map;
  }, [allAvailableStudents]);

  // KPI card calculations
  const kpiStats = useMemo(() => {
    const activeCount = browseSummary?.counts?.active || 0;
    const assignedDrawersCount = browseSummary?.counts?.assigned || 0;

    // Top programs by enrollment
    const courseCounts = {};
    (browseSummary?.facets || []).filter((entry) => entry.status === "Active").forEach((entry) => {
      const code = entry.course_code || "Unassigned";
      courseCounts[code] = (courseCounts[code] || 0) + entry.count;
    });
    const topPrograms = Object.entries(courseCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    // Section breakdown by program
    const programsList = courses.map((c) => {
      const secCount = sections.filter(
        (sec) =>
          String(sec.course_code || sec.courseCode || "").toUpperCase() ===
          String(c.code).toUpperCase()
      ).length;
      const stuCount = courseCounts[c.code] || 0;
      return { code: c.code, name: c.name, secCount, stuCount };
    });

    // Document breakdown
    const studentsWithFilesCount = browseSummary?.documents?.students_with_files || 0;
    const topDocTypes = (browseSummary?.docTypes || []).map((entry) => [entry.doc_type, entry.count]);

    return {
      activeCount,
      assignedDrawersCount,
      topPrograms,
      programsList,
      totalPrograms: courses.length,
      totalSections: sections.length,
      totalDocs: browseSummary?.documents?.total || 0,
      studentsWithFilesCount,
      topDocTypes,
    };
  }, [browseSummary, courses, sections]);

  // Filtered and sorted students
  const filteredStudents = allAvailableStudents;
  const filteredCount = browsePage.total;

  const filterGroups = useMemo(() => [
    {
      id: "course",
      label: "Academic Program",
      options: (courses || []).map((c) => ({
        value: c.code,
        label: c.code,
        count: (browseSummary?.facets || []).filter((entry) => (activeTab === "archived" ? entry.status !== "Active" : entry.status === "Active") && String(entry.course_code).toUpperCase() === c.code.toUpperCase()).reduce((sum, entry) => sum + entry.count, 0),
      })),
    },
    {
      id: "year",
      label: "Batch / Entry Year",
      options: availableYears.map((yr) => ({
        value: String(yr),
        label: `Batch ${yr}`,
        count: (browseSummary?.facets || []).filter((entry) => (activeTab === "archived" ? entry.status !== "Active" : entry.status === "Active") && Number(entry.year_level) === yr).reduce((sum, entry) => sum + entry.count, 0),
      })),
    },
    {
      id: "section",
      label: "Class Section",
      options: availableFilterSections.map((sec) => ({
        value: sec,
        label: `Section ${sec}`,
        count: (browseSummary?.facets || []).filter((entry) => (activeTab === "archived" ? entry.status !== "Active" : entry.status === "Active") && String(entry.section).toUpperCase() === sec.toUpperCase()).reduce((sum, entry) => sum + entry.count, 0),
      })),
    },
  ], [courses, browseSummary, activeTab, availableYears, availableFilterSections]);

  const filterValues = useMemo(() => ({
    course: courseFilters,
    year: yearFilters,
    section: sectionFilters,
  }), [courseFilters, yearFilters, sectionFilters]);

  const handleFilterChange = useCallback((groupId, values) => {
    if (groupId === "course") {
      setCourseFilters(values);
      setPage(1);
    } else if (groupId === "year") {
      setYearFilters(values);
      setPage(1);
    } else if (groupId === "section") {
      setSectionFilters(values);
      setPage(1);
    }
  }, [setPage]);

  const filterFields = useMemo(() => [
    {
      key: "course",
      label: "Program",
      options: (courses || []).map((c) => ({
        value: c.code,
        label: `${c.code}${c.name ? ` - ${c.name}` : ""}`,
      })),
    },
    {
      key: "year",
      label: "Batch / Entry Year",
      options: availableYears.map((yr) => ({
        value: String(yr),
        label: `Batch ${yr}`,
      })),
    },
    {
      key: "section",
      label: "Section",
      options: availableFilterSections.map((sec) => ({
        value: sec,
        label: `Section ${sec}`,
      })),
    },
  ], [courses, availableYears, availableFilterSections]);

  const handleResetFilters = useCallback(() => {
    setSearchQuery("");
    setCourseFilters([]);
    setYearFilters([]);
    setSectionFilters([]);
    setFilterRules([]);
    setStartDate("");
    setEndDate("");
    setPage(1);
  }, [setPage]);

  const activeChips = useMemo(() => {
    const chips = [];
    if (searchQuery.trim()) {
      chips.push({
        id: "search",
        label: `Search: ${searchQuery.trim()}`,
        onRemove: () => { setSearchQuery(""); setPage(1); },
      });
    }
    filterRules.forEach((rule) => {
      const field = filterFields.find((f) => f.key === rule.fieldKey);
      const fieldLabel = field?.label || rule.fieldKey;
      const opt = field?.options?.find((o) => String(o.value) === String(rule.value));
      const valLabel = opt?.label || String(rule.value);
      chips.push({
        id: rule.id,
        label: `${fieldLabel} ${rule.operator === "is_not" ? "is not" : "is"} ${valLabel}`,
        onRemove: () => {
          setFilterRules((prev) => prev.filter((r) => r.id !== rule.id));
          setPage(1);
        },
      });
    });
    if (startDate || endDate) {
      chips.push({
        id: "dateRange",
        label: `Range: ${startDate || "..."} to ${endDate || "..."}`,
        onRemove: () => { setStartDate(""); setEndDate(""); setPage(1); },
      });
    }
    courseFilters.forEach((c) => {
      chips.push({
        id: `course-${c}`,
        label: `Program: ${c}`,
        onRemove: () => { setCourseFilters((prev) => prev.filter((item) => item !== c)); setPage(1); },
      });
    });
    yearFilters.forEach((y) => {
      chips.push({
        id: `year-${y}`,
        label: `Batch ${y}`,
        onRemove: () => { setYearFilters((prev) => prev.filter((item) => item !== y)); setPage(1); },
      });
    });
    sectionFilters.forEach((sec) => {
      chips.push({
        id: `sec-${sec}`,
        label: `Section ${sec}`,
        onRemove: () => { setSectionFilters((prev) => prev.filter((item) => item !== sec)); setPage(1); },
      });
    });
    return chips;
  }, [searchQuery, filterRules, filterFields, startDate, endDate, courseFilters, yearFilters, sectionFilters, setPage]);

  const totalPages = Math.max(1, Math.ceil(filteredCount / itemsPerPage));
  const paginatedStudents = filteredStudents;

  const groupedStudents = useMemo(() => {
    if (groupBy === "none") {
      return [{ key: "all", label: "", students: paginatedStudents }];
    }
    const map = new Map();
    for (const student of paginatedStudents) {
      let label = "";
      if (groupBy === "courseCode") {
        label = student.courseCode || "Unassigned Program";
      } else if (groupBy === "yearLevel") {
        label = `Year / Batch ${student.yearLevel || "N/A"}`;
      } else if (groupBy === "section") {
        label = `Section ${student.section || "N/A"}`;
      }
      if (!map.has(label)) map.set(label, []);
      map.get(label).push(student);
    }
    return [...map.entries()].map(([label, students]) => ({ key: label, label, students }));
  }, [groupBy, paginatedStudents]);

  const {
    containerRef: tableContainerRef,
    isScrolledX,
    scrollLeft,
    scrollRight,
    resetScroll,
  } = useTableScroll([paginatedStudents.length]);

  useEffect(() => {
    resetScroll();
  }, [page, activeTab, searchQuery, courseFilters, yearFilters, sectionFilters, filterRules, startDate, endDate, resetScroll]);

  const hasActiveFilters =
    searchQuery.trim() !== "" ||
    courseFilters.length > 0 ||
    yearFilters.length > 0 ||
    sectionFilters.length > 0 ||
    filterRules.length > 0 ||
    startDate !== "" ||
    endDate !== "";

  const handleSort = (col) => {
    if (sortBy === col) {
      setSortOrder((prev) => (prev === "ASC" ? "DESC" : "ASC"));
    } else {
      setSortBy(col);
      setSortOrder("ASC");
    }
  };

  // Selection toggle
  const toggleSelect = (id) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const toggleSelectAllPage = () => {
    const pageIds = paginatedStudents.map((s) => s.studentNo);
    const allSelected = pageIds.length > 0 && pageIds.every((id) => selectedIds.has(id));
    const next = new Set(selectedIds);
    if (allSelected) {
      pageIds.forEach((id) => next.delete(id));
    } else {
      pageIds.forEach((id) => next.add(id));
    }
    setSelectedIds(next);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    const start = Date.now();
    try {
      await onDataChanged();
      const elapsed = Date.now() - start;
      if (elapsed < 500) {
        await new Promise((r) => setTimeout(r, 500 - elapsed));
      }
    } finally {
      setIsRefreshing(false);
    }
  };

  // Export CSV (Admin only, audited)
  const canExport = hasAdminPrivileges(authUser?.role);

  const handleExportCSV = async () => {
    if (!canExport) {
      showToast?.({
        title: "Export Restricted",
        description: "Student directory export is restricted to administrative personnel.",
      });
      return;
    }
    if (filteredCount === 0) return;
    const exportParams = new URLSearchParams(browseParams);
    if (searchQuery.trim()) exportParams.set("q", searchQuery.trim());
    else exportParams.delete("q");
    const response = await fetch(`/api/students/browse?mode=export&${exportParams}`, { cache: "no-store" });
    if (!response.ok) {
      showToast?.({ title: "Export Failed", description: "Could not export the student directory." }, true);
      return;
    }
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const fileName = generateExportFilename("STUDENT-DIRECTORY", "DATA", "csv");
    link.setAttribute("href", url);
    link.setAttribute("download", fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showToast?.({
      title: "Export Success",
      description: `Student directory exported successfully as ${fileName}.`,
    });

  };

  const handleCopyStudentNumbers = useCallback(() => {
    const numbers = Array.from(selectedIds);
    if (numbers.length === 0) return;
    navigator.clipboard?.writeText(numbers.join(", "));
    showToast?.(`Copied ${numbers.length} student number${numbers.length === 1 ? "" : "s"} to clipboard`);
  }, [selectedIds, showToast]);

  // Single Archive
  const handleConfirmArchive = async () => {
    if (!archiveTarget) return;
    try {
      const res = await fetch(`/api/students/${encodeURIComponent(archiveTarget.studentNo)}`, {
        method: "DELETE",
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) throw new Error(json?.error || "Archival failed.");

      showToast?.({
        title: "Student Archived",
        description: `Student ${archiveTarget.studentNo} moved to archive.`,
      });
      setSelectedIds((prev) => {
        if (!prev.has(archiveTarget.studentNo)) return prev;
        const next = new Set(prev);
        next.delete(archiveTarget.studentNo);
        return next;
      });
      setArchiveModalOpen(false);
      setArchiveTarget(null);
      onDataChanged();
    } catch (err) {
      showToast?.(
        formatErrorMessage(err, {
          title: "Archive Failed",
          actionContext: `Archiving student ${archiveTarget.studentNo}`,
        }),
        true
      );
    }
  };

  // Single Restore
  const handleConfirmRestore = async () => {
    if (!restoreTarget) return;
    try {
      const res = await fetch(`/api/students/${encodeURIComponent(restoreTarget.studentNo)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "Active" }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) throw new Error(json?.error || "Restoration failed.");

      showToast?.({
        title: "Student Restored",
        description: `Student ${restoreTarget.studentNo} is now active.`,
      });
      setSelectedIds((prev) => {
        if (!prev.has(restoreTarget.studentNo)) return prev;
        const next = new Set(prev);
        next.delete(restoreTarget.studentNo);
        return next;
      });
      setRestoreModalOpen(false);
      setRestoreTarget(null);
      onDataChanged();
    } catch (err) {
      showToast?.(
        formatErrorMessage(err, {
          title: "Restore Failed",
          actionContext: `Restoring student ${restoreTarget.studentNo}`,
        }),
        true
      );
    }
  };

  // Bulk Archive / Restore
  const handleConfirmBulk = async () => {
    if (selectedIds.size === 0 || isBulkProcessing) return;
    setIsBulkProcessing(true);
    let success = 0;
    let fail = 0;

    try {
      const ids = Array.from(selectedIds);
      for (const id of ids) {
        const isArchiving = bulkActionType === "archive";
        const res = await fetch(`/api/students/${encodeURIComponent(id)}`, {
          method: isArchiving ? "DELETE" : "PATCH",
          headers: isArchiving ? undefined : { "Content-Type": "application/json" },
          body: isArchiving ? undefined : JSON.stringify({ status: "Active" }),
        });
        const json = await res.json().catch(() => null);
        if (res.ok && json?.ok) success++;
        else fail++;
      }

      showToast?.({
        title: bulkActionType === "archive" ? "Bulk Archival Complete" : "Bulk Restoration Complete",
        description: `Processed ${success} student record(s). ${fail > 0 ? `${fail} failed.` : ""}`,
      });

      setSelectedIds(new Set());
      setBulkActionOpen(false);
      onDataChanged();
    } catch (err) {
      showToast?.(
        formatErrorMessage(err, {
          title: "Bulk Action Failed",
          actionContext: `Bulk ${bulkActionType} of students`,
        }),
        true
      );
    } finally {
      setIsBulkProcessing(false);
    }
  };

  const isPageAllSelected =
    paginatedStudents.length > 0 &&
    paginatedStudents.every((s) => selectedIds.has(s.studentNo));

  return (
    <TooltipProvider delayDuration={200}>
      <div
        id="view-student-directory"
        className="animate-fade-up font-jakarta flex flex-[1_0_auto] h-auto w-full flex-col"
      >
        {/* ONE Single Card Container encapsulating Header, Metrics, Filters, Table & Pagination */}
        <Card
          className="flex flex-[1_0_auto] h-auto w-full flex-col p-0 gap-0 overflow-hidden rounded-2xl border border-border bg-white shadow-sm dark:border-border dark:bg-card dark:shadow-none isolate font-jakarta"
        >
          {/* 1. Page Header */}
          <PageHeader
            icon="UserSearch01Icon"
            title={
              <span className="flex items-center gap-2">
                <span>Student Directory</span>
                <span className="text-[11px] font-normal tracking-normal text-gray-500 dark:text-zinc-400 tabular-nums">
                  {filteredCount > 0 ? `${filteredCount.toLocaleString()} ${filteredCount === 1 ? "student" : "students"}` : "No students"}
                </span>
              </span>
            }
            description="Browse, filter, and manage student master records, academic profiles, and physical archive assignments."
            showBorder={false}
            className="p-6"
            titleClassName="text-[18px] font-semibold tracking-[-0.01em] text-gray-900 dark:text-zinc-50"
            descriptionClassName="text-[13px] font-normal text-gray-500 dark:text-zinc-400 mt-[4px]"
            actions={
              <div className="flex items-center gap-2">
                <RefreshButton
                  onRefresh={handleRefresh}
                  isLoading={loading || browseLoading || isRefreshing}
                  title="Refresh Student Directory"
                />

                

                <div className="flex items-center gap-2">
                  {canExport && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleExportCSV}
                      disabled={filteredCount === 0}
                      className="h-9 shrink-0 px-4 text-xs font-semibold rounded-xl border border-border dark:border-border bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-xs cursor-pointer active:scale-95 transition-all"
                    >
                      Export CSV
                    </Button>
                  )}

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setBulkImportOpen(true)}
                    className="h-9 shrink-0 px-4 text-xs font-semibold rounded-xl border border-border dark:border-border bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-xs cursor-pointer active:scale-95 transition-all"
                  >
                    Import Students
                  </Button>

                  <Button
                    type="button"
                    onClick={() => setRegisterOpen(true)}
                    className="h-9 shrink-0 px-4 cursor-pointer disabled:opacity-50"
                  >
                    Register Student
                  </Button>
                </div>
              </div>
            }
          />

          {/* 2. Top Summary Metrics Banner */}
          <Reorder.Group as="div" axis="x" values={kpiOrder} onReorder={setKpiOrder} ref={statCardsRef} className="grid grid-cols-1 md:grid-cols-3 gap-4 px-6 pb-6 items-start relative z-20">
            {kpiOrder.map(key => {
              if (key === "students") return (
            
            <Reorder.Item as="div" value="students" key="students" className={cn("relative group rounded-xl", selectedKpi === "students" ? "z-30" : "z-10")}>
              <div
                onClick={() => setSelectedKpi(selectedKpi === "students" ? null : "students")}
                className={cn(
                  "relative overflow-hidden rounded-[18px] border cursor-pointer select-none transition-all shadow-none flex flex-col justify-between min-h-[110px] bg-gray-50 dark:bg-zinc-900",
                  selectedKpi === "students"
                    ? "border-emerald-500/50 ring-1 ring-emerald-500/20"
                    : "border-border dark:border-border"
                )}
              >
                <div className="flex justify-between items-start p-4 pb-0">
                  <div className="flex flex-col gap-1">
                    <span className="text-[13px] font-medium text-gray-900 dark:text-zinc-300 capitalize">
                      Active Students
                    </span>
                  </div>
                  <div className="w-8 h-8 rounded-[10px] flex items-center justify-center text-white shadow-sm shrink-0 bg-[#10b981]">
                    <UserSearch01Icon size="1em" className="text-[15px]" />
                  </div>
                </div>
                
                <div className="flex justify-between items-end p-4 pt-1">
                  <div className="flex items-baseline gap-2">
                    <span className="text-[28px] font-bold text-gray-900 dark:text-white leading-none tracking-tight">
                      {kpiStats.activeCount.toLocaleString()}
                    </span>
                    <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 mb-1">
                      Enrolled
                    </span>
                  </div>
                  <DragDropIcon size="1em" className="cursor-grab active:cursor-grabbing hover:text-black dark:hover:text-white text-gray-900 dark:text-zinc-300 text-xl mb-0.5" />
                </div>
              </div>

              {/* Absolute details container */}
              <div
                className={cn(
                  "absolute top-full left-0 right-0 z-[100] mt-2 rounded-xl border border-border bg-white p-4 shadow-xl dark:border-border dark:bg-zinc-900 transition-all duration-300 ease-in-out origin-top",
                  selectedKpi === "students"
                    ? "scale-y-100 opacity-100 translate-y-0"
                    : "scale-y-95 opacity-0 -translate-y-2 pointer-events-none"
                )}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-gray-50 dark:bg-zinc-800/60 p-2.5 rounded-lg border border-border dark:border-border">
                      <span className="block text-[9px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-wider">
                        Active Students
                      </span>
                      <span className="text-lg font-black text-gray-900 dark:text-zinc-50">
                        {kpiStats.activeCount}
                      </span>
                    </div>
                    <div className="bg-emerald-50 dark:bg-emerald-950/30 p-2.5 rounded-lg border border-emerald-100 dark:border-emerald-900/30">
                      <span className="block text-[9px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                        Physical Archive
                      </span>
                      <span className="text-lg font-black text-emerald-700 dark:text-emerald-400">
                        {kpiStats.assignedDrawersCount}
                      </span>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-[10px] font-bold text-gray-400 dark:text-zinc-500 mb-1.5 uppercase tracking-wide">
                      Top Programs by Enrollment
                    </h4>
                    <div className="max-h-36 overflow-y-auto space-y-1 pr-1">
                      {kpiStats.topPrograms.length === 0 ? (
                        <p className="text-[11px] text-gray-400 dark:text-zinc-500 text-center py-2">
                          No active students enrolled
                        </p>
                      ) : (
                        kpiStats.topPrograms.map(([code, count]) => (
                          <div
                            key={code}
                            className="flex justify-between items-center text-[11px] py-1 border-b border-border dark:border-border text-gray-700 dark:text-zinc-300"
                          >
                            <span className="truncate max-w-[170px] font-medium" title={code}>
                              {code}
                            </span>
                            <span className="font-bold text-gray-900 dark:text-zinc-50">
                              {count} {count === 1 ? "student" : "students"}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </Reorder.Item>

                          );
              if (key === "programs") return (
            
            <Reorder.Item as="div" value="programs" key="programs" className={cn("relative group rounded-xl", selectedKpi === "programs" ? "z-30" : "z-10")}>
              <div
                onClick={() => setSelectedKpi(selectedKpi === "programs" ? null : "programs")}
                className={cn(
                  "relative overflow-hidden rounded-[18px] border cursor-pointer select-none transition-all shadow-none flex flex-col justify-between min-h-[110px] bg-gray-50 dark:bg-zinc-900",
                  selectedKpi === "programs"
                    ? "border-blue-500/50 ring-1 ring-blue-500/20"
                    : "border-border dark:border-border"
                )}
              >
                <div className="flex justify-between items-start p-4 pb-0">
                  <div className="flex flex-col gap-1">
                    <span className="text-[13px] font-medium text-gray-900 dark:text-zinc-300 capitalize">
                      Academic Programs
                    </span>
                  </div>
                  <div className="w-8 h-8 rounded-[10px] flex items-center justify-center text-white shadow-sm shrink-0 bg-[#3b82f6]">
                    <LibraryIcon size="1em" className="text-[15px]" />
                  </div>
                </div>
                
                <div className="flex justify-between items-end p-4 pt-1">
                  <div className="flex items-baseline gap-2">
                    <span className="text-[28px] font-bold text-gray-900 dark:text-white leading-none tracking-tight">
                      {kpiStats.totalPrograms.toLocaleString()}
                    </span>
                    <span className="text-xs font-medium text-blue-600 dark:text-blue-400 mb-1">
                      Degree Tracks
                    </span>
                  </div>
                  <DragDropIcon size="1em" className="cursor-grab active:cursor-grabbing hover:text-black dark:hover:text-white text-gray-900 dark:text-zinc-300 text-xl mb-0.5" />
                </div>
              </div>

              {/* Absolute details container */}
              <div
                className={cn(
                  "absolute top-full left-0 right-0 z-[100] mt-2 rounded-xl border border-border bg-white p-4 shadow-xl dark:border-border dark:bg-zinc-900 transition-all duration-300 ease-in-out origin-top",
                  selectedKpi === "programs"
                    ? "scale-y-100 opacity-100 translate-y-0"
                    : "scale-y-95 opacity-0 -translate-y-2 pointer-events-none"
                )}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-gray-50 dark:bg-zinc-800/60 p-2.5 rounded-lg border border-border dark:border-border">
                      <span className="block text-[9px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-wider">
                        Programs
                      </span>
                      <span className="text-lg font-black text-gray-900 dark:text-zinc-50">
                        {kpiStats.totalPrograms}
                      </span>
                    </div>
                    <div className="bg-blue-50 dark:bg-blue-950/30 p-2.5 rounded-lg border border-blue-100 dark:border-blue-900/30">
                      <span className="block text-[9px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                        Class Sections
                      </span>
                      <span className="text-lg font-black text-blue-700 dark:text-blue-400">
                        {kpiStats.totalSections}
                      </span>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-[10px] font-bold text-gray-400 dark:text-zinc-500 mb-1.5 uppercase tracking-wide">
                      Program Directory
                    </h4>
                    <div className="max-h-36 overflow-y-auto space-y-1 pr-1">
                      {kpiStats.programsList.length === 0 ? (
                        <p className="text-[11px] text-gray-400 dark:text-zinc-500 text-center py-2">
                          No programs available
                        </p>
                      ) : (
                        kpiStats.programsList.map((p) => (
                          <div
                            key={p.code}
                            className="flex justify-between items-center text-[11px] py-1 border-b border-border dark:border-border text-gray-700 dark:text-zinc-300"
                          >
                            <div className="truncate max-w-[170px]" title={p.name || p.code}>
                              <span className="font-bold text-gray-900 dark:text-zinc-50">
                                {p.code}
                              </span>
                              {p.name && (
                                <span className="text-gray-400 dark:text-zinc-500 text-[10px] ml-1.5">
                                  ({p.secCount} {p.secCount === 1 ? "sec" : "secs"})
                                </span>
                              )}
                            </div>
                            <span className="font-semibold text-gray-900 dark:text-zinc-50">
                              {p.stuCount} {p.stuCount === 1 ? "student" : "students"}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </Reorder.Item>

                          );
              if (key === "documents") return (
            
            <Reorder.Item as="div" value="documents" key="documents" className={cn("relative group rounded-xl", selectedKpi === "documents" ? "z-30" : "z-10")}>
              <div
                onClick={() => setSelectedKpi(selectedKpi === "documents" ? null : "documents")}
                className={cn(
                  "relative overflow-hidden rounded-[18px] border cursor-pointer select-none transition-all shadow-none flex flex-col justify-between min-h-[110px] bg-gray-50 dark:bg-zinc-900",
                  selectedKpi === "documents"
                    ? "border-red-500/50 ring-1 ring-red-500/20"
                    : "border-border dark:border-border"
                )}
              >
                <div className="flex justify-between items-start p-4 pb-0">
                  <div className="flex flex-col gap-1">
                    <span className="text-[13px] font-medium text-gray-900 dark:text-zinc-300 capitalize">
                      Digitized Files
                    </span>
                  </div>
                  <div className="w-8 h-8 rounded-[10px] flex items-center justify-center text-white shadow-sm shrink-0 bg-[#ef4444]">
                    <File02Icon size="1em" className="text-[15px]" />
                  </div>
                </div>
                
                <div className="flex justify-between items-end p-4 pt-1">
                  <div className="flex items-baseline gap-2">
                    <span className="text-[28px] font-bold text-gray-900 dark:text-white leading-none tracking-tight">
                      {kpiStats.totalDocs.toLocaleString()}
                    </span>
                    <span className="text-xs font-medium text-red-600 dark:text-red-400 mb-1">
                      Repository
                    </span>
                  </div>
                  <DragDropIcon size="1em" className="cursor-grab active:cursor-grabbing hover:text-black dark:hover:text-white text-gray-900 dark:text-zinc-300 text-xl mb-0.5" />
                </div>
              </div>

              {/* Absolute details container */}
              <div
                className={cn(
                  "absolute top-full left-0 right-0 z-[100] mt-2 rounded-xl border border-border bg-white p-4 shadow-xl dark:border-border dark:bg-zinc-900 transition-all duration-300 ease-in-out origin-top",
                  selectedKpi === "documents"
                    ? "scale-y-100 opacity-100 translate-y-0"
                    : "scale-y-95 opacity-0 -translate-y-2 pointer-events-none"
                )}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-gray-50 dark:bg-zinc-800/60 p-2.5 rounded-lg border border-border dark:border-border">
                      <span className="block text-[9px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-wider">
                        Total Files
                      </span>
                      <span className="text-lg font-black text-gray-900 dark:text-zinc-50">
                        {kpiStats.totalDocs}
                      </span>
                    </div>
                    <div className="bg-red-50 dark:bg-red-950/30 p-2.5 rounded-lg border border-red-100 dark:border-red-900/30">
                      <span className="block text-[9px] font-bold text-pup-maroon dark:text-red-400 uppercase tracking-wider">
                        With Records
                      </span>
                      <span className="text-lg font-black text-pup-maroon dark:text-red-400">
                        {kpiStats.studentsWithFilesCount}
                      </span>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-[10px] font-bold text-gray-400 dark:text-zinc-500 mb-1.5 uppercase tracking-wide">
                      Document Type Breakdown
                    </h4>
                    <div className="max-h-36 overflow-y-auto space-y-1 pr-1">
                      {kpiStats.topDocTypes.length === 0 ? (
                        <p className="text-[11px] text-gray-400 dark:text-zinc-500 text-center py-2">
                          No documents uploaded yet
                        </p>
                      ) : (
                        kpiStats.topDocTypes.map(([type, count]) => (
                          <div
                            key={type}
                            className="flex justify-between items-center text-[11px] py-1 border-b border-border dark:border-border text-gray-700 dark:text-zinc-300"
                          >
                            <span className="truncate max-w-[170px]" title={type}>
                              {type}
                            </span>
                            <span className="font-bold text-gray-900 dark:text-zinc-50">
                              {count}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </Reorder.Item>
              );
              return null;
            })}
          </Reorder.Group>

          {/* Status Segmented Tabs Row */}
          <div className="flex items-center justify-between border-t border-border bg-white px-6 py-2.5 dark:border-border dark:bg-card">
            <SegmentedControl
              value={activeTab}
              onValueChange={(tab) => {
                setActiveTab(tab);
                setPage(1);
              }}
              variant="capsule"
              className="inline-grid grid-flow-col auto-cols-fr shrink-0"
              items={[
                {
                  value: "active",
                  label: "Active",
                  badge: browseSummary?.counts?.active || 0,
                },
                {
                  value: "archived",
                  label: "Archived",
                  badge: browseSummary?.counts?.archived || 0,
                },
              ]}
            />
          </div>

          {/* 3. Navigation & Filters Toolbar */}
          <DataViewToolbar label="Student directory search and filters" className="border-t border-border dark:border-border p-4 sm:px-5 sm:py-3 gap-2 bg-white dark:bg-card flex flex-wrap items-center justify-between select-none">
            {/* Left Zone: Search + Scroll */}
            <div className="flex min-w-0 items-center gap-2">
              <DashboardSearch
                value={searchQuery}
                onChange={(val) => {
                  setSearchQuery(val);
                  setPage(1);
                }}
                onClear={() => {
                  setSearchQuery("");
                  setPage(1);
                }}
                resultCount={filteredCount}
                placeholder="Search student no. or name..."
              />
              <TableScrollControls
                scrollContainerRef={tableContainerRef}
                isScrolledX={isScrolledX}
                onResetScroll={resetScroll}
                onScrollLeft={() => scrollLeft(400)}
                onScrollRight={() => scrollRight(400)}
                controlSize="md"
              />
            </div>

            {/* Right Zone: Filter, Sort, Group, Columns, Date Range */}
            <div className="ml-auto flex shrink-0 items-center gap-2">
              <FilterPopover
                fields={filterFields}
                filters={filterRules}
                onFiltersChange={(newRules) => {
                  setFilterRules(newRules);
                  setPage(1);
                }}
                entityLabel="students"
              />
              <SortPopover
                options={STUDENT_SORT_OPTIONS}
                sortBy={sortBy}
                onSortByChange={(val) => {
                  setSortBy(val);
                  setSortOrder("ASC");
                  setPage(1);
                }}
                sortOrder={sortOrder}
                onSortOrderChange={(ord) => {
                  setSortOrder(ord);
                  setPage(1);
                }}
              />
              <GroupPopover
                options={STUDENT_GROUP_OPTIONS}
                groupBy={groupBy}
                onGroupByChange={setGroupBy}
              />
              <ColumnsPopover
                columns={STUDENT_TABLE_COLUMNS}
                visibleColumns={visibleColumns}
                onVisibleColumnsChange={setVisibleColumns}
                minVisible={2}
              />
              <DateRangeFilterButton
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

          {/* Active Filter Chips */}
          {activeChips.length > 0 && (
            <div className="border-t border-border dark:border-border px-6 py-2.5 flex items-center justify-between gap-4 bg-white dark:bg-card">
              <div className="flex-1 min-w-0">
                <ActiveFilterChips
                  chips={activeChips}
                  onClearAll={handleResetFilters}
                  className="p-0 border-0"
                />
              </div>
            </div>
          )}

          {/* 4. Main Data Table */}
          <div className={cn("relative w-full flex-[1_0_auto] border-t border-border dark:border-border bg-white dark:bg-card overflow-hidden flex flex-col", filteredCount === 0 && "rounded-b-2xl")} aria-busy={browseLoading}>
            {loading || (browseLoading && !hasLoadedPage) ? (
              <div className="p-6 space-y-3 rounded-b-2xl">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-12 w-full rounded-xl" />
                ))}
              </div>
            ) : paginatedStudents.length === 0 ? (
              <div className="rounded-b-2xl flex-1 flex flex-col items-center justify-center min-h-[420px] w-full">
                <Empty>
                  <EmptyHeader>
                    <EmptyMedia><EmptyStudentIcon size="1em" /></EmptyMedia>
                    <EmptyTitle>
                      No Student Records Found
                    </EmptyTitle>
                    <EmptyDescription>
                      {hasActiveFilters
                        ? "Try clearing some filter options or changing your search criteria."
                        : "There are currently no student records in this view. Enroll a student to get started."}
                    </EmptyDescription>
                  </EmptyHeader>
                  {hasActiveFilters && (
                    <EmptyContent>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleResetFilters}
                        title="Reset Filters"
                        className="h-9 px-4 text-xs font-semibold rounded-xl"
                      >
                        Reset Filters
                      </Button>
                    </EmptyContent>
                  )}
                </Empty>
              </div>
            ) : (
              <div
                ref={tableContainerRef}
                className="w-full flex-[1_0_auto] overflow-x-auto show-scrollbar pb-2"
              >
                <Table columns={["selection", "identifier", "text", "category", "year", "text", "number", "status", "actions"]} className="min-w-[1320px]">
                  <thead className="sticky top-0 z-10 border-b border-border bg-white dark:bg-card backdrop-blur-xs select-none">
                    <tr className="text-left text-xs font-semibold text-gray-500 dark:text-zinc-400">
                      <th className="w-12 py-2.5 px-3 text-center sticky left-0 z-20 bg-white dark:bg-card">
                        <input
                          type="checkbox"
                          className="h-4 w-4 m-0 align-middle shrink-0 cursor-pointer rounded border border-border dark:border-border"
                          checked={isPageAllSelected}
                          onChange={toggleSelectAllPage}
                        />
                      </th>

                      <th
                        className={cn(
                          "py-2.5 px-4 w-[160px] min-w-[160px] sticky left-12 z-20 bg-white dark:bg-card transition-shadow",
                          isScrolledX && "shadow-[4px_0_12px_-2px_rgba(0,0,0,0.06)] dark:shadow-[4px_0_12px_-2px_rgba(0,0,0,0.4)]"
                        )}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <button
                            type="button"
                            onClick={() => handleSort("studentNo")}
                            className="group flex items-center focus:outline-none cursor-pointer hover:text-gray-900 dark:hover:text-white"
                          >
                            <span>Student No.</span>
                            <SortIndicator column="studentNo" sortBy={sortBy} sortOrder={sortOrder} />
                          </button>
                          {isScrolledX && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                resetScroll();
                              }}
                              title="Reset table scroll"
                              className="w-5 h-5 flex items-center justify-center rounded bg-gray-200/70 hover:bg-gray-300 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-gray-600 dark:text-zinc-300 transition-colors"
                            >
                              <AppIcon className=" ArrowLeft01Icon text-[10px]" />
                            </button>
                          )}
                        </div>
                      </th>

                      <th className="py-2.5 px-4 w-[240px] min-w-[240px]">
                        <button
                          type="button"
                          onClick={() => handleSort("name")}
                          className="group flex items-center focus:outline-none cursor-pointer hover:text-gray-900 dark:hover:text-white"
                        >
                          <span>Full Name</span>
                          <SortIndicator column="name" sortBy={sortBy} sortOrder={sortOrder} />
                        </button>
                      </th>

                      <th className="py-2.5 px-4 w-[190px] min-w-[190px]">
                        <button
                          type="button"
                          onClick={() => handleSort("courseCode")}
                          className="group flex items-center focus:outline-none cursor-pointer hover:text-gray-900 dark:hover:text-white"
                        >
                          <span>Program & Section</span>
                          <SortIndicator column="courseCode" sortBy={sortBy} sortOrder={sortOrder} />
                        </button>
                      </th>

                      <th className="py-2.5 px-4 w-[130px] min-w-[130px]">
                        <button
                          type="button"
                          onClick={() => handleSort("yearLevel")}
                          className="group flex items-center focus:outline-none cursor-pointer hover:text-gray-900 dark:hover:text-white"
                        >
                          <span>Year / Batch</span>
                          <SortIndicator column="yearLevel" sortBy={sortBy} sortOrder={sortOrder} />
                        </button>
                      </th>

                      <th className="py-2.5 px-4 w-[200px] min-w-[200px]">
                        <span>Physical Archive</span>
                      </th>

                      <th className="py-2.5 px-4 w-[100px] min-w-[100px] text-center">
                        <button
                          type="button"
                          onClick={() => handleSort("documents")}
                          className="group inline-flex items-center focus:outline-none cursor-pointer hover:text-gray-900 dark:hover:text-white"
                        >
                          <span>Files</span>
                          <SortIndicator column="documents" sortBy={sortBy} sortOrder={sortOrder} />
                        </button>
                      </th>

                      <th className="py-2.5 px-4 w-[120px] min-w-[120px] text-center">
                        <span>Status</span>
                      </th>

                      <th className="w-28 min-w-[112px] py-2.5 px-4 pr-6 text-right">
                        <span>Actions</span>
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-border dark:divide-border bg-white dark:bg-card">
                    {groupedStudents.map((group) => (
                      <React.Fragment key={group.key}>
                        {groupBy !== "none" && (
                          <tr className="bg-gray-50/70 dark:bg-zinc-800/50">
                            <td colSpan={9} className="px-6 py-2 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-zinc-400">
                              {group.label} ({group.students.length})
                            </td>
                          </tr>
                        )}
                        {group.students.map((s) => {
                          const isSelected = selectedIds.has(s.studentNo);
                          const isStudentArchived = String(s.status || "").toLowerCase() === "archived";
                          const docCount = docCountMap.get(String(s.studentNo).toUpperCase()) || 0;

                          return (
                            <tr
                              key={s.studentNo}
                              selected={isSelected}
                              onClick={() => {
                                setActiveStudent(s);
                                setProfileOpen(true);
                              }}
                              className={cn(
                                "group cursor-pointer transition-colors hover:bg-gray-50/70 dark:hover:bg-zinc-800/40 select-none",
                                isSelected && "bg-blue-50/50 dark:bg-blue-950/20"
                              )}
                            >
                          <td
                            className={cn(
                              "w-12 py-2.5 px-3 text-center align-middle border-r border-border/70 sticky left-0 z-10 bg-white group-hover:bg-gray-50/70 dark:bg-card dark:group-hover:bg-zinc-800/40",
                              isSelected && "bg-blue-50/50 dark:bg-blue-950/20"
                            )}
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleSelect(s.studentNo);
                            }}
                          >
                            <input
                              type="checkbox"
                              className="h-4 w-4 m-0 align-middle shrink-0 cursor-pointer rounded border border-border dark:border-border"
                              checked={isSelected}
                              onChange={() => toggleSelect(s.studentNo)}
                            />
                          </td>

                          <td
                            className={cn(
                              "py-2.5 px-4 whitespace-nowrap align-middle sticky left-12 z-10 bg-white group-hover:bg-gray-50/70 dark:bg-card dark:group-hover:bg-zinc-800/40 transition-shadow border-r border-border/70",
                              isSelected && "bg-blue-50/50 dark:bg-blue-950/20",
                              isScrolledX && "shadow-[4px_0_12px_-2px_rgba(0,0,0,0.06)] dark:shadow-[4px_0_12px_-2px_rgba(0,0,0,0.4)]"
                            )}
                          >
                            <span className={cn("font-sans tabular-nums text-xs font-semibold px-2.5 py-1 rounded-full bg-gray-100 dark:bg-zinc-800 text-gray-800 dark:text-zinc-200", BADGE_BASE)}>
                              {s.studentNo}
                            </span>
                          </td>

                          <td className="py-2.5 px-4 align-middle overflow-hidden border-r border-border/70 dark:border-border/70">
                            <div className="font-semibold text-gray-900 dark:text-zinc-100 group-hover:text-pup-maroon dark:group-hover:text-red-400 transition-colors truncate" title={formatTitleCase(s.name)}>
                              {formatTitleCase(s.name)}
                            </div>
                          </td>

                          <td className="py-2.5 px-4 align-middle overflow-hidden whitespace-nowrap border-r border-border/70 dark:border-border/70">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <Badge
                                variant="outline"
                                className={cn("text-[11px] font-semibold px-2.5 py-0.5 rounded-full border-border dark:border-border shrink-0", BADGE_BASE)}
                              >
                                {s.courseCode || "N/A"}
                              </Badge>
                              <span className="text-xs text-gray-500 dark:text-zinc-400 font-medium truncate" title={`Sec ${s.section || "N/A"}`}>
                                Sec {s.section || "N/A"}
                              </span>
                            </div>
                          </td>

                          <td className="py-2.5 px-4 text-xs font-medium text-gray-500 dark:text-zinc-400 whitespace-nowrap align-middle border-r border-border/70 dark:border-border/70">
                            {s.yearLevel || "N/A"}
                          </td>

                          <td className="py-2.5 px-4 align-middle whitespace-nowrap border-r border-border/70 dark:border-border/70">
                            <div className="inline-flex items-center gap-1 text-xs text-gray-500 dark:text-zinc-400 whitespace-nowrap">
                              <Location01Icon size="1em"  className="text-gray-400 text-xs shrink-0"></Location01Icon>
                              <span>
                                Room {s.room} • Cab {s.cabinet} • Drw {s.drawer}
                              </span>
                            </div>
                          </td>

                          <td className="py-2.5 px-4 text-center align-middle border-r border-border/70 dark:border-border/70">
                            <span className="tabular-nums">
                              {docCount} {docCount === 1 ? "file" : "files"}
                            </span>
                          </td>

                          <td className="py-2.5 px-4 text-center align-middle border-r border-border/70 dark:border-border/70">
                            <span
                              className={cn(
                                "text-[10px] font-semibold px-2.5 py-0.5 rounded-full",
                                isStudentArchived
                                  ? BADGE_PALETTES.amber
                                  : BADGE_PALETTES.emerald,
                                BADGE_BASE
                              )}
                            >
                              {s.status || "Active"}
                            </span>
                          </td>

                          <td className="w-28 py-2.5 px-4 pr-6 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                            <div className="inline-flex items-center gap-1">
                              {/* View Profile */}
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveStudent(s);
                                      setProfileOpen(true);
                                    }}
                                    className="table-action-button rounded-lg active:scale-95 cursor-pointer"
                                  >
                                    <ViewIcon size="1em"  className="text-[14px]"></ViewIcon>
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent>View Student Details</TooltipContent>
                              </Tooltip>

                              {/* Edit Profile */}
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveStudent(s);
                                      setEditOpen(true);
                                    }}
                                    className="table-action-button rounded-lg active:scale-95 cursor-pointer"
                                  >
                                    <PencilEdit01Icon size="1em"  className="text-[14px]"></PencilEdit01Icon>
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent>Edit Student</TooltipContent>
                              </Tooltip>

                              {/* Locate in Storage */}
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button
                                    type="button"
                                    onClick={() => onLocateStudent?.(s)}
                                    className="table-action-button rounded-lg text-gray-500 hover:text-pup-maroon dark:text-zinc-400 dark:hover:text-red-400 active:scale-95 cursor-pointer"
                                  >
                                    <CompassIcon size="1em"  className="text-[14px]"></CompassIcon>
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent>Locate in Archive Map</TooltipContent>
                              </Tooltip>

                              {/* Archive or Restore */}
                              {isStudentArchived ? (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setRestoreTarget(s);
                                        setRestoreModalOpen(true);
                                      }}
                                      className="table-action-button rounded-lg text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 active:scale-95 cursor-pointer"
                                    >
                                      <Archive02Icon size="1em"  className="text-[14px]"></Archive02Icon>
                                    </button>
                                  </TooltipTrigger>
                                  <TooltipContent>Restore Student</TooltipContent>
                                </Tooltip>
                              ) : (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setArchiveTarget(s);
                                        setArchiveModalOpen(true);
                                      }}
                                      className="table-action-button rounded-lg text-amber-600 hover:text-amber-700 dark:text-amber-400 active:scale-95 cursor-pointer"
                                    >
                                      <Archive01Icon size="1em"  className="text-[14px]"></Archive01Icon>
                                    </button>
                                  </TooltipTrigger>
                                  <TooltipContent>Archive Student</TooltipContent>
                                </Tooltip>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </React.Fragment>
                ))}
              </tbody>
                </Table>
              </div>
            )}
            {browseLoading && hasLoadedPage && (
              <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/55 text-xs font-medium text-gray-600 dark:bg-zinc-900/60 dark:text-zinc-300">
                Loading students…
              </div>
            )}
          </div>

          {/* 5. Apple HIG Pagination Footer */}
          {!loading && filteredStudents.length > 0 && (
            <TablePagination label="Student directory pages" page={page} pageSize={itemsPerPage} totalCount={filteredCount} displayedCount={paginatedStudents.length} onPageChange={setPage} onPageSizeChange={setItemsPerPage} loading={loading || browseLoading} />
          )}
        </Card>

        {/* Floating Bulk Action Bar */}
        <FloatingActionBar
          selectedCount={selectedIds.size}
          entityName="students"
          onCancel={() => setSelectedIds(new Set())}
          primaryAction={{
            label: activeTab === "active" ? "Archive Students" : "Restore Students",
            variant: activeTab === "active" ? "danger" : "success",
            onClick: () => {
              if (activeTab === "active") {
                setBulkActionType("archive");
                setBulkActionOpen(true);
              } else if (activeTab === "archived") {
                setBulkActionType("restore");
                setBulkActionOpen(true);
              }
            },
          }}
          secondaryActions={[
            {
              label: "Copy Student Numbers",
              copiedLabel: "Numbers Copied!",
              onClick: handleCopyStudentNumbers,
            },
          ]}
        />

        {/* Register Student Modal */}
        <RegisterStudentModal
          open={registerOpen}
          onOpenChange={setRegisterOpen}
          courses={courses}
          sections={sections}
          storageLayout={storageLayout}
          onSuccess={onDataChanged}
          showToast={showToast}
          authUser={authUser}
        />

        {/* Bulk Import Students Modal */}
        <BulkImportStudentsModal
          open={bulkImportOpen}
          onOpenChange={setBulkImportOpen}
          storageLayout={storageLayout}
          courses={courses}
          sections={sections}
          onSuccess={onDataChanged}
          showToast={showToast}
        />

        {/* Edit Student Modal */}
        <EditStudentModal
          open={editOpen}
          onOpenChange={setEditOpen}
          student={activeStudent}
          courses={courses}
          sections={sections}
          storageLayout={storageLayout}
          onSuccess={onDataChanged}
          showToast={showToast}
          authUser={authUser}
        />

        {/* Student Profile Sheet */}
        {(() => {
          const selectedIndex = activeStudent
            ? paginatedStudents.findIndex((s) => s.studentNo === activeStudent.studentNo)
            : -1;
          return (
            <StudentProfileSheet
              open={profileOpen}
              onOpenChange={setProfileOpen}
              student={activeStudent}
              currentIndex={selectedIndex}
              totalCount={paginatedStudents.length}
              onNavigatePrev={() => {
                if (selectedIndex > 0) {
                  setActiveStudent(paginatedStudents[selectedIndex - 1]);
                }
              }}
              onNavigateNext={() => {
                if (selectedIndex >= 0 && selectedIndex < paginatedStudents.length - 1) {
                  setActiveStudent(paginatedStudents[selectedIndex + 1]);
                }
              }}
              courses={courses}
              allDocs={profileDocs.studentNo === activeStudent?.studentNo ? profileDocs.rows : []}
              onLocateStudent={onLocateStudent}
              onPreviewDocument={onPreviewDocument}
              onRescan={onRescan}
              onEditStudent={(s) => {
                setActiveStudent(s);
                setEditOpen(true);
              }}
              onArchiveStudent={() => {
                setArchiveTarget(activeStudent);
                setArchiveModalOpen(true);
              }}
              onRestoreStudent={() => {
                setRestoreTarget(activeStudent);
                setRestoreModalOpen(true);
              }}
              authUser={authUser}
            />
          );
        })()}

        {/* Single Archive Confirm Modal */}
        <ConfirmModal
          open={archiveModalOpen}
          onOpenChange={setArchiveModalOpen}
          onCancel={() => setArchiveModalOpen(false)}
          title="Archive Student Record"
          description={`Are you sure you want to archive student record ${archiveTarget?.studentNo} (${archiveTarget?.name})? The student will be moved to the archive view.`}
          confirmLabel="Archive Record"
          variant="warning"
          isArchiveModal={true}
          onConfirm={handleConfirmArchive}
        />

        {/* Single Restore Confirm Modal */}
        <ConfirmModal
          open={restoreModalOpen}
          onOpenChange={setRestoreModalOpen}
          onCancel={() => setRestoreModalOpen(false)}
          title="Restore Student Record"
          description={`Are you sure you want to restore student record ${restoreTarget?.studentNo} (${restoreTarget?.name}) to Active status?`}
          confirmLabel="Restore Record"
          variant="success"
          isRestoreModal={true}
          onConfirm={handleConfirmRestore}
        />

        {/* Bulk Action Confirm Modal */}
        <ConfirmModal
          open={bulkActionOpen}
          onOpenChange={setBulkActionOpen}
          onCancel={() => setBulkActionOpen(false)}
          title={bulkActionType === "archive" ? "Bulk Archive Student Records" : "Bulk Restore Student Records"}
          description={
            bulkActionType === "archive"
              ? `Are you sure you want to archive ${selectedIds.size} student record(s)?`
              : `Are you sure you want to restore ${selectedIds.size} student record(s) to Active status?`
          }
          confirmLabel={bulkActionType === "archive" ? "Archive Students" : "Restore Students"}
          variant={bulkActionType === "archive" ? "warning" : "success"}
          isArchiveModal={bulkActionType === "archive"}
          isRestoreModal={bulkActionType === "restore"}
          onConfirm={handleConfirmBulk}
          isLoading={isBulkProcessing}
        />
      </div>
    </TooltipProvider>
  );
}
