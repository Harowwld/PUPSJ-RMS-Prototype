"use client";
import { getStudentRecordNameErrors, normalizeStudentRecordName, studentRecordNameParts } from "@/lib/studentRecordName";
import InitialDashboardLoader from "@/components/shared/InitialDashboardLoader";
import { BADGE_BASE } from "@/lib/badgeStyles";
import { useState, useEffect, useMemo, useRef, useCallback, useReducer, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import Sidebar from "@/components/shared/Sidebar";
import { toast } from "@/components/ui/sonner";
import { formatErrorMessage } from "@/lib/errorUtils";
import { createScanUploadForm, scanUploadFormReducer } from "@/lib/scanUploadAutofill";
import { createOcrRequestGuard } from "@/lib/ocrRequestGuard";
import { StaffGuard, useAuthUser } from "@/components/shared/AuthGuard";
import PDFPreviewModal from "@/components/shared/PDFPreviewModal";
import ConfirmModal from "@/components/shared/ConfirmModal";
import GlobalFailedBatchReviewModal from "@/components/staff/GlobalFailedBatchReviewModal";
import { ContentSwap } from "@/components/ui/motion";
import { canonicalizeCabinetId, findStorageDrawer } from "@/lib/storageLayoutUtils";
import { matchesSearchQuery, getDocTypeSearchAliases } from "@/lib/searchUtils";
import { fetchAllPages } from "@/lib/fetchAllPages";
import { indexOrganizationStorageDocuments } from "@/lib/organizationStorageDocuments";
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
import useOsasViewPreference from "@/hooks/useOsasViewPreference";
import DashboardShellSkeleton from "@/components/shared/DashboardShellSkeleton";
import DocumentRequestsSkeleton from "@/components/staff/skeletons/DocumentRequestsSkeleton";
import OsasMonitoringSkeleton from "@/components/staff/skeletons/OsasMonitoringSkeleton";
import StudentOrganizationsSkeleton from "@/components/staff/skeletons/StudentOrganizationsSkeleton";
import StudentDirectorySkeleton from "@/components/staff/skeletons/StudentDirectorySkeleton";
import ScanUploadSkeleton from "@/components/staff/skeletons/ScanUploadSkeleton";
import BatchReviewSkeleton from "@/components/staff/skeletons/BatchReviewSkeleton";
import DocumentsTabSkeleton from "@/components/staff/skeletons/DocumentsTabSkeleton";
import NotificationsTabSkeleton from "@/components/staff/skeletons/NotificationsTabSkeleton";
import RecordsArchiveSkeleton from "@/components/staff/skeletons/RecordsArchiveSkeleton";
import StorageExplorerSkeleton from "@/components/staff/skeletons/StorageExplorerSkeleton";

import AppIcon from "@/components/ui/app-icon";

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
  if (view === "documents" && String(user?.office_id || "").toLowerCase() === "osas") return false;
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


import RecordsArchiveTab from "@/components/staff/RecordsArchiveTab";
import StorageExplorerTab from "@/components/staff/StorageExplorerTab";
import ScanUploadTab from "@/components/staff/ScanUploadTab";
import BatchReviewTab from "@/components/staff/BatchReviewTab";
import DocumentsTab from "@/components/staff/DocumentsTab";
import NotificationsTab from "@/components/staff/NotificationsTab";
import DocumentRequestsTab from "@/components/staff/DocumentRequestsTab";
import OsasMonitoringTab from "@/components/staff/OsasMonitoringTab";
import StudentOrganizationsTab from "@/components/staff/StudentOrganizationsTab";
import StudentDirectoryTab from "@/components/staff/StudentDirectoryTab";

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

  const [authUser, setAuthUser] = useState(initialAuthUser);
  const [authUserSource, setAuthUserSource] = useState(initialAuthUser);
  if (authUserSource !== initialAuthUser) {
    setAuthUserSource(initialAuthUser);
    setAuthUser(initialAuthUser);
  }
  const view = resolveStaffView(searchParams?.get("view") || searchParams?.get("tab"), authUser);
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
    const params = new URLSearchParams();
    params.set("view", nextView);
    router.push(`${window.location.pathname}?${params.toString()}`, { scroll: false });
  }, [router]);

  const [notificationsUnread, setNotificationsUnread] = useState(0);

  const enabledModules = authUser?.enabled_modules;
  const sidebarItems = useMemo(() => {
    if (!enabledModules) return []
    const enabled = new Set(enabledModules)
    
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
        if (child.key === "documents" && isOsas) return false;
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
  }, [enabledModules, isOsas, notificationsUnread])

  const [students, setStudents] = useState([]);
  const [archivedStudents, setArchivedStudents] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [archivedOrganizations, setArchivedOrganizations] = useState([]);
  const [selectedCategory, setSelectedCategory] = useOsasViewPreference("records_archive", "selectedCategory", null);
  const [docTypes, setDocTypes] = useState([]);
  const [requestableDocTypes, setRequestableDocTypes] = useState([]);
  const [courses, setCourses] = useState([]);
  const [sections, setSections] = useState([]);
  const [storageLayout, setStorageLayout] = useState(null);
  const [allDocs, setAllDocs] = useState([]);

  const [currentLevel, setCurrentLevel] = useOsasViewPreference("records_archive", "currentLevel", "years");
  const [selectedYear, setSelectedYear] = useOsasViewPreference("records_archive", "selectedYear", null);

  const [quickQuery, setQuickQuery] = useOsasViewPreference("records_archive", "quickQuery", "");
  const [archiveRefreshVersion, setArchiveRefreshVersion] = useState(0);

  const [activeStudent, setActiveStudent] = useState(null);
  const [selectedStudentIds, setSelectedStudentIds] = useState(new Set());
  const [previousSelectionView, setPreviousSelectionView] = useState(view);
  if (previousSelectionView !== view) {
    setPreviousSelectionView(view);
    if (selectedStudentIds.size > 0) setSelectedStudentIds(new Set());
  }
  const [bulkArchiveOpen, setBulkArchiveOpen] = useState(false);
  const [bulkArchiveLoading, setBulkArchiveLoading] = useState(false);
  const [bulkRestoreOpen, setBulkRestoreOpen] = useState(false);
  const [bulkRestoreLoading, setBulkRestoreLoading] = useState(false);

  const [currentLocatorLevel, setCurrentLocatorLevel] = useOsasViewPreference("storage_explorer", "currentLocatorLevel", "rooms");
  const [selectedRoom, setSelectedRoom] = useOsasViewPreference("storage_explorer", "selectedRoom", null);
  const [selectedCabinet, setSelectedCabinet] = useOsasViewPreference("storage_explorer", "selectedCabinet", null);

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

  const [uploadForm, dispatchUploadForm] = useReducer(scanUploadFormReducer, {
    studentNo: "",
    name: "",
    firstName: "", middleName: "", lastName: "",
    course: "",
    year: "",
    sectionPart: "",
    room: "",
    cabinet: "",
    drawer: "",
    docType: "",
    eventName: "",
    organizationId: "",
    acronym: "",
    category: "",
    adviserName: "",
    adviserEmail: "",
  }, createScanUploadForm);
  const newRec = uploadForm.values;
  /** When true, submit attaches the PDF to an existing student (no new student row). */
  const uploadStudentIsExisting = uploadForm.existing;
  const setNewRec = useCallback((update) => dispatchUploadForm({ type: "edit", update }), []);
  const setUploadStudentIsExisting = useCallback((value) => dispatchUploadForm({ type: "select-existing", value }), []);
  const applyOcrSuggestion = (suggestion) => dispatchUploadForm({
    type: "ocr", suggestion,
    lockedIdentity: Boolean(rescanContext || isReplaceMode),
    lockedDocType: rescanContext?.docType || "",
    isOsas: authUser?.office_id === "osas",
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
      const validIds = new Set(isOsas
        ? allOrgs.map((org) => org.id)
        : studentRows.map((student) => student.studentNo || student.student_no));
      setSelectedStudentIds((previous) => {
        const next = new Set([...previous].filter((id) => validIds.has(id)));
        return next.size === previous.size ? previous : next;
      });

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
            event_name: proposal.title,
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

      if (selectedCabinet && !roomDef.cabinets?.some((cabinet) => String(cabinet.id) === String(selectedCabinet))) {
        setSelectedCabinet(null);
        setCurrentLocatorLevel("cabinets");
      }
    }
  }, [storageLayout, currentLocatorLevel, selectedRoom, selectedCabinet, setSelectedRoom, setSelectedCabinet, setCurrentLocatorLevel]);

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

  const organizationStorage = useMemo(() => {
    if (!isOsas || view !== "storage") return null;
    const occupants = [...organizations, ...archivedOrganizations];
    return {
      occupants: occupants.map((organization) => ({
        ...organization,
        location: findStorageDrawer(storageLayout, {
          room: organization.storage_room ?? 1,
          cabinet: organization.storage_cabinet,
          drawer: organization.storage_drawer,
        }),
      })),
      documentsByOrganization: indexOrganizationStorageDocuments(occupants, staffDocs),
    };
  }, [isOsas, view, organizations, archivedOrganizations, storageLayout, staffDocs]);

  const locatorModel = useMemo(() => {
    if (!storageLayout?.rooms?.length) return { kind: "none" };

    const isOsas = authUser?.office_id === "osas";
    const locatedOrganizations = organizationStorage?.occupants || [];

    if (currentLocatorLevel === "rooms") {
      return {
        kind: "rooms",
        title: isOsas ? "OSAS Physical Archive Rooms" : "PUP Storage Rooms",
        rooms: storageLayout.rooms.map((r) => ({
          room: r.id,
          name: r.name || `Room ${r.id}`,
          occupiedCount: isOsas
            ? locatedOrganizations.filter((o) => String(o.location?.room) === String(r.id)).length
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
            ? locatedOrganizations.filter(
                (o) => String(o.location?.room) === String(selectedRoom) && o.location?.cabinet === normCab,
              ).length
            : students.filter(
                (s) => String(s.room) === String(selectedRoom) && String(s.cabinet) === normCab,
              ).length;
          return {
            cab: normCab,
            occupiedCount,
            isTarget:
              String(activeStudent?.room) === String(selectedRoom) &&
              String(activeStudent?.cabinet) === normCab,
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
        (c) => String(c.id) === String(selectedCabinet)
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
            ? locatedOrganizations.filter(
                (o) => String(o.location?.room) === String(selectedRoom) && o.location?.cabinet === normCab,
              ).length
            : students.filter(
                (s) => String(s.room) === String(selectedRoom) && String(s.cabinet) === normCab,
              ).length;
          return {
            cab: normCab,
            occupiedCount,
            isTarget:
              String(activeStudent?.room) === String(selectedRoom) &&
              String(activeStudent?.cabinet) === normCab,
            rect: c.rect,
            rotation: c.rotation || 0,
            drawerIds: c.drawerIds,
          };
        }),
        drawers: (cabinetDef.drawerIds || []).map((d) => {
          if (isOsas) {
            const drawerOrgs = locatedOrganizations.filter(
              (o) =>
                String(o.location?.room) === String(selectedRoom) &&
                o.location?.cabinet === String(selectedCabinet) &&
                String(o.location?.drawer) === String(d)
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
                return {
                  studentNo: o.acronym || o.id,
                  name: o.name,
                  category: o.category,
                  documents: [...docs, ...(organizationStorage.documentsByOrganization.get(o.id) || [])],
                };
              }),
              isTarget:
                String(activeStudent?.room) === String(selectedRoom) &&
                String(activeStudent?.cabinet) === String(selectedCabinet) &&
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
              String(activeStudent?.cabinet) === String(selectedCabinet) &&
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
    organizationStorage,
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
      if (!s) return false;
      if (!storageLayout) {
        toast.error("The storage layout is still loading. Try again shortly.");
        return false;
      }

      const room = s.rawOrg?.storage_room ?? s.storage_room ?? s.room;
      const cabinet = s.rawOrg?.storage_cabinet ?? s.storage_cabinet ?? s.cabinet;
      const drawer = s.rawOrg?.storage_drawer ?? s.storage_drawer ?? s.drawer;
      const location = findStorageDrawer(storageLayout, { room, cabinet, drawer });
      if (!location) {
        toast.error("Archive drawer not found", {
          description: "This record’s room, cabinet, or drawer does not match the storage layout.",
        });
        return false;
      }

      if (authUser?.office_id === "osas") {
        setSelectedCategory(s.category || s.rawOrg?.category || null);
        setCurrentLevel("organizations");
      } else {
        const yearFromDb = Number(s.yearLevel);
        const nextYear = getStudentNoYear(s.studentNo) ??
          (Number.isFinite(yearFromDb) ? yearFromDb : null);
        setSelectedYear(nextYear);
        setCurrentLevel("students");
      }

      if (locateTimeoutRef.current) {
        clearTimeout(locateTimeoutRef.current);
        locateTimeoutRef.current = null;
      }

      setActiveStudent({ ...s, ...location });
      setSelectedRoom(location.room);
      setSelectedCabinet(location.cabinet);
      setCurrentLocatorLevel("drawers");
      switchView("storage");
      return true;
    },
    [switchView, authUser?.office_id, storageLayout, setCurrentLevel, setCurrentLocatorLevel, setSelectedCabinet, setSelectedCategory, setSelectedRoom, setSelectedYear],
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
        } else if (!id && (docType === "Constitution and By-Laws" || docType === "Constitution & By-Laws (CBL)")) {
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
        sourceType: matchedDoc?.source_type || (strId.startsWith("cbl-") ? "organization_bylaws" : null),
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
    if (locateNo && storageLayout && students.length > 0 && processedLocateRef.current !== locateNo) {
      processedLocateRef.current = locateNo;
      const match = students.find(s => s.studentNo === locateNo) || archivedStudents.find(s => s.studentNo === locateNo);
      if (match) {
        // Clear parameter from URL
        const params = new URLSearchParams(window.location.search);
        params.delete("locate");
        router.replace(`${window.location.pathname}?${params.toString()}`, { scroll: false });
        queueMicrotask(() => locateStudent(match));
      }
    }
  }, [searchParams, storageLayout, students, archivedStudents, locateStudent, router]);

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
      ...studentRecordNameParts(s),
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
  }, [authUser?.office_id, setNewRec]);

  const handleFileSelect = async (filesOrFile, skipOcr = false, rotationParam, skipQueue = false, replaceSelected = false) => {
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

    if (replaceSelected) {
      if (incomingFiles.length !== 1) return false;
      const replacement = incomingFiles[0];
      const currentFile = uploadedFile;
      const validationId = ocrRequestGuardRef.current.begin(currentFile);
      try {
        if (!replacement.size) throw new Error("The replacement file is empty.");
        if (String(replacement.type).startsWith("image/")) {
          const url = URL.createObjectURL(replacement);
          try {
            const image = new Image();
            image.src = url;
            await image.decode();
          } finally {
            URL.revokeObjectURL(url);
          }
        } else if (replacement.type === "application/pdf" || /\.pdf$/i.test(replacement.name)) {
          const { PDFDocument } = await import("pdf-lib");
          const pdf = await PDFDocument.load(await replacement.arrayBuffer());
          if (!pdf.getPageCount()) throw new Error("The replacement PDF has no pages.");
        } else {
          throw new Error("Choose a PDF or image file.");
        }
      } catch (error) {
        if (!ocrRequestGuardRef.current.isCurrent(validationId, currentFile)) return false;
        setOcrLoading(false);
        showToast({ title: "Replacement Failed", description: error.message || "Could not read the replacement. The original page is still loaded." }, true);
        return false;
      }
      if (!ocrRequestGuardRef.current.isCurrent(validationId, currentFile)) return false;
      setUploadedFiles((prev) => prev.length
        ? prev.map((file, index) => index === selectedQueuedFileIndex ? replacement : file)
        : [replacement]);
      ocrContextRef.current = null;
      ocrContextFileRef.current = replacement;
    } else if (!skipQueue) {
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
    setOcrSuggestion(null);
    setOcrError("");

    if (!skipOcr) {
      // In merge mode (multiple pages), only run OCR autofill for the very first page.
      // We capture the queue length *before* the new file was enqueued (skipQueue path
      // bypasses the setUploadedFiles call, so we can rely on the pre-call snapshot).
      const wasQueueEmpty = uploadedFiles.length === 0;
      const isLeadPage = wasQueueEmpty || skipQueue || replaceSelected;

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
          autoRotate: rotationParam === undefined,
          matchStudents: !isOsas,
          ocrContext: rotationParam !== undefined && ocrContextFileRef.current === activeFile
            ? ocrContextRef.current
            : null,
        });
        if (!ocrRequestGuardRef.current.isCurrent(ocrRequestId, activeFile)) return;
        ocrContextRef.current = suggestion.ocrContext;
        ocrContextFileRef.current = activeFile;
        delete suggestion.ocrContext;
        const detectedRotation = suggestion.detectedRotation ?? (rotationParam !== undefined ? rotationParam : rotation);
        lastRotationOcrRef.current = detectedRotation;
        if (detectedRotation !== rotation) setRotation(detectedRotation);
        setOcrSuggestion(suggestion);

        console.log("[OCR handleFileSelect] extracted fields:", {
          name: suggestion.name,
          docType: suggestion.docType,
          docTypesAvailable: docTypes,
        });
        applyOcrSuggestion(suggestion);
        clearAllUploadFieldErrors();
      } catch (err) {
        if (!ocrRequestGuardRef.current.isCurrent(ocrRequestId, activeFile)) return;
        setOcrLoading(false);
        const message =
          err?.message || "Automatic detection failed. Please fill manually.";
        setOcrError(message);
        applyOcrSuggestion({ studentMatches: [], docType: "" });
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
    } else {
      setOcrLoading(false);
    }
    return true;
  };

  const handleRemoveQueuedFile = (indexToRemove) => {
    setUploadedFiles((prev) => {
      const next = prev.filter((_, idx) => idx !== indexToRemove);
      const nextIndex = next.length === 0 ? 0 : Math.min(selectedQueuedFileIndex, next.length - 1);
      const nextFile = next[nextIndex] || null;
      ocrRequestGuardRef.current.invalidate(nextFile);
      setOcrSuggestion(null);
      setOcrError("");
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
        (authUser?.office_id !== "osas" || String(d.event_name || "").trim().toLowerCase() === String(newRec.eventName || "").trim().toLowerCase()) &&
        String(d.approval_status).toLowerCase() !== "declined"
    );

    if (existing) {
      setDuplicateTargetDoc(existing);
      setDuplicateConfirmOpen(true);
    }
  }, [staffDocs, isReplaceMode, rescanContext, authUser?.office_id, newRec.eventName]);

  const validateUpload = () => {
    const isOsas = authUser?.office_id === "osas";
    const requiredFields = ["docType"];

    if (isOsas) {
      requiredFields.push(...(uploadStudentIsExisting ? ["organizationId"] : ["name", "category"]));
    } else {
      requiredFields.push("studentNo");
      if (!uploadStudentIsExisting) requiredFields.push("course", "year", "sectionPart");
    }
    if (!uploadStudentIsExisting) requiredFields.push("room", "cabinet", "drawer");

    const errors = {};
    if (!uploadedFile) errors.pdfFile = true;
    for (const field of requiredFields) {
      if (!String(newRec[field] ?? "").trim()) errors[field] = true;
    }
    if (!isOsas && !uploadStudentIsExisting) {
      Object.assign(errors, getStudentRecordNameErrors(studentRecordNameParts(newRec)));
    }

    setUploadFieldErrors(errors);
    if (!Object.keys(errors).length) return true;

    const hasFieldErrors = Object.keys(errors).some((field) => field !== "pdfFile");
    showToast({
      title: hasFieldErrors ? "Incomplete Form" : "No File Selected",
      description: hasFieldErrors
        ? errors.pdfFile
          ? "Attach a document and complete the highlighted fields."
          : "Check the highlighted fields before uploading."
        : "Attach a document before submitting.",
    }, true);
    return false;
  };

  const processSubmission = async ({ onSuccess } = {}) => {
    if (!validateUpload()) return;
    const isOsas = authUser?.office_id === "osas";

    // Convert queued pages to one PDF in their displayed order.
    const { imageToPdf, needsConversion, mergeFilesToPdf } = await import("@/lib/imageToPdf");
    let fileToUpload = uploadedFile;
    if (uploadedFiles.length > 1) {
      try {
        fileToUpload = await mergeFilesToPdf(uploadedFiles);
      } catch (convErr) {
        showToast(
          formatErrorMessage(convErr, {
            title: "Page Merge Failed",
            description: "Could not combine the queued pages. Check the files and try again.",
          }),
          true
        );
        return;
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
      payload.append("eventName", String(newRec.eventName || "").trim());
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
        const parts = normalizeStudentRecordName(studentRecordNameParts(newRec));
        for (const key of ["firstName", "middleName", "lastName"]) payload.append(key, parts[key]);
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
      setOcrError("");
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
        firstName: "", middleName: "", lastName: "",
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
    if (isOsas) {
      setNewRec((current) => ({ ...current, eventName: matchedDoc?.event_name || "" }));
    }
    clearAllUploadFieldErrors();
    // Clear previous uploads so the dropzone is ready for the new scan/replacement file
    setUploadedFile(null);
    ocrRequestGuardRef.current.invalidate(null);
    setOcrLoading(false);
    setOcrSuggestion(null);
    setOcrError("");
    setUploadedFiles([]);
    setSelectedQueuedFileIndex(0);
    setRotation(0);
    switchView("upload");
  }, [students, archivedStudents, organizations, archivedOrganizations, allDocs, authUser?.office_id, applyStudentToPdfForm, clearAllUploadFieldErrors, setNewRec, setUploadStudentIsExisting, switchView]);

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

      const recordCount = (count) => `${count} ${isOsas
        ? (count === 1 ? "organization" : "organizations")
        : (count === 1 ? "student record" : "student records")}`;
      showToast({
        title: failCount === 0 ? "Records Archived" : successCount === 0 ? "No Records Archived" : "Some Records Could Not Be Archived",
        description: failCount > 0
          ? `${recordCount(successCount)} archived. ${recordCount(failCount)} could not be archived. Refresh the list before retrying.`
          : `${recordCount(successCount)} moved to Archive.`,
      }, failCount === 0 ? "success" : successCount === 0 ? "error" : "warning");
      setBulkArchiveOpen(false);
      setSelectedStudentIds(new Set());
      fetchData();
      setArchiveRefreshVersion((version) => version + 1);
    } catch (err) {
      showToast(
        formatErrorMessage(err, {
          title: "Bulk Archival Failed",
          description: "Refresh the list to see which records were archived before retrying.",
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

      const recordCount = (count) => `${count} ${isOsas
        ? (count === 1 ? "organization" : "organizations")
        : (count === 1 ? "student record" : "student records")}`;
      showToast({
        title: failCount === 0 ? "Records Restored" : successCount === 0 ? "No Records Restored" : "Some Records Could Not Be Restored",
        description: failCount > 0
          ? `${recordCount(successCount)} restored. ${recordCount(failCount)} could not be restored. Refresh the list before retrying.`
          : `${recordCount(successCount)} moved to Active.`,
      }, failCount === 0 ? "success" : successCount === 0 ? "error" : "warning");
      setBulkRestoreOpen(false);
      setSelectedStudentIds(new Set());
      fetchData();
      setArchiveRefreshVersion((version) => version + 1);
    } catch (err) {
      showToast(
        formatErrorMessage(err, {
          title: "Bulk Restoration Failed",
          description: "Refresh the list to see which records were restored before retrying.",
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
        <main className={cn("flex-1 relative w-full min-w-0 min-h-0 bg-white dark:bg-zinc-950/50 flex flex-col", (view === "batch_review" || (view === "storage" && currentLocatorLevel !== "rooms")) ? "overflow-hidden" : "overflow-y-auto")}>
          <div 
            className={cn(
              "p-2 flex flex-col w-full",
              authUser?.preferences?.navigation_layout !== "topbar" && "md:pl-1",
              (view === "batch_review" || (view === "storage" && currentLocatorLevel !== "rooms")) ? "flex-1 h-full min-h-0 *:flex-1 *:min-h-0" : "flex-[1_0_auto] min-h-full min-w-0 *:flex-[1_0_auto]"
            )}
          >
            <ContentSwap id={view} className={cn("w-full min-w-0 flex flex-col", (view === "batch_review" || (view === "storage" && currentLocatorLevel !== "rooms")) ? "h-full flex-1 min-h-0 *:h-full *:flex-1 *:min-h-0" : "flex-[1_0_auto] *:flex-[1_0_auto]")}>
            {view === "students" && (
            <StudentDirectoryTab
              authUser={authUser}
              loading={!storageLayout}
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
              onSwitchView={switchView}
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
              onSwitchView={switchView}
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
              onReplaceFile={(file) => handleFileSelect(file, false, undefined, false, true)}
              onRescanFile={() => handleFileSelect(uploadedFile, false, undefined, true)}
              rotation={rotation}
              setRotation={setRotation}
              onClearFile={() => {
                setUploadedFile(null);
                ocrRequestGuardRef.current.invalidate(null);
                setOcrLoading(false);
                setUploadedFiles([]);
                setSelectedQueuedFileIndex(0);
                setOcrSuggestion(null);
                setOcrError("");
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
              validateUpload={validateUpload}
              uploadFieldErrors={uploadFieldErrors}
              clearUploadFieldError={clearUploadFieldError}
              clearAllUploadFieldErrors={clearAllUploadFieldErrors}
              newRec={newRec}
              setNewRec={setNewRec}
              onOcrResult={applyOcrSuggestion}
              onSelectDocumentType={(docType) => dispatchUploadForm({
                type: "edit", manualFields: ["docType"], update: (values) => ({ ...values, docType }),
              })}
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

const STAFF_VIEW_SKELETONS = {
  requests: DocumentRequestsSkeleton,
  osas_monitoring: OsasMonitoringSkeleton,
  organizations: StudentOrganizationsSkeleton,
  students: StudentDirectorySkeleton,
  upload: ScanUploadSkeleton,
  batch_review: BatchReviewSkeleton,
  documents: DocumentsTabSkeleton,
  notifications: NotificationsTabSkeleton,
  search: RecordsArchiveSkeleton,
  storage: StorageExplorerSkeleton,
};

function StaffPageWithView() {
  const searchParams = useSearchParams();
  const view = resolveRequestedStaffView(searchParams?.get("view") || searchParams?.get("tab"));
  const ViewSkeleton = STAFF_VIEW_SKELETONS[view];
  const fallback = (
    <InitialDashboardLoader>
      <DashboardShellSkeleton>{ViewSkeleton ? <ViewSkeleton /> : null}</DashboardShellSkeleton>
    </InitialDashboardLoader>
  );

  return (
    <StaffGuard fallback={fallback}>
      <StaffPageContent />
    </StaffGuard>
  );
}

export default function StaffPage() {
  return (
    <Suspense fallback={<InitialDashboardLoader />}>
      <StaffPageWithView />
    </Suspense>
  );
}
