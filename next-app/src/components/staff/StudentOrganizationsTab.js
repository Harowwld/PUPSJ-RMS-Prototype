"use client";
import DataGroupHeader from "@/components/shared/DataGroupHeader";
import { isInManilaDateRange } from "@/lib/timeFormat";
import { COMPACT_BADGE_BASE, BADGE_BASE, BADGE_PALETTES } from "@/lib/badgeStyles";

import { Table } from "@/components/ui/table";
import TablePagination from "@/components/shared/TablePagination";
import SheetPagination from "@/components/shared/SheetPagination";
import { PDF_ACTION_LABELS } from "@/lib/pdfPreview";
import { Textarea } from "@/components/ui/textarea";
import NoticeBanner from "@/components/shared/NoticeBanner";
import CreateAnotherToggle from "@/components/shared/CreateAnotherToggle";
import useCreateAnother from "@/hooks/useCreateAnother";

import { useSearchParams } from "next/navigation";
import { Fragment, useState, useEffect, useCallback, useMemo, useRef } from "react";
import useOsasViewPreference from "@/hooks/useOsasViewPreference";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { formatErrorMessage } from "@/lib/errorUtils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import DataContentSkeleton from "@/components/shared/DataContentSkeleton";
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
import { TableActions } from "@/components/shared/TableActions";
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
import {
  FilterPopover,
  SortPopover,
  GroupPopover,
  ColumnsPopover,
} from "@/components/systemadmin/OfficeTableControls";
import DashboardSearch from "@/components/systemadmin/DashboardSearch";
import { DateRangeFilterButton } from "@/components/shared/DateRangePickerModal";
import { Archive02Icon, Building01Icon, CheckmarkCircle01Icon } from "hugeicons-react";

const ORG_SORT_OPTIONS = [
  { key: "name", label: "Organization Name" },
  { key: "acronym", label: "Acronym" },
  { key: "category", label: "Category" },
  { key: "status", label: "Status" },
  { key: "proposal_count", label: "Activity Submissions" },
  { key: "created_at", label: "Date Added" },
];

const ORG_GROUP_OPTIONS = [
  { key: "category", label: "Category", icon: Building01Icon },
  { key: "status", label: "Status", icon: CheckmarkCircle01Icon },
  { key: "none", label: "No grouping" },
];

const organizationCountFormat = new Intl.NumberFormat("en-PH");

const ORG_TABLE_COLUMNS = [
  { key: "name", label: "Organization", size: { kind: "text", minWidth: 360, maxWidth: 540, growthWeight: 3 } },
  { key: "category", label: "Category", size: { kind: "category", minWidth: 150, maxWidth: 180, growthWeight: 1 } },
  { key: "adviser", label: "Adviser", size: { kind: "text", minWidth: 150, maxWidth: 230 } },
  { key: "status", label: "Status", size: { kind: "status", minWidth: 100, maxWidth: 120 } },
  { key: "proposal_count", label: "Submissions", size: { kind: "number", width: 92, paddingX: 8 }, defaultHidden: true },
  { key: "created_at", label: "Date Added", size: { kind: "date" }, defaultHidden: true },
];

const ORG_FILTER_FIELDS = [
  {
    key: "category",
    label: "Category",
    icon: Building01Icon,
    options: [
      { value: "Academic", label: "Academic" },
      { value: "Non-Academic", label: "Non-Academic" },
    ],
  },
  {
    key: "status",
    label: "Status",
    icon: CheckmarkCircle01Icon,
    options: [
      { value: "Active", label: "Active" },
      { value: "Inactive", label: "Inactive" },
    ],
  },
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
import { Building03Icon as EmptyBuilding03Icon, UserGroupIcon, BookOpen01Icon , ArrowLeft01Icon, ArrowRight01Icon, ArrowUpRight01Icon, BookBookmark01Icon, CalendarCheckIn01Icon, Cancel01Icon, Contact01Icon, File02Icon, Loading01Icon, PencilEdit01Icon, Search01Icon, Shield01Icon, Tick01Icon, Upload01Icon, UserAdd01Icon, UserSearch01Icon, ViewIcon} from "hugeicons-react";
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
      icon: " CrownIcon",
    };
  }
  if (pos.includes("vice")) {
    return {
      gradient: "from-indigo-800 via-indigo-600 to-blue-600 text-white",
      ring: "ring-indigo-500/30 dark:ring-indigo-400/30",
      icon: " Shield01Icon",
    };
  }
  if (pos.includes("secretary")) {
    return {
      gradient: "from-emerald-800 via-emerald-600 to-teal-600 text-white",
      ring: "ring-emerald-500/30 dark:ring-emerald-400/30",
      icon: " Notebook01Icon",
    };
  }
  if (pos.includes("treasurer") || pos.includes("finance")) {
    return {
      gradient: "from-amber-700 via-amber-600 to-yellow-600 text-white",
      ring: "ring-amber-500/30 dark:ring-amber-400/30",
      icon: " Coins01Icon",
    };
  }
  if (pos.includes("auditor")) {
    return {
      gradient: "from-purple-800 via-purple-600 to-violet-600 text-white",
      ring: "ring-purple-500/30 dark:ring-purple-400/30",
      icon: " JusticeScale01Icon",
    };
  }
  return {
    gradient: "from-slate-700 via-slate-600 to-zinc-700 text-white",
    ring: "ring-gray-300/30 dark:ring-white/10",
    icon: " UserCheck01Icon",
  };
}

function getInitials(name = "") {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "SO";
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function StudentOrganizationsTab({ showToast = () => {} }) {
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [organizationsLoadFailed, setOrganizationsLoadFailed] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const fetchRequestRef = useRef(0);
  const [search, setSearchState] = useOsasViewPreference("student_organizations", "search", "");
  const [organizationScope, setOrganizationScope] = useOsasViewPreference("student_organizations", "organizationScope", "active");
  const showArchived = organizationScope === "archive";
  const [filterRules, setFilterRules] = useOsasViewPreference("student_organizations", "filterRules", []);
  const [groupBy, setGroupBy] = useOsasViewPreference("student_organizations", "groupBy", "none");
  const [visibleColumns, setVisibleColumns] = useOsasViewPreference(
    "student_organizations",
    "visibleColumns",
    ORG_TABLE_COLUMNS.filter(({ defaultHidden }) => !defaultHidden).map(({ key }) => key)
  );
  const visibleOrgSizes = ORG_TABLE_COLUMNS.filter(({ key }) => visibleColumns.includes(key));
  const organizationTableColumns = [
    ...visibleOrgSizes.filter(({ key }) => ["name", "category", "adviser"].includes(key)).map(({ size }) => size),
    { kind: "number", minWidth: 150, maxWidth: 170 },
    { kind: "status", minWidth: 200, maxWidth: 220 },
    ...visibleOrgSizes.filter(({ key }) => ["status", "proposal_count", "created_at"].includes(key)).map(({ size }) => size),
    "actions",
  ];
  const [startDate, setStartDate] = useOsasViewPreference("student_organizations", "startDate", "");
  const [endDate, setEndDate] = useOsasViewPreference("student_organizations", "endDate", "");
  const [sortBy, setSortBy] = useOsasViewPreference("student_organizations", "sortBy", "name");
  const [sortOrder, setSortOrder] = useOsasViewPreference("student_organizations", "sortOrder", "ASC");
  const [viewMode, setViewMode] = useOsasViewPreference("student_organizations", "viewMode", "grid");
  const [orgPage, setOrgPage] = useState(1);
  const [orgPageSize, setOrgPageSize] = useOsasViewPreference("student_organizations", "pageSize", 10);
  const setSearch = useCallback((value) => { setSearchState(value); setOrgPage(1); }, [setSearchState]);
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
  const [organizationToArchive, setOrganizationToArchive] = useState(null);
  const [archivingOrganization, setArchivingOrganization] = useState(false);

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
      const request = ++fetchRequestRef.current;
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
        if (!res.ok || !json?.ok || !Array.isArray(json.data)) {
          throw new Error(json?.error || "Failed to load student organizations.");
        }
        if (request !== fetchRequestRef.current) return;
        setOrganizations(json.data);
        setHasLoaded(true);
        setOrganizationsLoadFailed(false);
        if (showFeedback) {
          showToast({
            title: "Organizations Refreshed",
            description: "Directory records up to date.",
          });
        }
      } catch (err) {
        if (request !== fetchRequestRef.current) return;
        setOrganizationsLoadFailed(true);
        showToast(
          formatErrorMessage(err, {
            title: "Organizations Load Failed",
            actionContext: "Fetching student organizations",
          }),
          true
        );
      } finally {
        if (request === fetchRequestRef.current) {
          setLoading(false);
          setRefreshing(false);
        }
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

  const openManageOrgSheet = useCallback((org, defaultTab = "info") => {
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
  }, [loadOfficers, loadBylawsHistory]);

  const requestedOrganization = useSearchParams()?.get("organization");
  useEffect(() => {
    if (!requestedOrganization) return;

    const controller = new AbortController();
    fetch(`/api/osas/organizations/${encodeURIComponent(requestedOrganization)}`, {
      signal: controller.signal,
      cache: "no-store",
    })
      .then((response) => response.json())
      .then((result) => {
        if (!result.ok || !result.data) throw new Error(result.error);
        if (!controller.signal.aborted) openManageOrgSheet(result.data);
      })
      .catch(() => {
        if (!controller.signal.aborted) toast.error("Could not open the organization.");
      })
      .finally(() => {
        if (controller.signal.aborted) return;
        const url = new URL(window.location.href);
        if (url.searchParams.get("organization") !== requestedOrganization) return;
        url.searchParams.delete("organization");
        window.history.replaceState(null, "", url);
      });

    return () => controller.abort();
  }, [requestedOrganization, openManageOrgSheet]);

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

  const handleArchiveOrganization = async () => {
    if (!organizationToArchive || archivingOrganization) return;

    setArchivingOrganization(true);
    try {
      const response = await fetch(
        `/api/osas/organizations/${encodeURIComponent(organizationToArchive.id)}`,
        { method: "DELETE" }
      );
      const result = await response.json().catch(() => null);
      if (!response.ok || !result?.ok) {
        throw new Error(result?.error || "Could not archive the organization.");
      }

      setOrganizations((current) => current.map((org) =>
        org.id === organizationToArchive.id ? { ...org, status: "Archived" } : org
      ));
      setOrganizationToArchive(null);
      showToast({
        title: "Organization Archived",
        description: `${organizationToArchive.name} moved to the Archive tab.`,
      });
      await fetchOrganizations();
    } catch (error) {
      showToast(formatErrorMessage(error, {
        title: "Organization Archive Failed",
        actionContext: "Archiving a student organization",
      }), true);
    } finally {
      setArchivingOrganization(false);
    }
  };

  const archivedCount = organizations.filter((org) => org.status === "Archived").length;
  const filterFields = useMemo(() => {
    const [categoryField, statusField] = ORG_FILTER_FIELDS;
    const categories = new Set(categoryField.options.map(({ value }) => value));
    organizations.forEach(({ category }) => { if (category) categories.add(category); });
    const fields = [{ ...categoryField, options: [...categories].map((value) => ({ value, label: value })) }];
    if (!showArchived) fields.push(statusField);
    return fields;
  }, [organizations, showArchived]);
  const activeFilterRules = useMemo(() => filterRules.filter((rule) =>
    rule.fieldKey !== "status" || (!showArchived && rule.value !== "Archived")
  ), [filterRules, showArchived]);

  const handleResetFilters = () => {
    setSearch("");
    setFilterRules([]);
    setStartDate("");
    setEndDate("");
  };

  const filteredOrganizations = useMemo(() => {
    const list = organizations.filter((org) => {
      if ((org.status === "Archived") !== showArchived) return false;

      if (!isInManilaDateRange(org.created_at, startDate, endDate)) return false;

      if (activeFilterRules.length > 0) {
        const matchesRules = activeFilterRules.every((rule) => {
          let actual = org[rule.fieldKey] || "";
          const ruleVal = String(rule.value || "").toLowerCase();
          const actVal = String(actual || "").toLowerCase();
          return rule.operator === "is_not" ? actVal !== ruleVal : actVal === ruleVal;
        });
        if (!matchesRules) return false;
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

    return list.sort((a, b) => {
      let valA = a[sortBy] || "";
      let valB = b[sortBy] || "";
      if (sortBy === "proposal_count") {
        valA = a.proposal_count || 0;
        valB = b.proposal_count || 0;
      } else if (typeof valA === "string") {
        valA = valA.toLowerCase();
        valB = String(valB).toLowerCase();
      }
      if (valA < valB) return sortOrder === "ASC" ? -1 : 1;
      if (valA > valB) return sortOrder === "ASC" ? 1 : -1;
      return 0;
    });
  }, [organizations, showArchived, activeFilterRules, startDate, endDate, search, sortBy, sortOrder]);

  const maxSubmissionCount = filteredOrganizations.reduce(
    (max, org) => Math.max(max, Number(org.proposal_count) || 0),
    0
  );
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
  }, [viewMode, search, organizationScope, activeFilterRules, resetScroll]);

  const groupedOrganizations = useMemo(() => {
    if (groupBy === "none") {
      return [{ key: "all", label: "", orgs: paginatedOrganizations }];
    }
    const map = new Map();
    for (const org of paginatedOrganizations) {
      let label = "";
      if (groupBy === "category") {
        label = org.category || "Unassigned Category";
      } else if (groupBy === "status") {
        label = org.status || "Unknown Status";
      }
      if (!map.has(label)) map.set(label, []);
      map.get(label).push(org);
    }
    return [...map.entries()].map(([label, orgs]) => ({ key: label, label, orgs }));
  }, [groupBy, paginatedOrganizations]);

  const activeChips = useMemo(() => {
    const chips = [];
    if (search.trim()) {
      chips.push({
        id: "search",
        label: `Search: ${search.trim()}`,
        onRemove: () => setSearch(""),
      });
    }
    activeFilterRules.forEach((rule) => {
      const field = ORG_FILTER_FIELDS.find((f) => f.key === rule.fieldKey);
      const fieldLabel = field?.label || rule.fieldKey;
      const opt = field?.options?.find((o) => String(o.value) === String(rule.value));
      const valLabel = opt?.label || String(rule.value);
      chips.push({
        id: rule.id,
        label: `${fieldLabel} ${rule.operator === "is_not" ? "is not" : "is"} ${valLabel}`,
        onRemove: () => setFilterRules((prev) => prev.filter((r) => r.id !== rule.id)),
      });
    });
    if (startDate || endDate) {
      chips.push({
        id: "dateRange",
        label: `Range: ${startDate || "..."} to ${endDate || "..."}`,
        onRemove: () => { setStartDate(""); setEndDate(""); },
      });
    }
    return chips;
  }, [search, activeFilterRules, startDate, endDate, setSearch, setFilterRules, setStartDate, setEndDate]);

  const hasActiveFilters = activeChips.length > 0;

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
            title={
              <span className="flex items-center gap-2">
                <span>Student Organizations</span>
                <span className="text-[11px] font-normal tracking-normal text-gray-500 dark:text-zinc-400 tabular-nums">
                  {organizations.length > 0 ? `${organizations.length.toLocaleString()} organizations` : "No organizations"}
                </span>
              </span>
            }
            description="Manage recognized campus student organizations, their Constitution and By-Laws, and authorized officers."
            showBorder={false}
            className="p-6"
            titleClassName="text-[18px] font-semibold tracking-[-0.01em] text-gray-900 dark:text-zinc-50"
            descriptionClassName="text-[13px] font-normal text-gray-500 dark:text-zinc-400 mt-[4px]"
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

          {/* 2. Top Summary Metrics Banner */}
          <div className="px-6 pb-6">
            <div className="p-3 sm:p-3.5 rounded-[22px] bg-[#f4f5f7] dark:bg-zinc-900/60 border border-black/[0.05] dark:border-white/[0.08]">
              {loading && !hasLoaded ? (
                <KpiStatCardsSkeleton count={3} />
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
                  {/* Card 1: Recognized Orgs */}
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
                        <span className="font-semibold text-gray-900 dark:text-zinc-100">Campus Active</span>
                      </span>
                    </div>
                    <div className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900 dark:text-zinc-50 font-jakarta mt-2 tabular-nums">
                      {kpiStats.total.toLocaleString()}
                    </div>
                    <div className="text-[11.5px] text-gray-400 dark:text-zinc-500 mt-2 font-medium truncate tabular-nums">
                      {kpiStats.academicCount} Academic · {kpiStats.nonAcademicCount} Non-Academic
                    </div>
                  </div>

                  {/* Card 2: Authorized Officers */}
                  <div className="rounded-[18px] p-4 sm:p-4.5 bg-white dark:bg-zinc-800 border border-black/[0.06] dark:border-white/[0.08] shadow-[0_2px_8px_rgba(0,0,0,0.03),0_1px_2px_rgba(0,0,0,0.02)] flex flex-col justify-between select-none">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="size-5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                          <Shield01Icon size="0.75em" />
                        </div>
                        <span className="text-xs font-semibold text-gray-500 dark:text-zinc-400 tracking-tight">
                          Authorized Officers
                        </span>
                      </div>
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-black/[0.04] dark:bg-white/[0.06] text-xs font-jakarta select-none">
                        <Tick01Icon size={12} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <span className="font-semibold text-gray-900 dark:text-zinc-100">Authorized Submitters</span>
                      </span>
                    </div>
                    <div className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900 dark:text-zinc-50 font-jakarta mt-2 tabular-nums">
                      {kpiStats.totalOfficers.toLocaleString()}
                    </div>
                    <div className="text-[11.5px] text-gray-400 dark:text-zinc-500 mt-2 font-medium truncate tabular-nums">
                      {kpiStats.orgsWithOfficersCount} orgs configured · {kpiStats.orgsWithoutOfficersCount} pending roster
                    </div>
                  </div>

                  {/* Card 3: Event Proposals */}
                  <div className="rounded-[18px] p-4 sm:p-4.5 bg-white dark:bg-zinc-800 border border-black/[0.06] dark:border-white/[0.08] shadow-[0_2px_8px_rgba(0,0,0,0.03),0_1px_2px_rgba(0,0,0,0.02)] flex flex-col justify-between select-none">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="size-5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                          <CalendarCheckIn01Icon size="0.75em" />
                        </div>
                        <span className="text-xs font-semibold text-gray-500 dark:text-zinc-400 tracking-tight">
                          Event Proposals
                        </span>
                      </div>
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-black/[0.04] dark:bg-white/[0.06] text-xs font-jakarta select-none">
                        <CalendarCheckIn01Icon size={12} className="text-amber-600 dark:text-amber-400 shrink-0" />
                        <span className="font-semibold text-gray-900 dark:text-zinc-100">Activity Proposals</span>
                      </span>
                    </div>
                    <div className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900 dark:text-zinc-50 font-jakarta mt-2 tabular-nums">
                      {kpiStats.totalProposals.toLocaleString()}
                    </div>
                    <div className="text-[11.5px] text-gray-400 dark:text-zinc-500 mt-2 font-medium truncate tabular-nums">
                      {kpiStats.orgsWithProposalsCount} active proponents · {kpiStats.totalProposals} submissions
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Connected Row: Organization Scope & View Switcher */}
          <div
            role="group"
            aria-label="Organization status tabs and view switcher"
            className="flex items-center justify-between border-t border-border bg-white px-6 py-2.5 dark:border-border dark:bg-card overflow-x-auto scrollbar-none gap-4 select-none"
          >
            <SegmentedControl
              value={organizationScope}
              onValueChange={(value) => {
                setOrganizationScope(value);
                setOrgPage(1);
              }}
              variant="capsule"
              className="inline-grid grid-flow-col auto-cols-fr shrink-0"
              items={[
                { value: "active", label: "Active", badge: organizations.length - archivedCount },
                { value: "archive", label: "Archive", badge: archivedCount },
              ]}
            />

            <SegmentedControl
              value={viewMode}
              onValueChange={setViewMode}
              variant="capsule"
              className="inline-grid grid-flow-col auto-cols-fr shrink-0 ml-auto"
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
          </div>

          {/* 3. Navigation Toolbar */}
          <DataViewToolbar label="Organization search, views, and filters" className="border-t border-border dark:border-border p-4 sm:px-5 sm:py-3 gap-2 bg-white dark:bg-card flex flex-wrap items-center justify-between select-none">
            {/* Left Zone: Search + Scroll */}
            <div className="flex min-w-0 items-center gap-2">
              <DashboardSearch
                value={search}
                onChange={setSearch}
                onClear={() => setSearch("")}
                resultCount={filteredOrganizations.length}
                placeholder="Search org name, acronym, adviser..."
              />
              {viewMode === "table" && (
                <TableScrollControls
                  scrollContainerRef={tableContainerRef}
                  isScrolledX={isScrolledX}
                  onResetScroll={resetScroll}
                  onScrollLeft={() => scrollLeft(400)}
                  onScrollRight={() => scrollRight(400)}
                  controlSize="md"
                />
              )}
            </div>

            {/* Right Zone: Filter, Sort, Group, Columns, Date Range */}
            <div className="ml-auto flex shrink-0 items-center gap-2">
              <FilterPopover
                fields={filterFields}
                filters={activeFilterRules}
                onFiltersChange={(rules) => {
                  setFilterRules(rules);
                  setOrgPage(1);
                }}
                entityLabel="organizations"
              />
              <SortPopover
                options={ORG_SORT_OPTIONS}
                sortBy={sortBy}
                onSortByChange={(val) => {
                  setSortBy(val);
                  setSortOrder("ASC");
                }}
                sortOrder={sortOrder}
                onSortOrderChange={setSortOrder}
              />
              {viewMode === "table" && (
                <GroupPopover
                  options={ORG_GROUP_OPTIONS}
                  groupBy={groupBy}
                  onGroupByChange={setGroupBy}
                />
              )}
              {viewMode === "table" && (
                <ColumnsPopover
                  columns={ORG_TABLE_COLUMNS}
                  visibleColumns={visibleColumns}
                  onVisibleColumnsChange={setVisibleColumns}
                  minVisible={2}
                />
              )}
              <DateRangeFilterButton
                startDate={startDate}
                endDate={endDate}
                onApply={({ startDate: s, endDate: e }) => {
                  setStartDate(s);
                  setEndDate(e);
                }}
                onClear={() => {
                  setStartDate("");
                  setEndDate("");
                }}
                disableFutureDates={true}
              />
            </div>
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
            {loading && !hasLoaded ? (
              <DataContentSkeleton columns={organizationTableColumns} viewMode={viewMode} />
            ) : organizationsLoadFailed && filteredOrganizations.length === 0 ? (
              <EmptyState
                icon={EmptyBuilding03Icon}
                title="Could Not Load Student Organizations"
                description="Try loading the organization directory again."
              >
                <Button variant="outline" size="sm" onClick={() => fetchOrganizations(true)} disabled={refreshing}>
                  Try Again
                </Button>
              </EmptyState>
            ) : filteredOrganizations.length === 0 ? (
              <div className="rounded-b-2xl flex-1 flex flex-col items-center justify-center min-h-[420px] w-full">
                <Empty>
                  <EmptyHeader>
                    <EmptyMedia><EmptyBuilding03Icon size="1em" /></EmptyMedia>
                    <EmptyTitle>
                      {showArchived ? "No Archived Organizations Found" : "No Student Organizations Found"}
                    </EmptyTitle>
                    <EmptyDescription>
                      {hasActiveFilters
                        ? "Try adjusting your search or resetting the filters."
                        : showArchived
                          ? "Archived organizations will appear here."
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
                    ) : !showArchived ? (
                      <Button
                        type="button"
                        size="sm"
                        onClick={openCreateModal}
                        title="Register Organization"
                        className="h-9 px-4 cursor-pointer border-0"
                      >
                        Register Organization
                      </Button>
                    ) : null}
                  </EmptyContent>
                </Empty>
              </div>
            ) : viewMode === "table" ? (
              /* Table View Mode */
              <div
                ref={tableContainerRef}
                className="w-full flex-[1_0_auto] overflow-x-auto show-scrollbar pb-2"
              >
                <Table columns={organizationTableColumns}>
                  <thead className="sticky top-0 z-10 border-b border-border bg-gray-50/90 dark:bg-zinc-900/90 backdrop-blur-xs select-none">
                    <tr className="text-left text-xs font-semibold text-gray-500 dark:text-zinc-400">
                      {visibleColumns.includes("name") && (
                        <th className="p-4 pl-6">Organization</th>
                      )}
                      {visibleColumns.includes("category") && (
                        <th className="p-4">Category</th>
                      )}
                      {visibleColumns.includes("adviser") && (
                        <th className="p-4">Faculty Adviser</th>
                      )}
                      <th className="p-4 text-center">Officers</th>
                      <th className="p-4">Constitution & By-Laws</th>
                      {visibleColumns.includes("status") && (
                        <th className="p-4 text-center">Status</th>
                      )}
                      {visibleColumns.includes("proposal_count") && <th>Submissions</th>}
                      {visibleColumns.includes("created_at") && <th>Date Added</th>}
                      <th scope="col" className="w-12 min-w-12"><span className="sr-only">Actions</span></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border dark:divide-border bg-white dark:bg-card">
                    {groupedOrganizations.map((group) => (
                      <Fragment key={group.key}>
                        {group.label && (
                          <DataGroupHeader label={group.label} count={group.orgs.length} colSpan={organizationTableColumns.length} />
                        )}
                        {group.orgs.map((org) => {
                          const hasCbl = Boolean(org.bylaws_storage_filename);
                          const officerCount = parseInt(org.active_officer_count, 10) || 0;
                          const submissionCount = Math.max(0, Number(org.proposal_count) || 0);

                          return (
                            <tr
                              key={org.id}
                              onClick={(event) => {
                                if (event.target.closest("button, a")) return;
                                openManageOrgSheet(org, "info");
                              }}
                              className="cursor-pointer hover:bg-gray-50/70 dark:hover:bg-zinc-800/40 transition-colors group"
                            >
                              {/* Org Name & Acronym */}
                              {visibleColumns.includes("name") && (
                                <td className="p-4 pl-6 overflow-hidden">
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
                              )}

                              {/* Category Badge */}
                              {visibleColumns.includes("category") && (
                                <td className="p-4 whitespace-nowrap border-r border-border/70 dark:border-border/70">
                                  <span className="px-2.5 py-1 text-xs font-medium rounded-lg bg-gray-100 text-gray-700 dark:bg-zinc-800 dark:text-zinc-300">
                                    {org.category}
                                  </span>
                                </td>
                              )}

                              {/* Faculty Adviser */}
                              {visibleColumns.includes("adviser") && (
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
                              )}

                              {/* Authorized Officers */}
                              <td className="p-4 text-center whitespace-nowrap border-r border-border/70 dark:border-border/70">
                                <button
                                  type="button"
                                  onClick={() => openManageOrgSheet(org, "officers")}
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-100 dark:border-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors cursor-pointer"
                                  title="Manage authorized officers"
                                >
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
                              {visibleColumns.includes("status") && (
                                <td className="p-4 text-center whitespace-nowrap border-r border-border/70 dark:border-border/70">
                                  <span
                                    className={cn("inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[11px] font-semibold rounded-full border", getOrgStatusBadgeClass(org.status), BADGE_BASE)}
                                  >
                                    {org.status}
                                  </span>
                                </td>
                              )}

                              {visibleColumns.includes("proposal_count") && (
                                <td>
                                  <span className="flex items-center justify-end gap-1.5">
                                    <span
                                      aria-hidden="true"
                                      className="h-1.5 w-9 shrink overflow-hidden rounded-full bg-gray-200 dark:bg-zinc-700"
                                    >
                                      <span
                                        className="block h-full rounded-full bg-pup-maroon"
                                        style={{ width: maxSubmissionCount ? `${100 * submissionCount / maxSubmissionCount}%` : "0%" }}
                                      />
                                    </span>
                                    <span className="shrink-0">{organizationCountFormat.format(submissionCount)}</span>
                                  </span>
                                </td>
                              )}
                              {visibleColumns.includes("created_at") && (
                                <td>{org.created_at ? new Date(org.created_at).toLocaleDateString("en-PH", {
                                  year: "numeric", month: "short", day: "numeric", timeZone: "Asia/Manila",
                                }) : "N/A"}</td>
                              )}

                              {/* Actions */}
                              <td className="w-12 min-w-12 px-2 text-center">
                                <TableActions
                                  label={`More actions for ${org.name}`}
                                  menuClassName="w-52"
                                  menuAlign="end"
                                  actions={[
                                    { label: "Manage Organization Info", icon: PencilEdit01Icon, onClick: () => openManageOrgSheet(org, "info") },
                                    { label: "Manage Authorized Officers", icon: UserSearch01Icon, onClick: () => openManageOrgSheet(org, "officers") },
                                    ...(org.status !== "Archived" ? [{
                                      label: "Archive Organization",
                                      separatorBefore: true,
                                      icon: Archive02Icon,
                                      onClick: () => setOrganizationToArchive(org),
                                    }] : []),
                                  ]}
                                />
                              </td>
                            </tr>
                          );
                        })}
                      </Fragment>
                    ))}
                  </tbody>
                </Table>
              </div>
            ) : (
              /* Grid View Mode */
              <div className="p-6 flex-[1_0_auto] content-start grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {paginatedOrganizations.map((org) => {
                  const pendingCharterCount = Number(org.pending_cbl_count) || 0;
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

                          {pendingCharterCount > 0 && (
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <span className={cn(BADGE_BASE, BADGE_PALETTES.amber)}>
                                {pendingCharterCount} {pendingCharterCount === 1 ? "charter" : "charters"} pending review
                              </span>
                              <Button variant="outline" size="xs" onClick={() => openManageOrgSheet(org, "cbl")}>
                                Review Charters
                              </Button>
                            </div>
                          )}
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
                <span className="font-semibold">Inactive Accreditation:</span> Officers cannot submit proposals, post-event reports, or charter amendments for this organization until it is set back to Active.
              </NoticeBanner>
            ) : (
              <NoticeBanner tone="success">
                <span className="font-semibold">Accredited Campus Organization:</span> Leadership roster authorized to sponsor campus events and execute official paperwork.
              </NoticeBanner>
            )}

            {/* Sub-tab segmented switcher */}
            <div className="px-6 py-2.5 border-b border-border dark:border-border">
              <SegmentedControl
                value={sheetSubTab}
                onValueChange={setSheetSubTab}
                variant="capsule"
                className="w-full min-w-0"
                listClassName="flex w-full flex-wrap rounded-xl"
                items={[
                  {
                    value: "info",
                    label: "Organization Info",
                    icon: <Contact01Icon size="1em" className="text-xs" />,
                  },
                  {
                    value: "officers",
                    label: "Authorized Officers",
                    icon: <UserSearch01Icon size="1em" className="text-xs" />,
                    badge: officersList.length,
                  },
                  {
                    value: "cbl",
                    label: "Constitution & By-Laws",
                    icon: <BookBookmark01Icon size="1em" className="text-xs" />,
                    badge: bylawsHistory.length,
                  },
                ]}
              />
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
                        className={cn(getOrgStatusBadgeClass(orgForm.status), COMPACT_BADGE_BASE)}
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
                      <div className="p-3 rounded-2xl border border-border dark:border-border bg-gray-50/70 dark:bg-zinc-800/40">
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
                      <div className="rounded-2xl border border-border/80 dark:border-border overflow-hidden divide-y divide-border dark:divide-border bg-white dark:bg-zinc-900/40 shadow-2xs">
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
                              className="p-3.5 flex items-center justify-between gap-3.5 hover:bg-gray-50/70 dark:hover:bg-zinc-800/40 transition-colors group"
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
                                    <span className={cn(COMPACT_BADGE_BASE, BADGE_PALETTES.violet)}>
                                      {officer.position}
                                    </span>
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
                                variant="destructive"
                                size="sm"
                                onClick={() => setOfficerToRemove(officer)}
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
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-zinc-300">
                        Constitution & By-Laws Versions ({bylawsHistory.length})
                      </h4>
                      <p className="text-[11px] text-gray-900 dark:text-zinc-300 mt-0.5">
                        Track ratification milestones, student amendment proposals, and official archived texts.
                      </p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setCblUploadOrg(selectedOrgForOfficers)}
                    >
                      Archive Charter
                    </Button>
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
                      description="Use Archive Charter to upload the first official charter, or officers may submit an amendment."
                    />
                  ) : (
                    <div className="space-y-3">
                      {bylawsHistory.map((ver) => (
                        <div
                          key={ver.id}
                          className="rounded-2xl border border-border/80 dark:border-border bg-white dark:bg-zinc-900/40 p-4 space-y-3 shadow-xs hover:border-border dark:hover:border-zinc-700 transition-all"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className={cn("px-2 py-0.5 text-xs font-bold rounded-lg", BADGE_PALETTES.violet)}>
                                  {ver.version_tag || (ver.version_number ? `v${ver.version_number}` : "CBL")}
                                </span>
                                <span
                                  className={cn(getBylawsStatusBadgeClass(ver.status), COMPACT_BADGE_BASE)}
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
                                : "bg-gray-50/70 dark:bg-zinc-800/40 border-border dark:border-border text-gray-600 dark:text-zinc-300"
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
                                variant="danger"
                                onClick={() => openCblReviewDialog(ver, "Declined")}
                              >
                                Decline Charter
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="warning"
                                onClick={() => openCblReviewDialog(ver, "Needs Revision")}
                                title="Request Revision"
                              >
                                Request Revision
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="success"
                                onClick={() => openCblReviewDialog(ver, "Approved")}
                                title="Approve & Ratify Charter"
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
                className="h-9 px-4"
              >
                Close
              </Button>
              {sheetSubTab === "info" && (
                <Button
                  type="submit"
                  form="org-info-form"
                  size="sm"
                  disabled={savingOrg}
                  className="h-9 px-4"
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

        <ConfirmModal
          open={Boolean(organizationToArchive)}
          title="Archive Organization?"
          description={`${organizationToArchive?.name} will move to the Archive tab. Officers will no longer be able to submit on behalf of this organization until it is reinstated.`}
          confirmLabel="Archive Organization"
          variant="warning"
          isLoading={archivingOrganization}
          onConfirm={handleArchiveOrganization}
          onCancel={() => setOrganizationToArchive(null)}
        />

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
