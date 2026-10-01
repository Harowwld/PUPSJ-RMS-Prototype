"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Reorder } from "framer-motion";
import HugeIcon from "@/components/shared/HugeIcon";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import KpiStatCardsSkeleton from "@/components/systemadmin/skeletons/KpiStatCardsSkeleton";
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
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "@/components/ui/tooltip";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
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

const getBannerStatusClass = (status) => {
  if (status === "Active") {
    return "bg-emerald-500/25 text-emerald-200 border-emerald-400/30";
  }
  if (status === "Archived") {
    return "bg-amber-500/25 text-amber-200 border-amber-400/30";
  }
  return "bg-white/15 text-white/90 border-white/20";
};

const getBannerStatusDotClass = (status) => {
  if (status === "Active") return "bg-emerald-400";
  if (status === "Archived") return "bg-amber-400";
  return "bg-white/60";
};

const getBylawsStatusBadgeClass = (status) => {
  if (status === "Approved") {
    return "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/40";
  }
  if (status === "Needs Revision") {
    return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/40";
  }
  if (status === "Declined") {
    return "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/40";
  }
  if (status === "Superseded") {
    return "bg-gray-100 text-gray-600 border-gray-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700";
  }
  return "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/40";
};



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

const STORAGE_KEY = "pupsj_student_orgs_kpi_order";
const DEFAULT_ORDER = ["organizations", "officers", "proposals"];

export default function StudentOrganizationsTab({ showToast = () => {} }) {
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilters, setCategoryFilters] = useState([]);
  const [statusFilters, setStatusFilters] = useState([]);
  const [viewMode, setViewMode] = useState("grid"); // "grid" | "table"

  // Draggable KPI Stat Cards & Interactive Popover State
  const [kpiOrder, setKpiOrder] = useState(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (
            Array.isArray(parsed) &&
            parsed.length === 3 &&
            parsed.every((k) => DEFAULT_ORDER.includes(k))
          ) {
            return parsed;
          }
        }
      } catch {
        // Fallback to default
      }
    }
    return DEFAULT_ORDER;
  });

  const handleReorder = (newOrder) => {
    setKpiOrder(newOrder);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newOrder));
    } catch {
      // Ignore storage errors
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

  // Whitelist Sheet State
  const [selectedOrgForOfficers, setSelectedOrgForOfficers] = useState(null);
  const [sheetSubTab, setSheetSubTab] = useState("officers"); // "info" | "officers"
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

  // CBL History State
  const [bylawsHistory, setBylawsHistory] = useState([]);
  const [bylawsHistoryLoading, setBylawsHistoryLoading] = useState(false);

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
    // eslint-disable-next-line react-hooks/set-state-in-effect
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

  // Fetch CBL History for Sheet
  const loadBylawsHistory = useCallback(
    async (orgId) => {
      if (!orgId) {
        setBylawsHistory([]);
        return;
      }
      try {
        setBylawsHistoryLoading(true);
        const res = await fetch(`/api/osas/organizations/${orgId}/bylaws`, {
          cache: "no-store",
        });
        const json = await res.json();
        if (!res.ok || !json.ok) {
          throw new Error(json.error || "Failed to load CBL history.");
        }
        if (Array.isArray(json.data)) {
          setBylawsHistory(json.data);
        } else if (json.data?.versions && Array.isArray(json.data.versions)) {
          setBylawsHistory(json.data.versions);
        } else if (json.data?.hasBylaws) {
          setBylawsHistory([
            {
              id: orgId,
              version_number: "1.0",
              status: "Approved",
              original_filename: json.data.originalFilename || "Constitution-and-By-Laws.pdf",
              amendment_summary: "Official ratified Constitution & By-Laws on file with OSAS.",
              submitted_by_name: "OSAS Office",
              created_at: json.data.updatedAt,
              effective_date: json.data.updatedAt
                ? new Date(json.data.updatedAt).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })
                : "Active",
              file_url: `/api/osas/organizations/${orgId}/bylaws?file=1`,
            },
          ]);
        } else {
          setBylawsHistory([]);
        }
      } catch (err) {
        showToast({
          title: "Error Loading CBL Records",
          description: err.message,
          variant: "destructive",
        });
        setBylawsHistory([]);
      } finally {
        setBylawsHistoryLoading(false);
      }
    },
    [showToast]
  );

  const openManageOrgSheet = (org, defaultTab = "info") => {
    setSelectedOrgForOfficers(org);
    setEditingOrg(org);
    setSheetSubTab(defaultTab);
    setOrgForm({
      name: org.name || "",
      acronym: org.acronym || "",
      category: org.category || "Academic",
      status: org.status || "Active",
      adviserName: org.adviser_name || "",
      adviserEmail: org.adviser_email || "",
      description: org.description || "",
    });
    setOfficerForm({
      email: "",
      position: "President",
      studentName: "",
      studentNo: "",
    });
    loadOfficers(org.id);
    loadBylawsHistory(org.id);
  };

  const openOfficersSheet = (org) => openManageOrgSheet(org, "officers");
  const openEditModal = (org) => openManageOrgSheet(org, "info");

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

  // Open Create Modal (for registering a brand-new organization)
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

  const handleSaveOrg = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
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
      const targetOrg = editingOrg || selectedOrgForOfficers;
      const url = targetOrg
        ? `/api/osas/organizations/${targetOrg.id}`
        : "/api/osas/organizations";
      const method = targetOrg ? "PATCH" : "POST";

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
        title: targetOrg ? "Organization Updated" : "Organization Created",
        description: `${orgForm.name} saved successfully.`,
      });
      setOrgModalOpen(false);
      if (selectedOrgForOfficers && targetOrg?.id === selectedOrgForOfficers.id) {
        setSelectedOrgForOfficers((prev) => ({
          ...prev,
          ...orgForm,
          adviser_name: orgForm.adviserName,
          adviser_email: orgForm.adviserEmail,
        }));
      }
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
      const uploadedOrgId = cblUploadOrg.id;
      setCblUploadOrg(null);
      setCblFile(null);
      fetchOrganizations();
      if (selectedOrgForOfficers?.id === uploadedOrgId) {
        loadBylawsHistory(uploadedOrgId);
      }
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

  // Standard KPI Metrics & Detailed Breakdown for Popovers
  const kpiStats = useMemo(() => {
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

    const academicCount = activeOrgs.filter((o) => o.category === "Academic").length;
    const nonAcademicCount = activeOrgs.filter((o) => o.category === "Non-Academic").length;
    const cblArchivedCount = activeOrgs.filter((o) => Boolean(o.bylaws_storage_filename)).length;

    const orgsWithOfficers = activeOrgs.filter(
      (o) => (parseInt(o.active_officer_count, 10) || 0) > 0
    );
    const orgsWithoutOfficers = activeOrgs.filter(
      (o) => (parseInt(o.active_officer_count, 10) || 0) === 0
    );

    const orgsWithProposals = activeOrgs.filter(
      (o) => (parseInt(o.proposal_count, 10) || 0) > 0
    );
    const orgsWithoutProposals = activeOrgs.filter(
      (o) => (parseInt(o.proposal_count, 10) || 0) === 0
    );

    const avgOfficers = total > 0 ? (totalOfficers / total).toFixed(1) : "0";

    const topOrgsByOfficers = [...activeOrgs]
      .sort(
        (a, b) =>
          (parseInt(b.active_officer_count, 10) || 0) -
          (parseInt(a.active_officer_count, 10) || 0)
      )
      .slice(0, 5);

    const topOrgsByProposals = [...activeOrgs]
      .sort(
        (a, b) =>
          (parseInt(b.proposal_count, 10) || 0) -
          (parseInt(a.proposal_count, 10) || 0)
      )
      .slice(0, 5);

    const orgRosterPreview = [...activeOrgs]
      .sort((a, b) =>
        (a.acronym || a.name || "").localeCompare(b.acronym || b.name || "")
      )
      .slice(0, 5);

    return {
      total,
      totalOfficers,
      totalProposals,
      academicCount,
      nonAcademicCount,
      cblArchivedCount,
      orgsWithOfficersCount: orgsWithOfficers.length,
      orgsWithoutOfficersCount: orgsWithoutOfficers.length,
      orgsWithProposalsCount: orgsWithProposals.length,
      orgsWithoutProposalsCount: orgsWithoutProposals.length,
      avgOfficers,
      topOrgsByOfficers,
      topOrgsByProposals,
      orgRosterPreview,
    };
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
              <div className="flex items-center gap-2">
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

                {/* Refresh Button */}
                <RefreshButton
                  onRefresh={() => fetchOrganizations(true)}
                  isLoading={loading}
                  title="Refresh Organizations"
                />

                {/* Register Organization Button */}
                <Button
                  type="button"
                  onClick={openCreateModal}
                  className="flex h-10 px-5 text-xs font-semibold rounded-xl! btn-brand-red text-white! active:scale-95 disabled:opacity-50 transition-all cursor-pointer shadow-xs"
                >
                  Register Organization
                </Button>
              </div>
            }
          />

          {/* 2. Top Summary Metrics Banner (Standard Reorderable Stat Cards Grid) */}
          <div className="px-6 pb-6">
            {loading && organizations.length === 0 ? (
              <KpiStatCardsSkeleton count={3} />
            ) : (
              <Reorder.Group
                as="div"
                axis="x"
                values={kpiOrder}
                onReorder={handleReorder}
                ref={statCardsRef}
                className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start relative z-20"
              >
                {kpiOrder.map((key) => {
                  if (key === "organizations") {
                    return (
                      <Reorder.Item
                        as="div"
                        value="organizations"
                        key="organizations"
                        className={cn(
                          "relative group rounded-xl cursor-grab active:cursor-grabbing",
                          selectedKpi === "organizations" ? "z-30" : "z-10"
                        )}
                      >
                        <div
                          onClick={() =>
                            setSelectedKpi(
                              selectedKpi === "organizations" ? null : "organizations"
                            )
                          }
                          className={cn(
                            "relative overflow-hidden rounded-[18px] border cursor-pointer select-none transition-all shadow-none flex flex-col justify-between min-h-[110px] bg-gray-50 dark:bg-zinc-900",
                            selectedKpi === "organizations"
                              ? "border-pup-maroon/50 ring-1 ring-pup-maroon/20"
                              : "border-gray-100 dark:border-white/5 hover:border-gray-200 dark:hover:border-white/10"
                          )}
                        >
                          <div className="flex justify-between items-start p-4 pb-0">
                            <div className="flex flex-col gap-1">
                              <span className="text-[13px] font-medium text-gray-500 dark:text-zinc-400 capitalize">
                                Recognized Orgs
                              </span>
                            </div>
                            <div className="w-8 h-8 rounded-[10px] flex items-center justify-center text-white shadow-sm shrink-0 bg-pup-maroon">
                              <HugeIcon className="ph-bold text-[15px] ph-buildings" />
                            </div>
                          </div>

                          <div className="flex justify-between items-end p-4 pt-1">
                            <div className="flex items-baseline gap-2">
                              <span className="text-[28px] font-bold text-gray-900 dark:text-white leading-none tracking-tight">
                                {loading ? <Skeleton className="h-7 w-12" /> : kpiStats.total}
                              </span>
                              <span className="text-xs font-medium text-pup-maroon dark:text-red-400 mb-1">
                                Campus Active
                              </span>
                            </div>
                            <HugeIcon
                              className="ph-bold ph-dots-six-vertical cursor-grab active:cursor-grabbing hover:text-gray-400 dark:hover:text-zinc-500 text-gray-300 dark:text-zinc-700 text-lg mb-0.5 shrink-0"
                              title="Drag to rearrange"
                            />
                          </div>
                        </div>

                        {/* Expandable Details Dropdown Popover */}
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
                              <div className="bg-gray-50 dark:bg-zinc-800/60 p-2.5 rounded-lg border border-gray-100 dark:border-white/5">
                                <span className="block text-[9px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-wider">
                                  Academic
                                </span>
                                <span className="text-lg font-black text-gray-900 dark:text-zinc-50">
                                  {kpiStats.academicCount}
                                </span>
                              </div>
                              <div className="bg-gray-50 dark:bg-zinc-800/60 p-2.5 rounded-lg border border-gray-100 dark:border-white/5">
                                <span className="block text-[9px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-wider">
                                  Non-Academic
                                </span>
                                <span className="text-lg font-black text-gray-900 dark:text-zinc-50">
                                  {kpiStats.nonAcademicCount}
                                </span>
                              </div>
                            </div>

                            <div className="bg-emerald-50/60 dark:bg-emerald-950/30 p-2.5 rounded-lg border border-emerald-100 dark:border-emerald-900/30 flex justify-between items-center text-xs">
                              <span className="font-semibold text-emerald-800 dark:text-emerald-300">
                                CBL On File (Archived)
                              </span>
                              <span className="font-bold text-emerald-900 dark:text-emerald-200">
                                {kpiStats.cblArchivedCount} of {kpiStats.total} orgs
                              </span>
                            </div>

                            <div>
                              <h4 className="text-[10px] font-bold text-gray-400 dark:text-zinc-500 mb-1.5 uppercase tracking-wide">
                                Active Organizations Preview
                              </h4>
                              <div className="max-h-36 overflow-y-auto space-y-1 pr-1">
                                {kpiStats.orgRosterPreview.length === 0 ? (
                                  <p className="text-[11px] text-gray-400 dark:text-zinc-500 text-center py-2">
                                    No active organizations
                                  </p>
                                ) : (
                                  kpiStats.orgRosterPreview.map((org) => (
                                    <div
                                      key={org.id}
                                      className="flex justify-between items-center text-[11px] py-1 border-b border-gray-100 dark:border-white/5 text-gray-700 dark:text-zinc-300"
                                    >
                                      <div className="truncate max-w-[170px]" title={org.name}>
                                        <span className="font-bold text-gray-900 dark:text-zinc-50">
                                          {org.acronym || org.name}
                                        </span>
                                        <span className="text-gray-400 dark:text-zinc-500 text-[10px] ml-1.5">
                                          ({org.category})
                                        </span>
                                      </div>
                                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                                        {org.status}
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
                  }

                  if (key === "officers") {
                    return (
                      <Reorder.Item
                        as="div"
                        value="officers"
                        key="officers"
                        className={cn(
                          "relative group rounded-xl cursor-grab active:cursor-grabbing",
                          selectedKpi === "officers" ? "z-30" : "z-10"
                        )}
                      >
                        <div
                          onClick={() =>
                            setSelectedKpi(
                              selectedKpi === "officers" ? null : "officers"
                            )
                          }
                          className={cn(
                            "relative overflow-hidden rounded-[18px] border cursor-pointer select-none transition-all shadow-none flex flex-col justify-between min-h-[110px] bg-gray-50 dark:bg-zinc-900",
                            selectedKpi === "officers"
                              ? "border-blue-500/50 ring-1 ring-blue-500/20"
                              : "border-gray-100 dark:border-white/5 hover:border-gray-200 dark:hover:border-white/10"
                          )}
                        >
                          <div className="flex justify-between items-start p-4 pb-0">
                            <div className="flex flex-col gap-1">
                              <span className="text-[13px] font-medium text-gray-500 dark:text-zinc-400 capitalize">
                                Officer Whitelist
                              </span>
                            </div>
                            <div className="w-8 h-8 rounded-[10px] flex items-center justify-center text-white shadow-sm shrink-0 bg-[#3b82f6]">
                              <HugeIcon className="ph-bold text-[15px] ph-shield-check" />
                            </div>
                          </div>

                          <div className="flex justify-between items-end p-4 pt-1">
                            <div className="flex items-baseline gap-2">
                              <span className="text-[28px] font-bold text-gray-900 dark:text-white leading-none tracking-tight">
                                {loading ? (
                                  <Skeleton className="h-7 w-12" />
                                ) : (
                                  kpiStats.totalOfficers
                                )}
                              </span>
                              <span className="text-xs font-medium text-blue-600 dark:text-blue-400 mb-1">
                                Authorized Submitters
                              </span>
                            </div>
                            <HugeIcon
                              className="ph-bold ph-dots-six-vertical cursor-grab active:cursor-grabbing hover:text-gray-400 dark:hover:text-zinc-500 text-gray-300 dark:text-zinc-700 text-lg mb-0.5 shrink-0"
                              title="Drag to rearrange"
                            />
                          </div>
                        </div>

                        {/* Expandable Details Dropdown Popover */}
                        <div
                          className={cn(
                            "absolute top-full left-0 right-0 z-[100] mt-2 rounded-xl border border-gray-200 bg-white p-4 shadow-xl dark:border-white/10 dark:bg-zinc-900 transition-all duration-300 ease-in-out origin-top",
                            selectedKpi === "officers"
                              ? "scale-y-100 opacity-100 translate-y-0"
                              : "scale-y-95 opacity-0 -translate-y-2 pointer-events-none"
                          )}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-2">
                              <div className="bg-gray-50 dark:bg-zinc-800/60 p-2.5 rounded-lg border border-gray-100 dark:border-white/5">
                                <span className="block text-[9px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-wider">
                                  Configured Orgs
                                </span>
                                <span className="text-lg font-black text-gray-900 dark:text-zinc-50">
                                  {kpiStats.orgsWithOfficersCount}
                                </span>
                              </div>
                              <div className="bg-blue-50/60 dark:bg-blue-950/30 p-2.5 rounded-lg border border-blue-100 dark:border-blue-900/30">
                                <span className="block text-[9px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                                  Pending Roster
                                </span>
                                <span className="text-lg font-black text-blue-700 dark:text-blue-400">
                                  {kpiStats.orgsWithoutOfficersCount}
                                </span>
                              </div>
                            </div>

                            <div className="bg-gray-50 dark:bg-zinc-800/60 p-2.5 rounded-lg border border-gray-100 dark:border-white/5 flex justify-between items-center text-xs">
                              <span className="font-semibold text-gray-600 dark:text-zinc-300">
                                Average Officers Per Org
                              </span>
                              <span className="font-bold text-gray-900 dark:text-zinc-100">
                                {kpiStats.avgOfficers}
                              </span>
                            </div>

                            <div>
                              <h4 className="text-[10px] font-bold text-gray-400 dark:text-zinc-500 mb-1.5 uppercase tracking-wide">
                                Top Officer Rosters
                              </h4>
                              <div className="max-h-36 overflow-y-auto space-y-1 pr-1">
                                {kpiStats.topOrgsByOfficers.length === 0 ? (
                                  <p className="text-[11px] text-gray-400 dark:text-zinc-500 text-center py-2">
                                    No officers configured
                                  </p>
                                ) : (
                                  kpiStats.topOrgsByOfficers.map((org) => (
                                    <div
                                      key={org.id}
                                      className="flex justify-between items-center text-[11px] py-1 border-b border-gray-100 dark:border-white/5 text-gray-700 dark:text-zinc-300"
                                    >
                                      <span
                                        className="truncate max-w-[170px] font-medium"
                                        title={org.name}
                                      >
                                        {org.acronym || org.name}
                                      </span>
                                      <span className="font-bold text-gray-900 dark:text-zinc-50">
                                        {org.active_officer_count || 0}{" "}
                                        {org.active_officer_count === 1
                                          ? "officer"
                                          : "officers"}
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
                  }

                  if (key === "proposals") {
                    return (
                      <Reorder.Item
                        as="div"
                        value="proposals"
                        key="proposals"
                        className={cn(
                          "relative group rounded-xl cursor-grab active:cursor-grabbing",
                          selectedKpi === "proposals" ? "z-30" : "z-10"
                        )}
                      >
                        <div
                          onClick={() =>
                            setSelectedKpi(
                              selectedKpi === "proposals" ? null : "proposals"
                            )
                          }
                          className={cn(
                            "relative overflow-hidden rounded-[18px] border cursor-pointer select-none transition-all shadow-none flex flex-col justify-between min-h-[110px] bg-gray-50 dark:bg-zinc-900",
                            selectedKpi === "proposals"
                              ? "border-emerald-500/50 ring-1 ring-emerald-500/20"
                              : "border-gray-100 dark:border-white/5 hover:border-gray-200 dark:hover:border-white/10"
                          )}
                        >
                          <div className="flex justify-between items-start p-4 pb-0">
                            <div className="flex flex-col gap-1">
                              <span className="text-[13px] font-medium text-gray-500 dark:text-zinc-400 capitalize">
                                Event Proposals
                              </span>
                            </div>
                            <div className="w-8 h-8 rounded-[10px] flex items-center justify-center text-white shadow-sm shrink-0 bg-[#10b981]">
                              <HugeIcon className="ph-bold text-[15px] ph-calendar-check" />
                            </div>
                          </div>

                          <div className="flex justify-between items-end p-4 pt-1">
                            <div className="flex items-baseline gap-2">
                              <span className="text-[28px] font-bold text-gray-900 dark:text-white leading-none tracking-tight">
                                {loading ? (
                                  <Skeleton className="h-7 w-12" />
                                ) : (
                                  kpiStats.totalProposals
                                )}
                              </span>
                              <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 mb-1">
                                Activity Proposals
                              </span>
                            </div>
                            <HugeIcon
                              className="ph-bold ph-dots-six-vertical cursor-grab active:cursor-grabbing hover:text-gray-400 dark:hover:text-zinc-500 text-gray-300 dark:text-zinc-700 text-lg mb-0.5 shrink-0"
                              title="Drag to rearrange"
                            />
                          </div>
                        </div>

                        {/* Expandable Details Dropdown Popover */}
                        <div
                          className={cn(
                            "absolute top-full left-0 right-0 z-[100] mt-2 rounded-xl border border-gray-200 bg-white p-4 shadow-xl dark:border-white/10 dark:bg-zinc-900 transition-all duration-300 ease-in-out origin-top",
                            selectedKpi === "proposals"
                              ? "scale-y-100 opacity-100 translate-y-0"
                              : "scale-y-95 opacity-0 -translate-y-2 pointer-events-none"
                          )}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-2">
                              <div className="bg-gray-50 dark:bg-zinc-800/60 p-2.5 rounded-lg border border-gray-100 dark:border-white/5">
                                <span className="block text-[9px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-wider">
                                  Active Proponents
                                </span>
                                <span className="text-lg font-black text-gray-900 dark:text-zinc-50">
                                  {kpiStats.orgsWithProposalsCount}
                                </span>
                              </div>
                              <div className="bg-emerald-50/60 dark:bg-emerald-950/30 p-2.5 rounded-lg border border-emerald-100 dark:border-emerald-900/30">
                                <span className="block text-[9px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                                  No Proposals Yet
                                </span>
                                <span className="text-lg font-black text-emerald-700 dark:text-emerald-400">
                                  {kpiStats.orgsWithoutProposalsCount}
                                </span>
                              </div>
                            </div>

                            <div className="bg-gray-50 dark:bg-zinc-800/60 p-2.5 rounded-lg border border-gray-100 dark:border-white/5 flex justify-between items-center text-xs">
                              <span className="font-semibold text-gray-600 dark:text-zinc-300">
                                Total Activity Submissions
                              </span>
                              <span className="font-bold text-gray-900 dark:text-zinc-100">
                                {kpiStats.totalProposals}
                              </span>
                            </div>

                            <div>
                              <h4 className="text-[10px] font-bold text-gray-400 dark:text-zinc-500 mb-1.5 uppercase tracking-wide">
                                Top Activity Proponents
                              </h4>
                              <div className="max-h-36 overflow-y-auto space-y-1 pr-1">
                                {kpiStats.topOrgsByProposals.length === 0 ? (
                                  <p className="text-[11px] text-gray-400 dark:text-zinc-500 text-center py-2">
                                    No activity proposals submitted
                                  </p>
                                ) : (
                                  kpiStats.topOrgsByProposals.map((org) => (
                                    <div
                                      key={org.id}
                                      className="flex justify-between items-center text-[11px] py-1 border-b border-gray-100 dark:border-white/5 text-gray-700 dark:text-zinc-300"
                                    >
                                      <span
                                        className="truncate max-w-[170px] font-medium"
                                        title={org.name}
                                      >
                                        {org.acronym || org.name}
                                      </span>
                                      <span className="font-bold text-gray-900 dark:text-zinc-50">
                                        {org.proposal_count || 0}{" "}
                                        {org.proposal_count === 1
                                          ? "proposal"
                                          : "proposals"}
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
                  }

                  return null;
                })}
              </Reorder.Group>
            )}
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
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-xs text-gray-900 dark:text-zinc-50 truncate max-w-xs md:max-w-sm">
                                  {org.name}
                                </span>
                                {org.acronym && (
                                  <span className="inline-flex px-1.5 py-0.5 text-[10px] font-bold rounded-md bg-red-50 text-pup-maroon dark:bg-red-950/40 dark:text-red-400 border border-red-100 dark:border-red-900/30 shrink-0">
                                    {org.acronym}
                                  </span>
                                )}
                              </div>
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
                              onClick={() => openManageOrgSheet(org, "officers")}
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
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <button
                                        type="button"
                                        onClick={() => handlePreviewCbl(org)}
                                        aria-label="Preview Official CBL"
                                        className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-500 hover:text-pup-maroon hover:bg-gray-100 dark:text-zinc-400 dark:hover:bg-zinc-800 transition-colors cursor-pointer active:scale-95"
                                      >
                                        <HugeIcon className="ph-bold ph-eye text-xs" />
                                      </button>
                                    </TooltipTrigger>
                                    <TooltipContent>Preview CBL (PDF)</TooltipContent>
                                  </Tooltip>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setCblUploadOrg(org);
                                          setCblFile(null);
                                        }}
                                        aria-label="Replace Archival CBL"
                                        className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-500 hover:text-pup-maroon hover:bg-gray-100 dark:text-zinc-400 dark:hover:bg-zinc-800 transition-colors cursor-pointer active:scale-95"
                                      >
                                        <HugeIcon className="ph-bold ph-upload-simple text-xs" />
                                      </button>
                                    </TooltipTrigger>
                                    <TooltipContent>Replace CBL</TooltipContent>
                                  </Tooltip>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center justify-center">
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setCblUploadOrg(org);
                                        setCblFile(null);
                                      }}
                                      aria-label="Upload Archival CBL"
                                      className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-500 hover:text-pup-maroon hover:bg-gray-100 dark:text-zinc-400 dark:hover:bg-zinc-800 transition-colors cursor-pointer active:scale-95"
                                    >
                                      <HugeIcon className="ph-bold ph-upload-simple text-xs" />
                                    </button>
                                  </TooltipTrigger>
                                  <TooltipContent>Upload Archival CBL</TooltipContent>
                                </Tooltip>
                              </div>
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
                            <div className="inline-flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button
                                    type="button"
                                    onClick={() => openManageOrgSheet(org, "info")}
                                    aria-label="Manage Organization Info"
                                    className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-500 hover:text-pup-maroon hover:bg-gray-100 dark:text-zinc-400 dark:hover:text-red-400 dark:hover:bg-zinc-800 transition-colors cursor-pointer active:scale-95 border-0 bg-transparent"
                                  >
                                    <HugeIcon className="ph-bold ph-pencil-simple text-[16px]" />
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent>Organization Details</TooltipContent>
                              </Tooltip>

                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button
                                    type="button"
                                    onClick={() => openManageOrgSheet(org, "officers")}
                                    aria-label="Manage Whitelisted Officers"
                                    className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-500 hover:text-pup-maroon hover:bg-gray-100 dark:text-zinc-400 dark:hover:text-red-400 dark:hover:bg-zinc-800 transition-colors cursor-pointer active:scale-95 border-0 bg-transparent"
                                  >
                                    <HugeIcon className="ph-bold ph-users text-[16px]" />
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent>Manage Officers</TooltipContent>
                              </Tooltip>
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
                      className="group rounded-2xl border border-gray-200/80 dark:border-white/10 bg-white dark:bg-card shadow-xs hover:border-gray-300 dark:hover:border-white/20 hover:shadow-md transition-all flex flex-col justify-between overflow-hidden"
                    >
                      {/* Institutional Header Banner */}
                      <div className="relative overflow-hidden bg-gradient-to-br from-[#800000] via-[#700000] to-[#4d0000] p-5 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.15)]">
                        {/* Ambient watermark */}
                        <div className="absolute -right-3 -bottom-5 opacity-10 pointer-events-none select-none text-white">
                          <HugeIcon className="ph-duotone ph-buildings text-7xl" />
                        </div>

                        {/* Top Meta Chips */}
                        <div className="relative z-10 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {org.acronym && (
                              <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-md bg-white/20 text-white backdrop-blur-xs border border-white/25">
                                {org.acronym}
                              </span>
                            )}
                            <span className="px-2 py-0.5 text-[10px] font-medium rounded-md bg-black/30 text-white/90 backdrop-blur-xs border border-white/15">
                              {org.category}
                            </span>
                          </div>
                          <span
                            className={cn(
                              "inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[11px] font-medium rounded-full border backdrop-blur-xs shrink-0",
                              getBannerStatusClass(org.status)
                            )}
                          >
                            <span
                              className={cn(
                                "w-1.5 h-1.5 rounded-full",
                                getBannerStatusDotClass(org.status)
                              )}
                            />
                            {org.status}
                          </span>
                        </div>

                        {/* Organization Title */}
                        <div className="relative z-10 mt-3.5">
                          <h3
                            className="text-base font-bold text-white tracking-tight leading-snug line-clamp-2"
                            title={org.name}
                          >
                            {org.name}
                          </h3>
                        </div>
                      </div>

                      {/* Card Body - Clean, Less Text, Crisp Spacing */}
                      <div className="p-4 space-y-3.5 flex-1 flex flex-col justify-between">
                        <div className="space-y-3">
                          {/* Faculty Adviser Row */}
                          <div className="flex items-center justify-between gap-2 text-xs py-0.5">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="w-6 h-6 rounded-lg bg-gray-100 dark:bg-zinc-800 flex items-center justify-center text-pup-maroon dark:text-red-400 shrink-0">
                                <HugeIcon className="ph-bold ph-chalkboard-teacher text-xs" />
                              </span>
                              <span className="truncate font-medium text-gray-800 dark:text-zinc-200">
                                {org.adviser_name || (
                                  <span className="text-gray-400 dark:text-zinc-500 italic font-normal">
                                    No adviser assigned
                                  </span>
                                )}
                              </span>
                            </div>
                            {org.adviser_email && (
                              <span
                                className="text-[11px] text-gray-400 dark:text-zinc-500 font-mono truncate max-w-[130px]"
                                title={org.adviser_email}
                              >
                                {org.adviser_email}
                              </span>
                            )}
                          </div>

                          {/* Key Metrics - Compact paired stat pills */}
                          <div className="grid grid-cols-2 gap-2">
                            <div className="flex items-center gap-2 p-2 rounded-xl bg-gray-50/70 dark:bg-zinc-800/40 border border-gray-100 dark:border-white/5">
                              <span className="w-7 h-7 rounded-lg bg-red-50 text-pup-maroon dark:bg-red-950/40 dark:text-red-400 flex items-center justify-center shrink-0">
                                <HugeIcon className="ph-bold ph-shield-check text-sm" />
                              </span>
                              <div className="min-w-0">
                                <div className="text-[10px] text-gray-400 dark:text-zinc-500 uppercase font-semibold tracking-wider">
                                  Officers
                                </div>
                                <div className="text-xs font-bold text-gray-900 dark:text-zinc-100 font-mono">
                                  {officerCount} active
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 p-2 rounded-xl bg-gray-50/70 dark:bg-zinc-800/40 border border-gray-100 dark:border-white/5">
                              <span className="w-7 h-7 rounded-lg bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300 flex items-center justify-center shrink-0">
                                <HugeIcon className="ph-bold ph-calendar-check text-sm" />
                              </span>
                              <div className="min-w-0">
                                <div className="text-[10px] text-gray-400 dark:text-zinc-500 uppercase font-semibold tracking-wider">
                                  Proposals
                                </div>
                                <div className="text-xs font-bold text-gray-900 dark:text-zinc-100 font-mono">
                                  {proposalCount} filed
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* CBL Archival Row */}
                          <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50/70 dark:bg-zinc-800/30 border border-gray-200/50 dark:border-white/5">
                            <div className="flex items-center gap-2 min-w-0">
                              <span
                                className={cn(
                                  "w-7 h-7 rounded-lg flex items-center justify-center shrink-0",
                                  hasCbl
                                    ? "bg-red-50 text-red-600 dark:bg-red-950/50 dark:text-red-400"
                                    : "bg-gray-100 text-gray-400 dark:bg-zinc-800 dark:text-zinc-500"
                                )}
                              >
                                <HugeIcon
                                  className={cn(
                                    "ph-bold text-sm",
                                    hasCbl ? "ph-file-pdf" : "ph-file-dashed"
                                  )}
                                />
                              </span>
                              <div className="min-w-0">
                                <span className="text-xs font-semibold text-gray-800 dark:text-zinc-200 block truncate">
                                  Constitution & By-Laws
                                </span>
                                <span className="text-[10px] text-gray-400 dark:text-zinc-500 block truncate">
                                  {hasCbl ? "Official Archival Copy" : "Pending PDF Archival"}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              {hasCbl ? (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handlePreviewCbl(org)}
                                    title="Preview Official CBL"
                                    className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-500 hover:text-pup-maroon hover:bg-white dark:text-zinc-400 dark:hover:bg-zinc-700 transition-all cursor-pointer"
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
                                    className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-500 hover:text-pup-maroon hover:bg-white dark:text-zinc-400 dark:hover:bg-zinc-700 transition-all cursor-pointer"
                                  >
                                    <HugeIcon className="ph-bold ph-upload-simple text-xs" />
                                  </button>
                                </>
                              ) : (
                                <Button
                                  variant="outline"
                                  onClick={() => {
                                    setCblUploadOrg(org);
                                    setCblFile(null);
                                  }}
                                  className="h-6 px-2 text-[10px] font-semibold rounded-lg border-gray-200 dark:border-white/10 cursor-pointer"
                                >
                                  Upload CBL
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Card Actions */}
                        <div className="pt-3 border-t border-gray-100 dark:border-white/10">
                          <Button
                            onClick={() => openManageOrgSheet(org, "info")}
                            className="w-full h-9 px-4 text-xs font-semibold rounded-xl! btn-brand-red text-white! shadow-xs cursor-pointer active:scale-95 transition-all"
                          >
                            Manage Organization
                          </Button>
                        </div>
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

        {/* Manage Organization Slide-Over Sheet */}
        <Sheet
          open={Boolean(selectedOrgForOfficers)}
          onOpenChange={(open) => {
            if (!open) {
              setSelectedOrgForOfficers(null);
              setEditingOrg(null);
            }
          }}
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
                <span className="text-xs font-semibold text-pup-maroon dark:text-red-400 uppercase tracking-wider">
                  Manage Organization
                </span>
              </div>
              <SheetTitle className="text-lg font-bold text-gray-900 dark:text-zinc-50">
                {selectedOrgForOfficers?.name}
              </SheetTitle>
              <SheetDescription className="text-xs text-gray-500 dark:text-zinc-400 mt-1">
                Manage organization profile, accredited student officers, and official Constitution & By-Laws records.
              </SheetDescription>
            </SheetHeader>

            {/* Sub-tab segmented switcher */}
            <div className="px-6 py-2.5 bg-gray-50/80 dark:bg-zinc-900/60 border-b border-gray-100 dark:border-white/10 flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-1 bg-gray-100/90 dark:bg-zinc-800/80 p-1 rounded-xl border border-gray-200/60 dark:border-white/5">
                <button
                  type="button"
                  onClick={() => setSheetSubTab("info")}
                  className={cn(
                    "inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer",
                    sheetSubTab === "info"
                      ? "bg-pup-maroon text-white shadow-xs"
                      : "text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white"
                  )}
                >
                  <HugeIcon className="ph-bold ph-identification-card text-xs" />
                  <span>Organization Info</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSheetSubTab("officers")}
                  className={cn(
                    "inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer",
                    sheetSubTab === "officers"
                      ? "bg-pup-maroon text-white shadow-xs"
                      : "text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white"
                  )}
                >
                  <HugeIcon className="ph-bold ph-users text-xs" />
                  <span>Authorized Officers</span>
                  <span
                    className={cn(
                      "px-1.5 py-0.2 rounded-full text-[10px] font-bold min-w-4 text-center",
                      sheetSubTab === "officers"
                        ? "bg-white/20 text-white"
                        : "bg-gray-200 dark:bg-zinc-700 text-gray-700 dark:text-zinc-300"
                    )}
                  >
                    {officersList.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setSheetSubTab("cbl")}
                  className={cn(
                    "inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer",
                    sheetSubTab === "cbl"
                      ? "bg-pup-maroon text-white shadow-xs"
                      : "text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white"
                  )}
                >
                  <HugeIcon className="ph-bold ph-book-bookmark text-xs" />
                  <span>Constitution & By-Laws</span>
                  <span
                    className={cn(
                      "px-1.5 py-0.2 rounded-full text-[10px] font-bold min-w-4 text-center",
                      sheetSubTab === "cbl"
                        ? "bg-white/20 text-white"
                        : "bg-gray-200 dark:bg-zinc-700 text-gray-700 dark:text-zinc-300"
                    )}
                  >
                    {bylawsHistory.length}
                  </span>
                </button>
              </div>

              {sheetSubTab === "cbl" && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setCblUploadOrg(selectedOrgForOfficers)}
                  className="h-8 px-3 text-xs font-semibold rounded-lg border-gray-200 dark:border-white/10 text-pup-maroon dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 cursor-pointer active:scale-95 transition-all"
                >
                  Archive
                </Button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {sheetSubTab === "info" ? (
                /* Organization Info Form */
                <form id="org-info-form" onSubmit={handleSaveOrg} className="space-y-4">
                  <div className="rounded-2xl border border-gray-200/80 dark:border-white/10 bg-white dark:bg-zinc-900 p-5 space-y-4 shadow-2xs">
                    <div className="flex items-center justify-between border-b border-gray-100 dark:border-white/5 pb-3">
                      <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-zinc-300">
                          Organization Profile
                        </h4>
                        <p className="text-[11px] text-gray-400 dark:text-zinc-500 mt-0.5">
                          Update accreditation details, faculty adviser, and organization scope.
                        </p>
                      </div>
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[11px] font-semibold rounded-full border",
                          getOrgStatusBadgeClass(orgForm.status)
                        )}
                      >
                        <span
                          className={cn(
                            "w-1.5 h-1.5 rounded-full",
                            getOrgStatusDotClass(orgForm.status)
                          )}
                        />
                        {orgForm.status}
                      </span>
                    </div>

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
                          className="h-10 rounded-xl text-xs bg-white dark:bg-zinc-800"
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
                          className="h-10 rounded-xl text-xs uppercase bg-white dark:bg-zinc-800"
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
                          className="h-10 rounded-xl text-xs bg-white dark:bg-zinc-800"
                        >
                          <option value="Academic">Academic</option>
                          <option value="Non-Academic">Non-Academic</option>
                        </Select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-gray-700 dark:text-zinc-300 mb-1">
                          Accreditation Status
                        </label>
                        <Select
                          value={orgForm.status}
                          onChange={(e) => setOrgForm({ ...orgForm, status: e.target.value })}
                          usePortal={false}
                          className="h-10 rounded-xl text-xs bg-white dark:bg-zinc-800"
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
                          className="h-10 rounded-xl text-xs bg-white dark:bg-zinc-800"
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
                          className="h-10 rounded-xl text-xs bg-white dark:bg-zinc-800"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 dark:text-zinc-300 mb-1">
                        Description & Mission
                      </label>
                      <textarea
                        rows={3}
                        placeholder="Brief description of the organization's goals, objectives, and scope..."
                        value={orgForm.description}
                        onChange={(e) => setOrgForm({ ...orgForm, description: e.target.value })}
                        className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 p-3 text-xs focus:border-pup-maroon focus:ring-1 focus:ring-pup-maroon focus:outline-none resize-none text-gray-900 dark:text-zinc-100"
                      />
                    </div>
                  </div>
                </form>
              ) : sheetSubTab === "officers" ? (
                <>
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
                          className="h-9 px-5 text-xs font-semibold rounded-xl! btn-brand-red text-white! cursor-pointer active:scale-95 transition-all shadow-xs"
                          style={{ color: "#ffffff" }}
                        >
                          {addingOfficer ? "Authorizing..." : "Authorize"}
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
                      <div className="rounded-2xl border border-gray-200/80 dark:border-white/10 overflow-hidden divide-y divide-gray-100 dark:divide-white/5 bg-white dark:bg-zinc-900 shadow-2xs">
                        {officersList.map((officer) => {
                          const roleStyle = getOfficerRoleStyle(officer.position);
                          const displayName =
                            officer.student_name ||
                            officer.studentName ||
                            officer.name ||
                            officer.email;
                          const initials = getInitials(displayName);
                          const avatarFilename =
                            officer.avatarFilename || officer.avatar_filename;
                          const avatarId =
                            officer.studentAccountId ||
                            officer.student_account_id ||
                            officer.studentNo ||
                            officer.student_no ||
                            officer.id;
                          const avatarSrc = avatarFilename
                            ? `/api/account/avatar?id=${avatarId}&t=${avatarFilename}`
                            : null;

                          return (
                            <div
                              key={officer.id}
                              className="p-3.5 flex items-center justify-between gap-3.5 hover:bg-gray-50/60 dark:hover:bg-zinc-800/50 transition-colors group"
                            >
                              {/* Left: Modern Circular Avatar + Officer Details */}
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="shrink-0">
                                  <Avatar
                                    className={cn(
                                      "size-10 rounded-full ring-2 shadow-xs font-jakarta",
                                      roleStyle.ring
                                    )}
                                  >
                                    {avatarSrc && (
                                      <AvatarImage
                                        src={avatarSrc}
                                        alt={displayName}
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
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-xs font-bold text-gray-900 dark:text-zinc-50 truncate">
                                      {displayName}
                                    </span>
                                    <Badge
                                      variant="outline"
                                      className={cn(
                                        "text-[10px] font-semibold px-2.5 py-0.5 rounded-full border",
                                        roleStyle.badge
                                      )}
                                    >
                                      {officer.position}
                                    </Badge>
                                  </div>
                                  <div className="mt-0.5 flex items-center gap-2 text-[11px] text-gray-400 dark:text-zinc-500 font-mono truncate">
                                    <span>{officer.email}</span>
                                    {(officer.student_no || officer.studentNo) && (
                                      <>
                                        <span className="text-gray-300 dark:text-zinc-600">·</span>
                                        <span>{officer.student_no || officer.studentNo}</span>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>

                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setOfficerToRemove(officer)}
                                className="h-8 px-2.5 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/30 border border-gray-200 dark:border-white/10 rounded-lg cursor-pointer active:scale-95 transition-all shrink-0"
                              >
                                Revoke
                              </Button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </>
              ) : (
                /* CBL Version History View */
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-zinc-300">
                        Constitution & By-Laws Versions ({bylawsHistory.length})
                      </h4>
                      <p className="text-[11px] text-gray-500 dark:text-zinc-400 mt-0.5">
                        Track ratification milestones, student amendment proposals, and official archived texts.
                      </p>
                    </div>
                  </div>

                  {bylawsHistoryLoading ? (
                    <div className="space-y-3">
                      <Skeleton className="h-20 w-full rounded-2xl" />
                      <Skeleton className="h-20 w-full rounded-2xl" />
                    </div>
                  ) : bylawsHistory.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-gray-200 dark:border-white/10 p-8 text-center text-xs text-gray-500 dark:text-zinc-400 bg-gray-50/40 dark:bg-zinc-900/30">
                      <HugeIcon className="ph-duotone ph-book-open text-3xl text-gray-400 mb-2" />
                      <p className="font-semibold text-gray-700 dark:text-zinc-300">No CBL records on file</p>
                      <p className="text-[11px] text-gray-400 mt-0.5 mb-3">
                        Use the Archive button above to upload the first official charter, or officers may submit an amendment.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {bylawsHistory.map((ver) => (
                        <div
                          key={ver.id}
                          className="rounded-2xl border border-gray-200/80 dark:border-white/10 bg-white dark:bg-zinc-900 p-4 space-y-3 shadow-xs hover:border-gray-300 dark:hover:border-zinc-700 transition-all"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="px-2 py-0.5 text-xs font-bold rounded-lg bg-red-50 text-pup-maroon dark:bg-red-950/40 dark:text-red-400 border border-red-100 dark:border-red-900/30">
                                  v{ver.version_number}
                                </span>
                                <span
                                  className={cn(
                                    "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border",
                                    getBylawsStatusBadgeClass(ver.status)
                                  )}
                                >
                                  {ver.status}
                                </span>
                                {ver.effective_date && (
                                  <span className="text-[11px] text-gray-500 dark:text-zinc-400">
                                    Effective: <strong className="text-gray-700 dark:text-zinc-300">{ver.effective_date}</strong>
                                  </span>
                                )}
                              </div>
                              <p className="text-xs font-medium text-gray-800 dark:text-zinc-200 mt-2">
                                {ver.amendment_summary || "Constitution & By-Laws official document"}
                              </p>
                            </div>

                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                setPreviewPdf({
                                  url: ver.file_url || `/api/osas/organizations/${selectedOrgForOfficers?.id}/bylaws?file=1`,
                                  title: `${selectedOrgForOfficers?.name} — CBL v${ver.version_number || "1.0"}`,
                                  filename: ver.original_filename || "Constitution-and-By-Laws.pdf",
                                })
                              }
                              className="h-8 px-3 text-xs font-semibold text-pup-maroon dark:text-red-400 hover:bg-gray-50 dark:hover:bg-zinc-800 rounded-lg shrink-0 cursor-pointer active:scale-95 transition-all"
                            >
                              Preview
                            </Button>
                          </div>

                          <div className="pt-2 border-t border-gray-100 dark:border-white/5 flex items-center justify-between text-[11px] text-gray-400 dark:text-zinc-500">
                            <span>
                              Submitted by {ver.submitted_by_name || "OSAS Admin"}
                              {ver.submitted_by_student_no ? ` (${ver.submitted_by_student_no})` : ""}
                            </span>
                            <span>
                              {ver.created_at
                                ? new Date(ver.created_at).toLocaleDateString(undefined, {
                                    month: "short",
                                    day: "numeric",
                                    year: "numeric",
                                  })
                                : ""}
                            </span>
                          </div>

                          {ver.review_notes && (
                            <div className="text-[11px] bg-gray-50 dark:bg-zinc-800/50 p-2.5 rounded-xl border border-gray-100 dark:border-white/5 text-gray-600 dark:text-zinc-300">
                              <strong className="text-gray-800 dark:text-zinc-200 font-semibold">OSAS Review Note:</strong> {ver.review_notes}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <SheetFooter className="shrink-0 p-4 border-t border-gray-100 dark:border-white/10 bg-gray-50/50 dark:bg-zinc-900/30 w-full">
              <div className="flex items-center gap-3 w-full">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setSelectedOrgForOfficers(null);
                    setEditingOrg(null);
                  }}
                  className="flex-1 h-10 text-xs font-semibold rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-xs cursor-pointer active:scale-95 transition-all"
                >
                  Close
                </Button>
                {sheetSubTab === "info" && (
                  <Button
                    type="submit"
                    form="org-info-form"
                    onClick={handleSaveOrg}
                    disabled={savingOrg}
                    className="flex-1 h-10 text-xs font-semibold rounded-xl! btn-brand-red text-white! shadow-xs cursor-pointer active:scale-95 transition-all"
                    style={{ color: "#ffffff" }}
                  >
                    {savingOrg ? "Saving..." : "Save"}
                  </Button>
                )}
              </div>
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
