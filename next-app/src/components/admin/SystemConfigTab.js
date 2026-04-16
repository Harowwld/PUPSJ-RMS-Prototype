import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import ConfirmModal from "@/components/shared/ConfirmModal";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

export default function SystemConfigTab({ showToast, logAdminAction, onVerifyTOTP, error = null }) {
  const [docTypes, setDocTypes] = useState([]);
  const [courses, setCourses] = useState([]);
  const [sections, setSections] = useState([]);
  const [securityQuestions, setSecurityQuestions] = useState(["", "", "", "", ""]);
  const [securitySaving, setSecuritySaving] = useState(false);

  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);

  const [dtName, setDtName] = useState("");
  const [cCode, setCCode] = useState("");
  const [cName, setCName] = useState("");
  const [secName, setSecName] = useState("");
  const [secCourseCode, setSecCourseCode] = useState("");
  const [selectedCourseFilter, setSelectedCourseFilter] = useState("");

  const [activeSubTab, setActiveSubTab] = useState("document-types");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmPayload, setConfirmPayload] = useState(null);

  const [isAddDocTypeOpen, setIsAddDocTypeOpen] = useState(false);
  const [isAddCourseOpen, setIsAddCourseOpen] = useState(false);
  const [isAddSectionOpen, setIsAddSectionOpen] = useState(false);
  const [isEditDocTypeOpen, setIsEditDocTypeOpen] = useState(false);
  const [isEditCourseOpen, setIsEditCourseOpen] = useState(false);
  const [isEditSectionOpen, setIsEditSectionOpen] = useState(false);

  const [editDocType, setEditDocType] = useState({ id: null, name: "" });
  const [editCourse, setEditCourse] = useState({ id: null, code: "", name: "" });
  const [editSection, setEditSection] = useState({
    id: null,
    name: "",
    courseCode: "",
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [resDt, resC, resSec, resSq] = await Promise.all([
        fetch("/api/doc-types?admin=true"),
        fetch("/api/courses"),
        fetch("/api/sections"),
        fetch("/api/system/security-questions"),
      ]);
      const jsonDt = await resDt.json();
      const jsonC = await resC.json();
      const jsonSec = await resSec.json();
      const jsonSq = await resSq.json().catch(() => null);

      if (jsonDt.ok) setDocTypes(jsonDt.data);
      if (jsonC.ok) setCourses(jsonC.data);
      if (jsonSec.ok) setSections(jsonSec.data);
      if (jsonSq?.ok && Array.isArray(jsonSq.data)) {
        const qs = [...jsonSq.data];
        while (qs.length < 5) qs.push("");
        setSecurityQuestions(qs.slice(0, 5));
      }
    } catch (err) {
      showToast({ title: "Load Failed", description: "Unable to load system configuration data." }, true);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col w-full h-full gap-4 animate-fade-in font-inter">
        <Card className="flex-1 bg-white rounded-brand border border-gray-300 shadow-sm overflow-hidden flex flex-col">
          <CardContent className="p-6 flex-1 flex flex-col min-h-0">
            <div className="space-y-4">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-20 rounded-brand" />
                ))}
              </div>
              <Skeleton className="h-4 w-full max-w-md rounded-brand" />
              <Skeleton className="h-32 rounded-brand" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col w-full h-full gap-4 animate-fade-in font-inter">
        <Card className="flex-1 bg-white rounded-brand border border-gray-300 shadow-sm overflow-hidden flex flex-col">
          <CardContent className="p-6 flex-1 flex flex-col min-h-0">
            <div className="h-[320px] flex flex-col items-center justify-center text-center text-gray-500">
              <div className="w-16 h-16 rounded-full bg-white border border-gray-200 flex items-center justify-center mb-4 shadow-sm">
                <i className="ph-duotone ph-warning-circle text-3xl text-pup-maroon" />
              </div>
              <p className="text-lg font-bold text-gray-900">Could not load report</p>
              <p className="text-sm font-medium text-gray-600 mt-1 max-w-md">{error}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const addDocType = async (e) => {
    e.preventDefault();
    if (!dtName.trim()) return;
    try {
      const res = await fetch("/api/doc-types?admin=true", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: dtName }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "Failed");
      setDtName("");
      setIsAddDocTypeOpen(false);
      showToast({ title: "Document Type Added", description: `"${dtName.trim()}" is now available as a document category.` });
      fetchData();
    } catch (err) {
      showToast({ title: "Creation Failed", description: err.message }, true);
    }
  };

  const delDocType = async (id, name) => {
    try {
      const res = await fetch(`/api/doc-types/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "Failed");
      showToast({ title: "Document Type Removed", description: `"${name}" has been permanently deleted.` });
      fetchData();
    } catch (err) {
      showToast({ title: "Deletion Failed", description: err.message }, true);
    }
  };

  const updDocType = async (e) => {
    e.preventDefault();
    if (!editDocType?.id || !String(editDocType.name || "").trim()) return;
    try {
      const res = await fetch(`/api/doc-types/${editDocType.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editDocType.name }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "Failed");
      setIsEditDocTypeOpen(false);
      showToast({ title: "Document Type Updated", description: "Changes to the document type have been saved." });
      fetchData();
    } catch (err) {
      showToast({ title: "Update Failed", description: err.message }, true);
    }
  };

  const addCourse = async (e) => {
    e.preventDefault();
    if (!cCode.trim() || !cName.trim()) return;
    try {
      const res = await fetch("/api/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: cCode, name: cName }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "Failed");
      setCCode("");
      setCName("");
      setIsAddCourseOpen(false);
      showToast({ title: "Program Added", description: `"${cName.trim()}" has been registered as a degree program.` });
      fetchData();
    } catch (err) {
      showToast({ title: "Creation Failed", description: err.message }, true);
    }
  };

  const delCourse = async (id, code) => {
    try {
      const res = await fetch(`/api/courses/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "Failed");
      showToast({ title: "Program Removed", description: `"${code}" has been permanently deleted.` });
      fetchData();
    } catch (err) {
      showToast({ title: "Deletion Failed", description: err.message }, true);
    }
  };

  const updCourse = async (e) => {
    e.preventDefault();
    if (!editCourse?.id || !String(editCourse.code || "").trim() || !String(editCourse.name || "").trim()) return;
    try {
      const res = await fetch(`/api/courses/${editCourse.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: editCourse.code, name: editCourse.name }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "Failed");
      setIsEditCourseOpen(false);
      showToast({ title: "Program Updated", description: "Changes to the degree program have been saved." });
      fetchData();
    } catch (err) {
      showToast({ title: "Update Failed", description: err.message }, true);
    }
  };

  const addSection = async (e) => {
    e.preventDefault();
    if (!secName.trim() || !secCourseCode.trim()) return;
    try {
      const res = await fetch("/api/sections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: secName, courseCode: secCourseCode }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "Failed");
      setSecName("");
      setSecCourseCode("");
      setIsAddSectionOpen(false);
      showToast({ title: "Section Added", description: `"${secName.trim()}" block has been created.` });
      fetchData();
    } catch (err) {
      showToast({ title: "Creation Failed", description: err.message }, true);
    }
  };

  const delSection = async (id, name) => {
    try {
      const res = await fetch(`/api/sections/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "Failed");
      showToast({ title: "Section Removed", description: `"${name}" has been permanently deleted.` });
      fetchData();
    } catch (err) {
      showToast({ title: "Deletion Failed", description: err.message }, true);
    }
  };

  const updSection = async (e) => {
    e.preventDefault();
    if (!editSection?.id || !String(editSection.name || "").trim() || !String(editSection.courseCode || "").trim()) return;
    try {
      const res = await fetch(`/api/sections/${editSection.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editSection.name, courseCode: editSection.courseCode }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "Failed");
      setIsEditSectionOpen(false);
      showToast({ title: "Section Updated", description: "Changes to the section block have been saved." });
      fetchData();
    } catch (err) {
      showToast({ title: "Update Failed", description: err.message }, true);
    }
  };

  const saveSecurityQuestions = async (e, totpToken = null) => {
    e.preventDefault();
    setSecuritySaving(true);
    const headers = { "Content-Type": "application/json" };
    if (totpToken) {
      headers["x-totp-token"] = totpToken;
    }
    try {
      const res = await fetch("/api/system/security-questions", {
        method: "PUT",
        headers,
        body: JSON.stringify({ questions: securityQuestions }),
      });
      const json = await res.json();
      
      if (res.status === 403) {
        if (json?.requiresTOTP && onVerifyTOTP) {
          if (totpToken) {
            setSecuritySaving(false);
            throw new Error(json.error || "Invalid verification code");
          }
          setSecuritySaving(false);
          await onVerifyTOTP((token) => saveSecurityQuestions(e, token));
          return;
        }
        throw new Error(json?.error || "Access denied");
      }
      
      if (!res.ok || !json.ok) throw new Error(json.error || "Failed");
      showToast({ title: "Security Settings Updated", description: "Global security questions have been saved successfully." });
      fetchData();
    } catch (err) {
      if (totpToken) { setSecuritySaving(false); throw err; }
      showToast({ title: "Update Failed", description: err.message }, true);
    }
    setSecuritySaving(false);
  };

  const handleCopySample = async () => {
    const text = "Category,Name,Code\nDocumentType,Birth Certificate,\nCourse,Bachelor of Science in IT,BSIT\nSection,Block 1,BSIT";
    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(text);
        showToast({ title: "Copied", description: "CSV template sample is on your clipboard." });
        return;
      } catch (err) {
        // Fallback below
      }
    }

    try {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.position = "fixed";
      textArea.style.left = "-9999px";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      document.execCommand("copy");
      textArea.remove();
      showToast({ title: "Copied", description: "CSV template sample is on your clipboard." });
    } catch (err) {
      showToast({ title: "Copy Failed", description: "Please manually copy the example from the preview." }, true);
    }
  };

  const handleCsvImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target.result;
        const lines = text.split(/\r?\n/).filter((line) => line.trim());
        if (lines.length < 2)
          throw new Error("CSV file is empty or missing headers");

        const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
        const catIdx = headers.indexOf("category");
        const nameIdx = headers.indexOf("name");
        const codeIdx = headers.indexOf("code");

        if (catIdx === -1 || nameIdx === -1) {
          throw new Error(
            "CSV must have 'Category' and 'Name' columns. 'Code' is required for Courses and Sections.",
          );
        }

        const bulkRows = [];
        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(",").map((c) => c.trim());
          const category = cols[catIdx]?.toLowerCase();
          const name = cols[nameIdx];
          const code = codeIdx !== -1 ? cols[codeIdx] : "";
          if (category && name) bulkRows.push({ category, name, code });
        }

        let successCount = 0;
        let failCount = 0;
        
        try {
          const res = await fetch("/api/system/bulk-import", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ rows: bulkRows }),
          });
          const json = await res.json();
          if (!res.ok || !json.ok) throw new Error(json.error || "Batch import failed");
          
          successCount = json.data.successCount;
          failCount = json.data.failCount;
        } catch (err) {
          throw new Error("Failed to process bulk import: " + err.message);
        }

        if (failCount > 0 && successCount === 0) {
          showToast(
            { title: "Import Failed", description: `All ${failCount} records failed. Please check your data format.` },
            "error"
          );
        } else if (failCount > 0) {
          showToast(
            { title: "Import Partially Failed", description: `${successCount} records processed, ${failCount} failed.` },
            "warning"
          );
        } else {
          showToast(
            { title: "Bulk Import Complete", description: `${successCount} records processed successfully.` }
          );
        }
        fetchData();
      } catch (err) {
        showToast({ title: "Import Failed", description: err.message }, true);
      } finally {
        setImporting(false);
        e.target.value = "";
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="flex flex-col w-full h-full gap-4 animate-fade-in font-inter">
      <div className="bg-gray-100 p-1.5 rounded-brand inline-flex gap-1 w-full sm:w-fit shadow-[inset_0_1px_2px_rgba(0,0,0,0.05)] overflow-x-auto shrink-0 border border-gray-200/60">
        <button
          onClick={() => setActiveSubTab("document-types")}
          className={`px-5 py-2.5 text-sm font-bold rounded flex shrink-0 items-center justify-center gap-2 transition-all ${
            activeSubTab === "document-types"
              ? "bg-white text-pup-maroon shadow-sm ring-1 ring-gray-200"
              : "text-gray-500 hover:text-gray-900 hover:bg-gray-200/50"
          }`}
        >
          <i className="ph-duotone ph-files text-lg"></i> Document Types
        </button>
        <button
          onClick={() => setActiveSubTab("degree-programs")}
          className={`px-5 py-2.5 text-sm font-bold rounded flex shrink-0 items-center justify-center gap-2 transition-all ${
            activeSubTab === "degree-programs"
              ? "bg-white text-pup-maroon shadow-sm ring-1 ring-gray-200"
              : "text-gray-500 hover:text-gray-900 hover:bg-gray-200/50"
          }`}
        >
          <i className="ph-duotone ph-books text-lg"></i> Degree Programs
        </button>
        <button
          onClick={() => setActiveSubTab("course-blocks")}
          className={`px-5 py-2.5 text-sm font-bold rounded flex shrink-0 items-center justify-center gap-2 transition-all ${
            activeSubTab === "course-blocks"
              ? "bg-white text-pup-maroon shadow-sm ring-1 ring-gray-200"
              : "text-gray-500 hover:text-gray-900 hover:bg-gray-200/50"
          }`}
        >
          <i className="ph-duotone ph-list-numbers text-lg"></i> Course Blocks
        </button>
        <button
          onClick={() => setActiveSubTab("bulk-import")}
          className={`px-5 py-2.5 text-sm font-bold rounded flex shrink-0 items-center justify-center gap-2 transition-all ${
            activeSubTab === "bulk-import"
              ? "bg-white text-pup-maroon shadow-sm ring-1 ring-gray-200"
              : "text-gray-500 hover:text-gray-900 hover:bg-gray-200/50"
          }`}
        >
          <i className="ph-duotone ph-upload-simple text-lg"></i> Imports
        </button>
        <button
          onClick={() => setActiveSubTab("security-questions")}
          className={`px-5 py-2.5 text-sm font-bold rounded flex shrink-0 items-center justify-center gap-2 transition-all ${
            activeSubTab === "security-questions"
              ? "bg-white text-pup-maroon shadow-sm ring-1 ring-gray-200"
              : "text-gray-500 hover:text-gray-900 hover:bg-gray-200/50"
          }`}
        >
          <i className="ph-duotone ph-lock-key text-lg"></i> Security
        </button>
      </div>

      <Card className="flex-1 bg-white rounded-brand border border-gray-200 shadow-sm overflow-hidden flex flex-col p-0">
        {activeSubTab === "document-types" && (
          <div className="flex flex-col h-full animate-fade-in w-full overflow-hidden">
            <div className="p-5 border-b border-gray-200 bg-gray-50 flex flex-col md:flex-row gap-4 justify-between md:items-center">
              <div>
                <CardTitle className="font-bold text-gray-900 text-base">
                  Document Types
                </CardTitle>
                <CardDescription className="text-xs font-medium text-gray-500 mt-0.5">
                  Manage formal document categories
                </CardDescription>
              </div>
              <Button
                onClick={() => setIsAddDocTypeOpen(true)}
                className="bg-pup-maroon text-white h-10 px-5 font-bold shadow-sm flex items-center gap-2 hover:bg-red-900 transition-colors w-full md:w-auto"
              >
                <i className="ph-bold ph-plus"></i> Add Document Type
              </Button>
            </div>
            <div className="flex-1 overflow-auto min-h-0 bg-white relative">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10 shadow-sm">
                  <tr className="text-left text-xs uppercase tracking-wider text-gray-500">
                    <th className="p-3 font-bold px-6">Document Name</th>
                    <th className="p-3 font-bold text-right px-6 w-48 border-l border-gray-200">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {docTypes.map((dt) => (
                    <tr
                      key={dt.id}
                      className="hover:bg-red-50/50 transition-colors group"
                    >
                      <td className="p-3 px-6 font-bold text-gray-800">
                        {dt.name}
                      </td>
                      <td className="p-3 px-6 text-right">
                        <div className="inline-flex items-center justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setEditDocType({ id: dt.id, name: dt.name });
                              setIsEditDocTypeOpen(true);
                            }}
                            className="h-8 px-3 font-bold text-xs border-gray-300 text-gray-700 hover:text-pup-maroon hover:bg-red-50"
                          >
                            <i className="ph-bold ph-pencil-simple mr-1.5"></i>
                            Edit
                          </Button>
                          <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setConfirmPayload({
                              title: "Delete Document Type",
                              message: `Delete document type "${dt.name}"?`,
                              confirmLabel: "Delete",
                              onConfirm: () => delDocType(dt.id, dt.name),
                            });
                            setConfirmOpen(true);
                          }}
                          className="h-8 px-3 font-bold text-xs border-red-300 text-red-700 hover:text-red-800 hover:bg-red-50"
                        >
                          <i className="ph-bold ph-trash mr-1.5"></i>
                          Delete
                        </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {docTypes.length === 0 && (
                    <tr className="border-0 hover:bg-transparent">
                      <td colSpan={2} className="p-0 border-0">
                        <div className="h-[400px] flex flex-col items-center justify-center text-center text-gray-500">
                          <div className="w-16 h-16 rounded-full bg-white border border-gray-200 flex items-center justify-center mb-4 shadow-sm">
                            <i className="ph-duotone ph-files text-3xl text-pup-maroon"></i>
                          </div>
                          <div className="text-lg font-bold text-gray-900">
                            No document types yet
                          </div>
                          <div className="text-sm font-medium text-gray-500 mt-1 max-w-sm">
                            Use the form above to add a new document
                            configuration to the system framework.
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeSubTab === "degree-programs" && (
          <div className="flex flex-col h-full animate-fade-in w-full overflow-hidden">
            <div className="p-5 border-b border-gray-200 bg-gray-50 flex flex-col lg:flex-row gap-4 justify-between lg:items-center">
              <div>
                <CardTitle className="font-bold text-gray-900 text-base">
                  Degree Programs
                </CardTitle>
                <CardDescription className="text-xs font-medium text-gray-500 mt-0.5">
                  Manage available university course paths for students.
                </CardDescription>
              </div>
              <Button
                onClick={() => setIsAddCourseOpen(true)}
                className="bg-pup-maroon text-white h-10 px-5 font-bold shadow-sm flex items-center gap-2 hover:bg-red-900 transition-colors w-full lg:w-auto"
              >
                <i className="ph-bold ph-plus"></i> Add Degree Program
              </Button>
            </div>
            <div className="flex-1 overflow-auto min-h-0 bg-white relative">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10 shadow-sm">
                  <tr className="text-left text-xs uppercase tracking-wider text-gray-500">
                    <th className="p-3 font-bold px-6 w-48 border-r border-gray-200">
                      Course Code
                    </th>
                    <th className="p-3 font-bold px-6">Full Designation</th>
                    <th className="p-3 font-bold text-right px-6 w-56 border-l border-gray-200">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {courses.map((c) => (
                    <tr
                      key={c.id}
                      className="hover:bg-red-50/50 transition-colors group"
                    >
                      <td className="p-3 px-6 font-black text-gray-900">
                        {c.code}
                      </td>
                      <td className="p-3 px-6 font-bold text-gray-600">
                        {c.name}
                      </td>
                      <td className="p-3 px-6 text-right">
                        <div className="inline-flex items-center justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setEditCourse({ id: c.id, code: c.code, name: c.name });
                              setIsEditCourseOpen(true);
                            }}
                            className="h-8 px-3 font-bold text-xs border-gray-300 text-gray-700 hover:text-pup-maroon hover:bg-red-50"
                          >
                            <i className="ph-bold ph-pencil-simple mr-1.5"></i>
                            Edit
                          </Button>
                          <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setConfirmPayload({
                              title: "Delete Degree Program",
                              message: `Delete degree program "${c.code}"?`,
                              confirmLabel: "Delete",
                              onConfirm: () => delCourse(c.id, c.code),
                            });
                            setConfirmOpen(true);
                          }}
                          className="h-8 px-3 font-bold text-xs border-red-300 text-red-700 hover:text-red-800 hover:bg-red-50"
                        >
                          <i className="ph-bold ph-trash mr-1.5"></i>
                          Delete
                        </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {courses.length === 0 && (
                    <tr className="border-0 hover:bg-transparent">
                      <td colSpan={3} className="p-0 border-0">
                        <div className="h-[400px] flex flex-col items-center justify-center text-center text-gray-500">
                          <div className="w-16 h-16 rounded-full bg-white border border-gray-200 flex items-center justify-center mb-4 shadow-sm">
                            <i className="ph-duotone ph-books text-3xl text-pup-maroon"></i>
                          </div>
                          <div className="text-lg font-bold text-gray-900">
                            No degree programs yet
                          </div>
                          <div className="text-sm font-medium text-gray-500 mt-1 max-w-sm">
                            Use the form above to deploy a new university course
                            path.
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeSubTab === "course-blocks" && (
          <div className="flex flex-col h-full animate-fade-in w-full overflow-hidden">
            <div className="p-5 border-b border-gray-200 bg-gray-50 flex flex-col md:flex-row gap-4 justify-between md:items-center">
              <div>
                <CardTitle className="font-bold text-gray-900 text-base">
                  Course Blocks (Sections)
                </CardTitle>
                <CardDescription className="text-xs font-medium text-gray-500 mt-0.5">
                  Construct logical section blocks for student routing.
                </CardDescription>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <select
                  className="h-10 w-full rounded-brand border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-900 shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-pup-maroon focus:border-pup-maroon"
                  value={selectedCourseFilter}
                  onChange={(e) => setSelectedCourseFilter(e.target.value)}
                >
                  <option value="">All Degree Programs</option>
                  {courses.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.code} - {c.name}
                    </option>
                  ))}
                </select>
                <Button
                  onClick={() => {
                    setSecCourseCode(selectedCourseFilter);
                    setIsAddSectionOpen(true);
                  }}
                  className="bg-pup-maroon text-white h-10 px-5 font-bold shadow-sm flex items-center gap-2 hover:bg-red-900 transition-colors w-full sm:w-auto shrink-0"
                >
                  <i className="ph-bold ph-plus"></i> Add Course Block
                </Button>
              </div>
            </div>
            <div className="flex-1 overflow-auto min-h-0 bg-white relative">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10 shadow-sm">
                  <tr className="text-left text-xs uppercase tracking-wider text-gray-500">
                    <th className="p-3 font-bold px-6 border-r border-gray-200 w-48">
                      Degree Program
                    </th>
                    <th className="p-3 font-bold px-6">Block Identifier</th>
                    <th className="p-3 font-bold text-right px-6 w-56 border-l border-gray-200">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {sections
                    .filter(
                      (sec) =>
                        selectedCourseFilter === "" ||
                        sec.course_code === selectedCourseFilter,
                    )
                    .map((sec) => (
                      <tr
                        key={sec.id}
                        className="hover:bg-red-50/50 transition-colors group"
                      >
                        <td className="p-3 px-6 border-r border-gray-100 text-pup-maroon font-black bg-gray-50/30">
                          {sec.course_code ? `${sec.course_code}` : "—"}
                        </td>
                        <td className="p-3 px-6 font-bold text-gray-800">
                          {sec.name}
                        </td>
                        <td className="p-3 px-6 text-right">
                          <div className="inline-flex items-center justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setEditSection({
                                  id: sec.id,
                                  name: sec.name,
                                  courseCode: sec.course_code || "",
                                });
                                setIsEditSectionOpen(true);
                              }}
                              className="h-8 px-3 font-bold text-xs border-gray-300 text-gray-700 hover:text-pup-maroon hover:bg-red-50"
                            >
                              <i className="ph-bold ph-pencil-simple mr-1.5"></i>
                              Edit
                            </Button>
                            <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setConfirmPayload({
                                title: "Delete Section Block",
                                message: `Delete section block "${sec.name}"?`,
                                confirmLabel: "Delete",
                                onConfirm: () => delSection(sec.id, sec.name),
                              });
                              setConfirmOpen(true);
                            }}
                            className="h-8 px-3 font-bold text-xs border-red-300 text-red-700 hover:text-red-800 hover:bg-red-50"
                          >
                            <i className="ph-bold ph-trash mr-1.5"></i>
                            Delete
                          </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  {sections.filter(
                    (sec) =>
                      selectedCourseFilter === "" ||
                      sec.course_code === selectedCourseFilter,
                  ).length === 0 && (
                    <tr className="border-0 hover:bg-transparent">
                      <td colSpan={3} className="p-0 border-0">
                        <div className="h-[400px] flex flex-col items-center justify-center text-center text-gray-500">
                          <div className="w-16 h-16 rounded-full bg-white border border-gray-200 flex items-center justify-center mb-4 shadow-sm">
                            <i className="ph-duotone ph-list-numbers text-3xl text-pup-maroon"></i>
                          </div>
                          <div className="text-lg font-bold text-gray-900">
                            {selectedCourseFilter
                              ? `No sections mapped to ${selectedCourseFilter}`
                              : "No sections yet"}
                          </div>
                          <div className="text-sm font-medium text-gray-500 mt-1 max-w-sm">
                            Use the form above to construct student routing
                            blocks.
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeSubTab === "bulk-import" && (
          <div className="flex flex-col h-full animate-fade-in w-full overflow-hidden bg-gray-50/50">
            <div className="flex-1 overflow-auto min-h-0 p-6">
              <div className="max-w-5xl mx-auto space-y-4">
                <div className="bg-white border border-gray-200 rounded-brand shadow-sm p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-full border border-red-100 bg-red-50 text-pup-maroon shadow-sm flex items-center justify-center shrink-0">
                      <i className="ph-duotone ph-upload-simple text-2xl"></i>
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-lg font-black text-gray-900">
                        Import System Data (CSV)
                      </h3>
                      <p className="text-sm font-medium text-gray-600 mt-1 leading-relaxed">
                        Upload a CSV to bulk-create Document Types, Degree Programs, and Course Blocks.
                      </p>
                      <div className="mt-3 text-xs font-bold text-gray-500 uppercase tracking-wider">
                        Required header: <span className="font-mono normal-case text-gray-700">Category,Name,Code</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="bg-white border border-gray-200 rounded-brand shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-gray-100 bg-gray-50/50">
                      <div className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                        Upload CSV
                      </div>
                    </div>
                    <div className="p-6">
                      <div className="mb-4 flex items-center justify-between gap-2">
                        <a
                          href="data:text/csv;charset=utf-8,Category,Name,Code%0ADocumentType,Birth Certificate,%0ACourse,Bachelor of Science in IT,BSIT%0ASection,Block 1,BSIT"
                          download="taxonomy-import-template.csv"
                          className="inline-flex items-center h-9 px-3 rounded-brand border border-gray-300 bg-white text-xs font-bold text-gray-700 hover:text-pup-maroon hover:border-pup-maroon"
                        >
                          <i className="ph-bold ph-file-csv mr-1.5"></i>
                          Download Template
                        </a>
                        <button
                          type="button"
                          onClick={handleCopySample}
                          className="inline-flex items-center h-9 px-3 rounded-brand border border-gray-300 bg-white text-xs font-bold text-gray-700 hover:text-pup-maroon hover:border-pup-maroon"
                        >
                          <i className="ph-bold ph-copy mr-1.5"></i>
                          Copy Sample
                        </button>
                      </div>
                      <div className="bg-white border-2 border-dashed border-gray-300 rounded-brand p-8 hover:bg-red-50/20 hover:border-pup-maroon transition-all group relative cursor-pointer flex flex-col items-center justify-center text-center shadow-sm">
                        <input
                          type="file"
                          accept=".csv"
                          disabled={importing}
                          onChange={handleCsvImport}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed z-10"
                        />
                        <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center group-hover:bg-red-50 transition-colors mb-4 shadow-sm border border-gray-200 group-hover:border-red-200">
                          <i className="ph-duotone ph-cloud-arrow-up text-3xl text-gray-400 group-hover:text-pup-maroon transition-colors"></i>
                        </div>
                        <p className="text-base font-bold text-gray-800">
                          {importing ? "Importing..." : "Click or drop CSV here"}
                        </p>
                        <p className="text-xs text-gray-500 font-medium mt-2">
                          File must be <span className="font-mono">.csv</span>
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white border border-gray-200 rounded-brand shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-gray-100 bg-gray-50/50">
                      <div className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                        Example
                      </div>
                    </div>
                    <div className="p-6">
                      <div className="rounded-brand border border-gray-200 bg-gray-50 p-4 text-sm font-mono text-gray-700 leading-relaxed">
                        <div className="text-xs font-bold text-gray-500 mb-2">Category,Name,Code</div>
                        DocumentType,Birth Certificate,\n
                        Course,Bachelor of Science in IT,BSIT\n
                        Section,Block 1,BSIT
                      </div>
                      <div className="mt-4 text-xs font-medium text-gray-600">
                        - <strong>DocumentType</strong>: Code optional\n
                        - <strong>Course</strong>: Code required\n
                        - <strong>Section</strong>: Code = Degree Program code
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeSubTab === "security-questions" && (
          <div className="flex flex-col h-full animate-fade-in w-full overflow-hidden bg-gray-50/50">
            <div className="flex-1 overflow-auto min-h-0 p-6">
              <div className="max-w-3xl mx-auto space-y-4">
                <div className="bg-white border border-gray-200 rounded-brand shadow-sm p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-full border border-red-100 bg-red-50 text-pup-maroon shadow-sm flex items-center justify-center shrink-0">
                      <i className="ph-duotone ph-lock-key text-2xl"></i>
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-lg font-black text-gray-900">
                        Global Security Questions
                      </h3>
                      <p className="text-sm font-medium text-gray-600 mt-1 leading-relaxed">
                        Define up to 5 security questions. Staff members will choose one of these to answer during their account setup, which they can later use to reset a forgotten password.
                      </p>
                    </div>
                  </div>
                </div>

                {loading ? (
                  <div className="p-6 space-y-4 bg-white border border-gray-200 rounded-brand shadow-sm">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div key={i} className="space-y-2">
                        <Skeleton className="h-3 w-24" />
                        <Skeleton className="h-10 w-full" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <form onSubmit={saveSecurityQuestions} className="bg-white border border-gray-200 rounded-brand shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-gray-100 bg-gray-50/50">
                      <div className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                        Configure Questions
                      </div>
                    </div>
                    <div className="p-6 space-y-4">
                      {securityQuestions.map((q, i) => (
                        <div key={i}>
                          <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wide">
                            Question {i + 1}
                          </label>
                          <Input
                            type="text"
                            placeholder="e.g. What is your mother's maiden name?"
                            className="w-full h-10 bg-white border border-gray-300 rounded-brand text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pup-maroon focus-visible:border-pup-maroon"
                            value={q}
                            onChange={(e) => {
                              const updated = [...securityQuestions];
                              updated[i] = e.target.value;
                              setSecurityQuestions(updated);
                            }}
                          />
                        </div>
                      ))}
                    </div>
                    <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end">
                      <Button
                        type="submit"
                        disabled={securitySaving}
                        className="bg-pup-maroon text-white h-10 px-6 font-bold shadow-sm flex items-center gap-2 hover:bg-red-900 transition-colors"
                      >
                        <i className="ph-bold ph-floppy-disk"></i> {securitySaving ? "Saving..." : "Save Questions"}
                      </Button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>
        )}
      </Card>

      <Dialog open={isEditDocTypeOpen} onOpenChange={setIsEditDocTypeOpen}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden bg-white border border-gray-200 shadow-2xl rounded-brand">
          <DialogHeader className="p-6 border-b border-gray-100 bg-gray-50/50">
            <DialogTitle className="text-lg font-black tracking-tight text-gray-900">
              Edit Document Type
            </DialogTitle>
            <DialogDescription className="text-sm font-medium mt-1 text-gray-600">
              Update the document category label.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={updDocType}>
            <div className="p-6">
              <label className="block text-xs font-bold text-gray-700 mb-2 uppercase tracking-wide">
                Document Type Name <span className="text-pup-maroon">*</span>
              </label>
              <Input
                type="text"
                className="w-full h-10 bg-white border border-gray-300 rounded-brand text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pup-maroon focus-visible:border-pup-maroon"
                value={editDocType.name}
                onChange={(e) =>
                  setEditDocType((prev) => ({ ...prev, name: e.target.value }))
                }
                required
              />
            </div>
            <div className="p-4 border-t border-gray-100 bg-white flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIsEditDocTypeOpen(false)} className="h-10 px-5 text-sm font-bold border-gray-300 text-gray-700 hover:bg-gray-50 rounded-brand">
                Cancel
              </Button>
              <Button type="submit" className="h-10 px-5 bg-pup-maroon text-white font-bold shadow-sm hover:bg-red-900 rounded-brand">
                Save Changes
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditCourseOpen} onOpenChange={setIsEditCourseOpen}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden bg-white border border-gray-200 shadow-2xl rounded-brand">
          <DialogHeader className="p-6 border-b border-gray-100 bg-gray-50/50">
            <DialogTitle className="text-lg font-black tracking-tight text-gray-900">
              Edit Degree Program
            </DialogTitle>
            <DialogDescription className="text-sm font-medium mt-1 text-gray-600">
              Update the code and designation for this program.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={updCourse}>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-2 uppercase tracking-wide">
                  Short Code <span className="text-pup-maroon">*</span>
                </label>
                <Input
                  type="text"
                  className="w-full h-10 bg-white border border-gray-300 rounded-brand text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pup-maroon focus-visible:border-pup-maroon"
                  value={editCourse.code}
                  onChange={(e) =>
                    setEditCourse((prev) => ({ ...prev, code: e.target.value }))
                  }
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-2 uppercase tracking-wide">
                  Full Designation <span className="text-pup-maroon">*</span>
                </label>
                <Input
                  type="text"
                  className="w-full h-10 bg-white border border-gray-300 rounded-brand text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pup-maroon focus-visible:border-pup-maroon"
                  value={editCourse.name}
                  onChange={(e) =>
                    setEditCourse((prev) => ({ ...prev, name: e.target.value }))
                  }
                  required
                />
              </div>
            </div>
            <div className="p-4 border-t border-gray-100 bg-white flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIsEditCourseOpen(false)} className="h-10 px-5 text-sm font-bold border-gray-300 text-gray-700 hover:bg-gray-50 rounded-brand">
                Cancel
              </Button>
              <Button type="submit" className="h-10 px-5 bg-pup-maroon text-white font-bold shadow-sm hover:bg-red-900 rounded-brand">
                Save Changes
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditSectionOpen} onOpenChange={setIsEditSectionOpen}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden bg-white border border-gray-200 shadow-2xl rounded-brand">
          <DialogHeader className="p-6 border-b border-gray-100 bg-gray-50/50">
            <DialogTitle className="text-lg font-black tracking-tight text-gray-900">
              Edit Course Block
            </DialogTitle>
            <DialogDescription className="text-sm font-medium mt-1 text-gray-600">
              Update the section block and assigned degree program.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={updSection}>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-2 uppercase tracking-wide">
                  Degree Program <span className="text-pup-maroon">*</span>
                </label>
                <select
                  className="w-full h-10 bg-white border border-gray-300 rounded-brand text-sm px-4 py-2 focus:outline-none focus:ring-2 focus:ring-pup-maroon focus:border-pup-maroon transition-colors font-medium"
                  value={editSection.courseCode}
                  onChange={(e) =>
                    setEditSection((prev) => ({ ...prev, courseCode: e.target.value }))
                  }
                  required
                >
                  <option value="" disabled>
                    Select Degree Program...
                  </option>
                  {courses.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.code} - {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-2 uppercase tracking-wide">
                  Block Identifier <span className="text-pup-maroon">*</span>
                </label>
                <Input
                  type="text"
                  className="w-full h-10 bg-white border border-gray-300 rounded-brand text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pup-maroon focus-visible:border-pup-maroon"
                  value={editSection.name}
                  onChange={(e) =>
                    setEditSection((prev) => ({ ...prev, name: e.target.value }))
                  }
                  required
                />
              </div>
            </div>
            <div className="p-4 border-t border-gray-100 bg-white flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIsEditSectionOpen(false)} className="h-10 px-5 text-sm font-bold border-gray-300 text-gray-700 hover:bg-gray-50 rounded-brand">
                Cancel
              </Button>
              <Button type="submit" className="h-10 px-5 bg-pup-maroon text-white font-bold shadow-sm hover:bg-red-900 rounded-brand">
                Save Changes
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmModal
        open={confirmOpen}
        title={confirmPayload?.title || "Confirm Action"}
        message={confirmPayload?.message || "Are you sure?"}
        confirmLabel={confirmPayload?.confirmLabel || "Confirm"}
        onConfirm={async () => {
          if (!confirmPayload?.onConfirm) return;
          setConfirmOpen(false);
          await confirmPayload.onConfirm();
        }}
        onCancel={() => {
          setConfirmOpen(false);
          setConfirmPayload(null);
        }}
      />

      <Dialog open={isAddDocTypeOpen} onOpenChange={setIsAddDocTypeOpen}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden bg-white border border-gray-200 shadow-2xl rounded-brand">
          <DialogHeader className="p-6 border-b border-gray-100 bg-gray-50/50">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full border border-red-100 bg-red-50 text-pup-maroon shadow-sm flex items-center justify-center shrink-0">
                <i className="ph-duotone ph-pencil-line text-2xl"></i>
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-lg font-black tracking-tight text-gray-900">
                  Create Document Type
                </DialogTitle>
                <DialogDescription className="text-sm font-medium mt-1 text-gray-600">
                  Create a new classification category to organize uploaded records and improve retrieval efficiency.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <form onSubmit={addDocType}>
            <div className="p-6">
              <label className="block text-xs font-bold text-gray-700 mb-2 uppercase tracking-wide">
                Document Type Name <span className="text-pup-maroon">*</span>
              </label>
              <Input
                type="text"
                placeholder="E.g. Birth Certificate, Transcript of Records"
                className="w-full h-10 bg-white border border-gray-300 rounded-brand text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pup-maroon focus-visible:border-pup-maroon"
                value={dtName}
                onChange={(e) => setDtName(e.target.value)}
                autoFocus
                required
              />
            </div>
            <div className="p-4 border-t border-gray-100 bg-white flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAddDocTypeOpen(false)}
                className="h-10 px-5 text-sm font-bold border-gray-300 text-gray-700 hover:bg-gray-50 rounded-brand"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="h-10 px-5 bg-pup-maroon text-white font-bold shadow-sm hover:bg-red-900 rounded-brand"
              >
                Save Document Type
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isAddCourseOpen} onOpenChange={setIsAddCourseOpen}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden bg-white border border-gray-200 shadow-2xl rounded-brand">
          <DialogHeader className="p-6 border-b border-gray-100 bg-gray-50/50">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full border border-red-100 bg-red-50 text-pup-maroon shadow-sm flex items-center justify-center shrink-0">
                <i className="ph-duotone ph-pencil-line text-2xl"></i>
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-lg font-black tracking-tight text-gray-900">
                  Create Degree Program
                </DialogTitle>
                <DialogDescription className="text-sm font-medium mt-1 text-gray-600">
                  Register a new academic program with its official code and designation for proper student categorization.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <form onSubmit={addCourse}>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-2 uppercase tracking-wide">
                  Short Code <span className="text-pup-maroon">*</span>
                </label>
                <Input
                  type="text"
                  placeholder="E.g. BSIT, BSCS, BSBA"
                  className="w-full h-10 bg-white border border-gray-300 rounded-brand text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pup-maroon focus-visible:border-pup-maroon"
                  value={cCode}
                  onChange={(e) => setCCode(e.target.value)}
                  autoFocus
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-2 uppercase tracking-wide">
                  Full Designation <span className="text-pup-maroon">*</span>
                </label>
                <Input
                  type="text"
                  placeholder="E.g. Bachelor of Science in Information Technology"
                  className="w-full h-10 bg-white border border-gray-300 rounded-brand text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pup-maroon focus-visible:border-pup-maroon"
                  value={cName}
                  onChange={(e) => setCName(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="p-4 border-t border-gray-100 bg-white flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAddCourseOpen(false)}
                className="h-10 px-5 text-sm font-bold border-gray-300 text-gray-700 hover:bg-gray-50 rounded-brand"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="h-10 px-5 bg-pup-maroon text-white font-bold shadow-sm hover:bg-red-900 rounded-brand"
              >
                Save Program
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isAddSectionOpen} onOpenChange={setIsAddSectionOpen}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden bg-white border border-gray-200 shadow-2xl rounded-brand">
          <DialogHeader className="p-6 border-b border-gray-100 bg-gray-50/50">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full border border-red-100 bg-red-50 text-pup-maroon shadow-sm flex items-center justify-center shrink-0">
                <i className="ph-duotone ph-pencil-line text-2xl"></i>
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-lg font-black tracking-tight text-gray-900">
                  Create Course Block
                </DialogTitle>
                <DialogDescription className="text-sm font-medium mt-1 text-gray-600">
                  Define a new course section or block to organize student records by cohort and facilitate batch management.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <form onSubmit={addSection}>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-2 uppercase tracking-wide">
                  Degree Program <span className="text-pup-maroon">*</span>
                </label>
                <select
                  className="w-full h-10 bg-white border border-gray-300 rounded-brand text-sm px-4 py-2 focus:outline-none focus:ring-2 focus:ring-pup-maroon focus:border-pup-maroon transition-colors font-medium"
                  value={secCourseCode}
                  onChange={(e) => setSecCourseCode(e.target.value)}
                  required
                >
                  <option value="" disabled>
                    Select Degree Program...
                  </option>
                  {courses.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.code} - {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-2 uppercase tracking-wide">
                  Block Identifier <span className="text-pup-maroon">*</span>
                </label>
                <Input
                  type="text"
                  placeholder="E.g. Block 1, Section A, Group 2024"
                  className="w-full h-10 bg-white border border-gray-300 rounded-brand text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pup-maroon focus-visible:border-pup-maroon"
                  value={secName}
                  onChange={(e) => setSecName(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="p-4 border-t border-gray-100 bg-white flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAddSectionOpen(false)}
                className="h-10 px-5 text-sm font-bold border-gray-300 text-gray-700 hover:bg-gray-50 rounded-brand"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="h-10 px-5 bg-pup-maroon text-white font-bold shadow-sm hover:bg-red-900 rounded-brand"
              >
                Save Block
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
