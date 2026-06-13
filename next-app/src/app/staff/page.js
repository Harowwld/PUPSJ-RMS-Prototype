"use client";

import { useState, useEffect, useMemo, useRef, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTheme } from "next-themes";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import Sidebar from "@/components/shared/Sidebar";
import { toast } from "sonner";
import { StaffGuard } from "@/components/shared/AuthGuard";
import RecordsArchiveTab from "@/components/staff/RecordsArchiveTab";
import ScanUploadTab from "@/components/staff/ScanUploadTab";
import DocumentsTab from "@/components/staff/DocumentsTab";
import NotificationsTab from "@/components/staff/NotificationsTab";
import DocumentRequestsTab from "@/components/staff/DocumentRequestsTab";
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
import { scanFileForSuggestion, warmupOcrWorker, splitNameComponents } from "@/lib/ocrClient";
import { findMatchingDocument } from "@/lib/docAvailability";
import { imageToPdf, needsConversion, mergeImagesToPdf } from "@/lib/imageToPdf";
import { canonicalizeCabinetId } from "@/lib/storageLayoutUtils";
import { cn } from "@/lib/utils";


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



function StaffPageContent() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const searchParams = useSearchParams();
  const coreDataLoadedRef = useRef(false);
  const docsLoadedRef = useRef(false);

  const validViews = ["requests", "upload", "documents", "notifications", "search"];
  const initialView = validViews.includes(searchParams?.get("view"))
    ? searchParams.get("view")
    : "requests";

  const [view, setView] = useState(initialView);
  const [authUser, setAuthUser] = useState(null);

  const switchView = useCallback((nextView) => {
    setView(nextView);
    // Update URL without a full refresh
    const params = new URLSearchParams(window.location.search);
    params.set("view", nextView);
    router.replace(`${window.location.pathname}?${params.toString()}`, { scroll: false });
  }, [router]);

  useEffect(() => {
    const tab = String(searchParams?.get("view") || searchParams?.get("tab") || "").trim()
    const allowedTabs = new Set(["requests", "upload", "documents", "notifications", "search"])
    if (allowedTabs.has(tab)) {
      setView(tab)
    }
  }, [searchParams])
  const [loading, setLoading] = useState(true);
  const [notificationsUnread, setNotificationsUnread] = useState(0);

  const [students, setStudents] = useState([]);
  const [archivedStudents, setArchivedStudents] = useState([]);
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
      const [sRes, aRes, dRes, cRes, secRes, layoutRes] = await Promise.all([
        fetch("/api/students"),
        fetch("/api/students?includeArchived=true"),
        fetch("/api/doc-types"),
        fetch("/api/courses"),
        fetch("/api/sections"),
        fetch("/api/storage-layout"),
      ]);
      const [sData, aData, dData, cData, secData, layoutData] = await Promise.all([
        sRes.json(),
        aRes.json(),
        dRes.json(),
        cRes.json(),
        secRes.json(),
        layoutRes.json(),
      ]);
      
      setStudents((Array.isArray(sData.data) ? sData.data : []).map(normalizeStudentRow));
      
      const allFetched = Array.isArray(aData.data) ? aData.data : [];
      setArchivedStudents(
        allFetched
          .filter(s => s.status !== "Active")
          .map(normalizeStudentRow)
      );

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
      const res = await fetch("/api/documents?excludeDeclined=1&limit=500");
      const data = await res.json();
      setAllDocs(Array.isArray(data.data) ? data.data : []);
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
    (async () => {
      try {
        const res = await fetch("/api/auth/me");
        const json = await res.json().catch(() => null);
        if (!res.ok || !json?.ok) {
          if (res.status === 401) {
            router.push("/");
          }
          return;
        }
        setAuthUser(json.data);
        if (json.data?.preferences?.theme) {
          setTheme(json.data.preferences.theme);
        }
        // Render first, then hydrate data in background.
        setLoading(false);
        setTimeout(() => {
          fetchData();
          fetchAllDocs();
          fetchNotificationsUnread();
          warmupOcrWorker().catch(() => {
            // Keep silent; OCR path will show explicit errors on scan.
          });
        }, 0);
      } catch (err) {
        console.error("[StaffPage] Profile fetch failed:", err);
      }
    })();
  }, [router, fetchData, fetchAllDocs, fetchNotificationsUnread]);

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
      const roomDef = rooms.find((r) => r.id === selectedRoom);
      if (!roomDef) {
        // Selected room removed -> fallback.
        setSelectedRoom(rooms[0].id);
        setSelectedCabinet(null);
        setCurrentLocatorLevel("cabinets");
        return;
      }

      // If cabinet selected but removed, fallback to first cabinet (or null).
      if (selectedCabinet) {
        const exists = roomDef.cabinets?.some((c) => c.id === selectedCabinet);
        if (!exists) {
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
      const results = students.filter(
        (s) =>
          s.studentNo.toLowerCase().includes(q) ||
          s.name.toLowerCase().includes(q),
      );
      setQuickResults(results.slice(0, 10));
      setIsQuickSearching(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [quickQuery, students]);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      /* ignore */
    }
    localStorage.setItem("pup-logout", Date.now());
    router.push("/");
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
    const list = [{ level: "years", label: "Years" }];
    if (selectedYear) {
      list.push({ level: "students", label: `Year ${selectedYear}` });
    }
    return list;
  }, [selectedYear]);

  const explorerItems = useMemo(() => {
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
  }, [currentLevel, students, archivedStudents, selectedYear, academicYearOptions]);

  const staffDocs = useMemo(
    () =>
      allDocs.filter((d) => String(d?.approval_status || "") !== "Declined"),
    [allDocs],
  );

  const locatorModel = useMemo(() => {
    if (!storageLayout?.rooms?.length) return { kind: "none" };

    if (currentLocatorLevel === "rooms") {
      return {
        kind: "rooms",
        title: "PUP Storage Rooms",
        rooms: storageLayout.rooms.map((r) => ({
          room: r.id,
          occupiedCount: students.filter((s) => s.room === r.id).length,
          isTarget: activeStudent?.room === r.id,
        })),
      };
    }
    if (currentLocatorLevel === "cabinets") {
      const roomDef = storageLayout.rooms.find((r) => r.id === selectedRoom);
      if (!roomDef) return { kind: "cabinets", cabinets: [] };
      return {
        kind: "cabinets",
        room: selectedRoom,
        roomDoor: roomDef.door || null,
        cabinets: roomDef.cabinets.map((c) => {
          const normCab = String(c.id);
          return {
            cab: normCab,
            occupiedCount: students.filter(
              (s) => s.room === selectedRoom && s.cabinet === normCab,
            ).length,
            isTarget:
              activeStudent?.room === selectedRoom &&
              activeStudent?.cabinet === normCab,
            rect: c.rect,
            rotation: c.rotation || 0,
            drawerIds: c.drawerIds,
          };
        }),
      };
    }
    if (currentLocatorLevel === "drawers") {
      const roomDef = storageLayout.rooms.find((r) => r.id === selectedRoom);
      const cabinetDef = roomDef?.cabinets?.find(
        (c) => String(c.id) === selectedCabinet
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
        cabinet: selectedCabinet,
        roomDoor: roomDef?.door || null,
        cabinetRect: cabinetDef.rect,
        cabinets: roomDef.cabinets.map((c) => {
          const normCab = String(c.id);
          return {
            cab: normCab,
            occupiedCount: students.filter(
              (s) => s.room === selectedRoom && s.cabinet === normCab,
            ).length,
            isTarget:
              activeStudent?.room === selectedRoom &&
              activeStudent?.cabinet === normCab,
            rect: c.rect,
            rotation: c.rotation || 0,
            drawerIds: c.drawerIds,
          };
        }),
        drawers: cabinetDef.drawerIds.map((d) => {
          const drawerStudents = students.filter(
            (s) =>
              s.room === selectedRoom &&
              s.cabinet === selectedCabinet &&
              s.drawer === d
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
              activeStudent?.room === selectedRoom &&
              activeStudent?.cabinet === selectedCabinet &&
              activeStudent?.drawer === d,
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
    activeStudent,
    storageLayout,
    staffDocs,
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
    () =>
      activeStudent
        ? staffDocs.filter((d) => d.student_no === activeStudent.studentNo)
        : [],
    [activeStudent, staffDocs],
  );

  const locateStudent = useCallback((s) => {
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
    setActiveStudent(s);
    setSelectedRoom(s.room);
    setSelectedCabinet(s.cabinet);
    setCurrentLocatorLevel("drawers");
  }, []);

  const goToStorageMapFromRequest = useCallback(
    (studentRow) => {
      locateStudent(studentRow);
      setView("search");
    },
    [locateStudent],
  );

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
  }, []);

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
        const suggestion = await scanFileForSuggestion({
          file: activeFile,
          students,
          docTypes,
          rotation: rotationParam !== undefined ? rotationParam : rotation,
        });
        lastRotationOcrRef.current =
          rotationParam !== undefined ? rotationParam : rotation;
        setOcrSuggestion(suggestion);

        console.log("[OCR handleFileSelect] suggestion:", {
          name: suggestion.name,
          docType: suggestion.docType,
          matchedStudent: suggestion.matchedStudent?.studentNo || null,
          matchCount: suggestion.nameMatchesByName?.length,
          docTypesAvailable: docTypes,
        });

        const nameMatches = Array.isArray(suggestion.nameMatchesByName)
          ? suggestion.nameMatchesByName
          : [];
        const ambiguous = nameMatches.length > 1;

        if (ambiguous) {
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
          checkDuplicate(suggestion.matchedStudent.studentNo || suggestion.matchedStudent.student_no, suggestion.docType);
        } else {
          console.log("[OCR] → NEW STUDENT branch, setting docType:", suggestion.docType);
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

  const checkDuplicate = useCallback((studentNo, docType) => {
    if (!studentNo || !docType) return;
    const cleanNo = String(studentNo).trim().toUpperCase();
    const cleanType = String(docType).trim().toUpperCase();

    const hasDuplicate = staffDocs.some(
      (d) =>
        String(d.student_no).trim().toUpperCase() === cleanNo &&
        String(d.doc_type).trim().toUpperCase() === cleanType &&
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

    // Validation first to ensure we have meaningful metadata for renaming
    const err = {};
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

    if (Object.keys(err).length) {
      setUploadFieldErrors(err);
      showToast({ 
        title: uploadStudentIsExisting ? "Missing Fields" : "Incomplete Form", 
        description: uploadStudentIsExisting ? "Provide the student number and document type." : "All student detail fields are required." 
      }, true);
      return;
    }
    setUploadFieldErrors({});

    // Convert image files to PDF before uploading (API only accepts PDFs)
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

    // RENAME FILE for meaningful identification: [STUDENT_NO]_[DOC_TYPE].[EXT]
    try {
      const studentNo = String(newRec.studentNo || "").trim().toUpperCase();
      const docType = String(newRec.docType || "").trim();
      const cleanStudentNo = studentNo.replace(/[^a-zA-Z0-9-]/g, "_") || "UNKNOWN";
      const cleanDocType = docType.replace(/[^a-zA-Z0-9-]/g, "_") || "DOC";
      const extension = "pdf";
      const newFileName = `${cleanStudentNo}_${cleanDocType}.${extension}`;
      
      // Use the File constructor to create a renamed blob
      fileToUpload = new File([fileToUpload], newFileName, { type: "application/pdf" });
    } catch (e) {
      console.error("[Rename Error]", e);
      // Fallback to original file if renaming fails for some reason
    }

    const payload = new FormData();
    payload.append("file", fileToUpload);

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
    try {
      const res = await fetch("/api/documents", {
        method: "POST",
        body: payload,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      let locationUpdateFailed = false;
      if (uploadStudentIsExisting) {
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
        const selectedType = String(form.docType || "").trim();

        if (!trimmedNo && !trimmedName && !selectedType) {
          setDocsRows([]);
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
            if (selectedType && selectedType !== doc.doc_type) continue;
            
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
            if (selectedType && selectedType !== type) continue;

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
    const hasQuery =
      String(docsForm.studentNo || "").trim() ||
      String(docsForm.studentName || "").trim() ||
      String(docsForm.docType || "").trim();
    if (!hasQuery) return;
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
  const handleRescan = useCallback(async (studentNo, docType, docId, filename, mimeType) => {
    const s = students.find((x) => String(x.studentNo || x.student_no || "").trim().toUpperCase() === String(studentNo || "").trim().toUpperCase());
    if (s) {
      applyStudentToPdfForm(s, docType);
      setUploadStudentIsExisting(true);
    } else {
      setNewRec((p) => ({
        ...p,
        studentNo: studentNo || "",
        docType: docType || "",
      }));
      setUploadStudentIsExisting(false);
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
  }, [students, applyStudentToPdfForm, clearAllUploadFieldErrors]);

  const confirmBulkArchive = async () => {
    if (bulkArchiveLoading) return;
    setBulkArchiveLoading(true);

    try {
      let successCount = 0;
      let failCount = 0;
      const idsToArchive = Array.from(selectedStudentIds);

      for (const studentNo of idsToArchive) {
        const res = await fetch(`/api/students/${encodeURIComponent(studentNo)}`, {
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
        description: `Successfully moved ${successCount} student record(s) to the archive. ${failCount > 0 ? `${failCount} records could not be archived.` : ""}`,
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

      for (const studentNo of idsToRestore) {
        const res = await fetch(`/api/students/${encodeURIComponent(studentNo)}`, {
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
        description: `Successfully restored ${successCount} student record(s) to active status. ${failCount > 0 ? `${failCount} records could not be restored.` : ""}`,
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

  const sidebarItems = [
    { type: "header", label: "Operations" },
    { key: "requests", label: "Alumni Requests", iconClass: "ph-bold ph-tray-arrow-up" },
    { key: "upload", label: "Scan & Upload", iconClass: "ph-bold ph-scan" },
    { key: "documents", label: "Documents", iconClass: "ph-bold ph-file-text" },
    { key: "notifications", label: "Notifications", iconClass: "ph-bold ph-bell", badge: notificationsUnread },

    { type: "header", label: "Records Archive" },
    { key: "search", label: "Records & Archive", iconClass: "ph-bold ph-archive-box" },
  ];

  if (loading) {
    return (
      <div className="h-screen bg-gray-50 flex flex-col font-inter overflow-hidden p-4 gap-4 transition-colors duration-300 dark:bg-background">
        <Skeleton className="h-16 w-full rounded-brand shrink-0" />
        <div className="flex-1 flex gap-4">
          <Skeleton className="w-[30%] h-full rounded-brand" />
          <Skeleton className="w-[70%] h-full rounded-brand" />
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-gray-50 font-inter transition-colors duration-300 dark:bg-background">
      <Header authUser={authUser} onLogout={handleLogout} />

      <Tabs
        value={view}
        onValueChange={switchView}
        orientation={authUser?.preferences?.navigation_layout === "topbar" ? "horizontal" : "vertical"}
        className={cn("flex-1 overflow-hidden w-full gap-0 relative flex", authUser?.preferences?.navigation_layout === "topbar" ? "flex-col" : "flex-row")}
      >
        {authUser?.preferences?.navigation_layout === "topbar" ? (
          <div className="w-full bg-white dark:bg-zinc-900 border-b border-gray-200 dark:border-white/5 py-2.5 px-4 flex items-center justify-center gap-2 overflow-x-auto shadow-xs select-none shrink-0 scrollbar-none">
            {sidebarItems.map((item, idx) => {
              if (item.type === "header") {
                return (
                  <div key={`header-${idx}`} className="text-[9px] font-black tracking-widest text-gray-400 dark:text-zinc-500 whitespace-nowrap ml-4 first:ml-0 border-l border-gray-200 dark:border-white/5 pl-4 first:border-0 first:pl-0">
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
                    "px-3 py-1.5 text-xs font-bold rounded-xl flex items-center gap-2 transition-colors duration-300 whitespace-nowrap outline-none focus-visible:ring-2 focus-visible:ring-pup-maroon/20 cursor-pointer shrink-0",
                    active
                      ? "bg-red-50 text-pup-maroon dark:bg-red-500/10 dark:text-primary shadow-xs"
                      : "text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-zinc-400 dark:hover:bg-white/5 dark:hover:text-zinc-50"
                  )}
                >
                  <i className={cn(item.iconClass, "text-sm")}></i>
                  {item.label}
                  {item.badge > 0 && (
                    <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-extrabold text-white bg-pup-maroon dark:bg-red-500/20 dark:text-red-400">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ) : (
          <Sidebar items={sidebarItems} activeKey={view} onSelect={switchView} />
        )}

        <main className="flex-1 overflow-y-auto p-4 relative w-full min-w-0">
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
                if (b.level === "years") {
                  setCurrentLevel("years");
                  setSelectedYear(null);
                  setActiveStudent(null);
                  setCurrentLocatorLevel("rooms");
                } else if (b.level === "students") {
                  setCurrentLevel("students");
                }
              }}
              students={students}
              archivedStudents={archivedStudents}
              explorerItems={explorerItems}
              onSwitchView={setView}
              locatorModel={locatorModel}
              selectedRoom={selectedRoom}
              setSelectedRoom={setSelectedRoom}
              setSelectedCabinet={setSelectedCabinet}
              setCurrentLocatorLevel={setCurrentLocatorLevel}
              selectedCabinet={selectedCabinet}
              currentLocatorLevel={currentLocatorLevel}
              activeStudent={activeStudent}
              activeStudentDocs={activeStudentDocs}
              onUnfocusStudent={() => setActiveStudent(null)}
              onPreviewDocument={(docType, name, no, id) => {
                setPreview({
                  docType,
                  studentName: name,
                  studentNo: no,
                  docId: id,
                  refId: `DOC-${Date.now()}`,
                });
                setPreviewOpen(true);
              }}
              onRestoreStudent={async (studentNo) => {
                try {
                  const res = await fetch(`/api/students/${encodeURIComponent(studentNo)}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ status: "Active" }),
                  });
                  const json = await res.json().catch(() => null);
                  if (!res.ok || !json?.ok) {
                    throw new Error(json?.error || "Failed to restore student record");
                  }
                  showToast({ title: "Record Restored", description: `Student ${studentNo} is now active.` });
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

          <TabsContent value="upload" className="h-full m-0 border-0 focus-visible:ring-0">
            <ScanUploadTab
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
                if (r) r.student[f] = v;
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
                    if (csvBulkRoom) r.student.room = parseInt(csvBulkRoom);
                    if (csvBulkCabinet) r.student.cabinet = csvBulkCabinet;
                    if (csvBulkDrawer) r.student.drawer = parseInt(csvBulkDrawer);
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
                checkDuplicate(student.studentNo || student.student_no, ocrDocType);
              }}
            />
          </TabsContent>

          <TabsContent value="requests" className="h-full m-0 border-0 focus-visible:ring-0">
            <DocumentRequestsTab
              students={students}
              docTypes={docTypes}
              staffDocs={staffDocs}
              onLocateOnMap={goToStorageMapFromRequest}
              showToast={showToast}
            />
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
              onPreviewDocument={(docType, name, no, id) => {
                setPreview({
                  docType,
                  studentName: name,
                  studentNo: no,
                  docId: id,
                  refId: `DOC-${Date.now()}`,
                });
                setPreviewOpen(true);
              }}
              onRescan={handleRescan}
            />
          </TabsContent>
        </main>
      </Tabs>

      <Footer />
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
          checkDuplicate(s.studentNo || s.student_no, ocrSuggestion?.docType);
        }}
      />
      <ConfirmModal
        open={duplicateConfirmOpen}
        title="Duplicate Document Warning"
        message={`A document of type "${newRec.docType}" already exists for student ${newRec.studentNo}.`}
        confirmLabel="Acknowledge"
        cancelLabel="Clear form"
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
          });
        }}
        variant="warning"
      />
      <ConfirmModal
        open={bulkArchiveOpen}
        title="Confirm Bulk Archival"
        message={`You are about to move ${selectedStudentIds.size} student record(s) to the system archive. This will disable associated processing for these records.`}
        confirmLabel="Archive Selected"
        onConfirm={confirmBulkArchive}
        onCancel={() => setBulkArchiveOpen(false)}
        loading={bulkArchiveLoading}
        variant="warning"
      />
      <ConfirmModal
        open={bulkRestoreOpen}
        title="Confirm Bulk Restoration"
        message={`You are about to restore ${selectedStudentIds.size} student record(s) to active status.`}
        confirmLabel="Restore Selected"
        onConfirm={confirmBulkRestore}
        onCancel={() => setBulkRestoreOpen(false)}
        loading={bulkRestoreLoading}
      />
    </div>
  );
}

export default function StaffPage() {
  return (
    <StaffGuard>
      <Suspense
        fallback={
          <div className="h-screen bg-gray-50 flex flex-col font-inter overflow-hidden p-4 gap-4 dark:bg-background">
            <Skeleton className="h-16 w-full rounded-brand shrink-0" />
            <div className="flex-1 flex gap-4">
              <Skeleton className="w-[30%] h-full rounded-brand" />
              <Skeleton className="w-[70%] h-full rounded-brand" />
            </div>
          </div>
        }
      >
        <StaffPageContent />
      </Suspense>
    </StaffGuard>
  );
}
