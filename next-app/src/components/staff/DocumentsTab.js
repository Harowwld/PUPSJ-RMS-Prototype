"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { CardContent } from "../ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatPHDateTime } from "@/lib/timeFormat";
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyMedia,
} from "@/components/ui/empty";

export default function DocumentsTab({
  docsForm,
  setDocsForm,
  refreshDocuments,
  docTypes,
  docsLoading,
  docsError,
  docsRows,
  updateDoc,
  onPreviewDocument,
}) {
  const [updatePromptOpen, setUpdatePromptOpen] = useState(false);
  const [updateTargetId, setUpdateTargetId] = useState(null);
  const [updateStudentNo, setUpdateStudentNo] = useState("");
  const [updateStudentName, setUpdateStudentName] = useState("");
  const [updateDocType, setUpdateDocType] = useState("");
  const [updateFile, setUpdateFile] = useState(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const [updateSaving, setUpdateSaving] = useState(false);
  const fileRef = useRef(null);

  const handlePickedFile = (file) => {
    if (!file) return;
    if (file.type !== "application/pdf") return;
    setUpdateFile(file);
  };

  const uniqueStudents = Array.from(new Set(docsRows.map(r => r.student_no)));
  const isSingleStudentView = uniqueStudents.length === 1 && !docsForm.docType.trim() && docsRows.length > 0;
  
  let compPercent = 0;
  let compUploaded = 0;
  let compTotal = 0;
  if (isSingleStudentView) {
    compTotal = docsRows.length;
    compUploaded = docsRows.filter(r => r.status === "uploaded").length;
    compPercent = compTotal > 0 ? Math.round((compUploaded / compTotal) * 100) : 0;
  }

  return (
    <div
      id="view-documents"
      className="flex flex-col lg:flex-row w-full h-full gap-4 animate-fade-in"
    >
      <section className="flex-1 bg-white rounded-brand border border-gray-300 shadow-sm overflow-hidden flex flex-col">
        <div className="p-4 bg-gray-50/50 flex-none border-b border-gray-200">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-end">
            <div className="lg:col-span-1">
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-gray-700 uppercase">
                  Student No
                </label>
                {(docsForm.studentNo !== "" ||
                  docsForm.studentName !== "" ||
                  docsForm.docType !== "") && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      const cleared = {
                        studentNo: "",
                        studentName: "",
                        docType: "",
                      };
                      setDocsForm(cleared);
                      refreshDocuments(cleared);
                    }}
                    className="h-5 px-1.5 text-[9px] font-bold text-pup-maroon hover:bg-red-50 hover:text-pup-darkMaroon"
                  >
                    CLEAR ALL
                  </Button>
                )}
              </div>
              <Input
                className="h-10 font-mono bg-white border border-gray-300 rounded-brand text-sm px-4 py-2 focus:outline-none focus:ring-2 focus:ring-pup-maroon focus:border-pup-maroon transition-colors"
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
              <Input
                className="h-10 bg-white border border-gray-300 rounded-brand text-sm px-4 py-2 focus:outline-none focus:ring-2 focus:ring-pup-maroon focus:border-pup-maroon transition-colors"
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
                className="w-full h-10 bg-white border border-gray-300 rounded-brand text-sm px-4 py-2 focus:outline-none focus:ring-2 focus:ring-pup-maroon focus:border-pup-maroon transition-colors"
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

        <CardContent className="p-6 flex-1 flex flex-col min-h-0">
          {docsLoading ? (
            <div className="flex-1 flex flex-col space-y-4">
              <div className="bg-gray-50/80 border border-gray-200 rounded-brand p-5 flex items-center justify-between shadow-xs">
                <div className="space-y-2">
                  <Skeleton className="h-3 w-48" />
                  <Skeleton className="h-3 w-32" />
                </div>
                <div className="flex items-center gap-4">
                  <Skeleton className="h-6 w-12" />
                  <Skeleton className="h-2.5 w-32 sm:w-48 rounded-full" />
                </div>
              </div>
              
              <div className="flex-1 border border-gray-200 rounded-brand overflow-hidden flex flex-col">
                <Skeleton className="h-10 w-full rounded-none" />
                <div className="divide-y divide-gray-100 flex-1">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div key={i} className="p-4 flex items-center justify-between">
                      <div className="flex-1 grid grid-cols-1 lg:grid-cols-5 gap-4">
                        <div className="space-y-2">
                          <Skeleton className="h-4 w-24" />
                          <Skeleton className="h-3 w-32" />
                        </div>
                        <div className="hidden lg:block space-y-2">
                          <Skeleton className="h-4 w-20" />
                        </div>
                        <div className="hidden lg:block">
                          <Skeleton className="h-6 w-20 rounded-full" />
                        </div>
                        <div className="hidden lg:block space-y-2">
                          <Skeleton className="h-3 w-24" />
                          <Skeleton className="h-3 w-16" />
                        </div>
                        <div className="hidden lg:block space-y-2">
                          <Skeleton className="h-4 w-24" />
                        </div>
                      </div>
                      <div className="flex gap-2 ml-4">
                        <Skeleton className="h-9 w-16 rounded-brand" />
                        <Skeleton className="h-9 w-16 rounded-brand" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : docsError ? (
            <Empty className="h-[320px] flex flex-col items-center justify-center text-center text-gray-500 border-0">
              <EmptyHeader className="flex flex-col items-center gap-0">
                <EmptyMedia className="w-16 h-16 rounded-full bg-white border border-gray-200 flex items-center justify-center mb-4 shadow-sm">
                  <i className="ph-duotone ph-warning-circle text-3xl text-pup-maroon" />
                </EmptyMedia>
                <EmptyTitle className="text-lg font-bold text-gray-900">Could not load report</EmptyTitle>
                <EmptyDescription className="text-sm font-medium text-gray-600 mt-1 max-w-md">
                  {docsError}
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <>
              {isSingleStudentView && (
                <div className="mb-4 bg-gray-50/80 border border-gray-200 rounded-brand p-5 flex items-center justify-between shadow-xs">
                  <div>
                    <h3 className="text-sm font-black text-gray-900 uppercase tracking-wide">Archive Completeness • {docsRows[0].student_name || docsRows[0].student_no}</h3>
                    <p className="text-xs font-medium text-gray-500 mt-1">
                      {compUploaded} out of {compTotal} required document types uploaded.
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className={`text-xl font-black ${compPercent >= 100 ? "text-emerald-600" : compPercent >= 50 ? "text-amber-600" : "text-red-600"}`}>
                      {compPercent}%
                    </span>
                    <div className="w-32 sm:w-48 h-2.5 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-500 ${compPercent >= 100 ? "bg-emerald-500" : compPercent >= 50 ? "bg-amber-500" : "bg-red-500"}`}
                        style={{ width: `${compPercent}%` }}
                      />
                    </div>
                  </div>
                </div>
              )}
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
                    {!(
                      docsForm.studentNo.trim() ||
                      docsForm.studentName.trim() ||
                      docsForm.docType.trim()
                    ) ? (
                      <tr className="border-0 hover:bg-transparent">
                        <td colSpan={7} className="p-0 border-0">
                          <Empty className="h-[400px] flex flex-col items-center justify-center text-center text-gray-500 border-0">
                            <EmptyHeader className="flex flex-col items-center gap-0">
                              <EmptyMedia className="w-16 h-16 rounded-full bg-white border border-gray-200 flex items-center justify-center mb-4 shadow-sm">
                                <i className="ph-duotone ph-magnifying-glass text-3xl text-pup-maroon"></i>
                              </EmptyMedia>
                              <EmptyTitle className="text-lg font-bold text-gray-900">Search Documents</EmptyTitle>
                              <EmptyDescription className="text-sm font-medium text-gray-600 mt-1 max-w-md">
                                Enter a student number, name, or select a document
                                type to find related records.
                              </EmptyDescription>
                            </EmptyHeader>
                          </Empty>
                        </td>
                      </tr>
                    ) : docsRows.length === 0 ? (
                      <tr className="border-0 hover:bg-transparent">
                        <td colSpan={7} className="p-0 border-0">
                          <Empty className="h-[400px] flex flex-col items-center justify-center text-center text-gray-500 border-0">
                            <EmptyHeader className="flex flex-col items-center gap-0">
                              <EmptyMedia className="w-16 h-16 rounded-full bg-white border border-gray-200 flex items-center justify-center mb-4 shadow-sm">
                                <i className="ph-duotone ph-warning-circle text-3xl text-red-600"></i>
                              </EmptyMedia>
                              <EmptyTitle className="text-lg font-bold text-gray-900">No Results Found</EmptyTitle>
                              <EmptyDescription className="text-sm font-medium text-gray-600 mt-1 max-w-md">
                                We couldn&apos;t find any documents matching your
                                search criteria.
                              </EmptyDescription>
                            </EmptyHeader>
                          </Empty>
                        </td>
                      </tr>
                    ) : (
                      docsRows.map((r, idx) => (
                        <tr
                          key={r.id || idx}
                          className={`hover:bg-gray-50 ${
                            r.status === "uploaded"
                              ? r.verificationStatus === "unverified"
                                ? "bg-amber-50/50"
                                : "bg-green-50/40"
                                : "bg-red-50/40"
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
                              r.verificationStatus === "unverified" ? (
                                <span className="inline-flex items-center px-2 py-1 rounded-full bg-amber-50 text-amber-900 border border-amber-200 text-xs font-bold">
                                  Unverified
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2 py-1 rounded-full bg-green-50 text-green-800 border border-green-200 text-xs font-bold">
                                  Uploaded
                                </span>
                              )
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
                              <span className="text-xs text-gray-500 font-medium">
                                Not uploaded
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-gray-600 font-medium">
                            {formatPHDateTime(r.reviewDoc?.created_at)}
                          </td>
                          <td className="p-3">
                            <div className="flex justify-end flex-wrap gap-2">
                              {r.doc ? (
                                <>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() =>
                                      onPreviewDocument?.(
                                        r.doc_type,
                                        r.student_name || "",
                                        r.student_no,
                                        r.doc.id,
                                      )
                                    }
                                    className="px-3 font-bold text-xs border-gray-300 text-gray-700 hover:border-pup-maroon"
                                  >
                                    VIEW
                                  </Button>
                                  <Button
                                    size="sm"
                                    onClick={async () => {
                                      if (!r.doc?.id) return;
                                      setUpdateTargetId(r.doc.id);
                                      setUpdateStudentNo(
                                        String(r.student_no || ""),
                                      );
                                      setUpdateStudentName(
                                        String(r.student_name || ""),
                                      );
                                      setUpdateDocType(
                                        String(r.doc_type || ""),
                                      );
                                      setUpdateFile(null);
                                      setUpdatePromptOpen(true);
                                    }}
                                    className="px-3 bg-pup-maroon text-white font-bold text-xs hover:bg-red-900"
                                  >
                                    UPDATE
                                  </Button>
                                </>
                              ) : (
                                <span className="text-xs font-medium text-gray-400">
                                  No file — use Scan & Upload
                                </span>
                              )}
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
                  {docsForm.studentNo.trim() ||
                  docsForm.studentName.trim() ||
                  docsForm.docType.trim()
                    ? `Showing ${docsRows.length} documents`
                    : ""}
                </div>
              </div>
            </>
          )}
        </CardContent>
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
        <DialogContent className="sm:max-w-md p-0 overflow-hidden bg-white border border-gray-200 shadow-2xl rounded-brand">
          <DialogHeader className="p-6 border-b border-gray-100 bg-gray-50/50">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full border border-red-100 bg-red-50 text-pup-maroon shadow-sm flex items-center justify-center shrink-0">
                <i className="ph-duotone ph-pencil-line text-2xl"></i>
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-lg font-black tracking-tight text-gray-900">
                  Update Document File
                </DialogTitle>
                <DialogDescription className="text-sm font-medium mt-1 text-gray-600">
                  Replace the PDF with a clearer copy, then update metadata if
                  needed.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="p-6 space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase">
                Replacement PDF
              </label>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragActive(true);
                }}
                onDragLeave={() => setIsDragActive(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragActive(false);
                  handlePickedFile(e.dataTransfer?.files?.[0] || null);
                }}
                className={`w-full rounded-brand border-2 border-dashed px-4 py-6 text-left transition-colors ${
                  isDragActive
                    ? "border-pup-maroon bg-red-50/40"
                    : "border-gray-300 bg-white hover:border-pup-maroon/60"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-full border border-red-100 bg-red-50 text-pup-maroon flex items-center justify-center shrink-0">
                    <i className="ph-duotone ph-file-pdf text-xl"></i>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-gray-900">
                      Drag and drop a PDF here, or click to browse
                    </p>
                    <p className="mt-1 text-xs font-medium text-gray-600">
                      Use a cleaner scan so staff can view and print a better
                      copy.
                    </p>
                    <p className="mt-2 text-xs font-mono text-gray-700 truncate">
                      {updateFile
                        ? updateFile.name
                        : "No replacement file selected"}
                    </p>
                  </div>
                </div>
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={(e) => handlePickedFile(e.target.files?.[0] || null)}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase">
                Student Number
              </label>
              <Input
                className="bg-white border border-gray-300 rounded-brand text-sm px-4 py-2 focus:outline-none focus:ring-2 focus:ring-pup-maroon focus:border-pup-maroon transition-colors"
                value={updateStudentNo}
                onChange={(e) => setUpdateStudentNo(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase">
                Student Name
              </label>
              <Input
                className="bg-white border border-gray-300 rounded-brand text-sm px-4 py-2 focus:outline-none focus:ring-2 focus:ring-pup-maroon focus:border-pup-maroon transition-colors"
                value={updateStudentName}
                onChange={(e) => setUpdateStudentName(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase">
                Document Type
              </label>
              <select
                className="w-full h-10 bg-white border border-gray-300 rounded-brand text-sm px-4 py-2 focus:outline-none focus:ring-2 focus:ring-pup-maroon focus:border-pup-maroon transition-colors font-semibold"
                value={updateDocType}
                onChange={(e) => setUpdateDocType(e.target.value)}
              >
                {docTypes.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="p-4 border-t border-gray-100 bg-white flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setUpdatePromptOpen(false);
                setUpdateTargetId(null);
                setUpdateFile(null);
              }}
              className="px-4 font-bold text-sm border-gray-300 text-gray-700 hover:bg-gray-50 rounded-brand"
            >
              CANCEL
            </Button>
            <Button
              type="button"
              onClick={async () => {
                if (!updateTargetId) return;
                setUpdateSaving(true);
                try {
                  await updateDoc(updateTargetId, {
                    studentNo: String(updateStudentNo).trim(),
                    studentName: String(updateStudentName).trim(),
                    docType: String(updateDocType).trim(),
                    file: updateFile || undefined,
                  });
                  setUpdatePromptOpen(false);
                  setUpdateTargetId(null);
                  setUpdateFile(null);
                } finally {
                  setUpdateSaving(false);
                }
              }}
              disabled={updateSaving}
              className="px-4 bg-pup-maroon text-white font-bold text-sm hover:bg-red-900 disabled:opacity-60 disabled:cursor-not-allowed rounded-brand"
            >
              {updateSaving ? "SAVING..." : "SAVE CHANGES"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
