"use client";
import { BADGE_BASE } from "@/lib/badgeStyles";
import { useState, useEffect, useMemo, useRef, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";

import Sidebar from "@/components/shared/Sidebar";
import { toast } from "@/components/ui/sonner";
import { formatErrorMessage } from "@/lib/errorUtils";
import { createOcrRequestGuard } from "@/lib/ocrRequestGuard";
import { StaffGuard, useAuthUser } from "@/components/shared/AuthGuard";
import PDFPreviewModal from "@/components/shared/PDFPreviewModal";
import ConfirmModal from "@/components/shared/ConfirmModal";
import GlobalFailedBatchReviewModal from "@/components/staff/GlobalFailedBatchReviewModal";
import { ContentSwap } from "@/components/ui/motion";
import { canonicalizeCabinetId, findMatchingCabinet, areCabinetsEqual } from "@/lib/storageLayoutUtils";
import { matchesSearchQuery, getDocTypeSearchAliases } from "@/lib/searchUtils";
import { fetchAllPages } from "@/lib/fetchAllPages";
import { cn } from "@/lib/utils";
import { getRoleBranding } from "@/lib/roleBranding";
import {
  DOCUMENT_MAX_SIZE_BYTES,
  DOCUMENT_PAGE_MAX_SIZE_BYTES,
  DOCUMENT_MAX_SIZE_LABEL,
  DOCUMENT_PAGE_MAX_SIZE_LABEL,
  formatBytes,
} from "@/lib/uploadLimits";
import MyActivityPanel from "@/components/shared/MyActivityPanel";
import AccountSettingsPanel from "@/components/shared/AccountSettingsPanel";
import { useLayoutZoom } from "@/hooks/useLayoutZoom";
import DashboardShellSkeleton from "@/components/shared/DashboardShellSkeleton";
import DocumentRequestsSkeleton from "@/components/staff/skeletons/DocumentRequestsSkeleton";
import OsasMonitoringSkeleton from "@/components/staff/skeletons/OsasMonitoringSkeleton";
import ScanUploadSkeleton from "@/components/staff/skeletons/ScanUploadSkeleton";
import BatchReviewSkeleton from "@/components/staff/skeletons/BatchReviewSkeleton";
import StudentDirectorySkeleton from "@/components/staff/skeletons/StudentDirectorySkeleton";
import StudentOrganizationsSkeleton from "@/components/staff/skeletons/StudentOrganizationsSkeleton";
import RecordsArchiveSkeleton from "@/components/staff/skeletons/RecordsArchiveSkeleton";
import StorageExplorerSkeleton from "@/components/staff/skeletons/StorageExplorerSkeleton";
import DocumentsTabSkeleton from "@/components/staff/skeletons/DocumentsTabSkeleton";
import NotificationsTabSkeleton from "@/components/staff/skeletons/NotificationsTabSkeleton";

import AppIcon from "@/components/ui/app-icon";
const STAFF_NAV_ITEMS = [
  { key: "requests", label: "Document Requests" },
  { key: "osas_monitoring", label: "OSAS Monitoring" },
  { type: "header", label: "Scanning & Document Upload" },
  { key: "upload", label: "Scan & Upload" },
  { key: "batch_review", label: "Batch Review" },
  { type: "header", label: "Student & Organization Roster" },
  { key: "students", label: "Student Directory" },
  { key: "organizations", label: "Student Organizations" },
  { type: "header", label: "Archive & Storage" },
  { key: "search", label: "Records & Archive" },
  { key: "storage", label: "Storage Explorer" },
  { type: "header", label: "Records & Communications" },
  { key: "documents", label: "Student Documents" },
  { key: "notifications", label: "Notifications" },
];

const STAFF_VIEWS = ["requests", "osas_monitoring", "organizations", "students", "upload", "batch_review", "documents", "notifications", "search", "storage", "activity", "settings"];
const STAFF_VIEW_MODULES = {
  requests: "document_requests",
  osas_monitoring: "osas_monitoring",
  organizations: "student_organizations",
  students: "student_directory",
  upload: "scan_upload",
  batch_review: "scan_upload",
  documents: "documents",
  notifications: "notifications",
  search: "records_archive",
  storage: "storage_explorer",
};

function resolveRequestedStaffView(rawView) {
  return STAFF_VIEWS.includes(rawView) ? rawView : null;
}

function isStaffViewEnabled(view, user) {
  const enabledModules = user?.enabled_modules;
  const requiredModule = STAFF_VIEW_MODULES[view];
  return !requiredModule || !Array.isArray(enabledModules) || enabledModules.length === 0 || enabledModules.includes(requiredModule);
}

function resolveStaffView(rawView, user) {
  const requested = resolveRequestedStaffView(rawView);
  if (requested && isStaffViewEnabled(requested, user)) return requested;
  const preferred = resolveRequestedStaffView(user?.preferences?.default_home_view);
  if (preferred && isStaffViewEnabled(preferred, user)) return preferred;
  const officeDefault = user?.office_id === "osas" ? "osas_monitoring" : "requests";
  if (isStaffViewEnabled(officeDefault, user)) return officeDefault;
  return STAFF_VIEWS.find((view) => isStaffViewEnabled(view, user)) || officeDefault;
}

function StaffContentSkeleton({ view }) {
  switch (view) {
    case "requests": return <DocumentRequestsSkeleton />;
    case "osas_monitoring": return <OsasMonitoringSkeleton />;
    case "organizations": return <StudentOrganizationsSkeleton />;
    case "students": return <StudentDirectorySkeleton />;
    case "upload": return <ScanUploadSkeleton />;
    case "batch_review": return <BatchReviewSkeleton />;
    case "documents": return <DocumentsTabSkeleton />;
    case "notifications": return <NotificationsTabSkeleton />;
    case "search": return <RecordsArchiveSkeleton />;
    case "storage": return <StorageExplorerSkeleton />;
    default: return null;
  }
}

function StaffDashboardLoadingSkeleton({ view }) {
  return (
    <DashboardShellSkeleton items={STAFF_NAV_ITEMS}>
      <StaffContentSkeleton view={view} />
    </DashboardShellSkeleton>
  );
}

const RecordsArchiveTab = dynamic(() => import("@/components/staff/RecordsArchiveTab"), { loading: () => <StaffContentSkeleton view="search" /> });
const StorageExplorerTab = dynamic(() => import("@/components/staff/StorageExplorerTab"), { loading: () => <StaffContentSkeleton view="storage" /> });
const ScanUploadTab = dynamic(() => import("@/components/staff/ScanUploadTab"), { loading: () => <StaffContentSkeleton view="upload" /> });
const BatchReviewTab = dynamic(() => import("@/components/staff/BatchReviewTab"), { loading: () => <StaffContentSkeleton view="batch_review" /> });
const DocumentsTab = dynamic(() => import("@/components/staff/DocumentsTab"), { loading: () => <StaffContentSkeleton view="documents" /> });
const NotificationsTab = dynamic(() => import("@/components/staff/NotificationsTab"), { loading: () => <StaffContentSkeleton view="notifications" /> });
const DocumentRequestsTab = dynamic(() => import("@/components/staff/DocumentRequestsTab"), { loading: () => <StaffContentSkeleton view="requests" /> });
const OsasMonitoringTab = dynamic(() => import("@/components/staff/OsasMonitoringTab"), { loading: () => <StaffContentSkeleton view="osas_monitoring" /> });
const StudentOrganizationsTab = dynamic(() => import("@/components/staff/StudentOrganizationsTab"), { loading: () => <StaffContentSkeleton view="organizations" /> });
const StudentDirectoryTab = dynamic(() => import("@/components/staff/StudentDirectoryTab"), { loading: () => <StaffContentSkeleton view="students" /> });

function normalizeStudentRow(row) {
  if (!row || typeof row !== "object") return row;
  const roomRaw = row.room ?? "";
  const cabRaw = row.cabinet ?? "";
  const drawerRaw = row.drawer ?? "";

  // Normalize cabinet so that it is always a clean  letter (no prefixes, trimmed)
  const cleanCabinet = canonicalizeCabinetId(cabRaw);

  return {
    ...row,
    studentNo: row.studentNo ?? row.student_no ?? "",
    courseCode: row.courseCode ?? row.course_code ?? "",
    yearLevel: row.yearLevel ?? row.year_level ?? null,
    room: Number.isFinite(Number(roomRaw)) ? Number(roomRaw) : String(roomRaw).trim(),
    cabinet: cleanCabinet,
    drawer: Number.isFinite(Number(drawerRaw)) ? Number(drawerRaw) : String(drawerRaw).trim(),
  };
}

function getStudentNoYear(studentNo) {
  const raw = String(studentNo || "").trim();
  const yearPart = raw.split("-")[0];
  const year = Number(yearPart);
  if (!Number.isInteger(year) || year < 1900 || year > 2200) return null;
  return year;
}



function StaffPageContent({ authUser: propAuthUser = null }) {
  const router = useRouter();
  const contextAuthUser = useAuthUser();
  const initialAuthUser = propAuthUser || contextAuthUser;

  const searchParams = useSearchParams();
  const coreDataLoadedRef = useRef(false);
  const referenceDataLoadedRef = useRef(false);
  const coreRequestRef = useRef(0);
  const docsLoadedRef = useRef(false);
  const docsLoadedAtRef = useRef(0);
  const docsRequestRef = useRef(0);
  const locateTimeoutRef = useRef(null);
  const processedLocateRef = useRef(null);

  const initialView = resolveStaffView(searchParams?.get("view") || searchParams?.get("tab"), initialAuthUser);

  const [view, setView] = useState(initialView);
  const [authUser, setAuthUser] = useState(initialAuthUser);
  const isOsas = (authUser?.office_id || "").toLowerCase() === "osas";
  const { zoomNode, setZoomNode, handleZoomMouseDown, zoomStyle } = useLayoutZoom(authUser);

  const roleBranding = getRoleBranding(authUser);
  const brandAccent = authUser?.accent_color || roleBranding.color || "#ffcb00";
  const brandForeground = roleBranding.foreground || "#FFFFFF";

  useEffect(() => {
    if (typeof window !== "undefined" && brandAccent) {
      document.documentElement.style.setProperty("--brand-accent", brandAccent);
      document.documentElement.style.setProperty("--brand-foreground", brandForeground);
    }
  }, [brandAccent, brandForeground]);

  useEffect(() => {
    const handlePreferencesChanged = (e) => {
      if (e?.detail?.preferences) {
        setAuthUser((prev) =>
          prev ? { ...prev, preferences: { ...(prev.preferences || {}), ...e.detail.preferences } } : prev
        );
      }
    };
    window.addEventListener("user-preferences-changed", handlePreferencesChanged);
    return () => window.removeEventListener("user-preferences-changed", handlePreferencesChanged);
  }, []);

  const switchView = useCallback((nextView) => {
    setView(nextView);
    const params = new URLSearchParams();
    params.set("view", nextView);
    router.push(`${window.location.pathname}?${params.toString()}`, { scroll: false });
  }, [router]);

  useEffect(() => {
    const tab = String(searchParams?.get("view") || searchParams?.get("tab") || "").trim()
    setView(resolveStaffView(tab, authUser))
  }, [searchParams, authUser])
  const [loading, setLoading] = useState(!initialAuthUser);
  const [notificationsUnread, setNotificationsUnread] = useState(0);

  const sidebarItems = useMemo(() => {
    if (!authUser?.enabled_modules) return []
    const enabled = new Set(authUser.enabled_modules)
    
    const MODULE_KEY_MAP = {
      requests: "document_requests",
      osas_monitoring: "osas_monitoring",
      organizations: "student_organizations",
      students: "student_directory",
      upload: "scan_upload",
      batch_review: "scan_upload",
      documents: "documents",
      notifications: "notifications",
      search: "records_archive",
      storage: "storage_explorer",
    }

    const groups = [
      {
        type: "group",
        label: "Service & Requests",
        children: [
          { key: "requests", label: "Document Requests", iconClass: " FileUploadIcon" },
          { key: "osas_monitoring", label: "OSAS Monitoring", iconClass: " StudentIcon" },
        ]
      },
      {
        type: "group",
        label: "Scanning & Document Upload",
        children: [
          { key: "upload", label: "Scan & Upload", iconClass: " FingerPrintScanIcon" },
          { key: "batch_review", label: "Batch Review", iconClass: " Task01Icon" },
        ]
      },
      {
        type: "group",
        label: "Student & Organization Roster",
        children: [
          { key: "students", label: "Student Directory", iconClass: " UserSearch01Icon" },
          { key: "organizations", label: "Student Organizations", iconClass: " Building01Icon" },
        ]
      },
      {
        type: "group",
        label: "Archive & Storage",
        children: [
          { key: "search", label: "Records & Archive", iconClass: " Archive01Icon" },
          { key: "storage", label: "Storage Explorer", iconClass: " FolderOpenIcon" },
        ]
      },
      {
        type: "group",
        label: "Records & Communications",
        children: [
          { key: "documents", label: "Student Documents", iconClass: " File02Icon" },
          { key: "notifications", label: "Notifications", iconClass: " Notification01Icon", badge: notificationsUnread },
        ]
      }
    ]

    const result = []
    for (const group of groups) {
      const activeChildren = group.children.filter(child => {
        const requiredModule = MODULE_KEY_MAP[child.key]
        if (!requiredModule) return true
        return enabled.has(requiredModule)
      })
      if (activeChildren.length > 0) {
        result.push({ type: "header", label: group.label })
        result.push(...activeChildren)
      }
    }
    return result
  }, [authUser?.enabled_modules, notificationsUnread])

  const [students, setStudents] = useState([]);
  const [archivedStudents, setArchivedStudents] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [archivedOrganizations, setArchivedOrganizations] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [docTypes, setDocTypes] = useState([]);
  const [requestableDocTypes, setRequestableDocTypes] = useState([]);
  const [courses, setCourses] = useState([]);
  const [sections, setSections] = useState([]);
  const [storageLayout, setStorageLayout] = useState(null);
  const [allDocs, setAllDocs] = useState([]);

  const [currentLevel, setCurrentLevel] = useState("years");
  const [selectedYear, setSelectedYear] = useState(null);

  const [quickQuery, setQuickQuery] = useState("");
  const [archiveRefreshVersion, setArchiveRefreshVersion] = useState(0);

  const [activeStudent, setActiveStudent] = useState(null);
  const [selectedStudentIds, setSelectedStudentIds] = useState(new Set());
  const [bulkArchiveOpen, setBulkArchiveOpen] = useState(false);
  const [bulkArchiveLoading, setBulkArchiveLoading] = useState(false);
  const [bulkRestoreOpen, setBulkRestoreOpen] = useState(false);
  const [bulkRestoreLoading, setBulkRestoreLoading] = useState(false);

  // Prune any stale selectedStudentIds when students or organizations datasets update
  useEffect(() => {
    setSelectedStudentIds((prev) => {
      if (prev.size === 0) return prev;
      const isOsas = authUser?.office_id === "osas";
      const allAvailable = isOsas
        ? [...organizations, ...archivedOrganizations].map((o) => o.id)
        : [...students, ...archivedStudents].map((s) => s.studentNo);
      const validIds = new Set(allAvailable);
      let needsPruning = false;
      for (const id of prev) {
        if (!validIds.has(id)) {
          needsPruning = true;
          break;
        }
      }
      if (!needsPruning) return prev;
      const next = new Set();
      for (const id of prev) {
        if (validIds.has(id)) next.add(id);
      }
      return next;
    });
  }, [students, archivedStudents, organizations, archivedOrganizations, authUser?.office_id]);

  const [currentLocatorLevel, setCurrentLocatorLevel] = useState("rooms");
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [selectedCabinet, setSelectedCabinet] = useState(null);

  /** When true, submit attaches the PDF to an existing student (no new student row). */
  const [uploadStudentIsExisting, setUploadStudentIsExisting] = useState(false);
  const [dropActive, setDropActive] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [selectedQueuedFileIndex, setSelectedQueuedFileIndex] = useState(0);
  const fileInputRef = useRef(null);
  const ocrContextRef = useRef(null);
  const ocrContextFileRef = useRef(null);
  const ocrRequestGuardRef = useRef(createOcrRequestGuard());
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrSuggestion, setOcrSuggestion] = useState(null);
  const [ocrError, setOcrError] = useState("");
  const [rotation, setRotation] = useState(0);
  const [duplicateConfirmOpen, setDuplicateConfirmOpen] = useState(false);
  const [duplicateTargetDoc, setDuplicateTargetDoc] = useState(null);
  const [rescanContext, setRescanContext] = useState(null);
  const [isReplaceMode, setIsReplaceMode] = useState(false);

  const [newRec, setNewRec] = useState({
    studentNo: "",
    name: "",
    course: "",
    year: "",
    sectionPart: "",
    room: "",
    cabinet: "",
    drawer: "",
    docType: "",
    organizationId: "",
    acronym: "",
    category: "",
    adviserName: "",
    adviserEmail: "",
  });
  const [newRecStudentNoHint] = useState("");
  const [newRecStudentNoTouched, setNewRecStudentNoTouched] = useState(false);
  const newStudentNoInputRef = useRef(null);

  /** Keys: pdfFile, studentNo, name, course, year, sectionPart, room, cabinet, drawer, docType */
  const [uploadFieldErrors, setUploadFieldErrors] = useState({});

  const [previewOpen, setPreviewOpen] = useState(false);
  const [preview, setPreview] = useState({
    docType: "",
    studentName: "",
    studentNo: "",
    docId: null,
    refId: "",
  });

  const showToast = useCallback((msg, typeOrIsError = false) => {
    if (msg instanceof Error) {
      const normalized = formatErrorMessage(msg);
      return toast.error(normalized.title, {
        description: normalized.description,
        action: normalized.action,
      });
    }

    const isError = typeOrIsError === true || typeOrIsError === "error";
    const isWarning = typeOrIsError === "warning";

    if (msg && typeof msg === "object") {
      const opts = {};
      if (msg.description) opts.description = msg.description;
      if (msg.action) opts.action = msg.action;

      if (isError) {
        const normalized = formatErrorMessage(msg.description || msg.title || "", {
          title: msg.title || "Operation Failed",
          description: msg.description,
        });
        return toast.error(normalized.title, {
          description: normalized.description,
          action: msg.action || normalized.action,
        });
      }
      if (isWarning) {
        return toast.warning(msg.title || "", opts);
      }
      return toast.success(msg.title || "", opts);
    }

    const str = String(msg || "");
    if (isError) {
      const normalized = formatErrorMessage(str);
      return toast.error(normalized.title, {
        description: normalized.description,
        action: normalized.action,
      });
    }
    if (isWarning) {
      return toast.warning(str);
    }
    return toast.success(str);
  }, []);

  const fetchData = useCallback(async ({ includeRoster = true } = {}) => {
    const request = ++coreRequestRef.current;
    try {
      if (!includeRoster) {
        const [typesRes, coursesRes, sectionsRes, layoutRes] = await Promise.all([
          fetch("/api/doc-types?scope=requestable"),
          fetch("/api/courses"),
          fetch("/api/sections"),
          fetch("/api/storage-layout"),
        ]);
        const [typesJson, coursesJson, sectionsJson, layoutJson] = await Promise.all([
          typesRes.json(), coursesRes.json(), sectionsRes.json(), layoutRes.json(),
        ]);
        if (request !== coreRequestRef.current) return;
        setRequestableDocTypes(typesJson?.data || []);
        setCourses(coursesJson?.data || []);
        setSections(sectionsJson?.data || []);
        setStorageLayout(layoutJson?.data || { version: 2, rooms: [] });
        referenceDataLoadedRef.current = true;
        return;
      }
      const orgsPromise = isOsas
        ? fetch("/api/osas/organizations?status=Active,Inactive,Archived").then(r => r.json()).catch(() => ({ ok: false, data: [] }))
        : Promise.resolve({ ok: true, data: [] });

      const [studentRows, dRes, reqDRes, cRes, secRes, layoutRes, orgsData] = await Promise.all([
        fetchAllPages("/api/students?includeArchived=true", 500),
        fetch("/api/doc-types"),
        fetch("/api/doc-types?scope=requestable"),
        fetch("/api/courses"),
        fetch("/api/sections"),
        fetch("/api/storage-layout"),
        orgsPromise,
      ]);
      const [dData, reqDData, cData, secData, layoutData] = await Promise.all([
        dRes.json(),
        reqDRes.json().catch(() => ({ ok: false, data: [] })),
        cRes.json(),
        secRes.json(),
        layoutRes.json(),
      ]);
      if (request !== coreRequestRef.current) return;
      
      setStudents(studentRows.filter((s) => s.status === "Active").map(normalizeStudentRow));
      setArchivedStudents(
        studentRows.filter(s => s.status !== "Active").map(normalizeStudentRow)
      );
      coreDataLoadedRef.current = true;

      const allOrgs = Array.isArray(orgsData?.data) ? orgsData.data : [];
      setOrganizations(allOrgs.filter(o => o.status !== "Archived"));
      setArchivedOrganizations(allOrgs.filter(o => o.status === "Archived"));

      setDocTypes(dData.data || []);
      setRequestableDocTypes(reqDData?.data || []);
      setCourses(cData.data || []);
      setSections(secData.data || []);
      setStorageLayout(layoutData?.data || { version: 2, rooms: [] });
      referenceDataLoadedRef.current = true;
    } catch (err) {
      if (request !== coreRequestRef.current) return;
      showToast(
        formatErrorMessage(err, {
          title: "Sync Failed",
          description: "Unable to refresh records from the server. Check your connection and retry.",
        }),
        true
      );
    }
  }, [showToast, isOsas]);

  const refreshStorageLayout = useCallback(async () => {
    try {
      const res = await fetch("/api/storage-layout", { cache: "no-store" });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) return;
      setStorageLayout(json.data || null);
    } catch {
      // ignore
    }
  }, []);

  const fetchAllDocs = useCallback(async () => {
    const request = ++docsRequestRef.current;
    docsLoadedAtRef.current = Date.now();
    try {
      const [res, proposalsData] = await Promise.all([
        fetchAllPages("/api/documents?excludeDeclined=1", 200),
        isOsas
          ? fetch("/api/osas/event-proposals", { cache: "no-store" }).then(r => r.json()).catch(() => null)
          : Promise.resolve(null),
      ]);
      const proposalDocuments = isOsas && Array.isArray(proposalsData?.data)
        ? proposalsData.data.map((proposal) => ({
            id: `event-proposal-${proposal.id}`,
            student_no: proposal.student_no,
            student_name: proposal.student_name,
            organization_id: proposal.organization_id,
            organization_name: proposal.organization_name || proposal.verified_org_name,
            org_acronym: proposal.org_acronym,
            doc_type: "Event Proposal",
            original_filename: proposal.original_filename,
            storage_filename: proposal.storage_filename,
            mime_type: proposal.mime_type,
            size_bytes: proposal.size_bytes,
            approval_status: proposal.status === "Approved" ? "Approved" : "Pending",
            created_at: proposal.created_at,
            source_type: "event_proposal",
            source_id: proposal.id,
            file_url: `/api/osas/event-proposals/${proposal.id}?file=1`,
          }))
        : [];
      if (request !== docsRequestRef.current) return;
      setAllDocs([...res, ...proposalDocuments]);
      docsLoadedRef.current = true;
      docsLoadedAtRef.current = Date.now();
    } catch {
      if (request === docsRequestRef.current) docsLoadedAtRef.current = 0;
      /* silent */
    }
  }, [isOsas]);

  const fetchNotificationsUnread = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications?limit=1&offset=0", { cache: "no-store" });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) return;
      const unread = Number(json?.data?.unreadCount || 0);
      setNotificationsUnread(unread);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (!initialAuthUser) return undefined;
    setAuthUser(initialAuthUser);
    setLoading(false);
    const timer = setTimeout(() => {
      fetchNotificationsUnread();
    }, 0);
    return () => clearTimeout(timer);
  }, [initialAuthUser, fetchNotificationsUnread]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      if (docsLoadedRef.current && Date.now() - docsLoadedAtRef.current > 60_000 && ["storage", "upload", "documents"].includes(view)) fetchAllDocs();
      fetchNotificationsUnread();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [fetchAllDocs, fetchNotificationsUnread, view]);

  useEffect(() => {
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") fetchNotificationsUnread();
    }, 30000);
    return () => clearInterval(timer);
  }, [fetchNotificationsUnread]);

  // Sync navigation layout preferences across tabs
  useEffect(() => {
    if (!authUser?.id) return;
    const handleStorageChange = (e) => {
      if (e.key === `pup_nav_layout_pref_${authUser.id}`) {
        setAuthUser((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            preferences: {
              ...(prev.preferences || {}),
              navigation_layout: e.newValue,
            },
          };
        });
      }
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [authUser?.id]);

  useEffect(() => {
    if (!authUser) return;
    if (["storage", "upload", "batch_review"].includes(view) && !coreDataLoadedRef.current) {
      fetchData();
    }
    if (["students", "requests", "documents", "search"].includes(view) && !referenceDataLoadedRef.current) {
      fetchData({ includeRoster: false });
    }
    if (["storage", "upload", "documents"].includes(view) && (!docsLoadedRef.current || Date.now() - docsLoadedAtRef.current > 60_000)) {
      fetchAllDocs();
    }
  }, [authUser, view, fetchData, fetchAllDocs]);

  useEffect(() => {
    if (view !== "upload" && view !== "search") return;
    // Keep staff selectors/SLV in sync with admin layout edits.
    if (coreDataLoadedRef.current) refreshStorageLayout();
  }, [view, refreshStorageLayout]);

  useEffect(() => {
    if (view !== "storage" && locateTimeoutRef.current) {
      clearTimeout(locateTimeoutRef.current);
      locateTimeoutRef.current = null;
    }
  }, [view]);



  useEffect(() => {
    return () => {
      if (locateTimeoutRef.current) {
        clearTimeout(locateTimeoutRef.current);
      }
    };
  }, []);

  // Keep locator selection valid when layout changes (rooms/cabinets can be added/removed).
  useEffect(() => {
    const rooms = storageLayout?.rooms || [];
    if (!rooms.length) return;

    // If no room selected and we're not at the room selection level, default to first room.
    if (currentLocatorLevel !== "rooms" && selectedRoom == null) {
      setSelectedRoom(rooms[0].id);
      return;
    }

    if (selectedRoom != null) {
      const roomDef = rooms.find((r) => String(r.id) === String(selectedRoom));
      if (!roomDef) {
        // Selected room removed -> fallback.
        setSelectedRoom(rooms[0].id);
        setSelectedCabinet(null);
        setCurrentLocatorLevel("cabinets");
        return;
      }

      // If cabinet selected, validate with robust matching and normalize ID.
      if (selectedCabinet) {
        const matchedCab = findMatchingCabinet(roomDef.cabinets, selectedCabinet);
        if (matchedCab) {
          if (String(selectedCabinet) !== String(matchedCab.id)) {
            setSelectedCabinet(matchedCab.id);
          }
        } else {
          setSelectedCabinet(roomDef.cabinets?.[0]?.id || null);
        }
      }
    }
  }, [storageLayout, currentLocatorLevel, selectedRoom, selectedCabinet]);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      /* ignore */
    }
    localStorage.setItem("pup-logout", Date.now());
    window.location.href = "/login";
  };

  const breadcrumbs = useMemo(() => {
    if (authUser?.office_id === "osas") {
      const list = [{ level: "categories", label: "Categories" }];
      if (selectedCategory) {
        list.push({ level: "organizations", label: `${selectedCategory} Organizations` });
      }
      return list;
    }
    const list = [{ level: "years", label: "Years" }];
    if (selectedYear) {
      list.push({ level: "students", label: `Year ${selectedYear}` });
    }
    return list;
  }, [authUser?.office_id, selectedCategory, selectedYear]);

  const staffDocs = useMemo(
    () =>
      allDocs.filter((d) => String(d?.approval_status || "") !== "Declined"),
    [allDocs],
  );

  const locatorModel = useMemo(() => {
    if (!storageLayout?.rooms?.length) return { kind: "none" };

    const isOsas = authUser?.office_id === "osas";

    if (currentLocatorLevel === "rooms") {
      return {
        kind: "rooms",
        title: isOsas ? "OSAS Physical Archive Rooms" : "PUP Storage Rooms",
        rooms: storageLayout.rooms.map((r) => ({
          room: r.id,
          name: r.name || `Room ${r.id}`,
          occupiedCount: isOsas
            ? organizations.filter((o) => String(o.storage_room || 1) === String(r.id)).length
            : students.filter((s) => String(s.room) === String(r.id)).length,
          cabinetsCount: r.cabinets?.length || 0,
          isTarget: String(activeStudent?.room) === String(r.id),
          cabinets: (r.cabinets || []).map((c) => ({ ...c, cab: String(c.id) })),
          door: r.door || null,
        })),
      };
    }
    if (currentLocatorLevel === "cabinets") {
      const roomDef = storageLayout.rooms.find((r) => String(r.id) === String(selectedRoom));
      if (!roomDef) return { kind: "cabinets", cabinets: [] };
      return {
        kind: "cabinets",
        room: selectedRoom,
        roomName: roomDef.name || `Room ${selectedRoom}`,
        roomDoor: roomDef.door || null,
        cabinets: roomDef.cabinets.map((c) => {
          const normCab = String(c.id);
          const occupiedCount = isOsas
            ? organizations.filter(
                (o) => String(o.storage_room || 1) === String(selectedRoom) && String(o.storage_cabinet) === normCab,
              ).length
            : students.filter(
                (s) => String(s.room) === String(selectedRoom) && String(s.cabinet) === normCab,
              ).length;
          return {
            cab: normCab,
            occupiedCount,
            isTarget:
              String(activeStudent?.room) === String(selectedRoom) &&
              areCabinetsEqual(activeStudent?.cabinet, normCab, roomDef.cabinets),
            rect: c.rect,
            rotation: c.rotation || 0,
            drawerIds: c.drawerIds,
          };
        }),
      };
    }
    if (currentLocatorLevel === "drawers") {
      const roomDef = storageLayout.rooms.find((r) => String(r.id) === String(selectedRoom));
      const cabinetDef = roomDef?.cabinets?.find(
        (c) => areCabinetsEqual(c.id, selectedCabinet, roomDef.cabinets)
      );
      if (!cabinetDef)
        return {
          kind: "drawers",
          drawers: [],
          cabinetRect: null,
          cabinets: [],
        };
      return {
        kind: "drawers",
        room: selectedRoom,
        roomName: roomDef?.name || `Room ${selectedRoom}`,
        cabinet: selectedCabinet,
        roomDoor: roomDef?.door || null,
        cabinetRect: cabinetDef.rect,
        cabinets: roomDef.cabinets.map((c) => {
          const normCab = String(c.id);
          const occupiedCount = isOsas
            ? organizations.filter(
                (o) => String(o.storage_room || 1) === String(selectedRoom) && String(o.storage_cabinet) === normCab,
              ).length
            : students.filter(
                (s) => String(s.room) === String(selectedRoom) && String(s.cabinet) === normCab,
              ).length;
          return {
            cab: normCab,
            occupiedCount,
            isTarget:
              String(activeStudent?.room) === String(selectedRoom) &&
              areCabinetsEqual(activeStudent?.cabinet, normCab, roomDef.cabinets),
            rect: c.rect,
            rotation: c.rotation || 0,
            drawerIds: c.drawerIds,
          };
        }),
        drawers: (cabinetDef.drawerIds || []).map((d) => {
          if (isOsas) {
            const drawerOrgs = organizations.filter(
              (o) =>
                String(o.storage_room || 1) === String(selectedRoom) &&
                String(o.storage_cabinet) === String(selectedCabinet) &&
                String(o.storage_drawer) === String(d)
            );
            return {
              drawer: d,
              count: drawerOrgs.length,
              students: drawerOrgs.map((o) => {
                const docs = [];
                if (o.bylaws_storage_filename) {
                  docs.push({
                    id: `cbl-${o.id}`,
                    docType: "Constitution & By-Laws (CBL)",
                    filename: o.bylaws_original_filename || `${o.acronym || o.id}-Official-CBL-2026.pdf`,
                    approvalStatus: "Approved",
                    file_url: `/api/osas/organizations/${encodeURIComponent(o.id)}/bylaws?file=1`,
                  });
                }
                const propDocs = staffDocs
                  .filter((doc) =>
                    doc.source_id && (
                      doc.organization_id === o.id ||
                      doc.student_no === o.id ||
                      (doc.org_acronym && o.acronym && doc.org_acronym.toLowerCase() === o.acronym.toLowerCase()) ||
                      (doc.organization_name && o.name && doc.organization_name.toLowerCase().includes(o.name.toLowerCase())) ||
                      (doc.original_filename && doc.original_filename.toLowerCase().includes(o.id.toLowerCase())) ||
                      (o.acronym && doc.original_filename && doc.original_filename.toLowerCase().includes(o.acronym.toLowerCase()))
                    )
                  )
                  .map((doc) => ({
                    id: doc.id,
                    docType: doc.doc_type,
                    filename: doc.original_filename,
                    approvalStatus: doc.approval_status,
                    file_url: doc.file_url,
                  }));
                return {
                  studentNo: o.acronym || o.id,
                  name: o.name,
                  category: o.category,
                  documents: [...docs, ...propDocs],
                };
              }),
              isTarget:
                String(activeStudent?.room) === String(selectedRoom) &&
                areCabinetsEqual(activeStudent?.cabinet, selectedCabinet, roomDef.cabinets) &&
                String(activeStudent?.drawer) === String(d),
            };
          }

          const drawerStudents = students.filter(
            (s) =>
              String(s.room) === String(selectedRoom) &&
              String(s.cabinet) === String(selectedCabinet) &&
              String(s.drawer) === String(d)
          );
          return {
            drawer: d,
            count: drawerStudents.length,
            students: drawerStudents.map((s) => ({
              studentNo: s.studentNo,
              name: s.name,
              documents: staffDocs
                .filter((doc) => doc.student_no === s.studentNo)
                .map((doc) => ({
                  id: doc.id,
                  docType: doc.doc_type,
                  filename: doc.original_filename,
                  approvalStatus: doc.approval_status,
                })),
            })),
            isTarget:
              String(activeStudent?.room) === String(selectedRoom) &&
              areCabinetsEqual(activeStudent?.cabinet, selectedCabinet, roomDef.cabinets) &&
              String(activeStudent?.drawer) === String(d),
          };
        }),
      };
    }
    return { kind: "none" };
  }, [
    currentLocatorLevel,
    selectedRoom,
    selectedCabinet,
    students,
    organizations,
    activeStudent,
    storageLayout,
    staffDocs,
    authUser?.office_id,
  ]);

  const availableSectionsForNewRecord = useMemo(() => {
    if (!newRec.course) return [];
    const linked = sections.filter(
      (s) =>
        String(s.course_code || "").toUpperCase() ===
        String(newRec.course || "").toUpperCase()
    );
    if (linked.length > 0) return linked;
    return sections;
  }, [sections, newRec.course]);

  const locateStudent = useCallback(
    (s) => {
      if (!s) return;
      const isOsas = authUser?.office_id === "osas";
      if (isOsas) {
        setSelectedCategory(s.category || s.rawOrg?.category || null);
        setCurrentLevel("organizations");
      } else {
        const derivedYear = getStudentNoYear(s.studentNo);
        const yearFromDb = Number(s.yearLevel);
        const nextYear =
          derivedYear != null
            ? derivedYear
            : Number.isFinite(yearFromDb)
              ? yearFromDb
              : null;

        setSelectedYear(nextYear);
        setCurrentLevel("students");
      }

      // Canonicalize target room (fallback to 1)
      const rawRoom = s.room ?? s.rawOrg?.storage_room ?? 1;
      const targetRoom = Number.isFinite(Number(rawRoom)) ? Number(rawRoom) : rawRoom;

      // Canonicalize target cabinet using layout if available
      const rawCab = s.cabinet ?? s.rawOrg?.storage_cabinet;
      const rooms = storageLayout?.rooms || [];
      const roomDef = rooms.find((r) => String(r.id) === String(targetRoom));
      const matchedCab = findMatchingCabinet(roomDef?.cabinets, rawCab);
      const targetCab = matchedCab?.id || rawCab || (isOsas ? "ACADEMIC ORGANIZATIONS" : "A");

      if (locateTimeoutRef.current) {
        clearTimeout(locateTimeoutRef.current);
        locateTimeoutRef.current = null;
      }

      setActiveStudent({
        ...s,
        room: targetRoom,
        cabinet: targetCab,
      });
      setSelectedRoom(targetRoom);
      setSelectedCabinet(targetCab);
      setCurrentLocatorLevel("drawers");
      switchView("storage");
    },
    [switchView, authUser?.office_id, storageLayout],
  );

  const handleUnfocusStudent = useCallback(() => {
    setActiveStudent(null);
    if (locateTimeoutRef.current) {
      clearTimeout(locateTimeoutRef.current);
      locateTimeoutRef.current = null;
    }
  }, []);

  const handlePreviewDocument = useCallback(
    (docType, name, no, id, customUrl) => {
      let fileUrl = customUrl || null;
      const strId = String(id || "");
      if (!fileUrl) {
        if (strId.startsWith("cbl-")) {
          const orgId = strId.replace(/^cbl-/, "");
          fileUrl = `/api/osas/organizations/${encodeURIComponent(orgId)}/bylaws?file=1`;
        } else if (strId.startsWith("event-proposal-")) {
          const propId = strId.replace(/^event-proposal-/, "");
          fileUrl = `/api/osas/event-proposals/${encodeURIComponent(propId)}?file=1`;
        } else if (docType === "Constitution and By-Laws" || docType === "Constitution & By-Laws (CBL)") {
          const org = organizations.find((o) => o.id === no || o.acronym === no || o.name === name);
          if (org) {
            fileUrl = `/api/osas/organizations/${encodeURIComponent(org.id)}/bylaws?file=1`;
          }
        } else if (id) {
          const matchedDoc = allDocs.find((d) => String(d.id) === strId);
          if (matchedDoc?.file_url) {
            fileUrl = matchedDoc.file_url;
          }
        }
      }

      const matchedDoc = id ? allDocs.find((d) => String(d.id) === strId) : null;

      setPreview({
        docType,
        studentName: name,
        studentNo: no,
        docId: id,
        originalFilename: matchedDoc?.original_filename || null,
        mimeType: matchedDoc?.mime_type || null,
        sourceType: matchedDoc?.source_type || null,
        fileUrl,
        url: fileUrl,
        refId: `DOC-${Date.now()}`,
      });
      setPreviewOpen(true);
    },
    [organizations, allDocs],
  );

  const goToStorageMapFromRequest = useCallback(
    (studentRow) => {
      locateStudent(studentRow);
    },
    [locateStudent],
  );

  useEffect(() => {
    const handleLocate = (e) => {
      const { student } = e.detail;
      if (student) {
        locateStudent(student);
      }
    };
    window.addEventListener("locate-student", handleLocate);
    return () => window.removeEventListener("locate-student", handleLocate);
  }, [locateStudent]);

  useEffect(() => {
    const handleSwitch = (e) => {
      const { view: targetView } = e.detail;
      if (targetView) {
        switchView(targetView);
      }
    };
    window.addEventListener("switch-view", handleSwitch);
    return () => window.removeEventListener("switch-view", handleSwitch);
  }, [switchView]);

  useEffect(() => {
    const locateNo = searchParams?.get("locate");
    if (locateNo && students.length > 0 && processedLocateRef.current !== locateNo) {
      processedLocateRef.current = locateNo;
      const match = students.find(s => s.studentNo === locateNo) || archivedStudents.find(s => s.studentNo === locateNo);
      if (match) {
        // Clear parameter from URL
        const params = new URLSearchParams(window.location.search);
        params.delete("locate");
        router.replace(`${window.location.pathname}?${params.toString()}`, { scroll: false });
        
        locateStudent(match);
      }
    }
  }, [searchParams, students, archivedStudents, locateStudent, router]);

  const applyStudentNoMask = (val) => {
    let clean = val.replace(/[^0-9A-Z]/g, "").toUpperCase();
    let res = "";
    let invalid = false;
    for (let i = 0; i < clean.length; i++) {
      if (i < 4) {
        if (!/[0-9]/.test(clean[i])) invalid = true;
        res += clean[i];
        if (i === 3) res += "-";
      } else if (i < 9) {
        if (!/[0-9]/.test(clean[i])) invalid = true;
        res += clean[i];
        if (i === 8) res += "-";
      } else if (i < 11) {
        if (!/[A-Z]/.test(clean[i])) invalid = true;
        res += clean[i];
        if (i === 10) res += "-";
      } else if (i === 11) {
        if (!/[0-9]/.test(clean[i])) invalid = true;
        res += clean[i];
      }
    }
    return { value: res, invalid };
  };

  const clearUploadFieldError = useCallback((key) => {
    setUploadFieldErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  const clearAllUploadFieldErrors = useCallback(() => setUploadFieldErrors({}), []);

  const applyStudentToPdfForm = useCallback((student, docTypeFromOcr) => {
    const isOsas = authUser?.office_id === "osas";
    if (isOsas) {
      const orgId = student.id || student.organizationId || student.studentNo || student.student_no || "";
      const orgName = String(student.name || "").trim().toUpperCase();
      const orgAcronym = student.acronym || "";
      const orgCategory = student.category || "Non-Academic";
      const orgCabinet = student.storage_cabinet || student.cabinet || (orgCategory === "Academic" ? "ACADEMIC ORGANIZATIONS" : "NON-ACADEMIC ORGANIZATIONS");
      const orgDrawer = String(student.storage_drawer ?? student.drawer ?? "1");
      const orgRoom = String(student.storage_room ?? student.room ?? "1");
      const adviser = student.adviser_name || student.adviserName || "";
      const adviserEmail = student.adviser_email || student.adviserEmail || "";

      setNewRec((p) => ({
        ...p,
        organizationId: orgId,
        studentNo: orgId,
        name: orgName,
        acronym: orgAcronym,
        category: orgCategory,
        adviserName: adviser,
        adviserEmail: adviserEmail,
        room: orgRoom,
        cabinet: orgCabinet,
        drawer: orgDrawer,
        docType:
          docTypeFromOcr != null && String(docTypeFromOcr).trim() !== ""
            ? String(docTypeFromOcr).trim()
            : p.docType,
      }));
      return;
    }

    const s = normalizeStudentRow(student);
    const derivedYear = getStudentNoYear(s.studentNo);
    const yearStr =
      derivedYear != null
        ? String(derivedYear)
        : String(s.yearLevel ?? "").trim();
    const sec = String(s.section ?? "").trim();
    let sectionPart = sec;
    setNewRec((p) => ({
      ...p,
      studentNo: s.studentNo ?? "",
      name: String(s.name ?? "")
        .trim()
        .replace(/\s+/g, " ")
        .toUpperCase(),
      course: s.courseCode ?? "",
      year: yearStr,
      sectionPart,
      room: String(s.room ?? ""),
      cabinet: s.cabinet ?? "",
      drawer: String(s.drawer ?? ""),
      docType:
        docTypeFromOcr != null && String(docTypeFromOcr).trim() !== ""
          ? String(docTypeFromOcr).trim()
          : p.docType,
    }));
  }, [authUser?.office_id]);

  const handleFileSelect = async (filesOrFile, skipOcr = false, rotationParam, skipQueue = false) => {
    if (!filesOrFile) return;

    let incomingFiles = [];
    if (filesOrFile instanceof FileList || Array.isArray(filesOrFile)) {
      incomingFiles = Array.from(filesOrFile);
    } else {
      incomingFiles = [filesOrFile];
    }

    if (incomingFiles.length === 0) return;

    const oversized = incomingFiles.filter((f) => {
      const isImg = String(f.type || "").startsWith("image/");
      const limit = isImg ? DOCUMENT_PAGE_MAX_SIZE_BYTES : DOCUMENT_MAX_SIZE_BYTES;
      return f.size > limit;
    });
    if (oversized.length > 0) {
      const details = oversized.map((f) => {
        const isImg = String(f.type || "").startsWith("image/");
        const label = isImg ? DOCUMENT_PAGE_MAX_SIZE_LABEL : DOCUMENT_MAX_SIZE_LABEL;
        return `${f.name || "File"} (${formatBytes(f.size)} > ${label})`;
      }).join(", ");
      showToast({
        title: "File Too Large",
        description: `File size exceeds the permitted limit: ${details}`,
      }, true);
      incomingFiles = incomingFiles.filter((f) => !oversized.includes(f));
      if (incomingFiles.length === 0) return;
    }

    if (!skipQueue) {
      let newFiles = [];
      setUploadedFiles((prev) => {
        newFiles = [...prev, ...incomingFiles];
        setSelectedQueuedFileIndex(newFiles.length - incomingFiles.length);
        return newFiles;
      });
    }

    const activeFile = incomingFiles[0];
    const ocrRequestId = ocrRequestGuardRef.current.begin(activeFile);
    if (!skipQueue || ocrContextFileRef.current !== activeFile) {
      ocrContextRef.current = null;
      ocrContextFileRef.current = activeFile;
    }
    setUploadedFile(activeFile);
    clearUploadFieldError("pdfFile");
    setOcrError("");
    setOcrSuggestion(null);

    if (!skipOcr) {
      // In merge mode (multiple pages), only run OCR autofill for the very first page.
      // We capture the queue length *before* the new file was enqueued (skipQueue path
      // bypasses the setUploadedFiles call, so we can rely on the pre-call snapshot).
      const wasQueueEmpty = uploadedFiles.length === 0;
      const isLeadPage = wasQueueEmpty || skipQueue;

      if (!isLeadPage) {
        console.log("[OCR] Skipping OCR autofill: not the lead page (page 2+).");
        setOcrLoading(false);
        return;
      }

      setOcrLoading(true);
      try {
        const isOsas = authUser?.office_id === "osas";
        const { scanFileForSuggestion } = await import("@/lib/ocrClient");
        const suggestion = await scanFileForSuggestion({
          file: activeFile,
          docTypes,
          rotation: rotationParam !== undefined ? rotationParam : rotation,
          matchStudents: !isOsas,
          ocrContext: rotationParam !== undefined && ocrContextFileRef.current === activeFile
            ? ocrContextRef.current
            : null,
        });
        if (!ocrRequestGuardRef.current.isCurrent(ocrRequestId, activeFile)) return;
        ocrContextRef.current = suggestion.ocrContext;
        ocrContextFileRef.current = activeFile;
        delete suggestion.ocrContext;
        lastRotationOcrRef.current =
          rotationParam !== undefined ? rotationParam : rotation;
        setOcrSuggestion(suggestion);

        console.log("[OCR handleFileSelect] extracted fields:", {
          name: suggestion.name,
          docType: suggestion.docType,
          docTypesAvailable: docTypes,
        });
        const keepExistingIdentity = Boolean(
          rescanContext || isReplaceMode || uploadStudentIsExisting
        );
        setNewRec((p) => ({
          ...p,
          name: keepExistingIdentity || students.some((student) =>
            String(student.studentNo || student.student_no || "").trim().toUpperCase() ===
            String(p.studentNo || "").trim().toUpperCase()
          )
            ? p.name
            : String(suggestion.name || p.name || "")
                .trim()
                .replace(/\s+/g, " ")
                .toUpperCase(),
          room: p.room || (isOsas ? "1" : ""),
          cabinet: p.cabinet || "",
          drawer: p.drawer || (isOsas ? "1" : ""),
          docType: rescanContext?.docType
            ? rescanContext.docType
            : keepExistingIdentity && p.docType
              ? p.docType
              : suggestion.docType != null && String(suggestion.docType).trim() !== ""
                ? String(suggestion.docType).trim()
                : p.docType,
        }));
        if (!keepExistingIdentity) {
          setUploadStudentIsExisting(false);
        }
        clearAllUploadFieldErrors();
      } catch (err) {
        if (!ocrRequestGuardRef.current.isCurrent(ocrRequestId, activeFile)) return;
        setOcrLoading(false);
        const message =
          err?.message || "Automatic detection failed. Please fill manually.";
        showToast(
          formatErrorMessage(err, {
            title: "OCR Detection Incomplete",
            description: "Could not automatically extract document metadata. Please enter details manually.",
          }),
          true
        );
      } finally {
        if (ocrRequestGuardRef.current.isCurrent(ocrRequestId, activeFile)) {
          setOcrLoading(false);
        }
      }
    }
  };

  const handleRemoveQueuedFile = (indexToRemove) => {
    setUploadedFiles((prev) => {
      const next = prev.filter((_, idx) => idx !== indexToRemove);
      const nextIndex = next.length === 0 ? 0 : Math.min(selectedQueuedFileIndex, next.length - 1);
      const nextFile = next[nextIndex] || null;
      ocrRequestGuardRef.current.invalidate(nextFile);
      setOcrSuggestion(null);
      setOcrLoading(false);
      if (next.length === 0) {
        setUploadedFile(null);
        setSelectedQueuedFileIndex(0);
      } else {
        setSelectedQueuedFileIndex(nextIndex);
        setUploadedFile(next[nextIndex]);
      }
      return next;
    });
  };

  const handleReorderQueuedFiles = (index, direction) => {
    setUploadedFiles((prev) => {
      const next = [...prev];
      const targetIndex = index + direction;
      if (targetIndex < 0 || targetIndex >= next.length) return prev;
      // Swap
      const temp = next[index];
      next[index] = next[targetIndex];
      next[targetIndex] = temp;
      
      // Keep selection aligned
      if (selectedQueuedFileIndex === index) {
        setSelectedQueuedFileIndex(targetIndex);
      } else if (selectedQueuedFileIndex === targetIndex) {
        setSelectedQueuedFileIndex(index);
      }
      
      return next;
    });
  };

  const lastRotationOcrRef = useRef(0);

  useEffect(() => {
    if (!uploadedFile) {
      lastRotationOcrRef.current = 0;
      return;
    }
    // If rotation hasn't changed since last OCR, skip
    if (rotation === lastRotationOcrRef.current) return;

    const timer = setTimeout(() => {
      handleFileSelect(uploadedFile, false, rotation, true);
      lastRotationOcrRef.current = rotation;
    }, 1000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rotation, uploadedFile]);

  useEffect(() => {
    if (!authUser) return
    const enabled = new Set(authUser.enabled_modules || [])
    const MODULE_KEY_MAP = {
      requests: "document_requests",
      osas_monitoring: "osas_monitoring",
      students: "student_directory",
      upload: "scan_upload",
      batch_review: "scan_upload",
      documents: "documents",
      notifications: "notifications",
      search: "records_archive",
      storage: "storage_explorer",
    }
    const requiredModule = MODULE_KEY_MAP[view]
    const isAllowed = !requiredModule || enabled.has(requiredModule)
    if (!isAllowed) {
      const firstEnabled = sidebarItems.find(item => item.key)
      if (firstEnabled) {
        switchView(firstEnabled.key)
      }
    }
  }, [authUser, view, sidebarItems, switchView])

  const checkDuplicate = useCallback((targetId, docType) => {
    if (!targetId || !docType) return;
    if (isReplaceMode || rescanContext) return;
    const cleanId = String(targetId).trim().toUpperCase();
    const cleanType = String(docType).trim().toUpperCase();

    const existing = staffDocs.find(
      (d) =>
        (String(d.student_no || "").trim().toUpperCase() === cleanId ||
         String(d.organization_id || "").trim().toUpperCase() === cleanId) &&
        String(d.doc_type || "").trim().toUpperCase() === cleanType &&
        String(d.approval_status).toLowerCase() !== "declined"
    );

    if (existing) {
      setDuplicateTargetDoc(existing);
      setDuplicateConfirmOpen(true);
    }
  }, [staffDocs, isReplaceMode, rescanContext]);

  const processSubmission = async ({ onSuccess } = {}) => {
    if (!uploadedFile) {
      setUploadFieldErrors({ pdfFile: true });
      showToast({ title: "No File Selected", description: "Attach a document before submitting." }, true);
      return;
    }

    const isOsas = authUser?.office_id === "osas";

    // Validation first to ensure we have meaningful metadata for renaming
    const err = {};
    if (isOsas) {
      if (uploadStudentIsExisting) {
        if (!String(newRec.organizationId || newRec.name || "").trim()) {
          err.organization = true;
        }
        if (!newRec.docType) err.docType = true;
      } else {
        if (!String(newRec.name || "").trim()) err.name = true;
        if (!newRec.category) err.category = true;
        if (!newRec.room) err.room = true;
        if (!newRec.cabinet) err.cabinet = true;
        if (!newRec.drawer) err.drawer = true;
        if (!newRec.docType) err.docType = true;
      }
    } else {
      if (uploadStudentIsExisting) {
        if (!String(newRec.studentNo || "").trim()) err.studentNo = true;
        if (!newRec.docType) err.docType = true;
      } else {
        if (!String(newRec.studentNo || "").trim()) err.studentNo = true;
        if (!String(newRec.name || "").trim()) err.name = true;
        if (!newRec.course) err.course = true;
        if (!newRec.year) err.year = true;
        if (!newRec.sectionPart) err.sectionPart = true;
        if (!newRec.room) err.room = true;
        if (!newRec.cabinet) err.cabinet = true;
        if (!newRec.drawer) err.drawer = true;
        if (!newRec.docType) err.docType = true;
      }
    }

    if (Object.keys(err).length) {
      setUploadFieldErrors(err);
      if (isOsas) {
        showToast({
          title: uploadStudentIsExisting ? "Missing Fields" : "Incomplete Form",
          description: uploadStudentIsExisting
            ? "Select an organization and choose a document type."
            : "Organization name, category, storage location, and document type are required.",
        }, true);
      } else {
        showToast({ 
          title: uploadStudentIsExisting ? "Missing Fields" : "Incomplete Form", 
          description: uploadStudentIsExisting ? "Provide the student number and document type." : "All student detail fields are required." 
        }, true);
      }
      return;
    }
    setUploadFieldErrors({});

    // Convert image files to PDF before uploading (API only accepts PDFs)
    const { imageToPdf, needsConversion, mergeImagesToPdf } = await import("@/lib/imageToPdf");
    let fileToUpload = uploadedFile;
    if (uploadedFiles.length > 1) {
      const allImages = uploadedFiles.every(f => needsConversion(f));
      if (allImages) {
        try {
          fileToUpload = await mergeImagesToPdf(uploadedFiles);
        } catch (convErr) {
          showToast(
            formatErrorMessage(convErr, {
              title: "Image Merge Failed",
              description: "Could not combine images into a single PDF document. Please check file formats.",
            }),
            true
          );
          return;
        }
      } else {
        showToast(
          {
            title: "Multi-page Merge Warning",
            description: "Merging requires all selected files to be images. Proceeding with primary document.",
          },
          "warning"
        );
        if (needsConversion(uploadedFile)) {
          try {
            fileToUpload = await imageToPdf(uploadedFile);
          } catch (convErr) {
            showToast(
              formatErrorMessage(convErr, {
                title: "Conversion Failed",
                description: "Could not convert image to PDF. Please try uploading a PDF directly.",
              }),
              true
            );
            return;
          }
        }
      }
    } else if (needsConversion(uploadedFile)) {
      try {
        fileToUpload = await imageToPdf(uploadedFile);
      } catch (convErr) {
        showToast(
          formatErrorMessage(convErr, {
            title: "Conversion Failed",
            description: "Could not convert image to PDF. Please try uploading a PDF directly.",
          }),
          true
        );
        return;
      }
    }

    const studentName = String(newRec.name || "").trim().toUpperCase();
    let uploadFilename = String(uploadedFile.name || "document.pdf");

    // RENAME FILE for meaningful identification
    try {
      if (isOsas) {
        const orgKey = String(newRec.acronym || newRec.organizationId || newRec.name || "").trim().toUpperCase();
        const docType = String(newRec.docType || "").trim();
        const cleanOrg = orgKey.replace(/[^a-zA-Z0-9-]/g, "_") || "ORG";
        const cleanDocType = docType.replace(/[^a-zA-Z0-9-]/g, "_") || "DOC";
        uploadFilename = `${cleanOrg}_${cleanDocType}.pdf`;
      } else {
        const studentNo = String(newRec.studentNo || "").trim().toUpperCase();
        const docType = String(newRec.docType || "").trim();
        const cleanStudentNo = studentNo.replace(/[^a-zA-Z0-9-]/g, "_") || "UNKNOWN";
        const cleanDocType = docType.replace(/[^a-zA-Z0-9-]/g, "_") || "DOC";
        uploadFilename = `${cleanStudentNo}_${cleanDocType}.pdf`;
      }
    } catch (e) {
      console.error("[Rename Error]", e);
    }

    if (fileToUpload && fileToUpload.size > DOCUMENT_MAX_SIZE_BYTES) {
      showToast({
        title: "Document Exceeds Size Limit",
        description: `The prepared document (${formatBytes(fileToUpload.size)}) exceeds the ${DOCUMENT_MAX_SIZE_LABEL} limit. Please compress or optimize the document before uploading.`,
      }, true);
      return;
    }

    const payload = new FormData();
    payload.append("file", fileToUpload, uploadFilename);
    if (isReplaceMode || rescanContext) {
      payload.append("allowOverwrite", "true");
      payload.append("replaceExisting", "true");
      if (rescanContext?.docId) {
        payload.append("replaceDocumentId", String(rescanContext.docId));
      }
    }

    if (isOsas) {
      payload.append("docType", newRec.docType);
      if (uploadStudentIsExisting) {
        payload.append("organizationId", String(newRec.organizationId || "").trim());
        payload.append("organizationName", String(newRec.name || "").trim());
        if (newRec.acronym) payload.append("acronym", String(newRec.acronym).trim());
        if (newRec.room) payload.append("room", String(newRec.room));
        if (newRec.cabinet) payload.append("cabinet", String(newRec.cabinet));
        if (newRec.drawer) payload.append("drawer", String(newRec.drawer));
      } else {
        payload.append("isNewOrganization", "true");
        payload.append("organizationName", String(newRec.name || "").trim());
        if (newRec.acronym) payload.append("acronym", String(newRec.acronym).trim());
        if (newRec.category) payload.append("category", String(newRec.category).trim());
        if (newRec.adviserName) payload.append("adviserName", String(newRec.adviserName).trim());
        if (newRec.adviserEmail) payload.append("adviserEmail", String(newRec.adviserEmail).trim());
        payload.append("room", String(newRec.room || 1));
        payload.append("cabinet", String(newRec.cabinet || ""));
        payload.append("drawer", String(newRec.drawer || "1"));
      }
    } else {
      if (uploadStudentIsExisting) {
        payload.append("studentNo", String(newRec.studentNo).trim());
        payload.append("studentName", studentName);
        payload.append("docType", newRec.docType);
      } else {
        payload.append("studentNo", newRec.studentNo);
        payload.append("studentName", studentName);
        payload.append("courseCode", newRec.course);
        payload.append("yearLevel", newRec.year);
        payload.append("section", String(newRec.sectionPart || "").trim());
        payload.append("room", newRec.room);
        payload.append("cabinet", newRec.cabinet);
        payload.append("drawer", newRec.drawer);
        payload.append("docType", newRec.docType);
        payload.append("isNewStudent", "true");
      }
    }

    try {
      const res = await fetch("/api/documents", {
        method: "POST",
        body: payload,
      });
      const data = await res.json();
      if (!res.ok) {
        const uploadError = new Error(data.error || "Upload failed");
        uploadError.status = res.status;
        if (res.status === 409 || data.isDuplicate) {
          uploadError.title = "Document Already on File";
          if (data.isDuplicate) {
            setDuplicateTargetDoc({
              id: data.duplicateId || null,
              doc_type: newRec.docType,
              approval_status: data.existingStatus || "On File",
            });
            setDuplicateConfirmOpen(true);
          }
        }
        throw uploadError;
      }

      let locationUpdateFailed = false;
      if (!isOsas && uploadStudentIsExisting) {
        const sn = String(newRec.studentNo || "").trim();
        const room = parseInt(String(newRec.room || ""), 10);
        const drawer = parseInt(String(newRec.drawer || ""), 10);
        const cabinet = String(newRec.cabinet || "").trim();
        if (sn && Number.isFinite(room) && cabinet && Number.isFinite(drawer)) {
          const patchRes = await fetch(
            `/api/students/${encodeURIComponent(sn)}`,
            {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ room, cabinet, drawer }),
            },
          );
          if (!patchRes.ok) locationUpdateFailed = true;
        }
      }

      if (locationUpdateFailed) {
        showToast(
          { title: "Partial Upload", description: "Document saved, but storage location was not updated." },
          true,
        );
      } else if (isReplaceMode || rescanContext) {
        showToast({
          title: "Document Replaced",
          description: `The digital copy of ${newRec.docType} has been replaced and submitted for review.`,
        });
      } else {
        showToast({ title: "Upload Complete", description: "Document has been submitted for review." });
      }
      const ingestedIds = [];
      if (uploadedFiles && uploadedFiles.length > 0) {
        uploadedFiles.forEach(f => {
          if (f.ingestId) ingestedIds.push(f.ingestId);
        });
      } else if (uploadedFile && uploadedFile.ingestId) {
        ingestedIds.push(uploadedFile.ingestId);
      }

      setUploadedFile(null);
      ocrRequestGuardRef.current.invalidate(null);
      setOcrLoading(false);
      setOcrSuggestion(null);
      setUploadedFiles([]);
      setSelectedQueuedFileIndex(0);
      setUploadFieldErrors({});
      setUploadStudentIsExisting(false);
      setRescanContext(null);
      setIsReplaceMode(false);
      setDuplicateTargetDoc(null);
      setNewRec({
        studentNo: "",
        name: "",
        course: "",
        year: "",
        sectionPart: "",
        room: "",
        cabinet: "",
        drawer: "",
        docType: "",
        organizationId: "",
        acronym: "",
        category: "",
        adviserName: "",
        adviserEmail: "",
      });
      fetchData();
      fetchAllDocs();
      if (typeof onSuccess === "function") {
        onSuccess(ingestedIds);
      }
    } catch (err) {
      showToast(
        formatErrorMessage(err, {
          title: err?.title || "Upload Failed",
          description: "Unable to process document submission. Please retry.",
        }),
        true
      );
    }
  };

  const handleRescan = useCallback(async (targetId, docType, docId, filename, mimeType) => {
    const isOsas = authUser?.office_id === "osas";
    const cleanDocType = String(docType || "").trim().toUpperCase();
    const matchedDoc = docId
      ? allDocs.find((d) => String(d.id) === String(docId)) || null
      : allDocs.find(
          (d) =>
            (String(d.student_no || "").trim().toUpperCase() === String(targetId || "").trim().toUpperCase() ||
             String(d.organization_id || "").trim().toUpperCase() === String(targetId || "").trim().toUpperCase()) &&
            String(d.doc_type || "").trim().toUpperCase() === cleanDocType &&
            String(d.approval_status || "").toLowerCase() !== "declined"
        ) || null;
    const resolvedTargetId = targetId || matchedDoc?.student_no || matchedDoc?.organization_id || "";
    const cleanTargetId = String(resolvedTargetId).trim().toUpperCase();
    const isReplacement = Boolean(docId || matchedDoc);

    if (isReplacement) {
      setRescanContext({
        targetId: resolvedTargetId,
        docType: docType || matchedDoc?.doc_type || "",
        docId: docId || matchedDoc?.id || null,
        filename: filename || matchedDoc?.original_filename || null,
        mimeType: mimeType || matchedDoc?.mime_type || null,
        originalStatus: matchedDoc?.approval_status || (docId ? "Declined" : "On File"),
      });
      setIsReplaceMode(true);
    } else {
      setRescanContext(null);
      setIsReplaceMode(false);
    }

    if (isOsas) {
      const allOrgsPool = [...organizations, ...archivedOrganizations];
      let org = allOrgsPool.find(
        (x) =>
          String(x.id || "").trim().toLowerCase() === String(resolvedTargetId || "").trim().toLowerCase() ||
          String(x.name || "").trim().toLowerCase() === String(resolvedTargetId || "").trim().toLowerCase() ||
          String(x.acronym || "").trim().toLowerCase() === String(resolvedTargetId || "").trim().toLowerCase()
      );
      if (!org && resolvedTargetId) {
        try {
          const response = await fetch(`/api/osas/organizations/${encodeURIComponent(resolvedTargetId)}`, { cache: "no-store" });
          const result = await response.json();
          if (response.ok && result?.ok) org = result.data;
        } catch {
          // The upload form can still use the document's organization details.
        }
      }
      if (org) {
        applyStudentToPdfForm(org, docType || matchedDoc?.doc_type);
        setUploadStudentIsExisting(true);
      } else {
        setNewRec((p) => ({
          ...p,
          organizationId: resolvedTargetId || "",
          name: matchedDoc?.organization_name || matchedDoc?.student_name || resolvedTargetId || "",
          docType: docType || matchedDoc?.doc_type || "",
        }));
        setUploadStudentIsExisting(Boolean(resolvedTargetId));
      }
    } else {
      const allStudentsPool = [...students, ...archivedStudents];
      const s = allStudentsPool.find(
        (x) => String(x.studentNo || x.student_no || "").trim().toUpperCase() === cleanTargetId
      );
      if (s) {
        applyStudentToPdfForm(s, docType || matchedDoc?.doc_type);
        setUploadStudentIsExisting(true);
      } else {
        setNewRec((p) => ({
          ...p,
          studentNo: resolvedTargetId || "",
          name: matchedDoc?.student_name || p.name || "",
          docType: docType || matchedDoc?.doc_type || "",
        }));
        setUploadStudentIsExisting(Boolean(resolvedTargetId));
      }
    }
    clearAllUploadFieldErrors();
    // Clear previous uploads so the dropzone is ready for the new scan/replacement file
    setUploadedFile(null);
    ocrRequestGuardRef.current.invalidate(null);
    setOcrLoading(false);
    setOcrSuggestion(null);
    setUploadedFiles([]);
    setSelectedQueuedFileIndex(0);
    setRotation(0);
    setView("upload");
  }, [students, archivedStudents, organizations, archivedOrganizations, allDocs, authUser?.office_id, applyStudentToPdfForm, clearAllUploadFieldErrors]);

  const confirmBulkArchive = async () => {
    if (bulkArchiveLoading) return;
    setBulkArchiveLoading(true);

    try {
      let successCount = 0;
      let failCount = 0;
      const idsToArchive = Array.from(selectedStudentIds);
      const isOsas = authUser?.office_id === "osas";

      for (const id of idsToArchive) {
        const url = isOsas
          ? `/api/osas/organizations/${encodeURIComponent(id)}`
          : `/api/students/${encodeURIComponent(id)}`;
        const res = await fetch(url, {
          method: "DELETE",
        });
        const json = await res.json().catch(() => null);

        if (res.ok && json?.ok) {
          successCount++;
        } else {
          failCount++;
        }
      }

      showToast({
        title: "Bulk Archival Complete",
        description: `Successfully moved ${successCount} ${isOsas ? "organization(s)" : "student record(s)"} to the archive. ${failCount > 0 ? `${failCount} records could not be archived.` : ""}`,
      });
      setBulkArchiveOpen(false);
      setSelectedStudentIds(new Set());
      fetchData();
      setArchiveRefreshVersion((version) => version + 1);
    } catch (err) {
      showToast(
        formatErrorMessage(err, {
          title: "Bulk Archival Failed",
          description: "Failed to process bulk archival. Please verify records and retry.",
        }),
        true
      );
    } finally {
      setBulkArchiveLoading(false);
    }
  };

  const confirmBulkRestore = async () => {
    if (bulkRestoreLoading) return;
    setBulkRestoreLoading(true);

    try {
      let successCount = 0;
      let failCount = 0;
      const idsToRestore = Array.from(selectedStudentIds);
      const isOsas = authUser?.office_id === "osas";

      for (const id of idsToRestore) {
        const url = isOsas
          ? `/api/osas/organizations/${encodeURIComponent(id)}`
          : `/api/students/${encodeURIComponent(id)}`;
        const res = await fetch(url, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "Active" }),
        });
        const json = await res.json().catch(() => null);

        if (res.ok && json?.ok) {
          successCount++;
        } else {
          failCount++;
        }
      }

      showToast({
        title: "Bulk Restoration Complete",
        description: `Successfully restored ${successCount} ${isOsas ? "organization(s)" : "student record(s)"} to active status. ${failCount > 0 ? `${failCount} records could not be restored.` : ""}`,
      });
      setBulkRestoreOpen(false);
      setSelectedStudentIds(new Set());
      fetchData();
      setArchiveRefreshVersion((version) => version + 1);
    } catch (err) {
      showToast(
        formatErrorMessage(err, {
          title: "Bulk Restoration Failed",
          description: "Failed to process bulk restoration. Please verify records and retry.",
        }),
        true
      );
    } finally {
      setBulkRestoreLoading(false);
    }
  };



  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    const handleToggle = () => setSidebarOpen((prev) => !prev);
    window.addEventListener("toggle-sidebar", handleToggle);
    return () => window.removeEventListener("toggle-sidebar", handleToggle);
  }, []);


  if (loading) {
    return <StaffDashboardLoadingSkeleton view={view} />;
  }

  return (
    <div className="h-screen overflow-hidden flex flex-col bg-slate-50/30 dark:bg-zinc-950/30 font-jakarta relative transition-colors duration-300" style={{ "--brand-accent": brandAccent, "--brand-foreground": brandForeground }}>
      {/* Dynamic Liquid Glass Background Blobs */}
      <div className="liquid-container">
        <div className="liquid-blob liquid-blob-1"></div>
        <div className="liquid-blob liquid-blob-2"></div>
        <div className="liquid-blob liquid-blob-3"></div>
      </div>


      <div
        className={cn(
          "flex-1 h-full w-full gap-0 relative flex min-h-0 overflow-hidden",
          authUser?.preferences?.navigation_layout === "topbar" ? "flex-col" : "flex-col md:flex-row"
        )}
        style={zoomStyle}
      >
        {authUser?.preferences?.navigation_layout === "topbar" ? (
          <div className="w-full bg-white dark:bg-zinc-900 border-b border-border dark:border-border py-2.5 px-4 flex items-center justify-center gap-2 overflow-x-auto shadow-xs select-none shrink-0 scrollbar-none">
            {sidebarItems.map((item, idx) => {
              if (item.type === "header") {
                return (
                  <div key={`header-${idx}`} className="text-[9px] font-semibold tracking-widest text-gray-400 dark:text-zinc-500 whitespace-nowrap ml-4 first:ml-0 border-l border-border dark:border-border pl-4 first:border-0 first:pl-0">
                    {item.label}
                  </div>
                );
              }
              const active = view === item.key;
              return (
                <button
                  key={item.key}
                  onClick={() => switchView(item.key)}
                  className={cn(
                    "px-3 py-1.5 text-xs font-semibold rounded-xl flex items-center gap-2 transition-colors duration-300 whitespace-nowrap outline-none focus-visible:ring-2 focus-visible:ring-pup-maroon/20 cursor-pointer shrink-0",
                    active
                      ? "shadow-xs"
                      : "text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-zinc-400 dark:hover:bg-white/5 dark:hover:text-zinc-50"
                  )}
                  style={active ? { 
                    backgroundColor: "color-mix(in srgb, var(--brand-accent) 15%, transparent)",
                    color: "var(--brand-accent)"
                  } : undefined}
                >
                  <AppIcon  className={cn(item.iconClass, "text-sm")}></AppIcon>
                  {item.label}
                  {item.badge > 0 && (
                    <span 
                      className={cn("min-w-6 tabular-nums", BADGE_BASE)}
                      style={{ backgroundColor: "var(--brand-accent)", color: "var(--brand-foreground)" }}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ) : (
          <Sidebar 
            open={sidebarOpen}
            items={sidebarItems} 
            activeKey={view} 
            onSelect={switchView} 
            onLogout={handleLogout} 
            zoomNode={zoomNode}
            setZoomNode={setZoomNode}
            handleZoomMouseDown={handleZoomMouseDown}
            accentColor={roleBranding.color || "#ffcb00"}
            officeName={authUser?.office_name}
            authUser={authUser}
          />
        )}
        <main className={cn("flex-1 relative w-full min-w-0 min-h-0 bg-slate-50/50 dark:bg-zinc-950/50 flex flex-col", view === "batch_review" ? "overflow-hidden" : "overflow-y-auto")}>
          <div 
            className={cn(
              "p-2 flex flex-col w-full",
              authUser?.preferences?.navigation_layout !== "topbar" && "md:pl-1",
              view === "batch_review" ? "flex-1 h-full min-h-0 [&>*]:flex-1" : "flex-[1_0_auto] min-h-full min-w-0 [&>*]:flex-[1_0_auto]"
            )}
          >
            <ContentSwap id={view} className={cn("w-full min-w-0 flex flex-col", view === "batch_review" ? "h-full flex-1" : "flex-[1_0_auto] [&>*]:flex-[1_0_auto]")}>
            {view === "students" && (
            <StudentDirectoryTab
              authUser={authUser}
              loading={!storageLayout || loading}
              courses={courses}
              sections={sections}
              storageLayout={storageLayout}
              onLocateStudent={locateStudent}
              onPreviewDocument={handlePreviewDocument}
              onRescan={handleRescan}
              fetchData={fetchData}
              showToast={showToast}
            />
          )}

          {view === "search" && (
            <RecordsArchiveTab
              loading={!storageLayout}
              refreshVersion={archiveRefreshVersion}
              onSelectYear={(year) => { setSelectedYear(year); setCurrentLevel("students"); }}
              quickQuery={quickQuery}
              setQuickQuery={setQuickQuery}
              onSelectCategory={(category) => { setSelectedCategory(category); setCurrentLevel("organizations"); }}
              onLocateStudent={locateStudent}
              breadcrumbs={breadcrumbs}
              currentLevel={currentLevel}
              onBreadcrumbClick={(b) => {
                if (b.level === "years" || b.level === "categories") {
                  setCurrentLevel(authUser?.office_id === "osas" ? "categories" : "years");
                  setSelectedYear(null);
                  setSelectedCategory(null);
                  setActiveStudent(null);
                  setCurrentLocatorLevel("rooms");
                } else if (b.level === "students" || b.level === "organizations") {
                  setCurrentLevel(authUser?.office_id === "osas" ? "organizations" : "students");
                }
              }}
              officeLabel={authUser?.office_id === "osas" ? "OSAS" : "Registrar"}
              onSwitchView={setView}
              onPreviewDocument={handlePreviewDocument}
              onRestoreStudent={async (targetId) => {
                try {
                  const isOsas = authUser?.office_id === "osas";
                  const url = isOsas
                    ? `/api/osas/organizations/${encodeURIComponent(targetId)}`
                    : `/api/students/${encodeURIComponent(targetId)}`;
                  const res = await fetch(url, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ status: "Active" }),
                  });
                  const json = await res.json().catch(() => null);
                  if (!res.ok || !json?.ok) {
                    throw new Error(json?.error || `Failed to restore ${isOsas ? "organization" : "student"} record`);
                  }
                  setSelectedStudentIds((prev) => {
                    if (!prev.has(targetId)) return prev;
                    const next = new Set(prev);
                    next.delete(targetId);
                    return next;
                  });
                  showToast({
                    title: "Record Restored",
                    description: isOsas ? `Organization record is now active.` : `Student ${targetId} is now active.`,
                  });
                  fetchData();
                } catch (err) {
                  showToast(
                    formatErrorMessage(err, {
                      title: "Restore Failed",
                      actionContext: `Restoring ${isOsas ? "organization" : "student"} record ${targetId}`,
                    }),
                    true
                  );
                }
              }}
              selectedIds={selectedStudentIds}
              onSelectionChange={setSelectedStudentIds}
              onBulkArchive={() => setBulkArchiveOpen(true)}
              onBulkRestore={() => setBulkRestoreOpen(true)}
              courses={courses}
              sections={sections}
              storageLayout={storageLayout}
              onStudentUpdated={fetchData}
              showToast={showToast}
              allDocs={allDocs}
              authUser={authUser}
              onRescan={handleRescan}
            />
          )}

          {view === "storage" && (
            <StorageExplorerTab
              loading={!storageLayout}
              locatorModel={locatorModel}
              selectedRoom={selectedRoom}
              setSelectedRoom={setSelectedRoom}
              setSelectedCabinet={setSelectedCabinet}
              setCurrentLocatorLevel={setCurrentLocatorLevel}
              selectedCabinet={selectedCabinet}
              currentLocatorLevel={currentLocatorLevel}
              activeStudent={activeStudent}
              onUnfocusStudent={handleUnfocusStudent}
              onLocateStudent={locateStudent}
              onPreviewDocument={handlePreviewDocument}
              onSwitchView={setView}
              officeLabel={authUser?.office_id === "osas" ? "OSAS" : "Registrar"}
            />
          )}

          {view === "upload" && (
            <ScanUploadTab
              authUser={authUser}
              isOsas={isOsas}
              loading={!storageLayout}
              uploadStudentIsExisting={uploadStudentIsExisting}
              setUploadStudentIsExisting={setUploadStudentIsExisting}
              dropActive={dropActive}
              setDropActive={setDropActive}
              uploadedFile={uploadedFile}
              uploadedFiles={uploadedFiles}
              selectedQueuedFileIndex={selectedQueuedFileIndex}
              setSelectedQueuedFileIndex={setSelectedQueuedFileIndex}
              onRemoveQueuedFile={handleRemoveQueuedFile}
              onReorderQueuedFiles={handleReorderQueuedFiles}
              fileInputRef={fileInputRef}
              onFileSelect={handleFileSelect}
              rotation={rotation}
              setRotation={setRotation}
              onClearFile={() => {
                setUploadedFile(null);
                ocrRequestGuardRef.current.invalidate(null);
                setOcrLoading(false);
                setUploadedFiles([]);
                setSelectedQueuedFileIndex(0);
                setOcrSuggestion(null);
                clearUploadFieldError("pdfFile");
                setRotation(0);
                if (!rescanContext && !isReplaceMode && !uploadStudentIsExisting) {
                  setUploadFieldErrors({});
                  setDuplicateTargetDoc(null);
                }
              }}
              ocrLoading={ocrLoading}
              ocrError={ocrError}
              ocrSuggestion={ocrSuggestion}
              courses={courses}
              docTypes={docTypes}
              processSubmission={processSubmission}
              uploadFieldErrors={uploadFieldErrors}
              clearUploadFieldError={clearUploadFieldError}
              clearAllUploadFieldErrors={clearAllUploadFieldErrors}
              newRec={newRec}
              setNewRec={setNewRec}
              newRecStudentNoHint={newRecStudentNoHint}
              setNewRecStudentNoTouched={setNewRecStudentNoTouched}
              applyStudentNoMask={applyStudentNoMask}
              newStudentNoInputRef={newStudentNoInputRef}
              sysSections={availableSectionsForNewRecord}
              storageLayout={storageLayout}
              students={students}
              organizations={organizations}
              staffDocs={staffDocs}
              rescanContext={rescanContext}
              isReplaceMode={isReplaceMode}
              setIsReplaceMode={setIsReplaceMode}
              onCancelRescan={() => {
                setRescanContext(null);
                setIsReplaceMode(false);
              }}
              checkDuplicate={checkDuplicate}
              showToast={showToast}
              onIngestPromoted={() => {
                fetchAllDocs();
                fetchData();
              }}
              onSelectExistingStudent={(student, ocrDocType) => {
                applyStudentToPdfForm(student, ocrDocType || null);
                setUploadStudentIsExisting(true);
                clearAllUploadFieldErrors();
                checkDuplicate(student.organizationId || student.id || student.studentNo || student.student_no, ocrDocType);
              }}
              onPreviewDocument={handlePreviewDocument}
              onOpenBatchReview={() => switchView("batch_review")}
            />
          )}

          {view === "batch_review" && (
            <div className="w-full h-full min-h-0 flex-1 flex flex-col overflow-hidden m-0 border-0">
              <BatchReviewTab showToast={showToast} students={students} docTypes={docTypes} />
            </div>
          )}

          {view === "requests" && (
            <DocumentRequestsTab
              students={students}
              courses={courses}
              docTypes={requestableDocTypes}
              officeId={authUser?.office_id}
              onLocateOnMap={goToStorageMapFromRequest}
              showToast={showToast}
            />
          )}

          {view === "osas_monitoring" && (
            <OsasMonitoringTab showToast={showToast} />
          )}

          {view === "organizations" && (
            <StudentOrganizationsTab showToast={showToast} />
          )}

          {view === "documents" && (
            <DocumentsTab
              courses={courses}
              staffDocs={staffDocs}
              onPreviewDocument={handlePreviewDocument}
              onRescan={handleRescan}
            />
          )}

          {view === "notifications" && (
            <NotificationsTab
              onUnreadChange={(n) => setNotificationsUnread(Number(n || 0))}
              onPreviewDocument={handlePreviewDocument}
              onRescan={handleRescan}
              onNavigateTab={switchView}
            />
          )}

          {view === "activity" && (
            <MyActivityPanel />
          )}

          {view === "settings" && (
            <AccountSettingsPanel />
          )}
            </ContentSwap>
          </div>
        </main>
      </div>

      <PDFPreviewModal
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        preview={preview}
        onUpdate={
          preview?.docType &&
          (preview?.studentNo || preview?.docId) &&
          !preview?.sourceType &&
          !String(preview?.docId || "").startsWith("event-proposal-")
            ? () => {
                setPreviewOpen(false);
                handleRescan(
                  preview.studentNo,
                  preview.docType,
                  preview.docId,
                  preview.originalFilename || preview.filename,
                  preview.mimeType
                );
              }
            : undefined
        }
      />
      <ConfirmModal
        open={duplicateConfirmOpen}
        title="Document Already on File"
        message={authUser?.office_id === "osas"
          ? `A document of type "${duplicateTargetDoc?.doc_type || newRec.docType}" already exists for organization ${newRec.acronym || newRec.name || newRec.organizationId} (${duplicateTargetDoc?.approval_status || "Approved"}). Would you like to rescan and replace the existing digital record?`
          : `A document of type "${duplicateTargetDoc?.doc_type || newRec.docType}" already exists for student ${newRec.studentNo} (${duplicateTargetDoc?.approval_status || "Approved"}). Would you like to rescan and replace the existing digital record?`}
        confirmLabel="Replace Existing Document"
        cancelLabel="Cancel"
        onConfirm={() => {
          setIsReplaceMode(true);
          setDuplicateConfirmOpen(false);
        }}
        onCancel={() => {
          setDuplicateConfirmOpen(false);
        }}
        variant="warning"
      />
      <ConfirmModal
        open={bulkArchiveOpen}
        title="Confirm Bulk Archival"
        message={authUser?.office_id === "osas"
          ? `You are about to move ${selectedStudentIds.size} student organization(s) to the system archive.`
          : `You are about to move ${selectedStudentIds.size} student record(s) to the system archive. This will disable associated processing for these records.`}
        confirmLabel="Archive Records"
        selectedItems={Array.from(selectedStudentIds)}
        onConfirm={confirmBulkArchive}
        onCancel={() => setBulkArchiveOpen(false)}
        loading={bulkArchiveLoading}
        variant="warning"
        isArchiveModal={true}
      />
      <ConfirmModal
        open={bulkRestoreOpen}
        title="Confirm Bulk Restoration"
        message={authUser?.office_id === "osas"
          ? `You are about to restore ${selectedStudentIds.size} student organization(s) to active status.`
          : `You are about to restore ${selectedStudentIds.size} student record(s) to active status.`}
        confirmLabel="Restore Records"
        selectedItems={Array.from(selectedStudentIds)}
        onConfirm={confirmBulkRestore}
        onCancel={() => setBulkRestoreOpen(false)}
        loading={bulkRestoreLoading}
        variant="success"
        isRestoreModal={true}
      />
      <GlobalFailedBatchReviewModal officeId={authUser?.office_id} showToast={showToast} />
    </div>
  );
}

function StaffPageWithView() {
  const searchParams = useSearchParams();
  const requestedView = resolveRequestedStaffView(searchParams?.get("view") || searchParams?.get("tab"));
  const fallback = <StaffDashboardLoadingSkeleton view={requestedView} />;

  return (
    <StaffGuard fallback={fallback}>
      <Suspense fallback={fallback}>
        <StaffPageContent />
      </Suspense>
    </StaffGuard>
  );
}

export default function StaffPage() {
  return (
    <Suspense fallback={<StaffDashboardLoadingSkeleton />}>
      <StaffPageWithView />
    </Suspense>
  );
}
