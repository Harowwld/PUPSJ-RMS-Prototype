"use client";

import { isInManilaDateRange } from "@/lib/timeFormat";
import useWorkspaceViewPreference from "@/hooks/useWorkspaceViewPreference"
import { Table } from "@/components/ui/table";
import TablePagination from "@/components/shared/TablePagination";

import SheetPagination from "@/components/shared/SheetPagination";
import usePdfPreviewSession from "@/hooks/usePdfPreviewSession";
import { PDF_ACTION_LABELS } from "@/lib/pdfPreview";
import useUrlPage from "@/hooks/useUrlPage";
import React, { Fragment, useCallback, useEffect, useMemo, useState } from "react";

import PageHeader from "@/components/shared/PageHeader";
import { RefreshButton } from "@/components/shared/RefreshButton";
import PDFPreviewModal from "@/components/shared/PDFPreviewModal";
import { formatErrorMessage } from "@/lib/errorUtils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import OsasComplianceTableSkeleton from "./skeletons/OsasComplianceTableSkeleton";
import { SegmentedControl } from "@/components/ui/tabs";
import DashboardSearch from "@/components/shared/DashboardSearch";
import {
  FilterPopover,
  SortPopover,
  GroupPopover,
  ColumnsPopover,
  ActiveFilterChips,
} from "@/components/systemadmin/OfficeTableControls";
import { DateRangeFilterButton } from "@/components/shared/DateRangePickerModal";
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
import { TooltipProvider } from "@/components/ui/tooltip";
import { generateOrganizationCompliancePdf } from "@/lib/pdfGenerator";
import { downloadOrganizationComplianceCsv, generateExportFilename } from "@/lib/exportHelpers";
import { cn } from "@/lib/utils";
import CopyButton from "@/components/shared/CopyButton";
import { COMPACT_BADGE_BASE, BADGE_BASE, BADGE_PALETTES } from "@/lib/badgeStyles";
import { Building03Icon as EmptyBuilding03Icon, UserGroupIcon, ArrowDown01Icon, ArrowUp01Icon, ArrowUpDownIcon, Building01Icon, Cancel01Icon, CheckmarkBadge01Icon, File02Icon, Loading01Icon, Search01Icon, Shield01Icon, Tick01Icon, UserMinus01Icon } from "hugeicons-react";
import AppIcon from "@/components/ui/app-icon";
function formatChipDate(dateStr) {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return dateStr;
  }
}

const CATEGORIES = ["All", "Academic", "Non-Academic"];

function getOfficerRoleStyle(position = "") {
  const pos = position.toLowerCase();
  if (pos.includes("president") && !pos.includes("vice")) {
    return {
      gradient: "from-blue-700 via-blue-600 to-indigo-600 text-white",
      ring: "ring-blue-500/30 dark:ring-blue-400/30",
      badge: BADGE_PALETTES.blue,
    };
  }
  if (pos.includes("vice")) {
    return {
      gradient: "from-indigo-800 via-indigo-600 to-blue-600 text-white",
      ring: "ring-indigo-500/30 dark:ring-indigo-400/30",
      badge: BADGE_PALETTES.indigo,
      icon: " Shield01Icon",
    };
  }
  if (pos.includes("secretary")) {
    return {
      gradient: "from-emerald-800 via-emerald-600 to-teal-600 text-white",
      ring: "ring-emerald-500/30 dark:ring-emerald-400/30",
      badge: BADGE_PALETTES.emerald,
      icon: " Notebook01Icon",
    };
  }
  if (pos.includes("treasurer") || pos.includes("finance")) {
    return {
      gradient: "from-amber-700 via-amber-600 to-yellow-600 text-white",
      ring: "ring-amber-500/30 dark:ring-amber-400/30",
      badge: BADGE_PALETTES.amber,
      icon: " Coins01Icon",
    };
  }
  if (pos.includes("auditor")) {
    return {
      gradient: "from-purple-800 via-purple-600 to-violet-600 text-white",
      ring: "ring-purple-500/30 dark:ring-purple-400/30",
      badge: BADGE_PALETTES.purple,
      icon: " JusticeScale01Icon",
    };
  }
  return {
    gradient: "from-slate-700 via-slate-600 to-zinc-700 text-white",
    ring: "ring-gray-300/30 dark:ring-white/10",
    badge: BADGE_PALETTES.gray,
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
  const [filterRules, setFilterRules] = useWorkspaceViewPreference("organization_compliance", "filterRules", []);
  const [groupBy, setGroupBy] = useWorkspaceViewPreference("organization_compliance", "groupBy", "none");
  const [visibleColumns, setVisibleColumns] = useWorkspaceViewPreference("organization_compliance", "visibleColumns", [
    "name",
    "adviser",
    "cbl",
    "officers",
    "complianceScore",
  ]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Sorting
  const [sortBy, setSortBy] = useWorkspaceViewPreference("organization_compliance", "sortBy", "complianceScore");
  const [sortOrder, setSortOrder] = useWorkspaceViewPreference("organization_compliance", "sortOrder", "desc");

  // Pagination
  const [page, setPage] = useUrlPage();
  const [pageSize, setPageSize] = useState(20);

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

  // Standard Table Control Options
  const filterFields = useMemo(() => [
    {
      id: "compliance",
      key: "compliance",
      label: "Compliance Status",
      type: "select",
      options: [
        { value: "Compliant", label: "Compliant (100%)", count: counts.Compliant },
        { value: "Partially Compliant", label: "Partially Compliant (50-75%)", count: counts["Partially Compliant"] },
        { value: "Action Required", label: "Action Required (<50%)", count: counts["Action Required"] },
      ],
    },
    {
      id: "standing",
      key: "standing",
      label: "Organization Standing",
      type: "select",
      options: [
        { value: "Active", label: "Active", count: counts.Active },
        { value: "Probationary", label: "Probationary", count: counts.Probationary },
        { value: "Inactive", label: "Inactive", count: counts.Inactive },
        { value: "Archived", label: "Archived", count: counts.Archived },
      ],
    },
    {
      id: "cbl",
      key: "cbl",
      label: "Constitution & By-Laws (CBL)",
      type: "select",
      options: [
        { value: "archived", label: "CBL Archived", count: counts.cblArchived },
        { value: "pending", label: "CBL Pending", count: counts.cblPending },
      ],
    },
    {
      id: "officers",
      key: "officers",
      label: "Authorized Officers",
      type: "select",
      options: [
        { value: "roster", label: "Authorized Officers", count: counts.officersPresent },
        { value: "empty", label: "No Officers Recorded", count: counts.officersEmpty },
      ],
    },
  ], [counts]);

  const sortOptions = useMemo(() => [
    { value: "complianceScore", label: "Compliance Score" },
    { value: "name", label: "Organization Name" },
    { value: "hasCbl", label: "Archival CBL" },
    { value: "activeOfficerCount", label: "Authorized Officers" },
  ], []);

  const groupOptions = useMemo(() => [
    { value: "category", label: "Category" },
    { value: "compliance", label: "Compliance Status" },
    { value: "standing", label: "Standing" },
    { value: "none", label: "No grouping" },
  ], []);

  const tableColumns = useMemo(() => [
    { key: "name", label: "Organization" },
    { key: "adviser", label: "Faculty Adviser" },
    { key: "cbl", label: "Archival CBL" },
    { key: "officers", label: "Authorized Officers" },
    { key: "complianceScore", label: "Compliance" },
  ], []);

  const handleResetFilters = useCallback(() => {
    setSearch("");
    setCategoryFilter("All");
    setComplianceFilters([]);
    setStandingFilters([]);
    setCblFilters([]);
    setOfficerFilters([]);
    setFilterRules([]);
    setStartDate("");
    setEndDate("");
    setPage(1);
  }, [setPage, setFilterRules]);

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
        const hasArchivedRule = filterRules.some((r) => r.fieldKey === "standing" && r.value === "Archived");
        if (org.status === "Archived" && !hasArchivedRule) return false;
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

      // 7. FilterPopover rules
      for (const rule of filterRules) {
        if (rule.fieldKey === "compliance") {
          const compStatus = org.complianceStatus || org.compliance_status;
          const match = compStatus === rule.value;
          if (rule.operator === "is_not" ? match : !match) return false;
        } else if (rule.fieldKey === "standing") {
          const match = org.status === rule.value;
          if (rule.operator === "is_not" ? match : !match) return false;
        } else if (rule.fieldKey === "cbl") {
          const hasCbl = Boolean(org.hasCbl ?? org.checklist?.cbl ?? org.checklist?.has_cbl);
          const cblVal = hasCbl ? "archived" : "pending";
          const match = cblVal === rule.value;
          if (rule.operator === "is_not" ? match : !match) return false;
        } else if (rule.fieldKey === "officers") {
          const hasOfficers = Boolean((org.activeOfficerCount > 0) || org.checklist?.officers || org.checklist?.has_officers);
          const offVal = hasOfficers ? "roster" : "empty";
          const match = offVal === rule.value;
          if (rule.operator === "is_not" ? match : !match) return false;
        }
      }

      return isInManilaDateRange(org.createdAt, startDate, endDate);
    });
  }, [
    organizations,
    search,
    categoryFilter,
    complianceFilters,
    standingFilters,
    cblFilters,
    officerFilters,
    filterRules,
    startDate,
    endDate,
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

  const groupedPaginatedOrganizations = useMemo(() => {
    if (groupBy === "none") return [{ groupKey: null, label: null, items: paginatedOrganizations }];
    const map = new Map();
    for (const org of paginatedOrganizations) {
      let key = "Other";
      if (groupBy === "category") key = org.category || "General";
      else if (groupBy === "compliance") key = org.complianceStatus || org.compliance_status || "Other";
      else if (groupBy === "standing") key = org.status || "Active";

      if (!map.has(key)) map.set(key, []);
      map.get(key).push(org);
    }
    return Array.from(map.entries()).map(([label, items]) => ({
      groupKey: label,
      label,
      items,
    }));
  }, [paginatedOrganizations, groupBy]);

  const {
    containerRef: tableContainerRef,
    isScrolledX,
    scrollLeft,
    scrollRight,
    resetScroll,
  } = useTableScroll([paginatedOrganizations.length]);

  useEffect(() => {
    resetScroll();
  }, [page, search, categoryFilter, filterRules, startDate, endDate, groupBy, sortBy, sortOrder, pageSize, resetScroll]);

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
    filterRules.forEach((rule) => {
      const field = filterFields.find((f) => f.key === rule.fieldKey);
      const fieldLabel = field?.label || rule.fieldKey;
      const optionLabel = field?.options?.find((o) => String(o.value) === String(rule.value))?.label || rule.value;
      chips.push({
        id: rule.id,
        label: `${fieldLabel} ${rule.operator === "is_not" ? "is not" : "is"} ${optionLabel}`,
        onRemove: () => {
          setFilterRules((prev) => prev.filter((r) => r.id !== rule.id));
          setPage(1);
        },
      });
    });
    if (startDate || endDate) {
      chips.push({
        id: "dateRange",
        label: `Date: ${formatChipDate(startDate)} – ${formatChipDate(endDate)}`,
        onRemove: () => {
          setStartDate("");
          setEndDate("");
          setPage(1);
        },
      });
    }
    return chips;
  }, [search, filterRules, filterFields, startDate, endDate, setPage, setFilterRules]);

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
        <Card className="flex flex-[1_0_auto] h-auto w-full flex-col p-0 gap-0 overflow-hidden rounded-2xl border border-border bg-white shadow-sm dark:border-border dark:bg-card dark:shadow-none isolate font-jakarta">
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
                  className="h-9 w-9"
                />

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleExportCsv}
                  disabled={loading || organizations.length === 0 || isExportingCsv}
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
                  onClick={handleOpenPdfReport}
                  disabled={loading || organizations.length === 0 || isGeneratingPdf}
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
          {loading && !manualLoading && !data ? (
            <div className="px-6 pb-6">
              <div className="p-3 sm:p-3.5 rounded-[22px] bg-[#f4f5f7] dark:bg-zinc-900/60 border border-black/[0.05] dark:border-white/[0.08]">
                <KpiStatCardsSkeleton count={3} />
              </div>
            </div>
          ) : !error && data ? (
            <div className="px-6 pb-6">
              <div
                className={cn(
                  "p-3 sm:p-3.5 rounded-[22px] bg-[#f4f5f7] dark:bg-zinc-900/60 border border-black/[0.05] dark:border-white/[0.08] transition-all duration-slow",
                  loading && !manualLoading ? "opacity-40 blur-[1px] grayscale-[0.1]" : "opacity-100"
                )}
              >
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
                  {/* Card 1: Accreditation Rate */}
                  <div className="rounded-[18px] p-4 sm:p-4.5 bg-white dark:bg-zinc-800 border border-black/[0.06] dark:border-white/[0.08] shadow-[0_2px_8px_rgba(0,0,0,0.03),0_1px_2px_rgba(0,0,0,0.02)] flex flex-col justify-between select-none">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="size-5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                          <CheckmarkBadge01Icon size="0.75em" />
                        </div>
                        <span className="text-xs font-semibold text-gray-500 dark:text-zinc-400 tracking-tight">
                          Accreditation Rate
                        </span>
                      </div>
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-black/[0.04] dark:bg-white/[0.06] text-xs font-jakarta select-none">
                        <span className="size-3.5 rounded-full bg-emerald-600 dark:bg-emerald-500 text-white inline-flex items-center justify-center shrink-0">
                          <Tick01Icon size={8} className="stroke-[3]" />
                        </span>
                        <span className="font-semibold text-gray-900 dark:text-zinc-100">Accredited</span>
                      </span>
                    </div>
                    <div className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900 dark:text-zinc-50 font-jakarta mt-2 tabular-nums">
                      {filteredSummary.overallComplianceRate}%
                    </div>
                    <div className="text-[11.5px] text-gray-400 dark:text-zinc-500 mt-2 font-medium tabular-nums">
                      {filteredSummary.fullyCompliantCount} of {filteredSummary.totalOrganizations} accredited
                      {isFiltered ? ` · Campus: ${summary?.overallComplianceRate ?? 0}%` : ""}
                    </div>
                  </div>

                  {/* Card 2: Recognized Orgs */}
                  <div className="rounded-[18px] p-4 sm:p-4.5 bg-white dark:bg-zinc-800 border border-black/[0.06] dark:border-white/[0.08] shadow-[0_2px_8px_rgba(0,0,0,0.03),0_1px_2px_rgba(0,0,0,0.02)] flex flex-col justify-between select-none">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="size-5 rounded-full bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                          <Building01Icon size="0.75em" />
                        </div>
                        <span className="text-xs font-semibold text-gray-500 dark:text-zinc-400 tracking-tight">
                          Recognized Orgs
                        </span>
                      </div>
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-black/[0.04] dark:bg-white/[0.06] text-xs font-jakarta select-none">
                        <Building01Icon size={12} className="text-blue-600 dark:text-blue-400 shrink-0" />
                        <span className="font-semibold text-gray-900 dark:text-zinc-100">Active Cycle</span>
                      </span>
                    </div>
                    <div className="text-xl sm:text-2xl font-bold tracking-tight text-blue-600 dark:text-blue-400 font-jakarta mt-2 tabular-nums">
                      {filteredSummary.totalOrganizations.toLocaleString()}
                    </div>
                    <div className="text-[11.5px] text-gray-400 dark:text-zinc-500 mt-2 font-medium tabular-nums">
                      {filteredSummary.academicCount} Academic · {filteredSummary.nonAcademicCount} Non-Academic
                      {isFiltered ? ` (of ${organizations.length})` : ""}
                    </div>
                  </div>

                  {/* Card 3: CBL Archival Rate */}
                  <div className="rounded-[18px] p-4 sm:p-4.5 bg-white dark:bg-zinc-800 border border-black/[0.06] dark:border-white/[0.08] shadow-[0_2px_8px_rgba(0,0,0,0.03),0_1px_2px_rgba(0,0,0,0.02)] flex flex-col justify-between select-none">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="size-5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                          <File02Icon size="0.75em" />
                        </div>
                        <span className="text-xs font-semibold text-gray-500 dark:text-zinc-400 tracking-tight">
                          CBL Archival Rate
                        </span>
                      </div>
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-black/[0.04] dark:bg-white/[0.06] text-xs font-jakarta select-none">
                        <File02Icon size={12} className="text-amber-600 dark:text-amber-400 shrink-0" />
                        <span className="font-semibold text-gray-900 dark:text-zinc-100">Digitized</span>
                      </span>
                    </div>
                    <div className="text-xl sm:text-2xl font-bold tracking-tight text-amber-600 dark:text-amber-400 font-jakarta mt-2 tabular-nums">
                      {filteredSummary.cblArchivedRate}%
                    </div>
                    <div className="text-[11.5px] text-gray-400 dark:text-zinc-500 mt-2 font-medium tabular-nums">
                      {filteredSummary.cblArchivedCount} of {filteredSummary.totalOrganizations} digitized
                      {isFiltered ? ` · Campus: ${summary?.cblArchivedRate ?? 0}%` : ""}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {/* Connected Row: Category Navigation Segmented Control */}
          <div
            role="group"
            aria-label="Organization categories"
            className="flex items-center justify-between px-6 py-2.5 border-t border-border dark:border-white/10 bg-white dark:bg-card overflow-x-auto scrollbar-none gap-4 select-none"
          >
            <SegmentedControl
              value={categoryFilter}
              onValueChange={(val) => { setCategoryFilter(val); setPage(1); }}
              variant="capsule"
              className="inline-grid grid-flow-col auto-cols-fr shrink-0"
              items={CATEGORIES.map((cat) => ({
                value: cat,
                label: cat === "All" ? "All Organizations" : `${cat} Orgs`,
                badge: cat === "All" ? organizations.length : organizations.filter((o) => o.category === cat).length,
              }))}
            />
          </div>

          {/* 3. Canonical 2-Zone DataViewToolbar */}
          <DataViewToolbar
            label="Organization compliance search and filters"
            className="border-t border-border dark:border-border p-4 sm:px-5 sm:py-3 gap-2 bg-white dark:bg-card flex flex-wrap items-center justify-between select-none"
          >
            {/* Left Zone: DashboardSearch + TableScrollControls */}
            <div className="flex min-w-0 items-center gap-2">
              <DashboardSearch
                value={search}
                onChange={(val) => { setSearch(val); setPage(1); resetScroll(); }}
                count={filteredOrganizations.length}
                loading={loading}
                placeholder="Search org, acronym, adviser..."
                label="Search organization compliance"
              />
              <TableScrollControls
                scrollContainerRef={tableContainerRef}
                onScrollLeft={scrollLeft}
                onScrollRight={scrollRight}
                onResetScroll={resetScroll}
                isScrolled={isScrolledX}
              />
            </div>

            {/* Right Zone: Filter -> Sort -> Group -> Columns -> DateRange */}
            <div className="ml-auto flex shrink-0 items-center gap-2">
              <FilterPopover
                fields={filterFields}
                filters={filterRules}
                onFiltersChange={(newRules) => { setFilterRules(newRules); setPage(1); }}
                entityLabel="organizations"
              />
              <SortPopover
                options={sortOptions}
                sortBy={sortBy}
                onSortByChange={(val) => { setSortBy(val); setPage(1); }}
                sortOrder={sortOrder}
                onSortOrderChange={(val) => { setSortOrder(val); setPage(1); }}
              />
              <GroupPopover
                options={groupOptions}
                groupBy={groupBy}
                onGroupByChange={(val) => { setGroupBy(val); setPage(1); }}
              />
              <ColumnsPopover
                columns={tableColumns}
                visibleColumns={visibleColumns}
                onVisibleColumnsChange={setVisibleColumns}
                minVisible={2}
              />
              <DateRangeFilterButton
                startDate={startDate}
                endDate={endDate}
                onApply={({ startDate: s, endDate: e }) => { setStartDate(s); setEndDate(e); setPage(1); }}
                onClear={() => { setStartDate(""); setEndDate(""); setPage(1); }}
                disableFutureDates={true}
              />
            </div>
          </DataViewToolbar>

          {/* 4. Active Filter Chips */}
          {activeChips.length > 0 && (
            <ActiveFilterChips
              chips={activeChips}
              onClearAll={handleResetFilters}
              className="border-t border-border dark:border-border px-6 py-2.5"
            />
          )}

          {/* 5. Main Content Area: Organizations Compliance Table */}
          <div className="flex flex-[1_0_auto] flex-col border-t border-border dark:border-border bg-white dark:bg-card">
            <div
              ref={tableContainerRef}
              className="w-full flex-[1_0_auto] overflow-x-auto show-scrollbar pb-2"
            >
              {sortedOrganizations.length > 0 ? (
                <Table
                  columns={tableColumns.filter(({ key }) => visibleColumns.includes(key)).map(({ key: colKey }) => {
                    if (colKey === "name") return { kind: "text", minWidth: 260, maxWidth: 380 };
                    if (colKey === "adviser") return { kind: "text", maxWidth: 350 };
                    if (colKey === "cbl") return { kind: "status", width: 180 };
                    if (colKey === "officers") return { kind: "status", width: 180 };
                    return { kind: "number", width: 220 };
                  })}
                >
                  <thead className="sticky top-0 z-10 border-b border-border bg-gray-50/90 dark:bg-zinc-900/90 backdrop-blur-xs select-none">
                    <tr className="text-left text-xs font-semibold text-gray-500 dark:text-zinc-400">
                      {/* Column 1: Organization */}
                      {visibleColumns.includes("name") && (
                        <th
                          className={cn(
                            "py-3 px-6 min-w-[260px] sticky left-0 z-20 bg-gray-50/90 dark:bg-zinc-900/90 backdrop-blur-xs transition-shadow duration-200",
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
                          </div>
                        </th>
                      )}

                      {/* Column 2: Faculty Adviser */}
                      {visibleColumns.includes("adviser") && (
                        <th className="py-3 px-6">
                          <span className="text-xs font-semibold text-gray-500 dark:text-zinc-400">
                            Faculty Adviser
                          </span>
                        </th>
                      )}

                      {/* Column 3: Archival CBL */}
                      {visibleColumns.includes("cbl") && (
                        <th className="py-3 px-6 text-center">
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
                      )}

                      {/* Column 4: Authorized Officers */}
                      {visibleColumns.includes("officers") && (
                        <th className="py-3 px-6 text-center">
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
                      )}

                      {/* Column 5: Compliance */}
                      {visibleColumns.includes("complianceScore") && (
                        <th className="py-3 px-6 text-right">
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
                      )}
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-border dark:divide-border bg-white dark:bg-card">
                    {groupedPaginatedOrganizations.map((group) => (
                      <Fragment key={group.groupKey || "root"}>
                        {group.label && (
                          <tr className="bg-gray-50/70 dark:bg-zinc-800/60 border-y border-border">
                            <td colSpan={visibleColumns.length} className="px-6 py-2 text-xs font-semibold text-gray-700 dark:text-zinc-300">
                              <span className="font-bold">{group.label}</span>
                              <span className="ml-2 font-normal text-muted-foreground">({group.items.length})</span>
                            </td>
                          </tr>
                        )}
                        {group.items.map((org) => {
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
                              {visibleColumns.includes("name") && (
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
                                        <span className="px-1.5 py-0.5 text-[10px] font-bold font-sans tabular-nums tracking-wider rounded-lg bg-gray-100 text-gray-700 dark:bg-zinc-800 dark:text-zinc-300 border border-border/70 dark:border-border shrink-0">
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
                              )}

                              {/* Column 2: Faculty Adviser */}
                              {visibleColumns.includes("adviser") && (
                                <td className="py-3.5 px-6 border-r border-border/70 dark:border-border/70">
                                  {org.adviserName ? (
                                    <div className="min-w-0 max-w-[400px]">
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
                              )}

                              {/* Column 3: Archival CBL (1-Click Preview) */}
                              {visibleColumns.includes("cbl") && (
                                <td className="py-3.5 px-6 text-center whitespace-nowrap border-r border-border/70 dark:border-border/70">
                                  {org.hasCbl ? (
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="xs"
                                      onClick={() =>
                                        setPreviewCbl({
                                          url: `/api/osas/organizations/${org.id}/bylaws?file=1`,
                                          title: `${org.name}: Constitution & By-Laws (CBL)`,
                                          filename: org.cblFilename,
                                        })
                                      }
                                      title={PDF_ACTION_LABELS.preview}
                                    >
                                      <span>Preview PDF</span>
                                    </Button>
                                  ) : (
                                    <span className={cn(BADGE_BASE, BADGE_PALETTES.amber)}>Pending PDF</span>
                                  )}
                                </td>
                              )}

                              {/* Column 4: Authorized Officers (1-Click Roster View) */}
                              {visibleColumns.includes("officers") && (
                                <td className="py-3.5 px-6 text-center whitespace-nowrap border-r border-border/70 dark:border-border/70">
                                  {org.activeOfficerCount > 0 ? (
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="xs"
                                      onClick={() => {
                                        setSelectedOrgForOfficers(org);
                                        setOfficerSearch("");
                                      }}
                                      title="View authorized officers"
                                    >
                                      View roster ({org.activeOfficerCount})
                                    </Button>
                                  ) : (
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="xs"
                                      onClick={() => {
                                        setSelectedOrgForOfficers(org);
                                        setOfficerSearch("");
                                      }}
                                      title="Authorize officers"
                                    >
                                      Add Officers
                                    </Button>
                                  )}
                                </td>
                              )}

                              {/* Column 5: Compliance */}
                              {visibleColumns.includes("complianceScore") && (
                                <td className="py-3.5 px-4 text-right whitespace-nowrap">
                                  <div className="flex flex-col items-end gap-1 min-w-0">
                                    <div className="flex items-center justify-end gap-2">
                                      {/* Mini progress bar */}
                                      <div className="w-10 h-1.5 rounded-full bg-gray-100 dark:bg-zinc-800 overflow-hidden hidden sm:block shrink-0">
                                        <div
                                          className={cn("h-full rounded-full transition-all duration-300", barColor)}
                                          style={{ width: `${Math.min(100, Math.max(0, score))}%` }}
                                        />
                                      </div>
                                      <span className="font-sans tabular-nums text-xs font-bold text-gray-900 dark:text-zinc-100 min-w-[28px] text-right shrink-0">
                                        {score}%
                                      </span>
                                      <span
                                        className={cn(isFullyCompliant
                                          ? BADGE_PALETTES.emerald
                                          : isPartiallyCompliant
                                          ? BADGE_PALETTES.amber
                                          : BADGE_PALETTES.rose, BADGE_BASE, "shrink-0")}
                                      >
                                        {org.complianceStatus}
                                      </span>
                                    </div>
                                    {org.missingRequirements?.length > 0 && (
                                      <div
                                        className="max-w-full truncate text-[10px] text-gray-400 dark:text-zinc-500"
                                        title={`Missing: ${org.missingRequirements.join(", ")}`}
                                      >
                                        <span>Missing: </span>
                                        <span className="text-rose-600 dark:text-rose-400 font-medium">
                                          {org.missingRequirements.join(", ")}
                                        </span>
                                      </div>
                                    )}
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
              ) : loading && !data ? (
                <OsasComplianceTableSkeleton visibleColumns={visibleColumns} />
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
              )}
            </div>
          </div>

          {/* 6. Standard Table Pagination Footer */}
          {sortedOrganizations.length > 0 && (
            <TablePagination label="Organization compliance pages" page={page} pageSize={pageSize} totalCount={sortedOrganizations.length} displayedCount={paginatedOrganizations.length} onPageChange={setPage} onPageSizeChange={setPageSize} />
          )}
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
                  <Shield01Icon size={16} />
                </div>
                <div className="min-w-0 flex-1">
                  {selectedOrgForOfficers?.acronym && (
                    <div className="mb-1">
                      <span className="px-2 py-0.5 text-[10px] font-bold font-sans tabular-nums tracking-wider rounded-md bg-gray-100 text-gray-700 dark:bg-zinc-800 dark:text-zinc-300 border border-border/70 dark:border-border">
                        {selectedOrgForOfficers.acronym}
                      </span>
                    </div>
                  )}
                  <h3 className="text-sm font-bold text-gray-900 dark:text-zinc-100 leading-snug break-words">
                    {selectedOrgForOfficers?.name}
                  </h3>
                  {selectedOrgForOfficers?.description ? (
                    <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5 line-clamp-2">
                      {selectedOrgForOfficers.description}
                    </p>
                  ) : null}
                </div>
              </div>

              {/* SECTION 1: Organization & Compliance Summary (Unboxed InfoRow) */}
              <div className="space-y-2">
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-zinc-500">
                  Organization & Compliance Summary
                </h4>
                <div className="divide-y divide-gray-100/70 dark:divide-zinc-800/50">
                  <InfoRow icon="Tag01Icon" label="Category" value={selectedOrgForOfficers?.category || "Student Org"} />

                  <InfoRow icon="Shield01Icon" label="Standing">
                    <span
                      className={cn(
                        selectedOrgForOfficers?.status === "Active"
                          ? BADGE_PALETTES.emerald
                          : selectedOrgForOfficers?.status === "Probationary"
                          ? BADGE_PALETTES.amber
                          : BADGE_PALETTES.slate || BADGE_PALETTES.rose,
                        BADGE_BASE
                      )}
                    >
                      {selectedOrgForOfficers?.status || "Active"}
                    </span>
                  </InfoRow>

                  <InfoRow icon="TeacherIcon" label="Faculty Adviser">
                    <span>
                      {selectedOrgForOfficers?.adviserName || "Unassigned"}
                      {selectedOrgForOfficers?.adviserEmail && (
                        <span className="text-gray-400 font-normal ml-1">({selectedOrgForOfficers.adviserEmail})</span>
                      )}
                    </span>
                  </InfoRow>

                  <InfoRow icon="File02Icon" label="Archival CBL">
                    {selectedOrgForOfficers?.hasCbl ? (
                      <button
                        type="button"
                        onClick={() =>
                          setPreviewCbl({
                            url: `/api/osas/organizations/${selectedOrgForOfficers.id}/bylaws?file=1`,
                            title: `${selectedOrgForOfficers.name}: Constitution & By-Laws (CBL)`,
                            filename: selectedOrgForOfficers.cblFilename,
                          })
                        }
                        className="inline-flex items-center px-2 py-0.5 text-[11px] font-semibold rounded-md bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/40 hover:bg-emerald-100/90 dark:hover:bg-emerald-900/50 transition-all cursor-pointer active:scale-95"
                        title={PDF_ACTION_LABELS.preview}
                      >
                        Archived PDF
                      </button>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 text-[11px] font-medium text-amber-700 bg-amber-50/80 border border-amber-200/70 rounded-md dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-800/40">
                        Pending PDF
                      </span>
                    )}
                  </InfoRow>

                  <InfoRow icon="PieChartIcon" label="Compliance">
                    <span className="inline-flex items-center gap-2">
                      <span className="font-sans tabular-nums font-bold text-gray-900 dark:text-zinc-100">
                        {selectedOrgForOfficers?.complianceScore ?? 0}%
                      </span>
                      <span
                        className={cn(
                          selectedOrgForOfficers?.complianceScore === 100
                            ? BADGE_PALETTES.emerald
                            : (selectedOrgForOfficers?.complianceScore ?? 0) >= 50
                            ? BADGE_PALETTES.amber
                            : BADGE_PALETTES.rose,
                          BADGE_BASE
                        )}
                      >
                        {selectedOrgForOfficers?.complianceStatus || "Action Required"}
                      </span>
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
                    <Search01Icon size="1em" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 z-10 text-gray-400 text-xs" />
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
                          className="flex items-center justify-between gap-3 p-3.5 rounded-xl border border-border/70 dark:border-border/60 bg-gray-50/70 dark:bg-zinc-800/40 hover:border-border dark:hover:border-white/20 transition-all shadow-2xs group"
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
                                <span
                                  className={cn(roleStyle.badge, COMPACT_BADGE_BASE)}
                                >
                                  {officer.position}
                                </span>
                              </div>

                              <div className="mt-0.5 flex items-center gap-2 flex-wrap text-[11px] text-gray-500 dark:text-zinc-400">
                                {officer.studentNo && (
                                  <span className="font-sans tabular-nums text-[10px] text-gray-600 dark:text-zinc-400">
                                    {officer.studentNo}
                                  </span>
                                )}
                                {officer.studentNo && <span className="text-gray-300 dark:text-zinc-600">·</span>}
                                {officer.email && (
                                  <>
                                    <span className="max-w-[160px] truncate select-text">{officer.email}</span>
                                    <CopyButton iconOnly textToCopy={officer.email} entityName="Officer Email" />
                                  </>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Right: Authorization Pill */}
                          <div className="shrink-0">
                            <span className={cn(COMPACT_BADGE_BASE, BADGE_PALETTES.emerald)}>
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
                size="sm"
                onClick={() => {
                  setSelectedOrgForOfficers(null);
                  setOfficerSearch("");
                }}
                className="h-9 px-4 text-xs font-semibold rounded-xl border border-border dark:border-border bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-xs cursor-pointer active:scale-95 transition-all"
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
