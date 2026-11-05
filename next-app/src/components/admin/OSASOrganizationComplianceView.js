"use client";
import { Table } from "@/components/ui/table";
import TablePagination from "@/components/shared/TablePagination";

import SheetPagination from "@/components/shared/SheetPagination";
import usePdfPreviewSession from "@/hooks/usePdfPreviewSession";
import { PDF_ACTION_LABELS } from "@/lib/pdfPreview";
import useUrlPage from "@/hooks/useUrlPage";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Reorder } from "framer-motion";

import PageHeader from "@/components/shared/PageHeader";
import { RefreshButton } from "@/components/shared/RefreshButton";
import PDFPreviewModal from "@/components/shared/PDFPreviewModal";
import ActiveFilterChips from "@/components/shared/ActiveFilterChips";
import { formatErrorMessage } from "@/lib/errorUtils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import MultiCriteriaFilter from "@/components/shared/MultiCriteriaFilter";
import TableScrollControls from "@/components/shared/TableScrollControls";
import DataViewToolbar from "@/components/shared/DataViewToolbar";
import useTableScroll from "@/hooks/useTableScroll";
import KpiStatCardsSkeleton from "@/components/systemadmin/skeletons/KpiStatCardsSkeleton";
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
  EmptyContent,
  EmptyMedia,
  EmptyState,
} from "@/components/ui/empty";
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { generateOrganizationCompliancePdf } from "@/lib/pdfGenerator";
import { downloadOrganizationComplianceCsv, generateExportFilename } from "@/lib/exportHelpers";
import { cn } from "@/lib/utils";
import { Building03Icon as EmptyBuilding03Icon, UserGroupIcon, ArrowDown01Icon, ArrowUp01Icon, ArrowUpDownIcon, Building01Icon, Cancel01Icon, CheckmarkBadge01Icon, Clock01Icon, Copy01Icon, CovidInfoIcon, DragDropIcon, File02Icon, Loading01Icon, Mail01Icon, ReloadIcon, Search01Icon, Shield01Icon, UserMinus01Icon, UserSearch01Icon } from "hugeicons-react";
import AppIcon from "@/components/ui/app-icon";
const CATEGORIES = ["All", "Academic", "Non-Academic"];

function getOfficerRoleStyle(position = "") {
  const pos = position.toLowerCase();
  if (pos.includes("president") && !pos.includes("vice")) {
    return {
      gradient: "from-blue-700 via-blue-600 to-indigo-600 text-white",
      ring: "ring-blue-500/30 dark:ring-blue-400/30",
      badge: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-900/50",
    };
  }
  if (pos.includes("vice")) {
    return {
      gradient: "from-indigo-800 via-indigo-600 to-blue-600 text-white",
      ring: "ring-indigo-500/30 dark:ring-indigo-400/30",
      badge: "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/50 dark:text-indigo-300 dark:border-indigo-900/50",
      icon: " Shield01Icon",
    };
  }
  if (pos.includes("secretary")) {
    return {
      gradient: "from-emerald-800 via-emerald-600 to-teal-600 text-white",
      ring: "ring-emerald-500/30 dark:ring-emerald-400/30",
      badge: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-900/50",
      icon: " Notebook01Icon",
    };
  }
  if (pos.includes("treasurer") || pos.includes("finance")) {
    return {
      gradient: "from-amber-700 via-amber-600 to-yellow-600 text-white",
      ring: "ring-amber-500/30 dark:ring-amber-400/30",
      badge: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-900/50",
      icon: " Coins01Icon",
    };
  }
  if (pos.includes("auditor")) {
    return {
      gradient: "from-purple-800 via-purple-600 to-violet-600 text-white",
      ring: "ring-purple-500/30 dark:ring-purple-400/30",
      badge: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/50 dark:text-purple-300 dark:border-purple-900/50",
      icon: " JusticeScale01Icon",
    };
  }
  return {
    gradient: "from-slate-700 via-slate-600 to-zinc-700 text-white",
    ring: "ring-gray-300/30 dark:ring-white/10",
    badge: "bg-gray-100 text-gray-700 border-border dark:bg-zinc-800 dark:text-zinc-300 dark:border-border",
    icon: " UserCheck01Icon",
  };
}

function getInitials(name = "") {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "SO";
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Standard Information Row (label : value)
 * Clean unboxed metadata layout aligned with colons and icons.
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
          <AppIcon className={cn("text-gray-400 dark:text-zinc-500 text-sm shrink-0", icon)} />
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

export default function OSASOrganizationComplianceView({
  showToast,
  onLogAction,
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
  const [page, setPage] = useUrlPage();
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
  const previewSession = usePdfPreviewSession();
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isExportingCsv, setIsExportingCsv] = useState(false);

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
          formatErrorMessage(err, {
            defaultTitle: "Compliance Load Failed",
          }),
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
        label: "Authorized Officers",
        options: [
          { value: "roster", label: "Authorized Officers", indicatorColor: "bg-blue-500", count: counts.officersPresent },
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
  }, [setPage]);

  const handleResetFilters = useCallback(() => {
    setSearch("");
    setCategoryFilter("All");
    setComplianceFilters([]);
    setStandingFilters([]);
    setCblFilters([]);
    setOfficerFilters([]);
    setPage(1);
  }, [setPage]);

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
        totalOrgs: 0,
        activeOrganizations: 0,
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
        withAdviserCount: 0,
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
        catMap[cat] = {
          category: cat,
          totalOrgs: 0,
          totalOrganizations: 0,
          compliantCount: 0,
          fullyCompliantCount: 0,
          cblArchivedCount: 0,
          withOfficersCount: 0,
          totalScoreSum: 0,
        };
      }
      catMap[cat].totalOrgs += 1;
      catMap[cat].totalOrganizations += 1;
      if (compStatus === "Compliant") {
        catMap[cat].compliantCount += 1;
        catMap[cat].fullyCompliantCount += 1;
      }
      if (hasCbl) {
        catMap[cat].cblArchivedCount += 1;
      }
      if (hasOfficers) {
        catMap[cat].withOfficersCount += 1;
      }
      catMap[cat].totalScoreSum += Number(org.complianceScore || org.compliance_score || 0);
    });

    const categoryBreakdown = Object.values(catMap).map((c) => ({
      category: c.category,
      totalOrgs: c.totalOrgs,
      totalOrganizations: c.totalOrgs,
      compliantCount: c.compliantCount,
      fullyCompliantCount: c.fullyCompliantCount,
      complianceRate: c.totalOrgs > 0 ? Math.round((c.compliantCount / c.totalOrgs) * 100) : 0,
      cblArchivedCount: c.cblArchivedCount,
      cblArchivedRate: c.totalOrgs > 0 ? Math.round((c.cblArchivedCount / c.totalOrgs) * 100) : 0,
      withOfficersCount: c.withOfficersCount,
      withOfficersRate: c.totalOrgs > 0 ? Math.round((c.withOfficersCount / c.totalOrgs) * 100) : 0,
      averageComplianceScore: c.totalOrgs > 0 ? Math.round(c.totalScoreSum / c.totalOrgs) : 0,
    }));

    return {
      totalOrganizations: total,
      totalOrgs: total,
      activeOrganizations: statusDistribution["Active"] || 0,
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
      withAdviserCount: withAdvisersCount,
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

  const {
    containerRef: tableContainerRef,
    isScrolledX,
    scrollLeft,
    scrollRight,
    resetScroll,
  } = useTableScroll([paginatedOrganizations.length]);

  useEffect(() => {
    resetScroll();
  }, [page, search, categoryFilter, complianceFilters, standingFilters, cblFilters, officerFilters, sortBy, sortOrder, pageSize, resetScroll]);

  const currentOrgIndex = selectedOrgForOfficers
    ? sortedOrganizations.findIndex((o) => o.id === selectedOrgForOfficers.id)
    : -1;

  const handlePrevOrg = () => {
    if (currentOrgIndex > 0) {
      setSelectedOrgForOfficers(sortedOrganizations[currentOrgIndex - 1]);
      setOfficerSearch("");
    }
  };

  const handleNextOrg = () => {
    if (currentOrgIndex >= 0 && currentOrgIndex < sortedOrganizations.length - 1) {
      setSelectedOrgForOfficers(sortedOrganizations[currentOrgIndex + 1]);
      setOfficerSearch("");
    }
  };

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
        label: of === "roster" ? "Authorized Officers" : "No Officers Recorded",
        onRemove: () => { setOfficerFilters((prev) => prev.filter((v) => v !== of)); setPage(1); },
      });
    });
    return chips;
  }, [search, categoryFilter, complianceFilters, standingFilters, cblFilters, officerFilters, setPage]);

  // PDF Generation
  const handleOpenPdfReport = async () => {
    const request = previewSession.begin();
    try {
      setIsGeneratingPdf(true);
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
      const url = previewSession.createUrl(blob, request);
      if (!url) return;
      setPdfBlobUrl(url);

      onLogAction?.({
        action: "Generate OSAS Compliance PDF",
        details: isFiltered
          ? `generated filtered compliance report PDF (${filteredOrganizations.length} orgs)`
          : "generated official student organization compliance report PDF",
        entityType: "Report",
      });
    } catch (err) {
      if (!previewSession.isCurrent(request)) return;
      showToast?.(
        formatErrorMessage(err, {
          defaultTitle: "Report Generation Failed",
        }),
        true
      );
      setReportOpen(false);
    } finally {
      if (previewSession.isCurrent(request)) setIsGeneratingPdf(false);
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
      showToast?.(
        formatErrorMessage(err, {
          defaultTitle: "CSV Export Failed",
        }),
        true
      );
    } finally {
      setIsExportingCsv(false);
    }
  };

  return (
    <TooltipProvider delayDuration={200}>
      <div className="font-jakarta w-full flex flex-[1_0_auto] flex-col h-auto gap-6 focus:outline-none animate-fade-up">
        {/* Unified Single Card Container: Header, Stats, Toolbar, Table & Footer */}
        <Card className="flex flex-[1_0_auto] h-auto w-full flex-col p-0 gap-0 overflow-visible rounded-2xl border border-border bg-white shadow-sm dark:border-border dark:bg-card dark:shadow-none isolate font-jakarta">
          {/* 1. Page Header */}
          <PageHeader
            icon="Analytics01Icon"
            title="Student Organization Compliance"
            description="Accreditation standing, Constitution & By-Laws (CBL) archival, and officer leadership compliance."
            showBorder={false}
            className="p-6"
            titleClassName="text-[18px] font-semibold tracking-[-0.01em] text-gray-900 dark:text-zinc-50"
            descriptionClassName="text-[13px] font-normal text-gray-900 dark:text-zinc-300 mt-[4px]"
            actions={
              <div className="flex items-center gap-2">
                {/* Refresh Button */}
                <RefreshButton
                  onRefresh={() => load(true)}
                  isLoading={manualLoading}
                  title="Refresh Compliance"
                />

                {/* Secondary Action: Export */}
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleExportCsv}
                  disabled={loading || organizations.length === 0 || isExportingCsv}
                  className="h-10 px-5 text-xs font-semibold rounded-xl border border-black/[0.06] dark:border-white/[0.08] bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-xs cursor-pointer active:scale-95 transition-all"
                >
                  {isExportingCsv ? (
                    <Loading01Icon size="1em" className="animate-spin text-[16px]" />
                  ) : (
                    "Export CSV"
                  )}
                </Button>

                <Button
                  type="button"
                  onClick={handleOpenPdfReport}
                  disabled={loading || organizations.length === 0 || isGeneratingPdf}
                  className="h-10 px-5 cursor-pointer"
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
                                  : "border-border dark:border-border hover:border-border dark:hover:border-white/10"
                              )}
                            >
                              <div className="flex justify-between items-start p-4 pb-0">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[13px] font-medium text-gray-900 dark:text-zinc-300 capitalize">
                                    Accreditation Rate
                                  </span>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <CovidInfoIcon size="1em" className="cursor-help text-xs text-gray-400 hover:text-gray-600 dark:hover:text-zinc-300 transition-colors" />
                                    </TooltipTrigger>
                                    <TooltipContent
                                      side="right"
                                      className="max-w-[280px] bg-white dark:bg-zinc-900 text-gray-900 dark:text-zinc-100 p-3 rounded-xl shadow-xl border border-border dark:border-border text-xs font-normal"
                                    >
                                      <p className="font-semibold text-pup-maroon dark:text-red-400 mb-1">Accreditation Formula</p>
                                      <p className="leading-relaxed text-gray-600 dark:text-zinc-300 mb-2">
                                        Percentage of recognized student organizations with 100% completed compliance requirements.
                                      </p>
                                      <div className="p-2 bg-gray-50 dark:bg-zinc-800/60 rounded-lg text-[11px] font-sans tabular-nums border border-border/60 dark:border-border">
                                        (Compliant Orgs / Total Orgs) × 100
                                      </div>
                                    </TooltipContent>
                                  </Tooltip>
                                </div>
                                <div className="w-8 h-8 rounded-[10px] flex items-center justify-center text-white shadow-sm shrink-0 bg-[#22c55e]">
                                  <CheckmarkBadge01Icon size="1em" className="text-[15px]" />
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
                                <DragDropIcon size="1em" className="cursor-grab active:cursor-grabbing hover:text-black dark:hover:text-white text-gray-900 dark:text-zinc-300 text-xl mb-0.5" />
                              </div>
                            </div>

                            {/* Absolute details popover */}
                            <div
                              className={cn(
                                "absolute top-full left-0 right-0 z-[100] mt-2 rounded-xl border border-border bg-white p-4 shadow-xl dark:border-border dark:bg-zinc-900 transition-all duration-300 ease-in-out origin-top",
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
                                        <div key={cat.category} className="flex justify-between items-center text-[11px] py-1 border-b border-border dark:border-border text-gray-700 dark:text-zinc-300">
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
                                  : "border-border dark:border-border hover:border-border dark:hover:border-white/10"
                              )}
                            >
                              <div className="flex justify-between items-start p-4 pb-0">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[13px] font-medium text-gray-900 dark:text-zinc-300 capitalize">
                                    Recognized Orgs
                                  </span>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <CovidInfoIcon size="1em" className="cursor-help text-xs text-gray-400 hover:text-gray-600 dark:hover:text-zinc-300 transition-colors" />
                                    </TooltipTrigger>
                                    <TooltipContent
                                      side="right"
                                      className="max-w-[280px] bg-white dark:bg-zinc-900 text-gray-900 dark:text-zinc-100 p-3 rounded-xl shadow-xl border border-border dark:border-border text-xs font-normal"
                                    >
                                      <p className="font-semibold text-pup-maroon dark:text-red-400 mb-1">Recognized Organizations</p>
                                      <p className="leading-relaxed text-gray-600 dark:text-zinc-300">
                                        All student organizations officially chartered and accredited under OSAS for the active academic cycle.
                                      </p>
                                    </TooltipContent>
                                  </Tooltip>
                                </div>
                                <div className="w-8 h-8 rounded-[10px] flex items-center justify-center text-white shadow-sm shrink-0 bg-[#3b82f6]">
                                  <Building01Icon size="1em" className="text-[15px]" />
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
                                <DragDropIcon size="1em" className="cursor-grab active:cursor-grabbing hover:text-black dark:hover:text-white text-gray-900 dark:text-zinc-300 text-xl mb-0.5" />
                              </div>
                            </div>

                            {/* Absolute details popover */}
                            <div
                              className={cn(
                                "absolute top-full left-0 right-0 z-[100] mt-2 rounded-xl border border-border bg-white p-4 shadow-xl dark:border-border dark:bg-zinc-900 transition-all duration-300 ease-in-out origin-top",
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

                                <div className="bg-gray-50 dark:bg-zinc-800/60 p-2.5 rounded-lg border border-border dark:border-border space-y-1.5 text-xs">
                                  <div className="flex justify-between items-center">
                                    <span className="font-medium text-gray-600 dark:text-zinc-400">With Authorized Officers</span>
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
                                  : "border-border dark:border-border hover:border-border dark:hover:border-white/10"
                              )}
                            >
                              <div className="flex justify-between items-start p-4 pb-0">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[13px] font-medium text-gray-900 dark:text-zinc-300 capitalize">
                                    CBL Archival Rate
                                  </span>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <CovidInfoIcon size="1em" className="cursor-help text-xs text-gray-400 hover:text-gray-600 dark:hover:text-zinc-300 transition-colors" />
                                    </TooltipTrigger>
                                    <TooltipContent
                                      side="right"
                                      className="max-w-[280px] bg-white dark:bg-zinc-900 text-gray-900 dark:text-zinc-100 p-3 rounded-xl shadow-xl border border-border dark:border-border text-xs font-normal"
                                    >
                                      <p className="font-semibold text-pup-maroon dark:text-red-400 mb-1">CBL Archival Formula</p>
                                      <p className="leading-relaxed text-gray-600 dark:text-zinc-300 mb-2">
                                        Constitution & By-Laws (CBL) digitization and verification completion across all registered organizations.
                                      </p>
                                      <div className="p-2 bg-gray-50 dark:bg-zinc-800/60 rounded-lg text-[11px] font-sans tabular-nums border border-border/60 dark:border-border">
                                        (Archived CBLs / Total Organizations) × 100
                                      </div>
                                    </TooltipContent>
                                  </Tooltip>
                                </div>
                                <div className="w-8 h-8 rounded-[10px] flex items-center justify-center text-white shadow-sm shrink-0 bg-[#f59e0b]">
                                  <File02Icon size="1em" className="text-[15px]" />
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
                                <DragDropIcon size="1em" className="cursor-grab active:cursor-grabbing hover:text-black dark:hover:text-white text-gray-900 dark:text-zinc-300 text-xl mb-0.5" />
                              </div>
                            </div>

                            {/* Absolute details popover */}
                            <div
                              className={cn(
                                "absolute top-full left-0 right-0 z-[100] mt-2 rounded-xl border border-border bg-white p-4 shadow-xl dark:border-border dark:bg-zinc-900 transition-all duration-300 ease-in-out origin-top",
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

                                <div className="bg-gray-50 dark:bg-zinc-800/60 p-2.5 rounded-lg border border-border dark:border-border flex justify-between items-center text-xs">
                                  <span className="font-semibold text-gray-600 dark:text-zinc-400">Digitization Progress</span>
                                  <span className="font-bold text-amber-600 dark:text-amber-400">{filteredSummary.cblArchivedRate}% completed</span>
                                </div>

                                <p className="text-[11px] leading-relaxed text-gray-900 dark:text-zinc-300 italic">
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
          <DataViewToolbar label="Organization compliance search and filters" className="border-t border-border dark:border-border p-5 gap-4 bg-gray-50/40 dark:bg-zinc-900/30">
            {/* Left: Category Segmented Tabs */}
            <div className="flex items-center gap-1 p-1 bg-gray-100/80 dark:bg-zinc-800/60 rounded-xl border border-border/60 shrink-0 select-none overflow-x-auto">
              {CATEGORIES.map((cat) => {
                const isActive = categoryFilter === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => { setCategoryFilter(cat); setPage(1); }}
                    className={cn(
                      "px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer border-0 whitespace-nowrap",
                      isActive
                        ? "bg-white dark:bg-zinc-700 text-gray-900 dark:text-white shadow-xs"
                        : "text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white bg-transparent"
                    )}
                  >
                    {cat === "All" ? "All Organizations" : `${cat} Orgs`}
                  </button>
                );
              })}
            </div>

            {/* Right: Search Input & Multi-Criteria Filter */}
            <div className="flex flex-nowrap items-center gap-3 shrink-0">
              {/* Search Bar with live count badge */}
              <div className="w-full sm:w-[260px] lg:w-[280px] relative group shrink-0">
                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                  <Search01Icon size="1em" className="text-gray-400 dark:text-zinc-500 transition-colors group-focus-within:text-pup-maroon dark:group-focus-within:text-red-400 text-sm" />
                </div>
                <Input
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  placeholder="Search org, acronym, adviser..."
                  className="h-9 w-full rounded-xl border border-border dark:border-border bg-white dark:bg-zinc-800 pl-8 pr-16 text-xs font-normal text-gray-900 dark:text-zinc-100 placeholder:text-gray-400 dark:placeholder:text-zinc-500 shadow-none focus-visible:outline-none focus-visible:border-pup-maroon focus-visible:ring-1 focus-visible:ring-pup-maroon dark:focus-visible:border-red-500/80 dark:focus-visible:ring-red-500/80"
                />
                <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-[11px] text-gray-400 dark:text-zinc-500">
                  {filteredOrganizations.length}
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

              <TableScrollControls scrollContainerRef={tableContainerRef}
                onScrollLeft={scrollLeft}
                onScrollRight={scrollRight}
                onResetScroll={resetScroll}
                isScrolled={isScrolledX}
              />
            </div>
          </DataViewToolbar>

          {/* 4. Active Filter Chips */}
          <ActiveFilterChips
            chips={activeChips}
            onClearAll={handleResetFilters}
            className="border-t border-border dark:border-border px-6 py-2.5"
          />

          {/* 5. Main Content Area: Organizations Compliance Table (5 Clean Columns) */}
          <div className="flex flex-[1_0_auto] flex-col border-t border-border dark:border-border bg-white dark:bg-card">
            <div
              ref={tableContainerRef}
              className="w-full flex-[1_0_auto] overflow-x-auto show-scrollbar pb-2"
            >
              {sortedOrganizations.length > 0 ? (
                <Table columns={[{ kind: "text", maxWidth: 340 }, "text", "status", "number", "number"]} className="min-w-[1050px]">
                  <thead className="sticky top-0 z-10 border-b border-border bg-gray-50/90 dark:bg-zinc-900/90 backdrop-blur-xs select-none">
                    <tr className="text-left text-xs font-semibold text-gray-500 dark:text-zinc-400">
                      {/* Column 1: Organization */}
                      <th
                        className={cn(
                          "py-3 px-6 w-[32%] min-w-[260px] sticky left-0 z-20 bg-gray-50/90 dark:bg-zinc-900/90 backdrop-blur-xs transition-shadow duration-200",
                          isScrolledX && "shadow-[4px_0_12px_-2px_rgba(0,0,0,0.06)] dark:shadow-[4px_0_12px_-2px_rgba(0,0,0,0.4)]"
                        )}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <button
                            type="button"
                            onClick={() => handleSort("name")}
                            className={cn(
                              "group flex items-center text-xs font-semibold transition-colors focus:outline-none cursor-pointer",
                              sortBy === "name" ? "text-gray-900 dark:text-white" : "text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white"
                            )}
                          >
                            Organization <SortIndicator column="name" sortBy={sortBy} sortOrder={sortOrder} />
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

                      {/* Column 2: Faculty Adviser */}
                      <th className="py-3 px-6 w-[22%]">
                        <span className="text-xs font-semibold text-gray-500 dark:text-zinc-400">
                          Faculty Adviser
                        </span>
                      </th>

                      {/* Column 3: Archival CBL */}
                      <th className="py-3 px-6 w-[14%] text-center">
                        <button
                          type="button"
                          onClick={() => handleSort("hasCbl")}
                          className={cn(
                            "group mx-auto flex items-center text-xs font-semibold transition-colors focus:outline-none cursor-pointer",
                            sortBy === "hasCbl" ? "text-gray-900 dark:text-white" : "text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white"
                          )}
                        >
                          Archival CBL <SortIndicator column="hasCbl" sortBy={sortBy} sortOrder={sortOrder} />
                        </button>
                      </th>

                      {/* Column 4: Authorized Officers */}
                      <th className="py-3 px-6 w-[14%] text-center">
                        <button
                          type="button"
                          onClick={() => handleSort("activeOfficerCount")}
                          className={cn(
                            "group mx-auto flex items-center text-xs font-semibold transition-colors focus:outline-none cursor-pointer",
                            sortBy === "activeOfficerCount" ? "text-gray-900 dark:text-white" : "text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white"
                          )}
                        >
                          Authorized Officers <SortIndicator column="activeOfficerCount" sortBy={sortBy} sortOrder={sortOrder} />
                        </button>
                      </th>

                      {/* Column 5: Compliance */}
                      <th className="py-3 px-6 w-[18%] text-right">
                        <button
                          type="button"
                          onClick={() => handleSort("complianceScore")}
                          className={cn(
                            "group ml-auto flex items-center text-xs font-semibold transition-colors focus:outline-none cursor-pointer",
                            sortBy === "complianceScore" ? "text-gray-900 dark:text-white" : "text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white"
                          )}
                        >
                          Compliance <SortIndicator column="complianceScore" sortBy={sortBy} sortOrder={sortOrder} />
                        </button>
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-border dark:divide-border bg-white dark:bg-card">
                    {paginatedOrganizations.map((org) => {
                      const isFullyCompliant = org.complianceScore === 100;
                      const isPartiallyCompliant = org.complianceScore >= 50 && org.complianceScore < 100;
                      const score = org.complianceScore || 0;
                      const barColor = isFullyCompliant
                        ? "bg-emerald-500 dark:bg-emerald-400"
                        : isPartiallyCompliant
                        ? "bg-amber-500 dark:bg-amber-400"
                        : "bg-rose-500 dark:bg-rose-400";

                      return (
                        <tr
                          key={org.id}
                          className="group hover:bg-gray-50/70 dark:hover:bg-zinc-800/40 transition-colors select-none"
                        >
                          {/* Column 1: Organization (Name, Acronym, Category, Standing) */}
                          <td
                            className={cn(
                              "py-3.5 px-6 min-w-[260px] sticky left-0 z-10 bg-white group-hover:bg-gray-50/70 dark:bg-card dark:group-hover:bg-zinc-800/80 transition-shadow duration-200 border-r border-border/70 dark:border-border/70",
                              isScrolledX && "shadow-[4px_0_12px_-2px_rgba(0,0,0,0.06)] dark:shadow-[4px_0_12px_-2px_rgba(0,0,0,0.4)]"
                            )}
                          >
                            <div className="flex flex-col gap-0.5">
                              <span className="text-[13px] font-semibold text-gray-900 dark:text-zinc-100 leading-snug tracking-[-0.01em] group-hover:text-pup-maroon dark:group-hover:text-red-400 transition-colors">
                                {org.name}
                              </span>
                              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                {org.acronym && (
                                  <span className="px-1.5 py-0.5 text-[10px] font-bold font-sans tabular-nums tracking-wider rounded-md bg-gray-100 text-gray-700 dark:bg-zinc-800 dark:text-zinc-300 border border-border/70 dark:border-border shrink-0">
                                    {org.acronym}
                                  </span>
                                )}
                                <span className="text-[11px] font-medium text-gray-900 dark:text-zinc-300">
                                  {org.category}
                                </span>
                                <span className="text-gray-300 dark:text-zinc-600">·</span>
                                <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-gray-900 dark:text-zinc-300">
                                  <span
                                    className={cn(
                                      "w-1.5 h-1.5 rounded-full shrink-0",
                                      org.status === "Active"
                                        ? "bg-emerald-500 ring-2 ring-emerald-500/20"
                                        : org.status === "Probationary"
                                        ? "bg-amber-500 ring-2 ring-amber-500/20"
                                        : "bg-zinc-400"
                                    )}
                                  />
                                  {org.status}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Column 2: Faculty Adviser */}
                          <td className="py-3.5 px-6 border-r border-border/70 dark:border-border/70">
                            {org.adviserName ? (
                              <div className="min-w-0 max-w-[200px]">
                                <div className="text-xs font-semibold text-gray-900 dark:text-zinc-100 truncate">
                                  {org.adviserName}
                                </div>
                                {org.adviserEmail ? (
                                  <div className="text-[11px] text-gray-400 dark:text-zinc-500 font-sans tabular-nums truncate mt-0.5">
                                    {org.adviserEmail}
                                  </div>
                                ) : (
                                  <div className="text-[10px] text-gray-400 dark:text-zinc-500 mt-0.5">
                                    No email listed
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-gray-500 bg-gray-100/70 dark:bg-zinc-800/60 dark:text-zinc-400 rounded-lg border border-border/60 dark:border-border">
                                <UserMinus01Icon size="1em" className="text-[11px] text-gray-400 dark:text-zinc-500" />
                                <span>Unassigned</span>
                              </span>
                            )}
                          </td>

                          {/* Column 3: Archival CBL (1-Click Preview) */}
                          <td className="py-3.5 px-6 text-center whitespace-nowrap border-r border-border/70 dark:border-border/70">
                            {org.hasCbl ? (
                              <button
                                type="button"
                                onClick={() =>
                                  setPreviewCbl({
                                    url: `/api/osas/organizations/${org.id}/bylaws?file=1`,
                                    title: `${org.name}: Constitution & By-Laws (CBL)`,
                                    filename: org.cblFilename,
                                  })
                                }
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/40 hover:bg-emerald-100/90 dark:hover:bg-emerald-900/50 transition-all cursor-pointer shadow-2xs active:scale-95"
                                title={PDF_ACTION_LABELS.preview}
                              >
                                <File02Icon size="1em" className="text-xs text-emerald-600 dark:text-emerald-400" />
                                <span>Archived PDF</span>
                              </button>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-amber-700 bg-amber-50/80 border border-amber-200/70 rounded-lg dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-800/40">
                                <Clock01Icon size="1em" className="text-xs text-amber-600 dark:text-amber-400" />
                                <span>Pending PDF</span>
                              </span>
                            )}
                          </td>

                          {/* Column 4: Authorized Officers (1-Click Roster View) */}
                          <td className="py-3.5 px-6 text-center whitespace-nowrap border-r border-border/70 dark:border-border/70">
                            {org.activeOfficerCount > 0 ? (
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedOrgForOfficers(org);
                                  setOfficerSearch("");
                                }}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200/70 dark:border-blue-800/40 hover:bg-blue-100/80 dark:hover:bg-blue-900/50 transition-all cursor-pointer active:scale-95 shadow-2xs"
                                title="View authorized officers"
                              >
                                <UserSearch01Icon size="1em" className="text-xs text-blue-600 dark:text-blue-400" />
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
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-amber-700 bg-amber-50/80 border border-amber-200/70 rounded-lg dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-800/40 hover:bg-amber-100 dark:hover:bg-amber-900/50 transition-all cursor-pointer active:scale-95"
                                title="Authorize officers"
                              >
                                <span>Add Officers</span>
                              </button>
                            )}
                          </td>

                          {/* Column 5: Compliance */}
                          <td className="py-3.5 px-6 text-right whitespace-nowrap">
                            <div className="flex flex-col items-end gap-1.5">
                              <div className="flex items-center gap-2.5">
                                {/* Mini progress bar */}
                                <div className="w-16 h-1.5 rounded-full bg-gray-100 dark:bg-zinc-800 overflow-hidden hidden sm:block">
                                  <div
                                    className={cn("h-full rounded-full transition-all duration-300", barColor)}
                                    style={{ width: `${Math.min(100, Math.max(0, score))}%` }}
                                  />
                                </div>
                                <span className="font-sans tabular-nums text-xs font-bold text-gray-900 dark:text-zinc-100 min-w-[32px] text-right">
                                  {score}%
                                </span>
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    "text-[10px] font-semibold rounded-full px-2 py-0.5 border shadow-2xs",
                                    isFullyCompliant
                                      ? "bg-emerald-50 text-emerald-700 border-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/40"
                                      : isPartiallyCompliant
                                      ? "bg-amber-50 text-amber-700 border-amber-200/80 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/40"
                                      : "bg-rose-50 text-rose-700 border-rose-200/80 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/40"
                                  )}
                                >
                                  {org.complianceStatus}
                                </Badge>
                              </div>
                              {org.missingRequirements?.length > 0 && (
                                <div className="flex items-center gap-1 text-[10px] text-gray-400 dark:text-zinc-500">
                                  <span className="text-gray-400 dark:text-zinc-500">Missing:</span>
                                  <span className="text-gray-900 dark:text-zinc-300 font-medium truncate max-w-[200px]">
                                    {org.missingRequirements.join(", ")}
                                  </span>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </Table>
              ) : loading ? (
                <div className="p-6 space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full rounded-xl dark:bg-muted" />
                  ))}
                </div>
              ) : (
                <div className="rounded-b-2xl flex-1 flex flex-col items-center justify-center min-h-[420px] w-full">
                  <Empty>
                    <EmptyHeader>
                      <EmptyMedia><EmptyBuilding03Icon size="1em" /></EmptyMedia>
                      <EmptyTitle>No Student Organizations Found</EmptyTitle>
                      <EmptyDescription>
                        {activeChips.length > 0
                          ? "No organizations match the selected filter criteria. Try clearing filters."
                          : "No recognized student organizations registered in OSAS."}
                      </EmptyDescription>
                    </EmptyHeader>
                    {activeChips.length > 0 && (
                      <EmptyContent>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleResetFilters}
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
          </div>

          {/* 6. Standard Table Pagination Footer */}
          <TablePagination label="Organization compliance pages" page={page} pageSize={pageSize} totalCount={sortedOrganizations.length} displayedCount={paginatedOrganizations.length} onPageChange={setPage} onPageSizeChange={setPageSize} />
        </Card>

        {/* Authorized Officers Slide-Over Sheet */}
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
            size="default"
            showCloseButton={false}
            className="w-full sm:max-w-md md:max-w-lg lg:max-w-xl flex flex-col h-full p-0 overflow-hidden"
          >
            <SheetHeader className="shrink-0 p-0">
              <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4">
                <div>
                  <SheetTitle>
                    Organization Leadership Roster
                  </SheetTitle>
                  <SheetDescription className="sr-only">
                    Accredited Student Leadership Roster & Authorized Event Signatories
                  </SheetDescription>
                </div>

                <div className="ml-auto flex items-center gap-3">
                  {sortedOrganizations.length > 1 && (
                    <SheetPagination
                      compact
                      label="Record navigation"
                      page={Math.max(1, currentOrgIndex + 1)}
                      totalPages={sortedOrganizations.length}
                      onPrevious={handlePrevOrg}
                      onNext={handleNextOrg}
                      previousDisabled={currentOrgIndex <= 0}
                      nextDisabled={currentOrgIndex >= sortedOrganizations.length - 1}
                      previousLabel="Previous Organization"
                      nextLabel="Next Organization"
                    />
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedOrgForOfficers(null);
                      setOfficerSearch("");
                    }}
                    className="size-8 rounded-full bg-black/[0.04] hover:bg-black/[0.08] dark:bg-white/[0.08] dark:hover:bg-white/[0.14] text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-zinc-100 flex items-center justify-center transition-all cursor-pointer active:scale-95 border border-black/[0.04] dark:border-white/[0.08] shadow-2xs"
                    aria-label="Close"
                    title="Close"
                  >
                    <Cancel01Icon size="1em" className="text-sm" />
                  </button>
                </div>
              </div>
            </SheetHeader>

            {/* Line-Attached Edge-to-Edge Status Notice */}
            {selectedOrgForOfficers && (
              <div
                className={cn(
                  "flex items-center gap-2.5 px-6 py-2.5 text-xs border-b transition-colors shrink-0",
                  selectedOrgForOfficers?.status === "Active"
                    ? "border-emerald-200/90 bg-emerald-50/90 text-emerald-950 dark:border-emerald-900/40 dark:bg-emerald-950/25 dark:text-emerald-200"
                    : selectedOrgForOfficers?.status === "Inactive"
                    ? "border-amber-200/90 bg-amber-50/90 text-amber-950 dark:border-amber-900/40 dark:bg-amber-950/25 dark:text-amber-200"
                    : "border-rose-200/90 bg-rose-50/90 text-rose-950 dark:border-rose-900/40 dark:bg-rose-950/25 dark:text-rose-200"
                )}
              >
                <AppIcon
                  className={cn(
                    " text-[15px] shrink-0",
                    selectedOrgForOfficers?.status === "Active"
                      ? "Shield01Icon text-emerald-600 dark:text-emerald-400"
                      : selectedOrgForOfficers?.status === "Inactive"
                      ? "Alert01Icon text-amber-600 dark:text-amber-400"
                      : "Archive01Icon text-rose-600 dark:text-rose-400"
                  )}
                />
                <span className="font-medium text-[11.5px] sm:text-xs leading-normal">
                  <strong className="font-semibold">
                    {selectedOrgForOfficers?.status === "Active"
                      ? "Accredited Campus Organization:"
                      : selectedOrgForOfficers?.status === "Inactive"
                      ? "Inactive Accreditation:"
                      : "Archived Organization:"}
                  </strong>{" "}
                  {selectedOrgForOfficers?.status === "Active"
                    ? "Leadership roster authorized to sponsor campus events and execute official paperwork."
                    : selectedOrgForOfficers?.status === "Inactive"
                    ? "Accreditation expired or suspended. Renewal required before scheduling activities."
                    : "Archived organizational records on file for historical reference."}
                </span>
              </div>
            )}

            {/* SCROLLABLE 1-COLUMN BODY */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Summary Strip */}
              <div className="flex items-start gap-3.5 pb-4 border-b border-border/80 dark:border-border">
                <div className="w-12 h-12 rounded-full bg-blue-500/10 text-blue-600 dark:bg-blue-950/40 dark:text-blue-300 flex items-center justify-center text-xl shrink-0 font-bold border border-blue-500/20 dark:border-blue-800/40 mt-0.5">
                  <Shield01Icon size={16}  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    {selectedOrgForOfficers?.acronym && (
                      <span className="px-2 py-0.5 text-[10px] font-bold font-sans tabular-nums tracking-wider rounded-md bg-gray-100 text-gray-700 dark:bg-zinc-800 dark:text-zinc-300 border border-border/70 dark:border-border">
                        {selectedOrgForOfficers.acronym}
                      </span>
                    )}
                    <span className="px-2 py-0.5 text-[10px] font-medium rounded-md bg-gray-100 text-gray-700 dark:bg-zinc-800 dark:text-zinc-300">
                      {selectedOrgForOfficers?.category || "Student Org"}
                    </span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200/50 dark:border-emerald-800/40">
                      {selectedOrgForOfficers?.status || "Active"}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-gray-900 dark:text-zinc-100 leading-snug break-words">
                    {selectedOrgForOfficers?.name}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">
                    Adviser: <strong className="text-gray-900 dark:text-zinc-200">{selectedOrgForOfficers?.adviserName || "Unassigned"}</strong>
                  </p>
                </div>
              </div>

              {/* SECTION 1: Leadership Overview (Unboxed InfoRow) */}
              <div className="space-y-2">
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-zinc-500">
                  Organization Standing
                </h4>
                <div className="divide-y divide-gray-100/70 dark:divide-zinc-800/50">
                  <InfoRow icon="Tag01Icon" label="Category" value={selectedOrgForOfficers?.category || "Student Org"} />

                  <InfoRow icon="TeacherIcon" label="Faculty Adviser">
                    <span>
                      {selectedOrgForOfficers?.adviserName || "Unassigned"}
                      {selectedOrgForOfficers?.adviserEmail && (
                        <span className="text-gray-400 font-normal ml-1">({selectedOrgForOfficers.adviserEmail})</span>
                      )}
                    </span>
                  </InfoRow>

                  <InfoRow
                    icon="Shield01Icon"
                    label="Accredited Officers"
                    value={`${selectedOrgForOfficers?.activeOfficerCount || 0} Authorized ${selectedOrgForOfficers?.activeOfficerCount === 1 ? "Officer" : "Officers"}`}
                  />

                  <InfoRow icon="PieChartIcon" label="Accreditation Status">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200/50 dark:border-emerald-800/40">
                      {selectedOrgForOfficers?.status || "Active"}
                    </span>
                  </InfoRow>
                </div>
              </div>

              {/* SECTION 2: Accredited Officers Roster */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-zinc-500">
                    Accredited Officer Roster
                  </h4>
                  <span className="text-[10px] font-semibold text-gray-400 dark:text-zinc-500 font-sans tabular-nums">
                    {selectedOrgForOfficers?.officers?.length || 0} registered
                  </span>
                </div>

                {/* In-Sheet Search Filter */}
                {selectedOrgForOfficers?.officers && selectedOrgForOfficers.officers.length > 2 && (
                  <div className="relative">
                    <Search01Icon size="1em" className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs" />
                    <Input
                      value={officerSearch}
                      onChange={(e) => setOfficerSearch(e.target.value)}
                      placeholder="Search by name, position, or email..."
                      className="h-9 pl-8 pr-8 text-xs rounded-xl bg-white dark:bg-zinc-800 border-border dark:border-border shadow-none focus-visible:outline-none focus-visible:border-pup-maroon focus-visible:ring-1 focus-visible:ring-pup-maroon dark:focus-visible:border-red-500 dark:focus-visible:ring-red-500"
                    />
                  </div>
                )}

                {/* Officers List */}
                <div className="space-y-2.5">
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
                        <EmptyState
                          variant="compact"
                          icon={UserGroupIcon}
                          title="No Officers Found"
                          description={officerSearch.trim()
                            ? "No student officers match your search query."
                            : "This organization has no active student officers authorized by OSAS."}
                        />
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
                          className="flex items-center justify-between gap-3 p-3.5 rounded-xl border border-border/80 dark:border-border bg-gray-50/40 dark:bg-zinc-900/40 hover:border-border dark:hover:border-white/20 transition-all shadow-2xs group"
                        >
                          {/* Left: Avatar + Details */}
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="shrink-0">
                              <Avatar className={cn("size-10 rounded-full ring-2 shadow-2xs font-jakarta", roleStyle.ring)}>
                                {avatarSrc && (
                                  <AvatarImage
                                    src={avatarSrc}
                                    alt={officer.name}
                                    className="rounded-full object-cover"
                                  />
                                )}
                                <AvatarFallback
                                  className={cn(
                                    "rounded-full font-bold text-xs tracking-wider bg-gradient-to-br select-none",
                                    roleStyle.gradient
                                  )}
                                >
                                  {initials}
                                </AvatarFallback>
                              </Avatar>
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <h5 className="text-xs font-bold text-gray-900 dark:text-zinc-50 truncate">
                                  {officer.name}
                                </h5>
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    "text-[9px] font-semibold px-2 py-0 rounded-full border",
                                    roleStyle.badge
                                  )}
                                >
                                  {officer.position}
                                </Badge>
                              </div>

                              <div className="mt-0.5 flex items-center gap-2 flex-wrap text-[11px] text-gray-500 dark:text-zinc-400">
                                {officer.studentNo && (
                                  <span className="font-sans tabular-nums text-[10px] text-gray-600 dark:text-zinc-400">
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
                                  className="group/btn inline-flex items-center gap-1 font-sans tabular-nums text-[10px] text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-zinc-100 transition-colors cursor-pointer"
                                  title="Click to copy email"
                                >
                                  <Mail01Icon size="1em" className="text-[11px] text-gray-400 group-hover/btn:text-pup-maroon dark:group-hover/btn:text-red-400" />
                                  <span className="truncate max-w-[160px]">{officer.email}</span>
                                  <Copy01Icon size="1em" className="text-[10px] opacity-0 group-hover/btn:opacity-100 transition-opacity" />
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* Right: Authorization Pill */}
                          <div className="shrink-0">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/40">
                              <Shield01Icon size="1em" className="text-xs text-emerald-600 dark:text-emerald-400" />
                              <span>Signatory</span>
                            </span>
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>
            </div>

            {/* STICKY SHEET FOOTER */}
            <SheetFooter className="shrink-0 p-4 px-6 flex flex-row items-center justify-between shrink-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setSelectedOrgForOfficers(null);
                  setOfficerSearch("");
                }}
                className="h-10 px-5 text-xs font-semibold rounded-xl border border-border dark:border-border bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-xs cursor-pointer active:scale-95 transition-all"
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

        <PDFPreviewModal
          open={reportOpen}
          onClose={() => {
            previewSession.cancel();
            setIsGeneratingPdf(false);
            setPdfBlobUrl(null);
            setReportOpen(false);
          }}
          title="Official OSAS Student Organization Compliance Report"
          description="Student organization compliance and accreditation records."
          pdfUrl={pdfBlobUrl}
          isPreparing={isGeneratingPdf}
          onDownload={handleDownloadPdf}
          onPrintError={(error) => showToast?.(formatErrorMessage(error, { defaultTitle: "Report Printing Failed" }), true)}
        />
      </div>
    </TooltipProvider>
  );
}
