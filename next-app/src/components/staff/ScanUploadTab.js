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
import { Select } from "@/components/ui/select"
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyMedia,
} from "@/components/ui/empty"
import PageHeader from "@/components/shared/PageHeader"
import { RefreshButton } from "@/components/shared/RefreshButton"
import { canonicalizeCabinetId } from "@/lib/storageLayoutUtils"
import { splitNameComponents, findStudentsByOcrName } from "@/lib/ocrClient"

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
  const [csvPage, setCsvPage] = useState(1)

  const [showStudentNoSuggestions, setShowStudentNoSuggestions] = useState(false)
  const [showNameSuggestions, setShowNameSuggestions] = useState(false)

  const filteredStudentNoSuggestions = useMemo(() => {
    const q = (newRec.studentNo || "").trim().toLowerCase();
    if (!q || uploadStudentIsExisting) return [];
    return students.filter(s => {
      const sn = String(s.studentNo || s.student_no || "").toLowerCase();
      return sn.includes(q);
    }).slice(0, 5);
  }, [newRec.studentNo, students, uploadStudentIsExisting]);

  const filteredNameSuggestions = useMemo(() => {
    const q = (newRec.name || "").trim();
    if (!q || uploadStudentIsExisting) return [];
    
    const fuzzyMatches = findStudentsByOcrName(q, students);
    if (fuzzyMatches && fuzzyMatches.length > 0) {
      return fuzzyMatches.slice(0, 5);
    }
    
    const qLo = q.toLowerCase();
    return students.filter(s => {
      const name = String(s.name || "").toLowerCase();
      return name.includes(qLo);
    }).slice(0, 5);
  }, [newRec.name, students, uploadStudentIsExisting]);

  const handleSelectStudent = (student) => {
    onSelectExistingStudent?.(student, newRec.docType || null);
    setShowStudentNoSuggestions(false);
    setShowNameSuggestions(false);
  };

  useEffect(() => {
    setCsvPage(1)
  }, [csvFile])

  useEffect(() => {
    if (uploadMode !== "pdf") return

    const handleWindowPaste = (e) => {
      const target = e.target
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return
      }

      const items = e.clipboardData?.items
      if (!items) return

      const files = []
      for (const item of items) {
        if (item.kind === "file") {
          const file = item.getAsFile()
          if (file) {
            const isPdf =
              file.type === "application/pdf" ||
              file.name.toLowerCase().endsWith(".pdf")
            const isImg = file.type.startsWith("image/")
            if (isPdf || isImg) {
              files.push(file)
            }
          }
        }
      }

      if (files.length > 0) {
        e.preventDefault()
        handlePdfFileSelect(files)
        showToast("File pasted from clipboard!")
      }
    }

    window.addEventListener("paste", handleWindowPaste)
    return () => {
      window.removeEventListener("paste", handleWindowPaste)
    }
  }, [uploadMode, showToast])

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
    const cabId = canonicalizeCabinetId(cabinetIdRaw)
    if (!roomDef || !cabId) return []
    const cab = roomDef.cabinets.find((c) => canonicalizeCabinetId(c.id) === cabId)
    return cab?.drawerIds || []
  }

  const isLocationValid = (roomIdRaw, cabIdRaw, drawerRaw) => {
    const roomId = coerceRoomId(roomIdRaw)
    const cabId = canonicalizeCabinetId(cabIdRaw)
    const drawerId = parseInt(String(drawerRaw || ""), 10)
    if (roomId == null || !cabId || !Number.isFinite(drawerId)) return false

    const roomDef = storageLayout?.rooms?.find((r) => r.id === roomId)
    if (!roomDef) return false

    const cabDef = roomDef.cabinets?.find((c) => canonicalizeCabinetId(c.id) === cabId)
    if (!cabDef) return false

    return cabDef.drawerIds?.includes(drawerId)
  }

  const mergeSelectedCabinetId = (roomIdRaw, cabIdRaw) => {
    const cabId = canonicalizeCabinetId(cabIdRaw)
    const ids = getCabinetsForRoom(roomIdRaw).map((c) => canonicalizeCabinetId(c.id))
    
    // If no room is selected or invalid, provide all possible cabinet IDs from the system as options
    if (ids.length === 0) {
      const allCabs = Array.from(new Set(storageLayout?.rooms?.flatMap(r => r.cabinets.map(c => canonicalizeCabinetId(c.id))) || []))
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

  const paginatedCsvRows = useMemo(() => {
    const itemsPerPage = 10
    const startIndex = (csvPage - 1) * itemsPerPage
    return csvRows.slice(startIndex, startIndex + itemsPerPage)
  }, [csvRows, csvPage])

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
        const parsed = splitNameComponents(suggestion.name || "");
        setNewRec?.((p) => ({
          ...p,
          name: suggestion.name
            ? String(suggestion.name).trim().replace(/\s+/g, " ").toUpperCase()
            : p.name,
          firstName: suggestion.firstName || parsed.firstName || p.firstName,
          middleName: suggestion.middleName || parsed.middleName || p.middleName,
          lastName: suggestion.lastName || parsed.lastName || p.lastName,
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
    e.stopPropagation()
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

  const handlePasteButtonClick = async (e) => {
    e.stopPropagation()
    try {
      const clipboardItems = await navigator.clipboard.read()
      const files = []
      for (const item of clipboardItems) {
        for (const type of item.types) {
          if (type.startsWith("text/")) continue
          if (type === "application/pdf" || type.startsWith("image/")) {
            const blob = await item.getType(type)
            const extension = type === "application/pdf" ? "pdf" : type.split("/")[1] || "png"
            const file = new File([blob], `pasted_file_${Date.now()}.${extension}`, { type })
            files.push(file)
          }
        }
      }
      if (files.length > 0) {
        handlePdfFileSelect(files)
        showToast("File pasted from clipboard!")
      } else {
        showToast("No valid image or PDF in clipboard", "warning")
      }
    } catch (err) {
      showToast("Cannot read clipboard automatically. Try pressing Ctrl+V or Cmd+V.", "warning")
    }
  }


  return (
    <div
      id="view-upload"
      className="animate-fade-up font-inter flex h-auto w-full flex-col"
    >
      <Card className="flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl shadow-gray-200/50 backdrop-blur-xl dark:border-white/10 dark:bg-card/80 dark:shadow-none">
        <PageHeader
          icon="ph-scan"
          title="Scan & Upload"
          description="Scan student records or import files to save them digitally."
          actions={
            <div className="flex items-center gap-3">
              <div className="flex flex-col items-end gap-1">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest dark:text-zinc-500">Status</p>
                <p className="text-[10px] font-medium text-gray-500 whitespace-nowrap dark:text-zinc-400">
                  {uploadMode === "pdf" ? "Scanner Inbox" : "Ready to upload"}
                </p>
              </div>
              <RefreshButton 
                onRefresh={() => {
                  if (uploadMode === "pdf") hf.refresh()
                }} 
                isLoading={hf.loading} 
                title="Refresh Inbox"
              />
            </div>
          }
        />

        <CardContent className="flex flex-col p-6 pt-4">
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

              <div className="flex flex-col gap-4 h-auto lg:flex-row lg:items-stretch">
                <section
                  className={cn(
                    "relative flex h-auto min-h-[580px] flex-col transition-all duration-300",
                    uploadMode === "csv" ? "w-full lg:w-[68%]" : "w-full lg:w-[48%]"
                  )}
                >
                  {uploadMode === "csv" ? (
                    <div className="flex h-full w-full flex-col overflow-hidden bg-white transition-all duration-300 rounded-brand border border-gray-200 dark:bg-card dark:border-white/10">
                      <div className="flex flex-col items-center justify-between gap-4 border-b border-gray-100 bg-gray-50/50 p-6 px-8 sm:flex-row dark:border-white/10 dark:bg-white/5">
                        <div className="flex items-center gap-4">
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-brand border border-gray-200 bg-white text-pup-maroon dark:text-primary shadow-sm dark:border-white/10 dark:bg-card dark:text-primary dark:shadow-none">
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
                        <div className="flex shrink-0 items-center gap-2">
                          {csvFile && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleCsvFileSelect(null)}
                              className="h-9 shrink-0 rounded-brand border-gray-300 px-4 text-[10px] font-black tracking-widest text-gray-700 uppercase shadow-sm transition-all hover:border-gray-300 hover:bg-red-50 hover:text-pup-maroon dark:hover:text-red-500 dark:text-zinc-200 dark:shadow-none dark:hover:border-zinc-700 dark:bg-zinc-800/30 dark:border-white/10"
                            >
                              <i className="ph-bold ph-x-circle mr-1.5 text-xs" />
                              CLEAR FILE
                            </Button>
                          )}
                        </div>
                      </div>

                      <div
                        className={`min-h-0 flex-1 overflow-auto transition-colors duration-200 ${csvDropActive ? "bg-red-50" : ""} dark:bg-[#2c2c2c]`}
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
                          <table className="min-w-full text-[12px] table-auto">
                            <thead className="sticky top-0 z-10 border-b border-gray-200 bg-gray-50 dark:border-white/10 dark:bg-muted">
                              <tr className="text-left text-[10px] font-black tracking-wider text-gray-500 uppercase dark:text-zinc-400 dark:border-white/10">
                                <th className="w-12 p-3.5 py-3 text-center">
                                  <input
                                    type="checkbox"
                                    className="h-3.5 w-3.5 cursor-pointer rounded border-gray-300 text-pup-maroon dark:text-primary accent-pup-maroon focus:ring-pup-maroon dark:text-primary dark:border-white/10"
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
                                <th className="px-3.5 py-3">#</th>
                                <th className="px-3.5 py-3">Student No</th>
                                <th className="px-3.5 py-3">Name</th>
                                <th className="px-3.5 py-3">Course</th>
                                <th className="px-3.5 py-3">Year</th>
                                <th className="px-3.5 py-3">Section</th>
                                <th className="px-3.5 py-3">Room</th>
                                <th className="px-3.5 py-3">Cab</th>
                                <th className="px-3.5 py-3">Drawer</th>
                                <th className="px-3.5 py-3 text-right">Status</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-white/10">
                              {paginatedCsvRows.map((r) => {
                                const isValid = isLocationValid(r.student.room, r.student.cabinet, r.student.drawer)

                                return (
                                  <tr
                                    key={r.index}
                                    className={`transition-colors hover:bg-gray-50 ${csvSelected?.[r.index] ? (isValid ? "bg-red-50" : "bg-orange-50") : ""} dark:hover:bg-white/10 dark:bg-card`}
                                  >
                                    <td className="p-3.5 py-3 text-center">
                                      <input
                                        type="checkbox"
                                        className="h-3.5 w-3.5 cursor-pointer rounded border-gray-300 text-pup-maroon dark:text-primary accent-pup-maroon focus:ring-pup-maroon dark:text-primary dark:border-white/10"
                                        checked={!!csvSelected?.[r.index]}
                                        onChange={() => toggleCsvRowSelected(r.index)}
                                      />
                                    </td>
                                    <td className="px-3.5 py-3 text-[10px] text-gray-400 dark:text-zinc-500">
                                      {r.index}
                                    </td>
                                    <td className="px-3.5 py-3 font-bold text-gray-900 dark:text-zinc-50">
                                      {r.student.studentNo}
                                    </td>
                                    <td className="px-3.5 py-3 font-bold text-gray-800 dark:text-zinc-100">
                                      {r.student.name}
                                    </td>
                                    <td className="px-3.5 py-3">
                                      <Badge
                                        variant="outline"
                                        className="border-0 bg-blue-50 text-[9px] font-black tracking-tighter text-blue-700 uppercase dark:bg-blue-950/30 dark:text-blue-300 px-1.5 py-0.5"
                                      >
                                        {r.student.courseCode}
                                      </Badge>
                                    </td>
                                    <td className="px-3.5 py-3 font-bold text-gray-600 dark:text-zinc-300">
                                      {r.student.yearLevel}
                                    </td>
                                    <td className="px-3.5 py-3 font-bold text-gray-600 dark:text-zinc-300">
                                      {r.student.section}
                                    </td>
                                    <td className="px-3.5 py-3">
                                      <Select
                                        className={cn(
                                          "h-7 w-[64px] rounded border border-gray-300 px-1 py-0 text-[10px] font-bold dark:border-white/10",
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
                                            {room}
                                          </option>
                                        ))}
                                      </Select>
                                    </td>
                                    <td className="px-3.5 py-3">
                                      <Select
                                        className={cn(
                                          "h-7 w-[64px] rounded border border-gray-300 px-1 py-0 text-[10px] font-bold dark:border-white/10",
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
                                            {c}
                                          </option>
                                        ))}
                                      </Select>
                                    </td>
                                    <td className="px-3.5 py-3">
                                      <Select
                                        className={cn(
                                          "h-7 w-[64px] rounded border border-gray-300 px-1 py-0 text-[10px] font-bold dark:border-white/10",
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
                                            {d}
                                          </option>
                                        ))}
                                      </Select>
                                    </td>
                                    <td className="px-3.5 py-3 text-right">
                                      {r.error ? (
                                        <div className="flex items-center justify-end gap-0.5 text-red-600">
                                          <i className="ph-bold ph-warning-circle text-[11px]" />
                                          <span className="text-[8px] leading-none font-black tracking-tighter uppercase">
                                            Error
                                          </span>
                                        </div>
                                      ) : !isValid ? (
                                        <div className="flex items-center justify-end gap-0.5 text-orange-600" title="This location does not exist in the physical system.">
                                          <i className="ph-bold ph-warning text-[11px]" />
                                          <span className="text-[8px] leading-none font-black tracking-tighter uppercase truncate">
                                            Invalid
                                          </span>
                                        </div>
                                      ) : (
                                        <div className="flex items-center justify-end gap-0.5 text-emerald-600 dark:text-emerald-400">
                                          <i className="ph-bold ph-check-circle text-[11px]" />
                                          <span className="text-[8px] leading-none font-black tracking-tighter uppercase">
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
                            className={`group flex h-full cursor-pointer items-center justify-center rounded-brand border-2 border-dashed p-12 transition-all ${ csvDropActive ? "border-gray-300 bg-red-50 shadow-inner" : "bg-gray-50 hover:border-gray-300 hover:bg-red-50" } dark:border-white/10 dark:bg-zinc-900/30 dark:shadow-none dark:hover:border-zinc-700`}
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
                        {csvRows.length > 0 && (
                          <div className="flex flex-wrap items-center justify-between gap-4 border-t border-gray-200 p-4 bg-gray-50/50 dark:border-white/10 dark:bg-white/5 select-none shrink-0">
                            <div className="text-xs font-medium text-gray-500">
                              Showing <strong>{(csvPage - 1) * 10 + 1}</strong> to <strong>{Math.min(csvPage * 10, csvRows.length)}</strong> of <strong>{csvRows.length.toLocaleString()}</strong> entries
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={csvPage <= 1}
                                onClick={() => setCsvPage((p) => p - 1)}
                                className="h-8 rounded-brand text-xs border border-gray-300 bg-white font-bold hover:bg-gray-100 dark:bg-card dark:hover:bg-zinc-800 dark:border-white/10"
                              >
                                <i className="ph-bold ph-caret-left mr-1" /> Previous
                              </Button>
                              <div className="px-3 text-xs font-bold text-gray-700 bg-white border border-gray-200 rounded-md h-8 flex items-center dark:bg-card dark:text-zinc-200 dark:border-white/10">
                                Page {csvPage} of {Math.ceil(csvRows.length / 10) || 1}
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={csvPage >= (Math.ceil(csvRows.length / 10) || 1)}
                                onClick={() => setCsvPage((p) => p + 1)}
                                className="h-8 rounded-brand text-xs border border-gray-300 bg-white font-bold hover:bg-gray-100 dark:bg-card dark:hover:bg-zinc-800 dark:border-white/10"
                              >
                                Next <i className="ph-bold ph-caret-right ml-1" />
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div
                      className={`group relative flex h-full min-h-[580px] w-full flex-col overflow-hidden rounded-brand border border-dashed bg-gray-50 transition-all ${ fe.pdfFile ? "border-orange-400 bg-orange-50/30 ring-2 ring-orange-400" : "border-gray-300 hover:border-pup-maroon/40 hover:bg-red-50" } ${dropActive ? "bg-red-50 border-pup-maroon/40" : ""} dark:bg-white/5 dark:border-white/10`}
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
                      {uploadMode === "pdf" && (
                        <div className="z-10 shrink-0 border-b border-gray-200 bg-white p-3 dark:border-white/10 dark:bg-card/95">
                          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                            <div>
                              <div className="text-xs font-bold text-gray-600 uppercase dark:text-zinc-300">
                                Scanner Files
                              </div>
                              <div className="text-sm font-bold text-gray-900 dark:text-zinc-50 flex items-center gap-2">
                                <span className="relative flex h-2 w-2">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                </span>
                                {hf.rows.length === 0 ? (
                                  <span>0 waiting · <span className="text-[11px] text-gray-500 font-medium">listening for scans...</span></span>
                                ) : (
                                  <span>{hf.rows.length} waiting · <span className="text-[11px] text-gray-500 font-medium">auto-refresh ~3s</span></span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {hf.rows.length > 0 && (
                                <button
                                  type="button"
                                  className="h-8 rounded-brand border border-gray-300 bg-white px-3 text-xs font-bold text-gray-800 hover:border-gray-300 disabled:opacity-60 dark:bg-card dark:text-zinc-100 dark:hover:border-zinc-700 dark:border-white/10"
                                  disabled={hf.loading}
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setClearInboxOpen(true)
                                  }}
                                >
                                  CLEAR INBOX
                                </button>
                              )}
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
                          {hf.rows.length > 0 ? (
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
                          ) : (
                            <div className="text-[11px] font-medium text-gray-400 dark:text-zinc-500 py-1 border-t border-gray-100 dark:border-white/5 mt-1 pt-2">
                              No files waiting. Dropping scanned documents into the hot folder will automatically queue them here.
                            </div>
                          )}
                        </div>
                      )}

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
                                      onFileSelect(file, true, undefined, true);
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
                          className="relative flex min-h-[500px] flex-1 cursor-pointer flex-col items-center justify-center p-6"
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

                          <div className="mt-4 flex flex-col items-center gap-1.5 select-none" onClick={(e) => e.stopPropagation()}>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={handlePasteButtonClick}
                              className="flex items-center gap-2 h-9 rounded-brand border-gray-300 bg-white font-bold hover:bg-gray-100 dark:bg-card dark:hover:bg-zinc-800 dark:border-white/10"
                            >
                              <i className="ph-bold ph-clipboard-text text-sm"></i>
                              PASTE FROM CLIPBOARD
                            </Button>
                            <span className="text-[10px] text-gray-400 font-medium dark:text-zinc-500">
                              Or press Ctrl+V / Cmd+V anywhere on this page
                            </span>
                          </div>



                        </div>
                      )}
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
                  className={`font-inter flex h-auto flex-col rounded-brand border border-gray-300 bg-white shadow-sm transition-all duration-300 ${ uploadMode === "csv" ? "w-full lg:w-[32%]" : "lg:w-[52%]" } dark:border-white/10 dark:bg-card dark:shadow-none`}
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

                  <div className="bg-gray-50 p-6 dark:bg-white/5">
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
                            <div className="relative">
                              <input
                                type="text"
                                className={`form-input w-full h-11 rounded-brand ${ring("studentNo")} ${ lockIdentity ? lockedField : "" }`}
                                placeholder="202X-XXXXX-MN-0"
                                ref={newStudentNoInputRef}
                                value={newRec.studentNo}
                                disabled={lockIdentity}
                                onFocus={() => setShowStudentNoSuggestions(true)}
                                onBlur={() => {
                                  setNewRecStudentNoTouched(true)
                                  setTimeout(() => setShowStudentNoSuggestions(false), 200)
                                }}
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
                              />
                              {showStudentNoSuggestions && filteredStudentNoSuggestions.length > 0 && (
                                <div className="absolute z-50 left-0 right-0 mt-1 rounded-brand border border-gray-200 bg-white overflow-hidden shadow-lg animate-in fade-in slide-in-from-top-1 duration-200 dark:bg-zinc-900 dark:border-zinc-800">
                                  {filteredStudentNoSuggestions.map((s) => {
                                    const sn = String(s?.studentNo || s?.student_no || "");
                                    return (
                                      <button
                                        key={sn}
                                        type="button"
                                        onMouseDown={(e) => e.preventDefault()}
                                        className="w-full text-left px-3 py-2 border-b last:border-b-0 border-gray-100 hover:bg-red-50/50 transition-colors group flex flex-col gap-0.5 dark:border-zinc-800 dark:hover:bg-zinc-800/50"
                                        onClick={() => handleSelectStudent(s)}
                                      >
                                        <div className="text-sm font-bold text-gray-900 dark:text-zinc-100 group-hover:text-pup-maroon dark:group-hover:text-red-400 transition-colors">
                                          {s?.name}
                                        </div>
                                        <div className="text-[10px] text-gray-500 dark:text-zinc-400">
                                          {sn}
                                        </div>
                                      </button>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                            {newRecStudentNoHint ? (
                              <div className="mt-2 text-xs font-bold text-red-700">
                                {newRecStudentNoHint}
                              </div>
                            ) : null}
                          </div>
                          {lockIdentity ? (
                            <div>
                              <label
                                className={`mb-1.5 block text-xs font-bold uppercase ${lockedLabel} dark:text-zinc-200`}
                              >
                                Full Name
                              </label>
                              <input
                                type="text"
                                className={`form-input h-11 rounded-brand ${lockedField}`}
                                value={newRec.name}
                                disabled
                              />
                            </div>
                          ) : (
                            <div>
                              <label
                                className="mb-1.5 block text-xs font-bold uppercase text-gray-700 dark:text-zinc-200"
                              >
                                Full Name (LN, FN MI.)
                              </label>
                               <div className="relative">
                                <input
                                  type="text"
                                  className={`form-input w-full h-11 rounded-brand ${ring("name")}`}
                                  placeholder="e.g. DELA CRUZ, JUAN S."
                                  value={newRec.name || ""}
                                  onFocus={() => setShowNameSuggestions(true)}
                                  onBlur={() => {
                                    setTimeout(() => setShowNameSuggestions(false), 200)
                                  }}
                                  onChange={(e) => {
                                    clearUploadFieldError?.("name")
                                    setNewRec((p) => ({ ...p, name: e.target.value }))
                                  }}
                                />
                                {showNameSuggestions && filteredNameSuggestions.length > 0 && (
                                  <div className="absolute z-50 left-0 right-0 mt-1 rounded-brand border border-gray-200 bg-white overflow-hidden shadow-lg animate-in fade-in slide-in-from-top-1 duration-200 dark:bg-zinc-900 dark:border-zinc-800">
                                    {filteredNameSuggestions.map((s) => {
                                      const sn = String(s?.studentNo || s?.student_no || "");
                                      return (
                                        <button
                                          key={sn}
                                          type="button"
                                          onMouseDown={(e) => e.preventDefault()}
                                          className="w-full text-left px-3 py-2 border-b last:border-b-0 border-gray-100 hover:bg-red-50/55 transition-colors group flex flex-col gap-0.5 dark:border-zinc-800 dark:hover:bg-zinc-800/50"
                                          onClick={() => handleSelectStudent(s)}
                                        >
                                          <div className="text-sm font-bold text-gray-900 dark:text-zinc-100 group-hover:text-pup-maroon dark:group-hover:text-red-400 transition-colors">
                                            {s?.name}
                                          </div>
                                          <div className="text-[10px] text-gray-500 dark:text-zinc-400">
                                            {sn}
                                          </div>
                                        </button>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

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
                                    {r}
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
                                      {c}
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
                                      {d}
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
