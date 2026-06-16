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
import { findStudentsByOcrName } from "@/lib/ocrClient"
function toNormalCase(str) {
  if (!str) return ""
  return str
    .toLowerCase()
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
}

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
  const [showPagesSidebar, setShowPagesSidebar] = useState(true)
  const [pendingDroppedFile, setPendingDroppedFile] = useState(null)
  const [confirmDropOpen, setConfirmDropOpen] = useState(false)
  const [windowDragActive, setWindowDragActive] = useState(false)
  const [csvPage, setCsvPage] = useState(1)
  const [csvRowsPerPage, setCsvRowsPerPage] = useState(10)
  const [csvSearch, setCsvSearch] = useState("")
  const [localCsvSearch, setLocalCsvSearch] = useState("")

  useEffect(() => {
    const handler = setTimeout(() => {
      setCsvSearch(localCsvSearch)
      setCsvPage(1)
    }, 300)
    return () => clearTimeout(handler)
  }, [localCsvSearch])

  const filteredCsvRows = useMemo(() => {
    if (!csvSearch) return csvRows
    const q = csvSearch.toLowerCase()
    return csvRows.filter(r => {
      return (
        String(r.student?.studentNo || "").toLowerCase().includes(q) ||
        String(r.student?.name || "").toLowerCase().includes(q) ||
        String(r.student?.courseCode || "").toLowerCase().includes(q)
      )
    })
  }, [csvRows, csvSearch])

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
    const startIndex = (csvPage - 1) * csvRowsPerPage
    return filteredCsvRows.slice(startIndex, startIndex + csvRowsPerPage)
  }, [filteredCsvRows, csvPage, csvRowsPerPage])

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
      <Card className="rounded-brand border border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-card dark:shadow-none overflow-hidden mb-4">
        <PageHeader
          icon="ph-scan"
          title="Scan & Upload"
          description="Scan student records or import files to save them digitally."
          showBorder={false}
          titleClassName="text-[15px] font-bold text-gray-900 dark:text-zinc-50"
          descriptionClassName="text-[14px] font-normal text-[#8E8E93] dark:text-zinc-400 mt-[2px]"
          actions={
            uploadMode === "pdf" && (
              <RefreshButton
                onRefresh={(e) => {
                  e.stopPropagation()
                  hf.refresh()
                }}
                isLoading={hf.loading}
                className="h-[32px] w-[32px] rounded-full p-[6px] !text-[#8E8E93] hover:!text-[#636366] hover:!bg-[#F5F5F7] transition-all duration-200 dark:!text-zinc-400 dark:hover:!text-zinc-200 dark:hover:!bg-white/10"
              />
            )
          }
        />

        {/* Mode Toggles as Sub-tabs */}
        <div className="w-full select-none px-6 border-b border-gray-100 dark:border-white/5">
          <div className="flex items-center gap-[24px]">
            <button
              type="button"
              onClick={() => setUploadMode("pdf")}
              className={`flex items-center justify-center text-[15px] pt-[14px] pb-[10px] -mb-[0.5px] border-b-2 border-t-0 border-x-0 rounded-none cursor-pointer bg-transparent focus:outline-none transition-colors ${
                uploadMode === "pdf"
                  ? "border-black text-black dark:border-zinc-50 dark:text-zinc-50 font-semibold"
                  : "border-transparent text-[#8E8E93] hover:text-[#111111] dark:hover:text-zinc-200 font-normal"
              }`}
            >
              <span className="whitespace-nowrap tracking-wide">Document</span>
            </button>
            <button
              type="button"
              onClick={() => setUploadMode("csv")}
              className={`flex items-center justify-center text-[15px] pt-[14px] pb-[10px] -mb-[0.5px] border-b-2 border-t-0 border-x-0 rounded-none cursor-pointer bg-transparent focus:outline-none transition-colors ${
                uploadMode === "csv"
                  ? "border-black text-black dark:border-zinc-50 dark:text-zinc-50 font-semibold"
                  : "border-transparent text-[#8E8E93] hover:text-[#111111] dark:hover:text-zinc-200 font-normal"
              }`}
            >
              <span className="whitespace-nowrap tracking-wide">Batch (CSV)</span>
            </button>
          </div>
        </div>

        <CardContent className="flex flex-col p-[24px] pt-4">
          {loading ? (
            <div className="flex h-full w-full flex-1 flex-col items-center justify-center bg-white p-10 min-h-[400px] dark:bg-card">
              <div className="flex flex-col items-center gap-4">
                <i className="ph-bold ph-spinner animate-spin text-xl text-[#0A84FF] dark:text-primary" />
                <p className="text-sm font-semibold text-gray-500 tracking-widest dark:text-zinc-400">
                  Loading...
                </p>
              </div>
            </div>
          ) : error ? (
            <div className="flex min-h-0 flex-1 flex-col items-center justify-center p-6">
              <Empty className="flex h-[320px] flex-col items-center justify-center border-0 text-center text-gray-500 dark:text-zinc-400">
                <EmptyHeader className="flex flex-col items-center gap-0">
                  <EmptyMedia className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-card dark:shadow-none">
                    <i className="ph-duotone ph-warning-circle text-xl text-pup-maroon dark:text-primary" />
                  </EmptyMedia>
                  <EmptyTitle className="text-lg font-semibold text-[#1C1C1E] dark:text-zinc-50">
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
                title="Clear Scanner Inbox?"
                message={`This will remove ${hf.rows.length} queued item(s) from the scanner inbox. You can’t undo this.`}
                confirmLabel="Clear Inbox"
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
                title="Replace Loaded Document?"
                message="An existing document is already loaded in the preview area. Are you sure you want to replace it with the new file?"
                confirmLabel="Replace File"
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

              <div className="flex flex-col gap-6 h-auto lg:flex-row lg:items-stretch">
                <section
                  className={cn(
                    "relative flex h-auto min-h-[580px] flex-col transition-all duration-300",
                    uploadMode === "csv" ? "w-full lg:w-[68%]" : "w-full lg:w-[48%]"
                  )}
                >
                  {uploadMode === "csv" ? (
                    csvFile ? (
                      <div className="flex h-full w-full flex-col overflow-hidden bg-white transition-all duration-300 rounded-[16px] border border-[#E5E5EA] dark:bg-card dark:border-white/10">
                        <div className="flex flex-col items-center justify-between gap-4 border-b border-gray-100 bg-gray-50/50 p-6 px-8 sm:flex-row dark:border-white/10 dark:bg-white/5">
                          <div className="flex items-center gap-4">
                            <div>
                              <h3 className="text-[18px] font-semibold tracking-[-0.01em] text-gray-900 dark:text-zinc-50">
                                CSV Preview
                              </h3>
                              <div className="mt-[4px] text-[13px] font-normal text-gray-500 dark:text-zinc-400">
                                <div className="flex flex-col gap-0.5">
                                  <span className="break-all text-pup-maroon dark:text-red-400 font-medium text-[13px]">
                                    {csvFile.name}
                                  </span>
                                  <span className="text-[11px] font-normal text-gray-400 dark:text-zinc-500 mt-[2px]">
                                    {csvRows.length} rows detected ·{" "}
                                    {csvRows.filter((r) => r.error).length} invalid
                                    rows
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        <div className="flex shrink-0 items-center gap-4">
                            <div className="relative group w-48 sm:w-64">
                              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                                <i className="ph-bold ph-magnifying-glass text-gray-400 transition-colors group-focus-within:text-pup-maroon dark:text-zinc-500 text-sm"></i>
                              </div>
                              <Input
                                type="text"
                                className="h-[36px] w-full rounded-[8px] border-[0.5px] border-gray-200 bg-white pl-9 pr-4 text-[13px] font-normal transition-all focus:border-pup-maroon/30 focus:ring-4 focus:ring-pup-maroon/5 placeholder:text-gray-400 dark:border-white/10 dark:bg-card dark:text-zinc-300 dark:focus:border-primary"
                                placeholder="Search records..."
                                value={localCsvSearch}
                                onChange={(e) => setLocalCsvSearch(e.target.value)}
                              />
                            </div>
                             <Button
                               variant="ghost"
                               size="sm"
                               onClick={() => handleCsvFileSelect(null)}
                               className="h-10 px-3 font-semibold text-sm text-gray-600 hover:text-gray-900 hover:bg-transparent dark:text-zinc-400 dark:hover:text-zinc-200 dark:hover:bg-transparent transition-colors flex items-center gap-2 rounded-brand shadow-none! border-0!"
                             >
                               Clear File
                             </Button>
                          </div>
                        </div>

                        <div
                          className={`relative min-h-0 flex-1 overflow-auto transition-colors duration-200 ${csvDropActive ? "bg-[#FAFAFA]" : ""} dark:bg-[#2c2c2c]`}
                          onDragOver={(e) => {
                            e.preventDefault()
                            setCsvDropActive(true)
                          }}
                        >
                          {csvDropActive && (
                            <div
                              className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-[#0A84FF]/5 backdrop-blur-xs border-2 border-dashed border-[#D1D1D6] rounded-[16px] animate-fade-up dark:bg-blue-600/[0.04] dark:border-primary/50"
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
                                  (file.name.toLowerCase().endsWith(".csv") ||
                                    file.type === "text/csv" ||
                                    file.type === "application/vnd.ms-excel" ||
                                    file.type === "application/csv" ||
                                    file.type === "")
                                ) {
                                  handleCsvFileSelect(file)
                                }
                              }}
                            >
                              <div className="flex flex-col items-center justify-center p-6 bg-white rounded-2xl border border-[#E5E5EA] shadow-2xl max-w-xs text-center pointer-events-none dark:bg-card/95 dark:border-white/10 animate-scale-up">
                                <div className="w-14 h-14 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center mb-3 dark:bg-blue-950/30">
                                  <i className="ph-duotone ph-file-csv text-xl text-[#0A84FF] dark:text-primary animate-bounce"></i>
                                </div>
                                <p className="text-sm font-semibold text-[#1C1C1E] dark:text-zinc-50">
                                  Drop CSV here to replace data
                                </p>
                                <p className="text-[11px] font-semibold text-[#0A84FF] dark:text-primary mt-1.5 tracking-wider dark:text-primary">
                                  Load new batch
                                </p>
                              </div>
                            </div>
                          )}
                          {filteredCsvRows.length ? (
                            <table className="min-w-full text-sm">
                              <thead className="sticky top-0 z-10 border-b border-gray-200 bg-white dark:bg-card dark:border-white/10">
                                <tr className="text-left text-[12px] font-medium tracking-[0.04em] text-gray-400 dark:text-zinc-500">
                                  <th className="w-12 p-4 text-center">
                                    <input
                                      type="checkbox"
                                      className="h-4 w-4 cursor-pointer rounded border border-gray-300 text-pup-maroon dark:text-primary accent-pup-maroon focus:ring-pup-maroon dark:text-primary dark:border-white/10"
                                      checked={
                                        filteredCsvRows.length > 0 &&
                                        Object.keys(csvSelected).filter(k => csvSelected[k]).length >= filteredCsvRows.length &&
                                        filteredCsvRows.every(r => csvSelected[r.index])
                                      }
                                      onChange={(e) => {
                                        const checked = e.target.checked
                                        const next = { ...csvSelected }
                                        filteredCsvRows.forEach(r => {
                                          next[r.index] = checked
                                        })
                                        setCsvSelected(next)
                                      }}
                                    />
                                  </th>
                                  <th className="p-4">#</th>
                                  <th className="p-4">Student No</th>
                                  <th className="p-4">Name</th>
                                  <th className="p-4">Course</th>
                                  <th className="p-4">Year</th>
                                  <th className="p-4">Section</th>
                                  <th className="p-4">Room</th>
                                  <th className="p-4">Cabinet</th>
                                  <th className="p-4">Drawer</th>
                                  <th className="p-4 text-right">Status</th>
                                </tr>
                              </thead>
                              <tbody className="bg-transparent">
                                {paginatedCsvRows.map((r) => {
                                  const isValid = isLocationValid(r.student.room, r.student.cabinet, r.student.drawer)
                                  const isSelected = !!csvSelected?.[r.index]

                                  return (
                                    <tr
                                      key={r.index}
                                      className={cn(
                                        "group h-[52px] border-b-[0.5px] border-gray-100 dark:border-white/10 last:border-b-0 transition-all duration-200 hover:bg-gray-50/40 dark:bg-card dark:hover:bg-white/2 select-none cursor-pointer",
                                        isSelected && "bg-blue-50/60 dark:bg-blue-950/20"
                                      )}
                                      onClick={() => toggleCsvRowSelected(r.index)}
                                    >
                                      <td className="py-0 px-4 align-middle text-center" onClick={(e) => e.stopPropagation()}>
                                        <input
                                          type="checkbox"
                                          className={cn(
                                            "h-4 w-4 cursor-pointer rounded border border-gray-300 text-pup-maroon dark:text-primary accent-pup-maroon focus:ring-pup-maroon dark:text-primary dark:border-white/10 transition-opacity",
                                            isSelected ? "opacity-100" : "opacity-50 group-hover:opacity-80"
                                          )}
                                          checked={isSelected}
                                          onChange={() => toggleCsvRowSelected(r.index)}
                                        />
                                      </td>
                                      <td className="py-0 px-4 align-middle text-[13px] font-medium tracking-[-0.01em] text-gray-400 dark:text-zinc-500">
                                        {r.index}
                                      </td>
                                      <td className="py-0 px-4 align-middle text-[13px] font-medium tracking-[-0.01em] text-gray-900 dark:text-zinc-50">
                                        {r.student.studentNo}
                                      </td>
                                      <td className="py-0 px-4 align-middle text-[13px] font-medium tracking-[-0.01em] text-gray-900 dark:text-zinc-50">
                                        {toNormalCase(r.student.name)}
                                      </td>
                                      <td className="py-0 px-4 align-middle">
                                        <span className="inline-flex w-fit items-center justify-center rounded-[4px] bg-gray-100 px-[8px] py-[3px] text-[11px] font-medium text-gray-900 dark:bg-zinc-800 dark:text-zinc-100">
                                          {r.student.courseCode}
                                        </span>
                                      </td>
                                      <td className="py-0 px-4 align-middle text-[13px] font-medium tracking-[-0.01em] text-gray-700 dark:text-zinc-300">
                                        {r.student.yearLevel}
                                      </td>
                                      <td className="py-0 px-4 align-middle text-[13px] font-medium tracking-[-0.01em] text-gray-700 dark:text-zinc-300">
                                        {r.student.section}
                                      </td>
                                      <td className="py-0 px-4 align-middle" onClick={(e) => e.stopPropagation()}>
                                        <Select
                                          className="h-8 w-16 rounded-[6px] border border-gray-200 px-2 py-0 text-[11px] font-medium dark:border-white/10"
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
                                      <td className="py-0 px-4 align-middle" onClick={(e) => e.stopPropagation()}>
                                        <Select
                                          className="h-8 w-16 rounded-[6px] border border-gray-200 px-2 py-0 text-[11px] font-medium dark:border-white/10"
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
                                      <td className="py-0 px-4 align-middle" onClick={(e) => e.stopPropagation()}>
                                        <Select
                                          className="h-8 w-16 rounded-[6px] border border-gray-200 px-2 py-0 text-[11px] font-medium dark:border-white/10"
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
                                      <td className="py-0 px-4 align-middle text-right">
                                        <span
                                          className={cn(
                                            "inline-flex w-fit items-center justify-center rounded-[4px] px-[8px] py-[3px] text-[11px] font-medium uppercase tracking-[0.04em] shadow-none transition-all border",
                                            r.error
                                              ? "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/20 dark:text-red-500/90 dark:border-red-900/50"
                                              : !isValid
                                              ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:text-amber-500/90 dark:border-amber-900/50"
                                              : "bg-green-50 text-green-700 border-green-200 dark:bg-emerald-950/20 dark:text-emerald-500/90 dark:border-emerald-900/50"
                                          )}
                                          title={r.error || (!isValid ? "This location does not exist in the physical system." : undefined)}
                                        >
                                          {r.error ? "Error" : !isValid ? "Invalid" : "Valid"}
                                        </span>
                                      </td>
                                    </tr>
                                  )
                                })}
                              </tbody>
                            </table>
                          ) : (
                            <Empty className="py-12">
                              <EmptyMedia>
                                <i className="ph-magnifying-glass" />
                              </EmptyMedia>
                              <EmptyTitle>No Matches Found</EmptyTitle>
                              <EmptyDescription>
                                We couldn&apos;t find any rows matching &quot;{csvSearch}&quot;.
                              </EmptyDescription>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setLocalCsvSearch("")}
                                className="mt-6 h-9 rounded-[10px] border-[#E5E5EA] px-6 font-semibold text-xs tracking-widest text-[#0A84FF] hover:bg-[#F5F5F7] dark:text-primary dark:border-white/10"
                              >
                                Clear Search
                              </Button>
                            </Empty>
                          )}
                        </div>

                        {filteredCsvRows.length > 0 && (
                          <div className="flex items-center justify-between border-t border-gray-100 bg-white p-6 px-8 dark:border-white/10 dark:bg-card">
                            <div className="flex items-center gap-8">
                              <div className="flex items-center gap-6 text-[12px] font-normal text-gray-400 dark:text-zinc-500">
                                <span>
                                  Showing {paginatedCsvRows.length} of {filteredCsvRows.length}
                                </span>
                                <div className="flex items-center gap-1.5 border-l border-gray-200 pl-6 dark:border-white/10">
                                  <span className="text-[12px] text-gray-400 dark:text-zinc-500">Rows:</span>
                                  <div className="flex items-center gap-1">
                                    {[10, 20, 50, 100].map((size) => (
                                      <button
                                        key={size}
                                        type="button"
                                        onClick={() => {
                                          setCsvRowsPerPage(size)
                                          setCsvPage(1)
                                        }}
                                        className={`px-2 py-0.5 rounded-[4px] text-[12px] font-normal cursor-pointer transition-colors border-0 ${
                                          csvRowsPerPage === size
                                            ? "bg-gray-100 text-[#111111] font-medium dark:bg-white/10 dark:text-zinc-50"
                                            : "bg-transparent text-gray-450 dark:text-zinc-550 hover:text-gray-700 dark:hover:text-zinc-300"
                                        }`}
                                      >
                                        {size}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            </div>

                            <div className="flex shrink-0 items-center gap-3">
                              <button
                                disabled={csvPage <= 1}
                                onClick={() => setCsvPage((p) => Math.max(1, p - 1))}
                                className="h-8 bg-transparent text-[12px] font-normal text-gray-400 hover:text-pup-maroon dark:text-zinc-500 dark:hover:text-zinc-200 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer border-0 p-0"
                              >
                                Prev
                              </button>

                              <div className="flex h-8 min-w-[32px] items-center justify-center rounded-[6px] border border-gray-200/80 bg-white px-2.5 text-[12px] font-medium text-gray-900 dark:border-white/10 dark:bg-card dark:text-zinc-100">
                                {csvPage}
                              </div>

                              <button
                                disabled={csvPage >= Math.ceil(filteredCsvRows.length / csvRowsPerPage)}
                                onClick={() => setCsvPage((p) => Math.min(Math.ceil(filteredCsvRows.length / csvRowsPerPage), p + 1))}
                                className="h-8 bg-transparent text-[12px] font-normal text-gray-400 hover:text-pup-maroon dark:text-zinc-500 dark:hover:text-zinc-200 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer border-0 p-0"
                              >
                                Next
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div
                        className={cn(
                          "group relative flex min-h-[500px] flex-1 cursor-pointer flex-col items-center justify-center p-6 rounded-[12px] border border-[#E5E5EA] bg-[#FAFAFA] transition-all duration-150 ease-out dark:bg-zinc-900/50 dark:border-white/12",
                          csvDropActive ? "border-pup-maroon/40" : ""
                        )}
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
                            (file.name.toLowerCase().endsWith(".csv") ||
                              file.type === "text/csv" ||
                              file.type === "application/vnd.ms-excel" ||
                              file.type === "application/csv" ||
                              file.type === "")
                          ) {
                            handleCsvFileSelect(file)
                          }
                        }}
                      >
                        <input
                          type="file"
                          className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
                          accept=".csv"
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (file) {
                              handleCsvFileSelect(file)
                            }
                          }}
                        />
                        <div className="pointer-events-none flex flex-col items-center justify-center text-center w-full h-full">
                          <i className={cn("ph-bold ph-tray-arrow-up text-[32px] transition-colors duration-150", csvDropActive ? "text-pup-maroon" : "text-[#C7C7CC]")}></i>
                          <p className="text-[14px] font-medium text-[#111111] dark:text-zinc-100 mt-[12px] m-0">
                            Drop CSV File Here
                          </p>
                          <p className="text-[13px] font-normal text-[#8E8E93] mt-[4px] m-0">
                            or click to <span className="text-[#E5484D] cursor-pointer hover:underline">browse</span> local files (.csv)
                          </p>
                        </div>
                      </div>
                    )
                  ) : (
                    <div className="flex flex-col gap-4 w-full h-full">
                      <div
                        className={cn(
                          "group relative flex flex-1 min-h-[480px] w-full flex-col overflow-hidden rounded-[12px] border border-[#E5E5EA] transition-all duration-150 ease-out",
                          uploadedFile ? "bg-white dark:bg-card" : "bg-[#FAFAFA] dark:bg-zinc-900/50",
                          fe.pdfFile ? "border-orange-400 bg-orange-50/30" : "",
                          "dark:border-white/12"
                        )}
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
                        {uploadedFile ? (
                          <div
                            className={`relative flex-1 flex flex-col overflow-hidden rounded-[11px] bg-white transition-all duration-200 dark:bg-card`}
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
                            <div className="flex shrink-0 items-center justify-between gap-2 border-b border-[#E5E5EA] bg-white px-4 py-2.5 dark:border-white/10 dark:bg-card">
                          <div className="min-w-0">
                            <div className="text-[15px] font-medium text-gray-500 dark:text-zinc-400">
                              {hf.selectedRow ? "Scanner Preview" : "Document Preview"}
                            </div>
                            <div className="truncate text-sm font-semibold text-pup-maroon dark:text-red-400">
                              {hf.selectedRow?.original_filename || uploadedFile?.name}
                            </div>
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            {(hf.ocrLoading || ocrLoading) && (
                              <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-amber-50 border border-amber-100 text-amber-700 font-semibold text-[9px] tracking-wider animate-pulse dark:bg-amber-950/20 dark:border-amber-900/30">
                                <i className="ph-bold ph-spinner animate-spin" />
                                OCR Active
                              </div>
                            )}
                             {uploadedFiles && uploadedFiles.length > 1 && !hf.selectedRow && (
                               <Button
                                 type="button"
                                 variant="ghost"
                                 size="sm"
                                 onClick={() => setShowPagesSidebar(!showPagesSidebar)}
                                 className="h-8 px-2.5 font-semibold text-xs text-gray-600 hover:text-gray-900 hover:bg-transparent dark:text-zinc-400 dark:hover:text-zinc-200 dark:hover:bg-transparent transition-colors shadow-none! border-0!"
                               >
                                 {showPagesSidebar ? "Hide" : "Show"}
                               </Button>
                             )}
                            <button
                              type="button"
                              className="flex h-8 w-8 items-center justify-center rounded-[8px] border border-[#E5E5EA] bg-white text-gray-600 shadow-sm transition-all hover:bg-[#FAFAFA] hover:text-[#0A84FF] dark:bg-card dark:text-zinc-300 dark:shadow-none dark:hover:border-zinc-700 dark:border-white/10"
                              onClick={() => setRotation((r) => r - 90)}
                              title="Rotate Left"
                            >
                              <i className="ph-bold ph-arrow-counter-clockwise text-xs" />
                            </button>
                            <button
                              type="button"
                              className="flex h-8 w-8 items-center justify-center rounded-[8px] border border-[#E5E5EA] bg-white text-gray-600 shadow-sm transition-all hover:bg-[#FAFAFA] hover:text-[#0A84FF] dark:bg-card dark:text-zinc-300 dark:shadow-none dark:hover:border-zinc-700 dark:border-white/10"
                              onClick={() => setRotation((r) => r + 90)}
                              title="Rotate Right"
                            >
                              <i className="ph-bold ph-arrow-clockwise text-xs" />
                            </button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="ml-1 h-8 px-2.5 font-semibold text-xs text-gray-600 hover:text-gray-900 hover:bg-transparent dark:text-zinc-400 dark:hover:text-zinc-200 dark:hover:bg-transparent transition-colors shadow-none! border-0!"
                              onClick={() => {
                                if (hf.selectedRow) {
                                  hf.clearIngestSelection()
                                }
                                handleClearPdf()
                              }}
                            >
                              <i className="ph-bold ph-x text-xs" />
                              Close
                            </Button>
                          </div>
                        </div>
                        <div className="min-h-0 flex-1 flex overflow-hidden bg-gray-100 relative dark:bg-muted">
                          {uploadedFiles && uploadedFiles.length > 1 && !hf.selectedRow && showPagesSidebar && (
                            <div className="w-1/3 min-w-[200px] max-w-[280px] border-r border-[#E5E5EA] bg-white/95 backdrop-blur-md flex flex-col min-h-0 overflow-y-auto p-4 gap-3 dark:border-white/10 dark:bg-card/95 shrink-0 z-10">
                              <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-white/5">
                                <span className="text-[10px] font-semibold tracking-widest text-gray-400 dark:text-zinc-500">
                                  Scan Pages ({uploadedFiles.length})
                                </span>
                                <span className="text-[9px] font-semibold text-[#0A84FF] dark:text-primary bg-blue-50 dark:bg-red-950/30 px-1.5 py-0.5 rounded-full">
                                  Combine Pages
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
                                      className={`group flex flex-col gap-1 rounded-[10px] border p-3 text-left cursor-pointer transition-all ${ isSelected ? "border-[#0A84FF] bg-blue-50/40 dark:border-primary dark:bg-zinc-800" : "border-transparent bg-gray-50 hover:bg-gray-100 dark:bg-white/5 dark:hover:bg-white/10" }`}
                                    >
                                      <div className="flex items-center justify-between gap-1.5">
                                        <span className="truncate text-xs font-semibold text-[#1C1C1E] dark:text-zinc-50">
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
                                className="mt-auto flex h-10 items-center justify-center gap-1.5 rounded-[10px] border border-[#E5E5EA] bg-white text-[10px] font-semibold tracking-widest text-gray-600 transition-all hover:bg-[#FAFAFA] dark:bg-card dark:border-white/10 dark:text-zinc-300"
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
                                  <div className="h-10 w-10 animate-spin rounded-full border border-gray-300 border-t-[#0A84FF] mb-3 dark:border-white/10" />
                                  <div className="text-xs font-semibold text-gray-500 tracking-widest animate-pulse dark:text-zinc-400">
                                    Loading Preview…
                                  </div>
                                </div>
                              )
                            }

                            return (
                              <div className="flex h-full w-full items-center justify-center bg-gray-100 p-8 text-xs font-semibold text-gray-400 dark:text-zinc-500 dark:bg-muted">
                                Preview Not Available
                              </div>
                            )
                          })()}
                          </div>

                          {windowDragActive && (
                            <div
                              className="absolute inset-0 z-30 flex items-center justify-center bg-gray-500/10 backdrop-blur-md border border-gray-200 rounded-[12px] animate-fade-up dark:bg-white/5"
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
                              <div className="flex flex-col items-center justify-center p-6 bg-white rounded-[12px] border border-[#E5E5EA] shadow-xl max-w-xs text-center pointer-events-none animate-scale-up dark:bg-card dark:border-white/10">
                                <div className="w-14 h-14 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center mb-3 dark:bg-muted">
                                  <i className="ph-bold ph-tray-arrow-up text-xl text-[#C7C7CC] animate-bounce"></i>
                                </div>
                                <p className="text-sm font-medium text-[#111111] dark:text-zinc-100">
                                  Drop file here to replace preview
                                </p>
                                <p className="text-[13px] font-normal text-[#8E8E93] mt-1.5 dark:text-zinc-400">
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
                          >
                            <input
                              type="file"
                              className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
                              accept=".pdf,image/*"
                              multiple
                              onChange={(e) => handlePdfFileSelect(e.target.files)}
                            />
                            <div className="pointer-events-none flex flex-col items-center justify-center text-center w-full h-full">
                              <i className={cn("ph-bold ph-tray-arrow-up text-[32px] transition-colors duration-150", dropActive ? "text-pup-maroon" : "text-[#C7C7CC]")}></i>
                              <p className="text-[14px] font-medium text-[#111111] dark:text-zinc-100 mt-[12px] m-0">
                                Drop Document Or Image Here
                              </p>
                              <p className="text-[13px] font-normal text-[#8E8E93] mt-[4px] m-0">
                                or click to <span className="text-[#E5484D] cursor-pointer hover:underline">browse</span> local files (PDF, JPG, PNG)
                              </p>
                              {hf.rows.length > 0 ? (
                                <p className="mx-auto mt-4 max-w-xs text-[11px] font-medium text-gray-500 dark:text-zinc-400">
                                  This area still accepts manual drops and clicks even
                                  while the scanner inbox is shown above.
                                </p>
                              ) : null}
                            </div>

                            <div className="mt-8 flex flex-col items-center gap-1.5 select-none relative z-20" onClick={(e) => e.stopPropagation()}>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={handlePasteButtonClick}
                                className="flex items-center gap-2 h-9 rounded-[10px] border-[#E5E5EA] bg-white font-semibold text-gray-700 hover:bg-[#F5F5F7] dark:bg-card dark:hover:bg-zinc-800 dark:border-white/10"
                              >
                                <i className="ph-bold ph-clipboard-text text-sm"></i>
                                Paste from clipboard
                              </Button>
                              <span className="text-[10px] text-gray-400 font-medium dark:text-zinc-500">
                                Or press Ctrl+V / Cmd+V anywhere on this page
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
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
                    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center rounded-[16px] bg-white/95 backdrop-blur-sm dark:bg-card/90">
                      <div className="w-full max-w-xs px-6">
                        <div className="rounded-[16px] border border-[#E5E5EA] bg-white p-[26px] shadow-[0_4px_16px_rgba(0,0,0,0.06)] dark:border-white/10 dark:bg-zinc-900 dark:shadow-none flex flex-col items-center justify-center">
                          <div className="h-[34px] w-[34px] rounded-full border-[2.5px] border-[#E5E5EA] border-t-pup-maroon dark:border-zinc-800 dark:border-t-pup-maroon animate-spin mb-[12px]"></div>
                          <div className="text-center text-[13px] font-normal text-[#8E8E93] dark:text-zinc-400">
                            Processing scanned information...
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </section>

                <section
                  className={`font-inter flex h-fit flex-col overflow-hidden rounded-[16px] border border-[#E5E5EA] bg-white shadow-sm transition-all duration-300 ${ uploadMode === "csv" ? "w-full lg:w-[32%]" : "lg:w-[52%]" } dark:border-white/10 dark:bg-card dark:shadow-none`}
                >
                  <div className="flex flex-col gap-[2px] border-b border-gray-100 bg-transparent p-[20px] pb-[16px] dark:border-white/10">
                    <h3 className="text-[16px] font-bold text-[#1C1C1E] dark:text-zinc-50 m-0">
                      {uploadMode === "csv" ? "Bulk Upload" : "Label Document"}
                    </h3>
                    <p className="text-[13px] font-normal text-[#8E8E93] leading-[1.5] dark:text-zinc-400 m-0">
                      {uploadMode === "csv"
                        ? "Review rows, bulk-edit locations, then import students."
                        : uploadedFile
                          ? "Review scanned information and fill in missing fields."
                          : "Drop or select a file on the left, then fill in the form here."}
                    </p>
                  </div>

                  <div className="p-[20px] bg-white dark:bg-white/5">
                    {uploadMode === "pdf" ? (
                      <div className="space-y-6">
                        {uploadStudentIsExisting && (
                          <div className="flex flex-col gap-2 rounded-[10px] border border-emerald-200 bg-emerald-50 px-3 py-2.5 dark:border-emerald-500/20 dark:bg-emerald-950/20">
                             <span className="inline-flex items-start gap-2 text-[11px] font-medium tracking-[0.04em] text-emerald-900 dark:text-emerald-400">
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
                              className="shrink-0 text-left text-[11px] font-semibold text-pup-maroon dark:text-red-400 underline-offset-2 hover:underline"
                              onClick={() => {
                                setUploadStudentIsExisting(false)
                                clearAllUploadFieldErrors?.()
                              }}
                            >
                              Switch to new student
                            </button>
                          </div>
                        )}

                        <div className="grid grid-cols-1 gap-6">
                          <div>
                            <div className="mb-2 flex items-center justify-between">
                              <label
                                className={`block text-[11px] font-medium tracking-[0.04em] ${ lockIdentity ? lockedLabel : "text-gray-500" } dark:text-zinc-400`}
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
                                  className="h-5 rounded-[6px] px-1.5 text-[9px] font-semibold text-pup-maroon dark:text-primary hover:bg-red-50 dark:text-primary dark:bg-red-950/30"
                                >
                                  Clear All
                                </Button>
                              )}
                            </div>
                            <div className="relative">
                              <input
                                type="text"
                                className={`h-11 w-full rounded-[10px] border border-[#E5E5EA] bg-white px-[12px] text-[13px] font-medium text-[#1C1C1E] transition-all hover:bg-[#FAFAFA] focus:border-pup-maroon/30 focus:ring-4 focus:ring-pup-maroon/5 outline-none dark:bg-zinc-800 dark:border-white/10 dark:text-zinc-100 ${ring("studentNo")} ${ lockIdentity ? lockedField : "" }`}
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
                                <div className="absolute z-50 left-0 right-0 mt-1 rounded-[10px] border border-[#E5E5EA] bg-white overflow-hidden shadow-lg animate-in fade-in slide-in-from-top-1 duration-200 dark:bg-zinc-900 dark:border-zinc-800">
                                  {filteredStudentNoSuggestions.map((s) => {
                                    const sn = String(s?.studentNo || s?.student_no || "");
                                    return (
                                      <button
                                        key={sn}
                                        type="button"
                                        onMouseDown={(e) => e.preventDefault()}
                                        className="w-full text-left px-3 py-2 border-b last:border-b-0 border-gray-100 hover:bg-[#FAFAFA] transition-colors group flex flex-col gap-0.5 dark:border-zinc-800 dark:hover:bg-zinc-800/50"
                                        onClick={() => handleSelectStudent(s)}
                                      >
                                        <div className="text-sm font-semibold text-[#1C1C1E] dark:text-zinc-100 group-hover:text-pup-maroon dark:group-hover:text-red-400 transition-colors">
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
                              <div className="mt-2 text-xs font-semibold text-red-700">
                                {newRecStudentNoHint}
                              </div>
                            ) : null}
                          </div>
                          {lockIdentity ? (
                            <div>
                              <label
                                className={`mb-2 block text-[11px] font-medium tracking-[0.04em] ${lockedLabel} dark:text-zinc-400`}
                              >
                                Full Name
                              </label>
                              <input
                                type="text"
                                className={`h-11 w-full rounded-[10px] border border-[#E5E5EA] bg-white px-[12px] text-[13px] font-medium transition-all dark:bg-zinc-800 dark:border-white/10 dark:text-zinc-100 ${lockedField}`}
                                value={newRec.name}
                                disabled
                              />
                            </div>
                          ) : (
                            <div>
                              <label
                                className="mb-2 block text-[11px] font-medium tracking-[0.04em] text-gray-500 dark:text-zinc-400"
                              >
                                Full Name (LN, FN MI.)
                              </label>
                               <div className="relative">
                                <input
                                  type="text"
                                  className={`h-11 w-full rounded-[10px] border border-[#E5E5EA] bg-white px-[12px] text-[13px] font-medium text-[#1C1C1E] transition-all hover:bg-[#FAFAFA] focus:border-pup-maroon/30 focus:ring-4 focus:ring-pup-maroon/5 outline-none dark:bg-zinc-800 dark:border-white/10 dark:text-zinc-100 ${ring("name")}`}
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
                                  <div className="absolute z-50 left-0 right-0 mt-1 rounded-[10px] border border-[#E5E5EA] bg-white overflow-hidden shadow-lg animate-in fade-in slide-in-from-top-1 duration-200 dark:bg-zinc-900 dark:border-zinc-800">
                                    {filteredNameSuggestions.map((s) => {
                                      const sn = String(s?.studentNo || s?.student_no || "");
                                      return (
                                        <button
                                          key={sn}
                                          type="button"
                                          onMouseDown={(e) => e.preventDefault()}
                                          className="w-full text-left px-3 py-2 border-b last:border-b-0 border-gray-100 hover:bg-[#FAFAFA] transition-colors group flex flex-col gap-0.5 dark:border-zinc-800 dark:hover:bg-zinc-800/50"
                                          onClick={() => handleSelectStudent(s)}
                                        >
                                          <div className="text-sm font-semibold text-[#1C1C1E] dark:text-zinc-100 group-hover:text-pup-maroon dark:group-hover:text-red-400 transition-colors">
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
                            className={`mb-2 block text-[11px] font-medium tracking-[0.04em] ${ lockIdentity ? lockedLabel : "text-gray-500" } dark:text-zinc-400`}
                          >
                            Course / Program
                          </label>
                          <Select
                            placeholder="Select Course"
                            className={`h-11 rounded-[10px] px-[12px] bg-white hover:bg-[#FAFAFA] transition-all focus:border-pup-maroon/30 focus:ring-4 focus:ring-pup-maroon/5 outline-none ${ring("course")} ${lockIdentity ? lockedField : "border border-[#E5E5EA] dark:border-white/10"}`}
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
                            className={`mb-2 block text-[11px] font-medium tracking-[0.04em] ${ lockIdentity ? lockedLabel : "text-gray-500" } dark:text-zinc-400`}
                          >
                            Section
                          </label>
                          <Select
                            placeholder="Select Section"
                            className={`h-11 rounded-[10px] px-[12px] bg-white hover:bg-[#FAFAFA] transition-all focus:border-pup-maroon/30 focus:ring-4 focus:ring-pup-maroon/5 outline-none ${ring("sectionPart")} ${lockIdentity ? lockedField : "border border-[#E5E5EA] dark:border-white/10"}`}
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
                            <label className="mb-2 block text-[11px] font-medium text-gray-500 dark:text-zinc-400">
                              Room
                            </label>
                            <Select
                              placeholder=""
                              className={`h-11 rounded-[10px] px-[12px] bg-white hover:bg-[#FAFAFA] transition-all focus:border-pup-maroon/30 focus:ring-4 focus:ring-pup-maroon/5 outline-none ${ring("room")} border border-[#E5E5EA] dark:border-white/10`}
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
                            <label className="mb-2 block text-[11px] font-medium text-gray-500 dark:text-zinc-400">
                              Cabinet
                            </label>
                            <Select
                              placeholder=""
                              className={`h-11 rounded-[10px] px-[12px] bg-white hover:bg-[#FAFAFA] transition-all focus:border-pup-maroon/30 focus:ring-4 focus:ring-pup-maroon/5 outline-none ${ring("cabinet")} border border-[#E5E5EA] dark:border-white/10`}
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
                            <label className="mb-2 block text-[11px] font-medium text-gray-500 dark:text-zinc-400">
                              Drawer
                            </label>
                            <Select
                              placeholder=""
                              className={`h-11 rounded-[10px] px-[12px] bg-white hover:bg-[#FAFAFA] transition-all focus:border-pup-maroon/30 focus:ring-4 focus:ring-pup-maroon/5 outline-none ${ring("drawer")} border border-[#E5E5EA] dark:border-white/10`}
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

                        <div className="border-t border-gray-200 pt-6 dark:border-white/10">
                          <label className="mb-2 block text-[11px] font-medium text-gray-500 dark:text-zinc-400">
                            Document Type
                          </label>
                          <Select
                            placeholder="Select Document type"
                            className={`h-11 rounded-[10px] px-[12px] bg-white hover:bg-[#FAFAFA] transition-all focus:border-pup-maroon/30 focus:ring-4 focus:ring-pup-maroon/5 outline-none ${ring("docType")} border border-[#E5E5EA] dark:border-white/10`}
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
                          className="flex h-10 w-full items-center justify-center gap-2 rounded-[10px] bg-[#0A84FF] hover:bg-[#0062c4] active:scale-[0.98] text-sm font-semibold text-white transition-all dark:shadow-none"
                        >
                          Submit Upload
                        </button>

                        {uploadError ? (
                          <div className="mt-3 rounded-brand border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-800 dark:bg-red-950/30">
                            {uploadError}
                          </div>
                        ) : null}
                      </div>
                    ) : (
                      <div className="space-y-[16px]">
                        <div>
                          <label className="mb-2 block text-[11px] font-semibold tracking-[0.5px] text-[#8E8E93] dark:text-zinc-400">
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
                              <div className="flex h-11 items-center gap-2 rounded-[10px] border border-[#E5E5EA] bg-white px-[12px] transition-all hover:bg-[#FAFAFA] dark:bg-card dark:border-white/10">
                                <i className="ph-bold ph-file-csv text-[#8E8E93] dark:text-primary"></i>
                                <span className="truncate text-[12px] font-semibold text-[#1C1C1E] dark:text-zinc-300">
                                  {csvFile ? csvFile.name : "Select CSV..."}
                                </span>
                              </div>
                            </div>
                            {csvFile && (
                              <button
                                type="button"
                                onClick={() => handleCsvFileSelect(null)}
                                className="group flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px] border border-[#E5E5EA] bg-white text-[#8E8E93] transition-all hover:bg-[#F5F5F7] dark:bg-card dark:text-zinc-400 dark:border-white/10"
                                title="Clear File"
                              >
                                <i className="ph-bold ph-trash text-lg transition-colors group-hover:text-[#FF3B30]" />
                              </button>
                            )}
                          </div>
                        </div>

                        {csvError ? (
                          <div className="rounded-[10px] border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-800 dark:bg-red-950/30">
                            {csvError}
                          </div>
                        ) : null}

                        <div className="overflow-hidden rounded-[12px] bg-white p-[0px] dark:border-white/10 dark:bg-card">
                          <div className="flex items-center justify-between pb-3 border-b border-[#E5E5EA] mx-[-20px] px-[20px] dark:border-white/10">
                            <div className="text-[11px] font-semibold tracking-[0.5px] text-[#8E8E93] dark:text-zinc-500">
                              Bulk Edit
                            </div>
                            <div className="text-[15px] font-bold text-[#1C1C1E] dark:text-zinc-50">
                              {Object.values(csvSelected).filter(Boolean).length}{" "}
                              rows selected
                            </div>
                          </div>

                          <div className="space-y-[12px] pt-3">
                            <div>
                              <label className="mb-1.5 block text-[11px] font-semibold tracking-[0.5px] text-[#8E8E93] dark:text-zinc-400">
                                Room
                              </label>
                              <Select
                                className="h-11 rounded-[10px] px-[12px] bg-white hover:bg-[#FAFAFA] transition-all focus:border-[#0A84FF] focus:ring-2 focus:ring-[#0A84FF]/20 outline-none border border-[#E5E5EA] dark:border-white/10 w-full text-[13px] text-[#1C1C1E]"
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
                              <label className="mb-1.5 block text-[11px] font-semibold tracking-[0.5px] text-[#8E8E93] dark:text-zinc-400">
                                Cabinet
                              </label>
                              <Select
                                className="h-11 rounded-[10px] px-[12px] bg-white hover:bg-[#FAFAFA] transition-all focus:border-[#0A84FF] focus:ring-2 focus:ring-[#0A84FF]/20 outline-none border border-[#E5E5EA] dark:border-white/10 w-full text-[13px] text-[#1C1C1E]"
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
                              <label className="mb-1.5 block text-[11px] font-semibold tracking-[0.5px] text-[#8E8E93] dark:text-zinc-400">
                                Drawer
                              </label>
                              <Select
                                className="h-11 rounded-[10px] px-[12px] bg-white hover:bg-[#FAFAFA] transition-all focus:border-[#0A84FF] focus:ring-2 focus:ring-[#0A84FF]/20 outline-none border border-[#E5E5EA] dark:border-white/10 w-full text-[13px] text-[#1C1C1E]"
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

                            <div className="flex items-center gap-2 pt-2">
                              <button
                                type="button"
                                onClick={applyCsvBulkLocation}
                                className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-[10px] bg-[#0A84FF] hover:bg-[#0062c4] active:scale-[0.98] text-[13px] font-semibold text-white transition-all disabled:opacity-50 disabled:pointer-events-none"
                                disabled={
                                  Object.values(csvSelected).filter(Boolean)
                                    .length === 0
                                }
                              >
                                Apply
                              </button>
                              <button
                                type="button"
                                onClick={() => setCsvSelected({})}
                                className="group flex h-10 flex-1 items-center justify-center gap-1.5 rounded-[10px] border border-[#E5E5EA] bg-white text-[13px] font-medium text-[#1C1C1E] transition-all hover:bg-[#F5F5F7] disabled:opacity-40 disabled:pointer-events-none dark:bg-card dark:text-zinc-200 dark:border-white/10"
                                disabled={
                                  Object.values(csvSelected).filter(Boolean)
                                    .length === 0
                                }
                              >
                                Clear
                              </button>
                            </div>
                          </div>
                        </div>
                        <div className="border-t border-[#E5E5EA] mx-[-20px] pt-[16px] dark:border-white/10" />

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
                                  "flex h-11 w-full items-center justify-center gap-2 rounded-[12px] bg-[#0A84FF] hover:bg-[#0062c4] active:scale-[0.98] text-[13px] font-semibold text-white transition-all disabled:opacity-50 disabled:pointer-events-none"
                                )}
                              >
                                {csvLoading ? (
                                  <>
                                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white" />
                                    <span>Processing...</span>
                                  </>
                                ) : (
                                  <>
                                    <i className="ph-bold ph-upload-simple text-base" />{" "}
                                    Import Records
                                  </>
                                )}
                              </button>

                              {hasInvalidSelected && (
                                <div className="mt-3 flex items-start gap-2 rounded-[10px] border border-orange-200 bg-orange-50 p-3 text-[10px] font-semibold text-orange-800 animate-in fade-in slide-in-from-top-2 dark:bg-orange-950/20 dark:border-orange-900/30">
                                  <i className="ph-fill ph-warning-circle text-sm shrink-0" />
                                  <p>
                                    Cannot import: One or more selected rows have storage locations that do not exist in the system.
                                    Use the dropdowns or Bulk edit to assign valid physical rooms, cabinets, and drawers.
                                  </p>
                                </div>
                              )}
                            </>
                          )
                        })()}

                        {csvResults.length > 0 && (
                          <div className="rounded-brand border border-gray-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-card dark:shadow-none">
                            <div className="mb-2 text-[10px] font-semibold tracking-widest text-gray-400 dark:text-zinc-500">
                              Import Summary
                            </div>
                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between text-xs font-semibold text-gray-700 dark:text-zinc-200">
                                <span className="flex items-center gap-1.5">
                                  <i className="ph-fill ph-check-circle text-emerald-500" />{" "}
                                  Created:
                                </span>
                                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400">
                                  {csvResults.filter((r) => r.ok).length}
                                </span>
                              </div>
                              <div className="flex items-center justify-between text-xs font-semibold text-gray-700 dark:text-zinc-200">
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
