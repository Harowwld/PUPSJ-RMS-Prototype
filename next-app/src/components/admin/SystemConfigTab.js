import { useState, useEffect } from "react";

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

  const fetchData = async () => {
    setLoading(true);
    try {
      const [resDt, resC, resSec] = await Promise.all([
        fetch("/api/doc-types?admin=true"),
        fetch("/api/courses"),
        fetch("/api/sections")
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
        body: JSON.stringify({ name: dtName })
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "Failed");
      setDtName("");
      showToast("Document Type added");
      logAdminAction(`Added document type: ${dtName}`);
      fetchData();
    } catch (err) {
      showToast(err.message, true);
    }
  };

  const delDocType = async (id, name) => {
    if (!confirm(`Delete document type "${name}"?`)) return;
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
        body: JSON.stringify({ code: cCode, name: cName })
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "Failed");
      setCCode("");
      setCName("");
      showToast("Course added");
      logAdminAction(`Added course: ${cCode}`);
      fetchData();
    } catch (err) {
      showToast(err.message, true);
    }
  };

  const delCourse = async (id, code) => {
    if (!confirm(`Delete course "${code}"?`)) return;
    try {
      const res = await fetch(`/api/courses/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "Failed");
      showToast("Course deleted");
      logAdminAction(`Deleted course: ${code}`);
      fetchData();
    } catch (err) {
      showToast(err.message, true);
    }
  };

  const addSection = async (e) => {
    e.preventDefault();
    if (!secName.trim()) return;
    try {
      const res = await fetch("/api/sections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: secName })
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "Failed");
      setSecName("");
      showToast("Section added");
      logAdminAction(`Added section: ${secName}`);
      fetchData();
    } catch (err) {
      showToast(err.message, true);
    }
  };

  const delSection = async (id, name) => {
    if (!confirm(`Delete section "${name}"?`)) return;
    try {
      const res = await fetch(`/api/sections/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "Failed");
      showToast("Section deleted");
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
        const lines = text.split(/\r?\n/).filter(line => line.trim());
        if (lines.length < 2) throw new Error("CSV file is empty or missing headers");

        const headers = lines[0].split(",").map(h => h.trim().toLowerCase());
        const catIdx = headers.indexOf("category");
        const nameIdx = headers.indexOf("name");
        const codeIdx = headers.indexOf("code");

        if (catIdx === -1 || nameIdx === -1) {
          throw new Error("CSV must have 'Category' and 'Name' columns. 'Code' is required for Courses.");
        }

        let successCount = 0;
        let failCount = 0;

        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(",").map(c => c.trim());
          const category = cols[catIdx]?.toLowerCase();
          const name = cols[nameIdx];
          const code = codeIdx !== -1 ? cols[codeIdx] : "";

          try {
            let res;
            if (category === "documenttype" || category === "document type") {
              res = await fetch("/api/doc-types?admin=true", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name })
              });
            } else if (category === "course") {
              res = await fetch("/api/courses", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ code, name })
              });
            } else if (category === "section") {
              res = await fetch("/api/sections", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name })
              });
            } else {
              continue; // Skip unknown category
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

        showToast(`Import finished: ${successCount} success, ${failCount} failed`);
        logAdminAction(`Bulk imported system data from CSV (${successCount} items)`);
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

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Loading system data...</div>;
  }

  return (
    <div className="h-full flex flex-col gap-6 p-4 overflow-y-auto">
      <div className="bg-white rounded-brand shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">System Data Management</h2>
        <p className="text-gray-600 mb-6">Manage the list of allowed document types, courses, and sections for the staff application.</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Document Types */}
          <div className="border border-gray-200 rounded-brand overflow-hidden flex flex-col">
            <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 font-bold text-gray-800">
              Document Types
            </div>
            <div className="p-4 flex-1 overflow-y-auto max-h-64">
              <ul className="space-y-2">
                {docTypes.map(dt => (
                  <li key={dt.id} className="flex justify-between items-center bg-gray-50 px-3 py-2 rounded">
                    <span className="text-sm font-medium">{dt.name}</span>
                    <button onClick={() => delDocType(dt.id, dt.name)} className="text-red-500 hover:text-red-700">
                      <i className="ph-bold ph-trash"></i>
                    </button>
                  </li>
                ))}
                {docTypes.length === 0 && <li className="text-sm text-gray-500 text-center py-2">No items</li>}
              </ul>
            </div>
            <div className="p-4 border-t border-gray-200 bg-gray-50">
              <form onSubmit={addDocType} className="flex gap-2">
                <input
                  type="text"
                  placeholder="New Doc Type"
                  className="flex-1 rounded border border-gray-300 px-3 py-1.5 text-sm"
                  value={dtName}
                  onChange={e => setDtName(e.target.value)}
                />
                <button type="submit" className="bg-pup-maroon text-white px-3 py-1.5 rounded text-sm font-bold hover:bg-red-800">
                  Add
                </button>
              </form>
            </div>
          </div>

          {/* Courses */}
          <div className="border border-gray-200 rounded-brand overflow-hidden flex flex-col">
            <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 font-bold text-gray-800">
              Courses
            </div>
            <div className="p-4 flex-1 overflow-y-auto max-h-64">
              <ul className="space-y-2">
                {courses.map(c => (
                  <li key={c.id} className="flex justify-between items-center bg-gray-50 px-3 py-2 rounded">
                    <div className="flex flex-col">
                      <span className="text-sm font-bold">{c.code}</span>
                      <span className="text-xs text-gray-500">{c.name}</span>
                    </div>
                    <button onClick={() => delCourse(c.id, c.code)} className="text-red-500 hover:text-red-700">
                      <i className="ph-bold ph-trash"></i>
                    </button>
                  </li>
                ))}
                {courses.length === 0 && <li className="text-sm text-gray-500 text-center py-2">No items</li>}
              </ul>
            </div>
            <div className="p-4 border-t border-gray-200 bg-gray-50">
              <form onSubmit={addCourse} className="flex flex-col gap-2">
                <input
                  type="text"
                  placeholder="Code (e.g. BSIT)"
                  className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm"
                  value={cCode}
                  onChange={e => setCCode(e.target.value)}
                />
                <input
                  type="text"
                  placeholder="Full Name"
                  className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm"
                  value={cName}
                  onChange={e => setCName(e.target.value)}
                />
                <button type="submit" className="bg-pup-maroon text-white px-3 py-1.5 rounded text-sm font-bold hover:bg-red-800 w-full">
                  Add Course
                </button>
              </form>
            </div>
          </div>

          {/* Sections */}
          <div className="border border-gray-200 rounded-brand overflow-hidden flex flex-col">
            <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 font-bold text-gray-800">
              Sections
            </div>
            <div className="p-4 flex-1 overflow-y-auto max-h-64">
              <ul className="space-y-2">
                {sections.map(sec => (
                  <li key={sec.id} className="flex justify-between items-center bg-gray-50 px-3 py-2 rounded">
                    <span className="text-sm font-medium">{sec.name}</span>
                    <button onClick={() => delSection(sec.id, sec.name)} className="text-red-500 hover:text-red-700">
                      <i className="ph-bold ph-trash"></i>
                    </button>
                  </li>
                ))}
                {sections.length === 0 && <li className="text-sm text-gray-500 text-center py-2">No items</li>}
              </ul>
            </div>
            <div className="p-4 border-t border-gray-200 bg-gray-50">
              <form onSubmit={addSection} className="flex gap-2">
                <input
                  type="text"
                  placeholder="New Section"
                  className="flex-1 rounded border border-gray-300 px-3 py-1.5 text-sm"
                  value={secName}
                  onChange={e => setSecName(e.target.value)}
                />
                <button type="submit" className="bg-pup-maroon text-white px-3 py-1.5 rounded text-sm font-bold hover:bg-red-800">
                  Add
                </button>
              </form>
            </div>
          </div>

        </div>
      </div>

      <div className="bg-white rounded-brand shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-2">Bulk Import (CSV)</h2>
        <p className="text-sm text-gray-600 mb-4">
          Upload a CSV file to add multiple items at once. 
          Required columns: <code className="bg-gray-100 px-1 rounded text-pup-maroon font-bold">Category</code>, 
          <code className="bg-gray-100 px-1 rounded text-pup-maroon font-bold">Name</code>, 
          <code className="bg-gray-100 px-1 rounded text-pup-maroon font-bold">Code</code> (Courses only).
        </p>
        <div className="flex flex-col md:flex-row items-center gap-4">
          <input
            type="file"
            accept=".csv"
            disabled={importing}
            onChange={handleCsvImport}
            className="block w-full text-sm text-gray-500
              file:mr-4 file:py-2 file:px-4
              file:rounded-brand file:border-0
              file:text-sm file:font-bold
              file:bg-pup-maroon file:text-white
              hover:file:bg-red-800
              disabled:opacity-50 disabled:cursor-not-allowed"
          />
          {importing && (
            <div className="flex items-center gap-2 text-sm font-bold text-pup-maroon animate-pulse">
              <i className="ph-bold ph-spinner-gap animate-spin"></i>
              Importing data...
            </div>
          )}
        </div>
        <div className="mt-4 p-3 bg-blue-50 border border-blue-100 rounded-brand">
          <p className="text-xs text-blue-700 font-medium leading-relaxed">
            <b>Example CSV content:</b><br/>
            Category,Name,Code<br/>
            DocumentType,Birth Certificate,<br/>
            Course,BS in Information Technology,BSIT<br/>
            Section,1,
          </p>
        </div>
      </div>
    </div>
  );
}
