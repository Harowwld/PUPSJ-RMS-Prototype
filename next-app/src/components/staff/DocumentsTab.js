"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import ConfirmModal from "@/components/shared/ConfirmModal";

export default function DocumentsTab({
  docsForm,
  setDocsForm,
  refreshDocuments,
  docTypes,
  docsLoading,
  docsError,
  docsRows,
  updateDoc,
  deleteDoc,
}) {
  const [updatePromptOpen, setUpdatePromptOpen] = useState(false);
  const [updateTargetId, setUpdateTargetId] = useState(null);
  const [updateStudentNo, setUpdateStudentNo] = useState("");
  const [updateStudentName, setUpdateStudentName] = useState("");
  const [updateDocType, setUpdateDocType] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  return (
    <div id="view-documents" className="h-full flex flex-col gap-6 p-6 overflow-y-auto animate-fade-in font-inter">
      <div className="flex justify-between items-end shrink-0">
        <div>
          <h2 className="text-2xl font-black text-pup-maroon tracking-tight">Documents Repository</h2>
          <p className="text-sm font-medium text-gray-500 mt-1 max-w-2xl">
            Search and manage existing student document records within the centralized digital archives. Repository access is logged for compliance.
          </p>
        </div>
      </div>

      <section className="flex-1 bg-white rounded-brand border border-gray-300 shadow-sm overflow-hidden flex flex-col">
        <div className="p-6 bg-gray-50/50 flex-none border-b border-gray-200">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-end">
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
          </div>

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
                  ) ? (
                  <tr>
                    <td colSpan={7} className="p-0">
                      <div className="h-[400px] flex flex-col items-center justify-center text-center text-gray-500">
                        <div className="w-16 h-16 rounded-full bg-white border border-gray-200 flex items-center justify-center mb-4 shadow-sm">
                          <i className="ph-duotone ph-magnifying-glass text-3xl text-pup-maroon"></i>
                        </div>
                        <div className="text-lg font-bold text-gray-900">
                          Search Documents
                        </div>
                        <div className="text-sm font-medium text-gray-600 mt-1 max-w-md">
                          Enter a student number, name, or select a document type to find related records.
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : docsRows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-0">
                      <div className="h-[400px] flex flex-col items-center justify-center text-center text-gray-500">
                        <div className="w-16 h-16 rounded-full bg-white border border-gray-200 flex items-center justify-center mb-4 shadow-sm">
                          <i className="ph-duotone ph-warning-circle text-3xl text-red-600"></i>
                        </div>
                        <div className="text-lg font-bold text-gray-900">
                          No Results Found
                        </div>
                        <div className="text-sm font-medium text-gray-600 mt-1 max-w-md">
                          We couldn&apos;t find any documents matching your search criteria.
                        </div>
                      </div>
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
                                  setUpdateTargetId(r.doc.id);
                                  setUpdateStudentNo(String(r.student_no || ""));
                                  setUpdateStudentName(String(r.student_name || ""));
                                  setUpdateDocType(String(r.doc_type || ""));
                                  setUpdatePromptOpen(true);
                                }}
                                className="px-3 h-11 rounded-brand bg-pup-maroon text-white font-bold text-xs hover:bg-red-900"
                              >
                                Update
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setDeleteTarget(r.doc);
                                  setDeleteOpen(true);
                                }}
                                className="px-3 h-11 rounded-brand bg-red-600 text-white font-bold text-xs hover:bg-red-700"
                              >
                                Delete
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

          <div className="mt-4 flex items-center">
            <div className="text-xs text-gray-500 font-medium">
              {docsForm.studentNo.trim() || docsForm.studentName.trim() || docsForm.docType.trim()
                ? `Showing ${docsRows.length} documents`
                : ""}
            </div>
          </div>
        </div>
      </section>
      <Dialog
        open={updatePromptOpen}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setUpdatePromptOpen(false);
            setUpdateTargetId(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-md p-0 overflow-hidden bg-white sm:rounded-sm rounded-sm border-gray-200 shadow-xl">
          <DialogHeader className="p-5 border-b border-gray-200 bg-gray-50/60 flex flex-row items-center justify-between space-y-0">
            <DialogTitle className="font-bold text-pup-maroon">Update Document Metadata</DialogTitle>
          </DialogHeader>
          <div className="p-5">
            <label className="block text-xs font-bold text-gray-700 mb-1 uppercase">
              Student No
            </label>
            <input
              className="form-input mb-3"
              value={updateStudentNo}
              onChange={(e) => setUpdateStudentNo(e.target.value)}
            />
            <label className="block text-xs font-bold text-gray-700 mb-1 uppercase">
              Student Name
            </label>
            <input
              className="form-input mb-3"
              value={updateStudentName}
              onChange={(e) => setUpdateStudentName(e.target.value)}
            />
            <label className="block text-xs font-bold text-gray-700 mb-1 uppercase">
              Document Type
            </label>
            <input
              className="form-input"
              value={updateDocType}
              onChange={(e) => setUpdateDocType(e.target.value)}
            />
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setUpdatePromptOpen(false);
                  setUpdateTargetId(null);
                }}
                className="px-4 h-11 rounded-brand bg-white border border-gray-300 text-gray-700 font-bold text-sm hover:border-pup-maroon"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (!updateTargetId) return;
                  await updateDoc(updateTargetId, {
                    studentNo: String(updateStudentNo).trim(),
                    studentName: String(updateStudentName).trim(),
                    docType: String(updateDocType).trim(),
                  });
                  setUpdatePromptOpen(false);
                  setUpdateTargetId(null);
                }}
                className="px-4 h-11 rounded-brand bg-pup-maroon text-white font-bold text-sm hover:bg-red-900"
              >
                Save
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <ConfirmModal
        open={deleteOpen}
        title="Delete Document"
        message={`Delete "${deleteTarget?.original_filename || "this document"}"? This action cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={async () => {
          if (!deleteTarget?.id) return;
          await deleteDoc(deleteTarget.id);
          setDeleteOpen(false);
          setDeleteTarget(null);
        }}
        onCancel={() => {
          setDeleteOpen(false);
          setDeleteTarget(null);
        }}
      />
    </div>
  );
}
