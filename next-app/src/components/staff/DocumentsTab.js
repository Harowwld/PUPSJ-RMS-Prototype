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
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatPHDateTime } from "@/lib/timeFormat";
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyMedia,
} from "@/components/ui/empty";
import ConfirmModal from "@/components/shared/ConfirmModal";
import PageHeader from "@/components/shared/PageHeader";
import { Select } from "@/components/ui/select"

export default function DocumentsTab({
  docsForm,
  setDocsForm,
  refreshDocuments,
  docTypes,
  courses,
  storageLayout,
  docsLoading,
  docsError,
  docsRows,
  updateDoc,
  onPreviewDocument,
  onUpdateStudent,
  onArchiveStudent,
  currentStudent,
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

  // Student Edit State
  const [editStudentOpen, setEditStudentOpen] = useState(false);
  const [editStudentSaving, setEditStudentSaving] = useState(false);
  const [editStudentForm, setEditStudentForm] = useState({
    name: "",
    courseCode: "",
    section: "",
    room: "",
    cabinet: "",
    drawer: "",
  });

  // Archive Student Confirmation
  const [confirmArchiveOpen, setConfirmArchiveOpen] = useState(false);

  // Storage Layout Helpers (Mirrors ScanUploadTab logic)
  const roomOptions = storageLayout?.rooms?.map((r) => r.id) || [];
  const coerceRoomId = (v) => {
    if (typeof v === "number") return v;
    const n = parseInt(String(v), 10);
    return Number.isFinite(n) ? n : null;
  };
  const getRoomDef = (roomIdRaw) => {
    const roomId = coerceRoomId(roomIdRaw);
    if (roomId == null) return null;
    return storageLayout?.rooms?.find((r) => r.id === roomId) || null;
  };
  const getCabinetsForRoom = (roomIdRaw) => getRoomDef(roomIdRaw)?.cabinets || [];
  const getDrawerIdsFor = (roomIdRaw, cabinetIdRaw) => {
    const roomDef = getRoomDef(roomIdRaw);
    const cabId = String(cabinetIdRaw ?? "").trim();
    if (!roomDef || !cabId) return [];
    const cab = roomDef.cabinets.find((c) => c.id === cabId);
    return cab?.drawerIds || [];
  };
  const mergeSelectedCabinetId = (roomIdRaw, cabIdRaw) => {
    const cabId = String(cabIdRaw || "").trim();
    const ids = getCabinetsForRoom(roomIdRaw).map((c) => c.id);
    if (cabId && !ids.includes(cabId)) return [cabId, ...ids];
    return ids;
  };
  const mergeSelectedDrawerId = (roomIdRaw, cabIdRaw, drawerRaw) => {
    const ids = getDrawerIdsFor(roomIdRaw, cabIdRaw);
    const selected = parseInt(String(drawerRaw || ""), 10);
    if (Number.isFinite(selected) && !ids.includes(selected)) return [selected, ...ids];
    return ids;
  };

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

  const openEditStudent = () => {
    if (!currentStudent) return;
    setEditStudentForm({
      name: currentStudent.name || "",
      courseCode: currentStudent.courseCode || currentStudent.course_code || "",
      section: currentStudent.section || "",
      room: currentStudent.room || "",
      cabinet: currentStudent.cabinet || "",
      drawer: currentStudent.drawer || "",
    });
    setEditStudentOpen(true);
  };

  return (
    <div
      id="view-documents"
      className="flex flex-col w-full h-full gap-4 animate-fade-up font-inter"
    >
      <Card className="flex flex-1 flex-col overflow-hidden rounded-brand border border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-card dark:shadow-none">
        <PageHeader
          icon="ph-files"
          title="Digital Archives Explorer"
          description="Browse and verify the university's digitized collection of student records."
        />

        <div className="p-4 bg-gray-50 flex-none border-b border-gray-200 dark:bg-white/5 dark:border-white/10">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-end">
            <div className="lg:col-span-1">
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-gray-700 uppercase dark:text-zinc-200">
                  Student No
                </label>
              </div>
              <Input
                className="h-10 font-mono bg-white border border-gray-300 rounded-brand text-sm px-4 py-2 focus:outline-none focus:ring-2 focus:ring-pup-maroon focus:border-gray-300 transition-colors dark:bg-card dark:focus:border-zinc-700 dark:border-white/10"
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
              <label className="block text-xs font-bold text-gray-700 mb-1 uppercase dark:text-zinc-200">
                Student Name
              </label>
              <Input
                className="h-10 bg-white border border-gray-300 rounded-brand text-sm px-4 py-2 focus:outline-none focus:ring-2 focus:ring-pup-maroon focus:border-gray-300 transition-colors dark:bg-card dark:focus:border-zinc-700 dark:border-white/10"
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
              <label className="block text-xs font-bold text-gray-700 mb-1 uppercase dark:text-zinc-200">
                Document Type
              </label>
              <Select
                className="w-full h-10 bg-white border border-gray-300 rounded-brand text-sm px-4 py-2 focus:outline-none focus:ring-2 focus:ring-pup-maroon focus:border-gray-300 transition-colors dark:bg-card dark:focus:border-zinc-700 dark:border-white/10"
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
              </Select>
            </div>
          </div>

          {docsError ? (
            <div className="mt-4 p-3 rounded-brand bg-red-50 border border-red-200 text-sm text-red-800 font-medium dark:bg-red-950/30">
              {docsError}
            </div>
          ) : null}
        </div>

        {/* Active Filter Chips Row */}
        {(docsForm.studentNo !== "" || docsForm.studentName !== "" || docsForm.docType !== "") && (
          <div className="flex-none border-b border-gray-100 bg-white px-4 py-3 animate-in fade-in slide-in-from-top-1 duration-300 dark:border-white/10 dark:bg-card">
            <div className="flex flex-wrap items-center gap-2">
              <span className="mr-1 text-[10px] font-bold tracking-widest text-gray-400 uppercase dark:text-zinc-500">Active Filters:</span>
              {docsForm.studentNo && (
                <div className="flex items-center gap-1 rounded-full border border-gray-300 bg-pup-maroon/10 px-2.5 py-1 text-[10px] font-bold text-pup-maroon dark:text-primary uppercase dark:border-white/10 dark:text-primary">
                  ID: {docsForm.studentNo}
                  <button
                    onClick={() => {
                        const next = { ...docsForm, studentNo: "" };
                        setDocsForm(next);
                        refreshDocuments(next);
                    }}
                    className="ml-1 hover:text-pup-darkMaroon transition-colors"
                  >
                    <i className="ph-bold ph-x text-[8px]"></i>
                  </button>
                </div>
              )}
              {docsForm.studentName && (
                <div className="flex items-center gap-1 rounded-full border border-blue-100/30 bg-blue-50 px-2.5 py-1 text-[10px] font-bold text-blue-600 uppercase dark:bg-blue-950/30 dark:text-blue-400">
                  Name: {docsForm.studentName}
                  <button
                    onClick={() => {
                        const next = { ...docsForm, studentName: "" };
                        setDocsForm(next);
                        refreshDocuments(next);
                    }}
                    className="ml-1 hover:text-blue-800 transition-colors"
                  >
                    <i className="ph-bold ph-x text-[8px]"></i>
                  </button>
                </div>
              )}
              {docsForm.docType && (
                <div className="flex items-center gap-1 rounded-full border border-amber-100/30 bg-amber-50 px-2.5 py-1 text-[10px] font-bold text-amber-600 uppercase dark:bg-amber-950/30 dark:text-amber-400">
                  Type: {docsForm.docType}
                  <button
                    onClick={() => {
                        const next = { ...docsForm, docType: "" };
                        setDocsForm(next);
                        refreshDocuments(next);
                    }}
                    className="ml-1 hover:text-amber-800 transition-colors"
                  >
                    <i className="ph-bold ph-x text-[8px]"></i>
                  </button>
                </div>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  const cleared = { studentNo: "", studentName: "", docType: "" };
                  setDocsForm(cleared);
                  refreshDocuments(cleared);
                }}
                className="h-6 rounded-full border border-dashed border-gray-300 px-3 text-[10px] font-black text-pup-maroon dark:text-primary hover:bg-red-50 hover:text-pup-darkMaroon uppercase dark:border-white/10 dark:text-primary dark:bg-red-950/30"
              >
                CLEAR ALL FILTERS
              </Button>
            </div>
          </div>
        )}

        <CardContent className="p-6 flex-1 flex flex-col min-h-0">
          {docsLoading ? (
            <div className="flex-1 flex flex-col space-y-4">
              <div className="bg-gray-50 border border-gray-200 rounded-brand p-5 flex items-center justify-between shadow-xs dark:bg-muted/30 dark:border-white/10">
                <div className="space-y-2">
                  <Skeleton className="h-3 w-48 dark:bg-muted" />
                  <Skeleton className="h-3 w-32 dark:bg-muted" />
                </div>
                <div className="flex items-center gap-4">
                  <Skeleton className="h-6 w-12 dark:bg-muted" />
                  <Skeleton className="h-2.5 w-32 sm:w-48 rounded-full dark:bg-muted" />
                </div>
              </div>

              <div className="flex-1 border border-gray-200 rounded-brand overflow-hidden flex flex-col dark:border-white/10">
                <Skeleton className="h-10 w-full rounded-none dark:bg-muted" />
                <div className="divide-y divide-gray-100 dark:divide-white/10 flex-1">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div key={i} className="p-4 flex items-center justify-between">
                      <div className="flex-1 grid grid-cols-1 lg:grid-cols-5 gap-4">
                        <div className="space-y-2">
                          <Skeleton className="h-4 w-24 dark:bg-muted" />
                          <Skeleton className="h-3 w-32 dark:bg-muted" />
                        </div>
                        <div className="hidden lg:block space-y-2">
                          <Skeleton className="h-4 w-20 dark:bg-muted" />
                        </div>
                        <div className="hidden lg:block">
                          <Skeleton className="h-6 w-20 rounded-full dark:bg-muted" />
                        </div>
                        <div className="hidden lg:block space-y-2">
                          <Skeleton className="h-3 w-24 dark:bg-muted" />
                          <Skeleton className="h-3 w-16 dark:bg-muted" />
                        </div>
                        <div className="hidden lg:block space-y-2">
                          <Skeleton className="h-4 w-24 dark:bg-muted" />
                        </div>
                      </div>
                      <div className="flex gap-2 ml-4">
                        <Skeleton className="h-9 w-16 rounded-brand dark:bg-muted" />
                        <Skeleton className="h-9 w-16 rounded-brand dark:bg-muted" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : docsError ? (
            <Empty className="h-[320px] flex flex-col items-center justify-center text-center text-gray-500 border-0 dark:text-zinc-400">
              <EmptyHeader className="flex flex-col items-center gap-0">
                <EmptyMedia className="w-16 h-16 rounded-full bg-white border border-gray-200 flex items-center justify-center mb-4 shadow-sm dark:bg-card dark:border-white/10 dark:shadow-none">
                  <i className="ph-duotone ph-warning-circle text-3xl text-pup-maroon dark:text-primary dark:text-primary" />
                </EmptyMedia>
                <EmptyTitle className="text-lg font-bold text-gray-900 dark:text-zinc-50">Could not load report</EmptyTitle>
                <EmptyDescription className="text-sm font-medium text-gray-600 mt-1 max-w-md dark:text-zinc-300">
                  {docsError}
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <>
              {isSingleStudentView && (
                <div className="mb-4 bg-gray-50 border border-gray-200 rounded-brand p-5 flex items-center justify-between shadow-xs dark:bg-muted/30 dark:border-white/10">
                  <div>
                    <h3 className="text-sm font-black text-gray-900 uppercase tracking-wide dark:text-zinc-50">Archive Completeness • {docsRows[0].student_name || docsRows[0].student_no}</h3>
                    <p className="text-xs font-medium text-gray-500 mt-1 dark:text-zinc-400">
                      {compUploaded} out of {compTotal} required document types uploaded.
                    </p>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-4">
                      <span className={`text-xl font-black ${compPercent >= 100 ? "text-emerald-600" : compPercent >= 50 ? "text-amber-600" : "text-red-600"} dark:text-emerald-400`}>
                        {compPercent}%
                      </span>
                      <div className="w-32 sm:w-48 h-2.5 bg-gray-200 rounded-full overflow-hidden dark:bg-zinc-700">
                        <div
                          className={`h-full transition-all duration-500 ${compPercent >= 100 ? "bg-emerald-500" : compPercent >= 50 ? "bg-amber-500" : "bg-red-500"}`}
                          style={{ width: `${compPercent}%` }}
                        />
                      </div>
                    </div>
                    <Button
                      onClick={openEditStudent}
                      className="bg-white border border-gray-300 text-gray-700 hover:text-pup-maroon dark:hover:text-red-500 hover:border-gray-300 font-bold text-xs px-4 h-9 shadow-sm dark:bg-card dark:text-zinc-200 dark:hover:border-zinc-700 dark:shadow-none dark:border-white/10"
                    >
                      <i className="ph-bold ph-user-circle-gear mr-2 text-sm"></i>
                      MANAGE PROFILE
                    </Button>
                  </div>
                </div>
              )}
              <div 
                key={`${docsForm.studentNo}-${docsForm.docType}`}
                className="flex-1 overflow-y-auto overflow-x-auto border border-gray-200 rounded-brand animate-fade-up dark:border-white/10"
              >
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10 dark:bg-zinc-900 dark:border-white/10">
                    <tr className="text-left text-xs uppercase tracking-wider text-gray-600 dark:text-zinc-300 dark:border-white/10">
                      <th className="p-3 font-bold">Student No</th>
                      <th className="p-3 font-bold">Name</th>
                      <th className="p-3 font-bold">Type</th>
                      <th className="p-3 font-bold">Status</th>
                      <th className="p-3 font-bold">File</th>
                      <th className="p-3 font-bold">Created</th>
                      <th className="p-3 font-bold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-white/10">
                    {!(
                      docsForm.studentNo.trim() ||
                      docsForm.studentName.trim() ||
                      docsForm.docType.trim()
                    ) ? (
                      <tr className="border-0 hover:bg-transparent">
                        <td colSpan={7} className="p-0 border-0">
                          <Empty className="h-[400px] flex flex-col items-center justify-center text-center text-gray-500 border-0 dark:text-zinc-400">
                            <EmptyHeader className="flex flex-col items-center gap-0">
                              <EmptyMedia className="w-16 h-16 rounded-full bg-white border border-gray-200 flex items-center justify-center mb-4 shadow-sm dark:bg-card dark:border-white/10 dark:shadow-none">
                                <i className="ph-duotone ph-magnifying-glass text-3xl text-pup-maroon dark:text-primary dark:text-primary"></i>
                              </EmptyMedia>
                              <EmptyTitle className="text-lg font-bold text-gray-900 dark:text-zinc-50">Search Documents</EmptyTitle>
                              <EmptyDescription className="text-sm font-medium text-gray-600 mt-1 max-w-md dark:text-zinc-300">
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
                          <Empty className="h-[400px] flex flex-col items-center justify-center text-center text-gray-500 border-0 dark:text-zinc-400">
                            <EmptyHeader className="flex flex-col items-center gap-0">
                              <EmptyMedia className="w-16 h-16 rounded-full bg-white border border-gray-200 flex items-center justify-center mb-4 shadow-sm dark:bg-card dark:border-white/10 dark:shadow-none">
                                <i className="ph-duotone ph-warning-circle text-3xl text-red-600"></i>
                              </EmptyMedia>
                              <EmptyTitle className="text-lg font-bold text-gray-900 dark:text-zinc-50">No Results Found</EmptyTitle>
                              <EmptyDescription className="text-sm font-medium text-gray-600 mt-1 max-w-md dark:text-zinc-300">
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
                          className={`hover:bg-gray-50 ${ r.status === "uploaded" ? (r.verificationStatus === "unverified" ? "bg-amber-50" : "bg-green-50/40") : "bg-red-50" } dark:hover:bg-white/10 dark:bg-card`}
                        >
                          <td className="p-3 font-mono font-bold text-gray-900 dark:text-zinc-50">
                            {r.student_no}
                          </td>
                          <td className="p-3 text-gray-800 font-medium dark:text-zinc-100">
                            {r.student_name || "—"}
                          </td>
                          <td className="p-3">
                            <span className="inline-flex items-center px-2 py-1 rounded-full bg-red-50 text-pup-maroon dark:text-primary border border-red-100 text-xs font-bold dark:bg-red-950/30 dark:text-primary">
                              {r.doc_type}
                            </span>
                          </td>
                          <td className="p-3">
                            {r.status === "uploaded" ? (
                              r.verificationStatus === "unverified" ? (
                                <span className="inline-flex items-center px-2 py-1 rounded-full bg-amber-50 text-amber-900 border border-amber-200 text-xs font-bold dark:bg-amber-950/30">
                                  Unverified
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2 py-1 rounded-full bg-green-50 text-green-800 border border-green-200 text-xs font-bold">
                                  Uploaded
                                </span>
                              )
                            ) : (
                              <span className="inline-flex items-center px-2 py-1 rounded-full bg-red-50 text-red-800 border border-red-200 text-xs font-bold dark:bg-red-950/30">
                                Missing
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-gray-700 max-w-[180px] dark:text-zinc-200">
                            {r.doc ? (
                              <>
                                <div className="truncate font-medium text-gray-900 dark:text-zinc-50" title={r.doc.original_filename}>
                                  {r.doc.original_filename}
                                </div>
                                <div className="text-xs text-gray-500 font-mono dark:text-zinc-400">
                                  {(r.doc.size_bytes / 1024).toFixed(1)} KB
                                </div>
                              </>
                            ) : (
                              <span className="text-xs font-medium text-gray-400 dark:text-zinc-500">
                                Not uploaded
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-gray-600 font-medium dark:text-zinc-300">
                            {formatPHDateTime(r.reviewDoc?.created_at)}
                          </td>
                          <td className="p-3 whitespace-nowrap text-right">
                            <div className="flex justify-end gap-2">
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
                                    className="px-3 font-bold text-xs border-gray-300 text-gray-700 hover:border-gray-300 transition-all dark:text-zinc-200 dark:hover:border-zinc-700 dark:border-white/10"
                                  >
                                    <i className="ph-bold ph-eye mr-1.5"></i>
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
                                    className="px-3 bg-linear-to-b from-red-800 to-pup-maroon border-4 border-pup-darkMaroon hover:from-red-700 hover:to-red-900 hover:shadow-md text-white font-bold text-xs transition-all dark:shadow-none"
                                  >
                                    <i className="ph-bold ph-pencil-simple-line mr-1.5"></i>
                                    UPDATE
                                  </Button>
                                </>
                              ) : (
                                <span className="text-xs font-medium text-gray-400 dark:text-zinc-500">
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
                <div className="text-[11px] font-black text-gray-400 uppercase tracking-widest dark:text-zinc-500">
                  {docsForm.studentNo.trim() ||
                  docsForm.studentName.trim() ||
                  docsForm.docType.trim() ? (
                    <span>
                      <strong className="text-gray-900 dark:text-zinc-50">{docsRows.length}</strong> Documents Found
                    </span>
                  ) : (
                    ""
                  )}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* DOCUMENT UPDATE MODAL */}
      <Dialog
        open={updatePromptOpen}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setUpdatePromptOpen(false);
            setUpdateTargetId(null);
            setUpdateFile(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-md p-0 overflow-hidden bg-white border border-gray-200 shadow-2xl rounded-brand dark:bg-card dark:border-white/10">
          <DialogHeader className="p-6 border-b border-gray-100 bg-gray-50 dark:border-white/10 dark:bg-white/5">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full border border-red-100 bg-red-50 text-pup-maroon dark:text-primary shadow-sm flex items-center justify-center shrink-0 dark:bg-red-950/30 dark:text-primary dark:shadow-none">
                <i className="ph-duotone ph-pencil-line text-2xl"></i>
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-lg font-black tracking-tight text-gray-900 leading-tight dark:text-zinc-50">
                  Update Document File
                </DialogTitle>
                <DialogDescription className="text-sm font-medium mt-1.5 text-gray-600 leading-relaxed dark:text-zinc-300">
                  Replace the PDF with a clearer scan for this record.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="p-6 space-y-5">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide dark:text-zinc-200">
                Target Student
              </label>
              <Input
                disabled
                className="bg-gray-100 font-mono text-gray-500 border-gray-200 cursor-not-allowed h-11 dark:text-zinc-400 dark:border-white/10 dark:bg-muted"
                value={updateStudentNo}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide dark:text-zinc-200">
                Replacement PDF <span className="text-pup-maroon dark:text-primary dark:text-primary">*</span>
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
                className={`w-full rounded-brand border-2 border-dashed px-4 py-6 text-left transition-colors ${ isDragActive ? "border-gray-300 bg-red-50" : "bg-white hover:border-gray-300" } dark:border-white/10 dark:bg-red-950/40 dark:hover:border-zinc-700`}
              >
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-full border border-red-100 bg-red-50 text-pup-maroon dark:text-primary flex items-center justify-center shrink-0 dark:bg-red-950/30 dark:text-primary">
                    <i className="ph-duotone ph-file-pdf text-xl"></i>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-gray-900 dark:text-zinc-50">
                      Click to browse or drop replacement
                    </p>
                    <p className="mt-1 text-xs font-medium text-gray-600 dark:text-zinc-300">
                      New scan will overwrite the existing file for {updateDocType}.
                    </p>
                    <p className="mt-2 text-xs font-mono text-pup-maroon dark:text-primary font-bold truncate dark:text-primary">
                      {updateFile
                        ? updateFile.name
                        : "No replacement selected"}
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
          </div>

          <div className="p-4 border-t border-gray-100 bg-white flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5 dark:border-white/10 dark:bg-card">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setUpdatePromptOpen(false);
                setUpdateTargetId(null);
                setUpdateFile(null);
              }}
              className="h-11 px-6 text-sm font-bold border-gray-300 text-gray-700 hover:bg-gray-50 rounded-brand dark:text-zinc-200 dark:hover:bg-white/10 dark:bg-card dark:border-white/10"
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
              disabled={updateSaving || !updateFile}
              className="h-11 px-6 bg-linear-to-b from-red-800 to-pup-maroon border-4 border-pup-darkMaroon hover:from-red-700 hover:to-red-900 hover:shadow-md transition-all text-white shadow-sm font-bold flex items-center gap-2 rounded-brand dark:shadow-none"
            >
              <i className="ph-bold ph-check text-lg"></i>
              {updateSaving ? "SAVING..." : "SAVE CHANGES"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* STUDENT PROFILE EDIT MODAL */}
      <Dialog open={editStudentOpen} onOpenChange={setEditStudentOpen}>
        <DialogContent className="sm:max-w-2xl p-0 overflow-hidden bg-white border border-gray-200 shadow-2xl rounded-brand dark:bg-card dark:border-white/10">
          <DialogHeader className="p-6 border-b border-gray-100 bg-gray-50 dark:border-white/10 dark:bg-white/5">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full border border-red-100 bg-red-50 text-pup-maroon dark:text-primary shadow-sm flex items-center justify-center shrink-0 dark:bg-red-950/30 dark:text-primary dark:shadow-none">
                <i className="ph-duotone ph-user-circle-gear text-2xl"></i>
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-lg font-black tracking-tight text-gray-900 leading-tight dark:text-zinc-50">
                  Manage Student Profile
                </DialogTitle>
                <DialogDescription className="text-sm font-medium mt-1.5 text-gray-600 leading-relaxed dark:text-zinc-300">
                  Update student metadata and physical storage location records.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h4 className="text-[11px] font-bold text-gray-500 uppercase tracking-widest border-b border-gray-100 pb-1 dark:text-zinc-400 dark:border-white/10">Identification</h4>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide dark:text-zinc-200">Student Number</label>
                <Input disabled value={currentStudent?.studentNo} className="bg-gray-100 font-mono text-gray-500 border-gray-200 cursor-not-allowed dark:text-zinc-400 dark:border-white/10 dark:bg-muted" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide dark:text-zinc-200">Full Name <span className="text-pup-maroon dark:text-primary dark:text-primary">*</span></label>
                <Input
                  value={editStudentForm.name}
                  onChange={e => setEditStudentForm(p => ({ ...p, name: e.target.value.toUpperCase() }))}
                  placeholder="LAST NAME, FIRST NAME"
                  className="h-11 bg-white border border-gray-300 rounded-brand text-sm focus-visible:ring-pup-maroon focus-visible:border-gray-300 dark:bg-card dark:border-white/10"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide dark:text-zinc-200">Degree Program <span className="text-pup-maroon dark:text-primary dark:text-primary">*</span></label>
                <Select
                  className="h-12 w-full rounded-brand border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-900 shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-pup-maroon focus:border-gray-300 dark:bg-card dark:text-zinc-50 dark:shadow-none dark:focus:border-zinc-700 dark:border-white/10"
                  value={editStudentForm.courseCode}
                  onChange={e => setEditStudentForm(p => ({ ...p, courseCode: e.target.value }))}
                  required
                >
                  <option value="" disabled>Select Program...</option>
                  {courses.map(c => <option key={c.code} value={c.code}>{c.code} - {c.name}</option>)}
                </Select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide dark:text-zinc-200">Section <span className="text-pup-maroon dark:text-primary dark:text-primary">*</span></label>
                <Input
                  value={editStudentForm.section}
                  onChange={e => setEditStudentForm(p => ({ ...p, section: e.target.value }))}
                  className="h-11 bg-white border border-gray-300 rounded-brand text-sm focus-visible:ring-pup-maroon focus-visible:border-gray-300 dark:bg-card dark:border-white/10"
                  required
                />
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-[11px] font-bold text-gray-500 uppercase tracking-widest border-b border-gray-100 pb-1 dark:text-zinc-400 dark:border-white/10">Physical Location</h4>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide dark:text-zinc-200">Room Number <span className="text-pup-maroon dark:text-primary dark:text-primary">*</span></label>
                <Select
                  className="h-12 w-full rounded-brand border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-900 shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-pup-maroon focus:border-gray-300 dark:bg-card dark:text-zinc-50 dark:shadow-none dark:focus:border-zinc-700 dark:border-white/10"
                  value={String(editStudentForm.room || "")}
                  onChange={(e) => {
                    const nextRoom = e.target.value ? parseInt(e.target.value, 10) : "";
                    setEditStudentForm((p) => ({ ...p, room: nextRoom, cabinet: "", drawer: "" }));
                  }}
                  required
                >
                  <option value="" disabled>Select Room...</option>
                  {roomOptions.map((r) => (
                    <option key={r} value={r}>Room {r}</option>
                  ))}
                </Select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide dark:text-zinc-200">Cabinet ID <span className="text-pup-maroon dark:text-primary dark:text-primary">*</span></label>
                <Select
                  className="h-12 w-full rounded-brand border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-900 shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-pup-maroon focus:border-gray-300 dark:bg-card dark:text-zinc-50 dark:shadow-none dark:focus:border-zinc-700 dark:border-white/10"
                  value={editStudentForm.cabinet}
                  onChange={(e) => setEditStudentForm((p) => ({ ...p, cabinet: e.target.value, drawer: "" }))}
                  disabled={!editStudentForm.room}
                  required
                >
                  <option value="" disabled>Select Cabinet...</option>
                  {mergeSelectedCabinetId(editStudentForm.room, editStudentForm.cabinet).map((c) => (
                    <option key={c} value={c}>Cabinet {c}</option>
                  ))}
                </Select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide dark:text-zinc-200">Drawer Number <span className="text-pup-maroon dark:text-primary dark:text-primary">*</span></label>
                <Select
                  className="h-12 w-full rounded-brand border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-900 shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-pup-maroon focus:border-gray-300 dark:bg-card dark:text-zinc-50 dark:shadow-none dark:focus:border-zinc-700 dark:border-white/10"
                  value={String(editStudentForm.drawer || "")}
                  onChange={(e) => setEditStudentForm((p) => ({ ...p, drawer: e.target.value }))}
                  disabled={!editStudentForm.cabinet}
                  required
                >
                  <option value="" disabled>Select Drawer...</option>
                  {mergeSelectedDrawerId(editStudentForm.room, editStudentForm.cabinet, editStudentForm.drawer).map((d) => (
                    <option key={d} value={d}>Drawer {d}</option>
                  ))}
                </Select>
              </div>

              <div className="pt-4">
                <div className="bg-red-50 border border-red-100 rounded-xl p-4 dark:bg-red-950/30">
                  <div className="flex gap-3">
                    <i className="ph-duotone ph-warning-circle text-xl text-red-600 shrink-0"></i>
                    <div>
                      <p className="text-xs font-bold text-red-900 uppercase tracking-tight">Archive Record</p>
                      <p className="text-[11px] text-red-700 mt-1 leading-relaxed">
                        Soft-deleting this student will hide their profile and all documents from active search results.
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setConfirmArchiveOpen(true)}
                        className="mt-3 w-full bg-white border border-red-200 text-red-600 hover:bg-red-50 text-[10px] font-black h-9 shadow-xs rounded-brand dark:bg-card"
                      >
                        <i className="ph-bold ph-archive mr-2"></i>
                        ARCHIVE STUDENT RECORD
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 border-t border-gray-100 bg-white flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5 dark:border-white/10 dark:bg-card">
            <Button
              type="button"
              variant="outline"
              onClick={() => setEditStudentOpen(false)}
              className="h-11 px-6 text-sm font-bold border-gray-300 text-gray-700 hover:bg-gray-50 rounded-brand dark:text-zinc-200 dark:hover:bg-white/10 dark:bg-card dark:border-white/10"
            >
              CANCEL
            </Button>
            <Button
              type="button"
              onClick={async () => {
                setEditStudentSaving(true);
                try {
                  await onUpdateStudent(currentStudent.studentNo, editStudentForm);
                  setEditStudentOpen(false);
                } finally {
                  setEditStudentSaving(false);
                }
              }}
              disabled={editStudentSaving}
              className="h-11 px-6 bg-linear-to-b from-red-800 to-pup-maroon border-4 border-pup-darkMaroon hover:from-red-700 hover:to-red-900 hover:shadow-md transition-all text-white shadow-sm font-bold flex items-center gap-2 rounded-brand dark:shadow-none"
            >
              <i className="ph-bold ph-check text-lg"></i>
              {editStudentSaving ? "SAVING..." : "SAVE PROFILE"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmModal
        open={confirmArchiveOpen}
        onCancel={() => setConfirmArchiveOpen(false)}
        title="Archive Student Record"
        message={`Are you sure you want to archive student ${currentStudent?.studentNo}? This will hide all their documents from the system.`}
        confirmLabel="Archive"
        variant="danger"
        onConfirm={async () => {
          setConfirmArchiveOpen(false);
          setEditStudentOpen(false);
          await onArchiveStudent(currentStudent.studentNo);
        }}
      />
    </div>
  );
}


