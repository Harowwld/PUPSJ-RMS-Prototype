"use client"

import Image from "next/image"
import { useMemo, useState, useEffect } from "react"
import { useHotFolderInbox } from "@/hooks/useHotFolderInbox"
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
  const mergeSelectedCabinetId = (roomIdRaw, cabIdRaw) => {
    const cabId = String(cabIdRaw || "").trim()
    const ids = getCabinetsForRoom(roomIdRaw).map((c) => c.id)
    if (cabId && !ids.includes(cabId)) return [cabId, ...ids]
    return ids
  }
  const mergeSelectedDrawerId = (roomIdRaw, cabIdRaw, drawerRaw) => {
    const ids = getDrawerIdsFor(roomIdRaw, cabIdRaw)
    const selected = parseInt(String(drawerRaw || ""), 10)
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
    "!bg-gray-200 !text-gray-500 !border-gray-300 cursor-not-allowed placeholder:!text-gray-400 focus:!border-gray-300 focus:!shadow-none focus:!ring-0"
  const lockedLabel = "text-gray-400"

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

  const handlePdfFileSelect = (file) => {
    if (!file) return
    hf.clearIngestSelection()
    onFileSelect(file)
  }

  const handleClearPdf = () => {
    hf.clearIngestSelection()
    onClearFile()
  }

  const onPdfDrop = (e) => {
    e.preventDefault()
    setDropActive(false)
    const f = e.dataTransfer.files?.[0]
    if (!f) return
    const isPdf =
      f.type === "application/pdf" ||
      String(f.name || "")
        .toLowerCase()
        .endsWith(".pdf")
    const isImg = String(f.type || "").startsWith("image/")
    if (!isPdf && !isImg) {
      return
    }
    if (uploadedFile) {
      setPendingDroppedFile(f)
      setConfirmDropOpen(true)
    } else {
      handlePdfFileSelect(f)
    }
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
      className="animate-fade-in font-inter flex h-full min-h-0 w-full flex-col"
    >
      <Card className="flex flex-1 flex-col overflow-hidden rounded-brand border border-gray-200 bg-white shadow-sm">
        <PageHeader
          icon="ph-scan"
          title="Digital Ingestion Terminal"
          description="Convert physical academic records into encrypted digital assets using OCR or batch import."
          filters={
            <div className="inline-flex h-10 items-center rounded-lg border border-gray-200 bg-gray-100 p-1 shadow-sm">
              <button
                type="button"
                onClick={() => setUploadMode("pdf")}
                className={`flex h-full items-center gap-2 rounded-md px-4 text-[10px] font-black tracking-widest uppercase transition-all ${
                  uploadMode === "pdf"
                    ? "bg-white text-pup-maroon shadow-sm ring-1 ring-black/5"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                <i
                  className={`ph-bold ${uploadMode === "pdf" ? "ph-file-pdf" : "ph-file-pdf text-gray-400"}`}
                />
                <span>DOCUMENT</span>
              </button>
              <button
                type="button"
                onClick={() => setUploadMode("csv")}
                className={`flex h-full items-center gap-2 rounded-md px-4 text-[10px] font-black tracking-widest uppercase transition-all ${
                  uploadMode === "csv"
                    ? "bg-white text-pup-maroon shadow-sm ring-1 ring-black/5"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                <i
                  className={`ph-bold ${uploadMode === "csv" ? "ph-file-csv" : "ph-file-csv text-gray-400"}`}
                />
                <span>BATCH (CSV)</span>
              </button>
            </div>
          }
          actions={
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (uploadMode === "pdf") hf.refresh()
              }}
              className="h-10 rounded-brand border-gray-300 px-5 text-sm font-bold text-gray-700 shadow-sm transition-all hover:border-gray-300 hover:bg-red-50 hover:text-pup-maroon"
            >
              <i className="ph-bold ph-arrows-clockwise mr-1.5"></i>
              REFRESH
            </Button>
          }
        />

        <CardContent className="flex min-h-0 flex-1 flex-col p-6">
          {loading ? (
            <div className="flex min-h-0 flex-1 flex-col gap-4 lg:flex-row">
              <div className="flex w-full flex-col items-center justify-center gap-4 rounded-brand border border-gray-300 bg-white p-8 shadow-sm lg:w-[48%]">
                <Skeleton className="h-20 w-20 rounded-full" />
                <div className="flex flex-col items-center space-y-2">
                  <Skeleton className="h-6 w-48" />
                  <Skeleton className="h-4 w-64" />
                </div>
              </div>

              <div className="flex w-full flex-col overflow-hidden rounded-brand border border-gray-200 bg-white shadow-sm lg:w-[52%]">
                <div className="flex items-center gap-4 border-b border-gray-100 bg-gray-50/50 p-6">
                  <Skeleton className="h-12 w-12 rounded-brand" />
                  <div className="space-y-2">
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                </div>
                <div className="flex-1 space-y-6 bg-gray-50/30 p-6">
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
                  <Skeleton className="mt-4 h-11 w-full rounded-brand" />
                </div>
              </div>
            </div>
          ) : error ? (
            <div className="flex min-h-0 flex-1 flex-col items-center justify-center p-6">
              <Empty className="flex h-[320px] flex-col items-center justify-center border-0 text-center text-gray-500">
                <EmptyHeader className="flex flex-col items-center gap-0">
                  <EmptyMedia className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-gray-200 bg-white shadow-sm">
                    <i className="ph-duotone ph-warning-circle text-3xl text-pup-maroon" />
                  </EmptyMedia>
                  <EmptyTitle className="text-lg font-bold text-gray-900">
                    Could not load tab
                  </EmptyTitle>
                  <EmptyDescription className="mt-1 max-w-md text-sm font-medium text-gray-600">
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

              <div className="flex min-h-0 flex-1 flex-col gap-4 lg:flex-row">
            <section
              className={`relative flex h-full min-h-0 flex-col items-center justify-center rounded-brand border border-gray-300 bg-white p-8 shadow-sm transition-all duration-300 ${
                uploadMode === "csv" ? "w-full lg:w-[70%]" : "w-full lg:w-[48%]"
              }`}
            >
              {uploadMode === "csv" ? (
                <div className="flex h-full w-full flex-col overflow-hidden rounded-brand border border-gray-200 bg-white">
                  <div className="flex flex-col items-center justify-between gap-4 border-b border-gray-200 bg-gray-50/50 p-5 sm:flex-row">
                    <div className="flex items-center gap-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-white text-pup-maroon shadow-sm">
                        <i className="ph-duotone ph-table text-2xl"></i>
                      </div>
                      <div>
                        <h3 className="text-lg font-black tracking-tight text-gray-900">
                          CSV Preview
                        </h3>
                        <div className="mt-0.5 text-xs leading-tight font-medium text-gray-500">
                          {csvFile ? (
                            <div className="flex flex-col gap-0.5">
                              <span className="flex items-center gap-1.5 font-bold break-all text-gray-800">
                                <i className="ph-bold ph-file-csv text-pup-maroon" />{" "}
                                {csvFile.name}
                              </span>
                              <span className="text-gray-500">
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
                        className="h-9 shrink-0 rounded-brand border-gray-300 px-4 text-[10px] font-black tracking-widest text-gray-700 uppercase shadow-sm transition-all hover:border-gray-300 hover:bg-red-50 hover:text-pup-maroon"
                      >
                        <i className="ph-bold ph-x-circle mr-1.5 text-xs" />
                        CLEAR FILE
                      </Button>
                    )}
                  </div>

                  <div
                    className={`min-h-0 flex-1 overflow-auto transition-colors duration-200 ${csvDropActive ? "bg-red-50/40" : ""}`}
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
                        <thead className="sticky top-0 z-10 border-b border-gray-200 bg-gray-50">
                          <tr className="text-left text-[11px] font-black tracking-wider text-gray-500 uppercase">
                            <th className="w-10 p-3 text-center">
                              <input
                                type="checkbox"
                                className="h-4 w-4 cursor-pointer rounded border-gray-300 text-pup-maroon accent-pup-maroon focus:ring-pup-maroon"
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
                            <th className="p-1.5">#</th>
                            <th className="p-1.5">Student No</th>
                            <th className="p-1.5">Name</th>
                            <th className="p-1.5">Course</th>
                            <th className="p-1.5">Year</th>
                            <th className="p-1.5">Section</th>
                            <th className="p-1.5">Room</th>
                            <th className="p-1.5">Cab</th>
                            <th className="p-1.5">Drawer</th>
                            <th className="p-1.5">Error</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {csvRows.slice(0, 100).map((r) => (
                            <tr
                              key={r.index}
                              className={`transition-colors hover:bg-gray-50 ${csvSelected?.[r.index] ? "bg-red-50/20" : ""}`}
                            >
                              <td className="p-3 text-center">
                                <input
                                  type="checkbox"
                                  className="h-4 w-4 cursor-pointer rounded border-gray-300 text-pup-maroon accent-pup-maroon focus:ring-pup-maroon"
                                  checked={!!csvSelected?.[r.index]}
                                  onChange={() => toggleCsvRowSelected(r.index)}
                                />
                              </td>
                              <td className="p-1.5 font-mono text-[10px] text-gray-400">
                                {r.index}
                              </td>
                              <td className="p-1.5 font-mono font-bold text-gray-900">
                                {r.student.studentNo}
                              </td>
                              <td className="p-1.5 font-bold text-gray-800">
                                {r.student.name}
                              </td>
                              <td className="p-1.5">
                                <Badge
                                  variant="outline"
                                  className="border-0 bg-blue-50 text-[9px] font-black tracking-tighter text-blue-700 uppercase"
                                >
                                  {r.student.courseCode}
                                </Badge>
                              </td>
                              <td className="p-1.5 font-bold text-gray-600">
                                {r.student.yearLevel}
                              </td>
                              <td className="p-1.5 font-bold text-gray-600">
                                {r.student.section}
                              </td>
                              <td className="p-1.5">
                                <Select
                                  className="form-select h-8 w-14 rounded border-gray-200 px-1 py-0 text-[11px] font-bold"
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
                                      {room}
                                    </option>
                                  ))}
                                </Select>
                              </td>
                              <td className="p-1.5">
                                <Select
                                  className="form-select h-8 w-12 rounded border-gray-200 px-1 py-0 text-[11px] font-bold"
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
                                      {c}
                                    </option>
                                  ))}
                                </Select>
                              </td>
                              <td className="p-1.5">
                                <Select
                                  className="form-select h-8 w-14 rounded border-gray-200 px-1 py-0 text-[11px] font-bold"
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
                                      {d}
                                    </option>
                                  ))}
                                </Select>
                              </td>
                              <td className="p-1.5">
                                {r.error ? (
                                  <div className="flex items-center gap-1 text-red-600">
                                    <i className="ph-bold ph-warning-circle text-sm" />
                                    <span className="text-[9px] leading-none font-black tracking-tighter uppercase">
                                      Error
                                    </span>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-1 text-emerald-600">
                                    <i className="ph-bold ph-check-circle text-sm" />
                                    <span className="text-[9px] leading-none font-black tracking-tighter uppercase">
                                      Valid
                                    </span>
                                  </div>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <div
                        className={`group flex h-full cursor-pointer items-center justify-center rounded-brand border-2 border-dashed p-12 transition-all ${
                          csvDropActive
                            ? "border-gray-300 bg-red-50 shadow-inner"
                            : "border-gray-300 bg-gray-50 hover:border-gray-300 hover:bg-red-50/50"
                        }`}
                        onClick={() => csvInputRef.current?.click()}
                      >
                        <Empty className="pointer-events-none flex flex-col items-center justify-center border-0 text-center text-gray-500">
                          <EmptyHeader className="flex flex-col items-center gap-0">
                            <EmptyMedia className="mb-4 flex h-20 w-20 items-center justify-center rounded-full border border-gray-200 bg-white shadow-sm transition-transform group-hover:scale-110">
                              <i className="ph-duotone ph-file-arrow-up text-4xl text-pup-maroon"></i>
                            </EmptyMedia>
                            <EmptyTitle className="text-xl font-bold tracking-tight text-gray-900">
                              Drop CSV File here
                            </EmptyTitle>
                            <EmptyDescription className="mt-2 text-sm font-medium text-gray-600">
                              or click to browse local files (.csv)
                            </EmptyDescription>
                          </EmptyHeader>
                        </Empty>
                      </div>
                    )}
                    {csvRows.length > 100 ? (
                      <div className="border-t border-gray-200 p-3 text-xs font-medium text-gray-600">
                        Showing first 100 rows.
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : (
                <div
                  className={`group relative flex h-full min-h-[320px] w-full flex-col overflow-hidden rounded-brand border-2 border-dashed bg-gray-50 transition-all ${
                    fe.pdfFile
                      ? "border-orange-400 bg-orange-50/30 ring-2 ring-orange-400"
                      : "border-gray-400 hover:border-gray-300 hover:bg-red-50/50"
                  } ${dropActive ? "bg-red-50" : ""}`}
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
                    <div className="z-10 shrink-0 border-b border-gray-200 bg-white/95 p-3">
                      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <div className="text-xs font-bold text-gray-600 uppercase">
                            Scanner inbox
                          </div>
                          <div className="text-sm font-bold text-gray-900">
                            {hf.rows.length} waiting · auto-refresh ~3s
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            className="h-8 rounded-brand border border-gray-300 bg-white px-3 text-xs font-bold text-gray-800 hover:border-gray-300 disabled:opacity-60"
                            disabled={hf.rows.length === 0 || hf.loading}
                            onClick={(e) => {
                              e.stopPropagation()
                              setClearInboxOpen(true)
                            }}
                          >
                            CLEAR INBOX
                          </button>
                          <button
                            type="button"
                            className="h-8 rounded-brand border border-gray-300 px-3 text-xs font-bold hover:border-gray-300"
                            onClick={(e) => {
                              e.stopPropagation()
                              hf.refresh()
                            }}
                          >
                            REFRESH
                          </button>
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
                                if (file) onFileSelect(file, true)
                              })
                            }}
                            className={`w-full rounded-brand border p-2.5 text-left transition-colors ${
                              hf.selected === row.id
                                ? "border-gray-300 bg-red-50/50"
                                : "border-transparent bg-gray-50 hover:bg-gray-100"
                            }`}
                          >
                            <div className="truncate text-sm font-bold text-gray-900">
                              {row.original_filename}
                            </div>
                            <div className="mt-0.5 text-xs font-medium text-gray-600">
                              {row.mime_type} ·{" "}
                              {(Number(row.size_bytes || 0) / 1024).toFixed(1)}{" "}
                              KB
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  <div
                    className="relative flex min-h-[200px] flex-1 cursor-pointer flex-col items-center justify-center p-6"
                    onClick={() => {
                      if (uploadedFile) return
                      if (fileInputRef.current) fileInputRef.current.click()
                    }}
                  >
                    <Empty className="pointer-events-none flex flex-col items-center justify-center border-0 text-center text-gray-500">
                      <EmptyHeader className="flex flex-col items-center gap-0">
                        <EmptyMedia className="mb-4 flex h-20 w-20 items-center justify-center rounded-full border border-gray-200 bg-white shadow-sm transition-transform group-hover:scale-110">
                          <i className="ph-duotone ph-file-arrow-up text-4xl text-pup-maroon"></i>
                        </EmptyMedia>
                        <EmptyTitle className="text-xl font-bold text-gray-900">
                          Drop Document or Image here
                        </EmptyTitle>
                        <EmptyDescription className="mt-2 text-sm font-medium text-gray-600">
                          or click to browse local files (PDF, JPG, PNG)
                        </EmptyDescription>
                        {hf.rows.length > 0 ? (
                          <EmptyDescription className="mx-auto mt-4 max-w-xs text-xs font-medium text-gray-500">
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
                      onChange={(e) => handlePdfFileSelect(e.target.files[0])}
                    />
                  </div>
                </div>
              )}

              {/* Unified Preview Overlay (for both Scanner Inbox and Manual Drops) */}
              {uploadMode === "pdf" && (hf.selectedRow || uploadedFile) ? (
                <div
                  className={`absolute inset-0 z-10 flex flex-col overflow-hidden rounded-brand bg-white border-2 border-dashed transition-all duration-200 ${
                    dropActive ? "border-pup-maroon bg-red-50/60" : "border-transparent"
                  }`}
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
                  <div className="flex shrink-0 items-center justify-between gap-2 border-b border-gray-200 bg-gray-50 px-4 py-2.5">
                    <div className="min-w-0">
                      <div className="text-[10px] font-black tracking-widest text-gray-400 uppercase">
                        {hf.selectedRow ? "Scanner inbox preview" : "Document preview"}
                      </div>
                      <div className="truncate text-sm font-bold text-gray-900">
                        {hf.selectedRow?.original_filename || uploadedFile?.name}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {(hf.ocrLoading || ocrLoading) && (
                        <span className="flex items-center gap-2 text-xs font-bold text-pup-maroon">
                          <div className="h-3 w-3 animate-spin rounded-full border border-gray-300/20 border-t-pup-maroon" />
                          Running OCR…
                        </span>
                      )}
                      <div className="flex items-center gap-1.5 border-l border-gray-200 pl-2">
                        <button
                          type="button"
                          className="flex h-8 w-8 items-center justify-center rounded-brand border border-gray-300 bg-white text-gray-600 shadow-sm transition-all hover:border-gray-300 hover:text-pup-maroon"
                          onClick={() => setRotation((r) => r - 90)}
                          title="Rotate Left"
                        >
                          <i className="ph-bold ph-arrow-counter-clockwise text-xs" />
                        </button>
                        <button
                          type="button"
                          className="flex h-8 w-8 items-center justify-center rounded-brand border border-gray-300 bg-white text-gray-600 shadow-sm transition-all hover:border-gray-300 hover:text-pup-maroon"
                          onClick={() => setRotation((r) => r + 90)}
                          title="Rotate Right"
                        >
                          <i className="ph-bold ph-arrow-clockwise text-xs" />
                        </button>
                        <button
                          type="button"
                          className="ml-1 flex h-8 items-center gap-2 rounded-brand border border-gray-300 bg-white px-3 text-[10px] font-black tracking-widest text-gray-700 uppercase transition-all hover:border-red-600 hover:bg-red-50 hover:text-red-700"
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
                  <div className="min-h-0 flex-1 overflow-hidden bg-gray-100 relative">
                    {(() => {
                      const url = hf.selectedRow ? hf.previewUrl : manualPreviewUrl
                      const mime = hf.selectedRow ? hf.previewMime : uploadedFile?.type
                      const isImg = String(mime || "").startsWith("image/")

                      if (isImg || pdfPreviewDataUrl) {
                        return (
                          <div className="relative flex h-full w-full items-center justify-center p-4 animate-fade-in">
                            <img
                              src={isImg ? url : pdfPreviewDataUrl}
                              alt="Preview"
                              className="max-h-full max-w-full rounded-md object-contain shadow-2xl transition-transform duration-300"
                              draggable="false"
                              style={{ transform: `rotate(${rotation}deg)` }}
                            />
                          </div>
                        )
                      }

                      if (pdfRendering) {
                        return (
                          <div className="flex h-full w-full flex-col items-center justify-center bg-gray-100 p-8">
                            <div className="h-10 w-10 animate-spin rounded-full border border-gray-300/20 border-t-pup-maroon mb-3" />
                            <div className="text-xs font-bold text-gray-500 uppercase tracking-widest animate-pulse">
                              Generating PDF Preview…
                            </div>
                          </div>
                        )
                      }

                      return (
                        <div className="flex h-full w-full items-center justify-center bg-gray-100 p-8 text-xs font-bold text-gray-400">
                          PREVIEW NOT AVAILABLE
                        </div>
                      )
                    })()}

                    {windowDragActive && (
                      <div
                        className="absolute inset-0 z-30 flex items-center justify-center bg-red-50/70 border-4 border-dashed border-pup-maroon animate-fade-in"
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
                        <div className="flex flex-col items-center justify-center p-6 bg-white/95 rounded-2xl border border-gray-100 shadow-xl max-w-xs text-center pointer-events-none animate-scale-up">
                          <div className="w-14 h-14 rounded-full bg-red-50 border border-red-100 flex items-center justify-center mb-3">
                            <i className="ph-duotone ph-file-arrow-up text-2xl text-pup-maroon"></i>
                          </div>
                          <p className="text-sm font-bold text-gray-900 leading-tight">
                            Drop file here to replace preview
                          </p>
                          <p className="text-xs font-medium text-gray-500 mt-1">
                            Requires confirmation
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : null}
              {uploadMode === "pdf" && (ocrLoading || hf.ocrLoading) ? (
                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center rounded-brand bg-white/80 backdrop-blur-sm">
                  <div className="w-full max-w-md px-6">
                    <div className="mb-4 text-center text-sm font-bold text-gray-800">
                      Scanning file…
                    </div>
                    <div className="rounded-brand border border-gray-200 bg-white p-5 shadow-sm">
                      <div className="flex items-center justify-center gap-3">
                        <div className="h-10 w-10 animate-spin rounded-full border border-gray-300/20 border-t-pup-maroon"></div>
                        <i className="ph-duotone ph-scan animate-pulse text-3xl text-pup-maroon"></i>
                      </div>
                      <div className="mt-4 h-2 w-full overflow-hidden rounded bg-gray-100">
                        <div className="h-full w-1/2 animate-pulse bg-pup-maroon/80"></div>
                      </div>
                      <div className="mt-3 text-center text-xs font-medium text-gray-600">
                        Extracting text and tags from PDF...
                      </div>
                    </div>
                    <div className="mt-4 text-center text-xs font-medium text-gray-600">
                      Working offline (LAN)
                    </div>
                  </div>
                </div>
              ) : null}
            </section>

            <section
              className={`font-inter flex h-full min-h-0 flex-col overflow-hidden rounded-brand border border-gray-300 bg-white shadow-sm transition-all duration-300 ${
                uploadMode === "csv" ? "w-full lg:w-[30%]" : "w-full lg:w-[52%]"
              }`}
            >
              <CardHeader className="flex flex-col items-center justify-between gap-4 border-b border-gray-100 bg-gray-50/50 p-6 sm:flex-row">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-brand border border-gray-200 bg-white text-pup-maroon shadow-sm">
                    <i
                      className={`ph-duotone ${uploadMode === "csv" ? "ph-file-csv" : "ph-tag"} text-2xl`}
                    ></i>
                  </div>
                  <div>
                    <CardTitle className="text-xl font-black tracking-tight text-gray-900">
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

              <div className="flex-1 overflow-y-auto bg-gray-50/50 p-6">
                {uploadMode === "pdf" ? (
                  <div className="space-y-5">
                    {uploadStudentIsExisting ? (
                      <div className="flex flex-col gap-2 rounded-brand border border-emerald-200 bg-emerald-50/90 px-3 py-2.5">
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
                          className="shrink-0 text-left text-xs font-bold text-pup-maroon underline-offset-2 hover:underline"
                          onClick={() => {
                            setUploadStudentIsExisting(false)
                            clearAllUploadFieldErrors?.()
                          }}
                        >
                          SWITCH TO NEW STUDENT
                        </button>
                      </div>
                    ) : (
                      <div className="rounded-brand border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700">
                        New student — submitting creates the student record and
                        uploads the document.
                      </div>
                    )}

                    <div className="grid grid-cols-1 gap-5">
                      <div>
                        <div className="mb-1.5 flex items-center justify-between">
                          <label
                            className={`block text-xs font-bold uppercase ${
                              lockIdentity ? lockedLabel : "text-gray-700"
                            }`}
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
                              className="h-5 rounded-brand px-1.5 text-[9px] font-bold text-pup-maroon hover:bg-red-50 hover:text-pup-darkMaroon"
                            >
                              CLEAR ALL
                            </Button>
                          )}
                        </div>
                        <input
                          type="text"
                          className={`form-input h-11 rounded-brand font-mono ${ring("studentNo")} ${
                            lockIdentity ? lockedField : ""
                          }`}
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
                          className={`mb-1.5 block text-xs font-bold uppercase ${
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
                            clearUploadFieldError?.("name")
                            setNewRec((p) => ({ ...p, name: e.target.value }))
                          }}
                        />
                        {!lockIdentity && nameSuggestions.length > 0 ? (
                          <div className="mt-2 overflow-hidden rounded-brand border border-gray-200 bg-white shadow-sm">
                            {nameSuggestions.map((s) => {
                              const studentNo = String(
                                s?.studentNo || s?.student_no || ""
                              )
                              return (
                                <button
                                  key={studentNo}
                                  type="button"
                                  className="w-full border-b border-gray-300 px-3 py-2 text-left transition-colors last:border-b-0 hover:bg-red-50/50"
                                  onClick={() => onSelectExistingStudent?.(s)}
                                >
                                  <div className="text-sm font-bold text-gray-900">
                                    {s?.name}
                                  </div>
                                  <div className="font-mono text-xs text-gray-600">
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
                        className={`mb-1.5 block text-xs font-bold uppercase ${
                          lockIdentity ? lockedLabel : "text-gray-700"
                        }`}
                      >
                        Course / Program
                      </label>
                      <Select
                        className={`form-select h-11 rounded-brand ${ring("course")} ${lockIdentity ? lockedField : ""}`}
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
                        <option value="">Select Course...</option>
                        {courses.map((c) => (
                          <option key={c.code} value={c.code}>
                            {c.name}
                          </option>
                        ))}
                      </Select>
                    </div>

                    <div>
                      <label
                        className={`mb-1.5 block text-xs font-bold uppercase ${
                          lockIdentity ? lockedLabel : "text-gray-700"
                        }`}
                      >
                        Section
                      </label>
                      <Select
                        className={`form-select h-11 rounded-brand ${ring("sectionPart")} ${lockIdentity ? lockedField : ""}`}
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
                      </Select>
                    </div>

                    <div className="grid grid-cols-3 gap-5">
                      <div>
                        <label className="mb-1.5 block text-xs font-bold text-gray-700 uppercase">
                          Room
                        </label>
                        <Select
                          className={`form-select h-11 rounded-brand ${ring("room")}`}
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
                          <option value="">Room...</option>
                          {roomOptions.map((r) => (
                            <option key={r} value={r}>
                              {r}
                            </option>
                          ))}
                        </Select>
                      </div>
                      <div>
                        <label className="mb-1.5 block text-xs font-bold text-gray-700 uppercase">
                          Cabinet
                        </label>
                        <Select
                          className={`form-select h-11 rounded-brand ${ring("cabinet")}`}
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
                          <option value="">Cab...</option>
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
                        <label className="mb-1.5 block text-xs font-bold text-gray-700 uppercase">
                          Drawer
                        </label>
                        <Select
                          className={`form-select h-11 rounded-brand ${ring("drawer")}`}
                          value={String(newRec.drawer || "")}
                          onChange={(e) => {
                            clearUploadFieldError?.("drawer")
                            setNewRec((p) => ({ ...p, drawer: e.target.value }))
                          }}
                        >
                          <option value="">Draw...</option>
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

                    <div className="border-t border-gray-200 pt-4">
                      <label className="mb-1.5 block text-xs font-bold text-gray-700 uppercase">
                        Document Type
                      </label>
                      <Select
                        className={`form-select h-11 rounded-brand ${ring("docType")}`}
                        value={newRec.docType}
                        onChange={(e) => {
                          clearUploadFieldError?.("docType")
                          setNewRec((p) => ({ ...p, docType: e.target.value }))
                        }}
                      >
                        <option value="">Select Document Type...</option>
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
                          onSuccess: () => hf.removeIngestItem(),
                        })
                      }
                      className="flex h-10 w-full items-center justify-center gap-2 rounded-brand bg-pup-maroon text-sm font-bold text-white shadow-sm transition-all hover:bg-red-900"
                    >
                      <i className="ph-bold ph-upload-simple" /> SUBMIT UPLOAD
                    </button>

                    {uploadError ? (
                      <div className="mt-3 rounded-brand border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-800">
                        {uploadError}
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <div className="space-y-5">
                    <div>
                      <label className="mb-2 block text-xs font-bold tracking-wider text-gray-700 uppercase">
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
                          <div className="flex h-11 items-center gap-2 rounded-brand border border-dashed border-gray-300 bg-white px-3">
                            <i className="ph-bold ph-file-csv text-pup-maroon"></i>
                            <span className="truncate text-xs font-bold text-gray-600">
                              {csvFile ? csvFile.name : "Select CSV..."}
                            </span>
                          </div>
                        </div>
                        {csvFile && (
                          <button
                            type="button"
                            onClick={() => handleCsvFileSelect(null)}
                            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-brand border border-gray-300 bg-white text-gray-500 shadow-sm transition-all hover:border-red-600 hover:text-red-600"
                            title="Clear file"
                          >
                            <i className="ph-bold ph-trash text-lg" />
                          </button>
                        )}
                      </div>
                    </div>

                    {csvError ? (
                      <div className="rounded-brand border border-red-200 bg-red-50 p-3 text-xs font-bold text-red-800">
                        {csvError}
                      </div>
                    ) : null}

                    <div className="overflow-hidden rounded-brand border border-gray-200 bg-white shadow-sm">
                      <div className="border-b border-gray-100 bg-gray-50/80 p-4">
                        <div className="text-[10px] font-black tracking-widest text-gray-400 uppercase">
                          Bulk Edit
                        </div>
                        <div className="mt-1 text-sm font-black text-gray-900">
                          {Object.values(csvSelected).filter(Boolean).length}{" "}
                          rows selected
                        </div>
                      </div>

                      <div className="space-y-4 p-4">
                        <div>
                          <label className="mb-1.5 block text-xs font-bold tracking-wider text-gray-500 uppercase">
                            Room
                          </label>
                          <Select
                            className="form-select h-11 rounded-brand text-sm"
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
                          <label className="mb-1.5 block text-xs font-bold tracking-wider text-gray-500 uppercase">
                            Cabinet
                          </label>
                          <Select
                            className="form-select h-11 rounded-brand text-sm"
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
                          <label className="mb-1.5 block text-xs font-bold tracking-wider text-gray-500 uppercase">
                            Drawer
                          </label>
                          <Select
                            className="form-select h-11 rounded-brand text-sm"
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
                            className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-brand bg-pup-maroon text-[10px] font-black tracking-widest text-white uppercase shadow-sm transition-all hover:bg-red-900 disabled:opacity-40"
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
                            className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-brand border border-gray-300 bg-white text-[10px] font-black tracking-widest text-gray-700 uppercase transition-all hover:border-gray-300 hover:text-pup-maroon disabled:opacity-40"
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

                    <button
                      type="button"
                      onClick={importCsvStudents}
                      disabled={csvLoading}
                      className={`flex h-11 w-full items-center justify-center gap-2 rounded-brand bg-pup-maroon text-xs font-black tracking-widest text-white uppercase shadow-lg shadow-red-900/10 transition-all hover:bg-red-900 ${
                        csvLoading ? "cursor-not-allowed opacity-75" : ""
                      }`}
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

                    {csvResults.length > 0 && (
                      <div className="rounded-brand border border-gray-200 bg-white p-4 shadow-sm">
                        <div className="mb-2 text-[10px] font-black tracking-widest text-gray-400 uppercase">
                          Import Summary
                        </div>
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-xs font-bold text-gray-700">
                            <span className="flex items-center gap-1.5">
                              <i className="ph-fill ph-check-circle text-emerald-500" />{" "}
                              Created:
                            </span>
                            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-600">
                              {csvResults.filter((r) => r.ok).length}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-xs font-bold text-gray-700">
                            <span className="flex items-center gap-1.5">
                              <i className="ph-fill ph-x-circle text-red-500" />{" "}
                              Failed:
                            </span>
                            <span className="rounded-full bg-red-50 px-2 py-0.5 text-red-600">
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
