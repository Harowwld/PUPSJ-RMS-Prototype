"use client";
import { BADGE_BASE } from "@/lib/badgeStyles";

import { Table } from "@/components/ui/table";
import TablePagination from "@/components/shared/TablePagination";
import SheetPagination from "@/components/shared/SheetPagination";
import { PDF_ACTION_LABELS } from "@/lib/pdfPreview";
import { Textarea } from "@/components/ui/textarea";
import NoticeBanner from "@/components/shared/NoticeBanner";
import CreateAnotherToggle from "@/components/shared/CreateAnotherToggle";
import useCreateAnother from "@/hooks/useCreateAnother";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Reorder } from "framer-motion";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { formatErrorMessage } from "@/lib/errorUtils";
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
  DialogFooter,
} from "@/components/ui/dialog";
import PageHeader from "@/components/shared/PageHeader";
import ViewModeIcon from "@/components/shared/ViewModeIcon";
import { SegmentedControl } from "@/components/ui/tabs";
import { RefreshButton } from "@/components/shared/RefreshButton";
import ConfirmModal from "@/components/shared/ConfirmModal";
import PDFPreviewModal from "@/components/shared/PDFPreviewModal";
import BulkImportOrganizationsModal from "./BulkImportOrganizationsModal";
import FileAttachmentDropzone from "@/components/shared/FileAttachmentDropzone";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyState,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
} from "@/components/ui/empty";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "@/components/ui/tooltip";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { matchesSearchQuery } from "@/lib/searchUtils";
import { Badge } from "@/components/ui/badge";
import MultiCriteriaFilter from "@/components/shared/MultiCriteriaFilter";
import ActiveFilterChips from "@/components/shared/ActiveFilterChips";
import TableScrollControls from "@/components/shared/TableScrollControls";
import DataViewToolbar from "@/components/shared/DataViewToolbar";
import useTableScroll from "@/hooks/useTableScroll";

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
  return "bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-border";
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

import { BANNER_GRADIENT_PRESETS, getOrgBannerGradientClasses } from "@/lib/constants";
import { Building03Icon as EmptyBuilding03Icon, UserGroupIcon, BookOpen01Icon , ArrowLeft01Icon, ArrowRight01Icon, ArrowUpRight01Icon, BookBookmark01Icon, Building01Icon, CalendarCheckIn01Icon, Cancel01Icon, DragDropIcon, File02Icon, Loading01Icon, PencilEdit01Icon, Search01Icon, Shield01Icon, Tick01Icon, Upload01Icon, UserAdd01Icon, UserSearch01Icon, ViewIcon} from "hugeicons-react";
import AppIcon from "@/components/ui/app-icon";
export { BANNER_GRADIENT_PRESETS, getOrgBannerGradientClasses };

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
    return "bg-gray-100 text-gray-600 border-border dark:bg-zinc-800 dark:text-zinc-400 dark:border-border";
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
      icon: " CrownIcon",
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

const STORAGE_KEY = "pupsj_student_orgs_kpi_order";
const DEFAULT_ORDER = ["organizations", "officers", "proposals"];

export default function StudentOrganizationsTab({ showToast = () => {} }) {
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearchState] = useState("");
  const [categoryFilters, setCategoryFiltersState] = useState([]);
  const [statusFilters, setStatusFiltersState] = useState([]);
  const [viewMode, setViewMode] = useState("grid"); // "grid" | "table"
  const [orgPage, setOrgPage] = useState(1);
  const [orgPageSize, setOrgPageSize] = useState(10);
  const setSearch = useCallback((value) => { setSearchState(value); setOrgPage(1); }, []);
  const setCategoryFilters = useCallback((value) => { setCategoryFiltersState(value); setOrgPage(1); }, []);
  const setStatusFilters = useCallback((value) => { setStatusFiltersState(value); setOrgPage(1); }, []);

  // Category Navigation Slider (horizontal scroll & drag)
  const categoryTabsRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [isTabsDragging, setIsTabsDragging] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const [dragScrollLeft, setDragScrollLeft] = useState(0);

  const checkTabsScroll = useCallback(() => {
    const el = categoryTabsRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanScrollLeft(scrollLeft > 2);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 2);
  }, []);

  useEffect(() => {
    const el = categoryTabsRef.current;
    if (!el) return;
    checkTabsScroll();
    el.addEventListener("scroll", checkTabsScroll, { passive: true });
    window.addEventListener("resize", checkTabsScroll);

    let ro;
    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(() => checkTabsScroll());
      ro.observe(el);
    }

    return () => {
      el.removeEventListener("scroll", checkTabsScroll);
      window.removeEventListener("resize", checkTabsScroll);
      ro?.disconnect();
    };
  }, [checkTabsScroll, organizations.length]);

  const slideCategories = (direction) => {
    const el = categoryTabsRef.current;
    if (!el) return;
    const offset = direction === "left" ? -220 : 220;
    el.scrollBy({ left: offset, behavior: "smooth" });
  };

  const handleTabsMouseDown = (e) => {
    const el = categoryTabsRef.current;
    if (!el) return;
    setIsTabsDragging(true);
    setDragStartX(e.pageX - el.offsetLeft);
    setDragScrollLeft(el.scrollLeft);
  };

  const handleTabsMouseMove = (e) => {
    if (!isTabsDragging) return;
    e.preventDefault();
    const el = categoryTabsRef.current;
    if (!el) return;
    const x = e.pageX - el.offsetLeft;
    const walk = (x - dragStartX) * 1.5;
    el.scrollLeft = dragScrollLeft - walk;
  };

  const handleTabsMouseUpOrLeave = () => {
    setIsTabsDragging(false);
  };

  const allCategories = useMemo(() => {
    const dynamicCats = new Set(["Academic", "Non-Academic"]);
    organizations.forEach((org) => {
      if (org.category && typeof org.category === "string") {
        dynamicCats.add(org.category.trim());
      }
    });
    return ["All", ...Array.from(dynamicCats)];
  }, [organizations]);

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
  const { attachForm, ...repeat } = useCreateAnother(orgModalOpen);
  const [bulkImportOpen, setBulkImportOpen] = useState(false);
  const [editingOrg, setEditingOrg] = useState(null);
  const [orgForm, setOrgForm] = useState({
    name: "",
    acronym: "",
    category: "Academic",
    status: "Active",
    bannerGradient: "maroon",
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

  // CBL Review State
  const [cblReviewModalOpen, setCblReviewModalOpen] = useState(false);
  const [cblReviewVersion, setCblReviewVersion] = useState(null);
  const [cblReviewAction, setCblReviewAction] = useState("Approved");
  const [cblReviewNote, setCblReviewNote] = useState("");
  const [cblReviewSubmitting, setCblReviewSubmitting] = useState(false);

  // Fetch Organizations
  const fetchOrganizations = useCallback(
    async (showFeedback = false) => {
      try {
        if (showFeedback) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }
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
        showToast(
          formatErrorMessage(err, {
            title: "Organizations Load Failed",
            actionContext: "Fetching student organizations",
          }),
          true
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
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
        showToast(
          formatErrorMessage(err, {
            title: "Officers Load Failed",
            actionContext: `Loading officers for organization ${orgId}`,
          }),
          true
        );
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
        showToast(
          formatErrorMessage(err, {
            title: "CBL Records Load Failed",
            actionContext: `Loading CBL history for organization ${orgId}`,
          }),
          true
        );
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
      bannerGradient: org.banner_gradient || "maroon",
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

  const handleAddOfficer = async (e) => {
    e.preventDefault();
    if (!selectedOrgForOfficers) return;
    if (!officerForm.email.trim() || !officerForm.position.trim()) {
      showToast({
        title: "Missing Officer Details",
        description: "Enter the officer's account email and position to give them access.",
      }, true);
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
        throw new Error(json.error || "Could not authorize the officer.");
      }

      showToast({
        title: "Officer Authorized",
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
      showToast(
        formatErrorMessage(err, {
          title: "Could Not Authorize Officer",
          actionContext: `Authorizing officer ${officerForm.email} for organization ${selectedOrgForOfficers?.name}`,
        }),
        true
      );
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
      showToast(
        formatErrorMessage(err, {
          title: "Officer Removal Failed",
          actionContext: `Removing officer ${officerToRemove?.student_name || officerToRemove?.email}`,
        }),
        true
      );
    }
  };

  // Open Create Modal (for registering a brand-new organization)
  const openCreateModal = () => {
    setEditingOrg(null);
    setSelectedOrgForOfficers(null);
    setOrgForm({
      name: "",
      acronym: "",
      category: "Academic",
      status: "Active",
      bannerGradient: "maroon",
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
        title: "Missing Organization Name",
        description: "Organization name is required to save record.",
      }, true);
      return;
    }

    if (!repeat.beginSave()) return;
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
      if (!targetOrg) {
        repeat.complete(() => {
          setOrgForm({ name: "", acronym: "", category: "Academic", status: "Active", bannerGradient: "maroon", adviserName: "", adviserEmail: "", description: "" });
        }, () => setOrgModalOpen(false));
      } else {
        setOrgModalOpen(false);
      }
      if (selectedOrgForOfficers && targetOrg?.id === selectedOrgForOfficers.id) {
        setSelectedOrgForOfficers((prev) => ({
          ...prev,
          ...orgForm,
          banner_gradient: orgForm.bannerGradient,
          adviser_name: orgForm.adviserName,
          adviser_email: orgForm.adviserEmail,
        }));
      }
      Promise.resolve().then(() => fetchOrganizations()).catch(() => {
        showToast({ title: "Refresh Failed", description: "Organization saved. Refresh the directory to see the updated list." }, true);
      });
    } catch (err) {
      showToast(
        formatErrorMessage(err, {
          title: "Organization Save Failed",
          actionContext: `Saving organization ${orgForm.name}`,
        }),
        true
      );
    } finally {
      setSavingOrg(false);
      repeat.endSave();
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
      showToast(
        formatErrorMessage(err, {
          title: "CBL Upload Failed",
          actionContext: `Uploading CBL for organization ${cblUploadOrg?.name}`,
        }),
        true
      );
    } finally {
      setUploadingCbl(false);
    }
  };

  // Preview CBL
  const handlePreviewCbl = (org) => {
    setPreviewPdf({
      url: `/api/osas/organizations/${org.id}/bylaws?file=1`,
      title: `${org.name}: Constitution & By-Laws (CBL)`,
      filename: org.bylaws_original_filename || `${org.acronym || org.name}-CBL.pdf`,
    });
  };

  const openCblReviewDialog = (ver, action) => {
    setCblReviewVersion(ver);
    setCblReviewAction(action);
    setCblReviewNote("");
    setCblReviewModalOpen(true);
  };

  const handleReviewCblSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!cblReviewVersion || !selectedOrgForOfficers) return;

    if ((cblReviewAction === "Needs Revision" || cblReviewAction === "Declined") && cblReviewNote.trim().length < 5) {
      toast.error("Review Note Required", {
        description: "Please provide at least 5 characters explaining what needs revision or the reason for declining.",
      });
      return;
    }

    setCblReviewSubmitting(true);
    try {
      const res = await fetch(`/api/osas/organizations/${selectedOrgForOfficers.id}/bylaws`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          versionId: cblReviewVersion.id,
          status: cblReviewAction,
          reviewNote: cblReviewNote.trim(),
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Failed to update review status.");
      }

      toast.success(
        cblReviewAction === "Approved"
          ? "Constitution & By-Laws Approved & Ratified"
          : cblReviewAction === "Needs Revision"
          ? "Revision requested from student officers"
          : "CBL submission declined"
      );

      setCblReviewModalOpen(false);
      setCblReviewVersion(null);
      setCblReviewNote("");
      await loadBylawsHistory(selectedOrgForOfficers.id);
      await fetchOrganizations(true);
    } catch (err) {
      const errInfo = formatErrorMessage(err, {
        title: "Review Submission Failed",
        actionContext: `Submitting ${cblReviewAction} review for CBL`,
      });
      toast.error(errInfo.title, {
        description: errInfo.description,
        action: errInfo.action,
      });
    } finally {
      setCblReviewSubmitting(false);
    }
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
  }, [setCategoryFilters, setStatusFilters]);

  const handleResetFilters = useCallback(() => {
    setSearch("");
    setCategoryFilters([]);
    setStatusFilters([]);
  }, [setSearch, setCategoryFilters, setStatusFilters]);

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
        const matches = matchesSearchQuery(
          [org.name, org.acronym, org.adviser_name, org.description],
          search
        );
        if (!matches) return false;
      }

      return true;
    });
  }, [organizations, statusFilters, categoryFilters, search]);

  const safeOrgPage = Math.min(orgPage, Math.max(1, Math.ceil(filteredOrganizations.length / orgPageSize)));
  const paginatedOrganizations = filteredOrganizations.slice((safeOrgPage - 1) * orgPageSize, safeOrgPage * orgPageSize);

  const currentOrgIndex = selectedOrgForOfficers
    ? filteredOrganizations.findIndex((o) => o.id === selectedOrgForOfficers.id)
    : -1;

  const handlePrevOrg = () => {
    if (currentOrgIndex > 0) {
      openManageOrgSheet(filteredOrganizations[currentOrgIndex - 1], sheetSubTab);
    }
  };

  const handleNextOrg = () => {
    if (currentOrgIndex >= 0 && currentOrgIndex < filteredOrganizations.length - 1) {
      openManageOrgSheet(filteredOrganizations[currentOrgIndex + 1], sheetSubTab);
    }
  };

  const {
    containerRef: tableContainerRef,
    isScrolledX,
    scrollLeft,
    scrollRight,
    resetScroll,
  } = useTableScroll([filteredOrganizations.length]);

  useEffect(() => {
    resetScroll();
  }, [viewMode, search, statusFilters, categoryFilters, resetScroll]);

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
  }, [search, categoryFilters, statusFilters, setSearch, setCategoryFilters, setStatusFilters]);

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
      <div className="font-jakarta w-full flex flex-[1_0_auto] flex-col h-auto gap-6 focus:outline-none animate-fade-up">
        {/* ONE Single Card Container encapsulating Header, Metrics, Toolbar, Active Filters, Content & Footer */}
        <Card className="flex flex-[1_0_auto] h-auto w-full flex-col p-0 gap-0 overflow-hidden rounded-2xl border border-border bg-white shadow-sm dark:border-border dark:bg-card dark:shadow-none isolate font-jakarta">
          {/* 1. Page Header */}
          <PageHeader
            icon="Building01Icon"
            title="Student Organizations"
            description="Manage recognized campus student organizations, their Constitution and By-Laws, and authorized officers."
            showBorder={false}
            className="p-6"
            titleClassName="text-[18px] font-semibold tracking-[-0.01em] text-gray-900 dark:text-zinc-50"
            descriptionClassName="text-[13px] font-normal text-gray-900 dark:text-zinc-300 mt-[4px]"
            actions={
              <div className="flex items-center gap-2">
                {/* Refresh Button */}
                <RefreshButton
                  onRefresh={() => fetchOrganizations(true)}
                  isLoading={refreshing}
                  title="Refresh Organizations"
                />

                {/* Import Organizations Button */}
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setBulkImportOpen(true)}
                  title="Import Organizations"
                  className="h-9 shrink-0 px-4 text-xs font-semibold rounded-xl border border-border dark:border-border bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-xs cursor-pointer active:scale-95 transition-all"
                >
                  Import Organizations
                </Button>

                {/* Register Organization Button */}
                <Button
                  type="button"
                  onClick={openCreateModal}
                  title="Register Organization"
                  className="h-9 shrink-0 px-4 cursor-pointer disabled:opacity-50"
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
                              : "border-border dark:border-border hover:border-border dark:hover:border-white/10"
                          )}
                        >
                          <div className="flex justify-between items-start p-4 pb-0">
                            <div className="flex flex-col gap-1">
                              <span className="text-[13px] font-medium text-gray-900 dark:text-zinc-300 capitalize">
                                Recognized Orgs
                              </span>
                            </div>
                            <div className="w-8 h-8 rounded-[10px] flex items-center justify-center text-white shadow-sm shrink-0 bg-pup-maroon">
                              <Building01Icon size="1em" className="text-[15px]" />
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
                            <DragDropIcon size="1em"
                              className="cursor-grab active:cursor-grabbing hover:text-black dark:hover:text-white text-gray-900 dark:text-zinc-300 text-xl mb-0.5 shrink-0"
                              title="Drag to rearrange"
                            />
                          </div>
                        </div>

                        {/* Expandable Details Dropdown Popover */}
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
                              <div className="bg-gray-50 dark:bg-zinc-800/60 p-2.5 rounded-lg border border-border dark:border-border">
                                <span className="block text-[9px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-wider">
                                  Academic
                                </span>
                                <span className="text-lg font-black text-gray-900 dark:text-zinc-50">
                                  {kpiStats.academicCount}
                                </span>
                              </div>
                              <div className="bg-gray-50 dark:bg-zinc-800/60 p-2.5 rounded-lg border border-border dark:border-border">
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
                                      className="flex justify-between items-center text-[11px] py-1 border-b border-border dark:border-border text-gray-700 dark:text-zinc-300"
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
                              : "border-border dark:border-border hover:border-border dark:hover:border-white/10"
                          )}
                        >
                          <div className="flex justify-between items-start p-4 pb-0">
                            <div className="flex flex-col gap-1">
                              <span className="text-[13px] font-medium text-gray-900 dark:text-zinc-300 capitalize">
                                Authorized Officers
                              </span>
                            </div>
                            <div className="w-8 h-8 rounded-[10px] flex items-center justify-center text-white shadow-sm shrink-0 bg-[#3b82f6]">
                              <Shield01Icon size="1em" className="text-[15px]" />
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
                            <DragDropIcon size="1em"
                              className="cursor-grab active:cursor-grabbing hover:text-black dark:hover:text-white text-gray-900 dark:text-zinc-300 text-xl mb-0.5 shrink-0"
                              title="Drag to rearrange"
                            />
                          </div>
                        </div>

                        {/* Expandable Details Dropdown Popover */}
                        <div
                          className={cn(
                            "absolute top-full left-0 right-0 z-[100] mt-2 rounded-xl border border-border bg-white p-4 shadow-xl dark:border-border dark:bg-zinc-900 transition-all duration-300 ease-in-out origin-top",
                            selectedKpi === "officers"
                              ? "scale-y-100 opacity-100 translate-y-0"
                              : "scale-y-95 opacity-0 -translate-y-2 pointer-events-none"
                          )}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-2">
                              <div className="bg-gray-50 dark:bg-zinc-800/60 p-2.5 rounded-lg border border-border dark:border-border">
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

                            <div className="bg-gray-50 dark:bg-zinc-800/60 p-2.5 rounded-lg border border-border dark:border-border flex justify-between items-center text-xs">
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
                                      className="flex justify-between items-center text-[11px] py-1 border-b border-border dark:border-border text-gray-700 dark:text-zinc-300"
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
                              : "border-border dark:border-border hover:border-border dark:hover:border-white/10"
                          )}
                        >
                          <div className="flex justify-between items-start p-4 pb-0">
                            <div className="flex flex-col gap-1">
                              <span className="text-[13px] font-medium text-gray-900 dark:text-zinc-300 capitalize">
                                Event Proposals
                              </span>
                            </div>
                            <div className="w-8 h-8 rounded-[10px] flex items-center justify-center text-white shadow-sm shrink-0 bg-[#10b981]">
                              <CalendarCheckIn01Icon size="1em" className="text-[15px]" />
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
                            <DragDropIcon size="1em"
                              className="cursor-grab active:cursor-grabbing hover:text-black dark:hover:text-white text-gray-900 dark:text-zinc-300 text-xl mb-0.5 shrink-0"
                              title="Drag to rearrange"
                            />
                          </div>
                        </div>

                        {/* Expandable Details Dropdown Popover */}
                        <div
                          className={cn(
                            "absolute top-full left-0 right-0 z-[100] mt-2 rounded-xl border border-border bg-white p-4 shadow-xl dark:border-border dark:bg-zinc-900 transition-all duration-300 ease-in-out origin-top",
                            selectedKpi === "proposals"
                              ? "scale-y-100 opacity-100 translate-y-0"
                              : "scale-y-95 opacity-0 -translate-y-2 pointer-events-none"
                          )}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-2">
                              <div className="bg-gray-50 dark:bg-zinc-800/60 p-2.5 rounded-lg border border-border dark:border-border">
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

                            <div className="bg-gray-50 dark:bg-zinc-800/60 p-2.5 rounded-lg border border-border dark:border-border flex justify-between items-center text-xs">
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
                                      className="flex justify-between items-center text-[11px] py-1 border-b border-border dark:border-border text-gray-700 dark:text-zinc-300"
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

          {/* 3. Navigation Toolbar: Category Navigation Slider & Search/Status Controls */}
          <DataViewToolbar label="Organization search, views, and filters" className="border-t border-border dark:border-border p-5 gap-3 bg-white dark:bg-card">
            {/* Left: Category Navigation Slider */}
            <div className="relative min-w-[220px] flex-1 max-w-full overflow-hidden flex items-center">
              {/* Left Gradient Mask & Chevron */}
              {canScrollLeft && (
                <div className="absolute left-0 inset-y-0 z-10 flex items-center pr-3 bg-gradient-to-r from-gray-50/95 via-gray-50/70 to-transparent dark:from-zinc-900/95 dark:via-zinc-900/70">
                  <button
                    type="button"
                    onClick={() => slideCategories("left")}
                    className="w-7 h-7 rounded-full bg-white dark:bg-zinc-800 border border-border shadow-xs flex items-center justify-center text-gray-600 dark:text-zinc-300 hover:text-pup-maroon dark:hover:text-red-400 transition-all cursor-pointer active:scale-95"
                    title="Slide left"
                    aria-label="Slide categories left"
                  >
                    <ArrowLeft01Icon size="1em" className="text-xs" />
                  </button>
                </div>
              )}

              {/* Scrollable / Draggable Tabs Track */}
              <div
                ref={categoryTabsRef}
                onMouseDown={handleTabsMouseDown}
                onMouseMove={handleTabsMouseMove}
                onMouseUp={handleTabsMouseUpOrLeave}
                onMouseLeave={handleTabsMouseUpOrLeave}
                className={cn(
                  "flex items-center gap-2 overflow-x-auto no-scrollbar scroll-smooth select-none py-1 px-0.5 w-full",
                  isTabsDragging ? "cursor-grabbing" : "cursor-grab"
                )}
              >
                {allCategories.map((cat) => {
                  const isActive =
                    cat === "All"
                      ? categoryFilters.length === 0
                      : categoryFilters.length === 1 && categoryFilters[0] === cat;
                  const count =
                    cat === "All"
                      ? organizations.length
                      : organizations.filter((o) => o.category === cat).length;

                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={(e) => {
                        setCategoryFilters(cat === "All" ? [] : [cat]);
                        e.currentTarget.scrollIntoView({
                          behavior: "smooth",
                          block: "nearest",
                          inline: "center",
                        });
                      }}
                      className={cn(
                        "relative h-8 px-3 flex items-center gap-2 text-xs font-semibold rounded-lg transition-all cursor-pointer border whitespace-nowrap shrink-0 select-none",
                        isActive
                          ? "bg-white dark:bg-zinc-800 text-gray-900 dark:text-white border-border/80 dark:border-white/10 shadow-xs"
                          : "bg-transparent text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white border-transparent hover:bg-gray-100/60 dark:hover:bg-zinc-800/40"
                      )}
                    >
                      <span>{cat === "All" ? "All Organizations" : cat}</span>
                      <span
                        className={cn("px-1.5 py-0.2 rounded-full text-[10px] font-sans tabular-nums", isActive
                            ? "bg-pup-maroon/10 text-pup-maroon dark:bg-red-950/40 dark:text-red-300 font-bold"
                            : "bg-gray-200/60 dark:bg-zinc-700/60 text-gray-500 dark:text-zinc-400 font-medium", BADGE_BASE)}
                      >
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Right Gradient Mask & Chevron */}
              {canScrollRight && (
                <div className="absolute right-0 inset-y-0 z-10 flex items-center pl-3 bg-gradient-to-l from-gray-50/95 via-gray-50/70 to-transparent dark:from-zinc-900/95 dark:via-zinc-900/70">
                  <button
                    type="button"
                    onClick={() => slideCategories("right")}
                    className="w-7 h-7 rounded-full bg-white dark:bg-zinc-800 border border-border shadow-xs flex items-center justify-center text-gray-600 dark:text-zinc-300 hover:text-pup-maroon dark:hover:text-red-400 transition-all cursor-pointer active:scale-95"
                    title="Slide right"
                    aria-label="Slide categories right"
                  >
                    <ArrowRight01Icon size="1em" className="text-xs" />
                  </button>
                </div>
              )}
            </div>

            {/* Right: Search Input & Multi-Criteria Filter */}
            <div className="flex flex-nowrap items-center gap-3 shrink-0">
              {/* Search Bar with live count badge */}
              <div className="w-full sm:w-[260px] lg:w-[300px] relative group shrink-0">
                <div className="pointer-events-none absolute inset-y-0 left-3 z-10 flex items-center">
                  <Search01Icon size="1em" className="text-gray-400 dark:text-zinc-500 transition-colors group-focus-within:text-pup-maroon dark:group-focus-within:text-red-400 text-sm" />
                </div>
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search org name, acronym, adviser..."
                  className="h-9 w-full rounded-xl border border-border dark:border-border bg-white dark:bg-zinc-800 pl-8 pr-16 text-xs font-normal text-gray-900 dark:text-zinc-100 placeholder:text-gray-400 dark:placeholder:text-zinc-500 shadow-none focus-visible:outline-none focus-visible:border-pup-maroon focus-visible:ring-1 focus-visible:ring-pup-maroon dark:focus-visible:border-red-500/80 dark:focus-visible:ring-red-500/80 transition-all"
                />
                <div className="pointer-events-none absolute inset-y-0 right-3 z-10 flex items-center text-[11px] text-gray-400 dark:text-zinc-500 font-sans tabular-nums">
                  {filteredOrganizations.length.toLocaleString()}
                </div>
              </div>

              <SegmentedControl
                value={viewMode}
                onValueChange={setViewMode}
                variant="capsule"
                className="inline-grid grid-flow-col auto-cols-fr"
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
            {viewMode === "table" && <TableScrollControls scrollContainerRef={tableContainerRef} isScrolledX={isScrolledX} onResetScroll={resetScroll} onScrollLeft={() => scrollLeft(400)} onScrollRight={() => scrollRight(400)} />}
          </DataViewToolbar>

          {/* 4. Active Filter Chips & Scroll Controls */}
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

          {/* 5. Main Content Area (Dual View Engine) */}
          <div className={cn("flex-[1_0_auto] flex flex-col border-t border-border dark:border-border bg-white dark:bg-card overflow-hidden", filteredOrganizations.length === 0 && "rounded-b-2xl")}>
            {loading && organizations.length === 0 ? (
              viewMode === "table" ? (
                <div className="p-6 space-y-3">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Skeleton key={i} className="h-12 w-full rounded-xl" />
                  ))}
                </div>
              ) : (
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div
                      key={i}
                      className="rounded-2xl border border-border/80 dark:border-border bg-white dark:bg-card overflow-hidden flex flex-col justify-between"
                    >
                      <div className="bg-gray-100 dark:bg-zinc-800 p-5 space-y-3 rounded-t-[15px]">
                        <div className="flex items-center justify-between">
                          <Skeleton className="h-5 w-16 rounded-md" />
                          <Skeleton className="h-5 w-20 rounded-full" />
                        </div>
                        <Skeleton className="h-5 w-3/4 rounded-md" />
                      </div>
                      <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                        <div className="space-y-3">
                          <Skeleton className="h-4 w-1/2 rounded" />
                          <Skeleton className="h-12 w-full rounded-xl" />
                          <Skeleton className="h-10 w-full rounded-xl" />
                        </div>
                        <div className="pt-3 border-t border-border dark:border-border">
                          <Skeleton className="h-9 w-full rounded-xl" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )
            ) : filteredOrganizations.length === 0 ? (
              <div className="rounded-b-2xl flex-1 flex flex-col items-center justify-center min-h-[420px] w-full">
                <Empty>
                  <EmptyHeader>
                    <EmptyMedia><EmptyBuilding03Icon size="1em" /></EmptyMedia>
                    <EmptyTitle>
                      No Student Organizations Found
                    </EmptyTitle>
                    <EmptyDescription>
                      {hasActiveFilters
                        ? "Try adjusting your search criteria or resetting category filters."
                        : "Register recognized student organizations to manage their Constitution and By-Laws and authorized officers."}
                    </EmptyDescription>
                  </EmptyHeader>
                  <EmptyContent>
                    {hasActiveFilters ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleResetFilters}
                        title="Reset Filters"
                        className="flex h-9 items-center justify-center rounded-xl border border-border dark:border-border bg-white dark:bg-zinc-800 px-4 text-xs font-semibold text-gray-700 dark:text-zinc-200 shadow-xs transition-all hover:bg-gray-50 dark:hover:bg-zinc-700 active:scale-95 cursor-pointer"
                      >
                        Reset Filters
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        size="sm"
                        onClick={openCreateModal}
                        title="Register Organization"
                        className="h-9 px-4 cursor-pointer border-0"
                      >
                        Register Organization
                      </Button>
                    )}
                  </EmptyContent>
                </Empty>
              </div>
            ) : viewMode === "table" ? (
              /* Table View Mode */
              <div
                ref={tableContainerRef}
                className="w-full flex-[1_0_auto] overflow-x-auto show-scrollbar pb-2"
              >
                <Table columns={[{ kind: "text", maxWidth: 340 }, "category", "text", "number", "status", "status", "actions"]} className="min-w-[1240px]">
                  <thead className="sticky top-0 z-10 border-b border-border bg-gray-50/90 dark:bg-zinc-900/90 backdrop-blur-xs select-none">
                    <tr className="text-left text-xs font-semibold text-gray-500 dark:text-zinc-400">
                      <th
                        className={cn(
                          "p-4 pl-6 w-[280px] min-w-[280px] sticky left-0 z-20 bg-gray-50 dark:bg-zinc-900 transition-shadow",
                          isScrolledX && "shadow-[4px_0_12px_-2px_rgba(0,0,0,0.06)] dark:shadow-[4px_0_12px_-2px_rgba(0,0,0,0.4)]"
                        )}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span>Organization</span>
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
                      <th className="p-4 w-[140px] min-w-[140px]">Category</th>
                      <th className="p-4 w-[200px] min-w-[200px]">Faculty Adviser</th>
                      <th className="p-4 w-[130px] min-w-[130px] text-center">Officers</th>
                      <th className="p-4 w-[180px] min-w-[180px]">Constitution & By-Laws</th>
                      <th className="p-4 w-[120px] min-w-[120px] text-center">Status</th>
                      <th className="p-4 pr-6 text-right w-[90px] min-w-[90px]">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border dark:divide-border bg-white dark:bg-card">
                    {paginatedOrganizations.map((org) => {
                      const hasCbl = Boolean(org.bylaws_storage_filename);
                      const officerCount = parseInt(org.active_officer_count, 10) || 0;

                      return (
                        <tr
                          key={org.id}
                          className="hover:bg-gray-50/70 dark:hover:bg-zinc-800/40 transition-colors group"
                        >
                          {/* Org Name & Acronym */}
                          <td
                            className={cn(
                              "p-4 pl-6 overflow-hidden sticky left-0 z-10 bg-white group-hover:bg-gray-50/70 dark:bg-card dark:group-hover:bg-zinc-800/40 transition-shadow border-r border-border/70",
                              isScrolledX && "shadow-[4px_0_12px_-2px_rgba(0,0,0,0.06)] dark:shadow-[4px_0_12px_-2px_rgba(0,0,0,0.4)]"
                            )}
                          >
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 min-w-0">
                                <span
                                  className="w-2.5 h-2.5 rounded-full shrink-0 shadow-2xs border border-black/10 dark:border-white/20"
                                  style={{
                                    background: BANNER_GRADIENT_PRESETS.find((p) => p.id === org.banner_gradient)?.previewGradient || BANNER_GRADIENT_PRESETS[0].previewGradient,
                                  }}
                                  title={`Theme: ${BANNER_GRADIENT_PRESETS.find((p) => p.id === org.banner_gradient)?.label || "PUP Maroon"}`}
                                />
                                {org.acronym && (
                                  <span className="font-sans tabular-nums text-xs font-semibold px-2 py-0.5 rounded-md bg-gray-100 dark:bg-zinc-800 text-gray-800 dark:text-zinc-200 shrink-0">
                                    {org.acronym}
                                  </span>
                                )}
                                <span className="font-semibold text-xs text-gray-900 dark:text-zinc-50 truncate" title={org.name}>
                                  {org.name}
                                </span>
                              </div>
                              {org.description ? (
                                <p className="text-[11px] text-gray-600 dark:text-zinc-300 truncate mt-0.5 block" title={org.description}>
                                  {org.description}
                                </p>
                              ) : (
                                <span className="text-[11px] text-gray-400 dark:text-zinc-500 italic mt-0.5 block truncate">
                                  No description provided
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Category Badge */}
                          <td className="p-4 whitespace-nowrap border-r border-border/70 dark:border-border/70">
                            <span className="px-2.5 py-1 text-xs font-medium rounded-lg bg-gray-100 text-gray-700 dark:bg-zinc-800 dark:text-zinc-300">
                              {org.category}
                            </span>
                          </td>

                          {/* Faculty Adviser */}
                          <td className="p-4 overflow-hidden border-r border-border/70 dark:border-border/70">
                            <div className="text-xs font-medium text-gray-900 dark:text-zinc-100 truncate" title={org.adviser_name}>
                              {org.adviser_name || (
                                <span className="text-gray-400 italic">Not assigned</span>
                              )}
                            </div>
                            {org.adviser_email && (
                              <div className="text-[11px] text-gray-400 dark:text-zinc-500 font-sans tabular-nums mt-0.5 truncate" title={org.adviser_email}>
                                {org.adviser_email}
                              </div>
                            )}
                          </td>

                          {/* Authorized Officers */}
                          <td className="p-4 text-center whitespace-nowrap border-r border-border/70 dark:border-border/70">
                            <button
                              type="button"
                              onClick={() => openManageOrgSheet(org, "officers")}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-100 dark:border-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors cursor-pointer"
                              title="Manage authorized officers"
                            >
                              <Shield01Icon size="1em" className="text-xs" />
                              <span>
                                {officerCount} {officerCount === 1 ? "Officer" : "Officers"}
                              </span>
                            </button>
                          </td>

                          {/* Constitution & By-Laws */}
                          <td className="p-4 whitespace-nowrap border-r border-border/70 dark:border-border/70">
                            {Number(org.pending_cbl_count) > 0 ? (
                              <button
                                type="button"
                                onClick={() => openManageOrgSheet(org, "cbl")}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800/40 hover:bg-amber-100 transition-colors cursor-pointer"
                                title="Click to review pending CBL submission"
                              >
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                                <span>{org.pending_cbl_count} Pending Review</span>
                              </button>
                            ) : hasCbl ? (
                              <div className="flex items-center gap-2">
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400 border border-red-100 dark:border-red-900/30">
                                  <File02Icon size="1em" className="text-xs" />
                                  <span>Archived</span>
                                </span>
                                <div className="flex items-center gap-1">
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <button
                                        type="button"
                                        onClick={() => handlePreviewCbl(org)}
                                        aria-label={PDF_ACTION_LABELS.preview}
                                        className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-500 hover:text-pup-maroon hover:bg-gray-100 dark:text-zinc-400 dark:hover:bg-zinc-800 transition-colors cursor-pointer active:scale-95"
                                      >
                                        <ViewIcon size="1em" className="text-xs" />
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
                                        <Upload01Icon size="1em" className="text-xs" />
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
                                      <Upload01Icon size="1em" className="text-xs" />
                                    </button>
                                  </TooltipTrigger>
                                  <TooltipContent>Upload Archival CBL</TooltipContent>
                                </Tooltip>
                              </div>
                            )}
                          </td>

                          {/* Status */}
                          <td className="p-4 text-center whitespace-nowrap border-r border-border/70 dark:border-border/70">
                            <span
                              className={cn("inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[11px] font-semibold rounded-full border", getOrgStatusBadgeClass(org.status), BADGE_BASE)}
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
                          <td className="p-4 pr-6 text-right whitespace-nowrap">
                            <div className="inline-flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button
                                    type="button"
                                    onClick={() => openManageOrgSheet(org, "info")}
                                    aria-label="Manage Organization Info"
                                    className="table-action-button rounded-lg text-gray-500 hover:text-pup-maroon dark:text-zinc-400 dark:hover:text-red-400 active:scale-95 cursor-pointer"
                                  >
                                    <PencilEdit01Icon size="1em" className="text-[16px]" />
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent>Organization Details</TooltipContent>
                              </Tooltip>

                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button
                                    type="button"
                                    onClick={() => openManageOrgSheet(org, "officers")}
                                    aria-label="Manage authorized officers"
                                    className="table-action-button rounded-lg text-gray-500 hover:text-pup-maroon dark:text-zinc-400 dark:hover:text-red-400 active:scale-95 cursor-pointer"
                                  >
                                    <UserSearch01Icon size="1em" className="text-[16px]" />
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
                </Table>
              </div>
            ) : (
              /* Grid View Mode */
              <div className="p-6 flex-[1_0_auto] content-start grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {paginatedOrganizations.map((org) => {
                  const hasCbl = Boolean(org.bylaws_storage_filename);
                  const officerCount = parseInt(org.active_officer_count, 10) || 0;
                  const proposalCount = parseInt(org.proposal_count, 10) || 0;

                  return (
                    <div
                      key={org.id}
                      className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-border/80 dark:border-border bg-white dark:bg-card shadow-xs hover:border-gray-300 dark:hover:border-white/20 hover:shadow-md transition-all duration-200"
                    >
                      {/* Institutional Header Banner */}
                      <div
                        className={cn(
                          "relative overflow-hidden rounded-t-[15px] bg-gradient-to-br p-5 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.18)] border-b border-black/10 dark:border-white/10",
                          getOrgBannerGradientClasses(org.banner_gradient)
                        )}
                      >
                        {/* Ambient watermark */}
                        <div className="absolute -right-2 -bottom-2 text-white/10 pointer-events-none select-none transition-transform duration-300 group-hover:scale-105">
                          <Building01Icon size="1em" className="text-5xl" />
                        </div>

                        {/* Top Meta Chips */}
                        <div className="relative z-10 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {org.acronym && (
                              <span className="px-2 py-0.5 text-[10px] font-bold font-sans tabular-nums uppercase tracking-wider rounded-md bg-white/20 text-white backdrop-blur-xs border border-white/25 shadow-2xs">
                                {org.acronym}
                              </span>
                            )}
                            <span className="px-2 py-0.5 text-[10px] font-medium rounded-md bg-black/25 text-white/90 backdrop-blur-xs border border-white/15">
                              {org.category}
                            </span>
                          </div>
                          <span
                            className={cn("inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[11px] font-medium rounded-full border backdrop-blur-xs shrink-0", getBannerStatusClass(org.status), BADGE_BASE)}
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
                        <div className="relative z-10 mt-3">
                          <h3
                            className="text-[15px] font-semibold text-white! tracking-tight leading-snug line-clamp-2 min-h-[44px] flex items-center"
                            style={{ color: "#ffffff" }}
                            title={org.name}
                          >
                            {org.name}
                          </h3>
                        </div>
                      </div>

                      {/* Card Body - Clean, Crisp Spacing */}
                      <div className="p-4 space-y-3.5 flex-1 flex flex-col justify-between">
                        <div className="space-y-3">
                          {/* Faculty Adviser Row */}
                          <div className="flex items-center justify-between gap-2 text-xs py-0.5">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="w-6 h-6 rounded-lg bg-gray-100 dark:bg-zinc-800 flex items-center justify-center text-pup-maroon dark:text-red-400 shrink-0">
                                <AppIcon className=" TeacherIcon text-xs" />
                              </span>
                              <div className="min-w-0">
                                <span className="text-[10px] text-gray-400 dark:text-zinc-500 uppercase font-semibold tracking-wider block leading-tight">
                                  Adviser
                                </span>
                                <span className="truncate font-medium text-gray-900 dark:text-zinc-100 block leading-tight">
                                  {org.adviser_name || (
                                    <span className="text-gray-400 dark:text-zinc-500 italic font-normal">
                                      No adviser assigned
                                    </span>
                                  )}
                                </span>
                              </div>
                            </div>
                            {org.adviser_email && (
                              <span
                                className="text-[11px] text-gray-400 dark:text-zinc-500 font-sans tabular-nums truncate max-w-[130px] self-end mb-0.5"
                                title={org.adviser_email}
                              >
                                {org.adviser_email}
                              </span>
                            )}
                          </div>

                          {/* Key Metrics - Unified Segmented Tile */}
                          <div className="grid grid-cols-2 divide-x divide-border dark:divide-border rounded-xl bg-gray-50/80 dark:bg-zinc-800/40 border border-border/80 dark:border-border p-2">
                            <div className="flex items-center gap-2 px-2 min-w-0">
                              <span className="w-7 h-7 rounded-lg bg-red-50 text-pup-maroon dark:bg-red-950/40 dark:text-red-400 flex items-center justify-center shrink-0">
                                <Shield01Icon size="1em" className="text-sm" />
                              </span>
                              <div className="min-w-0">
                                <div className="text-[10px] text-gray-400 dark:text-zinc-500 uppercase font-semibold tracking-wider">
                                  Officers
                                </div>
                                <div className="text-xs font-bold text-gray-900 dark:text-zinc-100 font-sans tabular-nums">
                                  {officerCount} active
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 px-2 min-w-0">
                              <span className="w-7 h-7 rounded-lg bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300 flex items-center justify-center shrink-0">
                                <CalendarCheckIn01Icon size="1em" className="text-sm" />
                              </span>
                              <div className="min-w-0">
                                <div className="text-[10px] text-gray-400 dark:text-zinc-500 uppercase font-semibold tracking-wider">
                                  Proposals
                                </div>
                                <div className="text-xs font-bold text-gray-900 dark:text-zinc-100 font-sans tabular-nums">
                                  {proposalCount} filed
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* CBL Archival Row */}
                          <div className="flex items-center justify-between p-2.5 rounded-xl bg-gray-50/50 dark:bg-zinc-800/30 border border-border/60 dark:border-border gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <span
                                className={cn(
                                  "w-7 h-7 rounded-lg flex items-center justify-center shrink-0",
                                  Number(org.pending_cbl_count) > 0
                                    ? "bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400"
                                    : hasCbl
                                    ? "bg-red-50 text-red-600 dark:bg-red-950/50 dark:text-red-400"
                                    : "bg-gray-100 text-gray-400 dark:bg-zinc-800 dark:text-zinc-500"
                                )}
                              >
                                <AppIcon
                                  className={cn(
                                    " text-sm",
                                    hasCbl ? "File02Icon" : "FileAddIcon"
                                  )}
                                />
                              </span>
                              <div className="min-w-0">
                                <span className="text-xs font-semibold text-gray-800 dark:text-zinc-200 block truncate">
                                  Constitution & By-Laws
                                </span>
                                <span className="text-[10px] text-gray-400 dark:text-zinc-500 block truncate">
                                  {Number(org.pending_cbl_count) > 0 ? (
                                    <span className="text-amber-600 dark:text-amber-400 font-semibold inline-flex items-center gap-1">
                                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                                      {org.pending_cbl_count} Pending Review
                                    </span>
                                  ) : hasCbl ? (
                                    <span className="text-emerald-600 dark:text-emerald-400 font-medium inline-flex items-center gap-1">
                                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                      Official Archival Copy
                                    </span>
                                  ) : (
                                    <span className="text-gray-400 dark:text-zinc-500 inline-flex items-center gap-1">
                                      <span className="w-1.5 h-1.5 rounded-full bg-zinc-300 dark:bg-zinc-600" />
                                      Pending PDF Archival
                                    </span>
                                  )}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              {Number(org.pending_cbl_count) > 0 ? (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => openManageOrgSheet(org, "cbl")}
                                  className="h-7 px-2.5 text-[11px] font-semibold rounded-lg bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800/40 hover:bg-amber-100 transition-all cursor-pointer active:scale-95"
                                >
                                  Review
                                </Button>
                              ) : hasCbl ? (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handlePreviewCbl(org)}
                                    title={PDF_ACTION_LABELS.preview}
                                    className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-500 hover:text-pup-maroon hover:bg-white dark:text-zinc-400 dark:hover:bg-zinc-700 transition-all cursor-pointer border border-transparent hover:border-border"
                                  >
                                    <ViewIcon size="1em" className="text-xs" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setCblUploadOrg(org);
                                      setCblFile(null);
                                    }}
                                    title="Replace Archival CBL"
                                    className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-500 hover:text-pup-maroon hover:bg-white dark:text-zinc-400 dark:hover:bg-zinc-700 transition-all cursor-pointer border border-transparent hover:border-border"
                                  >
                                    <Upload01Icon size="1em" className="text-xs" />
                                  </button>
                                </>
                              ) : (
                                <Button
                                  variant="outline"
                                  onClick={() => {
                                    setCblUploadOrg(org);
                                    setCblFile(null);
                                  }}
                                  title="Upload Constitution & By-Laws"
                                  className="h-6 px-2 text-[10px] font-semibold rounded-lg border-border dark:border-border cursor-pointer hover:bg-gray-100 dark:hover:bg-zinc-800"
                                >
                                  Upload CBL
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Card Actions */}
                        <div className="pt-3 border-t border-border dark:border-border">
                          <Button
                            onClick={() => openManageOrgSheet(org, "info")}
                            title="Manage Organization"
                            className="w-full h-9 px-4 cursor-pointer"
                          >
                            Manage Organization
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 6. Shared Table and Card Pagination Footer */}
          {!loading && filteredOrganizations.length > 0 && (
            <TablePagination label="Student organization pages" page={orgPage} pageSize={orgPageSize} totalCount={filteredOrganizations.length} displayedCount={paginatedOrganizations.length} onPageChange={setOrgPage} onPageSizeChange={setOrgPageSize} loading={loading} />
          )}
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
            size="default"
            showCloseButton={false}
            className="w-full sm:max-w-md md:max-w-lg lg:max-w-xl flex flex-col h-full p-0 overflow-hidden"
          >
            <SheetHeader className="shrink-0 p-0">
              <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4">
                <div>
                  <SheetTitle>
                    Manage Organization
                  </SheetTitle>
                  <SheetDescription className="sr-only">
                    Manage organization profile, accredited student officers, and official Constitution & By-Laws records
                  </SheetDescription>
                </div>

                <div className="ml-auto flex items-center gap-3">
                  {filteredOrganizations.length > 1 && (
                    <SheetPagination
                      compact
                      label="Record navigation"
                      page={Math.max(1, currentOrgIndex + 1)}
                      totalPages={filteredOrganizations.length}
                      onPrevious={handlePrevOrg}
                      onNext={handleNextOrg}
                      previousDisabled={currentOrgIndex <= 0}
                      nextDisabled={currentOrgIndex >= filteredOrganizations.length - 1}
                      previousLabel="Previous Organization"
                      nextLabel="Next Organization"
                    />
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedOrgForOfficers(null);
                      setEditingOrg(null);
                    }}
                    className="size-8 rounded-full bg-black/[0.04] hover:bg-black/[0.08] dark:bg-white/[0.08] dark:hover:bg-white/[0.14] text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-zinc-100 flex items-center justify-center transition-all cursor-pointer active:scale-95 border border-black/[0.04] dark:border-white/[0.08] shadow-2xs"
                    aria-label="Close"
                    title="Close"
                  >
                    <Cancel01Icon size="1em" className="text-sm" />
                  </button>
                </div>
              </div>

              {/* Organization Profile Strip */}
              <div className="flex items-center gap-3 px-6 pb-3 pt-1 border-gray-100/80 dark:border-zinc-800/60 bg-gray-50/40 dark:bg-zinc-900/30">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    {selectedOrgForOfficers?.acronym && (
                      <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-red-50 text-pup-maroon dark:bg-red-950/40 dark:text-red-400 border border-pup-maroon/20">
                        {selectedOrgForOfficers.acronym}
                      </span>
                    )}
                    <span className="text-[10px] font-medium text-gray-500 dark:text-zinc-400">
                      {selectedOrgForOfficers?.category}
                    </span>
                    <span
                      className={cn("inline-flex items-center px-2 py-0.5 text-[10px] font-semibold rounded-full border", getOrgStatusBadgeClass(selectedOrgForOfficers?.status), BADGE_BASE)}
                    >
                      {selectedOrgForOfficers?.status}
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-gray-900 dark:text-zinc-50 truncate mt-0.5">
                    {selectedOrgForOfficers?.name}
                  </h4>
                </div>
              </div>
            </SheetHeader>

            {/* Line-Attached Operational Notice for Status */}
            {selectedOrgForOfficers?.status === "Archived" ? (
              <NoticeBanner
                tone="danger"
                role="status"
                action={
                  sheetSubTab !== "info" ? (
                    <button
                      type="button"
                      onClick={() => setSheetSubTab("info")}
                      title="Switch to Organization Info to reinstate"
                      className="inline-flex items-center gap-1 text-xs font-semibold text-rose-950 dark:text-rose-100 hover:underline underline-offset-4 transition-colors cursor-pointer active:scale-95"
                    >
                      <span>Reinstate in Organization Info</span>
                      <ArrowUpRight01Icon size={13} aria-hidden="true" className="shrink-0" />
                    </button>
                  ) : null
                }
              >
                <span className="font-semibold">Archived Organization:</span> This organization record is archived. Modification of officers and records is restricted until reinstated.
              </NoticeBanner>
            ) : selectedOrgForOfficers?.status === "Inactive" ? (
              <NoticeBanner
                tone="warning"
                action={
                  sheetSubTab !== "info" ? (
                    <button
                      type="button"
                      onClick={() => setSheetSubTab("info")}
                      title="Switch to Organization Info to update accreditation status"
                      className="inline-flex items-center gap-1 text-xs font-semibold text-amber-950 dark:text-amber-100 hover:underline underline-offset-4 transition-colors cursor-pointer active:scale-95"
                    >
                      <span>Update Status in Organization Info</span>
                      <ArrowUpRight01Icon size={13} aria-hidden="true" className="shrink-0" />
                    </button>
                  ) : null
                }
              >
                <span className="font-semibold">Inactive Accreditation:</span> Accreditation for this organization is currently inactive. Review officers and Constitution before processing proposals.
              </NoticeBanner>
            ) : (
              <NoticeBanner tone="success">
                <span className="font-semibold">Accredited Campus Organization:</span> Leadership roster authorized to sponsor campus events and execute official paperwork.
              </NoticeBanner>
            )}

            {/* Sub-tab segmented switcher */}
            <div className="px-6 py-2.5 bg-gray-50/80 dark:bg-zinc-900/60 border-b border-border dark:border-border flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-1 bg-black/[0.04] dark:bg-white/[0.06] p-1 rounded-full border border-black/[0.04] dark:border-white/[0.08] shadow-[inset_0_1px_2px_rgba(0,0,0,0.03)]">
                <button
                  type="button"
                  onClick={() => setSheetSubTab("info")}
                  className={cn(
                    "inline-flex items-center gap-1.5 px-3.5 py-1 text-xs font-semibold rounded-full transition-all duration-150 cursor-pointer active:scale-[0.98]",
                    sheetSubTab === "info"
                      ? "bg-white dark:bg-zinc-800 text-gray-950 dark:text-white shadow-[0_1px_3px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.04),inset_0_1px_0_0_rgba(255,255,255,0.85)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.35),inset_0_1px_0_0_rgba(255,255,255,0.08)]"
                      : "text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white"
                  )}
                >
                  <AppIcon className=" Contact01Icon text-xs" />
                  <span>Organization Info</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSheetSubTab("officers")}
                  className={cn(
                    "inline-flex items-center gap-1.5 px-3.5 py-1 text-xs font-semibold rounded-full transition-all duration-150 cursor-pointer active:scale-[0.98]",
                    sheetSubTab === "officers"
                      ? "bg-white dark:bg-zinc-800 text-gray-950 dark:text-white shadow-[0_1px_3px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.04),inset_0_1px_0_0_rgba(255,255,255,0.85)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.35),inset_0_1px_0_0_rgba(255,255,255,0.08)]"
                      : "text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white"
                  )}
                >
                  <UserSearch01Icon size="1em" className="text-xs" />
                  <span>Authorized Officers</span>
                  <span
                    className={cn(
                      "px-1.5 py-0.2 rounded-full text-[10px] font-bold min-w-4 text-center",
                      sheetSubTab === "officers"
                        ? "bg-pup-maroon/10 text-pup-maroon dark:bg-red-950/40 dark:text-red-300"
                        : "bg-black/5 dark:bg-zinc-700 text-gray-700 dark:text-zinc-300",
                      BADGE_BASE
                    )}
                  >
                    {officersList.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setSheetSubTab("cbl")}
                  className={cn(
                    "inline-flex items-center gap-1.5 px-3.5 py-1 text-xs font-semibold rounded-full transition-all duration-150 cursor-pointer active:scale-[0.98]",
                    sheetSubTab === "cbl"
                      ? "bg-white dark:bg-zinc-800 text-gray-950 dark:text-white shadow-[0_1px_3px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.04),inset_0_1px_0_0_rgba(255,255,255,0.85)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.35),inset_0_1px_0_0_rgba(255,255,255,0.08)]"
                      : "text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white"
                  )}
                >
                  <BookBookmark01Icon size="1em" className="text-xs" />
                  <span>Constitution & By-Laws</span>
                  <span
                    className={cn(
                      "px-1.5 py-0.2 rounded-full text-[10px] font-bold min-w-4 text-center",
                      sheetSubTab === "cbl"
                        ? "bg-pup-maroon/10 text-pup-maroon dark:bg-red-950/40 dark:text-red-300"
                        : "bg-black/5 dark:bg-zinc-700 text-gray-700 dark:text-zinc-300",
                      BADGE_BASE
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
                  className="h-8 px-3 text-xs font-semibold rounded-lg border-border dark:border-border text-pup-maroon dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 cursor-pointer active:scale-95 transition-all"
                >
                  Archive Charter
                </Button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {sheetSubTab === "info" ? (
                /* Organization Info Form */
                <form id="org-info-form" onSubmit={handleSaveOrg} className="space-y-5">
                  <div className="space-y-4 pb-2">
                    <div className="flex items-center justify-between border-b border-border/80 dark:border-border pb-3">
                      <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-zinc-300">
                          Organization Profile
                        </h4>
                        <p className="text-[11px] text-gray-400 dark:text-zinc-500 mt-0.5">
                          Update accreditation details, faculty adviser, and organization scope.
                        </p>
                      </div>
                      <span
                        className={cn("inline-flex items-center px-2.5 py-0.5 text-[11px] font-semibold rounded-full border", getOrgStatusBadgeClass(orgForm.status), BADGE_BASE)}
                      >
                        {orgForm.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-semibold text-gray-700 dark:text-zinc-300 mb-1">
                          Organization Name
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
                          Acronym <span className="text-gray-400 dark:text-zinc-500 font-normal">(optional)</span>
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
                          Category
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
                          Faculty Adviser Name <span className="text-gray-400 dark:text-zinc-500 font-normal">(optional)</span>
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
                          Adviser Email <span className="text-gray-400 dark:text-zinc-500 font-normal">(optional)</span>
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
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-xs font-semibold text-gray-700 dark:text-zinc-300">
                          Banner Gradient Theme
                        </label>
                        <span className="text-[11px] font-medium text-gray-500 dark:text-zinc-400">
                          {BANNER_GRADIENT_PRESETS.find((p) => p.id === (orgForm.bannerGradient || "maroon"))?.label}
                        </span>
                      </div>
                      <div className="p-3 rounded-2xl border border-border dark:border-border bg-gray-50/50 dark:bg-zinc-950/40">
                        <div className="grid grid-cols-4 sm:grid-cols-8 gap-2 place-items-center">
                          {BANNER_GRADIENT_PRESETS.map((preset) => {
                            const isSelected = (orgForm.bannerGradient || "maroon") === preset.id;
                            return (
                              <div key={preset.id} className="flex items-center justify-center size-8 shrink-0 aspect-square">
                                <button
                                  type="button"
                                  onClick={() => setOrgForm({ ...orgForm, bannerGradient: preset.id })}
                                  style={{ background: preset.previewGradient }}
                                  className="relative size-6 sm:size-6.5 rounded-full aspect-square shrink-0 cursor-pointer shadow-2xs border border-white/20 transition-transform duration-150 hover:scale-110 active:scale-90 flex items-center justify-center"
                                  title={`${preset.label} • ${preset.description}`}
                                  aria-label={preset.label}
                                >
                                  {isSelected && (
                                    <span className="absolute -inset-1 rounded-full ring-2 ring-gray-950 dark:ring-white pointer-events-none" />
                                  )}
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    <div>
                      <label htmlFor="org-sheet-description" className="block text-xs font-semibold text-gray-700 dark:text-zinc-300 mb-1">
                        Description & Mission
                      </label>
                      <Textarea
                        id="org-sheet-description"
                        rows={3}
                        placeholder="Brief description of the organization's goals, objectives, and scope..."
                        value={orgForm.description}
                        onChange={(e) => setOrgForm({ ...orgForm, description: e.target.value })}
                        className="w-full resize-none"
                      />
                    </div>
                  </div>
                </form>
              ) : sheetSubTab === "officers" ? (
                <>
                  {/* Authorize Student Officer Section */}
                  <div className="space-y-3 pb-5 border-b border-border/80 dark:border-border">
                    <div className="flex items-center gap-2">
                      <UserAdd01Icon size="1em" className="text-pup-maroon dark:text-red-400 text-sm" />
                      <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-zinc-300">
                        Authorize Student Officer
                      </h4>
                    </div>
                    <form onSubmit={handleAddOfficer} className="space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-semibold text-gray-700 dark:text-zinc-300 mb-1">
                            Student Account Email
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
                            Officer Position
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
                            Student Full Name <span className="text-gray-400 dark:text-zinc-500 font-normal">(optional)</span>
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
                            Student Number <span className="text-gray-400 dark:text-zinc-500 font-normal">(optional)</span>
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
                          size="sm"
                          disabled={addingOfficer}
                          className="h-9 px-4 cursor-pointer disabled:opacity-50"
                        >
                          {addingOfficer ? "Authorizing Officer…" : "Authorize Officer"}
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
                      <EmptyState
                        variant="compact"
                        icon={UserGroupIcon}
                        title="No Authorized Officers"
                        description="No student officers are authorized for this organization yet. Add an officer's account email above."
                      />
                    ) : (
                      <div className="rounded-2xl border border-border/80 dark:border-border overflow-hidden divide-y divide-border dark:divide-border bg-white dark:bg-zinc-900 shadow-2xs">
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
                                      className={cn("text-[10px] font-semibold px-2.5 py-0.5 rounded-full border", roleStyle.badge, BADGE_BASE)}
                                    >
                                      {officer.position}
                                    </Badge>
                                  </div>
                                  <div className="mt-0.5 flex items-center gap-2 text-[11px] text-gray-400 dark:text-zinc-500 font-sans tabular-nums truncate">
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
                                className="h-8 px-2.5 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/30 border border-border dark:border-border rounded-lg cursor-pointer active:scale-95 transition-all shrink-0"
                              >
                                Revoke Access
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
                      <p className="text-[11px] text-gray-900 dark:text-zinc-300 mt-0.5">
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
                    <EmptyState
                      variant="compact"
                      icon={BookOpen01Icon}
                      title="No CBL Records on File"
                      description="Use the Archive button above to upload the first official charter, or officers may submit an amendment."
                    />
                  ) : (
                    <div className="space-y-3">
                      {bylawsHistory.map((ver) => (
                        <div
                          key={ver.id}
                          className="rounded-2xl border border-border/80 dark:border-border bg-white dark:bg-zinc-900 p-4 space-y-3 shadow-xs hover:border-border dark:hover:border-zinc-700 transition-all"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="px-2 py-0.5 text-xs font-bold rounded-lg bg-red-50 text-pup-maroon dark:bg-red-950/40 dark:text-red-400 border border-red-100 dark:border-red-900/30">
                                  {ver.version_tag || (ver.version_number ? `v${ver.version_number}` : "CBL")}
                                </span>
                                <span
                                  className={cn("inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border", getBylawsStatusBadgeClass(ver.status), BADGE_BASE)}
                                >
                                  {ver.status}
                                </span>
                                {ver.effective_date && (
                                  <span className="text-[11px] text-gray-900 dark:text-zinc-300">
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
                                  title: `${selectedOrgForOfficers?.name}: ${ver.version_tag || `CBL v${ver.version_number || "1.0"}`}`,
                                  filename: ver.original_filename || "Constitution-and-By-Laws.pdf",
                                })
                              }
                              className="h-8 px-3 text-xs font-semibold text-pup-maroon dark:text-red-400 hover:bg-gray-50 dark:hover:bg-zinc-800 rounded-lg shrink-0 cursor-pointer active:scale-95 transition-all"
                            >
                              Preview Charter
                            </Button>
                          </div>

                          <div className="pt-2 border-t border-border dark:border-border flex items-center justify-between text-[11px] text-gray-400 dark:text-zinc-500">
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
                            <div className={cn(
                              "text-[11px] p-2.5 rounded-xl border",
                              ver.status === "Needs Revision"
                                ? "bg-amber-50/70 dark:bg-amber-950/30 border-amber-200/60 dark:border-amber-900/30 text-amber-900 dark:text-amber-200"
                                : ver.status === "Declined"
                                ? "bg-rose-50/70 dark:bg-rose-950/30 border-rose-200/60 dark:border-rose-900/30 text-rose-900 dark:text-rose-200"
                                : "bg-gray-50 dark:bg-zinc-800/50 border-border dark:border-border text-gray-600 dark:text-zinc-300"
                            )}>
                              <strong className="font-semibold">
                                {ver.status === "Needs Revision"
                                  ? "Revision Instructions:"
                                  : ver.status === "Declined"
                                  ? "Decline Reason:"
                                  : "OSAS Review Note:"}
                              </strong>{" "}
                              {ver.review_notes}
                            </div>
                          )}

                          {ver.status === "Pending" && (
                            <div className="pt-2 border-t border-border dark:border-border flex items-center justify-end gap-2 flex-wrap">
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => openCblReviewDialog(ver, "Declined")}
                                className="h-8 px-3 text-xs font-semibold rounded-lg text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 border border-rose-200 dark:border-rose-900/30 cursor-pointer active:scale-95 transition-all"
                              >
                                Decline Charter
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => openCblReviewDialog(ver, "Needs Revision")}
                                title="Request Revision"
                                className="h-8 px-3 text-xs font-semibold rounded-lg text-amber-700 hover:text-amber-800 hover:bg-amber-50 dark:hover:bg-amber-950/30 border border-amber-200 dark:border-amber-900/30 cursor-pointer active:scale-95 transition-all"
                              >
                                Request Revision
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                onClick={() => openCblReviewDialog(ver, "Approved")}
                                title="Approve & Ratify Charter"
                                className="h-8 px-3.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs cursor-pointer active:scale-95 transition-all"
                              >
                                Approve Charter
                              </Button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <SheetFooter className="shrink-0 p-4 px-6 flex flex-row items-center justify-between">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedOrgForOfficers(null);
                  setEditingOrg(null);
                }}
                className="h-9 px-4 text-xs font-semibold rounded-xl border border-border dark:border-border bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-xs cursor-pointer active:scale-95 transition-all"
              >
                Close
              </Button>
              {sheetSubTab === "info" && (
                <Button
                  type="submit"
                  form="org-info-form"
                  size="sm"
                  onClick={handleSaveOrg}
                  disabled={savingOrg}
                  className="h-9 px-4 cursor-pointer disabled:opacity-50"
                >
                  {savingOrg ? "Saving Organization Details…" : "Save Organization Details"}
                </Button>
              )}
            </SheetFooter>
          </SheetContent>
        </Sheet>

        {/* Register / Edit Organization Dialog (Section 9.3 Layout) */}
        <Dialog open={orgModalOpen} onOpenChange={(open) => { if (!savingOrg) setOrgModalOpen(open); }}>
          <DialogContent className="sm:max-w-xl w-full max-h-[92dvh] rounded-2xl bg-white border border-border dark:bg-zinc-900 dark:border-border p-0 shadow-2xl overflow-hidden flex flex-col gap-0">
            <DialogHeader className="p-6 pb-0 text-left">
              <DialogTitle>
                {editingOrg ? "Edit Organization" : "Register Student Organization"}
              </DialogTitle>
              <DialogDescription className="mt-1">
                {editingOrg
                  ? "Update official student organization accreditation information."
                  : "Register a recognized campus organization in the OSAS records directory."}
              </DialogDescription>
            </DialogHeader>

            <form ref={attachForm} onSubmit={handleSaveOrg} className="flex flex-col flex-1 min-h-0">
              <div className="p-6 space-y-4 max-h-[65vh] overflow-y-auto">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-gray-700 dark:text-zinc-300 mb-1">
                      Organization Name
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
                      Acronym <span className="text-gray-400 dark:text-zinc-500 font-normal">(optional)</span>
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
                      Category
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

                <div>
                  <label htmlFor="org-modal-description" className="block text-xs font-semibold text-gray-700 dark:text-zinc-300 mb-1">
                    Description & Mission <span className="text-gray-400 dark:text-zinc-500 font-normal">(optional)</span>
                  </label>
                  <Textarea
                    id="org-modal-description"
                    rows={3}
                    placeholder="Brief description of the organization's goals and scope..."
                    value={orgForm.description}
                    onChange={(e) => setOrgForm({ ...orgForm, description: e.target.value })}
                    className="w-full resize-none"
                  />
                </div>


                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-zinc-300 mb-1">
                      Faculty Adviser Name <span className="text-gray-400 dark:text-zinc-500 font-normal">(optional)</span>
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
                      Adviser Email <span className="text-gray-400 dark:text-zinc-500 font-normal">(optional)</span>
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
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-gray-700 dark:text-zinc-300">
                      Banner Gradient Theme
                    </label>
                    <span className="text-[11px] font-medium text-gray-500 dark:text-zinc-400">
                      {BANNER_GRADIENT_PRESETS.find((p) => p.id === (orgForm.bannerGradient || "maroon"))?.label}
                    </span>
                  </div>
                  <div className="p-3 rounded-2xl border border-border dark:border-border bg-gray-50/50 dark:bg-zinc-950/40">
                    <div className="grid grid-cols-4 sm:grid-cols-8 gap-2 place-items-center">
                      {BANNER_GRADIENT_PRESETS.map((preset) => {
                        const isSelected = (orgForm.bannerGradient || "maroon") === preset.id;
                        return (
                          <div key={preset.id} className="flex items-center justify-center size-8 shrink-0 aspect-square">
                            <button
                              type="button"
                              onClick={() => setOrgForm({ ...orgForm, bannerGradient: preset.id })}
                              style={{ background: preset.previewGradient }}
                              className="relative size-6 sm:size-6.5 rounded-full aspect-square shrink-0 cursor-pointer shadow-2xs border border-white/20 transition-transform duration-150 hover:scale-110 active:scale-90 flex items-center justify-center"
                              title={`${preset.label} • ${preset.description}`}
                              aria-label={preset.label}
                            >
                              {isSelected && (
                                <span className="absolute -inset-1 rounded-full ring-2 ring-gray-950 dark:ring-white pointer-events-none" />
                              )}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

              </div>

              <DialogFooter className="mx-0 mb-0 p-6 pt-0 flex flex-wrap flex-row items-center justify-end gap-2.5 shrink-0">
                {!editingOrg && <CreateAnotherToggle checked={repeat.createAnother} onCheckedChange={repeat.setCreateAnother} disabled={savingOrg} savedCount={repeat.savedCount} />}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setOrgModalOpen(false)}
                  disabled={savingOrg}
                  className="h-9 px-4 text-xs font-semibold rounded-xl border border-border dark:border-border bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-xs cursor-pointer active:scale-95 transition-all"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={savingOrg}
                  title={editingOrg ? "Update Organization" : "Register Organization"}
                  className="h-9 px-4 cursor-pointer disabled:opacity-50"
                >
                  {savingOrg
                    ? "Saving Organization…"
                    : editingOrg
                    ? "Update Organization"
                    : "Register Organization"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Upload CBL Modal (Section 9.3 Layout) */}
        <Dialog
          open={Boolean(cblUploadOrg)}
          onOpenChange={(open) => !open && setCblUploadOrg(null)}
        >
          <DialogContent className="sm:max-w-md w-full rounded-2xl bg-white border border-border dark:bg-zinc-900 dark:border-border p-0 shadow-2xl overflow-hidden flex flex-col gap-0">
            <DialogHeader className="p-6 pb-0 text-left">
              <DialogTitle>
                Upload Constitution & By-Laws (CBL)
              </DialogTitle>
              <DialogDescription className="mt-1">
                Archive the official approved Constitution and By-Laws document for{" "}
                <strong className="text-gray-900 dark:text-zinc-200">{cblUploadOrg?.name}</strong>.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleUploadCbl} className="flex flex-col flex-1 min-h-0">
              <div className="p-6 space-y-4 max-h-[65vh] overflow-y-auto">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-zinc-300 mb-1.5">
                    CBL Document (PDF)
                  </label>
                  <FileAttachmentDropzone
                    value={cblFile ? { file: cblFile, original_filename: cblFile.name, size_bytes: cblFile.size } : null}
                    onChange={(item) => setCblFile(item?.file || null)}
                    mode="single"
                    accept="application/pdf"
                    title="Drop constitution & by-laws PDF here, or browse"
                    subtitle="Official PDF document (up to 25 MB)"
                    maxSizeBytes={25 * 1024 * 1024}
                  />
                </div>
              </div>

              <DialogFooter className="p-6 pt-0 flex items-center justify-end gap-2.5 shrink-0">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setCblUploadOrg(null)}
                  className="h-9 px-4 text-xs font-semibold rounded-xl border border-border dark:border-border bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-xs cursor-pointer active:scale-95 transition-all"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={uploadingCbl || !cblFile}
                  title="Archive Constitution & By-Laws"
                  className="h-9 px-4 cursor-pointer disabled:opacity-50"
                >
                  {uploadingCbl ? "Uploading Charter…" : "Upload Charter"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* CBL Review Dialog */}
        <Dialog open={cblReviewModalOpen} onOpenChange={setCblReviewModalOpen}>
          <DialogContent className="sm:max-w-md w-full rounded-2xl bg-white border border-border dark:bg-zinc-900 dark:border-border p-0 shadow-2xl overflow-hidden flex flex-col gap-0">
            <DialogHeader className="p-6 pb-0 text-left">
              <DialogTitle>
                {cblReviewAction === "Approved"
                  ? "Approve Constitution & By-Laws"
                  : cblReviewAction === "Needs Revision"
                  ? "Request Revision on CBL"
                  : "Decline CBL Submission"}
              </DialogTitle>
              <DialogDescription className="mt-1">
                {cblReviewAction === "Approved"
                  ? `Ratify ${cblReviewVersion?.version_tag || "this CBL submission"} as the active Constitution & By-Laws for ${selectedOrgForOfficers?.name}. Older versions will be marked as Superseded.`
                  : cblReviewAction === "Needs Revision"
                  ? "Specify the changes, missing articles, or adjustments required before this charter can be ratified."
                  : "State the reason for declining this Constitution & By-Laws submission."}
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleReviewCblSubmit} className="flex flex-col">
              <div className="p-6 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-700 dark:text-zinc-200">
                    {cblReviewAction === "Approved" ? (
                      <>Approval Remarks / Notes <span className="text-gray-400 dark:text-zinc-500 font-normal">(optional)</span></>
                    ) : (
                      "Review Feedback & Instructions"
                    )}
                  </label>
                  <Textarea
                    rows={4}
                    required={cblReviewAction !== "Approved"}
                    placeholder={
                      cblReviewAction === "Approved"
                        ? "Optional remarks for organizational record..."
                        : "Provide detailed instructions for the student officers (minimum 5 characters)..."
                    }
                    value={cblReviewNote}
                    onChange={(e) => setCblReviewNote(e.target.value)}
                    className="w-full"
                  />
                </div>
              </div>

              <DialogFooter className="p-6 pt-0 flex items-center justify-end gap-2.5">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setCblReviewModalOpen(false)}
                  className="h-9 px-4 text-xs font-semibold rounded-xl border border-border dark:border-border bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-xs cursor-pointer active:scale-95 transition-all"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={cblReviewSubmitting}
                  title={
                    cblReviewAction === "Approved"
                      ? "Confirm & Ratify Charter"
                      : cblReviewAction === "Needs Revision"
                      ? "Send Revision Request"
                      : "Confirm Decline"
                  }
                  className={cn(
                    "h-9 px-4 text-xs font-semibold rounded-xl text-white shadow-xs cursor-pointer active:scale-95 transition-all inline-flex items-center gap-2",
                    cblReviewAction === "Approved"
                      ? "bg-emerald-600 hover:bg-emerald-700"
                      : cblReviewAction === "Needs Revision"
                      ? "bg-amber-600 hover:bg-amber-700"
                      : "bg-rose-600 hover:bg-rose-700"
                  )}
                >
                  {cblReviewSubmitting ? (
                    <>
                      <Loading01Icon size="1em" className="ph animate-spin text-sm" />
                      <span>Submitting Review…</span>
                    </>
                  ) : (
                    <span>
                      {cblReviewAction === "Approved"
                        ? "Approve Charter"
                        : cblReviewAction === "Needs Revision"
                        ? "Request Revision"
                        : "Decline Charter"}
                    </span>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Revoke Officer Confirmation Modal */}
        <ConfirmModal
          open={Boolean(officerToRemove)}
          title="Revoke Officer Authorization?"
          description={`Are you sure you want to remove ${
            officerToRemove?.student_name || officerToRemove?.email
          } (${officerToRemove?.position}) from the list of authorized officers? They will no longer be able to submit event proposals on behalf of this organization.`}
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

        {/* Bulk Import Organizations Modal */}
        <BulkImportOrganizationsModal
          open={bulkImportOpen}
          onOpenChange={setBulkImportOpen}
          onSuccess={() => fetchOrganizations(true)}
          showToast={showToast}
        />
      </div>
    </TooltipProvider>
  );
}
