"use client";
import HugeIcon from "@/components/shared/HugeIcon";
import useUrlPage from "@/hooks/useUrlPage";
import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { Reorder } from "framer-motion";
import { cn, formatTitleCase } from "@/lib/utils";
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
import DocumentsMatrixSkeleton from "@/components/staff/skeletons/DocumentsMatrixSkeleton";
import { formatPHDateTime } from "@/lib/timeFormat";
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
  EmptyMedia,
} from "@/components/ui/empty";
import PageHeader from "@/components/shared/PageHeader";
import { RefreshButton } from "@/components/shared/RefreshButton";
import ResilientPDFViewer from "@/components/shared/ResilientPDFViewer";
import MultiCriteriaFilter from "@/components/shared/MultiCriteriaFilter";
import ActiveFilterChips from "@/components/shared/ActiveFilterChips";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const DEFAULT_KPI_ORDER = ["compliant", "incomplete", "rate"];
const STORAGE_KEY = "pupsj_staff_docs_matrix_kpi_order";

function SortIndicator({ column, sortBy, sortOrder }) {
  if (sortBy !== column)
    return <HugeIcon className="ph-bold ph-caret-up-down ml-1 text-[11px] opacity-40 transition-opacity group-hover:opacity-70 dark:opacity-30 dark:group-hover:opacity-60" />;
  return sortOrder === "ASC" ? (
    <HugeIcon className="ph-bold ph-caret-up ml-1 text-[11px] text-pup-maroon animate-in fade-in zoom-in duration-300 dark:text-primary" />
  ) : (
    <HugeIcon className="ph-bold ph-caret-down ml-1 text-[11px] text-pup-maroon animate-in fade-in zoom-in duration-300 dark:text-primary" />
  );
}



export default function DocumentsTab({
  docsForm,
  setDocsForm,
  refreshDocuments,
  onRefreshDocuments,
  docTypes = [],
  courses = [],
  sections = [],
  storageLayout,
  docsLoading,
  docsError,
  docsRows = [],
  students = [],
  staffDocs = [],
  isOsas = false,
  onPreviewDocument,
  onRescan,
  onUpdateStudent,
  onArchiveStudent,
  currentStudent,
}) {
  const [isManualRefreshing, setIsManualRefreshing] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [docFrameStatus, setDocFrameStatus] = useState("loading");
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Standardized Draggable KPI Stat Cards & Popover State
  const [kpiOrder, setKpiOrder] = useState(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            const filtered = parsed.filter((k) => DEFAULT_KPI_ORDER.includes(k));
            if (filtered.length === DEFAULT_KPI_ORDER.length) {
              return filtered;
            }
          }
        }
      } catch {
        // Fallback
      }
    }
    return DEFAULT_KPI_ORDER;
  });

  const handleReorder = (newOrder) => {
    setKpiOrder(newOrder);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newOrder));
    } catch {
      // Ignore storage error
    }
  };

  const [selectedKpi, setSelectedKpi] = useState(null);
  const statCardsRef = useRef(null);

  // Close dropdown details when clicking outside
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

  // Matrix mode filter states
  const [matrixStatusFilter, setMatrixStatusFilter] = useState("all"); // "all" | "incomplete" | "compliant"
  const [matrixSearch, setMatrixSearch] = useState("");
  const [matrixCourseFilters, setMatrixCourseFilters] = useState([]);
  const [matrixMissingDocFilters, setMatrixMissingDocFilters] = useState([]);
  const [matrixSortBy, setMatrixSortBy] = useState("student_no");
  const [matrixSortOrder, setMatrixSortOrder] = useState("ASC");
  const [matrixPage, setMatrixPage] = useUrlPage();
  const [matrixItemsPerPage, setMatrixItemsPerPage] = useState(10);

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

  // Derive compliance document types for matrix columns
  const complianceDocTypes = useMemo(() => {
    if (Array.isArray(docTypes) && docTypes.length > 0) {
      return docTypes.map((d) => (typeof d === "object" ? d.name : d)).filter(Boolean);
    }
    const distinct = Array.from(new Set(staffDocs.map((d) => d.doc_type).filter(Boolean)));
    if (distinct.length > 0) return distinct;
    return ["PSA Birth Certificate", "Form 137", "Certificate of Good Moral Character", "Health Information Sheet"];
  }, [docTypes, staffDocs]);

  // Compute Batch Compliance Matrix data
  const matrixRecords = useMemo(() => {
    const activeStudents = (students || []).filter(
      (s) => s.status !== "Inactive" && s.status !== "Archived"
    );

    const allOfficeDocs =
      staffDocs && staffDocs.length > 0
        ? staffDocs
        : (docsRows || []).map((r) => r.doc).filter(Boolean);

    // Group docs by student_no
    const docsByStudent = new Map();
    for (const doc of allOfficeDocs) {
      const sn = String(doc.student_no || "").trim().toLowerCase();
      if (!sn) continue;
      if (!docsByStudent.has(sn)) docsByStudent.set(sn, []);
      docsByStudent.get(sn).push(doc);
    }

    return activeStudents.map((student) => {
      const sn = String(student.studentNo || "").trim().toLowerCase();
      const studentFiles = docsByStudent.get(sn) || [];

      const requirements = complianceDocTypes.map((type) => {
        const normType = type.toLowerCase().replace(/[\s\-_]+/g, " ").trim();
        const matched = studentFiles.find((d) => {
          const dType = String(d.doc_type || "").toLowerCase().replace(/[\s\-_]+/g, " ").trim();
          return dType === normType;
        });

        if (matched) {
          const isApproved = matched.approval_status === "Approved";
          return {
            docType: type,
            status: isApproved ? "verified" : "pending",
            doc: matched,
          };
        }

        return {
          docType: type,
          status: "missing",
          doc: null,
        };
      });

      const verifiedCount = requirements.filter((r) => r.status === "verified").length;
      const pendingCount = requirements.filter((r) => r.status === "pending").length;
      const missingCount = requirements.filter((r) => r.status === "missing").length;
      const uploadedCount = verifiedCount + pendingCount;
      const totalCount = requirements.length;
      const isCompliant = totalCount > 0 && verifiedCount === totalCount;
      const completionPercent = totalCount > 0 ? Math.round((verifiedCount / totalCount) * 100) : 100;

      return {
        student,
        requirements,
        verifiedCount,
        pendingCount,
        missingCount,
        uploadedCount,
        totalCount,
        isCompliant,
        completionPercent,
      };
    });
  }, [students, staffDocs, docsRows, complianceDocTypes]);

  // Overall KPI statistics
  const kpiStats = useMemo(() => {
    const total = matrixRecords.length;
    const compliant = matrixRecords.filter((m) => m.isCompliant).length;
    const incomplete = total - compliant;
    const totalSlots = total * complianceDocTypes.length;
    const totalVerified = matrixRecords.reduce((acc, m) => acc + m.verifiedCount, 0);
    const totalPending = matrixRecords.reduce((acc, m) => acc + m.pendingCount, 0);
    const totalMissing = matrixRecords.reduce((acc, m) => acc + m.missingCount, 0);
    const overallRate = totalSlots > 0 ? Math.round((totalVerified / totalSlots) * 100) : 0;
    const compliantRate = total > 0 ? Math.round((compliant / total) * 100) : 0;

    const missingCounts = {};
    complianceDocTypes.forEach((t) => {
      missingCounts[t] = 0;
    });
    for (const record of matrixRecords) {
      for (const req of record.requirements) {
        if (req.status === "missing") {
          missingCounts[req.docType] = (missingCounts[req.docType] || 0) + 1;
        }
      }
    }
    const topMissing = Object.entries(missingCounts)
      .map(([docType, count]) => ({ docType, count }))
      .sort((a, b) => b.count - a.count);

    return {
      totalStudents: total,
      fullyCompliant: compliant,
      incomplete,
      overallRate,
      compliantRate,
      totalSlots,
      totalVerified,
      totalPending,
      totalMissing,
      topMissing,
    };
  }, [matrixRecords, complianceDocTypes]);

  // Matrix Filtered Records
  const filteredMatrixRecords = useMemo(() => {
    return matrixRecords.filter((item) => {
      // 1. Status Filter Tab
      if (matrixStatusFilter === "incomplete" && item.isCompliant) return false;
      if (matrixStatusFilter === "compliant" && !item.isCompliant) return false;

      // 2. Search Query
      if (matrixSearch.trim()) {
        const q = matrixSearch.trim().toLowerCase();
        const sn = String(item.student.studentNo || "").toLowerCase();
        const name = String(item.student.name || "").toLowerCase();
        const course = String(item.student.courseCode || "").toLowerCase();
        const section = String(item.student.section || "").toLowerCase();
        const combined = `${course} ${section}`.toLowerCase();
        if (
          !sn.includes(q) &&
          !name.includes(q) &&
          !course.includes(q) &&
          !section.includes(q) &&
          !combined.includes(q)
        ) {
          return false;
        }
      }

      // 3. Course Filter
      if (matrixCourseFilters.length > 0) {
        const course = String(item.student.courseCode || "").toUpperCase();
        if (!matrixCourseFilters.some((c) => c.toUpperCase() === course)) return false;
      }

      // 4. Missing Doc Filter
      if (matrixMissingDocFilters.length > 0) {
        const normFilters = matrixMissingDocFilters.map((f) =>
          f.toLowerCase().replace(/[\s\-_]+/g, " ").trim()
        );
        const hasMissing = item.requirements.some((r) => {
          const normType = r.docType.toLowerCase().replace(/[\s\-_]+/g, " ").trim();
          return normFilters.includes(normType) && r.status === "missing";
        });
        if (!hasMissing) return false;
      }

      return true;
    });
  }, [matrixRecords, matrixStatusFilter, matrixSearch, matrixCourseFilters, matrixMissingDocFilters]);

  // Matrix Sorting
  const sortedMatrixRecords = useMemo(() => {
    return [...filteredMatrixRecords].sort((a, b) => {
      let cmp = 0;
      if (matrixSortBy === "student_no") {
        cmp = String(a.student.studentNo || "").localeCompare(String(b.student.studentNo || ""));
      } else if (matrixSortBy === "name") {
        cmp = String(a.student.name || "").localeCompare(String(b.student.name || ""));
      } else if (matrixSortBy === "course") {
        const cA = `${a.student.courseCode || ""} ${a.student.section || ""}`;
        const cB = `${b.student.courseCode || ""} ${b.student.section || ""}`;
        cmp = cA.localeCompare(cB);
      } else if (matrixSortBy === "progress") {
        cmp = a.completionPercent - b.completionPercent;
      }
      return matrixSortOrder === "ASC" ? cmp : -cmp;
    });
  }, [filteredMatrixRecords, matrixSortBy, matrixSortOrder]);

  const totalMatrixPages = Math.max(1, Math.ceil(sortedMatrixRecords.length / matrixItemsPerPage));
  const currentMatrixPage = Math.min(Math.max(1, matrixPage), totalMatrixPages);

  const paginatedMatrixRecords = useMemo(() => {
    const start = (currentMatrixPage - 1) * matrixItemsPerPage;
    return sortedMatrixRecords.slice(start, start + matrixItemsPerPage);
  }, [sortedMatrixRecords, currentMatrixPage, matrixItemsPerPage]);

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
  }, [matrixPage, matrixStatusFilter, matrixSearch, matrixCourseFilters, matrixMissingDocFilters]);

  // Matrix Filter Groups for MultiCriteriaFilter
  const matrixFilterGroups = useMemo(() => {
    const courseOptions = (courses || []).map((c) => ({
      value: c.code,
      label: `${c.code} - ${c.name || c.code}`,
      count: matrixRecords.filter(
        (m) => String(m.student.courseCode || "").toUpperCase() === String(c.code).toUpperCase()
      ).length,
    }));

    const missingDocOptions = complianceDocTypes.map((docType) => {
      const normType = docType.toLowerCase().replace(/[\s\-_]+/g, " ").trim();
      const count = matrixRecords.filter((m) => {
        const r = m.requirements.find(
          (req) => req.docType.toLowerCase().replace(/[\s\-_]+/g, " ").trim() === normType
        );
        return r && r.status === "missing";
      }).length;

      return {
        value: docType,
        label: docType,
        count,
        indicatorColor: "bg-rose-500",
      };
    });

    return [
      {
        id: "course",
        label: "Degree Program",
        options: courseOptions,
      },
      {
        id: "missingDoc",
        label: "Missing Requirement",
        options: missingDocOptions,
      },
    ];
  }, [courses, matrixRecords, complianceDocTypes]);

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
        label: `Missing: ${d}`,
        onRemove: () => {
          setMatrixMissingDocFilters((prev) => prev.filter((x) => x !== d));
          setMatrixPage(1);
        },
      });
    });
    return chips;
  }, [matrixSearch, matrixCourseFilters, matrixMissingDocFilters, setMatrixPage]);





  return (
    <TooltipProvider delayDuration={200}>
      <div
        id="view-documents"
        className="flex flex-[1_0_auto] flex-col w-full h-auto focus:outline-none animate-fade-up font-jakarta"
        tabIndex={0}
      >
        {/* ONE Single Card Container encapsulating Header, Toolbar, Filters, Table & Pagination */}
        <Card className="flex flex-[1_0_auto] h-auto w-full flex-col p-0 gap-0 overflow-hidden rounded-2xl border border-border bg-white shadow-sm dark:border-border dark:bg-card dark:shadow-none isolate">
          {/* 1. Page Header */}
          <PageHeader
            icon="ph-files"
            title="Batch Compliance Matrix"
            description="Track required document compliance across students, sections, and degree programs."
            showBorder={false}
            className="p-6"
            titleClassName="text-[18px] font-semibold tracking-[-0.01em] text-gray-900 dark:text-zinc-50"
            descriptionClassName="text-[13px] font-normal text-gray-900 dark:text-zinc-300 mt-[4px]"
            actions={
              <RefreshButton
                onRefresh={async () => {
                  setIsManualRefreshing(true);
                  const startTime = Date.now();
                  try {
                    if (onRefreshDocuments) {
                      await onRefreshDocuments();
                    }
                    await refreshDocuments(docsForm);
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
            }
          />

          {/* 2. Top Summary KPI Metrics Banner (Draggable & Clickable) */}
          <Reorder.Group
            as="div"
            axis="x"
            values={kpiOrder}
            onReorder={handleReorder}
            ref={statCardsRef}
            className="border-t border-border dark:border-border grid grid-cols-1 md:grid-cols-3 gap-4 p-5 bg-gray-50/50 dark:bg-zinc-900/30 relative z-20 items-start select-none"
          >
            {kpiOrder.map((key) => {
              if (key === "compliant") {
                return (
                  <Reorder.Item
                    as="div"
                    value="compliant"
                    key="compliant"
                    className={cn(
                      "relative group rounded-xl",
                      selectedKpi === "compliant" ? "z-30" : "z-10"
                    )}
                  >
                    <div
                      onClick={() =>
                        setSelectedKpi(selectedKpi === "compliant" ? null : "compliant")
                      }
                      className={cn(
                        "relative overflow-hidden rounded-[18px] border cursor-pointer select-none transition-all shadow-none flex flex-col justify-between min-h-[110px] bg-white dark:bg-zinc-900",
                        selectedKpi === "compliant"
                          ? "border-emerald-500/50 ring-1 ring-emerald-500/20"
                          : "border-border dark:border-border hover:border-gray-300 dark:hover:border-zinc-700"
                      )}
                    >
                      <div className="flex justify-between items-start p-4 pb-0">
                        <span className="text-[13px] font-medium text-emerald-600 dark:text-emerald-400 capitalize">
                          Fully Compliant
                        </span>
                        <div className="w-8 h-8 rounded-[10px] flex items-center justify-center text-white shadow-sm shrink-0 bg-[#10b981]">
                          <HugeIcon className="ph-fill text-[15px] ph-check-circle" />
                        </div>
                      </div>

                      <div className="flex justify-between items-end p-4 pt-1">
                        <div className="flex items-baseline gap-2">
                          <span className="text-[28px] font-bold text-gray-900 dark:text-white leading-none tracking-tight">
                            {kpiStats.fullyCompliant.toLocaleString()}
                          </span>
                          <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 mb-1">
                            100% Verified
                          </span>
                        </div>
                        <HugeIcon className="ph-bold ph-dots-six-vertical cursor-grab active:cursor-grabbing hover:text-black dark:hover:text-white text-gray-400 dark:text-zinc-500 text-xl mb-0.5" />
                      </div>
                    </div>

                    {/* Popover container */}
                    <div
                      className={cn(
                        "absolute top-full left-0 right-0 z-[100] mt-2 rounded-xl border border-border bg-white p-4 shadow-xl dark:border-border dark:bg-zinc-900 transition-all duration-300 ease-in-out origin-top",
                        selectedKpi === "compliant"
                          ? "scale-y-100 opacity-100 translate-y-0"
                          : "scale-y-95 opacity-0 -translate-y-2 pointer-events-none"
                      )}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-2">
                          <div className="bg-emerald-50 dark:bg-emerald-950/30 p-2.5 rounded-lg border border-emerald-100 dark:border-emerald-900/30">
                            <span className="block text-[9px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                              Compliant Folders
                            </span>
                            <span className="text-lg font-black text-emerald-700 dark:text-emerald-400">
                              {kpiStats.fullyCompliant}
                            </span>
                          </div>
                          <div className="bg-gray-50 dark:bg-zinc-800/60 p-2.5 rounded-lg border border-border dark:border-border">
                            <span className="block text-[9px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-wider">
                              Compliance Rate
                            </span>
                            <span className="text-lg font-black text-gray-900 dark:text-zinc-50">
                              {kpiStats.compliantRate}%
                            </span>
                          </div>
                        </div>

                        <p className="text-[11px] text-gray-500 dark:text-zinc-400 leading-relaxed">
                          Students with all required documents uploaded and verified in the archive.
                        </p>

                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setMatrixStatusFilter("compliant");
                            setMatrixPage(1);
                            setSelectedKpi(null);
                          }}
                          className="w-full h-8 text-xs font-semibold rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 cursor-pointer active:scale-95 transition-all shadow-2xs"
                        >
                          Filter Compliant Records
                        </Button>
                      </div>
                    </div>
                  </Reorder.Item>
                );
              }

              if (key === "incomplete") {
                return (
                  <Reorder.Item
                    as="div"
                    value="incomplete"
                    key="incomplete"
                    className={cn(
                      "relative group rounded-xl",
                      selectedKpi === "incomplete" ? "z-30" : "z-10"
                    )}
                  >
                    <div
                      onClick={() =>
                        setSelectedKpi(selectedKpi === "incomplete" ? null : "incomplete")
                      }
                      className={cn(
                        "relative overflow-hidden rounded-[18px] border cursor-pointer select-none transition-all shadow-none flex flex-col justify-between min-h-[110px] bg-white dark:bg-zinc-900",
                        selectedKpi === "incomplete"
                          ? "border-rose-500/50 ring-1 ring-rose-500/20"
                          : "border-border dark:border-border hover:border-gray-300 dark:hover:border-zinc-700"
                      )}
                    >
                      <div className="flex justify-between items-start p-4 pb-0">
                        <span className="text-[13px] font-medium text-rose-600 dark:text-rose-400 capitalize">
                          Incomplete Folders
                        </span>
                        <div className="w-8 h-8 rounded-[10px] flex items-center justify-center text-white shadow-sm shrink-0 bg-[#ef4444]">
                          <HugeIcon className="ph-fill text-[15px] ph-warning-circle" />
                        </div>
                      </div>

                      <div className="flex justify-between items-end p-4 pt-1">
                        <div className="flex items-baseline gap-2">
                          <span className="text-[28px] font-bold text-gray-900 dark:text-white leading-none tracking-tight">
                            {kpiStats.incomplete.toLocaleString()}
                          </span>
                          <span className="text-xs font-medium text-rose-600 dark:text-rose-400 mb-1">
                            Missing Files
                          </span>
                        </div>
                        <HugeIcon className="ph-bold ph-dots-six-vertical cursor-grab active:cursor-grabbing hover:text-black dark:hover:text-white text-gray-400 dark:text-zinc-500 text-xl mb-0.5" />
                      </div>
                    </div>

                    {/* Popover container */}
                    <div
                      className={cn(
                        "absolute top-full left-0 right-0 z-[100] mt-2 rounded-xl border border-border bg-white p-4 shadow-xl dark:border-border dark:bg-zinc-900 transition-all duration-300 ease-in-out origin-top",
                        selectedKpi === "incomplete"
                          ? "scale-y-100 opacity-100 translate-y-0"
                          : "scale-y-95 opacity-0 -translate-y-2 pointer-events-none"
                      )}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-2">
                          <div className="bg-rose-50 dark:bg-rose-950/30 p-2.5 rounded-lg border border-rose-100 dark:border-rose-900/30">
                            <span className="block text-[9px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider">
                              Incomplete Folders
                            </span>
                            <span className="text-lg font-black text-rose-700 dark:text-rose-400">
                              {kpiStats.incomplete}
                            </span>
                          </div>
                          <div className="bg-gray-50 dark:bg-zinc-800/60 p-2.5 rounded-lg border border-border dark:border-border">
                            <span className="block text-[9px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-wider">
                              Missing Slots
                            </span>
                            <span className="text-lg font-black text-gray-900 dark:text-zinc-50">
                              {kpiStats.totalMissing}
                            </span>
                          </div>
                        </div>

                        <div>
                          <h4 className="text-[10px] font-bold text-gray-400 dark:text-zinc-500 mb-1.5 uppercase tracking-wide">
                            Top Missing Requirements
                          </h4>
                          <div className="max-h-36 overflow-y-auto space-y-1 pr-1">
                            {kpiStats.topMissing.filter((m) => m.count > 0).length === 0 ? (
                              <p className="text-[11px] text-gray-400 dark:text-zinc-500 text-center py-2">
                                No missing documents
                              </p>
                            ) : (
                              kpiStats.topMissing
                                .filter((m) => m.count > 0)
                                .map(({ docType, count }) => (
                                  <div
                                    key={docType}
                                    className="flex justify-between items-center text-[11px] py-1 border-b border-border dark:border-border text-gray-700 dark:text-zinc-300"
                                  >
                                    <span className="truncate max-w-[170px] font-medium" title={docType}>
                                      {docType}
                                    </span>
                                    <span className="font-bold text-rose-600 dark:text-rose-400">
                                      {count} missing
                                    </span>
                                  </div>
                                ))
                            )}
                          </div>
                        </div>

                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setMatrixStatusFilter("incomplete");
                            setMatrixPage(1);
                            setSelectedKpi(null);
                          }}
                          className="w-full h-8 text-xs font-semibold rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 cursor-pointer active:scale-95 transition-all shadow-2xs"
                        >
                          Filter Incomplete Records
                        </Button>
                      </div>
                    </div>
                  </Reorder.Item>
                );
              }

              if (key === "rate") {
                return (
                  <Reorder.Item
                    as="div"
                    value="rate"
                    key="rate"
                    className={cn(
                      "relative group rounded-xl",
                      selectedKpi === "rate" ? "z-30" : "z-10"
                    )}
                  >
                    <div
                      onClick={() => setSelectedKpi(selectedKpi === "rate" ? null : "rate")}
                      className={cn(
                        "relative overflow-hidden rounded-[18px] border cursor-pointer select-none transition-all shadow-none flex flex-col justify-between min-h-[110px] bg-white dark:bg-zinc-900",
                        selectedKpi === "rate"
                          ? "border-pup-maroon/50 ring-1 ring-pup-maroon/20"
                          : "border-border dark:border-border hover:border-gray-300 dark:hover:border-zinc-700"
                      )}
                    >
                      <div className="flex justify-between items-start p-4 pb-0">
                        <span className="text-[13px] font-medium text-pup-maroon dark:text-red-400 capitalize">
                          Digitization Rate
                        </span>
                        <div className="w-8 h-8 rounded-[10px] flex items-center justify-center text-white shadow-sm shrink-0 bg-pup-maroon">
                          <HugeIcon className="ph-bold text-[15px] ph-chart-pie-slice" />
                        </div>
                      </div>

                      <div className="flex justify-between items-end p-4 pt-1">
                        <div className="flex items-baseline gap-2">
                          <span className="text-[28px] font-bold text-gray-900 dark:text-white leading-none tracking-tight">
                            {kpiStats.overallRate}%
                          </span>
                          <span className="text-xs font-medium text-gray-500 dark:text-zinc-400 mb-1">
                            Overall Rate
                          </span>
                        </div>
                        <HugeIcon className="ph-bold ph-dots-six-vertical cursor-grab active:cursor-grabbing hover:text-black dark:hover:text-white text-gray-400 dark:text-zinc-500 text-xl mb-0.5" />
                      </div>
                    </div>

                    {/* Popover container */}
                    <div
                      className={cn(
                        "absolute top-full left-0 right-0 z-[100] mt-2 rounded-xl border border-border bg-white p-4 shadow-xl dark:border-border dark:bg-zinc-900 transition-all duration-300 ease-in-out origin-top",
                        selectedKpi === "rate"
                          ? "scale-y-100 opacity-100 translate-y-0"
                          : "scale-y-95 opacity-0 -translate-y-2 pointer-events-none"
                      )}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-2">
                          <div className="bg-pup-maroon/10 dark:bg-red-950/30 p-2.5 rounded-lg border border-pup-maroon/20 dark:border-red-900/30">
                            <span className="block text-[9px] font-bold text-pup-maroon dark:text-red-400 uppercase tracking-wider">
                              Verified Slots
                            </span>
                            <span className="text-lg font-black text-pup-maroon dark:text-red-400">
                              {kpiStats.totalVerified}
                            </span>
                          </div>
                          <div className="bg-amber-50 dark:bg-amber-950/30 p-2.5 rounded-lg border border-amber-200 dark:border-amber-900/30">
                            <span className="block text-[9px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider">
                              Pending Review
                            </span>
                            <span className="text-lg font-black text-amber-700 dark:text-amber-400">
                              {kpiStats.totalPending}
                            </span>
                          </div>
                        </div>

                        <div>
                          <div className="flex justify-between items-center text-[10px] text-gray-500 dark:text-zinc-400 mb-1 font-semibold">
                            <span>Compliance Progress</span>
                            <span>{kpiStats.overallRate}%</span>
                          </div>
                          <div className="w-full h-2 bg-gray-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-pup-maroon dark:bg-red-500 transition-all duration-500"
                              style={{ width: `${Math.min(100, Math.max(0, kpiStats.overallRate))}%` }}
                            />
                          </div>
                        </div>

                        <p className="text-[11px] text-gray-500 dark:text-zinc-400 leading-relaxed">
                          {kpiStats.totalVerified} verified and {kpiStats.totalPending} pending out of{" "}
                          {kpiStats.totalSlots} total required document slots.
                        </p>

                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            handleClearMatrixFilters();
                            setSelectedKpi(null);
                          }}
                          className="w-full h-8 text-xs font-semibold rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 cursor-pointer active:scale-95 transition-all shadow-2xs"
                        >
                          Reset Matrix Filters
                        </Button>
                      </div>
                    </div>
                  </Reorder.Item>
                );
              }

              return null;
            })}
          </Reorder.Group>

              {/* 3. Navigation Toolbar for Matrix */}
              <div className="border-t border-border dark:border-border p-5 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 bg-gray-50/40 dark:bg-zinc-900/30">
                {/* Left: Status Filter Tabs */}
                <div className="flex items-center gap-6 shrink-0 select-none overflow-x-auto">
                  <button
                    type="button"
                    onClick={() => {
                      setMatrixStatusFilter("all");
                      setMatrixPage(1);
                    }}
                    className={cn(
                      "relative h-9 flex items-center text-[13px] font-semibold transition-colors focus:outline-none cursor-pointer border-0 bg-transparent whitespace-nowrap",
                      matrixStatusFilter === "all"
                        ? "text-gray-900 dark:text-zinc-50 after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-full after:bg-gray-900 dark:after:bg-white"
                        : "text-gray-500 font-medium hover:text-gray-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                    )}
                  >
                    All Students
                    <span
                      className={cn(
                        "ml-1.5 text-xs",
                        matrixStatusFilter === "all"
                          ? "text-gray-900 dark:text-zinc-100 font-semibold"
                          : "text-gray-400 dark:text-zinc-500 font-normal"
                      )}
                    >
                      ({kpiStats.totalStudents})
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setMatrixStatusFilter("incomplete");
                      setMatrixPage(1);
                    }}
                    className={cn(
                      "relative h-9 flex items-center text-[13px] font-semibold transition-colors focus:outline-none cursor-pointer border-0 bg-transparent whitespace-nowrap",
                      matrixStatusFilter === "incomplete"
                        ? "text-gray-900 dark:text-zinc-50 after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-full after:bg-gray-900 dark:after:bg-white"
                        : "text-gray-500 font-medium hover:text-gray-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                    )}
                  >
                    Incomplete / Missing
                    <span
                      className={cn(
                        "ml-1.5 text-xs",
                        matrixStatusFilter === "incomplete"
                          ? "text-gray-900 dark:text-zinc-100 font-semibold"
                          : "text-gray-400 dark:text-zinc-500 font-normal"
                      )}
                    >
                      ({kpiStats.incomplete})
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setMatrixStatusFilter("compliant");
                      setMatrixPage(1);
                    }}
                    className={cn(
                      "relative h-9 flex items-center text-[13px] font-semibold transition-colors focus:outline-none cursor-pointer border-0 bg-transparent whitespace-nowrap",
                      matrixStatusFilter === "compliant"
                        ? "text-gray-900 dark:text-zinc-50 after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-full after:bg-gray-900 dark:after:bg-white"
                        : "text-gray-500 font-medium hover:text-gray-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                    )}
                  >
                    Fully Compliant
                    <span
                      className={cn(
                        "ml-1.5 text-xs",
                        matrixStatusFilter === "compliant"
                          ? "text-gray-900 dark:text-zinc-100 font-semibold"
                          : "text-gray-400 dark:text-zinc-500 font-normal"
                      )}
                    >
                      ({kpiStats.fullyCompliant})
                    </span>
                  </button>
                </div>

                {/* Right: Search & MultiCriteriaFilter */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
                  <div className="w-full sm:w-[260px] lg:w-[300px] relative group shrink-0">
                    <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                      <HugeIcon className="ph-bold ph-magnifying-glass text-gray-400 dark:text-zinc-500 transition-colors group-focus-within:text-pup-maroon dark:group-focus-within:text-red-400 text-sm" />
                    </div>
                    <Input
                      value={matrixSearch}
                      onChange={(e) => {
                        setMatrixSearch(e.target.value);
                        setMatrixPage(1);
                      }}
                      placeholder="Search student no., name, or section..."
                      className="h-9 w-full rounded-xl border border-border dark:border-border bg-white dark:bg-zinc-800 pl-8 pr-16 text-xs font-normal text-gray-900 dark:text-zinc-100 placeholder:text-gray-400 dark:placeholder:text-zinc-500 shadow-none focus-visible:outline-none focus-visible:border-pup-maroon focus-visible:ring-1 focus-visible:ring-pup-maroon dark:focus-visible:border-red-500/80 dark:focus-visible:ring-red-500/80"
                    />
                    <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-[11px] font-mono text-gray-400 dark:text-zinc-500">
                      {filteredMatrixRecords.length > 0
                        ? filteredMatrixRecords.length.toLocaleString()
                        : "0"}
                    </div>
                  </div>

                  <MultiCriteriaFilter
                    title="Filter Matrix"
                    groups={matrixFilterGroups}
                    selectedValues={matrixFilterValues}
                    onChange={handleMatrixFilterChange}
                    onClearAll={handleClearMatrixFilters}
                    totalCount={matrixRecords.length}
                    filteredCount={filteredMatrixRecords.length}
                  />
                </div>
              </div>

              {/* 4. Active Chips & Horizontal Scroll Controls for Matrix */}
              <div className="border-t border-border dark:border-border px-6 py-2.5 flex items-center justify-between gap-4 bg-white dark:bg-card">
                <div className="flex-1 min-w-0">
                  <ActiveFilterChips
                    chips={matrixChips}
                    onClearAll={handleClearMatrixFilters}
                    className="p-0 border-0"
                  />
                </div>
                <div className="flex items-center gap-2 shrink-0 select-none">
                  <div className="hidden sm:flex items-center gap-1.5 text-[11px] font-medium text-gray-400 dark:text-zinc-500 mr-1">
                    <HugeIcon className="ph-bold ph-arrows-left-right text-xs text-pup-maroon dark:text-red-400" />
                    <span>Scroll columns:</span>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={resetMatrixScroll}
                    disabled={!isScrolledX}
                    className="h-8 px-2.5 gap-1.5 text-xs font-semibold rounded-xl border border-border bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-2xs cursor-pointer active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                    title="Reset horizontal scroll to default"
                  >
                    <HugeIcon className="ph-bold ph-arrow-counter-clockwise text-xs" />
                    <span>Reset Scroll</span>
                  </Button>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => scrollMatrixTable("left")}
                        className="w-8 h-8 rounded-xl border border-border bg-white dark:bg-zinc-800 text-gray-600 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-2xs cursor-pointer active:scale-95"
                        aria-label="Scroll table left"
                      >
                        <HugeIcon className="ph-bold ph-caret-left text-xs" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Scroll Left</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => scrollMatrixTable("right")}
                        className="w-8 h-8 rounded-xl border border-border bg-white dark:bg-zinc-800 text-gray-600 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-2xs cursor-pointer active:scale-95"
                        aria-label="Scroll table right"
                      >
                        <HugeIcon className="ph-bold ph-caret-right text-xs" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Scroll Right</TooltipContent>
                  </Tooltip>
                </div>
              </div>

              {/* 5. Matrix Table Content */}
              <div className="flex flex-col flex-[1_0_auto] w-full border-t border-border dark:border-border">
                {docsLoading ? (
                  <DocumentsMatrixSkeleton rowCount={7} embedded={true} />
                ) : docsError ? (
                  <div className="p-8 rounded-b-2xl flex-1 flex flex-col items-center justify-center">
                    <Empty className="h-full min-h-0 flex flex-col items-center justify-center text-center text-gray-500 border-0 dark:text-zinc-400">
                      <EmptyHeader className="flex flex-col items-center gap-0">
                        <EmptyMedia className="w-16 h-16 rounded-2xl bg-white border border-border flex items-center justify-center mb-4 shadow-sm dark:bg-card dark:border-border dark:shadow-none">
                          <HugeIcon className="ph-duotone ph-warning-circle text-2xl text-pup-maroon dark:text-primary" />
                        </EmptyMedia>
                        <EmptyTitle className="text-lg font-semibold text-gray-900 dark:text-zinc-50">
                          Could Not Load Compliance Matrix
                        </EmptyTitle>
                        <EmptyDescription className="text-xs font-normal text-gray-500 mt-1 max-w-md dark:text-zinc-400">
                          {docsError}
                        </EmptyDescription>
                      </EmptyHeader>
                    </Empty>
                  </div>
                ) : filteredMatrixRecords.length === 0 ? (
                  <div className="py-16 rounded-b-2xl flex-1 flex flex-col items-center justify-center min-h-[460px] w-full">
                    <Empty className="flex flex-1 h-full min-h-[380px] flex-col items-center justify-center border-0 bg-transparent text-center">
                      <EmptyHeader className="flex flex-col items-center gap-0">
                        <div className="relative mb-5">
                          <div className="absolute inset-0 scale-150 animate-pulse rounded-full bg-gray-50 opacity-50 dark:bg-card"></div>
                          <EmptyMedia className="relative z-10 flex h-24 w-24 items-center justify-center rounded-3xl border border-border bg-white shadow-xl dark:border-border dark:bg-card dark:shadow-none">
                            <HugeIcon className="ph-duotone ph-magnifying-glass text-3xl text-gray-400 dark:text-zinc-500" />
                          </EmptyMedia>
                        </div>
                        <EmptyTitle className="text-xl font-semibold text-gray-900 dark:text-zinc-50">
                          No Matching Students
                        </EmptyTitle>
                        <EmptyDescription className="max-w-xs text-sm font-medium text-gray-900 dark:text-zinc-300 mt-1">
                          We could not find any student records matching your selected matrix filters.
                        </EmptyDescription>
                      </EmptyHeader>
                      <EmptyContent>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleClearMatrixFilters}
                          title="Reset Filters"
                          className="mt-6 flex h-10 items-center justify-center rounded-xl border border-border dark:border-border bg-white dark:bg-zinc-800 px-5 text-xs font-semibold text-gray-700 dark:text-zinc-200 shadow-xs transition-all hover:bg-gray-50 dark:hover:bg-zinc-700 active:scale-95 cursor-pointer"
                        >
                          Reset Filters
                        </Button>
                      </EmptyContent>
                    </Empty>
                  </div>
                ) : (
                  <div
                    ref={matrixTableContainerRef}
                    className="w-full flex-[1_0_auto] overflow-x-auto show-scrollbar pb-2 motion-safe:animate-in motion-safe:fade-in-50 duration-200 ease-out"
                  >
                    <table className="w-full text-sm border-collapse min-w-max">
                      <thead className="sticky top-0 z-10 border-b border-border bg-gray-50/90 dark:bg-zinc-900/90 backdrop-blur-xs select-none">
                        <tr className="text-left text-[11px] font-semibold tracking-wider text-gray-500 dark:text-zinc-400 uppercase">
                          {/* Sticky Column: Student No */}
                          <th className="p-4 pl-6 sticky left-0 z-30 bg-gray-50 dark:bg-zinc-900 border-r border-border/70 w-[180px] min-w-[180px] max-w-[180px]">
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

                          {/* Sticky Column: Student Name */}
                          <th className="p-4 sticky left-[180px] z-30 bg-gray-50 dark:bg-zinc-900 border-r border-border/70 shadow-[4px_0_12px_-2px_rgba(0,0,0,0.06)] dark:shadow-[4px_0_12px_-2px_rgba(0,0,0,0.4)] w-[240px] min-w-[240px] max-w-[240px]">
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
                                      <HugeIcon className="ph-bold ph-arrow-counter-clockwise text-xs" />
                                    </button>
                                  </TooltipTrigger>
                                  <TooltipContent side="bottom">Reset Scroll to Start</TooltipContent>
                                </Tooltip>
                              )}
                            </div>
                          </th>

                          {/* Program & Section */}
                          <th className="p-4 w-[160px] min-w-[160px] border-r border-border/80 dark:border-border">
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

                          {/* Progress */}
                          <th className="p-4 w-[210px] min-w-[210px] border-r border-border/80 dark:border-border">
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

                          {/* Dynamic Requirement Columns */}
                          {complianceDocTypes.map((docType) => (
                            <th
                              key={docType}
                              className="p-4 text-center w-[185px] min-w-[185px] border-r border-border/40 select-none"
                              title={docType}
                            >
                              <div className="truncate max-w-[165px] mx-auto text-xs font-semibold normal-case text-gray-700 dark:text-zinc-200">
                                {docType}
                              </div>
                            </th>
                          ))}
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-border dark:divide-border bg-white dark:bg-card">
                        {paginatedMatrixRecords.map((item) => (
                          <tr
                            key={item.student.studentNo}
                            className="hover:bg-gray-50/70 dark:hover:bg-zinc-800/40 transition-colors group"
                          >
                            {/* Sticky Student No */}
                            <td className="p-4 pl-6 sticky left-0 z-20 bg-white dark:bg-card group-hover:bg-gray-50 dark:group-hover:bg-zinc-800/90 border-r border-border/70 font-mono text-xs text-gray-900 dark:text-zinc-100 font-semibold w-[180px] min-w-[180px] max-w-[180px] whitespace-nowrap">
                              {item.student.studentNo}
                            </td>

                            {/* Sticky Full Name */}
                            <td
                              className="p-4 sticky left-[180px] z-20 bg-white dark:bg-card group-hover:bg-gray-50 dark:group-hover:bg-zinc-800/90 border-r border-border/70 shadow-[4px_0_12px_-2px_rgba(0,0,0,0.06)] dark:shadow-[4px_0_12px_-2px_rgba(0,0,0,0.4)] text-[13px] font-semibold text-gray-900 dark:text-zinc-100 truncate w-[240px] min-w-[240px] max-w-[240px]"
                              title={item.student.name}
                            >
                              {formatTitleCase(item.student.name)}
                            </td>

                            {/* Program & Section */}
                            <td className="p-4 text-xs text-gray-600 dark:text-zinc-400 whitespace-nowrap w-[160px] min-w-[160px] border-r border-border/80 dark:border-border">
                              <span className="font-semibold text-gray-900 dark:text-zinc-100">
                                {item.student.courseCode}
                              </span>{" "}
                              <span className="text-gray-500 dark:text-zinc-400">
                                {item.student.section}
                              </span>
                            </td>

                            {/* Progress */}
                            <td className="p-4 whitespace-nowrap w-[210px] min-w-[210px] border-r border-border/80 dark:border-border">
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

                            {/* Dynamic Requirement Cells */}
                            {item.requirements.map((req) => (
                              <td
                                key={req.docType}
                                className="p-3.5 text-center border-r border-border/40 align-middle w-[185px] min-w-[185px]"
                              >
                                {req.status === "verified" ? (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <button
                                        type="button"
                                        onClick={() => handleMatrixCellClick(item.student, req)}
                                        className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/80 hover:bg-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800/80 dark:hover:bg-emerald-950/60 text-xs font-semibold transition-all active:scale-95 cursor-pointer shadow-2xs"
                                      >
                                        <HugeIcon className="ph-fill ph-check-circle text-xs text-emerald-600 dark:text-emerald-400" />
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
                                        className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200/80 hover:bg-amber-100 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800/80 dark:hover:bg-amber-950/60 text-xs font-semibold transition-all active:scale-95 cursor-pointer shadow-2xs"
                                      >
                                        <HugeIcon className="ph-fill ph-clock text-xs text-amber-600 dark:text-amber-400" />
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
                                        onClick={() => onRescan?.(item.student.studentNo, req.docType)}
                                        className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-full bg-rose-50/80 text-rose-700 border border-rose-200/80 hover:bg-rose-100 hover:border-rose-300 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-800/80 dark:hover:bg-rose-950/60 text-xs font-semibold transition-all active:scale-95 cursor-pointer shadow-2xs"
                                      >
                                        <HugeIcon className="ph-bold ph-scan text-xs text-rose-600 dark:text-rose-400" />
                                        <span>Missing</span>
                                      </button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p className="font-semibold text-rose-300">
                                        Missing Requirement
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
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Matrix Pagination */}
                {filteredMatrixRecords.length > 0 && (
                  <div className="flex items-center justify-between border-t border-border bg-white p-4 px-6 dark:border-border dark:bg-card mt-auto select-none rounded-b-2xl">
                    <div className="flex items-center gap-6 text-xs text-gray-900 dark:text-zinc-300">
                      <span>
                        Showing {paginatedMatrixRecords.length} of{" "}
                        {filteredMatrixRecords.length.toLocaleString()}
                      </span>
                      <div className="flex items-center gap-2">
                        <span>Rows:</span>
                        <div className="flex items-center gap-1">
                          {[10, 20, 50, 100].map((size) => (
                            <button
                              key={size}
                              type="button"
                              onClick={() => {
                                setMatrixItemsPerPage(size);
                                setMatrixPage(1);
                              }}
                              className={cn(
                                "px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer",
                                matrixItemsPerPage === size
                                  ? "bg-gray-100 dark:bg-zinc-800 text-gray-900 dark:text-zinc-100"
                                  : "text-gray-400 hover:text-gray-600 dark:hover:text-zinc-200"
                              )}
                            >
                              {size}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={currentMatrixPage <= 1}
                        onClick={() => {
                          setMatrixPage((p) => Math.max(1, p - 1));
                        }}
                        className="text-xs text-gray-900 dark:text-zinc-300 disabled:opacity-40 cursor-pointer rounded-xl h-8 px-3"
                      >
                        Prev
                      </Button>

                      <div className="h-8 w-8 rounded-xl border border-[#e5e5ea] dark:border-border flex items-center justify-center text-xs font-bold text-gray-800 dark:text-zinc-200 bg-white dark:bg-zinc-900">
                        {currentMatrixPage}
                      </div>

                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={currentMatrixPage >= totalMatrixPages}
                        onClick={() => {
                          setMatrixPage((p) => Math.min(totalMatrixPages, p + 1));
                        }}
                        className="text-xs text-gray-900 dark:text-zinc-300 disabled:opacity-40 cursor-pointer rounded-xl h-8 px-3"
                      >
                        Next
                      </Button>
                    </div>
                  </div>
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
          <DialogContent className="flex h-[90vh] w-[96vw] max-w-[96vw] flex-col overflow-hidden border border-border bg-gray-100 p-0 shadow-2xl transition-all duration-300 xl:max-w-[1400px] rounded-2xl dark:border-border dark:bg-muted gap-0">
            <DialogHeader className="shrink-0 border-b border-border bg-white p-6 pb-4 dark:border-border dark:bg-card text-left">
              <div className="flex items-start gap-4">
                <div className="min-w-0 pr-10">
                  <DialogTitle className="text-[16px] font-semibold tracking-[-0.01em] text-gray-900 dark:text-zinc-50">
                    Document View: {selectedDoc?.doc_type || "Loading..."}
                  </DialogTitle>
                  <DialogDescription className="mt-1 text-[13px] font-normal text-gray-900 dark:text-zinc-300">
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
                      <HugeIcon className="ph-bold ph-x text-lg" />
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
                    <div className="flex flex-col items-center gap-4 text-gray-400">
                      <HugeIcon className="ph-duotone ph-file-dashed text-xl" />
                      <p className="text-sm font-medium">No document file available.</p>
                    </div>
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
                      <p className="text-base font-semibold text-gray-900 dark:text-zinc-50 font-mono">
                        {selectedDoc?.student_no}
                      </p>
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold tracking-widest text-gray-400">
                        Document Category
                      </label>
                      <div className="mt-1.5">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-pup-maroon/20 bg-pup-maroon/10 text-[10px] font-semibold tracking-wider text-pup-maroon dark:border-red-400/20 dark:bg-red-400/10 dark:text-red-400">
                          <HugeIcon className="ph-bold ph-file text-[11px]" />
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
                            <div className="flex w-fit items-center gap-1.5 rounded-full border px-3 py-1.5 text-[10px] font-semibold tracking-wider shadow-xs bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:text-amber-500/90 dark:border-amber-900/50">
                              <HugeIcon className="ph-fill ph-warning-circle text-[11px]" />
                              Unverified
                            </div>
                          ) : (
                            <div className="flex w-fit items-center gap-1.5 rounded-full border px-3 py-1.5 text-[10px] font-semibold tracking-wider shadow-xs bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-500/90 dark:border-emerald-900/50">
                              <HugeIcon className="ph-fill ph-check-circle text-[11px]" />
                              Uploaded
                            </div>
                          )
                        ) : (
                          <div className="flex w-fit items-center gap-1.5 rounded-full border px-3 py-1.5 text-[10px] font-semibold tracking-wider shadow-xs bg-red-50 text-red-700 border-red-200 dark:bg-red-950/20 dark:text-red-500/90 dark:border-red-900/50">
                            <HugeIcon className="ph-fill ph-x-circle text-[11px]" />
                            Missing
                          </div>
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

            <div className="flex shrink-0 justify-between items-center gap-3 border-t border-border bg-white p-4 dark:border-border dark:bg-card">
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
                      <HugeIcon
                        className={cn(
                          "ph-bold text-xl",
                          isFullscreen ? "ph-corners-in" : "ph-corners-out"
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
                    <a
                      href={selectedDoc.doc.file_url || `/api/documents/${selectedDoc.doc.id}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex h-10 items-center rounded-xl border border-border dark:border-border bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 px-4 text-xs font-semibold shadow-xs cursor-pointer active:scale-95 transition-all"
                    >
                      Open
                    </a>
                  )}
              </div>

              <div className="flex items-center gap-2.5">
                <Button
                  variant="outline"
                  onClick={() => setDetailModalOpen(false)}
                  className="h-10 px-4 text-xs font-semibold rounded-xl border border-border dark:border-border bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-xs cursor-pointer active:scale-95 transition-all"
                >
                  Close
                </Button>

                <Button
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
                  className="h-10 px-5 text-xs font-semibold rounded-xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-900 shadow-xs cursor-pointer active:scale-95 transition-all disabled:opacity-50"
                >
                  Update Document
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}
