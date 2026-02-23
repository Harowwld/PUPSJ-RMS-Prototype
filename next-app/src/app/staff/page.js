"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

const sections = ["1-1", "1-2", "2-1", "2-1N", "3-1", "4-1"];
const courses = [
  { code: "BSIT", name: "BS Information Technology", icon: "ph-desktop" },
  { code: "BSCS", name: "BS Computer Science", icon: "ph-code" },
  { code: "BSCE", name: "BS Civil Engineering", icon: "ph-bridge" },
  { code: "BSARCH", name: "BS Architecture", icon: "ph-buildings" },
  { code: "BSBA", name: "BS Business Admin", icon: "ph-briefcase" },
  { code: "AB-POL", name: "AB Political Science", icon: "ph-gavel" },
];

const rooms = [1, 2];
const cabinets = ["A", "B", "C", "D"];

function normalizeStudentRow(r) {
  const course = courses.find((c) => c.code === r.course_code);
  return {
    studentNo: r.student_no,
    name: r.name,
    courseCode: r.course_code,
    courseName: course?.name || r.course_code,
    year: r.year_level,
    section: r.section,
    room: r.room,
    cabinet: r.cabinet,
    drawer: r.drawer,
    status: r.status,
  };
}

export default function StaffPage() {
  const router = useRouter();
  const fileInputRef = useRef(null);
  const docsFileInputRef = useRef(null);
  const searchTimerRef = useRef(null);

  const [view, setView] = useState("search");
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const [docsQuery, setDocsQuery] = useState("");
  const [docsRows, setDocsRows] = useState([]);
  const [docsLoading, setDocsLoading] = useState(false);
  const [docsError, setDocsError] = useState("");
  const [docsForm, setDocsForm] = useState({
    studentNo: "",
    studentName: "",
    docType: "",
  });
  const [docsFile, setDocsFile] = useState(null);

  const [docTypes, setDocTypes] = useState([
    "Form 137",
    "Transcript of Records",
    "Good Moral Certificate",
    "Diploma",
    "Honorable Dismissal",
    "Medical Certificate",
    "Birth Certificate",
  ]);

  const [students, setStudents] = useState([]);

  const [currentLevel, setCurrentLevel] = useState("courses");
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [selectedYear, setSelectedYear] = useState(null);
  const [selectedSection, setSelectedSection] = useState(null);

  const [currentLocatorLevel, setCurrentLocatorLevel] = useState("rooms");
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [selectedCabinet, setSelectedCabinet] = useState(null);
  const [targetLocation, setTargetLocation] = useState(null);

  const [activeStudentNo, setActiveStudentNo] = useState(null);
  const activeStudent = useMemo(() => {
    if (!activeStudentNo) return null;
    return students.find((s) => s.studentNo === activeStudentNo) || null;
  }, [activeStudentNo, students]);

  const [activeStudentDocs, setActiveStudentDocs] = useState([]);

  const [quickQuery, setQuickQuery] = useState("");
  const [quickResults, setQuickResults] = useState([]);
  const [isQuickSearching, setIsQuickSearching] = useState(false);

  const [previewOpen, setPreviewOpen] = useState(false);
  const [preview, setPreview] = useState({
    docType: "",
    studentName: "",
    studentNo: "",
    docId: null,
    refId: "00000",
  });

  const [uploadedFile, setUploadedFile] = useState(null);
  const [dropActive, setDropActive] = useState(false);

  const [uploadMode, setUploadMode] = useState("existing");

  const [exist, setExist] = useState({
    course: "",
    year: "",
    section: "",
    studentId: "",
    docType: "",
    addingDocType: false,
    newDocType: "",
  });

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
    addingDocType: false,
    newDocType: "",
  });

  useEffect(() => {
    function onDocClick(e) {
      const menu = document.getElementById("userMenuDropdown");
      const btn = document.getElementById("userMenuBtn");
      if (!menu || !btn) return;
      if (!userMenuOpen) return;
      if (!menu.contains(e.target) && !btn.contains(e.target)) {
        setUserMenuOpen(false);
      }
    }

    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, [userMenuOpen]);

  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    const q = quickQuery.trim().toLowerCase();
    setIsQuickSearching(true);
    searchTimerRef.current = setTimeout(() => {
      (async () => {
        if (q.length < 2) {
          setQuickResults([]);
          setIsQuickSearching(false);
          return;
        }

        try {
          const qs = new URLSearchParams();
          qs.set("q", q);
          qs.set("limit", "25");
          const res = await fetch(`/api/students?${qs.toString()}`);
          const json = await res.json();
          if (!res.ok || !json?.ok) throw new Error(json?.error || "Search failed");
          const rows = Array.isArray(json.data) ? json.data : [];
          setQuickResults(rows.map(normalizeStudentRow));
        } catch {
          setQuickResults([]);
        } finally {
          setIsQuickSearching(false);
        }
      })();
    }, 300);
    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
  }, [quickQuery]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/students?limit=500");
        const json = await res.json();
        if (!res.ok || !json?.ok) throw new Error();
        const rows = Array.isArray(json.data) ? json.data : [];
        setStudents(rows.map(normalizeStudentRow));
      } catch {
        setStudents([]);
      }
    })();
  }, []);

  useEffect(() => {
    if (!activeStudentNo) {
      setActiveStudentDocs([]);
      return;
    }

    (async () => {
      try {
        const qs = new URLSearchParams();
        qs.set("studentNo", activeStudentNo);
        qs.set("limit", "200");
        const res = await fetch(`/api/documents?${qs.toString()}`);
        const json = await res.json();
        if (!res.ok || !json?.ok) throw new Error();
        setActiveStudentDocs(Array.isArray(json.data) ? json.data : []);
      } catch {
        setActiveStudentDocs([]);
      }
    })();
  }, [activeStudentNo]);

  async function refreshDocuments(nextQuery) {
    setDocsLoading(true);
    setDocsError("");
    try {
      const qs = new URLSearchParams();
      const q = (nextQuery ?? docsQuery).trim();
      if (q) qs.set("q", q);
      qs.set("limit", "100");
      const res = await fetch(`/api/documents?${qs.toString()}`);
      const json = await res.json();
      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || "Failed to load documents");
      }
      setDocsRows(Array.isArray(json.data) ? json.data : []);
    } catch (e) {
      setDocsError(e?.message || "Failed to load documents");
    } finally {
      setDocsLoading(false);
    }
  }

  useEffect(() => {
    if (view !== "documents") return;
    refreshDocuments();
  }, [view]);

  async function uploadDocument(e) {
    e.preventDefault();
    setDocsError("");

    if (!docsFile) {
      setDocsError("Please choose a PDF file.");
      return;
    }
    if (docsFile.type !== "application/pdf") {
      setDocsError("Only PDF files are allowed.");
      return;
    }
    if (!docsForm.studentNo.trim() || !docsForm.docType.trim()) {
      setDocsError("Student No and Document Type are required.");
      return;
    }

    const form = new FormData();
    form.set("file", docsFile);
    form.set("studentNo", docsForm.studentNo.trim());
    form.set("studentName", docsForm.studentName.trim());
    form.set("docType", docsForm.docType.trim());

    setDocsLoading(true);
    try {
      const res = await fetch("/api/documents", { method: "POST", body: form });
      const json = await res.json();
      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || "Upload failed");
      }
      setDocsFile(null);
      if (docsFileInputRef.current) docsFileInputRef.current.value = "";
      setDocsForm((p) => ({ ...p, docType: "" }));
      await refreshDocuments();
    } catch (e) {
      setDocsError(e?.message || "Upload failed");
    } finally {
      setDocsLoading(false);
    }
  }

  async function deleteDoc(id) {
    const ok = confirm("Delete this document? This will remove the PDF from disk.");
    if (!ok) return;
    setDocsLoading(true);
    setDocsError("");
    try {
      const res = await fetch(`/api/documents/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || "Delete failed");
      }
      await refreshDocuments();
    } catch (e) {
      setDocsError(e?.message || "Delete failed");
    } finally {
      setDocsLoading(false);
    }
  }

  const breadcrumbs = useMemo(() => {
    const parts = [{ label: "All Courses", level: "courses" }];
    if (selectedCourse) parts.push({ label: selectedCourse.code, level: "years" });
    if (selectedYear) parts.push({ label: `Year ${selectedYear}`, level: "sections" });
    if (selectedSection) parts.push({ label: `Sec ${selectedSection}`, level: "students" });
    return parts;
  }, [selectedCourse, selectedSection, selectedYear]);

  const explorerItems = useMemo(() => {
    if (currentLevel === "courses") {
      return courses.map((c) => {
        const count = students.filter((s) => s.courseCode === c.code).length;
        return {
          key: c.code,
          title: c.code,
          subtitle: `${count} Students`,
          icon: c.icon,
          disabled: count === 0,
          onClick: () => {
            if (count === 0) return;
            setSelectedCourse(c);
            setSelectedYear(null);
            setSelectedSection(null);
            setCurrentLevel("years");
          },
        };
      });
    }

    if (currentLevel === "years") {
      const yrs = [1, 2, 3, 4];
      return yrs.map((y) => {
        const count = students.filter(
          (s) => s.courseCode === selectedCourse?.code && s.year === y
        ).length;
        return {
          key: `year-${y}`,
          title: `Year ${y}`,
          subtitle: `${count} Students`,
          icon: "ph-calendar",
          disabled: count === 0,
          onClick: () => {
            if (count === 0) return;
            setSelectedYear(y);
            setSelectedSection(null);
            setCurrentLevel("sections");
          },
        };
      });
    }

    if (currentLevel === "sections") {
      const avail = [
        ...new Set(
          students
            .filter(
              (s) =>
                s.courseCode === selectedCourse?.code && s.year === selectedYear
            )
            .map((s) => s.section)
        ),
      ].sort();

      return avail.map((sec) => {
        const count = students.filter(
          (s) =>
            s.courseCode === selectedCourse?.code &&
            s.year === selectedYear &&
            s.section === sec
        ).length;

        return {
          key: `sec-${sec}`,
          title: `Sec ${sec}`,
          subtitle: `${count} Students`,
          icon: "ph-users-three",
          disabled: count === 0,
          onClick: () => {
            if (count === 0) return;
            setSelectedSection(sec);
            setCurrentLevel("students");
          },
        };
      });
    }

    if (currentLevel === "students") {
      const studentRows = students
        .filter(
          (s) =>
            s.courseCode === selectedCourse?.code &&
            s.year === selectedYear &&
            s.section === selectedSection
        )
        .sort((a, b) => a.name.localeCompare(b.name));

      return studentRows.map((s) => ({
        key: s.studentNo,
        student: s,
      }));
    }

    return [];
  }, [
    currentLevel,
    selectedCourse,
    selectedYear,
    selectedSection,
    students,
  ]);

  const locatorModel = useMemo(() => {
    const target = targetLocation;

    if (currentLocatorLevel === "rooms") {
      return {
        title: "Select Storage Room",
        kind: "rooms",
        rooms: rooms.map((room) => {
          const occupiedCount = students.filter((s) => s.room === room).length;
          const isTarget = target && target.room === room;
          return { room, occupiedCount, isTarget };
        }),
      };
    }

    if (currentLocatorLevel === "cabinets") {
      return {
        title: `Rooms / Room ${selectedRoom} Cabinets`,
        kind: "cabinets",
        cabinets: cabinets.map((cab) => {
          const occupiedCount = students.filter(
            (s) => s.room === selectedRoom && s.cabinet === cab
          ).length;
          const isTarget =
            target && target.room === selectedRoom && target.cabinet === cab;
          return { cab, occupiedCount, isTarget };
        }),
      };
    }

    return {
      title: `Cabinets / Room ${selectedRoom} / Cabinet ${selectedCabinet} Drawers`,
      kind: "drawers",
      drawers: [1, 2, 3, 4].map((i) => {
        const studentsInDrawer = students.filter(
          (s) =>
            s.room === selectedRoom &&
            s.cabinet === selectedCabinet &&
            s.drawer === i
        );
        const count = studentsInDrawer.length;
        const isTarget =
          target &&
          target.room === selectedRoom &&
          target.cabinet === selectedCabinet &&
          target.drawer === i;
        return { drawer: i, count, isTarget };
      }),
    };
  }, [
    currentLocatorLevel,
    selectedCabinet,
    selectedRoom,
    students,
    targetLocation,
  ]);

  const existingAvailSections = useMemo(() => {
    const courseVal = exist.course;
    const yearVal = parseInt(exist.year);
    if (!courseVal || !yearVal) return [];
    return [
      ...new Set(
        students
          .filter((s) => s.courseCode === courseVal && s.year === yearVal)
          .map((s) => s.section)
      ),
    ].sort();
  }, [exist.course, exist.year, students]);

  const existingStudents = useMemo(() => {
    const courseVal = exist.course;
    const yearVal = parseInt(exist.year);
    const sectionVal = exist.section;
    if (!courseVal || !yearVal || !sectionVal) return [];
    return students
      .filter(
        (s) =>
          s.courseCode === courseVal &&
          s.year === yearVal &&
          s.section === sectionVal
      )
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [exist.course, exist.section, exist.year, students]);

  function locateStudent(student) {
    setActiveStudentNo(student.studentNo);
    setTargetLocation({ room: student.room, cabinet: student.cabinet, drawer: student.drawer });
    setCurrentLocatorLevel("rooms");
    setSelectedRoom(null);
    setSelectedCabinet(null);
  }

  function resetExplorer() {
    setCurrentLevel("courses");
    setSelectedCourse(null);
    setSelectedYear(null);
    setSelectedSection(null);
    setTargetLocation(null);
    setActiveStudentNo(null);
    setCurrentLocatorLevel("rooms");
    setSelectedRoom(null);
    setSelectedCabinet(null);
  }

  function previewDocument(docType, studentName, studentNo, docId) {
    const n = Number(docId);
    setPreview({
      docType,
      studentName,
      studentNo,
      docId: Number.isInteger(n) && n > 0 ? n : null,
      refId: String(Math.floor(Math.random() * 1000000)).padStart(5, "0"),
    });
    setPreviewOpen(true);
  }

  function closeModal() {
    setPreviewOpen(false);
  }

  function handleFileSelect(file) {
    if (file && file.type === "application/pdf") {
      setUploadedFile(file);
    } else if (file) {
      alert("Only PDF files are allowed.");
    }
  }

  function clearFile(e) {
    if (e) e.stopPropagation();
    setUploadedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function ensureDocType(prefix) {
    if (prefix === "exist") {
      if (exist.docType === "add_new") {
        setExist((p) => ({ ...p, addingDocType: true, newDocType: "" }));
      }
    } else {
      if (newRec.docType === "add_new") {
        setNewRec((p) => ({ ...p, addingDocType: true, newDocType: "" }));
      }
    }
  }

  function saveNewDocType(prefix) {
    if (prefix === "exist") {
      const val = exist.newDocType.trim();
      if (!val) return;
      setDocTypes((prev) => [...prev, val]);
      setExist((p) => ({ ...p, addingDocType: false, docType: val, newDocType: "" }));
    } else {
      const val = newRec.newDocType.trim();
      if (!val) return;
      setDocTypes((prev) => [...prev, val]);
      setNewRec((p) => ({ ...p, addingDocType: false, docType: val, newDocType: "" }));
    }
  }

  function cancelNewDocType(prefix) {
    if (prefix === "exist") {
      setExist((p) => ({ ...p, addingDocType: false, docType: "", newDocType: "" }));
    } else {
      setNewRec((p) => ({ ...p, addingDocType: false, docType: "", newDocType: "" }));
    }
  }

  function processSubmission() {
    if (!uploadedFile) {
      alert("Please drop or select a PDF file first.");
      return;
    }

    if (uploadMode === "existing") {
      const studentNo = exist.studentId;
      const dt = exist.docType;

      if (!studentNo) {
        alert("Please select a student.");
        return;
      }
      if (!dt || dt === "add_new") {
        alert("Please select a document type.");
        return;
      }

      (async () => {
        try {
          const form = new FormData();
          form.set("file", uploadedFile);
          form.set("studentNo", studentNo);
          form.set("studentName", existingStudents.find((s) => s.studentNo === studentNo)?.name || "");
          form.set("docType", dt);

          const res = await fetch("/api/documents", { method: "POST", body: form });
          const json = await res.json();
          if (!res.ok || !json?.ok) throw new Error(json?.error || "Upload failed");

          alert(`File tagged as "${dt}" for ${studentNo}!`);

          if (activeStudentNo === studentNo) {
            const qs = new URLSearchParams();
            qs.set("studentNo", studentNo);
            qs.set("limit", "200");
            const res2 = await fetch(`/api/documents?${qs.toString()}`);
            const json2 = await res2.json();
            if (res2.ok && json2?.ok) {
              setActiveStudentDocs(Array.isArray(json2.data) ? json2.data : []);
            }
          }

          clearFile();
          setExist((p) => ({ ...p, docType: "" }));
        } catch (e) {
          alert(e?.message || "Upload failed");
        }
      })();
      return;
    }

    const id = newRec.studentNo;
    const name = newRec.name;
    const courseCode = newRec.course;
    const year = parseInt(newRec.year);
    const sectionPart = parseInt(newRec.sectionPart);
    const room = parseInt(newRec.room);
    const cab = newRec.cabinet;
    const draw = parseInt(newRec.drawer);
    const dt = newRec.docType;

    if (!id || !name || !courseCode || !Number.isFinite(sectionPart)) {
      alert("Fill all required fields.");
      return;
    }

    const computedYear = Number.isFinite(year) ? year : 1;
    const section = `${computedYear}-${sectionPart}`;
    if (!dt || dt === "add_new") {
      alert("Please select a document type.");
      return;
    }

    const newStudent = {
      studentNo: id,
      name,
      courseCode,
      yearLevel: computedYear,
      section,
      room: room || 1,
      cabinet: cab || "A",
      drawer: draw || 1,
      status: "Active",
    };

    (async () => {
      try {
        const res = await fetch("/api/students", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newStudent),
        });
        const json = await res.json();
        if (!res.ok || !json?.ok) throw new Error(json?.error || "Failed to create student");

        const created = normalizeStudentRow(json.data);
        setStudents((prev) => {
          const next = [...prev, created];
          next.sort((a, b) => a.name.localeCompare(b.name));
          return next;
        });

        const form = new FormData();
        form.set("file", uploadedFile);
        form.set("studentNo", created.studentNo);
        form.set("studentName", created.name);
        form.set("docType", dt);
        const res2 = await fetch("/api/documents", { method: "POST", body: form });
        const json2 = await res2.json();
        if (!res2.ok || !json2?.ok) throw new Error(json2?.error || "Failed to upload document");

        alert(`New Record & ${dt} added for ${name}!`);

        clearFile();
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
          addingDocType: false,
          newDocType: "",
        });
      } catch (e) {
        alert(e?.message || "Submission failed");
      }
    })();
  }

  function switchView(next) {
    setView(next);
  }

  function logout() {
    router.push("/");
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-gray-100">
      <header className="bg-white border-b border-gray-300 flex-none z-20 shadow-sm">
        <div className="max-w-[1600px] mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <i className="ph-bold ph-bank text-3xl text-pup-maroon"></i>
            <div className="leading-tight">
              <h1 className="font-bold text-xl text-pup-maroon tracking-tight">
                PUP E-Manage
              </h1>
              <p className="text-xs text-gray-600 uppercase tracking-widest font-semibold">
                Student Record Management
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => switchView("search")}
              id="nav-search"
              className={`px-4 py-2 rounded-brand text-sm font-bold transition-colors flex items-center gap-2 ${
                view === "search"
                  ? "btn-nav-active"
                  : "text-gray-600 hover:text-pup-maroon"
              }`}
            >
              <i className="ph-bold ph-magnifying-glass"></i> Records & Archive
            </button>
            <button
              onClick={() => switchView("upload")}
              id="nav-upload"
              className={`px-4 py-2 rounded-brand text-sm font-bold transition-colors flex items-center gap-2 ${
                view === "upload"
                  ? "btn-nav-active"
                  : "text-gray-600 hover:text-pup-maroon"
              }`}
            >
              <i className="ph-bold ph-upload-simple"></i> Scan & Upload
            </button>
            <button
              onClick={() => switchView("documents")}
              id="nav-documents"
              className={`px-4 py-2 rounded-brand text-sm font-bold transition-colors flex items-center gap-2 ${
                view === "documents"
                  ? "btn-nav-active"
                  : "text-gray-600 hover:text-pup-maroon"
              }`}
            >
              <i className="ph-bold ph-files"></i> Documents
            </button>

            <div className="relative ml-4">
              <button
                id="userMenuBtn"
                onClick={() => setUserMenuOpen((o) => !o)}
                className="h-10 w-10 border-2 border-pup-maroon rounded-full flex items-center justify-center text-pup-maroon font-bold text-sm bg-red-50 hover:bg-pup-maroon hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pup-maroon"
              >
                AD
              </button>

              <div
                id="userMenuDropdown"
                className={`${
                  userMenuOpen ? "" : "hidden"
                } absolute right-0 mt-2 w-64 bg-white rounded-brand shadow-xl border border-gray-200 z-50 animate-scale-in origin-top-right`}
              >
                <div className="p-4 border-b border-gray-200 bg-gray-50 rounded-t-brand">
                  <p className="text-sm font-bold text-pup-maroon">Administrator</p>
                  <p className="text-xs text-gray-700 truncate font-medium">
                    registrar.admin
                  </p>
                </div>
                <div className="p-1">
                  <button className="w-full text-left px-3 py-3 text-sm text-gray-700 hover:bg-red-50 hover:text-pup-maroon rounded-brand flex items-center gap-2 transition-colors font-medium">
                    <i className="ph-bold ph-user-gear"></i> Account Settings
                  </button>
                  <button className="w-full text-left px-3 py-3 text-sm text-gray-700 hover:bg-red-50 hover:text-pup-maroon rounded-brand flex items-center gap-2 transition-colors font-medium">
                    <i className="ph-bold ph-question"></i> Help & Support
                  </button>
                </div>
                <div className="p-1 border-t border-gray-200">
                  <button
                    onClick={logout}
                    className="w-full text-left px-3 py-3 text-sm text-red-700 hover:bg-red-50 font-bold rounded-brand flex items-center gap-2 transition-colors"
                  >
                    <i className="ph-bold ph-sign-out"></i> Sign Out
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col lg:flex-row overflow-hidden max-w-[1600px] mx-auto w-full p-4 gap-4">
        <div
          id="view-search"
          className={`${
            view === "search" ? "flex" : "hidden"
          } flex-col lg:flex-row w-full gap-4 lg:h-full min-h-0`}
        >
          <section className="w-full lg:w-1/4 bg-white rounded-brand border border-gray-300 flex flex-col shadow-sm flex-shrink-0 lg:h-full min-h-0">
            <div className="p-4 border-b border-gray-200 bg-gray-50">
              <h2 className="text-xs font-bold text-pup-maroon uppercase tracking-wide mb-3">
                Quick Find
              </h2>
              <div className="relative group">
                <i className="ph-bold ph-magnifying-glass absolute left-3 top-3 text-gray-500 group-focus-within:text-pup-maroon"></i>
                <input
                  type="text"
                  placeholder="Search ID or Name..."
                  className="w-full pl-10 pr-3 py-2.5 bg-white border border-gray-300 rounded-brand text-sm font-medium focus:outline-none focus:border-pup-maroon transition-all placeholder-gray-500 text-gray-900"
                  value={quickQuery}
                  onChange={(e) => setQuickQuery(e.target.value)}
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {quickQuery.trim().length < 2 ? (
                <div className="text-center py-10 text-gray-500 flex flex-col items-center opacity-80">
                  <i className="ph-bold ph-magnifying-glass text-3xl mb-2"></i>
                  <span className="text-sm font-medium">Search for direct access</span>
                </div>
              ) : isQuickSearching ? (
                <div className="p-4 text-center text-sm font-medium text-gray-500">
                  Searching...
                </div>
              ) : quickResults.length === 0 ? (
                <div className="p-4 text-center text-sm font-medium text-gray-500">
                  No records found.
                </div>
              ) : (
                quickResults.map((s) => (
                  <div
                    key={s.studentNo}
                    className="p-3 border-b border-gray-200 cursor-pointer hover:bg-gray-100 transition-colors flex justify-between items-center group"
                    onClick={() => locateStudent(s)}
                  >
                    <div>
                      <div className="font-bold text-sm text-gray-800 group-hover:text-pup-maroon">
                        {s.name}
                      </div>
                      <div className="text-xs text-gray-500 font-mono font-medium">
                        {s.studentNo}
                      </div>
                    </div>
                    <i className="ph-bold ph-caret-right text-gray-400 group-hover:text-pup-maroon text-sm"></i>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="w-full lg:w-3/4 flex flex-col gap-4 lg:h-full overflow-y-auto min-h-0">
            <div className="h-[60%] min-h-[250px] bg-white rounded-brand border border-gray-300 flex flex-col shadow-sm relative overflow-hidden">
              <div className="p-4 border-b border-gray-200 flex items-center gap-2 text-sm bg-white sticky top-0 z-10">
                <button
                  onClick={resetExplorer}
                  className="text-gray-500 hover:text-pup-maroon transition-colors"
                  title="Home"
                >
                  <i className="ph-bold ph-house text-lg"></i>
                </button>
                <span className="text-gray-400 font-bold">/</span>
                <div className="flex items-center gap-2 font-semibold text-gray-700">
                  {breadcrumbs.map((b, idx) => (
                    <span key={b.level} className="flex items-center gap-2">
                      {idx === 0 ? null : (
                        <i className="ph-bold ph-caret-right text-sm text-gray-400"></i>
                      )}
                      <span
                        className={`cursor-pointer hover:text-pup-maroon ${
                          currentLevel === b.level ? "text-pup-maroon font-bold" : ""
                        }`}
                        onClick={() => {
                          if (b.level === "courses") {
                            resetExplorer();
                            return;
                          }
                          if (b.level === "years" && selectedCourse) {
                            setCurrentLevel("years");
                            setSelectedYear(null);
                            setSelectedSection(null);
                            return;
                          }
                          if (b.level === "sections" && selectedYear) {
                            setCurrentLevel("sections");
                            setSelectedSection(null);
                          }
                        }}
                      >
                        {b.label}
                      </span>
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
                {students.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center text-gray-500 py-12">
                    <div className="w-16 h-16 rounded-full bg-white border border-gray-200 flex items-center justify-center mb-4 shadow-sm">
                      <i className="ph-duotone ph-users-three text-3xl text-pup-maroon"></i>
                    </div>
                    <div className="text-lg font-bold text-gray-900">
                      No student records yet
                    </div>
                    <div className="text-sm font-medium text-gray-600 mt-1 max-w-md">
                      Register your first student record in the Upload tab. After that,
                      you can browse, search, and locate folders here.
                    </div>
                    <button
                      type="button"
                      onClick={() => switchView("upload")}
                      className="mt-6 bg-pup-maroon text-white px-5 py-3 rounded-brand font-bold text-sm hover:bg-red-900 transition-colors flex items-center gap-2"
                    >
                      <i className="ph-bold ph-upload-simple"></i> Go to Register / Upload
                    </button>
                  </div>
                ) : currentLevel !== "students" ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 animate-fade-in">
                    {explorerItems.map((it) => (
                      <div
                        key={it.key}
                        className={`folder-card bg-white p-5 rounded-brand flex flex-col items-center justify-center text-center gap-2 h-36 ${
                          it.disabled
                            ? "opacity-50 cursor-not-allowed"
                            : "cursor-pointer"
                        }`}
                        onClick={it.onClick}
                      >
                        <i className={`ph-light ${it.icon} text-4xl text-gray-500 mb-1`}></i>
                        <h3 className="font-bold text-base text-pup-maroon leading-tight">
                          {it.title}
                        </h3>
                        <span className="text-xs text-gray-500 uppercase tracking-wide font-semibold">
                          {it.subtitle}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : explorerItems.length === 0 ? (
                  <div className="text-center text-gray-500 mt-10 font-medium">
                    No students in this section.
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {explorerItems.map((row) => (
                      <div
                        key={row.key}
                        className="group flex items-center justify-between p-4 bg-white border border-gray-300 rounded-brand hover:border-pup-maroon cursor-pointer transition-all shadow-sm"
                        onClick={() => locateStudent(row.student)}
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 group-hover:text-pup-maroon transition-colors">
                            <i className="ph-bold ph-user text-xl"></i>
                          </div>
                          <div>
                            <h4 className="font-bold text-base text-gray-900">
                              {row.student.name}
                            </h4>
                            <p className="text-sm text-gray-600 font-mono font-medium">
                              {row.student.studentNo}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-xs uppercase font-bold tracking-wide text-gray-400 group-hover:text-pup-maroon">
                            View Location
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="h-[40%] min-h-[250px] bg-white rounded-brand border border-gray-300 flex flex-col shadow-sm relative min-h-0">
              <div className="p-3 border-b border-gray-200 flex justify-between items-center bg-white rounded-t-brand">
                <h3 className="font-bold text-pup-maroon text-sm flex items-center gap-2">
                  <i className="ph-fill ph-drawers text-lg"></i> Storage Layout
                </h3>
                <div className="flex gap-4 text-xs font-medium text-gray-600">
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 border border-gray-400 rounded-[2px] bg-white"></div>
                    Empty
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 bg-gray-300 border border-gray-400 rounded-[2px]"></div>
                    Occupied
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 border-2 border-pup-maroon bg-red-50 rounded-[2px]"></div>
                    Target
                  </div>
                </div>
              </div>

              <div className="flex-1 flex overflow-hidden min-h-0">
                <div className="w-2/3 bg-gray-100 p-4 h-full min-h-0 overflow-y-auto">
                  <div className="w-full h-full">
                    {locatorModel.kind === "rooms" ? (
                      <>
                        <h4 className="font-bold text-gray-700 text-lg mb-4">
                          {locatorModel.title}
                        </h4>
                        <div className="grid grid-cols-2 gap-4 pb-6">
                          {locatorModel.rooms.map((r) => (
                            <div
                              key={r.room}
                              className={`locator-tile p-6 rounded-brand flex flex-col items-center justify-center ${
                                r.isTarget ? "room-located" : ""
                              }`}
                              onClick={() => {
                                setSelectedRoom(r.room);
                                setSelectedCabinet(null);
                                setCurrentLocatorLevel("cabinets");
                              }}
                            >
                              <i className="ph-duotone ph-warehouse text-4xl mb-2 text-pup-maroon"></i>
                              <h5 className="font-bold text-xl text-gray-900 leading-tight">
                                ROOM {r.room}
                              </h5>
                              <span className="text-xs text-gray-500 font-semibold mt-1">
                                {r.occupiedCount} Records Stored
                              </span>
                            </div>
                          ))}
                        </div>
                      </>
                    ) : locatorModel.kind === "cabinets" ? (
                      <>
                        <h4 className="font-bold text-gray-700 text-lg mb-4">
                          <span
                            className="cursor-pointer hover:text-pup-maroon"
                            onClick={() => {
                              setCurrentLocatorLevel("rooms");
                              setSelectedRoom(null);
                              setSelectedCabinet(null);
                            }}
                          >
                            ← Rooms
                          </span>{" "}
                          / Room {selectedRoom} Cabinets
                        </h4>
                        <div className="grid grid-cols-4 gap-3">
                          {locatorModel.cabinets.map((c) => (
                            <div
                              key={c.cab}
                              className={`locator-tile p-3 rounded-brand flex flex-col h-full ${
                                c.isTarget ? "cabinet-located" : ""
                              }`}
                              onClick={() => {
                                setSelectedCabinet(c.cab);
                                setCurrentLocatorLevel("drawers");
                              }}
                            >
                              <div className="text-center mb-2">
                                <i className="ph-duotone ph-archive-box text-3xl text-gray-600"></i>
                                <h5 className="font-bold text-base text-gray-900 leading-tight mt-1">
                                  CAB-{c.cab}
                                </h5>
                              </div>
                              <div className="flex-1 bg-gray-50/50 p-2 rounded text-xs font-semibold text-gray-500 flex items-center justify-center">
                                {c.occupiedCount} Folders
                              </div>
                            </div>
                          ))}
                        </div>
                      </>
                    ) : (
                      <>
                        <h4 className="font-bold text-gray-700 text-lg mb-4">
                          <span
                            className="cursor-pointer hover:text-pup-maroon"
                            onClick={() => setCurrentLocatorLevel("cabinets")}
                          >
                            ← Cabinets
                          </span>{" "}
                          / Room {selectedRoom} / Cabinet {selectedCabinet} Drawers
                        </h4>
                        <div className="flex justify-center w-full p-2">
                          <div className="border border-gray-300 p-2 rounded-brand bg-white relative flex flex-col h-full w-[30%] min-h-0">
                            <div className="absolute -top-2 left-2 bg-white px-2 text-xs font-bold text-gray-600 border border-gray-300 rounded-sm">
                              CAB-{selectedCabinet}
                            </div>
                            <div className="flex-1 flex flex-col gap-3 mt-3 min-h-0">
                              {locatorModel.drawers.map((d) => {
                                const countText =
                                  d.count === 1 ? "1 Folder" : `${d.count} Folders`;
                                const drawerClass =
                                  d.count > 0
                                    ? "drawer-occupied"
                                    : "bg-white border-gray-200 text-gray-300";
                                return (
                                  <div
                                    key={d.drawer}
                                    className={`drawer-box flex-1 rounded-brand flex items-center justify-center transition-all border locator-tile ${drawerClass} ${
                                      d.isTarget ? "drawer-located" : ""
                                    }`}
                                  >
                                    {d.count > 0 ? (
                                      <span
                                        className={`text-xs font-bold ${
                                          d.isTarget
                                            ? "text-pup-maroon"
                                            : "text-gray-900"
                                        }`}
                                      >
                                        {countText}
                                      </span>
                                    ) : (
                                      <span className="text-xs font-medium text-gray-400">
                                        0 Folders
                                      </span>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <div className="w-1/3 border-l border-gray-200 bg-white flex flex-col overflow-hidden min-h-0">
                  <div className="p-4 h-full flex flex-col overflow-hidden min-h-0">
                    {!activeStudent ? (
                      <div className="h-full flex flex-col items-center justify-center text-center text-gray-400">
                        <i className="ph-duotone ph-mouse-left-click text-5xl mb-3"></i>
                        <span className="text-sm font-medium">
                          Select a student to view
                          <br />
                          location & documents
                        </span>
                      </div>
                    ) : (
                      <div className="h-full flex flex-col min-h-0">
                        <div className="mb-4 flex-shrink-0">
                          <div className="text-xs uppercase font-bold text-gray-500 mb-1 tracking-wide">
                            Physical Location
                          </div>
                          <div className="text-2xl font-black text-pup-maroon">
                            ROOM-{activeStudent.room} • CAB-{activeStudent.cabinet} • D-{activeStudent.drawer}
                          </div>
                          <div className="text-base font-bold text-gray-900 truncate mt-1">
                            {activeStudent.name}
                          </div>
                          <div className="text-sm text-gray-600 font-mono font-medium">
                            {activeStudent.studentNo}
                          </div>
                        </div>

                        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                          <div className="text-xs uppercase font-bold text-gray-500 mb-2 border-b border-gray-200 pb-2 flex-shrink-0 tracking-wide">
                            Documents on File
                          </div>
                          <ul className="flex-1 overflow-y-auto space-y-2 text-sm text-gray-700 pr-2">
                            {activeStudentDocs.length === 0 ? (
                              <li className="text-gray-500 font-medium text-sm">
                                No documents found.
                              </li>
                            ) : (
                              activeStudentDocs.map((doc) => (
                                <li key={doc.id}>
                                  <button
                                    onClick={() =>
                                      previewDocument(
                                        doc.doc_type,
                                        activeStudent.name,
                                        activeStudent.studentNo,
                                        doc.id
                                      )
                                    }
                                    className="group flex items-center gap-3 w-full text-left p-2 rounded-brand hover:bg-gray-100 transition-colors border border-transparent hover:border-gray-300"
                                  >
                                    <div className="w-8 h-8 rounded bg-red-50 flex items-center justify-center text-pup-maroon group-hover:bg-pup-maroon group-hover:text-white transition-colors">
                                      <i className="ph-fill ph-file-pdf text-lg"></i>
                                    </div>
                                    <span className="text-gray-700 group-hover:text-pup-maroon font-bold group-hover:underline underline-offset-2">
                                      {doc.doc_type}
                                    </span>
                                    <i className="ph-bold ph-arrow-square-out text-gray-400 ml-auto group-hover:text-pup-maroon opacity-0 group-hover:opacity-100 transition-all"></i>
                                  </button>
                                </li>
                              ))
                            )}
                          </ul>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>

        <div
          id="view-upload"
          className={`${
            view === "upload" ? "flex" : "hidden"
          } flex-col lg:flex-row w-full h-full gap-4`}
        >
          <section className="w-full lg:w-1/2 bg-white rounded-brand border border-gray-300 flex flex-col h-full p-8 items-center justify-center shadow-sm">
            <div
              className={`w-full h-full border-2 border-dashed border-gray-400 rounded-brand bg-gray-50 p-8 flex flex-col items-center justify-center cursor-pointer hover:border-pup-maroon hover:bg-red-50/50 transition-all group relative ${
                dropActive ? "bg-red-50" : ""
              }`}
              onClick={(e) => {
                if (uploadedFile) return;
                if (fileInputRef.current) fileInputRef.current.click();
              }}
              onDragOver={(e) => {
                e.preventDefault();
                setDropActive(true);
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                setDropActive(false);
              }}
              onDrop={(e) => {
                e.preventDefault();
                setDropActive(false);
                handleFileSelect(e.dataTransfer.files[0]);
              }}
            >
              <div className="text-center pointer-events-none">
                <div className="w-20 h-20 mx-auto rounded-full bg-white border border-gray-300 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-sm">
                  <i className="ph-thin ph-file-pdf text-4xl text-pup-maroon"></i>
                </div>
                <h3 className="font-bold text-xl text-gray-800">Drop PDF File Here</h3>
                <p className="text-sm text-gray-500 mt-2 font-medium">
                  or click to browse local files
                </p>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept=".pdf"
                onChange={(e) => handleFileSelect(e.target.files[0])}
              />

              {uploadedFile ? (
                <div className="absolute inset-0 bg-white z-10 flex flex-col items-center justify-center p-6 rounded-brand">
                  <i className="ph-fill ph-file-pdf text-6xl text-pup-maroon mb-4"></i>
                  <h4 className="font-bold text-gray-900 text-lg text-center break-all mb-1 max-w-sm">
                    {uploadedFile.name}
                  </h4>
                  <span className="text-sm text-gray-500 mb-6 font-medium">
                    {(uploadedFile.size / 1024).toFixed(2)} KB
                  </span>
                  <button
                    onClick={clearFile}
                    className="text-sm text-red-700 hover:text-white hover:bg-red-700 font-bold uppercase tracking-wide border border-red-200 px-4 py-2 rounded-full transition-colors"
                  >
                    Remove File
                  </button>
                </div>
              ) : null}
            </div>
          </section>

          <section className="w-full lg:w-1/2 bg-white rounded-brand border border-gray-300 flex flex-col h-full shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-pup-maroon mb-1">Tag Document</h2>
              <p className="text-sm text-gray-600">
                Associate this file with a student record.
              </p>

              <div className="flex gap-6 mt-6 border-b border-gray-200">
                <button
                  className={`tab-btn ${uploadMode === "existing" ? "active" : ""}`}
                  onClick={() => setUploadMode("existing")}
                >
                  Existing Student
                </button>
                <button
                  className={`tab-btn ${uploadMode === "new" ? "active" : ""}`}
                  onClick={() => setUploadMode("new")}
                >
                  Register New
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 bg-gray-50/50">
              {uploadMode === "existing" ? (
                <div className="space-y-5">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase">
                      Course / Program
                    </label>
                    <select
                      className="form-select"
                      value={exist.course}
                      onChange={(e) =>
                        setExist((p) => ({
                          ...p,
                          course: e.target.value,
                          section: "",
                          studentId: "",
                        }))
                      }
                    >
                      <option value="">Select Course...</option>
                      {courses.map((c) => (
                        <option key={c.code} value={c.code}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-5">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase">
                        Year Level
                      </label>
                      <select
                        className="form-select"
                        value={exist.year}
                        onChange={(e) =>
                          setExist((p) => ({
                            ...p,
                            year: e.target.value,
                            section: "",
                            studentId: "",
                          }))
                        }
                      >
                        <option value="">Select Year...</option>
                        <option value="1">1st Year</option>
                        <option value="2">2nd Year</option>
                        <option value="3">3rd Year</option>
                        <option value="4">4th Year</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase">
                        Section
                      </label>
                      <select
                        className="form-select"
                        value={exist.section}
                        onChange={(e) =>
                          setExist((p) => ({
                            ...p,
                            section: e.target.value,
                            studentId: "",
                          }))
                        }
                      >
                        <option value="">Select Section...</option>
                        {existingAvailSections.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase">
                      Student Name
                    </label>
                    <select
                      className="form-select"
                      disabled={!exist.course || !exist.year || !exist.section}
                      value={exist.studentId}
                      onChange={(e) =>
                        setExist((p) => ({ ...p, studentId: e.target.value }))
                      }
                    >
                      <option value="">
                        {exist.course && exist.year && exist.section
                          ? "Select Student..."
                          : "Filter options first..."}
                      </option>
                      {existingStudents.map((s) => (
                        <option key={s.studentNo} value={s.studentNo}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="pt-4 border-t border-gray-200">
                    <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase">
                      Document Type
                    </label>

                    {exist.addingDocType ? (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          className="form-input flex-1"
                          placeholder="Enter new document type..."
                          value={exist.newDocType}
                          onChange={(e) =>
                            setExist((p) => ({ ...p, newDocType: e.target.value }))
                          }
                          autoFocus
                        />
                        <button
                          onClick={() => saveNewDocType("exist")}
                          className="px-3 bg-pup-maroon text-white rounded-brand text-xs font-bold"
                          type="button"
                        >
                          ADD
                        </button>
                        <button
                          onClick={() => cancelNewDocType("exist")}
                          className="px-3 bg-gray-200 text-gray-700 rounded-brand text-xs font-bold"
                          type="button"
                        >
                          X
                        </button>
                      </div>
                    ) : (
                      <select
                        className="form-select"
                        value={exist.docType}
                        onChange={(e) => {
                          const v = e.target.value;
                          setExist((p) => ({ ...p, docType: v }));
                          if (v === "add_new") ensureDocType("exist");
                        }}
                      >
                        <option value="">Select Type...</option>
                        {docTypes.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                        <option value="add_new">
                          ➕ Add New Type...
                        </option>
                      </select>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={processSubmission}
                    className="w-full bg-pup-maroon text-white py-3 rounded-brand font-bold text-sm hover:bg-red-900 transition-all shadow-sm flex items-center justify-center gap-2"
                  >
                    <i className="ph-bold ph-upload-simple"></i> Submit Upload
                  </button>
                </div>
              ) : (
                <div className="space-y-5">
                  <div className="grid grid-cols-2 gap-5">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase">
                        Student Number
                      </label>
                      <input
                        type="text"
                        className="form-input font-mono"
                        placeholder="202X-XXXXX-MN-0"
                        value={newRec.studentNo}
                        onChange={(e) =>
                          setNewRec((p) => ({ ...p, studentNo: e.target.value }))
                        }
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase">
                        Full Name
                      </label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="Last Name, First Name"
                        value={newRec.name}
                        onChange={(e) =>
                          setNewRec((p) => ({ ...p, name: e.target.value }))
                        }
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase">
                      Course / Program
                    </label>
                    <select
                      className="form-select"
                      value={newRec.course}
                      onChange={(e) =>
                        setNewRec((p) => ({ ...p, course: e.target.value }))
                      }
                    >
                      <option value="">Select Course...</option>
                      {courses.map((c) => (
                        <option key={c.code} value={c.code}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-5">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase">
                        Year Level
                      </label>
                      <select
                        className="form-select"
                        value={newRec.year}
                        onChange={(e) =>
                          setNewRec((p) => ({
                            ...p,
                            year: e.target.value,
                            sectionPart: "",
                          }))
                        }
                      >
                        <option value="">Select Year...</option>
                        <option value="1">1st Year</option>
                        <option value="2">2nd Year</option>
                        <option value="3">3rd Year</option>
                        <option value="4">4th Year</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase">
                        Section
                      </label>
                      <select
                        className="form-select"
                        value={newRec.sectionPart}
                        onChange={(e) =>
                          setNewRec((p) => ({ ...p, sectionPart: e.target.value }))
                        }
                        disabled={!newRec.year}
                      >
                        <option value="">
                          {newRec.year ? "Select Section..." : "Select year first..."}
                        </option>
                        <option value="1">Section 1 ({newRec.year || "_"}-1)</option>
                        <option value="2">Section 2 ({newRec.year || "_"}-2)</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-5">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase">
                        Room
                      </label>
                      <select
                        className="form-select"
                        value={newRec.room}
                        onChange={(e) =>
                          setNewRec((p) => ({ ...p, room: e.target.value }))
                        }
                      >
                        <option value="">Room...</option>
                        {rooms.map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase">
                        Cabinet
                      </label>
                      <select
                        className="form-select"
                        value={newRec.cabinet}
                        onChange={(e) =>
                          setNewRec((p) => ({ ...p, cabinet: e.target.value }))
                        }
                      >
                        <option value="">Cab...</option>
                        {cabinets.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase">
                        Drawer
                      </label>
                      <select
                        className="form-select"
                        value={newRec.drawer}
                        onChange={(e) =>
                          setNewRec((p) => ({ ...p, drawer: e.target.value }))
                        }
                      >
                        <option value="">D...</option>
                        {[1, 2, 3, 4].map((d) => (
                          <option key={d} value={d}>
                            {d}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-gray-200">
                    <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase">
                      Document Type
                    </label>
                    {newRec.addingDocType ? (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          className="form-input flex-1"
                          placeholder="Enter new document type..."
                          value={newRec.newDocType}
                          onChange={(e) =>
                            setNewRec((p) => ({ ...p, newDocType: e.target.value }))
                          }
                          autoFocus
                        />
                        <button
                          onClick={() => saveNewDocType("new")}
                          className="px-3 bg-pup-maroon text-white rounded-brand text-xs font-bold"
                          type="button"
                        >
                          ADD
                        </button>
                        <button
                          onClick={() => cancelNewDocType("new")}
                          className="px-3 bg-gray-200 text-gray-700 rounded-brand text-xs font-bold"
                          type="button"
                        >
                          X
                        </button>
                      </div>
                    ) : (
                      <select
                        className="form-select"
                        value={newRec.docType}
                        onChange={(e) => {
                          const v = e.target.value;
                          setNewRec((p) => ({ ...p, docType: v }));
                          if (v === "add_new") ensureDocType("new");
                        }}
                      >
                        <option value="">Select Type...</option>
                        {docTypes.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                        <option value="add_new">
                          ➕ Add New Type...
                        </option>
                      </select>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={processSubmission}
                    className="w-full bg-pup-maroon text-white py-3 rounded-brand font-bold text-sm hover:bg-red-900 transition-all shadow-sm flex items-center justify-center gap-2"
                  >
                    <i className="ph-bold ph-upload-simple"></i> Submit Upload
                  </button>
                </div>
              )}
            </div>
          </section>
        </div>

        <div
          id="view-documents"
          className={`${
            view === "documents" ? "flex" : "hidden"
          } flex-col w-full h-full gap-4`}
        >
          <section className="bg-white rounded-brand border border-gray-300 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-200 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-pup-maroon">Documents</h2>
                <p className="text-sm text-gray-600">
                  Stored locally in <code>.local/</code> (SQLite + uploaded PDFs).
                </p>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative">
                  <i className="ph-bold ph-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"></i>
                  <input
                    className="form-input pl-10 w-[320px]"
                    placeholder="Search student no, name, type..."
                    value={docsQuery}
                    onChange={(e) => setDocsQuery(e.target.value)}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => refreshDocuments()}
                  className="px-4 py-2 rounded-brand bg-gray-900 text-white text-sm font-bold hover:bg-black transition-colors"
                >
                  Refresh
                </button>
              </div>
            </div>

            <div className="p-6 bg-gray-50/50">
              <form onSubmit={uploadDocument} className="grid grid-cols-1 lg:grid-cols-5 gap-4 items-end">
                <div className="lg:col-span-1">
                  <label className="block text-xs font-bold text-gray-700 mb-1 uppercase">
                    Student No
                  </label>
                  <input
                    className="form-input font-mono"
                    value={docsForm.studentNo}
                    onChange={(e) =>
                      setDocsForm((p) => ({ ...p, studentNo: e.target.value }))
                    }
                    placeholder="202X-XXXXX-MN-0"
                    required
                  />
                </div>

                <div className="lg:col-span-1">
                  <label className="block text-xs font-bold text-gray-700 mb-1 uppercase">
                    Student Name
                  </label>
                  <input
                    className="form-input"
                    value={docsForm.studentName}
                    onChange={(e) =>
                      setDocsForm((p) => ({ ...p, studentName: e.target.value }))
                    }
                    placeholder="Optional"
                  />
                </div>

                <div className="lg:col-span-1">
                  <label className="block text-xs font-bold text-gray-700 mb-1 uppercase">
                    Document Type
                  </label>
                  <select
                    className="form-select"
                    value={docsForm.docType}
                    onChange={(e) =>
                      setDocsForm((p) => ({ ...p, docType: e.target.value }))
                    }
                    required
                  >
                    <option value="">Select Type...</option>
                    {docTypes.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="lg:col-span-1">
                  <label className="block text-xs font-bold text-gray-700 mb-1 uppercase">
                    PDF File
                  </label>
                  <input
                    ref={docsFileInputRef}
                    type="file"
                    accept=".pdf"
                    className="block w-full text-sm text-gray-600 file:mr-3 file:py-2 file:px-3 file:rounded-brand file:border file:border-gray-300 file:bg-white file:text-gray-700 file:font-bold hover:file:border-pup-maroon"
                    onChange={(e) => setDocsFile(e.target.files?.[0] || null)}
                    required
                  />
                </div>

                <div className="lg:col-span-1 flex gap-2">
                  <button
                    type="submit"
                    disabled={docsLoading}
                    className={`flex-1 bg-pup-maroon text-white py-2.5 rounded-brand font-bold text-sm hover:bg-red-900 transition-colors ${
                      docsLoading ? "opacity-75 cursor-not-allowed" : ""
                    }`}
                  >
                    Upload
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDocsFile(null);
                      if (docsFileInputRef.current) docsFileInputRef.current.value = "";
                    }}
                    className="px-4 py-2.5 rounded-brand bg-white border border-gray-300 text-gray-700 font-bold text-sm hover:border-pup-maroon"
                  >
                    Clear
                  </button>
                </div>
              </form>

              {docsError ? (
                <div className="mt-4 p-3 rounded-brand bg-red-50 border border-red-200 text-sm text-red-800 font-medium">
                  {docsError}
                </div>
              ) : null}
            </div>

            <div className="p-6">
              <div className="overflow-x-auto border border-gray-200 rounded-brand">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr className="text-left text-xs uppercase tracking-wider text-gray-600">
                      <th className="p-3 font-bold">Student No</th>
                      <th className="p-3 font-bold">Name</th>
                      <th className="p-3 font-bold">Type</th>
                      <th className="p-3 font-bold">File</th>
                      <th className="p-3 font-bold">Created</th>
                      <th className="p-3 font-bold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {docsLoading ? (
                      <tr>
                        <td colSpan={6} className="p-6 text-center text-gray-500 font-medium">
                          Loading...
                        </td>
                      </tr>
                    ) : docsRows.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-6 text-center text-gray-500 font-medium">
                          No documents found.
                        </td>
                      </tr>
                    ) : (
                      docsRows.map((r) => (
                        <tr key={r.id} className="hover:bg-gray-50">
                          <td className="p-3 font-mono font-bold text-gray-900">
                            {r.student_no}
                          </td>
                          <td className="p-3 text-gray-800 font-medium">
                            {r.student_name || "—"}
                          </td>
                          <td className="p-3">
                            <span className="inline-flex items-center px-2 py-1 rounded-full bg-red-50 text-pup-maroon border border-red-100 text-xs font-bold">
                              {r.doc_type}
                            </span>
                          </td>
                          <td className="p-3 text-gray-700">
                            {r.original_filename}
                            <div className="text-xs text-gray-500 font-mono">
                              {(r.size_bytes / 1024).toFixed(1)} KB
                            </div>
                          </td>
                          <td className="p-3 text-gray-600 font-medium">
                            {String(r.created_at || "").replace("T", " ")}
                          </td>
                          <td className="p-3">
                            <div className="flex justify-end gap-2">
                              <a
                                className="px-3 py-2 rounded-brand bg-white border border-gray-300 text-gray-700 font-bold text-xs hover:border-pup-maroon"
                                href={`/api/documents/${r.id}`}
                                target="_blank"
                                rel="noreferrer"
                              >
                                Open
                              </a>
                              <button
                                type="button"
                                onClick={() => deleteDoc(r.id)}
                                className="px-3 py-2 rounded-brand bg-red-700 text-white font-bold text-xs hover:bg-red-800"
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 flex justify-between items-center">
                <div className="text-xs text-gray-500 font-medium">
                  Showing {docsRows.length} documents
                </div>
                <button
                  type="button"
                  onClick={() => refreshDocuments(docsQuery)}
                  className="px-4 py-2 rounded-brand bg-gray-100 border border-gray-200 text-gray-700 font-bold text-xs hover:border-pup-maroon"
                >
                  Search
                </button>
              </div>
            </div>
          </section>
        </div>
      </main>

      <div
        id="previewModal"
        className={`${previewOpen ? "flex" : "hidden"} fixed inset-0 z-50 bg-black/60 items-center justify-center`}
        onClick={(e) => {
          if (e.target.id === "previewModal") closeModal();
        }}
      >
        <div className="bg-white w-full max-w-5xl h-[90vh] rounded-brand shadow-2xl overflow-hidden flex flex-col animate-scale-in">
          <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="bg-red-50 p-2 rounded-brand border border-red-100">
                <i className="ph-fill ph-file-pdf text-2xl text-pup-maroon"></i>
              </div>
              <div>
                <h3 className="font-bold text-pup-maroon text-lg leading-tight">
                  {preview.docType}
                </h3>
                <p className="text-sm text-gray-700 font-medium">
                  {preview.studentName}
                </p>
              </div>
            </div>
            <button
              onClick={closeModal}
              className="text-gray-500 hover:text-pup-maroon transition-colors p-2 rounded-brand"
            >
              <i className="ph-bold ph-x text-xl"></i>
            </button>
          </div>

          <div className="flex-1 bg-gray-100 p-0 flex flex-col overflow-hidden relative">
            <div className="px-4 py-3 border-b border-gray-200 bg-white flex items-center justify-between gap-3">
              <div className="text-xs font-bold text-gray-600 uppercase tracking-widest">
                REF: <span className="font-mono">{preview.refId}</span>
              </div>
              {preview.docId ? (
                <a
                  className="px-3 py-2 rounded-brand bg-white border border-gray-300 text-gray-700 font-bold text-xs hover:border-pup-maroon"
                  href={`/api/documents/${preview.docId}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open in New Tab
                </a>
              ) : null}
            </div>

            {preview.docId ? (
              <iframe
                title="PDF Preview"
                src={`/api/documents/${preview.docId}`}
                className="w-full flex-1 bg-gray-200"
              />
            ) : (
              <div className="flex-1 p-6 flex items-center justify-center">
                <div className="max-w-lg text-center text-sm text-gray-600 font-medium">
                  No PDF is linked to this preview.
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
