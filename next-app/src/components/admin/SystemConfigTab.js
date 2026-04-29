"use client";

import { useState, useEffect } from "react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import ConfirmModal from "@/components/shared/ConfirmModal";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyMedia,
} from "@/components/ui/empty";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

  // Document Types State
export default function SystemConfigTab({ showToast, logAdminAction, onVerifyTOTP, error = null }) {
  const [activeSubTab, setActiveSubTab] = useState("document-types");
  const [docTypes, setDocTypes] = useState([]);
  const [isAddDocTypeOpen, setIsAddDocTypeOpen] = useState(false);
  const [newDocTypeName, setNewDocTypeName] = useState("");
  const [isEditDocTypeOpen, setIsEditDocTypeOpen] = useState(false);
  const [editDocType, setEditDocType] = useState({ id: null, name: "" });

  // Courses State
  const [courses, setCourses] = useState([]);
  const [isAddCourseOpen, setIsAddCourseOpen] = useState(false);
  const [newCourseCode, setNewCourseCode] = useState("");
  const [newCourseName, setNewCourseName] = useState("");
  const [isEditCourseOpen, setIsEditCourseOpen] = useState(false);
  const [editCourse, setEditCourse] = useState({ id: null, code: "", name: "" });

  // Sections State
  const [sections, setSections] = useState([]);
  const [isAddSectionOpen, setIsAddSectionOpen] = useState(false);
  const [secName, setSecName] = useState("");
  const [secCourseCode, setSecCourseCode] = useState("");
  const [selectedCourseFilter, setSelectedCourseFilter] = useState("");
  const [isEditSectionOpen, setIsEditSectionOpen] = useState(false);
  const [editSection, setEditSection] = useState({
    id: null,
    name: "",
    courseCode: "",
  });

  // Security Questions State
  const [securityQuestions, setSecurityQuestions] = useState(["", "", "", "", ""]);
  const [securitySaving, setSecuritySaving] = useState(false);

  // Common State
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [importing, setImporting] = useState(false);

  // Confirmation Modal
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmPayload, setConfirmPayload] = useState({
    title: "",
    message: "",
    confirmLabel: "",
    onConfirm: () => {},
  });

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    setLoading(true);
    setError(null);
    try {
      const [rDoc, rCourse, rSec, rSecQ] = await Promise.all([
        fetch("/api/doc-types?admin=true"),
        fetch("/api/courses"),
        fetch("/api/sections"),
        fetch("/api/system/security-questions")
      ]);

      const jDoc = await rDoc.json();
      const jCourse = await rCourse.json();
      const jSec = await rSec.json();
      const jSecQ = await rSecQ.json();

      if (!rDoc.ok || !jDoc.ok) throw new Error(jDoc.error || "Failed doc-types");
      if (!rCourse.ok || !jCourse.ok) throw new Error(jCourse.error || "Failed courses");
      if (!rSec.ok || !jSec.ok) throw new Error(jSec.error || "Failed sections");

      setDocTypes(jDoc.data);
      setCourses(jCourse.data);
      setSections(jSec.data);

      if (jSecQ.ok && Array.isArray(jSecQ.data)) {
        const qList = [...jSecQ.data, "", "", "", "", ""].slice(0, 5);
        setSecurityQuestions(qList);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // --- ACTIONS: Document Types ---
  async function addDocType(e) {
    e.preventDefault();
    if (!newDocTypeName.trim()) return;
    try {
      const res = await fetch("/api/doc-types?admin=true", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newDocTypeName.trim() }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "Add failed");
      setNewDocTypeName("");
      setIsAddDocTypeOpen(false);
      showToast({ title: "Success", description: "Document type added." });
      onLogAction?.(`Created document type configuration: ${json.data.name || json.data}`);
      loadAll();
    } catch (err) {
      showToast({ title: "Error", description: err.message }, true);
    }
  }

  async function updDocType(e) {
    e.preventDefault();
    if (!editDocType.name.trim()) return;
    try {
      const res = await fetch(`/api/doc-types/${editDocType.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editDocType.name.trim() }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "Update failed");
      setIsEditDocTypeOpen(false);
      showToast({ title: "Success", description: "Document type updated." });
      onLogAction?.(`Modified document type: ${json.data.name || json.data}`);
      loadAll();
    } catch (err) {
      showToast({ title: "Error", description: err.message }, true);
    }
  }

  async function delDocType(id, name) {
    try {
      const res = await fetch(`/api/doc-types/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "Delete failed");
      setConfirmOpen(false);
      showToast({ title: "Success", description: "Document type deleted." });
      onLogAction?.(`Deleted document type: ${name}`);
      loadAll();
    } catch (err) {
      showToast({ title: "Error", description: err.message }, true);
    }
  }

  // --- ACTIONS: Courses ---
  async function addCourse(e) {
    e.preventDefault();
    if (!newCourseCode.trim() || !newCourseName.trim()) return;
    try {
      const res = await fetch("/api/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: newCourseCode.trim(),
          name: newCourseName.trim(),
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "Add failed");
      setNewCourseCode("");
      setNewCourseName("");
      setIsAddCourseOpen(false);
      showToast({ title: "Success", description: "Degree program added." });
      onLogAction?.(`Created academic program entry: ${json.data.code}`);
      loadAll();
    } catch (err) {
      showToast({ title: "Error", description: err.message }, true);
    }
  }

  async function updCourse(e) {
    e.preventDefault();
    if (!editCourse.code.trim() || !editCourse.name.trim()) return;
    try {
      const res = await fetch(`/api/courses?id=${editCourse.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: editCourse.code.trim(),
          name: editCourse.name.trim(),
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "Update failed");
      setIsEditCourseOpen(false);
      showToast({ title: "Success", description: "Degree program updated." });
      onLogAction?.(`Modified academic program: ${json.data.code}`);
      loadAll();
    } catch (err) {
      showToast({ title: "Error", description: err.message }, true);
    }
  }

  async function delCourse(id, code) {
    try {
      const res = await fetch(`/api/courses?id=${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "Delete failed");
      setConfirmOpen(false);
      showToast({ title: "Success", description: "Degree program deleted." });
      onLogAction?.(`Deleted academic program: ${code}`);
      loadAll();
    } catch (err) {
      showToast({ title: "Error", description: err.message }, true);
    }
  }

  // --- ACTIONS: Sections ---
  async function addSection(e) {
    e.preventDefault();
    if (!secName.trim()) return;
    try {
      const res = await fetch("/api/sections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: secName.trim(),
          courseCode: secCourseCode.trim() || null,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "Add failed");
      setSecName("");
      setSecCourseCode("");
      setIsAddSectionOpen(false);
      showToast({ title: "Success", description: "Section block created." });
      onLogAction?.(`Created section block: ${json.data.name}`);
      loadAll();
    } catch (err) {
      showToast({ title: "Error", description: err.message }, true);
    }
  }

  async function updSection(e) {
    e.preventDefault();
    if (!editSection.name.trim()) return;
    try {
      const res = await fetch(`/api/sections?id=${editSection.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editSection.name.trim(),
          courseCode: editSection.courseCode.trim() || null,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "Update failed");
      setIsEditSectionOpen(false);
      showToast({ title: "Success", description: "Section block updated." });
      onLogAction?.(`Modified section block: ${json.data.name}`);
      loadAll();
    } catch (err) {
      showToast({ title: "Error", description: err.message }, true);
    }
  }

  async function delSection(id, name) {
    try {
      const res = await fetch(`/api/sections?id=${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "Delete failed");
      setConfirmOpen(false);
      showToast({ title: "Success", description: "Section block deleted." });
      onLogAction?.(`Deleted section block: ${name}`);
      loadAll();
    } catch (err) {
      showToast({ title: "Error", description: err.message }, true);
  
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
  }

  // --- ACTIONS: Bulk Import ---
  async function handleCsvImport(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      // Parse CSV file client-side
      const text = await file.text();
      const lines = text.split(/\r?\n/).filter((l) => l.trim());
      if (lines.length < 2) {
        throw new Error("CSV must have a header row and at least one data row");
      }

      const headers = lines[0]
        .split(",")
        .map((h) => h.trim().toLowerCase().replace(/\s+/g, ""));

      const requiredCols = ["category", "name"];
      const missingCols = requiredCols.filter((c) => !headers.includes(c));
      if (missingCols.length > 0) {
        throw new Error(`Missing required columns: ${missingCols.join(", ")}`);
      }

      const rows = lines.slice(1).map((line) => {
        const vals = line.split(",");
        const row = {};
        headers.forEach((h, idx) => {
          row[h] = vals[idx]?.trim() || "";
        });
        return {
          category: row.category || "",
          name: row.name || "",
          code: row.code || "",
        };
      }).filter((r) => r.category && r.name); // Skip empty rows

      const res = await fetch("/api/system/bulk-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "Import failed");
      showToast({
        title: "Import Successful",
        description: `Processed ${json.data?.successCount || 0} taxonomy records (${json.data?.failCount || 0} failed).`,
      });
      onLogAction?.(`Bulk imported ${json.data?.successCount || 0} taxonomy records via CSV`);
      loadAll();
    } catch (err) {
      showToast({ title: "Import Error", description: err.message }, true);
    } finally {
      setImporting(false);
      e.target.value = "";
    }
  }

  function handleCopySample() {
    const sample = "Category,Name,Code\nDocumentType,Transcript of Records,\nCourse,Bachelor of Science in Accountancy,BSA\nSection,Section 1,BSA";
    navigator.clipboard.writeText(sample);
    showToast({ title: "Copied", description: "CSV sample copied to clipboard." });
  }

  // --- ACTIONS: Security Questions ---
  async function saveSecurityQuestions(e) {
    e.preventDefault();
    setSecuritySaving(true);
    try {
      const filtered = securityQuestions.filter(q => q.trim() !== "");
      const res = await fetch("/api/system/security-questions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questions: filtered }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "Save failed");
      showToast({ title: "Questions Saved", description: "Global security questions updated." });
      onLogAction?.(`Modified global security questions configuration`);
      loadAll();
    } catch (err) {
      showToast({ title: "Error", description: err.message }, true);
    } finally {
      setSecuritySaving(false);
    }
  }

  if (loading && !docTypes.length) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full max-w-md rounded-brand" />
        <Skeleton className="h-[400px] w-full rounded-brand" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col w-full h-full gap-4 animate-fade-in font-inter min-h-0">
        <Card className="flex-1 bg-white rounded-brand border border-gray-300 shadow-sm overflow-hidden flex flex-col min-h-0">
          <CardContent className="p-6 flex-1 flex flex-col min-h-0">
            <Empty className="h-[400px] flex flex-col items-center justify-center text-center text-gray-500 border-0">
              <EmptyHeader className="flex flex-col items-center gap-0">
                <EmptyMedia className="w-16 h-16 rounded-full bg-white border border-gray-200 flex items-center justify-center mb-4 shadow-sm">
                  <i className="ph-duotone ph-warning-circle text-3xl text-pup-maroon" />
                </EmptyMedia>
                <EmptyTitle className="text-lg font-bold text-gray-900">Could not load report</EmptyTitle>
                <EmptyDescription className="text-sm font-medium text-gray-600 mt-1 max-w-md">
                  {error}
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full h-full gap-4 animate-fade-in font-inter min-h-0">
      <Tabs
        defaultValue="document-types"
        value={activeSubTab}
        onValueChange={setActiveSubTab}
        orientation="horizontal"
        className="flex-1 min-h-0 flex flex-col"
      >
        <div className="shrink-0 flex items-center">
          <div className="inline-flex p-1 bg-gray-100/80 rounded-brand border border-gray-200/50 backdrop-blur-sm h-auto">
            <button
              type="button"
              onClick={() => setActiveSubTab("document-types")}
              className={`flex items-center gap-2.5 px-5 py-2 rounded-brand text-sm font-bold transition-all duration-200 ${
                activeSubTab === "document-types"
                  ? "bg-white text-pup-maroon shadow-sm ring-1 ring-black/5"
                  : "text-gray-500 hover:text-gray-700 hover:bg-white/50"
              }`}
            >
              <i className={`ph-bold ph-files ${activeSubTab === "document-types" ? "" : "text-gray-400"}`}></i>
              <span>DOCUMENT TYPES</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveSubTab("degree-programs")}
              className={`flex items-center gap-2.5 px-5 py-2 rounded-brand text-sm font-bold transition-all duration-200 ${
                activeSubTab === "degree-programs"
                  ? "bg-white text-pup-maroon shadow-sm ring-1 ring-black/5"
                  : "text-gray-500 hover:text-gray-700 hover:bg-white/50"
              }`}
            >
              <i className={`ph-bold ph-books ${activeSubTab === "degree-programs" ? "" : "text-gray-400"}`}></i>
              <span>DEGREE PROGRAMS</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveSubTab("course-blocks")}
              className={`flex items-center gap-2.5 px-5 py-2 rounded-brand text-sm font-bold transition-all duration-200 ${
                activeSubTab === "course-blocks"
                  ? "bg-white text-pup-maroon shadow-sm ring-1 ring-black/5"
                  : "text-gray-500 hover:text-gray-700 hover:bg-white/50"
              }`}
            >
              <i className={`ph-bold ph-list-numbers ${activeSubTab === "course-blocks" ? "" : "text-gray-400"}`}></i>
              <span>COURSE BLOCKS</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveSubTab("bulk-import")}
              className={`flex items-center gap-2.5 px-5 py-2 rounded-brand text-sm font-bold transition-all duration-200 ${
                activeSubTab === "bulk-import"
                  ? "bg-white text-pup-maroon shadow-sm ring-1 ring-black/5"
                  : "text-gray-500 hover:text-gray-700 hover:bg-white/50"
              }`}
            >
              <i className={`ph-bold ph-upload-simple ${activeSubTab === "bulk-import" ? "" : "text-gray-400"}`}></i>
              <span>IMPORTS</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveSubTab("security-questions")}
              className={`flex items-center gap-2.5 px-5 py-2 rounded-brand text-sm font-bold transition-all duration-200 ${
                activeSubTab === "security-questions"
                  ? "bg-white text-pup-maroon shadow-sm ring-1 ring-black/5"
                  : "text-gray-500 hover:text-gray-700 hover:bg-white/50"
              }`}
            >
              <i className={`ph-bold ph-lock-key ${activeSubTab === "security-questions" ? "" : "text-gray-400"}`}></i>
              <span>SECURITY</span>
            </button>
          </div>
        </div>

        <Card className="flex-1 bg-white rounded-brand border border-gray-300 shadow-sm flex flex-col p-0 min-h-[500px] relative mt-4">
          <TabsContent value="document-types" className="flex-1 flex flex-col min-h-0 m-0 border-0 focus-visible:ring-0">
            <div className="flex flex-col h-full animate-fade-in w-full overflow-hidden">
              <CardHeader className="bg-gray-50/50 border-b border-gray-100 p-6 flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-pup-maroon shadow-sm shrink-0">
                    <i className="ph-duotone ph-files text-2xl"></i>
                  </div>
                  <div>
                    <CardTitle className="text-xl font-black text-gray-900 tracking-tight leading-none">
                      Document Types
                    </CardTitle>
                    <CardDescription className="text-sm font-medium text-gray-500 mt-1.5">
                      Manage formal document categories and digitization requirements.
                    </CardDescription>
                  </div>
                </div>
                <Button
                  onClick={() => setIsAddDocTypeOpen(true)}
                  className="bg-pup-maroon text-white h-10 px-5 font-bold shadow-sm flex items-center gap-2 hover:bg-red-900 transition-colors w-full sm:w-auto"
                >
                  <i className="ph-bold ph-plus"></i> ADD DOCUMENT TYPE
                </Button>
              </CardHeader>
              <div className="flex-1 overflow-auto min-h-0 bg-white relative rounded-brand border border-gray-200">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
                    <tr className="text-left text-xs uppercase tracking-wider text-gray-600">
                      <th className="p-3 font-bold px-6">Document Name</th>
                      <th className="p-3 font-bold text-right px-6 w-48">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {docTypes.map((dt) => (
                      <tr
                        key={dt.id}
                        className="hover:bg-gray-50 transition-colors group cursor-default"
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
                              className="px-3 font-bold text-xs border-gray-300 text-gray-700 hover:text-pup-maroon hover:bg-red-50 hover:border-pup-maroon"
                            >
                              <i className="ph-bold ph-pencil-simple mr-1.5"></i>
                              EDIT
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
                            className="px-3 font-bold text-xs border-red-300 text-red-700 hover:text-red-800 hover:bg-red-50"
                          >
                            <i className="ph-bold ph-trash mr-1.5"></i>
                            DELETE
                          </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {docTypes.length === 0 && (
                      <tr className="border-0 hover:bg-transparent">
                        <td colSpan={2} className="p-0 border-0">
                          <Empty className="h-[400px] flex flex-col items-center justify-center text-center text-gray-500 border-0">
                            <EmptyHeader className="flex flex-col items-center gap-0">
                              <EmptyMedia className="w-16 h-16 rounded-full bg-white border border-gray-200 flex items-center justify-center mb-4 shadow-sm">
                                <i className="ph-duotone ph-files text-3xl text-pup-maroon"></i>
                              </EmptyMedia>
                              <EmptyTitle className="text-lg font-bold text-gray-900">No document types yet</EmptyTitle>
                              <EmptyDescription className="text-sm font-medium text-gray-600 mt-1 max-w-md">
                                Use the form above to add a new document
                                configuration to the system framework.
                              </EmptyDescription>
                            </EmptyHeader>
                          </Empty>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="degree-programs" className="flex-1 flex flex-col min-h-0 m-0 border-0 focus-visible:ring-0">
            <div className="flex flex-col h-full animate-fade-in w-full overflow-hidden">
              <CardHeader className="bg-gray-50/50 border-b border-gray-100 p-6 flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-pup-maroon shadow-sm shrink-0">
                    <i className="ph-duotone ph-books text-2xl"></i>
                  </div>
                  <div>
                    <CardTitle className="text-xl font-black text-gray-900 tracking-tight leading-none">
                      Degree Programs
                    </CardTitle>
                    <CardDescription className="text-sm font-medium text-gray-500 mt-1.5">
                      Manage available university course paths and academic designations.
                    </CardDescription>
                  </div>
                </div>
                <Button
                  onClick={() => setIsAddCourseOpen(true)}
                  className="bg-pup-maroon text-white h-10 px-5 font-bold shadow-sm flex items-center gap-2 hover:bg-red-900 transition-colors w-full sm:w-auto"
                >
                  <i className="ph-bold ph-plus"></i> ADD DEGREE PROGRAM
                </Button>
              </CardHeader>
              <div className="flex-1 overflow-auto min-h-0 bg-white relative rounded-brand border border-gray-200">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
                    <tr className="text-left text-xs uppercase tracking-wider text-gray-600">
                      <th className="p-3 font-bold px-6 w-48">
                        Course Code
                      </th>
                      <th className="p-3 font-bold px-6">Full Designation</th>
                      <th className="p-3 font-bold text-right px-6 w-56">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {courses.map((c) => (
                      <tr
                        key={c.id}
                        className="hover:bg-gray-50 transition-colors group cursor-default"
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
                              className="px-3 font-bold text-xs border-gray-300 text-gray-700 hover:text-pup-maroon hover:bg-red-50 hover:border-pup-maroon"
                            >
                              <i className="ph-bold ph-pencil-simple mr-1.5"></i>
                              EDIT
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
                            className="px-3 font-bold text-xs border-red-300 text-red-700 hover:text-red-800 hover:bg-red-50"
                          >
                            <i className="ph-bold ph-trash mr-1.5"></i>
                            DELETE
                          </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {courses.length === 0 && (
                      <tr className="border-0 hover:bg-transparent">
                        <td colSpan={3} className="p-0 border-0">
                          <Empty className="h-[400px] flex flex-col items-center justify-center text-center text-gray-500 border-0">
                            <EmptyHeader className="flex flex-col items-center gap-0">
                              <EmptyMedia className="w-16 h-16 rounded-full bg-white border border-gray-200 flex items-center justify-center mb-4 shadow-sm">
                                <i className="ph-duotone ph-books text-3xl text-pup-maroon"></i>
                              </EmptyMedia>
                              <EmptyTitle className="text-lg font-bold text-gray-900">No degree programs yet</EmptyTitle>
                              <EmptyDescription className="text-sm font-medium text-gray-600 mt-1 max-w-md">
                                Use the form above to deploy a new university course
                                path.
                              </EmptyDescription>
                            </EmptyHeader>
                          </Empty>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="course-blocks" className="flex-1 flex flex-col min-h-0 m-0 border-0 focus-visible:ring-0">
            <div className="flex flex-col h-full animate-fade-in w-full overflow-hidden">
              <CardHeader className="bg-gray-50/50 border-b border-gray-100 p-6 flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-pup-maroon shadow-sm shrink-0">
                    <i className="ph-duotone ph-list-numbers text-2xl"></i>
                  </div>
                  <div>
                    <CardTitle className="text-xl font-black text-gray-900 tracking-tight leading-none">
                      Course Blocks
                    </CardTitle>
                    <CardDescription className="text-sm font-medium text-gray-500 mt-1.5">
                      Construct logical section blocks and identifiers for student routing.
                    </CardDescription>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
                  <div className="flex-1 min-w-0 sm:w-64">
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wide">
                        Filter by Program
                      </label>
                      {selectedCourseFilter !== "" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedCourseFilter("")}
                          className="h-5 px-1.5 text-[9px] font-bold text-pup-maroon hover:bg-red-50 hover:text-pup-darkMaroon"
                        >
                          CLEAR ALL
                        </Button>
                      )}
                    </div>
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
                  </div>
                  <div className="flex items-end">
                    <Button
                      onClick={() => {
                        setSecCourseCode(selectedCourseFilter);
                        setIsAddSectionOpen(true);
                      }}
                      className="h-10 bg-pup-maroon text-white px-5 font-bold shadow-sm flex items-center gap-2 hover:bg-red-900 transition-colors w-full sm:w-auto shrink-0"
                    >
                      <i className="ph-bold ph-plus"></i> ADD COURSE BLOCK
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <div className="flex-1 overflow-auto min-h-0 bg-white relative rounded-brand border border-gray-200">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
                    <tr className="text-left text-xs uppercase tracking-wider text-gray-600">
                      <th className="p-3 font-bold px-6 w-48">
                        Degree Program
                      </th>
                      <th className="p-3 font-bold px-6">Block Identifier</th>
                      <th className="p-3 font-bold text-right px-6 w-56">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {sections
                      .filter(
                        (sec) =>
                          selectedCourseFilter === "" ||
                          sec.course_code === selectedCourseFilter,
                      )
                      .map((sec) => (
                        <tr
                          key={sec.id}
                          className="hover:bg-gray-50 transition-colors group cursor-default"
                        >
                          <td className="p-3 px-6 text-pup-maroon font-black bg-gray-50/30">
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
                                className="px-3 font-bold text-xs border-gray-300 text-gray-700 hover:text-pup-maroon hover:bg-red-50 hover:border-pup-maroon"
                              >
                                <i className="ph-bold ph-pencil-simple mr-1.5"></i>
                                EDIT
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
                              className="px-3 font-bold text-xs border-red-300 text-red-700 hover:text-red-800 hover:bg-red-50"
                            >
                              <i className="ph-bold ph-trash mr-1.5"></i>
                              DELETE
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
                          <Empty className="h-[400px] flex flex-col items-center justify-center text-center text-gray-500 border-0">
                            <EmptyHeader className="flex flex-col items-center gap-0">
                              <EmptyMedia className="w-16 h-16 rounded-full bg-white border border-gray-200 flex items-center justify-center mb-4 shadow-sm">
                                <i className="ph-duotone ph-list-numbers text-3xl text-pup-maroon"></i>
                              </EmptyMedia>
                              <EmptyTitle className="text-lg font-bold text-gray-900">
                                {selectedCourseFilter
                                  ? `No sections mapped to ${selectedCourseFilter}`
                                  : "No sections yet"}
                              </EmptyTitle>
                              <EmptyDescription className="text-sm font-medium text-gray-600 mt-1 max-w-md">
                                Use the form above to construct student routing
                                blocks.
                              </EmptyDescription>
                            </EmptyHeader>
                          </Empty>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="bulk-import" className="flex-1 flex flex-col min-h-0 m-0 border-0 overflow-auto bg-gray-50/50 focus-visible:ring-0">
            <div className="flex-1 flex flex-col p-6 min-h-0">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1">
                {/* Protocol card — Now #1 */}
                <Card className="bg-white border border-gray-300 rounded-brand shadow-sm overflow-hidden flex flex-col">
                  <div className="p-4 border-b border-gray-100 bg-gray-50/50 text-xs font-black text-gray-900 uppercase tracking-wider flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-pup-maroon text-white flex items-center justify-center text-[10px] font-black">1</div>
                    Import Protocol
                  </div>
                  <CardContent className="p-6 space-y-6 overflow-y-auto">
                    <div className="space-y-3">
                      <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                        <i className="ph-bold ph-info text-pup-maroon" />
                        Required Column Architecture
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {["Category", "Name", "Code"].map((col) => (
                          <code key={col} className="font-mono text-gray-900 bg-gray-50 px-2 py-1 rounded border border-gray-200 text-xs font-bold shadow-xs">
                            {col}
                          </code>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm font-mono text-gray-700 leading-relaxed shadow-inner">
                      <div className="text-[10px] font-black text-gray-400 mb-1.5 tracking-widest uppercase">CSV Data Example</div>
                      Category,Name,Code<br />
                      DocumentType,Birth Certificate,<br />
                      Course,Bachelor of Science in IT,BSIT<br />
                      Section,Block 1,BSIT
                    </div>

                    <div className="grid grid-cols-1 gap-3">
                      {[
                        { label: "DocumentType", desc: "Identifier code is optional. Only 'Name' is required." },
                        { label: "Course", desc: "Short code is required (e.g. BSIT, BSA) for record routing." },
                        { label: "Section", desc: "The 'Code' field MUST match an existing Degree Program code." },
                      ].map((rule) => (
                        <div key={rule.label} className="p-3 rounded-lg border border-gray-100 bg-white">
                          <div className="text-[10px] font-black text-pup-maroon uppercase tracking-tight mb-1">{rule.label}</div>
                          <div className="text-[11px] text-gray-600 font-medium leading-snug">{rule.desc}</div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Upload card — Now #2 */}
                <Card className="bg-white border border-gray-300 rounded-brand shadow-sm overflow-hidden flex flex-col">
                  <div className="p-4 border-b border-gray-100 bg-gray-50/50 text-xs font-black text-gray-900 uppercase tracking-wider flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-pup-maroon text-white flex items-center justify-center text-[10px] font-black">2</div>
                    Choose File
                  </div>
                  <CardContent className="p-6 flex-1 flex flex-col">
                    <div className="mb-6 flex flex-wrap items-center gap-3">
                      <a
                        href="data:text/csv;charset=utf-8,Category,Name,Code%0ADocumentType,Birth Certificate,%0ACourse,Bachelor of Science in IT,BSIT%0ASection,Block 1,BSIT"
                        download="taxonomy-import-template.csv"
                        className="flex-1 inline-flex items-center justify-center gap-2 h-11 px-4 rounded-lg border border-gray-300 bg-white text-xs font-black text-gray-700 uppercase tracking-wider hover:border-pup-maroon hover:text-pup-maroon transition-all shadow-xs"
                      >
                        <i className="ph-bold ph-file-csv text-base"></i>
                        Download Template
                      </a>
                      <button
                        type="button"
                        onClick={handleCopySample}
                        className="flex-1 inline-flex items-center justify-center gap-2 h-11 px-4 rounded-lg border border-gray-300 bg-white text-xs font-black text-gray-700 uppercase tracking-wider hover:border-pup-maroon hover:text-pup-maroon transition-all shadow-xs"
                      >
                        <i className="ph-bold ph-copy text-base"></i>
                        Copy Raw Sample
                      </button>
                    </div>
                    <div className="flex-1 bg-white border-2 border-dashed border-gray-300 rounded-brand p-12 hover:bg-red-50/20 hover:border-pup-maroon transition-all group relative cursor-pointer flex flex-col items-center justify-center text-center shadow-sm min-h-[300px]">
                      <input
                        type="file"
                        accept=".csv"
                        disabled={importing}
                        onChange={handleCsvImport}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed z-10"
                      />
                      <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center group-hover:bg-red-50 transition-colors mb-6 shadow-sm border border-gray-200 group-hover:border-red-200">
                        <i className="ph-duotone ph-cloud-arrow-up text-4xl text-gray-400 group-hover:text-pup-maroon transition-colors"></i>
                      </div>
                      <h3 className="text-lg font-black text-gray-900 leading-tight">
                        {importing ? "Importing Data..." : "Ready to Ingest"}
                      </h3>
                      <p className="text-sm text-gray-500 font-medium mt-2 max-w-xs">
                        Drop your structured <span className="font-mono text-pup-maroon font-bold">.csv</span> file here or click to browse.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="security-questions" className="flex-1 flex flex-col min-h-0 m-0 border-0 overflow-auto bg-gray-50/50 focus-visible:ring-0">
            <div className="flex-1 flex flex-col p-6 min-h-0">
              {loading ? (
                <div className="space-y-4 bg-white border border-gray-300 rounded-brand p-6 shadow-sm">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="space-y-2">
                      <Skeleton className="h-3 w-24" />
                      <Skeleton className="h-10 w-full" />
                    </div>
                  ))}
                </div>
              ) : (
                <Card className="flex-1 bg-white border border-gray-300 rounded-brand shadow-sm overflow-hidden flex flex-col">
                  <CardHeader className="bg-gray-50/50 border-b border-gray-100 p-6 flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-pup-maroon shadow-sm shrink-0">
                        <i className="ph-duotone ph-lock-key text-2xl"></i>
                      </div>
                      <div>
                        <CardTitle className="text-xl font-black text-gray-900 tracking-tight leading-none">
                          Global Security Questions
                        </CardTitle>
                        <CardDescription className="text-sm font-medium text-gray-500 mt-1.5">
                          Define up to 5 verification challenges for personnel account recovery and setup.
                        </CardDescription>
                      </div>
                    </div>
                    <Button
                      onClick={saveSecurityQuestions}
                      disabled={securitySaving}
                      className="bg-pup-maroon text-white h-10 px-6 font-bold shadow-sm flex items-center gap-2 hover:bg-red-900 transition-colors w-full sm:w-auto"
                    >
                      <i className="ph-bold ph-floppy-disk"></i>
                      {securitySaving ? "SAVING..." : "SAVE QUESTIONS"}
                    </Button>
                  </CardHeader>

                  <CardContent className="p-8 flex-1 overflow-y-auto">
                    <div className="max-w-4xl space-y-8">
                      <div className="grid grid-cols-1 gap-6">
                        {securityQuestions.map((q, i) => (
                          <div key={i} className="space-y-2 group">
                            <div className="flex items-center gap-2">
                              <span className="w-6 h-6 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center text-[10px] font-black text-gray-500 group-focus-within:bg-red-50 group-focus-within:border-red-100 group-focus-within:text-pup-maroon transition-colors">
                                {i + 1}
                              </span>
                              <label className="text-[11px] font-black text-gray-500 uppercase tracking-widest group-focus-within:text-gray-900 transition-colors">
                                Security Challenge Question
                              </label>
                            </div>
                            <Input
                              type="text"
                              placeholder="e.g. What was the name of your first elementary school?"
                              className="h-12 bg-white border border-gray-300 rounded-brand text-sm focus-visible:ring-pup-maroon focus-visible:border-pup-maroon shadow-xs transition-all"
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

                      <div className="p-4 rounded-xl bg-amber-50 border border-amber-100 flex items-start gap-4">
                        <div className="w-10 h-10 rounded-lg bg-white border border-amber-200 flex items-center justify-center text-amber-600 shadow-xs shrink-0">
                          <i className="ph-duotone ph-shield-warning text-xl" />
                        </div>
                        <div>
                          <h4 className="text-xs font-black text-amber-900 uppercase tracking-tight">Deployment Note</h4>
                          <p className="text-xs text-amber-700 font-medium leading-relaxed mt-0.5">
                            Changes to these questions will apply to all future personnel registrations. Active staff members will not be forced to update their existing recovery answers unless they manually re-configure their security settings.
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        </Card>
      </Tabs>

      {/* MODALS */}
      <Dialog open={isAddDocTypeOpen} onOpenChange={setIsAddDocTypeOpen}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden bg-white border border-gray-200 shadow-2xl rounded-brand">
          <DialogHeader className="p-6 border-b border-gray-100 bg-gray-50/50">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full border border-red-100 bg-red-50 text-pup-maroon shadow-sm flex items-center justify-center shrink-0">
                <i className="ph-duotone ph-pencil-line text-2xl"></i>
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-lg font-black tracking-tight text-gray-900 leading-tight">
                  New Document Configuration
                </DialogTitle>
                <DialogDescription className="text-sm font-medium mt-1.5 text-gray-600 leading-relaxed">
                  Deploy a new formal document type to the digitization framework.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <form onSubmit={addDocType}>
            <div className="p-6">
              <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">
                Document Name <span className="text-pup-maroon">*</span>
              </label>
              <Input
                type="text"
                placeholder="e.g. Honorable Dismissal"
                className="h-11 bg-white border border-gray-300 rounded-brand text-sm focus-visible:ring-pup-maroon focus-visible:border-pup-maroon"
                value={newDocTypeName}
                onChange={(e) => setNewDocTypeName(e.target.value)}
                required
              />
            </div>
            <div className="p-4 border-t border-gray-100 bg-white flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5">
              <Button type="button" variant="outline" onClick={() => setIsAddDocTypeOpen(false)} className="h-11 px-6 text-sm font-bold border-gray-300 text-gray-700 hover:bg-gray-50 rounded-brand">
                CANCEL
              </Button>
              <Button type="submit" className="h-11 px-6 bg-pup-maroon text-white hover:bg-red-900 shadow-sm font-bold flex items-center gap-2 rounded-brand">
                <i className="ph-bold ph-check text-lg"></i>
                CREATE TYPE
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditDocTypeOpen} onOpenChange={setIsEditDocTypeOpen}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden bg-white border border-gray-200 shadow-2xl rounded-brand">
          <DialogHeader className="p-6 border-b border-gray-100 bg-gray-50/50">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full border border-red-100 bg-red-50 text-pup-maroon shadow-sm flex items-center justify-center shrink-0">
                <i className="ph-duotone ph-pencil-line text-2xl"></i>
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-lg font-black tracking-tight text-gray-900 leading-tight">
                  Edit Document Type
                </DialogTitle>
                <DialogDescription className="text-sm font-medium mt-1.5 text-gray-600 leading-relaxed">
                  Update the document category label.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <form onSubmit={updDocType}>
            <div className="p-6">
              <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">
                Document Type Name <span className="text-pup-maroon">*</span>
              </label>
              <Input
                type="text"
                className="h-11 bg-white border border-gray-300 rounded-brand text-sm focus-visible:ring-pup-maroon focus-visible:border-pup-maroon"
                value={editDocType.name}
                onChange={(e) =>
                  setEditDocType((prev) => ({ ...prev, name: e.target.value }))
                }
                required
              />
            </div>
            <div className="p-4 border-t border-gray-100 bg-white flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5">
              <Button type="button" variant="outline" onClick={() => setIsEditDocTypeOpen(false)} className="h-11 px-6 text-sm font-bold border-gray-300 text-gray-700 hover:bg-gray-50 rounded-brand">
                CANCEL
              </Button>
              <Button type="submit" className="h-11 px-6 bg-pup-maroon text-white hover:bg-red-900 shadow-sm font-bold flex items-center gap-2 rounded-brand">
                <i className="ph-bold ph-check text-lg"></i>
                SAVE CHANGES
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
                <DialogTitle className="text-lg font-black tracking-tight text-gray-900 leading-tight">
                  New Academic Program
                </DialogTitle>
                <DialogDescription className="text-sm font-medium mt-1.5 text-gray-600 leading-relaxed">
                  Define a new degree course for student classification.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <form onSubmit={addCourse}>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">
                  Short Code <span className="text-pup-maroon">*</span>
                </label>
                <Input
                  type="text"
                  placeholder="e.g. BSIT"
                  className="h-11 bg-white border border-gray-300 rounded-brand text-sm focus-visible:ring-pup-maroon focus-visible:border-pup-maroon"
                  value={newCourseCode}
                  onChange={(e) => setNewCourseCode(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">
                  Full Designation <span className="text-pup-maroon">*</span>
                </label>
                <Input
                  type="text"
                  placeholder="e.g. Bachelor of Science in Information Technology"
                  className="h-11 bg-white border border-gray-300 rounded-brand text-sm focus-visible:ring-pup-maroon focus-visible:border-pup-maroon"
                  value={newCourseName}
                  onChange={(e) => setNewCourseName(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="p-4 border-t border-gray-100 bg-white flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5">
              <Button type="button" variant="outline" onClick={() => setIsAddCourseOpen(false)} className="h-11 px-6 text-sm font-bold border-gray-300 text-gray-700 hover:bg-gray-50 rounded-brand">
                CANCEL
              </Button>
              <Button type="submit" className="h-11 px-6 bg-pup-maroon text-white hover:bg-red-900 shadow-sm font-bold flex items-center gap-2 rounded-brand">
                <i className="ph-bold ph-check text-lg"></i>
                ADD PROGRAM
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditCourseOpen} onOpenChange={setIsEditCourseOpen}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden bg-white border border-gray-200 shadow-2xl rounded-brand">
          <DialogHeader className="p-6 border-b border-gray-100 bg-gray-50/50">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full border border-red-100 bg-red-50 text-pup-maroon shadow-sm flex items-center justify-center shrink-0">
                <i className="ph-duotone ph-pencil-line text-2xl"></i>
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-lg font-black tracking-tight text-gray-900 leading-tight">
                  Edit Degree Program
                </DialogTitle>
                <DialogDescription className="text-sm font-medium mt-1.5 text-gray-600 leading-relaxed">
                  Update the code and designation for this program.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <form onSubmit={updCourse}>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">
                  Short Code <span className="text-pup-maroon">*</span>
                </label>
                <Input
                  type="text"
                  className="h-11 bg-white border border-gray-300 rounded-brand text-sm focus-visible:ring-pup-maroon focus-visible:border-pup-maroon"
                  value={editCourse.code}
                  onChange={(e) =>
                    setEditCourse((prev) => ({ ...prev, code: e.target.value }))
                  }
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">
                  Full Designation <span className="text-pup-maroon">*</span>
                </label>
                <Input
                  type="text"
                  className="h-11 bg-white border border-gray-300 rounded-brand text-sm focus-visible:ring-pup-maroon focus-visible:border-pup-maroon"
                  value={editCourse.name}
                  onChange={(e) =>
                    setEditCourse((prev) => ({ ...prev, name: e.target.value }))
                  }
                  required
                />
              </div>
            </div>
            <div className="p-4 border-t border-gray-100 bg-white flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5">
              <Button type="button" variant="outline" onClick={() => setIsEditCourseOpen(false)} className="h-11 px-6 text-sm font-bold border-gray-300 text-gray-700 hover:bg-gray-50 rounded-brand">
                CANCEL
              </Button>
              <Button type="submit" className="h-11 px-6 bg-pup-maroon text-white hover:bg-red-900 shadow-sm font-bold flex items-center gap-2 rounded-brand">
                <i className="ph-bold ph-check text-lg"></i>
                SAVE CHANGES
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
                <DialogTitle className="text-lg font-black tracking-tight text-gray-900 leading-tight">
                  New Course Block
                </DialogTitle>
                <DialogDescription className="text-sm font-medium mt-1.5 text-gray-600 leading-relaxed">
                  Create a section block and assign it to a degree program.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <form onSubmit={addSection}>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">
                  Degree Program <span className="text-pup-maroon">*</span>
                </label>
                <select
                  className="h-12 w-full rounded-brand border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-900 shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-pup-maroon focus:border-pup-maroon"
                  value={secCourseCode}
                  onChange={(e) => setSecCourseCode(e.target.value)}
                  required
                >
                  <option value="">Select program...</option>
                  {courses.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.code} - {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">
                  Block Name <span className="text-pup-maroon">*</span>
                </label>
                <Input
                  type="text"
                  placeholder="e.g. Block 1"
                  className="h-11 bg-white border border-gray-300 rounded-brand text-sm focus-visible:ring-pup-maroon focus-visible:border-pup-maroon"
                  value={secName}
                  onChange={(e) => setSecName(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="p-4 border-t border-gray-100 bg-white flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5">
              <Button type="button" variant="outline" onClick={() => setIsAddSectionOpen(false)} className="h-11 px-6 text-sm font-bold border-gray-300 text-gray-700 hover:bg-gray-50 rounded-brand">
                CANCEL
              </Button>
              <Button type="submit" className="h-11 px-6 bg-pup-maroon text-white hover:bg-red-900 shadow-sm font-bold flex items-center gap-2 rounded-brand">
                <i className="ph-bold ph-check text-lg"></i>
                CREATE BLOCK
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditSectionOpen} onOpenChange={setIsEditSectionOpen}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden bg-white border border-gray-200 shadow-2xl rounded-brand">
          <DialogHeader className="p-6 border-b border-gray-100 bg-gray-50/50">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full border border-red-100 bg-red-50 text-pup-maroon shadow-sm flex items-center justify-center shrink-0">
                <i className="ph-duotone ph-pencil-line text-2xl"></i>
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-lg font-black tracking-tight text-gray-900 leading-tight">
                  Edit Course Block
                </DialogTitle>
                <DialogDescription className="text-sm font-medium mt-1.5 text-gray-600 leading-relaxed">
                  Update the section block and assigned degree program.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <form onSubmit={updSection}>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">
                  Degree Program <span className="text-pup-maroon">*</span>
                </label>
                <select
                  className="h-12 w-full rounded-brand border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-900 shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-pup-maroon focus:border-pup-maroon"
                  value={editSection.courseCode}
                  onChange={(e) =>
                    setEditSection((prev) => ({ ...prev, courseCode: e.target.value }))
                  }
                  required
                >
                  <option value="">Select program...</option>
                  {courses.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.code} - {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">
                  Block Name <span className="text-pup-maroon">*</span>
                </label>
                <Input
                  type="text"
                  className="h-11 bg-white border border-gray-300 rounded-brand text-sm focus-visible:ring-pup-maroon focus-visible:border-pup-maroon"
                  value={editSection.name}
                  onChange={(e) =>
                    setEditSection((prev) => ({ ...prev, name: e.target.value }))
                  }
                  required
                />
              </div>
            </div>
            <div className="p-4 border-t border-gray-100 bg-white flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5">
              <Button type="button" variant="outline" onClick={() => setIsEditSectionOpen(false)} className="h-11 px-6 text-sm font-bold border-gray-300 text-gray-700 hover:bg-gray-50 rounded-brand">
                CANCEL
              </Button>
              <Button type="submit" className="h-11 px-6 bg-pup-maroon text-white hover:bg-red-900 shadow-sm font-bold flex items-center gap-2 rounded-brand">
                <i className="ph-bold ph-check text-lg"></i>
                SAVE CHANGES
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmModal
        open={confirmOpen}
        onCancel={() => setConfirmOpen(false)}
        title={confirmPayload.title}
        message={confirmPayload.message}
        confirmLabel={confirmPayload.confirmLabel}
        onConfirm={confirmPayload.onConfirm}
      />
    </div>
  );
}
