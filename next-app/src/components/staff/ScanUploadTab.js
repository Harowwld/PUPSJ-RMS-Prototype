"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { useHotFolderInbox } from "@/hooks/useHotFolderInbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function ScanUploadTab({
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
    <div id="view-upload" className="flex flex-col w-full h-full min-h-0 gap-4 animate-fade-in">
      <Dialog open={clearInboxOpen} onOpenChange={setClearInboxOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Clear scanner inbox?</DialogTitle>
            <DialogDescription>
              This will remove {hf.rows.length} queued item(s) from the scanner inbox.
              You can’t undo this.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button
              type="button"
              className="h-10 px-4 rounded-brand bg-white border border-gray-300 text-gray-800 font-bold text-xs hover:border-pup-maroon"
              onClick={() => setClearInboxOpen(false)}
              disabled={hf.loading}
            >
              Cancel
            </button>
            <button
              type="button"
              className="h-10 px-4 rounded-brand bg-pup-maroon text-white font-bold text-xs hover:bg-red-900 disabled:opacity-60"
              onClick={async () => {
                await hf.clearInbox();
                setClearInboxOpen(false);
              }}
              disabled={hf.loading || hf.rows.length === 0}
            >
              Clear inbox
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <div className="shrink-0 bg-white rounded-brand border border-gray-300 p-4 shadow-sm">
        <h2 className="text-xl font-bold text-pup-maroon mb-1">Scan & Upload</h2>
        <p className="text-sm text-gray-600 mb-4">
          Upload PDFs, images, or files from the scanner inbox. Batch-import students from CSV in the second tab.
        </p>
        <div className="flex flex-wrap gap-4 sm:gap-6 border-b border-gray-200">
          <button
            type="button"
            className={`tab-btn ${uploadMode === "pdf" ? "active" : ""}`}
            onClick={() => setUploadMode("pdf")}
          >
            PDF upload
          </button>
          <button
            type="button"
            className={`tab-btn ${uploadMode === "csv" ? "active" : ""}`}
            onClick={() => setUploadMode("csv")}
          >
            Batch (CSV)
          </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row flex-1 min-h-0 gap-4">
      <section className="w-full lg:w-1/2 bg-white rounded-brand border border-gray-300 flex flex-col h-full min-h-0 p-8 items-center justify-center shadow-sm relative">
        {uploadMode === "csv" ? (
          <div className="w-full h-full border border-gray-200 rounded-brand bg-white overflow-hidden flex flex-col">
            <div className="p-4 border-b border-gray-200 bg-gray-50">
              <div className="text-xs font-bold text-gray-600 uppercase tracking-wider">
                CSV Preview
              </div>
              <div className="mt-1 text-sm font-bold text-gray-900 break-all">
                {csvFile ? csvFile.name : "No CSV selected"}
              </div>
              <div className="mt-2 text-xs font-medium text-gray-600">
                {csvRows.length ? (
                  <>
                    {csvRows.length} rows
                    {" · "}
                    {csvRows.filter((r) => r.error).length} invalid
                    {csvRows.filter((r) => r.error).length === 0 ? " · All valid" : ""}
                  </>
                ) : (
                  "Select a CSV file to preview it here."
                )}
              </div>
            </div>

            <div
              className={`flex-1 min-h-0 overflow-auto ${csvDropActive ? "bg-red-50/40" : ""}`}
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
                  <thead className="bg-white border-b border-gray-200 sticky top-0 z-10">
                    <tr className="text-left text-[11px] uppercase tracking-wider text-gray-600">
                      <th className="p-1.5 font-bold w-8">
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
                  className="h-full flex items-center justify-center text-center p-8 cursor-pointer"
                  onClick={() => csvInputRef.current?.click()}
                >
                  <div className="text-gray-500">
                    <div className="w-20 h-20 mx-auto rounded-full bg-gray-50 border border-gray-200 flex items-center justify-center mb-4 shadow-sm">
                      <i className="ph-thin ph-file-csv text-4xl text-pup-maroon"></i>
                    </div>
                    <div className="font-bold text-gray-800 text-lg">Upload a CSV to preview</div>
                    <div className="mt-2 text-sm font-medium text-gray-600">
                      Choose a CSV file or drop it here.
                    </div>
                  </div>
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
                      Clear inbox
                    </button>
                    <button
                      type="button"
                      className="px-3 h-8 text-xs font-bold border rounded-brand border-gray-300 hover:border-pup-maroon"
                      onClick={(e) => {
                        e.stopPropagation();
                        hf.refresh();
                      }}
                    >
                      Refresh
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
                          if (file) onFileSelect(file);
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
              <div className="text-center pointer-events-none">
                <div className="w-20 h-20 mx-auto rounded-full bg-white border border-gray-300 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-sm">
                  <i className="ph-thin ph-file-pdf text-4xl text-pup-maroon"></i>
                </div>
                <h3 className="font-bold text-xl text-gray-800">Drop Document or Image here</h3>
                <p className="text-sm text-gray-500 mt-2 font-medium">
                  or click to browse local files (PDF, JPG, PNG)
                </p>
                {hf.rows.length > 0 ? (
                  <p className="text-xs font-medium text-gray-500 mt-3 max-w-xs mx-auto">
                    This area still accepts manual drops and clicks even while the scanner inbox is shown above.
                  </p>
                ) : null}
              </div>

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
                    Remove File
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
                    Re-scan
                  </button>
                  <button
                    type="button"
                    className="px-3 h-8 text-xs font-bold bg-white border border-gray-300 rounded-brand hover:border-pup-maroon"
                    onClick={() => hf.clearIngestSelection()}
                  >
                    ✕ Close
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

      <section className="w-full lg:w-[58%] bg-white rounded-brand border border-gray-300 flex flex-col h-full min-h-0 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-pup-maroon mb-1">Tag Document</h2>
          <p className="text-sm text-gray-600">
            {uploadMode === "csv"
              ? "Review CSV rows, bulk-edit locations, then import students."
              : uploadedFile
                ? "Review OCR-suggested values and fill in missing fields."
                : "Drop or select a file on the left, then fill in the form here."}
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-6 bg-gray-50/50">


          {uploadMode === "pdf" ? (
            <div className="space-y-5">
              {uploadStudentIsExisting ? (
                <div className="rounded-brand border border-emerald-200 bg-emerald-50/90 px-3 py-2.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <span className="text-xs font-bold text-emerald-900 inline-flex items-start gap-2">
                    <i className="ph-bold ph-check-circle shrink-0 mt-0.5" aria-hidden />
                    <span>
                      Existing student — profile fields below are locked. Adjust room, cabinet,
                      drawer, or document type if needed, then submit.
                    </span>
                  </span>
                  <button
                    type="button"
                    className="shrink-0 text-xs font-bold text-pup-maroon hover:underline underline-offset-2 text-left sm:text-right"
                    onClick={() => {
                      setUploadStudentIsExisting(false);
                      clearAllUploadFieldErrors?.();
                    }}
                  >
                    Switch to new student
                  </button>
                </div>
              ) : (
                <div className="rounded-brand border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700">
                  New student — submitting creates the student record and uploads the document.
                </div>
              )}

              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label
                    className={`block text-xs font-bold mb-1.5 uppercase ${
                      lockIdentity ? lockedLabel : "text-gray-700"
                    }`}
                  >
                    Student Number
                  </label>
                  <input
                    type="text"
                    className={`form-input h-11 font-mono ${ring("studentNo")} ${
                      lockIdentity ? lockedField : ""
                    }`}
                    placeholder="202X-XXXXX-MN-0"
                    ref={newStudentNoInputRef}
                    value={newRec.studentNo}
                    disabled={lockIdentity}
                    onKeyDown={(e) => {
                      if (e.key !== "Backspace") return;
                      const el = e.currentTarget;
                      const start = el.selectionStart;
                      const end = el.selectionEnd;
                      if (start == null || end == null) return;
                      if (start !== end) return;
                      if (start <= 0) return;
                      const v = String(el.value || "");
                      if (v[start - 1] !== "-") return;
                      if (start < 2) return;

                      e.preventDefault();

                      clearUploadFieldError?.("studentNo");
                      const raw = v.slice(0, start - 2) + v.slice(start - 1);
                      const masked = applyStudentNoMask(raw);
                      const derivedYear = deriveYearFromStudentNo(masked.value);
                      setNewRec((p) => ({
                        ...p,
                        studentNo: masked.value,
                        year: derivedYear,
                        sectionPart: "",
                      }));

                      const nextPos = Math.max(0, start - 2);
                      requestAnimationFrame(() => {
                        const node = newStudentNoInputRef.current;
                        if (!node) return;
                        try {
                          node.setSelectionRange(nextPos, nextPos);
                        } catch {
                          // ignore
                        }
                      });
                    }}
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
                    className={`form-input h-11 ${ring("name")} ${lockIdentity ? lockedField : ""}`}
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
                        const courseCode = String(s?.courseCode || s?.course_code || "");
                        const yearLevel = String(s?.yearLevel || s?.year_level || "");
                        return (
                          <button
                            key={studentNo}
                            type="button"
                            className="w-full text-left px-3 py-2 border-b last:border-b-0 border-gray-100 hover:bg-red-50/50 transition-colors"
                            onClick={() => onSelectExistingStudent?.(s)}
                          >
                            <div className="text-sm font-bold text-gray-900">{s?.name}</div>
                            <div className="text-xs text-gray-600 font-mono">
                              {studentNo} {courseCode ? `· ${courseCode}` : ""}{" "}
                              {yearLevel ? `· Year ${yearLevel}` : ""}
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
                  className={`form-select h-11 ${ring("course")} ${lockIdentity ? lockedField : ""}`}
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

              <div className="grid grid-cols-1 gap-5">
                <div>
                  <label
                    className={`block text-xs font-bold mb-1.5 uppercase ${
                      lockIdentity ? lockedLabel : "text-gray-700"
                    }`}
                  >
                    Section
                  </label>
                  <select
                    className={`form-select h-11 ${ring("sectionPart")} ${lockIdentity ? lockedField : ""}`}
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
              </div>

              <div className="grid grid-cols-3 gap-5">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase">
                    Room
                  </label>
                  <select
                    className={`form-select h-11 ${ring("room")}`}
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
                    className={`form-select h-11 ${ring("cabinet")}`}
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
                    className={`form-select h-11 ${ring("drawer")}`}
                    value={String(newRec.drawer || "")}
                    onChange={(e) => {
                      clearUploadFieldError?.("drawer");
                      setNewRec((p) => ({ ...p, drawer: e.target.value }));
                    }}
                  >
                    <option value="">D...</option>
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
                  className={`form-select h-11 ${ring("docType")}`}
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
                className="w-full bg-pup-maroon text-white h-11 rounded-brand font-bold text-sm hover:bg-red-900 transition-all shadow-sm flex items-center justify-center gap-2"
              >
                <i className="ph-bold ph-upload-simple" /> Submit Upload
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
                <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase">
                  CSV File
                </label>
                <div className="flex gap-3">
                  <input
                    ref={csvInputRef}
                    type="file"
                    accept=".csv,text/csv"
                    className="block w-full text-sm text-gray-600 file:mr-3 file:h-11 file:px-4 file:rounded-brand file:border file:border-gray-300 file:bg-white file:text-gray-700 file:font-bold hover:file:border-pup-maroon"
                    onChange={(e) => handleCsvFileSelect(e.target.files?.[0] || null)}
                  />
                </div>
              </div>

              {csvError ? (
                <div className="p-3 rounded-brand border border-red-200 bg-red-50 text-red-800 text-sm font-bold">
                  {csvError}
                </div>
              ) : null}

              <div className="border border-gray-200 rounded-brand overflow-hidden bg-white">
                <div className="p-3 border-b border-gray-200 bg-gray-50">
                  <div className="text-xs font-bold text-gray-600 uppercase tracking-wider">
                    Bulk Edit Selected
                  </div>
                  <div className="mt-1 text-sm font-bold text-gray-900">
                    {Object.values(csvSelected).filter(Boolean).length} selected
                  </div>
                </div>

                <div className="p-3 border-b border-gray-200 bg-white">
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1 uppercase">
                        Bulk Room
                      </label>
                      <select
                        className="form-select h-11"
                        value={csvBulkRoom}
                        onChange={(e) => setCsvBulkRoom(e.target.value)}
                      >
                        <option value="">No change</option>
                        {roomOptions.map((r) => (
                          <option key={r} value={String(r)}>
                            {r}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1 uppercase">
                        Bulk Cabinet
                      </label>
                      <select
                        className="form-select h-11"
                        value={csvBulkCabinet}
                        onChange={(e) => setCsvBulkCabinet(e.target.value)}
                      >
                        <option value="">No change</option>
                        {(() => {
                          const bulkRoomId = coerceRoomId(csvBulkRoom);
                          const roomCabs = bulkRoomId
                            ? getCabinetsForRoom(bulkRoomId).map((c) => c.id)
                            : [];
                          const allCabs =
                            storageLayout?.rooms
                              ?.flatMap((r) => r.cabinets.map((c) => c.id))
                              .filter(Boolean) || [];
                          const ids = roomCabs.length ? roomCabs : Array.from(new Set(allCabs));
                          return ids.map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ));
                        })()}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1 uppercase">
                        Bulk Drawer
                      </label>
                      <select
                        className="form-select h-11"
                        value={csvBulkDrawer}
                        onChange={(e) => setCsvBulkDrawer(e.target.value)}
                      >
                        <option value="">No change</option>
                        {(() => {
                          const bulkRoomId = coerceRoomId(csvBulkRoom);
                          const bulkCabId = String(csvBulkCabinet || "").trim();
                          const fromCombo =
                            bulkRoomId && bulkCabId
                              ? getDrawerIdsFor(bulkRoomId, bulkCabId)
                              : [];
                          const allDrawerIds =
                            storageLayout?.rooms
                              ?.flatMap((r) => r.cabinets.flatMap((c) => c.drawerIds || [])) || [];
                          const ids = fromCombo.length
                            ? fromCombo
                            : Array.from(new Set(allDrawerIds));
                          ids.sort((a, b) => a - b);
                          return ids.map((d) => (
                            <option key={d} value={String(d)}>
                              {d}
                            </option>
                          ));
                        })()}
                      </select>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-col lg:flex-row gap-2">
                    <button
                      type="button"
                      onClick={applyCsvBulkLocation}
                      className="px-4 h-11 rounded-brand bg-pup-maroon text-white font-bold text-sm hover:bg-red-900"
                      disabled={Object.values(csvSelected).filter(Boolean).length === 0}
                    >
                      Apply to Selected
                    </button>
                    <button
                      type="button"
                      onClick={() => setCsvSelected({})}
                      className="px-4 h-11 rounded-brand bg-white border border-gray-300 text-gray-700 font-bold text-sm hover:border-pup-maroon"
                      disabled={Object.values(csvSelected).filter(Boolean).length === 0}
                    >
                      Clear Selection
                    </button>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={importCsvStudents}
                disabled={csvLoading}
                className={`w-full bg-pup-maroon text-white h-11 rounded-brand font-bold text-sm hover:bg-red-900 transition-all shadow-sm flex items-center justify-center gap-2 ${
                  csvLoading ? "opacity-75 cursor-not-allowed" : ""
                }`}
              >
                {csvLoading ? "Importing..." : "Import Students"}
              </button>

              {csvResults.length ? (
                <div className="p-4 rounded-brand border border-gray-200 bg-white">
                  <div className="text-sm font-bold text-gray-800">
                    Import Summary
                  </div>
                  <div className="mt-2 text-sm text-gray-700 font-medium">
                    {csvResults.filter((r) => r.ok).length} created
                    {" · "}
                    {csvResults.filter((r) => !r.ok).length} failed
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </div>
      </section>
    </div>
    </div>
  );
}
