"use client";

export default function DocumentsTab({
  docsForm,
  setDocsForm,
  refreshDocuments,
  docTypes,
  docsFileInputRef,
  setDocsFile,
  uploadDocument,
  docsLoading,
  docsError,
  docsRows,
  updateDoc,
}) {
  return (
    <div id="view-documents" className="flex flex-col w-full h-full gap-4 animate-fade-in">
      <section className="flex-1 bg-white rounded-brand border border-gray-300 shadow-sm overflow-hidden flex flex-col">
        <div className="p-6 border-b border-gray-200 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 flex-none">
          <div>
            <h2 className="text-xl font-bold text-pup-maroon">Documents</h2>
            <p className="text-sm text-gray-600">
              Stored locally in <code>.local/</code> (SQLite + uploaded PDFs).
            </p>
          </div>
        </div>

        <div className="p-6 bg-gray-50/50 flex-none border-b border-gray-200">
          <form onSubmit={uploadDocument} className="grid grid-cols-1 lg:grid-cols-5 gap-4 items-end">
            <div className="lg:col-span-1">
              <label className="block text-xs font-bold text-gray-700 mb-1 uppercase">
                Student No
              </label>
              <input
                className="form-input font-mono h-11"
                value={docsForm.studentNo}
                onChange={(e) => {
                  const v = e.target.value;
                  setDocsForm((p) => {
                    const next = { ...p, studentNo: v };
                    refreshDocuments(next);
                    return next;
                  });
                }}
                placeholder="202X-XXXXX-MN-0"
                required
              />
            </div>

            <div className="lg:col-span-1">
              <label className="block text-xs font-bold text-gray-700 mb-1 uppercase">
                Student Name
              </label>
              <input
                className="form-input h-11"
                value={docsForm.studentName}
                onChange={(e) => {
                  const v = e.target.value;
                  setDocsForm((p) => {
                    const next = { ...p, studentName: v };
                    refreshDocuments(next);
                    return next;
                  });
                }}
                placeholder="Optional"
              />
            </div>

            <div className="lg:col-span-1">
              <label className="block text-xs font-bold text-gray-700 mb-1 uppercase">
                Document Type
              </label>
              <select
                className="form-select h-11"
                value={docsForm.docType}
                onChange={(e) => {
                  const v = e.target.value;
                  setDocsForm((p) => {
                    const next = { ...p, docType: v };
                    refreshDocuments(next);
                    return next;
                  });
                }}
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
                className="block w-full h-11 text-sm text-gray-600 file:mr-3 file:h-11 file:px-4 file:rounded-brand file:border file:border-gray-300 file:bg-white file:text-gray-700 file:font-bold hover:file:border-pup-maroon"
                onChange={(e) => setDocsFile(e.target.files?.[0] || null)}
                required
              />
            </div>

            <div className="lg:col-span-1 flex gap-2">
              <button
                type="submit"
                disabled={docsLoading}
                className={`flex-1 bg-pup-maroon text-white h-11 rounded-brand font-bold text-sm hover:bg-red-900 transition-colors ${
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
                className="px-4 h-11 rounded-brand bg-white border border-gray-300 text-gray-700 font-bold text-sm hover:border-pup-maroon"
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

        <div className="p-6 flex-1 flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto overflow-x-auto border border-gray-200 rounded-brand">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
                <tr className="text-left text-xs uppercase tracking-wider text-gray-600">
                  <th className="p-3 font-bold">Student No</th>
                  <th className="p-3 font-bold">Name</th>
                  <th className="p-3 font-bold">Type</th>
                  <th className="p-3 font-bold">Status</th>
                  <th className="p-3 font-bold">File</th>
                  <th className="p-3 font-bold">Created</th>
                  <th className="p-3 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {docsLoading ? (
                  <tr>
                    <td colSpan={7} className="p-6 text-center text-gray-500 font-medium">
                      Loading...
                    </td>
                  </tr>
                ) : !(
                    docsForm.studentNo.trim() ||
                    docsForm.studentName.trim() ||
                    docsForm.docType.trim()
                  ) ? null : docsRows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-6 text-center text-gray-500 font-medium">
                      No matching students found.
                    </td>
                  </tr>
                ) : (
                  docsRows.map((r, idx) => (
                    <tr
                      key={r.id || idx}
                      className={`hover:bg-gray-50 ${
                        r.status === "uploaded" ? "bg-green-50/40" : "bg-red-50/40"
                      }`}
                    >
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
                      <td className="p-3">
                        {r.status === "uploaded" ? (
                          <span className="inline-flex items-center px-2 py-1 rounded-full bg-green-50 text-green-800 border border-green-200 text-xs font-bold">
                            Uploaded
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-1 rounded-full bg-red-50 text-red-800 border border-red-200 text-xs font-bold">
                            Missing
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-gray-700">
                        {r.doc ? (
                          <>
                            {r.doc.original_filename}
                            <div className="text-xs text-gray-500 font-mono">
                              {(r.doc.size_bytes / 1024).toFixed(1)} KB
                            </div>
                          </>
                        ) : (
                          <span className="text-xs text-gray-500 font-medium">Not uploaded</span>
                        )}
                      </td>
                      <td className="p-3 text-gray-600 font-medium">
                        {r.doc ? String(r.doc.created_at || "").replace("T", " ") : "—"}
                      </td>
                      <td className="p-3">
                        <div className="flex justify-end gap-2">
                          {r.doc ? (
                            <>
                              <a
                                className="px-3 h-11 inline-flex items-center rounded-brand bg-white border border-gray-300 text-gray-700 font-bold text-xs hover:border-pup-maroon"
                                href={`/api/documents/${r.doc.id}`}
                                target="_blank"
                                rel="noreferrer"
                              >
                                Open
                              </a>
                              <button
                                type="button"
                                onClick={async () => {
                                  if (!r.doc?.id) return;
                                  const nextStudentNo = prompt(
                                    "Update Student No:",
                                    String(r.student_no || "")
                                  );
                                  if (nextStudentNo === null) return;

                                  const nextStudentName = prompt(
                                    "Update Student Name (optional):",
                                    String(r.student_name || "")
                                  );
                                  if (nextStudentName === null) return;

                                  const nextDocType = prompt(
                                    "Update Document Type:",
                                    String(r.doc_type || "")
                                  );
                                  if (nextDocType === null) return;

                                  await updateDoc(r.doc.id, {
                                    studentNo: String(nextStudentNo).trim(),
                                    studentName: String(nextStudentName).trim(),
                                    docType: String(nextDocType).trim(),
                                  });
                                }}
                                className="px-3 h-11 rounded-brand bg-pup-maroon text-white font-bold text-xs hover:bg-red-900"
                              >
                                Update
                              </button>
                            </>
                          ) : null}
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
              {docsForm.studentNo.trim() || docsForm.studentName.trim() || docsForm.docType.trim()
                ? `Showing ${docsRows.length} documents`
                : ""}
            </div>
            <button
              type="button"
              onClick={() => refreshDocuments(docsForm)}
              className="px-4 h-11 rounded-brand bg-gray-100 border border-gray-200 text-gray-700 font-bold text-xs hover:border-pup-maroon"
            >
              Refresh
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
