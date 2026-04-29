"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { useHotFolderInbox } from "@/hooks/useHotFolderInbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ConfirmModal from "@/components/shared/ConfirmModal";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyMedia,
} from "@/components/ui/empty";

export default function ScanUploadTab({
  loading,
  error = null,
  uploadMode,
  uploadStudentIsExisting,
  setUploadStudentIsExisting,
  setUploadMode,
  dropActive,
  setDropActive,
  uploadedFile,
  fileInputRef,
  onFileSelect,
  onClearFile,
  ocrLoading,
  ocrError,
  csvFile,
  csvRows,
  csvSelected,
  toggleCsvSelectAll,
  toggleCsvRowSelected,
  setCsvRowField,
  storageLayout,
  courses,
  docTypes,
  processSubmission,
  uploadFieldErrors = {},
  clearUploadFieldError,
  clearAllUploadFieldErrors,
  uploadError,
  newRec,
  setNewRec,
  newRecStudentNoHint,
  setNewRecStudentNoTouched,
  applyStudentNoMask,
  newStudentNoInputRef,
  sysSections = [],
  csvInputRef,
  handleCsvFileSelect,
  csvDropActive,
  setCsvDropActive,
  csvError,
  csvBulkRoom,
  setCsvBulkRoom,
  csvBulkCabinet,
  setCsvBulkCabinet,
  csvBulkDrawer,
  setCsvBulkDrawer,
  applyCsvBulkLocation,
  setCsvSelected,
  importCsvStudents,
  csvLoading,
  csvResults,
  students = [],
  showToast = () => {},
  onIngestPromoted,
  onSelectExistingStudent,
}) {
  const [clearInboxOpen, setClearInboxOpen] = useState(false);
  const fe = uploadFieldErrors || {};
  const ring = (key) => (fe[key] ? "ring-2 ring-orange-400 border-orange-400" : "");

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

  const deriveYearFromStudentNo = (studentNoRaw) => {
    const raw = String(studentNoRaw || "").trim();
    const yearPart = raw.split("-")[0];
    const year = Number(yearPart);
    if (!Number.isFinite(year) || year < 2000 || year > 2100) return "";
    return String(year);
  };

  /** When linking to an existing student, only room / cabinet / drawer / doc type may change. */
  const lockIdentity = uploadStudentIsExisting;
  const lockedField =
    "!bg-gray-200 !text-gray-500 !border-gray-300 cursor-not-allowed placeholder:!text-gray-400 focus:!border-gray-300 focus:!shadow-none focus:!ring-0";
  const lockedLabel = "text-gray-400";

  const hf = useHotFolderInbox({
    enabled: uploadMode === "pdf",
    students,
    docTypes,
    showToast,
    onPromoted: onIngestPromoted,
    onOcrResult: (suggestion) => {
      if (!suggestion) return;
      // Always set the docType from OCR regardless of student match
      const ocrDocType = suggestion.docType && String(suggestion.docType).trim()
        ? String(suggestion.docType).trim()
        : "";
      if (suggestion.matchedStudent) {
        // Existing student matched — lock the form fields to their record.
        onSelectExistingStudent?.(suggestion.matchedStudent, ocrDocType);
      } else {
        // No match — only fill in the name/docType, leave form unlocked for manual entry.
        setNewRec?.((p) => ({
          ...p,
          name: suggestion.name
            ? String(suggestion.name).trim().replace(/\s+/g, " ").toUpperCase()
            : p.name,
          docType: ocrDocType || p.docType,
        }));
      }
    },
  });

  const handlePdfFileSelect = (file) => {
    if (!file) return;
    hf.clearIngestSelection();
    onFileSelect(file);
  };

  const handleClearPdf = () => {
    hf.clearIngestSelection();
    onClearFile();
  };

  const onPdfDrop = (e) => {
    e.preventDefault();
    setDropActive(false);
    const f = e.dataTransfer.files?.[0];
    if (!f) return;
    const isPdf = f.type === "application/pdf" || String(f.name || "").toLowerCase().endsWith(".pdf");
    const isImg = String(f.type || "").startsWith("image/");
    if (!isPdf && !isImg) {
      return;
    }
    handlePdfFileSelect(f);
  };

  const normalizedTypedName = String(newRec?.name || "")
    .trim()
    .toLowerCase();
  const nameSuggestions = useMemo(() => {
    if (!normalizedTypedName || normalizedTypedName.length < 2 || lockIdentity) return [];
    const terms = normalizedTypedName.split(/\s+/).filter(Boolean);
    const ranked = students
      .map((s) => {
        const name = String(s?.name || "");
        const nameLower = name.toLowerCase();
        const studentNo = String(s?.studentNo || s?.student_no || "");
        const allTermsHit = terms.every((t) => nameLower.includes(t));
        if (!allTermsHit) return null;
        const startsWith = nameLower.startsWith(normalizedTypedName) ? 1 : 0;
        return { student: s, score: startsWith };
      })
      .filter(Boolean)
      .sort((a, b) => b.score - a.score)
      .slice(0, 6)
      .map((x) => x.student);
    return ranked;
  }, [students, normalizedTypedName, lockIdentity]);

  return (
    <div id="view-upload" className="flex flex-col w-full h-full min-h-0 gap-4 animate-fade-in font-inter">
      {loading ? (
        <div className="flex-1 min-h-0 flex flex-col gap-4">
          <div className="shrink-0 flex items-center justify-between">
            <div className="inline-flex p-1 bg-gray-100/80 rounded-brand border border-gray-200/50 backdrop-blur-sm gap-1">
              <Skeleton className="h-9 w-32 rounded-brand" />
              <Skeleton className="h-9 w-32 rounded-brand" />
            </div>
          </div>
          
          <div className="flex flex-col lg:flex-row flex-1 min-h-0 gap-4">
            <div className="w-full lg:w-[48%] bg-white rounded-brand border border-gray-300 p-8 flex flex-col items-center justify-center gap-4 shadow-sm">
              <Skeleton className="w-20 h-20 rounded-full" />
              <div className="space-y-2 flex flex-col items-center">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-64" />
              </div>
            </div>
            
            <div className="w-full lg:w-[52%] bg-white rounded-brand border border-gray-300 flex flex-col overflow-hidden shadow-sm">
              <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex items-center gap-4">
                <Skeleton className="w-12 h-12 rounded-brand" />
                <div className="space-y-2">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-3 w-48" />
                </div>
              </div>
              <div className="p-6 space-y-6 bg-gray-50/30 flex-1">
                <div className="space-y-2">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-11 w-full rounded-brand" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-11 w-full rounded-brand" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-11 w-full rounded-brand" />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <Skeleton className="h-11 rounded-brand" />
                  <Skeleton className="h-11 rounded-brand" />
                  <Skeleton className="h-11 rounded-brand" />
                </div>
                <Skeleton className="h-11 w-full rounded-brand mt-4" />
              </div>
            </div>
          </div>
        </div>
      ) : error ? (
        <div className="flex-1 bg-white rounded-brand border border-gray-200 shadow-sm overflow-hidden flex flex-col">
          <div className="p-6 flex-1 flex flex-col min-h-0 items-center justify-center">
            <Empty className="h-[320px] flex flex-col items-center justify-center text-center text-gray-500 border-0">
              <EmptyHeader className="flex flex-col items-center gap-0">
                <EmptyMedia className="w-16 h-16 rounded-full bg-white border border-gray-200 flex items-center justify-center mb-4 shadow-sm">
                  <i className="ph-duotone ph-warning-circle text-3xl text-pup-maroon" />
                </EmptyMedia>
                <EmptyTitle className="text-lg font-bold text-gray-900">Could not load tab</EmptyTitle>
                <EmptyDescription className="text-sm font-medium text-gray-600 mt-1 max-w-md">
                  {error}
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          </div>
        </div>
      ) : (
        <>
          <ConfirmModal
            open={clearInboxOpen}
            title="Clear scanner inbox?"
            message={`This will remove ${hf.rows.length} queued item(s) from the scanner inbox. You can’t undo this.`}
            confirmLabel="CLEAR INBOX"
            onConfirm={async () => {
              await hf.clearInbox();
              setClearInboxOpen(false);
            }}
            onCancel={() => setClearInboxOpen(false)}
            isLoading={hf.loading}
            variant="danger"
          />
          
          <div className="shrink-0 flex items-center justify-between">
            <div className="inline-flex p-1 bg-gray-100/80 rounded-brand border border-gray-200/50 backdrop-blur-sm">
              <button
                type="button"
                onClick={() => setUploadMode("pdf")}
                className={`flex items-center gap-2.5 px-5 py-2 rounded-brand text-sm font-bold transition-all duration-200 ${
                  uploadMode === "pdf"
                    ? "bg-white text-pup-maroon shadow-sm ring-1 ring-black/5"
                    : "text-gray-500 hover:text-gray-700 hover:bg-white/50"
                }`}
              >
                <i className={`ph-bold ${uploadMode === "pdf" ? "ph-file-pdf" : "ph-file-pdf text-gray-400"}`} />
                <span>DOCUMENT UPLOAD</span>
              </button>
              <button
                type="button"
                onClick={() => setUploadMode("csv")}
                className={`flex items-center gap-2.5 px-5 py-2 rounded-brand text-sm font-bold transition-all duration-200 ${
                  uploadMode === "csv"
                    ? "bg-white text-pup-maroon shadow-sm ring-1 ring-black/5"
                    : "text-gray-500 hover:text-gray-700 hover:bg-white/50"
                }`}
              >
                <i className={`ph-bold ${uploadMode === "csv" ? "ph-file-csv" : "ph-file-csv text-gray-400"}`} />
                <span>BATCH (CSV)</span>
              </button>
            </div>
          </div>

          <div className="flex flex-col lg:flex-row flex-1 min-h-0 gap-4">
          <section className={`bg-white rounded-brand border border-gray-300 flex flex-col h-full min-h-0 p-8 items-center justify-center shadow-sm relative transition-all duration-300 ${
            uploadMode === "csv" ? "w-full lg:w-[70%]" : "w-full lg:w-[48%]"
          }`}>
            {uploadMode === "csv" ? (
              <div className="w-full h-full border border-gray-200 rounded-brand bg-white overflow-hidden flex flex-col">
                <div className="p-5 border-b border-gray-200 bg-gray-50/50 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-pup-maroon shadow-sm shrink-0">
                      <i className="ph-duotone ph-table text-2xl"></i>
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-gray-900 tracking-tight">
                        CSV Preview
                      </h3>
                      <div className="text-xs font-medium text-gray-500 leading-tight mt-0.5">
                        {csvFile ? (
                          <div className="flex flex-col gap-0.5">
                            <span className="font-bold text-gray-800 break-all flex items-center gap-1.5">
                              <i className="ph-bold ph-file-csv text-pup-maroon" /> {csvFile.name}
                            </span>
                            <span className="text-gray-500">
                              {csvRows.length} rows detected · {csvRows.filter((r) => r.error).length} invalid rows
                            </span>
                          </div>
                        ) : (
                          "Select a CSV file to preview and edit records before importing."
                        )}
                      </div>
                    </div>
                  </div>
                  {csvFile && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCsvFileSelect(null)}
                      className="h-9 px-4 border-gray-300 text-gray-700 hover:text-pup-maroon hover:border-pup-maroon hover:bg-red-50 rounded-brand shadow-sm font-bold text-xs transition-all shrink-0"
                    >
                      <i className="ph-bold ph-x-circle mr-1.5" />
                      CLEAR FILE
                    </Button>
                  )}
                </div>

                <div
                  className={`flex-1 min-h-0 overflow-auto transition-colors duration-200 ${csvDropActive ? "bg-red-50/40" : ""}`}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setCsvDropActive(true);
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault();
                    setCsvDropActive(false);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    setCsvDropActive(false);
                    const file = e.dataTransfer.files?.[0];
                    if (file && (file.name.endsWith(".csv") || file.type === "text/csv")) {
                      handleCsvFileSelect(file);
                    }
                  }}
                >
                  {csvRows.length ? (
                    <table className="min-w-full text-xs">
                      <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
                        <tr className="text-left text-[11px] uppercase tracking-wider text-gray-600">
                          <th className="p-2.5 font-bold w-8">
                            <input
                              type="checkbox"
                              checked={
                                csvRows.length > 0 &&
                                Object.values(csvSelected).filter(Boolean).length === csvRows.length
                              }
                              onChange={(e) => toggleCsvSelectAll(e.target.checked)}
                            />
                          </th>
                          <th className="p-1.5 font-bold">#</th>
                          <th className="p-1.5 font-bold">Student No</th>
                          <th className="p-1.5 font-bold">Name</th>
                          <th className="p-1.5 font-bold">Course</th>
                          <th className="p-1.5 font-bold">Year</th>
                          <th className="p-1.5 font-bold">Section</th>
                          <th className="p-1.5 font-bold">Room</th>
                          <th className="p-1.5 font-bold">Cab</th>
                          <th className="p-1.5 font-bold">Drawer</th>
                          <th className="p-1.5 font-bold">Error</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {csvRows.slice(0, 100).map((r) => (
                          <tr key={r.index} className={csvSelected?.[r.index] ? "bg-gray-50" : ""}>
                            <td className="p-1.5">
                              <input
                                type="checkbox"
                                checked={!!csvSelected?.[r.index]}
                                onChange={() => toggleCsvRowSelected(r.index)}
                              />
                            </td>
                            <td className="p-1.5 text-gray-500 font-mono">{r.index}</td>
                            <td className="p-1.5 font-mono">{r.student.studentNo}</td>
                            <td className="p-1.5">{r.student.name}</td>
                            <td className="p-1.5">{r.student.courseCode}</td>
                            <td className="p-1.5">{r.student.yearLevel}</td>
                            <td className="p-1.5">{r.student.section}</td>
                            <td className="p-1.5">
                              <select
                                className="form-select h-10 text-[11px] leading-none px-1 py-0 w-14"
                                value={String(r.student.room || "")}
                                onChange={(e) =>
                                  setCsvRowField(r.index, "room", parseInt(e.target.value))
                                }
                              >
                                {roomOptions.map((room) => (
                                  <option key={room} value={room}>
                                    {room}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="p-1.5">
                              <select
                                className="form-select h-10 text-[11px] leading-none px-1 py-0 w-12"
                                value={String(r.student.cabinet || "")}
                                onChange={(e) =>
                                  setCsvRowField(r.index, "cabinet", e.target.value)
                                }
                              >
                                {mergeSelectedCabinetId(r.student.room, r.student.cabinet).map((c) => (
                                  <option key={c} value={c}>
                                    {c}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="p-1.5">
                              <select
                                className="form-select h-10 text-[11px] leading-none px-1 py-0 w-14"
                                value={String(r.student.drawer || "")}
                                onChange={(e) =>
                                  setCsvRowField(r.index, "drawer", parseInt(e.target.value))
                                }
                              >
                                {mergeSelectedDrawerId(
                                  r.student.room,
                                  r.student.cabinet,
                                  r.student.drawer
                                ).map((d) => (
                                  <option key={d} value={d}>
                                    {d}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="p-1.5">
                              {r.error ? (
                                <span className="text-red-700 font-bold text-xs">{r.error}</span>
                              ) : (
                                <span className="text-green-700 font-bold text-xs">OK</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div
                      className="h-full flex items-center justify-center p-12 cursor-pointer group"
                      onClick={() => csvInputRef.current?.click()}
                    >
                      <Empty className="flex flex-col items-center justify-center text-center text-gray-500 border-0 pointer-events-none">
                        <EmptyHeader className="flex flex-col items-center gap-0">
                          <EmptyMedia className="w-20 h-20 rounded-full bg-white border border-gray-200 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-sm">
                            <i className="ph-duotone ph-file-csv text-4xl text-pup-maroon"></i>
                          </EmptyMedia>
                          <EmptyTitle className="text-xl font-bold text-gray-900 tracking-tight">Upload CSV to Preview</EmptyTitle>
                          <EmptyDescription className="text-sm font-medium text-gray-600 mt-2">
                            Select or drop a CSV file to review and import records in bulk.
                          </EmptyDescription>
                        </EmptyHeader>
                      </Empty>
                    </div>
                  )}
                  {csvRows.length > 100 ? (
                    <div className="p-3 border-t border-gray-200 text-xs font-medium text-gray-600">
                      Showing first 100 rows.
                    </div>
                  ) : null}
                </div>
              </div>
            ) : (
              <div
                className={`w-full h-full min-h-[320px] border-2 border-dashed rounded-brand bg-gray-50 flex flex-col transition-all group relative overflow-hidden ${
                  fe.pdfFile
                    ? "border-orange-400 ring-2 ring-orange-400 bg-orange-50/30"
                    : "border-gray-400 hover:border-pup-maroon hover:bg-red-50/50"
                } ${dropActive ? "bg-red-50" : ""}`}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDropActive(true);
                }}
                onDragLeave={(e) => {
                  e.preventDefault();
                  setDropActive(false);
                }}
                onDrop={onPdfDrop}
              >
                {hf.rows.length > 0 ? (
                  <div className="shrink-0 z-10 border-b border-gray-200 bg-white/95 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                      <div>
                        <div className="text-xs font-bold uppercase text-gray-600">Scanner inbox</div>
                        <div className="text-sm font-bold text-gray-900">
                          {hf.rows.length} waiting · auto-refresh ~15s
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          className="px-3 h-8 text-xs font-bold rounded-brand bg-white border border-gray-300 text-gray-800 hover:border-pup-maroon disabled:opacity-60"
                          disabled={hf.rows.length === 0 || hf.loading}
                          onClick={(e) => {
                            e.stopPropagation();
                            setClearInboxOpen(true);
                          }}
                        >
                          CLEAR INBOX
                        </button>
                        <button
                          type="button"
                          className="px-3 h-8 text-xs font-bold border rounded-brand border-gray-300 hover:border-pup-maroon"
                          onClick={(e) => {
                            e.stopPropagation();
                            hf.refresh();
                          }}
                        >
                          REFRESH
                        </button>
                      </div>
                    </div>
                    <div className="max-h-[min(40vh,220px)] overflow-y-auto space-y-1 pr-1">
                      {hf.rows.map((row) => (
                        <button
                          key={row.id}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            // Fetch the file blob and set it as the uploaded file for direct submission
                            hf.openItem(row).then((file) => {
                              if (file) onFileSelect(file, true);
                            });
                          }}
                          className={`w-full text-left p-2.5 rounded-brand border transition-colors ${
                            hf.selected === row.id
                              ? "border-pup-maroon bg-red-50/50"
                              : "border-transparent bg-gray-50 hover:bg-gray-100"
                          }`}
                        >
                          <div className="text-sm font-bold text-gray-900 truncate">{row.original_filename}</div>
                          <div className="text-xs font-medium text-gray-600 mt-0.5">
                            {row.mime_type} · {(Number(row.size_bytes || 0) / 1024).toFixed(1)} KB
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}

                <div
                  className="flex-1 flex flex-col items-center justify-center p-6 cursor-pointer relative min-h-[200px]"
                  onClick={() => {
                    if (uploadedFile) return;
                    if (fileInputRef.current) fileInputRef.current.click();
                  }}
                >
                  <Empty className="flex flex-col items-center justify-center text-center text-gray-500 border-0 pointer-events-none">
                    <EmptyHeader className="flex flex-col items-center gap-0">
                      <EmptyMedia className="w-20 h-20 rounded-full bg-white border border-gray-200 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-sm">
                        <i className="ph-duotone ph-file-arrow-up text-4xl text-pup-maroon"></i>
                      </EmptyMedia>
                      <EmptyTitle className="text-xl font-bold text-gray-900">Drop Document or Image here</EmptyTitle>
                      <EmptyDescription className="text-sm font-medium text-gray-600 mt-2">
                        or click to browse local files (PDF, JPG, PNG)
                      </EmptyDescription>
                      {hf.rows.length > 0 ? (
                        <EmptyDescription className="text-xs font-medium text-gray-500 mt-4 max-w-xs mx-auto">
                          This area still accepts manual drops and clicks even while the scanner inbox is shown above.
                        </EmptyDescription>
                      ) : null}
                    </EmptyHeader>
                  </Empty>

                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    accept=".pdf,image/*"
                    onChange={(e) => handlePdfFileSelect(e.target.files[0])}
                  />

                  {uploadedFile ? (
                    <div className="absolute inset-0 bg-white z-10 flex flex-col items-center justify-center p-6 rounded-brand">
                      {String(uploadedFile?.type || "").startsWith("image/") ? (
                        <i className="ph-fill ph-file-image text-6xl text-pup-maroon mb-4"></i>
                      ) : (
                        <i className="ph-fill ph-file-pdf text-6xl text-pup-maroon mb-4"></i>
                      )}
                      <h4 className="font-bold text-gray-900 text-lg text-center break-all mb-1 max-w-sm">
                        {uploadedFile.name}
                      </h4>
                      <span className="text-sm text-gray-500 mb-6 font-medium">
                        {(uploadedFile.size / 1024).toFixed(2)} KB
                      </span>

                      {uploadMode === "pdf" && ocrLoading ? (
                        <div className="mb-4 text-sm font-bold text-gray-700">
                          Scanning PDF (OCR)...
                        </div>
                      ) : null}

                      {uploadMode === "pdf" && ocrError ? (
                        <div className="mb-4 text-sm font-bold text-red-700 text-center max-w-md">
                          {ocrError}
                        </div>
                      ) : null}

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleClearPdf();
                        }}
                        className="px-6 h-10 rounded-brand bg-white border border-gray-300 text-gray-700 font-bold text-sm hover:border-pup-maroon"
                      >
                        REMOVE FILE
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
            )}

              {/* When a hot-folder item is selected, show the file preview overlaying the drop zone */}
              {uploadMode === "pdf" && hf.selectedRow ? (
                <div className="absolute inset-0 z-10 bg-white rounded-brand flex flex-col overflow-hidden">
                  <div className="shrink-0 flex items-center justify-between gap-2 px-4 py-2.5 border-b border-gray-200 bg-gray-50">
                    <div className="min-w-0">
                      <div className="text-xs font-bold uppercase text-gray-500">Scanner inbox preview</div>
                      <div className="text-sm font-bold text-gray-900 truncate">{hf.selectedRow.original_filename}</div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {hf.ocrLoading ? (
                        <span className="text-xs font-medium text-gray-600">Running OCR…</span>
                      ) : null}
                      <button
                        type="button"
                        className="px-3 h-8 text-xs font-bold bg-white border border-gray-300 rounded-brand hover:border-pup-maroon disabled:opacity-60"
                        onClick={() => hf.runOcrAgain()}
                        disabled={hf.ocrLoading}
                      >
                        RE-SCAN
                      </button>
                      <button
                        type="button"
                        className="px-3 h-8 text-xs font-bold bg-white border border-gray-300 rounded-brand hover:border-pup-maroon"
                        onClick={() => hf.clearIngestSelection()}
                      >
                        ✕ CLOSE
                      </button>
                    </div>
                  </div>
                  <div className="flex-1 min-h-0 overflow-hidden">
                    {hf.previewMime.startsWith("image/") ? (
                      <div className="relative w-full h-full">
                        <Image
                          src={hf.previewUrl}
                          alt="Scanner inbox preview"
                          fill
                          unoptimized
                          className="object-contain"
                          draggable="false"
                        />
                      </div>
                    ) : (
                      <iframe
                        title="scanner-inbox-preview"
                        src={hf.previewUrl}
                        className="w-full h-full"
                      />
                    )}
                  </div>
                </div>
              ) : null}
              {uploadMode === "pdf" && (ocrLoading || hf.ocrLoading) ? (
              <div className="absolute inset-0 z-20 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center rounded-brand">
                <div className="w-full max-w-md px-6">
                  <div className="text-sm font-bold text-gray-800 mb-4 text-center">
                    Scanning file…
                  </div>
                  <div className="rounded-brand border border-gray-200 bg-white p-5 shadow-sm">
                    <div className="flex items-center justify-center gap-3">
                      <div className="h-10 w-10 rounded-full border-2 border-pup-maroon/20 border-t-pup-maroon animate-spin"></div>
                      <i className="ph-duotone ph-scan text-3xl text-pup-maroon animate-pulse"></i>
                    </div>
                    <div className="mt-4 h-2 w-full overflow-hidden rounded bg-gray-100">
                      <div className="h-full w-1/2 bg-pup-maroon/80 animate-pulse"></div>
                    </div>
                    <div className="mt-3 text-xs font-medium text-gray-600 text-center">
                      Extracting text and tags from PDF...
                    </div>
                  </div>
                  <div className="mt-4 text-xs font-medium text-gray-600 text-center">
                    Working offline (LAN)
                  </div>
                </div>
              </div>
            ) : null}
          </section>

          <section className={`bg-white rounded-brand border border-gray-300 flex flex-col h-full min-h-0 shadow-sm overflow-hidden font-inter transition-all duration-300 ${
            uploadMode === "csv" ? "w-full lg:w-[30%]" : "w-full lg:w-[52%]"
          }`}>
            <CardHeader className="bg-gray-50/50 border-b border-gray-100 p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-brand bg-white border border-gray-200 flex items-center justify-center text-pup-maroon shadow-sm shrink-0">
                  <i className={`ph-duotone ${uploadMode === "csv" ? "ph-file-csv" : "ph-tag"} text-2xl`}></i>
                </div>
                <div>
                  <CardTitle className="text-xl font-black text-gray-900 tracking-tight">
                    {uploadMode === "csv" ? "Batch Import" : "Tag Document"}
                  </CardTitle>
                  <CardDescription className="text-sm font-medium text-gray-500">
                    {uploadMode === "csv"
                      ? "Review CSV rows, bulk-edit locations, then import students."
                      : uploadedFile
                        ? "Review OCR-suggested values and fill in missing fields."
                        : "Drop or select a file on the left, then fill in the form here."}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <div className="flex-1 overflow-y-auto p-6 bg-gray-50/50">
              {uploadMode === "pdf" ? (
                <div className="space-y-5">
                  {uploadStudentIsExisting ? (
                    <div className="rounded-brand border border-emerald-200 bg-emerald-50/90 px-3 py-2.5 flex flex-col gap-2">
                      <span className="text-xs font-bold text-emerald-900 inline-flex items-start gap-2">
                        <i className="ph-bold ph-check-circle shrink-0 mt-0.5" aria-hidden />
                        <span>
                          Existing student — profile fields below are locked. Adjust room, cabinet,
                          drawer, or document type if needed, then submit.
                        </span>
                      </span>
                      <button
                        type="button"
                        className="shrink-0 text-xs font-bold text-pup-maroon hover:underline underline-offset-2 text-left"
                        onClick={() => {
                          setUploadStudentIsExisting(false);
                          clearAllUploadFieldErrors?.();
                        }}
                      >
                        SWITCH TO NEW STUDENT
                      </button>
                    </div>
                  ) : (
                    <div className="rounded-brand border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700">
                      New student — submitting creates the student record and uploads the document.
                    </div>
                  )}

                  <div className="grid grid-cols-1 gap-5">
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label
                          className={`block text-xs font-bold uppercase ${
                            lockIdentity ? lockedLabel : "text-gray-700"
                          }`}
                        >
                          Student Number
                        </label>
                        {(newRec.studentNo || newRec.name || newRec.course || newRec.docType || newRec.room || newRec.cabinet || newRec.drawer || uploadedFile || hf.selected) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
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
                              });
                              setUploadStudentIsExisting(false);
                              clearAllUploadFieldErrors?.();
                              if (uploadedFile || hf.selected) {
                                handleClearPdf();
                              }
                            }}
                            className="h-5 px-1.5 text-[9px] font-bold text-pup-maroon hover:bg-red-50 hover:text-pup-darkMaroon rounded-brand"
                          >
                            CLEAR ALL
                          </Button>
                        )}
                      </div>
                      <input
                        type="text"
                        className={`form-input h-11 font-mono rounded-brand ${ring("studentNo")} ${
                          lockIdentity ? lockedField : ""
                        }`}
                        placeholder="202X-XXXXX-MN-0"
                        ref={newStudentNoInputRef}
                        value={newRec.studentNo}
                        disabled={lockIdentity}
                        onChange={(e) => {
                          clearUploadFieldError?.("studentNo");
                          clearUploadFieldError?.("year");
                          clearUploadFieldError?.("sectionPart");
                          setNewRecStudentNoTouched(true);
                          const masked = applyStudentNoMask(e.target.value);
                          const derivedYear = deriveYearFromStudentNo(masked.value);
                          setNewRec((p) => ({
                            ...p,
                            studentNo: masked.value,
                            year: derivedYear,
                            sectionPart: "",
                          }));
                        }}
                        onBlur={() => setNewRecStudentNoTouched(true)}
                      />
                      {newRecStudentNoHint ? (
                        <div className="mt-2 text-xs font-bold text-red-700">
                          {newRecStudentNoHint}
                        </div>
                      ) : null}
                    </div>
                    <div>
                      <label
                        className={`block text-xs font-bold mb-1.5 uppercase ${
                          lockIdentity ? lockedLabel : "text-gray-700"
                        }`}
                      >
                        Full Name
                      </label>
                      <input
                        type="text"
                        className={`form-input h-11 rounded-brand ${ring("name")} ${lockIdentity ? lockedField : ""}`}
                        placeholder="Last Name, First Name"
                        value={newRec.name}
                        disabled={lockIdentity}
                        onChange={(e) => {
                          clearUploadFieldError?.("name");
                          setNewRec((p) => ({ ...p, name: e.target.value }));
                        }}
                      />
                      {!lockIdentity && nameSuggestions.length > 0 ? (
                        <div className="mt-2 rounded-brand border border-gray-200 bg-white overflow-hidden shadow-sm">
                          {nameSuggestions.map((s) => {
                            const studentNo = String(s?.studentNo || s?.student_no || "");
                            return (
                              <button
                                key={studentNo}
                                type="button"
                                className="w-full text-left px-3 py-2 border-b last:border-b-0 border-gray-100 hover:bg-red-50/50 transition-colors"
                                onClick={() => onSelectExistingStudent?.(s)}
                              >
                                <div className="text-sm font-bold text-gray-900">{s?.name}</div>
                                <div className="text-xs text-gray-600 font-mono">
                                  {studentNo}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      ) : null}
                    </div>
                  </div>

                  <div>
                    <label
                      className={`block text-xs font-bold mb-1.5 uppercase ${
                        lockIdentity ? lockedLabel : "text-gray-700"
                      }`}
                    >
                      Course / Program
                    </label>
                    <select
                      className={`form-select h-11 rounded-brand ${ring("course")} ${lockIdentity ? lockedField : ""}`}
                      value={newRec.course}
                      disabled={lockIdentity}
                      onChange={(e) => {
                        clearUploadFieldError?.("course");
                        setNewRec((p) => ({
                          ...p,
                          course: e.target.value,
                          sectionPart: "",
                        }));
                      }}
                    >
                      <option value="">Select Course...</option>
                      {courses.map((c) => (
                        <option key={c.code} value={c.code}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label
                      className={`block text-xs font-bold mb-1.5 uppercase ${
                        lockIdentity ? lockedLabel : "text-gray-700"
                      }`}
                    >
                      Section
                    </label>
                    <select
                      className={`form-select h-11 rounded-brand ${ring("sectionPart")} ${lockIdentity ? lockedField : ""}`}
                      value={newRec.sectionPart}
                      onChange={(e) => {
                        clearUploadFieldError?.("sectionPart");
                        setNewRec((p) => ({ ...p, sectionPart: e.target.value }));
                      }}
                      disabled={lockIdentity || !newRec.course}
                    >
                      <option value="">
                        {newRec.course
                          ? "Select Section..."
                          : "Select course first..."}
                      </option>
                      {sysSections.map((sec) => (
                        <option key={sec.id} value={sec.name}>
                          {sec.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-3 gap-5">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase">
                        Room
                      </label>
                      <select
                        className={`form-select h-11 rounded-brand ${ring("room")}`}
                        value={String(newRec.room || "")}
                        onChange={(e) => {
                          clearUploadFieldError?.("room");
                          const nextRoom = e.target.value ? parseInt(e.target.value, 10) : "";
                          setNewRec((p) => ({ ...p, room: nextRoom, cabinet: "", drawer: "" }));
                        }}
                      >
                        <option value="">Room...</option>
                        {roomOptions.map((r) => (
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
                        className={`form-select h-11 rounded-brand ${ring("cabinet")}`}
                        value={newRec.cabinet}
                        onChange={(e) => {
                          clearUploadFieldError?.("cabinet");
                          setNewRec((p) => ({ ...p, cabinet: e.target.value, drawer: "" }));
                        }}
                      >
                        <option value="">Cab...</option>
                        {mergeSelectedCabinetId(newRec.room, newRec.cabinet).map((c) => (
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
                        className={`form-select h-11 rounded-brand ${ring("drawer")}`}
                        value={String(newRec.drawer || "")}
                        onChange={(e) => {
                          clearUploadFieldError?.("drawer");
                          setNewRec((p) => ({ ...p, drawer: e.target.value }));
                        }}
                      >
                        <option value="">Draw...</option>
                        {mergeSelectedDrawerId(newRec.room, newRec.cabinet, newRec.drawer).map((d) => (
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
                    <select
                      className={`form-select h-11 rounded-brand ${ring("docType")}`}
                      value={newRec.docType}
                      onChange={(e) => {
                        clearUploadFieldError?.("docType");
                        setNewRec((p) => ({ ...p, docType: e.target.value }));
                      }}
                    >
                      <option value="">Select Document Type...</option>
                      {docTypes.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    type="button"
                    onClick={() => processSubmission({ onSuccess: () => hf.removeIngestItem() })}
                    className="w-full bg-pup-maroon text-white h-10 rounded-brand font-bold text-sm hover:bg-red-900 transition-all shadow-sm flex items-center justify-center gap-2"              
                  >
                    <i className="ph-bold ph-upload-simple" /> SUBMIT UPLOAD
                  </button>

                  {uploadError ? (
                    <div className="mt-3 p-3 rounded-brand border border-red-200 bg-red-50 text-red-800 text-sm font-bold">
                      {uploadError}
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="space-y-5">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-2 uppercase tracking-wider">
                      Source File
                    </label>
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <input
                          ref={csvInputRef}
                          type="file"
                          accept=".csv,text/csv"
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                          onChange={(e) => handleCsvFileSelect(e.target.files?.[0] || null)}
                        />
                        <div className="h-11 px-3 rounded-brand border border-dashed border-gray-300 bg-white flex items-center gap-2">
                          <i className="ph-bold ph-file-csv text-pup-maroon"></i>
                          <span className="text-xs font-bold text-gray-600 truncate">
                            {csvFile ? csvFile.name : "Select CSV..."}
                          </span>
                        </div>
                      </div>
                      {csvFile && (
                        <button
                          type="button"
                          onClick={() => handleCsvFileSelect(null)}
                          className="h-11 w-11 shrink-0 rounded-brand bg-white border border-gray-300 text-gray-500 hover:text-red-600 hover:border-red-600 transition-all shadow-sm flex items-center justify-center"
                          title="Clear file"
                        >
                          <i className="ph-bold ph-trash text-lg" />
                        </button>
                      )}
                    </div>
                  </div>

                  {csvError ? (
                    <div className="p-3 rounded-brand border border-red-200 bg-red-50 text-red-800 text-xs font-bold">
                      {csvError}
                    </div>
                  ) : null}

                  <div className="border border-gray-200 rounded-brand overflow-hidden bg-white shadow-sm">
                    <div className="p-4 border-b border-gray-100 bg-gray-50/80">
                      <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Bulk Edit</div>
                      <div className="mt-1 text-sm font-black text-gray-900">
                        {Object.values(csvSelected).filter(Boolean).length} rows selected
                      </div>
                    </div>

                    <div className="p-4 space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider">Room</label>
                        <select
                          className="form-select h-11 text-sm rounded-brand"
                          value={csvBulkRoom}
                          onChange={(e) => setCsvBulkRoom(e.target.value)}
                        >
                          <option value="">No change</option>
                          {roomOptions.map((r) => <option key={r} value={String(r)}>Room {r}</option>)}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider">Cabinet</label>
                        <select
                          className="form-select h-11 text-sm rounded-brand"
                          value={csvBulkCabinet}
                          onChange={(e) => setCsvBulkCabinet(e.target.value)}
                        >
                          <option value="">No change</option>
                          {(() => {
                            const bulkRoomId = coerceRoomId(csvBulkRoom);
                            const ids = bulkRoomId
                              ? getCabinetsForRoom(bulkRoomId).map((c) => c.id)
                              : Array.from(new Set(storageLayout?.rooms?.flatMap((r) => r.cabinets.map((c) => c.id)) || []));
                            return ids.map((c) => <option key={c} value={c}>Cab {c}</option>);
                          })()}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider">Drawer</label>
                        <select
                          className="form-select h-11 text-sm rounded-brand"
                          value={csvBulkDrawer}
                          onChange={(e) => setCsvBulkDrawer(e.target.value)}
                        >
                          <option value="">No change</option>
                          {(() => {
                            const bulkRoomId = coerceRoomId(csvBulkRoom);
                            const bulkCabId = String(csvBulkCabinet || "").trim();
                            const ids = bulkRoomId && bulkCabId
                              ? getDrawerIdsFor(bulkRoomId, bulkCabId)
                              : Array.from(new Set(storageLayout?.rooms?.flatMap((r) => r.cabinets.flatMap((c) => c.drawerIds || [])) || []));
                            ids.sort((a, b) => a - b);
                            return ids.map((d) => <option key={d} value={String(d)}>Draw {d}</option>);
                          })()}
                        </select>
                      </div>

                      <div className="pt-1 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={applyCsvBulkLocation}
                          className="flex-1 flex items-center justify-center gap-1.5 h-10 rounded-brand bg-pup-maroon text-white font-bold text-xs uppercase tracking-widest hover:bg-red-900 transition-all shadow-sm disabled:opacity-40"
                          disabled={Object.values(csvSelected).filter(Boolean).length === 0}
                        >
                          <i className="ph-bold ph-check" />
                          APPLY
                        </button>
                        <button
                          type="button"
                          onClick={() => setCsvSelected({})}
                          className="flex-1 flex items-center justify-center gap-1.5 h-10 rounded-brand bg-white border border-gray-300 text-gray-700 font-bold text-xs uppercase tracking-widest hover:border-pup-maroon hover:text-pup-maroon transition-all disabled:opacity-40"
                          disabled={Object.values(csvSelected).filter(Boolean).length === 0}
                        >
                          <i className="ph-bold ph-trash" />
                          CLEAR
                        </button>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={importCsvStudents}
                    disabled={csvLoading}
                    className={`w-full bg-pup-maroon text-white h-10 rounded-brand font-bold text-sm hover:bg-red-900 transition-all shadow-sm flex items-center justify-center gap-2 ${
                      csvLoading ? "opacity-75 cursor-not-allowed" : ""
                    }`}
                  >
                    {csvLoading ? (
                      <>
                        <div className="h-4 w-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                        <span>PROCESSING...</span>
                      </>
                    ) : (
                      <>
                        <i className="ph-bold ph-upload-simple" /> IMPORT RECORDS
                      </>
                    )}
                  </button>

                  {csvResults.length > 0 && (
                    <div className="p-4 rounded-brand border border-gray-200 bg-white shadow-sm">
                      <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Import Summary</div>
                      <div className="space-y-1.5">
                        <div className="text-xs font-bold text-gray-700 flex items-center justify-between">
                          <span className="flex items-center gap-1.5"><i className="ph-fill ph-check-circle text-emerald-500" /> Created:</span>
                          <span className="text-emerald-600 px-2 py-0.5 bg-emerald-50 rounded-full">{csvResults.filter((r) => r.ok).length}</span>
                        </div>
                        <div className="text-xs font-bold text-gray-700 flex items-center justify-between">
                          <span className="flex items-center gap-1.5"><i className="ph-fill ph-x-circle text-red-500" /> Failed:</span>
                          <span className="text-red-600 px-2 py-0.5 bg-red-50 rounded-full">{csvResults.filter((r) => !r.ok).length}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>
        </div>
      </>
    )}
  </div>
);
}
