"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import Toast from "@/components/shared/Toast";
import PasswordChangeModal from "@/components/shared/PasswordChangeModal";
import RecordsArchiveTab from "@/components/staff/RecordsArchiveTab";
import ScanUploadTab from "@/components/staff/ScanUploadTab";
import DocumentsTab from "@/components/staff/DocumentsTab";
import PDFPreviewModal from "@/components/shared/PDFPreviewModal";
import OCRPromptModal from "@/components/staff/OCRPromptModal";
import DocTypeModal from "@/components/shared/DocTypeModal";

const rooms = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const cabinets = ["A", "B", "C", "D", "E", "F", "G", "H"];

export default function StaffPage() {
  const router = useRouter();
  const [view, setView] = useState("search");
  const [authUser, setAuthUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const [students, setStudents] = useState([]);
  const [docTypes, setDocTypes] = useState([]);
  const [courses, setCourses] = useState([]);
  const [allDocs, setAllDocs] = useState([]);

  const [currentLevel, setCurrentLevel] = useState("courses");
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [selectedYear, setSelectedYear] = useState(null);
  const [selectedSection, setSelectedSection] = useState(null);

  const [quickQuery, setQuickQuery] = useState("");
  const [quickResults, setQuickResults] = useState([]);
  const [isQuickSearching, setIsQuickSearching] = useState(false);

  const [activeStudent, setActiveStudent] = useState(null);

  const [currentLocatorLevel, setCurrentLocatorLevel] = useState("rooms");
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [selectedCabinet, setSelectedCabinet] = useState(null);

  const [uploadMode, setUploadMode] = useState("existing");
  const [dropActive, setDropActive] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);
  const fileInputRef = useRef(null);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrSuggestion, setOcrSuggestion] = useState(null);
  const [ocrPromptOpen, setOcrPromptOpen] = useState(false);
  const [ocrError, setOcrError] = useState("");

  const [exist, setExist] = useState({ course: "", year: "", section: "", studentId: "", docType: "" });
  const [newRec, setNewRec] = useState({ studentNo: "", name: "", course: "", year: "", sectionPart: "", room: "", cabinet: "", drawer: "", docType: "" });
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
  const [csvBulkRoom, setCsvBulkRoom] = useState("");
  const [csvBulkCabinet, setCsvBulkCabinet] = useState("");
  const [csvBulkDrawer, setCsvBulkDrawer] = useState("");
  const [csvDropActive, setCsvDropActive] = useState(false);
  const csvInputRef = useRef(null);

  const [docsForm, setDocsForm] = useState({ studentNo: "", studentName: "", docType: "" });
  const [docsFile, setDocsFile] = useState(null);
  const docsFileInputRef = useRef(null);
  const [docsRows, setDocsRows] = useState([]);
  const [docsLoading, setDocsLoading] = useState(false);
  const [docsError, setDocsError] = useState("");

  const [previewOpen, setPreviewOpen] = useState(false);
  const [preview, setPreview] = useState({ docType: "", studentName: "", studentNo: "", docId: null, refId: "" });

  const [docTypeModalOpen, setDocTypeModalOpen] = useState(false);
  const [docTypeModalValue, setDocTypeModalValue] = useState("");
  const [docTypeModalError, setDocTypeModalError] = useState("");
  const [docTypeModalLoading, setDocTypeModalLoading] = useState(false);

  const [toast, setToast] = useState({ open: false, msg: "", isError: false });
  const [pwModalOpen, setPwModalOpen] = useState(false);

  const showToast = useCallback((msg, isError = false) => { setToast({ open: true, msg, isError }); }, []);

  const fetchData = useCallback(async () => {
    try {
      const [sRes, dRes, cRes] = await Promise.all([fetch("/api/students"), fetch("/api/doc-types"), fetch("/api/students/batch")]);
      const [sData, dData, cData] = await Promise.all([sRes.json(), dRes.json(), cRes.json()]);
      setStudents(sData.data || []);
      setDocTypes(dData.data || []);
      setCourses(cData.data || []);
    } catch (err) { showToast("Failed to sync database", true); }
  }, [showToast]);

  const fetchAllDocs = useCallback(async () => {
    try {
      const res = await fetch("/api/documents");
      const data = await res.json();
      setAllDocs(data.data || []);
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/auth/me");
        const json = await res.json().catch(() => null);
        if (!res.ok || !json?.ok) { router.push("/"); return; }
        setAuthUser(json.data);
        if (json?.data?.mustChangePassword) { setPwModalOpen(true); }
        fetchData();
        fetchAllDocs();
        setLoading(false);
      } catch { router.push("/"); }
    })();
  }, [router, fetchData, fetchAllDocs]);

  useEffect(() => {
    if (quickQuery.trim().length < 2) { setQuickResults([]); return; }
    setIsQuickSearching(true);
    const timer = setTimeout(() => {
      const q = quickQuery.toLowerCase();
      const results = students.filter(s => s.studentNo.toLowerCase().includes(q) || s.name.toLowerCase().includes(q));
      setQuickResults(results.slice(0, 10));
      setIsQuickSearching(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [quickQuery, students]);

  const logAction = useCallback(async (action) => {
    try {
      await fetch("/api/audit-logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
    } catch { /* silent */ }
  }, []);

  const handleLogout = async () => {
    await logAction("Logged out from system");
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
  };

  const breadcrumbs = useMemo(() => {
    const list = [{ level: "courses", label: "Courses" }];
    if (selectedCourse) list.push({ level: "years", label: selectedCourse });
    if (selectedYear) list.push({ level: "sections", label: `Year ${selectedYear}` });
    if (selectedSection) list.push({ level: "students", label: `Section ${selectedSection}` });
    return list;
  }, [selectedCourse, selectedYear, selectedSection]);

  const explorerItems = useMemo(() => {
    if (currentLevel === "courses") {
      const uniqueCourses = Array.from(new Set(students.map(s => s.courseCode)));
      return uniqueCourses.map(c => ({
        key: c, title: c, subtitle: `${students.filter(s => s.courseCode === c).length} Students`, icon: "ph-folder",
        onClick: () => { setSelectedCourse(c); setCurrentLevel("years"); }
      }));
    }
    if (currentLevel === "years") {
      const years = Array.from(new Set(students.filter(s => s.courseCode === selectedCourse).map(s => s.yearLevel))).sort();
      return years.map(y => ({
        key: String(y), title: `Year ${y}`, subtitle: `${students.filter(s => s.courseCode === selectedCourse && s.yearLevel === y).length} Students`, icon: "ph-folder",
        onClick: () => { setSelectedYear(y); setCurrentLevel("sections"); }
      }));
    }
    if (currentLevel === "sections") {
      const sections = Array.from(new Set(students.filter(s => s.courseCode === selectedCourse && s.yearLevel === selectedYear).map(s => s.section))).sort();
      return sections.map(sec => ({
        key: sec, title: `Section ${sec}`, subtitle: `${students.filter(s => s.courseCode === selectedCourse && s.yearLevel === selectedYear && s.section === sec).length} Students`, icon: "ph-folder",
        onClick: () => { setSelectedSection(sec); setCurrentLevel("students"); }
      }));
    }
    if (currentLevel === "students") {
      return students.filter(s => s.courseCode === selectedCourse && s.yearLevel === selectedYear && s.section === selectedSection).map(s => ({ key: s.studentNo, student: s }));
    }
    return [];
  }, [currentLevel, students, selectedCourse, selectedYear, selectedSection]);

  const locatorModel = useMemo(() => {
    if (currentLocatorLevel === "rooms") {
      return { kind: "rooms", title: "PUP Storage Rooms", rooms: rooms.map(r => ({ room: r, occupiedCount: students.filter(s => s.room === r).length, isTarget: activeStudent?.room === r })) };
    }
    if (currentLocatorLevel === "cabinets") {
      return { kind: "cabinets", cabinets: cabinets.map(c => ({ cab: c, occupiedCount: students.filter(s => s.room === selectedRoom && s.cabinet === c).length, isTarget: activeStudent?.room === selectedRoom && activeStudent?.cabinet === c })) };
    }
    if (currentLocatorLevel === "drawers") {
      return { kind: "drawers", drawers: [1, 2, 3, 4].map(d => ({ drawer: d, count: students.filter(s => s.room === selectedRoom && s.cabinet === selectedCabinet && s.drawer === d).length, isTarget: activeStudent?.room === selectedRoom && activeStudent?.cabinet === selectedCabinet && activeStudent?.drawer === d })) };
    }
    return { kind: "none" };
  }, [currentLocatorLevel, selectedRoom, selectedCabinet, students, activeStudent]);

  const activeStudentDocs = useMemo(() => activeStudent ? allDocs.filter(d => d.student_no === activeStudent.studentNo) : [], [activeStudent, allDocs]);

  const locateStudent = (s) => {
    setSelectedCourse(s.courseCode); setSelectedYear(s.yearLevel); setSelectedSection(s.section);
    setCurrentLevel("students"); setActiveStudent(s);
    setSelectedRoom(s.room); setSelectedCabinet(s.cabinet); setCurrentLocatorLevel("drawers");
  };

  const applyStudentNoMask = (val) => {
    let clean = val.replace(/[^0-9A-Z]/g, "").toUpperCase();
    let res = ""; let invalid = false;
    for (let i = 0; i < clean.length; i++) {
      if (i < 4) { if (!/[0-9]/.test(clean[i])) invalid = true; res += clean[i]; if (i === 3) res += "-"; }
      else if (i < 9) { if (!/[0-9]/.test(clean[i])) invalid = true; res += clean[i]; if (i === 8) res += "-"; }
      else if (i < 11) { if (!/[A-Z]/.test(clean[i])) invalid = true; res += clean[i]; if (i === 10) res += "-"; }
      else if (i === 11) { if (!/[0-9]/.test(clean[i])) invalid = true; res += clean[i]; }
    }
    return { value: res, invalid };
  };

  const handleFileSelect = async (file) => {
    if (!file) return; setUploadedFile(file); setOcrError("");
    if (uploadMode === "new") {
      setOcrLoading(true);
      try {
        const formData = new FormData(); formData.append("file", file);
        const res = await fetch("/api/system/tools/decrypt-script", { method: "POST", body: formData });
        const data = await res.json(); if (!res.ok) throw new Error(data.error || "OCR failed");
        setOcrSuggestion(data); setOcrPromptOpen(true);
      } catch { setOcrError("Automatic detection failed. Please fill manually."); }
      finally { setOcrLoading(false); }
    }
  };

  const processSubmission = async () => {
    if (!uploadedFile) { showToast("Please select a PDF file first", true); return; }
    const payload = new FormData(); payload.append("file", uploadedFile);
    if (uploadMode === "existing") {
      if (!exist.studentId || !exist.docType) { showToast("Please select student and document type", true); return; }
      payload.append("studentNo", exist.studentId); payload.append("docType", exist.docType);
    } else {
      if (!newRec.studentNo || !newRec.name || !newRec.course || !newRec.year || !newRec.sectionPart || !newRec.room || !newRec.cabinet || !newRec.drawer || !newRec.docType) {
        showToast("Please fill all student details", true); return;
      }
      payload.append("studentNo", newRec.studentNo); payload.append("studentName", newRec.name);
      payload.append("courseCode", newRec.course); payload.append("yearLevel", newRec.year);
      payload.append("section", `${newRec.year}-${newRec.sectionPart}`);
      payload.append("room", newRec.room); payload.append("cabinet", newRec.cabinet);
      payload.append("drawer", newRec.drawer); payload.append("docType", newRec.docType);
      payload.append("isNewStudent", "true");
    }
    try {
      const res = await fetch("/api/documents", { method: "POST", body: payload });
      const data = await res.json(); if (!res.ok) throw new Error(data.error || "Upload failed");
      await logAction(`Uploaded ${payload.get("docType")} for ${payload.get("studentNo")}`);
      showToast("Upload successful!"); setUploadedFile(null); fetchData(); fetchAllDocs();
    } catch (err) { showToast(err.message, true); }
  };

  const refreshDocuments = async (form) => {
    setDocsLoading(true);
    try {
      const q = new URLSearchParams();
      if (form.studentNo) q.append("studentNo", form.studentNo);
      if (form.studentName) q.append("studentName", form.studentName);
      if (form.docType) q.append("docType", form.docType);
      const res = await fetch(`/api/documents?${q.toString()}`);
      const data = await res.json(); setDocsRows(data.data || []);
    } catch { setDocsError("Failed to load documents"); }
    finally { setDocsLoading(false); }
  };

  if (loading) return <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center"><div className="w-12 h-12 rounded-full border-4 border-gray-200 border-t-pup-maroon animate-spin"></div><p className="mt-4 text-gray-500 font-bold">Initialising...</p></div>;

  return (
    <div className="h-screen bg-gray-50 flex flex-col font-inter overflow-hidden">
      <Header authUser={authUser} onLogout={handleLogout}>
        <button onClick={() => setView("search")} className={`px-4 py-2 rounded-brand text-sm font-bold transition-all ${view === "search" ? "bg-pup-maroon text-white" : "text-gray-500 hover:bg-gray-100"}`}>Records & Archive</button>
        <button onClick={() => setView("upload")} className={`px-4 py-2 rounded-brand text-sm font-bold transition-all ${view === "upload" ? "bg-pup-maroon text-white" : "text-gray-500 hover:bg-gray-100"}`}>Scan & Upload</button>
        <button onClick={() => setView("documents")} className={`px-4 py-2 rounded-brand text-sm font-bold transition-all ${view === "documents" ? "bg-pup-maroon text-white" : "text-gray-500 hover:bg-gray-100"}`}>Documents</button>
        <button onClick={() => setDocTypeModalOpen(true)} className="px-4 py-2 text-gray-500 hover:text-pup-maroon"><i className="ph-bold ph-gear"></i></button>
      </Header>
      <main className="flex-1 overflow-hidden max-w-[1600px] mx-auto w-full p-4">
        {view === "search" && <RecordsArchiveTab
          quickQuery={quickQuery} setQuickQuery={setQuickQuery} isQuickSearching={isQuickSearching} quickResults={quickResults} onLocateStudent={locateStudent}
          breadcrumbs={breadcrumbs} currentLevel={currentLevel} onBreadcrumbClick={(b) => {
            if (b.level === "courses") { setCurrentLevel("courses"); setSelectedCourse(null); setSelectedYear(null); setSelectedSection(null); setActiveStudent(null); setCurrentLocatorLevel("rooms"); }
            else if (b.level === "years") { setCurrentLevel("years"); setSelectedYear(null); setSelectedSection(null); }
            else if (b.level === "sections") { setCurrentLevel("sections"); setSelectedSection(null); }
          }}
          students={students} explorerItems={explorerItems} onSwitchView={setView} locatorModel={locatorModel}
          selectedRoom={selectedRoom} setSelectedRoom={setSelectedRoom} setSelectedCabinet={setSelectedCabinet}
          setCurrentLocatorLevel={setCurrentLocatorLevel} selectedCabinet={selectedCabinet} currentLocatorLevel={currentLocatorLevel}
          activeStudent={activeStudent} activeStudentDocs={activeStudentDocs} onPreviewDocument={(docType, name, no, id) => { setPreview({ docType, studentName: name, studentNo: no, docId: id, refId: `DOC-${Date.now()}` }); setPreviewOpen(true); }}
        />}
        {view === "upload" && <ScanUploadTab
          uploadMode={uploadMode} setUploadMode={(m) => { setUploadMode(m); setUploadError(""); setCsvError(""); }}
          dropActive={dropActive} setDropActive={setDropActive} uploadedFile={uploadedFile} fileInputRef={fileInputRef}
          onFileSelect={handleFileSelect} onClearFile={() => { setUploadedFile(null); setOcrSuggestion(null); }}
          ocrLoading={ocrLoading} ocrError={ocrError} csvFile={csvFile} csvRows={csvRows} csvSelected={csvSelected}
          toggleCsvSelectAll={(c) => { const n = {}; if (c) csvRows.forEach(r => n[r.index] = true); setCsvSelected(n); }}
          toggleCsvRowSelected={(i) => setCsvSelected(p => ({ ...p, [i]: !p[i] }))}
          setCsvRowField={(i, f, v) => { const n = [...csvRows]; const r = n.find(x => x.index === i); if (r) r.student[f] = v; setCsvRows(n); }}
          cabinets={cabinets} exist={exist} setExist={setExist} courses={courses} docTypes={docTypes} processSubmission={processSubmission}
          uploadError={uploadError} newRec={newRec} setNewRec={setNewRec} newRecStudentNoHint={newRecStudentNoHint} setNewRecStudentNoTouched={setNewRecStudentNoTouched}
          applyStudentNoMask={applyStudentNoMask} newStudentNoInputRef={newStudentNoInputRef} newAvailYears={[1, 2, 3, 4, 5]} rooms={rooms}
          csvInputRef={csvInputRef} handleCsvFileSelect={(f) => {
            if (!f) return; setCsvFile(f); setCsvError(""); setCsvLoading(true);
            const r = new FileReader(); r.onload = (e) => {
              const lines = e.target.result.split(/\r?\n/); const headers = lines[0].split(",").map(h => h.trim());
              const rows = lines.slice(1).filter(l => l.trim()).map((l, i) => {
                const vals = l.split(","); const row = {}; headers.forEach((h, idx) => row[h] = vals[idx]?.trim());
                return { index: i + 1, student: { studentNo: row.studentNo, name: row.name, courseCode: row.courseCode, yearLevel: parseInt(row.academicYear) || 1, section: row.section, room: parseInt(row.room) || 1, cabinet: row.cabinet || "A", drawer: parseInt(row.drawer) || 1 }, error: "" };
              });
              setCsvRows(rows); setCsvLoading(false);
            }; r.readAsText(f);
          }}
          csvDropActive={csvDropActive} setCsvDropActive={setCsvDropActive} csvError={csvError}
          csvBulkRoom={csvBulkRoom} setCsvBulkRoom={setCsvBulkRoom} csvBulkCabinet={csvBulkCabinet} setCsvBulkCabinet={setCsvBulkCabinet}
          csvBulkDrawer={csvBulkDrawer} setCsvBulkDrawer={setCsvBulkDrawer}
          applyCsvBulkLocation={() => { const n = [...csvRows]; n.forEach(r => { if (csvSelected[r.index]) { if (csvBulkRoom) r.student.room = parseInt(csvBulkRoom); if (csvBulkCabinet) r.student.cabinet = csvBulkCabinet; if (csvBulkDrawer) r.student.drawer = parseInt(csvBulkDrawer); } }); setCsvRows(n); }}
          setCsvSelected={setCsvSelected} importCsvStudents={async () => {
            const targets = csvRows.filter(r => csvSelected[r.index]); setCsvLoading(true); const res = [];
            for (const r of targets) { try { const rs = await fetch("/api/students", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(r.student) }); res.push({ ok: rs.ok }); } catch { res.push({ ok: false }); } }
            setCsvResults(res); setCsvLoading(false); showToast(`Processed ${res.length} students`); fetchData(); setCsvSelected({});
          }}
          csvLoading={csvLoading} csvResults={csvResults}
          existingAvailYears={exist.course ? Array.from(new Set(students.filter(s => s.courseCode === exist.course).map(s => s.yearLevel))).sort() : []}
          existingAvailSections={exist.course && exist.year ? Array.from(new Set(students.filter(s => s.courseCode === exist.course && s.yearLevel === parseInt(exist.year)).map(s => s.section))).sort() : []}
          existingStudents={exist.course && exist.year && exist.section ? students.filter(s => s.courseCode === exist.course && s.yearLevel === parseInt(exist.year) && s.section === exist.section) : []}
        />}
        {view === "documents" && <DocumentsTab
          docsForm={docsForm} setDocsForm={setDocsForm} refreshDocuments={refreshDocuments} docTypes={docTypes} docsFileInputRef={docsFileInputRef}
          setDocsFile={setDocsFile} uploadDocument={async (e) => {
            e.preventDefault(); if (!docsFile) return; setDocsLoading(true);
            try {
              const p = new FormData(); p.append("file", docsFile); p.append("studentNo", docsForm.studentNo); p.append("studentName", docsForm.studentName); p.append("docType", docsForm.docType);
              const r = await fetch("/api/documents", { method: "POST", body: p }); if (!r.ok) throw new Error("Upload failed");
              showToast("Document uploaded!"); setDocsFile(null); if (docsFileInputRef.current) docsFileInputRef.current.value = ""; refreshDocuments(docsForm); fetchAllDocs();
            } catch (err) { setDocsError(err.message); } finally { setDocsLoading(false); }
          }}
          docsLoading={docsLoading} docsError={docsError} docsRows={docsRows} updateDoc={async (id, data) => {
            try {
              const r = await fetch(`/api/documents/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
              if (!r.ok) throw new Error("Update failed"); showToast("Document updated!"); refreshDocuments(docsForm); fetchAllDocs();
            } catch (err) { showToast(err.message, true); }
          }}
        />}
      </main>
      <Footer />
      <PasswordChangeModal open={pwModalOpen} authUser={authUser} onClose={() => setPwModalOpen(false)} onSuccess={showToast} onLogAction={logAction} />
      <PDFPreviewModal open={previewOpen} onClose={() => setPreviewOpen(false)} preview={preview} />
      <OCRPromptModal open={ocrPromptOpen} onClose={() => setOcrPromptOpen(false)} ocrSuggestion={ocrSuggestion}
        onApplyToExisting={() => { const s = ocrSuggestion.matchedStudent; setUploadMode("existing"); setExist(p => ({ ...p, course: s.courseCode, year: String(s.yearLevel), section: s.section, studentId: s.studentNo, docType: ocrSuggestion.docType || p.docType })); setOcrPromptOpen(false); }}
        onApplyToNew={() => { setUploadMode("new"); setNewRec(p => ({ ...p, studentNo: ocrSuggestion?.studentNo || p.studentNo, name: ocrSuggestion?.name || p.name, docType: ocrSuggestion?.docType || p.docType })); setOcrPromptOpen(false); }}
      />
      <DocTypeModal open={docTypeModalOpen} onClose={() => setDocTypeModalOpen(false)} value={docTypeModalValue} setValue={setDocTypeModalValue} error={docTypeModalError} setError={setDocTypeModalError}
        onSave={async () => {
          const v = docTypeModalValue.trim(); if (!v) { setDocTypeModalError("Value is required"); return; } setDocTypeModalLoading(true);
          try {
            const r = await fetch("/api/doc-types", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: v }) });
            if (!r.ok) throw new Error("Failed to save"); showToast("Document type added"); setDocTypeModalOpen(false); setDocTypeModalValue(""); fetchData();
          } catch (err) { setDocTypeModalError(err.message); } finally { setDocTypeModalLoading(false); }
        }}
        isLoading={docTypeModalLoading}
      />
      <Toast {...toast} onClose={() => setToast({ ...toast, open: false })} />
    </div>
  );
}
