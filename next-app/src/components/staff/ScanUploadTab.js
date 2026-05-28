"use client"

import Image from "next/image"
import { useMemo, useState, useEffect } from "react"
import { useHotFolderInbox } from "@/hooks/useHotFolderInbox"
import { cn } from "@/lib/utils"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import ConfirmModal from "@/components/shared/ConfirmModal"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyMedia,
} from "@/components/ui/empty"
import PageHeader from "@/components/shared/PageHeader"
import { RefreshButton } from "@/components/shared/RefreshButton"
import { Select } from "@/components/ui/select"

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
  uploadedFiles = [],
  selectedQueuedFileIndex = 0,
  setSelectedQueuedFileIndex,
  onRemoveQueuedFile,
  onReorderQueuedFiles,
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
  rotation = 0,
  setRotation,
}) {
  const [clearInboxOpen, setClearInboxOpen] = useState(false)
  const [pendingDroppedFile, setPendingDroppedFile] = useState(null)
  const [confirmDropOpen, setConfirmDropOpen] = useState(false)
  const [windowDragActive, setWindowDragActive] = useState(false)

  const fe = uploadFieldErrors || {}
  const ring = (key) =>
    fe[key] ? "ring-2 ring-orange-400 border-orange-400" : ""

  const roomOptions = storageLayout?.rooms?.map((r) => r.id) || []
  const coerceRoomId = (v) => {
    if (typeof v === "number") return v
    const n = parseInt(String(v), 10)
    return Number.isFinite(n) ? n : null
  }
  const getRoomDef = (roomIdRaw) => {
    const roomId = coerceRoomId(roomIdRaw)
    if (roomId == null) return null
    return storageLayout?.rooms?.find((r) => r.id === roomId) || null
  }
  const getCabinetsForRoom = (roomIdRaw) =>
    getRoomDef(roomIdRaw)?.cabinets || []
  const getDrawerIdsFor = (roomIdRaw, cabinetIdRaw) => {
    const roomDef = getRoomDef(roomIdRaw)
    const cabId = String(cabinetIdRaw ?? "").trim()
    if (!roomDef || !cabId) return []
    const cab = roomDef.cabinets.find((c) => c.id === cabId)
    return cab?.drawerIds || []
  }

  const isLocationValid = (roomIdRaw, cabIdRaw, drawerRaw) => {
    const roomId = coerceRoomId(roomIdRaw)
    const cabId = String(cabIdRaw || "").trim()
    const drawerId = parseInt(String(drawerRaw || ""), 10)
    if (roomId == null || !cabId || !Number.isFinite(drawerId)) return false

    const roomDef = storageLayout?.rooms?.find((r) => r.id === roomId)
    if (!roomDef) return false

    const cabDef = roomDef.cabinets?.find((c) => c.id === cabId)
    if (!cabDef) return false

    return cabDef.drawerIds?.includes(drawerId)
  }

  const mergeSelectedCabinetId = (roomIdRaw, cabIdRaw) => {
    const cabId = String(cabIdRaw || "").trim()
    const ids = getCabinetsForRoom(roomIdRaw).map((c) => c.id)
    
    // If no room is selected or invalid, provide all possible cabinet IDs from the system as options
    if (ids.length === 0) {
      const allCabs = Array.from(new Set(storageLayout?.rooms?.flatMap(r => r.cabinets.map(c => c.id)) || []))
      if (cabId && !allCabs.includes(cabId)) return [cabId, ...allCabs]
      return allCabs
    }

    if (cabId && !ids.includes(cabId)) return [cabId, ...ids]
    return ids
  }
  const mergeSelectedDrawerId = (roomIdRaw, cabIdRaw, drawerRaw) => {
    const ids = getDrawerIdsFor(roomIdRaw, cabIdRaw)
    const selected = parseInt(String(drawerRaw || ""), 10)

    // If no context (room/cab) is selected, provide all possible drawer IDs from the system
    if (ids.length === 0) {
      const allDrawers = Array.from(new Set(storageLayout?.rooms?.flatMap(r => r.cabinets.flatMap(c => c.drawerIds || [])) || []))
      allDrawers.sort((a, b) => a - b)
      if (Number.isFinite(selected) && !allDrawers.includes(selected)) return [selected, ...allDrawers]
      return allDrawers
    }

    if (Number.isFinite(selected) && !ids.includes(selected))
      return [selected, ...ids]
    return ids
  }

  const deriveYearFromStudentNo = (studentNoRaw) => {
    const raw = String(studentNoRaw || "").trim()
    const yearPart = raw.split("-")[0]
    const year = Number(yearPart)
    if (!Number.isFinite(year) || year < 2000 || year > 2100) return ""
    return String(year)
  }

  /** When linking to an existing student, only room / cabinet / drawer / doc type may change. */
  const lockIdentity = uploadStudentIsExisting
  const lockedField =
    "!bg-gray-200 dark:bg-zinc-700 !text-gray-500 dark:text-zinc-400 !border-gray-300 dark:border-white/10 cursor-not-allowed placeholder:!text-gray-400 dark:text-zinc-500 focus:!border-gray-300 dark:border-white/10 focus:!shadow-none focus:!ring-0"
  const lockedLabel = "text-gray-400 dark:text-zinc-500"

  const manualPreviewUrl = useMemo(() => {
    if (!uploadedFile) return null
    try {
      return URL.createObjectURL(uploadedFile)
    } catch {
      return null
    }
  }, [uploadedFile])

  useEffect(() => {
    return () => {
      if (manualPreviewUrl) URL.revokeObjectURL(manualPreviewUrl)
    }
  }, [manualPreviewUrl])

  const hf = useHotFolderInbox({
    enabled: uploadMode === "pdf",
    students,
    docTypes,
    showToast,
    onPromoted: onIngestPromoted,
    onOcrResult: (suggestion) => {
      if (!suggestion) return
      // Always set the docType from OCR regardless of student match
      const ocrDocType =
        suggestion.docType && String(suggestion.docType).trim()
          ? String(suggestion.docType).trim()
          : ""
      if (suggestion.matchedStudent) {
        // Existing student matched — lock the form fields to their record.
        onSelectExistingStudent?.(suggestion.matchedStudent, ocrDocType)
      } else {
        // No match — only fill in the name/docType, leave form unlocked for manual entry.
        setNewRec?.((p) => ({
          ...p,
          name: suggestion.name
            ? String(suggestion.name).trim().replace(/\s+/g, " ").toUpperCase()
            : p.name,
          docType: ocrDocType || p.docType,
        }))
      }
    },
  })

  useEffect(() => {
    if (uploadMode !== "pdf" || (!uploadedFile && !hf.selectedRow)) return

    let dragCounter = 0

    const handleDragEnter = (e) => {
      e.preventDefault()
      dragCounter++
      if (dragCounter === 1) {
        setWindowDragActive(true)
      }
    }

    const handleDragLeave = (e) => {
      e.preventDefault()
      dragCounter--
      if (dragCounter === 0) {
        setWindowDragActive(false)
      }
    }

    const handleDragOver = (e) => {
      e.preventDefault()
    }

    const handleDrop = (e) => {
      e.preventDefault()
      dragCounter = 0
      setWindowDragActive(false)
      setDropActive(false)
    }

    window.addEventListener("dragenter", handleDragEnter)
    window.addEventListener("dragleave", handleDragLeave)
    window.addEventListener("dragover", handleDragOver)
    window.addEventListener("drop", handleDrop)

    return () => {
      window.removeEventListener("dragenter", handleDragEnter)
      window.removeEventListener("dragleave", handleDragLeave)
      window.removeEventListener("dragover", handleDragOver)
      window.removeEventListener("drop", handleDrop)
    }
  }, [uploadMode, uploadedFile, hf.selectedRow, setDropActive])

  const [pdfPreviewDataUrl, setPdfPreviewDataUrl] = useState(null)
  const [pdfRendering, setPdfRendering] = useState(false)

  useEffect(() => {
    let active = true
    const file = uploadedFile
    const selectedRow = hf.selectedRow
    const previewUrl = hf.previewUrl

    const mime = selectedRow ? hf.previewMime : file?.type
    const isPdf =
      mime === "application/pdf" ||
      (!mime &&
        (file?.name?.toLowerCase()?.endsWith(".pdf") ||
          selectedRow?.original_filename?.toLowerCase()?.endsWith(".pdf")))

    if (!isPdf) {
      setPdfPreviewDataUrl(null)
      setPdfRendering(false)
      return
    }

    const renderPdfToImage = async () => {
      setPdfRendering(true)
      try {
        let data
        if (selectedRow && previewUrl) {
          const res = await fetch(previewUrl)
          if (!res.ok) throw new Error("Failed to fetch PDF file")
          data = await res.arrayBuffer()
        } else if (file) {
          data = await file.arrayBuffer()
        }

        if (!data || !active) return

        const pdfjs = await import("pdfjs-dist/build/pdf.mjs")
        pdfjs.GlobalWorkerOptions.workerSrc = "/pdfjs/pdf.worker.min.mjs"

        const loadingTask = pdfjs.getDocument({ data })
        const pdf = await loadingTask.promise
        if (!active) return

        const page = await pdf.getPage(1)
        if (!active) return

        const viewport = page.getViewport({ scale: 1.5 })
        const canvas = document.createElement("canvas")
        const context = canvas.getContext("2d")
        canvas.height = viewport.height
        canvas.width = viewport.width

        const renderContext = {
          canvasContext: context,
          viewport: viewport,
        }

        await page.render(renderContext).promise
        if (!active) return

        const dataUrl = canvas.toDataURL("image/png")
        if (active) {
          setPdfPreviewDataUrl(dataUrl)
          setPdfRendering(false)
        }
      } catch (err) {
        console.error("Failed to render PDF preview:", err)
        if (active) {
          setPdfRendering(false)
        }
      }
    }

    renderPdfToImage()

    return () => {
      active = false
    }
  }, [uploadedFile, hf.selectedRow, hf.previewUrl, hf.previewMime])

  const handlePdfFileSelect = (files) => {
    if (!files) return
    hf.clearIngestSelection()
    onFileSelect(files)
  }

  const handleClearPdf = () => {
    hf.clearIngestSelection()
    onClearFile()
  }

  const onPdfDrop = (e) => {
    e.preventDefault()
    setDropActive(false)
    const files = e.dataTransfer.files
    if (!files || files.length === 0) return

    const validFiles = Array.from(files).filter(f => {
      const isPdf =
        f.type === "application/pdf" ||
        String(f.name || "")
          .toLowerCase()
          .endsWith(".pdf")
      const isImg = String(f.type || "").startsWith("image/")
      return isPdf || isImg
    })

    if (validFiles.length === 0) return
    handlePdfFileSelect(validFiles)
  }

  const normalizedTypedName = String(newRec?.name || "")
    .trim()
    .toLowerCase()
  const nameSuggestions = useMemo(() => {
    if (!normalizedTypedName || normalizedTypedName.length < 2 || lockIdentity)
      return []
    const terms = normalizedTypedName.split(/\s+/).filter(Boolean)
    const ranked = students
      .map((s) => {
        const name = String(s?.name || "")
        const nameLower = name.toLowerCase()
        const studentNo = String(s?.studentNo || s?.student_no || "")
        const allTermsHit = terms.every((t) => nameLower.includes(t))
        if (!allTermsHit) return null
        const startsWith = nameLower.startsWith(normalizedTypedName) ? 1 : 0
        return { student: s, score: startsWith }
      })
      .filter(Boolean)
      .sort((a, b) => b.score - a.score)
      .slice(0, 6)
      .map((x) => x.student)
    return ranked
  }, [students, normalizedTypedName, lockIdentity])

  return (
    <div
      id="view-upload"
      className="animate-fade-up font-inter flex h-full min-h-0 w-full flex-col"
    >
      <Card className="flex flex-1 flex-col overflow-hidden rounded-[2rem] border border-gray-200 bg-white shadow-2xl shadow-gray-200/50 backdrop-blur-xl dark:border-white/10 dark:bg-card/80 dark:shadow-none">
        <PageHeader
          icon="ph-scan"
          title="Scan & Upload"
          description="Scan student records or import files to save them digitally."
          actions={
            <div className="flex items-center gap-3">
              <div className="flex flex-col items-end gap-1">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest dark:text-zinc-500">Status</p>
                <p className="text-[10px] font-medium text-gray-500 whitespace-nowrap dark:text-zinc-400">
                  {uploadMode === "pdf" ? "Checking scanner..." : "Ready to upload"}
                </p>
              </div>
              <RefreshButton 
                onRefresh={() => {
                  if (uploadMode === "pdf") hf.refresh()
                }} 
                isLoading={hf.isLoading} 
                title="Refresh Inbox"
              />
            </div>
          }
        />

        <CardContent className="flex min-h-0 flex-1 flex-col p-6 pt-4">
          {loading ? (
            <div className="flex h-full w-full flex-1 flex-col items-center justify-center bg-white p-10 min-h-[400px] dark:bg-card">
              <div className="flex flex-col items-center gap-4">
                <i className="ph-bold ph-spinner animate-spin text-4xl text-pup-maroon dark:text-primary" />
                <p className="text-sm font-bold text-gray-500 uppercase tracking-widest dark:text-zinc-400">
                  Loading...
                </p>
              </div>
            </div>
          ) : error ? (
            <div className="flex min-h-0 flex-1 flex-col items-center justify-center p-6">
              <Empty className="flex h-[320px] flex-col items-center justify-center border-0 text-center text-gray-500 dark:text-zinc-400">
                <EmptyHeader className="flex flex-col items-center gap-0">
                  <EmptyMedia className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-card dark:shadow-none">
                    <i className="ph-duotone ph-warning-circle text-3xl text-pup-maroon dark:text-primary" />
                  </EmptyMedia>
                  <EmptyTitle className="text-lg font-bold text-gray-900 dark:text-zinc-50">
                    Could not load tab
                  </EmptyTitle>
                  <EmptyDescription className="mt-1 max-w-md text-sm font-medium text-gray-600 dark:text-zinc-300">
                    {error}
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            </div>
          ) : (
            <>
              <ConfirmModal
                open={clearInboxOpen}
                title="Clear scanner inbox?"
                message={`This will remove ${hf.rows.length} queued item(s) from the scanner inbox. You can’t undo this.`}
                confirmLabel="CLEAR INBOX"
                onConfirm={async () => {
                  await hf.clearInbox()
                  setClearInboxOpen(false)
                }}
                onCancel={() => setClearInboxOpen(false)}
                isLoading={hf.loading}
                variant="danger"
              />

              <ConfirmModal
                open={confirmDropOpen}
                title="Replace loaded document?"
                message="An existing document is already loaded in the preview area. Are you sure you want to replace it with the new file?"
                confirmLabel="REPLACE FILE"
                onConfirm={() => {
                  if (pendingDroppedFile) {
                    handlePdfFileSelect(pendingDroppedFile)
                  }
                  setPendingDroppedFile(null)
                  setConfirmDropOpen(false)
                }}
                onCancel={() => {
                  setPendingDroppedFile(null)
                  setConfirmDropOpen(false)
                }}
                variant="warning"
              />

              {/* Mode Toggles */}
              <div className="mb-6 flex shrink-0 select-none flex-col items-center gap-3 sm:flex-row">
                <div className="flex w-full items-center sm:w-auto">
                  <div className="flex cursor-default items-center overflow-hidden rounded-brand border border-gray-200 bg-gray-100 p-0.5 backdrop-blur-sm sm:w-auto dark:border-white/10 dark:bg-muted/50">
                    <button
                      type="button"
                      onClick={() => setUploadMode("pdf")}
                      className={cn(
                        "group flex h-11 w-44 cursor-pointer items-center justify-center gap-3 px-8 text-sm font-bold transition-all duration-200 active:scale-[0.98]",
                        uploadMode === "pdf"
                          ? "rounded-l-[calc(var(--radius)-2px)] rounded-r-none bg-white text-pup-maroon shadow-sm ring-1 ring-inset ring-black/5 dark:bg-zinc-900 dark:text-primary dark:ring-white/10"
                          : "text-gray-500 ring-transparent hover:bg-white/50 hover:text-gray-700 dark:text-zinc-500 dark:hover:bg-white/5 dark:hover:text-zinc-200"
                      )}
                    >
                      <i
                        className={`ph-bold ph-file-pdf ${uploadMode === "pdf" ? "" : "text-gray-400 group-hover:text-gray-600 dark:text-zinc-500 dark:group-hover:text-zinc-300 dark:hover:text-zinc-300"}`}
                      />
                      <span className="whitespace-nowrap tracking-wide">DOCUMENT</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setUploadMode("csv")}
                      className={cn(
                        "group flex h-11 w-44 cursor-pointer items-center justify-center gap-3 px-8 text-sm font-bold transition-all duration-200 active:scale-[0.98]",
                        uploadMode === "csv"
                          ? "rounded-r-[calc(var(--radius)-2px)] rounded-l-none bg-white text-pup-maroon shadow-sm ring-1 ring-inset ring-black/5 dark:bg-zinc-900 dark:text-primary dark:ring-white/10"
                          : "text-gray-500 ring-transparent hover:bg-white/50 hover:text-gray-700 dark:text-zinc-500 dark:hover:text-zinc-500 dark:hover:bg-white/5 dark:hover:text-zinc-200"
                      )}
                    >
                      <i
                        className={`ph-bold ph-file-csv ${uploadMode === "csv" ? "" : "text-gray-400 group-hover:text-gray-600 dark:text-zinc-500 dark:group-hover:text-zinc-300 dark:hover:text-zinc-300"}`}
                      />
                      <span className="whitespace-nowrap tracking-wide">BATCH (CSV)</span>
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex min-h-0 flex-1 flex-col gap-4 lg:flex-row">
                <section
                  className={`relative flex h-full min-h-0 flex-col items-center justify-center rounded-brand border border-gray-300 bg-white p-8 shadow-sm transition-all duration-300 ${ uploadMode === "csv" ? "w-full lg:w-[70%]" : "lg:w-[48%]" } dark:border-white/10 dark:bg-card dark:shadow-none`}
                >
                  {uploadMode === "csv" ? (
                    <div className="flex h-full w-full flex-col overflow-hidden rounded-brand border border-gray-200 bg-white dark:border-white/10 dark:bg-card">
                      <div className="flex flex-col items-center justify-between gap-4 border-b border-gray-100 bg-gray-50/50 p-6 px-8 sm:flex-row dark:border-white/10 dark:bg-white/5">
                        <div className="flex items-center gap-4">
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-white text-pup-maroon dark:text-primary shadow-sm dark:border-white/10 dark:bg-card dark:text-primary dark:shadow-none">
                            <i className="ph-duotone ph-table text-2xl"></i>
                          </div>
                          <div>
                            <h3 className="text-lg font-black tracking-tight text-gray-900 dark:text-zinc-50">
                              CSV Preview
                            </h3>
                            <div className="mt-0.5 text-xs leading-tight font-medium text-gray-500 dark:text-zinc-400">
                              {csvFile ? (
                                <div className="flex flex-col gap-0.5">
                                  <span className="flex items-center gap-1.5 font-bold break-all text-gray-800 dark:text-zinc-100">
                                    <i className="ph-bold ph-file-csv text-pup-maroon dark:text-primary" />{" "}
                                    {csvFile.name}
                                  </span>
                                  <span className="text-gray-500 dark:text-zinc-400">
                                    {csvRows.length} rows detected ·{" "}
                                    {csvRows.filter((r) => r.error).length} invalid
                                    rows
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
                            className="h-9 shrink-0 rounded-brand border-gray-300 px-4 text-[10px] font-black tracking-widest text-gray-700 uppercase shadow-sm transition-all hover:border-gray-300 hover:bg-red-50 hover:text-pup-maroon dark:hover:text-red-500 dark:text-zinc-200 dark:shadow-none dark:hover:border-zinc-700 dark:bg-red-950/30 dark:border-white/10"
                          >
                            <i className="ph-bold ph-x-circle mr-1.5 text-xs" />
                            CLEAR FILE
                          </Button>
                        )}
                      </div>

                      <div
                        className={`min-h-0 flex-1 overflow-auto transition-colors duration-200 ${csvDropActive ? "bg-red-50" : ""} dark:bg-red-950/40`}
                        onDragOver={(e) => {
                          e.preventDefault()
                          setCsvDropActive(true)
                        }}
                        onDragLeave={(e) => {
                          e.preventDefault()
                          setCsvDropActive(false)
                        }}
                        onDrop={(e) => {
                          e.preventDefault()
                          setCsvDropActive(false)
                          const file = e.dataTransfer.files?.[0]
                          if (
                            file &&
                            (file.name.endsWith(".csv") || file.type === "text/csv")
                          ) {
                            handleCsvFileSelect(file)
                          }
                        }}
                      >
                        {csvRows.length ? (
                          <table className="min-w-full text-xs">
                            <thead className="sticky top-0 z-10 border-b border-gray-200 bg-gray-50 dark:border-white/10 dark:bg-muted">
                              <tr className="text-left text-[11px] font-black tracking-widest text-gray-500 uppercase dark:text-zinc-400 dark:border-white/10">
                                <th className="w-10 p-3 text-center">
                                  <input
                                    type="checkbox"
                                    className="h-4 w-4 cursor-pointer rounded border-gray-300 text-pup-maroon dark:text-primary accent-pup-maroon focus:ring-pup-maroon dark:text-primary dark:border-white/10"
                                    checked={
                                      csvRows.length > 0 &&
                                      Object.values(csvSelected).filter(Boolean)
                                        .length === csvRows.length
                                    }
                                    onChange={(e) =>
                                      toggleCsvSelectAll(e.target.checked)
                                    }
                                  />
                                </th>
                                <th className="px-4 py-3 whitespace-nowrap">#</th>
                                <th className="px-4 py-3 whitespace-nowrap">Student No</th>
                                <th className="px-4 py-3 whitespace-nowrap">Name</th>
                                <th className="px-4 py-3 whitespace-nowrap">Course</th>
                                <th className="px-4 py-3 whitespace-nowrap">Year</th>
                                <th className="px-4 py-3 whitespace-nowrap">Section</th>
                                <th className="px-4 py-3 whitespace-nowrap">Room</th>
                                <th className="px-4 py-3 whitespace-nowrap">Cab</th>
                                <th className="px-4 py-3 whitespace-nowrap">Drawer</th>
                                <th className="px-4 py-3 whitespace-nowrap">Error</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-white/10">
                              {csvRows.slice(0, 100).map((r) => {
                                const isValid = isLocationValid(r.student.room, r.student.cabinet, r.student.drawer)

                                return (
                                  <tr
                                    key={r.index}
                                    className={`transition-colors hover:bg-gray-50 ${csvSelected?.[r.index] ? (isValid ? "bg-red-50" : "bg-orange-50") : ""} dark:hover:bg-white/10 dark:bg-card`}
                                  >
                                    <td className="p-3 text-center">
                                      <input
                                        type="checkbox"
                                        className="h-4 w-4 cursor-pointer rounded border-gray-300 text-pup-maroon dark:text-primary accent-pup-maroon focus:ring-pup-maroon dark:text-primary dark:border-white/10"
                                        checked={!!csvSelected?.[r.index]}
                                        onChange={() => toggleCsvRowSelected(r.index)}
                                      />
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap font-mono text-[10px] text-gray-400 dark:text-zinc-500">
                                      {r.index}
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap font-mono font-bold text-gray-900 dark:text-zinc-50">
                                      {r.student.studentNo}
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap font-bold text-gray-800 dark:text-zinc-100">
                                      {r.student.name}
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap">
                                      <Badge
                                        variant="outline"
                                        className="border-0 bg-blue-50 text-[9px] font-black tracking-tighter text-blue-700 uppercase dark:bg-blue-950/30"
                                      >
                                        {r.student.courseCode}
                                      </Badge>
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap font-bold text-gray-600 dark:text-zinc-300">
                                      {r.student.yearLevel}
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap font-bold text-gray-600 dark:text-zinc-300">
                                      {r.student.section}
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap">
                                      <Select
                                        className={cn(
                                          "h-8 min-w-[80px] rounded border border-gray-300 px-2 py-0 text-[11px] font-bold dark:border-white/10",
                                          !isValid && "border-orange-500 bg-orange-50 dark:bg-orange-950/20"
                                        )}
                                        value={String(r.student.room || "")}
                                        onChange={(e) =>
                                          setCsvRowField(
                                            r.index,
                                            "room",
                                            parseInt(e.target.value)
                                          )
                                        }
                                      >
                                        {roomOptions.map((room) => (
                                          <option key={room} value={room}>
                                            Room {room}
                                          </option>
                                        ))}
                                      </Select>
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap">
                                      <Select
                                        className={cn(
                                          "h-8 min-w-[80px] rounded border border-gray-300 px-2 py-0 text-[11px] font-bold dark:border-white/10",
                                          !isValid && "border-orange-500 bg-orange-50 dark:bg-orange-950/20"
                                        )}
                                        value={String(r.student.cabinet || "")}
                                        onChange={(e) =>
                                          setCsvRowField(
                                            r.index,
                                            "cabinet",
                                            e.target.value
                                          )
                                        }
                                      >
                                        {mergeSelectedCabinetId(
                                          r.student.room,
                                          r.student.cabinet
                                        ).map((c) => (
                                          <option key={c} value={c}>
                                            Cab {c}
                                          </option>
                                        ))}
                                      </Select>
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap">
                                      <Select
                                        className={cn(
                                          "h-8 min-w-[80px] rounded border border-gray-300 px-2 py-0 text-[11px] font-bold dark:border-white/10",
                                          !isValid && "border-orange-500 bg-orange-50 dark:bg-orange-950/20"
                                        )}
                                        value={String(r.student.drawer || "")}
                                        onChange={(e) =>
                                          setCsvRowField(
                                            r.index,
                                            "drawer",
                                            parseInt(e.target.value)
                                          )
                                        }
                                      >
                                        {mergeSelectedDrawerId(
                                          r.student.room,
                                          r.student.cabinet,
                                          r.student.drawer
                                        ).map((d) => (
                                          <option key={d} value={d}>
                                            Draw {d}
                                          </option>
                                        ))}
                                      </Select>
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap">
                                      {r.error ? (
                                        <div className="flex items-center gap-1 text-red-600">
                                          <i className="ph-bold ph-warning-circle text-sm" />
                                          <span className="text-[9px] leading-none font-black tracking-tighter uppercase">
                                            Error
                                          </span>
                                        </div>
                                      ) : !isValid ? (
                                        <div className="flex items-center gap-1 text-orange-600" title="This location does not exist in the physical system.">
                                          <i className="ph-bold ph-warning text-sm" />
                                          <span className="text-[9px] leading-none font-black tracking-tighter uppercase">
                                            Invalid Location
                                          </span>
                                        </div>
                                      ) : (
                                        <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                                          <i className="ph-bold ph-check-circle text-sm" />
                                          <span className="text-[9px] leading-none font-black tracking-tighter uppercase">
                                            Valid
                                          </span>
                                        </div>
                                      )}
                                    </td>
                                  </tr>
                                )
                              })}
                            </tbody>
                          </table>
                        ) : (
                          <div
                            className={`group flex h-full cursor-pointer items-center justify-center rounded-brand border-2 border-dashed p-12 transition-all ${ csvDropActive ? "border-gray-300 bg-red-50 shadow-inner" : "bg-gray-50 hover:border-gray-300 hover:bg-red-50" } dark:border-white/10 dark:bg-red-950/30 dark:shadow-none dark:hover:border-zinc-700`}
                            onClick={() => csvInputRef.current?.click()}
                          >
                            <Empty className="pointer-events-none flex flex-col items-center justify-center border-0 bg-transparent text-center">
                              <EmptyHeader className="flex flex-col items-center gap-0">
                                <div className="relative mb-6">
                                  <div className="absolute inset-0 scale-150 animate-pulse rounded-full bg-gray-50 opacity-50 dark:bg-card"></div>
                                  <EmptyMedia className="relative z-10 flex h-24 w-24 items-center justify-center rounded-3xl border border-gray-200 bg-white shadow-xl rotate-3 transition-transform group-hover:scale-105 dark:border-white/10 dark:bg-card dark:shadow-none">
                                    <i className="ph-duotone ph-file-arrow-up text-5xl text-gray-300 dark:text-zinc-600"></i>
                                  </EmptyMedia>
                                </div>
                                <EmptyTitle className="text-xl font-black text-gray-900 dark:text-zinc-50">
                                  Drop CSV File here
                                </EmptyTitle>
                                <EmptyDescription className="mt-2 max-w-xs text-sm font-medium text-gray-600 dark:text-zinc-300">
                                  or click to browse local files (.csv)
                                </EmptyDescription>
                              </EmptyHeader>
                            </Empty>
                          </div>
                        )}
                        {csvRows.length > 100 ? (
                          <div className="border-t border-gray-200 p-3 text-xs font-medium text-gray-600 dark:border-white/10 dark:text-zinc-300">
                            Showing first 100 rows.
                          </div>
                        ) : null}
                      </div>
                    </div>
                  ) : (
                    <div
                      className={`group relative flex h-full min-h-[320px] w-full flex-col overflow-hidden rounded-brand border border-dashed bg-gray-50 transition-all ${ fe.pdfFile ? "border-orange-400 bg-orange-50/30 ring-2 ring-orange-400" : "border-gray-300 hover:border-pup-maroon/40 hover:bg-red-50" } ${dropActive ? "bg-red-50 border-pup-maroon/40" : ""} dark:bg-white/5 dark:border-white/10`}
                      onDragOver={(e) => {
                        e.preventDefault()
                        setDropActive(true)
                      }}
                      onDragLeave={(e) => {
                        e.preventDefault()
                        setDropActive(false)
                      }}
                      onDrop={onPdfDrop}
                    >
                      {hf.rows.length > 0 ? (
                        <div className="z-10 shrink-0 border-b border-gray-200 bg-white p-3 dark:border-white/10 dark:bg-card/95">
                          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                            <div>
                              <div className="text-xs font-bold text-gray-600 uppercase dark:text-zinc-300">
                                Scanner Files
                              </div>
                              <div className="text-sm font-bold text-gray-900 dark:text-zinc-50">
                                {hf.rows.length} waiting · auto-refresh ~3s
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                className="h-8 rounded-brand border border-gray-300 bg-white px-3 text-xs font-bold text-gray-800 hover:border-gray-300 disabled:opacity-60 dark:bg-card dark:text-zinc-100 dark:hover:border-zinc-700 dark:border-white/10"
                                disabled={hf.rows.length === 0 || hf.loading}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setClearInboxOpen(true)
                                }}
                              >
                                CLEAR INBOX
                              </button>
                              <RefreshButton 
                                onRefresh={(e) => {
                                  e.stopPropagation()
                                  hf.refresh()
                                }} 
                                isLoading={hf.loading} 
                                className="h-8 w-8"
                              />
                            </div>
                          </div>
                          <div className="max-h-[min(40vh,220px)] space-y-1 overflow-y-auto pr-1">
                            {hf.rows.map((row) => (
                              <button
                                key={row.id}
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  // Fetch the file blob and set it as the uploaded file for direct submission
                                  hf.openItem(row).then((file) => {
                                    if (file) {
                                      onFileSelect(file, true)
                                      hf.clearIngestSelection()
                                    }
                                  })
                                }}
                                className={`w-full rounded-brand border p-2.5 text-left transition-colors ${ hf.selected === row.id ? "border-gray-300 bg-red-50" : "border-transparent bg-gray-50 hover:bg-gray-100" } dark:border-white/10 dark:bg-red-950/50 dark:hover:bg-white/10`}
                              >
                                <div className="truncate text-sm font-bold text-gray-900 dark:text-zinc-50">
                                  {row.original_filename}
                                </div>
                                <div className="mt-0.5 text-xs font-medium text-gray-600 dark:text-zinc-300">
                                  {row.mime_type} ·{" "}
                                  {(Number(row.size_bytes || 0) / 1024).toFixed(1)}{" "}
                                  KB
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      ) : null}

                      {uploadedFile ? (
                        <div
                          className={`relative flex-1 flex flex-col overflow-hidden rounded-brand bg-white border transition-all duration-200 ${ dropActive ? "border-pup-maroon ring-2 ring-pup-maroon/20 bg-red-50" : "border-gray-200" } dark:bg-card dark:border-white/10`}
                          onDragOver={(e) => {
                            e.preventDefault()
                            setDropActive(true)
                          }}
                          onDragLeave={(e) => {
                            e.preventDefault()
                            setDropActive(false)
                          }}
                          onDrop={onPdfDrop}
                        >
                          <div className="flex shrink-0 items-center justify-between gap-2 border-b border-gray-200 bg-gray-50 px-4 py-2.5 dark:border-white/10 dark:bg-card">
                        <div className="min-w-0">
                          <div className="text-[10px] font-black tracking-widest text-gray-400 uppercase dark:text-zinc-500">
                            {hf.selectedRow ? "Scanner preview" : "Document preview"}
                          </div>
                          <div className="truncate text-sm font-bold text-gray-900 dark:text-zinc-50">
                            {hf.selectedRow?.original_filename || uploadedFile?.name}
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          {(hf.ocrLoading || ocrLoading) && (
                            <span className="flex items-center gap-2 text-xs font-bold text-pup-maroon dark:text-primary">
                              <div className="h-3 w-3 animate-spin rounded-full border border-gray-300 border-t-pup-maroon dark:border-white/10" />
                              Scanning…
                            </span>
                          )}
                          <div className="flex items-center gap-1.5 border-l border-gray-200 pl-2 dark:border-white/10">
                            <button
                              type="button"
                              className="flex h-8 w-8 items-center justify-center rounded-brand border border-gray-300 bg-white text-gray-600 shadow-sm transition-all hover:border-gray-300 hover:text-pup-maroon dark:hover:text-red-500 dark:bg-card dark:text-zinc-300 dark:shadow-none dark:hover:border-zinc-700 dark:border-white/10"
                              onClick={() => setRotation((r) => r - 90)}
                              title="Rotate Left"
                            >
                              <i className="ph-bold ph-arrow-counter-clockwise text-xs" />
                            </button>
                            <button
                              type="button"
                              className="flex h-8 w-8 items-center justify-center rounded-brand border border-gray-300 bg-white text-gray-600 shadow-sm transition-all hover:border-gray-300 hover:text-pup-maroon dark:hover:text-red-500 dark:bg-card dark:text-zinc-300 dark:shadow-none dark:hover:border-zinc-700 dark:border-white/10"
                              onClick={() => setRotation((r) => r + 90)}
                              title="Rotate Right"
                            >
                              <i className="ph-bold ph-arrow-clockwise text-xs" />
                            </button>
                            <button
                              type="button"
                              className="ml-1 flex h-8 items-center gap-2 rounded-brand border border-gray-300 bg-white px-3 text-[10px] font-black tracking-widest text-gray-700 uppercase transition-all hover:border-red-600 hover:bg-red-50 hover:text-red-700 dark:bg-card dark:text-zinc-200 dark:border-white/10"
                              onClick={() => {
                                if (hf.selectedRow) {
                                  hf.clearIngestSelection()
                                }
                                handleClearPdf()
                              }}
                            >
                              <i className="ph-bold ph-x text-xs" />
                              Close
                            </button>
                          </div>
                        </div>
                      </div>
                      <div className="min-h-0 flex-1 flex overflow-hidden bg-gray-100 relative dark:bg-muted">
                        {uploadedFiles && uploadedFiles.length > 1 && !hf.selectedRow && (
                          <div className="w-1/3 min-w-[200px] max-w-[280px] border-r border-gray-200 bg-white/95 backdrop-blur-md flex flex-col min-h-0 overflow-y-auto p-4 gap-3 dark:border-white/10 dark:bg-card/95 shrink-0 z-10">
                            <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-white/5">
                              <span className="text-[10px] font-black tracking-widest text-gray-400 uppercase dark:text-zinc-500">
                                Scan Pages ({uploadedFiles.length})
                              </span>
                              <span className="text-[9px] font-bold text-pup-maroon dark:text-primary uppercase bg-red-50 dark:bg-red-950/30 px-1.5 py-0.5 rounded-full">
                                COMBINE PAGES
                              </span>
                            </div>
                            <div className="flex-1 space-y-1.5 overflow-y-auto pr-1">
                              {uploadedFiles.map((file, idx) => {
                                const isSelected = selectedQueuedFileIndex === idx;
                                return (
                                  <div
                                    key={idx}
                                    onClick={() => {
                                      setSelectedQueuedFileIndex(idx);
                                      onFileSelect(file, true);
                                    }}
                                    className={`group flex flex-col gap-1 rounded-brand border p-3 text-left cursor-pointer transition-all ${ isSelected ? "border-pup-maroon bg-red-50/40 dark:border-primary dark:bg-zinc-800" : "border-transparent bg-gray-50 hover:bg-gray-100 dark:bg-white/5 dark:hover:bg-white/10" }`}
                                  >
                                    <div className="flex items-center justify-between gap-1.5">
                                      <span className="truncate text-xs font-black text-gray-900 dark:text-zinc-50">
                                        Page {idx + 1}
                                      </span>
                                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                          type="button"
                                          disabled={idx === 0}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            onReorderQueuedFiles(idx, -1);
                                          }}
                                          className="p-0.5 text-gray-400 hover:text-gray-900 disabled:opacity-30 dark:hover:text-zinc-200"
                                          title="Move Up"
                                        >
                                          <i className="ph-bold ph-caret-up text-xs" />
                                        </button>
                                        <button
                                          type="button"
                                          disabled={idx === uploadedFiles.length - 1}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            onReorderQueuedFiles(idx, 1);
                                          }}
                                          className="p-0.5 text-gray-400 hover:text-gray-900 disabled:opacity-30 dark:hover:text-zinc-200"
                                          title="Move Down"
                                        >
                                          <i className="ph-bold ph-caret-down text-xs" />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            onRemoveQueuedFile(idx);
                                          }}
                                          className="p-0.5 text-red-500 hover:text-red-700"
                                          title="Remove Page"
                                        >
                                          <i className="ph-bold ph-trash text-xs" />
                                        </button>
                                      </div>
                                    </div>
                                    <span className="truncate text-[10px] text-gray-500 dark:text-zinc-400" title={file.name}>
                                      {file.name}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                            <button
                              type="button"
                              onClick={() => fileInputRef.current?.click()}
                              className="mt-auto flex h-10 items-center justify-center gap-1.5 rounded-brand border border-dashed border-gray-300 bg-white text-[10px] font-black tracking-widest text-gray-600 uppercase transition-all hover:bg-gray-50 dark:bg-card dark:border-white/10 dark:text-zinc-300"
                            >
                              <i className="ph-bold ph-plus text-xs" /> Add Page
                            </button>
                          </div>
                        )}

                        <div className="flex-1 relative flex h-full items-center justify-center p-4">
                          {(() => {
                            const url = hf.selectedRow ? hf.previewUrl : manualPreviewUrl
                            const mime = hf.selectedRow ? hf.previewMime : uploadedFile?.type
                            const isImg = String(mime || "").startsWith("image/")

                            if (isImg || pdfPreviewDataUrl) {
                              return (
                                <img
                                  src={isImg ? url : pdfPreviewDataUrl}
                                  alt="Preview"
                                  className="max-h-full max-w-full rounded-md object-contain shadow-2xl transition-transform duration-300"
                                  draggable="false"
                                  style={{ transform: `rotate(${rotation}deg)` }}
                                />
                              )
                            }

                          if (pdfRendering) {
                            return (
                              <div className="flex h-full w-full flex-col items-center justify-center bg-gray-100 p-8 dark:bg-muted">
                                <div className="h-10 w-10 animate-spin rounded-full border border-gray-300 border-t-pup-maroon mb-3 dark:border-white/10" />
                                <div className="text-xs font-bold text-gray-500 uppercase tracking-widest animate-pulse dark:text-zinc-400">
                                  Loading Preview…
                                </div>
                              </div>
                            )
                          }

                          return (
                            <div className="flex h-full w-full items-center justify-center bg-gray-100 p-8 text-xs font-bold text-gray-400 dark:text-zinc-500 dark:bg-muted">
                              PREVIEW NOT AVAILABLE
                            </div>
                          )
                        })()}
                        </div>

                        {windowDragActive && (
                          <div
                            className="absolute inset-0 z-30 flex items-center justify-center bg-pup-maroon backdrop-blur-md border border-pup-maroon/20 rounded-brand animate-fade-up dark:bg-red-600/[0.04]"
                            onDragOver={(e) => {
                              e.preventDefault()
                              setDropActive(true)
                            }}
                            onDragLeave={(e) => {
                              e.preventDefault()
                              setDropActive(false)
                            }}
                            onDrop={(e) => {
                              setWindowDragActive(false)
                              setDropActive(false)
                              onPdfDrop(e)
                            }}
                          >
                            <div className="flex flex-col items-center justify-center p-6 bg-white rounded-2xl border border-gray-200 shadow-2xl max-w-xs text-center pointer-events-none animate-scale-up dark:bg-card/95 dark:border-white/10">
                              <div className="w-14 h-14 rounded-full bg-red-50 border border-red-100 flex items-center justify-center mb-3 dark:bg-red-950/30">
                                <i className="ph-duotone ph-file-arrow-up text-2xl text-pup-maroon dark:text-primary animate-bounce dark:text-primary"></i>
                              </div>
                              <p className="text-sm font-bold text-gray-900 leading-tight dark:text-zinc-50">
                                Drop file here to replace preview
                              </p>
                              <p className="text-[11px] font-bold text-pup-maroon dark:text-primary mt-1.5 uppercase tracking-wider dark:text-primary">
                                Requires Confirmation
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                      </div>
                      ) : (
                        <div
                          className="relative flex min-h-[200px] flex-1 cursor-pointer flex-col items-center justify-center p-6"
                          onClick={() => {
                            if (fileInputRef.current) fileInputRef.current.click()
                          }}
                        >
                          <Empty className="pointer-events-none flex flex-col items-center justify-center border-0 bg-transparent text-center">
                            <EmptyHeader className="flex flex-col items-center gap-0">
                              <div className="relative mb-6">
                                <div className="absolute inset-0 scale-150 animate-pulse rounded-full bg-gray-50 opacity-50 dark:bg-card"></div>
                                <EmptyMedia className="relative z-10 flex h-24 w-24 items-center justify-center rounded-3xl border border-gray-100 bg-white shadow-xl rotate-3 transition-transform group-hover:scale-105 dark:border-white/10 dark:bg-card dark:shadow-none">
                                  <i className="ph-duotone ph-file-arrow-up text-5xl text-gray-300 dark:text-zinc-600"></i>
                                </EmptyMedia>
                              </div>
                              <EmptyTitle className="text-xl font-black text-gray-900 dark:text-zinc-50">
                                Drop Document or Image here
                              </EmptyTitle>
                              <EmptyDescription className="mt-2 max-w-xs text-sm font-medium text-gray-500 dark:text-zinc-400">
                                or click to browse local files (PDF, JPG, PNG)
                              </EmptyDescription>
                              {hf.rows.length > 0 ? (
                                <EmptyDescription className="mx-auto mt-4 max-w-xs text-xs font-medium text-gray-500 dark:text-zinc-400">
                                  This area still accepts manual drops and clicks even
                                  while the scanner inbox is shown above.
                                </EmptyDescription>
                              ) : null}
                            </EmptyHeader>
                          </Empty>

                          <input
                            ref={fileInputRef}
                            type="file"
                            className="hidden"
                            accept=".pdf,image/*"
                            multiple
                            onChange={(e) => handlePdfFileSelect(e.target.files)}
                          />
                        </div>
                      )}
                    </div>
                  )}
                  {uploadMode === "pdf" && (ocrLoading || hf.ocrLoading) ? (
                    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center rounded-brand bg-white backdrop-blur-sm dark:bg-card/80">
                      <div className="w-full max-w-md px-6">
                        <div className="mb-4 text-center text-sm font-bold text-gray-800 dark:text-zinc-100">
                          Reading file…
                        </div>
                        <div className="rounded-brand border border-gray-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-card dark:shadow-none">
                          <div className="flex items-center justify-center gap-3">
                            <div className="h-10 w-10 animate-spin rounded-full border border-gray-300 border-t-pup-maroon dark:border-white/10"></div>
                            <i className="ph-duotone ph-scan animate-pulse text-3xl text-pup-maroon dark:text-primary"></i>
                          </div>
                          <div className="mt-4 h-2 w-full overflow-hidden rounded bg-gray-100 dark:bg-muted">
                            <div className="h-full w-1/2 animate-pulse bg-pup-maroon/80"></div>
                          </div>
                          <div className="mt-3 text-center text-xs font-medium text-gray-600 dark:text-zinc-300">
                            Processing scanned information...
                          </div>
                        </div>
                        <div className="mt-4 text-center text-xs font-medium text-gray-600 dark:text-zinc-300">
                          Working offline (LAN)
                        </div>
                      </div>
                    </div>
                  ) : null}
                </section>

                <section
                  className={`font-inter flex h-full min-h-0 flex-col overflow-hidden rounded-brand border border-gray-300 bg-white shadow-sm transition-all duration-300 ${ uploadMode === "csv" ? "w-full lg:w-[70%]" : "lg:w-[52%]" } dark:border-white/10 dark:bg-card dark:shadow-none`}
                >
                  <CardHeader className="flex flex-col items-center justify-between gap-4 border-b border-gray-100 bg-gray-50/50 p-6 px-8 sm:flex-row dark:border-white/10 dark:bg-white/5">
                    <div className="flex items-center gap-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-brand border border-gray-200 bg-white text-pup-maroon dark:text-primary shadow-sm dark:border-white/10 dark:bg-card dark:text-primary dark:shadow-none">
                        <i
                          className={`ph-duotone ${uploadMode === "csv" ? "ph-file-csv" : "ph-tag"} text-2xl`}
                        ></i>
                      </div>
                      <div>
                        <CardTitle className="text-xl font-black tracking-tight text-gray-900 dark:text-zinc-50">
                          {uploadMode === "csv" ? "Bulk Upload" : "Label Document"}
                        </CardTitle>
                        <CardDescription className="text-sm font-medium text-gray-500 dark:text-zinc-400">
                          {uploadMode === "csv"
                            ? "Review rows, bulk-edit locations, then import students."
                            : uploadedFile
                              ? "Review scanned information and fill in missing fields."
                              : "Drop or select a file on the left, then fill in the form here."}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>

                  <div className="flex-1 overflow-y-auto bg-gray-50 p-6 dark:bg-white/5">
                    {uploadMode === "pdf" ? (
                      <div className="space-y-5">
                        {uploadStudentIsExisting && (
                          <div className="flex flex-col gap-2 rounded-brand border border-emerald-200 bg-emerald-50 px-3 py-2.5 dark:bg-emerald-950/90">
                            <span className="inline-flex items-start gap-2 text-xs font-bold text-emerald-900">
                              <i
                                className="ph-bold ph-check-circle mt-0.5 shrink-0"
                                aria-hidden
                              />
                              <span>
                                Existing student — profile fields below are locked.
                                Adjust room, cabinet, drawer, or document type if
                                needed, then submit.
                              </span>
                            </span>
                            <button
                              type="button"
                              className="shrink-0 text-left text-xs font-bold text-pup-maroon dark:text-primary underline-offset-2 hover:underline dark:text-primary"
                              onClick={() => {
                                setUploadStudentIsExisting(false)
                                clearAllUploadFieldErrors?.()
                              }}
                            >
                              SWITCH TO NEW STUDENT
                            </button>
                          </div>
                        )}

                        <div className="grid grid-cols-1 gap-5">
                          <div>
                            <div className="mb-1.5 flex items-center justify-between">
                              <label
                                className={`block text-xs font-bold uppercase ${ lockIdentity ? lockedLabel : "text-gray-700" } dark:text-zinc-200`}
                              >
                                Student Number
                              </label>
                              {(newRec.studentNo ||
                                newRec.name ||
                                newRec.course ||
                                newRec.docType ||
                                newRec.room ||
                                newRec.cabinet ||
                                newRec.drawer ||
                                uploadedFile ||
                                hf.selected) && (
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
                                    })
                                    setUploadStudentIsExisting(false)
                                    clearAllUploadFieldErrors?.()
                                    if (uploadedFile || hf.selected) {
                                      handleClearPdf()
                                    }
                                  }}
                                  className="h-5 rounded-brand px-1.5 text-[9px] font-bold text-pup-maroon dark:text-primary hover:bg-red-50 hover:text-pup-darkMaroon dark:text-primary dark:bg-red-950/30"
                                >
                                  CLEAR ALL
                                </Button>
                              )}
                            </div>
                            <input
                              type="text"
                              className={`form-input h-11 rounded-brand font-mono ${ring("studentNo")} ${ lockIdentity ? lockedField : "" }`}
                              placeholder="202X-XXXXX-MN-0"
                              ref={newStudentNoInputRef}
                              value={newRec.studentNo}
                              disabled={lockIdentity}
                              onChange={(e) => {
                                clearUploadFieldError?.("studentNo")
                                clearUploadFieldError?.("year")
                                clearUploadFieldError?.("sectionPart")
                                setNewRecStudentNoTouched(true)
                                const masked = applyStudentNoMask(e.target.value)
                                const derivedYear = deriveYearFromStudentNo(
                                  masked.value
                                )
                                setNewRec((p) => ({
                                  ...p,
                                  studentNo: masked.value,
                                  year: derivedYear,
                                  sectionPart: "",
                                }))
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
                              className={`mb-1.5 block text-xs font-bold uppercase ${ lockIdentity ? lockedLabel : "text-gray-700" } dark:text-zinc-200`}
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
                                clearUploadFieldError?.("name")
                                setNewRec((p) => ({ ...p, name: e.target.value }))
                              }}
                            />
                            {!lockIdentity && nameSuggestions.length > 0 ? (
                              <div className="mt-2 overflow-hidden rounded-brand border border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-card dark:shadow-none">
                                {nameSuggestions.map((s) => {
                                  const studentNo = String(
                                    s?.studentNo || s?.student_no || ""
                                  )
                                  return (
                                    <button
                                      key={studentNo}
                                      type="button"
                                      className="w-full border-b border-gray-300 px-3 py-2 text-left transition-colors last:border-b-0 hover:bg-red-50 dark:bg-red-950/50 dark:border-white/10"
                                      onClick={() => onSelectExistingStudent?.(s)}
                                    >
                                      <div className="text-sm font-bold text-gray-900 dark:text-zinc-50">
                                        {s?.name}
                                      </div>
                                      <div className="font-mono text-xs text-gray-600 dark:text-zinc-300">
                                        {studentNo}
                                      </div>
                                    </button>
                                  )
                                })}
                              </div>
                            ) : null}
                          </div>
                        </div>

                        <div>
                          <label
                            className={`mb-1.5 block text-xs font-bold uppercase ${ lockIdentity ? lockedLabel : "text-gray-700" } dark:text-zinc-200`}
                          >
                            Course / Program
                          </label>
                          <Select
                            placeholder="Select Course"
                            className={`h-11 rounded-brand ${ring("course")} ${lockIdentity ? lockedField : "border border-gray-300 dark:border-white/10"}`}
                            value={newRec.course}
                            disabled={lockIdentity}
                            onChange={(e) => {
                              clearUploadFieldError?.("course")
                              setNewRec((p) => ({
                                ...p,
                                course: e.target.value,
                                sectionPart: "",
                              }))
                            }}
                          >
                            {courses.map((c) => (
                              <option key={c.code} value={c.code}>
                                {c.name}
                              </option>
                            ))}
                          </Select>
                        </div>

                        <div>
                          <label
                            className={`mb-1.5 block text-xs font-bold uppercase ${ lockIdentity ? lockedLabel : "text-gray-700" } dark:text-zinc-200`}
                          >
                            Section
                          </label>
                          <Select
                            placeholder="Select Section"
                            className={`h-11 rounded-brand ${ring("sectionPart")} ${lockIdentity ? lockedField : "border border-gray-300 dark:border-white/10"}`}
                            value={newRec.sectionPart}
                            onChange={(e) => {
                              clearUploadFieldError?.("sectionPart")
                              setNewRec((p) => ({
                                ...p,
                                sectionPart: e.target.value,
                              }))
                            }}
                            disabled={lockIdentity || !newRec.course}
                          >
                            {sysSections.map((sec) => (
                              <option key={sec.id} value={sec.name}>
                                {sec.name}
                              </option>
                            ))}
                          </Select>
                        </div>

                        <div className="grid grid-cols-3 gap-5">
                          <div>
                            <label className="mb-1.5 block text-xs font-bold text-gray-700 uppercase dark:text-zinc-200">
                              Room
                            </label>
                            <Select
                              placeholder=""
                              className={`h-11 rounded-brand ${ring("room")} border border-gray-300 dark:border-white/10`}
                              value={String(newRec.room || "")}
                              onChange={(e) => {
                                clearUploadFieldError?.("room")
                                const nextRoom = e.target.value
                                  ? parseInt(e.target.value, 10)
                                  : ""
                                setNewRec((p) => ({
                                  ...p,
                                  room: nextRoom,
                                  cabinet: "",
                                  drawer: "",
                                }))
                              }}
                            >
                              {roomOptions.map((r) => (
                                <option key={r} value={r}>
                                  {r}
                                </option>
                              ))}
                            </Select>
                          </div>
                          <div>
                            <label className="mb-1.5 block text-xs font-bold text-gray-700 uppercase dark:text-zinc-200">
                              Cabinet
                            </label>
                            <Select
                              placeholder=""
                              className={`h-11 rounded-brand ${ring("cabinet")} border border-gray-300 dark:border-white/10`}
                              value={newRec.cabinet}
                              onChange={(e) => {
                                clearUploadFieldError?.("cabinet")
                                setNewRec((p) => ({
                                  ...p,
                                  cabinet: e.target.value,
                                  drawer: "",
                                }))
                              }}
                            >
                              {mergeSelectedCabinetId(
                                newRec.room,
                                newRec.cabinet
                              ).map((c) => (
                                <option key={c} value={c}>
                                  {c}
                                </option>
                              ))}
                            </Select>
                          </div>
                          <div>
                            <label className="mb-1.5 block text-xs font-bold text-gray-700 uppercase dark:text-zinc-200">
                              Drawer
                            </label>
                            <Select
                              placeholder=""
                              className={`h-11 rounded-brand ${ring("drawer")} border border-gray-300 dark:border-white/10`}
                              value={String(newRec.drawer || "")}
                              onChange={(e) => {
                                clearUploadFieldError?.("drawer")
                                setNewRec((p) => ({ ...p, drawer: e.target.value }))
                              }}
                            >
                              {mergeSelectedDrawerId(
                                newRec.room,
                                newRec.cabinet,
                                newRec.drawer
                              ).map((d) => (
                                <option key={d} value={d}>
                                  {d}
                                </option>
                              ))}
                            </Select>
                          </div>
                        </div>

                        <div className="border-t border-gray-200 pt-4 dark:border-white/10">
                          <label className="mb-1.5 block text-xs font-bold text-gray-700 uppercase dark:text-zinc-200">
                            Document Type
                          </label>
                          <Select
                            placeholder="Select Document Type"
                            className={`h-11 rounded-brand ${ring("docType")} border border-gray-300 dark:border-white/10`}
                            value={newRec.docType}
                            onChange={(e) => {
                              clearUploadFieldError?.("docType")
                              setNewRec((p) => ({ ...p, docType: e.target.value }))
                            }}
                          >
                            {docTypes.map((t) => (
                              <option key={t} value={t}>
                                {t}
                              </option>
                            ))}
                          </Select>
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            processSubmission({
                              onSuccess: (ids) => {
                                if (Array.isArray(ids) && ids.length > 0) {
                                  ids.forEach(id => hf.removeIngestItem(id));
                                } else {
                                  hf.removeIngestItem();
                                }
                              },
                            })
                          }
                          className="flex h-10 w-full items-center justify-center gap-2 rounded-brand btn-brand-red text-sm font-bold text-white transition-all dark:shadow-none"
                        >
                          <i className="ph-bold ph-upload-simple" /> SUBMIT UPLOAD
                        </button>

                        {uploadError ? (
                          <div className="mt-3 rounded-brand border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-800 dark:bg-red-950/30">
                            {uploadError}
                          </div>
                        ) : null}
                      </div>
                    ) : (
                      <div className="space-y-5">
                        <div>
                          <label className="mb-2 block text-xs font-bold tracking-wider text-gray-700 uppercase dark:text-zinc-200">
                            Source File
                          </label>
                          <div className="flex items-center gap-2">
                            <div className="relative flex-1">
                              <input
                                ref={csvInputRef}
                                type="file"
                                accept=".csv,text/csv"
                                className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
                                onChange={(e) =>
                                  handleCsvFileSelect(e.target.files?.[0] || null)
                                }
                              />
                              <div className="flex h-11 items-center gap-2 rounded-brand border border-dashed border-gray-300 bg-white px-3 dark:bg-card dark:border-white/10">
                                <i className="ph-bold ph-file-csv text-pup-maroon dark:text-primary"></i>
                                <span className="truncate text-xs font-bold text-gray-600 dark:text-zinc-300">
                                  {csvFile ? csvFile.name : "Select CSV..."}
                                </span>
                              </div>
                            </div>
                            {csvFile && (
                              <button
                                type="button"
                                onClick={() => handleCsvFileSelect(null)}
                                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-brand border border-gray-300 bg-white text-gray-500 shadow-sm transition-all hover:border-red-600 hover:text-red-600 dark:bg-card dark:text-zinc-400 dark:shadow-none dark:border-white/10"
                                title="Clear file"
                              >
                                <i className="ph-bold ph-trash text-lg" />
                              </button>
                            )}
                          </div>
                        </div>

                        {csvError ? (
                          <div className="rounded-brand border border-red-200 bg-red-50 p-3 text-xs font-bold text-red-800 dark:bg-red-950/30">
                            {csvError}
                          </div>
                        ) : null}

                        <div className="overflow-hidden rounded-brand border border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-card dark:shadow-none">
                          <div className="border-b border-gray-100 bg-gray-50 p-4 dark:border-white/10 dark:bg-muted/30">
                            <div className="text-[10px] font-black tracking-widest text-gray-400 uppercase dark:text-zinc-500">
                              Bulk Edit
                            </div>
                            <div className="mt-1 text-sm font-black text-gray-900 dark:text-zinc-50">
                              {Object.values(csvSelected).filter(Boolean).length}{" "}
                              rows selected
                            </div>
                          </div>

                          <div className="space-y-4 p-4">
                            <div>
                              <label className="mb-1.5 block text-xs font-bold tracking-wider text-gray-500 uppercase dark:text-zinc-400">
                                Room
                              </label>
                              <Select
                                className="h-11 rounded-brand text-sm border border-gray-300 dark:border-white/10"
                                value={csvBulkRoom}
                                onChange={(e) => setCsvBulkRoom(e.target.value)}
                              >
                                <option value="">No change</option>
                                {roomOptions.map((r) => (
                                  <option key={r} value={String(r)}>
                                    Room {r}
                                  </option>
                                ))}
                              </Select>
                            </div>

                            <div>
                              <label className="mb-1.5 block text-xs font-bold tracking-wider text-gray-500 uppercase dark:text-zinc-400">
                                Cabinet
                              </label>
                              <Select
                                className="h-11 rounded-brand text-sm border border-gray-300 dark:border-white/10"
                                value={csvBulkCabinet}
                                onChange={(e) => setCsvBulkCabinet(e.target.value)}
                              >
                                <option value="">No change</option>
                                {(() => {
                                  const bulkRoomId = coerceRoomId(csvBulkRoom)
                                  const ids = bulkRoomId
                                    ? getCabinetsForRoom(bulkRoomId).map(
                                        (c) => c.id
                                      )
                                    : Array.from(
                                        new Set(
                                          storageLayout?.rooms?.flatMap((r) =>
                                            r.cabinets.map((c) => c.id)
                                          ) || []
                                        )
                                      )
                                  return ids.map((c) => (
                                    <option key={c} value={c}>
                                      Cab {c}
                                    </option>
                                  ))
                                })()}
                              </Select>
                            </div>

                            <div>
                              <label className="mb-1.5 block text-xs font-bold tracking-wider text-gray-500 uppercase dark:text-zinc-400">
                                Drawer
                              </label>
                              <Select
                                className="h-11 rounded-brand text-sm border border-gray-300 dark:border-white/10"
                                value={csvBulkDrawer}
                                onChange={(e) => setCsvBulkDrawer(e.target.value)}
                              >
                                <option value="">No change</option>
                                {(() => {
                                  const bulkRoomId = coerceRoomId(csvBulkRoom)
                                  const bulkCabId = String(
                                    csvBulkCabinet || ""
                                  ).trim()
                                  const ids =
                                    bulkRoomId && bulkCabId
                                      ? getDrawerIdsFor(bulkRoomId, bulkCabId)
                                      : Array.from(
                                          new Set(
                                            storageLayout?.rooms?.flatMap((r) =>
                                              r.cabinets.flatMap(
                                                (c) => c.drawerIds || []
                                              )
                                            ) || []
                                          )
                                        )
                                  ids.sort((a, b) => a - b)
                                  return ids.map((d) => (
                                    <option key={d} value={String(d)}>
                                      Draw {d}
                                    </option>
                                  ))
                                })()}
                              </Select>
                            </div>

                            <div className="flex items-center gap-2 pt-1">
                              <button
                                type="button"
                                onClick={applyCsvBulkLocation}
                                className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-brand btn-brand-red text-[10px] font-black tracking-widest text-white uppercase transition-all dark:shadow-none"
                                disabled={
                                  Object.values(csvSelected).filter(Boolean)
                                    .length === 0
                                }
                              >
                                <i className="ph-bold ph-check text-xs" />
                                APPLY
                              </button>
                              <button
                                type="button"
                                onClick={() => setCsvSelected({})}
                                className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-brand border border-gray-300 bg-white text-[10px] font-black tracking-widest text-gray-700 uppercase transition-all hover:border-gray-300 hover:text-pup-maroon dark:hover:text-red-500 disabled:opacity-40 dark:bg-card dark:text-zinc-200 dark:hover:border-zinc-700 dark:border-white/10"
                                disabled={
                                  Object.values(csvSelected).filter(Boolean)
                                    .length === 0
                                }
                              >
                                <i className="ph-bold ph-trash text-xs" />
                                CLEAR
                              </button>
                            </div>
                          </div>
                        </div>

                        {(() => {
                          const selectedIndices = Object.keys(csvSelected).filter(k => csvSelected[k])
                          const selectedRows = csvRows.filter(r => selectedIndices.includes(String(r.index)))
                          const hasInvalidSelected = selectedRows.some(r => !isLocationValid(r.student.room, r.student.cabinet, r.student.drawer))
                          const importDisabled = csvLoading || selectedRows.length === 0 || hasInvalidSelected

                          return (
                            <>
                              <button
                                type="button"
                                onClick={importCsvStudents}
                                disabled={importDisabled}
                                className={cn(
                                  "flex h-11 w-full items-center justify-center gap-2 rounded-brand btn-brand-red text-xs font-black tracking-widest text-white uppercase transition-all dark:shadow-none",
                                  importDisabled && "cursor-not-allowed grayscale-[0.5]"
                                )}
                              >
                                {csvLoading ? (
                                  <>
                                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white" />
                                    <span>PROCESSING...</span>
                                  </>
                                ) : (
                                  <>
                                    <i className="ph-bold ph-upload-simple text-base" />{" "}
                                    IMPORT RECORDS
                                  </>
                                )}
                              </button>
                              
                              {hasInvalidSelected && (
                                <div className="mt-3 flex items-start gap-2 rounded-brand border border-orange-200 bg-orange-50 p-3 text-[10px] font-bold text-orange-800 animate-in fade-in slide-in-from-top-2 dark:bg-orange-950/20 dark:border-orange-900/30">
                                  <i className="ph-fill ph-warning-circle text-sm shrink-0" />
                                  <p>
                                    Cannot import: One or more selected rows have storage locations that do not exist in the system. 
                                    Use the dropdowns or Bulk Edit to assign valid physical rooms, cabinets, and drawers.
                                  </p>
                                </div>
                              )}
                            </>
                          )
                        })()}

                        {csvResults.length > 0 && (
                          <div className="rounded-brand border border-gray-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-card dark:shadow-none">
                            <div className="mb-2 text-[10px] font-black tracking-widest text-gray-400 uppercase dark:text-zinc-500">
                              Import Summary
                            </div>
                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between text-xs font-bold text-gray-700 dark:text-zinc-200">
                                <span className="flex items-center gap-1.5">
                                  <i className="ph-fill ph-check-circle text-emerald-500" />{" "}
                                  Created:
                                </span>
                                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400">
                                  {csvResults.filter((r) => r.ok).length}
                                </span>
                              </div>
                              <div className="flex items-center justify-between text-xs font-bold text-gray-700 dark:text-zinc-200">
                                <span className="flex items-center gap-1.5">
                                  <i className="ph-fill ph-x-circle text-red-500" />{" "}
                                  Failed:
                                </span>
                                <span className="rounded-full bg-red-50 px-2 py-0.5 text-red-600 dark:bg-red-950/30">
                                  {csvResults.filter((r) => !r.ok).length}
                                </span>
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
        </CardContent>
      </Card>
    </div>
  )
}
