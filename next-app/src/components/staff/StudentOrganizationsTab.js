"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import HugeIcon from "@/components/shared/HugeIcon";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import PageHeader from "@/components/shared/PageHeader";
import { RefreshButton } from "@/components/shared/RefreshButton";
import ConfirmModal from "@/components/shared/ConfirmModal";
import PDFPreviewModal from "@/components/shared/PDFPreviewModal";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty";
import { TooltipProvider } from "@/components/ui/tooltip";
import MultiCriteriaFilter from "@/components/shared/MultiCriteriaFilter";
import ActiveFilterChips from "@/components/shared/ActiveFilterChips";

const CATEGORIES = [
  "All",
  "Academic",
  "Non-Academic",
];

const OFFICER_POSITIONS = [
  "President",
  "Vice President",
  "Secretary",
  "Assistant Secretary",
  "Treasurer",
  "Assistant Treasurer",
  "Auditor",
  "Public Relations Officer",
  "Project Head",
  "Officer",
];

const getOrgStatusBadgeClass = (status) => {
  if (status === "Active") {
    return "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-800/40";
  }
  if (status === "Archived") {
    return "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-800/40";
  }
  return "bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700";
};

const getOrgStatusDotClass = (status) => {
  if (status === "Active") return "bg-emerald-500";
  if (status === "Archived") return "bg-amber-500";
  return "bg-zinc-400";
};

export default function StudentOrganizationsTab({ showToast = () => {} }) {
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilters, setCategoryFilters] = useState([]);
  const [statusFilters, setStatusFilters] = useState([]);
  const [viewMode, setViewMode] = useState("grid"); // "grid" | "table"

  // Whitelist Sheet State
  const [selectedOrgForOfficers, setSelectedOrgForOfficers] = useState(null);
  const [officersList, setOfficersList] = useState([]);
  const [officersLoading, setOfficersLoading] = useState(false);
  const [officerForm, setOfficerForm] = useState({
    email: "",
    position: "President",
    studentName: "",
    studentNo: "",
  });
  const [addingOfficer, setAddingOfficer] = useState(false);
  const [officerToRemove, setOfficerToRemove] = useState(null);

  // Register / Edit Modal State
  const [orgModalOpen, setOrgModalOpen] = useState(false);
  const [editingOrg, setEditingOrg] = useState(null);
  const [orgForm, setOrgForm] = useState({
    name: "",
    acronym: "",
    category: "Academic",
    status: "Active",
    adviserName: "",
    adviserEmail: "",
    description: "",
  });
  const [savingOrg, setSavingOrg] = useState(false);

  // CBL Upload / Preview State
  const [cblUploadOrg, setCblUploadOrg] = useState(null);
  const [cblFile, setCblFile] = useState(null);
  const [uploadingCbl, setUploadingCbl] = useState(false);
  const [previewPdf, setPreviewPdf] = useState(null);

  // Fetch Organizations
  const fetchOrganizations = useCallback(
    async (showFeedback = false) => {
      try {
        setLoading(true);
        const res = await fetch(`/api/osas/organizations?status=Active,Inactive,Archived`, {
          cache: "no-store",
        });
        const json = await res.json();
        if (!res.ok || !json.ok) {
          throw new Error(json.error || "Failed to load student organizations.");
        }
        setOrganizations(json.data || []);
        if (showFeedback) {
          showToast({
            title: "Organizations Refreshed",
            description: "Directory records up to date.",
          });
        }
      } catch (err) {
        showToast({
          title: "Failed to Load",
          description: err.message || "Could not fetch organizations.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    },
    [showToast]
  );

  useEffect(() => {
    fetchOrganizations();
  }, [fetchOrganizations]);

  // Fetch Officers for Sheet
  const loadOfficers = useCallback(
    async (orgId) => {
      try {
        setOfficersLoading(true);
        const res = await fetch(`/api/osas/organizations/${orgId}/officers`, {
          cache: "no-store",
        });
        const json = await res.json();
        if (!res.ok || !json.ok) {
          throw new Error(json.error || "Failed to load officers.");
        }
        setOfficersList(json.data || []);
      } catch (err) {
        showToast({
          title: "Error Loading Officers",
          description: err.message,
          variant: "destructive",
        });
      } finally {
        setOfficersLoading(false);
      }
    },
    [showToast]
  );

  const openOfficersSheet = (org) => {
    setSelectedOrgForOfficers(org);
    setOfficerForm({
      email: "",
      position: "President",
      studentName: "",
      studentNo: "",
    });
    loadOfficers(org.id);
  };

  const handleAddOfficer = async (e) => {
    e.preventDefault();
    if (!selectedOrgForOfficers) return;
    if (!officerForm.email.trim() || !officerForm.position.trim()) {
      showToast({
        title: "Validation Error",
        description: "Officer email and position are required.",
        variant: "destructive",
      });
      return;
    }

    try {
      setAddingOfficer(true);
      const res = await fetch(
        `/api/osas/organizations/${selectedOrgForOfficers.id}/officers`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(officerForm),
        }
      );
      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Failed to whitelist officer.");
      }

      showToast({
        title: "Officer Whitelisted",
        description: `${officerForm.email} has been authorized as ${officerForm.position}.`,
      });
      setOfficerForm({
        email: "",
        position: "President",
        studentName: "",
        studentNo: "",
      });
      await loadOfficers(selectedOrgForOfficers.id);
      fetchOrganizations();
    } catch (err) {
      showToast({
        title: "Whitelist Failed",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setAddingOfficer(false);
    }
  };

  const handleRemoveOfficer = async () => {
    if (!selectedOrgForOfficers || !officerToRemove) return;
    try {
      const res = await fetch(
        `/api/osas/organizations/${selectedOrgForOfficers.id}/officers/${officerToRemove.id}`,
        { method: "DELETE" }
      );
      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Failed to remove officer.");
      }
      showToast({
        title: "Officer Revoked",
        description: "Officer access has been removed.",
      });
      setOfficerToRemove(null);
      await loadOfficers(selectedOrgForOfficers.id);
      fetchOrganizations();
    } catch (err) {
      showToast({
        title: "Removal Failed",
        description: err.message,
        variant: "destructive",
      });
    }
  };

  // Open Create/Edit Modal
  const openCreateModal = () => {
    setEditingOrg(null);
    setOrgForm({
      name: "",
      acronym: "",
      category: "Academic",
      status: "Active",
      adviserName: "",
      adviserEmail: "",
      description: "",
    });
    setOrgModalOpen(true);
  };

  const openEditModal = (org) => {
    setEditingOrg(org);
    setOrgForm({
      name: org.name || "",
      acronym: org.acronym || "",
      category: org.category || "Academic",
      status: org.status || "Active",
      adviserName: org.adviser_name || "",
      adviserEmail: org.adviser_email || "",
      description: org.description || "",
    });
    setOrgModalOpen(true);
  };

  const handleSaveOrg = async (e) => {
    e.preventDefault();
    if (!orgForm.name.trim()) {
      showToast({
        title: "Validation Error",
        description: "Organization name is required.",
        variant: "destructive",
      });
      return;
    }

    try {
      setSavingOrg(true);
      const url = editingOrg
        ? `/api/osas/organizations/${editingOrg.id}`
        : "/api/osas/organizations";
      const method = editingOrg ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orgForm),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Failed to save organization.");
      }

      showToast({
        title: editingOrg ? "Organization Updated" : "Organization Created",
        description: `${orgForm.name} saved successfully.`,
      });
      setOrgModalOpen(false);
      fetchOrganizations();
    } catch (err) {
      showToast({
        title: "Save Failed",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setSavingOrg(false);
    }
  };

  // Upload CBL
  const handleUploadCbl = async (e) => {
    e.preventDefault();
    if (!cblUploadOrg || !cblFile) return;

    try {
      setUploadingCbl(true);
      const formData = new FormData();
      formData.append("file", cblFile);

      const res = await fetch(`/api/osas/organizations/${cblUploadOrg.id}/bylaws`, {
        method: "POST",
        body: formData,
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Failed to upload CBL.");
      }

      showToast({
        title: "CBL Uploaded",
        description: `Constitution & By-Laws archived for ${cblUploadOrg.name}.`,
      });
      setCblUploadOrg(null);
      setCblFile(null);
      fetchOrganizations();
    } catch (err) {
      showToast({
        title: "Upload Failed",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setUploadingCbl(false);
    }
  };

  // Preview CBL
  const handlePreviewCbl = (org) => {
    setPreviewPdf({
      url: `/api/osas/organizations/${org.id}/bylaws?file=1`,
      title: `${org.name} — Constitution & By-Laws (CBL)`,
      filename: org.bylaws_original_filename || `${org.acronym || org.name}-CBL.pdf`,
    });
  };

  // Counts for filters
  const counts = useMemo(() => {
    const c = {
      Active: 0,
      Inactive: 0,
      Archived: 0,
      Academic: 0,
      "Non-Academic": 0,
    };
    organizations.forEach((org) => {
      if (c[org.status] !== undefined) c[org.status] += 1;
      if (c[org.category] !== undefined) c[org.category] += 1;
    });
    return c;
  }, [organizations]);

  const filterGroups = useMemo(() => [
    {
      id: "status",
      label: "Organization Status",
      options: [
        { value: "Active", label: "Active", indicatorColor: "bg-emerald-500", count: counts.Active },
        { value: "Inactive", label: "Inactive", indicatorColor: "bg-zinc-400", count: counts.Inactive },
        { value: "Archived", label: "Archived", indicatorColor: "bg-amber-500", count: counts.Archived },
      ],
    },
    {
      id: "category",
      label: "Organization Category",
      options: [
        { value: "Academic", label: "Academic", indicatorColor: "bg-blue-500", count: counts.Academic },
        { value: "Non-Academic", label: "Non-Academic", indicatorColor: "bg-purple-500", count: counts["Non-Academic"] },
      ],
    },
  ], [counts]);

  const filterValues = useMemo(() => ({
    status: statusFilters,
    category: categoryFilters,
  }), [statusFilters, categoryFilters]);

  const handleFilterChange = useCallback((groupId, values) => {
    if (groupId === "status") setStatusFilters(values);
    else if (groupId === "category") setCategoryFilters(values);
  }, []);

  const handleResetFilters = useCallback(() => {
    setSearch("");
    setCategoryFilters([]);
    setStatusFilters([]);
  }, []);

  const filterPresets = useMemo(() => [
    { label: "All Organizations", values: { status: [], category: [] } },
    { label: "Active Academic", values: { status: ["Active"], category: ["Academic"] } },
    { label: "Active Non-Academic", values: { status: ["Active"], category: ["Non-Academic"] } },
    { label: "Archived Only", values: { status: ["Archived"], category: [] } },
  ], []);

  const filteredOrganizations = useMemo(() => {
    return organizations.filter((org) => {
      if (statusFilters.length > 0) {
        if (!statusFilters.includes(org.status)) return false;
      } else {
        // By default, if no status filter is selected, exclude archived organizations
        if (org.status === "Archived") return false;
      }

      if (categoryFilters.length > 0 && !categoryFilters.includes(org.category)) {
        return false;
      }

      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const matchName = (org.name || "").toLowerCase().includes(q);
        const matchAcronym = (org.acronym || "").toLowerCase().includes(q);
        const matchAdviser = (org.adviser_name || "").toLowerCase().includes(q);
        const matchDesc = (org.description || "").toLowerCase().includes(q);
        if (!matchName && !matchAcronym && !matchAdviser && !matchDesc) return false;
      }

      return true;
    });
  }, [organizations, statusFilters, categoryFilters, search]);

  const activeChips = useMemo(() => {
    const chips = [];
    if (search.trim()) {
      chips.push({
        id: "search",
        label: `Search: ${search.trim()}`,
        onRemove: () => setSearch(""),
      });
    }
    categoryFilters.forEach((cat) => {
      chips.push({
        id: `cat-${cat}`,
        label: `Category: ${cat}`,
        onRemove: () => setCategoryFilters((prev) => prev.filter((c) => c !== cat)),
      });
    });
    statusFilters.forEach((st) => {
      chips.push({
        id: `status-${st}`,
        label: `Status: ${st}`,
        onRemove: () => setStatusFilters((prev) => prev.filter((s) => s !== st)),
      });
    });
    return chips;
  }, [search, categoryFilters, statusFilters]);

  const hasActiveFilters = Boolean(
    search.trim() || categoryFilters.length > 0 || statusFilters.length > 0
  );

  // Metrics
  const metrics = useMemo(() => {
    const activeOrgs = organizations.filter((o) => o.status !== "Archived");
    const total = activeOrgs.length;
    const totalOfficers = activeOrgs.reduce(
      (sum, o) => sum + (parseInt(o.active_officer_count, 10) || 0),
      0
    );
    const totalProposals = activeOrgs.reduce(
      (sum, o) => sum + (parseInt(o.proposal_count, 10) || 0),
      0
    );
    return { total, totalOfficers, totalProposals };
  }, [organizations]);

  return (
    <TooltipProvider delayDuration={200}>
      <div className="font-jakarta w-full flex flex-1 flex-col h-auto min-h-0 gap-6 focus:outline-none animate-fade-up">
        {/* ONE Single Card Container encapsulating Header, Metrics, Toolbar, Active Filters, Content & Footer */}
        <Card className="flex h-auto w-full flex-col p-0 gap-0 overflow-visible rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-card dark:shadow-none isolate font-jakarta mb-4 min-h-0 flex-1">
          {/* 1. Page Header */}
          <PageHeader
            icon="ph-buildings"
            title="Student Organizations"
            description="Manage recognized campus student organizations, Constitution & By-Laws (CBL), and officer whitelists."
            showBorder={false}
            className="p-6"
            titleClassName="text-[18px] font-semibold tracking-[-0.01em] text-gray-900 dark:text-zinc-50"
            descriptionClassName="text-[13px] font-normal text-gray-500 dark:text-zinc-400 mt-[4px]"
            actions={
              <div className="flex items-center gap-3">
                {/* Segmented View Mode Toggle: Grid vs Table */}
                <div className="flex items-center gap-1 bg-gray-100/80 dark:bg-zinc-800/60 p-1 rounded-xl border border-gray-200/60 dark:border-white/5 shrink-0">
                  <button
                    type="button"
                    onClick={() => setViewMode("grid")}
                    className={cn(
                      "inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer",
                      viewMode === "grid"
                        ? "bg-pup-maroon text-white shadow-xs"
                        : "text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white"
                    )}
                    title="Grid View"
                  >
                    <HugeIcon className="ph-bold ph-squares-four text-sm" />
                    <span>Grid</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode("table")}
                    className={cn(
                      "inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer",
                      viewMode === "table"
                        ? "bg-pup-maroon text-white shadow-xs"
                        : "text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white"
                    )}
                    title="Table View"
                  >
                    <HugeIcon className="ph-bold ph-list-dashes text-sm" />
                    <span>Table</span>
                  </button>
                </div>

                <div className="h-6 w-px bg-gray-200 dark:bg-zinc-800" />

                <RefreshButton
                  onRefresh={() => fetchOrganizations(true)}
                  isLoading={loading}
                  title="Refresh Organizations"
                />

                <Button
                  type="button"
                  onClick={openCreateModal}
                  className="flex h-10 px-5 text-xs font-semibold rounded-xl! btn-brand-red text-white! active:scale-95 disabled:opacity-50 transition-all cursor-pointer shadow-xs"
                  style={{ color: "#ffffff" }}
                >
                  Register Organization
                </Button>
              </div>
            }
          />

          {/* 2. Embedded KPI Summary Bar */}
          <div className="border-t border-gray-100 dark:border-white/10 p-5 bg-gray-50/40 dark:bg-zinc-900/20 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="rounded-xl border border-gray-200/80 dark:border-white/10 bg-white dark:bg-zinc-900/60 p-4 shadow-none">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-500 dark:text-zinc-400">
                  Recognized Orgs
                </span>
                <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-zinc-800 flex items-center justify-center text-slate-700 dark:text-zinc-300">
                  <HugeIcon className="ph-bold ph-buildings text-sm" />
                </div>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-bold tracking-tight text-gray-900 dark:text-zinc-50">
                  {loading ? <Skeleton className="h-7 w-12" /> : metrics.total}
                </span>
                <span className="text-[11px] text-gray-400 dark:text-zinc-500">
                  Campus Active
                </span>
              </div>
            </Card>

            <Card className="rounded-xl border border-gray-200/80 dark:border-white/10 bg-white dark:bg-zinc-900/60 p-4 shadow-none">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-500 dark:text-zinc-400">
                  Officer Whitelist
                </span>
                <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center text-blue-700 dark:text-blue-300">
                  <HugeIcon className="ph-bold ph-shield-check text-sm" />
                </div>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-bold tracking-tight text-gray-900 dark:text-zinc-50">
                  {loading ? <Skeleton className="h-7 w-12" /> : metrics.totalOfficers}
                </span>
                <span className="text-[11px] text-gray-400 dark:text-zinc-500">
                  Authorized Submitters
                </span>
              </div>
            </Card>

            <Card className="rounded-xl border border-gray-200/80 dark:border-white/10 bg-white dark:bg-zinc-900/60 p-4 shadow-none">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-500 dark:text-zinc-400">
                  Event Proposals
                </span>
                <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center text-emerald-700 dark:text-emerald-300">
                  <HugeIcon className="ph-bold ph-calendar-check text-sm" />
                </div>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-bold tracking-tight text-gray-900 dark:text-zinc-50">
                  {loading ? <Skeleton className="h-7 w-12" /> : metrics.totalProposals}
                </span>
                <span className="text-[11px] text-gray-400 dark:text-zinc-500">
                  Activity Proposals
                </span>
              </div>
            </Card>
          </div>

          {/* 3. Navigation Toolbar: Category Line Tabs & Search/Status Controls */}
          <div className="border-t border-gray-100 dark:border-white/10 p-5 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 bg-gray-50/40 dark:bg-zinc-900/30">
            {/* Left: Category Line Tabs */}
            <div className="flex items-center gap-6 shrink-0 select-none overflow-x-auto">
              {CATEGORIES.map((cat) => {
                const isActive =
                  cat === "All"
                    ? categoryFilters.length === 0
                    : categoryFilters.length === 1 && categoryFilters[0] === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategoryFilters(cat === "All" ? [] : [cat])}
                    className={cn(
                      "relative h-9 flex items-center text-[13px] font-semibold transition-colors focus:outline-none cursor-pointer border-0 bg-transparent whitespace-nowrap",
                      isActive
                        ? "text-gray-900 dark:text-zinc-50 after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-full after:bg-pup-maroon dark:after:bg-red-400"
                        : "text-[#8E8E93] font-normal hover:text-gray-700 dark:hover:text-zinc-200"
                    )}
                  >
                    {cat === "All" ? "All Organizations" : cat}
                  </button>
                );
              })}
            </div>

            {/* Right: Search Input & Multi-Criteria Filter */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
              {/* Search Bar with live count badge */}
              <div className="w-full sm:w-[260px] lg:w-[300px] relative group shrink-0">
                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                  <HugeIcon className="ph-bold ph-magnifying-glass text-gray-400 dark:text-zinc-500 transition-colors group-focus-within:text-pup-maroon dark:group-focus-within:text-red-400 text-sm" />
                </div>
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search org name, acronym, adviser..."
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
                title="Filter Organizations"
                groups={filterGroups}
                selectedValues={filterValues}
                onChange={handleFilterChange}
                onClearAll={handleResetFilters}
                presets={filterPresets}
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

          {/* 5. Main Content Area (Dual View Engine) */}
          <div className="flex-1 border-t border-gray-100 dark:border-white/10 bg-white dark:bg-card">
            {loading ? (
              viewMode === "table" ? (
                <div className="p-6 space-y-3">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Skeleton key={i} className="h-12 w-full rounded-xl" />
                  ))}
                </div>
              ) : (
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Card
                      key={i}
                      className="rounded-2xl p-5 border border-gray-200 dark:border-white/10 space-y-4"
                    >
                      <div className="flex items-center justify-between">
                        <Skeleton className="h-6 w-16 rounded-md" />
                        <Skeleton className="h-5 w-20 rounded-full" />
                      </div>
                      <Skeleton className="h-5 w-3/4" />
                      <Skeleton className="h-12 w-full" />
                      <div className="pt-3 border-t border-gray-100 dark:border-white/5 flex justify-between">
                        <Skeleton className="h-8 w-24 rounded-xl" />
                        <Skeleton className="h-8 w-20 rounded-xl" />
                      </div>
                    </Card>
                  ))}
                </div>
              )
            ) : filteredOrganizations.length === 0 ? (
              <div className="p-12 text-center">
                <Empty className="flex h-[320px] flex-col items-center justify-center border-0 bg-transparent text-center">
                  <EmptyHeader className="flex flex-col items-center gap-0">
                    <div className="relative mb-6">
                      <div className="absolute inset-0 scale-150 animate-pulse rounded-full bg-gray-50 opacity-50 dark:bg-card" />
                      <EmptyMedia className="relative z-10 flex h-20 w-20 items-center justify-center rounded-2xl border border-gray-100 bg-white shadow-md dark:border-white/10 dark:bg-card">
                        <HugeIcon className="ph-bold ph-buildings text-2xl text-pup-maroon dark:text-red-400" />
                      </EmptyMedia>
                    </div>
                    <EmptyTitle className="text-lg font-semibold text-gray-900 dark:text-zinc-50">
                      No Student Organizations Found
                    </EmptyTitle>
                    <EmptyDescription className="max-w-xs text-xs font-medium text-gray-500 dark:text-zinc-400 mt-1">
                      {hasActiveFilters
                        ? "Try adjusting your search criteria or resetting category filters."
                        : "Register recognized student organizations to start managing Constitution & By-Laws and whitelisted officers."}
                    </EmptyDescription>
                    <Button
                      type="button"
                      onClick={openCreateModal}
                      className="mt-5 h-10 px-5 text-xs font-semibold rounded-xl! btn-brand-red text-white! active:scale-95 transition-all cursor-pointer shadow-xs"
                      style={{ color: "#ffffff" }}
                    >
                      Register Organization
                    </Button>
                  </EmptyHeader>
                </Empty>
              </div>
            ) : viewMode === "table" ? (
              /* Table View Mode */
              <div className="overflow-x-auto min-h-[300px]">
                <table className="min-w-full text-sm">
                  <thead className="sticky top-0 z-10 border-b-[0.5px] border-black/10 dark:border-white/10 bg-white dark:bg-card">
                    <tr className="text-left text-[12px] uppercase font-medium tracking-[0.04em] text-[#8E8E93] dark:text-zinc-500">
                      <th className="py-3.5 px-6 font-semibold">Organization</th>
                      <th className="py-3.5 px-4 font-semibold">Category</th>
                      <th className="py-3.5 px-4 font-semibold">Faculty Adviser</th>
                      <th className="py-3.5 px-4 font-semibold text-center">Officers</th>
                      <th className="py-3.5 px-4 font-semibold">Constitution & By-Laws</th>
                      <th className="py-3.5 px-4 font-semibold">Status</th>
                      <th className="py-3.5 px-6 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                    {filteredOrganizations.map((org) => {
                      const hasCbl = Boolean(org.bylaws_storage_filename);
                      const officerCount = parseInt(org.active_officer_count, 10) || 0;

                      return (
                        <tr
                          key={org.id}
                          className="hover:bg-gray-50/60 dark:hover:bg-zinc-800/30 transition-colors"
                        >
                          {/* Org Name & Acronym */}
                          <td className="py-4 px-6">
                            <div className="flex items-start gap-3">
                              <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 flex items-center justify-center text-xs shrink-0 font-bold">
                                {org.acronym ? (
                                  <span className="text-[11px] text-pup-maroon dark:text-red-400 font-bold">
                                    {org.acronym}
                                  </span>
                                ) : (
                                  <HugeIcon className="ph-bold ph-buildings text-sm" />
                                )}
                              </div>
                              <div className="min-w-0">
                                <span className="font-semibold text-xs text-gray-900 dark:text-zinc-50 block truncate max-w-xs md:max-w-sm">
                                  {org.name}
                                </span>
                                {org.description ? (
                                  <p className="text-[11px] text-gray-500 dark:text-zinc-400 line-clamp-1 mt-0.5 max-w-xs md:max-w-sm">
                                    {org.description}
                                  </p>
                                ) : (
                                  <span className="text-[11px] text-gray-400 dark:text-zinc-500 italic mt-0.5 block">
                                    No description provided
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Category Badge */}
                          <td className="py-4 px-4 whitespace-nowrap">
                            <span className="px-2.5 py-1 text-xs font-medium rounded-lg bg-gray-100 text-gray-700 dark:bg-zinc-800 dark:text-zinc-300">
                              {org.category}
                            </span>
                          </td>

                          {/* Faculty Adviser */}
                          <td className="py-4 px-4">
                            <div className="text-xs font-medium text-gray-900 dark:text-zinc-100">
                              {org.adviser_name || (
                                <span className="text-gray-400 italic">Not assigned</span>
                              )}
                            </div>
                            {org.adviser_email && (
                              <div className="text-[11px] text-gray-400 dark:text-zinc-500 font-mono mt-0.5">
                                {org.adviser_email}
                              </div>
                            )}
                          </td>

                          {/* Whitelisted Officers */}
                          <td className="py-4 px-4 text-center whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => openOfficersSheet(org)}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-100 dark:border-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors cursor-pointer"
                              title="Manage Whitelisted Officers"
                            >
                              <HugeIcon className="ph-bold ph-shield-check text-xs" />
                              <span>
                                {officerCount} {officerCount === 1 ? "Officer" : "Officers"}
                              </span>
                            </button>
                          </td>

                          {/* Constitution & By-Laws */}
                          <td className="py-4 px-4 whitespace-nowrap">
                            {hasCbl ? (
                              <div className="flex items-center gap-2">
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400 border border-red-100 dark:border-red-900/30">
                                  <HugeIcon className="ph-bold ph-file-pdf text-xs" />
                                  <span>Archived</span>
                                </span>
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => handlePreviewCbl(org)}
                                    title="Preview Official CBL"
                                    className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-500 hover:text-pup-maroon hover:bg-gray-100 dark:text-zinc-400 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                                  >
                                    <HugeIcon className="ph-bold ph-eye text-xs" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setCblUploadOrg(org);
                                      setCblFile(null);
                                    }}
                                    title="Replace Archival CBL"
                                    className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-500 hover:text-pup-maroon hover:bg-gray-100 dark:text-zinc-400 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                                  >
                                    <HugeIcon className="ph-bold ph-upload-simple text-xs" />
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setCblUploadOrg(org);
                                  setCblFile(null);
                                }}
                                className="h-7 px-2.5 text-[11px] font-semibold rounded-lg border-dashed border-gray-300 dark:border-white/20 text-gray-600 dark:text-zinc-400 hover:text-pup-maroon dark:hover:text-red-400 cursor-pointer"
                              >
                                <HugeIcon className="ph-bold ph-upload-simple mr-1 text-xs" />
                                Upload CBL
                              </Button>
                            )}
                          </td>

                          {/* Status */}
                          <td className="py-4 px-4 whitespace-nowrap">
                            <span
                              className={cn(
                                "inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[11px] font-semibold rounded-full border",
                                getOrgStatusBadgeClass(org.status)
                              )}
                            >
                              <span
                                className={cn(
                                  "w-1.5 h-1.5 rounded-full",
                                  getOrgStatusDotClass(org.status)
                                )}
                              />
                              {org.status}
                            </span>
                          </td>

                          {/* Actions */}
                          <td className="py-4 px-6 text-right whitespace-nowrap">
                            <div className="inline-flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openEditModal(org)}
                                className="h-8 px-3 text-xs font-semibold rounded-lg border border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-zinc-800 cursor-pointer active:scale-95 transition-all"
                              >
                                Edit
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => openOfficersSheet(org)}
                                className="h-8 px-3 text-xs font-semibold rounded-lg bg-slate-900 hover:bg-slate-800 text-white dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-900 shadow-xs cursor-pointer active:scale-95 transition-all"
                              >
                                Officers
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              /* Grid View Mode */
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredOrganizations.map((org) => {
                  const hasCbl = Boolean(org.bylaws_storage_filename);
                  const officerCount = parseInt(org.active_officer_count, 10) || 0;
                  const proposalCount = parseInt(org.proposal_count, 10) || 0;

                  return (
                    <Card
                      key={org.id}
                      className="rounded-2xl border border-gray-200/80 dark:border-white/10 bg-white dark:bg-card p-5 shadow-xs hover:border-gray-300 dark:hover:border-white/20 transition-all flex flex-col justify-between"
                    >
                      <div className="space-y-3.5">
                        {/* Header: Acronym, Category, Status */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            {org.acronym && (
                              <span className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-red-50 text-pup-maroon dark:bg-red-950/40 dark:text-red-400 border border-red-100 dark:border-red-900/30">
                                {org.acronym}
                              </span>
                            )}
                            <span className="px-2.5 py-1 text-[11px] font-medium rounded-lg bg-gray-100 text-gray-700 dark:bg-zinc-800 dark:text-zinc-300">
                              {org.category}
                            </span>
                          </div>
                          <span
                            className={cn(
                              "inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[11px] font-semibold rounded-full border",
                              getOrgStatusBadgeClass(org.status)
                            )}
                          >
                            <span
                              className={cn(
                                "w-1.5 h-1.5 rounded-full",
                                getOrgStatusDotClass(org.status)
                              )}
                            />
                            {org.status}
                          </span>
                        </div>

                        {/* Org Title & Description */}
                        <div>
                          <h3 className="text-[15px] font-bold text-gray-900 dark:text-zinc-50 leading-snug">
                            {org.name}
                          </h3>
                          {org.description ? (
                            <p className="mt-1.5 text-xs text-gray-500 dark:text-zinc-400 line-clamp-2 leading-relaxed">
                              {org.description}
                            </p>
                          ) : (
                            <p className="mt-1.5 text-xs text-gray-400 dark:text-zinc-500 italic">
                              No organization description provided.
                            </p>
                          )}
                        </div>

                        {/* Faculty Adviser */}
                        <div className="rounded-xl bg-gray-50/70 dark:bg-zinc-800/40 p-2.5 border border-gray-100 dark:border-white/5 space-y-1">
                          <div className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-zinc-500">
                            Faculty Adviser
                          </div>
                          <div className="text-xs font-medium text-gray-800 dark:text-zinc-200 flex items-center justify-between">
                            <span>{org.adviser_name || "Not assigned"}</span>
                            {org.adviser_email && (
                              <span className="text-[11px] text-gray-400 dark:text-zinc-500 font-mono">
                                {org.adviser_email}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Stats & CBL Status */}
                        <div className="grid grid-cols-2 gap-2 pt-1">
                          <div className="rounded-xl border border-gray-100 dark:border-white/5 p-2 bg-gray-50/30 dark:bg-zinc-800/20">
                            <span className="text-[11px] text-gray-400 dark:text-zinc-500 block">
                              Whitelisted
                            </span>
                            <span className="text-sm font-bold text-gray-900 dark:text-zinc-100">
                              {officerCount} {officerCount === 1 ? "Officer" : "Officers"}
                            </span>
                          </div>

                          <div className="rounded-xl border border-gray-100 dark:border-white/5 p-2 bg-gray-50/30 dark:bg-zinc-800/20">
                            <span className="text-[11px] text-gray-400 dark:text-zinc-500 block">
                              Proposals
                            </span>
                            <span className="text-sm font-bold text-gray-900 dark:text-zinc-100">
                              {proposalCount} Submitted
                            </span>
                          </div>
                        </div>

                        {/* CBL Archival State */}
                        <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-zinc-800/30 border border-gray-200/50 dark:border-white/5">
                          <div className="flex items-center gap-2">
                            <HugeIcon
                              className={cn(
                                "ph-bold text-base",
                                hasCbl
                                  ? "ph-file-pdf text-red-600 dark:text-red-400"
                                  : "ph-file-dashed text-gray-400"
                              )}
                            />
                            <div>
                              <span className="text-xs font-semibold text-gray-800 dark:text-zinc-200 block">
                                Constitution & By-Laws
                              </span>
                              <span className="text-[11px] text-gray-400 dark:text-zinc-500 block">
                                {hasCbl ? "Official Archival Copy" : "Pending PDF Archival"}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1">
                            {hasCbl ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handlePreviewCbl(org)}
                                  title="Preview Official CBL"
                                  className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-600 hover:text-pup-maroon hover:bg-white dark:text-zinc-300 dark:hover:bg-zinc-700 transition-all cursor-pointer"
                                >
                                  <HugeIcon className="ph-bold ph-eye text-sm" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setCblUploadOrg(org);
                                    setCblFile(null);
                                  }}
                                  title="Replace Archival CBL"
                                  className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-600 hover:text-pup-maroon hover:bg-white dark:text-zinc-300 dark:hover:bg-zinc-700 transition-all cursor-pointer"
                                >
                                  <HugeIcon className="ph-bold ph-upload-simple text-sm" />
                                </button>
                              </>
                            ) : (
                              <Button
                                variant="outline"
                                onClick={() => {
                                  setCblUploadOrg(org);
                                  setCblFile(null);
                                }}
                                className="h-7 px-2.5 text-[11px] font-semibold rounded-lg border-gray-200 dark:border-white/10"
                              >
                                Upload CBL
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Card Actions */}
                      <div className="pt-4 mt-4 border-t border-gray-100 dark:border-white/10 flex items-center justify-between gap-2">
                        <Button
                          variant="outline"
                          onClick={() => openEditModal(org)}
                          className="h-9 px-3 text-xs font-semibold rounded-xl border border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-zinc-800 active:scale-95 transition-all cursor-pointer"
                        >
                          Edit Org
                        </Button>
                        <Button
                          onClick={() => openOfficersSheet(org)}
                          className="h-9 px-4 text-xs font-semibold rounded-xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-900 shadow-xs cursor-pointer active:scale-95 transition-all"
                        >
                          Manage Officers
                        </Button>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>

          {/* 6. Footer Summary Strip */}
          <div className="flex items-center justify-between border-t border-gray-100 dark:border-white/10 bg-white dark:bg-card px-6 py-3.5 rounded-b-2xl text-xs text-gray-500 dark:text-zinc-400 select-none">
            <span>
              Showing <strong>{filteredOrganizations.length}</strong> of <strong>{organizations.length}</strong> recognized{" "}
              {organizations.length === 1 ? "organization" : "organizations"}
            </span>
            <span className="text-[11px] text-gray-400 dark:text-zinc-500">
              Only whitelisted student officers can submit campus event proposals for their organization.
            </span>
          </div>
        </Card>

        {/* Officer Whitelist Slide-Over Sheet */}
        <Sheet
          open={Boolean(selectedOrgForOfficers)}
          onOpenChange={(open) => !open && setSelectedOrgForOfficers(null)}
        >
          <SheetContent
            side="right"
            className="w-full sm:max-w-xl md:max-w-2xl data-[side=right]:w-full data-[side=right]:sm:max-w-xl data-[side=right]:md:max-w-2xl flex flex-col h-full bg-white dark:bg-card border-l border-gray-200 dark:border-white/10 p-0 shadow-2xl font-jakarta overflow-hidden"
          >
            <SheetHeader className="shrink-0 p-6 pb-4 pr-14 border-b border-gray-100 dark:border-white/10 bg-gradient-to-r from-gray-50/90 via-white to-gray-50/50 dark:from-zinc-900/90 dark:via-card dark:to-zinc-900/50">
              <div className="flex items-center gap-2 mb-1">
                {selectedOrgForOfficers?.acronym && (
                  <span className="px-2.5 py-0.5 text-[11px] font-bold rounded-lg bg-red-50 text-pup-maroon dark:bg-red-950/40 dark:text-red-400 border border-red-100 dark:border-red-900/30">
                    {selectedOrgForOfficers.acronym}
                  </span>
                )}
                <span className="text-xs font-medium text-gray-500 dark:text-zinc-400">
                  Authorized Submitter Whitelist
                </span>
              </div>
              <SheetTitle className="text-lg font-bold text-gray-900 dark:text-zinc-50">
                {selectedOrgForOfficers?.name}
              </SheetTitle>
              <SheetDescription className="text-xs text-gray-500 dark:text-zinc-400 mt-1">
                Whitelisted student officers are authorized to submit campus event proposals and represent this organization.
              </SheetDescription>
            </SheetHeader>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Add Officer Whitelist Box */}
              <div className="rounded-2xl border border-gray-200/80 dark:border-white/10 bg-gray-50/50 dark:bg-zinc-800/40 p-4 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-zinc-300 flex items-center gap-1.5">
                  <HugeIcon className="ph-bold ph-user-plus text-pup-maroon dark:text-red-400 text-sm" />
                  Add Student Officer to Whitelist
                </h4>
                <form onSubmit={handleAddOfficer} className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-gray-700 dark:text-zinc-300 mb-1">
                        Student Account Email <span className="text-red-500">*</span>
                      </label>
                      <Input
                        type="email"
                        required
                        placeholder="e.g. officer@pup.edu.ph"
                        value={officerForm.email}
                        onChange={(e) =>
                          setOfficerForm({ ...officerForm, email: e.target.value })
                        }
                        className="h-9 rounded-xl text-xs bg-white dark:bg-zinc-800"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-gray-700 dark:text-zinc-300 mb-1">
                        Officer Position <span className="text-red-500">*</span>
                      </label>
                      <Select
                        value={officerForm.position}
                        onChange={(e) =>
                          setOfficerForm({ ...officerForm, position: e.target.value })
                        }
                        usePortal={false}
                        className="h-9 rounded-xl text-xs bg-white dark:bg-zinc-800"
                      >
                        {OFFICER_POSITIONS.map((pos) => (
                          <option key={pos} value={pos}>
                            {pos}
                          </option>
                        ))}
                      </Select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-gray-700 dark:text-zinc-300 mb-1">
                        Student Full Name (Optional)
                      </label>
                      <Input
                        type="text"
                        placeholder="e.g. Cedrick Mariano"
                        value={officerForm.studentName}
                        onChange={(e) =>
                          setOfficerForm({ ...officerForm, studentName: e.target.value })
                        }
                        className="h-9 rounded-xl text-xs bg-white dark:bg-zinc-800"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-gray-700 dark:text-zinc-300 mb-1">
                        Student Number (Optional)
                      </label>
                      <Input
                        type="text"
                        placeholder="e.g. 2021-00123-SJ-0"
                        value={officerForm.studentNo}
                        onChange={(e) =>
                          setOfficerForm({ ...officerForm, studentNo: e.target.value })
                        }
                        className="h-9 rounded-xl text-xs bg-white dark:bg-zinc-800"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-1">
                    <Button
                      type="submit"
                      disabled={addingOfficer}
                      className="h-9 px-4 text-xs font-semibold rounded-xl! btn-brand-red text-white! cursor-pointer active:scale-95 transition-all shadow-xs"
                      style={{ color: "#ffffff" }}
                    >
                      {addingOfficer ? "Whitelisting..." : "Authorize Officer"}
                    </Button>
                  </div>
                </form>
              </div>

              {/* Officer Roster Table */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-zinc-300">
                    Active Authorized Officers ({officersList.length})
                  </h4>
                </div>

                {officersLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-12 w-full rounded-xl" />
                    <Skeleton className="h-12 w-full rounded-xl" />
                  </div>
                ) : officersList.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-gray-200 dark:border-white/10 p-6 text-center text-xs text-gray-500 dark:text-zinc-400">
                    No officers have been whitelisted for this organization yet. Add a student account email above.
                  </div>
                ) : (
                  <div className="rounded-xl border border-gray-200/80 dark:border-white/10 overflow-hidden divide-y divide-gray-100 dark:divide-white/5">
                    {officersList.map((officer) => (
                      <div
                        key={officer.id}
                        className="p-3.5 bg-white dark:bg-zinc-900 flex items-center justify-between gap-3 hover:bg-gray-50/50 dark:hover:bg-zinc-800/50 transition-colors"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-gray-900 dark:text-zinc-50">
                              {officer.student_name || officer.email}
                            </span>
                            <span className="px-2 py-0.5 text-[10px] font-semibold rounded-md bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-100 dark:border-blue-900/30">
                              {officer.position}
                            </span>
                          </div>
                          <div className="mt-0.5 flex items-center gap-2 text-[11px] text-gray-400 dark:text-zinc-500 font-mono">
                            <span>{officer.email}</span>
                            {officer.student_no && <span>· {officer.student_no}</span>}
                          </div>
                        </div>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setOfficerToRemove(officer)}
                          className="h-8 px-2.5 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/30 border border-gray-200 dark:border-white/10 rounded-lg cursor-pointer active:scale-95 transition-all"
                        >
                          Revoke
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <SheetFooter className="shrink-0 p-4 border-t border-gray-100 dark:border-white/10 bg-gray-50/50 dark:bg-zinc-900/30 flex justify-end gap-2.5">
              <Button
                variant="outline"
                onClick={() => setSelectedOrgForOfficers(null)}
                className="h-10 px-5 text-xs font-semibold rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-xs cursor-pointer active:scale-95 transition-all"
              >
                Close
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>

        {/* Register / Edit Organization Dialog (Section 9.3 Layout) */}
        <Dialog open={orgModalOpen} onOpenChange={setOrgModalOpen}>
          <DialogContent className="sm:max-w-xl w-full rounded-2xl bg-white border border-gray-200 dark:bg-zinc-900 dark:border-white/10 p-0 shadow-2xl overflow-hidden flex flex-col gap-0">
            <DialogHeader className="p-6 pb-4 bg-white dark:bg-card border-b border-gray-100 dark:border-white/10 text-left">
              <DialogTitle className="text-base font-bold text-gray-900 dark:text-zinc-50">
                {editingOrg ? "Edit Organization" : "Register Student Organization"}
              </DialogTitle>
              <DialogDescription className="text-xs text-gray-500 dark:text-zinc-400 mt-1">
                {editingOrg
                  ? "Update official student organization accreditation information."
                  : "Register a recognized campus organization in the OSAS records directory."}
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSaveOrg} className="flex flex-col flex-1 min-h-0">
              <div className="p-6 space-y-4 max-h-[65vh] overflow-y-auto">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-gray-700 dark:text-zinc-300 mb-1">
                      Organization Name <span className="text-red-500">*</span>
                    </label>
                    <Input
                      type="text"
                      required
                      placeholder="e.g. Helping Hands Community Organization"
                      value={orgForm.name}
                      onChange={(e) => setOrgForm({ ...orgForm, name: e.target.value })}
                      className="h-10 rounded-xl text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-zinc-300 mb-1">
                      Acronym
                    </label>
                    <Input
                      type="text"
                      placeholder="e.g. HHCO"
                      value={orgForm.acronym}
                      onChange={(e) => setOrgForm({ ...orgForm, acronym: e.target.value })}
                      className="h-10 rounded-xl text-xs uppercase"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-zinc-300 mb-1">
                      Category <span className="text-red-500">*</span>
                    </label>
                    <Select
                      value={orgForm.category}
                      onChange={(e) => setOrgForm({ ...orgForm, category: e.target.value })}
                      usePortal={false}
                      className="h-10 rounded-xl text-xs"
                    >
                      <option value="Academic">Academic</option>
                      <option value="Non-Academic">Non-Academic</option>
                    </Select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-zinc-300 mb-1">
                      Status
                    </label>
                    <Select
                      value={orgForm.status}
                      onChange={(e) => setOrgForm({ ...orgForm, status: e.target.value })}
                      usePortal={false}
                      className="h-10 rounded-xl text-xs"
                    >
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                      <option value="Archived">Archived</option>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-zinc-300 mb-1">
                      Faculty Adviser Name
                    </label>
                    <Input
                      type="text"
                      placeholder="e.g. Dr. Maria Santos"
                      value={orgForm.adviserName}
                      onChange={(e) => setOrgForm({ ...orgForm, adviserName: e.target.value })}
                      className="h-10 rounded-xl text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-zinc-300 mb-1">
                      Adviser Email
                    </label>
                    <Input
                      type="email"
                      placeholder="e.g. maria.santos@pup.local"
                      value={orgForm.adviserEmail}
                      onChange={(e) => setOrgForm({ ...orgForm, adviserEmail: e.target.value })}
                      className="h-10 rounded-xl text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-zinc-300 mb-1">
                    Description & Mission
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Brief description of the organization's goals and scope..."
                    value={orgForm.description}
                    onChange={(e) => setOrgForm({ ...orgForm, description: e.target.value })}
                    className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 p-3 text-xs focus:border-pup-maroon focus:ring-1 focus:ring-pup-maroon focus:outline-none resize-none text-gray-900 dark:text-zinc-100"
                  />
                </div>
              </div>

              <div className="px-6 py-4 bg-gray-50/50 dark:bg-zinc-900/50 border-t border-gray-100 dark:border-white/10 flex items-center justify-end gap-2.5 shrink-0">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOrgModalOpen(false)}
                  className="h-10 px-5 text-xs font-semibold rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-xs cursor-pointer active:scale-95 transition-all"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={savingOrg}
                  className="h-10 px-5 text-xs font-semibold rounded-xl! btn-brand-red text-white! active:scale-95 transition-all cursor-pointer shadow-xs disabled:opacity-50"
                  style={{ color: "#ffffff" }}
                >
                  {savingOrg
                    ? "Saving..."
                    : editingOrg
                    ? "Update Organization"
                    : "Register Organization"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Upload CBL Modal (Section 9.3 Layout) */}
        <Dialog
          open={Boolean(cblUploadOrg)}
          onOpenChange={(open) => !open && setCblUploadOrg(null)}
        >
          <DialogContent className="sm:max-w-md w-full rounded-2xl bg-white border border-gray-200 dark:bg-zinc-900 dark:border-white/10 p-0 shadow-2xl overflow-hidden flex flex-col gap-0">
            <DialogHeader className="p-6 pb-4 bg-white dark:bg-card border-b border-gray-100 dark:border-white/10 text-left">
              <DialogTitle className="text-base font-bold text-gray-900 dark:text-zinc-50">
                Upload Constitution & By-Laws (CBL)
              </DialogTitle>
              <DialogDescription className="text-xs text-gray-500 dark:text-zinc-400 mt-1">
                Archive the official approved Constitution and By-Laws document for{" "}
                <strong className="text-gray-900 dark:text-zinc-200">{cblUploadOrg?.name}</strong>.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleUploadCbl} className="flex flex-col flex-1 min-h-0">
              <div className="p-6 space-y-4 max-h-[65vh] overflow-y-auto">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-zinc-300 mb-1.5">
                    CBL Document (PDF) <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="file"
                    accept="application/pdf"
                    required
                    onChange={(e) => setCblFile(e.target.files?.[0] || null)}
                    className="h-10 rounded-xl text-xs file:mr-3 file:border-0 file:bg-transparent file:text-xs file:font-semibold file:text-pup-maroon"
                  />
                  <span className="text-[11px] text-gray-400 dark:text-zinc-500 mt-1.5 block">
                    Must be an official PDF file (max 25MB).
                  </span>
                </div>
              </div>

              <div className="px-6 py-4 bg-gray-50/50 dark:bg-zinc-900/50 border-t border-gray-100 dark:border-white/10 flex items-center justify-end gap-2.5 shrink-0">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCblUploadOrg(null)}
                  className="h-10 px-5 text-xs font-semibold rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-xs cursor-pointer active:scale-95 transition-all"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={uploadingCbl || !cblFile}
                  className="h-10 px-5 text-xs font-semibold rounded-xl! btn-brand-red text-white! active:scale-95 transition-all cursor-pointer shadow-xs disabled:opacity-50"
                  style={{ color: "#ffffff" }}
                >
                  {uploadingCbl ? "Uploading..." : "Archive CBL"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Revoke Officer Confirmation Modal */}
        <ConfirmModal
          open={Boolean(officerToRemove)}
          title="Revoke Officer Authorization?"
          description={`Are you sure you want to remove ${
            officerToRemove?.student_name || officerToRemove?.email
          } (${officerToRemove?.position}) from the officer whitelist? They will no longer be able to submit event proposals on behalf of this organization.`}
          confirmText="Revoke Access"
          variant="destructive"
          onConfirm={handleRemoveOfficer}
          onCancel={() => setOfficerToRemove(null)}
        />

        {/* CBL Preview Modal */}
        {previewPdf && (
          <PDFPreviewModal
            pdfUrl={previewPdf.url}
            title={previewPdf.title}
            filename={previewPdf.filename}
            isOpen={Boolean(previewPdf)}
            onClose={() => setPreviewPdf(null)}
          />
        )}
      </div>
    </TooltipProvider>
  );
}
