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
import ConfirmModal from "@/components/shared/ConfirmModal";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

export default function SystemConfigTab({ showToast, logAdminAction }) {
  const [docTypes, setDocTypes] = useState([]);
  const [courses, setCourses] = useState([]);
  const [sections, setSections] = useState([]);

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

  const fetchData = async () => {
    setLoading(true);
    try {
      const [resDt, resC, resSec] = await Promise.all([
        fetch("/api/doc-types?admin=true"),
        fetch("/api/courses"),
        fetch("/api/sections"),
      ]);
      const jsonDt = await resDt.json();
      const jsonC = await resC.json();
      const jsonSec = await resSec.json();

      if (jsonDt.ok) setDocTypes(jsonDt.data);
      if (jsonC.ok) setCourses(jsonC.data);
      if (jsonSec.ok) setSections(jsonSec.data);
    } catch (err) {
      showToast("Failed to load system config data", true);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

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
      showToast("Document Type added");
      logAdminAction(`Added document type: ${dtName}`);
      fetchData();
    } catch (err) {
      showToast(err.message, true);
    }
  };

  const delDocType = async (id, name) => {
    try {
      const res = await fetch(`/api/doc-types/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "Failed");
      showToast("Document Type deleted");
      logAdminAction(`Deleted document type: ${name}`);
      fetchData();
    } catch (err) {
      showToast(err.message, true);
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
      showToast("Degree Program added");
      logAdminAction(`Added program: ${cCode}`);
      fetchData();
    } catch (err) {
      showToast(err.message, true);
    }
  };

  const delCourse = async (id, code) => {
    try {
      const res = await fetch(`/api/courses/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "Failed");
      showToast("Degree Program deleted");
      logAdminAction(`Deleted program: ${code}`);
      fetchData();
    } catch (err) {
      showToast(err.message, true);
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
      showToast("Section block added");
      logAdminAction(`Added section block: ${secName} (${secCourseCode})`);
      fetchData();
    } catch (err) {
      showToast(err.message, true);
    }
  };

  const delSection = async (id, name) => {
    try {
      const res = await fetch(`/api/sections/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "Failed");
      showToast("Section block deleted");
      logAdminAction(`Deleted section: ${name}`);
      fetchData();
    } catch (err) {
      showToast(err.message, true);
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

        let successCount = 0;
        let failCount = 0;

        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(",").map((c) => c.trim());
          const category = cols[catIdx]?.toLowerCase();
          const name = cols[nameIdx];
          const code = codeIdx !== -1 ? cols[codeIdx] : "";

          try {
            let res;
            if (category === "documenttype" || category === "document type") {
              res = await fetch("/api/doc-types?admin=true", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name }),
              });
            } else if (category === "course") {
              if (!code) throw new Error("Course requires a code identifier");
              res = await fetch("/api/courses", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ code, name }),
              });
            } else if (category === "section") {
              if (!code)
                throw new Error("Section requires a valid Degree Program code");
              res = await fetch("/api/sections", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, courseCode: code }),
              });
            } else {
              continue;
            }

            if (res.ok) {
              successCount++;
            } else {
              failCount++;
            }
          } catch (err) {
            failCount++;
          }
        }

        showToast(
          `Bulk Import Finished: ${successCount} processed, ${failCount} failed`,
        );
        logAdminAction(
          `Executed bulk CSV taxonomy import (${successCount} records structured)`,
        );
        fetchData();
      } catch (err) {
        showToast(err.message, true);
      } finally {
        setImporting(false);
        e.target.value = "";
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="h-full flex flex-col gap-6 p-6 overflow-y-auto animate-fade-in font-inter">
      <div className="flex justify-between items-end shrink-0">
        <div>
          <h2 className="text-2xl font-black text-pup-maroon tracking-tight">
            System Configuration
          </h2>
          <p className="text-sm font-medium text-gray-500 mt-1 max-w-2xl">
            Configure baseline taxonomy parameters for the Records Repository.
            Modifications immediately restrict or expand Staff options.
          </p>
        </div>
      </div>

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
          <i className="ph-duotone ph-database-export text-lg"></i> Bulk Import
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
                    <th className="p-3 font-bold text-right px-6 w-32 border-l border-gray-200">
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
                        <Button
                          variant="ghost"
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
                          className="text-gray-400 group-hover:text-red-700 hover:bg-red-100 uppercase tracking-widest text-[10px] font-bold h-7 inline-flex"
                        >
                          <i className="ph-bold ph-trash text-sm mr-1.5"></i>{" "}
                          Delete
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {docTypes.length === 0 && (
                    <tr>
                      <td colSpan={2} className="p-0">
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
                    <th className="p-3 font-bold text-right px-6 w-32 border-l border-gray-200">
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
                        <Button
                          variant="ghost"
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
                          className="text-gray-400 group-hover:text-red-700 hover:bg-red-100 uppercase tracking-widest text-[10px] font-bold h-7 inline-flex"
                        >
                          <i className="ph-bold ph-trash text-sm mr-1.5"></i>{" "}
                          Delete
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {courses.length === 0 && (
                    <tr>
                      <td colSpan={3} className="p-0">
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
                  className="h-10 rounded-md border border-gray-200 bg-white px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring font-medium text-gray-700"
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
                    <th className="p-3 font-bold text-right px-6 w-32 border-l border-gray-200">
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
                          <Button
                            variant="ghost"
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
                            className="text-gray-400 group-hover:text-red-700 hover:bg-red-100 uppercase tracking-widest text-[10px] font-bold h-7 inline-flex"
                          >
                            <i className="ph-bold ph-trash text-sm mr-1.5"></i>{" "}
                            Delete
                          </Button>
                        </td>
                      </tr>
                    ))}
                  {sections.filter(
                    (sec) =>
                      selectedCourseFilter === "" ||
                      sec.course_code === selectedCourseFilter,
                  ).length === 0 && (
                    <tr>
                      <td colSpan={3} className="p-0">
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
          <div className="flex flex-col h-full animate-fade-in w-full overflow-hidden bg-gray-50">
            <div className="flex-1 overflow-auto min-h-0 p-8 flex flex-col items-center justify-center">
              <div className="w-full max-w-4xl bg-white border border-gray-200 shadow-sm rounded-brand overflow-hidden flex flex-col md:flex-row">
                <div className="p-8 border-b md:border-b-0 md:border-r border-gray-200 w-full md:w-1/2 flex flex-col justify-center bg-white">
                  <h3 className="text-xl font-black text-gray-900 flex items-center gap-2 mb-2">
                    <i className="ph-duotone ph-database-export text-pup-maroon text-2xl"></i>
                    Mass Taxonomy Ingestion
                  </h3>
                  <p className="text-sm font-medium text-gray-500 leading-relaxed mb-6">
                    Upload a properly formatted .CSV payload to seed Document
                    Types, Degree Programs, and Sections instantly rather than
                    adding them one by one.
                  </p>

                  <div className="bg-white border-2 border-dashed border-gray-300 rounded-brand p-8 hover:bg-gray-50 hover:border-pup-maroon transition-all group relative cursor-pointer flex flex-col items-center justify-center text-center shadow-sm">
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
                      {importing
                        ? "Parsing Payload..."
                        : "Click or drag CSV here"}
                    </p>
                    <p className="text-xs text-gray-400 font-bold mt-2">
                      CSV format explicitly required.
                    </p>
                  </div>
                </div>

                <div className="p-8 w-full md:w-1/2 bg-gray-[900] flex flex-col justify-center relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-gray-800 rounded-bl-full -mr-10 -mt-10 opacity-50"></div>
                  <h4 className="text-xs font-bold text-gray-300 mb-4 uppercase tracking-wider flex items-center gap-2">
                    <i className="ph-bold ph-shield-check text-green-500 text-lg"></i>
                    Header Integrity Array
                  </h4>
                  <div className="bg-gray-[950] rounded border border-gray-800 p-5 text-sm font-mono text-green-400 leading-relaxed shadow-inner">
                    <span className="text-gray-500 select-none text-xs block mb-1">
                      # Target Line 0 Schema
                    </span>
                    Category,Name,Code
                    <br />
                    <br />
                    <span className="text-gray-500 select-none text-xs block mb-1">
                      # Supported Types (Category)
                    </span>
                    <span className="text-amber-400">Document Type</span> |{" "}
                    <span className="text-amber-400">Course</span> |{" "}
                    <span className="text-amber-400">Section</span>
                    <br />
                    <br />
                    <span className="text-gray-500 select-none text-xs block mb-1">
                      # Array Payload Example
                    </span>
                    DocumentType,Birth Certificate,
                    <br />
                    Course,Information Tech,BSIT
                    <br />
                    Section,Block 1,BSIT
                    <br />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </Card>
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
                className="w-full h-11 shadow-sm bg-white rounded-brand"
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
                className="h-11 px-5 text-sm font-bold border-gray-300 text-gray-700 hover:bg-gray-50 rounded-brand"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="h-11 px-5 bg-pup-maroon text-white font-bold shadow-sm hover:bg-red-900 rounded-brand"
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
                  className="w-full h-11 shadow-sm bg-white rounded-brand"
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
                  className="w-full h-11 shadow-sm bg-white rounded-brand"
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
                className="h-11 px-5 text-sm font-bold border-gray-300 text-gray-700 hover:bg-gray-50 rounded-brand"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="h-11 px-5 bg-pup-maroon text-white font-bold shadow-sm hover:bg-red-900 rounded-brand"
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
                  className="w-full flex h-11 rounded-brand border border-input bg-white px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 font-medium"
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
                  className="w-full h-11 shadow-sm bg-white rounded-brand"
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
                className="h-11 px-5 text-sm font-bold border-gray-300 text-gray-700 hover:bg-gray-50 rounded-brand"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="h-11 px-5 bg-pup-maroon text-white font-bold shadow-sm hover:bg-red-900 rounded-brand"
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
