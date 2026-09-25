"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
} from "@/components/ui/dialog";
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyMedia,
} from "@/components/ui/empty";
import { TooltipProvider } from "@/components/ui/tooltip";
import { generateOrganizationCompliancePdf } from "@/lib/pdfGenerator";
import { downloadOrganizationComplianceCsv, generateExportFilename } from "@/lib/exportHelpers";
import { cn } from "@/lib/utils";

const CATEGORIES = ["All", "Academic", "Non-Academic"];

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

  // Modals
  const [selectedOrgForOfficers, setSelectedOrgForOfficers] = useState(null);
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
      if (c[org.compliance_status] !== undefined) c[org.compliance_status] += 1;
      if (c[org.status] !== undefined) c[org.status] += 1;
      if (org.checklist?.has_cbl) c.cblArchived += 1; else c.cblPending += 1;
      if (org.checklist?.has_officers) c.officersPresent += 1; else c.officersEmpty += 1;
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
  }, []);

  const handleResetFilters = useCallback(() => {
    setSearch("");
    setCategoryFilter("All");
    setComplianceFilters([]);
    setStandingFilters([]);
    setCblFilters([]);
    setOfficerFilters([]);
  }, []);

  // Filter Organizations
  const filteredOrganizations = useMemo(() => {
    return organizations.filter((org) => {
      // 1. Search filter
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const matchName = (org.name || "").toLowerCase().includes(q);
        const matchAcronym = (org.acronym || "").toLowerCase().includes(q);
        const matchAdviser = (org.adviser_name || "").toLowerCase().includes(q);
        if (!matchName && !matchAcronym && !matchAdviser) return false;
      }

      // 2. Category filter
      if (categoryFilter !== "All") {
        if ((org.category || "").toLowerCase() !== categoryFilter.toLowerCase()) {
          return false;
        }
      }

      // 3. Compliance status filter
      if (complianceFilters.length > 0) {
        if (!complianceFilters.includes(org.compliance_status)) return false;
      }

      // 4. Standing filter
      if (standingFilters.length > 0) {
        if (!standingFilters.includes(org.status)) return false;
      } else {
        // By default, exclude archived orgs
        if (org.status === "Archived") return false;
      }

      // 5. CBL filter
      if (cblFilters.length > 0) {
        const hasCbl = Boolean(org.checklist?.has_cbl);
        if (cblFilters.includes("archived") && !cblFilters.includes("pending") && !hasCbl) return false;
        if (cblFilters.includes("pending") && !cblFilters.includes("archived") && hasCbl) return false;
      }

      // 6. Officers filter
      if (officerFilters.length > 0) {
        const hasOfficers = Boolean(org.checklist?.has_officers);
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

  // Sort Organizations
  const sortedOrganizations = useMemo(() => {
    return [...filteredOrganizations].sort((a, b) => {
      let valA = a[sortBy];
      let valB = b[sortBy];

      if (typeof valA === "string") valA = valA.toLowerCase();
      if (typeof valB === "string") valB = valB.toLowerCase();

      if (valA < valB) return sortOrder === "asc" ? -1 : 1;
      if (valA > valB) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });
  }, [filteredOrganizations, sortBy, sortOrder]);

  const handleSort = (column) => {
    if (sortBy === column) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(column);
      setSortOrder("desc");
    }
  };

  // Active filter chips
  const activeChips = useMemo(() => {
    const chips = [];
    if (search.trim()) {
      chips.push({
        id: "search",
        label: `Search: "${search.trim()}"`,
        onRemove: () => setSearch(""),
      });
    }
    if (categoryFilter !== "All") {
      chips.push({
        id: "category",
        groupLabel: "Category",
        label: `${categoryFilter} Orgs`,
        onRemove: () => setCategoryFilter("All"),
      });
    }
    complianceFilters.forEach((cf) => {
      chips.push({
        id: `compliance-${cf}`,
        groupLabel: "Compliance",
        label: cf,
        onRemove: () => setComplianceFilters((prev) => prev.filter((v) => v !== cf)),
      });
    });
    standingFilters.forEach((sf) => {
      chips.push({
        id: `standing-${sf}`,
        groupLabel: "Standing",
        label: sf,
        onRemove: () => setStandingFilters((prev) => prev.filter((v) => v !== sf)),
      });
    });
    cblFilters.forEach((cbl) => {
      chips.push({
        id: `cbl-${cbl}`,
        groupLabel: "CBL",
        label: cbl === "archived" ? "Archived (PDF)" : "Pending PDF",
        onRemove: () => setCblFilters((prev) => prev.filter((v) => v !== cbl)),
      });
    });
    officerFilters.forEach((of) => {
      chips.push({
        id: `officers-${of}`,
        groupLabel: "Officers",
        label: of === "roster" ? "Officers Whitelisted" : "No Officers",
        onRemove: () => setOfficerFilters((prev) => prev.filter((v) => v !== of)),
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

      const blob = await generateOrganizationCompliancePdf(
        data,
        summary,
        meta,
        sortedOrganizations,
        byCategory
      );
      const url = URL.createObjectURL(blob);
      setPdfBlobUrl(url);

      onLogAction?.({
        action: "Generate OSAS Compliance PDF",
        details: "generated official student organization compliance report PDF",
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
      downloadOrganizationComplianceCsv(data, onLogAction);
      showToast?.({
        title: "CSV Export Complete",
        description: "Student organization compliance dataset downloaded successfully.",
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

  // Category counts
  const academicCount = useMemo(
    () => organizations.filter((o) => (o.category || "").toLowerCase() === "academic").length,
    [organizations]
  );
  const nonAcademicCount = useMemo(
    () => organizations.filter((o) => (o.category || "").toLowerCase() !== "academic").length,
    [organizations]
  );

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

                {/* Secondary Action: Export CSV */}
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
                    "Export CSV"
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
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 relative z-20">
                  {/* Stat Card 1: Accreditation Rate */}
                  <div className="relative overflow-hidden rounded-[18px] border select-none transition-all shadow-[0_2px_10px_rgb(0,0,0,0.04)] hover:shadow-[0_4px_15px_rgb(0,0,0,0.06)] flex flex-col justify-between min-h-[110px] bg-gray-50 dark:bg-zinc-900 border-gray-100 dark:border-white/5">
                    <div className="flex justify-between items-start p-4 pb-0">
                      <span className="text-[13px] font-medium text-gray-500 dark:text-zinc-400 capitalize">
                        Accreditation Rate
                      </span>
                      <div className="w-8 h-8 rounded-[10px] flex items-center justify-center text-white shadow-sm shrink-0 bg-[#22c55e]">
                        <HugeIcon className="ph-bold text-[15px] ph-seal-check" />
                      </div>
                    </div>
                    <div className="flex justify-between items-end p-4 pt-1">
                      <div className="flex items-baseline gap-2">
                        <span className="text-[28px] font-bold text-gray-900 dark:text-white leading-none tracking-tight">
                          {summary?.overallComplianceRate ?? 0}%
                        </span>
                        <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 mb-1">
                          {summary?.fullyCompliantCount || 0} of {summary?.totalOrganizations || 0} Accredited
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Stat Card 2: Recognized Organizations */}
                  <div className="relative overflow-hidden rounded-[18px] border select-none transition-all shadow-[0_2px_10px_rgb(0,0,0,0.04)] hover:shadow-[0_4px_15px_rgb(0,0,0,0.06)] flex flex-col justify-between min-h-[110px] bg-gray-50 dark:bg-zinc-900 border-gray-100 dark:border-white/5">
                    <div className="flex justify-between items-start p-4 pb-0">
                      <span className="text-[13px] font-medium text-gray-500 dark:text-zinc-400 capitalize">
                        Recognized Orgs
                      </span>
                      <div className="w-8 h-8 rounded-[10px] flex items-center justify-center text-white shadow-sm shrink-0 bg-[#3b82f6]">
                        <HugeIcon className="ph-bold text-[15px] ph-buildings" />
                      </div>
                    </div>
                    <div className="flex justify-between items-end p-4 pt-1">
                      <div className="flex items-baseline gap-2">
                        <span className="text-[28px] font-bold text-gray-900 dark:text-white leading-none tracking-tight">
                          {(summary?.totalOrganizations ?? 0).toLocaleString()}
                        </span>
                        <span className="text-xs font-medium text-blue-600 dark:text-blue-400 mb-1">
                          {academicCount} Academic · {nonAcademicCount} Non-Academic
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Stat Card 3: CBL Archival Rate */}
                  <div className="relative overflow-hidden rounded-[18px] border select-none transition-all shadow-[0_2px_10px_rgb(0,0,0,0.04)] hover:shadow-[0_4px_15px_rgb(0,0,0,0.06)] flex flex-col justify-between min-h-[110px] bg-gray-50 dark:bg-zinc-900 border-gray-100 dark:border-white/5">
                    <div className="flex justify-between items-start p-4 pb-0">
                      <span className="text-[13px] font-medium text-gray-500 dark:text-zinc-400 capitalize">
                        CBL Archival Rate
                      </span>
                      <div className="w-8 h-8 rounded-[10px] flex items-center justify-center text-white shadow-sm shrink-0 bg-[#f59e0b]">
                        <HugeIcon className="ph-bold text-[15px] ph-file-pdf" />
                      </div>
                    </div>
                    <div className="flex justify-between items-end p-4 pt-1">
                      <div className="flex items-baseline gap-2">
                        <span className="text-[28px] font-bold text-gray-900 dark:text-white leading-none tracking-tight">
                          {summary?.cblArchivedRate ?? 0}%
                        </span>
                        <span className="text-xs font-medium text-amber-600 dark:text-amber-400 mb-1">
                          {summary?.cblArchivedCount || 0} of {summary?.totalOrganizations || 0} Digitized
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
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
                    onClick={() => setCategoryFilter(cat)}
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
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search org, acronym, adviser..."
                  className="h-9 w-full rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 pl-8 pr-16 text-xs font-normal text-gray-900 dark:text-zinc-100 placeholder:text-gray-400 dark:placeholder:text-zinc-500 shadow-none focus-visible:outline-none focus-visible:border-pup-maroon focus-visible:ring-1 focus-visible:ring-pup-maroon dark:focus-visible:border-red-500/80 dark:focus-visible:ring-red-500/80"
                />
                <div className="absolute inset-y-0 right-3 flex items-center gap-1.5">
                  {search && (
                    <button
                      type="button"
                      onClick={() => setSearch("")}
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
            <div className="flex items-center justify-between gap-6 px-6 py-3.5 bg-gray-50/40 dark:bg-zinc-900/30 border-b border-gray-100 dark:border-white/10">
              <div className="flex items-center gap-2.5">
                <h4 className="text-xs font-semibold text-gray-900 dark:text-zinc-100 tracking-[-0.01em] m-0">
                  Organization Compliance Roster
                </h4>
                <span className="text-[11px] font-mono text-gray-400 dark:text-zinc-500">
                  ({sortedOrganizations.length} {sortedOrganizations.length === 1 ? "organization" : "organizations"})
                </span>
              </div>
            </div>

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
                    {sortedOrganizations.map((org) => {
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
                                onClick={() => setSelectedOrgForOfficers(org)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-100 dark:border-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors cursor-pointer"
                                title="View Whitelisted Officers"
                              >
                                <HugeIcon className="ph-bold ph-shield-check text-xs" />
                                <span>
                                  {org.activeOfficerCount} {org.activeOfficerCount === 1 ? "Officer" : "Officers"}
                                </span>
                              </button>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-lg dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-800/40">
                                <span>No Officers</span>
                              </span>
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
                        <div className="mt-4 flex justify-center">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={handleResetFilters}
                            className="h-9 px-4 text-xs font-semibold rounded-xl cursor-pointer"
                          >
                            Clear Filters
                          </Button>
                        </div>
                      )}
                    </EmptyHeader>
                  </Empty>
                </div>
              )}
            </div>
          </div>

          {/* 6. Card Footer with Count */}
          <div className="border-t border-gray-100 dark:border-white/10 px-6 py-4 flex items-center justify-between text-xs text-gray-500 dark:text-zinc-400 bg-white dark:bg-card rounded-b-2xl">
            <span>
              Showing <strong className="text-gray-900 dark:text-white">{sortedOrganizations.length}</strong> of{" "}
              <strong className="text-gray-900 dark:text-white">{summary.totalOrganizations || 0}</strong> recognized{" "}
              {summary.totalOrganizations === 1 ? "organization" : "organizations"}
            </span>
            <span className="text-[11px] text-gray-400 dark:text-zinc-500">
              PUP San Juan · Office of Student Affairs and Services
            </span>
          </div>
        </Card>

        {/* Officers Whitelist Dialog */}
        <Dialog
          open={Boolean(selectedOrgForOfficers)}
          onOpenChange={(open) => !open && setSelectedOrgForOfficers(null)}
        >
          <DialogContent className="max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-xl dark:border-white/10 dark:bg-zinc-900 font-jakarta">
            <DialogHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
                  <HugeIcon className="ph-bold ph-users-three text-lg" />
                </div>
                <div>
                  <DialogTitle className="text-sm font-bold text-gray-900 dark:text-white">
                    {selectedOrgForOfficers?.name}
                  </DialogTitle>
                  <DialogDescription className="text-xs text-gray-500 dark:text-zinc-400">
                    Whitelisted Student Officers ({selectedOrgForOfficers?.activeOfficerCount || 0})
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="mt-4 flex flex-col gap-2 max-h-72 overflow-y-auto pr-1">
              {selectedOrgForOfficers?.officers && selectedOrgForOfficers.officers.length > 0 ? (
                selectedOrgForOfficers.officers.map((officer) => (
                  <div
                    key={officer.id || officer.email}
                    className="flex items-center justify-between p-3 rounded-xl border border-gray-100 bg-gray-50/60 dark:border-white/5 dark:bg-zinc-800/40"
                  >
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-gray-900 dark:text-white">
                        {officer.name}
                      </span>
                      <span className="text-[11px] text-gray-500 dark:text-zinc-400">
                        {officer.email}
                      </span>
                    </div>
                    <Badge variant="outline" className="text-[10px] font-semibold rounded-lg px-2 py-0.5">
                      {officer.position}
                    </Badge>
                  </div>
                ))
              ) : (
                <div className="py-6 text-center text-xs text-gray-500 dark:text-zinc-400">
                  No active officers registered for this organization.
                </div>
              )}
            </div>

            <div className="mt-4 flex justify-end">
              <Button
                variant="outline"
                onClick={() => setSelectedOrgForOfficers(null)}
                className="h-9 px-4 text-xs font-semibold rounded-xl border border-gray-200 dark:border-white/10"
              >
                Close
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* CBL PDF Preview Modal */}
        {previewCbl && (
          <PDFPreviewModal
            pdfUrl={previewCbl.url}
            title={previewCbl.title}
            filename={previewCbl.filename}
            isOpen={Boolean(previewCbl)}
            onClose={() => setPreviewCbl(null)}
          />
        )}

        {/* Official OSAS Compliance PDF Report Modal */}
        <Dialog open={reportOpen} onOpenChange={setReportOpen}>
          <DialogContent className={cn(
            "fixed inset-auto top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col p-0 overflow-hidden bg-white shadow-2xl dark:bg-card border border-gray-200 dark:border-white/10 z-50 transition-all duration-200",
            isFullscreenPreview
              ? "w-[96vw] h-[94vh] max-w-[96vw] max-h-[94vh] rounded-2xl"
              : "w-[90vw] max-w-4xl h-[85vh] max-h-[85vh] rounded-2xl"
          )}>
            <DialogHeader className="flex shrink-0 flex-row items-center justify-between border-b border-gray-100 bg-white px-6 py-4 dark:border-white/10 dark:bg-card">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-pup-maroon/10 text-pup-maroon dark:bg-primary/20 dark:text-primary">
                  <HugeIcon className="ph-bold ph-file-pdf text-xl" />
                </div>
                <div>
                  <DialogTitle className="text-sm font-bold text-gray-900 dark:text-white">
                    Official OSAS Student Organization Compliance Report
                  </DialogTitle>
                  <DialogDescription className="text-xs text-gray-500 dark:text-zinc-400">
                    Accreditation and institutional audit report — PUP San Juan OSAS
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="flex flex-1 min-h-0 flex-col bg-gray-50 p-4 dark:bg-zinc-900/30">
              {pdfBlobUrl ? (
                <div className="relative h-full w-full overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xs dark:border-white/10 dark:bg-card">
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

            <div className="flex shrink-0 items-center bg-white dark:bg-card px-6 py-4 border-t border-gray-100 dark:border-white/10">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsFullscreenPreview(!isFullscreenPreview)}
                className="text-[#8E8E93] hover:text-[#111] dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 transition-colors rounded-xl shadow-none border-0 p-0 h-10 w-10 cursor-pointer"
              >
                <HugeIcon className="ti ti-arrows-vertical text-[16px]" />
              </Button>

              <div className="flex items-center gap-2.5 ml-auto">
                <Button
                  variant="outline"
                  onClick={() => setReportOpen(false)}
                  className="flex h-10 items-center justify-center rounded-xl! border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 font-semibold text-xs active:scale-95 transition-all cursor-pointer px-5 shadow-xs hover:bg-gray-50 dark:hover:bg-zinc-700"
                >
                  Close
                </Button>
                <Button
                  onClick={handleDownloadPdf}
                  disabled={!pdfBlobUrl}
                  className="h-10 px-5 rounded-xl! text-xs font-semibold text-white btn-brand-red active:scale-95 disabled:opacity-50 transition-all cursor-pointer shadow-xs"
                >
                  Download PDF
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}
