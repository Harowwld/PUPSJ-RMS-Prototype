"use client";
import HugeIcon from "@/components/shared/HugeIcon";
import { useState, useEffect, useMemo, useRef, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";

import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import Sidebar from "@/components/shared/Sidebar";
import { toast } from "@/components/ui/sonner";
import { StaffGuard, useAuthUser } from "@/components/shared/AuthGuard";
import PDFPreviewModal from "@/components/shared/PDFPreviewModal";
import OCRPromptModal from "@/components/staff/OCRPromptModal";
import ConfirmModal from "@/components/shared/ConfirmModal";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { canonicalizeCabinetId, findMatchingCabinet, areCabinetsEqual } from "@/lib/storageLayoutUtils";
import { cn } from "@/lib/utils";
import { getRoleBranding } from "@/lib/roleBranding";
import { PageTransition } from "@/components/ui/motion";
import StaffTabSkeleton from "@/components/staff/skeletons/StaffTabSkeleton";

const StaffTabLoading = () => <StaffTabSkeleton />;
const RecordsArchiveTab = dynamic(() => import("@/components/staff/RecordsArchiveTab"), { loading: StaffTabLoading });
const StorageExplorerTab = dynamic(() => import("@/components/staff/StorageExplorerTab"), { loading: StaffTabLoading });
const ScanUploadTab = dynamic(() => import("@/components/staff/ScanUploadTab"), { loading: StaffTabLoading });
const BatchReviewTab = dynamic(() => import("@/components/staff/BatchReviewTab"), { loading: StaffTabLoading });
const DocumentsTab = dynamic(() => import("@/components/staff/DocumentsTab"), { loading: StaffTabLoading });
const NotificationsTab = dynamic(() => import("@/components/staff/NotificationsTab"), { loading: StaffTabLoading });
const DocumentRequestsTab = dynamic(() => import("@/components/staff/DocumentRequestsTab"), { loading: StaffTabLoading });
const RegistrarODRSTab = dynamic(() => import("@/components/staff/RegistrarODRSTab"), { loading: StaffTabLoading });
const OsasMonitoringTab = dynamic(() => import("@/components/staff/OsasMonitoringTab"), { loading: StaffTabLoading });
const StudentOrganizationsTab = dynamic(() => import("@/components/staff/StudentOrganizationsTab"), { loading: StaffTabLoading });
const StudentDirectoryTab = dynamic(() => import("@/components/staff/StudentDirectoryTab"), { loading: StaffTabLoading });

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
  const docsLoadedRef = useRef(false);
  const locateTimeoutRef = useRef(null);
  const processedLocateRef = useRef(null);

  const validViews = ["requests", "osas_monitoring", "organizations", "students", "upload", "batch_review", "documents", "notifications", "search", "storage"];
  const initialView = (() => {
    const req = searchParams?.get("view");
    const enabledSet = new Set(initialAuthUser?.enabled_modules || []);
    const hasModuleFilter = Array.isArray(initialAuthUser?.enabled_modules) && initialAuthUser.enabled_modules.length > 0;
    const isTabEnabled = (t) => {
      const mod = {
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
      }[t];
      return !hasModuleFilter || !mod || enabledSet.has(mod);
    };

    if (validViews.includes(req) && isTabEnabled(req)) return req;
    const defaultPreferred = initialAuthUser?.office_id === "osas" ? "osas_monitoring" : "requests";
    if (isTabEnabled(defaultPreferred)) return defaultPreferred;
    const firstAllowed = validViews.find(isTabEnabled);
    return firstAllowed || defaultPreferred;
  })();

  const [view, setView] = useState(initialView);
  const [authUser, setAuthUser] = useState(initialAuthUser);

  const roleBranding = getRoleBranding(authUser);
  const brandAccent = authUser?.accent_color || roleBranding.color || "#EDBB00";
  const brandForeground = roleBranding.foreground || "#FFFFFF";

  useEffect(() => {
    if (typeof window !== "undefined" && brandAccent) {
      document.documentElement.style.setProperty("--brand-accent", brandAccent);
      document.documentElement.style.setProperty("--brand-foreground", brandForeground);
    }
  }, [brandAccent, brandForeground]);

  const switchView = useCallback((nextView) => {
    setView(nextView);
    // Update URL without a full refresh
    const params = new URLSearchParams(window.location.search);
    params.set("view", nextView);
    router.replace(`${window.location.pathname}?${params.toString()}`, { scroll: false });
  }, [router]);

  useEffect(() => {
    const tab = String(searchParams?.get("view") || searchParams?.get("tab") || "").trim()
    const allowedTabs = new Set(["requests", "osas_monitoring", "organizations", "students", "upload", "batch_review", "documents", "notifications", "search", "storage"])
    if (allowedTabs.has(tab)) {
      if (authUser?.enabled_modules) {
        const enabledSet = new Set(authUser.enabled_modules);
        const mod = {
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
        }[tab];
        if (mod && !enabledSet.has(mod)) return;
      }
      setView(tab)
    }
  }, [searchParams, authUser])
  const [loading, setLoading] = useState(!initialAuthUser);
  const [zoomNode, setZoomNode] = useState(3); // 0 to 6 (7 nodes)
  const handleZoomMouseDown = (e) => {
    // Avoid text selection or default drag triggers
    e.preventDefault();
    const track = e.currentTarget;
    
    const updateZoom = (clientX) => {
      const rect = track.getBoundingClientRect();
      const clickX = clientX - rect.left;
      const percentage = clickX / rect.width;
      const node = Math.max(0, Math.min(6, Math.round(percentage * 6)));
      setZoomNode(node);
    };

    const isTouch = e.type === "touchstart";
    const startX = isTouch ? e.touches[0].clientX : e.clientX;
    updateZoom(startX);

    const handleMove = (moveEvent) => {
      const clientX = moveEvent.type === "touchmove" ? moveEvent.touches[0].clientX : moveEvent.clientX;
      updateZoom(clientX);
    };

    const handleEnd = () => {
      if (isTouch) {
        document.removeEventListener("touchmove", handleMove);
        document.removeEventListener("touchend", handleEnd);
      } else {
        document.removeEventListener("mousemove", handleMove);
        document.removeEventListener("mouseup", handleEnd);
      }
    };

    if (isTouch) {
      document.addEventListener("touchmove", handleMove, { passive: true });
      document.addEventListener("touchend", handleEnd);
    } else {
      document.addEventListener("mousemove", handleMove);
      document.addEventListener("mouseup", handleEnd);
    }
  };

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
          { key: "requests", label: "Document Requests", iconClass: "ph-bold ph-tray-arrow-up" },
          { key: "osas_monitoring", label: "OSAS Monitoring", iconClass: "ph-bold ph-student" },
        ]
      },
      {
        type: "group",
        label: "Digitization & Ingestion",
        children: [
          { key: "upload", label: "Scan & Upload", iconClass: "ph-bold ph-scan" },
          { key: "batch_review", label: "Batch Review", iconClass: "ph-bold ph-check-square" },
        ]
      },
      {
        type: "group",
        label: "Student & Organization Roster",
        children: [
          { key: "students", label: "Student Directory", iconClass: "ph-bold ph-users" },
          { key: "organizations", label: "Student Organizations", iconClass: "ph-bold ph-buildings" },
        ]
      },
      {
        type: "group",
        label: "Archive & Storage",
        children: [
          { key: "search", label: "Records & Archive", iconClass: "ph-bold ph-archive-box" },
          { key: "storage", label: "Storage Explorer", iconClass: "ph-bold ph-folder-open" },
        ]
      },
      {
        type: "group",
        label: "Records & Communications",
        children: [
          { key: "documents", label: "Documents Matrix", iconClass: "ph-bold ph-file-text" },
          { key: "notifications", label: "Notifications", iconClass: "ph-bold ph-bell", badge: notificationsUnread },
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
  const [courses, setCourses] = useState([]);
  const [sections, setSections] = useState([]);
  const [storageLayout, setStorageLayout] = useState(null);
  const [allDocs, setAllDocs] = useState([]);

  const [currentLevel, setCurrentLevel] = useState("years");
  const [selectedYear, setSelectedYear] = useState(null);

  const [quickQuery, setQuickQuery] = useState("");
  const [quickResults, setQuickResults] = useState([]);
  const [isQuickSearching, setIsQuickSearching] = useState(false);

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

  /** "pdf" = single PDF upload (existing or new student); "csv" = batch import */
  const [uploadMode, setUploadMode] = useState("pdf");
  /** When true, submit attaches the PDF to an existing student (no new student row). */
  const [uploadStudentIsExisting, setUploadStudentIsExisting] = useState(false);
  const [dropActive, setDropActive] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [selectedQueuedFileIndex, setSelectedQueuedFileIndex] = useState(0);
  const fileInputRef = useRef(null);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrSuggestion, setOcrSuggestion] = useState(null);
  const [ocrPromptOpen, setOcrPromptOpen] = useState(false);
  const [ocrError, setOcrError] = useState("");
  const [rotation, setRotation] = useState(0);
  const [duplicateConfirmOpen, setDuplicateConfirmOpen] = useState(false);
  const [pendingSubmission, setPendingSubmission] = useState(null);


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
  const [newRecStudentNoHint, setNewRecStudentNoHint] = useState("");
  const [newRecStudentNoTouched, setNewRecStudentNoTouched] = useState(false);
  const newStudentNoInputRef = useRef(null);

  const [csvFile, setCsvFile] = useState(null);
  const [csvRows, setCsvRows] = useState([]);
  const [csvSelected, setCsvSelected] = useState({});
  const [csvLoading, setCsvLoading] = useState(false);
  const [csvResults, setCsvResults] = useState([]);
  const [csvError, setCsvError] = useState("");
  const [uploadError, setUploadError] = useState("");
  /** Keys: pdfFile, studentNo, name, course, year, sectionPart, room, cabinet, drawer, docType */
  const [uploadFieldErrors, setUploadFieldErrors] = useState({});
  const [csvBulkRoom, setCsvBulkRoom] = useState("");
  const [csvBulkCabinet, setCsvBulkCabinet] = useState("");
  const [csvBulkDrawer, setCsvBulkDrawer] = useState("");
  const [csvDropActive, setCsvDropActive] = useState(false);
  const csvInputRef = useRef(null);

  const [docsForm, setDocsForm] = useState({
    studentNo: "",
    studentName: "",
    docType: "",
  });
  const [docsFile, setDocsFile] = useState(null);
  const docsFileInputRef = useRef(null);
  const [docsRows, setDocsRows] = useState([]);
  const [docsLoading, setDocsLoading] = useState(false);
  const [docsError, setDocsError] = useState("");

  const [previewOpen, setPreviewOpen] = useState(false);
  const [preview, setPreview] = useState({
    docType: "",
    studentName: "",
    studentNo: "",
    docId: null,
    refId: "",
  });

  const showToast = useCallback((msg, typeOrIsError = false) => {
    const isRich = msg && typeof msg === "object" && msg.title;
    const title = isRich ? msg.title : String(msg || "");
    const opts = isRich && msg.description ? { description: msg.description } : {};

    if (typeOrIsError === true || typeOrIsError === "error") {
      toast.error(title, opts);
      return;
    }
    if (typeOrIsError === "warning") {
      toast.warning(title, opts);
      return;
    }
    toast.success(title, opts);
  }, []);

  const fetchData = useCallback(async () => {
    try {
      const [sRes, aRes, dRes, cRes, secRes, layoutRes, orgsRes] = await Promise.all([
        fetch("/api/students"),
        fetch("/api/students?includeArchived=true"),
        fetch("/api/doc-types"),
        fetch("/api/courses"),
        fetch("/api/sections"),
        fetch("/api/storage-layout"),
        fetch("/api/osas/organizations?status=Active,Inactive,Archived"),
      ]);
      const [sData, aData, dData, cData, secData, layoutData, orgsData] = await Promise.all([
        sRes.json(),
        aRes.json(),
        dRes.json(),
        cRes.json(),
        secRes.json(),
        layoutRes.json(),
        orgsRes.json().catch(() => ({ ok: false, data: [] })),
      ]);
      
      setStudents((Array.isArray(sData.data) ? sData.data : []).map(normalizeStudentRow));
      
      const allFetched = Array.isArray(aData.data) ? aData.data : [];
      setArchivedStudents(
        allFetched
          .filter(s => s.status !== "Active")
          .map(normalizeStudentRow)
      );

      const allOrgs = Array.isArray(orgsData?.data) ? orgsData.data : [];
      setOrganizations(allOrgs.filter(o => o.status !== "Archived"));
      setArchivedOrganizations(allOrgs.filter(o => o.status === "Archived"));

      setDocTypes(dData.data || []);
      setCourses(cData.data || []);
      setSections(secData.data || []);
      setStorageLayout(layoutData?.data || { version: 2, rooms: [] });
      coreDataLoadedRef.current = true;
    } catch (err) {
      showToast({ title: "Sync Failed", description: "Unable to refresh data from the server." }, true);
    }
  }, [showToast]);

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
    try {
      const [res, proposalsRes] = await Promise.all([
        fetch("/api/documents?excludeDeclined=1&limit=500"),
        fetch("/api/osas/event-proposals", { cache: "no-store" }),
      ]);
      const data = await res.json();
      const proposalsData = await proposalsRes.json().catch(() => null);
      const proposalDocuments = proposalsRes.ok && Array.isArray(proposalsData?.data)
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
      setAllDocs([...(Array.isArray(data.data) ? data.data : []), ...proposalDocuments]);
      docsLoadedRef.current = true;
    } catch {
      /* silent */
    }
  }, []);

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
      fetchData();
      fetchAllDocs();
      fetchNotificationsUnread();
    }, 0);
    return () => clearTimeout(timer);
  }, [initialAuthUser, fetchData, fetchAllDocs, fetchNotificationsUnread]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      fetchAllDocs();
      fetchNotificationsUnread();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [fetchAllDocs, fetchNotificationsUnread]);

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
    // Load document list lazily when search view is visible.
    if (view !== "search" || docsLoadedRef.current) return;
    setTimeout(() => {
      fetchAllDocs();
    }, 0);
  }, [view, fetchAllDocs]);

  useEffect(() => {
    if (view !== "upload" && view !== "search") return;
    // Keep staff selectors/SLV in sync with admin layout edits.
    refreshStorageLayout();
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

  useEffect(() => {
    if (quickQuery.trim().length < 2) {
      setQuickResults([]);
      return;
    }
    setIsQuickSearching(true);
    const timer = setTimeout(() => {
      const q = quickQuery.toLowerCase();
      if (authUser?.office_id === "osas") {
        const results = organizations.filter(
          (o) =>
            (o.name || "").toLowerCase().includes(q) ||
            (o.acronym || "").toLowerCase().includes(q) ||
            (o.category || "").toLowerCase().includes(q) ||
            (o.adviser_name || "").toLowerCase().includes(q)
        ).map((o) => ({
          studentNo: o.id,
          acronym: o.acronym || o.id,
          name: o.name,
          category: o.category,
          room: o.storage_room || 1,
          cabinet: o.storage_cabinet || (o.category === "Academic" ? "ACADEMIC ORGANIZATIONS" : "NON-ACADEMIC ORGANIZATIONS"),
          drawer: o.storage_drawer || "1",
          isOrg: true,
          rawOrg: o,
        }));
        setQuickResults(results.slice(0, 10));
      } else {
        const results = students.filter(
          (s) =>
            s.studentNo.toLowerCase().includes(q) ||
            s.name.toLowerCase().includes(q),
        );
        setQuickResults(results.slice(0, 10));
      }
      setIsQuickSearching(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [quickQuery, students, organizations, authUser?.office_id]);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      /* ignore */
    }
    localStorage.setItem("pup-logout", Date.now());
    window.location.href = "/login";
  };

  const getStudentFolderYear = (s) => {
    const derived = getStudentNoYear(s.studentNo);
    if (derived != null) return derived;
    const fromDb = Number(s.yearLevel);
    return Number.isFinite(fromDb) ? fromDb : null;
  };

  const academicYearOptions = useMemo(() => {
    const combined = [...students, ...archivedStudents];
    const fromData = Array.from(
      new Set(
        combined
          .map((s) => getStudentFolderYear(s))
          .filter((y) => y != null)
          .map((y) => Number(y))
          .filter((y) => Number.isFinite(y) && y >= 2000 && y <= 2100),
      ),
    );
    return fromData.sort((a, b) => a - b);
  }, [students, archivedStudents]);

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

  const explorerItems = useMemo(() => {
    if (authUser?.office_id === "osas") {
      if (currentLevel === "categories" || currentLevel === "years") {
        const allOrgs = [...organizations, ...archivedOrganizations];
        const categories = Array.from(new Set(allOrgs.map((o) => o.category || "Academic")));
        if (categories.length === 0) {
          categories.push("Academic", "Non-Academic");
        }
        return categories.map((cat) => {
          const activeCount = organizations.filter((o) => (o.category || "Academic") === cat).length;
          const archCount = archivedOrganizations.filter((o) => (o.category || "Academic") === cat).length;
          return {
            key: cat,
            title: cat,
            subtitle: `${activeCount} Active · ${archCount} Archived`,
            icon: "ph-buildings",
            onClick: () => {
              setSelectedCategory(cat);
              setCurrentLevel("organizations");
            },
          };
        });
      }
      if (currentLevel === "organizations" || currentLevel === "students") {
        return organizations
          .filter((o) => (o.category || "Academic") === selectedCategory)
          .map((o) => ({
            key: o.id,
            org: o,
            student: {
              studentNo: o.id,
              acronym: o.acronym || o.id,
              name: o.name,
              room: o.storage_room || 1,
              cabinet: o.storage_cabinet || (o.category === "Academic" ? "ACADEMIC ORGANIZATIONS" : "NON-ACADEMIC ORGANIZATIONS"),
              drawer: o.storage_drawer || "1",
              status: o.status,
              category: o.category,
              adviser: o.adviser_name,
              activeOfficerCount: o.active_officer_count,
              proposalCount: o.proposal_count,
              hasCbl: Boolean(o.bylaws_storage_filename),
              bylawsStorageFilename: o.bylaws_storage_filename,
              rawOrg: o,
            },
          }));
      }
      return [];
    }

    if (currentLevel === "years") {
      const years = [...academicYearOptions].sort((a, b) => b - a);
      return years.map((y) => {
        const activeCount = students.filter((s) => getStudentFolderYear(s) === y).length;
        const archCount = archivedStudents.filter((s) => getStudentFolderYear(s) === y).length;
        return {
          key: String(y),
          title: `Year ${y}`,
          subtitle: `${activeCount} Active · ${archCount} Archived`,
          icon: "ph-calendar-blank",
          onClick: () => {
            setSelectedYear(y);
            setCurrentLevel("students");
          },
        };
      });
    }
    if (currentLevel === "students") {
      return students
        .filter((s) => getStudentFolderYear(s) === Number(selectedYear))
        .map((s) => ({ key: s.studentNo, student: s }));
    }
    return [];
  }, [
    authUser?.office_id,
    currentLevel,
    organizations,
    archivedOrganizations,
    selectedCategory,
    students,
    archivedStudents,
    selectedYear,
    academicYearOptions,
  ]);

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

  const activeStudentDocs = useMemo(
    () => {
      if (!activeStudent) return [];
      const orgId = activeStudent.rawOrg?.id || activeStudent.id || activeStudent.studentNo;
      const isOsas = authUser?.office_id === "osas";

      if (isOsas) {
        const docs = [];
        const bylawsFilename = activeStudent.bylawsStorageFilename || activeStudent.rawOrg?.bylaws_storage_filename;
        if (bylawsFilename) {
          docs.push({
            id: `cbl-${orgId}`,
            student_no: activeStudent.studentNo,
            student_name: activeStudent.name,
            doc_type: "Constitution & By-Laws (CBL)",
            original_filename: activeStudent.rawOrg?.bylaws_original_filename || "CBL.pdf",
            storage_filename: bylawsFilename,
            approval_status: "Approved",
            source_type: "bylaws",
            file_url: `/api/osas/organizations/${encodeURIComponent(orgId)}/bylaws?file=1`,
          });
        }
        const propDocs = staffDocs.filter((d) =>
          d.organization_id === orgId ||
          d.student_no === orgId ||
          d.student_no === activeStudent.studentNo ||
          (activeStudent.acronym && (d.student_no === activeStudent.acronym || d.org_acronym === activeStudent.acronym)) ||
          (d.organization_name && activeStudent.name && d.organization_name.toLowerCase().includes(activeStudent.name.toLowerCase()))
        );
        return [...docs, ...propDocs];
      }

      return staffDocs.filter((d) => d.student_no === activeStudent.studentNo);
    },
    [activeStudent, staffDocs, authUser?.office_id],
  );

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

      setPreview({
        docType,
        studentName: name,
        studentNo: no,
        docId: id,
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
    const handleZoomChange = (e) => {
      const { action } = e.detail || {};
      if (action === "in") setZoomNode((prev) => Math.min(6, prev + 1));
      else if (action === "out") setZoomNode((prev) => Math.max(0, prev - 1));
      else if (action === "reset") setZoomNode(3);
    };
    window.addEventListener("change-zoom", handleZoomChange);
    return () => window.removeEventListener("change-zoom", handleZoomChange);
  }, []);

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

    if (!skipQueue) {
      let newFiles = [];
      setUploadedFiles((prev) => {
        newFiles = [...prev, ...incomingFiles];
        setSelectedQueuedFileIndex(newFiles.length - incomingFiles.length);
        return newFiles;
      });
    }

    const activeFile = incomingFiles[0];
    setUploadedFile(activeFile);
    clearUploadFieldError("pdfFile");
    setOcrError("");
    setOcrSuggestion(null);

    if (uploadMode === "pdf" && !skipOcr) {
      // In merge mode (multiple pages), only run OCR autofill for the very first page.
      // We capture the queue length *before* the new file was enqueued (skipQueue path
      // bypasses the setUploadedFiles call, so we can rely on the pre-call snapshot).
      const wasQueueEmpty = uploadedFiles.length === 0;
      const isLeadPage = wasQueueEmpty || skipQueue;

      if (!isLeadPage) {
        console.log("[OCR] Skipping OCR autofill: not the lead page (page 2+).");
        return;
      }

      setOcrLoading(true);
      try {
        const isOsas = authUser?.office_id === "osas";
        const candidateEntities = isOsas
          ? organizations.map((o) => ({
              organizationId: o.id,
              studentNo: o.id,
              student_no: o.id,
              name: o.name,
              acronym: o.acronym,
              category: o.category,
              adviserName: o.adviser_name || o.adviserName,
              room: o.storage_room,
              cabinet: o.storage_cabinet,
              drawer: o.storage_drawer,
            }))
          : students;

        const { scanFileForSuggestion } = await import("@/lib/ocrClient");
        const suggestion = await scanFileForSuggestion({
          file: activeFile,
          students: candidateEntities,
          docTypes,
          rotation: rotationParam !== undefined ? rotationParam : rotation,
        });
        lastRotationOcrRef.current =
          rotationParam !== undefined ? rotationParam : rotation;
        setOcrSuggestion(suggestion);

        console.log("[OCR handleFileSelect] suggestion:", {
          name: suggestion.name,
          docType: suggestion.docType,
          matchedStudent: suggestion.matchedStudent?.organizationId || suggestion.matchedStudent?.studentNo || null,
          matchCount: suggestion.nameMatchesByName?.length,
          docTypesAvailable: docTypes,
        });

        const nameMatches = Array.isArray(suggestion.nameMatchesByName)
          ? suggestion.nameMatchesByName
          : [];
        const ambiguous = nameMatches.length > 1;

        if (suggestion.requiresConfirmation) {
          console.log("[OCR] → COORDINATE MATCH branch, requiring staff confirmation");
          setNewRec((p) => ({
            ...p,
            name: String(suggestion.name || p.name || "").trim().replace(/\s+/g, " ").toUpperCase(),
            docType: suggestion.docType != null && String(suggestion.docType).trim() !== "" ? String(suggestion.docType).trim() : p.docType,
          }));
          setUploadStudentIsExisting(false);
          clearAllUploadFieldErrors();
          setOcrPromptOpen(true);
        } else if (ambiguous) {
          console.log("[OCR] → AMBIGUOUS branch, setting docType:", suggestion.docType);
          setNewRec((p) => ({
            ...p,
            name: String(suggestion.name || p.name || "")
              .trim()
              .replace(/\s+/g, " ")
              .toUpperCase(),
            docType:
              suggestion.docType != null && String(suggestion.docType).trim() !== ""
                ? String(suggestion.docType).trim()
                : p.docType,
          }));
          setUploadStudentIsExisting(false);
          clearAllUploadFieldErrors();
          setOcrPromptOpen(true);
        } else if (suggestion.matchedStudent) {
          console.log("[OCR] → MATCHED STUDENT branch, setting docType:", suggestion.docType);
          applyStudentToPdfForm(suggestion.matchedStudent, suggestion.docType);
          setUploadStudentIsExisting(true);
          clearAllUploadFieldErrors();
          setOcrPromptOpen(false);
          checkDuplicate(
            suggestion.matchedStudent.organizationId ||
            suggestion.matchedStudent.id ||
            suggestion.matchedStudent.studentNo ||
            suggestion.matchedStudent.student_no,
            suggestion.docType
          );
        } else {
          console.log("[OCR] → NEW STUDENT / NEW ORG branch, setting docType:", suggestion.docType);
          setNewRec((p) => ({
            ...p,
            name: String(suggestion.name || p.name || "")
              .trim()
              .replace(/\s+/g, " ")
              .toUpperCase(),
            room: p.room || (isOsas ? "1" : ""),
            cabinet: p.cabinet || "",
            drawer: p.drawer || (isOsas ? "1" : ""),
            docType:
              suggestion.docType != null && String(suggestion.docType).trim() !== ""
                ? String(suggestion.docType).trim()
                : p.docType,
          }));
          setUploadStudentIsExisting(false);
          clearAllUploadFieldErrors();
          setOcrPromptOpen(false);
        }
      } catch (err) {
        setOcrLoading(false);
        const message =
          err?.message || "Automatic detection failed. Please fill manually.";
        setOcrError(message);
        showToast({ title: "OCR Failed", description: message }, true);
      } finally {
        setOcrLoading(false);
      }
    }
  };

  const handleRemoveQueuedFile = (indexToRemove) => {
    setUploadedFiles((prev) => {
      const next = prev.filter((_, idx) => idx !== indexToRemove);
      if (next.length === 0) {
        setUploadedFile(null);
        setSelectedQueuedFileIndex(0);
      } else {
        const nextIndex = Math.min(selectedQueuedFileIndex, next.length - 1);
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
    const cleanId = String(targetId).trim().toUpperCase();
    const cleanType = String(docType).trim().toUpperCase();

    const hasDuplicate = staffDocs.some(
      (d) =>
        (String(d.student_no || "").trim().toUpperCase() === cleanId ||
         String(d.organization_id || "").trim().toUpperCase() === cleanId) &&
        String(d.doc_type || "").trim().toUpperCase() === cleanType &&
        String(d.approval_status).toLowerCase() !== "declined"
    );

    if (hasDuplicate) {
      setDuplicateConfirmOpen(true);
    }
  }, [staffDocs]);

  const processSubmission = async ({ onSuccess } = {}) => {
    if (!uploadedFile) {
      setUploadFieldErrors({ pdfFile: true });
      showToast({ title: "No File Selected", description: "Attach a document before submitting." }, true);
      return;
    }

    if (uploadMode !== "pdf") {
      showToast({ title: "Wrong Mode", description: "Switch to the PDF upload tab to submit a document." }, true);
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
          showToast({ title: "Merging Failed", description: "Could not merge images into a PDF: " + convErr.message }, true);
          return;
        }
      } else {
        showToast({ title: "Multi-page Merge Warning", description: "Merging requires all selected files to be images. Uploading primary document." }, true);
        if (needsConversion(uploadedFile)) {
          try {
            fileToUpload = await imageToPdf(uploadedFile);
          } catch (convErr) {
            showToast({ title: "Conversion Failed", description: "Could not convert image to PDF." }, true);
            return;
          }
        }
      }
    } else if (needsConversion(uploadedFile)) {
      try {
        fileToUpload = await imageToPdf(uploadedFile);
      } catch (convErr) {
        showToast({ title: "Conversion Failed", description: "Could not convert image to PDF. Try uploading a PDF directly." }, true);
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

    const payload = new FormData();
    payload.append("file", fileToUpload, uploadFilename);

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
      if (!res.ok) throw new Error(data.error || "Upload failed");

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
      setUploadedFiles([]);
      setSelectedQueuedFileIndex(0);
      setUploadFieldErrors({});
      setUploadStudentIsExisting(false);
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
      showToast({ title: "Upload Failed", description: err.message }, true);
    }
  };

  const refreshDocuments = useCallback(
    async (form) => {
      setDocsLoading(true);
      setDocsError("");
      try {
        const trimmedNo = String(form.studentNo || "").trim().toLowerCase();
        const trimmedName = String(form.studentName || "").trim().toLowerCase();
        const selectedTypes = Array.isArray(form.docTypes) && form.docTypes.length > 0
          ? form.docTypes
          : (form.docType ? [form.docType] : []);
        const hasTypeFilter = selectedTypes.length > 0;

        if (!trimmedNo && !trimmedName && !hasTypeFilter) {
          setDocsRows(staffDocs.filter((doc) => doc.source_type === "event_proposal").map((doc) => ({
            id: doc.id,
            student_no: doc.student_no,
            student_name: doc.student_name,
            doc_type: doc.doc_type,
            status: "uploaded",
            verificationStatus: doc.approval_status === "Approved" ? "verified" : "unverified",
            doc,
            reviewDoc: doc,
          })));
          return;
        }

        // Find matching students by student no or name
        const matchingStudents = students.filter((s) => {
          const studentNo = String(s.studentNo || "").toLowerCase();
          const studentName = String(s.name || "").toLowerCase();
          const matchIdField = trimmedNo ? studentNo.includes(trimmedNo) : true;
          const matchNameField = trimmedName
            ? studentName.includes(trimmedName) || studentNo.includes(trimmedName)
            : true;
          return matchIdField && matchNameField;
        });

        if (matchingStudents.length === 0) {
          setDocsRows([]);
          return;
        }

        const rows = [];
        for (const student of matchingStudents) {
          const studentDocs = staffDocs.filter(
            (d) => String(d.student_no || "") === String(student.studentNo || "")
          );

          // 1. Show all ACTUAL documents the student has
          const seenTypes = new Set();
          for (const doc of studentDocs) {
            if (hasTypeFilter && !selectedTypes.includes(doc.doc_type)) continue;
            
            seenTypes.add(doc.doc_type);
            rows.push({
              id: doc.id,
              student_no: student.studentNo,
              student_name: student.name,
              doc_type: doc.doc_type,
              status: "uploaded",
              verificationStatus:
                doc.approval_status === "Approved" ? "verified" : "unverified",
              doc: doc,
              reviewDoc: doc,
            });
          }

          // 2. For missing documents, only show ACTIVE docTypes as placeholders
          for (const type of docTypes) {
            if (seenTypes.has(type)) continue; // Already added as "uploaded"
            if (hasTypeFilter && !selectedTypes.includes(type)) continue;

            rows.push({
              id: `missing-${student.studentNo}-${type}`,
              student_no: student.studentNo,
              student_name: student.name,
              doc_type: type,
              status: "missing",
              verificationStatus: "",
              doc: null,
              reviewDoc: null,
            });
          }
        }

        setDocsRows(rows);
      } catch (err) {
        console.error("[refreshDocuments] error:", err);
        setDocsError("Failed to load documents");
      } finally {
        setDocsLoading(false);
      }
    },
    [students, docTypes, staffDocs],
  );

  useEffect(() => {
    if (view !== "documents") return;
    refreshDocuments(docsForm);
  }, [
    view,
    staffDocs,
    docsForm.studentNo,
    docsForm.studentName,
    docsForm.docType,
    refreshDocuments,
    docsForm,
    ]);
  const handleRescan = useCallback(async (targetId, docType, docId, filename, mimeType) => {
    const isOsas = authUser?.office_id === "osas";
    if (isOsas) {
      const org = organizations.find(
        (x) =>
          String(x.id || "").trim().toLowerCase() === String(targetId || "").trim().toLowerCase() ||
          String(x.name || "").trim().toLowerCase() === String(targetId || "").trim().toLowerCase() ||
          String(x.acronym || "").trim().toLowerCase() === String(targetId || "").trim().toLowerCase()
      );
      if (org) {
        applyStudentToPdfForm(org, docType);
        setUploadStudentIsExisting(true);
      } else {
        setNewRec((p) => ({
          ...p,
          organizationId: targetId || "",
          name: targetId || "",
          docType: docType || "",
        }));
        setUploadStudentIsExisting(false);
      }
    } else {
      const s = students.find((x) => String(x.studentNo || x.student_no || "").trim().toUpperCase() === String(targetId || "").trim().toUpperCase());
      if (s) {
        applyStudentToPdfForm(s, docType);
        setUploadStudentIsExisting(true);
      } else {
        setNewRec((p) => ({
          ...p,
          studentNo: targetId || "",
          docType: docType || "",
        }));
        setUploadStudentIsExisting(false);
      }
    }
    clearAllUploadFieldErrors();
    setView("upload");

    if (docId) {
      try {
        const res = await fetch(`/api/documents/${docId}`);
        if (res.ok) {
          const blob = await res.blob();
          const file = new File([blob], filename || "document.pdf", {
            type: mimeType || "application/pdf",
          });
          setUploadedFile(file);
        }
      } catch (err) {
        console.error("Failed to preload rejected document for rescan:", err);
      }
    }
  }, [students, organizations, authUser?.office_id, applyStudentToPdfForm, clearAllUploadFieldErrors]);

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
    } catch (err) {
      showToast({ title: "Bulk Archival Failed", description: err.message }, true);
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
    } catch (err) {
      showToast({ title: "Bulk Restoration Failed", description: err.message }, true);
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
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col font-jakarta p-4 gap-4 transition-colors duration-300 dark:bg-background">
        <Skeleton className="h-16 w-full rounded-brand shrink-0" />
        <div className="flex-1 flex gap-4">
          <Skeleton className="w-[30%] h-full rounded-brand" />
          <Skeleton className="w-[70%] h-full rounded-brand" />
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen overflow-hidden flex flex-col bg-slate-50/30 dark:bg-zinc-950/30 font-jakarta relative transition-colors duration-300" style={{ "--brand-accent": brandAccent, "--brand-foreground": brandForeground }}>
      {/* Dynamic Liquid Glass Background Blobs */}
      <div className="liquid-container">
        <div className="liquid-blob liquid-blob-1"></div>
        <div className="liquid-blob liquid-blob-2"></div>
        <div className="liquid-blob liquid-blob-3"></div>
      </div>
      <Header authUser={authUser} onLogout={handleLogout} />

      <Tabs
        value={view}
        onValueChange={switchView}
        orientation={authUser?.preferences?.navigation_layout === "topbar" ? "horizontal" : "vertical"}
        className={cn("flex-1 w-full gap-0 relative flex min-h-0 overflow-hidden", authUser?.preferences?.navigation_layout === "topbar" ? "flex-col" : "flex-row")}
      >
        {authUser?.preferences?.navigation_layout === "topbar" ? (
          <div className="w-full bg-white dark:bg-zinc-900 border-b border-gray-200 dark:border-white/5 py-2.5 px-4 flex items-center justify-center gap-2 overflow-x-auto shadow-xs select-none shrink-0 scrollbar-none">
            {sidebarItems.map((item, idx) => {
              if (item.type === "header") {
                return (
                  <div key={`header-${idx}`} className="text-[9px] font-semibold tracking-widest text-gray-400 dark:text-zinc-500 whitespace-nowrap ml-4 first:ml-0 border-l border-gray-200 dark:border-white/5 pl-4 first:border-0 first:pl-0">
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
                  <HugeIcon  className={cn(item.iconClass, "text-sm")}></HugeIcon>
                  {item.label}
                  {item.badge > 0 && (
                    <span 
                      className="inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-semibold"
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
            accentColor={brandAccent}
            officeName={authUser?.office_name}
            authUser={authUser}
          />
        )}
        <main className="flex-1 relative w-full min-w-0 min-h-0 bg-white/25 dark:bg-zinc-950/25 overflow-y-auto backdrop-blur-xs">
          <div 
            className="flex-1 p-4 flex flex-col min-h-0 w-full"
            style={{ transform: `scale(${[0.94, 1.04, 1.15, 1.25, 1.35, 1.46, 1.56][zoomNode]})`, transformOrigin: 'top left', width: `${100 / [0.94, 1.04, 1.15, 1.25, 1.35, 1.46, 1.56][zoomNode]}%`, minHeight: `${100 / [0.94, 1.04, 1.15, 1.25, 1.35, 1.46, 1.56][zoomNode]}%` }}
          >
            <TabsContent value="students" className="h-full m-0 border-0 focus-visible:ring-0">
            <StudentDirectoryTab
              authUser={authUser}
              loading={!storageLayout || loading}
              students={students}
              archivedStudents={archivedStudents}
              courses={courses}
              sections={sections}
              storageLayout={storageLayout}
              allDocs={allDocs}
              onLocateStudent={locateStudent}
              onPreviewDocument={handlePreviewDocument}
              fetchData={fetchData}
              showToast={showToast}
            />
          </TabsContent>

          <TabsContent value="search" className="h-full m-0 border-0 focus-visible:ring-0">
            <RecordsArchiveTab
              loading={!storageLayout}
              quickQuery={quickQuery}
              setQuickQuery={setQuickQuery}
              isQuickSearching={isQuickSearching}
              quickResults={quickResults}
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
              students={authUser?.office_id === "osas" ? organizations.map((o) => ({
                studentNo: o.id,
                acronym: o.acronym || o.id,
                name: o.name,
                room: o.storage_room || 1,
                cabinet: o.storage_cabinet || (o.category === "Academic" ? "ACADEMIC ORGANIZATIONS" : "NON-ACADEMIC ORGANIZATIONS"),
                drawer: o.storage_drawer || "1",
                category: o.category,
                adviser: o.adviser_name,
                activeOfficerCount: o.active_officer_count,
                proposalCount: o.proposal_count,
                hasCbl: Boolean(o.bylaws_storage_filename),
                bylawsStorageFilename: o.bylaws_storage_filename,
                rawOrg: o,
              })) : students}
              archivedStudents={authUser?.office_id === "osas" ? archivedOrganizations.map((o) => ({
                studentNo: o.id,
                acronym: o.acronym || o.id,
                name: o.name,
                room: o.storage_room || 1,
                cabinet: o.storage_cabinet || (o.category === "Academic" ? "ACADEMIC ORGANIZATIONS" : "NON-ACADEMIC ORGANIZATIONS"),
                drawer: o.storage_drawer || "1",
                category: o.category,
                adviser: o.adviser_name,
                activeOfficerCount: o.active_officer_count,
                proposalCount: o.proposal_count,
                hasCbl: Boolean(o.bylaws_storage_filename),
                bylawsStorageFilename: o.bylaws_storage_filename,
                rawOrg: o,
              })) : archivedStudents}
              staffDocs={authUser?.office_id === "osas" ? staffDocs : staffDocs.filter((doc) => doc.source_type !== "event_proposal")}
              officeLabel={authUser?.office_id === "osas" ? "OSAS" : "Registrar"}
              explorerItems={explorerItems}
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
                  showToast({ title: "Restore Failed", description: err.message }, true);
                }
              }}
              selectedIds={selectedStudentIds}
              onSelectionChange={setSelectedStudentIds}
              onBulkArchive={() => setBulkArchiveOpen(true)}
              onBulkRestore={() => setBulkRestoreOpen(true)}
            />
          </TabsContent>

          <TabsContent value="storage" className="h-full m-0 border-0 focus-visible:ring-0">
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
          </TabsContent>

          <TabsContent value="upload" className="h-full m-0 border-0 focus-visible:ring-0">
            <ScanUploadTab
              authUser={authUser}
              loading={!storageLayout}
              uploadMode={uploadMode}
              uploadStudentIsExisting={uploadStudentIsExisting}
              setUploadStudentIsExisting={setUploadStudentIsExisting}
              setUploadMode={(m) => {
                setUploadMode(m);
                setUploadError("");
                setCsvError("");
              }}
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
                setUploadedFiles([]);
                setSelectedQueuedFileIndex(0);
                setOcrSuggestion(null);
                setUploadStudentIsExisting(false);
                setUploadFieldErrors({});
                setRotation(0);
              }}
              ocrLoading={ocrLoading}
              ocrError={ocrError}
              ocrSuggestion={ocrSuggestion}
              csvFile={csvFile}
              csvRows={csvRows}
              csvSelected={csvSelected}
              toggleCsvSelectAll={(c) => {
                const n = {};
                if (c) csvRows.forEach((r) => (n[r.index] = true));
                setCsvSelected(n);
              }}
              toggleCsvRowSelected={(i) =>
                setCsvSelected((p) => ({ ...p, [i]: !p[i] }))
              }
              setCsvRowField={(i, f, v) => {
                const n = [...csvRows];
                const r = n.find((x) => x.index === i);
                if (r) {
                  if (r.student) r.student[f] = v;
                  if (r.organization) r.organization[f] = v;
                }
                setCsvRows(n);
              }}
              courses={courses}
              docTypes={docTypes}
              processSubmission={processSubmission}
              uploadFieldErrors={uploadFieldErrors}
              clearUploadFieldError={clearUploadFieldError}
              clearAllUploadFieldErrors={clearAllUploadFieldErrors}
              uploadError={uploadError}
              newRec={newRec}
              setNewRec={setNewRec}
              newRecStudentNoHint={newRecStudentNoHint}
              setNewRecStudentNoTouched={setNewRecStudentNoTouched}
              applyStudentNoMask={applyStudentNoMask}
              newStudentNoInputRef={newStudentNoInputRef}
              sysSections={availableSectionsForNewRecord}
              storageLayout={storageLayout}
              csvInputRef={csvInputRef}
              handleCsvFileSelect={(f) => {
                if (!f) {
                  setCsvFile(null);
                  setCsvRows([]);
                  setCsvResults([]);
                  setCsvError("");
                  setCsvSelected({});
                  if (csvInputRef.current) csvInputRef.current.value = "";
                  return;
                }
                setCsvFile(f);
                setCsvResults([]);
                setCsvError("");
                setCsvLoading(true);
                const r = new FileReader();
                r.onload = (e) => {
                  const lines = e.target.result.split(/\r?\n/);
                  const headers = lines[0]
                    .split(",")
                    .map((h) => h.trim().toLowerCase().replace(/\s+/g, ""));
                  
                  if (isOsas) {
                    const rows = lines
                      .slice(1)
                      .filter((l) => l.trim())
                      .map((l, i) => {
                        const vals = l.split(",");
                        const row = {};
                        headers.forEach((h, idx) => (row[h] = vals[idx]?.trim()));
                        const name = row.organization || row.name || row.organizationname || "";
                        const acronym = (row.acronym || "").toUpperCase();
                        const category = row.category || "Academic";
                        const adviserName = row.adviser || row.advisername || "";
                        const adviserEmail = row.email || row.adviseremail || "";
                        const room = parseInt(row.room) || 1;
                        const defaultCab = category.toLowerCase().includes("non-academic") ? "NON-ACADEMIC ORGANIZATIONS" : "ACADEMIC ORGANIZATIONS";
                        const cabinet = row.cabinet || defaultCab;
                        const drawer = parseInt(row.drawer) || 1;
                        return {
                          index: i + 1,
                          organization: {
                            name,
                            acronym,
                            category,
                            adviserName,
                            adviserEmail,
                            room,
                            cabinet,
                            drawer,
                          },
                          student: {
                            studentNo: acronym || `ORG-${i + 1}`,
                            name,
                            courseCode: acronym,
                            yearLevel: 1,
                            section: category,
                            room,
                            cabinet,
                            drawer,
                          },
                          error: "",
                        };
                      });
                    setCsvRows(rows);
                    const defaultSelection = {};
                    rows.forEach((row) => {
                      defaultSelection[row.index] = true;
                    });
                    setCsvSelected(defaultSelection);
                    setCsvLoading(false);
                    return;
                  }

                  // Use first valid location from layout as fallback if CSV data is missing/invalid
                  const defaultRoomId = storageLayout?.rooms?.[0]?.id || 1;
                  const defaultCabId = storageLayout?.rooms?.[0]?.cabinets?.[0]?.id || "A";
                  const defaultDrawerId = storageLayout?.rooms?.[0]?.cabinets?.[0]?.drawerIds?.[0] || 1;

                  const rows = lines
                    .slice(1)
                    .filter((l) => l.trim())
                    .map((l, i) => {
                      const vals = l.split(",");
                      const row = {};
                      headers.forEach((h, idx) => (row[h] = vals[idx]?.trim()));
                      return {
                        index: i + 1,
                        student: {
                          studentNo: row.studentno || row.student_no || "",
                          name: row.name || "",
                          courseCode: (row.coursecode || row.course || "").toUpperCase(),
                          yearLevel:
                            parseInt(row.academicyear || row.yearlevel || row.year) || 1,
                          section: row.section,
                          room: parseInt(row.room) || defaultRoomId,
                          cabinet: row.cabinet || defaultCabId,
                          drawer: parseInt(row.drawer) || defaultDrawerId,
                        },
                        error: "",
                      };
                    });
                  setCsvRows(rows);
                  const defaultSelection = {};
                  rows.forEach((row) => {
                    defaultSelection[row.index] = true;
                  });
                  setCsvSelected(defaultSelection);
                  setCsvLoading(false);
                };
                r.readAsText(f);
              }}
              csvDropActive={csvDropActive}
              setCsvDropActive={setCsvDropActive}
              csvError={csvError}
              csvBulkRoom={csvBulkRoom}
              setCsvBulkRoom={setCsvBulkRoom}
              csvBulkCabinet={csvBulkCabinet}
              setCsvBulkCabinet={setCsvBulkCabinet}
              csvBulkDrawer={csvBulkDrawer}
              setCsvBulkDrawer={setCsvBulkDrawer}
              applyCsvBulkLocation={() => {
                const n = [...csvRows];
                n.forEach((r) => {
                  if (csvSelected[r.index]) {
                    if (csvBulkRoom) {
                      if (r.student) r.student.room = parseInt(csvBulkRoom);
                      if (r.organization) r.organization.room = parseInt(csvBulkRoom);
                    }
                    if (csvBulkCabinet) {
                      if (r.student) r.student.cabinet = csvBulkCabinet;
                      if (r.organization) r.organization.cabinet = csvBulkCabinet;
                    }
                    if (csvBulkDrawer) {
                      if (r.student) r.student.drawer = parseInt(csvBulkDrawer);
                      if (r.organization) r.organization.drawer = parseInt(csvBulkDrawer);
                    }
                  }
                });
                setCsvRows(n);
              }}
              setCsvSelected={setCsvSelected}
              importCsvStudents={async () => {
                const targets = csvRows.filter((r) => csvSelected[r.index]);
                if (targets.length === 0) {
                  setCsvError("No selected rows to import. Select at least one row.");
                  showToast({ title: "No Rows Selected", description: "Select at least one row from the CSV to import." }, true);
                  return;
                }
                setCsvLoading(true);
                try {
                  if (isOsas) {
                    const rs = await fetch("/api/osas/organizations/batch", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        rows: targets.map((t) => t.organization || t.student),
                      }),
                    });
                    const json = await rs.json().catch(() => null);
                    if (!rs.ok || !json?.ok || !Array.isArray(json?.data)) {
                      throw new Error(json?.error || "Batch import failed");
                    }

                    const res = json.data;
                    setCsvResults(res);
                    const byIndex = new Map(res.map((item, idx) => [targets[idx]?.index, item]));
                    const nextRows = csvRows.map((row) => {
                      const result = byIndex.get(row.index);
                      if (!result) return row;
                      return {
                        ...row,
                        error: result.ok ? "" : String(result.error || "Import failed"),
                      };
                    });
                    setCsvRows(nextRows);

                    const orgsRes = await fetch("/api/osas/organizations").then(r => r.json()).catch(() => null);
                    if (orgsRes?.ok && Array.isArray(orgsRes.data)) {
                      setOrganizations(orgsRes.data);
                    }

                    const successCount = res.filter((r) => r.ok).length;
                    const failCount = res.length - successCount;

                    if (successCount === res.length) {
                      showToast({
                        title: "Import Successful",
                        description: `Successfully registered all ${res.length} student organizations.`,
                      });
                      setCsvFile(null);
                      setCsvRows([]);
                      setCsvResults([]);
                      if (csvInputRef.current) csvInputRef.current.value = "";
                    } else if (successCount > 0) {
                      showToast(
                        {
                          title: "Partial Import",
                          description: `${successCount} organizations registered, ${failCount} skipped.`,
                        },
                        "warning"
                      );
                    } else {
                      showToast(
                        {
                          title: "No Records Added",
                          description: "All selected entries failed validation.",
                        },
                        "warning"
                      );
                    }

                    setCsvError("");
                    setCsvSelected({});
                    fetchData();
                    return;
                  }

                  const rs = await fetch("/api/students/batch", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      rows: targets.map((t) => t.student),
                    }),
                  });
                  const json = await rs.json().catch(() => null);
                  if (!rs.ok || !json?.ok || !Array.isArray(json?.data)) {
                    throw new Error(json?.error || "Batch import failed");
                  }

                  const res = json.data;
                  setCsvResults(res);

                  const byIndex = new Map(
                    res.map((item, idx) => [targets[idx]?.index, item])
                  );
                  const nextRows = csvRows.map((row) => {
                    const result = byIndex.get(row.index);
                    if (!result) return row;
                    return {
                      ...row,
                      error: result.ok ? "" : String(result.error || "Import failed"),
                    };
                  });
                  setCsvRows(nextRows);

                  const createdRows = res
                    .filter((r) => r.ok && r.data)
                    .map((r) => normalizeStudentRow(r.data));
                  if (createdRows.length > 0) {
                    setStudents((prev) => {
                      const map = new Map(prev.map((s) => [s.studentNo, s]));
                      createdRows.forEach((row) => {
                        const key = row.studentNo;
                        map.set(key, row);
                      });
                      return Array.from(map.values());
                    });
                  }

                  const successCount = res.filter((r) => r.ok).length;
                  const failCount = res.length - successCount;

                  if (successCount === res.length) {
                    showToast({ 
                      title: "Import Successful", 
                      description: `Successfully added all ${res.length} student records.` 
                    });
                    // Clear CSV preview after fully successful import.
                    setCsvFile(null);
                    setCsvRows([]);
                    setCsvResults([]);
                    if (csvInputRef.current) csvInputRef.current.value = "";
                  } else if (successCount > 0) {
                    showToast(
                      { 
                        title: "Partial Import", 
                        description: `${successCount} records added, ${failCount} skipped (duplicates or invalid).` 
                      },
                      "warning"
                    );
                  } else {
                    showToast(
                      { 
                        title: "No Records Added", 
                        description: `All ${failCount} selected entries already exist or contain errors.` 
                      },
                      "warning"
                    );
                  }

                  setCsvError("");
                  setCsvSelected({});
                  // Keep data in sync in background even after optimistic in-memory update.
                  fetchData();
                } catch (err) {
                  setCsvError(err?.message || "Batch import failed");
                  showToast({ title: "Import Failed", description: err?.message || "Batch import encountered an error." }, true);
                } finally {
                  setCsvLoading(false);
                }
              }}
              csvLoading={csvLoading}
              csvResults={csvResults}
              students={students}
              organizations={organizations}
              showToast={showToast}
              onIngestPromoted={() => {
                fetchAllDocs();
                fetchData();
              }}
              onSelectExistingStudent={(student, ocrDocType) => {
                applyStudentToPdfForm(student, ocrDocType || null);
                setUploadStudentIsExisting(true);
                clearAllUploadFieldErrors();
                setOcrPromptOpen(false);
                checkDuplicate(student.organizationId || student.id || student.studentNo || student.student_no, ocrDocType);
              }}
              onOpenBatchReview={() => switchView("batch_review")}
            />
          </TabsContent>

          <TabsContent value="batch_review" className="h-full m-0 border-0 focus-visible:ring-0">
            <BatchReviewTab showToast={showToast} students={students} docTypes={docTypes} />
          </TabsContent>

          <TabsContent value="requests" className="h-full m-0 border-0 focus-visible:ring-0">
            <DocumentRequestsTab
              students={students}
              courses={courses}
              docTypes={docTypes}
              staffDocs={staffDocs}
              onLocateOnMap={goToStorageMapFromRequest}
              showToast={showToast}
            />
          </TabsContent>

          <TabsContent value="osas_monitoring" className="h-full m-0 border-0 focus-visible:ring-0">
            <OsasMonitoringTab showToast={showToast} />
          </TabsContent>

          <TabsContent value="organizations" className="h-full m-0 border-0 focus-visible:ring-0">
            <StudentOrganizationsTab showToast={showToast} />
          </TabsContent>

          <TabsContent value="documents" className="h-full m-0 border-0 focus-visible:ring-0">
            <DocumentsTab
              docsForm={docsForm}
              setDocsForm={setDocsForm}
              refreshDocuments={refreshDocuments}
              docTypes={docTypes}
              courses={courses}
              storageLayout={storageLayout}
              docsLoading={docsLoading}
              docsError={docsError}
              docsRows={docsRows}
              onRescan={handleRescan}
              onUpdateStudent={async (studentNo, data) => {
                try {
                  const res = await fetch(`/api/students/${encodeURIComponent(studentNo)}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(data),
                  });
                  const json = await res.json().catch(() => null);
                  if (!res.ok || !json?.ok) {
                    throw new Error(json?.error || "Failed to update student profile");
                  }
                  showToast({ title: "Profile Updated", description: `Student ${studentNo} has been updated.` });
                  fetchData();
                  // Re-run the current search to update names/codes in the table
                  refreshDocuments(docsForm);
                } catch (err) {
                  showToast({ title: "Update Failed", description: err.message }, true);
                }
              }}
              onArchiveStudent={async (studentNo) => {
                try {
                  const res = await fetch(`/api/students/${encodeURIComponent(studentNo)}`, {
                    method: "DELETE",
                  });
                  const json = await res.json().catch(() => null);
                  if (!res.ok || !json?.ok) {
                    throw new Error(json?.error || "Failed to archive student record");
                  }
                  setSelectedStudentIds((prev) => {
                    if (!prev.has(studentNo)) return prev;
                    const next = new Set(prev);
                    next.delete(studentNo);
                    return next;
                  });
                  showToast({ title: "Record Archived", description: `Student ${studentNo} and their documents are now hidden.` });
                  // Clear search to hide the archived student
                  const cleared = { studentNo: "", studentName: "", docType: "" };
                  setDocsForm(cleared);
                  refreshDocuments(cleared);
                  fetchData();
                } catch (err) {
                  showToast({ title: "Archive Failed", description: err.message }, true);
                }
              }}
              currentStudent={(() => {
                const uniqueNo = Array.from(new Set(docsRows.map(r => r.student_no)));
                const targetNo = uniqueNo.length === 1 ? uniqueNo[0] : docsForm.studentNo;
                if (!targetNo) return null;
                return (
                  students.find(s => s.studentNo === targetNo) || 
                  archivedStudents.find(s => s.studentNo === targetNo) ||
                  null
                );
              })()}
            />
          </TabsContent>

          <TabsContent value="notifications" className="h-full m-0 border-0 focus-visible:ring-0">
            <NotificationsTab
              onUnreadChange={(n) => setNotificationsUnread(Number(n || 0))}
              onPreviewDocument={handlePreviewDocument}
              onRescan={handleRescan}
            />
          </TabsContent>
          </div>
        </main>
      </Tabs>

      <PDFPreviewModal
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        preview={preview}
      />
      <OCRPromptModal
        open={ocrPromptOpen}
        onClose={() => setOcrPromptOpen(false)}
        ocrSuggestion={ocrSuggestion}
        onConfirmStudent={(s) => {
          applyStudentToPdfForm(s, ocrSuggestion?.docType);
          setUploadStudentIsExisting(true);
          clearAllUploadFieldErrors();
          setOcrPromptOpen(false);
          checkDuplicate(s.organizationId || s.id || s.studentNo || s.student_no, ocrSuggestion?.docType);
        }}
      />
      <ConfirmModal
        open={duplicateConfirmOpen}
        title="Duplicate Document Warning"
        message={authUser?.office_id === "osas"
          ? `A document of type "${newRec.docType}" already exists for organization ${newRec.acronym || newRec.name || newRec.organizationId}.`
          : `A document of type "${newRec.docType}" already exists for student ${newRec.studentNo}.`}
        confirmLabel="Acknowledge"
        cancelLabel="Clear"
        onConfirm={() => {
          setDuplicateConfirmOpen(false);
        }}
        onCancel={() => {
          setDuplicateConfirmOpen(false);
          setUploadedFile(null);
          setUploadedFiles([]);
          setSelectedQueuedFileIndex(0);
          setOcrSuggestion(null);
          setUploadStudentIsExisting(false);
          setUploadFieldErrors({});
          setRotation(0);
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
        }}
        variant="warning"
      />
      <ConfirmModal
        open={bulkArchiveOpen}
        title="Confirm Bulk Archival"
        message={authUser?.office_id === "osas"
          ? `You are about to move ${selectedStudentIds.size} student organization(s) to the system archive.`
          : `You are about to move ${selectedStudentIds.size} student record(s) to the system archive. This will disable associated processing for these records.`}
        confirmLabel="Archive"
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
        confirmLabel="Restore"
        selectedItems={Array.from(selectedStudentIds)}
        onConfirm={confirmBulkRestore}
        onCancel={() => setBulkRestoreOpen(false)}
        loading={bulkRestoreLoading}
        variant="success"
        isRestoreModal={true}
      />
    </div>
  );
}

export default function StaffPage() {
  return (
    <StaffGuard>
      <Suspense
        fallback={
          <div className="min-h-screen bg-gray-50 dark:bg-background flex items-center justify-center font-jakarta p-4">
            <div className="flex flex-col items-center gap-4">
              <div className="h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-t-pup-maroon dark:border-zinc-800 dark:border-t-primary"></div>
              <p className="text-xs font-semibold tracking-widest text-gray-400 dark:text-zinc-500 uppercase">Loading System...</p>
            </div>
          </div>
        }
      >
        <StaffPageContent />
      </Suspense>
    </StaffGuard>
  );
}
