"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Reorder } from "framer-motion";
import HugeIcon from "@/components/shared/HugeIcon";
import PageHeader from "@/components/shared/PageHeader";
import { RefreshButton } from "@/components/shared/RefreshButton";
import PDFPreviewModal from "@/components/shared/PDFPreviewModal";
import ActiveFilterChips from "@/components/shared/ActiveFilterChips";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import MultiCriteriaFilter from "@/components/shared/MultiCriteriaFilter";
import KpiStatCardsSkeleton from "@/components/systemadmin/skeletons/KpiStatCardsSkeleton";
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
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyMedia,
} from "@/components/ui/empty";
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { generateOrganizationCompliancePdf } from "@/lib/pdfGenerator";
import { downloadOrganizationComplianceCsv, generateExportFilename } from "@/lib/exportHelpers";
import { cn } from "@/lib/utils";

const CATEGORIES = ["All", "Academic", "Non-Academic"];

function getOfficerRoleStyle(position = "") {
  const pos = position.toLowerCase();
  if (pos.includes("president") && !pos.includes("vice")) {
    return {
      gradient: "from-[#800000] via-[#991b1b] to-[#b91c1c] text-white",
      ring: "ring-red-500/30 dark:ring-red-400/30",
      badge: "bg-red-50 text-pup-maroon border-red-200 dark:bg-red-950/50 dark:text-red-300 dark:border-red-900/50",
      icon: "ph-fill ph-crown",
    };
  }
  if (pos.includes("vice")) {
    return {
      gradient: "from-indigo-800 via-indigo-600 to-blue-600 text-white",
      ring: "ring-indigo-500/30 dark:ring-indigo-400/30",
      badge: "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/50 dark:text-indigo-300 dark:border-indigo-900/50",
      icon: "ph-bold ph-shield-check",
    };
  }
  if (pos.includes("secretary")) {
    return {
      gradient: "from-emerald-800 via-emerald-600 to-teal-600 text-white",
      ring: "ring-emerald-500/30 dark:ring-emerald-400/30",
      badge: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-900/50",
      icon: "ph-bold ph-notepad",
    };
  }
  if (pos.includes("treasurer") || pos.includes("finance")) {
    return {
      gradient: "from-amber-700 via-amber-600 to-yellow-600 text-white",
      ring: "ring-amber-500/30 dark:ring-amber-400/30",
      badge: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-900/50",
      icon: "ph-bold ph-coins",
    };
  }
  if (pos.includes("auditor")) {
    return {
      gradient: "from-purple-800 via-purple-600 to-violet-600 text-white",
      ring: "ring-purple-500/30 dark:ring-purple-400/30",
      badge: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/50 dark:text-purple-300 dark:border-purple-900/50",
      icon: "ph-bold ph-scales",
    };
  }
  return {
    gradient: "from-slate-700 via-slate-600 to-zinc-700 text-white",
    ring: "ring-gray-300/30 dark:ring-white/10",
    badge: "bg-gray-100 text-gray-700 border-gray-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700",
    icon: "ph-bold ph-user-check",
  };
}

function getInitials(name = "") {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "SO";
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

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

export default function OSASOrganizationComplianceView({
  showToast,
  onLogAction,
  officeId = "osas",
}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [manualLoading, setManualLoading] = useState(false);
  const [error, setError] = useState("");

  // Filters
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [complianceFilters, setComplianceFilters] = useState([]);
  const [standingFilters, setStandingFilters] = useState([]);
  const [cblFilters, setCblFilters] = useState([]);
  const [officerFilters, setOfficerFilters] = useState([]);

  // Sorting
  const [sortBy, setSortBy] = useState("complianceScore");
  const [sortOrder, setSortOrder] = useState("desc");

  // Draggable KPI Stat Cards
  const [kpiOrder, setKpiOrder] = useState(["accreditation", "organizations", "cbl"]);
  const [selectedKpi, setSelectedKpi] = useState(null);
  const statCardsRef = useRef(null);

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Click outside to close selected KPI popover
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

  // Modals
  const [selectedOrgForOfficers, setSelectedOrgForOfficers] = useState(null);
  const [officerSearch, setOfficerSearch] = useState("");
  const [previewCbl, setPreviewCbl] = useState(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [pdfBlobUrl, setPdfBlobUrl] = useState(null);
  const [previewFrameReady, setPreviewFrameReady] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isExportingCsv, setIsExportingCsv] = useState(false);
  const [isFullscreenPreview, setIsFullscreenPreview] = useState(false);

  // Load Data
  const load = useCallback(
    async (isManual = false) => {
      if (isManual) setManualLoading(true);
      setLoading(true);
      setError("");
      try {
        const [res] = await Promise.all([
          fetch(`/api/analytics/digitization-compliance?officeId=osas&status=All`, { cache: "no-store" }),
          isManual ? new Promise((resolve) => setTimeout(resolve, 600)) : Promise.resolve(),
        ]);

        const json = await res.json().catch(() => null);
        if (!res.ok || !json?.ok) {
          throw new Error(json?.error || "Failed to load organization compliance data");
        }
        setData(json.data);
      } catch (err) {
        setData(null);
        setError(err.message || "Load failed");
        showToast?.(
          {
            title: "Compliance Load Failed",
            description: err.message || "Unable to retrieve student organization compliance statistics.",
          },
          true
        );
      } finally {
        setLoading(false);
        setManualLoading(false);
      }
    },
    [showToast]
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      load();
    }, 0);
    return () => clearTimeout(timer);
  }, [load]);

  const summary = data?.summary || {};
  const meta = data?.meta || {};
  const byCategory = useMemo(() => (Array.isArray(data?.byCategory) ? data.byCategory : []), [data]);
  const organizations = useMemo(() => (Array.isArray(data?.organizations) ? data.organizations : []), [data]);

  // Dynamic counts for MultiCriteriaFilter badges
  const counts = useMemo(() => {
    const c = {
      // Compliance
      Compliant: 0,
      "Partially Compliant": 0,
      "Action Required": 0,
      // Standing
      Active: 0,
      Probationary: 0,
      Inactive: 0,
      Archived: 0,
      // CBL
      cblArchived: 0,
      cblPending: 0,
      // Officers
      officersPresent: 0,
      officersEmpty: 0,
    };
    organizations.forEach((org) => {
      const compStatus = org.complianceStatus || org.compliance_status;
      if (c[compStatus] !== undefined) c[compStatus] += 1;
      if (c[org.status] !== undefined) c[org.status] += 1;

      const hasCbl = Boolean(org.hasCbl ?? org.checklist?.cbl ?? org.checklist?.has_cbl);
      if (hasCbl) c.cblArchived += 1; else c.cblPending += 1;

      const hasOfficers = Boolean((org.activeOfficerCount > 0) || org.checklist?.officers || org.checklist?.has_officers);
      if (hasOfficers) c.officersPresent += 1; else c.officersEmpty += 1;
    });
    return c;
  }, [organizations]);

  // Unified MultiCriteriaFilter groups
  const filterGroups = useMemo(
    () => [
      {
        id: "compliance",
        label: "Compliance Status",
        options: [
          { value: "Compliant", label: "Compliant (100%)", indicatorColor: "bg-emerald-500", count: counts.Compliant },
          { value: "Partially Compliant", label: "Partially Compliant (50-75%)", indicatorColor: "bg-amber-500", count: counts["Partially Compliant"] },
          { value: "Action Required", label: "Action Required (<50%)", indicatorColor: "bg-rose-500", count: counts["Action Required"] },
        ],
      },
      {
        id: "standing",
        label: "Organization Standing",
        options: [
          { value: "Active", label: "Active", indicatorColor: "bg-emerald-500", count: counts.Active },
          { value: "Probationary", label: "Probationary", indicatorColor: "bg-amber-500", count: counts.Probationary },
          { value: "Inactive", label: "Inactive", indicatorColor: "bg-zinc-400", count: counts.Inactive },
          { value: "Archived", label: "Archived", indicatorColor: "bg-gray-400", count: counts.Archived },
        ],
      },
      {
        id: "cbl",
        label: "Constitution & By-Laws (CBL)",
        options: [
          { value: "archived", label: "CBL Archived", indicatorColor: "bg-emerald-500", count: counts.cblArchived },
          { value: "pending", label: "CBL Pending", indicatorColor: "bg-amber-500", count: counts.cblPending },
        ],
      },
      {
        id: "officers",
        label: "Officer Whitelist",
        options: [
          { value: "roster", label: "Officers Whitelisted", indicatorColor: "bg-blue-500", count: counts.officersPresent },
          { value: "empty", label: "No Officers Recorded", indicatorColor: "bg-rose-500", count: counts.officersEmpty },
        ],
      },
    ],
    [counts]
  );

  const filterValues = useMemo(
    () => ({
      compliance: complianceFilters,
      standing: standingFilters,
      cbl: cblFilters,
      officers: officerFilters,
    }),
    [complianceFilters, standingFilters, cblFilters, officerFilters]
  );

  const handleFilterChange = useCallback((groupId, values) => {
    if (groupId === "compliance") setComplianceFilters(values);
    else if (groupId === "standing") setStandingFilters(values);
    else if (groupId === "cbl") setCblFilters(values);
    else if (groupId === "officers") setOfficerFilters(values);
    setPage(1);
  }, []);

  const handleResetFilters = useCallback(() => {
    setSearch("");
    setCategoryFilter("All");
    setComplianceFilters([]);
    setStandingFilters([]);
    setCblFilters([]);
    setOfficerFilters([]);
    setPage(1);
  }, []);

  // Filter Organizations
  const filteredOrganizations = useMemo(() => {
    return organizations.filter((org) => {
      // 1. Search filter
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const matchName = (org.name || "").toLowerCase().includes(q);
        const matchAcronym = (org.acronym || "").toLowerCase().includes(q);
        const matchAdviser = (org.adviserName || org.adviser_name || "").toLowerCase().includes(q);
        const matchAdviserEmail = (org.adviserEmail || org.adviser_email || "").toLowerCase().includes(q);
        if (!matchName && !matchAcronym && !matchAdviser && !matchAdviserEmail) return false;
      }

      // 2. Category filter
      if (categoryFilter !== "All") {
        if ((org.category || "").toLowerCase() !== categoryFilter.toLowerCase()) {
          return false;
        }
      }

      // 3. Compliance status filter
      if (complianceFilters.length > 0) {
        const compStatus = org.complianceStatus || org.compliance_status;
        if (!complianceFilters.includes(compStatus)) return false;
      }

      // 4. Standing filter
      if (standingFilters.length > 0) {
        if (!standingFilters.includes(org.status)) return false;
      } else {
        // By default, exclude archived orgs unless Archived is explicitly selected
        if (org.status === "Archived") return false;
      }

      // 5. CBL filter
      if (cblFilters.length > 0) {
        const hasCbl = Boolean(org.hasCbl ?? org.checklist?.cbl ?? org.checklist?.has_cbl);
        if (cblFilters.includes("archived") && !cblFilters.includes("pending") && !hasCbl) return false;
        if (cblFilters.includes("pending") && !cblFilters.includes("archived") && hasCbl) return false;
      }

      // 6. Officers filter
      if (officerFilters.length > 0) {
        const hasOfficers = Boolean((org.activeOfficerCount > 0) || org.checklist?.officers || org.checklist?.has_officers);
        if (officerFilters.includes("roster") && !officerFilters.includes("empty") && !hasOfficers) return false;
        if (officerFilters.includes("empty") && !officerFilters.includes("roster") && hasOfficers) return false;
      }

      return true;
    });
  }, [
    organizations,
    search,
    categoryFilter,
    complianceFilters,
    standingFilters,
    cblFilters,
    officerFilters,
  ]);

  // Active Filter Detection
  const isFiltered = useMemo(() => {
    return (
      Boolean(search.trim()) ||
      categoryFilter !== "All" ||
      complianceFilters.length > 0 ||
      standingFilters.length > 0 ||
      cblFilters.length > 0 ||
      officerFilters.length > 0
    );
  }, [search, categoryFilter, complianceFilters, standingFilters, cblFilters, officerFilters]);

  // Dynamic KPIs derived from filteredOrganizations (with division-by-zero guards)
  const filteredSummary = useMemo(() => {
    const total = filteredOrganizations.length;
    if (total === 0) {
      return {
        totalOrganizations: 0,
        overallComplianceRate: 0,
        fullyCompliantCount: 0,
        fullyCompliantRate: 0,
        partiallyCompliantCount: 0,
        actionRequiredCount: 0,
        cblArchivedCount: 0,
        cblArchivedRate: 0,
        cblPendingCount: 0,
        withOfficersCount: 0,
        withOfficersRate: 0,
        totalActiveOfficers: 0,
        withAdvisersCount: 0,
        withAdviserRate: 0,
        academicCount: 0,
        nonAcademicCount: 0,
        statusDistribution: {
          Active: 0,
          Probationary: 0,
          Inactive: 0,
          Archived: 0,
        },
        categoryBreakdown: [],
      };
    }

    let fullyCompliantCount = 0;
    let partiallyCompliantCount = 0;
    let actionRequiredCount = 0;
    let cblArchivedCount = 0;
    let withOfficersCount = 0;
    let totalActiveOfficers = 0;
    let withAdvisersCount = 0;
    let academicCount = 0;
    let nonAcademicCount = 0;
    const statusDistribution = {
      Active: 0,
      Probationary: 0,
      Inactive: 0,
      Archived: 0,
    };
    const catMap = {};

    filteredOrganizations.forEach((org) => {
      const compStatus = org.complianceStatus || org.compliance_status;
      if (compStatus === "Compliant") fullyCompliantCount += 1;
      else if (compStatus === "Partially Compliant") partiallyCompliantCount += 1;
      else actionRequiredCount += 1;

      const st = org.status || "Active";
      if (statusDistribution[st] !== undefined) statusDistribution[st] += 1;
      else statusDistribution[st] = 1;

      const hasCbl = Boolean(org.hasCbl ?? org.checklist?.cbl ?? org.checklist?.has_cbl);
      if (hasCbl) cblArchivedCount += 1;

      const hasOfficers = Boolean(
        (org.activeOfficerCount > 0) || org.checklist?.officers || org.checklist?.has_officers
      );
      if (hasOfficers) withOfficersCount += 1;
      totalActiveOfficers += Number(org.activeOfficerCount || 0);

      const hasAdviser = Boolean(
        (org.adviserName || org.adviser_name) &&
        (org.adviserEmail || org.adviser_email)
      );
      if (hasAdviser) withAdvisersCount += 1;

      const cat = (org.category || "Uncategorized").trim();
      if (cat.toLowerCase() === "academic") academicCount += 1;
      else nonAcademicCount += 1;

      if (!catMap[cat]) {
        catMap[cat] = { category: cat, totalOrgs: 0, compliantCount: 0 };
      }
      catMap[cat].totalOrgs += 1;
      if (compStatus === "Compliant") {
        catMap[cat].compliantCount += 1;
      }
    });

    const categoryBreakdown = Object.values(catMap).map((c) => ({
      category: c.category,
      totalOrgs: c.totalOrgs,
      compliantCount: c.compliantCount,
      complianceRate: c.totalOrgs > 0 ? Math.round((c.compliantCount / c.totalOrgs) * 100) : 0,
      totalOrganizations: c.totalOrgs,
    }));

    return {
      totalOrganizations: total,
      overallComplianceRate: Math.round((fullyCompliantCount / total) * 100),
      fullyCompliantCount,
      fullyCompliantRate: Math.round((fullyCompliantCount / total) * 100),
      partiallyCompliantCount,
      actionRequiredCount,
      cblArchivedCount,
      cblArchivedRate: Math.round((cblArchivedCount / total) * 100),
      cblPendingCount: total - cblArchivedCount,
      withOfficersCount,
      withOfficersRate: Math.round((withOfficersCount / total) * 100),
      totalActiveOfficers,
      withAdvisersCount,
      withAdviserRate: Math.round((withAdvisersCount / total) * 100),
      academicCount,
      nonAcademicCount,
      statusDistribution,
      categoryBreakdown,
    };
  }, [filteredOrganizations]);

  // Sort Organizations
  const sortedOrganizations = useMemo(() => {
    return [...filteredOrganizations].sort((a, b) => {
      let valA = a[sortBy];
      let valB = b[sortBy];

      if (typeof valA === "boolean") valA = valA ? 1 : 0;
      if (typeof valB === "boolean") valB = valB ? 1 : 0;

      if (typeof valA === "string") valA = valA.toLowerCase();
      if (typeof valB === "string") valB = valB.toLowerCase();

      if (valA < valB) return sortOrder === "asc" ? -1 : 1;
      if (valA > valB) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });
  }, [filteredOrganizations, sortBy, sortOrder]);

  // Total pages and paginated organizations
  const totalPages = Math.max(1, Math.ceil(sortedOrganizations.length / pageSize));
  const paginatedOrganizations = useMemo(() => {
    const startIndex = (page - 1) * pageSize;
    return sortedOrganizations.slice(startIndex, startIndex + pageSize);
  }, [sortedOrganizations, page, pageSize]);

  const handleSort = (column) => {
    if (sortBy === column) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(column);
      setSortOrder("desc");
    }
    setPage(1);
  };

  // Active filter chips
  const activeChips = useMemo(() => {
    const chips = [];
    if (search.trim()) {
      chips.push({
        id: "search",
        label: `Search: "${search.trim()}"`,
        onRemove: () => { setSearch(""); setPage(1); },
      });
    }
    if (categoryFilter !== "All") {
      chips.push({
        id: "category",
        groupLabel: "Category",
        label: `${categoryFilter} Orgs`,
        onRemove: () => { setCategoryFilter("All"); setPage(1); },
      });
    }
    complianceFilters.forEach((cf) => {
      chips.push({
        id: `compliance-${cf}`,
        groupLabel: "Compliance",
        label: cf,
        onRemove: () => { setComplianceFilters((prev) => prev.filter((v) => v !== cf)); setPage(1); },
      });
    });
    standingFilters.forEach((sf) => {
      chips.push({
        id: `standing-${sf}`,
        groupLabel: "Standing",
        label: sf,
        onRemove: () => { setStandingFilters((prev) => prev.filter((v) => v !== sf)); setPage(1); },
      });
    });
    cblFilters.forEach((cbl) => {
      chips.push({
        id: `cbl-${cbl}`,
        groupLabel: "CBL",
        label: cbl === "archived" ? "CBL Archived" : "CBL Pending",
        onRemove: () => { setCblFilters((prev) => prev.filter((v) => v !== cbl)); setPage(1); },
      });
    });
    officerFilters.forEach((of) => {
      chips.push({
        id: `officers-${of}`,
        groupLabel: "Officers",
        label: of === "roster" ? "Officers Whitelisted" : "No Officers Recorded",
        onRemove: () => { setOfficerFilters((prev) => prev.filter((v) => v !== of)); setPage(1); },
      });
    });
    return chips;
  }, [search, categoryFilter, complianceFilters, standingFilters, cblFilters, officerFilters]);

  // PDF Generation
  const handleOpenPdfReport = async () => {
    try {
      setIsGeneratingPdf(true);
      setPreviewFrameReady(false);
      setReportOpen(true);

      const scopeNote = isFiltered
        ? `Filtered View (${filteredOrganizations.length} of ${organizations.length} Organizations)`
        : undefined;

      const blob = await generateOrganizationCompliancePdf(
        data,
        filteredSummary,
        meta,
        sortedOrganizations,
        filteredSummary.categoryBreakdown.length > 0 ? filteredSummary.categoryBreakdown : byCategory,
        { scopeNote }
      );
      const url = URL.createObjectURL(blob);
      setPdfBlobUrl(url);

      onLogAction?.({
        action: "Generate OSAS Compliance PDF",
        details: isFiltered
          ? `generated filtered compliance report PDF (${filteredOrganizations.length} orgs)`
          : "generated official student organization compliance report PDF",
        entityType: "Report",
      });
    } catch (err) {
      showToast?.({
        title: "Report Generation Failed",
        description: err.message || "Failed to generate compliance PDF report.",
      }, true);
      setReportOpen(false);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleDownloadPdf = () => {
    if (!pdfBlobUrl) return;
    const a = document.createElement("a");
    a.href = pdfBlobUrl;
    a.download = generateExportFilename("OSAS-COMPLIANCE", "REPORT", "pdf");
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // CSV Export
  const handleExportCsv = () => {
    try {
      setIsExportingCsv(true);
      const scopeNote = isFiltered
        ? `Filtered Dataset: ${filteredOrganizations.length} of ${organizations.length} Organizations`
        : undefined;

      downloadOrganizationComplianceCsv(data, onLogAction, undefined, {
        organizations: sortedOrganizations,
        summary: filteredSummary,
        scopeNote,
      });

      showToast?.({
        title: "CSV Export Complete",
        description: isFiltered
          ? `Filtered dataset (${filteredOrganizations.length} organizations) downloaded successfully.`
          : "Student organization compliance dataset downloaded successfully.",
      });
    } catch (err) {
      showToast?.({
        title: "CSV Export Failed",
        description: err.message,
      }, true);
    } finally {
      setIsExportingCsv(false);
    }
  };

  // Category counts derived from active filtered view
  const academicCount = filteredSummary.academicCount;
  const nonAcademicCount = filteredSummary.nonAcademicCount;

  return (
    <TooltipProvider delayDuration={200}>
      <div className="font-jakarta w-full flex flex-1 flex-col h-auto min-h-0 gap-6 focus:outline-none animate-fade-up">
        {/* Unified Single Card Container: Header, Stats, Toolbar, Table & Footer */}
        <Card className="flex h-auto w-full flex-col p-0 gap-0 overflow-visible rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-card dark:shadow-none isolate font-jakarta mb-4 min-h-0 flex-1">
          {/* 1. Page Header */}
          <PageHeader
            icon="ph-chart-bar"
            title="Student Organization Compliance"
            description="Accreditation standing, Constitution & By-Laws (CBL) archival, and officer leadership compliance."
            showBorder={false}
            className="p-6"
            titleClassName="text-[18px] font-semibold tracking-[-0.01em] text-gray-900 dark:text-zinc-50"
            descriptionClassName="text-[13px] font-normal text-gray-500 dark:text-zinc-400 mt-[4px]"
            actions={
              <div className="flex items-center gap-2">
                {/* Refresh Button */}
                <RefreshButton
                  onRefresh={() => load(true)}
                  isLoading={manualLoading}
                  title="Refresh Compliance"
                />

                {/* Separator */}
                <div className="h-6 w-px bg-gray-200 dark:bg-zinc-800" />

                {/* Secondary Action: Export */}
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleExportCsv}
                  disabled={loading || organizations.length === 0 || isExportingCsv}
                  className="flex h-10 items-center justify-center rounded-xl! border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 font-semibold text-xs active:scale-95 transition-all cursor-pointer px-4 shadow-xs hover:bg-gray-50 dark:hover:bg-zinc-700"
                >
                  {isExportingCsv ? (
                    <HugeIcon className="ph-bold ph-spinner animate-spin text-[16px]" />
                  ) : (
                    "Export"
                  )}
                </Button>

                {/* Primary Action: Generate */}
                <Button
                  type="button"
                  onClick={handleOpenPdfReport}
                  disabled={loading || organizations.length === 0 || isGeneratingPdf}
                  className="flex h-10 px-5 text-xs font-semibold rounded-xl! btn-brand-red text-white! active:scale-95 disabled:opacity-50 transition-all cursor-pointer shadow-xs"
                >
                  {isGeneratingPdf ? (
                    <HugeIcon className="ph-bold ph-spinner animate-spin text-[16px] flex items-center justify-center" />
                  ) : (
                    "Generate"
                  )}
                </Button>
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
              <div
                className={cn(
                  "transition-all duration-slow",
                  loading && !manualLoading ? "opacity-40 blur-[1px] grayscale-[0.1]" : "opacity-100"
                )}
              >
                <Reorder.Group
                  as="div"
                  axis="x"
                  values={kpiOrder}
                  onReorder={setKpiOrder}
                  ref={statCardsRef}
                  className="grid grid-cols-1 md:grid-cols-3 gap-4 relative z-20"
                >
                  {kpiOrder.map((key) => {
                    if (key === "accreditation") {
                      return (
                        <Reorder.Item
                          as="div"
                          value="accreditation"
                          key="accreditation"
                          className={cn(selectedKpi === "accreditation" ? "z-30" : "z-10")}
                        >
                          <div className={cn("relative group rounded-xl cursor-grab active:cursor-grabbing", selectedKpi === "accreditation" ? "z-30" : "z-10")}>
                            <div
                              onClick={() => setSelectedKpi(selectedKpi === "accreditation" ? null : "accreditation")}
                              className={cn(
                                "relative overflow-hidden rounded-[18px] border cursor-pointer select-none transition-all shadow-none flex flex-col justify-between min-h-[110px] bg-gray-50 dark:bg-zinc-900",
                                selectedKpi === "accreditation"
                                  ? "border-emerald-500/50 ring-1 ring-emerald-500/20"
                                  : "border-gray-100 dark:border-white/5 hover:border-gray-200 dark:hover:border-white/10"
                              )}
                            >
                              <div className="flex justify-between items-start p-4 pb-0">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[13px] font-medium text-gray-500 dark:text-zinc-400 capitalize">
                                    Accreditation Rate
                                  </span>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <HugeIcon className="ph-bold ph-info cursor-help text-xs text-gray-400 hover:text-gray-600 dark:hover:text-zinc-300 transition-colors" />
                                    </TooltipTrigger>
                                    <TooltipContent
                                      side="right"
                                      className="max-w-[280px] bg-white dark:bg-zinc-900 text-gray-900 dark:text-zinc-100 p-3 rounded-xl shadow-xl border border-gray-200 dark:border-white/10 text-xs font-normal"
                                    >
                                      <p className="font-semibold text-pup-maroon dark:text-red-400 mb-1">Accreditation Formula</p>
                                      <p className="leading-relaxed text-gray-600 dark:text-zinc-300 mb-2">
                                        Percentage of recognized student organizations with 100% completed compliance requirements.
                                      </p>
                                      <div className="p-2 bg-gray-50 dark:bg-zinc-800/60 rounded-lg text-[11px] font-mono border border-gray-200/60 dark:border-white/5">
                                        (Compliant Orgs / Total Orgs) × 100
                                      </div>
                                    </TooltipContent>
                                  </Tooltip>
                                </div>
                                <div className="w-8 h-8 rounded-[10px] flex items-center justify-center text-white shadow-sm shrink-0 bg-[#22c55e]">
                                  <HugeIcon className="ph-bold text-[15px] ph-seal-check" />
                                </div>
                              </div>
                              <div className="flex justify-between items-end p-4 pt-1">
                                <div className="flex items-baseline gap-2">
                                  <span className="text-[28px] font-bold text-gray-900 dark:text-white leading-none tracking-tight">
                                    {filteredSummary.overallComplianceRate}%
                                  </span>
                                  <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 mb-1">
                                    {filteredSummary.fullyCompliantCount} of {filteredSummary.totalOrganizations} Accredited
                                    {isFiltered && (
                                      <span className="text-gray-400 dark:text-zinc-500 font-normal ml-1">
                                        · Campus: {summary?.overallComplianceRate ?? 0}%
                                      </span>
                                    )}
                                  </span>
                                </div>
                                <HugeIcon className="ph-bold ph-dots-six-vertical cursor-grab active:cursor-grabbing hover:text-gray-400 dark:hover:text-zinc-500 text-gray-300 dark:text-zinc-700 text-lg mb-0.5" />
                              </div>
                            </div>

                            {/* Absolute details popover */}
                            <div
                              className={cn(
                                "absolute top-full left-0 right-0 z-[100] mt-2 rounded-xl border border-gray-200 bg-white p-4 shadow-xl dark:border-white/10 dark:bg-zinc-900 transition-all duration-300 ease-in-out origin-top",
                                selectedKpi === "accreditation"
                                  ? "scale-y-100 opacity-100 translate-y-0"
                                  : "scale-y-95 opacity-0 -translate-y-2 pointer-events-none"
                              )}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <div className="space-y-3">
                                <div className="grid grid-cols-2 gap-2">
                                  <div className="bg-emerald-50 dark:bg-emerald-950/30 p-2.5 rounded-lg border border-emerald-100 dark:border-emerald-900/30">
                                    <span className="block text-[9px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Fully Compliant</span>
                                    <span className="text-lg font-black text-emerald-700 dark:text-emerald-400">{filteredSummary.fullyCompliantCount}</span>
                                  </div>
                                  <div className="bg-amber-50 dark:bg-amber-950/30 p-2.5 rounded-lg border border-amber-100 dark:border-amber-900/30">
                                    <span className="block text-[9px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">Partially Compliant</span>
                                    <span className="text-lg font-black text-amber-700 dark:text-amber-400">{filteredSummary.partiallyCompliantCount}</span>
                                  </div>
                                </div>

                                <div className="bg-rose-50 dark:bg-rose-950/30 p-2.5 rounded-lg border border-rose-100 dark:border-rose-900/30 flex justify-between items-center text-xs">
                                  <span className="font-semibold text-rose-700 dark:text-rose-400">Action Required (&lt;50%)</span>
                                  <span className="font-bold text-rose-800 dark:text-rose-300">{filteredSummary.actionRequiredCount} orgs</span>
                                </div>

                                {filteredSummary.categoryBreakdown.length > 0 && (
                                  <div>
                                    <h4 className="text-[10px] font-bold text-gray-400 dark:text-zinc-500 mb-1.5 uppercase tracking-wide">Category Performance</h4>
                                    <div className="space-y-1">
                                      {filteredSummary.categoryBreakdown.map((cat) => (
                                        <div key={cat.category} className="flex justify-between items-center text-[11px] py-1 border-b border-gray-100 dark:border-white/5 text-gray-700 dark:text-zinc-300">
                                          <span className="truncate max-w-[150px] font-medium">{cat.category}</span>
                                          <span className="font-bold text-gray-900 dark:text-zinc-50">{cat.complianceRate}% ({cat.compliantCount}/{cat.totalOrgs})</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </Reorder.Item>
                      );
                    }

                    if (key === "organizations") {
                      return (
                        <Reorder.Item
                          as="div"
                          value="organizations"
                          key="organizations"
                          className={cn(selectedKpi === "organizations" ? "z-30" : "z-10")}
                        >
                          <div className={cn("relative group rounded-xl cursor-grab active:cursor-grabbing", selectedKpi === "organizations" ? "z-30" : "z-10")}>
                            <div
                              onClick={() => setSelectedKpi(selectedKpi === "organizations" ? null : "organizations")}
                              className={cn(
                                "relative overflow-hidden rounded-[18px] border cursor-pointer select-none transition-all shadow-none flex flex-col justify-between min-h-[110px] bg-gray-50 dark:bg-zinc-900",
                                selectedKpi === "organizations"
                                  ? "border-blue-500/50 ring-1 ring-blue-500/20"
                                  : "border-gray-100 dark:border-white/5 hover:border-gray-200 dark:hover:border-white/10"
                              )}
                            >
                              <div className="flex justify-between items-start p-4 pb-0">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[13px] font-medium text-gray-500 dark:text-zinc-400 capitalize">
                                    Recognized Orgs
                                  </span>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <HugeIcon className="ph-bold ph-info cursor-help text-xs text-gray-400 hover:text-gray-600 dark:hover:text-zinc-300 transition-colors" />
                                    </TooltipTrigger>
                                    <TooltipContent
                                      side="right"
                                      className="max-w-[280px] bg-white dark:bg-zinc-900 text-gray-900 dark:text-zinc-100 p-3 rounded-xl shadow-xl border border-gray-200 dark:border-white/10 text-xs font-normal"
                                    >
                                      <p className="font-semibold text-pup-maroon dark:text-red-400 mb-1">Recognized Organizations</p>
                                      <p className="leading-relaxed text-gray-600 dark:text-zinc-300">
                                        All student organizations officially chartered and accredited under OSAS for the active academic cycle.
                                      </p>
                                    </TooltipContent>
                                  </Tooltip>
                                </div>
                                <div className="w-8 h-8 rounded-[10px] flex items-center justify-center text-white shadow-sm shrink-0 bg-[#3b82f6]">
                                  <HugeIcon className="ph-bold text-[15px] ph-buildings" />
                                </div>
                              </div>
                              <div className="flex justify-between items-end p-4 pt-1">
                                <div className="flex items-baseline gap-2">
                                  <span className="text-[28px] font-bold text-gray-900 dark:text-white leading-none tracking-tight">
                                    {filteredSummary.totalOrganizations.toLocaleString()}
                                  </span>
                                  <span className="text-xs font-medium text-blue-600 dark:text-blue-400 mb-1">
                                    {filteredSummary.academicCount} Academic · {filteredSummary.nonAcademicCount} Non-Academic
                                    {isFiltered && (
                                      <span className="text-gray-400 dark:text-zinc-500 font-normal ml-1">
                                        (of {organizations.length})
                                      </span>
                                    )}
                                  </span>
                                </div>
                                <HugeIcon className="ph-bold ph-dots-six-vertical cursor-grab active:cursor-grabbing hover:text-gray-400 dark:hover:text-zinc-500 text-gray-300 dark:text-zinc-700 text-lg mb-0.5" />
                              </div>
                            </div>

                            {/* Absolute details popover */}
                            <div
                              className={cn(
                                "absolute top-full left-0 right-0 z-[100] mt-2 rounded-xl border border-gray-200 bg-white p-4 shadow-xl dark:border-white/10 dark:bg-zinc-900 transition-all duration-300 ease-in-out origin-top",
                                selectedKpi === "organizations"
                                  ? "scale-y-100 opacity-100 translate-y-0"
                                  : "scale-y-95 opacity-0 -translate-y-2 pointer-events-none"
                              )}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <div className="space-y-3">
                                <div className="grid grid-cols-2 gap-2">
                                  <div className="bg-blue-50 dark:bg-blue-950/30 p-2.5 rounded-lg border border-blue-100 dark:border-blue-900/30">
                                    <span className="block text-[9px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">Academic</span>
                                    <span className="text-lg font-black text-blue-700 dark:text-blue-400">{filteredSummary.academicCount}</span>
                                  </div>
                                  <div className="bg-indigo-50 dark:bg-indigo-950/30 p-2.5 rounded-lg border border-indigo-100 dark:border-indigo-900/30">
                                    <span className="block text-[9px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">Non-Academic</span>
                                    <span className="text-lg font-black text-indigo-700 dark:text-indigo-400">{filteredSummary.nonAcademicCount}</span>
                                  </div>
                                </div>

                                <div className="bg-gray-50 dark:bg-zinc-800/60 p-2.5 rounded-lg border border-gray-100 dark:border-white/5 space-y-1.5 text-xs">
                                  <div className="flex justify-between items-center">
                                    <span className="font-medium text-gray-600 dark:text-zinc-400">With Whitelisted Officers</span>
                                    <span className="font-bold text-gray-900 dark:text-zinc-100">{filteredSummary.withOfficersCount} orgs</span>
                                  </div>
                                  <div className="flex justify-between items-center">
                                    <span className="font-medium text-gray-600 dark:text-zinc-400">With Assigned Adviser</span>
                                    <span className="font-bold text-gray-900 dark:text-zinc-100">{filteredSummary.withAdvisersCount} orgs</span>
                                  </div>
                                </div>

                                <div>
                                  <h4 className="text-[10px] font-bold text-gray-400 dark:text-zinc-500 mb-1 uppercase tracking-wide">Status Distribution</h4>
                                  <div className="flex items-center gap-2 text-[11px] text-gray-600 dark:text-zinc-300">
                                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" /> Active: {filteredSummary.statusDistribution.Active || 0}</span>
                                    <span>·</span>
                                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500 inline-block" /> Probationary: {filteredSummary.statusDistribution.Probationary || 0}</span>
                                    <span>·</span>
                                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-zinc-400 inline-block" /> Inactive: {filteredSummary.statusDistribution.Inactive || 0}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </Reorder.Item>
                      );
                    }

                    if (key === "cbl") {
                      return (
                        <Reorder.Item
                          as="div"
                          value="cbl"
                          key="cbl"
                          className={cn(selectedKpi === "cbl" ? "z-30" : "z-10")}
                        >
                          <div className={cn("relative group rounded-xl cursor-grab active:cursor-grabbing", selectedKpi === "cbl" ? "z-30" : "z-10")}>
                            <div
                              onClick={() => setSelectedKpi(selectedKpi === "cbl" ? null : "cbl")}
                              className={cn(
                                "relative overflow-hidden rounded-[18px] border cursor-pointer select-none transition-all shadow-none flex flex-col justify-between min-h-[110px] bg-gray-50 dark:bg-zinc-900",
                                selectedKpi === "cbl"
                                  ? "border-amber-500/50 ring-1 ring-amber-500/20"
                                  : "border-gray-100 dark:border-white/5 hover:border-gray-200 dark:hover:border-white/10"
                              )}
                            >
                              <div className="flex justify-between items-start p-4 pb-0">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[13px] font-medium text-gray-500 dark:text-zinc-400 capitalize">
                                    CBL Archival Rate
                                  </span>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <HugeIcon className="ph-bold ph-info cursor-help text-xs text-gray-400 hover:text-gray-600 dark:hover:text-zinc-300 transition-colors" />
                                    </TooltipTrigger>
                                    <TooltipContent
                                      side="right"
                                      className="max-w-[280px] bg-white dark:bg-zinc-900 text-gray-900 dark:text-zinc-100 p-3 rounded-xl shadow-xl border border-gray-200 dark:border-white/10 text-xs font-normal"
                                    >
                                      <p className="font-semibold text-pup-maroon dark:text-red-400 mb-1">CBL Archival Formula</p>
                                      <p className="leading-relaxed text-gray-600 dark:text-zinc-300 mb-2">
                                        Constitution & By-Laws (CBL) digitization and verification completion across all registered organizations.
                                      </p>
                                      <div className="p-2 bg-gray-50 dark:bg-zinc-800/60 rounded-lg text-[11px] font-mono border border-gray-200/60 dark:border-white/5">
                                        (Archived CBLs / Total Organizations) × 100
                                      </div>
                                    </TooltipContent>
                                  </Tooltip>
                                </div>
                                <div className="w-8 h-8 rounded-[10px] flex items-center justify-center text-white shadow-sm shrink-0 bg-[#f59e0b]">
                                  <HugeIcon className="ph-bold text-[15px] ph-file-pdf" />
                                </div>
                              </div>
                              <div className="flex justify-between items-end p-4 pt-1">
                                <div className="flex items-baseline gap-2">
                                  <span className="text-[28px] font-bold text-gray-900 dark:text-white leading-none tracking-tight">
                                    {filteredSummary.cblArchivedRate}%
                                  </span>
                                  <span className="text-xs font-medium text-amber-600 dark:text-amber-400 mb-1">
                                    {filteredSummary.cblArchivedCount} of {filteredSummary.totalOrganizations} Digitized
                                    {isFiltered && (
                                      <span className="text-gray-400 dark:text-zinc-500 font-normal ml-1">
                                        · Campus: {summary?.cblArchivedRate ?? 0}%
                                      </span>
                                    )}
                                  </span>
                                </div>
                                <HugeIcon className="ph-bold ph-dots-six-vertical cursor-grab active:cursor-grabbing hover:text-gray-400 dark:hover:text-zinc-500 text-gray-300 dark:text-zinc-700 text-lg mb-0.5" />
                              </div>
                            </div>

                            {/* Absolute details popover */}
                            <div
                              className={cn(
                                "absolute top-full left-0 right-0 z-[100] mt-2 rounded-xl border border-gray-200 bg-white p-4 shadow-xl dark:border-white/10 dark:bg-zinc-900 transition-all duration-300 ease-in-out origin-top",
                                selectedKpi === "cbl"
                                  ? "scale-y-100 opacity-100 translate-y-0"
                                  : "scale-y-95 opacity-0 -translate-y-2 pointer-events-none"
                              )}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <div className="space-y-3">
                                <div className="grid grid-cols-2 gap-2">
                                  <div className="bg-emerald-50 dark:bg-emerald-950/30 p-2.5 rounded-lg border border-emerald-100 dark:border-emerald-900/30">
                                    <span className="block text-[9px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Archived & Verified</span>
                                    <span className="text-lg font-black text-emerald-700 dark:text-emerald-400">{filteredSummary.cblArchivedCount}</span>
                                  </div>
                                  <div className="bg-amber-50 dark:bg-amber-950/30 p-2.5 rounded-lg border border-amber-100 dark:border-amber-900/30">
                                    <span className="block text-[9px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">Pending Submission</span>
                                    <span className="text-lg font-black text-amber-700 dark:text-amber-400">{filteredSummary.cblPendingCount}</span>
                                  </div>
                                </div>

                                <div className="bg-gray-50 dark:bg-zinc-800/60 p-2.5 rounded-lg border border-gray-100 dark:border-white/5 flex justify-between items-center text-xs">
                                  <span className="font-semibold text-gray-600 dark:text-zinc-400">Digitization Progress</span>
                                  <span className="font-bold text-amber-600 dark:text-amber-400">{filteredSummary.cblArchivedRate}% completed</span>
                                </div>

                                <p className="text-[11px] leading-relaxed text-gray-500 dark:text-zinc-400 italic">
                                  Ratified Constitution & By-Laws must be formally uploaded to the repository for legal compliance and university recognition.
                                </p>
                              </div>
                            </div>
                          </div>
                        </Reorder.Item>
                      );
                    }

                    return null;
                  })}
                </Reorder.Group>
              </div>
            </div>
          ) : null}

          {/* 3. Navigation Toolbar: Category Line Tabs & Search/Status Controls */}
          <div className="border-t border-gray-100 dark:border-white/10 p-5 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 bg-gray-50/40 dark:bg-zinc-900/30">
            {/* Left: Category Line Tabs */}
            <div className="flex items-center gap-6 shrink-0 select-none overflow-x-auto">
              {CATEGORIES.map((cat) => {
                const isActive = categoryFilter === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => { setCategoryFilter(cat); setPage(1); }}
                    className={cn(
                      "relative h-9 flex items-center text-[13px] font-semibold transition-colors focus:outline-none cursor-pointer border-0 bg-transparent whitespace-nowrap",
                      isActive
                        ? "text-gray-900 dark:text-zinc-50 after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-full after:bg-pup-maroon dark:after:bg-red-400"
                        : "text-[#8E8E93] font-normal hover:text-gray-700 dark:hover:text-zinc-200"
                    )}
                  >
                    {cat === "All" ? "All Organizations" : `${cat} Orgs`}
                  </button>
                );
              })}
            </div>

            {/* Right: Search Input & Multi-Criteria Filter */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
              {/* Search Bar with live count badge */}
              <div className="w-full sm:w-[260px] lg:w-[280px] relative group shrink-0">
                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                  <HugeIcon className="ph-bold ph-magnifying-glass text-gray-400 dark:text-zinc-500 transition-colors group-focus-within:text-pup-maroon dark:group-focus-within:text-red-400 text-sm" />
                </div>
                <Input
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  placeholder="Search org, acronym, adviser..."
                  className="h-9 w-full rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 pl-8 pr-16 text-xs font-normal text-gray-900 dark:text-zinc-100 placeholder:text-gray-400 dark:placeholder:text-zinc-500 shadow-none focus-visible:outline-none focus-visible:border-pup-maroon focus-visible:ring-1 focus-visible:ring-pup-maroon dark:focus-visible:border-red-500/80 dark:focus-visible:ring-red-500/80"
                />
                <div className="absolute inset-y-0 right-3 flex items-center gap-1.5">
                  {search && (
                    <button
                      type="button"
                      onClick={() => { setSearch(""); setPage(1); }}
                      className="text-gray-400 hover:text-gray-600 dark:hover:text-zinc-300 cursor-pointer"
                    >
                      <HugeIcon className="ph-bold ph-x-circle text-[13px]" />
                    </button>
                  )}
                  <span className="text-[11px] text-gray-400 dark:text-zinc-500 pointer-events-none">
                    {filteredOrganizations.length}
                  </span>
                </div>
              </div>

              {/* Multi-Criteria Filter Popover */}
              <MultiCriteriaFilter
                title="Filter Compliance"
                groups={filterGroups}
                selectedValues={filterValues}
                onChange={handleFilterChange}
                onClearAll={handleResetFilters}
                totalCount={organizations.length}
                filteredCount={filteredOrganizations.length}
              />
            </div>
          </div>

          {/* 4. Active Filter Chips */}
          <ActiveFilterChips
            chips={activeChips}
            onClearAll={handleResetFilters}
            className="border-t border-gray-100 dark:border-white/10 px-6 py-2.5"
          />

          {/* 5. Main Content Area: Organizations Compliance Table (5 Clean Columns) */}
          <div className="flex flex-1 flex-col min-h-0 overflow-hidden border-t border-gray-100 dark:border-white/10 bg-white dark:bg-card">
            <div className="flex-1 overflow-x-auto">
              {sortedOrganizations.length > 0 ? (
                <table className="min-w-full text-sm">
                  <thead className="sticky top-0 z-10 bg-white backdrop-blur-sm dark:bg-card">
                    <tr className="hover:bg-transparent text-left border-b border-gray-100 dark:border-white/5">
                      {/* Column 1: Organization */}
                      <th className="p-4 px-6">
                        <button
                          type="button"
                          onClick={() => handleSort("name")}
                          className="group flex items-center text-[12px] font-medium uppercase tracking-[0.04em] text-gray-400 dark:text-zinc-500 transition-colors focus:outline-none cursor-pointer"
                        >
                          Organization <SortIndicator column="name" sortBy={sortBy} sortOrder={sortOrder} />
                        </button>
                      </th>

                      {/* Column 2: Faculty Adviser */}
                      <th className="p-4 px-6">
                        <span className="text-[12px] font-medium uppercase tracking-[0.04em] text-gray-400 dark:text-zinc-500">
                          Faculty Adviser
                        </span>
                      </th>

                      {/* Column 3: Archival CBL */}
                      <th className="p-4 px-6 text-center">
                        <button
                          type="button"
                          onClick={() => handleSort("hasCbl")}
                          className="group mx-auto flex items-center text-[12px] font-medium uppercase tracking-[0.04em] text-gray-400 dark:text-zinc-500 transition-colors focus:outline-none cursor-pointer"
                        >
                          Archival CBL <SortIndicator column="hasCbl" sortBy={sortBy} sortOrder={sortOrder} />
                        </button>
                      </th>

                      {/* Column 4: Officer Whitelist */}
                      <th className="p-4 px-6 text-center">
                        <button
                          type="button"
                          onClick={() => handleSort("activeOfficerCount")}
                          className="group mx-auto flex items-center text-[12px] font-medium uppercase tracking-[0.04em] text-gray-400 dark:text-zinc-500 transition-colors focus:outline-none cursor-pointer"
                        >
                          Officer Whitelist <SortIndicator column="activeOfficerCount" sortBy={sortBy} sortOrder={sortOrder} />
                        </button>
                      </th>

                      {/* Column 5: Compliance */}
                      <th className="p-4 px-6 text-right">
                        <button
                          type="button"
                          onClick={() => handleSort("complianceScore")}
                          className="group ml-auto flex items-center text-[12px] font-medium uppercase tracking-[0.04em] text-gray-400 dark:text-zinc-500 transition-colors focus:outline-none cursor-pointer"
                        >
                          Compliance <SortIndicator column="complianceScore" sortBy={sortBy} sortOrder={sortOrder} />
                        </button>
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {paginatedOrganizations.map((org) => {
                      const isFullyCompliant = org.complianceScore === 100;
                      const isPartiallyCompliant = org.complianceScore >= 50 && org.complianceScore < 100;

                      return (
                        <tr
                          key={org.id}
                          className="border-b border-gray-100 dark:border-white/5 hover:bg-gray-50/60 dark:hover:bg-zinc-800/40 transition-colors"
                        >
                          {/* Column 1: Organization (Name, Acronym, Category, Standing) */}
                          <td className="p-4 px-6">
                            <div className="flex flex-col">
                              <span className="text-sm font-semibold text-gray-900 dark:text-zinc-50 leading-snug">
                                {org.name}
                              </span>
                              <div className="flex items-center gap-2 mt-1">
                                {org.acronym && (
                                  <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-red-50 text-pup-maroon dark:bg-red-950/40 dark:text-red-400 border border-red-100 dark:border-red-900/30">
                                    {org.acronym}
                                  </span>
                                )}
                                <span className="text-[11px] font-medium text-gray-500 dark:text-zinc-400">
                                  {org.category}
                                </span>
                                <span className="text-gray-300 dark:text-zinc-600">·</span>
                                <span className="inline-flex items-center gap-1.5 text-[11px] text-gray-500 dark:text-zinc-400">
                                  <span
                                    className={cn(
                                      "w-1.5 h-1.5 rounded-full",
                                      org.status === "Active"
                                        ? "bg-emerald-500"
                                        : org.status === "Probationary"
                                        ? "bg-amber-500"
                                        : "bg-zinc-400"
                                    )}
                                  />
                                  {org.status}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Column 2: Faculty Adviser */}
                          <td className="p-4 px-6">
                            <div className="text-xs font-medium text-gray-900 dark:text-zinc-100">
                              {org.adviserName || (
                                <span className="text-gray-400 italic">Not assigned</span>
                              )}
                            </div>
                            {org.adviserEmail && (
                              <div className="text-[11px] text-gray-400 dark:text-zinc-500 font-mono mt-0.5">
                                {org.adviserEmail}
                              </div>
                            )}
                          </td>

                          {/* Column 3: Archival CBL (1-Click Preview) */}
                          <td className="p-4 px-6 text-center whitespace-nowrap">
                            {org.hasCbl ? (
                              <button
                                type="button"
                                onClick={() =>
                                  setPreviewCbl({
                                    url: `/api/osas/organizations/${org.id}/bylaws?file=1`,
                                    title: `${org.name} — Constitution & By-Laws (CBL)`,
                                    filename: org.cblFilename,
                                  })
                                }
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-red-50 text-pup-maroon dark:bg-red-950/30 dark:text-red-400 border border-red-100 dark:border-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors cursor-pointer"
                                title="Preview Official CBL"
                              >
                                <HugeIcon className="ph-bold ph-file-pdf text-xs" />
                                <span>Archived (PDF)</span>
                              </button>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-lg dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-800/40">
                                <HugeIcon className="ph-bold ph-warning-circle text-xs" />
                                <span>Pending PDF</span>
                              </span>
                            )}
                          </td>

                          {/* Column 4: Officer Whitelist (1-Click Roster View) */}
                          <td className="p-4 px-6 text-center whitespace-nowrap">
                            {org.activeOfficerCount > 0 ? (
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedOrgForOfficers(org);
                                  setOfficerSearch("");
                                }}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-100 dark:border-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors cursor-pointer active:scale-95"
                                title="View Whitelisted Officers"
                              >
                                <HugeIcon className="ph-bold ph-shield-check text-xs" />
                                <span>
                                  {org.activeOfficerCount} {org.activeOfficerCount === 1 ? "Officer" : "Officers"}
                                </span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedOrgForOfficers(org);
                                  setOfficerSearch("");
                                }}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-lg dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-800/40 hover:bg-amber-100/80 dark:hover:bg-amber-900/50 transition-colors cursor-pointer active:scale-95"
                                title="View Whitelist Status"
                              >
                                <HugeIcon className="ph-bold ph-warning-circle text-xs" />
                                <span>No Officers</span>
                              </button>
                            )}
                          </td>

                          {/* Column 5: Compliance */}
                          <td className="p-4 px-6 text-right whitespace-nowrap">
                            <div className="flex flex-col items-end gap-1">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-sm font-bold text-gray-900 dark:text-zinc-50">
                                  {org.complianceScore}%
                                </span>
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    "text-[10px] font-bold uppercase rounded-md px-1.5 py-0.5",
                                    isFullyCompliant
                                      ? "bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300"
                                      : isPartiallyCompliant
                                      ? "bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300"
                                      : "bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950/40 dark:text-rose-300"
                                  )}
                                >
                                  {org.complianceStatus}
                                </Badge>
                              </div>
                              {org.missingRequirements.length > 0 && (
                                <span className="text-[11px] text-gray-400 dark:text-zinc-500">
                                  Missing: {org.missingRequirements.join(", ")}
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : loading ? (
                <div className="p-6 space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full rounded-xl dark:bg-muted" />
                  ))}
                </div>
              ) : (
                <div className="py-12">
                  <Empty>
                    <EmptyHeader>
                      <EmptyMedia>
                        <HugeIcon className="ph-duotone ph-buildings text-4xl text-gray-400 dark:text-zinc-500" />
                      </EmptyMedia>
                      <EmptyTitle>No Student Organizations Found</EmptyTitle>
                      <EmptyDescription>
                        {activeChips.length > 0
                          ? "No organizations match the selected filter criteria. Try clearing filters."
                          : "No recognized student organizations registered in OSAS."}
                      </EmptyDescription>
                      {activeChips.length > 0 && (
                        <div className="mt-6 flex justify-center">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={handleResetFilters}
                            className="flex h-10 items-center justify-center gap-2 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 px-5 text-xs font-semibold text-gray-700 dark:text-zinc-200 shadow-xs transition-all hover:bg-gray-50 dark:hover:bg-zinc-700 active:scale-95 cursor-pointer"
                          >
                            <HugeIcon className="ph-bold ph-arrow-counter-clockwise text-[14px] shrink-0" />
                            <span>Clear Filters</span>
                          </Button>
                        </div>
                      )}
                    </EmptyHeader>
                  </Empty>
                </div>
              )}
            </div>
          </div>

          {/* 6. Standard Table Pagination Footer */}
          {sortedOrganizations.length > 0 && (
            <div className="flex items-center justify-between border-t border-[#e5e5ea] dark:border-[#3a3a3c] bg-white dark:bg-[#1c1c1e] p-4 px-6 rounded-b-2xl mt-auto select-none">
              <div className="flex items-center gap-6 text-xs text-gray-500 dark:text-zinc-400 select-none">
                <span>
                  Showing {paginatedOrganizations.length} of {sortedOrganizations.length.toLocaleString()}
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
                        "px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer border-0",
                        pageSize === size
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

        {/* Officers Whitelist Slide-Over Sheet */}
        <Sheet
          open={Boolean(selectedOrgForOfficers)}
          onOpenChange={(open) => {
            if (!open) {
              setSelectedOrgForOfficers(null);
              setOfficerSearch("");
            }
          }}
        >
          <SheetContent
            side="right"
            className="w-full sm:max-w-xl md:max-w-2xl data-[side=right]:w-full data-[side=right]:sm:max-w-xl data-[side=right]:md:max-w-2xl flex flex-col h-full bg-white dark:bg-card border-l border-gray-200 dark:border-white/10 p-0 shadow-2xl font-jakarta overflow-hidden"
          >
            {/* Sheet Header */}
            <SheetHeader className="shrink-0 p-6 pb-4 border-b border-gray-100 dark:border-white/10 bg-gradient-to-r from-gray-50/90 via-white to-gray-50/50 dark:from-zinc-900/90 dark:via-card dark:to-zinc-900/50">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                {selectedOrgForOfficers?.acronym && (
                  <span className="px-2.5 py-0.5 text-[11px] font-bold rounded-lg bg-red-50 text-pup-maroon dark:bg-red-950/40 dark:text-red-400 border border-red-100 dark:border-red-900/30">
                    {selectedOrgForOfficers.acronym}
                  </span>
                )}
                <span className="px-2.5 py-0.5 text-[11px] font-medium rounded-lg bg-gray-100 text-gray-700 dark:bg-zinc-800 dark:text-zinc-300">
                  {selectedOrgForOfficers?.category || "Student Org"}
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-[11px] font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200/50 dark:border-emerald-800/40">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  {selectedOrgForOfficers?.status || "Active"}
                </span>
              </div>

              <SheetTitle className="text-xl font-bold text-gray-900 dark:text-zinc-50 leading-snug">
                {selectedOrgForOfficers?.name}
              </SheetTitle>
              <SheetDescription className="text-xs text-gray-500 dark:text-zinc-400 mt-1">
                Accredited Student Leadership Roster & Authorized Event Signatories.
              </SheetDescription>

              {/* Organization Summary Strip */}
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-3 border-t border-gray-100 dark:border-white/5">
                {/* Officer Count Badge */}
                <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-white dark:bg-zinc-800/60 border border-gray-200/70 dark:border-white/5">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                    <HugeIcon className="ph-bold ph-shield-check text-[15px]" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400 dark:text-zinc-500 block">
                      Accredited Leadership
                    </span>
                    <span className="text-xs font-bold text-gray-900 dark:text-white">
                      {selectedOrgForOfficers?.activeOfficerCount || 0} Whitelisted {selectedOrgForOfficers?.activeOfficerCount === 1 ? "Officer" : "Officers"}
                    </span>
                  </div>
                </div>

                {/* Faculty Adviser Snippet */}
                <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-white dark:bg-zinc-800/60 border border-gray-200/70 dark:border-white/5">
                  <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                    <HugeIcon className="ph-bold ph-chalkboard-teacher text-[15px]" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400 dark:text-zinc-500 block">
                      Faculty Adviser
                    </span>
                    <span className="text-xs font-bold text-gray-900 dark:text-white truncate block">
                      {selectedOrgForOfficers?.adviserName || "Not assigned"}
                    </span>
                  </div>
                </div>
              </div>
            </SheetHeader>

            {/* In-Sheet Search Filter */}
            {selectedOrgForOfficers?.officers && selectedOrgForOfficers.officers.length > 2 && (
              <div className="px-6 py-3 border-b border-gray-100 dark:border-white/5 bg-gray-50/40 dark:bg-zinc-900/30">
                <div className="relative">
                  <HugeIcon className="ph-bold ph-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs" />
                  <Input
                    value={officerSearch}
                    onChange={(e) => setOfficerSearch(e.target.value)}
                    placeholder="Search by name, position, or email..."
                    className="h-8.5 pl-8 pr-8 text-xs rounded-xl bg-white dark:bg-zinc-800 border-gray-200 dark:border-white/10 shadow-none focus-visible:outline-none focus-visible:border-pup-maroon focus-visible:ring-1 focus-visible:ring-pup-maroon dark:focus-visible:border-red-500 dark:focus-visible:ring-red-500"
                  />
                  {officerSearch && (
                    <button
                      type="button"
                      onClick={() => setOfficerSearch("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-zinc-200 cursor-pointer"
                    >
                      <HugeIcon className="ph-bold ph-x text-xs" />
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Scrollable Officers Roster */}
            <div className="flex-1 overflow-y-auto p-6 space-y-3">
              {(() => {
                const list = selectedOrgForOfficers?.officers || [];
                const filtered = officerSearch.trim()
                  ? list.filter((o) => {
                      const q = officerSearch.toLowerCase().trim();
                      return (
                        (o.name || "").toLowerCase().includes(q) ||
                        (o.position || "").toLowerCase().includes(q) ||
                        (o.email || "").toLowerCase().includes(q) ||
                        (o.studentNo || "").toLowerCase().includes(q)
                      );
                    })
                  : list;

                if (filtered.length === 0) {
                  return (
                    <div className="py-12 px-6 rounded-2xl border border-dashed border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-zinc-900/40 text-center">
                      <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200/60 dark:border-amber-800/40 flex items-center justify-center mx-auto mb-3 shadow-xs">
                        <HugeIcon className="ph-duotone ph-users-three text-2xl" />
                      </div>
                      <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                        No Whitelisted Officers Found
                      </h4>
                      <p className="text-xs text-gray-500 dark:text-zinc-400 mt-1 max-w-sm mx-auto">
                        {officerSearch.trim()
                          ? "No student officers match your search query inside this organization roster."
                          : "This student organization currently has no active student officers recorded on the OSAS accreditation whitelist."}
                      </p>
                      <div className="mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-gray-600 dark:text-zinc-300 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-white/10 shadow-xs">
                        <HugeIcon className="ph-bold ph-info text-pup-maroon dark:text-red-400" />
                        <span>Student officers can be whitelisted by OSAS personnel in the Student Organizations tab</span>
                      </div>
                    </div>
                  );
                }

                return filtered.map((officer) => {
                  const roleStyle = getOfficerRoleStyle(officer.position);
                  const initials = getInitials(officer.name);
                  const avatarSrc = officer.avatarFilename
                    ? `/api/account/avatar?id=${officer.studentAccountId || officer.studentNo || officer.id}&t=${officer.avatarFilename}`
                    : null;

                  return (
                    <div
                      key={officer.id || officer.email}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 p-4 rounded-2xl border border-gray-200/80 dark:border-white/10 bg-white dark:bg-zinc-900/80 hover:border-gray-300 dark:hover:border-white/20 transition-all shadow-xs group"
                    >
                      {/* Left: Modern Avatar + Details */}
                      <div className="flex items-center gap-3.5 min-w-0">
                        {/* Avatar with Role Gradient & Status Dot */}
                        <div className="relative shrink-0">
                          <Avatar className={cn("size-12 rounded-xl ring-2 shadow-sm font-jakarta", roleStyle.ring)}>
                            {avatarSrc && (
                              <AvatarImage
                                src={avatarSrc}
                                alt={officer.name}
                                className="rounded-xl object-cover"
                              />
                            )}
                            <AvatarFallback
                              className={cn(
                                "rounded-xl font-bold text-sm tracking-wider bg-gradient-to-br select-none",
                                roleStyle.gradient
                              )}
                            >
                              {initials}
                            </AvatarFallback>
                          </Avatar>
                          {/* Active Presence Dot */}
                          <span
                            className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-zinc-900 flex items-center justify-center"
                            title="Active Verified Status"
                          />
                        </div>

                        {/* Officer Identity & Badges */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h5 className="text-sm font-bold text-gray-900 dark:text-zinc-50 tracking-[-0.01em] truncate">
                              {officer.name}
                            </h5>
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border",
                                roleStyle.badge
                              )}
                            >
                              <HugeIcon className={cn("mr-1 text-[11px]", roleStyle.icon)} />
                              {officer.position}
                            </Badge>
                          </div>

                          <div className="mt-1 flex items-center gap-2 flex-wrap text-xs text-gray-500 dark:text-zinc-400">
                            {officer.studentNo && (
                              <span className="font-mono text-[11px] font-medium text-gray-600 dark:text-zinc-400 bg-gray-100 dark:bg-zinc-800/80 px-2 py-0.5 rounded-md border border-gray-200/50 dark:border-white/5">
                                {officer.studentNo}
                              </span>
                            )}
                            {officer.studentNo && <span className="text-gray-300 dark:text-zinc-600">·</span>}
                            <button
                              type="button"
                              onClick={() => {
                                if (!officer.email) return;
                                navigator.clipboard.writeText(officer.email);
                                showToast?.({
                                  title: "Email Copied",
                                  description: `${officer.name || "Officer"}'s email copied to clipboard.`,
                                });
                              }}
                              className="group/btn inline-flex items-center gap-1 font-mono text-[11px] text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-zinc-100 transition-colors cursor-pointer"
                              title="Click to copy institutional email"
                            >
                              <HugeIcon className="ph-bold ph-envelope-simple text-[12px] text-gray-400 group-hover/btn:text-pup-maroon dark:group-hover/btn:text-red-400" />
                              <span className="truncate max-w-[200px]">{officer.email}</span>
                              <HugeIcon className="ph-bold ph-copy text-[11px] opacity-0 group-hover/btn:opacity-100 transition-opacity ml-0.5" />
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Right: Authorization Status Pill */}
                      <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-1 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-100 dark:border-white/5">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/40">
                          <HugeIcon className="ph-bold ph-shield-check text-xs text-emerald-600 dark:text-emerald-400" />
                          <span>Authorized Signatory</span>
                        </span>
                        <span className="text-[10px] text-gray-400 dark:text-zinc-500 font-mono">
                          OSAS Whitelist
                        </span>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>

            {/* Sheet Footer */}
            <SheetFooter className="shrink-0 p-4 border-t border-gray-100 dark:border-white/10 bg-gray-50/50 dark:bg-zinc-900/30 flex flex-row items-center justify-between gap-3">
              <span className="text-[11px] text-gray-400 dark:text-zinc-500 hidden sm:inline">
                PUP San Juan OSAS · Student Governance
              </span>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setSelectedOrgForOfficers(null);
                  setOfficerSearch("");
                }}
                className="h-10 px-5 text-xs font-semibold rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-xs cursor-pointer active:scale-95 transition-all ml-auto"
              >
                Close
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>

        {/* CBL PDF Preview Modal */}
        {previewCbl && (
          <PDFPreviewModal
            open={Boolean(previewCbl)}
            preview={{
              url: previewCbl.url,
              title: previewCbl.title,
              filename: previewCbl.filename,
            }}
            onClose={() => setPreviewCbl(null)}
          />
        )}

        {/* Official OSAS Compliance PDF Report Modal */}
        <Dialog
          open={reportOpen}
          onOpenChange={(open) => {
            if (!open) {
              if (pdfBlobUrl) URL.revokeObjectURL(pdfBlobUrl);
              setPdfBlobUrl(null);
              setPreviewFrameReady(false);
              setIsFullscreenPreview(false);
            }
            setReportOpen(open);
          }}
        >
          <DialogContent
            hideClose={true}
            className={cn(
              "flex flex-col overflow-hidden border border-gray-200 bg-gray-100 p-0 shadow-2xl transition-all duration-normal ease-standard rounded-2xl dark:border-white/10 dark:bg-muted z-[70] gap-0",
              isFullscreenPreview
                ? "h-[96vh] w-[98vw] max-w-[98vw] sm:max-w-[98vw]"
                : "h-[90vh] w-[96vw] max-w-[96vw] sm:max-w-[96vw] xl:max-w-[1400px]"
            )}
          >
            <DialogHeader className="shrink-0 bg-gray-50 dark:bg-white/5 border-b border-gray-100 dark:border-white/10 px-6 py-4 flex flex-row items-center justify-between gap-4">
              <div className="min-w-0">
                <DialogTitle className="text-left font-semibold text-gray-900 dark:text-zinc-50 text-[15px] tracking-[-0.01em]">
                  Official OSAS Student Organization Compliance Report
                </DialogTitle>
                <DialogDescription className="text-left font-normal text-gray-500 dark:text-zinc-400 text-xs mt-0.5">
                  Accreditation and institutional audit report — PUP San Juan OSAS
                </DialogDescription>
              </div>

              <DialogClose asChild>
                <button
                  type="button"
                  onClick={() => setReportOpen(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors focus:outline-none flex items-center justify-center p-1 rounded-lg cursor-pointer"
                >
                  <HugeIcon className="ph-bold ph-x text-[16px]" />
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
                        className="h-10 w-10 rounded-full bg-black/50 text-white hover:bg-black/70 backdrop-blur-md border-0 cursor-pointer"
                      >
                        <HugeIcon className="ph-bold ph-x text-lg" />
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
                    title="OSAS PDF Report Preview"
                    onLoad={() => setPreviewFrameReady(true)}
                  />
                </div>
              ) : (
                <div className="flex flex-1 items-center justify-center bg-white p-6 dark:bg-card">
                  <div className="max-w-lg text-center">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-gray-200 bg-gray-50 dark:border-white/10 dark:bg-card">
                      <HugeIcon className="ph-bold ph-circle-notch animate-spin text-xl text-pup-maroon dark:text-primary" />
                    </div>
                    <p className="text-sm font-semibold text-gray-600 dark:text-zinc-300">
                      Generating Official Report...
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="flex shrink-0 items-center justify-between bg-white dark:bg-card px-6 py-4 border-t border-gray-100 dark:border-white/10">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsFullscreenPreview(!isFullscreenPreview)}
                    className="text-[#8E8E93] hover:text-[#111] dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 transition-colors rounded-xl shadow-none border-0 p-0 h-10 w-10 cursor-pointer"
                  >
                    <HugeIcon className={isFullscreenPreview ? "ph-bold ph-arrows-in text-[16px]" : "ph-bold ph-arrows-out text-[16px]"} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  {isFullscreenPreview ? "Exit Fullscreen" : "Fullscreen"}
                </TooltipContent>
              </Tooltip>

              <div className="flex items-center gap-2.5 ml-auto">
                <Button
                  variant="outline"
                  onClick={() => setReportOpen(false)}
                  className="h-10 px-5 text-xs font-semibold rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-xs cursor-pointer active:scale-95 transition-all"
                >
                  Close
                </Button>
                <Button
                  onClick={handleDownloadPdf}
                  disabled={!pdfBlobUrl}
                  className="h-10 px-5 text-xs font-semibold rounded-xl btn-brand-red text-white active:scale-95 disabled:opacity-50 transition-all cursor-pointer shadow-xs"
                >
                  Download
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}
