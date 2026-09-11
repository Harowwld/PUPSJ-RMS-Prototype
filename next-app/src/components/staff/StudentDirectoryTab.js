"use client";

import React, { useState, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
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
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import RegisterStudentModal from "./RegisterStudentModal";
import EditStudentModal from "./EditStudentModal";
import StudentProfileModal from "./StudentProfileModal";

function SortIndicator({ column, sortBy, sortOrder }) {
  if (sortBy !== column) {
    return (
      <i className="ph-bold ph-caret-up-down ml-1 text-[11px] opacity-40 transition-opacity group-hover:opacity-70 dark:opacity-30"></i>
    );
  }
  return sortOrder === "ASC" ? (
    <i className="ph-bold ph-caret-up ml-1 text-[11px] text-pup-maroon dark:text-red-400"></i>
  ) : (
    <i className="ph-bold ph-caret-down ml-1 text-[11px] text-pup-maroon dark:text-red-400"></i>
  );
}

export default function StudentDirectoryTab({
  loading = false,
  students = [],
  archivedStudents = [],
  courses = [],
  sections = [],
  storageLayout = null,
  allDocs = [],
  onLocateStudent,
  onPreviewDocument,
  fetchData,
  showToast,
}) {
  const [activeTab, setActiveTab] = useState("active"); // "active" | "archived" | "all"
  const [searchQuery, setSearchQuery] = useState("");
  const [courseFilter, setCourseFilter] = useState("all");
  const [yearFilter, setYearFilter] = useState("all");
  const [sectionFilter, setSectionFilter] = useState("all");
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Sorting
  const [sortBy, setSortBy] = useState("name");
  const [sortOrder, setSortOrder] = useState("ASC");

  // Pagination
  const [page, setPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Modals
  const [registerOpen, setRegisterOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [activeStudent, setActiveStudent] = useState(null);

  // Archive / Restore Confirm Modals
  const [archiveTarget, setArchiveTarget] = useState(null);
  const [archiveModalOpen, setArchiveModalOpen] = useState(false);
  const [restoreTarget, setRestoreTarget] = useState(null);
  const [restoreModalOpen, setRestoreModalOpen] = useState(false);
  const [bulkActionOpen, setBulkActionOpen] = useState(false);
  const [bulkActionType, setBulkActionType] = useState("archive"); // "archive" | "restore"
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);

  // Combine datasets based on active tab
  const allAvailableStudents = useMemo(() => {
    if (activeTab === "active") return students;
    if (activeTab === "archived") return archivedStudents;
    // Tab === "all"
    const combined = [...students];
    const seen = new Set(students.map((s) => s.studentNo));
    for (const s of archivedStudents) {
      if (!seen.has(s.studentNo)) {
        combined.push(s);
      }
    }
    return combined;
  }, [activeTab, students, archivedStudents]);

  // Unique years for filter
  const availableYears = useMemo(() => {
    const years = new Set();
    [...students, ...archivedStudents].forEach((s) => {
      const yr = Number(s.yearLevel || s.year_level);
      if (Number.isFinite(yr) && yr >= 2000) years.add(yr);
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [students, archivedStudents]);

  // Dynamic sections filtered by courseFilter
  const availableFilterSections = useMemo(() => {
    if (courseFilter === "all") {
      const secs = new Set(sections.map((s) => s.name));
      return Array.from(secs).sort();
    }
    return sections
      .filter((s) => String(s.course_code || "").toUpperCase() === courseFilter.toUpperCase())
      .map((s) => s.name)
      .sort();
  }, [sections, courseFilter]);

  // Document count lookup map
  const docCountMap = useMemo(() => {
    const map = new Map();
    (allDocs || []).forEach((d) => {
      const sn = String(d.student_no || "").trim().toUpperCase();
      if (sn) {
        map.set(sn, (map.get(sn) || 0) + 1);
      }
    });
    return map;
  }, [allDocs]);

  // Filtered and sorted students
  const filteredStudents = useMemo(() => {
    let result = [...allAvailableStudents];

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter((s) => {
        const no = String(s.studentNo || "").toLowerCase();
        const nm = String(s.name || "").toLowerCase();
        return no.includes(q) || nm.includes(q);
      });
    }

    // Course filter
    if (courseFilter !== "all") {
      result = result.filter(
        (s) =>
          String(s.courseCode || "").trim().toUpperCase() ===
          courseFilter.trim().toUpperCase()
      );
    }

    // Year filter
    if (yearFilter !== "all") {
      result = result.filter(
        (s) => String(s.yearLevel || s.year_level) === String(yearFilter)
      );
    }

    // Section filter
    if (sectionFilter !== "all") {
      result = result.filter(
        (s) => String(s.section || "").trim().toUpperCase() === sectionFilter.trim().toUpperCase()
      );
    }

    // Sorting
    result.sort((a, b) => {
      let valA = a[sortBy] ?? "";
      let valB = b[sortBy] ?? "";

      if (sortBy === "documents") {
        valA = docCountMap.get(String(a.studentNo).toUpperCase()) || 0;
        valB = docCountMap.get(String(b.studentNo).toUpperCase()) || 0;
        return sortOrder === "ASC" ? valA - valB : valB - valA;
      }

      if (typeof valA === "string") valA = valA.toLowerCase();
      if (typeof valB === "string") valB = valB.toLowerCase();

      if (valA < valB) return sortOrder === "ASC" ? -1 : 1;
      if (valA > valB) return sortOrder === "ASC" ? 1 : -1;
      return 0;
    });

    return result;
  }, [
    allAvailableStudents,
    searchQuery,
    courseFilter,
    yearFilter,
    sectionFilter,
    sortBy,
    sortOrder,
    docCountMap,
  ]);

  // Pagination slice
  const totalPages = Math.max(1, Math.ceil(filteredStudents.length / itemsPerPage));
  const paginatedStudents = useMemo(() => {
    const start = (page - 1) * itemsPerPage;
    return filteredStudents.slice(start, start + itemsPerPage);
  }, [filteredStudents, page, itemsPerPage]);

  const hasActiveFilters =
    searchQuery.trim() !== "" ||
    courseFilter !== "all" ||
    yearFilter !== "all" ||
    sectionFilter !== "all";

  const handleResetFilters = () => {
    setSearchQuery("");
    setCourseFilter("all");
    setYearFilter("all");
    setSectionFilter("all");
    setPage(1);
  };

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
      await fetchData?.();
      const elapsed = Date.now() - start;
      if (elapsed < 500) {
        await new Promise((r) => setTimeout(r, 500 - elapsed));
      }
    } finally {
      setIsRefreshing(false);
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    if (filteredStudents.length === 0) return;
    const headers = [
      "Student No",
      "Full Name",
      "Degree Program",
      "Section",
      "Year Level",
      "Room",
      "Cabinet",
      "Drawer",
      "Documents Count",
      "Status",
    ];

    const rows = filteredStudents.map((s) => [
      `"${s.studentNo}"`,
      `"${s.name}"`,
      `"${s.courseCode || ""}"`,
      `"${s.section || ""}"`,
      `"${s.yearLevel || ""}"`,
      `"${s.room || ""}"`,
      `"${s.cabinet || ""}"`,
      `"${s.drawer || ""}"`,
      `"${docCountMap.get(String(s.studentNo).toUpperCase()) || 0}"`,
      `"${s.status || "Active"}"`,
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `PUPSJ_Student_Directory_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

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
      setArchiveModalOpen(false);
      setArchiveTarget(null);
      fetchData?.();
    } catch (err) {
      showToast?.({ title: "Archive Error", description: err.message }, true);
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
      setRestoreModalOpen(false);
      setRestoreTarget(null);
      fetchData?.();
    } catch (err) {
      showToast?.({ title: "Restore Error", description: err.message }, true);
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
      fetchData?.();
    } catch (err) {
      showToast?.({ title: "Bulk Action Failed", description: err.message }, true);
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
        className="animate-fade-up font-inter flex h-auto w-full flex-col gap-6"
      >
        {/* ONE Single Card Container encapsulating Header, Metrics, Filters, Table & Pagination */}
        <Card className="flex h-auto w-full flex-col p-0 gap-0 overflow-visible rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-card dark:shadow-none isolate font-inter mb-4 min-h-0 flex-1">
          {/* 1. Page Header */}
          <PageHeader
            icon="ph-users"
            title="Student Directory"
            description="Browse, filter, and manage student master records, academic profiles, and physical archive assignments."
            showBorder={false}
            className="p-6"
            titleClassName="text-[18px] font-semibold tracking-[-0.01em] text-gray-900 dark:text-zinc-50"
            descriptionClassName="text-[13px] font-normal text-gray-500 dark:text-zinc-400 mt-[4px]"
            actions={
              <div className="flex items-center gap-3">
                <RefreshButton
                  onRefresh={handleRefresh}
                  isLoading={loading || isRefreshing}
                  title="Refresh Student Directory"
                />

                <Button
                  type="button"
                  variant="outline"
                  onClick={handleExportCSV}
                  disabled={filteredStudents.length === 0}
                  className="h-10 px-4 text-xs font-semibold rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-xs cursor-pointer active:scale-95 transition-all"
                >
                  <i className="ph-bold ph-export mr-1.5 text-sm"></i>
                  Export CSV
                </Button>

                <Button
                  type="button"
                  onClick={() => setRegisterOpen(true)}
                  className="h-10 px-5 text-xs font-semibold rounded-xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-900 shadow-xs cursor-pointer active:scale-95 transition-all"
                >
                  Register Student
                </Button>
              </div>
            }
          />

          {/* 2. Top Summary Metrics Banner */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 px-6 pb-6">
            <div className="p-4 rounded-xl border border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-zinc-900/30">
              <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-zinc-500 block mb-1">
                Active Students
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-gray-900 dark:text-zinc-50 tracking-tight">
                  {students.length}
                </span>
                <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Enrolled</span>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-zinc-900/30">
              <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-zinc-500 block mb-1">
                Archived Records
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-gray-900 dark:text-zinc-50 tracking-tight">
                  {archivedStudents.length}
                </span>
                <span className="text-xs font-medium text-amber-600 dark:text-amber-400">Archived</span>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-zinc-900/30">
              <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-zinc-500 block mb-1">
                Academic Programs
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-gray-900 dark:text-zinc-50 tracking-tight">
                  {courses.length}
                </span>
                <span className="text-xs font-medium text-gray-500">Degree Tracks</span>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-zinc-900/30">
              <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-zinc-500 block mb-1">
                Digitized Files
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-gray-900 dark:text-zinc-50 tracking-tight">
                  {allDocs.length}
                </span>
                <span className="text-xs font-medium text-pup-maroon dark:text-red-400">Repository</span>
              </div>
            </div>
          </div>

          {/* 3. Navigation & Filters Toolbar */}
          <div className="border-t border-gray-100 dark:border-white/10 p-5 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 bg-gray-50/40 dark:bg-zinc-900/30 select-none">
            {/* Status Segmented Tabs */}
            <div className="flex items-center gap-6 select-none shrink-0">
              <button
                type="button"
                onClick={() => {
                  setActiveTab("active");
                  setPage(1);
                }}
                className={cn(
                  "relative h-9 flex items-center text-[13px] font-semibold transition-colors focus:outline-none cursor-pointer border-0 bg-transparent",
                  activeTab === "active"
                    ? "text-gray-900 dark:text-zinc-50 after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-full after:bg-gray-900 dark:after:bg-zinc-50"
                    : "text-[#8E8E93] font-normal hover:text-gray-700 dark:hover:text-zinc-200"
                )}
              >
                Active ({students.length})
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab("archived");
                  setPage(1);
                }}
                className={cn(
                  "relative h-9 flex items-center text-[13px] font-semibold transition-colors focus:outline-none cursor-pointer border-0 bg-transparent",
                  activeTab === "archived"
                    ? "text-gray-900 dark:text-zinc-50 after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-full after:bg-gray-900 dark:after:bg-zinc-50"
                    : "text-[#8E8E93] font-normal hover:text-gray-700 dark:hover:text-zinc-200"
                )}
              >
                Archived ({archivedStudents.length})
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab("all");
                  setPage(1);
                }}
                className={cn(
                  "relative h-9 flex items-center text-[13px] font-semibold transition-colors focus:outline-none cursor-pointer border-0 bg-transparent",
                  activeTab === "all"
                    ? "text-gray-900 dark:text-zinc-50 after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-full after:bg-gray-900 dark:after:bg-zinc-50"
                    : "text-[#8E8E93] font-normal hover:text-gray-700 dark:hover:text-zinc-200"
                )}
              >
                All Records ({students.length + archivedStudents.length})
              </button>
            </div>

            {/* Filter Selects & Search Bar */}
            <div className="flex flex-wrap items-center gap-2.5 flex-1 lg:justify-end">
              {/* Search Bar */}
              <div className="relative w-full sm:w-64">
                <i className="ph-bold ph-magnifying-glass absolute top-1/2 -translate-y-1/2 left-3 text-gray-400 dark:text-zinc-500 text-sm pointer-events-none"></i>
                <Input
                  type="text"
                  placeholder="Search student no. or name"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setPage(1);
                  }}
                  className="h-9 w-full rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 pl-9 pr-8 text-xs font-normal text-gray-900 dark:text-zinc-100 placeholder:text-gray-400 dark:placeholder:text-zinc-500 shadow-none focus-visible:outline-none focus-visible:border-pup-maroon focus-visible:ring-1 focus-visible:ring-pup-maroon dark:focus-visible:border-red-500/80"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute top-1/2 right-2.5 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-zinc-200"
                  >
                    <i className="ph-bold ph-x-circle text-[14px]"></i>
                  </button>
                )}
              </div>

              {/* Course Filter */}
              <div className="w-full sm:w-36">
                <Select
                  value={courseFilter}
                  onValueChange={(val) => {
                    setCourseFilter(val);
                    setSectionFilter("all");
                    setPage(1);
                  }}
                  options={[
                    { value: "all", label: "All Programs" },
                    ...courses.map((c) => ({ value: c.code, label: c.code })),
                  ]}
                  placeholder="Program"
                  buttonClassName="h-9 text-xs rounded-xl border border-gray-200 dark:border-white/10"
                />
              </div>

              {/* Year Filter */}
              <div className="w-full sm:w-32">
                <Select
                  value={yearFilter}
                  onValueChange={(val) => {
                    setYearFilter(val);
                    setPage(1);
                  }}
                  options={[
                    { value: "all", label: "All Years" },
                    ...availableYears.map((yr) => ({ value: String(yr), label: `Batch ${yr}` })),
                  ]}
                  placeholder="Entry Year"
                  buttonClassName="h-9 text-xs rounded-xl border border-gray-200 dark:border-white/10"
                />
              </div>

              {/* Section Filter */}
              <div className="w-full sm:w-32">
                <Select
                  value={sectionFilter}
                  onValueChange={(val) => {
                    setSectionFilter(val);
                    setPage(1);
                  }}
                  options={[
                    { value: "all", label: "All Sections" },
                    ...availableFilterSections.map((sec) => ({ value: sec, label: `Sec ${sec}` })),
                  ]}
                  placeholder="Section"
                  buttonClassName="h-9 text-xs rounded-xl border border-gray-200 dark:border-white/10"
                />
              </div>

              {/* Clear Filters Button */}
              {hasActiveFilters && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleResetFilters}
                  className="h-9 px-2.5 text-xs text-pup-maroon dark:text-red-400 hover:bg-pup-maroon/10 rounded-xl cursor-pointer"
                >
                  <i className="ph-bold ph-arrow-counter-clockwise mr-1 text-xs"></i>
                  Reset
                </Button>
              )}
            </div>
          </div>

          {/* 4. Main Data Table */}
          <div className="flex-1 bg-white dark:bg-card">
            {loading ? (
              <div className="p-6 space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-12 w-full rounded-xl" />
                ))}
              </div>
            ) : paginatedStudents.length === 0 ? (
              <div className="py-16">
                <Empty className="flex h-full flex-col items-center justify-center border-0 text-center text-gray-500 dark:text-zinc-400">
                  <EmptyHeader className="flex flex-col items-center gap-0">
                    <div className="relative mb-6">
                      <div className="absolute inset-0 scale-150 animate-pulse rounded-full bg-gray-50 opacity-50 dark:bg-card"></div>
                      <EmptyMedia className="relative z-10 flex h-24 w-24 items-center justify-center rounded-3xl border border-gray-100 bg-white shadow-xl rotate-3 dark:border-white/10 dark:bg-card dark:shadow-none">
                        <i className="ph-duotone ph-student text-2xl text-gray-300 dark:text-zinc-600"></i>
                      </EmptyMedia>
                    </div>
                    <EmptyTitle className="text-lg font-semibold text-gray-900 dark:text-zinc-50">
                      No Student Records Found
                    </EmptyTitle>
                    <EmptyDescription className="max-w-xs text-xs font-medium text-gray-500 dark:text-zinc-400 mt-1">
                      {hasActiveFilters
                        ? "Try clearing some filter options or changing your search criteria."
                        : "There are currently no student records in this view. Enroll a student to get started."}
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="sticky top-0 z-10 border-b-[0.5px] border-black/10 dark:border-white/10 bg-white dark:bg-card">
                    <tr className="text-left text-[12px] font-medium tracking-[0.04em] text-[#8E8E93] dark:text-zinc-500">
                      <th className="w-12 p-4 text-center">
                        <input
                          type="checkbox"
                          className="h-4 w-4 cursor-pointer rounded border border-gray-300 dark:border-white/10"
                          checked={isPageAllSelected}
                          onChange={toggleSelectAllPage}
                        />
                      </th>

                      <th className="p-4">
                        <button
                          type="button"
                          onClick={() => handleSort("studentNo")}
                          className="group flex items-center focus:outline-none cursor-pointer text-[12px] font-medium tracking-[0.04em]"
                        >
                          Student No.
                          <SortIndicator column="studentNo" sortBy={sortBy} sortOrder={sortOrder} />
                        </button>
                      </th>

                      <th className="p-4">
                        <button
                          type="button"
                          onClick={() => handleSort("name")}
                          className="group flex items-center focus:outline-none cursor-pointer text-[12px] font-medium tracking-[0.04em]"
                        >
                          Full Name
                          <SortIndicator column="name" sortBy={sortBy} sortOrder={sortOrder} />
                        </button>
                      </th>

                      <th className="p-4">
                        <button
                          type="button"
                          onClick={() => handleSort("courseCode")}
                          className="group flex items-center focus:outline-none cursor-pointer text-[12px] font-medium tracking-[0.04em]"
                        >
                          Program & Section
                          <SortIndicator column="courseCode" sortBy={sortBy} sortOrder={sortOrder} />
                        </button>
                      </th>

                      <th className="p-4">
                        <button
                          type="button"
                          onClick={() => handleSort("yearLevel")}
                          className="group flex items-center focus:outline-none cursor-pointer text-[12px] font-medium tracking-[0.04em]"
                        >
                          Year / Batch
                          <SortIndicator column="yearLevel" sortBy={sortBy} sortOrder={sortOrder} />
                        </button>
                      </th>

                      <th className="p-4">Physical Archive</th>

                      <th className="p-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleSort("documents")}
                          className="group inline-flex items-center focus:outline-none cursor-pointer text-[12px] font-medium tracking-[0.04em]"
                        >
                          Files
                          <SortIndicator column="documents" sortBy={sortBy} sortOrder={sortOrder} />
                        </button>
                      </th>

                      <th className="p-4 text-center">Status</th>

                      <th className="w-36 p-4 text-right">Actions</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                    {paginatedStudents.map((s) => {
                      const isSelected = selectedIds.has(s.studentNo);
                      const isStudentArchived = String(s.status || "").toLowerCase() === "archived";
                      const docCount = docCountMap.get(String(s.studentNo).toUpperCase()) || 0;

                      return (
                        <tr
                          key={s.studentNo}
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
                            className="p-4 text-center"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleSelect(s.studentNo);
                            }}
                          >
                            <input
                              type="checkbox"
                              className="h-4 w-4 cursor-pointer rounded border border-gray-300 dark:border-white/10"
                              checked={isSelected}
                              onChange={() => toggleSelect(s.studentNo)}
                            />
                          </td>

                          <td className="p-4">
                            <span className="font-mono text-xs font-semibold px-2 py-1 rounded-md bg-gray-100 dark:bg-zinc-800 text-gray-800 dark:text-zinc-200">
                              {s.studentNo}
                            </span>
                          </td>

                          <td className="p-4">
                            <div className="font-semibold text-gray-900 dark:text-zinc-100 group-hover:text-pup-maroon dark:group-hover:text-red-400 transition-colors">
                              {s.name}
                            </div>
                          </td>

                          <td className="p-4">
                            <div className="flex items-center gap-1.5">
                              <Badge
                                variant="outline"
                                className="text-[11px] font-semibold uppercase px-2 py-0.5 rounded-md border-gray-200 dark:border-white/10"
                              >
                                {s.courseCode || "N/A"}
                              </Badge>
                              <span className="text-xs text-gray-500 dark:text-zinc-400 font-medium">
                                Sec {s.section || "—"}
                              </span>
                            </div>
                          </td>

                          <td className="p-4 text-xs font-medium text-gray-600 dark:text-zinc-400">
                            {s.yearLevel || "—"}
                          </td>

                          <td className="p-4">
                            <div className="inline-flex items-center gap-1 text-xs text-gray-700 dark:text-zinc-300">
                              <i className="ph-bold ph-map-pin text-gray-400 text-xs"></i>
                              <span>
                                Room {s.room} • Cab {s.cabinet} • Drw {s.drawer}
                              </span>
                            </div>
                          </td>

                          <td className="p-4 text-center">
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-[10px] font-bold px-2 py-0.5 rounded-full border",
                                docCount > 0
                                  ? "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20"
                                  : "bg-gray-50 text-gray-500 border-gray-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-white/10"
                              )}
                            >
                              {docCount} {docCount === 1 ? "file" : "files"}
                            </Badge>
                          </td>

                          <td className="p-4 text-center">
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border",
                                isStudentArchived
                                  ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20"
                                  : "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20"
                              )}
                            >
                              {s.status || "Active"}
                            </Badge>
                          </td>

                          <td className="p-4 text-right" onClick={(e) => e.stopPropagation()}>
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
                                    className="w-7 h-7 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-zinc-100 flex items-center justify-center transition-colors"
                                  >
                                    <i className="ph-bold ph-eye text-[14px]"></i>
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent>View Dossier</TooltipContent>
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
                                    className="w-7 h-7 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-zinc-100 flex items-center justify-center transition-colors"
                                  >
                                    <i className="ph-bold ph-pencil-simple text-[14px]"></i>
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
                                    className="w-7 h-7 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-500 dark:text-zinc-400 hover:text-pup-maroon dark:hover:text-red-400 flex items-center justify-center transition-colors"
                                  >
                                    <i className="ph-bold ph-compass text-[14px]"></i>
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
                                      className="w-7 h-7 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center transition-colors"
                                    >
                                      <i className="ph-bold ph-archive-restore text-[14px]"></i>
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
                                      className="w-7 h-7 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 text-gray-400 hover:text-red-600 dark:hover:text-red-400 flex items-center justify-center transition-colors"
                                    >
                                      <i className="ph-bold ph-archive text-[14px]"></i>
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
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* 5. Apple HIG Pagination Footer */}
          {filteredStudents.length > 0 && (
            <div className="flex items-center justify-between border-t border-[#e5e5ea] dark:border-[#3a3a3c] bg-white dark:bg-[#1c1c1e] p-4 px-6 rounded-b-2xl mt-auto select-none">
              <div className="flex items-center gap-6 text-xs text-gray-500 dark:text-zinc-400 select-none">
                <span>
                  Showing {paginatedStudents.length} of {filteredStudents.length.toLocaleString()}
                </span>
                <div className="flex items-center gap-2">
                  <span>Rows:</span>
                  {[10, 20, 50, 100].map((size) => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => {
                        setItemsPerPage(size);
                        setPage(1);
                      }}
                      className={cn(
                        "px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer border-0",
                        itemsPerPage === size
                          ? "bg-gray-100 dark:bg-zinc-800 text-gray-900 dark:text-zinc-100"
                          : "bg-transparent text-gray-400 hover:text-gray-600 dark:hover:text-zinc-200"
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
                  className="text-xs text-gray-500 dark:text-zinc-400 disabled:opacity-40 cursor-pointer rounded-xl h-8 px-3"
                >
                  Prev
                </Button>

                <div className="h-8 w-8 rounded-xl border border-[#e5e5ea] dark:border-zinc-800 flex items-center justify-center text-xs font-bold text-gray-800 dark:text-zinc-200 bg-white dark:bg-zinc-900">
                  {page}
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="text-xs text-gray-500 dark:text-zinc-400 disabled:opacity-40 cursor-pointer rounded-xl h-8 px-3"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </Card>

        {/* Floating Bulk Action Bar */}
        {selectedIds.size > 0 && (
          <FloatingActionBar
            selectedCount={selectedIds.size}
            onClearSelection={() => setSelectedIds(new Set())}
            actions={
              <div className="flex items-center gap-2">
                {activeTab !== "archived" && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setBulkActionType("archive");
                      setBulkActionOpen(true);
                    }}
                    className="h-8 px-3 text-xs font-semibold rounded-lg border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400"
                  >
                    <i className="ph-bold ph-archive mr-1"></i>
                    Archive Selected ({selectedIds.size})
                  </Button>
                )}

                {activeTab !== "active" && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setBulkActionType("restore");
                      setBulkActionOpen(true);
                    }}
                    className="h-8 px-3 text-xs font-semibold rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400"
                  >
                    <i className="ph-bold ph-archive-restore mr-1"></i>
                    Restore Selected ({selectedIds.size})
                  </Button>
                )}
              </div>
            }
          />
        )}

        {/* Register Student Modal */}
        <RegisterStudentModal
          open={registerOpen}
          onOpenChange={setRegisterOpen}
          courses={courses}
          sections={sections}
          storageLayout={storageLayout}
          onSuccess={fetchData}
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
          onSuccess={fetchData}
          showToast={showToast}
        />

        {/* Student Profile / Dossier Modal */}
        <StudentProfileModal
          open={profileOpen}
          onOpenChange={setProfileOpen}
          student={activeStudent}
          allDocs={allDocs}
          onLocateStudent={onLocateStudent}
          onPreviewDocument={onPreviewDocument}
          onEditStudent={(s) => {
            setActiveStudent(s);
            setEditOpen(true);
          }}
          onArchiveStudent={(sn) => {
            setArchiveTarget(activeStudent);
            setArchiveModalOpen(true);
          }}
          onRestoreStudent={(sn) => {
            setRestoreTarget(activeStudent);
            setRestoreModalOpen(true);
          }}
        />

        {/* Single Archive Confirm Modal */}
        <ConfirmModal
          open={archiveModalOpen}
          onOpenChange={setArchiveModalOpen}
          title="Archive Student Record"
          description={`Are you sure you want to archive student record ${archiveTarget?.studentNo} (${archiveTarget?.name})? The student will be moved to the archive view.`}
          confirmLabel="Archive Student"
          confirmVariant="destructive"
          onConfirm={handleConfirmArchive}
        />

        {/* Single Restore Confirm Modal */}
        <ConfirmModal
          open={restoreModalOpen}
          onOpenChange={setRestoreModalOpen}
          title="Restore Student Record"
          description={`Are you sure you want to restore student record ${restoreTarget?.studentNo} (${restoreTarget?.name}) to Active status?`}
          confirmLabel="Restore Record"
          confirmVariant="default"
          onConfirm={handleConfirmRestore}
        />

        {/* Bulk Action Confirm Modal */}
        <ConfirmModal
          open={bulkActionOpen}
          onOpenChange={setBulkActionOpen}
          title={bulkActionType === "archive" ? "Bulk Archive Student Records" : "Bulk Restore Student Records"}
          description={
            bulkActionType === "archive"
              ? `Are you sure you want to archive ${selectedIds.size} student record(s)?`
              : `Are you sure you want to restore ${selectedIds.size} student record(s) to Active status?`
          }
          confirmLabel={bulkActionType === "archive" ? "Archive Records" : "Restore Records"}
          confirmVariant={bulkActionType === "archive" ? "destructive" : "default"}
          onConfirm={handleConfirmBulk}
          isLoading={isBulkProcessing}
        />
      </div>
    </TooltipProvider>
  );
}
